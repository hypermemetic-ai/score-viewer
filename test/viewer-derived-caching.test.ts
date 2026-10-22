import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deflateSync,strFromU8,strToU8,unzipSync,zipSync} from 'fflate';
import {DerivedFileCache,DERIVED_FILE_CACHE_LIMITS,type DerivedFileStore} from '../src/derived-file-cache';
import {validPhysicalManagedName} from '../src/managed-file-storage';
import {createProjectionHost,createHostedCore,type HostedProjectionCore} from '../src/personal-projection-host';
import {ProjectionWorkerClient,ProjectionWorkerUnavailable,type ProjectionWorkerLike} from '../src/personal-projection-client';
import type {ProjectionCoreInputs,ProjectionRequest,ProjectionResponse} from '../src/personal-projection-protocol';
import {HandPresentationError} from '../vendor/iso-notation/src/score-presentation';
import {PersonalPresentationSession,adoptImportedReading,undrawableHandOwners,cancelPersonalPrefetch,PERSONAL_PROJECTION_CACHE_KIND} from '../src/personal-presentation';
import {prepareMusicXmlScore} from '../src/musicxml-import';
import {ensurePianoReady} from '../src/piano-readiness';
import {PackageAdmissionSession} from '../src/package-admission-session';
import {PersonalPreparationPool} from '../src/personal-preparation-pool';
import {sourcePackage,transferStudy,calculatedStudy} from './support/hand-edition-fixture';
import {initialPersonal} from '../src/state';
import {assigned} from '../src/personal-assignments';
import {importPackage,selectPresentation,useReadingAdmissionReceipts,useCalculatedAdmissionEvidence,admittedWrittenHeads,hashBytes} from '../src/package';
import {calculatedAdmissionEvidence,type CalculatedAdmissionEvidence} from '../src/calculated-hand-edition';
import {readingAdmissionReceipt,type ReadingAdmissionReceipt} from '../src/reading-package';
import {authoredReadingPackage} from './support/instrument-reading-fixture';
import {PersonalMemoryLibrary,readingOnlyArchive} from '../src/personal-memory-library';
import {rebuildEdition} from '../src/edition-rebuild';
import {rememberEngravedReading,takeEngravedReading} from '../src/engraved-readings';

const sha=(c:string)=>c.repeat(64);
function memoryStore(){
 const files=new Map<string,Uint8Array>(),writes:string[]=[];
 const store:DerivedFileStore={async read(name){assert.match(name,/^[a-f0-9]{64}$/);return files.get(name)??null;},
  async write(name,data){assert.match(name,/^[a-f0-9]{64}$/);writes.push(name);files.set(name,data);return true;}};
 return {files,writes,store};
}
const object=(v:unknown)=>{if(!v||typeof v!=='object')throw Error('not an object');return v as Record<string,unknown>;};

test('derived file cache round-trips exact entries and treats any other content as a miss',async()=>{
 const {files,store}=memoryStore(),cache=new DerivedFileCache(store,'build-a');
 await cache.put('kind-a',sha('a'),{pages:['<svg/>'],n:1});
 assert.deepEqual(await cache.get('kind-a',sha('a'),object),{pages:['<svg/>'],n:1});
 assert.equal(await cache.get('kind-b',sha('a'),object),undefined,'another kind never reads the entry');
 assert.equal(await cache.get('kind-a',sha('b'),object),undefined,'another key never reads the entry');
 assert.equal(await new DerivedFileCache(store,'build-b').get('kind-a',sha('a'),object),undefined,'another build never reads the entry');
 assert.equal(await cache.get('kind-a',sha('a'),()=>{throw Error('refused');}),undefined,'a refused value is a miss');
 const [name]=files.keys();
 for(const corrupt of [new Uint8Array([1,2,3]),deflateSync(strToU8('{"format":"x"}\n{}')),files.get(name)!.slice(0,-3)]){
  files.set(name,corrupt);assert.equal(await cache.get('kind-a',sha('a'),object),undefined);
 }
 files.delete(name);assert.equal(await cache.get('kind-a',sha('a'),object),undefined,'a deleted entry costs only time');
 await assert.rejects(Promise.resolve().then(()=>new DerivedFileCache(store,'')),/identity/);
});

