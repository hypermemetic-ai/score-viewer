/** Derive vendor/score-converter/source-package-identity.json from an actual packed
 * score-converter archive. Every pin is read from the archive itself; only the
 * source revision/tree and the archive's recorded build path come from outside.
 *
 *   node scripts/converter-package-identity.mjs <clean-converter-checkout> <packed.tgz>
 */
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
/** Regular files of an npm-packed (ustar, optional pax path) archive, in order. */
export function archiveFiles(archive){
 const tar=gunzipSync(archive),files=new Map(),text=(o,n)=>tar.subarray(o,o+n).toString('utf8').replace(/\0.*$/s,'');
 let offset=0,paxPath;
 while(offset+512<=tar.length&&tar[offset]!==0){
  const size=parseInt(text(offset+124,12).trim()||'0',8),type=String.fromCharCode(tar[offset+156]||48),body=tar.subarray(offset+512,offset+512+size);
  const prefix=text(offset+345,155),name=paxPath??(prefix?prefix+'/':'')+text(offset,100);
  if(type==='x'){paxPath=/\d+ path=([^\n]*)\n/.exec(body.toString('utf8'))?.[1];}
  else{paxPath=undefined;if(type==='0'){if(files.has(name))throw Error('Duplicate archive member: '+name);files.set(name,body);}}
  offset+=512+Math.ceil(size/512)*512;
 }
 return files;
}
function graphPins(files,graphPath,publicImport){
 const bytes=files.get('package/'+graphPath);if(!bytes)throw Error('Archive lacks '+graphPath);
 const graph=JSON.parse(bytes.toString('utf8'));
 if(graph.schema!=='score-converter-webview-runtime/1'||graph.publicImport!==publicImport)throw Error('Unsupported runtime graph: '+graphPath);
 for(const asset of graph.assets){const actual=files.get('package/'+asset.path);
  if(!actual||actual.length!==asset.bytes||sha(actual)!==asset.sha256)throw Error('Runtime graph asset differs from its archive member: '+asset.path);}
 return {graph,pins:{sha256:sha(bytes),sourceCount:graph.sources.length,assets:graph.assets.map(({path,bytes,sha256})=>({path,bytes,sha256}))}};
}
export function converterPackageIdentity(archive,{sourceHead,sourceTree,path}){
 const files=archiveFiles(archive),pkg=JSON.parse(files.get('package/package.json').toString('utf8'));
 const gp=graphPins(files,'dist/webview/runtime-graph.json','score-converter-proof/guitar-pro/webview'),
  musescore=graphPins(files,'dist/webview/musescore-runtime-graph.json','score-converter-proof/musescore/webview');
 const inventory=files.get('package/third_party/alphatab/inventory.json'),notice=files.get('package/dist/webview/NOTICE.txt'),
  musescoreNotice=files.get('package/dist/webview/musescore-NOTICE.txt');
 if(!inventory||!notice||!musescoreNotice)throw Error('Archive lacks its alphaTab inventory or runtime notices.');
 return {
  schema:'score-converter-private-package/1',sourceHead,sourceTree,
  archive:{path,bytes:archive.length,entries:files.size,sha256:sha(archive)},
  exports:pkg.exports,
  workerAsset:gp.graph.worker,
  runtimeGraph:gp.pins,
  alphaTab:{pin:JSON.parse(inventory.toString('utf8')).commit,inventorySha256:sha(inventory)},
  noticeSha256:sha(notice),
  musescore:{workerAsset:musescore.graph.worker,runtimeGraph:musescore.pins,noticeSha256:sha(musescoreNotice)}
 };
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [checkout,archivePath]=process.argv.slice(2);
 if(!checkout||!archivePath)throw Error('Usage: converter-package-identity.mjs <clean-converter-checkout> <packed.tgz>');
 const git=(...args)=>execFileSync('git',['-C',checkout,...args],{encoding:'utf8'}).trim();
 if(git('status','--porcelain','--untracked-files=no'))throw Error('Converter checkout has tracked changes.');
 const identity=converterPackageIdentity(readFileSync(archivePath),{sourceHead:git('rev-parse','HEAD'),sourceTree:git('rev-parse','HEAD^{tree}'),path:resolve(archivePath)});
 process.stdout.write(JSON.stringify(identity,null,2)+'\n');
}
