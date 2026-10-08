//! Event-driven shared WASAPI. All COM objects remain on their owning MTA worker.
use super::{mixer, period, AudioStatus, Config, Output, Outputs};
use std::{
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc,
    },
    time::{Duration, Instant},
};
use windows::{
    core::{w, GUID, PCWSTR},
    Win32::{
        Foundation::{CloseHandle, HANDLE, PROPERTYKEY, WAIT_OBJECT_0, WAIT_TIMEOUT},
        Media::Audio::*,
        System::{
            Com::{
                StructuredStorage::{PropVariantClear, PropVariantToStringAlloc},
                *,
            },
            Threading::*,
        },
    },
};
fn error(e: windows::core::Error) -> String {
    format!("Shared Windows audio could not open/play: {e}. Select an available output.")
}
struct Com;
impl Com {
    unsafe fn enter() -> Result<Self, String> {
        CoInitializeEx(None, COINIT_MULTITHREADED)
            .ok()
            .map_err(error)?;
        Ok(Self)
    }
}
impl Drop for Com {
    fn drop(&mut self) {
        unsafe {
            CoUninitialize();
        }
    }
}
struct Format(*mut WAVEFORMATEX);
impl Drop for Format {
    fn drop(&mut self) {
        unsafe {
            CoTaskMemFree(Some(self.0.cast()));
        }
    }
}
struct Event(HANDLE);
impl Drop for Event {
    fn drop(&mut self) {
        unsafe {
            let _ = CloseHandle(self.0);
        }
    }
}
struct Mmcss(HANDLE);
impl Drop for Mmcss {
    fn drop(&mut self) {
        unsafe {
            let _ = AvRevertMmThreadCharacteristics(self.0);
        }
    }
}
unsafe fn endpoint(id: &str) -> Result<IMMDevice, String> {
    let e: IMMDeviceEnumerator =
        CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).map_err(error)?;
    if id.is_empty() {
        e.GetDefaultAudioEndpoint(eRender, eMultimedia)
            .map_err(error)
    } else {
        let wide: Vec<u16> = id.encode_utf16().chain(Some(0)).collect();
        e.GetDevice(PCWSTR(wide.as_ptr())).map_err(error)
    }
}
pub fn outputs() -> Result<Outputs, String> {
    unsafe {
        let _com = Com::enter()?;
        let e: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).map_err(error)?;
        let all = e
            .EnumAudioEndpoints(eRender, DEVICE_STATE_ACTIVE)
            .map_err(error)?;
        let mut outputs = vec![];
        for i in 0..all.GetCount().map_err(error)? {
            let d = all.Item(i).map_err(error)?;
            let id = d.GetId().map_err(error)?;
            let identity = id.to_string().map_err(|e| e.to_string())?;
            CoTaskMemFree(Some(id.0.cast()));
            let props = d.OpenPropertyStore(STGM_READ).map_err(error)?;
            let key = PROPERTYKEY {
                fmtid: GUID::from_u128(0xa45c254e_df1c_4efd_8020_67d146a850e0),
                pid: 14,
            };
            let mut value = props.GetValue(&key).map_err(error)?;
            let name = PropVariantToStringAlloc(&value);
            let label = match name {
                Ok(name) => {
                    let result = name.to_string().map_err(|e| e.to_string());
                    CoTaskMemFree(Some(name.0.cast()));
                    result
                }
                Err(e) => Err(error(e)),
            };
            let _ = PropVariantClear(&mut value);
            outputs.push(Output {
                id: identity,
                name: label?,
            });
        }
        Ok(Outputs {
            supported: true,
            outputs,
        })
    }
}

