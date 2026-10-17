import {createPersonalHandProjection,HandPresentationError,type PersonalOwnerHand} from '../vendor/iso-notation/src/score-presentation';
import {scoreWithCalculationContext} from '../vendor/iso-notation/src/model/piano-calculation-context';
import {calculatedRecipeForRequest} from './calculated-hand-edition';
import {PERSONAL_ANNOTATION_INK_POLICY,ensureAnnotationInkPolicyReady} from './annotation-ink-policy';
import {effectiveAssignments} from './personal-assignments';
import {hashBytes,type ScorePackage} from './package';
import type {PersonalState} from './state';
import {conservativeMaterialBytes} from './package-material';
import {PersonalPreparationPool,type PreparationLease,type PreparationRequest} from './personal-preparation-pool';
import {capturedReadingExecution,checkReadingExecution,type ReadingExecution} from './reading-execution';
import type {ProjectionCoreInputs,ProjectionView} from './personal-projection-protocol';
import {ProjectionWorkerClient,ProjectionWorkerUnavailable,projectionWorkerClient} from './personal-projection-client';
import type {DerivedFileCache} from './derived-file-cache';

/** One captured projection core, on the reader's thread or in the projection worker. */
export interface PersonalProjectionCore {
 /** offThreadOnly: settle only where it cannot hold the reader's thread. */
 warm(execution?:ReadingExecution,offThreadOnly?:boolean):Promise<void>;
 project(owners:readonly PersonalOwnerHand[],digest:string,execution?:ReadingExecution):Promise<ProjectionView>;
}
type Core=PersonalProjectionCore;
type Capture=PreparationRequest<Core>&{digest:string};
const preparations=new PersonalPreparationPool<Core>();
function localCore(inputs:ProjectionCoreInputs):Core {
 const core=createPersonalHandProjection(inputs.source,inputs.baseline,inputs.recipe);
 return {
  async warm(e,offThreadOnly){if(offThreadOnly)return;if(e)await core.warmAsync(e);else core.warm();},
  async project(owners,digest,e){return e?core.projectAsync(owners,digest,e):core.project(owners,digest);}
 };
}
function freezeView<T>(value:T):T {
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freezeView(child);Object.freeze(value);}
 return value;
}
/** The worker holds the core. A worker lost mid-request is started again
 * once; if no worker can run here at all, the same captured inputs make a
 * local core, exactly as before the worker existed. */
function workerCore(client:ProjectionWorkerClient,key:string,inputs:ProjectionCoreInputs):Core {
 let local:Core|undefined;
 async function remote<V>(run:()=>Promise<V>,offThreadOnly=false):Promise<V|undefined>{
  for(let attempt=0;;attempt++){
   try{return await run();}
   catch(error){
    if(!(error instanceof ProjectionWorkerUnavailable))throw error;
    if(client.available&&attempt===0)continue;
    if(offThreadOnly)return undefined;
    local??=localCore(inputs);return undefined;
   }
  }
 }
 return {
  async warm(e,offThreadOnly){
   if(local){if(!offThreadOnly)await local.warm(e);return;}
   await remote(()=>client.warm(key,inputs,e),offThreadOnly);
   const fallback=local as Core|undefined;if(fallback&&!offThreadOnly)await fallback.warm(e);
  },
  async project(owners,digest,e){
   if(!local){const view=await remote(()=>client.project(key,inputs,owners,digest,e));if(view)return freezeView(view);}
   return local!.project(owners,digest,e);
  }
 };
}
let sharedWorker:ProjectionWorkerClient|null|undefined;
/** Hand drawing runs off the reader's thread wherever a module worker exists. */
function defaultProjectionWorker():ProjectionWorkerClient|null {
 if(sharedWorker===undefined)sharedWorker=typeof Worker==='function'&&typeof window!=='undefined'?projectionWorkerClient():null;
 return sharedWorker;
}
let defaultCache:DerivedFileCache|undefined;
/** Projections made by this build are kept on disk, so reopening a score with
 * the same hand choices reads its pages instead of engraving them again. */
