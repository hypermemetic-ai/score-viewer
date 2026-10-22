import {practiceClipCompletionTick,practiceClipPlan} from './practice-clip';
import {personalPracticePackage,handlessMessage} from './personal-assignments';
import {samePracticeEditionMusic} from './practice-edition-source';
import {planPracticeSections,type PracticeSectionPlanning} from './practice-boundaries';
import {boundedPracticePolicyFingerprint} from './practice-sizing';
import {createPracticeExerciseCatalog,includedExerciseTotal,type PracticeExercise,type ExerciseClip} from './practice-exercise-catalog';
import {practiceSimilarityPairs} from './practice-similarity';
import {practiceContrastEpisodes} from './practice-contrast';
import {registerPersonalPracticeIdentity,registerPersonalPracticeRangePattern,personalPracticePattern,recognizesPersonalPracticeClaim} from './personal-practice-identity';
import type {PersonalState} from './state';
import {requirePitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import {snapPracticeSpeed,snapPracticeStep} from './tempo-presentation';
import {registerPracticePatterns,bindPracticePassages,equivalentPracticeClaims,practiceSpanEvidenceKey,practiceExerciseEvidenceKey,musicalSpanFact} from './practice-equivalence';
import {requirePianoCapability} from './score-capabilities';
import {attainedRate,readManualAttainment,claimIdentity,type ManualAttainment} from './practice-attainment';
import{MidiSoundingNotes,type MidiStream,type PracticeMidiSetup}from'./midi-sustain';
import type{MidiCC}from'./midi';
import type {ScorePackage} from './package';
import {scoreTickMs,scorePulseGrid,scoreExcerptPulseGrid,sourceBarPhaseTicks,type PracticePulseGrid} from './score-clock';
import type {TimeSignatureOverlay} from '../vendor/iso-notation/src/model/types';
import {practiceTiming} from './practice-timing';
import {practiceAttemptGrid,practiceCountInGrid} from './practice-attempt-grid';
import {requireReferencePerformanceTempo,validateReferencePerformanceTempo,type ReferencePerformanceTempo} from '../vendor/iso-notation/src/model/reference-performance-tempo';
import {savedPlayerTempo} from './player-tempo';
import type {PracticeFoldPart} from './practice-fold-journal';
export interface PracticeAttack {id:string;tick:number;end:number;midi:number;bar:number;owners:string[];groups:string[]}
/** `hand: null` groups notes the score leaves hand-less; only plans that are not
 * practised carry it (source identity, earlier editions, summaries). */
export interface Gesture {id:string;bar:number;hand:'LH'|'RH'|null;start:number;end:number;owners:string[];attackIds:string[]}
export interface PracticeChunk {id:string;firstBar:number;lastBar:number;start:number;end:number;weight:number;pattern:string;components?:string[];joins?:number[];boundaryReasons?:string[];kind?:PracticeExercise['kind'];clips?:readonly ExerciseClip[];originalIds?:readonly string[];prerequisites?:readonly string[];episode?:number;clipIndex?:number}
export type LegacyPracticePartition='fixed-four-v1'|'connection-boundary-v1';
export type PracticePartition=LegacyPracticePartition|'bounded-exercises-v1';
export function practicePartition(raw:unknown):PracticePartition {if(!raw)return 'bounded-exercises-v1';const p=(raw as PracticeState).partition;if(p===undefined)return 'fixed-four-v1';if(p!=='fixed-four-v1'&&p!=='connection-boundary-v1'&&p!=='bounded-exercises-v1')throw Error('Practice partition differs; saved evidence retained.');return p;}
/** Musical clock, passage and evidence identity; no physical assessment role. */
export interface PracticePassagePlan {partition:PracticePartition;timeSignatures:TimeSignatureOverlay[];barPhaseTicks?:number[];referencePerformanceTempo?:ReferencePerformanceTempo;playerTempo?:true;revision:string;barTicks:number[];ticksPerBeat:number;chunks:PracticeChunk[];catalog?:readonly PracticeExercise[];policyFingerprint?:string;boundaryProfile?:PracticeSectionPlanning;legacyPlans?:Partial<Record<LegacyPracticePartition,PracticePassagePlan>>;sourcePracticeIdentity?:string;keyboardLayout?:string}
/** Piano assessment adds genuine pitches and performing-hand groups. */
export interface PracticePlan extends PracticePassagePlan {attacks:PracticeAttack[];gestures:Gesture[];ownerGroup:Map<string,string>;ornaments?:PracticeOrnament[]}
/** One written grace-note group at its host's onset (one per repeat pass).
 * Grace notes are printed with no metrical duration, so practice treats them
 * as ornaments of their host: they stay on the page, a played grace key is
 * accepted, and none is required, timed or counted as a missed note. */
export interface PracticeOrnament {id:string;tick:number;midis:number[]}
/** The ornament a key belongs to, if any, while its host onset is still ahead.
 * The window opens one beat before the host and closes once every note of the
 * host onset is played; `limit` bounds it to the onsets being assessed. */
export function practiceOrnament(plan:Pick<PracticePlan,'ornaments'|'ticksPerBeat'>,midi:number,nextTick:number,limit:number):PracticeOrnament|undefined {
 return plan.ornaments?.find(o=>o.tick>=nextTick&&o.tick<limit&&o.tick-nextTick<=plan.ticksPerBeat&&o.midis.includes(midi));
}
/** A grace on its host's own key is a second strike of that key: the first
 * strike sounds the host, and one more strike of it is the host proper. */
export const practiceSameKeyGrace=(plan:Pick<PracticePlan,'ornaments'>,a:Pick<PracticeAttack,'tick'|'midi'>)=>!!plan.ornaments?.some(o=>o.tick===a.tick&&o.midis.includes(a.midi));
export interface PersonalPerformanceGoal {version:'personal-performance-goal-v1';bpm:number;beat:ReferencePerformanceTempo['beat']}
export interface LegacyPracticeEnvelope {version:'legacy-practice-envelope-v1';partition:LegacyPracticePartition;revision:string;state:PracticeState;record?:unknown}
export interface PracticeEditionEvidence {version:'practice-edition-evidence-v1';sourceIdentity:string;keyboardLayout:string;revision:string;rawState:unknown}
export interface PracticeState {manualAttainment?:ManualAttainment;referenceBeat?:ReferencePerformanceTempo['beat'];partition?:PracticePartition;version:1;revision:string;target:number;personalGoal?:PersonalPerformanceGoal;working:number;step:number;tolerance:number;offset:number;keepTempo:boolean;start:number;connectionStart?:number;workingByPattern:Record<string,number>;best:Record<string,number>;usabilityRevision?:1;speedRevision?:2;countInBars?:number;resumeCooldownSeconds?:number;audioOutput?:string;groundwork?:Record<string,boolean>;composites?:Record<string,string[]>;policyFingerprint?:string;excluded?:Record<string,boolean>;legacy?:LegacyPracticeEnvelope;editionEvidence?:PracticeEditionEvidence;folded?:Record<string,PracticeFoldPart>}
/** A brushed wrong key is not a failure; an expected quiet key is still a real attack. */
export const QUIET_STRAY_MAX_VELOCITY=8;
export const isQuietStray=(velocity:number)=>velocity>0&&velocity<=QUIET_STRAY_MAX_VELOCITY;
export type NoteOutcome='accepted'|'ornament'|'quiet-ignored'|'too-early'|'inactive'|'failed';
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
 if(bpm===undefined&&plan.playerTempo)throw Error('This score has no reference tempo; practice keeps your own tempo.');
 if(bpm===undefined)delete next.personalGoal;else next.personalGoal=readPersonalGoal({version:'personal-performance-goal-v1',bpm,beat:reference.beat},reference);
 next.target=next.personalGoal?.bpm??reference.bpm;
 return readPractice(plan.partition==='bounded-exercises-v1'?normalizePracticePreferences(next):next,plan);
}
/** Timed practice needs every note in a hand: the score's own, or the player's choice. */
export function requirePracticeHands(p:ScorePackage,personal?:PersonalState):void {
 const handless=(personal?personalPracticePackage(p,personal):p).score.notes.filter(n=>n.hand===undefined).length;
 if(handless)throw Error(handlessMessage(handless,'timed practice'));
}
/** A score without a reference tempo plans only with the player's own tempo. */
export function planPractice(p:ScorePackage,partition:PracticePartition='bounded-exercises-v1',personal?:PersonalState,playerTempo?:ReferencePerformanceTempo):PracticePlan {
 const player=p.score.referencePerformanceTempo===undefined&&playerTempo?validateReferencePerformanceTempo(playerTempo):undefined;
 if(!player)requireReferencePerformanceTempo(p.score);
 const plan=planSource(p,partition,personal,player);scorePulseGrid(plan,plan.barTicks);return plan;
}
export function planSource(p:ScorePackage,partition:PracticePartition='bounded-exercises-v1',personal?:PersonalState,playerTempo?:ReferencePerformanceTempo):PracticePlan {
 requirePianoCapability(p,'pianoPractice');
 const original=p,base=personal?planSource(p,partition,undefined,playerTempo):undefined;if(personal)p=personalPracticePackage(p,personal);
 const bars=p.score.sourceBarTicks;if(!bars||bars.length<2||bars[0]!==0||bars.at(-1)!==p.score.totalTicks||bars.some((b,i)=>!Number.isFinite(b)||(i>0&&b<=bars[i-1])))throw Error('This score has no complete written-measure map.');
 const barFor=(tick:number)=>Math.max(0,bars.findIndex((b,i)=>i<bars.length-1&&tick>=b&&tick<bars[i+1]));
 const ownerGroup=new Map<string,string>(),groups=new Map<string,Gesture>(),attacks=new Map<string,PracticeAttack>();
 for(const event of p.score.notes){const n=requirePitchedEvent(event),hand=n.hand??null,bar=barFor(n.startTick),group=`${bar}:${hand??'none'}`,pitch=n.pitch.octave*12+n.pitch.pitchClass,id=`${n.startTick}:${pitch}`;ownerGroup.set(n.id,group);let g=groups.get(group);if(!g){g={id:group,bar,hand,start:n.startTick,end:n.startTick+n.durationTicks,owners:[],attackIds:[]};groups.set(group,g);}g.start=Math.min(g.start,n.startTick);g.end=Math.max(g.end,n.startTick+n.durationTicks);g.owners.push(n.id);if(!g.attackIds.includes(id))g.attackIds.push(id);
 let a=attacks.get(id);if(!a){a={id,tick:n.startTick,end:n.startTick+n.durationTicks,midi:pitch+12,bar,owners:[],groups:[]};attacks.set(id,a);}a.end=Math.max(a.end,n.startTick+n.durationTicks);a.owners.push(n.id);if(!a.groups.includes(group))a.groups.push(group);
 }
 const ordered=[...attacks.values()].sort((a,b)=>a.tick-b.tick||a.midi-b.midi),gestures=[...groups.values()].sort((a,b)=>a.start-b.start||a.id.localeCompare(b.id));
 const occurrences=p.score.writtenPresentation?.occurrences??[],weights=bars.slice(0,-1).map((_,i)=>Math.max(1,occurrences.filter(o=>o.writtenBar===i+1).length));
 const protectedAt=(cut:number)=>{const tick=bars[cut],reasons=ordered.filter(a=>a.tick<tick&&a.end>tick).map(a=>`held:${a.id}`);for(const phrase of p.score.phrases??[]){if(phrase.startTick>=tick||phrase.endTick<=tick)continue;const first=barFor(phrase.startTick),last=barFor(Math.max(phrase.startTick,phrase.endTick-1e-7));if(last-first+1<=2)reasons.push(`phrase:${phrase.id}`);}return reasons;};
 const chunks:PracticeChunk[]=[];
 const boundaryProfile=partition==='bounded-exercises-v1'?planPracticeSections(original.sourceScore??original.score):undefined;
 if(boundaryProfile)for(const section of boundaryProfile.sections){
  const {firstBar:first,lastBar:last,start,end}=section,carry=ordered.filter(a=>a.tick<start&&a.end>start),id=practiceSectionId(section,bars);
  const pattern=JSON.stringify({policy:boundedPracticePolicyFingerprint,length:end-start,attacks:ordered.filter(a=>a.tick>=start&&a.tick<end).map(a=>[a.tick-start,a.end-a.tick,a.midi,a.groups.map(g=>g.split(':')[1]).sort()]),...(carry.length?{carry:carry.map(a=>[a.tick-start,a.end-start,a.midi,a.owners])}:{})});
  chunks.push({id,firstBar:first,lastBar:last,start,end,weight:1,pattern,kind:'section',boundaryReasons:section.boundaryReasons});
 }
 for(let first=0;!boundaryProfile&&first<bars.length-1;){
  const total=bars.length-1,nominal=Math.min(first+4,total);
  let cut=nominal;
  if(partition==='connection-boundary-v1'&&nominal<total){const candidates=[nominal,nominal-1,nominal+1].filter(c=>c>first&&c<=total&&c-first>=3&&c-first<=5);candidates.sort((a,b)=>Number(protectedAt(a).length>0)-Number(protectedAt(b).length>0)||Number(total-a===1)-Number(total-b===1)||Math.abs(a-nominal)-Math.abs(b-nominal)||b-a);cut=candidates[0];}
  const last=cut-1,start=bars[first],end=bars[cut],carry=ordered.filter(a=>a.tick<start&&a.end>start),pattern=JSON.stringify({length:end-start,attacks:ordered.filter(a=>a.tick>=start&&a.tick<end).map(a=>[a.tick-start,a.end-a.tick,a.midi,a.groups.map(g=>g.split(':')[1]).sort()]),...(partition==='connection-boundary-v1'&&carry.length?{carry:carry.map(a=>[a.tick-start,a.end-start,a.midi,a.owners])}: {})});
  chunks.push({id:`${first+1}-${last+1}`,firstBar:first,lastBar:last,start,end,weight:weights.slice(first,last+1).reduce((sum,w,i)=>sum+w*(bars[first+i+1]-bars[first+i]),0),pattern,boundaryReasons:protectedAt(cut)});first=cut;
 }

 // Grace notes stay out of attacks, gestures and passage identity: they carry no
 // written duration to time. Their keys are known so a played grace is no error.
 const ornaments=(p.score.graceGroups??[]).flatMap(g=>{const midis=[...new Set(g.members.flatMap(m=>m.pitch?[m.pitch.octave*12+m.pitch.pitchClass+12]:[]))];
  return midis.length?g.occurrences.map(o=>({id:o.id,tick:o.tick,midis})):[];}).sort((a,b)=>a.tick-b.tick||a.id.localeCompare(b.id));
 const plan:PracticePlan={partition,timeSignatures:structuredClone(p.score.timeSignatures),barPhaseTicks:sourceBarPhaseTicks(p.score,bars),referencePerformanceTempo:p.score.referencePerformanceTempo===undefined?playerTempo&&validateReferencePerformanceTempo(playerTempo):validateReferencePerformanceTempo(p.score.referencePerformanceTempo),...(p.score.referencePerformanceTempo===undefined&&playerTempo?{playerTempo:true as const}:{}),revision:p.manifest.revision,sourcePracticeIdentity:original.sourceRevision??original.manifest.revision,keyboardLayout:original.keyboardLayout,barTicks:[...bars],ticksPerBeat:p.score.ticksPerBeat,attacks:ordered,gestures,chunks,ownerGroup,...(ornaments.length?{ornaments}:{})};
 if(boundaryProfile)for(const chunk of chunks)chunk.pattern=JSON.stringify({version:'bounded-piano-passage-v1',policyFingerprint:boundedPracticePolicyFingerprint,music:musicalSpanFact(plan,original.sourceScore??original.score,chunk,'piano')});
 registerPersonalPracticeIdentity(plan,original.score,p.score,base?.chunks??chunks.map(c=>({...c})));
 if(boundaryProfile){plan.boundaryProfile=boundaryProfile;plan.policyFingerprint=boundedPracticePolicyFingerprint;populatePracticeCatalog(plan,p.score);plan.legacyPlans={'fixed-four-v1':planSource(original,'fixed-four-v1',personal,playerTempo),'connection-boundary-v1':planSource(original,'connection-boundary-v1',personal,playerTempo)};}
 registerPracticePatterns(plan,original.sourceScore??original.score,'piano');return plan;
}
export function practiceSectionId(section:Pick<PracticeChunk,'start'|'end'|'firstBar'|'lastBar'>,bars:readonly number[]){
 return section.start===bars[section.firstBar]&&section.end===bars[section.lastBar+1]?`${section.firstBar+1}-${section.lastBar+1}`:`section-${section.start}-${section.end}`;
}
/** One catalog is defined before attainment; overlapping connections are peers. */
export function populatePracticeCatalog(plan:PracticePassagePlan,score:ScorePackage['score']){
 const profile=plan.boundaryProfile;if(plan.partition!=='bounded-exercises-v1'||!profile)throw Error('Bounded catalog needs its source boundary profile.');
 const contrasts=practiceSimilarityPairs(score,plan.chunks).flatMap(pair=>practiceContrastEpisodes(score,pair,{sourceIdentity:plan.revision,profile,policyFingerprint:plan.policyFingerprint})).map(c=>({...c,
  pattern:JSON.stringify({version:'contrast-attainment-v1',episode:c.id,alternatives:c.clips.map(clip=>personalPracticePattern(plan,clip.start,clip.end,JSON.stringify([plan.revision,plan.policyFingerprint,clip.start,clip.end])))})}));
 plan.catalog=createPracticeExerciseCatalog(plan.revision,plan.policyFingerprint!,plan.chunks,contrasts).map(c=>{if(c.kind!=='connection')return c;registerPersonalPracticeRangePattern(plan,c.id,c.pattern);return {...c,pattern:personalPracticePattern(plan,c.clips[0].start,c.clips[0].end,c.pattern)};});
 for(const c of plan.chunks){const exercise=plan.catalog.find(e=>e.id===c.id)!;c.kind='section';c.clips=exercise.clips;c.originalIds=exercise.originalIds;c.prerequisites=exercise.prerequisites;}
}
export function practiceCatalogChunks(plan:PracticePassagePlan):PracticeChunk[]{
 if(!plan.catalog)return [...plan.chunks];const originals=new Map(plan.chunks.map(c=>[c.id,c]));
 return plan.catalog.map(e=>originals.get(e.id)??{...e.clips[0],id:e.id,kind:e.kind,pattern:e.pattern,weight:1,clips:e.clips,originalIds:e.originalIds,prerequisites:e.prerequisites,episode:e.episode,
  ...(e.kind==='connection'?{components:[...e.originalIds],joins:[originals.get(e.originalIds[0])!.lastBar]}:{}),boundaryReasons:[...e.boundaryReasons]});
}
/** The owning contrast retains one ID/pattern; sessions receive a real A or B range. */
export function practiceClipChunk(chunk:PracticeChunk,index:number):PracticeChunk {
 if(chunk.kind!=='contrast'||!Number.isInteger(index)||index<0||index>=2||chunk.clips?.length!==2)throw Error('Contrast clip differs from its owning exercise.');
 const clip=chunk.clips[index];return {...chunk,...clip,id:chunk.id,pattern:chunk.pattern,boundaryReasons:[...(clip.boundaryReasons??chunk.boundaryReasons??[])],clipIndex:index,components:undefined,joins:undefined};
}
export function initialPractice(plan:PracticePassagePlan):PracticeState{const target=requireReferencePerformanceTempo(plan).bpm,start=snapPracticeSpeed(('attacks' in plan&&'gestures' in plan ? .30 : .10)*target,target);return bindPracticePassages(plan,{referenceBeat:requireReferencePerformanceTempo(plan).beat,partition:plan.partition,version:1,revision:plan.revision,target,working:start,step:.02*target,tolerance:500,offset:0,keepTempo:false,start,connectionStart:snapPracticeSpeed(.50*target,target),workingByPattern:{},best:{},usabilityRevision:1,speedRevision:2,countInBars:2,resumeCooldownSeconds:3,...(plan.partition==='bounded-exercises-v1'?{policyFingerprint:plan.policyFingerprint,excluded:{}}:{})},new Map(practiceCatalogChunks(plan).map(c=>[c.id,c])));}
/** Normalize copied preferences only. Historical attainment and raw journals remain exact. */
export function normalizePracticePreferences(state:PracticeState):PracticeState {
 if(state.speedRevision!==undefined&&state.speedRevision!==2)throw Error('Practice speed preferences differ; saved evidence retained.');
 if(state.speedRevision===undefined&&(state.start===10||state.start===5)&&Math.abs(state.step-state.target*.01)<1e-10){const oldStart=state.start;state.start=state.target*.1;if(state.working===oldStart)state.working=state.target*.1;for(const key of Object.keys(state.workingByPattern))if(state.workingByPattern[key]===oldStart)state.workingByPattern[key]=state.target*.1;}
 state.start=snapPracticeSpeed(state.start,state.target);state.connectionStart=snapPracticeSpeed(state.connectionStart??state.target*.5,state.target);state.working=snapPracticeSpeed(state.working,state.target);state.step=snapPracticeStep(state.step??state.target*.02,state.target);
 for(const key of Object.keys(state.workingByPattern))state.workingByPattern[key]=snapPracticeSpeed(state.workingByPattern[key],state.target);
 return fillPracticePreferenceDefaults(state);
}
/** Loading an accepted bounded journal is not a player edit. Only absent
 * preferences receive defaults; explicit valid precision remains literal. */
