import test from 'node:test';import assert from 'node:assert/strict';
import {PracticeView} from '../src/practice-view';import {host,practiceAudio} from '../src/host';
import {referenceFixture} from './support/reference-score';
import {planPractice} from '../src/practice';

const packageFixture=await referenceFixture(new URL('../vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.isoscore',import.meta.url)),plan=planPractice(packageFixture);

test('real PracticeView Ready routes global output and replaces a cached clock after a new choice',async t=>{
 const previous={clock:host.midiClock,begin:practiceAudio.begin,stop:practiceAudio.stop,error:practiceAudio.onError};const devices:string[]=[];let selected='chosen-output';
 host.midiClock=async()=>10000000;practiceAudio.begin=async(device)=>{devices.push(device);return 10200000;};practiceAudio.stop=async()=>{};practiceAudio.onError=async()=>()=>{};
 const view=Object.create(PracticeView.prototype) as any,ready:number[]=[];
 Object.assign(view,{plan,manual:{cancel(){}},contacts:{clear(){}},session:{chunk:plan.chunks[0],startTick:plan.chunks[0].start,tickMs:1,phase:'ready',ready(start:number){ready.push(start);this.phase='countin';},pause(){this.phase='paused';}},state:{working:180,audioOutput:'old-piece-output'},options:{connected:()=>true,audioOutput:()=>selected},audioOutputs:{supported:true},startGeneration:0,disposed:false,preview:{clear(){}},app:{querySelector:()=>null}});
 view.paint=()=>{};view.paintControls=()=>{};view.status=()=>{};
 t.after(async()=>{await view.clock?.stop();host.midiClock=previous.clock;practiceAudio.begin=previous.begin;practiceAudio.stop=previous.stop;practiceAudio.onError=previous.error;});
 await view.action('ready');const first=view.clock;assert.deepEqual(devices,['chosen-output']);assert.equal(first.output,'chosen-output');
 selected='';await view.action('ready');assert.notEqual(view.clock,first);assert.deepEqual(devices,['chosen-output','']);assert.equal(view.clock.output,'');assert.deepEqual(ready,[10200,10200]);assert.equal(view.state.audioOutput,'old-piece-output');
 delete view.options.audioOutput;await view.action('ready');assert.equal(devices.at(-1),'old-piece-output');assert.equal(view.clock.output,'old-piece-output');
});
