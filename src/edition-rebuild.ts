import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';
import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';
import {scoreWithCalculationContext} from '../vendor/iso-notation/src/model/piano-calculation-context';
import {archivePackage,handDigest,hashBytes,importPackage,readEditionContent,selectPresentation,validateLayerAsync,FIXED_PAGES_PROFILE,type FingerLayer,type Manifest,type PresentationDescriptor,type ScorePackage} from './package';
import {publishPackage} from './publication';
import {CALCULATED_HAND_SCORE_RENDERING_ENGINE} from '../vendor/iso-notation/src/score-presentation';
import {engraveEdition,getOriginalScorePackageBytes,getScoreTransposition,type EditionView} from './score-transposition';
import {checkReadingExecution,capturedReadingExecution,type ReadingExecution} from './reading-execution';
import {requirePianoCapability} from './score-capabilities';
import {collectionId,personalStorageName,type Entry,type PersonalState} from './state';
import {loadPersonalJournal} from './personal-journal';
import {scoreFileName} from './score-file-name';
import {personalForRebuiltEdition} from './transposed-personal';

const KEYBOARDS=['janko-four-row','conventional-piano'] as const;
export const packageFile=async(bytes:Uint8Array)=>scoreFileName(await hashBytes(bytes));

/** The score a keyboard view showed, as plain content: the source's own
 * events with that view's hands. The record of how those hands were once
 * derived is not carried; the hands themselves are. */
export function plainHandScore(planning:QuantizedGridScore,shown:QuantizedGridScore):QuantizedGridScore {
 const score=structuredClone(planning),notes=new Map(shown.notes.map(n=>[n.id,n])),
  copy=(to:Record<string,unknown>,from:Record<string,unknown>|undefined)=>{for(const key of ['hand','editorialHand','handInference']){
   if(from?.[key]===undefined)delete to[key];else to[key]=structuredClone(from[key]);}};
 for(const n of score.notes){const shownNote=notes.get(n.id);if(!shownNote)throw Error('The saved edition names notes its source lacks.');copy(n as unknown as Record<string,unknown>,shownNote as unknown as Record<string,unknown>);}
 const written=score.writtenPresentation?.events.notes,shownWritten=shown.writtenPresentation?.events.notes;
 if(written){
  if(!shownWritten||shownWritten.length!==written.length)throw Error('The saved edition writes its notes differently from its source.');
  written.forEach((event,i)=>{const overrides={...(event.overrides??{})} as Record<string,unknown>;copy(overrides,shownWritten[i].overrides as Record<string,unknown>|undefined);
   if(Object.keys(overrides).length)event.overrides=overrides as typeof event.overrides;else delete (event as Partial<typeof event>).overrides;});
 }
 return score;
}

/** The notes a piano edition was engraved from: a linked edition's source,
 * or an early-format edition's own score, whose `score.json` holds the notes
 * and is its source identity. */
export function editionSource(p:ScorePackage):{source:QuantizedGridScore;sourceBytes:Uint8Array;sourceSha256:string}|undefined{
 const manifest=p.collectionManifest??p.manifest,name=manifest.version===1?'score.json':manifest.version===2?manifest.sourceScore:undefined,
  source=manifest.version===1?p.score:p.sourceScore,bytes=name?p.files[name]:undefined;
 return source&&bytes&&p.sourceSha256?{source,sourceBytes:bytes,sourceSha256:p.sourceSha256}:undefined;
}

export interface RebuiltEdition {
 bytes:Uint8Array;
 /** The earlier edition's content, one entry per keyboard it served. Never displayed. */
 earlier:Partial<Record<PhysicalKeyboardId,ScorePackage>>;
 /** Keyboards that show the score's own hands because the engraving refused
  * the earlier edition's; those hands travel as the player's own choices. */
 fellBack:PhysicalKeyboardId[];
 /** Keyboards whose printed fingers could not stay edition content; they
  * travel as the player's own choices. */
 droppedFingers:PhysicalKeyboardId[];
 /** Earlier archive name → the edition that now stands for it. */
 replaced:Record<string,string>;
 /** The keyboard the earlier edition opened on. */
 primary:PhysicalKeyboardId;
 /** A transposed edition's own original, when it too had to be engraved
  * again: the earlier original's archive name and its new edition. */
 original?:{file:string;edition:RebuiltEdition};
}

