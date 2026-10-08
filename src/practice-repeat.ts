import {practiceTiming} from './practice-timing';

/** BPM denotes the score's admitted goal beat (No.14: dotted quarter, 3/8). */
export interface PracticeRepeatPlan {
 readonly previousStartMs:number;
 readonly phraseEndMs:number;
 readonly boundaryMs:number;
 readonly nextBpm:number;
 readonly goalBeatMs:number;
 readonly earliestStartMs:number;
 readonly gapBeats:2;
 readonly fullCountIn?:true;
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
export function planPracticeRepeat(input:{previousStartMs:number;phraseEndMs:number;previousBpm:number;nextBpm:number;fullCountIn?:true}):PracticeRepeatPlan {
 const {previousStartMs,phraseEndMs,previousBpm,nextBpm}=input;
 if(!validTime(previousStartMs)||!validTime(phraseEndMs)||phraseEndMs<previousStartMs||!validBpm(previousBpm)||!validBpm(nextBpm))throw Error('Invalid musical repeat boundary');
 const previousBeatMs=practiceTiming(previousBpm).goalBeatMs;
 // Remove only arithmetic noise at an exact score beat, never wall-clock delay.
 const beats=Math.ceil((phraseEndMs-previousStartMs)/previousBeatMs-1e-9);
 const boundaryMs=previousStartMs+beats*previousBeatMs;
 const goalBeatMs=practiceTiming(nextBpm).goalBeatMs;
 const earliestStartMs=boundaryMs+practiceTiming(nextBpm).countInMs;
 if(!validTime(earliestStartMs))throw Error('Musical repeat clock overflow');
 return Object.freeze({previousStartMs,phraseEndMs,boundaryMs,nextBpm,goalBeatMs,earliestStartMs,gapBeats:2,...(input.fullCountIn?{fullCountIn:true as const}:{})});
}
/** Readiness selects a grid point; it never becomes a new musical origin. */
export function selectPracticeRepeatStart(plan:PracticeRepeatPlan,readyMs:number):PracticeRepeatStart {
 if(!validTime(readyMs))throw Error('Invalid repeat output clock');
 const extraBeats=Math.max(0,Math.ceil((readyMs-(plan.fullCountIn?plan.boundaryMs:plan.earliestStartMs))/plan.goalBeatMs));
 return repeatStartFromCountOrigin(plan,plan.earliestStartMs+extraBeats*plan.goalBeatMs-practiceTiming(plan.nextBpm).countInMs);
}
/** Native origins have microsecond resolution; reject off-grid output receipts. */
export function repeatStartFromCountOrigin(plan:PracticeRepeatPlan,countStartMs:number):PracticeRepeatStart {
 if(!validTime(countStartMs))throw Error('Invalid repeat count origin');
 const startMs=countStartMs+practiceTiming(plan.nextBpm).countInMs;
 if(!validTime(startMs))throw Error('Musical repeat clock overflow');
 const extraBeats=Math.round((startMs-plan.earliestStartMs)/plan.goalBeatMs);
 if(extraBeats<0||Math.abs(startMs-(plan.earliestStartMs+extraBeats*plan.goalBeatMs))>.002)throw Error('Repeat output did not preserve the musical beat grid');
 return {countStartMs,startMs,extraBeats,totalGapBeats:plan.gapBeats+extraBeats};
}
