import {validateInstrumentReadingScore,isPitchedEvent} from '../vendor/iso-notation/src/score-presentation';
import {requireReferencePerformanceTempo} from '../vendor/iso-notation/src/model/reference-performance-tempo';
import type {ScorePackage} from './package';
import {canonicalJson,identityHash} from './piano-preparation-identity';
import {scorePulseGrid,sourceBarPhaseTicks} from './score-clock';
import type {PracticeChunk,PracticePartition,PracticePassagePlan} from './practice';

/** A historical reading head proves its admitted appearance and clock, not a
 * sourceEventId omitted by the old MusicXML tie projection. */
export interface ManualWrittenComponent {
 id:string;ownerId?:string;silenceId?:string;kind:'pitched'|'unpitched'|'rest'|'skip';
 partId:string;staffId:string;voiceId:string;bar:number;tick:number;durationTicks:number;
 provenance:{kind:'retained-reading-head-v1';headId:string}|{kind:'retained-source-silence-v1';sourceSilenceId?:string};
}
export interface ManualMusicalOwner {
 id:string;kind:'pitched'|'unpitched';partId:string;staffId:string;voiceId:string;
 tick:number;end:number;bar:number;
}
export interface ManualPracticePlan extends PracticePassagePlan {
 version:'manual-practice-plan-v1';assessment:'manual';partId:string;sourceId:string;
 owners:ManualMusicalOwner[];components:ManualWrittenComponent[];
}

/** Source display policy, metadata and a derived pose do not define musical
 * attainment. Everything else, including unknown future semantic fields,
 * remains in the digest rather than being silently discarded. */
export function manualMusicalFacts(p:Pick<ScorePackage,'score'>):Record<string,unknown> {
 const source=structuredClone(p.score) as unknown as Record<string,unknown>;
 for(const key of ['title','composer','readingPolicy','readingPresentation','productionLayout'])delete source[key];
 for(const event of source.notes as Record<string,unknown>[])delete event.displayStemDirection;
 return source;
}

function sourceBars(p:ScorePackage):number[] {
 const bars=p.score.sourceBarTicks;
 if(!bars||bars.length<2||bars.length>2001||bars[0]!==0||bars.at(-1)!==p.score.totalTicks||
   bars.some((b,i)=>!Number.isSafeInteger(b)||b<0||i>0&&b<=bars[i-1]))
  throw Error('Manual practice needs a complete written-measure map.');
 return [...bars];
}
function barAt(bars:readonly number[],tick:number):number {
 let first=0,last=bars.length-1;
 while(first+1<last){const middle=(first+last)>>>1;if(bars[middle]<=tick)first=middle;else last=middle;}
 return first;
}

/** Consumes the actual strict reading result. It never substitutes seats or
 * guesses omitted source physical positions. New dual-view source contracts
 * will supply exact source-written component IDs through their own adapter. */
