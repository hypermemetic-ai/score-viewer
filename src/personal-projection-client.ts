import {HandPresentationError,type PersonalHandEngineState,type PersonalOwnerHand} from '../vendor/iso-notation/src/score-presentation';
import type {ProjectionCoreInputs,ProjectionRequest,ProjectionResponse,ProjectionView,SerializedProjectionError} from './personal-projection-protocol';
import {checkReadingExecution,type ReadingExecution} from './reading-execution';

export interface ProjectionWorkerLike {
 postMessage(message:ProjectionRequest):void;terminate():void;
 onmessage:((event:MessageEvent<ProjectionResponse>)=>void)|null;onerror:((event:Event)=>void)|null;
 onmessageerror?:((event:MessageEvent)=>void)|null;
}
/** The worker could not be started or stopped unexpectedly; the caller works on its own thread instead. */
export class ProjectionWorkerUnavailable extends Error {constructor(message='Hand drawing is unavailable off the reader thread.'){super(message);this.name='ProjectionWorkerUnavailable';}}

export function deserializeProjectionError(error:SerializedProjectionError):Error {
 if(error.name==='HandPresentationError'&&error.code)return new HandPresentationError(error.code as HandPresentationError['code'],error.message,error.ownerIds??[],(error.context??{}) as HandPresentationError['context']);
 if(error.name==='AbortError')return new DOMException(error.message,'AbortError');
 const result=Error(error.message);result.name=error.name;return result;
}
type Done=Extract<ProjectionResponse,{kind:'done'}>;
interface Pending {request:ProjectionRequest;inputs:ProjectionCoreInputs;execution?:ReadingExecution;resolve(done:Done):void;reject(error:unknown):void;cleanup():void;cancel(reason:unknown):void}

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
  // A message that cannot be read would leave its request waiting forever.
  worker.onmessageerror=()=>this.lose(worker,false);
  this.worker=worker;this.known.clear();return worker;
 }
 /** A worker that never answered cannot run here; a crash later restarts it on the next request. */
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
  // The caller's checkpoint may refuse to continue (a superseded reading):
  // that stops the running step exactly as cancelling it would.
  if(response.kind==='stage'){try{p.execution?.onCheckpoint?.(response.stage);}catch(error){p.cancel(error);}return;}
  if(response.kind==='missing'){this.known.delete(p.request.key);try{this.send(p);}catch(error){this.pending.delete(response.id);p.cleanup();p.reject(error);}return;}
  this.pending.delete(response.id);p.cleanup();
  if(response.kind==='done')p.resolve(response);else{if(response.error.name!=='HandPresentationError')this.known.delete(p.request.key);p.reject(deserializeProjectionError(response.error));}
 }
 private request(base:{kind:'warm';saved?:PersonalHandEngineState}|{kind:'project';owners:PersonalOwnerHand[];digest:string}|{kind:'save'},key:string,inputs:ProjectionCoreInputs,execution?:ReadingExecution):Promise<Done>{
  checkReadingExecution(execution);
  return new Promise((resolve,reject)=>{
   const id=++this.sequence,signal=execution?.signal;
   const cancel=(reason:unknown)=>{
    const p=this.pending.get(id);if(!p)return;this.pending.delete(id);p.cleanup();
    // Stop the running step; other queued requests start again on a fresh worker.
    const worker=this.worker,others=[...this.pending.values()];this.pending.clear();
    if(worker){try{worker.terminate();}catch{/* already gone */}this.worker=undefined;this.known.clear();}
    p.reject(reason);
    for(const other of others){this.pending.set(other.request.id,other);try{this.send(other);}catch(error){this.pending.delete(other.request.id);other.cleanup();other.reject(error);}}
   };
   const abort=()=>cancel(new DOMException('Reading preparation was cancelled.','AbortError'));
   const p:Pending={request:{id,key,...base} as ProjectionRequest,inputs,execution,resolve,reject,cancel,cleanup:()=>signal?.removeEventListener('abort',abort)};
   signal?.addEventListener('abort',abort,{once:true});
   this.pending.set(id,p);
   try{this.send(p);}catch(error){this.pending.delete(id);p.cleanup();reject(error);}
  });
 }
 /** Settle a core's engraving ahead of its first projection, from `saved`
  * when it reproduces. Resolves how it settled. */
 warm(key:string,inputs:ProjectionCoreInputs,execution?:ReadingExecution,saved?:PersonalHandEngineState):Promise<'restored'|'engraved'|'already'>{
  return this.request({kind:'warm',...(saved?{saved}:{})},key,inputs,execution).then(done=>done.settled??'engraved');
 }
 /** The core's settled engine, when the worker still holds a settled core. */
 save(key:string,inputs:ProjectionCoreInputs):Promise<PersonalHandEngineState|undefined>{return this.request({kind:'save'},key,inputs).then(done=>done.state);}
 async project(key:string,inputs:ProjectionCoreInputs,owners:readonly PersonalOwnerHand[],digest:string,execution?:ReadingExecution):Promise<ProjectionView>{
  const {view}=await this.request({kind:'project',owners:owners.map(o=>({...o})),digest},key,inputs,execution);
  if(!view)throw Error('The hand drawing worker returned no pages.');
  return view;
 }
}
/** The reader's projection worker, built as its own module chunk. */
export const projectionWorkerClient=()=>new ProjectionWorkerClient(()=>
 new Worker(new URL('./personal-projection-worker.ts',import.meta.url),{type:'module'}) as unknown as ProjectionWorkerLike);
