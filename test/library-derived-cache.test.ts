import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {importPackage,selectPresentation,hashBytes} from '../src/package';
import {collectionId,practiceStorageName,legacyPracticeStorageName,personalStorageName,legacyPersonalStorageName,initialPersonal,type Entry} from '../src/state';
import {planPractice,initialPractice,readPractice} from '../src/practice';
import {displayedPracticeTotal} from '../src/practice-display';
import {PackageAdmissionSession} from '../src/package-admission-session';
import {LibraryPracticeSummaries,type LibraryPracticeReader} from '../src/library-practice-progress';
import {LIBRARY_DERIVED_CACHE_FILE,LIBRARY_CACHE_LIMITS,LIBRARY_SUMMARY_POLICY,libraryCanonical,libraryCacheKey,libraryCacheBytes,createLibraryDerivedRow,readLibraryDerivedCache,validateLibraryDerivedRow,type LibraryDerivedRow} from '../src/library-derived-cache';
import {physicalManagedName,validPhysicalManagedName} from '../src/managed-file-storage';
import {prepareDualReadingPackage} from '../src/dual-reading-package';
import {ReadingPresentationController} from '../src/reading-presentation';
import {planManualPractice} from '../src/manual-practice-plan';
import {manualReferenceRecord,manualReferenceStorageName} from '../src/manual-reference-context';
import {manualPracticeRecord,manualPracticeStorageName,manualPracticeStorageNames} from '../src/manual-practice-state';
import {authoredFrettedInput} from './support/fretted-dual-fixture';

const bytes=readFileSync(new URL('../vendor/iso-notation/public/review/schumann-no14-janko-operator-reviewed-20261007.tuna',import.meta.url));
const p=await importPackage(bytes),rr=await selectPresentation(p,'janko-four-row');
const entry:Entry={id:collectionId(p),file:`package-${await hashBytes(bytes)}.isoscore`,metadata:p.manifest.metadata,importedAt:'2026-10-11T00:00:00Z'};
const plan=planPractice(rr),earned=initialPractice(plan);earned.best[plan.chunks[0].pattern]=earned.target;
const fraction=displayedPracticeTotal(plan,readPractice(earned,plan));
const current=practiceStorageName(entry.id,rr),legacy=legacyPracticeStorageName(rr)!,personal=personalStorageName(entry.id,rr),oldPersonal=legacyPersonalStorageName(rr)!;
const deferred=()=>{let resolve!:()=>void;const promise=new Promise<void>(done=>resolve=done);return {promise,resolve};};
class CountAdmission extends PackageAdmissionSession {
 imports=0;waits=0;deny=false;
 override async waitForIdle(...args:Parameters<PackageAdmissionSession['waitForIdle']>){this.waits++;if(this.deny)throw Error('Cache hit entered admission');return super.waitForIdle(...args);}
 override async import(...args:Parameters<PackageAdmissionSession['import']>){this.imports++;if(this.deny)throw Error('Cache hit entered admission');return super.import(...args);}
}
function store(){
 const records=new Map<string,unknown>(),reads:string[]=[],writes:Uint8Array[]=[];
 let archive:Uint8Array=bytes,cache:Uint8Array|null=null,packageReads=0;
 const reader:LibraryPracticeReader={readPackage:async()=>{packageReads++;return archive;},readRecord:async name=>{reads.push(name);return structuredClone(records.get(name)??null);},
  readCache:async name=>{assert.equal(name,LIBRARY_DERIVED_CACHE_FILE);return cache;},writeCache:async(name,data)=>{assert.equal(name,LIBRARY_DERIVED_CACHE_FILE);cache=new Uint8Array(data);writes.push(cache);}};
 return {reader,records,reads,writes,get cache(){return cache;},set cache(v:Uint8Array|null){cache=v;},set archive(v:Uint8Array){archive=v;},get packageReads(){return packageReads;}};
}
async function seed(s:ReturnType<typeof store>,e=entry){const owner=new LibraryPracticeSummaries();assert.equal(await owner.refresh([e],'janko-four-row',s.reader,()=>true),true);return owner;}
async function cold(s:ReturnType<typeof store>,e=entry,keyboard:'janko-four-row'|'conventional-piano'='janko-four-row',policy=LIBRARY_SUMMARY_POLICY){const admission=new CountAdmission(),owner=new LibraryPracticeSummaries({admission,policy});await owner.refresh([e],keyboard,s.reader,()=>true);assert.equal(admission.imports,1);return owner;}
async function restartHit(s:ReturnType<typeof store>,e=entry){const admission=new CountAdmission();admission.deny=true;const owner=new LibraryPracticeSummaries({admission});assert.equal(await owner.refresh([e],'janko-four-row',s.reader,()=>true),true);assert.equal(admission.imports,0);assert.equal(admission.waits,0);return owner;}