export function usePersonalProjectionCache(cache:DerivedFileCache|undefined){defaultCache=cache;}
export const PERSONAL_PROJECTION_CACHE_KIND='personal-projection-v1';
/** A cached view must be the complete projection made for exactly these hand
 * choices: the assignment digest covers every owner's identity and hand. */
export function cachedProjection(owners:readonly PersonalOwnerHand[],digest:string){
 return (value:unknown):ProjectionView=>{
  const v=value as ProjectionView;
  if(!v||typeof v!=='object'||!v.score||!Array.isArray(v.score.notes)||!Array.isArray(v.pages)||!v.pages.length||v.pages.some(page=>typeof page!=='string'||!page)||
   !Array.isArray(v.seats)||v.annotationGeometry?.version!=='annotation-carrier-geometry-v1'||v.annotationGeometry.presentationIdentity!==digest||!Array.isArray(v.annotationGeometry.seats))
   throw Error('Incomplete cached projection');
  const notes=new Map(v.score.notes.map(n=>[n.id,n]));
  for(const o of owners){if(o.hand===null)continue;const n=notes.get(o.id);if(!n||n.hand!==o.hand||n.personalHand?.assignmentId!==digest)throw Error('Cached projection has other hands');}
  return freezeView(v);
 };
}
/** Literal value identity preserves undefined, nonfinite numbers and -0 too;
 * a mutation cannot collide merely because JSON would erase its difference. */
function literal(value:unknown):unknown {
 if(value===undefined)return ['undefined'];if(value===null)return ['null'];
 if(typeof value==='number')return ['number',Object.is(value,-0)?'-0':String(value)];
 if(typeof value==='string'||typeof value==='boolean')return [typeof value,value];
 if(Array.isArray(value))return ['array',value.map(literal)];
 if(value instanceof Uint8Array)return ['bytes',[...value]];
 if(typeof value==='object')return ['object',Object.entries(value).map(([k,v])=>[k,literal(v)])];
 throw Error('Personal preparation requires captured literal package data.');
}
/** Each facade captures once before yielding. File bytes, rather than a mutable
 * archiveSha claim, bind the exact current archive members to the source graph. */
async function capture(base:ScorePackage,worker:ProjectionWorkerClient|null):Promise<Capture> {
 const snapshot=structuredClone(base),files=snapshot.files;
 const {files:ignored,...meaning}=snapshot;
 const identity=JSON.stringify(literal(meaning));
 const materialBytes=conservativeMaterialBytes(snapshot)+identity.length*2;
 const members=await Promise.all(Object.entries(files).map(async([name,bytes])=>[name,await hashBytes(bytes)]));
 const key=JSON.stringify([identity,members]),digest=await hashBytes(key);
 return {key,digest,materialBytes,async produce(execution){
  checkReadingExecution(execution);
  const recipe=await calculatedRecipeForRequest(snapshot,execution),source=scoreWithCalculationContext(snapshot.sourceScore??snapshot.score,
   snapshot.calculationContext,snapshot.sourceSha256??snapshot.manifest.semanticSha256);
  checkReadingExecution(execution);const inputs={source,baseline:snapshot.score,recipe};
  return worker?.available?workerCore(worker,digest,inputs):localCore(inputs);
 }};
}
/** Engraving refusals arrive in ISO notation's terms; players see what failed
 * in theirs, and the original diagnosis stays attached as the cause. */
function playerFacing<V>(work:Promise<V>,message:string,key?:string):Promise<V>{
 return work.catch(error=>{
  if(error instanceof HandPresentationError&&error.code==='unsupported-fit')throw Error(key&&MIXED_KEY.test(error.message)?key:message,{cause:error});
  throw error;});
}
/** ISO's refusal for one struck key written as notes with a hand and notes without one. */
const MIXED_KEY=/notes with a performing hand and notes without one/;
const UNDRAWABLE_HAND_CHOICES="These hand choices can't be drawn on the page yet.";
/** The notes whose personal hands the engraver could not fit, when that is the
 * whole refusal. A mixed-hand key is excluded: its message asks the player to
 * finish the key's hand, so that choice is part of an edit still in progress. */
