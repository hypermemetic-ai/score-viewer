import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyOperatorFingerReview} from '../src/operator-finger-update';
import {importPackage,validateLayerAsync,hashBytes} from '../src/package';
import {publishPackage} from '../src/publication';
import {readOperatorFingerReview} from '../src/operator-finger-authority';
import {prepareFingeringStudio} from '../vendor/iso-notation/scripts/lib/fingering-studio-review';
import {getCandidate,CURRENT_CANDIDATES,NO14_OPERATOR_FINGER_CANDIDATES} from '../vendor/iso-notation/src/render/janko/candidates';
import {renderCandidatesView} from '../vendor/iso-notation/src/render/janko/studio';
import {DOMParser,XMLSerializer} from '@xmldom/xmldom';

const bytes=readFileSync(new URL('../vendor/iso-notation/public/review/schumann-no14-conventional-20261006.isoscore',import.meta.url));
const review=readOperatorFingerReview(JSON.parse(readFileSync(new URL('../vendor/iso-notation/data/reviews/schumann-no14-janko-fingers-20261007.json',import.meta.url),'utf8')));
const result=await applyOperatorFingerReview(bytes,review),{before,after}=result;
const old=before.fingerLayer!,layer=after.fingerLayer!,authority=layer.reviewedFingerAuthority as any;
const expected=new Map(review.changes.map(c=>[c.id,c]));

test('literal operator update changes exactly two RH fingers and retains source, rows, aliases and every other member',()=>{
 assert.deepEqual(result.receipt.changedMembers,['presentations/janko-four-row/fingers.json']);
 assert.equal(result.receipt.completeContactReplay,true);assert.equal(result.receipt.authorityCount,34);
 assert.deepEqual(after.score,before.score);assert.deepEqual(after.sourceScore,before.sourceScore);assert.deepEqual(after.seats,before.seats);assert.deepEqual(after.pages,before.pages);
 assert.deepEqual(layer.sourceOwnerToAttack,old.sourceOwnerToAttack);assert.deepEqual(layer.traversal,old.traversal);
 let changed=0;
 for(const [index,a]of layer.attacks.entries()){
  const previous=old.attacks[index],changes=a.owners.map(o=>expected.get(o.id)).filter(Boolean);
  assert.deepEqual({...a,finger:previous.finger},previous);
  assert.equal(a.finger,changes.length?changes[0]!.to:previous.finger);if(a.finger!==previous.finger)changed++;
 }
 assert.equal(changed,2);assert.equal(after.score.notes.length,383);assert.equal(layer.attacks.length,381);assert.equal(after.seats.length,381);assert.equal(after.pages.length,3);
 const fingers=(bar:number,hand:'LH'|'RH')=>layer.attacks.filter(a=>a.writtenBar===bar&&a.hand===hand).map(a=>a.finger);
 assert.deepEqual(fingers(11,'LH'),[2,1]);assert.deepEqual(fingers(11,'RH'),[1,5,4,1]);assert.deepEqual(fingers(12,'RH'),[1,5,2,1]);
 for(const name of Object.keys(before.collectionManifest!.files))if(!result.receipt.changedMembers.includes(name))assert.deepEqual(after.files[name],before.files[name],name);
});

test('fresh fixed route retains exact baseline authority and projection as history, and normal sharing preserves them',async()=>{
 assert.equal(layer.plannerVersion,'released-owner-actions-v1');assert.match(String(layer.candidateId),/^rr-performance-pose:[a-f0-9]{64}$/);
 assert.deepEqual(layer.search,{status:'operator-reviewed-fixed-route',optimized:false,reviewId:review.id});assert.equal(layer.providedAuthorityProjection,undefined);
 assert.deepEqual(authority.constraints.slice(0,32),(old.reviewedFingerAuthority as any).constraints);
 const journal=authority.operatorUpdates[0];assert.deepEqual(journal.review,review);assert.deepEqual(journal.baselineReviewedFingerAuthority,old.reviewedFingerAuthority);assert.deepEqual(journal.baselineProvidedAuthorityProjection,old.providedAuthorityProjection);
 assert.equal(journal.baselineAuthoritySha256,await hashBytes(JSON.stringify(old.reviewedFingerAuthority)));assert.equal(journal.baselineLayerSha256,before.collectionManifest!.files['presentations/janko-four-row/fingers.json']);
 assert.deepEqual(layer.performanceClock,old.performanceClock);assert.deepEqual(layer.referencePerformanceTempo,old.referencePerformanceTempo);
 const shared=await publishPackage(after),recipient=await importPackage(shared.bytes,{keyboardLayout:'janko-four-row'});assert.deepEqual(recipient.fingerLayer,layer);
 assert.equal((await importPackage(shared.bytes,{keyboardLayout:'conventional-piano'})).fingerLayer!.plannerVersion,(await importPackage(bytes,{keyboardLayout:'conventional-piano'})).fingerLayer!.plannerVersion);
});

