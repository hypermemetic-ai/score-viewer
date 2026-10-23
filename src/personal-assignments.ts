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
/** A note's hand, in one order everywhere: the owner's own hand (`ownsHand`),
 * else a hand carried from a matching bar, else its repeat twin's (derived,
 * #173), else a stored record that is no hand choice, else the written hand. */
const handInOrder=(c:PersonalOwnerChoice|undefined,written:PersonalHand|null,carried:PersonalHand|undefined,twin:PersonalHand|undefined):PersonalHand|null=>
 (ownsHand(c,written)?c!.hand!:undefined)??carried??twin??c?.hand??written;
/** The effective hand of any note under one state, through one carried-hand
 * read: for paints and comparisons over many notes. */
export function effectiveHands(p:ScorePackage,s:PersonalState):(ownerId:string)=>PersonalHand|null {
 const notes=noteIndex(p),carried=handRecurrences(p,s).carried,choices=s.assignments?.choices,repeat=s.repeatResolved?.sourceRevision===sourceRevision(p)?s.repeatResolved.choices:undefined;
 return ownerId=>{const n=notes.get(ownerId);if(!n||n.hand!==undefined&&!validHand(n.hand))throw Error('No piano owner at this source owner.');return handInOrder(choices?.[ownerId],(n.hand??null) as PersonalHand|null,carried.get(ownerId)?.hand,repeat?.[ownerId]?.hand);};
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
  return{id:n.id,...guard(n),hand:handInOrder(c,(n.hand??null) as PersonalHand|null,carried?.get(n.id)?.hand,repeat?.hand),...(finger===undefined?{}:{finger})};
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
 /** Each carried change → the bars its hand's changes in its bar reach. */
 reach:ReadonlyMap<string,readonly number[]>;
 /** Matching bars the change does not reach, because it could not be drawn there. */
 skipped:readonly SkippedHandCarry[];
 /** A note whose own hand stands where a hand would be carried to it → the bar it would follow without its own hand. */
 following:ReadonlyMap<string,number>;
 /** A hand moved before hand choices recorded their intent → the bars it would reach if chosen again. */
 unshared:ReadonlyMap<string,readonly number[]>;
}
const noRecurrences:HandRecurrences={carried:new Map(),targets:new Map(),reach:new Map(),skipped:[],following:new Map(),unshared:new Map()};
/** A hand change the owner made and that follows the same music: an explicitly
 * authored hand away from the source's hand, not marked "only here". A legacy
 * hand without recorded intent stays where it is: its value alone does not
 * prove the owner chose it. */
const carriesHand=(c:PersonalOwnerChoice|undefined,source:PersonalHand|null):c is PersonalOwnerChoice&{hand:PersonalHand}=>!!c&&c.hand!==undefined&&!!c.intent?.hand&&c.handScope===undefined&&source!==null&&c.hand!==source;
/** A hand moved before choices recorded their intent: it stays where it is until chosen again. */
const unsharedHand=(c:PersonalOwnerChoice|undefined,source:PersonalHand|null):c is PersonalOwnerChoice&{hand:PersonalHand}=>!!c&&c.hand!==undefined&&!c.intent?.hand&&c.handScope===undefined&&source!==null&&c.hand!==source;
/** Whether a note's record holds the owner's own hand, which a hand carried
 * from a matching bar never replaces: a hand chosen with recorded intent, kept
 * to this note, or moved away from the written hand. Before 2026-10-14 a finger
 * edit also saved the note's hand as it then was (No. 14 has 44 such records,
 * each first saved with a finger and none ever a different hand), so a hand
 * without intent that only repeats the written hand is no choice. The pages
 * and the calculator ask this one question, and the repeat fold (#173) is to ask it too. */
export const ownsHand=(c:PersonalOwnerChoice|undefined,source:PersonalHand|null)=>!!c&&c.hand!==undefined&&(!!c.intent?.hand||c.handScope!==undefined||c.hand!==source);

/** Receiving bars whose carried hands the engraver refused in this session, per
 * score and keyboard layout. Never saved: such a bar keeps its written hands
 * until the score is read again, and no record of the owner's changes. */
