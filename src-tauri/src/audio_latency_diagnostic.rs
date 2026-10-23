//! Explicit private initialized-host + same-endpoint loopback observation.
//! Never selected by ordinary tests. Loopback is the Windows mix, not the ear.
use super::{capture_validation, mixer, platform, Config};
use capture_validation::Packet as LoopbackPacket;
use std::{path::PathBuf, sync::Arc, time::Instant};
use windows::{
    core::PCWSTR,
    Win32::{Media::Audio::*, System::Com::*},
};

#[link(name = "kernel32")]
extern "system" {
    fn QueryPerformanceCounter(value: *mut i64) -> i32;
    fn QueryPerformanceFrequency(value: *mut i64) -> i32;
}
fn clock_anchor() -> (u64, u64, u64) {
    let before = crate::midi_input::midi_clock();
    let (mut ticks, mut frequency) = (0i64, 0i64);
    unsafe {
        assert_ne!(QueryPerformanceFrequency(&mut frequency), 0);
        assert_ne!(QueryPerformanceCounter(&mut ticks), 0);
    }
    let after = crate::midi_input::midi_clock();
    assert!(ticks >= 0 && frequency > 0);
    (
        (ticks as u128 * 10_000_000 / frequency as u128) as u64,
        before + (after - before) / 2,
        after - before,
    )
}
struct Loopback {
    client: IAudioClient,
    capture: IAudioCaptureClient,
    format: *mut WAVEFORMATEX,
    rate: u32,
    channels: usize,
    samples: Vec<f32>,
    packets: Vec<LoopbackPacket>,
    _com: ComGuard,
}
struct ComGuard;
impl Drop for ComGuard {
    fn drop(&mut self) {
        unsafe {
            CoUninitialize();
        }
    }
}
impl Loopback {
    fn open(device: &str) -> Self {
        unsafe {
            CoInitializeEx(None, COINIT_MULTITHREADED).ok().unwrap();
            let com = ComGuard;
            let enumerator: IMMDeviceEnumerator =
                CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).unwrap();
            let id: Vec<u16> = device.encode_utf16().chain(Some(0)).collect();
            let endpoint = enumerator.GetDevice(PCWSTR(id.as_ptr())).unwrap();
            let client: IAudioClient = endpoint.Activate(CLSCTX_ALL, None).unwrap();
            let format = client.GetMixFormat().unwrap();
            let f = *format;
            let (rate, channels) = (f.nSamplesPerSec, f.nChannels);
            assert!((8000..=96000).contains(&rate) && (1..=8).contains(&channels));
            // The selected source host and loopback both use the unchanged mix
            // format. This narrow diagnostic requires actual float32 mix PCM.
            let tag = if f.wFormatTag == 0xfffe {
                (*(format.cast::<WAVEFORMATEXTENSIBLE>())).SubFormat.data1 as u16
            } else {
                f.wFormatTag
            };
            assert_eq!(
                (tag, f.wBitsPerSample),
                (3, 32),
                "loopback diagnostic requires float32 mix"
            );
            client
                .Initialize(
                    AUDCLNT_SHAREMODE_SHARED,
                    AUDCLNT_STREAMFLAGS_LOOPBACK,
                    0,
                    0,
                    format,
                    None,
                )
                .unwrap();
            let capture = client.GetService().unwrap();
            let samples = Vec::with_capacity(f.nSamplesPerSec as usize * f.nChannels as usize * 15);
            let packets = Vec::with_capacity(4096);
            client.Start().unwrap();
            Self {
                client,
                capture,
                format,
                rate: f.nSamplesPerSec,
                channels: f.nChannels as usize,
                samples,
                packets,
                _com: com,
            }
        }
    }
    fn drain(&mut self) {
        unsafe {
            for _ in 0..1024 {
                if self.capture.GetNextPacketSize().unwrap() == 0 {
                    return;
                }
                let (mut data, mut frames, mut flags, mut position, mut qpc) =
                    (std::ptr::null_mut(), 0u32, 0u32, 0u64, 0u64);
                self.capture
                    .GetBuffer(
                        &mut data,
                        &mut frames,
                        &mut flags,
                        Some(&mut position),
                        Some(&mut qpc),
                    )
                    .unwrap();
                let start = self.samples.len();
                let count = frames as usize * self.channels;
                assert!(
                    start + count <= self.samples.capacity()
                        && self.packets.len() < self.packets.capacity(),
                    "bounded loopback exceeded"
                );
                if flags & AUDCLNT_BUFFERFLAGS_SILENT.0 as u32 != 0 {
                    self.samples.resize(start + count, 0.);
                } else {
                    self.samples
                        .extend_from_slice(std::slice::from_raw_parts(data.cast::<f32>(), count));
                }
                self.capture.ReleaseBuffer(frames).unwrap();
                self.packets.push(LoopbackPacket {
                    start_sample: start,
                    frames,
                    flags,
                    device_position: position,
                    qpc_100ns: qpc,
                });
            }
            panic!("bounded loopback packet drain exceeded");
        }
    }
}
impl Drop for Loopback {
    fn drop(&mut self) {
        unsafe {
            let _ = self.client.Stop();
            CoTaskMemFree(Some(self.format.cast()));
        }
    }
}
fn wav(samples: &[f32], rate: u32, channels: u16) -> Vec<u8> {
    let bytes = (samples.len() * 4) as u32;
    let mut out = Vec::with_capacity(44 + bytes as usize);
    out.extend_from_slice(b"RIFF");
    out.extend_from_slice(&(bytes + 36).to_le_bytes());
    out.extend_from_slice(b"WAVEfmt ");
    out.extend_from_slice(&16u32.to_le_bytes());
    out.extend_from_slice(&3u16.to_le_bytes());
    out.extend_from_slice(&channels.to_le_bytes());
    out.extend_from_slice(&rate.to_le_bytes());
    out.extend_from_slice(&(rate * channels as u32 * 4).to_le_bytes());
    out.extend_from_slice(&(channels * 4).to_le_bytes());
    out.extend_from_slice(&32u16.to_le_bytes());
    out.extend_from_slice(b"data");
    out.extend_from_slice(&bytes.to_le_bytes());
    for sample in samples {
        out.extend_from_slice(&sample.to_le_bytes());
    }
    out
}
#[test]
#[ignore = "requires root-controlled quiet interval, explicit admitted bank/output/report paths"]
fn initialized_live_piano_submission_and_loopback_latency() {
    let sfz = std::fs::canonicalize(PathBuf::from(
        std::env::var("VIEWER_AUDIO_DIAGNOSTIC_SFZ").expect("explicit bank"),
    ))
    .unwrap();
    let device = std::env::var("VIEWER_AUDIO_DIAGNOSTIC_OUTPUT_ID").expect("explicit output");
    assert!(!device.is_empty());
    let dir = PathBuf::from(
        std::env::var("VIEWER_AUDIO_DIAGNOSTIC_REPORT_DIR").expect("explicit private report"),
    );
    std::fs::create_dir_all(&dir).unwrap();
    let mode =
        std::env::var("VIEWER_AUDIO_DIAGNOSTIC_QUEUE_MODE").unwrap_or_else(|_| "bounded".into());
    assert!(mode == "bounded" || mode == "capacity-baseline");
    let tier = std::env::var("VIEWER_AUDIO_DIAGNOSTIC_TIER")
        .unwrap_or_else(|_| "0".into())
        .parse::<u8>()
        .unwrap();
    assert!(tier <= 3);
    let mut loopback = Loopback::open(&device);
    let bus = Arc::new(mixer::MidiBus::default());
    let mailbox = Arc::new(mixer::CueMailbox::default());
    let mut host = platform::Host::open(
        &Config {
            enabled: true,
            sfz: Some(sfz.clone()),
            device,
            tier,
        },
        bus.clone(),
        mailbox,
        Arc::new(mixer::Volumes::with_gains(0.04, 1.0)),
    )
    .unwrap();
    let initial = host.status();
    assert_eq!(
        (initial.sample_rate, host.channels() as usize),
        (loopback.rate, loopback.channels)
    );
    let stream_latency = host.stream_latency_100ns().unwrap();
    host.capture(6).unwrap();
    bus.enable(true);
    bus.connect(9876);
    let (qpc_anchor, app_anchor, anchor_uncertainty) = clock_anchor();
    let start = Instant::now();
    let producer_bus = bus.clone();
    let frames = host.frame_counter();
    let producer = std::thread::spawn(move || {
        let mut pattern = Vec::with_capacity(3);
        for (deadline, key) in [(400u64, 60), (447, 64), (509, 67)] {
            if let Some(remaining) =
                std::time::Duration::from_millis(deadline).checked_sub(start.elapsed())
            {
                std::thread::sleep(remaining);
            }
            let published = crate::midi_input::midi_clock();
            let frame = frames.load(std::sync::atomic::Ordering::Acquire);
            producer_bus.send(9876, 1, 1, key, 100);
            let after_enqueue = crate::midi_input::midi_clock();
            pattern.push((published, frame, key, after_enqueue));
        }
        if let Some(remaining) = std::time::Duration::from_millis(850).checked_sub(start.elapsed())
        {
            std::thread::sleep(remaining);
        }
        for key in [60, 64, 67] {
            producer_bus.send(9876, 2, 1, key, 0);
        }
        pattern
    });
    while start.elapsed().as_secs_f64() < 2.5 {
        host.pump().unwrap();
        loopback.drain();
    }
    let pattern = producer.join().unwrap();
    bus.clear();
    for _ in 0..16 {
        host.pump().unwrap();
        loopback.drain();
    }
    let final_status = host.status();
    let capture = host.take_capture().unwrap();
    host.close().unwrap();
    loopback.drain();
    bus.enable(false);
    assert!(!capture.over_capacity && !capture.pumps.is_empty());
    assert!(capture
        .samples
        .iter()
        .chain(&loopback.samples)
        .all(|v| v.is_finite()));
    let (published, rendered_before, _, after_enqueue) = pattern[0];
    let channels = loopback.channels;
    let source_start = rendered_before as usize * channels;
    let threshold = 0.00001f32;
    let source_first = capture.samples[source_start..]
        .iter()
        .position(|v| v.abs() > threshold)
        .map(|i| (source_start + i) / channels * channels)
        .expect("source piano signal");
    let source_frame = source_first / channels;
    let source_quiet_peak = capture.samples
        [source_start.saturating_sub(initial.sample_rate as usize / 5 * channels)..source_start]
        .iter()
        .fold(0f32, |p, v| p.max(v.abs()));
    let mut source_pump_start = 0usize;
    let mut source_observation = None;
    for pump in &capture.pumps {
        let end = source_pump_start + pump.submitted_frames as usize;
        if (source_pump_start..end).contains(&source_frame) {
            source_observation = Some((pump, source_pump_start));
            break;
        }
        source_pump_start = end;
    }
    let (pump, packet_start) = source_observation.unwrap();
    let source_frame_in_packet = source_frame - packet_start;
    let submission_estimate = pump.callback_micros as f64
        + (pump.padding_before as f64 + source_frame_in_packet as f64) * 1_000_000.
            / initial.sample_rate as f64;
    let qpc_to_app = |qpc: u64| app_anchor as f64 + (qpc as f64 - qpc_anchor as f64) / 10.;
    let mut loopback_first = None;
    let mut loopback_micros = None;
    let mut loopback_quiet_peak = 0f32;
    let mut quiet_frames = 0usize;
    let mut onset_timestamp_flags = 0u32;
    for packet in &loopback.packets {
        let index = packet.start_sample;
        let frames = packet.frames as usize;
        let packet_micros = qpc_to_app(packet.qpc_100ns);
        for i in 0..frames {
            let time = packet_micros + i as f64 * 1_000_000. / initial.sample_rate as f64;
            let peak = loopback.samples[index + i * channels..index + (i + 1) * channels]
                .iter()
                .fold(0f32, |p, v| p.max(v.abs()));
            if time >= published as f64 - 200_000. && time < published as f64 {
                loopback_quiet_peak = loopback_quiet_peak.max(peak);
                quiet_frames += 1;
            }
            if time >= published as f64 && loopback_first.is_none() && peak > threshold {
                loopback_first = Some(index + i * channels);
                loopback_micros = Some(time);
                onset_timestamp_flags = packet.flags;
            }
        }
    }
    let first = loopback_first.expect("loopback piano signal");
    // Includes the deliberately irregular three-note pattern, so a periodic
    // ambient C4 cannot pass only because its waveform begins with the same note.
    let count = (initial.sample_rate as usize * 16 / 100 * channels)
        .min(capture.samples.len() - source_first)
        .min(loopback.samples.len() - first);
    let signature_end = loopback_micros.unwrap()
        + count as f64 / channels as f64 * 1_000_000. / initial.sample_rate as f64;
    let quiet_lookback_frames = (((loopback_micros.unwrap() - published as f64 + 200_000.)
        * initial.sample_rate as f64
        / 1_000_000.)
        .ceil() as usize)
        .checked_add(initial.period_frames as usize)
        .unwrap();
    let sample_start = first.saturating_sub(quiet_lookback_frames.checked_mul(channels).unwrap());
    let sample_end = first
        .checked_add(count)
        .unwrap()
        .checked_add(initial.period_frames as usize * channels)
        .unwrap()
        .min(loopback.samples.len());
    let controls = capture_validation::validate(
        &loopback.packets,
        &capture_validation::Window {
            sample_start,
            sample_end,
            time_start_micros: published as f64 - 200_000.,
            time_end_micros: signature_end,
            qpc_anchor_100ns: qpc_anchor,
            app_anchor_micros: app_anchor,
            rate: initial.sample_rate,
            channels,
        },
    )
    .expect("bounded capture sample/QPC window");
    let (discontinuities, timestamp_errors, position_gaps, qpc_gaps) = (
        controls.data_discontinuity,
        controls.timestamp_error,
        controls.position_gaps,
        controls.qpc_gaps_over_100us,
    );
    let (submission_lower, submission_upper) = capture_validation::enqueue_to_submission_interval(
        published,
        after_enqueue,
        pump.released_micros,
    )
    .expect("common-clock enqueue bracket");
    let (mut xy, mut xx, mut yy) = (0f64, 0f64, 0f64);
    for (a, b) in capture.samples[source_first..source_first + count]
        .iter()
        .zip(&loopback.samples[first..first + count])
    {
        let (a, b) = (*a as f64, *b as f64);
        xy += a * b;
        xx += a * a;
        yy += b * b;
    }
    let correlation = xy / (xx * yy).sqrt();
    let attack_count =
        (initial.sample_rate as usize / 10 * channels).min(capture.samples.len() - source_first);
    let attack = &capture.samples[source_first..source_first + attack_count];
    let attack_peak = attack.iter().fold(0f32, |p, v| p.max(v.abs()));
    let relative_onsets = [0.01f32,0.05,0.10].map(|fraction| serde_json::json!({"fraction":fraction,"afterFirstSignalMs":attack.iter().position(|v|v.abs()>=attack_peak*fraction).map(|i|i as f64/channels as f64*1000./initial.sample_rate as f64)}));
    let mut report = serde_json::json!({"version":2,"scope":"separate-thread virtual native MIDI bus -> real selected source-host PCM and same-endpoint Windows loopback; not physical MIDI or ear","comparisonScope":"queue-policy-only baseline on the candidate mixer; not exact installed609 binary","queueMode":mode,"initial":initial,"final":final_status,"streamLatency100ns":stream_latency,"qpcAnchor100ns":qpc_anchor,"appAnchorMicros":app_anchor,"anchorUncertaintyMicros":anchor_uncertainty,"notePublishMicros":published,"notePattern":pattern,"renderedFramesBeforeNote":rendered_before,"sourceFirstSample":source_first,"sourceFirstSubmittedSequenceFrame":initial.queue_target_frames as u64+source_frame as u64,"sourcePacketCallbackMicros":pump.callback_micros,"sourcePacketReleasedMicros":pump.released_micros,"publishToActualSubmitMs":(pump.released_micros as f64-published as f64)/1000.,"sourcePacketPaddingFrames":pump.padding_before,"sourcePacketFrameOffset":source_frame_in_packet,"publishToQueuedPlaybackEstimateMs":(submission_estimate-published as f64)/1000.,"loopbackFirstSample":first,"loopbackFirstMicros":loopback_micros,"publishToLoopbackMs":(loopback_micros.unwrap()-published as f64)/1000.,"sourceQuietPeak":source_quiet_peak,"loopbackQuietPeak":loopback_quiet_peak,"quietCoverageFrames":quiet_frames,"attackPeak":attack_peak,"relativeAttackOnsets":relative_onsets,"signatureCorrelation":correlation,"signatureSampleCount":count,"timestampControls":{"dataDiscontinuity":discontinuities,"timestampError":timestamp_errors,"positionGaps":position_gaps,"qpcGapsOver100us":qpc_gaps,"onsetPacketFlags":onset_timestamp_flags,"signatureEndMicros":signature_end,"sampleIndexWindow":[sample_start,sample_end]},"pumps":capture.pumps,"loopbackPackets":loopback.packets,"settingsChanged":false,"driverChanged":false,"physicalAcceptance":false});
    report["noteEnqueueBracketMicros"] = serde_json::json!([published, after_enqueue]);
    report["enqueueToSubmissionIntervalMs"] = serde_json::json!([
        submission_lower as f64 / 1000.,
        submission_upper as f64 / 1000.,
    ]);
    std::fs::write(
        dir.join("submitted-piano.wav"),
        wav(&capture.samples, initial.sample_rate, channels as u16),
    )
    .unwrap();
    std::fs::write(
        dir.join("loopback-piano.wav"),
        wav(&loopback.samples, initial.sample_rate, channels as u16),
    )
    .unwrap();
    std::fs::write(
        dir.join("live-latency.json"),
        serde_json::to_vec_pretty(&report).unwrap(),
    )
    .unwrap();
    assert!(
        source_quiet_peak < threshold && loopback_quiet_peak < threshold,
        "nonquiet baseline: refuse ambiguous onset; receipt retained"
    );
    assert!(
        correlation > 0.8,
        "ambiguous loopback signature {correlation}; receipt retained"
    );
    assert!(
        quiet_frames >= initial.sample_rate as usize * 19 / 100,
        "missing actual quiet capture coverage; receipt retained"
    );
    assert_eq!(
        count,
        initial.sample_rate as usize * 16 / 100 * channels,
        "incomplete signature capture; receipt retained"
    );
    assert!(
        anchor_uncertainty < 1000,
        "clock anchor uncertainty exceeded1ms"
    );
    assert_eq!(
        onset_timestamp_flags & AUDCLNT_BUFFERFLAGS_TIMESTAMP_ERROR.0 as u32,
        0,
        "onset packet timestamp invalid; receipt retained"
    );
    assert_eq!(
        (discontinuities, timestamp_errors, position_gaps, qpc_gaps),
        (0, 0, 0, 0),
        "capture timestamp/continuity failed in quiet/onset/signature window; receipt retained"
    );
}
