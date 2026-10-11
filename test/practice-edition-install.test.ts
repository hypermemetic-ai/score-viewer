import test from 'node:test';import assert from 'node:assert/strict';
import {transferStudy,sourcePackage} from './support/hand-edition-fixture';
import {ensurePianoReady} from '../src/piano-readiness';import {assigned} from '../src/personal-assignments';
import {initialPersonal,fingerFor,practiceStorageName,personalStorageName,collectionId,type Entry} from '../src/state';
import {importPackage,hashBytes} from '../src/package';import {planPractice,initialPractice,readPractice,progressFor} from '../src/practice';
import {toggleDone} from '../src/practice-attainment';import {stagePracticeEditionTransfer,mergeEditionPractice} from '../src/practice-edition-install';
import {stagePresentationInstall} from '../src/presentation-install';import {admitPracticeContext} from '../src/practice-context';
const bytes=(v:unknown)=>new TextEncoder().encode(JSON.stringify(v)),parsed=(v:Uint8Array)=>JSON.parse(new TextDecoder().decode(v));
async function fixture(){
 const source=await sourcePackage(transferStudy()),baseline=await ensurePianoReady({packageBytes:source.bytes,layout:'janko-four-row',performingHandPolicy:'retain-imported'});if(!('package' in baseline))throw Error('Fixture cannot prepare baseline');
 const from=baseline.package,seat=from.seats.find(s=>s.ownerIds.includes('gesture-0'))!,personal=assigned(from,initialPersonal(from),seat,{hand:'RH',finger:fingerFor(from,initialPersonal(from),seat)===1?2:1}),changed=await ensurePianoReady({packageBytes:baseline.packageBytes,layout:'janko-four-row',personal,forceRecalculate:true,performingHandPolicy:'retain-imported'});if(!('package' in changed))throw Error('Fixture cannot calculate choices');
 const to=changed.package,id=collectionId(from),entry:Entry={id,file:`package-${await hashBytes(baseline.packageBytes)}.isoscore`,metadata:from.manifest.metadata,importedAt:'fixture'},oldPlan=planPractice(from),old=initialPractice(oldPlan),targetPlan=planPractice(to),target=initialPractice(targetPlan),chunk=oldPlan.chunks[0];
 old.best[chunk.pattern]=45;toggleDone(old,{passage:chunk.id,pattern:chunk.pattern,rate:90});
 target.best[targetPlan.chunks[0].pattern]=30;toggleDone(target,{passage:targetPlan.chunks[0].id,pattern:targetPlan.chunks[0].pattern,rate:60});Object.assign(target,{working:36,start:36,keepTempo:true,audioOutput:'target-device',countInBars:4});
 return {from,to,entry,old,target,targetPlan,sourceKey:practiceStorageName(id,from),targetKey:practiceStorageName(id,to),changed,baseline};
}
const f=await fixture();
function storage(target=true){const map=new Map<string,Uint8Array>([['library.json',bytes({version:1,entries:[f.entry]})],[f.entry.file,f.baseline.packageBytes],[f.sourceKey,bytes(f.old)],...(target?[[f.targetKey,bytes(f.target)] as const]:[])]),writes:string[]=[];return {map,writes,host:{async read(name:string){return map.get(name)??null;},async write(name:string,data:Uint8Array){writes.push(name);map.set(name,new Uint8Array(data));}}};}
function request(beforeCommit:()=>Promise<void>,canCommit=()=>true){return {entry:f.entry,entries:[f.entry],packageBytes:f.changed.packageBytes,personalBytes:bytes(f.changed.personal),personalKey:personalStorageName(f.entry.id,f.to),beforeCommit,canCommit};}

