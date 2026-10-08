//! One exclusively owned, pinned sfizz piano. Creation/loading and destruction
//! belong to the control worker; only events and rendering belong to the audio
//! callback. MIDI channels and final gain/mixing are owned by the audio host.
use std::{
    cell::Cell,
    ffi::{c_char, c_float, c_int, c_uint, CString},
    marker::PhantomData,
    path::Path,
    ptr::NonNull,
};

pub const ENGINE_SOURCE_REVISION: &str = "f3ac7c0ae830104ae3bc8979dc2ed9fff939a926";
pub const VOICES: u32 = 256;
pub const PRELOAD_SOURCE_FRAMES: u32 = 8192;
pub const LIVE_QUALITY: i32 = 2;

#[repr(C)]
struct Synth {
    _opaque: [u8; 0],
}
extern "C" {
    fn sfizz_create_synth() -> *mut Synth;
    fn sfizz_free(synth: *mut Synth);
    fn sfizz_set_sample_rate(synth: *mut Synth, rate: c_float);
    fn sfizz_set_samples_per_block(synth: *mut Synth, frames: c_int);
    fn sfizz_set_num_voices(synth: *mut Synth, voices: c_int);
    fn sfizz_set_preload_size(synth: *mut Synth, frames: c_uint);
    fn sfizz_set_sample_quality(synth: *mut Synth, mode: c_int, quality: c_int);
    fn sfizz_set_sustain_cancels_release(synth: *mut Synth, enabled: bool);
    fn sfizz_load_file(synth: *mut Synth, path: *const c_char) -> bool;
    fn sfizz_disable_freewheeling(synth: *mut Synth);
    fn sfizz_send_note_on(synth: *mut Synth, delay: c_int, note: c_int, velocity: c_int);
    fn sfizz_send_note_off(synth: *mut Synth, delay: c_int, note: c_int, velocity: c_int);
    fn sfizz_send_cc(synth: *mut Synth, delay: c_int, cc: c_int, value: c_int);
    fn sfizz_all_sound_off(synth: *mut Synth);
    fn sfizz_render_block(
        synth: *mut Synth,
        channels: *mut *mut c_float,
        count: c_int,
        frames: c_int,
    );
    #[cfg(test)]
    fn sfizz_get_num_active_voices(synth: *mut Synth) -> c_int;
}

pub struct PianoEngine {
    synth: NonNull<Synth>,
    capacity: usize,
    pending_offset: Option<usize>,
    // A moved engine remains exclusive: shared concurrent calls are forbidden.
    _not_sync: PhantomData<Cell<()>>,
}
// SAFETY: sfizz's owner may move between threads while no call is in progress.
// Every event/render method requires &mut self. Internal loader workers are
// managed by sfizz; the host stops its callback before transfer or destruction.
unsafe impl Send for PianoEngine {}

