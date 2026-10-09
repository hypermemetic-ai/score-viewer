import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ensurePianoReady} from '../src/piano-readiness';
import {hashBytes,importPackage,archivePackage,selectPresentation} from '../src/package';
import {collectionId,corrected,initialPersonal,personalStorageName,practiceStorageName,performanceStorageName,validEntryStorage,type Entry} from '../src/state';
import {stagePresentationInstall} from '../src/presentation-install';
import {prepareRetainedEdition} from '../src/retained-editions';
import {assertSelectedTransposition,nextTranspositionSelection,retainedTranspositionFile} from '../src/score-transposition-selection';
import {getScoreTransposition,getOriginalScorePackageBytes} from '../src/score-transposition';
import {initialPractice,planPractice} from '../src/practice';
import {readLibraryPracticeSummary,LibraryPracticeSummaries} from '../src/library-practice-progress';

const bytes=new Uint8Array(readFileSync(new URL('../fixtures/authored-calculated-preparation-v2.isoscore',import.meta.url))),original=await importPackage(bytes,{keyboardLayout:'conventional-piano'}),
 file=`package-${await hashBytes(bytes)}.isoscore`,entry:Entry={id:collectionId(original),file,metadata:original.manifest.metadata,importedAt:'now'},
 changed=await ensurePianoReady({packageBytes:bytes,layout:'conventional-piano',transposeSteps:1});
assert.ok('package' in changed,'message' in changed?changed.message:undefined);
if(!('package' in changed))throw Error('Fixture transposition failed');
const derived=changed.package,derivedBytes=changed.packageBytes,encode=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value));

test('strict offset/layout records retain original editions and refuse unsupported or inconsistent pointers',()=>{
 const nextFile=`package-${'c'.repeat(64)}.isoscore`,record=nextTranspositionSelection(entry,nextFile,{steps:1,layout:'conventional-piano',originalFile:file,originalLayouts:['conventional-piano','janko-four-row']})!,
  next={...entry,file:nextFile,transposition:record,retainedPackages:[file]};
 assert.equal(validEntryStorage(next),true);assert.equal(retainedTranspositionFile(next,0,'janko-four-row'),file);
 assert.equal(retainedTranspositionFile(next,1,'janko-four-row'),undefined);
 for(const bad of [{...record,extra:true},{...record,steps:2},{...record,editions:{...record.editions,'01':{'conventional-piano':nextFile}}},{...record,editions:{...record.editions,0:{unknown:file}}},{...record,editions:{1:{'conventional-piano':nextFile}}}])assert.equal(validEntryStorage({...next,transposition:bad as any}),false);
 assert.equal(entry.transposition,undefined);
 const addedZero=`package-${'d'.repeat(64)}.isoscore`,added=nextTranspositionSelection({...next,transposition:{...record,editions:{0:{'conventional-piano':file},1:{'conventional-piano':nextFile}}}},nextFile,{steps:1,layout:'janko-four-row',originalFile:addedZero,originalLayouts:['conventional-piano','janko-four-row']})!;
 assert.equal(added.editions['0']['conventional-piano'],file,'available original stays exact');assert.equal(added.editions['0']['janko-four-row'],addedZero,'new zero companion is retained separately');
});

