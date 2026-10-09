import {requirePitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import {requirePianoCapability} from './score-capabilities';
import{MidiSoundingNotes,type MidiStream}from'./midi-sustain';
import type{MidiCC}from'./midi';
import {scoreTickMs,scorePulseGrid,type PracticePulseGrid} from './score-clock';
import {validateReferencePerformanceTempo,type ReferencePerformanceTempo} from '../vendor/iso-notation/src/model/reference-performance-tempo';
import type {ScorePackage} from './package';import {planPractice,type PracticeAttack} from './practice';import {isQuietStray} from './practice';import {practiceTiming} from './practice-timing';
/** Keep an output failure attached to the performance attempt that subscribed. */
export function performanceAudioErrorHandler(generation:number,current:()=>number,stop:()=>void,report:(message:string)=>void){return(message:string)=>{if(generation!==current())return;stop();report(message);};}
export interface PerformanceAttack extends PracticeAttack {performedOwners?:string[]}
export interface PerformancePlan {revision:string;events:PerformanceAttack[];totalTicks:number;ticksPerBeat:number;referencePerformanceTempo?:ReferencePerformanceTempo;grid:PracticePulseGrid}
export function planPerformance(p:ScorePackage):PerformancePlan {
 requirePianoCapability(p,'pianoPerformance');const source=planPractice(p),occurrences=p.score.writtenPresentation?.occurrences;if(!occurrences?.length)return {revision:source.revision,events:source.attacks,totalTicks:p.score.totalTicks,ticksPerBeat:source.ticksPerBeat,referencePerformanceTempo:source.referencePerformanceTempo,grid:scorePulseGrid(source,source.barTicks)};
 const presentation=p.score.writtenPresentation!,maps=presentation.events.notes;
 if(occurrences.some((o,i)=>!Number.isSafeInteger(o.writtenBar)||o.writtenBar<1||o.writtenBar>=source.barTicks.length||o.writtenTick!==source.barTicks[o.writtenBar-1]||o.performedBar!==i+1||o.performedTick!==(i?occurrences[i-1].performedTick+source.barTicks[occurrences[i-1].writtenBar]-occurrences[i-1].writtenTick:0))||occurrences.at(-1)!.performedTick+source.barTicks[occurrences.at(-1)!.writtenBar]-occurrences.at(-1)!.writtenTick!==presentation.performedTotalTicks)throw Error('Performance needs a complete source-linked repeat bar clock.');
 if(!Array.isArray(maps)||maps.some(e=>!Number.isSafeInteger(e.performedIndex)||e.performedIndex<0||e.performedIndex>=maps.length||!Number.isSafeInteger(e.writtenIndex))||new Set(maps.map(e=>e.performedIndex)).size!==maps.length||new Set(maps.map(e=>e.writtenIndex)).size!==p.score.notes.length)throw Error('Performance needs complete source-linked note occurrences for its repeats and endings.');
 const physical=new Map<string,PerformanceAttack>(),performedOwners=new Set<string>();
 for(const map of [...maps].sort((a,b)=>a.performedIndex-b.performedIndex)){
  const event=p.score.notes[map.writtenIndex];if(!event)throw Error('Performance note occurrence has no written source owner.');const written=requirePitchedEvent(event);
  const note=requirePitchedEvent({...structuredClone(written),...structuredClone(map.overrides)}),pitch=note.pitch.octave*12+note.pitch.pitchClass,tick=note.startTick,end=tick+note.durationTicks,original=source.attacks.find(a=>a.owners.includes(written.id))!,occurrence=occurrences.find(o=>tick>=o.performedTick&&tick<o.performedTick+source.barTicks[o.writtenBar]-o.writtenTick);
  if(pitch!==written.pitch.octave*12+written.pitch.pitchClass||note.durationTicks!==written.durationTicks)throw Error('Performance needs an explicit written owner for changed pitches or durations in its repeat endings.');
  if(!Number.isInteger(pitch)||!Number.isFinite(tick)||tick<0||!Number.isFinite(end)||end<=tick||end>presentation.performedTotalTicks||typeof note.id!=='string'||performedOwners.has(note.id)||!occurrence||occurrence.writtenBar!==original.bar+1)throw Error('Performance note occurrence has an incompatible pitch, clock or owner.');
  performedOwners.add(note.id);const id=`performed:${tick}:${pitch}`;let attack=physical.get(id);
  if(!attack){attack={...original,id,tick,end,midi:pitch+12,owners:[],groups:[],performedOwners:[]};physical.set(id,attack);}
  if(attack.owners.includes(written.id))throw Error('Performance occurrence duplicates a written source owner.');attack.end=Math.max(attack.end,end);attack.owners.push(written.id);attack.performedOwners!.push(note.id);const group=source.ownerGroup.get(written.id)!;if(!attack.groups.includes(group))attack.groups.push(group);
 }
 const events=[...physical.values()];
 return {revision:source.revision,events:events.sort((a,b)=>a.tick-b.tick||a.midi-b.midi),totalTicks:p.score.writtenPresentation!.performedTotalTicks,ticksPerBeat:source.ticksPerBeat,referencePerformanceTempo:source.referencePerformanceTempo,grid:scorePulseGrid(source,[...occurrences.map(o=>o.performedTick),p.score.writtenPresentation!.performedTotalTicks])};}
export interface PerformanceResult {bpm:number;accuracy:number;correct:number;expected:number;missed:number;extra:number;earlyReleases:number;at:string}
export interface PerformanceRecords {referenceBeat?:ReferencePerformanceTempo['beat'];version:1;revision:string;best:Record<string,PerformanceResult>}
export function accuracyLabel(accuracy:number){return accuracy===1?'100%':`${Math.min(99.9,Math.round(accuracy*1000)/10).toFixed(1)}%`;}
export function readPerformance(raw:unknown,revision:string,reference?:ReferencePerformanceTempo):PerformanceRecords {if(!raw)return {...(reference?{referenceBeat:reference.beat}:{}),version:1,revision,best:{}};const s=raw as PerformanceRecords;if(s.version!==1||s.revision!==revision||!s.best||typeof s.best!=='object'||Array.isArray(s.best)||Object.entries(s.best).some(([key,r])=>!r||!Number.isFinite(r.accuracy)||r.accuracy<0||r.accuracy>1||!Number.isFinite(r.bpm)||r.bpm<5||r.bpm>500||key!==String(r.bpm)||![r.correct,r.expected,r.missed,r.extra,r.earlyReleases].every(n=>Number.isSafeInteger(n)&&n>=0)||r.correct+r.missed!==r.expected||r.earlyReleases>r.missed||r.accuracy!==(r.expected?r.correct/(r.expected+r.extra):0)||!Number.isFinite(Date.parse(r.at))))throw Error('Performance record differs; retained unchanged.');if(reference){const beat=validateReferencePerformanceTempo({...reference,beat:s.referenceBeat??{numerator:3,denominator:8}}).beat;if(beat.numerator!==reference.beat.numerator||beat.denominator!==reference.beat.denominator)throw Error('Performance clock beat differs; retained unchanged.');}return structuredClone(s);}
export class PerformanceSession {
 phase:'countin'|'playing'|'complete'|'paused'='countin';readonly startMs:number;readonly tickMs:number;correct=new Set<string>();matched=new Set<string>();private sounding=new MidiSoundingNotes();extra=0;earlyReleases=0;elapsedTick=0;
 constructor(readonly plan:PerformancePlan,readonly bpm:number,start:number,positions:readonly MidiCC[]=[]){if(!Number.isFinite(bpm)||bpm<5||bpm>500)throw Error('Choose a rate from 5–500 per minute.');this.startMs=start+practiceTiming(bpm).countInMs;this.tickMs=scoreTickMs(plan,bpm);this.sounding.reset(positions);}
 update(now:number){if(this.phase==='paused'||this.phase==='complete')return;this.expireSound(now);this.elapsedTick=Math.max(0,(now-this.startMs)/this.tickMs);if(now>=this.startMs)this.phase='playing';if(now>=this.startMs+this.plan.totalTicks*this.tickMs+500){this.phase='complete';this.sounding.reset();}}
 note(midi:number,velocity:number,now:number,stream?:MidiStream){this.update(now);if(!['playing','countin'].includes(this.phase)||now<this.startMs-500)return;
  const found=this.plan.events.filter(a=>a.midi===midi&&!this.matched.has(a.id)&&Math.abs(now-(this.startMs+a.tick*this.tickMs))<=500).sort((a,b)=>Math.abs(now-(this.startMs+a.tick*this.tickMs))-Math.abs(now-(this.startMs+b.tick*this.tickMs)))[0];
  if(!found){if(!isQuietStray(velocity))this.extra++;return;}
  for(const previous of this.plan.events)if(this.matched.has(previous.id)&&this.correct.has(previous.id)&&previous.tick<found.tick&&previous.end>found.tick&&now<this.startMs+previous.end*this.tickMs&&!this.sounding.has(previous.id)){this.correct.delete(previous.id);this.earlyReleases++;}
  this.matched.add(found.id);this.correct.add(found.id);this.sounding.press(found.id,midi,stream);return found;
 }
 private expireSound(now:number){this.sounding.expire(id=>{const a=this.plan.events.find(a=>a.id===id);return !a||now>=this.startMs+a.end*this.tickMs;});}
 private stopped(ids:readonly string[],now:number){if(!['playing','countin'].includes(this.phase))return;for(const id of ids){const a=this.plan.events.find(a=>a.id===id);if(a&&this.plan.events.some(b=>b.tick>a.tick&&b.tick<a.end)&&now<this.startMs+a.end*this.tickMs-500&&this.correct.delete(a.id))this.earlyReleases++;}}
 release(midi:number,now:number,stream?:MidiStream){this.update(now);this.stopped(this.sounding.release(midi,stream),now);}
 sustain(event:MidiCC,now:number){this.update(now);if(!['playing','countin'].includes(this.phase))return;this.stopped(this.sounding.pedal(event),now);}
 pause(){this.phase='paused';this.sounding.reset();}
 result():PerformanceResult|undefined {if(this.phase!=='complete')return;const expected=this.plan.events.length,correct=this.correct.size;return {bpm:this.bpm,accuracy:expected?correct/(expected+this.extra):0,correct,expected,missed:expected-correct,extra:this.extra,earlyReleases:this.earlyReleases,at:new Date().toISOString()};}
}
export function recordPerformance(records:PerformanceRecords,result:PerformanceResult){const key=String(result.bpm);if(!records.best[key]||records.best[key].accuracy<result.accuracy)records.best[key]=result;}
