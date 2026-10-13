import test from 'node:test';
import assert from 'node:assert/strict';
import {STRETCH_CALIBRATION_KEYBOARD_PROFILE as profile,STRETCH_CALIBRATION_PROFILE_SHA256,
 type StretchCalibrationGeometry,type StretchCalibrationContact} from '@hypermemetic-ai/fingering-calculator';
import {canonicalGeometryHash,initialStretchArchive,loadStretch,validateStretchArchive,validateStretchSession,
 relativeDifferenceMm,recommendedSpanSteps,effectivePairReports,tripleApplicability,stretchProgress,stretchSlotStatus,terminalApplicability,
 type StretchFiles,type StretchArchive,type PairStretchObservation} from '../src/stretch-calibration';
import {StretchController} from '../src/stretch-calibration-controller';

async function fixtureGeometry(range:readonly [number,number]=[48,96]):Promise<StretchCalibrationGeometry>{
 const g:StretchCalibrationGeometry={version:'sloping-calibration-geometry-v1',geometryId:`fixture-${range.join('-')}`,keyboardId:'operator-keyboard',profileId:profile.profileId,profileSha256:STRETCH_CALIBRATION_PROFILE_SHA256,snapshotSha256:'',units:'mm',reference:'Authored geometry fixture',originMidiPitch:60,admittedMidiRange:range,actuators:[],surfaces:[]};
 for(let p=range[0];p<=range[1];p++){
  const f=profile.forms.find(f=>(f.midiPitchClasses as readonly number[]).includes(p%12))!,x=(p-60)*13.75;
  g.actuators.push({id:`key-${p}`,midiPitch:p,bodyForm:f.form,originXmm:x,pressedMotion:structuredClone(profile.pressedMotion)});
  for(const t of f.playableTerraces)g.surfaces.push({id:`key-${p}-row-${t.row}`,actuatorId:`key-${p}`,midiPitch:p,xMinMm:x-4.5,xMaxMm:x+4.5,...t});
 }
 g.snapshotSha256=await canonicalGeometryHash(g);return g;
}
function memoryFiles(){let bytes:Uint8Array|undefined,writes=0;return {files:{async read(){return bytes;},async write(_name:string,next:Uint8Array){bytes=new Uint8Array(next);writes++;}} satisfies StretchFiles,get bytes(){return bytes;},get writes(){return writes;}};}
async function collector(hand:'RH'|'LH'='RH',range:readonly [number,number]=[48,96]){
 const memory=memoryFiles();let serial=0;const c=new StretchController({load:{value:initialStretchArchive()},files:memory.files,id:()=>`id-${++serial}`,now:()=> '2026-10-12T12:00:00.000Z'});
 const geometry=await fixtureGeometry(range);assert.equal(await c.createCollection({geometry,provenance:{playerId:'fixture-player',hand,setupId:'fixture-setup',bodyMidlineXmm:0,seatingReference:'operator-selected',referenceLocation:{id:'central',kind:'operator-selected-central',xMm:13.75}}}),true);
 return {c,memory,geometry};
}
async function reach(c:StretchController,values=[40,12,-8,-20]){for(const differenceMm of values)assert.equal(await c.saveReach({kind:'signed-mm',differenceMm,method:'direct-ruler'}),true);}
function thirdContact(g:StretchCalibrationGeometry,pitch:number,finger=3):StretchCalibrationContact {const s=g.surfaces.find(s=>s.midiPitch===pitch&&s.row===1)!;return {finger:finger as 3,actuatorId:s.actuatorId,midiPitch:pitch,row:s.row,keyState:'depressed',location:{kind:'surface-region',surfaceId:s.id,uRange:[0,1],vRange:[0,1]}};}

test('four common-frame readings retain percentages and sign; hand collections remain independent',async()=>{
 const {c,geometry}=await collector();
 assert.equal(await c.saveReach({kind:'window-fractions',windowId:'forward-window',firstFraction:1,secondFraction:-.2,axisStartMm:0,axisEndMm:50,windowReference:'Mapped common forward window'},JSON.stringify({raw:'-20',primaryFinger:1,method:'percent'})),true);
 for(const differenceMm of [10,-5,-15])await c.saveReach({kind:'signed-mm',differenceMm,method:'direct'});
 assert.equal(relativeDifferenceMm(c.session!,1,5),-70);assert.equal(recommendedSpanSteps(c.session!,[1,2]),6);
 const first=c.session!,original=structuredClone(first.plan);geometry.surfaces[0].depthMinMm=-999;
 assert.deepEqual(c.session!.plan,original);
 assert.equal(await c.createCollection({geometry:original.geometry,provenance:{...original.provenance,hand:'LH',setupId:'left-setup'}}),true);
 assert.equal(c.archive.sessions.length,2);assert.equal(c.session!.entries.length,0);assert.deepEqual(c.archive.sessions[0].entries,first.entries);
 assert.equal(await c.selectCollection(first.id),true);assert.equal(c.state.resumeRequired,true);
});

