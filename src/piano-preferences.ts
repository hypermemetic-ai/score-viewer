/** Additive optional-sound settings; never project these into score/MIDI state. */
/** `cueVolume` is the metronome and practice cues; absent means the default, so settings saved before it read unchanged. */
export interface PianoPreferences {version:1;enabled:boolean;volume:number;latencyTier:0|1|2|3;cueVolume?:number}
export const defaultPianoPreferences=():PianoPreferences=>({version:1,enabled:false,volume:.7,latencyTier:0});
export function readPianoPreferences(value:unknown):PianoPreferences {
 if(value===undefined)return defaultPianoPreferences();
 if(!value||typeof value!=='object')throw Error('Saved piano settings differ; sound is off and the saved settings are retained.');
 const v=value as Partial<PianoPreferences>;
 if(v.version!==1||typeof v.enabled!=='boolean'||typeof v.volume!=='number'||!Number.isFinite(v.volume)||v.volume<0||v.volume>1||(v.cueVolume!==undefined&&!(typeof v.cueVolume==='number'&&Number.isFinite(v.cueVolume)&&v.cueVolume>=0&&v.cueVolume<=1))||!Number.isInteger(v.latencyTier)||Number(v.latencyTier)<0||Number(v.latencyTier)>3)throw Error('Saved piano settings differ; sound is off and the saved settings are retained.');
 return {version:1,enabled:v.enabled,volume:v.volume,latencyTier:v.latencyTier!,...(v.cueVolume===undefined?{}:{cueVolume:v.cueVolume})};
}
export const effectivePianoPreferences=(preferences:PianoPreferences,installed:boolean):PianoPreferences=>({...preferences,enabled:installed&&preferences.enabled});
export const pianoTierLabels=['Lowest','Low','Medium','High'] as const;
/** The metronome's setting, 70% unless chosen. */
export const cueVolume=(preferences:PianoPreferences)=>preferences.cueVolume??.7;
/** The gain the native mixer gives the metronome at a setting (audio_mixer.rs
 * cue_gain): 70% is the earlier fixed level, 100% is 6 dB louder, 0 is silent. */
export const cueGain=(setting:number)=>Math.pow(Math.max(0,Math.min(1,setting))/.7,Math.LN2/Math.log(1/.7));
/** Built-in (browser) clicks follow the metronome setting too. */
export const builtInClicks={gain:1};
