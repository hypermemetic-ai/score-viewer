import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import identity from '../vendor/score-converter/source-package-identity.json';
import {converterAssetFiles} from '../scripts/guitar-pro-assets';
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
