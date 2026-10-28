import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {stripTypeScriptTypes} from 'node:module';import {runInNewContext} from 'node:vm';
import {transferStudy,sourcePackage} from './support/hand-edition-fixture';
import {ensurePianoReady} from './support/calculate-edition';import {assigned} from '../src/personal-assignments';
import {initialPersonal,readPersonal,fingerFor,practiceStorageName,personalStorageName,collectionId,type Entry} from '../src/state';
import {importPackage,hashBytes,selectPresentation} from '../src/package';
import {getScoreTransposition,getOriginalScorePackageBytes} from '../src/score-transposition';import {retainedTranspositionFile} from '../src/score-transposition-selection';import {planPractice,initialPractice,readPractice,progressFor,practiceCatalogChunks,transferPracticeEdition,passageHierarchy} from '../src/practice';
import {toggleDone} from '../src/practice-attainment';import {stagePracticeEditionTransfer,mergeEditionPractice} from '../src/practice-edition-install';
import {stagePresentationInstall} from '../src/presentation-install';import {admitPracticeContext} from '../src/practice-context';import {installEdition} from '../src/edition-install';
const bytes=(v:unknown)=>new TextEncoder().encode(JSON.stringify(v)),parsed=(v:Uint8Array)=>JSON.parse(new TextDecoder().decode(v));
async function fixture(score=transferStudy()){
 const source=await sourcePackage(score),baseline=await ensurePianoReady({packageBytes:source.bytes,layout:'janko-four-row',performingHandPolicy:'retain-imported'});if(!('package' in baseline))throw Error('Fixture cannot prepare baseline');
 const from=baseline.package,seat=from.seats.find(s=>s.ownerIds.includes('gesture-0'))!,personal=assigned(from,initialPersonal(from),seat,{hand:'RH',finger:fingerFor(from,initialPersonal(from),seat)===1?2:1}),changed=await ensurePianoReady({packageBytes:baseline.packageBytes,layout:'janko-four-row',personal,forceRecalculate:true,performingHandPolicy:'retain-imported'});if(!('package' in changed))throw Error('Fixture cannot calculate choices');
 const to=changed.package,id=collectionId(from),entry:Entry={id,file:`package-${await hashBytes(baseline.packageBytes)}.tuna`,metadata:from.manifest.metadata,importedAt:'fixture'},oldPlan=planPractice(from),old=initialPractice(oldPlan),targetPlan=planPractice(to),target=initialPractice(targetPlan),chunk=oldPlan.chunks[0];
 old.best[chunk.pattern]=45;toggleDone(old,{passage:chunk.id,pattern:chunk.pattern,rate:90});
 target.best[targetPlan.chunks[0].pattern]=30;toggleDone(target,{passage:targetPlan.chunks[0].id,pattern:targetPlan.chunks[0].pattern,rate:60});Object.assign(target,{working:36,start:36,keepTempo:true,audioOutput:'target-device',countInBars:4});
 return {from,to,entry,old,target,targetPlan,sourceKey:practiceStorageName(id,from),targetKey:practiceStorageName(id,to),changed,baseline};
}
const f=await fixture();
test('actual edition journal writes and failed saves preserve chosen off-grid settings and literal legacy bytes',async()=>{
 const q={...f,old:initialPractice(planPractice(f.from,'fixed-four-v1')),target:structuredClone(f.target)};
 const values={step:5,start:10,working:26.966292134831466,connectionStart:99.123456789,tolerance:123.456789,offset:-17.123456789};
 Object.assign(q.old,values);delete q.old.speedRevision;q.old.workingByPattern={'historical-choice':35.123456789};
 Object.assign(q.target,values,{working:35.123456789});q.target.workingByPattern={'target-choice':67.123456789};
 for(const existing of [false,true]){
  const s=storage(existing,q),source=s.map.get(q.sourceKey)!,expected=existing?q.target:q.old;
  await stagePracticeEditionTransfer(s.host,{entryId:q.entry.id,from:q.from,to:q.to});const raw=parsed(s.map.get(q.targetKey)!),state=readPractice(raw,q.targetPlan);
  for(const key of Object.keys(values) as (keyof typeof values)[])assert.equal(state[key],expected[key],key);
  for(const [key,value]of Object.entries(expected.workingByPattern))assert.equal(state.workingByPattern[key],value);
  assert.deepEqual(s.map.get(q.sourceKey),source);if(!existing)assert.deepEqual(state.editionEvidence!.rawState,q.old);else assert.deepEqual(raw.editionMergeEvidence.targetRaw,q.target);
 }
 const failed=storage(true,q),before=new Map(failed.map);await assert.rejects(stagePracticeEditionTransfer({...failed.host,async write(){throw Error('disk failure');}},{entryId:q.entry.id,from:q.from,to:q.to}),/disk failure/);assert.deepEqual(failed.map,before);
});
function storage(target=true,q=f){const map=new Map<string,Uint8Array>([['library.json',bytes({version:1,entries:[q.entry]})],[q.entry.file,q.baseline.packageBytes],[q.sourceKey,bytes(q.old)],...(target?[[q.targetKey,bytes(q.target)] as const]:[])]),writes:string[]=[];return {map,writes,host:{async read(name:string){return map.get(name)??null;},async write(name:string,data:Uint8Array){writes.push(name);map.set(name,new Uint8Array(data));}}};}
function request(beforeCommit:()=>Promise<void>,canCommit=()=>true,q=f){return {entry:q.entry,entries:[q.entry],packageBytes:q.changed.packageBytes,personalBytes:bytes(q.changed.personal),personalKey:personalStorageName(q.entry.id,q.to),beforeCommit,canCommit};}

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
 await assert.rejects(stagePresentationInstall(host,request(async()=>{await stagePracticeEditionTransfer(host,{entryId:f.entry.id,from:f.from,to:f.to,canCommit:()=>active});},()=>active)),/Saving was cancelled/);
 assert.deepEqual(s.map.get('library.json'),library);assert.deepEqual(s.map.get(f.sourceKey),source);assert.equal(progressFor(f.targetPlan.chunks[0],readPractice(parsed(s.map.get(f.targetKey)!),f.targetPlan)),1);
});
test('other sources, transpositions and keyboards do not read or copy progress',async()=>{
 const host={async read(){assert.fail('isolated exercise must not read journals');return null;},async write(){assert.fail('isolated exercise must not write journals');}};
 for(const to of [{...f.to,sourceSha256:'f'.repeat(64)},{...f.to,keyboardLayout:'conventional-piano' as const},{...f.to,transposition:{...f.to.transposition,steps:1} as typeof f.to.transposition}])assert.deepEqual(await stagePracticeEditionTransfer(host,{entryId:f.entry.id,from:f.from,to}),{transferred:false});
});

