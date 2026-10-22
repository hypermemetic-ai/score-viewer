import type {ReadingExecution} from './reading-execution';
import type {ProjectionEntry} from './personal-presentation';

/** Prepares, one score at a time, what opening each library score will read
 * from the derived-file cache: after an engraver update every saved hand
 * projection is a miss, and this makes it while the player is in the library
 * rather than when they open the score.
 *
 * It only ever runs while nothing else is being read. Opening a score stops
 * it, except for the score being opened: that opening joins the work already
 * under way instead of starting it again (the shared preparation pool and
 * projection worker serve both). Nothing here writes the player's data; a
 * failure or a stop costs nothing but the work. */
export class AheadOfTimeEngraving {
 private controller?:AbortController;
 private running?:{entryId:string;done:Promise<void>};
 private queue:string[]=[];
 private timer?:ReturnType<typeof setTimeout>;
 /** Each start or stop ends the run before it, including a step still waiting for idle time. */
 private generation=0;
 constructor(private readonly prepare:(entryId:string,execution:ReadingExecution)=>Promise<void>,private readonly options:{delayMs?:number;idle?:(run:()=>void)=>void}={}){}
 get active(){return this.running?.entryId;}
 /** Prepare these scores in order, after a quiet moment. Replaces any earlier list. */
 start(entryIds:readonly string[]):void {
  this.stop();
  this.queue=[...new Set(entryIds)];
  this.timer=setTimeout(()=>{this.timer=undefined;this.next();},this.options.delayMs??1500);
 }
 /** Stop for a reading of `entryId`: work on that score continues, and the
  * reading shares it; work on any other score stops now. */
 yieldTo(entryId:string):void {
  if(this.timer!==undefined){clearTimeout(this.timer);this.timer=undefined;}
  this.queue=[];
  if(this.running?.entryId===entryId)return;
  this.abort();
 }
 stop():void {
  if(this.timer!==undefined){clearTimeout(this.timer);this.timer=undefined;}
  this.queue=[];this.abort();
 }
 private abort(){this.generation++;this.controller?.abort();this.controller=undefined;this.running=undefined;}
 private next():void {
  const entryId=this.queue.shift(),generation=this.generation;if(entryId===undefined)return;
  const idle=this.options.idle??((run:()=>void)=>typeof requestIdleCallback==='function'?requestIdleCallback(run,{timeout:5000}):setTimeout(run,0));
  idle(()=>{
   if(generation!==this.generation||this.running)return;
   const controller=new AbortController();this.controller=controller;
   const done=this.prepare(entryId,{signal:controller.signal}).catch(()=>{/* a miss on opening, as before */}).finally(()=>{
    if(this.controller!==controller)return;
    this.controller=undefined;this.running=undefined;this.next();
   });
   this.running={entryId,done};
  });
 }
}

/** What one ahead-of-time preparation of a score found, kept under a key made
 * of everything known before admission (archive, layout, entry, stored hand
 * choices). `inputs` names each further file the preparation read, such as
 * a personal journal kept outside the store, with the digest it had then. */
export interface AheadOfTimeRecord {outcome:'served'|'nothing'|'refused';served?:ProjectionEntry;inputs:Array<[string,string|null]>}
export interface AheadOfTimeRecords {peek(kind:string,key:string):Promise<string|undefined>;put(kind:string,key:string,value:unknown,tag?:string):Promise<boolean>}
export const AHEAD_OF_TIME_KIND='ahead-of-time-v2';

/** Whether the last preparation under this key still stands: the files it
 * read are unchanged, and the projection it made is still on disk. A score
 * whose preparation was refused, or which needs none, is not tried again
 * until something it depends on changes. */
export async function preparedBefore(records:AheadOfTimeRecords,key:string,still:{served(entry:ProjectionEntry):Promise<boolean>;digest(name:string):Promise<string|null>}):Promise<boolean>{
 const tag=await records.peek(AHEAD_OF_TIME_KIND,key);if(tag===undefined)return false;
 let record:AheadOfTimeRecord;try{record=JSON.parse(tag);}catch{return false;}
 if(!record||!['served','nothing','refused'].includes(record.outcome)||!Array.isArray(record.inputs))return false;
 for(const [name,digest] of record.inputs)if(await still.digest(name)!==digest)return false;
 return record.outcome!=='served'||!!record.served&&await still.served(record.served);
}

/** Prepare once and record the outcome. A refusal is recorded like a success,
 * so the library does not repeat a whole engrave on every visit; a stop is
 * not an outcome and records nothing. */
export async function prepareRecorded(records:AheadOfTimeRecords,key:string,prepare:(read:(name:string,digest:string|null)=>void)=>Promise<ProjectionEntry|null>):Promise<AheadOfTimeRecord['outcome']>{
 const inputs:AheadOfTimeRecord['inputs']=[],read=(name:string,digest:string|null)=>{inputs.push([name,digest]);};
 let record:AheadOfTimeRecord;
 try{const served=await prepare(read);record=served?{outcome:'served',served,inputs}:{outcome:'nothing',inputs};}
 catch(error){if((error as Error)?.name==='AbortError')throw error;record={outcome:'refused',inputs};}
 await records.put(AHEAD_OF_TIME_KIND,key,true,JSON.stringify(record));
 return record.outcome;
}
