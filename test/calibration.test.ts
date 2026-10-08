import test from 'node:test';
import assert from 'node:assert/strict';
import {CALIBRATION_FILE, initialCalibration, loadCalibration, saveCalibration, addObservation, calibrationForWorker, exportCalibration, copyRow} from '../src/calibration';
import type {SpanCalibrationObservation} from '../vendor/iso-notation/src/model/isomorphic-span-calibration';

const observation = (extra: Partial<SpanCalibrationObservation> = {}): SpanCalibrationObservation => ({
 id:'rh-test', hand:'RH', task:'two-contact', rating:'comfortable', boundary:'maximum', repetition:'agree',
 contacts:[{finger:1,pitch:48,copy:1},{finger:5,pitch:62,copy:2}],testedAt:'2026-10-05T15:00:00.000Z',...extra,
});
function memory(initial: Record<string,Uint8Array> = {}) {
 const data = new Map(Object.entries(initial)), writes:string[]=[];
 return {data,writes,async read(name:string){return data.get(name)??null;},async write(name:string,bytes:Uint8Array){writes.push(name);data.set(name,bytes.slice());}};
}
test('calibration saves and reloads separate hands and physical copies without touching score or preferences', async()=>{
 const untouched=new TextEncoder().encode('existing score state'), files=memory({'preferences.json':untouched,'library.json':untouched,'state-existing.json':untouched});
 let value=addObservation(initialCalibration(),observation());
 value=addObservation(value,observation({id:'lh-test',hand:'LH',contacts:[{finger:1,pitch:62,copy:2},{finger:5,pitch:48,copy:1}]}));
 await saveCalibration(files,value); const restored=await loadCalibration(files);
 assert.deepEqual(restored.value,value);assert.equal(restored.error,undefined);assert.deepEqual(files.writes,[CALIBRATION_FILE]);
 for(const name of ['preferences.json','library.json','state-existing.json'])assert.deepEqual(files.data.get(name),untouched);
 assert.equal(copyRow(48,1),1);assert.equal(copyRow(48,2),3);assert.equal(copyRow(59,1),2);assert.equal(copyRow(59,2),4);
});
test('invalid calibration never blocks baseline reading, overwrites retained evidence or reaches worker',async()=>{
 for(const raw of ['{broken',JSON.stringify({version:'future',selection:'personal',record:{}}),JSON.stringify({...initialCalibration(),record:{...initialCalibration().record,observations:[observation({contacts:[{finger:1,pitch:48,copy:1},{finger:5,pitch:48,copy:2}]})]}})]) {
  const bytes=new TextEncoder().encode(raw), files=memory({[CALIBRATION_FILE]:bytes}), loaded=await loadCalibration(files);
  assert.match(loaded.error!,/Reading and baseline/);assert.equal(loaded.value.selection,'baseline');assert.deepEqual(loaded.raw,bytes);
  assert.equal(calibrationForWorker(loaded.value,loaded.error),undefined);assert.deepEqual(files.writes,[]);assert.deepEqual(files.data.get(CALIBRATION_FILE),bytes);
 }
});
test('selection is explicit; worker receives a validated independent evidence snapshot',async()=>{
 const files=memory(), value=addObservation(initialCalibration(),observation());await saveCalibration(files,value);
 assert.equal(calibrationForWorker(value),undefined);
 const selected={...value,selection:'personal' as const}, worker=calibrationForWorker(selected)!;
 value.record.observations[0].contacts[0].pitch=50;
 assert.equal(worker.observations[0].contacts[0].pitch,48);assert.equal(worker.observations.length,1);
 await saveCalibration(files,selected);assert.equal((await loadCalibration(files)).value.selection,'personal');
});
test('withdrawal preserves original evidence and only explicit agreed comfortable limits compile',async()=>{
 let value=addObservation(initialCalibration(),observation());
 value=addObservation(value,observation({id:'uncertain',rating:'unsure',hand:'LH'}));
 value=addObservation(value,observation({id:'sample',boundary:null}));
 const exported=JSON.parse(await exportCalibration(value));assert.equal(exported.compiled.bands.length,1);assert.equal(exported.saved.record.observations.length,3);
 const withdrawn={...value,record:{...value.record,observations:value.record.observations.map(q=>q.id==='rh-test'?{...q,excluded:true}:q)}};
 const after=JSON.parse(await exportCalibration(withdrawn));assert.equal(after.compiled.bands.length,0);assert.equal(after.saved.record.observations.length,3);
 assert.equal(after.saved.record.observations[0].rating,'comfortable');assert.notEqual(after.compiled.evidenceSha256,exported.compiled.evidenceSha256);
 assert.equal(after.unassignedReports.length,2);assert.equal(after.saved.record.observations.some((q:SpanCalibrationObservation)=>q.hand===null),false);
});
test('failed atomic host write leaves the caller record and previous evidence available',async()=>{
 const before=initialCalibration(), next=addObservation(before,observation());
 await assert.rejects(saveCalibration({read:async()=>null,write:async()=>{throw Error('disk unavailable');}},next),/disk unavailable/);
 assert.equal(before.record.observations.length,0);assert.equal(next.record.observations.length,1);
});
