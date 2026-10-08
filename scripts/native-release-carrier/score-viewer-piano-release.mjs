import {createHash} from 'node:crypto';
import {readFile, lstat, mkdir, writeFile} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import {spawn} from 'node:child_process';

export const pianoVendorPrefix = 'src-tauri/vendor/sfizz/';
export const pianoNoticePrefix = 'src-tauri/piano-notices/';
export const pianoNoticeManifest = `${pianoNoticePrefix}manifest.json`;
export const pianoSourceManifest = `${pianoVendorPrefix}provenance.json`;
export const windowsBuildConfig = '.cargo/config.toml';
export const macPianoDiagnosticPrefix = 'native-validation/piano-coreaudio/';
export const macPianoDiagnosticTest = 'practice_audio::diagnostic_macos::initialized_macos_stream_buffer_restore';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => {throw Error(`Piano release inputs: ${message}`);};
const revision = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
function path(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || value.includes('\0') || value.startsWith('/') || /^[A-Za-z]:/.test(value) || value.split('/').some(part => !part || part === '.' || part === '..')) fail(`unsafe relative path ${value}`);
  return value;
}
function pin(value, label) {
  if (!value || !digest(value.sha256) || !Number.isSafeInteger(value.size) || value.size < 1) fail(`invalid pin ${label}`);
  return {sha256:value.sha256, size:value.size};
}
const equalPin = (a, b) => a?.sha256 === b?.sha256 && a?.size === b?.size;
function bytesMatch(bytes, expected, label) {
  if (!Buffer.isBuffer(bytes) || !equalPin({sha256:sha256(bytes), size:bytes.length}, expected)) fail(`changed or missing ${label}`);
}
function keysEqual(a, b, label) {
  const left = Object.keys(a).sort(), right = Object.keys(b).sort();
  if (left.length !== right.length || left.some((key, index) => key !== right[index])) fail(`${label} inventory differs`);
}
function parse(bytes, label) {
  try {return JSON.parse(bytes);} catch {fail(`invalid JSON ${label}`);}
}
function present(nativeFiles) {
  return Object.keys(nativeFiles).some(key => key.startsWith(pianoVendorPrefix) || key.startsWith(pianoNoticePrefix));
}

