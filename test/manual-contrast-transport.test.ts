import test from 'node:test';import assert from 'node:assert/strict';
import {ManualContrastTransport} from '../src/manual-contrast-transport';
import {ManualPracticeSession} from '../src/manual-practice-session';
import type {ManualClock} from '../src/manual-practice-transport';
import {planManualPractice} from '../src/manual-practice-plan';
import {initialPractice,practiceCatalogChunks,practiceClipChunk} from '../src/practice';
import {authoredManualScore} from './support/manual-practice-fixture';
import {authoredReadingPackage} from './support/instrument-reading-fixture';
import {importPackage} from '../src/package';
const score=authoredManualScore(),changed=score.notes.at(-2)!;if(changed.eventKind==='pitched')changed.pitch.pitchClass=5;
const plan=await planManualPractice(await importPackage(await authoredReadingPackage(score))),exercise=practiceCatalogChunks(plan).find(c=>c.kind==='contrast')!;
assert.ok(exercise);
const settle=()=>new Promise(r=>setTimeout(r,0));
function fixture(){const state=initialPractice(plan);state.working=100;let now=1000;const calls:{rate:number;grid:any}[]=[],errors:string[]=[];
 const clock:ManualClock={now:()=>now,begin:async(rate,_duration,_count,grid)=>{calls.push({rate,grid});return now;},stop:async()=>{},close:async()=>{},armRepeat:async()=>{throw Error('Contrast cannot arm a repeat');},beginRepeat:async()=>{throw Error('Contrast cannot reuse a repeat cue');},adoptRepeat:()=>{throw Error('Contrast cannot adopt speculative audio');},cancelRepeat:async()=>undefined};
 const t=new ManualContrastTransport((i,claims)=>new ManualPracticeSession(plan,practiceClipChunk(exercise,i),state,{claims,completeClaim:false}),clock,()=>{},m=>errors.push(m));
 return {t,state,calls,errors,end:()=>{now=t.session.startMs+t.session.durationMs;t.update(now);}};
}
test('fresh A and B source clocks keep captured speed; only both enable Done, no measured or original claim',async()=>{
 const f=fixture();await f.t.start();assert.equal(f.t.session.chunk.clipIndex,0);assert.equal(f.t.session.canDone,false);f.t.session.queueWorking(50);
 f.end();await settle();assert.equal(f.t.session.chunk.clipIndex,1);assert.equal(f.t.session.bpm,100);assert.equal(f.t.session.canDone,false);assert.equal(f.calls.length,2);
 assert.ok(f.calls.every(c=>c.grid.sourceExcerpt));assert.notEqual(f.calls[0].grid.sourceExcerpt.startPulse,f.calls[1].grid.sourceExcerpt.startPulse);
 f.end();await settle();assert.equal(f.t.session.chunk.clipIndex,0);assert.equal(f.calls.length,3);assert.equal(f.calls[2].rate,50);
 assert.equal(f.t.claims.canToggle(f.state,{passage:exercise.id,pattern:exercise.pattern,rate:100}),true);assert.deepEqual(f.state.best,{});assert.equal(f.state.manualAttainment,undefined);assert.deepEqual(f.errors,[]);f.t.close();
});
test('pause before B completes and a late pending B origin cannot grant the pair or resume; restart enters A',async()=>{
 const f=fixture();await f.t.start();let resolve!:(origin:number)=>void;f.t.clock.begin=()=>new Promise(r=>{resolve=r;});f.end();await settle();f.t.pause();resolve(2000);await settle();
 assert.equal(f.t.session.phase,'paused');assert.equal(f.t.claims.canToggle(f.state,{passage:exercise.id,pattern:exercise.pattern,rate:100}),false);
 f.t.clock.begin=async()=>3000;await f.t.start();assert.equal(f.t.session.chunk.clipIndex,0);assert.equal(f.t.session.phase,'countin');assert.deepEqual(f.state.best,{});f.t.close();
});
