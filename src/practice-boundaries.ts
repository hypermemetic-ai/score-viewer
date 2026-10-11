import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';
import {BOUNDED_PRACTICE_POLICY as policy,boundedPracticePolicyFingerprint,distinctPracticeOnsets,estimatedPracticeSeconds} from './practice-sizing';

export type PracticeSectionSource=Pick<QuantizedGridScore,'notes'|'sourceBarTicks'|'totalTicks'|'ticksPerBeat'|'timeSignatures'|'barlines'|'phrases'|'sourceSilences'>;
export interface PracticeProtectedRelation {id:string;startTick:number;endTick:number}
export interface PracticeBoundaryEvidence {
 tick:number;kind:'bar'|'onset'|'edge';sectionCandidate:boolean;strength:number;reasons:string[];
 components:{recurrence:number;authored:number;rest:number;longNote:number;phrase:number;texture:number};
 obligations:string[];
}
export interface MusicalPracticeSection {
 start:number;end:number;firstBar:number;lastBar:number;onsetCount:number;estimatedSeconds:number;boundaryReasons:string[];
}
export interface PracticeSectionPlanning {
 policy:typeof policy;policyFingerprint:string;onsets:number[];boundaries:PracticeBoundaryEvidence[];sections:MusicalPracticeSection[];
}
interface Sound {start:number;end:number;pitch?:number;stream:string}
const lowerBound=(values:readonly number[],tick:number)=>{let a=0,b=values.length;while(a<b){const m=(a+b)>>>1;if(values[m]<tick)a=m+1;else b=m;}return a;};
const count=(onsets:readonly number[],start:number,end:number)=>lowerBound(onsets,end)-lowerBound(onsets,start);
const barAt=(bars:readonly number[],tick:number)=>Math.max(0,Math.min(bars.length-2,lowerBound(bars,tick+1)-1));
const median=(values:number[])=>{values.sort((a,b)=>a-b);return values[Math.floor(values.length/2)]??0;};