test('derived file cache keeps one entry per kind and key, and a refused or oversized entry is a miss',async()=>{
 const {files,store}=memoryStore(),cache=new DerivedFileCache(store,'build-a');
 for(let i=0;i<60;i++)await cache.put(i%2?'kind-a':'kind-b',(await hashBytes(String(i>>1))),{i});
 assert.equal(files.size,60,'no entry takes another one\'s place');
 for(const name of files.keys())assert.equal(validPhysicalManagedName(name),false,'entries are not managed files');
 assert.deepEqual(await cache.get('kind-b',await hashBytes('29'),object),{i:58});
 const small=new DerivedFileCache(store,'build-a',{entryBytes:4096,payloadBytes:8192}),before=[...files.keys()];
 // Random text compresses poorly: this entry exceeds its ceiling and is not written.
 assert.equal(await small.put('kind-a',sha('c'),Array.from({length:1200},()=>Math.random().toString(36))),false);
 assert.equal(await small.put('kind-a',sha('d'),'x'.repeat(9000)),false,'a payload over its ceiling');
 assert.deepEqual([...files.keys()],before);
 assert.equal(await cache.put('kind-a',sha('e'),'x'.repeat(9000)),true);
 assert.equal(await small.get('kind-a',sha('e'),v=>v),undefined,'a payload over the reader\'s ceiling is a miss');
 // A store that keeps nothing (over its budget, or the disk is low) is a miss, not an error.
 const full=new DerivedFileCache({read:async()=>null,write:async()=>false},'build-a');
 assert.equal(await full.put('kind-a',sha('a'),{}),false);assert.equal(await full.get('kind-a',sha('a'),object),undefined);
 const failing=new DerivedFileCache({read:async()=>{throw Error('io');},write:async()=>{throw Error('io');}},'build-a');
 assert.equal(await failing.put('kind-a',sha('a'),{}),false);assert.equal(await failing.get('kind-a',sha('a'),object),undefined);
});

test('a large entry, several times the largest real one, round-trips exactly',async()=>{
 const {files,store}=memoryStore(),cache=new DerivedFileCache(store,'build-a');
 // About 24 MB of poorly compressible text; a settled No. 14 engine stores about 4 MB.
 const big={pages:Array.from({length:2000},(_,i)=>i+':'+Array.from({length:1100},()=>Math.random().toString(36).slice(2)).join(''))};
 assert.equal(await cache.put('kind-a',sha('f'),big),true);
 const [stored]=[...files.values()];assert.ok(stored.byteLength>8*1024*1024,`${stored.byteLength} bytes, over the old 8 MB slot`);
 assert.deepEqual(await cache.get('kind-a',sha('f'),object),big);
});

test('the native cache keeps the same entry ceiling, a 2 GB budget and a 5 GB free-space floor',()=>{
 const rust=readFileSync(new URL('../src-tauri/src/derived_cache.rs',import.meta.url),'utf8'),main=readFileSync(new URL('../src-tauri/src/main.rs',import.meta.url),'utf8');
 assert.match(rust,/LIMITS: Limits = Limits \{ budget_bytes: 2048 \* MIB, free_space_floor_bytes: 5120 \* MIB, entry_bytes: 256 \* MIB \}/);
 assert.equal(DERIVED_FILE_CACHE_LIMITS.entryBytes,256*1024*1024);
 assert.match(main,/generate_handler!\[[^\]]*read_derived,write_derived/);assert.match(main,/fs2::available_space/);
 // Raw bytes both ways: base64 of a large entry would exhaust the reader's memory.
 assert.match(main,/fn read_derived[^\n]*->Result<tauri::ipc::Response,String>/);assert.match(main,/InvokeBody::Raw/);
 const host=readFileSync(new URL('../src/host.ts',import.meta.url),'utf8');
 assert.match(host,/invoke<ArrayBuffer>\('read_derived',\{key\}\)/);assert.match(host,/invoke<boolean>\('write_derived',data,\{headers:\{'derived-key':key\}\}\)/);
 // The earlier fixed slots are no longer managed names; the native side removes them.
 const managed=readFileSync(new URL('../src-tauri/src/managed_files.rs',import.meta.url),'utf8');
 assert.doesNotMatch(managed,/strip_prefix\("viewer-derived-cache-v1-slot-"\)/);
 assert.equal(validPhysicalManagedName('viewer-derived-cache-v1-slot-0.bin'),false);
 assert.match(rust,/viewer-derived-cache-v1-slot-\{slot\}\.bin/);
});

/** An in-process stand-in for the module worker: messages are cloned both ways. */
function fakeWorker(create:(inputs:ProjectionCoreInputs)=>HostedProjectionCore,log:ProjectionRequest[]=[]){
 let spawned=0;
 const spawn=():ProjectionWorkerLike=>{
  spawned++;let alive=true;
  const worker:ProjectionWorkerLike={onmessage:null,onerror:null,
   postMessage(message){log.push(structuredClone(message));void host.handle(structuredClone(message));},terminate(){alive=false;}};
  const host=createProjectionHost(response=>{const data=structuredClone(response);setTimeout(()=>{if(alive)worker.onmessage?.({data} as MessageEvent<ProjectionResponse>);});},{create});
  return worker;
 };
 return {spawn,log,spawned:()=>spawned};
}
const stubInputs={source:{} as any,baseline:{} as any,recipe:{} as any};
function stubCore(counts:{warms:number;projects:number},refuse=false):HostedProjectionCore {
 return {async warmAsync(e){counts.warms++;e?.onCheckpoint?.('layout');},
  async projectAsync(owners,digest){counts.projects++;if(refuse)throw new HandPresentationError('unsupported-fit','no room',[owners[0]?.id??'x']);
   return {score:{notes:[]} as any,pages:['p:'+digest],seats:[],annotationGeometry:{version:'annotation-carrier-geometry-v1',presentationIdentity:digest,coverage:'owned-head-and-duration',seats:[]}};}};
}