test('new pitch installation keeps original correction/progress/performance bytes and 0 restores its exact archive/journal',async()=>{
 const seat=original.seats[0],oldFinger=original.fingerLayer!.attacks.find(a=>a.id===seat.actionId)!.finger,
  personal=corrected(original,initialPersonal(original),seat,oldFinger===2?3:2),key=personalStorageName(entry.id,original),
  plan=planPractice(original),progress=initialPractice(plan);progress.best[plan.chunks[0].pattern]=progress.target;
 const originalJournal=encode(personal),practiceFile=practiceStorageName(entry.id,original),performanceFile=performanceStorageName(entry.id,original),performance=encode({revision:original.manifest.revision,best:{retained:true}}),
  stored=new Map<string,Uint8Array>([[file,bytes],[key,originalJournal],[practiceFile,encode(progress)],[performanceFile,performance]]),host={async read(name:string){return stored.get(name)??null;},async write(name:string,data:Uint8Array){stored.set(name,data);}};
 const fresh=initialPersonal(derived),next=await stagePresentationInstall(host,{entry,entries:[entry],packageBytes:derivedBytes,personalBytes:encode(fresh),personalKey:personalStorageName(entry.id,derived),transposition:{steps:1,layout:'conventional-piano',originalPackageBytes:getOriginalScorePackageBytes(derived),originalLayouts:original.availablePresentations}});
 assert.equal(next.entry.id,entry.id);assert.equal(validEntryStorage(next.entry),true);assertSelectedTransposition(next.entry,derived);
 assert.notEqual(personalStorageName(entry.id,derived),key);assert.notEqual(practiceStorageName(entry.id,derived),practiceFile);assert.notEqual(performanceStorageName(entry.id,derived),performanceFile);
 assert.deepEqual(stored.get(file),bytes);assert.deepEqual(stored.get(key),originalJournal);assert.deepEqual(stored.get(practiceFile),encode(progress));assert.deepEqual(stored.get(performanceFile),performance);
 assert.deepEqual(fresh.overrides,{});assert.deepEqual(fresh.history,[]);
 const restored=await prepareRetainedEdition(host,next.entry,retainedTranspositionFile(next.entry,0,'conventional-piano')!,'conventional-piano');
 assert.equal(getScoreTransposition(restored.package),0);assert.deepEqual(restored.packageBytes,bytes);assert.deepEqual(restored.personal,personal);
 const zero=await stagePresentationInstall(host,{entry:next.entry,entries:next.entries,packageBytes:restored.packageBytes,personalBytes:encode(restored.personal),personalKey:key,personalFiles:restored.personalFiles,transposition:{steps:0,layout:'conventional-piano'}});
 assert.equal(zero.entry.file,file);assert.equal(zero.entry.transposition!.steps,0);assertSelectedTransposition(zero.entry,restored.package);assert.deepEqual(stored.get(key),originalJournal);assert.deepEqual(stored.get(zero.entry.personalFiles![key]),originalJournal);
 const again=await prepareRetainedEdition(host,zero.entry,retainedTranspositionFile(zero.entry,1,'conventional-piano')!,'conventional-piano');assert.equal(getScoreTransposition(again.package),1);assert.deepEqual(again.personal,fresh);
});

test('failure or supersession during pitch staging never activates the new offset or overwrites old files',async()=>{
 for(const failure of [1,2,3,4]){const library=encode({version:1,entries:[entry]}),key=personalStorageName(entry.id,original),journal=encode(initialPersonal(original)),stored=new Map<string,Uint8Array>([['library.json',library],[file,bytes],[key,journal]]);let count=0;
  await assert.rejects(stagePresentationInstall({async write(name,data){if(++count===failure)throw Error('disk unavailable');stored.set(name,data);}},{entry,entries:[entry],packageBytes:derivedBytes,personalBytes:encode(initialPersonal(derived)),personalKey:personalStorageName(entry.id,derived),transposition:{steps:1,layout:'conventional-piano',originalPackageBytes:bytes,originalLayouts:original.availablePresentations}}),/disk unavailable/);
  assert.deepEqual(stored.get('library.json'),library);assert.deepEqual(stored.get(file),bytes);assert.deepEqual(stored.get(key),journal);assert.equal(entry.transposition,undefined);
 }
 let current=true;const library=encode({version:1,entries:[entry]}),stored=new Map<string,Uint8Array>([['library.json',library]]);
 await assert.rejects(stagePresentationInstall({async write(name,data){stored.set(name,data);if(name.startsWith('state-version-'))current=false;}},{entry,entries:[entry],packageBytes:derivedBytes,personalBytes:encode(initialPersonal(derived)),personalKey:personalStorageName(entry.id,derived),transposition:{steps:1,layout:'conventional-piano',originalPackageBytes:bytes},canCommit:()=>current}),/no longer active/);
 assert.deepEqual(stored.get('library.json'),library);
});

test('a changed retained original is refused instead of overwritten from the embedded baseline',async()=>{
 const changedOriginal=new TextEncoder().encode('unreadable retained bytes'),stored=new Map<string,Uint8Array>([[file,changedOriginal]]);
 await assert.rejects(stagePresentationInstall({async read(name){return stored.get(name)??null;},async write(){assert.fail('a damaged original must remain untouched');}},{entry,entries:[entry],packageBytes:derivedBytes,personalBytes:encode(initialPersonal(derived)),personalKey:personalStorageName(entry.id,derived),transposition:{steps:1,layout:'conventional-piano',originalPackageBytes:bytes}}),/retained original archive differs/);
 assert.deepEqual(stored.get(file),changedOriginal);
});

