import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {managedFileStorage,physicalManagedName,validPhysicalManagedName} from '../src/managed-file-storage';
import {importPackage,hashBytes} from '../src/package';
import {ensurePianoReady} from '../src/piano-readiness';
import {collectionId,initialPersonal,personalStorageName,practiceStorageName,performanceStorageName,type Entry} from '../src/state';
import {loadPersonalJournal} from '../src/personal-journal';
import {stagePresentationInstall} from '../src/presentation-install';
import {initialPractice,planPractice,readPractice} from '../src/practice';
import {readPerformance,recordPerformance} from '../src/performance';

const encode=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value)),decode=(bytes:Uint8Array)=>JSON.parse(new TextDecoder().decode(bytes));
const key=(kind='state',source='a'.repeat(64),layout='conventional-piano',profile='b'.repeat(64),hands='c'.repeat(64),edition='d'.repeat(64))=>`${kind}-${source}-${layout}-${profile}-${hands}-${edition}.json`;
function strictStorage(stored=new Map<string,Uint8Array>()) {
 const reads:string[]=[],writes:string[]=[];
 return {stored,reads,writes,read:async(name:string)=>{assert.equal(validPhysicalManagedName(name),true,`Native filename refused: ${name}`);reads.push(name);return stored.get(name)??null;},
  write:async(name:string,data:Uint8Array)=>{assert.equal(validPhysicalManagedName(name),true,`Native filename refused: ${name}`);writes.push(name);stored.set(name,data);}};
}

test('only prepared keys get bounded native aliases; every full identity component remains distinct',async()=>{
 const aliases=new Set<string>();
 for(const name of [key(),key('practice'),key('performance'),key('state','e'.repeat(64)),key('state',undefined,'janko-four-row'),
  key('state',undefined,undefined,'e'.repeat(64)),key('state',undefined,undefined,undefined,'e'.repeat(64)),key('state',undefined,undefined,undefined,undefined,'e'.repeat(64))]){
  const alias=await physicalManagedName(name),kind=name.slice(0,name.indexOf('-'));
  assert.equal(alias,`${kind}-${createHash('sha256').update(name).digest('hex')}.json`);assert.ok(Buffer.byteLength(alias)<=81);assert.equal(validPhysicalManagedName(alias),true);
  assert.equal(validPhysicalManagedName(name),false);assert.equal(await physicalManagedName(alias),alias);aliases.add(alias);
 }
 assert.equal(aliases.size,8);
 for(const name of ['library.json','preferences.json','calibration.json','stretch-calibration-v1.json','effective-curl-refinements-v1.json','practice-error-log.json',`package-${'A'.repeat(64)}.isoscore`,
  `state-version-${'a'.repeat(64)}.json`,`state-${'A'.repeat(64)}.json`,key().replace(`-${'d'.repeat(64)}.json`,'.json')])assert.equal(await physicalManagedName(name),name);
});

test('unsafe or unknown prepared-name forms refuse before either backend is called',async()=>{
 let io=0;const storage=managedFileStorage({async read(){io++;return null;},async write(){io++;}},async()=>{io++;return null;});
 for(const name of ['../library.json','C:\\library.json',key()+'\n',key()+'\0',key()+'x',key().replace('.json','-extra.json'),
  key().replace('conventional-piano','piano'),key().replace('state-','notes-'),key().replace('a'.repeat(64),'A'.repeat(64)),
  key().replace('b'.repeat(64),'b'.repeat(63)),'CON','arbitrary.json','stretch-calibration-v2.json','Stretch-calibration-v1.json','stretch-calibration-v1.json.backup','../effective-curl-refinements-v1.json',`state-version-${'A'.repeat(64)}.json`]){
  await assert.rejects(()=>storage.read(name),/Invalid managed file identity/);await assert.rejects(()=>storage.write(name,encode({})),/Invalid managed file identity/);
 }
 assert.equal(io,0);
});

const originalBytes=new Uint8Array(readFileSync(new URL('../fixtures/authored-calculated-preparation-v2.isoscore',import.meta.url))),original=await importPackage(originalBytes,{keyboardLayout:'conventional-piano'}),
 prepared=await ensurePianoReady({packageBytes:originalBytes,layout:'conventional-piano',transposeSteps:1});
assert.ok('package' in prepared,'message' in prepared?prepared.message:undefined);
if(!('package' in prepared))throw Error('Public preparation fixture refused');
const p=prepared.package,bytes=prepared.packageBytes,file=`package-${await hashBytes(originalBytes)}.isoscore`,entry:Entry={id:collectionId(original),file,metadata:original.manifest.metadata,importedAt:'now'};