test('a fresh owner verifies exact bytes and every missing dependency without admission or planning',async()=>{
 const s=store();s.records.set(current,earned);const before=structuredClone([...s.records]);await seed(s);
 const [row]=await readLibraryDerivedCache(s.cache);assert.equal(row.archiveSha256,await hashBytes(bytes));
 assert.deepEqual(row.dependencies.map(d=>d.file).sort(),[current,personal,oldPersonal].sort());assert.equal(row.dependencies.find(d=>d.file===personal)!.sha256,null);
 s.reads.length=0;const owner=await restartHit(s);assert.equal(owner.get(entry,'janko-four-row')!.sections,fraction);assert.equal(s.packageReads,2);
 assert.deepEqual(s.reads.slice().sort(),row.dependencies.map(d=>d.file).sort());assert.deepEqual([...s.records],before);
 // Parsed journal JSON spelling/key order does not change its contributing content.
 s.records.set(current,Object.fromEntries(Object.entries(earned).reverse()));await restartHit(s);
});

test('changed archive bytes cannot reuse a valid row even under the old selected filename',async()=>{
 const s=store();await seed(s);s.archive=new Uint8Array(bytes.length);const owner=await cold(s);
 assert.equal(owner.get(entry,'janko-four-row'),undefined);assert.equal((await readLibraryDerivedCache(s.cache)).length,0);
});

test('journal changes and current-null fallback additions/deletions invalidate restart reuse',async()=>{
 const s=store();s.records.set(legacy,earned);await seed(s);
 const initial=(await readLibraryDerivedCache(s.cache))[0];assert.deepEqual(initial.dependencies.map(d=>d.file).sort(),[current,legacy,personal,oldPersonal].sort());
 s.records.set(current,initialPractice(plan));let owner=await cold(s);assert.equal(owner.get(entry,'janko-four-row')!.sections,0);
 assert.ok(!(await readLibraryDerivedCache(s.cache))[0].dependencies.some(d=>d.file===legacy));
 s.records.delete(current);owner=await cold(s);assert.equal(owner.get(entry,'janko-four-row')!.sections,fraction);
 s.records.delete(legacy);owner=await cold(s);assert.equal(owner.get(entry,'janko-four-row')!.sections,0);
 s.records.set(personal,initialPersonal(rr));await cold(s);s.records.delete(personal);await cold(s);
 s.records.set(oldPersonal,initialPersonal(rr));await cold(s);s.records.delete(oldPersonal);await cold(s);
 s.records.set(current,earned);owner=await cold(s);assert.equal(owner.get(entry,'janko-four-row')!.sections,fraction);
 s.records.set(current,{...earned,revision:'wrong-source'});owner=await cold(s);assert.equal(owner.get(entry,'janko-four-row'),undefined);
});

