import {ensurePianoReady} from './piano-readiness';
import {readinessWorkerResult,type PianoReadinessWorkerRequest,type PianoReadinessWorkerMessage} from './piano-readiness-worker-protocol';

const send=(message:PianoReadinessWorkerMessage)=>postMessage(message);
self.onmessage=async(event:MessageEvent<PianoReadinessWorkerRequest>)=>{
  const result=await ensurePianoReady({...event.data,onProgress:progress=>send({type:'progress',progress})});
  send({type:'complete',result:readinessWorkerResult(result)});
};
