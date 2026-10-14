import {validateConverterRecipient,converterResourceMap} from './score-viewer-converter-release.mjs';
import {createHash} from 'node:crypto';
import {readFile, readdir, lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {footerProbeVersion,footerProbeReceipt,footerMetricsSha256,validateFooterRuntimeReceipt} from './footer-ink-receipt.mjs';
import {validatePianoSources, validatePianoRecipient, requirePianoWorkerChecks} from './score-viewer-piano-release.mjs';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const canonical = value => JSON.stringify(value);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const revision = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const fail = message => {throw Error(message);};
export function safePath(path) {
  if (typeof path !== 'string' || !path || path.includes('\\') || path.startsWith('/') || /^[A-Za-z]:/.test(path) || path.split('/').some(part => !part || part === '.' || part === '..')) fail(`Unsafe carrier path: ${path}`);
  return path;
}
export async function inventory(root) {
  const rootStat = await lstat(root);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) fail(`Carrier inventory root must be a real directory: ${root}`);
  const result = {};
  async function visit(directory, prefix = '') {
    for (const name of (await readdir(directory)).sort()) {
      const path = safePath(prefix ? `${prefix}/${name}` : name), full = join(directory, name), stat = await lstat(full);
      if (stat.isSymbolicLink()) fail(`Symlink in carrier input: ${path}`);
      if (stat.isDirectory()) await visit(full, path);
      else if (stat.isFile()) result[path] = {sha256:sha256(await readFile(full)), size:stat.size};
      else fail(`Unexpected carrier input: ${path}`);
    }
  }
  await visit(root);
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}
export function validatePins(files) {
  if (!files || !Object.keys(files).length) fail('Empty carrier inventory');
  for (const [path, pin] of Object.entries(files)) {
    safePath(path);
    if (!hash(pin?.sha256) || !Number.isSafeInteger(pin.size) || pin.size < 1) fail(`Invalid carrier pin: ${path}`);
  }
}
export function validateSourceIdentity(identity) {
  if (!identity || identity.schema !== 1 || identity.viewerRepository !== 'hypermemetic-ai/score-viewer' || identity.notationRepository !== 'hypermemetic-ai/iso-notation' || !revision(identity.viewerRevision) || !revision(identity.viewerTree) || !revision(identity.notationRevision) || !hash(identity.inputsSha256) || !hash(identity.frontendDigest) || !hash(identity.nativeDigest) || !hash(identity.checksSha256)) fail('Invalid viewer/notation carrier identity');
}
export function sourceIdentity(inputs, inputsBytes) {
  const identity = {schema:1, viewerRepository:inputs.viewer.repository, viewerRevision:inputs.viewer.revision, viewerTree:inputs.viewer.tree,
    notationRepository:inputs.notation.repository, notationRevision:inputs.notation.revision, inputsSha256:sha256(inputsBytes),
    frontendDigest:inputs.frontend.digest, nativeDigest:sha256(canonical(inputs.nativeFiles)), checksSha256:inputs.checks.sha256};
  validateSourceIdentity(identity);
  return identity;
}
export function validateRecordedChecks(checks, inputs) {
  if (checks.schema !== 1 || checks.viewerRevision !== inputs.viewer.revision || checks.notationRevision !== inputs.notation.revision || checks.frontendDigest !== inputs.frontend.digest || ['tests', 'build', 'browserInspection', 'independentReview'].some(name => checks.checks?.[name]?.status !== 'passed')) fail('Reviewed check receipt does not bind final source and frontend');
}
/** npm ci needs every local tarball in the original package lock, even when
 * the application frontend is already frozen. */
