import {deflateSync,inflateSync,strFromU8,strToU8} from 'fflate';
import {hashBytes} from './package';

/** The source identity of this viewer build: its own source and the pinned
 * notation dependency, hashed when the frontend is built. A different build
 * never reads another build's derived files. */
declare const __VIEWER_DERIVED_IDENTITY__:string|undefined;
export const VIEWER_DERIVED_IDENTITY:string=typeof __VIEWER_DERIVED_IDENTITY__==='string'?__VIEWER_DERIVED_IDENTITY__:'unbuilt-source';

export const DERIVED_FILE_CACHE_FORMAT='viewer-derived-file-cache-v3';
/** One entry's ceilings, stored and decoded, far above any real entry (a
 * settled engine is a few MB). The total budget and the free-disk floor
 * belong to the store (src-tauri/src/derived_cache.rs): 2 GB, dropping the
 * least recently used entries, and nothing new below 5 GB free. */
export const DERIVED_FILE_CACHE_LIMITS=Object.freeze({entryBytes:256*1024*1024,payloadBytes:256*1024*1024});
/** Entries are named by a lowercase SHA-256 and nothing else. A write
 * resolves false when the store keeps nothing: over its budget, or low disk. */
export interface DerivedFileStore {read(name:string):Promise<Uint8Array|null>;write(name:string,data:Uint8Array):Promise<boolean>}
interface Header {format:string;identity:string;kind:string;key:string;payloadSha256:string;payloadBytes:number}
const sha256=/^[a-f0-9]{64}$/,kindName=/^[a-z0-9-]{1,64}$/,MAX_HEADER=4096;

/** A content-addressed disk cache of derived results only: engraving views,
 * admission evidence and settled engines that this build already produced or
 * checked. Every entry is bound to its kind, its exact input digest and this
 * build, and is checked against its own payload digest on reading. A missing,
 * foreign, stale or corrupt entry is a miss; nothing here is user data.
 *
 * An entry is a plain JSON header line followed by the deflated payload, so
 * inflation is bounded by the size the header declares. */
export class DerivedFileCache {
 private readonly store:DerivedFileStore;
 readonly identity:string;
 private readonly limits:{entryBytes:number;payloadBytes:number};
 private writes:Promise<void>=Promise.resolve();
 constructor(store:DerivedFileStore,identity=VIEWER_DERIVED_IDENTITY,limits=DERIVED_FILE_CACHE_LIMITS){
  if(typeof identity!=='string'||!identity||identity.length>200)throw Error('Invalid derived cache identity');
  this.store=store;this.identity=identity;this.limits=limits;
 }
 /** The store's name for an entry: one entry per kind and key. */
 async entryName(kind:string,key:string){
  if(!kindName.test(kind)||!sha256.test(key))throw Error('Invalid derived cache key');
  return hashBytes(JSON.stringify([DERIVED_FILE_CACHE_FORMAT,this.identity,kind,key]));
 }
 async get<T>(kind:string,key:string,validate:(value:unknown)=>T):Promise<T|undefined>{
  try{
   const bytes=await this.store.read(await this.entryName(kind,key));
   if(!bytes||bytes.byteLength>this.limits.entryBytes)return;
   const newline=bytes.subarray(0,MAX_HEADER).indexOf(10);if(newline<1)return;
   const header=JSON.parse(strFromU8(bytes.subarray(0,newline))) as Header;
   if(header.format!==DERIVED_FILE_CACHE_FORMAT||header.identity!==this.identity||header.kind!==kind||header.key!==key||
    !Number.isSafeInteger(header.payloadBytes)||header.payloadBytes<2||header.payloadBytes>this.limits.payloadBytes)return;
   const payload=inflateSync(bytes.subarray(newline+1),{out:new Uint8Array(header.payloadBytes)});
   if(payload.byteLength!==header.payloadBytes||await hashBytes(payload)!==header.payloadSha256)return;
   return validate(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(payload)));
  }catch{return;}
 }
 /** Ordered and best effort: a refused or failed write keeps the old entry or
  * none, and resolves false. */
 put(kind:string,key:string,value:unknown):Promise<boolean>{
  const write=async()=>{
   const payload=strToU8(JSON.stringify(value));if(payload.byteLength>this.limits.payloadBytes)return false;
   const header:Header={format:DERIVED_FILE_CACHE_FORMAT,identity:this.identity,kind,key,payloadSha256:await hashBytes(payload),payloadBytes:payload.byteLength},
    head=strToU8(JSON.stringify(header)+'\n'),body=deflateSync(payload,{level:1});
   if(head.byteLength>MAX_HEADER||head.byteLength+body.byteLength>this.limits.entryBytes)return false;
   const bytes=new Uint8Array(head.byteLength+body.byteLength);bytes.set(head);bytes.set(body,head.byteLength);
   return await this.store.write(await this.entryName(kind,key),bytes)===true;
  };
  const written=this.writes.then(write).catch(()=>false);this.writes=written.then(()=>{});return written;
 }
 flush():Promise<void>{return this.writes;}
}
