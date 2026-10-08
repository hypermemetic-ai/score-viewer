//! Shared metronome lifecycle with app-local native output adapters.
//! No ASIO, endpoint defaults, MIDI or host routing writes.
use serde::Serialize;
#[path="metronome_stream.rs"] mod metronome;
#[path="practice_audio_lifecycle.rs"] mod lifecycle;
#[derive(Default)] pub struct State(lifecycle::Playback);
#[derive(Serialize)] pub struct Output { id:String, name:String }
#[derive(Serialize)] pub struct Outputs { supported:bool, outputs:Vec<Output> }
#[cfg(target_os="macos")] #[path="practice_audio_macos.rs"] mod mac;
#[cfg(windows)] mod win {
 use super::*;
 use tauri::Emitter;
 use windows::{core::{GUID, PCWSTR}, Win32::{Foundation::PROPERTYKEY, Media::Audio::*, System::Com::{*, StructuredStorage::{PropVariantToStringAlloc, PropVariantClear}}}};
 fn error(e:windows::core::Error)->String {format!("Shared Windows audio could not open/play: {e}. The piano setup was not changed.")}
 struct Com; impl Com { unsafe fn enter()->Result<Self,String>{CoInitializeEx(None,COINIT_MULTITHREADED).ok().map_err(error)?;Ok(Self)}} impl Drop for Com {fn drop(&mut self){unsafe{CoUninitialize()}}}
 pub fn outputs()->Result<Outputs,String>{unsafe{let _com=Com::enter()?;let e:IMMDeviceEnumerator=CoCreateInstance(&MMDeviceEnumerator,None,CLSCTX_ALL).map_err(error)?;let all=e.EnumAudioEndpoints(eRender,DEVICE_STATE_ACTIVE).map_err(error)?;let mut outputs=vec![];for i in 0..all.GetCount().map_err(error)?{let d=all.Item(i).map_err(error)?;let id=d.GetId().map_err(error)?;let identity=id.to_string().map_err(|e|e.to_string())?;CoTaskMemFree(Some(id.0.cast()));let props=d.OpenPropertyStore(STGM_READ).map_err(error)?;let key=PROPERTYKEY{fmtid:GUID::from_u128(0xa45c254e_df1c_4efd_8020_67d146a850e0),pid:14};let mut value=props.GetValue(&key).map_err(error)?;let name=PropVariantToStringAlloc(&value).map_err(error)?;let label=name.to_string().map_err(|e|e.to_string())?;CoTaskMemFree(Some(name.0.cast()));let _=PropVariantClear(&mut value);outputs.push(Output{id:identity,name:label});}Ok(Outputs{supported:true,outputs})}}
 pub fn play(app:tauri::AppHandle,session:lifecycle::Session,device:String,request:lifecycle::Request){
  let result=(||unsafe{let _com=Com::enter()?;let e:IMMDeviceEnumerator=CoCreateInstance(&MMDeviceEnumerator,None,CLSCTX_ALL).map_err(error)?;
   if session.cancelled(){return Ok(());}
   let d=if device.is_empty(){e.GetDefaultAudioEndpoint(eRender,eMultimedia)}else{let id:Vec<u16>=device.encode_utf16().chain(Some(0)).collect();e.GetDevice(PCWSTR(id.as_ptr()))}.map_err(error)?;
   let client:IAudioClient=d.Activate(CLSCTX_ALL,None).map_err(error)?;
   let format=WAVEFORMATEX{wFormatTag:3,nChannels:2,nSamplesPerSec:44100,nAvgBytesPerSec:352800,nBlockAlign:8,wBitsPerSample:32,cbSize:0};
   client.Initialize(AUDCLNT_SHAREMODE_SHARED,AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM|AUDCLNT_STREAMFLAGS_SRC_DEFAULT_QUALITY,500_000,0,&format,None).map_err(error)?;
   let size=client.GetBufferSize().map_err(error)?;let render:IAudioRenderClient=client.GetService().map_err(error)?;
   let mut source=metronome::Metronome::new_with_grid(44100,request.bpm,request.duration_ms,request.count_step_ms,request.grid.clone());
   let fill=|n:u32,source:&mut metronome::Metronome,pending_repeat:bool|->Result<(),String>{if n==0{return Ok(());}let data=render.GetBuffer(n).map_err(error)?.cast::<f32>();let samples=std::slice::from_raw_parts_mut(data,n as usize*2);if session.cancelled(){samples.fill(0.0)}else if pending_repeat{source.fill_silence(samples,2,|v|v)}else{source.fill(samples,2,|v|v)}render.ReleaseBuffer(n,0).map_err(error)};
   fill(size,&mut source,request.repeat_start_micros.is_some())?;if session.cancelled(){return Ok(());}client.Start().map_err(error)?;
   // WASAPI retains its existing app-clock estimate at Start; it does not
   // expose the same callback/playback clock mapping as CoreAudio HAL.
   let began=crate::midi_input::midi_clock();let onset=if let Some(target)=request.repeat_start_micros{
    let queued=(size as f64/44100.0*1_000_000.0).ceil()as u64;
    source.repeat_timeline_full_count(began,queued,target,request.full_repeat_count_in)
   }else{metronome::onset_micros(began,0)}.ok_or("Audio playback clock overflow")?;
   let end=onset.saturating_add((request.duration_ms*1000.0).ceil()as u64);
   if session.started(onset){while !session.cancelled()&&crate::midi_input::midi_clock()<end{let available=size-client.GetCurrentPadding().map_err(error)?;if available>0{fill(available,&mut source,false)?;}std::thread::sleep(std::time::Duration::from_millis(5));}}
   client.Stop().map_err(error)?;Ok::<(),String>(())})();
  if let Err(message)=result {session.failed(message,|message|{let _=app.emit("viewer-audio-error",message);});}
  session.finish();
 }
}
#[tauri::command] pub fn practice_audio_outputs()->Result<Outputs,String>{#[cfg(windows)]{std::thread::spawn(win::outputs).join().map_err(|_|"Audio enumeration thread failed".to_string())?}#[cfg(target_os="macos")]{std::thread::spawn(mac::outputs).join().map_err(|_|"Audio enumeration thread failed".to_string())?}#[cfg(not(any(windows,target_os="macos")))]{Ok(Outputs{supported:false,outputs:vec![]})}}
#[tauri::command] pub fn practice_audio_stop(state:tauri::State<State>)->Result<(),String>{state.0.stop()}
#[tauri::command] pub fn practice_audio_begin(app:tauri::AppHandle,state:tauri::State<State>,device:String,bpm:f64,duration_ms:f64,count_in_step_ms:f64,repeat_start_micros:Option<f64>,full_repeat_count_in:Option<bool>,pulses_per_beat:Option<u32>,score_offset_pulses:Option<u32>,bar_start_pulses:Option<Vec<u64>>)->Result<u64,String>{
 let request=lifecycle::Request::new_with_grid(&device,bpm,duration_ms,count_in_step_ms,pulses_per_beat,score_offset_pulses,bar_start_pulses)?.with_repeat_start(repeat_start_micros)?.with_full_repeat_count_in(full_repeat_count_in.unwrap_or(false))?;
 #[cfg(any(windows,target_os="macos"))]{let (session,receiver)=state.0.begin()?;let worker=session.clone();std::thread::spawn(move||{
  #[cfg(windows)]win::play(app,worker,device,request);
  #[cfg(target_os="macos")]mac::play(app,worker,device,request);
 });session.wait_started(receiver,lifecycle::START_WAIT)}
 #[cfg(not(any(windows,target_os="macos")))]{let _=(app,state,device,request);Err("Native audio is available on Windows and macOS".into())}
}
