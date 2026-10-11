import {isMeterPulseGrid,validatePulseGrid,type PracticePulseGrid} from './score-clock';
import {practiceTiming} from './practice-timing';

/** The same owned rate and grid cross every asynchronous Ready boundary. */
export function capturePracticeAttempt(bpm:number,source:PracticePulseGrid){
 if(!Number.isFinite(bpm)||bpm<5||bpm>500)throw Error('Choose a tempo from 5–500 BPM.');
 const grid=validatePulseGrid(source);
 for(const key of ['barStartPulses','barMeterPulses','barBeatPulses','barPhasePulses','beatStartPulses'] as const)if(grid[key])Object.freeze(grid[key]);
 if(grid.sourceExcerpt)Object.freeze(grid.sourceExcerpt);Object.freeze(grid);
 return Object.freeze({bpm,grid,countInMs:practiceTiming(bpm,grid).countInMs});
}

/** Count duration is attempt configuration; score clocks remain literal. */
export function practiceCountInGrid(source:PracticePulseGrid,countInBars=2):PracticePulseGrid {
 const grid=validatePulseGrid(source);
 if(!isMeterPulseGrid(grid)||!Number.isSafeInteger(countInBars)||countInBars<1||countInBars>8)
  throw Error('Choose a count-in from 1–8 whole bars.');
 const bar=grid.countBarPulses!,phase=(grid.scoreStartPhasePulses!-grid.countStartPhasePulses!+bar)%bar;
 return validatePulseGrid({...grid,version:3,countInBars,scoreOffsetPulses:countInBars*bar+phase});
}

/** Repeat count origins may differ; the passage's admitted score meter cannot. */
export function practiceAttemptGrid(source:PracticePulseGrid,attempt:PracticePulseGrid):PracticePulseGrid {
 const original=validatePulseGrid(source),admitted=validatePulseGrid(attempt),factor=admitted.pulsesPerBeat/original.pulsesPerBeat;
 if(!!original.sourceExcerpt!==!!admitted.sourceExcerpt||original.sourceExcerpt&&Object.entries(original.sourceExcerpt).some(([key,p])=>admitted.sourceExcerpt?.[key as keyof typeof original.sourceExcerpt]!==p*factor))throw Error('The attempt excerpt differs from its source bounds.');
 for(const key of ['barStartPulses','barMeterPulses','barBeatPulses','barPhasePulses','beatStartPulses'] as const){
  const expected=original[key]!,actual=admitted[key]!;
  if(!Number.isSafeInteger(factor)||factor<1||!expected||!actual||actual.length!==expected.length||actual.some((p,i)=>p!==expected[i]*factor))
   throw Error('The attempt meter differs from the selected source passage.');
 }
 return admitted;
}
