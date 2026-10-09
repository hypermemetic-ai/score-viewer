import test from 'node:test';
import assert from 'node:assert/strict';
import {strFromU8,strToU8,unzipSync,zipSync} from 'fflate';
import {hashBytes,importPackage,admittedDualArchiveSha256,type Manifest} from '../src/package';
import {admitDualReadingContent,prepareDualReadingPackage,prepareDualReadingPacket,selectReadingNotation} from '../src/dual-reading-package';
import {planManualPractice} from '../src/manual-practice-plan';
import {initialPractice} from '../src/practice';
import {manualPracticeRecord,readManualPractice} from '../src/manual-practice-state';
import {scoreCapabilities} from '../src/score-capabilities';
import {publishPackage,publicationMembers} from '../src/publication';
import {authoredFrettedInput,authoredFrettedPackage} from './support/fretted-dual-fixture';
import {PackageAdmissionSession} from '../src/package-admission-session';
import {ManualReadingContext} from '../src/manual-reading-context';

const bytes=await authoredFrettedPackage(),original=await importPackage(bytes);
async function changed(mutate:(files:Record<string,Uint8Array>,m:Manifest)=>void,source=bytes){
 const files=unzipSync(source),m=JSON.parse(strFromU8(files['manifest.json'])) as Manifest;mutate(files,m);
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
test('admitted source and view data are immutable and caller hooks cannot mint selectable ink',async()=>{
 const p=await importPackage(bytes),retained=p.reading;let called=0;
 assert.throws(()=>{p.reading!.dual!.views.tab.pages[0]='<svg xmlns="http://www.w3.org/2000/svg" data-unreplayed="true"></svg>';},TypeError);
 assert.throws(()=>Object.defineProperty(p.reading!,'toJSON',{value:()=>{called++;return retained;}}),TypeError);
 assert.throws(()=>Object.defineProperty(p.reading!.dual!.views.tab,'pages',{get:()=>{called++;return [];}}),TypeError);
 assert.equal(called,0);assert.deepEqual(selectReadingNotation(p,'tab').pages,retained!.dual!.views.tab.pages);
 const forged=structuredClone(p);forged.reading!.dual!.views.tab.pages[0]='<svg data-unreplayed="true"/>';
 Object.defineProperty(forged.reading!,'toJSON',{value:()=>retained});
 assert.throws(()=>selectReadingNotation(forged,'tab'),/actual receiving-realm/);
 const sourceProxy={...p,score:new Proxy(p.score,{})};assert.throws(()=>selectReadingNotation(sourceProxy,'tab'),/actual receiving-realm/);
 const readingProxy={...p,reading:new Proxy(p.reading!,{})};assert.throws(()=>selectReadingNotation(readingProxy,'tab'),/actual receiving-realm/);
 const tab=selectReadingNotation(p,'tab');assert.equal(Object.isFrozen(tab.reading!.dual!.views.tab.scene.components),true);
 assert.throws(()=>{tab.reading!.dual!.instrumentFamily='guitar' as never;},TypeError);
});
test('a pre-frozen callable or accessor manifest cannot acquire a local selectable record',()=>{
 const files=unzipSync(bytes),m=JSON.parse(strFromU8(files['manifest.json'])) as Manifest;let called=0;
 Object.defineProperty(m,'toJSON',{value:()=>{called++;return original.manifest;}});Object.freeze(m);
 assert.throws(()=>admitDualReadingContent(m,files),/literal data/);assert.equal(called,0);
 const accessor=JSON.parse(strFromU8(files['manifest.json'])) as Manifest;
 Object.defineProperty(accessor,'createdAt',{get:()=>{called++;return '2026-10-09';}});Object.freeze(accessor);
 assert.throws(()=>admitDualReadingContent(accessor,files),/accessor authority/);assert.equal(called,0);
});
test('cold and warm application admission copies retain real immutable dual context with independent archive buffers',async()=>{
 const session=new PackageAdmissionSession(),cold=await session.import(bytes),warm=await session.import(bytes);
 assert.notEqual(cold,warm);assert.notEqual(cold.files['score.json'],warm.files['score.json']);
 assert.equal(Object.isFrozen(cold.score.sourceWrittenComponents!.components),true);
 cold.files['score.json'].fill(0);cold.pages[0]='changed caller page';
 const tab=selectReadingNotation(cold,'tab');assert.deepEqual(tab.pages,original.reading!.dual!.views.tab.pages);
 const context=await ManualReadingContext.open(warm);context.switchNotation('tab');assert.deepEqual(context.package.pages,tab.pages);
 const third=await session.import(bytes);assert.deepEqual(third.files['score.json'],original.files['score.json']);assert.deepEqual(third.pages,original.pages);
 assert.throws(()=>selectReadingNotation(structuredClone(warm),'tab'),/actual receiving-realm/);
});
test('dual publication retains every declared view and round-trips without a separate performance edition',async()=>{
 const pub=await publishPackage(selectReadingNotation(original,'tab'));
 assert.deepEqual(pub.excluded,[]);assert.deepEqual([...publicationMembers(original.manifest)].sort(),Object.keys(original.files).filter(n=>n!=='manifest.json').sort());
 assert.deepEqual(pub.package.reading!.dual,original.reading!.dual);assert.equal(pub.package.manifest.revision,original.manifest.revision);
});

test('retained intake files bind exact owned bytes without granting family or replacing source members',async()=>{
 const input=authoredFrettedInput(),retainedFiles={'guitar-pro/original.gp':new Uint8Array([71,80,56]),'guitar-pro/report.json':strToU8('{"fixture":true}')},
  pending=prepareDualReadingPackage({...input,retainedFiles});
 retainedFiles['guitar-pro/original.gp'].fill(0);retainedFiles['guitar-pro/report.json'].fill(0);
 const admitted=await importPackage(await pending);
 assert.deepEqual(admitted.files['guitar-pro/original.gp'],new Uint8Array([71,80,56]));
 assert.equal(admitted.manifest.files['guitar-pro/original.gp'],await hashBytes(new Uint8Array([71,80,56])));
 assert.equal(admitted.reading!.dual!.instrumentFamily,'unknown');assert.deepEqual(admitted.score,input.score);
 await assert.rejects(prepareDualReadingPackage({...input,retainedFiles:{'score.json':new Uint8Array([1])}}),/Conflicting or unsafe/);
 await assert.rejects(prepareDualReadingPackage({...input,retainedFiles:{'../original.gp':new Uint8Array([1])}}),/Conflicting or unsafe/);
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

test('packet builder preserves legacy bytes and returns the actual independent receiving scenes',async t=>{
 t.mock.timers.enable({apis:['Date'],now:Date.UTC(2026,9,9)});
 const input=authoredFrettedInput(),packet=await prepareDualReadingPacket(input),legacy=await prepareDualReadingPackage(input),cold=await importPackage(packet.bytes);
 assert.equal(await hashBytes(packet.bytes),await hashBytes(legacy),'Legacy and packet builders emit identical complete bytes with the same authored input and archive clock');
 assert.equal(packet.package.archiveSha256,await hashBytes(packet.bytes));
 for(const notation of ['iso','tab'] as const){const actual=selectReadingNotation(packet.package,notation),reopened=selectReadingNotation(cold,notation);assert.deepEqual(actual.pages,reopened.pages);assert.deepEqual(actual.reading,reopened.reading);}
 assert.throws(()=>selectReadingNotation(structuredClone(packet.package),'tab'),/actual receiving-realm/);
 const forged=await changed((files,m)=>{const descriptor=m.reading;assert.equal(descriptor?.version,'instrument-reading-package-v2');if(descriptor?.version!=='instrument-reading-package-v2')throw Error('Expected dual descriptor');files[descriptor.views.tab.pages[0]]=strToU8('<svg xmlns="http://www.w3.org/2000/svg" data-forged="true"></svg>');},packet.bytes);
 await assert.rejects(importPackage(forged),/page differs/);
 assert.equal(selectReadingNotation(packet.package,'tab').pages.some(page=>page.includes('data-forged')),false);
});

test('only complete cold dual admission binds its originally captured archive across caller mutation and real session copies',async()=>{
 const supplied=bytes.slice(),originalHash=await hashBytes(supplied),pending=importPackage(supplied);supplied.fill(0);const actual=await pending;
 assert.equal(actual.archiveSha256,originalHash);assert.equal(admittedDualArchiveSha256(actual),originalHash);
 actual.archiveSha256='f'.repeat(64);assert.equal(admittedDualArchiveSha256(actual),originalHash,'A mutable wrapper hash does not supply the binding');
 const tab=selectReadingNotation(actual,'tab');assert.equal(admittedDualArchiveSha256(tab),originalHash);
 assert.equal(admittedDualArchiveSha256(structuredClone(actual)),undefined);
 assert.equal(admittedDualArchiveSha256({...actual,score:new Proxy(actual.score,{})}),undefined);
 assert.equal(admittedDualArchiveSha256({...actual,manifest:new Proxy(actual.manifest,{})}),undefined);
 const session=new PackageAdmissionSession();for(let i=0;i<2;i++)assert.equal(admittedDualArchiveSha256(await session.import(bytes)),originalHash);
 const files=unzipSync(bytes),m=JSON.parse(strFromU8(files['manifest.json'])) as Manifest,content=admitDualReadingContent(m,files);
 assert.equal(admittedDualArchiveSha256({...actual,manifest:m,score:content.score,reading:content.reading}),undefined,'A direct scene replay without full archive admission cannot bind bytes');
});
