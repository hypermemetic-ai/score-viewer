import test from 'node:test';import assert from 'node:assert/strict';
import {benchmarkVerdict,type EditReportEvidence} from '../scripts/fast-edit-benchmark-verdict';
function report():EditReportEvidence{return {sampleCountPerClass:20,completeCoverage:true,errors:[],cases:
 ['no14','long-dense-120-bars','tie-page-reflow'].flatMap(name=>['conventional-piano','janko-four-row'].map(keyboard=>({name:name+'-'+keyboard,
  samples:['hand','finger'].flatMap(kind=>Array.from({length:20},()=>({kind,ok:true}))),hand:{count:20,pass:true},finger:{count:20,pass:true},
  delayedSaveRapidFrame:{ok:true},delayedSaveRapidPass:true,delayedSaveCorrectness:true,saveRecoveryCorrectness:true,scoreSwitchCorrectness:true}))) };}
test('measured-latency acceptance preserves the failed 100 ms result and requires explicit opt-in',()=>{
 const measured=report();measured.cases[0].hand!.pass=false;measured.cases[0].delayedSaveRapidPass=false;
 const strict=benchmarkVerdict(measured),accepted=benchmarkVerdict(measured,true);
 assert.equal(strict.correctnessCoverage.pass,true);assert.equal(strict.latencyGoal.pass,false);assert.equal(strict.releaseAcceptance.pass,false);
 assert.deepEqual(accepted.latencyGoal,strict.latencyGoal);assert.equal(accepted.releaseAcceptance.pass,true);assert.equal(accepted.acceptedTradeOff.applied,true);
 assert.equal(benchmarkVerdict(report(),true).acceptedTradeOff.applied,false,'A met timing goal needs no trade-off');
});
test('latency opt-in cannot excuse missing cases, failed frames, missing samples, delayed-save errors or recovery failures',()=>{
 const failures:Array<(p:EditReportEvidence)=>void>=[p=>{p.cases.pop();},p=>{p.cases[5].name=p.cases[0].name;},
  p=>{p.completeCoverage=false;},p=>{p.cpuProfileDiagnostic=true;},p=>{p.errors.push('pageerror');},
  p=>{p.cases[0].samples.pop();},p=>{p.cases[0].samples[0].ok=false;},p=>{p.cases[0].hand!.count=19;},p=>{p.sampleCountPerClass=19;},
  p=>{p.cases[0].delayedSaveRapidFrame!.ok=false;},p=>{p.cases[0].delayedSaveCorrectness=false;},
  p=>{p.cases[0].saveRecoveryCorrectness=false;},p=>{delete p.cases[0].scoreSwitchCorrectness;},p=>{p.cases[0].error='refused projection';}];
 for(const fail of failures){const p=report();fail(p);const verdict=benchmarkVerdict(p,true);assert.equal(verdict.correctnessCoverage.pass,false);assert.equal(verdict.releaseAcceptance.pass,false);assert.equal(verdict.acceptedTradeOff.applied,false);}
});
