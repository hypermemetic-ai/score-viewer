import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {applyOperatorFingerReview} from '../src/operator-finger-update';
import {runPianoReadiness,type ReadinessWorker} from '../src/piano-readiness-job';
import {ensurePianoReady} from '../src/piano-readiness';
import {readinessWorkerResult,type PianoReadinessWorkerMessage} from '../src/piano-readiness-worker-protocol';
import {selectPresentation} from '../src/package';

const original=readFileSync(new URL('../vendor/iso-notation/public/review/schumann-no14-conventional-20261006.isoscore',import.meta.url)),
 review=JSON.parse(readFileSync(new URL('../vendor/iso-notation/data/reviews/schumann-no14-janko-fingers-20261007.json',import.meta.url),'utf8')),
 prepared=await applyOperatorFingerReview(original,review);
const emit=(worker:ReadinessWorker,message:PianoReadinessWorkerMessage)=>worker.onmessage?.({data:structuredClone(message)} as MessageEvent<PianoReadinessWorkerMessage>);

test('worker transfer reimports a genuinely admitted full collection and retains both companion registries and operator choices',async()=>{
 let terminated=0;const worker:ReadinessWorker={onmessage:null,onerror:null,terminate(){terminated++;},
  postMessage:async request=>{
   assert.equal('signal' in request,false);assert.equal('onProgress' in request,false);
   emit(worker,{type:'complete',result:readinessWorkerResult(await ensurePianoReady(request))});
  }};
 const q=await runPianoReadiness({packageBytes:prepared.publication.bytes,layout:'janko-four-row',intent:'read-retained'},()=>worker);
 assert.equal(q.status,'ready','message' in q?q.message:undefined);assert.equal(terminated,1);
 assert.deepEqual(q.packageBytes,prepared.publication.bytes);assert.deepEqual(q.layer,prepared.after.fingerLayer);
 assert.equal((await selectPresentation(q.package,'conventional-piano')).keyboardLayout,'conventional-piano');
 assert.equal((await selectPresentation(q.package,'janko-four-row')).keyboardLayout,'janko-four-row');
});

test('cancel terminates the actual owned worker and ignores late completion without changing or transferring prior bytes',async()=>{
 let terminated=0,sent=false;const worker:ReadinessWorker={onmessage:null,onerror:null,terminate(){terminated++;},postMessage(){sent=true;}};
 const c=new AbortController(),before=prepared.publication.bytes.slice(),job=runPianoReadiness({packageBytes:prepared.publication.bytes,layout:'janko-four-row',intent:'read-retained',signal:c.signal},()=>worker);
 assert.equal(sent,true);c.abort();const q=await job;assert.equal(q.status,'cancelled');assert.equal(terminated,1);
 assert.deepEqual(q.retainedPackageBytes,before);assert.deepEqual(prepared.publication.bytes,before);
 emit(worker,{type:'complete',result:{status:'unsupported',code:'late',message:'Late result',retainedPackageBytes:new Uint8Array()}});
 assert.equal(terminated,1);
 const already=new AbortController();already.abort();assert.equal((await runPianoReadiness({packageBytes:before,layout:'janko-four-row',intent:'read-retained',signal:already.signal},()=>assert.fail('Do not create cancelled worker'))).status,'cancelled');
});

test('worker output is independently admitted in reader realm; forged fingers retain prior bytes',async()=>{
 const real=await ensurePianoReady({packageBytes:prepared.publication.bytes,layout:'janko-four-row',intent:'read-retained'});
 assert.equal(real.status,'ready');const wire=readinessWorkerResult(real);assert.ok('layer' in wire);wire.layer=structuredClone(wire.layer);wire.layer.attacks[0].finger=99;
 const worker:ReadinessWorker={onmessage:null,onerror:null,terminate(){},postMessage(){emit(worker,{type:'complete',result:wire});}},
 q=await runPianoReadiness({packageBytes:prepared.publication.bytes,layout:'janko-four-row',intent:'read-retained'},()=>worker);
 assert.equal(q.status,'unsupported');assert.deepEqual(q.retainedPackageBytes,prepared.publication.bytes);
});

test('actual worker entry executes strict service and sends only inert admission result',async()=>{
 const replies:PianoReadinessWorkerMessage[]=[];(globalThis as any).self={};(globalThis as any).postMessage=(r:PianoReadinessWorkerMessage)=>replies.push(r);
 await import('../src/piano-readiness.worker');
 await (globalThis as any).self.onmessage({data:{packageBytes:prepared.publication.bytes,layout:'janko-four-row',intent:'read-retained'}});
 const complete=replies.find(r=>r.type==='complete');assert.ok(complete&&complete.type==='complete');
 assert.equal(complete.result.status,'ready');assert.equal('package' in complete.result,false);
 assert.ok('layer' in complete.result);assert.deepEqual(complete.result.layer,prepared.after.fingerLayer);
});
