//! Explicit isolated route experiment. No application mode, device policy or capture fallback.
use super::*;
use serde::Serialize;
use std::{path::PathBuf, sync::atomic::AtomicBool};
#[path = "audio_mode_policy.rs"]
mod policy;
use policy::{aligned_duration, pcm24};

const MOTU_OUTPUT: &str = "{0.0.0.00000000}.{246c67bf-6de3-48d2-8878-3a8813262c1d}";
const REALTEK_OUTPUT: &str = "{0.0.0.00000000}.{6da12d86-aa2b-4d4f-8948-f877d478c401}";
const PURE_CAPTURE: &str = "{0.0.1.00000000}.{ab6d0c57-ec15-4272-8aa6-a0e28e38f9e3}";
const ATTACKS: [(u64, u8); 3] = [(400, 60), (747, 64), (1109, 67)];
const RUN_SECONDS: u32 = 3;
#[link(name = "kernel32")]
extern "system" {
    fn QueryPerformanceCounter(value: *mut i64) -> i32;
    fn QueryPerformanceFrequency(value: *mut i64) -> i32;
}
fn qpc() -> u64 {
    let (mut value, mut frequency) = (0, 0);
    unsafe {
        assert_ne!(QueryPerformanceCounter(&mut value), 0);
        assert_ne!(QueryPerformanceFrequency(&mut frequency), 0);
    }
    assert!(value >= 0 && frequency > 0);
    (value as u128 * 10_000_000 / frequency as u128) as u64
}
fn env(name: &str) -> Result<String, String> {
    std::env::var(name).map_err(|_| format!("Missing explicit experiment setting {name}"))
}
fn folder() -> Result<PathBuf, String> {
    let path = PathBuf::from(env("VIEWER_MODE_REPORT_DIR")?);
    if !path.is_absolute() || !path.is_dir() {
        return Err("Report directory must already exist and be absolute".into());
    }
    Ok(path)
}
fn nonce() -> Result<String, String> {
    let value = env("VIEWER_MODE_NONCE")?;
    if value.len() != 32 || !value.bytes().all(|v| v.is_ascii_hexdigit()) {
        return Err("Experiment nonce must be32hex".into());
    }
    Ok(value)
}
unsafe fn identity(device: &IMMDevice) -> Result<serde_json::Value, String> {
    let props = device.OpenPropertyStore(STGM_READ).map_err(error)?;
    let string = |guid, pid| -> Result<String, String> {
        let mut value = props
            .GetValue(&PROPERTYKEY {
                fmtid: GUID::from_u128(guid),
                pid,
            })
            .map_err(error)?;
        let ptr = PropVariantToStringAlloc(&value).map_err(error)?;
        let result = ptr.to_string().map_err(|e| e.to_string());
        CoTaskMemFree(Some(ptr.0.cast()));
        PropVariantClear(&mut value).map_err(error)?;
        result
    };
    Ok(
        serde_json::json!({"name":string(0xa45c254e_df1c_4efd_8020_67d146a850e0,2)?,
        "family":string(0xb3f8fa53_0004_438e_9003_51a46e139bfc,6)?,
        "driver":string(0x83da6326_97a6_4088_9453_a1923f573b29,3)?}),
    )
}
fn gate(directory: &std::path::Path) -> Result<(), String> {
    if directory.join("renderer-ready.json").exists()
        || directory.join("renderer-start.json").exists()
        || directory.join("render.json").exists()
    {
        return Err("Fresh renderer directory required".into());
    }
    let token = nonce()?;
    let armed_qpc = qpc();
    std::fs::write(directory.join("renderer-ready.json"),serde_json::to_vec(&serde_json::json!({"qpc100ns":armed_qpc,"nonce":token,"stage":"engine loaded, telemetry preallocated, not started"})).unwrap()).map_err(|e|e.to_string())?;
    let start = Instant::now();
    while !directory.join("renderer-start.json").is_file() {
        if start.elapsed() > Duration::from_secs(60) {
            return Err("Renderer start gate timed out".into());
        }
        std::thread::sleep(Duration::from_millis(10));
    }
    let value: serde_json::Value = serde_json::from_slice(
        &std::fs::read(directory.join("renderer-start.json")).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    let epoch = value["qpc100ns"].as_u64().ok_or("Start gate lacks QPC")?;
    if value["nonce"].as_str() != Some(token.as_str()) {
        return Err("Unrelated start nonce".into());
    }
    if epoch < armed_qpc || epoch > qpc() {
        return Err("Stale/unrelated start gate".into());
    }
    Ok(())
}
fn wav(path: &std::path::Path, samples: &[f32], rate: u32, channels: u16) -> Result<(), String> {
    use std::io::Write;
    let bytes = u32::try_from(samples.len() * 4).map_err(|_| "PCM size overflow")?;
    let mut out = std::fs::File::create(path).map_err(|e| e.to_string())?;
    out.write_all(b"RIFF").map_err(|e| e.to_string())?;
    out.write_all(&(36 + bytes).to_le_bytes())
        .map_err(|e| e.to_string())?;
    out.write_all(b"WAVEfmt \x10\0\0\0")
        .map_err(|e| e.to_string())?;
    out.write_all(&3u16.to_le_bytes())
        .map_err(|e| e.to_string())?;
    out.write_all(&channels.to_le_bytes())
        .map_err(|e| e.to_string())?;
    out.write_all(&rate.to_le_bytes())
        .map_err(|e| e.to_string())?;
    out.write_all(&(rate * channels as u32 * 4).to_le_bytes())
        .map_err(|e| e.to_string())?;
    out.write_all(&(channels * 4).to_le_bytes())
        .map_err(|e| e.to_string())?;
    out.write_all(&32u16.to_le_bytes())
        .map_err(|e| e.to_string())?;
    out.write_all(b"data").map_err(|e| e.to_string())?;
    out.write_all(&bytes.to_le_bytes())
        .map_err(|e| e.to_string())?;
    for sample in samples {
        out.write_all(&sample.to_le_bytes())
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
#[derive(Default)]
struct AttackTrace {
    consumed_micros: AtomicU64,
    source_frame: AtomicU64,
    render_before_micros: AtomicU64,
    render_after_micros: AtomicU64,
}
#[derive(Default)]
struct Trace {
    attacks: [AttackTrace; 3],
}
struct TracedSynth {
    inner: Box<dyn mixer::Synth>,
    trace: Arc<Trace>,
    frames: u64,
    ordinal: usize,
    pending: Option<usize>,
}
impl mixer::Synth for TracedSynth {
    fn note_on(&mut self, offset: u32, key: u8, velocity: u8) {
        if self.ordinal < 3 {
            self.trace.attacks[self.ordinal]
                .consumed_micros
                .store(crate::midi_input::midi_clock(), Ordering::Relaxed);
            self.pending = Some(self.ordinal);
        }
        self.ordinal += 1;
        self.inner.note_on(offset, key, velocity);
    }
    fn note_off(&mut self, o: u32, k: u8, v: u8) {
        self.inner.note_off(o, k, v);
    }
    fn cc(&mut self, o: u32, k: u8, v: u8) {
        self.inner.cc(o, k, v);
    }
    fn all_off(&mut self) {
        self.inner.all_off();
    }
    fn render(&mut self, left: &mut [f32], right: &mut [f32]) -> bool {
        let before = crate::midi_input::midi_clock();
        let ok = self.inner.render(left, right);
        let after = crate::midi_input::midi_clock();
        if let Some(ordinal) = self.pending {
            if let Some(index) = left
                .iter()
                .zip(right.iter())
                .position(|(l, r)| *l != 0. || *r != 0.)
            {
                let trace = &self.trace.attacks[ordinal];
                // +1 distinguishes true source frame zero from no observation.
                trace
                    .source_frame
                    .store(self.frames + index as u64 + 1, Ordering::Relaxed);
                trace.render_before_micros.store(before, Ordering::Relaxed);
                trace.render_after_micros.store(after, Ordering::Relaxed);
                self.pending = None;
            }
        }
        self.frames += left.len() as u64;
        ok
    }
}
fn traced(inner: Box<dyn mixer::Synth>, trace: Arc<Trace>) -> Box<dyn mixer::Synth> {
    Box::new(TracedSynth {
        inner,
        trace,
        frames: 0,
        ordinal: 0,
        pending: None,
    })
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Sent {
    key: u8,
    due_ms: u64,
    before_micros: u64,
    after_micros: u64,
    before_qpc_100ns: u64,
    after_qpc_100ns: u64,
}
fn producer(bus: Arc<mixer::MidiBus>, stop: Arc<AtomicBool>) -> std::thread::JoinHandle<Vec<Sent>> {
    std::thread::spawn(move || {
        let start = Instant::now();
        let mut sent = Vec::with_capacity(3);
        for (ms, key) in ATTACKS {
            while start.elapsed().as_millis() < ms as u128 && !stop.load(Ordering::Acquire) {
                std::thread::sleep(Duration::from_millis(1));
            }
            if stop.load(Ordering::Acquire) {
                break;
            }
            let before_qpc_100ns = qpc();
            let before_micros = crate::midi_input::midi_clock();
            bus.send(1, 1, 1, key, 100);
            let after_micros = crate::midi_input::midi_clock();
            let after_qpc_100ns = qpc();
            sent.push(Sent {
                key,
                due_ms: ms,
                before_micros,
                after_micros,
                before_qpc_100ns,
                after_qpc_100ns,
            });
            std::thread::sleep(Duration::from_millis(100));
            bus.send(1, 2, 1, key, 0);
            std::thread::sleep(Duration::from_millis(150));
            bus.send(1, 3, 1, 120, 0);
        }
        sent
    })
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Packet {
    source_start_frame: u64,
    frames: u32,
    wake_micros: u64,
    release_before_micros: u64,
    release_after_micros: u64,
    clock_position: u64,
    clock_frequency: u64,
    clock_qpc_100ns: u64,
    service_micros: u64,
    padding_before: Option<u32>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FormatReceipt {
    rate: u32,
    channels: u16,
    container_bits: u16,
    valid_bits: u16,
    minimum_period_100ns: i64,
    initialized_period_100ns: i64,
    alignment_retry: bool,
    capacity_frames: u32,
    stream_latency_100ns: i64,
    endpoint_volume_changed: bool,
}
// Keep the COM guard last: every interface releases before CoUninitialize.
struct Exclusive {
    client: IAudioClient,
    render: IAudioRenderClient,
    clock: IAudioClock,
    event: Event,
    mixer: mixer::Mixer,
    format: WAVEFORMATEXTENSIBLE,
    pcm: Vec<f32>,
    samples: Vec<f32>,
    packets: Vec<Packet>,
    receipt: FormatReceipt,
    submitted: u64,
    started: bool,
    _mmcss: Option<Mmcss>,
    _com: Com,
}
fn pcm_format(rate: u32, valid: u16) -> WAVEFORMATEXTENSIBLE {
    let bits = if valid == 16 { 16 } else { 32 };
    WAVEFORMATEXTENSIBLE {
        Format: WAVEFORMATEX {
            wFormatTag: 0xfffe,
            nChannels: 2,
            nSamplesPerSec: rate,
            nAvgBytesPerSec: rate * 2 * bits as u32 / 8,
            nBlockAlign: 2 * bits / 8,
            wBitsPerSample: bits,
            cbSize: 22,
        },
        Samples: WAVEFORMATEXTENSIBLE_0 {
            wValidBitsPerSample: valid,
        },
        dwChannelMask: 3,
        SubFormat: GUID::from_u128(0x00000001_0000_0010_8000_00aa00389b71),
    }
}
impl Exclusive {
    fn open(config: &Config, bus: Arc<mixer::MidiBus>, trace: Arc<Trace>) -> Result<Self, String> {
        unsafe {
            let com = Com::enter()?;
            let device = endpoint(&config.device)?;
            let mut client: IAudioClient = device.Activate(CLSCTX_ALL, None).map_err(error)?;
            let mix = Format(client.GetMixFormat().map_err(error)?);
            let rate = (*mix.0).nSamplesPerSec;
            if ![44100, 48000].contains(&rate) || (*mix.0).nChannels != 2 {
                return Err("Only current stereo44.1/48k experiment rates admitted".into());
            }
            let mut format = pcm_format(rate, 24);
            let pcm24_result =
                client.IsFormatSupported(AUDCLNT_SHAREMODE_EXCLUSIVE, &format.Format, None);
            if pcm24_result.0 != 0 {
                format = pcm_format(rate, 16);
                let pcm16_result =
                    client.IsFormatSupported(AUDCLNT_SHAREMODE_EXCLUSIVE, &format.Format, None);
                if pcm16_result.0 != 0 {
                    return Err(format!("Exact exclusive integer PCM unsupported:24={pcm24_result:?},16={pcm16_result:?}"));
                }
            }
            let (mut default, mut minimum) = (0, 0);
            client
                .GetDevicePeriod(Some(&mut default), Some(&mut minimum))
                .map_err(error)?;
            if minimum <= 0 || minimum > 200_000 {
                return Err("Invalid exclusive minimum period".into());
            }
            let mut duration = minimum;
            let mut retry = false;
            if let Err(first) = client.Initialize(
                AUDCLNT_SHAREMODE_EXCLUSIVE,
                AUDCLNT_STREAMFLAGS_EVENTCALLBACK,
                duration,
                duration,
                &format.Format,
                None,
            ) {
                if first.code() != AUDCLNT_E_BUFFER_SIZE_NOT_ALIGNED {
                    return Err(format!("Exclusive Initialize refused: {first}"));
                }
                let aligned = client.GetBufferSize().map_err(error)?;
                if aligned == 0 || aligned > 8192 {
                    return Err("Exclusive alignment capacity invalid".into());
                }
                duration = aligned_duration(aligned, rate)?;
                drop(client);
                client = device.Activate(CLSCTX_ALL, None).map_err(error)?;
                client
                    .Initialize(
                        AUDCLNT_SHAREMODE_EXCLUSIVE,
                        AUDCLNT_STREAMFLAGS_EVENTCALLBACK,
                        duration,
                        duration,
                        &format.Format,
                        None,
                    )
                    .map_err(error)?;
                retry = true;
            }
            let capacity = client.GetBufferSize().map_err(error)?;
            if capacity == 0 || capacity > 8192 {
                return Err("Exclusive packet exceeds supported bounds".into());
            }
            let stream_latency = client.GetStreamLatency().map_err(error)?;
            let render: IAudioRenderClient = client.GetService().map_err(error)?;
            let clock: IAudioClock = client.GetService().map_err(error)?;
            let event = Event(CreateEventW(None, false, false, None).map_err(error)?);
            client.SetEventHandle(event.0).map_err(error)?;
            let sfz = config
                .sfz
                .as_deref()
                .ok_or("Exact admitted Live SFZ required")?;
            let engine = crate::piano_engine::PianoEngine::new(sfz, rate, mixer::MAX_BLOCK)?;
            let mut task = 0;
            let mmcss = AvSetMmThreadCharacteristicsW(w!("Pro Audio"), &mut task)
                .ok()
                .map(Mmcss);
            let valid = format.Samples.wValidBitsPerSample;
            let receipt = FormatReceipt {
                rate,
                channels: 2,
                container_bits: format.Format.wBitsPerSample,
                valid_bits: valid,
                minimum_period_100ns: minimum,
                initialized_period_100ns: duration,
                alignment_retry: retry,
                capacity_frames: capacity,
                stream_latency_100ns: stream_latency,
                endpoint_volume_changed: false,
            };
            let host = Self {
                client,
                render,
                clock,
                event,
                mixer: mixer::Mixer::new(
                    Some(traced(Box::new(engine), trace)),
                    bus,
                    Arc::default(),
                    Arc::new(AtomicU64::new(0.04f64.to_bits())),
                ),
                format,
                pcm: vec![0.; capacity as usize * 2],
                samples: Vec::with_capacity(rate as usize * 2 * (RUN_SECONDS as usize + 1)),
                packets: Vec::with_capacity(10000),
                receipt,
                submitted: 0,
                started: false,
                _mmcss: mmcss,
                _com: com,
            };
            Ok(host)
        }
    }
    fn start(&mut self) -> Result<(), String> {
        unsafe {
            let frames = self.receipt.capacity_frames;
            let ptr = self.render.GetBuffer(frames).map_err(error)?;
            std::ptr::write_bytes(
                ptr,
                0,
                frames as usize * self.format.Format.nBlockAlign as usize,
            );
            self.render.ReleaseBuffer(frames, 0).map_err(error)?;
            self.client.Start().map_err(error)?;
            self.started = true;
        }
        Ok(())
    }
    fn pump(&mut self) -> Result<(), String> {
        unsafe {
            match WaitForSingleObject(self.event.0, 100) {
                WAIT_OBJECT_0 => {}
                WAIT_TIMEOUT => return Err("Exclusive event timed out".into()),
                _ => return Err("Exclusive event wait failed".into()),
            }
            if self.packets.len() == self.packets.capacity()
                || self.samples.len() + self.pcm.len() > self.samples.capacity()
            {
                return Err("Experiment preallocated capture capacity exhausted".into());
            }
            let wake = crate::midi_input::midi_clock();
            let frames = self.receipt.capacity_frames;
            // Full packet is mandatory for event-driven exclusive ping-pong.
            let ptr = self.render.GetBuffer(frames).map_err(error)?;
            self.mixer.fill(&mut self.pcm, 2, wake, 0, |v| v);
            if self.receipt.valid_bits == 24 {
                for (dst, src) in std::slice::from_raw_parts_mut(ptr.cast::<i32>(), self.pcm.len())
                    .iter_mut()
                    .zip(&self.pcm)
                {
                    *dst = pcm24(*src);
                }
            } else {
                for (dst, src) in std::slice::from_raw_parts_mut(ptr.cast::<i16>(), self.pcm.len())
                    .iter_mut()
                    .zip(&self.pcm)
                {
                    *dst = (*src * i16::MAX as f32).round() as i16;
                }
            }
            let before = crate::midi_input::midi_clock();
            self.render.ReleaseBuffer(frames, 0).map_err(error)?;
            let after = crate::midi_input::midi_clock();
            // Preserve ACTUAL packed integer PCM, normalized reversibly for signature.
            if self.receipt.valid_bits == 24 {
                self.samples.extend(
                    self.pcm
                        .iter()
                        .map(|v| pcm24(*v) as f64 as f32 / i32::MAX as f32),
                );
            } else {
                self.samples.extend(
                    self.pcm
                        .iter()
                        .map(|v| ((*v * i16::MAX as f32).round() as i16) as f32 / i16::MAX as f32),
                );
            }
            let mut position = 0;
            let mut qpc = 0;
            self.clock
                .GetPosition(&mut position, Some(&mut qpc))
                .map_err(error)?;
            self.packets.push(Packet {
                source_start_frame: self.submitted,
                frames,
                wake_micros: wake,
                release_before_micros: before,
                release_after_micros: after,
                clock_position: position,
                clock_frequency: self.clock.GetFrequency().map_err(error)?,
                clock_qpc_100ns: qpc,
                service_micros: after - wake,
                padding_before: None,
            });
            self.submitted += frames as u64;
            Ok(())
        }
    }
    fn stop(&mut self) -> Result<(), String> {
        unsafe {
            self.client.Stop().map_err(error)?;
        }
        self.started = false;
        Ok(())
    }
}
impl Drop for Exclusive {
    fn drop(&mut self) {
        if self.started {
            unsafe {
                let _ = self.client.Stop();
            }
        }
    }
}

#[test]
#[ignore = "Explicit bounded Windows endpoint experiment; root-admitted executor only"]
fn compare_route() {
    let directory = folder().unwrap();
    let mode = env("VIEWER_MODE").unwrap();
    let device = env("VIEWER_MODE_ENDPOINT").unwrap();
    assert!(
        [MOTU_OUTPUT, REALTEK_OUTPUT].contains(&device.as_str()),
        "Only explicitly reviewed outputs admitted"
    );
    assert!(["shared", "exclusive"].contains(&mode.as_str()));
    assert!(
        std::env::var_os("VIEWER_AUDIO_DIAGNOSTIC_QUEUE_MODE").is_none(),
        "No legacy queue override"
    );
    let sfz = PathBuf::from(env("VIEWER_MODE_SFZ").unwrap());
    assert!(sfz.is_absolute() && sfz.is_file());
    assert_eq!(
        sfz.file_name().and_then(|v| v.to_str()),
        Some("Accurate-SalamanderGrandPiano_flat.Recommended.sfz")
    );
    assert_eq!(
        sfz.parent()
            .and_then(|v| v.file_name())
            .and_then(|v| v.to_str()),
        Some("sfz_live")
    );
    use sha2::Digest;
    let sfz_sha256 = format!("{:x}", sha2::Sha256::digest(std::fs::read(&sfz).unwrap()));
    assert_eq!(
        sfz_sha256, "6567611a435eb3503b5425f13c1092de4abec32fa237c6cf7f0467949ec729ee",
        "Different managed Live SFZ"
    );
    let output_identity = unsafe {
        let _com = Com::enter().unwrap();
        let d = endpoint(&device).unwrap();
        identity(&d).unwrap()
    };
    if device == MOTU_OUTPUT {
        assert_eq!(output_identity["name"], "Out 1-2");
        assert_eq!(output_identity["family"], "MOTU M Series");
        let driver = output_identity["driver"].as_str().unwrap();
        assert!(driver.contains(":4.6.0.705:") && driver.contains("USB\\VID_07FD&PID_000B&MI_00"));
    } else {
        assert_eq!(output_identity["family"], "Realtek(R) Audio");
    }
    let config = Config {
        enabled: true,
        sfz: Some(sfz.clone()),
        device: device.clone(),
        tier: 0,
    };
    let bus = Arc::new(mixer::MidiBus::default());
    bus.connect(1);
    bus.enable(true);
    let trace = Arc::new(Trace::default());
    let stop = Arc::new(AtomicBool::new(false));
    let anchor_before = crate::midi_input::midi_clock();
    let anchor_qpc = qpc();
    let anchor_after = crate::midi_input::midi_clock();
    let (sent, samples, packets, metadata, error) = if mode == "exclusive" {
        let mut host = Exclusive::open(&config, bus.clone(), trace.clone()).unwrap();
        gate(&directory).unwrap();
        host.start().unwrap();
        let producer = producer(bus.clone(), stop.clone());
        let start = Instant::now();
        let mut failure = None;
        while start.elapsed() < Duration::from_secs(RUN_SECONDS as u64) {
            if let Err(e) = host.pump() {
                failure = Some(e);
                break;
            }
        }
        stop.store(true, Ordering::Release);
        let sent = producer.join().unwrap();
        if let Err(e) = host.stop() {
            failure = Some(e);
        }
        let metadata = serde_json::to_value(&host.receipt).unwrap();
        (
            sent,
            std::mem::take(&mut host.samples),
            std::mem::take(&mut host.packets),
            metadata,
            failure,
        )
    } else {
        let mut host = Host::open_prepared(
            &config,
            bus.clone(),
            Arc::default(),
            Arc::new(AtomicU64::new(0.04f64.to_bits())),
        )
        .unwrap();
        host.capture(RUN_SECONDS + 1).unwrap();
        host.mixer.synth = Some(traced(host.mixer.synth.take().unwrap(), trace.clone()));
        let latency = host.stream_latency_100ns().unwrap();
        gate(&directory).unwrap();
        unsafe {
            host.client.Start().unwrap();
        }
        let status = host.status();
        let producer = producer(bus.clone(), stop.clone());
        let start = Instant::now();
        let mut failure = None;
        while start.elapsed() < Duration::from_secs(RUN_SECONDS as u64) {
            if let Err(e) = host.pump() {
                failure = Some(e);
                break;
            }
        }
        stop.store(true, Ordering::Release);
        let sent = producer.join().unwrap();
        if let Err(e) = host.close() {
            failure = Some(e);
        }
        let capture = host.take_capture().unwrap();
        if capture.over_capacity {
            failure = Some("Shared capture exceeded preallocation".into());
        }
        let mut source_start_frame = 0;
        let packets = capture
            .pumps
            .into_iter()
            .map(|p| {
                let start = source_start_frame;
                source_start_frame += p.submitted_frames as u64;
                Packet {
                    source_start_frame: start,
                    frames: p.submitted_frames,
                    wake_micros: p.callback_micros,
                    release_before_micros: p.release_before_micros,
                    release_after_micros: p.released_micros,
                    clock_position: p.clock_position,
                    clock_frequency: p.clock_frequency,
                    clock_qpc_100ns: p.clock_qpc_100ns,
                    service_micros: p.service_micros,
                    padding_before: Some(p.padding_before),
                }
            })
            .collect::<Vec<_>>();
        let format = unsafe { *host.format.0 };
        let (bits, tag, rate, channels) = (
            format.wBitsPerSample,
            format.wFormatTag,
            format.nSamplesPerSec,
            format.nChannels,
        );
        (
            sent,
            capture.samples,
            packets,
            serde_json::json!({"status":status,"streamLatency100ns":latency,
            "containerBits":bits,"formatTag":tag,"rate":rate,"channels":channels}),
            failure,
        )
    };
    bus.disconnect(1);
    let rate = metadata["rate"].as_u64().unwrap() as u32;
    assert_eq!(rate, if device == MOTU_OUTPUT { 44100 } else { 48000 });
    let attacks=trace.attacks.iter().enumerate().map(|(i,a)|serde_json::json!({"ordinal":i,"consumedMicros":a.consumed_micros.load(Ordering::Relaxed),
        "firstSourceFrame":a.source_frame.load(Ordering::Relaxed).checked_sub(1),
        "renderBeforeMicros":a.render_before_micros.load(Ordering::Relaxed),"renderAfterMicros":a.render_after_micros.load(Ordering::Relaxed)})).collect::<Vec<_>>();
    wav(&directory.join("source.wav"), &samples, rate, 2).unwrap();
    let report = serde_json::json!({"version":1,"mode":mode,"endpoint":device,"outputIdentity":output_identity,"nonce":nonce().unwrap(),"sfz":sfz,"sfzSha256":sfz_sha256,"volume":0.04,
        "compileContract":"Rust opt-level0 test profile; pinned sfizz C++Release; staticCRT","scope":"3 controlled asynchronous virtual native bus attacks; source PCM and actual ReleaseBuffer brackets, not physical MIDI or ear",
        "sourceFrameMeaning":"concatenated submitted sequence excluding priming silence; not a device playback position",
        "attackTraceMeaning":"first unquantized synth frame after consuming each attack; signature uses actual packed PCM from source.wav",
        "anchorBeforeMicros":anchor_before,"anchorAfterMicros":anchor_after,"anchorQpc100ns":anchor_qpc,
        "metadata":metadata,"sent":sent,"attacks":attacks,"packets":packets,"failure":error,
        "systemChanges":false,"captureProvidedBySeparatePureCollector":true});
    std::fs::write(
        directory.join("render.json"),
        serde_json::to_vec_pretty(&report).unwrap(),
    )
    .unwrap();
    assert!(error.is_none(), "Route failed: {error:?}");
    assert_eq!(report["sent"].as_array().unwrap().len(), 3);
    for attack in &attacks {
        assert!(attack["firstSourceFrame"].is_u64(), "Missing source attack");
    }
}

#[test]
fn exclusive_pcm24_alignment_and_zero_are_exact() {
    for value in [-1., -0.7, 0., 0.7, 1.] {
        assert_eq!(pcm24(value) & 255, 0);
    }
    assert_eq!(pcm24(0.), 0);
    assert_eq!(pcm24(1.), 0x7fffff00);
    assert_eq!(pcm24(-1.), -0x7fffff00);
    let f = pcm_format(44100, 24);
    let bits = f.Format.wBitsPerSample;
    let align = f.Format.nBlockAlign;
    assert_eq!(bits, 32);
    assert_eq!(align, 8);
    assert_eq!(unsafe { f.Samples.wValidBitsPerSample }, 24);
}
#[test]
fn exclusive_aligned_duration_bounds_and_fractional_frames() {
    assert_eq!(aligned_duration(144, 44100), Ok(32653));
    assert_eq!(aligned_duration(144, 48000), Ok(30000));
    for (frames, rate) in [(0, 44100), (8193, 44100), (144, 0), (144, 96000)] {
        assert!(aligned_duration(frames, rate).is_err());
    }
}

#[test]
#[ignore = "Exact output-only MOTU input collector, no microphone or generic capture"]
fn pure_motu_collector() {
    let directory = folder().unwrap();
    let token = nonce().unwrap();
    assert!(
        !directory.join("collector-ready.json").exists()
            && !directory.join("capture.json").exists(),
        "Fresh collector directory required"
    );
    unsafe {
        let com = Com::enter().unwrap();
        let device = endpoint(PURE_CAPTURE).unwrap();
        let id = identity(&device).unwrap();
        let name = id["name"].as_str().unwrap();
        let family = id["family"].as_str().unwrap();
        let driver = id["driver"].as_str().unwrap();
        assert_eq!(name, "Loopback");
        assert_eq!(family, "MOTU M Series");
        assert!(
            driver.contains(":4.6.0.705:") && driver.contains("USB\\VID_07FD&PID_000B&MI_00"),
            "Unreviewed capture driver identity"
        );
        let client: IAudioClient = device.Activate(CLSCTX_ALL, None).unwrap();
        let format = Format(client.GetMixFormat().unwrap());
        let f = *format.0;
        let (rate, channels, bits, tag) = (
            f.nSamplesPerSec,
            f.nChannels,
            f.wBitsPerSample,
            f.wFormatTag,
        );
        let alignment = f.nBlockAlign;
        assert_eq!(rate, 44100);
        assert_eq!(channels, 2);
        assert_eq!(alignment, 8);
        assert!(
            matches!(encoding(format.0).unwrap(), Encoding::Float),
            "Pure collector currently requires float32"
        );
        // Ordinary capture, explicitly NOT render-endpoint WASAPI loopback.
        client
            .Initialize(
                AUDCLNT_SHAREMODE_SHARED,
                AUDCLNT_STREAMFLAGS_EVENTCALLBACK,
                0,
                0,
                format.0,
                None,
            )
            .unwrap();
        let capacity = client.GetBufferSize().unwrap();
        let latency = client.GetStreamLatency().unwrap();
        let capture: IAudioCaptureClient = client.GetService().unwrap();
        let event = Event(CreateEventW(None, false, false, None).unwrap());
        client.SetEventHandle(event.0).unwrap();
        let mut task = 0;
        let _mmcss = AvSetMmThreadCharacteristicsW(w!("Pro Audio"), &mut task)
            .ok()
            .map(Mmcss);
        let mut samples = Vec::<f32>::with_capacity(44100 * 2 * 10);
        let mut packets = Vec::<super::super::capture_validation::Packet>::with_capacity(10000);
        client.Start().unwrap();
        // On any panic/error the guard stops BEFORE COM fields/guard are released.
        struct Stop<'a>(&'a IAudioClient);
        impl Drop for Stop<'_> {
            fn drop(&mut self) {
                unsafe {
                    let _ = self.0.Stop();
                }
            }
        }
        let stop = Stop(&client);
        std::fs::write(directory.join("collector-ready.json"),serde_json::to_vec(&serde_json::json!({"qpc100ns":qpc(),"nonce":token,"endpoint":PURE_CAPTURE,"rate":44100})).unwrap()).unwrap();
        let start = Instant::now();
        let mut failure = None;
        while start.elapsed() < Duration::from_secs(8) {
            if WaitForSingleObject(event.0, 100) != WAIT_OBJECT_0 {
                continue;
            }
            loop {
                let pending = match capture.GetNextPacketSize() {
                    Ok(n) => n,
                    Err(e) => {
                        failure = Some(e.to_string());
                        break;
                    }
                };
                if pending == 0 {
                    break;
                }
                let (mut ptr, mut frames, mut flags, mut position, mut time) =
                    (std::ptr::null_mut(), 0, 0, 0, 0);
                if let Err(e) = capture.GetBuffer(
                    &mut ptr,
                    &mut frames,
                    &mut flags,
                    Some(&mut position),
                    Some(&mut time),
                ) {
                    failure = Some(e.to_string());
                    break;
                }
                if frames == 0
                    || frames != pending
                    || (ptr.is_null() && flags & AUDCLNT_BUFFERFLAGS_SILENT.0 as u32 == 0)
                {
                    let _ = capture.ReleaseBuffer(frames);
                    failure = Some("Invalid pure capture packet shape".into());
                    break;
                }
                let count = frames as usize * 2;
                if packets.len() == packets.capacity() || samples.len() + count > samples.capacity()
                {
                    let _ = capture.ReleaseBuffer(frames);
                    failure = Some("Pure capture capacity exceeded".into());
                    break;
                }
                packets.push(super::super::capture_validation::Packet {
                    start_sample: samples.len(),
                    frames,
                    flags,
                    device_position: position,
                    qpc_100ns: time,
                });
                if flags & AUDCLNT_BUFFERFLAGS_SILENT.0 as u32 != 0 {
                    samples.resize(samples.len() + count, 0.);
                } else {
                    samples.extend_from_slice(std::slice::from_raw_parts(ptr.cast::<f32>(), count));
                }
                if let Err(e) = capture.ReleaseBuffer(frames) {
                    failure = Some(e.to_string());
                    break;
                }
            }
            if failure.is_some() {
                break;
            }
        }
        client.Stop().unwrap();
        drop(stop);
        wav(&directory.join("pure-capture.wav"), &samples, 44100, 2).unwrap();
        let report = serde_json::json!({"version":1,"endpoint":PURE_CAPTURE,"name":name,"driverFamily":family,"driver":driver,"nonce":token,
            "rate":rate,"channels":channels,"bufferFrames":capacity,"streamLatency100ns":latency,"formatTag":tag,"containerBits":bits,"packets":packets,"failure":failure,
            "scope":"ordinary pure MOTU Out1–2 digital return only; excludes physical inputs and microphone; timing unadmitted until signature/window checks","systemChanges":false});
        std::fs::write(
            directory.join("capture.json"),
            serde_json::to_vec_pretty(&report).unwrap(),
        )
        .unwrap();
        assert!(failure.is_none());
        assert!(!packets.is_empty());
        // Ensure all interfaces and format release before the COM guard.
        drop(capture);
        drop(client);
        drop(format);
        drop(device);
        drop(com);
    }
}
