//! Opt-in playability probe for a Mac with a loopback output (BlackHole on CI).
//! It plays through the real CoreAudio host and records the same device's
//! input, so it measures key-to-sound delay and loudness up to the device.
//! It cannot hear speakers or count the delay of a real interface or the room.
use super::{hal, lifecycle, mixer, platform, Config};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::{
    path::{Path, PathBuf},
    sync::{atomic::AtomicBool, Arc, Mutex},
    time::Instant,
};

extern "C" {
    fn clock_gettime_nsec_np(clock: u32) -> u64;
}
// CLOCK_UPTIME_RAW: the clock CoreAudio host time is counted in.
fn now_ns() -> u64 {
    unsafe { clock_gettime_nsec_np(8) }
}

#[derive(Default)]
struct Recording {
    samples: Vec<f32>,
    right: Vec<f32>,
    // (host ns of the first frame, index of that frame)
    blocks: Vec<(u64, usize)>,
}
impl Recording {
    fn index_at(&self, ns: u64, rate: f64) -> usize {
        if self.blocks.is_empty() {
            return 0;
        }
        let at = self.blocks.partition_point(|(t, _)| *t <= ns);
        let (t, first) = self.blocks[at.saturating_sub(1)];
        let ahead = ns.saturating_sub(t) as f64 * rate / 1e9;
        (first + ahead as usize).min(self.samples.len())
    }
    fn time_of(&self, index: usize, rate: f64) -> u64 {
        let at = self.blocks.partition_point(|(_, f)| *f <= index);
        let (t, first) = self.blocks[at.saturating_sub(1)];
        t + ((index - first) as f64 * 1e9 / rate) as u64
    }
}

struct Input {
    stream: cpal::Stream,
    recording: Arc<Mutex<Recording>>,
    rate: f64,
}
fn input(name: &str) -> Result<Input, String> {
    let host = cpal::default_host();
    let device = host
        .input_devices()
        .map_err(|e| e.to_string())?
        .find(|d| d.name().ok().as_deref() == Some(name))
        .ok_or("the loopback device has no input side")?;
    let supported = device.default_input_config().map_err(|e| e.to_string())?;
    if supported.sample_format() != cpal::SampleFormat::F32 {
        return Err(format!("input format {:?}", supported.sample_format()));
    }
    let config = supported.config();
    let channels = config.channels as usize;
    let rate = config.sample_rate.0 as f64;
    let recording = Arc::new(Mutex::new(Recording {
        samples: Vec::with_capacity(rate as usize * 40),
        right: Vec::with_capacity(rate as usize * 40),
        blocks: Vec::with_capacity(20_000),
    }));
    let sink = recording.clone();
    let origin = cpal::StreamInstant::new(0, 0);
    let stream = device
        .build_input_stream(
            &config,
            move |data: &[f32], info: &cpal::InputCallbackInfo| {
                let at = info
                    .timestamp()
                    .callback
                    .duration_since(&origin)
                    .map_or(0, |d| d.as_nanos() as u64);
                let mut r = sink.lock().unwrap();
                let first = r.samples.len();
                r.blocks.push((at, first));
                r.samples.extend(data.chunks(channels).map(|f| f[0]));
                r.right
                    .extend(data.chunks(channels).map(|f| f[1.min(channels - 1)]));
            },
            |e| eprintln!("loopback input error: {e}"),
            None,
        )
        .map_err(|e| e.to_string())?;
    stream.play().map_err(|e| e.to_string())?;
    Ok(Input {
        stream,
        recording,
        rate,
    })
}

fn fixture(directory: &Path) -> PathBuf {
    // A sine that starts at full level on its first sample: the onset is exact.
    let frames = 48000u32;
    let mut wav = Vec::with_capacity(44 + frames as usize * 2);
    wav.extend_from_slice(b"RIFF");
    wav.extend_from_slice(&(36 + frames * 2).to_le_bytes());
    wav.extend_from_slice(b"WAVEfmt ");
    wav.extend_from_slice(&16u32.to_le_bytes());
    for v in [1u16, 1] {
        wav.extend_from_slice(&v.to_le_bytes());
    }
    for v in [48000u32, 96000] {
        wav.extend_from_slice(&v.to_le_bytes());
    }
    for v in [2u16, 16] {
        wav.extend_from_slice(&v.to_le_bytes());
    }
    wav.extend_from_slice(b"data");
    wav.extend_from_slice(&(frames * 2).to_le_bytes());
    for i in 0..frames {
        let v = (8000.0 * (i as f32 * 440.0 * std::f32::consts::TAU / 48000.0).sin()) as i16;
        wav.extend_from_slice(&v.to_le_bytes());
    }
    std::fs::write(directory.join("onset.wav"), wav).unwrap();
    let sfz = directory.join("onset.sfz");
    std::fs::write(
        &sfz,
        "<region> sample=onset.wav key=60 loop_mode=loop_continuous ampeg_release=0.005",
    )
    .unwrap();
    sfz
}