// Both manifests are themselves pinned by the complete reviewed native source
// inventory. The curated notices describe linked runtime components; the vendor
// manifest also records source scaffolding that is deliberately not linked.
export function inspectPianoInputs(nativeFiles, noticeBytes, sourceBytes) {
  if (!present(nativeFiles)) return null;
  bytesMatch(noticeBytes, nativeFiles[pianoNoticeManifest], pianoNoticeManifest);
  bytesMatch(sourceBytes, nativeFiles[pianoSourceManifest], pianoSourceManifest);
  const notices = parse(noticeBytes, pianoNoticeManifest), source = parse(sourceBytes, pianoSourceManifest);
  const windowsConfig = pin(nativeFiles[windowsBuildConfig], windowsBuildConfig);
  if (notices.schema !== 1 || notices.name !== 'Dusk-Fizz/sfizz' || typeof notices.version !== 'string' || !notices.version || !revision(notices.revision) || !notices.files || Array.isArray(notices.files) || !Object.keys(notices.files).length) fail('invalid curated notice manifest');
  if (source.schema !== 1 || source.engine?.repository !== 'https://github.com/dusk-audio/dusk-fizz' || source.engine.revision !== notices.revision || !source.files || Array.isArray(source.files) || !Object.keys(source.files).length || !Array.isArray(source.components) || !source.components.length) fail('invalid engine provenance');
  const components = new Set();
  for (const component of source.components) {
    const name = component.path === '.' ? '.' : path(component.path);
    if (!revision(component.revision) || components.has(name)) fail('invalid or duplicate source component');
    components.add(name);
  }
  if (!source.components.some(component => component.path === '.' && component.revision === notices.revision)) fail('engine component revision differs');
  const expectedVendor = {};
  for (const [name, record] of Object.entries(source.files)) {
    path(name);
    if (name === 'provenance.json') fail('recursive source manifest');
    expectedVendor[`${pianoVendorPrefix}${name}`] = pin({sha256:record?.sha256, size:record?.bytes}, name);
  }
  const actualVendor = Object.fromEntries(Object.entries(nativeFiles).filter(([name]) => name.startsWith(pianoVendorPrefix) && name !== pianoSourceManifest));
  keysEqual(actualVendor, expectedVendor, 'engine source');
  for (const [name, expected] of Object.entries(expectedVendor)) if (!equalPin(actualVendor[name], expected)) fail(`source provenance differs ${name}`);
  if (!Array.isArray(source.excluded) || source.excluded.some(name => {path(name); return Object.hasOwn(source.files, name);})) fail('invalid excluded source inventory');
  if (!Array.isArray(source.licenses) || !source.licenses.length || source.licenses.some(name => {path(name); return !Object.hasOwn(source.files, name);}) || new Set(source.licenses).size !== source.licenses.length) fail('invalid source license inventory');

  const expectedNotices = {[pianoNoticeManifest]:nativeFiles[pianoNoticeManifest]}, packetFiles = {'notices/piano/manifest.json':nativeFiles[pianoNoticeManifest]};
  for (const [name, record] of Object.entries(notices.files)) {
    path(name);
    if (name === 'manifest.json') fail('recursive notice manifest');
    const expected = pin(record, name), original = name === 'provenance.json' ? nativeFiles[pianoSourceManifest] : expectedVendor[`${pianoVendorPrefix}${name}`];
    if (!equalPin(expected, original)) fail(`notice does not match original engine source ${name}`);
    if (name !== 'provenance.json' && !source.licenses.includes(name)) fail(`notice is not an authored license ${name}`);
    expectedNotices[`${pianoNoticePrefix}${name}`] = expected;
    packetFiles[`notices/piano/${name}`] = expected;
  }
  if (!Object.hasOwn(notices.files, 'provenance.json') || !Object.hasOwn(notices.files, 'LICENSE')) fail('curated notices lack engine license or provenance');
  const actualNotices = Object.fromEntries(Object.entries(nativeFiles).filter(([name]) => name.startsWith(pianoNoticePrefix)));
  keysEqual(actualNotices, expectedNotices, 'curated notice');
  for (const [name, expected] of Object.entries(expectedNotices)) if (!equalPin(actualNotices[name], expected)) fail(`curated notice pin differs ${name}`);
  const metadata = {name:notices.name, version:notices.version, repository:source.engine.repository, revision:notices.revision,
    components:source.components, sourceManifestSha256:sha256(sourceBytes), noticeManifestSha256:sha256(noticeBytes),
    windowsBuildConfigSha256:windowsConfig.sha256,
    sourceFileCount:Object.keys(source.files).length, sourceBytes:Object.values(expectedVendor).reduce((total, record) => total + record.size, 0),
    noticeFiles:Object.fromEntries(Object.entries(packetFiles).sort(([a], [b]) => a.localeCompare(b)))};
  return {metadata, packetFiles};
}

