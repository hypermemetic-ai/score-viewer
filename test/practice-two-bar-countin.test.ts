import test from 'node:test';import assert from 'node:assert/strict';
import {scorePulseGrid,repeatPulseGrid,validatePulseGrid} from '../src/score-clock';
import {practiceCountInGrid,practiceAttemptGrid} from '../src/practice-attempt-grid';
import {practiceTiming,pulseAt,countBeatAt} from '../src/practice-timing';
import {planPracticeRepeat,selectPracticeRepeatStart} from '../src/practice-repeat';
import {PracticeSession,initialPractice,type PracticePlan} from '../src/practice';
import {practiceAudio} from '../src/host';
const source=(n:number,d:number,beat={numerator:1,denominator:4})=>({ticksPerBeat:48,timeSignatures:[{tick:0,numerator:n,denominator:d}],referencePerformanceTempo:{version:'reference-performance-tempo-v1' as const,bpm:180,beat,provenance:{kind:'editorial' as const,reference:'Public count-in source'}}});
test('two 6/8 bars at ten percent have four dotted-quarter beats, quieter subdivisions and exact score entry',()=>{
 const original=scorePulseGrid(source(6,8,{numerator:3,denominator:8}),[0,144,288]),before=JSON.stringify(original),grid=practiceCountInGrid(original),timing=practiceTiming(18,grid),ratio=Math.round(timing.eighthMs/timing.countStepMs);
 assert.equal(grid.version,3);assert.equal(grid.countInBars,2);assert.equal(grid.scoreOffsetPulses,12);assert.ok(Math.abs(timing.countInMs-40000/3)<1e-8);
 const metric=[0,3,6,9].map(p=>pulseAt(p*ratio,timing.eighthMs,timing.countStepMs,grid));
 assert.deepEqual(metric.map(p=>p.frequency),[1200,900,1200,900]);assert.deepEqual(metric.map(p=>p.amplitude),[.16,.12,.16,.12]);
 assert.deepEqual([0,3,6,9].map(p=>countBeatAt(p*timing.eighthMs+.001,18,grid)),['1','2','1','2']);
 assert.equal(pulseAt(ratio,timing.eighthMs,timing.countStepMs,grid).amplitude,.045);assert.equal(pulseAt(1,timing.eighthMs,timing.countStepMs,grid).amplitude,.022);
 const entry=pulseAt(12*ratio,timing.eighthMs,timing.countStepMs,grid);assert.ok(Math.abs(entry.offsetMs-timing.countInMs)<1e-8);assert.equal(entry.frequency,1200);assert.equal(pulseAt(grid.scoreOffsetPulses+grid.barStartPulses.at(-1)!,timing.eighthMs,0,grid).amplitude,0);assert.equal(JSON.stringify(original),before);
});
test('each selected bar count is whole source meter; V2 one-bar interpretation stays literal',()=>{
 for(const [n,d,length,beat]of [[3,4,144,{numerator:1,denominator:4}],[6,8,144,{numerator:3,denominator:8}],[4,4,192,{numerator:1,denominator:2}]] as const){
  const original=scorePulseGrid(source(n,d,beat),[0,length,length*2]),old=JSON.stringify(original),oldTime=practiceTiming(60,original);
  for(const bars of [1,2,8]){const grid=practiceCountInGrid(original,bars);assert.equal(practiceTiming(60,grid).countInMs,bars*oldTime.countInMs);assert.deepEqual(practiceAttemptGrid(original,grid),grid);}
  assert.equal(JSON.stringify(validatePulseGrid(original)),old);assert.equal(pulseAt(1,oldTime.eighthMs,0,original).amplitude,.16);
 }
 const grid=practiceCountInGrid(scorePulseGrid(source(6,8,{numerator:3,denominator:8}),[0,144,288]));
 for(const bars of [0,9,1.5,NaN,Infinity])assert.throws(()=>practiceCountInGrid(grid,bars));
 for(const bad of [{...grid,countInBars:undefined},{...grid,countInBars:0},{...grid,countInBars:9},{...grid,countInBars:1.5},{...grid,version:2},{...grid,version:4},{...grid,scoreOffsetPulses:6},{...grid,scoreOffsetPulses:13}])assert.throws(()=>validatePulseGrid(bad as any));
});
test('two-bar repeated pickups preserve the predecessor exit phase through speed changes and delayed fallback',()=>{
 const original=scorePulseGrid(source(4,4),[0,48,240,384]),configured=practiceCountInGrid(original);assert.equal(configured.scoreOffsetPulses,22);
 let previous=configured,boundary=100000;
 for(const [oldBpm,nextBpm]of [[60,60],[60,90],[90,120]]){
  const plan=planPracticeRepeat({previousStartMs:boundary-8000,phraseEndMs:boundary,previousBpm:oldBpm,nextBpm,grid:configured,previousGrid:previous,sourceBoundary:true}),grid=plan.grid!,time=practiceTiming(nextBpm,grid);
  assert.equal(grid.countStartPhasePulses,6);assert.equal(grid.scoreOffsetPulses,16);assert.equal(time.countInMs,8*60000/nextBpm);
  assert.deepEqual([0,2,4,6,8,10,12,14].map(p=>countBeatAt(p*time.eighthMs+.001,nextBpm,grid)),['4','1','2','3','4','1','2','3']);
  assert.equal(selectPracticeRepeatStart(plan,boundary).startMs,boundary+time.countInMs);
  const late=selectPracticeRepeatStart(plan,boundary+.1);assert.equal(late.countStartMs,boundary+time.countBarMs);assert.ok(Math.abs(late.startMs-late.countStartMs-time.countInMs)<1e-8);
  assert.equal(pulseAt(grid.scoreOffsetPulses,time.eighthMs,0,grid).frequency,900);previous=grid;boundary+=time.countInMs+8*60000/nextBpm;
 }
 const v2Repeat=repeatPulseGrid(original);assert.equal(v2Repeat.version,2);assert.equal(v2Repeat.scoreOffsetPulses,8);
});
test('a count setting is captured per attempt and changes the next ready without moving source notes',()=>{
 const s=source(6,8,{numerator:3,denominator:8}),chunk={id:'1-2',firstBar:0,lastBar:1,start:0,end:288,weight:288,pattern:'public-compound'},plan:PracticePlan={...s,revision:'public-compound',partition:'fixed-four-v1',barTicks:[0,144,288],attacks:[],gestures:[],chunks:[chunk],ownerGroup:new Map()},state=initialPractice(plan),configured=state as typeof state & {countInBars?:number};state.working=18;
 const session=new PracticeSession(plan,chunk,state,false),before=JSON.stringify(plan);session.ready(0);const initial=session.startMs;assert.ok(Math.abs(initial-40000/3)<1e-8);
 const tick=session.tickMs;state.working=36;assert.equal(session.tickMs,tick);assert.equal(session.bpm,18);configured.countInBars=1;assert.equal(session.startMs,initial);assert.equal(session.pulseGrid.countInBars,2);assert.equal(session.sourcePulseGrid.countInBars,1);
 session.pause();session.ready(1000);assert.ok(Math.abs(session.startMs-(1000+10000/3))<1e-8);assert.equal(session.pulseGrid.countInBars,1);assert.equal(JSON.stringify(plan),before);
});
test('actual native IPC keeps the new V3 payload separate from unchanged V2 and legacy fields',async t=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'window'),calls:any[]=[];
 Object.defineProperty(globalThis,'window',{configurable:true,value:{__TAURI_INTERNALS__:{invoke:async(command:string,args:unknown)=>{calls.push({command,args:JSON.parse(JSON.stringify(args))});return 1000000;}}}});
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'window',previous);else delete(globalThis as any).window;});
 const old=scorePulseGrid(source(6,8,{numerator:3,denominator:8}),[0,144,288]),grid=practiceCountInGrid(old);
 await practiceAudio.begin('output',18,30000,5000/9,undefined,grid);await practiceAudio.begin('output',18,30000,5000/9,undefined,old);
 await practiceAudio.armRepeat('output',18,30000,5000/9,30000000,grid,1000000,1);
 assert.deepEqual(calls[0].args.pulseGridV3,grid);assert.equal(calls[0].args.pulseGridV2,null);assert.equal(calls[0].args.pulsesPerBeat,null);
 assert.deepEqual(calls[1].args.pulseGridV2,old);assert.equal(calls[1].args.pulseGridV3,null);assert.deepEqual(calls[2].args.pulseGridV3,grid);assert.equal(calls[2].args.pulseGridV2,null);
});
