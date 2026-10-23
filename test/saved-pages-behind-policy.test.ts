import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {importPackage,validateLayerAsync,keepSavedPagesBehindPolicy,requireCurrentEngraving,savedPagesBehindPolicy,selectPresentation,SavedPagesBehindPolicy,type ScorePackage,type Seat} from '../src/package';
import {addKeyboardView,packageFile,prepareRebuiltEdition,shareKeyboardView} from '../src/edition-rebuild';
import {collectionId,fingerFor,initialPersonal,personalStorageName,type Entry,type PersonalSourceAnchor,type PersonalState} from '../src/state';
import {assigned,handFor} from '../src/personal-assignments';
import {APPROVED_SCORE_RENDERING_ENGINE,SCORE_RENDERING_ENGINE} from '../vendor/iso-notation/src/render/iso/score-rendering-recipe';

// The owner's conventional No. 14 opened on pages the no14-recovery engine drew
// (augmentation dots and all), because only approved recipes were checked
// against the current shared policy. This edition is the same kind: a Jankó
// view and a conventional view showing those very pages.
const janko=new Uint8Array(readFileSync(new URL('../fixtures/authored-preparation-v1.tuna',import.meta.url))),
 jankoOnly=await importPackage(janko,{allowLegacyTempo:true}),
 stale=await shareKeyboardView(jankoOnly,'conventional-piano'),
 saved=await importPackage(stale,{allowLegacyTempo:true}),id=collectionId(saved),file=await packageFile(stale),
 earlier={'conventional-piano':await selectPresentation(saved,'conventional-piano'),'janko-four-row':await selectPresentation(saved,'janko-four-row')},
 conventional=earlier['conventional-piano'],encode=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value)),
 journal=`state-version-${'c'.repeat(64)}.json`,
 seatOf=(p:ScorePackage,owner:string)=>p.seats.find(s=>s.ownerIds.includes(owner))!,
 printed=(p:ScorePackage,owner:string)=>p.fingerLayer?.attacks.find(a=>a.id===p.fingerLayer!.sourceOwnerToAttack[owner])?.finger;

// The player's own hand and finger choices on the conventional layout: three notes moved to the other hand, with fingers.
const chosenSeats=conventional.seats.filter(s=>s.ownerIds.length===1&&!s.continuation).slice(0,3);
let prior:PersonalState=initialPersonal(conventional);const chosen=new Map<string,{hand:'LH'|'RH';finger:number}>();
for(const [i,seat] of chosenSeats.entries()){const owner=seat.ownerIds[0],hand=handFor(conventional,initialPersonal(conventional),owner)==='LH'?'RH':'LH',finger=i+2;
 prior=assigned(conventional,prior,seat,{hand,finger});chosen.set(owner,{hand,finger});}
// Their reading place: the last page and the note they were editing on it.
const reading=(a:Seat,b:Seat)=>a.page-b.page||a.system-b.system||a.x-b.x,
 anchor=(seat:Seat):PersonalSourceAnchor=>({owners:[...seat.ownerIds].sort(),writtenBar:seat.writtenBar,actionId:seat.actionId,continuation:!!seat.continuation,alias:0}),
 lastPage=conventional.seats.filter(s=>s.page===conventional.pages.length-1&&!s.continuation).sort(reading),pageSeat=lastPage[0],editSeat=lastPage.at(-1)!;
prior={...prior,view:{...prior.view,page:pageSeat.page},editContactId:editSeat.contactId,navigation:{version:1,page:anchor(pageSeat),edit:anchor(editSeat),followEdit:true}};
// On Jankó, an earlier finger layer in their history (the owner's No. 14 journal holds one).
const jankoJournal=`state-version-${'d'.repeat(64)}.json`,layer=earlier['janko-four-row'].fingerLayer!,
 jankoPrior:PersonalState={...initialPersonal(earlier['janko-four-row']),history:[layer]};
const entry:Entry={id,file,metadata:saved.manifest.metadata,importedAt:'2026-10-23T00:00:00.000Z',personalFiles:{[personalStorageName(id,conventional)]:journal,[personalStorageName(id,earlier['janko-four-row'])]:jankoJournal}};
const host=(stored:Map<string,Uint8Array>)=>({read:async(name:string)=>stored.get(name)??null});

test('saved conventional pages an earlier engine drew are behind the current shared policy; admission still reads them',()=>{
 assert.equal(conventional.renderingRecipe?.engineId,SCORE_RENDERING_ENGINE,'the conventional view shows the no14-recovery pages');
 assert.deepEqual(conventional.pages,earlier['janko-four-row'].pages,'the same pages serve both layouts');
 assert.equal(savedPagesBehindPolicy(saved),true);
 assert.equal(savedPagesBehindPolicy(conventional),true,'either view names the edition');
 assert.throws(()=>requireCurrentEngraving(conventional),(error:Error)=>error instanceof SavedPagesBehindPolicy&&/current shared engraving policy/.test(error.message));
});

