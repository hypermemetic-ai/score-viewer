import {recognizesPersonalPracticeClaim} from './personal-practice-identity';
import type {ScorePackage} from './package';
import type {PracticeChunk,PracticePassagePlan} from './practice';

type Claim=Readonly<{passage:string;pattern:string}>;
type State={revision?:string;referenceBeat?:{numerator:number;denominator:number};best?:Record<string,number>;groundwork?:Record<string,boolean>;manualAttainment?:{marks:Record<string,number[]>}};
interface Patterns {signature:string;leaves:Map<PracticeChunk,{shape:string;unit:number}>;pairs:Map<string,number>;next:number;score:ScorePackage['score'];assessment:'piano'|'manual';facts:Map<string,string>;classes:Map<string,number>}
const plans=new WeakMap<PracticePassagePlan,Patterns>(),states=new WeakMap<object,Map<string,readonly Claim[]>>();
const key=(claim:Claim)=>JSON.stringify([claim.passage,claim.pattern]);
const shape=(chunk:PracticeChunk)=>JSON.stringify([chunk.id,chunk.pattern,chunk.firstBar,chunk.lastBar,chunk.start,chunk.end]);
const signature=(plan:PracticePassagePlan)=>{
 const musical=plan as PracticePassagePlan&{attacks?:unknown;gestures?:unknown;owners?:unknown;components?:unknown};
 return JSON.stringify([plan.revision,plan.partition,plan.chunks.map(shape),plan.catalog,plan.ticksPerBeat,plan.barTicks,plan.barPhaseTicks,plan.timeSignatures,plan.referencePerformanceTempo,musical.attacks,musical.gestures,musical.owners,musical.components]);
};
const sorted=(values:unknown[])=>values.map(v=>JSON.stringify(v)).sort();


export function musicalSpanFact(plan:PracticePassagePlan,score:ScorePackage['score'],chunk:PracticeChunk,assessment:'piano'|'manual'):string {
 const chains=new Map((score.tieChains??[]).map(c=>[c.noteId,c]));
 const start=chunk.start,end=chunk.end,inRange=(tick:number,duration=0)=>tick<end&&(tick>=start||tick+duration>start),
   meter=(tick:number)=>[...score.timeSignatures].reverse().find(m=>m.tick<=tick),
   notes=score.notes.filter(n=>inRange(n.startTick,n.durationTicks)).map(n=>({
    tick:n.startTick-start,duration:n.durationTicks,kind:n.eventKind,
    pitch:'pitch' in n?n.pitch:undefined,referencePitch:'referencePitch' in n?n.referencePitch:undefined,
    writtenPitch:'writtenPitch' in n?n.writtenPitch:undefined,hand:n.hand,voice:n.voice,part:n.partId,staff:n.staffId,sourceVoice:n.voiceId,instrument:n.instrumentId,
    physical:n.physicalSource,written:n.sourceWrittenValue,articulation:n.articulation,dynamic:n.dynamicMark,
    source:n.sourceProvenance,tieStart:n.tieStart,tieEnd:n.tieEnd,unbeamed:n.sourceBeam?.noBeam,
    components:chains.get(n.id)?.components.map(c=>[c.startTick-start,c.durationTicks,c.tieForward,c.tieWait,c.voice,c.sourceWrittenValue])
   })),
   silences=(score.sourceSilences??[]).filter(r=>inRange(r.startTick,r.durationTicks)).map(r=>[r.startTick-start,r.durationTicks,r.kind,r.hand,r.voice,r.staff,r.partId,r.sourceWrittenValue]),
   written=score.sourceWrittenComponents?.components.filter(c=>inRange(c.tick,c.durationTicks)).map(c=>[
    c.tick-start,c.durationTicks,c.eventKind,c.partId,c.staffId,c.voiceId,c.sourceWrittenValue,c.writtenPitch,c.writtenReferencePitch,c.physicalSource,c.tie,c.beams,
    c.slurs?.map(s=>[s.type,s.number,s.side]),c.techniques?.map(t=>[t.kind,t.type,t.number,t.label])
   ]),
   phrase=(score.phrases??[]).filter(p=>inRange(p.startTick,p.endTick-p.startTick)).map(p=>[p.startTick-start,p.endTick-start,p.kind,p.voice]),
   fact=JSON.stringify({assessment,length:end-start,ticksPerBeat:plan.ticksPerBeat,
    bars:plan.barTicks.slice(chunk.firstBar,chunk.lastBar+2).map(t=>t-start),
    phases:plan.barPhaseTicks?.slice(chunk.firstBar,chunk.lastBar+1),
    meters:plan.barTicks.slice(chunk.firstBar,chunk.lastBar+1).map(t=>{const m=meter(t);return m?[m.numerator,m.denominator]:null;}),
    notes:sorted(notes),silences:sorted(silences),written:written?sorted(written):undefined,phrases:sorted(phrase)});
 return fact;
}

/** Full musical content including carry, clock, voices/hands and source notation. */
export function practiceSpanEvidenceKey(plan:PracticePassagePlan,chunk:PracticeChunk):string|undefined {
 const p=plans.get(plan);if(!p||chunk.kind==='contrast')return;
 const k=JSON.stringify([chunk.start,chunk.end,chunk.firstBar,chunk.lastBar]);let fact=p.facts.get(k);if(fact===undefined){fact=musicalSpanFact(plan,p.score,chunk,p.assessment);p.facts.set(k,fact);}return fact;
}

