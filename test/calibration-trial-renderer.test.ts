import assert from 'node:assert/strict';
import test from 'node:test';
import {DOMParser} from '@xmldom/xmldom';
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
test('Highlights cover the full displayed target surface, stopping at the Jankó level boundary',()=>{
 for(const instrument of ['janko-four-row','conventional-piano'] as const)for(const hand of ['RH','LH'] as const){
  const plan=createEffortPlan(instrument,hand);
  for(const trial of plan.trials){
   const doc=new DOMParser().parseFromString(renderCalibrationTrial(plan.keyboard,trial),'image/svg+xml');
   const groups=Array.from(doc.getElementsByTagName('g'));
   const bounds=(rect:{getAttribute:(name:string)=>string|null})=>['x','y','width','height'].map(name=>Number(rect.getAttribute(name)));
   for(const placement of [...trial.anchors,...trial.active]){
    const key=plan.keyboard.keys.find(k=>k.id===placement.keyId)!;
    const body=groups.find(g=>g.getAttribute('data-pitch')===String(key.midiPitch))!;
    const highlight=groups.find(g=>g.getAttribute('data-contact-key')===key.id)!;
    const actual=Array.from(highlight.getElementsByTagName('rect')).map(bounds);
    const visible=Array.from(body.getElementsByTagName('rect')).map(bounds);
    if(instrument==='conventional-piano')assert.deepEqual(actual,visible,trial.id);
    else{
     assert.equal(actual.length,1);
     const [x,y,width,height]=actual[0],[bx,by,bw,bh]=visible[0];
     const boundary=Number(body.getElementsByTagName('path')[0].getAttribute('d')!.match(/^M\S+ (\S+)H/)![1]);
     assert.equal(x,bx);assert.equal(width,bw);
     assert.ok(Math.abs(y-(key.level==='lower'?boundary:by))<1e-9,trial.id);
     assert.ok(Math.abs(y+height-(key.level==='lower'?by+bh:boundary))<1e-9,trial.id);
    }
   }
  }
 }
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