export async function planManualPractice(p:ScorePackage,partition:PracticePartition='connection-boundary-v1'):Promise<ManualPracticePlan> {
 if(p.manifest.version!==3||!p.reading||!p.reading.geometryEvidence.ok||p.seats.length||!p.pages.length)
  throw Error('Manual instrument practice needs admitted musical reading notation.');
 validateInstrumentReadingScore(p.score);
 if(p.score.graceGroups?.length)throw Error('Timed practice needs performed timing for grace notes; the score remains available for reading.');
 if(partition!=='fixed-four-v1'&&partition!=='connection-boundary-v1')throw Error('Unsupported musical practice partition.');
 const bars=sourceBars(p),partId=p.score.readingPolicy!.partId,reference=requireReferencePerformanceTempo(p.score),
  byOwner=new Map(p.reading.owners.map(owner=>[owner.id,owner]));
 if(byOwner.size!==p.score.notes.length||p.reading.owners.length!==p.score.notes.length)
  throw Error('Manual practice has incomplete musical ownership.');
 const owners:ManualMusicalOwner[]=[],components:ManualWrittenComponent[]=[];
 const chains=new Map((p.score.tieChains??[]).map(chain=>[chain.noteId,chain]));
 for(const event of p.score.notes){
  const owner=byOwner.get(event.id),coordinate=isPitchedEvent(event)?event.pitch:event.referencePitch,
   pitch=coordinate.octave*12+coordinate.pitchClass;
  if(!owner||owner.eventKind!==event.eventKind||owner.partId!==event.partId||owner.staffId!==event.staffId||owner.voiceId!==event.voiceId||
    owner.startTick!==event.startTick||owner.durationTicks!==event.durationTicks||!owner.heads.length||owner.heads.length>2001||
    (isPitchedEvent(event)?owner.pitch!==pitch:owner.referencePitch!==pitch||owner.soundingPitch!==null))
   throw Error('Manual practice ownership differs from its source.');
  owners.push({id:event.id,kind:event.eventKind,partId,staffId:event.staffId!,voiceId:event.voiceId!,
   tick:event.startTick,end:event.startTick+event.durationTicks,bar:barAt(bars,event.startTick)});
  const expected=new Set((chains.get(event.id)?.components??[{startTick:event.startTick,durationTicks:event.durationTicks}])
   .map(component=>canonicalJson([event.id,component.startTick,component.durationTicks]))),distinct=new Set<string>();
  for(const head of owner.heads){
   if(!head.id||!Number.isSafeInteger(head.page)||head.page<0||head.page>=p.pages.length||
     !Number.isSafeInteger(head.system)||head.system<0||head.system>=p.reading.layoutMetadata.length||
     !Number.isFinite(head.x)||!Number.isFinite(head.y)||!Number.isSafeInteger(head.tick)||
     !Number.isSafeInteger(head.durationTicks)||head.durationTicks<=0||head.tick<event.startTick||
     head.tick+head.durationTicks>event.startTick+event.durationTicks)
    throw Error('Manual practice has invalid written appearances.');
   const layout=p.reading.layoutMetadata[head.system];
   if(layout.system!==head.system||layout.page!==head.page||!layout.notes.some(note=>note.id===head.id&&note.x===head.x&&note.y===head.y))
    throw Error('Manual practice written appearance differs from its admitted scene.');
   const key=canonicalJson([event.id,head.tick,head.durationTicks]);
   if(!expected.has(key))throw Error('Manual practice written clock differs from its source component.');
   if(distinct.has(key))continue;distinct.add(key);
   if(components.length>=100000)throw Error('Manual practice exceeds its written-component bound.');
   components.push({id:`retained-written-value:${key}`,ownerId:event.id,kind:event.eventKind,partId,
    staffId:event.staffId!,voiceId:event.voiceId!,bar:barAt(bars,head.tick),tick:head.tick,durationTicks:head.durationTicks,
    provenance:{kind:'retained-reading-head-v1',headId:head.id}});
  }
  if(distinct.size!==expected.size)throw Error('Manual practice has incomplete written source components.');
 }
 const silenceIds=new Set<string>();
 for(const rest of p.score.sourceSilences??[]){
  if(rest.partId!==partId||!rest.voice||!rest.staff)throw Error('Manual practice rest needs genuine source part, staff and voice ownership.');
  const bar=barAt(bars,rest.startTick),staffId=rest.staff.startsWith(partId+':')?rest.staff.slice(partId.length+1):rest.staff,
   silenceId=rest.id??`retained-silence:${canonicalJson(rest)}`;
  if(silenceIds.has(silenceId))throw Error('Manual practice has ambiguous source silence identity.');
  silenceIds.add(silenceId);
  if(components.length>=100000)throw Error('Manual practice exceeds its written-component bound.');
  components.push({id:`retained-source-silence:${silenceId}`,silenceId,kind:rest.kind,partId,staffId,
   voiceId:rest.voice,bar,tick:rest.startTick,durationTicks:rest.durationTicks,
   provenance:{kind:'retained-source-silence-v1',...(rest.id?{sourceSilenceId:rest.id}:{})}});
 }
 owners.sort((a,b)=>a.tick-b.tick||a.id.localeCompare(b.id));
 components.sort((a,b)=>a.tick-b.tick||a.id.localeCompare(b.id));
 const revision=await identityHash({version:'musical-manual-practice-v1',partId,partition,source:manualMusicalFacts(p)}),
  occurrences=p.score.writtenPresentation?.occurrences??[],weights=bars.slice(0,-1).map((_,bar)=>Math.max(1,occurrences.filter(o=>o.writtenBar===bar+1).length));
 const protectedAt=(cut:number)=>{
  const tick=bars[cut],reasons=owners.filter(owner=>owner.tick<tick&&owner.end>tick).map(owner=>`held:${owner.id}`);
  for(const phrase of p.score.phrases??[]){if(phrase.startTick<tick&&phrase.endTick>tick&&barAt(bars,Math.max(phrase.startTick,phrase.endTick-1e-7))-barAt(bars,phrase.startTick)<2)reasons.push(`phrase:${phrase.id}`);}
  for(const relation of p.score.techniques??[]){if(relation.fromTick<tick&&relation.toTick>=tick)reasons.push(`technique:${relation.id}`);}
  return reasons;
 };
 const chunks:PracticeChunk[]=[];
 for(let first=0;first<bars.length-1;){
  const total=bars.length-1,nominal=Math.min(first+4,total);let cut=nominal;
  if(partition==='connection-boundary-v1'&&nominal<total){
   const candidates=[nominal,nominal-1,nominal+1].filter(c=>c>first&&c<=total&&c-first>=3&&c-first<=5);
   candidates.sort((a,b)=>Number(protectedAt(a).length>0)-Number(protectedAt(b).length>0)||Number(total-a===1)-Number(total-b===1)||Math.abs(a-nominal)-Math.abs(b-nominal)||b-a);cut=candidates[0];
  }
  const start=bars[first],end=bars[cut],selected=components.filter(c=>c.tick>=start&&c.tick<end),carry=owners.filter(o=>o.tick<start&&o.end>start);
  const pattern=canonicalJson({version:'manual-passage-v1',revision,length:end-start,
   components:selected.map(c=>[c.ownerId??c.silenceId,c.kind,c.tick-start,c.durationTicks,c.staffId,c.voiceId]),
   ...(carry.length?{carry:carry.map(o=>[o.id,o.tick-start,o.end-start])}:{})});
  chunks.push({id:`${first+1}-${cut}`,firstBar:first,lastBar:cut-1,start,end,
   weight:weights.slice(first,cut).reduce((sum,w,i)=>sum+w*(bars[first+i+1]-bars[first+i]),0),pattern,boundaryReasons:protectedAt(cut)});
  first=cut;
 }
 const plan:ManualPracticePlan={version:'manual-practice-plan-v1',assessment:'manual',sourceId:p.score.id,partId,partition,revision,
  timeSignatures:structuredClone(p.score.timeSignatures),barPhaseTicks:sourceBarPhaseTicks(p.score,bars),
  referencePerformanceTempo:structuredClone(reference),barTicks:bars,ticksPerBeat:p.score.ticksPerBeat,chunks,owners,components};
 scorePulseGrid(plan,bars);return plan;
}
