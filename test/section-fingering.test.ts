import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {importPackage as importPackageStrict,type ScorePackage,type Seat} from '../src/package';import {editUnits} from '../src/selection';import {pieceUnits,fingeringProgress,percent,fingeringWindow,jumpLabels} from '../src/section-fingering';
const importPackage=(bytes:Uint8Array)=>importPackageStrict(bytes,{allowLegacyTempo:true});
const p=await importPackage(readFileSync(new URL('../fixtures/schumann-op68-no14.tuna',import.meta.url)));
const handOf=(q:Pick<ScorePackage,'score'>,s:Seat)=>q.score.notes.find(n=>n.id===s.ownerIds[0])?.hand;
const rank=(q:Pick<ScorePackage,'score'>,s:Seat)=>{const h=handOf(q,s);return h==='RH'?0:h==='LH'?1:2;};

test('the piece is fingered a measure at a time, each measure\'s right hand before its left',()=>{
 const units=pieceUnits(p);
 assert.equal(units.length,editUnits(p).length);
 assert.equal(new Set(units.map(s=>s.contactId)).size,units.length);
 for(let i=1;i<units.length;i++){const a=units[i-1],b=units[i];assert.ok(b.writtenBar>=a.writtenBar,'measures in order');if(b.writtenBar===a.writtenBar)assert.ok(rank(p,b)>=rank(p,a),'right hand before left within a measure');}
 // Within one measure and hand, the editor's order is kept.
 const all=editUnits(p);
 for(const hand of ['RH','LH'])for(const bar of [1,9,30])assert.deepEqual(units.filter(s=>s.writtenBar===bar&&handOf(p,s)===hand).map(s=>s.id),all.filter(s=>s.writtenBar===bar&&handOf(p,s)===hand).map(s=>s.id),`${hand} ${bar}`);
});
test('held aliases of one contact add no second unit',()=>{
 const seat=p.seats.find(s=>s.writtenBar===9)!;
 const q={...p,seats:[...p.seats,{...seat,id:'held-alias',continuation:true},{...seat,id:'repeat-alias'}]};
 const units=pieceUnits(q);
 assert.equal(units.length,pieceUnits(p).length);
 assert.equal(units.filter(s=>s.contactId===seat.contactId).length,1);
});
test('notes without a hand come after both hands of their measure',()=>{
 const handless=new Set(pieceUnits(p).filter((_,i)=>i%4===0).map(s=>s.ownerIds[0]));
 const q={...p,score:{...p.score,notes:p.score.notes.map(n=>handless.has(n.id)?{...n,hand:undefined}:n)}} as ScorePackage;
 const units=pieceUnits(q);
 for(let i=1;i<units.length;i++)if(units[i].writtenBar===units[i-1].writtenBar)assert.ok(rank(q,units[i])>=rank(q,units[i-1]));
});
test('progress counts the fingered share of the piece and of each hand',()=>{
 const units=pieceUnits(p),done=new Set(units.filter((_,i)=>i%3===0).map(s=>s.id)),hand=(s:Seat)=>handOf(p,s);
 const progress=fingeringProgress(units,s=>done.has(s.id),hand);
 assert.equal(progress.total,units.length);assert.equal(progress.done,done.size);
 assert.equal(progress.hands.RH.total+progress.hands.LH.total,units.filter(s=>hand(s)).length);
 assert.equal(progress.hands.RH.done,units.filter(s=>hand(s)==='RH'&&done.has(s.id)).length);
 assert.equal(percent(0,10),0);assert.equal(percent(5,10),50);assert.equal(percent(999,1000),99,'never 100 until every note');assert.equal(percent(10,10),100);assert.equal(percent(0,0),100);
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
