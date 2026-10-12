import test from 'node:test';
import assert from 'node:assert/strict';
import {fingertipActualPitch,fingertipKeyBlack,fingertipPlacements,fingertipPlacementInstruction,fingertipPitchName} from '../src/calibration-fingertips-renderer';
test('left-hand physical reflection keeps ascending pitch order, parity and selected physical colors',()=>{
 const canonical=Array.from({length:8},(_,i)=>58+i),leftVisual=canonical.toReversed().map(p=>fingertipActualPitch(p,'LH'));
 assert.deepEqual(leftVisual,[59,60,61,62,63,64,65,66]);
 assert.deepEqual(canonical.map(p=>fingertipActualPitch(p,'RH')),canonical);
 for(const p of canonical){const reflected=fingertipActualPitch(p,'LH');assert.equal(reflected%2,p%2);assert.equal(fingertipActualPitch(reflected,'LH'),p);for(const colors of ['five-seven','classic'] as const)assert.equal(fingertipKeyBlack(reflected,colors),fingertipKeyBlack(p,colors));}
 assert.deepEqual(leftVisual.map(p=>fingertipPitchName(p,'iso')),['B','0','1','2','3','4','5','6']);
 assert.deepEqual(leftVisual.map(p=>fingertipPitchName(p,'traditional')),['B','C','C♯','D','D♯','E','F','F♯']);
});
test('all four pairs share actual placements between callouts and physical instructions in both naming systems',()=>{
 for(let pair=0;pair<4;pair++){
  const right=fingertipPlacements(pair,'RH'),left=fingertipPlacements(pair,'LH');
  assert.deepEqual(right.map(p=>p.pitch),pair===0?[61,64]:[60,62]);assert.deepEqual(left.map(p=>p.pitch),pair===0?[63,60]:[64,62]);
  assert.deepEqual(left.map(p=>p.level),pair===0?['lowest','lower main']:['lower main','lower main']);
  for(const hand of ['LH','RH'] as const)for(const notation of ['iso','traditional'] as const){const instruction=fingertipPlacementInstruction(pair,hand,notation);for(const p of fingertipPlacements(pair,hand))assert.ok(instruction.includes(`${p.name} on ${fingertipPitchName(p.pitch,notation)}’s ${p.level} level.`));}
 }
 assert.equal(fingertipPlacementInstruction(0,'LH','iso'),'Thumb on 3’s lowest level. Index on 0’s lower main level.');
 assert.equal(fingertipPlacementInstruction(1,'LH','traditional'),'Index on E’s lower main level. Middle on D’s lower main level.');
});
