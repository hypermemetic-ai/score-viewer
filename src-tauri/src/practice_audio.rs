//! One app-local native output: optional piano and independently cancellable cue.
//! No endpoint defaults, global enhancements, driver or MIDI output writes.
use serde::Serialize;
use std::{
    path::PathBuf,
    sync::{
        atomic::{AtomicU64, Ordering},
        mpsc, Arc, Mutex, OnceLock,
    },
    time::Duration,
};
#[path = "audio_buffer_lease.rs"]
mod buffer_lease;
#[cfg(target_os = "macos")]
#[path = "audio_hal_buffer.rs"]
mod hal;
#[path = "practice_audio_lifecycle.rs"]
mod lifecycle;
#[path = "metronome_stream.rs"]
mod metronome;
#[path = "audio_mixer.rs"]
pub mod mixer;
#[path = "audio_period.rs"]
mod period;
#[cfg(windows)]
#[path = "practice_audio_windows.rs"]
mod platform;
#[cfg(target_os = "macos")]
#[path = "practice_audio_macos.rs"]
mod platform;

#[derive(Serialize)]
pub struct Output {
    pub id: String,
    pub name: String,
}
#[derive(Serialize)]
pub struct Outputs {
    pub supported: bool,
    pub outputs: Vec<Output>,
}
#[derive(Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioStatus {
    pub enabled: bool,
    pub ready: bool,
    pub running: bool,
    pub device: String,
    pub sample_rate: u32,
    pub period_frames: u32,
    pub buffer_frames: u32,
    pub raw: bool,
    pub mode: String,
    pub output_uid: String,
    pub fallback: Option<String>,
    pub error: Option<String>,
    pub latency_tier: u8,
    pub rendered_frames: u64,
    pub peak: f64,
    pub queue_overflow: u64,
}
#[derive(Clone, Default)]
pub struct Config {
    pub enabled: bool,
    pub sfz: Option<PathBuf>,
    pub device: String,
    pub tier: u8,
}
enum Command {
    Configure(Config, mpsc::Sender<Result<AudioStatus, String>>),
    Begin(
        tauri::AppHandle,
        String,
        lifecycle::Request,
        lifecycle::Session,
    ),
    Shutdown(mpsc::Sender<Result<(), String>>),
}
struct Worker {
    send: mpsc::SyncSender<Command>,
    join: Mutex<Option<std::thread::JoinHandle<()>>>,
}
pub struct State {
    playback: lifecycle::Playback,
    worker: OnceLock<Worker>,
    pub bus: Arc<mixer::MidiBus>,
    status: Arc<Mutex<AudioStatus>>,
    volume: Arc<AtomicU64>,
    initial: Mutex<Config>,
}
impl Default for State {
    fn default() -> Self {
        Self {
            playback: lifecycle::Playback::default(),
            worker: OnceLock::new(),
            bus: Arc::new(mixer::MidiBus::default()),
            status: Arc::new(Mutex::new(AudioStatus::default())),
            volume: Arc::new(AtomicU64::new(0.7f64.to_bits())),
            initial: Mutex::new(Config::default()),
        }
    }
}
impl State {
    fn worker(&self) -> &Worker {
        self.worker.get_or_init(|| {
            let (tx, rx) = mpsc::sync_channel(32);
            let bus = self.bus.clone();
            let status = self.status.clone();
            let volume = self.volume.clone();
            let initial = self.initial.lock().map(|c| c.clone()).unwrap_or_default();
            let join = std::thread::spawn(move || run(rx, bus, status, volume, initial));
            Worker {
                send: tx,
                join: Mutex::new(Some(join)),
            }
        })
    }
    pub fn shutdown(&self) -> Result<(), String> {
        let _ = self.playback.stop();
        self.bus.enable(false);
        if let Some(w) = self.worker.get() {
            let mut guard = w.join.lock().map_err(|_| "Audio shutdown unavailable")?;
            if guard.is_none() {
                return Ok(());
            }
            let (tx, rx) = mpsc::channel();
            w.send
                .send(Command::Shutdown(tx))
                .map_err(|_| "Audio worker stopped before restoration acknowledgment")?;
            let result = rx
                .recv_timeout(Duration::from_secs(120))
                .map_err(|_| "Audio shutdown/restoration timed out")?;
            if let Some(join) = guard.take() {
                join.join()
                    .map_err(|_| "Audio worker failed during shutdown")?;
            }
            return result;
        }
        Ok(())
    }
    pub fn status(&self) -> AudioStatus {
        self.status.lock().map(|s| s.clone()).unwrap_or_default()
    }
}
impl Drop for State {
    fn drop(&mut self) {
        let _ = self.shutdown();
    }
}

