import test from 'node:test';
import assert from 'node:assert/strict';
import {strFromU8,strToU8,unzipSync,zipSync} from 'fflate';
import {hashBytes,importPackage,importPackageForReading,type Manifest} from '../src/package';
import {admitDualReadingContentAsync,prepareDualReadingPacket,selectReadingNotation} from '../src/dual-reading-package';
import {PackageAdmissionSession} from '../src/package-admission-session';
import {createFrettedPassageProjection} from '../vendor/iso-notation/src/score-presentation';
import {authoredFrettedInput} from './support/fretted-dual-fixture';

test('cooperative construction and full receiving preserve literal bytes and source-local passage authority',async t=>{
 t.mock.timers.enable({apis:['Date'],now:Date.UTC(2026,9,9)});
 const input=authoredFrettedInput(),sync=await prepareDualReadingPacket(input),stages=new Set<string>(),
  asyncPacket=await prepareDualReadingPacket(input,{budgetMs:1,onCheckpoint:stage=>stages.add(stage)});
 assert.deepEqual(asyncPacket.bytes,sync.bytes);assert.ok(stages.has('layout'));assert.ok(stages.has('commit'));
 const cold=await importPackageForReading(asyncPacket.bytes,{budgetMs:1});
 for(const notation of ['iso','tab'] as const){
  const actual=selectReadingNotation(asyncPacket.package,notation),fresh=selectReadingNotation(cold,notation),scene=actual.reading!.dual!.views[notation].scene;
  assert.deepEqual(actual.pages,fresh.pages);assert.deepEqual(actual.reading,fresh.reading);
  const bar=scene.bars[0];assert.equal(createFrettedPassageProjection(scene,[{writtenBar:bar.writtenBar,dx:0,dy:0}]).separators.length,0);
  assert.throws(()=>createFrettedPassageProjection(structuredClone(scene),[{writtenBar:bar.writtenBar,dx:0,dy:0}]),/actual|local|context|preparation/i);
 }
});

test('async receiver captures all manifest/member data before yielding and never invokes caller authority hooks',async()=>{
 const packet=await prepareDualReadingPacket(authoredFrettedInput()),files=unzipSync(packet.bytes),manifest=JSON.parse(strFromU8(files['manifest.json'])) as Manifest,
  expected=structuredClone(manifest),pending=admitDualReadingContentAsync(manifest,files,{budgetMs:1});
 assert.equal(manifest.reading?.version,'instrument-reading-package-v2');if(manifest.reading?.version!=='instrument-reading-package-v2')throw Error('Expected dual descriptor');
 manifest.scoreId='changed-after-call';manifest.reading.views.tab.engineId='forged' as never;files['score.json'].fill(0);
 const result=await pending;assert.deepEqual(result.manifest,expected);assert.equal(result.score.id,'authored-fretted-dual');
 const originalFiles=unzipSync(packet.bytes);let invoked=0;
 const hookManifest=JSON.parse(strFromU8(originalFiles['manifest.json'])) as Manifest;
 Object.defineProperty(hookManifest,'createdAt',{get(){invoked++;return expected.createdAt;}});
 await assert.rejects(admitDualReadingContentAsync(hookManifest,originalFiles,{}),/accessor authority/);assert.equal(invoked,0);
 const callable=JSON.parse(strFromU8(originalFiles['manifest.json'])) as Manifest;Object.defineProperty(callable,'toJSON',{value:()=>{invoked++;return expected;}});
 await assert.rejects(admitDualReadingContentAsync(callable,originalFiles,{}),/literal data/);assert.equal(invoked,0);
});

test('abort during real cold replay returns no package/cache authority; a rehashed changed SVG still refuses cooperatively',async()=>{
 const packet=await prepareDualReadingPacket(authoredFrettedInput()),controller=new AbortController(),session=new PackageAdmissionSession();
 await assert.rejects(session.import(packet.bytes,{execution:{signal:controller.signal,onCheckpoint:stage=>{if(stage==='placement')controller.abort();}}}),{name:'AbortError'});
 assert.deepEqual(session.retained,{entries:0,bytes:0,pending:0});
 const fresh=await session.import(packet.bytes,{execution:{}});assert.equal(selectReadingNotation(fresh,'tab').pages.length,1);
 const files=unzipSync(packet.bytes),manifest=JSON.parse(strFromU8(files['manifest.json'])) as Manifest;
 if(manifest.reading?.version!=='instrument-reading-package-v2')throw Error('Expected dual descriptor');const name=manifest.reading.views.tab.pages[0];
 files[name]=strToU8(strFromU8(files[name]).replace('<svg','<svg data-forged="true"'));manifest.files[name]=await hashBytes(files[name]);files['manifest.json']=strToU8(JSON.stringify(manifest));
 await assert.rejects(importPackage(zipSync(files),{execution:{budgetMs:1}}),/page differs/);
});

test('only the same producer owner coalesces; clear and aborted wait/hit cannot publish or borrow cancelled work',async()=>{
 const packet=await prepareDualReadingPacket(authoredFrettedInput()),session=new PackageAdmissionSession(),owner=new AbortController();
 let release!:()=>void,entered!:()=>void,first=true;const gate=new Promise<void>(r=>release=r),started=new Promise<void>(r=>entered=r);
 const execution={signal:owner.signal,yieldControl:async()=>{if(first){first=false;entered();await gate;}}};
 const a=session.import(packet.bytes,{execution});await started;
 const b=session.import(packet.bytes,{execution:{signal:owner.signal}});
 await assert.rejects(session.import(packet.bytes,{execution:{signal:new AbortController().signal}}),/busy/);
 const waiting=new AbortController(),idle=session.waitForIdle(waiting.signal);waiting.abort();await assert.rejects(idle,{name:'AbortError'});
 assert.equal(session.retained.pending,1);session.clear();release();const [one,two]=await Promise.all([a,b]);
 assert.deepEqual(one.pages,two.pages);assert.notEqual(one.files['score.json'],two.files['score.json']);assert.equal(session.retained.entries,0);
 await session.import(packet.bytes,{execution:{}});assert.equal(session.retained.entries,1);
 const stopped=new AbortController();stopped.abort();await assert.rejects(session.import(packet.bytes,{execution:{signal:stopped.signal}}),{name:'AbortError'});
 assert.equal(session.retained.entries,1);
 const hitOwner=new AbortController(),hit=session.import(packet.bytes,{execution:{signal:hitOwner.signal}});hitOwner.abort();await assert.rejects(hit,{name:'AbortError'});
 assert.equal(session.retained.entries,1);assert.equal(selectReadingNotation(await session.import(packet.bytes),'tab').pages.length,1);
});
