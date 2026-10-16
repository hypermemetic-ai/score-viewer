import type {ConversionSuccess,SourceTrackInfo,GuitarProReport} from 'score-converter-proof/guitar-pro/webview';
import {parseMusicXmlAsync,projectMusicXml} from '../vendor/iso-notation/src/musicxml';
import identity from '../vendor/score-converter/source-package-identity.json';
import {hashBytes,type ScorePackage,type Metadata} from './package';
import {selectReadingNotation} from './dual-reading-package';
import {assertGuitarProArchive} from './guitar-pro-archive';
import {guitarProRuntime} from './guitar-pro-runtime';
import {assertGuitarProStagedMaterial} from './guitar-pro-material';
import {GUITAR_PRO_FILES,GuitarProImportRefusal,guitarProFamilyRefusal,type GuitarProInspection,type GuitarProSourceIdentity,type GuitarProContext,
 type GuitarProStageOptions,type GuitarProColdOptions,type GuitarProPreparedInput,type StagedGuitarProImport} from './guitar-pro-types';
export * from './guitar-pro-types';

const converterArchiveSha256=identity.archive.sha256,converterSourceTree=identity.sourceTree;
const MAX_BYTES=8*1024*1024,encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const typedArrayPrototype=Object.getPrototypeOf(Uint8Array.prototype),byteLength=Object.getOwnPropertyDescriptor(typedArrayPrototype,'byteLength')!.get!,
 byteOffset=Object.getOwnPropertyDescriptor(typedArrayPrototype,'byteOffset')!.get!,bufferOf=Object.getOwnPropertyDescriptor(typedArrayPrototype,'buffer')!.get!;
