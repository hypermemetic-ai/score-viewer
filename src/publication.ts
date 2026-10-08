import {strFromU8,strToU8,zipSync} from 'fflate';
import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';
import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';
import {hashBytes,handDigest,importPackage,type Manifest,type Metadata,type PresentationDescriptor,type ScorePackage,type Seat} from './package';
import {validateReferenceMidi} from './reference-midi';

export const TUNA_EXTENSION='.tuna';
export const MAX_SHARED_SCORE_BYTES=50_000_000;
export function scoreFilename(title:string):string {
  let base=title.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90);
  if(!base||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(base))base='Score';
  return base+TUNA_EXTENSION;
}
export function validateScoreSave(bytes:Uint8Array,filename:string):void {
  if(bytes.length>MAX_SHARED_SCORE_BYTES||bytes.length<4||bytes[0]!==0x50||bytes[1]!==0x4b||bytes[2]!==3||bytes[3]!==4)throw Error('Invalid or oversized shared score.');
  if(filename.length>100||!/^([A-Za-z0-9][A-Za-z0-9-]*)\.tuna$/.test(filename)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])\.tuna$/i.test(filename))throw Error('Invalid shared score filename.');
}

/** Declared reading/generation roles, never a directory or attachment sweep. */
export function publicationMembers(m:Manifest):Set<string> {
  const names=new Set(['score.json','seats.json',m.font,...m.pages,...m.notices]);
  if(m.version===1&&m.files['fingers.json'])names.add('fingers.json');
  if(m.version===2){
    if(m.sourceScore)names.add(m.sourceScore);
    if(m.renderingRecipe)names.add(m.renderingRecipe);
    if(m.calculatedHandReceipt)names.add(m.calculatedHandReceipt);
    for(const d of Object.values(m.presentations??{}))if(d){
      [d.score,d.seats,d.fingers,d.renderingRecipe,d.calculatedHandReceipt,...d.pages].forEach(n=>{if(n)names.add(n);});
    }
  }
  if(m.referenceMidi)names.add(m.referenceMidi.file);
  return names;
}
function validateNotices(m:Manifest,files:Record<string,Uint8Array>):void {
  for(const name of m.notices){
    if(!/\.(txt|md)$/i.test(name)&&!/(^|\/)(?:[A-Za-z0-9-]+-)?(LICENSE|COPYING)(?:-[A-Za-z0-9-]+)?$/.test(name))throw Error('Publication notices must be plain text: '+name);
    const b=files[name];if(!b||b.length>1_048_576)throw Error('Missing or oversized publication notice: '+name);
    let text:string;try{text=new TextDecoder('utf-8',{fatal:true}).decode(b);}catch{throw Error('Publication notice is not UTF-8: '+name);}
    if(/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text)||/^%PDF-|^PK\x03\x04/.test(text))throw Error('Publication notice is not plain text: '+name);
  }
}
export interface Publication {bytes:Uint8Array;filename:string;inventory:Array<{name:string;bytes:number;sha256:string}>;package:ScorePackage;excluded:string[];}

/** Revalidate the installed collection, then copy its declared bytes exactly.
 * Personal state, painted DOM and host/device services never enter this path. */
export async function publishPackage(p:ScorePackage,referenceMidi?:Uint8Array):Promise<Publication> {
  const original=p.collectionManifest??p.manifest;
  if(!p.files['manifest.json']||JSON.stringify(JSON.parse(strFromU8(p.files['manifest.json'])))!==JSON.stringify(original))throw Error('Installed publication manifest differs from its admitted archive.');
  // Validate the original pins before any new inventory is computed. Mutable
  // Uint8Array members must never be silently blessed by publication.
  const entries=Object.entries(p.files),expanded=entries.reduce((n,[,b])=>n+b.length,0);
  if(entries.length!==Object.keys(original.files).length+1||expanded>100_000_000||entries.some(([,b])=>b.length>20_000_000))throw Error('Installed publication inventory differs or exceeds archive bounds.');
  const snapshot=Object.fromEntries(entries.map(([n,b])=>[n,new Uint8Array(b)]));
  for(const [name,pin] of Object.entries(original.files))if(!snapshot[name]||await hashBytes(snapshot[name])!==pin)throw Error('Integrity mismatch: '+name);
  const m:Manifest=structuredClone(original);
  if(m.version===1){delete m.sourceScore;delete m.sourceRevision;delete m.sourceSha256;delete m.renderingRecipe;delete m.presentations;delete m.calculationContext;delete m.preparationIdentity;delete m.calculatedHandReceipt;}
  const names=publicationMembers(m),files:Record<string,Uint8Array>={};
  for(const name of names){if(!snapshot[name])throw Error('Missing publication member: '+name);files[name]=snapshot[name];}
  validateNotices(m,files);
  if(referenceMidi!==undefined){validateReferenceMidi(referenceMidi);files['reference.mid']=new Uint8Array(referenceMidi);m.referenceMidi={file:'reference.mid'};}
  m.files=Object.fromEntries(await Promise.all(Object.entries(files).map(async([n,b])=>[n,await hashBytes(b)])));
  files['manifest.json']=strToU8(JSON.stringify(m));
  const bytes=zipSync(files,{level:9}),filename=scoreFilename(m.metadata.title);validateScoreSave(bytes,filename);
  const checked=await importPackage(bytes,{allowLegacyTempo:true});
  return {bytes,filename,package:checked,excluded:Object.keys(p.files).filter(n=>n!=='manifest.json'&&!names.has(n)),inventory:Object.entries(m.files).map(([name,sha256])=>({name,sha256,bytes:files[name].length}))};
}

