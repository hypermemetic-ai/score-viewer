import {validateLayerAsync,type ScorePackage} from './package';
import {personalStorageName,legacyPersonalStorageName,readPersonal,type Entry,type PersonalState} from './state';

export class PersonalJournalError extends Error {
  readonly code:'personal-journal'|'retained-journal';
  constructor(retained:boolean,message:string){super(message+' The journal bytes and current edition are retained.');this.code=retained?'retained-journal':'personal-journal';}
}

/** A declared version pointer is evidence of a saved journal. Its absence may
 * never authorize legacy fallback, a fresh state, or a replacement write. */
export async function loadPersonalJournal(host:{read(name:string):Promise<Uint8Array|null>},entry:Entry,p:ScorePackage,
 options:{personalFiles?:Record<string,string>;retained?:boolean;fallbackPersonal?:PersonalState}={}):Promise<PersonalState>{
 const files=options.personalFiles??entry.personalFiles,key=personalStorageName(entry.id,p),
  declared=!!files&&Object.prototype.hasOwnProperty.call(files,key),file=declared?files![key]:key;
 if(typeof file!=='string'||!file)throw new PersonalJournalError(!!options.retained,'The declared personal journal pointer is invalid.');
 const stored=await host.read(file);
 if(declared&&!stored)throw new PersonalJournalError(!!options.retained,'The declared personal journal is missing.');
 const legacy=legacyPersonalStorageName(p),fallback=stored??(legacy?await host.read(legacy):null);
 let raw:unknown;
 if(fallback)try{
  raw=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(fallback));
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid journal object');
 }catch{throw new PersonalJournalError(!!options.retained,'The personal journal cannot be read.');}
 const personal=readPersonal(raw??options.fallbackPersonal,p,{allowLegacyJanko:!stored&&!!fallback&&!!legacy});
 if(personal.layer)await validateLayerAsync(personal.layer,p);
 for(const layer of personal.history)await validateLayerAsync(layer,p,{history:true});
 return personal;
}
