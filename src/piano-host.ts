import {invoke,isTauri} from '@tauri-apps/api/core';
import {cueVolume,effectivePianoPreferences,type PianoPreferences} from './piano-preferences';
export interface PianoBankStatus {supported:boolean;installed:boolean;phase:string;progress:number|null;message:string;cancellable:boolean}
export interface PianoAudioStatus {enabled:boolean;ready:boolean;running:boolean;device:string;outputUid?:string;sampleRate:number;periodFrames:number;bufferFrames:number;raw:boolean;mode:string;fallback:string|null;error:string|null;latencyTier:number;renderedFrames?:number;peak?:number;queueOverflow?:number}
const browserBank=():PianoBankStatus=>({supported:false,installed:false,phase:'not-installed',progress:null,message:'Optional piano sound is available in the Windows and Mac desktop app.',cancellable:false});
const browserAudio=():PianoAudioStatus=>({enabled:false,ready:false,running:false,device:'',sampleRate:0,periodFrames:0,bufferFrames:0,raw:false,mode:'browser',fallback:null,error:null,latencyTier:0});
export const nativePiano={
 bankStatus:():Promise<PianoBankStatus>=>isTauri()?invoke('piano_bank_status'):Promise.resolve(browserBank()),
 /** Installed, without hashing the bank: answers at once. */
 bankPresent:():Promise<boolean>=>isTauri()?invoke('piano_bank_present'):Promise.resolve(false),
 install:():Promise<PianoBankStatus>=>invoke('piano_bank_install'),
 cancelInstall:():Promise<void>=>invoke('piano_bank_cancel'),
 /** One press: download, check and install the piano. */
 download:():Promise<PianoBankStatus>=>invoke('piano_bank_download'),
 audioStatus:():Promise<PianoAudioStatus>=>isTauri()?invoke('piano_audio_status'):Promise.resolve(browserAudio()),
 configure:(preferences:PianoPreferences,device:string,installed:boolean):Promise<PianoAudioStatus>=>{const p=effectivePianoPreferences(preferences,installed);return isTauri()?invoke('piano_audio_configure',{enabled:p.enabled,volume:p.volume,cueVolume:cueVolume(p),latencyTier:p.latencyTier,device}):Promise.resolve(browserAudio());},
 /** The volume heard now, while the Volume track is dragged; not saved. */
 preview:(volume:number):Promise<void>=>isTauri()?invoke('piano_audio_volume',{volume}):Promise.resolve(),
 /** The metronome volume heard now, while its track is dragged; not saved. */
 previewCue:(volume:number):Promise<void>=>isTauri()?invoke('cue_audio_volume',{volume}):Promise.resolve(),
 windowsHelp:():Promise<void>=>invoke('piano_audio_help')
};
