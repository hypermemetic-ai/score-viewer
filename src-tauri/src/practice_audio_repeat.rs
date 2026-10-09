//! One immutable future cue; cancellation races are decided by its own atomics.
use super::lifecycle;
use serde::Serialize;
use std::sync::atomic::{AtomicBool, AtomicU8, Ordering};
use std::sync::Arc;
const QUEUED: u8 = 0;
const CLAIMED: u8 = 1;
const ACTIVATED: u8 = 2;
const CANCELLED_QUEUED: u8 = 3;
const CANCELLED_CLAIMED: u8 = 4;
const CANCELLED_ACTIVATED: u8 = 5;

pub struct ArmControl {
    pub id: u64,
    pub previous_origin: u64,
    pub count_origin: u64,
    state: AtomicU8,
    pub abandoned: Arc<AtomicBool>,
}
impl ArmControl {
    pub fn matches(&self, id: u64, previous: u64) -> bool {
        self.id == id && self.previous_origin == previous
    }
    pub fn new(
        id: u64,
        previous_origin: u64,
        count_origin: u64,
        abandoned: Arc<AtomicBool>,
    ) -> Self {
        Self {
            id,
            previous_origin,
            count_origin,
            state: AtomicU8::new(QUEUED),
            abandoned,
        }
    }
    pub fn activated(&self) -> bool {
        matches!(
            self.state.load(Ordering::Acquire),
            ACTIVATED | CANCELLED_ACTIVATED
        )
    }
    pub fn claimed(&self) -> bool {
        matches!(
            self.state.load(Ordering::Acquire),
            CLAIMED | CANCELLED_CLAIMED
        )
    }
    pub fn cancelled(&self) -> bool {
        self.abandoned.load(Ordering::Acquire)
            || self.state.load(Ordering::Acquire) >= CANCELLED_QUEUED
    }
    pub fn activate(&self) -> bool {
        !self.abandoned.load(Ordering::Acquire)
            && self
                .state
                .compare_exchange(QUEUED, CLAIMED, Ordering::AcqRel, Ordering::Acquire)
                .is_ok()
    }
    pub fn commit_activation(&self) {
        // Publish the new onset/pointer BEFORE worker ownership promotion.
        // Cancellation can win during that tiny claimed interval; it targets
        // this chosen cue, but never makes the worker see a half-built owner.
        loop {
            let old = self.state.load(Ordering::Acquire);
            let next = match old {
                CLAIMED => ACTIVATED,
                CANCELLED_CLAIMED => CANCELLED_ACTIVATED,
                _ => return,
            };
            if self
                .state
                .compare_exchange(old, next, Ordering::AcqRel, Ordering::Acquire)
                .is_ok()
            {
                return;
            }
        }
    }
    pub fn cancel(&self) -> CancelState {
        loop {
            let old = self.state.load(Ordering::Acquire);
            let (next, result) = match old {
                QUEUED => (CANCELLED_QUEUED, CancelState::Queued),
                CLAIMED => (CANCELLED_CLAIMED, CancelState::Activated),
                ACTIVATED => (CANCELLED_ACTIVATED, CancelState::Activated),
                CANCELLED_QUEUED => return CancelState::Queued,
                _ => return CancelState::Activated,
            };
            if self
                .state
                .compare_exchange(old, next, Ordering::AcqRel, Ordering::Acquire)
                .is_ok()
            {
                return result;
            }
        }
    }
}
#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum CancelState {
    Queued,
    Activated,
    Missing,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CancelReceipt {
    pub version: u8,
    pub arm_id: u64,
    pub previous_count_start_micros: u64,
    pub state: CancelState,
}
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ArmReceipt {
    pub version: u8,
    pub arm_id: u64,
    pub armed: bool,
    pub count_start_micros: u64,
    pub score_start_micros: u64,
}
pub fn safe_id(value: f64) -> Result<u64, String> {
    if !value.is_finite()
        || value < 1.0
        || value > lifecycle::MAX_SAFE_INTEGER as f64
        || value.fract() != 0.0
    {
        return Err("Invalid repeat cue owner identity".into());
    }
    Ok(value as u64)
}
pub fn target(value: f64) -> Result<u64, String> {
    if !value.is_finite() || value < 1.0 || value > lifecycle::MAX_SAFE_INTEGER as f64 {
        return Err("Invalid repeat cue time".into());
    }
    Ok(value.ceil() as u64)
}
/// Reconcile the callback's committed baton before resolving any new owner.
/// An activated-then-cancelled arm still became the current owner; treating it
/// as merely queued could accidentally cancel or reject a later generation.
pub fn promote_activated<T>(
    active: &mut Option<T>,
    pending: &mut Option<T>,
    activated: impl FnOnce(&T) -> bool,
) -> bool {
    if pending.as_ref().is_some_and(activated) {
        *active = pending.take();
        true
    } else {
        false
    }
}
pub fn admit(
    request: &lifecycle::Request,
    arm_id: u64,
    origin: u64,
    now: u64,
    buffer_frames: u32,
    rate: u32,
    submitted_end: u64,
    observed_block_micros: u64,
    owned_origin: u64,
    owned_request: &lifecycle::Request,
) -> Result<ArmReceipt, String> {
    let grid = request
        .grid_v2
        .as_ref()
        .ok_or("Future repeats require a v2 pulse grid")?;
    let owned = owned_request
        .grid_v2
        .as_ref()
        .ok_or("Current cue has no v2 source boundary")?;
    let last = owned.bar_meter_pulses.len() - 1;
    let old_p = owned.pulses_per_beat as u64;
    let new_p = grid.pulses_per_beat as u64;
    let compatible = owned.bar_meter_pulses[last] as u64 * new_p
        == grid.count_bar_pulses as u64 * old_p
        && owned.bar_beat_pulses[last] as u64 * new_p == grid.count_beat_pulses as u64 * old_p;
    let expected_phase = if compatible {
        let exit = (owned.bar_phase_pulses[last] as u64 + owned.bar_start_pulses[last + 1]
            - owned.bar_start_pulses[last])
            % owned.bar_meter_pulses[last] as u64;
        if exit * new_p % old_p != 0 {
            return Err("Repeat pulse grid cannot represent the owned exit phase".into());
        }
        exit * new_p / old_p
    } else {
        0
    };
    if grid.count_start_phase_pulses as u64 != expected_phase {
        return Err("Repeat count phase does not continue the owned source meter".into());
    }
    let expected = owned_origin as f64 + owned.source_end_micros(owned_request.bpm);
    if grid.score_offset_pulses == 0
        || (request.duration_ms * 1000.0 - grid.source_end_micros(request.bpm)).abs() > 2.0
    {
        return Err("Future repeat requires the full source count and duration".into());
    }
    if (origin as f64 - expected).abs() > 2.0 {
        return Err("Repeat cue is not on the owned source boundary".into());
    }
    if rate == 0 || buffer_frames == 0 || submitted_end == 0 || observed_block_micros == 0 {
        return Err("Current audio output has no admitted playback horizon".into());
    }
    let score = origin as f64 + grid.count_micros(request.bpm);
    if score > lifecycle::MAX_SAFE_INTEGER as f64 || origin.saturating_sub(now) > 3_600_000_000 {
        return Err("Repeat cue is outside the bounded playback horizon".into());
    }
    let queue = (buffer_frames as u64 * 1_000_000).div_ceil(rate as u64);
    // The callback publishes its entire in-flight span before reading pending.
    // One known device/block span covers a new callback racing this read; this
    // is a running-output baton, so the initial150ms stream lead does not apply.
    let margin = queue.max(observed_block_micros);
    let ready = now
        .checked_add(queue)
        .map(|x| x.max(submitted_end))
        .and_then(|x| x.checked_add(margin))
        .ok_or("Repeat playback clock overflow")?;
    Ok(ArmReceipt {
        version: 2,
        arm_id,
        armed: origin > ready,
        count_start_micros: origin,
        score_start_micros: score.ceil() as u64,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    fn request(p: u32, bpm: f64, bar: u32, beat: u32) -> lifecycle::Request {
        let grid = lifecycle::PulseGridV2 {
            version: 2,
            pulses_per_beat: p,
            score_offset_pulses: bar,
            count_bar_pulses: bar,
            count_beat_pulses: beat,
            count_start_phase_pulses: 0,
            score_start_phase_pulses: 0,
            bar_start_pulses: vec![
                0,
                bar as u64,
                2 * bar as u64,
                3 * bar as u64,
                4 * bar as u64,
            ],
            beat_start_pulses: (0..4 * bar)
                .step_by(beat as usize)
                .map(|v| v as u64)
                .collect(),
            bar_meter_pulses: vec![bar; 4],
            bar_beat_pulses: vec![beat; 4],
            bar_phase_pulses: vec![0; 4],
        };
        let pulse = 60000. / (bpm * p as f64);
        let mut step = pulse;
        while step > 1000. {
            step /= 2.;
        }
        lifecycle::Request::new_with_clock(
            "same",
            bpm,
            grid.source_end_micros(bpm) / 1000.,
            step,
            None,
            None,
            None,
            Some(grid),
        )
        .unwrap()
    }
    #[test]
    fn on_time_terminal_attacks_use_real_running_buffers_not_startup_lead() {
        for (p, bpm, bar, beat) in [(3, 180., 6, 3), (2, 80., 6, 2)] {
            let old = request(p, bpm, bar, beat);
            let next = request(p, bpm + 1., bar, beat);
            let origin = 1_000_000;
            let boundary = (origin as f64 + old.grid_v2.as_ref().unwrap().source_end_micros(bpm))
                .ceil() as u64;
            let now = boundary - (60_000_000. / (bpm * p as f64)).floor() as u64;
            for rate in [44_100, 48_000, 96_000] {
                for frames in [128, 256, 512, 1126, 2048] {
                    let queued = (frames as u64 * 1_000_000).div_ceil(rate as u64);
                    let result = admit(
                        &next,
                        1,
                        boundary,
                        now,
                        frames,
                        rate,
                        now + queued,
                        queued,
                        origin,
                        &old,
                    )
                    .unwrap();
                    assert!(result.armed, "p{p} rate{rate} frames{frames}");
                    assert_eq!(result.count_start_micros, boundary);
                    assert!(
                        (result.score_start_micros as f64
                            - boundary as f64
                            - next.grid_v2.as_ref().unwrap().count_micros(next.bpm))
                        .abs()
                            <= 1.
                    );
                }
            }
            let late = admit(
                &next,
                2,
                boundary,
                boundary - 1,
                512,
                48_000,
                boundary + 10_666,
                10_667,
                origin,
                &old,
            )
            .unwrap();
            assert!(!late.armed);
        }
    }
    #[test]
    fn preparation_and_in_flight_variable_blocks_are_rechecked_at_publication() {
        let old = request(3, 180., 6, 3);
        let next = request(3, 181., 6, 3);
        let origin = 1_000_000;
        let boundary = (origin as f64 + old.grid_v2.as_ref().unwrap().source_end_micros(old.bpm))
            .ceil() as u64;
        assert!(
            admit(
                &next,
                1,
                boundary,
                boundary - 100_000,
                512,
                48_000,
                boundary - 80_000,
                10_667,
                origin,
                &old
            )
            .unwrap()
            .armed
        );
        // A callback's larger observed block matters even if device status still
        // describes its smaller nominal buffer. Late preparation changes no cue.
        assert!(
            !admit(
                &next,
                1,
                boundary,
                boundary - 100_000,
                512,
                48_000,
                boundary - 80_000,
                90_000,
                origin,
                &old
            )
            .unwrap()
            .armed
        );
        assert!(
            !admit(
                &next,
                1,
                boundary,
                boundary - 10_000,
                512,
                48_000,
                boundary - 1,
                10_667,
                origin,
                &old
            )
            .unwrap()
            .armed
        );
        for (rate, frames, end, block) in [
            (0, 512, 100, 100),
            (48_000, 0, 100, 100),
            (48_000, 512, 0, 100),
            (48_000, 512, 100, 0),
        ] {
            assert!(
                admit(&next, 1, boundary, origin, frames, rate, end, block, origin, &old).is_err()
            );
        }
        assert!(admit(
            &next,
            1,
            boundary + 3,
            origin,
            512,
            48_000,
            origin + 10_667,
            10_667,
            origin,
            &old
        )
        .is_err());
        let mut wrong = next.clone();
        wrong.duration_ms += 1.;
        assert!(admit(
            &wrong,
            1,
            boundary,
            origin,
            512,
            48_000,
            origin + 10_667,
            10_667,
            origin,
            &old
        )
        .is_err());
    }
    #[test]
    fn reduced_nominal_queue_does_not_relax_observed_or_in_flight_repeat_horizon() {
        let old = request(3, 180., 6, 3);
        let next = request(3, 181., 6, 3);
        let origin = 1_000_000;
        let boundary = (origin as f64 + old.grid_v2.as_ref().unwrap().source_end_micros(old.bpm))
            .ceil() as u64;
        let now = boundary - 20_000;
        let nominal = admit(
            &next,
            1,
            boundary,
            now,
            128,
            48000,
            now + 2667,
            2667,
            origin,
            &old,
        )
        .unwrap();
        assert!(nominal.armed);
        let observed = admit(
            &next,
            1,
            boundary,
            now,
            128,
            48000,
            boundary + 1,
            2667,
            origin,
            &old,
        )
        .unwrap();
        assert!(!observed.armed);
        let in_flight = admit(
            &next,
            1,
            boundary,
            now,
            128,
            48000,
            now + 10000,
            20000,
            origin,
            &old,
        )
        .unwrap();
        assert!(!in_flight.armed);
    }
    #[test]
    fn concurrent_cancel_has_a_single_queued_or_activated_outcome() {
        for id in 1..=64 {
            let a = Arc::new(ArmControl::new(
                id,
                10,
                20,
                Arc::new(AtomicBool::new(false)),
            ));
            let barrier = Arc::new(std::sync::Barrier::new(2));
            let other = a.clone();
            let b = barrier.clone();
            let thread = std::thread::spawn(move || {
                b.wait();
                other.activate()
            });
            barrier.wait();
            let result = a.cancel();
            let activated = thread.join().unwrap();
            assert_eq!(
                result,
                if activated {
                    CancelState::Activated
                } else {
                    CancelState::Queued
                }
            );
            assert!(a.cancelled());
            assert!(!a.activate());
        }
    }
    #[test]
    fn two_pickup_repeats_continue_exit_phase_and_changed_meter_resets_explicitly() {
        let grid = lifecycle::PulseGridV2 {
            version: 2,
            pulses_per_beat: 2,
            score_offset_pulses: 14,
            count_bar_pulses: 8,
            count_beat_pulses: 2,
            count_start_phase_pulses: 0,
            score_start_phase_pulses: 6,
            bar_start_pulses: vec![0, 2, 10, 16],
            bar_meter_pulses: vec![8; 3],
            bar_beat_pulses: vec![2; 3],
            bar_phase_pulses: vec![6, 0, 0],
            beat_start_pulses: (0..16).step_by(2).collect(),
        };
        let initial = lifecycle::Request::new_with_clock(
            "same",
            120.,
            7500.,
            250.,
            None,
            None,
            None,
            Some(grid.clone()),
        )
        .unwrap();
        let mut continued = grid;
        continued.count_start_phase_pulses = 6;
        continued.score_offset_pulses = 8;
        let next = lifecycle::Request::new_with_clock(
            "same",
            120.,
            6000.,
            250.,
            None,
            None,
            None,
            Some(continued),
        )
        .unwrap();
        let mut previous = 1_000_000;
        let mut old = initial;
        for id in 1..=2 {
            let boundary = previous
                + old
                    .grid_v2
                    .as_ref()
                    .unwrap()
                    .source_end_micros(old.bpm)
                    .ceil() as u64;
            let receipt = admit(
                &next,
                id,
                boundary,
                boundary - 100_000,
                512,
                48_000,
                boundary - 80_000,
                10_667,
                previous,
                &old,
            )
            .unwrap();
            assert!(receipt.armed);
            assert_eq!(receipt.score_start_micros - boundary, 2_000_000);
            // Resetting this repeated count to beat1 would add another pickup phase.
            let mut wrong = next.clone();
            wrong.grid_v2.as_mut().unwrap().count_start_phase_pulses = 0;
            wrong.grid_v2.as_mut().unwrap().score_offset_pulses = 14;
            wrong.duration_ms = 7500.;
            assert!(admit(
                &wrong,
                id,
                boundary,
                boundary - 100_000,
                512,
                48_000,
                boundary - 80_000,
                10_667,
                previous,
                &old
            )
            .is_err());
            previous = boundary;
            old = next.clone();
        }
        let changed = request(2, 120., 6, 2);
        let boundary = previous
            + old
                .grid_v2
                .as_ref()
                .unwrap()
                .source_end_micros(old.bpm)
                .ceil() as u64;
        assert!(
            admit(
                &changed,
                3,
                boundary,
                boundary - 100_000,
                512,
                48_000,
                boundary - 80_000,
                10_667,
                previous,
                &old
            )
            .unwrap()
            .armed
        );
        // Same physical meter expressed on a finer pulse lattice preserves
        // source phase; a coarser lattice may not erase an odd exit pulse.
        let mut finer = next.clone();
        let g = finer.grid_v2.as_mut().unwrap();
        g.pulses_per_beat *= 2;
        g.score_offset_pulses *= 2;
        g.count_bar_pulses *= 2;
        g.count_beat_pulses *= 2;
        g.count_start_phase_pulses *= 2;
        g.score_start_phase_pulses *= 2;
        for n in &mut g.bar_start_pulses {
            *n *= 2;
        }
        for n in &mut g.beat_start_pulses {
            *n *= 2;
        }
        for v in [
            &mut g.bar_meter_pulses,
            &mut g.bar_beat_pulses,
            &mut g.bar_phase_pulses,
        ] {
            for n in v {
                *n *= 2;
            }
        }
        g.validate().unwrap();
        finer.count_step_ms /= 2.;
        assert!(
            admit(
                &finer,
                4,
                boundary,
                boundary - 100_000,
                512,
                48_000,
                boundary - 80_000,
                10_667,
                previous,
                &old
            )
            .unwrap()
            .armed
        );
        let mut odd = old.clone();
        odd.grid_v2.as_mut().unwrap().bar_start_pulses[3] = 17;
        odd.grid_v2.as_mut().unwrap().beat_start_pulses.push(16);
        odd.duration_ms += 250.;
        odd.grid_v2.as_ref().unwrap().validate().unwrap();
        let mut coarse = next.clone();
        let g = coarse.grid_v2.as_mut().unwrap();
        g.pulses_per_beat /= 2;
        g.score_offset_pulses /= 2;
        g.count_bar_pulses /= 2;
        g.count_beat_pulses /= 2;
        g.count_start_phase_pulses /= 2;
        g.score_start_phase_pulses /= 2;
        for n in &mut g.bar_start_pulses {
            *n /= 2;
        }
        for n in &mut g.beat_start_pulses {
            *n /= 2;
        }
        for v in [
            &mut g.bar_meter_pulses,
            &mut g.bar_beat_pulses,
            &mut g.bar_phase_pulses,
        ] {
            for n in v {
                *n /= 2;
            }
        }
        g.validate().unwrap();
        coarse.count_step_ms *= 2.;
        let odd_end = previous
            + odd
                .grid_v2
                .as_ref()
                .unwrap()
                .source_end_micros(odd.bpm)
                .ceil() as u64;
        assert!(admit(
            &coarse,
            5,
            odd_end,
            odd_end - 100_000,
            512,
            48_000,
            odd_end - 80_000,
            10_667,
            previous,
            &odd
        )
        .unwrap_err()
        .contains("represent"));
    }
    #[test]
    fn cancel_and_activation_are_owned_and_linearized() {
        let a = ArmControl::new(1, 10, 20, Arc::new(AtomicBool::new(false)));
        assert_eq!(a.cancel(), CancelState::Queued);
        assert!(!a.activate());
        let b = ArmControl::new(2, 10, 20, Arc::new(AtomicBool::new(false)));
        assert!(b.activate());
        assert!(!b.activated());
        assert_eq!(b.cancel(), CancelState::Activated);
        b.commit_activation();
        assert!(b.activated());
        assert!(b.cancelled());
        assert!(!b.activate());
    }
    #[test]
    fn abandoned_async_request_cannot_activate() {
        let abandoned = Arc::new(AtomicBool::new(false));
        let a = ArmControl::new(1, 10, 20, abandoned.clone());
        abandoned.store(true, Ordering::Release);
        assert!(!a.activate());
        assert!(a.cancelled());
    }
    #[test]
    fn claimed_baton_is_not_a_worker_owner_until_its_onset_is_committed() {
        let arm = Arc::new(ArmControl::new(1, 10, 20, Arc::new(AtomicBool::new(false))));
        let mut active = Some(None);
        let mut pending = Some(Some(arm.clone()));
        assert!(arm.activate());
        assert!(arm.claimed());
        assert!(!promote_activated(&mut active, &mut pending, |a| a
            .as_ref()
            .is_some_and(|a| a.activated())));
        assert_eq!(arm.cancel(), CancelState::Activated);
        assert!(arm.claimed());
        assert!(!arm.activated());
        assert!(pending.is_some());
        arm.commit_activation();
        assert!(!arm.claimed());
        assert!(promote_activated(&mut active, &mut pending, |a| a
            .as_ref()
            .is_some_and(|a| a.activated())));
        assert!(pending.is_none());
        assert!(active.unwrap().unwrap().cancelled());
    }
    #[test]
    fn identifiers_are_safe_and_planned_times_only_round_up() {
        for x in [
            0.0,
            -1.0,
            1.5,
            f64::NAN,
            f64::INFINITY,
            lifecycle::MAX_SAFE_INTEGER as f64 + 1.0,
        ] {
            assert!(safe_id(x).is_err());
        }
        assert_eq!(safe_id(1.0).unwrap(), 1);
        assert_eq!(target(123.2).unwrap(), 124);
    }
    #[test]
    fn stale_cancel_cannot_hit_a_replacement_after_queued_cancellation() {
        let p = lifecycle::Playback::default();
        let (session, _) = p.begin().unwrap();
        let old = ArmControl::new(1, 100, 200, Arc::new(AtomicBool::new(false)));
        session.admit_arm_id(1).unwrap();
        session.arm_published(1);
        assert_eq!(old.cancel(), CancelState::Queued);
        assert!(session.admit_arm_id(1).is_err());
        session.admit_arm_id(2).unwrap();
        let replacement = ArmControl::new(2, 100, 200, Arc::new(AtomicBool::new(false)));
        session.arm_published(2);
        let stale = if replacement.matches(1, 100) {
            replacement.cancel()
        } else {
            CancelState::Missing
        };
        assert_eq!(stale, CancelState::Missing);
        assert!(!replacement.cancelled());
        assert!(!replacement.matches(2, 99));
        assert!(replacement.activate());
        replacement.commit_activation();
        assert_eq!(replacement.cancel(), CancelState::Activated);
    }
}
