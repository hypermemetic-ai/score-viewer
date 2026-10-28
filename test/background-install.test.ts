import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {importPackage,readEditionContent,selectPresentation,type ScorePackage} from '../src/package';
import {packageFile,prepareCompletedEdition,prepareRebuiltEdition,type RebuiltInstall} from '../src/edition-rebuild';
import {installEdition,type EditionLibrary} from '../src/edition-install';
import {engravedAgainOf,joinedNotice,laterLayouts,type EngravedAgainEntry} from '../src/engraved-again-entry';
import {engravedAgainFromRecord,engravedAgainRecord,NotEngravedYet,useEngravedAgainStore,type EngravedAgainStore} from '../src/engraved-again';
import {AheadOfTimeEngraving} from '../src/ahead-of-time-engraving';
import {collectionId,fingerFor,initialPersonal,personalStorageName,practiceStorageName,readPersonal,type Entry,type PersonalState} from '../src/state';
import {assigned,handFor} from '../src/personal-assignments';
import {initialPractice,planPractice} from '../src/practice';
import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';

// A saved edition the current engraving no longer reproduces: Conventional
// shows calculated hands with printed fingers, Jankó the source's own hands.
const bytes=new Uint8Array(readFileSync(new URL('../fixtures/authored-calculated-preparation-v2.tuna',import.meta.url))),
 content=await readEditionContent(bytes),id=collectionId(content),file=await packageFile(bytes),refusal=Error('refused'),
 earlier={'conventional-piano':await selectPresentation(content,'conventional-piano'),'janko-four-row':await selectPresentation(content,'janko-four-row')} as Record<PhysicalKeyboardId,ScorePackage>,
 encode=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value)),decode=(b:Uint8Array)=>JSON.parse(new TextDecoder().decode(b));

// The player's own journal on each layout: another hand and finger for one note, and a reading place.
const journal=(layout:PhysicalKeyboardId,finger:number)=>{
 const view=earlier[layout],seat=view.seats.find(s=>s.ownerIds.length===1)!,owner=seat.ownerIds[0],
  hand=handFor(view,initialPersonal(view),owner)==='LH'?'RH':'LH',personal:PersonalState=assigned(view,initialPersonal(view),seat,{hand,finger});
 personal.view.page=Math.max(...view.seats.map(s=>s.page));return {owner,hand,finger,personal};
};
const own={'conventional-piano':journal('conventional-piano',4),'janko-four-row':journal('janko-four-row',2)} as const;
const journalFile=(c:string)=>`state-version-${c.repeat(64)}.json`;
const entry:Entry={id,file,metadata:content.manifest.metadata,importedAt:'2026-10-17T00:00:00.000Z',
 personalFiles:{[personalStorageName(id,earlier['conventional-piano'])]:journalFile('c'),[personalStorageName(id,earlier['janko-four-row'])]:journalFile('d')}};