/** Engrave a saved edition again with the current engine from its own
 * content: its source, the hands each keyboard view shows and the fingers it
 * prints. An early-format edition's own notes are its source. Both keyboard
 * layouts are served; a keyboard the edition lacked shows the
 * hands of the keyboard it had, without printed fingers. Where the engraving
 * refuses those hands (a hand crossing a rest its staff writes, say), the
 * view shows the score's own hands and the caller carries the edition's hands
 * and fingers as the player's own choices. A transposed edition
 * keeps its pitch and is bound to `original` (an untransposed edition of the
 * same source), or to its own original engraved again. Nothing is calculated
 * and the earlier archive is not changed. */
export async function rebuildEdition(bytes:Uint8Array,options:{original?:{package:ScorePackage;bytes:Uint8Array};
 /** Thrown instead when the edition's content itself can't be read: only
  * pages that no longer reproduce are a reason to engrave again. */
 refusal?:unknown;
 /** An early-format edition whose pages carry nothing made for one keyboard
  * layout keeps them: both layouts show its existing pages, and nothing is
  * engraved (linkEarlyEdition). */
 keepPages?:boolean}={},input?:ReadingExecution):Promise<RebuiltEdition>{
 const execution=input?capturedReadingExecution(input):undefined;checkReadingExecution(execution);
 const refuse=(error:unknown):never=>{if((error as Error)?.name==='AbortError'||options.refusal===undefined)throw error;throw options.refusal;},
  content=await readEditionContent(bytes,{allowLegacyTempo:true,...(execution?{execution}:{})}).catch(refuse),manifest=content.collectionManifest??content.manifest;
 checkReadingExecution(execution);try{requirePianoCapability(content,'pianoPreparation');}catch(error){refuse(error);}
 const own=editionSource(content);
 if(!own)return refuse(Error('This saved edition has no linked source to engrave again from.'));
 const {source,sourceBytes,sourceSha256}=own,
  planning=scoreWithCalculationContext(source,manifest.calculationContext,sourceSha256),earlier:RebuiltEdition['earlier']={},
  primary=content.keyboardLayout!,layouts=[primary,...KEYBOARDS.filter(id=>id!==primary)],views:EditionView[]=[];
 for(const id of content.availablePresentations??[])earlier[id]=await selectPresentation(content,id);
 if(options.keepPages&&manifest.version===1&&layoutNeutralPages(content)){
  const linked=await linkEarlyEdition(content,true).catch(async error=>{if((error as Error).name==='AbortError')throw error;console.warn('The finger layer could not stay with the linked edition; its fingers travel as choices.',error);return undefined;}),
   kept=linked??await linkEarlyEdition(content,false);checkReadingExecution(execution);
  return{bytes:kept,earlier,fellBack:[],droppedFingers:linked||!content.fingerLayer?[]:[primary],replaced:{[await packageFile(bytes)]:await packageFile(kept)},primary};
 }
 for(const layout of layouts){
  const view=earlier[layout];
  let score:QuantizedGridScore;try{score=view?plainHandScore(planning,view.score):views[0].score;}catch(error){return refuse(error);}
  views.push(view?{layout,score,...(view.fingerLayer?{fingers:view.fingerLayer,layerSourceHash:view.manifest.layerSourceHash??sourceSha256}:{}),fallback:planning}:{layout,score,fallback:planning});
 }
 const replaced:Record<string,string>={},steps=getScoreTransposition(content);
 let originalRebuilt:RebuiltEdition['original'];
 let transposition:Parameters<typeof engraveEdition>[0]['transposition'];
 if(steps){
  let original=options.original,rebuiltOriginal:RebuiltEdition['original'];
  if(!original){
   // The edition's own original, engraved again when it, too, no longer reproduces.
   const embedded=getOriginalScorePackageBytes(content)!;
   try{original={package:await importPackage(embedded,{allowLegacyTempo:true,...(execution?{execution}:{})}),bytes:embedded};}
   catch(error){
    if((error as Error).name==='AbortError')throw error;
    const again=await rebuildEdition(embedded,{},execution);Object.assign(replaced,again.replaced);rebuiltOriginal={file:await packageFile(embedded),edition:again};
    original={package:await importPackage(again.bytes,{allowLegacyTempo:true,...(execution?{execution}:{})}),bytes:again.bytes};
   }
  }
  if(getScoreTransposition(original.package)!==0||original.package.sourceSha256!==content.transposition!.originalSourceSha256)
   throw Error('This transposed edition belongs to another original score.');
  transposition={original:original.package.transpositionOriginal??original.package,originalBytes:original.bytes,selectedBytes:new Uint8Array(bytes),steps};
  originalRebuilt=rebuiltOriginal;
 }
 const engraved=await engraveEdition({base:content,source,sourceBytes,context:manifest.calculationContext,views,transposition,
  refusal:"This saved edition can't be engraved again with the current engraving. It stays saved."},execution);
 replaced[await packageFile(bytes)]=await packageFile(engraved.bytes);
 return{bytes:engraved.bytes,earlier,fellBack:engraved.fellBack,droppedFingers:engraved.droppedFingers,replaced,primary,...(originalRebuilt?{original:originalRebuilt}:{})};
}