/** Complete exercise identity for edition transfer. Contrast has two real
 * alternatives; matching its displayed A range alone cannot establish credit. */
export function practiceExerciseEvidenceKey(plan:PracticePassagePlan,chunk:PracticeChunk):string|undefined {
 const p=plans.get(plan);if(!p)return;
 if(chunk.kind!=='contrast')return JSON.stringify(['span',chunk.start,chunk.end,chunk.firstBar,chunk.lastBar,practiceSpanEvidenceKey(plan,chunk)]);
 if(chunk.clips?.length!==2)return;
 return JSON.stringify(['contrast',chunk.episode,chunk.clips.map(clip=>[
  clip.start,clip.end,clip.firstBar,clip.lastBar,clip.divergenceTick,
  clip.noteIds,clip.carryInNoteIds,clip.carryOutNoteIds,clip.tieNoteIds,
  musicalSpanFact(plan,p.score,{id:clip.id,start:clip.start,end:clip.end,firstBar:clip.firstBar,lastBar:clip.lastBar,pattern:chunk.pattern,weight:1},p.assessment)
 ])]);
}

/** Only the real planners derive classes, from their captured canonical source.
 * Positions and source IDs locate evidence; they do not make repeated music
 * different. Note multiplicity, hands, written clocks and source scopes do. */
export function registerPracticePatterns(plan:PracticePassagePlan,score:ScorePackage['score'],assessment:'piano'|'manual') {
 const classes=new Map<string,number>(),leaves:Patterns['leaves']=new Map();
 for(const chunk of plan.chunks){
  const fact=musicalSpanFact(plan,score,chunk,assessment);
  let unit=classes.get(fact);if(unit===undefined){unit=classes.size;classes.set(fact,unit);}leaves.set(chunk,{shape:shape(chunk),unit});
 }
 plans.set(plan,{signature:signature(plan),leaves,pairs:new Map(),next:classes.size,score:structuredClone(score),assessment,facts:new Map(),classes});
}

/** Derived lookup only: saved best/Done keys and the source run stay literal.
 * Identical units repeated in a parent share one unit; heterogeneous joins
 * retain their ordered, recursive structure and need their own earned run. */
export function bindPracticePassages<T extends State>(plan:PracticePassagePlan,state:T,all:ReadonlyMap<string,PracticeChunk>=new Map(plan.chunks.map(c=>[c.id,c]))):T {
 states.delete(state);
 const patterns=plans.get(plan);
 if(!patterns||patterns.signature!==signature(plan)||state.revision!==plan.revision||
   state.referenceBeat&&(state.referenceBeat.numerator!==plan.referencePerformanceTempo?.beat.numerator||state.referenceBeat.denominator!==plan.referencePerformanceTempo?.beat.denominator))return state;
 const units=new Map<string,number>(),groups=new Map<number,Claim[]>();
 for(const chunk of all.values()){
  let unit:number|undefined;
  if(plan.partition==='bounded-exercises-v1'){
   if(chunk.kind==='contrast')unit=patterns.next++;
   else {const fact=practiceSpanEvidenceKey(plan,chunk)!;unit=patterns.classes.get(fact);if(unit===undefined){unit=patterns.next++;patterns.classes.set(fact,unit);}}
  }else if(chunk.components){const [left,right]=chunk.components.map(id=>units.get(id));if(left===undefined||right===undefined)continue;
   if(left===right)unit=left;else{const pair=JSON.stringify([left,right]);unit=patterns.pairs.get(pair);if(unit===undefined){unit=patterns.next++;patterns.pairs.set(pair,unit);}}
  }else{const leaf=patterns.leaves.get(chunk);if(leaf?.shape===shape(chunk))unit=leaf.unit;}
  if(unit===undefined)continue;units.set(chunk.id,unit);const members=groups.get(unit)??[];members.push({passage:chunk.id,pattern:chunk.pattern});
  // Guarded earlier hand-choice keys retain literal provenance and attainment.
  const saved=new Set([...Object.keys(state.best??{}),...Object.keys(state.groundwork??{}),...Object.keys(state.manualAttainment?.marks??{}).flatMap(key=>{try{const claim=JSON.parse(key);return Array.isArray(claim)&&claim[0]===chunk.id&&typeof claim[1]==='string'?[claim[1]]:[];}catch{return [];}})]);
  for(const pattern of saved)if(pattern!==chunk.pattern&&recognizesPersonalPracticeClaim(plan,chunk,pattern))members.push({passage:chunk.id,pattern});
  groups.set(unit,members);
 }
 const lookup=new Map<string,readonly Claim[]>();for(const members of groups.values()){const owned=Object.freeze(members.map(member=>Object.freeze(member)));for(const member of owned)lookup.set(key(member),owned);}
 states.set(state,lookup);return state;
}

/** Unplanned/foreign targets keep their existing exact-key behavior. */
export function equivalentPracticeClaims(state:object,claim:Claim):readonly Claim[] {return states.get(state)?.get(key(claim))??[claim];}
