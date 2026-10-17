import {isPitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import type {ScorePackage} from './package';
import {initialPersonal,readPersonal,type PersonalState} from './state';
import {readPersonalAssignments,type PersonalOwnerChoice} from './personal-assignments';
import {getOriginalScoreIdentity,getScoreTransposition} from './score-transposition';

export interface TransposedPersonal {
  personal:PersonalState;
  /** Notes whose own hand or finger choice moved to the new pitches. */
  carried:number;
  /** Notes whose choices could not move and stay with the earlier edition. */
  left:number;
}

/** The player's own hand and finger choices move with their notes: each note
 * keeps its identity and timing, and its guard pitch moves by the same steps
 * as the score. The earlier edition's finger layer is not carried; its
 * fingerings belong to its pitches. Nothing is calculated, and the earlier
 * edition keeps its complete journal. */
export function personalForTransposedEdition(s:PersonalState|undefined,from:ScorePackage,to:ScorePackage):TransposedPersonal {
  const fresh=initialPersonal(to);
  if(!s)return{personal:fresh,carried:0,left:0};
  const prior=readPersonal(s,from),delta=getScoreTransposition(to)-getScoreTransposition(from);
  if(getOriginalScoreIdentity(from)!==getOriginalScoreIdentity(to))throw Error('Personal choices belong to another score; they stay with their edition.');
  fresh.view={...structuredClone(prior.view),fingerSet:'yours'};
  const choices:Record<string,PersonalOwnerChoice>={},notes=new Map(to.score.notes.map(n=>[n.id,n])),owners=new Set<string>(),
    moved=(ownerId:string,guard:{pitch:number;startTick:number;durationTicks:number})=>{
      const n=notes.get(ownerId);
      return n&&isPitchedEvent(n)&&n.pitch.octave*12+n.pitch.pitchClass===guard.pitch+delta&&n.startTick===guard.startTick&&n.durationTicks===guard.durationTicks?n:undefined;
    };
  const assignments=readPersonalAssignments(prior.assignments,from)?.choices??{};
  for(const c of Object.values(assignments)){
    owners.add(c.ownerId);const n=moved(c.ownerId,c.guard);if(!n)continue;
    choices[c.ownerId]={ownerId:c.ownerId,guard:{pitch:c.guard.pitch+delta,startTick:c.guard.startTick,durationTicks:c.guard.durationTicks},
      original:{hand:n.hand??null},...(c.hand!==undefined?{hand:c.hand}:{}),...(c.finger!==undefined?{finger:c.finger}:{}),createdAt:c.createdAt,
      ...(c.intent?{intent:structuredClone(c.intent)}:{})};
  }
  // Older finger corrections name their notes; their finger moves as a choice.
  const fromNotes=new Map(from.score.notes.map(n=>[n.id,n]));
  for(const c of Object.values(prior.overrides))for(const id of c.ownerIds){
    if(owners.has(id))continue;owners.add(id);const before=fromNotes.get(id);if(!before||!isPitchedEvent(before))continue;
    const guard={pitch:before.pitch.octave*12+before.pitch.pitchClass,startTick:before.startTick,durationTicks:before.durationTicks},n=moved(id,guard);if(!n)continue;
    choices[id]={ownerId:id,guard:{...guard,pitch:guard.pitch+delta},original:{hand:n.hand??null},finger:c.replacement,createdAt:c.createdAt};
  }
  if(!Object.keys(choices).length)return{personal:fresh,carried:0,left:owners.size};
  const next={...fresh,assignments:{version:'personal-owner-assignments-v1' as const,sourceRevision:to.sourceRevision??to.manifest.revision,choices}};
  // Unison heads share one choice; if the new edition groups them differently, keep the earlier edition's journal intact instead.
  try{return{personal:readPersonal(next,to),carried:Object.keys(choices).length,left:owners.size-Object.keys(choices).length};}
  catch{return{personal:fresh,carried:0,left:owners.size};}
}
