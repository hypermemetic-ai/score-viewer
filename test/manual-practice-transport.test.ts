import test from 'node:test';
import assert from 'node:assert/strict';
import {ManualPracticeTransport,type ManualClock} from '../src/manual-practice-transport';
import {ManualPracticeSession} from '../src/manual-practice-session';
import {initialPractice} from '../src/practice';
import {planManualPractice} from '../src/manual-practice-plan';
import {countBeatAt,practiceTiming} from '../src/practice-timing';
import {planPracticeRepeat,type PracticeRepeatPlan} from '../src/practice-repeat';
import type {PreparedPracticeRepeat} from '../src/practice-clock';
import {authoredManualPackage} from './support/manual-practice-fixture';

const plan=await planManualPractice(await authoredManualPackage(),'fixed-four-v1');
function fixture(){
 const state=initialPractice(plan);state.working=100;const s=new ManualPracticeSession(plan,plan.chunks[0],state),calls:string[]=[],clock={time:1000};
 let nextId=0,armMode:'ready'|'refused'|'pending'='ready',resolveArm:((value:PreparedPracticeRepeat|undefined)=>void)|undefined;
 const api:ManualClock={now:()=>clock.time,begin:async()=>{calls.push('begin');return 1000;},
  armRepeat:async(rate,_duration,p)=>{calls.push('arm');const value={armId:++nextId,countStartMs:p.boundaryMs,startMs:p.earliestStartMs,nextBpm:rate};
   if(armMode==='refused')return undefined;if(armMode==='pending')return new Promise(resolve=>{resolveArm=resolve;});return value;},
  adoptRepeat:r=>{calls.push('adopt');clock.time=r.countStartMs;return {countStartMs:r.countStartMs,startMs:r.startMs,extraBeats:0,totalGapBeats:4};},
  beginRepeat:async(_b,_d,p)=>{calls.push('beginRepeat');clock.time=p.boundaryMs+p.repeatBarMs;return {countStartMs:clock.time,startMs:clock.time+p.countInMs,extraBeats:4,totalGapBeats:8};},
  cancelRepeat:async()=>undefined,stop:async()=>{calls.push('stop');},close:()=>{calls.push('close');}};
 const errors:string[]=[],changes:string[]=[],transport=new ManualPracticeTransport(s,api,()=>changes.push(s.phase),m=>errors.push(m));
 return {s,clock,calls,transport,errors,changes,setMode:(m:typeof armMode)=>{armMode=m;},resolve:()=>resolveArm?.(undefined)};
}
const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
test('manual repeat adopts the full source-bar cue without a second audio restart or measured evidence',async()=>{
 const f=fixture();await f.transport.start();await settle();const end=f.s.startMs+f.s.durationMs;
 f.s.windows.turn(1);f.clock.time=end;f.transport.update();await settle();
 assert.deepEqual(f.calls.slice(0,4),['begin','arm','adopt','arm']);assert.equal(f.s.phase,'countin');
 assert.equal(f.s.startMs,end+practiceTiming(100,f.s.pulseGrid).countInMs);assert.deepEqual(f.s.state.best,{});
 f.transport.update();assert.equal(f.s.windows.index,0);assert.equal(countBeatAt(0,100,f.s.pulseGrid),'1');
 assert.deepEqual(f.errors,[]);f.transport.close();assert.equal(f.calls.at(-1),'close');
});
test('a stale start after close has no audio, rate, phase or notification side effects',async()=>{
 const f=fixture();f.transport.close();const calls=[...f.calls],changes=[...f.changes],state=structuredClone(f.s.state);
 await f.transport.start();f.transport.prepare();f.transport.update();f.transport.pause();
 assert.deepEqual(f.calls,calls);assert.deepEqual(f.changes,changes);assert.deepEqual(f.s.state,state);
 assert.equal(f.s.phase,'paused');assert.deepEqual(f.errors,[]);
});
test('closing while initial begin or repeat preparation is pending fences every continuation',async()=>{
 const f=fixture();let resolveBegin!:(origin:number)=>void;
 f.transport.clock.begin=()=>{f.calls.push('begin');return new Promise(resolve=>{resolveBegin=resolve;});};
 const pending=f.transport.start();f.transport.close();const calls=[...f.calls],changes=[...f.changes],state=structuredClone(f.s.state);
 resolveBegin(1000);await pending;assert.deepEqual(f.calls,calls);assert.deepEqual(f.changes,changes);assert.deepEqual(f.s.state,state);
 assert.equal(f.s.phase,'paused');assert.equal(f.calls.includes('arm'),false);
 const g=fixture();g.setMode('pending');await g.transport.start();g.transport.close();const after=[...g.calls],notifications=[...g.changes];
 g.resolve();await settle();assert.deepEqual(g.calls,after);assert.deepEqual(g.changes,notifications);assert.equal(g.s.phase,'paused');
 assert.equal(g.calls.includes('adopt'),false);assert.equal(g.calls.includes('beginRepeat'),false);
});
test('a refused pre-arm uses the existing repeat clock whole-bar fallback and retains a complete cue',async()=>{
 const f=fixture();f.setMode('refused');await f.transport.start();await settle();const end=f.s.startMs+f.s.durationMs;
 f.clock.time=end;f.transport.update();await settle();assert.equal(f.calls.includes('beginRepeat'),true);assert.equal(f.calls.includes('adopt'),false);
 const repeat=planPracticeRepeat({previousStartMs:end-f.s.durationMs,phraseEndMs:end,previousBpm:100,nextBpm:100,grid:f.s.pulseGrid,sourceBoundary:true});
 assert.equal(f.s.startMs,end+repeat.repeatBarMs+repeat.countInMs);assert.equal(f.s.phase,'countin');f.transport.close();
});
test('late or cancelled repeat acknowledgement never starts a partial second cue or reenters after pause',async()=>{
 const f=fixture();f.setMode('pending');await f.transport.start();const end=f.s.startMs+f.s.durationMs;
 f.clock.time=end;f.transport.update();assert.ok(f.transport.futureCount);
 f.transport.pause();f.resolve();await settle();assert.equal(f.s.phase,'paused');assert.equal(f.calls.includes('adopt'),false);assert.equal(f.calls.includes('beginRepeat'),false);
 const g=fixture();g.setMode('pending');await g.transport.start();g.clock.time=g.s.startMs+g.s.durationMs+practiceTiming(100,g.s.pulseGrid).countInMs;
 g.transport.update();await settle();assert.equal(g.s.phase,'paused');assert.match(g.errors[0],/did not confirm/);assert.equal(g.calls.includes('beginRepeat'),false);
 f.transport.close();g.transport.close();
});

