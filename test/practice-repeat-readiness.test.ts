import test from 'node:test';
import assert from 'node:assert/strict';
import {PracticeView} from '../src/practice-view';
import {PracticeClock} from '../src/practice-clock';
import {PracticeSession,initialPractice,type PracticePlan} from '../src/practice';
import {PracticeDone} from '../src/practice-attainment';
import {host,practiceAudio} from '../src/host';

const until=async(f:()=>boolean)=>{for(let i=0;i<100&&!f();i++)await new Promise<void>(r=>setImmediate(r));assert.ok(f(),'operation did not settle');};
async function fixture(t:any,{manual=false,count=2}={}){
 const chunk={id:'public-terminal-chord',pattern:'public-terminal-chord',firstBar:0,lastBar:3,start:0,end:576,weight:576};
 const attacks=[{id:'opening',tick:0,end:144,midi:60,hand:'RH' as const,groups:[],owners:[],bar:0},{id:'penultimate',tick:528,end:552,midi:62,hand:'RH' as const,groups:[],owners:[],bar:3},{id:'terminal-a',tick:552,end:576,midi:64,hand:'RH' as const,groups:[],owners:[],bar:3},{id:'terminal-b',tick:552,end:576,midi:67,hand:'RH' as const,groups:[],owners:[],bar:3}];
 const plan:PracticePlan={revision:'public-terminal-chord',partition:'fixed-four-v1',ticksPerBeat:48,timeSignatures:[{tick:0,numerator:6,denominator:8}],referencePerformanceTempo:{version:'reference-performance-tempo-v1',bpm:180,beat:{numerator:3,denominator:8},provenance:{kind:'editorial',reference:'Public terminal-grading control'}},barTicks:[0,144,288,432,576],attacks,gestures:[],chunks:[chunk],ownerGroup:new Map()};
 const state=initialPractice(plan);state.working=90;state.countInBars=count;state.step=3.6;state.keepTempo=false;
 const session=new PracticeSession(plan,chunk,state,!manual),original={sample:host.midiClock,begin:practiceAudio.begin,arm:practiceAudio.armRepeat,cancel:practiceAudio.cancelRepeat,stop:practiceAudio.stop,onError:practiceAudio.onError};
 const arms:any[][]=[],cancels:any[][]=[];let stops=0;
 host.midiClock=async()=>10_000_000;practiceAudio.begin=async()=>10_150_000;practiceAudio.stop=async()=>{stops++;};practiceAudio.onError=async()=>()=>{};
 practiceAudio.armRepeat=async(...a)=>{arms.push(a);return {version:2,armId:a[7],armed:true,countStartMicros:Math.ceil(a[4]),scoreStartMicros:Math.ceil(a[4]+a[5].scoreOffsetPulses*60_000_000/(a[1]*a[5].pulsesPerBeat))};};
 practiceAudio.cancelRepeat=async(...a)=>{cancels.push(a);return {version:2,armId:a[0],previousCountStartMicros:a[1],state:'queued'};};
 const clock=new PracticeClock(true),countMs=session.pulseGrid.scoreOffsetPulses*60000/(90*session.pulseGrid.pulsesPerBeat),origin=await clock.begin(90,countMs+chunk.end*session.tickMs,true,session.pulseGrid);session.ready(origin);
 let now=session.startMs;clock.now=()=>now;session.update(now);
 const messages:string[]=[],view=Object.create(PracticeView.prototype) as any;
 Object.assign(view,{plan,state,session,clock,loopRate:90,doneClaims:new PracticeDone(),startGeneration:0,disposed:false,overview:false,heldPitches:new Set(),heldStreams:new Map(),contacts:{clear(){},press(){}},preview:{clear(){}},options:{connected:()=>!manual},app:{querySelector:()=>null},manual:{cancel(){}},save:()=>Promise.resolve(true),paint(){},paintScore(){},paintControls(){},paintVisibility(){},paintProgress(){},refreshTempoFields(){},refreshSettings(){},resetCarrySetup(){},clearPose(){},status:(s:string)=>messages.push(s),persistDiagnostic(){}});
 t.after(async()=>{view.stopClock();await clock.stop();host.midiClock=original.sample;Object.assign(practiceAudio,{begin:original.begin,armRepeat:original.arm,cancelRepeat:original.cancel,stop:original.stop,onError:original.onError});});
 const play=(id:string,lateMs=0)=>{const a=attacks.find(a=>a.id===id)!;const due=session.startMs+(a.tick-session.startTick)*session.tickMs;now=due+lateMs;return session.note(a.midi,now);};
 return {view,state,session,clock,arms,cancels,messages,play,setNow:(v:number)=>{now=v;},get stops(){return stops;}};
}

