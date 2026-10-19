import test from 'node:test';
import assert from 'node:assert/strict';
import {importPackage,hashBytes,editionNeedsEngravingAgain,type Manifest} from '../src/package';
import {unzipSync,zipSync,strFromU8,strToU8} from 'fflate';
import {prepareDualReadingPackage,selectReadingNotation} from '../src/dual-reading-package';
import {authoredFrettedInput} from './support/fretted-dual-fixture';
import {planManualPractice} from '../src/manual-practice-plan';
import {manualPracticeStorageName,manualPracticeRecord} from '../src/manual-practice-state';
import {initialPractice} from '../src/practice';
import {toggleDone} from '../src/practice-attainment';
import {displayedPracticeTotal} from '../src/practice-display';
import {collectionId,type Entry} from '../src/state';
import {LibraryPracticeSummaries,readLibraryPracticeSummary} from '../src/library-practice-progress';
import {ReadingPresentationController} from '../src/reading-presentation';
import {manualReferenceStorageName} from '../src/manual-reference-context';

const bytes=await prepareDualReadingPackage(authoredFrettedInput()),p=await importPackage(bytes),plan=await planManualPractice(p),state=initialPractice(plan),
 entry:Entry={id:collectionId(p),file:`package-${await hashBytes(bytes)}.tuna`,importedAt:'2026-10-09T00:00:00Z',metadata:p.manifest.metadata};
toggleDone(state,{passage:plan.chunks[0].id,pattern:plan.chunks[0].pattern,rate:.5*state.target});
const record=manualPracticeRecord(plan,state),raw=JSON.stringify(record),storage=manualPracticeStorageName(plan);

test('manual library progress shares ISO/TAB journal and never follows the selected piano keyboard',async()=>{
 const cache=new LibraryPracticeSummaries(),reads:string[]=[],reader={readPackage:async()=>bytes,readRecord:async(name:string)=>{reads.push(name);return name===storage?JSON.parse(raw):null;}};
 for(const keyboard of ['conventional-piano','janko-four-row'] as const){
  assert.equal(await cache.refresh([entry],keyboard,reader,()=>true),true);
  for(const selected of ['conventional-piano','janko-four-row'] as const)assert.deepEqual(cache.get(entry,selected),{
   entryId:entry.id,file:entry.file,assessment:'manual',sections:displayedPracticeTotal(plan,state),whole:false});
 }
 assert.deepEqual(reads,[storage,storage]);assert.equal(JSON.stringify(record),raw);
 const tab=selectReadingNotation(p,'tab');assert.equal(cache.recordManual(entry,entry,tab,.75,true),true);
 assert.equal(cache.get(entry,'conventional-piano')!.sections,.75);
 assert.equal(cache.recordManual({...entry,file:'different.tuna'},entry,tab,1,true),false);
 assert.equal(cache.recordManual(entry,entry,structuredClone(tab),1,true),false);
 assert.equal(cache.get(entry,'janko-four-row')!.sections,.75);
});

test('another genuine source part and malformed manual evidence cannot borrow the journal',async()=>{
 const input=authoredFrettedInput();input.score=JSON.parse(JSON.stringify(input.score).replaceAll('P1','P2'));input.score.id='authored-fretted-other-part';
 const otherBytes=await prepareDualReadingPackage(input),other=await importPackage(otherBytes),otherPlan=await planManualPractice(other),otherEntry={...entry,id:collectionId(other),file:`package-${await hashBytes(otherBytes)}.tuna`};
 assert.notEqual(otherPlan.partId,plan.partId);assert.notEqual(otherPlan.revision,plan.revision);assert.notEqual(manualPracticeStorageName(otherPlan),storage);
 const untouched=JSON.stringify(record);
 await assert.rejects(readLibraryPracticeSummary(otherEntry,'conventional-piano',{readPackage:async()=>otherBytes,readRecord:async()=>JSON.parse(raw)}),/source or part differs/);
 const cache=new LibraryPracticeSummaries();await cache.refresh([entry],'janko-four-row',{readPackage:async()=>bytes,readRecord:async()=>({...JSON.parse(raw),musicalRevision:'changed'})},()=>true);
 assert.equal(cache.get(entry,'janko-four-row'),undefined);assert.equal(JSON.stringify(record),untouched);
});

test('a dual reading that must be engraved again still shows the progress saved with it',async()=>{
 const files=unzipSync(bytes),m=JSON.parse(strFromU8(files['manifest.json'])) as Manifest,page=(m.reading as {views:{tab:{pages:string[]}}}).views.tab.pages[0];
 delete files['manifest.json'];files[page]=strToU8(strFromU8(files[page]).replace('</svg>','<g data-earlier-engraving=""/></svg>'));
 m.files=Object.fromEntries(await Promise.all(Object.entries(files).map(async([name,b])=>[name,await hashBytes(b)])));files['manifest.json']=strToU8(JSON.stringify(m));
 const stale=zipSync(files);await assert.rejects(importPackage(stale),/page differs/);
 const saved={...entry,file:`package-${await hashBytes(stale)}.tuna`};
 const summary=await readLibraryPracticeSummary(saved,'janko-four-row',{readPackage:async()=>stale,readRecord:async(name:string)=>name===storage?JSON.parse(raw):null});
 assert.deepEqual(summary,{entryId:entry.id,file:saved.file,assessment:'manual',sections:displayedPracticeTotal(plan,state),whole:false});
 // Reading it yields to a newer refresh, which stops it as a cancellation, never as the score's refusal.
 const refusal=await importPackage(stale).then(()=>undefined,error=>error);let checkpoints=0;
 assert.ok(await editionNeedsEngravingAgain(stale,refusal,{onCheckpoint:()=>{checkpoints++;}}));assert.ok(checkpoints>0);
 await assert.rejects(editionNeedsEngravingAgain(stale,refusal,{onCheckpoint:()=>{throw new DOMException('Library reading was superseded.','AbortError');}}),error=>(error as Error).name==='AbortError');
});
test('a dual reading without a reference tempo reads its manual reference under the same revision when it must be engraved again',async()=>{
 const input=authoredFrettedInput();delete input.score.referencePerformanceTempo;
 const fresh=await prepareDualReadingPackage(input),files=unzipSync(fresh),m=JSON.parse(strFromU8(files['manifest.json'])) as Manifest,d=m.reading as {options:Record<string,unknown>};
 delete files['manifest.json'];d.options={...d.options,phraseRouting:'optical-open'};
 m.files=Object.fromEntries(await Promise.all(Object.entries(files).map(async([name,b])=>[name,await hashBytes(b)])));files['manifest.json']=strToU8(JSON.stringify(m));
 const stale=zipSync(files),admitted=await importPackage(fresh),saved={...entry,id:collectionId(admitted),file:`package-${await hashBytes(stale)}.tuna`},names:string[]=[];
 await assert.rejects(importPackage(stale),/Unsupported reading option/);
 assert.equal(await readLibraryPracticeSummary(saved,'janko-four-row',{readPackage:async()=>stale,readRecord:async(name:string)=>{names.push(name);return null;}}),undefined);
 const identity={partId:admitted.reading!.dual!.sourcePartId,musicalRevision:(await ReadingPresentationController.open(admitted)).revision};
 assert.deepEqual(names,[await manualReferenceStorageName(identity)]);
});
