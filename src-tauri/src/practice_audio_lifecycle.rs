//! Shared request and generation rules; native devices and clocks stay in adapters.
use serde::{Deserialize, Serialize};
use std::sync::{
    atomic::{AtomicBool, AtomicU64, Ordering},
    mpsc, Arc, Mutex,
};
use std::time::Duration;

const CANCELLED: &str = "Audio start cancelled";
const START_TIMEOUT: &str = "Audio start timed out; choose an available output and test it";
pub const START_WAIT: Duration = Duration::from_secs(3);
pub const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;

/// Explicit authored meter, independent of the performance tempo's reference unit.
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PulseGridV2 {
    pub version: u8,
    pub pulses_per_beat: u32,
    pub score_offset_pulses: u32,
    pub bar_start_pulses: Vec<u64>,
    pub count_bar_pulses: u32,
    pub count_beat_pulses: u32,
    pub count_start_phase_pulses: u32,
    pub score_start_phase_pulses: u32,
    pub beat_start_pulses: Vec<u64>,
    pub bar_meter_pulses: Vec<u32>,
    pub bar_beat_pulses: Vec<u32>,
    pub bar_phase_pulses: Vec<u32>,
}
impl PulseGridV2 {
    pub fn validate(&self) -> Result<(), String> {
        let ascending = |v: &[u64]| {
            v.len() <= 100_000
                && v.iter().all(|n| *n <= 1_000_000_000)
                && v.windows(2).all(|w| w[0] < w[1])
        };
        if self.version != 2
            || !(1..=96).contains(&self.pulses_per_beat)
            || !(1..=9216).contains(&self.count_bar_pulses)
            || self.count_beat_pulses == 0
            || self.count_beat_pulses > self.count_bar_pulses
            || self.count_bar_pulses % self.count_beat_pulses != 0
            || self.score_start_phase_pulses >= self.count_bar_pulses
            || self.count_start_phase_pulses >= self.count_bar_pulses
            || !(self.score_offset_pulses == 0
                || self.score_offset_pulses
                    == self.count_bar_pulses
                        + (self.score_start_phase_pulses + self.count_bar_pulses
                            - self.count_start_phase_pulses)
                            % self.count_bar_pulses)
            || self.bar_start_pulses.len() < 2
            || self.bar_start_pulses.first() != Some(&0)
            || !ascending(&self.bar_start_pulses)
            || !ascending(&self.beat_start_pulses)
            || self
                .beat_start_pulses
                .iter()
                .any(|n| *n >= *self.bar_start_pulses.last().unwrap_or(&0))
        {
            return Err("Invalid v2 score metronome grid".into());
        }
        let bars = self.bar_start_pulses.len() - 1;
        if self.bar_meter_pulses.len() != bars
            || self.bar_beat_pulses.len() != bars
            || self.bar_phase_pulses.len() != bars
            || self.bar_meter_pulses.first() != Some(&self.count_bar_pulses)
            || self.bar_beat_pulses.first() != Some(&self.count_beat_pulses)
            || self.bar_phase_pulses.first() != Some(&self.score_start_phase_pulses)
        {
            return Err("Incomplete v2 source meter facts".into());
        }
        let mut expected_count = 0u64;
        for i in 0..bars {
            let length = self.bar_start_pulses[i + 1] - self.bar_start_pulses[i];
            let meter = self.bar_meter_pulses[i] as u64;
            let beat = self.bar_beat_pulses[i] as u64;
            let phase = self.bar_phase_pulses[i] as u64;
            if !(1..=9216).contains(&meter)
                || beat == 0
                || beat > meter
                || meter % beat != 0
                || phase >= meter
                || !(phase == 0 || phase == meter.saturating_sub(length))
            {
                return Err("Invalid v2 source meter facts".into());
            }
            let first = (beat - phase % beat) % beat;
            let count = if first < length {
                1 + (length - first - 1) / beat
            } else {
                0
            };
            expected_count += count;
            // Bound expected work BEFORE iterating/regenerating any beat array.
            if expected_count > 100_000 {
                return Err("V2 score beat count exceeds the bounded clock".into());
            }
        }
        if expected_count != self.beat_start_pulses.len() as u64 {
            return Err("V2 score beats do not match source meter".into());
        }
        let mut cursor = 0;
        for i in 0..bars {
            let start = self.bar_start_pulses[i];
            let end = self.bar_start_pulses[i + 1];
            let beat = self.bar_beat_pulses[i] as u64;
            let mut at = start + (beat - self.bar_phase_pulses[i] as u64 % beat) % beat;
            while at < end {
                if self.beat_start_pulses[cursor] != at {
                    return Err("V2 score beats do not match source phase".into());
                }
                cursor += 1;
                at += beat;
            }
        }
        Ok(())
    }
    pub fn pulse_micros(&self, bpm: f64) -> f64 {
        60_000_000.0 / (bpm * self.pulses_per_beat as f64)
    }
    pub fn count_micros(&self, bpm: f64) -> f64 {
        self.score_offset_pulses as f64 * self.pulse_micros(bpm)
    }
    pub fn bar_micros(&self, bpm: f64) -> f64 {
        self.count_bar_pulses as f64 * self.pulse_micros(bpm)
    }
    pub fn source_end_micros(&self, bpm: f64) -> f64 {
        (self.score_offset_pulses as f64 + *self.bar_start_pulses.last().unwrap_or(&0) as f64)
            * self.pulse_micros(bpm)
    }
}

