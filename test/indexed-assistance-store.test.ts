import assert from 'node:assert/strict';
import test from 'node:test';
import {IDBFactory,IDBObjectStore} from 'fake-indexeddb';
import {browserAssistanceStore,indexedDBAssistanceStore,type AssistanceBrowserLocks} from '../src/durable-assistance-store';

const database='iso-viewer-assistance-v1',prefix='iso-viewer-assistance-v1/';
class Locks implements AssistanceBrowserLocks {
 private tail:Promise<unknown>=Promise.resolve();
 request<T>(_name:string,callback:()=>Promise<T>):Promise<T>{const next=this.tail.then(callback);this.tail=next.catch(()=>{});return next;}
}
function legacy(){const data=new Map<string,string>();return{data,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};}
async function raw(factory:IDBFactory,store:string,key:string,value?:unknown):Promise<unknown>{
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=factory.open(database,1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
 try{return await new Promise((resolve,reject)=>{const transaction=db.transaction(store,value===undefined?'readonly':'readwrite'),request=value===undefined?transaction.objectStore(store).get(key):transaction.objectStore(store).put(value,key);let result:unknown;
  request.onsuccess=()=>{result=request.result;};transaction.oncomplete=()=>resolve(result);transaction.onabort=()=>reject(transaction.error);
 });}finally{db.close();}
}

test('indexed storage retains more than localStorage quota and every historical manifest without touching legacy bytes',async t=>{
 const old=legacy(),factory=new IDBFactory(),store=indexedDBAssistanceStore(factory,old);t.after(()=>store.close());
 const original=await store.commit({expectedRevision:0,changes:{memory:{finger:2},personal:{finger:2},receipt:{complete:true}}});
 let revision=1;const payload='x'.repeat(600_000);
 for(let i=0;i<10;i++){const result=await store.commit({expectedRevision:revision,changes:{memory:{payload,change:i}}});assert.equal(result.status,'committed');revision=result.snapshot.revision;}
 assert.equal((await store.read()).revision,11);assert.deepEqual((await store.read(original.snapshot.id!)).documents.memory,{finger:2});assert.deepEqual((await store.read()).documents.receipt,{complete:true});assert.equal(old.data.size,0);
});
test('independent indexed clients serialize CAS without Web Locks and capture caller intent before awaits',async t=>{
 const old=legacy(),factory=new IDBFactory(),a=indexedDBAssistanceStore(factory,old),b=indexedDBAssistanceStore(factory,old);t.after(()=>{a.close();b.close();});await Promise.all([a.read(),b.read()]);
 const changes={memory:{finger:2}},first=a.commit({expectedRevision:0,changes}),second=b.commit({expectedRevision:0,changes:{memory:{finger:3}}});changes.memory.finger=5;
 const results=await Promise.all([first,second]);assert.equal(results.filter(r=>r.status==='committed').length,1);assert.equal(results.filter(r=>r.status==='conflict').length,1);
 const winner=results.find(r=>r.status==='committed')!;assert.deepEqual((await b.read()).documents.memory,winner.snapshot.documents.memory);assert.notDeepEqual(winner.snapshot.documents.memory,{finger:5});
 const next=await b.commit({expectedRevision:1,changes:{receipt:{complete:true}}});assert.equal(next.status,'committed');assert.deepEqual(next.snapshot.documents.memory,winner.snapshot.documents.memory);
});
test('migration imports complete legacy history in one activation and keeps original bytes and pointer unchanged',async t=>{
 const old=legacy(),locks=new Locks(),previous=browserAssistanceStore(old,locks),first=await previous.commit({expectedRevision:0,changes:{memory:{finger:2},personal:{finger:2}}});
 const latest=await previous.commit({expectedRevision:1,changes:{memory:{finger:3},receipt:{complete:true}}}),before=new Map(old.data),factory=new IDBFactory(),store=indexedDBAssistanceStore(factory,old,locks);t.after(()=>store.close());
 assert.equal((await store.read()).id,latest.snapshot.id);assert.deepEqual((await store.read(first.snapshot.id!)).documents.memory,{finger:2});assert.deepEqual(old.data,before);
 await store.commit({expectedRevision:2,changes:{memory:{finger:4}}});assert.deepEqual(old.data,before);assert.equal((await store.read()).revision,3);
 // Historical copies are now independent of the still-retained legacy objects.
 old.data.delete(`${prefix}objects/${first.snapshot.refs.memory}`);assert.deepEqual((await store.read(first.snapshot.id!)).documents.memory,{finger:2});
});
test('corrupt historical migration input cannot activate a partial history; repaired inputs can be retried',async t=>{
 const old=legacy(),locks=new Locks(),previous=browserAssistanceStore(old,locks),first=await previous.commit({expectedRevision:0,changes:{memory:{finger:2}}});await previous.commit({expectedRevision:1,changes:{memory:{finger:3}}});
 const key=`${prefix}objects/${first.snapshot.refs.memory}`,original=old.data.get(key)!;old.data.set(key,'{}');const factory=new IDBFactory(),store=indexedDBAssistanceStore(factory,old,locks);t.after(()=>store.close());
 await assert.rejects(store.read(),/corrupt assistance/);assert.equal(await raw(factory,'meta','active'),undefined);old.data.set(key,original);assert.equal((await store.read()).revision,2);
});
test('migration staging failure rolls back both imported objects and activation marker',async t=>{
 const old=legacy(),locks=new Locks(),previous=browserAssistanceStore(old,locks),saved=await previous.commit({expectedRevision:0,changes:{memory:{finger:2}}}),before=new Map(old.data),factory=new IDBFactory(),store=indexedDBAssistanceStore(factory,old,locks);t.after(()=>store.close());
 const original=IDBObjectStore.prototype.add;let fail=true;
 const mocked=t.mock.method(IDBObjectStore.prototype,'add',function(this:IDBObjectStore,...args:Parameters<IDBObjectStore['add']>){if(fail&&this.name==='objects')throw new DOMException('Storage full','QuotaExceededError');return original.apply(this,args);});
 await assert.rejects(store.read(),/Storage full/);assert.equal(await raw(factory,'meta','active'),undefined);assert.equal(await raw(factory,'objects',saved.snapshot.id!),undefined);assert.deepEqual(old.data,before);
 fail=false;assert.equal((await store.read()).id,saved.snapshot.id);mocked.mock.restore();
});
test('failed indexed writes leave current state and completion unchanged and retain historical recovery',async t=>{
 const factory=new IDBFactory(),store=indexedDBAssistanceStore(factory,legacy());t.after(()=>store.close());const first=await store.commit({expectedRevision:0,changes:{memory:{finger:2}}});
 const original=IDBObjectStore.prototype.add;let fail=true;
 t.mock.method(IDBObjectStore.prototype,'add',function(this:IDBObjectStore,...args:Parameters<IDBObjectStore['add']>){if(fail&&this.name==='objects')throw new DOMException('Storage full','QuotaExceededError');return original.apply(this,args);});
 await assert.rejects(store.commit({expectedRevision:1,changes:{memory:{finger:3},receipt:{complete:true}}}),/Storage full/);assert.equal((await store.read()).id,first.snapshot.id);assert.equal((await store.read()).documents.receipt,undefined);
 fail=false;const second=await store.commit({expectedRevision:1,changes:{memory:{finger:4},receipt:{complete:true}}});assert.equal(second.status,'committed');assert.deepEqual((await store.read(first.snapshot.id!)).documents.memory,{finger:2});
});
test('late writes from an older browser build are retained and block silent divergence',async t=>{
 const old=legacy(),locks=new Locks(),previous=browserAssistanceStore(old,locks);await previous.commit({expectedRevision:0,changes:{memory:{finger:2}}});const factory=new IDBFactory(),store=indexedDBAssistanceStore(factory,old,locks);t.after(()=>store.close());
 await store.read();const accepted=await store.commit({expectedRevision:1,changes:{memory:{finger:3}}});const older=await previous.commit({expectedRevision:1,changes:{memory:{finger:4}}});
 await assert.rejects(store.read(),/Another browser version/);await assert.rejects(store.commit({expectedRevision:2,changes:{memory:{finger:5}}}),/Another browser version/);
 assert.deepEqual((await store.read(accepted.snapshot.id!)).documents.memory,{finger:3});assert.deepEqual((await previous.read(older.snapshot.id!)).documents.memory,{finger:4});
});
test('indexed corruption, invalid JSON input, and unsupported legacy migration fail closed',async t=>{
 const old=legacy(),factory=new IDBFactory(),store=indexedDBAssistanceStore(factory,old);t.after(()=>store.close());const saved=await store.commit({expectedRevision:0,changes:{memory:{finger:2}}});
 await assert.rejects(store.commit({expectedRevision:1,changes:{bad:Number.NaN}}),/finite JSON/);await raw(factory,'objects',saved.snapshot.refs.memory,'{}');await assert.rejects(store.read(),/corrupt assistance/);
 const locks=new Locks();await browserAssistanceStore(old,locks).commit({expectedRevision:0,changes:{memory:{finger:3}}});const migration=indexedDBAssistanceStore(new IDBFactory(),old);t.after(()=>migration.close());await assert.rejects(migration.read(),/requires browser Web Locks/);
 const unavailable=indexedDBAssistanceStore(undefined,legacy());await assert.rejects(unavailable.read(),/does not support durable/);
});

test('prepared personal keys survive legacy migration, indexed reopening and history without identity changes',async t=>{
 const key=(layout:string)=>`state-${'a'.repeat(64)}-${layout}-${'b'.repeat(64)}-${'c'.repeat(64)}-${'d'.repeat(64)}.json`;
 const janko=key('janko-four-row'),conventional=key('conventional-piano');assert.equal(janko.length,285);assert.equal(conventional.length,289);
 const old=legacy(),locks=new Locks(),previous=browserAssistanceStore(old,locks);
 const first=await previous.commit({expectedRevision:0,changes:{[janko]:{finger:2},[conventional]:{finger:3}}});
 const original=new Map(old.data),factory=new IDBFactory(),store=indexedDBAssistanceStore(factory,old,locks);t.after(()=>store.close());
 assert.equal((await store.read()).id,first.snapshot.id);assert.deepEqual((await store.read()).documents[janko],{finger:2});
 await store.commit({expectedRevision:1,changes:{[janko]:{finger:4},['e'.repeat(4096)]:{boundary:true}}});store.close();
 const reopened=indexedDBAssistanceStore(factory,old,locks);t.after(()=>reopened.close());
 assert.deepEqual((await reopened.read()).documents[janko],{finger:4});assert.deepEqual((await reopened.read()).documents[conventional],{finger:3});assert.deepEqual((await reopened.read(first.snapshot.id!)).documents[janko],{finger:2});assert.deepEqual(old.data,original);
 for(const invalid of ['e'.repeat(4097),'bad\\name','bad:name',''])await assert.rejects(reopened.commit({expectedRevision:2,changes:{[invalid]:{bad:true}}}),/document name/);
 assert.equal((await reopened.read()).revision,2);assert.ok([...old.data.keys()].filter(k=>k.includes('/objects/')).every(k=>/\/objects\/[a-f0-9]{64}$/.test(k)));
});
