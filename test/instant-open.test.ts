import test from 'node:test';
import {runInNewContext} from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync,readdirSync} from 'node:fs';
import {strToU8,strFromU8} from 'fflate';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DerivedFileCache,type DerivedFileStore} from '../src/derived-file-cache';
import {encodeDerivedPayload} from '../src/derived-payload';
import {importPackage,archivePackage,hashBytes,usePianoPageCheckReceipts} from '../src/package';
import {PersonalPresentationSession,projectionServed,engravingRefusal} from '../src/personal-presentation';
import {PackageAdmissionBusy,admissionRejection} from '../src/package-admission-session';
import {HandPresentationError} from '../vendor/iso-notation/src/score-presentation';
import {PersonalPreparationPool} from '../src/personal-preparation-pool';
import {ProjectionWorkerClient,ProjectionWorkerUnavailable} from '../src/personal-projection-client';
import {AheadOfTimeEngraving,AheadOfTimeRefusal,preparedBefore,prepareRecorded,refusedWhen,aheadOfTimeOrder,holdAheadOfTimeOnInput} from '../src/ahead-of-time-engraving';
import {derivedModuleClosure,viewerDerivedIdentity} from '../scripts/derived-identity';
import {sourcePackage,transferStudy} from './support/hand-edition-fixture';
import {initialPersonal} from '../src/state';
import {assigned} from '../src/personal-assignments';
import {declaredState} from './support/declared-state';

const sha=(c:string)=>c.repeat(64);
function memoryStore(){
 const files=new Map<string,Uint8Array>(),reads:string[]=[];
 const store:DerivedFileStore={async read(name){reads.push(name);return files.get(name)??null;},async write(name,data){files.set(name,data);return true;}};
 return {files,reads,store};
}

test('an engine encoded in the worker that holds it is stored byte for byte as the reader would store it',async()=>{
 const engine={systems:[{bars:[1,2,3],text:'é'}],digest:sha('d')};
 const here=memoryStore(),there=memoryStore();
 assert.equal(await new DerivedFileCache(here.store,'build-a').put('personal-engine-v1',sha('a'),engine),true);
 const encoded=structuredClone(await encodeDerivedPayload(engine));
 assert.equal(await new DerivedFileCache(there.store,'build-a').putEncoded('personal-engine-v1',sha('a'),encoded),true);
 assert.deepEqual([...there.files.entries()],[...here.files.entries()]);
 assert.deepEqual(await new DerivedFileCache(there.store,'build-a').get('personal-engine-v1',sha('a'),v=>v),engine);
 assert.equal(await new DerivedFileCache(there.store,'build-a').has('personal-engine-v1',sha('a')),true);
 assert.equal(await new DerivedFileCache(there.store,'build-b').has('personal-engine-v1',sha('a')),false);
 assert.equal(await new DerivedFileCache(there.store,'build-a').putEncoded('personal-engine-v1',sha('b'),{...encoded,payloadSha256:'nope'}),false,'a malformed digest is never written');
 // The reader settles its engine for editing only after work it took over has saved one, so it restores that engine.
 const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
 assert.match(main,/readiness=scoreReadiness\(next,fingersLater,context\?undefined:aheadOfTime\?\.finishing\(next\.entry\.id\)\)/,'the opened score\'s stages know the save');
 assert.match(main,/if\(piano&&saving\)shownSession\(target\)\.engineSavedBy\(saving\);/,'and every settle of its session, a hand choice\'s check too, waits for that save');
 assert.match(main,/if\(saving\)await saving\.catch\(\(\)=>\{\}\);live\(signal\);const session=shownSession\(target\);session\.prefetch\(\);/,'its hands stage settles only after that save');
});

test('a derived entry\'s tag reads from its header alone, and only this build\'s entry has one',async()=>{
 const {files,store}=memoryStore(),cache=new DerivedFileCache(store,'build-a');
 await cache.put('kind-a',sha('a'),{pages:['<svg/>']},'tag-1');await cache.put('kind-a',sha('b'),{pages:[]});
 assert.equal(await cache.peek('kind-a',sha('a')),'tag-1');
 assert.equal(await cache.peek('kind-a',sha('b')),undefined,'an entry written without a tag');
 assert.equal(await cache.peek('kind-a',sha('c')),undefined,'no entry');
 assert.equal(await new DerivedFileCache(store,'build-b').peek('kind-a',sha('a')),undefined,'another build');
 assert.deepEqual(await cache.get('kind-a',sha('a'),v=>v),{pages:['<svg/>']},'the tag changes nothing get() returns');
 for(const name of files.keys())files.set(name,new Uint8Array([1,2,3]));
 assert.equal(await cache.peek('kind-a',sha('a')),undefined,'a damaged header is no tag');
});

test('a session knows without engraving whether the disk already holds the pages for these hands',async()=>{
 const {p}=await sourcePackage(transferStudy()),{store}=memoryStore(),cache=new DerivedFileCache(store,'build-a');
 const own=initialPersonal(p),seat=p.seats.find(s=>s.ownerIds.includes('gesture-1'))!,choice=assigned(p,own,seat,{hand:'RH'});
 const session=()=>new PersonalPresentationSession(p,new PersonalPreparationPool<any>(),{worker:null,cache,cacheWriteDelayMs:0});
 assert.equal(await session().prepared(own),true,'the score\'s own hands draw its own pages');
 assert.equal(await session().prepared(choice),false,'nothing on disk yet');
 const first=session(),view=await first.project(choice);
 for(let i=0;i<200&&!await session().prepared(choice);i++){await new Promise(r=>setTimeout(r,10));await cache.flush();}
 assert.equal(await session().prepared(choice),true,'the projection on disk serves these hands');
 const other=assigned(p,choice,p.seats.find(s=>s.ownerIds.includes('gesture-2'))!,{hand:'RH'});
 assert.equal(await session().prepared(other),false,'another choice is not served by it');
 // What the library remembers about a prepared score: the entry and tag that serve it.
 assert.equal(await session().projectionEntry(own),undefined);
 const served=(await session().projectionEntry(choice))!;assert.equal(await projectionServed(cache,served),true);
 assert.equal(await projectionServed(cache,(await session().projectionEntry(other))!),false);
 assert.equal(await projectionServed(new DerivedFileCache(store,'build-b'),served),false,'an engraver update makes it a miss again');
 // Reading the prepared pages engraves nothing and gives the same view.
 const reopened=session(),again=await reopened.project(choice);
 assert.deepEqual(again.pages,view.pages);assert.deepEqual(again.score,view.score);
});