async function readPinned(file, expected, label) {
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink()) fail(`expected regular file ${label}`);
  const bytes = await readFile(file);
  bytesMatch(bytes, expected, label);
  return bytes;
}
export async function validatePianoSources(viewer, nativeFiles) {
  if (!present(nativeFiles)) return null;
  await readPinned(join(viewer, windowsBuildConfig), nativeFiles[windowsBuildConfig], windowsBuildConfig);
  const notices = await readPinned(join(viewer, pianoNoticeManifest), nativeFiles[pianoNoticeManifest], pianoNoticeManifest);
  const source = await readPinned(join(viewer, pianoSourceManifest), nativeFiles[pianoSourceManifest], pianoSourceManifest);
  return inspectPianoInputs(nativeFiles, notices, source);
}
async function carrierNativeFiles(source) {
  return JSON.parse(await readFile(join(source, 'delivery-input', 'inputs.json'))).nativeFiles;
}
export async function packagePianoNotices(source, viewer, packet) {
  const nativeFiles = await carrierNativeFiles(source), piano = await validatePianoSources(viewer, nativeFiles);
  if (!piano) return null;
  for (const [name, expected] of Object.entries(piano.packetFiles)) {
    const relative = name.slice('notices/piano/'.length), bytes = await readPinned(join(viewer, pianoNoticePrefix, relative), expected, relative);
    const destination = join(packet, name);
    await mkdir(dirname(destination), {recursive:true});
    await writeFile(destination, bytes, {flag:'wx'});
  }
  return piano.metadata;
}
export async function verifyBundledPianoNotices(source, viewer, resources) {
  const nativeFiles = await carrierNativeFiles(source), piano = await validatePianoSources(viewer, nativeFiles);
  if (!piano) return {};
  const hashes = {};
  for (const [name, expected] of Object.entries(piano.packetFiles)) {
    await readPinned(join(resources, name), expected, name);
    hashes[name] = expected.sha256;
  }
  return hashes;
}
export function validatePianoRecipient(files, nativeFiles) {
  if (!present(nativeFiles)) return null;
  const piano = inspectPianoInputs(nativeFiles, files['notices/piano/manifest.json'], files['notices/piano/provenance.json']);
  for (const [name, expected] of Object.entries(piano.packetFiles)) bytesMatch(files[name], expected, name);
  const dependencies = parse(files['native-dependencies.json'], 'native-dependencies.json');
  if (JSON.stringify(dependencies.pianoEngine) !== JSON.stringify(piano.metadata)) fail('recipient engine dependency record differs');
  if (files['iso-score-viewer.exe']) verifyWindowsPianoRuntime(files['iso-score-viewer.exe']);
  return piano;
}
// Read both normal and delay-load imports directly, without depending on a
// developer tool or an installed VC redistributable on the validation machine.
export function verifyWindowsPianoRuntime(binary) {
  const range = (offset, size) => {
    if (!Number.isSafeInteger(offset) || offset < 0 || offset + size > binary.length) fail('invalid PE bounds');
  };
  const u16 = offset => {range(offset, 2); return binary.readUInt16LE(offset);};
  const u32 = offset => {range(offset, 4); return binary.readUInt32LE(offset);};
  if (!Buffer.isBuffer(binary) || binary.subarray(0, 2).toString() !== 'MZ') fail('expected Windows PE binary');
  const pe = u32(60);
  range(pe, 24);
  if (binary.subarray(pe, pe + 4).toString() !== 'PE\0\0' || u16(pe + 4) !== 0x8664) fail('expected Windows x64 PE binary');
  const sections = u16(pe + 6), optional = pe + 24, optionalSize = u16(pe + 20);
  if (!sections || sections > 96 || optionalSize < 112 || u16(optional) !== 0x20b) fail('invalid PE optional header');
  range(optional, optionalSize);
  const directoryCount = u32(optional + 108), sectionTable = optional + optionalSize;
  range(sectionTable, sections * 40);
  const rvaOffset = (rva, size) => {
    if (rva < u32(optional + 60)) {range(rva, size); return rva;}
    for (let index = 0; index < sections; index++) {
      const section = sectionTable + index * 40, start = u32(section + 12), rawSize = u32(section + 16);
      if (rva >= start && rva + size <= start + rawSize) {
        const offset = u32(section + 20) + rva - start;
        range(offset, size); return offset;
      }
    }
    fail('PE import points outside file-backed sections');
  };
  const names = new Set();
  for (const [directory, stride, nameField] of [[1, 20, 12], [13, 32, 4]]) {
    if (directory >= directoryCount) continue;
    if (112 + (directory + 1) * 8 > optionalSize) fail('invalid PE data directory');
    const address = u32(optional + 112 + directory * 8), size = u32(optional + 116 + directory * 8);
    if (!address && !size) continue;
    if (!address || size < stride || size > 1024 * 1024) fail('invalid PE import directory');
    let ended = false;
    for (let entry = 0; entry < Math.min(512, Math.floor(size / stride)); entry++) {
      const offset = rvaOffset(address + entry * stride, stride);
      if (binary.subarray(offset, offset + stride).every(byte => byte === 0)) {ended = true; break;}
      if (directory === 13 && u32(offset) !== 1) fail('unsupported non-RVA delay import');
      const nameAddress = u32(offset + nameField);
      if (!nameAddress) fail('missing PE import name');
      let name = '', terminated = false;
      for (let index = 0; index < 260; index++) {
        const byte = binary[rvaOffset(nameAddress + index, 1)];
        if (!byte) {terminated = true; break;}
        if (byte > 127) fail('invalid PE DLL name');
        name += String.fromCharCode(byte);
      }
      if (!terminated || !/^[\w.-]+\.dll$/i.test(name)) fail('invalid PE DLL name');
      names.add(name.toLowerCase());
    }
    if (!ended) fail('unterminated PE import directory');
  }
  const imports = [...names].sort(), runtime = imports.filter(name => /^(?:msvcp|vcruntime|concrt|vcomp)\d.*\.dll$/.test(name));
  if (runtime.length) fail(`introduced VC runtime DLL prerequisite: ${runtime.join(', ')}`);
  return {binarySha256:sha256(binary), imports, vcRuntimeDLLs:runtime};
}