test('stronger target measured credit and compatible attained joins survive an additive merge',async()=>{
 const s=storage(),stronger=structuredClone(f.target);stronger.best[f.targetPlan.chunks[0].pattern]=75;s.map.set(f.targetKey,bytes(stronger));
 await stagePracticeEditionTransfer(s.host,{entryId:f.entry.id,from:f.from,to:f.to});assert.equal(parsed(s.map.get(f.targetKey)!).best[f.targetPlan.chunks[0].pattern],75);
 const {referenceFixture}=await import('./support/reference-score'),p=await referenceFixture(new URL('../vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.tuna',import.meta.url)),plan=planPractice(p,'fixed-four-v1'),target=initialPractice(plan),incoming=initialPractice(plan);
 incoming.composites={'1-8':['1-4','5-8']};const {passageHierarchy}=await import('../src/practice'),join=passageHierarchy(plan,incoming).all.get('1-8')!;incoming.best[join.pattern]=90;
 const current=planPractice(p),merged=mergeEditionPractice(target,incoming,p),joined=practiceCatalogChunks(current).find(c=>c.kind==='connection'&&c.start===join.start&&c.end===join.end)!;assert.equal(merged.best[joined.pattern],90);assert.equal(merged.best[current.chunks[0].pattern],undefined);
 target.composites={'5-12':['5-8','9-12']};const other=passageHierarchy(plan,target).all.get('5-12')!;target.best[other.pattern]=120;const peers=mergeEditionPractice(target,incoming,p),overlap=practiceCatalogChunks(current).find(c=>c.kind==='connection'&&c.start===other.start&&c.end===other.end)!;assert.equal(peers.best[joined.pattern],90);assert.equal(peers.best[overlap.pattern],120);assert.equal(peers.composites,undefined);
});
test('a pending source journal save fences activation instead of losing the newly saved claim',async()=>{
 const s=storage(),library=s.map.get('library.json')!;let sourceReads=0;const host={...s.host,async read(name:string){if(name===f.sourceKey&&++sourceReads===2)s.map.set(name,bytes({...f.old,working:50}));return s.host.read(name);}};
 await assert.rejects(stagePresentationInstall(host,request(async()=>{await stagePracticeEditionTransfer(host,{entryId:f.entry.id,from:f.from,to:f.to});})),/Source practice journal changed/);
 assert.deepEqual(s.map.get('library.json'),library);assert.equal(parsed(s.map.get(f.sourceKey)!).working,50);
});

