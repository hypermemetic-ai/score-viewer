//! Render-only state: bounded MIDI, prepared cue mailbox and fixed scratch.
//! The worker owns allocation/reclamation; render never drops a cue or synth.
use super::{lifecycle, metronome};
use std::{
    cell::UnsafeCell,
    ptr,
    sync::{
        atomic::{AtomicBool, AtomicPtr, AtomicU64, Ordering},
        Arc,
    },
};
#[path = "audio_queue.rs"]
mod queue;
// Internal sampler quantum; device buffers may be larger and are chunked.
pub const MAX_BLOCK: usize = 256;

#[derive(Copy, Clone, Default)]
pub struct Midi {
    pub connection: u64,
    pub panic: u64,
    pub kind: u8,
    pub channel: u8,
    pub key: u8,
    pub value: u8,
}
#[derive(Default)]
pub struct MidiBus {
    queue: queue::Queue<Midi, 1024>,
    connection: AtomicU64,
    panic: AtomicU64,
    enabled: AtomicBool,
    pub overflow: AtomicU64,
}
impl MidiBus {
    pub fn enable(&self, value: bool) {
        self.enabled.store(value, Ordering::Release);
        self.clear();
    }
    pub fn connect(&self, generation: u64) {
        self.connection.store(generation, Ordering::Release);
        self.clear();
    }
    pub fn disconnect(&self, generation: u64) {
        if self
            .connection
            .compare_exchange(generation, 0, Ordering::AcqRel, Ordering::Acquire)
            .is_ok()
        {
            self.clear();
        }
    }
    pub fn clear(&self) {
        self.panic.fetch_add(1, Ordering::AcqRel);
    }
    pub fn send(&self, connection: u64, kind: u8, channel: u8, key: u8, value: u8) {
        if !self.enabled.load(Ordering::Acquire)
            || self.connection.load(Ordering::Acquire) != connection
            || !(1..=16).contains(&channel)
            || key > 127
            || value > 127
        {
            return;
        }
        let message = Midi {
            connection,
            panic: self.panic.load(Ordering::Acquire),
            kind,
            channel,
            key,
            value,
        };
        if !self.queue.push(message) {
            self.overflow.fetch_add(1, Ordering::Relaxed);
            self.clear();
        }
    }
}

pub trait Synth: Send {
    fn note_on(&mut self, offset: u32, note: u8, velocity: u8);
    fn note_off(&mut self, offset: u32, note: u8, velocity: u8);
    fn cc(&mut self, offset: u32, controller: u8, value: u8);
    fn all_off(&mut self);
    fn render(&mut self, left: &mut [f32], right: &mut [f32]) -> bool;
}
#[cfg(any(windows, target_os = "macos"))]
impl Synth for crate::piano_engine::PianoEngine {
    fn note_on(&mut self, o: u32, n: u8, v: u8) {
        self.note_on(o, n, v);
    }
    fn note_off(&mut self, o: u32, n: u8, v: u8) {
        self.note_off(o, n, v);
    }
    fn cc(&mut self, o: u32, c: u8, v: u8) {
        self.cc(o, c, v);
    }
    fn all_off(&mut self) {
        self.all_off()
    }
    fn render(&mut self, l: &mut [f32], r: &mut [f32]) -> bool {
        self.render_stereo(l, r)
    }
}

