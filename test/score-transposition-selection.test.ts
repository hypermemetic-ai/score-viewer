import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hashBytes,importPackage} from '../src/package';
import {collectionId,corrected,initialPersonal,personalStorageName,practiceStorageName,performanceStorageName,validEntryStorage,type Entry} from '../src/state';
import {stagePresentationInstall} from '../src/presentation-install';
import {prepareRetainedEdition} from '../src/retained-editions';
import {assertSelectedTransposition,nextTranspositionSelection,retainedTranspositionFile} from '../src/score-transposition-selection';
import {getScoreTransposition,getOriginalScorePackageBytes,prepareSourceTransposition} from '../src/score-transposition';
import {initialPractice,planPractice} from '../src/practice';

// A source-owned edition: its hands come from the score (no calculated hands).
const bytes=new Uint8Array(readFileSync(new URL('../fixtures/authored-preparation-v1.tuna',import.meta.url))),original=await importPackage(bytes),
 file=`package-${await hashBytes(bytes)}.tuna`,entry:Entry={id:collectionId(original),file,metadata:original.manifest.metadata,importedAt:'now'},
 derivedBytes=await prepareSourceTransposition(original,bytes,1),derived=await importPackage(derivedBytes),encode=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value));

test('strict offset/layout records retain original editions and refuse unsupported or inconsistent pointers',()=>{
 const nextFile=`package-${'c'.repeat(64)}.tuna`,record=nextTranspositionSelection(entry,nextFile,{steps:1,layout:'conventional-piano',originalFile:file,originalLayouts:['conventional-piano','janko-four-row']})!,
  next={...entry,file:nextFile,transposition:record,retainedPackages:[file]};
 assert.equal(validEntryStorage(next),true);assert.equal(retainedTranspositionFile(next,0,'janko-four-row'),file);
 assert.equal(retainedTranspositionFile(next,1,'janko-four-row'),undefined);
 for(const bad of [{...record,extra:true},{...record,steps:2},{...record,editions:{...record.editions,'01':{'conventional-piano':nextFile}}},{...record,editions:{...record.editions,0:{unknown:file}}},{...record,editions:{1:{'conventional-piano':nextFile}}}])assert.equal(validEntryStorage({...next,transposition:bad as any}),false);
 assert.equal(entry.transposition,undefined);
 const addedZero=`package-${'d'.repeat(64)}.tuna`,added=nextTranspositionSelection({...next,transposition:{...record,editions:{0:{'conventional-piano':file},1:{'conventional-piano':nextFile}}}},nextFile,{steps:1,layout:'janko-four-row',originalFile:addedZero,originalLayouts:['conventional-piano','janko-four-row']})!;
 assert.equal(added.editions['0']['conventional-piano'],file,'available original stays exact');assert.equal(added.editions['0']['janko-four-row'],addedZero,'new zero companion is retained separately');
});

test('an edition serving both keyboards fills only a keyboard with no edition at that pitch',()=>{
 const other=`package-${'a'.repeat(64)}.tuna`,kept=`package-${'b'.repeat(64)}.tuna`,both=`package-${'e'.repeat(64)}.tuna`,
  prior:Entry={...entry,file:other,transposition:{version:'score-transposition-selection-v1',steps:2,editions:{0:{'conventional-piano':file},2:{'conventional-piano':other,'janko-four-row':kept}}}},
  next=nextTranspositionSelection(prior,both,{steps:2,layout:'conventional-piano',layouts:['conventional-piano','janko-four-row']})!;
 assert.deepEqual(next.editions['2'],{'conventional-piano':both,'janko-four-row':kept},'the other keyboard keeps its retained edition and journal');
 const first=nextTranspositionSelection(entry,both,{steps:3,layout:'conventional-piano',layouts:['conventional-piano','janko-four-row'],originalFile:file})!;
 assert.deepEqual(first.editions['3'],{'conventional-piano':both,'janko-four-row':both},'a new pitch serves both keyboards');
});

