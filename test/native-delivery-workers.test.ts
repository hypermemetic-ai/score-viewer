import {test, type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,cp,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,basename,win32,posix} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {brotliCompressSync} from 'node:zlib';
import {createRequire} from 'node:module';
const {prepare}=await import(new URL('../scripts/native-delivery/prepare-score-viewer.mjs',import.meta.url).href);
const {sha256,canonical,inventory,writeJson,validatePrepared,verifyEmbedded,validatePair,zipInventory,normalizedHtml,readZip}=await import(new URL('../scripts/native-delivery/score-viewer-delivery.mjs',import.meta.url).href);
const {invalidateGeneratedAssets,captureWindowsDiagnostics,installPreparedFrontend,nativeReleaseProfile,nativeReleaseCargoArgs}=await import(new URL('../scripts/native-delivery/score-viewer-native-worker.mjs',import.meta.url).href);
const {checkMacLaunchServices,checkMacSessionPredicate,MAC_LAUNCH_LIFECYCLE_CASES}=await import(new URL('../scripts/native-delivery/build-score-viewer-macos.mjs',import.meta.url).href);
const {zipSync}=createRequire(new URL('../package.json',import.meta.url))('fflate');
const launchFixture=()=>({schema:1,launchApi:'NSWorkspace.openApplication',uid:501,status:'passed',sameUserDesktop:true,
  callbackReceived:true,returnedIdentityMatches:true,pid:1234,returnedPid:1234,
  bundlePath:'/verified/ISO Score Viewer.app',returnedBundlePath:'/verified/ISO Score Viewer.app',
  executablePath:'/verified/ISO Score Viewer.app/Contents/MacOS/iso-score-viewer',returnedExecutablePath:'/verified/ISO Score Viewer.app/Contents/MacOS/iso-score-viewer',
  survivalMs:5000,cleanup:{terminated:true,requestResolved:true}});