test('ahead-of-time engraving runs one score at a time, in order, and an opening joins or stops it',async()=>{
 const started:string[]=[],aborted:string[]=[],finish=new Map<string,()=>void>();
 const tick=()=>new Promise(r=>setTimeout(r,0));
 const work=new AheadOfTimeEngraving((id,{signal})=>new Promise<void>((resolve,reject)=>{
  started.push(id);finish.set(id,resolve);signal!.addEventListener('abort',()=>{aborted.push(id);reject(new DOMException('stop','AbortError'));});
 }),{delayMs:0,idle:run=>run()});
 work.start(['a','b','a','c']);await tick();
 assert.deepEqual(started,['a'],'one at a time, duplicates dropped');assert.equal(work.active,'a');
 finish.get('a')!();await tick();await tick();assert.deepEqual(started,['a','b']);
 // Opening the score being prepared joins it: nothing stops, nothing more starts.
 work.yieldTo('b');assert.deepEqual(aborted,[]);finish.get('b')!();await tick();await tick();
 assert.deepEqual(started,['a','b'],'the rest of the list waits for the library');assert.equal(work.active,undefined);
 // Opening another score stops the work at once.
 work.start(['c','d']);await tick();assert.deepEqual(started,['a','b','c']);
 work.yieldTo('d');assert.deepEqual(aborted,['c']);await tick();await tick();
 assert.deepEqual(started,['a','b','c'],'nothing starts while a score is being read');
 // An opening of the score under way joins it; it frees its worker when no work remains.
 let released=0;const ends=new Map<string,()=>void>();
 const joint=new AheadOfTimeEngraving((id)=>new Promise<void>(resolve=>{ends.set(id,resolve);}),{delayMs:0,idle:run=>run(),release:()=>{released++;}});
 joint.start(['e']);await tick();let joinedDone=false;
 const joined=joint.joined('e').then(()=>{joinedDone=true;});await joint.joined('other');
 joint.yieldTo('e');await tick();assert.equal(joinedDone,false,'the opening waits for the work under way');
 ends.get('e')!();await joined;await tick();assert.equal(released,1,'its worker is freed once nothing is left');
 const stopped=new AbortController();joint.start(['f']);await tick();const waiting=joint.joined('f',stopped.signal);stopped.abort();await waiting;
 joint.yieldTo('g');assert.equal(released,2,'stopping it frees its worker too');
 // Input in the library holds the work: with nothing pending it starts nothing.
 const resumed:string[]=[],quiet=new AheadOfTimeEngraving((id,{signal})=>new Promise<void>((resolve,reject)=>{
  resumed.push(id);signal!.addEventListener('abort',()=>reject(new DOMException('stop','AbortError')));
 }),{delayMs:0,idle:run=>run()});
 quiet.defer();await tick();assert.deepEqual(resumed,[],'input with no work pending starts nothing');
 quiet.start(['p','q']);await tick();assert.deepEqual(resumed,['p']);
 quiet.defer();assert.equal(quiet.active,'p','the score under way pauses; it is not thrown away');await tick();
 assert.deepEqual(resumed,['p'],'nothing starts again');
 // A list replaced before its quiet moment never starts.
 const late=new AheadOfTimeEngraving(async id=>{started.push('late:'+id);},{delayMs:5});
 late.start(['x']);late.stop();await new Promise(r=>setTimeout(r,20));
 assert.ok(!started.includes('late:x'));
});

