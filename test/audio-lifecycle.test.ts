import {testReference} from './support/reference-score';
import test from 'node:test';
import assert from 'node:assert/strict';
import {PracticeClock} from '../src/practice-clock';
import {PracticeView,practiceAudioTestAction} from '../src/practice-view';
import {PerformanceSession,performanceAudioErrorHandler} from '../src/performance';
import {host,practiceAudio} from '../src/host';
import {scorePulseGrid,scoreTickMs} from '../src/score-clock';
import {practiceCountInGrid} from '../src/practice-attempt-grid';
import {practiceTiming} from '../src/practice-timing';

const until=async(predicate:()=>boolean)=>{for(let i=0;i<100&&!predicate();i++)await new Promise<void>(done=>setImmediate(done));assert.ok(predicate(),'operation did not reach its controlled boundary');};
function nativeHarness(t:any){
 const previous={midiClock:host.midiClock,begin:practiceAudio.begin,stop:practiceAudio.stop,onError:practiceAudio.onError};
 const starts:Array<{duration:number;resolve:(n:number)=>void;reject:(error:Error)=>void}>=[],listeners:Array<{handler:(message:string)=>void;active:boolean}>=[];
 let stops=0;
 host.midiClock=async()=>10000000;
 practiceAudio.begin=(_device,_bpm,duration)=>new Promise<number>((resolve,reject)=>starts.push({duration,resolve,reject}));
 practiceAudio.stop=async()=>{stops++;};
 practiceAudio.onError=async handler=>{const listener={handler,active:true};listeners.push(listener);return()=>{listener.active=false;};};
 t.after(()=>{host.midiClock=previous.midiClock;practiceAudio.begin=previous.begin;practiceAudio.stop=previous.stop;practiceAudio.onError=previous.onError;});
 return{starts,listeners,get stops(){return stops;}};
}
function practiceView(){
 // Assume successful visual admission and exercise the real async action/clock
 // logic. Admission failure is covered by practice-progression-lifecycle.test.ts.
 const view=Object.create(PracticeView.prototype) as any,ready:number[]=[],messages:string[]=[];
 const plan={referencePerformanceTempo:testReference,ticksPerBeat:48,timeSignatures:[{tick:0,numerator:6,denominator:8}],barTicks:[0,144,288,432,576]};
 // The source has no outgoing hold; its actual completion is the display end.
 // Ready owns audio duration through completionTick, including held tails.
 const session={chunk:{start:0,end:576},completionTick:576,sourcePulseGrid:practiceCountInGrid(scorePulseGrid(plan,plan.barTicks)),startTick:0,tickMs:1,phase:'ready',ready(start:number){ready.push(start);this.phase='countin';},pause(){this.phase='paused';}};
 Object.assign(view,{mode:'timed',previousMode:'timed',readingPaused:true,feedback:'',manual:{cancel(){}},contacts:{clear(){}},plan,session,state:{working:180,countInBars:2},options:{connected:()=>true},audioOutputs:{supported:true},startGeneration:0,disposed:false,preview:{clear(){}},app:{querySelector:()=>null}});
 view.paint=()=>{};view.paintScore=()=>{};view.paintControls=()=>{};view.paintVisibility=()=>{};view.status=(message:string)=>messages.push(message);
 return{view,session,ready,messages,duration:576*scoreTickMs(plan,180)+practiceTiming(180,session.sourcePulseGrid).countInMs};
}

