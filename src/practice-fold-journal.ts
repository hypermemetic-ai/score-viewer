import {initialPractice,passageHierarchy,readPractice,resetProgress,type PracticeChunk,type PracticePassagePlan,type PracticeState} from './practice';
import {equivalentPracticeClaims,practiceSpanEvidenceKey} from './practice-equivalence';
import {recognizesPersonalPracticeClaim} from './personal-practice-identity';
import {claimIdentity,readManualAttainment} from './practice-attainment';

/**
 * A score whose repeat the reader folds practises the folded edition, as a
 * score with composer repeats does. Its journal is still the score's one
 * journal, kept in the written-out edition's terms, so a repeat that is
 * written out again reads it as it always did. The folded edition reads that
 * journal by music: an exercise whose music the written-out edition also has
 * shows that music's credit, marks and working tempo. What it practises goes
 * back the same way to every written-out exercise with that music, and so
 * does leaving it out (X): it is left out wherever every exercise with its
 * music is. Only its own exercises, which no written-out exercise matches,
 * are kept under the fold, and read again whenever it folds alike; the
 * latest few folds are kept. `added`: by folded exercise, the written-out
 * exercises its X left out that weren't already, so taking it back in
 * restores only those and a pass the player left out alone stays out.
 */
export interface PracticeFoldPart {excluded:Record<string,boolean>;best:Record<string,number>;groundwork:Record<string,boolean>;workingByPattern:Record<string,number>;marks?:Record<string,number[]>;added?:Record<string,string[]>}
/** The written-out edition a folded edition's practice journal belongs to. */
export interface PracticeFold {key:string;written:PracticePassagePlan}

/** Folds whose own exercises a journal keeps: the latest saved. */
const KEPT_FOLDS=4;
const PREFERENCES=['referenceBeat','target','personalGoal','working','step','tolerance','offset','keepTempo','start','connectionStart','usabilityRevision','speedRevision','countInBars','resumeCooldownSeconds','audioOutput'] as const;
const validTempo=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=5&&n<=500;
const record=(v:unknown)=>!!v&&typeof v==='object'&&!Array.isArray(v);
const differs=()=>Error('Folded practice differs; saved evidence retained.');
function readPart(value:unknown):PracticeFoldPart|undefined{
 if(value===undefined)return;
 const v=value as PracticeFoldPart;
 if(!record(v)||!record(v.excluded)||!record(v.best)||!record(v.groundwork)||!record(v.workingByPattern)||
  Object.values(v.excluded).some(x=>typeof x!=='boolean')||Object.values(v.groundwork).some(x=>typeof x!=='boolean')||
  Object.values(v.best).some(x=>!validTempo(x))||Object.values(v.workingByPattern).some(x=>!validTempo(x))||
  (v.added!==undefined&&(!record(v.added)||Object.values(v.added).some(ids=>!Array.isArray(ids)||ids.some(id=>typeof id!=='string')))))throw differs();
 if(v.marks!==undefined)readManualAttainment({version:1,marks:v.marks});
 return structuredClone(v);
}
function copyPreferences(from:PracticeState,to:PracticeState){
 for(const key of PREFERENCES)if(from[key]!==undefined)(to as unknown as Record<string,unknown>)[key]=structuredClone(from[key]);
}

