import {invoke,isTauri} from '@tauri-apps/api/core';
import {effectivePianoPreferences,type PianoPreferences} from './piano-preferences';
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
 download:():Promise<void>=>invoke('piano_bank_download'),
 audioStatus:():Promise<PianoAudioStatus>=>isTauri()?invoke('piano_audio_status'):Promise.resolve(browserAudio()),
 configure:(preferences:PianoPreferences,device:string,installed:boolean):Promise<PianoAudioStatus>=>{const p=effectivePianoPreferences(preferences,installed);return isTauri()?invoke('piano_audio_configure',{enabled:p.enabled,volume:p.volume,latencyTier:p.latencyTier,device}):Promise.resolve(browserAudio());},
 windowsHelp:():Promise<void>=>invoke('piano_audio_help')
};
