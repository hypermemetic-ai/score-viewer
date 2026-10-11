import test from 'node:test';import assert from 'node:assert/strict';
import {transferStudy,sourcePackage} from './support/hand-edition-fixture';
import {ensurePianoReady} from '../src/piano-readiness';
import {assigned} from '../src/personal-assignments';
import {initialPersonal,fingerFor,practiceStorageName} from '../src/state';
import {importPackage} from '../src/package';
import {planPractice,initialPractice,readPractice,passageHierarchy,progressFor,practiceCatalogChunks} from '../src/practice';
import {toggleDone} from '../src/practice-attainment';
import {transferPracticeEdition} from '../src/practice-edition-transfer';
import {referenceFixture} from './support/reference-score';

test('actual explicit hand/finger calculation preserves credited progress through a new journal and cold archive',async()=>{
 const source=await sourcePackage(transferStudy()),prepared=await ensurePianoReady({packageBytes:source.bytes,layout:'janko-four-row',performingHandPolicy:'retain-imported'});
 assert.ok('package' in prepared,'message' in prepared?prepared.message:prepared.status);if(!('package' in prepared))return;
 const baseline=prepared.package,seat=baseline.seats.find(s=>s.ownerIds.includes('gesture-0'))!,personal=assigned(baseline,initialPersonal(baseline),seat,{hand:'RH',finger:fingerFor(baseline,initialPersonal(baseline),seat)===1?2:1}),oldPlan=planPractice(baseline),old=initialPractice(oldPlan),chunk=oldPlan.chunks[0];
 old.best[chunk.pattern]=45;old.groundwork={[chunk.pattern]:true};toggleDone(old,{passage:chunk.id,pattern:chunk.pattern,rate:90});old.audioOutput='saved-device';old.workingByPattern[chunk.pattern]=45;
 const bytes=JSON.stringify(old),changed=await ensurePianoReady({packageBytes:prepared.packageBytes,layout:'janko-four-row',personal,forceRecalculate:true,performingHandPolicy:'retain-imported'});
 assert.ok('package' in changed,'message' in changed?changed.message:changed.status);if(!('package' in changed))return;
 const cold=await importPackage(changed.packageBytes,{keyboardLayout:'janko-four-row'}),nextPlan=planPractice(cold),state=transferPracticeEdition(baseline,old,cold,changed.personal);
 assert.notEqual(baseline.manifest.revision,cold.manifest.revision);assert.notEqual(practiceStorageName('source',baseline),practiceStorageName('source',cold));
 assert.equal(cold.score.notes.find(n=>n.id==='gesture-0')!.hand,'RH');assert.equal(fingerFor(cold,changed.personal!,cold.seats.find(s=>s.ownerIds.includes('gesture-0'))!),personal.assignments!.choices['gesture-0'].finger);assert.equal(progressFor(nextPlan.chunks[0],state),1);assert.equal(state.best[nextPlan.chunks[0].pattern],45);assert.equal(state.groundwork![nextPlan.chunks[0].pattern],true);assert.equal(state.workingByPattern[nextPlan.chunks[0].pattern],45);assert.equal(state.audioOutput,'saved-device');
 assert.equal(JSON.stringify(old),bytes);assert.deepEqual(state.editionEvidence.rawState,old);assert.deepEqual(readPractice(structuredClone(state),nextPlan),state);
 const pitch=structuredClone(cold);const note=pitch.score.notes[0];if('pitch' in note)note.pitch.pitchClass=(note.pitch.pitchClass+1)%12;assert.throws(()=>transferPracticeEdition(baseline,old,pitch),/musical source/);
 assert.throws(()=>transferPracticeEdition(baseline,old,{...cold,sourceSha256:'f'.repeat(64)}),/another source/);assert.throws(()=>transferPracticeEdition(baseline,old,{...cold,keyboardLayout:'conventional-piano'}),/another source/);
});

test('literal source-bound joined claims survive while larger runs never distribute credit to smaller ranges',async()=>{
 const from=await referenceFixture(new URL('../vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.isoscore',import.meta.url));from.sourceScore=structuredClone(from.score);from.sourceSha256='a'.repeat(64);from.sourceRevision='a'.repeat(64);from.keyboardLayout='janko-four-row';
 const oldPlan=planPractice(from,'fixed-four-v1'),old=initialPractice(oldPlan);old.composites={'1-8':['1-4','5-8'],'1-12':['1-8','9-12']};const rows=passageHierarchy(oldPlan,old).all;old.best[rows.get('1-8')!.pattern]=60;old.best[rows.get('1-12')!.pattern]=180;
 const to=structuredClone(from);to.manifest.revision='b'.repeat(64);to.score.notes[0].hand='RH';const state=transferPracticeEdition(from,old,to),plan=planPractice(to),next=practiceCatalogChunks(plan),double=next.find(c=>c.kind==='connection'&&c.start===rows.get('1-8')!.start&&c.end===rows.get('1-8')!.end)!;
 assert.equal(state.best[double.pattern],60);assert.equal(state.best[rows.get('1-12')!.pattern],undefined);assert.equal(progressFor(plan.chunks[0],state),0);assert.deepEqual(state.editionEvidence.rawState,old);assert.equal(state.composites,undefined);assert.equal(next.some(c=>c.start===0&&c.end===rows.get('1-12')!.end),false);
 const corrupt=structuredClone(old);corrupt.composites={'1-12':['1-4','9-12']};const before=JSON.stringify(corrupt);assert.throws(()=>transferPracticeEdition(from,corrupt,to),/adjacent/);assert.equal(JSON.stringify(corrupt),before);
 const clock=structuredClone(to);clock.score.sourceBarTicks![1]++;assert.throws(()=>transferPracticeEdition(from,old,clock),/musical source/);
});
