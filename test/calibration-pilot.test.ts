import test from 'node:test';
import assert from 'node:assert/strict';
import {PILOT_FILE,createPilotPlan,nominalPilotProfile,initialPilotArchive,validatePilotArchive,loadPilot,exportPilot,
 type PilotSetup,type PilotFiles} from '../src/calibration-pilot';
import {PilotController} from '../src/calibration-pilot-controller';

export const setup=(instrument:PilotSetup['instrument']='conventional-piano',anchors=[60]):PilotSetup=>({
 instrument,hand:'RH',anchorMidiPitches:anchors,setupId:'declared-setup',bodyMidlineXmm:0,
 reference:'Centered at middle C; nominal dimensions, no measured pose',
});
export class MemoryPilotFiles implements PilotFiles {
 bytes:Uint8Array|null=null;writes=0;names:string[]=[];hold=false;fail=false;
 private pending?:{bytes:Uint8Array;resolve:()=>void;reject:(error:Error)=>void};
 async read(name:string):Promise<Uint8Array|null>{this.names.push(name);return this.bytes?new Uint8Array(this.bytes):null;}
 write(name:string,bytes:Uint8Array):Promise<void>{
  this.names.push(name);this.writes++;const copy=new Uint8Array(bytes);
  if(this.fail)return Promise.reject(Error('Disk unavailable'));
  if(this.hold){
   assert.equal(this.pending,undefined,'Writes must be serialized');
   return new Promise((resolve,reject)=>{this.pending={bytes:copy,resolve,reject};});
  }
  this.bytes=copy;return Promise.resolve();
 }
 release():void {const p=this.pending;assert.ok(p);this.pending=undefined;this.bytes=p.bytes;p.resolve();}
 reject():void {const p=this.pending;assert.ok(p);this.pending=undefined;p.reject(Error('Disk unavailable'));}
}
export const controller=(files:MemoryPilotFiles,onChange?:ConstructorParameters<typeof PilotController>[0]['onChange'])=>{
 let tick=0,id=0;
 return new PilotController({files,load:{value:initialPilotArchive('retained-player')},id:()=>`session-${++id}`,
  now:()=>new Date(Date.UTC(2026,9,11,17,0,tick++)).toISOString(),onChange});
};

test('canonical plans use declared editable nominal profiles and refuse truncated coverage',()=>{
 const janko=createPilotPlan(setup('janko-four-row'));
 assert.equal(janko.trials.length,208);assert.equal(janko.blocks.length,8);
 assert.equal(createPilotPlan(setup()).trials.length,52);
 assert.equal(createPilotPlan({...setup('conventional-piano',[60,61]),hand:'LH'}).trials.length,104);
 assert.equal(janko.keyboard.provenance.kind,'nominal');
 assert.equal(Math.min(...janko.keyboard.keys.map(k=>k.midiPitch)),21);
 assert.equal(Math.max(...janko.keyboard.keys.map(k=>k.midiPitch)),108);
 const profile=nominalPilotProfile('janko-four-row');assert.equal(profile.instrument,'janko-four-row');
 if(profile.instrument!=='janko-four-row')throw Error('Wrong profile');
 assert.deepEqual([profile.geometry.usableWidthMm,profile.geometry.sideMarginMm,profile.geometry.oppositeParityGapMm],[9,.5,5]);
 profile.geometry.rowDepthsMm[2]=41;
 const changed=createPilotPlan({...setup('janko-four-row'),profile});
 assert.notEqual(changed.keyboard.geometryId,janko.keyboard.geometryId,'Dimension edits need distinct literal physical identity');
 assert.notEqual(changed.trials[0].id,janko.trials[0].id);
 for(const anchor of [21,108])assert.throws(()=>createPilotPlan(setup('conventional-piano',[anchor])),/incomplete target coverage/);
 assert.throws(()=>createPilotPlan({...setup(),profile}),/differs/);
 assert.throws(()=>createPilotPlan(setup('janko-four-row',[60,61])),/exactly one anchor/);
});

