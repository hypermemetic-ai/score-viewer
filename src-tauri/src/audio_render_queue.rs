//! Shared WASAPI storage capacity is not the amount of future audio to render.
//! The lowest tier services one actual engine quantum; higher tiers explicitly
//! trade additional queued quanta for headroom. No automatic tier changes.
#[derive(Copy, Clone, Debug)]
pub struct RenderQueue {
    capacity: u32,
    pub target: u32,
}
impl RenderQueue {
    pub fn new(capacity: u32, period: u32, tier: u8) -> Option<Self> {
        if capacity == 0 || capacity > 65536 || period == 0 || tier > 3 {
            return None;
        }
        let target =
            (u64::from(period).checked_mul(u64::from(tier) + 1)?).min(u64::from(capacity)) as u32;
        Some(Self { capacity, target })
    }
    /// A shared-mode packet may be smaller than the available storage. Already
    /// queued PCM is immutable: skip a transfer until padding falls below target.
    pub fn refill(&self, padding: u32) -> Option<u32> {
        if padding > self.capacity {
            None
        } else {
            Some(self.target.saturating_sub(padding))
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn one_period_lowest_and_higher_real_headroom_even_with_a_locked_period() {
        let targets = (0..4)
            .map(|tier| RenderQueue::new(1126, 512, tier).unwrap().target)
            .collect::<Vec<_>>();
        assert_eq!(targets, [512, 1024, 1126, 1126]);
        for capacity in [512, 1126, 4096, 65536] {
            for tier in 0..4 {
                let q = RenderQueue::new(capacity, 512, tier).unwrap();
                for padding in 0..=capacity {
                    let frames = q.refill(padding).unwrap();
                    assert!(frames <= capacity - padding);
                    assert!(padding + frames <= q.target.max(padding));
                    if padding < q.target {
                        assert_eq!(padding + frames, q.target);
                    }
                }
                assert_eq!(q.refill(capacity + 1), None);
            }
        }
        assert_eq!(RenderQueue::new(128, 512, 0).unwrap().target, 128);
        assert_eq!(RenderQueue::new(65536, u32::MAX, 3).unwrap().target, 65536);
        for (capacity, period, tier) in [(0, 128, 0), (65537, 128, 0), (512, 0, 0), (512, 128, 4)] {
            assert!(RenderQueue::new(capacity, period, tier).is_none());
        }
    }
    #[test]
    fn period_tiers_remain_monotonic_and_capacity_is_only_storage() {
        let periods = [128, 256, 480, 480];
        let targets = periods
            .iter()
            .enumerate()
            .map(|(tier, &period)| RenderQueue::new(4096, period, tier as u8).unwrap().target)
            .collect::<Vec<_>>();
        assert_eq!(targets, [128, 512, 1440, 1920]);
        assert!(targets.windows(2).all(|pair| pair[0] <= pair[1]));
        let q = RenderQueue::new(4096, 128, 0).unwrap();
        // A source opened with old full-capacity padding drains naturally rather
        // than flushing/truncating voices or writing more already-future PCM.
        assert_eq!(q.refill(4096), Some(0));
        assert_eq!(q.refill(128), Some(0));
        assert_eq!(q.refill(64), Some(64));
        assert_eq!(q.refill(0), Some(128));
    }
    #[test]
    fn bounded_service_and_stall_model_preserves_audible_frames_and_recovers() {
        // This models endpoint frame consumption, not hardware/engine latency.
        // One period covers rendering that completes before the next pull; a
        // missed pull is recorded as starvation rather than secretly filling
        // capacity or changing the user's tier.
        for rate in [44100u32, 48000, 96000] {
            for period in [48u32, 128, 512] {
                for capacity in [period, period * 2 + 102, period * 8] {
                    for tier in 0..4 {
                        let q = RenderQueue::new(capacity, period, tier).unwrap();
                        let mut padding = q.target;
                        let mut consumed = 0u64;
                        let mut starved = 0u64;
                        for event in 0..1000 {
                            let pulls = if event == 400 { 5 } else { 1 };
                            let requested = period * pulls;
                            consumed += u64::from(requested.min(padding));
                            starved += u64::from(requested.saturating_sub(padding));
                            padding = padding.saturating_sub(requested);
                            let written = q.refill(padding).unwrap();
                            assert!(written <= capacity - padding);
                            padding += written;
                            assert_eq!(padding, q.target);
                        }
                        assert!(consumed > 0 && starved > 0);
                        assert_eq!(padding, q.target);
                        let maximum_queue_ms = q.target as f64 * 1000. / rate as f64;
                        assert!(maximum_queue_ms <= capacity as f64 * 1000. / rate as f64);
                    }
                }
            }
        }
    }
}
