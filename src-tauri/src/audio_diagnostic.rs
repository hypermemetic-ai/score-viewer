//! Explicitly invoked native device test; never opens a device in ordinary CI.
//! It records submitted PCM, not loopback/sound-to-ear latency or human acceptance.
use super::{lifecycle, mixer, platform, Config};
use std::{
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    time::Instant,
};

#[test]
#[ignore = "requires explicit verified bank/output/report paths and an authorized native device"]
fn initialized_windows_stream_and_virtual_midi_pcm() {
    let sfz = std::fs::canonicalize(PathBuf::from(
        std::env::var("VIEWER_AUDIO_DIAGNOSTIC_SFZ").expect("explicit admitted SFZ required"),
    ))
    .expect("canonical admitted SFZ, matching installer path form");
    let device = std::env::var("VIEWER_AUDIO_DIAGNOSTIC_OUTPUT_ID")
        .expect("explicit render endpoint required");
    assert!(!device.is_empty());
    let directory = PathBuf::from(
        std::env::var("VIEWER_AUDIO_DIAGNOSTIC_REPORT_DIR")
            .expect("explicit private report directory required"),
    );
    std::fs::create_dir_all(&directory).unwrap();
    let bus = Arc::new(mixer::MidiBus::default());
    let mailbox = Arc::new(mixer::CueMailbox::default());
    let volume = Arc::new(mixer::Volumes::with_gains(0.15, 1.0));
    let baseline = Instant::now();
    let mut host = platform::Host::open(
        &Config {
            enabled: true,
            sfz: Some(sfz.clone()),
            device,
            tier: 0,
        },
        bus.clone(),
        mailbox.clone(),
        volume,
    )
    .expect("initialized selected output");
    let load_ms = baseline.elapsed().as_secs_f64() * 1000.0;
    host.capture(12).unwrap();
    let initial = host.status();
    let channels = host.channels();
    bus.enable(true);
    bus.connect(99);
    let stop = Arc::new(AtomicBool::new(false));
    let cue = Box::new(mixer::Cue::new(
        initial.sample_rate,
        lifecycle::Request::new("", 180.0, 1800.0, 0.0).unwrap(),
        stop.clone(),
    ));
    let onset = cue.onset.clone();
    assert!(mailbox.publish(cue).is_ok());
    // Finite schedule exercises velocity-zero off, overlap, half/full sustain,
    // per-channel resets, stale-generation rejection, queue overflow and panic.
    let schedule = [
        (100, 1, 1, 60, 80),
        (350, 1, 1, 60, 0),
        (600, 3, 1, 64, 127),
        (700, 1, 1, 48, 90),
        (700, 1, 1, 55, 90),
        (700, 1, 1, 64, 90),
        (1300, 2, 1, 48, 0),
        (1300, 2, 1, 55, 0),
        (1300, 2, 1, 64, 0),
        (1600, 3, 1, 64, 80),
        (1800, 3, 1, 64, 0),
        (2200, 1, 1, 60, 80),
        (2300, 1, 2, 60, 100),
        (2500, 2, 1, 60, 0),
        (2800, 2, 2, 60, 0),
        (3200, 1, 1, 67, 80),
        (3300, 3, 1, 123, 0),
    ];
    let start = Instant::now();
    let mut next = 0;
    let mut overflow = false;
    let mut disconnected = false;
    let mut panicked = false;
    let mut callbacks = 0u64;
    let mut late_intervals = 0u64;
    let mut max_pump_ms = 0f64;
    let mut previous_frames = initial.rendered_frames;
    let mut previous = Instant::now();
    let expected = initial.period_frames as f64 / initial.sample_rate as f64;
    while start.elapsed().as_secs_f64() < 9.0 {
        let elapsed = start.elapsed().as_millis() as u64;
        while next < schedule.len() && elapsed >= schedule[next].0 {
            let (_, kind, ch, key, value) = schedule[next];
            bus.send(99, kind, ch, key, value);
            next += 1;
        }
        if elapsed >= 3600 && !overflow {
            for _ in 0..1100 {
                bus.send(99, 1, 1, 72, 75);
            }
            overflow = true;
        }
        if elapsed >= 4200 && !disconnected {
            bus.disconnect(99);
            bus.send(99, 1, 1, 74, 100);
            disconnected = true;
        }
        if elapsed >= 5000 && !panicked {
            bus.clear();
            stop.store(true, Ordering::Release);
            panicked = true;
        }
        let before = Instant::now();
        host.pump().unwrap();
        max_pump_ms = max_pump_ms.max(before.elapsed().as_secs_f64() * 1000.0);
        let current = host.status().rendered_frames;
        if current != previous_frames {
            callbacks += 1;
            let gap = previous.elapsed().as_secs_f64();
            if gap > expected * 2.0 + 0.002 {
                late_intervals += 1;
            }
            previous = Instant::now();
            previous_frames = current;
        }
        mailbox.reclaim();
    }
    let final_status = host.status();
    let capture = host.take_capture().unwrap();
    assert!(!capture.over_capacity);
    drop(host);
    bus.enable(false);
    mailbox.reset();
    assert!(capture.samples.iter().all(|v| v.is_finite()));
    assert!(capture.samples.iter().any(|v| v.abs() > 0.001));
    assert!(final_status.queue_overflow > 0);
    assert!(onset.load(Ordering::Acquire) > 0);
    let trailing = &capture.samples[capture
        .samples
        .len()
        .saturating_sub(initial.sample_rate as usize * channels as usize)..];
    let trailing_peak = trailing.iter().fold(0f32, |p, v| p.max(v.abs()));
    assert!(
        trailing_peak < 0.00001,
        "panic left audio playing: {trailing_peak}"
    );
    let mut wav = Vec::with_capacity(44 + capture.samples.len() * 4);
    let bytes = (capture.samples.len() * 4) as u32;
    wav.extend_from_slice(b"RIFF");
    wav.extend_from_slice(&(bytes + 36).to_le_bytes());
    wav.extend_from_slice(b"WAVEfmt ");
    wav.extend_from_slice(&16u32.to_le_bytes());
    wav.extend_from_slice(&3u16.to_le_bytes());
    wav.extend_from_slice(&channels.to_le_bytes());
    wav.extend_from_slice(&initial.sample_rate.to_le_bytes());
    wav.extend_from_slice(&(initial.sample_rate * channels as u32 * 4).to_le_bytes());
    wav.extend_from_slice(&(channels * 4).to_le_bytes());
    wav.extend_from_slice(&32u16.to_le_bytes());
    wav.extend_from_slice(b"data");
    wav.extend_from_slice(&bytes.to_le_bytes());
    for sample in &capture.samples {
        wav.extend_from_slice(&sample.to_le_bytes());
    }
    std::fs::write(directory.join("submitted-pcm.wav"), wav).unwrap();
    let mut render_ms = capture.render_ms.clone();
    render_ms.sort_by(f64::total_cmp);
    let percentile =
        |p: f64| render_ms[((render_ms.len().saturating_sub(1)) as f64 * p).round() as usize];
    let period_ms = initial.period_frames as f64 / initial.sample_rate as f64 * 1000.0;
    let over_period = render_ms.iter().filter(|v| **v > period_ms).count();
    let report = serde_json::json!({"version":1,"scope":"initialized selected WASAPI + bounded virtual MIDI, submitted PCM only","sfz":sfz,"initial":initial,"final":final_status,"loadMs":load_ms,"samplerMaxBlockFrames":mixer::MAX_BLOCK,"channels":channels,"sampleCount":capture.samples.len(),"callbackTransfers":callbacks,"lateWakeIntervals":late_intervals,"maxPumpIncludingWaitMs":max_pump_ms,"renderTransferMs":{"count":render_ms.len(),"p50":percentile(0.5),"p95":percentile(0.95),"p99":percentile(0.99),"max":render_ms.last(),"overActualPeriod":over_period,"scope":"GetBuffer/mixer/PCM-capture/ReleaseBuffer, stopwatch not sound-to-ear latency"},"pumps":capture.pumps,"panicTrailingPeak":trailing_peak,"cueOnsetMicros":onset.load(Ordering::Acquire),"streamStopped":true,"synthDroppedOffCallback":true,"physicalMidiAudioAcceptance":false,"settingsChanged":false,"driverChanged":false});
    std::fs::write(
        directory.join("stream-diagnostic.json"),
        serde_json::to_vec_pretty(&report).unwrap(),
    )
    .unwrap();
}
