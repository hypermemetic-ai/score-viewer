import {referencePerformanceClock,requireReferencePerformanceTempo,type ReferencePerformanceTempo} from '../vendor/iso-notation/src/model/reference-performance-tempo';
import type {TimeSignatureOverlay} from '../vendor/iso-notation/src/model/types';
/** Transported identically to both audio adapters. Pulse indices are relative to count origin. */
export interface PracticePulseGrid {pulsesPerBeat:number;scoreOffsetPulses:number;barStartPulses:number[];version?:2;countBarPulses?:number;countBeatPulses?:number;scoreStartPhasePulses?:number;beatStartPulses?:number[]}
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const lcm=(a:number,b:number)=>a/gcd(a,b)*b;
export function scoreTickMs(source:{referencePerformanceTempo?:ReferencePerformanceTempo;ticksPerBeat:number},bpm:number){
 if(!Number.isFinite(bpm)||bpm<5||bpm>500)throw Error('Choose a tempo from 5–500 BPM.');
 return referencePerformanceClock({...requireReferencePerformanceTempo(source),bpm},source.ticksPerBeat).secondsPerTick*1000;
}
export function validatePulseGrid(grid:PracticePulseGrid):PracticePulseGrid {
 const v2=grid?.version===2,ordered=(a:unknown):a is number[]=>Array.isArray(a)&&a.length<=100000&&a.every((p,i)=>Number.isSafeInteger(p)&&p>=0&&p<=1000000000&&(i===0||p>a[i-1]));
 if(!grid||!Number.isSafeInteger(grid.pulsesPerBeat)||grid.pulsesPerBeat<1||grid.pulsesPerBeat>96||
  !ordered(grid.barStartPulses)||!grid.barStartPulses.length||grid.barStartPulses[0]!==0||
  (v2? !Number.isSafeInteger(grid.countBarPulses)||grid.countBarPulses!<1||grid.countBarPulses!>9216||!Number.isSafeInteger(grid.countBeatPulses)||grid.countBeatPulses!<1||grid.countBarPulses!%grid.countBeatPulses! !==0||!Number.isSafeInteger(grid.scoreStartPhasePulses)||grid.scoreStartPhasePulses!<0||grid.scoreStartPhasePulses!>=grid.countBarPulses!||![0,grid.countBarPulses!+grid.scoreStartPhasePulses!].includes(grid.scoreOffsetPulses)||!ordered(grid.beatStartPulses): grid.version!==undefined||![0,2*grid.pulsesPerBeat].includes(grid.scoreOffsetPulses)||[grid.countBarPulses,grid.countBeatPulses,grid.scoreStartPhasePulses,grid.beatStartPulses].some(x=>x!==undefined)))throw Error('The score meter cannot use a finite metronome pulse grid.');
 return {...grid,barStartPulses:[...grid.barStartPulses],...(v2?{beatStartPulses:[...grid.beatStartPulses!]}:{})};
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
 const scaledBeat=denominator*reference.beat.numerator/reference.beat.denominator,scaledTicks=denominator/(4*tpq),selectedBars=bars.filter(t=>t>=start&&t<=end),points=selectedBars.map(t=>(t-start)*scaledTicks);
 if(points.some(p=>!Number.isSafeInteger(p)))throw Error('The score bar clock needs a finer rational metronome grid than supported.');
 let unit=scaledBeat;
 for(const meter of source.timeSignatures)unit=gcd(unit,denominator/meter.denominator);
 for(const p of points)unit=gcd(unit,p);
 if(scaledBeat===unit)unit/=2;
 const pulsesPerBeat=scaledBeat/unit;
 const meterAt=(tick:number)=>source.timeSignatures.findLast(m=>m.tick<=tick)!;
 const metricBeat=(m:TimeSignatureOverlay)=>denominator/m.denominator*(m.denominator>=8&&m.numerator>3&&m.numerator%3===0?3:1)/unit;
 const entry=meterAt(start),countBarPulses=denominator*entry.numerator/entry.denominator/unit,countBeatPulses=metricBeat(entry),barStartPulses=points.map(p=>p/unit),firstLength=barStartPulses[1],scoreStartPhasePulses=firstLength<countBarPulses?countBarPulses-firstLength:0,beatStartPulses:number[]=[];
 for(let i=0;i<selectedBars.length-1;i++){const meter=meterAt(selectedBars[i]),full=denominator*meter.numerator/meter.denominator/unit,beat=metricBeat(meter),length=barStartPulses[i+1]-barStartPulses[i],phase=length<full?full-length:0;for(let p=(beat-phase%beat)%beat;p<length;p+=beat){if(beatStartPulses.length>=100000)throw Error('The score meter has too many metronome beats.');beatStartPulses.push(barStartPulses[i]+p);}}
 return validatePulseGrid({version:2,pulsesPerBeat,scoreOffsetPulses:countIn?countBarPulses+scoreStartPhasePulses:0,barStartPulses,countBarPulses,countBeatPulses,scoreStartPhasePulses,beatStartPulses});
}
