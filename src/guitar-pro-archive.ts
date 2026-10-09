import {unzipSync} from 'fflate';
import {hashBytes,type ScorePackage} from './package';
import {selectReadingNotation} from './dual-reading-package';
/** Bind returned archive bytes to an ACTUAL private dual receiving context.
 * Public archiveSha256 fields are descriptions, not admission authority. */
export async function assertGuitarProArchive(p:ScorePackage,bytes:Uint8Array,signal?:AbortSignal):Promise<void>{
 if(signal?.aborted)throw new DOMException('Guitar Pro operation canceled.','AbortError');
 selectReadingNotation(p,'iso');selectReadingNotation(p,'tab');
 if(bytes.length>50_000_000)throw Error('Guitar Pro archive exceeds package bound.');
 let total=0;const members=new Set<string>(),manifest=p.manifest;
 const files=unzipSync(bytes,{filter:f=>{
  if(members.has(f.name)||members.size>=10000||!Number.isSafeInteger(f.originalSize)||f.originalSize<0||f.originalSize>20_000_000||
   !/^[A-Za-z0-9_./-]+$/.test(f.name)||f.name.includes('..')||f.name.startsWith('/')||
   (f.name!=='manifest.json'&&!Object.hasOwn(manifest.files,f.name)))throw Error('Guitar Pro archive has unsafe, duplicate or foreign members.');
  total+=f.originalSize;if(total>100_000_000)throw Error('Guitar Pro archive exceeds expanded package bound.');members.add(f.name);return true;
 }});
 if(members.size!==Object.keys(manifest.files).length+1||!files['manifest.json']||
  JSON.stringify(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(files['manifest.json'])))!==JSON.stringify(manifest))
  throw Error('Guitar Pro archive manifest differs from its receiving context.');
 for(const[name,digest]of Object.entries(manifest.files)){
  if(signal?.aborted)throw new DOMException('Guitar Pro operation canceled.','AbortError');
  if(!files[name]||await hashBytes(files[name])!==digest)throw Error('Guitar Pro archive member differs from its receiving context: '+name);
 }
 if(signal?.aborted)throw new DOMException('Guitar Pro operation canceled.','AbortError');
}
