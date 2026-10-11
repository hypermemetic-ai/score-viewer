//! Pure sample generation and explicit callback-to-app clock conversion.
//! The output callback's playback estimate is not a MIDI driver timestamp.
#[path = "practice_audio_timing.rs"]
mod timing;
use super::lifecycle::PulseGridV2;

pub const LEAD_MICROS: u64 = 150_000;
pub fn repeat_count_origin_v2(
    playback: u64,
    queued: u64,
    earliest_attack: f64,
    count_micros: f64,
    bar_micros: f64,
) -> Option<u64> {
    let ready = playback.checked_add(queued)?.checked_add(LEAD_MICROS)? as f64;
    let base = earliest_attack - count_micros;
    if !earliest_attack.is_finite()
        || !count_micros.is_finite()
        || !bar_micros.is_finite()
        || count_micros < 0.0
        || bar_micros <= 0.0
        || base < 0.0
    {
        return None;
    }
    let count = base + ((ready - base) / bar_micros).ceil().max(0.0) * bar_micros;
    if !count.is_finite() || count > super::lifecycle::MAX_SAFE_INTEGER as f64 {
        return None;
    }
    Some(count.ceil() as u64)
}

pub fn onset_micros(callback_micros: u64, playback_delay_micros: u64) -> Option<u64> {
    callback_micros
        .checked_add(playback_delay_micros)?
        .checked_add(LEAD_MICROS)
}

/// Readiness may extend a repeat by whole goal beats, never by an IPC delay.
/// The returned count origin can be past; its score-attack deadline is future.
pub fn repeat_count_origin(
    playback_micros: u64,
    queued_micros: u64,
    earliest_attack: f64,
    beat_micros: f64,
) -> Option<u64> {
    repeat_count_origin_full(
        playback_micros,
        queued_micros,
        earliest_attack,
        beat_micros,
        false,
    )
}
pub fn repeat_count_origin_full(
    playback_micros: u64,
    queued_micros: u64,
    earliest_attack: f64,
    beat_micros: f64,
    full: bool,
) -> Option<u64> {
    const MAX_SAFE: f64 = 9_007_199_254_740_991.0;
    let ready = playback_micros
        .checked_add(queued_micros)?
        .checked_add(LEAD_MICROS)? as f64;
    if !earliest_attack.is_finite()
        || !beat_micros.is_finite()
        || beat_micros <= 0.0
        || earliest_attack < 2.0 * beat_micros
        || earliest_attack > MAX_SAFE
        || ready > MAX_SAFE
    {
        return None;
    }
    let earliest_ready = if full {
        earliest_attack - 2.0 * beat_micros
    } else {
        earliest_attack
    };
    let beats = ((ready - earliest_ready) / beat_micros).ceil().max(0.0);
    let attack = earliest_attack + beats * beat_micros;
    if !attack.is_finite() || attack > MAX_SAFE {
        return None;
    }
    let count = (attack - 2.0 * beat_micros).ceil();
    if !count.is_finite() || count < 0.0 || count > MAX_SAFE {
        None
    } else {
        Some(count as u64)
    }
}

pub struct Metronome {
    frame: u64,
    rate: f64,
    eighth: f64,
    beat: f64,
    grid: Option<(u32, u32, Vec<u64>)>,
    grid_v2: Option<PulseGridV2>,
    subdivision: f64,
    duration: f64,
    lead: f64,
    silent_until: f64,
}

