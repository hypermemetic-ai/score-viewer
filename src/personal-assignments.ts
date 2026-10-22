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
/** What an untouched note reads from its twin in a repeat the reader shows once. */
const repeatChoice=(p:ScorePackage,s:PersonalState,id:string)=>s.repeatResolved?.sourceRevision===sourceRevision(p)?s.repeatResolved.choices[id]:undefined;
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
/** Each package's notes by id, built once: hands are read for every seat on every paint. */
const noteIndexes=new WeakMap<ScorePackage,ReadonlyMap<string,ScorePackage['score']['notes'][number]>>();
const noteIndex=(p:ScorePackage)=>{let index=noteIndexes.get(p);if(!index)noteIndexes.set(p,index=new Map(p.score.notes.map(n=>[n.id,n])));return index;};
/** The effective hand of any note under one state, through one carried-hand
 * read: for paints and comparisons over many notes. */
export function effectiveHands(p:ScorePackage,s:PersonalState):(ownerId:string)=>PersonalHand|null {
 const notes=noteIndex(p),carried=handRecurrences(p,s).carried,choices=s.assignments?.choices,repeat=s.repeatResolved?.sourceRevision===sourceRevision(p)?s.repeatResolved.choices:undefined;
 // A carried hand never lands on a note with its own hand; an untouched repeat twin reads its twin's.
 return ownerId=>{const n=notes.get(ownerId);if(!n||n.hand!==undefined&&!validHand(n.hand))throw Error('No piano owner at this source owner.');return carried.get(ownerId)?.hand??choices?.[ownerId]?.hand??repeat?.[ownerId]?.hand??n.hand??null;};
}
/** The owner's effective hand, or null when neither the source nor the player gives one. */
export function handFor(p:ScorePackage,s:PersonalState,ownerId:string):PersonalHand|null {return effectiveHands(p,s)(ownerId);}
/** Whether any note's effective hand differs between two states. Only a note
 * one of them names, by a record or a carried hand, can differ. */