test('projection worker client sends core inputs once, recreates a forgotten core and keeps refused cores',async()=>{
 const counts={warms:0,projects:0};let cores=0,refuse=false;
 const worker=fakeWorker(()=>{cores++;const ok=stubCore(counts),no=stubCore(counts,true);return {warmAsync:e=>ok.warmAsync(e),projectAsync:(o,d,e)=>(refuse?no:ok).projectAsync(o,d,e)};});
 const client=new ProjectionWorkerClient(worker.spawn),stages:string[]=[];
 await client.warm('core-1',stubInputs,{onCheckpoint:s=>stages.push(s)});
 assert.deepEqual(stages,['layout']);
 const view=await client.project('core-1',stubInputs,[{id:'n',pitch:60,startTick:0,durationTicks:1,hand:'RH'}],'d1');
 assert.deepEqual(view.pages,['p:d1']);assert.equal(cores,1);
 assert.ok(worker.log[0].create&&!worker.log[1].create,'inputs travel only with the first request');
 refuse=true;
 await assert.rejects(client.project('core-1',stubInputs,[{id:'n',pitch:60,startTick:0,durationTicks:1,hand:'LH'}],'d2'),
  (e:unknown)=>e instanceof HandPresentationError&&e.code==='unsupported-fit'&&e.ownerIds[0]==='n');
 refuse=false;await client.project('core-1',stubInputs,[],'d3');assert.equal(cores,1,'a refusal keeps the settled core');
 // A host that forgot the core answers "missing"; the client sends the inputs again.
 const forgetful=fakeWorker(()=>{cores++;return stubCore(counts);}),c2=new ProjectionWorkerClient(forgetful.spawn);
 await c2.project('other',stubInputs,[],'d0');(c2 as any).known.add('core-2');
 await c2.project('core-2',stubInputs,[],'d4');
 assert.deepEqual(forgetful.log.filter(m=>m.key==='core-2').map(m=>!!m.create),[false,true]);
});

test('cancelling projection work stops the worker; a worker that never answers is unavailable',async()=>{
 const counts={warms:0,projects:0};
 let release!:()=>void;const gate=new Promise<void>(r=>{release=r;});
 const worker=fakeWorker(()=>({async warmAsync(){await gate;counts.warms++;},projectAsync:stubCore(counts).projectAsync}));
 const client=new ProjectionWorkerClient(worker.spawn),controller=new AbortController();
 const warming=client.warm('core',stubInputs,{signal:controller.signal});controller.abort();
 await assert.rejects(warming,{name:'AbortError'});release();
 await client.project('core',stubInputs,[],'d');assert.equal(worker.spawned(),2,'a fresh worker continues after cancellation');
 const broken=new ProjectionWorkerClient(()=>{const w:ProjectionWorkerLike={onmessage:null,onerror:null,postMessage(){setTimeout(()=>w.onerror?.(new Event('error')));},terminate(){}};return w;});
 await assert.rejects(broken.warm('core',stubInputs),ProjectionWorkerUnavailable);assert.equal(broken.available,false);
 await assert.rejects(broken.warm('core',stubInputs),ProjectionWorkerUnavailable);
 const unbuildable=new ProjectionWorkerClient(()=>{throw Error('no module workers');});
 await assert.rejects(unbuildable.warm('core',stubInputs),ProjectionWorkerUnavailable);
});

/** Idle-time writes land after a worker round trip; wait for them, not a timer. */
async function written(cache:DerivedFileCache,files:Map<string,Uint8Array>,count:number){
 for(let i=0;i<500&&files.size<count;i++){await new Promise(r=>setTimeout(r,10));await cache.flush();}
 await cache.flush();
}
/** A projection lost from the disk, as when the cache drops it to stay within its budget. */
class EvictedProjections extends DerivedFileCache {
 override get<T>(kind:string,key:string,validate:(value:unknown)=>T){return kind===PERSONAL_PROJECTION_CACHE_KIND?Promise.resolve(undefined):super.get(kind,key,validate);}
}

