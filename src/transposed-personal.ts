import {isPitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import type {Hand} from '../vendor/iso-notation/src/model/types';
import type {FingerLayer,ScorePackage} from './package';
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
export interface RebuiltPersonal extends TransposedPersonal {
  /** Notes whose earlier edition's hand or printed finger now travels as the
   * player's own choice, because the new pages don't show it. */
  editionChoices:number;
}
type Guard={pitch:number;startTick:number;durationTicks:number};

/** The player's own hand and finger choices move with their notes: each note
 * keeps its identity and timing, and its guard pitch moves by `delta`. With
 * `edition`, an earlier edition's hands and printed fingers that the new
 * pages don't show become the player's own choices for those notes. Nothing
 * is calculated, and the earlier edition keeps its complete journal. */
function carryChoices(s:PersonalState|undefined,from:ScorePackage|undefined,to:ScorePackage,delta:number,
  edition?:{hands:ReadonlyMap<string,Hand|undefined>;fingers?:FingerLayer}):RebuiltPersonal {
  const fresh=initialPersonal(to),notes=new Map(to.score.notes.map(n=>[n.id,n])),choices:Record<string,PersonalOwnerChoice>={},owners=new Set<string>(),
    moved=(ownerId:string,guard:Guard)=>{
      const n=notes.get(ownerId);
      return n&&isPitchedEvent(n)&&n.pitch.octave*12+n.pitch.pitchClass===guard.pitch+delta&&n.startTick===guard.startTick&&n.durationTicks===guard.durationTicks?n:undefined;
    };
  let prior:PersonalState|undefined;
  if(s&&from){
    prior=readPersonal(s,from);
    if(getOriginalScoreIdentity(from)!==getOriginalScoreIdentity(to))throw Error('Personal choices belong to another score; they stay with their edition.');
    fresh.view={...structuredClone(prior.view),fingerSet:'yours'};
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
  }
  const carried=Object.keys(choices).length;let editionChoices=0;
  if(edition){
    // What the player saw: the earlier edition's hands, and the fingers its
    // pages or the player's own earlier layer printed.
    const fingers=prior?.layer??(to.fingerLayer?undefined:from?.fingerLayer??edition.fingers),createdAt=new Date().toISOString(),
      fingerFor=(id:string)=>fingers?.attacks.find(a=>a.id===fingers.sourceOwnerToAttack[id])?.finger;
    for(const n of to.score.notes){
      if(!isPitchedEvent(n))continue;
      const hand=edition.hands.get(n.id),finger=fingerFor(n.id),chosen=choices[n.id],
        addHand=hand!==undefined&&hand!==n.hand&&chosen?.hand===undefined,addFinger=finger!==undefined&&chosen?.finger===undefined;
      if(!addHand&&!addFinger)continue;
      choices[n.id]={...(chosen??{ownerId:n.id,guard:{pitch:n.pitch.octave*12+n.pitch.pitchClass,startTick:n.startTick,durationTicks:n.durationTicks},original:{hand:n.hand??null},createdAt}),
        ...(addHand?{hand}:{}),...(addFinger?{finger}:{})};
      editionChoices++;
    }
  }
  if(!Object.keys(choices).length)return{personal:fresh,carried:0,left:owners.size,editionChoices:0};
  const next={...fresh,assignments:{version:'personal-owner-assignments-v1' as const,sourceRevision:to.sourceRevision??to.manifest.revision,choices}};
  // Unison heads share one choice; if the new edition groups them differently, keep the earlier edition's journal intact instead.
  try{return{personal:readPersonal(next,to),carried,left:owners.size-carried,editionChoices};}
  catch{return{personal:fresh,carried:0,left:owners.size,editionChoices:0};}
}

/** Choices move with their notes by the edition's transposition steps. The
 * earlier edition's finger layer is not carried; its fingerings belong to
 * its pitches. */
export function personalForTransposedEdition(s:PersonalState|undefined,from:ScorePackage,to:ScorePackage):TransposedPersonal {
  const {personal,carried,left}=carryChoices(s,from,to,getScoreTransposition(to)-getScoreTransposition(from));
  return{personal,carried,left};
}

/** A saved edition engraved again keeps the player's journal for each
 * keyboard (`from` is the earlier edition's view on that keyboard, if it had
 * one), and the earlier edition's hands and fingers that the new pages don't
 * print travel as the player's own choices. */
export function personalForRebuiltEdition(s:PersonalState|undefined,from:ScorePackage|undefined,to:ScorePackage,
  edition:{hands:ScorePackage['score'];fingers?:FingerLayer}):RebuiltPersonal {
  if(from&&getScoreTransposition(from)!==getScoreTransposition(to))throw Error('An edition engraved again keeps its pitch.');
  return carryChoices(s,from,to,0,{hands:new Map(edition.hands.notes.map(n=>[n.id,n.hand])),fingers:edition.fingers});
}