interface Credit {rate:number;groundwork:boolean;marks:number[];working?:number}
/** Every claim a journal holds on an exercise: its music's, and earlier guarded personal claims on its range. */
function claims(plan:PracticePassagePlan,state:PracticeState,all:ReadonlyMap<string,PracticeChunk>,chunk:PracticeChunk){
 const found=equivalentPracticeClaims(state,{passage:chunk.id,pattern:chunk.pattern}).filter(c=>{const owner=all.get(c.passage);return !!owner&&owner.end-owner.start===chunk.end-chunk.start;}).map(c=>({...c}));
 for(const pattern of new Set([...Object.keys(state.best),...Object.keys(state.groundwork??{})]))if(recognizesPersonalPracticeClaim(plan,chunk,pattern))found.push({passage:chunk.id,pattern});
 for(const key of Object.keys(state.manualAttainment?.marks??{})){const [id,pattern]=claimIdentity(key);if(id===chunk.id&&recognizesPersonalPracticeClaim(plan,chunk,pattern))found.push({passage:id,pattern});}
 return found;
}
function creditOf(plan:PracticePassagePlan,state:PracticeState,all:ReadonlyMap<string,PracticeChunk>,chunk:PracticeChunk):Credit{
 const found=claims(plan,state,all,chunk),rates=found.flatMap(c=>state.best[c.pattern]===undefined?[]:[state.best[c.pattern]]);
 const marks=[...new Set(found.flatMap(c=>state.manualAttainment?.marks[JSON.stringify([c.passage,c.pattern])]??[]))].sort((a,b)=>a-b);
 return {rate:rates.length?Math.max(...rates):0,groundwork:found.some(c=>state.groundwork?.[c.pattern]),marks,working:state.workingByPattern[chunk.pattern]};
}
/** Remove every claim on an exercise, so another edition's credit can stand in for it. */
function clear(plan:PracticePassagePlan,state:PracticeState,all:ReadonlyMap<string,PracticeChunk>,chunk:PracticeChunk){
 for(const c of claims(plan,state,all,chunk)){delete state.best[c.pattern];if(state.groundwork)delete state.groundwork[c.pattern];if(state.manualAttainment)delete state.manualAttainment.marks[JSON.stringify([c.passage,c.pattern])];}
 resetProgress(chunk,state);delete state.workingByPattern[chunk.pattern];
}
function give(state:PracticeState,chunk:PracticeChunk,credit:Credit){
 if(credit.rate>0)state.best[chunk.pattern]=Math.max(state.best[chunk.pattern]??0,credit.rate);
 if(credit.groundwork){state.groundwork??={};state.groundwork[chunk.pattern]=true;}
 if(credit.marks.length){state.manualAttainment??={version:1,marks:{}};const key=JSON.stringify([chunk.id,chunk.pattern]);state.manualAttainment.marks[key]=[...new Set([...state.manualAttainment.marks[key]??[],...credit.marks])];}
 if(credit.working!==undefined)state.workingByPattern[chunk.pattern]=credit.working;
}
/** Exercises by their music; contrasts compare two passages and have no single music. */
function byMusic(plan:PracticePassagePlan,all:ReadonlyMap<string,PracticeChunk>){
 const found=new Map<string,PracticeChunk[]>();
 for(const chunk of all.values()){const fact=practiceSpanEvidenceKey(plan,chunk);if(fact)found.set(fact,[...found.get(fact)??[],chunk]);}
 return found;
}
const matching=(folded:PracticePassagePlan,chunk:PracticeChunk,written:Map<string,PracticeChunk[]>)=>{const fact=practiceSpanEvidenceKey(folded,chunk);return fact?written.get(fact)??[]:[];};
const mergeCredit=(credits:readonly Credit[]):Credit=>{
 const working=credits.flatMap(c=>c.working===undefined?[]:[c.working]);
 return {rate:Math.max(0,...credits.map(c=>c.rate)),groundwork:credits.some(c=>c.groundwork),marks:[...new Set(credits.flatMap(c=>c.marks))].sort((a,b)=>a-b),...(working.length?{working:Math.max(...working)}:{})};
};

