import test from 'node:test';import assert from 'node:assert/strict';
import {DOMParser} from '@xmldom/xmldom';
import {createFrettedPassageProjection} from '../vendor/iso-notation/src/score-presentation';
import {PackageAdmissionSession} from '../src/package-admission-session';
import {prepareDualReadingPackage,selectReadingNotation} from '../src/dual-reading-package';
import {manualPassageScene} from '../src/manual-passage-scene';
import {authoredFrettedLongInput,authoredFrettedFiveInput} from './support/fretted-dual-fixture';

const bytes=await prepareDualReadingPackage(authoredFrettedLongInput()),session=new PackageAdmissionSession(),cold=await session.import(bytes),warm=await session.import(bytes);
test('actual cold and warm reader-session scenes compose all overlapping windows with exact original widths and one interior separator',()=>{
 const unchanged=JSON.stringify(cold.reading);
 for(const input of [cold,warm])for(const notation of ['iso','tab'] as const){
  const p=selectReadingNotation(input,notation),source=p.reading!.dual!.views[notation].scene;
  for(let first=0;first<=8;first++){
   const bars=Array.from({length:4},(_,i)=>first+i),actual=manualPassageScene(p,bars),doc=new DOMParser().parseFromString(actual.svg,'image/svg+xml'),
    separators=Array.from(doc.getElementsByTagName('line')).filter(line=>line.hasAttribute('data-manual-separator')),
    guides=Array.from(doc.getElementsByTagName('line')).filter(line=>line.hasAttribute('data-manual-guide'));
   assert.deepEqual(actual.bars,bars);assert.equal(separators.length,3);
   assert.equal(guides.length,source.bars[0].guides.length);assert.equal(new Set(guides.map(guide=>guide.getAttribute('data-manual-guide'))).size,guides.length);
   let x=0;const projection=createFrettedPassageProjection(source,bars.map(writtenBar=>{const b=source.bars.find(b=>b.writtenBar===writtenBar)!,dx=x-b.frame.x0;x+=b.frame.x1-b.frame.x0;return {writtenBar,dx,dy:-b.alignmentY};}));
   assert.deepEqual(guides.map(guide=>({identity:JSON.parse(guide.getAttribute('data-manual-guide')!),x1:Number(guide.getAttribute('x1')),x2:Number(guide.getAttribute('x2')),y:Number(guide.getAttribute('y1')),width:Number(guide.getAttribute('stroke-width')),stroke:guide.getAttribute('stroke'),cap:guide.getAttribute('stroke-linecap')})),projection.guides);
   let edge=0;for(let i=0;i<3;i++){const bar=source.bars.find(bar=>bar.writtenBar===bars[i])!;edge+=bar.frame.x1-bar.frame.x0;assert.equal(Number(separators[i].getAttribute('x1')),edge);assert.equal(Number(separators[i].getAttribute('x2')),edge);}
   assert.deepEqual(actual.components,source.components.filter(c=>bars.includes(c.writtenBar)).map(c=>c.sourceEventId));
   for(const c of source.components.filter(c=>bars.includes(c.writtenBar)))for(const id of c.inkIds){
    assert.ok(Array.from(doc.getElementsByTagName('*')).some(node=>node.getAttribute('data-manual-source-ink')===id),`Complete ${notation} component ink: ${id}`);
   }
   assert.equal(doc.documentElement!.getAttribute('viewBox')!.split(' ').map(Number).every(Number.isFinite),true);
   for(const bar of bars){
    const sourceDoc=new DOMParser().parseFromString(p.pages[source.bars.find(b=>b.writtenBar===bar)!.page],'image/svg+xml'),
     sourceOrder=Array.from(sourceDoc.getElementsByTagName('*')).map(node=>node.getAttribute('id')).filter(Boolean),
     retained=Array.from(doc.getElementsByTagName('g')).filter(node=>node.getAttribute('id')?.startsWith(`manual-b${bar}-`)).map(node=>node.getAttribute('data-manual-source-ink')!),
     positions=retained.map(id=>sourceOrder.indexOf(id));
    assert.ok(positions.every((position,i)=>position>=0&&(i===0||position>positions[i-1])),`Actual ${notation} source paper/head/curve paint order in bar ${bar}`);
   }
  }
 }
 assert.equal(JSON.stringify(cold.reading),unchanged);
});
test('joined source adapter refuses raw/cloned authority and nonconsecutive or oversized source windows',()=>{
 assert.throws(()=>manualPassageScene(structuredClone(cold),[0,1,2,3]),/actual receiving-realm/);
 for(const bars of [[],[0,2],[0,1,2,3,4,5],[10,11,12,13]])assert.throws(()=>manualPassageScene(cold,bars),/consecutive|absent/);
});

test('five-bar authored leaf retains complete source components and both actual presentation widths',async()=>{
 const p=await new PackageAdmissionSession().import(await prepareDualReadingPackage(authoredFrettedFiveInput()));
 for(const notation of ['iso','tab'] as const){const selected=selectReadingNotation(p,notation),scene=selected.reading!.dual!.views[notation].scene,joined=manualPassageScene(selected,[0,1,2,3,4]);
  assert.equal(scene.bars.length,5);assert.equal(joined.bars.length,5);assert.deepEqual(joined.components,scene.components.map(c=>c.sourceEventId));
  assert.equal((joined.svg.match(/data-manual-separator/g)??[]).length,4);
 }
});