export function undrawableHandOwners(error:unknown):readonly string[]|undefined {
 const cause=error instanceof Error?error.cause:undefined;
 if(!(error instanceof Error)||error.message!==UNDRAWABLE_HAND_CHOICES||!(cause instanceof HandPresentationError)||cause.code!=='unsupported-fit'||MIXED_KEY.test(cause.message))return;
 return cause.ownerIds?.length?cause.ownerIds:undefined;
}
/** At most one background preparation runs; a newer one, or opening another score, stops it. */
let prefetching:AbortController|undefined;
export function cancelPersonalPrefetch(){prefetching?.abort();prefetching=undefined;}
export interface PersonalPresentationOptions {cache?:DerivedFileCache|null;worker?:ProjectionWorkerClient|null;cacheWriteDelayMs?:number}
const CANNOT_DRAW="This score can't be displayed yet: the viewer can't draw its pages.";
/** A refusal of the score's own engraving, rather than of a hand choice. A
 * mixed-hand key is drawn from the source's own pages and stays editable. */
const baselineRefusal=(error:unknown)=>error instanceof HandPresentationError&&error.code==='unsupported-fit'&&!MIXED_KEY.test(error.message);
/** A reader owns its package/wrapper/buffers and local last view. Shared cores
 * are captured, bounded and serialized; changed pages are never a paint shortcut. */