const inspections=new WeakMap<GuitarProInspection,{bytes:Uint8Array;tracks:readonly SourceTrackInfo[]}>();
const contexts=new WeakMap<object,{score:ScorePackage['score'];context:GuitarProContext}>();
let activeOperation=false;
function aborted(signal?:AbortSignal){if(signal?.aborted)throw new DOMException('Guitar Pro operation canceled.','AbortError');}
function copiedBytes(value:Uint8Array,max=MAX_BYTES):Uint8Array{
 // Intrinsic view getters and set avoid overridden iterator/slice methods.
 let size:number,offset:number,buffer:ArrayBuffer;
 try{size=byteLength.call(value);offset=byteOffset.call(value);buffer=bufferOf.call(value);}catch{throw Error('Guitar Pro requires a byte view.');}
 if(!(value instanceof Uint8Array)||!Number.isSafeInteger(size)||size<1||size>max||!(buffer instanceof ArrayBuffer))throw Error('Guitar Pro bytes exceed the supported input bound.');
 const result=new Uint8Array(size);Uint8Array.prototype.set.call(result,new Uint8Array(buffer,offset,size));return result;
}
function selectedIds(value:readonly string[],tracks:readonly SourceTrackInfo[]):string[]{
 if(!Array.isArray(value)||value.length<1||value.length>8)throw Error('Choose one to eight source tracks.');
 const ids:string[]=[];
 for(let index=0;index<value.length;index++){
  const d=Object.getOwnPropertyDescriptor(value,String(index));
  if(!d||!('value'in d)||typeof d.value!=='string'||!/^\d{1,6}$/.test(d.value)||ids.includes(d.value)||!tracks.some(t=>t.sourceId===d.value))
   throw Error('Unsupported or duplicate Guitar Pro source track.');
  ids.push(d.value);
 }
 return ids;
}
async function serialized<T>(signal:AbortSignal|undefined,work:()=>Promise<T>):Promise<T>{
 if(activeOperation)throw Error('Another Guitar Pro receiving operation is active.');
 activeOperation=true;
 try{aborted(signal);return await work();}finally{activeOperation=false;}
}
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
function freeze<T>(value:T):T{if(value&&typeof value==='object'){for(const v of Object.values(value))freeze(v);Object.freeze(value);}return value;}
async function checkpoint(options:GuitarProColdOptions){aborted(options.signal);await options.checkpoint?.();aborted(options.signal);}
function family(result:ConversionSuccess,trackId:string):{family:'guitar'|'bass';profile:string;partId:string}{
 const r=result.report,parts=r.convertedParts;
 if(r.inputSha256!==result.inputSource.sha256||parts.length!==1||r.requestedScope==='all-tracks'||!same(r.requestedScope.trackIds,[trackId]))
  throw Error('Converter did not return the exact selected source scope.');
 const p=parts[0],a=p.admission;
 if(p.sourceTrackId===trackId){const refusal=guitarProFamilyRefusal(a.instrumentFamily,result.scoreKind);if(refusal)throw Error(refusal);}
 if(p.sourceTrackId!==trackId||!p.musicxmlPartId||(a.instrumentFamily!=='guitar'&&a.instrumentFamily!=='bass')||a.profile!==r.profile||
  result.score.parts.length!==1||result.score.parts[0].id!==trackId||!Array.isArray(a.evidenceFindingIndices)||a.evidenceFindingIndices.length>256)
  throw Error('Converter part mapping or admission differs from its report.');
 let located=false;
 for(const index of a.evidenceFindingIndices){
  if(!Number.isSafeInteger(index)||index<0||index>=r.findings.length)throw Error('Converter admission refers to absent evidence.');
  const f=r.findings[index],fact=f.fact as Record<string,unknown>|undefined;
  if(f.code==='instrument-admitted'&&f.disposition==='preserved'&&(f.location?.trackId??f.location?.id)===trackId&&
   fact?.sourceTrackId===trackId&&fact.instrumentFamily===a.instrumentFamily&&fact.profile===a.profile)located=true;
 }
 if(!located)throw Error('Converter family has no located successful admission evidence.');
 return {family:a.instrumentFamily,profile:a.profile,partId:p.musicxmlPartId};
}
async function projected(result:Pick<ConversionSuccess,'musicxml'>,source:GuitarProSourceIdentity){
 const written=await parseMusicXmlAsync(result.musicxml,'guitar-pro/converted.musicxml',{frettedSource:'retain-v1'});
 if(written.parts?.length!==1||written.parts[0].id!==source.musicxmlPartId)throw Error('Converted MusicXML does not assign the selected source part.');
 return projectMusicXml(written,{id:source.scoreId,readingPolicy:{version:'instrument-reading-v2',partId:source.musicxmlPartId,
  centerPitch:24,guidePitches:[12,24,36],pitchFolding:'literal',stemPolicy:'outward',stemDirectionSemantics:'visual'}}).score;
}
async function sourceIdentity(inputSha256:string,sourceTrackId:string,musicxmlPartId:string):Promise<GuitarProSourceIdentity>{
 return freeze({version:'viewer-guitar-pro-source-v1',inputSha256,sourceTrackId,musicxmlPartId,
 scoreId:`gp-${inputSha256}-${sourceTrackId}`,groupId:await hashBytes(`viewer-gp-group-v1\n${inputSha256}\n${converterArchiveSha256}`),
 converterArchiveSha256,converterSourceTree,
 projection:'portable-musicxml-retain-v1/shared-c2-outward-v1'});
}
function assertDual(p:ScorePackage,score:ScorePackage['score'],source:GuitarProSourceIdentity){
 const current=selectReadingNotation(p,p.reading?.dual?.notation??'iso');selectReadingNotation(p,'iso');selectReadingNotation(p,'tab');
 if(!same(p.pages,current.pages))throw Error('Receiving package exposes stale or foreign pages.');
 if(!same(p.score,score)||p.manifest.scoreId!==source.scoreId||p.manifest.reading?.version!=='instrument-reading-package-v2'||
  p.manifest.reading.sourcePartId!==source.musicxmlPartId)throw Error('Receiving dual admission does not match the converted source.');
}
function retained(result:Pick<ConversionSuccess,'musicxml'|'report'>,bytes:Uint8Array,source:GuitarProSourceIdentity):Record<string,Uint8Array>{
 return {[GUITAR_PRO_FILES.original]:copiedBytes(bytes),[GUITAR_PRO_FILES.xml]:encoder.encode(result.musicxml),
 [GUITAR_PRO_FILES.report]:encoder.encode(JSON.stringify(result.report)),[GUITAR_PRO_FILES.descriptor]:encoder.encode(JSON.stringify(source))};
}
function bind(p:ScorePackage,source:GuitarProSourceIdentity,admission:ReturnType<typeof family>,sourceName?:string){
 const context=freeze({...source,...{family:admission.family,profile:admission.profile},...(sourceName?{sourceName}:{})});
 contexts.set(p.manifest,{score:p.score,context});return context;
}
type MaterialCheck=(pending:unknown)=>void;
/** Consume the actual public result in this scope. Its complete intermediate
 * converter model is not retained after the located part admission is checked. */