test('independent file retains invalid and unsupported bytes losslessly and never overwrites them',async()=>{
 for(const bytes of [new Uint8Array([0xff,0x00,0xfe]),new TextEncoder().encode('{"version":"old","data":5}')]){
  const files=new MemoryPilotFiles();files.bytes=bytes;const loaded=await loadPilot(files);
  assert.ok(loaded.error);assert.deepEqual(loaded.raw,bytes);
  const retained=JSON.parse(exportPilot(loaded));assert.equal(retained.bytes,bytes.length);
  assert.deepEqual(new Uint8Array(Buffer.from(retained.data,'base64')),bytes);
  const c=new PilotController({files,load:loaded});
  assert.equal(c.state.readOnly,true);assert.equal(await c.start(setup()),false);assert.equal(files.writes,0);
  assert.deepEqual(files.bytes,bytes);assert.deepEqual(files.names,[PILOT_FILE]);
 }
 const loaded=await loadPilot({read:async()=>{throw Error('Read blocked');},write:async()=>assert.fail('Must remain read-only')});
 assert.ok(loaded.error);assert.equal(loaded.raw,undefined);
});

test('archive retains player and separate sessions; reopen clears readiness without rewriting history',async()=>{
 const files=new MemoryPilotFiles(),c=controller(files);
 assert.equal(await c.start(setup()),true);assert.equal(await c.prepare(),true);c.setNotes('Direct player report');
 assert.equal(await c.rateButton(2),true);
 const first=c.session!.id,obs=structuredClone(c.session!.observations);
 assert.equal(await c.start(setup('janko-four-row')),true);
 assert.equal(c.archive.sessions.length,2);assert.equal(c.archive.playerId,'retained-player');
 assert.equal(await c.resume(first),true);assert.equal(c.state.current.needsSetup,true);
 assert.deepEqual(c.session!.observations,obs);assert.equal(c.state.progress!.measured,1);
 const writes=files.writes,raw=new Uint8Array(files.bytes!),loaded=await loadPilot(files),opened=new PilotController({files,load:loaded});
 assert.equal(opened.state.current.needsSetup,true);assert.deepEqual(opened.session!.observations,obs);
 assert.equal(files.writes,writes);assert.deepEqual(files.bytes,raw);
 assert.deepEqual(JSON.parse(opened.export()).sessions.find((s:{id:string})=>s.id===first).observations,obs);
 assert.ok(files.names.every(name=>name===PILOT_FILE),'Legacy calibration, scores and practice remain outside this file');
 const bad=structuredClone(c.archive);bad.sessions.push(structuredClone(bad.sessions[0]));
 assert.throws(()=>validatePilotArchive(bad),/duplicated/);
 bad.sessions.pop();bad.sessions[0].provenance.playerId='foreign';assert.throws(()=>validatePilotArchive(bad),/identity differs/);
 assert.throws(()=>validatePilotArchive({...c.archive,activeSessionId:'foreign'}),/Unknown active/);
});

test('start and setup publish only after disk acceptance; failed rating retains target, notes and evidence',async()=>{
 const files=new MemoryPilotFiles(),c=controller(files);files.hold=true;
 const start=c.start(setup());assert.equal(c.busy,true);assert.equal(c.session,null);
 assert.equal(await c.start(setup('janko-four-row')),false);assert.equal(files.writes,1);
 files.release();assert.equal(await start,true);
 const preparation=c.prepare();assert.equal(c.state.current.needsSetup,true);
 assert.equal(await c.rateButton(0),false);files.release();assert.equal(await preparation,true);
 const current=c.session!.currentTrialId;c.setNotes('Keep on failed save');
 const rating=c.rateButton(1);assert.equal(c.state.progress!.measured,0);assert.equal(c.session!.currentTrialId,current);
 assert.equal(await c.rateButton(2),false);files.reject();assert.equal(await rating,false);
 assert.match(c.error!,/Disk unavailable/);assert.equal(c.state.progress!.measured,0);
 assert.equal(c.session!.currentTrialId,current);assert.equal(c.state.notes,'Keep on failed save');
 files.hold=false;assert.equal(await c.rateButton(1),true);assert.equal(c.state.progress!.measured,1);
 assert.equal(c.session!.observations[0].evidence.notes,'Keep on failed save');assert.equal(c.state.notes,'');
});

