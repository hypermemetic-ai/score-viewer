/** What a score needs before the player can use each part of it, as stages
 * that start separately, can be awaited by anyone and stop when nobody needs
 * them any more.
 *
 * - `pages`: the pages the reader shows, with the player's hands.
 * - `fingers`: the fingering memory resolved onto the score (shared fingers).
 * - `hands`: the engraving settled for hand choices (the saved engine restored).
 * - `practice`: practice planned for the score and its saved progress.
 * - `piano`: piano input ready to follow the score.
 *
 * The reader starts `pages` first and the rest once the pages are shown. A
 * menu in front of the reader starts what its chosen item needs, and stops
 * what nobody needs when the player leaves it. Every stage's work is cached
 * by content where it lives, so a stage that was stopped and asked for again
 * starts from what is already made. A finished stage stays finished. */
export type ReadinessStage='pages'|'fingers'|'hands'|'practice'|'piano';
export const READINESS_STAGES:readonly ReadinessStage[]=Object.freeze(['pages','fingers','hands','practice','piano']);
/** The plain words a press waiting for a stage shows. */
export const READINESS_WORDS:Readonly<Record<ReadinessStage,string>>=Object.freeze({
 pages:'Getting the pages ready…',fingers:'Getting fingers ready…',hands:'Getting hands ready…',practice:'Getting practice ready…',piano:'Getting the piano ready…'});

export interface ReadinessStageWork {
 /** Stages this one needs first; they are claimed for as long as it runs. */
 needs?:readonly ReadinessStage[];
 /** The stage's work. It stops at its next step once `signal` aborts. */
 run(signal:AbortSignal):Promise<void>;
}
/** One party's need for a stage. `done` settles when the stage is ready, or
 * rejects when it fails or is stopped; `release` says the party no longer
 * needs it. A stage nobody needs stops. */
export interface ReadinessClaim {readonly done:Promise<void>;release():void}

interface Running {controller:AbortController;promise:Promise<void>;claims:number}
const stopped=()=>new DOMException('Nobody needs this stage any more.','AbortError');

