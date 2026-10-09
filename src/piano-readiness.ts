import {calculatePianoFingers,PianoCalculationError,type PianoCalculationOptions} from '../vendor/iso-notation/src/model/piano-finger-calculation';
import {CONVENTIONAL_PLANNER_VERSION} from '../vendor/iso-notation/src/model/conventional-piano-planner';
import {RR_TEMPORAL_LAYER_PLANNER} from '../vendor/iso-notation/src/model/rr-temporal-finger-layer';
import {requireReferencePerformanceTempo,type ReferencePerformanceTempo} from '../vendor/iso-notation/src/model/reference-performance-tempo';
import {validatePianoCalculationContext} from '../vendor/iso-notation/src/model/piano-calculation-context';
import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';
import {HandPresentationError} from '../vendor/iso-notation/src/score-presentation';
import {hashBytes,importPackage,pianoPlanningScore,selectPresentation,validateLayerAsync,type ScorePackage,type FingerLayer} from './package';
import {scoreWithCalculationContext} from '../vendor/iso-notation/src/model/piano-calculation-context';
import {packagePianoPresentation} from './piano-package-presentation';
import {readPersonal,initialPersonal,type PersonalState} from './state';
import {calculatePianoAssignments,PIANO_ASSIGNMENT_VERSION,type PianoCalculationDiagnostic} from '../vendor/iso-notation/src/model/piano-finger-assignments';
import {strFromU8} from 'fflate';
import {scoreCapabilities} from './score-capabilities';
import {replayProvidedRRLayer} from './operator-finger-update';
import {RR_PERFORMANCE_POSE_PROFILE} from '../vendor/iso-notation/src/model/isomorphic-rr-personal-pose';
import {pianoRequestAuthority,PianoAuthorityConflict,type PerformingHandPolicy} from './piano-request-authority';
import {preparationRequestIdentity} from './piano-preparation-identity';
import {personalForCalculatedEdition,PersonalEditionConflict} from './presentation-install';
import {prepareCalculatedEdition,type CalculatedHandReceipt} from './calculated-hand-edition';

export interface PianoReadinessRequest extends PianoCalculationOptions {
  packageBytes:Uint8Array;
  layout:PhysicalKeyboardId;
  referenceTempo?:ReferencePerformanceTempo;
  personal?:PersonalState;
  forceRecalculate?:boolean;
  /** New requests jointly calculate hands unless explicitly constrained. */
  performingHandPolicy?:PerformingHandPolicy;
  /** Reading a retained edition is distinct from requesting new calculation. */
  intent?:'calculate'|'read-retained';
}
export interface PianoReady {
  status:'ready'|'editable';packageBytes:Uint8Array;package:ScorePackage;layer:FingerLayer;
  calculationDiagnostics:PianoCalculationDiagnostic[];
  availableFingerPresentations:Array<'annotations'|'replacement'>;
  personal?:PersonalState;
}
export interface PianoNotReady {
  status:'needs-data'|'unsupported'|'search-exhausted'|'cancelled'|'conflict';
  code:string;message:string;retainedPackageBytes:Uint8Array;retainedPackage?:ScorePackage;
}
export interface PianoReading {
  status:'reading';packageBytes:Uint8Array;package:ScorePackage;
  calculationDiagnostics:PianoCalculationDiagnostic[];availableFingerPresentations:[];personal?:PersonalState;
}
export type PianoPrepared=PianoReady|PianoReading;
export type PianoReadinessResult=PianoPrepared|PianoNotReady;
const currentLayer=(layer:FingerLayer|undefined)=>layer?.version===PIANO_ASSIGNMENT_VERSION||layer?.plannerVersion===CONVENTIONAL_PLANNER_VERSION||layer?.plannerVersion===RR_TEMPORAL_LAYER_PLANNER;
const interrupted=(request:PianoReadinessRequest)=>{
  if(request.signal?.aborted)throw new PianoCalculationError('cancelled','cancelled','Fingering calculation cancelled. Your score is retained.');
};

/** Pure preparation: no library writes, preferences, device state or imported
 * executable code. A caller may stage only a complete ready/editable result.
 * Editable assignments never assert a successful continuous movement route. */
