import {invoke,isTauri} from '@tauri-apps/api/core';
import type {PerformanceSchedule} from './score-performance';

/* Scheduled notes for the native piano: `[atMicros, kind, key, value]` on the
 * native MIDI clock, submitted in bounded chunks. A replacement starts a new
 * epoch; with `keepUntil` the earlier stream still sounds before that instant,
 * so a tempo change keeps sounding notes. Without it the stream is released. */

export const NOTE_ON=1,NOTE_OFF=2,CONTROL=3,CLICK=4;
export type ScheduledKind=typeof NOTE_ON|typeof NOTE_OFF|typeof CONTROL|typeof CLICK;
export type ScheduledEvent=[atMicros:number,kind:ScheduledKind,key:number,value:number];
export interface ScheduleReceipt {epoch:number;accepted:number;clock:number;leadMicros:number;late:number}
export interface PianoScheduleHost {
 open():Promise<ScheduleReceipt>;
 replace(keepUntil:number|null,events:ScheduledEvent[]):Promise<ScheduleReceipt>;
 submit(epoch:number,events:ScheduledEvent[]):Promise<ScheduleReceipt>;
 /** Local milliseconds, mapped to the native clock from each receipt. */
 now():number;
}
export const MAX_SUBMIT=512;
const unavailable=()=>Promise.reject(Error('The piano plays in the desktop app.'));
export const pianoSchedule:PianoScheduleHost={
 open:()=>isTauri()?invoke('piano_schedule_open'):unavailable(),
 replace:(keepUntil,events)=>isTauri()?invoke('piano_schedule_replace',{keepUntil,events}):unavailable(),
 submit:(epoch,events)=>isTauri()?invoke('piano_schedule_submit',{epoch,events}):unavailable(),
 now:()=>performance.now()
};

/** A performance event in score ticks; the tempo turns ticks into instants. */
export interface TickEvent {tick:number;kind:ScheduledKind;key:number;value:number}
// At one instant a key lifts before it is struck again; clicks sit between.
const ORDER:Record<ScheduledKind,number>={[NOTE_OFF]:0,[CONTROL]:1,[CLICK]:2,[NOTE_ON]:3};
/** The count-in and the piece as one tick-ordered stream. A key struck again
 * while it still sounds (held by the pedal) retriggers and lifts once, at the
 * later release, as the built-in voice lets both ring. */
export function performanceEvents(schedule:Pick<PerformanceSchedule,'notes'|'countIn'>):TickEvent[] {
 const out:TickEvent[]=schedule.countIn.map(c=>({tick:c.tick,kind:CLICK,key:0,value:c.accent?1:0}));
 const byKey=new Map<number,PerformanceSchedule['notes']>();
 for(const n of schedule.notes){const list=byKey.get(n.midi);if(list)list.push(n);else byKey.set(n.midi,[n]);}
 for(const [key,notes] of byKey){
  let lift:number|undefined;
  for(const n of [...notes].sort((a,b)=>a.tick-b.tick)){
   if(lift!==undefined&&lift<=n.tick){out.push({tick:lift,kind:NOTE_OFF,key,value:0});lift=undefined;}
   out.push({tick:n.tick,kind:NOTE_ON,key,value:Math.max(1,Math.min(127,Math.round(n.velocity)))});
   lift=Math.max(lift??-Infinity,n.release);
  }
  if(lift!==undefined)out.push({tick:lift,kind:NOTE_OFF,key,value:0});
 }
 return out.sort((a,b)=>a.tick-b.tick||ORDER[a.kind]-ORDER[b.kind]||a.key-b.key);
}
