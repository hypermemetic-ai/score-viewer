import test from 'node:test';
import assert from 'node:assert/strict';
import {authoredFrettedPackage} from './support/fretted-dual-fixture';
import {importPackage} from '../src/package';
import {ManualReadingContext} from '../src/manual-reading-context';
import {ManualPracticeView} from '../src/manual-practice-view';
import {host} from '../src/host';

const p=await importPackage(await authoredFrettedPackage());
async function setup(t:any){
 const prior=Object.fromEntries(['document','window','AudioContext','cancelAnimationFrame'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)])),midiClock=host.midiClock,contexts:Audio[]=[],messages:string[]=[];
 class Audio {
  state='running';currentTime=0;destination={};closeResult=Promise.resolve();
  constructor(){contexts.push(this);}resume(){return Promise.resolve();}close(){this.state='closed';return this.closeResult;}
  createOscillator(){return {frequency:{value:0},connect(){return this;},start(){},stop(){},disconnect(){}};}
  createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){return this;},disconnect(){}};}
 }
 Object.assign(globalThis,{document:new EventTarget(),window:Object.assign(new EventTarget(),{setInterval:()=>1}),AudioContext:Audio,cancelAnimationFrame:()=>{}});host.midiClock=async()=>0;
 const context=await ManualReadingContext.open(p),app={contains:()=>false,removeAttribute(){},querySelector:()=>({focus(){}})} as unknown as HTMLElement;
 const view=new ManualPracticeView(app,{context,personal:{} as never,passage:()=>'',save:async()=>{},back(){},settings(){},changed(){}}) as any;
 view.paint=()=>{};view.status=(message:string)=>messages.push(message);
 t.after(()=>{view.close();host.midiClock=midiClock;for(const [key,descriptor]of Object.entries(prior)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}});
 await view.action('passage:'+context.plan.chunks[0].id);await view.action('ready');assert.equal(context.session!.phase,'countin');
 return {context,view,contexts,messages};
}
test('a genuine old clock close failure cannot pause the newer manual passage transport',async t=>{
 const h=await setup(t);let reject!:(error:Error)=>void;h.contexts[0].closeResult=new Promise<void>((_,r)=>reject=r);
 await h.view.action('passage:'+h.context.plan.chunks[0].id);await h.view.action('ready');
 const transport=h.view.transport,session=h.context.session!,origin=session.startMs,rate=session.bpm;
 reject(Error('Old output close failed'));await new Promise<void>(r=>setImmediate(r));
 assert.equal(h.view.transport,transport);assert.equal(session.phase,'countin');assert.equal(session.startMs,origin);assert.equal(session.bpm,rate);assert.deepEqual(h.messages,[]);
 assert.equal(h.contexts[1].state,'running');assert.deepEqual(h.context.state.best,{});
});
test('a late output close failure cannot invoke callbacks on the closed manual view',async t=>{
 const h=await setup(t);let reject!:(error:Error)=>void;h.contexts[0].closeResult=new Promise<void>((_,r)=>reject=r);let pauses=0;const pause=h.view.pause.bind(h.view);h.view.pause=()=>{pauses++;pause();};
 h.view.close();reject(Error('Closed view output failure'));await new Promise<void>(r=>setImmediate(r));
 assert.equal(pauses,0);assert.deepEqual(h.messages,[]);assert.equal(h.context.session!.phase,'paused');
});
test('a genuine failure from the currently owned manual clock remains observable and pauses it',async t=>{
 const h=await setup(t),clock=h.view.transport.clock;let reject!:(error:Error)=>void;h.contexts[0].closeResult=new Promise<void>((_,r)=>reject=r);
 const failure=Error('Current output close failed'),closing=clock.close();reject(failure);await assert.rejects(closing,(error:unknown)=>error===failure);await new Promise<void>(r=>setImmediate(r));
 assert.equal(h.view.transport.clock,clock);assert.equal(h.context.session!.phase,'paused');assert.deepEqual(h.messages,['Audio could not close: Current output close failed']);assert.deepEqual(h.context.state.best,{});
});
