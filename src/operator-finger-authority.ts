/** Explicit review evidence; no score-specific owners or calculator policy. */
export interface OperatorFingerChange {
 id:string;pitch:number;startTick:number;durationTicks:number;hand:'LH'|'RH';row:number;from:number;to:number;reason:string;
}
export interface OperatorFingerReview {
 version:'operator-finger-review-v1';id:string;reviewedAt:string;provenance:string;
 packageSha256:string;revision:string;sourceHash:string;profileId:string;profileSha256:string;
 changes:OperatorFingerChange[];
}
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const digest=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const finger=(v:unknown)=>Number.isInteger(v)&&Number(v)>=1&&Number(v)<=5;
export function readOperatorFingerReview(value:unknown):OperatorFingerReview {
 if(!object(value)||value.version!=='operator-finger-review-v1'||typeof value.id!=='string'||!value.id.trim()||
  typeof value.reviewedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(value.reviewedAt)||!Number.isFinite(Date.parse(value.reviewedAt))||
  typeof value.provenance!=='string'||!value.provenance.trim()||typeof value.profileId!=='string'||!value.profileId||
  !['packageSha256','revision','sourceHash','profileSha256'].every(k=>digest(value[k]))||
  !Array.isArray(value.changes)||!value.changes.length||value.changes.length>1000)throw Error('Invalid source-bound operator review');
 const ids=new Set<string>();
 for(const c of value.changes){
  if(!object(c)||typeof c.id!=='string'||!c.id||ids.has(c.id)||!Number.isSafeInteger(c.pitch)||!Number.isSafeInteger(c.startTick)||c.startTick<0||
   !Number.isSafeInteger(c.durationTicks)||c.durationTicks<=0||!['LH','RH'].includes(c.hand)||!Number.isInteger(c.row)||c.row<1||c.row>4||
   !finger(c.from)||!finger(c.to)||c.from===c.to||typeof c.reason!=='string'||!c.reason.trim())throw Error('Invalid or duplicate operator finger change');
  ids.add(c.id);
 }
 return structuredClone(value) as OperatorFingerReview;
}

/** Extra provenance is opt-in; historical authority without this field keeps
 * its original admission. Imported current reviews must match their constraints. */
export function validateOperatorFingerJournal(authority:Record<string,any>,binding:{revision:string;sourceHash:string;profileId:unknown;profileSha256:unknown}):void {
 if(authority.operatorUpdates===undefined)return;
 if(!Array.isArray(authority.operatorUpdates)||!authority.operatorUpdates.length)throw Error('Invalid operator review journal');
 const ids=new Set<string>();
 for(const update of authority.operatorUpdates){
  if(!object(update)||update.version!=='source-bound-operator-finger-update-v1'||!digest(update.baselineLayerSha256)||!digest(update.baselineAuthoritySha256)||update.baselineReviewedFingerAuthority!==null&&!object(update.baselineReviewedFingerAuthority))throw Error('Invalid operator baseline provenance');
  const review=readOperatorFingerReview(update.review);
  if(ids.has(review.id)||review.revision!==binding.revision||review.sourceHash!==binding.sourceHash||review.profileId!==binding.profileId||review.profileSha256!==binding.profileSha256)throw Error('Operator review source/profile differs');
  ids.add(review.id);
  for(const c of review.changes){
   const q=authority.constraints.find((q:any)=>q.id===c.id);
   if(!q||q.pitch!==c.pitch||q.startTick!==c.startTick||q.durationTicks!==c.durationTicks||q.hand!==c.hand||q.row!==c.row||q.finger!==c.to)throw Error('Operator review constraint differs');
  }
 }
}
