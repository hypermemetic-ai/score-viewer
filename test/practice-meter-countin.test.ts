import test from 'node:test';import assert from 'node:assert/strict';
import {scorePulseGrid,validatePulseGrid,repeatPulseGrid} from '../src/score-clock';
import {practiceTiming,pulseAt,countBeatAt} from '../src/practice-timing';
import {planPracticeRepeat,selectPracticeRepeatStart} from '../src/practice-repeat';
import {PracticeSession,initialPractice,type PracticePlan} from '../src/practice';
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
 for(const bad of [{...grid,version:3},{...grid,countBeatPulses:4},{...grid,scoreOffsetPulses:4},{...grid,scoreStartPhasePulses:6},{...grid,beatStartPulses:[0,2,2]},{...legacy,countBarPulses:6},{...grid,unknown:true},{...grid,barPhasePulses:[0]},{...grid,barStartPulses:[0,1e9],barMeterPulses:[6],barBeatPulses:[2],barPhasePulses:[0]}])assert.throws(()=>validatePulseGrid(bad as any),/grid/);
});
test('short endings stay on their downbeat; only established written pickups carry nonzero phase',()=>{
 const s=source(4,4),bars=[0,48,240,384],grid=scorePulseGrid(s,bars),t=practiceTiming(60,grid);
 assert.deepEqual(grid.barPhasePulses,[6,0,0]);assert.equal(pulseAt(grid.scoreOffsetPulses+grid.barStartPulses[2],t.eighthMs,0,grid).frequency,1200);
 const ending=scorePulseGrid(s,bars,240,384);assert.equal(ending.scoreStartPhasePulses,0);assert.equal(ending.scoreOffsetPulses,8);
 const unidentified=scorePulseGrid(s,[0,192,240,432],192,240);assert.equal(unidentified.scoreStartPhasePulses,0);
 const repeated=scorePulseGrid({...s,writtenPresentation:{repeats:[{startBar:4}]}},[0,48,240,384,432,624]);assert.deepEqual(repeated.barPhasePulses,[6,0,0,6,0]);assert.equal(pulseAt(repeated.scoreOffsetPulses+repeated.barStartPulses[3],practiceTiming(60,repeated).eighthMs,0,repeated).frequency,900);
});
test('pickup plus complementary ending repeats one whole bar at the preserved overarching phase',()=>{
 const initial=scorePulseGrid(source(4,4),[0,48,240,384]);assert.equal(initial.scoreOffsetPulses,14);
 let prior=initial,sourceEnd=11000;
 for(let loop=0;loop<2;loop++){
  const repeated=repeatPulseGrid(initial,prior),plan=planPracticeRepeat({previousStartMs:sourceEnd-8000,phraseEndMs:sourceEnd,previousBpm:60,nextBpm:60,grid:initial,previousGrid:prior,sourceBoundary:true}),t=practiceTiming(60,repeated);
  assert.equal(repeated.countStartPhasePulses,6);assert.equal(repeated.scoreOffsetPulses,8);assert.deepEqual(plan.grid,repeated);assert.equal(plan.countInMs,4000);
  assert.deepEqual([0,2,4,6].map(p=>countBeatAt(p*t.eighthMs+.001,60,repeated)),['4','1','2','3']);assert.deepEqual([0,2,4,6,8].map(p=>pulseAt(p,t.eighthMs,0,repeated).frequency),[900,1200,900,900,900]);
  assert.equal(selectPracticeRepeatStart(plan,sourceEnd).startMs,sourceEnd+4000);sourceEnd+=12000;prior=repeated;
 }
});
test('a written repeated pickup retains its phase and real meter changes select an explicit entry grid',()=>{
 const sourceGrid=scorePulseGrid(source(3,4),[0,48,192,288]),performed=scorePulseGrid({...source(3,4),barPhaseTicks:[96,0,0,96,0,0]},[0,48,192,288,336,480,576]);assert.deepEqual(performed.barPhasePulses,[4,0,0,4,0,0]);
 const next=repeatPulseGrid(sourceGrid);assert.equal(next.countStartPhasePulses,4);
 const mixed=scorePulseGrid({...source(3,4),timeSignatures:[{tick:0,numerator:3,denominator:4},{tick:144,numerator:2,denominator:4}]},[0,144,240]);assert.equal(repeatPulseGrid(mixed).countStartPhasePulses,0);
});
test('compatible meters retain a fractional exit phase by a bounded common pulse resolution',()=>{
 const next=scorePulseGrid(source(3,4),[0,144,288]),previous=validatePulseGrid({version:2,pulsesPerBeat:3,scoreOffsetPulses:9,barStartPulses:[0,9,10],countBarPulses:9,countBeatPulses:3,countStartPhasePulses:0,scoreStartPhasePulses:0,barMeterPulses:[9,9],barBeatPulses:[3,3],barPhasePulses:[0,0],beatStartPulses:[0,3,6,9]}),repeated=repeatPulseGrid(next,previous);
 assert.equal(repeated.pulsesPerBeat,6);assert.equal(repeated.countStartPhasePulses,2);assert.equal(repeated.scoreOffsetPulses,34);assert.equal(repeated.countBarPulses,18);
});
test('attempts install the same pickup clock used by their audio while source note clocks stay literal',()=>{
 const s=source(4,4),barTicks=[0,48,240,384],chunk={id:'1-3',firstBar:0,lastBar:2,start:0,end:384,weight:384,pattern:'public-pickup'},plan:PracticePlan={...s,partition:'fixed-four-v1',revision:'public-pickup',barTicks,barPhaseTicks:[144,0,0],attacks:[0,48,240].map((tick,i)=>({id:String(i),tick,end:tick+24,midi:60+i,bar:i,owners:[String(i)],groups:[]})),gestures:[],chunks:[chunk],ownerGroup:new Map()},state=initialPractice(plan);state.working=60;
 const session=new PracticeSession(plan,chunk,state,true),before=JSON.stringify(plan.attacks);session.ready(0);assert.equal(session.startMs,7000);
 for(let loop=0;loop<3;loop++){
  for(const attack of session.events)assert.equal(session.note(attack.midi,session.startMs+attack.tick*session.tickMs),'accepted');const end:number=session.startMs+384*session.tickMs;session.update(end);assert.equal(session.phase,'complete');
  if(loop<2){const repeat=planPracticeRepeat({previousStartMs:session.startMs,phraseEndMs:end,previousBpm:60,nextBpm:60,grid:session.sourcePulseGrid,previousGrid:session.pulseGrid,sourceBoundary:true});session.ready(end,new Set(),false,{},repeat.grid);assert.equal(session.startMs,end+4000);assert.equal(session.pulseGrid.countStartPhasePulses,6);}
 }
 assert.equal(JSON.stringify(plan.attacks),before);assert.equal(session.sourcePulseGrid.countStartPhasePulses,0);
});