/// A single piano timbre combines contacts across16channels. Same-pitch attacks
/// retrigger within a channel; an overlapping second channel retains contact
/// without creating a voice that channel-less sfizz note-off would also kill.
struct Contacts {
    held: [[bool; 128]; 16],
    sustain: [u8; 16],
}
impl Default for Contacts {
    fn default() -> Self {
        Self {
            held: [[false; 128]; 16],
            sustain: [0; 16],
        }
    }
}
impl Contacts {
    fn apply(&mut self, e: Midi, synth: &mut dyn Synth) {
        let ch = (e.channel - 1) as usize;
        let key = e.key as usize;
        match e.kind {
            1 if e.value > 0 => {
                let others = (0..16).any(|c| c != ch && self.held[c][key]);
                self.held[ch][key] = true;
                if !others {
                    synth.note_on(0, e.key, e.value);
                }
            }
            1 | 2 => {
                self.held[ch][key] = false;
                if !self.held.iter().any(|h| h[key]) {
                    synth.note_off(0, e.key, e.value);
                }
            }
            3 if e.key == 64 => {
                self.sustain[ch] = e.value;
                synth.cc(0, 64, *self.sustain.iter().max().unwrap());
            }
            3 if matches!(e.key, 120 | 123) => {
                for note in 0..128 {
                    if self.held[ch][note] {
                        self.held[ch][note] = false;
                        if !self.held.iter().any(|h| h[note]) {
                            synth.note_off(0, note as u8, 0);
                        }
                    }
                }
                self.sustain[ch] = 0;
                synth.cc(0, 64, *self.sustain.iter().max().unwrap());
                if e.key == 120
                    && !self.held.iter().flatten().any(|h| *h)
                    && self.sustain.iter().all(|v| *v == 0)
                {
                    synth.all_off();
                }
            }
            3 if e.key == 121 => {
                self.sustain[ch] = 0;
                synth.cc(0, 64, *self.sustain.iter().max().unwrap());
            }
            3 => synth.cc(0, e.key, e.value),
            _ => {}
        }
    }
}

pub struct Cue {
    source: metronome::Metronome,
    request: lifecycle::Request,
    stop: Arc<AtomicBool>,
    pub onset: Arc<AtomicU64>,
    pub finished: Arc<AtomicBool>,
    pub invalid: Arc<AtomicBool>,
    first: bool,
}
impl Cue {
    pub fn new(rate: u32, request: lifecycle::Request, stop: Arc<AtomicBool>) -> Self {
        Self {
            source: metronome::Metronome::new_with_grid(
                rate,
                request.bpm,
                request.duration_ms,
                request.count_step_ms,
                request.grid.clone(),
            ),
            request,
            stop,
            onset: Arc::new(AtomicU64::new(0)),
            finished: Arc::new(AtomicBool::new(false)),
            invalid: Arc::new(AtomicBool::new(false)),
            first: true,
        }
    }
    fn prepare(&mut self, playback: u64) {
        if !self.first {
            return;
        }
        self.first = false;
        let onset = if let Some(target) = self.request.repeat_start_micros {
            self.source.repeat_timeline_full_count(
                playback,
                0,
                target,
                self.request.full_repeat_count_in,
            )
        } else {
            metronome::onset_micros(playback, 0)
        };
        if let Some(onset) = onset {
            self.onset.store(onset, Ordering::Release);
        } else {
            self.invalid.store(true, Ordering::Release);
        }
    }
    fn sample(&mut self, now: u64) -> f32 {
        let onset = self.onset.load(Ordering::Acquire);
        if self.stop.load(Ordering::Acquire) || self.invalid.load(Ordering::Acquire) {
            self.finished.store(true, Ordering::Release);
            return 0.0;
        }
        if onset != 0
            && now >= onset.saturating_add((self.request.duration_ms * 1000.0).ceil() as u64)
        {
            self.finished.store(true, Ordering::Release);
            return 0.0;
        }
        self.source.next()
    }
}

/// Worker is sole publisher/reclaimer. Callback swaps raw ownership into a
/// retired slot; the slot is drained off callback before another publication.
#[derive(Default)]
pub struct CueMailbox {
    pending: AtomicPtr<Cue>,
    retired: AtomicPtr<Cue>,
}
impl CueMailbox {
    pub fn publish(&self, cue: Box<Cue>) -> Result<(), Box<Cue>> {
        self.reclaim();
        let raw = Box::into_raw(cue);
        if self
            .pending
            .compare_exchange(ptr::null_mut(), raw, Ordering::Release, Ordering::Acquire)
            .is_err()
        {
            return Err(unsafe { Box::from_raw(raw) });
        }
        Ok(())
    }
    pub fn reset(&self) {
        self.reclaim();
        let p = self.pending.swap(ptr::null_mut(), Ordering::AcqRel);
        if !p.is_null() {
            drop(unsafe { Box::from_raw(p) });
        }
    }
    pub fn reclaim(&self) {
        let old = self.retired.swap(ptr::null_mut(), Ordering::AcqRel);
        if !old.is_null() {
            drop(unsafe { Box::from_raw(old) });
        }
    }
}
impl Drop for CueMailbox {
    fn drop(&mut self) {
        self.reclaim();
        let p = *self.pending.get_mut();
        if !p.is_null() {
            drop(unsafe { Box::from_raw(p) });
        }
    }
}

