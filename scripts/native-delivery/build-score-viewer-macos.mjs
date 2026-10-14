#!/usr/bin/env node
// Build only a clean, reviewed revision on a real macOS host, in isolated storage.
import {spawn, spawnSync, execFileSync} from 'node:child_process';
import {mkdtemp, mkdir, writeFile, readFile, cp, readdir, access, rm, realpath} from 'node:fs/promises';
import {tmpdir, homedir} from 'node:os';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {verifyBundledConverterNotices} from './score-viewer-converter-release.mjs';
import {runFooterInkProbe} from './footer-ink-probe.mjs';
import {verifyBundledPianoNotices,runMacPianoDiagnostic} from './score-viewer-piano-release.mjs';
import {workerInputs,run,notices,finishWorker,nativeReleaseCargoArgs} from './score-viewer-native-worker.mjs';
import {inventory,canonical} from './score-viewer-delivery.mjs';

const launchCommand=(program,args,{timeoutMs=30000,discardStdout=false,ownedLaunch=false}={})=>new Promise((done,fail)=>{
  const child=spawn(program,args,{stdio:['ignore',discardStdout?'ignore':'pipe','pipe']});
  let stdout='',stderr='',timedOut=false;
  child.stdout?.on('data',chunk=>{stdout=(stdout+chunk.toString()).slice(-65536);});
  child.stderr.on('data',chunk=>{stderr=(stderr+chunk.toString()).slice(-65536);});
  // The launch helper handles SIGTERM by cleaning up its owned app. Never
  // blindly SIGKILL it while Launch Services may still have a pending request.
  const timer=setTimeout(()=>{timedOut=true;child.kill(ownedLaunch?'SIGTERM':'SIGKILL');},timeoutMs);
  child.once('error',error=>{clearTimeout(timer);fail(error);});
  child.once('close',(exitCode,signal)=>{clearTimeout(timer);done({exitCode,signal,timedOut,stdout,stderr});});
});

export const MAC_LAUNCH_LIFECYCLE_CASES = [
  'alive before survival deadline', 'unexpected exit before survival deadline', 'unexpected exit at survival deadline',
  'survival deadline reached', 'identity not established', 'existing launch error stays failed',
  'intentional exit after survival', 'intentional exit during cleanup', 'cleanup grace not reached',
  'force cleanup after grace', 'cleanup not forced twice', 'finished cleanup not forced',
  'cleanup deadline not reached', 'cleanup deadline exceeded', 'finished cleanup does not fail', 'cleanup not started',
];

export async function checkMacSessionPredicate({helper,execute=launchCommand}) {
  const result=await execute(helper,['--self-test'],{timeoutMs:5000});
  let check;
  try{check=JSON.parse(result.stdout.trim());}catch{throw Error(`Mac SDK session predicate returned no valid receipt: ${result.stderr}`);}
  if(result.exitCode!==0||result.timedOut||check.schema!==1||check.mode!=='CGSession SDK predicate self-test'||
     check.status!=='passed'||!Array.isArray(check.checks)||check.checks.length!==10||
     check.checks.some(test=>test.passed!==true)||new Set(check.checks.map(test=>test.case)).size!==10||
     !Array.isArray(check.lifecycleChecks)||check.lifecycleChecks.length!==MAC_LAUNCH_LIFECYCLE_CASES.length||
     check.lifecycleChecks.some(test=>test.passed!==true||typeof test.actual!=='boolean'||typeof test.expected!=='boolean'||
       test.actual!==test.expected||!MAC_LAUNCH_LIFECYCLE_CASES.includes(test.case))||
     new Set(check.lifecycleChecks.map(test=>test.case)).size!==MAC_LAUNCH_LIFECYCLE_CASES.length) {
    throw Error(`Mac SDK session predicate failed: ${JSON.stringify(check)}; ${result.stderr}`);
  }
  return {check,helperStdout:result.stdout,helperStderr:result.stderr};
}

