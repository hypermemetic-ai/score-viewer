import {strToU8} from 'fflate';
import {normalizeHandPlanningInput} from '../vendor/iso-notation/src/model/hand-planning-input';
import {completeFingerGrip} from '../vendor/iso-notation/src/model/isomorphic-fingering-profile';
import {RR_PERFORMANCE_POSE_PROFILE as profile} from '../vendor/iso-notation/src/model/isomorphic-rr-personal-pose';
import {evaluateFingerRoute,type JointFingerGrip} from '../vendor/iso-notation/src/model/isomorphic-finger-planner';
import {fingerActionPlan} from '../vendor/iso-notation/src/model/isomorphic-finger-actions';
import {archivePackage,hashBytes,importPackage,validateLayerAsync,type FingerLayer,type ScorePackage} from './package';
import {publishPackage} from './publication';
import {readOperatorFingerReview} from './operator-finger-authority';

/** Reconstruct the admitted contacts, including held owners. This path fixes
 * only reviewed fingers; it does not propose other hands, rows or routes. */
export function replayProvidedRRLayer(p:ScorePackage,layer:FingerLayer){
 const input=normalizeHandPlanningInput(p.score),owners=new Map(layer.attacks.flatMap(a=>a.owners.map(o=>[o.id,a] as const)));
 const selected:JointFingerGrip[]=input.gestures.map(g=>{
  const all=[...g.attacks,...g.carried],roles:NonNullable<JointFingerGrip['attackRoles']>={};
  for(const a of all)for(const o of a.owners){const q=owners.get(o.id);if(!q||q.row===undefined)throw Error('Fixed route contact missing');roles[o.id]={hand:q.hand,key:{pitch:q.pitch,finger:q.finger,row:q.row}};}
  const forHand=(hand:'LH'|'RH')=>{const keys=[...new Map(all.map(a=>roles[a.owners[0].id]).filter(r=>r.hand===hand).map(r=>[r.key.pitch,r.key])).values()];return keys.length?completeFingerGrip(hand,keys,profile):undefined;};
  const LH=forHand('LH'),RH=forHand('RH');
  return {id:'operator-fixed:'+g.id,pattern:g.attacks.map(a=>roles[a.owners[0].id].hand==='LH'?'L':'R').join(''),LH,RH,attackRoles:roles,nominalCost:(LH?.strain??0)+(RH?.strain??0)};
 });
 const result=evaluateFingerRoute(input,selected,profile);
 if(result.failure)throw Error('Operator choices cannot replay the complete contact route: '+result.failure);
 return {input,result,plan:fingerActionPlan(input,selected,profile,result)};
}