pub struct Mixer {
    pub synth: Option<Box<dyn Synth>>,
    pub bus: Arc<MidiBus>,
    pub mailbox: Arc<CueMailbox>,
    pub volume: Arc<AtomicU64>,
    left: Box<[f32]>,
    right: Box<[f32]>,
    contacts: Contacts,
    panic: u64,
    cue: *mut Cue,
    pub frames: Arc<AtomicU64>,
    pub peak_bits: Arc<AtomicU64>,
    #[cfg(test)]
    capture: Option<Capture>,
}
#[cfg(test)]
pub struct Capture {
    pub samples: Box<[f32]>,
    pub len: usize,
    pub channels: usize,
}
// cue pointer is exclusively owned by Mixer; no pointer is dereferenced by producer.
unsafe impl Send for Mixer {}
impl Mixer {
    pub fn new(
        synth: Option<Box<dyn Synth>>,
        bus: Arc<MidiBus>,
        mailbox: Arc<CueMailbox>,
        volume: Arc<AtomicU64>,
    ) -> Self {
        Self {
            synth,
            bus,
            mailbox,
            volume,
            left: vec![0.0; MAX_BLOCK].into_boxed_slice(),
            right: vec![0.0; MAX_BLOCK].into_boxed_slice(),
            contacts: Contacts::default(),
            panic: u64::MAX,
            cue: ptr::null_mut(),
            frames: Arc::new(AtomicU64::new(0)),
            peak_bits: Arc::new(AtomicU64::new(0)),
            #[cfg(test)]
            capture: None,
        }
    }
    pub fn fill<T: Copy>(
        &mut self,
        out: &mut [T],
        channels: usize,
        now: u64,
        delay: u64,
        convert: impl Fn(f32) -> T,
    ) {
        if channels == 0 {
            return;
        }
        if out.len() % channels != 0 {
            out.fill(convert(0.0));
            return;
        }
        // Do not consume the next cue until its predecessor can be retired.
        if self.mailbox.retired.load(Ordering::Acquire).is_null() {
            let next = self.mailbox.pending.swap(ptr::null_mut(), Ordering::AcqRel);
            if !next.is_null() {
                let old = std::mem::replace(&mut self.cue, next);
                if !old.is_null() {
                    self.mailbox.retired.store(old, Ordering::Release);
                }
            }
        }
        if !self.cue.is_null() {
            unsafe {
                (*self.cue).prepare(now.saturating_add(delay));
            }
        }
        let panic = self.bus.panic.load(Ordering::Acquire);
        if panic != self.panic {
            self.panic = panic;
            self.contacts = Contacts::default();
            if let Some(s) = self.synth.as_mut() {
                s.all_off();
            }
        }
        // Bound work even with a constantly producing source; overflow signals
        // panic independently of queue capacity and invalidates already queued ink.
        for _ in 0..1024 {
            let Some(e) = self.bus.queue.pop() else { break };
            if e.panic == self.panic && e.connection == self.bus.connection.load(Ordering::Acquire)
            {
                if let Some(s) = self.synth.as_mut() {
                    self.contacts.apply(e, s.as_mut());
                }
            }
        }
        let gain = f64::from_bits(self.volume.load(Ordering::Relaxed)) as f32;
        let mut peak = 0.0f32;
        for chunk in out.chunks_mut(MAX_BLOCK * channels) {
            let frames = chunk.len() / channels;
            self.left[..frames].fill(0.0);
            self.right[..frames].fill(0.0);
            if let Some(s) = self.synth.as_mut() {
                if !s.render(&mut self.left[..frames], &mut self.right[..frames]) {
                    self.left[..frames].fill(0.0);
                    self.right[..frames].fill(0.0);
                }
            }
            for (i, frame) in chunk.chunks_mut(channels).enumerate() {
                let cue = if self.cue.is_null() {
                    0.0
                } else {
                    unsafe { (*self.cue).sample(now) }
                };
                let l = self.left[i] * gain + cue;
                let r = self.right[i] * gain + cue;
                for (c, sample) in frame.iter_mut().enumerate() {
                    let v = if channels == 1 {
                        (l + r) * 0.5
                    } else if c == 0 {
                        l
                    } else if c == 1 {
                        r
                    } else {
                        0.0
                    };
                    let v = if v.is_finite() {
                        v.clamp(-1.0, 1.0)
                    } else {
                        0.0
                    };
                    peak = peak.max(v.abs());
                    *sample = convert(v);
                    #[cfg(test)]
                    if let Some(capture) = self.capture.as_mut() {
                        if capture.len < capture.samples.len() {
                            capture.samples[capture.len] = v;
                            capture.len += 1;
                        }
                    }
                }
            }
            self.frames.fetch_add(frames as u64, Ordering::Relaxed);
        }
        self.peak_bits
            .store((peak as f64).to_bits(), Ordering::Relaxed);
    }
    #[cfg(test)]
    pub fn enable_capture(&mut self, rate: u32, channels: usize, seconds: u32) {
        assert!(rate <= 96000 && channels <= 8 && seconds <= 12);
        self.capture = Some(Capture {
            samples: vec![0.0; rate as usize * channels * seconds as usize].into_boxed_slice(),
            len: 0,
            channels,
        });
    }
}
impl Drop for Mixer {
    fn drop(&mut self) {
        if !self.cue.is_null() {
            drop(unsafe { Box::from_raw(self.cue) });
        }
        self.mailbox.reclaim();
    }
}

