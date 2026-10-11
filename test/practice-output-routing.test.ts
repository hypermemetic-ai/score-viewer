import test from 'node:test';import assert from 'node:assert/strict';
import {PracticeView} from '../src/practice-view';import {host,practiceAudio} from '../src/host';
import {referenceFixture} from './support/reference-score';
import {planPractice,PracticeSession,initialPractice} from '../src/practice';
import {scoreTickMs} from '../src/score-clock';import {practiceTiming} from '../src/practice-timing';

const packageFixture=await referenceFixture(new URL('../vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.isoscore',import.meta.url)),plan=planPractice(packageFixture);

test('real PracticeView Ready routes global output and replaces a cached clock after a new choice',async t=>{
 const previous={clock:host.midiClock,begin:practiceAudio.begin,stop:practiceAudio.stop,error:practiceAudio.onError};const devices:string[]=[],durations:number[]=[];let selected='chosen-output';
 host.midiClock=async()=>10000000;practiceAudio.begin=async(device,_bpm,duration)=>{devices.push(device);durations.push(duration);return 10200000;};practiceAudio.stop=async()=>{};practiceAudio.onError=async()=>()=>{};
 const view=Object.create(PracticeView.prototype) as any,ready:number[]=[];
 const state={...initialPractice(plan),working:180,audioOutput:'old-piece-output'},session=new PracticeSession(plan,plan.chunks[0],state,true),startSession=session.ready.bind(session);
 session.ready=(...args)=>{ready.push(args[0]);startSession(...args);};
 Object.assign(view,{mode:'timed',previousMode:'timed',readingPaused:true,feedback:'',plan,manual:{cancel(){}},contacts:{clear(){}},session,state,options:{connected:()=>true,audioOutput:()=>selected},audioOutputs:{supported:true},startGeneration:0,disposed:false,preview:{clear(){}},app:{querySelector:()=>null}});
 // This audio-routing harness assumes successful visual admission; retain the
 // real Ready/preflight and clock logic without requiring a browser renderer.
 view.paint=()=>{};view.paintScore=()=>{};view.paintControls=()=>{};view.status=()=>{};
 t.after(async()=>{await view.clock?.stop();host.midiClock=previous.clock;practiceAudio.begin=previous.begin;practiceAudio.stop=previous.stop;practiceAudio.onError=previous.error;});
 await view.action('ready');const first=view.clock;assert.deepEqual(devices,['chosen-output']);assert.equal(first.output,'chosen-output');
 selected='';await view.action('ready');assert.notEqual(view.clock,first);assert.deepEqual(devices,['chosen-output','']);assert.equal(view.clock.output,'');assert.deepEqual(ready,[10200,10200]);assert.equal(view.state.audioOutput,'old-piece-output');
 delete view.options.audioOutput;await view.action('ready');assert.equal(devices.at(-1),'old-piece-output');assert.equal(view.clock.output,'old-piece-output');
 const expected=(session.completionTick-session.startTick)*scoreTickMs(plan,state.working)+practiceTiming(state.working,session.sourcePulseGrid).countInMs;
 assert.deepEqual(durations,[expected,expected,expected]);assert.equal(session.phase,'countin');assert.deepEqual(state.best,{});
});
