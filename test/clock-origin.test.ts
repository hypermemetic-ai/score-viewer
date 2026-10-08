import test from 'node:test';
import assert from 'node:assert/strict';
import {ClockOrigin} from '../src/clock-origin';
import {PracticeClock} from '../src/practice-clock';
import {host,practiceAudio} from '../src/host';

test('MIDI and local audio clocks with unrelated epochs measure the same note offset',()=>{
 const origin=new ClockOrigin(12000,812010000,12020);
 assert.equal(origin.uncertaintyMs,10);
 const due=12500;
 const midi=origin.toNative(due)*1000;
 assert.equal(origin.fromMidi(midi),due);
 assert.equal(origin.fromMidi(midi+180000)-due,180);
});
test('midpoint sampling avoids treating IPC elapsed time as note lateness',()=>{
 const origin=new ClockOrigin(200,950300000,400);
 assert.equal(origin.fromMidi(950300000),300);
 assert.equal(origin.fromMidi(950550000),550);
 assert.equal(origin.uncertaintyMs,100);
});
test('clock resampling after resume replaces the previous offset',()=>{
 const before=new ClockOrigin(1000,10000000,1000);
 const resumed=new ClockOrigin(1000,20000000,1000);
 assert.equal(before.fromMidi(10500000),1500);
 assert.equal(resumed.fromMidi(20500000),1500);
});
test('invalid or backwards samples cannot produce a usable grading timeline',()=>{
 for(const a of [[200,1000,100],[0,-1,0],[NaN,0,0],[0,Infinity,0]]){
  assert.throws(()=>new ClockOrigin(a[0],a[1],a[2]));
 }
 assert.throws(()=>new ClockOrigin(0,0,0).fromMidi(NaN));
});
test('Web Audio begin maps native MIDI and reanchors on a subsequent attempt',async()=>{
 const audioDescriptor=Object.getOwnPropertyDescriptor(globalThis,'AudioContext');
 const windowDescriptor=Object.getOwnPropertyDescriptor(globalThis,'window');
 const priorMidiClock=host.midiClock;
 let time=10, native=80000000;
 class FakeAudio {
  state='running';get currentTime(){return time;}
  resume(){return Promise.resolve();}close(){return Promise.resolve();}
 }
 Object.defineProperty(globalThis,'AudioContext',{configurable:true,value:FakeAudio});
 Object.defineProperty(globalThis,'window',{configurable:true,value:{setInterval:()=>1}});
 host.midiClock=async()=>{time+=.02;return native;};
 const clock=new PracticeClock(false);
 try{
  assert.throws(()=>clock.fromMidi(native),/not started/);
  const start=await clock.begin(180,1000,true);
  assert.ok(Math.abs(start-10170)<1e-6);
  assert.ok(Math.abs(clock.fromMidi(80160000)-start)<1e-6);
  assert.ok(Math.abs(clock.now()-10020)<1e-6);
  await clock.stop();
  time=12;native=95000000;
  const restarted=await clock.begin(180,1000);
  assert.ok(Math.abs(clock.fromMidi(95160000)-restarted)<1e-6);
  clock.close();assert.throws(()=>clock.fromMidi(native),/not started/);
 }finally{
  clock.close();host.midiClock=priorMidiClock;
  if(audioDescriptor)Object.defineProperty(globalThis,'AudioContext',audioDescriptor);else delete (globalThis as any).AudioContext;
  if(windowDescriptor)Object.defineProperty(globalThis,'window',windowDescriptor);else delete (globalThis as any).window;
 }
});
test('native metronome onset and MIDI use native milliseconds without a second offset',async()=>{
 const priorMidiClock=host.midiClock,priorBegin=practiceAudio.begin,priorStop=practiceAudio.stop;
 host.midiClock=async()=>10000000;practiceAudio.begin=async()=>10200000;practiceAudio.stop=async()=>{};
 const clock=new PracticeClock(true,'test-output');
 try{
  const start=await clock.begin(180,1000);
  assert.equal(start,10200);assert.equal(clock.fromMidi(10200000),start);
  assert.equal(clock.fromMidi(10250000)-start,50);
 }finally{clock.close();await clock.stop();host.midiClock=priorMidiClock;practiceAudio.begin=priorBegin;practiceAudio.stop=priorStop;}
});
test('closing during clock sampling cannot open a stale native metronome or reinstate its mapper',async()=>{
 const priorMidiClock=host.midiClock,priorBegin=practiceAudio.begin,priorStop=practiceAudio.stop;
 let resolveClock!:(n:number)=>void,called=false;
 const sample=new Promise<number>(resolve=>{resolveClock=resolve;});
 host.midiClock=()=>sample;practiceAudio.begin=async()=>{called=true;return 10200000;};practiceAudio.stop=async()=>{};
 const clock=new PracticeClock(true);
 try{
  const starting=clock.begin(180,1000);
  await Promise.resolve();await Promise.resolve();
  clock.close();resolveClock(10000000);
  await assert.rejects(starting,/cancelled/);
  assert.equal(called,false);assert.throws(()=>clock.fromMidi(10000000),/not started/);
 }finally{clock.close();await clock.stop();host.midiClock=priorMidiClock;practiceAudio.begin=priorBegin;practiceAudio.stop=priorStop;}
});