export function lockedLocalDependencies(packageJson, lock) {
  const files = new Map();
  const localPath = specifier => {
    const path = safePath(specifier.slice(5));
    if (!path.startsWith('vendor/') || !path.endsWith('.tgz')) fail(`Unsupported locked local dependency: ${specifier}`);
    return path;
  };
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    for (const [name, specifier] of Object.entries(packageJson[section] ?? {})) {
      if (typeof specifier !== 'string' || !specifier.startsWith('file:')) continue;
      localPath(specifier);
      const entry = lock.packages?.[`node_modules/${name}`];
      if (lock.packages?.['']?.[section]?.[name] !== specifier || entry?.resolved !== specifier) fail(`Local dependency declaration/lock differs: ${name}`);
    }
  }
  for (const [name, entry] of Object.entries(lock.packages ?? {})) {
    if (typeof entry.resolved !== 'string' || !entry.resolved.startsWith('file:')) continue;
    const path = localPath(entry.resolved);
    if (!/^sha512-[A-Za-z0-9+/]{86}==$/.test(entry.integrity ?? '')) fail(`Missing SHA512 lock integrity: ${name}`);
    const requirements = files.get(path) ?? [];
    requirements.push({name, integrity:entry.integrity}); files.set(path, requirements);
  }
  return files;
}
export async function validateLockedLocalDependencies(packageJson, lock, readArtifact, frontendFiles, readFrontend) {
  const files = lockedLocalDependencies(packageJson, lock);
  for (const [path, requirements] of files) {
    const bytes = await readArtifact(path);
    const integrity = 'sha512-' + createHash('sha512').update(bytes).digest('base64');
    if (requirements.some(entry => entry.integrity !== integrity)) fail(`Locked local dependency integrity differs: ${path}`);
    if (requirements.some(entry => entry.name === 'node_modules/score-converter-proof')) {
      converterResourceMap(frontendFiles);
      const pin = frontendFiles['converter/gp/source-package.tgz'];
      const identity = JSON.parse(await readFrontend('converter/gp/source-package-identity.json'));
      if (!pin || bytes.length !== pin.size || sha256(bytes) !== pin.sha256 || identity.schema !== 'score-converter-private-package/1' ||
          identity.archive?.bytes !== bytes.length || identity.archive.sha256 !== sha256(bytes)) fail('Locked converter package differs from frozen source identity');
    }
  }
  return files;
}
export async function validatePreparedCarrier(prepared, identity) {
  validateSourceIdentity(identity.sourceInputs);
  const bytes = await readFile(join(prepared, 'source-inputs.json')), inputs = JSON.parse(bytes);
  if (canonical(sourceIdentity(inputs, bytes)) !== canonical(identity.sourceInputs)) fail('Prepared viewer/notation identity differs');
  validatePins(inputs.frontend.files);
  const actual = await inventory(join(prepared, 'frontend'));
  delete actual['release-identity.json'];
  if (canonical(actual) !== canonical(inputs.frontend.files) || sha256(canonical(actual)) !== inputs.frontend.digest) fail('Prepared frontend differs from the reviewed viewer build');
  const checksBytes = await readFile(join(prepared, 'source-checks.json'));
  if (sha256(checksBytes) !== inputs.checks.sha256 || checksBytes.length !== inputs.checks.size) fail('Prepared reviewed checks differ');
  validateRecordedChecks(JSON.parse(checksBytes), inputs);
}
export async function validateRecipientCarrier(files, prepared) {
  for (const [recipient, original] of [['Source-provenance.json', 'source-inputs.json'], ['Source-validation.json', 'source-checks.json'], ['Release-identity.json', 'frontend/release-identity.json']]) {
    const expected = await readFile(join(prepared, original));
    if (!files[recipient] || !Buffer.from(files[recipient]).equals(expected)) fail(`Recipient source evidence differs: ${recipient}`);
  }
  const inputs = JSON.parse(await readFile(join(prepared, 'source-inputs.json')));
  validatePianoRecipient(files, inputs.nativeFiles);
  validateConverterRecipient(files,inputs.frontend.files);
  const macAppPresent=Object.keys(files).some(path=>path.startsWith('ISO Score Viewer.app/'));
  for(const [path,pin]of Object.entries(inputs.nativeFiles).filter(([path])=>path.startsWith('licenses/'))){
    const bytes=files['notices/'+path.slice(9)];
    if(!bytes||bytes.length!==pin.size||sha256(bytes)!==pin.sha256)fail(`Recipient font notice differs: ${path}`);
    if(macAppPresent){const bundled=files['ISO Score Viewer.app/Contents/Resources/notices/'+path.slice(9)];
      if(!bundled||bundled.length!==pin.size||sha256(bundled)!==pin.sha256)fail(`Mac app font notice differs: ${path}`);}
  }
  if(macAppPresent&&inputs.nativeFiles['licenses/LiberationSerif-Italic-NOTICE.txt']){
    const proof=files[footerProbeReceipt];if(!proof)fail('Actual WK font runtime receipt missing');
    validateFooterRuntimeReceipt(JSON.parse(Buffer.from(proof).toString('utf8')),inputs,sourceIdentity(inputs,await readFile(join(prepared,'source-inputs.json'))));
  }
}
export async function validatePianoNativeChecks(receipt, prepared, files) {
  const inputs = JSON.parse(await readFile(join(prepared, 'source-inputs.json')));
  requirePianoWorkerChecks(receipt, inputs.nativeFiles, files);
  if(receipt.platform==='macos-universal'&&inputs.nativeFiles['licenses/LiberationSerif-Italic-NOTICE.txt']){
    const proof=files[footerProbeReceipt],check=receipt.nativeChecks?.footerInk;
    if(!proof||check?.status!=='passed'||check.version!==footerProbeVersion||check.receipt!==footerProbeReceipt||check.receiptSha256!==sha256(proof))fail('Actual WK font worker check missing or changed');
    validateFooterRuntimeReceipt(JSON.parse(Buffer.from(proof).toString('utf8')),inputs,sourceIdentity(inputs,await readFile(join(prepared,'source-inputs.json'))));
  }
}
export async function validateCarrierInputs(source, {expectedViewerRevision, expectedNotationRevision} = {}) {
  const bytes = await readFile(join(source, 'delivery-input', 'inputs.json')), inputs = JSON.parse(bytes);
  if (inputs.schema !== 1 || inputs.viewer?.repository !== 'hypermemetic-ai/score-viewer' || !revision(inputs.viewer.revision) || !revision(inputs.viewer.tree) || !Number.isFinite(Date.parse(inputs.viewer.timestamp)) || inputs.notation?.repository !== 'hypermemetic-ai/iso-notation' || !revision(inputs.notation.revision)) fail('Invalid reviewed carrier inputs');
  if (expectedViewerRevision && inputs.viewer.revision !== expectedViewerRevision) fail('Viewer revision differs');
  if (expectedNotationRevision && inputs.notation.revision !== expectedNotationRevision) fail('Notation revision differs');
  validatePins(inputs.nativeFiles);
  validatePins(inputs.frontend?.files);
  if (inputs.frontend.digest !== sha256(canonical(inputs.frontend.files))) fail('Frozen frontend digest differs');
  if (canonical(await inventory(join(source, 'delivery-input', 'frontend'))) !== canonical(inputs.frontend.files)) fail('Frozen frontend inventory differs');
  const native = await inventory(join(source, 'src-tauri'));
  const expectedNative = Object.fromEntries(Object.entries(inputs.nativeFiles).filter(([path]) => path.startsWith('src-tauri/')).map(([path, pin]) => [path.slice(10), pin]));
  if (canonical(native) !== canonical(expectedNative)) fail('Native source inventory differs');
  if (inputs.nativeFiles['.cargo/config.toml'] && canonical(await inventory(join(source, '.cargo'))) !== canonical({'config.toml':inputs.nativeFiles['.cargo/config.toml']})) fail('Native Cargo configuration inventory differs');
  const packageJson = JSON.parse(await readFile(join(source, 'package.json'))), lock = JSON.parse(await readFile(join(source, 'package-lock.json')));
  const localFiles = await validateLockedLocalDependencies(packageJson, lock, async path => {
    if (!inputs.nativeFiles[path]) fail(`Locked local dependency missing from native inventory: ${path}`);
    const parts = path.split('/'); let parent = source;
    for (let i = 0; i < parts.length; i++) {
      parent = join(parent, parts[i]); const stat = await lstat(parent);
      if (stat.isSymbolicLink() || (i === parts.length - 1 ? !stat.isFile() : !stat.isDirectory())) fail(`Locked local dependency must be a regular source file: ${path}`);
    }
    return readFile(join(source, path));
  }, inputs.frontend.files, path => readFile(join(source, 'delivery-input', 'frontend', path)));
  for (const [path, pin] of Object.entries(inputs.nativeFiles)) {
    if (!/^(?:src-tauri\/|licenses\/|\.cargo\/config\.toml$|package(?:-lock)?\.json$)/.test(path) && !localFiles.has(path)) fail(`Unexpected native source path: ${path}`);
    const file = await readFile(join(source, path));
    if (sha256(file) !== pin.sha256 || file.length !== pin.size) fail(`Native source pin differs: ${path}`);
    if (path.startsWith('licenses/') && !(await readFile(join(source, path))).equals(file)) fail(`Shared/native notice differs: ${path}`);
  }
  await validatePianoSources(source, inputs.nativeFiles);
  if(inputs.nativeFiles['licenses/LiberationSerif-Italic-NOTICE.txt']){
    const p=inputs.runtimeFontProbe;if(typeof p?.metricsLiteral!=='string'||sha256(Buffer.from(p.metricsLiteral))!==footerMetricsSha256||p?.version!==footerProbeVersion||!hash(p.policySha256)||p.fixture?.sha256!=='ece4c99bf27f179f7fb1adecba71795150df318edaa51a9f721cb09b2b33d9b1'||
      !hash(p.fixture.sourceSha256)||!Number.isSafeInteger(p.fixture.ownerCount)||p.fixture.ownerCount<1||canonical(inputs.frontend.files[p.fixture.path])!==canonical({sha256:p.fixture.sha256,size:p.fixture.size})||!inputs.frontend.files['footer-ink-probe.html'])fail('Source-bound public footer runtime inputs missing');
    const names=['scripts/native-delivery/footer-ink-probe.swift','scripts/native-delivery/footer-ink-probe.mjs','scripts/native-delivery/footer-ink-receipt.mjs'];
    if(canonical(Object.keys(p.files??{}).sort())!==canonical(names.sort()))fail('Footer runtime helper inventory differs');validatePins(p.files);
    for(const [path,pin]of Object.entries(p.files)){const b=await readFile(join(source,path));if(b.length!==pin.size||sha256(b)!==pin.sha256)fail('Footer runtime helper differs: '+path);}
  }
  if(Object.keys(converterResourceMap(inputs.frontend.files)).length){
    const p=inputs.converterNoticeHelper;
    if(p?.path!=='scripts/native-delivery/score-viewer-converter-release.mjs'||!hash(p.sha256)||!Number.isSafeInteger(p.size)||p.size<1)fail('Source-bound converter notice helper missing');
    const b=await readFile(join(source,p.path));if(b.length!==p.size||sha256(b)!==p.sha256)fail('Converter notice helper differs');
  }
  const checksBytes = await readFile(join(source, 'delivery-input', 'checks.json'));
  if (!hash(inputs.checks?.sha256) || sha256(checksBytes) !== inputs.checks.sha256 || checksBytes.length !== inputs.checks.size) fail('Reviewed check receipt differs');
  const checks = JSON.parse(checksBytes);
  validateRecordedChecks(checks, inputs);
  const config = JSON.parse(await readFile(join(source, 'src-tauri', 'tauri.conf.json')));
  if(packageJson.dependencies?.['score-converter-proof']&&!inputs.frontend.files['converter/gp/source-package-identity.json'])fail('Selected converter lacks emitted source/notice closure');
  if (packageJson.version !== inputs.version || config.version !== inputs.version || config.identifier !== 'dev.qqp.iso-score-viewer' || config.productName !== 'ISO Score Viewer') fail('Application identity differs');
  return {inputs, checks, sourceInputs:sourceIdentity(inputs, bytes)};
}
