import {
 STRETCH_CALIBRATION_KEYBOARD_PROFILE as profile,STRETCH_CALIBRATION_PROFILE_SHA256,
 type CalibrationFinger,type StretchCalibrationActuator,type StretchCalibrationContact,
 type StretchCalibrationGeometry,type StretchCalibrationSurface,type StretchContactLocation,
} from '@hypermemetic-ai/fingering-calculator';

export type {StretchCalibrationContact,StretchCalibrationGeometry} from '@hypermemetic-ai/fingering-calculator';
export type StretchPoint=readonly [x:number,depth:number,height:number];
export interface StretchWorldPoint {x:number;depth:number;height:number;motion:'resting'|'estimated'|'measured'}
export interface StretchBodyProfile {
 bodyWidthMm:number;top:StretchPoint[];mounting:StretchPoint[];
}

/** The contract hashes sorted JSON data, not insertion order or the seed's formatting. */
export function canonicalStretchJson(value:unknown):string {
 const seen=new Set<object>();
 const sorted=(input:unknown):unknown=>{
  if(input===null||typeof input==='string'||typeof input==='boolean')return input;
  if(typeof input==='number'){if(!Number.isFinite(input))throw Error('Calibration geometry contains a nonfinite number.');return input;}
  if(typeof input!=='object')throw Error('Calibration geometry must contain JSON data only.');
  if(seen.has(input))throw Error('Calibration geometry contains circular data.');
  seen.add(input);
  const result=Array.isArray(input)?input.map(sorted):Object.fromEntries(Object.keys(input).sort().map(key=>[key,sorted((input as Record<string,unknown>)[key])]));
  seen.delete(input);return result;
 };
 return JSON.stringify(sorted(value));
}

export async function hashStretchGeometry(geometry:Omit<StretchCalibrationGeometry,'snapshotSha256'>|StretchCalibrationGeometry):Promise<string> {
 const {snapshotSha256:_,...snapshot}=geometry as StretchCalibrationGeometry;
 const bytes=new TextEncoder().encode(canonicalStretchJson(snapshot));
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}

const pitchClass=(pitch:number)=>((pitch%12)+12)%12;
function formForPitch(pitch:number){
 const form=profile.forms.find(item=>(item.midiPitchClasses as readonly number[]).includes(pitchClass(pitch)));
 if(!form)throw Error(`No regularized keyboard form for MIDI pitch ${pitch}.`);
 return form;
}

/** An explicit operator range is mandatory; the profile origin is only a coordinate origin. */
export async function createStretchGeometry(range:readonly [number,number]):Promise<StretchCalibrationGeometry> {
 if(!Array.isArray(range)||range.length!==2||!range.every(p=>Number.isInteger(p)&&p>=0&&p<=127)||range[0]>range[1])throw Error('Choose a valid admitted MIDI range before creating calibration geometry.');
 const actuators:StretchCalibrationActuator[]=[],surfaces:StretchCalibrationSurface[]=[];
 for(let pitch=range[0];pitch<=range[1];pitch++){
  const form=formForPitch(pitch),originXmm=(pitch-profile.originMidiPitch)*profile.pitchIncrementMm,id=`key-${pitch}`;
  actuators.push({id,midiPitch:pitch,bodyForm:form.form,originXmm,pressedMotion:{
   kind:profile.pressedMotion.kind,transform:[...profile.pressedMotion.transform],reference:profile.pressedMotion.reference,uncertaintyMm:profile.pressedMotion.uncertaintyMm,
  }});
  for(const terrace of form.playableTerraces)surfaces.push({
   id:`${id}-row-${terrace.row}`,actuatorId:id,midiPitch:pitch,row:terrace.row,
   xMinMm:originXmm-profile.usableWidthMm/2,xMaxMm:originXmm+profile.usableWidthMm/2,
   depthMinMm:terrace.depthMinMm,depthMaxMm:terrace.depthMaxMm,heightAtNearMm:terrace.heightAtNearMm,heightAtFarMm:terrace.heightAtFarMm,
  });
 }
 const snapshot:Omit<StretchCalibrationGeometry,'snapshotSha256'>={
  version:'sloping-calibration-geometry-v1',geometryId:`${profile.profileId}:midi-${range[0]}-${range[1]}`,
  keyboardId:profile.profileId,profileId:profile.profileId,profileSha256:STRETCH_CALIBRATION_PROFILE_SHA256,units:'mm',
  reference:`Regularized RR/Jankó profile ${profile.profileId}; complete top and mounting profiles retained by profile SHA-256.`,
  originMidiPitch:profile.originMidiPitch,admittedMidiRange:[range[0],range[1]],actuators,surfaces,
 };
 return {...snapshot,snapshotSha256:await hashStretchGeometry(snapshot)};
}

export function stretchSurface(geometry:StretchCalibrationGeometry,surfaceId:string):StretchCalibrationSurface {
 const surface=geometry.surfaces.find(item=>item.id===surfaceId);
 if(!surface)throw Error(`The playable surface ${surfaceId} is outside this geometry.`);
 return surface;
}
export function stretchActuator(geometry:StretchCalibrationGeometry,actuatorId:string):StretchCalibrationActuator {
 const actuator=geometry.actuators.find(item=>item.id===actuatorId);
 if(!actuator)throw Error(`The actuator ${actuatorId} is outside this geometry.`);
 return actuator;
}