test('new pitch installation keeps original correction/progress/performance bytes and 0 restores its exact archive/journal',async()=>{
 const seat=original.seats[0],oldFinger=original.fingerLayer!.attacks.find(a=>a.id===seat.actionId)!.finger,
  personal=corrected(original,initialPersonal(original),seat,oldFinger===2?3:2),key=personalStorageName(entry.id,original),
  plan=planPractice(original),progress=initialPractice(plan);progress.best[plan.chunks[0].pattern]=progress.target;
 const originalJournal=encode(personal),practiceFile=practiceStorageName(entry.id,original),performanceFile=performanceStorageName(entry.id,original),performance=encode({revision:original.manifest.revision,best:{retained:true}}),
  stored=new Map<string,Uint8Array>([[file,bytes],[key,originalJournal],[practiceFile,encode(progress)],[performanceFile,performance]]),host={async read(name:string){return stored.get(name)??null;},async write(name:string,data:Uint8Array){stored.set(name,data);}};
 const fresh=initialPersonal(derived),next=await stagePresentationInstall(host,{entry,entries:[entry],packageBytes:derivedBytes,personalBytes:encode(fresh),personalKey:personalStorageName(entry.id,derived),transposition:{steps:1,layout:'janko-four-row',layouts:derived.availablePresentations,originalPackageBytes:getOriginalScorePackageBytes(derived),originalLayouts:original.availablePresentations}});
 assert.equal(next.entry.id,entry.id);
 assert.equal(retainedTranspositionFile(next.entry,1,'conventional-piano'),next.entry.file,'one transposed archive serves both keyboards');assert.equal(retainedTranspositionFile(next.entry,0,'conventional-piano'),undefined);assert.equal(validEntryStorage(next.entry),true);assertSelectedTransposition(next.entry,derived);
 assert.notEqual(personalStorageName(entry.id,derived),key);assert.notEqual(practiceStorageName(entry.id,derived),practiceFile);assert.notEqual(performanceStorageName(entry.id,derived),performanceFile);
 assert.deepEqual(stored.get(file),bytes);assert.deepEqual(stored.get(key),originalJournal);assert.deepEqual(stored.get(practiceFile),encode(progress));assert.deepEqual(stored.get(performanceFile),performance);
 assert.deepEqual(fresh.overrides,{});assert.deepEqual(fresh.history,[]);
 const restored=await prepareRetainedEdition(host,next.entry,retainedTranspositionFile(next.entry,0,'janko-four-row')!,'janko-four-row',false);
 assert.equal(getScoreTransposition(restored.package),0);assert.deepEqual(restored.packageBytes,bytes);assert.deepEqual(restored.personal,personal);
 const zero=await stagePresentationInstall(host,{entry:next.entry,entries:next.entries,packageBytes:restored.packageBytes,personalBytes:encode(restored.personal),personalKey:key,personalFiles:restored.personalFiles,transposition:{steps:0,layout:'janko-four-row'}});
 assert.equal(zero.entry.file,file);assert.equal(zero.entry.transposition!.steps,0);assertSelectedTransposition(zero.entry,restored.package);assert.deepEqual(stored.get(key),originalJournal);assert.deepEqual(stored.get(zero.entry.personalFiles![key]),originalJournal);
 const again=await prepareRetainedEdition(host,zero.entry,retainedTranspositionFile(zero.entry,1,'janko-four-row')!,'janko-four-row',false);assert.equal(getScoreTransposition(again.package),1);assert.deepEqual(again.personal,fresh);
});

test('failure or supersession during pitch staging never activates the new offset or overwrites old files',async()=>{
 for(const failure of [1,2,3,4]){const library=encode({version:1,entries:[entry]}),key=personalStorageName(entry.id,original),journal=encode(initialPersonal(original)),stored=new Map<string,Uint8Array>([['library.json',library],[file,bytes],[key,journal]]);let count=0;
  await assert.rejects(stagePresentationInstall({async write(name,data){if(++count===failure)throw Error('disk unavailable');stored.set(name,data);}},{entry,entries:[entry],packageBytes:derivedBytes,personalBytes:encode(initialPersonal(derived)),personalKey:personalStorageName(entry.id,derived),transposition:{steps:1,layout:'janko-four-row',originalPackageBytes:bytes,originalLayouts:original.availablePresentations}}),/disk unavailable/);
  assert.deepEqual(stored.get('library.json'),library);assert.deepEqual(stored.get(file),bytes);assert.deepEqual(stored.get(key),journal);assert.equal(entry.transposition,undefined);
 }
 let current=true;const library=encode({version:1,entries:[entry]}),stored=new Map<string,Uint8Array>([['library.json',library]]);
 await assert.rejects(stagePresentationInstall({async write(name,data){stored.set(name,data);if(name.startsWith('state-version-'))current=false;}},{entry,entries:[entry],packageBytes:derivedBytes,personalBytes:encode(initialPersonal(derived)),personalKey:personalStorageName(entry.id,derived),transposition:{steps:1,layout:'janko-four-row',originalPackageBytes:bytes},canCommit:()=>current}),/cancelled/);
 assert.deepEqual(stored.get('library.json'),library);
});

test('a changed retained original is refused instead of overwritten from the embedded baseline',async()=>{
 const changedOriginal=new TextEncoder().encode('unreadable retained bytes'),stored=new Map<string,Uint8Array>([[file,changedOriginal]]);
 await assert.rejects(stagePresentationInstall({async read(name){return stored.get(name)??null;},async write(){assert.fail('a damaged original must remain untouched');}},{entry,entries:[entry],packageBytes:derivedBytes,personalBytes:encode(initialPersonal(derived)),personalKey:personalStorageName(entry.id,derived),transposition:{steps:1,layout:'janko-four-row',originalPackageBytes:bytes}}),/retained original archive differs/);
 assert.deepEqual(stored.get(file),changedOriginal);
});

