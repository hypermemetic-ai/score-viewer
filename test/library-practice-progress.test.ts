import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {importPackage,selectPresentation,hashBytes} from '../src/package';
import {collectionId,practiceStorageName,legacyPracticeStorageName,personalStorageName,legacyPersonalStorageName,initialPersonal,type Entry} from '../src/state';
import {planPractice,initialPractice,totalProgress,practicePercent,reconcilePassages} from '../src/practice';
import {LibraryPracticeSummaries,readLibraryPracticeSummary,type LibraryPracticeReader} from '../src/library-practice-progress';
import {displayedPracticeTotal} from '../src/practice-display';
import {toggleDone} from '../src/practice-attainment';
import {PackageAdmissionSession} from '../src/package-admission-session';

const bytes=readFileSync(new URL('../vendor/iso-notation/public/review/schumann-no14-janko-operator-reviewed-20261007.tuna',import.meta.url));
const p=await importPackage(bytes),rr=await selectPresentation(p,'janko-four-row'),cp=await selectPresentation(p,'conventional-piano');
const entry:Entry={id:collectionId(p),file:`package-${await hashBytes(bytes)}.isoscore`,importedAt:'2026-10-07T00:00:00Z',metadata:p.manifest.metadata};
const plan=planPractice(rr,'fixed-four-v1'),earned=initialPractice(plan);
// Two earned source patterns cover five leaves; one groundwork pattern covers two.
for(const i of [0,1])earned.best[plan.chunks[i].pattern]=earned.target;
earned.groundwork=Object.fromEntries([2].map(i=>[plan.chunks[i].pattern,true]));
const fraction=0.25;
const rrFile=practiceStorageName(entry.id,rr),cpFile=practiceStorageName(entry.id,cp);
const records=new Map([[rrFile,JSON.stringify(earned)]]);
const reader:LibraryPracticeReader={readPackage:async()=>bytes,readRecord:async name=>records.has(name)?JSON.parse(records.get(name)!):null};
const deferred=()=>{let resolve!:()=>void;const promise=new Promise<void>(done=>resolve=done);return {promise,resolve};};

test('warm summary reuse rereads progress and changed archive bytes never borrow a prior admission',async()=>{
 const cache=new LibraryPracticeSummaries();let currentBytes=new Uint8Array(bytes),saved=structuredClone(earned),packageReads=0,recordReads=0;
 const fresh={readPackage:async()=>{packageReads++;return currentBytes;},readRecord:async(name:string)=>{if(!name.startsWith('practice-'))return null;recordReads++;return structuredClone(saved);}};
 await cache.refresh([entry],'janko-four-row',fresh,()=>true);assert.equal(cache.get(entry,'janko-four-row')!.sections,fraction);
 saved=initialPractice(plan);for(const c of plan.chunks)saved.best[c.pattern]=saved.target;
 await cache.refresh([entry],'janko-four-row',fresh,()=>true);assert.equal(cache.get(entry,'janko-four-row')!.sections,1);
 assert.equal(packageReads,2);assert.equal(recordReads,2);
 currentBytes=new Uint8Array(bytes.length);await cache.refresh([entry],'janko-four-row',fresh,()=>true);
 assert.equal(cache.get(entry,'janko-four-row'),undefined);assert.equal(recordReads,2);
 currentBytes=new Uint8Array(bytes);await cache.refresh([entry],'janko-four-row',fresh,()=>true);assert.equal(cache.get(entry,'janko-four-row')!.sections,1);
 cache.clear();assert.equal(cache.get(entry,'janko-four-row'),undefined);
});

test('newest refresh waits for a distinct old producer without omitting progress or replaying stale generations',async()=>{
 const cache=new LibraryPracticeSummaries(),slot=(cache as unknown as {admission:PackageAdmissionSession}).admission,
  other=readFileSync(new URL('../fixtures/schumann-op68-no14.isoscore',import.meta.url)),producer=slot.import(other,{allowLegacyTempo:true});
 assert.equal(slot.retained.pending,1);
 const old=cache.refresh([entry],'conventional-piano',reader,()=>true),
  superseded=cache.refresh([entry],'conventional-piano',reader,()=>true),
  newest=cache.refresh([entry],'janko-four-row',reader,()=>true);
 assert.deepEqual(await Promise.all([old,superseded,newest]),[false,false,true]);await producer;
 assert.equal(slot.retained.pending,0);assert.equal(cache.get(entry,'janko-four-row')!.sections,fraction);
 assert.equal(cache.get(entry,'conventional-piano'),undefined);
});

