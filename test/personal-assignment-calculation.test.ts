import test from 'node:test';import assert from 'node:assert/strict';
import {transferStudy,sourcePackage} from './support/hand-edition-fixture';
import {ensurePianoReady} from '../src/piano-readiness';
import {runPianoReadiness,type ReadinessWorker} from '../src/piano-readiness-job';
import {readinessWorkerResult} from '../src/piano-readiness-worker-protocol';
import {assigned,handFor} from '../src/personal-assignments';
import {initialPersonal,fingerFor} from '../src/state';
import {hashBytes,importPackage} from '../src/package';
import type {SourceHandRequirement} from '../vendor/iso-notation/src/model/physical-source-constraints';

test('personal hand/finger precedence survives explicit calculation and independent archive/worker admission in both keyboards',async()=>{
 const source=transferStudy(),n=source.notes[0];n.editorialHand={hand:'LH',kind:'confirm',authorityId:'authored-left-hand'};
 (source as typeof source&{sourceHandRequirements:SourceHandRequirement[]}).sourceHandRequirements=[{version:'source-hand-requirement-v1',ownerId:n.id,hand:'LH',guard:{pitch:48,startTick:n.startTick,durationTicks:n.durationTicks},provenance:{kind:'source-instruction',reference:'Authored left-hand choice retained independently'}}];
 const original=await sourcePackage(source),sourceBytes=original.p.files['source-score.json'];
 for(const layout of ['janko-four-row','conventional-piano'] as const){
  const prepared=await ensurePianoReady({packageBytes:original.bytes,layout,performingHandPolicy:'retain-imported'});
  assert.ok('package' in prepared,'message' in prepared?prepared.message:prepared.status);if(!('package' in prepared))continue;
  const baseline=prepared.package,seat=baseline.seats.find(s=>s.ownerIds.includes(n.id))!,initial=initialPersonal(baseline),finger=fingerFor(baseline,initial,seat)!;
  const personal=assigned(baseline,initial,seat,{hand:'RH',finger}),before=JSON.stringify(personal),archiveHash=await hashBytes(prepared.packageBytes),request={packageBytes:prepared.packageBytes,layout,personal,forceRecalculate:true,performingHandPolicy:'retain-imported' as const};
  const changed=await ensurePianoReady(request);
  assert.ok('package' in changed,'message' in changed?changed.message:changed.status);if(!('package' in changed))continue;
  assert.ok('layer' in changed);assert.equal(handFor(changed.package,changed.personal!,n.id),'RH');
  assert.equal(fingerFor(changed.package,changed.personal!,changed.package.seats.find(s=>s.ownerIds.includes(n.id))!),finger);
  assert.deepEqual(changed.package.files['source-score.json'],sourceBytes);assert.deepEqual(changed.package.sourceScore,source);
  assert.deepEqual(changed.package.score.notes.find(q=>q.id===n.id)!.editorialHand,n.editorialHand);
  assert.equal(JSON.stringify(personal),before);assert.equal(await hashBytes(prepared.packageBytes),archiveHash);
  const cold=await importPackage(changed.packageBytes,{keyboardLayout:layout});assert.equal(cold.score.notes.find(q=>q.id===n.id)!.hand,'RH');
  const worker:ReadinessWorker={onmessage:null,onerror:null,terminate(){},postMessage(){worker.onmessage?.({data:{type:'complete',result:readinessWorkerResult(changed)}} as MessageEvent<any>);}};
  const transferred=await runPianoReadiness(request,()=>worker);
  assert.ok('package' in transferred,'message' in transferred?transferred.message:transferred.status);assert.equal(transferred.status,changed.status);
 }
});
