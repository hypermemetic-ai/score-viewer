//! Passive input only. No output handle, thru, filters in the musical route, or startup open.
use serde::Serialize;
use tauri::Emitter;
use std::sync::OnceLock;
use std::time::Instant;
fn clock_micros() -> u64 { static ORIGIN: OnceLock<Instant> = OnceLock::new(); ORIGIN.get_or_init(Instant::now).elapsed().as_micros() as u64 }
#[tauri::command]
pub fn midi_clock() -> u64 { clock_micros() }
#[derive(Clone, Serialize)]
pub struct Note { source:String, generation:u64, channel:u8, note:u8, velocity:u8, on:bool, filtered:bool, timestamp_micros:u64, driver_micros:u64 }
#[derive(Clone,Serialize)]
pub struct Ports {pub supported:bool,pub sources:Vec<String>,pub message:String}
#[derive(Clone,Serialize)]
pub struct CC {source:String,generation:u64,channel:u8,controller:u8,value:u8,timestamp_micros:u64,driver_micros:u64}
#[derive(Clone,Serialize)]
pub struct Status {source:String,generation:u64,connected:bool,message:String}
#[cfg(any(windows, target_os="macos"))]
mod native {
 use super::*;use crate::midi_events::{MidiIngress,InputEvent};use midir::{MidiInput,MidiInputConnection,Ignore};use std::sync::{Arc,Mutex,atomic::{AtomicBool,Ordering}};
 struct Connection {generation:u64,source:String,active:Arc<AtomicBool>,handle:MidiInputConnection<()>}
 #[derive(Default)]struct Inner {generation:u64,connection:Option<Connection>}
 #[derive(Default,Clone)]pub struct State {inner:Arc<Mutex<Inner>>,operations:Arc<Mutex<()>>}
 fn input()->Result<MidiInput,String>{MidiInput::new("ISO Score Viewer passive pedal").map_err(|e|e.to_string())}
 pub fn ports()->Result<Ports,String>{let input=input()?;let sources=input.ports().iter().map(|p|input.port_name(p).map_err(|e|e.to_string())).collect::<Result<Vec<_>,_>>()?;Ok(Ports{supported:true,sources,message:"Select a source; Connect listens without changing the music route.".into()})}
 fn disconnect_inner(state:&State)->Result<(),String>{let old={let mut guard=state.inner.lock().map_err(|_|"MIDI state unavailable")?;guard.generation+=1;guard.connection.take()};if let Some(old)=old{old.active.store(false,Ordering::Release);drop(old.handle);}Ok(())}
 pub fn disconnect(state:&State)->Result<(),String>{let _operation=state.operations.lock().map_err(|_|"MIDI operation unavailable")?;disconnect_inner(state)}
 pub fn connect(app:tauri::AppHandle,state:&State,source:String)->Result<u64,String>{
  let _operation=state.operations.lock().map_err(|_|"MIDI operation unavailable")?;
  // Find by a unique current friendly name, never a persisted numeric index.
  let mut input=input()?;let matches=input.ports().into_iter().filter(|p|input.port_name(p).ok().as_deref()==Some(source.as_str())).collect::<Vec<_>>();
  if matches.len()!=1{return Err("Selected MIDI source is missing or its name is ambiguous. Refresh and choose a unique source.".into());}
  disconnect_inner(state)?;
  let generation={let mut guard=state.inner.lock().map_err(|_|"MIDI state unavailable")?;guard.generation+=1;guard.generation};
  let active=Arc::new(AtomicBool::new(true));let callback_active=active.clone();let callback_app=app.clone();let callback_source=source.clone();
  input.ignore(Ignore::All);
  let mut ingress=MidiIngress::default();
  let handle=input.connect(&matches[0],"ISO viewer read-only pedal",move |timestamp,data,_|{
   if !callback_active.load(Ordering::Acquire){return;}
   let timestamp_micros=clock_micros();
   // Guard the driver's original event spacing, not callback batching/delay.
   // Assessment retains its existing shared monotonic callback clock below.
   match ingress.receive(data,timestamp){
    Some(InputEvent::Note{channel,note,velocity,on,filtered})=>{let _=callback_app.emit("viewer-midi-note",Note{source:callback_source.clone(),generation,channel,note,velocity,on,filtered,timestamp_micros,driver_micros:timestamp});}
    Some(InputEvent::Controller{channel,controller,value})=>{let _=callback_app.emit("viewer-midi-cc",CC{source:callback_source.clone(),generation,channel,controller,value,timestamp_micros,driver_micros:timestamp});}
    None=>{}
   }
  },()).map_err(|e|format!("Could not listen to {source}: {e}. The music route was not changed."))?;
  {let mut guard=state.inner.lock().map_err(|_|"MIDI state unavailable")?;guard.connection=Some(Connection{generation,source:source.clone(),active:active.clone(),handle});}
  let monitor_state=state.clone();std::thread::spawn(move||{
   while active.load(Ordering::Acquire){std::thread::sleep(std::time::Duration::from_millis(750));if !active.load(Ordering::Acquire){break;}
    let available=ports().map(|p|p.sources.iter().filter(|s|*s==&source).count()==1).unwrap_or(false);
    if !available{
     let removed=if let Ok(mut guard)=monitor_state.inner.lock(){if guard.connection.as_ref().is_some_and(|c|c.generation==generation){guard.connection.take()}else{None}}else{None};
     if let Some(old)=removed{old.active.store(false,Ordering::Release);let _=app.emit("viewer-midi-status",Status{source:old.source.clone(),generation,connected:false,message:"MIDI input disconnected. Active pedal hold cleared; reconnect explicitly.".into()});drop(old.handle);}break;
    }
   }
  });Ok(generation)
 }
}
#[cfg(any(windows, target_os="macos"))]pub use native::State;
#[cfg(not(any(windows, target_os="macos")))]#[derive(Default)]pub struct State;
#[tauri::command]pub fn midi_sources()->Result<Ports,String>{
 #[cfg(any(windows, target_os="macos"))]{native::ports()}
 #[cfg(not(any(windows, target_os="macos")))]{Ok(Ports{supported:false,sources:vec![],message:"Connect a MIDI source on Windows or macOS.".into()})}
}
#[tauri::command]pub fn midi_connect(app:tauri::AppHandle,state:tauri::State<State>,source:String)->Result<u64,String>{
 #[cfg(any(windows, target_os="macos"))]{native::connect(app,&state,source)}
 #[cfg(not(any(windows, target_os="macos")))]{let _=(app,state,source);Err("Native MIDI input is available on Windows and macOS.".into())}
}
#[tauri::command]pub fn midi_disconnect(state:tauri::State<State>)->Result<(),String>{
 #[cfg(any(windows, target_os="macos"))]{native::disconnect(&state)}
 #[cfg(not(any(windows, target_os="macos")))]{let _=state;Ok(())}
}
