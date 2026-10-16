import {isPitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import {hashBytes,type ScorePackage,type Seat} from './package';
import type {PersonalState} from './state';

export type PersonalHand='LH'|'RH';
export interface PersonalFieldIntent {decisionId:string;authoredAt:string;lineageId:string}
export interface PersonalOwnerChoice {
 ownerId:string;guard:{pitch:number;startTick:number;durationTicks:number};
 /** `hand: null`: the source gives this owner no performing hand. */
 original:{hand:PersonalHand|null;finger?:number};hand?:PersonalHand;finger?:number;createdAt:string;
 /** Absent on legacy records: display values alone do not prove field authorship. */
 intent?:{hand?:PersonalFieldIntent;finger?:PersonalFieldIntent};
}
export interface PersonalAssignments {version:'personal-owner-assignments-v1';sourceRevision:string;choices:Record<string,PersonalOwnerChoice>}
/** `hand: null` is a hand-less owner: the source gives none and the player has not chosen one. */
export interface EffectivePersonalAssignment {id:string;pitch:number;startTick:number;durationTicks:number;hand:PersonalHand|null;finger?:number}
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const validHand=(v:unknown):v is PersonalHand=>v==='LH'||v==='RH';
const validFinger=(v:unknown)=>Number.isInteger(v)&&Number(v)>=1&&Number(v)<=5;
const sourceRevision=(p:ScorePackage)=>p.sourceRevision??p.manifest.revision;
const pitch=(n:ScorePackage['score']['notes'][number])=>{if(!isPitchedEvent(n))throw Error('Personal assignments require a pitched piano owner.');return n.pitch.octave*12+n.pitch.pitchClass;};
const guard=(n:ScorePackage['score']['notes'][number])=>({pitch:pitch(n),startTick:n.startTick,durationTicks:n.durationTicks});
const baseFinger=(p:ScorePackage,s:PersonalState,id:string)=>{const layer=s.layer??p.fingerLayer;return layer?.attacks.find(a=>a.id===layer.sourceOwnerToAttack[id])?.finger;};
/** Only admitted shared contact owners establish aliases; coincident pitches do not. */
const aliases=(p:ScorePackage,id:string)=>{if(!p.score.notes.some(n=>n.id===id))throw Error('Personal choice names an unknown source owner.');const ids=new Set([id]);let changed=true;while(changed){changed=false;for(const seat of p.seats)if(seat.ownerIds.some(owner=>ids.has(owner)))for(const owner of seat.ownerIds)if(!ids.has(owner)){ids.add(owner);changed=true;}}return [...ids];};

/** Validate immutable source guards without treating authored hand inference as personal authority. */
export function readPersonalAssignments(raw:unknown,p:ScorePackage):PersonalAssignments|undefined {
 if(raw===undefined)return;
 if(!object(raw)||raw.version!=='personal-owner-assignments-v1'||raw.sourceRevision!==sourceRevision(p)||!object(raw.choices))throw Error('Personal assignment source differs; original data retained.');
 const notes=new Map(p.score.notes.map(n=>[n.id,n]));
 for(const [id,c]of Object.entries(raw.choices)){
  const n=notes.get(id);
  if(!n||!object(c)||c.ownerId!==id||!object(c.guard)||Object.keys(c.guard).length!==3||Object.entries(guard(n)).some(([k,v])=>c.guard[k]!==v)||
   !object(c.original)||c.original.hand!==(n.hand??null)||c.original.finger!==undefined&&!validFinger(c.original.finger)||
   c.hand!==undefined&&!validHand(c.hand)||c.finger!==undefined&&!validFinger(c.finger)||c.hand===undefined&&c.finger===undefined||
   typeof c.createdAt!=='string'||!Number.isFinite(Date.parse(c.createdAt)))throw Error('Personal assignment owner guard differs; original data retained.');
  if(c.intent!==undefined){if(!object(c.intent)||Object.keys(c.intent).some(k=>k!=='hand'&&k!=='finger'))throw Error('Personal assignment intent differs; original data retained.');for(const [field,intent] of Object.entries(c.intent)){if(c[field]===undefined||!object(intent)||Object.keys(intent).some(k=>!['decisionId','authoredAt','lineageId'].includes(k))||typeof intent.decisionId!=='string'||!intent.decisionId||typeof intent.lineageId!=='string'||!intent.lineageId||typeof intent.authoredAt!=='string'||!Number.isFinite(Date.parse(intent.authoredAt)))throw Error('Personal assignment intent differs; original data retained.');}}
 }
 // A physical unison contact is one choice even when written with duplicate heads/voices.
 for(const [id,c]of Object.entries(raw.choices))for(const other of aliases(p,id)){
  const q=raw.choices[other];
  if(!q||q.hand!==c.hand||q.finger!==c.finger)throw Error('Personal assignment physical aliases disagree; original data retained.');
 }
 return structuredClone(raw) as PersonalAssignments;
}

/** A plain account of hand-less notes and what the player can do about them. */
export function handlessMessage(count:number,purpose:string):string {
 return `${count===1?'One note has':`${count} notes have`} no hand in this score. Choose a hand for ${count===1?'it':'each'} (L or R while editing) before ${purpose}.`;
}
/** The owner's effective hand, or null when neither the source nor the player gives one. */
export function handFor(p:ScorePackage,s:PersonalState,ownerId:string):PersonalHand|null {
 const n=p.score.notes.find(n=>n.id===ownerId);if(!n||n.hand!==undefined&&!validHand(n.hand))throw Error('No piano owner at this source owner.');
 return s.assignments?.choices[ownerId]?.hand??n.hand??null;
}
export function effectiveAssignments(p:ScorePackage,s:PersonalState):EffectivePersonalAssignment[] {
 readPersonalAssignments(s.assignments,p);
 const legacyByOwner=new Map(Object.values(s.overrides).flatMap(c=>c.ownerIds.map(id=>[id,c] as const))),layer=s.layer??p.fingerLayer,fingers=new Map(layer?.attacks.flatMap(a=>a.owners.map(o=>[o.id,a.finger] as const)));
 return p.score.notes.filter(isPitchedEvent).map(n=>{
  const c=s.assignments?.choices[n.id],legacy=legacyByOwner.get(n.id),shared=s.memoryResolved?.sourceRevision===sourceRevision(p)?s.memoryResolved.choices[n.id]:undefined,finger=s.calculatedOwners?.[n.id]?fingers.get(n.id):shared?shared.finger??undefined:c?.finger??legacy?.replacement??fingers.get(n.id);
  return{id:n.id,...guard(n),hand:c?.hand??n.hand??null,...(finger===undefined?{}:{finger})};
 }).sort((a,b)=>a.id.localeCompare(b.id));
}
/** Canonical content key is synchronous; durable digests can be computed away from key handling. */
export const effectiveAssignmentKey=(p:ScorePackage,s:PersonalState)=>JSON.stringify(effectiveAssignments(p,s));
export const effectiveAssignmentDigest=(p:ScorePackage,s:PersonalState)=>hashBytes(effectiveAssignmentKey(p,s));

/** One struck key (one onset, one pitch) is played by one hand, so a hand
 * choice covers every owner of the key: its shared-head aliases and any
 * hand-less owner written as a separate head in another voice. */
export function handChoiceOwners(p:ScorePackage,seat:Seat):string[] {
 const ids=new Set(seat.ownerIds.flatMap(id=>aliases(p,id))),key=(n:ScorePackage['score']['notes'][number])=>`${n.startTick}:${pitch(n)}`;
 const keys=new Set(p.score.notes.filter(n=>ids.has(n.id)).map(key));
 for(const n of p.score.notes)if(!ids.has(n.id)&&isPitchedEvent(n)&&keys.has(key(n)))for(const id of aliases(p,n.id))ids.add(id);
 return [...ids];
}
/** Surgical owner choice. Duplicate/continuation appearances share source ownership; recurrences do not. */
export function assigned(p:ScorePackage,s:PersonalState,seat:Seat,choice:{hand?:PersonalHand;finger?:number}):PersonalState {
 if(choice.hand!==undefined&&!validHand(choice.hand)||choice.finger!==undefined&&!validFinger(choice.finger)||choice.hand===undefined&&choice.finger===undefined)throw Error('Choose Left or Right and a finger from 1 to 5.');
 const next=structuredClone(s),contact=new Set(seat.ownerIds.flatMap(id=>aliases(p,id))),ids=choice.hand===undefined?[...contact]:handChoiceOwners(p,seat);
 if(!ids.length)throw Error('No editable source owner.');
 next.assignments??={version:'personal-owner-assignments-v1',sourceRevision:sourceRevision(p),choices:{}};
 const now=new Date().toISOString(),editIntent:NonNullable<PersonalOwnerChoice['intent']>={};for(const field of ['hand','finger'] as const)if(choice[field]!==undefined){const decisionId=crypto.randomUUID();editIntent[field]={decisionId,lineageId:decisionId,authoredAt:now};}
 for(const id of ids){const n=p.score.notes.find(n=>n.id===id)!,old=next.assignments.choices[id];
  // Preserve prior explicit fields. Unedited fields resolve through existing authority.
  // A finger belongs to the chosen contact only, never to another head of its key.
  const chosenFinger=contact.has(id)?choice.finger:undefined;
  const finger=chosenFinger??old?.finger??Object.values(s.overrides).find(c=>c.ownerIds.includes(id))?.replacement,hand=choice.hand??old?.hand,intent={...old?.intent,...(editIntent.hand&&choice.hand!==undefined?{hand:editIntent.hand}:{}),...(editIntent.finger&&chosenFinger!==undefined?{finger:editIntent.finger}:{})};
  if(chosenFinger!==undefined&&next.calculatedOwners)delete next.calculatedOwners[id];
  next.assignments.choices[id]={ownerId:id,guard:guard(n),original:old?.original??{hand:n.hand??null,...(baseFinger(p,s,id)===undefined?{}:{finger:baseFinger(p,s,id)})},...(hand===undefined?{}:{hand}),intent,
   ...(finger===undefined?{}:{finger}),createdAt:old?.createdAt??new Date().toISOString()};
 }
 if(choice.hand!==undefined)requireDrawableHands(p,next);
 next.view.fingerSet='yours';readPersonalAssignments(next.assignments,p);return next;
}
/** The pages draw one head per struck key, and ISO draws changed hands only
 * when no key still mixes a hand with no hand. The source's own pages already
 * draw such keys, so only a changed hand is refused, before it is saved. */
function requireDrawableHands(p:ScorePackage,s:PersonalState):void {
 const notes=p.score.notes.filter(isPitchedEvent),hand=(n:typeof notes[number])=>s.assignments?.choices[n.id]?.hand??n.hand??null;
 if(notes.every(n=>hand(n)===(n.hand??null)))return;
 const keys=new Map<string,typeof notes>();for(const n of notes){const k=`${n.startTick}:${pitch(n)}`;keys.set(k,[...keys.get(k)??[],n]);}
 const mixed=(of:(n:typeof notes[number])=>PersonalHand|null)=>[...keys.values()].filter(key=>key.some(n=>of(n)===null)&&key.some(n=>of(n)!==null));
 const remaining=mixed(hand);if(!remaining.length)return;
 const bars=(list:typeof remaining)=>[...new Set(list.map(key=>p.seats.find(seat=>seat.ownerIds.some(id=>key.some(n=>n.id===id)))?.writtenBar).filter(bar=>bar!==undefined))].sort((a,b)=>a-b);
 const source=mixed(n=>n.hand??null);
 // A choice resolves one key, so with several such keys no single choice can be drawn.
 if(source.length>1)throw Error(`${listBars(bars(source))} ${source.length} keys written as two notes where only one note has a hand. The viewer can't draw hand choices for this score yet.`);
 const [bar]=bars(remaining);
 throw Error(`${bar===undefined?'This score has':`Bar ${bar} has`} a key written as two notes, and only one of them has a hand. Choose a hand for that key first (L or R).`);
}
const listBars=(bars:number[])=>!bars.length?'This score has':bars.length===1?`Bar ${bars[0]} has`:`Bars ${bars.slice(0,-1).join(', ')} and ${bars.at(-1)} have`;
export function restorePersonalAssignment(p:ScorePackage,s:PersonalState,seat:Seat):PersonalState {
 const next=structuredClone(s);for(const id of seat.ownerIds.flatMap(id=>aliases(p,id)))if(next.assignments)delete next.assignments.choices[id];
 if(next.assignments&&!Object.keys(next.assignments.choices).length)delete next.assignments;
 return next;
}

/** Semantic planning view only: never archive or admit this as a calculated package. */
export function personalPracticePackage(p:ScorePackage,s:PersonalState):ScorePackage {
 const assignments=new Map(effectiveAssignments(p,s).map(a=>[a.id,a]));
 if(p.score.notes.every(n=>assignments.get(n.id)?.hand===(n.hand??null)))return p;
 return{...p,score:{...p.score,notes:p.score.notes.map(n=>({...n,hand:assignments.get(n.id)?.hand??n.hand}))}};
}