test('earlier whole-terrace readings retain raw evidence but do not infer the corrected length difference',async()=>{
 const {c,memory}=await collector();
 try{
  assert.equal(await c.saveReach({kind:'window-fractions',windowId:'old-frame:row-1:depth-window',firstFraction:.5,secondFraction:1,axisStartMm:0,axisEndMm:59.8,windowReference:'old geometry; depth away from player; row 1 near/far physical terrace edges'},'{"rawOtherPercentage":"50","rawPrimaryPercentage":"100"}'),true);
  const before=c.export();
  assert.equal(relativeDifferenceMm(c.session!,1,2),null);assert.equal(recommendedSpanSteps(c.session!,[1,2]),2);
  assert.equal(c.export(),before,'derivation does not rewrite or withdraw earlier observations');
  const admitted=await loadStretch(memory.files);assert.ok(!admitted.error);assert.equal(relativeDifferenceMm(admitted.value.sessions[0],1,2),null);
 }finally{c.dispose();}
});

test('malformed UTF-8 preserves every byte and blocks all writes',async()=>{
 const bytes=new Uint8Array([0xff,0,0x7b,0x7d]);let writes=0;
 const files:StretchFiles={async read(){return bytes;},async write(){writes++;}};
 const loaded=await loadStretch(files),c=new StretchController({load:loaded,files});
 assert.equal(c.state.readOnly,true);assert.deepEqual(c.exportBytes(),bytes);
 assert.equal(await c.skip(),false);assert.equal(writes,0);assert.throws(()=>c.export());
 const empty=await loadStretch({async read(){return new Uint8Array();}});assert.ok(empty.error);assert.equal(empty.raw!.length,0);
 const unreadable=await loadStretch({async read(){throw Error('read denied');}});const blocked=new StretchController({load:unreadable,files});assert.throws(()=>blocked.exportBytes(),/could not be read/);assert.equal(await blocked.skip(),false);
});

test('partially mapped measurement windows remain valid raw evidence without inventing millimeters',async()=>{
 const {c}=await collector();assert.equal(await c.saveReach({kind:'window-fractions',windowId:'partial',firstFraction:1,secondFraction:.4,axisStartMm:34,axisEndMm:null,windowReference:'Only near endpoint verified'}),true);
 assert.equal(relativeDifferenceMm(c.session!,1,2),null);assert.equal(recommendedSpanSteps(c.session!,[1,2]),2);
});

test('an unavailable start stays open; grade 4 continues and maximum leaves unknowns',async()=>{
 const {c}=await collector();await reach(c);
 assert.equal(await c.prepareBaseline(),true);assert.equal(c.state.current.trial!.distanceSemitoneSteps,4);assert.equal(await c.prepare(),true);
 assert.equal(await c.rate(5),true);assert.equal(c.session!.entries.filter(e=>e.kind==='pair-stretch').length,1);assert.equal(c.session!.entries.filter(e=>e.kind==='pair-sweep-terminal').length,0);assert.equal(c.state.current.needsSetup,true);
 assert.equal(await c.adjustSpan(2),true);assert.equal(await c.prepare(),true);assert.equal(await c.rate(4),true);
 assert.equal(c.state.current.trial!.distanceSemitoneSteps,8);assert.equal(c.session!.entries.filter(e=>e.kind==='pair-sweep-terminal').length,0);
 assert.equal(await c.markMaximum(),true);
 const terminal=c.session!.entries.find(e=>e.kind==='pair-sweep-terminal')!;assert.equal(terminal.reason,'maximum-reachable');assert.equal(terminal.firstUnavailableObservationId,null);
 assert.equal(effectivePairReports(c.session!).length,2);assert.equal(c.state.progress!.sweeps.maximum,1);assert.equal(c.state.current.trial,null);
});

