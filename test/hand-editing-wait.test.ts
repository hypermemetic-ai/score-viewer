import test from 'node:test';
import assert from 'node:assert/strict';
import {HandChoiceQueue,abandonedChoicesText,appliedChoicesText,waitingChoicesText} from '../src/hand-editing-wait';
import {LOADING_STEPS} from '../src/viewer-loading';
import {createProjectionHost,type HostedProjectionCore} from '../src/personal-projection-host';
import {ProjectionWorkerClient,type ProjectionWorkerLike} from '../src/personal-projection-client';
import type {ProjectionResponse} from '../src/personal-projection-protocol';
import {PersonalPresentationSession,cancelPersonalPrefetch} from '../src/personal-presentation';
import {PersonalPreparationPool} from '../src/personal-preparation-pool';
import {sourcePackage,transferStudy} from './support/hand-edition-fixture';
import type {PreparationStage} from '../vendor/iso-notation/src/score-presentation';

test('hand choices made while hand editing is prepared wait in order, one per note, and none is dropped',()=>{
 const queue=new HandChoiceQueue();
 queue.add({key:'a',hand:'RH',bar:12});queue.add({key:'b',hand:'LH',bar:3});queue.add({key:'a',hand:'LH',bar:12});
 // A later press on the same note replaces the earlier one and moves to the end.
 assert.deepEqual(queue.list().map(c=>[c.key,c.hand]),[['b','LH'],['a','LH']]);
 assert.equal(waitingChoicesText(queue.list()),'2 hand choices (bars 3 and 12) apply once this is ready.');
 assert.deepEqual(queue.shift(),{key:'b',hand:'LH',bar:3});
 queue.add({key:'c',hand:'RH',bar:5});
 assert.deepEqual(queue.take().map(c=>c.key),['a','c']);assert.equal(queue.size,0);assert.equal(queue.shift(),undefined);
});

test('the waiting status and its outcome say what happens to each choice',()=>{
 assert.equal(LOADING_STEPS['hand-editing'],'Engraving the score for hand choices');
 assert.equal(waitingChoicesText([]),'');
 assert.equal(waitingChoicesText([{key:'a',hand:'RH',bar:12}]),'Right hand for the note in bar 12 applies once this is ready.');
 assert.equal(appliedChoicesText([{key:'a',hand:'LH',bar:12}]),'Hand editing is ready. Left hand applied to the note in bar 12.');
 assert.equal(appliedChoicesText([{key:'a',hand:'LH',bar:12},{key:'b',hand:'RH',bar:4},{key:'c',hand:'RH',bar:4}]),'Hand editing is ready. 3 hand choices applied in bars 4 and 12.');
 assert.match(abandonedChoicesText([{key:'a',hand:'LH',bar:7}]),/bar 7 was not applied: the score closed .* Nothing was saved for it\./);
});

function fakeWorker(create:()=>HostedProjectionCore){
 return ():ProjectionWorkerLike=>{
  let alive=true;
  const worker:ProjectionWorkerLike={onmessage:null,onerror:null,postMessage(message){void host.handle(structuredClone(message));},terminate(){alive=false;}};
  const host=createProjectionHost(response=>{const data=structuredClone(response);setTimeout(()=>{if(alive)worker.onmessage?.({data} as MessageEvent<ProjectionResponse>);});},{create});
  return worker;
 };
}
test('the engraver\'s stages while hand editing is prepared reach a waiting choice, and the check shares that one preparation',async()=>{
 const {p}=await sourcePackage(transferStudy());let warms=0,release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
 // Like ISO's core, a settled core's warm returns at once.
 let settled=false;
 const core:HostedProjectionCore={async warmAsync(e){if(settled)return;warms++;e?.onCheckpoint?.('layout');await gate;e?.onCheckpoint?.('lint');e?.onCheckpoint?.('paint');settled=true;},
  async projectAsync(){throw Error('not used');}};
 const session=new PersonalPresentationSession(p,new PersonalPreparationPool<any>(),{worker:new ProjectionWorkerClient(fakeWorker(()=>core)),cache:null});
 const seen:PreparationStage[]=[];const stop=session.onPreparationStage(stage=>seen.push(stage));
 session.prefetch();
 for(let i=0;i<50&&!seen.length;i++)await new Promise(r=>setTimeout(r,5));
 assert.deepEqual(seen,['layout']);assert.equal(session.preparationStage,'layout');
 // A hand choice now waits on the same preparation rather than starting another.
 const check=session.handChoiceCheck();assert.ok(check);assert.equal(session.checkingHandChoices,true);
 release();assert.equal(await check,true);
 assert.deepEqual(seen.slice(0,3),['layout','lint','paint']);assert.equal(warms,1,'one full engraving for the open score');
 assert.equal(session.handChoiceCheck(),undefined,'later choices apply at once');
 stop();cancelPersonalPrefetch();
});
