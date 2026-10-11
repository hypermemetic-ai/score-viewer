//! Authored meter accents; subdivisions never change metrical or score time.
use super::PulseGridV2;
pub fn pulse_v2(time: f64, pulse: f64, subdivision: f64, grid: &PulseGridV2) -> (f64, f64, f64) {
    let cadence = if subdivision > 0.0 {
        subdivision
    } else {
        pulse
    };
    let index = (time / cadence).floor();
    let age = time - index * cadence;
    let ratio = (pulse / cadence).round().max(1.0) as u64;
    let metric = index as u64 / ratio;
    let intermediate = index as u64 % ratio != 0;
    let (primary, secondary) = if metric < grid.score_offset_pulses as u64 {
        let phase = metric + grid.count_start_phase_pulses as u64;
        (
            phase % grid.count_bar_pulses as u64 == 0,
            phase % grid.count_beat_pulses as u64 == 0,
        )
    } else {
        let score = metric - grid.score_offset_pulses as u64;
        if score >= *grid.bar_start_pulses.last().unwrap_or(&0) {
            return (age, 650.0, 0.0);
        }
        (
            grid.bar_start_pulses
                .binary_search(&score)
                .ok()
                .is_some_and(|i| grid.bar_phase_pulses.get(i) == Some(&0)),
            grid.beat_start_pulses.binary_search(&score).is_ok(),
        )
    };
    (
        age,
        if intermediate {
            650.0
        } else if primary {
            1200.0
        } else if secondary {
            900.0
        } else {
            650.0
        },
        if grid.version == 3 {
            if intermediate {
                0.022
            } else if primary {
                0.16
            } else if secondary {
                0.12
            } else {
                0.045
            }
        } else if intermediate {
            0.064
        } else {
            0.16
        },
    )
}
pub fn pulse(time: f64, eighth: f64, subdivision: f64) -> (f64, f64, f64) {
    pulse_grid(time, eighth, subdivision, None)
}
pub fn pulse_grid(
    time: f64,
    eighth: f64,
    subdivision: f64,
    grid: Option<&(u32, u32, Vec<u64>)>,
) -> (f64, f64, f64) {
    let cadence = if subdivision > 0.0 {
        subdivision
    } else {
        eighth
    };
    let index = (time / cadence).floor();
    let age = time - index * cadence;
    let ratio = (eighth / cadence).round() as u64;
    let metrical_index = index as u64 / ratio;
    let intermediate = index as u64 % ratio != 0;
    let (primary, secondary) = if let Some((p, offset, bars)) = grid {
        if metrical_index < *offset as u64 {
            (metrical_index == 0, metrical_index % *p as u64 == 0)
        } else {
            let score = metrical_index - *offset as u64;
            (bars.binary_search(&score).is_ok(), score % *p as u64 == 0)
        }
    } else {
        (metrical_index % 6 == 0, metrical_index % 3 == 0)
    };
    let frequency = if intermediate {
        650.0
    } else if primary {
        1200.0
    } else if secondary {
        900.0
    } else {
        650.0
    };
    (age, frequency, if intermediate { 0.064 } else { 0.16 })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn explicit_meter_pickup_and_reference_units_keep_authored_accents() {
        let fixtures = [
            (
                3,
                6,
                3,
                0,
                6,
                vec![0, 6, 12],
                vec![0, 3, 6, 9],
                vec![1200., 650., 650., 900., 650., 650., 1200., 650., 650., 900.],
            ),
            (
                2,
                6,
                2,
                0,
                6,
                vec![0, 6, 12],
                vec![0, 2, 4, 6, 8, 10],
                vec![1200., 650., 900., 650., 900., 650., 1200., 650., 900., 650.],
            ),
            (
                2,
                6,
                2,
                4,
                10,
                vec![0, 2, 8],
                vec![0, 2, 4, 6],
                vec![
                    1200., 650., 900., 650., 900., 650., 1200., 650., 900., 650., 900., 650., 1200.,
                ],
            ),
            (
                2,
                3,
                1,
                0,
                3,
                vec![0, 3, 6],
                vec![0, 1, 2, 3, 4, 5],
                vec![1200., 900., 900., 1200., 900., 900., 1200.],
            ),
        ];
        for (p, bar, beat, phase, offset, bars, beats, expected) in fixtures {
            let n = bars.len() - 1;
            let mut phases = vec![0; n];
            phases[0] = phase;
            let grid = PulseGridV2 {
                version: 2,
                count_in_bars: None,
                pulses_per_beat: p,
                count_bar_pulses: bar,
                count_beat_pulses: beat,
                count_start_phase_pulses: 0,
                score_start_phase_pulses: phase,
                score_offset_pulses: offset,
                bar_start_pulses: bars,
                beat_start_pulses: beats,
                bar_meter_pulses: vec![bar; n],
                bar_beat_pulses: vec![beat; n],
                source_excerpt: None,
                bar_phase_pulses: phases,
            };
            grid.validate().unwrap();
            for bpm in [5., 80., 180., 500.] {
                let pulse = 60. / (bpm * p as f64);
                let mut step = pulse;
                while step > 1. {
                    step /= 2.;
                }
                for (i, hz) in expected.iter().enumerate() {
                    let (age, actual, amp) =
                        pulse_v2(i as f64 * pulse + 0.00001, pulse, step, &grid);
                    assert!((age - 0.00001).abs() < 1e-8);
                    assert_eq!(actual, *hz, "p{p}/bpm{bpm}/pulse{i}");
                    assert_eq!(amp, 0.16);
                }
                let end = grid.score_offset_pulses as u64 + grid.bar_start_pulses.last().unwrap();
                assert_eq!(
                    pulse_v2(end as f64 * pulse + 0.00001, pulse, step, &grid).2,
                    0.
                );
                if step < pulse {
                    assert_eq!(pulse_v2(step + 0.00001, pulse, step, &grid).2, 0.064);
                }
            }
        }
    }
    #[test]
    fn repeated_pickups_short_endings_and_mixed_meter_do_not_invent_downbeats() {
        let grid = PulseGridV2 {
            version: 2,
            count_in_bars: None,
            pulses_per_beat: 2,
            count_bar_pulses: 6,
            count_beat_pulses: 2,
            count_start_phase_pulses: 0,
            score_start_phase_pulses: 4,
            score_offset_pulses: 10,
            bar_start_pulses: vec![0, 2, 8, 10, 16, 17],
            bar_meter_pulses: vec![6; 5],
            bar_beat_pulses: vec![2; 5],
            source_excerpt: None,
            bar_phase_pulses: vec![4, 0, 4, 0, 0],
            beat_start_pulses: vec![0, 2, 4, 6, 8, 10, 12, 14, 16],
        };
        grid.validate().unwrap();
        for (score, hz) in [(0, 900.), (2, 1200.), (8, 900.), (10, 1200.), (16, 1200.)] {
            assert_eq!(
                pulse_v2((10 + score) as f64 * 0.5 + 0.00001, 0.5, 0.5, &grid).1,
                hz
            );
        }
        assert_eq!(pulse_v2(27. * 0.5, 0.5, 0.5, &grid).2, 0.);
        let mixed = PulseGridV2 {
            version: 2,
            count_in_bars: None,
            pulses_per_beat: 3,
            count_bar_pulses: 6,
            count_beat_pulses: 3,
            count_start_phase_pulses: 0,
            score_start_phase_pulses: 0,
            score_offset_pulses: 6,
            bar_start_pulses: vec![0, 6, 14],
            bar_meter_pulses: vec![6, 8],
            bar_beat_pulses: vec![3, 2],
            source_excerpt: None,
            bar_phase_pulses: vec![0, 0],
            beat_start_pulses: vec![0, 3, 6, 8, 10, 12],
        };
        mixed.validate().unwrap();
        for (score, hz) in [
            (0, 1200.),
            (3, 900.),
            (6, 1200.),
            (8, 900.),
            (9, 650.),
            (10, 900.),
            (12, 900.),
        ] {
            assert_eq!(
                pulse_v2((6 + score) as f64 / 3. + 0.00001, 1. / 3., 1. / 3., &mixed).1,
                hz
            );
        }
    }
    #[test]
    fn subdivisions_preserve_full_bar_and_score_accent() {
        for bpm in [5.0, 10.0, 15.0, 180.0] {
            let eighth = 60.0 / (bpm * 3.0);
            let mut count = eighth;
            while count > 1.0 {
                count /= 2.0;
            }
            let epsilon = 0.00001;
            for i in 0..6 {
                let (age, hz, amp) = pulse(i as f64 * eighth + epsilon, eighth, count);
                assert!((age - epsilon).abs() < 1e-8);
                assert_eq!(
                    hz,
                    if i == 0 {
                        1200.0
                    } else if i == 3 {
                        900.0
                    } else {
                        650.0
                    }
                );
                assert_eq!(amp, 0.16);
            }
            if count < eighth {
                assert_eq!(pulse(count + epsilon, eighth, count).2, 0.064);
            }
            let (age, hz, amp) = pulse(6.0 * eighth + epsilon, eighth, count);
            assert!((age - epsilon).abs() < 1e-8);
            assert_eq!(hz, 1200.0);
            assert_eq!(amp, 0.16);
            if count < eighth {
                assert_eq!(
                    pulse(6.0 * eighth + count + epsilon, eighth, count).2,
                    0.064
                );
            }
        }
    }
    #[test]
    fn test_click_has_no_count_in() {
        assert_eq!(pulse(0.0, 1.0 / 9.0, 0.0), (0.0, 1200.0, 0.16));
    }
}
