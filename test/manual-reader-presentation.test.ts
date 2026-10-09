import test from 'node:test';
import assert from 'node:assert/strict';
import {importPackage} from '../src/package';
import {ManualReadingContext} from '../src/manual-reading-context';
import {manualReaderView,retainManualReaderView} from '../src/manual-reader-presentation';
import {defaultView} from '../src/state';
import {authoredFrettedPackage} from './support/fretted-dual-fixture';

const original=await importPackage(await authoredFrettedPackage());
test('notation cursors use source anchors and leave the other view and legacy reader state untouched',async()=>{
 const c=await ManualReadingContext.open(original),base=defaultView(),component=c.plan.components.find(component=>component.bar===2)!;
 c.setAnchor({writtenBar:2,sourceEventId:component.id});const iso=manualReaderView(c,base);
 const record=retainManualReaderView(c,{...iso,scale:.75,count:2,advance:'group'});
 assert.equal(record.anchor.sourceEventId,component.id);assert.deepEqual(record.cursors.iso,{scale:.75,pageCount:2,advance:2});
 c.switchNotation('tab');const tab=manualReaderView(c,base);assert.equal(tab.scale,1);assert.equal(tab.count,1);assert.equal(c.view.anchor.sourceEventId,component.id);
 retainManualReaderView(c,{...tab,scale:.9,count:3});c.switchNotation('iso');assert.deepEqual(manualReaderView(c,base),{...iso,scale:.75,count:2,advance:'group'});
 assert.deepEqual(base,defaultView());assert.equal(Object.keys(c.state.best).length,0);
});
test('unknown reader cursor values refuse instead of changing a saved source location',async()=>{
 const c=await ManualReadingContext.open(original),base=defaultView(),before=c.viewRecord();
 assert.throws(()=>retainManualReaderView(c,{...base,page:999}),/admitted notation/);assert.deepEqual(c.viewRecord(),before);
 c.view.cursors.tab.pageCount=4;c.switchNotation('tab');assert.throws(()=>manualReaderView(c,base),/saved notation cursor/);
});
