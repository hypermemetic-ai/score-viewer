import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import identity from '../vendor/score-converter/source-package-identity.json';
import {converterAssetFiles,museScoreAssetFiles,converterAssets} from '../scripts/guitar-pro-assets';
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
test('supported public export retains all exact local Worker and legal/source assets',()=>{
 const files=converterAssetFiles(),prefix='converter/gp/';
 assert.equal(Object.keys(files).length,7);
 for(const pin of identity.runtimeGraph.assets){const b=files[prefix+pin.path.slice('dist/webview/'.length)];assert.equal(b.length,pin.bytes);assert.equal(sha(b),pin.sha256);}
 assert.equal(sha(files[prefix+'source-package.tgz']),identity.archive.sha256);
 assert.deepEqual(files[prefix+'source-package.tgz'],readFileSync(new URL('../vendor/score-converter/score-converter-proof-0.0.0.tgz',import.meta.url)));
 const host=new TextDecoder().decode(files[prefix+'index.js']),worker=new TextDecoder().decode(files[prefix+'guitar-pro.worker.js']);
 assert.match(host,/new Worker\(/);assert.match(host,/new URL\(["']\.\/guitar-pro\.worker\.js["'],\s*import\.meta\.url\)/);
 assert.match(worker,/guitar-pro\.worker\.js\.LEGAL\.txt/);assert.doesNotMatch(host,/from ["']node:/);
 assert.equal(fileURLToPath(import.meta.resolve('score-converter-proof/guitar-pro/webview')).endsWith('/dist/webview/index.js'),true);
 assert.match(new TextDecoder().decode(files[prefix+'SOURCE-NOTICE.txt']),/package\/third_party\/alphatab/);
});
test('vendored identity is exactly what the derivation reads from the archive',async()=>{
 const {converterPackageIdentity}=await import('../scripts/converter-package-identity.mjs');
 const archive=readFileSync(new URL('../vendor/score-converter/score-converter-proof-0.0.0.tgz',import.meta.url));
 assert.deepEqual(converterPackageIdentity(archive,{sourceHead:identity.sourceHead,sourceTree:identity.sourceTree,path:identity.archive.path}),identity);
 assert.equal(identity.sourceHead,'2146166bd2ccfa135652c92fc477f8579ecb9479');
 assert.deepEqual(identity.exports['./musescore/webview'],{types:'./dist/src/webview/musescore.d.ts',import:'./dist/webview/musescore.js'});
});
test('MuseScore WebView host, local Worker and notices are exact and served only behind the import gate',()=>{
 const files=museScoreAssetFiles(),prefix='converter/musescore/';
 assert.deepEqual(Object.keys(files).sort(),['musescore-NOTICE.txt','musescore.js','musescore.worker.js','musescore.worker.js.LEGAL.txt'].map(n=>prefix+n));
 for(const pin of identity.musescore.runtimeGraph.assets){const b=files[prefix+pin.path.slice('dist/webview/'.length)];assert.equal(b.length,pin.bytes);assert.equal(sha(b),pin.sha256);}
 const host=new TextDecoder().decode(files[prefix+'musescore.js']);
 assert.match(host,/new Worker\(new URL\("\.\/musescore\.worker\.js", import\.meta\.url\), \{ type: "module" \}\)/);assert.doesNotMatch(host,/from ["']node:/);
 const emitted=(isProduction:boolean)=>{const plugin=converterAssets() as unknown as {configResolved(c:unknown):void;generateBundle(this:unknown):void},names:string[]=[];
  plugin.configResolved({isProduction});plugin.generateBundle.call({emitFile:(f:{fileName:string})=>names.push(f.fileName)});return names;};
 assert.equal(emitted(true).some(n=>n.startsWith(prefix)),false,'Production keeps MuseScore out with the gate.');
 assert.equal(emitted(true).length,7);
 assert.equal(emitted(false).filter(n=>n.startsWith(prefix)).length,4);
});
