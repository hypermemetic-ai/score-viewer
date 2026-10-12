import {EFFECTIVE_CURL_REFINEMENT_CONTRACT,type EffectiveCurlFinger,type EffectiveCurlHingeAssumption,type EffectiveCurlLengthObservation,type EffectiveCurlMeasurementMethod,type EffectiveCurlRefinementDocument,type EffectiveCurlRefinementEntry} from '@hypermemetic-ai/fingering-calculator';

export const EFFECTIVE_CURL_FILE='effective-curl-refinements-v1.json';
export const EFFECTIVE_CURL_ARCHIVE_VERSION='viewer-effective-curl-archive-v1' as const;
export type CurlHand='LH'|'RH';
export interface CurlFiles {read(name:string):Promise<Uint8Array|null|undefined>;write(name:string,bytes:Uint8Array):Promise<void>}
export interface CurlArchive {version:typeof EFFECTIVE_CURL_ARCHIVE_VERSION;documents:EffectiveCurlRefinementDocument[]}
export interface CurlLoad {value:CurlArchive;raw?:Uint8Array;error?:string}
export const initialCurl=():CurlArchive=>({version:EFFECTIVE_CURL_ARCHIVE_VERSION,documents:[]});

const object=(value:unknown,label:string):Record<string,unknown>=>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error(`Invalid ${label}`);return value as Record<string,unknown>;};
function fields(value:Record<string,unknown>,required:string[],optional:string[]=[]) {if(required.some(key=>!Object.hasOwn(value,key))||Object.keys(value).some(key=>!required.includes(key)&&!optional.includes(key)))throw Error('Unsupported effective curl fields');}
function text(value:unknown,label:string):asserts value is string {if(typeof value!=='string'||!value.trim())throw Error(`Invalid ${label}`);}
function positive(value:unknown,label:string):asserts value is number {if(typeof value!=='number'||!Number.isFinite(value)||value<=0)throw Error(`Invalid ${label}`);}
function precision(value:unknown,label:string){if(value!==null&&(typeof value!=='number'||!Number.isFinite(value)||value<0))throw Error(`Invalid ${label}`);}
function finger(value:unknown):asserts value is EffectiveCurlFinger {if(!EFFECTIVE_CURL_REFINEMENT_CONTRACT.fingers.includes(value as EffectiveCurlFinger))throw Error('Effective curl supports fingers 2–5');}
function date(value:unknown):asserts value is string {
 if(typeof value!=='string')throw Error('Invalid effective curl date');
 const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(value);
 if(!match||!Number.isFinite(Date.parse(value)))throw Error('Invalid effective curl date');
 const [,year,month,day,hour,minute,second,offsetHour,offsetMinute]=match;
 const y=Number(year),m=Number(month),leap=y%4===0&&(y%100!==0||y%400===0),days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][m-1]??0;
 if(Number(month)<1||Number(month)>12||Number(day)<1||Number(day)>days||Number(hour)>23||Number(minute)>59||Number(second)>59||Number(offsetHour??0)>23||Number(offsetMinute??0)>59)throw Error('Invalid effective curl date');
}
function identity(value:unknown,ids:Set<string>,label:string):asserts value is string {text(value,label);if(ids.has(value))throw Error(`Duplicate effective curl identity: ${value}`);ids.add(value);}
function assumption(input:unknown,ids:Set<string>):EffectiveCurlHingeAssumption {
 const a=object(input,'effective curl assumption');fields(a,['version','id','recordedAt','finger','hingeToTipMm','basis']);
 if(a.version!==EFFECTIVE_CURL_REFINEMENT_CONTRACT.assumptionVersion)throw Error('Unsupported effective curl assumption version');
 identity(a.id,ids,'assumption identity');date(a.recordedAt);finger(a.finger);positive(a.hingeToTipMm,'assumed hinge-to-tip length');
 const basis=object(a.basis,'effective curl assumption basis');
 if(basis.kind==='population-proportion'){
  fields(basis,['kind','sourceReference','externalFingerLengthMm','externalLengthDefinition','externalLengthStatus','proportion','proportionSd','hingeReference']);
  text(basis.sourceReference,'population source reference');positive(basis.externalFingerLengthMm,'external finger length');
  if(basis.externalLengthDefinition!=='proximal-flexion-crease-to-fingertip'||!['measured','assumed','fitted'].includes(basis.externalLengthStatus as string)||basis.hingeReference!=='pip-flexion-crease-proxy')throw Error('Invalid population length endpoints or provenance');
  if(typeof basis.proportion!=='number'||!Number.isFinite(basis.proportion)||basis.proportion<=0||basis.proportion>=1)throw Error('Invalid population proportion');precision(basis.proportionSd,'population proportion SD');
 }else if(basis.kind==='anatomical-template'){
  fields(basis,['kind','templateId','templateVersion','reference','hingeReference']);text(basis.templateId,'template identity');text(basis.templateVersion,'template version');text(basis.reference,'template reference');
  if(basis.hingeReference!=='effective-internal-hinge')throw Error('Invalid template hinge convention');
 }else if(basis.kind==='fitted-geometry'){
  fields(basis,['kind','fitId','modelVersion','sourceStretchSessionIds','hingeReference']);text(basis.fitId,'fit identity');text(basis.modelVersion,'fit model version');
  if(basis.hingeReference!=='effective-internal-hinge'||!Array.isArray(basis.sourceStretchSessionIds)||!basis.sourceStretchSessionIds.length)throw Error('Invalid fitted geometry provenance');
  const sources=new Set<string>();for(const source of basis.sourceStretchSessionIds){text(source,'source stretch session identity');if(sources.has(source))throw Error('Duplicate source stretch session');sources.add(source);}
 }else throw Error('Unsupported effective curl assumption basis');
 return a as unknown as EffectiveCurlHingeAssumption;
}
function document(input:unknown,ids:Set<string>):EffectiveCurlRefinementDocument {
 const d=object(input,'effective curl document');fields(d,['version','id','playerId','hand','assumptions','entries']);
 if(d.version!==EFFECTIVE_CURL_REFINEMENT_CONTRACT.documentVersion)throw Error('Unsupported effective curl document version');
 identity(d.id,ids,'document identity');text(d.playerId,'player identity');if(!['LH','RH'].includes(d.hand as string))throw Error('Invalid effective curl hand');
 if(!Array.isArray(d.assumptions)||!Array.isArray(d.entries))throw Error('Invalid effective curl ledger');
 const assumptions=new Map<string,EffectiveCurlHingeAssumption>();for(const value of d.assumptions){const a=assumption(value,ids);assumptions.set(a.id,a);}
 const earlier=new Map<string,EffectiveCurlLengthObservation>();
 for(const value of d.entries){
  const entry=object(value,'effective curl entry');identity(entry.id,ids,'entry identity');date(entry.recordedAt);if(Object.hasOwn(entry,'notes')&&typeof entry.notes!=='string')throw Error('Invalid effective curl notes');
  if(entry.kind==='effective-curl-length'){
   fields(entry,['kind','id','recordedAt','finger','hingeToTipMm','method','uncertaintyMm','displayedAssumptionId'],['notes']);finger(entry.finger);positive(entry.hingeToTipMm,'personal hinge-to-tip length');precision(entry.uncertaintyMm,'measurement uncertainty');
   if(!EFFECTIVE_CURL_REFINEMENT_CONTRACT.measurementMethods.some(method=>method.id===entry.method))throw Error('Unsupported effective curl measurement method');
   if(entry.displayedAssumptionId!==null){text(entry.displayedAssumptionId,'displayed assumption identity');const a=assumptions.get(entry.displayedAssumptionId);if(!a||a.finger!==entry.finger||Date.parse(a.recordedAt)>Date.parse(entry.recordedAt))throw Error('Displayed assumption must be an earlier assumption for the same finger');}
   earlier.set(entry.id,entry as unknown as EffectiveCurlLengthObservation);
  }else if(entry.kind==='retraction'){
   fields(entry,['kind','id','recordedAt','entryId','reason'],['notes']);text(entry.entryId,'retracted entry identity');text(entry.reason,'retraction reason');if(!earlier.has(entry.entryId))throw Error('Retraction must target an earlier personal measurement');
  }else throw Error('Unsupported effective curl entry kind');
 }
 return d as unknown as EffectiveCurlRefinementDocument;
}
export function validateCurlDocument(input:unknown):EffectiveCurlRefinementDocument {return structuredClone(document(input,new Set()));}
export function validateCurlArchive(input:unknown):CurlArchive {
 const archive=object(input,'effective curl archive');
 if(archive.version===EFFECTIVE_CURL_REFINEMENT_CONTRACT.documentVersion)return{version:EFFECTIVE_CURL_ARCHIVE_VERSION,documents:[validateCurlDocument(archive)]};
 fields(archive,['version','documents']);if(archive.version!==EFFECTIVE_CURL_ARCHIVE_VERSION||!Array.isArray(archive.documents))throw Error('Unsupported effective curl archive');
 const ids=new Set<string>(),bindings=new Set<string>();
 const documents=archive.documents.map(value=>{const d=document(value,ids),binding=JSON.stringify([d.playerId,d.hand]);if(bindings.has(binding))throw Error('Duplicate effective curl player/hand document');bindings.add(binding);return d;});
 return structuredClone({version:EFFECTIVE_CURL_ARCHIVE_VERSION,documents});
}
export const curlDocument=(archive:CurlArchive,playerId:string,hand:CurlHand)=>archive.documents.find(d=>d.playerId===playerId&&d.hand===hand);
export function currentCurl(document:EffectiveCurlRefinementDocument|undefined,finger:EffectiveCurlFinger):{personal?:EffectiveCurlLengthObservation;assumption?:EffectiveCurlHingeAssumption} {
 const retracted=new Set(document?.entries.filter(e=>e.kind==='retraction').map(e=>e.entryId)??[]);
 return{personal:document?.entries.filter((entry):entry is EffectiveCurlLengthObservation=>entry.kind==='effective-curl-length'&&entry.finger===finger&&!retracted.has(entry.id)).at(-1),assumption:document?.assumptions.filter(a=>a.finger===finger).at(-1)};
}
/** A lone document remains the supported companion wire format; multiple bindings need a Viewer archive. */
export function curlBytes(archive:CurlArchive):Uint8Array {const value=validateCurlArchive(archive);return new TextEncoder().encode(JSON.stringify(value.documents.length===1?value.documents[0]:value)+'\n');}
export async function loadCurl(files:Pick<CurlFiles,'read'>):Promise<CurlLoad> {
 let raw:Uint8Array|undefined;
 try{const found=await files.read(EFFECTIVE_CURL_FILE);if(!found)return{value:initialCurl()};raw=new Uint8Array(found);return{value:validateCurlArchive(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw))),raw};}
 catch(error){return{value:initialCurl(),raw,error:`Saved effective curl readings could not be opened: ${error instanceof Error?error.message:String(error)}. The original file is retained.`};}
}
export function exportCurl(load:CurlLoad,archive:CurlArchive=load.value,playerId?:string,hand?:CurlHand):string {
 if(load.error){let binary='';for(const b of load.raw??[])binary+=String.fromCharCode(b);return JSON.stringify({version:'retained-effective-curl-bytes-v1',error:load.error,encoding:'base64',data:btoa(binary),bytes:load.raw?.length??null},null,2);}
 const value=validateCurlArchive(archive);
 if(playerId!==undefined&&hand!==undefined){const found=curlDocument(value,playerId,hand);if(!found)throw Error('No effective curl companion exists for this player and hand');return JSON.stringify(found,null,2);}
 return JSON.stringify(value.documents.length===1?value.documents[0]:value,null,2);
}
export function parseCurlNumber(raw:string,optional=false):number|null|undefined {const value=raw.trim();if(optional&&!value)return null;if(!/^[+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value))return undefined;const number=Number(value);return Number.isFinite(number)&&(optional?number>=0:number>0)?number:undefined;}
export interface CurlDraft {length:string;uncertainty:string;method:EffectiveCurlMeasurementMethod;notes:string}
export interface CurlState {archive:CurlArchive;document?:EffectiveCurlRefinementDocument;finger:EffectiveCurlFinger;draft:CurlDraft;busy:boolean;readOnly:boolean;error?:string;saved:boolean}
export interface CurlControllerOptions {load:CurlLoad;files:CurlFiles;playerId:string;hand:CurlHand;now?:()=>string;id?:()=>string}
export class CurlController {
 private accepted:CurlArchive;private drafts=new Map<EffectiveCurlFinger,CurlDraft>();private listeners=new Set<(state:CurlState)=>void>();private selected:EffectiveCurlFinger=2;private busy=false;private stopped=false;private error?:string;private saved=false;private flight:Promise<void>=Promise.resolve();private epoch=0;private retained:CurlLoad;
 constructor(private options:CurlControllerOptions){text(options.playerId,'player identity');if(!['LH','RH'].includes(options.hand))throw Error('Invalid effective curl hand');this.retained={...options.load,raw:options.load.raw?new Uint8Array(options.load.raw):undefined};this.accepted=validateCurlArchive(options.load.value);this.error=options.load.error;}
 private draft():CurlDraft {let draft=this.drafts.get(this.selected);if(!draft){const personal=currentCurl(curlDocument(this.accepted,this.options.playerId,this.options.hand),this.selected).personal;draft={length:personal?String(personal.hingeToTipMm):'',uncertainty:personal?.uncertaintyMm===undefined||personal.uncertaintyMm===null?'':String(personal.uncertaintyMm),method:personal?.method??'bent-section-effective',notes:personal?.notes??''};this.drafts.set(this.selected,draft);}return draft;}
 get state():CurlState {return{archive:structuredClone(this.accepted),document:structuredClone(curlDocument(this.accepted,this.options.playerId,this.options.hand)),finger:this.selected,draft:{...this.draft()},busy:this.busy,readOnly:!!this.retained.error,error:this.error,saved:this.saved};}
 subscribe(listener:(state:CurlState)=>void){if(this.stopped)return()=>{};this.listeners.add(listener);listener(this.state);return()=>this.listeners.delete(listener);}
 private emit(){if(!this.stopped)for(const listener of this.listeners)listener(this.state);}
 selectFinger(value:EffectiveCurlFinger){if(this.busy||this.stopped)return;finger(value);this.selected=value;this.error=this.retained.error;this.saved=false;this.emit();}
 edit(changes:Partial<CurlDraft>){if(this.busy||this.stopped)return;Object.assign(this.draft(),changes);this.error=this.retained.error;this.saved=false;this.emit();}
 private id(){return(this.options.id??(()=>crypto.randomUUID()))();}
 private now(){return(this.options.now??(()=>new Date().toISOString()))();}
 private async append(entry:EffectiveCurlRefinementEntry):Promise<boolean> {
  const candidate=structuredClone(this.accepted);let d=curlDocument(candidate,this.options.playerId,this.options.hand);
  if(!d){d={version:EFFECTIVE_CURL_REFINEMENT_CONTRACT.documentVersion,id:this.id(),playerId:this.options.playerId,hand:this.options.hand,assumptions:[],entries:[]};candidate.documents.push(d);}d.entries.push(entry);
  let bytes:Uint8Array;try{bytes=curlBytes(candidate);}catch(error){this.error=error instanceof Error?error.message:String(error);this.emit();return false;}
  this.busy=true;this.error=undefined;this.saved=false;const epoch=this.epoch;let settle!:()=>void;this.flight=new Promise(resolve=>{settle=resolve;});this.emit();
  try{await this.options.files.write(EFFECTIVE_CURL_FILE,bytes);this.accepted=candidate;if(!this.stopped&&epoch===this.epoch)this.saved=true;return true;}
  catch(error){if(!this.stopped)this.error=`Reading was not saved: ${error instanceof Error?error.message:String(error)}. Your draft is retained.`;return false;}
  finally{this.busy=false;this.emit();settle();}
 }
 async save():Promise<boolean> {
  if(this.busy||this.stopped||this.retained.error)return false;const draft=this.draft(),length=parseCurlNumber(draft.length),uncertainty=parseCurlNumber(draft.uncertainty,true);
  if(length===undefined||length===null||uncertainty===undefined){this.error=length===undefined||length===null?'Enter a positive length in millimeters.':'Enter a nonnegative uncertainty, or leave it blank.';this.emit();return false;}
  const displayed=currentCurl(curlDocument(this.accepted,this.options.playerId,this.options.hand),this.selected).assumption;
  return this.append({kind:'effective-curl-length',id:this.id(),recordedAt:this.now(),finger:this.selected,hingeToTipMm:length,method:draft.method,uncertaintyMm:uncertainty,displayedAssumptionId:displayed?.id??null,...(draft.notes.trim()?{notes:draft.notes.trim()}: {})});
 }
 async retract(reason='Personal reading withdrawn'):Promise<boolean> {
  if(this.busy||this.stopped||this.retained.error)return false;const personal=currentCurl(curlDocument(this.accepted,this.options.playerId,this.options.hand),this.selected).personal;if(!personal)return false;
  const result=await this.append({kind:'retraction',id:this.id(),recordedAt:this.now(),entryId:personal.id,reason});if(result&&!this.stopped){this.drafts.delete(this.selected);this.emit();}return result;
 }
 exportArchive(){return exportCurl(this.retained,this.accepted);}
 exportDocument(){return exportCurl(this.retained,this.accepted,this.options.playerId,this.options.hand);}
 flush(){return this.flight;}
 break(){this.epoch++;}
 dispose(){this.stopped=true;this.epoch++;this.listeners.clear();}
}
