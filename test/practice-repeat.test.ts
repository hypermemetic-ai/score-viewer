import test from 'node:test';
import assert from 'node:assert/strict';
import {planPracticeRepeat,selectPracticeRepeatStart,repeatStartFromCountOrigin} from '../src/practice-repeat';
import {practiceTiming} from '../src/practice-timing';
import {PracticeClock} from '../src/practice-clock';
import {host,practiceAudio} from '../src/host';

const plan=(previousBpm=60,nextBpm=60)=>planPracticeRepeat({previousStartMs:10000,phraseEndMs:18000,previousBpm,nextBpm});
test('two dotted-quarter goal beats retain phrase phase despite save readiness jitter',()=>{
 const p=plan();
 assert.equal(practiceTiming(60).goalBeatMs,1000);
 assert.equal(p.boundaryMs,18000);assert.equal(p.earliestStartMs,20000);
 for(const ready of [18001,18437,19299,20000]){
  assert.deepEqual(selectPracticeRepeatStart(p,ready),{countStartMs:18000,startMs:20000,extraBeats:0,totalGapBeats:2});
 }
 for(const [ready,start,extra]of [[20000.1,21000,1],[20839,21000,1],[21111,22000,2],[27501,28000,8]]){
  const actual=selectPracticeRepeatStart(p,ready);
  assert.equal(actual.startMs,start);assert.equal(actual.extraBeats,extra);assert.equal(actual.totalGapBeats,2+extra);
 }
});
test('acceleration takes effect at the old beat boundary, with new goal-beat gaps',()=>{
 const p=planPracticeRepeat({previousStartMs:10000,phraseEndMs:18125,previousBpm:60,nextBpm:120});
 assert.equal(p.boundaryMs,19000);assert.equal(p.goalBeatMs,500);assert.equal(p.earliestStartMs,20000);
 assert.equal(selectPracticeRepeatStart(p,20001).startMs,20500);
 const exact=planPracticeRepeat({previousStartMs:123.456,phraseEndMs:123.456+12*60000/185.123456789,previousBpm:185.123456789,nextBpm:190.05});
 assert.ok(Math.abs(exact.boundaryMs-exact.phraseEndMs)<1e-8);
 assert.ok(Math.abs(exact.earliestStartMs-exact.boundaryMs-2*60000/190.05)<1e-8);
});
test('invalid musical clocks and off-grid output receipts cannot silently grade a repeat',()=>{
 for(const change of [{previousBpm:0},{nextBpm:501},{phraseEndMs:9999},{previousStartMs:NaN},{phraseEndMs:Infinity}]){
  assert.throws(()=>planPracticeRepeat({previousStartMs:10000,phraseEndMs:18000,previousBpm:60,nextBpm:60,...change}),/Invalid/);
 }
 assert.throws(()=>selectPracticeRepeatStart(plan(),NaN),/Invalid/);
 assert.throws(()=>repeatStartFromCountOrigin(plan(),18437),/beat grid/);
 assert.throws(()=>repeatStartFromCountOrigin(plan(),17000),/beat grid/);
 assert.equal(repeatStartFromCountOrigin(plan(),19000.0008).extraBeats,1);
});
test('native repeat carries an absolute MIDI-domain target and accepts only aligned output origin',async t=>{
 const previous={sample:host.midiClock,begin:practiceAudio.begin,stop:practiceAudio.stop};
 t.after(()=>{host.midiClock=previous.sample;practiceAudio.begin=previous.begin;practiceAudio.stop=previous.stop;});
 const calls:any[][]=[];host.midiClock=async()=>18500000;practiceAudio.stop=async()=>{};
 practiceAudio.begin=async(...args)=>{calls.push(args);return 18000000;};
 const clock=new PracticeClock(true,'output');
 try{
  const result=await clock.beginRepeat(60,7000,plan());
  assert.equal(calls[0][4],20000000);assert.equal(calls[0][3],practiceTiming(60).countStepMs);
  assert.equal(result.startMs,20000);assert.equal(clock.fromMidi(20000000),result.startMs);
  practiceAudio.begin=async()=>18437000;
  await assert.rejects(clock.beginRepeat(60,7000,plan()),/beat grid/);
  assert.throws(()=>clock.fromMidi(20000000),/not started/);
 }finally{await clock.stop();}
});
test('WebAudio joins a partly elapsed count without replaying past clicks or moving the attack',async t=>{
 const previous={audio:Object.getOwnPropertyDescriptor(globalThis,'AudioContext'),window:Object.getOwnPropertyDescriptor(globalThis,'window'),sample:host.midiClock};
 let time=18.5;const starts:number[]=[];let scheduled:()=>void=()=>{};
 class FakeAudio{
  state='running';destination={};get currentTime(){return time;}resume(){return Promise.resolve();}close(){return Promise.resolve();}
  createOscillator(){return {frequency:{value:0},connect(){return this;},start(at:number){starts.push(at);},stop(){},disconnect(){}};}
  createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){return this;},disconnect(){}};}
 }
 Object.defineProperty(globalThis,'AudioContext',{configurable:true,value:FakeAudio});
 Object.defineProperty(globalThis,'window',{configurable:true,value:{setInterval:(callback:()=>void)=>{scheduled=callback;return 1;}}});
 host.midiClock=async()=>time*1000*1000;
 t.after(()=>{host.midiClock=previous.sample;for(const [name,descriptor]of [['AudioContext',previous.audio],['window',previous.window]]as const){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete(globalThis as any)[name];}});
 const clock=new PracticeClock(false);
 try{
  const actual=await clock.beginRepeat(60,7000,plan());
  assert.equal(actual.startMs,20000);assert.equal(actual.countStartMs,18000);
  time=18.6;scheduled();assert.equal(starts.length,1);assert.ok(Math.abs(starts[0]-(18+2/3))<1e-8);assert.ok(starts.every(at=>at>=18.65));
  time=19.95;const delayed=await clock.beginRepeat(60,7000,plan());
  assert.equal(delayed.startMs,21000);assert.equal(delayed.extraBeats,1);assert.equal(clock.fromMidi(21000000),21000);
 }finally{clock.close();}
});
test('cancelled native repeat cannot replace a newer clock origin or stop its owner',async t=>{
 const previous={sample:host.midiClock,begin:practiceAudio.begin,stop:practiceAudio.stop};
 t.after(()=>{host.midiClock=previous.sample;practiceAudio.begin=previous.begin;practiceAudio.stop=previous.stop;});
 let stops=0;const requests:Array<(n:number)=>void>=[];
 host.midiClock=async()=>18500000;practiceAudio.stop=async()=>{stops++;};
 practiceAudio.begin=()=>new Promise(resolve=>requests.push(resolve));
 const clock=new PracticeClock(true);
 const until=async(n:number)=>{for(let i=0;i<100&&requests.length<n;i++)await new Promise<void>(r=>setImmediate(r));assert.equal(requests.length,n);};
 try{
  const old=clock.beginRepeat(60,7000,plan()),rejected=assert.rejects(old,/cancelled/);await until(1);
  const current=clock.beginRepeat(60,7000,plan());await until(2);
  requests[1](19000000);assert.equal((await current).startMs,21000);
  const stopCount=stops;requests[0](18437000);await rejected;
  assert.equal(stops,stopCount);assert.equal(clock.fromMidi(21000000),21000);
 }finally{await clock.stop();}
});