fn run(host: &mut platform::Host, seconds: f64) {
    let begin = Instant::now();
    while begin.elapsed().as_secs_f64() < seconds {
        host.pump().unwrap();
    }
}
fn ms(frames: f64, rate: f64) -> f64 {
    (frames * 1000.0 / rate * 100.0).round() / 100.0
}
fn summary(mut values: Vec<f64>) -> serde_json::Value {
    if values.is_empty() {
        return serde_json::Value::Null;
    }
    values.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let at = |q: f64| values[((values.len() - 1) as f64 * q).round() as usize];
    serde_json::json!({"count":values.len(),"min":at(0.0),"median":at(0.5),"p95":at(0.95),"max":at(1.0)})
}
fn dbfs(v: f32) -> f64 {
    if v <= 0.0 {
        return -200.0;
    }
    ((20.0 * (v as f64).log10()) * 10.0).round() / 10.0
}

struct Probe {
    id: String,
    name: String,
    bus: Arc<mixer::MidiBus>,
    mailbox: Arc<mixer::CueMailbox>,
}
impl Probe {
    fn open(
        &self,
        sfz: &Path,
        tier: u8,
        volumes: Arc<mixer::Volumes>,
    ) -> Result<platform::Host, String> {
        let config = Config {
            enabled: true,
            sfz: Some(sfz.to_path_buf()),
            device: self.id.clone(),
            tier,
        };
        platform::Host::open(&config, self.bus.clone(), self.mailbox.clone(), volumes)
    }
    /// Note-on to first sound at the loopback input.
    fn delay(&self, sfz: &Path, tier: u8) -> serde_json::Value {
        let volumes = Arc::new(mixer::Volumes::new(0.7, 0.7));
        let mut host = match self.open(sfz, tier, volumes) {
            Ok(host) => host,
            Err(e) => return serde_json::json!({"tier":tier,"error":e}),
        };
        let listen = match input(&self.name) {
            Ok(listen) => listen,
            Err(e) => return serde_json::json!({"tier":tier,"error":e}),
        };
        run(&mut host, 0.4);
        let mut sent = Vec::new();
        for k in 0..16u32 {
            let at = now_ns();
            self.bus.send(100, 1, 1, 60, 100);
            sent.push(at);
            run(&mut host, 0.12);
            self.bus.send(100, 2, 1, 60, 0);
            // Vary the phase against the callback so the spread shows.
            run(&mut host, 0.13 + (k as f64 * 0.0037) % 0.011);
        }
        let status = host.status();
        drop(listen.stream);
        drop(host);
        let r = listen.recording.lock().unwrap();
        let rate = listen.rate;
        let heard = r.samples.iter().any(|v| v.abs() > 0.0);
        let mut loopback = Vec::new();
        for at in &sent {
            let from = r.index_at(at.saturating_sub(2_000_000), rate);
            let to = r.index_at(at + 250_000_000, rate);
            if r.blocks.is_empty() {
                break;
            }
            if let Some(i) = r.samples[from..to].iter().position(|v| v.abs() > 0.005) {
                let onset = r.time_of(from + i, rate);
                loopback.push((onset as f64 - *at as f64) / 1e6);
            }
        }
        let loopback = loopback
            .into_iter()
            .map(|v| (v * 100.0).round() / 100.0)
            .collect::<Vec<_>>();
        serde_json::json!({
            "tier":tier,
            "sampleRate":status.sample_rate,
            "bufferFrames":status.buffer_frames,
            "bufferMs":ms(status.buffer_frames as f64, status.sample_rate as f64),
            "fallback":status.fallback,
            "inputHeardAnything":heard,
            "noteOnToLoopbackInputMs":summary(loopback.clone()),
            "noteOnToLoopbackInputEachMs":loopback,
            "notesSent":sent.len(),
        })
    }
    /// Peak (both channels, and the left alone as the first probe measured)
    /// and 300 ms RMS (left) at the loopback input for one event, with what
    /// the output limiter did during it.
    fn level(
        &self,
        host: &mut platform::Host,
        rate: f64,
        rec: &Arc<Mutex<Recording>>,
        seconds: f64,
        play: &dyn Fn(&mut platform::Host),
    ) -> serde_json::Value {
        let before = host.status();
        let at = now_ns();
        play(host);
        run(host, seconds + 0.05);
        let after = host.status();
        let r = rec.lock().unwrap();
        let from = r.index_at(at, rate);
        let to = r.index_at(at + (seconds * 1e9) as u64, rate);
        let window = &r.samples[from..to];
        let right = &r.right[from..to.min(r.right.len())];
        let peak = window.iter().fold(0f32, |p, v| p.max(v.abs()));
        let both = right.iter().fold(peak, |p, v| p.max(v.abs()));
        let onset = window
            .iter()
            .position(|v| v.abs() > peak * 0.1)
            .unwrap_or(0);
        let body = &window[onset..(onset + (rate * 0.3) as usize).min(window.len())];
        let rms = (body.iter().map(|v| (*v as f64).powi(2)).sum::<f64>()
            / body.len().max(1) as f64)
            .sqrt();
        let limited = after.limited_frames - before.limited_frames;
        serde_json::json!({
            "peakDbfs":dbfs(both),
            "peakLeftDbfs":dbfs(peak),
            "rms300msDbfs":dbfs(rms as f32),
            "limitedFrames":limited,
            "limiterLowestGainDb":(limited > 0).then(|| dbfs(after.limiter_gain as f32)),
        })
    }
    fn loudness(&self, sfz: &Path, label: &str, volumes: mixer::Volumes) -> serde_json::Value {
        let volumes = Arc::new(volumes);
        let mut host = match self.open(sfz, 1, volumes) {
            Ok(host) => host,
            Err(e) => return serde_json::json!({"run":label,"error":e}),
        };
        let listen = match input(&self.name) {
            Ok(listen) => listen,
            Err(e) => return serde_json::json!({"run":label,"error":e}),
        };
        run(&mut host, 0.4);
        let rate = listen.rate;
        let rec = listen.recording.clone();
        let mut notes = serde_json::Map::new();
        for key in [36u8, 60, 84] {
            for vel in [16u8, 32, 64, 96, 127] {
                let v = self.level(&mut host, rate, &rec, 0.55, &|_| {
                    self.bus.send(100, 1, 1, key, vel)
                });
                self.bus.send(100, 2, 1, key, 0);
                run(&mut host, 0.9);
                notes.insert(format!("key{key}vel{vel}"), v);
            }
        }
        let chord = [48u8, 55, 60, 64, 67];
        let v = self.level(&mut host, rate, &rec, 0.55, &|_| {
            for k in chord {
                self.bus.send(100, 1, 1, k, 100);
            }
        });
        for k in chord {
            self.bus.send(100, 2, 1, k, 0);
        }
        run(&mut host, 0.9);
        notes.insert("fiveNoteChordVel100".into(), v);
        // Both hands, fortissimo, pedal down, struck twice so the second
        // strike lands on the first one's ringing strings.
        let full = [36u8, 43, 48, 52, 55, 60, 64, 67, 72, 76];
        let v = self.level(&mut host, rate, &rec, 1.6, &|host| {
            self.bus.send(100, 3, 1, 64, 127);
            for k in full {
                self.bus.send(100, 1, 1, k, 120);
            }
            run(host, 0.4);
            for k in full {
                self.bus.send(100, 1, 1, k, 127);
            }
        });
        for k in full {
            self.bus.send(100, 2, 1, k, 0);
        }
        self.bus.send(100, 3, 1, 64, 0);
        run(&mut host, 2.0);
        notes.insert("pedalledTwoHandChordFf".into(), v);
        let out_rate = host.status().sample_rate;
        let mailbox = self.mailbox.clone();
        let click = self.level(&mut host, rate, &rec, 0.55, &|_| {
            let cue = Box::new(mixer::Cue::new(
                out_rate,
                lifecycle::Request::new("", 180.0, 1200.0, 0.0).unwrap(),
                Arc::new(AtomicBool::new(false)),
            ));
            assert!(mailbox.publish(cue).is_ok());
        });
        run(&mut host, 1.0);
        self.mailbox.reclaim();
        notes.insert("metronomeClick".into(), click);
        drop(listen.stream);
        drop(host);
        self.mailbox.reset();
        serde_json::json!({"run":label,"tier":1,"levels":notes})
    }
}

