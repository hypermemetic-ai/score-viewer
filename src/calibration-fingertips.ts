/** Raw optional reach evidence. Deliberately independent from calculator effort sessions. */
export const FINGERTIPS_FILE='calibration-fingertips-v1.json';
export const FINGERTIPS_VERSION='viewer-calibration-fingertips-v1' as const;
export const FINGERTIP_ILLUSTRATION='accepted-fingertip-illustration-v1' as const;
export const FINGERTIP_PAIRS=[['Thumb','Index'],['Index','Middle'],['Middle','Ring'],['Ring','Pinky']] as const;
export type FingertipInstrument='janko-four-row'|'conventional-piano';
export type FingertipMethod='percent'|'millimeters';
export type FingertipHand='LH'|'RH';
/** first/second identify pair members; both means each at its own wall (percent) or equal reach (mm). */
export type FingertipReference='first'|'second'|'both';
export interface FingertipReading {id:string;recordedAt:string;instrument:FingertipInstrument;hand:FingertipHand;pair:number;method:FingertipMethod;reference:FingertipReference;value:number;raw:string;illustration:typeof FINGERTIP_ILLUSTRATION;protocol:'extended-fingertip-reach-v1'}
export interface FingertipArchive {version:typeof FINGERTIPS_VERSION;readings:FingertipReading[]}
export interface FingertipFiles {read(name:string):Promise<Uint8Array|undefined>;write(name:string,bytes:Uint8Array):Promise<void>}
export interface FingertipLoad {value:FingertipArchive;raw?:Uint8Array;error?:string}
export const initialFingertips=():FingertipArchive=>({version:FINGERTIPS_VERSION,readings:[]});
export function parseFingertip(raw:string,method:FingertipMethod):number|undefined {
 const s=raw.trim();if(!/^[-+]?(?:[0-9]+(?:[.][0-9]*)?|[.][0-9]+)$/.test(s))return;
 const value=Number(s);if(!Number.isFinite(value)||(method==='percent'?value>100:value<0))return;return value;
}
const keys=(value:object,allowed:string[])=>Object.keys(value).sort().join('|')===allowed.sort().join('|');
export function validateFingertips(input:unknown):FingertipArchive {
 if(!input||typeof input!=='object')throw Error('Expected a fingertip archive');
 const a=input as FingertipArchive;
 if(!keys(a,['version','readings'])||a.version!==FINGERTIPS_VERSION||!Array.isArray(a.readings))throw Error('Unsupported fingertip archive');
 const ids=new Set<string>();
 for(const r of a.readings){
  if(!r||typeof r!=='object'||!keys(r,['id','recordedAt','instrument','hand','pair','method','reference','value','raw','illustration','protocol']))throw Error('Invalid fingertip reading');
  if(typeof r.id!=='string'||!r.id||ids.has(r.id))throw Error('Invalid or duplicate reading identity');ids.add(r.id);
  if(typeof r.recordedAt!=='string'||!Number.isFinite(Date.parse(r.recordedAt)))throw Error('Invalid reading date');
  if(!['janko-four-row','conventional-piano'].includes(r.instrument)||!['LH','RH'].includes(r.hand)||!Number.isInteger(r.pair)||r.pair<0||r.pair>3||!['percent','millimeters'].includes(r.method)||!['first','second','both'].includes(r.reference))throw Error('Invalid reading context');
  if(r.instrument==='conventional-piano'&&r.method!=='millimeters')throw Error('Conventional reach uses millimeters');
  if(typeof r.raw!=='string'||typeof r.value!=='number'||parseFingertip(r.raw,r.method)!==r.value)throw Error('Invalid reading value');
  if(r.reference==='both'&&r.value!==(r.method==='percent'?100:0))throw Error('Equal/both value differs');
  if(r.illustration!==FINGERTIP_ILLUSTRATION||r.protocol!=='extended-fingertip-reach-v1')throw Error('Unsupported reading provenance');
 }
 return structuredClone(a);
}
export const fingertipBytes=(a:FingertipArchive)=>new TextEncoder().encode(JSON.stringify(validateFingertips(a))+'\n');
export async function loadFingertips(files:Pick<FingertipFiles,'read'>):Promise<FingertipLoad>{
 let raw:Uint8Array|undefined;
 try{raw=await files.read(FINGERTIPS_FILE);if(!raw)return{value:initialFingertips()};return{value:validateFingertips(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw))),raw:new Uint8Array(raw)};}
 catch(e){return{value:initialFingertips(),raw:raw?new Uint8Array(raw):undefined,error:`Saved fingertip readings could not be opened: ${e instanceof Error?e.message:String(e)}. The original file is retained.`};}
}
export function exportFingertips(load:FingertipLoad,archive:FingertipArchive=load.value):string {
 if(!load.error)return JSON.stringify(validateFingertips(archive),null,2);
 let data='';if(load.raw){let binary='';for(const b of load.raw)binary+=String.fromCharCode(b);data=btoa(binary);}
 return JSON.stringify({version:'retained-fingertip-bytes-v1',error:load.error,encoding:'base64',data,bytes:load.raw?.length??null},null,2);
}
