import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {annotationPositions} from '../src/fingering-presentation';
import {fingeringCarriers} from '../src/fingering-carriers';
import {fingeringCarriers as originalCarriers} from './support/fingering-carriers-baseline';
import {ANNOTATION_INK_POLICY} from '../src/annotation-ink-policy';
import {importPackage,type ScorePackage} from '../src/package';
import {sourcePackage,calculatedStudy,completeTieBoundaryStudy} from './support/hand-edition-fixture';

const fields=(p:ScorePackage)=>({score:structuredClone(p.score),pages:[...p.pages],seats:structuredClone(p.seats),
 annotationGeometry:structuredClone(p.annotationGeometry),calculatedHandReceipt:structuredClone(p.calculatedHandReceipt)});
const onPages=<T>(p:Pick<ScorePackage,'seats'>,map:Map<string,T>,pages:readonly number[])=>{
 const selected=new Set(pages),seatPages=new Map(p.seats.map(s=>[s.id,s.page]));
 return new Map([...map].filter(([id])=>selected.has(seatPages.get(id)!)));
};
function check(p:ScorePackage){
 const before=JSON.stringify(fields(p)),full=annotationPositions(fields(p)),lazy=fields(p),carriers=originalCarriers(p);
 assert.equal(full.size,p.seats.length);
 // Nonsequential turns, overlapping spreads and duplicates must never make a
 // partial result masquerade as the original complete cached result.
 for(const pages of [[p.pages.length-1],[0],[p.pages.length-1,0,0],[],...p.pages.map((_,i)=>[i])]){
  assert.deepEqual(annotationPositions(lazy,pages),onPages(p,full,pages));
  assert.deepEqual(fingeringCarriers(p,new Set(pages)),onPages(p,carriers,pages));
 }
 const complete=annotationPositions(lazy);assert.deepEqual(complete,full);assert.equal(annotationPositions(lazy),complete);
 for(const page of p.pages.keys())assert.deepEqual(annotationPositions(lazy,[page]),onPages(p,full,[page]));
 assert.deepEqual(annotationPositions({...fields(p),seats:[...p.seats].reverse()},[p.pages.length-1]),onPages(p,full,[p.pages.length-1]));
 assert.equal(JSON.stringify(fields(p)),before,'Original owners, full pages and geometry remain intact');
}
test('page requests retain exact font admission even before any overlay work',()=>{
 const p={score:{notes:[]},pages:[],seats:[],calculatedHandReceipt:{version:'viewer-calculated-hand-edition-v2',annotationInkPolicy:ANNOTATION_INK_POLICY}} as unknown as ScorePackage;
 for(const pages of [undefined,[]])assert.throws(()=>annotationPositions(p,pages),/independently admitted/);
});
test('literal No14 single pages and overlapping spreads equal the complete placements and independent original carriers',async()=>{
 const p=await importPackage(readFileSync(new URL('../fixtures/schumann-op68-no14.isoscore',import.meta.url)),{allowLegacyTempo:true});
 assert.ok(p.pages.length>1);check(p);
 for(const pages of [[-1],[.5],[NaN],[p.pages.length]]){
  assert.throws(()=>annotationPositions(p,pages),/complete score/);
  assert.throws(()=>fingeringCarriers(p,new Set(pages)),/complete score/);
 }
});
test('calculated tied owners spanning three pages retain complete physical stacks and exact geometry in both keyboards',async()=>{
 const source=completeTieBoundaryStudy(4,'RH'),base=await sourcePackage(source,{measuresPerSystem:1,systemsPerPage:1,pageWidth:255}),
  hands=Object.fromEntries(source.notes.map(n=>[n.id,n.id==='following-attack'?'RH':n.hand!]));
 for(const keyboard of ['conventional-piano','janko-four-row'] as const){
  const {p}=await calculatedStudy(base.p,keyboard,hands);
  assert.equal(p.pages.length,3);assert.ok(p.annotationGeometry);
  const held=p.seats.filter(s=>s.ownerIds.includes('written-hold'));assert.ok(held.some(s=>s.continuation));assert.equal(new Set(held.map(s=>s.page)).size,3);
  check(p);
  const altered=fields(p);altered.annotationGeometry!.presentationIdentity='different-admission';
  assert.throws(()=>annotationPositions(altered,[0]),/admitted presentation/);
  const pageCached=fields(p);annotationPositions(pageCached,[0]);
  const hidden=pageCached.annotationGeometry!.seats.find(s=>s.page===2)!;hidden.hand=hidden.hand==='LH'?'RH':'LH';
  for(const pages of [[0],[]])assert.throws(()=>annotationPositions(pageCached,pages),/seat ownership differs/,'Hidden-page ownership is still audited on a cache hit');
  const badPolicy={...p.calculatedHandReceipt!,annotationInkPolicy:{...ANNOTATION_INK_POLICY,footer:{...ANNOTATION_INK_POLICY.footer,fontSha256:'0'.repeat(64)}}};
  const cached=fields(p);annotationPositions(cached,[0]);cached.calculatedHandReceipt=badPolicy as typeof cached.calculatedHandReceipt;
  assert.throws(()=>annotationPositions(cached,[0]),/altered/,'A cached page cannot bypass font policy validation');
 }
});
