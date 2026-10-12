import {effortWorkAt,EFFORT_GRADES,type EffortCollection,type EffortPlan} from './calibration-effort';
import {calibrationFingerNames,calibrationPitchText,type CalibrationNoteNames} from './calibration-trial-renderer';
import type {CalibrationReviewRow} from './calibration-review-browser';

/** Current batch adapter only: neither the plan nor retained observations are modified. */
export function effortReviewRows(plan:EffortPlan,collection:EffortCollection,names:CalibrationNoteNames):CalibrationReviewRow[]{
 const keys=new Map(plan.keyboard.keys.map(k=>[k.id,k]));
 return plan.trials.flatMap(trial=>{
  const work=effortWorkAt(collection,trial.id);if(work.status!=='measured')return [];
  const placements=[...trial.anchors,...trial.active].sort((a,b)=>a.finger-b.finger),fingers=[...new Set(placements.map(p=>p.finger))];
  return [{id:trial.id,groupId:fingers.join('-'),groupLabel:fingers.map(f=>calibrationFingerNames[f]).join(' + '),
   label:`${trial.distanceSemitoneSteps} ${trial.distanceSemitoneSteps===1?'step':'steps'}`,
   detail:placements.map(p=>{const k=keys.get(p.keyId)!;return `${calibrationFingerNames[p.finger]} ${calibrationPitchText(k.midiPitch,names)}${k.row?` ${k.level}`:''}`;}).join(' · '),rating:EFFORT_GRADES[work.grade].label}];
 });
}