test('first unavailable report ends only the outward sweep and has exact observed references',async()=>{
 const {c}=await collector();await reach(c,[0,0,0,0]);await c.prepareBaseline();await c.prepare();await c.rate(0);await c.rate(5);
 const reports=effectivePairReports(c.session!),terminal=c.session!.entries.find(e=>e.kind==='pair-sweep-terminal')!;
 assert.equal(reports.length,2);assert.equal(terminal.reason,'first-unavailable');assert.equal(terminal.lastReachableObservationId,reports[0].id);assert.equal(terminal.firstUnavailableObservationId,reports[1].id);
 assert.equal(c.session!.pairTrials.length,2);assert.equal(c.state.progress!.sweeps.unavailable,1);
});

test('an instrument edge is a coverage terminal and never invents an unavailable grade',async()=>{
 const {c}=await collector('RH',[61,63]);await reach(c,[0,0,0,0]);await c.prepareBaseline();await c.prepare();assert.equal(await c.rate(4),true);
 const terminal=c.session!.entries.find(e=>e.kind==='pair-sweep-terminal')!;assert.equal(terminal.reason,'coverage-edge');assert.equal(terminal.firstUnavailableObservationId,null);assert.equal(effectivePairReports(c.session!).length,1);
});

test('durable publication and all-control release gate survive simultaneous keys and save latency',async()=>{
 const {c,memory}=await collector();await reach(c,[0,0,0,0]);await c.prepareBaseline();await c.prepare();
 let resolve!:()=>void;const gate=new Promise<void>(done=>{resolve=done;}),original=memory.files.write;
 memory.files.write=async(name,bytes)=>{await gate;await original(name,bytes);};
 const before=c.state.current.trial!.id,first=c.inputKey({type:'keydown',code:'Digit1'});
 assert.equal(c.state.busy,true);assert.equal(c.state.current.trial!.id,before);assert.equal(effectivePairReports(c.session!).length,0);
 assert.equal(await c.inputKey({type:'keydown',code:'Digit2'}),false);resolve();assert.equal(await first,true);
 assert.notEqual(c.state.current.trial!.id,before);assert.equal(await c.inputKey({type:'keydown',code:'Digit1',repeat:true}),false);
 await c.inputKey({type:'keyup',code:'Digit1'});assert.equal(await c.inputKey({type:'keydown',code:'Numpad3'}),false);
 await c.inputKey({type:'keyup',code:'Digit2'});await c.inputKey({type:'keyup',code:'Numpad3'});
 assert.equal(await c.inputKey({type:'keydown',code:'Numpad3'}),true);assert.equal(effectivePairReports(c.session!).length,2);
 assert.equal(await c.rate(2),false);await c.inputKey({type:'keyup',code:'Numpad3'});
});

test('failed writes retain accepted state and interrupted pending writes do not rearm contacts',async()=>{
 const {c,memory}=await collector();await reach(c,[0,0,0,0]);await c.prepareBaseline();await c.prepare();const before=c.session!;
 const original=memory.files.write;memory.files.write=async()=>{throw Error('disk unavailable');};assert.equal(await c.rate(2),false);assert.deepEqual(c.session,before);assert.match(c.state.error!,/last saved evidence/);
 let resolve!:()=>void;const gate=new Promise<void>(done=>{resolve=done;});memory.files.write=async(name,bytes)=>{await gate;await original(name,bytes);};
 const saving=c.rate(2);c.break();resolve();assert.equal(await saving,true);assert.equal(effectivePairReports(c.session!).length,1);assert.equal(c.state.current.needsSetup,true);assert.equal(c.state.resumeRequired,true);assert.equal(await c.rate(1),false);
});

