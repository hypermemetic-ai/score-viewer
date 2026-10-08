import test from 'node:test';
import assert from 'node:assert/strict';
import {DOMParser} from '@xmldom/xmldom';
import {durationFixture} from './support/practice-rendering-fixture';
import {planPractice} from '../src/practice';

test('production duration source exercises closed hollow paint, dots, ordinary/path branches, source silence and original continuation owners',()=>{
 const p=durationFixture(),ink=p.pages.join(''),plan=planPractice(p);
 assert.match(ink,/<rect class="janko-hollow-stem"[^>]+fill="#FFFFFF"/);
 assert.match(ink,/data-long-value="half"/);assert.match(ink,/data-long-value="whole"/);
 assert.match(ink,/janko-augmentation-dot/);assert.match(ink,/<line class="janko-stem"/);
 assert.match(ink,/<path class="janko-stem janko-source-voice-two"/);
 assert.match(ink,/data-repeat="repeat-start"/);assert.match(ink,/data-repeat="repeat-end"/);
 assert.ok(p.seats.some(s=>s.ownerIds.length===2));assert.ok(p.seats.some(s=>s.continuation&&s.ownerIds[0]==='carry'));
 assert.equal(p.seats.filter(s=>s.writtenBar===5).length,0);assert.ok(p.score.sourceSilences?.some(s=>s.startTick===768&&s.kind==='rest'));
 assert.equal(plan.attacks.filter(a=>a.owners.includes('carry')).length,1);
 for(const seat of p.seats){assert.ok(seat.ownerIds.every(id=>plan.ownerGroup.has(id)));const doc=new DOMParser().parseFromString(p.pages[seat.page],'image/svg+xml'),text=Array.from(doc.getElementsByTagName('text')).find(e=>e.getAttribute('data-viewer-seat')===seat.id)!;assert.equal(Number(text.getAttribute('x')),seat.x);assert.equal(Number(text.getAttribute('y')),seat.baseline);}
});

test('ordinary long-value control uses production stem rings while retaining the same musical source',()=>{
 const hollow=durationFixture(),ring=durationFixture('ring');
 assert.match(ring.pages.join(''),/janko-stem-ring/);assert.doesNotMatch(ring.pages.join(''),/janko-hollow-stem/);
 assert.deepEqual(ring.score,hollow.score);assert.deepEqual(ring.seats,hollow.seats);
});

test('paired source ties retain both original owners and the production uniform stroke profile across systems',()=>{
 const p=durationFixture('hollow-stem',true,'uniform',true),ink=p.pages.join(''),plan=planPractice(p);
 for(const owner of ['carry','carry-companion']){
  assert.match(ink,new RegExp(`data-tie-note="${owner}"`));
  assert.ok(p.seats.some(s=>s.continuation&&s.ownerIds.includes(owner)));
  assert.equal(plan.attacks.filter(a=>a.owners.includes(owner)).length,1);
 }
 assert.match(ink,/data-tie-profile="uniform"/);
 assert.doesNotMatch(ink,/data-tie-profile="traced"/);
});