export async function applyOperatorFingerReview(bytes:Uint8Array,value:unknown){
 const review=readOperatorFingerReview(value);
 if(await hashBytes(bytes)!==review.packageSha256)throw Error('Operator review package pin differs');
 const before=await importPackage(bytes,{keyboardLayout:'janko-four-row'}),old=before.fingerLayer,m=before.collectionManifest;
 if(!m||m.version!==2||!old||old.physicalRowOrder!=='rr-even-far-last-v1'||before.profileId!==profile.id)throw Error('Operator review requires an admitted linked RR Jankó layer');
 if(before.manifest.revision!==review.revision||old.sourceHash!==review.sourceHash||before.profileId!==review.profileId||before.profileSha256!==review.profileSha256)throw Error('Operator review source/profile pin differs');
 const descriptor=m.presentations?.['janko-four-row'];if(!descriptor?.fingers)throw Error('Jankó finger member missing');
 const layer=structuredClone(old),authority=structuredClone(old.reviewedFingerAuthority??{kind:'explicit-operator-review',constraints:[]}) as Record<string,any>;
 if(authority.kind!=='explicit-operator-review'||!Array.isArray(authority.constraints))throw Error('Unsupported baseline authority');
 const notes=new Map(before.score.notes.map(n=>[n.id,n])),changes=new Map(review.changes.map(c=>[c.id,c]));
 for(const c of review.changes){
  const n=notes.get(c.id),a=layer.attacks.find(a=>a.id===layer.sourceOwnerToAttack[c.id]);
  if(!n||!a||a.pitch!==c.pitch||n.startTick!==c.startTick||n.durationTicks!==c.durationTicks||a.hand!==c.hand||n.hand!==c.hand||a.row!==c.row||a.finger!==c.from)throw Error('Operator old/source/contact fact differs: '+c.id);
  if(a.owners.some(o=>{const q=changes.get(o.id);return !q||q.from!==c.from||q.to!==c.to||q.row!==c.row||q.hand!==c.hand;}))throw Error('Every shared contact owner must receive the same explicit review');
  if(authority.constraints.some((q:any)=>q.id===c.id))throw Error('Owner already has reviewed authority; an explicit replacement review is required: '+c.id);
 }
 const baseline=replayProvidedRRLayer(before,old);
 for(const c of review.changes){layer.attacks.find(a=>a.id===layer.sourceOwnerToAttack[c.id])!.finger=c.to;
  authority.constraints.push({id:c.id,pitch:c.pitch,startTick:c.startTick,durationTicks:c.durationTicks,hand:c.hand,finger:c.to,row:c.row});}
 const corrected=replayProvidedRRLayer(before,layer),inputSha256=await hashBytes(JSON.stringify(corrected.input));
 const journal={version:'source-bound-operator-finger-update-v1',review,baselineLayerSha256:m.files[descriptor.fingers],baselineAuthoritySha256:await hashBytes(JSON.stringify(old.reviewedFingerAuthority??null)),baselineReviewedFingerAuthority:structuredClone(old.reviewedFingerAuthority??null),
  ...(old.providedAuthorityProjection?{baselineProvidedAuthorityProjection:structuredClone(old.providedAuthorityProjection)}:{})};
 authority.operatorUpdates=[...(authority.operatorUpdates??[]),journal];
 // Fresh result: historical calculation/projection claims remain in journal,
 // not in the active fixed-route calculation's inventory or search evidence.
 const updated:FingerLayer={version:'physical-attack-finger-layer-v1',baseScoreId:before.score.id,revision:before.manifest.revision,
  sourceBytesSha256:before.manifest.semanticSha256,sourceHash:old.sourceHash,inputSha256,plannerVersion:corrected.plan.version,ticksPerBeat:old.ticksPerBeat,
  profileId:before.profileId,profileSha256:before.profileSha256,profileIdentity:{id:profile.id,version:profile.version},physicalRowOrder:profile.physicalRowOrder,
  candidateId:'rr-performance-pose:'+await hashBytes(JSON.stringify({inputSha256,review,assignments:corrected.plan.assignments})),
  referencePerformanceTempo:corrected.plan.performanceClock!.tempo,performanceClock:corrected.plan.performanceClock,costUnits:corrected.plan.costUnits,
  reviewedFingerAuthority:authority,attacks:layer.attacks,sourceOwnerToAttack:layer.sourceOwnerToAttack,traversal:layer.traversal,
  objective:corrected.result.objective,search:{status:'operator-reviewed-fixed-route',optimized:false,reviewId:review.id},
  limitations:'Operator choices replay the complete source/held-contact/repeat route in the existing provisional RR model. Other fingers and rows are retained; this is no new optimization or anatomical calibration.'};
 await validateLayerAsync(updated,before);
 const files={...before.files},manifest=structuredClone(m);delete files['manifest.json'];
 files[descriptor.fingers]=strToU8(JSON.stringify(updated,null,2)+'\n');manifest.files[descriptor.fingers]=await hashBytes(files[descriptor.fingers]);
 manifest.metadata.provenance.push(review.provenance);manifest.createdAt=review.reviewedAt;
 const admitted=await importPackage(archivePackage(manifest,files)),publication=await publishPackage(admitted),after=await importPackage(publication.bytes,{keyboardLayout:'janko-four-row'});
 const changedMembers=Object.keys(m.files).filter(n=>m.files[n]!==after.collectionManifest!.files[n]);
 if(changedMembers.length!==1||changedMembers[0]!==descriptor.fingers)throw Error('Operator update changed unrelated package members');
 return {publication,before,after,receipt:{review,changedMembers,baselineObjective:baseline.result.objective,correctedObjective:corrected.result.objective,
  owners:after.score.notes.length,attacks:updated.attacks.length,seats:after.seats.length,pages:after.pages.length,sourceRevision:after.manifest.revision,
  authorityCount:authority.constraints.length,completeContactReplay:true}};
}