test('fresh prepared personal lookup and staged cold recovery use native filenames without changing logical pointers or bindings',async()=>{
 const physical=strictStorage(new Map([[file,originalBytes]])),storage=managedFileStorage(physical),key=personalStorageName(entry.id,p),fresh=await loadPersonalJournal(storage,entry,p);
 assert.deepEqual(fresh,initialPersonal(p));assert.equal(physical.reads.at(-1),await physicalManagedName(key));
 fresh.view.scale=.75;const installed=await stagePresentationInstall(storage,{entry,entries:[entry],packageBytes:bytes,personalBytes:encode(fresh),personalKey:key,
  transposition:{steps:1,layout:'conventional-piano',originalPackageBytes:originalBytes,originalLayouts:original.availablePresentations}});
 assert.ok(Object.hasOwn(installed.entry.personalFiles!,key));assert.match(installed.entry.personalFiles![key],/^state-version-[a-f0-9]{64}\.json$/);
 const cold=await importPackage((await storage.read(installed.entry.file))!,{keyboardLayout:'conventional-piano'});
 assert.deepEqual(await loadPersonalJournal(managedFileStorage(physical),installed.entry,cold),fresh);
 const alias=await physicalManagedName(key);await storage.write(key,encode(fresh));
 const mapped={...installed.entry,personalFiles:{[key]:alias}};assert.deepEqual(await loadPersonalJournal(storage,mapped,cold),fresh);
 physical.stored.set(alias,encode(initialPersonal(original)));await assert.rejects(()=>loadPersonalJournal(storage,mapped,cold),/revision differs/);
 physical.stored.delete(alias);await assert.rejects(()=>loadPersonalJournal(storage,mapped,cold),/declared personal journal is missing/);
 assert.deepEqual(physical.stored.get(file),originalBytes);assert.equal(personalStorageName(entry.id,cold),key);
});

test('existing raw browser records and long pointers cold-read unchanged; alias writes preserve the original and take precedence',async()=>{
 const physical=strictStorage(),key=personalStorageName(entry.id,p),raw=encode(initialPersonal(p)),legacy=new Map([[key,raw]]),legacyReads:string[]=[],
  storage=managedFileStorage(physical,async(name)=>{legacyReads.push(name);return legacy.get(name)??null;});
 const pointer={...entry,personalFiles:{[key]:key}};assert.deepEqual(await loadPersonalJournal(storage,pointer,p),initialPersonal(p));assert.deepEqual(legacyReads,[key]);
 const edited=initialPersonal(p);edited.view.count=2;await storage.write(key,encode(edited));assert.deepEqual(legacy.get(key),raw);
 assert.deepEqual(await loadPersonalJournal(storage,pointer,p),edited);assert.deepEqual(legacyReads,[key],'saved alias has priority over old browser bytes');
 const alias=await physicalManagedName(key);assert.deepEqual(await storage.read(alias),encode(edited));
 physical.stored.set(alias,encode(initialPersonal(original)));await assert.rejects(()=>loadPersonalJournal(storage,pointer,p),/revision differs/);
 physical.stored.set(alias,new Uint8Array());await assert.rejects(()=>loadPersonalJournal(storage,pointer,p),/personal journal cannot be read/);
 assert.deepEqual(legacyReads,[key],'an existing empty alias also refuses without trying a valid legacy journal');
 assert.deepEqual(legacy.get(key),raw,'corrupt or mismatched alias does not erase the retained browser record');
});

test('prepared practice and performance evidence persists and cold-admits independently while original bytes stay exact',async()=>{
 const physical=strictStorage(),storage=managedFileStorage(physical),plan=planPractice(p),practice=initialPractice(plan);practice.best[plan.chunks[0].pattern]=practice.target;
 const performance=readPerformance(undefined,p.manifest.revision,plan.referencePerformanceTempo);recordPerformance(performance,{bpm:practice.target,accuracy:1,correct:4,expected:4,missed:0,extra:0,earlyReleases:0,at:'2026-10-08T00:00:00Z'});
 const oldPlan=planPractice(original),oldPractice=encode(initialPractice(oldPlan)),oldPerformance=encode(readPerformance(undefined,original.manifest.revision,oldPlan.referencePerformanceTempo)),
  practiceKey=practiceStorageName(entry.id,p),performanceKey=performanceStorageName(entry.id,p),oldPracticeKey=practiceStorageName(entry.id,original),oldPerformanceKey=performanceStorageName(entry.id,original);
 await storage.write(oldPracticeKey,oldPractice);await storage.write(oldPerformanceKey,oldPerformance);await storage.write(practiceKey,encode(practice));await storage.write(performanceKey,encode(performance));
 const cold=managedFileStorage(physical);assert.deepEqual(readPractice(decode((await cold.read(practiceKey))!),plan),readPractice(practice,plan));
 assert.deepEqual(readPerformance(decode((await cold.read(performanceKey))!),p.manifest.revision,plan.referencePerformanceTempo),performance);
 assert.deepEqual(await cold.read(oldPracticeKey),oldPractice);assert.deepEqual(await cold.read(oldPerformanceKey),oldPerformance);
 const savedPractice=decode(physical.stored.get(await physicalManagedName(practiceKey))!);assert.throws(()=>readPractice(savedPractice,oldPlan));
});
