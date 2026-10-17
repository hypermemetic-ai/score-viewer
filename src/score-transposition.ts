import {capturedReadingExecution,checkReadingExecution,type ReadingExecution} from './reading-execution';
import {strFromU8,strToU8,unzipSync} from 'fflate';
import type {QuantizedGridScore,PitchCoordinate,Hand} from '../vendor/iso-notation/src/model/types';
import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';
import {hashBytes,importPackage,readEditionContent,type ScorePackage,type FingerLayer} from './package';
import {CALCULATED_HAND_SCORE_RENDERING_ENGINE,renderScorePresentationAsync} from '../vendor/iso-notation/src/score-presentation';
import {APPROVED_SCORE_RENDERING_ENGINE,SCORE_RENDERING_RECIPE_VERSION,validateScoreRenderingRecipe} from '../vendor/iso-notation/src/render/iso/score-rendering-recipe';
import {approvedProductionIsoOptions} from '../vendor/iso-notation/src/render/iso/approved-production';
import {resolveIsoTokens} from '../vendor/iso-notation/src/render/iso/types';
import {scoreWithCalculationContext,validatePianoCalculationContext,type PianoCalculationContext} from '../vendor/iso-notation/src/model/piano-calculation-context';
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
/** A transposed edition shows, on this keyboard, exactly the hands `selected`
 * shows now, whatever original it was saved against. */
