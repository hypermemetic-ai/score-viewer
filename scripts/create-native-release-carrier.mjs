#!/usr/bin/env node
import {converterResourceMap} from './native-release-carrier/score-viewer-converter-release.mjs';
import {execFileSync} from 'node:child_process';
import {cp, mkdir, readFile, rm, writeFile, chmod} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {inventory, sha256, canonical, safePath, validateRecordedChecks, validateCarrierInputs, validateLockedLocalDependencies} from './native-release-carrier/inputs.mjs';
import {unzipSync,strFromU8} from 'fflate';
import {semanticHash,footerProbeVersion,footerMetricsSha256} from './native-release-carrier/footer-ink-receipt.mjs';
import {validatePianoSources} from './native-release-carrier/score-viewer-piano-release.mjs';

const footerNotice='LiberationSerif-Italic-NOTICE.txt';
const oldFontNotices="['URW-base35-provenance.md','URW-base35-LICENSE','URW-base35-COPYING','OFL-Bravura.txt']";
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
  const lock=JSON.parse(git(viewerSource,['show',`${viewerRevision}:package-lock.json`]));
  const localFiles=await validateLockedLocalDependencies(pkg,lock,path=>{
    const record=git(viewerSource,['ls-tree',viewerRevision,'--',path]).trim();
    if(!/^100(?:644|755) blob /.test(record)||record.split('\t')[1]!==path)throw Error('Required locked local dependency is not a tracked regular file: '+path);
    return git(viewerSource,['show',`${viewerRevision}:${path}`],true);
  },frontendFiles,path=>readFile(join(frontend,path)));
  const selected=git(viewerSource,['ls-tree','-r','--format=%(objectmode) %(path)',viewerRevision,'src-tauri','licenses','.cargo/config.toml','package.json','package-lock.json']).trim().split('\n').map(line=>{const space=line.indexOf(' ');return {mode:line.slice(0,space),path:safePath(line.slice(space+1))};});
  for(const path of localFiles.keys())selected.push({mode:git(viewerSource,['ls-tree',viewerRevision,'--',path]).slice(0,6),path});
  for(const file of selected) {
    if(!['100644','100755'].includes(file.mode))throw Error(`Unsupported native input mode: ${file.path}`);
    const bytes=git(viewerSource,['show',`${viewerRevision}:${file.path}`],true);
    if(!bytes.length)throw Error(`Empty native input: ${file.path}`);
    inputs.nativeFiles[file.path]={sha256:sha256(bytes),size:bytes.length};
  }
  inputs.nativeFiles=Object.fromEntries(Object.entries(inputs.nativeFiles).sort(([a],[b])=>a.localeCompare(b)));
  await validatePianoSources(viewerSource, inputs.nativeFiles);
  const newFooterNotice=!!inputs.nativeFiles['licenses/'+footerNotice],noticeMirrors=[];
  // Every prior root notice must already match. Only the one explicitly
  // reviewed additive notice can be newly mirrored; no old input is replaced.
  for(const file of selected.filter(f=>f.path.startsWith('licenses/'))){
    const bytes=git(viewerSource,['show',`${viewerRevision}:${file.path}`],true);
    try{if(!(await readFile(join(isoCarrier,file.path))).equals(bytes))throw Error('Shared/native notice conflict: '+file.path);}
    catch(error){if(error.code!=='ENOENT'||file.path!=='licenses/'+footerNotice)throw error;noticeMirrors.push({path:file.path,bytes});}
  }
  if(newFooterNotice){
    const policy=JSON.parse(git(viewerSource,['show',`${viewerRevision}:src/footer-ink-policy.json`])),fixtureBytes=git(viewerSource,['show',`${viewerRevision}:fixtures/authored-calculated-preparation-v2.tuna`],true),
      fixtureFiles=unzipSync(fixtureBytes),fm=JSON.parse(strFromU8(fixtureFiles['manifest.json'])),source=fixtureFiles[fm.sourceScore];
    const fixturePath=Object.keys(frontendFiles).filter(p=>frontendFiles[p].sha256===sha256(fixtureBytes));
    if(fixturePath.length!==1||!frontendFiles['footer-ink-probe.html']||sha256(fixtureBytes)!=='ece4c99bf27f179f7fb1adecba71795150df318edaa51a9f721cb09b2b33d9b1')
      throw Error('Frontend lacks exact public footer/ordinary-worker probe fixture');
    const metricDeclaration=git(viewerSource,['show',`${viewerRevision}:src/footer-font-data.ts`]).match(/^export const FOOTER_METRICS_JSON=(.+);$/m);
    const metricsLiteral=metricDeclaration?JSON.parse(metricDeclaration[1]):undefined;
    if(typeof metricsLiteral!=='string'||sha256(Buffer.from(metricsLiteral))!==footerMetricsSha256||policy.footer.metricsSha256!==footerMetricsSha256)throw Error('Reviewed exact footer metric literal differs');
    inputs.runtimeFontProbe={version:footerProbeVersion,policySha256:semanticHash(policy),metricsLiteral,fixture:{path:fixturePath[0],sha256:sha256(fixtureBytes),size:fixtureBytes.length,
      sourceSha256:sha256(source),ownerCount:JSON.parse(strFromU8(source)).notes.length},files:{}};
    for(const name of ['footer-ink-probe.swift','footer-ink-probe.mjs','footer-ink-receipt.mjs']){const bytes=git(viewerSource,['show',`${viewerRevision}:scripts/native-release-carrier/${name}`],true);
      inputs.runtimeFontProbe.files['scripts/'+name]={sha256:sha256(bytes),size:bytes.length};}
    const notice=inputs.nativeFiles['licenses/'+footerNotice];
    if(!Object.entries(frontendFiles).some(([path,p])=>path.endsWith('.txt')&&p.sha256===notice.sha256&&p.size===notice.size)||
      !Object.entries(frontendFiles).some(([path,p])=>path.endsWith('.ttf')&&p.sha256==='eaeaf7f2b12544ecde64290c1fa7ec403ff70fd58b313637b265400b20249242'&&p.size===375760))
      throw Error('Frontend lacks the exact measured footer face and complete accessible notice');
  }
  const converterResources=converterResourceMap(frontendFiles);
  let converterHelper;
  if(Object.keys(converterResources).length){
    converterHelper=git(viewerSource,['show',`${viewerRevision}:scripts/native-release-carrier/score-viewer-converter-release.mjs`],true);
    inputs.converterNoticeHelper={path:'scripts/score-viewer-converter-release.mjs',sha256:sha256(converterHelper),size:converterHelper.length};
  }
  // Validate all adapters before any carrier mutation. The source commit stays
  // untouched; only the task-owned clean, isolated carrier worktree is written.
  let delivery=await readFile(join(isoCarrier,'scripts','score-viewer-delivery.mjs'),'utf8');
  delivery=replaceOnce(delivery,"import {brotliDecompressSync} from 'node:zlib';","import {brotliDecompressSync} from 'node:zlib';\nimport {validateSourceIdentity,validatePreparedCarrier,validateRecipientCarrier,validatePianoNativeChecks} from './score-viewer-carrier-inputs.mjs';",'delivery import');
  delivery=replaceOnce(delivery,"export function validateIdentity(identity) {","export function validateIdentity(identity) {\n  if(identity?.sourceInputs)validateSourceIdentity(identity.sourceInputs);",'delivery identity');
  delivery=replaceOnce(delivery,"  validateIdentity(manifest.identity);","  validateIdentity(manifest.identity);\n  if(!manifest.identity.sourceInputs)fail('Reviewed viewer/notation carrier identity missing');\n  await validatePreparedCarrier(root,manifest.identity);",'prepared verification');
  delivery=replaceOnce(delivery,"{sourceRevision:manifest.identity.sourceRevision,version:manifest.identity.version,score:manifest.identity.score}","{sourceRevision:manifest.identity.sourceRevision,version:manifest.identity.version,score:manifest.identity.score,sourceInputs:manifest.identity.sourceInputs}",'embedded identity');
  delivery=replaceOnce(delivery,"  const binaryPath=platform==='windows-x64'?'iso-score-viewer.exe':'ISO Score Viewer.app/Contents/MacOS/iso-score-viewer';","  await validateRecipientCarrier(files,prepared);\n  const binaryPath=platform==='windows-x64'?'iso-score-viewer.exe':'ISO Score Viewer.app/Contents/MacOS/iso-score-viewer';",'worker recipient evidence');
  delivery=replaceOnce(delivery,"    const binary=files[platform==='windows-x64'?'iso-score-viewer.exe':'ISO Score Viewer.app/Contents/MacOS/iso-score-viewer'];","    await validateRecipientCarrier(files,prepared);\n    const binary=files[platform==='windows-x64'?'iso-score-viewer.exe':'ISO Score Viewer.app/Contents/MacOS/iso-score-viewer'];",'paired recipient evidence');
  delivery=replaceOnce(delivery,"\n  if(receipt.nativeChecks?.tests!=='passed'","\n  await validatePianoNativeChecks(receipt,prepared,files);\n  if(receipt.nativeChecks?.tests!=='passed'",'worker engine checks');
  delivery=replaceOnce(delivery,"\n    if(receipt.nativeChecks?.tests!=='passed'","\n    await validatePianoNativeChecks(receipt,prepared,files);\n    if(receipt.nativeChecks?.tests!=='passed'",'pair engine checks');
  let worker=await readFile(join(isoCarrier,'scripts','score-viewer-native-worker.mjs'),'utf8');
  worker=replaceOnce(worker,"import {performance} from 'node:perf_hooks';","import {performance} from 'node:perf_hooks';\nimport {validateCarrierInputs} from './score-viewer-carrier-inputs.mjs';\nimport {packagePianoNotices,addPianoWorkerChecks} from './score-viewer-piano-release.mjs';",'worker import');
  worker=replaceOnce(worker,"  const manifest=await validatePrepared(prepared,{expectedRevision:git('rev-parse','HEAD')});","  const manifest=await validatePrepared(prepared,{expectedRevision:git('rev-parse','HEAD')});\n  const verified=await validateCarrierInputs(source);\n  if(JSON.stringify(verified.sourceInputs)!==JSON.stringify(manifest.identity.sourceInputs))throw Error('Worker viewer/notation inputs differ from preparation');",'worker input verification');
  worker=replaceOnce(worker,"  await cp(join(ctx.prepared,'Schumann-No14.isoscore'),join(packet,'Schumann-No14.isoscore'));","  await cp(join(ctx.prepared,'Schumann-No14.isoscore'),join(packet,'Schumann-No14.isoscore'));\n  await cp(join(ctx.prepared,'source-inputs.json'),join(packet,'Source-provenance.json'));\n  await cp(join(ctx.prepared,'source-checks.json'),join(packet,'Source-validation.json'));\n  await cp(join(ctx.prepared,'frontend','release-identity.json'),join(packet,'Release-identity.json'));",'recipient provenance');
  worker=replaceOnce(worker,"export async function notices(source,viewer,packet,targetTriple) {","export async function notices(source,viewer,packet,targetTriple) {\n  const pianoEngine=await packagePianoNotices(source,viewer,packet);",'piano notice packaging');
  worker=replaceOnce(worker,"{manifestSha256:sha256(await readFile(join(viewer,'src-tauri','Cargo.toml')))","{pianoEngine,manifestSha256:sha256(await readFile(join(viewer,'src-tauri','Cargo.toml')))",'piano dependency identity');
  worker=replaceOnce(worker,"  const hashes=await inventory(packet);","  ({nativeChecks,details}=await addPianoWorkerChecks(ctx.source,ctx.viewer,packet,nativeChecks,details,platform,binary));\n  const hashes=await inventory(packet);",'piano worker evidence');
  if(newFooterNotice){
    worker=replaceOnce(worker,oldFontNotices,oldFontNotices.slice(0,-1)+",'"+footerNotice+"']",'footer notice copy list');
    worker=replaceOnce(worker,"await writeJson(preparedConfig,{build:{beforeBuildCommand:'',frontendDist:'../dist'}});",
      "await writeJson(preparedConfig,{build:{beforeBuildCommand:'',frontendDist:'../dist'},bundle:{resources:{'../licenses/"+footerNotice+"':'notices/"+footerNotice+"'}}});",'footer generated resource map');
  }
  if(Object.keys(converterResources).length){
    worker=replaceOnce(worker,"import {performance} from 'node:perf_hooks';","import {performance} from 'node:perf_hooks';\nimport {packageConverterNotices} from './score-viewer-converter-release.mjs';",'converter notice packaging import');
    worker=replaceOnce(worker,"export async function notices(source,viewer,packet,targetTriple) {","export async function notices(source,viewer,packet,targetTriple) {\n  await packageConverterNotices(source,packet);",'converter packet source packaging');
    const resources={...converterResources,...(newFooterNotice?{['../licenses/'+footerNotice]:'notices/'+footerNotice}:{})};
    const oldConfig=newFooterNotice?"await writeJson(preparedConfig,{build:{beforeBuildCommand:'',frontendDist:'../dist'},bundle:{resources:{'../licenses/"+footerNotice+"':'notices/"+footerNotice+"'}}});":"await writeJson(preparedConfig,{build:{beforeBuildCommand:'',frontendDist:'../dist'}});";
    worker=replaceOnce(worker,oldConfig,"await writeJson(preparedConfig,{build:{beforeBuildCommand:'',frontendDist:'../dist'},bundle:{resources:"+JSON.stringify(resources)+"}});",'converter additive Mac resource map');
  }
  let macWorker=await readFile(join(isoCarrier,'scripts','build-score-viewer-macos.mjs'),'utf8');
  macWorker=replaceOnce(macWorker,"import {performance} from 'node:perf_hooks';","import {performance} from 'node:perf_hooks';\nimport {verifyBundledPianoNotices,runMacPianoDiagnostic} from './score-viewer-piano-release.mjs';",'Mac piano resource import');
  macWorker=replaceOnce(macWorker,"await ctx.stage('nativeBuildMs'","await runMacPianoDiagnostic(ctx,packet,host,nativeReleaseCargoArgs,env);\nawait ctx.stage('nativeBuildMs'",'Mac initialized audio diagnostic');
  macWorker=replaceOnce(macWorker,"const bundledNoticeHashes={};","const bundledNoticeHashes=await verifyBundledPianoNotices(stage,viewer,join(app,'Contents','Resources'));",'Mac piano resource verification');
  if(newFooterNotice){
    macWorker=replaceOnce(macWorker,"import {performance} from 'node:perf_hooks';","import {performance} from 'node:perf_hooks';\nimport {runFooterInkProbe} from './footer-ink-probe.mjs';",'Mac actual WebKit font import');
    macWorker=replaceOnce(macWorker,"const packet = await mkdtemp(join(tmpdir(),'iso-mac-recipient-'));","const packet = await mkdtemp(join(tmpdir(),'iso-mac-recipient-'));\nconst footerInk=await runFooterInkProbe(ctx,packet);",'Mac early bounded WebKit font check');
    macWorker=replaceOnce(macWorker,"{tests:'passed',virtualMidi:'passed',signatures:'passed',resources:'passed'","{footerInk,tests:'passed',virtualMidi:'passed',signatures:'passed',resources:'passed'",'Mac required font receipt');
  }
  if(Object.keys(converterResources).length){
    macWorker=replaceOnce(macWorker,"import {performance} from 'node:perf_hooks';","import {performance} from 'node:perf_hooks';\nimport {verifyBundledConverterNotices} from './score-viewer-converter-release.mjs';",'Mac converter notice import');
    macWorker=replaceOnce(macWorker,"const bundledNoticeHashes=await verifyBundledPianoNotices(stage,viewer,join(app,'Contents','Resources'));","const bundledNoticeHashes={...await verifyBundledPianoNotices(stage,viewer,join(app,'Contents','Resources')),...await verifyBundledConverterNotices(stage,join(app,'Contents','Resources'))};",'Mac converter actual resource verification');
  }
  if(newFooterNotice)macWorker=replaceOnce(macWorker,oldFontNotices,oldFontNotices.slice(0,-1)+",'"+footerNotice+"']",'Mac footer resource verification list');
  let attributes='';
  try {attributes=await readFile(join(isoCarrier,'.gitattributes'),'utf8');} catch(error) {if(error.code!=='ENOENT')throw error;}
  if(attributes && !attributes.endsWith('\n'))attributes+='\n';
  // Preserve literal Git object bytes across Windows core.autocrlf checkout.
  // The shared font notices must match their copied native counterparts too.
  attributes+='\n# Exact reviewed native and frozen frontend release bytes\ndelivery-input/** -text\n"scripts/score-viewer-converter-release.mjs" -text\n';
  if(newFooterNotice)for(const name of ['footer-ink-probe.swift','footer-ink-probe.mjs','footer-ink-receipt.mjs'])
    attributes+=`${JSON.stringify('scripts/'+name)} -text\n`;
  for(const file of selected) {
    attributes+=`${JSON.stringify(`score-viewer/${file.path}`)} -text\n`;
    if(file.path.startsWith('licenses/'))attributes+=`${JSON.stringify(file.path)} -text\n`;
  }
  for(const mirror of noticeMirrors){await mkdir(resolve(join(isoCarrier,mirror.path),'..'),{recursive:true});
    await writeFile(join(isoCarrier,mirror.path),mirror.bytes,{flag:'wx'});}
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
  await writeFile(join(isoCarrier,'scripts','footer-ink-receipt.mjs'),newFooterNotice?git(viewerSource,['show',`${viewerRevision}:scripts/native-release-carrier/footer-ink-receipt.mjs`],true):await readFile(join(templates,'footer-ink-receipt.mjs')));
  if(newFooterNotice)for(const name of ['footer-ink-probe.swift','footer-ink-probe.mjs'])
    await writeFile(join(isoCarrier,'scripts',name),git(viewerSource,['show',`${viewerRevision}:scripts/native-release-carrier/${name}`],true));
  await writeFile(join(isoCarrier,'scripts','score-viewer-converter-release.mjs'),converterHelper??await readFile(join(templates,'score-viewer-converter-release.mjs')));
  await cp(join(templates,'inputs.mjs'),join(isoCarrier,'scripts','score-viewer-carrier-inputs.mjs'));
  await cp(join(templates,'score-viewer-piano-release.mjs'),join(isoCarrier,'scripts','score-viewer-piano-release.mjs'));
  await cp(join(templates,'prepare-score-viewer.mjs'),join(isoCarrier,'scripts','prepare-score-viewer.mjs'));
  await writeFile(join(isoCarrier,'scripts','score-viewer-delivery.mjs'),delivery);
  await writeFile(join(isoCarrier,'scripts','score-viewer-native-worker.mjs'),worker);
  await writeFile(join(isoCarrier,'scripts','build-score-viewer-macos.mjs'),macWorker);
  await writeFile(join(isoCarrier,'.gitattributes'),attributes);
  await writeFile(join(isoCarrier,'delivery-input','README.md'),`# Frozen native release inputs\n\nThis isolated delivery carrier builds reviewed viewer ${viewerRevision} with notation ${notationRevision}. Application source ownership remains in hypermemetic-ai/score-viewer. The legacy ISO viewer TypeScript is not built. The shared frontend was checked and built once before freezing; native preparation verifies its inventory and source-check receipt, adds an embedded release identity, and generates every payload probe.\n\nThe unchanged paired workflow selects this carrier commit for checkout. Its packages identify that carrier plus the independently bound viewer and notation revisions. Native Windows tests, Mac tests/virtual MIDI/signatures/deployment/DMG/launch checks, both-slice embedded proof and paired publication remain required. No recipient installation or data changes occur from building this carrier.\n`);
  const verified=await validateCarrierInputs(isoCarrier,{expectedViewerRevision:viewerRevision,expectedNotationRevision:notationRevision});
  return {viewerRevision,notationRevision,frontendDigest,sourceInputs:verified.sourceInputs,carrierWorktree:isoCarrier};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [viewerSource,viewerRevision,frontend,checks,isoCarrier]=process.argv.slice(2);
  if(!isoCarrier)throw Error('Usage: node scripts/create-native-release-carrier.mjs <clean-viewer> <reviewed-viewer-SHA> <frozen-dist> <reviewed-check-receipt> <clean-isolated-ISO-at-notation-pin>');
  console.log(JSON.stringify(await createCarrier({viewerSource,viewerRevision,frontend,checks,isoCarrier}),null,2));
}
