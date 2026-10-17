import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import type {Plugin} from 'vite';
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const root=fileURLToPath(new URL('../',import.meta.url));
export const guitarProAssetPrefix='converter/gp/',museScoreAssetPrefix='converter/musescore/';
function pinnedPackage(){
 const identity=JSON.parse(readFileSync(join(root,'vendor/score-converter/source-package-identity.json'),'utf8'));
 const archive=readFileSync(join(root,'vendor/score-converter/score-converter-proof-0.0.0.tgz'));
 if(identity.schema!=='score-converter-private-package/1'||archive.length!==identity.archive.bytes||sha(archive)!==identity.archive.sha256)
  throw Error('Pinned Guitar Pro source package differs.');
 return {identity,archive};
}
/** Resolve the supported entry, preserving its exact local relative Worker URL.
 * The complete upstream source package accompanies the redistributed assets. */
export function converterAssetFiles():Record<string,Uint8Array>{
 const {identity,archive}=pinnedPackage();
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
/** The MuseScore WebView host, its adjacent local Worker and notices, unchanged
 * from the same pinned package. They are emitted only where MuseScore import
 * is enabled (MUSESCORE_IMPORT_ENABLED, development only), never into a production bundle. */
export function museScoreAssetFiles():Record<string,Uint8Array>{
 const {identity}=pinnedPackage(),pins=identity.musescore?.runtimeGraph?.assets;
 const entry=fileURLToPath(import.meta.resolve('score-converter-proof/musescore/webview')),
  publicPath=identity.exports?.['./musescore/webview']?.import;
 if(publicPath!=='./dist/webview/musescore.js'||!entry.endsWith('/dist/webview/musescore.js'))throw Error('Unsupported public MuseScore entry.');
 const files:Record<string,Uint8Array>={};
 const names=['musescore-NOTICE.txt','musescore.js','musescore.worker.js','musescore.worker.js.LEGAL.txt'];
 if(!Array.isArray(pins)||pins.length!==names.length||identity.musescore.workerAsset!=='dist/webview/musescore.worker.js')throw Error('Unsupported MuseScore asset closure.');
 for(const name of names){
  const pin=pins.find((p:{path:string})=>p.path==='dist/webview/'+name),bytes=readFileSync(join(dirname(entry),name));
  if(!pin||bytes.length!==pin.bytes||sha(bytes)!==pin.sha256)throw Error('Public MuseScore runtime asset differs: '+name);
  files[museScoreAssetPrefix+name]=bytes;
 }
 if(sha(files[museScoreAssetPrefix+'musescore-NOTICE.txt'])!==identity.musescore.noticeSha256)throw Error('MuseScore notice differs.');
 const worker=Buffer.from(files[museScoreAssetPrefix+'musescore.worker.js']).toString('utf8'),host=Buffer.from(files[museScoreAssetPrefix+'musescore.js']).toString('utf8');
 if(!/new URL\(\s*["']\.\/musescore\.worker\.js["']\s*,\s*import\.meta\.url\s*\)/.test(host))throw Error('Public MuseScore local Worker link differs.');
 if(!worker.includes('musescore.worker.js.LEGAL.txt')||!host.includes('./musescore-NOTICE.txt'))throw Error('MuseScore linked legal notice missing.');
 return files;
}
/** Production builds keep MuseScore assets out exactly when the viewer's
 * `import.meta.env.DEV` gate keeps MuseScore import off. */
export function converterAssets():Plugin{
 let museScore=false;
 const files=()=>({...converterAssetFiles(),...(museScore?museScoreAssetFiles():{})});
 return {name:'source-bound-public-converter-assets',
  configResolved(config){museScore=!config.isProduction;},
  generateBundle(){for(const [fileName,source]of Object.entries(files()))this.emitFile({type:'asset',fileName,source});},
  configureServer(server){const served=files();server.middlewares.use((req,res,next)=>{
   const path=(req.url??'').split('?')[0].replace(/^\//,'');if(!Object.hasOwn(served,path)){next();return;}
   res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.json')?'application/json':path.endsWith('.tgz')?'application/gzip':'text/plain; charset=utf-8');
   res.end(served[path]);
  });}};
}