test('navigation, correction, undo and selection are serialized and recover from rejected writes',async()=>{
 const files=new MemoryPilotFiles(),c=controller(files);await c.start(setup());await c.prepare();
 const first=c.session!.currentTrialId!;await c.rateButton(0);const second=c.session!.currentTrialId!;
 files.hold=true;const navigation=c.navigate(first);assert.equal(c.session!.currentTrialId,second);
 assert.equal(await c.undo(0,'Accidental input'),false);files.reject();assert.equal(await navigation,false);
 assert.equal(c.session!.currentTrialId,second);assert.equal(c.state.progress!.measured,1);
 const navigate=c.navigate(first);files.release();assert.equal(await navigate,true);
 const correction=c.rateButton(3);files.release();assert.equal(await correction,true);
 assert.equal(c.session!.observations.length,2);assert.equal(c.state.progress!.measured,1);
 const undo=c.undo(1,'Correcting a mistaken judgment');assert.equal(c.session!.retractions.length,0);
 files.reject();assert.equal(await undo,false);assert.equal(c.session!.retractions.length,0);
 const retry=c.undo(1,'Correcting a mistaken judgment');files.release();assert.equal(await retry,true);
 assert.equal(c.session!.retractions.length,1);assert.equal(c.state.progress!.measured,1);
 const remove=c.undo(0,'Withdraw original too');files.release();assert.equal(await remove,true);
 assert.equal(c.state.progress!.measured,0);assert.equal(c.session!.currentTrialId,first);
 const before=c.session;const resume=c.resume(c.session!.id);assert.equal(c.state.current.needsSetup,false);
 files.reject();assert.equal(await resume,false);assert.deepEqual(c.session,before);
});

test('break or disposal during a write retains durable judgments without reviving setup or callbacks',async()=>{
 const files=new MemoryPilotFiles();let calls=0;const c=controller(files,()=>calls++);
 await c.start(setup());files.hold=true;const prepare=c.prepare();c.break();files.release();
 assert.equal(await prepare,true);assert.equal(c.state.current.needsSetup,true);assert.equal(c.state.broken,true);
 files.hold=false;await c.prepare();files.hold=true;const rating=c.rateButton(1);
 c.dispose();const afterClose=calls;files.release();assert.equal(await rating,true);assert.equal(calls,afterClose);
 assert.equal(await c.rateButton(0),false);assert.equal(c.state.current.needsSetup,true);
 const opened=new PilotController({files,load:await loadPilot(files)});
 assert.equal(opened.state.progress!.measured,1);assert.equal(opened.state.current.needsSetup,true);
 assert.equal(opened.session!.blockSetups.length,2);
});

test('a full prescribed round counts unique active judgments including grade4 and reopens after undo',async()=>{
 const files=new MemoryPilotFiles(),c=controller(files);await c.start(setup());
 for(let i=0;i<52;i++){
  if(c.state.current.needsSetup)assert.equal(await c.prepare(),true);
  assert.equal(await c.rateButton(i===51?4:0),true);
 }
 assert.equal(c.state.progress!.status,'complete');assert.equal(c.state.progress!.measured,52);
 assert.equal(c.state.current.trial,null);assert.equal(c.session!.blockSetups.length,4);
 assert.equal(c.session!.observations[51].evidence.patternsPerformed.length,0);
 await c.undo(51,'Retest final task');assert.equal(c.state.progress!.remaining,1);assert.equal(c.state.current.needsSetup,true);
 await c.prepare();await c.rateButton(2);assert.equal(c.state.progress!.status,'complete');
 assert.equal(c.session!.observations.length,53);assert.equal(c.session!.retractions.length,1);
});

