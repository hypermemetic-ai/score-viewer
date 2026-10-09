import {validateLayerAsync,hashBytes,pianoPlanningScore,selectPresentation} from './package';
import {readPersonal} from './state';
import {ensurePianoReady,type PianoReadinessRequest,type PianoReadinessResult} from './piano-readiness';
import type {PianoReadinessWorkerMessage,PianoReadinessWorkerRequest} from './piano-readiness-worker-protocol';
import {admitPianoRequestResult} from './piano-request-admission';
import {PackageAdmissionSession} from './package-admission-session';
import {getScoreTransposition} from './score-transposition';

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
  createWorker?:()=>ReadinessWorker,operationAdmission?:PackageAdmissionSession):
  Promise<PianoReadinessResult>{
  const prior=request.packageBytes.slice();
  const trusted={...request,packageBytes:prior,...(request.personal?{personal:structuredClone(request.personal)}:{}),
    ...(request.referenceTempo?{referenceTempo:structuredClone(request.referenceTempo)}:{})};
  return new Promise(resolve=>{
    let done=false,worker:ReadinessWorker|undefined;
    // Returned Worker bytes get their OWN first cold admission in this realm.
    // A worker's certificates and the request's earlier admission cannot supply it.
    const receiving=new PackageAdmissionSession(),direct=operationAdmission??new PackageAdmissionSession();
    const finish=(result:PianoReadinessResult)=>{
      if(done)return;done=true;trusted.signal?.removeEventListener('abort',cancel);worker?.terminate();receiving.clear();if(!operationAdmission)direct.clear();resolve(result);
    },cancel=()=>finish({status:'cancelled',code:'cancelled',message:'Fingering calculation cancelled. Your score is retained.',retainedPackageBytes:prior}),
      failed=(message:string)=>finish({status:'unsupported',code:'readiness-worker',message,retainedPackageBytes:prior});
    if(trusted.signal?.aborted){cancel();return;}
    trusted.signal?.addEventListener('abort',cancel,{once:true});
    const start=async()=>{try{
      // Only exact saved reading can avoid computation. The ordinary service
      // still checks policy, context, pitch, personal state and every layer;
      // independent request binding runs again, using fresh package copies.
      // Custom worker factories deliberately retain the Worker path for controls.
      if(!createWorker&&trusted.intent==='read-retained'&&!trusted.forceRecalculate){
        const p=await direct.import(trusted.packageBytes,{allowLegacyTempo:true});
        if(done)return;
        const saved=p.availablePresentations?.includes(trusted.layout)?await selectPresentation(p,trusted.layout):undefined;
        if(saved&&(trusted.referenceTempo===undefined||JSON.stringify(trusted.referenceTempo)===JSON.stringify(pianoPlanningScore(saved).referencePerformanceTempo))&&
          (trusted.transposeSteps===undefined||trusted.transposeSteps===getScoreTransposition(saved))){
          const result=await ensurePianoReady(trusted,direct);
          if(done)return;
          if('package' in result)await admitPianoRequestResult(trusted,result.package,result.packageBytes,
            'layer' in result?result.layer:undefined,result.personal,direct);
          if(!done)finish(result);return;
        }
      }
      if(done)return;
      worker=(createWorker??(()=>new Worker(new URL('./piano-readiness.worker.ts',import.meta.url),{type:'module'})))();
      worker.onerror=event=>failed(event.message||'Fingering calculation stopped. Your score is retained.');
      worker.onmessage=async event=>{
        if(done)return;
        if(event.data.type==='progress'){trusted.onProgress?.(event.data.progress);return;}
        const result=structuredClone(event.data.result);
        if(!('packageBytes' in result)){finish(result);return;}
        try{
          if(result.status!=='reading'&&result.requestedEditionSha256!==undefined&&result.requestedEditionSha256!==await hashBytes(trusted.packageBytes))throw Error('Prepared transposition belongs to another selected request edition.');
          const p=await receiving.import(result.packageBytes,{keyboardLayout:trusted.layout,allowLegacyTempo:trusted.intent==='read-retained'});
          const personal=result.personal?readPersonal(result.personal,p):undefined;
          if(p.transposition&&(trusted.intent!=='read-retained'||trusted.forceRecalculate)&&result.status!=='reading'&&result.requestedEditionSha256!==await hashBytes(trusted.packageBytes))throw Error('Prepared transposition lacks its selected request edition identity.');
          if(done)return;
          if(result.status==='reading'){
            if(trusted.intent!=='read-retained'||trusted.forceRecalculate)throw Error('A new calculation requires a complete admitted finger layer.');
            await admitPianoRequestResult(trusted,p,result.packageBytes,undefined,personal,receiving);
            if(done)return;
            finish({...result,package:p,...(personal?{personal}:{})});return;
          }
          const layer=await validateLayerAsync(result.layer,p,{requireCurrent:trusted.intent!=='read-retained'});
          await admitPianoRequestResult(trusted,p,result.packageBytes,layer,personal,receiving);
          if(done)return;
          finish({...result,package:p,layer,...(personal?{personal}:{})});
        }catch(error){failed((error as Error).message);}
      };
      const {signal:_,onProgress:__,...wire}=trusted;
      worker.postMessage(wire);
    }catch(error){failed((error as Error).message);}};
    void start();
  });
}
