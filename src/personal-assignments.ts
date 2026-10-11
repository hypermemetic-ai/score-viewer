import {isPitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import {hashBytes,type ScorePackage,type Seat} from './package';
import type {PersonalState} from './state';

export type PersonalHand='LH'|'RH';
export interface PersonalOwnerChoice {
 ownerId:string;guard:{pitch:number;startTick:number;durationTicks:number};
 original:{hand:PersonalHand;finger?:number};hand?:PersonalHand;finger?:number;createdAt:string;
}
export interface PersonalAssignments {version:'personal-owner-assignments-v1';sourceRevision:string;choices:Record<string,PersonalOwnerChoice>}
export interface EffectivePersonalAssignment {id:string;pitch:number;startTick:number;durationTicks:number;hand:PersonalHand;finger?:number}
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const validHand=(v:unknown):v is PersonalHand=>v==='LH'||v==='RH';
const validFinger=(v:unknown)=>Number.isInteger(v)&&Number(v)>=1&&Number(v)<=5;
const sourceRevision=(p:ScorePackage)=>p.sourceRevision??p.manifest.revision;
const pitch=(n:ScorePackage['score']['notes'][number])=>{if(!isPitchedEvent(n))throw Error('Personal assignments require a pitched piano owner.');return n.pitch.octave*12+n.pitch.pitchClass;};
const guard=(n:ScorePackage['score']['notes'][number])=>({pitch:pitch(n),startTick:n.startTick,durationTicks:n.durationTicks});
const baseFinger=(p:ScorePackage,s:PersonalState,id:string)=>{const layer=s.layer??p.fingerLayer;return layer?.attacks.find(a=>a.id===layer.sourceOwnerToAttack[id])?.finger;};
const aliases=(p:ScorePackage,id:string)=>{const n=p.score.notes.find(n=>n.id===id);if(!n)throw Error('Personal choice names an unknown source owner.');const key=guard(n);return p.score.notes.filter(q=>isPitchedEvent(q)&&q.startTick===key.startTick&&pitch(q)===key.pitch).map(q=>q.id);};

/** Validate immutable source guards without treating authored hand inference as personal authority. */
export function readPersonalAssignments(raw:unknown,p:ScorePackage):PersonalAssignments|undefined {
 if(raw===undefined)return;
 if(!object(raw)||raw.version!=='personal-owner-assignments-v1'||raw.sourceRevision!==sourceRevision(p)||!object(raw.choices))throw Error('Personal assignment source differs; original data retained.');
 const notes=new Map(p.score.notes.map(n=>[n.id,n])),physical=new Map<string,string[]>();
 for(const n of p.score.notes)if(isPitchedEvent(n)){const key=`${n.startTick}:${pitch(n)}`,ids=physical.get(key)??[];ids.push(n.id);physical.set(key,ids);}
 for(const [id,c]of Object.entries(raw.choices)){
  const n=notes.get(id);
  if(!n||!object(c)||c.ownerId!==id||!object(c.guard)||Object.keys(c.guard).length!==3||Object.entries(guard(n)).some(([k,v])=>c.guard[k]!==v)||
   !object(c.original)||c.original.hand!==n.hand||c.original.finger!==undefined&&!validFinger(c.original.finger)||
   c.hand!==undefined&&!validHand(c.hand)||c.finger!==undefined&&!validFinger(c.finger)||c.hand===undefined&&c.finger===undefined||
   typeof c.createdAt!=='string'||!Number.isFinite(Date.parse(c.createdAt)))throw Error('Personal assignment owner guard differs; original data retained.');
 }
 // A physical unison contact is one choice even when written with duplicate heads/voices.
 for(const [id,c]of Object.entries(raw.choices))for(const other of physical.get(`${c.guard.startTick}:${c.guard.pitch}`)??[]){
  const q=raw.choices[other];
  if(!q||q.hand!==c.hand||q.finger!==c.finger)throw Error('Personal assignment physical aliases disagree; original data retained.');
 }
 return structuredClone(raw) as PersonalAssignments;
}

export function handFor(p:ScorePackage,s:PersonalState,ownerId:string):PersonalHand {
 const n=p.score.notes.find(n=>n.id===ownerId);if(!n||!validHand(n.hand))throw Error('No piano hand at this source owner.');
 return s.assignments?.choices[ownerId]?.hand??n.hand;
}
export function effectiveAssignments(p:ScorePackage,s:PersonalState):EffectivePersonalAssignment[] {
 readPersonalAssignments(s.assignments,p);
 const legacyByOwner=new Map(Object.values(s.overrides).flatMap(c=>c.ownerIds.map(id=>[id,c] as const))),layer=s.layer??p.fingerLayer,fingers=new Map(layer?.attacks.flatMap(a=>a.owners.map(o=>[o.id,a.finger] as const)));
 return p.score.notes.filter(isPitchedEvent).map(n=>{
  const c=s.assignments?.choices[n.id],legacy=legacyByOwner.get(n.id),finger=c?.finger??legacy?.replacement??fingers.get(n.id);
  return{id:n.id,...guard(n),hand:(c?.hand??n.hand) as PersonalHand,...(finger===undefined?{}:{finger})};
 }).sort((a,b)=>a.id.localeCompare(b.id));
}
/** Canonical content key is synchronous; durable digests can be computed away from key handling. */
export const effectiveAssignmentKey=(p:ScorePackage,s:PersonalState)=>JSON.stringify(effectiveAssignments(p,s));
export const effectiveAssignmentDigest=(p:ScorePackage,s:PersonalState)=>hashBytes(effectiveAssignmentKey(p,s));

/** Surgical owner choice. Duplicate/continuation appearances share source ownership; recurrences do not. */
export function assigned(p:ScorePackage,s:PersonalState,seat:Seat,choice:{hand?:PersonalHand;finger?:number}):PersonalState {
 if(choice.hand!==undefined&&!validHand(choice.hand)||choice.finger!==undefined&&!validFinger(choice.finger)||choice.hand===undefined&&choice.finger===undefined)throw Error('Choose Left or Right and a finger from 1 to 5.');
 const next=structuredClone(s),current=new Map(effectiveAssignments(p,s).map(a=>[a.id,a])),ids=[...new Set(seat.ownerIds.flatMap(id=>aliases(p,id)))];
 if(!ids.length)throw Error('No editable source owner.');
 next.assignments??={version:'personal-owner-assignments-v1',sourceRevision:sourceRevision(p),choices:{}};
 for(const id of ids){const n=p.score.notes.find(n=>n.id===id)!,old=next.assignments.choices[id],effective=current.get(id)!;
  // A hand edit retains the current finger, including an existing legacy correction.
  const finger=choice.finger??effective.finger,hand=choice.hand??effective.hand;
  next.assignments.choices[id]={ownerId:id,guard:guard(n),original:old?.original??{hand:n.hand as PersonalHand,...(baseFinger(p,s,id)===undefined?{}:{finger:baseFinger(p,s,id)})},hand,
   ...(finger===undefined?{}:{finger}),createdAt:old?.createdAt??new Date().toISOString()};
 }
 next.view.fingerSet='yours';readPersonalAssignments(next.assignments,p);return next;
}
export function restorePersonalAssignment(p:ScorePackage,s:PersonalState,seat:Seat):PersonalState {
 const next=structuredClone(s);for(const id of seat.ownerIds.flatMap(id=>aliases(p,id)))if(next.assignments)delete next.assignments.choices[id];
 if(next.assignments&&!Object.keys(next.assignments.choices).length)delete next.assignments;
 return next;
}

/** Semantic planning view only: never archive or admit this as a calculated package. */
export function personalPracticePackage(p:ScorePackage,s:PersonalState):ScorePackage {
 const assignments=new Map(effectiveAssignments(p,s).map(a=>[a.id,a]));
 if(p.score.notes.every(n=>assignments.get(n.id)?.hand===n.hand))return p;
 return{...p,score:{...p.score,notes:p.score.notes.map(n=>({...n,hand:assignments.get(n.id)?.hand??n.hand}))}};
}
