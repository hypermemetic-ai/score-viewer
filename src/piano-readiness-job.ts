import {importPackage,validateLayerAsync} from './package';
import {readPersonal} from './state';
import type {PianoReadinessRequest,PianoReadinessResult} from './piano-readiness';
import type {PianoReadinessWorkerMessage,PianoReadinessWorkerRequest} from './piano-readiness-worker-protocol';

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
          const p=await importPackage(result.packageBytes,{keyboardLayout:request.layout}),
            layer=await validateLayerAsync(result.layer,p,{requireCurrent:true});
          const personal=result.personal?readPersonal(result.personal,p):undefined;
          if(done)return;
          finish({...result,package:p,layer,...(personal?{personal}:{})});
        }catch(error){failed((error as Error).message);}
      };
      const {signal:_,onProgress:__,...wire}=request;
      worker.postMessage(wire);
    }catch(error){failed((error as Error).message);}
  });
}
