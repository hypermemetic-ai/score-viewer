import {HandPresentationError,type PersonalHandEngineState,type PersonalOwnerHand} from '../vendor/iso-notation/src/score-presentation';
import type {ProjectionCoreInputs,ProjectionRequest,ProjectionResponse,ProjectionView,SerializedProjectionError} from './personal-projection-protocol';
import {checkReadingExecution,type ReadingExecution} from './reading-execution';
import type {EncodedDerivedPayload} from './derived-payload';

export interface ProjectionWorkerLike {
 postMessage(message:ProjectionRequest,transfer?:Transferable[]):void;terminate():void;
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
 /** Stop the worker and everything it holds; the next request starts a fresh one. */
 close():void {
  const worker=this.worker;if(!worker)return;
  try{worker.terminate();}catch{/* already gone */}
  this.worker=undefined;this.known.clear();
  const lost=[...this.pending.values()];this.pending.clear();
  for(const p of lost){p.cleanup();p.reject(new DOMException('Reading preparation was cancelled.','AbortError'));}
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
  this.known.add(p.request.key);
  // A deflated engine goes as a copy of its bytes, transferred: a request sent again (a restarted worker) sends its own.
  const encoded=p.request.kind==='warm'?p.request.savedEncoded:undefined,body=encoded&&encoded.body.slice();
  const message={...p.request,...(create?{create}:{}),...(encoded&&body?{savedEncoded:{...encoded,body}}:{})};
  if(body)worker.postMessage(message,[body.buffer]);else worker.postMessage(message);
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
 private request(base:{kind:'warm';saved?:PersonalHandEngineState;savedEncoded?:EncodedDerivedPayload}|{kind:'project';owners:PersonalOwnerHand[];digest:string;encode?:boolean}|{kind:'save'},key:string,inputs:ProjectionCoreInputs,execution?:ReadingExecution):Promise<Done>{
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
  * when it reproduces. Resolves how it settled. A saved engine still
  * deflated, as read from disk, is inflated in the worker. */
 warm(key:string,inputs:ProjectionCoreInputs,execution?:ReadingExecution,saved?:SavedEngine):Promise<'restored'|'engraved'|'already'>{
  return this.request({kind:'warm',...(saved?isEncodedEngine(saved)?{savedEncoded:saved}:{saved}:{})},key,inputs,execution).then(done=>done.settled??'engraved');
 }
 /** The core's settled engine, encoded for the disk cache, when the worker still holds a settled core. */
 save(key:string,inputs:ProjectionCoreInputs):Promise<EncodedDerivedPayload|undefined>{return this.request({kind:'save'},key,inputs).then(done=>done.engine);}
 async project(key:string,inputs:ProjectionCoreInputs,owners:readonly PersonalOwnerHand[],digest:string,execution?:ReadingExecution,encode=false):Promise<ProjectionView>{
  const {view,encoded}=await this.request({kind:'project',owners:owners.map(o=>({...o})),digest,...(encode?{encode}:{})},key,inputs,execution);
  if(!view)throw Error('The hand drawing worker returned no pages.');
  if(encoded)encodedProjections.set(view,encoded);
  return view;
 }
}
/** A saved engine: decoded (one an import adopted), or as read from disk. */
export type SavedEngine=PersonalHandEngineState|EncodedDerivedPayload;
export const isEncodedEngine=(saved:SavedEngine):saved is EncodedDerivedPayload=>'body' in saved&&saved.body instanceof Uint8Array&&typeof (saved as EncodedDerivedPayload).payloadSha256==='string';
/** Views the worker also encoded for the disk cache, as asked. */
export const encodedProjections=new WeakMap<ProjectionView,EncodedDerivedPayload>();
/** The reader's projection worker, built as its own module chunk. */
export const projectionWorkerClient=()=>new ProjectionWorkerClient(()=>
 new Worker(new URL('./personal-projection-worker.ts',import.meta.url),{type:'module'}) as unknown as ProjectionWorkerLike);
