import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {importPackage} from '../src/package';
import {fingerPreferences,fingerPresentation,fingerBehavior,InputController} from '../src/input';
import {initialPersonal,fingerDisplayAvailable,corrected,fingerFor,effectiveLabelMode,readPersonal} from '../src/state';
import {annotationPositions} from '../src/fingering-presentation';
const p=await importPackage(readFileSync(new URL('../fixtures/schumann-op68-no14.isoscore',import.meta.url)),{allowLegacyTempo:true});
const key=(code:string,repeat=false)=>({code,repeat,ctrlKey:false,altKey:false,shiftKey:false,metaKey:false});
test('absent preferences select Toggle plus annotations; valid legacy Hold survives without mutating saved evidence',()=>{
 assert.deepEqual(fingerPreferences(),{fingerBehavior:'toggle',fingerPresentation:'annotations'});
 const legacy={fingerBehavior:'momentary',bindings:{toggle:'KeyF'},midi:{controller:67}},before=JSON.stringify(legacy);
 assert.deepEqual(fingerPreferences(legacy),{fingerBehavior:'momentary',fingerPresentation:'annotations'});assert.equal(JSON.stringify(legacy),before);
 for(const behavior of ['toggle','momentary'] as const)for(const presentation of ['annotations','replacement'] as const){const saved={fingerBehavior:behavior,fingerPresentation:presentation};assert.deepEqual(fingerPreferences(JSON.parse(JSON.stringify(saved))),saved);}
 for(const invalid of ['unknown',null,5]){assert.throws(()=>fingerBehavior(invalid),/retained/);assert.throws(()=>fingerPresentation(invalid),/retained/);}
});
test('all four presentation/timing choices keep physical holds transient and start fresh scores pitch-only',()=>{
 for(const presentation of ['annotations','replacement'] as const)for(const behavior of ['toggle','momentary'] as const){
  const state=initialPersonal(p),input=new InputController(),before=JSON.stringify(state);assert.equal(fingerDisplayAvailable(p,state,presentation),true);assert.equal(effectiveLabelMode(state.view,behavior,false),'pitch');
  assert.equal(input.down(key('KeyF'),true,false).action,'toggle');if(behavior==='toggle')state.view.labelMode='finger';assert.equal(effectiveLabelMode(state.view,behavior,input.fingersHeld),'finger');assert.equal(input.down(key('KeyF',true),true,false).action,undefined);input.up(key('KeyF'));
  assert.equal(effectiveLabelMode(state.view,behavior,input.fingersHeld),behavior==='toggle'?'finger':'pitch');const restored=readPersonal(JSON.parse(JSON.stringify(state)),p),newInput=new InputController();assert.equal(newInput.fingersHeld,false);assert.equal(effectiveLabelMode(restored.view,behavior,newInput.fingersHeld),behavior==='toggle'?'finger':'pitch');if(behavior==='momentary')assert.equal(JSON.stringify(state),before);
 }
});
test('replacement fit refusal leaves complete annotations and source-linked edits available',()=>{
 const q={...p,fingerEligibility:{eligible:false,reason:'A replacement digit does not fit its frozen seat'}},state=initialPersonal(q);
 assert.equal(fingerDisplayAvailable(q,state,'annotations'),true);assert.equal(fingerDisplayAvailable(q,state,'replacement'),false);
 const seat=q.seats.find(s=>s.ownerIds.length===2)!;for(const finger of [1,2,3,4,5]){const edited=corrected(q,state,seat,finger);assert.equal(fingerFor(q,edited,seat),finger);assert.equal(edited.view.fingerSet,'yours');assert.deepEqual(q.score,p.score);}
 const missing={...q,fingerLayer:undefined};assert.equal(fingerDisplayAvailable(missing,initialPersonal(missing),'annotations'),false);assert.throws(()=>corrected(missing,initialPersonal(missing),seat,2),/no edition finger/);
});
test('literal No.14 annotations clear their actual upward/downward carriers without changing frozen pages',()=>{
 const before=JSON.stringify({score:p.score,pages:p.pages,seats:p.seats,manifest:p.manifest}),positions=annotationPositions(p);assert.equal(positions.size,p.seats.length);
 for(const seat of p.seats){const position=positions.get(seat.id)!;assert.equal(position.x,position.carrier.x);assert.equal(position.carrier.kind,'stem');assert.ok(position.carrier.direction===-1?position.bounds[3]<position.carrier.edge:position.bounds[1]>position.carrier.edge);assert.ok(position.fontSize<seat.fontSize);assert.ok(position.bounds.every(Number.isFinite));}
 assert.equal(JSON.stringify({score:p.score,pages:p.pages,seats:p.seats,manifest:p.manifest}),before);
 assert.deepEqual(annotationPositions({...p,seats:[...p.seats].reverse()}),positions);
});
test('personal 1–5 edits, layer comparison and view transforms preserve each reserved location',()=>{
 const positions=annotationPositions(p),seat=p.seats[0],state=initialPersonal(p);
 for(const finger of [1,2,3,4,5]){const edited=corrected(p,state,seat,finger);for(const set of ['calculated','yours'] as const){edited.view.fingerSet=set;for(const rotation of [0,90,180,270] as const)for(const scale of [1,.9,.75,.5] as const){edited.view.rotation=rotation;edited.view.scale=scale;assert.deepEqual(annotationPositions(p),positions);assert.ok(fingerFor(p,edited,seat));}}}
});