const droppedCarries=new Map<string,Set<number>>();let dropGeneration=0;
/** Changes whenever a carried hand is dropped in this session: anything derived
 * from carried hands and kept beyond one opening keys on it. */
export const handCarryDropGeneration=()=>dropGeneration;
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
 * order, struck keys, where each bar's downbeat stands, each note's
 * articulation, the notes alike in hand, pitch, length and articulation, each
 * hand's onsets with the notes struck there, and each note's neighbours. */
interface RecurrenceIndex {
 bars:readonly number[];pitched:Note[];keys:ReadonlyMap<string,Note[]>;downbeats:readonly number[];
 marks:ReadonlyMap<string,string>;alike:ReadonlyMap<string,Note[]>;
 onsets:ReadonlyMap<PersonalHand,readonly number[]>;struck:ReadonlyMap<string,Note[]>;
 neighbours:Map<string,string>;
 /** The latest results by the hand records they were derived from, newest last. */
 results:Map<string,HandRecurrences>;
}
const recurrenceIndexes=new WeakMap<ScorePackage,RecurrenceIndex>();
function recurrenceIndex(p:ScorePackage,bars:readonly number[]):RecurrenceIndex {
 const known=recurrenceIndexes.get(p);if(known?.bars===bars)return known;
 const pitched=p.score.notes.filter(isPitchedEvent).sort((a,b)=>a.startTick-b.startTick),keys=new Map<string,Note[]>();
 for(const n of pitched){const k=`${n.startTick}:${pitch(n)}`,list=keys.get(k);if(list)list.push(n);else keys.set(k,[n]);}
 const marks=articulationMarks(p.score,pitched),alike=new Map<string,Note[]>(),struck=new Map<string,Note[]>(),onsets=new Map<PersonalHand,number[]>([['LH',[]],['RH',[]]]);
 for(const n of pitched)if(n.hand==='LH'||n.hand==='RH'){
  const k=alikeKey(marks,n),list=alike.get(k);if(list)list.push(n);else alike.set(k,[n]);
  const at=`${n.hand}:${n.startTick}`,chord=struck.get(at);if(chord)chord.push(n);else{struck.set(at,[n]);onsets.get(n.hand)!.push(n.startTick);}
 }
 const index={bars,pitched,keys,downbeats:downbeatOffsets(p,bars),marks,alike,onsets,struck,neighbours:new Map(),results:new Map()};
 recurrenceIndexes.set(p,index);return index;
}
/** How the source writes each note beyond its pitch, onset and length: its
 * written value and tied components, its articulation (staccato, accent and
 * the like), the slurs it starts, ends or lies under in its own voice, and the
 * graces written before it. Read for what it writes, never by id, tick or bar,
 * so the same material reads the same wherever it stands. */
function articulationMarks(score:ScorePackage['score'],pitched:readonly Note[]):ReadonlyMap<string,string> {
 const marks=new Map<string,unknown[]>(),add=(id:string,mark:unknown)=>{const list=marks.get(id);if(list)list.push(mark);};
 for(const n of pitched){const v=n.sourceWrittenValue;marks.set(n.id,[v?[v.type,v.dots??0]:null,n.articulation??null,!!n.tieStart,!!n.tieEnd]);}
 const starts=new Map(pitched.map(n=>[n.id,n.startTick]));
 for(const c of score.tieChains??[]){const at=starts.get(c.noteId);if(at!==undefined)add(c.noteId,['tie',c.components.map(q=>[q.startTick-at,q.durationTicks,q.tieForward])]);}
 const notes=new Map(pitched.map(n=>[n.id,n])),voices=(n:Note)=>n.sourceProvenance?.voices;
 for(const q of score.phrases??[]){
  const ends=new Set([...q.fromNoteIds,...q.toNoteIds]),first=notes.get(q.fromNoteIds[0]);
  const inVoice=(n:Note)=>voices(n)?voices(n)!.includes(q.voice):!!first&&n.hand===first.hand&&n.voice===first.voice;
  let lo=0,hi=pitched.length;while(lo<hi){const mid=(lo+hi)>>1;if(pitched[mid].startTick<q.startTick)lo=mid+1;else hi=mid;}
  for(let i=lo;i<pitched.length&&pitched[i].startTick<=q.endTick;i++){const n=pitched[i];if(!ends.has(n.id)&&inVoice(n))add(n.id,[q.kind,'under']);}
  for(const id of q.fromNoteIds)add(id,[q.kind,'from']);for(const id of q.toNoteIds)add(id,[q.kind,'to']);
 }
 for(const g of score.graceGroups??[])for(const o of g.occurrences)for(const id of o.hostNoteIds)
  add(id,['grace',g.kind,g.members.map(m=>[m.pitch?12*m.pitch.octave+m.pitch.pitchClass:null,m.duration,'slash' in m?m.slash??false:null])]);
 return new Map([...marks].map(([id,list])=>[id,JSON.stringify([...list.slice(0,4),...list.slice(4).map(x=>JSON.stringify(x)).sort()])]));
}
/** Bars that don't start on a downbeat. A pickup is a short bar that opens the
 * piece or follows another short bar (the end of a bar written short, as No. 13
 * bar 22 after bar 21). A bar's full length is its meter's, or the usual bar
 * length when the source gives none; meter decides nothing else. Hands and
 * fingers carried to bars of another length compare the same bars by this rule. */
