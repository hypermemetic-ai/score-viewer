import test from 'node:test';
import assert from 'node:assert/strict';
import {calibrationKeyColor,type CalibrationKey} from '@hypermemetic-ai/fingering-calculator';
import {EFFORT_FILE,EFFORT_PROTOCOL,createEffortPlan,initialEffortArchive,effortWorkAt,effortSetupInstruction,validateEffortArchive,loadEffort,exportEffort,
 type EffortFiles,type EffortInstrument,type EffortArchive} from '../src/calibration-effort';
import {EffortController} from '../src/calibration-effort-controller';

class Files implements EffortFiles {
 data=new Map<string,Uint8Array>();names:string[]=[];hold=false;fail=false;writes=0;
 private pending?:{name:string;bytes:Uint8Array;resolve:()=>void;reject:(error:Error)=>void};
 async read(name:string){this.names.push(name);const v=this.data.get(name);return v?new Uint8Array(v):null;}
 write(name:string,bytes:Uint8Array):Promise<void>{
  this.names.push(name);this.writes++;if(this.fail)return Promise.reject(Error('Disk unavailable'));
  if(this.hold){assert.equal(this.pending,undefined);return new Promise((resolve,reject)=>{this.pending={name,bytes:new Uint8Array(bytes),resolve,reject};});}
  this.data.set(name,new Uint8Array(bytes));return Promise.resolve();
 }
 release(){const p=this.pending;assert.ok(p);this.pending=undefined;this.data.set(p.name,p.bytes);p.resolve();}
 reject(){const p=this.pending;assert.ok(p);this.pending=undefined;p.reject(Error('Disk unavailable'));}
}
const controller=(files:Files,onChange?:ConstructorParameters<typeof EffortController>[0]['onChange'])=>{
 let tick=0,id=0;return new EffortController({files,load:{value:initialEffortArchive('player')},id:()=>`collection-${++id}`,
  now:()=>new Date(Date.UTC(2026,9,11,17,0,tick++)).toISOString(),onChange});
};
const manual=(code:string,type:'key-down'|'key-up'='key-down',repeat=false)=>({kind:'manual' as const,type,code,repeat});
const midi=(note:number,type:'note-on'|'note-off'='note-on',velocity=64,channel=0)=>({kind:'midi' as const,type,deviceId:'instrument',note,velocity,channel});

test('all bounded targets share canonical identities and actual LH placements reflect complete key surfaces',()=>{
 for(const kind of ['conventional-piano','janko-four-row'] as const){
  const r=createEffortPlan(kind,'RH'),l=createEffortPlan(kind,'LH'),sum=kind==='conventional-piano'?124:120;
  assert.equal(r.trials.length,kind==='conventional-piano'?52:208);assert.equal(r.blocks.length,kind==='conventional-piano'?4:8);
  assert.deepEqual(r.trials.map(t=>t.id),l.trials.map(t=>t.id));assert.equal(l.anchorMidiPitches[0],kind==='conventional-piano'?64:60);
  const reflected=(patches:CalibrationKey['usable'])=>patches.map(p=>({...p,xMin:(kind==='conventional-piano'?48:0)-p.xMax,xMax:(kind==='conventional-piano'?48:0)-p.xMin}));
  const seen=new Set<number>();for(let i=0;i<r.trials.length;i++){
   assert.equal(r.trials[i].task.anchorBehavior,'participate-in-trill');assert.equal(r.trials[i].protocolVersion,EFFORT_PROTOCOL.version);
   assert.equal(r.trials[i].distanceSemitoneSteps,l.trials[i].distanceSemitoneSteps);
   const rp=[...r.trials[i].anchors,...r.trials[i].active],lp=[...l.trials[i].anchors,...l.trials[i].active];
   for(let j=0;j<rp.length;j++){
    assert.equal(rp[j].finger,lp[j].finger);const rk=r.keyboard.keys.find(k=>k.id===rp[j].keyId)!,lk=l.keyboard.keys.find(k=>k.id===lp[j].keyId)!;
    seen.add(rk.midiPitch-60);assert.equal(lk.midiPitch,sum-rk.midiPitch);assert.equal(lk.row,rk.row);assert.equal(lk.level,rk.level);
    if(kind==='conventional-piano')assert.equal(calibrationKeyColor(rk,'classic'),calibrationKeyColor(lk,'classic'));
    assert.deepEqual(lk.usable,reflected(rk.usable));assert.deepEqual(lk.body,reflected(rk.body!));
   }
  }
  assert.deepEqual([...seen].sort((a,b)=>a-b),Array.from({length:27},(_,i)=>i-13),'Every distance on both sides, including 13, was checked');
  const edit=createEffortPlan(kind);edit.trials[0].anchors[0].finger=5;assert.equal(createEffortPlan(kind).trials[0].anchors[0].finger,1,'No public mutation corrupts cached templates');
 }
});

