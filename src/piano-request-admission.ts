import {importPackage,selectPresentation,pianoPlanningScore,type ScorePackage,type FingerLayer} from './package';
import {readPersonal,initialPersonal,type PersonalState} from './state';
import {personalForCalculatedEdition} from './presentation-install';
import type {PianoReadinessRequest} from './piano-readiness';
import {pianoRequestAuthority} from './piano-request-authority';
import {canonicalJson,authorityIdentity,preparationRequestIdentity} from './piano-preparation-identity';
import {validatePianoCalculationContext,scoreWithCalculationContext} from '../vendor/iso-notation/src/model/piano-calculation-context';
import {prepareCalculatedEdition} from './calculated-hand-edition';
import {createScoreTransposition,getScoreTransposition} from './score-transposition';
import type {PackageAdmissionSession} from './package-admission-session';
const equal=(a:unknown,b:unknown)=>canonicalJson(a)===canonicalJson(b);
const exactBytes=(a:Uint8Array,b:Uint8Array)=>a.length===b.length&&a.every((v,i)=>v===b[i]);

/** Reader-realm admission is bound to the independently admitted ORIGINAL
 * request, not the returned package's internally consistent claims. */
export async function admitPianoRequestResult(request:PianoReadinessRequest,p:ScorePackage,bytes:Uint8Array,layer:FingerLayer|undefined,personal:PersonalState|undefined,admission?:PackageAdmissionSession):Promise<void>{
  const original=await (admission?admission.import(request.packageBytes,{allowLegacyTempo:true}):importPackage(request.packageBytes,{allowLegacyTempo:true})),has=original.availablePresentations?.includes(request.layout)??original.keyboardLayout===request.layout,
    prior=has?await selectPresentation(original,request.layout):original,
    saved=request.personal?readPersonal(request.personal,prior):undefined;
  const steps=request.transposeSteps??getScoreTransposition(prior),pitchChanged=steps!==getScoreTransposition(prior);
  if(!Number.isSafeInteger(steps)||pitchChanged&&(steps===0||request.intent==='read-retained'))throw Error('Prepared output has an invalid requested transposition intent.');
  if(steps!==0&&(pitchChanged||request.forceRecalculate||request.intent!=='read-retained')){
    const transformed=await createScoreTransposition(prior,request.packageBytes,steps,request.layout);
    if(!equal(p.transposition,transformed.envelope)||p.sourceSha256!==transformed.envelope.effectiveSourceSha256||p.keyboardLayout!==request.layout||
      !exactBytes(p.files[(p.collectionManifest??p.manifest).sourceScore!],transformed.sourceBytes)||
      !exactBytes(p.referenceMidi??new Uint8Array(),original.referenceMidi??new Uint8Array()))throw Error('Prepared output differs from its requested pitch transformation or retained original reference.');
    let context=prior.calculationContext;
    if(context)context=validatePianoCalculationContext({...context,sourceSha256:p.sourceSha256},p.sourceSha256!,transformed.source);
    if(request.referenceTempo)context=validatePianoCalculationContext({version:'piano-calculation-context-v1',sourceSha256:p.sourceSha256!,referencePerformanceTempo:request.referenceTempo},p.sourceSha256!,transformed.source);
    if(!equal(p.calculationContext,context))throw Error('Transposed output has another requested calculation context.');
    const source=scoreWithCalculationContext(transformed.source,context,p.sourceSha256!),
      rawConstraints=pianoRequestAuthority(prior,source,request.layout,pitchChanged?undefined:saved?.layer??prior.fingerLayer,pitchChanged?undefined:saved,'retain-imported'),
      constraints=[...new Map(rawConstraints.map(c=>[canonicalJson(c),c])).values()],
      identity=p.preparationIdentity;
    if(!identity||!layer||identity.handPolicy!=='retain-imported'||identity.authoritySha256!==await authorityIdentity(constraints)||
      identity.requestSha256!==await preparationRequestIdentity(p,'retain-imported',constraints,request.maxExpansions)||!equal(layer,p.fingerLayer))throw Error('Transposed output belongs to another selected hand map or layer request.');
    const expectedPersonal=!pitchChanged&&saved?personalForCalculatedEdition(saved,prior,p):undefined;
    if(!equal(personal,expectedPersonal))throw Error('Transposed output inherits another pitch edition correction journal.');
    const prepared=await prepareCalculatedEdition({...p,calculationContext:context},layer,'retain-imported',constraints),rendered=prepared.result;
    if(!equal(p.renderingRecipe,prepared.recipe)||!equal(p.score,rendered.score)||!equal(p.pages,rendered.pages)||!equal(p.seats,rendered.seats)||!equal(p.calculatedHandReceipt,prepared.receipt))throw Error('Transposed output differs from complete independently replayed engraving.');
    return;
  }
  if(p.sourceSha256!==original.sourceSha256||p.sourceRevision!==original.sourceRevision||p.keyboardLayout!==request.layout||
    !exactBytes(p.files[(p.collectionManifest??p.manifest).sourceScore??'score.json'],original.files[(original.collectionManifest??original.manifest).sourceScore??'score.json']))
    throw Error('Prepared output differs from the requested immutable source or keyboard.');
  const retained=request.intent==='read-retained'&&!request.forceRecalculate;
  if(retained&&has){
    if(request.referenceTempo){const requested=validatePianoCalculationContext({version:'piano-calculation-context-v1',sourceSha256:original.sourceSha256!,referencePerformanceTempo:request.referenceTempo},original.sourceSha256!,original.sourceScore??original.score);
      if(!equal(pianoPlanningScore(prior).referencePerformanceTempo,requested.referencePerformanceTempo))throw Error('Retained reading must preserve its requested saved calculation context.');}
    if(!exactBytes(bytes,request.packageBytes)||!equal(personal,saved)||!equal(layer,saved?.layer??prior.fingerLayer))
      throw Error('Retained reading must preserve the requested archive, context and saved choices exactly.');
    return;
  }
  let context=prior.calculationContext;
  if(request.referenceTempo&&!equal(pianoPlanningScore(prior).referencePerformanceTempo,request.referenceTempo))
    context=validatePianoCalculationContext({version:'piano-calculation-context-v1',sourceSha256:original.sourceSha256!,referencePerformanceTempo:request.referenceTempo},original.sourceSha256!,original.sourceScore??original.score);
  if(!equal(p.calculationContext,context))throw Error('Prepared output has another calculation context.');
  const source=scoreWithCalculationContext(original.sourceScore??original.score,context,original.sourceSha256!),
    constraints=pianoRequestAuthority(prior,source,request.layout,saved?.layer??prior.fingerLayer,saved,request.performingHandPolicy??'calculate'),
    identity=p.preparationIdentity;
  if(!identity||!layer||identity.handPolicy!==(request.performingHandPolicy??'calculate')||
    identity.authoritySha256!==await authorityIdentity(constraints)||
    identity.requestSha256!==await preparationRequestIdentity(p,request.performingHandPolicy??'calculate',constraints,request.maxExpansions))
    throw Error('Prepared output belongs to another hand policy, guarded choice or calculation request.');
  if(!equal(layer,p.fingerLayer))throw Error('Worker layer differs from its admitted package.');
  const expectedPersonal=saved?(exactBytes(bytes,request.packageBytes)?saved:personalForCalculatedEdition(saved,prior,p)):
    prior.fingerLayer?.reviewedFingerAuthority?personalForCalculatedEdition(initialPersonal(prior),prior,p):undefined;
  if(!equal(personal,expectedPersonal))throw Error('Prepared output differs from the requested saved correction journal.');
  const sameHands=has&&!prior.score.performingHandPresentation&&!p.score.performingHandPresentation&&p.score.notes.every(n=>prior.score.notes.find(old=>old.id===n.id)?.hand===n.hand);
  if(sameHands){
    if(!equal(p.pages,prior.pages)||!equal(p.seats,prior.seats)||p.manifest.engineVersion!==prior.manifest.engineVersion||!equal(p.renderingRecipe,prior.renderingRecipe)||
      !equal(p.score,{...prior.score,referencePerformanceTempo:source.referencePerformanceTempo}))
      throw Error('Same-hand output differs from the requested fixed-page edition or recipe.');
    return;
  }
  if(!prior.renderingRecipe)throw Error('The requested source has no compatible rendering recipe.');
  const prepared=await prepareCalculatedEdition({...prior,keyboardLayout:request.layout,calculationContext:context},layer,
    request.performingHandPolicy??'calculate',constraints),rendered=prepared.result;
  if(!equal(p.renderingRecipe,prepared.recipe)||p.manifest.engineVersion!==prepared.recipe.engineId||!equal(p.score,rendered.score)||
    !equal(p.pages,rendered.pages)||!equal(p.seats,rendered.seats)||!equal(p.calculatedHandReceipt,prepared.receipt))
    throw Error('Prepared output differs from the requested complete engraving or recipe.');
}
