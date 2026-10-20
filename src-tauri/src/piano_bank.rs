//! Native-only picker/worker/status wrapper around the bounded bank core.
use crate::piano_bank_core as core;
use serde::Serialize;
use std::{
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
};
use tauri::Manager;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub supported: bool,
    pub installed: bool,
    pub phase: String,
    pub progress: Option<u8>,
    pub message: String,
    pub cancellable: bool,
}
struct Inner {
    status: Status,
    ready: Option<PathBuf>,
    initialized: bool,
    busy: bool,
}
#[derive(Clone)]
pub struct State {
    inner: Arc<Mutex<Inner>>,
    cancel: Arc<AtomicBool>,
}
impl Default for State {
    fn default() -> Self {
        Self {
            inner: Arc::new(Mutex::new(Inner {
                status: Status {
                    supported: cfg!(any(windows, target_os = "macos")),
                    installed: false,
                    phase: "not-installed".into(),
                    progress: None,
                    message: "Install the optional piano to play through the computer.".into(),
                    cancellable: false,
                },
                ready: None,
                initialized: false,
                busy: false,
            })),
            cancel: Arc::new(AtomicBool::new(false)),
        }
    }
}
impl State {
    pub fn ready_sfz(&self) -> Result<Option<PathBuf>, String> {
        let state = self
            .inner
            .lock()
            .map_err(|_| "Piano bank state unavailable")?;
        if state.ready.is_none() && state.status.phase == "error" {
            return Err(state.status.message.clone());
        }
        Ok(state.ready.clone())
    }
    fn status(&self) -> Result<Status, String> {
        Ok(self
            .inner
            .lock()
            .map_err(|_| "Piano bank state unavailable")?
            .status
            .clone())
    }
    fn progress(&self, phase: &str, percent: u8) {
        if let Ok(mut s) = self.inner.lock() {
            s.status.phase = phase.into();
            s.status.progress = Some(percent.min(100));
            s.status.message = if phase == "checking" {
                "Checking piano…"
            } else {
                "Installing piano…"
            }
            .into();
        }
    }
    fn finish(&self, result: Result<Option<PathBuf>, String>) -> Result<Status, String> {
        let mut s = self
            .inner
            .lock()
            .map_err(|_| "Piano bank state unavailable")?;
        s.busy = false;
        s.initialized = true;
        s.status.progress = None;
        s.status.cancellable = false;
        match result {
            Ok(Some(path)) => {
                s.ready = Some(path);
                s.status.installed = true;
                s.status.phase = "ready".into();
                s.status.message = "Piano installed. Works offline.".into();
            }
            Ok(None) => {
                s.status.installed = s.ready.is_some();
                s.status.phase = if s.ready.is_some() {
                    "ready"
                } else {
                    "not-installed"
                }
                .into();
                s.status.message = if s.ready.is_some() {
                    "Piano installed. Works offline."
                } else {
                    "Install the optional piano to play through the computer."
                }
                .into();
            }
            Err(message) => {
                s.status.installed = s.ready.is_some();
                s.status.phase = if self.cancel.load(Ordering::Acquire) {
                    "cancelled"
                } else {
                    "error"
                }
                .into();
                s.status.message = message;
            }
        }
        Ok(s.status.clone())
    }
}
fn cache_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&base).map_err(|e| e.to_string())?;
    Ok(base.join("piano"))
}

