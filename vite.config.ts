import {defineConfig} from 'vite';
import {createHash} from 'node:crypto';
import {existsSync,readdirSync,readFileSync,statSync} from 'node:fs';
import {join,relative,sep} from 'node:path';
import {converterAssets} from './scripts/guitar-pro-assets.ts';

/** The content identity of the viewer source and its pinned dependencies.
 * Derived files on disk are bound to it, so another build never reads them.
 * Only file paths and bytes are hashed: no time, host or checkout location. */
function viewerDerivedIdentity(root=import.meta.dirname):string {
 const hash=createHash('sha256'),skip=new Set(['node_modules','.git','dist','target']);
 const walk=(dir:string):string[]=>readdirSync(dir).filter(name=>!skip.has(name)).sort().flatMap(name=>{
  const path=join(dir,name);return statSync(path).isDirectory()?walk(path):[path];});
 for(const input of ['src','vendor','public','package-lock.json','index.html'].map(p=>join(root,p)).filter(p=>existsSync(p)))
  for(const file of statSync(input).isDirectory()?walk(input):[input]){
   hash.update(relative(root,file).split(sep).join('/'));hash.update('\0');hash.update(readFileSync(file));hash.update('\0');
  }
 return 'viewer-source-'+hash.digest('hex');
}
export default defineConfig({plugins:[converterAssets()],base:'./',define:{__VIEWER_DERIVED_IDENTITY__:JSON.stringify(viewerDerivedIdentity())},
 build:{outDir:'dist',target:'es2022',rolldownOptions:{input:['index.html','footer-ink-probe.html']}},worker:{format:'es'},server:{port:5205,strictPort:true}});
