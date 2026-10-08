/** Additive optional-sound settings; never project these into score/MIDI state. */
export interface PianoPreferences {version:1;enabled:boolean;volume:number;latencyTier:0|1|2|3}
export const defaultPianoPreferences=():PianoPreferences=>({version:1,enabled:false,volume:.7,latencyTier:0});
export function readPianoPreferences(value:unknown):PianoPreferences {
 if(value===undefined)return defaultPianoPreferences();
 if(!value||typeof value!=='object')throw Error('Saved piano settings differ; sound is off and the saved settings are retained.');
 const v=value as Partial<PianoPreferences>;
 if(v.version!==1||typeof v.enabled!=='boolean'||typeof v.volume!=='number'||!Number.isFinite(v.volume)||v.volume<0||v.volume>1||!Number.isInteger(v.latencyTier)||Number(v.latencyTier)<0||Number(v.latencyTier)>3)throw Error('Saved piano settings differ; sound is off and the saved settings are retained.');
 return {version:1,enabled:v.enabled,volume:v.volume,latencyTier:v.latencyTier!};
}
export const effectivePianoPreferences=(preferences:PianoPreferences,installed:boolean):PianoPreferences=>({...preferences,enabled:installed&&preferences.enabled});
export const pianoTierLabels=['Lowest','Low','Medium','High'] as const;