export function sameHandsAtPitch(candidate:ScorePackage,selected:ScorePackage,keyboard:PhysicalKeyboardId):boolean {
 const map=candidate.transposition?.handMaps[keyboard];
 if(!map||getOriginalScoreIdentity(candidate)!==getOriginalScoreIdentity(selected)||candidate.keyboardLayout!==keyboard)return false;
 try{return canonicalJson(map)===canonicalJson(transpositionOwnerMap(selected));}catch{return false;}
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
 // An instrument's MIDI program and channel name a sound and a channel, not a pitch.
 const instrumentMidi=(path:string,k:string)=>(k==='midiProgram'||k==='midiChannel')&&/^source\/parts\/\d+\/instruments\/\d+$/.test(path);
 const audit=(v:any,path:string)=>{if(!v||typeof v!=='object')return;if(seen.has(v))return;
  for(const [k,x]of Object.entries(v)){if(/pitch|midi|guard/i.test(k)&&k!=='pitchStatements'&&k!=='sourceHash'&&!instrumentMidi(path,k)){
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

/** One keyboard view of a new edition: the score it shows, whose hands are
 * plain content, and the finger layer it carries as editor content, if any.
 * When the engraving refuses those hands, the view shows `fallback` (the
 * score's own hands) instead and carries no finger layer. */
export interface EditionView {layout:PhysicalKeyboardId;score:QuantizedGridScore;fingers?:FingerLayer;fallback?:QuantizedGridScore}
export interface EngravedEdition {
 bytes:Uint8Array;
 /** Keyboards that show `fallback` because the engraving refused their hands. */
 fellBack:PhysicalKeyboardId[];
 /** Keyboards whose finger layer could not stay edition content. */
 droppedFingers:PhysicalKeyboardId[];
}
/** Each note's hand in `score`, keyed by the original's own pitches. */
function ownerMap(original:QuantizedGridScore,score:QuantizedGridScore):TranspositionOwner[]{
 const hands=new Map(score.notes.map(n=>[n.id,n.hand]));
 return original.notes.map(event=>{const n=requirePianoEvent(event),source=requirePitchedEvent(n),hand=hands.get(n.id);
  if(hand!=='LH'&&hand!=='RH')throw Error('Transpose needs a hand on every note.');
  return{id:n.id,pitch:linear(source.pitch),startTick:source.startTick,durationTicks:source.durationTicks,hand};}).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
}

/** Engrave an edition afresh with the current engine and the shared
 * production rules. Each keyboard view shows the hands it is given, as plain
 * content; views with the same hands share one set of pages, engraved with
 * `approvedProductionIsoOptions()` and default tokens. The base edition's
 * font, notices and reference recording carry over; its old pages and their
 * recipe need not reproduce. A finger layer stays edition
 * content, bound to its new pages. With `keep`, that admitted edition's own
 * views stay byte-identical and `views` add the keyboards it lacks. Nothing
 * is calculated. */
export async function engraveEdition(request:{
 /** Supplies metadata, font, notices and reference recording. */
 base:ScorePackage;source:QuantizedGridScore;sourceBytes:Uint8Array;context?:PianoCalculationContext;views:readonly EditionView[];
 transposition?:{original:ScorePackage;originalBytes:Uint8Array;selectedBytes:Uint8Array;steps:number};
 keep?:ScorePackage;
 /** What the player reads when the engraving refuses the score. */
 refusal:string;
},input?:ReadingExecution):Promise<EngravedEdition>{
 const execution=input?capturedReadingExecution(input):undefined;checkReadingExecution(execution);
 const {base,source,sourceBytes,context,views,transposition,keep}=request,baseManifest=base.collectionManifest??base.manifest,sourceSha256=await hashBytes(sourceBytes),
  kept=keep?keep.collectionManifest??keep.manifest:undefined;
 if(!views.length||new Set(views.map(v=>v.layout)).size!==views.length||kept&&(transposition||kept.transposition||kept.version!==2||kept.sourceSha256!==sourceSha256||views.some(v=>kept.presentations?.[v.layout])))
  throw Error('An edition needs exactly one view for each keyboard it serves.');
 // Fresh pages follow the shared rules alone, exactly as a new import does;
 // the base edition's own recipe belongs to its old pages.
 const options=approvedProductionIsoOptions(),tokens=resolveIsoTokens({}),
  shared:Record<string,Uint8Array>={[baseManifest.font]:base.files[baseManifest.font],...Object.fromEntries(baseManifest.notices.map(name=>[name,base.files[name]]))},
  engraved=new Map<string,{score:string;seats:string;recipe:string;pages:string[]}>(),chosen:EditionView[]=[],fellBack:PhysicalKeyboardId[]=[];
 if(kept)for(const [name,bytes]of Object.entries(keep!.files))if(name!=='manifest.json')shared[name]=bytes;
 if(transposition)shared['transposition/original.isoscore']=transposition.originalBytes;
 if(base.referenceMidi)shared['reference.mid']=base.referenceMidi;
 const engrave=async(layout:PhysicalKeyboardId,score:QuantizedGridScore)=>{
  const key=canonicalJson(score);if(engraved.has(key))return;
  // The first engraving is the primary view's and takes the root names.
  const prefix=engraved.size||kept?`${layout}/`:'';
  let recipe=validateScoreRenderingRecipe({version:SCORE_RENDERING_RECIPE_VERSION,engineId:APPROVED_SCORE_RENDERING_ENGINE,sourceSha256,options,tokens,
   baseline:{pageSha256:['0'.repeat(64)],seatSha256:'0'.repeat(64)}},{sourceSha256}),rendered;
  try{rendered=await renderScorePresentationAsync(structuredClone(score),recipe,execution??{});}
  catch(error){if((error as Error).name==='AbortError')throw error;throw Error(request.refusal,{cause:error});}
  checkReadingExecution(execution);
  recipe=validateScoreRenderingRecipe({...recipe,baseline:{pageSha256:await Promise.all(rendered.rawPages.map(hashBytes)),seatSha256:await hashBytes(JSON.stringify(rendered.seats))}},{sourceSha256});
  const names={score:prefix+'score.json',seats:prefix+'seats.json',recipe:prefix+'rendering-recipe.json',
   pages:rendered.pages.map((page,i)=>{const name=`${prefix}pages/${i+1}.svg`;shared[name]=strToU8(page);return name;})};
  // A view that shows exactly the source keeps the source's own bytes.
  shared[names.score]=!context&&key===canonicalJson(source)?sourceBytes:strToU8(JSON.stringify(score));
  shared[names.seats]=strToU8(JSON.stringify(rendered.seats));shared[names.recipe]=strToU8(JSON.stringify(recipe));
  engraved.set(key,names);
 };
 for(const view of views){
  try{await engrave(view.layout,view.score);chosen.push(view);}
  catch(error){
   if(!view.fallback||(error as Error).name==='AbortError')throw error;
   await engrave(view.layout,view.fallback);chosen.push({layout:view.layout,score:view.fallback});fellBack.push(view.layout);
  }
 }
 const assemble=async(withFingers:boolean)=>{
  const files:Record<string,Uint8Array>={...shared,...(kept?{}:{'source-score.json':sourceBytes})},presentations:Manifest['presentations']={...structuredClone(kept?.presentations??{})},handMaps:ScoreTransposition['handMaps']={};
  for(const [i,view] of chosen.entries()){
   const e=engraved.get(canonicalJson(view.score))!,revision=await hashBytes(files[e.score]),layer=withFingers?view.fingers:undefined,
    profileId=typeof layer?.profileId==='string'?layer.profileId:'publisher-fixed-pages-v1',
    profileSha256=typeof layer?.profileSha256==='string'?layer.profileSha256:await hashBytes(JSON.stringify({kind:profileId,layoutId:view.layout})),
    fingers=layer?(i||kept?`${view.layout}/fingers.json`:'fingers.json'):undefined;
   // The layer's fingers and hands are unchanged; it now names these pages.
   if(layer&&fingers)files[fingers]=strToU8(JSON.stringify({...structuredClone(layer),...('revision' in layer?{revision}:{})}));
   presentations[view.layout]={layoutId:view.layout,score:e.score,seats:e.seats,...(fingers?{fingers}:{}),pages:e.pages.slice(),renderingRecipe:e.recipe,revision,profileId,profileSha256,
    effectiveHandSha256:await handDigest(source,view.score),layerSourceHash:sourceSha256,engineVersion:APPROVED_SCORE_RENDERING_ENGINE};
   if(transposition)handMaps[view.layout]=ownerMap(originalSource(transposition.original),view.score);
  }
  let m:Manifest;
  if(kept)m={...structuredClone(kept),createdAt:new Date().toISOString(),presentations,files:{}};
  else{
   const primary=presentations[chosen[0].layout]!;
   m={format:'iso-score',version:2,scoreId:source.id,metadata:structuredClone(baseManifest.metadata),createdAt:new Date().toISOString(),
    sourceScore:'source-score.json',sourceRevision:sourceSha256,sourceSha256,keyboardLayout:primary.layoutId,semanticSha256:primary.revision,revision:primary.revision,
    profileId:primary.profileId,profileSha256:primary.profileSha256,effectiveHandSha256:primary.effectiveHandSha256,layerSourceHash:sourceSha256,engineVersion:APPROVED_SCORE_RENDERING_ENGINE,
    pages:primary.pages.slice(),renderingRecipe:primary.renderingRecipe,presentations,font:baseManifest.font,notices:baseManifest.notices.slice(),files:{},
    ...(transposition?{transposition:await transpositionEnvelope(transposition.original,transposition.originalBytes,transposition.selectedBytes,transposition.steps,sourceBytes,handMaps)}:{}),
    ...(context?{calculationContext:context}:{}),...(base.referenceMidi?{referenceMidi:{file:'reference.mid' as const}}:{})};
  }
  m.files=Object.fromEntries(await Promise.all(Object.entries(files).map(async([name,bytes])=>[name,await hashBytes(bytes)])));
  const checked=await importPackage(archivePackage(m,files),{allowLegacyTempo:true,...(execution?{execution}:{})});
  checkReadingExecution(execution);return checked;
 };
 let checked:ScorePackage,droppedFingers=views.filter(v=>v.fingers&&fellBack.includes(v.layout)).map(v=>v.layout);
 const plain=(error:unknown):never=>{if((error as Error).name==='AbortError')throw error;throw Error(request.refusal,{cause:error});};
 try{checked=await assemble(true);}
 catch(error){
  // A layer that no longer binds stays with the earlier edition; the caller
  // carries its fingers as the player's own choices instead.
  if((error as Error).name==='AbortError'||!chosen.some(v=>v.fingers))plain(error);
  checked=await assemble(false).catch(plain);droppedFingers=views.filter(v=>v.fingers).map(v=>v.layout);
 }
 return{bytes:(await publishPackage(checked)).bytes,fellBack,droppedFingers};
}

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
 const originalBytes=getOriginalScorePackageBytes(selected)??new Uint8Array(selectedBytes),
  {source,bytes:sourceBytes}=transposedArchiveSource(original,steps),sourceSha256=await hashBytes(sourceBytes);
 // The working tempo moves with the score; it is not a pitch.
 const context=selected.calculationContext?validatePianoCalculationContext({...selected.calculationContext,sourceSha256},sourceSha256,source):undefined,
  score=scoreWithCalculationContext(source,context,sourceSha256);
 // Both keyboards read the same fixed pages; the score's hands are one map.
 const layouts=[original.keyboardLayout!,...(['conventional-piano','janko-four-row'] as const).filter(id=>id!==original.keyboardLayout)];
 const {bytes}=await engraveEdition({base:original,source,sourceBytes,context,views:layouts.map(layout=>({layout,score})),
  transposition:{original,originalBytes,selectedBytes,steps},
  refusal:`This score can't be engraved cleanly ${steps>0?'+':''}${steps} steps away. The current score is retained.`},execution);
 checkReadingExecution(execution);return bytes;
}
export async function admitScoreTransposition(raw:unknown,files:Record<string,Uint8Array>,effectiveBytes:Uint8Array,input?:ReadingExecution,contentOnly=false):Promise<{envelope:ScoreTransposition;original:ScorePackage}>{
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
 const original=await (contentOnly?readEditionContent:importPackage)(bytes,{allowLegacyTempo:true,keyboardLayout:envelope.baselineLayout,...(execution?{execution}:{})});
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