test('worker projection and the disk cache give the same view as the reader thread, and reopening reads the cache',async()=>{
 const {p,bytes}=await sourcePackage(transferStudy()),reopened=await importPackage(bytes);
 const seat=p.seats.find(s=>s.ownerIds.includes('gesture-1'))!,choice=assigned(p,initialPersonal(p),seat,{hand:'RH'});
 const local=await new PersonalPresentationSession(p,new PersonalPreparationPool<any>(),{worker:null,cache:null}).project(choice);
 const log:ProjectionRequest[]=[],worker=fakeWorker(createHostedCore,log),{files,store}=memoryStore(),cache=new DerivedFileCache(store,'build-a');
 const first=new PersonalPresentationSession(p,new PersonalPreparationPool<any>(),{worker:new ProjectionWorkerClient(worker.spawn),cache,cacheWriteDelayMs:0});
 const viaWorker=await first.project(choice);await written(cache,files,2);
 assert.deepEqual(viaWorker.pages,local.pages);assert.deepEqual(viaWorker.seats,local.seats);assert.deepEqual(viaWorker.score,local.score);
 assert.deepEqual(viaWorker.annotationGeometry,local.annotationGeometry);assert.ok(Object.isFrozen(viaWorker.pages)||Object.isFrozen(viaWorker.score));
 // The projection and the settled engine behind it, each its own entry.
 // The choice moves one owner; the others keep the score's hands and carry no marker.
 assert.deepEqual(log.map(m=>m.kind),['project','save']);assert.equal(files.size,2);const requests=log.length;
 const reopenedSeat=reopened.seats.find(s=>s.ownerIds.includes('gesture-1'))!,again=assigned(reopened,initialPersonal(reopened),reopenedSeat,{hand:'RH'});
 const second=new PersonalPresentationSession(reopened,new PersonalPreparationPool<any>(),{worker:new ProjectionWorkerClient(worker.spawn),cache});
 const cached=await second.project(again);
 assert.equal(log.length,requests,'a cached projection runs no engraving');
 assert.deepEqual(cached.pages,local.pages);assert.deepEqual(cached.score,local.score);assert.deepEqual(cached.annotationGeometry,local.annotationGeometry);
 // A corrupt entry is recomputed and written again.
 for(const name of files.keys())files.set(name,new Uint8Array([9]));
 const third=await new PersonalPresentationSession(reopened,new PersonalPreparationPool<any>(),{worker:new ProjectionWorkerClient(worker.spawn),cache}).project(again);
 assert.ok(log.length>requests);assert.deepEqual(third.pages,local.pages);
});

test('reopening resumes hand editing from the saved engine instead of engraving again',async()=>{
 const {p}=await sourcePackage(transferStudy()),{files,store}=memoryStore(),cache=new DerivedFileCache(store,'build-a');
 const seat=p.seats.find(s=>s.ownerIds.includes('gesture-1'))!,choice=assigned(p,initialPersonal(p),seat,{hand:'RH'});
 const local=await new PersonalPresentationSession(p,new PersonalPreparationPool<any>(),{worker:null,cache:null}).project(choice);
 const restores:boolean[]=[],spying=(inputs:ProjectionCoreInputs)=>{
  const core=createHostedCore(inputs),restore=core.restoreAsync!;
  return Object.assign(core,{restoreAsync:async(...a:Parameters<typeof restore>)=>{const r=await restore(...a);restores.push(r);return r;}});
 };
 const first=fakeWorker(spying),opened=new PersonalPresentationSession(p,new PersonalPreparationPool<any>(),{worker:new ProjectionWorkerClient(first.spawn),cache,cacheWriteDelayMs:0});
 opened.prefetch();await opened.ensureHandChoicesDrawable();await written(cache,files,1);
 // The prefetch and the drawable check each ask for a warm; only the one that
 // engraved saves the engine.
 assert.deepEqual(first.log.map(m=>m.kind),['warm','warm','save']);assert.equal((first.log[0] as {saved?:unknown}).saved,undefined);
 // Another session, worker and pool: the saved engine settles it, and its
 // hand choices draw exactly as a cold engraving draws them.
 const second=fakeWorker(spying),reopened=new PersonalPresentationSession(p,new PersonalPreparationPool<any>(),{worker:new ProjectionWorkerClient(second.spawn),cache,cacheWriteDelayMs:0});
 reopened.prefetch();await reopened.ensureHandChoicesDrawable();
 assert.deepEqual(restores,[true]);assert.equal(second.log[0].kind,'warm');assert.ok((second.log[0] as {saved?:unknown}).saved);
 const view=await reopened.project(choice);
 assert.deepEqual(view.pages,local.pages);assert.deepEqual(view.seats,local.seats);assert.deepEqual(view.score,local.score);assert.deepEqual(view.annotationGeometry,local.annotationGeometry);
 assert.deepEqual(second.log.map(m=>m.kind),['warm','warm','project'],'a restored engine is not saved again');
 // A projection lost from the disk (dropped to stay within the budget) still
 // resumes from the saved engine: restore, then place only the choice.
 const third=fakeWorker(spying),direct=new PersonalPresentationSession(p,new PersonalPreparationPool<any>(),{worker:new ProjectionWorkerClient(third.spawn),cache:new EvictedProjections(store,'build-a'),cacheWriteDelayMs:0});
 assert.deepEqual((await direct.project(choice)).pages,local.pages);
 assert.deepEqual(third.log.map(m=>m.kind),['warm','project']);assert.ok((third.log[0] as {saved?:unknown}).saved);assert.deepEqual(restores,[true,true]);
 // On the reader's thread too.
 const here=new PersonalPresentationSession(p,new PersonalPreparationPool<any>(),{worker:null,cache});
 await here.warm();assert.deepEqual((await here.project(choice)).pages,local.pages);
});