async function selectedConversion(api:Awaited<ReturnType<typeof guitarProRuntime>>,bytes:Uint8Array,id:string,inputSha256:string,
 signal?:AbortSignal,budget?:MaterialCheck){
 const result=await api.convertGuitarPro(bytes,{trackIds:[id],signal});aborted(signal);
 if(!result.ok)throw new GuitarProImportRefusal(result.report,'Selected Guitar Pro source track refused.');
 if(result.report.inputSha256!==inputSha256)throw Error('Guitar Pro conversion changed the retained original.');
 budget?.(result);
 return {musicxml:result.musicxml,report:result.report,admission:family(result,id),sourceName:result.score.parts[0].name};
}
async function convertedInput(api:Awaited<ReturnType<typeof guitarProRuntime>>,bytes:Uint8Array,id:string,inputSha256:string,
 signal:AbortSignal|undefined,budget:MaterialCheck):Promise<GuitarProPreparedInput>{
 const result=await selectedConversion(api,bytes,id,inputSha256,signal,budget),source=await sourceIdentity(inputSha256,id,result.admission.partId),
  score=await projected(result,source);
 budget({result,source,score});
 const files=retained(result,bytes,source),metadata:Metadata={title:score.title,composer:score.composer,
  provenance:['Retained Guitar Pro original; public source-track conversion; independent ISO and TAB admission.']};
 budget({result,source,score,files,metadata});
 return {score,metadata,retainedFiles:files,sourceIdentity:source};
}
/** The input projection/member snapshots expire before the next public cold
 * replay. Only the actual admitted package and its matched archive escape. */
async function preparedPart(input:GuitarProPreparedInput,prepare:GuitarProStageOptions['prepareAndAdmit'],
 signal:AbortSignal|undefined,budget:MaterialCheck,paint:GuitarProColdOptions['checkpoint']){
 await checkpoint({signal,checkpoint:paint});budget(input);
 const prepared=await prepare(input,signal);aborted(signal);budget({input,prepared});
 const archive=copiedBytes(prepared.bytes,64*1024*1024);budget({input,prepared,archive});
 assertDual(prepared.package,input.score,input.sourceIdentity);
 for(const [name,expected]of Object.entries(input.retainedFiles))if(!prepared.package.files[name]||await hashBytes(prepared.package.files[name])!==await hashBytes(expected))
  throw Error('Dual preparation did not retain the exact Guitar Pro source closure.');
 await assertGuitarProArchive(prepared.package,archive,signal);
 return {package:prepared.package,bytes:archive};
}
/** Public discovery always runs against our bounded owned original snapshot. */
export async function inspectGuitarProSource(bytes:Uint8Array,options:GuitarProColdOptions={}):Promise<GuitarProInspection>{
 const owned=copiedBytes(bytes),signal=options.signal,paint=options.checkpoint;
 return serialized(signal,async()=>{
  await checkpoint({signal,checkpoint:paint});const publicApi=await guitarProRuntime(),inputSha256=await hashBytes(owned);
  aborted(signal);const result=await publicApi.inspectGuitarPro(owned,{signal});aborted(signal);
  if(!result.ok)throw new GuitarProImportRefusal(result.report,'Guitar Pro inspection refused.');
  if(result.report.inputSha256!==inputSha256||result.tracks.length>64)throw Error('Guitar Pro inspection input or inventory differs.');
  const inspection=freeze({inputSha256,tracks:result.tracks,report:result.report}) as GuitarProInspection;
  inspections.set(inspection,{bytes:owned,tracks:result.tracks});return inspection;
 });
}
/** Stage all selected parts without a managed write. Each public conversion has
 * a single source track, preserving identities across future part selection. */
export async function stageGuitarProParts(inspection:GuitarProInspection,trackIds:readonly string[],options:GuitarProStageOptions):Promise<StagedGuitarProImport>{
 const retainedInput=inspections.get(inspection);if(!retainedInput)throw Error('Guitar Pro discovery belongs to a different receiving operation.');
 const ids=selectedIds(trackIds,retainedInput.tracks),signal=options.signal,paint=options.checkpoint,prepare=options.prepareAndAdmit;
 if(typeof prepare!=='function')throw Error('Guitar Pro requires independent dual preparation.');
 return serialized(signal,async()=>{
  const publicApi=await guitarProRuntime(),parts:StagedGuitarProImport['parts'][number][]=[];
  const budget=(pending:unknown)=>assertGuitarProStagedMaterial({retainedInput,inspection,parts},pending);
  budget(undefined);
  for(let index=0;index<ids.length;index++){
   const id=ids[index];
   await checkpoint({signal,checkpoint:paint});
   const prepared=await preparedPart(await convertedInput(publicApi,retainedInput.bytes,id,inspection.inputSha256,signal,budget),prepare,signal,budget,paint);
   // Grant only after a SECOND actual public converter replay against admitted retained bytes.
   const context=await replayGuitarProContext(prepared.package,{signal,checkpoint:paint},pending=>budget({prepared,pending}));aborted(signal);
   budget({prepared,context});
   parts.push(Object.freeze({sourceTrackId:id,...prepared,context}));
  }
  return Object.freeze({groupId:parts[0].context.groupId,inputSha256:inspection.inputSha256,parts:Object.freeze(parts)});
 });
}
/** Cold receiving admission. Serialized descriptors and labels never grant
 * authority: exact original/scope/public replay must agree with both views. */
