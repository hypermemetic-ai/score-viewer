//! Private delivery operation, not an application entry point. Uses the exact
//! production atomic store; it never changes a personal journal or archive.
#[path = "../../src-tauri/src/assistance_store.rs"]
mod assistance_store;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{collections::BTreeMap, fs, path::Path};
const REQUEST: &str = "personal-fingering-consolidation-request";
fn hash(bytes: &[u8]) -> String { format!("{:x}", Sha256::digest(bytes)) }
fn pinned(path: &Path, expected: &str) -> Result<Vec<u8>, String> {
    if expected.len()!=64 || !expected.bytes().all(|b|b.is_ascii_digit()||(b'a'..=b'f').contains(&b)) { return Err("Expected SHA256 required".into()); }
    if fs::metadata(path).map_err(|e|e.to_string())?.len()>100_000_000 {return Err("Pinned input too large".into())}
    let bytes=fs::read(path).map_err(|e|e.to_string())?;
    if hash(&bytes)!=expected {return Err("Pinned input changed".into())} Ok(bytes)
}
fn validate(request: &Value, library: &Value) -> Result<(), String> {
    let entries=library["entries"].as_array().ok_or("Library entries missing")?;
    let ids=request["entryIds"].as_array().filter(|x|!x.is_empty()).ok_or("Request entries missing")?;
    let sources=request["sourceRevisions"].as_object().ok_or("Source revisions missing")?;
    if request["version"]!=1 || request["receiptId"].as_str().is_none_or(|s|s.is_empty()||s.len()>230) {return Err("Invalid request version or receipt".into())}
    let mut seen=std::collections::BTreeSet::new();
    for id in ids {
        let id=id.as_str().ok_or("Invalid entry ID")?;
        if !seen.insert(id) || !entries.iter().any(|entry|entry["id"]==id) || sources.get(id).and_then(Value::as_str).is_none_or(str::is_empty) {return Err("Request does not match current library".into())}
    }
    if let Some(keys)=request.get("personalKeys") {
        let keys=keys.as_array().filter(|x|!x.is_empty()).ok_or("Invalid personal keys")?;
        for key in keys {
            let key=key.as_str().filter(|x|!x.is_empty()).ok_or("Invalid personal key")?;
            if !entries.iter().filter(|entry|ids.contains(&entry["id"])).any(|entry|entry["personalFiles"].get(key).is_some()) {return Err("Personal key is not active in the selected entries".into())}
        }
    }
    Ok(())
}
fn stage(root: &Path, request: Value, library: &Value, expected: u64) -> Result<Value,String> {
    validate(&request,library)?;
    let dir=root.join("assistance-v1");
    let before=serde_json::to_value(assistance_store::read(&dir,None)?).map_err(|e|e.to_string())?;
    if before["revision"]!=expected {return Err("Assistance revision changed".into())}
    if let Some(old)=before["documents"].get(REQUEST) {
        if old!=&request {return Err("Another consolidation request is already staged".into())}
        return Ok(json!({"status":"already-staged","manifest":before["id"],"revision":expected,"requestSha256":hash(&serde_json::to_vec(&request).unwrap())}));
    }
    let input=serde_json::from_value(json!({"expectedRevision":expected,"changes":{REQUEST:request}})).map_err(|e|e.to_string())?;
    let result=serde_json::to_value(assistance_store::commit(&dir,input)?).map_err(|e|e.to_string())?;
    if result["status"]!="committed" {return Err("Assistance revision changed; request not staged".into())}
    let after=serde_json::to_value(assistance_store::read(&dir,None)?).map_err(|e|e.to_string())?;
    if after["documents"][REQUEST]!=request || after["id"]!=result["snapshot"]["id"] {return Err("Request readback failed".into())}
    for (name, value) in before["documents"].as_object().ok_or("Invalid snapshot")? {if after["documents"][name]!=*value {return Err("Unrelated assistance document changed".into())}}
    Ok(json!({"status":"staged","priorManifest":before["id"],"manifest":after["id"],"revision":after["revision"],"request":request,"personalJournalsChanged":false,"consolidationApplied":false}))
}
#[cfg(windows)]
fn closed() -> Result<(),String> {
    let output=std::process::Command::new("tasklist.exe").args(["/FI","IMAGENAME eq iso-score-viewer.exe","/FO","CSV","/NH"]).output().map_err(|e|e.to_string())?;
    if !output.status.success() || String::from_utf8_lossy(&output.stdout).to_lowercase().contains("\"iso-score-viewer.exe\"") {return Err("Viewer must be normally closed before staging".into())} Ok(())
}
#[cfg(not(windows))]
fn closed()->Result<(),String>{Err("Live staging is Windows-only".into())}
fn run()->Result<Value,String>{
    let args:Vec<String>=std::env::args().skip(1).collect();
    if args.len()!=14 {return Err("Usage: viewer-assistance-stage --managed-directory DIR --request FILE --request-sha256 SHA --library-sha256 SHA --expected-revision N --preservation-receipt FILE --preservation-sha256 SHA".into())}
    let opts:BTreeMap<_,_>=args.chunks_exact(2).map(|p|(p[0].as_str(),p[1].as_str())).collect();
    let get=|key|opts.get(key).copied().ok_or_else(||format!("Missing {key}"));
    let root=Path::new(get("--managed-directory")?);
    let expected_root=Path::new(&std::env::var("APPDATA").map_err(|_|"APPDATA unavailable")?).join("dev.qqp.iso-score-viewer");
    if fs::canonicalize(root).map_err(|e|e.to_string())?!=fs::canonicalize(expected_root).map_err(|e|e.to_string())? {return Err("Native data identity differs".into())}
    closed()?;
    let library=pinned(&root.join("library.json"),get("--library-sha256")?)?;
    let request=pinned(Path::new(get("--request")?),get("--request-sha256")?)?;
    let preservation:Value=serde_json::from_slice(&pinned(Path::new(get("--preservation-receipt")?),get("--preservation-sha256")?)?).map_err(|e|e.to_string())?;
    if preservation["status"]!="verified-closed-preservation" || preservation["byteExactCopies"]!=true || preservation["viewerNormallyClosed"]!=true || preservation["dataRoot"].as_str()!=root.to_str() {return Err("Closed preservation receipt differs".into())}
    let backup=Path::new(preservation["snapshot"].as_str().ok_or("Preservation snapshot missing")?).join("data/library.json");
    pinned(&backup,get("--library-sha256")?)?;
    let library:Value=serde_json::from_slice(&library).map_err(|e|e.to_string())?;
    let request:Value=serde_json::from_slice(&request).map_err(|e|e.to_string())?;
    closed()?;
    pinned(&root.join("library.json"),get("--library-sha256")?)?;
    stage(root,request,&library,get("--expected-revision")?.parse().map_err(|_|"Invalid revision")?)
}
fn main(){match run(){Ok(result)=>println!("{}",result),Err(error)=>{eprintln!("{error}");std::process::exit(1)}}}

