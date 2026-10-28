import type {EncodedDerivedPayload} from './derived-payload';
import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';

/** `admit`: admit the archive first, and engrave it again only if opening
 * would (a reading, whose admission replays its pages). `layouts`: engrave
 * only these keyboard layouts of a piano edition, as opening on the layout in
 * use does. `earlier`: `bytes` is an edition that left `layouts` for later,
 * and this is the earlier edition to engrave them from (completeEdition). */
export interface EngraveAgainRequest {bytes:Uint8Array;admit?:boolean;layouts?:PhysicalKeyboardId[];earlier?:Uint8Array}
/** One derived file the worker made on the way: an engraving made again, or
 * a receipt for checks its admission ran. Encoded where it was made. */
export interface EngraveAgainRecord {kind:string;key:string;encoded:EncodedDerivedPayload;tag?:string}
/** What the worker made, and why it stopped short when it did: content
 * that doesn't read, or pages the current engraving can't make. */
export interface EngraveAgainReply {made:EngraveAgainRecord[];error?:string}
/** The kinds a worker may hand back, and nothing else. */
export const ENGRAVE_AGAIN_KINDS:readonly string[]=['engraved-again-v1','reading-admission-v1','piano-page-checks-v1','calculated-admission-v1'];

/** Engraves a saved archive again in a worker of its own, which is stopped
 * when it answers or `signal` aborts, so it holds no memory afterwards. A
 * worker that fails to load or runs out of memory rejects: that is no answer
 * about the archive. */
export function engraveAgainInWorker(bytes:Uint8Array,signal?:AbortSignal,admit=false,more:{layouts?:PhysicalKeyboardId[];earlier?:Uint8Array}={}):Promise<EngraveAgainReply>{
 return new Promise((resolve,reject)=>{
  const stopped=()=>new DOMException('Engraving again stopped.','AbortError');
  if(signal?.aborted){reject(stopped());return;}
  let worker:Worker;
  try{worker=new Worker(new URL('./engrave-again-worker.ts',import.meta.url),{type:'module'});}catch(error){reject(error);return;}
  const finish=()=>{worker.terminate();signal?.removeEventListener('abort',abort);},
   abort=()=>{finish();reject(stopped());};
  signal?.addEventListener('abort',abort,{once:true});
  worker.addEventListener('message',(event:MessageEvent<EngraveAgainReply>)=>{finish();resolve(event.data);});
  worker.addEventListener('messageerror',()=>{finish();reject(Error('The engraving worker sent an unreadable answer.'));});
  worker.addEventListener('error',event=>{event.preventDefault();finish();reject(Error(`The engraving worker stopped: ${event.message||'it could not run'}`));});
  const copy=new Uint8Array(bytes),earlier=more.earlier?new Uint8Array(more.earlier):undefined;
  worker.postMessage({bytes:copy,admit,...(more.layouts?{layouts:more.layouts}:{}),...(earlier?{earlier}:{})} satisfies EngraveAgainRequest,[copy.buffer,...(earlier?[earlier.buffer]:[])]);
 });
}
