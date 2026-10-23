import {isMeterPulseGrid,validatePulseGrid,type PracticePulseGrid} from './score-clock';
import {builtInClicks} from './piano-preferences';
import {host,practiceAudio} from './host';
import {practiceTiming,pulseAt} from './practice-timing';
import {ClockOrigin} from './clock-origin';
import {selectPracticeRepeatStart,repeatStartFromCountOrigin,type PracticeRepeatPlan} from './practice-repeat';
export interface PreparedPracticeRepeat {readonly armId:number;readonly countStartMs:number;readonly startMs:number;readonly nextBpm:number}
interface PendingRepeat extends PreparedPracticeRepeat {readonly ownerOriginMicros:number;readonly countStartMicros:number;readonly generation:number;readonly grid:PracticePulseGrid;readonly durationMs:number;readonly plan:PracticeRepeatPlan;index:number}
/** Audio scheduling and MIDI grading share one mapped timeline on each host. */
export class PracticeClock {
 private static nativeOwner?:PracticeClock;private static nativeStopPending=Promise.resolve();private static armSequence=0;
 private unlistenAudio?:()=>void;
 private audio?:AudioContext;private audioClosePending=Promise.resolve();private interval?:number;private nodes:OscillatorNode[]=[];private grid?:PracticePulseGrid;private origin=0;private eighth=0;private countStep=0;private index=0;private end=0;private nativeClock?:ClockOrigin;private midiClock?:ClockOrigin;private stopPending=Promise.resolve();private generation=0;
 private countOriginMicros=0;private armGeneration=0;private pending?:PendingRepeat;private inFlightArm?:{armId:number;ownerOriginMicros:number};private pendingNodes=new Set<OscillatorNode>();private armOperations=Promise.resolve();
 constructor(readonly native=false,readonly output='',private readonly onError:(message:string)=>void=()=>{}){}
 unlock(){
  if(this.native)return Promise.resolve();
  if(!this.audio){this.audio=new AudioContext({latencyHint:'interactive'});this.audioClosePending=Promise.resolve();}
  const audio=this.audio,resume=audio.resume();let timeout:ReturnType<typeof setTimeout>;
  return Promise.race([resume,new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(Error('Audio did not start. Open practice settings and test the output.')),2500);})]).then(()=>{if(this.audio!==audio)throw Error('Practice start was cancelled');if(audio.state!=='running')throw Error(`Audio is ${audio.state}; test the output before starting.`);}).finally(()=>clearTimeout(timeout));
 }
 async beginRepeat(bpm:number,durationMs:number,plan:PracticeRepeatPlan,grid?:PracticePulseGrid){
  grid=plan.grid??grid;
  if(plan.nextBpm!==bpm)throw Error('Repeat tempo differs from its musical boundary');
  if(!Number.isFinite(durationMs)||durationMs<=practiceTiming(bpm,grid).countInMs||durationMs>3_600_000)throw Error('Invalid musical repeat duration');
  const countStartMs=await this.start(bpm,durationMs,true,plan,grid);
  return repeatStartFromCountOrigin(plan,countStartMs);
 }
 begin(bpm:number,durationMs:number,countIn=false,grid?:PracticePulseGrid){return this.start(bpm,durationMs,countIn,undefined,grid);}
 /** Preparation carries no success/attainment authority and does not stop current audio. */
 armRepeat(bpm:number,durationMs:number,plan:PracticeRepeatPlan,grid:PracticePulseGrid):Promise<PreparedPracticeRepeat|undefined>{
  grid=plan.grid??grid;
  grid=validatePulseGrid(grid);if(!isMeterPulseGrid(grid)||!grid.scoreOffsetPulses||plan.nextBpm!==bpm||!Number.isFinite(durationMs)||durationMs<=plan.countInMs||durationMs>3_600_000)throw Error('Invalid prepared musical repeat');
  const timing=practiceTiming(bpm,grid),expectedDuration=(grid.scoreOffsetPulses+grid.barStartPulses.at(-1)!)*timing.eighthMs;
  if(Math.abs(durationMs-expectedDuration)>.002||Math.abs(plan.countInMs-timing.countInMs)>.002)throw Error('Prepared repeat duration differs from its source clock');
  const generation=this.generation,armGeneration=++this.armGeneration,armId=++PracticeClock.armSequence,ownerOriginMicros=this.countOriginMicros;if(!Number.isSafeInteger(armId))throw Error('Practice repeat ownership overflow');
  const operation=this.armOperations.then(async()=>{
   if(generation!==this.generation||armGeneration!==this.armGeneration)return;
   await this.cancelPending();if(generation!==this.generation||armGeneration!==this.armGeneration)return;
   const timing=practiceTiming(bpm,grid);let countStartMs=plan.boundaryMs,countStartMicros=Math.round(countStartMs*1000);
   if(this.native){
    const owned={armId,ownerOriginMicros};this.inFlightArm=owned;
    const receipt=await practiceAudio.armRepeat(this.output,bpm,durationMs,timing.countStepMs,countStartMs*1000,grid,ownerOriginMicros,armId);
    if(this.inFlightArm===owned)this.inFlightArm=undefined;
    if(receipt.version!==2||receipt.armId!==armId||typeof receipt.armed!=='boolean')throw Error('Invalid prepared repeat receipt');
    if(generation!==this.generation||armGeneration!==this.armGeneration){if(receipt.armed)await practiceAudio.cancelRepeat(armId,ownerOriginMicros);return;}
    if(!receipt.armed)return;
    if(!Number.isSafeInteger(receipt.countStartMicros)||!Number.isSafeInteger(receipt.scoreStartMicros)||Math.abs(receipt.countStartMicros-countStartMs*1000)>2||Math.abs(receipt.scoreStartMicros-(receipt.countStartMicros+plan.countInMs*1000))>2){await practiceAudio.cancelRepeat(armId,ownerOriginMicros);throw Error('Prepared repeat did not preserve its source bar boundary');}
    countStartMicros=receipt.countStartMicros;countStartMs=countStartMicros/1000;
   }else if(!this.audio||this.audio.state!=='running'||countStartMs<this.audio.currentTime*1000+256/(this.audio.sampleRate||48000)*1000)return;
   const start=repeatStartFromCountOrigin(plan,countStartMs),pending:PendingRepeat={armId,ownerOriginMicros,countStartMicros,generation,grid,durationMs,plan,index:0,countStartMs,startMs:start.startMs,nextBpm:bpm};this.pending=pending;if(!this.native)this.schedule();return pending;
  });
  this.armOperations=operation.then(()=>{},()=>{});return operation;
 }
 async cancelRepeat(){this.armGeneration++;const pending=this.pending;if(pending)return this.cancelPending();const owned=this.inFlightArm;if(owned&&this.native)return this.cancelNative(owned.armId,owned.ownerOriginMicros);}
 private async cancelNative(armId:number,ownerOriginMicros:number){const receipt=await practiceAudio.cancelRepeat(armId,ownerOriginMicros);if(receipt.version!==2||receipt.armId!==armId||receipt.previousCountStartMicros!==ownerOriginMicros||!['queued','activated','missing'].includes(receipt.state))throw Error('Invalid repeat cancellation receipt');return receipt.state;}
 private async cancelPending(){const pending=this.pending;if(!pending)return;this.pending=undefined;for(const n of this.pendingNodes){try{n.stop();}catch{}this.nodes=this.nodes.filter(q=>q!==n);}this.pendingNodes.clear();if(this.native)return this.cancelNative(pending.armId,pending.ownerOriginMicros);return this.now()>=pending.countStartMs?'activated':'queued';}
 adoptRepeat(prepared:PreparedPracticeRepeat){const p=this.pending;if(!p||p.armId!==prepared.armId||p.generation!==this.generation)throw Error('Prepared repeat no longer owns this clock');if(!this.native&&(!this.audio||p.startMs<=this.audio.currentTime*1000+256/(this.audio.sampleRate||48000)*1000))throw Error('The next repeat could not start on time. Resume starts a fresh count-in.');this.pending=undefined;this.countOriginMicros=p.countStartMicros;if(!this.native){const t=practiceTiming(p.nextBpm,p.grid);this.origin=p.countStartMs/1000;this.grid=p.grid;this.eighth=t.eighthMs;this.countStep=t.countStepMs;this.index=p.index;this.end=this.origin+p.durationMs/1000;this.pendingNodes.clear();this.schedule();}return repeatStartFromCountOrigin(p.plan,p.countStartMs);}
 private async start(bpm:number,durationMs:number,countIn:boolean,repeat?:PracticeRepeatPlan,grid?:PracticePulseGrid){
  grid=grid?validatePulseGrid(grid):undefined;const timing=practiceTiming(bpm,grid);
  if(!Number.isFinite(bpm)||bpm<5||bpm>500||!Number.isFinite(durationMs)||durationMs<1||durationMs>3_600_000)throw Error('Choose a rate from 5–500 per minute and an attempt no longer than one hour.');
  if(grid&&!!grid.scoreOffsetPulses!==countIn)throw Error('The score metronome count-in differs from its pulse grid.');
  const unlock=this.unlock();
  if(this.native){
   const previous=PracticeClock.nativeOwner;
   if(previous&&previous!==this)previous.cancelLocal();
   PracticeClock.nativeOwner=this;
  }
  const stopping=this.stop(),generation=this.generation;
  if(this.native)PracticeClock.nativeOwner=this;
  try{
   await stopping;await unlock;this.checkGeneration(generation);
   if(this.native){
    let reported=false;
    const unlisten=await practiceAudio.onError(message=>{
     if(generation!==this.generation||PracticeClock.nativeOwner!==this||reported)return;
     reported=true;this.onError(message);
    });
    if(generation!==this.generation||PracticeClock.nativeOwner!==this){unlisten();this.checkGeneration(generation);throw Error('Practice start was cancelled');}
    this.unlistenAudio=unlisten;
    const before=performance.now(),native=await host.midiClock(),after=performance.now();this.checkGeneration(generation);
    const sampled=new ClockOrigin(before,native,after);
    const startMicros=await practiceAudio.begin(this.output,bpm,durationMs,countIn?timing.countStepMs:0,repeat?repeat.earliestStartMs*1000:undefined,grid,!!repeat?.fullCountIn);
    if(!Number.isSafeInteger(startMicros))throw Error('Invalid practice clock origin');const start=startMicros/1000;
    this.checkGeneration(generation);if(repeat)repeatStartFromCountOrigin(repeat,start);this.nativeClock=sampled;this.midiClock=new ClockOrigin(0,0,0);this.countOriginMicros=startMicros;return start;
   }
   const audio=this.audio!,before=audio.currentTime*1000,native=await host.midiClock(),after=audio.currentTime*1000;this.checkGeneration(generation);
   if(audio.state!=='running')throw Error('Audio stopped. Test the output before starting.');
   this.midiClock=new ClockOrigin(before,native,after);const ready=audio.currentTime+.15,start=repeat?selectPracticeRepeatStart(repeat,ready*1000).countStartMs/1000:ready;this.origin=start;this.grid=grid;this.eighth=timing.eighthMs;this.countStep=countIn?timing.countStepMs:0;this.end=start+durationMs/1000;this.index=0;this.schedule();this.interval=window.setInterval(()=>this.schedule(),20);return start*1000;
  }catch(error){if(generation===this.generation)void this.stop();throw error;}
 }
 now(){return this.native?this.nativeClock?.toNative(performance.now())!:this.audio?.currentTime! *1000;}
 fromMidi(nativeMicros:number){if(!this.midiClock)throw Error('The practice clock has not started');return this.midiClock.fromMidi(nativeMicros);}
 private checkGeneration(generation:number){if(generation!==this.generation)throw Error('Practice start was cancelled');}
 private schedule(){const audio=this.audio!,pending=this.pending,render=(origin:number,eighth:number,countStep:number,grid:PracticePulseGrid|undefined,index:number,end:number,owned=false)=>{for(;;){const pulse=pulseAt(index,eighth,countStep,grid),next=origin+pulse.offsetMs/1000;if(pulse.amplitude===0||next>=audio.currentTime+.15||next>=end-1e-9)break;const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.frequency.value=pulse.frequency;gain.gain.setValueAtTime(pulse.amplitude*builtInClicks.gain,next);if(builtInClicks.gain>0)gain.gain.exponentialRampToValueAtTime(.001*builtInClicks.gain,next+.04);oscillator.connect(gain).connect(audio.destination);oscillator.start(next);oscillator.stop(next+.045);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();this.nodes=this.nodes.filter(n=>n!==oscillator);this.pendingNodes.delete(oscillator);};this.nodes.push(oscillator);if(owned)this.pendingNodes.add(oscillator);index++;}return index;};this.index=render(this.origin,this.eighth,this.countStep,this.grid,this.index,Math.min(this.end,pending?pending.countStartMs/1000:Infinity));if(pending){const t=practiceTiming(pending.nextBpm,pending.grid);pending.index=render(pending.countStartMs/1000,t.eighthMs,t.countStepMs,pending.grid,pending.index,pending.startMs/1000,true);}}
 private cancelLocal(){this.generation++;this.armGeneration++;this.pending=undefined;this.inFlightArm=undefined;this.pendingNodes.clear();this.unlistenAudio?.();this.unlistenAudio=undefined;clearInterval(this.interval);this.interval=undefined;for(const n of this.nodes){try{n.stop();}catch{}}this.nodes=[];this.midiClock=undefined;this.nativeClock=undefined;}
 stop(){
  this.cancelLocal();
  if(this.native){
   if(PracticeClock.nativeOwner===this){
    PracticeClock.nativeOwner=undefined;
    PracticeClock.nativeStopPending=PracticeClock.nativeStopPending.catch(()=>{}).then(()=>practiceAudio.stop());
   }
   this.stopPending=PracticeClock.nativeStopPending;
  }
  return this.stopPending;
 }
 close(){const audio=this.audio;this.audio=undefined;const stopping=this.stop();this.midiClock=undefined;this.nativeClock=undefined;if(audio&&audio.state!=='closed'){const closing=audio.close();this.audioClosePending=closing;void closing.catch(error=>{if(this.audioClosePending===closing&&!this.audio)this.onError(`Audio could not close: ${error instanceof Error?error.message:String(error)}`);});}return this.native?stopping:this.audioClosePending;}
}
