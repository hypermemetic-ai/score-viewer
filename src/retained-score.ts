import {canonicalJson} from './piano-preparation-identity';

/** What a reopen must find unchanged to draw the score kept from its last
 * reading. Every part is already in memory; checking costs no reads. */
export interface RetentionConditions {
 /** The library entry as saved on Back: its archive and personal files are
  * named by their content, so equal names are equal bytes. */
 entry:unknown;
 /** The stored hand-choice objects and the fingering memory, by content name. */
 records:unknown;
 /** Every preference except which score was opened last, which each opening writes. */
 preferences:unknown;
 /** Hands carried from matching bars that the engraver refused in this
  * session: not stored anywhere, yet they change what the pages show. */
 carries:number;
 /** The build that made the pages: the engraver pin and all derived-file code. */
 build:string;
}
export function retentionKey(conditions:RetentionConditions):string {return canonicalJson(conditions);}

/** The score last read, kept after Back so that reopening it with nothing
 * changed only draws it again: no read, admission, copy, identity hash or
 * projection. It holds one score. Taking it, for any score, frees it; so does
 * freeing it on memory pressure. */
export class RetainedScore<T> {
 private held?:{entryId:string;key:string;value:T};
 constructor(private readonly freed:()=>void=()=>{}){}
 get holding():string|undefined {return this.held?.entryId;}
 keep(entryId:string,conditions:RetentionConditions,value:T):void {
  this.free();this.held={entryId,key:retentionKey(conditions),value};
 }
 /** The kept score, if it is this one and nothing it depends on changed.
  * Any other opening drops it: one score is held, and only until the next opening. */
 take(entryId:string,conditions:()=>RetentionConditions|undefined):T|undefined {
  const held=this.held;if(!held)return;this.free();
  if(held.entryId!==entryId)return;
  const now=conditions();return now&&retentionKey(now)===held.key?held.value:undefined;
 }
 free():void {if(!this.held)return;this.held=undefined;this.freed();}
}

/** Whether keeping a score now would crowd the reader: more than half of the
 * script heap is in use (where the engine reports it). */
export function underMemoryPressure(memory?:{usedJSHeapSize:number;jsHeapSizeLimit:number}):boolean {
 return !!memory&&memory.jsHeapSizeLimit>0&&memory.usedJSHeapSize>memory.jsHeapSizeLimit/2;
}
