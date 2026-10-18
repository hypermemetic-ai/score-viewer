import test from 'node:test';import assert from 'node:assert/strict';
import {referenceFixture} from './support/reference-score';
import {authoredManualPackage} from './support/manual-practice-fixture';
import {PracticeView} from '../src/practice-view';import {ManualPracticeView} from '../src/manual-practice-view';
import {planPractice,initialPractice,readPractice} from '../src/practice';import {planManualPractice} from '../src/manual-practice-plan';
import {speedNumber} from '../src/tempo-presentation';
import {tempoRateNumber} from '../src/metronome-mark';
const p=await referenceFixture(new URL('../vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.tuna',import.meta.url));
const manualSource=await authoredManualPackage(12);
const plans={piano:planPractice(p),manual:await planManualPractice(manualSource)};
const keys=['working','start','connectionStart','step'] as const;
function fixture(mode:keyof typeof plans,plan=plans[mode]){
 const state=readPractice({...initialPractice(plan),start:10,working:26.966292134831466,connectionStart:99.123456789,step:5,tolerance:123.456789,offset:-17.123456789,workingByPattern:{'retained-working-choice':67.123456789}},plan),view=Object.create(mode==='piano'?PracticeView.prototype:ManualPracticeView.prototype) as any,messages:string[]=[];
 Object.assign(view,{plan,state,applySetting(next:any){Object.assign(this.state,next);},refreshSettings(){},cancelTempoHold(){},status(message:string){messages.push(message);}});return {view,state,messages};
}
function field(state:ReturnType<typeof initialPractice>,key:typeof keys[number],value:string){const original=state[key]!;return {dataset:{practiceSetting:key,absolute:String(original),presented:speedNumber(original,state.target)},value};}
for(const mode of ['piano','manual'] as const){
 for(const key of keys)test(`${mode} actual ${key} typing rounds only the changed field after validation`,()=>{
  const {view,state}=fixture(mode),before=structuredClone(state),input=key==='step'?'2.34':'12.34',expected=mode==='piano'?(key==='step'?4.5:22.5):(key==='step'?2.5:12.5);
  assert.equal(state.target,mode==='piano'?180:100);assert.equal(view.setting(field(state,key,input)),true);assert.deepEqual(state,{...before,[key]:expected});
 });
 test(`${mode} untouched displayed values preserve all saved precision`,()=>{
  const {view,state}=fixture(mode),before=structuredClone(state);
  for(const key of keys){assert.equal(view.setting(field(state,key,speedNumber(state[key]!,state.target))),true);assert.deepEqual(state,before);}
 });
 test(`${mode} invalid typed values cannot enter through rounding or mutate other choices`,()=>{
  const {view,state,messages}=fixture(mode),before=structuredClone(state);
  for(const [key,text]of [['working','0.1'],['start','600'],['connectionStart','not-a-number'],['step','0.001'],['step','101']] as const){assert.equal(view.setting(field(state,key,text)),false,`${key}: ${text}`);assert.deepEqual(state,before);}
  assert.equal(messages.length,5);
 });
 test(`${mode} owned draft commit uses the same field rounding without normalizing the journal`,()=>{
  const {view,state}=fixture(mode),before=structuredClone(state),input=field(state,'working','12.34');Object.assign(input.dataset,{manualDraftText:'12.34',manualDraft:String(12.34*state.target/100)});
  assert.equal(view.setting(input),true);assert.deepEqual(state,{...before,working:mode==='piano'?22.5:12.5});
 });
}
test('actual low-target Step typing rounds the changed input while literal reloading stays exact',()=>{
 const plan={...plans.piano,referencePerformanceTempo:{...plans.piano.referencePerformanceTempo!,bpm:5}}, {view,state}=fixture('piano',plan),before=structuredClone(state);
 assert.equal(view.setting(field(state,'step','0.75')),true);assert.deepEqual(state,{...before,step:.05});
 assert.equal(readPractice({...before,step:.0375},plan).step,.0375);
});

for(const mode of ['piano','manual'] as const)for(const personal of [false,true])test(`${mode} unchanged Target preserves literal choices and ${personal?'existing':'absent'} personal goal authority`,()=>{
 const {view,state}=fixture(mode),plan=plans[mode];
 if(personal)Object.assign(state,readPractice({...state,target:185.123456789,personalGoal:{version:'personal-performance-goal-v1',bpm:185.123456789,beat:plan.referencePerformanceTempo!.beat}},plan));
 const before=structuredClone(state),shown=tempoRateNumber(state.target);let refreshes=0;
 view.applySetting=()=>assert.fail('An unchanged Target must not apply a new goal or rewrite preferences.');
 view.refreshSettings=view.refreshFields=()=>refreshes++;
 for(const draft of [false,true]){
  const input={dataset:{practiceSetting:'target',absolute:String(state.target),presented:shown,...(draft?{manualDraft:String(state.target),manualDraftText:shown}:{})},value:shown};
  assert.equal(view.setting(input),true);assert.deepEqual(state,before);
 }
 assert.equal(refreshes,2);
});
