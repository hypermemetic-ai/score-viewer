import {strFromU8,strToU8,zipSync} from 'fflate';
import {prepareFrettedViews,prepareFrettedViewsAsync,FRETTED_ISO_ENGINE,FRETTED_TAB_ENGINE,validateInstrumentReadingScore,
 type FrettedReadingScene,type IsoLayoutOptions,type IsoTokens,type ReadingOwner} from '../vendor/iso-notation/src/score-presentation';
import type {QuantizedGridScore,InstrumentReadingPolicy} from '../vendor/iso-notation/src/model/types';
import {hashBytes,importPackageForReading,type Manifest,type Metadata,type ScorePackage} from './package';
import type {ReadingContent} from './reading-package';
import {capturedReadingExecution,checkReadingExecution,drainReadingChecks,type ReadingExecution} from './reading-execution';
import type {PreparationStage} from '../vendor/iso-notation/src/score-presentation';

export type ReadingNotation='iso'|'tab';
type PreparedViews=ReturnType<typeof prepareFrettedViews>;
export interface DualReadingViewDescriptor {
 engineId:PreparedViews[ReadingNotation]['engineId'];
 pages:string[];owners:string;scene:string;geometry:string;
}
export interface DualReadingDescriptor {
 version:'instrument-reading-package-v2';sourcePartId:string;sourceStaffId:string;
 policy:InstrumentReadingPolicy;options:Partial<IsoLayoutOptions>;tokens:Partial<IsoTokens>;
 views:Record<ReadingNotation,DualReadingViewDescriptor>;
}
export interface DualReadingView {
 engineId:string;pages:string[];owners:ReadingOwner[];scene:FrettedReadingScene;
 geometryEvidence:PreparedViews['iso']['geometryEvidence'];
}
export interface DualReadingContent {
 version:'fretted-reading-content-v1';sourcePartId:string;sourceStaffId:string;
 notation:ReadingNotation;views:Record<ReadingNotation,DualReadingView>;
 /** Generic musical intake proves no instrument family. Converter admission
  * is a separate receiving operation, never an inference from score labels. */
 instrumentFamily:'unknown';
}

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exactKeys=(v:unknown,keys:readonly string[])=>object(v)&&Object.keys(v).length===keys.length&&keys.every(k=>k in v);
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
// Realm-local successful replay, never serialized or supplied by a caller.
// Mutable forged/cloned content cannot become a selectable presentation.
interface AdmittedViews {score:QuantizedGridScore;manifest:Manifest;reading:ReadingContent}
const admittedViews=new WeakMap<ReadingContent,AdmittedViews>();
const frozenData=new WeakSet<object>();
function literalCopy<T>(input:T):T {
 const copied=new WeakMap<object,unknown>(),active=new WeakSet<object>();
 const copy=(value:unknown):unknown=>{
  if(typeof value==='function'||typeof value==='symbol'||typeof value==='bigint')throw Error('Dual reading requires literal data.');
  if(!value||typeof value!=='object')return value;
  if(value instanceof Uint8Array)return new Uint8Array(value);
  if(active.has(value))throw Error('Dual reading requires acyclic literal data.');
  if(copied.has(value))return copied.get(value);
  const result:Array<unknown>|Record<string,unknown>=Array.isArray(value)?[]:{};active.add(value);copied.set(value,result);
  for(const key of Reflect.ownKeys(value)){
   const descriptor=Object.getOwnPropertyDescriptor(value,key);
   if(typeof key!=='string'||!descriptor||!('value' in descriptor))throw Error('Dual reading cannot admit callable or accessor authority.');
   if(Array.isArray(value)&&key==='length')continue;
   Object.defineProperty(result,key,{value:copy(descriptor.value),enumerable:descriptor.enumerable,writable:true,configurable:true});
  }
  active.delete(value);return result;
 };
 return copy(input) as T;
}
function freezeGraph(value:unknown,seen=new WeakSet<object>()){
 if(typeof value==='function'||typeof value==='symbol'||typeof value==='bigint')throw Error('Dual reading requires literal data.');
 if(!value||typeof value!=='object'||frozenData.has(value))return;
 if(seen.has(value))throw Error('Dual reading requires acyclic literal data.');
 seen.add(value);
 for(const key of Reflect.ownKeys(value)){
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  if(typeof key!=='string'||!descriptor||!('value' in descriptor))throw Error('Dual reading cannot admit callable or accessor authority.');
  freezeGraph(descriptor.value,seen);
 }
 seen.delete(value);Object.freeze(value);frozenData.add(value);
}
const forbidden=['keyboardLayout','presentations','fingerGeometry','renderingRecipe','calculationContext','preparationIdentity','calculatedHandReceipt',
 'transposition','effectiveHandSha256','profileId','profileSha256','layerSourceHash','referenceMidi','sourceScore','sourceRevision','sourceSha256'];
