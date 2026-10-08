//! App-local CoreAudio HAL output. No input, loopback, default-device or routing writes.
use super::{Output, Outputs, lifecycle, metronome};
use cpal::{traits::{DeviceTrait, HostTrait, StreamTrait}, SampleFormat};
use std::{sync::{Arc, atomic::{AtomicU64, Ordering}, mpsc}, time::Duration};
use tauri::Emitter;

fn audio_error(error: impl std::fmt::Display) -> String {
    format!("Could not play the metronome: {error}. Choose an available audio output and test it.")
}

pub fn outputs() -> Result<Outputs, String> {
    let host = cpal::default_host();
    let mut outputs = Vec::new();
    for device in host.output_devices().map_err(audio_error)? {
        let name = device.name().map_err(audio_error)?;
        // CPAL 0.16 exposes friendly names, not persistent hardware UIDs.
        // Opening below demands a unique current match; never reuse numeric indices.
        outputs.push(Output { id: format!("coreaudio:{name}"), name });
    }
    Ok(Outputs { supported: true, outputs })
}

fn device(identity: &str) -> Result<cpal::Device, String> {
    let host = cpal::default_host();
    let name = if identity.is_empty() {
        host.default_output_device().ok_or_else(|| audio_error("no default output"))?
            .name().map_err(audio_error)?
    } else {
        identity.strip_prefix("coreaudio:").ok_or_else(||
            audio_error("this output belongs to another platform; select a Mac output"))?.into()
    };
    // An enumerated explicit device also receives CoreAudio disconnect monitoring.
    let mut matches = host.output_devices().map_err(audio_error)?
        .filter(|d| d.name().ok().as_deref() == Some(name.as_str()));
    let selected = matches.next().ok_or_else(|| audio_error("the selected output is missing"))?;
    if matches.next().is_some() {
        return Err(audio_error("several outputs have this name; choose a uniquely named output"));
    }
    Ok(selected)
}

pub fn play(app: tauri::AppHandle, session: lifecycle::Session, identity: String, request: lifecycle::Request) {
    let result = (|| {
        if session.cancelled() { return Ok(()); }
        let device = device(&identity)?;
        let supported = device.default_output_config().map_err(audio_error)?;
        let mut config = supported.config();
        // Adopt the existing rate, channel count and buffer size. Never set
        // a device sample rate/buffer size on behalf of another audio host.
        config.buffer_size = cpal::BufferSize::Default;
        if config.channels == 0 || config.channels > 256 || config.sample_rate.0 == 0 {
            return Err(audio_error("the output has an invalid sample rate or channel count"));
        }
        let channels = config.channels as usize;
        let rate = config.sample_rate.0;
        let (origin_tx, origin_rx) = mpsc::sync_channel(1);
        let (error_tx, error_rx) = mpsc::sync_channel(1);
        let last_callback = Arc::new(AtomicU64::new(0));
        let error_callback = move |error| { let _ = error_tx.try_send(audio_error(error)); };
        macro_rules! stream {
            ($sample:ty, $convert:expr) => {{
                let mut source = metronome::Metronome::new_with_grid(rate, request.bpm, request.duration_ms, request.count_step_ms,request.grid.clone());
                let callback_stop = session.stop_signal();
                let callback_clock = last_callback.clone();
                let mut first = true;
                device.build_output_stream(&config,
                    move |data: &mut [$sample], info: &cpal::OutputCallbackInfo| {
                        if callback_stop.load(Ordering::Acquire) {
                            data.fill(($convert)(0.0)); return;
                        }
                        let now = crate::midi_input::midi_clock();
                        callback_clock.store(now, Ordering::Release);
                        if first {
                            first = false;
                            let stamp = info.timestamp();
                            let delay = stamp.playback.duration_since(&stamp.callback)
                                .map(|d|d.as_micros() as u64);
                            let onset = delay.and_then(|d| if let Some(target)=request.repeat_start_micros {
                                now.checked_add(d).and_then(|playback|source.repeat_timeline_full_count(playback,0,target,request.full_repeat_count_in))
                            }else{metronome::onset_micros(now,d)});
                            let _ = origin_tx.try_send(onset);
                            if onset.is_none(){data.fill(($convert)(0.0));return;}
                        }
                        source.fill(data, channels, $convert);
                    }, error_callback, None).map_err(audio_error)?
            }};
        }
        let stream = match supported.sample_format() {
            SampleFormat::F32 => stream!(f32, |v: f32| v),
            SampleFormat::I16 => stream!(i16, |v: f32| (v * i16::MAX as f32).round() as i16),
            other => return Err(audio_error(format!("unsupported output sample format {other}"))),
        };
        stream.play().map_err(audio_error)?;
        let onset = origin_rx.recv_timeout(Duration::from_secs(2))
            .map_err(|_|audio_error("the output did not start"))?
            .ok_or_else(||audio_error("the output supplied an invalid playback clock"))?;
        if !session.started(onset) { return Ok(()); }
        let end = onset.saturating_add((request.duration_ms * 1000.0).ceil() as u64);
        loop {
            if let Ok(message) = error_rx.try_recv() { return Err(message); }
            let now = crate::midi_input::midi_clock();
            if session.cancelled() || now >= end { break; }
            if now.saturating_sub(last_callback.load(Ordering::Acquire)) > 500_000 {
                return Err(audio_error("audio output stopped; reconnect or select another output"));
            }
            std::thread::sleep(Duration::from_millis(5));
        }
        // Drop releases this app's stream; it never changes the system output.
        drop(stream);
        Ok(())
    })();
    if let Err(message) = result {
        session.failed(message, |message| { let _ = app.emit("viewer-audio-error", message); });
    }
    session.finish();
}
