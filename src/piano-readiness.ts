import {CONVENTIONAL_PLANNER_VERSION} from '../vendor/iso-notation/src/model/conventional-piano-planner';
import {RR_TEMPORAL_LAYER_PLANNER} from '../vendor/iso-notation/src/model/rr-temporal-finger-layer';
import {PIANO_ASSIGNMENT_VERSION} from '../vendor/iso-notation/src/model/piano-finger-assignments';
import {RR_PERFORMANCE_POSE_PROFILE} from '../vendor/iso-notation/src/model/isomorphic-rr-personal-pose';
import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';
import {HandPresentationError} from '../vendor/iso-notation/src/score-presentation';
import {importPackage,selectPresentation,validateLayerAsync,type ScorePackage,type FingerLayer} from './package';
import {readPersonal,type PersonalState} from './state';
import {scoreCapabilities} from './score-capabilities';
import {replayProvidedRRLayer} from './operator-finger-update';
import type {PackageAdmissionSession} from './package-admission-session';

/** Open one saved keyboard view of a score. The viewer never calculates hands
 * or fingers: it reads the edition's own pages, its saved finger layer, if any,
 * and the player's saved choices. */
export interface PianoReadinessRequest {
  packageBytes:Uint8Array;
  layout:PhysicalKeyboardId;
  personal?:PersonalState;
  signal?:AbortSignal;
}
export interface PianoReady {
  status:'ready'|'editable';packageBytes:Uint8Array;package:ScorePackage;layer:FingerLayer;
  availableFingerPresentations:Array<'annotations'|'replacement'>;personal?:PersonalState;
}
export interface PianoNotReady {
  status:'unsupported'|'cancelled'|'conflict';
  code:string;message:string;retainedPackageBytes:Uint8Array;retainedPackage?:ScorePackage;
}
export interface PianoReading {
  status:'reading';packageBytes:Uint8Array;package:ScorePackage;availableFingerPresentations:[];personal?:PersonalState;
}
export type PianoPrepared=PianoReady|PianoReading;
export type PianoReadinessResult=PianoPrepared|PianoNotReady;
const currentLayer=(layer:FingerLayer)=>layer.version===PIANO_ASSIGNMENT_VERSION||layer.plannerVersion===CONVENTIONAL_PLANNER_VERSION||layer.plannerVersion===RR_TEMPORAL_LAYER_PLANNER;
const keyboardName=(layout:PhysicalKeyboardId)=>layout==='conventional-piano'?'conventional':'Jankó four-row';
class Cancelled extends Error {}
const CANCELLED='Opening cancelled. Your score and choices are retained.';

/** Pure reading: no library writes, preferences, device state or imported
 * executable code. A caller may install only a complete prepared result. */
export async function ensurePianoReady(request:PianoReadinessRequest,admission?:PackageAdmissionSession):Promise<PianoReadinessResult>{
  const original=new Uint8Array(request.packageBytes);let prior:ScorePackage|undefined;
  const failure=(status:PianoNotReady['status'],code:string,message:string):PianoNotReady=>
    ({status,code,message,retainedPackageBytes:original,...(prior?{retainedPackage:prior}:{})});
  const interrupted=()=>{if(request.signal?.aborted)throw new Cancelled(CANCELLED);};
  try{
    interrupted();
    try{prior=await (admission?admission.import(original,{allowLegacyTempo:true}):importPackage(original,{allowLegacyTempo:true}));}catch(error){
      const message=(error as Error).message;
      return /authority|operator|source guard|source instruction/i.test(message)?failure('conflict','operator-authority',message):
        failure('unsupported','package-admission',message);
    }
    interrupted();
    if(!scoreCapabilities(prior).pianoPreparation)
      return failure('unsupported','instrument-reading','This score is available for reading. Hands and fingers apply to piano scores.');
    if(!['conventional-piano','janko-four-row'].includes(request.layout))return failure('unsupported','layout','Choose a supported piano keyboard.');
    if(!(prior.availablePresentations?.includes(request.layout)??prior.keyboardLayout===request.layout))
      return failure('unsupported','keyboard-presentation',`This edition has no ${keyboardName(request.layout)} keyboard view. The current score is retained.`);
    const p=await selectPresentation(prior,request.layout);
    let personal:PersonalState|undefined;
    if(request.personal)try{personal=readPersonal(request.personal,p);}catch(error){return failure('conflict','personal-binding',(error as Error).message);}
    if(personal)try{
      if(personal.layer)await validateLayerAsync(personal.layer,p);
      for(const layer of personal.history)await validateLayerAsync(layer,p,{history:true});
    }catch(error){return failure('conflict','personal-layer',(error as Error).message);}
    interrupted();
    const active=personal?.layer??p.fingerLayer;
    if(!active)return{status:'reading',packageBytes:original,package:p,availableFingerPresentations:[],...(personal?{personal}:{})};
    const layer=await validateLayerAsync(active,p,{requireCurrent:false});
    // A provided RR layer gets its fixed-route replay; nothing is recalculated.
    if(!currentLayer(layer)&&layer.version==='physical-attack-finger-layer-v1'&&layer.physicalRowOrder==='rr-even-far-last-v1'&&
      layer.profileId===RR_PERFORMANCE_POSE_PROFILE.id&&['released-owner-actions-v1','released-owner-actions-v1/viewer-bounded-performance-v2'].includes(layer.plannerVersion))
      replayProvidedRRLayer(p,layer);
    interrupted();
    const edited=!!personal&&Object.keys(personal.overrides).length>0;
    return{status:layer.version===PIANO_ASSIGNMENT_VERSION||edited?'editable':'ready',packageBytes:original,package:p,layer,
      availableFingerPresentations:p.fingerEligibility.eligible?['annotations','replacement']:['annotations'],...(personal?{personal}:{})};
  }catch(error){
    if(error instanceof Cancelled||request.signal?.aborted)return failure('cancelled','cancelled',CANCELLED);
    if(error instanceof HandPresentationError)return failure(error.code==='authority'?'conflict':'unsupported','hand-presentation:'+error.code,
      error.message+(error.ownerIds.length?' Owners: '+error.ownerIds.join(', ')+'.':'')+' The edition and saved choices are retained.');
    return failure('unsupported','readiness-admission',(error as Error).message);
  }
}