const midi=(note:number,type:'note-on'|'note-off'='note-on',velocity=64,channel=0)=>({
 kind:'midi' as const,type,deviceId:'current-instrument',channel,note,velocity,
});
const manual=(code:string,type:'key-down'|'key-up'='key-down',repeat=false)=>({kind:'manual' as const,type,code,repeat});

test('held test notes cannot become new controls after same-block navigation, and never become evidence',async()=>{
 const files=new MemoryPilotFiles(),c=controller(files);await c.start(setup());await c.prepare();
 const first=c.session!.trials[0].id,later=c.session!.trials[11].id;
 await c.navigate(later);assert.equal(await c.input(midi(72),true),false);
 await c.navigate(first);assert.equal(await c.input(midi(72),true),false,'Same held pitch is not a fresh control after span change');
 assert.equal(c.state.progress!.measured,0);
 // A held test note does not make the hand's manual rating unavailable.
 c.setNotes('Player judged both task parts');
 assert.equal(await c.input(manual('Numpad2'),true),true);
 await c.input(manual('Numpad2','key-up'),true);
 await c.input(midi(72,'note-on',0),true);
 const event={...midi(72),timestamp_micros:123,driver_micros:456,filtered:false};
 assert.equal(await c.input(event,true),true);
 const observation=c.session!.observations[1];assert.equal(observation.grade,0);
 assert.deepEqual(Object.keys(observation.input),['kind','deviceId','channel','note']);
 assert.deepEqual(Object.keys(observation.evidence),['patternsPerformed']);
 assert.equal(c.session!.observations[0].evidence.notes,'Player judged both task parts');
 const saved=JSON.parse(new TextDecoder().decode(files.bytes!));
 assert.equal(JSON.stringify(saved).includes('timestamp_micros'),false);assert.equal(JSON.stringify(saved).includes('driver_micros'),false);
 assert.equal(JSON.stringify(saved).includes('midiHeld'),false);
});

test('MIDI down state survives null-trial setup and pending writes with complete control-chord release',async()=>{
 const files=new MemoryPilotFiles(),c=controller(files);await c.start(setup());
 assert.equal(await c.input(midi(84),true),false,'Unprepared control has no judgment');
 await c.prepare();assert.equal(await c.input(midi(84),true),false,'Preparation does not turn a held command into a new press');
 await c.input(midi(84,'note-off'),true);files.hold=true;
 const rating=c.input(midi(84),true);assert.equal(c.busy,true);
 assert.equal(await c.input(midi(86),true),false,'Second control while saving does not grade unseen target');
 await c.input(midi(84,'note-off'),true);files.release();assert.equal(await rating,true);
 assert.equal(c.state.progress!.measured,1);assert.equal(await c.rateButton(2),false,'Suppressed chord control must also be released');
 await c.input(midi(86,'note-on',0),true);files.hold=false;
 assert.equal(await c.input(manual('Digit3'),true),true);await c.input(manual('Digit3','key-up'),true);
 assert.equal(c.state.progress!.measured,2);
});

test('raw Digit and Numpad holds, repeats, button presses and offline input share the control guard',async()=>{
 const files=new MemoryPilotFiles(),c=controller(files);await c.start(setup());await c.prepare();files.hold=true;
 const first=c.input(manual('Digit0'),false);assert.equal(await c.input(manual('Numpad2'),false),false);
 assert.equal(await c.input(manual('Digit0','key-down',true),false),false);
 assert.equal(await c.rateButton(4),false);assert.equal(c.session!.observations.length,0);
 await c.input(manual('Digit0','key-up'),false);files.release();assert.equal(await first,true);
 assert.equal(await c.rateButton(4),false,'Button cannot synthesize release of the still-held Numpad control');
 await c.input(manual('Numpad2','key-up'),false);files.hold=false;
 assert.equal(await c.rateButton(3),true);assert.equal(c.state.progress!.measured,2);
 assert.equal(await c.input(manual('Key2'),false),false);
 assert.equal(await c.input(manual('Digit2'),false),true);await c.input(manual('Digit2','key-up'),false);
 assert.equal(await c.input(midi(84),false),false,'Disconnected MIDI cannot rate');
 assert.equal(await c.input(manual('Numpad1'),false),true);
 assert.deepEqual(c.session!.observations.map(o=>o.input.kind==='manual'?o.input.code:''),['Digit0','Digit3','Digit2','Numpad1']);
});