export function pickupBars(p:ScorePackage,bars:readonly number[]):boolean[] {return barMeters(p,bars).pickup;}
function barMeters(p:ScorePackage,bars:readonly number[]):{pickup:boolean[];full:number[]} {
 const extents=bars.slice(1).map((t,i)=>t-bars[i]),counts=new Map<number,number>();for(const e of extents)counts.set(e,(counts.get(e)??0)+1);
 if(!extents.length)return {pickup:[],full:[]};
 const usual=[...counts].sort((a,b)=>b[1]-a[1]||b[0]-a[0])[0][0],meters=[...p.score.timeSignatures??[]].sort((a,b)=>a.tick-b.tick);
 const length=(tick:number)=>{const m=meters.filter(m=>m.tick<=tick).at(-1),length=m?m.numerator*p.score.ticksPerBeat*4/m.denominator:usual;return Number.isSafeInteger(length)&&length>0?length:usual;};
 const full=extents.map((_,t)=>length(bars[t]));
 return {pickup:extents.map((e,t)=>e<full[t]&&(t===0||extents[t-1]<full[t-1])),full};
}
/** How far into its meter's bar each written bar starts: a pickup starts that
 * far before its downbeat (No. 13's opening B4 at the last eighth, as bar 11's
 * own pickup), every other bar on its downbeat. */
function downbeatOffsets(p:ScorePackage,bars:readonly number[]):number[] {
 const {pickup,full}=barMeters(p,bars);return pickup.map((short,t)=>short?full[t]-(bars[t+1]-bars[t]):0);
}
/** Notes alike apart from where they stand: hand, pitch, length and articulation. */
const alikeKey=(marks:ReadonlyMap<string,string>,n:Note)=>`${n.hand}:${pitch(n)}:${n.durationTicks}:${marks.get(n.id)}`;
/** The notes the source writes in a note's hand at the onset just before it,
 * with it and just after it, across barlines too, as one signature from the
 * note: pitch, place, length and articulation of each. Nothing on one side (a
 * pickup's missing predecessor) reads as nothing, which only nothing matches. */
