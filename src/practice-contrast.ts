import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';
import {BOUNDED_PRACTICE_POLICY as policy,boundedPracticePolicyFingerprint} from './practice-sizing';
import {choosePracticeExcerptBoundary,type PracticeSectionPlanning} from './practice-boundaries';
import type {PracticeSectionSimilarity,PracticeSimilaritySection} from './practice-similarity';

export type PracticeContrastSource=Pick<QuantizedGridScore,'notes'|'tieChains'|'sourceBarTicks'|'ticksPerBeat'|'timeSignatures'>;
export interface PracticeSourceClip {
 id:string;sectionId:string;start:number;end:number;firstBar:number;lastBar:number;
 /** Original owners only. No pitches, starts, durations or tie chains rewritten. */
 noteIds:string[];carryInNoteIds:string[];carryOutNoteIds:string[];tieNoteIds:string[];
 onsetCount:number;cueOnsetCount:number;continuationOnsetCount:number;
 divergenceTick:number;boundaryReasons:string[];
}
export interface PracticeContrastEpisode {
 id:string;originalIds:[string,string];episode:number;shift:number;similarity:number;
 /** Relative source positions, before any source-safe excerpt snapping. */
 divergenceStart:number;divergenceEnd:number;sharedTrunkStart:number;reconvergenceStart?:number;
 clips:[PracticeSourceClip,PracticeSourceClip];
}
export interface PracticeContrastOptions {
 sourceIdentity:string;
 profile:Pick<PracticeSectionPlanning,'onsets'|'boundaries'>;
 policyFingerprint?:string;
}
const reconvergenceOnsets=6;
const comparisonPolicy='constant-semitone-note-multiset-75-v1';
const episodePolicy='shared-trunk-six-onset-pulse-v1';
const sortedIds=(ids:Iterable<string>)=>[...ids].sort();
const count=(ticks:readonly number[],start:number,end:number)=>ticks.filter(t=>t>=start&&t<end).length;
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
const noteEnd=(n:PracticeContrastSource['notes'][number])=>n.startTick+n.durationTicks;

/** Meter-derived conducting beat, not the adjustable practice tempo. */
function pulseAt(source:PracticeContrastSource,tick:number):number {
 const meter=source.timeSignatures.findLast(m=>m.tick<=tick);
 if(!meter||!Number.isFinite(source.ticksPerBeat)||source.ticksPerBeat<=0)throw Error('Contrast needs source pulse context.');
 return source.ticksPerBeat*4/meter.denominator*(meter.denominator>=8&&meter.numerator>3&&meter.numerator%3===0?3:1);
}
function sourceClip(source:PracticeContrastSource,section:PracticeSimilaritySection,start:number,end:number,divergence:number,id:string,profile:PracticeContrastOptions['profile']):PracticeSourceClip {
 const bars=source.sourceBarTicks;
 if(!bars||bars.length<2)throw Error('Contrast clips need the actual source measure map.');
 const barAt=(tick:number)=>Math.max(0,Math.min(bars.length-2,bars.findIndex(t=>t>tick)-1));
 const notes=source.notes.filter(n=>n.startTick>=start&&n.startTick<end);
 const carryIn=source.notes.filter(n=>n.startTick<start&&noteEnd(n)>start);
 const carryOut=[...carryIn,...notes].filter(n=>noteEnd(n)>end);
 const ids=new Set([...notes,...carryIn].map(n=>n.id));
 const reasons=[start,end].flatMap(t=>profile.boundaries.find(b=>b.tick===t)?.reasons??[]);
 if(carryIn.length)reasons.push('source-carry-in');if(carryOut.length)reasons.push('source-carry-out');
 return {id,sectionId:section.id,start,end,firstBar:barAt(start),lastBar:barAt(Math.max(start,end-1)),
  noteIds:sortedIds(notes.map(n=>n.id)),carryInNoteIds:sortedIds(carryIn.map(n=>n.id)),carryOutNoteIds:sortedIds(carryOut.map(n=>n.id)),
  tieNoteIds:sortedIds((source.tieChains??[]).filter(t=>ids.has(t.noteId)).map(t=>t.noteId)),
  onsetCount:count(profile.onsets,start,end),cueOnsetCount:count(profile.onsets,start,divergence),continuationOnsetCount:count(profile.onsets,divergence,end),
  divergenceTick:divergence,boundaryReasons:[...new Set(reasons)]};
}

/** Qualifying originals only. A coincidental matching note is not a cut.
 * Matching requires the entire onset multiset (including all durations).
 * A later divergence after sustained reconvergence gets its own identity. */