export async function ensurePianoReady(request:PianoReadinessRequest):Promise<PianoReadinessResult>{
  const original=new Uint8Array(request.packageBytes);let prior:ScorePackage|undefined;
  const failure=(status:PianoNotReady['status'],code:string,message:string):PianoNotReady=>
    ({status,code,message,retainedPackageBytes:original,...(prior?{retainedPackage:prior}:{})});
  try{
    interrupted(request);
    try{prior=await importPackage(original,{allowLegacyTempo:true});}catch(error){
      const message=(error as Error).message;
      return /authority|operator|source guard|source instruction/i.test(message)?failure('conflict','operator-authority',message):
        failure('unsupported','package-admission',message);
    }
    let bytes:Uint8Array=original,p=prior;
    if(!scoreCapabilities(p).pianoPreparation)
      return failure('unsupported','instrument-reading','This score is available for reading. Piano finger preparation applies to piano scores.');
    if(!['conventional-piano','janko-four-row'].includes(request.layout))return failure('unsupported','layout','Choose a supported piano keyboard.');
    if(request.performingHandPolicy!==undefined&&!['calculate','retain-imported'].includes(request.performingHandPolicy))
      return failure('unsupported','performing-hand-policy','Choose a supported performing-hand preparation.');
    if(request.intent!==undefined&&!['calculate','read-retained'].includes(request.intent))
      return failure('unsupported','preparation-intent','Choose a supported score preparation.');
    const hasPresentation=p.availablePresentations?.includes(request.layout)??p.keyboardLayout===request.layout;
    if(hasPresentation)p=await selectPresentation(p,request.layout);
    let nextContext=p.calculationContext;
    if(request.referenceTempo){
      const context=validatePianoCalculationContext({version:'piano-calculation-context-v1',sourceSha256:p.sourceSha256!,
        referencePerformanceTempo:request.referenceTempo},p.sourceSha256!,p.sourceScore??p.score);
      if(JSON.stringify(pianoPlanningScore(p).referencePerformanceTempo)!==JSON.stringify(context.referencePerformanceTempo)){
        if(request.intent==='read-retained'&&!request.forceRecalculate&&p.availablePresentations?.includes(request.layout))
          return failure('conflict','retained-context','A retained edition reads its saved tempo. Request a new calculation to change it.');
        nextContext=context;
      }
    }
    const source=scoreWithCalculationContext(p.sourceScore??p.score,nextContext,p.sourceSha256!);
    let personal:PersonalState|undefined;
    if(request.personal){
      if(!hasPresentation)return failure('conflict','personal-presentation','Saved finger choices need their original keyboard presentation. Your choices are retained.');
      try{personal=readPersonal(request.personal,p);}catch(error){return failure('conflict','personal-binding',(error as Error).message);}
    }
    const active=personal?.layer??p.fingerLayer;
    if(personal)try{
      if(personal.layer)await validateLayerAsync(personal.layer,p);
      for(const layer of personal.history)await validateLayerAsync(layer,p,{history:true});
    }catch(error){return failure('conflict','personal-layer',(error as Error).message);}
    const providedRR=active?.version==='physical-attack-finger-layer-v1'&&active.physicalRowOrder==='rr-even-far-last-v1'&&
      active.profileId===RR_PERFORMANCE_POSE_PROFILE.id&&
      ['released-owner-actions-v1','released-owner-actions-v1/viewer-bounded-performance-v2'].includes(active.plannerVersion);
    const ready=async(readyBytes:Uint8Array,checked:ScorePackage,chosen=checked.fingerLayer):Promise<PianoReady>=>{
      interrupted(request);
      const layer=await validateLayerAsync(chosen,checked,{requireCurrent:request.intent!=='read-retained'});
      if(!currentLayer(layer)){
        if(request.intent!=='read-retained'&&(!providedRR||layer.profileSha256!==await hashBytes(JSON.stringify(RR_PERFORMANCE_POSE_PROFILE))))
          throw Error('Readiness requires a complete independently admitted calculated layer.');
        // Accepted provided choices receive fixed-route replay, without any
        // optimizer rerun or anonymous replacement of operator decisions.
        if(providedRR)replayProvidedRRLayer(checked,layer);
      }
      const assignments=layer.version===PIANO_ASSIGNMENT_VERSION;
      const edited=!!personal&&Object.keys(personal.overrides).length>0,
        calculationDiagnostics=assignments?structuredClone((layer.execution as {diagnostics:PianoCalculationDiagnostic[]}).diagnostics):[];
      if(request.intent==='read-retained'&&!currentLayer(layer))calculationDiagnostics.push({code:'retained-edition',
        message:'These saved choices belong to this retained edition; no new calculation is claimed.'});
      if(edited)calculationDiagnostics.push({code:'operator-edit-not-certified',
        message:'Your finger changes are saved. Their continuous movement has not been certified.'});
      return{status:assignments||edited?'editable':'ready',packageBytes:readyBytes,package:checked,layer,calculationDiagnostics,
        availableFingerPresentations:checked.fingerEligibility.eligible?['annotations','replacement']:['annotations'],
        ...(personal?{personal}:{})};
    };
    if(hasPresentation&&!request.forceRecalculate&&request.intent==='read-retained'){
      if(active)return await ready(bytes,p,active);
      interrupted(request);
      return{status:'reading',packageBytes:bytes,package:p,calculationDiagnostics:[],availableFingerPresentations:[],...(personal?{personal}:{})};
    }
    if(source.referencePerformanceTempo===undefined)
      return failure('needs-data','reference-tempo','Choose a duration unit and rate per minute for this score before calculating fingers.');
    requireReferencePerformanceTempo(source);interrupted(request);
    // Unknown authority must be surfaced before any NEW-request cache reuse.
    const constraints=pianoRequestAuthority(p,source,request.layout,active,personal,request.performingHandPolicy??'calculate');
    const matchingRequest=hasPresentation&&p.preparationIdentity&&active===p.fingerLayer&&
      p.preparationIdentity.requestSha256===await preparationRequestIdentity({...p,calculationContext:nextContext},request.performingHandPolicy??'calculate',constraints,request.maxExpansions);
    if(hasPresentation&&!request.forceRecalculate&&matchingRequest&&(currentLayer(active)||providedRR)){
      // Personal layers are independently replayed, too; they cannot substitute
      // a structural legacy certificate for complete calculated readiness.
      if(active!==p.fingerLayer){
        return await ready(bytes,p,active);
      }
      return await ready(bytes,p);
    }
    const authority=active?.reviewedFingerAuthority;
    if(!hasPresentation&&!p.renderingRecipe)
      return failure('unsupported','presentation-preparation','This score needs a matching native rendering preparation for the selected keyboard. Its current pages are retained.');
    let calculated:Awaited<ReturnType<typeof calculatePianoFingers>>|Awaited<ReturnType<typeof calculatePianoAssignments>>;
    if(constraints.length)calculated=await calculatePianoAssignments(source,request.layout,
      {sourceHash:p.sourceSha256!,sourceBytesSha256:p.sourceSha256!,revision:p.manifest.revision},{...request,constraints});
    else try{calculated=await calculatePianoFingers(source,request.layout,{sourceSha256:p.sourceSha256!,revision:p.manifest.revision},request);}
    catch(error){
      // Source/admission/cancellation failures do not become a lesser success.
      // Only a declared movement-model/search failure may try the distinct
      // complete static assignment calculator and its independent admission.
      if(!(error instanceof PianoCalculationError)||error.status!=='search-exhausted'&&error.code!=='exact-contact-span')throw error;
      calculated=await calculatePianoAssignments(source,request.layout,
        {sourceHash:p.sourceSha256!,sourceBytesSha256:p.sourceSha256!,revision:p.manifest.revision},request);
    }
    interrupted(request);
    const sameHands=hasPresentation&&!p.score.performingHandPresentation&&calculated.assignments.every(a=>p.score.notes.find(n=>n.id===a.id)?.hand===a.hand);
    let score:string,seats:string,pages:string[],engineVersion:string,recipe=p.renderingRecipe,receipt:CalculatedHandReceipt|undefined;
    if(sameHands){
      // Attach genuine fingers to fixed ink only when ALL physical hands match
      // its source-linked presentation. Never silently flip existing stems.
      const descriptor=(p.collectionManifest??p.manifest).presentations?.[request.layout];
      score=JSON.stringify(p.calculationContext===nextContext?p.score:{...p.score,referencePerformanceTempo:source.referencePerformanceTempo});seats=JSON.stringify(p.seats);pages=p.pages.slice();engineVersion=p.manifest.engineVersion;
    }else{
      if(!recipe)return failure('unsupported','changed-hand-engraving','Calculated hands need matching score pages. This fixed score has no supported rendering preparation; its current pages are retained.');
      try{
        const prepared=await prepareCalculatedEdition({...p,keyboardLayout:request.layout,calculationContext:nextContext},calculated.layer,
          request.performingHandPolicy??'calculate',constraints),rendered=prepared.result;
        score=JSON.stringify(rendered.score);seats=JSON.stringify(rendered.seats);pages=rendered.pages;
        engineVersion=prepared.recipe.engineId;recipe=prepared.recipe;receipt=prepared.receipt;
      }catch(error){if(error instanceof HandPresentationError)throw error;return failure('unsupported','rendering-admission',(error as Error).message);}
    }
    const prepared=await packagePianoPresentation(p,{layoutId:request.layout,sourceSha256:p.sourceSha256!,score,seats,pages,
      layer:calculated.layer,effectiveHandSha256:calculated.effectiveHandSha256,engineVersion,recipe,
      preparationRequest:{handPolicy:request.performingHandPolicy??'calculate',maxExpansions:request.maxExpansions},calculatedHandReceipt:receipt,calculationContext:nextContext??null});
    const checked=await importPackage(prepared,{keyboardLayout:request.layout});
    if(personal)personal=personalForCalculatedEdition(personal,p,checked);
    else if(authority)personal=personalForCalculatedEdition(initialPersonal(p),p,checked);
    return await ready(prepared,checked);
  }catch(error){
    if(request.signal?.aborted)return failure('cancelled','cancelled','Fingering calculation cancelled. Your score is retained.');
    if(error instanceof PianoAuthorityConflict)return failure('conflict',error.code,error.message);
    if(error instanceof PersonalEditionConflict)return failure('conflict',error.code,error.message);
    if(error instanceof HandPresentationError)return failure(error.code==='authority'?'conflict':'unsupported','hand-presentation:'+error.code,
      error.message+(error.ownerIds.length?' Owners: '+error.ownerIds.join(', ')+'.':'')+' The prior edition and saved choices are retained.');
    if(error instanceof PianoCalculationError)return failure(error.status,error.code,error.message);
    return failure('unsupported','readiness-admission',(error as Error).message);
  }
}
