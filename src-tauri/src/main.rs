#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{fs, path::PathBuf, sync::Mutex};
use base64::{engine::general_purpose::STANDARD, Engine};
use tauri::Manager;
mod midi_input;
mod midi_events;
mod practice_audio;
mod piano_engine;
mod piano_bank_core;
mod piano_bank;
mod managed_files;
mod assistance_store;
mod score_save;
mod score_pdf;
struct Store(Mutex<()>);
fn managed(app:&tauri::AppHandle,name:&str)->Result<PathBuf,String>{
 if !managed_files::valid_managed_name(name){return Err("Invalid managed file identity".into());}
 let dir=app.path().app_data_dir().map_err(|e|e.to_string())?;fs::create_dir_all(&dir).map_err(|e|e.to_string())?;
 let dir=managed_files::managed_directory(&dir).map_err(|e|e.to_string())?;Ok(dir.join(name))
}
#[tauri::command]
fn read_managed(app:tauri::AppHandle,name:String)->Result<Option<String>,String>{let p=managed(&app,&name)?;if !p.exists(){return Ok(None)};let data=fs::read(p).map_err(|e|e.to_string())?;if data.len()>100_000_000{return Err("Managed file too large".into())};Ok(Some(STANDARD.encode(data)))}
#[tauri::command]
fn write_managed(app:tauri::AppHandle,store:tauri::State<Store>,name:String,data:String)->Result<(),String>{let _guard=store.0.lock().map_err(|_|"Store unavailable")?;let p=managed(&app,&name)?;let b=STANDARD.decode(data).map_err(|e|e.to_string())?;if b.len()>100_000_000{return Err("Data too large".into())};let tmp=p.with_extension("pending");fs::write(&tmp,b).map_err(|e|e.to_string())?;
 // Windows replacement via MoveFileEx is atomic and preserves the old file on failure.
 #[cfg(windows)] {use std::os::windows::ffi::OsStrExt;unsafe extern "system" {fn MoveFileExW(a:*const u16,b:*const u16,flags:u32)->i32;}let a:Vec<u16>=tmp.as_os_str().encode_wide().chain(Some(0)).collect();let b:Vec<u16>=p.as_os_str().encode_wide().chain(Some(0)).collect();if unsafe{MoveFileExW(a.as_ptr(),b.as_ptr(),1|8)}==0{return Err(std::io::Error::last_os_error().to_string());}}
 #[cfg(not(windows))] fs::rename(&tmp,&p).map_err(|e|e.to_string())?;Ok(())}
#[tauri::command]
fn read_assistance(app:tauri::AppHandle,id:Option<String>)->Result<assistance_store::Snapshot,String>{
 let path=managed(&app,"library.json")?.parent().ok_or("Managed directory missing")?.join("assistance-v1");
 assistance_store::read(&path,id.as_deref())
}
#[tauri::command]
async fn commit_assistance(app:tauri::AppHandle,input:assistance_store::Commit)->Result<assistance_store::CommitResult,String>{
 let path=managed(&app,"library.json")?.parent().ok_or("Managed directory missing")?.join("assistance-v1");
 tauri::async_runtime::spawn_blocking(move||assistance_store::commit(&path,input)).await.map_err(|e|e.to_string())?
}
#[tauri::command]
async fn pick_score(musicxml:Option<bool>)->Result<Option<String>,String>{tauri::async_runtime::spawn_blocking(move||{let mut kinds=vec!["tuna","gp","gpx","gp3","gp4","gp5"];if musicxml==Some(true){kinds.extend(["musicxml","xml","mxl","mscz","mscx"]);}match rfd::FileDialog::new().add_filter("Scores",&kinds[..]).pick_file(){None=>Ok(None),Some(p)=>{let n=fs::metadata(&p).map_err(|e|e.to_string())?.len();if n>50_000_000{return Err("Package exceeds 50 MB".into())};Ok(Some(STANDARD.encode(fs::read(p).map_err(|e|e.to_string())?)))}}}).await.map_err(|e|e.to_string())?}
#[tauri::command]
async fn save_score(data:String,filename:String)->Result<bool,String>{
 if data.len()>66_666_668{return Err("Shared score exceeds 50 MB".into());}
 tauri::async_runtime::spawn_blocking(move||{let bytes=STANDARD.decode(data).map_err(|e|e.to_string())?;score_save::validate(&bytes,&filename)?;
 let path=rfd::FileDialog::new().add_filter("Native score",&["tuna"]).set_file_name(&filename).save_file();score_save::save(&bytes,path.as_deref())}).await.map_err(|e|e.to_string())?
}
#[tauri::command]
async fn export_pdf(window:tauri::WebviewWindow,filename:String,width_points:f64,height_points:f64)->Result<bool,String>{
 score_pdf::validate(&filename,width_points,height_points)?;
 #[cfg(not(windows))]{let _=window;Err("Saving a PDF is available in the Windows application.".into())}
 #[cfg(windows)]{
  let path=tauri::async_runtime::spawn_blocking(move||rfd::FileDialog::new().add_filter("PDF document",&["pdf"]).set_file_name(&filename).save_file()).await.map_err(|e|e.to_string())?;
  let Some(path)=path else{return Ok(false)};score_pdf::print(&window,path,width_points,height_points).await?;Ok(true)
 }
}
#[tauri::command]
async fn export_feedback(data:String,filename:Option<String>)->Result<bool,String>{tauri::async_runtime::spawn_blocking(move||{let filename=filename.unwrap_or_else(||"ISO-fingering-corrections.json".into());if filename.len()>100||!filename.ends_with(".json")||!filename.chars().all(|c|c.is_ascii_alphanumeric()||c=='-'||c=='.'){return Err("Invalid export filename".into())};if data.len()>20_000_000{return Err("Feedback too large".into())};match rfd::FileDialog::new().add_filter("JSON feedback",&["json"]).set_file_name(&filename).save_file(){None=>Ok(false),Some(p)=>{fs::write(p,data).map_err(|e|e.to_string())?;Ok(true)}}}).await.map_err(|e|e.to_string())?}
fn main(){tauri::Builder::default().manage(Store(Mutex::new(()))).manage(midi_input::State::default()).manage(practice_audio::State::default()).manage(piano_bank::State::default()).invoke_handler(tauri::generate_handler![read_managed,write_managed,read_assistance,commit_assistance,pick_score,save_score,export_pdf,export_feedback,midi_input::midi_sources,midi_input::midi_connect,midi_input::midi_disconnect,midi_input::midi_clock,practice_audio::practice_audio_outputs,practice_audio::practice_audio_begin,practice_audio::practice_audio_stop,practice_audio::practice_audio_arm_repeat,practice_audio::practice_audio_cancel_repeat,practice_audio::piano_audio_configure,practice_audio::piano_audio_status,piano_bank::piano_bank_status,piano_bank::piano_bank_install,piano_bank::piano_bank_cancel,piano_bank::piano_bank_download,piano_bank::piano_audio_help]).build(tauri::generate_context!()).expect("ISO viewer could not start").run(|app,event|{
 if matches!(event,tauri::RunEvent::Exit){
  midi_input::shutdown(&app.state::<midi_input::State>());
  if let Err(error)=app.state::<practice_audio::State>().shutdown(){
   eprintln!("Piano audio shutdown: {error}");
   // Preserve the restoration error without touching preferences or score data.
   let audit=(||->Result<(),String>{let directory=app.path().app_data_dir().map_err(|e|e.to_string())?;fs::create_dir_all(&directory).map_err(|e|e.to_string())?;let bytes=serde_json::to_vec(&serde_json::json!({"version":1,"error":error,"event":"normal-exit"})).map_err(|e|e.to_string())?;fs::write(directory.join("piano-audio-shutdown.json"),bytes).map_err(|e|e.to_string())})();
   if let Err(error)=audit{eprintln!("Piano shutdown audit could not be saved: {error}");}
  }
 }
 });}
