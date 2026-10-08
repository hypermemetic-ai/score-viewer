#!/usr/bin/env node
import {execFileSync} from 'node:child_process';
import {cp, mkdir, readFile, rm, writeFile, chmod} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {inventory, sha256, canonical, safePath, validateRecordedChecks, validateCarrierInputs} from './native-release-carrier/inputs.mjs';

const templates = fileURLToPath(new URL('./native-release-carrier/', import.meta.url));
function git(source, args, binary = false) {
  return execFileSync('git', args, {cwd:source, encoding:binary ? undefined : 'utf8', maxBuffer:32 * 1024 * 1024});
}
function replaceOnce(text, before, after, label) {
  if (text.split(before).length !== 2) throw Error(`Unsupported pinned ISO ${label}; expected one exact adaptation anchor`);
  return text.replace(before, after);
}
export async function createCarrier({viewerSource, viewerRevision, frontend, checks, isoCarrier}) {
  viewerSource=resolve(viewerSource);frontend=resolve(frontend);checks=resolve(checks);isoCarrier=resolve(isoCarrier);
  if (!/^[a-f0-9]{40}$/.test(viewerRevision)) throw Error('An exact reviewed viewer revision is required');
  if (viewerSource === isoCarrier) throw Error('Carrier and viewer checkouts must be separate');
  if (git(viewerSource,['status','--porcelain','--untracked-files=all']).trim()) throw Error('Viewer checkout must be clean before freezing release inputs');
  if (git(viewerSource,['rev-parse','HEAD']).trim() !== viewerRevision) throw Error('Viewer checkout differs from reviewed revision');
  if (git(isoCarrier,['status','--porcelain','--untracked-files=all']).trim()) throw Error('ISO carrier checkout must be clean');
  const provenance=JSON.parse(git(viewerSource,['show',`${viewerRevision}:docs/source-provenance.json`]));
  const notationRevision=provenance.dependencyRevision;
  const gitlink=git(viewerSource,['ls-tree',viewerRevision,'vendor/iso-notation']).trim();
  if (!/^[a-f0-9]{40}$/.test(notationRevision) || gitlink.split(/\s+/)[2] !== notationRevision || !gitlink.startsWith('160000 commit ')) throw Error('Viewer notation gitlink/provenance disagree');
  if (git(isoCarrier,['rev-parse','HEAD']).trim() !== notationRevision) throw Error('Start the isolated carrier at the viewer exact notation revision');
  const pkg=JSON.parse(git(viewerSource,['show',`${viewerRevision}:package.json`]));
  const frontendFiles=await inventory(frontend),frontendDigest=sha256(canonical(frontendFiles));
  if (frontendFiles['release-identity.json']) throw Error('Frontend already contains another native release identity');
  if (!frontendFiles['index.html'] || !Object.keys(frontendFiles).some(path=>/^assets\/.*\.js$/.test(path)) || !Object.keys(frontendFiles).some(path=>/\.otf$/.test(path))) throw Error('Frontend lacks the complete reader/font payload');
  const checksBytes=await readFile(checks),checkReceipt=JSON.parse(checksBytes);
  const inputs={schema:1,version:pkg.version,
    viewer:{repository:'hypermemetic-ai/score-viewer',revision:viewerRevision,tree:git(viewerSource,['rev-parse',`${viewerRevision}^{tree}`]).trim(),timestamp:new Date(git(viewerSource,['show','-s','--format=%cI',viewerRevision]).trim()).toISOString()},
    notation:{repository:'hypermemetic-ai/iso-notation',revision:notationRevision},nativeFiles:{},
    frontend:{files:frontendFiles,digest:frontendDigest},checks:{sha256:sha256(checksBytes),size:checksBytes.length}};
  validateRecordedChecks(checkReceipt,inputs);
  const selected=git(viewerSource,['ls-tree','-r','--format=%(objectmode) %(path)',viewerRevision,'src-tauri','licenses','package.json','package-lock.json']).trim().split('\n').map(line=>{const space=line.indexOf(' ');return {mode:line.slice(0,space),path:safePath(line.slice(space+1))};});
  for(const file of selected) {
    if(!['100644','100755'].includes(file.mode))throw Error(`Unsupported native input mode: ${file.path}`);
    const bytes=git(viewerSource,['show',`${viewerRevision}:${file.path}`],true);
    if(!bytes.length)throw Error(`Empty native input: ${file.path}`);
    inputs.nativeFiles[file.path]={sha256:sha256(bytes),size:bytes.length};
  }
  inputs.nativeFiles=Object.fromEntries(Object.entries(inputs.nativeFiles).sort(([a],[b])=>a.localeCompare(b)));
  // Validate all adapters before any carrier mutation. The source commit stays
  // untouched; only the task-owned clean, isolated carrier worktree is written.
  let delivery=await readFile(join(isoCarrier,'scripts','score-viewer-delivery.mjs'),'utf8');
  delivery=replaceOnce(delivery,"import {brotliDecompressSync} from 'node:zlib';","import {brotliDecompressSync} from 'node:zlib';\nimport {validateSourceIdentity,validatePreparedCarrier} from './score-viewer-carrier-inputs.mjs';",'delivery import');
  delivery=replaceOnce(delivery,"export function validateIdentity(identity) {","export function validateIdentity(identity) {\n  if(identity?.sourceInputs)validateSourceIdentity(identity.sourceInputs);",'delivery identity');
  delivery=replaceOnce(delivery,"  validateIdentity(manifest.identity);","  validateIdentity(manifest.identity);\n  if(!manifest.identity.sourceInputs)fail('Reviewed viewer/notation carrier identity missing');\n  await validatePreparedCarrier(root,manifest.identity);",'prepared verification');
  delivery=replaceOnce(delivery,"{sourceRevision:manifest.identity.sourceRevision,version:manifest.identity.version,score:manifest.identity.score}","{sourceRevision:manifest.identity.sourceRevision,version:manifest.identity.version,score:manifest.identity.score,sourceInputs:manifest.identity.sourceInputs}",'embedded identity');
  let worker=await readFile(join(isoCarrier,'scripts','score-viewer-native-worker.mjs'),'utf8');
  worker=replaceOnce(worker,"import {performance} from 'node:perf_hooks';","import {performance} from 'node:perf_hooks';\nimport {validateCarrierInputs} from './score-viewer-carrier-inputs.mjs';",'worker import');
  worker=replaceOnce(worker,"  const manifest=await validatePrepared(prepared,{expectedRevision:git('rev-parse','HEAD')});","  const manifest=await validatePrepared(prepared,{expectedRevision:git('rev-parse','HEAD')});\n  const verified=await validateCarrierInputs(source);\n  if(JSON.stringify(verified.sourceInputs)!==JSON.stringify(manifest.identity.sourceInputs))throw Error('Worker viewer/notation inputs differ from preparation');",'worker input verification');
  worker=replaceOnce(worker,"  await cp(join(ctx.prepared,'Schumann-No14.isoscore'),join(packet,'Schumann-No14.isoscore'));","  await cp(join(ctx.prepared,'Schumann-No14.isoscore'),join(packet,'Schumann-No14.isoscore'));\n  await cp(join(ctx.prepared,'source-inputs.json'),join(packet,'Source-provenance.json'));\n  await cp(join(ctx.prepared,'source-checks.json'),join(packet,'Source-validation.json'));\n  await cp(join(ctx.prepared,'frontend','release-identity.json'),join(packet,'Release-identity.json'));",'recipient provenance');
  await rm(join(isoCarrier,'score-viewer','src-tauri'),{recursive:true});
  for(const file of selected) {
    const full=join(isoCarrier,'score-viewer',file.path);
    await mkdir(resolve(full,'..'),{recursive:true});
    await writeFile(full,git(viewerSource,['show',`${viewerRevision}:${file.path}`],true));
    await chmod(full,file.mode==='100755'?0o755:0o644);
  }
  await mkdir(join(isoCarrier,'delivery-input'));
  await cp(frontend,join(isoCarrier,'delivery-input','frontend'),{recursive:true,errorOnExist:true,force:false});
  await writeFile(join(isoCarrier,'delivery-input','checks.json'),checksBytes);
  await writeFile(join(isoCarrier,'delivery-input','inputs.json'),JSON.stringify(inputs,null,2)+'\n');
  await cp(join(templates,'inputs.mjs'),join(isoCarrier,'scripts','score-viewer-carrier-inputs.mjs'));
  await cp(join(templates,'prepare-score-viewer.mjs'),join(isoCarrier,'scripts','prepare-score-viewer.mjs'));
  await writeFile(join(isoCarrier,'scripts','score-viewer-delivery.mjs'),delivery);
  await writeFile(join(isoCarrier,'scripts','score-viewer-native-worker.mjs'),worker);
  await writeFile(join(isoCarrier,'delivery-input','README.md'),`# Frozen native release inputs\n\nThis isolated delivery carrier builds reviewed viewer ${viewerRevision} with notation ${notationRevision}. Application source ownership remains in hypermemetic-ai/score-viewer. The legacy ISO viewer TypeScript is not built. The shared frontend was checked and built once before freezing; native preparation verifies its inventory and source-check receipt, adds an embedded release identity, and generates every payload probe.\n\nThe unchanged paired workflow selects this carrier commit for checkout. Its packages identify that carrier plus the independently bound viewer and notation revisions. Native Windows tests, Mac tests/virtual MIDI/signatures/deployment/DMG/launch checks, both-slice embedded proof and paired publication remain required. No recipient installation or data changes occur from building this carrier.\n`);
  const verified=await validateCarrierInputs(isoCarrier,{expectedViewerRevision:viewerRevision,expectedNotationRevision:notationRevision});
  return {viewerRevision,notationRevision,frontendDigest,sourceInputs:verified.sourceInputs,carrierWorktree:isoCarrier};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [viewerSource,viewerRevision,frontend,checks,isoCarrier]=process.argv.slice(2);
  if(!isoCarrier)throw Error('Usage: node scripts/create-native-release-carrier.mjs <clean-viewer> <reviewed-viewer-SHA> <frozen-dist> <reviewed-check-receipt> <clean-isolated-ISO-at-notation-pin>');
  console.log(JSON.stringify(await createCarrier({viewerSource,viewerRevision,frontend,checks,isoCarrier}),null,2));
}
