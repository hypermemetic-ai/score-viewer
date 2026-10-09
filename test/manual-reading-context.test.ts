import test from 'node:test';
import assert from 'node:assert/strict';
import {importPackage} from '../src/package';
import {ManualReadingContext} from '../src/manual-reading-context';
import {planManualPractice} from '../src/manual-practice-plan';
import {manualPracticeRecord} from '../src/manual-practice-state';
import {initialPractice} from '../src/practice';
import {authoredFrettedPackage} from './support/fretted-dual-fixture';

const original=await importPackage(await authoredFrettedPackage());
test('closed dual context owns one musical journal and maps source anchors while changing notation',async()=>{
 const context=await ManualReadingContext.open(original,undefined,undefined,'fixed-four-v1'),plan=context.plan,state=context.state,
  source=original.score.sourceWrittenComponents!.components.find(c=>c.tie.stop)!;
 context.setAnchor({writtenBar:source.writtenBar,sourceEventId:source.sourceEventId});const page=context.page;
 assert.equal(context.switchNotation('tab'),true);assert.equal(context.view.notation,'tab');assert.equal(context.page,page);
 assert.equal(context.plan,plan);assert.equal(context.state,state);assert.equal(context.storageName,`practice-manual-v1-${plan.revision}.json`);
 assert.equal(context.view.anchor.sourceEventId,source.sourceEventId);assert.equal(context.package.reading!.dual!.notation,'tab');
 assert.equal(context.switchNotation('iso'),true);assert.equal(context.switchNotation('iso'),false);
 assert.throws(()=>context.setAnchor({writtenBar:0,sourceEventId:'invented'}),/source-written/);
 assert.throws(()=>context.setAnchor({writtenBar:400}),/source-written/);
 assert.throws(()=>context.switchNotation('fake' as never),/Unsupported/);
});
test('a live notation change enters Free view while keeping passage, Done and working-speed evidence',async()=>{
 const c=await ManualReadingContext.open(original,undefined,undefined,'fixed-four-v1'),session=c.selectPassage(c.plan.chunks[0]);
 session.ready(1000);session.update(session.startMs+session.durationMs);assert.equal(session.canDone,true);session.toggleDone();
 const record=c.record(),working=c.state.working,elapsed=session.elapsedTick;
 session.ready(100000);assert.equal(session.phase,'countin');c.switchNotation('tab');assert.equal(session.phase,'paused');
 assert.deepEqual(c.record(),record);assert.equal(c.state.working,working);assert.equal(c.session,session);
 const reopened=await ManualReadingContext.open(original,c.record(),c.viewRecord(),'fixed-four-v1');
 assert.equal(reopened.view.notation,'tab');assert.deepEqual(reopened.record(),c.record());assert.equal(reopened.session,undefined);
 assert.ok(elapsed>=session.chunk.end);
});
test('dual context does not accept forged realm certificates and owns snapshots across async open',async()=>{
 await assert.rejects(ManualReadingContext.open(structuredClone(original)),/receiving-realm/);
 const p=await importPackage(await authoredFrettedPackage()),plan=await planManualPractice(p,'fixed-four-v1'),saved=manualPracticeRecord(plan,initialPractice(plan)),
  pending=ManualReadingContext.open(p,saved,undefined,'fixed-four-v1');
 p.manifest.scoreId='changed-after-open';p.reading!.dual!.views.iso.scene.components[0].tick++;saved.state.working=55;
 const c=await pending;assert.equal(c.package.manifest.scoreId,'authored-fretted-dual');assert.deepEqual(c.plan,plan);assert.equal(c.state.working,10);
 assert.equal(Object.isFrozen(c.package.score),true);assert.equal(Object.isFrozen(c.package.reading!.dual!.views.tab.scene),true);
});
