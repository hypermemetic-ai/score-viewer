import {referenceFixture} from './support/reference-score';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {importPackage,validateLayer} from '../src/package';
import {emptySpanCalibrationRecord,compileSpanCalibration} from '../vendor/iso-notation/src/model/isomorphic-span-calibration';

const p=await referenceFixture(new URL('../fixtures/schumann-op68-no14.isoscore',import.meta.url));
const replies:any[]=[];
(globalThis as any).self=globalThis;
(globalThis as any).postMessage=(reply:unknown)=>replies.push(reply);
await import('../src/planner.worker');
const calculate=(seed=p.fingerLayer,score=p.score)=>{
 replies.length=0;
 (globalThis as any).self.onmessage({data:{score,manifest:p.manifest,seed,reviewedAuthority:p.fingerLayer!.reviewedFingerAuthority}});
 return replies;
};

test('real No.14 seeded worker preserves every source hand, shared attack and reviewed finger',()=>{
 const result=calculate();const complete=result.find(r=>r.type==='complete');
 assert.ok(complete);assert.ok(result.some(r=>r.type==='progress'));validateLayer(complete.layer,p);
 assert.equal(complete.layer.attacks.length,381);assert.equal(Object.keys(complete.layer.sourceOwnerToAttack).length,383);
 for(const review of (p.fingerLayer!.reviewedFingerAuthority as any).constraints){
  const action=complete.layer.attacks.find((a:any)=>a.owners.some((o:any)=>o.id===review.id));
  assert.equal(action.hand,review.hand);assert.equal(action.finger,review.finger);
 }
 assert.equal(complete.layer.search.status,'bounded');assert.equal(complete.layer.referencePerformanceTempo.bpm,180);assert.equal(complete.layer.performanceClock.secondsPerEighth,1/9);assert.match(complete.layer.plannerVersion,/performance/);assert.match(complete.layer.profileIdentity.version,/performance-seconds/);
});

test('unsupported grace actions and exhausted fresh search report incomplete coverage without a layer',()=>{
 const grace=calculate(p.fingerLayer,{...p.score,graceGroups:[{}] as any});
 assert.equal(grace.some(r=>r.type==='complete'),false);assert.match(grace.at(-1).message,/does not support/);
 const unseeded=(()=>{replies.length=0;(globalThis as any).self.onmessage({data:{score:p.score,manifest:p.manifest,reviewedAuthority:p.fingerLayer!.reviewedFingerAuthority}});return replies;})();
 assert.equal(unseeded.some(r=>r.type==='complete'),false);assert.match(unseeded.at(-1).message,/No contact-safe complete route/);
});

test('explicit personal generation compiles raw evidence and identifies its source without changing hands or reviewed fingers',async()=>{
 const calibration=emptySpanCalibrationRecord();calibration.observations.push({id:'viewer-pair',hand:'RH',task:'two-contact',rating:'comfortable',boundary:'maximum',repetition:'agree',contacts:[{finger:1,pitch:48,copy:1},{finger:5,pitch:62,copy:2}]});
 const expected=await compileSpanCalibration(calibration);
 replies.length=0;
 await (globalThis as any).self.onmessage({data:{score:p.score,manifest:p.manifest,seed:p.fingerLayer,reviewedAuthority:p.fingerLayer!.reviewedFingerAuthority,calibration}});
 const complete=replies.find(r=>r.type==='complete');assert.ok(complete,JSON.stringify(replies.at(-1)));validateLayer(complete.layer,p);
 assert.equal(complete.layer.calibration.id,expected.id);assert.equal(complete.layer.calibration.evidenceSha256,expected.evidenceSha256);
 assert.match(complete.layer.calibration.profileId,/thumb-pinky:/);assert.equal(complete.layer.attacks.length,381);
 for(const review of (p.fingerLayer!.reviewedFingerAuthority as any).constraints){const action=complete.layer.attacks.find((a:any)=>a.owners.some((o:any)=>o.id===review.id));assert.equal(action.hand,review.hand);assert.equal(action.finger,review.finger);}
 for(const action of complete.layer.attacks)for(const owner of action.owners)assert.equal(action.hand,p.score.notes.find(n=>n.id===owner.id)!.hand);
});

test('new worker calculation refuses a missing performance target without replacing fingers',()=>{const legacy={...p.score};delete legacy.referencePerformanceTempo;const result=calculate(p.fingerLayer,legacy);assert.equal(result.some(r=>r.type==='complete'),false);assert.match(result.at(-1).message,/explicit reference/);});

test('declared RR seed uses its own physical rows and refuses historical span geometry',async()=>{
 const score={...structuredClone(p.score),notes:p.score.notes.filter(n=>n.startTick<144),totalTicks:144,sourceBarTicks:[0,144],barlines:[{tick:144}] as any};delete score.writtenPresentation;
 const seed=structuredClone(p.fingerLayer!);seed.attacks=seed.attacks.filter(a=>a.startTick<144);for(const a of seed.attacks){assert.ok(a.row!==undefined);a.row=a.pitch%2?a.row-1:a.row+1;};seed.physicalRowOrder='rr-even-far-last-v1';seed.profileId='rr-player-performance-contact-pose-v5';
 replies.length=0;await (globalThis as any).self.onmessage({data:{score,manifest:p.manifest,seed}});const complete=replies.find(r=>r.type==='complete');assert.ok(complete,JSON.stringify(replies.at(-1)));assert.equal(complete.layer.profileIdentity.id,'rr-player-performance-contact-pose-v5');assert.equal(complete.layer.physicalRowOrder,'rr-even-far-last-v1');for(const a of complete.layer.attacks)assert.ok((a.pitch%2?[1,3]:[2,4]).includes(a.row));
 replies.length=0;await (globalThis as any).self.onmessage({data:{score,manifest:p.manifest,seed,calibration:emptySpanCalibrationRecord()}});assert.equal(replies.some(r=>r.type==='complete'),false);assert.match(replies.at(-1).message,/different keyboard geometry/);
 seed.physicalRowOrder='unknown';replies.length=0;await (globalThis as any).self.onmessage({data:{score,manifest:p.manifest,seed}});assert.equal(replies.some(r=>r.type==='complete'),false);assert.match(replies.at(-1).message,/Unsupported imported finger-row geometry/);
});
