import {evenTicks,performanceSeconds,tickAtEven,writtenBarAt,type PerformanceSchedule} from './score-performance';
import {CLICK,MAX_SUBMIT,NOTE_ON,performanceEvents,pianoSchedule,type PianoScheduleHost,type ScheduleReceipt,type ScheduledEvent,type TickEvent} from './piano-schedule';
import type {Audition,AuditionPhase,AuditionPosition,AuditionTimers} from './tempo-audition';

/* Hear a score on the installed piano: the count-in clicks and the notes are
 * scheduled together on the native MIDI clock and mixed by the native output
 * chosen in Piano settings. Native calls run one at a time; a tempo change
 * replaces the stream from a near instant, so sounding notes keep sounding. */

const HORIZON_US=1_500_000,PUMP_MS=100,IPC_US=30_000;
const browserTimers:AuditionTimers={set:(fn,ms)=>setInterval(fn,ms),clear:id=>clearInterval(id as ReturnType<typeof setInterval>)};
/** What the native stream plays: `tick` at native instant `time`, at `bpm`. */
interface Mapping {time:number;tick:number;bpm:number}

export class NativeTempoAudition implements Audition {
 readonly voice='piano' as const;
 private readonly events:TickEvent[];
 private offset=0;private lead=0;private epoch=0;private next=0;
 private mapping?:Mapping;private previous?:Mapping;private startTick=0;
 private chain:Promise<void>=Promise.resolve();private pumping=false;private timer?:unknown;
 private pausedTick=0;private phaseValue:AuditionPhase='idle';private opened=false;
 failure?:string;
 /** Every event the piano accepted: tick, midi or click, native microseconds. */
 readonly log:{tick:number;sound:number|'click'|'accent';at:number}[]=[];
 constructor(readonly schedule:PerformanceSchedule,private bpmValue:number,private readonly host:PianoScheduleHost=pianoSchedule,private readonly timers:AuditionTimers=browserTimers){this.events=performanceEvents(schedule);}
 get bpm(){return this.bpmValue;}
 get phase(){return this.phaseValue;}
 get seconds(){return performanceSeconds(this.schedule,this.bpmValue);}
 private get firstTick(){return this.schedule.countIn[0]?.tick??0;}
 private get endTick(){return Math.max(this.schedule.totalTicks,...this.schedule.notes.map(n=>n.release));}
 private perTick(bpm:number){return 60e6/bpm/this.schedule.beatTicks;}
 // Later tempos in the score stretch the clock; the chosen tempo is the opening one.
 private timeAt(tick:number,m:Mapping){return m.time+(evenTicks(this.schedule,tick)-evenTicks(this.schedule,m.tick))*this.perTick(m.bpm);}
 private tickOn(m:Mapping,time:number){return tickAtEven(this.schedule,evenTicks(this.schedule,m.tick)+(time-m.time)/this.perTick(m.bpm));}
 private tickAt(time:number){
  const m=this.mapping;if(!m)return this.startTick;
  // Before a retimed stream's cut the earlier stream plays; before a fresh one, nothing yet.
  if(time<m.time)return this.previous?this.tickOn(this.previous,time):m.tick;
  return this.tickOn(m,time);
 }
 private clock(){return this.host.now()*1000+this.offset;}
 private learn(r:ScheduleReceipt,sent:number){this.offset=r.clock-(sent+this.host.now())/2*1000;if(r.leadMicros>0)this.lead=r.leadMicros;}
 private async refresh(){const sent=this.host.now();this.learn(await this.host.open(),sent);}

 /** Rejects when the piano is off or its output is not running. */
 async open(){if(this.opened)return;await this.refresh();this.opened=true;}
 play(){this.start(this.firstTick,this.schedule.countIn.length?'count-in':'playing');}
 pause(){
  if(this.phaseValue!=='count-in'&&this.phaseValue!=='playing')return;
  this.pausedTick=Math.max(0,this.tickAt(this.clock()));this.phaseValue='paused';this.stopTimer();
  this.enqueue(()=>this.release());
 }
 /** Continue where it paused, without another count-in. */
 resume(){if(this.phaseValue==='paused')this.start(this.pausedTick,'playing');}
 /** The new tempo follows from a near instant; what sounds keeps sounding. */
 setBpm(bpm:number){
  if(!Number.isFinite(bpm)||bpm<=0||bpm===this.bpmValue)return;
  this.bpmValue=bpm;
  if(this.phaseValue==='count-in'||this.phaseValue==='playing')this.enqueue(()=>this.retime());
 }
 position():AuditionPosition {
  const measures=this.schedule.writtenBars,start=writtenBarAt(this.schedule,0);
  if(this.phaseValue==='idle')return {phase:'idle',tick:0,measure:start.bar,pass:1,measures};
  const tick=this.phaseValue==='paused'?this.pausedTick:this.phaseValue==='finished'?this.schedule.totalTicks:this.tickAt(this.clock());
  if(tick<0){const beat=Math.floor((tick-this.firstTick)/this.schedule.beatTicks)+1;return {phase:'count-in',tick,measure:start.bar,pass:1,measures,countBeat:Math.max(1,beat)};}
  const at=writtenBarAt(this.schedule,Math.min(tick,this.schedule.totalTicks-1e-9));
  return {phase:this.phaseValue==='count-in'?'playing':this.phaseValue,tick,measure:at.bar,pass:at.pass,measures};
 }
 async close(){
  this.stopTimer();const wasOpen=this.opened;this.phaseValue='idle';this.opened=false;
  if(wasOpen)this.enqueue(()=>this.release());
  await this.chain;
 }

