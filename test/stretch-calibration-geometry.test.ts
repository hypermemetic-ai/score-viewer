import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {STRETCH_CALIBRATION_KEYBOARD_PROFILE as profile,STRETCH_CALIBRATION_PROFILE_SHA256} from '@hypermemetic-ai/fingering-calculator';
import {canonicalStretchJson,createStretchGeometry,hashStretchGeometry,sameRowContact,stretchActuatorBody,surfaceContact,surfaceLocationFromDepth,surfaceWorldPoint,transformStretchPoint} from '../src/stretch-calibration-geometry';

test('admitted range creates one actuator, two true terraces and the exact four complete body forms per pitch',async()=>{
 const geometry=await createStretchGeometry([60,71]);
 assert.deepEqual(geometry.admittedMidiRange,[60,71]);assert.equal(geometry.actuators.length,12);assert.equal(geometry.surfaces.length,24);
 assert.equal(geometry.profileSha256,STRETCH_CALIBRATION_PROFILE_SHA256);
 assert.deepEqual(geometry.actuators.map(a=>a.bodyForm),[1,2,1,2,1,3,4,3,4,3,4,3]);
 for(const actuator of geometry.actuators){
  assert.equal(actuator.originXmm,(actuator.midiPitch-60)*13.75);
  const surfaces=geometry.surfaces.filter(surface=>surface.actuatorId===actuator.id),form=profile.forms.find(item=>item.form===actuator.bodyForm)!;
  assert.deepEqual(surfaces.map(surface=>surface.row),actuator.midiPitch%2?[1,3]:[2,4]);
  for(const surface of surfaces){
   const terrace=form.playableTerraces.find(item=>item.row===surface.row)!;
   assert.equal(surface.xMaxMm-surface.xMinMm,9);assert.equal((surface.xMinMm+surface.xMaxMm)/2,actuator.originXmm);
   assert.deepEqual([surface.depthMinMm,surface.depthMaxMm,surface.heightAtNearMm,surface.heightAtFarMm],[terrace.depthMinMm,terrace.depthMaxMm,terrace.heightAtNearMm,terrace.heightAtFarMm]);
   if(actuator.midiPitch%2===0)assert.ok(surface.depthMinMm>=34,'even front tongue is never a contact');
  }
  const body=stretchActuatorBody(geometry,actuator.id);
  assert.equal(body.bodyWidthMm,10);assert.deepEqual(body.top.map(p=>p.slice(1)),form.bodyTopProfileDepthHeightMm);assert.deepEqual(body.mounting.map(p=>p.slice(1)),form.bodyMountingProfileDepthHeightMm);
  assert.equal(body.top[0][1],0,'all physical tips share the same front plane');
 }
 assert.equal(geometry.actuators[2].originXmm-geometry.actuators[0].originXmm,27.5);
});

test('profile origin cannot silently create an assumed instrument range',async()=>{
 for(const range of [undefined,[-1,12],[12,128],[70,60],[60.1,70],[60,NaN],[Infinity,70],[60]] as unknown as [number,number][])await assert.rejects(createStretchGeometry(range),/admitted MIDI range/);
 const single=await createStretchGeometry([9,9]);assert.deepEqual(single.actuators.map(a=>a.midiPitch),[9]);assert.equal(single.surfaces.length,2);
});

test('snapshot digest follows canonical sorted ECMAScript JSON and binds range, surfaces and motion',async()=>{
 const geometry=await createStretchGeometry([60,64]),{snapshotSha256,...snapshot}=geometry;
 const independentlySorted=(input:any):any=>input&&typeof input==='object'?Array.isArray(input)?input.map(independentlySorted):Object.fromEntries(Object.keys(input).sort().map(key=>[key,independentlySorted(input[key])])):input;
 const expected=createHash('sha256').update(JSON.stringify(independentlySorted(snapshot)),'utf8').digest('hex');
 assert.equal(snapshotSha256,expected);assert.equal(await hashStretchGeometry({...geometry,snapshotSha256:'ignored'}),expected);
 assert.equal(await hashStretchGeometry(Object.fromEntries(Object.entries(geometry).reverse()) as typeof geometry),expected);
 const changed=structuredClone(geometry);changed.surfaces[0].heightAtNearMm+=.1;assert.notEqual(await hashStretchGeometry(changed),expected);
 assert.notEqual((await createStretchGeometry([60,65])).snapshotSha256,expected);
 for(const value of [NaN,Infinity,-Infinity])assert.throws(()=>canonicalStretchJson({nested:[value]}),/nonfinite/);
 assert.throws(()=>canonicalStretchJson({value:undefined}),/JSON data/);
});

