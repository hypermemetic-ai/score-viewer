#!/usr/bin/env node
import {execFileSync} from 'node:child_process';
import {cp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {resolve, join, relative, isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {unzipSync, strFromU8} from 'fflate';
import {converterResourceMap} from './score-viewer-converter-release.mjs';
import {inventory, sha256, canonical, safePath, validateRecordedChecks, validateCarrierInputs, validateLockedLocalDependencies} from './score-viewer-carrier-inputs.mjs';
import {semanticHash,footerProbeVersion,footerMetricsSha256} from './footer-ink-receipt.mjs';
import {validatePianoSources} from './score-viewer-piano-release.mjs';
const footerNotice='LiberationSerif-Italic-NOTICE.txt';
function git(source,args,binary=false) {return execFileSync('git',args,{cwd:source,encoding:binary?undefined:'utf8',maxBuffer:32*1024*1024});}
function inside(parent,path) {const rel=relative(parent,path);return !rel||(!rel.startsWith('..'+(process.platform==='win32'?'\\':'/'))&&rel!=='..'&&!isAbsolute(rel));}
/** Freeze a NEW reviewed application identity. Nothing in the checkout is changed. */
export async function freezeInputs({viewerSource,viewerRevision,frontend,checks,output}) {
  viewerSource=resolve(viewerSource);frontend=resolve(frontend);checks=resolve(checks);output=resolve(output);
  if(!/^[a-f0-9]{40}$/.test(viewerRevision))throw Error('An exact reviewed viewer revision is required');
  if(inside(viewerSource,output)||inside(frontend,output)||inside(output,viewerSource)||inside(output,frontend))throw Error('Output must be separate from the source and frontend directories');
  if(git(viewerSource,['status','--porcelain','--untracked-files=all']).trim())throw Error('Viewer checkout must be clean before freezing release inputs');
  if(git(viewerSource,['rev-parse','HEAD']).trim()!==viewerRevision)throw Error('Viewer checkout differs from reviewed revision');
  const provenance=JSON.parse(git(viewerSource,['show',`${viewerRevision}:docs/source-provenance.json`]));
  const notationRevision=provenance.dependencyRevision;
  const gitlink=git(viewerSource,['ls-tree',viewerRevision,'vendor/iso-notation']).trim();
  if (!/^[a-f0-9]{40}$/.test(notationRevision) || gitlink.split(/\s+/)[2] !== notationRevision || !gitlink.startsWith('160000 commit ')) throw Error('Viewer notation gitlink/provenance disagree');
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
  // Windows checkouts convert text newlines; every sealed native file must keep its exact bytes.
  const converted=git(viewerSource,['check-attr','--source',viewerRevision,'text','--',...Object.keys(inputs.nativeFiles)]).trim().split('\n').filter(line=>!line.endsWith(': text: unset'));
  if(converted.length)throw Error('Native inputs lack -text in .gitattributes: '+converted.map(line=>line.slice(0,line.lastIndexOf(': text:'))).join(', '));
  const newFooterNotice=!!inputs.nativeFiles['licenses/'+footerNotice];
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
    for(const name of ['footer-ink-probe.swift','footer-ink-probe.mjs','footer-ink-receipt.mjs']){const bytes=git(viewerSource,['show',`${viewerRevision}:scripts/native-delivery/${name}`],true);
      inputs.runtimeFontProbe.files['scripts/native-delivery/'+name]={sha256:sha256(bytes),size:bytes.length};}
    const notice=inputs.nativeFiles['licenses/'+footerNotice];
    if(!Object.entries(frontendFiles).some(([path,p])=>path.endsWith('.txt')&&p.sha256===notice.sha256&&p.size===notice.size)||
      !Object.entries(frontendFiles).some(([path,p])=>path.endsWith('.ttf')&&p.sha256==='eaeaf7f2b12544ecde64290c1fa7ec403ff70fd58b313637b265400b20249242'&&p.size===375760))
      throw Error('Frontend lacks the exact measured footer face and complete accessible notice');
  }
  const converterResources=converterResourceMap(frontendFiles);
  let converterHelper;
  if(Object.keys(converterResources).length){
    converterHelper=git(viewerSource,['show',`${viewerRevision}:scripts/native-delivery/score-viewer-converter-release.mjs`],true);
    inputs.converterNoticeHelper={path:'scripts/native-delivery/score-viewer-converter-release.mjs',sha256:sha256(converterHelper),size:converterHelper.length};
  }
  // The source/check evidence is complete before creating any output. mkdir
  // deliberately rejects an existing destination; failure removes only our new directory.
  await mkdir(output);
  try {
    await cp(frontend,join(output,'frontend'),{recursive:true,errorOnExist:true,force:false});
    await writeFile(join(output,'checks.json'),checksBytes,{flag:'wx'});
    await writeFile(join(output,'inputs.json'),JSON.stringify(inputs,null,2)+'\n',{flag:'wx'});
    await writeFile(join(output,'README.md'),`# Frozen viewer native inputs\n\nApplication ${viewerRevision}, notation ${notationRevision}. The source receipt and exact frontend were supplied by the reviewer. Native inputs and runtime proof bindings are derived from that application commit. The later delivery commit adds this seal without relabelling the application source.\n`,{flag:'wx'});
    const verified=await validateCarrierInputs(viewerSource,{inputDirectory:output,expectedViewerRevision:viewerRevision,expectedNotationRevision:notationRevision});
    return {output,sourceInputs:verified.sourceInputs};
  } catch(error) {await rm(output,{recursive:true,force:true});throw error;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const [viewerSource,viewerRevision,frontend,checks,output]=process.argv.slice(2);
  if(!output)throw Error('Usage: node scripts/native-delivery/freeze-inputs.mjs <clean-viewer> <reviewed-app-SHA> <new-frontend> <new-check-receipt> <new-output-directory>');
  console.log(JSON.stringify(await freezeInputs({viewerSource,viewerRevision,frontend,checks,output}),null,2));
}