function neighbours(index:RecurrenceIndex,n:Note):string {
 const known=index.neighbours.get(n.id);if(known!==undefined)return known;
 const hand=n.hand as PersonalHand,onsets=index.onsets.get(hand)!;
 let lo=0,hi=onsets.length;while(lo<hi){const mid=(lo+hi)>>1;if(onsets[mid]<n.startTick)lo=mid+1;else hi=mid;}
 const side=(at:number|undefined)=>at===undefined?'':index.struck.get(`${hand}:${at}`)!.map(q=>`${pitch(q)}:${q.startTick-n.startTick}:${q.durationTicks}:${index.marks.get(q.id)}`).sort().join('|');
 const value=`${side(onsets[lo-1])}/${side(n.startTick)}/${side(onsets[lo+1])}`;index.neighbours.set(n.id,value);return value;
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
/** A changed note travels to every other place where its hand plays the same
 * passage: the same note (pitch, length, written value, ties, articulation,
 * slurs and graces) on the same beat of its bar, struck with the same notes
 * and between the same neighbours in that hand. Its neighbours are the notes
 * the source writes in that hand at the onset just before and just after it,
 * across the barline if need be, alike in pitch, place, length and marks;
 * notes further away and the other hand may differ. So a pickup into a return (No. 13 bar 11's last eighth)
 * matches the opening pickup it repeats, but never a downbeat, and a return
 * that changes elsewhere in the bar still takes the moves of the notes it
 * plays alike. The changes of one hand in one bar that reach the same bar
 * travel together. A note with the owner's own hand keeps it, and a bar where
 * the result could not be drawn is skipped. */
function findHandRecurrences(index:RecurrenceIndex,notes:ReadonlyMap<string,Note>,choices:PersonalAssignments['choices'],moves:Array<PersonalOwnerChoice&{hand:PersonalHand}>,older:Array<PersonalOwnerChoice&{hand:PersonalHand}>,dropped:ReadonlySet<number>|undefined):HandRecurrences {
 const {bars,downbeats,keys}=index;
 const barOf=(tick:number)=>{let lo=0,hi=bars.length-2;while(lo<hi){const mid=(lo+hi+1)>>1;if(bars[mid]<=tick)lo=mid;else hi=mid-1;}return lo;};
 /** Moves by bar and by the hand the source writes them in, in bar order. */
 const byBar=(list:typeof moves)=>{const groups=new Map<string,{b:number;written:PersonalHand;group:typeof moves}>();
  for(const c of list){const n=notes.get(c.ownerId)!,b=barOf(n.startTick),written=n.hand as PersonalHand,key=`${b}:${written}`,known=groups.get(key);if(known)known.group.push(c);else groups.set(key,{b,written,group:[c]});}
  return [...groups.values()].sort((x,y)=>x.b-y.b||x.written.localeCompare(y.written));};
 /** Each other bar where the hand that writes bar `b`'s moves plays the same passage, with the moves' counterparts found there. */
 const matching=function*({b,group}:{b:number;written:PersonalHand;group:typeof moves}){
  const places=new Map<number,Array<{n:Note;hand:PersonalHand;ownerId:string}>>();
  for(const c of group){
   const n=notes.get(c.ownerId)!,beat=n.startTick-bars[b]+downbeats[b];
   for(const q of index.alike.get(alikeKey(index.marks,n))??[]){
    const t=barOf(q.startTick);if(t===b||q.startTick-bars[t]+downbeats[t]!==beat)continue;
    if(neighbours(index,q)!==neighbours(index,n))continue;
    const found=places.get(t);if(found)found.push({n:q,hand:c.hand,ownerId:c.ownerId});else places.set(t,[{n:q,hand:c.hand,ownerId:c.ownerId}]);
   }
  }
  for(const t of [...places.keys()].sort((x,y)=>x-y))yield {t,found:places.get(t)!};
 };
 const carried=new Map<string,CarriedHand>(),targets=new Map<number,number[]>(),reach=new Map<string,number[]>(),skipped:SkippedHandCarry[]=[],following=new Map<string,number>(),unshared=new Map<string,number[]>();
 const handOf=(n:Note,adding:ReadonlyMap<string,PersonalHand>)=>adding.get(n.id)??carried.get(n.id)?.hand??choices[n.id]?.hand??n.hand??null;
 for(const moved of byBar(moves))for(const {t,found} of matching(moved)){
  const {b}=moved;
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
  const to=targets.get(b+1)??[];if(!to.includes(t+1))targets.set(b+1,[...to,t+1]);
  for(const ownerId of new Set(found.map(f=>f.ownerId))){const bars=reach.get(ownerId)??[];if(!bars.includes(t+1))reach.set(ownerId,[...bars,t+1]);}
 }
 for(const moved of byBar(older))for(const {t,found} of matching(moved))for(const {n,ownerId} of found)
  if(!ownsHand(choices[n.id],n.hand??null)){const reach=unshared.get(ownerId)??[];if(!reach.includes(t+1))unshared.set(ownerId,[...reach,t+1]);}
 return{carried,targets,reach,skipped,following,unshared};
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
 if(carriesHand(c,n.hand??null))return{kind:'shared',hand:c.hand,toBars:recurrences.reach.get(ownerId)??[]};
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