function fillPracticePreferenceDefaults(state:PracticeState):PracticeState {
 if(state.speedRevision!==undefined&&state.speedRevision!==2)throw Error('Practice speed preferences differ; saved evidence retained.');
 state.step??=snapPracticeStep(state.target*.02,state.target);
 state.connectionStart??=snapPracticeSpeed(state.target*.5,state.target);
 state.speedRevision=2;state.countInBars??=2;state.resumeCooldownSeconds??=3;
 if(!Number.isInteger(state.countInBars)||state.countInBars<1||state.countInBars>8||!Number.isInteger(state.resumeCooldownSeconds)||state.resumeCooldownSeconds<0||state.resumeCooldownSeconds>30)throw Error('Choose 1–8 count-in bars and 0–30 cooldown seconds.');
 return state;
}
function readPracticeLiteral(raw:unknown,plan:PracticePassagePlan,preservePreferences=false):PracticeState {
 if(!raw)return initialPractice(plan);
 const s=structuredClone(raw) as PracticeState;
 if(practicePartition(s)!==plan.partition)throw Error('Practice partition differs; saved evidence retained.');
 s.start??=preservePreferences?initialPractice(plan).start:45;s.workingByPattern??={};
 if(s.version!==1||s.revision!==plan.revision||!validTempo(s.target)||!validTempo(s.working)||!validTempo(s.start)||(s.connectionStart!==undefined&&!validTempo(s.connectionStart))||(s.step!==undefined&&(!Number.isFinite(s.step)||s.step<.025||s.step>100))||!Number.isFinite(s.tolerance)||s.tolerance<20||s.tolerance>500||!Number.isFinite(s.offset)||Math.abs(s.offset)>1000||typeof s.keepTempo!=='boolean'||!s.workingByPattern||Array.isArray(s.workingByPattern)||Object.values(s.workingByPattern).some(n=>!validTempo(n))||!s.best||Array.isArray(s.best)||Object.values(s.best).some(n=>!validTempo(n)))throw Error('Practice state differs; saved evidence retained.');
 const next=s,reference=requireReferencePerformanceTempo(plan),savedBeat=next.referenceBeat??{numerator:3,denominator:8},canonicalBeat=validateReferencePerformanceTempo({...reference,beat:savedBeat}).beat;
 if(canonicalBeat.numerator!==reference.beat.numerator||canonicalBeat.denominator!==reference.beat.denominator)throw Error('Practice clock beat differs; saved evidence retained.');
 if(next.personalGoal!==undefined)next.personalGoal=readPersonalGoal(next.personalGoal,reference);
 // Target is a reference-derived cache unless an explicit personal goal owns
 // it. This clock authority is independent of literal practice preferences.
 next.target=next.personalGoal?.bpm??reference.bpm;
 if(!next.usabilityRevision){if(!preservePreferences&&next.start===45&&!Object.keys(next.best).length){next.start=10;next.working=10;next.workingByPattern={};}next.usabilityRevision=1;}
 if(!preservePreferences){next.tolerance=500;next.offset=0;}
 next.groundwork??={};
 if(typeof next.groundwork!=='object'||Array.isArray(next.groundwork)||Object.values(next.groundwork).some(v=>typeof v!=='boolean'))throw Error('Practice groundwork differs; saved evidence retained.');
 if(next.audioOutput!==undefined&&typeof next.audioOutput!=='string')throw Error('Audio output setting differs; saved evidence retained.');
 if(next.manualAttainment!==undefined){next.manualAttainment=readManualAttainment(next.manualAttainment);const {all}=passageHierarchy(plan,next);for(const key of Object.keys(next.manualAttainment!.marks)){const [id,pattern]=claimIdentity(key);if(!all.get(id)||!recognizesPersonalPracticeClaim(plan,all.get(id)!,pattern))throw Error('Self-reported passage differs from this score; saved evidence retained.');}}
 if(preservePreferences)fillPracticePreferenceDefaults(next);else normalizePracticePreferences(next);
 reconcilePassages(plan,next);return next;
}
export const progressFor=(chunk:PracticeChunk,s:PracticeState)=>((equivalentPracticeClaims(s,{passage:chunk.id,pattern:chunk.pattern}).some(c=>s.groundwork?.[c.pattern])||attainedRate(s,chunk.pattern,chunk.id)>0)? .1:0)+.9*Math.min(1,attainedRate(s,chunk.pattern,chunk.id)/s.target);
export function readPractice(raw:unknown,plan:PracticePassagePlan):PracticeState {
 if(plan.partition!=='bounded-exercises-v1')return readPracticeLiteral(raw,plan);
 if(raw&&practicePartition(raw)!=='bounded-exercises-v1')return migratePracticeState(raw,plan);
 const state=readPracticeLiteral(raw,plan,true);
 if(state.policyFingerprint!==plan.policyFingerprint)throw Error('Practice sizing policy differs; saved catalog evidence retained.');
 const all=passageHierarchy(plan,state).all;
 if(state.excluded!==undefined&&(!state.excluded||typeof state.excluded!=='object'||Array.isArray(state.excluded)||Object.entries(state.excluded).some(([id,value])=>!all.has(id)||typeof value!=='boolean')))throw Error('Practice exclusion differs from its exercise catalog; saved evidence retained.');
 state.excluded??={};
 if(state.editionEvidence){const evidence=state.editionEvidence,old=evidence.rawState as PracticeState;if(evidence.version!=='practice-edition-evidence-v1'||evidence.sourceIdentity!==plan.sourcePracticeIdentity||evidence.keyboardLayout!==plan.keyboardLayout||!old||old.version!==1||old.revision!==evidence.revision)throw Error('Prior practice edition evidence differs; saved data retained.');practicePartition(old);}
 if(state.legacy){const old=state.legacy,legacy=plan.legacyPlans?.[old.partition];if(old.version!=='legacy-practice-envelope-v1'||!legacy||old.revision!==legacy.revision||practicePartition(old.state)!==old.partition||old.state.legacy)throw Error('Legacy practice recovery differs; saved evidence retained.');readPracticeLiteral(old.state,legacy);}
 return state;
}
/** Validate before projection. Literal raw claims and removed joins remain recoverable. */
export function migratePracticeState(raw:unknown,plan:PracticePassagePlan):PracticeState {
 const partition=practicePartition(raw);if(partition==='bounded-exercises-v1')return readPractice(raw,plan);
 const legacy=plan.legacyPlans?.[partition];if(!legacy)throw Error('Legacy practice planner is unavailable; saved evidence retained.');
 const old=readPracticeLiteral(raw,legacy,true),next=initialPractice(plan),oldAll=passageHierarchy(legacy,old).all,newAll=passageHierarchy(plan,next).all;
 for(const key of ['referenceBeat','target','personalGoal','working','step','tolerance','offset','keepTempo','start','connectionStart','usabilityRevision','speedRevision','countInBars','resumeCooldownSeconds','audioOutput'] as const){if(old[key]!==undefined)(next as unknown as Record<string,unknown>)[key]=structuredClone(old[key]);}
 next.legacy={version:'legacy-practice-envelope-v1',partition,revision:legacy.revision,state:structuredClone(raw) as PracticeState};
 next.workingByPattern=structuredClone(old.workingByPattern);
 for(const chunk of newAll.values()){
  if(chunk.kind==='contrast')continue;
  const evidence=practiceSpanEvidenceKey(plan,chunk);
  const match=evidence&&[...oldAll.values()].find(c=>c.start===chunk.start&&c.end===chunk.end&&practiceSpanEvidenceKey(legacy,c)===evidence);
  if(!match)continue;
  // Literal guarded claims for the complete range survive choice edits. Old
  // long runs and derived aliases never distribute credit to subranges.
  const recognized=(pattern:string)=>recognizesPersonalPracticeClaim(legacy,match,pattern);
  const rates=Object.entries(old.best).filter(([pattern])=>recognized(pattern)).map(([,rate])=>rate);
  if(rates.length)next.best[chunk.pattern]=Math.max(...rates);
  if(Object.entries(old.groundwork??{}).some(([pattern,done])=>done&&recognized(pattern))){next.groundwork??={};next.groundwork[chunk.pattern]=true;}
  const working=old.workingByPattern[match.pattern];if(working!==undefined)next.workingByPattern[chunk.pattern]??=working;
  const marks=Object.entries(old.manualAttainment?.marks??{}).flatMap(([key,rates])=>{const [id,pattern]=claimIdentity(key);return id===match.id&&recognized(pattern)?rates:[];});
  if(marks.length){next.manualAttainment??={version:1,marks:{}};next.manualAttainment.marks[JSON.stringify([chunk.id,chunk.pattern])]=[...new Set(marks)];}
 }
 return readPractice(next,plan);
}
/** Explicit hand/finger calculation keeps a complete same-source exercise's
 * attainment. The old edition is validated before any claim is projected. */
