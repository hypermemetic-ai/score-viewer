import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile, rm, cp, symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createCarrier} from '../scripts/create-native-release-carrier.mjs';
import {canonical, inventory, sha256, sourceIdentity, validateCarrierInputs, validatePreparedCarrier} from '../scripts/native-release-carrier/inputs.mjs';

function git(root, ...args) {return execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}
async function file(root, path, bytes) {await mkdir(join(root,path,'..'),{recursive:true});await writeFile(join(root,path),bytes);}
async function commit(root) {git(root,'add','.');git(root,'-c','user.name=Carrier fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture');return git(root,'rev-parse','HEAD');}
async function fixture() {
  const root=await mkdtemp(join(tmpdir(),'score-viewer-carrier-test-')),iso=join(root,'iso'),viewer=join(root,'viewer'),frontend=join(root,'frontend'),checks=join(root,'checks.json');
  for(const path of [iso,viewer,frontend])await mkdir(path);
  git(iso,'init','-q');git(viewer,'init','-q');
  await file(iso,'scripts/score-viewer-delivery.mjs',"import {brotliDecompressSync} from 'node:zlib';\nexport function validateIdentity(identity) {}\nfunction prepared() {\n  validateIdentity(manifest.identity);\n  return {sourceRevision:manifest.identity.sourceRevision,version:manifest.identity.version,score:manifest.identity.score};\n}\n");
  await file(iso,'scripts/score-viewer-native-worker.mjs',"import {performance} from 'node:perf_hooks';\nasync function input() {\n  const manifest=await validatePrepared(prepared,{expectedRevision:git('rev-parse','HEAD')});\n  await cp(join(ctx.prepared,'Schumann-No14.isoscore'),join(packet,'Schumann-No14.isoscore'));\n}\n");
  await file(iso,'licenses/NOTICE.txt','Shared notice\n');
  await file(iso,'score-viewer/src-tauri/old.rs','old native fixture\n');
  await file(iso,'.gitignore','score-viewer/dist\n');
  const notationRevision=await commit(iso);
  await file(viewer,'package.json',JSON.stringify({name:'iso-score-viewer',version:'0.1.0'}));
  await file(viewer,'package-lock.json','{"lockfileVersion":3}\n');
  await file(viewer,'src-tauri/tauri.conf.json',JSON.stringify({version:'0.1.0',identifier:'dev.qqp.iso-score-viewer',productName:'ISO Score Viewer'}));
  await file(viewer,'src-tauri/Cargo.toml','[package]\nname="iso-score-viewer"\nversion="0.1.0"\n');
  await file(viewer,'licenses/NOTICE.txt','Shared notice\n');
  await file(viewer,'docs/source-provenance.json',JSON.stringify({dependencyRevision:notationRevision}));
  await file(viewer,'.gitmodules','[submodule "vendor/iso-notation"]\n path = vendor/iso-notation\n url = https://example.invalid/iso-notation\n');
  await mkdir(join(viewer,'vendor','iso-notation'),{recursive:true});
  git(viewer,'update-index','--add','--cacheinfo',`160000,${notationRevision},vendor/iso-notation`);
  const viewerRevision=await commit(viewer);
  await file(frontend,'index.html','<!doctype html><html><body></body></html>\n');
  await file(frontend,'assets/reader.js','console.log("fixture");\n');
  await file(frontend,'assets/font.otf','fixture font\n');
  const frontendDigest=sha256(canonical(await inventory(frontend)));
  const receipt={schema:1,viewerRevision,notationRevision,frontendDigest,checks:Object.fromEntries(['tests','build','browserInspection','independentReview'].map(name=>[name,{status:'passed',fixture:true}]))};
  await writeFile(checks,JSON.stringify(receipt,null,2)+'\n');
  return {root,iso,viewer,frontend,checks,viewerRevision,notationRevision,frontendDigest,receipt};
}
async function withFixture(fn) {const f=await fixture();try{await fn(f);}finally{await rm(f.root,{recursive:true,force:true});}}
const args=f=>({viewerSource:f.viewer,viewerRevision:f.viewerRevision,frontend:f.frontend,checks:f.checks,isoCarrier:f.iso});

test('carrier freezes exact final native inputs and frontend with independent source identities',async()=>withFixture(async f=>{
  const result=await createCarrier(args(f));
  assert.equal(result.viewerRevision,f.viewerRevision);assert.equal(result.notationRevision,f.notationRevision);
  assert.equal(result.frontendDigest,f.frontendDigest);
  const validated=await validateCarrierInputs(f.iso,{expectedViewerRevision:f.viewerRevision,expectedNotationRevision:f.notationRevision});
  assert.equal(validated.sourceInputs.viewerRevision,f.viewerRevision);
  const worker=await readFile(join(f.iso,'scripts','score-viewer-native-worker.mjs'),'utf8');
  assert.match(worker,/validateCarrierInputs\(source\)/);assert.match(worker,/Source-provenance\.json/);
  const delivery=await readFile(join(f.iso,'scripts','score-viewer-delivery.mjs'),'utf8');
  assert.match(delivery,/validatePreparedCarrier\(root,manifest.identity\)/);
  assert.match(delivery,/sourceInputs:manifest.identity.sourceInputs/);
  assert.equal(git(f.viewer,'status','--porcelain'),'');
  for(const [path,pin]of Object.entries(validated.inputs.nativeFiles))assert.equal(sha256(await readFile(join(f.iso,'score-viewer',path))),pin.sha256);
}));

