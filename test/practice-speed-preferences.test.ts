import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceFixture} from './support/reference-score';
import {planPractice,initialPractice,readPractice} from '../src/practice';
import {practicePreferences,practiceStateForContext} from '../src/practice-context';
import {adjustPracticePercent as adjustPercent,adjustProgression,snapPracticeSpeed,snapPracticeStep,speedEdit} from '../src/tempo-presentation';
const p=await referenceFixture(new URL('../vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.isoscore',import.meta.url));
const plan=planPractice(p);
const onGrid=(value:number,goal:number)=>assert.ok(Math.abs(value/(goal*.005)-Math.round(value/(goal*.005)))<1e-9);
test('fresh practice uses ten percent, two bars and a three-second cooldown',()=>{
 const s=initialPractice(plan);assert.equal(s.working,plan.referencePerformanceTempo!.bpm*.1);assert.equal(s.start,s.working);assert.equal(s.countInBars,2);assert.equal(s.resumeCooldownSeconds,3);assert.equal(s.speedRevision,2);
 const prefs=practicePreferences({...s,countInBars:4,resumeCooldownSeconds:7});const next=practiceStateForContext(plan,undefined,{partition:plan.partition,composites:{},selected:plan.chunks[0].id,includeManual:false,preferences:prefs});assert.equal(next.countInBars,4);assert.equal(next.resumeCooldownSeconds,7);
});
test('restored and typed preferences snap without rewriting historical attainment or caller data',()=>{
 const raw=initialPractice(plan);raw.start=10.123;raw.working=10.01;raw.step=.0375;raw.workingByPattern[plan.chunks[0].pattern]=10.001;raw.best[plan.chunks[0].pattern]=10.123456789;raw.manualAttainment={version:1,marks:{[JSON.stringify([plan.chunks[0].id,plan.chunks[0].pattern])]:[13.123456789]}};const before=JSON.stringify(raw);
 const s=readPractice(raw,plan);for(const n of [s.start,s.working,s.step,...Object.values(s.workingByPattern)])onGrid(n,s.target);assert.deepEqual(s.best,raw.best);assert.deepEqual(s.manualAttainment,raw.manualAttainment);assert.equal(JSON.stringify(raw),before);
 const typed=readPractice({...s,working:speedEdit('17.23',s.working,s.target)},plan);onGrid(typed.working,typed.target);
});
test('half-point holds, progression and physical boundaries remain on the same lattice',()=>{
 for(const goal of [5,67.5,180,360,500]){let n=snapPracticeSpeed(5,goal);onGrid(n,goal);assert.ok(n>=5);for(let i=0;i<600;i++){n=adjustPercent(n,goal,1);onGrid(n,goal);}assert.ok(n<=500);n=adjustPercent(n,goal,-1);onGrid(n,goal);let step=snapPracticeStep(.025,goal);onGrid(step,goal);assert.equal(step,goal*.005);for(let i=0;i<10;i++){step=adjustProgression(step,goal,1,4000);onGrid(step,goal);}}
});
test('legacy absolute-ten defaults migrate beside exact earned evidence; deliberate saved rates survive',()=>{
 const s=initialPractice(plan);delete s.speedRevision;s.start=10;s.working=10;s.workingByPattern={};assert.equal(readPractice(s,plan).start,s.target*.1);s.best[plan.chunks[0].pattern]=70.123;const loaded=readPractice(s,plan);assert.equal(loaded.start,s.target*.1);s.working=33.333;s.workingByPattern[plan.chunks[0].pattern]=45.678;const chosen=readPractice(s,plan);assert.equal(chosen.working,snapPracticeSpeed(33.333,s.target));assert.equal(chosen.workingByPattern[plan.chunks[0].pattern],snapPracticeSpeed(45.678,s.target));assert.equal(loaded.best[plan.chunks[0].pattern],70.123);
 for(const patch of [{countInBars:0},{countInBars:2.5},{resumeCooldownSeconds:31},{resumeCooldownSeconds:.5}])assert.throws(()=>readPractice({...s,...patch},plan),/count-in bars/);
});
