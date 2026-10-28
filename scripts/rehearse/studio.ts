// The default rehearsal's scores: everything public this repository carries,
// found rather than listed, so a new fixture or reference score is rehearsed
// without changing the rehearsal. Prepared scores are cached per notation pin.
import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {ISO_REFERENCE_SCORES,isIsoReferenceScore,prepareIsoReferenceScore} from '../../src/iso-reference-score';
import {authoredReadingPackage} from '../../test/support/instrument-reading-fixture';

export interface StudioFile {name:string;bytes:Uint8Array}
const tunaIn=async(dir:string)=>(await readdir(dir).catch(()=>[] as string[])).filter(name=>name.endsWith('.tuna')).sort();
async function cached(cache:string,name:string,make:()=>Promise<Uint8Array>){
 const path=join(cache,name);try{return new Uint8Array(await readFile(path));}catch{}
 const bytes=await make();await mkdir(cache,{recursive:true});await writeFile(path,bytes);return bytes;
}
export async function studioFiles(repo:string,cacheRoot:string):Promise<StudioFile[]>{
 const {dependencyRevision}=JSON.parse(await readFile(join(repo,'docs/source-provenance.json'),'utf8')) as {dependencyRevision:string};
 // Scores prepared before editions recorded their engraver would be engraved again on import.
 const cache=join(cacheRoot,`${dependencyRevision}-engraver-recorded`),files:StudioFile[]=[];
 for(const dir of ['fixtures','public/review'])for(const name of await tunaIn(join(repo,dir)))files.push({name:`${dir}/${name}`,bytes:new Uint8Array(await readFile(join(repo,dir,name)))});
 const notices:Record<string,Uint8Array>={};
 for(const name of ['URW-base35-COPYING','URW-base35-LICENSE','URW-base35-provenance.md'])notices['licenses/'+name]=new Uint8Array(await readFile(join(repo,'licenses',name)));
 const font={name:'fonts/URWGothic-Demi.otf',bytes:new Uint8Array(await readFile(join(repo,'src/URWGothic-Demi.otf')))};
 for(const id of Object.keys(ISO_REFERENCE_SCORES).filter(isIsoReferenceScore))
  files.push({name:`iso-reference/${id}`,bytes:await cached(cache,`${id}.tuna`,async()=>(await prepareIsoReferenceScore(id,{font,notices},dependencyRevision)).bytes)});
 // A score for another instrument: the reader shows it, practice must not offer piano practice for it.
 files.push({name:'instrument-reading/authored',bytes:await cached(cache,'instrument-reading.tuna',()=>authoredReadingPackage())});
 return files;
}
