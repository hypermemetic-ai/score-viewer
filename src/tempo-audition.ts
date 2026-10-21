import {measureAt,performanceSeconds,type PerformanceSchedule} from './score-performance';

/* Hear a score at a tempo: a metronome count-in, then the piece, on a light built-in
 * piano voice. The tempo can change while it plays; the music keeps its place.
 * Everything shares one audio clock, so the count-in and the notes line up. */

/** The part of WebAudio the audition uses; tests supply a recording double. */
export interface AuditionParam {value:number;setValueAtTime(v:number,t:number):unknown;linearRampToValueAtTime(v:number,t:number):unknown;exponentialRampToValueAtTime(v:number,t:number):unknown;setTargetAtTime(v:number,t:number,c:number):unknown;cancelScheduledValues(t:number):unknown}
export interface AuditionNode {connect(node:AuditionNode):AuditionNode;disconnect():void}
export interface AuditionOscillator extends AuditionNode {frequency:AuditionParam;type:string;setPeriodicWave(wave:unknown):void;start(t:number):void;stop(t:number):void;onended:null|(()=>void)}
export interface AuditionGain extends AuditionNode {gain:AuditionParam}
export interface AuditionContext {
 readonly currentTime:number;readonly state:string;readonly destination:AuditionNode;
 createOscillator():AuditionOscillator;createGain():AuditionGain;createDynamicsCompressor?():AuditionNode;
 createPeriodicWave(real:Float32Array,imag:Float32Array):unknown;resume():Promise<void>;close():Promise<void>;
}
export interface AuditionTimers {set(fn:()=>void,ms:number):unknown;clear(id:unknown):void}
const browserTimers:AuditionTimers={set:(fn,ms)=>setInterval(fn,ms),clear:id=>clearInterval(id as ReturnType<typeof setInterval>)};

export type AuditionPhase='idle'|'count-in'|'playing'|'paused'|'finished';
export interface AuditionPosition {phase:AuditionPhase;tick:number;measure:number;measures:number;countBeat?:number}
/** A scheduled sound, kept so a tempo change can move it. */
interface Voice {tick:number;release:number;start:number;nodes:AuditionOscillator[];gains:AuditionGain[];click:boolean;entry?:object}

const LOOKAHEAD_S=.35,INTERVAL_MS=40,LEAD_S=.12,RELEASE_TAU=.07;
const frequency=(midi:number)=>440*Math.pow(2,(midi-69)/12);

export class TempoAudition {
 private context?:AuditionContext;private master?:AuditionGain;private waves=new Map<string,unknown>();
 private timer?:unknown;private voices:Voice[]=[];private nextNote=0;private nextClick=0;
 private anchor={time:0,tick:0};private pausedTick=0;private phaseValue:AuditionPhase='idle';
 /** Every attack the audition has scheduled, for inspection: tick, midi or click, audio time. */
 readonly log:{tick:number;sound:number|'click'|'accent';at:number}[]=[];
 constructor(readonly schedule:PerformanceSchedule,private bpmValue:number,private readonly createContext:()=>AuditionContext=()=>new AudioContext({latencyHint:'interactive'}) as unknown as AuditionContext,private readonly timers:AuditionTimers=browserTimers){}
 get bpm(){return this.bpmValue;}
 get phase(){return this.phaseValue;}
 get seconds(){return performanceSeconds(this.schedule,this.bpmValue);}
 private get secondsPerTick(){return 60/this.bpmValue/this.schedule.beatTicks;}
 private timeAt(tick:number){return this.anchor.time+(tick-this.anchor.tick)*this.secondsPerTick;}
 private tickAt(time:number){return this.anchor.tick+(time-this.anchor.time)/this.secondsPerTick;}
 private get firstTick(){return this.schedule.countIn[0]?.tick??0;}
 private get endTick(){return Math.max(this.schedule.totalTicks,...this.schedule.notes.map(n=>n.release));}

