//! Persistent CoreAudio HAL at the existing rate, with explicit reversible
//! selected-device buffer ownership. CPAL Default avoids an untracked property write.
use super::{buffer_lease, hal, mixer, AudioStatus, Config, Output, Outputs};
use cpal::{
    traits::{DeviceTrait, HostTrait, StreamTrait},
    SampleFormat,
};
use std::{
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
        Arc,
    },
    time::Duration,
};
fn error(e: impl std::fmt::Display) -> String {
    format!("CoreAudio could not open/play: {e}. Select an available output.")
}
pub fn outputs() -> Result<Outputs, String> {
    let host = cpal::default_host();
    let mut outputs = Vec::new();
    for device in host.output_devices().map_err(error)? {
        let name = device.name().map_err(error)?;
        outputs.push(Output {
            id: format!("coreaudio:{name}"),
            name,
        });
    }
    Ok(Outputs {
        supported: true,
        outputs,
    })
}
fn device(identity: &str) -> Result<cpal::Device, String> {
    let host = cpal::default_host();
    let name = if identity.is_empty() {
        host.default_output_device()
            .ok_or_else(|| error("no default output"))?
            .name()
            .map_err(error)?
    } else {
        identity
            .strip_prefix("coreaudio:")
            .ok_or_else(|| error("select a Mac output"))?
            .into()
    };
    let mut matches = host
        .output_devices()
        .map_err(error)?
        .filter(|d| d.name().ok().as_deref() == Some(name.as_str()));
    let selected = matches
        .next()
        .ok_or_else(|| error("the selected output is missing"))?;
    if matches.next().is_some() {
        return Err(error(
            "several outputs have this name; choose a unique output",
        ));
    }
    Ok(selected)
}
pub struct Host {
    stream: Option<cpal::Stream>,
    mixer: Arc<mixer::SharedMixer>,
    status: AudioStatus,
    last: Arc<AtomicU64>,
    period: Arc<AtomicU64>,
    frames: Arc<AtomicU64>,
    peak: Arc<AtomicU64>,
    failed: Arc<AtomicBool>,
    bus: Arc<mixer::MidiBus>,
    lease: Option<buffer_lease::Lease<hal::HalDevice>>,
    closed: bool,
}
impl Host {
    pub fn open(
        config: &Config,
        bus: Arc<mixer::MidiBus>,
        mailbox: Arc<mixer::CueMailbox>,
        volume: Arc<mixer::Volumes>,
    ) -> Result<Self, String> {
        let device = device(&config.device)?;
        let supported = device.default_output_config().map_err(error)?;
        let mut stream_config = supported.config();
        stream_config.buffer_size = cpal::BufferSize::Default;
        let rate = stream_config.sample_rate.0;
        let channels = stream_config.channels as usize;
        if channels == 0 || channels > 256 || rate < 8000 || rate > 384000 {
            return Err(error("invalid rate or channel count"));
        }
        let name = device.name().map_err(error)?;
        let hal = hal::HalDevice::by_name(&name)?;
        let uid = hal.uid().to_string();
        let (mut lease, chosen, fallback) = if config.enabled {
            hal.request(rate, config.tier)?
        } else {
            (None, hal.current()?, None)
        };
        let opened = (|| {
            let synth: Option<Box<dyn mixer::Synth>> = if config.enabled {
                Some(Box::new(crate::piano_engine::PianoEngine::new(
                    config.sfz.as_deref().ok_or("Piano is not installed")?,
                    rate,
                    mixer::MAX_BLOCK,
                )?))
            } else {
                None
            };
            let mut render = mixer::Mixer::new(synth, bus.clone(), mailbox, volume).at_rate(rate);
            #[cfg(test)]
            if std::env::var_os("VIEWER_AUDIO_DIAGNOSTIC_REPORT_DIR").is_some() {
                if channels > 8 || rate > 96000 {
                    return Err(error("Output exceeds bounded diagnostic capture"));
                }
                render.enable_capture(rate, channels, 8);
            }
            let shared = Arc::new(mixer::SharedMixer::new(render));
            let (frames, peak) = shared.counters();
            let last = Arc::new(AtomicU64::new(crate::midi_input::midi_clock()));
            let period = Arc::new(AtomicU64::new(0));
            let failed = Arc::new(AtomicBool::new(false));
            macro_rules! build {
                ($sample:ty,$convert:expr) => {{
                    let mixer = shared.clone();
                    let last = last.clone();
                    let period = period.clone();
                    let callback_failed = failed.clone();
                    let stream_failed = failed.clone();
                    device
                        .build_output_stream(
                            &stream_config,
                            move |data: &mut [$sample], info: &cpal::OutputCallbackInfo| {
                                let now = crate::midi_input::midi_clock();
                                last.store(now, Ordering::Release);
                                period.store((data.len() / channels) as u64, Ordering::Relaxed);
                                let stamp = info.timestamp();
                                if let Some(delay) = stamp.playback.duration_since(&stamp.callback)
                                {
                                    mixer.render(
                                        data,
                                        channels,
                                        now,
                                        delay.as_micros() as u64,
                                        $convert,
                                    );
                                } else {
                                    data.fill(($convert)(0.0));
                                    callback_failed.store(true, Ordering::Release);
                                }
                            },
                            move |_| {
                                stream_failed.store(true, Ordering::Release);
                            },
                            None,
                        )
                        .map_err(error)?
                }};
            }
            let stream = match supported.sample_format() {
                SampleFormat::F32 => build!(f32, |v: f32| v),
                SampleFormat::I16 => build!(i16, |v: f32| (v * i16::MAX as f32).round() as i16),
                other => return Err(error(format!("unsupported sample format {other}"))),
            };
            stream.play().map_err(error)?;
            let status = AudioStatus {
                enabled: config.enabled,
                ready: config.sfz.is_some(),
                running: true,
                device: config.device.clone(),
                sample_rate: rate,
                mode: "coreaudio-hal-current".into(),
                output_uid: uid,
                period_frames: chosen,
                buffer_frames: chosen,
                latency_tier: config.tier,
                fallback,
                ..Default::default()
            };
            Ok((
                stream, shared, status, last, period, frames, peak, failed, bus,
            ))
        })();
        match opened {
            Ok((stream, mixer, status, last, period, frames, peak, failed, bus)) => Ok(Self {
                stream: Some(stream),
                mixer,
                status,
                last,
                period,
                frames,
                peak,
                failed,
                bus,
                lease,
                closed: false,
            }),
            Err(e) => {
                if let Some(lease) = lease.as_mut() {
                    if let Err(restore) = lease.restore() {
                        return Err(format!(
                            "{e}; original output buffer restoration failed: {restore}"
                        ));
                    }
                }
                Err(e)
            }
        }
    }
    pub fn pump(&mut self) -> Result<(), String> {
        std::thread::sleep(Duration::from_millis(5));
        if self.failed.load(Ordering::Acquire) {
            return Err(error(
                "the stream failed or supplied an invalid playback clock",
            ));
        }
        if crate::midi_input::midi_clock().saturating_sub(self.last.load(Ordering::Acquire))
            > 500_000
        {
            return Err(error(
                "audio output stopped; reconnect or select another output",
            ));
        }
        Ok(())
    }
    pub fn status(&self) -> AudioStatus {
        let mut s = self.status.clone();
        let frames = self.period.load(Ordering::Relaxed) as u32;
        if frames > 0 {
            s.period_frames = frames;
            s.buffer_frames = frames;
        }
        s.rendered_frames = self.frames.load(Ordering::Relaxed);
        s.peak = f64::from_bits(self.peak.load(Ordering::Relaxed));
        (s.limited_frames, s.limiter_gain) = self.mixer.limiter();
        s.queue_overflow = self.bus.overflow.load(Ordering::Relaxed);
        s
    }
    #[cfg(test)]
    pub fn take_capture(&mut self) -> Result<Option<mixer::Capture>, String> {
        self.close()?;
        Ok(self.mixer.take_capture_after_close())
    }
    pub fn close(&mut self) -> Result<(), String> {
        if !self.closed {
            if let Some(stream) = self.stream.take() {
                let _ = stream.pause();
                drop(stream);
            }
            self.mixer.close();
            self.closed = true;
        }
        if let Some(lease) = self.lease.as_mut() {
            lease.restore()?;
        }
        self.status.running = false;
        Ok(())
    }
}
impl Drop for Host {
    fn drop(&mut self) {
        let _ = self.close(); /* Last mixer Arc, synth/cue/scratch released here on worker. */
    }
}
