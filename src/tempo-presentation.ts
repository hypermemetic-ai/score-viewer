/** Presentation adapters. BPM remains the exact persisted clock/record identity. */
import {tempoRateNumber} from './metronome-mark';
const decimal=(value:number,digits:number)=>Number(value.toFixed(digits)).toString();
export const beatMilliseconds=(bpm:number)=>60000/bpm;
export const manualDurationStep=(elapsed=0)=>elapsed>=3000?100:elapsed>=1500?25:5;
export const manualProgressionStep=(_elapsed=0)=>.5;
/** Positive direction speeds up. Do not quantize arbitrary exact originals. */
export function adjustDuration(bpm:number,direction:number,elapsed=0):number {
 const ms=Math.max(120,Math.min(12000,beatMilliseconds(bpm)-direction*manualDurationStep(elapsed)));
 return ms===beatMilliseconds(bpm)?bpm:60000/ms;
}
/** Move to the next half-percentage-point grid value; stored BPM stays exact. */
export function adjustPercent(bpm:number,goal:number,direction:number,min=5,max=500):number {
 if(!direction)return bpm;
 const step=manualProgressionStep(),units=100*bpm/goal/step,nearest=Math.round(units);
 const aligned=Math.abs(units-nearest)<=8*Number.EPSILON*Math.max(1,Math.abs(units))?nearest:units;
 const quantum=step*goal/100,lo=Math.ceil(min/quantum-1e-10),hi=Math.floor(max/quantum+1e-10);
 const next=direction>0?Math.floor(aligned)+1:Math.ceil(aligned)-1;
 return Math.max(lo,Math.min(hi,next))*quantum;
}
/** Preferences are half-point choices; attained historical rates are never snapped. */
export function snapPracticeSpeed(bpm:number,goal:number,min=5,max=500):number {
 const quantum=goal*.005;
 if(!Number.isFinite(bpm)||!Number.isFinite(quantum)||quantum<=0)throw Error('Practice speed is unavailable.');
 return Math.max(Math.ceil(min/quantum-1e-10),Math.min(Math.floor(max/quantum+1e-10),Math.round(bpm/quantum)))*quantum;
}
export const snapPracticeStep=(step:number,goal:number)=>snapPracticeSpeed(step,goal,goal*.005,100);
/** A progression policy uses the same percentage grid with its own physical bounds. */
export function adjustProgression(step:number,goal:number,direction:number,_elapsed=0):number {
 return adjustPercent(step,goal,direction,goal*.005,100);
}
export function durationLabel(bpm:number):string {
 const ms=beatMilliseconds(bpm);
 return ms<500?`${Math.round(ms)} ms`:`${decimal(ms/1000,3)} s`;
}
export function speedNumber(bpm:number,goal:number):string {
 const percent=100*bpm/goal;
 if(!percent)return '0';
 let digits=1;while(Number(percent.toFixed(digits))===0&&digits<10)digits++;
 return decimal(percent,digits);
}
export const speedLabel=(bpm:number,goal:number)=>`${speedNumber(bpm,goal)}%`;
export const attainmentLabel=(bpm:number,goal:number)=>speedLabel(Math.min(bpm,goal),goal);
/** Percentage adjustment and ordinary speed fields share the same display precision. */
export function manualSpeedNumber(bpm:number,goal:number):string {
 return speedNumber(bpm,goal);
}
/** Do not reconstruct an untouched exact value from its rounded presentation. */
export function speedEdit(text:string,original:number,goal:number,presented=speedNumber(original,goal)):number {
 if(text.trim()===presented)return original;
 const percent=Number(text);if(!text.trim()||!Number.isFinite(percent)||percent<=0)throw Error('Choose a positive speed.');
 return percent*goal/100;
}
export function durationEdit(text:string,original:number):number {
 if(text.trim()===durationLabel(original))return original;
 const match=/^\s*(\d+(?:\.\d*)?|\.\d+)\s*(ms|s)?\s*$/i.exec(text);
 if(!match)throw Error('Enter a beat duration in ms or s.');
 const unit=match[2]?.toLowerCase()??(beatMilliseconds(original)<500?'ms':'s');
 const ms=Number(match[1])*(unit==='s'?1000:1),bpm=60000/ms;
 if(!Number.isFinite(bpm)||bpm<5||bpm>500)throw Error('Choose a beat duration from 120 ms to 12 s.');
 return bpm;
}
/** Tempo controls count the displayed source duration per minute. */
export function tempoRateEdit(text:string,original:number):number {
 if(text.trim()===tempoRateNumber(original))return original;
 const rate=/^\s*(\d+(?:\.\d*)?|\.\d+)\s*$/.test(text)?Number(text):NaN;
 if(!Number.isFinite(rate)||rate<5||rate>500)throw Error('Choose a rate from 5 to 500 per minute.');
 return rate;
}
