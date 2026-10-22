import type {ScorePackage,Seat} from './package';
import type {PersonalState} from './state';
import {handFor,type PersonalHand} from './personal-assignments';
import type {PersonalMemoryAction} from './personal-memory-session';
import type {HandChoiceAction} from './hand-recurrence-text';
import {editOwners} from './repeat-fold';

export type NoteMemoryCommand=HandChoiceAction|'memory-reference'|'memory-inherit';
/** A memory action on one note: every kind but a finger edit, which names its note in `edit`. */
export type NoteMemoryAction=Extract<PersonalMemoryAction,{ownerId:string}>;

/** What a hand or memory command on the selected note saves: one action for
 * each note it changes. A folded note changes in every pass (`editOwners`),
 * so the passes stay one repeat. None when the command does not apply. */
export function noteMemoryActions(p:ScorePackage,personal:PersonalState,seat:Seat,command:NoteMemoryCommand,authoredAt=new Date().toISOString(),decision=()=>crypto.randomUUID()):NoteMemoryAction[]{
 const owners=editOwners(seat),written=(id:string)=>p.score.notes.find(n=>n.id===id)?.hand as PersonalHand|undefined;
 // Keep this note’s written hand: an exception to the bar it would follow, for this note only.
 if(command==='hand-not-here'&&!owners.every(written))return [];
 return owners.map((ownerId):NoteMemoryAction=>{
  const decisionId=decision();
  if(command==='hand-not-here')return {kind:'hand',ownerId,hand:written(ownerId)!,local:true,decisionId,authoredAt};
  // A pass showing a hand only carried from its twin keeps that hand as its own, here only, as its twin does.
  const shown=handFor(p,personal,ownerId);
  if(command==='hand-only-here'&&personal.assignments?.choices[ownerId]?.hand===undefined&&shown)return {kind:'hand',ownerId,hand:shown,local:true,decisionId,authoredAt};
  if(command==='memory-reference'||command==='memory-inherit')return {kind:command==='memory-reference'?'reference':'reset',ownerId,decisionId,authoredAt};
  return {kind:'handScope',ownerId,scope:command==='hand-only-here'?'local':'shared',decisionId,authoredAt};
 });
}
