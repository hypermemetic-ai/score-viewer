import {STRETCH_CALIBRATION_KEYBOARD_PROFILE as profile} from '@hypermemetic-ai/fingering-calculator';
import {createStretchGeometry,hashStretchGeometry} from './stretch-calibration-geometry';
import type {StretchCreateCollection} from './stretch-calibration-controller';

export const NOMINAL_STRETCH_SETUP_DECLARATION='viewer-nominal-stretch-frame-v1: app-proposed protocol frame with nominal origin 0 mm; body position and seating unmeasured; physical keyboard endpoints unverified.';
export const DEFAULT_STRETCH_ROW=1 as const;
export const DEFAULT_STRETCH_CENTRAL_PITCH=profile.originMidiPitch+1;
/** An operational collection window, not a statement of the player's hardware endpoints. */
export const DEFAULT_STRETCH_WORKING_RANGE=Object.freeze([
 DEFAULT_STRETCH_CENTRAL_PITCH-24,DEFAULT_STRETCH_CENTRAL_PITCH+24,
] as const);

export interface DefaultStretchSetupOptions {
 playerId:string;hand:StretchCreateCollection['provenance']['hand'];
 instrument:'janko-four-row'|'conventional-piano';setupId?:string;
}

/** Retained declarations distinguish automatic test-window edges from older hardware coverage. */
export function isNominalStretchSetup(value:{provenance:StretchCreateCollection['provenance']}|null|undefined):boolean {
 return value?.provenance.seatingReference===NOMINAL_STRETCH_SETUP_DECLARATION;
}

/** Starting the displayed test selects this proposed centre; it does not measure a body pose. */
export async function createDefaultStretchSetup(input:DefaultStretchSetupOptions):Promise<StretchCreateCollection> {
 if(input.instrument!=='janko-four-row')throw Error('This stretch collection requires the accepted RR/Jankó keyboard model.');
 if(input.hand!=='RH'&&input.hand!=='LH')throw Error('Choose a valid performing hand.');
 if(typeof input.playerId!=='string'||!input.playerId.trim())throw Error('Calibration needs its saved player identity.');
 const setupId=input.setupId??crypto.randomUUID();
 if(typeof setupId!=='string'||!setupId.trim())throw Error('Calibration needs a valid setup identity.');
 const geometry=await createStretchGeometry(DEFAULT_STRETCH_WORKING_RANGE);
 geometry.geometryId=`${profile.profileId}:nominal-working-window-${DEFAULT_STRETCH_WORKING_RANGE.join('-')}`;
 geometry.reference+=` ${NOMINAL_STRETCH_SETUP_DECLARATION} Admitted MIDI ${DEFAULT_STRETCH_WORKING_RANGE.join('–')} is operational test-window coverage, not an attestation of the physical keyboard range.`;
 geometry.snapshotSha256=await hashStretchGeometry(geometry);
 return {
  geometry,row:DEFAULT_STRETCH_ROW,anchorMidiPitch:DEFAULT_STRETCH_CENTRAL_PITCH,
  referenceFrameId:`${setupId}:nominal-forward-depth:row-${DEFAULT_STRETCH_ROW}`,
  provenance:{playerId:input.playerId,hand:input.hand,setupId,bodyMidlineXmm:0,
   seatingReference:NOMINAL_STRETCH_SETUP_DECLARATION,
   referenceLocation:{id:`${setupId}:nominal-central-key-${DEFAULT_STRETCH_CENTRAL_PITCH}`,kind:'operator-selected-central',
    xMm:(DEFAULT_STRETCH_CENTRAL_PITCH-profile.originMidiPitch)*profile.pitchIncrementMm}},
 };
}
