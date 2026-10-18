import {strFromU8,strToU8,unzipSync,zipSync} from 'fflate';
import {prepareInstrumentReading,validateInstrumentReadingScore,instrumentReadingEngine,
  type ReadingOwner,type IsoLayoutOptions,type IsoTokens} from '../vendor/iso-notation/src/score-presentation';
import type {QuantizedGridScore,InstrumentReadingPolicy} from '../vendor/iso-notation/src/model/types';
import {hashBytes,importPackageForReading,readEditionContent,type Manifest,type Metadata} from './package';
import {admitDualReadingContent,type DualReadingDescriptor,type DualReadingContent} from './dual-reading-package';

export interface LegacyReadingDescriptor {
  version:'instrument-reading-package-v1';
  engineId:ReturnType<typeof prepareInstrumentReading>['engineId'];
  policy:InstrumentReadingPolicy;
  owners:'reading-owners.json';
  layout:'reading-layout.json';
  options:Partial<IsoLayoutOptions>;
  tokens:Partial<IsoTokens>;
}
export type ReadingDescriptor=LegacyReadingDescriptor|DualReadingDescriptor;
export interface ReadingContent {
  owners:ReadingOwner[];
  layoutMetadata:ReturnType<typeof prepareInstrumentReading>['layoutMetadata'];
  geometryEvidence:ReturnType<typeof prepareInstrumentReading>['geometryEvidence'];
  dual?:DualReadingContent;
}

const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
function boundedScore(score:QuantizedGridScore):void {
  if(!object(score)||typeof score.id!=='string'||!score.id||typeof score.title!=='string'||typeof score.composer!=='string'||
    !Array.isArray(score.notes)||score.notes.length>10_000||!Array.isArray(score.sourceBarTicks)||
    score.sourceBarTicks.length>2_001)throw Error('Reading preparation needs a complete score of at most 10,000 events and 2,000 measures.');
  validateInstrumentReadingScore(score);
}
function checkedPreparation(score:QuantizedGridScore,options:Partial<IsoLayoutOptions>,tokens:Partial<IsoTokens>){
  const result=prepareInstrumentReading(score,options,tokens);
  if(!result.geometryEvidence.ok)throw Error('Reading page geometry needs correction: '+result.geometryEvidence.violations.slice(0,3).map(v=>v.message).join('; '));
  const ids=new Set(result.owners.map(owner=>owner.id));
  if(ids.size!==score.notes.length||result.owners.length!==score.notes.length||score.notes.some(event=>!ids.has(event.id))||
    result.owners.some(owner=>!owner.heads.length||owner.heads.some(head=>!Number.isSafeInteger(head.page)||head.page<0||head.page>=result.pages.length||
      !Number.isSafeInteger(head.system)||head.system<0||head.system>=result.layoutMetadata.length||!Number.isFinite(head.x)||!Number.isFinite(head.y)||
      head.x<0||head.y<0||head.x>result.options.pageWidth||head.y>result.options.pageHeight)))
    throw Error('Reading preparation has incomplete or invalid musical event appearances.');
  return result;
}
function parse(files:Record<string,Uint8Array>,name:string):unknown {
  if(!files[name])throw Error('Missing reading member: '+name);
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(files[name]));}
  catch{throw Error('Invalid reading JSON: '+name);}
}

/** Proof that this viewer build replayed one exact reading archive through the
 * shared engine and found it equal. It carries only the derived geometry
 * evidence the archive does not store; it is never written into a package. */
export interface ReadingAdmissionReceipt {version:'reading-admission-receipt-v1';geometryEvidence:ReadingContent['geometryEvidence']}
export function readingAdmissionReceipt(value:unknown):ReadingAdmissionReceipt {
  const r=value as ReadingAdmissionReceipt;
  if(!object(r)||r.version!=='reading-admission-receipt-v1'||Object.keys(r).length!==2||!object(r.geometryEvidence)||r.geometryEvidence.ok!==true||
    !Array.isArray(r.geometryEvidence.violations)||r.geometryEvidence.violations.length)throw Error('Invalid reading admission receipt');
  return r;
}

/** Canonical musical admission does not grant physical practice capabilities.
 * Pages and ownership replay through the exact shared engine authority before
 * the application exposes the archive or writes any library pointer.
 * `contentOnly` reads a single-reading archive for its musical content: the
 * same source and policy checks, but its pages, owners and layout are drawn
 * by the pinned engine instead of compared with the stored ones, which the
 * archive's member hashes already bind. Such content is for engraving the
 * archive again or reading its own facts, never for display. */