test('Conventional 0 ↔ Jankó 25% preserves exact earned fraction and every persisted record',async()=>{
 assert.equal(totalProgress(plan,earned),0.2583333333333333);assert.equal(displayedPracticeTotal(plan,earned),fraction);
 const before=[...records],cache=new LibraryPracticeSummaries();
 for(const keyboard of ['conventional-piano','janko-four-row','conventional-piano','janko-four-row'] as const){
  assert.equal(await cache.refresh([entry],keyboard,reader,()=>true),true);
  const summary=cache.get(entry,keyboard)!;
  assert.equal(summary.sections,keyboard==='janko-four-row'?fraction:0);
  assert.equal(practicePercent(summary.sections),keyboard==='janko-four-row'?25:0);
  assert.equal(summary.whole,false);
  assert.equal(cache.get(entry,keyboard==='janko-four-row'?'conventional-piano':'janko-four-row'),undefined);
 }
 assert.deepEqual([...records],before);
});

test('library shows the same combined manual/measured total without preparation bonus or record changes',async()=>{
 const state=initialPractice(plan);for(const c of plan.chunks){state.best[c.pattern]=.4*state.target;state.groundwork??={};state.groundwork[c.pattern]=true;}
 const first=plan.chunks[0];toggleDone(state,{passage:first.id,pattern:first.pattern,rate:.7*state.target});const before=JSON.stringify(state),summary=await readLibraryPracticeSummary(entry,'janko-four-row',{readPackage:async()=>bytes,readRecord:async(name:string)=>name.startsWith('practice-')?JSON.parse(before):null});
 // No14 has three literal copies of this four-bar musical unit, with weights
 // 576, 576 and 1152. Its manual rate now counts at all three locations.
 assert.ok(Math.abs(summary!.sections-(.4+.3*(576+576+1152)/13824))<1e-12);assert.equal(summary!.sections,displayedPracticeTotal(plan,state));assert.ok(Math.abs(displayedPracticeTotal(plan,state,false)-.4)<1e-12);assert.ok(totalProgress(plan,state)>summary!.sections);assert.equal(JSON.stringify(state),before);
});

test('an unavailable selected companion never reads another keyboard’s records',async()=>{
 const single=readFileSync(new URL('../vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.isoscore',import.meta.url));
 const imported=await importPackage(single,{allowLegacyTempo:true});let recordReads=0;
 const summary=await readLibraryPracticeSummary({...entry,id:collectionId(imported)},'conventional-piano',{readPackage:async()=>single,readRecord:async()=>{recordReads++;return earned;}});
 assert.equal(summary,undefined);assert.equal(recordReads,0);
});

test('another source collection cannot use an entry’s progress binding',async()=>{
 let recordReads=0;
 assert.equal(await readLibraryPracticeSummary({...entry,id:'another-source'},'janko-four-row',{readPackage:async()=>bytes,readRecord:async()=>{recordReads++;return earned;}}),undefined);
 assert.equal(recordReads,0);
});

test('a slower previous layout read cannot overwrite a later coherent refresh',async()=>{
 const cache=new LibraryPracticeSummaries(),gate=deferred(),started=deferred();
 const slow={...reader,readPackage:async()=>{started.resolve();await gate.promise;return bytes;}};
 const earlier=cache.refresh([entry],'conventional-piano',slow,()=>true);await started.promise;
 assert.equal(await cache.refresh([entry],'janko-four-row',reader,()=>true),true);
 gate.resolve();assert.equal(await earlier,false);
 assert.equal(cache.get(entry,'janko-four-row')!.sections,fraction);
 assert.equal(cache.get(entry,'conventional-piano'),undefined);
});

test('refreshes keep the prior coherent snapshot and reject changed live context or filename',async()=>{
 const cache=new LibraryPracticeSummaries();await cache.refresh([entry],'janko-four-row',reader,()=>true);
 const gate=deferred(),started=deferred();let current=true;
 const loading=cache.refresh([entry],'janko-four-row',{...reader,readRecord:async()=>{started.resolve();await gate.promise;return null;}},()=>current);
 await started.promise;assert.equal(cache.get(entry,'janko-four-row')!.sections,fraction);
 current=false;gate.resolve();assert.equal(await loading,false);
 assert.equal(cache.get(entry,'janko-four-row')!.sections,fraction);
 assert.equal(cache.get({...entry,file:'a-new-managed-package.isoscore'},'janko-four-row'),undefined);
});