const musicXml=readFileSync(new URL('./fixtures/musicxml/two-staff-piano.musicxml',import.meta.url));
const musicXmlAssets={font:{name:'fonts/URWGothic-Demi.otf',bytes:readFileSync(new URL('../src/URWGothic-Demi.otf',import.meta.url))},
 notices:Object.fromEntries(['URW-base35-COPYING','URW-base35-LICENSE','URW-base35-provenance.md'].map(name=>['licenses/'+name,readFileSync(new URL('../licenses/'+name,import.meta.url))]))};
test('an imported score hands its reading engrave to hand editing, which engraves nothing again',async()=>{
 const prepared=await prepareMusicXmlScore(musicXml,musicXmlAssets),admission=new PackageAdmissionSession();
 // The package the import opens on the player's layout.
 const ready=await ensurePianoReady({packageBytes:prepared.bytes,layout:'conventional-piano',signal:new AbortController().signal},admission);
 assert.ok('package' in ready);const p=ready.package;
 const seat=p.seats.find(s=>s.ownerIds.some(id=>p.score.notes.find(n=>n.id===id)?.hand==='RH'))!,choice=assigned(p,initialPersonal(p),seat,{hand:'LH'});
 const cold=await new PersonalPresentationSession(p,new PersonalPreparationPool<any>(),{worker:null,cache:null}).project(choice);
 // Another score's reading is refused.
 const {files,store}=memoryStore(),cache=new DerivedFileCache(store,'build-a'),other=await sourcePackage(transferStudy());
 assert.equal(await adoptImportedReading(other.p,prepared.reading),false);
 assert.equal(await adoptImportedReading(p,prepared.reading),true);
 const restores:boolean[]=[],warms:number[]=[],spying=(inputs:ProjectionCoreInputs)=>{
  const core=createHostedCore(inputs),restore=core.restoreAsync!,warm=core.warmAsync;
  return Object.assign(core,{restoreAsync:async(...a:Parameters<typeof restore>)=>{const r=await restore(...a);restores.push(r);return r;},
   // A warm of a settled core does nothing; only one that engraves counts.
   warmAsync:async(...a:Parameters<typeof warm>)=>{if(!core.exportState!())warms.push(1);return warm(...a);}});
 };
 // An equal package that isn't the one the import opened engraves its own.
 const again=await ensurePianoReady({packageBytes:prepared.bytes,layout:'conventional-piano',signal:new AbortController().signal},new PackageAdmissionSession());
 assert.ok('package' in again&&again.package!==p);
 const stranger=fakeWorker(createHostedCore),distinct=new PersonalPresentationSession(again.package,new PersonalPreparationPool<any>(),{worker:new ProjectionWorkerClient(stranger.spawn),cache:null});
 distinct.prefetch();await distinct.ensureHandChoicesDrawable();
 assert.equal(stranger.log[0]?.kind,'warm');assert.equal((stranger.log[0] as {saved?:unknown}).saved,undefined);
 // The session that opens the import resumes from the adopted engine, and saves it.
 const first=fakeWorker(spying),opened=new PersonalPresentationSession(p,new PersonalPreparationPool<any>(),{worker:new ProjectionWorkerClient(first.spawn),cache,cacheWriteDelayMs:0});
 opened.prefetch();await opened.ensureHandChoicesDrawable();await written(cache,files,1);
 assert.deepEqual(restores,[true]);assert.deepEqual(warms,[]);assert.ok((first.log[0] as {saved?:unknown}).saved);
 assert.deepEqual(first.log.map(m=>m.kind),['warm','warm','save']);
 const view=await opened.project(choice);
 assert.deepEqual(view.pages,cold.pages);assert.deepEqual(view.seats,cold.seats);assert.deepEqual(view.score,cold.score);assert.deepEqual(view.annotationGeometry,cold.annotationGeometry);
 // The session took the engine from memory; a later one reads it from the
 // disk (its projection dropped, so it must resume the engine).
 const second=fakeWorker(spying),reopened=new PersonalPresentationSession(p,new PersonalPreparationPool<any>(),{worker:new ProjectionWorkerClient(second.spawn),cache:new EvictedProjections(store,'build-a'),cacheWriteDelayMs:0});
 assert.deepEqual((await reopened.project(choice)).pages,cold.pages);assert.deepEqual(restores,[true,true]);assert.deepEqual(warms,[]);
 // With nothing kept, the choice is engraved from the score, as before.
 const third=fakeWorker(spying),none=new PersonalPresentationSession(p,new PersonalPreparationPool<any>(),{worker:new ProjectionWorkerClient(third.spawn),cache:null});
 assert.deepEqual((await none.project(choice)).pages,cold.pages);assert.deepEqual(third.log.map(m=>m.kind),['project']);assert.deepEqual(restores,[true,true]);
});

