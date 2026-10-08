import {calculatePianoFingers,PianoCalculationError,type PianoCalculationOptions} from '../vendor/iso-notation/src/model/piano-finger-calculation';
import {CONVENTIONAL_PLANNER_VERSION} from '../vendor/iso-notation/src/model/conventional-piano-planner';
import {RR_TEMPORAL_LAYER_PLANNER} from '../vendor/iso-notation/src/model/rr-temporal-finger-layer';
import {requireReferencePerformanceTempo,type ReferencePerformanceTempo} from '../vendor/iso-notation/src/model/reference-performance-tempo';
import {validatePianoCalculationContext} from '../vendor/iso-notation/src/model/piano-calculation-context';
import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';
import {scoreWithPerformingHands,renderScorePresentation} from '../vendor/iso-notation/src/render/janko/score-presentation';
import {APPROVED_SCORE_RENDERING_ENGINE,validateScoreRenderingRecipe} from '../vendor/iso-notation/src/render/janko/score-rendering-recipe';
import {approvedProductionJankoOptions} from '../vendor/iso-notation/src/render/janko/approved-production';
import {hashBytes,importPackage,pianoPlanningScore,selectPresentation,validateLayerAsync,type ScorePackage,type FingerLayer} from './package';
import {preparePianoCalculationContext} from './piano-context-package';
import {packagePianoPresentation} from './piano-package-presentation';
import {readPersonal,initialPersonal,installLayer,type PersonalState} from './state';
import {calculatePianoAssignments,PIANO_ASSIGNMENT_VERSION,type PianoAssignmentConstraint,type PianoCalculationDiagnostic} from '../vendor/iso-notation/src/model/piano-finger-assignments';
import {strFromU8} from 'fflate';
import {replayProvidedRRLayer} from './operator-finger-update';
import {RR_PERFORMANCE_POSE_PROFILE} from '../vendor/iso-notation/src/model/isomorphic-rr-personal-pose';

