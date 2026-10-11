import {validateInstrumentReadingScore,validateSourceWrittenComponents,isPitchedEvent} from '../vendor/iso-notation/src/score-presentation';
import {requireReferencePerformanceTempo,validateReferencePerformanceTempo,type ReferencePerformanceTempo} from '../vendor/iso-notation/src/model/reference-performance-tempo';
import type {ScorePackage} from './package';
import {canonicalJson,identityHash} from './piano-preparation-identity';
import {scorePulseGrid,sourceBarPhaseTicks} from './score-clock';
import {registerPracticePatterns} from './practice-equivalence';
import {populatePracticeCatalog,practiceSectionId,type PracticeChunk,type PracticePartition,type PracticePassagePlan} from './practice';
import {planPracticeSections} from './practice-boundaries';
import {boundedPracticePolicyFingerprint} from './practice-sizing';

/** A historical reading head proves its admitted appearance and clock, not a
 * sourceEventId omitted by the old MusicXML tie projection. */
export interface ManualWrittenComponent {
 id:string;ownerId?:string;silenceId?:string;kind:'pitched'|'unpitched'|'rest'|'skip';
 partId:string;staffId:string;voiceId:string;bar:number;tick:number;durationTicks:number;
 provenance:{kind:'retained-reading-head-v1';headId:string}|{kind:'retained-source-silence-v1';sourceSilenceId?:string}|
  {kind:'retained-source-written-component-v1';sourceEventId:string};
}
export interface ManualMusicalOwner {
 id:string;kind:'pitched'|'unpitched';partId:string;staffId:string;voiceId:string;
 tick:number;end:number;bar:number;
}
export interface ManualPracticePlan extends PracticePassagePlan {
 version:'manual-practice-plan-v1';assessment:'manual';partId:string;sourceId:string;
 /** A separately chosen clock binds attainment while reading retains source identity. */
 sourceMusicalRevision?:string;
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

function sourceBars(p:Pick<ScorePackage,'score'>):number[] {
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
export async function planManualPractice(input:ScorePackage,partition:PracticePartition='bounded-exercises-v1',fallbackReference?:ReferencePerformanceTempo):Promise<ManualPracticePlan> {
 // Caller-owned packages may change while WebCrypto settles. Capture every
 // consumed source/admission/appearance field together, before any await, so
 // returned clocks and components have the same meaning as their digest.
 const snapshot=structuredClone({package:{manifest:input.manifest,score:input.score,reading:input.reading,seats:input.seats,pages:input.pages},fallbackReference}),p=snapshot.package;
 if(p.manifest.version!==3||!p.reading||!p.reading.geometryEvidence.ok||p.seats.length||!p.pages.length)
  throw Error('Manual instrument practice needs admitted musical reading notation.');
 validateInstrumentReadingScore(p.score);
 if(p.score.graceGroups?.length)throw Error('Timed practice needs performed timing for grace notes; the score remains available for reading.');
 if(partition!=='fixed-four-v1'&&partition!=='connection-boundary-v1'&&partition!=='bounded-exercises-v1')throw Error('Unsupported musical practice partition.');
 const separateReference=p.score.referencePerformanceTempo===undefined,
  reference=separateReference&&snapshot.fallbackReference!==undefined?validateReferencePerformanceTempo(snapshot.fallbackReference):requireReferencePerformanceTempo(p.score),
  bars=sourceBars(p),partId=p.score.readingPolicy!.partId,
  byOwner=new Map(p.reading.owners.map(owner=>[owner.id,owner]));
 if(byOwner.size!==p.score.notes.length||p.reading.owners.length!==p.score.notes.length)
  throw Error('Manual practice has incomplete musical ownership.');
 const owners:ManualMusicalOwner[]=[],components:ManualWrittenComponent[]=[];
 const dual=p.reading.dual,scene=dual?.views[dual.notation]?.scene;
 if(dual){
  validateSourceWrittenComponents(p.score);
  if(!scene||dual.sourcePartId!==partId||scene.sourcePartId!==partId||scene.sourceStaffId!==dual.sourceStaffId||
    scene.view!==dual.notation||scene.components.length!==p.score.sourceWrittenComponents!.components.length||
    new Set(scene.components.map(c=>c.sourceEventId)).size!==scene.components.length||
    JSON.stringify(p.pages)!==JSON.stringify(dual.views[dual.notation].pages))throw Error('Manual dual presentation differs from its source.');
 }
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
     !Number.isSafeInteger(head.system)||head.system<0||!dual&&head.system>=p.reading.layoutMetadata.length||
     !Number.isFinite(head.x)||!Number.isFinite(head.y)||!Number.isSafeInteger(head.tick)||
     !Number.isSafeInteger(head.durationTicks)||head.durationTicks<=0||head.tick<event.startTick||
     head.tick+head.durationTicks>event.startTick+event.durationTicks)
    throw Error('Manual practice has invalid written appearances.');
   const layout=p.reading.layoutMetadata[head.system],appearance=scene?.components.find(c=>c.ownerIds.includes(event.id)&&
    c.tick===head.tick&&c.durationTicks===head.durationTicks&&c.page===head.page&&c.system===head.system&&c.anchor.x===head.x&&c.anchor.y===head.y);
   if(dual?!appearance:layout.system!==head.system||layout.page!==head.page||!layout.notes.some(note=>note.id===head.id&&note.x===head.x&&note.y===head.y))
    throw Error('Manual practice written appearance differs from its admitted scene.');
   const key=canonicalJson([event.id,head.tick,head.durationTicks]);
   if(!expected.has(key))throw Error('Manual practice written clock differs from its source component.');
   if(distinct.has(key))continue;distinct.add(key);
   if(components.length>=100000)throw Error('Manual practice exceeds its written-component bound.');
   if(!dual)components.push({id:`retained-written-value:${key}`,ownerId:event.id,kind:event.eventKind,partId,
    staffId:event.staffId!,voiceId:event.voiceId!,bar:barAt(bars,head.tick),tick:head.tick,durationTicks:head.durationTicks,
    provenance:{kind:'retained-reading-head-v1',headId:head.id}});
  }
  if(distinct.size!==expected.size)throw Error('Manual practice has incomplete written source components.');
 }
 const silenceIds=new Set<string>();
 if(dual)for(const component of p.score.sourceWrittenComponents!.components){
  const a=scene!.components.find(c=>c.sourceEventId===component.sourceEventId),bar=scene!.bars.find(b=>b.writtenBar===component.writtenBar);
  if(!a||!bar||a.eventKind!==component.eventKind||a.writtenBar!==component.writtenBar||a.tick!==component.tick||
    a.durationTicks!==component.durationTicks||a.page!==bar.page||a.system!==bar.system||bar.startTick!==bars[component.writtenBar]||
    bar.endTick!==bars[component.writtenBar+1]||JSON.stringify(a.ownerIds)!==JSON.stringify(component.ownerId?[component.ownerId]:[])||
    a.silenceId!==component.silenceId||!a.inkIds.length||a.inkIds.some(id=>typeof id!=='string'||!id)||
    ![a.bounds.x0,a.bounds.y0,a.bounds.x1,a.bounds.y1].every(Number.isFinite)||a.bounds.x1<=a.bounds.x0||a.bounds.y1<=a.bounds.y0)
   throw Error('Manual source-written component differs from its admitted scene.');
  components.push({id:component.sourceEventId,ownerId:component.ownerId,silenceId:component.silenceId,kind:component.eventKind,
   partId:component.partId,staffId:component.staffId,voiceId:component.voiceId,bar:component.writtenBar,tick:component.tick,durationTicks:component.durationTicks,
   provenance:{kind:'retained-source-written-component-v1',sourceEventId:component.sourceEventId}});
 }
 else for(const rest of p.score.sourceSilences??[]){
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
 const sourceMusicalRevision=await identityHash({version:'musical-manual-practice-v1',partId,partition:partition==='bounded-exercises-v1'?'connection-boundary-v1':partition,source:manualMusicalFacts(p)}),
  revision=partition==='bounded-exercises-v1'?await identityHash({version:'bounded-manual-practice-v1',sourceMusicalRevision,policyFingerprint:boundedPracticePolicyFingerprint,referencePerformanceTempo:reference}):separateReference?await identityHash({version:'manual-reference-practice-v1',sourceMusicalRevision,referencePerformanceTempo:reference}):sourceMusicalRevision,
  occurrences=p.score.writtenPresentation?.occurrences??[],weights=bars.slice(0,-1).map((_,bar)=>Math.max(1,occurrences.filter(o=>o.writtenBar===bar+1).length));
 const protectedAt=(cut:number)=>{
  const tick=bars[cut],reasons=owners.filter(owner=>owner.tick<tick&&owner.end>tick).map(owner=>`held:${owner.id}`);
  for(const phrase of p.score.phrases??[]){if(phrase.startTick<tick&&phrase.endTick>tick&&barAt(bars,Math.max(phrase.startTick,phrase.endTick-1e-7))-barAt(bars,phrase.startTick)<2)reasons.push(`phrase:${phrase.id}`);}
  for(const relation of p.score.techniques??[]){if(relation.fromTick<tick&&relation.toTick>=tick)reasons.push(`technique:${relation.id}`);}
  return reasons;
 };
 const chunks:PracticeChunk[]=[];
 const boundaryProfile=partition==='bounded-exercises-v1'?planPracticeSections(p.score,{protectedRelations:(p.score.techniques??[]).map(r=>({id:r.id,startTick:r.fromTick,endTick:Math.min(p.score.totalTicks,r.toTick+1)}))}):undefined;
 if(boundaryProfile)for(const section of boundaryProfile.sections){
  const {start,end,firstBar,lastBar}=section,selected=components.filter(c=>c.tick>=start&&c.tick<end),carry=owners.filter(o=>o.tick<start&&o.end>start),
   pattern=canonicalJson({version:'bounded-manual-passage-v1',revision,policyFingerprint:boundedPracticePolicyFingerprint,length:end-start,components:selected.map(c=>[c.ownerId??c.silenceId,c.kind,c.tick-start,c.durationTicks,c.staffId,c.voiceId]),...(carry.length?{carry:carry.map(o=>[o.id,o.tick-start,o.end-start])}:{})});
  chunks.push({...section,id:practiceSectionId(section,bars),weight:1,kind:'section',pattern});
 }
 for(let first=0;!boundaryProfile&&first<bars.length-1;){
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
  ...(separateReference||partition==='bounded-exercises-v1'?{sourceMusicalRevision}:{}),
  timeSignatures:structuredClone(p.score.timeSignatures),barPhaseTicks:sourceBarPhaseTicks(p.score,bars),
  referencePerformanceTempo:structuredClone(reference),barTicks:bars,ticksPerBeat:p.score.ticksPerBeat,chunks,owners,components};
 if(boundaryProfile){plan.boundaryProfile=boundaryProfile;plan.policyFingerprint=boundedPracticePolicyFingerprint;populatePracticeCatalog(plan,p.score);
  const frozenInput={...input,...p} as ScorePackage,[fixed,connection]=await Promise.all([planManualPractice(frozenInput,'fixed-four-v1',reference),planManualPractice(frozenInput,'connection-boundary-v1',reference)]);plan.legacyPlans={'fixed-four-v1':fixed,'connection-boundary-v1':connection};}
 scorePulseGrid(plan,bars);registerPracticePatterns(plan,p.score,'manual');return plan;
}
