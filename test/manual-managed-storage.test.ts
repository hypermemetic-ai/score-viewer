import test from 'node:test';
import assert from 'node:assert/strict';
import {managedFileStorage,physicalManagedName,validPhysicalManagedName} from '../src/managed-file-storage';
import {authoredFrettedPackage} from './support/fretted-dual-fixture';
import {PackageAdmissionSession} from '../src/package-admission-session';
import {ManualReadingContext} from '../src/manual-reading-context';
import {ReadingPresentationController} from '../src/reading-presentation';

test('real public dual session reads and saves separate manual journals through unchanged native filename bounds',async()=>{
 const p=await new PackageAdmissionSession().import(await authoredFrettedPackage()),manual=await ManualReadingContext.open(p),reading=await ReadingPresentationController.open(p),
  bytes=new Map<string,Uint8Array>(),store=managedFileStorage({async read(name){assert.equal(validPhysicalManagedName(name),true);return bytes.get(name)??null;},
   async write(name,data){assert.equal(validPhysicalManagedName(name),true);bytes.set(name,new Uint8Array(data));}}),
  encode=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value));
 assert.equal(await store.read(reading.storageName),null);
 await store.write(manual.storageName,encode(manual.record()));await store.write(reading.storageName,encode(reading.record()));
 const practiceName=await physicalManagedName(manual.storageName),viewName=await physicalManagedName(reading.storageName);
 assert.match(practiceName,/^practice-[a-f0-9]{64}\.json$/);assert.match(viewName,/^state-[a-f0-9]{64}\.json$/);
 assert.notEqual(practiceName,`practice-${manual.plan.revision}.json`);assert.notEqual(viewName,`state-${manual.plan.revision}.json`);
 assert.deepEqual(await store.read(manual.storageName),encode(manual.record()));assert.deepEqual(await store.read(manual.viewStorageName),encode(reading.record()));
 const cold=await ManualReadingContext.open(p,JSON.parse(new TextDecoder().decode((await store.read(manual.storageName))!)),JSON.parse(new TextDecoder().decode((await store.read(reading.storageName))!)));
 assert.deepEqual(cold.viewRecord(),reading.record());assert.deepEqual(cold.record(),manual.record());
 const before=bytes.size;
 for(const bad of [manual.storageName.replace('v1','v2'),reading.storageName.replace('view','views'),manual.storageName+'x',reading.storageName.replace('.json','-extra.json')])await assert.rejects(store.write(bad,encode({})),/Invalid managed file identity/);
 assert.equal(bytes.size,before);
});