/** Whether a view's pages carry nothing made for its keyboard layout. ISO
 * notation draws the same pages for every layout (the engine takes no layout),
 * and the reader draws fingers at the seats, so a view's pages serve either
 * layout unless its hands were calculated for its own layout. A piano
 * preparation bound to a view is not ink: the shared view has none. */
export function layoutNeutralPages(view:ScorePackage):boolean{
 const m=view.manifest;
 return !view.score.performingHandPresentation&&!view.score.notes.some(n=>n.derivedHand)&&m.engineVersion!==CALCULATED_HAND_SCORE_RENDERING_ENGINE&&
  !m.calculatedHandReceipt&&!view.calculatedHandReceipt;
}
/** A view that shows `from`'s pages, seats and hands on `layout`, without
 * `from`'s finger layer: fingerings made for one layout stay with it. */
async function sharedPresentation(from:PresentationDescriptor,layout:PhysicalKeyboardId,sourceSha256:string):Promise<PresentationDescriptor>{
 return{layoutId:layout,score:from.score,seats:from.seats,pages:from.pages.slice(),...(from.renderingRecipe?{renderingRecipe:from.renderingRecipe}:{}),revision:from.revision,
  profileId:FIXED_PAGES_PROFILE,profileSha256:await hashBytes(JSON.stringify({kind:FIXED_PAGES_PROFILE,layoutId:layout})),effectiveHandSha256:from.effectiveHandSha256,
  layerSourceHash:sourceSha256,engineVersion:from.engineVersion,...(from.calculationContext!==undefined?{calculationContext:structuredClone(from.calculationContext)}:{})};
}
const admitShared=async(m:Manifest,files:Record<string,Uint8Array>)=>
 (await publishPackage(await importPackage(archivePackage(m,files),{allowLegacyTempo:true}))).bytes;
/** An early-format edition as a linked edition with the same pages for both
 * keyboard layouts. Its notes (`score.json`) become its source, its Jankó view
 * keeps every page, seat and its finger layer (with `fingers`), and the
 * conventional view shows the same pages without that layer. Nothing is
 * engraved; the earlier archive is not changed. */
async function linkEarlyEdition(early:ScorePackage,fingers:boolean):Promise<Uint8Array>{
 const m1=early.manifest,sha=m1.semanticSha256,files:Record<string,Uint8Array>={};
 for(const [name,bytes]of Object.entries(early.files))if(name!=='manifest.json'&&(fingers||name!=='fingers.json'))files[name]=bytes;
 files['source-score.json']=early.files['score.json'];
 const layer=fingers?early.fingerLayer:undefined,
  profileId=typeof layer?.profileId==='string'?layer.profileId:FIXED_PAGES_PROFILE,
  profileSha256=typeof layer?.profileSha256==='string'?layer.profileSha256:await hashBytes(JSON.stringify({kind:profileId,layoutId:'janko-four-row'})),
  janko:PresentationDescriptor={layoutId:'janko-four-row',score:'score.json',seats:'seats.json',...(layer?{fingers:'fingers.json'}:{}),pages:m1.pages.slice(),revision:m1.revision,
   profileId,profileSha256,effectiveHandSha256:await handDigest(early.score,early.score),layerSourceHash:layer?m1.layerSourceHash??sha:sha,engineVersion:m1.engineVersion},
  m:Manifest={...structuredClone(m1),version:2,sourceScore:'source-score.json',sourceRevision:sha,sourceSha256:sha,keyboardLayout:'janko-four-row',
   profileId,profileSha256,effectiveHandSha256:janko.effectiveHandSha256,layerSourceHash:janko.layerSourceHash,
   presentations:{'janko-four-row':janko,'conventional-piano':await sharedPresentation(janko,'conventional-piano',sha)},files:{}};
 m.files=Object.fromEntries(await Promise.all(Object.entries(files).map(async([name,bytes])=>[name,await hashBytes(bytes)])));
 return admitShared(m,files);
}
/** Whether `selected` can show `layout` with pages it already has, without
 * engraving: an early-format edition, or a linked one at its original pitch,
 * whose pages carry nothing made for one layout. */
