import {prepareCalculatedHandPresentation,validateHandPresentationAgainstSource,createHandPresentationIdentity,
 createCalculatedHandRenderingRecipe,finalizeCalculatedHandRenderingRecipe,presentationSha256,
 CALCULATED_HAND_SCORE_RENDERING_ENGINE,type ScoreRenderingRecipe,type HandPresentationIdentityInputs,
 type GuardedOperatorHandRequirement,type PresentationAnnotationGeometry,type PresentationSourceCoverage,
 type SourceStatementInventory,type OwnerHand} from '../vendor/iso-notation/src/score-presentation';
import {scoreWithCalculationContext} from '../vendor/iso-notation/src/model/piano-calculation-context';
import type {PianoAssignmentConstraint} from '../vendor/iso-notation/src/model/piano-finger-assignments';
import type {ScorePackage,FingerLayer} from './package';
import {canonicalJson,canonicalOwnerAssignments,identityHash,authorityIdentity} from './piano-preparation-identity';
import {pianoRequestAuthority,type PerformingHandPolicy} from './piano-request-authority';
import {replayRetainedRecipeBaseline} from './piano-engraving-recipe';
import {annotationPositions} from './fingering-presentation';

export interface CalculatedHandReceipt {
 version:'viewer-calculated-hand-edition-v1';
 outputIdentity:{pageSha256:string[];seatSha256:string};
 sourceInventory:SourceStatementInventory;sourceCoverage:PresentationSourceCoverage;
 annotationGeometry:PresentationAnnotationGeometry;
}
const same=(a:unknown,b:unknown)=>canonicalJson(a)===canonicalJson(b);
export const ownerHands=(layer:FingerLayer):OwnerHand[]=>layer.attacks.flatMap(a=>a.owners.map(o=>({id:o.id,pitch:a.pitch,
 startTick:a.startTick,durationTicks:o.durationTicks,hand:a.hand}))).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
export const calculatedRecipeIdentity=(recipe:ScoreRenderingRecipe)=>presentationSha256({version:recipe.version,engineId:recipe.engineId,
 sourceSha256:recipe.sourceSha256,options:recipe.options,tokens:recipe.tokens});
const calculatorEvidence=(layer:FingerLayer)=>({version:layer.version,plannerVersion:layer.plannerVersion,inputSha256:layer.inputSha256,search:layer.search});
export async function calculatedHandInputs(p:ScorePackage,layer:FingerLayer,policy:PerformingHandPolicy,recipe:ScoreRenderingRecipe,
 constraints:readonly PianoAssignmentConstraint[]):Promise<{inputs:HandPresentationIdentityInputs;operatorRequirements:GuardedOperatorHandRequirement[]}>{
 const source=scoreWithCalculationContext(p.sourceScore??p.score,p.calculationContext,p.sourceSha256!),operatorRequirements:GuardedOperatorHandRequirement[]=[];
 for(const c of constraints)if(c.provenance.kind==='operator-choice'&&c.hand!==undefined)
  operatorRequirements.push({version:'operator-hand-requirement-v1',ownerId:c.ownerId,hand:c.hand,guard:{...c.guard},
   authorityId:'viewer-operator-choice:'+await identityHash(c)});
 return{inputs:{sourceSha256:p.sourceSha256!,assignmentSha256:await identityHash(canonicalOwnerAssignments(layer)),
  handPolicyRevision:'viewer-performing-hand-policy-v1:'+policy,constraintSha256:await authorityIdentity(constraints),keyboardId:p.keyboardLayout!,
  profileSha256:layer.profileSha256 as string,calculationContextSha256:await identityHash({referencePerformanceTempo:source.referencePerformanceTempo,calculationContext:p.calculationContext}),
  calculatorEvidenceSha256:await identityHash(calculatorEvidence(layer)),recipeSha256:await calculatedRecipeIdentity(recipe)},operatorRequirements};
}
const receiptFor=(r:Awaited<ReturnType<typeof prepareCalculatedHandPresentation>>):CalculatedHandReceipt=>({version:'viewer-calculated-hand-edition-v1',
 outputIdentity:r.outputIdentity,sourceInventory:r.sourceInventory,sourceCoverage:r.sourceCoverage,annotationGeometry:r.annotationGeometry!});

