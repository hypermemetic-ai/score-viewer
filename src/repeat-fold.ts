import {foldVerbatimRepeats,type VerbatimOwnerFact,type VerbatimRepeatResult} from '../vendor/iso-notation/src/model/verbatim-repeats';
import {renderScorePresentationAsync} from '../vendor/iso-notation/src/score-presentation';
import {validateScoreRenderingRecipe} from '../vendor/iso-notation/src/render/iso/score-rendering-recipe';
import {isPitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';
import {hashBytes,type ScorePackage,type Seat} from './package';
import {activeLayer,type PersonalRepeatResolution,type PersonalState} from './state';
import {handRecurrences,type PersonalAssignments,type PersonalHand} from './personal-assignments';
import {PersonalPresentationSession,adoptImportedReading} from './personal-presentation';
import {withLayoutPeer} from './layout-peer';
import {capturedReadingExecution,checkReadingExecution,type ReadingExecution} from './reading-execution';
import type {DerivedFileCache} from './derived-file-cache';

/**
 * Verbatim repeats, as the reader shows them. A score is stored written out;
 * a passage it writes out twice is shown once, as a repeat, wherever ISO
 * notation's rule finds one (`foldVerbatimRepeats`). Nothing stored changes:
 * the score, its identity and every choice the player made stay keyed to the
 * written-out notes, and practice, Fingers and playback go through both
 * passes as before.
 *
 * A note the player has not touched reads its twin's choices: its hand and
 * finger come from the other pass, derived here as `repeatResolved` and never
 * saved. Shared fingering memory resolves first; a note it resolves is
 * touched, so the two never both apply. Touched twins that disagree keep their
 * repeat written out. Every change of choices is read again, so a repeat folds
 * once its passes agree and is written out again when an edit splits them.
 */

/** The written-out score a package's reader may fold, or none. */
const sources=new WeakMap<ScorePackage,QuantizedGridScore|null>();
function foldable(p:ScorePackage):QuantizedGridScore|undefined{
 let source=sources.get(p);
 if(source===undefined){
  const score=p.sourceScore??p.score;
  // Only a piano edition engraved from its own source by the shared recipe.
  source=p.manifest.version===2&&!p.reading&&!p.transposition&&!p.calculatedHandReceipt&&!!p.renderingRecipe&&!!p.sourceSha256&&
   (!p.sourceScore||p.sourceScore===p.score||JSON.stringify(p.sourceScore)===JSON.stringify(p.score))?score:null;
  sources.set(p,source);
 }
 return source??undefined;
}
const revision=(p:ScorePackage)=>p.sourceRevision??p.manifest.revision;
const own=(s:PersonalState):PersonalState=>{const {repeatResolved:_derived,...rest}=s;return rest;};

/** What the player chose on each note they touched, as the fold compares it: a
 * moved hand, and a finger they gave, restored or share through fingering
 * memory. The edition's own fingers are no choice of theirs. */
export function repeatOwnerFacts(p:ScorePackage,s:PersonalState):Map<string,VerbatimOwnerFact>{
 const source=foldable(p)??p.score,personal=own(s),facts=new Map<string,VerbatimOwnerFact>(),layer=activeLayer(p,personal),carried=handRecurrences(p,personal).carried;
 const legacy=new Map(Object.values(personal.overrides).flatMap(c=>c.ownerIds.map(id=>[id,c.replacement] as const)));
 const shared=personal.memoryResolved?.sourceRevision===revision(p)?personal.memoryResolved.choices:{};
 for(const n of source.notes){
  if(!isPitchedEvent(n))continue;
  // A hand carried from matching music is the note's own answer, ahead of its twin's.
  const choice=personal.assignments?.choices[n.id],chosen=carried.get(n.id)?.hand??choice?.hand,hand=chosen!==undefined&&chosen!==(n.hand??null)?chosen:undefined;
  // A hand kept to its own bar ("only here", or "hand here only"; hand-change carries) is a choice even where it is the written hand.
  const local=(choice as {handScope?:string}|undefined)?.handScope==='local'&&choice?.hand!==undefined;
  const restored=!!personal.calculatedOwners?.[n.id],remembered=!restored&&Object.hasOwn(shared,n.id);
  const finger=restored?layer?.attacks.find(a=>a.id===layer.sourceOwnerToAttack[n.id])?.finger:remembered?shared[n.id].finger??undefined:choice?.finger??legacy.get(n.id);
  if(hand!==undefined||finger!==undefined||restored||remembered||local)facts.set(n.id,{...(hand?{hand}:{}),...(finger!==undefined?{finger:String(finger)}:{}),...(local?{local}:{})});
 }
 return facts;
}

/** The verbatim repeats the reader shows for these choices, or none for a score it does not fold. */
export function verbatimRepeats(p:ScorePackage,s:PersonalState):VerbatimRepeatResult|undefined{
 const source=foldable(p);if(!source)return;
 return foldVerbatimRepeats(source,{ownerFacts:repeatOwnerFacts(p,s),sourceHash:p.sourceSha256});
}

/** A repeat the reader writes out because the player's choices differ between
 * its passes: why, in bars as printed, and the choices that would fold it again. */
export interface WrittenOutRepeat {text:string;use:string;restore:{ownerId:string;hand?:PersonalHand;finger?:number}[]}
export function writtenOutRepeat(p:ScorePackage,s:PersonalState,printed:(bar:number)=>number=bar=>bar):WrittenOutRepeat|undefined{
 const source=foldable(p),kept=source&&verbatimRepeats(p,s)?.kept;if(!source||!kept?.length)return;
 const facts=repeatOwnerFacts(p,own(s)),notes=new Map(source.notes.map(n=>[n.id,n])),bars=source.sourceBarTicks!;
 const barOf=(id:string)=>{const tick=notes.get(id)!.startTick;let b=0;while(b<bars.length-2&&bars[b+1]<=tick)b++;return printed(b+1);};
 const restore:WrittenOutRepeat['restore']=[],places=new Map<string,{second:number;first:number;kinds:Set<string>}>();
 for(const {second,first} of kept.flatMap(k=>k.differs)){
  const a=facts.get(first),b=facts.get(second),written=notes.get(first)?.hand as PersonalHand|undefined,hand=a?.hand??written,kinds=new Set<string>();
  const change:WrittenOutRepeat['restore'][number]={ownerId:second};
  if((b?.hand??written)!==hand&&hand){change.hand=hand as PersonalHand;kinds.add('hand');}
  if(a?.finger!==undefined&&a.finger!==b?.finger){change.finger=Number(a.finger);kinds.add('finger');}
  if(!kinds.size)continue;
  restore.push(change);
  const at={second:barOf(second),first:barOf(first)},key=`${at.second}|${at.first}`,place=places.get(key)??{...at,kinds:new Set()};for(const k of kinds)place.kinds.add(k);places.set(key,place);
 }
 if(!restore.length)return;
 const list=[...places.values()],kinds=[...new Set(list.flatMap(x=>[...x.kinds]))].sort(),what=kinds.join(' and ');
 const join=(xs:number[])=>xs.length<2?String(xs[0]):`${xs.slice(0,-1).join(', ')} and ${xs.at(-1)}`;
 const seconds=[...new Set(list.map(x=>x.second))],firsts=[...new Set(list.map(x=>x.first))];
 const text=seconds.length===1?`Bar ${seconds[0]} has a different ${what} than bar ${firsts.join(' and ')}, so the repeat is written out.`
  :`Bars ${join(seconds)} have a different ${what} than bars ${join(firsts)}, so the repeat is written out.`;
 const use=firsts.length===1?`Use bar ${firsts[0]}’s ${kinds.length>1?'choices':what}`:'Use the first time’s choices';
 return {text,use,restore};
}

/** The player's state with what each untouched note reads from its twin. */
export function withRepeatInheritance(p:ScorePackage,s:PersonalState):PersonalState{
 const next=own(s),fold=verbatimRepeats(p,next)?.fold;
 if(!fold)return next;
 const facts=repeatOwnerFacts(p,next),choices:PersonalRepeatResolution['choices']={};
 for(const ids of fold.shows.values()){
  const carrier=ids.find(id=>facts.has(id));if(!carrier)continue;
  const fact=facts.get(carrier)!;
  for(const id of ids)if(!facts.has(id))choices[id]={...(fact.hand?{hand:fact.hand as PersonalHand}:{}),...(fact.finger!==undefined?{finger:Number(fact.finger)}:{})};
 }
 if(Object.keys(choices).length)next.repeatResolved={sourceRevision:revision(p),choices};
 return next;
}

/** The fold a folded reader view shows, so navigation and edits speak of written-out notes. */
export interface FoldedReaderView {
 /** Written-out note → the folded note that shows it. */
 shownBy:ReadonlyMap<string,string>;
 /** The stored, written-out edition the reader folds; saved navigation names its seats. */
 written:ScorePackage;
 /** The folded edition, as composer repeats are: practice and Fingers visit each printed bar once. */
 edition:ScorePackage;
 /** The folded pages with the player's hands, each seat naming its folded note; edits on it reach every twin that carries a choice. */
 practice:ScorePackage;
 /** The player's choices on the folded notes: each note's own, else its twin's. */
 personal(personal:PersonalState):PersonalState;
 /** The printed bar (1-based) that shows a stored bar (1-based). */
 printedBar(storedBar:number):number;
 /** The written-out seat of a folded seat. */
 writtenSeat(seat:Seat):Seat|undefined;
 /** The folded seat that shows a written-out seat. */
 foldedSeat(seat:Seat):Seat|undefined;
}
export type FoldedPackage=ScorePackage&{verbatimFold?:FoldedReaderView};
/** The written-out view behind a reader view. */
export const writtenView=(p:ScorePackage)=>(p as FoldedPackage).verbatimFold?.written??p;
/** A folded seat knows the twins its note stands for. */
type FoldedSeat=Seat&{verbatimTwins?:readonly string[]};
/** The written-out owners an edit on a seat changes: on a folded note, every twin carrying a choice, so agreeing passes stay agreed. */
export const editOwners=(seat:Seat):string[]=>[...(seat as FoldedSeat).verbatimTwins??seat.ownerIds.slice(0,1)];
const seatIndex=(seats:readonly Seat[],ids:(seat:Seat)=>readonly string[])=>{
 const index=new Map<string,Seat[]>();for(const seat of seats)for(const id of ids(seat))index.set(id,[...index.get(id)??[],seat]);
 return (id:string,like:Seat)=>{const found=index.get(id)??[];return found.find(s=>!!s.continuation===!!like.continuation&&s.page===like.page)??found.find(s=>!!s.continuation===!!like.continuation)??found[0];};
};

export const VERBATIM_FOLD_CACHE_KIND='verbatim-fold-pages-v1';
let defaultCache:DerivedFileCache|undefined;
/** Folded pages are kept on disk with the reader's other derived results. */
export function useVerbatimFoldCache(cache:DerivedFileCache|undefined){defaultCache=cache;}
interface FoldedPages {pages:string[];rawPages:string[];seats:Seat[];sourceSha256:string}
function cachedPages(value:unknown):FoldedPages{
 const v=value as FoldedPages;
 if(!v||typeof v!=='object'||!Array.isArray(v.pages)||!v.pages.length||v.pages.some(page=>typeof page!=='string'||!page)||!Array.isArray(v.rawPages)||v.rawPages.length!==v.pages.length||
  !Array.isArray(v.seats)||!v.seats.length||typeof v.sourceSha256!=='string')throw Error('Incomplete cached fold');
 return v;
}

/**
 * The reader's pages for a folded score. Each distinct fold is engraved once
 * and kept on disk, so reopening reads it; hand choices are drawn on it by a
 * presentation session of its own, as on the written-out pages. Its seats name
 * written-out notes: the twin that carries a choice, or the first pass, so an
 * edit lands where the choice already is and never splits agreeing passes.
 */
export class FoldedReader {
 private readonly editions=new Map<QuantizedGridScore,Promise<{base:ScorePackage;session:PersonalPresentationSession}>>();
 private readonly cache:DerivedFileCache|null;
 constructor(private readonly base:ScorePackage,cache?:DerivedFileCache|null){this.cache=cache===undefined?defaultCache??null:cache;}
 /** Whether these choices show a repeat folded: then the written-out pages need not be drawn at all. */
 folds(personal:PersonalState):boolean{return !!verbatimRepeats(this.base,personal)?.fold;}
 /** The folded view for these choices, or undefined when nothing folds. Its
  * seats are named after the stored edition's (`written`, by default the
  * stored pages), so it is drawn without drawing the written-out pages. */
 async view(personal:PersonalState,written:ScorePackage=this.base,input?:ReadingExecution):Promise<FoldedPackage|undefined>{
  const execution=input?capturedReadingExecution(input):undefined;
  const fold=verbatimRepeats(this.base,personal)?.fold;if(!fold)return;
  let edition=this.editions.get(fold.score);
  if(!edition){edition=this.edition(fold.score,execution);this.editions.set(fold.score,edition);edition.catch(()=>this.editions.delete(fold.score));}
  const {base,session}=await edition;checkReadingExecution(execution);
  const projected=await session.project(foldedChoices(base,this.base,withRepeatInheritance(this.base,personal)),execution);checkReadingExecution(execution);
  const facts=repeatOwnerFacts(this.base,personal),writtenOf=seatIndex(written.seats,seat=>seat.ownerIds.slice(0,1));
  // A folded note is named by its twins that carry a choice, else by itself.
  const named=new Map<string,string[]>(),notes=new Map(projected.score.notes.map(n=>[n.id,n]));
  for(const n of projected.score.notes){const twins=fold.shows.get(n.id)??[n.id],carriers=twins.filter(id=>facts.has(id));named.set(n.id,carriers.length?carriers:[n.id]);}
  const foldedIds=new Map<string,readonly string[]>(),practiceSeats:FoldedSeat[]=[];
  const seats=projected.seats.map(seat=>{
   const owners=[...new Set(seat.ownerIds.flatMap(id=>named.get(id)??[id]))],own=writtenOf(owners[0],seat),verbatimTwins=named.get(seat.ownerIds[0])??owners.slice(0,1);foldedIds.set(seat.id,seat.ownerIds);
   const shown=own?{...seat,ownerIds:owners,actionId:own.actionId,contactId:own.contactId,verbatimTwins}:{...seat,ownerIds:owners,verbatimTwins};
   practiceSeats.push({...shown,ownerIds:seat.ownerIds});return shown;
  });
  // Seats name written-out notes; each reads as the folded note it is drawn as.
  const aliases=[...named].flatMap(([id,ids])=>ids.filter(other=>other!==id&&!notes.has(other)).map(other=>({...notes.get(id)!,id:other})));
  const foldedOf=seatIndex(seats,seat=>foldedIds.get(seat.id)??[]);
  const printed=new Map<number,number>();for(const segment of fold.segments)if(!printed.has(segment.sourceBar))printed.set(segment.sourceBar,segment.writtenBar+1);
  return {...projected,score:{...projected.score,notes:[...projected.score.notes,...aliases]},seats,verbatimFold:{shownBy:fold.shownBy,written,edition:base,
   practice:{...projected,seats:practiceSeats},
   personal:next=>foldedPersonal(base,this.base,next),
   printedBar:bar=>printed.get(bar-1)??bar,
   writtenSeat:seat=>writtenOf(seat.ownerIds[0],seat),
   foldedSeat:seat=>{const id=seat.ownerIds[0];return foldedOf(fold.shownBy.get(id)??id,seat);}}};
 }
 private async edition(score:QuantizedGridScore,execution?:ReadingExecution){
  const base=this.base,recipe=base.renderingRecipe!,bytes=JSON.stringify(score),sourceSha256=await hashBytes(bytes);
  const key=await hashBytes(JSON.stringify([VERBATIM_FOLD_CACHE_KIND,sourceSha256,recipe.options,recipe.tokens,recipe.engineId,recipe.version]));
  let pages=await this.cache?.get(VERBATIM_FOLD_CACHE_KIND,key,cachedPages);checkReadingExecution(execution);
  let reading;
  const baseline=(rendered:{rawPages:readonly string[];seats:readonly Seat[]})=>Promise.all([Promise.all(rendered.rawPages.map(hashBytes)),hashBytes(JSON.stringify(rendered.seats))]);
  const folded=validateScoreRenderingRecipe({...recipe,sourceSha256,baseline:{pageSha256:['0'.repeat(64)],seatSha256:'0'.repeat(64)}} as never,{sourceSha256});
  if(!pages||pages.sourceSha256!==sourceSha256){
   const rendered=await withLayoutPeer(layoutPeer=>renderScorePresentationAsync(JSON.parse(bytes),folded,{...execution,layoutPeer}));
   checkReadingExecution(execution);
   pages={pages:rendered.pages,rawPages:rendered.rawPages,seats:rendered.seats as Seat[],sourceSha256};
   reading={score:rendered.score,layouts:rendered.layouts,rawPages:rendered.rawPages};
   void this.cache?.put(VERBATIM_FOLD_CACHE_KIND,key,pages);
  }
  const [pageSha256,seatSha256]=await baseline(pages);
  const edition:ScorePackage={...base,score:JSON.parse(bytes),sourceScore:JSON.parse(bytes),sourceSha256,pages:pages.pages,seats:pages.seats,
   renderingRecipe:validateScoreRenderingRecipe({...folded,baseline:{pageSha256,seatSha256}},{sourceSha256}),annotationGeometry:undefined};
  // A fresh engrave is the hand engine's own first preparation; it is adopted rather than engraved again.
  if(reading)await adoptImportedReading(edition,reading,execution).catch(error=>{if(error instanceof DOMException&&error.name==='AbortError')throw error;});
  return {base:edition,session:new PersonalPresentationSession(edition)};
 }
}

/** The player's choices on the folded notes, as practice and Fingers read
 * them: each folded note's own hand and finger, else its twin's, guarded by
 * the folded notes' own clocks. Derived for display; edits go to the stored
 * notes (`editOwners`). */
function foldedPersonal(edition:ScorePackage,base:ScorePackage,personal:PersonalState):PersonalState{
 const inherited=withRepeatInheritance(base,personal),rev=revision(base),choices:PersonalAssignments['choices']={},carried=handRecurrences(base,inherited).carried;
 const shared=inherited.memoryResolved?.sourceRevision===rev?inherited.memoryResolved.choices:{},repeat=inherited.repeatResolved?.choices??{};
 const legacy=new Map(Object.values(inherited.overrides).flatMap(c=>c.ownerIds.map(id=>[id,c.replacement] as const)));
 for(const n of edition.score.notes){
  if(!isPitchedEvent(n))continue;
  const own=inherited.assignments?.choices[n.id],hand=carried.get(n.id)?.hand??own?.hand??repeat[n.id]?.hand;
  const finger=inherited.calculatedOwners?.[n.id]?undefined:Object.hasOwn(shared,n.id)?shared[n.id].finger??undefined:own?.finger??legacy.get(n.id)??repeat[n.id]?.finger;
  if(hand===undefined&&finger===undefined)continue;
  choices[n.id]={ownerId:n.id,guard:{pitch:n.pitch.octave*12+n.pitch.pitchClass,startTick:n.startTick,durationTicks:n.durationTicks},original:{hand:n.hand??null},
   ...(hand!==undefined?{hand}:{}),...(finger!==undefined?{finger}:{}),createdAt:own?.createdAt??new Date(0).toISOString()};
 }
 const {assignments:_a,repeatResolved:_r,memoryResolved:_m,overrides:_o,undoAssignments:_u,...rest}=inherited;
 return {...rest,overrides:{},...(Object.keys(choices).length?{assignments:{version:'personal-owner-assignments-v1',sourceRevision:rev,choices}}:{})};
}

/** The player's hands on the folded notes, guarded by the folded notes' own clocks:
 * own, carried from matching music, else the twin's. */
function foldedChoices(edition:ScorePackage,base:ScorePackage,personal:PersonalState):PersonalState{
 const choices:PersonalAssignments['choices']={},createdAt=new Date(0).toISOString(),carried=handRecurrences(base,personal).carried;
 for(const n of edition.score.notes){
  if(!isPitchedEvent(n))continue;
  const hand=carried.get(n.id)?.hand??personal.assignments?.choices[n.id]?.hand??personal.repeatResolved?.choices[n.id]?.hand;
  if(hand===undefined||hand===(n.hand??null))continue;
  choices[n.id]={ownerId:n.id,guard:{pitch:n.pitch.octave*12+n.pitch.pitchClass,startTick:n.startTick,durationTicks:n.durationTicks},original:{hand:n.hand??null},hand,createdAt};
 }
 const {assignments:_a,repeatResolved:_r,memoryResolved:_m,layer:_l,calculatedOwners:_c,...rest}=personal;
 return {...rest,overrides:{},history:[],...(Object.keys(choices).length?{assignments:{version:'personal-owner-assignments-v1',sourceRevision:revision(base),choices}}:{})};
}