export interface PianoReadinessRequest extends PianoCalculationOptions {
  packageBytes:Uint8Array;
  layout:PhysicalKeyboardId;
  referenceTempo?:ReferencePerformanceTempo;
  personal?:PersonalState;
  forceRecalculate?:boolean;
  /** Published performing hands are retained by default as editorial inference.
   * Explicit hand search cannot install a reassignment without supported routing. */
  performingHandPolicy?:'calculate'|'retain-imported';
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
export type PianoReadinessResult=PianoReady|PianoNotReady;
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
      return failure('unsupported','package-admission',(error as Error).message);
    }
    let bytes:Uint8Array=original,p=prior;
    if(!['conventional-piano','janko-four-row'].includes(request.layout))return failure('unsupported','layout','Choose a supported piano keyboard.');
    if(request.performingHandPolicy!==undefined&&!['calculate','retain-imported'].includes(request.performingHandPolicy))
      return failure('unsupported','performing-hand-policy','Choose a supported performing-hand preparation.');
    if(request.referenceTempo){
      const context=validatePianoCalculationContext({version:'piano-calculation-context-v1',sourceSha256:p.sourceSha256!,
        referencePerformanceTempo:request.referenceTempo},p.sourceSha256!,p.sourceScore??p.score);
      if(JSON.stringify(pianoPlanningScore(p).referencePerformanceTempo)!==JSON.stringify(context.referencePerformanceTempo)){
        bytes=await preparePianoCalculationContext(p,context);p=await importPackage(bytes);
      }
    }
    const source=pianoPlanningScore(p);
    if(source.referencePerformanceTempo===undefined)
      return failure('needs-data','reference-tempo','Choose a duration unit and rate per minute for this score before calculating fingers.');
    requireReferencePerformanceTempo(source);interrupted(request);
    const hasPresentation=p.availablePresentations?.includes(request.layout)??p.keyboardLayout===request.layout;
    if(hasPresentation)p=await selectPresentation(p,request.layout);
    let personal:PersonalState|undefined;
    if(request.personal){
      if(!hasPresentation)return failure('conflict','personal-presentation','Saved finger choices need their original keyboard presentation. Your choices are retained.');
      try{personal=readPersonal(request.personal,p);}catch(error){return failure('conflict','personal-binding',(error as Error).message);}
    }
    const active=personal?.layer??p.fingerLayer;
    const providedRR=active?.version==='physical-attack-finger-layer-v1'&&active.physicalRowOrder==='rr-even-far-last-v1'&&
      active.profileId===RR_PERFORMANCE_POSE_PROFILE.id&&
      ['released-owner-actions-v1','released-owner-actions-v1/viewer-bounded-performance-v2'].includes(active.plannerVersion);
    const ready=async(readyBytes:Uint8Array,checked:ScorePackage,chosen=checked.fingerLayer):Promise<PianoReady>=>{
      interrupted(request);
      const layer=await validateLayerAsync(chosen,checked,{requireCurrent:true});
      if(!currentLayer(layer)){
        if(!providedRR||layer.profileSha256!==await hashBytes(JSON.stringify(RR_PERFORMANCE_POSE_PROFILE)))
          throw Error('Readiness requires a complete independently admitted calculated layer.');
        // Accepted provided choices receive fixed-route replay, without any
        // optimizer rerun or anonymous replacement of operator decisions.
        replayProvidedRRLayer(checked,layer);
      }
      const assignments=layer.version===PIANO_ASSIGNMENT_VERSION;
      const edited=!!personal&&Object.keys(personal.overrides).length>0,
        calculationDiagnostics=assignments?structuredClone((layer.execution as {diagnostics:PianoCalculationDiagnostic[]}).diagnostics):[];
      if(edited)calculationDiagnostics.push({code:'operator-edit-not-certified',
        message:'Your finger changes are saved. Their continuous movement has not been certified.'});
      return{status:assignments||edited?'editable':'ready',packageBytes:readyBytes,package:checked,layer,calculationDiagnostics,
        availableFingerPresentations:checked.fingerEligibility.eligible?['annotations','replacement']:['annotations'],
        ...(personal?{personal}:{})};
    };
    if(hasPresentation&&!request.forceRecalculate&&(currentLayer(active)||providedRR)){
      // Personal layers are independently replayed, too; they cannot substitute
      // a structural legacy certificate for complete calculated readiness.
      if(active!==p.fingerLayer){
        return await ready(bytes,p,active);
      }
      return await ready(bytes,p);
    }
    const constraints:PianoAssignmentConstraint[]=[],sourceOwners=new Map(source.notes.map(n=>[n.id,n])),
      add=(id:string,role:Partial<PianoAssignmentConstraint>,reference:string,kind:PianoAssignmentConstraint['provenance']['kind']='operator-choice')=>{
        const n=sourceOwners.get(id);if(!n)throw Error('Saved finger authority has a stale source owner');
        constraints.push({ownerId:id,guard:{pitch:12*n.pitch.octave+n.pitch.pitchClass,startTick:n.startTick,durationTicks:n.durationTicks},
          ...role,provenance:{kind,reference}});
      },authority=active?.reviewedFingerAuthority as {constraints?:Array<{id:string;hand:'LH'|'RH';finger:number;row?:number}>}|undefined;
    if(request.performingHandPolicy!=='calculate')for(const n of p.score.notes)
      add(n.id,{hand:n.hand},'Source-bound editorial preparation retains the published performing-hand inference; printed staff is not composer hand authority','editorial-hand-retention');
    if(active?.providedAuthorityProjection&&!authority)return failure('conflict','operator-authority','This score’s saved authority is incomplete. Its current version is retained.');
    const editedOwners=new Set(Object.values(personal?.overrides??{}).flatMap(c=>c.ownerIds));
    const authorityReference=authority?'Retained validated explicit operator authority '+await hashBytes(JSON.stringify(active!.reviewedFingerAuthority))+'; prior archive retains its complete review journal':'';
    for(const q of authority?.constraints??[])add(q.id,{hand:q.hand,...(editedOwners.has(q.id)?{}:{finger:q.finger,...(q.row===undefined?{}:{row:q.row})})},authorityReference+'; current personal choices take precedence');
    // An installed assignment retains its guarded operator decisions even when
    // the caller has no separate personal-state file.
    if(active?.version===PIANO_ASSIGNMENT_VERSION)for(const q of active.operatorConstraints as PianoAssignmentConstraint[]){
      const retained=structuredClone(q);if(editedOwners.has(q.ownerId)){delete retained.finger;delete retained.row;delete retained.contact;}
      if(retained.hand!==undefined||retained.finger!==undefined||retained.row!==undefined||retained.contact!==undefined)constraints.push(retained);
    }
    const preservePersonal=personal&&(Object.keys(personal.overrides).length||Object.keys(personal.undo??{}).length||personal.layer||personal.history.length);
    if(preservePersonal||authority){
      // Retain the presentation to which history and correction guards belong;
      // these are explicit editorial constraints, never composer hand facts.
      for(const n of p.score.notes)add(n.id,{hand:n.hand},'Retain the existing performing-hand presentation for saved operator history');
    }
    for(const c of Object.values(personal?.overrides??{}))for(const id of c.ownerIds)
      add(id,{hand:c.hand,finger:c.replacement,...(c.proposedRow===undefined?{}:{row:c.proposedRow}),
        ...(c.proposedContact?{contact:c.proposedContact}:{})},'Saved per-note operator choice: '+c.createdAt);
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
    if(calculated.assignments.some(a=>p.score.notes.find(n=>n.id===a.id)?.hand!==a.hand))
      return failure('unsupported','performing-hand-reassignment','This preparation cannot yet preserve printed voice rests and beams when changing performing hands. The original score and choices are retained.');
    const sameHands=hasPresentation&&calculated.assignments.every(a=>p.score.notes.find(n=>n.id===a.id)?.hand===a.hand);
    let score:string,seats:string,pages:string[],engineVersion:string,recipe=p.renderingRecipe;
    if(sameHands){
      // Attach genuine fingers to fixed ink only when ALL physical hands match
      // its source-linked presentation. Never silently flip existing stems.
      const descriptor=(p.collectionManifest??p.manifest).presentations?.[request.layout];
      score=strFromU8(p.files[descriptor?.score??'score.json']);seats=JSON.stringify(p.seats);pages=p.pages.slice();engineVersion=p.manifest.engineVersion;
    }else{
      if(!recipe)return failure('unsupported','changed-hand-engraving','Calculated hands need matching score pages. This fixed score has no supported rendering preparation; its current pages are retained.');
      try{
        const checked=validateScoreRenderingRecipe(recipe,{sourceSha256:p.sourceSha256!}),baseline=renderScorePresentation(source,checked);
        if(JSON.stringify(await Promise.all(baseline.rawPages.map(hashBytes)))!==JSON.stringify(checked.baseline.pageSha256)||
          await hashBytes(JSON.stringify(baseline.seats))!==checked.baseline.seatSha256)
          return failure('unsupported','rendering-baseline','This rendering preparation does not reproduce its source pages. The current pages are retained.');
        // Reproduction of a retained recipe establishes its source binding;
        // it does not authorize silently changing that recipe's engine. New
        // presentations explicitly pin the accepted production baseline.
        let nextRecipe=checked;
        if(checked.engineId!==APPROVED_SCORE_RENDERING_ENGINE){
          nextRecipe=validateScoreRenderingRecipe({...checked,engineId:APPROVED_SCORE_RENDERING_ENGINE,
            options:approvedProductionJankoOptions(checked.options)});
          const nextBaseline=renderScorePresentation(source,nextRecipe);
          nextRecipe=validateScoreRenderingRecipe({...nextRecipe,baseline:{
            pageSha256:await Promise.all(nextBaseline.rawPages.map(hashBytes)),
            seatSha256:await hashBytes(JSON.stringify(nextBaseline.seats))}});
        }
        const effective=scoreWithPerformingHands(source,calculated.assignments,'piano-calculation:'+request.layout+':'+calculated.effectiveHandSha256),
          rendered=renderScorePresentation(effective,nextRecipe);
        score=JSON.stringify(effective);seats=JSON.stringify(rendered.seats);pages=rendered.pages;engineVersion=nextRecipe.engineId;recipe=nextRecipe;
      }catch(error){return failure('unsupported','rendering-admission',(error as Error).message);}
    }
    const prepared=await packagePianoPresentation(p,{layoutId:request.layout,sourceSha256:p.sourceSha256!,score,seats,pages,
      layer:calculated.layer,effectiveHandSha256:calculated.effectiveHandSha256,engineVersion,recipe});
    const checked=await importPackage(prepared,{keyboardLayout:request.layout});
    // Source-bound choices and history survive regeneration. Their presentation
    // identity is retained by the explicit hand constraints and exact score bytes.
    if(personal){
      if(preservePersonal||authority)personal=readPersonal(installLayer(personal,p,checked.fingerLayer!),checked);
      else{personal={...initialPersonal(checked),view:structuredClone(personal.view),
        ...(personal.editContactId?{editContactId:personal.editContactId}:{})};personal=readPersonal(personal,checked);}
    }
    else if(authority){
      personal=readPersonal(installLayer(initialPersonal(p),p,checked.fingerLayer!),checked);}
    return await ready(prepared,checked);
  }catch(error){
    if(request.signal?.aborted)return failure('cancelled','cancelled','Fingering calculation cancelled. Your score is retained.');
    if(error instanceof PianoCalculationError)return failure(error.status,error.code,error.message);
    return failure('unsupported','readiness-admission',(error as Error).message);
  }
}