const launchOptions={app:launchFixture().bundlePath,binary:launchFixture().executablePath,appDataOwned:true,helper:'/private/launch-check',uid:501};
test('Mac native session predicate checks run without launching an app and fail closed',async()=>{
  const cases=['same-user SDK keys','nil dictionary','empty dictionary','mismatched user','missing user including uid zero',
    'missing console','missing login','off console','login incomplete','nonnumeric user'];
  const lifecycleCases: string[] = MAC_LAUNCH_LIFECYCLE_CASES;
  const receipt={schema:1,mode:'CGSession SDK predicate self-test',status:'passed',checks:cases.map(name=>({case:name,passed:true})),
    lifecycleChecks:lifecycleCases.map(name=>({case:name,actual:true,expected:true,passed:true}))};
  const calls:{program:string;args:string[];options:Record<string,unknown>}[]=[];
  const result=await checkMacSessionPredicate({helper:launchOptions.helper,execute:async(program:string,args:string[],options:Record<string,unknown>)=>{
    calls.push({program,args,options});return {exitCode:0,stdout:JSON.stringify(receipt),stderr:''};
  }});
  assert.deepEqual(calls,[{program:launchOptions.helper,args:['--self-test'],options:{timeoutMs:5000}}]);
  assert.equal(result.check.status,'passed');
  const failed=structuredClone(receipt);failed.checks[0].passed=false;
  const missing=structuredClone(receipt);missing.checks.shift();
  const duplicate=structuredClone(receipt);duplicate.checks[1]=duplicate.checks[0];
  const numeric={...receipt,checks:receipt.checks.map(check=>({...check,passed:1}))};
  const failedLifecycle=structuredClone(receipt);failedLifecycle.lifecycleChecks[6].passed=false;
  const missingLifecycle=structuredClone(receipt);missingLifecycle.lifecycleChecks.shift();
  const duplicateLifecycle=structuredClone(receipt);duplicateLifecycle.lifecycleChecks[1]=duplicateLifecycle.lifecycleChecks[0];
  const unknownLifecycle=structuredClone(receipt);unknownLifecycle.lifecycleChecks[0].case='unreviewed lifecycle case';
  const numericLifecycle={...receipt,lifecycleChecks:receipt.lifecycleChecks.map(check=>({...check,passed:1}))};
  const numericLifecycleValue={...receipt,lifecycleChecks:receipt.lifecycleChecks.map(check=>({...check,actual:1}))};
  const mismatchedLifecycle=structuredClone(receipt);mismatchedLifecycle.lifecycleChecks[0].actual=false;
  for(const invalid of [failed,missing,duplicate,numeric,failedLifecycle,missingLifecycle,duplicateLifecycle,unknownLifecycle,numericLifecycle,numericLifecycleValue,mismatchedLifecycle])
    await assert.rejects(checkMacSessionPredicate({helper:launchOptions.helper,execute:async()=>({exitCode:0,stdout:JSON.stringify(invalid),stderr:''})}),/SDK session predicate failed/);
  await assert.rejects(checkMacSessionPredicate({helper:launchOptions.helper,execute:async()=>({exitCode:1,stdout:JSON.stringify(receipt),stderr:'native assertion failed'})}),/SDK session predicate failed.*native assertion failed/);
});
test('normal Mac launch preserves existing app data and requires a current-user GUI domain',async()=>{
  const calls:string[][]=[];
  const execute=async(program:string,args:string[])=>{calls.push([program,...args]);return {exitCode:1,stdout:'unrelated GUI listing must not enter receipt',stderr:'GUI domain unavailable'};};
  const preserved=await checkMacLaunchServices({...launchOptions,appDataOwned:false,execute});
  assert.equal(preserved.check.status,'unavailable');assert.equal(calls.length,0);
  const absent=await checkMacLaunchServices({...launchOptions,execute});
  assert.equal(absent.check.status,'unavailable');assert.deepEqual(calls,[['/bin/launchctl','print','gui/501']]);
  assert.equal(absent.helperStdout,'');assert.equal(absent.helperStderr,'GUI domain unavailable');
});
test('normal Mac launch records exact returned ownership, bounded survival and confirmed cleanup',async()=>{
  const calls:{program:string;args:string[];options:Record<string,unknown>}[]=[];
  const receipt=launchFixture();
  const result=await checkMacLaunchServices({...launchOptions,execute:async(program:string,args:string[],options:Record<string,unknown>)=>{
    calls.push({program,args,options});return program==='/bin/launchctl'?{exitCode:0,stdout:'discarded session environment',stderr:''}:{exitCode:0,stdout:JSON.stringify(receipt),stderr:'helper diagnostic'};
  }});
  assert.equal(calls[0].options.discardStdout,true);
  assert.deepEqual(calls[1].args,[launchOptions.app,launchOptions.binary,'501','5000','15000']);
  assert.equal(calls[1].options.ownedLaunch,true);
  assert.equal(result.check.status,'passed');assert.equal(result.check.pid,receipt.pid);
  assert.equal(result.check.cleanup.terminated,true);assert.equal(result.helperStderr,'helper diagnostic');
  assert.match(result.check.applicationStdoutStderr,/not redirected/);
});
test('normal Mac launch rejects substituted paths, unreturned instances and incomplete cleanup',async()=>{
  const mutations=[
    {returnedBundlePath:'/elsewhere/ISO Score Viewer.app'},
    {returnedExecutablePath:'/elsewhere/iso-score-viewer'},
    {returnedPid:1235},
    {callbackReceived:false},
    {callbackReceived:1},
    {sameUserDesktop:false},
    {sameUserDesktop:1},
    {returnedIdentityMatches:1},
    {survivalMs:undefined},
    {survivalMs:'5000'},
    {survivalMs:NaN},
    {survivalMs:4999},
    {cleanup:{terminated:false,requestResolved:true}},
    {cleanup:{terminated:true,requestResolved:false}},
    {cleanup:{terminated:1,requestResolved:true}},
    {cleanup:{terminated:true,requestResolved:1}},
  ];
  for(const mutation of mutations) {
    const receipt={...launchFixture(),...mutation};
    await assert.rejects(checkMacLaunchServices({...launchOptions,execute:async(program:string)=>({exitCode:0,stdout:program==='/bin/launchctl'?'':JSON.stringify(receipt),stderr:''})}),/did not establish exact launch and owned cleanup/);
  }
});
test('a timed-out Mac request fails even when a late owned instance was terminated',async()=>{
  const receipt={...launchFixture(),status:'failed',reason:'Launch Services completion timed out'};
  await assert.rejects(checkMacLaunchServices({...launchOptions,execute:async(program:string)=>({exitCode:program==='/bin/launchctl'?0:1,stdout:program==='/bin/launchctl'?'':JSON.stringify(receipt),stderr:'late completion cleaned up'})}),/completion timed out.*late completion cleaned up/);
  await assert.rejects(checkMacLaunchServices({...launchOptions,execute:async(program:string)=>({exitCode:0,timedOut:program!=='/bin/launchctl',stdout:program==='/bin/launchctl'?'':JSON.stringify(launchFixture()),stderr:''})}),/did not establish exact launch and owned cleanup/);
});
test('normal Mac launch distinguishes unavailable Quartz session from broken helper evidence',async()=>{
  const unavailable={schema:1,launchApi:'NSWorkspace.openApplication',uid:501,status:'unavailable',reason:'Caller has no logged-in same-user Quartz console session'};
  const execute=async(program:string)=>({exitCode:0,stdout:program==='/bin/launchctl'?'':JSON.stringify(unavailable),stderr:''});
  assert.equal((await checkMacLaunchServices({...launchOptions,execute})).check.status,'unavailable');
  await assert.rejects(checkMacLaunchServices({...launchOptions,execute:async()=>({exitCode:0,stdout:'not a receipt',stderr:'helper failed'})}),/no valid receipt.*helper failed/);
});
test('native experiment rejects disabled incremental and overrides only the app package',()=>{
  assert.throws(()=>nativeReleaseProfile({CARGO_INCREMENTAL:'0'}),/requires CARGO_INCREMENTAL=1/);
  assert.throws(()=>nativeReleaseProfile({}),/requires CARGO_INCREMENTAL=1/);
  const profile=nativeReleaseProfile({CARGO_INCREMENTAL:'1'});
  assert.equal(profile.profile,'release');assert.equal(profile.incremental,true);
  assert.deepEqual(Object.keys(profile.packageOverrides),['iso-score-viewer']);
  assert.equal(profile.packageOverrides['iso-score-viewer'].codegenUnits,16);
  assert.deepEqual(profile.cargoArguments,nativeReleaseCargoArgs);
  assert.deepEqual(nativeReleaseCargoArgs,['--config','profile.release.package.iso-score-viewer.codegen-units=16']);
});
test('both locked asset encoders opt into target-independent Brotli costs',async()=>{
  const probe=await readFile(new URL('../scripts/native-delivery/score-viewer-asset-probe/Cargo.toml',import.meta.url),'utf8');
  const native=await readFile(new URL('../src-tauri/Cargo.toml',import.meta.url),'utf8');
  const nativeBuild=native.split('[build-dependencies]')[1].split('\n[')[0];
  const encoder=/^brotli\s*=\s*\{[^\n]*version\s*=\s*"=9\.0\.0"[^\n]*features\s*=\s*\["portable-float"\][^\n]*\}/m;
  assert.match(probe,encoder,'frozen probes must use the portable encoder');
  assert.match(nativeBuild,encoder,'Tauri host codegen must share the portable encoder feature');
  const lock=await readFile(new URL('../src-tauri/Cargo.lock',import.meta.url),'utf8');
  assert.match(lock,/name = "iso-score-viewer"[\s\S]*?dependencies = \[[^\]]*"brotli"/);
});
test('restored encoded-asset caches are invalidated without removing native dependency outputs',async t=>{
  const root=await mkdtemp(join(tmpdir(),'iso-asset-cache-test-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const caches=['release/build/iso-score-viewer-host/out/tauri-codegen-assets','x86_64-pc-windows-msvc/release/build/iso-score-viewer-native/out/tauri-codegen-assets'];
  for(const path of caches)await put(root,`${path}/frozen-css-hash.css`,'old encoder bytes');
  const retained=['release/deps/libbrotli.rlib','x86_64-pc-windows-msvc/release/deps/tauri.rlib','release/build/iso-score-viewer-host/out/native-resources.bin','debug/build/iso-score-viewer-debug/out/tauri-codegen-assets/debug.css'];
  for(const path of retained)await put(root,path,`retain ${path}`);
  assert.deepEqual((await invalidateGeneratedAssets(root)).map((path:string)=>path.replaceAll('\\','/')),caches.sort());
  for(const path of caches)await assert.rejects(access(join(root,path)),{code:'ENOENT'});
  for(const path of retained)assert.equal(await readFile(join(root,path),'utf8'),`retain ${path}`);
  assert.deepEqual(await invalidateGeneratedAssets(root),[]);
});
test('prepared native config embeds the copied frontend on Windows and Mac without rebuilding it',async t=>{
  const f=await fixture(t),viewer=join(f.root,'checkout','score-viewer'),target=join(f.root,'native-target');
  const configRoot=join(viewer,'src-tauri'),base=await readFile(new URL('../src-tauri/tauri.conf.json',import.meta.url),'utf8');
  await put(configRoot,'tauri.conf.json',base);
  const before=await inventory(f.prepared),preparedConfig=await installPreparedFrontend(f.prepared,viewer,target);
  const merged=JSON.parse(await readFile(preparedConfig,'utf8'));
  assert.deepEqual(Object.keys(merged),['build','bundle']);
  assert.equal(merged.bundle.resources['../licenses/LiberationSerif-Italic-NOTICE.txt'],'notices/LiberationSerif-Italic-NOTICE.txt');
  assert.equal(merged.build.beforeBuildCommand,'');
  assert.equal(join(configRoot,merged.build.frontendDist),join(viewer,'dist'),'merge path uses the original src-tauri root, not the merge-file directory');
  const windowsRoot='D:\\a\\iso-notation\\iso-notation\\score-viewer\\src-tauri';
  const macRoot='/Users/runner/work/iso-notation/iso-notation/score-viewer/src-tauri';
  assert.equal(win32.resolve(windowsRoot,merged.build.frontendDist),win32.resolve(windowsRoot,'../dist'));
  assert.equal(posix.resolve(macRoot,merged.build.frontendDist),posix.resolve(macRoot,'../dist'));
  // Locked Tauri tries URL before Directory. Drive paths are valid URLs;
  // directory-relative paths cannot take the no-embedded-assets URL branch.
  assert.equal(new URL(win32.resolve(windowsRoot,'../dist')).protocol,'d:');
  assert.throws(()=>new URL(merged.build.frontendDist),TypeError);
  assert.deepEqual(await inventory(join(viewer,'dist')),f.manifest.identity.frontend.files);
  assert.deepEqual(await inventory(f.prepared),before,'prepared inputs remain frozen');
  assert.equal(await readFile(join(configRoot,'tauri.conf.json'),'utf8'),base,'ordinary build hook stays intact');
  assert.equal(JSON.parse(base).build.beforeBuildCommand,'npm run build');
});
test('Windows failure diagnostics retain exact bytes and compiler evidence without a release receipt',async t=>{
  const f=await fixture(t),source=join(f.root,'source'),target=join(f.root,'native-target'),output=join(f.root,'diagnostic');
  for(const path of ['src-tauri/Cargo.toml','src-tauri/Cargo.lock','scripts/native-delivery/score-viewer-asset-probe/Cargo.toml','scripts/native-delivery/score-viewer-asset-probe/Cargo.lock'])await put(source,path,`pin ${path}`);
  await put(source,'.cargo/config.toml','unrelated configuration');
  await put(target,'x86_64-pc-windows-msvc/release/iso-score-viewer.exe',f.windows);
  await put(target,'prepared-tauri.json','{"build":{"beforeBuildCommand":""}}');
  const generated='release/build/iso-score-viewer-host/out/tauri-codegen-assets/actual.css',raw=Buffer.from([0,1,128,255,13,10]);
  await put(target,generated,raw);
  const fingerprint='release/.fingerprint/brotli-host/lib-brotli.json';
  await put(target,fingerprint,'{"features":"portable-float","profile":42}');
  await put(target,'release/.fingerprint/brotli-host/run-build-script-build-script-build.json','unrelated build environment');
  await put(target,'release/deps/brotli.rlib','compiled dependency');
  const before=await inventory(target),calls:string[][]=[];
  const diagnostic=await captureWindowsDiagnostics({source,prepared:f.prepared,target,output,execute:async(program:string,args:string[])=>{calls.push([program,...args]);return {exitCode:program==='cargo'?1:0,stdout:'captured compiler evidence',stderr:program==='cargo'?'feature inspection unavailable':''};}});
  assert.ok((await readFile(join(output,'binary/iso-score-viewer.exe'))).equals(f.windows));
  assert.ok((await readFile(join(output,'generated',generated))).equals(raw));
  assert.equal(await readFile(join(output,'fingerprints',fingerprint),'utf8'),'{"features":"portable-float","profile":42}');
  assert.deepEqual(await inventory(join(output,'prepared')),await inventory(f.prepared));
  assert.deepEqual(await inventory(target),before,'diagnosis must not rewrite or invalidate evidence');
  assert.equal(diagnostic.commands[1].exitCode,1,'missing optional command evidence is reported honestly');
  assert.deepEqual(calls[0],['rustc','-Vv']);
  assert.ok(calls[1].includes('--offline'));
  await assert.rejects(access(join(output,'receipt.json')),{code:'ENOENT'});
  await assert.rejects(access(join(output,'release.json')),{code:'ENOENT'});
  assert.equal(Object.keys(diagnostic.files).some((path:string)=>path.includes('config.toml')||path.includes('run-build-script')),false);
  await assert.rejects(captureWindowsDiagnostics({source,prepared:f.prepared,target,output}),{code:'EEXIST'});
});

async function sandbox(t: TestContext) {const root=await mkdtemp(join(tmpdir(),'viewer-native-worker-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;}
async function put(root:string,path:string,bytes:Uint8Array|string){await mkdir(join(root,path,'..'),{recursive:true});await writeFile(join(root,path),bytes);}
async function fixture(t:TestContext) {
  const root=await mkdtemp(join(tmpdir(),'iso-pair-test-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const prepared=join(root,'prepared');await mkdir(prepared);
  const scoreIdentity={path:'public/review/score.tuna',sha256:sha256(Buffer.from('same-score-both-keyboards')),size:Buffer.from('same-score-both-keyboards').length};
  const frontend={'assets/reader.js':Buffer.from('keyboard-selector-current-reader'), 'assets/font.otf':Buffer.from('literal-font-payload'), 'index.html':Buffer.from('<!doctype html><html><head></head><body><script src="./assets/reader.js"></script></body></html>'), 'release-identity.json':Buffer.from(JSON.stringify({sourceRevision:'a'.repeat(40),version:'0.1.0',score:scoreIdentity}))};
  const probes:Record<string,{path:string;sha256:string;decodedSha256:string}>={};
  for(const [path,bytes]of Object.entries(frontend)) {
    await put(prepared,`frontend/${path}`,bytes);
    const decoded=path.endsWith('.html')?normalizedHtml(bytes):bytes,encoded=brotliCompressSync(decoded),probe=`probes/${path}.br`;
    await put(prepared,probe,encoded);probes[path]={path:probe,sha256:sha256(encoded),decodedSha256:sha256(decoded)};
  }
  await put(prepared,'Schumann-No14.tuna',Buffer.from('same-score-both-keyboards'));
  const files=await inventory(join(prepared,'frontend'));
  const identity={releaseId:`0.1.0-${'a'.repeat(40)}`,sourceRevision:'a'.repeat(40),sourceTimestamp:'2026-10-06T00:00:00.000Z',version:'0.1.0',score:{path:'public/review/score.tuna',sha256:sha256(Buffer.from('same-score-both-keyboards')),size:25},frontend:{files,digest:sha256(canonical(files))}};
  // derive length instead of pinning a mistaken fixture string length.
  identity.score.size=(await readFile(join(prepared,'Schumann-No14.tuna'))).length;
  const manifest={schema:1,identity,probes,files:await inventory(prepared),timings:{},cache:{}};
  await writeJson(join(prepared,'manifest.json'),manifest);
  const payload=Buffer.concat(await Promise.all(Object.values(probes).map(pin=>readFile(join(prepared,pin.path)))));
  const pe=Buffer.alloc(128);pe.write('MZ');pe.writeUInt32LE(64,60);pe.write('PE\0\0',64);pe.writeUInt16LE(0x8664,68);
  const windows=Buffer.concat([pe,payload]),fat=Buffer.alloc(48);fat.writeUInt32BE(0xcafebabe);fat.writeUInt32BE(2,4);
  fat.writeUInt32BE(0x01000007,8);fat.writeUInt32BE(48,16);fat.writeUInt32BE(payload.length,20);
  fat.writeUInt32BE(0x0100000c,28);fat.writeUInt32BE(48+payload.length,36);fat.writeUInt32BE(payload.length,40);
  const mac=Buffer.concat([fat,payload,payload]);
  return {root,prepared,manifest,payload,windows,mac};
}
