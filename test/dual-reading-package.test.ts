import test from 'node:test';
import assert from 'node:assert/strict';
import {strFromU8,strToU8,unzipSync,zipSync} from 'fflate';
import {hashBytes,importPackage,type Manifest} from '../src/package';
import {prepareDualReadingPackage,selectReadingNotation} from '../src/dual-reading-package';
import {planManualPractice} from '../src/manual-practice-plan';
import {initialPractice} from '../src/practice';
import {manualPracticeRecord,readManualPractice} from '../src/manual-practice-state';
import {scoreCapabilities} from '../src/score-capabilities';
import {publishPackage,publicationMembers} from '../src/publication';
import {authoredFrettedInput,authoredFrettedPackage} from './support/fretted-dual-fixture';

const bytes=await authoredFrettedPackage(),original=await importPackage(bytes);
async function changed(mutate:(files:Record<string,Uint8Array>,m:Manifest)=>void){
 const files=unzipSync(bytes),m=JSON.parse(strFromU8(files['manifest.json'])) as Manifest;mutate(files,m);
 m.files=Object.fromEntries(await Promise.all(Object.entries(files).filter(([n])=>n!=='manifest.json').map(async([n,b])=>[n,await hashBytes(b)])));
 m.semanticSha256=m.revision=m.files['score.json'];files['manifest.json']=strToU8(JSON.stringify(m));return zipSync(files);
}
test('cold dual admission owns both complete true-source scenes with no physical or family authority',()=>{
 const p=original,dual=p.reading!.dual!;
 assert.equal(p.manifest.reading!.version,'instrument-reading-package-v2');assert.equal(dual.instrumentFamily,'unknown');
 assert.equal(dual.sourcePartId,'P1');assert.equal(dual.sourceStaffId,'1');assert.equal(dual.notation,'iso');
 assert.deepEqual(p.seats,[]);assert.equal(scoreCapabilities(p).manualPractice,true);assert.equal(scoreCapabilities(p).pianoPractice,false);
 for(const view of Object.values(dual.views)){
  assert.equal(view.scene.components.length,23);assert.equal(view.owners.length,20);assert.equal(view.geometryEvidence.ok,true);
  assert.equal(view.scene.components.filter(c=>c.eventKind==='rest').length,2);assert.equal(view.scene.relations.length,5);
  assert.equal(view.scene.bars.length,4);
 }
 assert.notDeepEqual(dual.views.iso.pages,dual.views.tab.pages);
});
test('notation selection retains source/archive identity and the exact manual plan, state and source IDs',async()=>{
 const tab=selectReadingNotation(original,'tab'),iso=selectReadingNotation(tab,'iso'),before=JSON.stringify(original),
  a=await planManualPractice(original,'fixed-four-v1'),b=await planManualPractice(tab,'fixed-four-v1');
 assert.deepEqual(a,b);assert.equal(a.components.length,23);assert.equal(a.components.every(c=>c.provenance.kind==='retained-source-written-component-v1'),true);
 assert.deepEqual(a.components.map(c=>c.id).sort(),original.score.sourceWrittenComponents!.components.map(c=>c.sourceEventId).sort());
 assert.deepEqual(readManualPractice(manualPracticeRecord(a,initialPractice(a)),b),readManualPractice(manualPracticeRecord(a,initialPractice(a)),a));
 assert.equal(tab.manifest,original.manifest);assert.equal(tab.score,original.score);assert.equal(tab.archiveSha256,original.archiveSha256);
 assert.deepEqual(iso.pages,original.pages);assert.equal(JSON.stringify(original),before);
 assert.throws(()=>selectReadingNotation(original,'bad' as never),/Unsupported/);
});
test('dual publication retains every declared view and round-trips without a separate performance edition',async()=>{
 const pub=await publishPackage(selectReadingNotation(original,'tab'));
 assert.deepEqual(pub.excluded,[]);assert.deepEqual([...publicationMembers(original.manifest)].sort(),Object.keys(original.files).filter(n=>n!=='manifest.json').sort());
 assert.deepEqual(pub.package.reading!.dual,original.reading!.dual);assert.equal(pub.package.manifest.revision,original.manifest.revision);
});
test('forged geometry, true-component, owner, source tuning and active page mutations refuse even after rehashing',async()=>{
 for(const name of ['reading/tab/owners.json','reading/tab/scene.json','reading/iso/scene.json','reading/tab/geometry.json']){
  await assert.rejects(importPackage(await changed((files)=>{const value=JSON.parse(strFromU8(files[name]));
   if(Array.isArray(value))value[0].startTick++;
   else if(value.components)value.components[0].tick++;
   else value.ok=false;files[name]=strToU8(JSON.stringify(value));})),/ownership, scene or geometry differs/);
 }
 await assert.rejects(importPackage(await changed(files=>{files['reading/tab/pages/1.svg']=strToU8(strFromU8(files['reading/tab/pages/1.svg']).replace('<svg','<svg data-forged="true"'));})),/page differs/);
 await assert.rejects(importPackage(await changed(files=>{const score=JSON.parse(strFromU8(files['score.json']));score.parts[0].frettedStaves[0].strings[0].openMidi++;files['score.json']=strToU8(JSON.stringify(score));})));
 await assert.rejects(importPackage(await changed((_files,m)=>{(m.reading! as unknown as {instrumentFamily:string}).instrumentFamily='guitar';})),/Unsupported/);
 await assert.rejects(importPackage(await changed((_files,m)=>{if(m.reading?.version==='instrument-reading-package-v2')m.reading.views.tab.pages=m.reading.views.iso.pages;})),/descriptor/);
});
test('dual preparation and manual planning own a whole snapshot before asynchronous hashes settle',async()=>{
 const input=authoredFrettedInput(),pending=prepareDualReadingPackage(input);input.score.id='changed';input.score.timeSignatures[0].numerator=3;input.metadata.title='changed';
 const p=await importPackage(await pending),plan=await planManualPractice(p,'fixed-four-v1'),mutable=structuredClone(p),later=planManualPractice(mutable,'fixed-four-v1');
 mutable.score.id='later';mutable.score.timeSignatures[0].numerator=3;mutable.reading!.dual!.views.iso.scene.components[0].tick++;
 assert.deepEqual(await later,plan);assert.equal(p.score.id,'authored-fretted-dual');
 const bad=structuredClone(p);bad.reading!.dual!.views.iso.scene.components[0].tick++;await assert.rejects(planManualPractice(bad),/appearance|component/);
});