test('triples retain original grade-3 realization after same-grade revision and withdrawal',async()=>{
 const {c,geometry}=await collector();await reach(c,[0,0,0,0]);await c.prepareBaseline({spanSteps:4});await c.prepare();await c.rate(3);await c.markMaximum();
 const original=effectivePairReports(c.session!)[0],trial=c.session!.pairTrials.find(t=>t.id===original.trialId)!,slot=c.session!.plan.tripleSlots[0];
 await c.navigate({phase:'conditional-triples',slotId:slot.id});assert.equal(c.tripleSources().length,1);assert.equal(await c.saveTripleBoundary({sourcePairObservationId:original.id,boundaryContact:thirdContact(geometry,69)}),false);
 await c.prepare();assert.equal(await c.saveTripleBoundary({sourcePairObservationId:original.id,boundaryContact:thirdContact(geometry,69)}),true);
 const triple=c.session!.entries.find(e=>e.kind==='conditional-triple-boundary')!;assert.equal(triple.anchorRealizationId,original.realization!.id);assert.equal(tripleApplicability(c.session!,triple),'current');
 await c.navigate({phase:'progressive-pairs',slotId:trial.sweepId,trialId:trial.id});await c.prepare();assert.equal(await c.rate(3),true);
 assert.equal(c.state.progress!.judgments,2);assert.equal(c.state.progress!.effectiveJudgments,1);
 assert.equal(tripleApplicability(c.session!,triple),'basis-revised');assert.equal(stretchProgress(c.session!).triples.needsReview,1);assert.doesNotThrow(()=>validateStretchSession(c.session));
 assert.equal(await c.retract(original.id,'withdraw source'),true);assert.equal(tripleApplicability(c.session!,triple),'basis-withdrawn');assert.doesNotThrow(()=>validateStretchSession(c.session));assert.ok(c.session!.entries.some(e=>e.id===triple.id));
});

test('triple unavailable requires actual outward attempts and remains distinct from omission',async()=>{
 const {c,geometry}=await collector();await reach(c,[0,0,0,0]);await c.prepareBaseline({spanSteps:4});await c.prepare();await c.rate(3);await c.markMaximum();const source=effectivePairReports(c.session!)[0],slot=c.session!.plan.tripleSlots[0];
 await c.navigate({phase:'conditional-triples',slotId:slot.id});await c.prepare();assert.equal(await c.saveTripleUnavailable({sourcePairObservationId:source.id,attemptedContacts:[]}),false);assert.equal(await c.saveTripleUnavailable({sourcePairObservationId:source.id,attemptedContacts:[thirdContact(geometry,69)]}),true);
 assert.equal(c.state.progress!.triples.unavailable,1);assert.equal(c.state.progress!.triples.omitted,0);
});

test('admission rejects geometry, contact, scale, input and forward-reference corruption',async()=>{
 const {c}=await collector();await reach(c,[0,0,0,0]);await c.prepareBaseline();await c.prepare();await c.rate(3);
 const good=c.archive;await validateStretchArchive(good);
 const corruptions:Array<(a:StretchArchive)=>void>=[
  a=>{a.sessions[0].plan.scaleVersion='old-five-grade' as any;},
  a=>{a.sessions[0].pairTrials[0].contacts[0].location.surfaceId='tongue';},
  a=>{a.sessions[0].pairTrials[0].contacts[0].finger=5;},
  a=>{a.sessions[0].pairTrials[0].contacts[1].keyState='resting-contact';},
  a=>{(a.sessions[0].entries.find(e=>e.kind==='pair-stretch')! as any).input={kind:'keyboard',code:'Digit4'};},
  a=>{(a.sessions[0].entries.find(e=>e.kind==='pair-stretch')! as any).input={kind:'midi',deviceId:'dev',channel:16,note:6};},
  a=>{(a.sessions[0].pairTrials[0].contacts[0].location as any).uRange=[-.1,1];},
  a=>{a.sessions[0].entries.push({kind:'retraction',id:'future-ret',recordedAt:'2026-10-12T12:00:00Z',entryId:'future',reason:'invalid'});},
  a=>{a.sessions[0].plan.geometry.surfaces[0].depthMinMm=0;},
  a=>{a.sessions[0].plan.geometry.snapshotSha256='0'.repeat(64);},
  a=>{const e=a.sessions[0].entries.find(e=>e.kind==='pair-stretch')!;if(e.kind==='pair-stretch')e.grade=5;},
  a=>{const e=a.sessions[0].entries.find(e=>e.kind==='pair-stretch')!;a.sessions[0].entries.push({kind:'pair-sweep-terminal',id:'forged-edge',recordedAt:'2026-10-12T12:00:00Z',sweepId:'sweepId'in e?e.sweepId:'',reason:'coverage-edge',lastReachableObservationId:e.id,firstUnavailableObservationId:null});},
 ];
 for(const change of corruptions){const bad=structuredClone(good);change(bad);await assert.rejects(()=>validateStretchArchive(bad));}
 assert.equal(await c.retract('missing','invalid'),false);assert.equal(await c.retract(c.session!.entries[0].id,'withdraw'),true);
 const retraction=c.session!.entries.find(e=>e.kind==='retraction')!;assert.equal(await c.retract(retraction.id,'invalid'),false);
});

