import test from 'node:test';
import assert from 'node:assert/strict';
import {PracticeClock} from '../src/practice-clock';
import {host} from '../src/host';

function browser(t:any){
 const previous={audio:Object.getOwnPropertyDescriptor(globalThis,'AudioContext'),window:Object.getOwnPropertyDescriptor(globalThis,'window'),midiClock:host.midiClock};
 const contexts:FakeAudio[]=[],scheduled:number[]=[],stopped:number[]=[];let interval=0,frame=()=>{};
 class FakeAudio{
  state='running';currentTime=0;destination={};closeCalls=0;resumeCalls=0;
  resumeResult=Promise.resolve();closeResult=Promise.resolve();
  constructor(){contexts.push(this);}
  resume(){this.resumeCalls++;return this.resumeResult;}
  close(){this.closeCalls++;if(this.state==='closed')return Promise.reject(Error('Cannot close a closed AudioContext.'));this.state='closed';return this.closeResult;}
  createOscillator(){return{frequency:{value:0},connect(){return this;},start(at:number){scheduled.push(at);},stop(){stopped.push(1);},disconnect(){}};}
  createGain(){return{gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){return this;},disconnect(){}};}
 }
 Object.defineProperty(globalThis,'AudioContext',{configurable:true,value:FakeAudio});
 Object.defineProperty(globalThis,'window',{configurable:true,value:{setInterval:(fn:()=>void)=>{frame=fn;return ++interval;}}});
 host.midiClock=async()=>0;
 t.after(()=>{host.midiClock=previous.midiClock;for(const [key,value]of [['AudioContext',previous.audio],['window',previous.window]]as const){if(value)Object.defineProperty(globalThis,key,value);else delete(globalThis as any)[key];}});
 return{contexts,scheduled,stopped,advance:()=>{contexts.at(-1)!.currentTime=.02;frame();}};
}

test('duplicate close detaches once, shares pending completion and stops scheduled audio',async t=>{
 const f=browser(t),clock=new PracticeClock();await clock.begin(180,1000);f.advance();assert.ok(f.scheduled.length>0);
 const context=f.contexts[0];let finish!:()=>void;context.closeResult=new Promise<void>(r=>finish=r);
 const first=clock.close(),second=clock.close();assert.equal(first,second);assert.equal(context.closeCalls,1);assert.ok(f.stopped.length>0);
 assert.equal((clock as any).audio,undefined);assert.equal((clock as any).interval,undefined);assert.equal((clock as any).nodes.length,0);
 finish();await first;await clock.close();assert.equal(context.closeCalls,1);
});

test('an externally closed context is detached without another close request',async t=>{
 const f=browser(t),clock=new PracticeClock();await clock.unlock();f.contexts[0].state='closed';await clock.close();await clock.close();assert.equal(f.contexts[0].closeCalls,0);assert.equal((clock as any).audio,undefined);
});

test('late resume belongs to its detached context and cannot unlock a replacement',async t=>{
 const f=browser(t),clock=new PracticeClock();await clock.unlock();let resume!:()=>void;f.contexts[0].resumeResult=new Promise<void>(r=>resume=r);
 const pending=clock.unlock(),rejected=assert.rejects(pending,/Practice start was cancelled/);await clock.close();await clock.unlock();const replacement=f.contexts[1];
 resume();await rejected;assert.equal((clock as any).audio,replacement);assert.equal(replacement.state,'running');assert.equal(replacement.closeCalls,0);await clock.close();assert.equal(replacement.closeCalls,1);
});

test('close during asynchronous begin cancels the old start without scheduling into a replacement',async t=>{
 const f=browser(t),clock=new PracticeClock();await clock.unlock();let resume!:()=>void;f.contexts[0].resumeResult=new Promise<void>(r=>resume=r);
 const starting=clock.begin(180,1000),rejected=assert.rejects(starting,/Practice start was cancelled/);await clock.close();await clock.unlock();resume();await rejected;
 assert.deepEqual(f.scheduled,[]);assert.equal(f.contexts[1].state,'running');assert.equal(f.contexts[1].closeCalls,0);await clock.close();
});

test('a real close failure remains observable and repeated close does not retry the detached context',async t=>{
 const f=browser(t),messages:string[]=[],clock=new PracticeClock(false,'',message=>messages.push(message));await clock.unlock();const failure=Error('Audio backend close failed');f.contexts[0].closeResult=Promise.reject(failure);
 const closing=clock.close();await assert.rejects(closing,e=>e===failure);assert.equal(clock.close(),closing);await assert.rejects(clock.close(),e=>e===failure);assert.equal(f.contexts[0].closeCalls,1);assert.deepEqual(messages,['Audio could not close: Audio backend close failed']);
});

test('ignored close failure reports once through the current error handler without an unhandled rejection',async t=>{
 const f=browser(t),messages:string[]=[],clock=new PracticeClock(false,'',message=>messages.push(message));await clock.unlock();let reject!:(error:Error)=>void;f.contexts[0].closeResult=new Promise<void>((_,r)=>reject=r);
 clock.close();clock.close();reject(Error('Backend unavailable'));await new Promise<void>(r=>setImmediate(r));assert.deepEqual(messages,['Audio could not close: Backend unavailable']);assert.equal(f.contexts[0].closeCalls,1);
});

test('a stale close failure cannot report an output error against a replacement context',async t=>{
 const f=browser(t),messages:string[]=[],clock=new PracticeClock(false,'',message=>messages.push(message));await clock.unlock();let reject!:(error:Error)=>void;f.contexts[0].closeResult=new Promise<void>((_,r)=>reject=r);
 const closed=clock.close();await clock.unlock();reject(Error('Old backend close failed'));await assert.rejects(closed,/Old backend close failed/);assert.deepEqual(messages,[]);assert.equal(f.contexts[1].closeCalls,0);await clock.close();
});
