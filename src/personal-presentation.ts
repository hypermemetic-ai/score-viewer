import {createPersonalHandProjection,HandPresentationError,type AdmittedReading,type PersonalHandEngineState,type PersonalOwnerHand,type PreparationStage} from '../vendor/iso-notation/src/score-presentation';
import {scoreWithCalculationContext} from '../vendor/iso-notation/src/model/piano-calculation-context';
import {effectivePerformingHand} from '../vendor/iso-notation/src/model/effective-hand';
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
import {rememberEngravedReading,takeEngravedReading} from './engraved-readings';

/** One captured projection core, on the reader's thread or in the projection worker. */
export interface PersonalProjectionCore {
 /** offThreadOnly: settle only where it cannot hold the reader's thread.
  * `saved`: an engine this build saved for the same captured package, to
  * resume from instead of engraving. Resolves false when the engraving did
  * not settle, else how: restored, engraved, or already settled before. */
 warm(execution?:ReadingExecution,offThreadOnly?:boolean,saved?:PersonalHandEngineState):Promise<false|'restored'|'engraved'|'already'>;
 project(owners:readonly PersonalOwnerHand[],digest:string,execution?:ReadingExecution):Promise<ProjectionView>;
 /** The settled engine, for the disk cache; undefined when there is none. */
 save():Promise<PersonalHandEngineState|undefined>;
}
type Core=PersonalProjectionCore;
type Capture=PreparationRequest<Core>&{digest:string};
const preparations=new PersonalPreparationPool<Core>();
function localCore(inputs:ProjectionCoreInputs):Core {
 const core=createPersonalHandProjection(inputs.source,inputs.baseline,inputs.recipe);
 let settled=false;
 return {
  async warm(e,offThreadOnly,saved){
   if(offThreadOnly)return false;
   if(settled)return 'already';
   if(saved&&(e?await core.restoreAsync(saved,e):core.restore(saved))){settled=true;return 'restored';}
   if(e)await core.warmAsync(e);else core.warm();settled=true;return 'engraved';
  },
  async project(owners,digest,e){const view=e?await core.projectAsync(owners,digest,e):core.project(owners,digest);settled=true;return view;},
  async save(){return core.exportState();}
 };
}
function freezeView<T>(value:T):T {
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freezeView(child);Object.freeze(value);}
 return value;
}
/** The worker holds the core. A worker lost mid-request is started again
 * once; if no worker can run here at all, the same captured inputs make a
 * local core. Work that was meant for the worker then runs cooperatively on
 * the reader's thread, never as one uninterrupted engraving. */
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
  async warm(e,offThreadOnly,saved){
   if(!local){const done=await remote(()=>client.warm(key,inputs,e,saved),offThreadOnly);if(done)return done;}
   const fallback=local as Core|undefined;
   return fallback&&!offThreadOnly?fallback.warm(e??{},false,saved):false;
  },
  async save(){
   if(local)return local.save();
   try{return await client.save(key,inputs);}catch{return undefined;}
  },
  async project(owners,digest,e){
   if(!local){const view=await remote(()=>client.project(key,inputs,owners,digest,e));if(view)return freezeView(view);}
   return local!.project(owners,digest,e??{});
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
/** The settled hand engine of one captured package, so hand editing resumes
 * on reopening instead of engraving the score again. ISO notation refuses a
 * state that does not reproduce; the cache's build identity keeps another
 * build's engine away. */
export const PERSONAL_ENGINE_CACHE_KIND='personal-engine-v1';
export function cachedEngine(value:unknown):PersonalHandEngineState {
 const v=value as PersonalHandEngineState;
 if(!v||typeof v!=='object'||v.version!=='personal-hand-engine-state-v1'||!Array.isArray(v.rawPages)||!v.graph||typeof v.graph!=='object')throw Error('Incomplete cached hand engine');
 return v;
}
/** A cached view must be the complete projection made for exactly these hand
 * choices: the assignment digest covers every owner's identity and hand. */
export function cachedProjection(owners:readonly PersonalOwnerHand[],digest:string){
 return (value:unknown):ProjectionView=>{
  const v=value as ProjectionView;
  if(!v||typeof v!=='object'||!v.score||!Array.isArray(v.score.notes)||!Array.isArray(v.pages)||!v.pages.length||v.pages.some(page=>typeof page!=='string'||!page)||
   !Array.isArray(v.seats)||v.annotationGeometry?.version!=='annotation-carrier-geometry-v1'||v.annotationGeometry.presentationIdentity!==digest||!Array.isArray(v.annotationGeometry.seats))
   throw Error('Incomplete cached projection');
  // Only owners whose hand the choices change carry this ledger's marker; the
  // rest keep the score's own hand, so each owner is checked by its effective hand.
  const notes=new Map(v.score.notes.map(n=>[n.id,n]));
  if(!v.score.notes.some(n=>n.personalHand?.assignmentId===digest)||v.score.notes.some(n=>n.personalHand&&n.personalHand.assignmentId!==digest))throw Error('Cached projection has other hands');
  for(const o of owners){if(o.hand===null)continue;const n=notes.get(o.id);if(!n||effectivePerformingHand(n)!==o.hand)throw Error('Cached projection has other hands');}
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
  const inputs=await coreInputs(snapshot,execution);
  return worker?.available?workerCore(worker,digest,inputs):localCore(inputs);
 }};
}
async function coreInputs(p:ScorePackage,execution?:ReadingExecution):Promise<ProjectionCoreInputs>{
 checkReadingExecution(execution);
 const recipe=await calculatedRecipeForRequest(p,execution),source=scoreWithCalculationContext(p.sourceScore??p.score,p.calculationContext,p.sourceSha256??p.manifest.semanticSha256);
 checkReadingExecution(execution);return {source,baseline:p.score,recipe};
}
/** Hand engines imports settled from their reading engraves, for the session
 * that opens each package; the session saves it to disk. One no session takes
 * goes with its package. */
