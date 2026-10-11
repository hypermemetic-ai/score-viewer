import {hashBytes} from './package';
import type {Entry} from './state';
import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';
import type {LibraryPracticeReader,LibraryPracticeSummary} from './library-practice-progress';

export const LIBRARY_DERIVED_CACHE_FILE='viewer-derived-cache-v1.json';
/** Bump when summary meaning, contributing-record selection or derivation policy changes. */
export const LIBRARY_SUMMARY_POLICY='bounded-exercises-v1/library-summary-v1';
export const LIBRARY_CACHE_LIMITS=Object.freeze({rows:256,bytes:512*1024,rowBytes:32*1024,entryBytes:16*1024,dependencies:16,recordBytes:8*1024*1024});
const encoder=new TextEncoder(),digest=/^[a-f0-9]{64}$/;
const sha256=(value:unknown):value is string=>typeof value==='string'&&digest.test(value);
const keyboardId=(value:unknown):value is PhysicalKeyboardId=>value==='conventional-piano'||value==='janko-four-row';
const exact=(value:unknown,keys:string[]):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));

/** Canonical JSON content, not private admission authority or a serialized score. */
export function libraryCanonical(value:unknown,maxBytes=LIBRARY_CACHE_LIMITS.recordBytes):string {
 let nodes=0,remaining=maxBytes;
 const spend=(bytes:number)=>{remaining-=bytes;if(remaining<0)throw Error('Derived-cache input exceeds its byte bound');};
 const stringBytes=(value:string)=>encoder.encode(JSON.stringify(value)).byteLength;
 const walk=(v:unknown,depth:number):unknown=>{
  if(++nodes>100000||depth>32)throw Error('Derived-cache input exceeds its structural bound');
  if(v===null||typeof v==='boolean'){spend(v===null?4:v?4:5);return v;}
  if(typeof v==='string'){if(v.length>remaining)throw Error('Derived-cache string exceeds its bound');spend(stringBytes(v));return v;}
  if(typeof v==='number'){if(!Number.isFinite(v))throw Error('Derived-cache input is not JSON');spend(JSON.stringify(v).length);return v;}
  if(Array.isArray(v)){spend(2+Math.max(0,v.length-1));return v.map(q=>walk(q,depth+1));}
  if(v&&typeof v==='object'&&(Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null)){
   const keys=Object.keys(v).filter(k=>(v as Record<string,unknown>)[k]!==undefined).sort();spend(2+Math.max(0,keys.length-1));
   return Object.fromEntries(keys.map(k=>{if(k.length>remaining)throw Error('Derived-cache key exceeds its bound');spend(stringBytes(k)+1);return [k,walk((v as Record<string,unknown>)[k],depth+1)];}));
  }
  throw Error('Derived-cache input is not JSON');
 };
 const text=JSON.stringify(walk(value,0));if(encoder.encode(text).byteLength>maxBytes)throw Error('Derived-cache input exceeds its byte bound');return text;
}
export const libraryEntryContext=(entry:Entry)=>libraryCanonical(entry,LIBRARY_CACHE_LIMITS.entryBytes);
export interface LibraryCacheDependency {file:string;sha256:string|null}
export interface LibraryDerivedRow {
 key:string;policy:string;entry:string;keyboard:PhysicalKeyboardId;archiveSha256:string;
 dependencies:LibraryCacheDependency[];summary:LibraryPracticeSummary|null;checksum:string;
}
export interface LibraryDerivedCache {version:'viewer-derived-cache-v1';rows:LibraryDerivedRow[]}
const rowPayload=(row:LibraryDerivedRow)=>({key:row.key,policy:row.policy,entry:row.entry,keyboard:row.keyboard,archiveSha256:row.archiveSha256,dependencies:row.dependencies,summary:row.summary});
export async function libraryCacheKey(entry:Entry,keyboard:PhysicalKeyboardId,policy=LIBRARY_SUMMARY_POLICY):Promise<string> {
 if(!keyboardId(keyboard)||!policy||policy.length>200)throw Error('Invalid summary derivation policy');
 return hashBytes(libraryCanonical({entry:libraryEntryContext(entry),keyboard,policy},LIBRARY_CACHE_LIMITS.rowBytes));
}
export async function libraryRecordDigest(value:unknown):Promise<string|null> {
 return value==null?null:hashBytes(libraryCanonical(value));
}
export async function createLibraryDerivedRow(entry:Entry,keyboard:PhysicalKeyboardId,archiveSha256:string,dependencies:LibraryCacheDependency[],summary:LibraryPracticeSummary|undefined,policy=LIBRARY_SUMMARY_POLICY):Promise<LibraryDerivedRow> {
 const row:LibraryDerivedRow={key:await libraryCacheKey(entry,keyboard,policy),policy,entry:libraryEntryContext(entry),keyboard,archiveSha256,
  dependencies:dependencies.slice().sort((a,b)=>a.file.localeCompare(b.file)).map(q=>({...q})),summary:summary?{...summary}:null,checksum:''};
 row.checksum=await hashBytes(libraryCanonical(rowPayload(row),LIBRARY_CACHE_LIMITS.rowBytes));return validateLibraryDerivedRow(row);
}
export async function validateLibraryDerivedRow(value:unknown):Promise<LibraryDerivedRow> {
 if(!exact(value,['key','policy','entry','keyboard','archiveSha256','dependencies','summary','checksum']))throw Error('Invalid derived-cache row');
 const row=value as unknown as LibraryDerivedRow;
 libraryCanonical(row,LIBRARY_CACHE_LIMITS.rowBytes);
 if(!sha256(row.key)||!sha256(row.archiveSha256)||!sha256(row.checksum)||typeof row.policy!=='string'||!row.policy||row.policy.length>200||
  !keyboardId(row.keyboard)||typeof row.entry!=='string'||encoder.encode(row.entry).byteLength>LIBRARY_CACHE_LIMITS.entryBytes||!Array.isArray(row.dependencies)||row.dependencies.length>LIBRARY_CACHE_LIMITS.dependencies)throw Error('Invalid derived-cache row identity');
 const entry=JSON.parse(row.entry) as Entry;
 if(!entry||typeof entry!=='object'||Array.isArray(entry)||typeof entry.id!=='string'||!entry.id||typeof entry.file!=='string'||!entry.file||libraryEntryContext(entry)!==row.entry||await libraryCacheKey(entry,row.keyboard,row.policy)!==row.key)throw Error('Invalid derived-cache entry');
 const names=new Set<string>();
 for(const dependency of row.dependencies){
  if(!exact(dependency,['file','sha256'])||typeof dependency.file!=='string'||!/^[A-Za-z0-9.-]{1,512}$/.test(dependency.file)||dependency.file.includes('..')||names.has(dependency.file)||
   dependency.sha256!==null&&!sha256(dependency.sha256))throw Error('Invalid derived-cache dependency');
  names.add(dependency.file);
 }
 if(row.summary!==null){
  const summary=row.summary;
  const fields=summary.assessment==='manual'?['entryId','file','assessment','sections','whole']:['entryId','file','keyboard','sections','whole'];
  if(!exact(summary,fields)||summary.entryId!==entry.id||summary.file!==entry.file||!Number.isFinite(summary.sections)||summary.sections<0||summary.sections>1||typeof summary.whole!=='boolean'||
   (summary.assessment==='manual'?summary.assessment!=='manual':summary.keyboard!==row.keyboard))throw Error('Invalid derived-cache summary');
 }
 if(await hashBytes(libraryCanonical(rowPayload(row),LIBRARY_CACHE_LIMITS.rowBytes))!==row.checksum)throw Error('Derived-cache row checksum differs');
 return structuredClone(row);
}
export async function readLibraryDerivedCache(bytes:Uint8Array|null):Promise<LibraryDerivedRow[]> {
 if(!bytes)return [];
 if(bytes.byteLength>LIBRARY_CACHE_LIMITS.bytes)throw Error('Derived-cache file exceeds its byte bound');
 const value:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(!exact(value,['version','rows'])||value.version!=='viewer-derived-cache-v1'||!Array.isArray(value.rows)||value.rows.length>LIBRARY_CACHE_LIMITS.rows)throw Error('Invalid derived-cache envelope');
 const rows:LibraryDerivedRow[]=[],keys=new Set<string>();
 for(const candidate of value.rows){try{const row=await validateLibraryDerivedRow(candidate);if(keys.has(row.key))throw Error('Duplicate cache identity');keys.add(row.key);rows.push(row);}catch{/* One corrupt row does not discard other independently checked display rows. */}}
 return rows;
}
export function libraryCacheBytes(rows:LibraryDerivedRow[]):Uint8Array {
 const retained=rows.slice(-LIBRARY_CACHE_LIMITS.rows);
 let bytes=encoder.encode(JSON.stringify({version:'viewer-derived-cache-v1',rows:retained} satisfies LibraryDerivedCache));
 while(bytes.byteLength>LIBRARY_CACHE_LIMITS.bytes&&retained.length){retained.shift();bytes=encoder.encode(JSON.stringify({version:'viewer-derived-cache-v1',rows:retained} satisfies LibraryDerivedCache));}
 return bytes;
}
export async function verifyLibraryDependencies(row:LibraryDerivedRow,reader:LibraryPracticeReader,isCurrent:()=>boolean):Promise<boolean> {
 for(const dependency of row.dependencies){if(!isCurrent())return false;try{if(await libraryRecordDigest(await reader.readRecord(dependency.file))!==dependency.sha256)return false;}catch{return false;}}
 return isCurrent();
}
/** Capture the reads actually taken by the cold branch, including missing fallback names. */
export function captureLibraryDependencies(reader:LibraryPracticeReader,entryFile:string,archive:Uint8Array) {
 const dependencies=new Map<string,string|null>();let cacheable=true;
 const captured:LibraryPracticeReader={...reader,readPackage:async file=>file===entryFile?archive:reader.readPackage(file),readRecord:async file=>{
  const raw=await reader.readRecord(file);let value=raw;try{if(raw!=null)value=structuredClone(raw);}catch{cacheable=false;}
  try{const sha256=await libraryRecordDigest(value);if(dependencies.has(file)&&dependencies.get(file)!==sha256)cacheable=false;dependencies.set(file,sha256);}catch{cacheable=false;}
  return value;
 }};
 return {reader:captured,dependencies:()=>cacheable&&dependencies.size<=LIBRARY_CACHE_LIMITS.dependencies?[...dependencies].map(([file,sha256])=>({file,sha256})):undefined};
}