test('resume restores evidence and cursor but requires contacts again; LH spans mirror pitch',async()=>{
 const {c,memory}=await collector('LH');await reach(c,[0,0,0,0]);await c.prepareBaseline();await c.prepare();await c.rate(1);
 assert.ok(c.state.current.trial!.contacts[1].midiPitch<c.state.current.trial!.contacts[0].midiPitch);
 const loaded=await loadStretch(memory.files),resumed=new StretchController({load:loaded,files:memory.files});assert.deepEqual(resumed.session,c.session);assert.equal(resumed.state.resumeRequired,true);assert.equal(await resumed.rate(1),false);assert.equal(await resumed.prepare(),true);assert.equal(await resumed.rate(2),true);
});

test('revising an unavailable terminal reopens the actual outward targets and preserves the old terminal',async()=>{
 const {c}=await collector();await reach(c,[0,0,0,0]);await c.prepareBaseline();await c.prepare();await c.rate(0);await c.rate(5);
 const terminal=c.session!.entries.find(e=>e.kind==='pair-sweep-terminal')!,unavailable=effectivePairReports(c.session!).at(-1)!,trial=c.session!.pairTrials.find(t=>t.id===unavailable.trialId)!;
 await c.navigate({phase:'progressive-pairs',slotId:trial.sweepId,trialId:trial.id});await c.prepare();assert.equal(await c.rate(3),true);
 assert.equal(terminalApplicability(c.session!,terminal),'basis-revised');assert.equal(c.state.progress!.sweeps.completed,0);assert.equal(c.state.progress!.sweeps.unavailable,0);assert.equal(c.state.progress!.sweeps.needsReview,1);
 assert.equal(c.state.current.trial!.distanceSemitoneSteps,6);assert.equal(effectivePairReports(c.session!).length,2);assert.ok(c.session!.entries.some(e=>e.id===terminal.id));
 await c.markMaximum();const newTerminal=c.session!.entries.filter(e=>e.kind==='pair-sweep-terminal').at(-1)!;assert.equal(c.state.progress!.sweeps.completed,1);
 await c.retract(newTerminal.id,'reopen maximum');assert.equal(c.state.current.trial!.distanceSemitoneSteps,6);assert.equal(effectivePairReports(c.session!).length,2);
});

test('latest stale triple takes precedence over an older valid triple during progress and resume',async()=>{
 const {c,geometry}=await collector();await reach(c,[0,0,0,0]);await c.prepareBaseline();await c.prepare();await c.rate(3);await c.rate(3);await c.markMaximum();
 const sources=effectivePairReports(c.session!),slot=c.session!.plan.tripleSlots[0];
 for(const source of sources){await c.navigate({phase:'conditional-triples',slotId:slot.id});await c.prepare();assert.equal(await c.saveTripleBoundary({sourcePairObservationId:source.id,boundaryContact:thirdContact(geometry,69)}),true);}
 const trial=c.session!.pairTrials.find(t=>t.id===sources[1].trialId)!;await c.navigate({phase:'progressive-pairs',slotId:trial.sweepId,trialId:trial.id});await c.prepare();await c.rate(2);await c.markMaximum();
 assert.equal(stretchSlotStatus(c.session!,'conditional-triples',slot.id),'needs-review');assert.equal(c.state.progress!.triples.completed,0);assert.equal(c.state.progress!.triples.needsReview,1);
 for(let i=0;i<9;i++)await c.skip();assert.equal(c.state.current.tripleSlot!.id,slot.id);
});

