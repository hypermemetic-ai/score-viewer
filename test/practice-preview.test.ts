import {referenceFixture} from './support/reference-score';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {importPackage} from '../src/package';import {planPractice,type PracticePlan} from '../src/practice';import {PracticePreview} from '../src/practice-preview';
const p=await referenceFixture(new URL('../fixtures/schumann-op68-no14.isoscore',import.meta.url)),plan=planPractice(p),groups=new Set(plan.gestures.filter(g=>g.bar<4).map(g=>g.id));
const run=(f:PracticePreview,notes:number[],start=0)=>notes.map((n,i)=>f.note(n,80,start+i*100,groups));
test('literal first-bar repeats follow their own occurrences and a fresh7B7 resolves bar4',()=>{
 const f=new PracticePreview(plan),r=run(f,[55,59,62,71,67,62]);assert.deepEqual(r.map(a=>a.attack?.id),plan.attacks.slice(0,6).map(a=>a.id));assert.equal(r.at(-1)?.attack?.tick,120);
 const bar4=run(f,[55,59,67],1000);assert.equal(bar4.at(-1)?.attack?.bar,3);assert.equal(bar4.at(-1)?.attack?.tick,480);
});
test('a restart remains a hypothesis while a continuation initially fits;7-0 continues bar2',()=>{
 const a=new PracticePreview(plan);run(a,[55,59,62,71,67,62]);const r=run(a,[55,59,67],1000);assert.equal(r.at(-1)?.attack?.bar,3);
 const b=new PracticePreview(plan);run(b,[55,59,62,71,67,62]);const next=run(b,[55,60],1000);assert.equal(next.at(-1)?.attack?.bar,1);
});
test('fresh seeds are only position starts, but a remembered midposition continuation is accepted',()=>{
 const f=new PracticePreview(plan);assert.equal(f.note(71,80,0,groups).attack,undefined);run(f,[55,59,62],100);assert.equal(f.note(71,1,24000,groups).attack?.tick,72);
 f.release(71);assert.equal(f.note(71,80,50000,groups).attack,undefined);assert.equal(f.note(55,80,51000,groups).attack?.tick,0);
});
test('quiet unmatched brushes and wrong notes neither grade nor rewind the follower',()=>{
 const f=new PracticePreview(plan);run(f,[55,59,62]);assert.equal(f.note(56,8,1000,groups).decision,'quiet-ignored');assert.equal(f.note(56,100,1100,groups).decision,'preview-unmatched');assert.equal(f.note(71,1,1200,groups).attack?.tick,72);
});
test('refining an ambiguous prefix remaps still-held contact to one owner rather than every same pitch',()=>{
 const f=new PracticePreview(plan);run(f,[55,59]);const r=f.note(67,80,200,groups);assert.equal(r.attack?.bar,3);assert.equal(r.contacts.filter(a=>a.midi===55).length,0);assert.equal(r.contacts.filter(a=>a.midi===67).length,1);assert.equal(r.contacts[0].bar,3);
});
test('chord constituents may arrive in either order without skipping the next source onset',()=>{
 const attacks=[{id:'a',tick:0,end:20,midi:60,bar:0,owners:['a'],groups:['0:RH']},{id:'b',tick:0,end:20,midi:64,bar:0,owners:['b'],groups:['0:RH']},{id:'c',tick:20,end:40,midi:67,bar:0,owners:['c'],groups:['0:RH']}];const tiny={...plan,attacks,gestures:[{id:'0:RH',bar:0,hand:'RH',start:0,end:40,owners:['a','b','c'],attackIds:['a','b','c']}]} as PracticePlan,f=new PracticePreview(tiny),scope=new Set(['0:RH']);
 assert.equal(f.note(64,80,0,scope).attack?.id,'b');assert.equal(f.note(67,80,1,scope).attack,undefined);assert.equal(f.note(60,80,2,scope).attack?.id,'a');assert.equal(f.note(67,80,3,scope).attack?.id,'c');
});

test('ignored quiet input does not extend the25second memory; valid quiet starts do',()=>{
 const f=new PracticePreview(plan);run(f,[55,59,62]);assert.equal(f.note(56,8,24000,groups).decision,'quiet-ignored');assert.equal(f.note(71,80,25400,groups).attack,undefined);
 const q=new PracticePreview(plan);run(q,[55,59,62]);assert.equal(q.note(67,1,1000,groups).attack?.bar,3);assert.equal(q.note(74,1,25000,groups).attack?.bar,3);
});