/** The player's library before any install: the earlier edition, its journals, practice on both layouts. */
function savedLibrary(){
 const stored=new Map<string,Uint8Array>([[file,bytes],[journalFile('c'),encode(own['conventional-piano'].personal)],[journalFile('d'),encode(own['janko-four-row'].personal)]]);
 for(const layout of ['conventional-piano','janko-four-row'] as const){
  const plan=planPractice(earlier[layout]),practice=initialPractice(plan);practice.best[plan.chunks[0].pattern]=practice.target;
  stored.set(practiceStorageName(id,earlier[layout]),encode(practice));
 }
 stored.set('library.json',encode({version:1,entries:[entry]}));
 return stored;
}
const copy=(stored:Map<string,Uint8Array>)=>new Map([...stored].map(([name,b])=>[name,new Uint8Array(b)]));
/** The viewer's library over `stored`: one write at a time, the library pointer last. From the `crashAt`-th write on nothing is written, as when the power goes out. */
function library(stored:Map<string,Uint8Array>,crashAt?:number){
 let entries:Entry[]=decode(stored.get('library.json')!).entries,writes=0,queue=Promise.resolve();
 const lib:EditionLibrary={
  host:{read:async name=>stored.get(name)??null,write:async(name,data)=>{writes++;if(crashAt!==undefined&&writes>=crashAt)throw Error('The power went out.');stored.set(name,new Uint8Array(data));}},
  entries:()=>entries,commit:next=>{entries=next;},
  enqueue:op=>{const result=queue.then(op);queue=result.then(()=>{},()=>{});return result;},
  admit:b=>importPackage(b,{allowLegacyTempo:true}),layout:()=>'janko-four-row'};
 return {lib,writes:()=>writes,entries:()=>entries};
}
/** Engravings kept as the derived-file cache keeps them, as the library's worker leaves them. */
function keptEngravings():EngravedAgainStore{
 const kept=new Map<string,string>();
 return {get:async key=>{const r=kept.get(key);return r===undefined?undefined:engravedAgainFromRecord(JSON.parse(r));},put:(key,engraved)=>{kept.set(key,JSON.stringify(engravedAgainRecord(engraved)));}};
}
const store=keptEngravings();useEngravedAgainStore(store);
const host=(stored:Map<string,Uint8Array>)=>({read:async(name:string)=>stored.get(name)??null});
const install=(lib:EditionLibrary,at:Entry,r:RebuiltInstall,record?:()=>Omit<EngravedAgainEntry,'edition'>|undefined,live:()=>boolean=()=>true)=>
 installEdition(lib,{entry:at,q:{packageBytes:r.packageBytes,package:r.package,personal:r.personal},personal:r.personal,rebuilt:r,...(record?{engravedAgain:record}:{}),live});
const said=(r:RebuiltInstall)=>({hands:r.hands,fingers:r.fingers,left:r.left,practiceLeft:r.practiceLeft??0});

// What the library's worker leaves: the layout in use engraved first, then the other from the same earlier edition.
const saved=savedLibrary();
const first=await prepareRebuiltEdition(host(saved),entry,file,bytes,'janko-four-row',{refusal,layouts:['janko-four-row']});
/** Every file the saved library names, byte for byte. */
function named(stored:Map<string,Uint8Array>,at:Entry){
 const names=[at.file,...(at.retainedPackages??[]),...Object.values(at.personalFiles??{}),...Object.values(at.editionPersonalFiles??{}).flatMap(m=>Object.values(m)),
  ...['conventional-piano','janko-four-row'].map(l=>practiceStorageName(id,earlier[l as PhysicalKeyboardId])),'library.json'];
 return new Map(names.map(name=>[name,stored.get(name)]));
}

