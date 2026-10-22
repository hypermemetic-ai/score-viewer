import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {strToU8,strFromU8} from 'fflate';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DerivedFileCache,type DerivedFileStore} from '../src/derived-file-cache';
import {importPackage,archivePackage,hashBytes,usePianoPageCheckReceipts} from '../src/package';
import {PersonalPresentationSession,projectionServed} from '../src/personal-presentation';
import {PersonalPreparationPool} from '../src/personal-preparation-pool';
import {AheadOfTimeEngraving} from '../src/ahead-of-time-engraving';
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
 // A list replaced before its quiet moment never starts.
 const late=new AheadOfTimeEngraving(async id=>{started.push('late:'+id);},{delayMs:5});
 late.start(['x']);late.stop();await new Promise(r=>setTimeout(r,20));
 assert.ok(!started.includes('late:x'));
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
