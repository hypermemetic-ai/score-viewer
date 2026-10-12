import assert from 'node:assert/strict';
import test from 'node:test';
import {createEffortPlan} from '../src/calibration-effort';
import {renderCalibrationTrial,calibrationPitchText,calibrationEscape} from '../src/calibration-trial-renderer';

test('Both hand realizations highlight the exact assigned physical contacts throughout the collection',()=>{
 for(const instrument of ['janko-four-row','conventional-piano'] as const)for(const hand of ['RH','LH'] as const){
  const plan=createEffortPlan(instrument,hand);
  for(const trial of plan.trials){
   const svg=renderCalibrationTrial(plan.keyboard,trial);
   assert.equal((svg.match(/data-contact-key=/g)??[]).length,2);
   for(const p of [...trial.anchors,...trial.active])assert.ok(svg.includes(`data-contact-key="${calibrationEscape(p.keyId)}" data-finger="${p.finger}"`),`${instrument}/${hand}/${trial.id}`);
   assert.ok(!svg.includes('NaN'));assert.ok(!svg.includes('anchor finger'));
  }
 }
});
test('Note naming changes labels while key colors and contact geometry stay identical',()=>{
 const plan=createEffortPlan('janko-four-row'),trial=plan.trials[0];
 const iso=renderCalibrationTrial(plan.keyboard,trial,'iso'),traditional=renderCalibrationTrial(plan.keyboard,trial,'traditional');
 const geometry=(svg:string)=>svg.replace(/aria-label="[^"]*"/,'').replace(/<text[^>]*>.*?<\/text>/g,'');
 assert.equal(geometry(iso),geometry(traditional));
 assert.equal(calibrationPitchText(60),'0');assert.equal(calibrationPitchText(70),'A');assert.equal(calibrationPitchText(61,'traditional'),'C♯4');
});
test('Jankó key size stays fixed as the target moves, with one connecting level boundary',()=>{
 const plan=createEffortPlan('janko-four-row');
 const widths=new Set(plan.trials.map(trial=>{
  const svg=renderCalibrationTrial(plan.keyboard,trial);
  const group=svg.match(/<g data-pitch="\d+">(.*?)<\/g>/)![1];
  assert.equal((group.match(/<path /g)??[]).length,1);
  return group.match(/width="([^"]+)"/)![1];
 }));
 assert.equal(widths.size,1);
});
