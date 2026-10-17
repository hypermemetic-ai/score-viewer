import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {strToU8} from 'fflate';
import {editionNeedsEngravingAgain,hashBytes,importPackage,readEditionContent,selectPresentation} from '../src/package';
import {PersonalMemoryLibrary} from '../src/personal-memory-library';
import {ConsolidationDeferred,PersonalMemorySession} from '../src/personal-memory-session';
import {browserAssistanceStore,type AssistanceBrowserLocks} from '../src/durable-assistance-store';
import {readLibraryPracticeSummary,type LibraryPracticeReader} from '../src/library-practice-progress';
import {initialPractice,planPractice} from '../src/practice';
import {collectionId,practiceStorageName,type Entry} from '../src/state';
import {packageFile} from '../src/edition-rebuild';
import {sourcePackage,transferStudy} from './support/hand-edition-fixture';

// A saved edition whose recipe the current shared engraving policy refuses.
// It stands for every edition the next ISO notation pin makes stale.
const stale=new Uint8Array(readFileSync(new URL('../fixtures/authored-calculated-preparation-v2.isoscore',import.meta.url))),
 staleContent=await readEditionContent(stale),
 staleEntry:Entry={id:collectionId(staleContent),file:await packageFile(stale),metadata:staleContent.manifest.metadata,importedAt:'2026-10-01T00:00:00.000Z'};
const {bytes:fresh,p:freshPackage}=await sourcePackage(transferStudy()),
 freshEntry:Entry={id:collectionId(freshPackage),file:await packageFile(fresh),metadata:freshPackage.manifest.metadata,importedAt:'2026-10-02T00:00:00.000Z'};
const libraryOf=(entries:Entry[],files:Map<string,Uint8Array>)=>({read:async(name:string)=>name==='library.json'?strToU8(JSON.stringify({version:1,entries})):files.get(name)??null});

test('a saved edition refused only by the engraving policy is recognised as needing engraving again',async()=>{
 const refusal=await importPackage(stale).then(()=>assert.fail('the fixture must be stale'),(error:Error)=>error);
 assert.match(refusal.message,/current shared engraving policy/);
 const content=await editionNeedsEngravingAgain(stale,refusal);
 assert.ok(content);assert.equal(collectionId(content),staleEntry.id);
 assert.deepEqual([...content.availablePresentations!].sort(),['conventional-piano','janko-four-row']);
 // A cancelled read is never mistaken for a stale edition, and damaged bytes stay refused.
 assert.equal(await editionNeedsEngravingAgain(stale,new DOMException('stopped','AbortError')),undefined);
 const damaged=stale.slice();damaged[Math.floor(damaged.length/2)]^=0xff;
 assert.equal(await editionNeedsEngravingAgain(damaged,refusal),undefined);
});

test('the fingering memory scan skips another score whose edition must be engraved again, without changing it',async()=>{
 const entries=[staleEntry,freshEntry],files=new Map([[staleEntry.file,stale.slice()],[freshEntry.file,fresh]]),before=await hashBytes(files.get(staleEntry.file)!);
 const library=new PersonalMemoryLibrary(libraryOf(entries,files),()=>entries,b=>importPackage(b,{allowLegacyTempo:true}));
 const inputs=await library.scan();
 assert.deepEqual([...new Set(inputs.map(input=>input.entryId))],[freshEntry.id]);
 assert.deepEqual([...library.awaitingEngraving],[staleEntry.id]);
 assert.equal(await hashBytes(files.get(staleEntry.file)!),before,'the stale edition is neither rewritten nor removed');
 assert.equal(await library.validate(),true);
 // Any other refusal still stops the scan: only a stale engraving is skipped.
 const damaged=stale.slice();damaged[Math.floor(damaged.length/2)]^=0xff;files.set(staleEntry.file,damaged);
 await assert.rejects(new PersonalMemoryLibrary(libraryOf(entries,files),()=>entries,b=>importPackage(b,{allowLegacyTempo:true})).scan());
});

class Locks implements AssistanceBrowserLocks {
 private tail:Promise<unknown>=Promise.resolve();
 request<T>(_name:string,callback:()=>Promise<T>):Promise<T>{const next=this.tail.then(callback);this.tail=next.catch(()=>{});return next;}
}
test('a fingering update for a score that must be engraved again waits, and changes nothing',async()=>{
 const entries=[staleEntry,freshEntry],files=new Map([[staleEntry.file,stale],[freshEntry.file,fresh]]),data=new Map<string,string>();
 const store=browserAssistanceStore({getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);}},new Locks());
 const library=new PersonalMemoryLibrary(libraryOf(entries,files),()=>entries,b=>importPackage(b,{allowLegacyTempo:true}));
 const session=new PersonalMemorySession(store,{scanLibrary:()=>library.scan(),validateInputs:()=>library.validate(),awaitingEngraving:()=>library.awaitingEngraving});
 await session.initialize();const before=await store.read();
 const deferred=await session.consolidate({entryIds:[staleEntry.id],receiptId:'stale',isSafe:()=>true}).then(()=>assert.fail('must wait'),(error:unknown)=>error);
 assert.ok(deferred instanceof ConsolidationDeferred);assert.deepEqual(deferred.entryIds,[staleEntry.id]);
 assert.equal((await store.read()).id,before.id,'no memory, receipt or choice was written');
 // The other score's update is not held back by it.
 const receipt=await session.consolidate({entryIds:[freshEntry.id],receiptId:'fresh',isSafe:()=>true});assert.ok(receipt);
});

test('the library still shows practice saved with an edition that must be engraved again',async()=>{
 const p=await selectPresentation(staleContent,'conventional-piano'),plan=planPractice(p,'bounded-exercises-v1'),saved=initialPractice(plan);
 for(const c of plan.chunks)saved.best[c.pattern]=saved.target;
 const reader:LibraryPracticeReader={readPackage:async()=>stale,readRecord:async name=>name===practiceStorageName(staleEntry.id,p)?structuredClone(saved):null};
 const summary=await readLibraryPracticeSummary(staleEntry,'conventional-piano',reader);
 assert.equal(summary?.entryId,staleEntry.id);assert.equal(summary?.keyboard,'conventional-piano');
 assert.ok(summary!.sections>0,'the saved progress is shown');
 // Without saved progress the score shows none, rather than failing the library.
 assert.equal((await readLibraryPracticeSummary(staleEntry,'conventional-piano',{...reader,readRecord:async()=>null}))?.sections??0,0);
});
