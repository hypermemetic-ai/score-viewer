import {readFile, writeFile, readdir, lstat, mkdir} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {brotliDecompressSync} from 'node:zlib';
import {validateSourceIdentity,validatePreparedCarrier,validateRecipientCarrier,validatePianoNativeChecks} from './score-viewer-carrier-inputs.mjs';

const require = createRequire(new URL('../../package.json', import.meta.url));
export const platforms = ['windows-x64', 'macos-universal'];
export const defaultScore = {path:'public/review/schumann-no14-conventional-20261006.tuna', sha256:'2ffc820dc1f57ba45249331c68671d82e71ea7edd0edc284fcbc03d90fd5584d'};
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const canonical = value => JSON.stringify(value);
export const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
export const writeJson = async (path, value) => {await mkdir(resolve(path, '..'), {recursive:true}); await writeFile(path, JSON.stringify(value, null, 2)+'\n');};
const fail = message => {throw Error(message);};
export function safePath(path) {
  if (typeof path !== 'string' || !path || path.includes('\\') || path.startsWith('/') || path.split('/').some(part => !part || part === '..' || part === '.') || /^[A-Za-z]:/.test(path)) fail(`Unsafe relative path: ${path}`);
  return path;
}
export async function inventory(root, exclude = []) {
  const files = {};
  async function walk(dir, prefix = '') {
    for (const name of (await readdir(dir)).sort()) {
      const path = prefix ? `${prefix}/${name}` : name;
      if (exclude.includes(path)) continue;
      safePath(path);
      const full = join(dir, name), stat = await lstat(full);
      if (stat.isSymbolicLink()) fail(`Symlink in release input: ${path}`);
      if (stat.isDirectory()) await walk(full, path);
      else if (stat.isFile()) files[path] = {sha256:sha256(await readFile(full)), size:stat.size};
      else fail(`Unexpected release input: ${path}`);
    }
  }
  await walk(root);
  return Object.fromEntries(Object.entries(files).sort(([a],[b]) => a.localeCompare(b)));
}
export async function validateInventory(root, expected, exclude = []) {
  const actual = await inventory(root, exclude);
  if (canonical(actual) !== canonical(expected)) fail(`File inventory or hash differs: ${root}`);
  return actual;
}
export function validateIdentity(identity) {
  if(identity?.sourceInputs)validateSourceIdentity(identity.sourceInputs);
  if (!identity || !/^[a-f0-9]{40}$/.test(identity.sourceRevision) || !/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(identity.version) || identity.releaseId !== `${identity.version}-${identity.sourceRevision}` || !Number.isFinite(Date.parse(identity.sourceTimestamp))) fail('Invalid release identity');
  safePath(identity.score.path);
  if(!/\.tuna$/.test(identity.score.path))fail('Release score must be a .tuna score file');
  if (!/^[a-f0-9]{64}$/.test(identity.score.sha256) || !Number.isSafeInteger(identity.score.size) || identity.score.size < 1) fail('Invalid score identity');
  const files = identity.frontend?.files;
  if (!files || !Object.keys(files).length || identity.frontend.digest !== sha256(canonical(files))) fail('Invalid frozen frontend identity');
  for (const [path, pin] of Object.entries(files)) {
    safePath(path);
    if (!/^[a-f0-9]{64}$/.test(pin.sha256) || !Number.isSafeInteger(pin.size) || pin.size < 1) fail(`Invalid frontend pin: ${path}`);
  }
}
// The locked dom_query serializer changes doctype casing/boolean crossorigin and
// moves whitespace following the closing html element into the body.
// Reject new HTML transformations until they are explicitly reviewed here.
export function normalizedHtml(bytes) {
  const html = bytes.toString('utf8');
  if (/<style\b|nonce\s*=|<script\b[^>]*src=["']https?:/i.test(html) || [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].some(match=>match[1].trim())) fail('Unreviewed Tauri HTML transformation');
  const tail=html.match(/\s*$/)?.[0]??'';
  return Buffer.from(html.trimEnd().replace(/<!doctype html>/i,'<!DOCTYPE html>').replace(/\bcrossorigin(?=[\s>])/g,'crossorigin=""').replace(/<\/body>/,`${tail}</body>`));
}
export async function validatePrepared(root, {expectedRevision} = {}) {
  const manifest = await readJson(join(root,'manifest.json'));
  if (manifest.schema !== 1) fail('Unsupported prepared manifest');
  validateIdentity(manifest.identity);
  if(!manifest.identity.sourceInputs)fail('Reviewed viewer/notation carrier identity missing');
  await validatePreparedCarrier(root,manifest.identity);
  if (expectedRevision && manifest.identity.sourceRevision !== expectedRevision) fail('Prepared source revision differs');
  await validateInventory(root, manifest.files, ['manifest.json']);
  await validateInventory(join(root,'frontend'),manifest.identity.frontend.files);
  const score = await readFile(join(root,'Schumann-No14.tuna'));
  if (sha256(score) !== manifest.identity.score.sha256 || score.length !== manifest.identity.score.size) fail('Prepared score differs');
  const embeddedIdentity=await readJson(join(root,'frontend','release-identity.json'));
  if(canonical(embeddedIdentity)!==canonical({sourceRevision:manifest.identity.sourceRevision,version:manifest.identity.version,score:manifest.identity.score,sourceInputs:manifest.identity.sourceInputs}))fail('Actual embedded release identity differs');
  if (canonical(Object.keys(manifest.probes).sort()) !== canonical(Object.keys(manifest.identity.frontend.files).sort())) fail('Embedded probes do not cover every frontend file');
  for (const [path, probe] of Object.entries(manifest.probes)) {
    safePath(probe.path);
    const bytes = await readFile(join(root,probe.path));
    if (sha256(bytes) !== probe.sha256) fail(`Compressed probe differs: ${path}`);
    const decoded = brotliDecompressSync(bytes), original = await readFile(join(root,'frontend',path));
    const expected = path.endsWith('.html') ? normalizedHtml(original) : original;
    if (!decoded.equals(expected) || sha256(decoded) !== probe.decodedSha256) fail(`Tauri transformed frontend differs: ${path}`);
  }
  return manifest;
}
export function macSlices(binary) {
  if (binary.length < 8 || binary.readUInt32BE(0) !== 0xcafebabe || binary.readUInt32BE(4) !== 2) fail('Expected two-slice universal Mach-O');
  const slices = {};
  for (let i=0; i<2; i++) {
    const offset=8+i*20, cpu=binary.readUInt32BE(offset), start=binary.readUInt32BE(offset+8), size=binary.readUInt32BE(offset+12);
    const arch = cpu === 0x01000007 ? 'x86_64' : cpu === 0x0100000c ? 'arm64' : null;
    if (!arch || slices[arch] || size === 0 || start+size > binary.length || start < 48) fail('Invalid universal Mach-O slice');
    slices[arch]=binary.subarray(start,start+size);
  }
  return slices;
}
export async function verifyEmbedded(binary, prepared, platform) {
  const manifest = await validatePrepared(prepared);
  const slices = platform === 'macos-universal' ? macSlices(binary) : {'x86_64':binary};
  if (platform === 'windows-x64' && (binary.subarray(0,2).toString() !== 'MZ' || binary.length < 64 || binary.readUInt32LE(60)+6 > binary.length || binary.subarray(binary.readUInt32LE(60),binary.readUInt32LE(60)+4).toString()!=='PE\0\0' || binary.readUInt16LE(binary.readUInt32LE(60)+4) !== 0x8664)) fail('Expected Windows x64 PE');
  const proof = {};
  for (const [arch, bytes] of Object.entries(slices)) {
    const assets = {};
    for (const [path, pin] of Object.entries(manifest.probes)) {
      const probe = await readFile(join(prepared,pin.path)), offset = bytes.indexOf(probe);
      if (offset < 0) fail(`Missing actual embedded payload: ${arch}/${path}`);
      if (bytes.indexOf(probe,offset+1)>=0) fail(`Repeated actual embedded payload: ${arch}/${path}`);
      assets[path]={compressedSha256:pin.sha256, decodedSha256:pin.decodedSha256, offset, size:probe.length};
    }
    proof[arch]={binarySha256:sha256(bytes), assets};
  }
  return {binarySha256:sha256(binary),slices:proof};
}
export function readZip(bytes) {
  // Inspect central directory before inflation; duplicates must not overwrite one another.
  let end=-1;
  for (let i=bytes.length-22; i>=Math.max(0,bytes.length-65557); i--) if(bytes.readUInt32LE(i)===0x06054b50){end=i;break;}
  if(end<0 || bytes.readUInt16LE(end+8)!==bytes.readUInt16LE(end+10)) fail('Invalid recipient ZIP');
  const count=bytes.readUInt16LE(end+10), names=new Set(); let position=bytes.readUInt32LE(end+16);
  for(let i=0;i<count;i++) {
    if(position+46>bytes.length || bytes.readUInt32LE(position)!==0x02014b50)fail('Invalid ZIP directory');
    const length=bytes.readUInt16LE(position+28), extra=bytes.readUInt16LE(position+30), comment=bytes.readUInt16LE(position+32);
    const name=bytes.subarray(position+46,position+46+length).toString('utf8');
    safePath(name.endsWith('/')?name.slice(0,-1):name);
    if(names.has(name))fail(`Duplicate ZIP member: ${name}`); names.add(name);
    const mode=bytes.readUInt32LE(position+38)>>>16;
    if((mode&0xf000)===0xa000)fail(`ZIP symlink forbidden: ${name}`);
    position+=46+length+extra+comment;
  }
  const {unzipSync}=require('fflate');
  return Object.fromEntries(Object.entries(unzipSync(bytes)).filter(([name])=>!name.endsWith('/')).map(([name,data])=>[name,Buffer.from(data)]));
}
export function zipInventory(files, exclude=[]) {
  return Object.fromEntries(Object.entries(files).filter(([path])=>!exclude.includes(path)).sort(([a],[b])=>a.localeCompare(b)).map(([path,bytes])=>[path,{sha256:sha256(bytes),size:bytes.length}]));
}
export async function validateWorker(root, prepared, platform) {
  const manifest=await validatePrepared(prepared), receipt=await readJson(join(root,'receipt.json'));
  if(receipt.schema!==1 || receipt.platform!==platform || canonical(receipt.identity)!==canonical(manifest.identity))fail(`Mismatched ${platform} identity`);
  await validateInventory(root,receipt.files,['receipt.json']);
  const bytes=await readFile(join(root,receipt.package.path)), files=readZip(bytes);
  if(sha256(bytes)!==receipt.package.sha256 || canonical(zipInventory(files))!==canonical(receipt.package.files))fail(`Recipient archive differs: ${platform}`);
  if(!files['Schumann-No14.tuna'] || sha256(files['Schumann-No14.tuna'])!==manifest.identity.score.sha256)fail(`Recipient score differs: ${platform}`);
  await validateRecipientCarrier(files,prepared);
  const binaryPath=platform==='windows-x64'?'iso-score-viewer.exe':'ISO Score Viewer.app/Contents/MacOS/iso-score-viewer';
  if(!files[binaryPath])fail(`Delivered binary missing: ${platform}`);
  const actual=await verifyEmbedded(files[binaryPath],prepared,platform);
  if(canonical(actual)!==canonical(receipt.embedded))fail(`Embedded proof differs: ${platform}`);
  await validatePianoNativeChecks(receipt,prepared,files);
  if(receipt.nativeChecks?.tests!=='passed' || (platform==='macos-universal' && ['virtualMidi','signatures','resources','minimumOS','dmg','dmgAppParity'].some(key=>receipt.nativeChecks[key]!=='passed')))fail(`Required native checks missing: ${platform}`);
  return receipt;
}
export async function validatePair(root,{expectedRevision}={}) {
  const release=await readJson(join(root,'release.json'));
  if(release.schema!==1 || canonical(Object.keys(release.platforms).sort())!==canonical([...platforms].sort()))fail('A complete Windows and Mac pair is required');
  validateIdentity(release.identity);
  if(expectedRevision && release.identity.sourceRevision!==expectedRevision)fail('Release source revision differs');
  await validateInventory(root,release.files,['release.json']);
  const prepared=join(root,'prepared'), manifest=await validatePrepared(prepared,{expectedRevision});
  if(canonical(manifest.identity)!==canonical(release.identity))fail('Pair preparation identity differs');
  for(const platform of platforms) {
    const pin=release.platforms[platform]; safePath(pin.receipt); safePath(pin.package);
    const receipt=await readJson(join(root,pin.receipt));
    if(receipt.platform!==platform || canonical(receipt.identity)!==canonical(release.identity))fail(`Pair identity differs: ${platform}`);
    const bytes=await readFile(join(root,pin.package)), files=readZip(bytes);
    if(sha256(bytes)!==receipt.package.sha256 || canonical(zipInventory(files))!==canonical(receipt.package.files))fail(`Pair package differs: ${platform}`);
    if(sha256(files['Schumann-No14.tuna']??Buffer.alloc(0))!==release.identity.score.sha256)fail('Pair score differs');
    await validateRecipientCarrier(files,prepared);
    const binary=files[platform==='windows-x64'?'iso-score-viewer.exe':'ISO Score Viewer.app/Contents/MacOS/iso-score-viewer'];
    if(!binary || canonical(await verifyEmbedded(binary,prepared,platform))!==canonical(receipt.embedded))fail(`Pair embedded payload differs: ${platform}`);
    await validatePianoNativeChecks(receipt,prepared,files);
    if(receipt.nativeChecks?.tests!=='passed' || (platform==='macos-universal' && ['virtualMidi','signatures','resources','minimumOS','dmg','dmgAppParity'].some(key=>receipt.nativeChecks[key]!=='passed')))fail(`Pair native checks missing: ${platform}`);
  }
  return release;
}
