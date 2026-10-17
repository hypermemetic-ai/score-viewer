import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {ensurePianoReady} from '../src/piano-readiness';
import {applyOperatorFingerReview} from '../src/operator-finger-update';
import type {Attack} from '../src/package';
import {corrected as editFinger,initialPersonal,readPersonal} from '../src/state';

test('accepted literal No. 14 operator fingers open unchanged, with no calculation',async()=>{
  const bytes=readFileSync(new URL('../vendor/iso-notation/public/review/schumann-no14-conventional-20261006.isoscore',import.meta.url)),
    review=JSON.parse(readFileSync(new URL('../vendor/iso-notation/data/reviews/schumann-no14-janko-fingers-20261007.json',import.meta.url),'utf8')),
    corrected=await applyOperatorFingerReview(bytes,review),q=await ensurePianoReady({packageBytes:corrected.publication.bytes,
      layout:'janko-four-row'});
  assert.equal(q.status,'ready','message' in q?q.message:undefined);
  assert.deepEqual(q.packageBytes,corrected.publication.bytes);assert.deepEqual(q.layer,corrected.after.fingerLayer);
  for(const c of review.changes){const a:Attack=q.layer.attacks.find(action=>action.id===q.layer.sourceOwnerToAttack[c.id])!;
    assert.equal(a.finger,c.to);assert.equal(a.hand,c.hand);assert.equal(a.row,c.row);}
  assert.equal((q.layer.reviewedFingerAuthority as {constraints:unknown[]}).constraints.length,34);
  const seat=q.package.seats.find(s=>s.actionId==='1536:57')!,personal=editFinger(q.package,initialPersonal(q.package),seat,3);
  // Legacy row proposals remain recoverable editorial metadata. The odd pitch
  // has actual rows 1/3; do not silently remap its saved proposal on reopen.
  personal.overrides[seat.contactId].replacement=4;personal.overrides[seat.contactId].proposedRow=2;
  personal.history=[structuredClone(q.layer)];personal.view.page=1;personal.view.scale=.75;
  const before=structuredClone(readPersonal(personal,q.package)),reopened=await ensurePianoReady({packageBytes:q.packageBytes,
    layout:'janko-four-row',personal:before});
  assert.equal(reopened.status,'editable','message' in reopened?reopened.message:undefined);
  assert.deepEqual(reopened.packageBytes,q.packageBytes);assert.deepEqual(reopened.personal,before);
  assert.deepEqual(reopened.layer,q.layer);
});