function contrastStudy(){
 const score=transferStudy();score.id='edition-contrast-study';score.title='Three related acquisition phrases';score.totalTicks=12*144;score.sourceBarTicks=Array.from({length:13},(_,i)=>i*144);score.sourceSilences=[];
 score.barlines=score.sourceBarTicks.map((tick,i)=>({tick,barNumber:i+1,type:i===12?'final':'regular'}));score.referencePerformanceTempo!.bpm=180;
 score.notes=Array.from({length:72},(_,i)=>{const section=Math.floor(i/24),offset=i%24,pitch=[0,2,4,5,4,2][offset%6]+(offset===20?section:0);return {
  id:'gesture-'+i,startTick:i*24,durationTicks:24,hand:'LH' as const,eventKind:'pitched' as const,pitch:{octave:4,pitchClass:pitch},sourceBeam:{group:'six-'+Math.floor(i/6),noBeam:false},
  sourceProvenance:{voices:['melody'],staves:['lower'],hands:['LH' as const],unison:false}
 };});return score;
}
test('real calculated catalog install merges independent contrasts, keeps target exclusions, and retains successive raw histories',async()=>{
 const q=await fixture(contrastStudy()),oldPlan=planPractice(q.from),rows=practiceCatalogChunks(oldPlan),current=practiceCatalogChunks(q.targetPlan),contrasts=rows.filter(c=>c.kind==='contrast');
 assert.equal(oldPlan.chunks.length,3);assert.equal(rows.filter(c=>c.kind==='connection').length,2);assert.ok(contrasts.length>=3);
 const a=contrasts[0],b=contrasts.find(c=>c!==a&&c.clips![0].start===a.clips![0].start&&c.clips![0].end===a.clips![0].end)!;assert.ok(b,'two independent alternatives share the same A cue');
 const counterpart=(c:typeof a)=>current.find(n=>n.kind===c.kind&&n.episode===c.episode&&JSON.stringify(n.clips!.map(v=>[v.start,v.end]))===JSON.stringify(c.clips!.map(v=>[v.start,v.end])))!,ta=counterpart(a),tb=counterpart(b),double=rows.find(c=>c.kind==='connection')!,td=counterpart(double);
 q.old.best[a.pattern]=180;q.old.best[double.pattern]=180;q.old.excluded={[a.id]:true};toggleDone(q.old,{passage:a.id,pattern:a.pattern,rate:180});
 q.target.best[ta.pattern]=120;q.target.best[tb.pattern]=150;q.target.best[td.pattern]=150;q.target.excluded={[ta.id]:false,[td.id]:true};q.target.workingByPattern[ta.pattern]=45;
 toggleDone(q.target,{passage:tb.id,pattern:tb.pattern,rate:180});
 const inherited=structuredClone(q.old);q.target.editionEvidence={version:'practice-edition-evidence-v1',sourceIdentity:q.to.sourceRevision!,keyboardLayout:q.to.keyboardLayout!,revision:oldPlan.revision,rawState:inherited};
 const sourceHistory=structuredClone(q.old);q.old.editionEvidence={version:'practice-edition-evidence-v1',sourceIdentity:q.from.sourceRevision!,keyboardLayout:q.from.keyboardLayout!,revision:oldPlan.revision,rawState:sourceHistory};
 const s=storage(true,q),sourceBytes=s.map.get(q.sourceKey)!,targetBytes=s.map.get(q.targetKey)!;
 await stagePresentationInstall(s.host,request(async()=>{
  await stagePracticeEditionTransfer(s.host,{entryId:q.entry.id,from:q.from,to:q.to,personal:q.changed.personal});
  const context=admitPracticeContext(q.to,parsed(s.map.get(q.targetKey)!),undefined,q.changed.personal);assert.equal(context.state.best[ta.pattern],180);assert.equal(context.state.best[tb.pattern],150);
 },()=>true,q));
 const cold=await importPackage(q.changed.packageBytes,{keyboardLayout:'janko-four-row'}),plan=planPractice(cold),raw=parsed(s.map.get(q.targetKey)!),state=readPractice(raw,plan);
 assert.equal(state.best[ta.pattern],180);assert.equal(state.best[tb.pattern],150);assert.equal(state.best[td.pattern],180);assert.equal(state.excluded![ta.id],false);assert.equal(state.excluded![td.id],true);assert.equal(state.workingByPattern[ta.pattern],45);assert.equal(state.audioOutput,'target-device');assert.equal(state.keepTempo,true);
 assert.deepEqual(raw.editionEvidence.rawState,inherited);assert.deepEqual(raw.editionMergeEvidence.targetRaw,parsed(targetBytes));assert.deepEqual(raw.editionMergeEvidence.incomingRaw.editionEvidence.rawState,q.old);assert.deepEqual(s.map.get(q.sourceKey),sourceBytes);
 await stagePracticeEditionTransfer(s.host,{entryId:q.entry.id,from:q.from,to:q.to,personal:q.changed.personal});const twice=parsed(s.map.get(q.targetKey)!);
 assert.deepEqual(twice.editionMergeEvidence.targetRaw,raw);assert.deepEqual(twice.editionMergeEvidence.targetRaw.editionEvidence.rawState,inherited);assert.deepEqual(twice.editionMergeEvidence.targetRaw.editionMergeEvidence.incomingRaw.editionEvidence.rawState.editionEvidence.rawState,sourceHistory);
 assert.equal(twice.best[tb.pattern],150);assert.equal(twice.excluded[td.id],true);assert.equal(s.writes.filter(k=>k==='library.json').length,1);
});

