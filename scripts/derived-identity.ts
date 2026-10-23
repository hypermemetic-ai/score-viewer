import {createHash} from 'node:crypto';
import {existsSync,readFileSync,statSync} from 'node:fs';
import {dirname,join,relative,resolve,sep} from 'node:path';
import {parseSync} from 'rolldown/experimental';

/** The modules that make every derived file the viewer keeps on disk:
 * package admission and its replays (`src/package.ts`), personal hand
 * projections with their engines, on the reader's thread or in the workers,
 * and the fixed-route finger replays opening checks (`src/piano-readiness.ts`). */
export const DERIVED_ENTRY_MODULES=Object.freeze(['src/package.ts','src/personal-presentation.ts','src/personal-projection-worker.ts','src/layout-peer-worker.ts','src/repeat-fold.ts','src/piano-readiness.ts']);
/** Build inputs outside the module graph that can still change what those
 * modules compute: locked packages and the build itself. */
const BUILD_INPUTS=['package.json','package-lock.json','tsconfig.json','vite.config.ts','scripts/derived-identity.ts'];
const code=/\.(?:[cm]?[jt]s)$/;

/** Every file the derived-file modules load, following static and dynamic
 * imports and module-worker URLs. A load this cannot follow (an import or
 * worker URL computed at run time, or a relative file that is missing) fails
 * the build, so nothing that makes a derived file escapes the identity. */
export function derivedModuleClosure(root:string,entries:readonly string[]=DERIVED_ENTRY_MODULES):string[]{
 const seen=new Set<string>(),pending=entries.map(e=>resolve(root,e));
 for(const entry of pending)if(!existsSync(entry))throw Error(`Derived identity: ${relative(root,entry)} does not exist.`);
 const follow=(from:string,specifier:string)=>{
  if(!specifier.startsWith('.'))return; // a package: package-lock.json names its exact bytes
  const base=resolve(dirname(from),specifier.replace(/[?#].*$/,''));
  const file=[base,base+'.ts',base+'.mts',base+'.js',base+'.mjs',join(base,'index.ts')].find(f=>existsSync(f)&&statSync(f).isFile());
  if(!file)throw Error(`Derived identity: ${relative(root,from)} loads ${specifier}, which does not exist.`);
  pending.push(file);
 };
 while(pending.length){
  const file=pending.pop()!;if(seen.has(file))continue;seen.add(file);
  if(!code.test(file))continue;
  const text=readFileSync(file,'utf8'),{module,errors}=parseSync(file,text);
  if(errors.length)throw Error(`Derived identity: ${relative(root,file)} does not parse.`);
  for(const i of module.staticImports)follow(file,i.moduleRequest.value);
  for(const e of module.staticExports)for(const entry of e.entries)if(entry.moduleRequest)follow(file,entry.moduleRequest.value);
  for(const d of module.dynamicImports){
   const request=text.slice(d.moduleRequest.start,d.moduleRequest.end).replace(/\/\*.*?\*\//g,'').trim(),literal=/^(['"])([^'"`$]*)\1$/.exec(request);
   // A Node built-in kept from the browser bundle (`const name='node:…'`) is no viewer code.
   if(!literal&&/^[A-Za-z_$][\w$]*$/.test(request)&&new RegExp(`\\b${request.replace(/\$/g,'\\$')}\\s*=\\s*['"]node:[a-z/]+['"]`).test(text))continue;
   if(!literal)throw Error(`Derived identity: ${relative(root,file)} imports a module named at run time.`);
   follow(file,literal[2]);
  }
  for(const m of text.matchAll(/new\s+URL\(\s*([^,)]*?)\s*,\s*import\.meta\.url/g)){
   const literal=/^(['"])([^'"`$]*)\1$/.exec(m[1]);
   if(!literal)throw Error(`Derived identity: ${relative(root,file)} names a worker or asset URL at run time.`);
   follow(file,literal[2]);
  }
 }
 return [...seen].map(f=>relative(root,f).split(sep).join('/')).sort();
}

/** The identity derived files are bound to: the paths and bytes of the code
 * that makes them and of the build inputs, nothing else (no time, host or
 * checkout location). A change anywhere else in the viewer, such as its
 * menus, practice or styling, keeps every saved engraving; a change to the
 * engraver, admission or projection code makes them all misses. */
export function viewerDerivedIdentity(root:string,entries:readonly string[]=DERIVED_ENTRY_MODULES):string{
 const hash=createHash('sha256');
 for(const file of [...new Set([...derivedModuleClosure(root,entries),...BUILD_INPUTS.filter(f=>existsSync(join(root,f)))])].sort()){
  hash.update(file);hash.update('\0');hash.update(readFileSync(join(root,file)));hash.update('\0');
 }
 return 'viewer-derived-'+hash.digest('hex');
}
