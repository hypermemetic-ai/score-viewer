import type {PracticePulseGrid} from './score-clock';
/** Musical time stays fixed; quieter subdivisions fill slow count-in and playing gaps. */
export function practiceTiming(bpm:number,grid?:PracticePulseGrid){
 const eighthMs=60000/(bpm*(grid?.pulsesPerBeat??3));let countStepMs=eighthMs;
 while(countStepMs>1000)countStepMs/=2;
 return {goalBeatMs:60000/bpm,eighthMs,countStepMs,countInMs:grid?grid.scoreOffsetPulses*eighthMs:6*eighthMs,countBarMs:grid?.version===2?grid.countBarPulses!*eighthMs:120000/bpm};
}
export function pulseAt(index:number,eighthMs:number,subdivisionMs=0,grid?:PracticePulseGrid){
 const step=subdivisionMs>0?subdivisionMs:eighthMs,ratio=Math.round(eighthMs/step),metricalIndex=Math.floor(index/ratio),intermediate=index%ratio!==0;
 const scoreIndex=metricalIndex-(grid?.scoreOffsetPulses??0),primary=grid?(scoreIndex<0?metricalIndex%(grid.countBarPulses??Infinity)===0:grid.barStartPulses.includes(scoreIndex)&&!(scoreIndex===0&&grid.scoreStartPhasePulses)):metricalIndex%6===0,secondary=grid?(grid.version===2?(scoreIndex<0?metricalIndex%grid.countBeatPulses! ===0:grid.beatStartPulses!.includes(scoreIndex)):(scoreIndex<0?metricalIndex:scoreIndex)%grid.pulsesPerBeat===0):metricalIndex%3===0;
 return {offsetMs:index*step,frequency:intermediate?650:primary?1200:secondary?900:650,amplitude:intermediate?.064:.16};
}
export function countBeatAt(elapsedMs:number,bpm:number,grid:PracticePulseGrid){const t=practiceTiming(bpm,grid);return elapsedMs<0?'·':String(Math.floor((elapsedMs/t.eighthMs)%grid.countBarPulses!/grid.countBeatPulses!)+1);}
