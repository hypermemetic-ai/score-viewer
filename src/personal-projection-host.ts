import {createPersonalHandProjection,HandPresentationError,type PersonalHandEngineState,type PersonalOwnerHand,type PreparationExecution,type PreparationStage} from '../vendor/iso-notation/src/score-presentation';
import {withLayoutPeer,type StartLayoutPeer} from './layout-peer';
import {decodeDerivedPayload,encodeDerivedPayload,type EncodedDerivedPayload} from './derived-payload';
import {cachedEngine,cachedProjectionValue,type ProjectionCoreInputs,type ProjectionRequest,type ProjectionResponse,type ProjectionView,type SerializedProjectionError} from './personal-projection-protocol';

/** The calls the projection host makes on one ISO personal projection core. */
export interface HostedProjectionCore {
 warmAsync(execution?:PreparationExecution):Promise<void>;
 /** A core that can resume from, and save, its settled engine. */
 restoreAsync?(state:PersonalHandEngineState,execution?:PreparationExecution):Promise<boolean>;
 exportState?():PersonalHandEngineState|undefined;
 projectAsync(owners:readonly PersonalOwnerHand[],digest:string,execution?:PreparationExecution):Promise<ProjectionView>;
}
export const createHostedCore=(inputs:ProjectionCoreInputs):HostedProjectionCore=>createPersonalHandProjection(inputs.source,inputs.baseline,inputs.recipe);

export function serializeProjectionError(error:unknown):SerializedProjectionError {
 if(error instanceof HandPresentationError)return {name:'HandPresentationError',message:error.message,code:error.code,ownerIds:[...error.ownerIds],context:structuredClone(error.context) as Record<string,unknown>};
 if(error instanceof Error||error instanceof DOMException)return {name:error.name,message:error.message};
 return {name:'Error',message:String(error)};
}

async function savedEngine(encoded:EncodedDerivedPayload):Promise<PersonalHandEngineState|undefined>{
 try{return cachedEngine(await decodeDerivedPayload(encoded));}catch{return;}
}
/** A real task turn, so a layout peer's messages are read between steps. */
const taskTurn=()=>new Promise<void>(resolve=>{const channel=new MessageChannel();channel.port1.onmessage=()=>{channel.port1.close();resolve();};channel.port2.postMessage(0);});

/** Projection cores live here, off the reader's thread. Only as many captured
 * cores as the reader's preparation pool keeps are retained; an evicted core is made again on request. A
 * refused hand choice leaves its core unchanged (ISO publishes a projection
 * only after it succeeds), so the core is kept; any other failure drops it. */
export function createProjectionHost(post:(response:ProjectionResponse,transfer?:Transferable[])=>void,options:{maxCores?:number;create?:(inputs:ProjectionCoreInputs)=>HostedProjectionCore;
 /** A second worker for a core's whole first engrave (layout-peer.ts). */
 startLayoutPeer?:StartLayoutPeer}={}){
 const cores=new Map<string,HostedProjectionCore>(),maxCores=options.maxCores??2,create=options.create??createHostedCore;
 const settled=new WeakSet<HostedProjectionCore>();
 let tail=Promise.resolve();
 async function run(request:ProjectionRequest):Promise<void>{
  let core=cores.get(request.key);
  // A forgotten core has no engine to save; saving never makes one.
  if(request.kind==='save'){
   let engine:EncodedDerivedPayload|undefined;try{const state=core?.exportState?.();if(state)engine=await encodeDerivedPayload(state);}catch{/* nothing to save */}
   post({id:request.id,kind:'done',...(engine?{engine}:{})},engine?[engine.body.buffer]:[]);return;
  }
  try{
   if(!core){if(!request.create){post({id:request.id,kind:'missing'});return;}core=create(request.create);}
   cores.delete(request.key);cores.set(request.key,core);
   while(cores.size>maxCores)cores.delete(cores.keys().next().value!);
   let last:PreparationStage|undefined;
   // The worker owns its thread: steps run back to back, reporting each new stage.
   const execution:PreparationExecution={budgetMs:50,yieldControl:()=>Promise.resolve(),onCheckpoint:stage=>{if(stage!==last){last=stage;post({id:request.id,kind:'stage',stage});}}};
   // A core's first engrave lays the whole score out, on a second worker too
   // when one starts. Its systems arrive as messages, so the steps then give
   // the worker real task turns.
   const engraving=<T>(run:(execution:PreparationExecution)=>Promise<T>)=>options.startLayoutPeer?
    withLayoutPeer(layoutPeer=>run(layoutPeer?{...execution,layoutPeer,yieldControl:taskTurn}:execution),options.startLayoutPeer):run(execution);
   const hostCore=core;
   if(request.kind==='warm'){
    // An engine read from disk is inflated and checked here; one that fails its checks is no engine.
    const already=settled.has(core),saved=request.saved??(request.savedEncoded&&!already?await savedEngine(request.savedEncoded):undefined),
     restored=!already&&!!saved&&!!core.restoreAsync&&await core.restoreAsync(saved,execution);
    if(!restored)await (already?core.warmAsync(execution):engraving(execution=>hostCore.warmAsync(execution)));
    settled.add(core);post({id:request.id,kind:'done',settled:already?'already':restored?'restored':'engraved'});return;
   }
   const view=settled.has(core)?await core.projectAsync(request.owners,request.digest,execution):
    await engraving(execution=>hostCore.projectAsync(request.owners,request.digest,execution));settled.add(core);
   const shown:ProjectionView={score:view.score,pages:[...view.pages],seats:[...view.seats],annotationGeometry:view.annotationGeometry};
   let encoded:EncodedDerivedPayload|undefined;if(request.encode)try{encoded=await encodeDerivedPayload(cachedProjectionValue(shown));}catch{/* the reader encodes it */}
   post({id:request.id,kind:'done',view:shown,...(encoded?{encoded}:{})},encoded?[encoded.body.buffer]:[]);
  }catch(error){
   if(!(error instanceof HandPresentationError)&&cores.get(request.key)===core)cores.delete(request.key);
   post({id:request.id,kind:'error',error:serializeProjectionError(error)});
  }
 }
 return {
  get retained(){return cores.size;},
  /** Requests run one at a time, in arrival order. */
  handle(request:ProjectionRequest):Promise<void>{const next=tail.then(()=>run(request));tail=next.catch(()=>{});return next;}
 };
}
