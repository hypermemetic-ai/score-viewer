import test from 'node:test';import assert from 'node:assert/strict';
import {importPackage,hashBytes} from '../src/package';
import {prepareDualReadingPackage,selectReadingNotation} from '../src/dual-reading-package';
import {planManualPractice} from '../src/manual-practice-plan';
import {ReadingPresentationController} from '../src/reading-presentation';
import {ManualReadingContext} from '../src/manual-reading-context';
import {manualReferenceRecord,manualReferenceStorageName,readManualReference} from '../src/manual-reference-context';
import {manualPracticeRecord,manualPracticeStorageName} from '../src/manual-practice-state';
import {initialPractice} from '../src/practice';
import {scoreCapabilities} from '../src/score-capabilities';
import {readLibraryPracticeSummary} from '../src/library-practice-progress';
import {collectionId} from '../src/state';
import {authoredFrettedInput} from './support/fretted-dual-fixture';

const input=authoredFrettedInput();delete input.score.referencePerformanceTempo;
const bytes=await prepareDualReadingPackage(input),p=await importPackage(bytes),before=JSON.stringify(p),
 reference={version:'reference-performance-tempo-v1' as const,bpm:144,beat:{numerator:3,denominator:8},
 provenance:{kind:'editorial' as const,reference:'Explicit authored test working-rate choice; not a source marking.'}};

test('separate manual reference binds the chosen clock and shares unchanged source view across ISO/TAB',async()=>{
 assert.equal(scoreCapabilities(p).manualPractice,true);assert.equal(scoreCapabilities(p).pianoPractice,false);
 await assert.rejects(planManualPractice(p),/explicit reference performance tempo/);
 const reader=await ReadingPresentationController.open(p),iso=await planManualPractice(p,'connection-boundary-v1',reference),
  tab=await planManualPractice(selectReadingNotation(p,'tab'),'connection-boundary-v1',reference),identity={partId:iso.partId,musicalRevision:reader.revision},
  saved=manualReferenceRecord(identity,reference),storage=await manualReferenceStorageName(identity);
 assert.deepEqual(tab,iso);assert.equal(iso.sourceMusicalRevision,reader.revision);assert.notEqual(iso.revision,reader.revision);
 assert.deepEqual(readManualReference(saved,identity),reference);assert.match(storage,/^practice-[a-f0-9]{64}\.json$/);
 const context=await ManualReadingContext.open(p,undefined,reader.record(),reader.partition,reference);
 assert.equal(context.viewStorageName,reader.storageName);assert.equal(context.view.musicalRevision,reader.revision);
 context.switchNotation('tab');assert.equal(context.storageName,manualPracticeStorageName(iso));
 assert.notEqual((await planManualPractice(p,'connection-boundary-v1',{...reference,bpm:145})).revision,iso.revision);
 assert.equal(JSON.stringify(p),before);assert.equal(p.score.referencePerformanceTempo,undefined);
});

test('planner owns the full fallback before hashing, and canonical references remain authoritative',async()=>{
 const expected=await planManualPractice(p,'fixed-four-v1',reference),caller=structuredClone(reference),pending=planManualPractice(p,'fixed-four-v1',caller);
 caller.bpm=240;caller.beat.numerator=1;caller.provenance.reference='Changed after pending call';
 assert.deepEqual(await pending,expected);assert.equal(Object.isFrozen(caller),false);
 const canonical=await importPackage(await prepareDualReadingPackage(authoredFrettedInput())),original=await planManualPractice(canonical),
  ignored=await planManualPractice(canonical,'bounded-exercises-v1',reference);
 assert.deepEqual(ignored,original);assert.equal(original.sourceMusicalRevision,(await ReadingPresentationController.open(canonical)).revision);
 const malformed=structuredClone(canonical);malformed.score.referencePerformanceTempo!.bpm=-1;
 await assert.rejects(planManualPractice(malformed,'connection-boundary-v1',reference),/positive numeric BPM/);
});

test('saved reference and library progress are part/source bound without archive changes',async()=>{
 const reader=await ReadingPresentationController.open(p),identity={partId:p.reading!.dual!.sourcePartId,musicalRevision:reader.revision},
  refRecord=manualReferenceRecord(identity,reference),refName=await manualReferenceStorageName(identity),plan=await planManualPractice(p,'connection-boundary-v1',reference),
  journal=manualPracticeRecord(plan,initialPractice(plan)),entry={id:collectionId(p),file:`package-${await hashBytes(bytes)}.tuna`,importedAt:'2026-10-09T00:00:00Z',metadata:p.manifest.metadata},reads:string[]=[];
 const summary=await readLibraryPracticeSummary(entry,'janko-four-row',{readPackage:async()=>bytes,readRecord:async name=>{reads.push(name);return name===refName?refRecord:name===manualPracticeStorageName(plan)?journal:undefined;}});
 assert.equal(summary!.assessment,'manual');assert.equal(summary!.sections,0);assert.deepEqual(reads,[refName,manualPracticeStorageName(await planManualPractice(p,'bounded-exercises-v1',reference)),manualPracticeStorageName(plan)]);
 assert.equal(await readLibraryPracticeSummary(entry,'conventional-piano',{readPackage:async()=>bytes,readRecord:async()=>null}),undefined);
 assert.throws(()=>readManualReference(refRecord,{...identity,partId:'P2'}),/different source part/);
 assert.throws(()=>readManualReference(refRecord,{...identity,musicalRevision:'1'.repeat(64)}),/different source part/);
 assert.notEqual(await manualReferenceStorageName({...identity,partId:'P2'}),refName);
 assert.equal(JSON.stringify(p),before);assert.equal(JSON.stringify(refRecord.reference),JSON.stringify(reference));
});
