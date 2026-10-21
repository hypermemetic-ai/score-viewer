import test from 'node:test';
import {handCarryNotice} from '../src/hand-recurrence-text';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {importPackage} from '../src/package';
import {initialPersonal,type PersonalState} from '../src/state';
import {assigned,handFor} from '../src/personal-assignments';
import {engravingRefusal,undrawableHandOwners,undrawableHandReason} from '../src/personal-presentation';
import {keptHandsText} from '../src/hand-editing-wait';
import {PersonalEditQueue} from '../src/personal-edit-queue';
import {HandPresentationError} from '../vendor/iso-notation/src/score-presentation';

const p=await importPackage(readFileSync(new URL('../fixtures/schumann-op68-no14.tuna',import.meta.url)),{allowLegacyTempo:true});
const source=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
const keepBody=stripTypeScriptTypes(source.slice(source.indexOf('async function keepDrawableHands('),source.indexOf('async function acceptMemoryAction(')));
const UNDRAWABLE="These hand choices can't be drawn on the page yet.";
const refusal=(ownerIds:string[],message='Personal hands cannot fit the matching musical presentation.')=>
 Error(UNDRAWABLE,{cause:new HandPresentationError('unsupported-fit',message,ownerIds)});
const seat=p.seats.find(s=>p.score.notes.find(n=>n.id===s.ownerIds[0])?.hand==='LH')!,owner=seat.ownerIds[0];
const flipped=(s:PersonalState)=>assigned(p,s,seat,{hand:'RH'});

/** keepDrawableHands from main.ts, with the memory and the engraver replaced. */
function harness(personal:PersonalState,project:(s:PersonalState)=>Promise<unknown>){
 const accepted:any[]=[],target={package:p,personal,entry:{id:'e',importedAt:'now'}};
 const context:any={structuredClone,crypto,handFor,undrawableHandOwners,undrawableHandReason,accepted,
  personalMemory:{accept(input:any,action:any){accepted.push(action);const s=p.seats.find(s=>s.ownerIds.includes(action.ownerId))!;
   return {personal:assigned(p,input.personal,s,{hand:action.hand}),saved:Promise.resolve()};}},
  memoryInput:(t:any)=>({personal:t.personal}),resolveMemory:(t:any)=>t.personal,paintPersonalSaveError(){},
  personalEditor:()=>({session:{project}})};
 runInNewContext(keepBody,context);
 return {target,accepted,keep:(attempted:PersonalState,error:unknown,hadHand:(id:string)=>'LH'|'RH'|null)=>context.keepDrawableHands(target,attempted,error,hadHand)};
}

test('only a plain fit refusal names notes whose hands can be returned',()=>{
 assert.deepEqual(undrawableHandOwners(refusal(['a','b'])),['a','b']);
 assert.equal(undrawableHandOwners(refusal([])),undefined,'a refusal that names no note cannot be repaired');
 assert.equal(undrawableHandOwners(refusal(['a'],'One struck key is written in notes with a performing hand and notes without one, so it has no single head to engrave.')),undefined);
 assert.equal(undrawableHandOwners(Error(UNDRAWABLE,{cause:new HandPresentationError('incompatible-recipe','old',['a'])})),undefined);
 assert.equal(undrawableHandOwners(Error('These hand choices can\'t be drawn on the page yet.')),undefined);
 assert.equal(undrawableHandOwners(new HandPresentationError('unsupported-fit','raw',['a'])),undefined);
});

test('a refused hand returns to the hand the note had, as a recorded choice, and the page is drawn',async()=>{
 const attempted=flipped(initialPersonal(p)),projected:PersonalState[]=[];
 const h=harness(attempted,async s=>{projected.push(s);return 'view';});
 const kept=await h.keep(attempted,refusal([owner]),()=>'LH');
 assert.equal(kept.view,'view');assert.equal(kept.keys,1,"one struck key, however many notes it holds");
 assert.deepEqual(h.accepted.map(a=>[a.kind,a.ownerId,a.hand]),[['hand',owner,'LH']]);
 assert.equal(handFor(p,h.target.personal,owner),'LH');assert.equal(projected.length,1);assert.equal(handFor(p,projected[0],owner),'LH');
});