test('adding a keyboard while shifted stages a zero companion without replacing an available original',async()=>{
 const m=structuredClone(original.collectionManifest??original.manifest),files={...original.files};delete files['manifest.json'];delete m.presentations!['janko-four-row'];
 const singleBytes=archivePackage(m,files),single=await importPackage(singleBytes),singleFile=`package-${await hashBytes(singleBytes)}.isoscore`,singleEntry={...entry,file:singleFile},first=await ensurePianoReady({packageBytes:singleBytes,layout:'conventional-piano',transposeSteps:1});
 assert.ok('package' in first,'message' in first?first.message:undefined);if(!('package' in first))return;
 const stored=new Map<string,Uint8Array>([[singleFile,singleBytes]]),host={async read(name:string){return stored.get(name)??null;},async write(name:string,data:Uint8Array){stored.set(name,data);}};
 const shifted=await stagePresentationInstall(host,{entry:singleEntry,entries:[singleEntry],packageBytes:first.packageBytes,personalBytes:encode(initialPersonal(first.package)),personalKey:personalStorageName(entry.id,first.package),transposition:{steps:1,layout:'conventional-piano',originalPackageBytes:singleBytes,originalLayouts:single.availablePresentations}});
 const selectedLibrary=stored.get('library.json')!,zero=await ensurePianoReady({packageBytes:singleBytes,layout:'janko-four-row',performingHandPolicy:'retain-imported',intent:'read-retained'});
 assert.ok('package' in zero,'message' in zero?zero.message:undefined);if(!('package' in zero))return;
 assert.deepEqual(stored.get('library.json'),selectedLibrary,'zero preparation alone does not activate');
 const preservedCon=await selectPresentation(zero.package,'conventional-piano');assert.deepEqual(preservedCon.pages,single.pages);assert.deepEqual(preservedCon.seats,single.seats);
 const next=await ensurePianoReady({packageBytes:zero.packageBytes,layout:'janko-four-row',transposeSteps:1});assert.ok('package' in next,'message' in next?next.message:undefined);if(!('package' in next))return;
 assert.deepEqual(stored.get('library.json'),selectedLibrary,'derived preparation alone does not activate');
 const installed=await stagePresentationInstall(host,{entry:shifted.entry,entries:shifted.entries,packageBytes:next.packageBytes,personalBytes:encode(initialPersonal(next.package)),personalKey:personalStorageName(entry.id,next.package),transposition:{steps:1,layout:'janko-four-row',originalPackageBytes:zero.packageBytes,originalLayouts:zero.package.availablePresentations}});
 assert.equal(retainedTranspositionFile(installed.entry,0,'conventional-piano'),singleFile);
 assert.equal(retainedTranspositionFile(installed.entry,0,'janko-four-row'),`package-${await hashBytes(zero.packageBytes)}.isoscore`);
 const zeroJanko=await prepareRetainedEdition(host,installed.entry,retainedTranspositionFile(installed.entry,0,'janko-four-row')!,'janko-four-row');assert.equal(getScoreTransposition(zeroJanko.package),0);assert.deepEqual(zeroJanko.packageBytes,zero.packageBytes);assert.deepEqual(stored.get(singleFile),singleBytes);
 assert.equal(validEntryStorage(installed.entry),true);
});

test('library progress cold-opens the selected pitch edition and never borrows original achievement or a late callback',async()=>{
 const derivedFile=`package-${await hashBytes(derivedBytes)}.isoscore`,selected={...entry,file:derivedFile,retainedPackages:[file],transposition:nextTranspositionSelection(entry,derivedFile,{steps:1,layout:'conventional-piano',originalFile:file})!},
  plan=planPractice(original),earned=initialPractice(plan);earned.best[plan.chunks[0].pattern]=earned.target;const record=encode(earned),originalRecord=practiceStorageName(entry.id,original),reads:string[]=[];
 const reader={readPackage:async()=>derivedBytes,readRecord:async(name:string)=>{reads.push(name);return name===originalRecord?JSON.parse(new TextDecoder().decode(record)):null;}};
 const summary=await readLibraryPracticeSummary(selected,'conventional-piano',reader);assert.equal(summary!.sections,0);assert.equal(reads.includes(originalRecord),false);
 const cache=new LibraryPracticeSummaries();cache.record(entry,entry,original,'conventional-piano',1,false);assert.equal(cache.get(selected,'conventional-piano'),undefined);
 assert.equal(cache.record(selected,entry,original,'conventional-piano',1,false),false);await cache.refresh([selected],'conventional-piano',reader,()=>true);assert.equal(cache.get(selected,'conventional-piano')!.sections,0);
 await assert.rejects(()=>readLibraryPracticeSummary({...selected,transposition:{...selected.transposition,steps:0}},'conventional-piano',reader),/saved transposition differs/);
});
