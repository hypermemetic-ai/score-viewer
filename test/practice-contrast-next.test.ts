import test from 'node:test';import assert from 'node:assert/strict';
import {PracticeView} from '../src/practice-view';
import {PracticeContrastCycle} from '../src/practice-contrast-cycle';
import {planPractice,initialPractice,practiceCatalogChunks,practiceClipChunk} from '../src/practice';
import {referenceFixture} from './support/reference-score';
const p=await referenceFixture(new URL('../vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.isoscore',import.meta.url)),plan=planPractice(p),owner=practiceCatalogChunks(plan).find(c=>c.kind==='contrast')!;
function fixture(index:0|1,keepTempo=false){const state=initialPractice(plan);state.working=state.target;state.keepTempo=keepTempo;const cycle=new PracticeContrastCycle();cycle.start(state.working,true);if(index===1)cycle.accept(0,state.working,true);
 const session={chunk:practiceClipChunk(owner,index),phase:'complete',measured:true},view=Object.create(PracticeView.prototype) as any,calls:string[]=[];
 Object.assign(view,{plan,state,session,contrastExercise:owner,contrastCycle:cycle,loopRate:state.working,startGeneration:0,doneClaims:{completed:()=>calls.push('claim')},stopClock:()=>view.startGeneration++,paintControls:()=>{},save:async()=>true,selectPassage:(c:any)=>calls.push('select:'+c.id),mountContrastClip:(i:number)=>calls.push('clip:'+i),startContrast:async()=>calls.push('restart'),paint:()=>{},disposed:false,overview:false});return {view,session,state,calls};
}
test('A completion advances only to B, never a recommendation or achievement',async()=>{const f=fixture(0);await f.view.completeContrast(f.session);assert.deepEqual(f.calls,['clip:1','restart']);assert.deepEqual(f.state.best,{});});
test('a full measured B at goal follows ordinary genuine recommendation; no original credit or whole-source assertion',async()=>{const f=fixture(1);await f.view.completeContrast(f.session);assert.deepEqual(f.calls,['claim','select:1-4']);assert.equal(f.state.best[owner.pattern],f.state.target);assert.equal(f.state.best[plan.chunks[0].pattern],undefined);});
test('tempo lock retains a fresh paired cycle after B',async()=>{const f=fixture(1,true);await f.view.completeContrast(f.session);assert.deepEqual(f.calls,['claim','restart']);assert.equal(f.state.best[owner.pattern],f.state.target);});
test('a paused generation while B completion saves cannot select or restart a successor',async()=>{const f=fixture(1);let resolve!:(ok:boolean)=>void;f.view.save=()=>new Promise(r=>{resolve=r;});const pending=f.view.completeContrast(f.session);f.view.startGeneration++;f.session.phase='paused';resolve(true);await pending;assert.deepEqual(f.calls,['claim']);});