// Only this opt-in, test-owned fixture opens a runner output. Available-output
// failures must fail the build; no-output reports remain explicit limitations.
export function validateMacPianoDiagnostic(files) {
  const reportName = `${macPianoDiagnosticPrefix}macos-stream-diagnostic.json`;
  const report = parse(files[reportName], reportName);
  if (report.version !== 1 || report.physicalAcceptance !== false) fail('invalid Mac audio diagnostic report');
  let expected = ['macos-stream-diagnostic.json', 'cargo-stdout.txt', 'cargo-stderr.txt'];
  let check;
  if (report.result === 'unavailable') {
    if (report.reason !== 'CoreAudio reports no active render outputs on this runner' || report.settingsChanged !== false) fail('unexpected Mac audio diagnostic unavailability');
    check = {status:'unavailable', reason:report.reason};
  } else if (report.result === 'passed') {
    expected.push('fixture.sfz', 'fixture.wav', 'submitted-pcm.wav');
    if (typeof report.outputUid !== 'string' || !report.outputUid || typeof report.outputName !== 'string' || !report.outputName ||
        !Number.isSafeInteger(report.originalBufferFrames) || report.originalBufferFrames < 1 || report.finalBufferFrames !== report.originalBufferFrames ||
        !Number.isSafeInteger(report.originalRate) || report.originalRate < 1 || report.finalRate !== report.originalRate ||
        ['initializationFailureRestored','explicitCloseRestored','reconfigureRestored','dropShutdownRestored'].some(name => report[name] !== true) ||
        report.sampleRateDefaultOrDriverChanges !== false || report.normalAppExitHookAcceptance !== 'source lifecycle hook; this diagnostic exercises Host drop/explicit close') fail('Mac audio restoration evidence differs');
    for (const [name,tier] of [['low',0],['high',2]]) {
      const status = report[name];
      if (status?.ready !== true || status.running !== true || status.outputUid !== report.outputUid || status.sampleRate !== report.originalRate ||
          status.mode !== 'coreaudio-hal-current' || status.latencyTier !== tier || status.error !== null ||
          !Number.isSafeInteger(status.bufferFrames) || status.bufferFrames < 1 || !Number.isSafeInteger(status.periodFrames) || status.periodFrames < 1) fail(`Mac ${name} initialized stream evidence differs`);
    }
    const wave = files[`${macPianoDiagnosticPrefix}submitted-pcm.wav`];
    if (!Buffer.isBuffer(wave) || wave.length < 44 || wave.length > 16 * 1024 * 1024 || wave.subarray(0,4).toString() !== 'RIFF' || wave.subarray(8,16).toString() !== 'WAVEfmt ' ||
        wave.readUInt32LE(4) !== wave.length - 8 || wave.readUInt32LE(16) !== 16 || wave.readUInt16LE(20) !== 3 || wave.readUInt16LE(34) !== 32 ||
        wave.subarray(36,40).toString() !== 'data' || wave.readUInt32LE(40) !== wave.length - 44 || (wave.length - 44) % 4) fail('invalid submitted Mac float PCM');
    const channels = wave.readUInt16LE(22), rate = wave.readUInt32LE(24), count = (wave.length - 44) / 4;
    if (channels < 1 || channels > 32 || rate !== report.originalRate || wave.readUInt32LE(28) !== rate * channels * 4 || wave.readUInt16LE(32) !== channels * 4 ||
        count !== report.sampleCount || count < rate * channels / 2 || count % channels) fail('Mac submitted PCM dimensions differ');
    let peak = 0, tailPeak = 0;
    const tailStart = Math.max(0,count - Math.floor(rate * channels / 2));
    for (let index = 0; index < count; index++) {
      const sample = wave.readFloatLE(44 + index * 4);
      if (!Number.isFinite(sample)) fail('non-finite Mac submitted PCM');
      peak = Math.max(peak,Math.abs(sample));
      if (index >= tailStart) tailPeak = Math.max(tailPeak,Math.abs(sample));
    }
    if (peak <= 0.001 || tailPeak >= 0.00001 || !Number.isFinite(report.panicTrailingPeak) || Math.abs(tailPeak - report.panicTrailingPeak) > 1e-10) fail('Mac sampler/panic PCM evidence differs');
    check = {status:'passed'};
  } else fail(`Mac audio diagnostic did not complete: ${report.result}`);
  const actual = Object.keys(files).filter(name => name.startsWith(macPianoDiagnosticPrefix));
  keysEqual(Object.fromEntries(actual.map(name=>[name,true])),Object.fromEntries(expected.map(name=>[`${macPianoDiagnosticPrefix}${name}`,true])),'Mac audio diagnostic');
  const pins = {};
  for (const name of actual.sort()) {
    if (!Buffer.isBuffer(files[name]) || files[name].length > 16 * 1024 * 1024) fail(`invalid Mac diagnostic file ${name}`);
    pins[name] = {size:files[name].length,sha256:sha256(files[name])};
  }
  const stdout = files[`${macPianoDiagnosticPrefix}cargo-stdout.txt`].toString();
  if (!/running 1 test\b/.test(stdout) || !/test result: ok\. 1 passed; 0 failed; 0 ignored;/.test(stdout)) fail('Mac diagnostic ignored test was not executed exactly once');
  return {check,details:{report,files:pins}};
}

