import {STRETCH_CALIBRATION_KEYBOARD_PROFILE as profile,STRETCH_CALIBRATION_PROFILE_SHA256,
 type StretchCalibrationGeometry,type StretchCalibrationSurface,type StretchFingerPair} from '@hypermemetic-ai/fingering-calculator';

export const STRETCH_FINGERTIP_LANDMARK_VERSION='viewer-fingertip-landmarks-v2' as const;
export interface StretchFingertipWindow {
 surface:StretchCalibrationSurface;
 /** Local visual 0% and 100% in the common physical forward-depth frame. */
 axisStartMm:number;axisEndMm:number;
 zeroLandmarkSurface:StretchCalibrationSurface;
}
export interface StretchFingertipMapping {
 version:typeof STRETCH_FINGERTIP_LANDMARK_VERSION;hand:'RH'|'LH';pair:StretchFingerPair;
 first:StretchFingertipWindow;second:StretchFingertipWindow;
 /** One enclosing physical axis for the two fractions in the existing wire format. */
 axisStartMm:number;axisEndMm:number;windowId:string;windowReference:string;
}
function surface(geometry:StretchCalibrationGeometry,pitch:number,row:1|2|3):StretchCalibrationSurface {
 const result=geometry.surfaces.find(s=>s.midiPitch===pitch&&s.row===row);
 if(!result)throw Error(`Fingertip measurement requires admitted MIDI ${pitch}, row ${row}; its approved landmark is missing.`);
 return {...result};
}
function window(contact:StretchCalibrationSurface,zero:StretchCalibrationSurface):StretchFingertipWindow {
 const start=zero.depthMinMm,end=contact.depthMaxMm;
 if(!Number.isFinite(start)||!Number.isFinite(end)||start>=end||start<contact.depthMinMm)throw Error('The approved fingertip landmark window is not on its playable terrace.');
 return {surface:contact,zeroLandmarkSurface:zero,axisStartMm:start,axisEndMm:end};
}

/** Straight, flat fingers point along the keys; this is not the separate span drill. */
export function stretchFingertipMapping(geometry:StretchCalibrationGeometry,hand:'RH'|'LH',pair:StretchFingerPair):StretchFingertipMapping {
 if(hand!=='RH'&&hand!=='LH')throw Error('Fingertip landmarks require a valid performing hand.');
 if(!Array.isArray(pair)||pair.length!==2||!Number.isInteger(pair[0])||pair[0]<1||pair[0]>4||pair[1]!==pair[0]+1)throw Error('Fingertip landmarks require one of the four adjacent finger pairs.');
 if(geometry.profileId!==profile.profileId||geometry.profileSha256!==STRETCH_CALIBRATION_PROFILE_SHA256)throw Error('The approved fingertip landmarks require the accepted RR/Jankó geometry profile.');
 const actual=(canonical:number)=>hand==='LH'?124-canonical:canonical;
 let first:StretchFingertipWindow,second:StretchFingertipWindow;
 if(pair[0]===1){
  const thumb=surface(geometry,actual(61),1),index=surface(geometry,actual(64),2);
  first=window(thumb,index);
  second=window(index,surface(geometry,actual(61),3));
 }else{
  const firstContact=surface(geometry,actual(60),2),secondContact=surface(geometry,actual(62),2);
  const oppositeUpper=surface(geometry,actual(61),3);
  first=window(firstContact,oppositeUpper);second=window(secondContact,oppositeUpper);
 }
 const axisStartMm=Math.min(first.axisStartMm,second.axisStartMm),axisEndMm=Math.max(first.axisEndMm,second.axisEndMm);
 return {version:STRETCH_FINGERTIP_LANDMARK_VERSION,hand,pair:[pair[0],pair[1]],first,second,axisStartMm,axisEndMm,
  windowId:`${STRETCH_FINGERTIP_LANDMARK_VERSION}:${geometry.geometryId}:${geometry.snapshotSha256}:${hand}:${pair.join('-')}`,
  windowReference:`Approved finger-dependent landmarks in ${geometry.geometryId} (${geometry.snapshotSha256}); straight flat fingers parallel to the keys. Local 0% is the opposite-parity terrace crest; local 100% is the measured finger's own rear wall. ${hand==='LH'?'LH reflects the accepted examples by MIDI 124 minus canonical pitch.':'RH retains the accepted MIDI 61/64 thumb-index and MIDI 60/62 other-pair examples.'}`,
 };
}
function finite(value:number):number {if(!Number.isFinite(value))throw Error('Fingertip percentages must be finite.');return value;}
const depth=(window:StretchFingertipWindow,percent:number)=>window.axisStartMm+finite(percent)/100*(window.axisEndMm-window.axisStartMm);

/** Preserve local negative readings; never clamp them or equate different fingers' 100% walls. */
export function encodeStretchFingertipPercentages(mapping:StretchFingertipMapping,firstPercent:number,secondPercent:number):{firstFraction:number;secondFraction:number} {
 const width=mapping.axisEndMm-mapping.axisStartMm;
 return {firstFraction:(depth(mapping.first,firstPercent)-mapping.axisStartMm)/width,
  secondFraction:(depth(mapping.second,secondPercent)-mapping.axisStartMm)/width};
}

/** Decode only a record whose window identity and physical endpoints match this mapping. */
export function decodeStretchFingertipPercentages(mapping:StretchFingertipMapping,firstFraction:number,secondFraction:number):{firstPercent:number;secondPercent:number} {
 const width=mapping.axisEndMm-mapping.axisStartMm;
 const percent=(window:StretchFingertipWindow,fraction:number)=>(mapping.axisStartMm+finite(fraction)*width-window.axisStartMm)/(window.axisEndMm-window.axisStartMm)*100;
 return {firstPercent:percent(mapping.first,firstFraction),secondPercent:percent(mapping.second,secondFraction)};
}

/** The wire sign is always the second fingertip's forward depth minus the first's. */
export function stretchFingertipDifferenceMm(mapping:StretchFingertipMapping,firstPercent:number,secondPercent:number):number {
 return depth(mapping.second,secondPercent)-depth(mapping.first,firstPercent);
}
