/** Separate from legacy managed files: every writer must use this CAS boundary. */
export type AssistanceJson = null|boolean|number|string|AssistanceJson[]|{[key:string]:AssistanceJson};
export interface AssistanceManifest {version:1;revision:number;previous:string|null;refs:Record<string,string>}
export interface AssistanceSnapshot extends AssistanceManifest {id:string|null;documents:Record<string,AssistanceJson>}
export interface AssistanceCommit {expectedRevision:number;changes:Record<string,unknown>}
export type AssistanceCommitResult = {status:'committed'|'conflict';snapshot:AssistanceSnapshot};
export interface AssistanceStore {
 /** An omitted id reads current state. Historical ids remain recoverable. */
 read(id?:string):Promise<AssistanceSnapshot>;
 /** null removes a current document reference; retained versions are never erased. */
 commit(input:AssistanceCommit):Promise<AssistanceCommitResult>;
}
export function requireAssistanceStore(host:{assistanceStore?:AssistanceStore}):AssistanceStore {
 if(!host.assistanceStore)throw Error('This host does not support atomic personal fingering storage.');
 return host.assistanceStore;
}
const prefix='iso-viewer-assistance-v1/';
const maxBytes=100_000_000;
const empty=():AssistanceSnapshot=>({version:1,revision:0,id:null,previous:null,refs:{},documents:{}});
const validId=(id:unknown):id is string=>typeof id==='string'&&/^[a-f0-9]{64}$/.test(id);
function validName(name:string):boolean {return /^[A-Za-z0-9][A-Za-z0-9._/-]{0,229}$/.test(name);}
function serialized(value:unknown):string {
 const seen=new Set<object>();
 const visit=(v:unknown):void=>{
  if(v===null||typeof v==='string'||typeof v==='boolean')return;
  if(typeof v==='number'&&Number.isFinite(v))return;
  if(typeof v!=='object'||!v||seen.has(v))throw Error('Assistance documents must contain finite JSON values.');
  if(!Array.isArray(v)&&Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null)throw Error('Assistance documents must contain plain JSON objects.');
  seen.add(v);for(const child of Object.values(v))visit(child);seen.delete(v);
 };
 visit(value);const text=JSON.stringify(value);
 if(new TextEncoder().encode(text).byteLength>maxBytes)throw Error('Assistance document too large.');
 return text;
}
async function digest(text:string):Promise<string> {
 const data=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
 return Array.from(new Uint8Array(data),v=>v.toString(16).padStart(2,'0')).join('');
}
/** Validate and freeze caller-owned intent before either backend receives it. */
export function captureAssistanceCommit(input:AssistanceCommit):{expectedRevision:number;changes:Record<string,AssistanceJson|null>} {
 const expectedRevision=input.expectedRevision;
 if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw Error('Invalid expected assistance revision.');
 const changes=JSON.parse(serialized(input.changes)) as Record<string,AssistanceJson|null>;
 if(!changes||Array.isArray(changes)||typeof changes!=='object')throw Error('Invalid assistance changes.');
 for(const name of Object.keys(changes))if(!validName(name))throw Error('Invalid assistance document name.');
 return {expectedRevision,changes};
}
export interface AssistanceBrowserStorage {getItem(key:string):string|null;setItem(key:string,value:string):void}
export interface AssistanceBrowserLocks {request<T>(name:string,callback:()=>Promise<T>):Promise<T>}
/** Web Locks serialize writers across windows. Missing capability fails closed. */
export function browserAssistanceStore(storage:AssistanceBrowserStorage,locks:AssistanceBrowserLocks|undefined):AssistanceStore {
 const blobKey=(id:string)=>`${prefix}objects/${id}`;
 const readObject=async(id:string):Promise<unknown>=>{
  if(!validId(id))throw Error('Invalid assistance object identity.');
  const text=storage.getItem(blobKey(id));
  if(text===null||new TextEncoder().encode(text).byteLength>maxBytes||await digest(text)!==id)throw Error('Missing or corrupt assistance object.');
  return JSON.parse(text);
 };
 const writeObject=async(value:unknown):Promise<string>=>{
  const text=serialized(value),id=await digest(text),key=blobKey(id),existing=storage.getItem(key);
  if(existing!==null&&existing!==text)throw Error('Assistance object identity collision.');
  if(existing===null)storage.setItem(key,text);
  return id;
 };
 const read=async(requestedId?:string):Promise<AssistanceSnapshot>=>{
  const id=requestedId??storage.getItem(`${prefix}current`);if(id===null)return empty();
  const manifest=await readObject(id) as AssistanceManifest;
  if(!manifest||manifest.version!==1||!Number.isSafeInteger(manifest.revision)||manifest.revision<1||!(manifest.previous===null||validId(manifest.previous))||!manifest.refs||typeof manifest.refs!=='object'||Array.isArray(manifest.refs))throw Error('Invalid assistance manifest.');
  const documents:Record<string,AssistanceJson>=Object.create(null);
  for(const [name,ref] of Object.entries(manifest.refs)){
   if(!validName(name)||!validId(ref))throw Error('Invalid assistance manifest reference.');
   documents[name]=await readObject(ref) as AssistanceJson;
  }
  return {...manifest,id,documents};
 };
 return {read,async commit(input){
  if(!locks)throw Error('This browser does not support atomic personal fingering storage.');
  // Capture immutable intent before waiting for another writer.
  const {expectedRevision,changes}=captureAssistanceCommit(input);
  return locks.request(`${prefix}writer`,async()=>{
   const current=await read();
   if(current.revision!==expectedRevision)return {status:'conflict',snapshot:current};
   if(current.revision===Number.MAX_SAFE_INTEGER)throw Error('Assistance revision exhausted.');
   const refs:Record<string,string>={...current.refs},documents={...current.documents};
   for(const [name,value] of Object.entries(changes)){
    if(value===null){delete refs[name];delete documents[name];}
    else {refs[name]=await writeObject(value);documents[name]=value;}
   }
   const manifest:AssistanceManifest={version:1,revision:current.revision+1,previous:current.id,refs};
   const id=await writeObject(manifest);
   // This single atomic storage operation is the only activation point.
   storage.setItem(`${prefix}current`,id);
   return {status:'committed',snapshot:{...manifest,id,documents}};
  });
 }};
}
