import type {ReadingExecution} from './reading-execution';
import type {ProjectionEntry} from './personal-presentation';

/** Prepares, one score at a time, what opening each library score will read
 * from the derived-file cache: after an engraver update every saved hand
 * projection is a miss, and this makes it while the player is in the library
 * rather than when they open the score.
 *
 * It only ever runs while nothing else is being read, and only once the player
 * has left the library alone for a few seconds. Any input there holds it: the
 * score under way pauses at its next step, and a score waiting its turn waits
 * again, until the next quiet moment, so a click never waits for it. Opening
 * a score stops it, except for the score being opened: that opening takes
 * over the work already under way, paused or not, instead of starting it
 * again, and goes on as soon as its pages are written. Work made for anything
 * else (another keyboard layout, edition or hand choices) is never taken
 * over: it stops. Every stop frees what the work held. Nothing here writes
 * the player's data; a failure or a stop costs nothing but the work. */
/** Library scores in the order the player is likeliest to open them, the one
 * last worked on first. The score just closed is left out: its pages are in
 * memory, and the reader writes them to disk itself. */
export function aheadOfTimeOrder(entryIds:readonly string[],lastWorked?:string,closed?:string):string[]{
 return [...entryIds.filter(id=>id===lastWorked),...entryIds].filter(id=>id!==closed);
}
/** Waits while the player is busy in the library; resolves at once otherwise. */
export type AheadOfTimeQuiet=()=>Promise<void>;
/** What one preparation is given besides its stop signal. */
export interface AheadOfTimeWork {
 quiet:AheadOfTimeQuiet;
 /** Everything the preparation is made for has just been read: its basis is
  * fixed now. Until then it has read nothing, and any opening may take it over.
  * Called again when the work goes on with the score's next step (its
  * edition replaced, say): a new step, with a new `ready`. */
 started():void;
 /** What opening reads is written: an opening that took this work over goes on now. */
 ready():void;
 /** From now on, until `ready`, this step replaces the score's edition: an
  * opening of the score waits for it before reading its edition. */
 replacing():void;
 /** This step makes what opening the score doesn't need (another keyboard
  * layout): an opening of the score stops it, unless it is replacing the
  * edition already. */
 optional():void;
 /** The stages this score's work goes through, in order, as soon as they
  * are known. The first plan of a run stands: a step that goes on with the
  * score's next step keeps it. */
 plan(stages:readonly string[]):void;
 /** A stage of the plan is done. Progress never moves back, and a stage
  * skipped (nothing to do there) counts as passed by the next one reached. */
 reached(stage:string):void;
 /** The score's work could not be done; it ends as failed, not done. */
 failed():void;
}
/** How far the work on one score has come, from the stages it reached. */
export interface AheadOfTimeProgress {entryId:string;stage?:string;fraction:number;end?:'done'|'failed'}
/** The preparation under way: its basis once it has read its inputs, and
 * whether an opening has taken it over. */
interface Running {entryId:string;
 /** 0 for what opening the score needs; a later round makes what it may need later (src/main.ts: the other keyboard layout). */
 round:number;basis?:string;taken?:boolean;done:Promise<void>;ready:Promise<void>;
 /** The current step's ready has been given. */
 readied?:boolean;markReady:()=>void;replacing?:boolean;optional?:boolean;
 plan?:readonly string[];stage?:string;fraction:number;failed?:boolean}