export class PersonalPresentationSession {
 private preparation?:Promise<Capture>;
 private lease?:PreparationLease<Core>;
 private lastKey?:string;
 private lastView?:ScorePackage;
 private prefetched=false;
 /** Whether the score's own engraving settles, once a warm or projection has shown it. */
 private baseline?:true|Error;
 private cacheRead=false;
 private cacheWrite?:ReturnType<typeof setTimeout>;
 private readonly base:ScorePackage;
 private readonly pool:PersonalPreparationPool<Core>;
 private readonly worker:ProjectionWorkerClient|null;
 private readonly cache:DerivedFileCache|null;
 private readonly cacheWriteDelayMs:number;
 constructor(base:ScorePackage,pool=preparations,options:PersonalPresentationOptions={}){
  this.base=base;this.pool=pool;
  this.worker=options.worker===undefined?defaultProjectionWorker():options.worker;
  this.cache=options.cache===undefined?defaultCache??null:options.cache;
  this.cacheWriteDelayMs=options.cacheWriteDelayMs??2000;
 }
 /** Without a projection worker the engraving settles cooperatively while the
  * score opens, as before, so a first hand choice never freezes the reader. */
 get settlesOnOpen(){return !this.worker?.available;}
 private prepare(){return this.preparation??=capture(this.base,this.worker).catch(error=>{this.preparation=undefined;throw error;});}
 private async use<V>(action:(core:Core,execution?:ReadingExecution)=>V|Promise<V>,execution?:ReadingExecution):Promise<V>{
  const request=await this.prepare();checkReadingExecution(execution);
  const result=await this.pool.use({...request,lease:this.lease},action,execution);this.lease=result.lease;return result.value;
 }
 /** Complete cold work ahead of key handling; shared execution may yield safely. */
 async warm(input?:ReadingExecution):Promise<void>{
  if(!this.base.renderingRecipe||!this.base.sourceSha256)return;
  const execution=input?capturedReadingExecution(input):undefined;checkReadingExecution(execution);
  try{await this.use((core,e)=>core.warm(e),execution);this.baseline=true;}
  catch(error){
   // The source's own pages already draw a key whose notes differ in having a
   // hand; only a personal projection must refuse it. Read those pages, and
   // the player can give the key one hand.
   if(error instanceof HandPresentationError&&error.code==='unsupported-fit'&&MIXED_KEY.test(error.message))return;
   if(baselineRefusal(error))this.baseline=Error(CANNOT_DRAW,{cause:error});
   await playerFacing(Promise.reject(error),CANNOT_DRAW);
  }
 }
 /** When hand editing begins, settle the engraving in the projection worker
  * so the first hand choice only places what changed. Only off the reader's
  * thread: practice and reading never pay for it. A failure costs nothing,
  * except that a score whose own engraving is refused is remembered as such. */
 prefetch():void {
  if(this.prefetched||this.baseline||!this.worker?.available||!this.base.renderingRecipe||!this.base.sourceSha256)return;
  this.prefetched=true;cancelPersonalPrefetch();
  const controller=new AbortController();prefetching=controller;
  void this.use((core,e)=>core.warm(e,true),{signal:controller.signal}).then(()=>{if(this.worker?.available)this.baseline??=true;},error=>{
   this.prefetched=false;if(baselineRefusal(error))this.baseline=Error(CANNOT_DRAW,{cause:error});
  }).finally(()=>{if(prefetching===controller)prefetching=undefined;});
 }
 /** A projection was refused. When the score's own engraving is what fails,
  * say so: no hand choice is at fault, so none is returned to the score. */
 private async refusal(error:unknown,execution?:ReadingExecution):Promise<never>{
  if(baselineRefusal(error)&&this.baseline===undefined&&this.base.renderingRecipe&&this.base.sourceSha256){
   try{await this.use((core,e)=>core.warm(e),execution);this.baseline=true;}
   catch(warmError){
    if(baselineRefusal(warmError))this.baseline=Error(CANNOT_DRAW,{cause:warmError});
    else if(!(warmError instanceof HandPresentationError))throw warmError;
   }
  }
  if(this.baseline instanceof Error)throw this.baseline;
  throw error;
 }
 private async cacheKey():Promise<string>{
  return hashBytes(JSON.stringify([PERSONAL_PROJECTION_CACHE_KIND,(await this.prepare()).digest,PERSONAL_ANNOTATION_INK_POLICY]));
 }
 /** One slot per captured score holds its latest projection. It is written
  * once hand choices settle, never once per choice. */
 private remember(view:ProjectionView){
  const cache=this.cache;if(!cache)return;
  if(this.cacheWrite!==undefined)clearTimeout(this.cacheWrite);
  const value={score:view.score,pages:view.pages,seats:view.seats,annotationGeometry:view.annotationGeometry};
  this.cacheWrite=setTimeout(()=>{this.cacheWrite=undefined;void this.cacheKey().then(key=>cache.put(PERSONAL_PROJECTION_CACHE_KIND,key,value)).catch(()=>{});},this.cacheWriteDelayMs);
 }
 async project(personal:PersonalState,input?:ReadingExecution):Promise<ScorePackage>{
  const execution=input?capturedReadingExecution(input):undefined;checkReadingExecution(execution);
  const owners:PersonalOwnerHand[]=effectiveAssignments(this.base,personal).map(({id,pitch,startTick,durationTicks,hand})=>({id,pitch,startTick,durationTicks,hand}));
  if(owners.every(a=>(this.base.score.notes.find(n=>n.id===a.id)?.hand??null)===a.hand))return this.base;
  const key=JSON.stringify(owners);
  if(key===this.lastKey&&this.lastView)return this.lastView;
  await ensureAnnotationInkPolicyReady(PERSONAL_ANNOTATION_INK_POLICY);checkReadingExecution(execution);
  const digest=await hashBytes(key);checkReadingExecution(execution);
  let result:ProjectionView|undefined;
  // Only a session's first projection, normally the one that opens the score, reads the disk.
  if(this.cache&&!this.cacheRead){
   this.cacheRead=true;
   result=await this.cache.get(PERSONAL_PROJECTION_CACHE_KIND,await this.cacheKey(),cachedProjection(owners,digest));
   checkReadingExecution(execution);
  }
  if(!result){
   result=await playerFacing(this.use((core,e)=>core.project(owners,digest,e),execution).catch(error=>this.refusal(error,execution)),
    UNDRAWABLE_HAND_CHOICES,
    "One key is written as two notes, and only one of them has a hand. Choose a hand for that key (L or R) to give it to both notes.");
   this.baseline??=true;this.remember(result);
  }
  const view:ScorePackage={...this.base,score:result.score,pages:[...result.pages],seats:[...result.seats],annotationGeometry:result.annotationGeometry,personalAnnotationInkPolicy:PERSONAL_ANNOTATION_INK_POLICY};
  this.lastKey=key;this.lastView=view;return view;
 }
}
