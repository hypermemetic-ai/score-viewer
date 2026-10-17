import {deflateSync,inflateSync,strFromU8,strToU8} from 'fflate';
import {hashBytes} from './package';

/** The source identity of this viewer build: its own source and the pinned
 * notation dependency, hashed when the frontend is built. A different build
 * never reads another build's derived files. */
declare const __VIEWER_DERIVED_IDENTITY__:string|undefined;
export const VIEWER_DERIVED_IDENTITY:string=typeof __VIEWER_DERIVED_IDENTITY__==='string'?__VIEWER_DERIVED_IDENTITY__:'unbuilt-source';

export const DERIVED_FILE_CACHE_FORMAT='viewer-derived-file-cache-v2';
export const DERIVED_FILE_CACHE_LIMITS=Object.freeze({slots:12,slotBytes:8*1024*1024,payloadBytes:96*1024*1024});
/** The only managed names this cache writes. A slot is overwritten in place,
 * so the cache never grows beyond its slots; deleting a slot costs only time. */
export const derivedCacheSlotName=(slot:number)=>{
 if(!Number.isInteger(slot)||slot<0||slot>=DERIVED_FILE_CACHE_LIMITS.slots)throw Error('Invalid derived cache slot');
 return `viewer-derived-cache-v1-slot-${slot.toString(16)}.bin`;
};
export interface DerivedFileStore {read(name:string):Promise<Uint8Array|null>;write(name:string,data:Uint8Array):Promise<void>}
interface Header {format:string;identity:string;kind:string;key:string;payloadSha256:string;payloadBytes:number}
const sha256=/^[a-f0-9]{64}$/,kindName=/^[a-z0-9-]{1,64}$/,MAX_HEADER=4096;

/** A content-addressed disk cache of derived results only: engraving views
 * and admission evidence that this build already produced or checked. Every
 * entry is bound to its kind, its exact input digest and this build, and is
 * checked against its own payload digest on reading. A missing, foreign,
 * stale or corrupt slot is a miss; nothing here is user data.
 *
 * A slot is a plain JSON header line followed by the deflated payload, so a
 * slot written for another entry is recognised without inflating it, and
 * inflation is bounded by the size the header declares. */
export class DerivedFileCache {
 private readonly store:DerivedFileStore;
 readonly identity:string;
 private writes:Promise<void>=Promise.resolve();
 constructor(store:DerivedFileStore,identity=VIEWER_DERIVED_IDENTITY){
  if(typeof identity!=='string'||!identity||identity.length>200)throw Error('Invalid derived cache identity');
  this.store=store;this.identity=identity;
 }
 private async slot(kind:string,key:string){
  if(!kindName.test(kind)||!sha256.test(key))throw Error('Invalid derived cache key');
  return parseInt((await hashBytes(JSON.stringify([DERIVED_FILE_CACHE_FORMAT,this.identity,kind,key]))).slice(0,8),16)%DERIVED_FILE_CACHE_LIMITS.slots;
 }
 async get<T>(kind:string,key:string,validate:(value:unknown)=>T):Promise<T|undefined>{
  try{
   const bytes=await this.store.read(derivedCacheSlotName(await this.slot(kind,key)));
   if(!bytes||bytes.byteLength>DERIVED_FILE_CACHE_LIMITS.slotBytes)return;
   const newline=bytes.subarray(0,MAX_HEADER).indexOf(10);if(newline<1)return;
   const header=JSON.parse(strFromU8(bytes.subarray(0,newline))) as Header;
   if(header.format!==DERIVED_FILE_CACHE_FORMAT||header.identity!==this.identity||header.kind!==kind||header.key!==key||
    !Number.isSafeInteger(header.payloadBytes)||header.payloadBytes<2||header.payloadBytes>DERIVED_FILE_CACHE_LIMITS.payloadBytes)return;
   const payload=inflateSync(bytes.subarray(newline+1),{out:new Uint8Array(header.payloadBytes)});
   if(payload.byteLength!==header.payloadBytes||await hashBytes(payload)!==header.payloadSha256)return;
   return validate(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(payload)));
  }catch{return;}
 }
 /** Ordered and best effort: a refused or failed write keeps the old slot or none. */
 put(kind:string,key:string,value:unknown):Promise<void>{
  const write=async()=>{
   const payload=strToU8(JSON.stringify(value));if(payload.byteLength>DERIVED_FILE_CACHE_LIMITS.payloadBytes)return;
   const header:Header={format:DERIVED_FILE_CACHE_FORMAT,identity:this.identity,kind,key,payloadSha256:await hashBytes(payload),payloadBytes:payload.byteLength},
    head=strToU8(JSON.stringify(header)+'\n'),body=deflateSync(payload,{level:1});
   if(head.byteLength>MAX_HEADER||head.byteLength+body.byteLength>DERIVED_FILE_CACHE_LIMITS.slotBytes)return;
   const bytes=new Uint8Array(head.byteLength+body.byteLength);bytes.set(head);bytes.set(body,head.byteLength);
   await this.store.write(derivedCacheSlotName(await this.slot(kind,key)),bytes);
  };
  this.writes=this.writes.then(write).catch(()=>{});return this.writes;
 }
 flush():Promise<void>{return this.writes;}
}
