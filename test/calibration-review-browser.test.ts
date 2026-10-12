import test from 'node:test';
import assert from 'node:assert/strict';
import {CalibrationReviewBrowser,type CalibrationReviewRow} from '../src/calibration-review-browser';
import {effortReviewRows} from '../src/calibration-effort-review';
import {createEffortPlan,initialEffortArchive} from '../src/calibration-effort';
import {EffortController} from '../src/calibration-effort-controller';

const rows:CalibrationReviewRow[]=[
 {id:'a1',groupId:'a',groupLabel:'Batch group A',label:'Condition 1',detail:'First',rating:'Natural fit'},
 {id:'a2',groupId:'a',groupLabel:'Batch group A',label:'Condition 2',detail:'Second',rating:'Some effort'},
 {id:'b1',groupId:'b',groupLabel:'Batch group B',label:'Condition 3',detail:'Third',rating:'Easy adjustment'},
];
test('review browses groups and ratings independently, retaining a row per group without changing evidence',()=>{
 const browser=new CalibrationReviewBrowser(),before=JSON.stringify(rows);
 assert.deepEqual(browser.groups(rows).map(g=>[g.id,g.rows.length]),[['a',2],['b',1]]);
 assert.equal(browser.key('Enter',rows),'handled');assert.equal(browser.column,'ratings');
 browser.key('ArrowDown',rows);assert.equal(browser.current(rows)?.id,'a2');
 assert.equal(browser.key('Enter',rows),'open');browser.key('ArrowLeft',rows);browser.key('ArrowDown',rows);
 assert.equal(browser.group,'b');browser.key('ArrowRight',rows);assert.equal(browser.current(rows)?.id,'b1');
 browser.key('ArrowDown',rows);assert.equal(browser.current(rows)?.id,'b1');
 browser.key('ArrowLeft',rows);browser.key('ArrowUp',rows);browser.key('ArrowRight',rows);assert.equal(browser.current(rows)?.id,'a2');
 assert.equal(JSON.stringify(rows),before);
});
test('review keeps selected identities as labels change and reconciles missing rows and groups',()=>{
 const browser=new CalibrationReviewBrowser();browser.selectRating('a2',rows);
 const renamed=rows.map(r=>({...r,groupLabel:'Changed batch label'}));assert.equal(browser.current(renamed)?.id,'a2');
 assert.equal(browser.current(rows.filter(r=>r.id!=='a2'))?.id,'a1');
 assert.equal(browser.current(rows.filter(r=>r.groupId==='b'))?.id,'b1');assert.equal(browser.group,'b');
 assert.equal(browser.current([]),undefined);assert.equal(browser.key('Enter',[]),undefined);
});
test('the current batch projection includes recorded conditions only and preserves actual identities and raw evidence',async()=>{
 for(const instrument of ['conventional-piano','janko-four-row'] as const)for(const hand of ['RH','LH'] as const){
  const plan=createEffortPlan(instrument,hand),group=(t:typeof plan.trials[number])=>[...t.anchors,...t.active].map(p=>p.finger).sort().join('-');
  const targets=[plan.trials[0],plan.trials[1],plan.trials.find(t=>group(t)!==group(plan.trials[0]))!];
  const effort=new EffortController({files:{read:async()=>null,write:async()=>{}},load:{value:initialEffortArchive('player')},id:()=>instrument,now:()=> '2026-10-12T16:00:00.000Z'});
  await effort.start({instrument,hand});
  for(const [i,t] of targets.entries()){await effort.navigate(t.id);await effort.prepare();await effort.rateButton(i as 0|1|2);}
  const collection=effort.state.archive.collections[0],before=JSON.stringify(collection),projected=effortReviewRows(plan,collection,'iso'),browser=new CalibrationReviewBrowser();
  assert.deepEqual(projected.map(r=>r.id),targets.map(t=>t.id));assert.equal(browser.groups(projected).length,2);
  assert.notEqual(projected[0].detail,projected[1].detail,'equal distances still identify distinct key/finger conditions');
  assert.equal(projected[0].label,'1 step');assert.equal(projected[2].rating,'Some effort');
  browser.key('ArrowDown',projected);browser.key('ArrowRight',projected);browser.key('Enter',projected);
  assert.equal(JSON.stringify(collection),before,'grouping and navigation never rewrite retained measurements');
  const revised=structuredClone(collection);revised.observations.push({...structuredClone(revised.observations[0]),grade:4});
  assert.equal(effortReviewRows(plan,revised,'iso')[0].rating,'Unavailable');
  revised.retractions.push({observationIndex:revised.observations.length-1,recordedAt:'2026-10-12T16:01:00.000Z',reason:'Sample withdrawal'});
  assert.equal(effortReviewRows(plan,revised,'iso')[0].rating,'Natural fit','withdrawn ratings do not override retained evidence');
  revised.retractions.push({observationIndex:0,recordedAt:'2026-10-12T16:01:00.000Z',reason:'Sample withdrawal'});
  assert.ok(!effortReviewRows(plan,revised,'iso').some(r=>r.id===targets[0].id),'fully withdrawn conditions are absent from review');
 }
});
