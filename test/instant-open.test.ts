import test from 'node:test';
import {runInNewContext} from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync,readdirSync} from 'node:fs';
import {strToU8,strFromU8} from 'fflate';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DerivedFileCache,type DerivedFileStore} from '../src/derived-file-cache';
import {importPackage,archivePackage,hashBytes,usePianoPageCheckReceipts} from '../src/package';
import {PersonalPresentationSession,projectionServed} from '../src/personal-presentation';
import {PersonalPreparationPool} from '../src/personal-preparation-pool';
import {ProjectionWorkerClient} from '../src/personal-projection-client';
import {AheadOfTimeEngraving,preparedBefore,prepareRecorded,aheadOfTimeOrder,holdAheadOfTimeOnInput} from '../src/ahead-of-time-engraving';
import {derivedModuleClosure,viewerDerivedIdentity} from '../scripts/derived-identity';
import {sourcePackage,transferStudy} from './support/hand-edition-fixture';
import {initialPersonal} from '../src/state';
import {assigned} from '../src/personal-assignments';

const sha=(c:string)=>c.repeat(64);
function memoryStore(){
 const files=new Map<string,Uint8Array>(),reads:string[]=[];
 const store:DerivedFileStore={async read(name){reads.push(name);return files.get(name)??null;},async write(name,data){files.set(name,data);return true;}};
 return {files,reads,store};
}

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
 const steps:string[]=[],aborted:string[]=[],idles:Array<()=>void>=[];let released=0,engraved!:()=>void;
 const work=new AheadOfTimeEngraving(async(id,{signal},quiet)=>{
  const step=async(name:string)=>{await quiet();if(signal?.aborted){aborted.push(id);throw new DOMException('stop','AbortError');}steps.push(`${id} ${name}`);};
  await step('admitted');await new Promise<void>(done=>{engraved=done;});await step('engraved');await step('saved');
 },{delayMs,idle:run=>idles.push(run),release:()=>{released++;}});
 let reading:string|undefined;holdAheadOfTimeOnInput(window,()=>work,()=>reading===undefined);
 const open=async(id:string)=>{reading=id;work.yieldTo(id);await work.joined(id);};
 return {work,listeners,steps,aborted,idles,released:()=>released,engrave:()=>engraved(),open,input:(kind:string)=>listeners.get(kind)!()};
}
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
test('the click or key that opens the score under way hands its work to the reading, never throwing it away',async()=>{
 for(const kind of ['pointerdown','keydown']){
  const l=library();l.work.start(['no13','no14']);await wait(40);l.idles.shift()!();await wait(0);
  assert.deepEqual(l.steps,['no13 admitted']);
  // The press reaches the viewer's listener before the opening it causes.
  l.input('pointermove');l.input(kind);l.engrave();await wait(5);
  assert.deepEqual(l.steps,['no13 admitted'],`${kind}: input holds the work at its next step`);
  const opened=l.open('no13');await wait(5);
  assert.deepEqual(l.steps,['no13 admitted','no13 engraved','no13 saved'],`${kind}: the opening takes the work over at once`);
  await opened;assert.deepEqual(l.aborted,[],`${kind}: nothing was thrown away`);
  assert.equal(l.released(),1,'its worker is freed once the work is done');await wait(60);assert.equal(l.idles.length,0,'the rest waits for the library');
 }
 // Opening another score stops the paused work and frees its worker.
 const l=library();l.work.start(['no13']);await wait(40);l.idles.shift()!();await wait(0);l.input('pointerdown');l.engrave();
 await l.open('zelda');await wait(5);assert.deepEqual(l.aborted,['no13']);assert.equal(l.released(),1);
 // Left alone again, held work goes on by itself.
 const q=library(10);q.work.start(['no13']);await wait(20);q.idles.shift()!();await wait(0);q.input('wheel');q.engrave();await wait(30);
 assert.deepEqual(q.steps,['no13 admitted','no13 engraved','no13 saved']);
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
test('the viewer holds ahead-of-time work through its own listener and saves an engine before freeing its worker',()=>{
 const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
 assert.match(main,/holdAheadOfTimeOnInput\(window,\(\)=>aheadOfTime,\(\)=>!current&&!readingOperation\)/);
 assert.match(main,/function beginReading\([^]*?aheadOfTime\?\.yieldTo\(entryId\)/);
 assert.match(main,/await session\.project\(q\.personal\?\?personal,execution\);[^]*?await session\.flushWrites\(\);[^]*?return served\?\?null;/);
});

test('an opening cancelled with Esc, or failed, returns to a library that prepares scores again',async()=>{
 const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8'),from=main.indexOf('function finishReading('),to=main.indexOf('\nconst readerPages=',from);
 const started:string[][]=[],context:any={readingOperation:undefined,current:undefined,shownFailures:new Set(),dialog:undefined,READING_CANCELLED:'cancelled',
  closeDialog(){},options(){},button:()=>'',libraryOrder:()=>['no13','no14'],aheadOfTime:{start:(ids:string[])=>started.push(ids)}};
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
 const refuse=async(read:(name:string,digest:string|null)=>void)=>{runs++;read('journal.json',files.get('journal.json')!);throw Error("This score can't be engraved yet");};
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