function scoreBounds(score:QuantizedGridScore){
 if(!score||!Array.isArray(score.notes)||score.notes.length>10000||!Array.isArray(score.sourceBarTicks)||score.sourceBarTicks.length>2001||
  !score.sourceWrittenComponents||score.sourceWrittenComponents.components.length>100000)
  throw Error('Dual reading requires bounded complete source components and measures.');
 validateInstrumentReadingScore(score);
}
function checkedViews(score:QuantizedGridScore,options:Partial<IsoLayoutOptions>,tokens:Partial<IsoTokens>){
 scoreBounds(score);return completeViews(score,prepareFrettedViews(score,options,tokens));
}
function completeViews(score:QuantizedGridScore,result:PreparedViews){
 for(const kind of ['iso','tab'] as const){const view=result[kind];
  if(!view.pages.length||view.pages.length>500||!view.geometryEvidence.ok||view.geometryEvidence.violations.length||view.geometryEvidence.warnings.length)
   throw Error('Dual reading '+kind.toUpperCase()+' needs complete clear source-owned geometry.');
  if(view.scene.components.length!==score.sourceWrittenComponents!.components.length||view.owners.length!==score.notes.length)
   throw Error('Dual reading has incomplete musical ownership.');
 }
 return result;
}
function parse(files:Record<string,Uint8Array>,name:string){
 try{if(!files[name])throw Error();return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(files[name]));}
 catch{throw Error('Missing or invalid dual reading JSON: '+name);}
}
function content(prepared:PreparedViews):ReadingContent {
 const views=Object.fromEntries((['iso','tab'] as const).map(kind=>[kind,{engineId:prepared[kind].engineId,pages:prepared[kind].pages,
  owners:prepared[kind].owners,scene:prepared[kind].scene,geometryEvidence:prepared[kind].geometryEvidence}])) as DualReadingContent['views'];
 return {owners:views.iso.owners,layoutMetadata:[],geometryEvidence:views.iso.geometryEvidence as ReadingContent['geometryEvidence'],
  dual:{version:'fretted-reading-content-v1',sourcePartId:prepared.sourcePartId,sourceStaffId:prepared.sourceStaffId,
   notation:'iso',views,instrumentFamily:'unknown'}};
}
/** Exact receiving-realm replay of BOTH presentations. A page hash or saved
 * geometry certificate never substitutes for this shared-source preparation. */
