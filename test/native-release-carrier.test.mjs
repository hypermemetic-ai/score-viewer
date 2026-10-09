import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile, rm, cp, symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createCarrier} from '../scripts/create-native-release-carrier.mjs';
import {canonical, inventory, sha256, sourceIdentity, validateCarrierInputs, validatePreparedCarrier, validateRecipientCarrier} from '../scripts/native-release-carrier/inputs.mjs';
import {packagePianoNotices, validatePianoRecipient, verifyBundledPianoNotices, addPianoWorkerChecks, requirePianoWorkerChecks, verifyWindowsPianoRuntime, validateMacPianoDiagnostic, runMacPianoDiagnostic, macPianoDiagnosticPrefix, macPianoDiagnosticTest} from '../scripts/native-release-carrier/score-viewer-piano-release.mjs';

function git(root, ...args) {return execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}
async function file(root, path, bytes) {await mkdir(join(root,path,'..'),{recursive:true});await writeFile(join(root,path),bytes);}
async function commit(root) {git(root,'add','.');git(root,'-c','user.name=Carrier fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture');return git(root,'rev-parse','HEAD');}
async function fixture() {
  const root=await mkdtemp(join(tmpdir(),'score-viewer-carrier-test-')),iso=join(root,'iso'),viewer=join(root,'viewer'),frontend=join(root,'frontend'),checks=join(root,'checks.json');
  for(const path of [iso,viewer,frontend])await mkdir(path);
  git(iso,'init','-q');git(viewer,'init','-q');
  await file(iso,'scripts/score-viewer-delivery.mjs',"import {brotliDecompressSync} from 'node:zlib';\nexport function validateIdentity(identity) {}\nfunction prepared() {\n  validateIdentity(manifest.identity);\n  const binaryPath=platform==='windows-x64'?'iso-score-viewer.exe':'ISO Score Viewer.app/Contents/MacOS/iso-score-viewer';\n    const binary=files[platform==='windows-x64'?'iso-score-viewer.exe':'ISO Score Viewer.app/Contents/MacOS/iso-score-viewer'];\n  if(receipt.nativeChecks?.tests!=='passed')throw Error('worker');\n    if(receipt.nativeChecks?.tests!=='passed')throw Error('pair');\n  return {sourceRevision:manifest.identity.sourceRevision,version:manifest.identity.version,score:manifest.identity.score};\n}\n");
  await file(iso,'scripts/score-viewer-native-worker.mjs',"import {performance} from 'node:perf_hooks';\nasync function input() {\n  const manifest=await validatePrepared(prepared,{expectedRevision:git('rev-parse','HEAD')});\n  await cp(join(ctx.prepared,'Schumann-No14.isoscore'),join(packet,'Schumann-No14.isoscore'));\n}\nexport async function notices(source,viewer,packet,targetTriple) {\n  const names=['URW-base35-provenance.md','URW-base35-LICENSE','URW-base35-COPYING','OFL-Bravura.txt'];\n  await writeJson(preparedConfig,{build:{beforeBuildCommand:'',frontendDist:'../dist'}});\n  await writeJson(join(packet,'native-dependencies.json'),{manifestSha256:sha256(await readFile(join(viewer,'src-tauri','Cargo.toml')))});\n}\nasync function finishWorker() {\n  const hashes=await inventory(packet);\n}\n");
  await file(iso,'scripts/build-score-viewer-macos.mjs',"import {performance} from 'node:perf_hooks';\nconst packet = await mkdtemp(join(tmpdir(),'iso-mac-recipient-'));\nawait ctx.stage('nativeBuildMs',()=>run());\nconst bundledNoticeHashes={};\nconst noticeNames=['URW-base35-provenance.md','URW-base35-LICENSE','URW-base35-COPYING','OFL-Bravura.txt'];\nawait finishWorker(ctx,'macos-universal',packet,binary,\n  {tests:'passed',virtualMidi:'passed',signatures:'passed',resources:'passed'});\n");
  await file(iso,'licenses/NOTICE.txt','Shared notice\n');
  await file(iso,'score-viewer/src-tauri/old.rs','old native fixture\n');
  await file(iso,'.gitignore','score-viewer/dist\n');
  const notationRevision=await commit(iso);
  await file(viewer,'package.json',JSON.stringify({name:'iso-score-viewer',version:'0.1.0'}));
  await file(viewer,'package-lock.json','{"lockfileVersion":3}\n');
  await file(viewer,'src-tauri/tauri.conf.json',JSON.stringify({version:'0.1.0',identifier:'dev.qqp.iso-score-viewer',productName:'ISO Score Viewer'}));
  await file(viewer,'src-tauri/Cargo.toml','[package]\nname="iso-score-viewer"\nversion="0.1.0"\n');
  await file(viewer,'src-tauri/build.rs','fn main() { build_native_engine(); tauri_build::build() }\n');
  await file(viewer,'src-tauri/piano-build/CMakeLists.txt','cmake_minimum_required(VERSION 3.20)\nproject(piano LANGUAGES C CXX)\n');
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
async function bindViewer(f) {
  f.viewerRevision = await commit(f.viewer);
  f.receipt.viewerRevision = f.viewerRevision;
  await writeFile(f.checks,JSON.stringify(f.receipt,null,2)+'\n');
}
async function addPiano(f) {
  await file(f.viewer,'.cargo/config.toml','[target.\'cfg(all(windows, target_env="msvc"))\']\nrustflags = ["-C", "target-feature=+crt-static"]\n');
  const revision='4'.repeat(40), originals={'LICENSE':'Engine fixture license\n','synth.cpp':'int piano_fixture() { return 1; }\n','external/dependency/LICENSE':'Dependency fixture license\n','unlinked/LICENSE':'Unlinked source-only license fixture\n'};
  const source={schema:1,engine:{repository:'https://github.com/dusk-audio/dusk-fizz',revision},components:[{path:'.',revision},{path:'external/dependency',revision:'5'.repeat(40)}],excluded:['tests/unused.cpp'],
    files:Object.fromEntries(Object.entries(originals).map(([name,bytes])=>[name,{bytes:Buffer.byteLength(bytes),sha256:sha256(bytes)}])),licenses:['LICENSE','external/dependency/LICENSE','unlinked/LICENSE']};
  const sourceBytes=JSON.stringify(source,null,2)+'\n';
  for(const [name,bytes]of Object.entries({...originals,'provenance.json':sourceBytes}))await file(f.viewer,`src-tauri/vendor/sfizz/${name}`,bytes);
  const noticeFiles={'LICENSE':originals.LICENSE,'external/dependency/LICENSE':originals['external/dependency/LICENSE'],'provenance.json':sourceBytes};
  for(const [name,bytes]of Object.entries(noticeFiles))await file(f.viewer,`src-tauri/piano-notices/${name}`,bytes);
  await file(f.viewer,'src-tauri/piano-notices/manifest.json',JSON.stringify({schema:1,name:'Dusk-Fizz/sfizz',version:'1.2.3',revision,files:Object.fromEntries(Object.entries(noticeFiles).map(([name,bytes])=>[name,{size:Buffer.byteLength(bytes),sha256:sha256(bytes)}]))},null,2)+'\n');
  await bindViewer(f);
}
async function addModificationDisclosure(f) {
  const sourcePath='piano-build/WINDOWS-UTF8-COMPATIBILITY.md',bytes='Authored disclosure of exact private Windows UTF-8 build-copy transformation.\n';
  await file(f.viewer,`src-tauri/${sourcePath}`,bytes);
  await file(f.viewer,'src-tauri/piano-notices/BUILD-MODIFICATIONS.md',bytes);
  const path=join(f.viewer,'src-tauri/piano-notices/manifest.json'),manifest=JSON.parse(await readFile(path));
  manifest.files['BUILD-MODIFICATIONS.md']={size:Buffer.byteLength(bytes),sha256:sha256(bytes),sourcePath};
  await writeFile(path,JSON.stringify(manifest,null,2)+'\n');
  await bindViewer(f);
}

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
  assert.equal(await readFile(join(f.iso,'score-viewer','src-tauri','build.rs'),'utf8'),await readFile(join(f.viewer,'src-tauri','build.rs'),'utf8'));
  assert.match(worker,/packagePianoNotices/);assert.match(worker,/addPianoWorkerChecks/);
  assert.match(await readFile(join(f.iso,'scripts','build-score-viewer-macos.mjs'),'utf8'),/verifyBundledPianoNotices/);
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

test('both recipient archives must carry byte-exact source and validation evidence',async()=>withFixture(async f=>{
  await createCarrier(args(f));
  const prepared=join(f.root,'prepared');await mkdir(prepared);
  await cp(join(f.iso,'delivery-input','inputs.json'),join(prepared,'source-inputs.json'));
  await cp(join(f.iso,'delivery-input','checks.json'),join(prepared,'source-checks.json'));
  await file(prepared,'frontend/release-identity.json','{"fixture":"embedded identity"}\n');
  const files={};
  for(const [recipient,path]of [['Source-provenance.json','source-inputs.json'],['Source-validation.json','source-checks.json'],['Release-identity.json','frontend/release-identity.json']])files[recipient]=await readFile(join(prepared,path));
  files['notices/NOTICE.txt']=await readFile(join(f.iso,'licenses/NOTICE.txt'));
  await validateRecipientCarrier(files,prepared);
  await assert.rejects(validateRecipientCarrier({...files,'Source-validation.json':Buffer.from('false review')},prepared),/Recipient source evidence differs/);
  await assert.rejects(validateRecipientCarrier({...files,'Release-identity.json':undefined},prepared),/Recipient source evidence differs/);
}));

test('a complete vendored engine preserves its build script and source closure byte-exactly',async()=>withFixture(async f=>{
  await addPiano(f);await createCarrier(args(f));
  const {inputs}=await validateCarrierInputs(f.iso);
  assert.ok(inputs.nativeFiles['src-tauri/vendor/sfizz/synth.cpp']);
  assert.ok(inputs.nativeFiles['src-tauri/piano-build/CMakeLists.txt']);
  assert.ok(inputs.nativeFiles['src-tauri/build.rs']);
  assert.equal(await readFile(join(f.iso,'score-viewer','.cargo','config.toml'),'utf8'),await readFile(join(f.viewer,'.cargo','config.toml'),'utf8'));
  const checkout=join(f.root,'windows-engine-checkout');await commit(f.iso);
  git(f.root,'clone','-q','--no-hardlinks','--config','core.autocrlf=true',f.iso,checkout);
  await validateCarrierInputs(checkout);
  assert.equal(git(f.viewer,'status','--porcelain'),'');
}));

test('a competing Cargo config cannot silently alter native build flags',async()=>withFixture(async f=>{
  await addPiano(f);await createCarrier(args(f));
  await file(f.iso,'score-viewer/.cargo/config','[build]\nrustflags=[]\n');
  await assert.rejects(validateCarrierInputs(f.iso),/Cargo configuration inventory differs/);
}));

function peImport(name, delay=false) {
  const bytes=Buffer.alloc(2048),pe=0x80,optional=pe+24,section=optional+240;
  bytes.write('MZ');bytes.writeUInt32LE(pe,60);bytes.write('PE\0\0',pe);bytes.writeUInt16LE(0x8664,pe+4);bytes.writeUInt16LE(1,pe+6);bytes.writeUInt16LE(240,pe+20);
  bytes.writeUInt16LE(0x20b,optional);bytes.writeUInt32LE(512,optional+60);bytes.writeUInt32LE(16,optional+108);
  bytes.writeUInt32LE(1024,section+8);bytes.writeUInt32LE(0x1000,section+12);bytes.writeUInt32LE(1024,section+16);bytes.writeUInt32LE(512,section+20);
  const directory=optional+112+(delay?13:1)*8;
  bytes.writeUInt32LE(0x1000,directory);bytes.writeUInt32LE(delay?64:40,directory+4);
  if(delay)bytes.writeUInt32LE(1,512);
  bytes.writeUInt32LE(0x1100,512+(delay?4:12));bytes.write(name,768);
  return bytes;
}

test('Windows piano rejects normal and delay-loaded VC runtime DLL prerequisites',()=>{
  assert.deepEqual(verifyWindowsPianoRuntime(peImport('KERNEL32.dll')).imports,['kernel32.dll']);
  assert.deepEqual(verifyWindowsPianoRuntime(peImport('msvcp_win.dll',true)).imports,['msvcp_win.dll']);
  for(const name of ['MSVCP140.dll','MSVCP140_2.dll','VCRUNTIME140.dll','CONCRT140.dll','VCOMP140.dll'])for(const delay of [false,true])assert.throws(()=>verifyWindowsPianoRuntime(peImport(name,delay)),/VC runtime DLL prerequisite/);
  const invalid=peImport('KERNEL32.dll');invalid.writeUInt32LE(0xfffffff0,512+12);
  assert.throws(()=>verifyWindowsPianoRuntime(invalid),/outside file-backed/);
  assert.throws(()=>verifyWindowsPianoRuntime(Buffer.from('MZ')),/invalid PE bounds/);
});

function macDiagnostic(result='passed') {
  const log='running 1 test\ntest result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 36 filtered out;\n';
  const files = {[`${macPianoDiagnosticPrefix}cargo-stdout.txt`]:Buffer.from(log),[`${macPianoDiagnosticPrefix}cargo-stderr.txt`]:Buffer.alloc(0)};
  let report={version:1,result:'unavailable',reason:'CoreAudio reports no active render outputs on this runner',physicalAcceptance:false,settingsChanged:false};
  if(result==='passed') {
    const status={ready:true,running:true,outputUid:'fixture-output-uid',sampleRate:48000,bufferFrames:128,periodFrames:128,mode:'coreaudio-hal-current',latencyTier:0,error:null};
    report={version:1,result:'passed',outputUid:'fixture-output-uid',outputName:'Fixture',originalBufferFrames:512,finalBufferFrames:512,originalRate:48000,finalRate:48000,
      low:status,high:{...status,latencyTier:2,bufferFrames:480,periodFrames:480},initializationFailureRestored:true,explicitCloseRestored:true,reconfigureRestored:true,dropShutdownRestored:true,
      panicTrailingPeak:0,sampleCount:96000,pianoOnly:{startFrame:0,endFrame:24000,startSample:0,endSample:24000,peak:0,scope:'before cue publication'},physicalAcceptance:false,sampleRateDefaultOrDriverChanges:false,normalAppExitHookAcceptance:'source lifecycle hook; this diagnostic exercises Host drop/explicit close'};
    const pcm=Buffer.alloc(44+report.sampleCount*4);
    pcm.write('RIFF');pcm.writeUInt32LE(pcm.length-8,4);pcm.write('WAVEfmt ',8);pcm.writeUInt32LE(16,16);pcm.writeUInt16LE(3,20);pcm.writeUInt16LE(1,22);
    pcm.writeUInt32LE(48000,24);pcm.writeUInt32LE(192000,28);pcm.writeUInt16LE(4,32);pcm.writeUInt16LE(32,34);pcm.write('data',36);pcm.writeUInt32LE(pcm.length-44,40);
    for(let i=0;i<12000;i++) {pcm.writeFloatLE(Math.sin(i)*0.15,44+i*4);report.pianoOnly.peak=Math.max(report.pianoOnly.peak,Math.abs(pcm.readFloatLE(44+i*4)));}
    files[`${macPianoDiagnosticPrefix}submitted-pcm.wav`]=pcm;
    files[`${macPianoDiagnosticPrefix}fixture.wav`]=Buffer.from('test-owned fixture');
    files[`${macPianoDiagnosticPrefix}fixture.sfz`]=Buffer.from('<region> sample=fixture.wav');
  }
  files[`${macPianoDiagnosticPrefix}macos-stream-diagnostic.json`]=Buffer.from(JSON.stringify(report));
  return {files,report};
}
function macReport(files,report) {return {...files,[`${macPianoDiagnosticPrefix}macos-stream-diagnostic.json`]:Buffer.from(JSON.stringify(report))};}

test('Mac diagnostic only admits the explicit no-output limitation',()=>{
  const {files,report}=macDiagnostic('unavailable');
  assert.equal(validateMacPianoDiagnostic(files).check.status,'unavailable');
  for(const reason of ['sampler failed','stream initialization failed','shared buffer cannot be restored'])assert.throws(()=>validateMacPianoDiagnostic(macReport(files,{...report,reason})),/unexpected.*unavailability/);
  assert.throws(()=>validateMacPianoDiagnostic(macReport(files,{...report,result:'started'})),/did not complete/);
  assert.throws(()=>validateMacPianoDiagnostic({...files,[`${macPianoDiagnosticPrefix}cargo-stdout.txt`]:Buffer.from('running 0 tests')}),/not executed exactly once/);
});

test('Mac passed diagnostic binds initialized streams, restored HAL state and actual PCM',()=>{
  const {files,report}=macDiagnostic();
  assert.equal(validateMacPianoDiagnostic(files).check.status,'passed');
  assert.throws(()=>validateMacPianoDiagnostic(macReport(files,{...report,finalBufferFrames:128})),/restoration evidence/);
  assert.throws(()=>validateMacPianoDiagnostic(macReport(files,{...report,high:{...report.high,ready:false}})),/initialized stream/);
  assert.throws(()=>validateMacPianoDiagnostic(macReport(files,{...report,sampleCount:report.sampleCount-1})),/dimensions differ/);
  const waveName=`${macPianoDiagnosticPrefix}submitted-pcm.wav`,silence=Buffer.from(files[waveName]);silence.fill(0,44);
  assert.throws(()=>validateMacPianoDiagnostic({...files,[waveName]:silence}),/sampler\/panic PCM/);
  const nan=Buffer.from(files[waveName]);nan.writeFloatLE(NaN,44);
  assert.throws(()=>validateMacPianoDiagnostic({...files,[waveName]:nan}),/non-finite/);
  const panic=Buffer.from(files[waveName]);panic.writeFloatLE(0.2,panic.length-4);
  assert.throws(()=>validateMacPianoDiagnostic({...files,[waveName]:panic}),/sampler\/panic PCM/);
  const cueOnly=Buffer.from(files[waveName]);cueOnly.fill(0,44);
  for(let i=24000;i<36000;i++)cueOnly.writeFloatLE(Math.sin(i)*0.15,44+i*4);
  assert.throws(()=>validateMacPianoDiagnostic({...files,[waveName]:cueOnly}),/piano-only PCM/);
  assert.throws(()=>validateMacPianoDiagnostic(macReport(files,{...report,pianoOnly:{...report.pianoOnly,endSample:report.sampleCount+1}})),/piano-only interval/);
});

test('Mac runner invokes the exact opted-in test and binds recipient evidence',async()=>withFixture(async f=>{
  await addPiano(f);await createCarrier(args(f));
  const {inputs}=await validateCarrierInputs(f.iso),packet=join(f.root,'mac-packet'),viewer=join(f.iso,'score-viewer');
  const fixture=macDiagnostic(),calls=[];
  const ctx={source:f.iso,viewer,stage:async(name,fn)=>{calls.push(name);return fn();}};
  const diagnostic=await runMacPianoDiagnostic(ctx,packet,'aarch64-apple-darwin',['--config','fixture=true'],{MACOSX_DEPLOYMENT_TARGET:'13.3'},async(args,cwd,env)=>{
    assert.equal(cwd,viewer);assert.equal(env.VIEWER_AUDIO_DIAGNOSTIC_OUTPUT_ID,'');assert.equal(env.MACOSX_DEPLOYMENT_TARGET,'13.3');
    assert.deepEqual(args.slice(-6),['--',macPianoDiagnosticTest,'--ignored','--exact','--nocapture','--test-threads=1']);
    for(const [name,bytes] of Object.entries(fixture.files))if(!name.includes('cargo-'))await file(env.VIEWER_AUDIO_DIAGNOSTIC_REPORT_DIR,name.slice(macPianoDiagnosticPrefix.length),bytes);
    return {stdout:fixture.files[`${macPianoDiagnosticPrefix}cargo-stdout.txt`].toString(),stderr:''};
  });
  assert.deepEqual(calls,['pianoCoreAudioDiagnosticMs']);
  const receipt={platform:'macos-universal',nativeChecks:{pianoSources:'passed',pianoNotices:'passed',pianoCoreAudio:diagnostic.check},details:{pianoCoreAudio:diagnostic.details}};
  requirePianoWorkerChecks(receipt,inputs.nativeFiles,fixture.files);
  assert.throws(()=>requirePianoWorkerChecks({...receipt,details:{}},inputs.nativeFiles,fixture.files),/receipt differs/);
  assert.throws(()=>requirePianoWorkerChecks(receipt,inputs.nativeFiles,macReport(fixture.files,{...fixture.report,dropShutdownRestored:false})),/restoration evidence/);
  assert.match(await readFile(join(f.iso,'scripts','build-score-viewer-macos.mjs'),'utf8'),/runMacPianoDiagnostic\(ctx,packet,host,nativeReleaseCargoArgs,env\)/);
}));

test('missing or failed Mac diagnostic cannot become a passing runner skip',async()=>withFixture(async f=>{
  await addPiano(f);await createCarrier(args(f));
  const ctx={source:f.iso,viewer:join(f.iso,'score-viewer'),stage:async(_,fn)=>fn()};
  await assert.rejects(runMacPianoDiagnostic(ctx,join(f.root,'missing-packet'),'aarch64-apple-darwin',[],{},async()=>({stdout:'running 0 tests',stderr:''})),/invalid JSON/);
  await assert.rejects(runMacPianoDiagnostic(ctx,join(f.root,'failed-packet'),'aarch64-apple-darwin',[],{},async()=>{throw Error('available stream test failed');}),/available stream test failed/);
}));

test('changed engine notices are refused before any carrier mutation',async()=>withFixture(async f=>{
  await addPiano(f);
  await file(f.viewer,'src-tauri/piano-notices/LICENSE','A different license\n');await bindViewer(f);
  await assert.rejects(createCarrier(args(f)),/curated notice pin differs/);
  assert.equal(git(f.iso,'status','--porcelain'),'');
}));

test('only the exact reviewed build-modification disclosure may use an authored source binding',async()=>withFixture(async f=>{
  await addPiano(f);await addModificationDisclosure(f);await createCarrier(args(f));
  const {inputs}=await validateCarrierInputs(f.iso),packet=join(f.root,'disclosure-packet');
  const metadata=await packagePianoNotices(f.iso,join(f.iso,'score-viewer'),packet);
  const disclosure=metadata.buildModifications['BUILD-MODIFICATIONS.md'];
  assert.equal(disclosure.sourcePath,'piano-build/WINDOWS-UTF8-COMPATIBILITY.md');
  assert.equal(sha256(await readFile(join(packet,'notices/piano/BUILD-MODIFICATIONS.md'))),inputs.nativeFiles['src-tauri/piano-build/WINDOWS-UTF8-COMPATIBILITY.md'].sha256);
  const bytes=await readFile(join(f.iso,'score-viewer/src-tauri/piano-build/WINDOWS-UTF8-COMPATIBILITY.md'));
  await file(f.iso,'score-viewer/src-tauri/piano-build/WINDOWS-UTF8-COMPATIBILITY.md','Changed reviewed disclosure');
  await assert.rejects(validateCarrierInputs(f.iso),/Native source inventory differs/);
  await file(f.iso,'score-viewer/src-tauri/piano-build/WINDOWS-UTF8-COMPATIBILITY.md',bytes);
}));

test('authored notice mappings cannot replace upstream licenses or select other application files',async()=>withFixture(async f=>{
  await addPiano(f);await addModificationDisclosure(f);
  const path=join(f.viewer,'src-tauri/piano-notices/manifest.json'),original=JSON.parse(await readFile(path));
  for(const mutate of [
    manifest=>{manifest.files['BUILD-MODIFICATIONS.md'].sourcePath='build.rs';},
    manifest=>{manifest.files.LICENSE.sourcePath='piano-build/WINDOWS-UTF8-COMPATIBILITY.md';},
    manifest=>{delete manifest.files['BUILD-MODIFICATIONS.md'].sourcePath;},
    manifest=>{manifest.files['BUILD-MODIFICATIONS.md'].sha256='1'.repeat(64);},
  ]) {
    const manifest=structuredClone(original);mutate(manifest);await writeFile(path,JSON.stringify(manifest));await bindViewer(f);
    await assert.rejects(createCarrier(args(f)),/unapproved authored notice mapping|requires its exact source binding|does not match original/);
    assert.equal(git(f.iso,'status','--porcelain'),'');
  }
}));

test('unrecorded engine source is refused before any carrier mutation',async()=>withFixture(async f=>{
  await addPiano(f);
  await file(f.viewer,'src-tauri/vendor/sfizz/extra.cpp','unreviewed additional engine source\n');await bindViewer(f);
  await assert.rejects(createCarrier(args(f)),/engine source inventory differs/);
  assert.equal(git(f.iso,'status','--porcelain'),'');
}));

test('unsafe curated paths and missing manifests are rejected before writes',async()=>withFixture(async f=>{
  await addPiano(f);
  const manifestPath=join(f.viewer,'src-tauri/piano-notices/manifest.json'),manifest=JSON.parse(await readFile(manifestPath));
  manifest.files['../outside']=manifest.files.LICENSE;
  await writeFile(manifestPath,JSON.stringify(manifest));await bindViewer(f);
  await assert.rejects(createCarrier(args(f)),/unsafe relative path/);
  assert.equal(git(f.iso,'status','--porcelain'),'');
  await rm(manifestPath);await bindViewer(f);
  await assert.rejects(createCarrier(args(f)),/ENOENT/);
  assert.equal(git(f.iso,'status','--porcelain'),'');
}));

test('both packages and Mac app resources must carry original curated notices and provenance',async()=>withFixture(async f=>{
  await addPiano(f);await createCarrier(args(f));
  const {inputs}=await validateCarrierInputs(f.iso),viewer=join(f.iso,'score-viewer'),packet=join(f.root,'packet'),resources=join(f.root,'app-resources');
  const pianoEngine=await packagePianoNotices(f.iso,viewer,packet);
  await file(packet,'native-dependencies.json',JSON.stringify({pianoEngine}));
  const files={};for(const name of Object.keys(await inventory(packet)))files[name]=await readFile(join(packet,name));
  assert.equal(files['notices/piano/unlinked/LICENSE'],undefined);
  assert.equal(validatePianoRecipient(files,inputs.nativeFiles).metadata.revision,'4'.repeat(40));
  assert.throws(()=>validatePianoRecipient({...files,'notices/piano/LICENSE':undefined},inputs.nativeFiles),/changed or missing/);
  assert.throws(()=>validatePianoRecipient({...files,'notices/piano/LICENSE':Buffer.from('wrong')},inputs.nativeFiles),/changed or missing/);
  assert.throws(()=>validatePianoRecipient({...files,'native-dependencies.json':Buffer.from('{}')},inputs.nativeFiles),/dependency record differs/);
  await cp(join(packet,'notices'),join(resources,'notices'),{recursive:true});
  assert.equal(Object.keys(await verifyBundledPianoNotices(f.iso,viewer,resources)).length,4);
  await file(resources,'notices/piano/LICENSE','Changed bundle notice\n');
  await assert.rejects(verifyBundledPianoNotices(f.iso,viewer,resources),/changed or missing/);
  assert.throws(()=>requirePianoWorkerChecks({nativeChecks:{tests:'passed'}},inputs.nativeFiles),/checks missing/);
  const checked=await addPianoWorkerChecks(f.iso,viewer,packet,{tests:'passed',physicalMidiAudioPedal:'not tested'},{});
  requirePianoWorkerChecks(checked,inputs.nativeFiles);
  assert.equal(checked.nativeChecks.pianoSources,'passed');assert.equal(checked.nativeChecks.pianoNotices,'passed');
  assert.equal(checked.nativeChecks.physicalMidiAudioPedal,'not tested');
  const binary=peImport('KERNEL32.dll'),windows={...checked,platform:'windows-x64',nativeChecks:{...checked.nativeChecks,pianoWindowsRuntime:'passed'},details:{...checked.details,windowsDependencies:verifyWindowsPianoRuntime(binary)}};
  requirePianoWorkerChecks(windows,inputs.nativeFiles,{'iso-score-viewer.exe':binary});
  assert.throws(()=>requirePianoWorkerChecks({...windows,details:{}},inputs.nativeFiles,{'iso-score-viewer.exe':binary}),/import receipt differs/);
  assert.throws(()=>validatePianoRecipient({...files,'iso-score-viewer.exe':peImport('MSVCP140.dll')},inputs.nativeFiles),/VC runtime DLL prerequisite/);
}));

test('new exact footer notice is additive, emitted, copied to recipients and included in the generated Mac resource map',async()=>withFixture(async f=>{
 const name='LiberationSerif-Italic-NOTICE.txt',notice=await readFile(new URL('../licenses/'+name,import.meta.url)),font=await readFile(new URL('../src/LiberationSerif-Italic.ttf',import.meta.url));
 await file(f.viewer,'licenses/'+name,notice);await file(f.frontend,'assets/'+name,notice);await file(f.frontend,'assets/footer.ttf',font);
 const policy=await readFile(new URL('../src/footer-ink-policy.json',import.meta.url)),fixture=await readFile(new URL('../fixtures/authored-calculated-preparation-v2.isoscore',import.meta.url));
 await file(f.viewer,'src/footer-font-data.ts',await readFile(new URL('../src/footer-font-data.ts',import.meta.url)));await file(f.viewer,'src/footer-ink-policy.json',policy);await file(f.viewer,'fixtures/authored-calculated-preparation-v2.isoscore',fixture);
 await file(f.frontend,'footer-ink-probe.html','<script type=module src=assets/probe.js></script>');await file(f.frontend,'assets/public.isoscore',fixture);
 for(const helper of ['footer-ink-probe.swift','footer-ink-probe.mjs','footer-ink-receipt.mjs'])await file(f.viewer,'scripts/native-release-carrier/'+helper,await readFile(new URL('../scripts/native-release-carrier/'+helper,import.meta.url)));
 await bindViewer(f);f.receipt.frontendDigest=sha256(canonical(await inventory(f.frontend)));await writeFile(f.checks,JSON.stringify(f.receipt,null,2)+'\n');
 const nativeBefore=await inventory(join(f.viewer,'src-tauri')),oldNotice=await readFile(join(f.iso,'licenses/NOTICE.txt'));
 await createCarrier(args(f));const {inputs}=await validateCarrierInputs(f.iso);
 assert.deepEqual(await inventory(join(f.iso,'score-viewer/src-tauri')),nativeBefore);assert.deepEqual(await readFile(join(f.iso,'licenses/NOTICE.txt')),oldNotice);
 assert.deepEqual(await readFile(join(f.iso,'licenses/'+name)),notice);assert.deepEqual(await readFile(join(f.iso,'score-viewer/licenses/'+name)),notice);
 assert.deepEqual(inputs.nativeFiles['licenses/'+name],{sha256:sha256(notice),size:notice.length});
 await commit(f.iso);const windows=join(f.root,'windows-new-footer-checkout');
 git(f.root,'clone','-q','--no-hardlinks','--config','core.autocrlf=true',f.iso,windows);
 const windowsReadback=await validateCarrierInputs(windows);assert.deepEqual(windowsReadback.inputs.runtimeFontProbe,inputs.runtimeFontProbe);
 for(const path of Object.keys(inputs.runtimeFontProbe.files))assert.deepEqual(await readFile(join(windows,path)),await readFile(join(f.iso,path)),'source-bound helper survives actual Windows-style checkout: '+path);
 assert.equal(git(windows,'status','--porcelain'),'');
 const worker=await readFile(join(f.iso,'scripts/score-viewer-native-worker.mjs'),'utf8'),mac=await readFile(join(f.iso,'scripts/build-score-viewer-macos.mjs'),'utf8');
 assert.ok(mac.indexOf('const footerInk=await runFooterInkProbe')<mac.indexOf("ctx.stage('nativeBuildMs'"),'actual font proof runs before expensive native build');
 assert.ok(worker.includes("'../licenses/"+name+"':'notices/"+name+"'"));assert.ok(mac.includes(",'"+name+"']"));assert.ok(worker.includes(",'"+name+"']"));
 const prepared=join(f.root,'prepared');await mkdir(prepared);await cp(join(f.iso,'delivery-input/inputs.json'),join(prepared,'source-inputs.json'));
 await cp(f.checks,join(prepared,'source-checks.json'));await file(prepared,'frontend/release-identity.json','{}');
 const files={'Source-provenance.json':await readFile(join(prepared,'source-inputs.json')),'Source-validation.json':await readFile(f.checks),
  'Release-identity.json':Buffer.from('{}'),'notices/NOTICE.txt':oldNotice,['notices/'+name]:notice};
 await validateRecipientCarrier(files,prepared);
 for(const bytes of [undefined,Buffer.from('incomplete OFL')])await assert.rejects(validateRecipientCarrier({...files,['notices/'+name]:bytes},prepared),/font notice differs/);
 const bundled={...files,'ISO Score Viewer.app/Contents/MacOS/iso-score-viewer':Buffer.from('fixture binary'),
  'ISO Score Viewer.app/Contents/Resources/notices/NOTICE.txt':oldNotice,['ISO Score Viewer.app/Contents/Resources/notices/'+name]:notice};
 await assert.rejects(validateRecipientCarrier(bundled,prepared),/runtime receipt missing/);
 for(const leaf of ['NOTICE.txt',name])for(const bytes of [undefined,Buffer.from('tampered app resource')])
  await assert.rejects(validateRecipientCarrier({...bundled,['ISO Score Viewer.app/Contents/Resources/notices/'+leaf]:bytes},prepared),/Mac app font notice differs/);
}));
test('a pre-existing conflicting root footer notice refuses before carrier writes',async()=>withFixture(async f=>{
 const name='LiberationSerif-Italic-NOTICE.txt';await file(f.viewer,'licenses/'+name,'Reviewed notice');await bindViewer(f);
 await file(f.iso,'licenses/'+name,'Other notice');await commit(f.iso);
 // The ISO notation pin must represent that immutable original root state.
 f.notationRevision=git(f.iso,'rev-parse','HEAD');git(f.viewer,'update-index','--cacheinfo',`160000,${f.notationRevision},vendor/iso-notation`);
 await file(f.viewer,'docs/source-provenance.json',JSON.stringify({dependencyRevision:f.notationRevision}));await bindViewer(f);f.receipt.notationRevision=f.notationRevision;await writeFile(f.checks,JSON.stringify(f.receipt));
 await assert.rejects(createCarrier(args(f)),/notice conflict/);assert.equal(git(f.iso,'status','--porcelain'),'');
}));

test('converter source delivery preserves existing resource maps and binds helper, packet and actual Mac resources',async()=>withFixture(async f=>{
 const names=['source-package.tgz','source-package-identity.json','SOURCE-NOTICE.txt','NOTICE.txt','guitar-pro.worker.js.LEGAL.txt'];
 await file(f.viewer,'scripts/native-release-carrier/score-viewer-converter-release.mjs',await readFile(new URL('../scripts/native-release-carrier/score-viewer-converter-release.mjs',import.meta.url)));
 await file(f.viewer,'package.json',JSON.stringify({name:'iso-score-viewer',version:'0.1.0',dependencies:{'score-converter-proof':'file:vendor/score-converter/score-converter-proof-0.0.0.tgz'}}));
 for(const name of names)await file(f.frontend,'converter/gp/'+name,'exact fixture '+name+'\n');
 f.frontendDigest=sha256(canonical(await inventory(f.frontend)));f.receipt.frontendDigest=f.frontendDigest;await bindViewer(f);
 await createCarrier(args(f));
 const {inputs}=await validateCarrierInputs(f.iso),worker=await readFile(join(f.iso,'scripts/score-viewer-native-worker.mjs'),'utf8'),mac=await readFile(join(f.iso,'scripts/build-score-viewer-macos.mjs'),'utf8');
 assert.equal(inputs.converterNoticeHelper.path,'scripts/score-viewer-converter-release.mjs');
 assert.match(worker,/packageConverterNotices\(source,packet\)/);assert.match(mac,/verifyBundledConverterNotices/);
 for(const name of names)assert.equal(worker.includes(`"../dist/converter/gp/${name}":"notices/score-converter/${name}"`),true);
 const helper=join(f.iso,inputs.converterNoticeHelper.path);await writeFile(helper,'changed helper');await assert.rejects(validateCarrierInputs(f.iso),/Converter notice helper differs/);
}));
