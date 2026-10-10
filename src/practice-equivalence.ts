import type {ScorePackage} from './package';
import type {PracticeChunk,PracticePassagePlan} from './practice';

type Claim=Readonly<{passage:string;pattern:string}>;
type State={revision?:string;referenceBeat?:{numerator:number;denominator:number}};
interface Patterns {signature:string;leaves:Map<PracticeChunk,{shape:string;unit:number}>;pairs:Map<string,number>;next:number}
const plans=new WeakMap<PracticePassagePlan,Patterns>(),states=new WeakMap<object,Map<string,readonly Claim[]>>();
const key=(claim:Claim)=>JSON.stringify([claim.passage,claim.pattern]);
const shape=(chunk:PracticeChunk)=>JSON.stringify([chunk.id,chunk.pattern,chunk.firstBar,chunk.lastBar,chunk.start,chunk.end]);
const signature=(plan:PracticePassagePlan)=>{
 const musical=plan as PracticePassagePlan&{attacks?:unknown;gestures?:unknown;owners?:unknown;components?:unknown};
 return JSON.stringify([plan.revision,plan.partition,plan.chunks.map(shape),plan.ticksPerBeat,plan.barTicks,plan.barPhaseTicks,plan.timeSignatures,plan.referencePerformanceTempo,musical.attacks,musical.gestures,musical.owners,musical.components]);
};
const sorted=(values:unknown[])=>values.map(v=>JSON.stringify(v)).sort();

/** Only the real planners derive classes, from their captured canonical source.
 * Positions and source IDs locate evidence; they do not make repeated music
 * different. Note multiplicity, hands, written clocks and source scopes do. */
export function registerPracticePatterns(plan:PracticePassagePlan,score:ScorePackage['score'],assessment:'piano'|'manual') {
 const classes=new Map<string,number>(),leaves:Patterns['leaves']=new Map(),chains=new Map((score.tieChains??[]).map(c=>[c.noteId,c]));
 for(const chunk of plan.chunks){
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
  let unit=classes.get(fact);if(unit===undefined){unit=classes.size;classes.set(fact,unit);}leaves.set(chunk,{shape:shape(chunk),unit});
 }
 plans.set(plan,{signature:signature(plan),leaves,pairs:new Map(),next:classes.size});
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
  if(chunk.components){const [left,right]=chunk.components.map(id=>units.get(id));if(left===undefined||right===undefined)continue;
   if(left===right)unit=left;else{const pair=JSON.stringify([left,right]);unit=patterns.pairs.get(pair);if(unit===undefined){unit=patterns.next++;patterns.pairs.set(pair,unit);}}
  }else{const leaf=patterns.leaves.get(chunk);if(leaf?.shape===shape(chunk))unit=leaf.unit;}
  if(unit===undefined)continue;units.set(chunk.id,unit);const members=groups.get(unit)??[];members.push({passage:chunk.id,pattern:chunk.pattern});groups.set(unit,members);
 }
 const lookup=new Map<string,readonly Claim[]>();for(const members of groups.values()){const owned=Object.freeze(members.map(member=>Object.freeze(member)));for(const member of owned)lookup.set(key(member),owned);}
 states.set(state,lookup);return state;
}

/** Unplanned/foreign targets keep their existing exact-key behavior. */
export function equivalentPracticeClaims(state:object,claim:Claim):readonly Claim[] {return states.get(state)?.get(key(claim))??[claim];}
