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
// Logical map keys include complete prepared-edition identities (285/289
// characters today). Physical object names remain fixed SHA256 IDs. Keep this
// bound in sync with assistance_store.rs; no existing identity is shortened.
function validName(name:string):boolean {return /^[A-Za-z0-9][A-Za-z0-9._/-]{0,4095}$/.test(name);}
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
async function checkedObject(text:unknown,id:string):Promise<AssistanceJson> {
 if(!validId(id))throw Error('Invalid assistance object identity.');
 if(typeof text!=='string'||new TextEncoder().encode(text).byteLength>maxBytes||await digest(text)!==id)throw Error('Missing or corrupt assistance object.');
 const value=JSON.parse(text);serialized(value);return value;
}
function checkedManifest(value:unknown):AssistanceManifest {
 const manifest=value as AssistanceManifest;
 if(!manifest||manifest.version!==1||!Number.isSafeInteger(manifest.revision)||manifest.revision<1||!(manifest.previous===null||validId(manifest.previous))||!manifest.refs||typeof manifest.refs!=='object'||Array.isArray(manifest.refs))throw Error('Invalid assistance manifest.');
 for(const [name,id]of Object.entries(manifest.refs))if(!validName(name)||!validId(id))throw Error('Invalid assistance manifest reference.');
 return manifest;
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
  return checkedObject(storage.getItem(blobKey(id)),id);
 };
 const writeObject=async(value:unknown):Promise<string>=>{
  const text=serialized(value),id=await digest(text),key=blobKey(id),existing=storage.getItem(key);
  if(existing!==null&&existing!==text)throw Error('Assistance object identity collision.');
  if(existing===null)storage.setItem(key,text);
  return id;
 };
 const read=async(requestedId?:string):Promise<AssistanceSnapshot>=>{
  const id=requestedId??storage.getItem(`${prefix}current`);if(id===null)return empty();
  const manifest=checkedManifest(await readObject(id));
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

const databaseName='iso-viewer-assistance-v1';
interface IndexedActive {version:1;current:string|null;legacyCurrent:string|null}
function checkedActive(value:unknown):IndexedActive {
 const active=value as IndexedActive;
 if(!active||active.version!==1||!(active.current===null||validId(active.current))||!(active.legacyCurrent===null||validId(active.legacyCurrent)))throw Error('Invalid indexed personal fingering pointer.');
 return active;
}
export interface IndexedAssistanceStore extends AssistanceStore {close():void}
/** Immutable history belongs in IndexedDB rather than the browser's small
 * synchronous localStorage quota. Hashing/staging happens outside the short
 * readwrite transaction; its pointer comparison and activation are atomic.
 * The legacy Web Lock protects only compatibility with still-open old builds. */
export function indexedDBAssistanceStore(factory:IDBFactory|undefined,legacy:Pick<AssistanceBrowserStorage,'getItem'>,locks?:AssistanceBrowserLocks):IndexedAssistanceStore {
 let connection:Promise<IDBDatabase>|undefined,ready:Promise<void>|undefined;
 const open=()=>connection??=new Promise<IDBDatabase>((resolve,reject)=>{
  if(!factory){reject(Error('This browser does not support durable personal fingering storage.'));return;}
  const request=factory.open(databaseName,1);let rejected=false;
  request.onupgradeneeded=()=>{request.result.createObjectStore('objects');request.result.createObjectStore('meta');};
  request.onerror=()=>{connection=undefined;reject(request.error??Error('Cannot open personal fingering storage.'));};
  request.onblocked=()=>{rejected=true;connection=undefined;reject(Error('Another browser window is blocking personal fingering storage.'));};
  request.onsuccess=()=>{const db=request.result;if(rejected){db.close();return;}db.onversionchange=()=>{db.close();connection=undefined;ready=undefined;};resolve(db);};
 });
 const close=()=>{void connection?.then(db=>db.close(),()=>{});connection=undefined;ready=undefined;};
 const get=async(store:string,keys:readonly string[]):Promise<unknown[]>=>{
  const db=await open();return new Promise((resolve,reject)=>{
   const transaction=db.transaction(store,'readonly'),values:unknown[]=[],table=transaction.objectStore(store);
   transaction.onabort=()=>reject(transaction.error??Error('Personal fingering read failed.'));
   transaction.oncomplete=()=>resolve(values);
   keys.forEach((key,i)=>{const request=table.get(key);request.onsuccess=()=>{values[i]=request.result;};});
  });
 };
 const legacyPointer=()=>{const id=legacy.getItem(`${prefix}current`);if(id!==null&&!validId(id))throw Error('Invalid legacy personal fingering pointer.');return id;};
 const unchangedLegacy=(active:IndexedActive)=>{if(legacyPointer()!==active.legacyCurrent)throw Error('Another browser version changed the older personal fingering journal. Both versions are retained; close that version before recovery.');};
 /** Every request is enqueued from an active IDB event callback. There is no
 * await/crypto work inside the transaction that could let it auto-commit. */
 const activate=async(expected:IndexedActive|undefined,next:IndexedActive,objects:ReadonlyMap<string,string>):Promise<boolean>=>{
  const db=await open();return new Promise((resolve,reject)=>{
   const transaction=db.transaction(['objects','meta'],'readwrite',{durability:'strict'}),table=transaction.objectStore('objects'),meta=transaction.objectStore('meta');let changed=false,failure:unknown;
   const fail=(error:unknown)=>{failure=error;transaction.abort();};
   transaction.onabort=()=>reject(failure??transaction.error??Error('Personal fingering transaction failed.'));
   transaction.oncomplete=()=>resolve(changed);
   const current=meta.get('active');current.onsuccess=()=>{try{
    const actual=current.result===undefined?undefined:checkedActive(current.result);
    if(JSON.stringify(actual)!==JSON.stringify(expected))return;
    unchangedLegacy(next);
    for(const [id,text]of objects){const request=table.get(id);request.onsuccess=()=>{try{
     if(request.result!==undefined&&request.result!==text){fail(Error('Assistance object identity collision.'));return;}
     if(request.result===undefined)table.add(text,id);
    }catch(error){fail(error);}};}
    meta.put(next,'active');changed=true;
   }catch(error){fail(error);}};
  });
 };
 const legacyLocked=<T>(work:()=>Promise<T>)=>locks?locks.request(`${prefix}writer`,work):work();
 const initialize=()=>ready??=legacyLocked(async()=>{
  const existing=(await get('meta',['active']))[0];if(existing!==undefined){checkedActive(existing);return;}
  const current=legacyPointer();if(current!==null&&!locks)throw Error('Migrating the older personal fingering journal requires browser Web Locks.');
  const objects=new Map<string,string>(),load=async(id:string)=>{
   const text=objects.get(id)??legacy.getItem(`${prefix}objects/${id}`),value=await checkedObject(text,id);objects.set(id,text as string);return value;
  };
  let cursor=current,expectedRevision:number|undefined;
  while(cursor!==null){
   const manifest=checkedManifest(await load(cursor));
   if(expectedRevision!==undefined&&manifest.revision!==expectedRevision||manifest.revision===1&&manifest.previous!==null||manifest.revision>1&&manifest.previous===null)throw Error('Legacy personal fingering history is incomplete.');
   for(const id of Object.values(manifest.refs))await load(id);
   expectedRevision=manifest.revision-1;cursor=manifest.previous;
  }
  if(legacyPointer()!==current)throw Error('Legacy personal fingering journal changed during migration.');
  // Full retained history and the active pointer become visible together. On
  // failure the old bytes and pointer remain the only authoritative version.
  await activate(undefined,{version:1,current,legacyCurrent:current},objects);
 }).catch(error=>{ready=undefined;throw error;});
 const read=async(id?:string):Promise<AssistanceSnapshot>=>{
  await initialize();const active=checkedActive((await get('meta',['active']))[0]);if(id===undefined)unchangedLegacy(active);
  const selected=id??active.current;if(selected===null)return empty();
  if(!validId(selected))throw Error('Invalid assistance object identity.');
  const object=async(key:string)=>{const stored=(await get('objects',[key]))[0];return checkedObject(stored===undefined?legacy.getItem(`${prefix}objects/${key}`):stored,key);};
  const manifest=checkedManifest(await object(selected)),entries=Object.entries(manifest.refs),stored=await get('objects',entries.map(([,key])=>key)),documents:Record<string,AssistanceJson>=Object.create(null);
  await Promise.all(entries.map(async([name,key],i)=>{documents[name]=await checkedObject(stored[i]===undefined?legacy.getItem(`${prefix}objects/${key}`):stored[i],key);}));
  return{...manifest,id:selected,documents};
 };
 return{read,close,async commit(input){
  // Capture before any await so callers cannot mutate queued intent.
  const {expectedRevision,changes}=captureAssistanceCommit(input);
  await initialize();return legacyLocked(async()=>{
   const current=await read();if(current.revision!==expectedRevision)return{status:'conflict',snapshot:current};
   if(current.revision===Number.MAX_SAFE_INTEGER)throw Error('Assistance revision exhausted.');
   const active=checkedActive((await get('meta',['active']))[0]);if(active.current!==current.id)return{status:'conflict',snapshot:await read()};
   const refs={...current.refs},documents={...current.documents},objects=new Map<string,string>();
   for(const [name,value]of Object.entries(changes)){
    if(value===null){delete refs[name];delete documents[name];}
    else{const text=serialized(value),id=await digest(text);objects.set(id,text);refs[name]=id;documents[name]=value;}
   }
   const manifest:AssistanceManifest={version:1,revision:current.revision+1,previous:current.id,refs},text=serialized(manifest),id=await digest(text);objects.set(id,text);
   if(!await activate(active,{...active,current:id},objects))return{status:'conflict',snapshot:await read()};
   return{status:'committed',snapshot:{...manifest,id,documents}};
  });
 }};
}
