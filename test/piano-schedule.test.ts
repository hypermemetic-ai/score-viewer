import test from 'node:test';import assert from 'node:assert/strict';
import {buildPerformanceSchedule} from '../src/score-performance';
import {CLICK,NOTE_OFF,NOTE_ON,performanceEvents,type PianoScheduleHost,type ScheduledEvent} from '../src/piano-schedule';
import {NativeTempoAudition,pianoStopped} from '../src/native-tempo-audition';
import type {AuditionTimers} from '../src/tempo-audition';

const quarter={numerator:1,denominator:4};
const note=(id:string,startTick:number,durationTicks:number,midi:number,extra:Record<string,unknown>={})=>({id,eventKind:'pitched',pitch:{octave:Math.floor((midi-12)/12),pitchClass:(midi-12)%12},startTick,durationTicks,...extra});
const base=(over:Record<string,unknown>={})=>({ticksPerBeat:48,totalTicks:216,timeSignatures:[{tick:0,numerator:2,denominator:4}],dynamics:[],pedals:[],sourceBarTicks:[0,24,120,216],notes:[] as unknown[],...over}) as Parameters<typeof buildPerformanceSchedule>[0];
const flush=async()=>{for(let i=0;i<20;i++)await new Promise(r=>setImmediate(r));};

test('one tick-ordered stream: clicks, lifts before attacks, pedal-held keys lift once',()=>{
 const s=buildPerformanceSchedule(base({notes:[note('a',0,24,67),note('b',24,24,67),note('c',24,24,60),note('d',72,24,60)],
  pedals:[{tick:72,type:'sustain-down'},{tick:144,type:'sustain-up'}]}),quarter);
 const events=performanceEvents(s).map(e=>[e.tick,e.kind,e.key]);
 assert.deepEqual(events.slice(0,4),[[-168,CLICK,0],[-120,CLICK,0],[-72,CLICK,0],[-24,CLICK,0]]);
 assert.deepEqual(performanceEvents(s).slice(0,4).map(e=>e.value),[1,0,1,0]);
 // G is lifted at 24 and struck again at the same instant.
 assert.deepEqual(events.slice(4),[[0,NOTE_ON,67],[24,NOTE_OFF,67],[24,NOTE_ON,60],[24,NOTE_ON,67],[48,NOTE_OFF,60],[48,NOTE_OFF,67],[72,NOTE_ON,60],[144,NOTE_OFF,60]]);
 // Struck again while the pedal still holds it: one retrigger, one lift at the later release.
 const held=buildPerformanceSchedule(base({notes:[note('a',0,24,60),note('b',48,24,60)],pedals:[{tick:0,type:'sustain-down'},{tick:120,type:'sustain-up'}]}),quarter);
 assert.deepEqual(performanceEvents(held).filter(e=>e.kind!==CLICK).map(e=>[e.tick,e.kind]),[[0,NOTE_ON],[48,NOTE_ON],[120,NOTE_OFF]]);
});

/** A native schedule double: its clock runs `offset` µs ahead of local time. */
function fakeNative(){
 const state={nowMs:1000,offset:7_000_000,lead:40_000,epoch:0,inflight:0,maxInflight:0,capacity:Infinity,tooSoon:0,off:false,submitError:''};
 const calls:{call:'open'|'replace'|'submit';keepUntil?:number|null;epoch?:number;events:ScheduledEvent[];clock:number}[]=[];
 const clock=()=>Math.round(state.nowMs*1000+state.offset);
 const receipt=(accepted:number)=>({epoch:state.epoch,accepted,clock:clock(),leadMicros:state.lead,late:0});
 const guard=async<T>(fn:()=>T)=>{state.inflight++;state.maxInflight=Math.max(state.maxInflight,state.inflight);await new Promise(r=>setImmediate(r));state.inflight--;if(state.off)throw Error('Piano sound is off.');return fn();};
 const host:PianoScheduleHost={
  now:()=>state.nowMs,
  open:()=>guard(()=>{calls.push({call:'open',events:[],clock:clock()});return receipt(0);}),
  replace:(keepUntil,events)=>guard(()=>{
   if(state.tooSoon>0){state.tooSoon--;throw Error('Piano schedule starts too soon');}
   const floor=keepUntil??clock()+state.lead;
   assert.ok(events.every((e,i)=>e[0]>=floor&&(i===0||e[0]>=events[i-1][0])),'events start at the cut, in order');
   state.epoch++;calls.push({call:'replace',keepUntil,events,clock:clock()});return receipt(Math.min(events.length,state.capacity));
  }),
  submit:(epoch,events)=>guard(()=>{
   if(state.submitError)throw Error(state.submitError);
   if(epoch!==state.epoch)throw Error('Piano schedule was replaced');
   calls.push({call:'submit',epoch,events,clock:clock()});return receipt(Math.min(events.length,state.capacity));
  })
 };
 let timer:(()=>void)|undefined;
 const timers:AuditionTimers={set:fn=>{timer=fn;return 1;},clear:()=>{timer=undefined;}};
 const advance=async(ms:number)=>{const end=state.nowMs+ms;while(state.nowMs<end){state.nowMs=Math.min(end,state.nowMs+100);timer?.();await flush();}};
 const sent=()=>calls.flatMap(c=>c.events.map(e=>({...c,event:e})));
 return {state,calls,host,timers,advance,sent,clock};
}
const notes=()=>buildPerformanceSchedule(base({notes:[note('a',0,24,69),note('b',24,48,72),note('c',120,48,76),note('d',168,48,79)]}),quarter);