/** The folded edition's reading of the score's journal. A journal no edition has saved stays unsaved. */
export function foldedPracticeJournal(raw:unknown,folded:PracticePassagePlan,fold:PracticeFold):PracticeState|undefined{
 if(!raw)return;
 const journal=readPractice(raw,fold.written),writtenAll=passageHierarchy(fold.written,journal).all,written=byMusic(fold.written,writtenAll);
 const part=readPart(journal.folded?.[fold.key]),next=initialPractice(folded);
 copyPreferences(journal,next);
 if(part){next.best=structuredClone(part.best);next.groundwork=structuredClone(part.groundwork);next.workingByPattern=structuredClone(part.workingByPattern);if(part.marks&&Object.keys(part.marks).length)next.manualAttainment={version:1,marks:structuredClone(part.marks)};}
 const all=passageHierarchy(folded,next).all;
 if(part&&Object.keys(part.excluded).some(id=>!all.has(id)))throw differs();
 next.excluded=part?structuredClone(part.excluded):{};
 const shared=[...all.values()].flatMap(chunk=>{const twins=matching(folded,chunk,written);return twins.length?[{chunk,twins}]:[];});
 // The written-out journal speaks for music both editions have: it is what the written-out edition shows.
 for(const {chunk} of shared){clear(folded,next,all,chunk);delete next.excluded![chunk.id];}
 for(const {chunk,twins} of shared){
  give(next,chunk,mergeCredit(twins.map(twin=>creditOf(fold.written,journal,writtenAll,twin))));
  // Left out wherever the written-out edition leaves out every exercise with this music.
  if(twins.every(twin=>journal.excluded?.[twin.id]))next.excluded![chunk.id]=true;
 }
 return readPractice(next,folded);
}

/**
 * The score's journal after practice on the folded edition: what changed on
 * each folded exercise since `before` (the folded journal as last read or
 * saved) reaches every written-out exercise with its music; the folded
 * edition's own exercises are kept under the fold.
 */
