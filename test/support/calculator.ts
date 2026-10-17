/** Test-only calculator helpers. The viewer no longer calculates fingers or
 * hands (owner decision 2026-10-17); these build calculated editions as
 * fixtures so retained-edition behaviour stays covered. Nothing in src/
 * imports this module. */
import {prepareCalculatedHandPresentation,finalizeCalculatedHandRenderingRecipe} from '../../vendor/iso-notation/src/score-presentation';
import {scoreWithCalculationContext} from '../../vendor/iso-notation/src/model/piano-calculation-context';
import type {PianoAssignmentConstraint} from '../../vendor/iso-notation/src/model/piano-finger-assignments';
import type {PhysicalKeyboardId} from '../../vendor/iso-notation/src/model/physical-keyboard';
import {isPitchedEvent} from '../../vendor/iso-notation/src/model/musical-event';
import {hashBytes,type ScorePackage,type FingerLayer} from '../../src/package';
import {readPersonal,initialPersonal,installLayer,type PersonalState} from '../../src/state';
import {readPersonalAssignments} from '../../src/personal-assignments';
import {canonicalJson,identityHash} from '../../src/piano-preparation-identity';
import type {PerformingHandPolicy} from '../../src/piano-request-authority';
import {ANNOTATION_INK_POLICY,ensureAnnotationInkPolicyReady} from '../../src/annotation-ink-policy';
import {calculatedRecipeForRequest,calculatedHandInputs,ownerHands,receiptFor} from '../../src/calculated-hand-edition';
import {transposedArchiveSource,transpositionOwnerMap,getOriginalScorePackageBytes,
  SCORE_TRANSPOSITION_VERSION,type ScoreTransposition} from '../../src/score-transposition';

export async function prepareCalculatedEdition(p:ScorePackage,layer:FingerLayer,policy:PerformingHandPolicy,constraints:readonly PianoAssignmentConstraint[]=[]){
 await ensureAnnotationInkPolicyReady(ANNOTATION_INK_POLICY);
 const recipe=await calculatedRecipeForRequest(p),source=scoreWithCalculationContext(p.sourceScore??p.score,p.calculationContext,p.sourceSha256!),
  {inputs,operatorRequirements}=await calculatedHandInputs(p,layer,policy,recipe,constraints,ANNOTATION_INK_POLICY),
  result=await prepareCalculatedHandPresentation(source,ownerHands(layer),recipe,inputs,operatorRequirements);
 return{result,recipe:finalizeCalculatedHandRenderingRecipe(recipe,result.recipeBaseline),receipt:receiptFor(result,ANNOTATION_INK_POLICY,p.transposition?.sha256)};
}

/** The former calculated transposition envelope (retain-imported hands, one keyboard). */
export async function createScoreTransposition(p:ScorePackage,archive:Uint8Array,steps:number,keyboard:PhysicalKeyboardId){
 const original=p.transpositionOriginal??p;
 if(steps===0)throw Error('Select the retained original edition to restore 0 steps.');
 const handless=p.score.notes.filter(n=>n.hand===undefined).length;
 if(handless)throw Error(`Transposing keeps the score's own hands, and ${handless===1?'one note has':`${handless} notes have`} none, so this score can't be transposed yet.`);
 const originalBytes=getOriginalScorePackageBytes(p)??new Uint8Array(archive),
  prepared=transposedArchiveSource(original,steps),effective=prepared.source,sourceBytes=prepared.bytes,
  map=transpositionOwnerMap(p),content={version:SCORE_TRANSPOSITION_VERSION,originalArchive:'transposition/original.isoscore',
   originalArchiveSha256:await hashBytes(originalBytes),baselineLayout:original.keyboardLayout!,originalSourceSha256:original.sourceSha256!,selectedEditionSha256:await hashBytes(archive),steps,
   effectiveSourceSha256:await hashBytes(sourceBytes),handMaps:{[keyboard]:map}};
 const retained=p.transposition?.steps===steps&&canonicalJson(p.transposition.handMaps[keyboard])===canonicalJson(map)?p.transposition:undefined;
 return{envelope:retained?structuredClone(retained):{...content,sha256:await identityHash(content)} as ScoreTransposition,originalBytes,source:effective,sourceBytes};
}