test('old/source/package/profile guards reject a stale or misattributed review before publication',async()=>{
 for(const [key,value]of [['packageSha256','0'.repeat(64)],['sourceHash','0'.repeat(64)],['revision','0'.repeat(64)],['profileSha256','0'.repeat(64)],['profileId','other']] as const){
  await assert.rejects(applyOperatorFingerReview(bytes,{...review,[key]:value}),/pin differs/);
 }
 for(const [key,value]of [['pitch',58],['startTick',1537],['durationTicks',48],['hand','LH'],['row',1],['from',2]] as const){const q=structuredClone(review);(q.changes[0] as any)[key]=value;await assert.rejects(applyOperatorFingerReview(bytes,q),/old\/source\/contact fact differs/);}
 assert.throws(()=>readOperatorFingerReview({...review,changes:[review.changes[0],review.changes[0]]}),/duplicate/);
 const reviewed=(old.reviewedFingerAuthority as any).constraints.find((q:any)=>old.attacks.find(a=>a.id===old.sourceOwnerToAttack[q.id])!.owners.length===1),a=old.attacks.find(a=>a.id===old.sourceOwnerToAttack[reviewed.id])!;
 await assert.rejects(applyOperatorFingerReview(bytes,{...review,changes:[{...review.changes[0],...reviewed,row:a.row,from:a.finger,to:a.finger===5?4:5}]}),/already has reviewed/);
 const alias=old.attacks.find(a=>a.owners.length>1)!,owner=alias.owners[0],n=before.score.notes.find(n=>n.id===owner.id)!;
 await assert.rejects(applyOperatorFingerReview(bytes,{...review,changes:[{...review.changes[0],id:owner.id,pitch:alias.pitch,startTick:n.startTick,durationTicks:n.durationTicks,hand:alias.hand,row:alias.row,from:alias.finger,to:alias.finger===5?4:5}]}),/Every shared contact owner/);
});

test('imported review journal and protected physical row are admitted as source facts, never ignored',async()=>{
 const changed=structuredClone(layer);(changed.reviewedFingerAuthority as any).constraints.at(-1).row=1;
 await assert.rejects(validateLayerAsync(changed,after),/authority\/source mismatch/);
 const misbound=structuredClone(layer);(misbound.reviewedFingerAuthority as any).operatorUpdates[0].review.sourceHash='0'.repeat(64);await assert.rejects(validateLayerAsync(misbound,after),/source\/profile differs/);
 const history=structuredClone(layer);(history.reviewedFingerAuthority as any).operatorUpdates[0].baselineReviewedFingerAuthority.constraints.pop();await assert.rejects(validateLayerAsync(history,after),/baseline authority digest mismatch/);
});