#[derive(Clone)]
pub struct Request {
    pub bpm: f64,
    pub duration_ms: f64,
    pub count_step_ms: f64,
    pub repeat_start_micros: Option<f64>,
    pub full_repeat_count_in: bool,
    pub grid: Option<(u32, u32, Vec<u64>)>,
    pub grid_v2: Option<PulseGridV2>,
}

impl Request {
    pub fn new(
        device: &str,
        bpm: f64,
        duration_ms: f64,
        count_step_ms: f64,
    ) -> Result<Self, String> {
        Self::new_with_grid(device, bpm, duration_ms, count_step_ms, None, None, None)
    }
    pub fn new_with_grid(
        device: &str,
        bpm: f64,
        duration_ms: f64,
        count_step_ms: f64,
        pulses: Option<u32>,
        offset: Option<u32>,
        bars: Option<Vec<u64>>,
    ) -> Result<Self, String> {
        Self::new_with_clock(
            device,
            bpm,
            duration_ms,
            count_step_ms,
            pulses,
            offset,
            bars,
            None,
        )
    }
    pub fn new_with_clock(
        device: &str,
        bpm: f64,
        duration_ms: f64,
        count_step_ms: f64,
        pulses: Option<u32>,
        offset: Option<u32>,
        bars: Option<Vec<u64>>,
        grid_v2: Option<PulseGridV2>,
    ) -> Result<Self, String> {
        if grid_v2.is_some() && (pulses.is_some() || offset.is_some() || bars.is_some()) {
            return Err("Mixed legacy and v2 metronome grids".into());
        }
        if let Some(g) = &grid_v2 {
            g.validate()?;
        }
        let grid = match (pulses, offset, bars) {
            (None, None, None) => None,
            (Some(p), Some(o), Some(b))
                if (1..=96).contains(&p)
                    && (o == 0 || o == 2 * p)
                    && !b.is_empty()
                    && b.len() <= 100000
                    && b[0] == 0
                    && b.iter().all(|x| *x <= 1_000_000_000)
                    && b.windows(2).all(|w| w[0] < w[1]) =>
            {
                Some((p, o, b))
            }
            _ => return Err("Invalid score metronome grid".into()),
        };
        let eighth_ms = 60000.0
            / (bpm
                * grid_v2.as_ref().map_or_else(
                    || grid.as_ref().map_or(3.0, |g| g.0 as f64),
                    |g| g.pulses_per_beat as f64,
                ));
        let unsafe_subdivision = count_step_ms > 0.0
            && (!(eighth_ms / count_step_ms).is_finite()
                || eighth_ms / count_step_ms >= u64::MAX as f64
                || duration_ms / count_step_ms >= u64::MAX as f64);
        if !bpm.is_finite()
            || !(5.0..=500.0).contains(&bpm)
            || !duration_ms.is_finite()
            || !(1.0..=3_600_000.0).contains(&duration_ms)
            || !count_step_ms.is_finite()
            || !(0.0..=1000.0).contains(&count_step_ms)
            || count_step_ms > eighth_ms * (1.0 + 8.0 * f64::EPSILON)
            || unsafe_subdivision
            || ((grid.is_some() || grid_v2.is_some())
                && count_step_ms > 0.0
                && ((eighth_ms / count_step_ms) - (eighth_ms / count_step_ms).round()).abs()
                    > 1.0e-9)
            || device.len() > 512
            || device.contains('\0')
        {
            return Err("Invalid metronome request".into());
        }
        if let Some(g) = &grid_v2 {
            let mut expected = eighth_ms;
            while expected > 1000.0 {
                expected /= 2.0;
            }
            if (g.score_offset_pulses > 0 && count_step_ms == 0.0)
                || (count_step_ms > 0.0 && (count_step_ms - expected).abs() > expected * 1.0e-9)
                || duration_ms * 1000.0 + 2.0 < g.source_end_micros(bpm)
            {
                return Err("Invalid v2 metronome timing".into());
            }
        }
        Ok(Self {
            bpm,
            duration_ms,
            count_step_ms,
            repeat_start_micros: None,
            full_repeat_count_in: false,
            grid,
            grid_v2,
        })
    }
    pub fn with_full_repeat_count_in(mut self, full: bool) -> Result<Self, String> {
        if full && self.repeat_start_micros.is_none() {
            return Err("A full repeat count-in requires a musical repeat boundary".into());
        }
        self.full_repeat_count_in = full;
        Ok(self)
    }
    pub fn with_repeat_start(mut self, repeat_start_micros: Option<f64>) -> Result<Self, String> {
        if let Some(start) = repeat_start_micros {
            if self
                .grid_v2
                .as_ref()
                .is_some_and(|g| g.score_offset_pulses == 0)
            {
                return Err("A v2 musical repeat requires a complete count bar".into());
            }
            let count_micros = self
                .grid_v2
                .as_ref()
                .map_or(120_000_000.0 / self.bpm, |g| g.count_micros(self.bpm));
            if !start.is_finite()
                || start < count_micros
                || start > 9_007_199_254_740_991.0
                || self.duration_ms * 1000.0 <= count_micros
            {
                return Err("Invalid musical repeat request".into());
            }
        }
        self.repeat_start_micros = repeat_start_micros;
        Ok(self)
    }
}

