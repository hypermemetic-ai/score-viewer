import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';

/** Node has no module Worker, so tests load the converter's Node package root
 * in place of the WebView hosts. The converter documents identical results
 * except telemetry; the WebView Worker itself is exercised in a browser. The
 * viewer still resolves its public entries through `location` exactly as in
 * the application. */
export function installConverterNodeRuntime(){
 const root=mkdtempSync(join(tmpdir(),'viewer-converter-runtime-')),
  node=new URL('../../node_modules/score-converter-proof/dist/src/index.js',import.meta.url).href;
 mkdirSync(join(root,'converter/gp'),{recursive:true});mkdirSync(join(root,'converter/musescore'),{recursive:true});
 writeFileSync(join(root,'converter/gp/index.js'),`export {convertGuitarPro,inspectGuitarPro} from ${JSON.stringify(node)};\n`);
 writeFileSync(join(root,'converter/musescore/musescore.js'),`export {convertMuseScore,inspectMuseScore} from ${JSON.stringify(node)};\n`);
 const previous=Object.getOwnPropertyDescriptor(globalThis,'location');
 Object.defineProperty(globalThis,'location',{value:{href:pathToFileURL(root).href+'/'},configurable:true,writable:true});
 return ()=>{if(previous)Object.defineProperty(globalThis,'location',previous);else delete (globalThis as {location?:unknown}).location;rmSync(root,{recursive:true,force:true});};
}
