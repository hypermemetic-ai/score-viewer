import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceFixture} from './support/reference-score';
import {planPractice,sharedPracticePlan} from '../src/practice';
import {initialPersonal} from '../src/state';

const p=await referenceFixture(new URL('../vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.tuna',import.meta.url));

test('starting practice plans a score once: the same content gets the same plan, equal to planning afresh',()=>{
 const personal=initialPersonal(p);
 const first=sharedPracticePlan(p,'bounded-exercises-v1',personal);
 assert.deepEqual(first,planPractice(p,'bounded-exercises-v1',personal));
 // Another package object with the same content (a reopen) shares the plan.
 assert.equal(sharedPracticePlan(structuredClone(p),'bounded-exercises-v1',structuredClone(personal)),first);
 // Where the reader is looking plans nothing.
 assert.equal(sharedPracticePlan(p,'bounded-exercises-v1',{...personal,view:{...personal.view,page:personal.view.page+1}}),first);
});

test('a changed hand, edition fingers or score gets its own plan',()=>{
 const personal=initialPersonal(p),first=sharedPracticePlan(p,'bounded-exercises-v1',personal);
 const note=p.score.notes.find(n=>n.hand==='RH')!;
 const moved=structuredClone(p);moved.score.notes.find(n=>n.id===note.id)!.hand='LH';
 const replanned=sharedPracticePlan(moved,'bounded-exercises-v1',personal);
 assert.notEqual(replanned,first);assert.deepEqual(replanned,planPractice(moved,'bounded-exercises-v1',personal));
 const relayered=structuredClone(p);relayered.fingerLayer=undefined;
 assert.notEqual(sharedPracticePlan(relayered,'bounded-exercises-v1',personal),first,'edition fingers are part of what is planned from');
 assert.equal(sharedPracticePlan(p,'bounded-exercises-v1',personal),first,'the first plan is still kept');
});
