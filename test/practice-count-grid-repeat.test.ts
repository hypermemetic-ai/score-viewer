import test from 'node:test';
import assert from 'node:assert/strict';
import {PracticeView} from '../src/practice-view';
import {PracticeClock} from '../src/practice-clock';
import {PracticeSession,initialPractice,type PracticePlan} from '../src/practice';
import {PracticeDone} from '../src/practice-attainment';
import {host,practiceAudio} from '../src/host';

const until=async(predicate:()=>boolean)=>{for(let i=0;i<100&&!predicate();i++)await new Promise<void>(r=>setImmediate(r));assert.ok(predicate(),'owned operation did not settle');};
async function fixture(t:any,{pickup=false,pending=false}={}){
 const barTicks=pickup?[0,48,240,384]:[0,144,288,432,576],chunk={id:'public-bars',firstBar:0,lastBar:barTicks.length-2,start:0,end:barTicks.at(-1)!,weight:barTicks.at(-1)!,pattern:'public-bars'};
 const plan:PracticePlan={revision:'public-count-grid',partition:'fixed-four-v1',ticksPerBeat:48,timeSignatures:[{tick:0,numerator:pickup?4:6,denominator:pickup?4:8}],referencePerformanceTempo:{version:'reference-performance-tempo-v1',bpm:60,beat:{numerator:pickup?1:3,denominator:pickup?4:8},provenance:{kind:'editorial',reference:'Authored full-meter / pickup count control'}},barTicks,attacks:[],gestures:[],chunks:[chunk],ownerGroup:new Map()};
 const state=initialPractice(plan);state.working=60;state.keepTempo=true;
 const session=new PracticeSession(plan,chunk,state,false),old={sample:host.midiClock,begin:practiceAudio.begin,arm:practiceAudio.armRepeat,cancel:practiceAudio.cancelRepeat,stop:practiceAudio.stop,onError:practiceAudio.onError};
 const arms:any[][]=[],cancels:number[]=[];let stops=0,resolveOld!:(receipt:any)=>void;
 host.midiClock=async()=>10000000;practiceAudio.begin=async()=>10150000;practiceAudio.stop=async()=>{stops++;};practiceAudio.onError=async()=>()=>{};
 const receipt=(args:any[])=>({version:2 as const,armId:args[7],armed:true,countStartMicros:args[4],scoreStartMicros:args[4]+args[5].scoreOffsetPulses*60000000/(args[1]*args[5].pulsesPerBeat)});
 practiceAudio.armRepeat=(...args)=>{arms.push(args);return pending&&arms.length===1?new Promise(r=>resolveOld=r):Promise.resolve(receipt(args));};
 practiceAudio.cancelRepeat=async(armId,previousCountStartMicros)=>{cancels.push(armId);return {version:2,armId,previousCountStartMicros,state:'queued'};};
 const clock=new PracticeClock(true),countMs=session.pulseGrid.scoreOffsetPulses*60000/(60*session.pulseGrid.pulsesPerBeat),duration=countMs+chunk.end*session.tickMs,origin=await clock.begin(60,duration,true,session.pulseGrid);session.ready(origin);
 let now=clock.now();clock.now=()=>now;
 const view=Object.create(PracticeView.prototype) as any;Object.assign(view,{plan,state,session,clock,loopRate:60,doneClaims:new PracticeDone(),startGeneration:0,disposed:false,overview:false,heldPitches:new Set(),heldStreams:new Map(),contacts:{clear(){},press(){}},preview:{clear(){}},options:{},app:{querySelector:()=>null},manual:{cancel(){}},save:()=>Promise.resolve(true),paint(){},paintControls(){},paintVisibility(){},paintProgress(){},refreshTempoFields(){},refreshSettings(){},resetCarrySetup(){},clearPose(){},status(){}});
 t.after(async()=>{view.stopClock();await clock.stop();host.midiClock=old.sample;Object.assign(practiceAudio,{begin:old.begin,armRepeat:old.arm,cancelRepeat:old.cancel,stop:old.stop,onError:old.onError});});
 return {view,state,session,clock,arms,cancels,get stops(){return stops;},setNow(value:number){now=value;},settleOld(){resolveOld(receipt(arms[0]));}};
}

test('an already prepared two-bar cue is replaced by three bars at unchanged BPM and source exit',async t=>{
 const f=await fixture(t),phase=f.session.phase,start=f.session.startMs,tick=f.session.tickMs;
 f.view.prepareRepeat();const previous=f.view.repeatPreparation;await previous.settled;assert.equal(previous.plan.grid.countInBars,2);assert.ok(previous.receipt);const stops=f.stops;
 f.state.countInBars=3;f.view.prepareRepeat();const next=f.view.repeatPreparation;assert.notEqual(next,previous);await next.settled;
 assert.deepEqual(f.arms.map(a=>a[5].countInBars),[2,3]);assert.deepEqual(f.cancels,[previous.receipt.armId]);assert.equal(f.stops,stops);assert.equal(next.plan.boundaryMs,previous.plan.boundaryMs);assert.equal(next.receipt.startMs-next.receipt.countStartMs,6000);
 assert.equal(f.session.phase,phase);assert.equal(f.session.startMs,start);assert.equal(f.session.tickMs,tick);assert.equal(f.session.pulseGrid.countInBars,2);assert.equal(f.session.sourcePulseGrid.countInBars,3);
 assert.throws(()=>f.clock.adoptRepeat(previous.receipt),/no longer owns/);f.view.prepareRepeat();assert.equal(f.view.repeatPreparation,next);assert.equal(f.arms.length,2);assert.equal(f.clock.adoptRepeat(next.receipt).startMs,next.receipt.startMs);
});

