import {practiceTiming} from './practice-timing';
import {validatePulseGrid,repeatPulseGrid,type PracticePulseGrid} from './score-clock';

/** BPM denotes the score's admitted goal beat (No.14: dotted quarter, 3/8). */
export interface PracticeRepeatPlan {
 readonly previousStartMs:number;
 readonly phraseEndMs:number;
 readonly boundaryMs:number;
 readonly nextBpm:number;
 readonly goalBeatMs:number;
 readonly earliestStartMs:number;
 readonly gapBeats:number;
 readonly countInMs:number;
 readonly repeatBarMs:number;
 readonly fullCountIn:true;
 readonly grid?:PracticePulseGrid;
}
export interface PracticeRepeatStart {
 readonly countStartMs:number;
 readonly startMs:number;
 readonly extraBeats:number;
 readonly totalGapBeats:number;
}
const validBpm=(bpm:number)=>Number.isFinite(bpm)&&bpm>=5&&bpm<=500;
const validTime=(ms:number)=>Number.isFinite(ms)&&ms>=0&&ms*1000<=Number.MAX_SAFE_INTEGER;
/** Capture source/audio deadlines before recording success mutates working tempo. */
export function planPracticeRepeat(input:{previousStartMs:number;phraseEndMs:number;previousBpm:number;nextBpm:number;fullCountIn?:true;grid?:PracticePulseGrid;previousGrid?:PracticePulseGrid;sourceBoundary?:true}):PracticeRepeatPlan {
 const {previousStartMs,phraseEndMs,previousBpm,nextBpm}=input;
 if(!validTime(previousStartMs)||!validTime(phraseEndMs)||phraseEndMs<previousStartMs||!validBpm(previousBpm)||!validBpm(nextBpm))throw Error('Invalid musical repeat boundary');
 const admitted=input.grid?validatePulseGrid(input.grid):undefined,grid=admitted?.version===2&&input.sourceBoundary?repeatPulseGrid(admitted,input.previousGrid):admitted,previousBeatMs=grid?.version===2?practiceTiming(previousBpm,grid).countBarMs:practiceTiming(previousBpm).goalBeatMs;
 // Remove only arithmetic noise at an exact score beat, never wall-clock delay.
 const beats=Math.ceil((phraseEndMs-previousStartMs)/previousBeatMs-1e-9);
 const boundaryMs=input.sourceBoundary?phraseEndMs:previousStartMs+beats*previousBeatMs;
 const {goalBeatMs,countInMs,countBarMs}=practiceTiming(nextBpm,grid),repeatBarMs=grid?.version===2?countBarMs:goalBeatMs;
 const earliestStartMs=boundaryMs+countInMs;
 if(!validTime(earliestStartMs))throw Error('Musical repeat clock overflow');
 return Object.freeze({previousStartMs,phraseEndMs,boundaryMs,nextBpm,goalBeatMs,earliestStartMs,countInMs,repeatBarMs,gapBeats:countInMs/goalBeatMs,fullCountIn:true as const,...(grid?{grid}:{})});
}
/** Readiness selects a grid point; it never becomes a new musical origin. */
export function selectPracticeRepeatStart(plan:PracticeRepeatPlan,readyMs:number):PracticeRepeatStart {
 if(!validTime(readyMs))throw Error('Invalid repeat output clock');
 const extraBars=Math.max(0,Math.ceil((readyMs-plan.boundaryMs)/plan.repeatBarMs-1e-9));
 return repeatStartFromCountOrigin(plan,plan.boundaryMs+extraBars*plan.repeatBarMs);
}
/** Native origins have microsecond resolution; reject off-grid output receipts. */
export function repeatStartFromCountOrigin(plan:PracticeRepeatPlan,countStartMs:number):PracticeRepeatStart {
 if(!validTime(countStartMs))throw Error('Invalid repeat count origin');
 const startMs=countStartMs+plan.countInMs;
 if(!validTime(startMs))throw Error('Musical repeat clock overflow');
 const extraBars=Math.round((startMs-plan.earliestStartMs)/plan.repeatBarMs),extraBeats=extraBars*plan.repeatBarMs/plan.goalBeatMs;
 if(extraBars<0||Math.abs(startMs-(plan.earliestStartMs+extraBars*plan.repeatBarMs))>.002)throw Error('Repeat output did not preserve the musical beat grid');
 return {countStartMs,startMs,extraBeats,totalGapBeats:plan.gapBeats+extraBeats};
}