test('actual complete RR recalculation preserves all 34 reviewed choices, rows and linked profile admission',async()=>{
 const replies:any[]=[];(globalThis as any).self=globalThis;(globalThis as any).postMessage=(v:any)=>replies.push(v);await import('../src/planner.worker');
 await (globalThis as any).self.onmessage({data:{score:after.score,manifest:after.manifest,seed:layer,reviewedAuthority:authority}});
 const complete=replies.find(r=>r.type==='complete');assert.ok(complete,JSON.stringify(replies.at(-1)));await validateLayerAsync(complete.layer,after);
 assert.equal(complete.layer.profileSha256,after.profileSha256);assert.deepEqual(complete.layer.reviewedFingerAuthority,authority);
 for(const q of authority.constraints){const a=complete.layer.attacks.find((a:any)=>a.id===complete.layer.sourceOwnerToAttack[q.id]);assert.equal(a.hand,q.hand);assert.equal(a.finger,q.finger);if(q.row!==undefined)assert.equal(a.row,q.row);}
 const stale=structuredClone(layer);stale.attacks.find(a=>a.id===stale.sourceOwnerToAttack[review.changes[0].id])!.row=1;replies.length=0;
 await (globalThis as any).self.onmessage({data:{score:after.score,manifest:after.manifest,seed:stale,reviewedAuthority:authority}});
 assert.equal(replies.some(r=>r.type==='complete'),false);assert.match(replies.at(-1).message,/Seed differs from reviewed source contact/);
});

test('opt-in real-engine review is clean, retains pitch pages and changes only the two source-linked finger labels',async()=>{
 const original=await prepareFingeringStudio(bytes,{operatorReview:true}),corrected=await prepareFingeringStudio(result.publication.bytes,{operatorReview:true});
 for(const prepared of [original,corrected]){
  assert.ok(prepared.package.renderingRecipe,'linked operator package exercises its explicit versioned recipe');
  const entry=prepared.config.scores[prepared.config.fingeringReview!.scoreId];
  assert.equal(entry.options.retainedEngraving,true);
  assert.equal(entry.options.elasticSpacing,undefined);
  assert.equal(prepared.package.renderingRecipe.options.retainedEngraving,undefined,'stored old recipe bytes do not acquire runtime flags');
 }
 assert.deepEqual(original.receipt.lint,{violations:[],warnings:[]});assert.deepEqual(corrected.receipt.lint,original.receipt.lint);
 assert.deepEqual(corrected.presentation.pages,original.presentation.pages);assert.deepEqual(corrected.presentation.seats,original.presentation.seats);assert.deepEqual(corrected.positions,original.positions);
 assert.deepEqual(CURRENT_CANDIDATES.map(c=>c.id),['no14-absolute-condensed']);
 for(const c of NO14_OPERATOR_FINGER_CANDIDATES){assert.equal(getCandidate(c.id),c);const window=c.windows?.[1];assert.ok(window&&'measureStart' in window);assert.equal(window.measureStart,10);assert.equal(window.measureCount,4);}
 let changed=0;
 for(const page of before.pages){
  assert.equal(corrected.paint(page,'pitch'),original.paint(page,'pitch'));
  const parse=(s:string)=>new DOMParser().parseFromString(s,'image/svg+xml'),oldDoc=parse(original.paint(page,'annotations')),newDoc=parse(corrected.paint(page,'annotations'));
  const oldLabels=Array.from(oldDoc.getElementsByTagName('text')).filter(t=>t.hasAttribute('data-finger-seat')),newLabels=Array.from(newDoc.getElementsByTagName('text')).filter(t=>t.hasAttribute('data-finger-seat'));
  assert.equal(oldLabels.length,newLabels.length);
  for(const [index,label] of newLabels.entries()){
   const previous=oldLabels[index],seat=after.seats.find(s=>s.id===label.getAttribute('data-finger-seat'))!,c=seat.ownerIds.map(id=>expected.get(id)).find(Boolean);
   assert.equal(label.textContent,c?String(c.to):previous.textContent);
   assert.equal(label.getAttribute('aria-label'),c?previous.getAttribute('aria-label')!.replace(`Finger ${c.from},`,`Finger ${c.to},`):previous.getAttribute('aria-label'));
   if(label.textContent!==previous.textContent)changed++;
   label.textContent=previous.textContent;label.setAttribute('aria-label',previous.getAttribute('aria-label')!);
  }
  assert.equal(new XMLSerializer().serializeToString(newDoc),new XMLSerializer().serializeToString(oldDoc));
 }
 assert.equal(changed,2);
 for(const studio of [original,corrected]){const html=renderCandidatesView(studio.config);assert.equal((html.match(/class="janko-svg"/g)??[]).length,12);for(const c of NO14_OPERATOR_FINGER_CANDIDATES)assert.ok(html.includes(`data-candidate="${c.id}" data-lint="clean"`));}
});