export function transferPracticeEdition(from:ScorePackage,raw:unknown,to:ScorePackage,toPersonal?:PersonalState):PracticeState {
 if(!from.sourceSha256||from.sourceSha256!==to.sourceSha256||from.sourceRevision!==to.sourceRevision||!from.keyboardLayout||from.keyboardLayout!==to.keyboardLayout)throw Error('Practice edition belongs to another source or keyboard; prior evidence retained.');
 if(!samePracticeEditionMusic(from,to))throw Error('Practice edition changes musical source facts, pitches or clock; prior evidence retained.');
 const oldPlan=planPractice(from,practicePartition(raw),undefined,savedPlayerTempo(from.score,raw)),old=oldPlan.partition==='bounded-exercises-v1'?readPractice(raw,oldPlan):readPracticeLiteral(raw,oldPlan,true),plan=planPractice(to,'bounded-exercises-v1',toPersonal,savedPlayerTempo(to.score,raw)),next=initialPractice(plan);
 const full=(p:PracticePlan,score:ScorePackage['score'])=>musicalSpanFact(p,score,{id:'source',pattern:'source',start:0,end:p.barTicks.at(-1)!,firstBar:0,lastBar:p.barTicks.length-2,weight:1},'piano');
 if(full(oldPlan,from.sourceScore??from.score)!==full(plan,to.sourceScore??to.score))throw Error('Practice edition changes musical source facts; prior evidence retained.');
 const oldAll=passageHierarchy(oldPlan,old).all,newAll=passageHierarchy(plan,next).all,oldByEvidence=new Map([...oldAll.values()].flatMap(c=>{const evidence=practiceExerciseEvidenceKey(oldPlan,c);return evidence?[[evidence,c] as const]:[];}));
 for(const key of ['referenceBeat','target','personalGoal','working','step','tolerance','offset','keepTempo','start','connectionStart','usabilityRevision','speedRevision','countInBars','resumeCooldownSeconds','audioOutput'] as const)if(old[key]!==undefined)(next as unknown as Record<string,unknown>)[key]=structuredClone(old[key]);
 next.workingByPattern=structuredClone(old.workingByPattern);
 for(const chunk of newAll.values()){
  const evidence=practiceExerciseEvidenceKey(plan,chunk),match=evidence&&oldByEvidence.get(evidence);
  if(!match)continue;
  const claims=equivalentPracticeClaims(old,{passage:match.id,pattern:match.pattern}).filter(c=>{const owner=oldAll.get(c.passage);return owner&&owner.end-owner.start===match.end-match.start;});
  // Earlier guarded personal-choice claims are literal complete-range credit,
  // even when their historical pattern is not in the current equivalence map.
  for(const pattern of new Set([...Object.keys(old.best),...Object.keys(old.groundwork??{})]))if(recognizesPersonalPracticeClaim(oldPlan,match,pattern))claims.push({passage:match.id,pattern});
  for(const key of Object.keys(old.manualAttainment?.marks??{})){const [id,pattern]=claimIdentity(key);if(id===match.id&&recognizesPersonalPracticeClaim(oldPlan,match,pattern))claims.push({passage:id,pattern});}
  const rates=claims.flatMap(c=>old.best[c.pattern]===undefined?[]:[old.best[c.pattern]]);if(rates.length)next.best[chunk.pattern]=Math.max(...rates);
  const marks=claims.flatMap(c=>old.manualAttainment?.marks[JSON.stringify([c.passage,c.pattern])]??[]);if(marks.length){next.manualAttainment??={version:1,marks:{}};next.manualAttainment.marks[JSON.stringify([chunk.id,chunk.pattern])]=[...new Set(marks)];}
  if(claims.some(c=>old.groundwork?.[c.pattern])){next.groundwork??={};next.groundwork[chunk.pattern]=true;}
  if(old.workingByPattern[match.pattern]!==undefined)next.workingByPattern[chunk.pattern]??=old.workingByPattern[match.pattern];
  if(old.excluded?.[match.id])next.excluded![chunk.id]=true;
 }
 // A folded edition's own exercises stay with the fold; its music is shared with this journal.
 if(old.folded)next.folded=structuredClone(old.folded);
 next.editionEvidence={version:'practice-edition-evidence-v1',sourceIdentity:plan.sourcePracticeIdentity!,keyboardLayout:plan.keyboardLayout!,revision:oldPlan.revision,rawState:structuredClone(raw??old)};
 return readPractice(next,plan);
}
/** Visible percentages never round an unfinished passage up to completion. */
export const practicePercent=(progress:number)=>progress>=1?100:Math.min(99,Math.floor(100*Math.max(0,progress)));
function composite(plan:PracticePassagePlan,left:PracticeChunk,right:PracticeChunk):PracticeChunk {
 if(left.lastBar+1!==right.firstBar||left.end!==right.start)throw Error('Practice components are not adjacent; saved evidence retained.');
 const id=`${left.firstBar+1}-${right.lastBar+1}`;
 return {id,firstBar:left.firstBar,lastBar:right.lastBar,start:left.start,end:right.end,weight:left.weight+right.weight,pattern:personalPracticePattern(plan,left.start,right.end,`connected:${plan.revision}:${id}`),components:[left.id,right.id],joins:[...(left.joins??[]),left.lastBar,...(right.joins??[])]};
}
/** Saved edges must describe an actual, nonoverlapping source tree, never an invented gap. */
export function passageHierarchy(plan:PracticePassagePlan,s:PracticeState){
 if(plan.partition==='bounded-exercises-v1'){
  if(!plan.catalog||!plan.policyFingerprint)throw Error('Bounded practice catalog is unavailable.');
  if(s.composites!==undefined&&(!s.composites||typeof s.composites!=='object'||Array.isArray(s.composites)||Object.keys(s.composites).length))throw Error('Growing groups belong to retained legacy evidence, not the current catalog.');
  const frontier=practiceCatalogChunks(plan),all=new Map(frontier.map(c=>[c.id,c]));bindPracticePassages(plan,s,all);return {all,frontier};
 }
 const all=new Map(plan.chunks.map(c=>[c.id,c])),records=s.composites??{};
 if(typeof records!=='object'||Array.isArray(records))throw Error('Practice grouping differs; saved evidence retained.');
 const entries=Object.entries(records).sort((a,b)=>Number(a[0].split('-')[1])-Number(a[0].split('-')[0])-(Number(b[0].split('-')[1])-Number(b[0].split('-')[0])));
 for(const [id,ids]of entries){if(!Array.isArray(ids)||ids.length!==2||ids.some(i=>typeof i!=='string'))throw Error('Practice grouping differs; saved evidence retained.');const left=all.get(ids[0]),right=all.get(ids[1]);if(!left||!right)throw Error('Practice component differs; saved evidence retained.');const joined=composite(plan,left,right);if(joined.id!==id||all.has(id))throw Error('Practice grouping differs; saved evidence retained.');all.set(id,joined);}
 const parents=[...all.values()].filter(c=>c.components);
 if(parents.some((a,i)=>parents.slice(i+1).some(b=>a.firstBar<=b.lastBar&&b.firstBar<=a.lastBar&&!((a.firstBar<=b.firstBar&&a.lastBar>=b.lastBar)||(b.firstBar<=a.firstBar&&b.lastBar>=a.lastBar)))))throw Error('Practice groups overlap; saved evidence retained.');
 const children=new Set(parents.flatMap(c=>c.components!));
 const frontier=[...all.values()].filter(c=>!children.has(c.id)).sort((a,b)=>a.firstBar-b.firstBar);
 if(frontier.reduce((n,c)=>n+c.lastBar-c.firstBar+1,0)!==plan.chunks.reduce((n,c)=>n+c.lastBar-c.firstBar+1,0))throw Error('Practice coverage differs; saved evidence retained.');
 bindPracticePassages(plan,s,all);return {all,frontier};
}
export function reconcilePassages(plan:PracticePassagePlan,s:PracticeState){
 if(plan.partition==='bounded-exercises-v1')return passageHierarchy(plan,s);
 let tree=passageHierarchy(plan,s);
 for(let i=0;i<tree.frontier.length-1;i++){const a=tree.frontier[i],b=tree.frontier[i+1];if(a.lastBar+1!==b.firstBar||!componentsAttained(a,s,tree.all)||!componentsAttained(b,s,tree.all))continue;const joined=composite(plan,a,b);s.composites??={};s.composites[joined.id]=joined.components!;tree=passageHierarchy(plan,s);i=-1;}
 return tree;
}
/** Grouping eligibility is distinct from a parent's independently earned run. */
export function componentsAttained(chunk:PracticeChunk,s:PracticeState,all:ReadonlyMap<string,PracticeChunk>):boolean {
 return chunk.components?.length?chunk.components.every(id=>componentsAttained(all.get(id)!,s,all)):attainedRate(s,chunk.pattern,chunk.id)>=s.target;
}
export function passageComponents(plan:PracticePassagePlan,s:PracticeState,chunk:PracticeChunk){const {all}=passageHierarchy(plan,s),out:PracticeChunk[]=[];const visit=(c:PracticeChunk)=>{for(const id of c.components??[]){const child=all.get(id)!;out.push(child);visit(child);}};visit(chunk);return out;}
/** A new selection uses its configured default, never a previous run's working rate.
 * Connections require completed original leaves in the actual adjacent source tree. */
