import test from 'node:test';import assert from 'node:assert/strict';
import {scorePulseGrid,validatePulseGrid} from '../src/score-clock';
import {practiceTiming,pulseAt,countBeatAt} from '../src/practice-timing';
import {planPracticeRepeat,selectPracticeRepeatStart} from '../src/practice-repeat';
const source=(numerator:number,denominator:number,beat={numerator:1,denominator:4})=>({ticksPerBeat:48,timeSignatures:[{tick:0,numerator,denominator}],referencePerformanceTempo:{version:'reference-performance-tempo-v1' as const,bpm:80,beat,provenance:{kind:'editorial' as const,reference:'Public musical clock fixture'}}});
test('full entry-meter count and display preserve compound/simple/triple/irregular metric beats',()=>{
 for(const [n,d,beat,length,count]of [[3,4,{numerator:1,denominator:4},144,3],[6,8,{numerator:3,denominator:8},144,2],[4,4,{numerator:1,denominator:4},192,4],[5,8,{numerator:1,denominator:4},120,5],[3,4,{numerator:1,denominator:2},144,3]] as const){
  const grid=scorePulseGrid(source(n,d,beat),[0,length,length*2]),t=practiceTiming(80,grid),step=grid.countBeatPulses!*t.eighthMs;
  assert.equal(grid.version,2);assert.ok(Math.abs(t.countInMs-length/48*60000/80/(beat.numerator*4/beat.denominator))<1e-8);
  for(let b=0;b<count;b++){assert.equal(countBeatAt(b*step+.001,80,grid),String(b+1));assert.equal(pulseAt(b*grid.countBeatPulses!,t.eighthMs,0,grid).frequency,b===0?1200:900);}
  assert.equal(pulseAt(grid.scoreOffsetPulses,t.eighthMs,0,grid).frequency,1200);
 }
});
test('pickup enters at its genuine metric phase after a complete count bar, without false downbeat',()=>{
 const grid=scorePulseGrid(source(3,4),[0,48,192,336]),t=practiceTiming(60,grid);
 assert.equal(grid.countBarPulses,6);assert.equal(grid.scoreStartPhasePulses,4);assert.equal(grid.scoreOffsetPulses,10);assert.equal(t.countInMs,5000);
 assert.deepEqual([0,2,4,6,8].map(p=>countBeatAt(p*t.eighthMs+.001,60,grid)),['1','2','3','1','2']);
 assert.equal(pulseAt(10,t.eighthMs,0,grid).frequency,900);assert.equal(pulseAt(12,t.eighthMs,0,grid).frequency,1200);
});
test('fractional reference beats and meter changes retain exact source end and whole-bar fallback',()=>{
 const s={...source(3,4,{numerator:1,denominator:2}),timeSignatures:[{tick:0,numerator:3,denominator:4},{tick:144,numerator:5,denominator:8}]},grid=scorePulseGrid(s,[0,144,264]),p=planPracticeRepeat({previousStartMs:1000,phraseEndMs:3750,previousBpm:60,nextBpm:120,grid,sourceBoundary:true});
 assert.equal(p.boundaryMs,3750);assert.equal(p.countInMs,750);assert.equal(p.repeatBarMs,750);
 for(const delay of [.1,100,750,1500.1]){const next=selectPracticeRepeatStart(p,p.boundaryMs+delay);assert.ok(next.countStartMs>=p.boundaryMs+delay);assert.ok(Math.abs((next.countStartMs-p.boundaryMs)%p.repeatBarMs)<1e-8);assert.equal(next.startMs-next.countStartMs,750);}
 const t=practiceTiming(60,grid);assert.equal(pulseAt(grid.scoreOffsetPulses+grid.barStartPulses[1],t.eighthMs,0,grid).frequency,1200);
});
test('legacy pulse contracts remain literal and mixed/malformed v2 metadata refuses',()=>{
 const legacy={pulsesPerBeat:3,scoreOffsetPulses:6,barStartPulses:[0,6,12]};assert.deepEqual(validatePulseGrid(legacy),legacy);
 const grid=scorePulseGrid(source(3,4),[0,144,288]);
 for(const bad of [{...grid,version:3},{...grid,countBeatPulses:4},{...grid,scoreOffsetPulses:4},{...grid,scoreStartPhasePulses:6},{...grid,beatStartPulses:[0,2,2]},{...legacy,countBarPulses:6}])assert.throws(()=>validatePulseGrid(bad as any),/grid/);
});