export function handsDiffer(p:ScorePackage,a:PersonalState,b:PersonalState):boolean {
 if(a===b)return false;
 const x=effectiveHands(p,a),y=effectiveHands(p,b),notes=noteIndex(p);
 for(const id of new Set([...Object.keys(a.assignments?.choices??{}),...Object.keys(b.assignments?.choices??{}),...Object.keys(a.repeatResolved?.choices??{}),...Object.keys(b.repeatResolved?.choices??{}),...handRecurrences(p,a).carried.keys(),...handRecurrences(p,b).carried.keys()]))if(notes.has(id)&&x(id)!==y(id))return true;
 return false;
}
/** `carry: false` reads the owner's records alone, without hands carried from matching bars. */
export function effectiveAssignments(p:ScorePackage,s:PersonalState,options:{carry?:boolean}={}):EffectivePersonalAssignment[] {
 readPersonalAssignments(s.assignments,p);
 const carried=options.carry===false?undefined:handRecurrences(p,s).carried,legacyByOwner=new Map(Object.values(s.overrides).flatMap(c=>c.ownerIds.map(id=>[id,c] as const))),layer=s.layer??p.fingerLayer,fingers=new Map(layer?.attacks.flatMap(a=>a.owners.map(o=>[o.id,a.finger] as const)));
 return p.score.notes.filter(isPitchedEvent).map(n=>{
  const c=s.assignments?.choices[n.id],legacy=legacyByOwner.get(n.id),shared=s.memoryResolved?.sourceRevision===sourceRevision(p)?s.memoryResolved.choices[n.id]:undefined,repeat=repeatChoice(p,s,n.id),finger=s.calculatedOwners?.[n.id]?fingers.get(n.id):shared?shared.finger??undefined:c?.finger??legacy?.replacement??repeat?.finger??fingers.get(n.id);
  return{id:n.id,...guard(n),hand:carried?.get(n.id)?.hand??c?.hand??repeat?.hand??n.hand??null,...(finger===undefined?{}:{finger})};
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
 * draw such keys, so only a changed hand is refused, before it is saved. The
 * caller still completes these records, so the carried hands read here are
 * not kept with them. */
function requireDrawableHands(p:ScorePackage,s:PersonalState):void {
 const notes=p.score.notes.filter(isPitchedEvent),carried=s.assignments?deriveHandRecurrences(p,s.assignments).carried:noRecurrences.carried,hand=(n:typeof notes[number])=>carried.get(n.id)?.hand??s.assignments?.choices[n.id]?.hand??n.hand??null;
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

type Note=ScorePackage['score']['notes'][number];
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
 /** A note whose own hand stands where a hand would be carried to it → the bar it would follow without its own hand. */
 following:ReadonlyMap<string,number>;
 /** A hand moved before hand choices recorded their intent → the bars it would reach if chosen again. */
 unshared:ReadonlyMap<string,readonly number[]>;
}
const noRecurrences:HandRecurrences={carried:new Map(),targets:new Map(),skipped:[],following:new Map(),unshared:new Map()};
/** A hand change the owner made and that follows the same music: an explicitly
 * authored hand away from the source's hand, not marked "only here". A legacy
 * hand without recorded intent stays where it is: its value alone does not
 * prove the owner chose it. */
const carriesHand=(c:PersonalOwnerChoice|undefined,source:PersonalHand|null):c is PersonalOwnerChoice&{hand:PersonalHand}=>!!c&&c.hand!==undefined&&!!c.intent?.hand&&c.handScope===undefined&&source!==null&&c.hand!==source;
/** A hand moved before choices recorded their intent: it stays where it is until chosen again. */
const unsharedHand=(c:PersonalOwnerChoice|undefined,source:PersonalHand|null):c is PersonalOwnerChoice&{hand:PersonalHand}=>!!c&&c.hand!==undefined&&!c.intent?.hand&&c.handScope===undefined&&source!==null&&c.hand!==source;
/** The owner's own hand for this note, which a carried hand never replaces. */
const ownsHand=(c:PersonalOwnerChoice|undefined,source:PersonalHand|null)=>!!c&&c.hand!==undefined&&(!!c.intent?.hand||c.handScope!==undefined||c.hand!==source);

/** Receiving bars whose carried hands the engraver refused in this session, per
 * score and keyboard layout. Never saved: such a bar keeps its written hands
 * until the score is read again, and no record of the owner's changes. */
const droppedCarries=new Map<string,Set<number>>();let dropGeneration=0;
const dropKey=(p:ScorePackage)=>`${sourceRevision(p)}\n${p.keyboardLayout??p.manifest.keyboardLayout??''}`;
const barNumber=(p:ScorePackage,n:Note)=>(p.score.sourceBarTicks?.findLastIndex(t=>t<=n.startTick)??-1)+1;
/** Stop carrying hands into the bar holding this note, because the engraver
 * can't draw them there. Returns that bar, or undefined when the note's hand
 * is not carried. */
export function dropHandCarry(p:ScorePackage,s:PersonalState,ownerId:string):number|undefined {
 const n=noteIndex(p).get(ownerId);if(!n||!handRecurrences(p,s).carried.has(ownerId))return;
 const bar=barNumber(p,n),key=dropKey(p),bars=droppedCarries.get(key)??new Set<number>();
 if(!bars.has(bar)){bars.add(bar);droppedCarries.set(key,bars);dropGeneration++;}
 return bar;
}

/** What matching needs from one score, built once: pitched notes in onset
 * order, struck keys, pickups and each compared stretch's notes. */
interface RecurrenceIndex {
 bars:readonly number[];pitched:Note[];longest:number;keys:ReadonlyMap<string,Note[]>;pickup:readonly boolean[];
 stretches:Map<string,{notes:Note[];signature:string}>;
 /** The latest results by the hand records they were derived from, newest last. */
 results:Map<string,HandRecurrences>;
}
const recurrenceIndexes=new WeakMap<ScorePackage,RecurrenceIndex>();
function recurrenceIndex(p:ScorePackage,bars:readonly number[]):RecurrenceIndex {
 const known=recurrenceIndexes.get(p);if(known?.bars===bars)return known;
 const pitched=p.score.notes.filter(isPitchedEvent).sort((a,b)=>a.startTick-b.startTick),keys=new Map<string,Note[]>();
 for(const n of pitched){const k=`${n.startTick}:${pitch(n)}`,list=keys.get(k);if(list)list.push(n);else keys.set(k,[n]);}
 const extents=bars.slice(1).map((t,i)=>t-bars[i]),counts=new Map<number,number>();for(const e of extents)counts.set(e,(counts.get(e)??0)+1);
 const usual=[...counts].sort((a,b)=>b[1]-a[1]||b[0]-a[0])[0][0],meters=[...p.score.timeSignatures??[]].sort((a,b)=>a.tick-b.tick);
 // A bar's full length is its meter's, or the usual bar length when the source gives none.
 const full=(tick:number)=>{const m=meters.filter(m=>m.tick<=tick).at(-1),length=m?m.numerator*p.score.ticksPerBeat*4/m.denominator:usual;return Number.isSafeInteger(length)&&length>0?length:usual;};
 // A pickup is a short bar that opens the piece or follows another short bar (the end of a bar written short).
 const pickup=extents.map((e,t)=>e<full(bars[t])&&(t===0||extents[t-1]<full(bars[t-1])));
 const index={bars,pitched,longest:Math.max(0,...pitched.map(n=>n.durationTicks)),keys,pickup,stretches:new Map(),results:new Map()};
 recurrenceIndexes.set(p,index);return index;
}
const tuple=(n:Note,start:number)=>`${n.hand??'-'}:${pitch(n)}:${n.startTick-start}:${n.durationTicks}`;
/** Every note sounding in the first `length` ticks of bar `t`, held notes included, and their signature from its downbeat. */
function stretch(index:RecurrenceIndex,t:number,length:number){
 const key=`${t}:${length}`,known=index.stretches.get(key);if(known)return known;
 const {pitched}=index,at=index.bars[t],to=at+length,notes:Note[]=[];
 let lo=0,hi=pitched.length;while(lo<hi){const mid=(lo+hi)>>1;if(pitched[mid].startTick<at-index.longest)lo=mid+1;else hi=mid;}
 for(let i=lo;i<pitched.length&&pitched[i].startTick<to;i++){const n=pitched[i];if(n.startTick+n.durationTicks>at)notes.push(n);}
 const value={notes,signature:notes.map(n=>tuple(n,at)).sort().join('|')};index.stretches.set(key,value);return value;
}

const byAssignments=new WeakMap<PersonalAssignments,{p:ScorePackage;generation:number;value:HandRecurrences}>();
/** The owner's hand changes carried to the same music elsewhere in the score,
 * derived from their records and never written back as records of their own.
 * Read on every paint, so the result is kept with the records it came from:
 * hand records are not changed in place once read (an edit clones them). */
export function handRecurrences(p:ScorePackage,s:PersonalState):HandRecurrences {
 const a=s.assignments;if(!a)return noRecurrences;
 const known=byAssignments.get(a);if(known&&known.p===p&&known.generation===dropGeneration)return known.value;
 const value=deriveHandRecurrences(p,a);byAssignments.set(a,{p,generation:dropGeneration,value});return value;
}
function deriveHandRecurrences(p:ScorePackage,a:PersonalAssignments):HandRecurrences {
 const bars=p.score.sourceBarTicks;if(a.sourceRevision!==sourceRevision(p)||!bars||bars.length<2)return noRecurrences;
 const notes=noteIndex(p),hands=Object.values(a.choices).filter(c=>c.hand!==undefined),pitched=(c:PersonalOwnerChoice)=>{const n=notes.get(c.ownerId);return n&&isPitchedEvent(n)?n:undefined;};
 const moves=hands.filter(c=>carriesHand(c,pitched(c)?.hand??null)) as Array<PersonalOwnerChoice&{hand:PersonalHand}>,older=hands.filter(c=>unsharedHand(c,pitched(c)?.hand??null)) as Array<PersonalOwnerChoice&{hand:PersonalHand}>;
 if(!moves.length&&!older.length)return noRecurrences;
 const index=recurrenceIndex(p,bars),dropped=droppedCarries.get(dropKey(p)),key=JSON.stringify([hands.map(c=>[c.ownerId,c.hand,c.handScope??'',c.intent?.hand?1:0]),[...dropped??[]]]);
 const cached=index.results.get(key);if(cached){index.results.delete(key);index.results.set(key,cached);return cached;}
 const value=findHandRecurrences(index,notes,a.choices,moves,older,dropped);
 index.results.set(key,value);if(index.results.size>8)index.results.delete(index.results.keys().next().value!);
 return value;
}
/** The changes made in one written bar travel together. Another bar matches
 * when, from the downbeat to the end of the shorter of the two bars, every
 * sounding note — both hands, held notes included, with the hands the source
 * writes — has the same pitch, hand, duration and place in the bar. A bar
 * written shorter, as a return whose pickup moves to the next bar, still
 * matches over what both bars play; the same notes among other notes do not.
 * A pickup matches only a pickup of its length. The changed notes inside that
 * stretch travel, and one after it (bar 11's pickup) stays in its bar. A note
 * with the owner's own hand keeps it, and a bar where the result could not be
 * drawn is skipped. */
function findHandRecurrences(index:RecurrenceIndex,notes:ReadonlyMap<string,Note>,choices:PersonalAssignments['choices'],moves:Array<PersonalOwnerChoice&{hand:PersonalHand}>,older:Array<PersonalOwnerChoice&{hand:PersonalHand}>,dropped:ReadonlySet<number>|undefined):HandRecurrences {
 const {bars,pickup,keys}=index;
 const barOf=(tick:number)=>{let lo=0,hi=bars.length-2;while(lo<hi){const mid=(lo+hi+1)>>1;if(bars[mid]<=tick)lo=mid;else hi=mid-1;}return lo;};
 const byBar=(list:typeof moves)=>{const groups=new Map<number,typeof moves>();for(const c of list){const b=barOf(notes.get(c.ownerId)!.startTick);groups.set(b,[...groups.get(b)??[],c]);}return [...groups].sort((x,y)=>x[0]-y[0]);};
 /** Each other bar playing bar `b`'s music over the stretch both play, with that stretch's notes and the moves found in it. */
 const matching=function*(b:number,group:typeof moves){
  const start=bars[b],extent=bars[b+1]-start,changed=new Map(group.map(c=>{const n=notes.get(c.ownerId)!;return [tuple(n,start),{hand:c.hand,ownerId:c.ownerId,onset:n.startTick-start}] as const;}));
  for(let t=0;t<bars.length-1;t++){
   const other=bars[t+1]-bars[t],shared=Math.min(extent,other);
   if(t===b||pickup[t]!==pickup[b]||pickup[b]&&other!==extent||!group.some(c=>notes.get(c.ownerId)!.startTick-start<shared))continue;
   const there=stretch(index,t,shared);if(there.signature!==stretch(index,b,shared).signature)continue;
   const found:Array<{n:Note;hand:PersonalHand;ownerId:string}>=[];
   for(const n of there.notes){const move=changed.get(tuple(n,bars[t]));if(move&&move.onset<shared)found.push({n,hand:move.hand,ownerId:move.ownerId});}
   yield {t,found};
  }
 };
 const carried=new Map<string,CarriedHand>(),targets=new Map<number,number[]>(),skipped:SkippedHandCarry[]=[],following=new Map<string,number>(),unshared=new Map<string,number[]>();
 const handOf=(n:Note,adding:ReadonlyMap<string,PersonalHand>)=>adding.get(n.id)??carried.get(n.id)?.hand??choices[n.id]?.hand??n.hand??null;
 for(const [b,group] of byBar(moves))for(const {t,found} of matching(b,group)){
  const adding=new Map<string,PersonalHand>(),sources=new Map<string,string>();
  for(const {n,hand,ownerId} of found){
   if(ownsHand(choices[n.id],n.hand??null)){if(!following.has(n.id))following.set(n.id,b+1);continue;}
   const prior=carried.get(n.id);if(prior&&prior.hand!==hand)continue;adding.set(n.id,hand);sources.set(n.id,ownerId);
  }
  if(!adding.size)continue;
  if(dropped?.has(t+1)){skipped.push({fromBar:b+1,toBar:t+1,reason:'the carried hand can’t be drawn there'});continue;}
  // A struck key written as two notes is drawn only when all of its notes have a hand, or none.
  const mixed=[...adding.keys()].some(id=>{const n=notes.get(id)!,key=keys.get(`${n.startTick}:${pitch(n)}`)!;return key.some(q=>handOf(q,adding)===null)&&key.some(q=>handOf(q,adding)!==null);});
  if(mixed){skipped.push({fromBar:b+1,toBar:t+1,reason:'a key there is written as two notes, and only one of them would have a hand'});continue;}
  for(const [id,hand] of adding)carried.set(id,{hand,fromBar:b+1,fromOwnerId:sources.get(id)!});
  targets.set(b+1,[...targets.get(b+1)??[],t+1]);
 }
 for(const [b,group] of byBar(older))for(const {t,found} of matching(b,group))for(const {n,ownerId} of found)
  if(!ownsHand(choices[n.id],n.hand??null)){const reach=unshared.get(ownerId)??[];if(!reach.includes(t+1))unshared.set(ownerId,[...reach,t+1]);}
 return{carried,targets,skipped,following,unshared};
}
/** Where the selected note's hand comes from, for the editor to say. `follows`
 * is the bar a local hand would follow again if it stopped being local;
 * `unshared` is a hand moved before moves were shared, with the bars it would reach. */
export type HandProvenance=
 | {kind:'carried';hand:PersonalHand;fromBar:number}
 | {kind:'shared';hand:PersonalHand;toBars:readonly number[]}
 | {kind:'local';hand:PersonalHand;follows?:number}
 | {kind:'unshared';hand:PersonalHand;toBars:readonly number[]};
export function handProvenance(p:ScorePackage,s:PersonalState,ownerId:string):HandProvenance|undefined {
 const n=noteIndex(p).get(ownerId),c=s.assignments?.choices[ownerId];if(!n||!isPitchedEvent(n))return;
 const recurrences=handRecurrences(p,s),carried=recurrences.carried.get(ownerId);
 if(carried)return{kind:'carried',hand:carried.hand,fromBar:carried.fromBar};
 if(!c||c.hand===undefined)return;
 if(carriesHand(c,n.hand??null))return{kind:'shared',hand:c.hand,toBars:recurrences.targets.get(barNumber(p,n))??[]};
 const reach=recurrences.unshared.get(ownerId);if(reach)return{kind:'unshared',hand:c.hand,toBars:reach};
 if(c.handScope!=='local')return;
 const follows=recurrences.following.get(ownerId);
 return{kind:'local',hand:c.hand,...(follows===undefined?{}:{follows})};
}

/** Semantic planning view only: never archive or admit this as a calculated package. */
export function personalPracticePackage(p:ScorePackage,s:PersonalState):ScorePackage {
 const assignments=new Map(effectiveAssignments(p,s).map(a=>[a.id,a]));
 if(p.score.notes.every(n=>assignments.get(n.id)?.hand===(n.hand??null)))return p;
 return{...p,score:{...p.score,notes:p.score.notes.map(n=>({...n,hand:assignments.get(n.id)?.hand??n.hand}))}};
}
