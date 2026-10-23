//! One app-local native output: optional piano and independently cancellable cue.
//! No endpoint defaults, global enhancements, driver or MIDI output writes.
use serde::Serialize;
use std::{
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
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
#[path = "audio_render_queue.rs"]
mod render_queue;
#[path = "practice_audio_repeat.rs"]
mod repeat;

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
    pub queue_target_frames: u32,
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
impl AudioStatus {
    fn queue_horizon_frames(&self) -> u32 {
        // CoreAudio retains its existing callback/lease behavior. Its unchanged
        // host does not publish the Windows write-target field.
        if self.queue_target_frames == 0 {
            self.buffer_frames
        } else {
            self.queue_target_frames
        }
    }
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
    Arm {
        device: String,
        request: lifecycle::Request,
        origin: u64,
        previous: u64,
        id: u64,
        owner: lifecycle::Session,
        abandoned: Arc<AtomicBool>,
        reply: mpsc::Sender<Result<repeat::ArmReceipt, String>>,
    },
    Cancel {
        id: u64,
        previous: u64,
        owner: lifecycle::Session,
        reply: mpsc::Sender<Result<repeat::CancelReceipt, String>>,
    },
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
    /// Command-side scheduled-note stream; never locked by the callback.
    schedule: Arc<Mutex<mixer::schedule::Submitter>>,
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
            schedule: Arc::new(Mutex::new(Default::default())),
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
        request: lifecycle::Request,
        arm: Option<Arc<repeat::ArmControl>>,
    }
    let mut config = initial;
    let mailbox = Arc::new(mixer::CueMailbox::default());
    let mut backend: Option<platform::Host> = None;
    let mut active: Option<Active> = None;
    let mut pending: Option<Active> = None;
    let mut shutdown_reply = None;
    fn close(backend: &mut Option<platform::Host>) -> Result<(), String> {
        let result = backend.as_mut().map(|h| h.close()).unwrap_or(Ok(()));
        drop(backend.take());
        result
    }
    fn drain_cancelled(
        backend: &mut Option<platform::Host>,
        mailbox: &mixer::CueMailbox,
    ) -> Result<(), String> {
        let start = std::time::Instant::now();
        while mailbox.has_pending() {
            mailbox.reclaim();
            backend
                .as_mut()
                .ok_or("Audio output is unavailable")?
                .pump()?;
            if start.elapsed() > Duration::from_millis(500) {
                return Err("Cancelled cue retirement timed out".into());
            }
        }
        mailbox.reclaim();
        Ok(())
    }
    fn reconcile(active: &mut Option<Active>, pending: &mut Option<Active>) {
        if repeat::promote_activated(active, pending, |p| {
            p.arm.as_ref().is_some_and(|a| a.activated())
        }) {
            return;
        }
        // A cancelled CLAIMED cue is still being committed by the callback.
        // Keep its worker metadata until onset/pointer publication completes.
        if pending
            .as_ref()
            .is_some_and(|p| p.arm.as_ref().is_some_and(|a| a.claimed()))
        {
            return;
        }
        if pending.as_ref().is_some_and(|p| {
            p.session.cancelled()
                || p.invalid.load(Ordering::Acquire)
                || p.arm.as_ref().is_some_and(|a| a.cancelled())
        }) {
            if let Some(p) = pending.take() {
                if p.invalid.load(Ordering::Acquire) {
                    p.session
                        .failed("Prepared repeat missed its playback boundary".into(), |m| {
                            let _ = p.app.emit("viewer-audio-error", m);
                        });
                }
            }
        }
    }
    let publish = |value: AudioStatus| {
        if let Ok(mut s) = status.lock() {
            *s = value;
        }
    };
    loop {
        mailbox.reclaim();
        // A callback may already have switched owners since the last pump.
        // Resolve that committed handoff before inspecting Arm/Cancel inputs.
        reconcile(&mut active, &mut pending);
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
                        if let Some(p) = pending.take() {
                            if let Some(arm) = p.arm {
                                arm.cancel();
                            }
                        }
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
                    if let Some(p) = pending.take() {
                        if let Some(arm) = p.arm {
                            arm.cancel();
                        }
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
                    if let Err(error) = drain_cancelled(&mut backend, &mailbox) {
                        session.failed(error, |m| {
                            let _ = app.emit("viewer-audio-error", m);
                        });
                        continue;
                    }
                    let owned_request = request.clone();
                    let cue = Box::new(mixer::Cue::new(rate, request, session.stop_signal()));
                    let next = Active {
                        app,
                        session,
                        onset: cue.onset.clone(),
                        finished: cue.finished.clone(),
                        invalid: cue.invalid.clone(),
                        announced: false,
                        request: owned_request,
                        arm: None,
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
                Command::Arm {
                    device,
                    request,
                    origin,
                    previous,
                    id,
                    owner,
                    abandoned,
                    reply,
                } => {
                    let mut published: Option<Arc<repeat::ArmControl>> = None;
                    let result = (|| -> Result<repeat::ArmReceipt, String> {
                        if abandoned.load(Ordering::Acquire) {
                            return Err("Repeat arm cancelled before admission".into());
                        }
                        let a = active
                            .as_ref()
                            .ok_or("No current audio cue owns this repeat")?;
                        if !owner.is_current()
                            || !a.session.same_generation(&owner)
                            || !a.session.is_current()
                            || a.onset.load(Ordering::Acquire) != previous
                            || device != config.device
                        {
                            return Err("Repeat cue output or onset owner changed".into());
                        }
                        if pending.is_some() {
                            return Err("A repeat cue is already pending".into());
                        }
                        a.session.admit_arm_id(id)?;
                        // Only a previously cancelled pointer can remain here;
                        // the callback drains it without disturbing the old cue.
                        drain_cancelled(&mut backend, &mailbox)?;
                        let s = backend
                            .as_ref()
                            .ok_or("Current audio output is unavailable")?
                            .status();
                        let receipt = repeat::admit(
                            &request,
                            id,
                            origin,
                            crate::midi_input::midi_clock(),
                            s.queue_horizon_frames(),
                            s.sample_rate,
                            mailbox.submitted_end_micros.load(Ordering::Acquire),
                            mailbox.block_micros.load(Ordering::Acquire),
                            previous,
                            &a.request,
                        )?;
                        if !receipt.armed {
                            return Ok(receipt);
                        }
                        let arm = Arc::new(repeat::ArmControl::new(
                            id,
                            previous,
                            origin,
                            abandoned.clone(),
                        ));
                        let cue = Box::new(mixer::Cue::future(
                            s.sample_rate,
                            request.clone(),
                            a.session.stop_signal(),
                            arm.clone(),
                        ));
                        let next = Active {
                            app: a.app.clone(),
                            session: a.session.clone(),
                            onset: cue.onset.clone(),
                            finished: cue.finished.clone(),
                            invalid: cue.invalid.clone(),
                            announced: true,
                            request,
                            arm: Some(arm.clone()),
                        };
                        if abandoned.load(Ordering::Acquire) || !owner.is_current() {
                            return Err("Repeat arm cancelled during preparation".into());
                        }
                        // Vector copies and all cue allocation happened above.
                        // Re-admit at publication, rather than acknowledging a
                        // deadline that was only true before preparation.
                        let s = backend
                            .as_ref()
                            .ok_or("Current audio output is unavailable")?
                            .status();
                        let receipt = repeat::admit(
                            &next.request,
                            id,
                            origin,
                            crate::midi_input::midi_clock(),
                            s.queue_horizon_frames(),
                            s.sample_rate,
                            mailbox.submitted_end_micros.load(Ordering::Acquire),
                            mailbox.block_micros.load(Ordering::Acquire),
                            previous,
                            &a.request,
                        )?;
                        if !receipt.armed {
                            return Ok(receipt);
                        }
                        if mailbox.publish_prepared(cue).is_err() {
                            return Err("Repeat cue queue is busy".into());
                        }
                        a.session.arm_published(id);
                        published = Some(arm);
                        pending = Some(next);
                        Ok(receipt)
                    })();
                    if reply.send(result).is_err() {
                        if let Some(arm) = published {
                            arm.cancel();
                        }
                    }
                }
                Command::Cancel {
                    id,
                    previous,
                    owner,
                    reply,
                } => {
                    let found = pending
                        .as_ref()
                        .into_iter()
                        .chain(active.as_ref())
                        .find(|a| {
                            owner.is_current()
                                && a.session.same_generation(&owner)
                                && a.session.is_current()
                                && a.arm.as_ref().is_some_and(|arm| arm.matches(id, previous))
                        });
                    let state = found
                        .map(|a| a.arm.as_ref().unwrap().cancel())
                        .unwrap_or(repeat::CancelState::Missing);
                    let _ = reply.send(Ok(repeat::CancelReceipt {
                        version: 2,
                        arm_id: id,
                        previous_count_start_micros: previous,
                        state,
                    }));
                }
            }
        }
        let failure = backend.as_mut().and_then(|host| host.pump().err());
        if let Some(error) = failure {
            if let Some(p) = pending.take() {
                if let Some(arm) = p.arm {
                    arm.cancel();
                }
            }
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
        reconcile(&mut active, &mut pending);
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
                || (a.finished.load(Ordering::Acquire) && pending.is_none())
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
    if let Some(p) = pending {
        if let Some(arm) = p.arm {
            arm.cancel();
        }
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
            Command::Arm { reply, .. } => {
                let _ = reply.send(Err("Native audio is available on Windows and macOS".into()));
            }
            Command::Cancel {
                id,
                previous,
                reply,
                ..
            } => {
                let _ = reply.send(Ok(repeat::CancelReceipt {
                    version: 2,
                    arm_id: id,
                    previous_count_start_micros: previous,
                    state: repeat::CancelState::Missing,
                }));
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
/// While the Volume track is dragged the pianist hears each new volume at
/// once; nothing is saved until the drag ends (piano_audio_configure).
#[tauri::command]
pub fn piano_audio_volume(state: tauri::State<'_, State>, volume: f64) -> Result<(), String> {
    if !volume.is_finite() || !(0.0..=1.0).contains(&volume) {
        return Err("Invalid piano volume".into());
    }
    state.volume.store(volume.to_bits(), Ordering::Release);
    Ok(())
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
    pulse_grid_v2: Option<lifecycle::PulseGridV2>,
    pulse_grid_v3: Option<lifecycle::PulseGridV2>,
) -> Result<u64, String> {
    let request = lifecycle::Request::new_with_clock(
        &device,
        bpm,
        duration_ms,
        count_in_step_ms,
        pulses_per_beat,
        score_offset_pulses,
        bar_start_pulses,
        lifecycle::select_grid_version(pulse_grid_v2, pulse_grid_v3)?,
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

#[tauri::command]
pub async fn practice_audio_arm_repeat(
    state: tauri::State<'_, State>,
    device: String,
    bpm: f64,
    duration_ms: f64,
    count_in_step_ms: f64,
    count_start_micros: f64,
    pulse_grid_v2: Option<lifecycle::PulseGridV2>,
    pulse_grid_v3: Option<lifecycle::PulseGridV2>,
    previous_count_start_micros: f64,
    arm_id: f64,
) -> Result<repeat::ArmReceipt, String> {
    // Admission precedes any worker publication or lifecycle replacement.
    let grid = lifecycle::select_grid_version(pulse_grid_v2, pulse_grid_v3)?
        .ok_or("Future repeats require an explicit source-meter grid")?;
    let request = lifecycle::Request::new_with_clock(
        &device,
        bpm,
        duration_ms,
        count_in_step_ms,
        None,
        None,
        None,
        Some(grid),
    )?;
    let origin = repeat::target(count_start_micros)?;
    let previous = repeat::safe_id(previous_count_start_micros)?;
    let id = repeat::safe_id(arm_id)?;
    let owner = state
        .playback
        .current_session()?
        .ok_or("No current cue owns a future repeat")?;
    let abandoned = Arc::new(AtomicBool::new(false));
    let cancellation = abandoned.clone();
    let (tx, rx) = mpsc::channel();
    state
        .worker()
        .send
        .try_send(Command::Arm {
            device,
            request,
            origin,
            previous,
            id,
            owner,
            abandoned,
            reply: tx,
        })
        .map_err(|_| "Audio worker is busy or stopped")?;
    tauri::async_runtime::spawn_blocking(move || match rx.recv_timeout(lifecycle::START_WAIT) {
        Ok(result) => result,
        Err(_) => {
            cancellation.store(true, Ordering::Release);
            Err("Repeat arm timed out and was cancelled".into())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn practice_audio_cancel_repeat(
    state: tauri::State<'_, State>,
    arm_id: f64,
    previous_count_start_micros: f64,
) -> Result<repeat::CancelReceipt, String> {
    let id = repeat::safe_id(arm_id)?;
    let previous = repeat::safe_id(previous_count_start_micros)?;
    let Some(owner) = state.playback.current_session()? else {
        return Ok(repeat::CancelReceipt {
            version: 2,
            arm_id: id,
            previous_count_start_micros: previous,
            state: repeat::CancelState::Missing,
        });
    };
    let Some(worker) = state.worker.get() else {
        return Ok(repeat::CancelReceipt {
            version: 2,
            arm_id: id,
            previous_count_start_micros: previous,
            state: repeat::CancelState::Missing,
        });
    };
    let (tx, rx) = mpsc::channel();
    worker
        .send
        .try_send(Command::Cancel {
            id,
            previous,
            owner,
            reply: tx,
        })
        .map_err(|_| "Audio worker is busy or stopped")?;
    tauri::async_runtime::spawn_blocking(move || {
        rx.recv_timeout(lifecycle::START_WAIT)
            .map_err(|_| "Repeat cancellation acknowledgment timed out".to_string())?
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Scheduled notes need the enabled piano's running output. A disabled piano
/// starts no worker, stream or sampler for them.
fn schedule_ready(state: &State) -> bool {
    let s = state.status();
    state.worker.get().is_some() && s.enabled && s.running && s.error.is_none()
}
fn scheduled_events(events: Vec<(u64, u8, u8, u8)>) -> Result<Vec<mixer::schedule::Event>, String> {
    if events.len() > mixer::schedule::MAX_SUBMIT {
        return Err("Too many piano events in one submission".into());
    }
    Ok(events
        .into_iter()
        .map(|(at, kind, key, value)| mixer::schedule::Event {
            at,
            kind,
            key,
            value,
        })
        .collect())
}
/// The MIDI clock and the earliest cut a replacement may name.
#[tauri::command]
pub fn piano_schedule_open(state: tauri::State<'_, State>) -> Result<mixer::schedule::Receipt, String> {
    if !schedule_ready(&state) {
        return Err(mixer::schedule::OFF.into());
    }
    let now = crate::midi_input::midi_clock();
    state.bus.schedule.lead(now)?;
    let epoch = state.schedule.lock().map_err(|_| "Piano schedule unavailable")?.epoch();
    Ok(state.bus.schedule.receipt(epoch, 0, now))
}
/// Start a new epoch of `[atMicros, kind, key, value]` events. `keep_until`
/// keeps earlier events before that cut; without it the stream is released.
#[tauri::command]
pub async fn piano_schedule_replace(
    state: tauri::State<'_, State>,
    keep_until: Option<u64>,
    events: Vec<(u64, u8, u8, u8)>,
) -> Result<mixer::schedule::Receipt, String> {
    let events = scheduled_events(events)?;
    let release_only = keep_until.is_none() && events.is_empty();
    if !schedule_ready(&state) {
        // Nothing renders, so nothing scheduled can sound.
        return if release_only {
            Ok(state.bus.schedule.receipt(0, 0, crate::midi_input::midi_clock()))
        } else {
            Err(mixer::schedule::OFF.into())
        };
    }
    let (bus, submitter) = (state.bus.clone(), state.schedule.clone());
    tauri::async_runtime::spawn_blocking(move || {
        let start = std::time::Instant::now();
        loop {
            let result = {
                let mut sub = submitter.lock().map_err(|_| "Piano schedule unavailable")?;
                bus.schedule
                    .replace(&mut sub, crate::midi_input::midi_clock(), keep_until, &events)
            };
            match result {
                // The callback observes replacements every sampler quantum.
                Err(e) if e == mixer::schedule::BUSY && start.elapsed() < Duration::from_millis(250) => {
                    std::thread::sleep(Duration::from_millis(2));
                }
                other => return other,
            }
        }
    })
    .await
    .map_err(|e| e.to_string())?
}
/// Continue the current epoch; `accepted` may be short when the queue is full.
#[tauri::command]
pub fn piano_schedule_submit(
    state: tauri::State<'_, State>,
    epoch: u64,
    events: Vec<(u64, u8, u8, u8)>,
) -> Result<mixer::schedule::Receipt, String> {
    let events = scheduled_events(events)?;
    if !schedule_ready(&state) {
        return Err(mixer::schedule::OFF.into());
    }
    let mut sub = state.schedule.lock().map_err(|_| "Piano schedule unavailable")?;
    state
        .bus
        .schedule
        .submit(&mut sub, crate::midi_input::midi_clock(), epoch, &events)
}

#[cfg(test)]
#[path = "audio_capture_validation.rs"]
mod capture_validation;
#[cfg(all(test, windows))]
#[path = "audio_latency_diagnostic.rs"]
mod latency_diagnostic;
#[cfg(all(test, windows))]
#[path = "audio_diagnostic.rs"]
mod stream_diagnostic;

#[cfg(all(test, target_os = "macos"))]
#[path = "audio_diagnostic_macos.rs"]
mod diagnostic_macos;
#[cfg(all(test, target_os = "macos"))]
#[path = "audio_playability_macos.rs"]
mod playability_macos;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn optional_off_startup_and_shutdown_do_not_create_audio_worker() {
        let state = State::default();
        assert!(state.worker.get().is_none());
        assert!(!state.status().enabled);
        assert!(!state.status().running);
        assert!(!schedule_ready(&state), "scheduled notes never start a disabled piano");
        state.shutdown().unwrap();
        assert!(state.worker.get().is_none());
    }
}