test('only an unresolved terminal chord can be prepared, without awarding its predicted rate',async t=>{
 const f=await fixture(t);assert.equal(f.view.predictedRepeatRate(f.session),undefined);assert.equal(f.play('opening'),'accepted');assert.equal(f.view.predictedRepeatRate(f.session),undefined);
 assert.equal(f.play('penultimate'),'accepted');f.view.repeatSavePending=true;assert.equal(f.view.predictedRepeatRate(f.session),93.6);f.view.prepareRepeat();await f.view.repeatPreparation.settled;
 assert.equal(f.arms.length,1);assert.equal(f.arms[0][1],93.6);assert.equal(f.session.phase,'trial');assert.equal(f.session.bpm,90);assert.equal(f.state.working,90);assert.deepEqual(f.state.best,{});assert.equal(f.view.doneClaims.canToggle(f.state,{passage:f.session.chunk.id,pattern:f.session.chunk.pattern,rate:90}),false);
});

test('accepted final notes during the audible cue adopt its original boundary only after completion',async t=>{
 const f=await fixture(t);f.play('opening');f.play('penultimate');f.view.prepareRepeat();const prepared=f.view.repeatPreparation;await prepared.settled;
 const boundary=prepared.plan.boundaryMs,start=f.session.startMs,tickMs=f.session.tickMs,stops=f.stops;
 assert.equal(f.play('terminal-a',400),'accepted');assert.equal(f.session.phase,'trial');assert.equal(f.session.startMs,start);assert.equal(f.session.tickMs,tickMs);assert.deepEqual(f.state.best,{});assert.ok(f.clock.now()>boundary);
 assert.equal(f.play('terminal-b',400),'accepted');f.session.update(f.clock.now());assert.equal(f.session.phase,'complete');f.view.completeTimedTrial(f.session);
 assert.equal(f.session.phase,'countin');assert.equal(f.session.bpm,93.6);assert.equal(f.session.startMs,prepared.receipt.startMs);assert.equal(f.state.best[f.session.chunk.pattern],90);assert.equal(f.arms.length,1);assert.deepEqual(f.cancels,[]);assert.equal(f.stops,stops);assert.equal(f.view.repeatGap.extraBeats,0);
});

for(const outcome of ['missing','wrong','extra','pause'] as const)test(`${outcome} cancels an audible candidate without granting the future achievement`,async t=>{
 const f=await fixture(t);f.play('opening');f.play('penultimate');f.view.prepareRepeat();const prepared=f.view.repeatPreparation;await prepared.settled;
 const last=f.session.events.at(-1)!,due=f.session.startMs+(last.tick-f.session.startTick)*f.session.tickMs,stops=f.stops;f.setNow(prepared.plan.boundaryMs+100);
 if(outcome==='missing'){f.setNow(due+501);f.session.update(f.clock.now());assert.equal(f.session.phase,'error');f.view.freezeError();}
 else if(outcome==='wrong'){assert.equal(f.session.note(99,f.clock.now()),'failed');f.view.freezeError();}
 else if(outcome==='extra'){f.play('terminal-a');f.play('terminal-b');f.setNow(prepared.plan.boundaryMs-1);assert.equal(f.session.note(99,f.clock.now()),'failed');f.view.freezeError();}
 else f.view.pause();
 await new Promise<void>(r=>setImmediate(r));assert.ok(f.stops>stops);assert.equal(f.view.repeatPreparation,undefined);assert.deepEqual(f.state.best,{});assert.equal(f.session.bpm,90);assert.equal(f.arms.length,1);
});

