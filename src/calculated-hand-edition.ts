import {prepareCalculatedHandPresentation,validateHandPresentationAgainstSource,createHandPresentationIdentity,
 createCalculatedHandRenderingRecipe,presentationSha256,
 CALCULATED_HAND_SCORE_RENDERING_ENGINE,type ScoreRenderingRecipe,type HandPresentationIdentityInputs,
 type GuardedOperatorHandRequirement,type PresentationAnnotationGeometry,type PresentationSourceCoverage,
 type SourceStatementInventory,type OwnerHand,type PresentationWrittenHead} from '../vendor/iso-notation/src/score-presentation';
import {scoreWithCalculationContext} from '../vendor/iso-notation/src/model/piano-calculation-context';
import type {PianoAssignmentConstraint} from '../vendor/iso-notation/src/model/piano-finger-assignments';
import type {ScorePackage,FingerLayer} from './package';
import {canonicalJson,canonicalOwnerAssignments,identityHash,authorityIdentity} from './piano-preparation-identity';
import {pianoRequestAuthority,type PerformingHandPolicy} from './piano-request-authority';
import {annotationPositions} from './fingering-presentation';

import {validateAnnotationInkPolicy,ensureAnnotationInkPolicyReady,type ViewerAnnotationInkPolicy} from './annotation-ink-policy';

import {capturedReadingExecution,checkReadingExecution,type ReadingExecution} from './reading-execution';


interface CalculatedHandEvidence {
 outputIdentity:{pageSha256:string[];seatSha256:string};
 sourceInventory:SourceStatementInventory;sourceCoverage:PresentationSourceCoverage;
 annotationGeometry:PresentationAnnotationGeometry;
}
export type CalculatedHandReceipt=CalculatedHandEvidence&({version:'viewer-calculated-hand-edition-v1'}|
 {version:'viewer-calculated-hand-edition-v2';annotationInkPolicy:ViewerAnnotationInkPolicy}|
 {version:'viewer-calculated-hand-edition-v3';annotationInkPolicy:ViewerAnnotationInkPolicy;transpositionSha256:string});
const same=(a:unknown,b:unknown)=>canonicalJson(a)===canonicalJson(b);
export const ownerHands=(layer:FingerLayer):OwnerHand[]=>layer.attacks.flatMap(a=>a.owners.map(o=>({id:o.id,pitch:a.pitch,
 startTick:a.startTick,durationTicks:o.durationTicks,hand:a.hand}))).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
export const calculatedRecipeIdentity=(recipe:ScoreRenderingRecipe)=>presentationSha256({version:recipe.version,engineId:recipe.engineId,
 sourceSha256:recipe.sourceSha256,options:recipe.options,tokens:recipe.tokens});
const calculatorEvidence=(layer:FingerLayer)=>({version:layer.version,plannerVersion:layer.plannerVersion,inputSha256:layer.inputSha256,search:layer.search});
export async function calculatedHandInputs(p:ScorePackage,layer:FingerLayer,policy:PerformingHandPolicy,recipe:ScoreRenderingRecipe,
 constraints:readonly PianoAssignmentConstraint[],inkPolicy?:ViewerAnnotationInkPolicy):Promise<{inputs:HandPresentationIdentityInputs;operatorRequirements:GuardedOperatorHandRequirement[]}>{
 const source=scoreWithCalculationContext(p.sourceScore??p.score,p.calculationContext,p.sourceSha256!),operatorRequirements:GuardedOperatorHandRequirement[]=[];
 for(const c of constraints)if(['operator-choice','personal-choice'].includes(c.provenance.kind)&&c.hand!==undefined)
  operatorRequirements.push({version:'operator-hand-requirement-v1',ownerId:c.ownerId,hand:c.hand,guard:{...c.guard},
   authorityId:'viewer-operator-choice:'+await identityHash(c),...((c.provenance.kind as string)==='personal-choice'?{authorityClass:'personal-choice' as const}:{})});
 return{inputs:{sourceSha256:p.sourceSha256!,assignmentSha256:await identityHash(canonicalOwnerAssignments(layer)),
  handPolicyRevision:'viewer-performing-hand-policy-v1:'+policy,constraintSha256:await authorityIdentity(constraints),keyboardId:p.keyboardLayout!,
  profileSha256:layer.profileSha256 as string,calculationContextSha256:await identityHash({referencePerformanceTempo:source.referencePerformanceTempo,calculationContext:p.calculationContext,...(inkPolicy?{annotationInkPolicy:inkPolicy}:{ }),...(p.transposition?{transposition:p.transposition}:{})}),
  calculatorEvidenceSha256:await identityHash(calculatorEvidence(layer)),recipeSha256:await calculatedRecipeIdentity(recipe)},operatorRequirements};
}
/** Receipt of one calculated-hand replay; admission compares a saved edition's receipt with it. */
export const receiptFor=(r:Awaited<ReturnType<typeof prepareCalculatedHandPresentation>>,inkPolicy?:ViewerAnnotationInkPolicy,transpositionSha256?:string):CalculatedHandReceipt=>({
 ...(transpositionSha256?{version:'viewer-calculated-hand-edition-v3' as const,annotationInkPolicy:inkPolicy!,transpositionSha256}:inkPolicy?{version:'viewer-calculated-hand-edition-v2' as const,annotationInkPolicy:inkPolicy}:{version:'viewer-calculated-hand-edition-v1' as const}),
 outputIdentity:r.outputIdentity,sourceInventory:r.sourceInventory,sourceCoverage:r.sourceCoverage,annotationGeometry:r.annotationGeometry!});