test('a stale saved conventional edition is engraved again once, with every edition hand and finger and the player\'s own choices',async()=>{
 const copy=stale.slice(),stored=new Map([[journal,encode(prior)],[jankoJournal,encode(jankoPrior)]]),
  rebuilt=await prepareRebuiltEdition(host(stored),entry,file,stale,'conventional-piano',{refusal:new SavedPagesBehindPolicy()}),
  next=await importPackage(rebuilt.packageBytes,{allowLegacyTempo:true});
 assert.deepEqual(stale,copy,'the earlier archive is not changed');
 // Reopening admits the new edition as it is: nothing is engraved a second time.
 assert.equal(savedPagesBehindPolicy(next),false);assert.equal(requireCurrentEngraving(next),next);
 assert.deepEqual([...next.availablePresentations!].sort(),['conventional-piano','janko-four-row']);
 const personal:Record<string,PersonalState>={[personalStorageName(id,rebuilt.package)]:rebuilt.personal,...Object.fromEntries(rebuilt.additionalPersonal.map(p=>[p.key,p.personal]))};
 for(const layout of ['conventional-piano','janko-four-row'] as const){
  const before=earlier[layout],after=await selectPresentation(next,layout),s=personal[personalStorageName(id,after)];
  assert.equal(after.renderingRecipe?.engineId,APPROVED_SCORE_RENDERING_ENGINE,`${layout} is drawn under the current shared policy`);
  assert.ok(s,`${layout} has its journal`);
  const beforeState=layout==='conventional-piano'?prior:jankoPrior;
  for(const n of before.score.notes){
   const own=layout==='conventional-piano'?chosen.get(n.id):undefined;
   assert.equal(handFor(after,s,n.id),handFor(before,beforeState,n.id),`${layout} ${n.id} hand`);
   if(own)assert.equal(handFor(after,s,n.id),own.hand,`${layout} ${n.id} keeps the player's hand`);
   const finger=own?.finger??printed(before,n.id);
   if(finger!==undefined)assert.equal(fingerFor(after,s,seatOf(after,n.id)),finger,`${layout} ${n.id} finger`);
  }
 }
 assert.equal(rebuilt.carried,chosen.size,'every choice came along');assert.equal(rebuilt.left,0,'no choice stays behind');
 // The reading place moves through bars: the page that now holds the bar they read, and the note they edited.
 const after=await selectPresentation(next,'conventional-piano'),place=personal[personalStorageName(id,after)],
  holds=(seat:Seat|undefined,at:Seat)=>!!seat&&seat.writtenBar===at.writtenBar&&seat.ownerIds.some(owner=>at.ownerIds.includes(owner));
 assert.ok(after.seats.some(seat=>seat.page===place.view.page&&holds(seat,pageSeat)),`page ${place.view.page+1} holds bar ${pageSeat.writtenBar}`);
 assert.equal(place.navigation?.page?.writtenBar,pageSeat.writtenBar);assert.equal(place.navigation?.edit?.writtenBar,editSeat.writtenBar);assert.equal(place.navigation?.followEdit,true);
 assert.ok(holds(after.seats.find(seat=>seat.contactId===place.editContactId),editSeat),`the edit point stays on bar ${editSeat.writtenBar}`);
 // The earlier layer comes along: it still binds to the new pages, as the journal will be read.
 const janko=await selectPresentation(next,'janko-four-row'),history=personal[personalStorageName(id,janko)].history;
 assert.deepEqual(history,[layer]);await validateLayerAsync(history[0],janko,{history:true});
 assert.equal(rebuilt.replaced[file],await packageFile(rebuilt.packageBytes));
});

test('an edition with one layout current and the other drawn by an earlier engine is behind the policy, whichever layout opens',async()=>{
 const bytes=await addKeyboardView(jankoOnly,'conventional-piano'),mixed=await importPackage(bytes,{allowLegacyTempo:true}),
  current=await selectPresentation(mixed,'conventional-piano'),old=await selectPresentation(mixed,'janko-four-row');
 assert.equal(current.renderingRecipe?.engineId,APPROVED_SCORE_RENDERING_ENGINE,'the conventional view is drawn under the current policy');
 assert.equal(old.renderingRecipe?.engineId,SCORE_RENDERING_ENGINE,'the Jankó view is not');
 assert.equal(savedPagesBehindPolicy(current),true,'opening the current layout still finds the other');
 assert.throws(()=>requireCurrentEngraving(current),(error:Error)=>error instanceof SavedPagesBehindPolicy&&error.archiveSha256===mixed.archiveSha256);
 const file=await packageFile(bytes),rebuilt=await prepareRebuiltEdition(host(new Map()),{...entry,file,personalFiles:{}},file,bytes,'conventional-piano',{refusal:new SavedPagesBehindPolicy()});
 assert.equal(savedPagesBehindPolicy(await importPackage(rebuilt.packageBytes,{allowLegacyTempo:true})),false,'engraved again, both layouts are current');
});

