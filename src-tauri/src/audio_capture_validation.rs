//! Test-only capture admission. A bad QPC cannot hide overlapping PCM samples.
#[derive(Clone, Copy, Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Packet {
    pub start_sample: usize,
    pub frames: u32,
    pub flags: u32,
    pub device_position: u64,
    pub qpc_100ns: u64,
}
pub(super) struct Window {
    pub sample_start: usize,
    pub sample_end: usize,
    pub time_start_micros: f64,
    pub time_end_micros: f64,
    pub qpc_anchor_100ns: u64,
    pub app_anchor_micros: u64,
    pub rate: u32,
    pub channels: usize,
}
#[derive(Default, Debug, PartialEq)]
pub(super) struct Controls {
    pub data_discontinuity: u32,
    pub timestamp_error: u32,
    pub position_gaps: u32,
    pub qpc_gaps_over_100us: u32,
}
impl Controls {
    fn flags(&mut self, flags: u32) {
        self.data_discontinuity += u32::from(flags & 1 != 0);
        self.timestamp_error += u32::from(flags & 4 != 0);
    }
}
pub(super) fn validate(packets: &[Packet], window: &Window) -> Result<Controls, &'static str> {
    if window.rate == 0
        || window.channels == 0
        || window.sample_start >= window.sample_end
        || !window.time_start_micros.is_finite()
        || !window.time_end_micros.is_finite()
        || window.time_start_micros >= window.time_end_micros
    {
        return Err("invalid capture window");
    }
    let mut controls = Controls::default();
    let mut previous: Option<&Packet> = None;
    let mut previous_selected = false;
    let mut selected = false;
    let mut expected_start = 0usize;
    for packet in packets {
        let samples = (packet.frames as usize)
            .checked_mul(window.channels)
            .ok_or("packet sample overflow")?;
        let end = packet
            .start_sample
            .checked_add(samples)
            .ok_or("packet end overflow")?;
        if packet.frames == 0 || packet.start_sample != expected_start {
            return Err("noncontiguous captured sample inventory");
        }
        expected_start = end;
        let time = window.app_anchor_micros as f64
            + (packet.qpc_100ns as f64 - window.qpc_anchor_100ns as f64) / 10.;
        let time_end = time + packet.frames as f64 * 1_000_000. / window.rate as f64;
        let overlaps_samples = packet.start_sample < window.sample_end && end > window.sample_start;
        let overlaps_time = time_end >= window.time_start_micros && time <= window.time_end_micros;
        let current_selected = overlaps_samples || overlaps_time;
        if current_selected {
            selected = true;
            controls.flags(packet.flags);
            if let Some(previous) = previous {
                // The adjacent predecessor supplies the continuity reference.
                // Its invalid timestamp must not become an admitted anchor.
                if !previous_selected {
                    controls.flags(previous.flags);
                }
                if previous
                    .device_position
                    .checked_add(u64::from(previous.frames))
                    != Some(packet.device_position)
                {
                    controls.position_gaps += 1;
                }
                let actual = packet.qpc_100ns as f64 - previous.qpc_100ns as f64;
                let expected = previous.frames as f64 * 10_000_000. / window.rate as f64;
                if (actual - expected).abs() > 1000. {
                    controls.qpc_gaps_over_100us += 1;
                }
            } else {
                return Err("capture window lacks an adjacent predecessor");
            }
        }
        previous = Some(packet);
        previous_selected = current_selected;
    }
    if !selected || expected_start < window.sample_end {
        return Err("incomplete captured sample window");
    }
    Ok(controls)
}
pub(super) fn enqueue_to_submission_interval(
    before: u64,
    after: u64,
    submitted: u64,
) -> Result<(u64, u64), &'static str> {
    if after < before || submitted < before {
        return Err("nonmonotonic enqueue/submission clock");
    }
    // Producer preemption after send may let audio submit before `after`.
    // That widens the lower bound to zero instead of inventing a negative lag.
    Ok((submitted.saturating_sub(after), submitted - before))
}

#[cfg(test)]
mod tests {
    use super::*;
    fn fixture() -> (Vec<Packet>, Window) {
        let packets = (0..6)
            .map(|i| Packet {
                start_sample: i * 20,
                frames: 10,
                flags: 0,
                device_position: (i * 10) as u64,
                qpc_100ns: 1_000_000 + (i * 100_000) as u64,
            })
            .collect();
        let window = Window {
            sample_start: 40,
            sample_end: 100,
            time_start_micros: 20_000.,
            time_end_micros: 50_000.,
            qpc_anchor_100ns: 1_000_000,
            app_anchor_micros: 0,
            rate: 1000,
            channels: 2,
        };
        (packets, window)
    }
    #[test]
    fn clean_capture_window_uses_exact_adjacent_positions() {
        let (packets, window) = fixture();
        assert_eq!(validate(&packets, &window).unwrap(), Controls::default());
    }
    #[test]
    fn invalid_qpc_cannot_hide_flagged_signature_or_quiet_samples() {
        for flags in [1, 4, 5] {
            let (mut packets, window) = fixture();
            packets[3].qpc_100ns = 0;
            packets[3].flags = flags;
            let controls = validate(&packets, &window).unwrap();
            assert_eq!(controls.data_discontinuity, u32::from(flags & 1 != 0));
            assert_eq!(controls.timestamp_error, u32::from(flags & 4 != 0));
            assert!(controls.qpc_gaps_over_100us > 0);
        }
    }
    #[test]
    fn predecessor_flags_and_position_are_part_of_admission() {
        let (mut packets, window) = fixture();
        packets[0].flags = 4;
        packets[1].device_position += 1;
        let controls = validate(&packets, &window).unwrap();
        assert_eq!(controls.timestamp_error, 1);
        assert!(controls.position_gaps > 0);
    }
    #[test]
    fn qpc_window_union_retains_flags_outside_sample_window() {
        let (mut packets, mut window) = fixture();
        window.sample_end = 80;
        packets[5].flags = 1;
        let controls = validate(&packets, &window).unwrap();
        assert_eq!(controls.data_discontinuity, 1);
    }
    #[test]
    fn fine_timing_tolerance_remains_one_hundred_microseconds() {
        let (mut packets, window) = fixture();
        packets[3].qpc_100ns += 1001;
        assert_eq!(validate(&packets, &window).unwrap().qpc_gaps_over_100us, 2);
    }
    #[test]
    fn incomplete_or_malformed_sample_inventory_refuses() {
        let (mut packets, mut window) = fixture();
        packets[3].start_sample += 1;
        assert!(validate(&packets, &window).is_err());
        let (packets, _) = fixture();
        window.sample_end = 121;
        assert!(validate(&packets, &window).is_err());
        window.sample_start = 1;
        window.sample_end = 2;
        window.channels = usize::MAX;
        assert!(validate(&packets, &window).is_err());
    }
    #[test]
    fn enqueue_bracket_bounds_submission_and_post_send_preemption() {
        assert_eq!(enqueue_to_submission_interval(100, 102, 110), Ok((8, 10)));
        assert_eq!(enqueue_to_submission_interval(100, 115, 110), Ok((0, 10)));
    }
    #[test]
    fn enqueue_bracket_refuses_reversed_or_unrelated_clock_order() {
        assert!(enqueue_to_submission_interval(102, 100, 110).is_err());
        assert!(enqueue_to_submission_interval(100, 102, 99).is_err());
    }
}
