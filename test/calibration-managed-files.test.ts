import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {managedFileStorage,physicalManagedName,validPhysicalManagedName} from '../src/managed-file-storage';

test('new calibration evidence has exact additive managed names in both hosts',async()=>{
 const native=readFileSync(new URL('../src-tauri/src/managed_files.rs',import.meta.url),'utf8');
 const accepted=['calibration-effort-v2.json','calibration-fingertips-v1.json'];
 const retained=new Map<string,Uint8Array>([['calibration-pilot-v1.json',new Uint8Array([1,2,3])],['calibration.json',new Uint8Array([4,5,6])]]);
 const storage=managedFileStorage({read:async name=>retained.get(name)??null,write:async(name,bytes)=>{retained.set(name,bytes);}});
 for(const name of accepted){
  assert.equal(validPhysicalManagedName(name),true);assert.equal(await physicalManagedName(name),name);
  assert.ok(native.includes(`"${name}"`));await storage.write(name,new Uint8Array([7]));
 }
 assert.deepEqual(await storage.read('calibration-pilot-v1.json'),new Uint8Array([1,2,3]));
 assert.deepEqual(await storage.read('calibration.json'),new Uint8Array([4,5,6]));
 for(const name of accepted)for(const wrong of [`../${name}`,name+'.backup',name.replace('calibration','Calibration'),name.replace('.json','.pending')]){
  assert.equal(validPhysicalManagedName(wrong),false);await assert.rejects(()=>storage.write(wrong,new Uint8Array([9])),/Invalid managed file/);
 }
});
