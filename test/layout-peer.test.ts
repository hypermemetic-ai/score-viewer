/**
 * On two cores a score's first engrave lays systems out on a second worker
 * too (layout-peer.ts). The peer is started only for a whole first engrave,
 * only when the machine reports two cores and a worker can start, and it is
 * stopped when that engrave ends.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {startLayoutPeer,withLayoutPeer,type LayoutPeer} from '../src/layout-peer';
import {createProjectionHost,type HostedProjectionCore} from '../src/personal-projection-host';
import type {ProjectionResponse} from '../src/personal-projection-protocol';
import type {PreparationExecution} from '../vendor/iso-notation/src/score-presentation';

const fakePeer=()=>{const peer={terminated:0,postMessage(){},addEventListener(){},removeEventListener(){},terminate(){peer.terminated++;}};return peer;};

test('an engrave\'s peer is stopped when the engrave ends, however it ends',async()=>{
 const peer=fakePeer();
 assert.equal(await withLayoutPeer(async layoutPeer=>{assert.equal(layoutPeer,peer);return 7;},()=>peer),7);
 assert.equal(peer.terminated,1);
 await assert.rejects(withLayoutPeer(async()=>{throw Error('refused');},()=>peer),/refused/);
 assert.equal(peer.terminated,2);
 assert.equal(await withLayoutPeer(async layoutPeer=>layoutPeer,()=>undefined),undefined);
});

test('a peer starts only on two cores, and a worker that cannot start or load leaves one',()=>{
 const saved={Worker:Object.getOwnPropertyDescriptor(globalThis,'Worker'),navigator:Object.getOwnPropertyDescriptor(globalThis,'navigator')};
 const cores=(n:number|undefined)=>Object.defineProperty(globalThis,'navigator',{value:n===undefined?{}:{hardwareConcurrency:n},configurable:true,writable:true});
 let started=0,listeners:((event:{preventDefault():void})=>void)[]=[],terminated=0,refuse=false;
 class FakeWorker{constructor(public url:URL,public options:WorkerOptions){if(refuse)throw Error('blocked');started++;}
  addEventListener(_:string,listener:(event:{preventDefault():void})=>void){listeners.push(listener);}terminate(){terminated++;}}
 try{
  Object.defineProperty(globalThis,'Worker',{value:undefined,configurable:true,writable:true});cores(8);
  assert.equal(startLayoutPeer(),undefined,'no Worker');
  Object.defineProperty(globalThis,'Worker',{value:FakeWorker,configurable:true,writable:true});
  for(const n of [1,undefined]){cores(n);assert.equal(startLayoutPeer(),undefined,`${n} cores`);}
  assert.equal(started,0);
  cores(2);const peer=startLayoutPeer() as unknown as FakeWorker;
  assert.ok(peer instanceof FakeWorker);assert.equal(started,1);
  assert.match(peer.url.href,/layout-peer-worker\.ts$/);assert.equal(peer.options.type,'module');
  let prevented=false;listeners.forEach(l=>l({preventDefault(){prevented=true;}}));
  assert.equal(prevented,true);assert.equal(terminated,1,'a worker that fails to load is stopped');
  refuse=true;assert.equal(startLayoutPeer(),undefined,'a worker that cannot start');
 }finally{
  for(const [key,descriptor] of Object.entries(saved))if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete (globalThis as Record<string,unknown>)[key];
 }
});

test('the projection worker gives a core\'s first engrave a peer, and nothing else',async()=>{
 const peers:ReturnType<typeof fakePeer>[]=[],seen:{call:string;peer:boolean;terminated?:number}[]=[];
 const start=()=>{const peer=fakePeer();peers.push(peer);return peer as LayoutPeer;};
 const record=async(call:string,e?:PreparationExecution)=>{
  const peer=e?.layoutPeer as ReturnType<typeof fakePeer>|undefined;
  // A peer's systems arrive as messages, so the steps yield real task turns.
  if(peer){let task=false;setTimeout(()=>{task=true;});await e?.yieldControl?.('layout');await e?.yieldControl?.('layout');await new Promise(r=>setTimeout(r,0));assert.ok(task);}
  seen.push({call,peer:!!peer,terminated:peer?.terminated});
 };
 const core=():HostedProjectionCore=>({async warmAsync(e){await record('warm',e);},
  async projectAsync(_o,_d,e){await record('project',e);return {score:{} as never,pages:[],seats:[],annotationGeometry:[] as never} as never;},
  async restoreAsync(_s,e){await record('restore',e);return true;}});
 const responses:ProjectionResponse[]=[];
 const host=createProjectionHost(response=>responses.push(response),{create:core,startLayoutPeer:start});
 const send=(request:Record<string,unknown>)=>host.handle({create:{source:{},baseline:{},recipe:{}},...request} as never);
 await send({id:1,kind:'warm',key:'a'});
 await send({id:2,kind:'warm',key:'a'});
 await send({id:3,kind:'project',key:'a',owners:[],digest:'d'});
 await send({id:4,kind:'project',key:'b',owners:[],digest:'d'});
 await send({id:5,kind:'warm',key:'c',saved:{}});
 assert.deepEqual(seen,[
  {call:'warm',peer:true,terminated:0},{call:'warm',peer:false,terminated:undefined},{call:'project',peer:false,terminated:undefined},
  {call:'project',peer:true,terminated:0},{call:'restore',peer:false,terminated:undefined}]);
 assert.equal(peers.length,2);assert.deepEqual(peers.map(p=>p.terminated),[1,1],'each peer stops with its engrave');
});
