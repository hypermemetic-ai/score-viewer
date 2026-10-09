import {admittedDualArchiveSha256,hashBytes,type ScorePackage} from './package';
import {selectReadingNotation} from './dual-reading-package';
import {collectionId,initialPersonal,personalStorageName,validEntryStorage,type Entry} from './state';

interface ManagedHost {read(name:string):Promise<Uint8Array|null>;write(name:string,bytes:Uint8Array):Promise<void>}
export class ReadingPartsCommitUnconfirmed extends Error {
 constructor(cause:unknown){super('The library update could not be confirmed. Retained files are preserved; reopen the library before trying again.',{cause});}
}
const encoder=new TextEncoder(),same=(a:Uint8Array|null,b:Uint8Array)=>!!a&&a.length===b.length&&a.every((v,i)=>v===b[i]);

/** All complete dual parts stage before one atomic library pointer write.
 * Failed/cancelled staging leaves referenced packages and journals untouched.
 * No cleanup deletes files: a failed pointer acknowledgement may be committed. */
export async function stageReadingPartsInstall(host:ManagedHost,request:{
 parts:readonly {bytes:Uint8Array;package:ScorePackage}[];entries:readonly Entry[];
 canCommit?:()=>boolean;onCommitStarted?:()=>void;
}):Promise<{entries:Entry[];selected:Entry[];commitConfirmedByReadback:boolean}> {
 if(!Array.isArray(request.parts)||request.parts.length<1||request.parts.length>8)throw Error('Choose one to eight source parts.');
 // All mutable bytes/library pointers are owned before the first await. The
 // source/view graph is the privately admitted immutable context, not a clone.
 const canCommit=request.canCommit,onCommitStarted=request.onCommitStarted,prior=structuredClone(request.entries),parts=request.parts.map(part=>{
  if(!(part.bytes instanceof Uint8Array)||part.bytes.byteLength>50_000_000)throw Error('Source archive exceeds the supported package bound.');
  const p=selectReadingNotation(part.package,'iso'),sha256=admittedDualArchiveSha256(p);
  if(!sha256)throw Error('The source part has no complete admitted archive identity.');
  return {p,sha256,bytes:new Uint8Array(part.bytes),id:collectionId(p)};
 }),check=()=>{if(canCommit&&!canCommit())throw Error('Import cancelled. Your library and choices are retained.');};
 if(new Set(parts.map(p=>p.id)).size!==parts.length||prior.some(e=>!validEntryStorage(e)))
  throw Error('Invalid or duplicate source parts; the library is retained.');
 const staged:Array<{entry:Entry;bytes:Uint8Array;personalFile?:string;personalBytes?:Uint8Array}>=[];
 check();
 for(const part of parts){
  if(await hashBytes(part.bytes)!==part.sha256)throw Error('The source archive differs from its actual admission; the library is retained.');check();
  const file=`package-${part.sha256}.isoscore`,existing=prior.find(e=>e.id===part.id);
  if(existing){
   if(existing.file!==file)throw Error('This source part has a different retained edition. The existing score and choices are retained.');
   staged.push({entry:existing,bytes:part.bytes});continue;
  }
  const personalBytes=encoder.encode(JSON.stringify(initialPersonal(part.p))),personalKey=personalStorageName(part.id,part.p),
   personalFile=`state-version-${await hashBytes(encoder.encode(crypto.randomUUID()+await hashBytes(personalBytes)))}.json`;
  check();const entry:Entry={id:part.id,file,metadata:part.p.manifest.metadata,importedAt:new Date().toISOString(),personalFiles:{[personalKey]:personalFile}};
  if(!validEntryStorage(entry))throw Error('The source part has an invalid storage identity.');
  staged.push({entry,bytes:part.bytes,personalFile,personalBytes});
 }
 const selected=staged.map(p=>p.entry),entries=[...prior,...selected.filter(p=>!prior.some(e=>e.id===p.id))];
 for(const part of staged){
  check();const retained=await host.read(part.entry.file);check();
  if(retained&&!same(retained,part.bytes))throw Error('The managed archive differs; its existing bytes and library are retained.');
  if(!retained){await host.write(part.entry.file,part.bytes);check();}
  if(part.personalFile){await host.write(part.personalFile,part.personalBytes!);check();}
 }
 const libraryBytes=encoder.encode(JSON.stringify({version:1,entries}));check();onCommitStarted?.();check();
 try{await host.write('library.json',libraryBytes);return {entries,selected,commitConfirmedByReadback:false};}
 catch(error){
  // A write can finish even when its acknowledgement is lost. Never report
  // rollback or remove stages unless a separately owned transaction proves it.
  try{if(same(await host.read('library.json'),libraryBytes))return {entries,selected,commitConfirmedByReadback:true};}catch{}
  throw new ReadingPartsCommitUnconfirmed(error);
 }
}
