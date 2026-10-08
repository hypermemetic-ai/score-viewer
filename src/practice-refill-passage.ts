import type {ScorePackage} from './package';
import type {PracticeChunk,PracticePlan,PracticeSession} from './practice';
import {passageTrack,type Crop,type PassageTrack} from './practice-passage';
import {projectRelations,readableTieContinuation,type ProjectedRelation} from './practice-relations';
import {admitRefill,type RefillCertificate,type RefillPlacement} from './practice-refill';

export interface AdmittedRefillPassage {track:PassageTrack;certificate:RefillCertificate}
/** Every resident source run contains at most four consecutive intervals.
 * Reserve all such run lengths, including the clipped one-bar tie fragments.
 * Translation does not change their interior geometry, corridor or vertical
 * paint. This is a conservative union of all note, annotation, bow and cue
 * states, independent of hand/chord order and sounding-owner expiry. */
export function admitRefillPassage(p:ScorePackage,plan:PracticePlan,chunk:PracticeChunk,crops:Crop[],mount:HTMLElement,maximumWidth?:number,existing?:RefillCertificate):AdmittedRefillPassage {
 const track=passageTrack(crops,mount,p,true),cueAir=new Map<number,number>();
 for(let first=chunk.firstBar;first<=chunk.lastBar;first++)for(let length=1;length<=4&&first+length-1<=chunk.lastBar;length++){
  const bars=Array.from({length},(_,i)=>first+i);
  const projected=projectRelations(p,plan,crops,track,'compact',bars);
  for(const q of projected){track.top=Math.min(track.top,q.bounds.y0-3);track.bottom=Math.max(track.bottom,q.bounds.y1+3);}
  // Every potentially simultaneous owner is settled against the actual
  // previously reconstructed cue paint, not only its old authored bow.
  for(const current of bars){const start=plan.barTicks[current],settled:ProjectedRelation[]=[];
   for(const q of projected){if(q.kind!=='tie'||Number(q.path.getAttribute('data-tie-from-tick'))>=start||Number(q.path.getAttribute('data-tie-to-tick'))<start)continue;const cue=readableTieContinuation(p,q,current,crops,track,bars,undefined,[...projected,...settled]);if(!cue)continue;settled.push(cue);track.top=Math.min(track.top,cue.bounds.y0-3);track.bottom=Math.max(track.bottom,cue.bounds.y1+3);const origin=bars.slice(0,bars.indexOf(current)).reduce((x,bar)=>{const c=crops.find(c=>c.bar===bar)!;return x+c.right-c.left;},0);if(cue.path.getAttribute('data-practice-cue-shape')==='authored-incoming')cueAir.set(current,Math.max(cueAir.get(current)??0,origin-cue.bounds.x0));}
  }
 }
 if(existing&&crops.some(c=>!existing.measures.has(c.bar)||Math.abs(existing.measures.get(c.bar)!.width-(c.right-c.left))>1e-7))throw Error('The certified source intervals changed and need inspection.');
 if(existing&&maximumWidth!==undefined&&existing.frame.width>maximumWidth+1e-7)throw Error('Practice needs more room to keep the current passage readable. Rotate or enlarge the view before resuming.');
 // A wrapped boundary may expose both repeat/final overhangs. Separate
 // their full source clip footprint and stroke air, not only the staff ends.
 const certificate=existing??admitRefill(plan,chunk,crops.map(c=>({bar:c.bar,width:c.right-c.left,leftAir:Math.max(c.leftAir,cueAir.get(c.bar)??0),rightAir:c.rightAir})),{edge:Math.max(track.leftAir,track.rightAir,...cueAir.values())+.8,breakGap:8,maxFrameWidth:maximumWidth});
 track.frame={left:0,right:certificate.frame.width};return {track,certificate};
}

/** Cues retain complete authored bows or readable verified continuations. They never own a
 * head/stem, invent a pedal tie, or change the session's sound ledger. The
 * destination onset is intentionally not used as a lifetime boundary. */
export function heldTieCues(p:ScorePackage,plan:PracticePlan,session:PracticeSession,retired:ReadonlySet<number>,current:RefillPlacement,projected:ProjectedRelation[],crops:Crop[],track:PassageTrack,placements:ReadonlyArray<RefillPlacement>):ProjectedRelation[] {
 const cues:ProjectedRelation[]=[],settled:ProjectedRelation[]=[];
 for(const q of projected){
  if(q.kind!=='tie'||Number(q.path.getAttribute('data-tie-from-tick'))>=plan.barTicks[current.bar]||Number(q.path.getAttribute('data-tie-to-tick'))<plan.barTicks[current.bar])continue;
  // Geometry uses the same conservative simultaneous owner set as preflight.
  // Expiry/filtering cannot select a different clearance or move another cue.
  const cue=readableTieContinuation(p,q,current.bar,crops,track,placements.map(p=>p.bar),placements,[...projected,...settled]);if(!cue)continue;settled.push(cue);
  const owner=(q.path.getAttribute('data-tie-note')??'').replace(/~c\d+$/,''),note=p.score.notes.find(n=>n.id===owner),group=plan.ownerGroup.get(owner),attack=session.obligations.find(a=>a.owners.includes(owner));
  if(!note||!group||!attack||!retired.has(Number(group.split(':')[0]))||!(session.matched.has(attack.id)||attack.tick<session.startTick))continue;
  const end=Math.min(plan.barTicks[current.bar+1],note.startTick+note.durationTicks);
  if(session.elapsedTick>=end-1e-7)continue;
  const path=cue.path;path.setAttribute('data-practice-held-cue',q.id);path.setAttribute('data-practice-cue-owner',owner);path.setAttribute('data-practice-cue-bar',String(current.bar+1));path.setAttribute('data-practice-cue-end',String(end));if(!path.hasAttribute('data-practice-cue-shape'))path.setAttribute('data-practice-cue-shape','complete-authored');
  cues.push({...cue,id:'cue:'+q.id});
 }
 return cues;
}