test('full entry pointers, retained editions, transposition, keyboard and policy are separate contexts',async()=>{
 const s=store();const owner=await seed(s),pointer='state-'+'1'.repeat(64)+'.json';s.records.set(pointer,initialPersonal(rr));
 const pointed={...entry,personalFiles:{[personal]:pointer}};assert.equal(owner.get(pointed,'janko-four-row'),undefined);
 assert.equal(owner.record(pointed,entry,rr,'janko-four-row',1,true),false);
 await cold(s,pointed);assert.ok((await readLibraryDerivedCache(s.cache)).find(r=>r.key!==undefined&&r.entry===libraryCanonical(pointed))!.dependencies.some(d=>d.file===pointer));
 s.records.delete(pointer);assert.equal((await cold(s,pointed)).get(pointed,'janko-four-row'),undefined);
 const selected:Entry={...entry,retainedPackages:[entry.file],editionPersonalFiles:{'0':{[personal]:pointer}},transposition:{version:'score-transposition-selection-v1',steps:0,editions:{'0':{'janko-four-row':entry.file}}}};
 await cold(s,selected);await cold(s,{...selected,transposition:{...selected.transposition!,steps:1,editions:{...selected.transposition!.editions,'1':{'janko-four-row':entry.file}}}});
 await cold(s,entry,'conventional-piano');await cold(s,entry,'janko-four-row','bounded-exercises-v1/library-summary-v2');
 assert.notEqual(await libraryCacheKey(entry,'janko-four-row'),await libraryCacheKey({...entry,metadata:{...entry.metadata,title:'Changed title'}},'janko-four-row'));
});

test('missing, corrupt and failed cache reads/writes preserve the cold summary and source records',async()=>{
 const s=store();s.records.set(current,earned);await seed(s);const original=s.cache!,before=structuredClone([...s.records]);
 for(const mutate of [()=>null,()=>new TextEncoder().encode('{'),()=>new TextEncoder().encode(JSON.stringify({version:'wrong',rows:[]})),()=>{const v=JSON.parse(new TextDecoder().decode(original));v.rows[0].summary.sections=.99;return new TextEncoder().encode(JSON.stringify(v));}]){
  s.cache=mutate();assert.equal((await cold(s)).get(entry,'janko-four-row')!.sections,fraction);
 }
 const admission=new CountAdmission(),owner=new LibraryPracticeSummaries({admission});
 assert.equal(await owner.refresh([entry],'janko-four-row',{...s.reader,readCache:async()=>{throw Error('read denied');},writeCache:async()=>{throw Error('disk full');}},()=>true),true);
 assert.equal(admission.imports,1);assert.equal(owner.get(entry,'janko-four-row')!.sections,fraction);await owner.flushCache();assert.deepEqual([...s.records],before);
});

test('row/envelope validation bounds structure and bytes and isolates damaged rows',async()=>{
 const good=await createLibraryDerivedRow(entry,'janko-four-row',await hashBytes(bytes),[],{entryId:entry.id,file:entry.file,keyboard:'janko-four-row',sections:.25,whole:false});
 const damaged={...good,checksum:'0'.repeat(64)};assert.equal((await readLibraryDerivedCache(libraryCacheBytes([damaged,good]))).length,1);
 for(const mutate of [(r:LibraryDerivedRow)=>({...r,key:1}),(r:LibraryDerivedRow)=>({...r,dependencies:[{file:'../journal.json',sha256:null}]}),(r:LibraryDerivedRow)=>({...r,dependencies:[{file:'journal.json',sha256:'x'}]}),(r:LibraryDerivedRow)=>({...r,summary:{...r.summary!,sections:2}}),(r:LibraryDerivedRow)=>({...r,extra:true})])await assert.rejects(validateLibraryDerivedRow(mutate(good)));
 for(const value of [{version:'viewer-derived-cache-v1',rows:Array(LIBRARY_CACHE_LIMITS.rows+1).fill(good)},{version:'viewer-derived-cache-v1',rows:[],extra:true}])await assert.rejects(readLibraryDerivedCache(new TextEncoder().encode(JSON.stringify(value))));
 await assert.rejects(readLibraryDerivedCache(new Uint8Array(LIBRARY_CACHE_LIMITS.bytes+1)));
 await assert.rejects(readLibraryDerivedCache(new Uint8Array([255])));
 assert.throws(()=>libraryCanonical(['x'.repeat(100),'x'.repeat(100)],150));assert.throws(()=>libraryCanonical({value:'é'.repeat(100)},150));assert.throws(()=>libraryCanonical(Number.NaN));
 await assert.rejects(createLibraryDerivedRow(entry,'janko-four-row',await hashBytes(bytes),Array.from({length:17},(_,i)=>({file:`journal-${i}.json`,sha256:null})),undefined));
 const many=Array.from({length:300},()=>good);assert.ok(libraryCacheBytes(many).byteLength<=LIBRARY_CACHE_LIMITS.bytes);assert.equal(JSON.parse(new TextDecoder().decode(libraryCacheBytes(many))).rows.length,256);
 // Large valid library metadata stays on the cold path rather than losing its display summary.
 const s=store(),large={...entry,metadata:{...entry.metadata,title:'x'.repeat(LIBRARY_CACHE_LIMITS.entryBytes+1)}};const owner=await cold(s,large);assert.equal(owner.get(large,'janko-four-row')!.sections,0);assert.equal((await readLibraryDerivedCache(s.cache)).length,0);
});