#[tauri::command]
pub async fn piano_bank_status(
    app: tauri::AppHandle,
    state: tauri::State<'_, State>,
) -> Result<Status, String> {
    let root = cache_root(&app)?;
    {
        let mut s = state
            .inner
            .lock()
            .map_err(|_| "Piano bank state unavailable")?;
        if s.initialized || s.busy {
            return Ok(s.status.clone());
        }
        s.busy = true;
        s.status.cancellable = false;
        s.status.phase = "checking".into();
        s.status.message = "Checking installed piano…".into();
    }
    let state = state.inner().clone();
    let worker = state.clone();
    match tauri::async_runtime::spawn_blocking(move || {
        let result = core::verify_installed(&root, &worker.cancel, |phase, pct| {
            worker.progress(phase, pct)
        });
        worker.finish(result)
    })
    .await
    {
        Ok(result) => result,
        Err(error) => state.finish(Err(format!("Piano verification worker failed: {error}"))),
    }
}
#[tauri::command]
pub async fn piano_bank_install(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    state: tauri::State<'_, State>,
) -> Result<Status, String> {
    let root = cache_root(&app)?;
    {
        let mut s = state
            .inner
            .lock()
            .map_err(|_| "Piano bank state unavailable")?;
        if s.busy {
            return Err("Piano installation is already running.".into());
        }
        s.busy = true;
        s.status.cancellable = true;
        s.status.phase = "choosing".into();
        s.status.progress = None;
        s.status.message = "Choose the original downloaded piano ZIP.".into();
        state.cancel.store(false, Ordering::Release);
    }
    let state = state.inner().clone();
    let worker = state.clone();
    match tauri::async_runtime::spawn_blocking(move || {
        let result = match crate::owned_dialog(&window)
            .add_filter("Accurate-Salamander piano", &["zip"])
            .pick_file()
        {
            None => Ok(None),
            Some(path) => core::install(&path, &root, &worker.cancel, |phase, pct| {
                worker.progress(phase, pct)
            })
            .map(Some),
        };
        worker.finish(result)
    })
    .await
    {
        Ok(result) => result,
        Err(error) => state.finish(Err(format!("Piano installation worker failed: {error}"))),
    }
}
#[tauri::command]
pub fn piano_bank_cancel(state: tauri::State<'_, State>) -> Result<(), String> {
    if state.status()?.cancellable {
        state.cancel.store(true, Ordering::Release);
    }
    Ok(())
}

pub const OFFICIAL_DOWNLOAD: &str = "https://www.ir.isas.jaxa.jp/~cyamauch/AccurateSalamander/";
pub const WINDOWS_AUDIO_HELP: &str =
    "https://learn.microsoft.com/en-us/windows-hardware/drivers/audio/low-latency-audio";
fn open_fixed(url: &'static str) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::ffi::OsStrExt;
        #[link(name = "shell32")]
        unsafe extern "system" {
            fn ShellExecuteW(
                window: isize,
                operation: *const u16,
                file: *const u16,
                parameters: *const u16,
                directory: *const u16,
                show: i32,
            ) -> isize;
        }
        let operation: Vec<u16> = std::ffi::OsStr::new("open")
            .encode_wide()
            .chain(Some(0))
            .collect();
        let target: Vec<u16> = std::ffi::OsStr::new(url)
            .encode_wide()
            .chain(Some(0))
            .collect();
        let result = unsafe {
            ShellExecuteW(
                0,
                operation.as_ptr(),
                target.as_ptr(),
                std::ptr::null(),
                std::ptr::null(),
                1,
            )
        };
        if result <= 32 {
            return Err("The download/help page could not open in your browser.".into());
        }
        Ok(())
    }
    #[cfg(target_os = "macos")]
    {
        let result = std::process::Command::new("/usr/bin/open")
            .arg(url)
            .status()
            .map_err(|e| e.to_string())?;
        if result.success() {
            Ok(())
        } else {
            Err("The download/help page could not open in your browser.".into())
        }
    }
    #[cfg(not(any(windows, target_os = "macos")))]
    {
        let _ = url;
        Err("Piano installation is available in the Windows and Mac desktop app.".into())
    }
}
#[tauri::command]
pub async fn piano_bank_download() -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(|| open_fixed(OFFICIAL_DOWNLOAD))
        .await
        .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn piano_audio_help() -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(|| open_fixed(WINDOWS_AUDIO_HELP))
        .await
        .map_err(|e| e.to_string())?
}
