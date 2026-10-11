import test from 'node:test';import assert from 'node:assert/strict';
import {authoredManualPackage} from './support/manual-practice-fixture';
import {planManualPractice} from '../src/manual-practice-plan';
import {initialPractice,readPractice,practiceCatalogChunks,progressFor} from '../src/practice';
import {toggleDone} from '../src/practice-attainment';
import {manualPracticeRecord,manualPracticeStorageNames,manualPracticeStorageName,readManualPractice,readManualPracticeWithLegacy} from '../src/manual-practice-state';
const source=await authoredManualPackage(12),plan=await planManualPractice(source);
test('manual current namespace finds accepted old revision without rewriting either record',async()=>{
 const old=plan.legacyPlans!['connection-boundary-v1'] as typeof plan,oldState=initialPractice(old),chunk=old.chunks[0];
 toggleDone(oldState,{passage:chunk.id,pattern:chunk.pattern,rate:oldState.target});const record=manualPracticeRecord(old,oldState),bytes=JSON.stringify(record),calls:string[]=[];
 const result=await readManualPracticeWithLegacy(plan,async file=>{calls.push(file);return file===manualPracticeStorageName(old)?record:undefined;});
 assert.equal(result.migrated,true);assert.deepEqual(calls,manualPracticeStorageNames(plan).slice(0,2));assert.equal(JSON.stringify(record),bytes);
 assert.deepEqual(result.state.legacy!.record,record);assert.deepEqual(result.state.legacy!.state,record.state);
 assert.ok(practiceCatalogChunks(plan).every(c=>progressFor(c,result.state)===0)); // old 4-bar range is not a new 6-bar exercise
 const newRecord=manualPracticeRecord(plan,result.state);assert.deepEqual(readManualPractice(newRecord,plan),result.state);
});
test('invalid current manual record refuses admission without searching old namespaces',async()=>{
 let calls=0;await assert.rejects(readManualPracticeWithLegacy(plan,async()=>{calls++;return {version:'musical-manual-practice-v1',partId:plan.partId,musicalRevision:'wrong',state:initialPractice(plan)};}),/retained/);assert.equal(calls,1);
 const old=plan.legacyPlans!['fixed-four-v1'] as typeof plan,measured=initialPractice(old);measured.best[old.chunks[0].pattern]=measured.target;
 assert.throws(()=>readManualPractice({version:'musical-manual-practice-v1',partId:old.partId,musicalRevision:old.revision,state:measured},plan),/piano-measured/);
});
test('bounded doubles need their own full run and retain every overlapping neighbor',()=>{
 const state=initialPractice(plan),rows=practiceCatalogChunks(plan);assert.equal(plan.chunks.length,2);assert.equal(rows.length,3);
 for(const chunk of plan.chunks)toggleDone(state,{passage:chunk.id,pattern:chunk.pattern,rate:state.target});
 const pair=rows.find(c=>c.kind==='connection')!;assert.equal(progressFor(pair,state),0);toggleDone(state,{passage:pair.id,pattern:pair.pattern,rate:state.target});assert.equal(progressFor(pair,state),1);
 assert.deepEqual(readPractice(structuredClone(state),plan).manualAttainment,state.manualAttainment);
});
