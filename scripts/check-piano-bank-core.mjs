// Run inside qq-job. Exercises generated native ZIP fixtures without Tauri/GUI.
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
const dir=await mkdtemp(join(tmpdir(),'viewer-piano-bank-core-'));
try{
 const source=resolve('src-tauri/src/piano_bank_core.rs').replaceAll('\\','/');
 await writeFile(join(dir,'Cargo.toml'),`[package]\nname="viewer-piano-bank-core-check"\nversion="0.0.0"\nedition="2021"\n[lib]\npath=${JSON.stringify(source)}\n[dependencies]\nserde={version="1",features=["derive"]}\nserde_json="1"\nsha2="0.10"\nzip={version="=0.6.6",default-features=false,features=["deflate"]}\nfs2="=0.4.3"\n`);
 const args=['test','--lib','--manifest-path',join(dir,'Cargo.toml'),'--jobs','2','--','--test-threads=2'];
 const code=await new Promise((done,reject)=>{const child=spawn(process.env.PIANO_CARGO??'cargo',args,{stdio:'inherit',env:{...process.env,CARGO_TARGET_DIR:process.env.PIANO_CORE_TARGET??join(tmpdir(),'viewer-piano-bank-core-target')}});child.on('error',reject);child.on('exit',code=>done(code??1));});
 process.exitCode=code;
}finally{await rm(dir,{recursive:true,force:true});}
