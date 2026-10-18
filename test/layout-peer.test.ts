/**
 * On two cores a score's first engrave lays systems out on a second worker
 * too (layout-peer.ts). The peer is started only for a whole first engrave,
 * only when the machine reports two cores and a worker can start, and it is
 * stopped when that engrave ends.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {strToU8} from 'fflate';
import {startLayoutPeer,useLayoutPeerStarter,withLayoutPeer,type LayoutPeer} from '../src/layout-peer';
import {prepareMusicXmlScore} from '../src/musicxml-import';
import {importPackage} from '../src/package';
import {prepareSourceTransposition} from '../src/score-transposition';
import {startNodeLayoutPeer} from '../vendor/iso-notation/scripts/lib/node-layout-peer';
import type {LayoutPeerRequest} from '../vendor/iso-notation/src/render/iso/layout-peer';
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
  if(peer){
   const turn=e!.yieldControl!('layout');let done=false;void turn.then(()=>{done=true;});
   for(let i=0;i<20;i++)await Promise.resolve();
   assert.equal(done,false,'a microtask yield would leave the peer\'s replies unread');await turn;
  }
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

/** A peer on a Node worker thread (the engine's own, for its benchmark),
 * recording the requests it is sent, the systems an engrave takes from it and
 * how often it is stopped. */
async function workerPeer(){
 const node=await startNodeLayoutPeer(),requests:string[]=[];
 const peer={systems:0,terminated:0,requests,...node.port,close:node.close,
  postMessage(request:LayoutPeerRequest){requests.push(request.kind);node.port.postMessage(request);},
  taken:()=>{peer.systems++;},
  terminate(){peer.terminated++;void node.close();}};
 return peer;
}
/** Engraves once with a worker peer and then once alone; both must draw
 * alike. The paired engrave goes first: one after it in this process would
 * find main's code and bow caches warm and outrun a cold peer, as no engrave
 * in a viewer's fresh worker does. */
async function withAndWithoutPeer<T>(engrave:()=>Promise<T>){
 const peers:Awaited<ReturnType<typeof workerPeer>>[]=[];
 // The worker starts ahead, as a browser's has by the time an engrave begins.
 const ready=await workerPeer();
 const undo=useLayoutPeerStarter(()=>{const peer=peers.length?undefined:ready;if(peer)peers.push(peer);return peer as unknown as LayoutPeer|undefined;});
 let paired:T;
 try{paired=await engrave();}finally{undo();if(!ready.terminated)void ready.close();}
 return {paired,alone:await engrave(),peers};
}
const assets={font:{name:'fonts/URWGothic-Demi.otf',bytes:readFileSync(new URL('../src/URWGothic-Demi.otf',import.meta.url))},
 notices:Object.fromEntries(['URW-base35-COPYING','URW-base35-LICENSE','URW-base35-provenance.md'].map(name=>
  ['licenses/'+name,readFileSync(new URL('../licenses/'+name,import.meta.url))]))};
// A browser reads a worker's messages between an engrave's task turns. Node
// runs a MessageChannel's messages back to back before its workers', so the
// engrave yields through setImmediate, as the engine's benchmark does.
const execution={yieldControl:()=>new Promise<void>(resolve=>setImmediate(resolve))};
const imported=async(xml:string)=>importPackage((await prepareMusicXmlScore(strToU8(xml),assets,execution)).bytes,{allowLegacyTempo:true});

// Schumann Op. 68 No. 13, as the engine's benchmark imports it: its systems
// cost enough that a fresh peer delivers some before main reaches them.
const xml=readFileSync(new URL('../vendor/iso-notation/src/scores/schumann-op68-no13.musicxml',import.meta.url),'utf8');

test('an import engraves with a peer when one starts, taking its systems and drawing the same pages',async()=>{
 const {alone,paired,peers:[peer]}=await withAndWithoutPeer(()=>imported(xml));
 assert.deepEqual(paired.pages,alone.pages);assert.deepEqual(paired.seats,alone.seats);
 assert.ok(peer,'the import starts a peer');
 assert.equal(peer.requests[0],'layout');assert.equal(peer.terminated,1,'the peer stops with its engrave');
 assert.ok(peer.systems>0,'the import took systems from its peer');
});

test('an edition engraves with a peer when one starts, drawing the same pages',async()=>{
 const bytes=(await prepareMusicXmlScore(strToU8(xml),assets)).bytes,p=await importPackage(bytes,{allowLegacyTempo:true});
 const edition=async()=>importPackage(await prepareSourceTransposition(p,bytes,2,execution),{allowLegacyTempo:true});
 const {alone,paired,peers:[peer]}=await withAndWithoutPeer(edition);
 assert.deepEqual(paired.pages,alone.pages);assert.deepEqual(paired.seats,alone.seats);
 assert.ok(peer,'the edition starts a peer');
 assert.equal(peer.requests[0],'layout');assert.equal(peer.terminated,1,'the peer stops with its engrave');
});
