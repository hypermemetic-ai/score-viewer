import {importPackage,validateLayerAsync,hashBytes} from './package';
import {readPersonal} from './state';
import type {PianoReadinessRequest,PianoReadinessResult} from './piano-readiness';
import type {PianoReadinessWorkerMessage,PianoReadinessWorkerRequest} from './piano-readiness-worker-protocol';
import {admitPianoRequestResult} from './piano-request-admission';

export interface ReadinessWorker {
  onmessage:((event:MessageEvent<PianoReadinessWorkerMessage>)=>void)|null;
  onerror:((event:ErrorEvent)=>void)|null;
  postMessage(request:PianoReadinessWorkerRequest):void;
  terminate():void;
}
export interface PianoReadinessJobRequest extends PianoReadinessRequest {signal?:AbortSignal;}

/** Ordinary viewer worker job. Cancellation terminates the owned computation;
 * it neither writes a package nor changes the selected keyboard/library. */
export function runPianoReadiness(request:PianoReadinessJobRequest,
  createWorker:()=>ReadinessWorker=()=>new Worker(new URL('./piano-readiness.worker.ts',import.meta.url),{type:'module'})):
  Promise<PianoReadinessResult>{
  const prior=request.packageBytes.slice();
  const trusted={...request,packageBytes:prior,...(request.personal?{personal:structuredClone(request.personal)}:{}),
    ...(request.referenceTempo?{referenceTempo:structuredClone(request.referenceTempo)}:{})};
  return new Promise(resolve=>{
    let done=false,worker:ReadinessWorker|undefined;
    const finish=(result:PianoReadinessResult)=>{
      if(done)return;done=true;request.signal?.removeEventListener('abort',cancel);worker?.terminate();resolve(result);
    },cancel=()=>finish({status:'cancelled',code:'cancelled',message:'Fingering calculation cancelled. Your score is retained.',retainedPackageBytes:prior}),
      failed=(message:string)=>finish({status:'unsupported',code:'readiness-worker',message,retainedPackageBytes:prior});
    if(request.signal?.aborted){cancel();return;}
    request.signal?.addEventListener('abort',cancel,{once:true});
    try{
      worker=createWorker();
      worker.onerror=event=>failed(event.message||'Fingering calculation stopped. Your score is retained.');
      worker.onmessage=async event=>{
        if(done)return;
        if(event.data.type==='progress'){request.onProgress?.(event.data.progress);return;}
        const result=event.data.result;
        if(!('packageBytes' in result)){finish(result);return;}
        try{
          if(result.status!=='reading'&&result.requestedEditionSha256!==undefined&&result.requestedEditionSha256!==await hashBytes(trusted.packageBytes))throw Error('Prepared transposition belongs to another selected request edition.');
          const p=await importPackage(result.packageBytes,{keyboardLayout:request.layout,allowLegacyTempo:request.intent==='read-retained'});
          const personal=result.personal?readPersonal(result.personal,p):undefined;
          if(p.transposition&&(request.intent!=='read-retained'||request.forceRecalculate)&&result.status!=='reading'&&result.requestedEditionSha256!==await hashBytes(trusted.packageBytes))throw Error('Prepared transposition lacks its selected request edition identity.');
          if(done)return;
          if(result.status==='reading'){
            if(request.intent!=='read-retained'||request.forceRecalculate)throw Error('A new calculation requires a complete admitted finger layer.');
            await admitPianoRequestResult(trusted,p,result.packageBytes,undefined,personal);
            if(done)return;
            finish({...result,package:p,...(personal?{personal}:{})});return;
          }
          const layer=await validateLayerAsync(result.layer,p,{requireCurrent:request.intent!=='read-retained'});
          await admitPianoRequestResult(trusted,p,result.packageBytes,layer,personal);
          if(done)return;
          finish({...result,package:p,layer,...(personal?{personal}:{})});
        }catch(error){failed((error as Error).message);}
      };
      const {signal:_,onProgress:__,...wire}=trusted;
      worker.postMessage(wire);
    }catch(error){failed((error as Error).message);}
  });
}