export class AheadOfTimeEngraving {
 private controller?:AbortController;
 private running?:Running;
 private queue:string[]=[];
 /** The list a run goes through once per round, and the round under way. */
 private list:string[]=[];
 private round=0;
 /** The next score, between its turn coming and idle time to start it. */
 private waiting?:string;
 private timer?:ReturnType<typeof setTimeout>;
 /** Input holds the score under way until the next quiet moment. */
 private held?:{resume:()=>void;until:Promise<void>;timer?:ReturnType<typeof setTimeout>};
 /** Some preparation ran since the last release: its worker is still alive. */
 private holding=false;
 /** Each start or stop ends the run before it, including a step still waiting for idle time. */
 private generation=0;
 constructor(private readonly prepare:(entryId:string,execution:ReadingExecution,work:AheadOfTimeWork,round:number)=>Promise<void>,private readonly options:{delayMs?:number;idle?:(run:()=>void)=>void;
  /** How many times the list is gone through (default once). A later round
   * starts once every score has had the round before it, and an opening of
   * any score stops it rather than taking it over. */
  rounds?:number;
  /** No work remains or the work stopped: free what it held (its own projection worker). */
  release?:()=>void;
  /** The score work is on and how far it has come, and how it ended; or
   * none once no work remains or the work stopped. Between two scores the
   * last one stands. */
  activity?:(progress:AheadOfTimeProgress|undefined)=>void;
  /** Everything a preparation of this score is made for, as it stands now
   * (the keyboard layout, the score's files and stored hand choices). Read
   * when the preparation has read those; an opening takes it over only while
   * it is unchanged. */
  basis?:(entryId:string)=>string}={}){}
 get active(){return this.running?.entryId;}
 /** Whether the work under way is replacing `entryId`'s edition now. */
 replacing(entryId:string):boolean {const running=this.running;return running?.entryId===entryId&&!!running.replacing&&!running.readied;}
 private get delay(){return this.options.delayMs??3000;}
 /** Prepare these scores in order, after a quiet moment. Replaces any earlier list. */
 start(entryIds:readonly string[]):void {
  this.end(true);this.round=0;this.list=[...new Set(entryIds)];this.queue=[...this.list];this.arm();
 }
 /** Back in the library with these scores. Work still under way, such as the
  * score whose opening was just cancelled while it took that work over,
  * pauses as input pauses it and then goes on first, rather than starting
  * again; otherwise the list starts afresh. */
 resume(entryIds:readonly string[]):void {
  const running=this.running;if(!running||running.round||!this.current(running)){this.start(entryIds);return;}
  this.list=[...new Set(entryIds)];
  if(this.timer!==undefined){clearTimeout(this.timer);this.timer=undefined;}
  running.taken=false;this.waiting=undefined;this.queue=[...new Set(entryIds)].filter(id=>id!==running.entryId);this.hold();
 }
 private basis(entryId:string){return this.options.basis?.(entryId)??'';}
 private current(running:{entryId:string;basis?:string}){return running.basis===undefined||this.basis(running.entryId)===running.basis;}
 /** The work under way for `entryId`, which an opening of that score awaits
  * until its pages are written, then reads them from disk instead of
  * engraving them a second time. Work made for anything else stops at once. */
 joined(entryId:string,signal?:AbortSignal):Promise<void>{
  const running=this.running;if(running?.entryId!==entryId||running.round)return Promise.resolve();
  // An opening that took the work over has already checked it; what the
  // opening itself changes on the way (its memory, its entry) is no reason to stop.
  if(!running.taken&&!this.current(running)){this.end(true);return Promise.resolve();}
  return new Promise<void>(resolve=>{
   const stop=()=>resolve();signal?.addEventListener('abort',stop,{once:true});
   void Promise.race([running.ready,running.done]).finally(()=>{signal?.removeEventListener('abort',stop);resolve();});
  });
 }
 /** The rest of the work an opening of `entryId` took over: saving the
  * engine hand editing resumes from. The reader settles its own engine after
  * it, and so restores that one rather than engraving it again. */
 finishing(entryId:string):Promise<void>|undefined{
  const running=this.running;return running?.entryId===entryId&&!running.round?running.done:undefined;
 }
 /** Stop for a reading of `entryId`: work on that score continues at once,
  * even if input held it, and the reading joins it, while it is still made
  * for what the reading will show; anything else stops now. It runs in its
  * own projection worker, so stopping it never costs the reader's warm engines. */
 yieldTo(entryId:string):void {
  const running=this.running;if(running?.entryId!==entryId||running.round||!this.current(running)||running.optional&&!running.replacing){this.end(true);return;}
  if(this.timer!==undefined){clearTimeout(this.timer);this.timer=undefined;}
  running.taken=true;this.queue=[];this.waiting=undefined;this.unhold();
 }
 /** The player is doing something in the library: hold the work, and go on
  * with the same list, the score under way or waiting first, after another
  * quiet moment. A score under way pauses rather than stops, so opening it
  * next still takes its work over. */
 defer():void {
  if(this.running){this.hold();return;}
  if(this.timer===undefined&&this.waiting===undefined&&!this.queue.length)return;
  const entryIds=[...(this.waiting!==undefined?[this.waiting]:[]),...this.queue];
  this.end(false,true);this.queue=entryIds;this.arm();
 }
 stop():void {this.end(true);}
 private arm(){this.timer=setTimeout(()=>{this.timer=undefined;this.next();},this.delay);}
 private hold(){
  if(!this.held){let resume!:()=>void;const until=new Promise<void>(done=>{resume=done;});this.held={resume,until};}
  const held=this.held;if(held.timer!==undefined)clearTimeout(held.timer);held.timer=setTimeout(()=>this.unhold(),this.delay);
 }
 private unhold(){const held=this.held;this.held=undefined;if(!held)return;if(held.timer!==undefined)clearTimeout(held.timer);held.resume();}
 private readonly quiet:AheadOfTimeQuiet=()=>this.held?.until??Promise.resolve();
 /** End the run: its list, the score waiting, the score under way. `release`
  * also frees the worker; a pause in the list keeps it for what follows.
  * Work `going` on after the pause is still the work under way. */
 private end(release:boolean,going=false){
  if(this.timer!==undefined){clearTimeout(this.timer);this.timer=undefined;}
  this.queue=[];this.waiting=undefined;this.generation++;
  const controller=this.controller;this.controller=undefined;this.running=undefined;controller?.abort();this.unhold();if(!going)this.options.activity?.(undefined);
  if(release)this.free();
 }
 private free(){if(!this.holding)return;this.holding=false;this.options.release?.();}
 private next():void {
  if(!this.queue.length&&this.waiting===undefined&&this.round+1<(this.options.rounds??1)&&this.list.length){this.round++;this.queue=[...this.list];}
  const entryId=this.queue.shift(),generation=this.generation,round=this.round;if(entryId===undefined){this.free();this.options.activity?.(undefined);return;}
  this.waiting=entryId;
  const idle=this.options.idle??((run:()=>void)=>typeof requestIdleCallback==='function'?requestIdleCallback(run,{timeout:5000}):setTimeout(run,0));
  idle(()=>{
   if(generation!==this.generation||this.running)return;
   this.waiting=undefined;const controller=new AbortController();this.controller=controller;this.holding=true;
   const running:Running={entryId,round,ready:Promise.resolve(),markReady:()=>{},done:Promise.resolve(),fraction:0};this.running=running;
   const arm=()=>{running.readied=false;running.replacing=false;running.optional=false;running.ready=new Promise<void>(resolve=>{running.markReady=()=>{running.readied=true;resolve();};});};arm();
   const started=()=>{if(this.running!==running)return;if(running.readied)arm();running.replacing=false;running.optional=false;running.basis=this.basis(entryId);};
   const report=(end?:'done'|'failed')=>this.options.activity?.({entryId,...(running.stage===undefined?{}:{stage:running.stage}),fraction:running.fraction,...(end?{end}:{})});
   const reached=(stage:string)=>{
    const at=running.plan?.indexOf(stage)??-1;if(this.running!==running||at<0)return;
    const fraction=(at+1)/running.plan!.length;if(fraction<=running.fraction)return;
    running.fraction=fraction;running.stage=stage;report();
   };
   const work:AheadOfTimeWork={quiet:this.quiet,started,ready:()=>running.markReady(),replacing:()=>{running.replacing=true;},optional:()=>{running.optional=true;},
    plan:stages=>{if(!running.plan)running.plan=[...stages];},reached,failed:()=>{running.failed=true;}};
   report();
   // A failure is a miss on opening, as before; a stop has been reported already.
   running.done=this.prepare(entryId,{signal:controller.signal},work,round).then(()=>!running.failed,()=>false).then(done=>{
    if(this.controller!==controller)return;
    this.controller=undefined;this.running=undefined;
    if(done)running.fraction=1;report(done?'done':'failed');this.next();
   });
  });
 }
}

