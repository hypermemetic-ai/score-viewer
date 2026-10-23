//! Render-only state: bounded MIDI, prepared cue mailbox and fixed scratch.
//! The worker owns allocation/reclamation; render never drops a cue or synth.
use super::{lifecycle, metronome, repeat};
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
#[path = "audio_schedule.rs"]
pub mod schedule;
// Internal sampler quantum; device buffers may be larger and are chunked.
pub const MAX_BLOCK: usize = 256;

/// The pianist's two volume settings, 0 to 1, as the gains the mixer applies.
/// Commands store a setting's gain; the callback only loads the two numbers.
pub struct Volumes {
    piano: AtomicU64,
    cue: AtomicU64,
}
/// The setting at which a gain is the reference level (70%, the default).
pub const VOLUME_DEFAULT: f64 = 0.7;
/// Piano gain at the default setting (earlier 0.7): a hard middle C peaks
/// around −5.5 dBFS and a five-note chord at velocity 100 stays under the
/// limiter. It is applied to the sampler's float output with the cue, before
/// the limiter: no sample-bank change, no reload, no rounding, live at once.
pub const PIANO_GAIN: f64 = 2.7;
// 100% is twice (+6 dB) the default's gain: (1 / 0.7)^CURVE = 2.
const CURVE: f64 = 1.943_358_588_9;
fn curve(setting: f64) -> f64 {
    (setting.clamp(0.0, 1.0) / VOLUME_DEFAULT).powf(CURVE)
}
/// Piano gain for a Volume setting. The curve is close to evenly spaced in
/// decibels over most of the track. A saved setting is never quieter than its
/// earlier linear gain (only below about 15% does that floor apply).
pub fn piano_gain(setting: f64) -> f64 {
    let v = setting.clamp(0.0, 1.0);
    (PIANO_GAIN * curve(v)).max(v)
}
/// Metronome and practice cue gain: the default is the earlier fixed level.
pub fn cue_gain(setting: f64) -> f64 {
    curve(setting)
}
impl Volumes {
    pub fn new(piano: f64, cue: f64) -> Self {
        Self::with_gains(piano_gain(piano), cue_gain(cue))
    }
    /// Raw gains, for diagnostics and tests that pin exact levels.
    pub fn with_gains(piano: f64, cue: f64) -> Self {
        Self {
            piano: AtomicU64::new(piano.to_bits()),
            cue: AtomicU64::new(cue.to_bits()),
        }
    }
    pub fn set_piano(&self, setting: f64) {
        self.piano
            .store(piano_gain(setting).to_bits(), Ordering::Release);
    }
    pub fn set_cue(&self, setting: f64) {
        self.cue
            .store(cue_gain(setting).to_bits(), Ordering::Release);
    }
    fn gains(&self) -> (f32, f32) {
        (
            f64::from_bits(self.piano.load(Ordering::Relaxed)) as f32,
            f64::from_bits(self.cue.load(Ordering::Relaxed)) as f32,
        )
    }
}
impl Default for Volumes {
    fn default() -> Self {
        Self::new(VOLUME_DEFAULT, VOLUME_DEFAULT)
    }
}