test('the layout in use is engraved and installed first, the other later from the earlier edition; everything comes along as engraving both at once carries it',async()=>{
 const both=savedLibrary(),whole=await prepareRebuiltEdition(host(both),entry,file,bytes,'janko-four-row',{refusal}),{lib:wholeLib}=library(both);
 const wholeInstalled=await install(wholeLib,entry,whole);
 // Layout first: only Jankó is engraved, and the edition says Conventional is left for later.
 const stored=savedLibrary(),before=named(stored,entry),{lib}=library(stored);
 assert.deepEqual(first.later,['conventional-piano']);assert.deepEqual((await importPackage(first.packageBytes)).availablePresentations,['janko-four-row']);
 const one=await install(lib,entry,first,()=>({from:file,later:first.later!,untold:said(first)}));
 assert.deepEqual(laterLayouts(one.entry),{from:file,layouts:['conventional-piano']});
 assert.deepEqual(engravedAgainOf(one.entry)?.untold,{hands:'edition',fingers:'edition',left:0,practiceLeft:0});
 // Then Conventional, from the earlier edition's Conventional view: its hands, printed fingers, the player's journal and practice.
 const completed=await prepareCompletedEdition(host(stored),one.entry,first.packageBytes,file,bytes,['conventional-piano']),
  two=await install(lib,one.entry,completed,()=>({from:file,untold:joinedNotice(engravedAgainOf(one.entry)?.untold,said(completed))}));
 assert.equal(laterLayouts(two.entry),undefined,'nothing is left for later');
 const next=await importPackage(stored.get(two.entry.file)!),all=await importPackage(both.get(wholeInstalled.entry.file)!);
 assert.deepEqual([...next.availablePresentations!].sort(),['conventional-piano','janko-four-row']);
 for(const layout of ['conventional-piano','janko-four-row'] as const){
  const view=await selectPresentation(next,layout),wholeView=await selectPresentation(all,layout),key=personalStorageName(id,view);
  assert.equal(key,personalStorageName(id,wholeView),`${layout}: the same journal names the same view`);
  // The very pages engraving both at once makes.
  assert.deepEqual(view.manifest.pages.map(p=>[...view.files[p]].length),wholeView.manifest.pages.map(p=>[...wholeView.files[p]].length),`${layout} pages`);
  for(const [i,page] of view.manifest.pages.entries())assert.deepEqual(view.files[page],wholeView.files[wholeView.manifest.pages[i]],`${layout} page ${i+1}`);
  const mine=readPersonal(decode(stored.get(two.entry.personalFiles![key])!),view),theirs=readPersonal(decode(both.get(wholeInstalled.entry.personalFiles![key])!),wholeView);
  assert.deepEqual(mine,theirs,`${layout}: the journal carried is the one engraving both at once carries`);
  const {owner,hand,finger}=own[layout];
  assert.equal(handFor(view,mine,owner),hand,`${layout}: the player's hand`);assert.equal(fingerFor(view,mine,view.seats.find(s=>s.ownerIds.includes(owner))!),finger,`${layout}: the player's finger`);
  assert.equal(mine.view.page,theirs.view.page,`${layout}: the reading place`);
  const practice=stored.get(practiceStorageName(id,view));assert.ok(practice,`${layout}: practice came along`);
  assert.deepEqual(decode(practice),decode(both.get(practiceStorageName(id,wholeView))!),`${layout}: the practice engraving both at once carries`);
 }
 // The earlier edition stays under Earlier editions, its journals and practice byte for byte, and named as they were.
 for(const [name,b] of before)if(name!=='library.json')assert.deepEqual(stored.get(name),b,name);
 assert.deepEqual(two.entry.editionPersonalFiles![file],entry.personalFiles);assert.ok(two.entry.retainedPackages!.includes(file));
 // Jankó's journal is the one installed first, untouched by the second install.
 const janko=personalStorageName(id,await selectPresentation(next,'janko-four-row'));
 assert.equal(two.entry.personalFiles![janko],one.entry.personalFiles![janko]);
});

test('every pitch choice that named the earlier edition, or the edition installed first, names the completed edition on both layouts',async()=>{
 // The player once chose another pitch and came back: the library remembers each layout's pitch choices.
 const chosen:Entry={...entry,transposition:{version:'score-transposition-selection-v1',steps:0,editions:{'0':{'janko-four-row':file,'conventional-piano':file}}}};
 const stored=savedLibrary();stored.set('library.json',encode({version:1,entries:[chosen]}));
 const {lib}=library(stored),one=await install(lib,chosen,first,()=>({from:file,later:first.later!,untold:said(first)}));
 assert.deepEqual(one.entry.transposition!.editions['0'],{'janko-four-row':one.entry.file,'conventional-piano':file},'Jankó names the edition installed first; Conventional keeps the earlier edition it still needs');
 const completed=await prepareCompletedEdition(host(stored),one.entry,first.packageBytes,file,bytes,['conventional-piano']),
  two=await install(lib,one.entry,completed,()=>({from:file}));
 assert.deepEqual(two.entry.transposition!.editions['0'],{'janko-four-row':two.entry.file,'conventional-piano':two.entry.file},'no layout names the Jankó-only edition installed first');
});

