// The native host, simulated: the built frontend is served with the native
// content policy, and its Tauri commands are answered from a data directory
// on disk, the way the desktop application reads its managed files. The data
// directory is always a working copy; nothing outside it is written.
import {createServer,type IncomingMessage} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join,extname,dirname} from 'node:path';
import {createHash} from 'node:crypto';

// As the native store: a document's ref is the SHA-256 of its JSON with sorted keys.
const canonical=(v:unknown):string=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical((v as Record<string,unknown>)[k])).join(',')+'}':JSON.stringify(v);
const sha=(text:string)=>createHash('sha256').update(text).digest('hex');
const TYPES:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.otf':'font/otf','.ttf':'font/ttf','.wasm':'application/wasm','.json':'application/json','.svg':'image/svg+xml'};
/** Managed names are flat or nested relative names, never outside the data directory. */
const managedPath=(data:string,name:string)=>{if(!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(name)||name.split('/').includes('..'))throw Error(`unsupported managed name ${name}`);return join(data,name);};
const body=async(req:IncomingMessage)=>{const chunks:Buffer[]=[];for await(const c of req)chunks.push(c as Buffer);return Buffer.concat(chunks);};

interface Snapshot {version:1;revision:number;previous:string|null;refs:Record<string,string>;id:string|null;documents:Record<string,unknown>}
/** The assistance store (assistance_store.rs): content-addressed objects and a `current` pointer. */
function assistanceStore(dir:string){
 const object=async(id:string)=>JSON.parse(await readFile(join(dir,id+'.json'),'utf8'));
 async function read(id?:string|null):Promise<Snapshot>{
  if(!id){try{id=(await readFile(join(dir,'current'),'utf8')).trim();}catch{return {version:1,revision:0,previous:null,refs:{},id:null,documents:{}};}}
  const manifest=await object(id),documents:Record<string,unknown>={};
  for(const [name,ref] of Object.entries(manifest.refs as Record<string,string>))documents[name]=await object(ref);
  return {...manifest,id,documents};
 }
 let queue=Promise.resolve();
 const commit=(input:{expectedRevision:number;changes:Record<string,unknown>})=>new Promise<unknown>((done,fail)=>{queue=queue.then(async()=>{
  const current=await read();if(input.expectedRevision!==current.revision){done({status:'conflict',snapshot:current});return;}
  await mkdir(dir,{recursive:true});const refs={...current.refs},documents={...current.documents};
  for(const [name,value] of Object.entries(input.changes)){if(value===null){delete refs[name];delete documents[name];continue;}const text=canonical(value),ref=sha(text);await writeFile(join(dir,ref+'.json'),text);refs[name]=ref;documents[name]=value;}
  const manifest={version:1 as const,revision:current.revision+1,previous:current.id,refs},text=canonical(manifest),id=sha(text);
  await writeFile(join(dir,id+'.json'),text);await writeFile(join(dir,'current'),id);
  done({status:'committed',snapshot:{...manifest,id,documents}});
 }).catch(fail);});
 return {read,commit};
}

export interface SimulatedHost {url:string;/** The next file the native picker returns. */pick(bytes:Uint8Array):void;writes:Array<{at:number;name:string;bytes:number}>;close():Promise<void>}
export async function startHost(options:{dist:string;data:string;repo:string}):Promise<SimulatedHost>{
 const dist=resolve(options.dist),data=resolve(options.data),derived=join(data,'.rehearsal-derived');
 const csp=JSON.parse(await readFile(join(options.repo,'src-tauri/tauri.conf.json'),'utf8')).app.security.csp.replace('connect-src ipc:',"connect-src 'self' ipc:");
 const assistance=assistanceStore(join(data,'assistance-v1')),picks:Uint8Array[]=[],writes:SimulatedHost['writes']=[];
 const server=createServer(async(req,res)=>{const url=new URL(req.url!,'http://localhost');try{
  if(url.pathname==='/__managed'){let bytes:Buffer|null=null;try{bytes=await readFile(managedPath(data,url.searchParams.get('name')!));}catch{}res.end(JSON.stringify(bytes?bytes.toString('base64'):null));return;}
  if(url.pathname==='/__write'){const {name,data:b64}=JSON.parse(String(await body(req)));const path=managedPath(data,name),bytes=Buffer.from(b64,'base64');await mkdir(dirname(path),{recursive:true});await writeFile(path,bytes);writes.push({at:Date.now(),name,bytes:bytes.length});res.end('null');return;}
  if(url.pathname==='/__assistance'){res.end(JSON.stringify(await assistance.read(url.searchParams.get('id'))));return;}
  if(url.pathname==='/__commit'){const {input}=JSON.parse(String(await body(req)));res.end(JSON.stringify(await assistance.commit(input)));return;}
  if(url.pathname==='/__pick'){const next=picks.shift();res.end(JSON.stringify(next?Buffer.from(next).toString('base64'):null));return;}
  if(url.pathname==='/__derived'){const key=sha(url.searchParams.get('key')??String(req.headers['derived-key']));
   if(req.method==='POST'){await mkdir(derived,{recursive:true});await writeFile(join(derived,key),await body(req));res.end('true');return;}
   try{res.end(await readFile(join(derived,key)));}catch{res.end();}return;}
  const path=resolve(dist,'.'+decodeURIComponent(url.pathname));if(path!==dist&&!path.startsWith(dist+'/'))throw Error('outside');const file=path===dist?join(dist,'index.html'):path;
  res.setHeader('Content-Security-Policy',csp);res.setHeader('Content-Type',TYPES[extname(file)]??'application/octet-stream');res.end(await readFile(file));
 }catch{if(!res.headersSent)res.writeHead(404);res.end();}});
 await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));
 const address=server.address();if(!address||typeof address==='string')throw Error('host did not listen');
 return {url:`http://127.0.0.1:${address.port}`,pick:bytes=>{picks.push(bytes);},writes,close:()=>new Promise<void>(done=>{server.closeAllConnections();server.close(()=>done());})};
}

/** Runs in the page before the application (page.js). */
export const pageScript=()=>readFile(new URL('./page.js',import.meta.url),'utf8');
