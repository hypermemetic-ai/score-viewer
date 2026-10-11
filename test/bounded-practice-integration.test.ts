import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceFixture} from './support/reference-score';
import {planPractice,initialPractice,readPractice,passageHierarchy,practiceCatalogChunks,practiceClipChunk,totalProgress,progressFor,PracticeSession,transferPracticeEdition} from '../src/practice';
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
test('guarded earlier hand-choice evidence survives current assignment choices without rewriting its original key',()=>{
 const oldPlan=plan.legacyPlans!['fixed-four-v1']!,old=initialPractice(oldPlan),chunk=oldPlan.chunks[0];
 const hands=p.score.notes.filter(n=>n.startTick<chunk.end&&n.startTick+n.durationTicks>chunk.start&&'pitch' in n).map(n=>[n.id,'pitch' in n?n.pitch.octave*12+n.pitch.pitchClass:0,n.startTick,n.durationTicks,n.hand==='LH'?'RH':'LH']).sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
 const key='personal-hands-v1:'+JSON.stringify({base:chunk.pattern,hands});old.best[key]=90;old.groundwork={[key]:true};toggleDone(old,{passage:chunk.id,pattern:key,rate:180});
 const loaded=readPractice(old,oldPlan);assert.equal(progressFor(chunk,loaded),1);assert.deepEqual(loaded.best,old.best);
 const migrated=readPractice(old,plan);assert.equal(progressFor(plan.chunks[0],migrated),1);assert.equal(migrated.best[plan.chunks[0].pattern],90);assert.deepEqual(migrated.legacy!.state,old);
 const forged=structuredClone(old);const wrong='personal-hands-v1:'+JSON.stringify({base:chunk.pattern,hands:hands.slice(1)});forged.manualAttainment={version:1,marks:{[JSON.stringify([chunk.id,wrong])]:[180]}};assert.throws(()=>readPractice(forged,plan),/Self-reported passage differs/);
});
test('new piano claim identities retain authored articulation and phrase facts rather than attack-only coincidences',()=>{
 const changed=structuredClone(p),note=changed.score.notes.find(n=>n.startTick>=plan.chunks[4].start&&n.startTick<plan.chunks[4].end)!;note.articulation='staccato';
 const current=planPractice(changed);assert.notEqual(current.chunks[0].pattern,current.chunks[4].pattern);
 const state=initialPractice(current);state.best[current.chunks[0].pattern]=state.target;assert.equal(progressFor(current.chunks[4],state),0);
});

test('contrast sessions reject unselected and invented continuous source spans before starting a clock',()=>{
 const state=initialPractice(plan),owner=practiceCatalogChunks(plan).find(c=>c.kind==='contrast')!;
 assert.throws(()=>new PracticeSession(plan,owner,state,true),/owning source clip/);
 const clip=practiceClipChunk(owner,0);assert.throws(()=>new PracticeSession(plan,{...clip,end:owner.clips![1].end},state,true),/owning source clip/);
});

test('materialized hand/finger editions preserve exact source exercises, exclusions and literal prior journals',()=>{
 const from=structuredClone(p);from.sourceScore=structuredClone(from.score);from.sourceSha256='a'.repeat(64);from.sourceRevision='a'.repeat(64);from.keyboardLayout='janko-four-row';
 const oldPlan=planPractice(from),old=initialPractice(oldPlan),rows=practiceCatalogChunks(oldPlan);old.best[rows[0].pattern]=90;toggleDone(old,{passage:rows[0].id,pattern:rows[0].pattern,rate:180});
 const contrast=rows.find(c=>c.kind==='contrast')!;old.best[contrast.pattern]=120;old.excluded={[contrast.id]:true};
 const to=structuredClone(from);to.manifest.revision='b'.repeat(64);for(const note of to.score.notes)note.hand=note.hand==='LH'?'RH':'LH';
 const bytes=JSON.stringify(old),current=planPractice(to),state=transferPracticeEdition(from,old,to),next=practiceCatalogChunks(current),nextContrast=next.find(c=>c.kind==='contrast'&&c.episode===contrast.episode&&c.clips![0].start===contrast.clips![0].start)!;
 assert.equal(JSON.stringify(old),bytes);assert.equal(progressFor(current.chunks[0],state),1);assert.equal(state.best[current.chunks[0].pattern],90);assert.equal(state.best[nextContrast.pattern],120);assert.equal(state.excluded![nextContrast.id],true);assert.deepEqual(state.editionEvidence!.rawState,old);
 assert.deepEqual(readPractice(structuredClone(state),current),state);assert.notEqual(current.ownerGroup.get(to.score.notes[0].id),oldPlan.ownerGroup.get(from.score.notes[0].id));
 const pitched=structuredClone(to);pitched.sourceScore!.notes[0].durationTicks++;assert.throws(()=>transferPracticeEdition(from,old,pitched),/musical source facts/);
 assert.throws(()=>transferPracticeEdition(from,old,{...to,sourceSha256:'c'.repeat(64)}),/another source/);assert.throws(()=>transferPracticeEdition(from,old,{...to,keyboardLayout:'conventional-piano'}),/another source/);
});