struct Generation {
    stop: Arc<AtomicBool>,
    ready: mpsc::Sender<Result<u64, String>>,
    announced: AtomicBool,
    failure: Mutex<Option<String>>,
    last_arm_id: AtomicU64,
}

impl Generation {
    fn cancel(&self) {
        self.stop.store(true, Ordering::Release);
        if !self.announced.swap(true, Ordering::AcqRel) {
            let _ = self.ready.send(Err(CANCELLED.into()));
        }
    }
}

#[derive(Clone, Default)]
pub struct Playback(Arc<Mutex<Option<Arc<Generation>>>>);

#[derive(Clone)]
pub struct Session {
    playback: Playback,
    generation: Arc<Generation>,
}

impl Playback {
    pub fn current_session(&self) -> Result<Option<Session>, String> {
        let active = self.0.lock().map_err(|_| "Audio state unavailable")?;
        Ok(active.as_ref().map(|generation| Session {
            playback: self.clone(),
            generation: generation.clone(),
        }))
    }
    pub fn begin(&self) -> Result<(Session, mpsc::Receiver<Result<u64, String>>), String> {
        let (ready, receiver) = mpsc::channel();
        let generation = Arc::new(Generation {
            stop: Arc::new(AtomicBool::new(false)),
            ready,
            announced: AtomicBool::new(false),
            failure: Mutex::new(None),
            last_arm_id: AtomicU64::new(0),
        });
        let mut active = self.0.lock().map_err(|_| "Audio state unavailable")?;
        if let Some(previous) = active.replace(generation.clone()) {
            previous.cancel();
        }
        Ok((
            Session {
                playback: self.clone(),
                generation,
            },
            receiver,
        ))
    }

    pub fn stop(&self) -> Result<(), String> {
        if let Some(previous) = self.0.lock().map_err(|_| "Audio state unavailable")?.take() {
            previous.cancel();
        }
        Ok(())
    }
}

