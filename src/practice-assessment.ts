import {scoreCapabilities} from './score-capabilities';
import type {ScorePackage} from './package';

export type PracticeAssessment='manual'|'piano-midi';

/** A globally connected input is not authority to assess another instrument. */
export function practiceAssessment(p:ScorePackage,pianoConnected:boolean):PracticeAssessment {
 const capability=scoreCapabilities(p);
 if(capability.pianoPractice)return pianoConnected?'piano-midi':'manual';
 if(capability.manualPractice)return 'manual';
 throw Error('This score needs complete musical timing and notation ownership before practice.');
}