test('an install stopped at any write, or at any check, leaves the library and every file it names as they were; trying again completes it',async()=>{
 for(const [what,run] of [
  ['the layout in use',(lib:EditionLibrary,live?:()=>boolean)=>install(lib,entry,first,()=>({from:file,later:first.later!,untold:said(first)}),live)],
 ] as const){
  const clean=savedLibrary(),{lib:cleanLib,writes}=library(clean),done=await run(cleanLib);
  assert.ok(writes()>=3,`${what}: archive, journal and library`);
  for(let crashAt=1;crashAt<=writes();crashAt++){
   const stored=savedLibrary(),before=named(stored,entry),{lib,entries}=library(stored,crashAt);
   await assert.rejects(run(lib),/power went out/,`${what}, write ${crashAt}`);
   // The library names the earlier edition, and every file it names is as it was.
   assert.deepEqual(named(stored,entry),before,`${what}, write ${crashAt}`);assert.deepEqual(entries(),[entry]);
   assert.deepEqual(decode(stored.get('library.json')!),{version:1,entries:[entry]});
   // The next visit installs it, with the same journals and practice as an install never stopped.
   const again=await run(library(stored).lib);assert.equal(again.entry.file,done.entry.file);
   for(const [key,name] of Object.entries(again.entry.personalFiles!))assert.deepEqual(decode(stored.get(name)!),decode(clean.get(done.entry.personalFiles![key])!),`${what}, write ${crashAt}: ${key}`);
   const practice=practiceStorageName(id,await selectPresentation(await importPackage(clean.get(done.entry.file)!),'janko-four-row'));
   assert.deepEqual(decode(stored.get(practice)!),decode(clean.get(practice)!),`${what}, write ${crashAt}: practice`);
  }
  // Stopped at any check (a score opened, a dialog up): nothing the library names changes.
  let checks=0;await run(library(savedLibrary()).lib,()=>{checks++;return true;});assert.ok(checks>=3);
  for(let stopAt=1;stopAt<=checks;stopAt++){
   const stored=savedLibrary(),before=named(stored,entry);let n=0;
   await assert.rejects(run(library(stored).lib,()=>++n<stopAt),/cancelled/,`${what}, check ${stopAt}`);
   assert.deepEqual(named(stored,entry),before,`${what}, check ${stopAt}`);
  }
 }
 // The same for the layout installed later.
 const base=savedLibrary(),{lib}=library(base),one=await install(lib,entry,first,()=>({from:file,later:first.later!}));
 const completed=await prepareCompletedEdition(host(base),one.entry,first.packageBytes,file,bytes,['conventional-piano']);
 const clean=copy(base),{lib:cleanLib,writes}=library(clean),done=await install(cleanLib,one.entry,completed);
 for(let crashAt=1;crashAt<=writes();crashAt++){
  const stored=copy(base),before=named(stored,one.entry),{lib:crashing}=library(stored,crashAt);
  await assert.rejects(install(crashing,one.entry,completed),/power went out/);
  assert.deepEqual(named(stored,one.entry),before,`the later layout, write ${crashAt}`);
  const again=await install(library(stored).lib,one.entry,completed);assert.equal(again.entry.file,done.entry.file);
 }
});