for(const delta of [-.001,0,1])test(`receipt adoption at score entry ${delta}ms preserves the full-count deadline`,async t=>{
 const f=await fixture(t,{manual:true,count:1});f.view.prepareRepeat();const prepared=f.view.repeatPreparation;await prepared.settled;f.setNow(prepared.receipt.startMs+delta);f.session.update(f.clock.now());assert.equal(f.session.phase,'complete');const epoch=f.session.startMs;
 f.view.completeTimedTrial(f.session);await new Promise<void>(r=>setImmediate(r));assert.deepEqual(f.state.best,{});assert.equal(f.arms.length,1);
 if(delta<0){assert.equal(f.session.phase,'countin');assert.equal(f.session.startMs,prepared.receipt.startMs);}
 else{assert.equal(f.session.phase,'paused');assert.equal(f.session.startMs,epoch);assert.match(f.messages.at(-1)!,/Resume starts a fresh count-in/);assert.equal(f.view.repeatPreparation,undefined);}
});

test('a changed desired rate projects only captured actual achievement and queues behind an audible cue',async t=>{
 const f=await fixture(t);f.play('opening');f.play('penultimate');f.view.queuedWorking=120;f.state.working=120;f.view.prepareRepeat();const prepared=f.view.repeatPreparation;await prepared.settled;assert.equal(prepared.rate,120);assert.deepEqual(f.state.best,{});
 f.setNow(prepared.plan.boundaryMs+100);f.state.working=150;f.view.queuedWorking=150;f.state.countInBars=3;f.view.prepareRepeat();assert.equal(f.view.repeatPreparation,prepared);
 f.play('terminal-a',400);f.play('terminal-b',400);f.session.update(f.clock.now());f.view.completeTimedTrial(f.session);assert.equal(f.session.bpm,120);assert.equal(f.session.pulseGrid.countInBars,2);assert.equal(f.state.working,150);assert.equal(f.view.queuedWorking,150);assert.equal(f.state.best[f.session.chunk.pattern],90);
});

test('terminal prediction cannot arm a different source passage when the projected goal is complete',async t=>{
 const f=await fixture(t);f.play('opening');f.play('penultimate');f.view.loopRate=f.state.target;f.view.queuedWorking=90;assert.equal(f.view.predictedRepeatRate(f.session),undefined);f.view.prepareRepeat();assert.equal(f.arms.length,0);assert.deepEqual(f.state.best,{});
});

test('the scheduled score-entry guard stops unresolved grading before any late achievement',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const f=await fixture(t);f.play('opening');f.play('penultimate');f.view.prepareRepeat();const prepared=f.view.repeatPreparation;await prepared.settled;
 const start=f.session.startMs,stops=f.stops;f.setNow(prepared.receipt.startMs);t.mock.timers.tick(100_000);await new Promise<void>(r=>setImmediate(r));
 assert.equal(f.session.phase,'paused');assert.equal(f.session.startMs,start);assert.equal(f.view.repeatPreparation,undefined);assert.ok(f.stops>stops);assert.deepEqual(f.state.best,{});assert.equal(f.play('terminal-a',400),'inactive');assert.match(f.messages.at(-1)!,/Resume starts a fresh count-in/);
});