export function canShareKeyboardView(selected:ScorePackage,layout:PhysicalKeyboardId):boolean{
 const manifest=selected.collectionManifest??selected.manifest;
 if(selected.availablePresentations?.includes(layout)||getScoreTransposition(selected)||!layoutNeutralPages(selected))return false;
 return manifest.version===1||manifest.version===2&&!!manifest.sourceScore&&!!selected.sourceSha256&&!!selected.keyboardLayout&&!!manifest.presentations?.[selected.keyboardLayout];
}
/** Give a linked edition a keyboard layout it lacks by showing the selected
 * view's own pages there. Nothing is engraved and its own views stay
 * byte-identical, so their journals and practice need no carrying. (An
 * early-format edition is linked first: rebuildEdition with keepPages.) */
export async function shareKeyboardView(selected:ScorePackage,layout:PhysicalKeyboardId):Promise<Uint8Array>{
 const manifest=selected.collectionManifest??selected.manifest;
 if(manifest.version!==2||!canShareKeyboardView(selected,layout))throw Error('These pages can\'t serve another keyboard layout as they are.');
 const m=structuredClone(manifest),files:Record<string,Uint8Array>={};
 for(const [name,bytes]of Object.entries(selected.files))if(name!=='manifest.json')files[name]=bytes;
 m.presentations![layout]=await sharedPresentation(manifest.presentations![selected.keyboardLayout!]!,layout,selected.sourceSha256!);
 return admitShared(m,files);
}

/** Everything installing a re-engraved edition needs, for one keyboard. */
export interface RebuiltInstall {
 packageBytes:Uint8Array;
 /** The new edition's view on the requested keyboard. */
 package:ScorePackage;
 personal:PersonalState;
 /** The carried journals of the edition's other keyboards. */
 additionalPersonal:Array<{key:string;personal:PersonalState}>;
 /** Practice to carry from each earlier keyboard view to its new one. */
 practice:Array<{from:ScorePackage;to:ScorePackage;personal:PersonalState}>;
 /** When the edition's own original was engraved again too: the journals
  * and practice carried to the new original's keyboard views. */
 originalPersonal:Array<{key:string;personal:PersonalState}>;
 originalPractice:Array<{from:ScorePackage;to:ScorePackage;personal:PersonalState}>;
 replaced:Record<string,string>;
 /** Where the earlier edition's hands and printed fingers now live. */
 hands:'edition'|'choices';fingers:'edition'|'choices'|'none';
 /** The player's own earlier choices that came along, and those that stay with the earlier edition. */
 carried:number;left:number;
 /** Set while installing: practice journals that stayed with the earlier edition. */
 practiceLeft?:number;
}
/** Engrave a saved edition again and carry the player's journal for every
 * keyboard. Reads only; the caller installs the result like an Earlier
 * edition, so the earlier archive and its journals stay saved. */
