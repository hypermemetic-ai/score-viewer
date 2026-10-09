import test from 'node:test';
import assert from 'node:assert/strict';
import {importPackage} from '../src/package';
import {planManualPractice} from '../src/manual-practice-plan';
import {initialPractice,readPractice,passageHierarchy} from '../src/practice';
import {authoredReadingScore,authoredReadingPackage} from './support/instrument-reading-fixture';
import {authoredManualScore} from './support/manual-practice-fixture';

const original=await importPackage(await authoredReadingPackage());

test('actual admitted ISO reading creates a complete manual plan without physical roles',async()=>{
 const before=JSON.stringify(original),plan=await planManualPractice(original);
 assert.equal(plan.assessment,'manual');assert.equal(plan.partId,'original-part');
 assert.equal(plan.owners.length,original.score.notes.length);
 assert.equal(plan.components.length,original.reading!.owners.reduce((n,o)=>n+o.heads.length,0));
 assert.equal(plan.owners.find(o=>o.id==='dead')!.kind,'unpitched');
 for(const object of [plan,...plan.owners,...plan.components]){
  for(const key of ['midi','hand','seats','attacks','gestures','ownerGroup','sourceEventId'])assert.equal(key in object,false);
 }
 assert.ok(plan.components.every(c=>c.provenance.kind==='retained-reading-head-v1'));
 assert.deepEqual(plan.barTicks,[0,192,384]);assert.deepEqual(plan.chunks.map(c=>c.id),['1-2']);
 assert.deepEqual(readPractice(initialPractice(plan),plan),{...initialPractice(plan),groundwork:{}});
 assert.equal(passageHierarchy(plan,initialPractice(plan)).all.size,1);
 assert.equal(JSON.stringify(original),before);
});

test('visual profiles, headers and pagination do not define musical evidence identity',async()=>{
 const changed=structuredClone(original);
 changed.manifest.revision='different-prepared-revision';changed.manifest.engineVersion='different-visual-engine';
 changed.score.title='Different display title';changed.score.composer='Display metadata';
 changed.score.readingPolicy!.centerPitch=36;changed.score.readingPolicy!.guidePitches=[24,36,48];
 for(const event of changed.score.notes)event.displayStemDirection=1;
 const a=await planManualPractice(original),b=await planManualPractice(changed);
 assert.equal(a.revision,b.revision);assert.deepEqual(a.chunks,b.chunks);
 const facts=structuredClone(original);facts.score.notes[0].durationTicks=48;
 await assert.rejects(planManualPractice(facts),/clock|ownership differs/);
});

test('different genuine selected parts cannot share evidence, and unknown source facts are retained',async()=>{
 const other=structuredClone(original),part='second-real-part';
 other.score.parts![0].id=part;other.score.readingPolicy!.partId=part;
 for(const event of other.score.notes)event.partId=part;
 for(const owner of other.reading!.owners)owner.partId=part;
 for(const relation of other.score.techniques!)relation.partId=part;
 const a=await planManualPractice(original),b=await planManualPractice(other);
 assert.notEqual(a.revision,b.revision);
 assert.throws(()=>readPractice(initialPractice(a),b),/retained/);
 const future=structuredClone(original) as typeof original & {score:{futureSourceFact?:unknown}};
 future.score.futureSourceFact={authorizedPhysicalString:'source-only'};
 assert.notEqual((await planManualPractice(future)).revision,a.revision);
});

test('missing or contradictory admitted ownership cannot grant manual planning',async()=>{
 for(const mutate of [
  (p:typeof original)=>{p.reading!.owners.pop();},
  (p:typeof original)=>{p.reading!.owners[0].startTick++;},
  (p:typeof original)=>{p.reading!.owners[0].heads[0].page=p.pages.length;},
  (p:typeof original)=>{p.reading!.owners[0].heads[0].durationTicks--;},
  (p:typeof original)=>{p.reading!.owners[0].heads[0].x++;},
  (p:typeof original)=>{p.reading!.owners[0].heads[0].page=1;},
  (p:typeof original)=>{p.reading!.geometryEvidence.ok=false;},
  (p:typeof original)=>{p.score.sourceBarTicks=[0,384,192];}
 ]){const invalid=structuredClone(original);mutate(invalid);await assert.rejects(planManualPractice(invalid));}
 assert.equal(original.reading!.geometryEvidence.ok,true);
});

test('source rest and spacer identities remain truthful and rests need actual source ownership',async()=>{
 const score=authoredReadingScore();score.notes=[];score.techniques=[];
 score.sourceSilences=[{id:'written-rest',partId:'original-part',voice:'original-part:1:1',staff:'original-part:1',
  startTick:0,durationTicks:192,kind:'rest',sourceWrittenValue:{type:'whole',dots:0,measureRest:true},
  file:'authored.musicxml',line:1,col:1,bar:1,occurrence:1},
 {partId:'original-part',voice:'original-part:1:1',staff:'original-part:1',startTick:192,durationTicks:192,kind:'skip',
  sourceWrittenValue:{type:'whole',dots:0},file:'authored.musicxml',line:2,col:1,bar:2,occurrence:1}];
 const p=await importPackage(await authoredReadingPackage(score)),plan=await planManualPractice(p);
 assert.equal(plan.owners.length,0);assert.deepEqual(plan.components.map(c=>c.kind),['rest','skip']);
 assert.equal(plan.components[0].provenance.kind,'retained-source-silence-v1');
 assert.equal('sourceEventId' in plan.components[1],false);
 assert.equal(plan.components[1].provenance.kind,'retained-source-silence-v1');
 const invalid=structuredClone(p);invalid.score.sourceSilences![0].staff='';
 await assert.rejects(planManualPractice(invalid),/genuine source/);
 const ambiguous=structuredClone(p);ambiguous.score.sourceSilences!.push(structuredClone(ambiguous.score.sourceSilences![0]));
 await assert.rejects(planManualPractice(ambiguous),/ambiguous source silence/);
});

test('retained written repeat facts weight source passages without duplicating musical owners',async()=>{
 const score=authoredManualScore(8),writtenBars=[1,2,3,4,1,2,3,4,5,6,7,8];
 score.writtenPresentation={sourceScoreId:score.id,sourceHash:'0'.repeat(64),performedTotalTicks:12*192,writtenBars:8,performedBars:12,
  repeats:[{startBar:1,endBar:4,times:2}],events:{},occurrences:writtenBars.map((writtenBar,i)=>({
   performedBar:i+1,writtenBar,pass:i>=4&&i<8?2:1,performedTick:i*192,writtenTick:(writtenBar-1)*192}))};
 const repeated=await importPackage(await authoredReadingPackage(score)),plan=await planManualPractice(repeated,'fixed-four-v1');
 assert.deepEqual(plan.chunks.map(chunk=>chunk.weight),[8*192,4*192]);
 assert.equal(plan.owners.length,score.notes.length);assert.equal(plan.components.length,score.notes.length);
 assert.deepEqual(plan.barTicks,score.sourceBarTicks);
 const unrepeated=await importPackage(await authoredReadingPackage(authoredManualScore(8)));
 assert.notEqual(plan.revision,(await planManualPractice(unrepeated,'fixed-four-v1')).revision);
});