test('a note changed since the refusal is left alone; other refusals reach the player unchanged',async()=>{
 const attempted=flipped(initialPersonal(p)),later=initialPersonal(p);
 const h=harness(later,async()=>'view');
 const kept=await h.keep(attempted,refusal([owner]),()=>'LH');assert.equal(kept.view,'view');assert.equal(kept.keys,0);assert.equal(h.accepted.length,0);
 const other=Error('disk'),mixed=refusal([owner],'One struck key is written in notes with a performing hand and notes without one.');
 for(const error of [other,mixed]){const g=harness(attempted,async()=>'view');await assert.rejects(g.keep(attempted,error,()=>'LH'),e=>e===error);assert.equal(g.accepted.length,0);}
 // A note with no hand to return to keeps the refusal.
 const none=harness(attempted,async()=>'view'),error=refusal([owner]);
 await assert.rejects(none.keep(attempted,error,()=>null),e=>e===error);assert.equal(none.accepted.length,0);
 // A refusal that persists after returning the hand stops after a bounded number of tries.
 const stuck=harness(attempted,async()=>{throw refusal([owner]);});
 await assert.rejects(stuck.keep(attempted,refusal([owner]),()=>'LH'),{message:UNDRAWABLE});assert.equal(stuck.accepted.length,1);
});

const cueRefusal=(ownerIds:string[])=>Error(UNDRAWABLE,{cause:new HandPresentationError('unsupported-fit','Personal hands cannot fit the matching musical presentation.',ownerIds,
 {diagnostics:[{code:'hand-transfer-cue-refused',message:'No hand-transfer cue fits for LH→RH in source group g: the head-to-head line touches other ink (conflicts: rest 0).',ownerIds}]})});

test('a refusal that also names the note the choice ran into returns only the changed note (No. 13 pickup)',async()=>{
 // ISO names both notes of the beam whose change of hand it cannot mark; the
 // partner kept its hand, so there is nothing to return for it.
 const partner=p.seats.find(s=>s!==seat&&p.score.notes.find(n=>n.id===s.ownerIds[0])?.hand==='RH')!.ownerIds[0];
 const attempted=flipped(initialPersonal(p)),h=harness(attempted,async()=>'view'),had=(id:string)=>handFor(p,initialPersonal(p),id);
 const kept=await h.keep(attempted,cueRefusal([owner,partner]),had);
 assert.equal(kept.view,'view');assert.equal(kept.keys,1);
 assert.deepEqual(h.accepted.map(a=>[a.ownerId,a.hand]),[[owner,'LH']],'the partner is not touched');
 assert.equal(handFor(p,h.target.personal,owner),'LH');assert.equal(handFor(p,h.target.personal,partner),'RH');
 assert.match(kept.reason,/shares a beam with a note in the other hand/);
 // A refusal that names only notes the choice did not change still reaches the player.
 const g=harness(attempted,async()=>'view'),error=cueRefusal([partner]);
 await assert.rejects(g.keep(attempted,error,had),e=>e===error);assert.equal(g.accepted.length,0);
});

test('the refusal reason is said in plain words',()=>{
 const diagnosed=(code:string,message:string)=>Error(UNDRAWABLE,{cause:new HandPresentationError('unsupported-fit','x',['a'],{diagnostics:[{code,message}]})});
 assert.equal(undrawableHandReason(cueRefusal(['a','b'])),'shares a beam with a note in the other hand, and the line that marks the change of hand would run into other notation');
 // Other cue refusals (heads too close, too little line left) are not collisions.
 assert.equal(undrawableHandReason(diagnosed('hand-transfer-cue-refused','No hand-transfer cue fits for LH→RH in source group g: head centres are only 1.20pt apart.')),
  'shares a beam with a note in the other hand, and there is no room to draw the line that marks the change of hand');
 assert.equal(undrawableHandReason(diagnosed('rest-collision','m')),undefined,'no guessed reason for other diagnoses');
 assert.equal(undrawableHandReason(refusal(['a'])),undefined,'no diagnosis, no invented reason');
 assert.equal(undrawableHandReason(Error('disk')),undefined);
 assert.equal(keptHandsText(1,undrawableHandReason(cueRefusal(['a']))),'That hand can’t be drawn on the page yet, so the note keeps the hand it had. It shares a beam with a note in the other hand, and the line that marks the change of hand would run into other notation.');
 assert.equal(keptHandsText(2,undrawableHandReason(cueRefusal(['a']))),'Those hands can’t be drawn on the page yet, so the notes keep the hands they had. One of them shares a beam with a note in the other hand, and the line that marks the change of hand would run into other notation.');
 assert.equal(keptHandsText(2),'Those hands can’t be drawn on the page yet, so the notes keep the hands they had.');
});