export function passageStartTempo(plan:PracticePassagePlan,s:PracticeState,chunk:PracticeChunk){
 const {all}=passageHierarchy(plan,s),canonical=all.get(chunk.id),leaves:PracticeChunk[]=[];
 const visit=(c:PracticeChunk)=>{if(c.components)for(const id of c.components)visit(all.get(id)!);else leaves.push(c);};
 if(canonical?.pattern===chunk.pattern)visit(canonical);
 const connection=!!canonical?.components&&leaves.length>1&&leaves.every(c=>progressFor(c,s)>=1);
 return snapPracticeSpeed(connection?s.connectionStart??s.target*.5:s.start,s.target);
}
export function nextPracticePassage(plan:PracticePassagePlan,s:PracticeState,current:PracticeChunk):PracticeChunk|undefined {
 if(plan.partition==='bounded-exercises-v1'){
  const {all,frontier}=passageHierarchy(plan,s),included=frontier.filter(c=>!s.excluded?.[c.id]),unfinished=(c:PracticeChunk)=>attainedRate(s,c.pattern,c.id)<s.target,
   ready=(c:PracticeChunk)=>(c.prerequisites??[]).every(id=>{const p=all.get(id)!;return attainedRate(s,p.pattern,p.id)>=s.target;});
  if(!s.excluded?.[current.id]&&(s.keepTempo||unfinished(current)))return current;
  const joined=included.find(c=>c.kind==='connection'&&c.originalIds?.includes(current.id)&&unfinished(c)&&ready(c));if(joined)return joined;
  return included.find(c=>unfinished(c)&&ready(c));
 }
 const {all,frontier}=reconcilePassages(plan,s);if(s.keepTempo||progressFor(current,s)<1)return current;
 const prerequisite=(c:PracticeChunk):PracticeChunk=>{for(const id of c.components??[]){const child=all.get(id)!;if(progressFor(child,s)<1)return prerequisite(child);}return c;};
 const containing=frontier.find(c=>c.firstBar<=current.firstBar&&c.lastBar>=current.lastBar&&progressFor(c,s)<1);if(containing)return prerequisite(containing);
 const next=frontier.find(c=>progressFor(c,s)<1);return next?prerequisite(next):undefined;
}
/** Section learning counts source duration once; adding joins cannot reduce this evidence. */
export function totalProgress(plan:PracticePassagePlan,s:PracticeState){const {all}=passageHierarchy(plan,s);if(plan.partition==='bounded-exercises-v1')return includedExerciseTotal([...all.values()],s.excluded,id=>{const c=all.get(id)!;return attainedRate(s,c.pattern,c.id)/s.target;}).progress??0;const weight=plan.chunks.reduce((n,c)=>n+c.weight,0);return weight?plan.chunks.reduce((n,c)=>n+c.weight*progressFor(c,s),0)/weight:0;}
/** Whole-piece attainment belongs to its full source-bound run, never a child average. */
export function wholePracticeProgress(plan:PracticePassagePlan,s:PracticeState){if(plan.partition==='bounded-exercises-v1')return 0;const {all}=reconcilePassages(plan,structuredClone(s)),first=plan.chunks[0],last=plan.chunks.at(-1),root=[...all.values()].find(c=>c.firstBar===first?.firstBar&&c.lastBar===last?.lastBar);bindPracticePassages(plan,s,all);return root?progressFor(root,s):0;}
export function passed(chunk:PracticeChunk,s:PracticeState){s.best[chunk.pattern]=Math.max(s.best[chunk.pattern]??0,s.working);if(!s.keepTempo&&s.working<s.target)s.working=snapPracticeSpeed(Math.min(s.target,s.working+s.step),s.target);}
export function resetProgress(chunk:PracticeChunk,s:PracticeState){for(const claim of equivalentPracticeClaims(s,{passage:chunk.id,pattern:chunk.pattern})){delete s.best[claim.pattern];if(s.groundwork)delete s.groundwork[claim.pattern];}}
/** Untimed source-ordered solo / adjacent-pair preparation. MIDI cannot identify physical fingers. */
export class GroundworkSession {
 readonly steps:Array<{groups:string[];events:PracticeAttack[]}>;index=0;matched=new Set<string>();failure?:PracticeAttack;complete=false;
 private readonly ornaments:Pick<PracticePlan,'ornaments'|'ticksPerBeat'>;
 /** Keys whose host had a same-key grace, by host onset, still open for its second strike. */
 private readonly regrace=new Map<number,number>();
 constructor(plan:PracticePlan,chunk:PracticeChunk){this.ornaments={ornaments:plan.ornaments,ticksPerBeat:plan.ticksPerBeat};plan=practiceClipPlan(plan,chunk,false);const windows=chunk.joins?.map(bar=>[bar,bar+1])??[[chunk.firstBar,chunk.lastBar]],sequences:string[][]=[];for(const [first,last]of windows){const groups=plan.gestures.filter(g=>g.bar>=first&&g.bar<=last).sort((a,b)=>a.start-b.start||a.id.localeCompare(b.id));groups.forEach((g,i)=>{sequences.push([g.id]);if(i)sequences.push([groups[i-1].id,g.id]);});}this.steps=sequences.map(ids=>({groups:ids,events:plan.attacks.filter(a=>a.groups.some(g=>ids.includes(g)))}));this.complete=this.steps.length===0;}
 confirm(){this.index++;this.restart();this.complete=this.index>=this.steps.length;}
 get current(){return this.steps[Math.min(this.index,this.steps.length-1)];}
 restart(){this.matched.clear();this.failure=undefined;}
 note(midi:number,velocity=127):NoteOutcome {if(this.complete)return 'inactive';const events=this.current.events;
 if(!this.failure&&this.regrace.has(midi)){const pending=events.find(a=>!this.matched.has(a.id));if(!events.some(a=>!this.matched.has(a.id)&&a.tick===pending?.tick&&a.midi===midi)){this.regrace.delete(midi);return 'ornament';}}
 if(this.failure){if(!events.filter(a=>a.tick===events[0].tick).some(a=>a.midi===midi))return isQuietStray(velocity)?'quiet-ignored':'inactive';this.restart();}else if(this.matched.size&&events[0].midi===midi&&events.find(a=>!this.matched.has(a.id))?.midi!==midi){if(isQuietStray(velocity))return 'quiet-ignored';this.restart();}const next=events.find(a=>!this.matched.has(a.id));if(!next)return 'inactive';const found=events.find(a=>a.tick===next.tick&&!this.matched.has(a.id)&&a.midi===midi);if(!found){if(practiceOrnament(this.ornaments,midi,next.tick,events.at(-1)!.tick+1))return 'ornament';if(isQuietStray(velocity))return 'quiet-ignored';this.failure=next;this.regrace.clear();return 'failed';}this.matched.add(found.id);
 for(const [key,tick]of this.regrace)if(tick!==found.tick)this.regrace.delete(key);if(practiceSameKeyGrace(this.ornaments,found))this.regrace.set(found.midi,found.tick);
 if(events.every(a=>this.matched.has(a.id)))this.confirm();return 'accepted';}
}
/** Reading repeats genuine position steps forever. Its cursor is ephemeral:
 * neither a completed cycle nor manual browsing is musical attainment. */
