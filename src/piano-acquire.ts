import type {PianoBankStatus} from './piano-host';
import type {PianoPreferences} from './piano-preferences';

/** Phases in which the piano is being fetched or installed. */
export const busyPhases=['choosing','downloading','checking','installing'];
export const pianoBusy=(bank:PianoBankStatus)=>busyPhases.includes(bank.phase);
/** What Options shows the moment a press starts, before native status arrives. */
export const startingStatus=(bank:PianoBankStatus,kind:'download'|'file'):PianoBankStatus=>({...bank,cancellable:true,
 ...(kind==='file'?{phase:'choosing',message:'Choose the piano ZIP.',progress:null}:{phase:'downloading',message:'Downloading piano (1.7 GB)…',progress:0})});
/** The status line: an error first, then progress while busy; nothing once the piano is simply ready. */
export function pianoStatusText(bank:PianoBankStatus,error='',audioError?:string|null){
 if(error||audioError)return error||audioError!;
 const busy=pianoBusy(bank);
 if(bank.installed&&!busy&&!['error','cancelled'].includes(bank.phase))return '';
 return bank.message+(busy&&bank.progress!==null?` ${bank.progress}%`:'');
}
export interface PianoGetter {download():Promise<PianoBankStatus>;preferences():PianoPreferences;save(value:PianoPreferences):Promise<unknown>}
/** One press: download, check and install, then turn the sound on. A failure
 * or cancel leaves sound and every saved choice as they were. */
export async function getPiano(api:PianoGetter,warn:(message:string)=>void=()=>{}){
 const bank=await api.download();
 if(bank.installed&&!api.preferences().enabled)await api.save({...api.preferences(),enabled:true}).catch(error=>warn((error as Error).message));
 return bank;
}
const percent=(value:number)=>String(Math.round(value*1000000)/10000);
export const volumeText=percent;
/** A typed volume in percent, or undefined when it isn't 0 to 100. */
export function parseVolume(text:string){
 if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text.trim()))return undefined;
 const value=Number(text)/100;return Number.isFinite(value)&&value>=0&&value<=1?value:undefined;
}
/** The volume a pointer at clientX means on the track, in whole percent. */
export const trackVolume=(clientX:number,left:number,width:number)=>width>0?Math.max(0,Math.min(100,Math.round((clientX-left)/width*100)))/100:0;