/** The hand-projection recipe for re-engraving the player's hand choices with
 * the current engine. It adopts the edition's page and spacing settings; the
 * edition's old pages need not reproduce first. */
export async function calculatedRecipeForRequest(p:ScorePackage,input?:ReadingExecution):Promise<ScoreRenderingRecipe>{
 const execution=input?capturedReadingExecution(input):undefined;checkReadingExecution(execution);
 if(!p.renderingRecipe)throw Error('Hand changes need this edition’s saved page settings, which it lacks. Its current pages are retained.');
 return createCalculatedHandRenderingRecipe(p.sourceSha256!,p.renderingRecipe.options,p.renderingRecipe.tokens);
}

/** Frozen receipt bytes stay intact. Historical pitched inventory records
 * gain their discriminator only at this passive evidence boundary. */
function normalizeCalculatedReceipt(raw:unknown):CalculatedHandReceipt {
 const r=structuredClone(raw) as CalculatedHandReceipt;
 if(!r?.sourceInventory||!Array.isArray(r.sourceInventory.owners)||!Array.isArray(r.sourceInventory.members))
  throw Error('Calculated receipt has an incomplete source inventory.');
 for(const record of [...r.sourceInventory.owners,...r.sourceInventory.members]){
  const o=record as unknown as Record<string,unknown>;
  if(o.eventKind===undefined){
   if(typeof o.pitch!=='number'||!Number.isFinite(o.pitch)||'referencePitch' in o||'soundingPitch' in o)
    throw Error('Legacy calculated inventory has contradictory pitch facts.');
   o.eventKind='pitched';
  }else if(o.eventKind==='pitched'){
   if(typeof o.pitch!=='number'||!Number.isFinite(o.pitch)||'referencePitch' in o||'soundingPitch' in o)
    throw Error('Calculated pitched inventory has contradictory pitch facts.');
  }else if(o.eventKind!=='unpitched'||'pitch' in o||o.soundingPitch!==null||typeof o.referencePitch!=='number'||!Number.isFinite(o.referencePitch))
   throw Error('Calculated inventory has an unknown or contradictory event kind.');
 }
 return r;
}

/** Proof that this viewer build replayed one exact calculated edition view
 * (archive digest and keyboard) through the shared engine and found it equal:
 * the receipt it confirmed and the written heads it drew. Derived only, it is
 * never written into a package; a missing or refused entry replays again. */
export interface CalculatedAdmissionEvidence {version:'calculated-admission-evidence-v1';receipt:CalculatedHandReceipt;writtenHeads:PresentationWrittenHead[]}
export interface CalculatedAdmissionEvidenceStore {get(key:string):Promise<CalculatedAdmissionEvidence|undefined>;put(key:string,evidence:CalculatedAdmissionEvidence):void}
const strings=(v:unknown)=>Array.isArray(v)&&v.every(x=>typeof x==='string');
export function calculatedAdmissionEvidence(value:unknown):CalculatedAdmissionEvidence {
 const e=value as CalculatedAdmissionEvidence;
 if(!e||typeof e!=='object'||e.version!=='calculated-admission-evidence-v1'||Object.keys(e).length!==3||!e.receipt||typeof e.receipt!=='object'||
  !Array.isArray(e.writtenHeads)||e.writtenHeads.some(h=>!h||typeof h!=='object'||!strings(h.ownerIds)||!strings(h.headIds)))throw Error('Invalid calculated admission evidence');
 return e;
}
/** The evidence for one presentation of one exact archive. */
export const calculatedAdmissionKey=(archiveSha256:string,layout:string)=>identityHash({version:'calculated-admission-evidence-v1',archiveSha256,layout});

/** Cold admission is an actual source-owned engine replay with no optimizer.
 * The saved ledger or its hashes cannot substitute for source/paint audit.
 * Evidence that this build already replayed these exact archive bytes, and
 * confirmed this very receipt, stands in for the replay. */
/** The written heads the evidence claims are exactly this edition's seats,
 * as the package's own written-head ledger requires. */
const headsFitSeats=(p:ScorePackage,heads:readonly PresentationWrittenHead[])=>heads.length===p.seats.length&&new Set(heads.map(h=>h.seatId)).size===heads.length&&
 heads.every(h=>{const s=p.seats.find(s=>s.id===h.seatId);return !!s&&s.page===h.page&&s.system===h.system&&s.x===h.x&&s.baseline===h.baseline&&s.fontSize===h.fontSize&&
  s.pitchDigit===h.digit&&JSON.stringify([...s.ownerIds].sort())===JSON.stringify(h.ownerIds)&&h.headIds.length>0&&h.headIds.every(id=>typeof id==='string'&&!!id);});