test('progress reports completed entries without publishing a partial or superseded snapshot',async()=>{
 const s=store();s.records.set(current,earned);const owner=await seed(s),progress:number[][]=[];const gate=deferred(),started=deferred();
 const scan=owner.refresh([entry],'janko-four-row',{...s.reader,readRecord:async name=>{started.resolve();await gate.promise;return s.reader.readRecord(name);}},()=>true,(done,total)=>progress.push([done,total]));
 await started.promise;assert.equal(owner.get(entry,'janko-four-row')!.sections,fraction);assert.deepEqual(progress,[[0,1]]);gate.resolve();assert.equal(await scan,true);assert.deepEqual(progress,[[0,1],[1,1]]);
 const writes=s.writes.length;assert.equal(await owner.refresh([entry],'janko-four-row',s.reader,()=>true,done=>{if(done===1)owner.record(entry,entry,rr,'janko-four-row',.5,true);}),false);
 assert.equal(s.writes.length,writes);assert.equal(owner.get(entry,'janko-four-row')!.sections,.5);
});

test('live saves supersede delayed cache reads and older queued writes cannot overtake newer rows',async()=>{
 const s=store();s.records.set(current,earned);const owner=await seed(s),gate=deferred(),started=deferred();
 const scan=owner.refresh([entry],'janko-four-row',{...s.reader,readCache:async()=>{started.resolve();await gate.promise;return s.cache;}},()=>true);
 await started.promise;assert.equal(owner.record(entry,entry,rr,'janko-four-row',.75,true),true);const writes=s.writes.length;gate.resolve();assert.equal(await scan,false);assert.equal(s.writes.length,writes);assert.equal(owner.get(entry,'janko-four-row')!.sections,.75);
 const writeGate=deferred(),writing=deferred(),order:number[]=[];let n=0;
 const slowWriter={...s.reader,writeCache:async(file:string,data:Uint8Array)=>{const index=++n;if(index===1){writing.resolve();await writeGate.promise;}await s.reader.writeCache!(file,data);order.push(index);}};
 const older=owner.refresh([entry],'janko-four-row',slowWriter,()=>true);await writing.promise;s.records.set(current,initialPractice(plan));
 const ready=deferred();const newer=owner.refresh([entry],'janko-four-row',slowWriter,()=>true,done=>{if(done===1)ready.resolve();});await ready.promise;assert.deepEqual(order,[]);writeGate.resolve();
 assert.deepEqual(await Promise.all([older,newer]),[false,true]);await owner.flushCache();assert.deepEqual(order,[1,2]);assert.equal(owner.get(entry,'janko-four-row')!.sections,0);assert.equal((await restartHit(s)).get(entry,'janko-four-row')!.sections,0);
});