 private start(tick:number,phase:AuditionPhase){
  if(!this.opened)throw Error('Sound is not open.');
  this.failure=undefined;this.phaseValue=phase;this.startTick=tick;this.mapping=this.previous=undefined;
  this.enqueue(()=>this.replace(tick));this.run();
 }
 private enqueue(action:()=>Promise<void>){
  this.chain=this.chain.then(action).catch(error=>{
   this.failure=`The piano stopped: ${(error as Error)?.message??String(error)}`;
   this.stopTimer();this.phaseValue='idle';
  });
 }
 private run(){this.stopTimer();this.timer=this.timers.set(()=>{if(!this.pumping){this.pumping=true;this.enqueue(()=>this.pump().finally(()=>{this.pumping=false;}));}},PUMP_MS);}
 private stopTimer(){if(this.timer!==undefined)this.timers.clear(this.timer);this.timer=undefined;}
 private active(){return this.phaseValue==='count-in'||this.phaseValue==='playing';}
 private async release(){const sent=this.host.now();this.learn(await this.host.replace(null,[]),sent);}
 /** Release the stream and start again from `tick` at the earliest safe instant. */
 private async replace(tick:number,retry=true):Promise<void>{
  const mapping={time:Math.ceil(this.clock()+this.lead+IPC_US),tick,bpm:this.bpmValue};
  const next=this.lowerBound(tick),batch=this.batch(next,mapping);
  try{
   const sent=this.host.now(),r=await this.host.replace(null,batch.map(b=>b.event));
   this.learn(r,sent);this.epoch=r.epoch;
   this.previous=undefined;this.mapping=mapping;this.next=next;this.accept(batch,r.accepted);
  }catch(error){
   // The output's queue or the clock moved on: take a fresh lead once.
   if(!retry||!/too soon/i.test((error as Error)?.message??''))throw error;
   await this.refresh();
   return this.replace(tick,false);
  }
 }
 private async retime(retry=true):Promise<void>{
  const heard=this.mapping;if(!this.active()||!heard||heard.bpm===this.bpmValue)return;
  // The tick the current stream reaches at the cut, on the tempo it plays.
  const cut=Math.ceil(this.clock()+this.lead+IPC_US);
  const tick=this.tickOn(heard,cut);
  if(tick<this.startTick)return this.replace(this.startTick,retry);
  const mapping={time:cut,tick,bpm:this.bpmValue},next=this.lowerBound(tick),batch=this.batch(next,mapping);
  try{
   const sent=this.host.now(),r=await this.host.replace(cut,batch.map(b=>b.event));
   this.learn(r,sent);this.epoch=r.epoch;this.previous=heard;this.mapping=mapping;this.next=next;this.accept(batch,r.accepted);
  }catch(error){
   if(!retry||!/too soon/i.test((error as Error)?.message??''))throw error;
   await this.refresh();return this.retime(false);
  }
 }
 private async pump(){
  const m=this.mapping;if(!this.active()||!m)return;
  const now=this.clock();
  if(this.phaseValue==='count-in'&&this.tickAt(now)>=0)this.phaseValue='playing';
  if(this.next>=this.events.length){if(this.tickAt(now)>=this.endTick){this.stopTimer();this.phaseValue='finished';}return;}
  const batch=this.batch(this.next,m,now+HORIZON_US);if(!batch.length)return;
  const sent=this.host.now(),r=await this.host.submit(this.epoch,batch.map(b=>b.event));
  this.learn(r,sent);this.accept(batch,r.accepted);
 }
 private batch(from:number,m:Mapping,horizon=m.time+HORIZON_US){
  const out:{tick:TickEvent;event:ScheduledEvent}[]=[];
  for(let i=from;i<this.events.length&&out.length<MAX_SUBMIT;i++){
   const e=this.events[i],at=Math.floor(this.timeAt(e.tick,m));if(at>=horizon)break;
   out.push({tick:e,event:[at,e.kind,e.key,e.value]});
  }
  return out;
 }
 private accept(batch:{tick:TickEvent;event:ScheduledEvent}[],accepted:number){
  for(const {tick:e,event} of batch.slice(0,accepted)){
   if(e.kind===NOTE_ON)this.log.push({tick:e.tick,sound:e.key,at:event[0]});
   else if(e.kind===CLICK)this.log.push({tick:e.tick,sound:e.value?'accent':'click',at:event[0]});
  }
  this.next+=accepted;
 }
 private lowerBound(tick:number){const events=this.events;let lo=0,hi=events.length;while(lo<hi){const mid=(lo+hi)>>1;if(events[mid].tick<tick)lo=mid+1;else hi=mid;}return lo;}
}
