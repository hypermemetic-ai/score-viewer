import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceFixture} from './support/reference-score';
import {planPractice,initialPractice,readPractice,passageHierarchy,practiceCatalogChunks,practiceClipChunk,totalProgress,progressFor} from '../src/practice';
import {toggleDone} from '../src/practice-attainment';
import {toggleExerciseExclusion} from '../src/practice-exercise-catalog';
const p=await referenceFixture(new URL('../vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.isoscore',import.meta.url));
const plan=planPractice(p);
test('bounded No14 catalog has all originals, overlapping doubles, and independent contrast episodes upfront',()=>{
 assert.equal(plan.partition,'bounded-exercises-v1');assert.equal(plan.chunks.length,16);
 const rows=practiceCatalogChunks(plan);assert.equal(rows.length,35);
 assert.equal(rows.filter(c=>c.kind==='connection').length,15);assert.equal(rows.filter(c=>c.kind==='contrast').length,4);
 assert.deepEqual(rows.filter(c=>c.kind==='connection').slice(0,2).map(c=>c.originalIds),[['1-4','5-8'],['5-8','9-12']]);
 assert.ok(rows.every(c=>!c.id.includes(':')));assert.equal(new Set(rows.map(c=>c.id)).size,35);
 const state=initialPractice(plan);assert.equal(passageHierarchy(plan,state).all.size,35);assert.equal(totalProgress(plan,state),0);
 for(const contrast of rows.filter(c=>c.kind==='contrast')){for(const i of [0,1]){const clip=practiceClipChunk(contrast,i);assert.equal(clip.id,contrast.id);assert.equal(clip.pattern,contrast.pattern);assert.equal(clip.start,contrast.clips![i].start);assert.equal(clip.end,contrast.clips![i].end);}assert.throws(()=>practiceClipChunk(contrast,2));}
});
test('equal included exercise weight and exclusion are separate from genuine readiness',()=>{
 const state=initialPractice(plan),rows=practiceCatalogChunks(plan),connection=plan.catalog!.find(c=>c.kind==='connection')!;
 state.best[rows[0].pattern]=state.target;assert.equal(totalProgress(plan,state),3/35); // three exact repeated originals share their genuine claim
 state.excluded=toggleExerciseExclusion(state.excluded,rows[1].id,plan.catalog!);
 assert.equal(totalProgress(plan,state),3/34);assert.equal(progressFor(rows[1],state),0);
 assert.ok(connection.prerequisites.includes(rows[1].id));
 for(const row of rows)state.excluded[row.id]=true;assert.equal(totalProgress(plan,state),0);
 assert.deepEqual(readPractice(structuredClone(state),plan).excluded,state.excluded);
 assert.throws(()=>readPractice({...state,excluded:{unknown:true}},plan),/exclusion/);
});
for(const partition of ['fixed-four-v1','connection-boundary-v1'] as const)test(`${partition} projection preserves literal recovery and only exact full spans`,()=>{
 const oldPlan=plan.legacyPlans![partition]!,old=initialPractice(oldPlan),first=oldPlan.chunks[0];
 old.best[first.pattern]=90;toggleDone(old,{passage:first.id,pattern:first.pattern,rate:180});
 old.composites={'1-8':['1-4','5-8'],'1-12':['1-8','9-12']};const oldRows=passageHierarchy(oldPlan,old).all;
 old.best[oldRows.get('1-8')!.pattern]=120;old.best[oldRows.get('1-12')!.pattern]=180;old.audioOutput='retained-output';
 const bytes=JSON.stringify(old),next=readPractice(old,plan),rows=practiceCatalogChunks(plan);
 assert.equal(JSON.stringify(old),bytes);assert.deepEqual(next.legacy!.state,old);assert.equal(next.audioOutput,'retained-output');
 assert.equal(progressFor(rows[0],next),1);assert.equal(next.best[rows.find(c=>c.kind==='connection'&&c.originalIds![0]==='1-4')!.pattern],120);
 assert.ok(rows.filter(c=>c.kind==='contrast').every(c=>progressFor(c,next)===0));assert.equal(next.composites,undefined);
 assert.deepEqual(readPractice(structuredClone(next),plan),next);
 const broken=structuredClone(old);broken.composites={'1-12':['1-4','9-12']};assert.throws(()=>readPractice(broken,plan),/adjacent/);
 assert.throws(()=>readPractice({...next,policyFingerprint:'unknown-policy'},plan),/policy/);
});