function validateLocation(location:StretchContactLocation,surfaceId:string):void {
 if(location.surfaceId!==surfaceId)throw Error('Contact location belongs to a different surface.');
 const unit=(value:number)=>Number.isFinite(value)&&value>=0&&value<=1;
 if(location.kind==='surface-region'){
  if(!location.uRange.every(unit)||!location.vRange.every(unit)||location.uRange[0]>location.uRange[1]||location.vRange[0]>location.vRange[1])throw Error('Contact region must lie within its playable terrace.');
 }else if(!unit(location.u)||!unit(location.v))throw Error('Contact point must lie within its playable terrace.');
}

export function surfaceContact(geometry:StretchCalibrationGeometry,finger:CalibrationFinger,surfaceId:string,keyState:StretchCalibrationContact['keyState']='depressed',location?:StretchContactLocation):StretchCalibrationContact {
 if(!Number.isInteger(finger)||finger<1||finger>5)throw Error('A calibration contact requires finger 1–5.');
 if(keyState!=='resting-contact'&&keyState!=='depressed')throw Error('A calibration contact requires an explicit supported key state.');
 const surface=stretchSurface(geometry,surfaceId),chosen=location??{kind:'surface-region',surfaceId,uRange:[0,1],vRange:[0,1]};
 validateLocation(chosen,surfaceId);
 return {finger,actuatorId:surface.actuatorId,midiPitch:surface.midiPitch,row:surface.row,keyState,location:structuredClone(chosen)};
}

export function sameRowContact(geometry:StretchCalibrationGeometry,finger:CalibrationFinger,pitch:number,row:StretchCalibrationSurface['row']):StretchCalibrationContact {
 const surface=geometry.surfaces.find(item=>item.midiPitch===pitch&&item.row===row);
 if(!surface)throw Error(`MIDI pitch ${pitch} has no admitted playable row ${row}.`);
 return surfaceContact(geometry,finger,surface.id);
}

/** Local coordinates preserve physical depth regardless of camera orientation. */
export function surfaceLocalPoint(surface:StretchCalibrationSurface,u:number,v:number):StretchPoint {
 if(!Number.isFinite(u)||!Number.isFinite(v))throw Error('Surface coordinates must be finite.');
 return [surface.xMinMm+u*(surface.xMaxMm-surface.xMinMm),surface.depthMinMm+v*(surface.depthMaxMm-surface.depthMinMm),surface.heightAtNearMm+v*(surface.heightAtFarMm-surface.heightAtNearMm)];
}

export function transformStretchPoint(point:StretchPoint,transform:readonly number[]):StretchPoint {
 if(transform.length!==16||!transform.every(Number.isFinite))throw Error('Actuator motion must be a finite row-major 4×4 transform.');
 const [x,d,h]=point;
 const w=transform[12]*x+transform[13]*d+transform[14]*h+transform[15];
 if(Math.abs(w-1)>1e-9)throw Error('Actuator motion must be a rigid homogeneous transform.');
 return [transform[0]*x+transform[1]*d+transform[2]*h+transform[3],transform[4]*x+transform[5]*d+transform[6]*h+transform[7],transform[8]*x+transform[9]*d+transform[10]*h+transform[11]];
}

export function actuatorWorldPoint(actuator:StretchCalibrationActuator,point:StretchPoint,keyState:StretchCalibrationContact['keyState']):StretchPoint|null {
 if(keyState==='resting-contact')return [...point];
 return actuator.pressedMotion.kind==='unknown'?null:transformStretchPoint(point,actuator.pressedMotion.transform);
}

/** A returned depressed point is modeled with the retained motion status, never measured by this helper. */
export function surfaceWorldPoint(geometry:StretchCalibrationGeometry,surfaceId:string,u:number,v:number,keyState:StretchCalibrationContact['keyState']='resting-contact'):StretchWorldPoint|null {
 const surface=stretchSurface(geometry,surfaceId),actuator=stretchActuator(geometry,surface.actuatorId);
 const point=actuatorWorldPoint(actuator,surfaceLocalPoint(surface,u,v),keyState);
 if(!point)return null;
 return {x:point[0],depth:point[1],height:point[2],motion:keyState==='resting-contact'?'resting':actuator.pressedMotion.kind==='measured-rigid-transform'?'measured':'estimated'};
}

export function surfaceLocationFromDepth(geometry:StretchCalibrationGeometry,surfaceId:string,depthMm:number,u=.5):{u:number;v:number} {
 const surface=stretchSurface(geometry,surfaceId);
 if(!Number.isFinite(depthMm)||!Number.isFinite(u))throw Error('Measurement position must be finite.');
 return {u,v:(depthMm-surface.depthMinMm)/(surface.depthMaxMm-surface.depthMinMm)};
}

/** Rendering resolves the complete seed solid through its exact profile identity. */
export function stretchActuatorBody(geometry:StretchCalibrationGeometry,actuatorId:string):StretchBodyProfile {
 if(geometry.profileId!==profile.profileId||geometry.profileSha256!==STRETCH_CALIBRATION_PROFILE_SHA256)throw Error('The geometry uses a different physical keyboard profile.');
 const actuator=stretchActuator(geometry,actuatorId),form=profile.forms.find(item=>item.form===actuator.bodyForm);
 if(!form)throw Error('The actuator body form is unavailable.');
 return {bodyWidthMm:profile.bodyWidthMm,
  top:form.bodyTopProfileDepthHeightMm.map(([depth,height])=>[actuator.originXmm,depth,height]),
  mounting:form.bodyMountingProfileDepthHeightMm.map(([depth,height])=>[actuator.originXmm,depth,height]),
 };
}
