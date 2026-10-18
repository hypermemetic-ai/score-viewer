import {admittedDualArchiveSha256,hashBytes,type ScorePackage} from './package';
import {scoreFileName,scoreFileSha256} from './score-file-name';
import {selectReadingNotation} from './dual-reading-package';
import {guitarProContext} from './guitar-pro-provider';
import {conservativeMaterialBytes,PACKAGE_MATERIAL_BUDGET_BYTES} from './package-material';
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
 const material=()=>{if(conservativeMaterialBytes({selection:request.parts,parts,prior:requestedPrior},PACKAGE_MATERIAL_BUDGET_BYTES)>PACKAGE_MATERIAL_BUDGET_BYTES)
  throw Error('This selection is too large to prepare together. Import fewer tracks.');};
 const canCommit=request.canCommit,onCommitStarted=request.onCommitStarted,requestedPrior=structuredClone(request.entries),parts:Array<{p:ScorePackage;sha256:string;bytes:Uint8Array;id:string;source:ReturnType<typeof guitarProContext>}>=[];
 material();for(const part of request.parts){
  if(!(part.bytes instanceof Uint8Array)||part.bytes.byteLength>50_000_000)throw Error('Source archive exceeds the supported package bound.');
  const p=selectReadingNotation(part.package,'iso'),sha256=admittedDualArchiveSha256(p);
  if(!sha256)throw Error('The source part has no complete admitted archive identity.');
  parts.push({p,sha256,bytes:new Uint8Array(part.bytes),id:collectionId(p),source:guitarProContext(p)});material();
 }
 const check=()=>{if(canCommit&&!canCommit())throw Error('Import cancelled. Your library and choices are retained.');};
 if(new Set(parts.map(p=>p.id)).size!==parts.length||requestedPrior.some(e=>!validEntryStorage(e)))
  throw Error('Invalid or duplicate source parts; the library is retained.');
 const staged:Array<{entry:Entry;bytes:Uint8Array;personalFile?:string;personalBytes?:Uint8Array}>=[];
 check();
 const priorLibraryBytes=await host.read('library.json');check();
 let library:Record<string,unknown>&{version:1;entries:Entry[]};
 try{library=priorLibraryBytes?JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(priorLibraryBytes)):{version:1,entries:[]};}
 catch{throw Error('The managed library is invalid; its bytes and choices are retained.');}
 if(!library||library.version!==1||!Array.isArray(library.entries)||library.entries.some(e=>!validEntryStorage(e))||
  JSON.stringify(library.entries)!==JSON.stringify(requestedPrior))throw Error('The managed library changed; its current scores and choices are retained.');
 const prior=library.entries;
 for(const part of parts){
  if(await hashBytes(part.bytes)!==part.sha256)throw Error('The source archive differs from its actual admission; the library is retained.');check();
  const file=scoreFileName(part.sha256),existing=prior.find(e=>e.id===part.id);
  if(existing){
   if(scoreFileSha256(existing.file)!==part.sha256)throw Error('This source part has a different retained edition. The existing score and choices are retained.');
   staged.push({entry:existing,bytes:part.bytes});continue;
  }
  const personalBytes=encoder.encode(JSON.stringify(initialPersonal(part.p))),personalKey=personalStorageName(part.id,part.p),
   personalFile=`state-version-${await hashBytes(encoder.encode(crypto.randomUUID()+await hashBytes(personalBytes)))}.json`;
  check();const source=part.source,entry:Entry={id:part.id,file,metadata:part.p.manifest.metadata,importedAt:new Date().toISOString(),personalFiles:{[personalKey]:personalFile},
   ...(source?{guitarPro:{version:'guitar-pro-entry-hint-v1' as const,groupId:source.groupId,inputSha256:source.inputSha256,sourceTrackId:source.sourceTrackId,...(source.sourceName?{sourceName:source.sourceName}:{})}}:{})};
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
 const currentLibraryBytes=await host.read('library.json');check();
 if(priorLibraryBytes?!same(currentLibraryBytes,priorLibraryBytes):currentLibraryBytes!==null)
  throw Error('The managed library changed during import; its current scores and choices are retained.');
 if(entries.length===prior.length)return {entries,selected,commitConfirmedByReadback:false};
 // The host supplies atomic file writes; the app owns serial operation guards.
 // This snapshot check does not claim a cross-process compare-and-swap.
 const libraryBytes=encoder.encode(JSON.stringify({...library,version:1,entries}));check();onCommitStarted?.();check();
 try{await host.write('library.json',libraryBytes);return {entries,selected,commitConfirmedByReadback:false};}
 catch(error){
  // A write can finish even when its acknowledgement is lost. Never report
  // rollback or remove stages unless a separately owned transaction proves it.
  try{if(same(await host.read('library.json'),libraryBytes))return {entries,selected,commitConfirmedByReadback:true};}catch{}
  throw new ReadingPartsCommitUnconfirmed(error);
 }
}