test('admission allows untested setup changes but fixes the rated row and requires compatible depths',async()=>{
 const {c,geometry}=await collector();await reach(c,[0,0,0,0]);await c.prepareBaseline();await c.prepareBaseline({row:2,anchorMidiPitch:60});await c.prepareBaseline({row:1,anchorMidiPitch:61});await c.prepare();await c.rate(3);
 await validateStretchArchive(c.archive);
 const ratedRowChange=structuredClone(c.archive),s=ratedRowChange.sessions[0],report=s.entries.find(e=>e.kind==='pair-stretch')! as PairStretchObservation;
 const contacts=[2,4].map((_,i)=>{const surface=geometry.surfaces.find(v=>v.midiPitch===60+i*2&&v.row===2)!;return {finger:i+1,actuatorId:surface.actuatorId,midiPitch:surface.midiPitch,row:2,keyState:'depressed',location:{kind:'surface-region',surfaceId:surface.id,uRange:[0,1],vRange:[0,1]}};});
 (s.pairTrials as any[]).push({id:'other-row',sweepId:report.sweepId,contacts,distanceSemitoneSteps:2});(s.entries as any[]).push({...report,id:'other-report',trialId:'other-row',realization:{id:'other-realization',contacts}});
 await assert.rejects(()=>validateStretchArchive(ratedRowChange),/rated sweep/);
 const misaligned=structuredClone(c.archive),r=misaligned.sessions[0].entries.find(e=>e.kind==='pair-stretch')! as PairStretchObservation;
 if(r.realization)r.realization.contacts.forEach((contact,i)=>{contact.location={kind:'measured-point',surfaceId:contact.location.surfaceId,u:.5,v:i,method:'fixture',uncertaintyMm:0};});
 await assert.rejects(()=>validateStretchArchive(misaligned),/parallel/);
});

test('failed target rendering gates the next rating until contacts are reproduced',async()=>{
 const {c}=await collector();await reach(c,[0,0,0,0]);await c.prepareBaseline();await c.prepare();const before=c.state.current.trial!.id;
 const off=c.subscribe(s=>{if(!s.busy&&s.current.trial?.id!==before)throw Error('render failed');});
 assert.equal(await c.rate(1),true);assert.equal(c.state.current.needsSetup,true);assert.equal(c.state.resumeRequired,true);assert.equal(await c.rate(2),false);assert.match(c.state.error!,/screen update failed/);
 off();assert.equal(await c.prepare(),true);assert.equal(await c.rate(2),true);
});

test('a later reach omission makes derived differences unknown until replacement or retraction',async()=>{
 const {c}=await collector();await reach(c);const slot=c.session!.plan.relativeReachSlots[0],original=c.session!.entries[0];
 await c.navigate({phase:'relative-fingertip-reach',slotId:slot.id});assert.equal(await c.skip(),true);
 assert.equal(relativeDifferenceMm(c.session!,1,2),null);assert.equal(relativeDifferenceMm(c.session!,1,5),null);
 assert.equal(relativeDifferenceMm(c.session!,2,5),-16);assert.equal(recommendedSpanSteps(c.session!,[1,2]),2);assert.ok(c.session!.entries.some(e=>e.id===original.id));
 const omission=c.session!.entries.filter(e=>e.kind==='omission').at(-1)!;assert.equal(await c.retract(omission.id,'restore reading'),true);assert.equal(relativeDifferenceMm(c.session!,1,2),40);
 await c.navigate({phase:'relative-fingertip-reach',slotId:slot.id});await c.skip();await c.navigate({phase:'relative-fingertip-reach',slotId:slot.id});await c.saveReach({kind:'signed-mm',differenceMm:20,method:'new ruler reading'});
 assert.equal(relativeDifferenceMm(c.session!,1,2),20);
});

test('new sweeps and restored collections inherit the first recorded row and anchor',async()=>{
 const {c,geometry,memory}=await collector();const provenance=c.session!.plan.provenance;
 assert.equal(await c.createCollection({geometry,provenance:{...provenance,setupId:'row-two-setup'},row:2,anchorMidiPitch:60}),true);await reach(c,[0,0,0,0]);
 await c.prepareBaseline();assert.equal(c.state.current.trial!.contacts[0].row,2);assert.equal(c.state.current.trial!.contacts[0].midiPitch,60);await c.prepare();await c.rate(3);await c.markMaximum();
 await c.prepareBaseline();assert.equal(c.state.current.trial!.contacts[0].row,2);assert.equal(c.state.current.trial!.contacts[0].midiPitch,60);await c.prepare();await c.rate(0);await c.markMaximum();
 const loaded=await loadStretch(memory.files),resumed=new StretchController({load:loaded,files:memory.files});await resumed.prepareBaseline();
 assert.equal(resumed.state.current.trial!.contacts[0].row,2);assert.equal(resumed.state.current.trial!.contacts[0].midiPitch,60);
});