/** Input in the library holds ahead-of-time work: the viewer's own listener. */
export function holdAheadOfTimeOnInput(target:Pick<EventTarget,'addEventListener'>,work:()=>AheadOfTimeEngraving|undefined,inLibrary:()=>boolean):void {
 for(const kind of ['pointermove','pointerdown','keydown','wheel'])target.addEventListener(kind,()=>{if(inLibrary())work()?.defer();},{capture:true,passive:true});
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

/** A score this build cannot prepare however often it tries: admission
 * rejects its archive, or the engraver refuses its pages. Only this is
 * recorded as a refusal. */
export class AheadOfTimeRefusal extends Error {constructor(cause:unknown){super(cause instanceof Error?cause.message:String(cause),{cause});this.name='AheadOfTimeRefusal';}}
/** One step of a preparation, whose failure is a refusal when `refusal` says so. */
export async function refusedWhen<T>(step:Promise<T>,refusal:(error:unknown)=>boolean):Promise<T>{
 try{return await step;}catch(error){throw refusal(error)?new AheadOfTimeRefusal(error):error;}
}
/** Prepare once and record the outcome. A refusal is recorded like a success,
 * so the library does not repeat a whole engrave on every visit. A stop, or
 * any other failure (a busy admission, a worker lost or out of memory, a file
 * that could not be read), is not an outcome: it records nothing, and a later
 * visit tries again. */
export async function prepareRecorded(records:AheadOfTimeRecords,key:string,prepare:(read:(name:string,digest:string|null)=>void)=>Promise<ProjectionEntry|null>):Promise<AheadOfTimeRecord['outcome']>{
 const inputs:AheadOfTimeRecord['inputs']=[],read=(name:string,digest:string|null)=>{inputs.push([name,digest]);};
 let record:AheadOfTimeRecord;
 try{const served=await prepare(read);record=served?{outcome:'served',served,inputs}:{outcome:'nothing',inputs};}
 catch(error){if(!(error instanceof AheadOfTimeRefusal))throw error;record={outcome:'refused',inputs};}
 await records.put(AHEAD_OF_TIME_KIND,key,true,JSON.stringify(record));
 return record.outcome;
}
