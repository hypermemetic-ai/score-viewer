/** Receipt policy only; the production renderer and timing oracle are unchanged. */
export interface EditCaseEvidence {
 name:string;samples:Array<{kind:string;ok:boolean}>;error?:string;
 hand?:{count:number;pass:boolean};finger?:{count:number;pass:boolean};
 delayedSaveRapidFrame?:{ok:boolean};delayedSaveRapidPass?:boolean;
 delayedSaveCorrectness?:boolean;saveRecoveryCorrectness?:boolean;scoreSwitchCorrectness?:boolean;
}
export interface EditReportEvidence {
 sampleCountPerClass:number;completeCoverage?:boolean;cpuProfileDiagnostic?:boolean;
 cases:EditCaseEvidence[];errors:unknown[];
}
const expectedCases=['no14','long-dense-120-bars','tie-page-reflow'].flatMap(name=>['conventional-piano','janko-four-row'].map(keyboard=>name+'-'+keyboard));
export function benchmarkVerdict(report:EditReportEvidence,acceptMeasuredLatency=false){
 const required=report.sampleCountPerClass,validCount=Number.isInteger(required)&&required>=20,
  completeCases=report.completeCoverage===true&&report.cases.length===6&&new Set(report.cases.map(c=>c.name)).size===6&&expectedCases.every(name=>report.cases.some(c=>c.name===name)),
  cases=report.cases.map(c=>{const hand=c.samples.filter(s=>s.kind==='hand'),finger=c.samples.filter(s=>s.kind==='finger'),
   samplesCorrect=validCount&&c.samples.length===required*2&&hand.length===required&&finger.length===required&&c.samples.every(s=>s.ok===true)&&c.hand?.count===required&&c.finger?.count===required,
   delayedRapidCorrect=c.delayedSaveRapidFrame?.ok===true&&c.delayedSaveCorrectness===true,
   recoveryCorrect=c.saveRecoveryCorrectness===true&&c.scoreSwitchCorrectness===true,
   pass=samplesCorrect&&delayedRapidCorrect&&recoveryCorrect&&!c.error;
   return {name:c.name,handSamples:hand.length,fingerSamples:finger.length,samplesCorrect,delayedRapidCorrect,recoveryCorrect,pass};}),
  correctnessCoverage={pass:completeCases&&!report.cpuProfileDiagnostic&&report.errors.length===0&&cases.every(c=>c.pass),completeCases,requiredSamplesPerClass:required,cases},
  latencyGoal={thresholdMs:100,pass:completeCases&&report.cases.every(c=>c.hand?.pass===true&&c.finger?.pass===true&&c.delayedSaveRapidPass===true)},
  releaseAcceptance={pass:correctnessCoverage.pass&&(latencyGoal.pass||acceptMeasuredLatency),basis:!correctnessCoverage.pass?'incomplete-or-failed-correctness':latencyGoal.pass?'100-ms-goal-met':acceptMeasuredLatency?'user-accepted-measured-latency':'100-ms-goal-required'},
  acceptedTradeOff={requested:acceptMeasuredLatency,applied:releaseAcceptance.pass&&!latencyGoal.pass,
   decision:'The user accepts achieved speed; 100 ms remains a tuning goal. Complete correctness, twenty samples per edit class in all six cases, delayed-save ordering, recovery and score-switch checks remain required.'};
 return {correctnessCoverage,latencyGoal,releaseAcceptance,acceptedTradeOff};
}
