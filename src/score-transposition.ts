import {capturedReadingExecution,checkReadingExecution,type ReadingExecution} from './reading-execution';
import {strFromU8,strToU8,unzipSync} from 'fflate';
import type {QuantizedGridScore,PitchCoordinate,Hand} from '../vendor/iso-notation/src/model/types';
import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';
import {hashBytes,importPackage,type ScorePackage} from './package';
import {CALCULATED_HAND_SCORE_RENDERING_ENGINE,renderScorePresentationAsync} from '../vendor/iso-notation/src/score-presentation';
import {APPROVED_SCORE_RENDERING_ENGINE,SCORE_RENDERING_RECIPE_VERSION,validateScoreRenderingRecipe} from '../vendor/iso-notation/src/render/iso/score-rendering-recipe';
import {approvedProductionIsoOptions} from '../vendor/iso-notation/src/render/iso/approved-production';
import {resolveIsoTokens} from '../vendor/iso-notation/src/render/iso/types';
import {scoreWithCalculationContext,validatePianoCalculationContext} from '../vendor/iso-notation/src/model/piano-calculation-context';
import {archivePackage,handDigest,type Manifest} from './package';
import {publishPackage} from './publication';
import {requirePitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import {serializeCompatibleScore} from './score-serialization';
import {requirePianoEvent} from './piano-event';
import {requirePianoCapability} from './score-capabilities';
import {canonicalJson,identityHash} from './piano-preparation-identity';

export const SCORE_TRANSPOSITION_VERSION='viewer-score-transposition-v1' as const;
export interface TranspositionOwner {id:string;pitch:number;startTick:number;durationTicks:number;hand:Hand}
export interface ScoreTransposition {
 version:typeof SCORE_TRANSPOSITION_VERSION;originalArchive:string;originalArchiveSha256:string;baselineLayout:PhysicalKeyboardId;
 originalSourceSha256:string;selectedEditionSha256:string;steps:number;effectiveSourceSha256:string;
 /** Viewer selection authority, not a composer instruction or movement certificate. */
 handMaps:Partial<Record<PhysicalKeyboardId,TranspositionOwner[]>>;sha256:string;
}
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const linear=(p:PitchCoordinate)=>p.octave*12+p.pitchClass;
const layout=(v:unknown):v is PhysicalKeyboardId=>v==='conventional-piano'||v==='janko-four-row';
const digest=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const originalSource=(p:ScorePackage):QuantizedGridScore=>p.transpositionOriginal?.sourceScore??p.transpositionOriginal?.score??p.sourceScore??p.score;
export const getScoreTransposition=(p:ScorePackage)=>p.transposition?.steps??0;
export const getOriginalScoreIdentity=(p:ScorePackage)=>p.transposition?.originalSourceSha256??p.sourceRevision??p.manifest.revision;
export const getOriginalScorePackageBytes=(p:ScorePackage)=>p.transposition?new Uint8Array(p.files[p.transposition.originalArchive]):undefined;
export function transpositionOwnerMap(p:ScorePackage):TranspositionOwner[]{
 const notes=new Map(originalSource(p).notes.map(n=>[n.id,n]));
 requirePianoCapability(p,'pianoPreparation');
 return p.score.notes.map(event=>{const n=requirePianoEvent(event),sourceEvent=notes.get(n.id),source=sourceEvent?requirePitchedEvent(sourceEvent):undefined;if(!source)throw Error('Transpose has a stale selected owner.');
  return{id:n.id,pitch:linear(source.pitch),startTick:source.startTick,durationTicks:source.durationTicks,hand:n.hand};}).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
}
/** A transposed edition the viewer makes carries the score's own hands and no
 * finger layer; a retained calculated one carries calculated hands. */
export const sourceHandEdition=(p:ScorePackage)=>!p.calculatedHandReceipt&&!p.score.performingHandPresentation&&!p.score.notes.some(n=>n.derivedHand)&&
 p.renderingRecipe?.engineId!==CALCULATED_HAND_SCORE_RENDERING_ENGINE;
/** The original's own hands, keyed by the original pitches. */
function sourceOwnerMap(p:ScorePackage):TranspositionOwner[]{
 requirePianoCapability(p,'pianoPreparation');
 return originalSource(p).notes.map(event=>{const n=requirePianoEvent(event),source=requirePitchedEvent(n);
  if(n.hand!=='LH'&&n.hand!=='RH')throw Error('Transpose needs a hand on every note.');
  return{id:n.id,pitch:linear(source.pitch),startTick:source.startTick,durationTicks:source.durationTicks,hand:n.hand};}).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
}
export function scoreTranspositionCompatible(candidate:ScorePackage,selected:ScorePackage,keyboard:PhysicalKeyboardId):boolean {
 if(getOriginalScoreIdentity(candidate)!==getOriginalScoreIdentity(selected))return false;
 const baseline=selected.transposition?.originalArchiveSha256??selected.archiveSha256;
 if(!candidate.transposition)return candidate.archiveSha256===baseline;
 if(candidate.transposition.originalArchiveSha256!==baseline||candidate.keyboardLayout!==keyboard||
  canonicalJson(candidate.calculationContext?.referencePerformanceTempo??candidate.sourceScore?.referencePerformanceTempo)!==canonicalJson(selected.calculationContext?.referencePerformanceTempo??selected.sourceScore?.referencePerformanceTempo))return false;
 // A source-hand edition was admitted with the original's own hands. A
 // retained calculated edition must match the hands now shown.
 if(sourceHandEdition(candidate))return !!candidate.transposition.handMaps[keyboard];
 return candidate.preparationIdentity?.handPolicy==='retain-imported'&&
  canonicalJson(candidate.transposition.handMaps[keyboard])===canonicalJson(transpositionOwnerMap(selected));
}
/** Every known absolute pitch location is handled explicitly. Unknown pitch or
 * candidate display projections refuse rather than retaining stale ink. */
export function transposeScore(source:QuantizedGridScore,steps:number):QuantizedGridScore {return transformScore(source,steps,true);}
function transformScore(source:QuantizedGridScore,steps:number,enforceRange:boolean):QuantizedGridScore {
 if(!Number.isSafeInteger(steps))throw Error('Transpose needs a whole number of steps within the piano range.');
 if(source.relativePresentation||source.readingPresentation||source.performingHandPresentation||source.notes.some(n=>n.readingDisplay||n.derivedHand))
  throw Error('Transpose does not support this relative or derived source projection.');
 const q=structuredClone(source),seen=new WeakSet<object>();
 const pitch=(value:any,path:string,physical=true)=>{
  if(!object(value)||Object.keys(value).some(k=>!['pitchClass','octave'].includes(k))||!Number.isInteger(value.pitchClass)||value.pitchClass<0||value.pitchClass>11||!Number.isSafeInteger(value.octave)||!Number.isSafeInteger(linear(value as PitchCoordinate)))
   throw Error('Transpose encountered an unsupported pitch at '+path+'.');
  if(seen.has(value))return;
  const next=linear(value as PitchCoordinate)+steps;if(enforceRange&&physical&&(next<9||next>96))throw Error('Transpose would move a pitch outside the piano range.');
  value.pitchClass=((next%12)+12)%12;value.octave=Math.floor(next/12);seen.add(value);
 };
 q.notes.forEach((event,i)=>{const n=requirePitchedEvent(event);pitch(n.pitch,`notes/${i}`);if(n.writtenPitch)pitch(n.writtenPitch,`notes/${i}/writtenPitch`,false);});
 q.repeatTies?.forEach((t,i)=>pitch(t.pitch,`repeatTies/${i}`));
 q.graceGroups?.forEach((g,i)=>g.members.forEach((m,j)=>{if(m.pitch)pitch(m.pitch,`graceGroups/${i}/${j}`);}));
 for(const [kind,events]of Object.entries(q.writtenPresentation?.events??{}))for(const [i,event]of events.entries()){
  const o=event.overrides as Record<string,any>;
  if(o?.writtenPitch){if(kind!=='notes')throw Error('Transpose encountered unsupported repeated written pitch.');pitch(o.writtenPitch,`writtenPresentation/${kind}/${i}/writtenPitch`,false);}
  if(o?.pitch){if(kind!=='notes'&&kind!=='repeatTies')throw Error('Transpose encountered an unsupported repeated pitch.');pitch(o.pitch,`writtenPresentation/${kind}/${i}`);}
 }
 const requirements=(q as any).sourceHandRequirements;
 if(requirements!==undefined){if(!Array.isArray(requirements))throw Error('Transpose encountered unsupported source hand guards.');
  for(const [i,r] of requirements.entries()){const n=source.notes.find(n=>n.id===r.ownerId),guard=(source as any).sourceHandRequirements[i].guard;
   if(!n||r.version!=='source-hand-requirement-v1'||!object(guard)||Object.keys(guard).length!==3||guard.pitch!==linear(requirePitchedEvent(n).pitch)||guard.startTick!==n.startTick||guard.durationTicks!==n.durationTicks)
    throw Error('Transpose encountered a stale source hand guard.');
   if(!seen.has(r.guard))r.guard.pitch+=steps;seen.add(r.guard);
  }
 }
 const audit=(v:any,path:string)=>{if(!v||typeof v!=='object')return;if(seen.has(v))return;
  for(const [k,x]of Object.entries(v)){if(/pitch|midi|guard/i.test(k)&&k!=='pitchStatements'&&k!=='sourceHash'){
    if(object(x)&&seen.has(x))continue;
    throw Error('Transpose encountered an unsupported pitch-bearing field at '+path+'/'+k+'.');
   }audit(x,path+'/'+k);}};
 audit(q,'source');return q;
}
export function scoreTranspositionRange(p:ScorePackage):{min:number;max:number}{
 requirePianoCapability(p,'pianoPreparation');
 const source=originalSource(p);transformScore(source,0,false);
 const values:number[]=[];const walk=(v:any)=>{if(!v||typeof v!=='object')return;
  if(Number.isInteger(v.pitchClass)&&Number.isInteger(v.octave)){values.push(linear(v));return;}
  for(const [key,value]of Object.entries(v))if(key!=='writtenPitch')walk(value);};walk(source);
 if(!values.length)throw Error('This score has no pitches to transpose.');
 const min=9-Math.min(...values),max=96-Math.max(...values);
 if(min>max)throw Error('This score cannot fit the piano range at a single offset.');return{min,max};
}
/** Serialization compatibility only: absent legacy discriminants remain
 * absent in frozen source bytes. Active transformed events stay canonical. */
export function transposedArchiveSource(original:ScorePackage,steps:number):{source:QuantizedGridScore;bytes:Uint8Array}{
 const source=transposeScore(original.sourceScore??original.score,steps),path=(original.collectionManifest??original.manifest).sourceScore??'score.json';
 return {source,bytes:strToU8(serializeCompatibleScore(source,original.files[path]))};
}
/** The authority a transposed archive carries: its exact original archive,
 * the edition it was made from and the owner hands for each keyboard. */
async function transpositionEnvelope(original:ScorePackage,originalBytes:Uint8Array,selectedBytes:Uint8Array,steps:number,sourceBytes:Uint8Array,
 handMaps:ScoreTransposition['handMaps']):Promise<ScoreTransposition>{
 const content={version:SCORE_TRANSPOSITION_VERSION,originalArchive:'transposition/original.isoscore',
  originalArchiveSha256:await hashBytes(originalBytes),baselineLayout:original.keyboardLayout!,originalSourceSha256:original.sourceSha256!,selectedEditionSha256:await hashBytes(selectedBytes),steps,
  effectiveSourceSha256:await hashBytes(sourceBytes),handMaps};
 return{...content,sha256:await identityHash(content)} as ScoreTransposition;
}
/** Options only the retired calculated-hand engraving accepts. */
const CALCULATED_ONLY_OPTIONS=['performingHandPolicy','sourceTransferSpacing','temporalAssociation','openingHeadMask'];

/** Transpose the original score by whole steps without calculating anything.
 * The new edition is engraved from the transposed source with the shared
 * production rules, keeps the score's own hands on both keyboards and has no
 * finger layer: an edition's fingerings belong to its pitches. The player's
 * own choices are carried separately (transposed-personal). */
export async function prepareSourceTransposition(selected:ScorePackage,selectedBytes:Uint8Array,steps:number,input?:ReadingExecution):Promise<Uint8Array>{
 const execution=input?capturedReadingExecution(input):undefined;checkReadingExecution(execution);
 requirePianoCapability(selected,'pianoPreparation');
 if(!Number.isSafeInteger(steps))throw Error('Transpose needs a whole number of steps within the piano range.');
 if(steps===0)throw Error('Select the retained original edition to restore 0 steps.');
 const original=selected.transpositionOriginal??selected,handless=originalSource(selected).notes.filter(n=>n.hand===undefined).length;
 // Transposing never supplies a missing hand.
 if(handless)throw Error(`Transposing keeps the score's own hands, and ${handless===1?'one note has':`${handless} notes have`} none, so this score can't be transposed yet.`);
 const originalBytes=getOriginalScorePackageBytes(selected)??new Uint8Array(selectedBytes),originalManifest=original.collectionManifest??original.manifest,
  {source,bytes:sourceBytes}=transposedArchiveSource(original,steps),sourceSha256=await hashBytes(sourceBytes);
 // The working tempo moves with the score; it is not a pitch.
 const context=selected.calculationContext?validatePianoCalculationContext({...selected.calculationContext,sourceSha256},sourceSha256,source):undefined,
  planning=scoreWithCalculationContext(source,context,sourceSha256);
 // Engraved afresh with the current engine. The original's own page and
 // spacing settings carry over; its old pages need not reproduce.
 const base=original.renderingRecipe,options=Object.fromEntries(Object.entries(base?.options??{}).filter(([key])=>!CALCULATED_ONLY_OPTIONS.includes(key)));
 let recipe=validateScoreRenderingRecipe({version:SCORE_RENDERING_RECIPE_VERSION,engineId:APPROVED_SCORE_RENDERING_ENGINE,sourceSha256,
  options:approvedProductionIsoOptions(options),tokens:base?.tokens??resolveIsoTokens({}),baseline:{pageSha256:['0'.repeat(64)],seatSha256:'0'.repeat(64)}},{sourceSha256});
 let rendered;
 try{rendered=await renderScorePresentationAsync(structuredClone(planning),recipe,execution??{});}
 catch(error){if((error as Error).name==='AbortError')throw error;
  throw Error(`This score can't be engraved cleanly ${steps>0?'+':''}${steps} steps away. The current score is retained.`,{cause:error});}
 checkReadingExecution(execution);
 recipe=validateScoreRenderingRecipe({...recipe,baseline:{pageSha256:await Promise.all(rendered.rawPages.map(hashBytes)),seatSha256:await hashBytes(JSON.stringify(rendered.seats))}},{sourceSha256});
 // Both keyboards read the same fixed pages; the score's hands are one map.
 const layouts=[original.keyboardLayout!,...(['conventional-piano','janko-four-row'] as const).filter(id=>id!==original.keyboardLayout)],
  score=context?strToU8(JSON.stringify(planning)):sourceBytes,revision=await hashBytes(score),effectiveHandSha256=await handDigest(source,planning),
  map=sourceOwnerMap(original),files:Record<string,Uint8Array>={'source-score.json':sourceBytes,'score.json':score,'seats.json':strToU8(JSON.stringify(rendered.seats)),
   'rendering-recipe.json':strToU8(JSON.stringify(recipe)),[originalManifest.font]:original.files[originalManifest.font],
   ...Object.fromEntries(originalManifest.notices.map(name=>[name,original.files[name]])),'transposition/original.isoscore':originalBytes},
  pages=rendered.pages.map((page,i)=>{const name=`pages/${i+1}.svg`;files[name]=strToU8(page);return name;});
 if(original.referenceMidi)files['reference.mid']=original.referenceMidi;
 const presentations:Manifest['presentations']={};
 for(const layoutId of layouts){const profileId='publisher-fixed-pages-v1';
  presentations[layoutId]={layoutId,score:'score.json',seats:'seats.json',pages:pages.slice(),renderingRecipe:'rendering-recipe.json',revision,profileId,
   profileSha256:await hashBytes(JSON.stringify({kind:profileId,layoutId})),effectiveHandSha256,layerSourceHash:sourceSha256,engineVersion:APPROVED_SCORE_RENDERING_ENGINE};}
 const primary=presentations[layouts[0]]!,
  m:Manifest={format:'iso-score',version:2,scoreId:source.id,metadata:structuredClone(originalManifest.metadata),createdAt:new Date().toISOString(),
   sourceScore:'source-score.json',sourceRevision:sourceSha256,sourceSha256,keyboardLayout:primary.layoutId,semanticSha256:revision,revision,
   profileId:primary.profileId,profileSha256:primary.profileSha256,effectiveHandSha256,layerSourceHash:sourceSha256,engineVersion:APPROVED_SCORE_RENDERING_ENGINE,
   pages:pages.slice(),renderingRecipe:'rendering-recipe.json',presentations,font:originalManifest.font,notices:originalManifest.notices.slice(),files:{},
   transposition:await transpositionEnvelope(original,originalBytes,selectedBytes,steps,sourceBytes,Object.fromEntries(layouts.map(id=>[id,map]))),
   ...(context?{calculationContext:context}:{}),...(original.referenceMidi?{referenceMidi:{file:'reference.mid' as const}}:{})};
 m.files=Object.fromEntries(await Promise.all(Object.entries(files).map(async([name,bytes])=>[name,await hashBytes(bytes)])));
 const checked=await importPackage(archivePackage(m,files),{allowLegacyTempo:true,...(execution?{execution}:{})});
 checkReadingExecution(execution);
 return (await publishPackage(checked)).bytes;
}
export async function admitScoreTransposition(raw:unknown,files:Record<string,Uint8Array>,effectiveBytes:Uint8Array,input?:ReadingExecution):Promise<{envelope:ScoreTransposition;original:ScorePackage}>{
 const execution=input?capturedReadingExecution(input):undefined;checkReadingExecution(execution);
 if(!object(raw)||raw.version!==SCORE_TRANSPOSITION_VERSION||Object.keys(raw).sort().join()!==
  ['version','originalArchive','originalArchiveSha256','baselineLayout','originalSourceSha256','selectedEditionSha256','steps','effectiveSourceSha256','handMaps','sha256'].sort().join()||
  raw.originalArchive!=='transposition/original.isoscore'||!layout(raw.baselineLayout)||
  ![raw.originalArchiveSha256,raw.originalSourceSha256,raw.selectedEditionSha256,raw.effectiveSourceSha256,raw.sha256].every(digest)||!object(raw.handMaps)||
  !Object.keys(raw.handMaps).length||Object.keys(raw.handMaps).some(k=>!layout(k))||raw.steps===0)
  throw Error('Unsupported Viewer transposition envelope.');
 const envelope=raw as ScoreTransposition,{sha256,...content}=envelope;
 if(await identityHash(content)!==sha256)throw Error('Transpose authority identity differs.');
 const bytes=files[envelope.originalArchive];if(!bytes||await hashBytes(bytes)!==envelope.originalArchiveSha256)throw Error('Transpose original archive differs.');
 // Exactly one original archive. Reject recursion before invoking any nested
 // archive reader; its own normal bounds/inventory then apply independently.
 const originalFiles=unzipSync(bytes,{filter:f=>{if(f.originalSize>20_000_000)throw Error('Oversized transpose baseline.');return f.name==='manifest.json';}}),manifest=JSON.parse(strFromU8(originalFiles['manifest.json']));
 if(manifest.transposition!==undefined)throw Error('A transpose baseline must be an untransposed original archive.');
 const original=await importPackage(bytes,{allowLegacyTempo:true,keyboardLayout:envelope.baselineLayout,...(execution?{execution}:{})});
 checkReadingExecution(execution);
 const reference=files['reference.mid'],priorReference=original.referenceMidi;
 if(!!reference!==!!priorReference||reference&&priorReference&&(reference.length!==priorReference.length||reference.some((b,i)=>b!==priorReference[i])))throw Error('Transpose reference bytes differ from its original archive.');
 if(original.sourceSha256!==envelope.originalSourceSha256)throw Error('Transpose baseline source identity differs.');
 const source=original.sourceScore??original.score,expected=transposedArchiveSource(original,envelope.steps).bytes;
 if(await hashBytes(expected)!==envelope.effectiveSourceSha256||await hashBytes(effectiveBytes)!==envelope.effectiveSourceSha256||
  expected.length!==effectiveBytes.length||expected.some((b,i)=>b!==effectiveBytes[i]))throw Error('Transpose effective source differs from independent reconstruction.');
 for(const map of Object.values(envelope.handMaps)){
  if(!Array.isArray(map)||map.length!==source.notes.length||new Set(map.map(o=>o.id)).size!==source.notes.length)throw Error('Transpose selected hand map is incomplete.');
  const expectedOrder=[...map].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  if(canonicalJson(map)!==canonicalJson(expectedOrder))throw Error('Transpose selected hand map is unordered.');
  for(const o of map){const n=source.notes.find(n=>n.id===o.id);
   if(!n||Object.keys(o).sort().join()!==['id','pitch','startTick','durationTicks','hand'].sort().join()||
    o.pitch!==linear(requirePitchedEvent(n).pitch)||o.startTick!==n.startTick||o.durationTicks!==n.durationTicks||!['LH','RH'].includes(o.hand))throw Error('Transpose selected hand map has stale source guards.');
  }
 }
 checkReadingExecution(execution);return{envelope:structuredClone(envelope),original};
}
