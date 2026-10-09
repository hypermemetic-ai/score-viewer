//! Test-only integer packing/alignment helpers used by the exclusive experiment.
pub fn pcm24(v: f32) -> i32 {
    ((v.clamp(-1., 1.) as f64 * 8_388_607.).round() as i32) << 8
}
pub fn aligned_duration(frames: u32, rate: u32) -> Result<i64, String> {
    if frames == 0 || frames > 8192 || ![44100, 48000].contains(&rate) {
        return Err("Invalid alignment frames/rate".into());
    }
    Ok((frames as f64 * 10_000_000. / rate as f64).round() as i64)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn twenty_four_valid_bits_are_left_aligned() {
        for value in [-1., -0.7, 0., 0.7, 1.] {
            assert_eq!(pcm24(value) & 255, 0);
        }
        assert_eq!(pcm24(0.), 0);
        assert_eq!(pcm24(1.), 0x7fffff00);
        assert_eq!(pcm24(-1.), -0x7fffff00);
        assert_eq!(pcm24(2.), pcm24(1.));
    }
    #[test]
    fn aligned_duration_preserves_fractional_frame_rate_units() {
        assert_eq!(aligned_duration(144, 44100), Ok(32653));
        assert_eq!(aligned_duration(144, 48000), Ok(30000));
    }
    #[test]
    fn malformed_or_unbounded_alignment_refuses() {
        for (frames, rate) in [(0, 44100), (8193, 44100), (144, 0), (144, 96000)] {
            assert!(aligned_duration(frames, rate).is_err());
        }
    }
}