test('only fit refusals pass the save queue; integrity failures still wait for recovery',()=>{
 assert.equal(engravingRefusal(cueRefusal(['a'])),true);
 assert.equal(engravingRefusal(new HandPresentationError('unsupported-grace-hand','g',['a'])),true);
 for(const code of ['ownership','authority','source-coverage','incompatible-recipe'] as const){
  assert.equal(engravingRefusal(new HandPresentationError(code,'c',['a'])),false,code);
  assert.equal(engravingRefusal(Error(UNDRAWABLE,{cause:new HandPresentationError(code,'c',['a'])})),false,code);
 }
 assert.equal(engravingRefusal(Error('projection unavailable')),false);
});

/** personalEditor from main.ts: its save queue, with the memory replaced. */
function editorHarness(){
 const body=stripTypeScriptTypes(source.slice(source.indexOf('function personalEditor('),source.indexOf('function readerPackage(')));
 const views:unknown[]=[],context:any={structuredClone,handCarryNotice,PersonalEditQueue,engravingRefusal,livePersonalEditors:new WeakMap(),
  PersonalPresentationSession:class{},personalStorageName:()=>'state.json',resolvePersonalNavigation(){},memoryInput:()=>({}),
  personalMemory:{saveView:async(input:any)=>{views.push(input.personal);}}};
 runInNewContext(body,context);
 return {views,editor:context.personalEditor({package:p,personal:initialPersonal(p),entry:{id:'e'}})};
}

test('a refused choice leaves nothing pending: the view still saves and later edits are not held',async()=>{
 const {views,editor}=editorHarness(),first=initialPersonal(p);
 const receipt=editor.queue.accept(first),refused=Promise.reject(cueRefusal([owner]));refused.catch(()=>{});
 editor.projections.set(receipt.sequence,refused);
 await receipt.saved;
 assert.equal(editor.queue.error,undefined,'no "Choices haven’t been saved" state');assert.equal(views.length,1);
 assert.deepEqual(editor.queue.recovery,[],'nothing waits for a retry');assert.equal(editor.projections.size,0);
 const next=editor.queue.accept(first);editor.projections.set(next.sequence,Promise.resolve(p));await next.saved;
 await editor.queue.flush();assert.equal(views.length,2);
 // Any other projection failure is still kept for recovery, as before.
 const lost=editor.queue.accept(first),failure=Promise.reject(Error('projection unavailable'));failure.catch(()=>{});
 editor.projections.set(lost.sequence,failure);
 await assert.rejects(lost.saved,/projection unavailable/);assert.equal(editor.queue.recovery.length,1);assert.equal(views.length,2);
});

test('leaving saves the view even when the engraver refuses the current hands',async()=>{
 const body=stripTypeScriptTypes(source.slice(source.indexOf('async function savePersonal('),source.indexOf('function savePersonalQuietly(')));
 const views:unknown[]=[],target={package:p,personal:initialPersonal(p),entry:{id:'e'}};
 const context:any={structuredClone,engravingRefusal,current:target,selection:undefined,readingPresentation:undefined,livePersonalEditors:new WeakMap(),
  sourceNavigationSeat:()=>undefined,capturePersonalNavigation(){},resolvePersonalNavigation(){},scoreCapabilities:()=>({pianoPreparation:true}),
  memoryInput:()=>({}),personalEditor:()=>({session:{project:async()=>{throw cueRefusal([owner]);}}}),
  personalMemory:{flush:async()=>{},saveView:async(input:any)=>{views.push(input.personal);}}};
 runInNewContext(body,context);
 await context.savePersonal();assert.equal(views.length,1);
});
