import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';
import {renderScorePresentationAsync} from '../vendor/iso-notation/src/score-presentation';
import {capturedReadingExecution,checkReadingExecution,type ReadingExecution} from './reading-execution';
import {renderScorePresentation} from '../vendor/iso-notation/src/render/janko/score-presentation';
import {APPROVED_SCORE_RENDERING_ENGINE,validateScoreRenderingRecipe,type PassiveScoreRenderingRecipe} from '../vendor/iso-notation/src/render/janko/score-rendering-recipe';
import {approvedProductionJankoOptions} from '../vendor/iso-notation/src/render/janko/approved-production';
import {hashBytes} from './package';

/** Reproduce the caller's retained source baseline before choosing the known
 * production contract. A new calculated-hand contract will replace this only
 * with its exact reviewed ISO interface and strong admission. */
export async function compatiblePianoRecipe(source:QuantizedGridScore,recipe:PassiveScoreRenderingRecipe,sourceSha256:string){
  const checked=await replayRetainedRecipeBaseline(source,recipe,sourceSha256);
  if(checked.engineId===APPROVED_SCORE_RENDERING_ENGINE)return checked;
  const next=validateScoreRenderingRecipe({...checked,engineId:APPROVED_SCORE_RENDERING_ENGINE,options:approvedProductionJankoOptions(checked.options)}),
    rendered=renderScorePresentation(source,next);
  return validateScoreRenderingRecipe({...next,baseline:{pageSha256:await Promise.all(rendered.rawPages.map(hashBytes)),
    seatSha256:await hashBytes(JSON.stringify(rendered.seats))}});
}
/** Literal retained replay is its own gate. A new source-owned factory must
 * not require an intermediate old-policy engraving of a transferred gesture. */
export async function replayRetainedRecipeBaseline(source:QuantizedGridScore,recipe:PassiveScoreRenderingRecipe,sourceSha256:string,input?:ReadingExecution){
  const execution=input?capturedReadingExecution(input):undefined;checkReadingExecution(execution);
  const checked=validateScoreRenderingRecipe(recipe,{sourceSha256}),captured=structuredClone(source),
    baseline=execution?await renderScorePresentationAsync(captured,checked,execution):renderScorePresentation(captured,checked);
  checkReadingExecution(execution);
  if(JSON.stringify(await Promise.all(baseline.rawPages.map(hashBytes)))!==JSON.stringify(checked.baseline.pageSha256)||
    await hashBytes(JSON.stringify(baseline.seats))!==checked.baseline.seatSha256)
    throw Error('This rendering preparation does not reproduce its source pages. The current pages are retained.');
  checkReadingExecution(execution);return checked;
}