test('source revision and performed pitch/clock mutations cannot activate transfer under an unchanged archive identity',async()=>{
 const host={async read(){assert.fail('another source revision must not read journals');return null;},async write(){assert.fail('another source revision must not write journals');}};
 assert.deepEqual(await stagePracticeEditionTransfer(host,{entryId:f.entry.id,from:f.from,to:{...f.to,sourceRevision:'f'.repeat(64)}}),{transferred:false});
 for(const change of ['pitch','clock'] as const){const s=storage(),to=structuredClone(f.to),source=s.map.get(f.sourceKey),target=s.map.get(f.targetKey),library=s.map.get('library.json');if(change==='pitch'){const n=to.score.notes[0];if('pitch' in n)n.pitch.pitchClass=(n.pitch.pitchClass+1)%12;}else to.score.sourceBarTicks![1]++;
  await assert.rejects(stagePresentationInstall(s.host,request(async()=>{await stagePracticeEditionTransfer(s.host,{entryId:f.entry.id,from:f.from,to});})),/musical source facts/);assert.deepEqual(s.map.get(f.sourceKey),source);assert.deepEqual(s.map.get(f.targetKey),target);assert.deepEqual(s.map.get('library.json'),library);
 }
});

test('legacy repeated-leaf equivalence cannot promote an unplayed double during edition transfer',async()=>{
 const from=structuredClone(f.from),score=contrastStudy();for(const note of score.notes){const offset=Math.round(note.startTick/24)%24;if(offset===20&&'pitch' in note)note.pitch.pitchClass=4;}
 from.score=score;from.sourceScore=structuredClone(score);const to=structuredClone(from);to.manifest.revision='c'.repeat(64);to.score.notes[0].hand='RH';
 const legacyPlan=planPractice(from,'fixed-four-v1'),old=initialPractice(legacyPlan),leaf=legacyPlan.chunks[0];old.best[leaf.pattern]=180;toggleDone(old,{passage:leaf.id,pattern:leaf.pattern,rate:180});old.composites={'1-8':['1-4','5-8']};passageHierarchy(legacyPlan,old);
 const state=transferPracticeEdition(from,old,to),current=planPractice(to),doubles=practiceCatalogChunks(current).filter(c=>c.kind==='connection');assert.ok(doubles.length>=2);
 assert.equal(progressFor(current.chunks[0],state),1);for(const double of doubles){assert.equal(state.best[double.pattern],undefined);assert.equal(progressFor(double,state),0);}
 assert.deepEqual(state.editionEvidence!.rawState,old);
});

