import test from 'node:test';
import assert from 'node:assert/strict';
import {STRETCH_CALIBRATION_KEYBOARD_PROFILE as profile,STRETCH_CALIBRATION_PROFILE_SHA256} from '@hypermemetic-ai/fingering-calculator';
import {createDefaultStretchSetup,isNominalStretchSetup,NOMINAL_STRETCH_SETUP_DECLARATION,DEFAULT_STRETCH_WORKING_RANGE} from '../src/stretch-calibration-setup';
import {canonicalGeometryHash,initialStretchArchive,loadStretch,validateStretchArchive,type StretchFiles} from '../src/stretch-calibration';
import {StretchController} from '../src/stretch-calibration-controller';

test('automatic RH and LH setups roundtrip as independent nominal collections and begin with a real reading',async()=>{
 let bytes:Uint8Array|undefined,serial=0;
 const files:StretchFiles={async read(){return bytes;},async write(_name,value){bytes=new Uint8Array(value);}};
 const c=new StretchController({load:{value:initialStretchArchive()},files,id:()=>`entry-${++serial}`,now:()=> '2026-10-13T02:00:00.000Z'});
 const setups=[];
 for(const hand of ['RH','LH'] as const){
  const setup=await createDefaultStretchSetup({playerId:'fixture-player',hand,instrument:'janko-four-row'});setups.push(setup);
  assert.equal(setup.row,1);assert.equal(setup.anchorMidiPitch,61);assert.equal(setup.provenance.hand,hand);assert.equal(setup.provenance.bodyMidlineXmm,0);
  assert.equal(setup.provenance.seatingReference,NOMINAL_STRETCH_SETUP_DECLARATION);assert.match(setup.provenance.seatingReference,/nominal origin 0 mm.*body position and seating unmeasured.*endpoints unverified/);
  assert.equal(setup.geometry.profileSha256,STRETCH_CALIBRATION_PROFILE_SHA256);assert.deepEqual(setup.geometry.admittedMidiRange,[37,85]);assert.equal(setup.geometry.snapshotSha256,await canonicalGeometryHash(setup.geometry));
  assert.match(setup.geometry.reference,/operational test-window coverage, not an attestation/);assert.equal(isNominalStretchSetup(setup),true);
  assert.equal(await c.createCollection(setup),true);assert.equal(c.state.current.phase,'relative-fingertip-reach');assert.equal(c.session!.entries.length,0);
  const row=setup.geometry.surfaces.find(s=>s.midiPitch===61&&s.row===1)!;
  assert.equal(await c.saveReach({kind:'window-fractions',windowId:`${setup.provenance.setupId}:common-forward-window`,firstFraction:1,secondFraction:.5,axisStartMm:row.depthMinMm,axisEndMm:row.depthMaxMm,windowReference:'Authored mapped common terrace window'}),true);
  assert.equal(c.session!.entries.length,1);assert.equal(c.session!.entries[0].kind,'relative-fingertip-reach');
 }
 assert.notEqual(setups[0].provenance.setupId,setups[1].provenance.setupId);assert.notEqual(setups[0].referenceFrameId,setups[1].referenceFrameId);
 const loaded=await loadStretch(files);assert.equal(loaded.error,undefined);assert.deepEqual(loaded.value,c.archive);await validateStretchArchive(loaded.value);
 assert.equal(loaded.value.sessions.length,2);assert.deepEqual(loaded.value.sessions.map(s=>s.plan.provenance.hand),['RH','LH']);
 const manual={provenance:{...setups[0].provenance,seatingReference:'Existing operator-described seating'}};assert.equal(isNominalStretchSetup(manual),false);
});

test('nominal geometry supports mirrored pairs and reports an operational window edge without invented unavailability',async()=>{
 const setup=await createDefaultStretchSetup({playerId:'fixture-player',hand:'LH',instrument:'janko-four-row',setupId:'authored-setup'});let serial=0;
 const c=new StretchController({load:{value:initialStretchArchive()},files:{async read(){return undefined;},async write(){}},id:()=>`entry-${++serial}`});await c.createCollection(setup);
 for(let i=0;i<4;i++)await c.saveReach({kind:'signed-mm',differenceMm:0,method:'Authored zero-difference fixture'});
 await c.prepareBaseline();assert.equal(c.state.current.trial!.contacts[0].midiPitch,61);assert.equal(c.state.current.trial!.contacts[1].midiPitch,59);await c.prepare();
 const sweepId=c.state.current.pairSweep!.id;
 for(let i=0;i<12;i++)assert.equal(await c.rate(0),true);
 const terminal=c.session!.entries.find(e=>e.kind==='pair-sweep-terminal'&&e.sweepId===sweepId)!;assert.ok(terminal.kind==='pair-sweep-terminal');assert.equal(terminal.reason,'coverage-edge');assert.equal(terminal.firstUnavailableObservationId,null);
 assert.equal(c.session!.entries.some(e=>e.kind==='pair-stretch'&&e.grade===5),false);assert.equal(isNominalStretchSetup(c.session!.plan),true);
 assert.equal((61-DEFAULT_STRETCH_WORKING_RANGE[0])*profile.pitchIncrementMm,330);
});

test('automatic setup rejects unsupported geometry and malformed identity instead of inventing physical evidence',async()=>{
 await assert.rejects(()=>createDefaultStretchSetup({playerId:'fixture-player',hand:'RH',instrument:'conventional-piano'}),/RR\/Jankó/);
 await assert.rejects(()=>createDefaultStretchSetup({playerId:'',hand:'RH',instrument:'janko-four-row'}),/player identity/);
 await assert.rejects(()=>createDefaultStretchSetup({playerId:'fixture-player',hand:'RH',instrument:'janko-four-row',setupId:' '}),/setup identity/);
 await assert.rejects(()=>createDefaultStretchSetup({playerId:'fixture-player',hand:'invalid' as 'RH',instrument:'janko-four-row'}),/performing hand/);
 assert.equal(isNominalStretchSetup(null),false);
});