/// A peak limiter on the final mix, so a loud pedalled passage never clips.
/// It looks no samples ahead, so it adds no delay: a frame louder than the
/// held peak lowers the gain at that frame, exactly to the ceiling. The peak
/// is held 30 ms (longer than a bass period, so the gain does not follow the
/// waveform) and then falls back with a 150 ms time constant. Below the
/// ceiling it is exactly transparent.
pub struct Limiter {
    envelope: f32,
    hold: u32,
    hold_frames: u32,
    release: f32,
    pub limited_frames: u64,
    pub deepest: f32,
}
impl Limiter {
    /// −1 dBFS.
    pub const CEILING: f32 = 0.891_250_9;
    pub fn new(rate: u32) -> Self {
        let rate = rate.max(1) as f32;
        Self {
            envelope: Self::CEILING,
            hold: 0,
            hold_frames: (rate * 0.03) as u32,
            release: (-1.0 / (rate * 0.15)).exp(),
            limited_frames: 0,
            deepest: 1.0,
        }
    }
    #[inline]
    pub fn gain(&mut self, peak: f32) -> f32 {
        if peak > self.envelope && peak.is_finite() {
            self.envelope = peak;
            self.hold = self.hold_frames;
        } else if self.hold > 0 {
            self.hold -= 1;
        } else if self.envelope > Self::CEILING {
            self.envelope = (self.envelope * self.release).max(Self::CEILING);
        }
        if self.envelope > Self::CEILING {
            let gain = Self::CEILING / self.envelope;
            self.limited_frames += 1;
            self.deepest = self.deepest.min(gain);
            gain
        } else {
            1.0
        }
    }
}

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
    /// Scheduled web-layer notes; independent of live connection and panic.
    pub schedule: schedule::ScheduleBus,
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
/// Channel 17 holds the scheduled stream's contacts, beside live MIDI. A live
/// strike on a key only the stream holds sounds its own attack, so a pianist
/// playing along is always heard; the stream never strikes over a live key.
struct Contacts {
    held: [[bool; 128]; 17],
    sustain: [u8; 17],
}
impl Default for Contacts {
    fn default() -> Self {
        Self {
            held: [[false; 128]; 17],
            sustain: [0; 17],
        }
    }
}
const PREVIEW: usize = schedule::CHANNEL as usize - 1;
impl Contacts {
    fn apply(&mut self, e: Midi, synth: &mut dyn Synth) {
        self.apply_at(e, 0, synth)
    }
    /// `offset` is the event's frame within the next sampler quantum.
    fn apply_at(&mut self, e: Midi, offset: u32, synth: &mut dyn Synth) {
        let ch = (e.channel - 1) as usize;
        let key = e.key as usize;
        match e.kind {
            1 if e.value > 0 => {
                let live = ch != PREVIEW;
                let others = (0..self.held.len())
                    .any(|c| c != ch && self.held[c][key] && !(live && c == PREVIEW));
                self.held[ch][key] = true;
                if !others {
                    synth.note_on(offset, e.key, e.value);
                }
            }
            1 | 2 => {
                self.held[ch][key] = false;
                if !self.held.iter().any(|h| h[key]) {
                    synth.note_off(offset, e.key, e.value);
                }
            }
            3 if e.key == 64 => {
                self.sustain[ch] = e.value;
                synth.cc(offset, 64, *self.sustain.iter().max().unwrap());
            }
            3 if matches!(e.key, 120 | 123) => {
                for note in 0..128 {
                    if self.held[ch][note] {
                        self.held[ch][note] = false;
                        if !self.held.iter().any(|h| h[note]) {
                            synth.note_off(offset, note as u8, 0);
                        }
                    }
                }
                self.sustain[ch] = 0;
                synth.cc(offset, 64, *self.sustain.iter().max().unwrap());
                if e.key == 120
                    && !self.held.iter().flatten().any(|h| *h)
                    && self.sustain.iter().all(|v| *v == 0)
                {
                    synth.all_off();
                }
            }
            3 if e.key == 121 => {
                self.sustain[ch] = 0;
                synth.cc(offset, 64, *self.sustain.iter().max().unwrap());
            }
            3 => synth.cc(offset, e.key, e.value),
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
    rate: u32,
    armed_start_seconds: f64,
    armed_frame: u64,
    pub arm: Option<Arc<repeat::ArmControl>>,
}
impl Cue {
    pub fn new(rate: u32, request: lifecycle::Request, stop: Arc<AtomicBool>) -> Self {
        Self {
            source: metronome::Metronome::new_with_clock(
                rate,
                request.bpm,
                request.duration_ms,
                request.count_step_ms,
                request.grid.clone(),
                request.grid_v2.clone(),
            ),
            request,
            stop,
            onset: Arc::new(AtomicU64::new(0)),
            finished: Arc::new(AtomicBool::new(false)),
            invalid: Arc::new(AtomicBool::new(false)),
            first: true,
            rate,
            armed_start_seconds: 0.0,
            armed_frame: 0,
            arm: None,
        }
    }
    pub fn future(
        rate: u32,
        request: lifecycle::Request,
        stop: Arc<AtomicBool>,
        arm: Arc<repeat::ArmControl>,
    ) -> Self {
        let mut cue = Self::new(rate, request, stop);
        cue.arm = Some(arm);
        cue
    }
    fn cancelled(&self) -> bool {
        self.stop.load(Ordering::Acquire) || self.arm.as_ref().is_some_and(|a| a.cancelled())
    }
    fn prepare(&mut self, playback: u64) {
        if !self.first {
            return;
        }
        self.first = false;
        let onset = if let Some(arm) = &self.arm {
            Some(arm.count_origin)
        } else if let Some(target) = self.request.repeat_start_micros {
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
            if self.arm.is_some() {
                // Latch the eligible handoff's fractional sample offset once.
                // Later callback playback estimates still govern ownership and
                // completion, but cannot skip/repeat the click's PCM phase.
                self.armed_start_seconds = (playback as f64 - onset as f64) / 1_000_000.0;
            }
            self.onset.store(onset, Ordering::Release);
        } else {
            self.invalid.store(true, Ordering::Release);
        }
    }
    fn sample(&mut self, now: u64) -> f32 {
        let onset = self.onset.load(Ordering::Acquire);
        if self.cancelled() || self.invalid.load(Ordering::Acquire) {
            self.finished.store(true, Ordering::Release);
            return 0.0;
        }
        if onset != 0
            && now >= onset.saturating_add((self.request.duration_ms * 1000.0).ceil() as u64)
        {
            self.finished.store(true, Ordering::Release);
            return 0.0;
        }
        if self.arm.is_some() {
            let elapsed = self.armed_start_seconds + self.armed_frame as f64 / self.rate as f64;
            self.armed_frame += 1;
            self.source.at_time(elapsed)
        } else {
            self.source.next()
        }
    }
}

/// Worker is sole publisher/reclaimer. Callback swaps raw ownership into a
/// retired slot; the slot is drained off callback before another publication.
#[derive(Default)]
pub struct CueMailbox {
    pending: AtomicPtr<Cue>,
    retired: AtomicPtr<Cue>,
    pub submitted_end_micros: AtomicU64,
    pub block_micros: AtomicU64,
}
impl CueMailbox {
    pub fn publish(&self, cue: Box<Cue>) -> Result<(), Box<Cue>> {
        self.reclaim();
        self.publish_prepared(cue)
    }
    /// Final deadline admission can publish without a preceding destructor.
    /// Producer reclaimed retired ownership before preparing this cue.
    pub fn publish_prepared(&self, cue: Box<Cue>) -> Result<(), Box<Cue>> {
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
        // Called only after output callback closure; the next output must
        // establish a fresh real horizon before any future arm is admitted.
        self.submitted_end_micros.store(0, Ordering::Release);
        self.block_micros.store(0, Ordering::Release);
    }
    pub fn reclaim(&self) {
        let old = self.retired.swap(ptr::null_mut(), Ordering::AcqRel);
        if !old.is_null() {
            drop(unsafe { Box::from_raw(old) });
        }
    }
    pub fn has_pending(&self) -> bool {
        !self.pending.load(Ordering::Acquire).is_null()
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
    pub volume: Arc<Volumes>,
    limiter: Limiter,
    left: Box<[f32]>,
    right: Box<[f32]>,
    contacts: Contacts,
    panic: u64,
    cue: *mut Cue,
    player: schedule::Player,
    pub frames: Arc<AtomicU64>,
    pub peak_bits: Arc<AtomicU64>,
    /// Frames the limiter has lowered, and its lowest gain (f32 bits).
    pub limited: Arc<AtomicU64>,
    pub deepest_bits: Arc<AtomicU64>,
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
    /// Only callback owns/dereferences published cues. The producer may cancel
    /// their separate atomic controls, and frees raw cues only after retirement.
    fn handoff(&mut self, playback: u64) {
        if !self.mailbox.retired.load(Ordering::Acquire).is_null() {
            return;
        }
        let next = self.mailbox.pending.load(Ordering::Acquire);
        if next.is_null() {
            return;
        }
        unsafe {
            if (*next).cancelled() {
                let p = self.mailbox.pending.swap(ptr::null_mut(), Ordering::AcqRel);
                (*p).finished.store(true, Ordering::Release);
                self.mailbox.retired.store(p, Ordering::Release);
                return;
            }
            if let Some(a) = &(*next).arm {
                if playback < a.count_origin {
                    return;
                }
                let owns = !self.cue.is_null()
                    && !(*self.cue).stop.load(Ordering::Acquire)
                    && (*self.cue).onset.load(Ordering::Acquire) == a.previous_origin;
                // A delayed/stalled callback cannot silently truncate a count.
                let sample_micros = 1_000_000u64.div_ceil((*next).rate as u64);
                if !owns || playback.saturating_sub(a.count_origin) > sample_micros {
                    (*next).invalid.store(true, Ordering::Release);
                    a.cancel();
                    let p = self.mailbox.pending.swap(ptr::null_mut(), Ordering::AcqRel);
                    self.mailbox.retired.store(p, Ordering::Release);
                    return;
                }
                if !a.activate() {
                    return;
                }
            }
            let next = self.mailbox.pending.swap(ptr::null_mut(), Ordering::AcqRel);
            let old = std::mem::replace(&mut self.cue, next);
            (*next).prepare(playback);
            if let Some(arm) = &(*next).arm {
                arm.commit_activation();
            }
            if !old.is_null() {
                (*old).finished.store(true, Ordering::Release);
                self.mailbox.retired.store(old, Ordering::Release);
            }
        }
    }
    pub fn new(
        synth: Option<Box<dyn Synth>>,
        bus: Arc<MidiBus>,
        mailbox: Arc<CueMailbox>,
        volume: Arc<Volumes>,
    ) -> Self {
        Self {
            synth,
            bus,
            mailbox,
            volume,
            limiter: Limiter::new(48000),
            left: vec![0.0; MAX_BLOCK].into_boxed_slice(),
            right: vec![0.0; MAX_BLOCK].into_boxed_slice(),
            contacts: Contacts::default(),
            panic: u64::MAX,
            cue: ptr::null_mut(),
            player: schedule::Player::default(),
            frames: Arc::new(AtomicU64::new(0)),
            peak_bits: Arc::new(AtomicU64::new(0)),
            limited: Arc::new(AtomicU64::new(0)),
            deepest_bits: Arc::new(AtomicU64::new(1f32.to_bits() as u64)),
            #[cfg(test)]
            capture: None,
        }
    }
    /// Scheduled notes and clicks need the output rate. A new output starts a
    /// fresh schedule epoch, so nothing submitted for an earlier one sounds.
    pub fn at_rate(mut self, rate: u32) -> Self {
        self.bus.schedule.restart();
        self.player = schedule::Player::new(&self.bus.schedule, rate);
        self.limiter = Limiter::new(rate);
        self
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
        let base = now.checked_add(delay).unwrap_or(u64::MAX);
        let pending = self.mailbox.pending.load(Ordering::Acquire);
        let rate = if !self.cue.is_null() {
            unsafe { (*self.cue).rate }
        } else if !pending.is_null() {
            unsafe { (*pending).rate }
        } else {
            0
        };
        let frames = out.len() / channels;
        if rate > 0 {
            let span = (frames as u64 * 1_000_000).div_ceil(rate as u64);
            // Publish before the first pending snapshot, including the in-flight
            // block. A producer that raced this store reserves one more block.
            self.mailbox.block_micros.fetch_max(span, Ordering::AcqRel);
            self.mailbox
                .submitted_end_micros
                .store(base.saturating_add(span), Ordering::Release);
        }
        // Initial/legacy replacement retains its original first-callback phase.
        self.handoff(base);
        if !self.cue.is_null() {
            unsafe {
                (*self.cue).prepare(now.saturating_add(delay));
            }
        }
        // Recheck ingress at each sampler quantum, so messages arriving while a
        // larger device packet is rendered can reach its next unsynthesized
        // chunk. Keep one bounded budget for the WHOLE device transfer.
        let mut ingress_budget = 1024;
        let (gain, cue_gain) = self.volume.gains();
        let mut peak = 0.0f32;
        let mut frame_offset = 0u64;
        for chunk in out.chunks_mut(MAX_BLOCK * channels) {
            let panic = self.bus.panic.load(Ordering::Acquire);
            if panic != self.panic {
                self.panic = panic;
                self.contacts = Contacts::default();
                if let Some(s) = self.synth.as_mut() {
                    s.all_off();
                }
            }
            while ingress_budget > 0 {
                let Some(e) = self.bus.queue.pop() else { break };
                ingress_budget -= 1;
                if e.panic == self.panic
                    && e.connection == self.bus.connection.load(Ordering::Acquire)
                {
                    if let Some(s) = self.synth.as_mut() {
                        self.contacts.apply(e, s.as_mut());
                    }
                }
            }
            let frames = chunk.len() / channels;
            let scheduled = self.player.rate() as u64;
            if scheduled > 0 {
                let start = base.saturating_add(frame_offset * 1_000_000 / scheduled);
                let (synth, contacts) = (&mut self.synth, &mut self.contacts);
                self.player
                    .quantum(&self.bus.schedule, start, frames, |kind, key, value, offset| {
                        if let Some(s) = synth.as_mut() {
                            let e = Midi {
                                kind,
                                channel: schedule::CHANNEL,
                                key,
                                value,
                                ..Default::default()
                            };
                            contacts.apply_at(e, offset, s.as_mut());
                        }
                    });
            }
            self.left[..frames].fill(0.0);
            self.right[..frames].fill(0.0);
            if let Some(s) = self.synth.as_mut() {
                if !s.render(&mut self.left[..frames], &mut self.right[..frames]) {
                    self.left[..frames].fill(0.0);
                    self.right[..frames].fill(0.0);
                }
            }
            for (i, frame) in chunk.chunks_mut(channels).enumerate() {
                let playback = if rate > 0 {
                    base.saturating_add((frame_offset * 1_000_000) / rate as u64)
                } else {
                    base
                };
                self.handoff(playback);
                let cue = if self.cue.is_null() {
                    0.0
                } else {
                    unsafe {
                        (*self.cue).sample(if (*self.cue).request.grid_v2.is_some() {
                            playback
                        } else {
                            now
                        })
                    }
                };
                let cue = (cue + self.player.click_sample(i)) * cue_gain;
                let mut l = self.left[i] * gain + cue;
                let mut r = self.right[i] * gain + cue;
                let limit = self.limiter.gain(l.abs().max(r.abs()));
                if limit < 1.0 {
                    l *= limit;
                    r *= limit;
                }
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
                frame_offset += 1;
            }
            self.player.advance(frames);
            self.frames.fetch_add(frames as u64, Ordering::Relaxed);
        }
        let scheduled = self.player.rate() as u64;
        if scheduled > 0 {
            let span = (frames as u64 * 1_000_000).div_ceil(scheduled);
            self.player
                .rendered(&self.bus.schedule, base.saturating_add(span), span);
        }
        self.peak_bits
            .store((peak as f64).to_bits(), Ordering::Relaxed);
        self.limited
            .store(self.limiter.limited_frames, Ordering::Relaxed);
        self.deepest_bits
            .store(self.limiter.deepest.to_bits() as u64, Ordering::Relaxed);
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
pub fn limiter_status(limited: &AtomicU64, deepest: &AtomicU64) -> (u64, f64) {
    (
        limited.load(Ordering::Relaxed),
        f32::from_bits(deepest.load(Ordering::Relaxed) as u32) as f64,
    )
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
    limited: Arc<AtomicU64>,
    deepest: Arc<AtomicU64>,
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
            limited: mixer.limited.clone(),
            deepest: mixer.deepest_bits.clone(),
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
    /// Frames the limiter lowered and its lowest gain, since the output opened.
    pub fn limiter(&self) -> (u64, f64) {
        limiter_status(&self.limited, &self.deepest)
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
    fn piano_has_no_cue_lead_and_mid_transfer_events_reach_next_sampler_quantum() {
        struct ContactTone {
            active: bool,
            first: bool,
            bus: Arc<MidiBus>,
        }
        impl Synth for ContactTone {
            fn note_on(&mut self, offset: u32, _: u8, _: u8) {
                assert_eq!(offset, 0);
                self.active = true;
            }
            fn note_off(&mut self, _: u32, _: u8, _: u8) {
                self.active = false;
            }
            fn cc(&mut self, _: u32, _: u8, _: u8) {}
            fn all_off(&mut self) {
                self.active = false;
            }
            fn render(&mut self, left: &mut [f32], right: &mut [f32]) -> bool {
                left.fill(if self.active { 0.2 } else { 0. });
                right.copy_from_slice(left);
                if self.first {
                    self.first = false;
                    self.bus.send(77, 1, 1, 60, 100);
                }
                true
            }
        }
        let bus = Arc::new(MidiBus::default());
        bus.enable(true);
        bus.connect(77);
        let mut mixer = Mixer::new(
            Some(Box::new(ContactTone {
                active: false,
                first: true,
                bus: bus.clone(),
            })),
            bus.clone(),
            Arc::new(CueMailbox::default()),
            Arc::new(Volumes::with_gains(1.0, 1.0)),
        );
        let mut out = [0f32; MAX_BLOCK * 3];
        WATCH.with(|w| w.set(Some((0, 0))));
        mixer.fill(&mut out, 1, 1_000_000, 0, |v| v);
        let allocations = WATCH.with(|w| {
            let x = w.get().unwrap();
            w.set(None);
            x
        });
        assert_eq!(allocations, (0, 0));
        assert!(out[..MAX_BLOCK].iter().all(|v| *v == 0.));
        assert!(out[MAX_BLOCK..].iter().all(|v| *v == 0.2));
        bus.clear();
        bus.send(77, 1, 1, 64, 100);
        let mut instant = [0f32; 128];
        mixer.fill(&mut instant, 1, 1_001_000, 0, |v| v);
        assert_eq!(
            instant[0], 0.2,
            "live piano does not wait the150ms cue lead"
        );
    }
    fn metered_request(bpm: f64) -> lifecycle::Request {
        let grid = lifecycle::PulseGridV2 {
            version: 2,
            count_in_bars: None,
            pulses_per_beat: 3,
            score_offset_pulses: 6,
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
        lifecycle::Request::new_with_clock(
            "same",
            bpm,
            grid.source_end_micros(bpm) / 1000.,
            60000. / (bpm * 3.),
            None,
            None,
            None,
            Some(grid),
        )
        .unwrap()
    }
    fn empty_mixer(mailbox: Arc<CueMailbox>) -> Mixer {
        Mixer::new(
            None,
            Arc::new(MidiBus::default()),
            mailbox,
            Arc::new(Volumes::with_gains(1.0, 1.0)),
        )
    }
    fn watched_fill(mixer: &mut Mixer, out: &mut [f32], rate: u32, base: u64, frame: u64) {
        WATCH.with(|w| w.set(Some((0, 0))));
        mixer.fill(out, 1, base + (frame * 1_000_000) / rate as u64, 0, |v| v);
        let counts = WATCH.with(|w| {
            let counts = w.get().unwrap();
            w.set(None);
            counts
        });
        assert_eq!(counts, (0, 0));
    }
    fn versioned_request(version: u8) -> lifecycle::Request {
        let mut grid = metered_request(180.).grid_v2.unwrap();
        grid.version = version;
        if version == 3 {
            grid.count_in_bars = Some(2);
            grid.score_offset_pulses = 12;
        }
        lifecycle::Request::new_with_clock(
            "same",
            180.,
            grid.source_end_micros(180.) / 1000.,
            60000. / (180. * 3.),
            None,
            None,
            None,
            Some(grid),
        )
        .unwrap()
    }
    fn future_pcm<T: Copy + Default>(
        rate: u32,
        version: u8,
        channels: usize,
        first_offset: u64,
        blocks: &[usize],
        jitter: &[i64],
        convert: impl Fn(f32) -> T,
    ) -> Vec<T> {
        let request = versioned_request(version);
        let mailbox = Arc::new(CueMailbox::default());
        let stop = Arc::new(AtomicBool::new(false));
        let old = Box::new(Cue::new(rate, request.clone(), stop.clone()));
        let previous = old.onset.clone();
        assert!(mailbox.publish(old).is_ok());
        let mut mixer = empty_mixer(mailbox.clone());
        watched_fill(&mut mixer, &mut [0f32; 1], rate, 1_000_000, 0);
        let previous = previous.load(Ordering::Acquire);
        let target = (previous as f64 + request.duration_ms * 1000.).ceil() as u64;
        let arm = Arc::new(repeat::ArmControl::new(
            1,
            previous,
            target,
            Arc::new(AtomicBool::new(false)),
        ));
        let future = Box::new(Cue::future(rate, request, stop, arm.clone()));
        let onset = future.onset.clone();
        let finished = future.finished.clone();
        assert!(mailbox.publish(future).is_ok());
        let frames = rate as usize * 2 / 5;
        let mut result = Vec::with_capacity(frames * channels);
        let mut frame = 0;
        let mut callback = 0;
        while frame < frames {
            let count = blocks[callback % blocks.len()].min(frames - frame);
            let mut out = vec![T::default(); count * channels];
            let playback = target + first_offset + (frame as u64 * 1_000_000) / rate as u64;
            let offset = if callback == 0 {
                0
            } else {
                jitter[callback % jitter.len()]
            };
            // Vary callback-to-playback delay independently of the phase.
            let delay = 5_000 + callback as u64 % 7;
            let now = (playback as i64 + offset) as u64 - delay;
            WATCH.with(|w| w.set(Some((0, 0))));
            mixer.fill(&mut out, channels, now, delay, &convert);
            let counts = WATCH.with(|w| {
                let counts = w.get().unwrap();
                w.set(None);
                counts
            });
            assert_eq!(counts, (0, 0));
            result.extend(out);
            frame += count;
            callback += 1;
        }
        assert!(arm.activated());
        assert_eq!(onset.load(Ordering::Acquire), target);
        assert!(!finished.load(Ordering::Acquire));
        assert!(mailbox.submitted_end_micros.load(Ordering::Acquire) > target);
        drop(mixer);
        mailbox.reset();
        assert_eq!(mailbox.submitted_end_micros.load(Ordering::Acquire), 0);
        assert!(!mailbox.has_pending());
        result
    }
    fn assert_pcm_equal<T: PartialEq + std::fmt::Debug>(actual: &[T], expected: &[T]) {
        assert_eq!(actual.len(), expected.len());
        if let Some((frame, (actual, expected))) = actual
            .iter()
            .zip(expected)
            .enumerate()
            .find(|(_, (actual, expected))| actual != expected)
        {
            panic!("PCM mismatch at sample{frame}: actual{actual:?}, expected{expected:?}");
        }
    }
    #[test]
    fn armed_pcm_phase_is_contiguous_under_callback_jitter_and_fractional_handoff() {
        // Common rates plus both admitted WASAPI rate limits. Every sample is
        // compared, including click tails, silence and later metrical accents.
        for rate in [8_000, 22_050, 44_100, 48_000, 96_000, 192_000, 384_000] {
            for version in [2, 3] {
                for first_offset in [0, (1_000_000u64.div_ceil(rate as u64) / 2).max(1)] {
                    let reference = metronome::Metronome::new_with_clock(
                        rate,
                        180.,
                        versioned_request(version).duration_ms,
                        60000. / (180. * 3.),
                        None,
                        versioned_request(version).grid_v2,
                    );
                    let expected: Vec<_> = (0..rate as usize * 2 / 5)
                        .map(|frame| {
                            reference.at_time(
                                first_offset as f64 / 1_000_000. + frame as f64 / rate as f64,
                            )
                        })
                        .collect();
                    for (blocks, jitter) in [
                        (&[1usize][..], &[0i64][..]),
                        (&[64, 128, 257, 512][..], &[0, 13, -11, 7, -5][..]),
                    ] {
                        let actual =
                            future_pcm(rate, version, 1, first_offset, blocks, jitter, |v| v);
                        assert_pcm_equal(&actual, &expected);
                    }
                }
            }
        }
        // Larger observed-clock disturbances at the usual output rates must
        // also leave every emitted sample unchanged after the first handoff.
        for rate in [44_100, 48_000, 96_000] {
            let clean = future_pcm(rate, 3, 1, 1, &[512], &[0], |v| v);
            let jittered = future_pcm(rate, 3, 1, 1, &[64, 257, 512], &[0, -250, 250], |v| v);
            assert_pcm_equal(&clean, &jittered);
        }
    }
    #[test]
    fn armed_pcm_remains_identical_through_supported_sample_conversions_and_channels() {
        for rate in [44_100, 48_000, 96_000] {
            let expected = future_pcm(rate, 3, 1, 1, &[512], &[0], |v| v);
            assert!(expected.iter().all(|v| v.is_finite() && v.abs() < 0.17));
            for channels in [1, 2, 8] {
                let expanded: Vec<_> = expected
                    .iter()
                    .flat_map(|v| (0..channels).map(move |c| if c < 2 { *v } else { 0. }))
                    .collect();
                let float = future_pcm(
                    rate,
                    3,
                    channels,
                    1,
                    &[64, 257, 512],
                    &[0, -250, 250],
                    |v| v,
                );
                assert_pcm_equal(&float, &expanded);
                let int16 = future_pcm(
                    rate,
                    3,
                    channels,
                    1,
                    &[64, 257, 512],
                    &[0, -250, 250],
                    |v| (v * i16::MAX as f32).round() as i16,
                );
                assert_pcm_equal(
                    &int16,
                    &expanded
                        .iter()
                        .map(|v| (v * i16::MAX as f32).round() as i16)
                        .collect::<Vec<_>>(),
                );
                let int32 = future_pcm(
                    rate,
                    3,
                    channels,
                    1,
                    &[64, 257, 512],
                    &[0, -250, 250],
                    |v| (v as f64 * i32::MAX as f64).round() as i32,
                );
                assert_pcm_equal(
                    &int32,
                    &expanded
                        .iter()
                        .map(|v| (*v as f64 * i32::MAX as f64).round() as i32)
                        .collect::<Vec<_>>(),
                );
                let int24 = future_pcm(
                    rate,
                    3,
                    channels,
                    1,
                    &[64, 257, 512],
                    &[0, -250, 250],
                    |v| {
                        let bytes = ((v * 8_388_607.).round() as i32).to_le_bytes();
                        [bytes[0], bytes[1], bytes[2]]
                    },
                );
                assert_pcm_equal(
                    &int24,
                    &expanded
                        .iter()
                        .map(|v| {
                            let bytes = ((v * 8_388_607.).round() as i32).to_le_bytes();
                            [bytes[0], bytes[1], bytes[2]]
                        })
                        .collect::<Vec<_>>(),
                );
            }
        }
    }
    #[test]
    fn armed_cancel_error_restart_and_output_rebuild_do_not_retain_pcm_phase() {
        let mailbox = Arc::new(CueMailbox::default());
        let mut now = 1_000_000;
        for rate in [44_100, 48_000, 96_000] {
            let mut mixer = empty_mixer(mailbox.clone());
            for invalidated in [false, true] {
                let request = versioned_request(3);
                let stop = Arc::new(AtomicBool::new(false));
                let initial = Box::new(Cue::new(rate, request.clone(), stop.clone()));
                let previous = initial.onset.clone();
                assert!(mailbox.publish(initial).is_ok());
                watched_fill(&mut mixer, &mut [0f32; 1], rate, now, 0);
                let previous = previous.load(Ordering::Acquire);
                let target = (previous as f64 + request.duration_ms * 1000.).ceil() as u64;
                let arm = Arc::new(repeat::ArmControl::new(
                    1,
                    previous,
                    target,
                    Arc::new(AtomicBool::new(false)),
                ));
                let future = Box::new(Cue::future(
                    rate,
                    request.clone(),
                    stop.clone(),
                    arm.clone(),
                ));
                let finished = future.finished.clone();
                let invalid = future.invalid.clone();
                assert!(mailbox.publish(future).is_ok());
                let mut samples = [0f32; 257];
                watched_fill(&mut mixer, &mut samples, rate, target + 1, 0);
                assert!(samples.iter().any(|v| v.abs() > 0.1));
                if invalidated {
                    invalid.store(true, Ordering::Release);
                } else {
                    assert_eq!(arm.cancel(), repeat::CancelState::Activated);
                }
                watched_fill(&mut mixer, &mut samples, rate, target + 6_000, 0);
                assert!(samples.iter().all(|v| *v == 0.));
                assert!(finished.load(Ordering::Acquire));
                now = target + 100_000;
                let restarted = Box::new(Cue::new(
                    rate,
                    request.clone(),
                    Arc::new(AtomicBool::new(false)),
                ));
                let origin = restarted.onset.clone();
                assert!(mailbox.publish(restarted).is_ok());
                let mut expected = metronome::Metronome::new_with_clock(
                    rate,
                    request.bpm,
                    request.duration_ms,
                    request.count_step_ms,
                    None,
                    request.grid_v2,
                );
                let count = rate as usize / 5;
                let mut actual = vec![0f32; count];
                watched_fill(&mut mixer, &mut actual, rate, now, 0);
                assert_eq!(origin.load(Ordering::Acquire), now + metronome::LEAD_MICROS);
                assert_pcm_equal(
                    &actual,
                    &(0..count).map(|_| expected.next()).collect::<Vec<_>>(),
                );
                assert!(actual[..rate as usize * 15 / 100].iter().all(|v| *v == 0.));
                assert!(actual.iter().any(|v| v.abs() > 0.1));
                now += 300_000;
            }
            drop(mixer);
            mailbox.reset();
            assert_eq!(mailbox.submitted_end_micros.load(Ordering::Acquire), 0);
            assert_eq!(mailbox.block_micros.load(Ordering::Acquire), 0);
            assert!(!mailbox.has_pending());
        }
    }
    #[test]
    fn armed_phase_latch_does_not_replace_clock_completion_or_cancellation_guards() {
        for cancelled in [false, true] {
            let target = 4_000_000;
            let request = versioned_request(3);
            let stop = Arc::new(AtomicBool::new(false));
            let arm = Arc::new(repeat::ArmControl::new(
                1,
                1_150_000,
                target,
                Arc::new(AtomicBool::new(false)),
            ));
            let mut cue = Cue::future(48_000, request.clone(), stop.clone(), arm);
            cue.prepare(target + 1);
            assert!(cue.sample(target + 1) > 0.);
            let end = target + (request.duration_ms * 1000.).ceil() as u64;
            let now = if cancelled {
                stop.store(true, Ordering::Release);
                target + 2
            } else {
                end
            };
            assert_eq!(cue.sample(now), 0.);
            assert!(cue.finished.load(Ordering::Acquire));
            assert_eq!(
                cue.armed_frame, 1,
                "refused samples must not advance the PCM cursor"
            );
            assert_eq!(cue.onset.load(Ordering::Acquire), target);
        }
    }
    #[test]
    fn v3_future_mixer_cue_keeps_two_compound_bars_and_exact_entry_after_a_rate_change() {
        for rate in [44_100, 48_000] {
            let mailbox = Arc::new(CueMailbox::default());
            let stop = Arc::new(AtomicBool::new(false));
            let old_grid = metered_request(36.).grid_v2.unwrap();
            let old_duration = old_grid.source_end_micros(18.);
            let old_request = lifecycle::Request::new_with_clock(
                "same",
                18.,
                old_duration / 1000.,
                60000. / (18. * 3.) / 2.,
                None,
                None,
                None,
                Some(old_grid),
            )
            .unwrap();
            let old = Box::new(Cue::new(rate, old_request, stop.clone()));
            let onset = old.onset.clone();
            assert!(mailbox.publish(old).is_ok());
            let mut mixer = empty_mixer(mailbox.clone());
            let mut out = [0f32; 128];
            watched_fill(&mut mixer, &mut out, rate, 1_000_000, 0);
            let previous = onset.load(Ordering::Acquire);
            let target = (previous as f64 + old_duration).ceil() as u64;
            let mut grid = metered_request(30.).grid_v2.unwrap();
            grid.version = 3;
            grid.count_in_bars = Some(2);
            grid.score_offset_pulses = 12;
            let next = lifecycle::Request::new_with_clock(
                "same",
                30.,
                grid.source_end_micros(30.) / 1000.,
                2_000. / 3.,
                None,
                None,
                None,
                Some(grid),
            )
            .unwrap();
            let arm = Arc::new(repeat::ArmControl::new(
                1,
                previous,
                target,
                Arc::new(AtomicBool::new(false)),
            ));
            let future = Box::new(Cue::future(rate, next, stop, arm.clone()));
            let new_onset = future.onset.clone();
            assert!(mailbox.publish(future).is_ok());
            // Actual submitted Mixer PCM: two bars 1,2 / 1,2 then source 1.
            // Denominator subdivision remains distinct and quieter.
            let checks = [
                (0, 1200., 0.16),
                (1, 650., 0.045),
                (3, 900., 0.12),
                (6, 1200., 0.16),
                (9, 900., 0.12),
                (12, 1200., 0.16),
            ];
            let mut checked = 0;
            let mut frame = 0;
            while checked < checks.len() {
                watched_fill(&mut mixer, &mut out, rate, target, frame);
                let (pulse, frequency, amplitude) = checks[checked];
                let pulse_seconds = pulse as f64 * 2. / 3.;
                let check_frame = ((pulse_seconds + 0.002) * rate as f64).ceil() as u64 + 24;
                if check_frame < frame + out.len() as u64 {
                    let age = check_frame as f64 / rate as f64 - pulse_seconds;
                    let expected = (amplitude
                        * (-age * 110.).exp()
                        * (age * frequency * std::f64::consts::TAU).sin())
                        as f32;
                    assert!(
                        (out[(check_frame - frame) as usize] - expected).abs() < 1e-5,
                        "rate{rate} pulse{pulse}"
                    );
                    checked += 1;
                }
                frame += out.len() as u64;
            }
            assert!(arm.activated());
            assert_eq!(new_onset.load(Ordering::Acquire), target);
            mailbox.reclaim();
        }
    }
    #[test]
    fn future_baton_changes_at_one_presented_sample_and_keeps_old_pcm_until_then() {
        for rate in [44_100, 48_000, 96_000] {
            let mailbox = Arc::new(CueMailbox::default());
            let stop = Arc::new(AtomicBool::new(false));
            let old = Box::new(Cue::new(rate, metered_request(180.), stop.clone()));
            let old_onset = old.onset.clone();
            let old_finished = old.finished.clone();
            assert!(mailbox.publish(old).is_ok());
            let mut mixer = empty_mixer(mailbox.clone());
            let reference_box = Arc::new(CueMailbox::default());
            assert!(reference_box
                .publish(Box::new(Cue::new(
                    rate,
                    metered_request(180.),
                    stop.clone()
                )))
                .is_ok());
            let mut reference = empty_mixer(reference_box);
            let base = 1_000_000;
            let mut frame = 0u64;
            let mut a = [0f32; 257];
            let mut b = [0f32; 257];
            watched_fill(&mut mixer, &mut a, rate, base, frame);
            reference.fill(&mut b, 1, base, 0, |v| v);
            assert_eq!(a, b);
            frame += 257;
            let previous = old_onset.load(Ordering::Acquire);
            let target = (previous as f64
                + metered_request(180.)
                    .grid_v2
                    .unwrap()
                    .source_end_micros(180.))
            .ceil() as u64;
            let request = metered_request(181.);
            let arm = Arc::new(repeat::ArmControl::new(
                1,
                previous,
                target,
                Arc::new(AtomicBool::new(false)),
            ));
            let next = Box::new(Cue::future(
                rate,
                request.clone(),
                stop.clone(),
                arm.clone(),
            ));
            let next_onset = next.onset.clone();
            assert!(mailbox.publish(next).is_ok());
            let expected = metronome::Metronome::new_with_clock(
                rate,
                request.bpm,
                request.duration_ms,
                request.count_step_ms,
                None,
                request.grid_v2.clone(),
            );
            let mut incoming_peak = 0f32;
            let mut first_incoming = None;
            while base + (frame * 1_000_000) / (rate as u64) < target + 50_000 {
                let time = base + (frame * 1_000_000) / rate as u64;
                watched_fill(&mut mixer, &mut a, rate, base, frame);
                reference.fill(&mut b, 1, time, 0, |v| v);
                for i in 0..a.len() {
                    let sample_time = time + (i as u64 * 1_000_000) / rate as u64;
                    if sample_time < target {
                        assert_eq!(
                            a[i],
                            b[i],
                            "old pcm at rate{rate} frame{}",
                            frame + i as u64
                        );
                    } else {
                        let (first_frame, first_time) =
                            *first_incoming.get_or_insert((frame + i as u64, sample_time));
                        let elapsed = (first_time - target) as f64 / 1_000_000.
                            + (frame + i as u64 - first_frame) as f64 / rate as f64;
                        let expected = expected.at_time(elapsed);
                        assert!(
                            (a[i] - expected).abs() < 1e-6,
                            "new pcm at rate{rate} frame{}",
                            frame + i as u64
                        );
                        incoming_peak = incoming_peak.max(a[i].abs());
                    }
                }
                frame += a.len() as u64;
                // Retirement must happen off the render callback.
                if arm.activated() {
                    assert_eq!(next_onset.load(Ordering::Acquire), target);
                }
            }
            assert!(arm.activated());
            assert!(old_finished.load(Ordering::Acquire));
            assert!(incoming_peak > 0.1);
            assert!(!mailbox.retired.load(Ordering::Acquire).is_null());
            mailbox.reclaim();
            assert!(mailbox.retired.load(Ordering::Acquire).is_null());
        }
    }
    #[test]
    fn repeated_handoffs_resolve_service_owner_before_next_arm_and_cancel() {
        struct Owner {
            onset: Arc<AtomicU64>,
            arm: Option<Arc<repeat::ArmControl>>,
            session: lifecycle::Session,
        }
        let playback = lifecycle::Playback::default();
        let (session, _) = playback.begin().unwrap();
        let mailbox = Arc::new(CueMailbox::default());
        let mut mixer = empty_mixer(mailbox.clone());
        let mut samples = [0f32; 128];
        let initial = Box::new(Cue::new(
            48_000,
            metered_request(180.),
            session.stop_signal(),
        ));
        let mut active = Some(Owner {
            onset: initial.onset.clone(),
            arm: None,
            session: session.clone(),
        });
        assert!(mailbox.publish(initial).is_ok());
        watched_fill(&mut mixer, &mut samples, 48_000, 1_000_000, 0);
        for id in 1..=4 {
            let previous = active.as_ref().unwrap().onset.load(Ordering::Acquire);
            let target = previous + 1_000_000;
            let arm = Arc::new(repeat::ArmControl::new(
                id,
                previous,
                target,
                Arc::new(AtomicBool::new(false)),
            ));
            let cue = Box::new(Cue::future(
                48_000,
                metered_request(180.),
                session.stop_signal(),
                arm.clone(),
            ));
            let mut pending = Some(Owner {
                onset: cue.onset.clone(),
                arm: Some(arm.clone()),
                session: session.clone(),
            });
            assert!(mailbox.publish(cue).is_ok());
            watched_fill(&mut mixer, &mut samples, 48_000, target - 3_000, 0);
            assert!(!arm.activated());
            watched_fill(&mut mixer, &mut samples, 48_000, target, 0);
            assert!(arm.activated());
            // Mixer committed, but the periodic worker promotion hasn't run.
            assert_eq!(
                active.as_ref().unwrap().onset.load(Ordering::Acquire),
                previous
            );
            if id == 2 {
                assert_eq!(arm.cancel(), repeat::CancelState::Activated);
            }
            assert!(repeat::promote_activated(&mut active, &mut pending, |o| o
                .arm
                .as_ref()
                .is_some_and(|a| a.activated())));
            assert_eq!(
                active.as_ref().unwrap().onset.load(Ordering::Acquire),
                target
            );
            assert!(active.as_ref().unwrap().session.is_current());
            assert!(pending.is_none());
            // The next Arm now sees the committed origin, even after targeted
            // old-arm cancellation; same-generation pending owns its own cue.
            assert!(active.as_ref().unwrap().session.same_generation(&session));
            mailbox.reclaim();
        }
    }
    #[test]
    fn queued_and_activated_cancellation_never_drops_or_reclaims_on_callback() {
        for activate_first in [false, true] {
            let mailbox = Arc::new(CueMailbox::default());
            let stop = Arc::new(AtomicBool::new(false));
            let old = Box::new(Cue::new(48_000, metered_request(180.), stop.clone()));
            let onset = old.onset.clone();
            assert!(mailbox.publish(old).is_ok());
            let mut mixer = empty_mixer(mailbox.clone());
            let mut samples = [0f32; 128];
            watched_fill(&mut mixer, &mut samples, 48_000, 1_000_000, 0);
            let previous = onset.load(Ordering::Acquire);
            let target = 2_000_000;
            let arm = Arc::new(repeat::ArmControl::new(
                7,
                previous,
                target,
                Arc::new(AtomicBool::new(false)),
            ));
            let cue = Box::new(Cue::future(
                48_000,
                metered_request(180.),
                stop,
                arm.clone(),
            ));
            assert!(mailbox.publish(cue).is_ok());
            if activate_first {
                watched_fill(&mut mixer, &mut samples, 48_000, target, 0);
            }
            assert_eq!(
                arm.cancel(),
                if activate_first {
                    repeat::CancelState::Activated
                } else {
                    repeat::CancelState::Queued
                }
            );
            watched_fill(&mut mixer, &mut samples, 48_000, target + 3_000, 0);
            assert!(samples.iter().all(|v| *v == 0.));
            assert!(!mailbox.has_pending());
            mailbox.reclaim();
        }
    }
    #[test]
    fn two_pickup_batons_render_full_cycles_from_the_predecessors_exit_beat() {
        let grid = lifecycle::PulseGridV2 {
            version: 2,
            count_in_bars: None,
            pulses_per_beat: 2,
            score_offset_pulses: 14,
            count_bar_pulses: 8,
            count_beat_pulses: 2,
            count_start_phase_pulses: 0,
            score_start_phase_pulses: 6,
            bar_start_pulses: vec![0, 2, 10, 16],
            bar_meter_pulses: vec![8; 3],
            bar_beat_pulses: vec![2; 3],
            source_excerpt: None,
            bar_phase_pulses: vec![6, 0, 0],
            beat_start_pulses: (0..16).step_by(2).collect(),
        };
        let initial = lifecycle::Request::new_with_clock(
            "same",
            120.,
            7500.,
            250.,
            None,
            None,
            None,
            Some(grid.clone()),
        )
        .unwrap();
        let mut continued = grid;
        continued.count_start_phase_pulses = 6;
        continued.score_offset_pulses = 8;
        let next = lifecycle::Request::new_with_clock(
            "same",
            120.,
            6000.,
            250.,
            None,
            None,
            None,
            Some(continued),
        )
        .unwrap();
        let mailbox = Arc::new(CueMailbox::default());
        let stop = Arc::new(AtomicBool::new(false));
        let cue = Box::new(Cue::new(48_000, initial, stop.clone()));
        let onset = cue.onset.clone();
        assert!(mailbox.publish(cue).is_ok());
        let mut mixer = empty_mixer(mailbox.clone());
        let mut samples = [0f32; 128];
        watched_fill(&mut mixer, &mut samples, 48_000, 1_000_000, 0);
        let mut previous = onset.load(Ordering::Acquire);
        let mut duration = 7_500_000;
        for id in 1..=2 {
            let target = previous + duration;
            let arm = Arc::new(repeat::ArmControl::new(
                id,
                previous,
                target,
                Arc::new(AtomicBool::new(false)),
            ));
            let next = Box::new(Cue::future(48_000, next.clone(), stop.clone(), arm.clone()));
            let origin = next.onset.clone();
            assert!(mailbox.publish(next).is_ok());
            // Check submitted PCM at the count's beats4,1,2,3, then pickup4.
            // Render every frame through both counts and the pickup, rather
            // than moving the callback clock past unrendered PCM.
            let checks = [(0, 900.), (2, 1200.), (4, 900.), (6, 900.), (8, 900.)];
            let mut checked = 0;
            let mut frame = 0;
            let end_frame = duration * 48_000 / 1_000_000;
            while frame < end_frame {
                let count = (end_frame - frame).min(samples.len() as u64) as usize;
                watched_fill(&mut mixer, &mut samples[..count], 48_000, target, frame);
                if let Some(&(pulse, hz)) = checks.get(checked) {
                    let check_frame = pulse * 12_000 + 24;
                    if check_frame < frame + count as u64 {
                        let age = 24_f64 / 48_000.;
                        let expected = (0.16_f64
                            * (-age * 110.).exp()
                            * (age * hz * std::f64::consts::TAU).sin())
                            as f32;
                        assert!(
                            (samples[(check_frame - frame) as usize] - expected).abs() < 1e-5,
                            "repeat{id} pulse{pulse}"
                        );
                        checked += 1;
                    }
                }
                frame += count as u64;
            }
            assert_eq!(checked, checks.len());
            assert!(arm.activated());
            assert_eq!(origin.load(Ordering::Acquire), target);
            mailbox.reclaim();
            previous = target;
            duration = 6_000_000;
        }
    }
    #[test]
    fn missed_boundary_or_wrong_owner_retires_pending_without_truncating_a_count() {
        for wrong_owner in [false, true] {
            let mailbox = Arc::new(CueMailbox::default());
            let stop = Arc::new(AtomicBool::new(false));
            let old = Box::new(Cue::new(48_000, metered_request(180.), stop.clone()));
            let old_onset = old.onset.clone();
            assert!(mailbox.publish(old).is_ok());
            let mut mixer = empty_mixer(mailbox.clone());
            let mut samples = [0f32; 128];
            watched_fill(&mut mixer, &mut samples, 48_000, 1_000_000, 0);
            let previous = old_onset.load(Ordering::Acquire);
            let target = 2_000_000;
            let arm = Arc::new(repeat::ArmControl::new(
                1,
                previous + u64::from(wrong_owner),
                target,
                Arc::new(AtomicBool::new(false)),
            ));
            let next = Box::new(Cue::future(
                48_000,
                metered_request(181.),
                stop,
                arm.clone(),
            ));
            let onset = next.onset.clone();
            let invalid = next.invalid.clone();
            assert!(mailbox.publish(next).is_ok());
            watched_fill(
                &mut mixer,
                &mut samples,
                48_000,
                target + if wrong_owner { 0 } else { 1000 },
                0,
            );
            assert!(invalid.load(Ordering::Acquire));
            assert_eq!(onset.load(Ordering::Acquire), 0);
            assert!(!arm.activated());
            assert!(!mailbox.has_pending());
            assert_eq!(
                unsafe { (*mixer.cue).onset.load(Ordering::Acquire) },
                previous
            );
            assert!(!mailbox.retired.load(Ordering::Acquire).is_null());
            mailbox.reclaim();
        }
    }
    #[test]
    fn actual_block_high_water_is_retained_until_output_close_and_reset() {
        let mailbox = Arc::new(CueMailbox::default());
        let cue = Box::new(Cue::new(
            48_000,
            metered_request(180.),
            Arc::new(AtomicBool::new(false)),
        ));
        assert!(mailbox.publish(cue).is_ok());
        let mut mixer = empty_mixer(mailbox.clone());
        let mut large = [0f32; 2048];
        watched_fill(&mut mixer, &mut large, 48_000, 1_000_000, 0);
        assert_eq!(mailbox.block_micros.load(Ordering::Acquire), 42_667);
        let mut small = [0f32; 128];
        watched_fill(&mut mixer, &mut small, 48_000, 1_100_000, 0);
        assert_eq!(mailbox.block_micros.load(Ordering::Acquire), 42_667);
        assert_eq!(
            mailbox.submitted_end_micros.load(Ordering::Acquire),
            1_102_667
        );
        drop(mixer);
        mailbox.reset();
        assert_eq!(mailbox.block_micros.load(Ordering::Acquire), 0);
        assert_eq!(mailbox.submitted_end_micros.load(Ordering::Acquire), 0);
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
    fn a_live_strike_on_a_key_the_preview_holds_is_heard() {
        let mut c = Contacts::default();
        let mut s = Fake::default();
        let preview = schedule::CHANNEL;
        c.apply(event(1, preview, 60, 70), &mut s);
        c.apply(event(1, 1, 60, 100), &mut s);
        assert_eq!(s.events, vec![(1, 60, 70), (1, 60, 100)], "your attack sounds");
        c.apply(event(2, preview, 60, 0), &mut s);
        assert_eq!(s.events.len(), 2, "the preview lifting does not silence your key");
        c.apply(event(1, preview, 60, 70), &mut s);
        assert_eq!(s.events.len(), 2, "the preview never strikes over your key");
        c.apply(event(2, 1, 60, 0), &mut s);
        assert_eq!(s.events.len(), 2, "the preview still holds it");
        c.apply(event(2, preview, 60, 0), &mut s);
        assert_eq!(s.events.last(), Some(&(2, 60, 0)));
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
    fn volume_curves_keep_the_default_and_never_lower_a_saved_setting() {
        assert_eq!(piano_gain(VOLUME_DEFAULT), PIANO_GAIN);
        assert!((piano_gain(1.0) / PIANO_GAIN - 2.0).abs() < 1e-6);
        assert_eq!(cue_gain(VOLUME_DEFAULT), 1.0);
        assert!((cue_gain(1.0) - 2.0).abs() < 1e-6);
        assert_eq!((piano_gain(0.0), cue_gain(0.0)), (0.0, 0.0));
        let mut previous = (0.0, 0.0);
        for step in 1..=100 {
            let v = step as f64 / 100.0;
            let (piano, cue) = (piano_gain(v), cue_gain(v));
            // The earlier gain was the setting itself; none is quieter now.
            assert!(piano >= v, "{v}");
            assert!(piano > previous.0 && cue > previous.1, "{v}");
            previous = (piano, cue);
        }
        // The track's lower half still spans a useful range, not silence.
        let db = |g: f64| 20.0 * g.log10();
        assert!((db(cue_gain(0.35)) + 11.7).abs() < 0.1);
        assert!(db(cue_gain(0.1)) < -30.0);
    }
    #[test]
    fn limiter_is_transparent_below_the_ceiling_and_never_lets_a_peak_through() {
        let rate = 48000;
        let mut limiter = Limiter::new(rate);
        for i in 0..rate {
            let v = 0.85 * (i as f32 * 0.05).sin();
            assert_eq!(limiter.gain(v.abs()), 1.0);
        }
        assert_eq!(limiter.limited_frames, 0);
        // A loud attack is lowered at its first frame: no delay, no overshoot.
        let mut first = None;
        for i in 0..rate / 10 {
            let v = 3.0 * (i as f32 * 0.05).sin();
            let out = v * limiter.gain(v.abs());
            assert!(out.abs() <= Limiter::CEILING + 1e-6, "{i} {out}");
            if first.is_none() && v.abs() > Limiter::CEILING {
                first = Some(i);
                assert!((out.abs() - Limiter::CEILING).abs() < 1e-6);
            }
        }
        assert!(first.is_some() && limiter.deepest < 0.3);
        // Held through the hold time, then back to unity within a second.
        let held = limiter.gain(0.1);
        assert!(held < 0.3);
        let mut back = None;
        for i in 0..rate {
            if limiter.gain(0.1) == 1.0 {
                back = Some(i);
                break;
            }
        }
        let back = back.expect("returns to unity") as f32 / rate as f32;
        assert!(back > 0.03 && back < 0.6, "{back}");
        // A non-finite sample cannot silence the limiter for good.
        limiter.gain(f32::INFINITY);
        limiter.gain(f32::NAN);
        assert_eq!(Limiter::new(rate).gain(0.5), 1.0);
        let mut limiter = Limiter::new(rate);
        limiter.gain(f32::INFINITY);
        assert_eq!(limiter.gain(0.5), 1.0);
    }
    #[test]
    fn loud_piano_is_limited_and_cues_follow_their_own_volume() {
        let mailbox = Arc::new(CueMailbox::default());
        let volumes = Arc::new(Volumes::with_gains(5.0, 1.0));
        let mut m = Mixer::new(
            Some(Box::new(Fake::default())),
            Arc::new(MidiBus::default()),
            mailbox.clone(),
            volumes.clone(),
        )
        .at_rate(48000);
        let mut out = vec![0.0; MAX_BLOCK * 2];
        m.fill(&mut out, 2, 1_000_000, 0, |v| v);
        // 0.2 and 0.3 at gain 5 are 1.0 and 1.5: both lowered by one gain.
        for f in out.chunks_exact(2) {
            assert!((f[1] - Limiter::CEILING).abs() < 1e-6);
            assert!((f[0] / f[1] - 2.0 / 3.0).abs() < 1e-5);
        }
        assert_eq!(m.limited.load(Ordering::Relaxed), MAX_BLOCK as u64);
        let (_, deepest) = limiter_status(&m.limited, &m.deepest_bits);
        assert!((deepest - Limiter::CEILING as f64 / 1.5).abs() < 1e-6);

        let click = |setting: f64| {
            let mailbox = Arc::new(CueMailbox::default());
            let volumes = Arc::new(Volumes::with_gains(1.0, 1.0));
            volumes.set_cue(setting);
            let mut m = empty_mixer(mailbox.clone());
            m.volume = volumes;
            let cue = Box::new(Cue::new(
                48000,
                lifecycle::Request::new("", 180.0, 1000.0, 0.0).unwrap(),
                Arc::new(AtomicBool::new(false)),
            ));
            assert!(mailbox.publish(cue).is_ok());
            let mut peak = 0f32;
            let mut out = vec![0.0; 256];
            for block in 0..400u64 {
                m.fill(&mut out, 1, 1_000_000 + block * 5333, 0, |v| v);
                peak = out.iter().fold(peak, |p, v| p.max(v.abs()));
            }
            peak
        };
        let (default, full, off) = (click(0.7), click(1.0), click(0.0));
        assert!(default > 0.1 && default <= 0.16, "{default}");
        assert!((full / default - 2.0).abs() < 0.01, "{full} {default}");
        assert_eq!(off, 0.0);
    }
    #[test]
    fn mix_chunks_and_unused_channels_no_panic() {
        let mut m = Mixer::new(
            Some(Box::new(Fake::default())),
            Arc::new(MidiBus::default()),
            Arc::new(CueMailbox::default()),
            Arc::new(Volumes::with_gains(0.5, 1.0)),
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
            Arc::new(Volumes::with_gains(0.5, 1.0)),
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
            Arc::new(Volumes::with_gains(1.0, 1.0)),
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
    fn scheduled_stream_reaches_sampler_offsets_without_allocation_and_spares_live_contacts() {
        use schedule::{Event, Submitter, CLICK, NOTE_OFF, NOTE_ON};
        type Log = Arc<std::sync::Mutex<Vec<(u8, u8, u32)>>>;
        struct Recorder(Log);
        impl Synth for Recorder {
            fn note_on(&mut self, o: u32, n: u8, _: u8) {
                self.0.lock().unwrap().push((1, n, o));
            }
            fn note_off(&mut self, o: u32, n: u8, _: u8) {
                self.0.lock().unwrap().push((2, n, o));
            }
            fn cc(&mut self, o: u32, c: u8, _: u8) {
                self.0.lock().unwrap().push((3, c, o));
            }
            fn all_off(&mut self) {
                self.0.lock().unwrap().push((4, 0, 0));
            }
            fn render(&mut self, l: &mut [f32], r: &mut [f32]) -> bool {
                l.fill(0.);
                r.fill(0.);
                true
            }
        }
        let log: Log = Arc::new(std::sync::Mutex::new(Vec::with_capacity(256)));
        let bus = Arc::new(MidiBus::default());
        bus.enable(true);
        bus.connect(1);
        let mut mixer = Mixer::new(
            Some(Box::new(Recorder(log.clone()))),
            bus.clone(),
            Arc::new(CueMailbox::default()),
            Arc::new(Volumes::with_gains(1.0, 1.0)),
        )
        .at_rate(48000);
        let mut out = vec![0f32; 1024 * 2];
        let mut now = 10_000_000u64;
        let step = 1024 * 1_000_000 / 48000;
        mixer.fill(&mut out, 2, now, 0, |v| v);
        now += step;
        // The player holds middle C on the keyboard throughout.
        bus.send(1, 1, 1, 60, 100);
        let mut sub = Submitter::default();
        let first = now + bus.schedule.lead(now).unwrap() + 2_000;
        let events = [
            Event { at: first, kind: CLICK, key: 0, value: 1 },
            Event { at: first + 7_000, kind: NOTE_ON, key: 64, value: 90 },
            Event { at: first + 7_000, kind: NOTE_ON, key: 60, value: 90 },
            Event { at: first + 30_000, kind: NOTE_OFF, key: 64, value: 0 },
        ];
        bus.schedule.replace(&mut sub, now, None, &events).unwrap();
        let mut peak = 0f32;
        let mut starts = vec![];
        for _ in 0..4 {
            starts.push(now);
            WATCH.with(|w| w.set(Some((0, 0))));
            mixer.fill(&mut out, 2, now, 0, |v| v);
            let counts = WATCH.with(|w| {
                let v = w.get().unwrap();
                w.set(None);
                v
            });
            assert_eq!(counts, (0, 0));
            peak = out.iter().fold(peak, |m, v| m.max(v.abs()));
            now += step;
        }
        assert!(peak > 0.1, "the count-in click sounds through the mixer");
        let heard = log.lock().unwrap().clone();
        // Live C first; the scheduled C joins the held key without a second
        // attack; E sounds and lifts at its sample offsets.
        let quantum_offset = |at: u64| {
            let base = starts.iter().rev().find(|s| **s <= at).unwrap();
            let frame = (at - base) * 48000 / 1_000_000;
            (frame % 256) as u32
        };
        assert_eq!(
            heard.iter().filter(|e| e.0 == 1 || e.0 == 2).cloned().collect::<Vec<_>>(),
            [
                (1, 60, 0),
                (1, 64, quantum_offset(first + 7_000)),
                (2, 64, quantum_offset(first + 30_000)),
            ]
        );
        log.lock().unwrap().clear();
        // Stopping the preview releases only its own contacts.
        bus.schedule.replace(&mut sub, now, None, &[]).unwrap();
        mixer.fill(&mut out, 2, now, 0, |v| v);
        assert!(log.lock().unwrap().iter().all(|e| e.0 == 3), "live C keeps sounding");
        bus.send(1, 2, 1, 60, 0);
        mixer.fill(&mut out, 2, now + step, 0, |v| v);
        assert_eq!(log.lock().unwrap().last(), Some(&(2, 60, 0)));
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
            Arc::new(Volumes::with_gains(0.5, 1.0)),
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
