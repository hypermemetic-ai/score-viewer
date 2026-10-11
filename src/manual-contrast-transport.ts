import {PracticeDone} from './practice-attainment';
import {PracticeContrastCycle} from './practice-contrast-cycle';
import {scoreTickMs} from './score-clock';
import {capturePracticeAttempt} from './practice-attempt-grid';
import type {ManualPracticeSession} from './manual-practice-session';
import type {ManualClock} from './manual-practice-transport';

/** Each discontinuity owns a fresh count-in. No speculative repeat can
 * turn preparation or one variant into completion of the paired exercise. */
export class ManualContrastTransport {
 readonly claims=new PracticeDone();private cycle=new PracticeContrastCycle();private generation=0;
 disposed=false;private finishing=false;private pendingStartRate?:number;session:ManualPracticeSession;
 constructor(private create:(index:0|1,claims:PracticeDone)=>ManualPracticeSession,readonly clock:ManualClock,private changed:()=>void,private failed:(message:string)=>void){this.session=create(0,this.claims);}
 get startingRate(){return this.pendingStartRate;}
 get futureCount(){return undefined;}
 async start(){if(this.disposed)return;this.pause();this.session=this.create(0,this.claims);this.session.applyNextRate();this.cycle.start(this.session.state.working,false);await this.enter();}
 private async enter(){
  const generation=++this.generation,s=this.session,attempt=capturePracticeAttempt(this.cycle.rate!,s.sourcePulseGrid);this.pendingStartRate=attempt.bpm;this.finishing=true;this.changed();
  try{await this.clock.stop();if(generation!==this.generation||this.disposed)return;const origin=await this.clock.begin(attempt.bpm,(s.completionTick-s.chunk.start)*scoreTickMs(s.plan,attempt.bpm)+attempt.countInMs,true,attempt.grid);
   if(generation!==this.generation||this.disposed||s!==this.session)return;const desired=s.state.working;s.ready(origin,attempt.grid,attempt.bpm);if(desired!==attempt.bpm)s.queueWorking(desired);this.finishing=false;this.changed();
  }catch(error){if(generation===this.generation&&!this.disposed){this.pause();this.failed((error as Error).message);}}
  finally{if(generation===this.generation)this.pendingStartRate=undefined;}
 }
 update(now=this.clock.now()){
  if(this.disposed||this.finishing||!Number.isFinite(now))return;const s=this.session,before=s.phase,completed=s.update(now);
  if(before!==s.phase)this.changed();if(!completed)return;
  const result=this.cycle.accept(this.cycle.index,s.bpm,false);if(result==='stale'){this.pause();return;}
  if(result==='next'){const desired=s.nextRate();this.session=this.create(1,this.claims);if(desired!==s.bpm)this.session.queueWorking(desired);void this.enter();return;}
  this.claims.completed({passage:s.chunk.id,pattern:s.chunk.pattern,rate:s.bpm});s.applyNextRate();this.changed();this.session=this.create(0,this.claims);this.cycle.start(s.state.working,false);void this.enter();
 }
 prepare(){}
 pause(){if(this.disposed)return;this.generation++;this.cycle.cancel();this.pendingStartRate=undefined;this.finishing=false;this.session.pause();void this.clock.stop();this.changed();}
 close(){if(this.disposed)return;this.pause();this.disposed=true;this.clock.close();}
}