impl Session {
    pub fn admit_arm_id(&self, id: u64) -> Result<(), String> {
        if id <= self.generation.last_arm_id.load(Ordering::Acquire) {
            Err("Repeat arm identity was already used in this generation".into())
        } else {
            Ok(())
        }
    }
    /// Only the single audio worker publishes arms. Call AFTER successful cue
    /// publication; declined deadlines do not consume the caller's token.
    pub fn arm_published(&self, id: u64) {
        self.generation.last_arm_id.store(id, Ordering::Release);
    }
    pub fn stop_signal(&self) -> Arc<AtomicBool> {
        self.generation.stop.clone()
    }
    pub fn cancelled(&self) -> bool {
        self.generation.stop.load(Ordering::Acquire)
    }
    pub fn is_current(&self) -> bool {
        self.playback
            .0
            .lock()
            .map(|a| self.current(&a))
            .unwrap_or(false)
    }
    pub fn same_generation(&self, other: &Self) -> bool {
        Arc::ptr_eq(&self.generation, &other.generation)
    }

    fn current(&self, active: &Option<Arc<Generation>>) -> bool {
        !self.cancelled()
            && active
                .as_ref()
                .is_some_and(|g| Arc::ptr_eq(g, &self.generation))
    }

    /// Only the current generation can announce its native output origin.
    pub fn started(&self, onset: u64) -> bool {
        let Ok(active) = self.playback.0.lock() else {
            return false;
        };
        if !self.current(&active) || self.generation.announced.swap(true, Ordering::AcqRel) {
            return false;
        }
        self.generation.ready.send(Ok(onset)).is_ok()
    }

    pub fn wait_started(
        &self,
        receiver: mpsc::Receiver<Result<u64, String>>,
        wait: Duration,
    ) -> Result<u64, String> {
        match receiver.recv_timeout(wait) {
            Ok(result) => {
                // Consume startup under the same state lock as failure/replacement.
                // Normal completion may detach the generation before consumption;
                // a recorded failure must still supersede its queued ready result.
                let _active = self
                    .playback
                    .0
                    .lock()
                    .map_err(|_| "Audio state unavailable")?;
                let failure = self
                    .generation
                    .failure
                    .lock()
                    .map_err(|_| "Audio state unavailable")?;
                if let Some(message) = failure.as_ref() {
                    Err(message.clone())
                } else if self.cancelled() {
                    Err(CANCELLED.into())
                } else {
                    result
                }
            }
            Err(_) => {
                self.cancel();
                Err(START_TIMEOUT.into())
            }
        }
    }

    pub fn cancel(&self) {
        if let Ok(mut active) = self.playback.0.lock() {
            self.generation.cancel();
            if active
                .as_ref()
                .is_some_and(|g| Arc::ptr_eq(g, &self.generation))
            {
                active.take();
            }
        } else {
            self.generation.cancel();
        }
    }

    /// Linearize notification with replacement. The publisher only enqueues a
    /// Tauri event; device calls, worker joins and waiting never hold this lock.
    pub fn failed(&self, message: String, publish: impl FnOnce(String)) -> bool {
        let Ok(mut active) = self.playback.0.lock() else {
            return false;
        };
        if !self.current(&active) {
            return false;
        }
        let Ok(mut failure) = self.generation.failure.lock() else {
            return false;
        };
        *failure = Some(message.clone());
        self.generation.stop.store(true, Ordering::Release);
        if !self.generation.announced.swap(true, Ordering::AcqRel) {
            let _ = self.generation.ready.send(Err(message.clone()));
        }
        publish(message);
        active.take();
        true
    }

