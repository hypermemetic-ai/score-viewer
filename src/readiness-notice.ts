import {READINESS_WORDS,type ReadinessClaim,type ReadinessStage} from './score-readiness';

/** A press waits this long before it says anything: most readiness ends sooner. */
export const READINESS_NOTICE_DELAY_MS=150;
/** Once shown, the notice stays at least this long, so it never flashes. */
export const READINESS_NOTICE_MIN_MS=300;

/** Where the notice appears: bottom centre of a surface (the reader), or
 * just after one element (a menu item that took the press). */
export type ReadinessNoticePlace={surface:HTMLElement}|{after:HTMLElement};
/** What shows the notice. `show` sets it going: it becomes visible
 * `delayMs` later by itself, with no further script, so it appears even while
 * the work it waits for keeps script busy. `hide` fades a visible notice out;
 * `withdraw` takes away one that never became visible. The DOM one is
 * ReadinessNotice; tests give their own. */
export interface ReadinessNoticeView {show(words:string,place:ReadinessNoticePlace,delayMs:number):void;hide():void;withdraw():void}
export interface ReadinessTimers {now():number;set(run:()=>void,ms:number):unknown;clear(id:unknown):void}
const realTimers:ReadinessTimers={now:()=>performance.now(),set:(run,ms)=>setTimeout(run,ms),clear:id=>clearTimeout(id as ReturnType<typeof setTimeout>)};

/** The quiet line a waiting press shows: plain words and a thin, slow line
 * under them, in the reader's muted text. No modal, no spinner over the music,
 * no dimming and no sound; it takes no input and covers nothing. */
export class ReadinessNotice implements ReadinessNoticeView {
 private element?:HTMLElement;
 private fading?:ReturnType<typeof setTimeout>;
 constructor(private readonly document:Document){}
 show(words:string,place:ReadinessNoticePlace,delayMs:number){
  if(this.fading!==undefined){clearTimeout(this.fading);this.fading=undefined;}
  const element=this.element??=this.make();
  element.querySelector('.readiness-notice-words')!.textContent=words;
  element.dataset.place='surface' in place?'surface':'after';
  element.style.setProperty('--readiness-notice-delay',`${Math.max(0,Math.round(delayMs))}ms`);
  const moved='surface' in place?element.parentElement!==place.surface:element.previousElementSibling!==place.after;
  if(moved){if('surface' in place)place.surface.append(element);else place.after.after(element);}
  // One already in view keeps showing; otherwise the delayed fade-in starts from now.
  if(!moved&&delayMs<=0&&element.classList.contains('shown'))return;
  element.classList.remove('shown','leaving');void element.offsetWidth;element.classList.add('shown');
 }
 hide(){
  const element=this.element;if(!element)return;
  element.classList.remove('shown');element.classList.add('leaving');
  if(this.fading!==undefined)clearTimeout(this.fading);
  this.fading=setTimeout(()=>{this.fading=undefined;if(element.classList.contains('leaving'))element.remove();},400);
 }
 withdraw(){
  if(this.fading!==undefined){clearTimeout(this.fading);this.fading=undefined;}
  this.element?.classList.remove('shown','leaving');this.element?.remove();
 }
 private make(){
  const element=this.document.createElement('div');element.className='readiness-notice';
  element.setAttribute('role','status');element.setAttribute('aria-live','polite');
  element.innerHTML='<span class="readiness-notice-words"></span><span class="readiness-notice-line" aria-hidden="true"></span>';
  return element;
 }
}

/** What a press waits for: anything that answers whether a stage is ready and
 * can be asked to get it ready (ScoreReadiness). */
export interface ReadinessSource {ready(stage:ReadinessStage):boolean;prepare(stage:ReadinessStage):ReadinessClaim}
export type PendingOutcome='ran'|'cancelled';
interface Waiting {key:string;stage:ReadinessStage;claim:ReadinessClaim;finish(outcome:PendingOutcome):void;promise:Promise<PendingOutcome>}

/** One press at a time that waits for readiness. The press is accepted at
 * once and its action runs exactly once, as soon as what it needs is ready;
 * it is never dropped or refused. A press of another command, or cancel()
 * (Esc), stops the waiting one. The quiet notice is set going with the press
 * and becomes visible READINESS_NOTICE_DELAY_MS later, where the press was
 * made; readiness that ends sooner withdraws it unseen. Once visible it stays
 * at least READINESS_NOTICE_MIN_MS and fades out when the action starts (or,
 * if that is sooner than the minimum, when the minimum ends). The action
 * never waits for the notice. A stage that fails still runs the action, which
 * then says what went wrong in its own words. */
export class PendingPress {
 private waiting?:Waiting;
 /** When the notice set going becomes (or became) visible. */
 private visibleAt?:number;
 private hiding?:unknown;
 constructor(private readonly view:ReadinessNoticeView,private readonly timers:ReadinessTimers=realTimers){}
 /** The command waiting now, if any. */
 get pending():string|undefined{return this.waiting?.key;}
 /** Whether the notice is visible. */
 get showing():boolean{return this.visibleAt!==undefined&&this.timers.now()>=this.visibleAt;}
 press(key:string,source:ReadinessSource,stage:ReadinessStage,action:()=>unknown,place:()=>ReadinessNoticePlace|undefined,words=READINESS_WORDS[stage]):Promise<PendingOutcome>{
  if(this.waiting?.key===key&&this.waiting.stage===stage)return this.waiting.promise;
  this.cancel();
  if(source.ready(stage)){void Promise.resolve().then(action);return Promise.resolve('ran');}
  const claim=source.prepare(stage);
  let finish!:(outcome:PendingOutcome)=>void;
  const promise=new Promise<PendingOutcome>(resolve=>{finish=resolve;});
  const waiting:Waiting={key,stage,claim,finish,promise};
  this.waiting=waiting;this.notice(words,place());
  const done=()=>{
   if(this.waiting!==waiting)return;
   this.end(waiting);
   try{const ran=action();if(ran instanceof Promise)ran.catch(()=>{});}finally{finish('ran');}
  };
  claim.done.then(done,done);
  return promise;
 }
 /** Stop the waiting press (Esc); true when there was one. */
 cancel():boolean{
  const waiting=this.waiting;if(!waiting)return false;
  this.end(waiting);waiting.finish('cancelled');return true;
 }
 private end(waiting:Waiting){
  this.waiting=undefined;waiting.claim.release();this.fade();
 }
 private notice(words:string,place:ReadinessNoticePlace|undefined){
  if(this.hiding!==undefined){this.timers.clear(this.hiding);this.hiding=undefined;}
  if(!place){if(this.visibleAt!==undefined){this.visibleAt=undefined;this.view.withdraw();}return;}
  // A notice still visible from the last press stays visible.
  const now=this.timers.now(),delay=this.showing?0:READINESS_NOTICE_DELAY_MS;
  this.visibleAt=now+delay;this.view.show(words,place,delay);
 }
 private fade(){
  const visibleAt=this.visibleAt;if(visibleAt===undefined)return;
  const now=this.timers.now();
  if(now<visibleAt){this.visibleAt=undefined;this.view.withdraw();return;}
  const hide=()=>{this.hiding=undefined;this.visibleAt=undefined;this.view.hide();};
  const left=visibleAt+READINESS_NOTICE_MIN_MS-now;
  if(left<=0){hide();return;}
  if(this.hiding===undefined)this.hiding=this.timers.set(hide,left);
 }
}