export function admitReadingContent(m:Manifest,files:Record<string,Uint8Array>,receipt?:ReadingAdmissionReceipt,contentOnly=false):{
  score:QuantizedGridScore;pages:string[];reading:ReadingContent
} {
  const d=m.reading;
  if(d?.version==='instrument-reading-package-v2')return admitDualReadingContent(m,files);
  if(!d||!object(d)||Object.keys(d).some(k=>!['version','engineId','policy','owners','layout','options','tokens'].includes(k))||
    d.version!=='instrument-reading-package-v1'||typeof d.engineId!=='string'||m.engineVersion!==d.engineId||
    d.owners!=='reading-owners.json'||d.layout!=='reading-layout.json'||!object(d.options)||!object(d.tokens)||
    ['keyboardLayout','presentations','fingerGeometry','renderingRecipe','calculationContext','preparationIdentity','calculatedHandReceipt',
      'transposition','effectiveHandSha256','profileId','profileSha256','layerSourceHash','referenceMidi','sourceScore','sourceRevision','sourceSha256'].some(k=>k in m)||
    files['fingers.json']||!files[d.owners]||!files[d.layout]||m.pages.length>500||
    m.files[m.font]!=='5b009410cf5231dcb1e45b155c1afedcfc63d82042fd8c414d0dd7705c9fbbae'||!m.notices.length)
    throw Error('Unsupported or incomplete musical reading package.');
  const score=parse(files,'score.json') as QuantizedGridScore;
  boundedScore(score);
  if(d.engineId!==instrumentReadingEngine(score.readingPolicy!))
    throw Error('Reading preparation authority differs from its admitted musical policy.');
  if(score.id!==m.scoreId||score.title!==m.metadata.title||score.composer!==m.metadata.composer||
    JSON.stringify(score.readingPolicy)!==JSON.stringify(d.policy)||strFromU8(files['seats.json']??strToU8('null'))!=='[]')
    throw Error('Reading source identity or policy differs.');
  if(receipt){
    // This build already replayed exactly these archive bytes: owners, layout
    // and pages are the archive's own members, bound by its digest.
    const owners=parse(files,d.owners) as ReadingOwner[],layout=parse(files,d.layout) as ReadingContent['layoutMetadata'];
    if(!Array.isArray(owners)||owners.length!==score.notes.length||!Array.isArray(layout))throw Error('Reading event ownership or geometry differs from its musical source.');
    const pages=m.pages.map(name=>{if(!files[name])throw Error('Missing reading page: '+name);return strFromU8(files[name]);});
    return {score,pages,reading:{owners,layoutMetadata:layout,geometryEvidence:receipt.geometryEvidence}};
  }
  const result=checkedPreparation(score,d.options,d.tokens),owners=parse(files,d.owners),layout=parse(files,d.layout);
  if(result.engineId!==d.engineId)throw Error('Reading preparation authority differs from its musical source.');
  if(contentOnly)return {score,pages:result.pages,reading:{owners:result.owners,layoutMetadata:result.layoutMetadata,geometryEvidence:result.geometryEvidence}};
  if(result.pages.length!==m.pages.length||JSON.stringify(result.owners)!==JSON.stringify(owners)||
    JSON.stringify(result.layoutMetadata)!==JSON.stringify(layout))throw Error('Reading event ownership or geometry differs from its musical source.');
  const pages=m.pages.map((name,index)=>{
    if(!files[name])throw Error('Missing reading page: '+name);
    const page=strFromU8(files[name]);
    if(page!==result.pages[index])throw Error('Reading page differs from its shared source preparation: '+name);
    return page;
  });
  return {score,pages,reading:{owners:result.owners,layoutMetadata:result.layoutMetadata,geometryEvidence:result.geometryEvidence}};
}

/** Local archive assembly from shared musical meaning and shared ink. No
 * source score, personal state, input device or native installation is changed. */