    pub fn finish(&self) {
        if let Ok(mut active) = self.playback.0.lock() {
            if active
                .as_ref()
                .is_some_and(|g| Arc::ptr_eq(g, &self.generation))
            {
                active.take();
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn compound_grid() -> PulseGridV2 {
        PulseGridV2 {
            version: 2,
            pulses_per_beat: 3,
            score_offset_pulses: 6,
            bar_start_pulses: vec![0, 6, 12, 18, 24],
            count_bar_pulses: 6,
            count_beat_pulses: 3,
            count_start_phase_pulses: 0,
            score_start_phase_pulses: 0,
            beat_start_pulses: vec![0, 3, 6, 9, 12, 15, 18, 21],
            bar_meter_pulses: vec![6; 4],
            bar_beat_pulses: vec![3; 4],
            bar_phase_pulses: vec![0; 4],
        }
    }
    #[test]
    fn v2_admission_preserves_meter_and_rejects_mixed_or_incomplete_grids() {
        let g = compound_grid();
        let r = Request::new_with_clock(
            "saved",
            180.0,
            30.0 * 60000.0 / (180.0 * 3.0),
            60000.0 / (180.0 * 3.0),
            None,
            None,
            None,
            Some(g.clone()),
        )
        .unwrap();
        assert!(
            (r.grid_v2.as_ref().unwrap().count_micros(r.bpm) - 666_666.6666666667).abs() < 0.000001
        );
        assert!(r.grid.is_none());
        assert!(Request::new_with_clock(
            "saved",
            180.0,
            5000.0,
            100.0,
            Some(3),
            Some(6),
            Some(vec![0, 6]),
            Some(g.clone())
        )
        .is_err());
        assert!(Request::new_with_clock(
            "saved",
            180.0,
            100.0,
            60000.0 / 540.0,
            None,
            None,
            None,
            Some(g.clone())
        )
        .is_err());
        assert!(Request::new_with_clock(
            "saved",
            180.0,
            5000.0,
            0.0,
            None,
            None,
            None,
            Some(g.clone())
        )
        .is_err());
        assert!(Request::new_with_clock(
            "saved",
            180.0,
            5000.0,
            60000.0 / 1080.0,
            None,
            None,
            None,
            Some(g.clone())
        )
        .is_err());
        for n in 0..8 {
            let mut bad = g.clone();
            match n {
                0 => bad.version = 3,
                1 => bad.pulses_per_beat = 97,
                2 => bad.count_bar_pulses = 0,
                3 => bad.count_beat_pulses = 4,
                4 => bad.score_start_phase_pulses = 6,
                5 => bad.score_offset_pulses = 5,
                6 => bad.bar_start_pulses = vec![0],
                _ => bad.beat_start_pulses.push(24),
            };
            assert!(bad.validate().is_err(), "invalid case {n}");
        }
    }
    #[test]
    fn v2_wire_whitelist_rejects_unknown_fractional_negative_and_unsafe_fields() {
        let value = serde_json::to_value(compound_grid()).unwrap();
        assert!(serde_json::from_value::<PulseGridV2>(value.clone()).is_ok());
        for (key, bad) in [
            ("version", serde_json::json!(2.5)),
            ("pulsesPerBeat", serde_json::json!(-1)),
            ("barStartPulses", serde_json::json!([0, 1.5])),
            ("beatStartPulses", serde_json::json!([9007199254740992_u64])),
            ("unknown", serde_json::json!(true)),
        ] {
            let mut v = value.clone();
            v[key] = bad;
            assert!(
                serde_json::from_value::<PulseGridV2>(v)
                    .map(|g| g.validate().is_ok())
                    .unwrap_or(false)
                    == false,
                "field {key}"
            );
        }
    }
    #[test]
    fn captured_owner_cannot_follow_a_replacement_generation() {
        let p = Playback::default();
        let (first, _) = p.begin().unwrap();
        let snapshot = p.current_session().unwrap().unwrap();
        assert!(snapshot.same_generation(&first));
        let (second, _) = p.begin().unwrap();
        assert!(!snapshot.is_current());
        assert!(!snapshot.same_generation(&second));
        snapshot.cancel();
        assert!(second.is_current());
    }
    #[test]
    fn cancelled_arm_ids_remain_consumed_until_a_real_new_generation() {
        let p = Playback::default();
        let (first, _) = p.begin().unwrap();
        first.admit_arm_id(10).unwrap();
        first.admit_arm_id(10).unwrap(); // declined deadline consumes nothing
        first.arm_published(10);
        assert!(first.admit_arm_id(10).is_err());
        assert!(first.admit_arm_id(9).is_err());
        first.admit_arm_id(11).unwrap();
        first.arm_published(11);
        assert!(first.admit_arm_id(10).is_err());
        let snapshot = p.current_session().unwrap().unwrap();
        assert!(snapshot.admit_arm_id(11).is_err());
        let (second, _) = p.begin().unwrap();
        second.admit_arm_id(1).unwrap();
        assert!(!first.is_current());
    }
    #[test]
    fn v2_source_phase_is_explicit_and_meter_beats_are_exactly_bound_before_regeneration() {
        let mut g = compound_grid();
        g.bar_start_pulses = vec![0, 6, 12, 20];
        g.bar_meter_pulses = vec![6, 6, 8];
        g.bar_beat_pulses = vec![3, 3, 2];
        g.bar_phase_pulses = vec![0; 3];
        g.beat_start_pulses = vec![0, 3, 6, 9, 12, 14, 16, 18];
        g.validate().unwrap();
        let mut bad = g.clone();
        bad.beat_start_pulses[4] = 13;
        assert!(bad.validate().is_err());
        let mut bad = g.clone();
        bad.bar_beat_pulses[2] = 3;
        assert!(bad.validate().is_err());
        let mut bad = g.clone();
        bad.bar_phase_pulses[1] = 2;
        assert!(bad.validate().is_err());
        let mut bad = g.clone();
        bad.bar_meter_pulses.pop();
        assert!(bad.validate().is_err());
        let mut bad = g.clone();
        bad.count_bar_pulses = 3;
        assert!(bad.validate().is_err());
        // A short final bar has phase0, unless the source explicitly admits
        // pickup phase. Both encodings are checked, never inferred natively.
        let mut ending = compound_grid();
        ending.bar_start_pulses = vec![0, 6, 7];
        ending.bar_meter_pulses = vec![6; 2];
        ending.bar_beat_pulses = vec![3; 2];
        ending.bar_phase_pulses = vec![0; 2];
        ending.beat_start_pulses = vec![0, 3, 6];
        ending.validate().unwrap();
        let mut pickup = ending.clone();
        pickup.bar_phase_pulses[1] = 5;
        pickup.beat_start_pulses = vec![0, 3];
        pickup.validate().unwrap();
        let mut huge = ending;
        huge.bar_start_pulses = vec![0, 1_000_000_000];
        huge.bar_meter_pulses = vec![6];
        huge.bar_beat_pulses = vec![1];
        huge.count_beat_pulses = 1;
        huge.bar_phase_pulses = vec![0];
        huge.beat_start_pulses = vec![0];
        assert!(huge.validate().unwrap_err().contains("beat count"));
        let mut maximum = compound_grid();
        maximum.count_bar_pulses = 1;
        maximum.count_beat_pulses = 1;
        maximum.score_offset_pulses = 1;
        maximum.bar_start_pulses = (0..100_000).collect();
        maximum.bar_meter_pulses = vec![1; 99_999];
        maximum.bar_beat_pulses = vec![1; 99_999];
        maximum.bar_phase_pulses = vec![0; 99_999];
        maximum.beat_start_pulses = (0..99_999).collect();
        maximum.validate().unwrap();
        maximum.bar_start_pulses.push(100_000);
        assert!(maximum.validate().is_err());
    }
    #[test]
    fn full_repeat_count_is_explicit_and_requires_a_repeat_boundary() {
        let plain = Request::new("", 60.0, 10_000.0, 1000.0 / 3.0).unwrap();
        assert!(!plain.full_repeat_count_in);
        assert!(plain.clone().with_full_repeat_count_in(true).is_err());
        assert!(
            !plain
                .clone()
                .with_full_repeat_count_in(false)
                .unwrap()
                .full_repeat_count_in
        );
        let repeated = plain
            .with_repeat_start(Some(20_000_000.0))
            .unwrap()
            .with_full_repeat_count_in(true)
            .unwrap();
        assert!(repeated.full_repeat_count_in);
        assert_eq!(repeated.repeat_start_micros, Some(20_000_000.0));
    }
    #[test]
    fn score_grid_requests_validate_complete_rational_pulse_metadata_without_changing_ownership() {
        for pulses in [2, 3, 4, 96] {
            let mut step = 60000.0 / (5.0 * pulses as f64);
            while step > 1000.0 {
                step /= 2.0;
            }
            let request = Request::new_with_grid(
                "",
                5.0,
                100000.0,
                step,
                Some(pulses),
                Some(2 * pulses),
                Some(vec![0, 6, 12]),
            )
            .unwrap();
            assert_eq!(request.grid, Some((pulses, 2 * pulses, vec![0, 6, 12])));
            assert!(request.with_repeat_start(Some(30_000_000.0)).is_ok());
        }
        for (p, o, b) in [
            (Some(2), None, Some(vec![0, 6])),
            (Some(0), Some(0), Some(vec![0, 6])),
            (Some(97), Some(194), Some(vec![0, 6])),
            (Some(2), Some(3), Some(vec![0, 6])),
            (Some(2), Some(4), Some(vec![1, 6])),
            (Some(2), Some(4), Some(vec![0, 6, 6])),
            (Some(2), Some(4), Some(vec![0, 1_000_000_001])),
        ] {
            assert!(Request::new_with_grid("", 104.0, 1000.0, 0.0, p, o, b).is_err());
        }
        assert!(Request::new_with_grid(
            "",
            104.0,
            1000.0,
            100.0,
            Some(2),
            Some(4),
            Some(vec![0, 6])
        )
        .is_err());
        assert!(Request::new_with_grid(
            "",
            104.0,
            1000.0,
            300.0,
            Some(2),
            Some(4),
            Some(vec![0, 6])
        )
        .is_err());
    }

    #[test]
    fn validation_preserves_exact_values_and_rejects_invalid_requests() {
        let request = Request::new("endpoint", 17.123456789, 1000.123456789, 0.0).unwrap();
        assert_eq!(request.bpm, 17.123456789);
        assert_eq!(request.duration_ms, 1000.123456789);
        for (bpm, duration, count) in [
            (f64::NAN, 1.0, 0.0),
            (4.9, 1.0, 0.0),
            (500.1, 1.0, 0.0),
            (180.0, f64::INFINITY, 0.0),
            (180.0, 0.0, 0.0),
            (180.0, 3_600_001.0, 0.0),
            (180.0, 1.0, f64::NAN),
            (180.0, 1.0, -1.0),
            (5.0, 1.0, 1000.1),
            (500.0, 1.0, 1000.0),
            (5.0, 3_600_000.0, 1.0e-300),
        ] {
            assert!(Request::new("", bpm, duration, count).is_err());
        }
        assert!(Request::new(&"x".repeat(512), 5.0, 1.0, 1000.0).is_ok());
        assert!(Request::new(&"x".repeat(513), 5.0, 1.0, 0.0).is_err());
        assert!(Request::new("endpoint\0other", 5.0, 1.0, 0.0).is_err());
    }
    #[test]
    fn repeat_target_validates_without_rounding_tempo_or_changing_normal_requests() {
        let plain = Request::new("endpoint", 185.123456789, 5000.0, 0.0).unwrap();
        assert!(plain.repeat_start_micros.is_none());
        let repeat = plain
            .clone()
            .with_repeat_start(Some(20_123_456.789))
            .unwrap();
        assert_eq!(repeat.repeat_start_micros, Some(20_123_456.789));
        assert_eq!(repeat.bpm, 185.123456789);
        for bad in [f64::NAN, f64::INFINITY, 1.0, 9_007_199_254_740_992.0] {
            assert!(plain.clone().with_repeat_start(Some(bad)).is_err());
        }
        assert!(Request::new("", 5.0, 1000.0, 0.0)
            .unwrap()
            .with_repeat_start(Some(30_000_000.0))
            .is_err());
    }

    #[test]
    fn frontend_count_halvings_and_test_clicks_work_across_supported_tempos() {
        for half_bpm in 10..=1000 {
            let bpm = half_bpm as f64 / 2.0;
            let mut count = 60000.0 / (bpm * 3.0);
            while count > 1000.0 {
                count /= 2.0;
            }
            assert!(Request::new("", bpm, 3_600_000.0, count).is_ok(), "{bpm}");
            assert!(Request::new("", bpm, 1.0, 0.0).is_ok());
        }
        for bpm in [
            5.0,
            19.999999999999996,
            20.000000000000004,
            185.123456789,
            500.0,
        ] {
            let mut count = 60000.0 / (bpm * 3.0);
            while count > 1000.0 {
                count /= 2.0;
            }
            assert_eq!(
                Request::new("", bpm, 1200.0, count).unwrap().count_step_ms,
                count
            );
        }
    }

    #[test]
    fn stop_and_replacement_resolve_pending_starts_without_stale_errors() {
        let playback = Playback::default();
        let (old, receiver) = playback.begin().unwrap();
        let (new, next) = playback.begin().unwrap();
        assert!(old.cancelled());
        assert_eq!(
            old.wait_started(receiver, Duration::ZERO),
            Err(CANCELLED.into())
        );
        assert!(!old.started(1));
        assert!(!old.failed("old device error".into(), |_| panic!("stale event")));
        assert!(new.started(123));
        assert!(!new.started(456));
        assert_eq!(new.wait_started(next, Duration::ZERO), Ok(123));
        playback.stop().unwrap();
        assert!(new.cancelled());
        assert!(!new.failed("late error".into(), |_| panic!("cancelled event")));
        playback.stop().unwrap();
    }

    #[test]
    fn timeout_cancels_only_its_generation_and_a_late_origin_is_refused() {
        let playback = Playback::default();
        let (old, receiver) = playback.begin().unwrap();
        assert_eq!(
            old.wait_started(receiver, Duration::ZERO),
            Err(START_TIMEOUT.into())
        );
        assert!(old.cancelled());
        let (new, receiver) = playback.begin().unwrap();
        old.cancel();
        old.finish();
        assert!(!old.started(1));
        assert!(!old.failed("late timeout error".into(), |_| panic!("stale event")));
        assert!(!new.cancelled());
        assert!(new.started(789));
        assert_eq!(new.wait_started(receiver, Duration::ZERO), Ok(789));
    }

    #[test]
    fn current_start_and_runtime_errors_report_once_and_completed_starts_stay_valid() {
        let playback = Playback::default();
        let (session, receiver) = playback.begin().unwrap();
        let mut messages = Vec::new();
        assert!(session.failed("output missing".into(), |m| messages.push(m)));
        assert!(!session.failed("duplicate".into(), |_| panic!("duplicate event")));
        session.finish();
        assert_eq!(
            session.wait_started(receiver, Duration::ZERO),
            Err("output missing".into())
        );
        assert_eq!(messages, ["output missing"]);
        assert!(!session.failed("after close".into(), |_| panic!("finished event")));
        let (session, receiver) = playback.begin().unwrap();
        assert!(session.started(150_000));
        session.finish();
        assert_eq!(session.wait_started(receiver, Duration::ZERO), Ok(150_000));
        let (session, receiver) = playback.begin().unwrap();
        session.started(200_000);
        assert!(session.failed("disconnected".into(), |m| messages.push(m)));
        assert_eq!(
            session.wait_started(receiver, Duration::ZERO),
            Err("disconnected".into())
        );
        assert_eq!(messages, ["output missing", "disconnected"]);
    }

    #[test]
    fn failure_before_startup_consumption_overrides_ready_without_affecting_replacement() {
        let playback = Playback::default();
        let (old, receiver) = playback.begin().unwrap();
        assert!(old.started(150_000));
        assert!(old.failed("output disconnected before reply".into(), |_| {}));
        assert_eq!(
            old.wait_started(receiver, Duration::ZERO),
            Err("output disconnected before reply".into())
        );
        let (new, receiver) = playback.begin().unwrap();
        old.cancel();
        old.finish();
        assert!(!new.cancelled());
        assert!(new.started(300_000));
        new.finish();
        assert_eq!(new.wait_started(receiver, Duration::ZERO), Ok(300_000));
    }

    #[test]
    fn concurrent_replacement_suppresses_an_old_worker_notification() {
        let playback = Playback::default();
        let (old, receiver) = playback.begin().unwrap();
        let (go, wait) = mpsc::channel();
        let worker = std::thread::spawn(move || {
            wait.recv().unwrap();
            assert!(!old.failed("worker failed".into(), |_| panic!("stale event")));
            assert!(old.cancelled());
        });
        let (new, next) = playback.begin().unwrap();
        go.send(()).unwrap();
        worker.join().unwrap();
        assert_eq!(receiver.recv().unwrap(), Err(CANCELLED.into()));
        assert!(new.started(300_000));
        assert_eq!(new.wait_started(next, Duration::ZERO), Ok(300_000));
    }
}