test('controls pressed during a button save or setup acknowledgment require release before later ratings',async()=>{
 const files=new MemoryPilotFiles(),c=controller(files);await c.start(setup());
 assert.equal(await c.input(manual('Digit0'),false),false);await c.prepare();
 assert.equal(await c.input(manual('Digit0'),false),false);assert.equal(await c.rateButton(1),false);
 await c.input(manual('Digit0','key-up'),false);files.hold=true;
 const save=c.rateButton(1);assert.equal(await c.input(manual('Numpad4'),false),false);
 files.release();await save;assert.equal(await c.rateButton(2),false);
 await c.input(manual('Numpad4','key-up'),false);files.hold=false;
 assert.equal(await c.rateButton(2),true);
});

test('logical MIDI channels retain independent edges; lifecycle reset clears only transient state',async()=>{
 const files=new MemoryPilotFiles(),c=controller(files);await c.start(setup());await c.prepare();
 assert.equal(await c.input(midi(84),true),true);await c.input(midi(84,'note-off',64,1),true);
 assert.equal(await c.input(midi(84),true),false,'A release on another channel cannot release channel0');
 c.reset();assert.equal(await c.input(midi(84,'note-on',64,15),true),true);
 const obs=c.session!.observations.length;c.break();assert.equal(c.state.current.needsSetup,true);
 assert.equal(await c.input(manual('Digit0'),false),false);
 await c.input(manual('Digit0','key-up'),false);await c.prepare();
 assert.equal(await c.input(manual('Digit0'),false),true);
 assert.equal(c.session!.observations.length,obs+1);
 await c.input(manual('Digit0','key-up'),false);
 assert.equal(await c.input(midi(84,'note-on',64,16),true),false);assert.match(c.error!,/Invalid MIDI/);
 assert.equal(await c.input(midi(84,'note-on',64,0),true),true,'Invalid event did not poison the valid identity');
});

test('closing exposes an ordered flush barrier before a new load and never revives disposed listeners',async()=>{
 const files=new MemoryPilotFiles(),c=controller(files);await c.start(setup());await c.prepare();files.hold=true;
 const save=c.rateButton(2);c.dispose();let flushed=false;const wait=c.flush().then(()=>{flushed=true;});
 await Promise.resolve();assert.equal(flushed,false);files.release();await save;await wait;assert.equal(flushed,true);
 const reopened=new PilotController({load:await loadPilot(files),files});
 assert.equal(reopened.state.progress!.measured,1);assert.equal(reopened.state.current.needsSetup,true);
});

test('all208 Janko judgments require eight saved block setups and grade4 never prunes later targets',async()=>{
 const files=new MemoryPilotFiles(),c=controller(files);assert.equal(await c.start(setup('janko-four-row')),true);
 const required=c.session!.trials.map(t=>t.id);let blocks=0;
 for(let i=0;i<208;i++){
  assert.equal(c.session!.currentTrialId,required[i]);
  if(c.state.current.needsSetup){blocks++;assert.equal(await c.prepare(),true);}
  assert.equal(await c.rateButton(i%7===0?4:0),true);
 }
 assert.equal(blocks,8);assert.equal(c.session!.blockSetups.length,8);
 assert.equal(c.state.progress!.total,208);assert.equal(c.state.progress!.measured,208);
 assert.equal(c.state.progress!.remaining,0);assert.equal(c.state.progress!.completeBlocks,8);
 assert.equal(c.state.progress!.status,'complete');assert.equal(c.state.progress!.inference,'none');
 assert.deepEqual(c.session!.observations.map(o=>o.trialId),required);
 assert.equal(files.writes,217);assert.equal(c.session!.currentTrialId,null);
});
