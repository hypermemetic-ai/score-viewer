import type {QuantizedGridScore,DynamicMark} from '../vendor/iso-notation/src/model/types';
import {isPitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import type {Beat} from './score-tempo';

/* A playable performance of a score, derived from its notes: no MIDI is stored or
 * needed. Times are score ticks in performed order (repeats and endings unfolded);
 * a tempo turns them into seconds. */

export interface PerformanceNote {tick:number;end:number;/** Key release, held by the pedal. */release:number;midi:number;velocity:number}
export interface CountInClick {tick:number;accent:boolean}
/** A later tempo in the score, as a factor of the opening tempo, from a performed tick on. */
export interface TempoChange {tick:number;factor:number}
export interface PerformanceSchedule {
 notes:PerformanceNote[];totalTicks:number;ticksPerQuarter:number;
 beat:Beat;beatTicks:number;barTicks:number;
 /** Score bar starts in performed ticks, ending with the total. */
 bars:number[];
 /** Each performed bar as the reader numbers it (one-based written bar) and its pass through a repeat. */
 barLabels:{bar:number;pass:number}[];
 /** Number of written bars, as the reader counts them. */
 writtenBars:number;
 /** Later numeric tempos; the opening tempo is factor 1. Empty when the score keeps one tempo. */
 tempoChanges:TempoChange[];
 /** Metronome clicks before the music, at negative ticks on the score's beat grid. */
 countIn:CountInClick[];
}
type PerformanceScore=Pick<QuantizedGridScore,'notes'|'ticksPerBeat'|'totalTicks'|'timeSignatures'|'dynamics'|'pedals'>&Partial<Pick<QuantizedGridScore,'writtenPresentation'|'sourceBarTicks'|'graceGroups'|'tempos'>>;

const LEVELS:Partial<Record<DynamicMark,number>>={ppp:30,pp:42,p:54,mp:66,mf:78,f:92,ff:106,fff:118};
const STRESSES:Partial<Record<DynamicMark,number>>={sf:104,sfz:108,fp:96};
const DEFAULT_LEVEL=LEVELS.mf!;

/** A performed pass through a written bar; `writtenBar` is one-based, as the reader numbers bars. */
interface Occurrence {performedTick:number;writtenTick:number;length:number;writtenBar:number;pass:number}
function occurrencesOf(score:PerformanceScore):Occurrence[]|undefined {
 const p=score.writtenPresentation,bars=score.sourceBarTicks;
 if(!p?.occurrences?.length||!bars)return;
 return p.occurrences.map(o=>({performedTick:o.performedTick,writtenTick:o.writtenTick,length:(bars[o.writtenBar]??score.totalTicks)-o.writtenTick,writtenBar:o.writtenBar,pass:o.pass}));
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
 // A key released exactly as the pedal changes is not caught by the new pedal.
 return end=>{const span=spans.find(([a,b])=>end>a&&end<b);return span?span[1]:end;};
}
/* Grace notes are nonmetrical: each sounds briefly just before its host, a 32nd of
 * a quarter apiece, a little softer than the host. */
function graceNotes(score:PerformanceScore,occurrences:Occurrence[]|undefined,level:(tick:number)=>number):Sounding[] {
 const length=score.ticksPerBeat/8,out:Sounding[]=[];
 for(const group of score.graceGroups??[]){
  const members=group.members.filter(m=>m.pitch&&Number.isFinite(m.pitch.octave)&&Number.isFinite(m.pitch.pitchClass));if(!members.length)continue;
  for(const visit of group.occurrences){
   const pass=occurrences?.find(o=>o.writtenBar===visit.sourceBar+1&&o.pass===visit.pass);
   if(occurrences&&!pass)continue;
   const host=pass?pass.performedTick+visit.tick-pass.writtenTick:visit.tick;
   members.forEach((m,i)=>{const tick=host-(members.length-i)*length;out.push({tick,end:tick+length,midi:m.pitch!.octave*12+m.pitch!.pitchClass+12,velocity:level(host)-8});});
  }
 }
 return out;
}
const UNIT_QUARTERS:Record<string,number>={breve:8,whole:4,half:2,quarter:1,eighth:.5,'16th':.25,'32nd':.125};
/** A tempo mark as quarter notes per minute: a printed unit when there is one, else MusicXML's quarter rate. */
function quarterRate(t:NonNullable<PerformanceScore['tempos']>[number]):number|undefined {
 const unit=t.sourceUnit,base=unit&&UNIT_QUARTERS[unit.type];
 const rate=base&&Number.isFinite(unit.perMinute)&&unit.perMinute>0?unit.perMinute*base*(2-Math.pow(.5,unit.dots||0)):t.bpm;
 return Number.isFinite(rate)&&rate>0?rate:undefined;
}
/** Later numeric tempos relative to the opening one, through every pass of a repeat. */
function tempoChanges(score:PerformanceScore,occurrences:Occurrence[]|undefined,opening:number):TempoChange[] {
 const marks=(score.tempos??[]).flatMap(t=>{const rate=quarterRate(t);return rate?[{tick:t.tick,rate}]:[];}).sort((a,b)=>a.tick-b.tick);
 const first=marks[0];if(!first||first.tick>=opening||marks.every(m=>m.rate===first.rate))return [];
 const written=marks.map(m=>({tick:m.tick,factor:m.rate/first.rate})),factorAt=(tick:number)=>{let f=1;for(const m of written){if(m.tick>tick)break;f=m.factor;}return f;};
 const changes:TempoChange[]=[];
 if(!occurrences)changes.push(...written.filter(m=>m.tick>0));
 else for(const o of occurrences){
  changes.push({tick:o.performedTick,factor:factorAt(o.writtenTick)});
  for(const m of written)if(m.tick>o.writtenTick&&m.tick<o.writtenTick+o.length)changes.push({tick:o.performedTick+m.tick-o.writtenTick,factor:m.factor});
 }
 return changes.sort((a,b)=>a.tick-b.tick).filter((c,i,all)=>c.factor!==(i?all[i-1].factor:1));
}
/** Ticks as if the whole piece kept its opening tempo: later tempos stretch or shrink them. */
export function evenTicks(schedule:Pick<PerformanceSchedule,'tempoChanges'>,tick:number):number {
 if(tick<=0)return tick;
 let even=0,from=0,factor=1;
 for(const c of schedule.tempoChanges){if(c.tick>=tick)break;even+=(c.tick-from)/factor;from=c.tick;factor=c.factor;}
 return even+(tick-from)/factor;
}
/** The performed tick reached after a number of even ticks; the inverse of evenTicks. */
export function tickAtEven(schedule:Pick<PerformanceSchedule,'tempoChanges'>,even:number):number {
 if(even<=0)return even;
 let from=0,at=0,factor=1;
 for(const c of schedule.tempoChanges){const next=at+(c.tick-from)/factor;if(next>=even)break;at=next;from=c.tick;factor=c.factor;}
 return from+(even-at)*factor;
}
const clampVelocity=(v:number)=>Math.max(1,Math.min(127,Math.round(v)));

export function buildPerformanceSchedule(score:PerformanceScore,beat:Beat):PerformanceSchedule {
 const occurrences=occurrencesOf(score),{notes:raw,total}=soundingNotes(score);
 const level=loudness(score,occurrences),release=pedalRelease(score,occurrences),latest=total+score.ticksPerBeat*8;
 const played=joinTies(raw).map(n=>{
  const length=n.end-n.tick,end=n.articulation==='staccato'?n.tick+Math.max(1,length*.5):n.end;
  const stressed=n.articulation==='accent'||n.articulation==='marcato'?14:0;
  const velocity=clampVelocity((n.velocity??level(n.tick))+stressed);
  return {tick:n.tick,end,release:Math.min(Math.max(end,release(end)),latest),midi:n.midi,velocity};
 });
 // Graces join after ties, so a grace never breaks a held tie of the same pitch.
 const graces=graceNotes(score,occurrences,level).map(n=>({tick:n.tick,end:n.end,release:Math.min(Math.max(n.end,release(n.end)),latest),midi:n.midi,velocity:clampVelocity(n.velocity!)}));
 const notes=[...played,...graces].filter(n=>n.midi>=0&&n.midi<=127).sort((a,b)=>a.tick-b.tick||a.midi-b.midi);
 const meter=score.timeSignatures[0]??{numerator:4,denominator:4},tpq=score.ticksPerBeat;
 const barTicks=tpq*4*meter.numerator/meter.denominator,beatTicks=tpq*4*beat.numerator/beat.denominator;
 const bars=performedBars(score,total,barTicks),barLabels=performedBarLabels(score,bars.length-1);
 // A pickup's downbeat is the first barline. The count-in starts on an accented "1"
 // in whole bars, at least four beats, and runs until the pickup, which lands in place.
 const first=bars[1]??barTicks,downbeat=first<barTicks?first:0,countIn:CountInClick[]=[];
 let countBars=1;while(Math.ceil((countBars*barTicks-downbeat)/beatTicks-1e-9)<4)countBars++;
 for(let t=downbeat-countBars*barTicks;t<-1e-9;t+=beatTicks){
  const phase=((t-downbeat)%barTicks+barTicks)%barTicks;countIn.push({tick:t,accent:Math.abs(phase)<1e-9||Math.abs(phase-barTicks)<1e-9});
 }
 const writtenBars=score.writtenPresentation?.writtenBars??Math.max(1,bars.length-1);
 return {notes,totalTicks:total,ticksPerQuarter:tpq,beat,beatTicks,barTicks,bars,barLabels,writtenBars,tempoChanges:tempoChanges(score,occurrences,downbeat?first+1:first),countIn};
}
function performedBars(score:PerformanceScore,total:number,barTicks:number):number[] {
 const occ=score.writtenPresentation?.occurrences;
 if(occ?.length)return [...occ.map(o=>o.performedTick),total];
 const bars=score.sourceBarTicks;if(bars&&bars.length>1)return [...bars];
 const out:number[]=[];for(let t=0;t<total;t+=barTicks)out.push(t);out.push(total);return out;
}
function performedBarLabels(score:PerformanceScore,count:number):{bar:number;pass:number}[] {
 const occ=score.writtenPresentation?.occurrences;
 if(occ?.length)return occ.map(o=>({bar:o.writtenBar,pass:o.pass}));
 return Array.from({length:count},(_,i)=>({bar:i+1,pass:1}));
}
/** How long the whole performance lasts at a tempo counted on the schedule's beat, through its later tempos. */
export function performanceSeconds(schedule:Pick<PerformanceSchedule,'totalTicks'|'beatTicks'|'tempoChanges'>,bpm:number):number {
 return evenTicks(schedule,schedule.totalTicks)/schedule.beatTicks*60/bpm;
}
/** One-based performed measure for a performed tick. */
export function measureAt(schedule:Pick<PerformanceSchedule,'bars'>,tick:number):number {
 const bars=schedule.bars;let i=0;while(i<bars.length-2&&tick>=bars[i+1])i++;return i+1;
}
/** The written bar a performed tick is in, as the reader numbers it, and its pass through a repeat. */
export function writtenBarAt(schedule:Pick<PerformanceSchedule,'bars'|'barLabels'>,tick:number):{bar:number;pass:number} {
 return schedule.barLabels[measureAt(schedule,tick)-1]??{bar:1,pass:1};
}
