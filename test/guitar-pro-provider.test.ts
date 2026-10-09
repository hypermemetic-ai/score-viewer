import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectGuitarProSource,stageGuitarProParts,guitarProContext} from '../src/guitar-pro-provider';
test('public intake refuses invalid/oversized views and borrowed discovery before runtime work',async()=>{
 await assert.rejects(inspectGuitarProSource(new Uint8Array()),/bound/);
 await assert.rejects(inspectGuitarProSource(new Uint8Array(8*1024*1024+1)),/bound/);
 await assert.rejects(inspectGuitarProSource([1,2] as never),/byte view/);
 await assert.rejects(stageGuitarProParts({tracks:[],report:{},inputSha256:'x'} as never,['0'],{prepareAndAdmit:async()=>{throw Error('must not run');}}),/different receiving operation/);
 assert.equal(guitarProContext({manifest:{},score:{}} as never),undefined);
});
test('intrinsic source snapshot never invokes a supplied iterator and cancellation refuses before Worker loading',async()=>{
 const bytes=new Uint8Array([1,2,3]);let calls=0;
 Object.defineProperty(bytes,Symbol.iterator,{value:()=>{calls++;throw Error('caller iterator');}});
 Object.defineProperty(bytes,'slice',{value:()=>{calls++;throw Error('caller slice');}});
 const controller=new AbortController();controller.abort();
 await assert.rejects(inspectGuitarProSource(bytes,{signal:controller.signal}),{name:'AbortError'});assert.equal(calls,0);
});
test('proxy, detached and shared inputs refuse before digest or runtime and dense view snapshots ignore hooks',async()=>{
 const proxy=new Proxy(new Uint8Array([1]),{});await assert.rejects(inspectGuitarProSource(proxy),/byte view/);
 const detached=new Uint8Array([1]);structuredClone(detached,{transfer:[detached.buffer]});await assert.rejects(inspectGuitarProSource(detached),/bound/);
 if(typeof SharedArrayBuffer!=='undefined')await assert.rejects(inspectGuitarProSource(new Uint8Array(new SharedArrayBuffer(2))),/bound/);
 const full=new Uint8Array([9,1,2,3,9]),view=new Uint8Array(full.buffer,1,3),abort=new AbortController();abort.abort();
 let hooks=0;Object.defineProperty(view,'byteLength',{get:()=>{hooks++;throw Error('caller getter');}});
 await assert.rejects(inspectGuitarProSource(view,{signal:abort.signal}),{name:'AbortError'});assert.equal(hooks,0);
});
