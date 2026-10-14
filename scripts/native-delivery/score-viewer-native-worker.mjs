import {spawn,execFileSync} from 'node:child_process';
import {readFile,writeFile,cp,mkdir,readdir,rm,lstat} from 'node:fs/promises';
import {join,resolve,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import {packageConverterNotices} from './score-viewer-converter-release.mjs';
import {validateCarrierInputs} from './score-viewer-carrier-inputs.mjs';
import {packagePianoNotices,addPianoWorkerChecks} from './score-viewer-piano-release.mjs';
import {inventory,validatePrepared,writeJson,sha256,verifyEmbedded,readZip,zipInventory} from './score-viewer-delivery.mjs';

export const run=(program,args,cwd,env={})=>new Promise((done,fail)=>{const child=spawn(program,args,{cwd,env:{...process.env,...env},stdio:'inherit',shell:process.platform==='win32'&&program==='npm'});child.on('error',fail);child.on('exit',code=>code===0?done():fail(Error(`${program} exited ${code}`)));});
// Override only the app package: a global codegen-units override would change
// Cargo's registry dependency profile hashes and discard the seeded objects.
export const nativeReleaseCargoArgs=Object.freeze(['--config','profile.release.package.iso-score-viewer.codegen-units=16']);
export function nativeReleaseProfile(env=process.env) {
  if(env.CARGO_INCREMENTAL!=='1')throw Error('Native release experiment requires CARGO_INCREMENTAL=1');
  return {profile:'release',incremental:true,packageOverrides:{'iso-score-viewer':{codegenUnits:16}},cargoArguments:[...nativeReleaseCargoArgs]};
}
export async function invalidateGeneratedAssets(target) {
  const directories=async path=>{try{return (await readdir(path,{withFileTypes:true})).filter(entry=>entry.isDirectory()).map(entry=>entry.name);}catch(error){if(error.code==='ENOENT')return [];throw error;}};
  const builds=[join(target,'release','build'),...(await directories(target)).map(name=>join(target,name,'release','build'))];
  const removed=[];
  // Tauri caches encoded files by uncompressed content hash alone. A restored
  // target can retain an earlier encoder feature/profile's bytes. Remove only
  // generated asset directories, keeping compiled dependency objects intact.
  for(const build of builds)for(const name of await directories(build)) {
    const out=join(build,name,'out');
    if((await directories(out)).includes('tauri-codegen-assets')) {
      const assets=join(out,'tauri-codegen-assets');
      await rm(assets,{recursive:true});removed.push(relative(target,assets));
    }
  }
  return removed.sort();
}
export async function captureWindowsDiagnostics({source,prepared,target,output,execute=diagnosticCommand}) {
  source=resolve(source);prepared=resolve(prepared);target=resolve(target);output=resolve(output);
  await mkdir(output);
  const missing=[],generated=[],fingerprints=[];
  const copy=async(from,to)=>{
    let stat;try{stat=await lstat(from);}catch(error){if(error.code==='ENOENT'){missing.push(relative(source,from));return false;}throw error;}
    if(stat.isSymbolicLink())throw Error('Diagnostic input may not be a symlink');
    await mkdir(resolve(join(output,to),'..'),{recursive:true});
    await cp(from,join(output,to),{recursive:stat.isDirectory(),force:false,errorOnExist:true});return true;
  };
  const directories=async path=>{try{return (await readdir(path,{withFileTypes:true})).filter(entry=>entry.isDirectory()).map(entry=>entry.name);}catch(error){if(error.code==='ENOENT')return [];throw error;}};
  await copy(join(target,'x86_64-pc-windows-msvc','release','iso-score-viewer.exe'),'binary/iso-score-viewer.exe');
  await copy(prepared,'prepared');
  for(const path of ['src-tauri/Cargo.toml','src-tauri/Cargo.lock','scripts/native-delivery/score-viewer-asset-probe/Cargo.toml','scripts/native-delivery/score-viewer-asset-probe/Cargo.lock'])await copy(join(source,path),`source-pins/${path}`);
  await copy(join(target,'prepared-tauri.json'),'prepared-tauri.json');
  const roots=[target,...(await directories(target)).map(name=>join(target,name))];
  for(const root of roots)for(const profile of ['release','debug']) {
    const build=join(root,profile,'build');
    for(const name of await directories(build)) {
      const assets=join(build,name,'out','tauri-codegen-assets');
      let stat;try{stat=await lstat(assets);}catch(error){if(error.code==='ENOENT')continue;throw error;}
      if(!stat.isDirectory())continue;
      const path=relative(target,assets);await copy(assets,`generated/${path}`);generated.push(path);
    }
    const fingerprintRoot=join(root,profile,'.fingerprint');
    for(const name of (await directories(fingerprintRoot)).filter(name=>/^(brotli|tauri-codegen|tauri-macros|iso-score-viewer)-/.test(name))) {
      const directory=join(fingerprintRoot,name);
      for(const entry of await readdir(directory,{withFileTypes:true}))if(entry.isFile()&&/^(?:lib-[\w-]+|bin-iso-score-viewer)\.json$/.test(entry.name)) {
        const full=join(directory,entry.name),path=relative(target,full);
        await copy(full,`fingerprints/${path}`);fingerprints.push(path);
      }
    }
  }
  const commands=[];
  for(const [program,args]of [['rustc',['-Vv']],['cargo',['tree','--locked','--offline','--target','x86_64-pc-windows-msvc','--manifest-path',join(source,'src-tauri','Cargo.toml'),'-e','features','-i','brotli']]]) {
    commands.push({program,args,...await execute(program,args,source)});
  }
  const diagnostic={schema:1,kind:'failed-windows-embedded-payload-diagnostics',capturedAt:new Date().toISOString(),
    generated:generated.sort(),fingerprints:fingerprints.sort(),missing,commands,files:await inventory(output)};
  await writeJson(join(output,'diagnostics.json'),diagnostic);
  console.log(JSON.stringify({kind:diagnostic.kind,generated:generated.length,fingerprints:fingerprints.length,missing}));
  return diagnostic;
}
function diagnosticCommand(program,args,cwd) {
  try{return {exitCode:0,stdout:execFileSync(program,args,{cwd,encoding:'utf8',maxBuffer:16*1024*1024,timeout:30000}),stderr:''};}
  catch(error){return {exitCode:error.status??null,stdout:error.stdout?.toString()??'',stderr:error.stderr?.toString()??error.message};}
}
export async function installPreparedFrontend(prepared,viewer,target) {
  await cp(join(prepared,'frontend'),join(viewer,'dist'),{recursive:true});
  await mkdir(target,{recursive:true});
  const preparedConfig=join(target,'prepared-tauri.json');
  // Tauri resolves this directory against src-tauri/tauri.conf.json, even when
  // the merge file lives elsewhere. A Windows drive-qualified string parses
  // as FrontendDist::Url and deliberately embeds no assets.
  await writeJson(preparedConfig,{build:{beforeBuildCommand:'',frontendDist:'../dist'},bundle:{resources:{"../dist/converter/gp/source-package.tgz":"notices/score-converter/source-package.tgz","../dist/converter/gp/source-package-identity.json":"notices/score-converter/source-package-identity.json","../dist/converter/gp/SOURCE-NOTICE.txt":"notices/score-converter/SOURCE-NOTICE.txt","../dist/converter/gp/NOTICE.txt":"notices/score-converter/NOTICE.txt","../dist/converter/gp/guitar-pro.worker.js.LEGAL.txt":"notices/score-converter/guitar-pro.worker.js.LEGAL.txt","../licenses/LiberationSerif-Italic-NOTICE.txt":"notices/LiberationSerif-Italic-NOTICE.txt"}}});
  return preparedConfig;
}
export async function workerInputs(platform,args) {
  const [sourceArg,preparedArg,outputArg]=args;
  if(!sourceArg||!preparedArg||!outputArg)throw Error('Native worker requires <clean-source> <prepared-input> <output>');
  const source=resolve(sourceArg),prepared=resolve(preparedArg),output=resolve(outputArg);
  const git=(...args)=>execFileSync('git',args,{cwd:source,encoding:'utf8'}).trim();
  if(git('status','--porcelain','--untracked-files=all'))throw Error('Native worker requires the clean reviewed checkout');
  const manifest=await validatePrepared(prepared,{expectedRevision:git('rev-parse','HEAD')});
  const verified=await validateCarrierInputs(source);
  if(JSON.stringify(verified.sourceInputs)!==JSON.stringify(manifest.identity.sourceInputs))throw Error('Worker viewer/notation inputs differ from preparation');
  const viewer=source;
  if(JSON.parse(await readFile(join(viewer,'package.json'),'utf8')).version!==manifest.identity.version)throw Error('Worker version differs');
  await mkdir(output,{recursive:true});
  const target=process.env.CARGO_TARGET_DIR||join(source,'build',platform,'target');
  const env={CARGO_TARGET_DIR:target};
  const buildProfile=nativeReleaseProfile({...process.env,...env});
  const timings={},start=performance.now();
  const stage=async(name,fn)=>{const at=performance.now();const result=await fn();timings[name]=Math.round(performance.now()-at);return result;};
  const invalidatedAssetCaches=await stage('assetCacheInvalidationMs',()=>invalidateGeneratedAssets(target));
  // Only verified prepared inputs bypass the normal frontend build hook.
  const preparedConfig=await installPreparedFrontend(prepared,viewer,target);
  return {source,prepared,output,viewer,target,env,manifest,stage,timings,start,preparedConfig,invalidatedAssetCaches,buildProfile};
}
export async function notices(source,viewer,packet,targetTriple) {
  await packageConverterNotices(source,packet);
  const pianoEngine=await packagePianoNotices(source,viewer,packet);
  await mkdir(join(packet,'notices'),{recursive:true});
  for(const name of ['URW-base35-provenance.md','URW-base35-LICENSE','URW-base35-COPYING','OFL-Bravura.txt','LiberationSerif-Italic-NOTICE.txt'])await cp(join(source,'licenses',name),join(packet,'notices',name));
  const metadata=JSON.parse(execFileSync('cargo',['metadata','--locked','--format-version','1','--filter-platform',targetTriple,'--manifest-path',join(viewer,'src-tauri','Cargo.toml')],{encoding:'utf8',maxBuffer:32*1024*1024}));
  const packages=[];
  for(const pkg of metadata.packages.filter(pkg=>pkg.source)) {
    const dir=resolve(pkg.manifest_path,'..'), names=(await readdir(dir)).filter(name=>/^(license|copying|notice)/i.test(name));
    const copied=[];
    for(const name of names) {
      const {lstat}=await import('node:fs/promises');
      if(!(await lstat(join(dir,name))).isFile())continue;
      const dest=`notices/dependencies/${pkg.name}-${pkg.version}-${name}`;
      await mkdir(resolve(join(packet,dest),'..'),{recursive:true});await cp(join(dir,name),join(packet,dest));copied.push(dest);
    }
    packages.push({name:pkg.name,version:pkg.version,source:pkg.source,license:pkg.license,licenseFile:pkg.license_file,noticeFiles:copied});
  }
  const javascript=[];
  for(const root of new Set([source,viewer])) {
    const lock=JSON.parse(await readFile(join(root,'package-lock.json'),'utf8'));
    for(const [path,pkg]of Object.entries(lock.packages)) {
      if(!path || pkg.dev || !path.startsWith('node_modules/'))continue;
      const dir=join(root,path),label=path.replace(/.*node_modules\//,'').replaceAll('/','-');
      let names;try{names=await readdir(dir);}catch(error){if(error.code==='ENOENT')continue;throw error;}
      const copied=[];
      for(const name of names.filter(name=>/^(license|copying|notice)/i.test(name))) {
        const {lstat}=await import('node:fs/promises');if(!(await lstat(join(dir,name))).isFile())continue;
        const dest=`notices/javascript/${label}-${pkg.version}-${name}`;await mkdir(resolve(join(packet,dest),'..'),{recursive:true});await cp(join(dir,name),join(packet,dest));copied.push(dest);
      }
      javascript.push({name:label,version:pkg.version,license:pkg.license,integrity:pkg.integrity,noticeFiles:copied});
    }
  }
  if(!packages.length||!packages.some(pkg=>pkg.noticeFiles.length))throw Error('Native dependency notices unavailable');
  await writeJson(join(packet,'native-dependencies.json'),{pianoEngine,manifestSha256:sha256(await readFile(join(viewer,'src-tauri','Cargo.toml'))),lockSha256:sha256(await readFile(join(viewer,'src-tauri','Cargo.lock'))),packages,javascript});
  await writeFile(join(packet,'NOTICE.txt'),'ISO Score Viewer. Font and dependency notices are in notices/. Imported scores retain their own provenance and notices.\n');
}
export async function finishWorker(ctx,platform,packet,binary,nativeChecks,details={}) {
  await cp(join(ctx.prepared,'Schumann-No14.isoscore'),join(packet,'Schumann-No14.isoscore'));
  await cp(join(ctx.prepared,'source-inputs.json'),join(packet,'Source-provenance.json'));
  await cp(join(ctx.prepared,'source-checks.json'),join(packet,'Source-validation.json'));
  await cp(join(ctx.prepared,'frontend','release-identity.json'),join(packet,'Release-identity.json'));
  ({nativeChecks,details}=await addPianoWorkerChecks(ctx.source,ctx.viewer,packet,nativeChecks,details,platform,binary));
  const hashes=await inventory(packet);
  await writeFile(join(packet,'SHA256SUMS'),Object.entries(hashes).map(([name,pin])=>`${pin.sha256}  ${name}`).join('\n')+'\n');
  const name=platform==='windows-x64'?'Windows.zip':'Mac.zip',archive=join(ctx.output,name);
  await ctx.stage('archiveMs',()=>run(process.platform==='win32'?'python':'python3',[join(ctx.source,'scripts','native-delivery','zip-score-viewer.py'),packet,archive],ctx.source));
  const bytes=await readFile(archive),files=readZip(bytes);
  const embedded=await ctx.stage('embeddedVerificationMs',async()=>verifyEmbedded(await readFile(binary),ctx.prepared,platform));
  ctx.timings.totalMs=Math.round(performance.now()-ctx.start);
  const receipt={schema:1,platform,identity:ctx.manifest.identity,package:{path:name,sha256:sha256(bytes),size:bytes.length,files:zipInventory(files)},embedded,nativeChecks,buildProfile:ctx.buildProfile,details:{...details,invalidatedAssetCaches:ctx.invalidatedAssetCaches},
    timings:ctx.timings,cache:{npm:process.env.NPM_CACHE_HIT??'unknown',rust:process.env.RUST_CACHE_HIT??'unknown'},files:await inventory(ctx.output,['receipt.json'])};
  await writeJson(join(ctx.output,'receipt.json'),receipt);
  console.log(JSON.stringify({platform,timings:receipt.timings,cache:receipt.cache,buildProfile:receipt.buildProfile,nativeChecks}));
  return receipt;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const [operation,source,prepared,target,output]=process.argv.slice(2);
  if(operation!=='--capture-windows-diagnostics'||!source||!prepared||!target||!output)throw Error('Usage: node scripts/score-viewer-native-worker.mjs --capture-windows-diagnostics <source> <prepared> <native-target> <diagnostic-output>');
  await captureWindowsDiagnostics({source,prepared,target,output});
}
