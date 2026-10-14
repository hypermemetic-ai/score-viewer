//! Immutable JSON versions and one atomic active pointer. All writers take the
//! same OS file lock; process-local mutexes alone do not protect a second app.
use fs2::FileExt;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::{collections::BTreeMap, fs::{self, File, OpenOptions}, io::{Read, Write}, path::Path};
const MAX_BYTES:u64=100_000_000;
const MAX_REVISION:u64=9_007_199_254_740_991;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Manifest {version:u8, revision:u64, previous:Option<String>, refs:BTreeMap<String,String>}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Snapshot {#[serde(flatten)] manifest:Manifest, id:Option<String>, documents:BTreeMap<String,Value>}
#[derive(Deserialize)]
#[serde(rename_all="camelCase",deny_unknown_fields)]
pub struct Commit {expected_revision:u64, changes:BTreeMap<String,Value>}
#[derive(Debug, Serialize)]
pub struct CommitResult {status:&'static str, snapshot:Snapshot}
fn empty()->Snapshot {Snapshot{manifest:Manifest{version:1,revision:0,previous:None,refs:BTreeMap::new()},id:None,documents:BTreeMap::new()}}
fn hash(bytes:&[u8])->String {format!("{:x}",Sha256::digest(bytes))}
fn valid_id(id:&str)->bool {id.len()==64&&id.bytes().all(|b|b.is_ascii_digit()||(b'a'..=b'f').contains(&b))}
fn valid_name(name:&str)->bool { !name.is_empty()&&name.len()<=230&&name.as_bytes()[0].is_ascii_alphanumeric()&&name.bytes().all(|b|b.is_ascii_alphanumeric()||b"._/-".contains(&b)) }
fn bounded_read(path:&Path)->Result<Vec<u8>,String> {
 let mut bytes=Vec::new();File::open(path).map_err(|e|e.to_string())?.take(MAX_BYTES+1).read_to_end(&mut bytes).map_err(|e|e.to_string())?;
 if bytes.len() as u64>MAX_BYTES{return Err("Assistance document too large".into())}Ok(bytes)
}
fn object(dir:&Path,id:&str)->Result<Vec<u8>,String> {
 if !valid_id(id){return Err("Invalid assistance object identity".into())}
 let bytes=bounded_read(&dir.join(format!("{id}.json")))?;
 if hash(&bytes)!=id{return Err("Corrupt assistance object".into())}Ok(bytes)
}
fn sync_directory(dir:&Path)->Result<(),String> {
 #[cfg(not(windows))] File::open(dir).and_then(|f|f.sync_all()).map_err(|e|e.to_string())?;
 #[cfg(windows)] let _=dir;
 Ok(())
}
fn replace(from:&Path,to:&Path)->Result<(),String> {
 #[cfg(windows)] {use std::os::windows::ffi::OsStrExt;unsafe extern "system" {fn MoveFileExW(a:*const u16,b:*const u16,flags:u32)->i32;}
  let a:Vec<u16>=from.as_os_str().encode_wide().chain(Some(0)).collect();let b:Vec<u16>=to.as_os_str().encode_wide().chain(Some(0)).collect();
  if unsafe{MoveFileExW(a.as_ptr(),b.as_ptr(),1|8)}==0{return Err(std::io::Error::last_os_error().to_string())}
 }
 #[cfg(not(windows))] fs::rename(from,to).map_err(|e|e.to_string())?;
 Ok(())
}
fn write_object(dir:&Path,value:&impl Serialize)->Result<String,String> {
 let bytes=serde_json::to_vec(value).map_err(|e|e.to_string())?;
 if bytes.len() as u64>MAX_BYTES{return Err("Assistance document too large".into())}
 let id=hash(&bytes);let path=dir.join(format!("{id}.json"));
 if path.exists(){if object(dir,&id)?!=bytes{return Err("Assistance object collision".into())}return Ok(id)}
 // A crash may leave staging bytes, never a partial content-addressed object.
 let temp=dir.join("object.pending");let mut f=File::create(&temp).map_err(|e|e.to_string())?;
 f.write_all(&bytes).and_then(|_|f.sync_all()).map_err(|e|e.to_string())?;drop(f);
 replace(&temp,&path)?;sync_directory(dir)?;Ok(id)
}
pub fn read(dir:&Path,id:Option<&str>)->Result<Snapshot,String> {
 let owned;
 let id=match id {Some(id)=>id,None=>{
  match File::open(dir.join("current")){Ok(f)=>{let mut s=String::new();f.take(65).read_to_string(&mut s).map_err(|e|e.to_string())?;owned=s;&owned},Err(e) if e.kind()==std::io::ErrorKind::NotFound=>return Ok(empty()),Err(e)=>return Err(e.to_string())}
 }};
 let manifest:Manifest=serde_json::from_slice(&object(dir,id)?).map_err(|e|e.to_string())?;
 if manifest.version!=1||manifest.revision==0||manifest.revision>MAX_REVISION||manifest.previous.as_ref().is_some_and(|id|!valid_id(id)){return Err("Invalid assistance manifest".into())}
 let mut documents=BTreeMap::new();
 for (name,id) in &manifest.refs {
  if !valid_name(name){return Err("Invalid assistance document name".into())}
  documents.insert(name.clone(),serde_json::from_slice(&object(dir,id)?).map_err(|e|e.to_string())?);
 }
 Ok(Snapshot{manifest,id:Some(id.into()),documents})
}
pub fn commit(dir:&Path,input:Commit)->Result<CommitResult,String> { commit_with_hook(dir,input,||Ok(())) }
fn commit_with_hook(dir:&Path,input:Commit,before_activate:impl FnOnce()->Result<(),String>)->Result<CommitResult,String> {
 if input.expected_revision>MAX_REVISION||input.changes.keys().any(|name|!valid_name(name)){return Err("Invalid assistance commit".into())}
 fs::create_dir_all(dir).map_err(|e|e.to_string())?;
 let lock=OpenOptions::new().read(true).write(true).create(true).truncate(false).open(dir.join("writer.lock")).map_err(|e|e.to_string())?;
 lock.lock_exclusive().map_err(|e|e.to_string())?;
 let current=read(dir,None)?;
 if current.manifest.revision!=input.expected_revision{return Ok(CommitResult{status:"conflict",snapshot:current})}
 if current.manifest.revision==MAX_REVISION{return Err("Assistance revision exhausted".into())}
 let mut refs=current.manifest.refs;let mut documents=current.documents;
 for (name,value) in input.changes {
  if value.is_null(){refs.remove(&name);documents.remove(&name);}
  else {refs.insert(name.clone(),write_object(dir,&value)?);documents.insert(name,value);}
 }
 let manifest=Manifest{version:1,revision:input.expected_revision+1,previous:current.id,refs};
 let id=write_object(dir,&manifest)?;
 before_activate()?;
 let temp=dir.join("current.pending");let mut f=File::create(&temp).map_err(|e|e.to_string())?;
 f.write_all(id.as_bytes()).and_then(|_|f.sync_all()).map_err(|e|e.to_string())?;drop(f);
 replace(&temp,&dir.join("current"))?;sync_directory(dir)?;
 Ok(CommitResult{status:"committed",snapshot:Snapshot{manifest,id:Some(id),documents}})
}

#[cfg(test)]
mod tests {
 use super::*;
 use serde_json::json;
 use std::sync::{Arc,Barrier};
 fn dir(label:&str)->std::path::PathBuf {let p=std::env::temp_dir().join(format!("assistance-{}-{label}",std::process::id()));let _=fs::remove_dir_all(&p);fs::create_dir_all(&p).unwrap();p}
 fn input(revision:u64,changes:Value)->Commit {serde_json::from_value(json!({"expectedRevision":revision,"changes":changes})).unwrap()}
 #[test]
 fn atomic_bundle_and_history_survive_conflict_and_interruption(){
  let p=dir("bundle");let first=commit(&p,input(0,json!({"memory":{"finger":2},"personal/a":{"finger":2},"receipt/a":{"complete":true}}))).unwrap();
  assert_eq!(first.status,"committed");let id=first.snapshot.id.unwrap();
  let failure=commit_with_hook(&p,input(1,json!({"memory":{"finger":3},"receipt/a":{"complete":false}})),||Err("interrupted".into()));assert!(failure.is_err());
  let retained=read(&p,None).unwrap();assert_eq!(retained.id.as_ref(),Some(&id));assert_eq!(retained.documents["memory"]["finger"],2);
  let second=commit(&p,input(1,json!({"memory":{"finger":4},"receipt/a":null}))).unwrap();assert_eq!(second.snapshot.manifest.previous.as_ref(),Some(&id));
  assert_eq!(read(&p,Some(&id)).unwrap().documents["receipt/a"]["complete"],true);
  let stale=commit(&p,input(1,json!({"personal/a":{"finger":5}}))).unwrap();assert_eq!(stale.status,"conflict");assert_eq!(stale.snapshot.documents["memory"]["finger"],4);
  fs::remove_dir_all(p).unwrap();
 }
 #[test]
 fn concurrent_handles_accept_exactly_one_revision(){
  let p=dir("concurrent");let barrier=Arc::new(Barrier::new(2));
  let handles:Vec<_>=(0..2).map(|i|{let p=p.clone();let barrier=barrier.clone();std::thread::spawn(move||{barrier.wait();commit(&p,input(0,json!({"memory":{"writer":i}}))).unwrap()})}).collect();
  let results:Vec<_>=handles.into_iter().map(|h|h.join().unwrap()).collect();assert_eq!(results.iter().filter(|r|r.status=="committed").count(),1);assert_eq!(results.iter().filter(|r|r.status=="conflict").count(),1);assert_eq!(read(&p,None).unwrap().manifest.revision,1);fs::remove_dir_all(p).unwrap();
 }
 #[test]
 fn process_commit_helper(){
  let Ok(path)=std::env::var("VIEWER_ASSISTANCE_PROCESS_TEST") else{return};
  let result=commit(Path::new(&path),input(0,json!({"memory":{"pid":std::process::id()}}))).unwrap();
  println!("ASSISTANCE_RESULT={}",result.status);
 }
 #[test]
 fn separate_processes_share_the_compare_and_swap_lock(){
  let p=dir("processes");let exe=std::env::current_exe().unwrap();
  // libtest names omit the crate prefix but retain the containing modules.
  // This file is a crate in the standalone check and a module in the app.
  let helper=concat!(module_path!(),"::process_commit_helper").split_once("::").expect("test module must include a crate prefix").1;
  let mut children=Vec::new();
  for _ in 0..2 {children.push(std::process::Command::new(&exe).args(["--exact",helper,"--nocapture"]).env("VIEWER_ASSISTANCE_PROCESS_TEST",&p).stdout(std::process::Stdio::piped()).spawn().unwrap());}
  let outputs:Vec<_>=children.into_iter().map(|child|{let out=child.wait_with_output().unwrap();let output=String::from_utf8(out.stdout).unwrap();assert!(out.status.success(),"helper {helper} failed: {output}");assert_eq!(output.matches("ASSISTANCE_RESULT=").count(),1,"child must execute helper {helper} exactly once: {output}");output}).collect();
  assert_eq!(outputs.iter().filter(|s|s.contains("ASSISTANCE_RESULT=committed")).count(),1);
  assert_eq!(outputs.iter().filter(|s|s.contains("ASSISTANCE_RESULT=conflict")).count(),1);
  fs::remove_dir_all(p).unwrap();
 }
 #[test]
 fn corrupt_objects_fail_closed(){let p=dir("corrupt");let first=commit(&p,input(0,json!({"memory":{"finger":2}}))).unwrap();let id=&first.snapshot.manifest.refs["memory"];fs::write(p.join(format!("{id}.json")),b"{}").unwrap();assert!(read(&p,None).is_err());assert!(commit(&p,input(1,json!({"memory":{}}))).is_err());fs::remove_dir_all(p).unwrap();}
}
