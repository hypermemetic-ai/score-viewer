// SCORE-FILE MIGRATION: delete with src/score-file-migration.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hashBytes,importPackage,importPackageForReading,readEditionContent} from '../src/package';
import {collectionId,validEntryStorage,type Entry} from '../src/state';
import {migrateScoreFiles,type ScoreFileMigrationHost} from '../src/score-file-migration';
import {readRetainedEdition} from '../src/retained-editions';
import {validPhysicalManagedName} from '../src/managed-file-storage';
import {isScoreFileName,scoreFileName,scoreFileSha256} from '../src/score-file-name';
import {assertSelectedTransposition} from '../src/score-transposition-selection';
import {prepareSourceTransposition} from '../src/score-transposition';
import {prepareDualReadingPackage} from '../src/dual-reading-package';
import {authoredFrettedInput} from './support/fretted-dual-fixture';

const fixture=(name:string)=>new Uint8Array(readFileSync(new URL('../fixtures/'+name,import.meta.url)));
const encode=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value)),decode=(bytes:Uint8Array)=>JSON.parse(new TextDecoder().decode(bytes));
const calculated=fixture('authored-calculated-preparation-v2.tuna'),approved=fixture('schumann-op68-no14.tuna'),
 rebuilt=fixture('footer-probe-calculated-edition.tuna'),sourceOwned=fixture('authored-preparation-v1.tuna'),
 reading=await prepareDualReadingPackage(authoredFrettedInput()),
 transposed=await prepareSourceTransposition(await importPackage(sourceOwned),sourceOwned,1);
const sha=(bytes:Uint8Array)=>hashBytes(bytes),earlier=async(bytes:Uint8Array)=>`package-${await sha(bytes)}.isoscore`,
 tuna=async(bytes:Uint8Array)=>`package-${await sha(bytes)}.tuna`;
const id=async(bytes:Uint8Array)=>collectionId(await importPackageForReading(bytes).catch(()=>readEditionContent(bytes)));
const version=(n:number)=>`state-version-${String(n).repeat(64)}.json`;
const missing=`package-${'e'.repeat(64)}.isoscore`,damaged=`package-${'d'.repeat(64)}.isoscore`;

/** A library shaped like the owner's: calculated, approved (with an earlier
 * header), reading, retained and transposed editions, personal journals keyed
 * by edition, one shared retained file, one retained file that is missing and
 * one whose bytes differ from its name. */
async function buildOwnersLibrary(){
 const ids={calculated:await id(calculated),approved:await id(approved),reading:await id(reading),rebuilt:await id(rebuilt),original:await id(sourceOwned)};
 const entries:Entry[]=[
  {id:ids.calculated,file:await earlier(calculated),metadata:{title:'Calculated',composer:'Fixture',provenance:[]},importedAt:'2026-10-01T00:00:00Z',
   personalFiles:{[`state-${ids.calculated}.json`]:version(1)}},
  {id:ids.approved,file:await earlier(approved),metadata:{title:'No. 14',composer:'Schumann',provenance:[]},importedAt:'2026-10-02T00:00:00Z',
   presentations:[await earlier(rebuilt)],personalFiles:{[`state-${ids.approved}.json`]:version(2)}},
  {id:ids.reading,file:await earlier(reading),metadata:{title:'Reading',composer:'Fixture',provenance:[]},importedAt:'2026-10-03T00:00:00Z'},
  {id:ids.rebuilt,file:await earlier(rebuilt),metadata:{title:'Re-engraved',composer:'Fixture',provenance:[]},importedAt:'2026-10-04T00:00:00Z',
   retainedPackages:[await earlier(calculated),missing,damaged],personalFiles:{[`state-${ids.rebuilt}.json`]:version(3)},
   editionPersonalFiles:{[await earlier(calculated)]:{[`state-${ids.rebuilt}.json`]:version(4)},[missing]:{[`state-${ids.rebuilt}.json`]:version(5)}}},
  {id:ids.original,file:await earlier(transposed),metadata:{title:'Transposed',composer:'Fixture',provenance:[]},importedAt:'2026-10-05T00:00:00Z',
   retainedPackages:[await earlier(sourceOwned)],personalFiles:{[`state-${ids.original}.json`]:version(6)},
   editionPersonalFiles:{[await earlier(sourceOwned)]:{[`state-${ids.original}.json`]:version(7)}},
   transposition:{version:'score-transposition-selection-v1',steps:1,editions:{
    '0':{'janko-four-row':await earlier(sourceOwned),'conventional-piano':await earlier(sourceOwned)},
    '1':{'janko-four-row':await earlier(transposed),'conventional-piano':await earlier(transposed)}}}}];
 assert.ok(entries.every(validEntryStorage));
 const store=new Map<string,Uint8Array>([['library.json',encode({version:1,entries})],
  ['preferences.json',encode({version:1,libraryRotation:0,lastWorkedEntryId:ids.approved})],
  [`practice-${ids.approved}.json`,encode({best:{a:3}})],['viewer-derived-cache-v1.json',encode({rows:[]})],[damaged,new Uint8Array([1,2,3])]]);
 for(const bytes of [calculated,approved,rebuilt,reading,sourceOwned,transposed])store.set(await earlier(bytes),bytes);
 for(let n=1;n<=7;n++)store.set(version(n),encode({version:1,overrides:{[`owner-${n}`]:{replacement:n%5+1}},view:{fingerSet:'yours'}}));
 return store;
}
const owners=await buildOwnersLibrary(),ownersLibrary=async()=>new Map([...owners].map(([name,bytes])=>[name,bytes.slice()]));

