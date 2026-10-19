import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {importPackage as importPackageStrict,type ScorePackage,type Seat} from '../src/package';import {editUnits} from '../src/selection';import {sectionUnits,pieceUnits,fingeringWindow,jumpLabels} from '../src/section-fingering';import {planPractice} from '../src/practice';
const importPackage=(bytes:Uint8Array)=>importPackageStrict(bytes,{allowLegacyTempo:true});
const p=await importPackage(readFileSync(new URL('../fixtures/schumann-op68-no14.tuna',import.meta.url)));
// Zero-based bars 8..11 are written bars 9..12: both hands are present.
const chunk={firstBar:8,lastBar:11};const inSection=(s:Seat)=>s.writtenBar-1>=chunk.firstBar&&s.writtenBar-1<=chunk.lastBar;
const handOf=(q:Pick<ScorePackage,'score'>,s:Seat)=>q.score.notes.find(n=>n.id===s.ownerIds[0])?.hand;
const rank=(q:Pick<ScorePackage,'score'>,s:Seat)=>{const h=handOf(q,s);return h==='RH'?0:h==='LH'?1:2;};

test('section units list the right hand, then the left, then hand-less notes',()=>{
 const units=sectionUnits(p,chunk),ranks=units.map(s=>rank(p,s));
 assert.ok(units.length>0);
 assert.deepEqual(ranks,[...ranks].sort((a,b)=>a-b));
 assert.ok(ranks.includes(0)&&ranks.includes(1));
});
test('section units are exactly the seats written inside the section, once per contact',()=>{
 const units=sectionUnits(p,chunk);
 assert.ok(units.every(inSection));
 assert.equal(units.length,p.seats.filter(inSection).length);
 assert.deepEqual(new Set(units.map(s=>s.writtenBar)),new Set([9,10,11,12]));
 assert.equal(new Set(units.map(s=>s.contactId)).size,units.length);
});
test('held aliases of one contact add no second unit',()=>{
 const seat=p.seats.find(inSection)!;
 const q={...p,seats:[...p.seats,{...seat,id:'held-alias',continuation:true},{...seat,id:'repeat-alias'}]};
 const units=sectionUnits(q,chunk);
 assert.equal(units.length,sectionUnits(p,chunk).length);
 assert.equal(new Set(units.map(s=>s.contactId)).size,units.length);
 assert.equal(units.filter(s=>s.contactId===seat.contactId).length,1);
});
test('each hand keeps the editUnits order, filtered to the section',()=>{
 const units=sectionUnits(p,chunk),all=editUnits(p);
 for(const hand of ['RH','LH'])assert.deepEqual(units.filter(s=>handOf(p,s)===hand).map(s=>s.id),all.filter(s=>inSection(s)&&handOf(p,s)===hand).map(s=>s.id),hand);
});
test('hand-less notes come last and keep the editUnits order',()=>{
 const handless=new Set(sectionUnits(p,chunk).filter((_,i)=>i%4===0).map(s=>s.ownerIds[0]));
 const q={...p,score:{...p.score,notes:p.score.notes.map(n=>handless.has(n.id)?{...n,hand:undefined}:n)}} as ScorePackage;
 const units=sectionUnits(q,chunk),all=editUnits(q),ranks=units.map(s=>rank(q,s));
 assert.deepEqual(ranks,[...ranks].sort((a,b)=>a-b));
 assert.equal(ranks.filter(r=>r===2).length,sectionUnits(p,chunk).filter((_,i)=>i%4===0).length);
 assert.deepEqual(units.filter(s=>rank(q,s)===2).map(s=>s.id),all.filter(s=>inSection(s)&&handOf(q,s)===undefined).map(s=>s.id));
});
test('a section spanning the whole score holds every unit once',()=>{
 const units=sectionUnits(p,{firstBar:0,lastBar:63});
 assert.equal(units.length,editUnits(p).length);
 assert.equal(new Set(units.map(s=>s.contactId)).size,units.length);
});

test('the piece is fingered once through, section by section, each right hand before its left',()=>{
 const plan=planPractice(p,undefined,undefined,{version:'reference-performance-tempo-v1',bpm:80,beat:{numerator:1,denominator:4},provenance:{kind:'editorial',reference:'test'}}),units=pieceUnits(p,plan);
 assert.equal(units.length,editUnits(p).length);
 assert.equal(new Set(units.map(s=>s.contactId)).size,units.length);
 // Measures never go backwards except where a section's left hand starts again at its first measure.
 const sections=plan.chunks.filter(c=>!c.components?.length&&c.kind!=='contrast');
 const of=(s:Seat)=>sections.find(c=>s.writtenBar-1>=c.firstBar&&s.writtenBar-1<=c.lastBar)!.firstBar;
 for(let i=1;i<units.length;i++){assert.ok(of(units[i])>=of(units[i-1]),'sections in order');if(of(units[i])===of(units[i-1]))assert.ok(rank(p,units[i])>=rank(p,units[i-1]),'right hand before left within a section');}
 assert.deepEqual(pieceUnits({...p},{chunks:[],barTicks:plan.barTicks}).map(s=>s.contactId),sectionUnits(p,{firstBar:0,lastBar:plan.barTicks.length-2}).map(s=>s.contactId),'without sections the piece is one run');
});

test('fingering window shows two bars either side and ghosts the outer two',()=>{
 assert.deepEqual(fingeringWindow(64,30),{bars:[28,29,30,31,32],ghosts:new Set([28,32])});
 assert.deepEqual(fingeringWindow(64,0),{bars:[0,1,2],ghosts:new Set([2])});
 assert.deepEqual(fingeringWindow(64,1),{bars:[0,1,2,3],ghosts:new Set([3])});
 assert.deepEqual(fingeringWindow(64,62),{bars:[60,61,62,63],ghosts:new Set([60])});
 assert.deepEqual(fingeringWindow(64,63),{bars:[61,62,63],ghosts:new Set([61])});
 assert.deepEqual(fingeringWindow(1,0),{bars:[0],ghosts:new Set()});
});

// The alphabet has 24 letters (LETTERS in src/section-fingering.ts); two letters give 576 labels.
test('jump labels are single letters up to the alphabet, then pairs, then triples',()=>{
 assert.deepEqual(jumpLabels(0),[]);
 assert.equal(jumpLabels(1)[0],'a');
 assert.ok(jumpLabels(24).every(l=>l.length===1));
 assert.ok(jumpLabels(25).every(l=>l.length===2));
 assert.equal(jumpLabels(25)[0],'aa');
 const many=jumpLabels(577);assert.ok(many.every(l=>l.length===3));assert.equal(new Set(many).size,577);
});
test('jump labels are unique and avoid L and R, which choose a hand',()=>{
 for(let n=0;n<=576;n++){const labels=jumpLabels(n);assert.equal(labels.length,n,`count ${n}`);assert.equal(new Set(labels).size,n,`unique ${n}`);assert.ok(labels.every(l=>!/[lr]/.test(l)),`keys ${n}`);}
});
