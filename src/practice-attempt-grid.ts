import {validatePulseGrid,type PracticePulseGrid} from './score-clock';

/** Repeat count origins may differ; the passage's admitted score meter cannot. */
export function practiceAttemptGrid(source:PracticePulseGrid,attempt:PracticePulseGrid):PracticePulseGrid {
 const original=validatePulseGrid(source),admitted=validatePulseGrid(attempt),factor=admitted.pulsesPerBeat/original.pulsesPerBeat;
 for(const key of ['barStartPulses','barMeterPulses','barBeatPulses','barPhasePulses','beatStartPulses'] as const){
  const expected=original[key]!,actual=admitted[key]!;
  if(!Number.isSafeInteger(factor)||factor<1||!expected||!actual||actual.length!==expected.length||actual.some((p,i)=>p!==expected[i]*factor))
   throw Error('The attempt meter differs from the selected source passage.');
 }
 return admitted;
}