/** The managed folder. Library writes are atomic, as the native write is.
 * `dieAt` stops the process at that operation: it and everything after fail. */
function folder(store:Map<string,Uint8Array>,dieAt=Infinity){
 let ops=0;const log:string[]=[];
 const step=(what:string)=>{if(ops++>=dieAt)throw Error('stopped');log.push(what);};
 const host:Required<ScoreFileMigrationHost>={
  async read(name){step('read '+name);const b=store.get(name);return b?b.slice():null;},
  async write(name,data){step('write '+name);store.set(name,data.slice());},
  async removeMigratedScoreFile(name){step('remove '+name);const hash=/^package-([a-f0-9]{64})\.isoscore$/.exec(name)?.[1];if(!hash)throw Error('not an earlier name');
   if(!store.has(name))return false;const copy=store.get(`package-${hash}.tuna`);if(!copy||await sha(copy)!==hash)throw Error('kept');store.delete(name);return true;}
 };
 return {host,log,ops:()=>ops};
}
const library=(store:Map<string,Uint8Array>)=>decode(store.get('library.json')!) as {version:1;entries:Entry[]};
const references=(e:Entry)=>[e.file,...(e.presentations??[]),...(e.retainedPackages??[]),...Object.keys(e.editionPersonalFiles??{}),
 ...Object.values(e.transposition?.editions??{}).flatMap(l=>Object.values(l??{}) as string[])];

/** Whatever moment the viewer stops, every library reference still opens
 * exactly the bytes its name declares, and no score's bytes are lost. */
async function assertIntact(store:Map<string,Uint8Array>,before:Map<string,Uint8Array>){
 const lib=library(store);assert.equal(lib.version,1);assert.ok(lib.entries.every(validEntryStorage));
 for(const name of new Set(lib.entries.flatMap(references))){
  if(name===missing){assert.equal(store.has(name),false);continue;}
  if(name===damaged){assert.deepEqual(store.get(name),before.get(name));continue;}
  const bytes=store.get(name);assert.ok(bytes,`library names ${name}, which is absent`);
  assert.equal(await sha(bytes),/^package-([a-f0-9]{64})\./.exec(name)![1]);
 }
 for(const [name,bytes] of before)if(name.startsWith('package-')){
  const hash=/^package-([a-f0-9]{64})\./.exec(name)![1];
  assert.ok([store.get(name),store.get(`package-${hash}.tuna`)].some(b=>b&&Buffer.from(b).equals(Buffer.from(bytes))),`lost ${name}`);
 }else if(name!=='library.json')assert.deepEqual(store.get(name),bytes,`${name} changed`);
}