test('first grade 5 is durable evidence without a terminal, and resume can choose a new starting contact',async()=>{
 const {c,memory}=await collector();await reach(c,[0,0,0,0]);await c.prepareBaseline();await c.prepare();const firstTrial=c.state.current.trial!,sweepId=firstTrial.sweepId;
 assert.equal(await c.rate(5,{kind:'screen'},firstTrial.id),true);
 const firstReport=c.session!.entries.find(e=>e.kind==='pair-stretch')!;assert.equal(firstReport.grade,5);assert.equal(firstReport.realization,null);assert.equal(firstReport.trialId,firstTrial.id);
 assert.equal(c.state.current.trial!.id,firstTrial.id);assert.equal(c.state.current.needsSetup,true);assert.equal(c.state.progress!.sweeps.completed,0);assert.equal(c.state.canMarkMaximum,false);
 assert.equal(c.session!.entries.some(e=>e.kind==='pair-sweep-terminal'||e.kind==='omission'),false);assert.equal(await c.rate(5),false);assert.equal(await c.markMaximum(),false);
 await validateStretchArchive(c.archive);
 const forged=structuredClone(c.archive);forged.sessions[0].entries.push({kind:'pair-sweep-terminal',id:'invented-unavailable-terminal',recordedAt:'2026-10-12T12:00:00Z',sweepId,reason:'first-unavailable',lastReachableObservationId:null,firstUnavailableObservationId:firstReport.id});await assert.rejects(()=>validateStretchArchive(forged),/reachable baseline/);
 const loaded=await loadStretch(memory.files),resumed=new StretchController({load:loaded,files:memory.files});assert.equal(resumed.state.resumeRequired,true);assert.equal(await resumed.rate(5),false);
 assert.equal(await resumed.prepareBaseline({spanSteps:4,row:2,anchorMidiPitch:60}),true);await resumed.prepare();assert.equal(await resumed.rate(0),true);
 assert.equal(resumed.state.current.trial!.distanceSemitoneSteps,6);assert.equal(await resumed.rate(5),true);
 const reports=effectivePairReports(resumed.session!),terminal=resumed.session!.entries.find(e=>e.kind==='pair-sweep-terminal')!;
 assert.equal(reports.length,3);assert.equal(reports[0].id,firstReport.id);assert.equal(terminal.reason,'first-unavailable');assert.equal(terminal.lastReachableObservationId,reports[1].id);assert.equal(terminal.firstUnavailableObservationId,reports[2].id);
 assert.equal(resumed.session!.pairTrials.length,3);assert.equal(resumed.state.progress!.sweeps.unavailable,1);
 await resumed.navigate({phase:'progressive-pairs',slotId:sweepId,trialId:reports[1].trialId});assert.equal(await resumed.prepareBaseline({spanSteps:8}),false);
});

test('pending and held grade-5 keys cannot repeat a starting judgment or rate its replacement',async()=>{
 const {c,memory}=await collector();await reach(c,[0,0,0,0]);await c.prepareBaseline();await c.prepare();const original=memory.files.write;
 let resolve!:()=>void;const gate=new Promise<void>(done=>{resolve=done;});memory.files.write=async(name,bytes)=>{await gate;await original(name,bytes);};
 const first=c.inputKey({type:'keydown',code:'Digit5'});assert.equal(c.state.busy,true);assert.equal(effectivePairReports(c.session!).length,0);
 assert.equal(await c.inputKey({type:'keydown',code:'Digit5',repeat:true}),false);assert.equal(await c.inputKey({type:'keydown',code:'Numpad5'}),false);
 resolve();assert.equal(await first,true);assert.equal(c.state.current.needsSetup,true);assert.equal(effectivePairReports(c.session!).length,1);
 assert.equal(await c.adjustSpan(2),true);await c.prepare();assert.equal(await c.inputKey({type:'keydown',code:'Digit5',repeat:true}),false);assert.equal(await c.rate(5),false);
 await c.inputKey({type:'keyup',code:'Digit5'});assert.equal(await c.inputKey({type:'keydown',code:'Digit5'}),false);await c.inputKey({type:'keyup',code:'Digit5'});await c.inputKey({type:'keyup',code:'Numpad5'});
 assert.equal(await c.inputKey({type:'keydown',code:'Numpad5'}),true);assert.equal(effectivePairReports(c.session!).length,2);assert.equal(c.session!.entries.some(e=>e.kind==='pair-sweep-terminal'),false);
});

