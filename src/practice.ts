import {requirePianoEvent} from './piano-event';
import {snapPracticeSpeed,snapPracticeStep} from './tempo-presentation';
import {requirePianoCapability} from './score-capabilities';
import {attainedRate,readManualAttainment,claimIdentity,type ManualAttainment} from './practice-attainment';
import{MidiSoundingNotes,type MidiStream,type PracticeMidiSetup}from'./midi-sustain';
import type{MidiCC}from'./midi';
import type {ScorePackage} from './package';
import {scoreTickMs,scorePulseGrid,sourceBarPhaseTicks,validatePulseGrid,type PracticePulseGrid} from './score-clock';
import type {TimeSignatureOverlay} from '../vendor/iso-notation/src/model/types';
import {practiceTiming} from './practice-timing';
import {requireReferencePerformanceTempo,validateReferencePerformanceTempo,type ReferencePerformanceTempo} from '../vendor/iso-notation/src/model/reference-performance-tempo';
export interface PracticeAttack {id:string;tick:number;end:number;midi:number;bar:number;owners:string[];groups:string[]}
export interface Gesture {id:string;bar:number;hand:'LH'|'RH';start:number;end:number;owners:string[];attackIds:string[]}
export interface PracticeChunk {id:string;firstBar:number;lastBar:number;start:number;end:number;weight:number;pattern:string;components?:string[];joins?:number[];boundaryReasons?:string[]}
export type PracticePartition='fixed-four-v1'|'connection-boundary-v1';
export function practicePartition(raw:unknown):PracticePartition {if(!raw)return 'connection-boundary-v1';const p=(raw as PracticeState).partition;if(p===undefined)return 'fixed-four-v1';if(p!=='fixed-four-v1'&&p!=='connection-boundary-v1')throw Error('Practice partition differs; saved evidence retained.');return p;}
/** Musical clock, passage and evidence identity; no physical assessment role. */
export interface PracticePassagePlan {partition:PracticePartition;timeSignatures:TimeSignatureOverlay[];barPhaseTicks?:number[];referencePerformanceTempo?:ReferencePerformanceTempo;revision:string;barTicks:number[];ticksPerBeat:number;chunks:PracticeChunk[]}
/** Piano assessment adds genuine pitches and performing-hand groups. */
export interface PracticePlan extends PracticePassagePlan {attacks:PracticeAttack[];gestures:Gesture[];ownerGroup:Map<string,string>}
export interface PersonalPerformanceGoal {version:'personal-performance-goal-v1';bpm:number;beat:ReferencePerformanceTempo['beat']}
export interface PracticeState {manualAttainment?:ManualAttainment;referenceBeat?:ReferencePerformanceTempo['beat'];partition?:PracticePartition;version:1;revision:string;target:number;personalGoal?:PersonalPerformanceGoal;working:number;step:number;tolerance:number;offset:number;keepTempo:boolean;start:number;workingByPattern:Record<string,number>;best:Record<string,number>;usabilityRevision?:1;speedRevision?:2;countInBars?:number;resumeCooldownSeconds?:number;audioOutput?:string;groundwork?:Record<string,boolean>;composites?:Record<string,string[]>}
/** A brushed wrong key is not a failure; an expected quiet key is still a real attack. */
export const QUIET_STRAY_MAX_VELOCITY=8;
export const isQuietStray=(velocity:number)=>velocity>0&&velocity<=QUIET_STRAY_MAX_VELOCITY;
export type NoteOutcome='accepted'|'quiet-ignored'|'too-early'|'inactive'|'failed';
const validTempo=(n:number)=>Number.isFinite(n)&&n>=5&&n<=500;
export function readPersonalGoal(raw:unknown,reference:ReferencePerformanceTempo):PersonalPerformanceGoal {
 const goal=raw as PersonalPerformanceGoal;
 if(!goal||Array.isArray(goal)||goal.version!=='personal-performance-goal-v1'||!validTempo(goal.bpm))throw Error('Personal performance goal differs; saved evidence retained.');
 const tempo=validateReferencePerformanceTempo({...reference,bpm:goal.bpm,beat:goal.beat});
 if(tempo.beat.numerator!==reference.beat.numerator||tempo.beat.denominator!==reference.beat.denominator)throw Error('Personal goal beat differs from the score reference; saved evidence retained.');
 return {version:goal.version,bpm:goal.bpm,beat:tempo.beat};
}
export function setPracticeGoal(state:PracticeState,plan:PracticePassagePlan,bpm?:number):PracticeState {
 const next=structuredClone(state),reference=requireReferencePerformanceTempo(plan);
 if(bpm===undefined)delete next.personalGoal;else next.personalGoal=readPersonalGoal({version:'personal-performance-goal-v1',bpm,beat:reference.beat},reference);
 next.target=next.personalGoal?.bpm??reference.bpm;
 return readPractice(next,plan);
}
export function planPractice(p:ScorePackage,partition:PracticePartition='connection-boundary-v1'):PracticePlan {
 requireReferencePerformanceTempo(p.score);
 if(p.score.graceGroups?.length)throw Error('Timed practice needs performed timing for the score’s grace notes; the written notes remain available in Score.');
 const plan=planSource(p,partition);scorePulseGrid(plan,plan.barTicks);return plan;
}
export function planSource(p:ScorePackage,partition:PracticePartition='connection-boundary-v1'):PracticePlan {
 requirePianoCapability(p,'pianoPractice');
 const bars=p.score.sourceBarTicks;if(!bars||bars.length<2||bars[0]!==0||bars.at(-1)!==p.score.totalTicks||bars.some((b,i)=>!Number.isFinite(b)||(i>0&&b<=bars[i-1])))throw Error('This score has no complete written-measure map.');
 const barFor=(tick:number)=>Math.max(0,bars.findIndex((b,i)=>i<bars.length-1&&tick>=b&&tick<bars[i+1]));
 const ownerGroup=new Map<string,string>(),groups=new Map<string,Gesture>(),attacks=new Map<string,PracticeAttack>();
 for(const event of p.score.notes){const n=requirePianoEvent(event),bar=barFor(n.startTick),group=`${bar}:${n.hand}`,pitch=n.pitch.octave*12+n.pitch.pitchClass,id=`${n.startTick}:${pitch}`;ownerGroup.set(n.id,group);let g=groups.get(group);if(!g){g={id:group,bar,hand:n.hand,start:n.startTick,end:n.startTick+n.durationTicks,owners:[],attackIds:[]};groups.set(group,g);}g.start=Math.min(g.start,n.startTick);g.end=Math.max(g.end,n.startTick+n.durationTicks);g.owners.push(n.id);if(!g.attackIds.includes(id))g.attackIds.push(id);
 let a=attacks.get(id);if(!a){a={id,tick:n.startTick,end:n.startTick+n.durationTicks,midi:pitch+12,bar,owners:[],groups:[]};attacks.set(id,a);}a.end=Math.max(a.end,n.startTick+n.durationTicks);a.owners.push(n.id);if(!a.groups.includes(group))a.groups.push(group);
 }
 const ordered=[...attacks.values()].sort((a,b)=>a.tick-b.tick||a.midi-b.midi),gestures=[...groups.values()].sort((a,b)=>a.start-b.start||a.id.localeCompare(b.id));
 const occurrences=p.score.writtenPresentation?.occurrences??[],weights=bars.slice(0,-1).map((_,i)=>Math.max(1,occurrences.filter(o=>o.writtenBar===i+1).length));
 const protectedAt=(cut:number)=>{const tick=bars[cut],reasons=ordered.filter(a=>a.tick<tick&&a.end>tick).map(a=>`held:${a.id}`);for(const phrase of p.score.phrases??[]){if(phrase.startTick>=tick||phrase.endTick<=tick)continue;const first=barFor(phrase.startTick),last=barFor(Math.max(phrase.startTick,phrase.endTick-1e-7));if(last-first+1<=2)reasons.push(`phrase:${phrase.id}`);}return reasons;};
 const chunks:PracticeChunk[]=[];
 for(let first=0;first<bars.length-1;){
  const total=bars.length-1,nominal=Math.min(first+4,total);
  let cut=nominal;
  if(partition==='connection-boundary-v1'&&nominal<total){const candidates=[nominal,nominal-1,nominal+1].filter(c=>c>first&&c<=total&&c-first>=3&&c-first<=5);candidates.sort((a,b)=>Number(protectedAt(a).length>0)-Number(protectedAt(b).length>0)||Number(total-a===1)-Number(total-b===1)||Math.abs(a-nominal)-Math.abs(b-nominal)||b-a);cut=candidates[0];}
  const last=cut-1,start=bars[first],end=bars[cut],carry=ordered.filter(a=>a.tick<start&&a.end>start),pattern=JSON.stringify({length:end-start,attacks:ordered.filter(a=>a.tick>=start&&a.tick<end).map(a=>[a.tick-start,a.end-a.tick,a.midi,a.groups.map(g=>g.split(':')[1]).sort()]),...(partition==='connection-boundary-v1'&&carry.length?{carry:carry.map(a=>[a.tick-start,a.end-start,a.midi,a.owners])}: {})});
  chunks.push({id:`${first+1}-${last+1}`,firstBar:first,lastBar:last,start,end,weight:weights.slice(first,last+1).reduce((sum,w,i)=>sum+w*(bars[first+i+1]-bars[first+i]),0),pattern,boundaryReasons:protectedAt(cut)});first=cut;
 }

 return {partition,timeSignatures:structuredClone(p.score.timeSignatures),barPhaseTicks:sourceBarPhaseTicks(p.score,bars),referencePerformanceTempo:p.score.referencePerformanceTempo===undefined?undefined:validateReferencePerformanceTempo(p.score.referencePerformanceTempo),revision:p.manifest.revision,barTicks:[...bars],ticksPerBeat:p.score.ticksPerBeat,attacks:ordered,gestures,chunks,ownerGroup};
}
export function initialPractice(plan:PracticePassagePlan):PracticeState{const target=requireReferencePerformanceTempo(plan).bpm;return {referenceBeat:requireReferencePerformanceTempo(plan).beat,partition:plan.partition,version:1,revision:plan.revision,target,working:snapPracticeSpeed(.10*target,target),step:.01*target,tolerance:500,offset:0,keepTempo:false,start:snapPracticeSpeed(.10*target,target),workingByPattern:{},best:{},usabilityRevision:1,speedRevision:2,countInBars:2,resumeCooldownSeconds:3};}
/** Normalize copied preferences only. Historical attainment and raw journals remain exact. */
export function normalizePracticePreferences(state:PracticeState):PracticeState {
 if(state.speedRevision!==undefined&&state.speedRevision!==2)throw Error('Practice speed preferences differ; saved evidence retained.');
 if(state.speedRevision===undefined&&(state.start===10||state.start===5)&&Math.abs(state.step-state.target*.01)<1e-10){const oldStart=state.start;state.start=state.target*.1;if(state.working===oldStart)state.working=state.target*.1;for(const key of Object.keys(state.workingByPattern))if(state.workingByPattern[key]===oldStart)state.workingByPattern[key]=state.target*.1;}
 state.start=snapPracticeSpeed(state.start,state.target);state.working=snapPracticeSpeed(state.working,state.target);state.step=snapPracticeStep(state.step,state.target);
 for(const key of Object.keys(state.workingByPattern))state.workingByPattern[key]=snapPracticeSpeed(state.workingByPattern[key],state.target);
 state.speedRevision=2;state.countInBars??=2;state.resumeCooldownSeconds??=3;
 if(!Number.isInteger(state.countInBars)||state.countInBars<1||state.countInBars>8||!Number.isInteger(state.resumeCooldownSeconds)||state.resumeCooldownSeconds<0||state.resumeCooldownSeconds>30)throw Error('Choose 1–8 count-in bars and 0–30 cooldown seconds.');
 return state;
}
export function readPractice(raw:unknown,plan:PracticePassagePlan):PracticeState {if(!raw)return initialPractice(plan);const s=structuredClone(raw) as PracticeState;if(practicePartition(s)!==plan.partition)throw Error('Practice partition differs; saved evidence retained.');s.start??=45;s.workingByPattern??={};if(s.version!==1||s.revision!==plan.revision||!validTempo(s.target)||!validTempo(s.working)||!validTempo(s.start)||!Number.isFinite(s.step)||s.step<.025||s.step>100||!Number.isFinite(s.tolerance)||s.tolerance<20||s.tolerance>500||!Number.isFinite(s.offset)||Math.abs(s.offset)>1000||typeof s.keepTempo!=='boolean'||!s.workingByPattern||Array.isArray(s.workingByPattern)||Object.values(s.workingByPattern).some(n=>!validTempo(n))||!s.best||Array.isArray(s.best)||Object.values(s.best).some(n=>!validTempo(n)))throw Error('Practice state differs; saved evidence retained.');const next=s,reference=requireReferencePerformanceTempo(plan),savedBeat=next.referenceBeat??{numerator:3,denominator:8},canonicalBeat=validateReferencePerformanceTempo({...reference,beat:savedBeat}).beat;if(canonicalBeat.numerator!==reference.beat.numerator||canonicalBeat.denominator!==reference.beat.denominator)throw Error('Practice clock beat differs; saved evidence retained.');if(next.personalGoal!==undefined)next.personalGoal=readPersonalGoal(next.personalGoal,reference);next.target=next.personalGoal?.bpm??reference.bpm;if(!next.usabilityRevision){if(next.start===45&&!Object.keys(next.best).length){next.start=10;next.working=10;next.workingByPattern={};}next.usabilityRevision=1;}next.tolerance=500;next.offset=0;next.groundwork??={};if(typeof next.groundwork!=='object'||Array.isArray(next.groundwork)||Object.values(next.groundwork).some(v=>typeof v!=='boolean'))throw Error('Practice groundwork differs; saved evidence retained.');if(next.audioOutput!==undefined&&typeof next.audioOutput!=='string')throw Error('Audio output setting differs; saved evidence retained.');if(next.manualAttainment!==undefined){next.manualAttainment=readManualAttainment(next.manualAttainment);const {all}=passageHierarchy(plan,next);for(const key of Object.keys(next.manualAttainment!.marks)){const [id,pattern]=claimIdentity(key);if(all.get(id)?.pattern!==pattern)throw Error('Self-reported passage differs from this score; saved evidence retained.');}}normalizePracticePreferences(next);reconcilePassages(plan,next);return next;}
export const progressFor=(chunk:PracticeChunk,s:PracticeState)=>((s.groundwork?.[chunk.pattern]||attainedRate(s,chunk.pattern,chunk.id)>0)? .1:0)+.9*Math.min(1,attainedRate(s,chunk.pattern,chunk.id)/s.target);
/** Visible percentages never round an unfinished passage up to completion. */
export const practicePercent=(progress:number)=>progress>=1?100:Math.min(99,Math.floor(100*Math.max(0,progress)));
function composite(plan:PracticePassagePlan,left:PracticeChunk,right:PracticeChunk):PracticeChunk {
 if(left.lastBar+1!==right.firstBar||left.end!==right.start)throw Error('Practice components are not adjacent; saved evidence retained.');
 const id=`${left.firstBar+1}-${right.lastBar+1}`;
 return {id,firstBar:left.firstBar,lastBar:right.lastBar,start:left.start,end:right.end,weight:left.weight+right.weight,pattern:`connected:${plan.revision}:${id}`,components:[left.id,right.id],joins:[...(left.joins??[]),left.lastBar,...(right.joins??[])]};
}
/** Saved edges must describe an actual, nonoverlapping source tree, never an invented gap. */
export function passageHierarchy(plan:PracticePassagePlan,s:PracticeState){
 const all=new Map(plan.chunks.map(c=>[c.id,c])),records=s.composites??{};
 if(typeof records!=='object'||Array.isArray(records))throw Error('Practice grouping differs; saved evidence retained.');
 const entries=Object.entries(records).sort((a,b)=>Number(a[0].split('-')[1])-Number(a[0].split('-')[0])-(Number(b[0].split('-')[1])-Number(b[0].split('-')[0])));
 for(const [id,ids]of entries){if(!Array.isArray(ids)||ids.length!==2||ids.some(i=>typeof i!=='string'))throw Error('Practice grouping differs; saved evidence retained.');const left=all.get(ids[0]),right=all.get(ids[1]);if(!left||!right)throw Error('Practice component differs; saved evidence retained.');const joined=composite(plan,left,right);if(joined.id!==id||all.has(id))throw Error('Practice grouping differs; saved evidence retained.');all.set(id,joined);}
 const parents=[...all.values()].filter(c=>c.components);
 if(parents.some((a,i)=>parents.slice(i+1).some(b=>a.firstBar<=b.lastBar&&b.firstBar<=a.lastBar&&!((a.firstBar<=b.firstBar&&a.lastBar>=b.lastBar)||(b.firstBar<=a.firstBar&&b.lastBar>=a.lastBar)))))throw Error('Practice groups overlap; saved evidence retained.');
 const children=new Set(parents.flatMap(c=>c.components!));
 const frontier=[...all.values()].filter(c=>!children.has(c.id)).sort((a,b)=>a.firstBar-b.firstBar);
 if(frontier.reduce((n,c)=>n+c.lastBar-c.firstBar+1,0)!==plan.chunks.reduce((n,c)=>n+c.lastBar-c.firstBar+1,0))throw Error('Practice coverage differs; saved evidence retained.');
 return {all,frontier};
}
export function reconcilePassages(plan:PracticePassagePlan,s:PracticeState){
 let tree=passageHierarchy(plan,s);
 for(let i=0;i<tree.frontier.length-1;i++){const a=tree.frontier[i],b=tree.frontier[i+1];if(a.lastBar+1!==b.firstBar||!componentsAttained(a,s,tree.all)||!componentsAttained(b,s,tree.all))continue;const joined=composite(plan,a,b);s.composites??={};s.composites[joined.id]=joined.components!;tree=passageHierarchy(plan,s);i=-1;}
 return tree;
}
/** Grouping eligibility is distinct from a parent's independently earned run. */
export function componentsAttained(chunk:PracticeChunk,s:PracticeState,all:ReadonlyMap<string,PracticeChunk>):boolean {
 return progressFor(chunk,s)>=1||!!chunk.components?.length&&chunk.components.every(id=>componentsAttained(all.get(id)!,s,all));
}
export function passageComponents(plan:PracticePassagePlan,s:PracticeState,chunk:PracticeChunk){const {all}=passageHierarchy(plan,s),out:PracticeChunk[]=[];const visit=(c:PracticeChunk)=>{for(const id of c.components??[]){const child=all.get(id)!;out.push(child);visit(child);}};visit(chunk);return out;}
export function passageStartTempo(plan:PracticePassagePlan,s:PracticeState,chunk:PracticeChunk){const saved=s.workingByPattern[chunk.pattern];if(saved!==undefined)return snapPracticeSpeed(saved,s.target);if(!chunk.components)return snapPracticeSpeed(s.start,s.target);const leaves=plan.chunks.filter(c=>c.firstBar>=chunk.firstBar&&c.lastBar<=chunk.lastBar);return snapPracticeSpeed(Math.min(.8*s.target,...leaves.map(c=>attainedRate(s,c.pattern,c.id)||s.start)),s.target);}
export function nextPracticePassage(plan:PracticePassagePlan,s:PracticeState,current:PracticeChunk):PracticeChunk|undefined {
 const {all,frontier}=reconcilePassages(plan,s);if(s.keepTempo||progressFor(current,s)<1)return current;
 const prerequisite=(c:PracticeChunk):PracticeChunk=>{for(const id of c.components??[]){const child=all.get(id)!;if(progressFor(child,s)<1)return prerequisite(child);}return c;};
 const containing=frontier.find(c=>c.firstBar<=current.firstBar&&c.lastBar>=current.lastBar&&progressFor(c,s)<1);if(containing)return prerequisite(containing);
 const next=frontier.find(c=>progressFor(c,s)<1);return next?prerequisite(next):undefined;
}
/** Section learning counts source duration once; adding joins cannot reduce this evidence. */
export function totalProgress(plan:PracticePassagePlan,s:PracticeState){const weight=plan.chunks.reduce((n,c)=>n+c.weight,0);return weight?plan.chunks.reduce((n,c)=>n+c.weight*progressFor(c,s),0)/weight:0;}
/** Whole-piece attainment belongs to its full source-bound run, never a child average. */
export function wholePracticeProgress(plan:PracticePassagePlan,s:PracticeState){const {all}=reconcilePassages(plan,structuredClone(s)),first=plan.chunks[0],last=plan.chunks.at(-1),root=[...all.values()].find(c=>c.firstBar===first?.firstBar&&c.lastBar===last?.lastBar);return root?progressFor(root,s):0;}
export function passed(chunk:PracticeChunk,s:PracticeState){s.best[chunk.pattern]=Math.max(s.best[chunk.pattern]??0,s.working);if(!s.keepTempo&&s.working<s.target)s.working=snapPracticeSpeed(Math.min(s.target,s.working+s.step),s.target);}
export function resetProgress(chunk:PracticeChunk,s:PracticeState){delete s.best[chunk.pattern];if(s.groundwork)delete s.groundwork[chunk.pattern];}
/** Untimed source-ordered solo / adjacent-pair preparation. MIDI cannot identify physical fingers. */
export class GroundworkSession {
 readonly steps:Array<{groups:string[];events:PracticeAttack[]}>;index=0;matched=new Set<string>();failure?:PracticeAttack;complete=false;
 constructor(plan:PracticePlan,chunk:PracticeChunk){const windows=chunk.joins?.map(bar=>[bar,bar+1])??[[chunk.firstBar,chunk.lastBar]],sequences:string[][]=[];for(const [first,last]of windows){const groups=plan.gestures.filter(g=>g.bar>=first&&g.bar<=last).sort((a,b)=>a.start-b.start||a.id.localeCompare(b.id));groups.forEach((g,i)=>{sequences.push([g.id]);if(i)sequences.push([groups[i-1].id,g.id]);});}this.steps=sequences.map(ids=>({groups:ids,events:plan.attacks.filter(a=>a.groups.some(g=>ids.includes(g)))}));this.complete=this.steps.length===0;}
 confirm(){this.index++;this.restart();this.complete=this.index>=this.steps.length;}
 get current(){return this.steps[Math.min(this.index,this.steps.length-1)];}
 restart(){this.matched.clear();this.failure=undefined;}
 note(midi:number,velocity=127):NoteOutcome {if(this.complete)return 'inactive';const events=this.current.events;if(this.failure){if(!events.filter(a=>a.tick===events[0].tick).some(a=>a.midi===midi))return isQuietStray(velocity)?'quiet-ignored':'inactive';this.restart();}else if(this.matched.size&&events[0].midi===midi&&events.find(a=>!this.matched.has(a.id))?.midi!==midi){if(isQuietStray(velocity))return 'quiet-ignored';this.restart();}const next=events.find(a=>!this.matched.has(a.id));if(!next)return 'inactive';const found=events.find(a=>a.tick===next.tick&&!this.matched.has(a.id)&&a.midi===midi);if(!found){if(isQuietStray(velocity))return 'quiet-ignored';this.failure=next;return 'failed';}this.matched.add(found.id);if(events.every(a=>this.matched.has(a.id)))this.confirm();return 'accepted';}
}
/** Optional setup aid: pitch contacts can arm a start, but cannot verify fingers or physical readiness. */
export class PreparationPose {
 readonly held=new Set<number>();armed=false;
 constructor(readonly pitches:Set<number>){}
 input(midi:number,on:boolean):'armed'|'released'|undefined {
  if(on)this.held.add(midi);else this.held.delete(midi);
  if(this.armed){if(!this.held.size){this.armed=false;return 'released';}return;}
  if(this.pitches.size&&this.held.size===this.pitches.size&&[...this.pitches].every(n=>this.held.has(n))){this.armed=true;return 'armed';}
 }
}
export function preparationPitches(plan:PracticePlan,start:number,end:number){const ids=new Set<string>();for(const hand of ['LH','RH']){const first=plan.gestures.find(g=>g.hand===hand&&g.start>=start&&g.start<end);for(const id of first?.attackIds??[])ids.add(id);}return new Set(plan.attacks.filter(a=>ids.has(a.id)).map(a=>a.midi));}
/** A failed position and every group at its immediately preceding onset in this attempt. */
export function practiceErrorContext(plan:PracticePlan,attack:PracticeAttack|undefined,minimumTick=0){
 const failed=plan.gestures.filter(g=>attack?.groups.includes(g.id));if(!failed.length)return new Set<string>();
 const start=Math.min(...failed.map(g=>g.start)),preceding=plan.gestures.filter(g=>g.start>=minimumTick&&g.start<start),previous=preceding.length?Math.max(...preceding.map(g=>g.start)):undefined;
 return new Set([...plan.gestures.filter(g=>g.start===start),...preceding.filter(g=>g.start===previous)].map(g=>g.id));
}
export type Phase='ready'|'countin'|'trial'|'inspection'|'paused'|'complete'|'error';
export class PracticeSession {
 phase:Phase='ready';startTick:number;startMs=0;elapsedTick=0;matched=new Set<string>();started=new Set<string>();message='Prepare both hands, then Ready.';inspection=false;private beforeInspection:Phase='ready';failure?:PracticeAttack;failureReason?:string;errorMarked=false;private sounding=new MidiSoundingNotes();
 readonly sourcePulseGrid:PracticePulseGrid;private attemptGrid:PracticePulseGrid;
 get pulseGrid(){return this.attemptGrid;}
 constructor(readonly plan:PracticePlan,readonly chunk:PracticeChunk,readonly state:PracticeState,public measured:boolean){this.startTick=chunk.start;this.sourcePulseGrid=scorePulseGrid(plan,plan.barTicks,chunk.start,chunk.end);this.attemptGrid=this.sourcePulseGrid;}
 get tickMs(){return scoreTickMs(this.plan,this.state.working);}
 get events(){return this.plan.attacks.filter(a=>a.tick>=this.startTick&&a.tick<this.chunk.end);}
 get carryIn(){return this.plan.attacks.filter(a=>a.tick<this.startTick&&a.end>this.startTick);}
 get obligations(){return [...this.carryIn,...this.events];}
 ready(now:number,carryContacts:ReadonlySet<number>=new Set(),manualCarryConfirmed=false,input:PracticeMidiSetup={},grid:PracticePulseGrid=this.sourcePulseGrid){if(this.carryIn.length&&(this.measured?!this.carryIn.every(a=>carryContacts.has(a.midi)):!manualCarryConfirmed))throw Error('Prepare the earlier held notes before Ready.');const admitted=validatePulseGrid(grid),factor=admitted.pulsesPerBeat/this.sourcePulseGrid.pulsesPerBeat;for(const key of ['barStartPulses','barMeterPulses','barBeatPulses','barPhasePulses','beatStartPulses'] as const){const expected=this.sourcePulseGrid[key]!,actual=admitted[key]!;if(!Number.isSafeInteger(factor)||factor<1||actual.length!==expected.length||actual.some((p,i)=>p!==expected[i]*factor))throw Error('The attempt meter differs from the selected source passage.');}this.attemptGrid=admitted;this.failure=undefined;this.failureReason=undefined;this.errorMarked=false;this.startTick=this.chunk.start;this.sounding.reset(input.sustain);for(const a of this.carryIn)this.sounding.press(a.id,a.midi,input.contacts?.get(a.midi));this.phase='countin';this.matched.clear();this.started.clear();this.elapsedTick=this.startTick;this.startMs=now+practiceTiming(this.state.working,this.pulseGrid).countInMs;this.message='Count in';}
 update(now:number){if(!['countin','trial'].includes(this.phase))return;this.expireSound(now);this.elapsedTick=this.startTick+(now-this.startMs)/this.tickMs;if(now>=this.startMs&&this.phase==='countin'){this.phase='trial';this.message='';}
 if(this.measured){const missed=this.events.find(a=>!this.matched.has(a.id)&&now>this.startMs+(a.tick-this.startTick)*this.tickMs+500);if(missed){this.fail(missed.bar,'A note was missed.',missed);return;}}

 if(this.elapsedTick>=this.chunk.end&&(!this.measured||this.events.every(a=>this.matched.has(a.id)))){this.phase='complete';this.sounding.reset();this.message=this.measured?'Group complete.':'Loop complete.';}
 }
 note(midi:number,now:number,velocity=127,stream?:MidiStream):NoteOutcome {if(!['trial','countin'].includes(this.phase))return 'inactive';this.expireSound(now);const adjusted=now;if(adjusted<this.startMs-500)return 'too-early';this.elapsedTick=Math.max(this.startTick,this.startTick+(now-this.startMs)/this.tickMs);const next=this.events.find(a=>!this.matched.has(a.id));if(!next){if(isQuietStray(velocity))return 'quiet-ignored';if(adjusted<this.startMs+(this.chunk.end-this.startTick)*this.tickMs){this.fail(this.chunk.lastBar,'An extra note was played.',this.events.at(-1));return 'failed';}return 'inactive';}const due=this.startMs+(next.tick-this.startTick)*this.tickMs;const chord=this.events.filter(a=>a.tick===next.tick&&!this.matched.has(a.id));const found=chord.find(a=>a.midi===midi);
 if(!found){if(isQuietStray(velocity))return 'quiet-ignored';this.fail(next.bar,'A different note was played.',next);return 'failed';}if(adjusted<due-500)return 'too-early';if(adjusted>due+500){this.fail(next.bar,'A note was missed.',next);return 'failed';}const released=this.obligations.find(a=>(this.matched.has(a.id)||a.tick<this.startTick)&&a.tick<found.tick&&a.end>found.tick&&adjusted<this.startMs+(a.end-this.startTick)*this.tickMs&&!this.sounding.has(a.id));if(released){this.fail(released.bar,'A held note was released early.',released);return 'failed';}this.matched.add(found.id);this.sounding.press(found.id,found.midi,stream);for(const id of found.groups){const g=this.plan.gestures.find(g=>g.id===id)!;if(found.tick===g.start)this.started.add(id);}return 'accepted'; }
 private expireSound(now:number){this.sounding.expire(id=>{const a=this.obligations.find(a=>a.id===id);return !a||now>=this.startMs+(Math.min(a.end,this.chunk.end)-this.startTick)*this.tickMs;});}
 private stopped(ids:readonly string[],now:number){if(!this.measured||!['trial','countin'].includes(this.phase))return;const early=this.obligations.find(a=>ids.includes(a.id)&&(a.tick<this.startTick||this.plan.attacks.some(b=>b.tick>a.tick&&b.tick<a.end))&&now<this.startMs+(Math.min(a.end,this.chunk.end)-this.startTick)*this.tickMs-500);if(early){this.elapsedTick=Math.max(this.startTick,this.startTick+(now-this.startMs)/this.tickMs);this.fail(early.bar,'A held note was released early.',early);}}
 release(midi:number,now:number,stream?:MidiStream){this.expireSound(now);this.stopped(this.sounding.release(midi,stream),now);}
 sustain(event:MidiCC,now:number){if(!['trial','countin'].includes(this.phase))return;this.expireSound(now);this.stopped(this.sounding.pedal(event),now);}
 fail(_bar:number,message:string,attack?:PracticeAttack){this.sounding.reset();this.failure=attack;this.failureReason=message;this.errorMarked=true;this.phase='error';this.message='Paused';}
 clearErrorMark(midi:number){if(this.phase==='error'&&this.failure?.midi===midi)this.errorMarked=false;}
 inspect(active:boolean){this.inspection=active;}
 pause(){this.sounding.reset();if(this.phase==='error')return;this.failure=undefined;this.errorMarked=false;this.phase='paused';this.message='Paused';this.startTick=this.chunk.start;this.matched.clear();this.started.clear();}
 visibleGroups(){if(this.phase==='error')return practiceErrorContext(this.plan,this.failure,this.chunk.start);if(!this.measured||['paused','inspection','complete'].includes(this.phase))return new Set([...this.carryIn.flatMap(a=>a.groups),...this.plan.gestures.filter(g=>g.bar>=this.chunk.firstBar&&g.bar<=this.chunk.lastBar).map(g=>g.id)]);const visible=new Set<string>(this.carryIn.filter(a=>this.phase==='ready'||this.phase==='countin'||a.end>this.elapsedTick).flatMap(a=>a.groups));for(const hand of ['LH','RH'] as const){const groups=this.plan.gestures.filter(g=>g.hand===hand&&g.start>=this.startTick&&g.start<this.chunk.end);groups.forEach((g,i)=>{if((i===0||this.started.has(groups[i-1].id))&&(this.phase==='ready'||this.phase==='countin'||g.end>this.elapsedTick+1e-7))visible.add(g.id);});}return visible;}
}