#[cfg(any(windows, target_os = "macos"))]
fn run(
    rx: mpsc::Receiver<Command>,
    bus: Arc<mixer::MidiBus>,
    status: Arc<Mutex<AudioStatus>>,
    volume: Arc<AtomicU64>,
    initial: Config,
) {
    use tauri::Emitter;
    struct Active {
        app: tauri::AppHandle,
        session: lifecycle::Session,
        onset: Arc<AtomicU64>,
        finished: Arc<std::sync::atomic::AtomicBool>,
        invalid: Arc<std::sync::atomic::AtomicBool>,
        announced: bool,
    }
    let mut config = initial;
    let mailbox = Arc::new(mixer::CueMailbox::default());
    let mut backend: Option<platform::Host> = None;
    let mut active: Option<Active> = None;
    let mut shutdown_reply = None;
    fn close(backend: &mut Option<platform::Host>) -> Result<(), String> {
        let result = backend.as_mut().map(|h| h.close()).unwrap_or(Ok(()));
        drop(backend.take());
        result
    }
    let publish = |value: AudioStatus| {
        if let Ok(mut s) = status.lock() {
            *s = value;
        }
    };
    loop {
        mailbox.reclaim();
        let command = if backend.is_some() {
            rx.try_recv().ok()
        } else {
            match rx.recv() {
                Ok(c) => Some(c),
                Err(_) => break,
            }
        };
        if let Some(command) = command {
            match command {
                Command::Shutdown(reply) => {
                    shutdown_reply = Some(reply);
                    break;
                }
                Command::Configure(next, reply) => {
                    let reopen = backend.is_none()
                        || next.enabled != config.enabled
                        || next.sfz != config.sfz
                        || next.device != config.device
                        || next.tier != config.tier;
                    config = next;
                    if reopen {
                        if let Some(a) = active.take() {
                            a.session.cancel();
                            a.session.finish();
                        }
                        let restored = close(&mut backend);
                        mailbox.reset();
                        bus.enable(false);
                        if let Err(error) = restored {
                            publish(AudioStatus {
                                error: Some(error.clone()),
                                ..Default::default()
                            });
                            let _ = reply.send(Err(error));
                            continue;
                        }
                        if config.enabled {
                            match platform::Host::open(
                                &config,
                                bus.clone(),
                                mailbox.clone(),
                                volume.clone(),
                            ) {
                                Ok(host) => {
                                    bus.enable(config.enabled);
                                    publish(host.status());
                                    backend = Some(host);
                                }
                                Err(error) => publish(AudioStatus {
                                    enabled: true,
                                    ready: config.sfz.is_some(),
                                    device: config.device.clone(),
                                    latency_tier: config.tier,
                                    error: Some(error),
                                    ..Default::default()
                                }),
                            }
                        } else {
                            publish(AudioStatus {
                                ready: config.sfz.is_some(),
                                device: config.device.clone(),
                                latency_tier: config.tier,
                                ..Default::default()
                            });
                        }
                    }
                    let current = status.lock().map(|s| s.clone()).unwrap_or_default();
                    let result = if let Some(e) = current.error.clone() {
                        Err(e)
                    } else {
                        Ok(current)
                    };
                    let _ = reply.send(result);
                }
                Command::Begin(app, device, request, session) => {
                    if session.cancelled() {
                        continue;
                    }
                    if let Some(a) = active.take() {
                        a.session.cancel();
                        a.session.finish();
                    }
                    if backend.is_none() || device != config.device {
                        let restored = close(&mut backend);
                        mailbox.reset();
                        bus.enable(false);
                        if let Err(error) = restored {
                            session.failed(error.clone(), |m| {
                                let _ = app.emit("viewer-audio-error", m);
                            });
                            publish(AudioStatus {
                                error: Some(error),
                                ..Default::default()
                            });
                            continue;
                        }
                        config.device = device;
                        match platform::Host::open(
                            &config,
                            bus.clone(),
                            mailbox.clone(),
                            volume.clone(),
                        ) {
                            Ok(host) => {
                                bus.enable(config.enabled);
                                publish(host.status());
                                backend = Some(host);
                            }
                            Err(error) => {
                                session.failed(error.clone(), |m| {
                                    let _ = app.emit("viewer-audio-error", m);
                                });
                                publish(AudioStatus {
                                    enabled: config.enabled,
                                    ready: config.sfz.is_some(),
                                    error: Some(error),
                                    device: config.device.clone(),
                                    ..Default::default()
                                });
                                continue;
                            }
                        }
                    }
                    let rate = backend.as_ref().unwrap().status().sample_rate;
                    let cue = Box::new(mixer::Cue::new(rate, request, session.stop_signal()));
                    let next = Active {
                        app,
                        session,
                        onset: cue.onset.clone(),
                        finished: cue.finished.clone(),
                        invalid: cue.invalid.clone(),
                        announced: false,
                    };
                    if mailbox.publish(cue).is_err() {
                        next.session
                            .failed("Audio cue queue is busy; retry Ready.".into(), |m| {
                                let _ = next.app.emit("viewer-audio-error", m);
                            });
                    } else {
                        active = Some(next);
                    }
                }
            }
        }
        let failure = backend.as_mut().and_then(|host| host.pump().err());
        if let Some(error) = failure {
            if let Some(a) = active.take() {
                a.session.failed(error.clone(), |m| {
                    let _ = a.app.emit("viewer-audio-error", m);
                });
                a.session.finish();
            }
            let restoration = close(&mut backend);
            let error = match restoration {
                Ok(()) => error,
                Err(r) => format!("{error}; output buffer restoration failed: {r}"),
            };
            mailbox.reset();
            bus.enable(false);
            publish(AudioStatus {
                enabled: config.enabled,
                ready: config.sfz.is_some(),
                device: config.device.clone(),
                latency_tier: config.tier,
                error: Some(error),
                ..Default::default()
            });
        } else if let Some(host) = backend.as_ref() {
            publish(host.status());
        }
        if let Some(a) = active.as_mut() {
            let onset = a.onset.load(Ordering::Acquire);
            if !a.announced && onset != 0 {
                a.announced = true;
                a.session.started(onset);
            }
            if a.invalid.load(Ordering::Acquire) {
                a.session
                    .failed("Audio playback clock overflow".into(), |m| {
                        let _ = a.app.emit("viewer-audio-error", m);
                    });
            }
            if a.session.cancelled()
                || a.finished.load(Ordering::Acquire)
                || a.invalid.load(Ordering::Acquire)
            {
                a.session.finish();
                active.take();
            }
        }
        if !config.enabled && active.is_none() && backend.is_some() {
            let restoration = close(&mut backend);
            mailbox.reset();
            bus.enable(false);
            if let Ok(mut s) = status.lock() {
                s.running = false;
                if let Err(error) = restoration {
                    s.error = Some(error);
                }
            }
        }
    }
    if let Some(a) = active {
        a.session.cancel();
        a.session.finish();
    }
    let result = close(&mut backend);
    bus.enable(false);
    mailbox.reset();
    if let Err(error) = &result {
        if let Ok(mut s) = status.lock() {
            s.running = false;
            s.error = Some(error.clone());
        }
    }
    if let Some(reply) = shutdown_reply {
        let _ = reply.send(result);
    }
}
#[cfg(not(any(windows, target_os = "macos")))]
fn run(
    rx: mpsc::Receiver<Command>,
    _: Arc<mixer::MidiBus>,
    _: Arc<Mutex<AudioStatus>>,
    _: Arc<AtomicU64>,
    _: Config,
) {
    while let Ok(c) = rx.recv() {
        match c {
            Command::Shutdown(reply) => {
                let _ = reply.send(Ok(()));
                break;
            }
            Command::Configure(_, reply) => {
                let _ = reply.send(Err("Native piano is available on Windows and macOS".into()));
            }
            Command::Begin(_, _, _, s) => {
                s.cancel();
            }
        }
    }
}