test('one pooled collection per instrument retains actual hand and never touches legacy files',async()=>{
 const files=new Files(),legacyNames=['calibration-pilot-v1.json','calibration.json','preferences.json','bank/personal.json'];
 for(const name of legacyNames)files.data.set(name,new Uint8Array([255,0,3,7]));
 const before=structuredClone(files.data),c=controller(files);await c.start('conventional-piano');await c.prepare();await c.rateButton(1);
 const id=c.collection!.id,first=c.collection!.observations[0];await c.setPerformingHand('LH');
 assert.equal(c.state.current.needsSetup,true);assert.equal(await c.rateButton(2),false);await c.prepare();await c.rateButton(2);
 assert.equal(c.state.progress!.measured,2);assert.equal(c.collection!.observations[1].performingHand,'LH');
 assert.equal(c.collection!.observations[0].performingHand,'RH');assert.deepEqual(c.collection!.observations[0],first);
 assert.deepEqual(first.evidence.patternsPerformed,['combined-press','alternating-trill']);
 assert.equal(c.session!.plan.anchorMidiPitches[0],64);assert.equal(c.collection!.setups[1].performingHand,'LH');
 await c.start('conventional-piano');assert.equal(c.archive.collections.length,1);assert.equal(c.collection!.id,id);
 await c.start('janko-four-row');assert.equal(c.archive.collections.length,2);await c.resume('conventional-piano');assert.equal(c.state.progress!.measured,2);
 for(const name of legacyNames)assert.deepEqual(files.data.get(name),before.get(name));
 assert.ok(files.names.every(name=>name===EFFORT_FILE));assert.equal(JSON.stringify(c.archive).includes('held-throughout'),false);
 const raw=files.data.get(EFFORT_FILE)!,writes=files.writes,reopened=new EffortController({files,load:await loadEffort(files)});
 assert.equal(reopened.state.current.needsSetup,true);assert.equal(reopened.state.progress!.measured,2);assert.equal(files.writes,writes);assert.deepEqual(files.data.get(EFFORT_FILE),raw);
 assert.deepEqual(JSON.parse(reopened.export()).collections[0].observations,c.archive.collections[0].observations);
});

test('setup acknowledges the exact displayed instructions with actual fingers for every block and hand',async()=>{
 for(const kind of ['conventional-piano','janko-four-row'] as const){
  const files=new Files(),c=controller(files);await c.start(kind);
  for(const performingHand of ['RH','LH'] as const){
   await c.setPerformingHand(performingHand);
   for(const block of c.session!.plan.blocks){
    await c.navigate(block.trialIds[0]);const trial=c.state.current.trial!,instruction=effortSetupInstruction(trial);
    assert.equal(await c.prepare(),true);const setup=c.collection!.setups.at(-1)!;
    assert.equal(setup.attestedInstruction,instruction);assert.equal(setup.performingHand,performingHand);
    const names={1:'thumb',2:'index',3:'middle',4:'ring',5:'pinky'};
    assert.ok(instruction.includes(`Keep your ${names[trial.anchors[0].finger]} in the same spot`));
    assert.ok(instruction.includes(`Let your ${names[trial.active[0].finger]} bend, extend or spread`));
    assert.ok(instruction.endsWith(EFFORT_PROTOCOL.cue));assert.doesNotMatch(instruction,/reference finger|other finger|\{|\}/);
    for(const trialId of block.trialIds){const target=c.session!.trials.find(t=>t.id===trialId)!;assert.equal(effortSetupInstruction(target),instruction);}
    const forged=c.archive;forged.collections[0].setups.at(-1)!.attestedInstruction='Unshown setup instruction';
    assert.throws(()=>validateEffortArchive(forged),/Invalid effort setup attestation/);
   }
  }
 }
});

