import {createHash} from 'node:crypto';
import {readFile, lstat, mkdir, writeFile} from 'node:fs/promises';
import {join, dirname} from 'node:path';

export const pianoVendorPrefix = 'src-tauri/vendor/sfizz/';
export const pianoNoticePrefix = 'src-tauri/piano-notices/';
export const pianoNoticeManifest = `${pianoNoticePrefix}manifest.json`;
export const pianoSourceManifest = `${pianoVendorPrefix}provenance.json`;
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
  return piano;
}
export async function addPianoWorkerChecks(source, viewer, packet, nativeChecks, details) {
  const nativeFiles = await carrierNativeFiles(source), piano = await validatePianoSources(viewer, nativeFiles);
  if (!piano) return {nativeChecks, details};
  const files = {};
  for (const name of [...Object.keys(piano.packetFiles), 'native-dependencies.json']) files[name] = await readFile(join(packet, name));
  validatePianoRecipient(files, nativeFiles);
  return {nativeChecks:{...nativeChecks, pianoSources:'passed', pianoNotices:'passed'}, details:{...details, pianoEngine:piano.metadata}};
}
export function requirePianoWorkerChecks(receipt, nativeFiles) {
  if (present(nativeFiles) && ['pianoSources', 'pianoNotices'].some(name => receipt.nativeChecks?.[name] !== 'passed')) fail('native engine source/notice checks missing');
}
