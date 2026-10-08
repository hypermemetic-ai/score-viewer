//! Shared-engine period choices, never an advertised sound-to-ear latency.
pub fn choose(
    rate: u32,
    fundamental: u32,
    min: u32,
    max: u32,
    default: u32,
    tier: u8,
) -> Option<u32> {
    if rate == 0 || fundamental == 0 || min == 0 || max < min || tier > 3 {
        return None;
    }
    let wanted = match tier {
        0 => min,
        1 => (rate as f64 * 0.005).ceil() as u32,
        2 => (rate as f64 * 0.010).ceil() as u32,
        _ => default.max((rate as f64 * 0.010).ceil() as u32),
    };
    let smallest = min
        .checked_add(fundamental - 1)?
        .checked_div(fundamental)?
        .checked_mul(fundamental)?;
    let largest = max / fundamental * fundamental;
    if smallest > largest {
        return None;
    }
    Some(wanted.max(smallest).min(largest).div_ceil(fundamental) * fundamental)
}
/// HAL gives a range rather than a WASAPI fundamental. Preserve its exact
/// minimum; higher tiers prefer conventional power-of-two sizes within range.
pub fn choose_hal(rate: u32, min: u32, max: u32, default: u32, tier: u8) -> Option<u32> {
    let wanted = choose(rate, 1, min, max, default, tier)?;
    if tier == 0 || wanted == min {
        return Some(wanted);
    }
    Some(wanted.checked_next_power_of_two()?.min(max))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn legal_choices_stock_and_small_periods() {
        for tier in 0..4 {
            assert_eq!(choose(48000, 480, 480, 480, 480, tier), Some(480));
        }
        assert_eq!(
            (0..4)
                .map(|t| choose(48000, 32, 128, 480, 480, t))
                .collect::<Vec<_>>(),
            vec![Some(128), Some(256), Some(480), Some(480)]
        );
        assert_eq!(choose(44100, 4, 48, 448, 448, 1), Some(224));
        assert_eq!(choose(0, 0, 0, 0, 0, 0), None);
        assert_eq!(
            (0..4)
                .map(|t| choose(48000, 32, 128, 960, 128, t).unwrap())
                .collect::<Vec<_>>(),
            vec![128, 256, 480, 480]
        );
    }
    #[test]
    fn hal_range_choices_are_monotonic_and_keep_exact_minimum() {
        assert_eq!(
            (0..4)
                .map(|t| choose_hal(48000, 32, 4096, 512, t))
                .collect::<Vec<_>>(),
            vec![Some(32), Some(256), Some(512), Some(512)]
        );
        assert_eq!(
            (0..4)
                .map(|t| choose_hal(48000, 14, 480, 64, t))
                .collect::<Vec<_>>(),
            vec![Some(14), Some(256), Some(480), Some(480)]
        );
    }
}
