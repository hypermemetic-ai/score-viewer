import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {ISO_REFERENCE_SCORES,isIsoReferenceScore,prepareIsoReferenceScore} from '../src/iso-reference-score';
import {importPackageForReading} from '../src/package';

const usage=`Usage: node --import tsx scripts/prepare-iso-score.ts <${Object.keys(ISO_REFERENCE_SCORES).join('|')}> <output.tuna>`;
async function main():Promise<void> {
 const [id,output,...rest]=process.argv.slice(2);
 if(!id||!output||rest.length||!isIsoReferenceScore(id))throw Error(usage);
 if(!output.endsWith('.tuna'))throw Error('Choose a new .tuna output file.');
 const root=new URL('../',import.meta.url);
 // The pinned, clean notation dependency is the revision the package names.
 execFileSync(process.execPath,[fileURLToPath(new URL('scripts/check-source-pin.mjs',root))],{stdio:['ignore','ignore','inherit']});
 const {dependencyRevision}=JSON.parse(await readFile(new URL('docs/source-provenance.json',root),'utf8')) as {dependencyRevision:string};
 const notices:Record<string,Uint8Array>={};
 for(const name of ['URW-base35-COPYING','URW-base35-LICENSE','URW-base35-provenance.md'])
  notices['licenses/'+name]=await readFile(new URL('licenses/'+name,root));
 const {bytes,revision}=await prepareIsoReferenceScore(id,{font:{name:'fonts/URWGothic-Demi.otf',bytes:await readFile(new URL('src/URWGothic-Demi.otf',root))},notices},dependencyRevision);
 const p=await importPackageForReading(bytes);
 await writeFile(output,bytes,{flag:'wx'});
 console.log(JSON.stringify({output:resolve(output),sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,
  title:p.manifest.metadata.title,composer:p.manifest.metadata.composer,provenance:p.manifest.metadata.provenance,
  isoRevision:dependencyRevision,activeRevision:revision,engine:p.manifest.engineVersion,keyboards:p.availablePresentations,
  pages:p.pages.length,events:p.score.notes.length,seats:p.seats.length},null,2));
}
main().catch(error=>{console.error((error as Error).message);process.exitCode=1;});