test('replacement rejection from an older Ready request cannot stop the newer start',async t=>{
 const native=nativeHarness(t),f=practiceView();
 const old=f.view.action('ready');await until(()=>native.starts.length===1);
 assert.equal(native.starts[0].duration,f.duration);
 const current=f.view.action('ready');await until(()=>native.starts.length===2);
 assert.equal(native.starts[1].duration,f.duration);
 const stops=native.stops;
 native.starts[0].reject(Error('Audio start cancelled'));await old;
 assert.equal(native.stops,stops);assert.ok(!f.messages.includes('Audio start cancelled'));
 native.starts[1].resolve(10200000);await current;
 assert.deepEqual(f.ready,[10200]);assert.equal(f.session.phase,'countin');
 await f.view.clock.stop();
});
test('a late successful old start cannot clean up the current clock or replace its mapper',async t=>{
 const native=nativeHarness(t),f=practiceView();
 const old=f.view.action('ready');await until(()=>native.starts.length===1);
 const current=f.view.action('ready');await until(()=>native.starts.length===2);
 native.starts[1].resolve(10300000);await current;
 const stops=native.stops;
 native.starts[0].resolve(10200000);await old;
 assert.deepEqual(f.ready,[10300]);assert.equal(native.stops,stops);assert.equal(f.view.clock.fromMidi(10300000),10300);
 await f.view.clock.stop();
});
test('old captured error callbacks and old clock close cannot stop a replacement clock',async t=>{
 const native=nativeHarness(t),errors:string[]=[],old=new PracticeClock(true,'old',message=>errors.push(message)),current=new PracticeClock(true,'new',message=>errors.push(message));
 const first=old.begin(180,1000);await until(()=>native.starts.length===1);native.starts[0].resolve(10200000);await first;
 const next=current.begin(180,1000);assert.equal(native.listeners[0].active,false);
 await until(()=>native.starts.length===2);native.starts[1].resolve(10300000);await next;
 const stops=native.stops;
 native.listeners[0].handler('old queued error');old.close();await old.stop();
 assert.deepEqual(errors,[]);assert.equal(native.stops,stops);assert.equal(current.fromMidi(10300000),10300);
 native.listeners[1].handler('current output disconnected');native.listeners[1].handler('duplicate');assert.deepEqual(errors,['current output disconnected']);
 await current.stop();assert.equal(native.listeners[1].active,false);
});
test('new subscriptions wait for native stop and cancelled listener registration is removed',async t=>{
 const native=nativeHarness(t);let stopped!:()=>void;
 practiceAudio.stop=()=>new Promise<void>(done=>{stopped=done;});
 const clock=new PracticeClock(true),starting=clock.begin(180,1000);
 await until(()=>!!stopped);assert.equal(native.listeners.length,0);assert.equal(native.starts.length,0);
 stopped();await until(()=>native.starts.length===1);native.starts[0].resolve(10200000);await starting;
 practiceAudio.stop=async()=>{};await clock.stop();
 let releaseListener!:(unlisten:()=>void)=>void,unregistered=false;
 practiceAudio.onError=()=>new Promise(resolve=>{releaseListener=resolve;});
 const pending=clock.begin(180,1000),rejected=assert.rejects(pending,/cancelled/);
 await until(()=>!!releaseListener);await clock.stop();releaseListener(()=>{unregistered=true;});await rejected;
 assert.ok(unregistered);assert.equal(native.starts.length,1);
});
test('an error before native begin resolves pauses practice and cannot announce readiness',async t=>{
 const native=nativeHarness(t),f=practiceView();
 const pending=f.view.action('ready');await until(()=>native.starts.length===1);
 assert.equal(native.starts[0].duration,f.duration);
 native.listeners[0].handler('Selected output disconnected');
 native.starts[0].reject(Error('Selected output disconnected'));await pending;
 assert.equal(f.session.phase,'paused');assert.deepEqual(f.ready,[]);assert.equal(f.view.audioError,'Selected output disconnected');
 assert.ok(f.messages.includes('Selected output disconnected'));assert.ok(!f.messages.includes('Practice start was cancelled'));
 await f.view.clock.stop();
});
test('Performance output failure stops grading and reports once for its own attempt',async t=>{
 const native=nativeHarness(t),messages:string[]=[],plan={revision:'test',events:[],totalTicks:24,ticksPerBeat:24,referencePerformanceTempo:testReference,grid:{pulsesPerBeat:3,scoreOffsetPulses:6,barStartPulses:[0,6]}};
 let generation=1,session:PerformanceSession|undefined;
 const clock=new PracticeClock(true,'',performanceAudioErrorHandler(1,()=>generation,()=>{generation++;session?.pause();clock.close();},message=>messages.push(message)));
 const pending=clock.begin(180,1000);await until(()=>native.starts.length===1);native.starts[0].resolve(10200000);
 session=new PerformanceSession(plan,180,await pending);
 native.listeners[0].handler('Performance output disconnected');native.listeners[0].handler('duplicate');
 session.update(session.startMs+100000);assert.equal(session.phase,'paused');assert.equal(session.result(),undefined);assert.deepEqual(messages,['Performance output disconnected']);
 const old=performanceAudioErrorHandler(1,()=>generation,()=>{throw Error('old handler stopped a new performance');},message=>messages.push(message));old('old queued error');assert.deepEqual(messages,['Performance output disconnected']);
 await clock.stop();
});
test('Performance output failure before startup resolves cannot create a grading session',async t=>{
 const native=nativeHarness(t),messages:string[]=[];
 let generation=1,stopped=0,session:PerformanceSession|undefined;
 const clock=new PracticeClock(true,'',performanceAudioErrorHandler(1,()=>generation,()=>{generation++;stopped++;clock.close();},message=>messages.push(message)));
 const pending=clock.begin(180,1000).then(start=>{session=new PerformanceSession({revision:'test',events:[],totalTicks:24,ticksPerBeat:24,referencePerformanceTempo:testReference,grid:{pulsesPerBeat:3,scoreOffsetPulses:6,barStartPulses:[0,6]}},180,start);});
 const cancelled=assert.rejects(pending,/cancelled/);
 await until(()=>native.starts.length===1);
 native.listeners[0].handler('Selected Performance output disconnected');
 native.starts[0].resolve(10200000);await cancelled;
 assert.equal(session,undefined);assert.equal(stopped,1);assert.deepEqual(messages,['Selected Performance output disconnected']);
 await clock.stop();
});
test('Test click keeps its device error when cancelling pending startup',async t=>{
 const native=nativeHarness(t),messages:string[]=[],testOutput=practiceAudioTestAction(()=>true,()=>'',message=>messages.push(message));
 const pending=testOutput();await until(()=>native.starts.length===1);
 native.listeners[0].handler('Selected test output disconnected');native.starts[0].resolve(10200000);await pending;
 assert.deepEqual(messages,['Starting test…','Selected test output disconnected']);
 await new PracticeClock(true).stop();
});
test('a late older Test click result cannot replace the latest attempt status',async t=>{
 const native=nativeHarness(t),messages:string[]=[],testOutput=practiceAudioTestAction(()=>true,()=>'',message=>messages.push(message));
 const old=testOutput();await until(()=>native.starts.length===1);
 const current=testOutput();await until(()=>native.starts.length===2);
 native.starts[1].resolve(10300000);await current;const currentStatus=messages.at(-1),stops=native.stops;
 native.listeners[0].handler('old test device failure');native.starts[0].reject(Error('Audio start cancelled'));await old;
 assert.equal(messages.at(-1),currentStatus);assert.match(currentStatus!,/Click sent/);assert.equal(native.stops,stops);
 // Cancel the test's owned clock through replacement and drain native stop.
 const replacement=new PracticeClock(true),pending=replacement.begin(180,1000);await until(()=>native.starts.length===3);native.starts[2].resolve(10400000);await pending;await replacement.stop();
});
