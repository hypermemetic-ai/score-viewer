import {normalizeHandPlanningInput} from '../vendor/iso-notation/src/model/hand-planning-input';
import {calculateConventionalPiano,type ConventionalSolverOptions} from '../vendor/iso-notation/src/model/conventional-piano-planner';
import {conventionalFingerLayer,conventionalIdentityHash,validateConventionalFingerLayer} from '../vendor/iso-notation/src/model/conventional-finger-layer';
import {renderScorePresentation,replayRetainedHandPresentation} from '../vendor/iso-notation/src/score-presentation';
import {validateScoreRenderingRecipe,SCORE_RENDERING_ENGINE} from '../vendor/iso-notation/src/render/janko/score-rendering-recipe';
import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';

export const GENERATION_ENGINE=SCORE_RENDERING_ENGINE;
const digest=async(bytes:Uint8Array|string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',typeof bytes==='string'?new TextEncoder().encode(bytes):new Uint8Array(bytes))),b=>b.toString(16).padStart(2,'0')).join('');

/** Only source data and a validated recipe cross the worker boundary. The
 * renderer and solver are trusted application modules, never imported code. */
export async function prepareConventionalPresentation(request:{sourceBytes:Uint8Array;recipe:unknown},options:ConventionalSolverOptions={}) {
  const sourceSha256=await digest(request.sourceBytes),recipe=validateScoreRenderingRecipe(request.recipe,{sourceSha256,engineId:GENERATION_ENGINE});
  const source=JSON.parse(new TextDecoder().decode(request.sourceBytes)) as QuantizedGridScore;
  if(source.printIdentity?.piece!=='No. 14 · Kleine Studie'||source.notes?.length!==383||source.graceGroups?.length)
    throw Error('Matching generation currently supports the supplied No. 14 preparation. The existing score remains available.');
  if(options.signal?.aborted)throw Error('Calculation cancelled');
  const baseline=renderScorePresentation(source,recipe);
  if(JSON.stringify(await Promise.all(baseline.rawPages.map(digest)))!==JSON.stringify(recipe.baseline.pageSha256)||
    await digest(JSON.stringify(baseline.seats))!==recipe.baseline.seatSha256)
    throw Error('This rendering preparation does not reproduce its source presentation. Existing pages are retained.');
  const input=normalizeHandPlanningInput(source),plan=calculateConventionalPiano(input,options),
    effectiveHandSha256=await conventionalIdentityHash(plan.assignments.map(a=>[a.id,a.hand]));
  if(!plan.replay.valid||!plan.replay.actionCertificate)throw Error('The calculation has no complete current hand-action replay. Existing pages are retained.');
  const presentation=await replayRetainedHandPresentation({editionId:'schumann-no14-conventional-actions-20261007',sourceBytes:request.sourceBytes,assignments:plan.assignments,recipe}),score=presentation.score;
  const layer=conventionalFingerLayer(input,plan,{sourceHash:sourceSha256,sourceBytesSha256:sourceSha256,
    inputSha256:await conventionalIdentityHash(input),layoutSha256:await conventionalIdentityHash(plan.layout),
    profileSha256:await conventionalIdentityHash(plan.profile),requirementsSha256:await conventionalIdentityHash(plan.requirements),
    effectiveHandSha256,searchSha256:await conventionalIdentityHash({...plan.search,elapsedMs:undefined,postureCacheEntries:undefined}),
    clockSha256:await conventionalIdentityHash(plan.performanceClock),actionsSha256:await conventionalIdentityHash(plan.replay.actionCertificate),candidateId:'conventional-piano-no14-actions-v2'});
  await validateConventionalFingerLayer(layer,input,{sourceHash:sourceSha256,sourceBytesSha256:sourceSha256,
    effectiveHands:Object.fromEntries(score.notes.map(n=>[n.id,n.hand])),requireCurrent:true});
  if(options.signal?.aborted)throw Error('Calculation cancelled');
  return{score:JSON.stringify(score),seats:JSON.stringify(presentation.seats),pages:presentation.pages,layer,recipe,
    sourceSha256,semanticSha256:await digest(JSON.stringify(score)),effectiveHandSha256,allFive:presentation.allFive,
    lint:{violations:presentation.lint.violations.length,warnings:presentation.lint.warnings.length},replay:plan.replay};
}
export type PreparedConventionalPresentation=Awaited<ReturnType<typeof prepareConventionalPresentation>>;