/** Source-only analysis; never derives fingering, changes pitch or edits score facts. */
export function planPracticeSections(source:PracticeSectionSource,options:{protectedRelations?:readonly PracticeProtectedRelation[]}={}):PracticeSectionPlanning {
 const bars=source.sourceBarTicks;
 if(!bars||bars.length<2||bars.length>policy.maximumSourceBars+1||bars[0]!==0||bars.at(-1)!==source.totalTicks||
  bars.some((b,i)=>!Number.isSafeInteger(b)||b<0||i>0&&b<=bars[i-1])||!Number.isSafeInteger(source.ticksPerBeat)||source.ticksPerBeat<=0)
  throw Error('Musical practice sections need a bounded complete written-measure map.');
 const onsets=distinctPracticeOnsets(source);
 if(onsets.some(t=>t>=source.totalTicks)||source.notes.some(n=>n.startTick+n.durationTicks>source.totalTicks))throw Error('Practice sizing event lies outside the written source.');
 const sounds:Sound[]=source.notes.map(n=>({start:n.startTick,end:n.startTick+n.durationTicks,
  pitch:n.eventKind==='unpitched'?undefined:n.pitch.octave*12+n.pitch.pitchClass,
  stream:String(n.voiceId??n.voice??n.hand??'voice')})).sort((a,b)=>a.start-b.start||(a.pitch??0)-(b.pitch??0)||a.stream.localeCompare(b.stream));
 const grouped=new Map<number,Sound[]>();for(const n of sounds){const group=grouped.get(n.start)??[];group.push(n);grouped.set(n.start,group);}
 const candidates=new Set(bars),barSet=new Set(bars);
 // Ordinary bars stay intact. An unusually busy bar admits actual onset cuts;
 // simultaneous attacks cannot be split because their tick occurs only once.
 for(let b=0;b<bars.length-1;b++)if(count(onsets,bars[b],bars[b+1])>policy.preferredMaxSeconds*policy.onsetsPerSecond)
  for(let i=lowerBound(onsets,bars[b]);i<onsets.length&&onsets[i]<bars[b+1];i++)candidates.add(onsets[i]);
 const boundaries=[...new Set([...candidates,...onsets])].sort((a,b)=>a-b).map(tick=>({tick,kind:tick===0||tick===source.totalTicks?'edge':barSet.has(tick)?'bar':'onset',sectionCandidate:candidates.has(tick),strength:0,reasons:[],
  components:{recurrence:0,authored:0,rest:0,longNote:0,phrase:0,texture:0},obligations:[]} as PracticeBoundaryEvidence));
 const byTick=new Map(boundaries.map(b=>[b.tick,b]));
 const add=(b:PracticeBoundaryEvidence,key:keyof PracticeBoundaryEvidence['components'],value:number,reason:string)=>{
  b.components[key]=Math.max(b.components[key],value);if(!b.reasons.includes(reason))b.reasons.push(reason);
 };
 addRecurrenceEvidence(bars,onsets,grouped,byTick,add);
 const notesById=new Map(source.notes.map(n=>[n.id,n]));
 const shortPhrases=(source.phrases??[]).filter(p=>barAt(bars,Math.max(p.startTick,p.endTick-1))-barAt(bars,p.startTick)<2||count(onsets,p.startTick,p.endTick)<=policy.minimumPatternOnsets);
 const protectedRelations=options.protectedRelations??[];
 if(protectedRelations.some(r=>!r.id||!Number.isSafeInteger(r.startTick)||!Number.isSafeInteger(r.endTick)||r.startTick<0||r.endTick<=r.startTick||r.endTick>source.totalTicks))throw Error('Practice boundary relation differs from its source.');
 const intervals=[...sounds.map(n=>({start:n.start,end:n.end,reason:`held:${n.start}:${n.pitch??'unpitched'}:${n.stream}`})),
  ...shortPhrases.map(p=>({start:p.startTick,end:p.endTick,reason:`phrase:${p.id}`})),
  ...protectedRelations.map(r=>({start:r.startTick,end:r.endTick,reason:`relation:${r.id}`}))].sort((a,b)=>a.start-b.start||a.reason.localeCompare(b.reason));
 const ending=[...intervals].sort((a,b)=>a.end-b.end||a.reason.localeCompare(b.reason)),active=new Set<typeof intervals[number]>();let entering=0,leaving=0,soundIndex=0,endBefore=0;
 const lines=new Map<number,string[]>();for(const l of source.barlines)if(l.type!=='regular'){const kinds=lines.get(l.tick)??[];kinds.push(l.type);lines.set(l.tick,kinds);}
 const meters=new Set(source.timeSignatures.map(m=>m.tick)),phraseEnds=new Map<number,string[]>();
 for(const p of source.phrases??[]){let end=p.endTick;for(const id of p.toNoteIds){const n=notesById.get(id);if(n)end=Math.max(end,n.startTick+n.durationTicks);}const ids=phraseEnds.get(end)??[];ids.push(p.id);phraseEnds.set(end,ids);}
 const rests=(source.sourceSilences??[]).filter(r=>r.kind==='rest').sort((a,b)=>a.startTick-b.startTick);let restIndex=0,restEnd=-1;
 for(const b of boundaries){
  while(entering<intervals.length&&intervals[entering].start<b.tick)active.add(intervals[entering++]);
  while(leaving<ending.length&&ending[leaving].end<=b.tick)active.delete(ending[leaving++]);
  while(soundIndex<sounds.length&&sounds[soundIndex].start<b.tick)endBefore=Math.max(endBefore,sounds[soundIndex++].end);
  while(restIndex<rests.length&&rests[restIndex].startTick<=b.tick){restEnd=Math.max(restEnd,rests[restIndex].startTick+rests[restIndex].durationTicks);restIndex++;}
  if(b.kind==='edge')continue;
  // Global sound occupancy, rather than a single voice's written rest/skip.
  for(const r of active){b.obligations.push(r.reason);if(b.obligations.length===24)break;}if(active.size>24)b.obligations.push(`additional-obligations:${active.size-24}`);
  if(lines.has(b.tick))add(b,'authored',policy.weights.authored,`authored:${lines.get(b.tick)!.sort().join('+')}`);
  if(meters.has(b.tick))add(b,'authored',policy.weights.authored,'authored:meter-change');
  const before=lowerBound(onsets,b.tick),previous=before?onsets[before-1]:undefined,next=onsets[before];
  const gap=next===undefined?0:next-endBefore;
  const realRest=restEnd>=b.tick;
  if(gap>=source.ticksPerBeat/2&&realRest&&!b.obligations.length)add(b,'rest',policy.weights.rest,'global-rest-gap');
  if(previous!==undefined&&next!==undefined&&!b.obligations.length){
   const local=onsets.slice(Math.max(0,before-7),Math.min(onsets.length,before+7)),intervals=local.slice(1).map((t,i)=>t-local[i]),usual=median(intervals);
   if(usual>0&&next-previous>=usual*2)add(b,'longNote',policy.weights.longNote,'long-onset-spacing');
  }
  for(const id of phraseEnds.get(b.tick)??[])add(b,'phrase',policy.weights.phrase,`phrase-end:${id}`);
  const texture=textureChange(onsets,grouped,before);if(texture)add(b,'texture',texture*policy.weights.texture,'sustained-pitch-texture-change');
 }
 for(const b of boundaries){b.strength=Math.min(policy.weights.maximumEvidence,Object.values(b.components).reduce((a,v)=>a+v,0));b.reasons.sort();b.obligations=[...new Set(b.obligations)].sort();}
 const cuts=partition(boundaries.filter(b=>b.sectionCandidate),onsets);
 const sections=cuts.slice(0,-1).map((start,i)=>{const end=cuts[i+1],n=count(onsets,start,end),boundary=byTick.get(end)!;
  return {start,end,firstBar:barAt(bars,start),lastBar:barAt(bars,end-1),onsetCount:n,estimatedSeconds:estimatedPracticeSeconds(n),boundaryReasons:[...boundary.reasons,...boundary.obligations.map(r=>`retained:${r}`)]};});
 return {policy,policyFingerprint:boundedPracticePolicyFingerprint,onsets,boundaries,sections};
}