async function replayGuitarProContext(p:ScorePackage,options:GuitarProColdOptions={},budget?:MaterialCheck):Promise<GuitarProContext>{
 const signal=options.signal,paint=options.checkpoint,files=Object.fromEntries(Object.values(GUITAR_PRO_FILES).map(name=>{
  if(!p.files[name]||!p.manifest.files[name])throw Error('Missing retained Guitar Pro source member: '+name);
  return [name,copiedBytes(p.files[name],name===GUITAR_PRO_FILES.original?MAX_BYTES:name===GUITAR_PRO_FILES.descriptor?8192:16*1024*1024)];
 }));
 selectReadingNotation(p,'iso');selectReadingNotation(p,'tab');
 const source=JSON.parse(decoder.decode(files[GUITAR_PRO_FILES.descriptor])) as GuitarProSourceIdentity;
 if(!source||typeof source!=='object'||typeof source.sourceTrackId!=='string'||!/^\d{1,6}$/.test(source.sourceTrackId))throw Error('Unsupported Guitar Pro source descriptor.');
 budget?.({files,source});
 await checkpoint({signal,checkpoint:paint});
 for(const[name,bytes]of Object.entries(files))if(await hashBytes(bytes)!==p.manifest.files[name])throw Error('Retained Guitar Pro member hash differs.');
 const inputSha=await hashBytes(files[GUITAR_PRO_FILES.original]),publicApi=await guitarProRuntime();aborted(signal);
 const result=await selectedConversion(publicApi,files[GUITAR_PRO_FILES.original],source.sourceTrackId,inputSha,signal,pending=>budget?.({files,source,pending})),
  admission=result.admission,expected=await sourceIdentity(inputSha,source.sourceTrackId,admission.partId);
 if(!same(source,expected)||result.report.inputSha256!==inputSha||result.musicxml!==decoder.decode(files[GUITAR_PRO_FILES.xml])||
  !same(result.report,JSON.parse(decoder.decode(files[GUITAR_PRO_FILES.report]))))throw Error('Cold Guitar Pro source, mapping or report differs from public replay.');
 const score=await projected(result,expected);budget?.({files,source,result,expected,score});
 await checkpoint({signal,checkpoint:paint});assertDual(p,score,expected);
 aborted(signal);return bind(p,expected,admission,result.sourceName);
}
export function guitarProContext(p:ScorePackage):GuitarProContext|undefined{
 const admitted=contexts.get(p.manifest);if(!admitted)return undefined;
 selectReadingNotation(p,'iso');selectReadingNotation(p,'tab');
 if(admitted.score!==p.score)throw Error('Guitar Pro source identity no longer matches its receiving context.');
 return admitted.context;
}

/** Exact cold replay needs the converter that prepared the retained source.
 * A package from an earlier converter still opens through ordinary package
 * admission, but receives no Guitar/Bass source authority. A descriptor that
 * claims an earlier converter therefore only withholds a context. */
export function guitarProPreparedByEarlierConverter(p:ScorePackage):boolean{
 const bytes=p.files[GUITAR_PRO_FILES.descriptor];if(!bytes||!p.manifest.files[GUITAR_PRO_FILES.descriptor]||bytes.byteLength>8192)return false;
 let source:Partial<GuitarProSourceIdentity>|undefined;
 try{source=JSON.parse(decoder.decode(bytes));}catch{return false;}
 return source?.version==='viewer-guitar-pro-source-v1'&&typeof source.converterArchiveSha256==='string'&&
  /^[0-9a-f]{64}$/.test(source.converterArchiveSha256)&&source.converterArchiveSha256!==converterArchiveSha256;
}

export function admitGuitarProContext(p:ScorePackage,options:GuitarProColdOptions={}):Promise<GuitarProContext>{
 const signal=options.signal,paint=options.checkpoint;
 return serialized(signal,()=>replayGuitarProContext(p,{signal,checkpoint:paint}));
}
