import {referencePerformanceClock,requireReferencePerformanceTempo,type ReferencePerformanceTempo} from '../vendor/iso-notation/src/model/reference-performance-tempo';
import type {TimeSignatureOverlay,BarlineOverlay} from '../vendor/iso-notation/src/model/types';
/** Transported identically to both audio adapters. Pulse indices are relative to count origin. */
export interface PracticeSourceExcerpt {startPulse:number;endPulse:number;firstBarStartPulse:number;firstBarEndPulse:number;firstBarPhasePulses:number;lastBarStartPulse:number;lastBarEndPulse:number;lastBarPhasePulses:number}
export interface PracticePulseGrid {pulsesPerBeat:number;scoreOffsetPulses:number;barStartPulses:number[];version?:2|3;countInBars?:number;countBarPulses?:number;countBeatPulses?:number;countStartPhasePulses?:number;scoreStartPhasePulses?:number;beatStartPulses?:number[];barMeterPulses?:number[];barBeatPulses?:number[];barPhasePulses?:number[];sourceExcerpt?:PracticeSourceExcerpt}
/** Only explicitly admitted meter protocols have source-bar/phase authority. */
export type MeterPulseGrid=PracticePulseGrid & {version:2|3;countBarPulses:number;countBeatPulses:number;countStartPhasePulses:number;scoreStartPhasePulses:number;beatStartPulses:number[];barMeterPulses:number[];barBeatPulses:number[];barPhasePulses:number[]};
export const isMeterPulseGrid=(grid:PracticePulseGrid|undefined):grid is MeterPulseGrid=>grid?.version===2||grid?.version===3;
interface MeterSource {referencePerformanceTempo?:ReferencePerformanceTempo;ticksPerBeat:number;timeSignatures:TimeSignatureOverlay[];barPhaseTicks?:number[];barlines?:BarlineOverlay[];writtenPresentation?:{repeats:{startBar:number}[]}}
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const lcm=(a:number,b:number)=>a/gcd(a,b)*b;
export function scoreTickMs(source:{referencePerformanceTempo?:ReferencePerformanceTempo;ticksPerBeat:number},bpm:number){
 if(!Number.isFinite(bpm)||bpm<5||bpm>500)throw Error('Choose a tempo from 5–500 BPM.');
 return referencePerformanceClock({...requireReferencePerformanceTempo(source),bpm},source.ticksPerBeat).secondsPerTick*1000;
}
export function validatePulseGrid(grid:PracticePulseGrid):PracticePulseGrid {
 const invalid=()=>{throw Error('The score meter cannot use a finite metronome pulse grid.');},integer=(p:unknown,max=1e9):p is number=>Number.isSafeInteger(p)&&Number(p)>=0&&Number(p)<=max;
 const ordered=(a:unknown):a is number[]=>Array.isArray(a)&&a.length<=100000&&a.every((p,i)=>integer(p)&&(i===0||p>a[i-1]));
 if(!grid||!integer(grid.pulsesPerBeat,96)||grid.pulsesPerBeat<1||!integer(grid.scoreOffsetPulses)||!ordered(grid.barStartPulses)||!grid.barStartPulses.length||grid.barStartPulses[0]!==0)invalid();
 const keys=['pulsesPerBeat','scoreOffsetPulses','barStartPulses'],newKeys=['version','countInBars','countBarPulses','countBeatPulses','countStartPhasePulses','scoreStartPhasePulses','beatStartPulses','barMeterPulses','barBeatPulses','barPhasePulses','sourceExcerpt'];
 if(!isMeterPulseGrid(grid)){if(grid.version!==undefined||![0,2*grid.pulsesPerBeat].includes(grid.scoreOffsetPulses)||newKeys.some(k=>(grid as any)[k]!==undefined))invalid();return {...grid,barStartPulses:[...grid.barStartPulses]};}
 if(grid.version===2?grid.countInBars!==undefined:!integer(grid.countInBars,8)||grid.countInBars!<1)invalid();
 const countBars=grid.version===3?grid.countInBars!:1;
 if(Object.keys(grid).some(k=>![...keys,...newKeys].includes(k))||grid.barStartPulses.length<2||!ordered(grid.beatStartPulses))invalid();
 const vectors=[grid.barMeterPulses,grid.barBeatPulses,grid.barPhasePulses];
 if(vectors.some(a=>!Array.isArray(a)||a.length!==grid.barStartPulses.length-1||a.some(p=>!integer(p,9216))))invalid();
 const meters=grid.barMeterPulses!,beats=grid.barBeatPulses!,phases=grid.barPhasePulses!,expected:number[]=[];
 const excerpt=grid.sourceExcerpt;
 if(grid.sourceExcerpt!==undefined&&!excerpt)invalid();
 if(excerpt){
  const fields=['startPulse','endPulse','firstBarStartPulse','firstBarEndPulse','firstBarPhasePulses','lastBarStartPulse','lastBarEndPulse','lastBarPhasePulses'];
  if(Object.keys(excerpt).sort().join()!==fields.sort().join()||Object.values(excerpt).some(p=>!integer(p)))invalid();
  const last=meters.length-1,lastStart=excerpt.startPulse+grid.barStartPulses[last];
  if(!(excerpt.firstBarStartPulse<=excerpt.startPulse&&excerpt.startPulse<excerpt.firstBarEndPulse&&excerpt.lastBarStartPulse<excerpt.endPulse&&excerpt.endPulse<=excerpt.lastBarEndPulse)||
   excerpt.endPulse-excerpt.startPulse!==grid.barStartPulses.at(-1)||
   excerpt.firstBarEndPulse-excerpt.firstBarStartPulse+excerpt.firstBarPhasePulses!==meters[0]||
   excerpt.lastBarEndPulse-excerpt.lastBarStartPulse+excerpt.lastBarPhasePulses!==meters[last]||
   phases[0]!==excerpt.firstBarPhasePulses+excerpt.startPulse-excerpt.firstBarStartPulse||
   grid.barStartPulses[1]!==Math.min(excerpt.endPulse,excerpt.firstBarEndPulse)-excerpt.startPulse||
   lastStart!==Math.max(excerpt.startPulse,excerpt.lastBarStartPulse)||
   phases[last]!==excerpt.lastBarPhasePulses+lastStart-excerpt.lastBarStartPulse)invalid();
 }
 const countPhase=grid.countStartPhasePulses;
 if(!integer(countPhase,9216)||countPhase!>=meters[0]||grid.countBarPulses!==meters[0]||grid.countBeatPulses!==beats[0]||grid.scoreStartPhasePulses!==phases[0]||![0,countBars*meters[0]+(phases[0]-countPhase!+meters[0])%meters[0]].includes(grid.scoreOffsetPulses))invalid();
 for(let i=0;i<meters.length;i++){
  const full=meters[i],beat=beats[i],phase=phases[i],length=grid.barStartPulses[i+1]-grid.barStartPulses[i];
  if(full<1||beat<1||full%beat||phase>=full||
   !(excerpt?phase+length<=full&&((i===0||i===meters.length-1)||phase===0&&length===full):[0,Math.max(0,full-length)].includes(phase)))invalid();
  const first=(beat-phase%beat)%beat,count=Math.max(0,Math.ceil((length-first)/beat));
  // Reject the total bound before any attacker-controlled span is expanded.
  if(expected.length+count>100000||expected.length+count>grid.beatStartPulses!.length)invalid();
  for(let p=first;p<length;p+=beat)expected.push(grid.barStartPulses[i]+p);
 }
 if(expected.length!==grid.beatStartPulses!.length||expected.some((p,i)=>p!==grid.beatStartPulses![i]))invalid();
 return {...grid,...(excerpt?{sourceExcerpt:{...excerpt}}:{}),barStartPulses:[...grid.barStartPulses],beatStartPulses:[...grid.beatStartPulses!],barMeterPulses:[...meters],barBeatPulses:[...beats],barPhasePulses:[...phases]};
}
/** Keep the predecessor's actual exit phase, including a complementary short ending. */
export function repeatPulseGrid(next:PracticePulseGrid,previous:PracticePulseGrid=next):PracticePulseGrid {
 next=validatePulseGrid(next);previous=validatePulseGrid(previous);if(!isMeterPulseGrid(next)||!isMeterPulseGrid(previous))throw Error('A musical repeat needs source-meter pulse grids.');
 const p=lcm(next.pulsesPerBeat,previous.pulsesPerBeat),factor=p/next.pulsesPerBeat,last=previous.barMeterPulses!.length-1,oldFull=previous.barMeterPulses![last],oldBeat=previous.barBeatPulses![last],newFull=next.countBarPulses!*factor,newBeat=next.countBeatPulses!*factor;
 const compatible=oldFull*p===newFull*previous.pulsesPerBeat&&oldBeat*p===newBeat*previous.pulsesPerBeat,exit=(previous.barPhasePulses![last]+previous.barStartPulses[last+1]-previous.barStartPulses[last])%oldFull,countStartPhasePulses=compatible?exit*p/previous.pulsesPerBeat:0;
 const scale=(a:number[])=>a.map(q=>q*factor),phase=next.scoreStartPhasePulses!*factor;
 return validatePulseGrid({...next,...(next.sourceExcerpt?{sourceExcerpt:Object.fromEntries(Object.entries(next.sourceExcerpt).map(([key,n])=>[key,n*factor])) as unknown as PracticeSourceExcerpt}:{}),pulsesPerBeat:p,scoreOffsetPulses:(next.version===3?next.countInBars!:1)*newFull+(phase-countStartPhasePulses+newFull)%newFull,countBarPulses:newFull,countBeatPulses:newBeat,countStartPhasePulses,scoreStartPhasePulses:phase,barStartPulses:scale(next.barStartPulses),beatStartPulses:scale(next.beatStartPulses!),barMeterPulses:scale(next.barMeterPulses!),barBeatPulses:scale(next.barBeatPulses!),barPhasePulses:scale(next.barPhasePulses!)});
}
/** Viewer-only phase authority; a short ending is not an upbeat merely because it is short. */
export function sourceBarPhaseTicks(source:MeterSource,bars:readonly number[]){
 const meterAt=(tick:number)=>source.timeSignatures.findLast(m=>m.tick<=tick)!;
 return bars.slice(0,-1).map((tick,i)=>{
  const meter=meterAt(tick),full=source.ticksPerBeat*4*meter.numerator/meter.denominator,length=bars[i+1]-tick;
  const followingFull=i+2<bars.length&&meterAt(bars[i+1])===meter&&bars[i+2]-bars[i+1]===full;
  const identifiedStart=i===0||source.barlines?.some(b=>b.tick===tick&&b.barNumber===0)||source.writtenPresentation?.repeats.some(r=>r.startBar===i+1);
  return length<full&&followingFull&&identifiedStart?full-length:0;
 });
}
/** Actual bar boundaries include pickups and meter changes; meter denominators select subdivisions. */
export function scorePulseGrid(source:MeterSource,bars:readonly number[],start=0,end=bars.at(-1)!,countIn=true,excerptTicks?:PracticeSourceExcerpt):PracticePulseGrid {
 const reference=requireReferencePerformanceTempo(source),tpq=source.ticksPerBeat;
 referencePerformanceClock(reference,tpq);
 if(!source.timeSignatures.length||source.timeSignatures[0].tick!==0||source.timeSignatures.some((m,i)=>!Number.isSafeInteger(m.numerator)||m.numerator<=0||!Number.isSafeInteger(m.denominator)||m.denominator<=0||!Number.isFinite(m.tick)||m.tick<0||(i>0&&m.tick<=source.timeSignatures[i-1].tick)))throw Error('This score needs an ordered meter map starting at its first bar.');
 if(bars.length<2||bars[0]!==0||bars.some((b,i)=>!Number.isFinite(b)||b<0||(i>0&&b<=bars[i-1]))||!bars.includes(start)||!bars.includes(end)||end<=start)throw Error('This score needs a complete ordered bar clock.');
 let denominator=lcm(reference.beat.denominator,4*tpq);
 for(const meter of source.timeSignatures)denominator=lcm(denominator,meter.denominator);
 if(!Number.isSafeInteger(denominator))throw Error('The score meter needs a finer metronome grid than supported.');
 const scaledBeat=denominator*reference.beat.numerator/reference.beat.denominator,scaledTicks=denominator/(4*tpq),selectedBars=bars.filter(t=>t>=start&&t<=end),points=selectedBars.map(t=>(t-start)*scaledTicks);
 if(points.some(p=>!Number.isSafeInteger(p)))throw Error('The score bar clock needs a finer rational metronome grid than supported.');
 let unit=scaledBeat;
 for(const meter of source.timeSignatures)unit=gcd(unit,denominator/meter.denominator);
 for(const p of points)unit=gcd(unit,p);
 if(excerptTicks)for(const tick of Object.values(excerptTicks))unit=gcd(unit,tick*scaledTicks);
 if(scaledBeat===unit)unit/=2;
 const pulsesPerBeat=scaledBeat/unit;
 const meterAt=(tick:number)=>source.timeSignatures.findLast(m=>m.tick<=tick)!;
 const metricBeat=(m:TimeSignatureOverlay)=>denominator/m.denominator*(m.denominator>=8&&m.numerator>3&&m.numerator%3===0?3:1)/unit;
 const phases=source.barPhaseTicks??sourceBarPhaseTicks(source,bars);
 if(phases.length!==bars.length-1||phases.some(p=>!Number.isFinite(p)||p<0))throw Error('The score needs complete source bar phases.');
 const barStartPulses=points.map(p=>p/unit),beatStartPulses:number[]=[],barMeterPulses:number[]=[],barBeatPulses:number[]=[],barPhasePulses:number[]=[];
 for(let i=0;i<selectedBars.length-1;i++){
  const meter=meterAt(selectedBars[i]),full=denominator*meter.numerator/meter.denominator/unit,beat=metricBeat(meter),length=barStartPulses[i+1]-barStartPulses[i],phase=phases[bars.indexOf(selectedBars[i])]*scaledTicks/unit,first=(beat-phase%beat)%beat,count=Math.max(0,Math.ceil((length-first)/beat));
  if(![full,beat,phase].every(Number.isSafeInteger)||beatStartPulses.length+count>100000)throw Error('The score meter has too many metronome beats.');
  barMeterPulses.push(full);barBeatPulses.push(beat);barPhasePulses.push(phase);for(let p=first;p<length;p+=beat)beatStartPulses.push(barStartPulses[i]+p);
 }
 const countBarPulses=barMeterPulses[0],countBeatPulses=barBeatPulses[0],scoreStartPhasePulses=barPhasePulses[0];
 const sourceExcerpt=excerptTicks?Object.fromEntries(Object.entries(excerptTicks).map(([key,tick])=>[key,tick*scaledTicks/unit])) as unknown as PracticeSourceExcerpt:undefined;
 return validatePulseGrid({version:2,pulsesPerBeat,scoreOffsetPulses:countIn?countBarPulses+scoreStartPhasePulses:0,barStartPulses,countBarPulses,countBeatPulses,countStartPhasePulses:0,scoreStartPhasePulses,beatStartPulses,barMeterPulses,barBeatPulses,barPhasePulses,...(sourceExcerpt?{sourceExcerpt}:{})});
}

/** Exact source sub-measures, with explicit original boundary/phase facts.
 * The final pulse position is the real clip end, never a padded source bar. */
export function scoreExcerptPulseGrid(source:MeterSource,bars:readonly number[],start:number,end:number):PracticePulseGrid {
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=end||end>bars.at(-1)!)throw Error('Excerpt clock differs from source bounds.');
 const first=bars.findLastIndex(t=>t<=start),last=bars.findLastIndex(t=>t<end),phases=source.barPhaseTicks??sourceBarPhaseTicks(source,bars);
 const augmented=[...new Set([...bars,start,end])].sort((a,b)=>a-b),barPhaseTicks=augmented.slice(0,-1).map(t=>{const bar=bars.findLastIndex(b=>b<=t);return phases[bar]+t-bars[bar];});
 return scorePulseGrid({...source,barPhaseTicks},augmented,start,end,true,{startPulse:start,endPulse:end,
  firstBarStartPulse:bars[first],firstBarEndPulse:bars[first+1],firstBarPhasePulses:phases[first],
  lastBarStartPulse:bars[last],lastBarEndPulse:bars[last+1],lastBarPhasePulses:phases[last]});
}
