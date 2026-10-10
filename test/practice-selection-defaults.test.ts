import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceFixture} from './support/reference-score';
import {PracticeView} from '../src/practice-view';
import {PracticeBrowser} from '../src/practice-browser';
import {PracticeDone} from '../src/practice-attainment';
import {initialPractice,planPractice,readPractice,passageHierarchy,passageStartTempo,reconcilePassages,type PracticeState} from '../src/practice';
import {practicePreferences,practiceStateForContext} from '../src/practice-context';
const p=await referenceFixture(new URL('../vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.isoscore',import.meta.url)),plan=planPractice(p);

test('fresh selection ignores saved working rates without changing earned or saved evidence',()=>{
 const raw=initialPractice(plan);raw.start=27;raw.connectionStart=99;raw.working=72;raw.workingByPattern[plan.chunks[0].pattern]=144;raw.best[plan.chunks[0].pattern]=180;
 const before=structuredClone(raw),state=readPractice(raw,plan);
 assert.equal(passageStartTempo(plan,state,plan.chunks[0]),27);assert.equal(state.working,72);assert.equal(state.workingByPattern[plan.chunks[0].pattern],144);assert.deepEqual(state.best,raw.best);assert.deepEqual(raw,before);
});
test('only a genuine joined tree with every original leaf complete uses connection speed',()=>{
 const s=initialPractice(plan);s.start=27;s.connectionStart=99;
 for(const c of plan.chunks.slice(0,2))s.best[c.pattern]=s.target;
 const joined=reconcilePassages(plan,s).all.get('1-8')!;assert.equal(passageStartTempo(plan,s,joined),99);
 // An earned parent does not certify the prerequisites after a raised goal.
 s.best[joined.pattern]=s.target;delete s.best[plan.chunks[1].pattern];assert.equal(passageStartTempo(plan,s,joined),27);
 assert.equal(passageStartTempo(plan,s,{...plan.chunks[0],components:[plan.chunks[0].id,plan.chunks[1].id]}),27);
 assert.equal(passageStartTempo(plan,s,plan.chunks[0]),27);
});
test('missing defaults fill additively while explicit one-percent and custom increments remain chosen',()=>{
 for(const percent of [1,3,4.5]){
  const raw=initialPractice(plan);delete raw.connectionStart;raw.step=raw.target*percent/100;
  const before=structuredClone(raw),state=readPractice(raw,plan);assert.equal(state.step,raw.step);assert.equal(state.connectionStart,90);assert.deepEqual(raw,before);
 }
 const raw=initialPractice(plan) as Partial<PracticeState>;delete raw.step;delete raw.connectionStart;
 const state=readPractice(raw,plan);assert.equal(state.step,3.6);assert.equal(state.connectionStart,90);
 for(const connectionStart of [NaN,0,501])assert.throws(()=>readPractice({...state,connectionStart},plan),/retained/);
 const snapped=readPractice({...state,connectionStart:99.123},plan);assert.equal(snapped.connectionStart,99);
 const prefs=practicePreferences(snapped),next=practiceStateForContext(plan,undefined,{partition:plan.partition,composites:{},selected:plan.chunks[0].id,includeManual:false,preferences:prefs});assert.equal(next.connectionStart,99);
});
test('actual passage action resets new selection, while restored context keeps its working rate',async()=>{
 const state=initialPractice(plan);state.working=72;state.workingByPattern[plan.chunks[0].pattern]=144;
 const view=Object.create(PracticeView.prototype) as any;
 Object.assign(view,{plan,state,browser:new PracticeBrowser(plan),sourceCrops:new Map(),doneClaims:new PracticeDone(),queuedWorking:135,options:{connected:()=>false},app:{querySelector:()=>({focus(){}})}});
 view.cancelTempoHold=view.resetCarrySetup=view.stopClock=view.clearPose=view.paint=()=>{};view.contacts={clear(){}};
 await view.action('passage:'+plan.chunks[0].id);assert.equal(state.working,18);assert.equal(view.session.bpm,18);assert.equal(view.queuedWorking,undefined);view.session.ready(0);view.loopRate=18;view.clock={};assert.equal(view.predictedRepeatRate(view.session),18);
 state.working=72;view.queuedWorking=81;view.selectPassage(plan.chunks[0],false);assert.equal(state.working,72);assert.equal(view.session.bpm,72);assert.equal(view.queuedWorking,81);
 state.best[plan.chunks[0].pattern]=state.best[plan.chunks[1].pattern]=state.target;passageHierarchy(plan,state);reconcilePassages(plan,state);
 await view.action('passage:1-8');assert.equal(view.queuedWorking,undefined);assert.equal(state.working,90);assert.equal(view.session.bpm,90);assert.equal(state.workingByPattern[plan.chunks[0].pattern],144);
});