test('an edition engraved again hands its reading engrave to hand editing, which engraves nothing again',async()=>{
 // A saved edition whose pages no longer reproduce at the ISO pin.
 const stale=new Uint8Array(readFileSync(new URL('../fixtures/authored-calculated-preparation-v2.tuna',import.meta.url)));
 const rebuilt=await rebuildEdition(stale,{refusal:Error('refused')}),p=await selectPresentation(await importPackage(rebuilt.bytes),'conventional-piano');
 const seat=p.seats.find(s=>s.ownerIds.length===1&&p.score.notes.find(n=>n.id===s.ownerIds[0])?.hand==='RH')!,choice=assigned(p,initialPersonal(p),seat,{hand:'LH'});
 const restores:boolean[]=[],warms:number[]=[],spying=(inputs:ProjectionCoreInputs)=>{
  const core=createHostedCore(inputs),restore=core.restoreAsync!,warm=core.warmAsync;
  return Object.assign(core,{restoreAsync:async(...a:Parameters<typeof restore>)=>{const r=await restore(...a);restores.push(r);return r;},
   warmAsync:async(...a:Parameters<typeof warm>)=>{if(!core.exportState!())warms.push(1);return warm(...a);}});
 };
 // Hand editing that starts and is stopped at once keeps the engrave for later.
 const first=fakeWorker(spying),opened=new PersonalPresentationSession(p,new PersonalPreparationPool<any>(),{worker:new ProjectionWorkerClient(first.spawn),cache:null});
 opened.prefetch();cancelPersonalPrefetch();await new Promise(r=>setTimeout(r,50));
 // The first hand choice resumes from the adopted engrave and places only the choice.
 const view=await opened.project(choice);
 assert.deepEqual(restores,[true]);assert.deepEqual(warms,[]);
 assert.deepEqual(first.log.filter(m=>m.kind!=='save').map(m=>m.kind),['warm','project']);assert.ok((first.log[0] as {saved?:unknown}).saved);
 // The engrave is taken once: another session of the edition engraves the choice, and draws the same pages.
 const second=fakeWorker(spying),cold=new PersonalPresentationSession(p,new PersonalPreparationPool<any>(),{worker:new ProjectionWorkerClient(second.spawn),cache:null});
 const fresh=await cold.project(choice);assert.deepEqual(second.log.map(m=>m.kind),['project']);assert.deepEqual(restores,[true]);
 assert.notDeepEqual(view.pages,p.pages);
 assert.deepEqual(view.pages,fresh.pages);assert.deepEqual(view.seats,fresh.seats);assert.deepEqual(view.score,fresh.score);assert.deepEqual(view.annotationGeometry,fresh.annotationGeometry);
});

test('only the latest reading engraves are kept, each for the pages it made',()=>{
 const recipe=(n:number)=>({sourceSha256:sha('a'),baseline:{pageSha256:[sha(String(n))],seatSha256:sha('s')}}),reading=(n:number)=>({score:{id:n},layouts:[],rawPages:[]}) as any;
 for(const n of [1,2,3])rememberEngravedReading(recipe(n),reading(n));
 assert.equal(takeEngravedReading(recipe(1)),undefined,'the oldest is let go');
 assert.equal(takeEngravedReading({...recipe(2),sourceSha256:sha('b')}),undefined,'another source never takes it');
 assert.equal(takeEngravedReading(recipe(2))?.score.id,2);assert.equal(takeEngravedReading(recipe(2)),undefined,'taken once');
 assert.equal(takeEngravedReading(recipe(3))?.score.id,3);assert.equal(takeEngravedReading(undefined),undefined);
});

test('prefetch settles the engraving only in a worker and never without one',async()=>{
 const {p}=await sourcePackage(transferStudy());
 const log:ProjectionRequest[]=[],worker=fakeWorker(createHostedCore,log);
 const session=new PersonalPresentationSession(p,new PersonalPreparationPool<any>(),{worker:new ProjectionWorkerClient(worker.spawn),cache:null});
 session.prefetch();session.prefetch();
 const seat=p.seats.find(s=>s.ownerIds.includes('gesture-1'))!;
 await session.project(assigned(p,initialPersonal(p),seat,{hand:'RH'}));
 assert.deepEqual(log.map(m=>m.kind),['warm','project']);
 const pool=new PersonalPreparationPool<any>();
 new PersonalPresentationSession(p,pool,{worker:null,cache:null}).prefetch();
 await new Promise(r=>setTimeout(r,10));assert.equal(pool.retained.entries,0);
});

