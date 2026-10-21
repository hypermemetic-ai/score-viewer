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
 /** `'local'`: this hand applies here only. It is not carried to matching bars,
  * and a hand carried from another bar does not replace it. */
 handScope?:'local';
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
   c.hand!==undefined&&!validHand(c.hand)||c.finger!==undefined&&!validFinger(c.finger)||c.hand===undefined&&c.finger===undefined||c.handScope!==undefined&&(c.handScope!=='local'||c.hand===undefined)||
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
 return handRecurrences(p,s).carried.get(ownerId)?.hand??s.assignments?.choices[ownerId]?.hand??n.hand??null;
}
/** `carry: false` reads the owner's records alone, without hands carried from matching bars. */
export function effectiveAssignments(p:ScorePackage,s:PersonalState,options:{carry?:boolean}={}):EffectivePersonalAssignment[] {
 readPersonalAssignments(s.assignments,p);
 const carried=options.carry===false?undefined:handRecurrences(p,s).carried,legacyByOwner=new Map(Object.values(s.overrides).flatMap(c=>c.ownerIds.map(id=>[id,c] as const))),layer=s.layer??p.fingerLayer,fingers=new Map(layer?.attacks.flatMap(a=>a.owners.map(o=>[o.id,a.finger] as const)));
 return p.score.notes.filter(isPitchedEvent).map(n=>{
  const c=s.assignments?.choices[n.id],legacy=legacyByOwner.get(n.id),shared=s.memoryResolved?.sourceRevision===sourceRevision(p)?s.memoryResolved.choices[n.id]:undefined,finger=s.calculatedOwners?.[n.id]?fingers.get(n.id):shared?shared.finger??undefined:c?.finger??legacy?.replacement??fingers.get(n.id);
  return{id:n.id,...guard(n),hand:carried?.get(n.id)?.hand??c?.hand??n.hand??null,...(finger===undefined?{}:{finger})};
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
/** Owner choice on one contact. Duplicate/continuation appearances share source
 * ownership. Recurrences are not written: a hand change reaches matching bars
 * through `handRecurrences`, and a finger through the fingering memory.
 * `local` makes the hand apply here only (true) or follow matching bars again
 * (false); left out, the contact keeps the scope it had. */
export function assigned(p:ScorePackage,s:PersonalState,seat:Seat,choice:{hand?:PersonalHand;finger?:number;local?:boolean}):PersonalState {
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
  const local=hand!==undefined&&(choice.hand!==undefined&&choice.local!==undefined?choice.local:old?.handScope==='local');
  next.assignments.choices[id]={ownerId:id,guard:guard(n),original:old?.original??{hand:n.hand??null,...(baseFinger(p,s,id)===undefined?{}:{finger:baseFinger(p,s,id)})},...(hand===undefined?{}:{hand}),intent,
   ...(finger===undefined?{}:{finger}),...(local?{handScope:'local' as const}:{}),createdAt:old?.createdAt??new Date().toISOString()};
 }
 if(choice.hand!==undefined)requireDrawableHands(p,next);
 next.view.fingerSet='yours';readPersonalAssignments(next.assignments,p);return next;
}
/** The pages draw one head per struck key, and ISO draws changed hands only
 * when no key still mixes a hand with no hand. The source's own pages already
 * draw such keys, so only a changed hand is refused, before it is saved. */
function requireDrawableHands(p:ScorePackage,s:PersonalState):void {
 const notes=p.score.notes.filter(isPitchedEvent),carried=handRecurrences(p,s).carried,hand=(n:typeof notes[number])=>carried.get(n.id)?.hand??s.assignments?.choices[n.id]?.hand??n.hand??null;
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

/** A hand carried to a note from the same music in another bar. */
export interface CarriedHand {hand:PersonalHand;fromBar:number;fromOwnerId:string}
export interface SkippedHandCarry {fromBar:number;toBar:number;reason:string}
export interface HandRecurrences {
 /** Receiving note → the hand it takes and where that hand was chosen. */
 carried:ReadonlyMap<string,CarriedHand>;
 /** Each bar whose hand changes are carried → the bars receiving them. */
 targets:ReadonlyMap<number,readonly number[]>;
 /** Matching bars the change does not reach, because it could not be drawn there. */
 skipped:readonly SkippedHandCarry[];
}
const noRecurrences:HandRecurrences={carried:new Map(),targets:new Map(),skipped:[]};
const recurrenceCache=new WeakMap<ScorePackage,{key:string;value:HandRecurrences}>();
/** A hand change the owner made and that follows the same music: an explicitly
 * authored hand away from the source's hand, not marked "only here". A legacy
 * hand without recorded intent stays where it is: its value alone does not
 * prove the owner chose it. */
const carriesHand=(c:PersonalOwnerChoice|undefined,source:PersonalHand|null):c is PersonalOwnerChoice&{hand:PersonalHand}=>!!c&&c.hand!==undefined&&!!c.intent?.hand&&c.handScope===undefined&&source!==null&&c.hand!==source;
/** The owner's own hand for this note, which a carried hand never replaces. */
const ownsHand=(c:PersonalOwnerChoice|undefined,source:PersonalHand|null)=>!!c&&c.hand!==undefined&&(!!c.intent?.hand||c.handScope!==undefined||c.hand!==source);
/** The owner's hand changes carried to the same music elsewhere in the score,
 * derived from their records and never written back as records of their own.
 * The changes made in one written bar travel together. Another bar matches
 * when, from the downbeat to the end of the shorter of the two bars, every
 * sounding note — both hands, held notes included, with the hands the source
 * writes — has the same pitch, hand, duration and place in the bar, and that
 * stretch holds every changed note. A bar written shorter, as a return whose
 * pickup moves to the next bar, still matches over what both bars play; the
 * same notes among other notes do not. A note with the owner's own hand
 * keeps it, and a bar where the result could not be drawn is skipped. */
export function handRecurrences(p:ScorePackage,s:PersonalState):HandRecurrences {
 const choices=s.assignments&&s.assignments.sourceRevision===sourceRevision(p)?s.assignments.choices:undefined,bars=choices?p.score.sourceBarTicks:undefined;
 if(!choices||!bars||bars.length<2)return noRecurrences;
 const notes=new Map(p.score.notes.map(n=>[n.id,n]));
 const moves=Object.values(choices).filter(c=>{const n=notes.get(c.ownerId);return !!n&&isPitchedEvent(n)&&carriesHand(c,n.hand??null);}) as Array<PersonalOwnerChoice&{hand:PersonalHand}>;
 if(!moves.length)return noRecurrences;
 const key=JSON.stringify(Object.values(choices).filter(c=>c.hand!==undefined).map(c=>[c.ownerId,c.hand,c.handScope??'',c.intent?.hand?1:0]));
 const cached=recurrenceCache.get(p);if(cached?.key===key)return cached.value;
 const value=findHandRecurrences(p,choices,moves,bars);recurrenceCache.set(p,{key,value});return value;
}
function findHandRecurrences(p:ScorePackage,choices:PersonalAssignments['choices'],moves:Array<PersonalOwnerChoice&{hand:PersonalHand}>,bars:readonly number[]):HandRecurrences {
 type Note=ScorePackage['score']['notes'][number];
 const pitched=p.score.notes.filter(isPitchedEvent).sort((a,b)=>a.startTick-b.startTick),notes=new Map<string,Note>(pitched.map(n=>[n.id,n])),longest=Math.max(0,...pitched.map(n=>n.durationTicks));
 const barOf=(tick:number)=>{let lo=0,hi=bars.length-2;while(lo<hi){const mid=(lo+hi+1)>>1;if(bars[mid]<=tick)lo=mid;else hi=mid-1;}return lo;};
 const firstFrom=(tick:number)=>{let lo=0,hi=pitched.length;while(lo<hi){const mid=(lo+hi)>>1;if(pitched[mid].startTick<tick)lo=mid+1;else hi=mid;}return lo;};
 const sounding=(from:number,to:number)=>{const list:Note[]=[];for(let i=firstFrom(from-longest);i<pitched.length&&pitched[i].startTick<to;i++){const n=pitched[i];if(n.startTick+n.durationTicks>from)list.push(n);}return list;};
 const tuple=(n:Note,start:number)=>`${n.hand??'-'}:${pitch(n)}:${n.startTick-start}:${n.durationTicks}`;
 const signature=(list:Note[],start:number)=>list.map(n=>tuple(n,start)).sort().join('|');
 const keys=new Map<string,Note[]>();for(const n of pitched){const k=`${n.startTick}:${pitch(n)}`;keys.set(k,[...keys.get(k)??[],n]);}
 const groups=new Map<number,typeof moves>();for(const c of moves){const b=barOf(notes.get(c.ownerId)!.startTick);groups.set(b,[...groups.get(b)??[],c]);}
 const carried=new Map<string,CarriedHand>(),targets=new Map<number,number[]>(),skipped:SkippedHandCarry[]=[];
 const handOf=(n:Note,adding:ReadonlyMap<string,PersonalHand>)=>adding.get(n.id)??carried.get(n.id)?.hand??choices[n.id]?.hand??n.hand??null;
 for(const [b,group] of [...groups].sort((x,y)=>x[0]-y[0])){
  const start=bars[b],extent=bars[b+1]-start,moved=group.map(c=>notes.get(c.ownerId)!),last=Math.max(...moved.map(n=>n.startTick))-start;
  const hands=new Map(group.map(c=>[tuple(notes.get(c.ownerId)!,start),{hand:c.hand,ownerId:c.ownerId}]));
  for(let t=0;t<bars.length-1;t++){
   const at=bars[t],shared=Math.min(extent,bars[t+1]-at);if(t===b||last>=shared)continue;
   const context=sounding(at,at+shared);if(signature(context,at)!==signature(sounding(start,start+shared),start))continue;
   const adding=new Map<string,PersonalHand>(),sources=new Map<string,string>();
   for(const n of context){const move=hands.get(tuple(n,at));if(!move||ownsHand(choices[n.id],n.hand??null))continue;const prior=carried.get(n.id);if(prior&&prior.hand!==move.hand)continue;adding.set(n.id,move.hand);sources.set(n.id,move.ownerId);}
   if(!adding.size)continue;
   // A struck key written as two notes is drawn only when all of its notes have a hand, or none.
   const mixed=[...adding.keys()].some(id=>{const n=notes.get(id)!,key=keys.get(`${n.startTick}:${pitch(n)}`)!;return key.some(q=>handOf(q,adding)===null)&&key.some(q=>handOf(q,adding)!==null);});
   if(mixed){skipped.push({fromBar:b+1,toBar:t+1,reason:'a key there is written as two notes, and only one of them has a hand'});continue;}
   for(const [id,hand] of adding)carried.set(id,{hand,fromBar:b+1,fromOwnerId:sources.get(id)!});
   targets.set(b+1,[...targets.get(b+1)??[],t+1]);
  }
 }
 return{carried,targets,skipped};
}
/** Where the selected note's hand comes from, for the editor to say. `follows`
 * is the bar a local hand would follow again if it stopped being local. */
export type HandProvenance=
 | {kind:'carried';hand:PersonalHand;fromBar:number}
 | {kind:'shared';hand:PersonalHand;toBars:readonly number[]}
 | {kind:'local';hand:PersonalHand;follows?:number};
export function handProvenance(p:ScorePackage,s:PersonalState,ownerId:string):HandProvenance|undefined {
 const n=p.score.notes.find(n=>n.id===ownerId),c=s.assignments?.choices[ownerId];if(!n||!isPitchedEvent(n))return;
 const recurrences=handRecurrences(p,s),carried=recurrences.carried.get(ownerId);
 if(carried)return{kind:'carried',hand:carried.hand,fromBar:carried.fromBar};
 if(!c||c.hand===undefined)return;
 if(carriesHand(c,n.hand??null)){const bars=p.score.sourceBarTicks;const bar=bars?bars.findLastIndex(t=>t<=n.startTick)+1:0;return{kind:'shared',hand:c.hand,toBars:recurrences.targets.get(bar)??[]};}
 if(c.handScope!=='local')return;
 const without=structuredClone(s);delete without.assignments!.choices[ownerId];const follows=handRecurrences(p,without).carried.get(ownerId)?.fromBar;
 return{kind:'local',hand:c.hand,...(follows===undefined?{}:{follows})};
}

/** Semantic planning view only: never archive or admit this as a calculated package. */
export function personalPracticePackage(p:ScorePackage,s:PersonalState):ScorePackage {
 const assignments=new Map(effectiveAssignments(p,s).map(a=>[a.id,a]));
 if(p.score.notes.every(n=>assignments.get(n.id)?.hand===(n.hand??null)))return p;
 return{...p,score:{...p.score,notes:p.score.notes.map(n=>({...n,hand:assignments.get(n.id)?.hand??n.hand}))}};
}