 /** Start audio; resolves once sound is running or rejects with a reason to show. */
 async open(){
  if(this.context)return;
  const context=this.createContext();this.context=context;
  let timeout:ReturnType<typeof setTimeout>|undefined;
  try{await Promise.race([context.resume(),new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(Error('The sound did not start.')),2500);})]);}
  finally{clearTimeout(timeout);}
  if(context.state!=='running')throw Error(`Sound is ${context.state}.`);
  const master=context.createGain();master.gain.value=.9;
  const limiter=context.createDynamicsCompressor?.();
  if(limiter)master.connect(limiter).connect(context.destination);else master.connect(context.destination);
  this.master=master;
 }
 /** From the start: count-in, then the piece. */
 play(){
  const context=this.requireContext();this.silence();
  this.anchor={time:context.currentTime+LEAD_S,tick:this.firstTick};this.nextNote=0;this.nextClick=0;
  this.phaseValue=this.schedule.countIn.length?'count-in':'playing';this.run();
 }
 pause(){
  if(this.phaseValue!=='count-in'&&this.phaseValue!=='playing')return;
  this.pausedTick=Math.max(0,this.tickAt(this.requireContext().currentTime));this.silence();this.phaseValue='paused';
 }
 /** Continue where it paused, without another count-in. */
 resume(){
  if(this.phaseValue!=='paused')return;
  const context=this.requireContext(),tick=this.pausedTick;this.silence();
  this.anchor={time:context.currentTime+LEAD_S,tick};this.nextNote=this.lowerBound(tick);this.nextClick=this.schedule.countIn.length;
  this.phaseValue='playing';this.run();
 }
 /** Change the tempo now; what is sounding keeps sounding, the rest follows the new tempo. */
 setBpm(bpm:number){
  if(!Number.isFinite(bpm)||bpm<=0||bpm===this.bpmValue)return;
  const context=this.context,active=this.phaseValue==='count-in'||this.phaseValue==='playing';
  if(!context||!active){this.bpmValue=bpm;return;}
  const now=context.currentTime,tick=this.tickAt(now);
  this.bpmValue=bpm;this.anchor={time:now,tick};
  for(const voice of [...this.voices]){
   if(voice.start>now){this.drop(voice);continue;}
   if(!voice.click&&voice.release>tick)this.releaseAt(voice,this.timeAt(voice.release),now,true);
  }
  this.nextNote=this.lowerBound(tick);this.nextClick=this.schedule.countIn.findIndex(c=>c.tick>=tick);if(this.nextClick<0)this.nextClick=this.schedule.countIn.length;
  this.pump();
 }
 position():AuditionPosition {
  const measures=this.schedule.bars.length-1,context=this.context;
  if(!context||this.phaseValue==='idle')return {phase:this.phaseValue,tick:0,measure:1,measures};
  const tick=this.phaseValue==='paused'?this.pausedTick:this.phaseValue==='finished'?this.schedule.totalTicks:this.tickAt(context.currentTime);
  if(tick<0){const beat=Math.floor((tick-this.firstTick)/this.schedule.beatTicks)+1;return {phase:'count-in',tick,measure:1,measures,countBeat:Math.max(1,beat)};}
  return {phase:this.phaseValue==='count-in'?'playing':this.phaseValue,tick,measure:Math.min(measures,measureAt(this.schedule,tick)),measures};
 }
 async close(){
  this.stopTimer();this.silence();this.phaseValue='idle';
  const context=this.context;this.context=undefined;this.master=undefined;this.waves.clear();
  await context?.close().catch(()=>{});
 }
 private requireContext(){if(!this.context)throw Error('Sound is not open.');return this.context;}
 private lowerBound(tick:number){const notes=this.schedule.notes;let lo=0,hi=notes.length;while(lo<hi){const mid=(lo+hi)>>1;if(notes[mid].tick<tick-1e-9)lo=mid+1;else hi=mid;}return lo;}
 private run(){this.stopTimer();this.pump();this.timer=this.timers.set(()=>this.pump(),INTERVAL_MS);}
 private stopTimer(){if(this.timer!==undefined)this.timers.clear(this.timer);this.timer=undefined;}
 /** Schedule everything due within the lookahead window. */
 private pump(){
  const context=this.context;if(!context||(this.phaseValue!=='count-in'&&this.phaseValue!=='playing'))return;
  const horizon=context.currentTime+LOOKAHEAD_S,{countIn,notes}=this.schedule;
  while(this.nextClick<countIn.length&&this.timeAt(countIn[this.nextClick].tick)<horizon){this.click(countIn[this.nextClick]);this.nextClick++;}
  while(this.nextNote<notes.length&&this.timeAt(notes[this.nextNote].tick)<horizon){this.note(notes[this.nextNote]);this.nextNote++;}
  const now=context.currentTime;
  if(this.phaseValue==='count-in'&&this.tickAt(now)>=0)this.phaseValue='playing';
  this.voices=this.voices.filter(v=>!(v.click&&v.start+.1<now));
  if(this.nextNote>=notes.length&&this.tickAt(now)>=this.endTick){this.stopTimer();this.phaseValue='finished';}
 }
 private click(c:{tick:number;accent:boolean}){
  const context=this.context!,at=Math.max(context.currentTime,this.timeAt(c.tick)),osc=context.createOscillator(),gain=context.createGain();
  // The practice metronome's voice: a short sine blip, higher on the bar.
  osc.frequency.value=c.accent?1200:900;gain.gain.setValueAtTime(c.accent?.16:.12,at);gain.gain.exponentialRampToValueAtTime(.001,at+.04);
  osc.connect(gain).connect(this.master!);osc.start(at);osc.stop(at+.05);
  const voice:Voice={tick:c.tick,release:c.tick,start:at,nodes:[osc],gains:[gain],click:true};osc.onended=()=>this.forget(voice);
  const entry={tick:c.tick,sound:c.accent?'accent' as const:'click' as const,at};voice.entry=entry;this.voices.push(voice);this.log.push(entry);
 }
 private wave(kind:'body'|'bright'){
  let wave=this.waves.get(kind);if(wave)return wave;
  const n=kind==='body'?8:16,real=new Float32Array(n+1),imag=new Float32Array(n+1);
  for(let h=1;h<=n;h++)imag[h]=(kind==='body'?1/Math.pow(h,2.2):1/Math.pow(h,1.15))*(h%7===0?.3:1);
  wave=this.context!.createPeriodicWave(real,imag);this.waves.set(kind,wave);return wave;
 }
 /** A struck string: a bright attack that fades into a longer, rounder tone. */
 private note(n:{tick:number;release:number;midi:number;velocity:number}){
  const context=this.context!,at=Math.max(context.currentTime,this.timeAt(n.tick)),f=frequency(n.midi);
  const loud=Math.pow(n.velocity/127,1.6)*.2,register=Math.min(1,Math.max(0,(n.midi-21)/87)),ring=.5+3.5*Math.pow(1-register,1.5);
  const parts:[ 'body'|'bright',number,number][]=[['body',loud,ring],['bright',loud*(.35+.4*n.velocity/127),ring*.18]];
  const voice:Voice={tick:n.tick,release:n.release,start:at,nodes:[],gains:[],click:false};
  for(const [kind,peak,decay] of parts){
   const osc=context.createOscillator(),gain=context.createGain();
   osc.setPeriodicWave(this.wave(kind));osc.frequency.value=f;
   gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(peak,at+.004);gain.gain.setTargetAtTime(0,at+.004,decay/3);
   osc.connect(gain).connect(this.master!);osc.start(at);voice.nodes.push(osc);voice.gains.push(gain);
  }
  voice.nodes[0].onended=()=>this.forget(voice);
  this.releaseAt(voice,this.timeAt(n.release),at,false);
  const entry={tick:n.tick,sound:n.midi,at};voice.entry=entry;this.voices.push(voice);this.log.push(entry);
 }
 /** Dampers fall at the release time. A moved release first removes the one scheduled after `from`. */
 private releaseAt(voice:Voice,time:number,from:number,moved:boolean){
  const at=Math.max(time,from);
  for(const gain of voice.gains){if(moved)gain.gain.cancelScheduledValues(from);gain.gain.setTargetAtTime(0,at,RELEASE_TAU);}
  for(const osc of voice.nodes){try{osc.stop(at+RELEASE_TAU*6);}catch{/* already stopped */}}
 }
 /** A sound that never started leaves no trace; the log keeps only what was heard or is due. */
 private drop(voice:Voice){const i=this.log.indexOf(voice.entry as never);if(i>=0)this.log.splice(i,1);for(const osc of voice.nodes){osc.onended=null;try{osc.stop(0);}catch{}try{osc.disconnect();}catch{}}for(const g of voice.gains){try{g.disconnect();}catch{}}this.voices=this.voices.filter(v=>v!==voice);}
 private forget(voice:Voice){for(const osc of voice.nodes){try{osc.disconnect();}catch{}}for(const g of voice.gains){try{g.disconnect();}catch{}}this.voices=this.voices.filter(v=>v!==voice);}
 /** Quiet everything quickly, without a click. */
 private silence(){
  this.stopTimer();const now=this.context?.currentTime??0;
  for(const voice of [...this.voices]){if(voice.start>now)this.drop(voice);else{for(const g of voice.gains){g.gain.cancelScheduledValues(now);g.gain.setTargetAtTime(0,now,.02);}for(const osc of voice.nodes){try{osc.stop(now+.12);}catch{}}}}
  this.voices=this.voices.filter(v=>v.start<=now);
 }
}