test('strict admission refuses forged hand contacts, old task reports, chronology, duplicates and control mismatches',async()=>{
 const files=new Files(),c=controller(files);await c.start('conventional-piano');await c.prepare();await c.rateButton(2);await c.rateButton(3);
 const mutate=(edit:(a:EffortArchive)=>void)=>{const a=c.archive;edit(a);assert.throws(()=>validateEffortArchive(a));};
 mutate(a=>{a.collections.push(structuredClone(a.collections[0]));});
 mutate(a=>{a.collections[0].observations[0].performingHand='LH';});
 mutate(a=>{a.collections[0].observations[0].evidence.patternsPerformed=['trill'] as never;});
 mutate(a=>{a.collections[0].observations[0].recordedAt='1900-01-01';});
 mutate(a=>{a.collections[0].observations[1].recordedAt=a.collections[0].setups[0].recordedAt;});
 mutate(a=>{a.collections[0].observations[0].input={kind:'manual',code:'Digit4'};});
 mutate(a=>{a.collections[0].observations[0].input={kind:'midi',deviceId:'x',channel:0,note:60};});
 mutate(a=>{a.collections[0].observations[0].contacts.other[0].finger=5;});
 mutate(a=>{a.collections[0].templateProvenance.calculatorRevision='wrong' as never;});
 mutate(a=>{a.collections[0].currentTrialId=null;});
 mutate(a=>{Object.assign(a.collections[0].observations[0].input,{timestamp_micros:999});});
});

test('malformed retained bytes are exportable, read-only and never replaced',async()=>{
 for(const raw of [new Uint8Array([255,0,254]),new TextEncoder().encode('{"version":"older"}')]){
  const files=new Files();files.data.set(EFFORT_FILE,raw);const load=await loadEffort(files);assert.ok(load.error);assert.deepEqual(load.raw,raw);
  const c=new EffortController({files,load});assert.equal(await c.start('conventional-piano'),false);assert.equal(c.state.readOnly,true);assert.equal(files.writes,0);
  const exported=JSON.parse(exportEffort(load));assert.deepEqual(new Uint8Array(Buffer.from(exported.data,'base64')),raw);assert.deepEqual(files.data.get(EFFORT_FILE),raw);
 }
 const load=await loadEffort({read:async()=>{throw Error('Cannot read');},write:async()=>assert.fail()});assert.ok(load.error);assert.equal(load.raw,undefined);
});

test('writes gate publication and failure leaves accepted target, hand, notes and history unchanged',async()=>{
 const files=new Files(),c=controller(files);files.hold=true;const start=c.start('conventional-piano');
 assert.equal(c.busy,true);assert.equal(c.collection,null);assert.equal(await c.start('janko-four-row'),false);files.release();await start;
 const setup=c.prepare();assert.equal(c.state.current.needsSetup,true);assert.equal(await c.rateButton(2),false);files.release();await setup;
 c.setNotes('Preserve this report');const before=c.archive,target=c.state.current.trial!.id,rate=c.rateButton(2);
 assert.equal(c.state.progress!.measured,0);assert.equal(c.state.current.trial!.id,target);assert.equal(await c.rateButton(1),false);files.reject();assert.equal(await rate,false);
 assert.deepEqual(c.archive,before);assert.equal(c.state.notes,'Preserve this report');assert.match(c.error!,/last saved evidence is unchanged/);
 const change=c.setPerformingHand('LH');assert.equal(c.collection!.performingHand,'RH');files.reject();assert.equal(await change,false);assert.deepEqual(c.archive,before);
 files.hold=false;await c.rateButton(2);assert.equal(c.collection!.observations[0].evidence.notes,'Preserve this report');assert.equal(c.state.notes,'');
});

test('correction and undo retain all reports and serialize navigation',async()=>{
 const files=new Files(),c=controller(files);await c.start('conventional-piano');await c.prepare();const first=c.state.current.trial!.id;
 await c.rateButton(0);const second=c.state.current.trial!.id;files.hold=true;const nav=c.navigate(first);
 assert.equal(c.state.current.trial!.id,second);assert.equal(await c.undo(0,'Wrong'),false);files.release();await nav;
 const correct=c.rateButton(3);files.release();await correct;assert.equal(c.collection!.observations.length,2);assert.equal(c.state.progress!.measured,1);
 const undo=c.undo(1,'Mistaken correction');files.reject();assert.equal(await undo,false);assert.equal(c.collection!.retractions.length,0);
 const retry=c.undo(1,'Mistaken correction');files.release();await retry;
 assert.equal(effortWorkAt(c.collection!,first).status,'measured');assert.equal(c.state.progress!.measured,1);
 const remove=c.undo(0,'Original mistaken too');files.release();await remove;assert.equal(c.state.progress!.measured,0);assert.equal(c.collection!.observations.length,2);
 assert.equal(await c.undo(0,'Duplicate'),false);
});