#[cfg(test)]
mod stage_tests {
    use super::*;
    #[test]
    fn stages_only_request_preserves_documents_and_reads_back_idempotently(){
        let dir=std::env::temp_dir().join(format!("viewer-stage-{}",std::process::id()));let _=fs::remove_dir_all(&dir);fs::create_dir_all(&dir).unwrap();
        let library=json!({"entries":[{"id":"entry","personalFiles":{"state-a.json":"version-a.json"}}]});
        let request=json!({"version":1,"entryIds":["entry"],"sourceRevisions":{"entry":"revision"},"receiptId":"once","personalKeys":["state-a.json"]});
        let input=serde_json::from_value(json!({"expectedRevision":0,"changes":{"personal/a":{"finger":3},"prior-receipt":{"completed":true}}})).unwrap();
        assistance_store::commit(&dir.join("assistance-v1"),input).unwrap();
        fs::write(dir.join("version-a.json"),b"original personal journal").unwrap();
        assert!(stage(&dir,request.clone(),&library,0).is_err());
        let result=stage(&dir,request.clone(),&library,1).unwrap();assert_eq!(result["status"],"staged");assert_eq!(result["revision"],2);
        assert_eq!(fs::read(dir.join("version-a.json")).unwrap(),b"original personal journal");
        let again=stage(&dir,request.clone(),&library,2).unwrap();assert_eq!(again["status"],"already-staged");
        let mut different=request;different["receiptId"]=json!("different");assert!(stage(&dir,different,&library,2).is_err());
        let snapshot=serde_json::to_value(assistance_store::read(&dir.join("assistance-v1"),None).unwrap()).unwrap();assert_eq!(snapshot["documents"]["personal/a"]["finger"],3);assert_eq!(snapshot["documents"]["prior-receipt"]["completed"],true);
        fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn refuses_missing_source_entry_and_inactive_personal_key(){
        let library=json!({"entries":[{"id":"entry","personalFiles":{"key":"version"}}]});
        let mut r=json!({"version":1,"entryIds":["entry"],"sourceRevisions":{"entry":"source"},"receiptId":"once"});assert!(validate(&r,&library).is_ok());
        r["personalKeys"]=json!(["historical-key"]);assert!(validate(&r,&library).is_err());r.as_object_mut().unwrap().remove("personalKeys");r["sourceRevisions"]=json!({});assert!(validate(&r,&library).is_err());
    }
}
