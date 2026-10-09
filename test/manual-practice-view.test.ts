import test from 'node:test';import assert from 'node:assert/strict';
import {authoredFrettedPackage} from './support/fretted-dual-fixture';
import {importPackage} from '../src/package';
import {ManualReadingContext} from '../src/manual-reading-context';
import {ManualPracticeView} from '../src/manual-practice-view';

const p=await importPackage(await authoredFrettedPackage());
for(const fails of [false,true])test(`a ${fails?'failed':'successful'} pending manual save cannot paint or announce a successor after close`,async()=>{
 const prior=Object.fromEntries(['document','window','cancelAnimationFrame'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 Object.assign(globalThis,{document:new EventTarget(),window:new EventTarget(),cancelAnimationFrame:()=>{}});
 const successor={textContent:'successor ready'};let queries=0,changed=0,writes=0,settle!:(error?:Error)=>void,started!:()=>void;
 const entered=new Promise<void>(resolve=>started=resolve),app={contains:()=>false,removeAttribute:()=>{},querySelector:()=>{queries++;return successor;}} as unknown as HTMLElement;
 try{
  const context=await ManualReadingContext.open(p),view=new ManualPracticeView(app,{context,personal:{} as never,passage:()=>'',back:()=>{},settings:()=>{},changed:()=>changed++,save:async()=>{writes++;started();await new Promise<void>((resolve,reject)=>settle=error=>error?reject(error):resolve());}});
  const pending=view.action('retry-save');await entered;view.close();const beforeQueries=queries;settle(fails?Error('late old-view save failure'):undefined);await pending;
  assert.equal(successor.textContent,'successor ready');assert.equal(queries,beforeQueries);assert.equal(changed,0);assert.equal(writes,1);
  await view.action('retry-save');assert.equal(writes,1,'closed views cannot start another save');
 }finally{for(const [key,descriptor]of Object.entries(prior)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}}
});
