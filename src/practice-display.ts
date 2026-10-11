import {attainedRate,measuredRate} from './practice-attainment';
import {passageHierarchy,type PracticeChunk,type PracticePassagePlan,type PracticeState} from './practice';
import {includedExerciseTotal} from './practice-exercise-catalog';

/** Presentation never manufactures assessment evidence or untimed preparation. */
export function displayedPracticeProgress(chunk:PracticeChunk,state:PracticeState,includeManual=true){
 const rate=includeManual?attainedRate(state,chunk.pattern,chunk.id):measuredRate(state,chunk.pattern,chunk.id);
 return Math.max(0,Math.min(1,rate/state.target));
}
export function displayedPracticeAssessment(plan:PracticePassagePlan,state:PracticeState,includeManual=true){
 const {all}=passageHierarchy(plan,state);
 if(plan.partition==='bounded-exercises-v1')return includedExerciseTotal([...all.values()],state.excluded,id=>displayedPracticeProgress(all.get(id)!,state,includeManual));
 return {included:plan.chunks.length,progress:displayedPracticeTotal(plan,state,includeManual)};
}
/** Each included current exercise owns an equal share; legacy totals retain their original meaning. */
export function displayedPracticeTotal(plan:PracticePassagePlan,state:PracticeState,includeManual=true){
 const {all}=passageHierarchy(plan,state);
 if(plan.partition==='bounded-exercises-v1')return includedExerciseTotal([...all.values()],state.excluded,id=>displayedPracticeProgress(all.get(id)!,state,includeManual)).progress??0;
 const weight=plan.chunks.reduce((n,c)=>n+c.weight,0);
 return weight?plan.chunks.reduce((n,c)=>n+c.weight*displayedPracticeProgress(c,state,includeManual),0)/weight:0;
}
export function displayedComponentsAttained(chunk:PracticeChunk,state:PracticeState,all:ReadonlyMap<string,PracticeChunk>,includeManual=true):boolean {
 return displayedPracticeProgress(chunk,state,includeManual)>=1||!!chunk.components?.length&&chunk.components.every(id=>displayedComponentsAttained(all.get(id)!,state,all,includeManual));
}
