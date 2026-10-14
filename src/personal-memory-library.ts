import {hashBytes,selectPresentation,type ScorePackage} from './package';
import {loadPersonalJournal} from './personal-journal';
import {scoreCapabilities} from './score-capabilities';
import {personalStorageName,type Entry} from './state';
import type {MemoryScoreInput} from './personal-fingering-memory';

/** Captures only active archives and their declared current personal journals.
 * Historical packages, undo buffers and calculated layers are never new donors. */
export class PersonalMemoryLibrary {
 private captured=new Map<string,string|null>();private capturedLibrary='';
 inputs:MemoryScoreInput[]=[];
 constructor(private host:{read(name:string):Promise<Uint8Array|null>},private entries:()=>readonly Entry[],private admit:(bytes:Uint8Array)=>Promise<ScorePackage>){}
 async scan():Promise<MemoryScoreInput[]>{
  const captured=new Map<string,string|null>(),library=JSON.stringify(this.entries());
  const read=async(name:string)=>{const bytes=await this.host.read(name);captured.set(name,bytes?await hashBytes(bytes):null);return bytes;};
  const libraryBytes=await read('library.json');if(libraryBytes&&JSON.stringify(JSON.parse(new TextDecoder().decode(libraryBytes)).entries)!==library)throw Error('The library changed before fingering choices could be indexed.');
  const inputs:MemoryScoreInput[]=[];
  for(const entry of [...this.entries()].sort((a,b)=>a.id.localeCompare(b.id))){
   const bytes=await read(entry.file);if(!bytes)throw Error('An active score is missing; personal fingering indexing has not changed your choices.');
   const archive=await this.admit(bytes);if(!scoreCapabilities(archive).pianoPreparation)continue;
   const presentations=archive.availablePresentations?.length?await Promise.all(archive.availablePresentations.map(layout=>selectPresentation(archive,layout))):[archive];
   for(const p of presentations){const personal=await loadPersonalJournal({read},entry,p);inputs.push({entryId:entry.id,importedAt:entry.importedAt,p,personal});}
  }
  if(JSON.stringify(this.entries())!==library)throw Error('The library changed while fingering choices were being indexed.');
  this.captured=captured;this.capturedLibrary=library;this.inputs=inputs;return inputs;
 }
 async validate(){if(JSON.stringify(this.entries())!==this.capturedLibrary)return false;for(const [name,hash] of this.captured){const bytes=await this.host.read(name);if((bytes?await hashBytes(bytes):null)!==hash)return false;}return true;}
 remember(input:MemoryScoreInput){const key=personalStorageName(input.entryId,input.p),index=this.inputs.findIndex(q=>personalStorageName(q.entryId,q.p)===key);if(index<0)this.inputs.push(input);else this.inputs[index]=input;}
}