test('full prescribed collection counts each target once with 208/52 reports and eight/four acknowledged blocks',async()=>{
 for(const kind of ['conventional-piano','janko-four-row'] as EffortInstrument[]){
  const files=new Files(),c=controller(files);await c.start(kind);const ids=c.session!.trials.map(t=>t.id);
  for(let i=0;i<ids.length;i++){
   assert.equal(c.state.current.trial!.id,ids[i]);if(c.state.current.needsSetup)await c.prepare();assert.equal(await c.rateButton(i%5 as 0|1|2|3|4),true);
  }
  assert.equal(c.state.progress!.status,'complete');assert.equal(c.state.progress!.measured,ids.length);
  assert.equal(c.collection!.setups.length,kind==='conventional-piano'?4:8);assert.equal(c.state.current.trial,null);
  assert.deepEqual(c.collection!.observations.filter(o=>o.grade===4).map(o=>o.evidence.patternsPerformed),Array(c.collection!.observations.filter(o=>o.grade===4).length).fill([]));
  await c.undo(ids.length-1,'Retest');assert.equal(c.state.current.needsSetup,true);await c.prepare();await c.rateButton(2);
  assert.equal(c.state.progress!.measured,ids.length);assert.equal(c.collection!.observations.length,ids.length+1);assert.equal(c.collection!.retractions.length,1);
 }
});

test('break/dispose and flush preserve an accepted in-flight report without reviving setup or listeners',async()=>{
 const files=new Files();let calls=0;const c=controller(files,()=>calls++);await c.start('conventional-piano');files.hold=true;
 const prepared=c.prepare();c.break();files.release();await prepared;assert.equal(c.state.current.needsSetup,true);
 files.hold=false;await c.prepare();files.hold=true;const report=c.rateButton(1);c.dispose();const closedCalls=calls;
 let flushed=false;const flush=c.flush().then(()=>{flushed=true;});await Promise.resolve();assert.equal(flushed,false);
 files.release();await report;await flush;assert.equal(flushed,true);assert.equal(calls,closedCalls);assert.equal(c.state.current.needsSetup,true);
 assert.equal(await c.rateButton(0),false);const reopened=new EffortController({files,load:await loadEffort(files)});
 assert.equal(reopened.state.progress!.measured,1);assert.equal(reopened.state.current.needsSetup,true);
});

test('manual and MIDI edges withhold held/repeated/chord controls across setup and save; playing is never evidence',async()=>{
 const files=new Files(),c=controller(files);await c.start('conventional-piano');
 assert.equal(await c.input(manual('Digit0'),false),false);await c.prepare();assert.equal(await c.input(manual('Digit0'),false),false);
 await c.input(manual('Digit0','key-up'),false);files.hold=true;const rate=c.input(manual('Numpad2'),false);
 assert.equal(await c.input(manual('Digit1'),false),false);assert.equal(await c.input(manual('Numpad2','key-down',true),false),false);
 await c.input(manual('Numpad2','key-up'),false);files.release();await rate;assert.equal(await c.rateButton(3),false);
 await c.input(manual('Digit1','key-up'),false);files.hold=false;assert.equal(await c.input(midi(60),true),false);
 assert.equal(c.state.progress!.measured,1);assert.equal(await c.input(midi(84),false),false);
 assert.equal(await c.input(midi(84),true),true);assert.equal(await c.input(midi(84),true),false);
 await c.input(midi(84,'note-off',64,1),true);assert.equal(await c.input(midi(84),true),false);
 await c.input(midi(84,'note-on',0),true);assert.equal(await c.input(midi(84),true),true);
 assert.equal(c.collection!.observations.length,3);assert.deepEqual(Object.keys(c.collection!.observations[1].input),['kind','deviceId','channel','note']);
 c.break();assert.equal(c.state.current.needsSetup,true);assert.equal(await c.input(manual('Digit0'),false),false);
 await c.input(manual('Digit0','key-up'),false);await c.prepare();assert.equal(await c.input(manual('Digit0'),false),true);
 await c.input(manual('Digit0','key-up'),false);assert.equal(await c.input(midi(84,'note-on',64,16),true),false);assert.match(c.error!,/Invalid MIDI/);
 assert.equal(await c.input(midi(84),true),true);assert.equal(JSON.stringify(c.archive).includes('timestamp'),false);
});