test('the frame and grading shared check uses actual cue time independently of its timer',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const f=await fixture(t);f.play('opening');f.play('penultimate');f.view.prepareRepeat();await f.view.repeatPreparation.settled;f.setNow(f.view.repeatPreparation.receipt.startMs+1);assert.equal(f.view.expireRepeatCandidate(),true);
 assert.equal(f.session.phase,'paused');assert.equal(f.view.repeatPreparation,undefined);assert.deepEqual(f.state.best,{});assert.equal(f.arms.length,1);
});

test('an in-flight arm is stopped at its entry even before the receipt arrives',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const f=await fixture(t);let resolve!:(v:any)=>void,request:any[]=[];practiceAudio.armRepeat=(...a)=>{request=a;f.arms.push(a);return new Promise(r=>resolve=r);};f.play('opening');f.play('penultimate');f.view.prepareRepeat();const prepared=f.view.repeatPreparation;await until(()=>!!resolve);
 f.setNow(prepared.plan.boundaryMs+prepared.plan.countInMs);t.mock.timers.tick(100_000);assert.equal(f.session.phase,'paused');assert.deepEqual(f.state.best,{});assert.equal(f.view.repeatPreparation,undefined);
 resolve({version:2,armId:request[7],armed:true,countStartMicros:Math.ceil(request[4]),scoreStartMicros:Math.ceil(request[4]+prepared.plan.countInMs*1000)});assert.equal(await prepared.settled,undefined);assert.equal(f.cancels.at(-1)![0],request[7]);assert.equal(f.session.phase,'paused');
});

test('an already queued old timer cannot stop a newly adopted attempt',async t=>{
 const f=await fixture(t);f.play('opening');f.play('penultimate');f.view.prepareRepeat();const prepared=f.view.repeatPreparation;await prepared.settled;
 const original=globalThis.setTimeout;let callback!:()=>void;globalThis.setTimeout=((fn:()=>void)=>{callback=fn;return original(()=>{},100_000);}) as any;try{f.view.guardRepeatEntry(prepared);}finally{globalThis.setTimeout=original;}
 f.play('terminal-a',400);f.play('terminal-b',400);f.session.update(f.clock.now());f.view.completeTimedTrial(f.session);const start=f.session.startMs,stops=f.stops;f.setNow(start+1);callback();assert.equal(f.session.phase,'countin');assert.equal(f.session.startMs,start);assert.equal(f.stops,stops);assert.equal(f.view.repeatPreparation,undefined);
});

test('completion resolution after the cue entry cannot grant unresolved old or future credit',async t=>{
 const f=await fixture(t);f.play('opening');f.play('penultimate');f.view.prepareRepeat();const prepared=f.view.repeatPreparation;await prepared.settled;f.play('terminal-a',400);f.play('terminal-b',400);f.session.update(f.clock.now());assert.equal(f.session.phase,'complete');f.setNow(prepared.receipt.startMs);f.view.completeTimedTrial(f.session);
 assert.equal(f.session.phase,'paused');assert.deepEqual(f.state.best,{});assert.equal(f.view.doneClaims.canToggle(f.state,{passage:f.session.chunk.id,pattern:f.session.chunk.pattern,rate:90}),false);assert.equal(f.view.repeatPreparation,undefined);
});

test('lost carry setup cancels a candidate whose count is already audible',async t=>{
 const f=await fixture(t);f.play('opening');f.play('penultimate');const held={...f.session.events[0],tick:-48,end:48,midi:55};Object.defineProperty(f.session,'carryIn',{get:()=>[held]});f.view.heldPitches.add(55);f.view.prepareRepeat();const prepared=f.view.repeatPreparation;await prepared.settled;f.setNow(prepared.plan.boundaryMs+100);f.view.heldPitches.delete(55);f.view.prepareRepeat();
 assert.equal(f.session.phase,'paused');assert.equal(f.view.repeatPreparation,undefined);assert.deepEqual(f.state.best,{});assert.match(f.messages.at(-1)!,/Keep the earlier notes/);
});