impl PianoEngine {
    /// Load on a control worker, never inside an audio callback. Actual output
    /// rate comes from the device; source WAV rates are preserved by sfizz.
    pub fn new(sfz: &Path, rate: u32, max_block: usize) -> Result<Self, String> {
        if !(8000..=192000).contains(&rate) || max_block == 0 || max_block > 8192 {
            return Err("Unsupported piano sample rate or buffer capacity".into());
        }
        if !sfz.is_file() {
            return Err("The installed piano instrument is unavailable".into());
        }
        let text = sfz
            .to_str()
            .ok_or("The piano instrument path is not Unicode")?;
        let path = CString::new(text).map_err(|_| "Invalid piano instrument path")?;
        let synth = NonNull::new(unsafe { sfizz_create_synth() })
            .ok_or("Could not create the piano engine")?;
        let engine = Self {
            synth,
            capacity: max_block,
            pending_offset: Some(0),
            _not_sync: PhantomData,
        };
        // C API SFIZZ_PROCESS_LIVE is the first enum value (0).
        unsafe {
            sfizz_set_sample_rate(synth.as_ptr(), rate as c_float);
            sfizz_set_samples_per_block(synth.as_ptr(), max_block as c_int);
            sfizz_set_num_voices(synth.as_ptr(), VOICES as c_int);
            sfizz_set_preload_size(synth.as_ptr(), PRELOAD_SOURCE_FRAMES);
            sfizz_set_sample_quality(synth.as_ptr(), 0, LIVE_QUALITY);
            sfizz_set_sustain_cancels_release(synth.as_ptr(), true);
            if !sfizz_load_file(synth.as_ptr(), path.as_ptr()) {
                return Err("Could not load the installed piano instrument".into());
            }
            sfizz_disable_freewheeling(synth.as_ptr());
            for cc in 20..=22 {
                sfizz_send_cc(synth.as_ptr(), 0, cc, 64);
            }
            sfizz_send_cc(synth.as_ptr(), 0, 23, 127);
            sfizz_send_cc(synth.as_ptr(), 0, 64, 0);
        }
        Ok(engine)
    }
    pub fn capacity(&self) -> usize {
        self.capacity
    }
    fn accept_offset(&mut self, offset: u32) -> bool {
        let offset = offset as usize;
        if offset >= self.capacity
            || self
                .pending_offset
                .is_some_and(|previous| offset < previous)
        {
            return false;
        }
        self.pending_offset = Some(offset);
        true
    }
    /// Delay is relative to the next render call, and must be inside that call's
    /// actual frame count. Rendering also checks every accepted event's bound.
    pub fn note_on(&mut self, offset: u32, note: u8, velocity: u8) -> bool {
        if note > 127 || velocity > 127 {
            return false;
        }
        if velocity == 0 {
            return self.note_off(offset, note, 0);
        }
        if !self.accept_offset(offset) {
            return false;
        }
        unsafe {
            sfizz_send_note_on(
                self.synth.as_ptr(),
                offset as c_int,
                note as c_int,
                velocity as c_int,
            );
        }
        true
    }
    pub fn note_off(&mut self, offset: u32, note: u8, velocity: u8) -> bool {
        if note > 127 || velocity > 127 || !self.accept_offset(offset) {
            return false;
        }
        unsafe {
            sfizz_send_note_off(
                self.synth.as_ptr(),
                offset as c_int,
                note as c_int,
                velocity as c_int,
            );
        }
        true
    }
    pub fn cc(&mut self, offset: u32, controller: u8, value: u8) -> bool {
        if controller > 127 || value > 127 || !self.accept_offset(offset) {
            return false;
        }
        unsafe {
            sfizz_send_cc(
                self.synth.as_ptr(),
                offset as c_int,
                controller as c_int,
                value as c_int,
            );
        }
        true
    }
    pub fn all_off(&mut self) {
        unsafe {
            sfizz_send_cc(
                self.synth.as_ptr(),
                self.pending_offset.unwrap_or(0) as c_int,
                64,
                0,
            );
            // CC64 may itself trigger authored pedal-noise voices. Clear after
            // changing the controller so panic/disable remains immediate silence.
            sfizz_all_sound_off(self.synth.as_ptr());
        }
        self.pending_offset = Some(self.pending_offset.unwrap_or(0));
    }
    /// No Rust allocation, lock, file access or panic occurs on the valid path.
    /// Invalid shapes/event bounds are silenced without entering C++ rendering.
    /// Pending events remain until a sufficiently large block or worker teardown.
    pub fn render_stereo(&mut self, left: &mut [f32], right: &mut [f32]) -> bool {
        if left.len() != right.len()
            || left.is_empty()
            || left.len() > self.capacity
            || self
                .pending_offset
                .is_some_and(|offset| offset >= left.len())
        {
            left.fill(0.0);
            right.fill(0.0);
            return false;
        }
        let mut channels = [left.as_mut_ptr(), right.as_mut_ptr()];
        unsafe {
            sfizz_render_block(
                self.synth.as_ptr(),
                channels.as_mut_ptr(),
                2,
                left.len() as c_int,
            );
        }
        self.pending_offset = None;
        true
    }
}
impl Drop for PianoEngine {
    // Can wait for streaming workers and free full caches. Never drop on RT.
    fn drop(&mut self) {
        unsafe {
            sfizz_free(self.synth.as_ptr());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        fs,
        sync::atomic::{AtomicUsize, Ordering},
    };
    // Match the production control worker's serialized create/drop lifecycle.
    fn serial_lifecycle() -> std::sync::MutexGuard<'static, ()> {
        static OWNER: std::sync::Mutex<()> = std::sync::Mutex::new(());
        OWNER.lock().unwrap()
    }
    struct Fixture(std::path::PathBuf);
    impl Fixture {
        fn new() -> Self {
            static NEXT: AtomicUsize = AtomicUsize::new(0);
            let dir = std::env::temp_dir().join(format!(
                "score viewer piano 音-{}-{}",
                std::process::id(),
                NEXT.fetch_add(1, Ordering::Relaxed)
            ));
            fs::create_dir(&dir).unwrap();
            // A real small 16-bit WAV exercises the selected built-in decoder.
            let frames = 48000u32;
            let mut wav = Vec::new();
            wav.extend_from_slice(b"RIFF");
            wav.extend_from_slice(&(36 + frames * 2).to_le_bytes());
            wav.extend_from_slice(b"WAVEfmt ");
            wav.extend_from_slice(&16u32.to_le_bytes());
            wav.extend_from_slice(&1u16.to_le_bytes());
            wav.extend_from_slice(&1u16.to_le_bytes());
            wav.extend_from_slice(&48000u32.to_le_bytes());
            wav.extend_from_slice(&96000u32.to_le_bytes());
            wav.extend_from_slice(&2u16.to_le_bytes());
            wav.extend_from_slice(&16u16.to_le_bytes());
            wav.extend_from_slice(b"data");
            wav.extend_from_slice(&(frames * 2).to_le_bytes());
            for frame in 0..frames {
                let v = (12000.0 * (frame as f32 * 440.0 * std::f32::consts::TAU / 48000.0).sin())
                    as i16;
                wav.extend_from_slice(&v.to_le_bytes());
            }
            fs::write(dir.join("note.wav"), wav).unwrap();
            fs::write(
                dir.join("test.sfz"),
                "<region> sample=note.wav key=60 ampeg_attack=0 ampeg_release=0.01",
            )
            .unwrap();
            Self(dir)
        }
    }
    impl Drop for Fixture {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }
    #[test]
    fn actual_decoder_offset_render_and_all_off() {
        let _owner = serial_lifecycle();
        let fixture = Fixture::new();
        let mut engine = PianoEngine::new(&fixture.0.join("test.sfz"), 44100, 128).unwrap();
        let mut left = [0.0; 128];
        let mut right = [0.0; 128];
        assert!(engine.note_on(64, 60, 100));
        assert!(engine.render_stereo(&mut left, &mut right));
        assert!(left[..64].iter().all(|v| v.abs() < 1e-8));
        assert!(left[64..].iter().any(|v| v.abs() > 1e-4));
        assert!(left.iter().chain(right.iter()).all(|v| v.is_finite()));
        assert!(unsafe { sfizz_get_num_active_voices(engine.synth.as_ptr()) } > 0);
        engine.all_off();
        assert!(engine.render_stereo(&mut left, &mut right));
        assert!(left.iter().chain(right.iter()).all(|v| v.abs() < 1e-8));
    }
    #[test]
    fn sustain_repedal_zero_velocity_and_teardown_on_worker() {
        let _owner = serial_lifecycle();
        let fixture = Fixture::new();
        let path = fixture.0.join("test.sfz");
        for _ in 0..2 {
            let mut engine = PianoEngine::new(&path, 48000, 128).unwrap();
            std::thread::spawn(move || {
                let mut l = [0.0; 128];
                let mut r = [0.0; 128];
                engine.cc(0, 64, 127);
                engine.note_on(0, 60, 100);
                engine.render_stereo(&mut l, &mut r);
                engine.note_on(0, 60, 0);
                engine.render_stereo(&mut l, &mut r);
                for _ in 0..8 {
                    engine.render_stereo(&mut l, &mut r);
                }
                assert!(unsafe { sfizz_get_num_active_voices(engine.synth.as_ptr()) } > 0);
                engine.cc(0, 64, 0);
                engine.render_stereo(&mut l, &mut r);
                engine.cc(0, 64, 127);
                engine.render_stereo(&mut l, &mut r);
                assert!(unsafe { sfizz_get_num_active_voices(engine.synth.as_ptr()) } > 0);
                engine.cc(0, 64, 0);
                // Include the pinned engine's 50ms transition after its
                // exponential release, rather than asserting an exact cutoff.
                for _ in 0..200 {
                    engine.render_stereo(&mut l, &mut r);
                }
                assert_eq!(
                    unsafe { sfizz_get_num_active_voices(engine.synth.as_ptr()) },
                    0
                );
            })
            .join()
            .unwrap();
        }
    }
    #[test]
    fn rejects_bad_capacity_events_and_shapes_without_ffi_render() {
        let _owner = serial_lifecycle();
        let fixture = Fixture::new();
        let path = fixture.0.join("test.sfz");
        assert!(PianoEngine::new(&path, 0, 128).is_err());
        assert!(PianoEngine::new(&path, 44100, 0).is_err());
        assert!(PianoEngine::new(&fixture.0.join("missing.sfz"), 44100, 128).is_err());
        let mut engine = PianoEngine::new(&path, 44100, 128).unwrap();
        assert_eq!(engine.capacity(), 128);
        assert!(!engine.note_on(128, 60, 100));
        assert!(!engine.cc(0, 255, 0));
        let mut l = [1.0; 129];
        let mut r = [1.0; 129];
        assert!(!engine.render_stereo(&mut l, &mut r));
        assert!(l.iter().chain(r.iter()).all(|v| *v == 0.0));
        let mut l = [1.0; 64];
        let mut r = [1.0; 63];
        assert!(!engine.render_stereo(&mut l, &mut r));
        assert!(l.iter().chain(r.iter()).all(|v| *v == 0.0));
        assert!(engine.note_on(120, 60, 100));
        assert!(!engine.cc(119, 64, 127));
        let mut l = [1.0; 64];
        let mut r = [1.0; 64];
        assert!(!engine.render_stereo(&mut l, &mut r));
        assert!(l.iter().chain(r.iter()).all(|v| *v == 0.0));
        let mut l = [0.0; 128];
        let mut r = [0.0; 128];
        assert!(engine.render_stereo(&mut l, &mut r));
        assert!(l[..120].iter().all(|v| v.abs() < 1e-8));
        assert!(l[120..].iter().any(|v| v.abs() > 1e-4));
    }
    #[test]
    fn panic_clears_authored_pedal_noise_and_releases_sustain() {
        let _owner = serial_lifecycle();
        let fixture = Fixture::new();
        fs::write(fixture.0.join("test.sfz"), "<region> sample=note.wav key=60 ampeg_release=0.01\n<region> sample=note.wav on_locc64=0 on_hicc64=0").unwrap();
        let mut engine = PianoEngine::new(&fixture.0.join("test.sfz"), 48000, 128).unwrap();
        let mut l = [0.0; 128];
        let mut r = [0.0; 128];
        engine.cc(0, 64, 127);
        engine.note_on(0, 60, 100);
        engine.render_stereo(&mut l, &mut r);
        engine.all_off();
        engine.render_stereo(&mut l, &mut r);
        assert!(l.iter().chain(r.iter()).all(|v| v.abs() < 1e-8));
        assert_eq!(
            unsafe { sfizz_get_num_active_voices(engine.synth.as_ptr()) },
            0
        );
        engine.note_on(0, 60, 100);
        engine.render_stereo(&mut l, &mut r);
        engine.note_off(0, 60, 0);
        for _ in 0..200 {
            engine.render_stereo(&mut l, &mut r);
        }
        assert_eq!(
            unsafe { sfizz_get_num_active_voices(engine.synth.as_ptr()) },
            0
        );
    }
}