test('reading admission reuses a receipt for the exact archive bytes and replays without one',async()=>{
 const bytes=await authoredReadingPackage(),stored=new Map<string,ReadingAdmissionReceipt>();let gets=0;
 useReadingAdmissionReceipts({get:async sha=>{gets++;const r=stored.get(sha);return r?readingAdmissionReceipt(structuredClone(r)):undefined;},put:(sha,r)=>{stored.set(sha,r);}});
 try{
  const cold=await importPackage(bytes);assert.equal(stored.size,1);assert.equal([...stored.keys()][0],cold.archiveSha256);
  const warm=await importPackage(bytes);assert.equal(gets,2);
  assert.deepEqual(warm.pages,cold.pages);assert.deepEqual(warm.reading,cold.reading);assert.deepEqual(warm.score,cold.score);assert.equal(warm.archiveSha256,cold.archiveSha256);
  // A changed archive has another digest and is replayed (and refused) as before.
  const files=unzipSync(bytes),page=Object.keys(files).find(n=>n.endsWith('.svg'))!;files[page]=strToU8('<svg/>');
  await assert.rejects(importPackage(zipSync(files)));
  assert.throws(()=>readingAdmissionReceipt({version:'reading-admission-receipt-v1',geometryEvidence:{ok:false,violations:[]}}));
 }finally{useReadingAdmissionReceipts(undefined);}
});

test('calculated admission reuses evidence for the exact archive bytes and replays without it',async()=>{
 const original=await sourcePackage(transferStudy()),q=await calculatedStudy(original.p,'janko-four-row',{'gesture-0':'LH','gesture-1':'RH','gesture-2':'LH','melody-entrance':'RH'});
 const stored=new Map<string,CalculatedAdmissionEvidence>();let gets=0;
 useCalculatedAdmissionEvidence({get:async key=>{gets++;const e=stored.get(key);return e?calculatedAdmissionEvidence(structuredClone(e)):undefined;},put:(key,e)=>{stored.set(key,e);}});
 try{
  const cold=await importPackage(q.bytes,{keyboardLayout:'janko-four-row'});assert.equal(stored.size,1);assert.equal(gets,1);
  const [key]=stored.keys(),evidence=stored.get(key)!;
  assert.deepEqual(evidence.receipt,cold.calculatedHandReceipt);
  // Marked evidence shows the reopened edition took the stored heads, not a replay's.
  evidence.writtenHeads=evidence.writtenHeads.map(h=>({...h,headIds:['stored-'+h.headIds[0]]}));
  const warm=await importPackage(q.bytes,{keyboardLayout:'janko-four-row'});assert.equal(gets,2);
  assert.deepEqual(warm.pages,cold.pages);assert.deepEqual(warm.seats,cold.seats);assert.deepEqual(warm.score,cold.score);
  assert.deepEqual(warm.calculatedHandReceipt,cold.calculatedHandReceipt);assert.deepEqual(warm.annotationGeometry,cold.annotationGeometry);
  assert.ok([...admittedWrittenHeads(warm)!.values()].every(ids=>ids.length===1&&ids[0].startsWith('stored-')));
  // Evidence for another receipt is not this edition's: it replays and is replaced.
  stored.set(key,{...evidence,receipt:{...evidence.receipt,outputIdentity:{...evidence.receipt.outputIdentity,seatSha256:'0'.repeat(64)}}});
  const replayed=await importPackage(q.bytes,{keyboardLayout:'janko-four-row'});
  assert.ok([...admittedWrittenHeads(replayed)!.values()].every(ids=>!ids[0].startsWith('stored-')));
  assert.deepEqual(stored.get(key)!.receipt,cold.calculatedHandReceipt);
  // Evidence whose heads are not this edition's seats replays too, as does a store that fails.
  const fresh=structuredClone(stored.get(key)!);
  stored.set(key,{...fresh,writtenHeads:fresh.writtenHeads.map(h=>({...h,x:h.x+1,headIds:['stored-'+h.headIds[0]]}))});
  const reseated=await importPackage(q.bytes,{keyboardLayout:'janko-four-row'});
  assert.ok([...admittedWrittenHeads(reseated)!.values()].every(ids=>!ids[0].startsWith('stored-')));
  assert.deepEqual(stored.get(key),fresh);
  useCalculatedAdmissionEvidence({get:async()=>{throw Error('unreadable');},put:()=>{}});
  assert.deepEqual((await importPackage(q.bytes,{keyboardLayout:'janko-four-row'})).pages,cold.pages);
  // A changed archive has another digest and is replayed (and refused) as before.
  const files=unzipSync(q.bytes),page=Object.keys(files).find(n=>n.endsWith('.svg'))!;files[page]=strToU8(strFromU8(files[page]).replace('<svg','<svg data-x="1"'));
  await assert.rejects(importPackage(zipSync(files),{keyboardLayout:'janko-four-row'}));
  assert.throws(()=>calculatedAdmissionEvidence({...evidence,extra:1}));
  assert.throws(()=>calculatedAdmissionEvidence({...evidence,writtenHeads:[{ownerIds:'a',headIds:[]}]}));
 }finally{useCalculatedAdmissionEvidence(undefined);}
});