struct Opened {
    client: IAudioClient,
    format: Format,
    period: u32,
    raw: bool,
    mode: String,
    fallback: Option<String>,
}
unsafe fn client3(d: &IMMDevice, tier: u8, raw: bool) -> Result<Opened, String> {
    let c: IAudioClient3 = d.Activate(CLSCTX_ALL, None).map_err(error)?;
    let props = AudioClientProperties {
        cbSize: std::mem::size_of::<AudioClientProperties>() as u32,
        bIsOffload: false.into(),
        eCategory: AudioCategory_Media,
        Options: if raw {
            AUDCLNT_STREAMOPTIONS_RAW
        } else {
            AUDCLNT_STREAMOPTIONS_NONE
        },
    };
    c.SetClientProperties(&props).map_err(error)?;
    let mut format = Format(c.GetMixFormat().map_err(error)?);
    let mut default = 0;
    let mut fundamental = 0;
    let mut min = 0;
    let mut max = 0;
    c.GetSharedModeEnginePeriod(format.0, &mut default, &mut fundamental, &mut min, &mut max)
        .map_err(error)?;
    let requested = period::choose(
        (*format.0).nSamplesPerSec,
        fundamental,
        min,
        max,
        default,
        tier,
    )
    .ok_or("The audio driver supplied invalid shared periods")?;
    match c.InitializeSharedAudioStream(
        AUDCLNT_STREAMFLAGS_EVENTCALLBACK,
        requested,
        format.0,
        None,
    ) {
        Ok(()) => Ok(Opened {
            client: c.into(),
            format,
            period: requested,
            raw,
            mode: "wasapi-client3-event".into(),
            fallback: None,
        }),
        Err(first) => {
            // Existing hosts may lock engine format/period. A new uninitialized client
            // joins the current shared engine; never alter another host or endpoint.
            let mut current = std::ptr::null_mut();
            let mut frames = 0;
            c.GetCurrentSharedModeEnginePeriod(&mut current, &mut frames)
                .map_err(error)?;
            let current = Format(current);
            if current.0.is_null() || frames == 0 {
                return Err(error(first));
            }
            let fresh: IAudioClient3 = d.Activate(CLSCTX_ALL, None).map_err(error)?;
            fresh.SetClientProperties(&props).map_err(error)?;
            let (mut def, mut fun, mut lo, mut hi) = (0, 0, 0, 0);
            fresh
                .GetSharedModeEnginePeriod(current.0, &mut def, &mut fun, &mut lo, &mut hi)
                .map_err(error)?;
            if fun == 0 || frames < lo || frames > hi || frames % fun != 0 {
                return Err(error(first));
            }
            fresh
                .InitializeSharedAudioStream(
                    AUDCLNT_STREAMFLAGS_EVENTCALLBACK,
                    frames,
                    current.0,
                    None,
                )
                .map_err(error)?;
            format = current;
            Ok(Opened{client:fresh.into(),format,period:frames,raw,mode:"wasapi-client3-current-event".into(),fallback:Some(format!("Requested {requested}frames; joined current shared period {frames}frames ({first})."))})
        }
    }
}
unsafe fn open_client(d: &IMMDevice, tier: u8) -> Result<Opened, String> {
    match client3(d, tier, true) {
        Ok(o) => return Ok(o),
        Err(raw_error) => {
            match client3(d, tier, false) {
                Ok(mut o) => {
                    o.fallback = Some(format!(
                        "RAW unavailable: {raw_error}. {}",
                        o.fallback.unwrap_or_default()
                    ));
                    return Ok(o);
                }
                Err(normal_error) => {
                    // Compatibility path remains shared and event-driven at the driver's
                    // default period. It never restores the previous50ms polling allocation.
                    let c: IAudioClient = d.Activate(CLSCTX_ALL, None).map_err(error)?;
                    let format = Format(c.GetMixFormat().map_err(error)?);
                    let mut default = 0;
                    c.GetDevicePeriod(Some(&mut default), None).map_err(error)?;
                    c.Initialize(
                        AUDCLNT_SHAREMODE_SHARED,
                        AUDCLNT_STREAMFLAGS_EVENTCALLBACK,
                        0,
                        0,
                        format.0,
                        None,
                    )
                    .map_err(error)?;
                    let frames = ((default as f64 / 10_000_000.0)
                        * (*format.0).nSamplesPerSec as f64)
                        .round() as u32;
                    Ok(Opened{client:c,format,period:frames,raw:false,mode:"wasapi-shared-default-event".into(),fallback:Some(format!("Client3 unavailable: {normal_error}; RAW: {raw_error}. Using shared default period."))})
                }
            }
        }
    }
}
#[derive(Copy, Clone)]
enum Encoding {
    Float,
    Int16,
    Int32,
    Int24,
}
unsafe fn encoding(format: *mut WAVEFORMATEX) -> Result<Encoding, String> {
    let f = *format;
    let mut tag = f.wFormatTag;
    if tag == 0xfffe {
        if f.cbSize < 22 {
            return Err("Invalid extensible audio format".into());
        }
        let ext = &*(format.cast::<WAVEFORMATEXTENSIBLE>());
        let subtype = ext.SubFormat;
        if subtype == GUID::from_u128(0x00000003_0000_0010_8000_00aa00389b71) {
            tag = 3;
        } else if subtype == GUID::from_u128(0x00000001_0000_0010_8000_00aa00389b71) {
            tag = 1;
        }
    }
    match (tag, f.wBitsPerSample) {
        (3, 32) => Ok(Encoding::Float),
        (1, 16) => Ok(Encoding::Int16),
        (1, 24) => Ok(Encoding::Int24),
        (1, 32) => Ok(Encoding::Int32),
        _ => Err(
            "The output's current mix format is unsupported; choose PCM16/24/32 or float32 output."
                .into(),
        ),
    }
}

