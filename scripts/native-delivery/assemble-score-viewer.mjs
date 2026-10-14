#!/usr/bin/env node
import {cp,mkdir,writeFile,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import {platforms,inventory,validatePrepared,validateWorker,validatePair,writeJson} from './score-viewer-delivery.mjs';
const [preparedArg,windowsArg,macArg,outputArg]=process.argv.slice(2);
if(!outputArg)throw Error('Usage: node scripts/assemble-score-viewer.mjs <prepared> <windows-worker> <mac-worker> <output>');
const prepared=resolve(preparedArg),output=resolve(outputArg),start=performance.now();
const manifest=await validatePrepared(prepared);
const workers={'windows-x64':resolve(windowsArg),'macos-universal':resolve(macArg)},receipts={};
for(const platform of platforms)receipts[platform]=await validateWorker(workers[platform],prepared,platform);
await mkdir(output);await cp(prepared,join(output,'prepared'),{recursive:true});
await mkdir(join(output,'packages'));await mkdir(join(output,'receipts'));
const pins={};
for(const platform of platforms) {
  const receipt=receipts[platform],name=receipt.package.path;
  await cp(join(workers[platform],name),join(output,'packages',name));
  await cp(join(workers[platform],'receipt.json'),join(output,'receipts',`${platform}.json`));
  pins[platform]={receipt:`receipts/${platform}.json`,package:`packages/${name}`};
}
const sums=await inventory(output);
await writeFile(join(output,'SHA256SUMS'),Object.entries(sums).map(([path,pin])=>`${pin.sha256}  ${path}`).join('\n')+'\n');
const workflow={runId:process.env.GITHUB_RUN_ID,runAttempt:process.env.GITHUB_RUN_ATTEMPT,assembledAt:new Date().toISOString()};
const release={schema:1,identity:manifest.identity,platforms:pins,workflow,timings:{assemblyMs:Math.round(performance.now()-start),preparation:manifest.timings,native:Object.fromEntries(platforms.map(p=>[p,receipts[p].timings]))},files:await inventory(output,['release.json'])};
await writeJson(join(output,'release.json'),release);await validatePair(output);
console.log(JSON.stringify({identity:release.identity,workflow,timings:release.timings}));