test('stale review/source/frontend is rejected before writing the isolated carrier',async()=>withFixture(async f=>{
  const initial=git(f.iso,'status','--porcelain');
  await writeFile(f.checks,JSON.stringify({...f.receipt,viewerRevision:'1'.repeat(40)}));
  await assert.rejects(createCarrier(args(f)),/does not bind final source/);
  assert.equal(git(f.iso,'status','--porcelain'),initial);
  await writeFile(f.checks,JSON.stringify(f.receipt));
  await file(f.frontend,'assets/reader.js','changed reader\n');
  await assert.rejects(createCarrier(args(f)),/does not bind final source/);
  assert.equal(git(f.iso,'status','--porcelain'),initial);
}));

test('a linked frontend root is refused before any source or carrier mutation',async()=>withFixture(async f=>{
  const linked=join(f.root,'linked-frontend');
  await symlink(f.frontend,linked,'dir');
  const original=await inventory(f.frontend),carrierStatus=git(f.iso,'status','--porcelain');
  await assert.rejects(createCarrier({...args(f),frontend:linked}),/root must be a real directory/);
  assert.deepEqual(await inventory(f.frontend),original);
  assert.equal(git(f.iso,'status','--porcelain'),carrierStatus);
  assert.equal(git(f.viewer,'status','--porcelain'),'');
}));

test('carrier inputs retain exact bytes under a Windows-style autocrlf checkout',async()=>withFixture(async f=>{
  await createCarrier(args(f));await commit(f.iso);
  const checkout=join(f.root,'windows-checkout');
  git(f.root,'clone','-q','--no-hardlinks','--config','core.autocrlf=true',f.iso,checkout);
  const validated=await validateCarrierInputs(checkout);
  assert.equal(validated.sourceInputs.frontendDigest,f.frontendDigest);
  assert.equal(validated.sourceInputs.viewerRevision,f.viewerRevision);
  assert.equal(git(checkout,'status','--porcelain'),'');
}));

test('native workers refuse changed native files, unexpected source files and changed notices',async()=>withFixture(async f=>{
  await createCarrier(args(f));
  const native=join(f.iso,'score-viewer','src-tauri','Cargo.toml'),original=await readFile(native);
  await writeFile(native,'changed native source\n');
  await assert.rejects(validateCarrierInputs(f.iso),/Native source inventory differs/);
  await writeFile(native,original);
  await file(f.iso,'score-viewer/src-tauri/extra.rs','unreviewed\n');
  await assert.rejects(validateCarrierInputs(f.iso),/Native source inventory differs/);
  await rm(join(f.iso,'score-viewer','src-tauri','extra.rs'));
  await file(f.iso,'licenses/NOTICE.txt','changed shared notice\n');
  await assert.rejects(validateCarrierInputs(f.iso),/Shared\/native notice differs/);
}));

test('prepared payload verification binds original frontend, review receipt and explicit source identity',async()=>withFixture(async f=>{
  await createCarrier(args(f));
  const {inputs,sourceInputs}=await validateCarrierInputs(f.iso),prepared=join(f.root,'prepared');
  await mkdir(prepared);await cp(join(f.iso,'delivery-input','frontend'),join(prepared,'frontend'),{recursive:true});
  await cp(join(f.iso,'delivery-input','inputs.json'),join(prepared,'source-inputs.json'));
  await cp(join(f.iso,'delivery-input','checks.json'),join(prepared,'source-checks.json'));
  await file(prepared,'frontend/release-identity.json','{"carrier":"fixture"}\n');
  await validatePreparedCarrier(prepared,{sourceInputs});
  await assert.rejects(validatePreparedCarrier(prepared,{sourceInputs:{...sourceInputs,viewerRevision:'1'.repeat(40)}}),/identity differs/);
  await file(prepared,'frontend/assets/reader.js','an old executable reader\n');
  await assert.rejects(validatePreparedCarrier(prepared,{sourceInputs}),/frontend differs/);
  await cp(join(f.iso,'delivery-input','frontend','assets','reader.js'),join(prepared,'frontend','assets','reader.js'));
  await file(prepared,'source-checks.json',JSON.stringify({...f.receipt,checks:{}}));
  await assert.rejects(validatePreparedCarrier(prepared,{sourceInputs}),/reviewed checks differ/);
  assert.equal(sourceIdentity(inputs,await readFile(join(prepared,'source-inputs.json'))).viewerRevision,f.viewerRevision);
}));
