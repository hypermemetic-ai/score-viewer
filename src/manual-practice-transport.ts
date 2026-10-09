import {PracticeClock,type PreparedPracticeRepeat} from './practice-clock';
import {planPracticeRepeat,type PracticeRepeatPlan} from './practice-repeat';
import {practiceTiming} from './practice-timing';
import {scoreTickMs} from './score-clock';
import type {ManualPracticeSession} from './manual-practice-session';

export type ManualClock=Pick<PracticeClock,'begin'|'armRepeat'|'adoptRepeat'|'beginRepeat'|'cancelRepeat'|'stop'|'now'|'close'>;
interface ArmedLoop {generation:number;rate:number;plan:PracticeRepeatPlan;promise:Promise<PreparedPracticeRepeat|undefined>;receipt?:PreparedPracticeRepeat;settled:boolean}
/** Uses the existing owned audio clock and full source-bar repeat protocol.
 * No MIDI or performed-note authority enters this transport. */
export class ManualPracticeTransport {
 private generation=0;private armed?:ArmedLoop;private finishing=false;private deadline?:ReturnType<typeof setTimeout>;private cancelWait?:()=>void;
 disposed=false;
 constructor(readonly session:ManualPracticeSession,readonly clock:ManualClock,private changed:()=>void,private failed:(message:string)=>void){}
 get futureCount(){return this.finishing&&this.armed?this.armed.plan:undefined;}
 async start(){
  if(this.disposed)return;
  const generation=++this.generation;this.clearDeadline();this.armed=undefined;this.finishing=false;
  try{
   this.session.applyNextRate();const rate=this.session.state.working,grid=this.session.sourcePulseGrid,
    duration=(this.session.chunk.end-this.session.chunk.start)*scoreTickMs(this.session.plan,rate)+practiceTiming(rate,grid).countInMs,
    origin=await this.clock.begin(rate,duration,true,grid);
   if(generation!==this.generation||this.disposed)return;
   this.session.ready(origin,grid);this.changed();this.prepare();
  }catch(error){if(generation===this.generation&&!this.disposed)this.fail((error as Error).message);}
 }
 update(now=this.clock.now()){
  if(this.disposed||!Number.isFinite(now))return;
  const before=this.session.phase,window=this.session.windows.index,completed=this.session.update(now);
  if(before!==this.session.phase||window!==this.session.windows.index)this.changed();
  if(completed&&!this.finishing){this.finishing=true;void this.finish();}
  else if(!this.finishing&&['trial','countin'].includes(this.session.phase))this.prepare();
 }
 /** A Done/Speed-lock change invalidates only the not-yet-entered repeat. */
 prepare(){
  if(this.disposed||this.finishing||!['trial','countin'].includes(this.session.phase))return;
  const s=this.session,rate=s.nextRate();if(this.armed?.rate===rate)return;
  const generation=this.generation,plan=planPracticeRepeat({previousStartMs:s.startMs,phraseEndMs:s.startMs+s.durationMs,
   previousBpm:s.bpm,nextBpm:rate,grid:s.pulseGrid,sourceBoundary:true}),duration=(s.chunk.end-s.chunk.start)*scoreTickMs(s.plan,rate)+plan.countInMs,
   armed:ArmedLoop={generation,rate,plan,promise:Promise.resolve(undefined),settled:false};
  this.armed=armed;
  armed.promise=this.clock.armRepeat(rate,duration,plan,plan.grid??s.pulseGrid).then(receipt=>{
   armed.settled=true;if(this.armed===armed&&generation===this.generation&&!this.disposed)armed.receipt=receipt;return receipt;
  }).catch(error=>{armed.settled=true;if(this.armed===armed&&generation===this.generation&&!this.disposed)this.fail((error as Error).message);return undefined;});
 }
 private async finish(){
  const generation=this.generation,s=this.session,armed=this.armed,rate=s.applyNextRate(),
   plan=planPracticeRepeat({previousStartMs:s.startMs,phraseEndMs:s.startMs+s.durationMs,previousBpm:s.bpm,nextBpm:rate,
    grid:s.pulseGrid,sourceBoundary:true});
  this.changed();
  try{
   if(armed&&armed.generation===generation&&armed.rate===rate){
    // A delayed bridge acknowledgement must not cause a second partial cue.
    // Preserve the already armed full cue until its score entry, then pause
    // truthfully if ownership still cannot be established.
    const wait=Math.max(0,armed.plan.earliestStartMs-this.clock.now());
    const receipt=armed.settled?armed.receipt:await Promise.race([armed.promise,new Promise<undefined>(resolve=>{this.cancelWait=()=>resolve(undefined);this.deadline=setTimeout(()=>resolve(undefined),wait);})]);
    if(generation!==this.generation||this.disposed)return;this.clearDeadline();
    if(receipt){this.clock.adoptRepeat(receipt);s.ready(receipt.countStartMs,armed.plan.grid??s.sourcePulseGrid);}
    else if(!armed.settled)throw Error('The repeat clock did not confirm its count-in. Resume to start a full count-in.');
    else await this.restart(plan,generation);
   }else await this.restart(plan,generation);
   if(generation!==this.generation||this.disposed)return;
   this.finishing=false;this.armed=undefined;s.update(this.clock.now());this.changed();this.prepare();
  }catch(error){if(generation===this.generation&&!this.disposed)this.fail((error as Error).message);}
 }
 private async restart(plan:PracticeRepeatPlan,generation:number){
  const s=this.session,duration=(s.chunk.end-s.chunk.start)*scoreTickMs(s.plan,plan.nextBpm)+plan.countInMs,
   start=await this.clock.beginRepeat(plan.nextBpm,duration,plan,plan.grid);
  if(generation===this.generation&&!this.disposed)s.ready(start.countStartMs,plan.grid??s.sourcePulseGrid);
 }
 private clearDeadline(){if(this.deadline!==undefined)clearTimeout(this.deadline);this.deadline=undefined;this.cancelWait?.();this.cancelWait=undefined;}
 private fail(message:string){this.pause();this.failed(message);}
 pause(){if(this.disposed)return;this.generation++;this.clearDeadline();this.armed=undefined;this.finishing=false;this.session.pause();void this.clock.stop();this.changed();}
 close(){if(this.disposed)return;this.pause();this.disposed=true;this.clock.close();}
}
