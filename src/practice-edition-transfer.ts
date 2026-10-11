import type {ScorePackage} from './package';
import type {PersonalState} from './state';
import {transferPracticeEdition as transfer,type PracticeState,type PracticeEditionEvidence} from './practice';
export type {PracticeEditionEvidence} from './practice';
export interface EditionPracticeState extends PracticeState {editionEvidence:PracticeEditionEvidence}
/** Compatibility import for the standalone editing integration. The current
 * planner owns catalog migration and the complete source-bound transfer. */
export function transferPracticeEdition(from:ScorePackage,raw:unknown,to:ScorePackage,toPersonal?:PersonalState):EditionPracticeState {
 return transfer(from,raw,to,toPersonal) as EditionPracticeState;
}
