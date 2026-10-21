import type {QuantizedGridScore,DynamicMark} from '../vendor/iso-notation/src/model/types';
import {isPitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import type {Beat} from './score-tempo';

/* A playable performance of a score, derived from its notes: no MIDI is stored or
 * needed. Times are score ticks in performed order (repeats and endings unfolded);
 * a tempo turns them into seconds. */

export interface PerformanceNote {tick:number;end:number;/** Key release, held by the pedal. */release:number;midi:number;velocity:number}
export interface CountInClick {tick:number;accent:boolean}
export interface PerformanceSchedule {
 notes:PerformanceNote[];totalTicks:number;ticksPerQuarter:number;
 beat:Beat;beatTicks:number;barTicks:number;
 /** Score bar starts in performed ticks, ending with the total. */
 bars:number[];
 /** Metronome clicks before the music, at negative ticks on the score's beat grid. */
 countIn:CountInClick[];
}
type PerformanceScore=Pick<QuantizedGridScore,'notes'|'ticksPerBeat'|'totalTicks'|'timeSignatures'|'dynamics'|'pedals'>&Partial<Pick<QuantizedGridScore,'writtenPresentation'|'sourceBarTicks'>>;

const LEVELS:Partial<Record<DynamicMark,number>>={ppp:30,pp:42,p:54,mp:66,mf:78,f:92,ff:106,fff:118};
const STRESSES:Partial<Record<DynamicMark,number>>={sf:104,sfz:108,fp:96};
const DEFAULT_LEVEL=LEVELS.mf!;

interface Occurrence {performedTick:number;writtenTick:number;length:number}
function occurrencesOf(score:PerformanceScore):Occurrence[]|undefined {
 const p=score.writtenPresentation,bars=score.sourceBarTicks;
 if(!p?.occurrences?.length||!bars)return;
 return p.occurrences.map(o=>({performedTick:o.performedTick,writtenTick:o.writtenTick,length:(bars[o.writtenBar]??score.totalTicks)-o.writtenTick}));
}
/** Every performed tick of a written tick: once per pass through its bar. */
function performedTicks(tick:number,occurrences?:Occurrence[]):number[] {
 if(!occurrences)return [tick];
 return occurrences.filter(o=>tick>=o.writtenTick&&tick<o.writtenTick+o.length).map(o=>o.performedTick+tick-o.writtenTick);
}
interface Sounding {tick:number;end:number;midi:number;velocity?:number;articulation?:string;tieStart?:boolean;tieEnd?:boolean}
function soundingNotes(score:PerformanceScore):{notes:Sounding[];total:number} {
 const toSounding=(n:QuantizedGridScore['notes'][number]):Sounding|undefined=>{
  // Imported events say they are pitched; older raw score files carry only the pitch.
  const legacy=(n as {eventKind?:unknown}).eventKind===undefined&&!!(n as {pitch?:unknown}).pitch;
  if(!(isPitchedEvent(n)||legacy)||!Number.isFinite(n.startTick)||!(n.durationTicks>0))return;
  const pitch=(n as {pitch:{octave:number;pitchClass:number}}).pitch;if(!Number.isFinite(pitch.octave)||!Number.isFinite(pitch.pitchClass))return;
  return {tick:n.startTick,end:n.startTick+n.durationTicks,midi:pitch.octave*12+pitch.pitchClass+12,velocity:n.velocity,articulation:n.articulation,tieStart:n.tieStart,tieEnd:n.tieEnd};
 };
 const p=score.writtenPresentation,maps=p?.events?.notes;
 if(p&&Array.isArray(maps)&&maps.length&&p.occurrences?.length){
  const notes=[...maps].sort((a,b)=>a.performedIndex-b.performedIndex).flatMap(map=>{const written=score.notes[map.writtenIndex];if(!written)return [];const n=toSounding({...written,...map.overrides} as typeof written);return n?[n]:[];});
  return {notes,total:p.performedTotalTicks};
 }
 return {notes:score.notes.flatMap(n=>{const s=toSounding(n);return s?[s]:[];}),total:score.totalTicks};
}
/** A tied continuation sounds as one held note. */
function joinTies(notes:Sounding[]):Sounding[] {
 const sorted=[...notes].sort((a,b)=>a.tick-b.tick||a.midi-b.midi),open=new Map<number,Sounding>(),out:Sounding[]=[];
 for(const n of sorted){
  const held=open.get(n.midi);
  if(n.tieEnd&&held&&held.end===n.tick){held.end=n.end;if(!n.tieStart)open.delete(n.midi);continue;}
  const copy={...n};out.push(copy);if(n.tieStart)open.set(n.midi,copy);else open.delete(n.midi);
 }
 return out;
}
/** Loudness at each tick from the score's dynamic marks and hairpins. */
function loudness(score:PerformanceScore,occurrences?:Occurrence[]):(tick:number)=>number {
 const marks=score.dynamics.flatMap(d=>performedTicks(d.tick,occurrences).map(tick=>({...d,tick}))).sort((a,b)=>a.tick-b.tick);
 const levels=marks.filter(d=>LEVELS[d.mark as DynamicMark]!==undefined||d.mark==='fp');
 const levelAt=(tick:number)=>{let level=DEFAULT_LEVEL;for(const d of levels){if(d.tick>tick)break;level=d.mark==='fp'?LEVELS.p!:LEVELS[d.mark as DynamicMark]!;}return level;};
 const hairpins=marks.filter(d=>(d.mark==='crescendo'||d.mark==='decrescendo')&&(d.durationTicks??0)>0);
 return tick=>{
  const stress=marks.find(d=>d.tick===tick&&STRESSES[d.mark as DynamicMark]!==undefined);
  if(stress)return STRESSES[stress.mark as DynamicMark]!;
  let level=levelAt(tick);
  for(const h of hairpins){
   const end=h.tick+h.durationTicks!;if(tick<=h.tick||tick>=end+1)continue;
   const from=levelAt(h.tick),next=levels.find(d=>d.tick>=end&&d.tick<=end+score.ticksPerBeat*4),to=next?LEVELS[next.mark as DynamicMark]??from:from+(h.mark==='crescendo'?14:-14);
   level=from+(to-from)*Math.min(1,(tick-h.tick)/(end-h.tick));
  }
  return level;
 };
}
/** Pedal-down spans; a change releases and catches again at the same tick. */
function pedalRelease(score:PerformanceScore,occurrences?:Occurrence[]):(end:number)=>number {
 const events=score.pedals.filter(p=>p.type!=='una-corda').flatMap(p=>performedTicks(p.tick,occurrences).map(tick=>({tick,type:p.type}))).sort((a,b)=>a.tick-b.tick);
 const spans:[number,number][]=[];let down:number|undefined;
 for(const e of events){
  if(e.type==='sustain-down'){down??=e.tick;}
  else if(e.type==='sustain-up'){if(down!==undefined)spans.push([down,e.tick]);down=undefined;}
  else {if(down!==undefined)spans.push([down,e.tick]);down=e.tick;}
 }
 if(down!==undefined)spans.push([down,Infinity]);
 return end=>{const span=spans.find(([a,b])=>end>=a&&end<b);return span?span[1]:end;};
}
const clampVelocity=(v:number)=>Math.max(1,Math.min(127,Math.round(v)));

export function buildPerformanceSchedule(score:PerformanceScore,beat:Beat):PerformanceSchedule {
 const occurrences=occurrencesOf(score),{notes:raw,total}=soundingNotes(score);
 const level=loudness(score,occurrences),release=pedalRelease(score,occurrences);
 const notes=joinTies(raw).map(n=>{
  const length=n.end-n.tick,end=n.articulation==='staccato'?n.tick+Math.max(1,length*.5):n.end;
  const stressed=n.articulation==='accent'||n.articulation==='marcato'?14:0;
  const velocity=clampVelocity((n.velocity??level(n.tick))+stressed);
  return {tick:n.tick,end,release:Math.min(Math.max(end,release(end)),total+score.ticksPerBeat*8),midi:n.midi,velocity};
 }).filter(n=>n.midi>=0&&n.midi<=127).sort((a,b)=>a.tick-b.tick||a.midi-b.midi);
 const meter=score.timeSignatures[0]??{numerator:4,denominator:4},tpq=score.ticksPerBeat;
 const barTicks=tpq*4*meter.numerator/meter.denominator,beatTicks=tpq*4*beat.numerator/beat.denominator;
 const bars=performedBars(score,total,barTicks);
 // A pickup's downbeat is the first barline; the count-in grid keeps its place.
 const first=bars[1]??barTicks,downbeat=first<barTicks?first:0;
 const beatsPerBar=Math.max(1,Math.round(barTicks/beatTicks)),countBars=Math.ceil(4/beatsPerBar),countIn:CountInClick[]=[];
 for(let t=downbeat-Math.ceil((downbeat+countBars*barTicks)/beatTicks)*beatTicks;t<0;t+=beatTicks){
  if(t<-countBars*barTicks-1e-9)continue;
  const phase=((t-downbeat)%barTicks+barTicks)%barTicks;countIn.push({tick:t,accent:Math.abs(phase)<1e-9||Math.abs(phase-barTicks)<1e-9});
 }
 return {notes,totalTicks:total,ticksPerQuarter:tpq,beat,beatTicks,barTicks,bars,countIn};
}
function performedBars(score:PerformanceScore,total:number,barTicks:number):number[] {
 const occ=score.writtenPresentation?.occurrences;
 if(occ?.length)return [...occ.map(o=>o.performedTick),total];
 const bars=score.sourceBarTicks;if(bars&&bars.length>1)return [...bars];
 const out:number[]=[];for(let t=0;t<total;t+=barTicks)out.push(t);out.push(total);return out;
}
/** How long the whole performance lasts at a tempo counted on the schedule's beat. */
export function performanceSeconds(schedule:Pick<PerformanceSchedule,'totalTicks'|'beatTicks'>,bpm:number):number {
 return schedule.totalTicks/schedule.beatTicks*60/bpm;
}
/** One-based measure for a performed tick. */
export function measureAt(schedule:Pick<PerformanceSchedule,'bars'>,tick:number):number {
 const bars=schedule.bars;let i=0;while(i<bars.length-2&&tick>=bars[i+1])i++;return i+1;
}