const importedEngines=new WeakMap<ScorePackage,PersonalHandEngineState>();
/** An imported score was just engraved for reading; its hand engine starts
 * from that engrave instead of engraving the score a second time. ISO
 * notation adopts only the engrave the engine's own first preparation would
 * make, and resumes a saved engine only where it reproduces the pages. Any
 * other is refused (false), and hand editing engraves as before. */
export async function adoptImportedReading(base:ScorePackage,reading:AdmittedReading,input?:ReadingExecution):Promise<boolean>{
 if(!base.renderingRecipe||!base.sourceSha256)return false;
 const state=await adoptedEngine(base,reading,input?capturedReadingExecution(input):undefined);if(!state)return false;
 importedEngines.set(base,state);return true;
}
/** The settled hand engine `base` takes from its reading engrave, or
 * undefined when ISO notation refuses that engrave as the engine's own. */
async function adoptedEngine(base:ScorePackage,reading:AdmittedReading,execution?:ReadingExecution):Promise<PersonalHandEngineState|undefined>{
 const inputs=await coreInputs(base,execution);
 const core=createPersonalHandProjection(inputs.source,inputs.baseline,inputs.recipe);
 if(!(execution?await core.adoptReadingAsync(reading,execution):core.adoptReading(reading)))return undefined;
 const state=core.exportState();checkReadingExecution(execution);return state;
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
/** The engraver's answer that it cannot fit or draw these hands, raw or put
 * in the player's words. A lost worker, or an ownership, authority or recipe
 * failure, is not one: those still wait for recovery. */
export function engravingRefusal(error:unknown):boolean {
 const refusal=error instanceof HandPresentationError?error:error instanceof Error&&error.cause instanceof HandPresentationError?error.cause:undefined;
 return refusal?.code==='unsupported-fit'||refusal?.code==='unsupported-grace-hand';
}
/** Why the engraver could not draw a hand choice, in the player's words, as
 * a clause about the refused note ("shares a beam …"); undefined when ISO
 * notation gave no diagnosis this can state truthfully. */
export function undrawableHandReason(error:unknown):string|undefined {
 if(!undrawableHandOwners(error))return;
 const diagnostics=((error as Error).cause as HandPresentationError).context.diagnostics??[];
 // A hand change inside a written beam is marked by a short line from one
 // hand's note to the other's; ISO refuses rather than let it cross ink or
 // squeeze it between heads that are too close.
 const cue=diagnostics.filter(d=>d.code.startsWith('hand-transfer-cue'));
 if(!cue.length)return;
 return cue.some(d=>d.message.includes('touches other ink'))?
  'shares a beam with a note in the other hand, and the line that marks the change of hand would run into other notation':
  'shares a beam with a note in the other hand, and there is no room to draw the line that marks the change of hand';
}
/** At most one background preparation runs; a newer one, or opening another score, stops it. */
let prefetching:AbortController|undefined;
/** Edit-time engraving checks belong to the open score; opening another stops them. */
let scoreWork:AbortController|undefined;
export function cancelPersonalPrefetch(){prefetching?.abort();prefetching=undefined;scoreWork?.abort();scoreWork=undefined;}
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
 /** The engraver's latest stage while it settles for hand editing, so a
  * waiting hand choice can say what is happening rather than wait silently. */
 preparationStage?:PreparationStage;
 private stageListeners=new Set<(stage:PreparationStage)=>void>();
 onPreparationStage(listener:(stage:PreparationStage)=>void):()=>void{this.stageListeners.add(listener);return ()=>{this.stageListeners.delete(listener);};}
 private readonly noteStage=(stage:PreparationStage)=>{this.preparationStage=stage;for(const listener of this.stageListeners)try{listener(stage);}catch{/* a listener never stops the engraving */}};
 private prepare(){return this.preparation??=capture(this.base,this.worker).catch(error=>{this.preparation=undefined;throw error;});}
 private async use<V>(action:(core:Core,execution?:ReadingExecution)=>V|Promise<V>,execution?:ReadingExecution):Promise<V>{
  const request=await this.prepare();checkReadingExecution(execution);
  const result=await this.pool.use({...request,lease:this.lease},action,execution);this.lease=result.lease;return result.value;
 }
 /** Complete cold work ahead of key handling; shared execution may yield safely. */
 async warm(input?:ReadingExecution):Promise<void>{
  if(!this.base.renderingRecipe||!this.base.sourceSha256)return;
  const execution=input?capturedReadingExecution(input):undefined;checkReadingExecution(execution);
  try{if(await this.use((core,e)=>this.settle(core,e),execution))this.baseline=true;}
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
  this.prefetched=true;prefetching?.abort();
  const controller=new AbortController();prefetching=controller;
  void this.use((core,e)=>this.settle(core,e,true),{signal:controller.signal,onCheckpoint:this.noteStage}).then(settled=>{if(settled)this.baseline??=true;else this.prefetched=false;},error=>{
   this.prefetched=false;if(baselineRefusal(error))this.baseline=Error(CANNOT_DRAW,{cause:error});
  }).finally(()=>{if(prefetching===controller)prefetching=undefined;});
 }
 private checking?:Promise<boolean>;
 /** A finished check that left the baseline open (a mixed-hand key in the source pages). */
 private checked=false;
 get checkingHandChoices(){return !!this.checking;}
 /** Before a hand choice is saved: a score whose own engraving is refused
  * takes no hand choices, so a saved choice can never stop it opening. The
  * check settles the engraving where hand drawing runs (the worker, or
  * cooperatively here), which the first drawn choice needs anyway. */
 async ensureHandChoicesDrawable():Promise<boolean>{return await this.handChoiceCheck()??true;}
 /** The same check without a wait once it is known: undefined when a choice
  * may be saved at once, a throw when the score takes no hand choices, and
  * otherwise the running check (false when opening another score stopped it). */
 handChoiceCheck():Promise<boolean>|undefined{
  if(this.baseline instanceof Error)throw this.baseline;
  if(this.baseline!==undefined||this.checked||!this.base.renderingRecipe||!this.base.sourceSha256)return undefined;
  return (this.checking??=this.settleBaseline().then(done=>{if(done)this.checked=true;return done;}).finally(()=>{this.checking=undefined;})).then(checked=>{
   if(this.baseline instanceof Error)throw this.baseline;return checked;});
 }
 private async settleBaseline():Promise<boolean>{
  // Opening another score stops this check; an unfinished check settles nothing.
  try{if(await this.use((core,e)=>this.settle(core,e),{signal:(scoreWork??=new AbortController()).signal,onCheckpoint:this.noteStage}))this.baseline??=true;}
  catch(error){if(error instanceof DOMException&&error.name==='AbortError')return false;if(baselineRefusal(error))this.baseline=Error(CANNOT_DRAW,{cause:error});else if(!(error instanceof HandPresentationError))throw error;}
  return true;
 }
 /** A projection was refused. When the score's own engraving is what fails,
  * say so: no hand choice is at fault, so none is returned to the score. */
 private async refusal(error:unknown,execution?:ReadingExecution):Promise<never>{
  if(baselineRefusal(error)&&this.baseline===undefined&&this.base.renderingRecipe&&this.base.sourceSha256){
   try{if(await this.use((core,e)=>this.settle(core,e),execution))this.baseline=true;}
   catch(warmError){
    if(baselineRefusal(warmError))this.baseline=Error(CANNOT_DRAW,{cause:warmError});
    else if(!(warmError instanceof HandPresentationError))throw warmError;
   }
  }
  if(this.baseline instanceof Error)throw this.baseline;
  throw error;
 }
 /** The engine saved for this captured package, read once per session. */
 private savedEngine?:Promise<PersonalHandEngineState|undefined>;
 private engineWrite?:ReturnType<typeof setTimeout>;
 /** Settle the engraving for hand editing: from the engine saved on disk
  * when there is one that reproduces, else by engraving, which is then saved. */
 private async settle(core:Core,execution?:ReadingExecution,offThreadOnly=false):Promise<boolean>{
  const saved=await this.savedState(execution);checkReadingExecution(execution);
  const settled=await core.warm(execution,offThreadOnly,saved);
  // A settled core holds the engine now; the saved copy is not kept in memory.
  if(settled)this.savedEngine=Promise.resolve(undefined);
  // A restored engine, or one already settled from a saved copy, is on disk,
  // unless it came from the import.
  if(settled==='engraved'||settled==='restored'&&this.imported)this.rememberEngine();else if(settled==='restored'||settled==='already'&&saved&&!this.imported)this.engineSaved=true;
  return !!settled;
 }
 /** Whether the saved engine is the one adopted from this package's reading
  * engrave (its import, or its edition engraved again), not yet on disk. */
 private imported=false;
 private savedState(execution?:ReadingExecution):Promise<PersonalHandEngineState|undefined>{
  if(this.savedEngine)return this.savedEngine;
  const state=importedEngines.get(this.base);
  if(state){this.imported=true;importedEngines.delete(this.base);return this.savedEngine=Promise.resolve(state);}
  const cache=this.cache,saved=cache?this.engineKey().then(key=>cache.get(PERSONAL_ENGINE_CACHE_KIND,key,cachedEngine)).catch(()=>undefined):Promise.resolve(undefined);
  return this.savedEngine=saved.then(state=>state??this.engravedEngine(execution));
 }
 /** An edition this session just engraved again has no engine on disk, but
  * its reading engrave is the engine's own first preparation: adopting it
  * costs a repaint, not a second engrave. Adoption runs on the reader's
  * thread, so always cooperatively. A refusal engraves as before; a stopped
  * adoption keeps the engrave for the next settle. */
 private async engravedEngine(execution?:ReadingExecution):Promise<PersonalHandEngineState|undefined>{
  const recipe=this.base.renderingRecipe,reading=this.base.sourceSha256?takeEngravedReading(recipe):undefined;if(!reading)return undefined;
  try{const state=await adoptedEngine(this.base,reading,execution??{});if(state)this.imported=true;return state;}
  catch(error){
   if(!(error instanceof DOMException&&error.name==='AbortError'))return undefined;
   rememberEngravedReading(recipe!,reading);this.savedEngine=undefined;throw error;
  }
 }
 private async engineKey():Promise<string>{
  return hashBytes(JSON.stringify([PERSONAL_ENGINE_CACHE_KIND,(await this.prepare()).digest]));
 }
 /** Whether this session's engine is on disk: restored from it, or saved. */
 private engineSaved=false;
 private engineAttempts=0;
 /** The settled engine is saved once the reader is idle, once per session:
  * hand choices change only what the engine places, not what it restores. */
 private rememberEngine(){
  const cache=this.cache;if(!cache||this.engineSaved||this.engineWrite!==undefined||this.engineAttempts>=2)return;
  const write=()=>{
   const core=this.lease?.valid?this.lease.core:undefined;if(!core||this.engineSaved)return;
   // An engine the cache refuses (too large, or the disk fails) is tried once more, not after every choice.
   this.engineAttempts++;
   void core.save().then(async state=>{if(state&&await cache.put(PERSONAL_ENGINE_CACHE_KIND,await this.engineKey(),state))this.engineSaved=true;}).catch(()=>{});
  };
  this.engineWrite=setTimeout(()=>{this.engineWrite=undefined;if(typeof requestIdleCallback==='function')requestIdleCallback(write,{timeout:30000});else write();},this.cacheWriteDelayMs);
 }
 private async cacheKey():Promise<string>{
  return hashBytes(JSON.stringify([PERSONAL_PROJECTION_CACHE_KIND,(await this.prepare()).digest,PERSONAL_ANNOTATION_INK_POLICY]));
 }
 /** One entry per captured score holds its latest projection. It is written
  * once hand choices settle, never once per choice. */
 private remember(view:ProjectionView){
  const cache=this.cache;if(!cache)return;
  if(this.cacheWrite!==undefined)clearTimeout(this.cacheWrite);
  const value={score:view.score,pages:view.pages,seats:view.seats,annotationGeometry:view.annotationGeometry};
  const write=()=>{void this.cacheKey().then(key=>cache.put(PERSONAL_PROJECTION_CACHE_KIND,key,value)).catch(()=>{});};
  // Serializing pages is real work: it waits for the reader to be idle.
  this.cacheWrite=setTimeout(()=>{this.cacheWrite=undefined;if(typeof requestIdleCallback==='function')requestIdleCallback(write,{timeout:30000});else write();},this.cacheWriteDelayMs);
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
   // A saved engine settles the core first, so this choice only places what
   // changed, even when its projection is no longer on disk.
   result=await playerFacing(this.use(async(core,e)=>{if(await this.savedState(e))await this.settle(core,e);return core.project(owners,digest,e);},execution).catch(error=>this.refusal(error,execution)),
    UNDRAWABLE_HAND_CHOICES,
    "One key is written as two notes, and only one of them has a hand. Choose a hand for that key (L or R) to give it to both notes.");
   this.baseline??=true;this.remember(result);this.rememberEngine();
  }
  const view:ScorePackage={...this.base,score:result.score,pages:[...result.pages],seats:[...result.seats],annotationGeometry:result.annotationGeometry,personalAnnotationInkPolicy:PERSONAL_ANNOTATION_INK_POLICY};
  this.lastKey=key;this.lastView=view;return view;
 }
}