export async function checkMacLaunchServices({app,binary,appDataOwned,helper,uid=process.getuid?.(),survivalMs=5000,launchTimeoutMs=15000,execute=launchCommand}) {
  const limits={guiControls:'not tested',physicalMidiAudioPedal:'not tested',applicationStdoutStderr:'not redirected; direct startup stderr retained separately'};
  if(!appDataOwned)return {check:{status:'unavailable',reason:'No fresh test-owned app data; existing library/preferences preserved',...limits},helperStdout:'',helperStderr:''};
  if(!Number.isSafeInteger(uid)||uid<0)return {check:{status:'unavailable',reason:'Current user identity unavailable',...limits},helperStdout:'',helperStderr:''};
  // Discard the GUI domain listing: it can include unrelated session environment.
  const session=await execute('/bin/launchctl',['print',`gui/${uid}`],{timeoutMs:5000,discardStdout:true});
  if(session.exitCode!==0||session.timedOut)return {check:{status:'unavailable',reason:'No responsive current-user launchctl GUI domain',uid,...limits},helperStdout:'',helperStderr:session.stderr};
  const result=await execute(helper,[app,binary,String(uid),String(survivalMs),String(launchTimeoutMs)],{timeoutMs:launchTimeoutMs+survivalMs+16000,ownedLaunch:true});
  let check;
  try{check=JSON.parse(result.stdout.trim());}catch{throw Error(`Launch Services helper returned no valid receipt (${result.exitCode}, ${result.signal}): ${result.stderr}`);}
  if(check.schema!==1||check.launchApi!=='NSWorkspace.openApplication'||check.uid!==uid)throw Error('Launch Services helper identity differs');
  if(check.status==='passed') {
    if(result.exitCode!==0||result.timedOut||check.callbackReceived!==true||check.sameUserDesktop!==true||
       !Number.isSafeInteger(check.pid)||check.pid<=0||check.returnedPid!==check.pid||
       check.bundlePath!==app||check.executablePath!==binary||check.returnedBundlePath!==app||check.returnedExecutablePath!==binary||
       check.returnedIdentityMatches!==true||!Number.isSafeInteger(check.survivalMs)||check.survivalMs<survivalMs||
       check.cleanup?.terminated!==true||check.cleanup?.requestResolved!==true) {
      throw Error(`Launch Services helper did not establish exact launch and owned cleanup: ${JSON.stringify(check)}; ${result.stderr}`);
    }
  } else if(check.status!=='unavailable'||result.exitCode!==0||result.timedOut) {
    throw Error(`Normal Mac application launch failed: ${JSON.stringify(check)}; ${result.stderr}`);
  }
  return {check:{...check,...limits},helperStdout:result.stdout,helperStderr:result.stderr};
}