// The library as the viewer wires it: its input listener, and an opening that
// yields the work to the reading (beginReading) and joins it (activateScore).
function library(delayMs=30){
 const listeners=new Map<string,()=>void>(),window={addEventListener:(kind:string,listener:()=>void)=>{listeners.set(kind,listener);}};
 const steps:string[]=[],aborted:string[]=[],idles:Array<()=>void>=[];let released=0,engraved!:()=>void,engineDone!:()=>void;
 const state={layout:'janko-four-row',reading:undefined as string|undefined,indexed:Promise.resolve()};
 const work=new AheadOfTimeEngraving(async(id,{signal},{quiet,started,ready})=>{
  const step=async(name:string)=>{await quiet();if(signal?.aborted){aborted.push(id);throw new DOMException('stop','AbortError');}steps.push(`${id} ${name}`);};
  // Its inputs are read once the memory is indexed, a moment after it starts.
  await state.indexed;started();await step('admitted');await new Promise<void>(done=>{engraved=done;});await step('engraved');await step('pages');ready();
  await new Promise<void>(done=>{engineDone=done;});await step('engine');
 },{delayMs,idle:run=>idles.push(run),release:()=>{released++;},basis:id=>`${state.layout} ${id}`});
 holdAheadOfTimeOnInput(window,()=>work,()=>state.reading===undefined);
 const open=async(id:string,signal?:AbortSignal)=>{state.reading=id;work.yieldTo(id);await work.joined(id,signal);};
 return {work,state,listeners,steps,aborted,idles,released:()=>released,engrave:()=>engraved(),saveEngine:()=>engineDone(),open,input:(kind:string)=>listeners.get(kind)!()};
}
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
test('the click or key that opens the score under way hands its work to the reading, never throwing it away',async()=>{
 for(const kind of ['pointerdown','keydown']){
  const l=library();l.work.start(['no13','no14']);await wait(40);l.idles.shift()!();await wait(0);
  assert.deepEqual(l.steps,['no13 admitted']);
  // The press reaches the viewer's listener before the opening it causes.
  l.input('pointermove');l.input(kind);l.engrave();await wait(5);
  assert.deepEqual(l.steps,['no13 admitted'],`${kind}: input holds the work at its next step`);
  let opened=false;const opening=l.open('no13').then(()=>{opened=true;});await wait(5);
  assert.deepEqual(l.steps,['no13 admitted','no13 engraved','no13 pages'],`${kind}: the opening takes the work over at once`);
  await opening;assert.deepEqual(l.aborted,[],`${kind}: nothing was thrown away`);
  assert.ok(opened,`${kind}: the opening goes on once the pages are written, before the engine is saved`);
  const finishing=l.work.finishing('no13')!;assert.ok(finishing,'the engine is still being saved');assert.equal(l.released(),0,'its worker holds the engine until it is saved');
  l.saveEngine();await finishing;assert.deepEqual(l.steps.at(-1),'no13 engine');await wait(0);
  assert.equal(l.released(),1,'its worker is freed once the work is done');await wait(60);assert.equal(l.idles.length,0,'the rest waits for the library');
 }
 // Opening another score stops the paused work and frees its worker.
 const l=library();l.work.start(['no13']);await wait(40);l.idles.shift()!();await wait(0);l.input('pointerdown');l.engrave();
 await l.open('other');await wait(5);assert.deepEqual(l.aborted,['no13']);assert.equal(l.released(),1);
 // Left alone again, held work goes on by itself.
 const q=library(10);q.work.start(['no13']);await wait(20);q.idles.shift()!();await wait(0);q.input('wheel');q.engrave();await wait(30);q.saveEngine();await wait(5);
 assert.deepEqual(q.steps,['no13 admitted','no13 engraved','no13 pages','no13 engine']);
});
test('an opening never waits for work made for another layout: it stops, and the library prepares for the new one',async()=>{
 // No. 13 is being prepared for the Jankó layout; the player switches to the conventional one, then opens No. 13.
 const l=library();l.work.start(['no13','no14']);await wait(40);l.idles.shift()!();await wait(0);
 l.state.layout='conventional';l.input('pointerdown');l.engrave();
 let opened=false;const opening=l.open('no13').then(()=>{opened=true;});await wait(0);
 assert.ok(opened,'the opening goes on at once and engraves for the conventional layout itself');await opening;
 assert.deepEqual(l.aborted,['no13'],'the Jankó work stops');assert.equal(l.released(),1,'and frees its worker');
 assert.ok(!l.steps.includes('no13 pages'));
 // The same check holds where the opening waits: work changed under it is not waited for.
 const j=library();j.work.start(['no13']);await wait(40);j.idles.shift()!();await wait(0);j.state.layout='conventional';
 let joined=false;const joining=j.work.joined('no13').then(()=>{joined=true;});await wait(0);assert.ok(joined);await joining;
 j.engrave();await wait(5);assert.deepEqual(j.aborted,['no13']);
 // Work still made for what the opening shows is taken over, as before.
 const k=library();k.work.start(['no13']);await wait(40);k.idles.shift()!();await wait(0);k.state.layout='conventional';k.state.layout='janko-four-row';
 const taken=k.open('no13');k.engrave();await taken;assert.deepEqual(k.aborted,[]);assert.deepEqual(k.steps,['no13 admitted','no13 engraved','no13 pages']);
 // The viewer's key holds every part of what a preparation reads before admission,
 // and a layout chosen in the library starts the list again for it.
 const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
 const basisSource=main.slice(main.indexOf('function aheadOfTimeBasis('),main.indexOf('\n}\n',main.indexOf('function aheadOfTimeBasis('))+2);
 const refs=new Map<string,unknown>([['no13',[['state-no13','ref-1']]]]);
 const context:any={JSON,preferences:{keyboardLayout:'janko-four-row'},entries:[{id:'no13',file:'package-a.tuna',importedAt:'t1',personalFiles:{'state-no13.json':'v1'}}],personalMemory:{storedRefs:(id:string)=>refs.get(id)}};
 runInNewContext(stripTypeScriptTypes(basisSource),context);
 const first=context.aheadOfTimeBasis('no13'),changed=(name:string,change:()=>void)=>{change();assert.notEqual(context.aheadOfTimeBasis('no13'),first,name);};
 assert.equal(context.aheadOfTimeBasis('no13'),first);
 changed('layout',()=>{context.preferences.keyboardLayout='conventional';});context.preferences.keyboardLayout='janko-four-row';
 changed('archive',()=>{context.entries[0].file='package-b.tuna';});context.entries[0].file='package-a.tuna';
 changed('import',()=>{context.entries[0].importedAt='t2';});context.entries[0].importedAt='t1';
 changed('personal file',()=>{context.entries[0].personalFiles={'state-no13.json':'v2'};});context.entries[0].personalFiles={'state-no13.json':'v1'};
 changed('stored hand choices',()=>{refs.set('no13',[['state-no13','ref-2']]);});
 assert.match(main,/basis:aheadOfTimeBasis/);
 assert.match(main,/\}else\{await enqueue\(async\(\)=>\{await writeJson\('preferences\.json',\{\.\.\.preferences,keyboardLayout:id\}\);[^]*?aheadOfTime\?\.start\(libraryOrder\(\)\);\}/);
});
test('a join is refused only for a change to what the work has read, never for what the opening itself changes',async()=>{
 // The memory is not indexed when the work starts: its stored hand choices are unknown, then known.
 // That is no change to what it was made for, and the click that opens the score still takes it over.
 const l=library();let indexed!:()=>void;l.state.indexed=new Promise<void>(done=>{indexed=done;});
 l.state.layout='unknown';l.work.start(['no13']);await wait(40);l.idles.shift()!();await wait(0);
 l.state.layout='janko-four-row';indexed();await wait(0);l.input('pointerdown');
 const opening=l.open('no13');l.engrave();await opening;
 assert.deepEqual(l.aborted,[]);assert.deepEqual(l.steps,['no13 admitted','no13 engraved','no13 pages']);
 // Once the opening has taken the work over, what the opening changes on its way (its own
 // memory and entry) does not stop it at the join.
 const m=library();m.work.start(['no13']);await wait(40);m.idles.shift()!();await wait(0);m.input('pointerdown');
 m.work.yieldTo('no13');m.state.layout='changed by the opening';const joined=m.work.joined('no13');m.engrave();await joined;
 assert.deepEqual(m.aborted,[]);assert.deepEqual(m.steps,['no13 admitted','no13 engraved','no13 pages']);
});
test('Esc during an opening that took work over pauses that work; it is not thrown away',async()=>{
 const l=library(10);l.work.start(['no13','no14']);await wait(20);l.idles.shift()!();await wait(0);l.input('pointerdown');
 const esc=new AbortController(),opening=l.open('no13',esc.signal);esc.abort();await opening;
 // Back in the library (finishReading): the work under way pauses, then goes on first.
 l.state.reading=undefined;l.work.resume(['no13','no14']);l.engrave();await wait(2);
 assert.deepEqual(l.steps,['no13 admitted'],'held, as input holds it');assert.deepEqual(l.aborted,[]);assert.equal(l.released(),0);
 await wait(20);assert.deepEqual(l.steps,['no13 admitted','no13 engraved','no13 pages']);l.saveEngine();
 for(let i=0;i<20&&!l.idles.length;i++)await wait(5);l.idles.shift()!();await wait(0);
 assert.deepEqual(l.steps,['no13 admitted','no13 engraved','no13 pages','no13 engine','no14 admitted'],'then the rest of the list, without No. 13 again');
 // With nothing under way, or work made for another layout, the list starts afresh.
 const m=library(10);m.work.start(['no13']);await wait(20);m.idles.shift()!();await wait(0);m.state.layout='conventional';
 m.work.resume(['no13','no14']);m.engrave();await wait(2);assert.deepEqual(m.aborted,['no13']);
 assert.equal(m.released(),1);for(let i=0;i<20&&!m.idles.length;i++)await wait(5);m.idles.shift()!();await wait(0);assert.deepEqual(m.steps.at(-1),'no13 admitted');
});
test('between two scores: a stop frees the worker, and input keeps the waiting score and holds the last one',async()=>{
 const quick=()=>{const idles:Array<()=>void>=[],started:string[]=[];let released=0;
  const work=new AheadOfTimeEngraving(async id=>{started.push(id);},{delayMs:5,idle:run=>idles.push(run),release:()=>{released++;}});
  return {work,idles,started,released:()=>released,run:async()=>{for(let i=0;i<20&&!idles.length;i++)await wait(5);idles.shift()?.();await wait(0);}};};
 // a is done; b waits for idle time. A stop now frees the worker a used.
 const stopped=quick();stopped.work.start(['a','b','c']);await stopped.run();assert.deepEqual(stopped.started,['a']);await wait(0);
 assert.equal(stopped.idles.length,1,'b waits for idle time');stopped.work.stop();assert.equal(stopped.released(),1);
 stopped.idles.shift()!();await wait(20);assert.deepEqual(stopped.started,['a'],'b never starts after the stop');
 // Input while b waits keeps b in the list.
 const kept=quick();kept.work.start(['a','b','c']);await kept.run();await wait(0);kept.work.defer();
 assert.equal(kept.released(),0,'a pause keeps the worker for what follows');kept.idles.shift()!();await wait(0);
 assert.deepEqual(kept.started,['a'],'the step waiting before the input does not run');
 await kept.run();await kept.run();assert.deepEqual(kept.started,['a','b','c']);await wait(0);assert.equal(kept.released(),1);
 // Input while the last score waits holds it too.
 const last=quick();last.work.start(['a']);for(let i=0;i<20&&!last.idles.length;i++)await wait(5);last.work.defer();
 last.idles.shift()!();await wait(0);assert.deepEqual(last.started,[],'held until the next quiet moment');
 await last.run();assert.deepEqual(last.started,['a']);
});
test('an opening waits for a background install of its score, stops work on a layout it does not need, and waits again for the next step',async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));
 type Step={work:import('../src/ahead-of-time-engraving').AheadOfTimeWork;signal:AbortSignal};
 const steps:Step[]=[],next=new Map<string,()=>void>(),aborted:string[]=[];
 const work=new AheadOfTimeEngraving((id,{signal},w)=>new Promise<void>((resolve,reject)=>{
  steps.push({work:w,signal:signal!});next.set(id,resolve);signal!.addEventListener('abort',()=>{aborted.push(id);reject(new DOMException('stop','AbortError'));});
 }),{delayMs:0,idle:run=>run()});
 // Replacing the edition: an opening of the score sees it, and waits for it.
 work.start(['no13']);await tick();const step=steps[0];step.work.started();
 assert.equal(work.replacing('no13'),false);step.work.replacing();assert.equal(work.replacing('no13'),true);assert.equal(work.replacing('other'),false);
 work.yieldTo('no13');assert.deepEqual([...aborted],[],'opening this score joins the install');
 let installed=false;const waiting=work.joined('no13').then(()=>{installed=true;});await tick();assert.equal(installed,false);
 step.work.ready();await waiting;assert.equal(work.replacing('no13'),false,'once installed, the opening reads the new edition');
 // The next step (the new edition's pages) has its own ready, which a second join awaits.
 step.work.started();let paged=false;const pages=work.joined('no13').then(()=>{paged=true;});await tick();assert.equal(paged,false);
 step.work.ready();await pages;next.get('no13')!();await tick();
 // A layout left for later: an opening of the score stops it, unless its install has begun.
 const later=new AheadOfTimeEngraving((id,{signal},w)=>new Promise<void>((resolve,reject)=>{
  steps.push({work:w,signal:signal!});next.set(id,resolve);signal!.addEventListener('abort',()=>{aborted.push(id);reject(new DOMException('stop','AbortError'));});
 }),{delayMs:0,idle:run=>run()});
 later.start(['no14']);await tick();let s=steps.at(-1)!;s.work.started();s.work.optional();later.yieldTo('no14');
 assert.deepEqual(aborted,['no14'],'an opening needs only the layout in use');
 later.start(['no15']);await tick();s=steps.at(-1)!;s.work.started();s.work.optional();s.work.replacing();later.yieldTo('no15');
 assert.deepEqual(aborted,['no14'],'an install under way is joined, not stopped');assert.equal(later.replacing('no15'),true);
 s.work.ready();next.get('no15')!();await tick();
 // A new step forgets the last one's kind.
 later.start(['no16']);await tick();s=steps.at(-1)!;s.work.started();s.work.optional();s.work.started();later.yieldTo('no16');assert.deepEqual(aborted,['no14']);
 next.get('no16')!();await tick();
});
test('the viewer holds ahead-of-time work through its own listener and saves an engine before freeing its worker',()=>{
 const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
 assert.match(main,/holdAheadOfTimeOnInput\(window,\(\)=>aheadOfTime,\(\)=>!current&&!readingOperation\)/);
 assert.match(main,/function beginReading\([^]*?aheadOfTime\?\.yieldTo\(entryId\)/);
 assert.match(main,/aheadOfTime=new AheadOfTimeEngraving\([^\n]*release:\(\)=>\{aheadWorker\?\.close\(\);aheadAdmission\.clear\(\);\}/,'freeing the worker frees its admission session too');
});

/** The viewer's own preparation of one score, against stubs that log each step. */
function preparation(options:{stopAt?:string;projected?:boolean;engineOnDisk?:boolean;admission?:unknown;projection?:unknown;folds?:boolean;
 /** Opening would engrave the archive again (its pages an earlier engine drew), or it is a reading. */
 behind?:boolean;reading?:boolean;
 /** What the engraving worker answers; by default the archive's content does not read. */
 engraved?:()=>Promise<{made:{kind:string;key:string;encoded:unknown;tag?:string}[];error?:string}>;
 /** The edition engraved for the layout in use left the other layout for later. */
 later?:boolean;
 /** How installing goes: written, or failing for a reason of its own. */
 install?:(request:any)=>Promise<void>}={}){
 const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
 const source=stripTypeScriptTypes(main.slice(main.indexOf('const idleTime='),main.indexOf('\ntype ReadingJob=')));
 const log:string[]=[],progress:string[]=[],controller=new AbortController(),{store}=memoryStore(),derived=new DerivedFileCache(store,'build-a'),installs:any[]=[];
 const stop=(step:string)=>{log.push(step);if(options.stopAt===step)controller.abort();};
 class Session {
  waiting=false;
  async projectionEntry(){return {key:sha('e'),tag:'hands'};}
  async project(){stop('project');if(options.projection)throw options.projection;this.waiting=!options.engineOnDisk;}
  async flushProjection(){stop('pages written');}
  async engineMissing(){return !options.engineOnDisk&&!this.waiting;}
  async warm(){stop('engine settled');this.waiting=true;}
  get engineWaiting(){return this.waiting;}
  async flushEngine(){stop('engine saved');this.waiting=false;}
 }
 // A score that shows a repeat folded is prepared on its folded pages' own session.
 class FoldedReader {
  readonly session=new Session();
  folds(){return !!options.folds;}
  async view(){stop('folded project');this.session.waiting=!options.engineOnDisk;return {verbatimFold:{session:this.session}};}
  async served(){return {kind:'verbatim-fold-v1',key:sha('f'),tag:'folded',with:[]};}
 }
 // The library's files: the saved archive (1,2,3), its edition engraved again (4,5,6), that edition completed (7,8,9).
 const files:Record<string,Uint8Array>={'package-no13.tuna':new Uint8Array([1,2,3]),'package-again.tuna':new Uint8Array([4,5,6]),'package-complete.tuna':new Uint8Array([7,8,9])};
 const first=(b:Uint8Array)=>b[0]===1;
 const memory={adoptIndexed:async()=>{log.push('indexed');return true;},storedRefs:()=>{log.push('hand choices read');return [];},personalFor:()=>({})};
 const context:any={
  JSON,Promise,setTimeout,DOMException,Error,Set,AHEAD_OF_TIME_KIND:'ahead-of-time-v2',hashBytes,preparedBefore,prepareRecorded,refusedWhen,admissionRejection,engravingRefusal,savedPagesBehindPolicy:()=>false,
  checkReadingExecution:(e:any)=>{if(e?.signal?.aborted)throw new DOMException('stop','AbortError');},
  entries:[{id:'no13',file:options.later?'package-again.tuna':'package-no13.tuna',importedAt:'t1'}],preferences:{keyboardLayout:'janko-four-row'},
  personalMemory:{...memory,memoryRevision:0},FoldedReader,withRepeatInheritance:(_p:unknown,s:unknown)=>s,withResolvedMemory:()=>({}),resolveMemoryInput:()=>({}),host:{read:async(name:string)=>files[name]??null},
  projectionServed:async()=>!!options.projected,readingOnlyArchive:(b:Uint8Array)=>!!options.reading,
  aheadAdmission:{import:async(b:Uint8Array)=>{if(options.admission&&first(b))throw options.admission;return {availablePresentations:['janko-four-row'],manifest:{files:{}},earlier:first(b)};}},
  scoreCapabilities:()=>({pianoPreparation:!options.reading}),selectPresentation:async(p:unknown)=>p,loadPersonalJournal:async()=>({}),readPersonal:(p:unknown)=>p,GUITAR_PRO_FILES:{descriptor:'source-part.json'},
  ensurePianoReady:async(request:any)=>({package:{keyboardLayout:request.layout},packageBytes:request.packageBytes}),PersonalPresentationSession:Session,separatePreparations:()=>undefined,projectionWorkerClient:()=>({}),aheadWorker:undefined,
  AheadOfTimeRefusal,SavedPagesLackRepeats:class extends Error{},ENGRAVE_AGAIN_KINDS:['engraved-again-v1','reading-admission-v1','piano-page-checks-v1','calculated-admission-v1'],
  // The worker engraves only what the current engraving no longer reproduces.
  engraveAgainInWorker:async(bytes:Uint8Array,_signal:AbortSignal,admit:boolean,more:{layouts?:string[];earlier?:Uint8Array})=>{
   if(!first(bytes)&&!more.earlier)return {made:[]};
   stop(more.earlier?`engraved ${more.layouts} again from the earlier edition`:admit?'admitted and engraved again':`engraved ${more.layouts} again`);return options.engraved?options.engraved():{made:[],error:'This saved edition does not read.'};},
  // What a library entry keeps about its edition engraved again.
  laterLayouts:(entry:any)=>entry.file==='package-again.tuna'&&options.later?{from:'package-no13.tuna',layouts:['conventional-piano']}:undefined,engravedAgainOf:()=>undefined,joinedNotice:(_a:unknown,b:unknown)=>b,
  readRetainedEdition:async(_host:unknown,_entry:unknown,file:string)=>files[file],
  prepareRebuiltEdition:async(_host:unknown,_entry:unknown,_file:string,bytes:Uint8Array,layout:string,request:any)=>{stop(`prepared ${request.layouts}${request.keptOnly?' from the kept engraving':''}`);
   return {packageBytes:files['package-again.tuna'],package:{keyboardLayout:layout},personal:{},later:['conventional-piano'],hands:'edition',fingers:'none',left:0,carried:0};},
  prepareCompletedEdition:async(_host:unknown,_entry:unknown,_bytes:Uint8Array,from:string,_earlier:Uint8Array,layouts:string[],request:any)=>{stop(`prepared ${layouts} from ${from}${request.keptOnly?' from the kept engraving':''}`);
   return {packageBytes:files['package-complete.tuna'],package:{keyboardLayout:layouts[0]},personal:{},hands:'edition',fingers:'none',left:0,carried:0};},
  reengraveReadingArchive:async(_bytes:Uint8Array,_refusal:unknown,_execution:unknown,keptOnly:boolean)=>{stop(`prepared the reading${keptOnly?' from the kept engraving':''}`);return files['package-again.tuna'];},
  // Nothing open and nothing queued: the library is quiet.
  startupReady:true,current:undefined,practice:undefined,job:undefined,readingOperation:undefined,dialog:undefined,queuedWrites:0,
  editionLibrary:{},enqueue:(op:()=>Promise<unknown>)=>op(),editionNeedsEngravingAgain:async()=>undefined,
  installEdition:async(_library:unknown,request:any)=>{
   assert.equal(request.live(),true,'installed only while the library is quiet');
   if(options.install)await options.install(request);
   if(!request.live())throw Error('Saving was cancelled; existing score retained.');
   stop('installed');installs.push({file:request.entry.file,bytes:[...request.q.packageBytes],record:JSON.parse(JSON.stringify(request.engravedAgain()??null))});
   const next=request.q.packageBytes[0]===4?'package-again.tuna':'package-complete.tuna';context.entries=[{...context.entries[0],file:next}];
  },
 };
 if(options.behind)context.savedPagesBehindPolicy=(p:any)=>p.earlier;
 runInNewContext(source,context);
 const run=()=>context.prepareAheadOfTime(derived,'no13',{signal:controller.signal},{quiet:async()=>{},started:()=>log.push('started'),ready:()=>log.push('ready'),replacing:()=>log.push('replacing'),optional:()=>log.push('optional'),
  // The stages the library's line grows by: what was planned, reached, or failed.
  plan:(stages:readonly string[])=>progress.push(`plan ${stages.join(' ')}`),reached:(stage:string)=>progress.push(stage),failed:()=>progress.push('failed')});
 const recorded=async()=>(await derived.peek('ahead-of-time-v2',await hashBytes(JSON.stringify(['ahead-of-time-v2',await hashBytes(new Uint8Array([1,2,3])),'janko-four-row','no13','t1',null,[]]))))!==undefined;
 return {log,progress,run,recorded,derived,context,controller,installs};
}
test('a preparation writes the pages before an opening goes on, then saves the engine, and records itself only after both',async()=>{
 const whole=preparation();await whole.run();
 // Its basis is fixed once the memory is indexed and its inputs are read, before anything else.
 assert.deepEqual(whole.log.splice(0,3),['indexed','hand choices read','started']);
 assert.deepEqual(whole.log,['project','pages written','ready','engine saved']);assert.equal(await whole.recorded(),true);
 // Its line grows when the hands are made and the pages written; the engine saved ends the work.
 assert.deepEqual(whole.progress,['plan hands pages engine','hands','pages']);
 // Pages an earlier reading made, without an engine: the engine is settled and saved.
 const settle=preparation({projected:true});await settle.run();settle.log.splice(0,3);
 assert.deepEqual(settle.log,['ready','engine settled','engine saved']);
 const both=preparation({projected:true,engineOnDisk:true});await both.run();assert.deepEqual(both.log.slice(3),['ready']);assert.equal(await both.recorded(),true);
 // A score that folds is prepared on its folded pages in the same order.
 const folded=preparation({folds:true});await folded.run();folded.log.splice(0,3);
 assert.deepEqual(folded.log,['folded project','pages written','ready','engine saved']);assert.equal(await folded.recorded(),true);
 // A stop while either is written is no outcome: the score is prepared again on the next visit.
 for(const stopAt of ['pages written','engine saved','engine settled']){
  const stopped=preparation({stopAt,projected:stopAt==='engine settled'});
  await assert.rejects(stopped.run(),{name:'AbortError'},stopAt);assert.equal(await stopped.recorded(),false,stopAt);
 }
});

test('only admission rejecting a score, or the engraver refusing its pages, is recorded as a refusal; anything else is tried again',async()=>{
 const unfit=new HandPresentationError('unsupported-fit','Hands cannot be fitted in bar 11.');
 const refusals:[string,{admission?:unknown;projection?:unknown}][]=[
  ['admission rejects the archive, whose content does not read either',{admission:Error('Package manifest is invalid')}],
  ['the engraver cannot fit the saved hands',{projection:unfit}],
  ['the same refusal in the player\'s words',{projection:Error("These hand choices can't be drawn on the page yet.",{cause:unfit})}],
 ];
 for(const [what,failure] of refusals){const p=preparation(failure);await p.run();assert.equal(await p.recorded(),true,what);assert.equal(p.progress.at(-1),'failed',what);}
 const passing:[string,{admission?:unknown;projection?:unknown}][]=[
  ['another import holds admission',{admission:new PackageAdmissionBusy()}],
  ['admission runs out of memory',{admission:new RangeError('Array buffer allocation failed')}],
  ['the projection worker is lost',{projection:new ProjectionWorkerUnavailable()}],
  ['the worker fails for a reason of its own',{projection:new TypeError('Cannot read properties of undefined')}],
  ['an authority failure, which waits for recovery',{projection:new HandPresentationError('authority','Operator hand requirement has a stale owner guard.')}],
 ];
 for(const [what,failure] of passing){const p=preparation(failure);await assert.rejects(p.run(),e=>e===(failure.admission??failure.projection),what);assert.equal(await p.recorded(),false,what);}
 // The wrapper keeps what failed, and passes everything else on unchanged.
 const busy=new PackageAdmissionBusy();await assert.rejects(refusedWhen(Promise.reject(busy),admissionRejection),e=>e===busy);
 await assert.rejects(refusedWhen(Promise.reject(unfit),engravingRefusal),e=>e instanceof AheadOfTimeRefusal&&e.cause===unfit);
});

test('an archive opening would engrave again is engraved again in a worker for the layout in use, kept, installed in the library, and its pages prepared',async()=>{
 const engraving=await encodeDerivedPayload({version:'engraved-again-v1',archive:'AQID',fellBack:[],droppedFingers:[]}),
  engraved=async()=>({made:[{kind:'engraved-again-v1',key:sha('b'),encoded:{...engraving,body:new Uint8Array(engraving.body)}},
   {kind:'piano-page-checks-v1',key:sha('c'),encoded:await encodeDerivedPayload(true),tag:'checked'},{kind:'player-data',key:sha('d'),encoded:await encodeDerivedPayload(true)}]});
 const prepared=['indexed','hand choices read','started','project','pages written','ready','engine saved'];
 for(const [what,options] of [['pages an earlier engine drew',{behind:true}],['admission rejects the pages',{admission:Error('Page 1 differs from its replay')}]] as const){
  const p=preparation({...options,engraved});await p.run();
  // Engraved for the layout in use, prepared from that kept engraving, installed, and only then may an opening that took it over go on.
  assert.deepEqual(p.log.slice(3,8),['engraved janko-four-row again','replacing','prepared janko-four-row from the kept engraving','installed','ready'],what);
  // The other layout is engraved next from the same earlier edition; it is left for later, so an opening stops it.
  assert.deepEqual(p.installs.map(i=>i.record),[{from:'package-no13.tuna',later:['conventional-piano'],untold:{hands:'edition',fingers:'none',left:0,practiceLeft:0}}],what);
  assert.deepEqual(p.log.slice(8),prepared,'then the new edition\'s pages are prepared as any score\'s are');
  // One plan for the whole score, its first: engraved, installed, the other layout (if left for later), its hands and pages.
  assert.deepEqual(p.progress,['plan engrave install later later-install hands pages engine','engrave','install','plan hands pages engine','hands','pages'],what);
  assert.ok(await p.derived.has('engraved-again-v1',sha('b')),what);assert.equal(await p.derived.peek('piano-page-checks-v1',sha('c')),'checked',what);
  // The worker hands back derived files only.
  assert.equal(await p.derived.has('player-data',sha('d')),false,what);
  assert.equal(await p.recorded(),true,what);
 }
 const reading=preparation({reading:true,engraved});await reading.run();
 assert.deepEqual(reading.log.slice(3,8),['admitted and engraved again','replacing','prepared the reading from the kept engraving','installed','ready']);
 assert.deepEqual(reading.installs.map(i=>i.record),[{from:'package-no13.tuna',untold:{reading:true,hands:'edition',fingers:'none',left:0,practiceLeft:0}}]);
 assert.deepEqual(reading.progress.slice(0,3),['plan engrave install','engrave','install']);
 // A worker lost, out of memory or stopped records nothing: the next visit tries again.
 const lost=preparation({behind:true,engraved:async()=>{throw Error('The engraving worker stopped: out of memory');}});
 await assert.rejects(lost.run(),/out of memory/);assert.equal(await lost.recorded(),false);
 const stopped=preparation({behind:true,stopAt:'engraved janko-four-row again',engraved});
 await assert.rejects(stopped.run(),{name:'AbortError'});assert.equal(await stopped.recorded(),false);assert.equal(await stopped.derived.has('engraved-again-v1',sha('b')),false);
 // Content the current engraving cannot make again is a refusal, recorded once, and nothing is installed.
 const refused=preparation({behind:true});await refused.run();assert.equal(await refused.recorded(),true);assert.deepEqual(refused.installs,[]);assert.equal(refused.progress.at(-1),'failed');
});

test('the layouts an edition left for later are engraved from its earlier edition and installed before its pages are prepared',async()=>{
 const engraving=await encodeDerivedPayload({version:'engraved-again-v1',archive:'AQID',fellBack:[],droppedFingers:[]}),
  engraved=async()=>({made:[{kind:'engraved-again-v1',key:sha('b'),encoded:{...engraving,body:new Uint8Array(engraving.body)}}]});
 const p=preparation({later:true,engraved});await p.run();
 assert.deepEqual(p.log.slice(3,9),['optional','engraved conventional-piano again from the earlier edition','replacing','prepared conventional-piano from package-no13.tuna from the kept engraving','installed','ready']);
 // Everything came along as it was: nothing to say when the score opens.
 assert.deepEqual(p.installs.map(i=>i.file),['package-again.tuna']);assert.deepEqual(p.installs.map(i=>i.record),[null]);
 assert.deepEqual(p.log.slice(9),['indexed','hand choices read','started','project','pages written','ready','engine saved']);
 assert.deepEqual(p.progress,['plan later later-install hands pages engine','later','later-install','plan hands pages engine','hands','pages']);
 // Refused, it is not tried again this session, and the pages of the edition as it is are prepared.
 const refused=preparation({later:true});await refused.run();
 assert.deepEqual(refused.log.slice(3),['optional','engraved conventional-piano again from the earlier edition','started','project','pages written','ready','engine saved']);
 assert.deepEqual(refused.installs,[]);
 assert.deepEqual(refused.progress,['plan later later-install hands pages engine','plan hands pages engine','hands','pages'],'not a failure of the score: its pages are prepared');
});

test('a background install waits for the library to be quiet, and an opening of another score stops it with nothing written',async()=>{
 const engraving=await encodeDerivedPayload({version:'engraved-again-v1',archive:'AQID',fellBack:[],droppedFingers:[]}),
  engraved=async()=>({made:[{kind:'engraved-again-v1',key:sha('b'),encoded:{...engraving,body:new Uint8Array(engraving.body)}}]});
 // A dialog up, then another write queued: the install waits for both.
 const waits=preparation({behind:true,engraved});waits.context.dialog={};
 const running=waits.run();await new Promise(resolve=>setTimeout(resolve,500));
 assert.deepEqual(waits.installs,[],'not while a dialog is up');
 waits.context.dialog=undefined;waits.context.queuedWrites=1;await new Promise(resolve=>setTimeout(resolve,500));
 assert.deepEqual(waits.installs,[],'not while another write is queued');
 waits.context.queuedWrites=0;await running;assert.equal(waits.installs.length,1);
 // An opening of this very score waits for it: the install goes on with its dialog up.
 const joined=preparation({behind:true,engraved});joined.context.dialog={};joined.context.readingOperation={running:{entryId:'no13'}};await joined.run();
 assert.equal(joined.installs.length,1);
 // A score opened, or practice, stops it at its next step: nothing is installed or recorded, and the next visit tries again.
 for(const what of ['current','practice'] as const){
  const stopped=preparation({behind:true,engraved,install:async()=>{stopped.context[what]={};stopped.controller.abort();}});
  await assert.rejects(stopped.run(),{name:'AbortError'},what);assert.deepEqual(stopped.installs,[],what);assert.equal(await stopped.recorded(),false,what);
 }
 // An install failing for a reason of its own leaves the score for opening, which says why.
 const failed=preparation({behind:true,engraved,install:async()=>{throw Error('The declared personal journal is missing.');}});
 await failed.run();assert.deepEqual(failed.installs,[]);assert.equal(await failed.recorded(),true);
 assert.ok(failed.log.includes('prepared janko-four-row from the kept engraving'));assert.ok(!failed.log.includes('installed'));
});

test('an opening cancelled with Esc, or failed, returns to a library that prepares scores again',async()=>{
 const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8'),from=main.indexOf('function finishReading('),to=main.indexOf('\nconst readerPages=',from);
 const started:string[][]=[],context:any={...declaredState(),readingOperation:undefined,current:undefined,shownFailures:new Set(),dialog:undefined,READING_CANCELLED:'cancelled',
  closeDialog(){},options(){},button:()=>'',libraryOrder:()=>['no13','no14'],aheadOfTime:{resume:(ids:string[])=>started.push(ids)}};
 runInNewContext(stripTypeScriptTypes(main.slice(from,to)),context);
 const op=()=>{const op={running:{state:'working'},loading:{stop(){},fail(){}},controller:new AbortController(),options:undefined,previous:undefined};context.readingOperation=op;return op;};
 const cancelled=op();cancelled.controller.abort();context.finishReading(cancelled,false,new DOMException('stop','AbortError'));
 assert.deepEqual(started,[['no13','no14']]);
 context.finishReading(op(),false,Error('Managed score file is missing'));assert.equal(started.length,2);
 context.current={entry:{id:'no13'}};context.finishReading(op(),true);context.finishReading(op(),false,Error('kept the reader'));
 assert.equal(started.length,2,'a reader on screen is not the library');
});

test('closing a projection worker client stops only its own worker and what waits on it',async()=>{
 let spawned=0,terminated=0;
 const spawn=()=>{spawned++;return {onmessage:null,onerror:null,onmessageerror:null,postMessage(){},terminate(){terminated++;}} as never;};
 const ahead=new ProjectionWorkerClient(spawn),reader=new ProjectionWorkerClient(spawn);
 const waiting=ahead.warm('core-b',{} as never),held=reader.warm('core-a',{} as never);
 ahead.close();await assert.rejects(waiting,{name:'AbortError'});
 assert.equal(terminated,1,'the reader\'s worker and its warm engines stay');assert.equal(spawned,2);
 ahead.close();assert.equal(terminated,1,'closing an idle client does nothing');
 void held.catch(()=>{});reader.close();
});

test('a refused or needless ahead-of-time preparation is recorded, and tried again only when what it read changes',async()=>{
 const {store}=memoryStore(),cache=new DerivedFileCache(store,'build-a'),files=new Map<string,string|null>([['journal.json','d1']]),onDisk=new Set<string>();
 const still={served:async(e:{key:string})=>onDisk.has(e.key),digest:async(name:string)=>files.get(name)??null};
 let runs=0;
 const refuse=async(read:(name:string,digest:string|null)=>void)=>{runs++;read('journal.json',files.get('journal.json')!);throw new AheadOfTimeRefusal(Error("This score can't be engraved yet"));};
 // A refusal (saved hands the engraver refuses, an edition admission rejects) is an outcome.
 assert.equal(await preparedBefore(cache,sha('1'),still),false);
 assert.equal(await prepareRecorded(cache,sha('1'),refuse),'refused');
 for(let visit=0;visit<3;visit++)if(!await preparedBefore(cache,sha('1'),still))await prepareRecorded(cache,sha('1'),refuse);
 assert.equal(runs,1,'later library visits do not engrave it again');
 // A journal kept outside the store changed: prepare again.
 files.set('journal.json','d2');assert.equal(await preparedBefore(cache,sha('1'),still),false);
 // Nothing to prepare (a reading-only archive, a layout it lacks) is recorded the same way.
 assert.equal(await prepareRecorded(cache,sha('2'),async()=>null),'nothing');assert.equal(await preparedBefore(cache,sha('2'),still),true);
 // A served projection stands only while its entry is on disk.
 onDisk.add('p1');assert.equal(await prepareRecorded(cache,sha('3'),async()=>({key:'p1',tag:'t'})),'served');
 assert.equal(await preparedBefore(cache,sha('3'),still),true);onDisk.delete('p1');assert.equal(await preparedBefore(cache,sha('3'),still),false);
 // A stop is no outcome.
 await assert.rejects(prepareRecorded(cache,sha('4'),async()=>{throw new DOMException('stop','AbortError');}),/stop/);
 assert.equal(await preparedBefore(cache,sha('4'),still),false);
 // Another build reads no record.
 assert.equal(await preparedBefore(new DerivedFileCache(store,'build-b'),sha('2'),still),false);
});

test('derived files are bound to the code that makes them, followed through every import and worker',()=>{
 const closure=derivedModuleClosure(process.cwd());
 for(const file of ['src/package.ts','src/personal-presentation.ts','src/personal-projection-worker.ts','src/layout-peer-worker.ts','src/personal-projection-host.ts',
  'src/calculated-hand-edition.ts','src/annotation-ink-policy.ts','vendor/iso-notation/src/score-presentation.ts'])
  assert.ok(closure.includes(file),file);
 for(const file of ['src/main.ts','src/practice.ts','src/library-menu.ts','src/style.css'])assert.ok(!closure.includes(file),file+' makes no derived file');
 const root=mkdtempSync(join(tmpdir(),'derived-identity-'));
 try{
  mkdirSync(join(root,'src'));
  const write=(name:string,text:string)=>writeFileSync(join(root,name),text);
  write('src/package.ts',"import {a} from './a';export * from './b';export const w=new URL('./worker.ts',import.meta.url);const lazy=()=>import('./lazy');");
  write('src/a.ts',"import type {T} from './types';import font from './font.ttf?url';export const a=1;");
  for(const name of ['b','types','lazy','worker'])write(`src/${name}.ts`,'export const x=1;');
  write('src/font.ttf','font');write('src/ui.ts','export const ui=1;');
  const entries=['src/package.ts'];
  assert.deepEqual(derivedModuleClosure(root,entries),['src/a.ts','src/b.ts','src/font.ttf','src/lazy.ts','src/package.ts','src/types.ts','src/worker.ts']);
  const identity=()=>viewerDerivedIdentity(root,entries);
  const first=identity();write('src/ui.ts','export const ui=2;');
  assert.equal(identity(),first,'a change outside the closure keeps every derived file');
  write('src/b.ts','export const x=2;');assert.notEqual(identity(),first,'a change inside it makes them misses');
  write('src/lazy.ts',"const name='./'+'b';export const m=()=>import(name);");
  assert.throws(()=>derivedModuleClosure(root,entries),/named at run time/);
  write('src/lazy.ts',"const fs='node:fs/promises';export const m=()=>import(/* @vite-ignore */ fs);");
  assert.doesNotThrow(()=>derivedModuleClosure(root,entries),'a Node built-in is no viewer code');
  write('src/lazy.ts',"export const w=new URL(location.href+'x.ts',import.meta.url);");
  assert.throws(()=>derivedModuleClosure(root,entries),/URL at run time/);
  write('src/lazy.ts',"export {x} from './missing';");
  assert.throws(()=>derivedModuleClosure(root,entries),/does not exist/);
 }finally{rmSync(root,{recursive:true,force:true});}
});

/** The modules main.ts hands the derived-file cache to, directly or through a name bound to it. */
function handedModules(main:string):Set<string>{
 const from=new Map<string,string>();
 for(const m of main.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*'\.\/([^']+)'/g))
  for(const name of m[1].split(','))from.set(name.trim().replace(/^type\s+/,'').split(/\s+as\s+/).pop()!,`src/${m[2]}.ts`);
 const handed=new Set<string>(),lines=main.split('\n');
 for(const line of lines)if(/\bderived\b/.test(line))for(const call of line.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)){const module=from.get(call[1]);if(module)handed.add(module);}
 // A name bound to something made from the cache carries it to a call on another line: `const store={…derived…}`, then `useX(store)`.
 const carriers=new Set<string>();
 for(const line of lines)for(const bound of line.matchAll(/\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(\{[^;]*\}|[^,;]*)/g))if(bound[1]!=='derived'&&/\bderived\b/.test(bound[2]))carriers.add(bound[1]);
 for(const line of lines)for(const call of line.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(([^()]*)\)/g)){const module=from.get(call[1]);if(module&&[...carriers].some(name=>new RegExp(`\\b${name}\\b`).test(call[2])))handed.add(module);}
 return handed;
}
test('every module that fills the derived-file cache lies inside the derived identity',()=>{
 const closure=new Set(derivedModuleClosure(process.cwd())),read=(file:string)=>readFileSync(file,'utf8');
 // Modules that hold the cache without making what goes in it.
 const holders:Record<string,string>={'src/derived-file-cache.ts':'the cache itself','src/host.ts':'gives the cache its store','src/main.ts':'hands the cache to the modules that fill it',
  'src/ahead-of-time-engraving.ts':'records only which projection serves a score; every read checks that entry and the files it read again'};
 const sources=readdirSync('src',{recursive:true}).map(String).filter(f=>/\.ts$/.test(f)).map(f=>'src/'+f.split('\\').join('/'));
 for(const file of sources)if(/\bDerivedFileCache\b|derived-file-cache['"]/.test(read(file))&&!holders[file])
  assert.ok(closure.has(file),`${file} uses the derived-file cache: add it to DERIVED_ENTRY_MODULES (scripts/derived-identity.ts)`);
 // Whatever main.ts hands the cache to must be inside the identity too.
 const handed=handedModules(read('src/main.ts'));
 assert.ok(handed.has('src/personal-presentation.ts')&&handed.has('src/package.ts'),'the wiring is found');
 for(const module of handed)assert.ok(closure.has(module)||holders[module],`main.ts hands the derived-file cache to ${module}: add it to DERIVED_ENTRY_MODULES (scripts/derived-identity.ts)`);
 assert.deepEqual([...handedModules("import {useX} from './x';\nconst store={get:(key:string)=>derived.get('x',key,read)};\nuseX(store);")],['src/x.ts'],'a cache handed on through a name on another line is found');
});

test('piano pages checked once as passive ink are not parsed again; changed pages are checked as before',async()=>{
 const fixture=readFileSync(new URL('../fixtures/schumann-op68-no14.tuna',import.meta.url)),admit=(bytes:Uint8Array)=>importPackage(bytes,{allowLegacyTempo:true});
 const receipts=new Set<string>(),asked:string[]=[];
 usePianoPageCheckReceipts({has:async key=>{asked.push(key);return receipts.has(key);},add:key=>{receipts.add(key);}});
 try{
  const first=await admit(fixture);assert.equal(receipts.size,1,'checked pages leave a receipt');
  const again=await admit(fixture);assert.deepEqual(again.pages,first.pages);assert.deepEqual(again.seats,first.seats);
  assert.equal(asked.length,2);assert.equal(asked[0],asked[1]);assert.equal(receipts.size,1);
  // Active ink in a page has another key, so the receipt for the original never covers it.
  const q=await admit(fixture);delete q.files['manifest.json'];
  q.files['pages/1.svg']=strToU8(strFromU8(q.files['pages/1.svg']).replace('</svg>','<script>alert(1)</script></svg>'));
  for(const [name,bytes] of Object.entries(q.files))q.manifest.files[name]=await hashBytes(bytes);
  await assert.rejects(admit(archivePackage(q.manifest,q.files)),/active|external|unsupported/i);assert.equal(receipts.size,1);
 }finally{usePianoPageCheckReceipts(undefined);}
});

test('the library prepares the score last worked on first, and never the score just closed',()=>{
 assert.deepEqual(aheadOfTimeOrder(['a','b','c'],'b'),['b','a','b','c']);
 // Its pages are in memory, and the reader writes them itself: preparing it would race that write.
 assert.deepEqual(aheadOfTimeOrder(['a','b','c'],'b','b'),['a','c']);
 assert.deepEqual(aheadOfTimeOrder(['a','b','c'],undefined,'c'),['a','b']);
});