test('Done count-in restart retains musical grid but guarantees both fresh count beats after readiness',()=>{const p=planPracticeRepeat({previousStartMs:1000,phraseEndMs:18000,previousBpm:60,nextBpm:60,fullCountIn:true});for(const ready of [18000,18400,19900,20850]){const start=selectPracticeRepeatStart(p,ready);assert.ok(start.countStartMs>=ready);assert.equal((start.countStartMs-p.boundaryMs)%p.goalBeatMs,0);assert.equal(start.startMs-start.countStartMs,2000);}assert.equal(selectPracticeRepeatStart({...p,fullCountIn:undefined},18400).countStartMs,18000);});
test('actual Tauri audio request serializes the optional full-count flag as a Boolean and retains absent behavior',async t=>{const prior=Object.getOwnPropertyDescriptor(globalThis,'window'),calls:any[]=[];Object.defineProperty(globalThis,'window',{configurable:true,value:{__TAURI_INTERNALS__:{invoke:async(command:string,args:unknown)=>{calls.push({command,args:JSON.parse(JSON.stringify(args))});return 19000000;}}}});t.after(()=>{if(prior)Object.defineProperty(globalThis,'window',prior);else delete(globalThis as any).window;});await practiceAudio.begin('chosen',60,7000,1000/3,20000000);await practiceAudio.begin('chosen',60,7000,1000/3,20000000,undefined,true);assert.equal(calls[0].command,'practice_audio_begin');assert.equal(calls[0].args.fullRepeatCountIn,false);assert.equal(calls[1].args.fullRepeatCountIn,true);assert.equal(typeof calls[1].args.fullRepeatCountIn,'boolean');const {fullRepeatCountIn,...base}=calls[1].args;assert.deepEqual(base,(({fullRepeatCountIn,...rest})=>rest)(calls[0].args));assert.equal(base.repeatStartMicros,20000000);});
