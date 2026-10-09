import test from 'node:test';import assert from 'node:assert/strict';
import {importPackage} from '../src/package';
import {prepareDualReadingPackage} from '../src/dual-reading-package';
import {ReadingPresentationController} from '../src/reading-presentation';
import {ManualReadingContext} from '../src/manual-reading-context';
import {authoredFrettedInput} from './support/fretted-dual-fixture';

test('full ISO/TAB reading remains available without inventing a missing performance tempo',async()=>{
 const input=authoredFrettedInput();delete input.score.referencePerformanceTempo;
 const p=await importPackage(await prepareDualReadingPackage(input)),c=await ReadingPresentationController.open(p);
 assert.equal(c.view.notation,'iso');c.setAnchor({writtenBar:2});c.switchNotation('tab');assert.equal(c.page,0);
 assert.equal(c.package.reading!.dual!.notation,'tab');assert.equal(p.score.referencePerformanceTempo,undefined);
 await assert.rejects(ManualReadingContext.open(p),/reference|tempo/i);
});
test('reading and manual practice share source view identity, with owned view state and literal scenes',async()=>{
 const p=await importPackage(await prepareDualReadingPackage(authoredFrettedInput())),reading=await ReadingPresentationController.open(p),manual=await ManualReadingContext.open(p);
 assert.equal(reading.revision,manual.plan.revision);assert.equal(reading.storageName,manual.viewStorageName);
 const component=manual.plan.components.find(c=>c.bar===2)!;reading.setAnchor({writtenBar:2,sourceEventId:component.id});reading.switchNotation('tab');
 manual.view.anchor=structuredClone(reading.view.anchor);manual.switchNotation('tab');assert.deepEqual(manual.viewRecord(),reading.record());
 assert.equal(reading.package.reading!.dual!.views.iso.scene,p.reading!.dual!.views.iso.scene);
 const pending=ReadingPresentationController.open(p,reading.record());reading.view.anchor.writtenBar=0;const reopened=await pending;assert.equal(reopened.view.anchor.writtenBar,2);
 assert.throws(()=>reopened.adoptView({...reopened.record(),partId:'other'}),/source part/);
});
