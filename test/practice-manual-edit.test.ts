import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceFixture} from './support/reference-score';
import {initialPractice,planPractice} from '../src/practice';
import {PracticeView} from '../src/practice-view';
import {adjustDuration,speedNumber} from '../src/tempo-presentation';
import {tempoRateNumber} from '../src/metronome-mark';

const score=await referenceFixture(new URL('../vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.tuna',import.meta.url)),plan=planPractice(score);
function draft(key:'working'|'step'|'target',value:string){
 const view=Object.create(PracticeView.prototype) as PracticeView;view.plan=plan;view.state=initialPractice(plan);let error='';Object.assign(view,{status:(message:string)=>{error=message;}});
 const field={value,dataset:{absolute:String(view.state[key]),presented:key==='target'?tempoRateNumber(view.state[key]):speedNumber(view.state[key],view.state.target)}} as unknown as HTMLInputElement;
 const adjust=(direction:number,elapsed=0)=>(view as any).adjustManualDraft(key,field,direction,elapsed) as boolean;
 return {view,field,adjust,error:()=>error};
}
test('numeric edit arrows stage snapped values without changing practice state',()=>{
 const d=draft('working','49.6'),before=JSON.stringify(d.view.state);assert.equal(d.adjust(1),true);assert.equal(Number(d.field.dataset.manualDraft),90);assert.equal(d.field.value,'50');assert.equal(d.adjust(-1),true);assert.equal(Number(d.field.dataset.manualDraft),89.1);assert.equal(d.field.value,'49.5');assert.equal(JSON.stringify(d.view.state),before);assert.equal(d.error(),'');
});
test('tempo edit retains exact draft timing between displayed rounded adjustments',()=>{
 const d=draft('target','181.2'),before=JSON.stringify(d.view.state),first=adjustDuration(181.2,1),second=adjustDuration(first,1);assert.equal(d.adjust(1),true);assert.equal(Number(d.field.dataset.manualDraft),first);assert.equal(d.adjust(1),true);assert.equal(Number(d.field.dataset.manualDraft),second);assert.equal(d.field.value,tempoRateNumber(second));assert.equal(JSON.stringify(d.view.state),before);
});
test('invalid typed increases are rejected before adjustment and retain exact saved state',()=>{
 const d=draft('step','0.001'),before=JSON.stringify(d.view.state);assert.equal(d.adjust(1),false);assert.match(d.error(),/retained/);assert.equal(d.field.value,'0.001');assert.equal(d.field.dataset.manualDraft,undefined);assert.equal(JSON.stringify(d.view.state),before);
});
