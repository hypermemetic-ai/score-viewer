// Run inside qq-job. Compiles the portable native audio core (practice_audio,
// mixer, schedule, cue lifecycle) and its unit tests without Tauri/GUI/outputs.
// A minimal stand-in `tauri` crate type-checks the commands; Windows/macOS
// hosts are compiled only by the paired native build.
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
const dir=await mkdtemp(join(tmpdir(),'viewer-piano-audio-core-'));
try{
 const source=resolve('src-tauri/src/practice_audio.rs').replaceAll('\\','/');
 const crate=async(name,toml,lib)=>{await mkdir(join(dir,name,'src'),{recursive:true});await writeFile(join(dir,name,'Cargo.toml'),toml);await writeFile(join(dir,name,'src','lib.rs'),lib);};
 await crate('tauri-macros','[package]\nname="tauri-macros-standin"\nversion="0.0.0"\nedition="2021"\n[lib]\nproc-macro=true\n',
  'use proc_macro::TokenStream;\n#[proc_macro_attribute]\npub fn command(_: TokenStream, item: TokenStream) -> TokenStream { item }\n');
 await crate('tauri','[package]\nname="tauri"\nversion="0.0.0"\nedition="2021"\n[dependencies]\ntauri-macros-standin={path="../tauri-macros"}\n',
  `pub use tauri_macros_standin::command;
#[derive(Clone)] pub struct AppHandle;
pub trait Emitter { fn emit<S>(&self, _: &str, _: S) -> Result<(), String> { Ok(()) } }
impl Emitter for AppHandle {}
pub struct State<'a, T>(pub &'a T);
impl<T> std::ops::Deref for State<'_, T> { type Target = T; fn deref(&self) -> &T { self.0 } }
pub mod async_runtime {
 pub fn spawn_blocking<F: FnOnce() -> R, R>(f: F) -> std::future::Ready<Result<R, String>> { std::future::ready(Ok(f())) }
}
`);
 await crate('core','[package]\nname="viewer-piano-audio-core-check"\nversion="0.0.0"\nedition="2021"\n[dependencies]\nserde={version="1",features=["derive"]}\nserde_json="1"\ntauri={path="../tauri"}\n',
  `pub mod midi_input {
 pub fn midi_clock() -> u64 { static ORIGIN: std::sync::OnceLock<std::time::Instant> = std::sync::OnceLock::new(); ORIGIN.get_or_init(std::time::Instant::now).elapsed().as_micros() as u64 }
}
pub mod piano_bank {
 pub struct State;
 impl State { pub fn ready_sfz(&self) -> Result<Option<std::path::PathBuf>, String> { Ok(None) } }
}
#[path = ${JSON.stringify(source)}]
pub mod practice_audio;
`);
 const args=['test','--lib','--manifest-path',join(dir,'core','Cargo.toml'),'--jobs','2','--','--test-threads=2'];
 const code=await new Promise((done,reject)=>{const child=spawn(process.env.PIANO_CARGO??'cargo',args,{stdio:'inherit',env:{...process.env,CARGO_TARGET_DIR:process.env.PIANO_CORE_TARGET??join(tmpdir(),'viewer-piano-audio-core-target')}});child.on('error',reject);child.on('exit',code=>done(code??1));});
 process.exitCode=code;
}finally{await rm(dir,{recursive:true,force:true});}
