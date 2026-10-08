import type {ScorePackage} from './package';
import type {PracticeChunk,PracticePlan,PracticeSession} from './practice';
import {passageTrack,type Crop,type PassageTrack} from './practice-passage';
import {projectRelations,type ProjectedRelation} from './practice-relations';
import {admitRefill,type RefillCertificate,type RefillPlacement} from './practice-refill';

export interface AdmittedRefillPassage {track:PassageTrack;certificate:RefillCertificate}
/** Every resident source run contains at most four consecutive intervals.
 * Reserve all such run lengths, including the clipped one-bar tie fragments.
 * Translation does not change their interior geometry, corridor or vertical
 * paint. This is a conservative union of all note, annotation, bow and cue
 * states, independent of hand/chord order and sounding-owner expiry. */
export function admitRefillPassage(p:ScorePackage,plan:PracticePlan,chunk:PracticeChunk,crops:Crop[],mount:HTMLElement,maximumWidth?:number,existing?:RefillCertificate):AdmittedRefillPassage {
 const track=passageTrack(crops,mount,p,true);
 for(let first=chunk.firstBar;first<=chunk.lastBar;first++)for(let length=1;length<=4&&first+length-1<=chunk.lastBar;length++){
  const bars=Array.from({length},(_,i)=>first+i);
  for(const q of projectRelations(p,plan,crops,track,'compact',bars)){track.top=Math.min(track.top,q.bounds.y0-3);track.bottom=Math.max(track.bottom,q.bounds.y1+3);}
 }
 if(existing&&crops.some(c=>!existing.measures.has(c.bar)||Math.abs(existing.measures.get(c.bar)!.width-(c.right-c.left))>1e-7))throw Error('The certified source intervals changed and need inspection.');
 if(existing&&maximumWidth!==undefined&&existing.frame.width>maximumWidth+1e-7)throw Error('Practice needs more room to keep the current passage readable. Rotate or enlarge the view before resuming.');
 // A wrapped boundary may expose both repeat/final overhangs. Separate
 // their full source clip footprint and stroke air, not only the staff ends.
 const certificate=existing??admitRefill(plan,chunk,crops.map(c=>({bar:c.bar,width:c.right-c.left,leftAir:c.leftAir,rightAir:c.rightAir})),{edge:Math.max(track.leftAir,track.rightAir)+.8,breakGap:8,maxFrameWidth:maximumWidth});
 track.frame={left:0,right:certificate.frame.width};return {track,certificate};
}

/** Cues are clipped copies of verified authored tie paint. They never own a
 * head/stem, invent a pedal tie, or change the session's sound ledger. The
 * destination onset is intentionally not used as a lifetime boundary. */
export function heldTieCues(p:ScorePackage,plan:PracticePlan,session:PracticeSession,retired:ReadonlySet<number>,current:RefillPlacement,projected:ProjectedRelation[]):ProjectedRelation[] {
 const cues:ProjectedRelation[]=[];
 for(const q of projected){
  if(q.kind!=='tie')continue;
  const owner=(q.path.getAttribute('data-tie-note')??'').replace(/~c\d+$/,''),note=p.score.notes.find(n=>n.id===owner),group=plan.ownerGroup.get(owner),attack=session.obligations.find(a=>a.owners.includes(owner));
  if(!note||!group||!attack||!retired.has(Number(group.split(':')[0]))||!(session.matched.has(attack.id)||attack.tick<session.startTick))continue;
  const end=Math.min(plan.barTicks[current.bar+1],note.startTick+note.durationTicks);
  if(session.elapsedTick>=end-1e-7)continue;
  const left=Math.max(q.left,current.x),right=Math.min(q.right,current.x+current.width);
  if(right<=left||q.bounds.x1<=left||q.bounds.x0>=right)continue;
  const path=q.path.cloneNode(true) as SVGPathElement;path.setAttribute('data-practice-held-cue',q.id);path.setAttribute('data-practice-cue-owner',owner);path.setAttribute('data-practice-cue-bar',String(current.bar+1));path.setAttribute('data-practice-cue-end',String(end));
  cues.push({...q,id:'cue:'+q.id,path,left,right,bounds:{...q.bounds,x0:Math.max(left,q.bounds.x0),x1:Math.min(right,q.bounds.x1)}});
 }
 return cues;
}