function captureDualSource(m:Manifest,files:Record<string,Uint8Array>){
 const d=m.reading;
 if(!d||d.version!=='instrument-reading-package-v2'||!exactKeys(d,['version','sourcePartId','sourceStaffId','policy','options','tokens','views'])||
  !exactKeys(d.views,['iso','tab'])||!object(d.options)||!object(d.tokens)||forbidden.some(k=>k in m)||files['fingers.json']||
  m.files[m.font]!=='5b009410cf5231dcb1e45b155c1afedcfc63d82042fd8c414d0dd7705c9fbbae'||!m.notices.length||
  strFromU8(files['seats.json']??strToU8('null'))!=='[]')throw Error('Unsupported or incomplete dual reading package.');
 const score=parse(files,'score.json') as QuantizedGridScore;
 scoreBounds(score);
 if(score.id!==m.scoreId||score.title!==m.metadata.title||score.composer!==m.metadata.composer||!same(score.readingPolicy,d.policy)||
  m.engineVersion!==FRETTED_ISO_ENGINE||!same(m.pages,d.views.iso.pages))throw Error('Dual reading source identity or default presentation differs.');
 return {score,descriptor:d};
}
function* finishDualReading(m:Manifest,files:Record<string,Uint8Array>,score:QuantizedGridScore,prepared:PreparedViews):Generator<PreparationStage,{score:QuantizedGridScore;pages:string[];reading:ReadingContent;manifest:Manifest},void>{
 const d=m.reading as DualReadingDescriptor;
 if(d.sourcePartId!==prepared.sourcePartId||d.sourceStaffId!==prepared.sourceStaffId)throw Error('Dual reading selected source part differs.');
 const allNames=new Set<string>();
 for(const kind of ['iso','tab'] as const){const descriptor=d.views[kind],view=prepared[kind],prefix=`reading/${kind}/`;
  if(!exactKeys(descriptor,['engineId','pages','owners','scene','geometry'])||descriptor.engineId!==view.engineId||
   descriptor.owners!==prefix+'owners.json'||descriptor.scene!==prefix+'scene.json'||descriptor.geometry!==prefix+'geometry.json'||
   !Array.isArray(descriptor.pages)||descriptor.pages.length!==view.pages.length||
   descriptor.pages.some((name,i)=>name!==prefix+`pages/${i+1}.svg`))throw Error('Unsupported dual reading view descriptor.');
  for(const name of [...descriptor.pages,descriptor.owners,descriptor.scene,descriptor.geometry]){
   if(allNames.has(name)||!files[name]||!m.files[name])throw Error('Missing or duplicate dual reading member.');allNames.add(name);
  }
  if(!same(parse(files,descriptor.owners),view.owners)||!same(parse(files,descriptor.scene),view.scene)||
   !same(parse(files,descriptor.geometry),view.geometryEvidence))throw Error('Dual reading ownership, scene or geometry differs from shared preparation.');
  yield 'geometry';
  for(const[name,i]of descriptor.pages.map((name,i)=>[name,i] as const)){if(strFromU8(files[name])!==view.pages[i])throw Error('Dual reading page differs from shared preparation: '+name);yield 'paint';}
 }
 yield 'commit';
 const reading=content(prepared);
 freezeGraph(score);freezeGraph(m);freezeGraph(reading);
 admittedViews.set(reading,{score,manifest:m,reading});
 return {score,pages:prepared.iso.pages,reading,manifest:m};
}
export function admitDualReadingContent(m:Manifest,files:Record<string,Uint8Array>){
 const {score,descriptor}=captureDualSource(m,files),steps=finishDualReading(m,files,score,checkedViews(score,descriptor.options,descriptor.tokens));
 for(;;){const next=steps.next();if(next.done){const {manifest:_manifest,...reading}=next.value;return reading;}}
}
export async function admitDualReadingContentAsync(inputManifest:Manifest,inputFiles:Record<string,Uint8Array>,inputExecution:ReadingExecution){
 const m=literalCopy(inputManifest),files=literalCopy(inputFiles),execution=capturedReadingExecution(inputExecution),{score,descriptor}=captureDualSource(m,files);
 checkReadingExecution(execution);
 const prepared=completeViews(score,await prepareFrettedViewsAsync(score,descriptor.options,descriptor.tokens,execution));
 return drainReadingChecks(finishDualReading(m,files,score,prepared),execution);
}

/** One owned graph before asynchronous hashing. This path remains generic
 * MusicXML/source intake and does not manufacture a Guitar Pro family claim. */
export interface DualReadingPreparationInput {score:QuantizedGridScore;metadata:Metadata;createdAt:string;
 font:{name:string;bytes:Uint8Array};notices:Record<string,Uint8Array>;retainedFiles?:Record<string,Uint8Array>;options?:Partial<IsoLayoutOptions>;tokens?:Partial<IsoTokens>}
export interface DualReadingPacket {bytes:Uint8Array;package:ScorePackage}
/** Includes the existing independent final cold receiving result; a caller
 * does not need to replay a third time just to retain its actual scene context. */