export async function prepareRebuiltEdition(host:{read(name:string):Promise<Uint8Array|null>},entry:Entry,file:string,bytes:Uint8Array,layout:PhysicalKeyboardId,options:{
 original?:{package:ScorePackage;bytes:Uint8Array};refusal?:unknown;
 /** The journal map the earlier edition used; defaults to the entry's record of `file`. */
 personalFiles?:Record<string,string>;
 admit?:(bytes:Uint8Array)=>Promise<ScorePackage>;
 /** See rebuildEdition. */
 keepPages?:boolean;
}={},input?:ReadingExecution):Promise<RebuiltInstall>{
 const execution=input?capturedReadingExecution(input):undefined;checkReadingExecution(execution);
 const rebuilt=await rebuildEdition(bytes,{original:options.original,refusal:options.refusal,keepPages:options.keepPages},execution),earliest=rebuilt.earlier[rebuilt.primary]!;
 if(collectionId(earliest)!==entry.id)throw Error('The saved edition belongs to another score. Every edition is retained.');
 const admitted=await (options.admit??(b=>importPackage(b,{allowLegacyTempo:true,...(execution?{execution}:{})})))(rebuilt.bytes);checkReadingExecution(execution);
 const journals=(name:string)=>(name===entry.file?entry.personalFiles:entry.editionPersonalFiles?.[name])??{},
  personalFiles=options.personalFiles??journals(file);
 // Each keyboard view's journal comes along; practice moves from its earlier view.
 const carry=async(edition:RebuiltEdition,next:ScorePackage,files:Record<string,string>)=>{
  const out:Array<{to:ScorePackage;from?:ScorePackage;personal:PersonalState;carried:number;left:number}>=[],first=edition.earlier[edition.primary]!;
  for(const id of next.availablePresentations??[]){
   const to=await selectPresentation(next,id),from=edition.earlier[id],
    prior=from?await loadPersonalJournal(host,entry,from,{personalFiles:files,retained:true}):undefined,
    result=personalForRebuiltEdition(prior,from,to,{hands:(from??first).score,fingers:from?.fingerLayer});
   // An earlier finger layer in their history comes along where it still binds to the new pages, as their journal is read.
   const history:FingerLayer[]=[];
   for(const layer of prior?.history??[])if(await validateLayerAsync(layer,to,{history:true}).then(()=>true,()=>false))history.push(structuredClone(layer));
   checkReadingExecution(execution);out.push({to,...(from?{from}:{}),personal:{...result.personal,history},carried:result.carried,left:result.left});
  }
  return out;
 };
 const carried=await carry(rebuilt,admitted,personalFiles),practice:RebuiltInstall['practice']=carried.flatMap(c=>c.from?[{from:c.from,to:c.to,personal:c.personal}]:[]);
 const originalCarried=rebuilt.original?await carry(rebuilt.original.edition,await importPackage(rebuilt.original.edition.bytes,{allowLegacyTempo:true,...(execution?{execution}:{})}),journals(rebuilt.original.file)):[];
 const shown=carried.find(c=>c.to.keyboardLayout===layout);
 if(!shown)throw Error('The engraved edition has no view for this keyboard. Every edition is retained.');
 const printed=Object.values(rebuilt.earlier).some(p=>p?.fingerLayer);
 return{packageBytes:rebuilt.bytes,package:shown.to,personal:shown.personal,
  additionalPersonal:carried.filter(c=>c!==shown).map(c=>({key:personalStorageName(entry.id,c.to),personal:c.personal})),practice,replaced:rebuilt.replaced,
  originalPersonal:originalCarried.map(c=>({key:personalStorageName(entry.id,c.to),personal:c.personal})),
  originalPractice:originalCarried.flatMap(c=>c.from?[{from:c.from,to:c.to,personal:c.personal}]:[]),
  hands:rebuilt.fellBack.length?'choices':'edition',fingers:!printed?'none':rebuilt.droppedFingers.length?'choices':'edition',
  carried:carried.reduce((n,c)=>n+c.carried,0),left:carried.reduce((n,c)=>n+c.left,0)};
}

/** Whether addKeyboardView can give this edition a keyboard layout it
 * lacks while its own views stay as they are: a linked edition at its
 * original pitch. An early-format edition gains a layout by being engraved
 * again from its own notes (rebuildEdition), and a transposed edition by
 * being transposed again from its original. */
export function canAddKeyboardView(selected:ScorePackage,layout:PhysicalKeyboardId):boolean{
 const manifest=selected.collectionManifest??selected.manifest;
 return manifest.version===2&&!!manifest.sourceScore&&!!selected.sourceScore&&!!selected.sourceSha256&&!getScoreTransposition(selected)&&!selected.availablePresentations?.includes(layout);
}

/** Add a keyboard an admitted edition lacks. Its own views stay
 * byte-identical, so their journals and practice need no carrying; the new
 * keyboard shows the same hands, engraved with the current engine. Where the
 * engraving refuses them, it shows the score's own hands and those hands
 * travel as the player's own choices on that keyboard. */
export async function addKeyboardView(selected:ScorePackage,layout:PhysicalKeyboardId,input?:ReadingExecution):Promise<Uint8Array>{
 const execution=input?capturedReadingExecution(input):undefined;checkReadingExecution(execution);
 requirePianoCapability(selected,'pianoPreparation');
 const manifest=selected.collectionManifest??selected.manifest;
 // The source checks repeat canAddKeyboardView's so the fields are known present below.
 if(!canAddKeyboardView(selected,layout)||!manifest.sourceScore||!selected.sourceScore||!selected.sourceSha256)
  throw Error('Only a linked edition at its original pitch gains a keyboard layout beside its own pages.');
 const primary=await selectPresentation(selected,manifest.keyboardLayout!),
  planning=scoreWithCalculationContext(selected.sourceScore,manifest.calculationContext,selected.sourceSha256),
  engraved=await engraveEdition({base:primary,source:selected.sourceScore,sourceBytes:selected.files[manifest.sourceScore],context:manifest.calculationContext,
   views:[{layout,score:plainHandScore(planning,primary.score),fallback:planning}],keep:primary,
   refusal:"This score can't be engraved for that keyboard layout yet. The current score is retained."},execution);
 return engraved.bytes;
}

/** The added keyboard's starting choices: the edition's hands its pages don't show. */
export const personalForAddedKeyboard=(selected:ScorePackage,to:ScorePackage):PersonalState=>
 personalForRebuiltEdition(undefined,undefined,to,{hands:selected.score}).personal;
