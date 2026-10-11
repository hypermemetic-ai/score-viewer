import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';

/** These are original occurrences, never connections or sliding windows. */
export interface PracticeSimilaritySection {id:string;start:number;end:number;firstBar?:number;lastBar?:number}
export type PracticeSimilaritySource=Pick<QuantizedGridScore,'notes'>;
export interface PracticeNoteMatch {aId:string;bId:string;relativeTick:number;durationTicks:number}
export interface PracticeSectionSimilarity {
 a:PracticeSimilaritySection;b:PracticeSimilaritySection;
 /** Add this constant to A for comparison with B; playback is never shifted. */
 shift:number;matches:number;denominator:number;similarity:number;qualifies:boolean;
 matchingNotes:PracticeNoteMatch[];
}
interface Event {id:string;tick:number;duration:number;pitch:number}
interface IndexedSection {section:PracticeSimilaritySection;events:Event[];slots:Map<string,Map<number,Event[]>>}
const slotKey=(tick:number,duration:number)=>`${tick}:${duration}`;
const compareIds=(a:string,b:string)=>a<b?-1:a>b?1:0;

function validateSection(section:PracticeSimilaritySection):void {
 if(!section.id||!Number.isSafeInteger(section.start)||!Number.isSafeInteger(section.end)||section.start<0||section.end<=section.start)
  throw Error('Similarity needs an identified original source range.');
}
function indexSection(source:PracticeSimilaritySource,section:PracticeSimilaritySection):IndexedSection {
 validateSection(section);
 const events:Event[]=[],slots=new Map<string,Map<number,Event[]>>();
 for(const n of source.notes){
  if(n.startTick<section.start||n.startTick>=section.end)continue;
  if(n.eventKind==='unpitched')throw Error('Section similarity needs actual pitched note events.');
  const pitch=n.pitch.octave*12+n.pitch.pitchClass;
  if(!Number.isSafeInteger(n.startTick)||!Number.isSafeInteger(n.durationTicks)||n.durationTicks<=0||!Number.isSafeInteger(pitch))
   throw Error('Section similarity needs exact source timing and pitches.');
  const event={id:n.id,tick:n.startTick-section.start,duration:n.durationTicks,pitch};events.push(event);
  const key=slotKey(event.tick,event.duration),slot=slots.get(key)??new Map<number,Event[]>(),notes=slot.get(pitch)??[];
  notes.push(event);slot.set(pitch,notes);slots.set(key,slot);
 }
 events.sort((a,b)=>a.tick-b.tick||a.duration-b.duration||a.pitch-b.pitch||compareIds(a.id,b.id));
 for(const slot of slots.values())for(const notes of slot.values())notes.sort((a,b)=>compareIds(a.id,b.id));
 return {section,events,slots};
}
function compareIndexed(a:IndexedSection,b:IndexedSection):PracticeSectionSimilarity {
 // Each same-time/same-duration pitch pair contributes to exactly one shift.
 // min multiplicity, rather than the Cartesian product, preserves ownership.
 const scores=new Map<number,number>([[0,0]]);
 for(const [key,left] of a.slots){const right=b.slots.get(key);if(!right)continue;
  for(const [ap,an] of left)for(const [bp,bn] of right){const shift=bp-ap;scores.set(shift,(scores.get(shift)??0)+Math.min(an.length,bn.length));}
 }
 let shift=0,matches=0;
 for(const [candidate,score] of scores)if(score>matches||score===matches&&(Math.abs(candidate)<Math.abs(shift)||Math.abs(candidate)===Math.abs(shift)&&candidate<shift)){shift=candidate;matches=score;}
 const matchingNotes:PracticeNoteMatch[]=[];
 for(const [key,left] of a.slots){const right=b.slots.get(key);if(!right)continue;
  for(const [pitch,an] of left){const bn=right.get(pitch+shift)??[];
   for(let i=0;i<Math.min(an.length,bn.length);i++)matchingNotes.push({aId:an[i].id,bId:bn[i].id,relativeTick:an[i].tick,durationTicks:an[i].duration});
  }
 }
 matchingNotes.sort((a,b)=>a.relativeTick-b.relativeTick||a.durationTicks-b.durationTicks||compareIds(a.aId,b.aId));
 const denominator=Math.max(a.events.length,b.events.length),similarity=denominator?matches/denominator:0;
 return {a:a.section,b:b.section,shift,matches,denominator,similarity,qualifies:denominator>0&&matches*4>=denominator*3&&matches<denominator,matchingNotes};
}
/** Note durations are canonical sounding durations, not clipped to the range.
 * Hands, fingerings and spelling do not participate in this discovery metric. */
export function comparePracticeSections(source:PracticeSimilaritySource,a:PracticeSimilaritySection,b:PracticeSimilaritySection):PracticeSectionSimilarity {
 if(a.id===b.id||a.start<b.end&&b.start<a.end)throw Error('Similarity compares distinct nonoverlapping original sections.');
 return compareIndexed(indexSection(source,a),indexSection(source,b));
}
/** Sparse timing-slot postings bound candidate work without a resident dense
 * all-note/all-section similarity matrix. No completion evidence is consumed. */
export function practiceSimilarityPairs(source:PracticeSimilaritySource,originals:readonly PracticeSimilaritySection[]):PracticeSectionSimilarity[] {
 if(source.notes.length>100000||originals.length>2000)throw Error('Section similarity exceeds its admitted source bound.');
 const ordered=[...originals].sort((a,b)=>a.start-b.start||compareIds(a.id,b.id));
 ordered.forEach(validateSection);
 if(new Set(ordered.map(s=>s.id)).size!==ordered.length||ordered.some((s,i)=>i>0&&s.start<ordered[i-1].end))throw Error('Similarity originals overlap or reuse an occurrence identity.');
 const buckets=ordered.map(()=>[] as QuantizedGridScore['notes']);
 for(const n of source.notes){let lo=0,hi=ordered.length;while(lo<hi){const m=(lo+hi)>>>1;if(ordered[m].start<=n.startTick)lo=m+1;else hi=m;}
  const i=lo-1;if(i>=0&&n.startTick<ordered[i].end)buckets[i].push(n);
 }
 // Unpitched sections are valid originals but have no semitone comparison.
 const indexed=ordered.map((s,i)=>buckets[i].some(n=>n.eventKind==='unpitched')?undefined:indexSection({notes:buckets[i]},s));
 const postings=new Map<string,Array<{index:number;count:number}>>();
 indexed.forEach((section,index)=>{if(!section)return;for(const [key,slot] of section.slots){const list=postings.get(key)??[];list.push({index,count:[...slot.values()].reduce((sum,notes)=>sum+notes.length,0)});postings.set(key,list);}});
 const result:PracticeSectionSimilarity[]=[];
 indexed.forEach((a,i)=>{if(!a?.events.length)return;const possible=new Map<number,number>();
  for(const [key,slot] of a.slots){const count=[...slot.values()].reduce((sum,notes)=>sum+notes.length,0);
   for(const p of postings.get(key)??[])if(p.index>i)possible.set(p.index,(possible.get(p.index)??0)+Math.min(count,p.count));
  }
  for(const [j,maximum] of [...possible].sort((a,b)=>a[0]-b[0])){const b=indexed[j]!;
   const denominator=Math.max(a.events.length,b.events.length);
   if(maximum*4<denominator*3)continue;
   const pair=compareIndexed(a,b);if(pair.qualifies)result.push(pair);
  }
 });
 return result;
}