#[tauri::command]
pub fn piano_audio_status(state: tauri::State<'_, State>) -> AudioStatus {
    state.status()
}
#[tauri::command]
pub async fn piano_audio_configure(
    state: tauri::State<'_, State>,
    bank: tauri::State<'_, crate::piano_bank::State>,
    enabled: bool,
    volume: f64,
    device: String,
    latency_tier: u8,
) -> Result<AudioStatus, String> {
    if !volume.is_finite()
        || !(0.0..=1.0).contains(&volume)
        || latency_tier > 3
        || device.len() > 4096
    {
        return Err("Invalid piano audio settings".into());
    }
    let sfz = if enabled {
        bank.ready_sfz()?
    } else {
        bank.ready_sfz().unwrap_or(None)
    };
    if enabled && sfz.is_none() {
        return Err("Download and install the piano first.".into());
    }
    state.volume.store(volume.to_bits(), Ordering::Release);
    let config = Config {
        enabled,
        sfz,
        device,
        tier: latency_tier,
    };
    *state
        .initial
        .lock()
        .map_err(|_| "Audio settings unavailable")? = config.clone();
    if !enabled && state.worker.get().is_none() {
        let status = AudioStatus {
            ready: config.sfz.is_some(),
            device: config.device,
            latency_tier: config.tier,
            ..Default::default()
        };
        *state
            .status
            .lock()
            .map_err(|_| "Audio status unavailable")? = status.clone();
        return Ok(status);
    }
    let (tx, rx) = mpsc::channel();
    state
        .worker()
        .send
        .try_send(Command::Configure(config, tx))
        .map_err(|_| "Audio worker is busy or stopped")?;
    tauri::async_runtime::spawn_blocking(move || {
        rx.recv_timeout(Duration::from_secs(120))
            .map_err(|_| "Piano loading timed out; check its status before retrying.".to_string())?
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
pub fn practice_audio_outputs() -> Result<Outputs, String> {
    #[cfg(any(windows, target_os = "macos"))]
    {
        std::thread::spawn(platform::outputs)
            .join()
            .map_err(|_| "Audio enumeration thread failed".to_string())?
    }
    #[cfg(not(any(windows, target_os = "macos")))]
    {
        Ok(Outputs {
            supported: false,
            outputs: vec![],
        })
    }
}
#[tauri::command]
pub fn practice_audio_stop(state: tauri::State<'_, State>) -> Result<(), String> {
    state.playback.stop()
}
#[tauri::command]
pub async fn practice_audio_begin(
    app: tauri::AppHandle,
    state: tauri::State<'_, State>,
    device: String,
    bpm: f64,
    duration_ms: f64,
    count_in_step_ms: f64,
    repeat_start_micros: Option<f64>,
    full_repeat_count_in: Option<bool>,
    pulses_per_beat: Option<u32>,
    score_offset_pulses: Option<u32>,
    bar_start_pulses: Option<Vec<u64>>,
) -> Result<u64, String> {
    let request = lifecycle::Request::new_with_grid(
        &device,
        bpm,
        duration_ms,
        count_in_step_ms,
        pulses_per_beat,
        score_offset_pulses,
        bar_start_pulses,
    )?
    .with_repeat_start(repeat_start_micros)?
    .with_full_repeat_count_in(full_repeat_count_in.unwrap_or(false))?;
    #[cfg(any(windows, target_os = "macos"))]
    {
        let (session, receiver) = state.playback.begin()?;
        state
            .worker()
            .send
            .try_send(Command::Begin(app, device, request, session.clone()))
            .map_err(|_| "Audio worker is busy or stopped")?;
        tauri::async_runtime::spawn_blocking(move || {
            session.wait_started(receiver, lifecycle::START_WAIT)
        })
        .await
        .map_err(|e| e.to_string())?
    }
    #[cfg(not(any(windows, target_os = "macos")))]
    {
        let _ = (app, state, device, request);
        Err("Native audio is available on Windows and macOS".into())
    }
}

#[cfg(all(test, windows))]
#[path = "audio_diagnostic.rs"]
mod stream_diagnostic;

#[cfg(all(test, target_os = "macos"))]
#[path = "audio_diagnostic_macos.rs"]
mod diagnostic_macos;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn optional_off_startup_and_shutdown_do_not_create_audio_worker() {
        let state = State::default();
        assert!(state.worker.get().is_none());
        assert!(!state.status().enabled);
        assert!(!state.status().running);
        state.shutdown().unwrap();
        assert!(state.worker.get().is_none());
    }
}