test('manual initial arming owns its rate/grid snapshot while settings queue for the following repeat',async()=>{
 const f=fixture();let resolveBegin!:(origin:number)=>void;let captured:any[]=[];
 f.transport.clock.begin=(...args)=>{captured=args;return new Promise(resolve=>{resolveBegin=resolve;});};
 const pending=f.transport.start();assert.equal(f.transport.startingRate,100);
 f.s.queueWorking(50);f.s.state.countInBars=8;resolveBegin(1000);await pending;
 assert.equal(captured[0],100);assert.equal(captured[3].countInBars,2);assert.equal(f.s.bpm,100);assert.equal(f.s.pulseGrid.countInBars,2);
 assert.equal(f.s.startMs,1000+practiceTiming(100,captured[3]).countInMs);assert.equal(f.s.state.working,50);assert.equal(f.transport.startingRate,undefined);
 const end=f.s.startMs+f.s.durationMs;f.clock.time=end;f.transport.update();await settle();
 assert.equal(f.s.bpm,50);assert.equal(f.s.pulseGrid.countInBars,8);assert.equal(f.s.startMs,end+practiceTiming(50,f.s.pulseGrid).countInMs);
 assert.deepEqual(f.errors,[]);f.transport.close();
});
test('a manual count-length edit re-arms only the future cue, including a just-completed boundary',async()=>{
 const f=fixture();await f.transport.start();await settle();const start=f.s.startMs,tick=f.s.tickMs,grid=JSON.stringify(f.s.pulseGrid);
 f.s.state.countInBars=1;f.transport.prepare();await settle();assert.equal(f.calls.filter(c=>c==='arm').length,2);
 assert.equal(f.s.startMs,start);assert.equal(f.s.tickMs,tick);assert.equal(JSON.stringify(f.s.pulseGrid),grid);
 f.s.state.countInBars=3;const end=start+f.s.durationMs;f.clock.time=end;f.transport.update();await settle();
 assert.equal(f.calls.includes('adopt'),false);assert.equal(f.calls.includes('beginRepeat'),true);assert.equal(f.s.pulseGrid.countInBars,3);
 assert.deepEqual(f.errors,[]);f.transport.close();
});