export function writtenPracticeJournal(raw:unknown,folded:PracticePassagePlan,before:PracticeState,after:PracticeState,fold:PracticeFold):PracticeState{
 return writtenJournal(raw?readPractice(raw,fold.written):initialPractice(fold.written),folded,before,after,fold);
}
/** As `writtenPracticeJournal`, from the score's journal already read (and not used again). */
function writtenJournal(journal:PracticeState,folded:PracticePassagePlan,before:PracticeState,after:PracticeState,fold:PracticeFold):PracticeState{
 copyPreferences(after,journal);
 const writtenAll=passageHierarchy(fold.written,journal).all,written=byMusic(fold.written,writtenAll);
 const wasAll=passageHierarchy(folded,before).all,all=passageHierarchy(folded,after).all;
 const own:PracticeChunk[]=[],addedBefore=readPart(journal.folded?.[fold.key])?.added??{},leftOut:Record<string,string[]>={};
 for(const chunk of all.values()){
  const twins=matching(folded,chunk,written);if(!twins.length){own.push(chunk);continue;}
  // Leaving an exercise out leaves out every exercise with its music. Taking it back in takes back
  // what that X left out; a pass the player had left out alone stays out. Only an X that found some
  // pass already out keeps a record: without one, taking it back takes every pass back in.
  const left=!!after.excluded?.[chunk.id],was=addedBefore[chunk.id];
  if(left!==!!before.excluded?.[chunk.id]){
   if(left){const fresh=twins.map(t=>t.id).filter(id=>!journal.excluded?.[id]);journal.excluded??={};for(const id of fresh)journal.excluded[id]=true;const ids=[...new Set([...was??[],...fresh])];if(ids.length&&ids.length<twins.length)leftOut[chunk.id]=ids;}
   else if(journal.excluded)for(const id of was??twins.map(t=>t.id))delete journal.excluded[id];
  }else if(left&&was)leftOut[chunk.id]=was;
  const old=wasAll.get(chunk.id)?creditOf(folded,before,wasAll,chunk):{rate:0,groundwork:false,marks:[]},now=creditOf(folded,after,all,chunk);
  const removed=now.rate<old.rate||(old.groundwork&&!now.groundwork)||old.marks.some(rate=>!now.marks.includes(rate));
  const added=now.rate>old.rate||(now.groundwork&&!old.groundwork)||now.marks.some(rate=>!old.marks.includes(rate))||now.working!==old.working;
  if(!removed&&!added)continue;
  for(const twin of twins){
   if(removed){
    // Credit taken back on the folded exercise is taken back on its music; what remains is given again.
    const kept=creditOf(fold.written,journal,writtenAll,twin);clear(fold.written,journal,writtenAll,twin);
    give(journal,twin,{rate:Math.min(kept.rate,now.rate),groundwork:kept.groundwork&&now.groundwork,marks:kept.marks.filter(rate=>now.marks.includes(rate)),working:kept.working});
   }
   give(journal,twin,{rate:now.rate>old.rate?now.rate:0,groundwork:now.groundwork&&!old.groundwork,marks:now.marks.filter(rate=>!old.marks.includes(rate)),...(now.working!==old.working&&now.working!==undefined?{working:now.working}:{})});
  }
 }
 // The fold keeps only what the written-out journal can't say: its own exercises.
 const part:PracticeFoldPart={excluded:{},best:{},groundwork:{},workingByPattern:{}},marks:Record<string,number[]>={};
 for(const chunk of own){
  if(after.excluded?.[chunk.id])part.excluded[chunk.id]=true;
  for(const c of claims(folded,after,all,chunk)){
   if(after.best[c.pattern]!==undefined)part.best[c.pattern]=after.best[c.pattern];
   if(after.groundwork?.[c.pattern])part.groundwork[c.pattern]=true;
   const key=JSON.stringify([c.passage,c.pattern]),kept=after.manualAttainment?.marks[key];if(kept?.length)marks[key]=[...kept];
  }
  if(after.workingByPattern[chunk.pattern]!==undefined)part.workingByPattern[chunk.pattern]=after.workingByPattern[chunk.pattern];
 }
 if(Object.keys(marks).length)part.marks=marks;
 if(Object.keys(leftOut).length)part.added=leftOut;
 // This fold's record moves to the end; only the latest few folds are kept, and a fold with nothing of its own keeps none.
 const folds=Object.entries(journal.folded??{}).filter(([key])=>key!==fold.key);
 if([part.excluded,part.best,part.groundwork,part.workingByPattern,marks,leftOut].some(r=>Object.keys(r).length))folds.push([fold.key,part]);
 if(folds.length)journal.folded=Object.fromEntries(folds.slice(-KEPT_FOLDS));else delete journal.folded;
 return readPractice(journal,fold.written);
}

/** Fingers alone saves nothing: the folded edition reads only the player's settings. */
export function foldedPracticePreferences(raw:unknown,folded:PracticePassagePlan):PracticeState|undefined{
 if(!raw||!record(raw))return;
 const next=initialPractice(folded);copyPreferences(raw as PracticeState,next);
 return readPractice(next,folded);
}

/** The score's journal as a folded edition practises it: each save goes back in written-out terms. */
export class FoldedPracticeJournal {
 private before?:PracticeState;private journal?:PracticeState;
 /** `raw`: the score's journal as read from storage, if any. */
 constructor(readonly fold:PracticeFold,private readonly raw:unknown){}
 /** The folded journal as read; later saves carry what changed since. */
 read(state:PracticeState){this.before=structuredClone(state);}
 /** The score's journal holding this folded practice. `after` is a snapshot no one changes. */
 written(folded:PracticePassagePlan,after:PracticeState):PracticeState{
  // Each save starts from the journal last saved, already read; only the first reads storage's.
  const journal=this.journal?structuredClone(this.journal):this.raw?readPractice(this.raw,this.fold.written):initialPractice(this.fold.written);
  return writtenJournal(journal,folded,this.before??initialPractice(folded),after,this.fold);
 }
 /** After the journal is saved: the next save carries only what changes from `after`. */
 saved(after:PracticeState,journal:PracticeState){this.journal=journal;this.before=after;}
}
