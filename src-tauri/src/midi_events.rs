//! Passive reader input: a held-note guard, at 60 ms.
//! No musical MIDI is modified or delayed. Suppressed attacks remain marked for
//! the reader's bounded diagnostic trace, never for scoring or live contacts.

pub const REBOUND_GUARD_MICROS: u64 = 60_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InputEvent {
    Note { channel: u8, note: u8, velocity: u8, on: bool, filtered: bool },
    Controller { channel: u8, controller: u8, value: u8 },
}

/// Each live connection owns its own tracking, preserving source/generation
/// identity and forgetting old contacts when disconnected or reconnected.
pub struct MidiIngress {
    last_held_attack: [Option<u64>; 16 * 128],
}

impl Default for MidiIngress {
    fn default() -> Self { Self { last_held_attack: [None; 16 * 128] } }
}

impl MidiIngress {
    pub fn receive(&mut self, data: &[u8], timestamp_micros: u64) -> Option<InputEvent> {
        if data.len() != 3 || data[1] >= 128 || data[2] >= 128 { return None; }
        let status = data[0] & 0xf0;
        let channel_index = (data[0] & 15) as usize;
        let channel = channel_index as u8 + 1;
        let pitch = data[1];
        match status {
            0x80 | 0x90 => {
                let velocity = data[2];
                let on = status == 0x90 && velocity > 0;
                let key = channel_index * 128 + pitch as usize;
                let filtered = on && self.last_held_attack[key]
                    .and_then(|last| timestamp_micros.checked_sub(last))
                    .is_some_and(|elapsed| elapsed < REBOUND_GUARD_MICROS);
                if !on { self.last_held_attack[key] = None; }
                else if !filtered { self.last_held_attack[key] = Some(timestamp_micros); }
                Some(InputEvent::Note { channel, note: pitch, velocity, on, filtered })
            }
            0xb0 => {
                if matches!(pitch, 120 | 121 | 123) {
                    self.last_held_attack[channel_index * 128..(channel_index + 1) * 128].fill(None);
                }
                Some(InputEvent::Controller { channel, controller: pitch, value: data[2] })
            }
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn note(on: bool, filtered: bool) -> InputEvent {
        InputEvent::Note { channel: 1, note: 55, velocity: if on { 64 } else { 0 }, on, filtered }
    }

    #[test]
    fn held_duplicates_are_strictly_below_the_saved_sixty_ms_limit() {
        let mut input = MidiIngress::default();
        assert_eq!(input.receive(&[0x90, 55, 64], 1_000_000), Some(note(true, false)));
        assert_eq!(input.receive(&[0x90, 55, 64], 1_059_999), Some(note(true, true)));
        assert_eq!(input.receive(&[0x90, 55, 64], 1_060_000), Some(note(true, false)));
        assert_eq!(input.receive(&[0x90, 55, 64], 1_119_999), Some(note(true, true)));
        assert_eq!(input.receive(&[0x90, 55, 64], 1_120_000), Some(note(true, false)));
    }

    #[test]
    fn rejected_hits_do_not_extend_the_guard_and_velocity_is_not_filtered() {
        let mut input = MidiIngress::default();
        let a = input.receive(&[0x90, 55, 1], 0).unwrap();
        assert!(matches!(a, InputEvent::Note { velocity: 1, filtered: false, .. }));
        assert!(matches!(input.receive(&[0x90, 55, 127], 20_000), Some(InputEvent::Note { filtered: true, .. })));
        assert!(matches!(input.receive(&[0x90, 55, 127], 50_000), Some(InputEvent::Note { filtered: true, .. })));
        assert_eq!(input.receive(&[0x90, 55, 64], 60_000), Some(note(true, false)));
    }

    #[test]
    fn note_off_and_zero_velocity_on_allow_immediate_repeated_notes() {
        let mut input = MidiIngress::default();
        input.receive(&[0x90, 55, 64], 0);
        assert_eq!(input.receive(&[0x80, 55, 0], 1_000), Some(note(false, false)));
        assert_eq!(input.receive(&[0x90, 55, 64], 2_000), Some(note(true, false)));
        assert_eq!(input.receive(&[0x90, 55, 0], 3_000), Some(note(false, false)));
        assert_eq!(input.receive(&[0x90, 55, 64], 4_000), Some(note(true, false)));
    }

    #[test]
    fn different_channels_and_pitches_have_independent_guard_state() {
        let mut input = MidiIngress::default();
        input.receive(&[0x90, 55, 64], 0);
        assert!(matches!(input.receive(&[0x91, 55, 64], 1), Some(InputEvent::Note { channel: 2, filtered: false, .. })));
        assert!(matches!(input.receive(&[0x90, 59, 64], 1), Some(InputEvent::Note { note: 59, filtered: false, .. })));
        assert_eq!(input.receive(&[0x90, 55, 64], 2), Some(note(true, true)));
        assert_eq!(MidiIngress::default().receive(&[0x90, 55, 64], 2), Some(note(true, false)));
    }

    #[test]
    fn reset_controllers_clear_only_their_channel_and_pass_unchanged() {
        for controller in [120, 121, 123] {
            let mut input = MidiIngress::default();
            input.receive(&[0x90, 55, 64], 0);
            input.receive(&[0x91, 55, 64], 0);
            assert_eq!(input.receive(&[0xb0, controller, 0], 1),
                Some(InputEvent::Controller { channel: 1, controller, value: 0 }));
            assert_eq!(input.receive(&[0x90, 55, 64], 2), Some(note(true, false)));
            assert!(matches!(input.receive(&[0x91, 55, 64], 2), Some(InputEvent::Note { filtered: true, .. })));
        }
    }

    #[test]
    fn sustain_and_overlay_pedal_do_not_release_or_filter_notes() {
        let mut input = MidiIngress::default();
        input.receive(&[0x90, 55, 64], 0);
        for (controller, value) in [(64, 127), (64, 0), (67, 127), (67, 0)] {
            assert_eq!(input.receive(&[0xb0, controller, value], 1),
                Some(InputEvent::Controller { channel: 1, controller, value }));
        }
        assert_eq!(input.receive(&[0x90, 55, 64], 2), Some(note(true, true)));
    }

    #[test]
    fn real_no14_opening_plus_rebound_preserves_original_attacks() {
        let mut input = MidiIngress::default();
        let mut original = vec![];
        // First 6/8 bar 7 B 2 B 7 2, then second bar's 7 0; 15 dotted-quarter BPM.
        for (i, pitch) in [55, 59, 62, 71, 67, 62, 55, 60].into_iter().enumerate() {
            let due = i as u64 * 1_333_333;
            let event = input.receive(&[0x90, pitch, 64], due).unwrap();
            assert!(matches!(event, InputEvent::Note { filtered: false, .. }));
            original.push(pitch);
            if i == 6 {
                assert!(matches!(input.receive(&[0x90, pitch, 64], due + 1_000),
                    Some(InputEvent::Note { filtered: true, note: 55, .. })));
            }
        }
        assert_eq!(original, [55, 59, 62, 71, 67, 62, 55, 60]);
    }

    #[test]
    fn malformed_or_unrelated_messages_do_not_change_held_tracking() {
        let mut input = MidiIngress::default();
        input.receive(&[0x90, 55, 64], 0);
        for message in [vec![], vec![0x90, 55], vec![0x90, 55, 128], vec![0x80, 128, 0], vec![0xe0, 0, 64], vec![0xf8]] {
            assert_eq!(input.receive(&message, 1), None);
        }
        assert_eq!(input.receive(&[0x90, 55, 64], 2), Some(note(true, true)));
    }

    #[test]
    fn driver_clock_restart_does_not_leave_an_indefinite_guard() {
        let mut input = MidiIngress::default();
        input.receive(&[0x90, 55, 64], 4_294_967_000_000);
        assert_eq!(input.receive(&[0x90, 55, 64], 0), Some(note(true, false)));
        assert_eq!(input.receive(&[0x90, 55, 64], 1_000), Some(note(true, true)));
    }

    #[test]
    fn event_spacing_survives_callback_queue_batches_and_delayed_rebounds() {
        let mut input = MidiIngress::default();
        // Genuine 70 ms-separated events delivered in one callback burst pass.
        for (driver_micros, _callback_micros) in [(0, 1_000_000), (70_000, 1_000_001)] {
            assert_eq!(input.receive(&[0x90, 55, 64], driver_micros), Some(note(true, false)));
        }
        // A 10 ms rebound remains rejected even when callback delivery is late.
        let (driver_micros, _callback_micros) = (80_000, 2_000_000);
        assert_eq!(input.receive(&[0x90, 55, 64], driver_micros), Some(note(true, true)));
    }
}