pub struct Host {
    client: IAudioClient,
    render: IAudioRenderClient,
    event: Event,
    mixer: mixer::Mixer,
    format: Format,
    encoding: Encoding,
    int24: Vec<i32>,
    size: u32,
    status: AudioStatus,
    last: Instant,
    _mmcss: Option<Mmcss>,
    _com: Com,
    #[cfg(test)]
    capture: Option<Capture>,
}
#[cfg(test)]
pub struct Capture {
    pub samples: Vec<f32>,
    pub maximum_samples: usize,
    pub over_capacity: bool,
    pub render_ms: Vec<f64>,
}
impl Host {
    pub fn open(
        config: &Config,
        bus: Arc<mixer::MidiBus>,
        mailbox: Arc<mixer::CueMailbox>,
        volume: Arc<AtomicU64>,
    ) -> Result<Self, String> {
        unsafe {
            let com = Com::enter()?;
            let d = endpoint(&config.device)?;
            let id = d.GetId().map_err(error)?;
            let uid = id.to_string().map_err(|e| e.to_string());
            CoTaskMemFree(Some(id.0.cast()));
            let uid = uid?;
            let opened = open_client(&d, config.tier)?;
            let f = *opened.format.0;
            if f.nChannels == 0
                || f.nChannels > 256
                || f.nSamplesPerSec < 8000
                || f.nSamplesPerSec > 384000
            {
                return Err("Invalid output mix rate or channels".into());
            }
            let enc = encoding(opened.format.0)?;
            let width = match enc {
                Encoding::Float | Encoding::Int32 => 4,
                Encoding::Int16 => 2,
                Encoding::Int24 => 3,
            };
            if f.nBlockAlign as usize != f.nChannels as usize * width {
                return Err("Invalid output block alignment".into());
            }
            let size = opened.client.GetBufferSize().map_err(error)?;
            if size == 0 || size > 65536 {
                return Err("Output buffer exceeds supported capacity".into());
            }
            let synth: Option<Box<dyn mixer::Synth>> = if config.enabled {
                let path = config.sfz.as_deref().ok_or("Piano is not installed")?;
                Some(Box::new(crate::piano_engine::PianoEngine::new(
                    path,
                    f.nSamplesPerSec,
                    mixer::MAX_BLOCK,
                )?))
            } else {
                None
            };
            let render = opened.client.GetService().map_err(error)?;
            let event = Event(CreateEventW(None, false, false, None).map_err(error)?);
            opened.client.SetEventHandle(event.0).map_err(error)?;
            let mut task = 0;
            let mmcss = AvSetMmThreadCharacteristicsW(w!("Pro Audio"), &mut task)
                .ok()
                .map(Mmcss);
            let status = AudioStatus {
                enabled: config.enabled,
                ready: config.sfz.is_some(),
                running: true,
                device: config.device.clone(),
                output_uid: uid,
                sample_rate: f.nSamplesPerSec,
                period_frames: opened.period,
                buffer_frames: size,
                raw: opened.raw,
                mode: opened.mode,
                fallback: opened.fallback,
                latency_tier: config.tier,
                ..Default::default()
            };
            let int24 = if matches!(enc, Encoding::Int24) {
                vec![0; size as usize * f.nChannels as usize]
            } else {
                Vec::new()
            };
            let host = Self {
                client: opened.client,
                render,
                event,
                mixer: mixer::Mixer::new(synth, bus, mailbox, volume),
                format: opened.format,
                encoding: enc,
                int24,
                size,
                status,
                last: Instant::now(),
                _mmcss: mmcss,
                _com: com,
                #[cfg(test)]
                capture: None,
            };
            // Prime silence; no pending cue or MIDI is consumed before the actual stream.
            let ptr = host.render.GetBuffer(size).map_err(error)?;
            std::ptr::write_bytes(ptr, 0, size as usize * f.nBlockAlign as usize);
            host.render.ReleaseBuffer(size, 0).map_err(error)?;
            host.client.Start().map_err(error)?;
            Ok(host)
        }
    }
    pub fn pump(&mut self) -> Result<(), String> {
        unsafe {
            match WaitForSingleObject(self.event.0, 20) {
                WAIT_OBJECT_0 => {}
                WAIT_TIMEOUT => {
                    if self.last.elapsed() > Duration::from_millis(500) {
                        return Err(
                            "Audio output stopped; reconnect or select another output".into()
                        );
                    }
                    return Ok(());
                }
                _ => return Err("Audio output event failed".into()),
            }
            self.last = Instant::now();
            let padding = self.client.GetCurrentPadding().map_err(error)?;
            let available = self.size.saturating_sub(padding);
            if available == 0 {
                return Ok(());
            }
            let f = *self.format.0;
            #[cfg(test)]
            let render_began = Instant::now();
            let channels = f.nChannels as usize;
            let samples = available as usize * channels;
            let delay = (padding as f64 / f.nSamplesPerSec as f64 * 1_000_000.0).ceil() as u64;
            let now = crate::midi_input::midi_clock();
            let ptr = self.render.GetBuffer(available).map_err(error)?;
            match self.encoding {
                Encoding::Float => self.mixer.fill(
                    std::slice::from_raw_parts_mut(ptr.cast::<f32>(), samples),
                    channels,
                    now,
                    delay,
                    |v| v,
                ),
                Encoding::Int16 => self.mixer.fill(
                    std::slice::from_raw_parts_mut(ptr.cast::<i16>(), samples),
                    channels,
                    now,
                    delay,
                    |v| (v * i16::MAX as f32).round() as i16,
                ),
                Encoding::Int32 => self.mixer.fill(
                    std::slice::from_raw_parts_mut(ptr.cast::<i32>(), samples),
                    channels,
                    now,
                    delay,
                    |v| (v as f64 * i32::MAX as f64).round() as i32,
                ),
                Encoding::Int24 => {
                    self.mixer
                        .fill(&mut self.int24[..samples], channels, now, delay, |v| {
                            (v * 8_388_607.0).round() as i32
                        });
                    let bytes = std::slice::from_raw_parts_mut(ptr, samples * 3);
                    for (sample, dst) in self.int24[..samples].iter().zip(bytes.chunks_exact_mut(3))
                    {
                        dst.copy_from_slice(&sample.to_le_bytes()[..3]);
                    }
                }
            }
            #[cfg(test)]
            if let Some(capture) = self.capture.as_mut() {
                if capture.samples.len() + samples <= capture.maximum_samples {
                    // Reserved before Start's measured loop; normalized submitted PCM copied
                    // while WASAPI still owns the acquired pointer. No allocation/file writes.
                    for index in 0..samples {
                        let value = match self.encoding {
                            Encoding::Float => *ptr.cast::<f32>().add(index) as f64,
                            Encoding::Int16 => {
                                *ptr.cast::<i16>().add(index) as f64 / i16::MAX as f64
                            }
                            Encoding::Int32 => {
                                *ptr.cast::<i32>().add(index) as f64 / i32::MAX as f64
                            }
                            Encoding::Int24 => self.int24[index] as f64 / 8_388_607.0,
                        };
                        capture.samples.push(value as f32);
                    }
                } else {
                    capture.over_capacity = true;
                }
            }
            self.render.ReleaseBuffer(available, 0).map_err(error)?;
            #[cfg(test)]
            if let Some(capture) = self.capture.as_mut() {
                if capture.render_ms.len() < capture.render_ms.capacity() {
                    capture
                        .render_ms
                        .push(render_began.elapsed().as_secs_f64() * 1000.0);
                } else {
                    capture.over_capacity = true;
                }
            }
            Ok(())
        }
    }
    pub fn close(&mut self) -> Result<(), String> {
        unsafe {
            self.client.Stop().map_err(error)?;
        }
        self.status.running = false;
        Ok(())
    }
    pub fn status(&self) -> AudioStatus {
        let mut s = self.status.clone();
        s.rendered_frames = self.mixer.frames.load(Ordering::Relaxed);
        s.peak = f64::from_bits(self.mixer.peak_bits.load(Ordering::Relaxed));
        s.queue_overflow = self.mixer.bus.overflow.load(Ordering::Relaxed);
        s
    }
    #[cfg(test)]
    pub fn capture(&mut self, seconds: u32) -> Result<(), String> {
        let format = unsafe { *self.format.0 };
        if seconds > 15 || format.nChannels > 8 || format.nSamplesPerSec > 96000 {
            return Err("Diagnostic capture exceeds bounded limits".into());
        }
        let count = seconds as usize * format.nSamplesPerSec as usize * format.nChannels as usize;
        self.capture = Some(Capture {
            samples: Vec::with_capacity(count),
            maximum_samples: count,
            over_capacity: false,
            render_ms: Vec::with_capacity(20000),
        });
        Ok(())
    }
    #[cfg(test)]
    pub fn take_capture(&mut self) -> Option<Capture> {
        self.capture.take()
    }
    #[cfg(test)]
    pub fn channels(&self) -> u16 {
        unsafe { (*self.format.0).nChannels }
    }
}
impl Drop for Host {
    fn drop(&mut self) {
        unsafe {
            let _ = self.client.Stop();
        } /* Mixer/sfizz and format freed here, on worker after Stop. */
    }
}
