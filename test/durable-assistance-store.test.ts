import assert from 'node:assert/strict';
import test from 'node:test';
import {browserAssistanceStore,requireAssistanceStore,type AssistanceBrowserLocks} from '../src/durable-assistance-store';
class Locks implements AssistanceBrowserLocks {
 private tail:Promise<unknown>=Promise.resolve();
 request<T>(_name:string,callback:()=>Promise<T>):Promise<T>{const next=this.tail.then(callback);this.tail=next.catch(()=>{});return next;}
}
function fixture(){
 const data=new Map<string,string>();let failKey:string|undefined;
 const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{if(failKey&&key.includes(failKey))throw Error('Storage full');data.set(key,value);}};
 const locks=new Locks();return {data,storage,locks,store:browserAssistanceStore(storage,locks),fail:(key?:string)=>{failKey=key;}};
}
test('one manifest commits personal, shared memory and receipt; retained history recovers all originals',async()=>{
 const {store}=fixture();const start=await store.read();assert.equal(start.revision,0);
 const first=await store.commit({expectedRevision:0,changes:{memory:{finger:2},'personal/source':{finger:2},'receipt/source':{complete:true}}});
 assert.equal(first.status,'committed');assert.equal(first.snapshot.revision,1);
 const second=await store.commit({expectedRevision:1,changes:{memory:{finger:4},'receipt/source':null}});
 assert.equal(second.snapshot.previous,first.snapshot.id);assert.equal(second.snapshot.documents['receipt/source'],undefined);
 assert.deepEqual((await store.read(first.snapshot.id!)).documents['receipt/source'],{complete:true});
 assert.deepEqual((await store.read()).documents.memory,{finger:4});
});
test('independent clients with the same expected revision accept exactly one transaction',async()=>{
 const {storage,locks,store}=fixture(),second=browserAssistanceStore(storage,locks);
 const results=await Promise.all([store.commit({expectedRevision:0,changes:{memory:{finger:2}}}),second.commit({expectedRevision:0,changes:{memory:{finger:3}}})]);
 assert.deepEqual(results.map(r=>r.status),['committed','conflict']);
 assert.deepEqual(results[1].snapshot.documents.memory,{finger:2});
 const retry=await second.commit({expectedRevision:1,changes:{'personal/local':{finger:3}}});assert.equal(retry.status,'committed');assert.deepEqual(retry.snapshot.documents.memory,{finger:2});
});
test('staging and activation failures preserve current state; retry never records incomplete completion',async()=>{
 const {store,fail}=fixture();const before=await store.commit({expectedRevision:0,changes:{memory:{finger:2}}});
 for(const failure of ['objects/','current']){
  fail(failure);await assert.rejects(store.commit({expectedRevision:1,changes:{memory:{finger:3},receipt:{complete:true}}}),/Storage full/);
  fail();const current=await store.read();assert.equal(current.id,before.snapshot.id);assert.equal(current.documents.receipt,undefined);
 }
 const success=await store.commit({expectedRevision:1,changes:{memory:{finger:4},receipt:{complete:true}}});assert.equal(success.status,'committed');assert.deepEqual(success.snapshot.documents.memory,{finger:4});
});
test('queued input is captured, and unsupported hosts do not emulate unsafe transactions',async()=>{
 const f=fixture();const changes={memory:{finger:2}},pending=f.store.commit({expectedRevision:0,changes});changes.memory.finger=5;assert.deepEqual((await pending).snapshot.documents.memory,{finger:2});
 assert.throws(()=>requireAssistanceStore({}),/does not support atomic/);
 await assert.rejects(browserAssistanceStore(f.storage,undefined).commit({expectedRevision:1,changes:{}}),/does not support atomic/);
});
test('corrupt immutable objects and non-JSON input fail without advancing the pointer',async()=>{
 const {store,data}=fixture();const first=await store.commit({expectedRevision:0,changes:{memory:{finger:2}}});
 await assert.rejects(store.commit({expectedRevision:1,changes:{bad:Number.NaN}}),/finite JSON/);
 const key=[...data.keys()].find(k=>k.endsWith(first.snapshot.refs.memory))!;data.set(key,'{}');
 await assert.rejects(store.read(),/corrupt assistance/);await assert.rejects(store.commit({expectedRevision:1,changes:{memory:{}}}),/corrupt assistance/);
});
