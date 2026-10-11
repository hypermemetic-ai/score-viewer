import {PracticeDone,type DoneTarget} from './practice-attainment';
import {snapPracticeSpeed} from './tempo-presentation';
import {practiceTiming} from './practice-timing';
import {scoreExcerptPulseGrid,scorePulseGrid,scoreTickMs,type PracticePulseGrid} from './score-clock';
import {practiceAttemptGrid,practiceCountInGrid} from './practice-attempt-grid';
import {passageWindows} from './practice-window';
import {passageHierarchy,practiceClipChunk,type PracticeChunk,type PracticeState} from './practice';
import type {ManualPracticePlan} from './manual-practice-plan';

/** Explicit views move only because the player asks, or a repeat count-in starts. */
export class ManualPracticeWindows {
 readonly windows:number[][];index=0;
 constructor(plan:ManualPracticePlan,chunk:PracticeChunk){
  if(!Number.isSafeInteger(chunk.firstBar)||!Number.isSafeInteger(chunk.lastBar)||chunk.firstBar<0||chunk.lastBar<chunk.firstBar||
    chunk.lastBar>=plan.barTicks.length-1)throw Error('Manual passage window differs from source bars.');
  this.windows=passageWindows(plan,chunk);
 }
 get bars():readonly number[]{return this.windows[this.index];}
 turn(direction:1|-1){const next=Math.max(0,Math.min(this.windows.length-1,this.index+direction));if(next===this.index)return false;this.index=next;return true;}
 reset(){const changed=this.index!==0;this.index=0;return changed;}
 showBar(bar:number){const exact=this.windows.findIndex(window=>window[0]===bar),index=exact>=0?exact:this.windows.findIndex(window=>window.includes(bar));if(index<0)return false;const changed=index!==this.index;this.index=index;return changed;}
}

/** No MIDI contacts, match sets, note retirement or measured-success writer. */
export class ManualPracticeSession {
 readonly assessment='manual' as const;
 private sourceGrid:PracticePulseGrid;readonly windows:ManualPracticeWindows;
 get sourcePulseGrid(){return practiceCountInGrid(this.sourceGrid,this.state.countInBars??2);}
 phase:'ready'|'countin'|'trial'|'complete'|'paused'='ready';startMs=0;elapsedTick:number;
 private attemptGrid:PracticePulseGrid;private countStartMs=0;private resetAtCountIn=false;
 private loopRate:number;private queuedWorking?:number;private claims:PracticeDone;readonly completionTick:number;
 constructor(readonly plan:ManualPracticePlan,readonly chunk:PracticeChunk,readonly state:PracticeState,private options:{claims?:PracticeDone;completeClaim?:boolean}={}){
  const owner=passageHierarchy(plan,state).all.get(chunk.id),admitted=owner&&chunk.clipIndex!==undefined?practiceClipChunk(owner,chunk.clipIndex):owner;
  if(plan.assessment!=='manual'||state.revision!==plan.revision||!admitted||admitted.pattern!==chunk.pattern||
    admitted.firstBar!==chunk.firstBar||admitted.lastBar!==chunk.lastBar||admitted.start!==chunk.start||admitted.end!==chunk.end)
   throw Error('Manual practice context differs from its musical source.');
  const excerpt=chunk.clipIndex!==undefined||!plan.barTicks.includes(chunk.start)||!plan.barTicks.includes(chunk.end);
  this.claims=options.claims??new PracticeDone();this.completionTick=!excerpt?chunk.end:Math.max(chunk.end,...plan.owners.filter(a=>a.tick<chunk.end&&a.end>chunk.start).map(a=>a.end));
  this.elapsedTick=chunk.start;this.loopRate=state.working;
  this.sourceGrid=!excerpt?scorePulseGrid(plan,plan.barTicks,chunk.start,chunk.end):scoreExcerptPulseGrid(plan,plan.barTicks,chunk.start,this.completionTick);this.attemptGrid=this.sourcePulseGrid;
  this.windows=new ManualPracticeWindows(plan,chunk);
 }
 get pulseGrid(){return this.attemptGrid;}
 get bpm(){return this.loopRate;}
 get tickMs(){return scoreTickMs(this.plan,this.loopRate);}
 get durationMs(){return (this.completionTick-this.chunk.start)*this.tickMs;}
 ready(countStartMs:number,grid:PracticePulseGrid=this.sourcePulseGrid,rate=this.state.working){
  if(!Number.isFinite(countStartMs)||countStartMs<0||countStartMs*1000>Number.MAX_SAFE_INTEGER)throw Error('Invalid manual practice count-in origin.');
  const admitted=practiceAttemptGrid(this.sourceGrid,grid);
  scoreTickMs(this.plan,rate);
  this.attemptGrid=admitted;this.countStartMs=countStartMs;this.loopRate=rate;
  this.startMs=countStartMs+practiceTiming(rate,admitted).countInMs;
  this.elapsedTick=this.chunk.start;this.resetAtCountIn=true;this.phase='countin';
 }
 /** Returns a completed loop once. Time never becomes measured attainment. */
 update(now:number):'completed'|undefined {
  if(!Number.isFinite(now))throw Error('Invalid manual practice clock.');
  if(this.phase!=='countin'&&this.phase!=='trial')return;
  if(this.resetAtCountIn&&now>=this.countStartMs){this.windows.reset();this.resetAtCountIn=false;}
  this.elapsedTick=Math.max(this.chunk.start,Math.min(this.completionTick,this.chunk.start+(now-this.startMs)/this.tickMs));
  if(now>=this.startMs)this.phase='trial';
  if(this.elapsedTick>=this.completionTick){this.phase='complete';if(this.options.completeClaim!==false)this.claims.completed(this.currentTarget());return 'completed';}
 }
 pause(){this.phase='paused';this.resetAtCountIn=false;}
 turn(direction:1|-1){return this.windows.turn(direction);}
 private currentTarget():DoneTarget{return {passage:this.chunk.id,pattern:this.chunk.pattern,rate:this.loopRate};}
 doneTarget(){return this.claims.target(this.currentTarget(),this.phase==='countin',this.state);}
 get canDone(){return this.claims.canToggle(this.state,this.doneTarget());}
 toggleDone(){return this.claims.toggle(this.state,this.doneTarget(),this.state.keepTempo,this.state.step,this.state.target);}
 /** Predict for pre-arming audio; consume only at its existing safe boundary. */
 nextRate(){return this.queuedWorking??snapPracticeSpeed(this.claims.peekNextRate(this.loopRate,this.state.keepTempo),this.state.target);}
 /** Desired speed is queued; the sounding attempt and its claim stay literal. */
 queueWorking(rate:number){const next=snapPracticeSpeed(rate,this.state.target);if(next===this.nextRate())return false;this.queuedWorking=next;this.state.working=next;return true;}
 applyNextRate(){
  if(this.phase==='trial'||this.phase==='countin')throw Error('Working speed changes at a manual loop boundary.');
  const projected=this.claims.nextRate(this.loopRate,this.state.keepTempo);
  this.state.working=this.queuedWorking??snapPracticeSpeed(projected,this.state.target);this.queuedWorking=undefined;return this.state.working;
 }
}