test('the personal memory scan skips reading packages from their manifest alone',async()=>{
 const reading=await authoredReadingPackage();assert.equal(readingOnlyArchive(reading),true);
 const {bytes:piano}=await sourcePackage(transferStudy());assert.equal(readingOnlyArchive(piano),false);
 assert.equal(readingOnlyArchive(new Uint8Array([1,2,3])),false);
 const entries=[{id:'r',file:'package-'+sha('a')+'.tuna'}] as any[],stored=new Map([[entries[0].file,reading]]);let admitted=0;
 const library=new PersonalMemoryLibrary({read:async name=>name==='library.json'?strToU8(JSON.stringify({version:1,entries})):stored.get(name)??null},()=>entries,async b=>{admitted++;return importPackage(b);});
 assert.deepEqual(await library.scan(),[]);assert.equal(admitted,0);
});

test('a projection made after earlier choices equals a cold projection of the same choices',async()=>{
 const {p}=await sourcePackage(transferStudy());
 const first=p.seats.find(s=>s.ownerIds.includes('gesture-1'))!,second=p.seats.find(s=>!s.ownerIds.includes('gesture-1')&&s.ownerIds.length)!;
 const own=p.score.notes.find(n=>second.ownerIds.includes(n.id))!.hand;
 const one=assigned(p,initialPersonal(p),first,{hand:'RH'}),two=assigned(p,one,second,{hand:own==='RH'?'LH':'RH'});
 const editing=new PersonalPresentationSession(p,new PersonalPreparationPool<any>(),{worker:null,cache:null});
 await editing.project(one);const incremental=await editing.project(two);
 const cold=await new PersonalPresentationSession(p,new PersonalPreparationPool<any>(),{worker:null,cache:null}).project(two);
 assert.deepEqual(incremental.pages,cold.pages);assert.deepEqual(incremental.score,cold.score);
 assert.deepEqual(incremental.seats,cold.seats);assert.deepEqual(incremental.annotationGeometry,cold.annotationGeometry);
});

test('a score whose own engraving is refused says so instead of blaming a hand choice; without a worker it settles on open',async()=>{
 const {p}=await sourcePackage(transferStudy());
 const refuse=()=>new HandPresentationError('unsupported-fit','Engraving lint failed: collision',['gesture-1']);
 const worker=fakeWorker(()=>({async warmAsync(){throw refuse();},async projectAsync(){throw refuse();}}));
 const session=new PersonalPresentationSession(p,new PersonalPreparationPool<any>(),{worker:new ProjectionWorkerClient(worker.spawn),cache:null});
 assert.equal(session.settlesOnOpen,false);
 // A hand choice is refused before it is saved.
 await assert.rejects(new PersonalPresentationSession(p,new PersonalPreparationPool<any>(),{worker:new ProjectionWorkerClient(worker.spawn),cache:null}).ensureHandChoicesDrawable(),/can't be displayed yet/);
 const drawable=new PersonalPresentationSession(p,new PersonalPreparationPool<any>(),{worker:new ProjectionWorkerClient(fakeWorker(createHostedCore).spawn),cache:null});
 assert.equal(await drawable.ensureHandChoicesDrawable(),true);assert.equal(await drawable.ensureHandChoicesDrawable(),true);
 // Opening another score stops a running check; it settles nothing and admits no choice.
 const stalled=new PersonalPresentationSession(p,new PersonalPreparationPool<any>(),{worker:new ProjectionWorkerClient(fakeWorker(()=>({warmAsync:()=>new Promise(()=>{}),async projectAsync(){throw refuse();}})).spawn),cache:null});
 const stopped=stalled.ensureHandChoicesDrawable();await new Promise(r=>setTimeout(r,20));
 assert.equal(stalled.checkingHandChoices,true);cancelPersonalPrefetch();
 assert.equal(await stopped,false);assert.equal(stalled.checkingHandChoices,false);
 const seat=p.seats.find(s=>s.ownerIds.includes('gesture-1'))!;
 await assert.rejects(session.project(assigned(p,initialPersonal(p),seat,{hand:'RH'})),
  (e:unknown)=>e instanceof Error&&/can't be displayed yet/.test(e.message)&&undrawableHandOwners(e)===undefined);
 assert.equal(new PersonalPresentationSession(p,new PersonalPreparationPool<any>(),{worker:null,cache:null}).settlesOnOpen,true);
});

test('a checkpoint that refuses to continue stops the worker like cancellation',async()=>{
 const counts={warms:0,projects:0},worker=fakeWorker(()=>stubCore(counts)),client=new ProjectionWorkerClient(worker.spawn);
 await assert.rejects(client.warm('core',stubInputs,{onCheckpoint:()=>{throw new DOMException('superseded','AbortError');}}),{name:'AbortError'});
 await client.project('core',stubInputs,[],'d');assert.equal(worker.spawned(),2);
});