#[test]
#[ignore = "requires a Mac with a loopback output and a private report directory"]
fn loopback_delay_and_loudness() {
    let directory = PathBuf::from(
        std::env::var("VIEWER_PLAYABILITY_REPORT_DIR")
            .expect("explicit private report directory required"),
    );
    std::fs::create_dir_all(&directory).unwrap();
    let report = directory.join("macos-playability.json");
    let write = |value: serde_json::Value| {
        std::fs::write(&report, serde_json::to_vec_pretty(&value).unwrap()).unwrap()
    };
    write(serde_json::json!({"version":2,"result":"started"}));
    let wanted = std::env::var("VIEWER_PLAYABILITY_OUTPUT").unwrap_or_else(|_| "BlackHole".into());
    let outputs = platform::outputs().expect("CoreAudio enumeration");
    let names: Vec<_> = outputs.outputs.iter().map(|o| o.name.clone()).collect();
    let Some(output) = outputs.outputs.iter().find(|o| o.name.contains(&wanted)) else {
        write(
            serde_json::json!({"version":2,"result":"unavailable","reason":"no loopback output","outputs":names}),
        );
        return;
    };
    let hal = hal::HalDevice::by_name(&output.name).unwrap();
    let original = hal.current().unwrap();
    let probe = Probe {
        id: output.id.clone(),
        name: output.name.clone(),
        bus: Arc::new(mixer::MidiBus::default()),
        mailbox: Arc::new(mixer::CueMailbox::default()),
    };
    probe.bus.enable(true);
    probe.bus.connect(100);
    let onset = fixture(&directory);
    let tiers: Vec<_> = (0..=3u8).map(|tier| probe.delay(&onset, tier)).collect();
    let path = serde_json::json!({
        "outputFrames":hal.path_frames(false).ok(),
        "inputFrames":hal.path_frames(true).ok(),
        "scope":"[device latency, safety offset] as the driver reports them",
    });
    let bank = std::env::var("VIEWER_PLAYABILITY_SFZ")
        .ok()
        .filter(|s| !s.is_empty());
    let loudness = match &bank {
        Some(sfz) => {
            let sfz = PathBuf::from(sfz);
            let started = Instant::now();
            // The earlier levels (linear 70% piano, fixed cue, no limiting
            // reached), then the new default and both tracks at 100%.
            let before = probe.loudness(&sfz, "before", mixer::Volumes::with_gains(0.7, 1.0));
            let default = probe.loudness(&sfz, "default 70%", mixer::Volumes::new(0.7, 0.7));
            let full = probe.loudness(&sfz, "100%", mixer::Volumes::new(1.0, 1.0));
            serde_json::json!({"bank":sfz,"before":before,"default":default,"full":full,"pianoGainAtDefault":mixer::piano_gain(0.7),"seconds":started.elapsed().as_secs()})
        }
        None => serde_json::json!("skipped: no piano bank given"),
    };
    probe.bus.enable(false);
    assert_eq!(hal.current().unwrap(), original, "buffer size restored");
    let heard = tiers.iter().any(|t| t["inputHeardAnything"] == true);
    let result = if heard { "measured" } else { "input-silent" };
    let reason = (!heard)
        .then_some("the loopback input recorded only zeros (microphone permission or routing)");
    write(serde_json::json!({
        "version":2,
        "result":result,
        "reason":reason,
        "output":output.name,
        "outputs":names,
        "originalBufferFrames":original,
        "samplerMaxBlockFrames":mixer::MAX_BLOCK,
        "devicePath":path,
        "delayByTier":tiers,
        "loudness":loudness,
        "measures":"note-on handed to the audio engine -> first non-zero sample on the loopback input, timed by CoreAudio host time; loudness is at the device in dBFS",
        "doesNotMeasure":"speakers, a real interface's converters and driver latency, MIDI keyboard to computer delay, the room",
        "physicalAcceptance":false,
    }));
}
