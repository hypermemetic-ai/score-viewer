import type {ReadingExecution} from './reading-execution';

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
