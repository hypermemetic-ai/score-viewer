import {createPersonalHandProjection,type OwnerHand} from '../vendor/iso-notation/src/score-presentation';
import {scoreWithCalculationContext} from '../vendor/iso-notation/src/model/piano-calculation-context';
import {calculatedRecipeForRequest} from './calculated-hand-edition';
import {effectiveAssignments} from './personal-assignments';
import {hashBytes,type ScorePackage} from './package';
import type {PersonalState} from './state';
import {conservativeMaterialBytes} from './package-material';
import {PersonalPreparationPool,type PreparationLease,type PreparationRequest} from './personal-preparation-pool';
import {capturedReadingExecution,checkReadingExecution,type ReadingExecution} from './reading-execution';

type Core=ReturnType<typeof createPersonalHandProjection>;
const preparations=new PersonalPreparationPool<Core>();
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
async function capture(base:ScorePackage):Promise<PreparationRequest<Core>> {
 const snapshot=structuredClone(base),files=snapshot.files;
 const {files:ignored,...meaning}=snapshot;
 const identity=JSON.stringify(literal(meaning));
 const materialBytes=conservativeMaterialBytes(snapshot)+identity.length*2;
 const members=await Promise.all(Object.entries(files).map(async([name,bytes])=>[name,await hashBytes(bytes)]));
 const key=JSON.stringify([identity,members]);
 return {key,materialBytes,async produce(execution){
  checkReadingExecution(execution);
  const recipe=await calculatedRecipeForRequest(snapshot,execution),source=scoreWithCalculationContext(snapshot.sourceScore??snapshot.score,
   snapshot.calculationContext,snapshot.sourceSha256??snapshot.manifest.semanticSha256);
  checkReadingExecution(execution);return createPersonalHandProjection(source,snapshot.score,recipe);
 }};
}
/** A reader owns its package/wrapper/buffers and local last view. Shared cores
 * are captured, bounded and serialized; changed pages are never a paint shortcut. */
export class PersonalPresentationSession {
 private preparation?:Promise<PreparationRequest<Core>>;
 private lease?:PreparationLease<Core>;
 private lastKey?:string;
 private lastView?:ScorePackage;
 private readonly base:ScorePackage;
 private readonly pool:PersonalPreparationPool<Core>;
 constructor(base:ScorePackage,pool=preparations){this.base=base;this.pool=pool;}
 private prepare(){return this.preparation??=capture(this.base).catch(error=>{this.preparation=undefined;throw error;});}
 private async use<V>(action:(core:Core,execution?:ReadingExecution)=>V|Promise<V>,execution?:ReadingExecution):Promise<V>{
  const request=await this.prepare();checkReadingExecution(execution);
  const result=await this.pool.use({...request,lease:this.lease},action,execution);this.lease=result.lease;return result.value;
 }
 /** Complete cold work ahead of key handling; shared execution may yield safely. */
 async warm(input?:ReadingExecution):Promise<void>{
  if(!this.base.renderingRecipe||!this.base.sourceSha256)return;
  const execution=input?capturedReadingExecution(input):undefined;checkReadingExecution(execution);
  await this.use((core,e)=>e?core.warmAsync(e):core.warm(),execution);
 }
 async project(personal:PersonalState,input?:ReadingExecution):Promise<ScorePackage>{
  const execution=input?capturedReadingExecution(input):undefined;checkReadingExecution(execution);
  const owners:OwnerHand[]=effectiveAssignments(this.base,personal).map(({id,pitch,startTick,durationTicks,hand})=>({id,pitch,startTick,durationTicks,hand}));
  if(owners.every(a=>this.base.score.notes.find(n=>n.id===a.id)?.hand===a.hand))return this.base;
  const key=JSON.stringify(owners);
  if(key===this.lastKey&&this.lastView)return this.lastView;
  const digest=await hashBytes(key);checkReadingExecution(execution);
  const result=await this.use((core,e)=>e?core.projectAsync(owners,digest,e):core.project(owners,digest),execution);
  const view:ScorePackage={...this.base,score:result.score,pages:[...result.pages],seats:[...result.seats],annotationGeometry:result.annotationGeometry};
  this.lastKey=key;this.lastView=view;return view;
 }
}
