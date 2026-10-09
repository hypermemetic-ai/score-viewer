import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import type {Plugin} from 'vite';
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const root=fileURLToPath(new URL('../',import.meta.url));
export const guitarProAssetPrefix='converter/gp/';
/** Resolve the supported entry, preserving its exact local relative Worker URL.
 * The complete upstream source package accompanies the redistributed assets. */
export function converterAssetFiles():Record<string,Uint8Array>{
 const identity=JSON.parse(readFileSync(join(root,'vendor/score-converter/source-package-identity.json'),'utf8'));
 const archive=readFileSync(join(root,'vendor/score-converter/score-converter-proof-0.0.0.tgz'));
 if(identity.schema!=='score-converter-private-package/1'||archive.length!==identity.archive.bytes||sha(archive)!==identity.archive.sha256)
  throw Error('Pinned Guitar Pro source package differs.');
 const entry=fileURLToPath(import.meta.resolve('score-converter-proof/guitar-pro/webview')),
  publicPath=identity.exports?.['./guitar-pro/webview']?.import;
 if(publicPath!=='./dist/webview/index.js'||!entry.endsWith('/dist/webview/index.js'))throw Error('Unsupported public Guitar Pro entry.');
 const files:Record<string,Uint8Array>={};
 const names=['NOTICE.txt','guitar-pro.worker.js','guitar-pro.worker.js.LEGAL.txt','index.js'];
 if(!Array.isArray(identity.runtimeGraph.assets)||identity.runtimeGraph.assets.length!==names.length)throw Error('Unsupported converter asset closure.');
 for(const name of names){
  const pin=identity.runtimeGraph.assets.find((p:{path:string})=>p.path==='dist/webview/'+name),bytes=readFileSync(join(dirname(entry),name));
  if(!pin||bytes.length!==pin.bytes||sha(bytes)!==pin.sha256)throw Error('Public converter runtime asset differs: '+name);
  files[guitarProAssetPrefix+name]=bytes;
 }
 const worker=Buffer.from(files[guitarProAssetPrefix+'guitar-pro.worker.js']).toString('utf8'),host=Buffer.from(files[guitarProAssetPrefix+'index.js']).toString('utf8');
 if(!/new URL\(\s*["']\.\/guitar-pro\.worker\.js["']\s*,\s*import\.meta\.url\s*\)/.test(host))
  throw Error('Public converter local Worker link differs.');
 if(!worker.includes('guitar-pro.worker.js.LEGAL.txt'))throw Error('Converter linked legal notice missing.');
 files[guitarProAssetPrefix+'source-package.tgz']=archive;
 files[guitarProAssetPrefix+'source-package-identity.json']=readFileSync(join(root,'vendor/score-converter/source-package-identity.json'));
 files[guitarProAssetPrefix+'SOURCE-NOTICE.txt']=Buffer.from('Guitar Pro conversion uses the reviewed score-converter public WebView entry.\n'+
  'The adjacent NOTICE.txt and guitar-pro.worker.js.LEGAL.txt remain unmodified.\n'+
  'Complete covered source, MPL license, alphaTab provenance and patches are delivered in source-package.tgz in this same directory.\n'+
  'Extract its package/third_party/alphatab directory for the source location mentioned by the upstream NOTICE.\n'+
  'Source archive SHA-256: '+identity.archive.sha256+'\n');
 return files;
}
export function guitarProAssets():Plugin{
 return {name:'source-bound-public-guitar-pro-assets',
  generateBundle(){for(const [fileName,source]of Object.entries(converterAssetFiles()))this.emitFile({type:'asset',fileName,source});},
  configureServer(server){const files=converterAssetFiles();server.middlewares.use((req,res,next)=>{
   const path=(req.url??'').split('?')[0].replace(/^\//,'');if(!Object.hasOwn(files,path)){next();return;}
   res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.json')?'application/json':path.endsWith('.tgz')?'application/gzip':'text/plain; charset=utf-8');
   res.end(files[path]);
  });}};
}
