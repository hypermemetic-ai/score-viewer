import {
 createIdealJankoCalibrationKeyboard, createConventionalCalibrationKeyboard,
 createExploratoryCalibrationPlan, validateExploratoryCalibrationSession,
 type IdealJankoCalibrationGeometry, type ConventionalCalibrationGeometry,
 type ExploratoryCalibrationPlan, type ExploratoryCalibrationSession,
} from '@hypermemetic-ai/fingering-calculator';

export const PILOT_FILE = 'calibration-pilot-v1.json';
export const PILOT_ARCHIVE_VERSION = 'viewer-calibration-pilot-v1';
export type PilotInstrument = 'conventional-piano' | 'janko-four-row';
export type PilotProfile =
 | {instrument:'janko-four-row';geometry:IdealJankoCalibrationGeometry}
 | {instrument:'conventional-piano';geometry:ConventionalCalibrationGeometry};
export interface PilotSetup {
 instrument:PilotInstrument;hand:'LH'|'RH';anchorMidiPitches:number[];profile?:PilotProfile;
 setupId:string;bodyMidlineXmm:number;reference:string;
}
export interface PilotArchive {
 version:typeof PILOT_ARCHIVE_VERSION;playerId:string;activeSessionId:string|null;
 sessions:ExploratoryCalibrationSession[];
}
export interface PilotLoad {value:PilotArchive;error?:string;raw?:Uint8Array}
export interface PilotFiles {read(name:string):Promise<Uint8Array|null>;write(name:string,bytes:Uint8Array):Promise<void>}

const nonblank=(value:unknown,name:string):string=>{
 if(typeof value!=='string'||!value.trim())throw Error(`Missing ${name}.`);return value;
};
/** Starting estimates, not hardware measurements. Every dimension remains editable before collection. */
export function nominalPilotProfile(instrument:PilotInstrument):PilotProfile {
 const shared={minMidiPitch:21,maxMidiPitch:108,reference:'Viewer editable nominal dimensions, not instrument measurements'};
 if(instrument==='janko-four-row')return{instrument,geometry:{...shared,geometryId:'viewer-nominal-janko-v1',originMidiPitch:60,
  usableWidthMm:9,sideMarginMm:.5,oppositeParityGapMm:5,usableDepthMm:18,
  rowDepthsMm:[0,20,40,60],rowHeightsMm:[0,0,15,15],keyTravelMm:10}};
 if(instrument==='conventional-piano')return{instrument,geometry:{...shared,geometryId:'viewer-nominal-piano-v1',
  whiteWidthMm:24,whiteDepthMm:150,blackWidthMm:14,blackDepthMm:90,blackFrontDepthMm:50,
  blackHeightMm:12,whiteTravelMm:10,blackTravelMm:9,sideMarginMm:.5}};
 throw Error('Choose a supported calibration instrument.');
}
/** Bind the literal declared dimensions into identity; no hash collision or silent profile remapping. */
export function createPilotPlan(setup:PilotSetup):ExploratoryCalibrationPlan {
 const profile=setup.profile??nominalPilotProfile(setup.instrument);
 if(profile.instrument!==setup.instrument)throw Error('The physical profile differs from the selected instrument.');
 nonblank(profile.geometry.geometryId,'geometry identity');nonblank(profile.geometry.reference,'geometry reference');
 const dimensions=profile.instrument==='janko-four-row'
  ? [profile.geometry.minMidiPitch,profile.geometry.maxMidiPitch,profile.geometry.originMidiPitch,profile.geometry.usableWidthMm,
     profile.geometry.sideMarginMm,profile.geometry.oppositeParityGapMm,profile.geometry.usableDepthMm,
     profile.geometry.rowDepthsMm,profile.geometry.rowHeightsMm,profile.geometry.keyTravelMm]
  : [profile.geometry.minMidiPitch,profile.geometry.maxMidiPitch,profile.geometry.whiteWidthMm,profile.geometry.whiteDepthMm,
     profile.geometry.blackWidthMm,profile.geometry.blackDepthMm,profile.geometry.blackFrontDepthMm,
     profile.geometry.blackHeightMm,profile.geometry.whiteTravelMm,profile.geometry.blackTravelMm,profile.geometry.sideMarginMm];
 const geometryId=JSON.stringify(['viewer-nominal-profile-v1',profile.instrument,profile.geometry.geometryId,dimensions]);
 const keyboard=profile.instrument==='janko-four-row'
  ? createIdealJankoCalibrationKeyboard({...profile.geometry,geometryId})
  : createConventionalCalibrationKeyboard({...profile.geometry,geometryId});
 return createExploratoryCalibrationPlan({keyboard,hand:setup.hand,anchorMidiPitches:setup.anchorMidiPitches});
}
export function initialPilotArchive(playerId:string=crypto.randomUUID()):PilotArchive {
 return{version:PILOT_ARCHIVE_VERSION,playerId:nonblank(playerId,'player identity'),activeSessionId:null,sessions:[]};
}
export function validatePilotArchive(value:unknown):PilotArchive {
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Unsupported exploratory calibration archive.');
 const data=value as Record<string,unknown>,keys=Object.keys(data);
 if(data.version!==PILOT_ARCHIVE_VERSION||keys.length!==4||keys.some(key=>!['version','playerId','activeSessionId','sessions'].includes(key))||
  !Array.isArray(data.sessions))throw Error('Unsupported exploratory calibration archive.');
 const playerId=nonblank(data.playerId,'player identity'),sessions=data.sessions.map(validateExploratoryCalibrationSession),ids=new Set<string>();
 for(const session of sessions){
  if(session.provenance.playerId!==playerId||ids.has(session.id))throw Error('Calibration session identity differs or is duplicated.');
  ids.add(session.id);
 }
 if(data.activeSessionId!==null&&(typeof data.activeSessionId!=='string'||!ids.has(data.activeSessionId)))throw Error('Unknown active calibration session.');
 return{version:PILOT_ARCHIVE_VERSION,playerId,activeSessionId:data.activeSessionId as string|null,sessions};
}
export async function loadPilot(files:PilotFiles):Promise<PilotLoad> {
 let raw:Uint8Array|null=null;
 try {
  raw=await files.read(PILOT_FILE);
  return{value:raw?validatePilotArchive(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw))):initialPilotArchive()};
 }catch(error){
  return{value:initialPilotArchive(),raw:raw?new Uint8Array(raw):undefined,
   error:`${error instanceof Error?error.message:String(error)} Saved pilot evidence is read-only and available for export.`};
 }
}
export function pilotBytes(value:PilotArchive):Uint8Array {
 return new TextEncoder().encode(JSON.stringify(validatePilotArchive(value)));
}
export function exportPilot(load:PilotLoad):string {
 if(load.error){
  let binary='';const raw=load.raw??new Uint8Array();
  for(let i=0;i<raw.length;i+=16384)binary+=String.fromCharCode(...raw.subarray(i,i+16384));
  return JSON.stringify({kind:'Retained exploratory calibration bytes',filename:PILOT_FILE,error:load.error,
   encoding:'base64',bytes:raw.length,data:btoa(binary)},null,2);
 }
 return JSON.stringify(validatePilotArchive(load.value),null,2);
}
