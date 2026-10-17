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
 warm(execution?:ReadingExecution):Promise<void>;
 project(owners:readonly PersonalOwnerHand[],digest:string,execution?:ReadingExecution):Promise<ProjectionView>;
}
type Core=PersonalProjectionCore;
type Capture=PreparationRequest<Core>&{digest:string};
const preparations=new PersonalPreparationPool<Core>();
function localCore(inputs:ProjectionCoreInputs):Core {
 const core=createPersonalHandProjection(inputs.source,inputs.baseline,inputs.recipe);
 return {
  async warm(e){if(e)await core.warmAsync(e);else core.warm();},
  async project(owners,digest,e){return e?core.projectAsync(owners,digest,e):core.project(owners,digest);}
 };
}
function freezeView<T>(value:T):T {
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freezeView(child);Object.freeze(value);}
 return value;
}
/** The worker holds the core. If no worker can run here, the same captured
 * inputs make a local core, exactly as before the worker existed. */
function workerCore(client:ProjectionWorkerClient,key:string,inputs:ProjectionCoreInputs):Core {
 let local:Core|undefined;
 const fallback=(error:unknown):Core=>{if(!(error instanceof ProjectionWorkerUnavailable))throw error;return local??=localCore(inputs);};
 return {
  async warm(e){if(local)return local.warm(e);try{await client.warm(key,inputs,e);}catch(error){await fallback(error).warm(e);}},
  async project(owners,digest,e){
   if(local)return local.project(owners,digest,e);
   try{return freezeView(await client.project(key,inputs,owners,digest,e));}catch(error){return fallback(error).project(owners,digest,e);}
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
/** A cached view must be the complete projection made for exactly these hand choices. */
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
export interface PersonalPresentationOptions {cache?:DerivedFileCache|null;worker?:ProjectionWorkerClient|null}
/** A reader owns its package/wrapper/buffers and local last view. Shared cores
 * are captured, bounded and serialized; changed pages are never a paint shortcut. */
export class PersonalPresentationSession {
 private preparation?:Promise<Capture>;
 private lease?:PreparationLease<Core>;
 private lastKey?:string;
 private lastView?:ScorePackage;
 private prefetched=false;
 private readonly base:ScorePackage;
 private readonly pool:PersonalPreparationPool<Core>;
 private readonly worker:ProjectionWorkerClient|null;
 private readonly cache:DerivedFileCache|null;
 constructor(base:ScorePackage,pool=preparations,options:PersonalPresentationOptions={}){
  this.base=base;this.pool=pool;
  this.worker=options.worker===undefined?defaultProjectionWorker():options.worker;
  this.cache=options.cache===undefined?defaultCache??null:options.cache;
 }
 private prepare(){return this.preparation??=capture(this.base,this.worker).catch(error=>{this.preparation=undefined;throw error;});}
 private async use<V>(action:(core:Core,execution?:ReadingExecution)=>V|Promise<V>,execution?:ReadingExecution):Promise<V>{
  const request=await this.prepare();checkReadingExecution(execution);
  const result=await this.pool.use({...request,lease:this.lease},action,execution);this.lease=result.lease;return result.value;
 }
 /** Complete cold work ahead of key handling; shared execution may yield safely. */
 async warm(input?:ReadingExecution):Promise<void>{
  if(!this.base.renderingRecipe||!this.base.sourceSha256)return;
  const execution=input?capturedReadingExecution(input):undefined;checkReadingExecution(execution);
  try{await this.use((core,e)=>core.warm(e),execution);}
  catch(error){
   // The source's own pages already draw a key whose notes differ in having a
   // hand; only a personal projection must refuse it. Read those pages, and
   // the player can give the key one hand.
   if(error instanceof HandPresentationError&&error.code==='unsupported-fit'&&MIXED_KEY.test(error.message))return;
   await playerFacing(Promise.reject(error),"This score can't be displayed yet: the viewer can't draw its pages.");
  }
 }
 /** When hand editing begins, settle the engraving in the projection worker
  * so the first hand choice only places what changed. Only off the reader's
  * thread: practice and reading never pay for it, and a failure costs nothing. */
 prefetch():void {
  if(this.prefetched||!this.worker?.available||!this.base.renderingRecipe||!this.base.sourceSha256)return;
  this.prefetched=true;cancelPersonalPrefetch();
  const controller=new AbortController();prefetching=controller;
  void this.use((core,e)=>core.warm(e),{signal:controller.signal}).catch(()=>{this.prefetched=false;})
   .finally(()=>{if(prefetching===controller)prefetching=undefined;});
 }
 async project(personal:PersonalState,input?:ReadingExecution):Promise<ScorePackage>{
  const execution=input?capturedReadingExecution(input):undefined;checkReadingExecution(execution);
  const owners:PersonalOwnerHand[]=effectiveAssignments(this.base,personal).map(({id,pitch,startTick,durationTicks,hand})=>({id,pitch,startTick,durationTicks,hand}));
  if(owners.every(a=>(this.base.score.notes.find(n=>n.id===a.id)?.hand??null)===a.hand))return this.base;
  const key=JSON.stringify(owners);
  if(key===this.lastKey&&this.lastView)return this.lastView;
  await ensureAnnotationInkPolicyReady(PERSONAL_ANNOTATION_INK_POLICY);checkReadingExecution(execution);
  const digest=await hashBytes(key);checkReadingExecution(execution);
  const cacheKey=this.cache?await hashBytes(JSON.stringify([(await this.prepare()).digest,key,PERSONAL_ANNOTATION_INK_POLICY])):undefined;
  let result=cacheKey?await this.cache!.get(PERSONAL_PROJECTION_CACHE_KIND,cacheKey,cachedProjection(owners,digest)):undefined;
  checkReadingExecution(execution);
  if(!result){
   result=await playerFacing(this.use((core,e)=>core.project(owners,digest,e),execution),
    UNDRAWABLE_HAND_CHOICES,
    "One key is written as two notes, and only one of them has a hand. Choose a hand for that key (L or R) to give it to both notes.");
   if(cacheKey)void this.cache!.put(PERSONAL_PROJECTION_CACHE_KIND,cacheKey,{score:result.score,pages:result.pages,seats:result.seats,annotationGeometry:result.annotationGeometry});
  }
  const view:ScorePackage={...this.base,score:result.score,pages:[...result.pages],seats:[...result.seats],annotationGeometry:result.annotationGeometry,personalAnnotationInkPolicy:PERSONAL_ANNOTATION_INK_POLICY};
  this.lastKey=key;this.lastView=view;return view;
 }
}
