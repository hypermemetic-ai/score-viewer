//! Fixed bounded MPMC ingress. No allocation, locks, or waiting in push/pop.
use std::{
    cell::UnsafeCell,
    sync::atomic::{AtomicUsize, Ordering},
};

struct Slot<T> {
    sequence: AtomicUsize,
    value: UnsafeCell<T>,
}
pub struct Queue<T: Copy + Default, const N: usize> {
    slots: [Slot<T>; N],
    read: AtomicUsize,
    write: AtomicUsize,
}
// Each claimed sequence owns its slot exclusively until the release publication.
unsafe impl<T: Copy + Default + Send, const N: usize> Sync for Queue<T, N> {}
impl<T: Copy + Default, const N: usize> Default for Queue<T, N> {
    fn default() -> Self {
        assert!(N.is_power_of_two());
        Self {
            slots: std::array::from_fn(|i| Slot {
                sequence: AtomicUsize::new(i),
                value: UnsafeCell::new(T::default()),
            }),
            read: AtomicUsize::new(0),
            write: AtomicUsize::new(0),
        }
    }
}
impl<T: Copy + Default, const N: usize> Queue<T, N> {
    pub fn push(&self, value: T) -> bool {
        let mut pos = self.write.load(Ordering::Relaxed);
        for _ in 0..4 {
            let slot = &self.slots[pos & (N - 1)];
            let diff = slot.sequence.load(Ordering::Acquire).wrapping_sub(pos) as isize;
            if diff < 0 {
                return false;
            }
            if diff == 0
                && self
                    .write
                    .compare_exchange_weak(
                        pos,
                        pos.wrapping_add(1),
                        Ordering::Relaxed,
                        Ordering::Relaxed,
                    )
                    .is_ok()
            {
                unsafe {
                    *slot.value.get() = value;
                }
                slot.sequence.store(pos.wrapping_add(1), Ordering::Release);
                return true;
            }
            pos = self.write.load(Ordering::Relaxed);
        }
        false
    }
    pub fn pop(&self) -> Option<T> {
        let mut pos = self.read.load(Ordering::Relaxed);
        for _ in 0..4 {
            let slot = &self.slots[pos & (N - 1)];
            let diff = slot
                .sequence
                .load(Ordering::Acquire)
                .wrapping_sub(pos.wrapping_add(1)) as isize;
            if diff < 0 {
                return None;
            }
            if diff == 0
                && self
                    .read
                    .compare_exchange_weak(
                        pos,
                        pos.wrapping_add(1),
                        Ordering::Relaxed,
                        Ordering::Relaxed,
                    )
                    .is_ok()
            {
                let value = unsafe { *slot.value.get() };
                slot.sequence.store(pos.wrapping_add(N), Ordering::Release);
                return Some(value);
            }
            pos = self.read.load(Ordering::Relaxed);
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn capacity_fifo_wrap_and_full_recovery() {
        let q = Queue::<u64, 4>::default();
        for base in 0..100 {
            for i in 0..4 {
                assert!(q.push(base * 4 + i));
            }
            assert!(!q.push(999));
            for i in 0..4 {
                assert_eq!(q.pop(), Some(base * 4 + i));
            }
            assert_eq!(q.pop(), None);
        }
    }
    #[test]
    fn concurrent_producers_never_duplicate_or_tear() {
        let q = std::sync::Arc::new(Queue::<u64, 64>::default());
        let threads: Vec<_> = (0..3)
            .map(|p| {
                let q = q.clone();
                std::thread::spawn(move || {
                    for i in 0..1000 {
                        let v = p * 1000 + i + 1;
                        while !q.push(v) {
                            std::thread::yield_now();
                        }
                    }
                })
            })
            .collect();
        let mut seen = vec![false; 3000];
        let mut received = 0;
        while received < 3000 {
            if let Some(v) = q.pop() {
                assert!(!seen[v as usize - 1]);
                seen[v as usize - 1] = true;
                received += 1;
            } else {
                std::thread::yield_now();
            }
        }
        for t in threads {
            t.join().unwrap();
        }
    }
}