test('the piano gets the count-in and the notes on one native clock, in bounded chunks',async()=>{
 const native=fakeNative(),schedule=notes(),a=new NativeTempoAudition(schedule,60,native.host,native.timers);
 await a.open();a.play();await flush();
 const start=native.calls.find(c=>c.call==='replace')!;
 assert.equal(start.keepUntil,null,'starting releases whatever the stream had sounding');
 const cut=start.events[0][0],perTick=1e6/48;
 // The first click lands one lead plus the call allowance after the native now.
 assert.ok(cut>=start.clock+40_000&&cut<=start.clock+40_000+31_000,`${cut-start.clock}`);
 // The first chunk reaches 1.5 s; the rest follows as the music approaches.
 assert.ok(start.events.every(e=>e[0]<cut+1_500_000));
 await native.advance(9000);
 const all=native.sent().map(s=>s.event);
 assert.deepEqual(all.filter(e=>e[1]===CLICK).map(e=>[e[0]-cut,e[3]]),[[0,1],[1e6,0],[2e6,1],[3e6,0]]);
 const attacks=all.filter(e=>e[1]===NOTE_ON).map(e=>[e[2],Math.round((e[0]-cut)/perTick)]);
 assert.deepEqual(attacks,[[69,168],[72,192],[76,288],[79,336]],'each attack at its tick after the 168-tick count-in');
 assert.equal(all.filter(e=>e[1]===NOTE_OFF).length,4);
 assert.ok(native.calls.filter(c=>c.call==='submit').every(c=>c.epoch===native.state.epoch));
 assert.equal(native.state.maxInflight,1,'native calls never overlap');
 assert.equal(a.phase,'finished');
 assert.deepEqual(a.log.map(l=>l.sound),['accent','click','accent','click',69,72,76,79]);
});

test('a tempo change keeps what sounds, retimes the rest and keeps its place',async()=>{
 const native=fakeNative(),schedule=notes(),a=new NativeTempoAudition(schedule,60,native.host,native.timers);
 await a.open();a.play();await flush();
 const cut=native.calls.find(c=>c.call==='replace')!.events[0][0],perTick=1e6/48;
 // Into the B (tick 24–72): play to tick ~40, then double the tempo.
 await native.advance((cut-native.clock())/1000+(168+40)*perTick/1000);
 const before=a.position().tick;
 a.setBpm(120);await flush();
 const retime=native.calls.filter(c=>c.call==='replace')[1];
 assert.ok(retime.keepUntil!>=retime.clock+40_000,'the change starts beyond the queued output');
 const fromTick=(retime.keepUntil!-cut)/perTick-168;
 assert.ok(fromTick>before&&fromTick<before+4,`${before} → ${fromTick}`);
 const fast=perTick/2,events=retime.events.map(e=>[e[1],e[2],Math.round((e[0]-retime.keepUntil!)/fast+fromTick)]);
 // B's lift comes at its own tick on the new tempo, with no new attack for it.
 assert.deepEqual(events.slice(0,3),[[NOTE_OFF,72,72],[NOTE_ON,76,120],[NOTE_OFF,76,168]]);
 assert.ok(fromTick>24,'A had already lifted');
 assert.ok(Math.abs(a.position().tick-before)<4,'the place is kept');
 await native.advance(3000);
 assert.equal(a.phase,'finished');
 assert.equal(native.state.maxInflight,1);
});

