import {normalizeLegacyScoreEvents} from '../vendor/iso-notation/src/model/musical-event';
import {strToU8} from 'fflate';
import {archivePackage,hashBytes,importPackage,type FingerLayer,type ScorePackage,type PresentationDescriptor} from './package';
import {publishPackage} from './publication';
import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';
import type {PassiveScoreRenderingRecipe} from '../vendor/iso-notation/src/render/janko/score-rendering-recipe';
import {RR_TEMPORAL_LAYER_PLANNER} from '../vendor/iso-notation/src/model/rr-temporal-finger-layer';
import {PIANO_ASSIGNMENT_VERSION} from '../vendor/iso-notation/src/model/piano-finger-assignments';
import {createPianoPreparationIdentity} from './piano-preparation-identity';
import type {PerformingHandPolicy} from './piano-request-authority';
import type {CalculatedHandReceipt} from './calculated-hand-edition';
import type {PianoCalculationContext} from '../vendor/iso-notation/src/model/piano-calculation-context';

import type {ScoreTransposition} from './score-transposition';

export interface PianoPresentationPayload {
  layoutId:PhysicalKeyboardId;sourceSha256:string;score:string;seats:string;pages:string[];
  layer:FingerLayer;effectiveHandSha256:string;engineVersion:string;
  recipe?:PassiveScoreRenderingRecipe;
  preparationRequest?:{handPolicy:PerformingHandPolicy;maxExpansions?:number};
  calculatedHandReceipt?:CalculatedHandReceipt;
  calculationContext?:PianoCalculationContext|null;
  transpositionPreparation?:{envelope:ScoreTransposition;originalBytes:Uint8Array;sourceBytes:Uint8Array;source:ScorePackage['score']};
}

/** Immutable checked assembly for either layout. Other presentations retain
 * their exact bytes; publication first verifies the ORIGINAL installed pins. */
