// Run inside qq-job. Observes the same production streaming admission core,
// without a Tauri picker or audio claim. Paths remain private command arguments.
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
const [archive,cache]=process.argv.slice(2);if(!archive||!cache)throw Error('Usage: node scripts/admit-piano-bank.mjs ORIGINAL_ZIP PRIVATE_CACHE');
const dir=await mkdtemp(join(tmpdir(),'viewer-piano-bank-admission-'));
try{
 const core=resolve('src-tauri/src/piano_bank_core.rs').replaceAll('\\','/');
 await writeFile(join(dir,'Cargo.toml'),`[package]\nname="viewer-piano-bank-admission"\nversion="0.0.0"\nedition="2021"\n[dependencies]\nserde={version="1",features=["derive"]}\nserde_json="1"\nsha2="0.10"\nzip={version="=0.6.6",default-features=false,features=["deflate"]}\nfs2="=0.4.3"\n`);
 await writeFile(join(dir,'main.rs'),`#[path=${JSON.stringify(core)}] mod core;
use std::{path::PathBuf,sync::atomic::AtomicBool};
fn main(){let args:Vec<_>=std::env::args().collect();let archive=PathBuf::from(&args[1]);let root=PathBuf::from(&args[2]);let stop=AtomicBool::new(false);let start=std::time::Instant::now();let mut last=String::new();let verify_only=args.get(3).map(|x|x=="verify-only").unwrap_or(false);let sfz=if verify_only{None}else{Some(core::install(&archive,&root,&stop,|phase,pct|{let key=format!("{phase} {}",pct/10);if key!=last{eprintln!("{phase}: {pct}%");last=key;}}).expect("original bank admission failed"))};let install_seconds=start.elapsed().as_secs_f64();let verify_start=std::time::Instant::now();let verified=core::verify_installed(&root,&stop,|_,_|{}).expect("offline cache verification failed").expect("bank pointer missing");if let Some(sfz)=sfz{assert_eq!(sfz,verified);}let rss=std::fs::read_to_string("/proc/self/status").ok().and_then(|s|s.lines().find(|x|x.starts_with("VmHWM:")).and_then(|x|x.split_whitespace().nth(1)).and_then(|x|x.parse::<u64>().ok()));println!("{}",serde_json::json!({"productionCore":true,"archiveBytes":core::ARCHIVE_BYTES,"archiveSha256":core::ARCHIVE_SHA256,"liveSha256":core::LIVE_SHA256,"sfz":verified,"verifyOnly":verify_only,"peakRssKiB":rss,"cache":root,"installSeconds":install_seconds,"offlineVerificationSeconds":verify_start.elapsed().as_secs_f64(),"offlineVerified":true,"nativePickerObserved":false,"audioObserved":false}));}
`);
 await writeFile(join(dir,'Cargo.toml'),await readFile(join(dir,'Cargo.toml'),'utf8')+'\n[[bin]]\nname="viewer-piano-bank-admission"\npath="main.rs"\n');
 const code=await new Promise((done,reject)=>{const child=spawn(process.env.PIANO_CARGO??'cargo',['run','--quiet',...(process.env.PIANO_BANK_RELEASE?['--release']:[]),'--manifest-path',join(dir,'Cargo.toml'),'--jobs','2','--',resolve(archive),resolve(cache),...(process.env.PIANO_BANK_VERIFY_ONLY?['verify-only']:[])],{stdio:'inherit',env:{...process.env,CARGO_TARGET_DIR:process.env.PIANO_CORE_TARGET??join(tmpdir(),'viewer-piano-bank-core-target')}});child.on('error',reject);child.on('exit',code=>done(code??1));});process.exitCode=code;
}finally{await rm(dir,{recursive:true,force:true});}