test('pause releases, resume continues without a count-in, backpressure resubmits',async()=>{
 const native=fakeNative(),schedule=notes(),a=new NativeTempoAudition(schedule,60,native.host,native.timers);
 native.state.capacity=2;
 await a.open();a.play();await flush();
 await native.advance(4300);
 a.pause();await flush();
 const release=native.calls.at(-1)!;
 assert.deepEqual([release.call,release.keepUntil,release.events.length],['replace',null,0]);
 assert.equal(a.phase,'paused');
 const paused=a.position().tick;
 a.resume();await flush();
 const resumed=native.calls.at(-1)!;
 assert.ok(resumed.events.every(e=>e[1]!==CLICK),'no second count-in');
 assert.ok(Math.abs(a.position().tick-paused)<1);
 await native.advance(9000);
 const attacks=native.sent().map(s=>s.event).filter(e=>e[1]===NOTE_ON).map(e=>e[2]);
 assert.equal(new Set(attacks).size,4,'every attack arrives although the queue took two at a time');
 assert.equal(a.phase,'finished');
});

test('a late start retries once with a fresh lead; a stopped piano reports and stops',async()=>{
 const native=fakeNative(),a=new NativeTempoAudition(notes(),60,native.host,native.timers);
 await a.open();native.state.tooSoon=1;a.play();await flush();
 assert.equal(native.calls.filter(c=>c.call==='replace').length,1);
 assert.equal(native.calls.filter(c=>c.call==='open').length,2);
 assert.equal(a.failure,undefined);
 native.state.off=true;await native.advance(1500);
 assert.match(a.failure??'',/The piano stopped: Piano sound is off/);
 assert.equal(a.phase,'idle');
 const off=fakeNative();off.state.off=true;
 await assert.rejects(new NativeTempoAudition(notes(),60,off.host,off.timers).open(),/Piano sound is off/);
});

test('when the piano loses its place the preview says so plainly and silences what it scheduled',async()=>{
 const native=fakeNative(),a=new NativeTempoAudition(notes(),60,native.host,native.timers);
 await a.open();a.play();await flush();
 native.state.submitError='Piano schedule is busy';await native.advance(1500);
 assert.equal(a.failure,'The piano lost its place');
 assert.equal(a.phase,'idle');
 const last=native.calls.at(-1)!;
 assert.deepEqual([last.call,last.keepUntil,last.events.length],['replace',null,0],'the scheduled notes are released');
 // A release that itself fails is not reported over the first failure.
 const off=fakeNative(),b=new NativeTempoAudition(notes(),60,off.host,off.timers);
 await b.open();b.play();await flush();
 off.state.off=true;await off.advance(1500);
 assert.match(b.failure??'',/^The piano stopped: Piano sound is off$/);
 for(const message of ['Piano schedule was replaced','Piano schedule is busy','Piano events must be in time order and ahead of the output','Piano schedule starts too soon'])
  assert.equal(pianoStopped(Error(message)),'The piano lost its place',message);
});

test('later score tempos stretch the native clock as they do the built-in voice',async()=>{
 const native=fakeNative(),schedule={...notes(),tempoChanges:[{tick:120,factor:2}]},a=new NativeTempoAudition(schedule,60,native.host,native.timers);
 await a.open();a.play();await flush();
 const cut=native.calls.find(c=>c.call==='replace')!.events[0][0],perTick=1e6/48;
 await native.advance(9000);
 const attacks=native.sent().map(s=>s.event).filter(e=>e[1]===NOTE_ON).map(e=>[e[2],Math.round((e[0]-cut)/perTick)]);
 // Twice as fast from tick 120: E at 168+120, G 48 ticks later in 24 ticks' time.
 assert.deepEqual(attacks,[[69,168],[72,192],[76,288],[79,312]]);
 assert.equal(a.position().measures,schedule.writtenBars);assert.equal(a.position().pass,1);
});