export async function buildMacViewer() {
if (process.platform !== 'darwin') throw Error('Mac worker requires a native macOS host');
const ctx = await workerInputs('macos-universal',process.argv.slice(2));
const {source:stage,prepared,output,viewer,target,manifest} = ctx;
const revision = manifest.identity.sourceRevision;
const packet = await mkdtemp(join(tmpdir(),'iso-mac-recipient-'));
const footerInk=await runFooterInkProbe(ctx,packet);
const config = JSON.parse(await readFile(join(viewer,'src-tauri','tauri.macos.conf.json'),'utf8'));
const minimum = config.bundle.macOS.minimumSystemVersion;
const env = {...ctx.env,MACOSX_DEPLOYMENT_TARGET:minimum};
await run('rustup',['target','add','aarch64-apple-darwin','x86_64-apple-darwin'],stage);
const host=execFileSync('rustc',['-vV'],{encoding:'utf8'}).match(/^host: (\S+)$/m)?.[1];
if(!['aarch64-apple-darwin','x86_64-apple-darwin'].includes(host))throw Error('Unexpected native Mac host target');
await ctx.stage('nativeTestsMs',async()=>{
  await run('cargo',['test','--locked','--release','--features','custom-protocol','--target',host,'--manifest-path','src-tauri/Cargo.toml','--test','macos_midi',...nativeReleaseCargoArgs],viewer,env);
  await run('cargo',['test','--locked','--release','--features','custom-protocol','--target',host,'--manifest-path','src-tauri/Cargo.toml','--bin','iso-score-viewer',...nativeReleaseCargoArgs],viewer,env);
});
await runMacPianoDiagnostic(ctx,packet,host,nativeReleaseCargoArgs,env);
await ctx.stage('nativeBuildMs',()=>run('npm',['run','tauri','--','build','--target','universal-apple-darwin','--bundles','app,dmg','--config',ctx.preparedConfig,'--','--locked',...nativeReleaseCargoArgs],viewer,env));
const verificationStart = performance.now();
const bundle = join(target,'universal-apple-darwin','release','bundle');
const app = join(bundle,'macos','ISO Score Viewer.app');
const binary = join(app,'Contents','MacOS','iso-score-viewer');
const noticeNames=['URW-base35-provenance.md','URW-base35-LICENSE','URW-base35-COPYING','OFL-Bravura.txt','LiberationSerif-Italic-NOTICE.txt'];
const bundledNoticeHashes={...await verifyBundledPianoNotices(stage,viewer,join(app,'Contents','Resources')),...await verifyBundledConverterNotices(stage,join(app,'Contents','Resources'))};
for(const name of noticeNames) {
  const original=await readFile(join(stage,'licenses',name));
  const bundled=await readFile(join(app,'Contents','Resources','notices',name));
  const expected=createHash('sha256').update(original).digest('hex');
  if(createHash('sha256').update(bundled).digest('hex')!==expected)throw Error(`Bundled notice differs: ${name}`);
  bundledNoticeHashes[name]=expected;
}
await run('codesign',['--verify','--deep','--strict','--verbose=2',app]);
const signatureReadback = spawnSync('codesign',['-dvv',app],{encoding:'utf8'});
if(signatureReadback.status!==0)throw Error('Could not inspect the bundle signature.');
const signature = signatureReadback.stderr;
if(!signature.includes('Signature=adhoc'))throw Error('Expected the declared private ad-hoc signature.');
const architectures = execFileSync('lipo',['-archs',binary],{encoding:'utf8'}).trim();
if(!architectures.includes('x86_64')||!architectures.includes('arm64')) throw Error('Both Intel and Apple Silicon slices are required.');
const plist = execFileSync('/usr/libexec/PlistBuddy',['-c','Print :LSMinimumSystemVersion',join(app,'Contents','Info.plist')],{encoding:'utf8'}).trim();
if(plist!==minimum) throw Error(`Bundle deployment ${plist} differs from ${minimum}`);
const binaryDeployment={};
for(const arch of ['arm64','x86_64']) {
  const readback=execFileSync('vtool',['-arch',arch,'-show-build',binary],{encoding:'utf8'});
  const minos=readback.match(/\bminos\s+(\S+)/)?.[1];
  if(!minos||minos.split('.').slice(0,2).join('.')!==minimum.split('.').slice(0,2).join('.')) {
    throw Error(`Unexpected ${arch} Mach-O deployment ${minos}`);
  }
  binaryDeployment[arch]=readback;
}
const dmgs=(await readdir(join(bundle,'dmg'))).filter(n=>n.endsWith('.dmg'));
if(dmgs.length!==1)throw Error('Expected one universal DMG.');
const dmg=join(bundle,'dmg',dmgs[0]);
await run('hdiutil',['verify',dmg]);
const mount = await mkdtemp(join(tmpdir(),'iso-mac-dmg-'));
await run('hdiutil',['attach','-readonly','-nobrowse','-mountpoint',mount,dmg]);
try {
  if(canonical(await inventory(join(mount,'ISO Score Viewer.app')))!==canonical(await inventory(app)))throw Error('DMG app differs from the verified app');
} finally {
  await run('hdiutil',['detach',mount]);
}
// Launch the delivered binary, never a dev server or application test backdoor.
// The hosted runner is disposable; require its app-data directory to be absent
// rather than overriding HOME or removing any existing preferences/library.
const appIdentifier=JSON.parse(await readFile(join(viewer,'src-tauri','tauri.conf.json'),'utf8')).identifier;
if(!/^[a-z0-9.-]+$/.test(appIdentifier))throw Error('Unexpected application identity for launch smoke.');
const smokeAppData=join(homedir(),'Library','Application Support',appIdentifier);
const exists=async path=>{try{await access(path);return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}};
const windowServer=spawnSync('/usr/bin/pgrep',['-x','WindowServer'],{encoding:'utf8'});
let nativeLaunch={status:'unavailable',reason:'No WindowServer on this runner',guiControls:'not tested',physicalMidiAudioPedal:'not tested'};
let nativeLaunchLog='';
if(windowServer.status===0 && !(await exists(smokeAppData))) {
  const smokeApp=spawn(binary,[],{cwd:app,stdio:['ignore','ignore','pipe']});
  let smokeExit=null,smokeError=null;
  const exited=new Promise(done=>smokeApp.once('exit',(code,signal)=>{smokeExit={code,signal};done();}));
  smokeApp.once('error',error=>{smokeError=error;});
  smokeApp.stderr.on('data',chunk=>{nativeLaunchLog=(nativeLaunchLog+chunk.toString()).slice(-65536);});
  const delay=ms=>new Promise(done=>setTimeout(done,ms));
  try {
    await delay(10000);
    if(smokeError)throw smokeError;
    if(smokeExit)throw Error(`Packaged app exited during launch: ${JSON.stringify(smokeExit)}; ${nativeLaunchLog}`);
    if(!(await exists(smokeAppData)))throw Error('Packaged frontend did not initialize its native managed-storage bridge.');
    if(/panicked|could not start|WebContent process.*(?:crash|exited)|failed to (?:load|open).*(?:resource|index\.html|assets)|WebKit.*(?:crash|fatal)/i.test(nativeLaunchLog)) {
      throw Error(`Packaged startup reported a resource/WebKit failure: ${nativeLaunchLog}`);
    }
    nativeLaunch={status:'passed',durationMs:10000,packagedBinary:true,initiallyAbsentAppData:true,managedBridgeInitialized:true,
      devServer:'not started',guiControls:'not tested',physicalMidiAudioPedal:'not tested'};
  } finally {
    if(!smokeExit){smokeApp.kill('SIGTERM');await Promise.race([exited,delay(3000)]);}
    if(!smokeExit){smokeApp.kill('SIGKILL');await Promise.race([exited,delay(3000)]);}
    if(!smokeExit)throw Error('Direct startup instance cleanup could not be established.');
  }
} else if(windowServer.status===0) {
  nativeLaunch.reason='App data already exists; existing library/preferences preserved';
}
let launchServices={check:{status:'unavailable',reason:'Fresh direct startup did not pass',guiControls:'not tested',physicalMidiAudioPedal:'not tested'},helperStdout:'',helperStderr:''};
let sessionPredicate;
const helperDirectory=await mkdtemp(join(tmpdir(),'iso-mac-launch-check-'));
const helper=join(helperDirectory,'launch-services-check');
try {
  const compiled=await launchCommand('/usr/bin/xcrun',['clang','-fobjc-arc','-framework','AppKit','-framework','CoreGraphics',join(stage,'scripts','native-delivery','score-viewer-macos-launch.m'),'-o',helper]);
  if(compiled.exitCode!==0||compiled.timedOut)throw Error(`Could not compile the Mac launch helper: ${compiled.stderr}`);
  sessionPredicate=await checkMacSessionPredicate({helper});
  if(nativeLaunch.status==='passed') {
    launchServices=await checkMacLaunchServices({app:await realpath(app),binary:await realpath(binary),appDataOwned:true,helper});
  }
} finally {
  await rm(helperDirectory,{recursive:true,force:true});
}
await cp(dmg,join(packet,dmgs[0]));
// The exact sealed app is retained for independent pair verification.
await cp(app,join(packet,'ISO Score Viewer.app'),{recursive:true,preserveTimestamps:true});
await cp(join(stage,'scripts','native-delivery','Install-on-Mac.md'),join(packet,'Install-on-Mac.md'));
await notices(stage,viewer,packet,'aarch64-apple-darwin');
ctx.timings.verificationPackagingMs=Math.round(performance.now()-verificationStart);
await finishWorker(ctx,'macos-universal',packet,binary,
  {footerInk,tests:'passed',virtualMidi:'passed',signatures:'passed',resources:'passed',minimumOS:'passed',dmg:'passed',dmgAppParity:'passed',startup:nativeLaunch,launchServices:launchServices.check,launchServicesSessionPredicate:sessionPredicate.check},
  {minimum,architectures,signature,binaryDeployment,bundledNoticeHashes,nativeLaunchLog,launchServicesHelperStdout:launchServices.helperStdout,launchServicesHelperStderr:launchServices.helperStderr,sessionPredicateHelperStdout:sessionPredicate.helperStdout,sessionPredicateHelperStderr:sessionPredicate.helperStderr,
    toolchain:{node:process.version,rustc:execFileSync('rustc',['--version'],{encoding:'utf8'}).trim(),cargo:execFileSync('cargo',['--version'],{encoding:'utf8'}).trim(),
      xcode:execFileSync('xcodebuild',['-version'],{encoding:'utf8'}).trim(),sdk:execFileSync('xcrun',['--show-sdk-version'],{encoding:'utf8'}).trim()},
    builtOn:execFileSync('sw_vers',[],{encoding:'utf8'}),physicalMidiAudioPedal:'not tested'});
console.log(`Verified universal private recipient package: ${output}`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await buildMacViewer();
