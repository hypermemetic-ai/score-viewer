import test from 'node:test';
import assert from 'node:assert/strict';
import {authoredFrettedLongInput} from './support/fretted-dual-fixture';
import {prepareDualReadingPackage} from '../src/dual-reading-package';
import {importPackage} from '../src/package';
import {ManualReadingContext} from '../src/manual-reading-context';
import {ManualPracticeView} from '../src/manual-practice-view';
import {manualPracticeRecord,readManualPractice} from '../src/manual-practice-state';
import {hasDone} from '../src/practice-attainment';
import {passageStartTempo,reconcilePassages} from '../src/practice';

const p=await importPackage(await prepareDualReadingPackage(authoredFrettedLongInput()));
function viewFor(context:ManualReadingContext){
 const view=Object.create(ManualPracticeView.prototype) as any;
 Object.assign(view,{plan:context.plan,state:context.state,browser:context.browser,options:{context},app:{querySelector:()=>({focus(){}})}});
 view.paint=()=>{};return view;
}
test('neutral manual new selection closes the old queued attempt and uses its configured source default',async()=>{
 const c=await ManualReadingContext.open(p,undefined,undefined,'fixed-four-v1'),view=viewFor(c),first=c.plan.chunks[0];
 c.state.start=12;c.state.working=64;c.state.workingByPattern[first.pattern]=85;
 const old=c.selectPassage(first);old.ready(1000);old.queueWorking(75);let closed=0;view.transport={close(){closed++;}};
 const record=c.record(),music=c.plan.revision;
 await view.action('passage:'+first.id);
 assert.equal(closed,1);assert.equal(old.phase,'paused');assert.equal(c.state.working,12);assert.equal(c.session!.bpm,12);assert.equal(c.session!.nextRate(),12);
 assert.equal(c.session!.assessment,'manual');assert.equal(c.session!.canDone,false);assert.deepEqual(c.state.best,{});assert.equal(c.state.workingByPattern[first.pattern],85);
 assert.equal(c.plan.revision,music);assert.deepEqual(c.state.manualAttainment,record.state.manualAttainment);assert.deepEqual(c.state.composites,record.state.composites);
 c.state.working=67;view.selectPassage(first,false);assert.equal(c.state.working,67);assert.equal(c.session!.bpm,67);assert.equal(c.session!.nextRate(),67);
});
test('manual completed original leaves grant connection default without measured evidence or provenance changes',async()=>{
 const c=await ManualReadingContext.open(p,undefined,undefined,'fixed-four-v1');c.state.connectionStart=55;
 for(const chunk of c.plan.chunks.slice(0,2)){
  c.state.working=c.state.target;const s=c.selectPassage(chunk);s.ready(0);s.update(s.startMs+s.durationMs+1);if(!hasDone(c.state,s.doneTarget()))assert.equal(s.toggleDone()?.marked,true);
 }
 const joined=reconcilePassages(c.plan,c.state).all.get('1-8')!,record=c.record(),view=viewFor(c);
 c.state.workingByPattern[joined.pattern]=80;await view.action('passage:'+joined.id);
 assert.equal(c.state.working,55);assert.deepEqual(c.state.best,{});assert.deepEqual(c.state.manualAttainment,record.state.manualAttainment);
 assert.equal(passageStartTempo(c.plan,c.state,{...c.plan.chunks[0],components:['1-4','5-8']}),c.state.start);
 const reopened=await ManualReadingContext.open(p,c.record(),c.viewRecord(),'fixed-four-v1');assert.deepEqual(reopened.record(),c.record());
 assert.equal(reopened.plan.revision,c.plan.revision);assert.equal(reopened.plan.partId,c.plan.partId);
});
test('manual defaults round trip independently of notation and preserve explicit increments and unknown evidence refusal',async()=>{
 const c=await ManualReadingContext.open(p,undefined,undefined,'fixed-four-v1');assert.equal(c.state.connectionStart,50);assert.equal(c.state.step,2);
 c.state.step=3;const before=c.record();c.switchNotation('tab');assert.deepEqual(c.record(),before);
 const reopened=await ManualReadingContext.open(p,before,c.viewRecord(),'fixed-four-v1');assert.equal(reopened.state.step,3);assert.equal(reopened.state.connectionStart,50);
 const missing=structuredClone(before);delete (missing.state as any).step;delete missing.state.connectionStart;
 const filled=readManualPractice(missing,c.plan);assert.equal(filled.step,2);assert.equal(filled.connectionStart,50);assert.deepEqual(missing.state.best,{});
 assert.throws(()=>readManualPractice({...before,state:{...before.state,best:{forged:100}}},c.plan),/cannot carry piano-measured/);
 assert.throws(()=>readManualPractice({...before,partId:'unrelated-part'},c.plan),/source or part differs/);
 assert.deepEqual(before,manualPracticeRecord(c.plan,c.state));
});
