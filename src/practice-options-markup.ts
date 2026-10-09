import {manualTempoField} from './manual-tempo-control';
import {metronomeUnit,beatUnitLabel,metronomeMark,tempoRateNumber} from './metronome-mark';
import type {ReferencePerformanceTempo} from '../vendor/iso-notation/src/model/reference-performance-tempo';
import type {PracticeState} from './practice';

/** One visible Options section for both assessment modes. Controllers retain
 * their own musical state validation and own the shared numeric editor. */
export function practiceOptionsMarkup(reference:ReferencePerformanceTempo,state:PracticeState,startingField:string,increaseField:string){
 return `<section class="options-practice" data-practice-options><h3>Practice</h3><label class="dialog-row">Starting speed <span class="practice-speed">${startingField}</span></label><label class="dialog-row">Increase per success <span class="practice-speed">${increaseField}</span></label><label class="dialog-row practice-reference practice-target">Performance target <span data-reference-tempo class="metronome-mark">${manualTempoField('target',`<input type="text" inputmode="decimal" data-practice-setting="target" data-absolute="${state.target}" value="${tempoRateNumber(state.target)}" aria-label="Target ${beatUnitLabel(reference.beat)} notes per minute">`,'target tempo',metronomeUnit(reference.beat))}</span></label><p class="dialog-row practice-reference" data-personal-goal-only ${state.personalGoal?'':'hidden'}>Score reference ${metronomeMark(reference)}</p><button data-use-reference data-personal-goal-only ${state.personalGoal?'':'hidden'}>Use score reference</button><p data-goal-error class="error" role="alert"></p><p class="help" data-tempo-help>Starting speed and each success increase are percentages of the tempo shown above.</p></section>`;
}