export async function packagePianoPresentation(p:ScorePackage,next:PianoPresentationPayload):Promise<Uint8Array>{
  const prior=(await publishPackage(p)).package,original=prior.collectionManifest??prior.manifest,
    sourcePath=original.version===2?original.sourceScore!:'score.json',source=next.transpositionPreparation?.sourceBytes??prior.files[sourcePath];
  if(await hashBytes(source)!==next.sourceSha256||!next.transpositionPreparation&&prior.sourceRevision!==next.sourceSha256)
    throw Error('Calculated presentation has a different immutable source or collection identity.');
  if(!['conventional-piano','janko-four-row'].includes(next.layoutId)||!next.pages.length||
    typeof next.layer.profileId!=='string'||typeof next.layer.profileSha256!=='string')throw Error('Incomplete calculated piano presentation.');
  const m=structuredClone(original),files:Record<string,Uint8Array>={...prior.files};delete files['manifest.json'];
  const presentations=next.transpositionPreparation?{}:{...(m.presentations??{})};
  if(next.transpositionPreparation){m.transposition=next.transpositionPreparation.envelope;files[m.transposition.originalArchive]=next.transpositionPreparation.originalBytes;}
  // Capture a companion's actual old clock before changing the collection's
  // primary context. Explicit null retains the immutable source clock.
  for(const [layout,d]of Object.entries(presentations))if(d&&layout!==next.layoutId)
    presentations[layout as PhysicalKeyboardId]={...d,calculationContext:d.calculationContext===undefined?m.calculationContext??null:d.calculationContext};
  if(m.version===1&&!next.transpositionPreparation){
    if(!prior.fingerLayer||!prior.profileId||!prior.profileSha256||!prior.effectiveHandSha256)
      throw Error('Legacy generation needs a declared compatible piano presentation; the old archive is retained.');
    presentations['janko-four-row']={layoutId:'janko-four-row',score:'score.json',seats:'seats.json',fingers:'fingers.json',
      pages:m.pages.slice(),revision:m.revision,profileId:prior.profileId,profileSha256:prior.profileSha256,
      effectiveHandSha256:prior.effectiveHandSha256,layerSourceHash:prior.fingerLayer.sourceHash,engineVersion:m.engineVersion};
  }
  const replaced=new Set(['score.json','seats.json','fingers.json','rendering-recipe.json','hand-presentation.json',...next.pages.map((_,i)=>`pages/${i+1}.svg`)]);
  for(const [layout,d]of Object.entries(presentations)){
    if(!d||layout===next.layoutId)continue;
    if(![d.score,d.seats,d.fingers,d.renderingRecipe,d.calculatedHandReceipt,...d.pages].some(name=>name&&replaced.has(name)))continue;
    const prefix=`presentations/${layout}/`,relocate=(name:string)=>{
      const target=prefix+name,bytes=prior.files[name];if(!bytes)throw Error('Retained piano presentation is incomplete.');
      if(target in files&&bytesDiffer(files[target],bytes))throw Error('Retained presentation paths conflict.');
      files[target]=bytes;return target;
    };
    presentations[layout as PhysicalKeyboardId]={...d,score:relocate(d.score),seats:relocate(d.seats),
      ...(d.fingers?{fingers:relocate(d.fingers)}:{}),...(d.renderingRecipe?{renderingRecipe:relocate(d.renderingRecipe)}:{}),
      ...(d.calculatedHandReceipt?{calculatedHandReceipt:relocate(d.calculatedHandReceipt)}:{}),pages:d.pages.map(relocate)};
  }
  files['source-score.json']=source;files['score.json']=strToU8(next.score);files['seats.json']=strToU8(next.seats);
  if(next.recipe)files['rendering-recipe.json']=strToU8(JSON.stringify(next.recipe));
  else delete files['rendering-recipe.json'];
  if(next.calculatedHandReceipt)files['hand-presentation.json']=strToU8(JSON.stringify(next.calculatedHandReceipt));
  else delete files['hand-presentation.json'];
  const revision=await hashBytes(files['score.json']);
  // This known contract binds presentation revision as metadata. Its complete
  // source/contact replay is revalidated below against the new actual score.
  const layer=next.layer.plannerVersion===RR_TEMPORAL_LAYER_PLANNER||next.layer.version===PIANO_ASSIGNMENT_VERSION?{...next.layer,revision}:next.layer;
  files['fingers.json']=strToU8(JSON.stringify(layer));
  next.pages.forEach((page,i)=>files[`pages/${i+1}.svg`]=strToU8(page));
  const selected:PresentationDescriptor={layoutId:next.layoutId,score:'score.json',seats:'seats.json',fingers:'fingers.json',
    pages:next.pages.map((_,i)=>`pages/${i+1}.svg`),revision,profileId:next.layer.profileId,profileSha256:next.layer.profileSha256,
    effectiveHandSha256:next.effectiveHandSha256,layerSourceHash:next.layer.sourceHash,engineVersion:next.engineVersion,
    ...(next.recipe?{renderingRecipe:'rendering-recipe.json'}:{}),...(next.calculatedHandReceipt?{calculatedHandReceipt:'hand-presentation.json'}:{})};
  selected.calculationContext=next.calculationContext===undefined?p.calculationContext??null:next.calculationContext;
  presentations[next.layoutId]=selected;
  Object.assign(m,{version:2,sourceScore:'source-score.json',sourceRevision:next.sourceSha256,sourceSha256:next.sourceSha256,
    keyboardLayout:next.layoutId,revision,semanticSha256:revision,layerSourceHash:selected.layerSourceHash,
    profileId:selected.profileId,profileSha256:selected.profileSha256,effectiveHandSha256:selected.effectiveHandSha256,
    engineVersion:selected.engineVersion,pages:selected.pages,presentations});
  if(selected.renderingRecipe)m.renderingRecipe=selected.renderingRecipe;else delete m.renderingRecipe;
  if(selected.calculatedHandReceipt)m.calculatedHandReceipt=selected.calculatedHandReceipt;else delete m.calculatedHandReceipt;
  if(selected.calculationContext)m.calculationContext=selected.calculationContext;else delete m.calculationContext;
  delete m.preparationIdentity;
  m.files=Object.fromEntries(await Promise.all(Object.entries(files).map(async([name,bytes])=>[name,await hashBytes(bytes)])));
  // Import validates every retained and new linked view, all source facts and
  // full known layer replay. The publisher then removes unused old members.
  let checked:ScorePackage;
  if(next.calculatedHandReceipt){
    if(!next.preparationRequest)throw Error('Calculated edition requires independently identified request policy.');
    const candidate:ScorePackage={...prior,manifest:m,score:normalizeLegacyScoreEvents(JSON.parse(next.score) as ScorePackage['score']),seats:JSON.parse(next.seats),pages:next.pages,
      keyboardLayout:next.layoutId,profileId:selected.profileId,profileSha256:selected.profileSha256,effectiveHandSha256:selected.effectiveHandSha256,
      calculatedHandReceipt:next.calculatedHandReceipt,sourceSha256:next.sourceSha256,sourceScore:next.transpositionPreparation?.source??prior.sourceScore??prior.score,
      ...(next.transpositionPreparation?{transposition:next.transpositionPreparation.envelope,transpositionOriginal:prior.transpositionOriginal??prior}:{}),fingerLayer:layer,renderingRecipe:next.recipe,calculationContext:selected.calculationContext??undefined};
    m.preparationIdentity=selected.preparationIdentity=await createPianoPreparationIdentity(candidate,next.preparationRequest.handPolicy,next.preparationRequest.maxExpansions);
    checked=await importPackage(archivePackage(m,files));
  }else if(next.preparationRequest){
    checked=await importPackage(archivePackage(m,files));
    const identity=await createPianoPreparationIdentity(checked,next.preparationRequest.handPolicy,next.preparationRequest.maxExpansions);
    m.preparationIdentity=selected.preparationIdentity=identity;
    checked=await importPackage(archivePackage(m,files));
  }else checked=await importPackage(archivePackage(m,files));
  return(await publishPackage(checked)).bytes;
}
const bytesDiffer=(a:Uint8Array,b:Uint8Array)=>a.length!==b.length||a.some((v,i)=>v!==b[i]);