test('an edition that could not be engraved again reads as saved for the rest of the session, without another try',()=>{
 const archive=conventional.archiveSha256!;assert.equal(earlier['janko-four-row'].archiveSha256,archive,'both views name the archive');
 keepSavedPagesBehindPolicy(archive);
 assert.equal(requireCurrentEngraving(conventional),conventional);assert.equal(requireCurrentEngraving(earlier['janko-four-row']),earlier['janko-four-row']);
 assert.equal(savedPagesBehindPolicy(conventional),true,'its pages are still behind the policy');
});

// Opening wiring, run on the actual open() source as retained-open.test.ts does.
const source=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
const open=stripTypeScriptTypes(source.slice(source.indexOf('async function open('),source.indexOf('\nasync function chooseGuitarProTracks(')));
async function opening(rebuilds:boolean,times=1){
 const entry={id:'source',file:'saved.tuna',personalFiles:{}},data=new Uint8Array([1,2,3]),personal={overrides:{},history:[]},
  p={availablePresentations:['janko-four-row'],manifest:{version:2},collection:'source'},q={status:'reading',package:p,personal,packageBytes:new Uint8Array(data)};
 let calls:string[]=[],notices:string[]=[];const kept=new Set<string>(),op={keyboard:'janko-four-row'},context:any={
  retained:{take:()=>undefined},retainable:new WeakSet(),beginReading:()=>op,openingLoading:()=>undefined,scoreCapabilities:()=>({pianoPreparation:true}),personalMemory:{prefetch(){}},getScoreTransposition:()=>0,readingCheckpoint:async()=>{},practice:undefined,savePersonal:async()=>{},checkReading(){},
  host:{read:async()=>data,fullscreen:async()=>{}},importReading:async()=>{calls.push('admit');return p;},admitReadingSource:async()=>{},assertSelectedTransposition(){},selectPresentation:async()=>p,
  requireCurrentEngraving:(p:unknown)=>{if(!kept.has('archive'))throw new SavedPagesBehindPolicy('archive');return p;},keepSavedPagesBehindPolicy:(archive:string)=>{calls.push('keep');kept.add(archive);},
  SavedPagesBehindPolicy,SavedPagesLackRepeats:class extends Error{},
  keepSavedPagesWithoutRepeats:()=>calls.push('without-repeats'),
  readingProgress:()=>calls.push('engrave-again'),reengraveReadingArchive:async()=>undefined,readingExecution:()=>({}),
  prepareRebuiltEdition:async(_h:unknown,_e:unknown,_f:unknown,_b:unknown,_l:unknown,options:{refusal:unknown})=>{assert.ok(options.refusal instanceof SavedPagesBehindPolicy);calls.push('rebuild');if(!rebuilds)throw Error('cannot engrave');return {packageBytes:new Uint8Array([9]),personal,left:0,carried:0,practice:[],additionalPersonal:[],replaced:{}};},
  preparePiano:async()=>({q,running:{}}),
  loadPersonal:async()=>personal,prepareScore:async()=>({q,running:{}}),collectionId:()=>'source',
  installPreparedScore:async()=>{calls.push('install');return {entry,personal};},
  activateScore:async(next:any)=>{calls.push('activate');return next;},saveReadingPreferences:async()=>{},checkReadingOwner(){},notify:(text:string)=>notices.push(text),clearNotice(){},finishReading(_op:any,success:boolean){calls.push(success?'complete':'failed');},
  console:{warn(){}},
 };
 runInNewContext(open,context);const opened=[];
 for(let i=0;i<times;i++){calls=[];notices=[];let error:unknown;try{await context.open(entry);}catch(e){error=e;}opened.push({calls,notices,error});}
 return opened;
}
test('opening saved pages an earlier engine drew engraves the edition again and installs it',async()=>{
 const [f]=await opening(true);assert.equal(f.error,undefined);
 assert.deepEqual(f.calls,['admit','engrave-again','rebuild','install','activate','complete']);
 assert.deepEqual(f.notices,['This score was engraved again with the current engraving. Your hands, fingers and choices came along.']);
});
test('when they can\'t be engraved again, the score still opens on its saved pages and says so',async()=>{
 const [f]=await opening(false);assert.equal(f.error,undefined);
 assert.deepEqual(f.calls,['admit','engrave-again','rebuild','keep','admit','activate','complete']);
 assert.equal(f.calls.includes('without-repeats'),false);
 assert.match(f.notices.join(' '),/couldn’t be engraved again with the current engraving, so it opened on its saved pages/);
});
test('opening it again in the same session reads the saved pages at once, without engraving again',async()=>{
 const [first,again]=await opening(false,2);
 assert.deepEqual(first.calls,['admit','engrave-again','rebuild','keep','admit','activate','complete']);
 assert.equal(again.error,undefined);assert.deepEqual(again.calls,['admit','activate','complete']);assert.deepEqual(again.notices,[]);
});