export async function prepareDualReadingPacket(input:DualReadingPreparationInput,inputExecution?:ReadingExecution):Promise<DualReadingPacket>{
 const owned=literalCopy(input),score=owned.score,execution=inputExecution?capturedReadingExecution(inputExecution):undefined;checkReadingExecution(execution);
 if(!owned.createdAt||owned.metadata.title!==score.title||owned.metadata.composer!==score.composer||!owned.font.name||
  !owned.font.bytes.length||!Object.keys(owned.notices).length)throw Error('Incomplete dual reading preparation.');
 scoreBounds(score);
 const prepared=execution?completeViews(score,await prepareFrettedViewsAsync(score,owned.options??{},owned.tokens??{},execution)):checkedViews(score,owned.options??{},owned.tokens??{});checkReadingExecution(execution);
 const files:Record<string,Uint8Array>={
  'score.json':strToU8(JSON.stringify(score)),'seats.json':strToU8('[]')};
 const put=(name:string,bytes:Uint8Array)=>{
  if(name==='manifest.json'||name in files||!/^[A-Za-z0-9_./-]+$/.test(name)||name.includes('..')||name.startsWith('/'))
   throw Error('Conflicting or unsafe dual reading member: '+name);files[name]=new Uint8Array(bytes);
 };
 put(owned.font.name,owned.font.bytes);for(const [name,bytes]of Object.entries(owned.notices))put(name,bytes);
 for(const [name,bytes]of Object.entries(owned.retainedFiles??{}))put(name,bytes);
 const views={} as DualReadingDescriptor['views'];
 for(const kind of ['iso','tab'] as const){const p=prepared[kind],prefix=`reading/${kind}/`,
  descriptor: DualReadingViewDescriptor={engineId:p.engineId,pages:[],owners:prefix+'owners.json',scene:prefix+'scene.json',geometry:prefix+'geometry.json'};
  put(descriptor.owners,strToU8(JSON.stringify(p.owners)));put(descriptor.scene,strToU8(JSON.stringify(p.scene)));
  put(descriptor.geometry,strToU8(JSON.stringify(p.geometryEvidence)));
  descriptor.pages=p.pages.map((svg,i)=>{const name=prefix+`pages/${i+1}.svg`;put(name,strToU8(svg));return name;});views[kind]=descriptor;
 }
 const revision=await hashBytes(files['score.json']),m:Manifest={format:'iso-score',version:3,scoreId:score.id,revision,semanticSha256:revision,
  engineVersion:FRETTED_ISO_ENGINE,metadata:owned.metadata,createdAt:owned.createdAt,pages:views.iso.pages,font:owned.font.name,notices:Object.keys(owned.notices),files:{},
  reading:{version:'instrument-reading-package-v2',sourcePartId:prepared.sourcePartId,sourceStaffId:prepared.sourceStaffId,
   policy:score.readingPolicy!,options:prepared.iso.options,tokens:prepared.iso.tokens,views}};
 m.files=Object.fromEntries(await Promise.all(Object.entries(files).map(async([name,bytes])=>[name,await hashBytes(bytes)])));
 checkReadingExecution(execution);files['manifest.json']=strToU8(JSON.stringify(m));const bytes=zipSync(files,{level:6});checkReadingExecution(execution);const packageValue=await importPackageForReading(bytes,execution);checkReadingExecution(execution);return {bytes,package:packageValue};
}

/** Legacy byte-only entry retains exactly the same builder and cold replay. */
export async function prepareDualReadingPackage(input:DualReadingPreparationInput):Promise<Uint8Array>{
 return (await prepareDualReadingPacket(input)).bytes;
}

/** Presentation choice never rewrites the canonical manifest, source bytes,
 * recipe or musical progress identity. The caller saves only its view cursor. */
export function selectReadingNotation(p:ScorePackage,notation:ReadingNotation):ScorePackage {
 if(notation!=='iso'&&notation!=='tab')throw Error('Unsupported reading notation.');
 const inputReading=p.reading,admission=inputReading&&admittedViews.get(inputReading);
 if(!admission||p.score!==admission.score||p.manifest!==admission.manifest)
  throw Error('Dual notation must retain its actual receiving-realm admission.');
 // Only private immutable replay output supplies the selected geometry.
 // Caller packages, serializers, accessors and Proxy views supply no new ink.
 const dual=admission.reading.dual!,view=dual.views[notation],
  reading:ReadingContent={...admission.reading,owners:view.owners,
   geometryEvidence:view.geometryEvidence as ReadingContent['geometryEvidence'],dual:{...dual,notation}};
 freezeGraph(reading);admittedViews.set(reading,admission);
 return {...p,score:admission.score,manifest:admission.manifest,pages:view.pages,reading};
}
