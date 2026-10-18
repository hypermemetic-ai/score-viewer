import test from 'node:test';import assert from 'node:assert/strict';
import {referenceFixture} from './support/reference-score';
import {authoredManualPackage} from './support/manual-practice-fixture';
import {planPractice,initialPractice,readPractice,transferPracticeEdition,setPracticeGoal,passed,type PracticeState} from '../src/practice';
import {planManualPractice} from '../src/manual-practice-plan';
import {readManualPractice,manualPracticeRecord} from '../src/manual-practice-state';
import {snapPracticeSpeed} from '../src/tempo-presentation';
const p=await referenceFixture(new URL('../vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.tuna',import.meta.url)),plan=planPractice(p);
const settings={start:10,working:26.966292134831466,step:5,connectionStart:99.123456789,tolerance:123.456789,offset:-17.123456789,countInBars:4,resumeCooldownSeconds:7,keepTempo:true,audioOutput:'synthetic-retained-output'};
function chosen(state:PracticeState){Object.assign(state,settings);delete state.speedRevision;state.workingByPattern={...state.workingByPattern,'retained-historical-rate':35.123456789};return state;}
function exact(state:PracticeState){for(const key of Object.keys(settings) as (keyof typeof settings)[])assert.equal(state[key],settings[key],key);}
for(const partition of ['fixed-four-v1','connection-boundary-v1'] as const)test(`${partition} bounded migration preserves valid literal choices and raw recovery`,()=>{
 const oldPlan=plan.legacyPlans![partition]!,raw=chosen(initialPractice(oldPlan)),chunk=oldPlan.chunks[0];raw.workingByPattern[chunk.pattern]=67.123456789;raw.best[chunk.pattern]=80.123456789;
 const bytes=JSON.stringify(raw),next=readPractice(raw,plan);exact(next);assert.equal(next.target,180);
 for(const [key,value]of Object.entries(raw.workingByPattern))assert.equal(next.workingByPattern[key],value);
 assert.equal(next.workingByPattern[plan.chunks[0].pattern],67.123456789);assert.equal(next.best[plan.chunks[0].pattern],80.123456789);
 assert.equal(JSON.stringify(raw),bytes);assert.deepEqual(next.legacy!.state,raw);
 const reopened=readPractice(JSON.parse(JSON.stringify(next)),plan);assert.deepEqual(reopened,next);exact(reopened);
 // The explicit historical planner still applies its original normalization.
 const legacy=readPractice(raw,oldPlan);assert.equal(legacy.step,5.4);assert.equal(legacy.start,9.9);assert.equal(legacy.working,27);assert.equal(legacy.tolerance,500);assert.equal(legacy.offset,0);
});
for(const revision of [undefined,2] as const)test(`bounded reopen preserves stored precision with speed revision ${revision}`,()=>{
 const raw=chosen(initialPractice(plan));raw.speedRevision=revision;raw.start=45;delete raw.usabilityRevision;const before=JSON.stringify(raw),next=readPractice(raw,plan);
 assert.equal(next.start,45);assert.equal(next.working,settings.working);assert.equal(next.step,5);assert.equal(next.tolerance,settings.tolerance);assert.equal(next.offset,settings.offset);assert.deepEqual(next.workingByPattern,raw.workingByPattern);
 assert.equal(JSON.stringify(raw),before);assert.deepEqual(readPractice(JSON.parse(JSON.stringify(next)),plan),next);
});
test('bounded defaults fill only absent preferences while invalid stored choices still refuse',()=>{
 const raw=chosen(initialPractice(plan)),partial=structuredClone(raw) as Partial<PracticeState>;delete partial.step;delete partial.start;delete partial.connectionStart;delete partial.countInBars;delete partial.resumeCooldownSeconds;
 const next=readPractice(partial,plan),fresh=initialPractice(plan);assert.equal(next.start,fresh.start);assert.equal(next.step,fresh.step);assert.equal(next.connectionStart,fresh.connectionStart);assert.equal(next.countInBars,2);assert.equal(next.resumeCooldownSeconds,3);assert.equal(next.working,raw.working);assert.equal(next.tolerance,raw.tolerance);assert.equal(next.offset,raw.offset);
 for(const patch of [{step:.024},{working:NaN},{start:0},{connectionStart:501},{tolerance:19},{offset:1001},{countInBars:2.5},{resumeCooldownSeconds:31},{speedRevision:1},{workingByPattern:{invalid:Infinity}}]){
  const candidate={...raw,...patch},copy=structuredClone(candidate);assert.throws(()=>readPractice(candidate,plan));assert.deepEqual(candidate,copy);
 }
});
test('bounded reads preserve choices while explicit goal edits and completion retain quantization policies',()=>{
 const raw=chosen(initialPractice(plan)),changed=setPracticeGoal(raw,plan,240);assert.equal(changed.target,240);assert.equal(changed.step,4.8);assert.equal(changed.working,snapPracticeSpeed(raw.working,240));exact(readPractice(raw,plan));
 const completed=readPractice(raw,plan);completed.keepTempo=false;passed(plan.chunks[0],completed);assert.equal(completed.working,snapPracticeSpeed(raw.working+raw.step,raw.target));assert.equal(completed.step,raw.step);
 // Target is an intentional reference-derived cache unless personalGoal owns it.
 assert.equal(readPractice({...raw,target:240},plan).target,180);
 const goal={version:'personal-performance-goal-v1' as const,bpm:240,beat:plan.referencePerformanceTempo!.beat};assert.equal(readPractice({...raw,target:240,personalGoal:goal},plan).target,240);
});
test('hand/finger edition projection preserves literal choices and history from both legacy and bounded journals',()=>{
 const from=structuredClone(p);from.sourceScore=structuredClone(from.score);from.sourceSha256='a'.repeat(64);from.sourceRevision='a'.repeat(64);from.keyboardLayout='janko-four-row';
 const to=structuredClone(from);to.manifest.revision='b'.repeat(64);to.score.notes[0].hand=to.score.notes[0].hand==='LH'?'RH':'LH';if(to.fingerLayer?.attacks[0])to.fingerLayer.attacks[0].finger=to.fingerLayer.attacks[0].finger===1?2:1;
 for(const partition of ['fixed-four-v1','bounded-exercises-v1'] as const){
  const oldPlan=planPractice(from,partition),raw=chosen(initialPractice(oldPlan));raw.workingByPattern[oldPlan.chunks[0].pattern]=67.123456789;raw.best[oldPlan.chunks[0].pattern]=80.123456789;const before=JSON.stringify(raw);
  const next=transferPracticeEdition(from,raw,to),current=planPractice(to);exact(next);assert.equal(next.workingByPattern[current.chunks[0].pattern],67.123456789);assert.equal(next.best[current.chunks[0].pattern],80.123456789);
  for(const [key,value]of Object.entries(raw.workingByPattern))assert.equal(next.workingByPattern[key],value);
  assert.deepEqual(next.editionEvidence!.rawState,raw);assert.equal(JSON.stringify(raw),before);assert.deepEqual(readPractice(JSON.parse(JSON.stringify(next)),current),next);
 }
});
test('manual bounded migration and record roundtrip preserve literal choices without introducing measured evidence',async()=>{
 const source=await authoredManualPackage(12),current=await planManualPractice(source),old=current.legacyPlans!['fixed-four-v1'] as typeof current,raw=chosen(initialPractice(old));
 const record={version:'musical-manual-practice-v1' as const,partId:old.partId,musicalRevision:old.revision,state:raw},before=JSON.stringify(record),next=readManualPractice(record,current);exact(next);assert.deepEqual(next.best,{});assert.equal(JSON.stringify(record),before);assert.deepEqual(next.legacy!.record,record);
 assert.deepEqual(readManualPractice(manualPracticeRecord(current,next),current),next);
});