test('the owner-shaped library moves to .tuna names with every score, journal and setting kept',async()=>{
 const store=await ownersLibrary(),before=new Map(store),original=library(store),{host}=folder(store);
 const result=await migrateScoreFiles(host,original);
 assert.deepEqual(result,library(store));await assertIntact(store,before);
 // Every reference that named a present, exact file now names its .tuna copy.
 let expected=JSON.stringify(original);
 for(const bytes of [calculated,approved,rebuilt,reading,sourceOwned,transposed])expected=expected.replaceAll(await earlier(bytes),await tuna(bytes));
 assert.deepEqual(result,JSON.parse(expected));
 assert.equal(JSON.stringify(result).match(/\.isoscore/g)!.length,JSON.stringify(original).split(missing).length-1+JSON.stringify(original).split(damaged).length-1);
 // Earlier files are gone except those that could not be copied exactly.
 assert.deepEqual([...store.keys()].filter(name=>name.endsWith('.isoscore')).sort(),[damaged]);
 for(const bytes of [calculated,approved,rebuilt,reading,sourceOwned,transposed])assert.deepEqual(store.get(await tuna(bytes)),bytes);
 // Journals keyed by edition still belong to the same editions.
 const [,, ,retained,shifted]=result.entries;
 assert.deepEqual(retained.editionPersonalFiles,{[await tuna(calculated)]:{[`state-${retained.id}.json`]:version(4)},[missing]:{[`state-${retained.id}.json`]:version(5)}});
 // The migrated library opens through the ordinary readers.
 const reader={read:async(name:string)=>store.get(name)??null};
 assert.deepEqual(await readRetainedEdition(reader,retained,await tuna(calculated)),calculated);
 assertSelectedTransposition(shifted,await importPackage(store.get(shifted.file)!));
 assert.deepEqual(await readRetainedEdition(reader,shifted,await tuna(sourceOwned)),sourceOwned);
 // A second start finds nothing left to do and writes nothing.
 const again=folder(store);assert.deepEqual(await migrateScoreFiles(again.host,result),result);
 assert.ok(!again.log.some(op=>op.startsWith('write')));
 // Only the two references that could not be moved are looked at again.
 assert.deepEqual(again.log.filter(op=>op.startsWith('read')),[`read ${missing.replace('.isoscore','.tuna')}`,`read ${missing}`,`read ${damaged.replace('.isoscore','.tuna')}`,`read ${damaged}`]);
});

test('stopping the viewer at any step loses nothing, and the next start finishes the move',async()=>{
 const reference=await ownersLibrary(),full=folder(reference);await migrateScoreFiles(full.host,library(reference));
 const total=full.ops();assert.ok(total>20,`only ${total} steps`);
 for(let dieAt=0;dieAt<=total;dieAt++){
  const store=await ownersLibrary(),before=new Map(store);
  await migrateScoreFiles(folder(store,dieAt).host,library(store)).catch(()=>undefined);
  await assertIntact(store,before);
  // The next start reads whatever library.json now holds.
  const next=await migrateScoreFiles(folder(store).host,library(store));
  assert.deepEqual(next,library(store));await assertIntact(store,before);
  assert.deepEqual(new Map([...store].sort()),new Map([...reference].sort()),`stopped at step ${dieAt}`);
 }
});

test('a stale renamed copy is replaced, and a failed library write keeps every earlier name and file',async()=>{
 const store=await ownersLibrary(),before=new Map(store),{host}=folder(store);
 // A stale .tuna copy with other bytes is replaced, never trusted.
 store.set(await tuna(calculated),new Uint8Array([9]));
 await migrateScoreFiles(host,library(store));
 assert.deepEqual(store.get(await tuna(calculated)),calculated);assert.equal(store.has(await earlier(calculated)),false);
 await assertIntact(store,before);
 // When library.json cannot be written, every earlier name stays in use and every earlier file stays.
 const blocked=await ownersLibrary(),blockedBefore=new Map(blocked),f=folder(blocked);
 const unchanged=await migrateScoreFiles({...f.host,async write(name,data){if(name==='library.json')throw Error('disk full');return f.host.write(name,data);}},library(blocked));
 assert.deepEqual(unchanged,library(blockedBefore));
 for(const [name,bytes] of blockedBefore)if(name.endsWith('.isoscore'))assert.deepEqual(blocked.get(name),bytes);
});

test('until the move finishes, both names are valid stored score files and library references',()=>{
 const hash='a'.repeat(64);
 for(const name of [`package-${hash}.tuna`,`package-${hash}.isoscore`]){assert.equal(validPhysicalManagedName(name),true);assert.equal(isScoreFileName(name),true);assert.equal(scoreFileSha256(name),hash);}
 for(const name of [`package-${hash}.zip`,`package-${hash.slice(1)}.tuna`,`package-${hash.toUpperCase()}.tuna`,`package-${hash}.tuna.json`])assert.equal(isScoreFileName(name),false);
 assert.equal(scoreFileName(hash),`package-${hash}.tuna`);
});