/// CPAL closure and worker keep this allocation alive. Callback never waits;
/// worker only mutates/takes render state after stream stop/drop, and acquires
/// this same gate to await any final in-flight callback before reclamation.
pub struct SharedMixer {
    busy: AtomicBool,
    closing: AtomicBool,
    mixer: UnsafeCell<Mixer>,
    frames: Arc<AtomicU64>,
    peak: Arc<AtomicU64>,
    closed: AtomicBool,
    #[cfg(test)]
    capture_taken: AtomicBool,
}
unsafe impl Sync for SharedMixer {}
impl SharedMixer {
    pub fn new(mixer: Mixer) -> Self {
        Self {
            busy: AtomicBool::new(false),
            closing: AtomicBool::new(false),
            frames: mixer.frames.clone(),
            peak: mixer.peak_bits.clone(),
            mixer: UnsafeCell::new(mixer),
            closed: AtomicBool::new(false),
            #[cfg(test)]
            capture_taken: AtomicBool::new(false),
        }
    }
    pub fn render<T: Copy>(
        &self,
        out: &mut [T],
        channels: usize,
        now: u64,
        delay: u64,
        convert: impl Fn(f32) -> T,
    ) {
        if self.closing.load(Ordering::Acquire)
            || self
                .busy
                .compare_exchange(false, true, Ordering::Acquire, Ordering::Relaxed)
                .is_err()
        {
            out.fill(convert(0.0));
            return;
        }
        unsafe {
            (&mut *self.mixer.get()).fill(out, channels, now, delay, convert);
        }
        self.busy.store(false, Ordering::Release);
    }
    pub fn close(&self) {
        self.closing.store(true, Ordering::Release);
        while self
            .busy
            .compare_exchange(false, true, Ordering::Acquire, Ordering::Relaxed)
            .is_err()
        {
            std::thread::yield_now();
        }
        self.closed.store(true, Ordering::Release);
    }
    pub fn counters(&self) -> (Arc<AtomicU64>, Arc<AtomicU64>) {
        (self.frames.clone(), self.peak.clone())
    }
    #[cfg(test)]
    pub fn take_capture_after_close(&self) -> Option<Capture> {
        if !self.closed.load(Ordering::Acquire) || self.capture_taken.swap(true, Ordering::AcqRel) {
            return None;
        }
        unsafe { (&mut *self.mixer.get()).capture.take() }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    thread_local! {static WATCH:std::cell::Cell<Option<(usize,usize)>>=const{std::cell::Cell::new(None)};}
    struct Allocator;
    unsafe impl std::alloc::GlobalAlloc for Allocator {
        unsafe fn alloc(&self, layout: std::alloc::Layout) -> *mut u8 {
            let _ = WATCH.try_with(|w| {
                if let Some((a, d)) = w.get() {
                    w.set(Some((a + 1, d)));
                }
            });
            std::alloc::System.alloc(layout)
        }
        unsafe fn dealloc(&self, p: *mut u8, layout: std::alloc::Layout) {
            let _ = WATCH.try_with(|w| {
                if let Some((a, d)) = w.get() {
                    w.set(Some((a, d + 1)));
                }
            });
            std::alloc::System.dealloc(p, layout)
        }
    }
    #[global_allocator]
    static ALLOCATOR: Allocator = Allocator;
    #[derive(Default)]
    struct Fake {
        events: Vec<(u8, u8, u8)>,
    }
    impl Synth for Fake {
        fn note_on(&mut self, _: u32, n: u8, v: u8) {
            self.events.push((1, n, v));
        }
        fn note_off(&mut self, _: u32, n: u8, v: u8) {
            self.events.push((2, n, v));
        }
        fn cc(&mut self, _: u32, c: u8, v: u8) {
            self.events.push((3, c, v));
        }
        fn all_off(&mut self) {
            self.events.push((4, 0, 0));
        }
        fn render(&mut self, l: &mut [f32], r: &mut [f32]) -> bool {
            l.fill(0.2);
            r.fill(0.3);
            true
        }
    }
    fn event(kind: u8, ch: u8, key: u8, value: u8) -> Midi {
        Midi {
            kind,
            channel: ch,
            key,
            value,
            ..Default::default()
        }
    }
    #[test]
    fn overlapping_channels_retrigger_and_sustain_max() {
        let mut c = Contacts::default();
        let mut s = Fake::default();
        c.apply(event(1, 1, 60, 90), &mut s);
        c.apply(event(1, 1, 60, 100), &mut s);
        c.apply(event(1, 2, 60, 80), &mut s);
        c.apply(event(2, 1, 60, 0), &mut s);
        assert_eq!(s.events, vec![(1, 60, 90), (1, 60, 100)]);
        c.apply(event(2, 2, 60, 40), &mut s);
        assert_eq!(s.events.last(), Some(&(2, 60, 40)));
        for e in [
            event(3, 1, 64, 127),
            event(3, 2, 64, 80),
            event(3, 1, 64, 0),
        ] {
            c.apply(e, &mut s);
        }
        assert_eq!(&s.events[3..], &[(3, 64, 127), (3, 64, 127), (3, 64, 80)]);
    }
    #[test]
    fn overflow_invalidates_old_generation_independent_of_capacity() {
        let b = MidiBus::default();
        b.enable(true);
        b.connect(1);
        for _ in 0..1025 {
            b.send(1, 1, 1, 60, 100);
        }
        assert_eq!(b.overflow.load(Ordering::Relaxed), 1);
        let e = b.queue.pop().unwrap();
        assert_ne!(e.panic, b.panic.load(Ordering::Relaxed));
        b.disconnect(1);
        b.send(1, 1, 1, 62, 100);
        assert_eq!(b.connection.load(Ordering::Relaxed), 0);
    }
    #[test]
    fn mix_chunks_and_unused_channels_no_panic() {
        let mut m = Mixer::new(
            Some(Box::new(Fake::default())),
            Arc::new(MidiBus::default()),
            Arc::new(CueMailbox::default()),
            Arc::new(AtomicU64::new(0.5f64.to_bits())),
        );
        let mut out = vec![1.0; MAX_BLOCK * 4 + 128 * 4];
        m.fill(&mut out, 4, 1_000_000, 0, |v| v);
        for f in out.chunks_exact(4) {
            assert_eq!(f, &[0.1, 0.15, 0.0, 0.0]);
        }
    }
    #[test]
    fn prepared_cue_origin_and_cancellation_leave_piano_playing() {
        let mailbox = Arc::new(CueMailbox::default());
        let stop = Arc::new(AtomicBool::new(false));
        let cue = Box::new(Cue::new(
            48000,
            lifecycle::Request::new("", 180.0, 1000.0, 0.0).unwrap(),
            stop.clone(),
        ));
        let origin = cue.onset.clone();
        let finished = cue.finished.clone();
        assert!(mailbox.publish(cue).is_ok());
        let mut mixer = Mixer::new(
            Some(Box::new(Fake::default())),
            Arc::new(MidiBus::default()),
            mailbox.clone(),
            Arc::new(AtomicU64::new(0.5f64.to_bits())),
        );
        let mut samples = [0f32; 256];
        mixer.fill(&mut samples, 2, 1_000_000, 10_000, |v| v);
        assert_eq!(origin.load(Ordering::Acquire), 1_160_000);
        assert!(!finished.load(Ordering::Acquire));
        stop.store(true, Ordering::Release);
        mixer.fill(&mut samples, 2, 2_000_000, 0, |v| v);
        assert!(finished.load(Ordering::Acquire));
        assert_eq!(&samples[..2], &[0.1, 0.15]);
    }
    #[test]
    fn retired_grid_is_owned_by_worker_and_repeat_keeps_grid() {
        let mailbox = Arc::new(CueMailbox::default());
        let mut mixer = Mixer::new(
            None,
            Arc::new(MidiBus::default()),
            mailbox.clone(),
            Arc::new(AtomicU64::new(1f64.to_bits())),
        );
        let mut samples = [0f32; 256];
        let first = Box::new(Cue::new(
            48000,
            lifecycle::Request::new("", 60.0, 5000.0, 0.0).unwrap(),
            Arc::new(AtomicBool::new(false)),
        ));
        assert!(mailbox.publish(first).is_ok());
        mixer.fill(&mut samples, 2, 18_000_000, 0, |v| v);
        let request = lifecycle::Request::new("", 60.0, 5000.0, 0.0)
            .unwrap()
            .with_repeat_start(Some(20_000_000.0))
            .unwrap();
        let second = Box::new(Cue::new(48000, request, Arc::new(AtomicBool::new(false))));
        let origin = second.onset.clone();
        assert!(mailbox.publish(second).is_ok());
        mixer.fill(&mut samples, 2, 18_400_000, 10_000, |v| v);
        assert_eq!(origin.load(Ordering::Acquire), 18_000_000);
        assert!(!mailbox.retired.load(Ordering::Acquire).is_null());
        mailbox.reclaim();
        assert!(mailbox.retired.load(Ordering::Acquire).is_null());
    }
    #[test]
    fn disabled_bus_never_queues_or_sounds_notes() {
        let bus = MidiBus::default();
        bus.connect(7);
        bus.send(7, 1, 1, 60, 90);
        assert!(bus.queue.pop().is_none());
        assert_eq!(bus.overflow.load(Ordering::Relaxed), 0);
    }
    #[test]
    fn render_replacement_performs_zero_rust_allocations_or_deallocations() {
        let mailbox = Arc::new(CueMailbox::default());
        let bus = Arc::new(MidiBus::default());
        bus.enable(true);
        bus.connect(1);
        bus.send(1, 1, 1, 60, 100);
        let mut mixer = Mixer::new(
            Some(Box::new(Fake {
                events: Vec::with_capacity(32),
            })),
            bus.clone(),
            mailbox.clone(),
            Arc::new(AtomicU64::new(0.5f64.to_bits())),
        );
        let mut samples = [0f32; 256];
        for i in 0..3 {
            let cue = Box::new(Cue::new(
                48000,
                lifecycle::Request::new_with_grid(
                    "",
                    60.0,
                    5000.0,
                    500.0,
                    Some(2),
                    Some(4),
                    Some(vec![0, 4, 8]),
                )
                .unwrap(),
                Arc::new(AtomicBool::new(false)),
            ));
            assert!(mailbox.publish(cue).is_ok());
            WATCH.with(|w| w.set(Some((0, 0))));
            mixer.fill(&mut samples, 2, 1_000_000 + i * 10000, 0, |v| v);
            let counts = WATCH.with(|w| {
                let v = w.get().unwrap();
                w.set(None);
                v
            });
            assert_eq!(counts, (0, 0));
            mailbox.reclaim();
        }
        bus.clear();
        WATCH.with(|w| w.set(Some((0, 0))));
        mixer.fill(&mut samples, 2, 2_000_000, 0, |v| v);
        let counts = WATCH.with(|w| {
            let v = w.get().unwrap();
            w.set(None);
            v
        });
        assert_eq!(counts, (0, 0));
    }
}