test('actual calculated install transfers saved progress with practice closed, admits afterward and cold reopens merged target settings',async()=>{
 const s=storage(),sourceBytes=s.map.get(f.sourceKey)!,targetBefore=s.map.get(f.targetKey)!;let admitted=false;
 const result=await stagePresentationInstall(s.host,request(async()=>{
  await stagePracticeEditionTransfer(s.host,{entryId:f.entry.id,from:f.from,to:f.to,personal:f.changed.personal});
  const raw=parsed((await s.host.read(f.targetKey))!);const context=admitPracticeContext(f.to,raw,undefined,f.changed.personal);assert.equal(progressFor(context.plan.chunks[0],context.state),1);admitted=true;
 }));
 assert.equal(admitted,true);assert.equal(s.writes.at(-1),'library.json');assert.ok(s.writes.indexOf(f.targetKey)<s.writes.indexOf('library.json'));assert.deepEqual(s.map.get(f.sourceKey),sourceBytes);
 const cold=await importPackage(s.map.get(result.entry.file)!,{keyboardLayout:'janko-four-row'}),plan=planPractice(cold),raw=parsed(s.map.get(f.targetKey)!),loaded=readPractice(raw,plan);
 assert.equal(progressFor(plan.chunks[0],loaded),1);assert.equal(loaded.best[plan.chunks[0].pattern],45);assert.equal(loaded.working,36);assert.equal(loaded.start,36);assert.equal(loaded.keepTempo,true);assert.equal(loaded.audioOutput,'target-device');assert.equal(loaded.countInBars,4);assert.deepEqual(loaded.manualAttainment!.marks[JSON.stringify([plan.chunks[0].id,plan.chunks[0].pattern])],[60,90]);
 assert.deepEqual(raw.editionMergeEvidence.targetRaw,parsed(targetBefore));assert.deepEqual(raw.editionMergeEvidence.incomingRaw.editionEvidence.rawState,f.old);
});
test('new target journal keeps source progress and raw history when no target record exists',async()=>{
 const s=storage(false);await stagePresentationInstall(s.host,request(async()=>{await stagePracticeEditionTransfer(s.host,{entryId:f.entry.id,from:f.from,to:f.to});}));
 const state=parsed(s.map.get(f.targetKey)!);assert.equal(progressFor(f.targetPlan.chunks[0],readPractice(state,f.targetPlan)),1);assert.deepEqual(state.editionEvidence.rawState,f.old);
});
for(const failure of ['write','invalid-target','cancel','stale-target'] as const)test(`${failure} refuses library activation while preserving source and existing target bytes`,async()=>{
 const s=storage();if(failure==='invalid-target')s.map.set(f.targetKey,bytes({...f.target,revision:'wrong'}));const original=new Map(s.map);let active=true,targetReads=0;
 const host={...s.host,async read(name:string){const data=await s.host.read(name);if(name===f.targetKey){targetReads++;if(failure==='cancel')active=false;if(failure==='stale-target'&&targetReads===2){s.map.set(name,bytes({...f.target,working:40}));return s.map.get(name)!;}}return data;},async write(name:string,data:Uint8Array){if(name===f.targetKey&&failure==='write')throw Error('practice disk failure');await s.host.write(name,data);}};
 await assert.rejects(stagePresentationInstall(host,request(async()=>{await stagePracticeEditionTransfer(host,{entryId:f.entry.id,from:f.from,to:f.to,canCommit:()=>active});},()=>active)));
 assert.deepEqual(s.map.get('library.json'),original.get('library.json'));assert.deepEqual(s.map.get(f.sourceKey),original.get(f.sourceKey));if(failure!=='stale-target')assert.deepEqual(s.map.get(f.targetKey),original.get(f.targetKey));else assert.equal(parsed(s.map.get(f.targetKey)!).working,40);
});
test('cancellation after additive target write keeps active source journal and library pointer intact',async()=>{
 const s=storage(),library=s.map.get('library.json')!,source=s.map.get(f.sourceKey)!;let active=true;const host={...s.host,async write(name:string,data:Uint8Array){await s.host.write(name,data);if(name===f.targetKey)active=false;}};
 await assert.rejects(stagePresentationInstall(host,request(async()=>{await stagePracticeEditionTransfer(host,{entryId:f.entry.id,from:f.from,to:f.to,canCommit:()=>active});},()=>active)),/no longer active/);
 assert.deepEqual(s.map.get('library.json'),library);assert.deepEqual(s.map.get(f.sourceKey),source);assert.equal(progressFor(f.targetPlan.chunks[0],readPractice(parsed(s.map.get(f.targetKey)!),f.targetPlan)),1);
});
test('other sources, transpositions and keyboards do not read or copy progress',async()=>{
 const host={async read(){assert.fail('isolated exercise must not read journals');return null;},async write(){assert.fail('isolated exercise must not write journals');}};
 for(const to of [{...f.to,sourceSha256:'f'.repeat(64)},{...f.to,keyboardLayout:'conventional-piano' as const},{...f.to,transposition:{...f.to.transposition,steps:1} as typeof f.to.transposition}])assert.deepEqual(await stagePracticeEditionTransfer(host,{entryId:f.entry.id,from:f.from,to}),{transferred:false});
});

test('stronger target measured credit and compatible attained joins survive an additive merge',async()=>{
 const s=storage(),stronger=structuredClone(f.target);stronger.best[f.targetPlan.chunks[0].pattern]=75;s.map.set(f.targetKey,bytes(stronger));
 await stagePracticeEditionTransfer(s.host,{entryId:f.entry.id,from:f.from,to:f.to});assert.equal(parsed(s.map.get(f.targetKey)!).best[f.targetPlan.chunks[0].pattern],75);
 const {referenceFixture}=await import('./support/reference-score'),p=await referenceFixture(new URL('../vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.isoscore',import.meta.url)),plan=planPractice(p,'fixed-four-v1'),target=initialPractice(plan),incoming=initialPractice(plan);
 incoming.composites={'1-8':['1-4','5-8']};const {passageHierarchy}=await import('../src/practice'),join=passageHierarchy(plan,incoming).all.get('1-8')!;incoming.best[join.pattern]=90;
 const merged=mergeEditionPractice(target,incoming,p),joined=passageHierarchy(plan,merged).all.get('1-8')!;assert.equal(merged.best[joined.pattern],90);assert.equal(merged.best[plan.chunks[0].pattern],undefined);
 target.composites={'5-12':['5-8','9-12']};assert.throws(()=>mergeEditionPractice(target,incoming,p),/joins conflict/);
});
test('a pending source journal save fences activation instead of losing the newly saved claim',async()=>{
 const s=storage(),library=s.map.get('library.json')!;let sourceReads=0;const host={...s.host,async read(name:string){if(name===f.sourceKey&&++sourceReads===2)s.map.set(name,bytes({...f.old,working:50}));return s.host.read(name);}};
 await assert.rejects(stagePresentationInstall(host,request(async()=>{await stagePracticeEditionTransfer(host,{entryId:f.entry.id,from:f.from,to:f.to});})),/Source practice journal changed/);
 assert.deepEqual(s.map.get('library.json'),library);assert.equal(parsed(s.map.get(f.sourceKey)!).working,50);
});