test('editing bars during a pending arm rejects its stale receipt and admits only the replacement grid',async t=>{
 const f=await fixture(t,{pending:true});f.view.prepareRepeat();const previous=f.view.repeatPreparation;await until(()=>f.arms.length===1);
 f.state.countInBars=3;f.view.prepareRepeat();const next=f.view.repeatPreparation;assert.notEqual(next,previous);assert.equal(previous.pending,true);f.settleOld();await previous.settled;await next.settled;
 assert.equal(previous.receipt,undefined);assert.deepEqual(f.cancels,[f.arms[0][7]]);assert.deepEqual(f.arms.map(a=>a[5].countInBars),[2,3]);assert.ok(next.receipt);assert.equal(next.receipt.armId,f.arms[1][7]);assert.ok(next.receipt.armId>f.arms[0][7]);assert.equal(f.view.repeatPreparation,next);assert.equal(next.plan.boundaryMs,previous.plan.boundaryMs);assert.equal(f.session.pulseGrid.countInBars,2);
 assert.throws(()=>f.clock.adoptRepeat({armId:f.arms[0][7],countStartMs:f.arms[0][4]/1000,startMs:0,nextBpm:60}),/no longer owns/);assert.equal(f.clock.adoptRepeat(next.receipt).startMs,next.receipt.startMs);
});

test('pickup repeat reuse compares the derived nonzero exit phase and preserves it when bars change',async t=>{
 const f=await fixture(t,{pickup:true});assert.equal(f.session.sourcePulseGrid.countStartPhasePulses,0);f.view.prepareRepeat();const previous=f.view.repeatPreparation;await previous.settled;assert.equal(previous.plan.grid.countStartPhasePulses,6);
 f.view.prepareRepeat();assert.equal(f.view.repeatPreparation,previous);assert.equal(f.arms.length,1);assert.deepEqual(f.cancels,[]);
 f.state.countInBars=3;f.view.prepareRepeat();const next=f.view.repeatPreparation;await next.settled;assert.equal(next.plan.grid.countStartPhasePulses,6);assert.equal(next.plan.grid.scoreStartPhasePulses,6);assert.equal(next.plan.boundaryMs,previous.plan.boundaryMs);assert.equal(next.receipt.startMs-next.receipt.countStartMs,12000);assert.deepEqual(f.cancels,[previous.receipt.armId]);
});

for(const offset of [0,1])test(`a count edit ${offset}ms after the audible boundary preserves the complete pending cue`,async t=>{
 const f=await fixture(t,{pending:true});f.view.prepareRepeat();const prepared=f.view.repeatPreparation;await until(()=>f.arms.length===1);const stops=f.stops;
 f.setNow(prepared.plan.boundaryMs+offset);f.state.countInBars=3;f.view.prepareRepeat();assert.equal(f.view.repeatPreparation,prepared);assert.equal(f.arms.length,1);assert.deepEqual(f.cancels,[]);assert.equal(f.stops,stops);
 f.session.update(f.clock.now());assert.equal(f.session.phase,'complete');f.view.completeTimedTrial(f.session);assert.ok(f.view.repeatCompletion);f.settleOld();await prepared.settled;await until(()=>f.session.phase==='countin'&&!f.view.repeatSavePending);
 assert.equal(f.session.pulseGrid.countInBars,2);assert.equal(f.session.startMs,prepared.receipt.startMs);assert.equal(f.state.countInBars,3);assert.equal(f.arms.length,1);assert.deepEqual(f.cancels,[]);assert.equal(f.stops,stops);
 f.view.prepareRepeat();const next=f.view.repeatPreparation;await next.settled;assert.deepEqual(f.arms.map(a=>a[5].countInBars),[2,3]);assert.equal(next.plan.boundaryMs,f.session.startMs+f.session.chunk.end*f.session.tickMs);
});

for(const offset of [0,1])test(`Working edit during a pending ACK ${offset}ms after count start queues behind the captured BPM and grid`,async t=>{
 const f=await fixture(t,{pending:true});f.view.prepareRepeat();const prepared=f.view.repeatPreparation;await until(()=>f.arms.length===1);const stops=f.stops;
 f.setNow(prepared.plan.boundaryMs+offset);f.session.update(f.clock.now());assert.equal(f.session.phase,'complete');f.view.completeTimedTrial(f.session);assert.ok(f.view.repeatCompletion);
 const field={dataset:{practiceSetting:'working',absolute:'60',presented:'100'},value:'150',type:'text'};assert.equal(f.view.setting(field),true);f.state.countInBars=3;
 assert.equal(f.state.working,90);assert.equal(f.view.queuedWorking,90);assert.equal(f.view.clock,f.clock);assert.equal(f.view.repeatPreparation,prepared);assert.equal(f.session.phase,'complete');assert.deepEqual(f.cancels,[]);assert.equal(f.stops,stops);
 f.settleOld();await prepared.settled;await until(()=>f.session.phase==='countin'&&!f.view.repeatSavePending);
 assert.equal(f.view.loopRate,60);assert.equal(f.session.bpm,60);assert.equal(f.session.pulseGrid.countInBars,2);assert.equal(f.session.startMs,prepared.receipt.startMs);assert.equal(f.state.working,90);assert.equal(f.view.queuedWorking,90);assert.equal(f.state.best[f.session.chunk.pattern],undefined);assert.deepEqual(f.cancels,[]);assert.equal(f.stops,stops);
 f.view.prepareRepeat();const next=f.view.repeatPreparation;await next.settled;assert.deepEqual(f.arms.map(a=>[a[1],a[5].countInBars]),[[60,2],[90,3]]);assert.equal(next.plan.boundaryMs,f.session.startMs+f.session.chunk.end*f.session.tickMs);assert.equal(next.plan.countInMs,4000);
});
