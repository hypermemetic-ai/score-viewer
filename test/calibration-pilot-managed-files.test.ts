import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {managedFileStorage,physicalManagedName,validPhysicalManagedName} from '../src/managed-file-storage';
test('pilot storage has one exact independent literal filename in browser and native contracts',async()=>{
 const native=readFileSync(new URL('../src-tauri/src/managed_files.rs',import.meta.url),'utf8');
 assert.ok(native.includes('"calibration-pilot-v1.json"'));assert.equal(validPhysicalManagedName('calibration-pilot-v1.json'),true);
 assert.equal(await physicalManagedName('calibration-pilot-v1.json'),'calibration-pilot-v1.json');
 const records=new Map([['calibration.json',new Uint8Array([1,2,3])]]),storage=managedFileStorage({async read(name){return records.get(name)??null;},async write(name,bytes){records.set(name,bytes);}});
 await storage.write('calibration-pilot-v1.json',new Uint8Array([4,5,6]));assert.deepEqual(await storage.read('calibration-pilot-v1.json'),new Uint8Array([4,5,6]));assert.deepEqual(records.get('calibration.json'),new Uint8Array([1,2,3]));
});
test('pilot filename variants and traversal refuse before any physical I/O',async()=>{
 let io=0;const storage=managedFileStorage({async read(){io++;return null;},async write(){io++;}});
 for(const name of ['calibration-pilot.json','calibration-pilot-v2.json','Calibration-pilot-v1.json','calibration-pilot-v1.json.backup','calibration-pilot-v1.json\n','../calibration-pilot-v1.json','..\\calibration-pilot-v1.json','/calibration-pilot-v1.json','calibration-pilot-v1.json/other']){
  assert.equal(validPhysicalManagedName(name),false,name);await assert.rejects(storage.read(name),/Invalid managed file identity/);await assert.rejects(storage.write(name,new Uint8Array()),/Invalid managed file identity/);
 }assert.equal(io,0);
});
