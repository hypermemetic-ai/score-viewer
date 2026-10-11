import {isPitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import type {ScorePackage} from './package';
import type {PracticeChunk,PracticePassagePlan} from './practice';
type OwnerFact=readonly [string,number,number,number,'LH'|'RH'];
interface Context {original:OwnerFact[];effective:OwnerFact[];patterns:Map<string,string>}
const contexts=new WeakMap<PracticePassagePlan,Context>();
const facts=(score:ScorePackage['score']):OwnerFact[]=>score.notes.filter(isPitchedEvent).map(n=>[n.id,n.pitch.octave*12+n.pitch.pitchClass,n.startTick,n.durationTicks,n.hand!] as OwnerFact).sort((a,b)=>a[0].localeCompare(b[0]));
const span=(facts:OwnerFact[],start:number,end:number)=>facts.filter(n=>n[2]<end&&n[2]+n[3]>start);
const prefix='personal-hands-v1:';
export function registerPersonalPracticeIdentity(plan:PracticePassagePlan,original:ScorePackage['score'],effective:ScorePackage['score'],chunks:PracticeChunk[]) {
 contexts.set(plan,{original:facts(original),effective:facts(effective),patterns:new Map(chunks.map(c=>[c.id,c.pattern]))});
 for(const chunk of plan.chunks)chunk.pattern=personalPracticePattern(plan,chunk.start,chunk.end,contexts.get(plan)!.patterns.get(chunk.id)!);
}
/** Only hand content within the actual played/carry span changes claim meaning. */
export function personalPracticePattern(plan:PracticePassagePlan,start:number,end:number,base:string):string {
 const c=contexts.get(plan);if(!c)return base;
 const original=span(c.original,start,end),effective=span(c.effective,start,end);
 return JSON.stringify(original)===JSON.stringify(effective)?base:prefix+JSON.stringify({base,hands:effective});
}
/** Retain prior map claims as literal history without binding them to the current map. */
export function recognizesPersonalPracticeClaim(plan:PracticePassagePlan,chunk:PracticeChunk,pattern:string):boolean {
 const c=contexts.get(plan),base=chunk.components?`connected:${plan.revision}:${chunk.id}`:c?.patterns.get(chunk.id)??chunk.pattern;
 if(pattern===chunk.pattern||pattern===base)return true;
 if(!c||!pattern.startsWith(prefix))return false;
 try{
  const value=JSON.parse(pattern.slice(prefix.length)),owners=span(c.original,chunk.start,chunk.end);
  return value.base===base&&Array.isArray(value.hands)&&value.hands.length===owners.length&&value.hands.every((row:unknown,i:number)=>Array.isArray(row)&&row.length===5&&owners[i].slice(0,4).every((v,j)=>row[j]===v)&&(row[4]==='LH'||row[4]==='RH'));
 }catch{return false;}
}
