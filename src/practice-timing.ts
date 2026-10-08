import type {PracticePulseGrid} from './score-clock';
/** Musical time stays fixed; quieter subdivisions fill slow count-in and playing gaps. */
export function practiceTiming(bpm:number,grid?:PracticePulseGrid){
 const eighthMs=60000/(bpm*(grid?.pulsesPerBeat??3));let countStepMs=eighthMs;
 while(countStepMs>1000)countStepMs/=2;
 return {goalBeatMs:60000/bpm,eighthMs,countStepMs,countInMs:grid?120000/bpm:6*eighthMs};
}
export function pulseAt(index:number,eighthMs:number,subdivisionMs=0,grid?:PracticePulseGrid){
 const step=subdivisionMs>0?subdivisionMs:eighthMs,ratio=Math.round(eighthMs/step),metricalIndex=Math.floor(index/ratio),intermediate=index%ratio!==0;
 const scoreIndex=metricalIndex-(grid?.scoreOffsetPulses??0),primary=grid?(scoreIndex<0?metricalIndex===0:grid.barStartPulses.includes(scoreIndex)):metricalIndex%6===0,secondary=grid?(scoreIndex<0?metricalIndex:scoreIndex)%grid.pulsesPerBeat===0:metricalIndex%3===0;
 return {offsetMs:index*step,frequency:intermediate?650:primary?1200:secondary?900:650,amplitude:intermediate?.064:.16};
}
