#!/usr/bin/env node
import {execFileSync, spawn} from 'node:child_process';
import {readFile, cp, mkdir, appendFile} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {defaultScore, sha256, canonical, inventory, writeJson, validatePrepared, safePath} from './score-viewer-delivery.mjs';
import {validateCarrierInputs} from './score-viewer-carrier-inputs.mjs';

// The unchanged ISO workflow supplies its carrier revision for job checkout.
// Viewer and notation revisions are separately bound into every native binary.
export async function prepare({source, output, scorePath=defaultScore.path, scoreHash=defaultScore.sha256, expectedRevision, githubOutput, execute=run}) {
  source=resolve(source); output=resolve(output);
  const start=performance.now(), timings={};
  const git=(...args)=>execFileSync('git',args,{cwd:source,encoding:'utf8'}).trim();
  if(git('status','--porcelain','--untracked-files=all'))throw Error('Preparation requires the clean reviewed carrier checkout');
  const revision=git('rev-parse','HEAD');
  if(expectedRevision && expectedRevision!==revision)throw Error('Reviewed carrier revision differs');
  const verified=await validateCarrierInputs(source);
  safePath(scorePath);
  if(!/\.(?:tuna|isoscore)$/.test(scorePath))throw Error('Prepared score must be a .tuna or .isoscore package');
  const score=await readFile(join(source,scorePath));
  if(sha256(score)!==scoreHash)throw Error('Reviewed score hash differs');
  const version=verified.inputs.version;
  const cargo=await readFile(join(source,'score-viewer','src-tauri','Cargo.toml'),'utf8');
  if(cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1]!==version)throw Error('Application versions differ');
  async function stage(name,fn){const at=performance.now();await fn();timings[name]=Math.round(performance.now()-at);}
  await mkdir(output);
  await cp(join(source,'delivery-input','frontend'),join(output,'frontend'),{recursive:true});
  const embeddedIdentity={sourceRevision:revision,version,score:{path:scorePath,sha256:scoreHash,size:score.length},sourceInputs:verified.sourceInputs};
  await writeJson(join(output,'frontend','release-identity.json'),embeddedIdentity);
  await cp(join(source,scorePath),join(output,'Schumann-No14.isoscore'));
  await cp(join(source,'delivery-input','inputs.json'),join(output,'source-inputs.json'));
  await cp(join(source,'delivery-input','checks.json'),join(output,'source-checks.json'));
  const frontend=await inventory(join(output,'frontend'));
  const identity={releaseId:`${version}-${revision}`,sourceRevision:revision,sourceTimestamp:new Date(git('show','-s','--format=%cI',revision)).toISOString(),version,
    score:embeddedIdentity.score,frontend:{files:frontend,digest:sha256(canonical(frontend))},sourceInputs:verified.sourceInputs};
  const probeRoot=join(source,'scripts','score-viewer-asset-probe'),probeTarget=process.env.PROBE_TARGET_DIR||join(source,'build','asset-probe-target'),probes={};
  await stage('embeddedPreparationMs',async()=>{
    await execute('cargo',['build','--release','--locked','--manifest-path',join(probeRoot,'Cargo.toml'),'--target-dir',probeTarget],source);
    const helper=join(probeTarget,'release',`iso-private-asset-probe${process.platform==='win32'?'.exe':''}`);
    for(const path of Object.keys(frontend)) {
      const probePath=`probes/${path}.br`,full=join(output,probePath);
      await mkdir(resolve(full,'..'),{recursive:true});
      await execute(helper,[join(output,'frontend',path),full,...(path.endsWith('.html')?['normalize-html']:[])],source);
      const {brotliDecompressSync}=await import('node:zlib');const bytes=await readFile(full);
      probes[path]={path:probePath,sha256:sha256(bytes),decodedSha256:sha256(brotliDecompressSync(bytes))};
    }
  });
  timings.totalMs=Math.round(performance.now()-start);
  const manifest={schema:1,identity,probes,files:await inventory(output,['manifest.json']),timings,
    cache:{npm:process.env.NPM_CACHE_HIT??'unknown',probe:process.env.PROBE_CACHE_HIT??'unknown'},frontendBuildCount:0,
    frontendPreparation:{reusedReviewedBuild:true,buildCount:1,checks:verified.checks.checks,originalFrontendDigest:verified.inputs.frontend.digest}};
  await writeJson(join(output,'manifest.json'),manifest);
  await validatePrepared(output,{expectedRevision:revision});
  if(githubOutput)await appendFile(githubOutput,`source_revision=${revision}\nrelease_id=${identity.releaseId}\n`);
  console.log(JSON.stringify({identity,timings,frontendPreparation:manifest.frontendPreparation,cache:manifest.cache}));
  return manifest;
}
function run(program,args,cwd){return new Promise((done,fail)=>{const child=spawn(program,args,{cwd,stdio:'inherit',shell:process.platform==='win32'&&program==='npm'});child.on('error',fail);child.on('exit',code=>code===0?done():fail(Error(`${program} exited ${code}`)));});}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [source,output]=process.argv.slice(2);
  if(!source||!output)throw Error('Usage: node scripts/prepare-score-viewer.mjs <clean-reviewed-carrier> <output>');
  await prepare({source,output,scorePath:process.env.SCORE_PATH||defaultScore.path,scoreHash:process.env.SCORE_SHA256||defaultScore.sha256,expectedRevision:process.env.SOURCE_REVISION,githubOutput:process.env.GITHUB_OUTPUT});
}
