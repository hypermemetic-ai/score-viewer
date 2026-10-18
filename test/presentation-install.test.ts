import test from 'node:test';import assert from 'node:assert/strict';
import {stagePresentationInstall} from '../src/presentation-install';
import type {Entry} from '../src/state';
const bytes=(s:string)=>new TextEncoder().encode(s),entry:Entry={id:'a'.repeat(64),file:`package-${'b'.repeat(64)}.tuna`,metadata:{title:'No.14',composer:'Schumann',provenance:[]},importedAt:'now'},key=`state-${entry.id}.json`;
test('final pointer phase starts after cancellation guard and before the asynchronous write',async()=>{
 const events:string[]=[];let committing=false;
 await stagePresentationInstall({async write(name){if(name==='library.json'){assert.equal(committing,true);events.push('pointer');}}},{entry,entries:[entry],personalKey:key,packageBytes:bytes('new'),personalBytes:bytes('state'),canCommit:()=>{events.push('guard');return true;},onCommitStarted:()=>{committing=true;events.push('commit');}});
 assert.deepEqual(events.slice(-3),['guard','commit','pointer']);
 let callback=false;await assert.rejects(stagePresentationInstall({async write(){}},{entry,entries:[entry],personalKey:key,packageBytes:bytes('new'),personalBytes:bytes('state'),canCommit:()=>false,onCommitStarted:()=>{callback=true;}}));assert.equal(callback,false);
});
for(const failure of [1,2,3])test(`installation failure at write ${failure} preserves all active package/state/library bytes`,async()=>{
 const original=new Map([['library.json',bytes(JSON.stringify({version:1,entries:[entry]}))],[key,bytes('reviewed choices')],[entry.file,bytes('old archive')]]),stored=new Map<string,Uint8Array>(original);let count=0;
 await assert.rejects(stagePresentationInstall({async write(name,data){if(++count===failure)throw Error('disk unavailable');stored.set(name,data);}},
  {entry,entries:[entry],personalKey:key,packageBytes:bytes('new archive'),personalBytes:bytes('new choices')}),/disk unavailable/);
 for(const [name,data]of original)assert.deepEqual(stored.get(name),data);
 assert.equal(entry.personalFiles,undefined);
});
test('successful installation activates staged versions in one final pointer while retaining prior corrections/imports',async()=>{
 const prior=structuredClone(entry),other={...entry,id:'c'.repeat(64),file:`package-${'d'.repeat(64)}.tuna`},writes:string[]=[],stored=new Map<string,Uint8Array>([[key,bytes('old choices')]]),personalBytes=bytes(JSON.stringify({overrides:{latestSavedFinger:2}}));
 const result=await stagePresentationInstall({async write(name,data){writes.push(name);stored.set(name,data);}},
  {entry:prior,entries:[prior,other],personalKey:key,packageBytes:bytes('new archive'),personalBytes});
 assert.equal(writes.at(-1),'library.json');assert.equal(result.entries[1],other);assert.deepEqual(stored.get(key),bytes('old choices'));
 assert.match(result.entry.personalFiles![key],/^state-version-[a-f0-9]{64}\.json$/);
 assert.deepEqual(stored.get(result.entry.personalFiles![key]),personalBytes);assert.deepEqual(result.entry.retainedPackages,[entry.file]);
 assert.equal(prior.personalFiles,undefined);
});
test('edition snapshots retain the earlier state pointer even when a later edition uses the same hand storage key',async()=>{
 const oldFile=`state-version-${'c'.repeat(64)}.json`,prior={...entry,personalFiles:{[key]:oldFile}},stored=new Map<string,Uint8Array>([[oldFile,bytes('old personal journal')]]);
 const result=await stagePresentationInstall({async write(name,data){stored.set(name,data);}},
  {entry:prior,entries:[prior],personalKey:key,packageBytes:bytes('new archive'),personalBytes:bytes('new personal journal')});
 assert.deepEqual(result.entry.editionPersonalFiles?.[entry.file],{[key]:oldFile});
 assert.notEqual(result.entry.personalFiles![key],oldFile);assert.deepEqual(stored.get(oldFile),bytes('old personal journal'));
});
test('stale library edition and superseded stage cannot activate or mutate its predecessor',async()=>{
 await assert.rejects(stagePresentationInstall({async write(){assert.fail('stale request must not stage');}},
  {entry,entries:[{...entry,file:`package-${'c'.repeat(64)}.tuna`}],personalKey:key,packageBytes:bytes('new archive'),personalBytes:bytes('new choices')}),/library edition changed/);
 const library=bytes('old library'),stored=new Map<string,Uint8Array>([['library.json',library]]);let active=true;
 await assert.rejects(stagePresentationInstall({async write(name,data){stored.set(name,data);if(name.startsWith('state-version-'))active=false;}},
  {entry,entries:[entry],personalKey:key,packageBytes:bytes('new archive'),personalBytes:bytes('new choices'),canCommit:()=>active}),/Saving was cancelled/);
 assert.deepEqual(stored.get('library.json'),library);
});
test('cancellation after staging leaves active library pointer and sidecar unchanged',async()=>{
 const prior=bytes('old library'),oldState=bytes('old state'),stored=new Map<string,Uint8Array>([['library.json',prior],[key,oldState]]);
 await assert.rejects(stagePresentationInstall({async write(name,data){stored.set(name,data);}},
  {entry,entries:[entry],personalKey:key,packageBytes:bytes('new archive'),personalBytes:bytes('new choices'),canCommit:()=>false}),/Saving was cancelled/);
 assert.deepEqual(stored.get('library.json'),prior);assert.deepEqual(stored.get(key),oldState);
});
test('new complete piano import activates only after both bytes are staged and preserves existing library entries',async()=>{
 const original=[entry],fresh={...entry,id:'e'.repeat(64),file:`package-${'f'.repeat(64)}.tuna`},writes:string[]=[],stored=new Map<string,Uint8Array>();
 const result=await stagePresentationInstall({async write(name,data){writes.push(name);stored.set(name,data);}},
  {entry:fresh,entries:original,newEntry:true,personalKey:`state-${fresh.id}.json`,packageBytes:bytes('complete admitted piano'),personalBytes:bytes('new personal state')});
 assert.equal(writes.at(-1),'library.json');assert.equal(result.entries[0],entry);assert.equal(original.length,1);
 assert.deepEqual(result.entry.retainedPackages,[],'a never-installed original is not falsely declared retained');
 assert.equal(result.entries.length,2);assert.ok(stored.has(result.entry.file));
 await assert.rejects(stagePresentationInstall({async write(){assert.fail('duplicate new import must not write');}},
  {entry,entries:original,newEntry:true,personalKey:key,packageBytes:bytes('different'),personalBytes:bytes('different')}),/already exists/);
});
test('failed complete new import leaves the prior library pointer and every prior score unchanged',async()=>{
 const oldLibrary=bytes(JSON.stringify({version:1,entries:[entry]})),stored=new Map<string,Uint8Array>([['library.json',oldLibrary],[entry.file,bytes('prior score')]]),fresh={...entry,id:'e'.repeat(64)};
 await assert.rejects(stagePresentationInstall({async write(name,data){if(name==='library.json')throw Error('pointer failed');stored.set(name,data);}},
  {entry:fresh,entries:[entry],newEntry:true,personalKey:`state-${fresh.id}.json`,packageBytes:bytes('complete'),personalBytes:bytes('state')}),/pointer failed/);
 assert.deepEqual(stored.get('library.json'),oldLibrary);assert.deepEqual(stored.get(entry.file),bytes('prior score'));
});
test('staging never reuses a mutable prior state version identifier',async()=>{
 const first=await stagePresentationInstall({async write(){}},{entry,entries:[entry],personalKey:key,packageBytes:bytes('new archive'),personalBytes:bytes('same choices')});
 const oldName=first.entry.personalFiles![key],oldData=bytes('later edited choices'),stored=new Map<string,Uint8Array>([[oldName,oldData],['library.json',bytes('prior library')]]);
 await assert.rejects(stagePresentationInstall({async write(name,data){if(name==='library.json')throw Error('pointer failed');stored.set(name,data);}},
  {entry:first.entry,entries:[first.entry],personalKey:key,packageBytes:bytes('new archive'),personalBytes:bytes('same choices')}));
 assert.deepEqual(stored.get(oldName),oldData);
});