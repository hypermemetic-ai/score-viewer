import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {brotliCompressSync} from 'node:zlib';
import {prepare} from '../scripts/native-delivery/prepare-score-viewer.mjs';
import {validateCarrierInputs, sha256, canonical, inventory} from '../scripts/native-delivery/score-viewer-carrier-inputs.mjs';
import {workerInputs} from '../scripts/native-delivery/score-viewer-native-worker.mjs';
import {normalizedHtml} from '../scripts/native-delivery/score-viewer-delivery.mjs';
import {publishPair, parseArguments, WORKFLOW} from '../scripts/native-delivery/release-score-viewer.mjs';
const file=async(root,path,bytes)=>{await mkdir(join(root,path,'..'),{recursive:true});await writeFile(join(root,path),bytes);};
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
async function fixture(t) {
  const root=await mkdtemp(join(tmpdir(),'viewer-native-root-')); t.after(()=>rm(root,{recursive:true,force:true}));
  const source=join(root,'source');await mkdir(source);
  for(const [path,bytes]of Object.entries({
    'src-tauri/Cargo.toml':'[package]\nname="iso-score-viewer"\nversion="0.1.0"\n',
    'src-tauri/tauri.conf.json':JSON.stringify({version:'0.1.0',identifier:'dev.qqp.iso-score-viewer',productName:'ISO Score Viewer'}),
    'package.json':'{"version":"0.1.0"}', 'package-lock.json':'{"packages":{}}',
    '.gitignore':'dist/\nbuild/\n',
    'delivery-input/frontend/index.html':'<!DOCTYPE html><html></html>',
    'delivery-input/frontend/worker.js':'self.postMessage(1)',
    'sample.isoscore':'fixture score',
  }))await file(source,path,bytes);
  const nativeFiles=Object.fromEntries((await Promise.all(['src-tauri/Cargo.toml','src-tauri/tauri.conf.json','package.json','package-lock.json'].map(async path=>{const b=await readFile(join(source,path));return[path,{sha256:sha256(b),size:b.length}];}))).sort(([a],[b])=>a.localeCompare(b)));
  const files=await inventory(join(source,'delivery-input/frontend')),digest=sha256(canonical(files));
  const checks={schema:1,viewerRevision:'a'.repeat(40),notationRevision:'b'.repeat(40),frontendDigest:digest,checks:Object.fromEntries(['tests','build','browserInspection','independentReview'].map(name=>[name,{status:'passed',fixture:true}]))};
  const checksBytes=Buffer.from(JSON.stringify(checks));await file(source,'delivery-input/checks.json',checksBytes);
  const inputs={schema:1,version:'0.1.0',viewer:{repository:'hypermemetic-ai/score-viewer',revision:checks.viewerRevision,tree:'c'.repeat(40),timestamp:'2026-10-14T00:00:00Z'},notation:{repository:'hypermemetic-ai/iso-notation',revision:checks.notationRevision},nativeFiles,frontend:{files,digest},checks:{sha256:sha256(checksBytes),size:checksBytes.length}};
  await file(source,'delivery-input/inputs.json',JSON.stringify(inputs));
  git(source,'init','-q');git(source,'add','.');git(source,'-c','user.name=fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture');
  return{root,source,inputs,revision:git(source,'rev-parse','HEAD')};
}
test('root preparation and worker admission retain separate delivery/runtime identities without a private checkout',async t=>{
  const f=await fixture(t),prepared=join(f.root,'prepared'),calls=[];
  const manifest=await prepare({source:f.source,output:prepared,scorePath:'sample.isoscore',scoreHash:sha256(Buffer.from('fixture score')),expectedRevision:f.revision,execute:async(program,args)=>{
    calls.push({program,args});if(program==='cargo')return;
    const bytes=await readFile(args[0]);await writeFile(args[1],brotliCompressSync(args.includes('normalize-html')?normalizedHtml(bytes):bytes));
  }});
  assert.equal(manifest.identity.sourceRevision,f.revision);
  assert.equal(manifest.identity.sourceInputs.viewerRevision,f.inputs.viewer.revision);
  assert.match(calls[0].args.join(' '),/scripts\/native-delivery\/score-viewer-asset-probe\/Cargo.toml/);
  assert.equal(calls.some(c=>c.program==='npm'),false);
  const prior=process.env.CARGO_INCREMENTAL;process.env.CARGO_INCREMENTAL='1';t.after(()=>{if(prior===undefined)delete process.env.CARGO_INCREMENTAL;else process.env.CARGO_INCREMENTAL=prior;});
  const ctx=await workerInputs('windows-x64',[f.source,prepared,join(f.root,'worker')]);
  assert.equal(ctx.viewer,f.source);
  assert.deepEqual(await readFile(join(f.source,'dist/worker.js')),await readFile(join(prepared,'frontend/worker.js')));
  const config=JSON.parse(await readFile(ctx.preparedConfig));assert.equal(config.build.frontendDist,'../dist');assert.equal(config.build.beforeBuildCommand,'');
});
test('root input admission refuses changed native source, frontend, receipt, and local dependency gaps',async t=>{
  const f=await fixture(t);await validateCarrierInputs(f.source);
  for(const path of ['src-tauri/Cargo.toml','delivery-input/frontend/worker.js','delivery-input/checks.json']) {
    const original=await readFile(join(f.source,path));await writeFile(join(f.source,path),'changed');
    await assert.rejects(validateCarrierInputs(f.source));await writeFile(join(f.source,path),original);
  }
  const path=join(f.source,'package.json'),original=await readFile(path);
  await writeFile(path,JSON.stringify({version:'0.1.0',dependencies:{missing:'file:vendor/missing.tgz'}}));
  await assert.rejects(validateCarrierInputs(f.source),/declaration\/lock differs/);await writeFile(path,original);
});
test('public workflow has only the viewer checkout and locked public dependency installation',async()=>{
  const workflow=await readFile(new URL('../.github/workflows/build-score-viewer-native.yml',import.meta.url),'utf8');
  assert.equal(WORKFLOW,'build-score-viewer-native.yml');
  assert.doesNotMatch(workflow,/submodules:|secrets\.|repository:|score-viewer\/package|npm run build|push:/);
  assert.equal((workflow.match(/npm ci --ignore-scripts/g)||[]).length,4);
  assert.match(workflow,/needs: \[prepare, windows-x64, mac-universal\]/);
  assert.match(workflow,/runs-on: windows-2022/);assert.match(workflow,/runs-on: macos-15/);
  assert.match(workflow,/contents: read/);
});
async function publicationFixture(t) {
  const root=await mkdtemp(join(tmpdir(),'viewer-delivery-migration-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const before='d'.repeat(40),after='e'.repeat(40),artifact=join(root,'artifact'),output=join(root,'published');
  const identity=(revision,viewerRevision)=>({releaseId:'0.1.0-'+revision,sourceRevision:revision,sourceTimestamp:'2026-10-14T00:00:00Z',version:'0.1.0',sourceInputs:{viewerRepository:'hypermemetic-ai/score-viewer',viewerRevision}});
  const pin={sha256:'f'.repeat(64),size:1};
  const previous={identity:identity(before,'a'.repeat(40)),files:{'packages/Windows.zip':pin,'packages/Mac.zip':pin}};
  const next={identity:identity(after,'b'.repeat(40)),files:previous.files};
  await file(output,'releases/'+previous.identity.releaseId+'/release.json',JSON.stringify(previous));
  await file(artifact,'release.json',JSON.stringify(next));
  const current={schema:1,identity:previous.identity,downloads:Object.fromEntries([['windows','Windows.zip'],['mac','Mac.zip']].map(([platform,name])=>[platform,{...pin,href:'releases/'+previous.identity.releaseId+'/packages/'+name}]))};
  await file(output,'current.json',JSON.stringify(current));
  const validate=async path=>JSON.parse(await readFile(join(path,'release.json')));
  return{root,before,after,artifact,output,previous,next,current,validate};
}
test('explicit repository migration verifies prior pair and viewer ancestry without comparing unrelated carrier histories',async t=>{
  const f=await publicationFixture(t),calls=[];
  const result=await publishPair(f.artifact,f.output,{expectedRevision:f.after,validate:f.validate,compareRevisions:()=>{throw Error('must not compare unrelated repos')},migration:{fromRevision:f.before,compareViewerRevisions:async(a,b)=>{calls.push([a,b]);return true;}}});
  assert.deepEqual(calls,[['a'.repeat(40),'b'.repeat(40)]]);assert.equal(result.identity.sourceInputs.viewerRevision,'b'.repeat(40));
  assert.equal(parseArguments(['--output','out','--migrate-from-iso-carrier',f.before]).migrateFromIsoCarrier,f.before);
});
test('migration refuses unordered viewer sources or a substituted current download and preserves the pointer',async t=>{
  const f=await publicationFixture(t),original=await readFile(join(f.output,'current.json'));
  await assert.rejects(publishPair(f.artifact,f.output,{validate:f.validate,migration:{fromRevision:f.before,compareViewerRevisions:async()=>false}}),/ancestry/);
  assert.deepEqual(await readFile(join(f.output,'current.json')),original);
  f.current.downloads.windows.sha256='0'.repeat(64);await file(f.output,'current.json',JSON.stringify(f.current));
  await assert.rejects(publishPair(f.artifact,f.output,{validate:f.validate,migration:{fromRevision:f.before,compareViewerRevisions:async()=>true}}),/differs from its verified pair/);
});

test('a different migration pin cannot bypass normal delivery ancestry',async t=>{
  const f=await publicationFixture(t),calls=[];
  await assert.rejects(publishPair(f.artifact,f.output,{validate:f.validate,compareRevisions:async(a,b)=>{calls.push([a,b]);return false;},migration:{fromRevision:'9'.repeat(40),compareViewerRevisions:()=>{throw Error('must not migrate another source');}}}),/does not descend/);
  assert.deepEqual(calls,[[f.before,f.after]]);
  assert.equal(JSON.parse(await readFile(join(f.output,'current.json'))).identity.sourceRevision,f.before);
});
test('normal viewer delivery continues to enforce delivery-commit ancestry',async t=>{
  const f=await publicationFixture(t),calls=[];
  const result=await publishPair(f.artifact,f.output,{validate:f.validate,compareRevisions:async(a,b)=>{calls.push([a,b]);return true;}});
  assert.deepEqual(calls,[[f.before,f.after]]);assert.equal(result.identity.sourceRevision,f.after);
});