function addRecurrenceEvidence(bars:readonly number[],onsets:number[],groups:Map<number,Sound[]>,boundaries:Map<number,PracticeBoundaryEvidence>,add:(b:PracticeBoundaryEvidence,key:'recurrence',value:number,reason:string)=>void){
 const patterns=new Map<string,{start:number;end:number;onsets:number;preceding:string}[]>();
 for(let first=0;first<bars.length-1;first++){
  const begin=lowerBound(onsets,bars[first]);
  for(let last=first+1;last<bars.length&&last<=first+policy.maximumPatternBars;last++){
   const finish=lowerBound(onsets,bars[last]),n=finish-begin;if(n>policy.maximumPatternOnsets)break;if(n<policy.minimumPatternOnsets)continue;
   const ticks=onsets.slice(begin,finish),firstSounds=groups.get(ticks[0])!,anchor=firstSounds.find(s=>s.pitch!==undefined)?.pitch??0;
   // One common transposition, exact timing, chord content and stream labels.
   // Exact serialized keys are indexed; there is no resident pairwise matrix.
   const signature=JSON.stringify([bars[last]-bars[first],ticks.map(t=>[t-bars[first],groups.get(t)!.map(s=>[s.pitch===undefined?'unpitched':s.pitch-anchor,s.end-s.start,s.stream])])]);
   const prior=first?onsets.slice(lowerBound(onsets,bars[first-1]),begin):[],preceding=first?JSON.stringify([bars[first]-bars[first-1],prior.map(t=>[t-bars[first],groups.get(t)!.map(s=>[s.pitch===undefined?'unpitched':s.pitch-anchor,s.end-s.start,s.stream])])]):'source-start';
   const occurrences=patterns.get(signature)??[];occurrences.push({start:bars[first],end:bars[last],onsets:n,preceding});patterns.set(signature,occurrences);
  }
 }
 for(const occurrences of patterns.values()){
  // Greedy nonoverlap is sufficient for equal-length occurrences and prevents
  // sliding copies of a tiny ostinato from accumulating artificial confidence.
  const independent:typeof occurrences=[];for(const o of occurrences)if(!independent.length||o.start>=independent.at(-1)!.end)independent.push(o);
  if(independent.length<2)continue;
  const n=occurrences[0].onsets,substance=Math.min(1,n/(policy.targetSeconds*policy.onsetsPerSecond)),frequency=1+Math.min(2,independent.length-2)*policy.weights.independentRecurrence;
  const preceding=new Map<string,number>();for(const o of occurrences)preceding.set(o.preceding,(preceding.get(o.preceding)??0)+1);
  for(const o of occurrences){
   // A repeated window whose preceding bar also repeats is a sliding part of
   // a larger trunk. It supplies little evidence for a new beginning here.
   const continuation=(preceding.get(o.preceding)??0)>1&&o.preceding!=='source-start',support=policy.weights.recurrence*substance*frequency*(continuation?policy.weights.continuingTrunk:1),b=boundaries.get(o.start);
   if(b)add(b,'recurrence',support,`repeated-pattern:${n}-onsets:${Math.min(3,independent.length)}-independent${continuation?':continuing-trunk':''}`);
  }
  // Ends of shared prefixes are intentionally not rewarded: they may be
  // divergence switches within a phrase rather than ordinary phrase endings.
 }
}

function textureChange(onsets:readonly number[],groups:Map<number,Sound[]>,index:number):number {
 if(index<12||onsets.length-index<12)return 0;
 const profile=(a:number,b:number)=>{const hist=Array<number>(12).fill(0),pitches:number[]=[],sizes:number[]=[];
  for(let i=a;i<b;i++){const notes=groups.get(onsets[i])!;sizes.push(notes.length);for(const n of notes)if(n.pitch!==undefined){hist[((n.pitch%12)+12)%12]++;pitches.push(n.pitch);}}
  const sum=hist.reduce((a,b)=>a+b,0);return {hist:hist.map(n=>sum?n/sum:0),register:median(pitches),size:median(sizes)};};
 const distance=(a:ReturnType<typeof profile>,b:ReturnType<typeof profile>)=>a.hist.reduce((s,n,i)=>s+Math.abs(n-b.hist[i]),0)/2;
 const a=profile(index-12,index-6),b=profile(index-6,index),c=profile(index,index+6),d=profile(index+6,index+12);
 const internal=Math.max(distance(a,b),distance(c,d)),cross=distance(b,c);
 const sustained=internal<=.25&&cross>=.65,register=Math.abs(b.register-c.register)>=12&&Math.abs(a.register-b.register)<5&&Math.abs(c.register-d.register)<5,
  texture=Math.abs(b.size-c.size)>=2&&a.size===b.size&&c.size===d.size;
 return sustained||register||texture?1:0;
}