impl Metronome {
    pub fn new(rate: u32, bpm: f64, duration_ms: f64, count_step_ms: f64) -> Self {
        Self::new_with_grid(rate, bpm, duration_ms, count_step_ms, None)
    }
    pub fn new_with_grid(
        rate: u32,
        bpm: f64,
        duration_ms: f64,
        count_step_ms: f64,
        grid: Option<(u32, u32, Vec<u64>)>,
    ) -> Self {
        Self::new_with_clock(rate, bpm, duration_ms, count_step_ms, grid, None)
    }
    pub fn new_with_clock(
        rate: u32,
        bpm: f64,
        duration_ms: f64,
        count_step_ms: f64,
        grid: Option<(u32, u32, Vec<u64>)>,
        grid_v2: Option<PulseGridV2>,
    ) -> Self {
        let ratio = grid_v2.as_ref().map_or_else(
            || grid.as_ref().map_or(3.0, |g| g.0 as f64),
            |g| g.pulses_per_beat as f64,
        );
        Self {
            frame: 0,
            rate: rate as f64,
            eighth: 60.0 / (bpm * ratio),
            beat: 60.0 / bpm,
            grid,
            grid_v2,
            subdivision: count_step_ms / 1000.0,
            duration: duration_ms / 1000.0,
            lead: LEAD_MICROS as f64 / 1_000_000.0,
            silent_until: LEAD_MICROS as f64 / 1_000_000.0,
        }
    }
    /// Join the existing count phase. Past cue pulses are not replayed.
    pub fn repeat_timeline(
        &mut self,
        playback_micros: u64,
        queued_micros: u64,
        earliest_attack: f64,
    ) -> Option<u64> {
        self.repeat_timeline_full_count(playback_micros, queued_micros, earliest_attack, false)
    }
    pub fn repeat_timeline_full_count(
        &mut self,
        playback_micros: u64,
        queued_micros: u64,
        earliest_attack: f64,
        full: bool,
    ) -> Option<u64> {
        let count = if let Some(g) = &self.grid_v2 {
            repeat_count_origin_v2(
                playback_micros,
                queued_micros,
                earliest_attack,
                g.score_offset_pulses as f64 * self.eighth * 1_000_000.0,
                g.count_bar_pulses as f64 * self.eighth * 1_000_000.0,
            )?
        } else {
            repeat_count_origin_full(
                playback_micros,
                queued_micros,
                earliest_attack,
                self.beat * 1_000_000.0,
                full,
            )?
        };
        self.lead = (count as f64 - playback_micros as f64) / 1_000_000.0;
        self.silent_until = queued_micros.checked_add(LEAD_MICROS)? as f64 / 1_000_000.0;
        Some(count)
    }
    /// Windows prequeues silence before Start supplies its app-clock estimate.
    pub fn fill_silence<T: Copy>(
        &mut self,
        samples: &mut [T],
        channels: usize,
        convert: impl Fn(f32) -> T,
    ) {
        self.frame += samples.len().div_ceil(channels) as u64;
        samples.fill(convert(0.0));
    }
    pub fn next(&mut self) -> f32 {
        let elapsed = self.frame as f64 / self.rate;
        let t = elapsed - self.lead;
        self.frame += 1;
        if elapsed < self.silent_until || t < 0.0 || t >= self.duration {
            return 0.0;
        }
        self.at_time(t)
    }
    /// Future baton starts from an absolute presented sample, with no new lead.
    pub fn at_time(&self, t: f64) -> f32 {
        if t < 0.0 || t >= self.duration {
            return 0.0;
        }
        let (age, frequency, amplitude) = if let Some(g) = &self.grid_v2 {
            timing::pulse_v2(t, self.eighth, self.subdivision, g)
        } else {
            timing::pulse_grid(t, self.eighth, self.subdivision, self.grid.as_ref())
        };
        if age >= 0.045 {
            return 0.0;
        }
        (amplitude * (-age * 110.0).exp() * (age * frequency * std::f64::consts::TAU).sin()) as f32
    }
    /// Route a mono cue to the first stereo pair, or the sole mono channel.
    /// Extra interface channels stay silent rather than playing on every bus.
    pub fn fill<T: Copy>(
        &mut self,
        samples: &mut [T],
        channels: usize,
        convert: impl Fn(f32) -> T,
    ) {
        for frame in samples.chunks_mut(channels) {
            let cue = self.next();
            for (channel, sample) in frame.iter_mut().enumerate() {
                *sample = convert(if channel < 2 { cue } else { 0.0 });
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rendered_v3_two_bar_compound_cue_at_ten_percent_has_audible_beat_hierarchy() {
        let grid = PulseGridV2 {
            version: 3,
            count_in_bars: Some(2),
            pulses_per_beat: 3,
            score_offset_pulses: 12,
            count_bar_pulses: 6,
            count_beat_pulses: 3,
            count_start_phase_pulses: 0,
            score_start_phase_pulses: 0,
            bar_start_pulses: vec![0, 6, 12, 18, 24],
            beat_start_pulses: vec![0, 3, 6, 9, 12, 15, 18, 21],
            bar_meter_pulses: vec![6; 4],
            bar_beat_pulses: vec![3; 4],
            source_excerpt: None,
            bar_phase_pulses: vec![0; 4],
        };
        grid.validate().unwrap();
        let count = grid.count_micros(18.) / 1_000_000.;
        assert!((count - 40. / 3.).abs() < 1e-9);
        for rate in [44_100, 48_000] {
            let duration = grid.source_end_micros(18.) / 1000.;
            let metro = Metronome::new_with_clock(
                rate,
                18.,
                duration,
                5000. / 9.,
                None,
                Some(grid.clone()),
            );
            // Actual production PCM, not a pulse-parameter-only assertion.
            let peaks: Vec<f32> = (0..24)
                .map(|i| {
                    let start = i as f64 * 5. / 9.;
                    (0..(rate as f64 * 0.045).ceil() as usize)
                        .map(|j| metro.at_time(start + j as f64 / rate as f64).abs())
                        .fold(0., f32::max)
                })
                .collect();
            for strong in [0, 6, 12, 18] {
                assert!(peaks[strong] > peaks[strong + 2] * 2.4);
                assert!(peaks[strong + 2] > peaks[strong + 1] * 1.7);
            }
            assert!(peaks[0] > peaks[6]);
            assert!((peaks[0] - peaks[12]).abs() < 0.0001);
            assert_eq!(metro.at_time(count - 0.1), 0.);
            assert!(metro.at_time(count + 0.001).abs() > 0.05);
            assert_eq!(metro.at_time(duration / 1000.), 0.);
        }
    }
    #[test]
    fn v2_late_readiness_restarts_a_whole_entry_bar_with_every_count_pulse() {
        for (count, bar) in [
            (666_666.6666666667, 666_666.6666666667),
            (2_250_000., 2_250_000.),
            (5_000_000., 3_000_000.),
            (1_500_000., 1_500_000.),
        ] {
            let earliest = 30_000_000. + count;
            for queued in [0, 25_533, 750_000] {
                for late in [1_000, 100_000, 2_000_000] {
                    let now = (30_000_000. + late as f64) as u64;
                    let ready = now + queued + LEAD_MICROS;
                    let origin = repeat_count_origin_v2(now, queued, earliest, count, bar).unwrap();
                    assert!(origin >= ready);
                    let cycles = (origin as f64 - 30_000_000.) / bar;
                    assert!((cycles - cycles.round()).abs() < 2. / bar);
                }
            }
        }
        for rate in [44_100, 48_000, 96_000] {
            let grid = PulseGridV2 {
                version: 2,
                count_in_bars: None,
                pulses_per_beat: 2,
                score_offset_pulses: 6,
                count_bar_pulses: 6,
                count_beat_pulses: 2,
                count_start_phase_pulses: 0,
                score_start_phase_pulses: 0,
                bar_start_pulses: vec![0, 6],
                bar_meter_pulses: vec![6],
                bar_beat_pulses: vec![2],
                source_excerpt: None,
                bar_phase_pulses: vec![0],
                beat_start_pulses: vec![0, 2, 4],
            };
            grid.validate().unwrap();
            let mut stream = Metronome::new_with_clock(rate, 80., 4500., 375., None, Some(grid));
            let now = 30_100_000;
            let count = stream
                .repeat_timeline_full_count(now, 0, 32_250_000., true)
                .unwrap();
            assert_eq!(count, 32_250_000);
            let until = ((count - now + 2_250_000 + 25_000) as f64 / 1_000_000. * rate as f64)
                .ceil() as usize;
            let mut pcm = vec![0f32; until];
            stream.fill(&mut pcm, 1, |v| v);
            let start = ((count - now) as f64 / 1_000_000. * rate as f64).ceil() as usize;
            assert!(pcm[..start].iter().all(|v| *v == 0.));
            for pulse in 0..=6 {
                let frame = start + (pulse as f64 * 0.375 * rate as f64).round() as usize;
                assert!(
                    pcm[frame..frame + rate as usize / 50]
                        .iter()
                        .any(|v| v.abs() > 0.04),
                    "rate{rate} pulse{pulse}"
                );
            }
        }
    }
    #[test]
    fn full_count_in_never_joins_elapsed_pulses_and_preserves_the_beat_grid() {
        for queued in [0, 50_000, 750_000] {
            for playback in [17_700_000, 18_400_000, 19_900_000, 20_850_000] {
                let ready = playback + queued + LEAD_MICROS;
                let count =
                    repeat_count_origin_full(playback, queued, 20_000_000.0, 1_000_000.0, true)
                        .unwrap();
                assert!(count >= ready);
                assert_eq!((count - 18_000_000) % 1_000_000, 0);
                let mut source = Metronome::new(1000, 60.0, 10_000.0, 1000.0 / 3.0);
                assert_eq!(
                    source.repeat_timeline_full_count(playback, queued, 20_000_000.0, true),
                    Some(count)
                );
                assert_eq!(source.lead, (count - playback) as f64 / 1_000_000.0);
            }
        }
        assert_eq!(
            repeat_count_origin(18_400_000, 0, 20_000_000.0, 1_000_000.0),
            Some(18_000_000)
        );
        assert_eq!(
            repeat_count_origin_full(18_400_000, 0, 20_000_000.0, 1_000_000.0, true),
            Some(19_000_000)
        );
    }
    #[test]
    fn score_grids_reset_after_two_goal_beats_and_follow_actual_pickup_and_meter_boundaries() {
        for (pulses, bars, primary) in [
            (2, vec![0, 6, 12], vec![0, 4, 10, 16]),
            (3, vec![0, 6, 12], vec![0, 6, 12, 18]),
            (2, vec![0, 2, 8, 12], vec![0, 4, 6, 12, 16]),
            (2, vec![0, 8, 16], vec![0, 4, 12, 20]),
        ] {
            let grid = (pulses, 2 * pulses, bars);
            for bpm in [5.0, 104.0, 185.123456789, 500.0] {
                let pulse = 60.0 / (bpm * pulses as f64);
                let mut count = pulse;
                while count > 1.0 {
                    count /= 2.0;
                }
                for i in 0..=20 {
                    let (_, hz, amp) =
                        timing::pulse_grid(i as f64 * pulse + 0.00001, pulse, count, Some(&grid));
                    assert_eq!(
                        hz,
                        if primary.contains(&i) {
                            1200.0
                        } else if i % pulses as u64 == 0 {
                            900.0
                        } else {
                            650.0
                        },
                        "{pulses}/{bpm}/{i}"
                    );
                    assert_eq!(amp, 0.16);
                }
                let mut stream = Metronome::new_with_grid(
                    48_000,
                    bpm,
                    120000.0 / bpm + 1000.0,
                    count * 1000.0,
                    Some(grid.clone()),
                );
                let target = 30_000_000.0 + 120_000_000.0 / bpm;
                let count_origin = stream
                    .repeat_timeline((target - 100_000.0).floor() as u64, 0, target)
                    .unwrap();
                assert!((count_origin as f64 - 30_000_000.0 - 60_000_000.0 / bpm).abs() < 1.1);
            }
        }
    }
    #[test]
    fn callback_and_output_origins_are_explicit_and_overflow_is_rejected() {
        assert_eq!(onset_micros(8_000_000, 10_667), Some(8_160_667));
        assert_eq!(onset_micros(u64::MAX, 1), None);
    }
    #[test]
    fn repeat_readiness_extends_only_whole_goal_beats_including_output_queue() {
        assert_eq!(
            repeat_count_origin(18_400_000, 0, 20_000_000.0, 1_000_000.0),
            Some(18_000_000)
        );
        assert_eq!(
            repeat_count_origin(19_900_000, 0, 20_000_000.0, 1_000_000.0),
            Some(19_000_000)
        );
        assert_eq!(
            repeat_count_origin(19_810_000, 50_000, 20_000_000.0, 1_000_000.0),
            Some(19_000_000)
        );
        assert_eq!(
            repeat_count_origin(20_850_000, 0, 20_000_000.0, 1_000_000.0),
            Some(19_000_000)
        );
        assert_eq!(
            repeat_count_origin(u64::MAX, 0, 20_000_000.0, 1_000_000.0),
            None
        );
        assert_eq!(
            repeat_count_origin(18_400_000, 0, f64::NAN, 1_000_000.0),
            None
        );
    }
    #[test]
    fn joined_repeat_waveform_and_reported_origin_share_the_future_score_attack() {
        for rate in [44_100, 48_000, 96_000] {
            for bpm in [5.0_f64, 15.0, 180.0, 185.123456789, 500.0] {
                let beat = 60_000_000.0 / bpm;
                let target = 30_000_000.0 + 2.0 * beat;
                let playback = (target - 100_000.0).floor() as u64;
                let mut source = Metronome::new(rate, bpm, 120_000.0 / bpm + 1000.0, 0.0);
                let count = source.repeat_timeline(playback, 0, target).unwrap();
                let attack = count as f64 + 2.0 * beat;
                assert!((attack - target - beat).abs() < 1.1);
                let before =
                    ((attack - playback as f64) / 1_000_000.0 * rate as f64).ceil() as usize;
                let mut samples = vec![0f32; before + rate as usize / 20];
                source.fill(&mut samples, 1, |v| v);
                assert!(samples[..(rate as usize * 15 / 100)]
                    .iter()
                    .all(|s| *s == 0.0));
                assert!(samples[before..before + rate as usize / 40]
                    .iter()
                    .any(|s| s.abs() > 0.1));
            }
        }
    }
    #[test]
    fn windows_prequeued_repeat_silence_advances_frames_without_restarting_phase() {
        let mut source = Metronome::new(48_000, 60.0, 5000.0, 0.0);
        let mut queue = vec![1f32; 4800];
        source.fill_silence(&mut queue, 2, |v| v);
        assert!(queue.iter().all(|s| *s == 0.0));
        assert_eq!(
            source.repeat_timeline(18_800_000, 50_000, 20_000_000.0),
            Some(18_000_000)
        );
        let mut a = vec![0f32; 48000 * 2];
        source.fill(&mut a, 2, |v| v);
        // The whole prequeue + safety lead is silent; next audible phase is
        // the retained second count beat, not a fresh downbeat150ms after Start.
        assert!(a[..48000 * 2 * 15 / 100].iter().all(|s| *s == 0.0));
        assert!(a[48000 * 2 * 15 / 100..48000 * 2 * 20 / 100]
            .iter()
            .any(|s| s.abs() > 0.01));
    }
    #[test]
    fn stream_chunking_does_not_change_timing_or_samples() {
        for rate in [44_100, 48_000, 96_000] {
            let mut a = Metronome::new(rate, 15.0, 5000.0, 60.0 / (15.0 * 3.0) * 500.0);
            let mut b = Metronome::new(rate, 15.0, 5000.0, 60.0 / (15.0 * 3.0) * 500.0);
            let mut full = vec![0.0f32; rate as usize * 2];
            a.fill(&mut full, 2, |v| v);
            let mut chunks = full.clone();
            for chunk in chunks.chunks_mut(512) {
                b.fill(chunk, 2, |v| v);
            }
            assert_eq!(full, chunks);
            assert!(full[..rate as usize * 3 / 10].iter().all(|v| *v == 0.0));
            assert!(full[rate as usize * 3 / 10..]
                .iter()
                .any(|v| v.abs() > 0.01));
            assert!(full.iter().all(|v| v.is_finite() && v.abs() <= 0.16));
        }
    }
    #[test]
    fn mono_integer_and_multichannel_output_keep_unused_buses_silent() {
        let mut mono = Metronome::new(48_000, 180.0, 50.0, 0.0);
        let mut a = vec![0i16; 12_000];
        mono.fill(&mut a, 1, |v| (v * i16::MAX as f32).round() as i16);
        assert!(a.iter().any(|v| *v != 0));
        assert!(a[9600..].iter().all(|v| *v == 0));
        let mut stereo = Metronome::new(48_000, 180.0, 50.0, 0.0);
        let mut b = vec![0f32; 12_000 * 8];
        stereo.fill(&mut b, 8, |v| v);
        for frame in b.chunks_exact(8) {
            assert_eq!(frame[0], frame[1]);
            assert!(frame[2..].iter().all(|v| *v == 0.0));
        }
    }

    #[test]
    fn every_output_rate_keeps_the_lead_and_duration_boundary_silent() {
        for rate in [44_100, 48_000, 96_000] {
            let mut source = Metronome::new(rate, 185.123456789, 37.7, 0.0);
            let mut samples = vec![0.0f32; rate as usize];
            source.fill(&mut samples, 1, |v| v);
            let lead = rate as usize * 15 / 100;
            let end = (rate as f64 * (0.15 + 0.0377)).ceil() as usize;
            assert!(samples[..lead].iter().all(|v| *v == 0.0));
            assert!(samples[lead + 1..end].iter().any(|v| v.abs() > 0.01));
            assert!(samples[end..].iter().all(|v| *v == 0.0));
        }
    }

    #[test]
    fn windows_cue_regression_preserves_the_existing_primary_and_secondary_accents() {
        // Frozen samples from the former 44.1kHz WASAPI loop at 180 BPM.
        // Check the existing sound, not another copy of the generator formula.
        let mut source = Metronome::new(44_100, 180.0, 1100.0, 0.0);
        let mut samples = vec![0.0f32; 56_000 * 2];
        source.fill(&mut samples, 2, |v| v);
        let expected = [
            (6616, 0.027154471266),
            (6635, -0.041747345205),
            (6700, 0.119446832951),
            (8000, -0.004665714453),
            (11516, 0.014759456990),
            (11535, 0.146227454392),
            (16416, 0.014759456990),
            (21316, 0.020409374589),
            (21335, 0.083038030229),
            (36016, 0.027154471266),
            (36035, -0.041747345205),
            (55200, 0.0),
        ];
        for (frame, value) in expected {
            assert!(
                (samples[frame * 2] as f64 - value).abs() < 1.0e-6,
                "frame {frame}"
            );
            assert_eq!(samples[frame * 2], samples[frame * 2 + 1]);
        }
    }

    #[test]
    fn frontend_count_halvings_retain_six_eighth_bar_accents_throughout_the_tempo_range() {
        for half_bpm in 10..=1000 {
            let bpm = half_bpm as f64 / 2.0;
            let eighth = 60.0 / (bpm * 3.0);
            let mut count_ms = 60000.0 / (bpm * 3.0);
            while count_ms > 1000.0 {
                count_ms /= 2.0;
            }
            for index in 0..=6 {
                let (age, frequency, amplitude) =
                    timing::pulse(index as f64 * eighth + 0.00001, eighth, count_ms / 1000.0);
                assert!((age - 0.00001).abs() < 1.0e-8, "{bpm}: {index}");
                assert_eq!(
                    frequency,
                    if index % 6 == 0 {
                        1200.0
                    } else if index % 3 == 0 {
                        900.0
                    } else {
                        650.0
                    }
                );
                assert_eq!(amplitude, 0.16);
            }
            if count_ms / 1000.0 < eighth - 1.0e-9 {
                assert_eq!(
                    timing::pulse(count_ms / 1000.0 + 0.00001, eighth, count_ms / 1000.0).2,
                    0.064
                );
            }
        }
    }
}
