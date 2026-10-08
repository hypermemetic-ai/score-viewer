import {referencePerformanceClock,requireReferencePerformanceTempo,type ReferencePerformanceTempo} from '../vendor/iso-notation/src/model/reference-performance-tempo';
import type {TimeSignatureOverlay} from '../vendor/iso-notation/src/model/types';
/** Transported identically to both audio adapters. Pulse indices are relative to count origin. */
export interface PracticePulseGrid {pulsesPerBeat:number;scoreOffsetPulses:number;barStartPulses:number[]}
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const lcm=(a:number,b:number)=>a/gcd(a,b)*b;
export function scoreTickMs(source:{referencePerformanceTempo?:ReferencePerformanceTempo;ticksPerBeat:number},bpm:number){
 if(!Number.isFinite(bpm)||bpm<5||bpm>500)throw Error('Choose a tempo from 5–500 BPM.');
 return referencePerformanceClock({...requireReferencePerformanceTempo(source),bpm},source.ticksPerBeat).secondsPerTick*1000;
}
export function validatePulseGrid(grid:PracticePulseGrid):PracticePulseGrid {
 if(!grid||!Number.isSafeInteger(grid.pulsesPerBeat)||grid.pulsesPerBeat<1||grid.pulsesPerBeat>96||
  ![0,2*grid.pulsesPerBeat].includes(grid.scoreOffsetPulses)||!Array.isArray(grid.barStartPulses)||!grid.barStartPulses.length||grid.barStartPulses.length>100000||grid.barStartPulses[0]!==0||
  grid.barStartPulses.some((p,i)=>!Number.isSafeInteger(p)||p<0||p>1000000000||(i>0&&p<=grid.barStartPulses[i-1])))throw Error('The score meter cannot use a finite metronome pulse grid.');
 return {...grid,barStartPulses:[...grid.barStartPulses]};
}
/** Actual bar boundaries include pickups and meter changes; meter denominators select subdivisions. */
export function scorePulseGrid(source:{referencePerformanceTempo?:ReferencePerformanceTempo;ticksPerBeat:number;timeSignatures:TimeSignatureOverlay[]},bars:readonly number[],start=0,end=bars.at(-1)!,countIn=true):PracticePulseGrid {
 const reference=requireReferencePerformanceTempo(source),tpq=source.ticksPerBeat;
 referencePerformanceClock(reference,tpq);
 if(!source.timeSignatures.length||source.timeSignatures[0].tick!==0||source.timeSignatures.some((m,i)=>!Number.isSafeInteger(m.numerator)||m.numerator<=0||!Number.isSafeInteger(m.denominator)||m.denominator<=0||!Number.isFinite(m.tick)||m.tick<0||(i>0&&m.tick<=source.timeSignatures[i-1].tick)))throw Error('This score needs an ordered meter map starting at its first bar.');
 if(bars.length<2||bars[0]!==0||bars.some((b,i)=>!Number.isFinite(b)||b<0||(i>0&&b<=bars[i-1]))||!bars.includes(start)||!bars.includes(end)||end<=start)throw Error('This score needs a complete ordered bar clock.');
 let denominator=lcm(reference.beat.denominator,4*tpq);
 for(const meter of source.timeSignatures)denominator=lcm(denominator,meter.denominator);
 if(!Number.isSafeInteger(denominator))throw Error('The score meter needs a finer metronome grid than supported.');
 const scaledBeat=denominator*reference.beat.numerator/reference.beat.denominator,scaledTicks=denominator/(4*tpq),points=bars.filter(t=>t>=start&&t<=end).map(t=>(t-start)*scaledTicks);
 if(points.some(p=>!Number.isSafeInteger(p)))throw Error('The score bar clock needs a finer rational metronome grid than supported.');
 let unit=scaledBeat;
 for(const meter of source.timeSignatures)unit=gcd(unit,denominator/meter.denominator);
 for(const p of points)unit=gcd(unit,p);
 if(scaledBeat===unit)unit/=2;
 const pulsesPerBeat=scaledBeat/unit;
 return validatePulseGrid({pulsesPerBeat,scoreOffsetPulses:countIn?2*pulsesPerBeat:0,barStartPulses:points.map(p=>p/unit)});
}
