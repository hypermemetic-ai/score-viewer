import {strFromU8,strToU8,zipSync} from 'fflate';
import {prepareInstrumentReading,validateInstrumentReadingScore,instrumentReadingEngine,
  type ReadingOwner,type JankoLayoutOptions,type JankoTokens} from '../vendor/iso-notation/src/score-presentation';
import type {QuantizedGridScore,InstrumentReadingPolicy} from '../vendor/iso-notation/src/model/types';
import {hashBytes,importPackageForReading,type Manifest,type Metadata} from './package';

export interface ReadingDescriptor {
  version:'instrument-reading-package-v1';
  engineId:ReturnType<typeof prepareInstrumentReading>['engineId'];
  policy:InstrumentReadingPolicy;
  owners:'reading-owners.json';
  layout:'reading-layout.json';
  options:Partial<JankoLayoutOptions>;
  tokens:Partial<JankoTokens>;
}
export interface ReadingContent {
  owners:ReadingOwner[];
  layoutMetadata:ReturnType<typeof prepareInstrumentReading>['layoutMetadata'];
  geometryEvidence:ReturnType<typeof prepareInstrumentReading>['geometryEvidence'];
}

const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
function boundedScore(score:QuantizedGridScore):void {
  if(!object(score)||typeof score.id!=='string'||!score.id||typeof score.title!=='string'||typeof score.composer!=='string'||
    !Array.isArray(score.notes)||score.notes.length>10_000||!Array.isArray(score.sourceBarTicks)||
    score.sourceBarTicks.length>2_001)throw Error('Reading preparation needs a complete score of at most 10,000 events and 2,000 measures.');
  validateInstrumentReadingScore(score);
}
function checkedPreparation(score:QuantizedGridScore,options:Partial<JankoLayoutOptions>,tokens:Partial<JankoTokens>){
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

/** Canonical musical admission does not grant physical practice capabilities.
 * Pages and ownership replay through the exact shared engine authority before
 * the application exposes the archive or writes any library pointer. */
export function admitReadingContent(m:Manifest,files:Record<string,Uint8Array>):{
  score:QuantizedGridScore;pages:string[];reading:ReadingContent
} {
  const d=m.reading;
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
  const result=checkedPreparation(score,d.options,d.tokens),owners=parse(files,d.owners),layout=parse(files,d.layout);
  if(result.engineId!==d.engineId)throw Error('Reading preparation authority differs from its musical source.');
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
  options?:Partial<JankoLayoutOptions>;tokens?:Partial<JankoTokens>}):Promise<Uint8Array> {
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
