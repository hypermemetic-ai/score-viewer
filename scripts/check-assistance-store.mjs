// Run inside qq-job. Test the production store both as a standalone crate and
// under the application's module name, without pulling in Tauri/GUI.
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
const dir=await mkdtemp(join(tmpdir(),'viewer-assistance-check-'));
try{
 const source=resolve('src-tauri/src/assistance_store.rs').replaceAll('\\','/');
 await writeFile(join(dir,'nested.rs'),`#[path=${JSON.stringify(source)}]\nmod assistance_store;\n`);
 await writeFile(join(dir,'Cargo.toml'),`[package]\nname="viewer-assistance-check"\nversion="0.0.0"\nedition="2021"\n[lib]\npath=${JSON.stringify(source)}\n[[test]]\nname="nested-module"\npath="nested.rs"\n[dependencies]\nserde={version="1",features=["derive"]}\nserde_json="1"\nsha2="=0.10.9"\nfs2="=0.4.3"\n`);
 const args=['test','--lib','--test','nested-module','--manifest-path',join(dir,'Cargo.toml'),'--jobs','2','--','--test-threads=2'];
 process.exitCode=await new Promise((done,reject)=>{const child=spawn(process.env.ASSISTANCE_CARGO??'cargo',args,{stdio:'inherit',env:{...process.env,CARGO_TARGET_DIR:process.env.ASSISTANCE_TARGET??join(tmpdir(),'viewer-assistance-target')}});child.on('error',reject);child.on('exit',code=>done(code??1));});
}finally{await rm(dir,{recursive:true,force:true});}