test('foreground invalidation and clear reject an in-flight scan while a failed write retains live evidence',async()=>{
 const s=store(),owner=await seed(s),gate=deferred(),started=deferred();let current=true;
 const pending=owner.refresh([entry],'janko-four-row',{...s.reader,readPackage:async()=>{started.resolve();await gate.promise;return bytes;}},()=>current);await started.promise;current=false;owner.clear();gate.resolve();assert.equal(await pending,false);assert.equal(owner.get(entry,'janko-four-row'),undefined);
 const writeGate=deferred(),writing=deferred();const saving=owner.refresh([entry],'janko-four-row',{...s.reader,writeCache:async()=>{writing.resolve();await writeGate.promise;throw Error('disk unavailable');}},()=>true);await writing.promise;
 assert.equal(owner.record(entry,entry,rr,'janko-four-row',.6,true),true);writeGate.resolve();assert.equal(await saving,false);assert.equal(owner.get(entry,'janko-four-row')!.sections,.6);await owner.flushCache();
});

test('manual reference and all actually visited manual fallback records participate in restart checks',async()=>{
 const input=authoredFrettedInput();delete input.score.referencePerformanceTempo;const manualBytes=await prepareDualReadingPackage(input),manual=await importPackage(manualBytes),context=await ReadingPresentationController.open(manual);
 const e:Entry={...entry,id:collectionId(manual),file:`package-${await hashBytes(manualBytes)}.isoscore`,metadata:manual.manifest.metadata};
 const identity={partId:manual.reading!.dual!.sourcePartId,musicalRevision:context.revision},refName=await manualReferenceStorageName(identity),reference={version:'reference-performance-tempo-v1' as const,bpm:144,beat:{numerator:3,denominator:8},provenance:{kind:'editorial' as const,reference:'Test reference'}};
 const s=store();s.archive=manualBytes;await seed(s,e);assert.deepEqual((await readLibraryDerivedCache(s.cache))[0].dependencies,[{file:refName,sha256:null}]);assert.equal((await restartHit(s,e)).get(e,'janko-four-row'),undefined);
 const manualPlan=await planManualPractice(manual,'bounded-exercises-v1',reference),oldPlan=await planManualPractice(manual,'connection-boundary-v1',reference),journal=manualPracticeRecord(oldPlan,initialPractice(oldPlan));
 s.records.set(refName,manualReferenceRecord(identity,reference));s.records.set(manualPracticeStorageName(oldPlan),journal);let owner=await cold(s,e);
 assert.equal(owner.get(e,'janko-four-row')!.assessment,'manual');let row=(await readLibraryDerivedCache(s.cache))[0];assert.deepEqual(row.dependencies.map(d=>d.file).sort(),[refName,...manualPracticeStorageNames(manualPlan).slice(0,2)].sort());await restartHit(s,e);
 s.records.delete(manualPracticeStorageName(oldPlan));owner=await cold(s,e);row=(await readLibraryDerivedCache(s.cache))[0];assert.deepEqual(row.dependencies.map(d=>d.file).sort(),[refName,...manualPracticeStorageNames(manualPlan)].sort());
 assert.equal(owner.recordManual(e,e,manual,.5,true),true);assert.equal(owner.get(e,'conventional-piano')!.sections,.5);
 assert.equal(owner.recordManual({...e,retainedPackages:[e.file]},e,manual,1,true),false);
 s.records.delete(refName);assert.equal((await cold(s,e)).get(e,'janko-four-row'),undefined);
});

test('only the exact disposable cache filename is newly admitted in both managed storage contracts',async()=>{
 assert.equal(validPhysicalManagedName(LIBRARY_DERIVED_CACHE_FILE),true);assert.equal(await physicalManagedName(LIBRARY_DERIVED_CACHE_FILE),LIBRARY_DERIVED_CACHE_FILE);
 for(const name of ['viewer-derived-cache.json','viewer-derived-cache-v2.json','Viewer-derived-cache-v1.json','viewer-derived-cache-v1.json.backup','../viewer-derived-cache-v1.json','viewer-derived-cache-v1.json/extra']){assert.equal(validPhysicalManagedName(name),false);await assert.rejects(physicalManagedName(name));}
 const rust=readFileSync(new URL('../src-tauri/src/managed_files.rs',import.meta.url),'utf8');assert.ok(rust.includes('"viewer-derived-cache-v1.json"'));
});