/** Only reviewed factories produce new recipes. An old raw baseline is actually
 * replayed before adopting new rules; a derived baseline was cold-replayed on import. */
export async function calculatedRecipeForRequest(p:ScorePackage):Promise<ScoreRenderingRecipe>{
 if(!p.renderingRecipe)throw Error('Calculated hands require a matching native rendering preparation.');
 const source=scoreWithCalculationContext(p.sourceScore??p.score,p.calculationContext,p.sourceSha256!),
  prior=p.renderingRecipe.engineId===CALCULATED_HAND_SCORE_RENDERING_ENGINE?p.renderingRecipe:
   await replayRetainedRecipeBaseline(source,p.renderingRecipe,p.sourceSha256!);
 return createCalculatedHandRenderingRecipe(p.sourceSha256!,prior.options,prior.tokens);
}
export async function prepareCalculatedEdition(p:ScorePackage,layer:FingerLayer,policy:PerformingHandPolicy,constraints:readonly PianoAssignmentConstraint[]){
 const recipe=await calculatedRecipeForRequest(p),source=scoreWithCalculationContext(p.sourceScore??p.score,p.calculationContext,p.sourceSha256!),
  {inputs,operatorRequirements}=await calculatedHandInputs(p,layer,policy,recipe,constraints),
  result=await prepareCalculatedHandPresentation(source,ownerHands(layer),recipe,inputs,operatorRequirements);
 return{result,recipe:finalizeCalculatedHandRenderingRecipe(recipe,result.recipeBaseline),receipt:receiptFor(result)};
}

/** Cold admission is an actual source-owned engine replay with no optimizer.
 * The saved ledger or its hashes cannot substitute for source/paint audit. */
export async function admitCalculatedHandEdition(p:ScorePackage,raw:unknown,seatBytes:Uint8Array):Promise<CalculatedHandReceipt>{
 if(!p.fingerLayer||p.preparationIdentity?.version!=='viewer-piano-preparation-v2'||!p.renderingRecipe||p.renderingRecipe.engineId!==CALCULATED_HAND_SCORE_RENDERING_ENGINE||
  p.manifest.engineVersion!==CALCULATED_HAND_SCORE_RENDERING_ENGINE)throw Error('Calculated edition lacks its complete layer, preparation or recipe identity.');
 const source=scoreWithCalculationContext(p.sourceScore??p.score,p.calculationContext,p.sourceSha256!),policy=p.preparationIdentity.handPolicy,
  constraints=pianoRequestAuthority(p,source,p.keyboardLayout!,p.fingerLayer,undefined,policy),recipe=p.renderingRecipe as ScoreRenderingRecipe,
  {inputs,operatorRequirements}=await calculatedHandInputs(p,p.fingerLayer,policy,recipe,constraints),owners=ownerHands(p.fingerLayer),
  identity=await createHandPresentationIdentity(inputs,owners);
 await validateHandPresentationAgainstSource(source,p.score,identity,operatorRequirements);
 const replay=await prepareCalculatedHandPresentation(source,owners,recipe,inputs,operatorRequirements),expected=receiptFor(replay);
 if(!same(raw,expected))throw Error('Calculated edition receipt differs from original-source actual paint, coverage or annotation geometry.');
 if(!same(p.score,replay.score)||p.pages.length!==replay.pages.length||p.pages.some((page,i)=>page!==replay.pages[i])||
  new TextDecoder('utf-8',{fatal:true}).decode(seatBytes)!==JSON.stringify(replay.seats)||!same(p.seats,replay.seats))
  throw Error('Calculated edition pages or seats differ from its saved complete hand-map replay.');
 if(!same(recipe.baseline,replay.recipeBaseline))throw Error('Calculated recipe raw-page baseline differs from its independent replay.');
 // Carrier geometry is only the owned slice. Admission separately inventories
 // every actual SVG primitive and reserves all 1–5 annotation outlines.
 annotationPositions({...p,annotationGeometry:expected.annotationGeometry});
 return structuredClone(expected);
}
