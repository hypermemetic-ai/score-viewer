import type {ScorePackage} from './package';
import type {PersonalState} from './state';
import {planPractice,practicePartition,initialPractice,readPractice,passageHierarchy,type PracticeState,type PracticeChunk,type PracticePlan} from './practice';
import {equivalentPracticeClaims} from './practice-equivalence';
import {recognizesPersonalPracticeClaim} from './personal-practice-identity';
import {canonicalJson} from './piano-preparation-identity';

/** Recovery evidence is literal history, never read as a new attainment claim. */
export interface PracticeEditionEvidence {
 version:'practice-edition-evidence-v1';sourceIdentity:string;keyboardLayout:string;revision:string;rawState:unknown;
}
export interface EditionPracticeState extends PracticeState {editionEvidence:PracticeEditionEvidence}
const musicalClock=(score:ScorePackage['score'])=>canonicalJson({ticksPerBeat:score.ticksPerBeat,totalTicks:score.totalTicks,bars:score.sourceBarTicks,meters:score.timeSignatures,
 notes:score.notes.map(n=>({id:n.id,kind:n.eventKind,pitch:'pitch' in n?n.pitch:undefined,referencePitch:'referencePitch' in n?n.referencePitch:undefined,start:n.startTick,duration:n.durationTicks,
  voice:n.voice,part:n.partId,staff:n.staffId,sourceVoice:n.voiceId,instrument:n.instrumentId,written:n.sourceWrittenValue,articulation:n.articulation,dynamic:n.dynamicMark,tieStart:n.tieStart,tieEnd:n.tieEnd})),
 silences:score.sourceSilences?.map(s=>({start:s.startTick,duration:s.durationTicks,kind:s.kind,voice:s.voice,staff:s.staff,part:s.partId,written:s.sourceWrittenValue})),ties:score.tieChains,phrases:score.phrases});
const spanClock=(plan:PracticePlan,chunk:PracticeChunk)=>canonicalJson([chunk.start,chunk.end,chunk.firstBar,chunk.lastBar,plan.barTicks.slice(chunk.firstBar,chunk.lastBar+2),plan.barPhaseTicks?.slice(chunk.firstBar,chunk.lastBar+1)]);

/** An explicit calculation changes hand/finger instructions without erasing a
 * complete same-source exercise's credit. It never migrates a pitch change or
 * another keyboard, and does not turn component credit into a full-run claim. */
export function transferPracticeEdition(from:ScorePackage,raw:unknown,to:ScorePackage,toPersonal?:PersonalState):EditionPracticeState {
 if(!from.sourceSha256||from.sourceSha256!==to.sourceSha256||from.sourceRevision!==to.sourceRevision||!from.keyboardLayout||from.keyboardLayout!==to.keyboardLayout||
  canonicalJson(from.sourceScore??from.score)!==canonicalJson(to.sourceScore??to.score)||musicalClock(from.score)!==musicalClock(to.score))
  throw Error('Practice edition changes its musical source, pitches, clock or keyboard; prior evidence retained.');
 const partition=practicePartition(raw),oldPlan=planPractice(from,partition),old=readPractice(raw,oldPlan),plan=planPractice(to,partition,toPersonal),next=initialPractice(plan);
 for(const key of ['referenceBeat','target','personalGoal','working','step','tolerance','offset','keepTempo','start','connectionStart','usabilityRevision','speedRevision','countInBars','resumeCooldownSeconds','audioOutput'] as const)
  if(old[key]!==undefined)(next as unknown as Record<string,unknown>)[key]=structuredClone(old[key]);
 if(old.composites)next.composites=structuredClone(old.composites);
 const oldAll=passageHierarchy(oldPlan,old).all,newAll=passageHierarchy(plan,next).all;
 for(const chunk of newAll.values()){
  const match=[...oldAll.values()].find(c=>spanClock(oldPlan,c)===spanClock(plan,chunk));if(!match)continue;
  const claims=equivalentPracticeClaims(old,{passage:match.id,pattern:match.pattern}).filter(c=>{const owner=oldAll.get(c.passage);return owner&&owner.end-owner.start===match.end-match.start;});
  // Historical guarded hand keys can belong to this exact range even when
  // they are absent from the canonical equivalence lookup.
  for(const pattern of new Set([...Object.keys(old.best),...Object.keys(old.groundwork??{}),...Object.keys(old.workingByPattern)]))
   if(pattern!==match.pattern&&recognizesPersonalPracticeClaim(oldPlan,match,pattern))claims.push({passage:match.id,pattern});
  for(const [key]of Object.entries(old.manualAttainment?.marks??{})){const [id,pattern]=JSON.parse(key) as [string,string];if(id===match.id&&recognizesPersonalPracticeClaim(oldPlan,match,pattern))claims.push({passage:id,pattern});}
  const rates=claims.flatMap(c=>old.best[c.pattern]===undefined?[]:[old.best[c.pattern]]);if(rates.length)next.best[chunk.pattern]=Math.max(...rates);
  if(claims.some(c=>old.groundwork?.[c.pattern])){next.groundwork??={};next.groundwork[chunk.pattern]=true;}
  const marks=claims.flatMap(c=>old.manualAttainment?.marks[JSON.stringify([c.passage,c.pattern])]??[]);if(marks.length){next.manualAttainment??={version:1,marks:{}};next.manualAttainment.marks[JSON.stringify([chunk.id,chunk.pattern])]=[...new Set(marks)];}
  if(old.workingByPattern[match.pattern]!==undefined)next.workingByPattern[chunk.pattern]=old.workingByPattern[match.pattern];
 }
 const state=readPractice(next,plan) as EditionPracticeState;
 state.editionEvidence={version:'practice-edition-evidence-v1',sourceIdentity:from.sourceRevision??from.sourceSha256,keyboardLayout:from.keyboardLayout,revision:oldPlan.revision,rawState:structuredClone(raw??old)};
 return state;
}
