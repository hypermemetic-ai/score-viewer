import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {freezeInputs} from '../scripts/native-delivery/freeze-inputs.mjs';
import {sha256,canonical,inventory} from '../scripts/native-delivery/score-viewer-carrier-inputs.mjs';
import {receiptPrivacyProblems} from '../scripts/native-delivery/receipt-privacy.mjs';
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
async function put(root,path,data){await mkdir(join(root,path,'..'),{recursive:true});await writeFile(join(root,path),data);}
async function fixture(t,{unprotected}={}){
 const root=await mkdtemp(join(tmpdir(),'viewer-freeze-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const viewerSource=join(root,'source'),frontend=join(root,'frontend'),checks=join(root,'checks.json'),output=join(root,'sealed');await mkdir(viewerSource);await mkdir(frontend);
 const notationRevision='b'.repeat(40);
 for(const [path,data]of Object.entries({'package.json':'{"name":"iso-score-viewer","version":"0.1.0"}','package-lock.json':'{"packages":{}}','src-tauri/Cargo.toml':'[package]\nname="iso-score-viewer"\nversion="0.1.0"\n','src-tauri/tauri.conf.json':JSON.stringify({version:'0.1.0',identifier:'dev.qqp.iso-score-viewer',productName:'ISO Score Viewer'}),'src-tauri/src/assistance_store.rs':'const VALID_RECORD_NAME_LIMIT: usize = 400;\n','docs/source-provenance.json':JSON.stringify({dependencyRevision:notationRevision}),'delivery-input/inputs.json':'old seal remains untouched\n'}))await put(viewerSource,path,data);
 await put(viewerSource,'.gitattributes',['package.json','package-lock.json','src-tauri/Cargo.toml','src-tauri/tauri.conf.json','src-tauri/src/assistance_store.rs'].filter(path=>path!==unprotected).map(path=>`"${path}" -text\n`).join(''));
 git(viewerSource,'init','-q');git(viewerSource,'add','.');git(viewerSource,'update-index','--add','--cacheinfo',`160000,${notationRevision},vendor/iso-notation`);await mkdir(join(viewerSource,'vendor/iso-notation'),{recursive:true});git(viewerSource,'-c','user.name=fixture','-c','user.email=f@example.invalid','commit','-qm','new application');
 const viewerRevision=git(viewerSource,'rev-parse','HEAD');
 for(const [path,data]of Object.entries({'index.html':'<!DOCTYPE html><html></html>','assets/reader.js':'console.log("new runtime")','assets/font.otf':'fixture font'}))await put(frontend,path,data);
 const receipt={schema:1,viewerRevision,notationRevision,frontendDigest:sha256(canonical(await inventory(frontend))),checks:Object.fromEntries(['tests','build','browserInspection','independentReview'].map(name=>[name,{status:'passed',fixture:true}]))};await writeFile(checks,JSON.stringify(receipt));
 return{root,viewerSource,viewerRevision,frontend,checks,output,receipt};
}
test('new viewer seal derives current source and exact native bytes without copying an old application identity',async t=>{
 const f=await fixture(t),before=git(f.viewerSource,'status','--porcelain');
 const result=await freezeInputs(f),inputs=JSON.parse(await readFile(join(f.output,'inputs.json')));
 assert.equal(result.sourceInputs.viewerRevision,f.viewerRevision);assert.equal(inputs.viewer.tree,git(f.viewerSource,'rev-parse','HEAD^{tree}'));
 const native=await readFile(join(f.viewerSource,'src-tauri/src/assistance_store.rs'));
 assert.deepEqual(inputs.nativeFiles['src-tauri/src/assistance_store.rs'],{sha256:sha256(native),size:native.length});
 assert.deepEqual(await inventory(join(f.output,'frontend')),await inventory(f.frontend));
 assert.equal(await readFile(join(f.viewerSource,'delivery-input/inputs.json'),'utf8'),'old seal remains untouched\n');
 assert.equal(git(f.viewerSource,'status','--porcelain'),before);
 await assert.rejects(freezeInputs(f),{code:'EEXIST'});
});
test('freezing refuses a native file that a Windows checkout would convert to CRLF',async t=>{
 const f=await fixture(t,{unprotected:'src-tauri/src/assistance_store.rs'});
 await assert.rejects(freezeInputs(f),/lack -text in \.gitattributes: src-tauri\/src\/assistance_store\.rs$/);await assert.rejects(access(f.output),{code:'ENOENT'});
});
test('freezing refuses stale receipts, dirty sources and output overlapping source without changing the original seal',async t=>{
 const f=await fixture(t);f.receipt.viewerRevision='c'.repeat(40);await writeFile(f.checks,JSON.stringify(f.receipt));
 await assert.rejects(freezeInputs(f),/receipt does not bind/);await assert.rejects(access(f.output),{code:'ENOENT'});
 f.receipt.viewerRevision=f.viewerRevision;await writeFile(f.checks,JSON.stringify(f.receipt));
 await put(f.viewerSource,'src-tauri/src/assistance_store.rs','uncommitted change');await assert.rejects(freezeInputs(f),/must be clean/);
 await assert.rejects(freezeInputs({...f,output:join(f.viewerSource,'new-seal')}),/must be separate/);
 assert.equal(await readFile(join(f.viewerSource,'delivery-input/inputs.json'),'utf8'),'old seal remains untouched\n');
});
test('freezing refuses a receipt naming a home path, a private data copy or a score by anything but a public id, without saying the name',async t=>{
 const f=await fixture(t),local=join(f.root,'private-names.txt');await writeFile(local,'# local, never committed\nAn Unpublished Nocturne\n');
 process.env.SCORE_VIEWER_PRIVATE_SCORE_NAMES=local;t.after(()=>{delete process.env.SCORE_VIEWER_PRIVATE_SCORE_NAMES;});
 const refused=async(checks,kind,where,secret)=>{
  f.receipt.checks.tests={status:'passed',...checks};await writeFile(f.checks,JSON.stringify(f.receipt));
  await assert.rejects(freezeInputs(f),error=>kind.test(error.message)&&error.message.includes(where)&&!(secret&&error.message.toLowerCase().includes(secret.toLowerCase())),JSON.stringify(checks));
  await assert.rejects(access(f.output),{code:'ENOENT'});
 };
 for(const [note,kind] of [['run in /home/someone/projects/viewer',/home directory path/],['copied from C:\\Users\\someone\\AppData',/Windows user directory path/],
  ['state in ~/.local/state/viewer',/per-user state path/],['rehearsed on /tmp/owner-data-20261021',/private data copy path/],['opened /srv/scores/private.tuna',/score archive path outside fixtures/],
  ['opened an unpublished  NOCTURNE, at bar 3',/local private list/]])await refused({note},kind,'$.checks.tests.note','nocturne');
 // Where a receipt names scores (a map keyed by score, or a score field), only public ids and "a private score" pass;
 // the location shows the key's position, not the key, even for a problem found beneath it.
 await refused({timingsMs:{'schumann-op68-no14':[1,2],'A Private Title':[3,4]}},/not a public studio id/,'$.checks.tests.timingsMs{key 1} (key)','private title');
 await refused({timingsMs:{'A Private Title':{data:'/home/someone/copy'}}},/home directory path/,'$.checks.tests.timingsMs{key 0}.data','private title');
 await refused({rehearsed:[{score:'A Private Title'}]},/not a public studio id/,'$.checks.tests.rehearsed[0].score','private title');
 await refused({scores:['schumann-op68-no14','No. 13']},/not a public studio id/,'$.checks.tests.scores[1]','no. 13');
 // Public names pass: public studio ids, a public fixture path, field names, relative paths and the literal "a private score".
 f.receipt.checks.tests={status:'passed',note:'Rehearsed schumann-op68-no14 (fixtures/schumann-op68-no14.tuna) and a private score on a private data copy.',
  timingsMs:{note:'first open / reopen','schumann-op68-no13':[1,2],'a private score':[3,4],'a private score 2':[5,6]},files:{'src/main.ts':1},scores:['bach-goldberg-var1','a private score']};
 await writeFile(f.checks,JSON.stringify(f.receipt));await freezeInputs(f);
 assert.deepEqual(receiptPrivacyProblems({note:'nothing private'}),[]);
});
