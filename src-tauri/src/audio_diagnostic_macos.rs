//! Opt-in runner/device qualification with a test-owned tiny instrument.
//! No bank download, input/default-output/sample-rate/driver changes.
use super::{hal, lifecycle, mixer, platform, Config};
use std::{
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    time::Instant,
};
#[test]
#[ignore = "requires explicit native CoreAudio diagnostic opt-in and private report directory"]
fn initialized_macos_stream_buffer_restore() {
    let directory = PathBuf::from(
        std::env::var("VIEWER_AUDIO_DIAGNOSTIC_REPORT_DIR")
            .expect("explicit private report directory required"),
    );
    std::fs::create_dir_all(&directory).unwrap();
    std::fs::write(directory.join("macos-stream-diagnostic.json"),serde_json::to_vec_pretty(&serde_json::json!({"version":1,"result":"started","scope":"opt-in actual CoreAudio diagnostic; missing final receipt is failure"})).unwrap()).unwrap();
    let outputs = platform::outputs().expect("CoreAudio enumeration");
    if outputs.outputs.is_empty() {
        std::fs::write(directory.join("macos-stream-diagnostic.json"),serde_json::to_vec_pretty(&serde_json::json!({"version":1,"result":"unavailable","reason":"CoreAudio reports no active render outputs on this runner","physicalAcceptance":false,"settingsChanged":false})).unwrap()).unwrap();
        return;
    }
    let id = std::env::var("VIEWER_AUDIO_DIAGNOSTIC_OUTPUT_ID")
        .ok()
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| outputs.outputs[0].id.clone());
    let name = id.strip_prefix("coreaudio:").expect("Mac output identity");
    let selected = hal::HalDevice::by_name(name).unwrap();
    let uid = selected.uid().to_string();
    let original = selected.current().unwrap();
    let rate = selected.rate().unwrap();
    let frames = 48000u32;
    let mut wav = Vec::with_capacity(44 + frames as usize * 2);
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
    for i in 0..frames {
        let v = (8000.0 * (i as f32 * 440.0 * std::f32::consts::TAU / 48000.0).sin()) as i16;
        wav.extend_from_slice(&v.to_le_bytes());
    }
    std::fs::write(directory.join("fixture.wav"), wav).unwrap();
    std::fs::write(
        directory.join("fixture.sfz"),
        "<region> sample=fixture.wav key=60 loop_mode=loop_continuous ampeg_release=0.01",
    )
    .unwrap();
    let sfz = directory.join("fixture.sfz");
    let bus = Arc::new(mixer::MidiBus::default());
    let mailbox = Arc::new(mixer::CueMailbox::default());
    let gain = Arc::new(mixer::Volumes::with_gains(0.15, 1.0));
    // Initialization failure after the buffer lease must undo its own change.
    let missing = Config {
        enabled: true,
        sfz: Some(directory.join("missing.sfz")),
        device: id.clone(),
        tier: 0,
    };
    assert!(platform::Host::open(&missing, bus.clone(), mailbox.clone(), gain.clone()).is_err());
    assert_eq!(selected.current().unwrap(), original);
    let config = Config {
        enabled: true,
        sfz: Some(sfz.clone()),
        device: id.clone(),
        tier: 0,
    };
    let mut host = platform::Host::open(&config, bus.clone(), mailbox.clone(), gain.clone())
        .expect("selected CoreAudio initialized stream");
    bus.enable(true);
    bus.connect(100);
    // Prove the sampler independently: no cue exists during this interval.
    let piano_start = host.status().rendered_frames as usize;
    bus.send(100, 1, 1, 60, 90);
    let piano_begin = Instant::now();
    while piano_begin.elapsed().as_secs_f64() < 0.5 {
        host.pump().unwrap();
    }
    let piano_end = host.status().rendered_frames as usize;
    let stop = Arc::new(AtomicBool::new(false));
    let cue = Box::new(mixer::Cue::new(
        host.status().sample_rate,
        lifecycle::Request::new("", 180.0, 1200.0, 0.0).unwrap(),
        stop.clone(),
    ));
    let onset = cue.onset.clone();
    assert!(mailbox.publish(cue).is_ok());
    let begin = Instant::now();
    let mut off = false;
    let mut panic = false;
    while begin.elapsed().as_secs_f64() < 2.5 {
        if begin.elapsed().as_secs_f64() > 0.8 && !off {
            bus.send(100, 3, 1, 64, 127);
            bus.send(100, 2, 1, 60, 0);
            off = true;
        }
        if begin.elapsed().as_secs_f64() > 1.5 && !panic {
            bus.clear();
            stop.store(true, Ordering::Release);
            panic = true;
        }
        host.pump().unwrap();
        mailbox.reclaim();
    }
    let status = host.status();
    let capture = host
        .take_capture()
        .unwrap()
        .expect("preallocated submitted PCM capture");
    drop(host);
    mailbox.reset();
    bus.enable(false);
    assert_eq!(selected.current().unwrap(), original);
    assert_eq!(selected.uid(), uid);
    assert_eq!(selected.rate().unwrap(), rate);
    assert!(onset.load(Ordering::Acquire) > 0);
    assert!(capture.samples[..capture.len].iter().all(|v| v.is_finite()));
    assert!(capture.samples[..capture.len]
        .iter()
        .any(|v| v.abs() > 0.001));
    let samples = &capture.samples[..capture.len];
    let piano_start_sample = piano_start * capture.channels;
    let piano_end_sample = piano_end * capture.channels;
    assert!(piano_end_sample <= samples.len());
    assert!(
        piano_end_sample.saturating_sub(piano_start_sample)
            >= (status.sample_rate as f64 * capture.channels as f64 * 0.4) as usize
    );
    let piano_only = &samples[piano_start_sample..piano_end_sample];
    let piano_peak = piano_only.iter().fold(0f32, |p, v| p.max(v.abs()));
    assert!(piano_only.iter().all(|v| v.is_finite()));
    assert!(
        piano_peak > 0.001,
        "Piano-only phase must contain sampler PCM"
    );
    let tail = &samples[samples
        .len()
        .saturating_sub(status.sample_rate as usize * capture.channels / 2)..];
    let tail_peak = tail.iter().fold(0f32, |p, v| p.max(v.abs()));
    assert!(tail_peak < 0.00001);
    // Reconfigure to another tier, then explicit disable/close restores the same
    // original. Host Drop separately covers the normal worker-shutdown path.
    let mut high = config.clone();
    high.tier = 2;
    let mut host = platform::Host::open(&high, bus.clone(), mailbox.clone(), gain.clone()).unwrap();
    for _ in 0..4 {
        host.pump().unwrap();
    }
    let high_status = host.status();
    host.close().unwrap();
    drop(host);
    assert_eq!(selected.current().unwrap(), original);
    {
        let mut host = platform::Host::open(&config, bus.clone(), mailbox.clone(), gain).unwrap();
        for _ in 0..4 {
            host.pump().unwrap();
        }
    }
    assert_eq!(selected.current().unwrap(), original);
    assert_eq!(selected.rate().unwrap(), rate);
    let mut pcm = Vec::with_capacity(44 + samples.len() * 4);
    let bytes = (samples.len() * 4) as u32;
    pcm.extend_from_slice(b"RIFF");
    pcm.extend_from_slice(&(bytes + 36).to_le_bytes());
    pcm.extend_from_slice(b"WAVEfmt ");
    pcm.extend_from_slice(&16u32.to_le_bytes());
    pcm.extend_from_slice(&3u16.to_le_bytes());
    pcm.extend_from_slice(&(capture.channels as u16).to_le_bytes());
    pcm.extend_from_slice(&status.sample_rate.to_le_bytes());
    pcm.extend_from_slice(&(status.sample_rate * capture.channels as u32 * 4).to_le_bytes());
    pcm.extend_from_slice(&(capture.channels as u16 * 4).to_le_bytes());
    pcm.extend_from_slice(&32u16.to_le_bytes());
    pcm.extend_from_slice(b"data");
    pcm.extend_from_slice(&bytes.to_le_bytes());
    for v in samples {
        pcm.extend_from_slice(&v.to_le_bytes());
    }
    std::fs::write(directory.join("submitted-pcm.wav"), pcm).unwrap();
    let report = serde_json::json!({"version":1,"result":"passed","scope":"actual CoreAudio + tiny test-owned sampler/virtual MIDI; submitted float PCM","outputUid":uid,"outputName":name,"originalBufferFrames":original,"originalRate":rate,"samplerMaxBlockFrames":mixer::MAX_BLOCK,"low":status,"high":high_status,"finalBufferFrames":selected.current().unwrap(),"finalRate":selected.rate().unwrap(),"initializationFailureRestored":true,"explicitCloseRestored":true,"reconfigureRestored":true,"dropShutdownRestored":true,"pianoOnly":{"startFrame":piano_start,"endFrame":piano_end,"startSample":piano_start_sample,"endSample":piano_end_sample,"peak":piano_peak,"scope":"before cue publication"},"panicTrailingPeak":tail_peak,"sampleCount":samples.len(),"physicalAcceptance":false,"sampleRateDefaultOrDriverChanges":false,"normalAppExitHookAcceptance":"source lifecycle hook; this diagnostic exercises Host drop/explicit close"});
    std::fs::write(
        directory.join("macos-stream-diagnostic.json"),
        serde_json::to_vec_pretty(&report).unwrap(),
    )
    .unwrap();
}