test('a failed first-unavailable save retains the displayed target and permits an honest retry',async()=>{
 const {c,memory}=await collector();await reach(c,[0,0,0,0]);await c.prepareBaseline();await c.prepare();const before=c.session!,original=memory.files.write;
 memory.files.write=async()=>{throw Error('disk unavailable');};assert.equal(await c.rate(5),false);assert.deepEqual(c.session,before);assert.equal(c.state.current.needsSetup,false);
 memory.files.write=original;assert.equal(await c.rate(5),true);assert.equal(effectivePairReports(c.session!).length,1);assert.equal(c.session!.entries.some(e=>e.kind==='pair-sweep-terminal'),false);assert.equal(c.state.current.needsSetup,true);
});

test('an unavailable terminal cannot reuse a startup failure before its baseline or from another arrangement',async()=>{
 for(const row of [1,2] as const){
  const {c}=await collector();await reach(c,[0,0,0,0]);await c.prepareBaseline({spanSteps:6});await c.prepare();await c.rate(5);
  const unavailable=c.session!.entries.find(e=>e.kind==='pair-stretch')!;
  await c.prepareBaseline({spanSteps:4,row,anchorMidiPitch:row===1?61:60});await c.prepare();await c.rate(0);await validateStretchArchive(c.archive);
  const reachable=effectivePairReports(c.session!).find(e=>e.grade===0)!;
  const forged=structuredClone(c.archive),s=forged.sessions[0];
  // Earlier timestamps cannot turn a later ledger report into the observed baseline.
  s.entries.find(e=>e.id===unavailable.id)!.recordedAt='2026-10-13T12:00:00Z';s.entries.find(e=>e.id===reachable.id)!.recordedAt='2026-10-12T12:00:00Z';
  s.entries.push({kind:'pair-sweep-terminal',id:`forged-startup-terminal-row-${row}`,recordedAt:'2026-10-14T12:00:00Z',sweepId:reachable.sweepId,reason:'first-unavailable',lastReachableObservationId:reachable.id,firstUnavailableObservationId:unavailable.id});
  await assert.rejects(()=>validateStretchArchive(forged),/same row and anchor|before the unavailable/);
 }
});

test('retracting an endpoint reopens an unanswered target on the frozen reachable arrangement',async()=>{
 const {c}=await collector();await reach(c,[0,0,0,0]);await c.prepareBaseline({spanSteps:8,row:1,anchorMidiPitch:61});await c.prepare();await c.rate(5);
 const startup=effectivePairReports(c.session!)[0];await c.prepareBaseline({spanSteps:4,row:2,anchorMidiPitch:60});await c.prepare();await c.rate(0);
 const reachable=effectivePairReports(c.session!).find(e=>e.grade===0)!,endpointTrial=c.state.current.trial!;await c.rate(5);
 const withdrawn=effectivePairReports(c.session!).find(e=>e.trialId===endpointTrial.id)!;assert.equal(await c.retract(withdrawn.id,'recheck outward endpoint'),true);
 assert.equal(c.state.current.trial!.id,endpointTrial.id);assert.equal(c.state.current.trial!.distanceSemitoneSteps,6);assert.equal(c.state.current.trial!.contacts[0].row,2);assert.equal(c.state.current.trial!.contacts[0].midiPitch,60);
 assert.equal(c.state.current.needsSetup,true);assert.equal(await c.prepare(),true);assert.equal(await c.rate(5),true);
 const replacement=effectivePairReports(c.session!).find(e=>e.trialId===endpointTrial.id)!,terminal=c.session!.entries.filter(e=>e.kind==='pair-sweep-terminal').at(-1)!;
 assert.notEqual(replacement.id,withdrawn.id);assert.equal(terminal.lastReachableObservationId,reachable.id);assert.equal(terminal.firstUnavailableObservationId,replacement.id);assert.equal(c.state.progress!.sweeps.unavailable,1);
 assert.equal(c.session!.pairTrials.length,3);assert.ok(c.session!.entries.some(e=>e.id===startup.id));assert.ok(c.session!.entries.some(e=>e.id===withdrawn.id));
 assert.equal(await c.retract(terminal.id,'recheck terminal declaration'),true);assert.equal(c.state.current.trial!.id,endpointTrial.id);assert.equal(c.state.current.trial!.contacts[0].row,2);
 await c.prepare();assert.equal(await c.rate(5),true);assert.equal(c.session!.pairTrials.length,3);
});