export async function prepareReadingPackage(input:{score:QuantizedGridScore;metadata:Metadata;createdAt:string;
  font:{name:string;bytes:Uint8Array};notices:Record<string,Uint8Array>;
  options?:Partial<IsoLayoutOptions>;tokens?:Partial<IsoTokens>}):Promise<Uint8Array> {
  boundedScore(input.score);
  if(!input.createdAt||input.metadata.title!==input.score.title||input.metadata.composer!==input.score.composer||
    !input.font.name||!input.font.bytes.length||!Object.keys(input.notices).length)throw Error('Incomplete musical reading preparation.');
  const prepared=checkedPreparation(input.score,input.options??{},input.tokens??{});
  if(!prepared.pages.length||prepared.pages.length>500)throw Error('Reading preparation exceeds 500 pages.');
  const files:Record<string,Uint8Array>={'score.json':strToU8(JSON.stringify(input.score)),'seats.json':strToU8('[]'),
    'reading-owners.json':strToU8(JSON.stringify(prepared.owners)),
    'reading-layout.json':strToU8(JSON.stringify(prepared.layoutMetadata))};
  const put=(name:string,bytes:Uint8Array)=>{
    if(name==='manifest.json'||name in files||!/^[A-Za-z0-9_./-]+$/.test(name)||name.includes('..')||name.startsWith('/'))
      throw Error('Conflicting or unsafe reading member: '+name);
    files[name]=new Uint8Array(bytes);
  };
  put(input.font.name,input.font.bytes);
  for(const [name,bytes]of Object.entries(input.notices))put(name,bytes);
  const pages=prepared.pages.map((svg,index)=>{const name=`pages/${index+1}.svg`;put(name,strToU8(svg));return name;});
  const revision=await hashBytes(files['score.json']),m:Manifest={format:'iso-score',version:3,scoreId:input.score.id,
    revision,semanticSha256:revision,engineVersion:prepared.engineId,metadata:structuredClone(input.metadata),createdAt:input.createdAt,
    pages,font:input.font.name,notices:Object.keys(input.notices),files:{},reading:{version:'instrument-reading-package-v1',
      engineId:prepared.engineId,policy:structuredClone(input.score.readingPolicy!),owners:'reading-owners.json',layout:'reading-layout.json',
      options:prepared.options,tokens:prepared.tokens}};
  m.files=Object.fromEntries(await Promise.all(Object.entries(files).map(async([name,bytes])=>[name,await hashBytes(bytes)])));
  files['manifest.json']=strToU8(JSON.stringify(m));
  const bytes=zipSync(files,{level:6});
  await importPackageForReading(bytes);
  return bytes;
}

const manifestOf=(bytes:Uint8Array):Manifest|undefined=>{
  try{return JSON.parse(strFromU8(unzipSync(bytes,{filter:f=>f.name==='manifest.json'})['manifest.json'])) as Manifest;}catch{return;}
};
/** A single-reading archive whose pages the pinned engraving no longer draws
 * byte for byte (an earlier shared engraving, say) is engraved again from its
 * own content: the same score bytes, metadata, creation time, font, notices,
 * layout options and tokens. Pages, owners and layout are drawn afresh;
 * nothing is calculated and the earlier archive is not changed. Returns
 * undefined for any other kind of archive. When the archive's content itself
 * doesn't read, or carries members this would not keep, `refusal` is thrown. */
export async function reengraveReadingArchive(bytes:Uint8Array,refusal:unknown):Promise<Uint8Array|undefined>{
  const peek=manifestOf(bytes);
  if(peek?.version!==3||peek.reading?.version!=='instrument-reading-package-v1')return;
  const refuse=(error:unknown):never=>{if((error as Error)?.name==='AbortError')throw error;throw refusal;};
  const content=await readEditionContent(bytes,{allowLegacyTempo:true}).catch(refuse),m=content.manifest,d=m.reading as LegacyReadingDescriptor,files=content.files;
  const members=new Set(['score.json','seats.json',d.owners,d.layout,m.font,...m.notices,...m.pages]);
  if(Object.keys(m.files).length!==members.size||Object.keys(m.files).some(name=>!members.has(name)))return refuse(Error('This reading carries files engraving it again would not keep.'));
  const again=await prepareReadingPackage({score:JSON.parse(strFromU8(files['score.json'])) as QuantizedGridScore,metadata:structuredClone(m.metadata),createdAt:m.createdAt,
    font:{name:m.font,bytes:files[m.font]},notices:Object.fromEntries(m.notices.map(name=>[name,files[name]])),options:d.options,tokens:d.tokens});
  // The score's identity is its source bytes; engraving again never changes them.
  if(manifestOf(again)?.revision!==m.revision)return refuse(Error('Engraving this reading again would change its musical source.'));
  return again;
}
