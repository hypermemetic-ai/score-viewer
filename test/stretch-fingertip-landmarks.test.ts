import test from 'node:test';
import assert from 'node:assert/strict';
import {createStretchGeometry} from '../src/stretch-calibration-geometry';
import {stretchFingertipMapping,encodeStretchFingertipPercentages,decodeStretchFingertipPercentages,stretchFingertipDifferenceMm} from '../src/stretch-fingertip-landmarks';
import {initialStretchArchive,relativeDifferenceMm,validateStretchArchive} from '../src/stretch-calibration';
import {StretchController} from '../src/stretch-calibration-controller';
const near=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} differs from ${expected}`);

test('thumb/index use distinct approved surfaces and local windows; two wall contacts are not equal reach',async()=>{
 const geometry=await createStretchGeometry([37,85]),m=stretchFingertipMapping(geometry,'RH',[1,2]);
 assert.deepEqual([m.first.surface.midiPitch,m.first.surface.row,m.second.surface.midiPitch,m.second.surface.row],[61,1,64,2]);
 assert.deepEqual([m.first.axisStartMm,m.first.axisEndMm],[34,59.8]);assert.deepEqual([m.second.axisStartMm,m.second.axisEndMm],[66,93.75]);
 assert.deepEqual([m.axisStartMm,m.axisEndMm],[34,93.75]);
 const both=encodeStretchFingertipPercentages(m,100,100);near(both.firstFraction,(59.8-34)/(93.75-34));near(both.secondFraction,1);near(stretchFingertipDifferenceMm(m,100,100),33.95);
 near(stretchFingertipDifferenceMm(m,0,100),59.75);near(stretchFingertipDifferenceMm(m,-20,100),64.91);
 const negative=encodeStretchFingertipPercentages(m,-20,100),decoded=decodeStretchFingertipPercentages(m,negative.firstFraction,negative.secondFraction);assert.ok(negative.firstFraction<0);near(decoded.firstPercent,-20);near(decoded.secondPercent,100);
 assert.match(m.windowId,/viewer-fingertip-landmarks-v2/);assert.ok(m.windowId.includes(geometry.snapshotSha256));
});

test('all three other adjacent pairs share the upper-neighbor entry line and their own lower-main wall',async()=>{
 const geometry=await createStretchGeometry([37,85]);
 for(const pair of [[2,3],[3,4],[4,5]] as const){
  const m=stretchFingertipMapping(geometry,'RH',pair);
  assert.deepEqual([m.first.surface.midiPitch,m.first.surface.row,m.second.surface.midiPitch,m.second.surface.row],[60,2,62,2]);
  assert.deepEqual([m.first.axisStartMm,m.first.axisEndMm,m.second.axisStartMm,m.second.axisEndMm],[66,93.75,66,93.75]);
  assert.equal(m.first.zeroLandmarkSurface.row,3);near(stretchFingertipDifferenceMm(m,50,100),13.875);near(stretchFingertipDifferenceMm(m,100,50),-13.875);near(stretchFingertipDifferenceMm(m,100,100),0);
 }
});

test('left-hand reflection preserves each physical parity/row and signed forward difference',async()=>{
 const geometry=await createStretchGeometry([37,85]);
 const thumb=stretchFingertipMapping(geometry,'LH',[1,2]),other=stretchFingertipMapping(geometry,'LH',[2,3]);
 assert.deepEqual([thumb.first.surface.midiPitch,thumb.first.surface.row,thumb.second.surface.midiPitch,thumb.second.surface.row],[63,1,60,2]);
 assert.deepEqual([other.first.surface.midiPitch,other.second.surface.midiPitch,other.first.surface.row,other.second.surface.row],[64,62,2,2]);
 near(stretchFingertipDifferenceMm(thumb,-20,100),64.91);near(stretchFingertipDifferenceMm(other,50,100),13.875);
 assert.notEqual(thumb.windowId,stretchFingertipMapping(geometry,'RH',[1,2]).windowId);
});

test('normalized common-axis wire fractions roundtrip and adjacent differences sum without erasing raw local entries',async()=>{
 const geometry=await createStretchGeometry([37,85]);let serial=0;
 const c=new StretchController({load:{value:initialStretchArchive()},files:{async read(){return undefined;},async write(){}},id:()=>`id-${++serial}`});
 await c.createCollection({geometry,provenance:{playerId:'authored-fixture',hand:'RH',setupId:'setup',bodyMidlineXmm:0,seatingReference:'Authored reference frame',referenceLocation:{id:'central',kind:'operator-selected-central',xMm:0}}});
 for(const pair of [[1,2],[2,3],[3,4],[4,5]] as const){
  const m=stretchFingertipMapping(geometry,'RH',pair),local=pair[0]===1?[-20,100] as const:[50,100] as const;
  const fractions=encodeStretchFingertipPercentages(m,local[0],local[1]),notes=JSON.stringify({method:'percent',primary:'second',rawFirst:String(local[0]),rawSecond:String(local[1]),firstWindow:[m.first.axisStartMm,m.first.axisEndMm],secondWindow:[m.second.axisStartMm,m.second.axisEndMm]});
  assert.equal(await c.saveReach({kind:'window-fractions',windowId:m.windowId,...fractions,axisStartMm:m.axisStartMm,axisEndMm:m.axisEndMm,windowReference:m.windowReference},notes),true);
 }
 await validateStretchArchive(c.archive);near(relativeDifferenceMm(c.session!,1,2)!,64.91);near(relativeDifferenceMm(c.session!,1,5)!,64.91+3*13.875);
 assert.match(c.session!.entries[0].notes!,/rawFirst.*-20/);assert.match(c.session!.entries[0].notes!,/firstWindow.*34.*59.8/);
});

test('missing approved surfaces, invalid pairs, unsupported profiles and nonfinite input fail explicitly',async()=>{
 const geometry=await createStretchGeometry([61,63]);assert.throws(()=>stretchFingertipMapping(geometry,'RH',[1,2]),/MIDI 64, row 2/);assert.throws(()=>stretchFingertipMapping(geometry,'RH',[2,3]),/MIDI 60, row 2/);
 const full=await createStretchGeometry([37,85]);assert.throws(()=>stretchFingertipMapping(full,'RH',[1,3]),/adjacent/);assert.throws(()=>stretchFingertipMapping({...full,profileId:'wrong'},'RH',[1,2]),/accepted RR/);
 const m=stretchFingertipMapping(full,'RH',[1,2]);assert.throws(()=>encodeStretchFingertipPercentages(m,NaN,100),/finite/);assert.throws(()=>decodeStretchFingertipPercentages(m,0,Infinity),/finite/);
});