export class ScoreReadiness {
 private readonly finished=new Set<ReadinessStage>();
 private readonly running=new Map<ReadinessStage,Running>();
 private readonly listeners=new Set<(stage:ReadinessStage)=>void>();
 private disposed=false;
 constructor(private readonly work:Partial<Record<ReadinessStage,ReadinessStageWork>>){}
 /** Whether a stage is ready. A stage with no work is ready. */
 ready(stage:ReadinessStage):boolean{return this.finished.has(stage)||!this.work[stage]&&!this.disposed;}
 /** Whether a stage is being got ready now. */
 preparing(stage:ReadinessStage):boolean{return this.running.has(stage);}
 /** Called once each time a stage becomes ready. */
 onReady(listener:(stage:ReadinessStage)=>void):()=>void{this.listeners.add(listener);return ()=>{this.listeners.delete(listener);};}
 /** Mark a stage ready that was made elsewhere: the reader's own opening makes its pages. */
 settle(stage:ReadinessStage){if(this.disposed||this.finished.has(stage))return;this.finished.add(stage);const r=this.running.get(stage);if(r){this.running.delete(stage);r.controller.abort(stopped());}this.announce(stage);}
 /** Start a stage, or join it, and hold it until released. Idempotent: a
  * ready stage answers at once, a running one is shared. */
 prepare(stage:ReadinessStage):ReadinessClaim{
  if(this.disposed)return {done:Promise.reject(stopped()),release(){}};
  if(this.ready(stage))return {done:Promise.resolve(),release(){}};
  let r=this.running.get(stage);
  if(!r)r=this.start(stage);
  r.claims++;
  let released=false;const held=r;
  return {done:held.promise,release:()=>{if(released)return;released=true;this.release(stage,held);}};
 }
 /** Wait until a stage is ready, starting it if needed; the stage is held
  * until then. */
 async whenReady(stage:ReadinessStage):Promise<void>{const claim=this.prepare(stage);try{await claim.done;}finally{claim.release();}}
 /** Stop everything not finished; the score closed. Finished stages stay answered. */
 dispose(){if(this.disposed)return;this.disposed=true;for(const [stage,r] of this.running){this.running.delete(stage);r.controller.abort(stopped());}this.listeners.clear();}
 private announce(stage:ReadinessStage){for(const listener of [...this.listeners])try{listener(stage);}catch{/* a listener never stops readiness */}}
 private start(stage:ReadinessStage):Running{
  const work=this.work[stage]!,controller=new AbortController();
  const r:Running={controller,claims:0,promise:undefined!};
  // Waiters hear of a stop at once, even while the work is still finishing
  // its current step or waiting for a stage it needs.
  const aborted=new Promise<never>((_,reject)=>{controller.signal.addEventListener('abort',()=>reject(controller.signal.reason),{once:true});});
  aborted.catch(()=>{});
  r.promise=(async()=>{
   const needs=(work.needs??[]).map(need=>this.prepare(need));
   const releaseNeeds=()=>{for(const need of needs)need.release();};
   controller.signal.addEventListener('abort',releaseNeeds,{once:true});
   const body=(async()=>{
    await Promise.all(needs.map(need=>need.done));
    controller.signal.throwIfAborted();
    // Marked for timing traces: when each stage's own work began.
    globalThis.performance?.mark?.(`score-readiness:${stage}`);
    await work.run(controller.signal);
   })();
   body.catch(()=>{});
   try{await Promise.race([body,aborted]);}
   catch(error){if(this.finished.has(stage))return;throw error;}finally{releaseNeeds();}
   if(this.running.get(stage)===r){this.running.delete(stage);this.finished.add(stage);this.announce(stage);}
   else if(!this.finished.has(stage))throw controller.signal.reason??stopped();
  })();
  // A stage that fails may be asked for again; one stopped stays stopped until asked for.
  r.promise.catch(()=>{if(this.running.get(stage)===r)this.running.delete(stage);});
  this.running.set(stage,r);return r;
 }
 private release(stage:ReadinessStage,r:Running){
  r.claims--;
  if(r.claims>0||this.running.get(stage)!==r)return;
  // Nobody needs it: a slow laptop does no work the player walked away from.
  this.running.delete(stage);r.controller.abort(stopped());
 }
}

/** What tells the reader its pages have been painted: the next frame, then a
 * task after it, which runs once that frame is on screen. The task is of
 * background priority where the webview has one, so input and anything else
 * already waiting goes first. */
export interface PaintClock {frame(run:()=>void):void;task(run:()=>void):void}
interface BackgroundScheduler {postTask(run:()=>void,options:{priority:'background'}):Promise<unknown>}
const scheduler=(globalThis as {scheduler?:BackgroundScheduler}).scheduler;
const paintClock:PaintClock={frame:run=>{requestAnimationFrame(()=>run());},
 task:run=>{if(typeof scheduler?.postTask==='function')scheduler.postTask(run,{priority:'background'}).catch(()=>{});else setTimeout(run,0);}};
/** Start these stages once the pages the reader just drew are on screen, in
 * order; the reader holds them until the returned stop (it closed the score).
 * Nothing here runs before that paint. */
export function prepareAfterPaint(readiness:ScoreReadiness,stages:readonly ReadinessStage[],clock:PaintClock=paintClock):()=>void{
 const claims:ReadinessClaim[]=[];
 const stop=afterPaint(()=>{for(const stage of stages){const claim=readiness.prepare(stage);claim.done.catch(()=>{});claims.push(claim);}},clock);
 return ()=>{stop();for(const claim of claims.splice(0))claim.release();};
}
/** A new task: lets timers, input and painting in between two steps of a stage. */
export const nextTask=()=>new Promise<void>(resolve=>{setTimeout(resolve,0);});
/** Run once what is drawn now is on screen, unless stopped first. */
export function afterPaint(run:()=>void,clock:PaintClock=paintClock):()=>void{
 let stopped=false;clock.frame(()=>clock.task(()=>{if(!stopped)run();}));
 return ()=>{stopped=true;};
}
