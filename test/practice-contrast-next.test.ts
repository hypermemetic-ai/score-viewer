import test from 'node:test';import assert from 'node:assert/strict';
import {PracticeView} from '../src/practice-view';
import {PracticeContrastCycle} from '../src/practice-contrast-cycle';
import {PracticeDone} from '../src/practice-attainment';
import {planPractice,initialPractice,practiceCatalogChunks,practiceClipChunk} from '../src/practice';
import {referenceFixture} from './support/reference-score';
const p=await referenceFixture(new URL('../vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.isoscore',import.meta.url)),plan=planPractice(p),owner=practiceCatalogChunks(plan).find(c=>c.kind==='contrast')!;
function fixture(index:0|1,{keepTempo=false,measured=true,bpm=180}={}){const state=initialPractice(plan);state.working=bpm;state.keepTempo=keepTempo;const cycle=new PracticeContrastCycle();cycle.start(state.working,measured);if(index===1)cycle.accept(0,state.working,measured);
 const session={chunk:practiceClipChunk(owner,index),phase:'complete',measured},view=Object.create(PracticeView.prototype) as any,calls:string[]=[],doneClaims=new PracticeDone();
 Object.assign(view,{plan,state,session,contrastExercise:owner,contrastCycle:cycle,loopRate:state.working,startGeneration:0,doneClaims,stopClock:()=>view.startGeneration++,paintControls:()=>{},save:async()=>{calls.push('save');return true;},selectPassage:(c:any)=>calls.push('select:'+c.id),mountContrastClip:(i:number)=>calls.push('clip:'+i),startContrast:async(continuing=false)=>calls.push(continuing?'continue B':'restart A'),paint:()=>{},pause:()=>{view.startGeneration++;session.phase='paused';},disposed:false,overview:false});return {view,session,state,calls,cycle,doneClaims};
}
for(const measured of [true,false])for(const bpm of [18,180]){
 test(`${measured?'measured':'manual'} A at ${bpm} advances only to B without achievement or a Done claim`,async()=>{
  const f=fixture(0,{measured,bpm});await f.view.completeContrast(f.session);assert.deepEqual(f.calls,['clip:1','continue B']);assert.deepEqual(f.state.best,{});assert.equal(f.cycle.index,1);assert.equal(f.doneClaims.canToggle(f.state,{passage:owner.id,pattern:owner.pattern,rate:bpm}),false);
 });
 test(`${measured?'measured':'manual'} complete A/B at ${bpm} restarts the same contrast at its next rate`,async()=>{
  const f=fixture(1,{measured,bpm});f.state.best[owner.pattern]=180;await f.view.completeContrast(f.session);assert.deepEqual(f.calls,['save','restart A']);assert.equal(f.view.contrastExercise,owner);assert.equal(f.view.overview,false);assert.equal(f.state.best[owner.pattern],180);assert.equal(f.state.best[plan.chunks[0].pattern],undefined);assert.equal(f.state.working,measured&&bpm===18?21.6:bpm);assert.equal(f.doneClaims.canToggle(f.state,{passage:owner.id,pattern:owner.pattern,rate:bpm}),true);
 });
}
test('a first measured full cycle earns only its contrast credit',async()=>{const f=fixture(1);await f.view.completeContrast(f.session);assert.deepEqual(f.state.best,{[owner.pattern]:180});assert.deepEqual(f.calls,['save','restart A']);});
test('manual full cycle exposes Done without manufacturing measured credit',async()=>{const f=fixture(1,{measured:false});await f.view.completeContrast(f.session);assert.deepEqual(f.state.best,{});assert.deepEqual(f.calls,['save','restart A']);});
test('tempo lock retains a fresh paired cycle at its sounding rate',async()=>{const f=fixture(1,{bpm:90,keepTempo:true});await f.view.completeContrast(f.session);assert.deepEqual(f.calls,['save','restart A']);assert.equal(f.state.best[owner.pattern],90);assert.equal(f.state.working,90);});
test('a queued rate changes the next cycle without changing earned credit',async()=>{const f=fixture(1,{bpm:90});f.view.queuedWorking=120;await f.view.completeContrast(f.session);assert.equal(f.state.best[owner.pattern],90);assert.equal(f.state.working,120);assert.equal(f.view.queuedWorking,undefined);assert.deepEqual(f.calls,['save','restart A']);});
test('an all-complete catalog still repeats the selected contrast',async()=>{const f=fixture(1);for(const chunk of practiceCatalogChunks(plan))f.state.best[chunk.pattern]=180;await f.view.completeContrast(f.session);assert.deepEqual(f.calls,['save','restart A']);assert.equal(f.view.overview,false);assert.equal(f.view.contrastExercise,owner);});
for(const change of ['pause','close','overview','selection','failed save'] as const)test(`${change} while B saves prevents a stale cycle restart`,async()=>{
 const f=fixture(1);let resolve!:(ok:boolean)=>void;f.view.save=()=>new Promise(r=>{resolve=r;});const pending=f.view.completeContrast(f.session);
 if(change==='pause')f.view.pause();else if(change==='close')f.view.disposed=true;else if(change==='overview')f.view.overview=true;else if(change==='selection')f.view.session={...f.session};resolve(change!=='failed save');await pending;assert.deepEqual(f.calls,[]);assert.equal(f.state.best[owner.pattern],180);
});
test('a cancelled or out-of-order cycle cannot earn credit or restart',async()=>{for(const cancelled of [true,false]){const f=fixture(1);if(cancelled)f.cycle.cancel();else f.cycle.start(180,true);await f.view.completeContrast(f.session);assert.deepEqual(f.state.best,{});assert.deepEqual(f.calls,[]);assert.equal(f.session.phase,'paused');}});
