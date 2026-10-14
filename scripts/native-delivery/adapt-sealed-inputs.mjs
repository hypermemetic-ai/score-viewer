#!/usr/bin/env node
// One-time, explicit layout adaptation of a previously reviewed carrier input.
// Native source, frontend and source-check receipt identities remain byte-exact.
import {readFile, writeFile} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {sha256, validateCarrierInputs} from './score-viewer-carrier-inputs.mjs';
export async function adaptSealedInputs(root) {
  root=resolve(root);
  const path=join(root,'delivery-input','inputs.json');
  const original=await readFile(path), inputs=JSON.parse(original);
  const helpers=inputs.runtimeFontProbe?.files;
  if(!helpers || Object.keys(helpers).some(path=>!/^scripts\/footer-ink-(?:probe\.(?:mjs|swift)|receipt\.mjs)$/.test(path)) || inputs.converterNoticeHelper?.path!=='scripts/score-viewer-converter-release.mjs') throw Error('Expected unadapted reviewed carrier helpers');
  const rebased={};
  for(const oldPath of Object.keys(helpers)) {
    const newPath=oldPath.replace('scripts/','scripts/native-delivery/');
    const bytes=await readFile(join(root,newPath));
    rebased[newPath]={sha256:sha256(bytes),size:bytes.length};
  }
  inputs.runtimeFontProbe.files=rebased;
  const newPath='scripts/native-delivery/score-viewer-converter-release.mjs',bytes=await readFile(join(root,newPath));
  inputs.converterNoticeHelper={path:newPath,sha256:sha256(bytes),size:bytes.length};
  inputs.deliveryLayout={version:1,repository:'hypermemetic-ai/score-viewer',previousInputsSha256:sha256(original)};
  await writeFile(path,JSON.stringify(inputs,null,2)+'\n');
  try {return await validateCarrierInputs(root);}
  catch(error) {await writeFile(path,original);throw error;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  if(!process.argv[2])throw Error('Usage: node scripts/native-delivery/adapt-sealed-inputs.mjs <viewer-root>');
  console.log(JSON.stringify((await adaptSealedInputs(process.argv[2])).sourceInputs,null,2));
}
