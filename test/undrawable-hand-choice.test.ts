import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {importPackage} from '../src/package';
import {initialPersonal,type PersonalState} from '../src/state';
import {assigned,handFor} from '../src/personal-assignments';
import {undrawableHandOwners} from '../src/personal-presentation';
import {HandPresentationError} from '../vendor/iso-notation/src/score-presentation';

const p=await importPackage(readFileSync(new URL('../fixtures/schumann-op68-no14.isoscore',import.meta.url)),{allowLegacyTempo:true});
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
 const context:any={structuredClone,crypto,handFor,undrawableHandOwners,accepted,
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
 assert.equal(kept.view,'view');assert.equal(kept.notes,seat.ownerIds.length);
 assert.deepEqual(h.accepted.map(a=>[a.kind,a.ownerId,a.hand]),[['hand',owner,'LH']]);
 assert.equal(handFor(p,h.target.personal,owner),'LH');assert.equal(projected.length,1);assert.equal(handFor(p,projected[0],owner),'LH');
});

test('a note changed since the refusal is left alone; other refusals reach the player unchanged',async()=>{
 const attempted=flipped(initialPersonal(p)),later=initialPersonal(p);
 const h=harness(later,async()=>'view');
 const kept=await h.keep(attempted,refusal([owner]),()=>'LH');assert.equal(kept.view,'view');assert.equal(kept.notes,0);assert.equal(h.accepted.length,0);
 const other=Error('disk'),mixed=refusal([owner],'One struck key is written in notes with a performing hand and notes without one.');
 for(const error of [other,mixed]){const g=harness(attempted,async()=>'view');await assert.rejects(g.keep(attempted,error,()=>'LH'),e=>e===error);assert.equal(g.accepted.length,0);}
 // A note with no hand to return to keeps the refusal.
 const none=harness(attempted,async()=>'view'),error=refusal([owner]);
 await assert.rejects(none.keep(attempted,error,()=>null),e=>e===error);assert.equal(none.accepted.length,0);
 // A refusal that persists after returning the hand stops after a bounded number of tries.
 const stuck=harness(attempted,async()=>{throw refusal([owner]);});
 await assert.rejects(stuck.keep(attempted,refusal([owner]),()=>'LH'),{message:UNDRAWABLE});assert.equal(stuck.accepted.length,1);
});