export class PersonalEditionConflict extends Error {
  readonly code='personal-edition';
  constructor(message:string){super(message+' The prior edition and complete personal journal are retained.');}
}
/** The caller retains the old edition/sidecar. Only active compatible choices
 * can cross this boundary; an earlier layer never sits on new-hand pages. */
export function personalForCalculatedEdition(s:PersonalState,from:ScorePackage,to:ScorePackage):PersonalState {
  const prior=readPersonal(s,from);
  if(!from.sourceSha256||from.sourceSha256!==to.sourceSha256||from.keyboardLayout!==to.keyboardLayout)
    throw new PersonalEditionConflict('Personal choices belong to another musical source or keyboard.');
  if(!to.fingerLayer)throw new PersonalEditionConflict('The new edition has no complete calculated layer.');
  const choices=readPersonalAssignments(prior.assignments,from)?.choices??{},superseded=new Set(Object.keys(choices)),corrections=Object.values(prior.overrides).filter(c=>!c.ownerIds.some(id=>superseded.has(id)));
  for(const c of Object.values(choices)){const n=to.score.notes.find(n=>n.id===c.ownerId),a=to.fingerLayer.attacks.find(a=>a.id===to.fingerLayer!.sourceOwnerToAttack[c.ownerId]);
    if(!n||!isPitchedEvent(n)||n.pitch.octave*12+n.pitch.pitchClass!==c.guard.pitch||n.startTick!==c.guard.startTick||n.durationTicks!==c.guard.durationTicks||!a||c.hand!==undefined&&a.hand!==c.hand||c.finger!==undefined&&a.finger!==c.finger)throw new PersonalEditionConflict('A personal assignment was not retained by the explicit calculation.');
  }
  if(corrections.length&&(from.profileId!==to.profileId||from.profileSha256!==to.profileSha256))
    throw new PersonalEditionConflict('Active choices need review for the changed physical profile.');
  for(const c of corrections)for(const id of c.ownerIds){
    const before=from.score.notes.find(n=>n.id===id),after=to.score.notes.find(n=>n.id===id),
      assignment=to.fingerLayer.attacks.find(a=>a.id===to.fingerLayer!.sourceOwnerToAttack[id]);
    if(!before||!after||!isPitchedEvent(before)||!isPitchedEvent(after)||before.startTick!==after.startTick||before.durationTicks!==after.durationTicks||
      before.pitch.octave!==after.pitch.octave||before.pitch.pitchClass!==after.pitch.pitchClass||
      !assignment||assignment.id!==c.actionId||assignment.hand!==c.hand||assignment.finger!==c.replacement||
      c.proposedRow!==undefined&&assignment.row!==c.proposedRow||
      c.proposedContact!==undefined&&JSON.stringify(assignment.contact)!==JSON.stringify(c.proposedContact))
      throw new PersonalEditionConflict('An active owner choice has incompatible hand, contact or release coverage.');
  }
  try{
    if(from.manifest.revision===to.manifest.revision&&from.profileId===to.profileId&&from.profileSha256===to.profileSha256&&from.effectiveHandSha256===to.effectiveHandSha256){
      const compatible=installLayer(prior,from,to.fingerLayer);
      compatible.binding=initialPersonal(to).binding;
      return readPersonal(compatible,to);
    }
    const fresh=initialPersonal(to),overrides=Object.fromEntries(Object.entries(prior.overrides).filter(([,c])=>!c.ownerIds.some(id=>superseded.has(id))));
    if(prior.assignments){fresh.assignments=structuredClone(prior.assignments);for(const c of Object.values(fresh.assignments.choices)){const n=to.score.notes.find(n=>n.id===c.ownerId)!,a=to.fingerLayer.attacks.find(a=>a.id===to.fingerLayer!.sourceOwnerToAttack[c.ownerId])!;c.original={hand:n.hand as 'LH'|'RH',finger:a.finger};}}
    return readPersonal({...fresh,view:structuredClone(prior.view),overrides,
      ...(prior.editContactId?{editContactId:prior.editContactId}:{}),...(prior.navigation?{navigation:structuredClone(prior.navigation)}:{})},to);
  }catch(error){throw new PersonalEditionConflict((error as Error).message);}
}