test('contacts are full surface regions with explicit depression and cannot name the tongue or a parity-mismatched row',async()=>{
 const geometry=await createStretchGeometry([59,66]),contact=sameRowContact(geometry,1,61,1);
 assert.deepEqual(contact,{finger:1,actuatorId:'key-61',midiPitch:61,row:1,keyState:'depressed',location:{kind:'surface-region',surfaceId:'key-61-row-1',uRange:[0,1],vRange:[0,1]}});
 const far=surfaceContact(geometry,2,'key-64-row-4','resting-contact');assert.equal(far.actuatorId,'key-64');assert.equal(far.row,4);
 for(const row of [1,3] as const)assert.throws(()=>sameRowContact(geometry,1,64,row),/no admitted playable row/);
 assert.throws(()=>surfaceContact(geometry,1,'key-64-front-tongue'),/outside this geometry/);
 assert.throws(()=>surfaceContact(geometry,2,'key-61-row-1','depressed',{kind:'surface-region',surfaceId:'key-61-row-1',uRange:[0,1],vRange:[-.1,1]}),/within its playable terrace/);
 assert.throws(()=>surfaceContact(geometry,2,'key-61-row-1','depressed',{kind:'attested-fiducial',surfaceId:'key-61-row-3',u:.5,v:.5,fiducialId:'display'}),/different surface/);
});

test('every surface copy moves down 10mm together and surface-local coordinates retain the designed slope',async()=>{
 const geometry=await createStretchGeometry([60,67]);
 for(const surface of geometry.surfaces)for(const [u,v] of [[0,0],[.5,.5],[1,1]]){
  const resting=surfaceWorldPoint(geometry,surface.id,u,v)!,pressed=surfaceWorldPoint(geometry,surface.id,u,v,'depressed')!;
  assert.equal(pressed.x,resting.x);assert.equal(pressed.depth,resting.depth);assert.equal(pressed.height,resting.height-10);assert.equal(pressed.motion,'estimated');
  assert.equal(resting.depth,surface.depthMinMm+v*(surface.depthMaxMm-surface.depthMinMm));assert.equal(resting.height,surface.heightAtNearMm+v*(surface.heightAtFarMm-surface.heightAtNearMm));
  assert.deepEqual(surfaceLocationFromDepth(geometry,surface.id,resting.depth,u),{u,v});
 }
 const odd=surfaceWorldPoint(geometry,'key-61-row-1',.5,0)!;assert.equal(odd.height,9.2);
 const even=surfaceWorldPoint(geometry,'key-60-row-2',.5,0)!;assert.equal(even.depth,34);assert.equal(even.height,15);
});

test('unknown pressed motion yields no world position; measured row-major transforms retain their status',async()=>{
 const geometry=await createStretchGeometry([60,60]),actuator=geometry.actuators[0];
 actuator.pressedMotion={kind:'unknown'};assert.equal(surfaceWorldPoint(geometry,'key-60-row-2',.5,.5,'depressed'),null);assert.ok(surfaceWorldPoint(geometry,'key-60-row-2',.5,.5));
 const transform=[1,0,0,2,0,1,0,3,0,0,1,-8,0,0,0,1];
 actuator.pressedMotion={kind:'measured-rigid-transform',transform,reference:'Measured fixture',uncertaintyMm:.2};
 const resting=surfaceWorldPoint(geometry,'key-60-row-2',.5,.5)!,pressed=surfaceWorldPoint(geometry,'key-60-row-2',.5,.5,'depressed')!;
 assert.deepEqual(pressed,{x:resting.x+2,depth:resting.depth+3,height:resting.height-8,motion:'measured'});
 assert.deepEqual(transformStretchPoint([4,5,6],transform),[6,8,-2]);
 assert.throws(()=>transformStretchPoint([0,0,0],[1,2,3]),/row-major/);
});