export interface PreparedNativePublication {
  source:Uint8Array;
  metadata:Metadata;
  engineVersion:string;
  createdAt:string;
  font:{name:string;bytes:Uint8Array};
  notices:Record<string,Uint8Array>;
  presentations:Array<{layoutId:PhysicalKeyboardId;score?:Uint8Array;seats:Seat[];pages:string[]}>;
}
/** Publish already approved static pages. This function neither engraves nor
 * calculates hands/fingers; the source and every visible owner stay native. */
export async function publishPreparedNative(input:PreparedNativePublication,referenceMidi?:Uint8Array):Promise<Publication> {
  if(!input.engineVersion||!input.createdAt||!input.presentations.length||input.presentations.length>2||new Set(input.presentations.map(p=>p.layoutId)).size!==input.presentations.length)throw Error('Incomplete native preparation.');
  const source=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(input.source)) as QuantizedGridScore,sourceHash=await hashBytes(input.source);
  const files:Record<string,Uint8Array>={'source-score.json':input.source,[input.font.name]:input.font.bytes,...input.notices},presentations:Manifest['presentations']={};
  const put=(name:string,b:Uint8Array)=>{if(name in files)throw Error('Conflicting prepared member: '+name);files[name]=b;};
  for(const [index,p] of input.presentations.entries()){
    if(!['janko-four-row','conventional-piano'].includes(p.layoutId)||!p.pages.length)throw Error('Unsupported or empty prepared presentation.');
    const prefix=index?`presentations/${p.layoutId}/`:'',scoreBytes=p.score??input.source,score=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(scoreBytes)) as QuantizedGridScore;
    const revision=await hashBytes(scoreBytes),profileId='publisher-fixed-pages-v1',profileSha256=await hashBytes(JSON.stringify({kind:profileId,layoutId:p.layoutId}));
    const d:PresentationDescriptor={layoutId:p.layoutId,score:prefix+'score.json',seats:prefix+'seats.json',pages:p.pages.map((_,i)=>prefix+`pages/${i+1}.svg`),revision,profileId,profileSha256,effectiveHandSha256:await handDigest(source,score),layerSourceHash:sourceHash,engineVersion:input.engineVersion};
    put(d.score,scoreBytes);put(d.seats,strToU8(JSON.stringify(p.seats)));d.pages.forEach((n,i)=>put(n,strToU8(p.pages[i])));presentations[p.layoutId]=d;
  }
  const primary=presentations[input.presentations[0].layoutId]!;
  const m:Manifest={format:'iso-score',version:2,scoreId:source.id,metadata:input.metadata,createdAt:input.createdAt,sourceScore:'source-score.json',sourceRevision:sourceHash,sourceSha256:sourceHash,keyboardLayout:primary.layoutId,semanticSha256:primary.revision,revision:primary.revision,profileId:primary.profileId,profileSha256:primary.profileSha256,effectiveHandSha256:primary.effectiveHandSha256,layerSourceHash:primary.layerSourceHash,engineVersion:primary.engineVersion,pages:primary.pages,presentations,font:input.font.name,notices:Object.keys(input.notices),files:{}};
  m.files=Object.fromEntries(await Promise.all(Object.entries(files).map(async([n,b])=>[n,await hashBytes(b)])));files['manifest.json']=strToU8(JSON.stringify(m));
  return publishPackage(await importPackage(zipSync(files,{level:9})),referenceMidi);
}