test('an opening racing a background install joins it and opens the new edition; an opening of another score stops it with nothing written',async()=>{
 // The library's background work as the viewer runs it: prepared, then installed while nothing else is open.
 const scenario=(stored:Map<string,Uint8Array>)=>{
  const {lib,entries}=library(stored);let opening:string|undefined;let release!:()=>void;const paused=new Promise<void>(resolve=>{release=resolve;});
  const work=new AheadOfTimeEngraving(async(entryId,{signal},w)=>{
   w.started();w.replacing();await paused;
   try{await install(lib,entries().find(e=>e.id===entryId)!,first,()=>({from:file,later:first.later!}),()=>!signal!.aborted&&(opening===undefined||opening===entryId));}
   finally{w.ready();}
  },{delayMs:0,idle:run=>run()});
  /** The viewer's opening: it stops or joins the work, then reads the library's entry. */
  const open=async(entryId:string)=>{opening=entryId;work.yieldTo(entryId);if(work.replacing(entryId))await work.joined(entryId);return entries().find(e=>e.id===entryId);};
  return {work,open,release,entries,lib};
 };
 // Opening the score being installed waits for it, and opens on the new edition and its journals.
 const joined=savedLibrary(),j=scenario(joined);j.work.start([id]);await new Promise(r=>setTimeout(r,5));
 const opening=j.open(id);await new Promise(r=>setTimeout(r,5));j.release();const opened=(await opening)!;
 assert.equal(opened.file,await packageFile(first.packageBytes));assert.deepEqual(laterLayouts(opened),{from:file,layouts:['conventional-piano']});
 assert.ok(opened.personalFiles![personalStorageName(id,first.package)],'it opens with the journal carried');
 // An opening that read the earlier edition before the install committed cannot install over it.
 await assert.rejects(install(j.lib,entry,first),/library changed/);assert.equal(j.entries()[0].file,opened.file);
 // Opening another score stops the install: the library and every file it names stay as they were.
 const stopped=savedLibrary(),before=named(stopped,entry),s=scenario(stopped);s.work.start([id]);await new Promise(r=>setTimeout(r,5));
 await s.open('another score');s.release();await new Promise(r=>setTimeout(r,20));
 assert.deepEqual(named(stopped,entry),before);assert.deepEqual(s.entries(),[entry]);
});

test('a library entry keeps its record only for the edition it names, with its earlier edition kept',async()=>{
 const {lib}=library(savedLibrary()),one=await install(lib,entry,first,()=>({from:file,later:['conventional-piano']}));
 assert.ok(engravedAgainOf(one.entry));
 // Another edition, an earlier edition no longer kept, a layout that isn't one: no record.
 assert.equal(engravedAgainOf({...one.entry,file:entry.file}),undefined);
 assert.equal(engravedAgainOf({...one.entry,retainedPackages:[]}),undefined);
 assert.equal(engravedAgainOf({...one.entry,engravedAgain:{...one.entry.engravedAgain!,later:['harpsichord' as PhysicalKeyboardId]}}),undefined);
 assert.equal(engravedAgainOf({...one.entry,engravedAgain:{...one.entry.engravedAgain!,untold:{hands:'edition',fingers:'edition',left:-1,practiceLeft:0}}}),undefined);
 // Any later install of another edition drops it.
 const stored=savedLibrary(),{lib:next}=library(stored),installed=await install(next,entry,first,()=>({from:file,later:['conventional-piano']}));
 const completed=await prepareCompletedEdition(host(stored),installed.entry,first.packageBytes,file,bytes,['conventional-piano']),
  plain=await install(next,installed.entry,completed);
 assert.equal(plain.entry.engravedAgain,undefined);
 // The notice is decided once practice has moved: what couldn't move is said.
 let asked:number|undefined;const stored2=savedLibrary();
 await install(library(stored2).lib,entry,first,()=>{asked=first.practiceLeft;return {from:file};});assert.equal(asked,0);
});

test('background work reads only an engraving already kept: it never engraves on the reader\'s thread',async()=>{
 useEngravedAgainStore(keptEngravings());
 try{
  const started=performance.now();
  await assert.rejects(prepareRebuiltEdition(host(savedLibrary()),entry,file,bytes,'janko-four-row',{refusal,layouts:['janko-four-row'],keptOnly:true}),NotEngravedYet);
  await assert.rejects(prepareCompletedEdition(host(savedLibrary()),entry,first.packageBytes,file,bytes,['conventional-piano'],{keptOnly:true}),NotEngravedYet);
  assert.ok(performance.now()-started<5000,'nothing was engraved');
 }finally{useEngravedAgainStore(store);}
 // With the engraving kept, the same preparation reads it.
 const kept=await prepareRebuiltEdition(host(savedLibrary()),entry,file,bytes,'janko-four-row',{refusal,layouts:['janko-four-row'],keptOnly:true});
 assert.deepEqual(kept.packageBytes,first.packageBytes);
});
