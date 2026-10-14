import {
 analyzeFingerTravel,ordinaryReleaseMs,rrFrontThirdContact,unusualTravel,
 createTravelCorpus,readTravelCorpus,DEFAULT_UNUSUAL_TRAVEL_SETTINGS,
 type PerformedTravelContact,type TravelContact,type TravelFinger,type TravelHand,
 type FingerTravelAnalysis,type FingerTravelTransition,type TravelCorpus,type TravelCorpusObservation,type UnusualTravelResult,
} from '@hypermemetic-ai/fingering-calculator';
import {referencePerformanceClock} from '../vendor/iso-notation/src/model/reference-performance-tempo';
import {isPitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import type {ScorePackage,FingerLayer} from './package';
import {DEFAULT_FINGERING_ADVICE_SETTINGS,readFingeringAdviceSettings,type FingeringAdviceSettings} from './fingering-advice-settings';

export interface AdviceAssignment {id:string;hand?:TravelHand;finger?:number}
export interface AdvicePerformedAttack {
 id:string;ownerIds:readonly string[];midiPitch:number;onsetTick?:number;durationTicks?:number;
 /** Only independently admitted physical aliases; never inferred from pitch equality. */
 physicalAliasId?:string;physicalHoldUntilTick?:number;contact?:TravelContact;
}
export interface AdviceReferenceClock {millisecondsAt(tick:number):number|undefined}
export interface AdviceRevision {scoreId:string;sourceRevision:string;assignmentRevision:string;settingsRevision:string}
const validFinger=(v:unknown):v is TravelFinger=>Number.isInteger(v)&&Number(v)>=1&&Number(v)<=5;
const finiteNonnegative=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0;

/** Keeps incomplete attacks as lane barriers. It never substitutes page coordinates or practice speed. */
export function buildAdviceContacts(attacks:readonly AdvicePerformedAttack[],assignments:readonly AdviceAssignment[],clock?:AdviceReferenceClock):PerformedTravelContact[] {
 const byOwner=new Map(assignments.map(a=>[a.id,a]));
 return attacks.map(a=>{
  const owners=a.ownerIds.map(id=>byOwner.get(id)),hand=owners[0]?.hand,finger=owners[0]?.finger;
  const sameHand=!!owners.length&&(hand==='LH'||hand==='RH')&&owners.every(o=>o?.hand===hand);
  const sameFinger=!!owners.length&&validFinger(finger)&&owners.every(o=>o?.finger===finger);
  const event:PerformedTravelContact={id:a.id,ownerIds:[...a.ownerIds],...(a.physicalAliasId?{physicalAliasId:a.physicalAliasId}:{}),
   ...(sameHand?{hand}:{}),...(sameFinger?{finger}:{}),...(a.contact?{contact:a.contact}:{})};
  if(!clock||!finiteNonnegative(a.onsetTick)||!finiteNonnegative(a.durationTicks))return event;
  const onsetMs=clock.millisecondsAt(a.onsetTick),endMs=clock.millisecondsAt(a.onsetTick+a.durationTicks),
   holdMs=a.physicalHoldUntilTick===undefined?onsetMs:clock.millisecondsAt(a.physicalHoldUntilTick);
  // Preserve a known onset when its duration is unavailable, so simultaneous unknowns also block their lanes.
  if(finiteNonnegative(onsetMs))event.onsetMs=onsetMs;
  if(!finiteNonnegative(onsetMs)||!finiteNonnegative(endMs)||endMs<onsetMs||!finiteNonnegative(holdMs))return event;
  try{Object.assign(event,ordinaryReleaseMs(onsetMs,endMs-onsetMs,holdMs));}catch{/* Overflow is unassessed, never zero travel. */}
  return event;
 });
}

export interface ScoreAdviceOptions {
 layer?:FingerLayer;
 /** Geometry must carry actual mm units, immutable profile identity and contact convention. */
 contactForOwner?:(ownerId:string,midiPitch:number)=>TravelContact|undefined;
 /** Performed ticks; explicit physical hold authority, independent of sustain pedal. */
 physicalHoldUntilTick?:(ownerId:string,performedId:string)=>number|undefined;
 instrumentMidiRange?:readonly [number,number];
}
/** Complete source/repeat projection, preserving independent duplicate owners and tied sounding durations. */
export function scoreAdviceContacts(p:ScorePackage,assignments:readonly AdviceAssignment[],options:ScoreAdviceOptions={}):PerformedTravelContact[] {
 const score=p.score,boundaries=score.sourceBarTicks??[0,...score.barlines.filter(b=>b.tick!==0).map(b=>b.tick)],layer=options.layer??p.fingerLayer,
  byOwner=new Map(layer?.attacks.flatMap(a=>a.owners.map(o=>[o.id,a] as const))??[]);
 if(boundaries[0]!==0||boundaries.at(-1)!==score.totalTicks||boundaries.some((t,i)=>!Number.isFinite(t)||i>0&&t<=boundaries[i-1]))throw Error('Advice requires complete source measure boundaries');
 // Seats are independently admitted physical contact ownership. Different heads at equal pitch are not enough.
 const alias=new Map<string,string>();
 for(const seat of p.seats)for(const id of seat.ownerIds){const old=alias.get(id);if(old&&old!==seat.contactId)throw Error('Advice source has conflicting contact ownership');alias.set(id,seat.contactId);}
 const geometry=(id:string,midi:number)=>{
  const range=options.instrumentMidiRange??[21,108];if(midi<range[0]||midi>range[1])return;
  if(options.contactForOwner)return options.contactForOwner(id,midi);
  const a=byOwner.get(id);
  if(p.keyboardLayout!=='janko-four-row'||layer?.physicalRowOrder!=='rr-even-far-last-v1'||a?.row===undefined)return;
  const result=rrFrontThirdContact(midi,a.row);return result.available?result.contact:undefined;
 };
 const performed:AdvicePerformedAttack[]=[];
 const append=(index:number,id:string,tick:number,duration:number)=>{
  const n=score.notes[index];if(!n||!isPitchedEvent(n))return;
  const midiPitch=n.pitch.octave*12+n.pitch.pitchClass+12,hold=options.physicalHoldUntilTick?.(n.id,id);
  performed.push({id,ownerIds:[n.id],midiPitch,onsetTick:tick,durationTicks:duration,
   ...(alias.has(n.id)?{physicalAliasId:JSON.stringify([alias.get(n.id),tick])}:{}),
   ...(hold===undefined?{}:{physicalHoldUntilTick:hold}),contact:geometry(n.id,midiPitch)});
 };
 const written=score.writtenPresentation;
 if(written){
  // Follow the admitted performed map, including endings. Re-expanding repeat shorthand loses their actual order.
  if(!written.occurrences.length||written.occurrences.some((o,i)=>!Number.isSafeInteger(o.writtenBar)||o.writtenBar<1||o.writtenBar>=boundaries.length||o.writtenTick!==boundaries[o.writtenBar-1]||o.performedBar!==i+1||o.performedTick!==(i?written.occurrences[i-1].performedTick+boundaries[written.occurrences[i-1].writtenBar]-written.occurrences[i-1].writtenTick:0))||
   written.occurrences.at(-1)!.performedTick+boundaries[written.occurrences.at(-1)!.writtenBar]-written.occurrences.at(-1)!.writtenTick!==written.performedTotalTicks)throw Error('Advice requires a complete performed repeat clock');
  const maps=written.events.notes;
  if(!Array.isArray(maps)||new Set(maps.map(m=>m.performedIndex)).size!==maps.length||
   maps.some(m=>!Number.isSafeInteger(m.performedIndex)||m.performedIndex<0||m.performedIndex>=maps.length||!Number.isSafeInteger(m.writtenIndex)||!score.notes[m.writtenIndex]))throw Error('Advice requires complete performed owner mappings');
  const visited=new Map<string,number>();
  for(const m of maps){
   const n=score.notes[m.writtenIndex];if(!isPitchedEvent(n))continue;
   const event={...n,...m.overrides};
   if(!isPitchedEvent(event)||event.pitch.octave!==n.pitch.octave||event.pitch.pitchClass!==n.pitch.pitchClass||event.durationTicks!==n.durationTicks)throw Error('Advice repeat changes a written pitch or duration');
   const occurrence=written.occurrences.find(o=>event.startTick>=o.performedTick&&event.startTick<o.performedTick+boundaries[o.writtenBar]-o.writtenTick);
   if(!occurrence||event.startTick-occurrence.performedTick!==n.startTick-occurrence.writtenTick||n.startTick<occurrence.writtenTick||n.startTick>=boundaries[occurrence.writtenBar]||!finiteNonnegative(event.durationTicks)||event.startTick+event.durationTicks>written.performedTotalTicks)throw Error('Advice repeat has an incompatible source clock');
   const key=JSON.stringify([occurrence.performedBar,n.id]);visited.set(key,(visited.get(key)??0)+1);
   append(m.writtenIndex,`performed:${m.performedIndex}:${n.id}`,event.startTick,event.durationTicks);
  }
  for(const o of written.occurrences)for(const n of score.notes)if(isPitchedEvent(n)&&n.startTick>=o.writtenTick&&n.startTick<boundaries[o.writtenBar]&&visited.get(JSON.stringify([o.performedBar,n.id]))!==1)throw Error('Advice repeat omits or duplicates a source contact');
 }else score.notes.forEach((n,i)=>append(i,`written:${n.id}`,n.startTick,n.durationTicks));
 performed.sort((a,b)=>a.onsetTick!-b.onsetTick!||a.id.localeCompare(b.id));
 // Alias owners with different sounding durations share the longest physical contact. Unknown hold data is not invented.
 const groups=new Map<string,AdvicePerformedAttack[]>();for(const a of performed)if(a.physicalAliasId){const g=groups.get(a.physicalAliasId)??[];g.push(a);groups.set(a.physicalAliasId,g);}
 for(const g of groups.values())if(g.length>1){const duration=Math.max(...g.map(a=>a.durationTicks!)),hold=g.flatMap(a=>a.physicalHoldUntilTick===undefined?[]:[a.physicalHoldUntilTick]);for(const a of g){a.durationTicks=duration;if(hold.length)a.physicalHoldUntilTick=Math.max(...hold);}}
 let clock:AdviceReferenceClock|undefined;
 try{const ms=referencePerformanceClock(score.referencePerformanceTempo,score.ticksPerBeat).secondsPerTick*1000;clock={millisecondsAt:tick=>tick*ms};}catch{/* Missing reference is a coverage gap, not a fallback to practice tempo. */}
 return buildAdviceContacts(performed,assignments,clock);
}

export interface AdviceEvidence {lineageId:string;evidence:TravelCorpusObservation['evidence']}
export interface AdviceContext {playerId:string;scoreId:string;revision:number;evidenceByOwner:ReadonlyMap<string,AdviceEvidence>}
export interface EditorAdviceWarning {transition:FingerTravelTransition;reasons:('fast'|'no-available-time'|'unusual')[];unusual?:UnusualTravelResult}
export interface EditorAdviceResult {analysis:FingerTravelAnalysis;warnings:EditorAdviceWarning[];observations:TravelCorpusObservation[]}
function observationFor(t:FingerTravelTransition,context:AdviceContext):TravelCorpusObservation|undefined {
 if(t.speedMps===null)return;
 const target=t.targetOwnerIds.map(id=>context.evidenceByOwner.get(id)),source=t.sourceOwnerIds.map(id=>context.evidenceByOwner.get(id)),first=target[0];
 const coherent=!!first&&target.every(e=>e?.lineageId===first.lineageId&&e.evidence===first.evidence),knownSource=source.every(e=>e&&e.evidence!=='unreviewed-calculated');
 return{playerId:context.playerId,occurrenceId:context.scoreId,transitionId:JSON.stringify([t.sourceIds,t.targetIds]),revision:context.revision,
  lineageId:coherent?first.lineageId:`unreviewed:${context.scoreId}:${JSON.stringify(t.targetOwnerIds)}`,
  evidence:coherent&&knownSource?first.evidence:'unreviewed-calculated',hand:t.hand,finger:t.finger,contact:t.source,displacementMm:t.displacementMm,speedMps:t.speedMps};
}
function assessTransitions(transitions:readonly FingerTravelTransition[],context:AdviceContext,corpus:TravelCorpus,settings:FingeringAdviceSettings){
 const warnings:EditorAdviceWarning[]=[],observations:TravelCorpusObservation[]=[];
 for(const transition of transitions){
  const observation=observationFor(transition,context),unusual=observation?unusualTravel(corpus,observation,{...DEFAULT_UNUSUAL_TRAVEL_SETTINGS,enabled:settings.unusualEnabled}):undefined;
  if(observation)observations.push(observation);
  const reasons:EditorAdviceWarning['reasons']=transition.warnings.filter(reason=>settings.absoluteEnabled||reason!=='no-available-time');
  if(unusual?.unusual)reasons.push('unusual');if(reasons.length)warnings.push({transition,reasons,...(unusual?{unusual}:{})});
 }
 return{warnings,observations};
}
export function analyzeEditorAdvice(contacts:readonly PerformedTravelContact[],context:AdviceContext,corpus:TravelCorpus=createTravelCorpus(),settings:FingeringAdviceSettings=DEFAULT_FINGERING_ADVICE_SETTINGS):EditorAdviceResult {
 const valid=readFingeringAdviceSettings(settings),analysis=analyzeFingerTravel(contacts,{fastEnabled:valid.absoluteEnabled,fastThresholdMps:valid.absoluteThresholdCmPerSecond/100});
 return{analysis,...assessTransitions(analysis.transitions,context,corpus,valid)};
}
/** Bounded comparison batches yield to key handling and stop promptly after an edit or navigation. */
export async function analyzeEditorAdviceAsync(contacts:readonly PerformedTravelContact[],context:AdviceContext,corpus:TravelCorpus,settings:FingeringAdviceSettings,signal:AbortSignal):Promise<EditorAdviceResult>{
 signal.throwIfAborted();const valid=readFingeringAdviceSettings(settings),analysis=analyzeFingerTravel(contacts,{fastEnabled:valid.absoluteEnabled,fastThresholdMps:valid.absoluteThresholdCmPerSecond/100}),result:EditorAdviceResult={analysis,warnings:[],observations:[]};
 for(let i=0;i<analysis.transitions.length;i+=16){await new Promise<void>(resolve=>setTimeout(resolve,0));signal.throwIfAborted();const batch=assessTransitions(analysis.transitions.slice(i,i+16),context,corpus,valid);result.warnings.push(...batch.warnings);result.observations.push(...batch.observations);}
 signal.throwIfAborted();return result;
}

export interface AdviceCorpusState {version:1;corpus:TravelCorpus;scoreRevisions:Record<string,number>}
export const createAdviceCorpusState=():AdviceCorpusState=>({version:1,corpus:createTravelCorpus(),scoreRevisions:{}});
export function readAdviceCorpusState(raw:unknown):AdviceCorpusState {
 if(raw===undefined||raw===null)return createAdviceCorpusState();
 const q=raw as AdviceCorpusState;if(q.version!==1||!q.scoreRevisions||typeof q.scoreRevisions!=='object'||Array.isArray(q.scoreRevisions)||Object.values(q.scoreRevisions).some(r=>!Number.isSafeInteger(r)||r<0))throw Error('Invalid advice corpus revision history');
 const corpus=readTravelCorpus(q.corpus);
 for(const o of corpus.observations)if(q.scoreRevisions[JSON.stringify([o.playerId,o.occurrenceId])]!==o.revision)throw Error('Advice corpus observation revision differs');
 return{version:1,corpus,scoreRevisions:{...q.scoreRevisions}};
}
/** Replace the complete score slice, including transitions invalidated by an edit. Caller commits with its memory transaction. */
export function replaceAdviceCorpusScore(state:AdviceCorpusState,playerId:string,scoreId:string,revision:number,observations:readonly TravelCorpusObservation[]):AdviceCorpusState {
 const key=JSON.stringify([playerId,scoreId]),previous=state.scoreRevisions[key];
 if(!Number.isSafeInteger(revision)||revision<0||previous!==undefined&&revision<=previous)throw Error('Stale advice corpus revision');
 if(observations.some(o=>o.playerId!==playerId||o.occurrenceId!==scoreId||o.revision!==revision))throw Error('Advice corpus slice identity differs');
 const corpus=readTravelCorpus({version:'finger-travel-corpus-v1',observations:[...state.corpus.observations.filter(o=>o.playerId!==playerId||o.occurrenceId!==scoreId),...observations]});
 return{version:1,corpus,scoreRevisions:{...state.scoreRevisions,[key]:revision}};
}

/** Cancelling immediately clears visible advice; late work cannot repopulate a different score or revision. */
export class EditorAdviceRunner {
 private generation=0;private controller?:AbortController;
 constructor(private readonly publish:(result:EditorAdviceResult|undefined,revision?:AdviceRevision)=>void){}
 cancel(){this.generation++;this.controller?.abort();this.controller=undefined;this.publish(undefined);}
 async run(revision:AdviceRevision,work:(signal:AbortSignal)=>Promise<EditorAdviceResult>):Promise<boolean>{
  this.cancel();const generation=this.generation,controller=new AbortController();this.controller=controller;
  const captured={...revision};try{const result=await work(controller.signal);if(controller.signal.aborted||generation!==this.generation)return false;this.publish(result,captured);return true;}
  catch(error){if(controller.signal.aborted||generation!==this.generation)return false;throw error;}
 }
}