export class ReadingSession extends GroundworkSession {
 readonly windows:ReadonlyArray<readonly [number,number]>;readonly stepWindows:number[]=[];cycles=0;
 constructor(plan:PracticePlan,chunk:PracticeChunk){
  super(plan,chunk);this.windows=chunk.joins?.map(bar=>[bar,bar+1] as const)??[[chunk.firstBar,chunk.lastBar]];
  this.steps.splice(0);
  for(const [window,[firstBar,lastBar]]of this.windows.entries()){
   const steps=new GroundworkSession(plan,{...chunk,firstBar,lastBar,joins:undefined}).steps;
   // A held-only/rest-only boundary remains a truthful, browsable window.
   // It cannot manufacture a note to make an assessment loop advance.
   this.steps.push(...(steps.length?steps:[{groups:[],events:[]}]));
   this.stepWindows.push(...Array.from({length:Math.max(1,steps.length)},()=>window));
  }
  this.complete=false;
 }
 get window(){return this.stepWindows[this.index]??0;}
 get range(){return this.windows[this.window];}
 override confirm(){this.index++;if(this.index>=this.steps.length){this.index=0;this.cycles++;}this.restart();}
 selectWindow(window:number){if(!Number.isInteger(window)||window<0||window>=this.windows.length)return false;const index=this.stepWindows.indexOf(window);if(index===this.index)return false;this.index=index;this.restart();return true;}
 turnWindow(direction:1|-1){return this.selectWindow((this.window+direction+this.windows.length)%this.windows.length);}
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
 phase:Phase='ready';startTick:number;startMs=0;elapsedTick=0;matched=new Set<string>();started=new Set<string>();private regraced=new Set<string>();message='Prepare both hands, then Ready.';inspection=false;private beforeInspection:Phase='ready';failure?:PracticeAttack;failureReason?:string;errorMarked=false;private sounding=new MidiSoundingNotes();
 private sourceGrid:PracticePulseGrid;private attemptGrid:PracticePulseGrid;private attemptRate:number;
 get sourcePulseGrid(){return practiceCountInGrid(this.sourceGrid,(this.state as PracticeState & {countInBars?:number}).countInBars??2);}
 get pulseGrid(){return this.attemptGrid;}
 constructor(readonly plan:PracticePlan,readonly chunk:PracticeChunk,readonly state:PracticeState,public measured:boolean,sourceGrid?:PracticePulseGrid,readonly completionTick=plan.partition==='bounded-exercises-v1'||!plan.barTicks.includes(chunk.start)||!plan.barTicks.includes(chunk.end)?practiceClipCompletionTick(plan,chunk):chunk.end){if(chunk.kind==='contrast'){const owner=plan.catalog?.find(c=>c.id===chunk.id&&c.kind==='contrast'),clip=owner?.clips[chunk.clipIndex??-1];if(!owner||owner.pattern!==chunk.pattern||!clip||['start','end','firstBar','lastBar'].some(key=>clip[key as keyof ExerciseClip]!==chunk[key as keyof PracticeChunk]))throw Error('Contrast session must use one actual owning source clip.');}if(!Number.isFinite(completionTick)||completionTick<chunk.end||completionTick>plan.barTicks.at(-1)!||plan.partition==='bounded-exercises-v1'&&completionTick<practiceClipCompletionTick(plan,chunk))throw Error('Practice completion tail differs from its source obligation.');this.startTick=chunk.start;this.attemptRate=state.working;this.sourceGrid=sourceGrid??(plan.barTicks.includes(chunk.start)&&plan.barTicks.includes(chunk.end)&&completionTick===chunk.end?scorePulseGrid(plan,plan.barTicks,chunk.start,completionTick):scoreExcerptPulseGrid(plan,plan.barTicks,chunk.start,completionTick));this.attemptGrid=this.sourcePulseGrid;}
 get bpm(){return this.attemptRate;}
 get tickMs(){return scoreTickMs(this.plan,this.attemptRate);}
 get events(){return this.plan.attacks.filter(a=>a.tick>=this.startTick&&a.tick<this.chunk.end);}
 get carryIn(){return this.plan.attacks.filter(a=>a.tick<this.startTick&&a.end>this.startTick);}
 get obligations(){return [...this.carryIn,...this.events];}
 ready(now:number,carryContacts:ReadonlySet<number>=new Set(),manualCarryConfirmed=false,input:PracticeMidiSetup={},grid:PracticePulseGrid=this.sourcePulseGrid,bpm=this.state.working){if(this.carryIn.length&&(this.measured?!this.carryIn.every(a=>carryContacts.has(a.midi)):!manualCarryConfirmed))throw Error('Prepare the earlier held notes before Ready.');const admitted=practiceAttemptGrid(this.sourceGrid,grid);scoreTickMs(this.plan,bpm);this.attemptGrid=admitted;this.attemptRate=bpm;this.failure=undefined;this.failureReason=undefined;this.errorMarked=false;this.startTick=this.chunk.start;this.sounding.reset(input.sustain);for(const a of this.carryIn)this.sounding.press(a.id,a.midi,input.contacts?.get(a.midi));this.phase='countin';this.matched.clear();this.started.clear();this.regraced.clear();this.elapsedTick=this.startTick;this.startMs=now+practiceTiming(this.attemptRate,this.pulseGrid).countInMs;this.message='Count in';}
 update(now:number){if(!['countin','trial'].includes(this.phase))return;this.expireSound(now);this.elapsedTick=this.startTick+(now-this.startMs)/this.tickMs;if(now>=this.startMs&&this.phase==='countin'){this.phase='trial';this.message='';}
 if(this.measured){const missed=this.events.find(a=>!this.matched.has(a.id)&&now>this.startMs+(a.tick-this.startTick)*this.tickMs+500);if(missed){this.fail(missed.bar,'A note was missed.',missed);return;}}

 if(this.elapsedTick>=this.completionTick&&(!this.measured||this.events.every(a=>this.matched.has(a.id)))){this.phase='complete';this.sounding.reset();this.message=this.measured?'Group complete.':'Loop complete.';}
 }
 note(midi:number,now:number,velocity=127,stream?:MidiStream):NoteOutcome {if(!['trial','countin'].includes(this.phase))return 'inactive';this.expireSound(now);const adjusted=now;if(adjusted<this.startMs-500)return 'too-early';this.elapsedTick=Math.max(this.startTick,this.startTick+(now-this.startMs)/this.tickMs);const next=this.events.find(a=>!this.matched.has(a.id));
 if(!next||!this.events.some(a=>a.tick===next.tick&&a.midi===midi&&!this.matched.has(a.id))){const host=this.events.find(a=>a.midi===midi&&this.graceOpen(a,adjusted));if(host){this.regraced.add(host.id);this.sounding.press(host.id,host.midi,stream);return 'ornament';}}
 if(!next){if(isQuietStray(velocity))return 'quiet-ignored';if(adjusted<this.startMs+(this.completionTick-this.startTick)*this.tickMs){this.fail(this.chunk.lastBar,'An extra note was played.',this.events.at(-1));return 'failed';}return 'inactive';}const due=this.startMs+(next.tick-this.startTick)*this.tickMs;const chord=this.events.filter(a=>a.tick===next.tick&&!this.matched.has(a.id));const found=chord.find(a=>a.midi===midi);
 if(!found&&practiceOrnament(this.plan,midi,next.tick,this.chunk.end))return 'ornament';
 if(!found){if(isQuietStray(velocity))return 'quiet-ignored';this.fail(next.bar,'A different note was played.',next);return 'failed';}if(adjusted<due-500)return 'too-early';if(adjusted>due+500){this.fail(next.bar,'A note was missed.',next);return 'failed';}const released=this.obligations.find(a=>(this.matched.has(a.id)||a.tick<this.startTick)&&a.tick<found.tick&&a.end>found.tick&&adjusted<this.startMs+(a.end-this.startTick)*this.tickMs&&!this.sounding.has(a.id)&&!this.graceOpen(a,adjusted));if(released){this.fail(released.bar,'A held note was released early.',released);return 'failed';}this.matched.add(found.id);this.sounding.press(found.id,found.midi,stream);for(const id of found.groups){const g=this.plan.gestures.find(g=>g.id===id)!;if(found.tick===g.start)this.started.add(id);}return 'accepted'; }
 /** A played host with a same-key grace awaits its second strike until half a second after its beat;
  * releasing the key in between ends the grace, not the host. */
 private graceOpen(a:PracticeAttack,now:number){return this.matched.has(a.id)&&!this.regraced.has(a.id)&&practiceSameKeyGrace(this.plan,a)&&now<=this.startMs+(a.tick-this.startTick)*this.tickMs+500;}
 private expireSound(now:number){this.sounding.expire(id=>{const a=this.obligations.find(a=>a.id===id);return !a||now>=this.startMs+(Math.min(a.end,this.completionTick)-this.startTick)*this.tickMs;});}
 private stopped(ids:readonly string[],now:number){if(!this.measured||!['trial','countin'].includes(this.phase))return;const early=this.obligations.find(a=>ids.includes(a.id)&&!this.graceOpen(a,now)&&(a.tick<this.startTick||a.end>this.chunk.end||this.plan.attacks.some(b=>b.tick>a.tick&&b.tick<a.end))&&now<this.startMs+(Math.min(a.end,this.completionTick)-this.startTick)*this.tickMs-500);if(early){this.elapsedTick=Math.max(this.startTick,this.startTick+(now-this.startMs)/this.tickMs);this.fail(early.bar,'A held note was released early.',early);}}
 release(midi:number,now:number,stream?:MidiStream){this.expireSound(now);this.stopped(this.sounding.release(midi,stream),now);}
 sustain(event:MidiCC,now:number){if(!['trial','countin'].includes(this.phase))return;this.expireSound(now);this.stopped(this.sounding.pedal(event),now);}
 fail(_bar:number,message:string,attack?:PracticeAttack){this.sounding.reset();this.failure=attack;this.failureReason=message;this.errorMarked=true;this.phase='error';this.message='Paused';}
 clearErrorMark(midi:number){if(this.phase==='error'&&this.failure?.midi===midi)this.errorMarked=false;}
 inspect(active:boolean){this.inspection=active;}
 pause(){this.sounding.reset();if(this.phase==='error')return;this.failure=undefined;this.errorMarked=false;this.phase='paused';this.message='Paused';this.startTick=this.chunk.start;this.matched.clear();this.started.clear();this.regraced.clear();}
 visibleGroups(){if(this.phase==='error')return practiceErrorContext(this.plan,this.failure,this.chunk.start);if(!this.measured||['paused','inspection','complete'].includes(this.phase))return new Set([...this.carryIn.flatMap(a=>a.groups),...this.plan.gestures.filter(g=>g.bar>=this.chunk.firstBar&&g.bar<=this.chunk.lastBar).map(g=>g.id)]);const visible=new Set<string>(this.carryIn.filter(a=>this.phase==='ready'||this.phase==='countin'||a.end>this.elapsedTick).flatMap(a=>a.groups));for(const hand of ['LH','RH'] as const){const groups=this.plan.gestures.filter(g=>g.hand===hand&&g.start>=this.startTick&&g.start<this.chunk.end);groups.forEach((g,i)=>{if((i===0||this.started.has(groups[i-1].id))&&(this.phase==='ready'||this.phase==='countin'||g.end>this.elapsedTick+1e-7))visible.add(g.id);});}return visible;}
}