// Execute the actual application installation function with its real admitted
// package, journals, staging and transfer dependencies. DOM/view publication is
// replaced at the final admission seam, so practice can be closed in this test.
const mainSource=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8'),mainStart=mainSource.indexOf('async function installPreparedScore('),mainEnd=mainSource.indexOf('async function preparePianoLayout(',mainStart),mainInstall=stripTypeScriptTypes(mainSource.slice(mainStart,mainEnd));
function applicationInstall(s:ReturnType<typeof storage>,prepare:(...args:any[])=>Promise<any>){
 const running={state:'installing'},context:any={structuredClone,TextEncoder,job:running,readingOperation:undefined,host:s.host,readerAdmission:{import:importPackage},admitOrContent:(bytes:Uint8Array)=>importPackage(bytes,{allowLegacyTempo:true}),entries:[f.entry],preferences:{keyboardLayout:'janko-four-row'},enqueue:async(fn:()=>Promise<any>)=>fn(),
  collectionId,readPersonal,getOriginalScorePackageBytes,personalStorageName,selectPresentation,retainedTranspositionFile,getScoreTransposition,stagePracticeEditionTransfer,stagePresentationInstall,PracticeView:{prepareContext:prepare}};
 // The library main.ts installs through (editionLibrary), over this context's host and entries.
 context.installEdition=installEdition;context.editionLibrary={get host(){return context.host;},entries:()=>context.entries,commit:(next:unknown)=>{context.entries=next;},enqueue:(op:()=>Promise<unknown>)=>context.enqueue(op),admit:context.admitOrContent,layout:()=>context.preferences.keyboardLayout};
 runInNewContext(mainInstall,context);return {context,running,run:(navigation?:unknown,q=f.changed)=>context.installPreparedScore(f.entry,q,running,f.changed.personal,false,undefined,navigation)};
}
test('production main installation transfers saved catalog progress with no open practice view',async()=>{
 const s=storage(),application=applicationInstall(s,async()=>{assert.fail('closed practice must not construct a view context');}),result=await application.run();
 assert.equal(result.practiceContext,undefined);assert.equal(progressFor(f.targetPlan.chunks[0],readPractice(parsed(s.map.get(f.targetKey)!),f.targetPlan)),1);assert.equal(s.writes.at(-1),'library.json');assert.equal(application.context.entries[0].file,result.entry.file);
});
test('production main context admission reads merged journal before activation and fences cancellation afterward',async()=>{
 for(const cancel of [false,true]){const s=storage(),library=s.map.get('library.json')!;let admissions=0;const application=applicationInstall(s,async(p,id,navigation,personal)=>{
  assert.equal(id,f.entry.id);assert.ok(!s.writes.includes('library.json'));const admitted=admitPracticeContext(p,parsed(s.map.get(f.targetKey)!),navigation,personal);assert.equal(progressFor(admitted.plan.chunks[0],admitted.state),1);admissions++;if(cancel)application.context.job=undefined;return admitted;
 }),navigation={partition:'bounded-exercises-v1',composites:{},selected:f.targetPlan.chunks[0].id,includeManual:true};
 if(cancel){await assert.rejects(application.run(navigation),/cancelled/);assert.deepEqual(s.map.get('library.json'),library);assert.equal(application.context.entries[0].file,f.entry.file);}else {const result=await application.run(navigation);assert.equal(result.practiceContext.saved,true);assert.equal(s.writes.at(-1),'library.json');}
 assert.equal(admissions,1);
 }
});
test('production main source and library guards stop activation before any practice journal mutation',async()=>{
 for(const failure of ['source','stale-library','practice-storage'] as const){const s=storage(),original=new Map(s.map),application=applicationInstall(s,async()=>{assert.fail('failed installation must not admit a context');});let q=f.changed;
  if(failure==='source')q={...q,package:{...q.package,sourceRevision:'f'.repeat(64),sourceSha256:'f'.repeat(64)}};
  if(failure==='stale-library')application.context.entries=[{...f.entry,file:'package-'+ 'f'.repeat(64)+'.tuna'}];
  if(failure==='practice-storage')application.context.host={...s.host,async write(name:string,data:Uint8Array){if(name===f.targetKey)throw Error('practice disk failure');await s.host.write(name,data);}};
  await assert.rejects(application.run(undefined,q),failure);assert.deepEqual(s.map.get('library.json'),original.get('library.json'));assert.deepEqual(s.map.get(f.sourceKey),original.get(f.sourceKey));assert.deepEqual(s.map.get(f.targetKey),original.get(f.targetKey));
 }
});