/** `evidence.found` is read before replaying; a replay that passes reports
 * its evidence through `evidence.made`, for the caller to keep once the whole
 * package is admitted. */
export async function admitCalculatedHandEdition(p:ScorePackage,raw:unknown,seatBytes:Uint8Array,onActualReplay?:(heads:readonly PresentationWrittenHead[])=>void,input?:ReadingExecution,
 evidence?:{found:()=>Promise<CalculatedAdmissionEvidence|undefined>;made:(evidence:CalculatedAdmissionEvidence)=>void}):Promise<CalculatedHandReceipt>{
 const execution=input?capturedReadingExecution(input):undefined;checkReadingExecution(execution);
 const r=normalizeCalculatedReceipt(raw),inkPolicy=(r?.version==='viewer-calculated-hand-edition-v2'||r?.version==='viewer-calculated-hand-edition-v3')?validateAnnotationInkPolicy(r.annotationInkPolicy):undefined;
 if(r?.version!=='viewer-calculated-hand-edition-v1'&&!inkPolicy)throw Error('Unsupported calculated edition receipt.');
 if(!!p.transposition!==(r?.version==='viewer-calculated-hand-edition-v3')||p.transposition&&r.version==='viewer-calculated-hand-edition-v3'&&r.transpositionSha256!==p.transposition.sha256)throw Error('Calculated receipt has another transposition authority.');
 if(inkPolicy)await ensureAnnotationInkPolicyReady(inkPolicy);
 if(!p.fingerLayer||p.preparationIdentity?.version!==(p.transposition?'viewer-piano-preparation-v4':inkPolicy?'viewer-piano-preparation-v3':'viewer-piano-preparation-v2')||!p.renderingRecipe||p.renderingRecipe.engineId!==CALCULATED_HAND_SCORE_RENDERING_ENGINE||
  p.manifest.engineVersion!==CALCULATED_HAND_SCORE_RENDERING_ENGINE)throw Error('Calculated edition lacks its complete layer, preparation or recipe identity.');
 const source=scoreWithCalculationContext(p.sourceScore??p.score,p.calculationContext,p.sourceSha256!),policy=p.preparationIdentity.handPolicy,
  constraints=pianoRequestAuthority(p,source,p.keyboardLayout!,p.fingerLayer,undefined,policy),recipe=p.renderingRecipe as ScoreRenderingRecipe,
  {inputs,operatorRequirements}=await calculatedHandInputs(p,p.fingerLayer,policy,recipe,constraints,inkPolicy),owners=ownerHands(p.fingerLayer),
  identity=await createHandPresentationIdentity(inputs,owners);
 await validateHandPresentationAgainstSource(source,p.score,identity,operatorRequirements);
 const saved=evidence?await evidence.found().catch(()=>undefined):undefined;checkReadingExecution(execution);
 if(saved&&same(r,saved.receipt)&&headsFitSeats(p,saved.writtenHeads)){
  annotationPositions({...p,calculatedHandReceipt:saved.receipt,annotationGeometry:saved.receipt.annotationGeometry});
  onActualReplay?.(saved.writtenHeads.map(h=>({...h,ownerIds:[...h.ownerIds],headIds:[...h.headIds]})));
  return structuredClone(saved.receipt);
 }
 const replay=await prepareCalculatedHandPresentation(source,owners,recipe,inputs,operatorRequirements,execution),expected=receiptFor(replay,inkPolicy,p.transposition?.sha256);
 checkReadingExecution(execution);
 if(!same(r,expected))throw Error('Calculated edition receipt differs from original-source actual paint, coverage or annotation geometry.');
 if(!same(p.score,replay.score)||p.pages.length!==replay.pages.length||p.pages.some((page,i)=>page!==replay.pages[i])||
  new TextDecoder('utf-8',{fatal:true}).decode(seatBytes)!==JSON.stringify(replay.seats)||!same(p.seats,replay.seats))
  throw Error('Calculated edition pages or seats differ from its saved complete hand-map replay.');
 if(!same(recipe.baseline,replay.recipeBaseline))throw Error('Calculated recipe raw-page baseline differs from its independent replay.');
 // Carrier geometry is only the owned slice. Admission separately inventories
 // every actual SVG primitive and reserves all 1–5 annotation outlines.
 annotationPositions({...p,calculatedHandReceipt:expected,annotationGeometry:expected.annotationGeometry});
 checkReadingExecution(execution);
 onActualReplay?.(replay.writtenHeads.map(h=>({...h,ownerIds:[...h.ownerIds],headIds:[...h.headIds]})));
 evidence?.made(structuredClone({version:'calculated-admission-evidence-v1',receipt:expected,writtenHeads:replay.writtenHeads}));
 return structuredClone(expected);
}