export function practiceContrastEpisodes(source:PracticeContrastSource,pair:PracticeSectionSimilarity,options:PracticeContrastOptions):PracticeContrastEpisode[] {
 if(!pair.qualifies)return [];
 if(!options.sourceIdentity)throw Error('Contrast identity needs its source revision.');
 const lengths=[pair.a.end-pair.a.start,pair.b.end-pair.b.start],span=Math.max(...lengths);
 const byTick=new Map<number,{a:number;b:number;matches:number}>();
 const add=(tick:number,key:'a'|'b'|'matches')=>{const value=byTick.get(tick)??{a:0,b:0,matches:0};value[key]++;byTick.set(tick,value);};
 for(const n of source.notes){if(n.startTick>=pair.a.start&&n.startTick<pair.a.end)add(n.startTick-pair.a.start,'a');if(n.startTick>=pair.b.start&&n.startTick<pair.b.end)add(n.startTick-pair.b.start,'b');}
 for(const m of pair.matchingNotes)add(m.relativeTick,'matches');
 const ticks=[...byTick.keys()].sort((a,b)=>a-b);
 const shared=ticks.map(t=>{const n=byTick.get(t)!;return n.matches===n.a&&n.matches===n.b;});
 const result:PracticeContrastEpisode[]=[];
 let search=0,trunkStart=0;
 while(search<ticks.length){
  let first=search;while(first<ticks.length&&shared[first])first++;
  if(first===ticks.length)break;
  let reconvergence:number|undefined,next=ticks.length;
  for(let j=first+1;j<ticks.length;){
   if(!shared[j]){j++;continue;}
   let runEnd=j+1;while(runEnd<ticks.length&&shared[runEnd])runEnd++;
   const end=runEnd<ticks.length?ticks[runEnd]:Math.min(...lengths);
   const pulse=Math.max(pulseAt(source,pair.a.start+ticks[j]),pulseAt(source,pair.b.start+ticks[j]));
   if(runEnd-j>=reconvergenceOnsets&&end-ticks[j]>=pulse){reconvergence=ticks[j];next=runEnd;break;}
   j=runEnd;
  }
  const divergence=ticks[first],naturalEnd=reconvergence??span,episode=result.length;
  const identity=[options.sourceIdentity,options.policyFingerprint??boundedPracticePolicyFingerprint,comparisonPolicy,episodePolicy,pair.a.id,pair.b.id,episode,divergence,naturalEnd,pair.shift];
  const clipRanges=([pair.a,pair.b] as const).map((section,index)=>{
   const anchor=section.start+clamp(divergence,0,lengths[index]),lower=section.start+clamp(trunkStart,0,lengths[index]),upper=section.start+clamp(naturalEnd,0,lengths[index]);
   let start=lower===anchor?anchor:choosePracticeExcerptBoundary(options.profile,{anchor,lower,upper:anchor,targetOnsets:policy.cueSeconds*policy.onsetsPerSecond,direction:'before'});
   // A cue may not acquire an earlier divergent sounding owner merely by
   // snapping backward. Preserve that owner's real obligation at the anchor.
   const matchingIds=new Set(pair.matchingNotes.map(m=>index?m.bId:m.aId));
   for(const n of source.notes)if(n.startTick<section.start+trunkStart&&noteEnd(n)>start&&!matchingIds.has(n.id))start=Math.min(anchor,Math.max(start,noteEnd(n)));
   let end=upper===anchor?anchor:choosePracticeExcerptBoundary(options.profile,{anchor,lower:anchor,upper,targetOnsets:policy.continuationSeconds*policy.onsetsPerSecond,direction:'after'});
   // Do not truncate an obligation when it can finish inside this episode.
   // Obligations crossing a reconvergence/section edge stay explicit carry.
   let changed=true;while(changed){changed=false;for(const n of source.notes)if(n.startTick>=start&&n.startTick<end&&noteEnd(n)>end&&noteEnd(n)<=upper){end=noteEnd(n);changed=true;}}
   return {section,start,end,anchor};
  });
  if(clipRanges.some(c=>c.end<=c.start))throw Error('Contrast episode has no available source span for an alternative.');
  const id=`contrast:${JSON.stringify([...identity,...clipRanges.map(c=>[c.start,c.end])])}`;
  const clips=clipRanges.map((c,index)=>sourceClip(source,c.section,c.start,c.end,c.anchor,`${id}:${index?'B':'A'}`,options.profile)) as [PracticeSourceClip,PracticeSourceClip];
  result.push({id,originalIds:[pair.a.id,pair.b.id],episode,shift:pair.shift,similarity:pair.similarity,divergenceStart:divergence,divergenceEnd:naturalEnd,sharedTrunkStart:trunkStart,reconvergenceStart:reconvergence,clips});
  if(reconvergence===undefined)break;
  trunkStart=reconvergence;search=next;
 }
 return result;
}
