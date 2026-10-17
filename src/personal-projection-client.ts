import {HandPresentationError,type PersonalOwnerHand} from '../vendor/iso-notation/src/score-presentation';
import type {ProjectionCoreInputs,ProjectionRequest,ProjectionResponse,ProjectionView,SerializedProjectionError} from './personal-projection-protocol';
import {checkReadingExecution,type ReadingExecution} from './reading-execution';

export interface ProjectionWorkerLike {
 postMessage(message:ProjectionRequest):void;terminate():void;
 onmessage:((event:MessageEvent<ProjectionResponse>)=>void)|null;onerror:((event:Event)=>void)|null;
}
/** The worker could not be started or stopped unexpectedly; the caller works on its own thread instead. */
export class ProjectionWorkerUnavailable extends Error {constructor(message='Hand drawing is unavailable off the reader thread.'){super(message);this.name='ProjectionWorkerUnavailable';}}

export function deserializeProjectionError(error:SerializedProjectionError):Error {
 if(error.name==='HandPresentationError'&&error.code)return new HandPresentationError(error.code as HandPresentationError['code'],error.message,error.ownerIds??[],(error.context??{}) as HandPresentationError['context']);
 if(error.name==='AbortError')return new DOMException(error.message,'AbortError');
 const result=Error(error.message);result.name=error.name;return result;
}
interface Pending {request:ProjectionRequest;inputs:ProjectionCoreInputs;execution?:ReadingExecution;resolve(view:ProjectionView|undefined):void;reject(error:unknown):void;cleanup():void}

/** One projection worker for the reader. Cores are identified by the
 * caller's digest of the captured package; the worker may forget one at any
 * time and is then given its inputs again. Cancelling running work stops the
 * worker, since a running ISO step cannot be interrupted any other way. */
export class ProjectionWorkerClient {
 private worker?:ProjectionWorkerLike;
 private known=new Set<string>();
 private pending=new Map<number,Pending>();
 private sequence=0;
 private answered=false;
 private failed=false;
 constructor(private readonly spawn:()=>ProjectionWorkerLike){}
 get available(){return !this.failed;}
 private start():ProjectionWorkerLike {
  if(this.worker)return this.worker;
  if(this.failed)throw new ProjectionWorkerUnavailable();
  let worker:ProjectionWorkerLike;
  try{worker=this.spawn();}catch{this.failed=true;throw new ProjectionWorkerUnavailable();}
  worker.onmessage=event=>this.receive(worker,event.data);
  worker.onerror=()=>this.lose(worker,!this.answered);
  this.worker=worker;this.known.clear();return worker;
 }
 /** A worker that never answered cannot run here; a crash later restarts it once per request. */
 private lose(worker:ProjectionWorkerLike,permanent:boolean){
  if(this.worker!==worker)return;
  try{worker.terminate();}catch{/* already gone */}
  this.worker=undefined;this.known.clear();if(permanent)this.failed=true;
  const lost=[...this.pending.values()];this.pending.clear();
  for(const p of lost){p.cleanup();p.reject(new ProjectionWorkerUnavailable());}
 }
 private send(p:Pending){
  const worker=this.start(),create=this.known.has(p.request.key)?undefined:p.inputs;
  this.known.add(p.request.key);worker.postMessage({...p.request,...(create?{create}:{})});
 }
 private receive(worker:ProjectionWorkerLike,response:ProjectionResponse){
  if(this.worker!==worker)return;this.answered=true;
  const p=this.pending.get(response.id);if(!p)return;
  if(response.kind==='stage'){try{p.execution?.onCheckpoint?.(response.stage);}catch{/* the caller's own signal reports cancellation */}return;}
  if(response.kind==='missing'){this.known.delete(p.request.key);this.send(p);return;}
  this.pending.delete(response.id);p.cleanup();
  if(response.kind==='done')p.resolve(response.view);else{if(response.error.name!=='HandPresentationError')this.known.delete(p.request.key);p.reject(deserializeProjectionError(response.error));}
 }
 private request(base:{kind:'warm'}|{kind:'project';owners:PersonalOwnerHand[];digest:string},key:string,inputs:ProjectionCoreInputs,execution?:ReadingExecution):Promise<ProjectionView|undefined>{
  checkReadingExecution(execution);
  return new Promise((resolve,reject)=>{
   const id=++this.sequence,signal=execution?.signal,abort=()=>{
    const p=this.pending.get(id);if(!p)return;this.pending.delete(id);p.cleanup();
    // Stop the running step; other queued requests start again on a fresh worker.
    const worker=this.worker,others=[...this.pending.values()];this.pending.clear();
    if(worker){try{worker.terminate();}catch{/* already gone */}this.worker=undefined;this.known.clear();}
    p.reject(new DOMException('Reading preparation was cancelled.','AbortError'));
    for(const other of others){this.pending.set(other.request.id,other);try{this.send(other);}catch(error){this.pending.delete(other.request.id);other.cleanup();other.reject(error);}}
   };
   const p:Pending={request:{id,key,...base} as ProjectionRequest,inputs,execution,resolve,reject,cleanup:()=>signal?.removeEventListener('abort',abort)};
   signal?.addEventListener('abort',abort,{once:true});
   this.pending.set(id,p);
   try{this.send(p);}catch(error){this.pending.delete(id);p.cleanup();reject(error);}
  });
 }
 /** Settle a core's engraving ahead of its first projection. */
 warm(key:string,inputs:ProjectionCoreInputs,execution?:ReadingExecution):Promise<void>{return this.request({kind:'warm'},key,inputs,execution).then(()=>undefined);}
 async project(key:string,inputs:ProjectionCoreInputs,owners:readonly PersonalOwnerHand[],digest:string,execution?:ReadingExecution):Promise<ProjectionView>{
  const view=await this.request({kind:'project',owners:owners.map(o=>({...o})),digest},key,inputs,execution);
  if(!view)throw Error('The hand drawing worker returned no pages.');
  return view;
 }
}
/** The reader's projection worker, built as its own module chunk. */
export const projectionWorkerClient=()=>new ProjectionWorkerClient(()=>
 new Worker(new URL('./personal-projection-worker.ts',import.meta.url),{type:'module'}) as unknown as ProjectionWorkerLike);