const executeMacDiagnostic = (args,cwd,env) => new Promise((done,reject) => {
  const child = spawn('cargo',args,{cwd,env:{...process.env,...env},stdio:['ignore','pipe','pipe'],detached:true});
  let stdout = '',stderr = '',timedOut = false,force;
  const collect = (old,chunk) => (old + chunk.toString()).slice(-1024 * 1024);
  child.stdout.on('data',chunk=>{stdout=collect(stdout,chunk);process.stdout.write(chunk);});
  child.stderr.on('data',chunk=>{stderr=collect(stderr,chunk);process.stderr.write(chunk);});
  const killGroup = signal => {try {process.kill(-child.pid,signal);} catch(error) {if(error.code !== 'ESRCH') reject(error);}};
  const timer = setTimeout(()=>{timedOut=true;killGroup('SIGTERM');force=setTimeout(()=>killGroup('SIGKILL'),5000);},180000);
  child.once('error',error=>{clearTimeout(timer);clearTimeout(force);reject(error);});
  child.once('close',code=>{
    if(timedOut)killGroup('SIGKILL');
    clearTimeout(timer);clearTimeout(force);
    if(timedOut || code !== 0) reject(Error(`Mac piano diagnostic ${timedOut ? 'exceeded 180 seconds' : `exited ${code}`}`));
    else done({stdout,stderr});
  });
});
export async function runMacPianoDiagnostic(ctx,packet,host,cargoArgs,env,execute=executeMacDiagnostic) {
  const nativeFiles = await carrierNativeFiles(ctx.source);
  if (!present(nativeFiles)) return null;
  const directory = join(packet,macPianoDiagnosticPrefix);
  await mkdir(directory,{recursive:true});
  const args = ['test','--locked','--release','--features','custom-protocol','--target',host,'--manifest-path','src-tauri/Cargo.toml','--bin','iso-score-viewer',...cargoArgs,'--',macPianoDiagnosticTest,'--ignored','--exact','--nocapture','--test-threads=1'];
  const result = await ctx.stage('pianoCoreAudioDiagnosticMs',()=>execute(args,ctx.viewer,{...env,VIEWER_AUDIO_DIAGNOSTIC_REPORT_DIR:directory,VIEWER_AUDIO_DIAGNOSTIC_OUTPUT_ID:''}));
  await writeFile(join(directory,'cargo-stdout.txt'),result.stdout,{flag:'wx'});
  await writeFile(join(directory,'cargo-stderr.txt'),result.stderr,{flag:'wx'});
  return validateMacPianoDiagnostic(await macDiagnosticFiles(packet));
}
async function macDiagnosticFiles(packet) {
  const {readdir} = await import('node:fs/promises');
  const directory = join(packet,macPianoDiagnosticPrefix),files = {};
  for (const name of await readdir(directory)) {
    path(name);
    const full = join(directory,name),stat = await lstat(full);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 16 * 1024 * 1024) fail(`invalid Mac diagnostic file ${name}`);
    files[`${macPianoDiagnosticPrefix}${name}`] = await readFile(full);
  }
  return files;
}
export async function addPianoWorkerChecks(source, viewer, packet, nativeChecks, details, platform, binary) {
  const nativeFiles = await carrierNativeFiles(source), piano = await validatePianoSources(viewer, nativeFiles);
  if (!piano) return {nativeChecks, details};
  const files = {};
  for (const name of [...Object.keys(piano.packetFiles), 'native-dependencies.json']) files[name] = await readFile(join(packet, name));
  validatePianoRecipient(files, nativeFiles);
  if (platform === 'windows-x64') {
    const windowsDependencies = verifyWindowsPianoRuntime(await readFile(binary));
    nativeChecks = {...nativeChecks, pianoWindowsRuntime:'passed'};
    details = {...details, windowsDependencies};
  }
  if (platform === 'macos-universal') {
    const diagnostic = validateMacPianoDiagnostic(await macDiagnosticFiles(packet));
    nativeChecks = {...nativeChecks,pianoCoreAudio:diagnostic.check};
    details = {...details,pianoCoreAudio:diagnostic.details};
  }
  return {nativeChecks:{...nativeChecks, pianoSources:'passed', pianoNotices:'passed'}, details:{...details, pianoEngine:piano.metadata}};
}
export function requirePianoWorkerChecks(receipt, nativeFiles, files) {
  if (present(nativeFiles) && ['pianoSources', 'pianoNotices'].some(name => receipt.nativeChecks?.[name] !== 'passed')) fail('native engine source/notice checks missing');
  if (present(nativeFiles) && receipt.platform === 'windows-x64' && receipt.nativeChecks?.pianoWindowsRuntime !== 'passed') fail('Windows runtime dependency check missing');
  if (present(nativeFiles) && receipt.platform === 'windows-x64') {
    const actual = verifyWindowsPianoRuntime(files?.['iso-score-viewer.exe']);
    if (JSON.stringify(receipt.details?.windowsDependencies) !== JSON.stringify(actual)) fail('Windows import receipt differs from delivered binary');
  }
  if (present(nativeFiles) && receipt.platform === 'macos-universal') {
    const diagnostic = validateMacPianoDiagnostic(files);
    if (JSON.stringify(receipt.nativeChecks?.pianoCoreAudio) !== JSON.stringify(diagnostic.check) || JSON.stringify(receipt.details?.pianoCoreAudio) !== JSON.stringify(diagnostic.details)) fail('Mac audio receipt differs from delivered evidence');
  }
}
