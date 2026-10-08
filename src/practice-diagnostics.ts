import type {MidiNote} from './midi';
import type {PracticeAttack} from './practice';
export interface InputTrace {timestampMicros:number;driverMicros:number;channel:number;pitch:number;velocity:number;on:boolean;decision:string;phase:string;expected?:{id:string;owners:string[];midi:number;bar:number;dueMs?:number}}
export interface ErrorTrace {at:string;revision:string;chunk:string;reason:string;failed?:{id:string;owners:string[];midi:number;bar:number};events:InputTrace[]}
/** A bounded local error snapshot, not a continuous recording or an external report. */
export class PracticeDiagnostics {
 private recent:InputTrace[]=[];
 private failures:ErrorTrace[]=[];
 constructor(saved?:unknown){const s=saved as {version?:number;failures?:ErrorTrace[]}|undefined;if(s?.version===1&&Array.isArray(s.failures))this.failures=s.failures.slice(-3).map(f=>({...f,events:Array.isArray(f.events)?f.events.slice(-32):[]}));}
 record(event:MidiNote,decision:string,phase:string,expected?:PracticeAttack,dueMs?:number){
  this.recent.push({timestampMicros:event.timestamp_micros,driverMicros:event.driver_micros,channel:event.channel,pitch:event.note,velocity:event.velocity,on:event.on,decision,phase,...expected?{expected:{id:expected.id,owners:[...expected.owners],midi:expected.midi,bar:expected.bar+1,...dueMs===undefined?{}:{dueMs}}}:{}});
  if(this.recent.length>32)this.recent.shift();
 }
 failure(revision:string,chunk:string,reason:string,failed?:PracticeAttack){this.failures.push({at:new Date().toISOString(),revision,chunk,reason,...failed?{failed:{id:failed.id,owners:[...failed.owners],midi:failed.midi,bar:failed.bar+1}}:{},events:structuredClone(this.recent)});this.failures=this.failures.slice(-3);return this.snapshot();}
 snapshot(){return {version:1 as const,failures:structuredClone(this.failures)};}
}
