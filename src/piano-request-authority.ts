import {readPersonalAssignments} from './personal-assignments';
import {requirePitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';
import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';
import {CONVENTIONAL_PIANO,RR_JANKO_FOUR_ROW,physicalContact,jankoContact} from '../vendor/iso-notation/src/model/physical-keyboard';
import {normalizeHandPlanningInput} from '../vendor/iso-notation/src/model/hand-planning-input';
import {compilePlanningRequirements} from '../vendor/iso-notation/src/model/physical-source-constraints';
import {PIANO_ASSIGNMENT_VERSION,type PianoAssignmentConstraint} from '../vendor/iso-notation/src/model/piano-finger-assignments';
import type {FingerLayer,ScorePackage} from './package';
import type {PersonalState} from './state';

export type PerformingHandPolicy='calculate'|'retain-imported';
/** Exact historical generator text: the label alone is not authority to delete. */
export const AUTOMATIC_HAND_RETENTION_REFERENCE='Source-bound editorial preparation retains the published performing-hand inference; printed staff is not composer hand authority';
const LEGACY_HISTORY_LOCK_REFERENCE='Retain the existing performing-hand presentation for saved operator history';
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const hand=(v:unknown)=>v==='LH'||v==='RH';
const finger=(v:unknown)=>Number.isInteger(v)&&Number(v)>=1&&Number(v)<=5;

export class PianoAuthorityConflict extends Error {
  readonly code='operator-authority';
  constructor(message:string,readonly ownerIds:string[]=[]){super(message+' The current edition and saved choices are retained.');}
}

/** Reads admitted source/layer/state but independently validates authority.
 * Historical layers and undo records never become current owner choices. */
export function pianoRequestAuthority(p:ScorePackage,source:QuantizedGridScore,layout:PhysicalKeyboardId,
  active:FingerLayer|undefined,personal:PersonalState|undefined,policy:PerformingHandPolicy):PianoAssignmentConstraint[]{
  const owners=new Map(source.notes.map(n=>[n.id,n])),constraints:PianoAssignmentConstraint[]=[],
    edited=new Set(Object.values(personal?.overrides??{}).flatMap(c=>c.ownerIds)),choices=readPersonalAssignments(personal?.assignments,p)?.choices??{};
  const guard=(id:string)=>{
    const n=owners.get(id);if(!n)throw new PianoAuthorityConflict('Saved authority names a stale source owner.',[id]);
    return{pitch:requirePitchedEvent(n).pitch.octave*12+requirePitchedEvent(n).pitch.pitchClass,startTick:n.startTick,durationTicks:n.durationTicks};
  };
  const check=(raw:unknown):PianoAssignmentConstraint=>{
    if(!object(raw)||typeof raw.ownerId!=='string')throw new PianoAuthorityConflict('Saved authority has an incomplete owner record.');
    const id=raw.ownerId,expected=guard(id);
    if(Object.keys(raw).some(k=>!['ownerId','guard','hand','finger','row','contact','provenance'].includes(k))||
      !object(raw.guard)||Object.keys(raw.guard).length!==3||Object.entries(expected).some(([key,v])=>raw.guard[key]!==v)||
      !object(raw.provenance)||Object.keys(raw.provenance).some(k=>!['kind','reference'].includes(k))||
      !['operator-choice','personal-choice','editorial-hand-retention'].includes(raw.provenance.kind)||
      typeof raw.provenance.reference!=='string'||!raw.provenance.reference.trim()||
      raw.hand!==undefined&&!hand(raw.hand)||raw.finger!==undefined&&!finger(raw.finger)||
      raw.hand===undefined&&raw.finger===undefined&&raw.row===undefined&&raw.contact===undefined)
      throw new PianoAuthorityConflict('Saved authority has an unknown or stale source guard.',[id]);
    if(raw.provenance.kind==='editorial-hand-retention'&&(raw.provenance.reference!==AUTOMATIC_HAND_RETENTION_REFERENCE||
      raw.hand===undefined||raw.finger!==undefined||raw.row!==undefined||raw.contact!==undefined))
      throw new PianoAuthorityConflict('Saved hand-retention authority needs explicit review.',[id]);
    if(raw.provenance.reference===LEGACY_HISTORY_LOCK_REFERENCE)
      throw new PianoAuthorityConflict('An earlier blanket history hand lock needs explicit review.',[id]);
    try{
      if(layout==='conventional-piano'){
        if(raw.row!==undefined)throw Error('Janko row on conventional keyboard');
        if(raw.contact!==undefined&&(!object(raw.contact)||!same(raw.contact,physicalContact(CONVENTIONAL_PIANO,expected.pitch,raw.contact.contactId))))throw Error('Contact differs');
      }else{
        if(raw.contact!==undefined)throw Error('Conventional contact on Janko keyboard');
        if(raw.row!==undefined)jankoContact(RR_JANKO_FOUR_ROW,expected.pitch,raw.row);
      }
    }catch{throw new PianoAuthorityConflict('Saved authority has an incompatible physical contact.',[id]);}
    return structuredClone(raw) as PianoAssignmentConstraint;
  };
  const add=(id:string,choice:Partial<PianoAssignmentConstraint>,reference:string)=>
    constraints.push(check({ownerId:id,guard:guard(id),...choice,provenance:{kind:'operator-choice',reference}}));

  const authority=active?.reviewedFingerAuthority;
  if(active?.providedAuthorityProjection&&!authority)throw new PianoAuthorityConflict('Saved provided authority is incomplete.');
  if(authority!==undefined){
    if(!object(authority)||authority.kind!=='explicit-operator-review'||!Array.isArray(authority.constraints))
      throw new PianoAuthorityConflict('Saved reviewed authority has an unknown contract.');
    const seen=new Set<string>();
    for(const q of authority.constraints){
      if(!object(q)||typeof q.id!=='string')throw new PianoAuthorityConflict('Saved reviewed authority has an incomplete owner record.');
      const expected=guard(q.id),attack=active!.attacks.find(a=>a.id===active!.sourceOwnerToAttack[q.id]);
      if(seen.has(q.id)||q.pitch!==expected.pitch||q.startTick!==expected.startTick||q.durationTicks!==expected.durationTicks||
        !hand(q.hand)||!finger(q.finger)||!attack||attack.hand!==q.hand||attack.finger!==q.finger||q.row!==undefined&&attack.row!==q.row)
        throw new PianoAuthorityConflict('Saved reviewed authority has a stale owner choice.',[q.id]);
      seen.add(q.id);
      const personalChoice=choices[q.id];
      const retained={...(personalChoice?.hand===undefined?{hand:q.hand as 'LH'|'RH'}:{}),...(personalChoice?.finger!==undefined||edited.has(q.id)?{}:{finger:q.finger,...(q.row===undefined?{}:{row:q.row})})};
      if(Object.keys(retained).length)add(q.id,retained,
        'Retained explicit operator authority for '+q.id+'; original review journal stays with its edition');
    }
  }
  if(active?.version===PIANO_ASSIGNMENT_VERSION){
    if(!Array.isArray(active.operatorConstraints))throw new PianoAuthorityConflict('Saved assignment authority is incomplete.');
    for(const raw of active.operatorConstraints){
      const q=check(raw);
      const personalChoice=choices[q.ownerId];
      if(personalChoice?.hand!==undefined)delete q.hand;
      if(personalChoice?.finger!==undefined){delete q.finger;delete q.row;delete q.contact;}
      if(q.provenance.kind==='editorial-hand-retention'){
        // Match the installed owner as well: a stale label must not unlock it.
        if(p.score.notes.find(n=>n.id===q.ownerId)?.hand!==raw.hand)
          throw new PianoAuthorityConflict('Saved automatic retention differs from its installed hand.',[q.ownerId]);
        if(policy==='calculate')continue;
      }
      if(edited.has(q.ownerId)){delete q.finger;delete q.row;delete q.contact;}
      if(q.hand!==undefined||q.finger!==undefined||q.row!==undefined||q.contact!==undefined)constraints.push(q);
    }
  }
  const retainedPersonal=new Set(constraints.filter(c=>(c.provenance.kind as string)==='personal-choice'&&c.hand!==undefined).map(c=>c.ownerId));
  if(policy==='retain-imported')for(const n of p.score.notes)if(choices[n.id]?.hand===undefined&&!retainedPersonal.has(n.id)&&!constraints.some(c=>c.ownerId===n.id&&c.hand!==undefined))
    constraints.push(check({ownerId:n.id,guard:guard(n.id),hand:n.hand,
      provenance:{kind:'editorial-hand-retention',reference:AUTOMATIC_HAND_RETENTION_REFERENCE}}));
  for(const c of Object.values(personal?.overrides??{}))for(const id of c.ownerIds){
    const retained={...(choices[id]?.hand===undefined?{hand:c.hand}:{}),...(choices[id]?.finger===undefined?{finger:c.replacement,...(c.proposedRow===undefined?{}:{row:c.proposedRow}),...(c.proposedContact?{contact:c.proposedContact}:{})}:{})};
    if(Object.keys(retained).length)add(id,retained,'Saved per-note operator choice: '+c.createdAt);
  }

  for(const c of Object.values(choices))constraints.push(check({ownerId:c.ownerId,guard:guard(c.ownerId),hand:c.hand,finger:c.finger,provenance:{kind:'personal-choice',reference:'Personal owner assignment: '+c.createdAt}}));

  // Detect incompatible alias/source choices before entering any solver.
  const input=normalizeHandPlanningInput(source),required=compilePlanningRequirements(input).attackHands;
  for(const attack of input.gestures.flatMap(g=>g.attacks)){
    const records=constraints.filter(c=>attack.owners.some(o=>o.id===c.ownerId));
    for(const key of ['hand','finger','row','contact'] as const){
      const values=records.map(c=>c[key]).filter(v=>v!==undefined);
      if(key==='hand'&&required[attack.id]&&!attack.owners.every(o=>records.some(c=>c.ownerId===o.id&&(c.provenance.kind as string)==='personal-choice'&&c.hand!==undefined)))values.push(required[attack.id]);
      if(values.some(v=>!same(v,values[0])))throw new PianoAuthorityConflict('Guarded owner choices contradict a source instruction or physical alias.',attack.owners.map(o=>o.id));
    }
  }
  return constraints;
}