function partition(boundaries:PracticeBoundaryEvidence[],onsets:number[]):number[]{
 const costs=Array<number>(boundaries.length).fill(Infinity),previous=Array<number>(boundaries.length).fill(-1),safety=Array<number>(boundaries.length).fill(Infinity),
  evidence=Array<number>(boundaries.length).fill(-Infinity),deviations=Array<number>(boundaries.length).fill(Infinity);costs[0]=0;safety[0]=0;evidence[0]=0;deviations[0]=0;
 const target=policy.targetSeconds*policy.onsetsPerSecond,min=policy.preferredMinSeconds*policy.onsetsPerSecond,max=policy.preferredMaxSeconds*policy.onsetsPerSecond;
 for(let end=1;end<boundaries.length;end++){
  const b=boundaries[end],terminal=end===boundaries.length-1;
  for(let start=end-1;start>=Math.max(0,end-policy.maximumLookbackCuts);start--){
   const n=count(onsets,boundaries[start].tick,b.tick);if(n>max*2)break;
   const deviation=(n-target)/target,outside=n<min?(min-n)/target:n>max?(n-max)/target:0;
   const tiny=n<min/2?policy.weights.tiny*((min/2-n)/(min/2))**2:0;
   const obligation=b.obligations.length?policy.weights.obligation:0,reward=terminal?0:policy.weights.boundaryReward*b.strength;
   const candidate=costs[start]+policy.weights.section+policy.weights.deviation*deviation**2+policy.weights.outside*outside**2+tiny+obligation-reward,
    risk=safety[start]+Number(b.obligations.length>0),support=evidence[start]+(terminal?0:b.strength),distance=deviations[start]+Math.abs(deviation);
   const tie=risk<safety[end]||risk===safety[end]&&(support>evidence[end]+1e-9||Math.abs(support-evidence[end])<1e-9&&(distance<deviations[end]-1e-9||Math.abs(distance-deviations[end])<1e-9&&start<previous[end]));
   if(candidate<costs[end]-1e-9||Math.abs(candidate-costs[end])<1e-9&&tie){costs[end]=candidate;previous[end]=start;safety[end]=risk;evidence[end]=support;deviations[end]=distance;}
  }
 }
 if(previous.at(-1)===-1)throw Error('No bounded musical section partition could be formed.');
 const cuts:number[]=[];for(let i=boundaries.length-1;i>=0;i=previous[i]){cuts.push(boundaries[i].tick);if(i===0)break;}return cuts.reverse();
}

/** Shared small-scale snap for cue/continuation. Callers constrain the interval
 * to the genuinely common trunk or current divergence episode. */
export function choosePracticeExcerptBoundary(profile:Pick<PracticeSectionPlanning,'onsets'|'boundaries'>,options:{anchor:number;lower:number;upper:number;targetOnsets?:number;direction:'before'|'after'}):number {
 const {anchor,lower,upper,direction}=options,target=options.targetOnsets??policy.cueSeconds*policy.onsetsPerSecond;
 if(!Number.isFinite(anchor)||!Number.isFinite(lower)||!Number.isFinite(upper)||lower>upper||anchor<lower||anchor>upper||!Number.isFinite(target)||target<=0)throw Error('Practice excerpt bounds differ from their source.');
 const candidates=[...new Set([lower,upper,...profile.boundaries.map(b=>b.tick),...profile.onsets])].filter(t=>t>=lower&&t<=upper&&(direction==='before'?t<=anchor:t>anchor));
 const byTick=new Map(profile.boundaries.map(b=>[b.tick,b]));
 const score=(tick:number)=>{const b=byTick.get(tick),n=direction==='before'?count(profile.onsets,tick,anchor):count(profile.onsets,anchor,tick);
  return Math.abs(n-target)/target+(b?.obligations.length?policy.weights.obligation:0)-Math.min(1,b?.strength??0)*policy.weights.excerptEvidence+(b?.kind==='bar'?0:policy.weights.excerptOnset);};
 candidates.sort((a,b)=>score(a)-score(b)||Math.abs(a-anchor)-Math.abs(b-anchor)||a-b);
 return candidates[0]??(direction==='before'?lower:upper);
}
