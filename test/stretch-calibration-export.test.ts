import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {retainedCalibrationEvidence} from '../src/stretch-calibration-export';

test('export preserves malformed and empty historical bytes without rewriting any file',async()=>{
 const bytes=new Uint8Array([255,0,123,99]),read:string[]=[];
 const entries=await retainedCalibrationEvidence({async read(name){read.push(name);return name==='calibration.json'?bytes:name==='calibration-effort-v2.json'?new Uint8Array():undefined;}});
 assert.equal(read.length,4);const old=entries.find(e=>e.filename==='calibration.json')!;
 assert.equal(old.present,true);assert.ok(old.present);assert.deepEqual(new Uint8Array(Buffer.from(old.data,'base64')),bytes);
 assert.equal(old.sha256,createHash('sha256').update(bytes).digest('hex'));
 assert.equal(entries.find(e=>e.filename==='calibration-effort-v2.json')!.present,true);
 assert.equal(entries.find(e=>e.filename==='calibration-pilot-v1.json')!.present,false);
});