test('newer source-bound Practice saves invalidate pending loads and retain whole-run attainment',async()=>{
 const cache=new LibraryPracticeSummaries(),gate=deferred(),started=deferred();
 const loading=cache.refresh([entry],'janko-four-row',{...reader,readRecord:async()=>{started.resolve();await gate.promise;return earned;}},()=>true);
 await started.promise;
 assert.equal(cache.record(entry,entry,rr,'janko-four-row',.5,true),true);
 gate.resolve();assert.equal(await loading,false);
 assert.deepEqual(cache.get(entry,'janko-four-row'),{entryId:entry.id,file:entry.file,keyboard:'janko-four-row',sections:.5,whole:true});
});

test('late callbacks from another keyboard/source/file and malformed results cannot pollute selected progress',async()=>{
 const cache=new LibraryPracticeSummaries();await cache.refresh([entry],'janko-four-row',reader,()=>true);
 assert.equal(cache.record(entry,entry,cp,'janko-four-row',1,true),false);
 assert.equal(cache.record({...entry,id:'another-source'},{...entry,id:'another-source'},rr,'janko-four-row',1,true),false);
 assert.equal(cache.record({...entry,file:'new.isoscore'},entry,rr,'janko-four-row',1,true),false);
 assert.equal(cache.record(undefined,entry,rr,'janko-four-row',1,true),false);
 assert.equal(cache.record(entry,entry,rr,'janko-four-row',NaN,true),false);
 assert.equal(cache.get(entry,'janko-four-row')!.sections,fraction);
});

test('invalid saved evidence is omitted without altering records or using another layout',async()=>{
 const corrupt=JSON.stringify({...earned,revision:'another-source'}),saved=new Map([[rrFile,corrupt],[cpFile,JSON.stringify(initialPractice(planPractice(cp)))]]);
 const cache=new LibraryPracticeSummaries(),before=[...saved];
 await cache.refresh([entry],'janko-four-row',{readPackage:async()=>bytes,readRecord:async file=>saved.has(file)?JSON.parse(saved.get(file)!):null},()=>true);
 assert.equal(cache.get(entry,'janko-four-row'),undefined);assert.deepEqual([...saved],before);
});

test('legacy fallback remains restricted to the original source-bound Jankó presentation',async()=>{
 const legacy=legacyPracticeStorageName(rr)!;assert.ok(legacy);assert.equal(legacyPracticeStorageName(cp),undefined);
 const seen:string[]=[],legacyReader={readPackage:async()=>bytes,readRecord:async(file:string)=>{seen.push(file);return file===legacy?structuredClone(earned):null;}};
 assert.equal((await readLibraryPracticeSummary(entry,'janko-four-row',legacyReader))!.sections,fraction);
 assert.deepEqual(seen,[rrFile,legacy,personalStorageName(entry.id,rr),legacyPersonalStorageName(rr)]);seen.length=0;
 assert.equal((await readLibraryPracticeSummary(entry,'conventional-piano',legacyReader))!.sections,0);
 assert.deepEqual(seen,[cpFile,personalStorageName(entry.id,cp)]);
});

test('whole-piece badge still requires the full joined source run rather than completed leaves',async()=>{
 const state=initialPractice(plan);for(const c of plan.chunks)state.best[c.pattern]=state.target;
 let tree=reconcilePassages(plan,state);
 while(tree.frontier.length>1){for(const c of tree.frontier)state.best[c.pattern]=state.target;tree=reconcilePassages(plan,state);}
 const completeReader={readPackage:async()=>bytes,readRecord:async(name:string)=>name.startsWith('practice-')?structuredClone(state):null};
 assert.equal((await readLibraryPracticeSummary(entry,'janko-four-row',completeReader))!.whole,false);
 state.best[tree.frontier[0].pattern]=state.target;
 const summary=(await readLibraryPracticeSummary(entry,'janko-four-row',completeReader))!;
 assert.equal(summary.sections,1);assert.equal(summary.whole,true);
});
