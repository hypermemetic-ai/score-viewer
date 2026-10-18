import type {PreparationStage} from '../vendor/iso-notation/src/score-presentation';

const escape=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

/** Steps a pianist can follow, named for what happens to the music. */
export const LOADING_STEPS={
 library:'Opening your library',
 settings:'Restoring your settings',
 fingerings:'Checking saved fingering choices',
 input:'Connecting keyboard and pedal input',
 summaries:'Reading your practice progress',
 sound:'Preparing piano sound',
 engrave:'Engraving the music',
 'engrave-again':'Engraving this edition again',
 'engrave-keyboard':'Engraving for this keyboard layout',
 transpose:'Writing the music at the new pitch',
 retained:'Opening the saved edition at this pitch',
 'gp-parts':'Finding the parts',
 'gp-read':'Reading the selected parts',
 'gp-engrave':'Engraving ISO notation and tablature',
 check:'Checking the score',
 save:'Saving to your library',
 hands:'Engraving the pages with your fingerings',
 'hand-editing':'Engraving the score for hand choices',
 parts:'Preparing the part for reading',
 open:'Opening the score',
} as const;
export type LoadingStepId=keyof typeof LOADING_STEPS;
type StepState='pending'|'active'|'done'|'failed';
/** Spoken with each step, since the drawn mark is hidden from screen readers. */
const STATE_WORDS:Record<StepState,string>={pending:', waiting',active:', in progress',done:', done',failed:', stopped'};
interface Step {id:LoadingStepId;state:StepState;detail:string}

/** Engine stages in musical terms. `paint` is reported once per drawn page. */
export function stageDetail(stage:PreparationStage,page=0):string {
 switch(stage){
  case 'layout':return 'Spacing the measures into systems';
  case 'placement':return 'Arranging the systems on each page';
  case 'lint':return 'Checking that every note, slur and marking fits';
  case 'paint':return page>0?`Drawing page ${page}`:'Drawing the pages';
  case 'geometry':return 'Placing the note labels';
  case 'fretted':return 'Writing the tablature';
  case 'relations':return 'Drawing slurs and ties';
  case 'commit':return 'Finishing';
 }
}

const clock=(seconds:number)=>{const whole=Math.floor(seconds);return `${Math.floor(whole/60)}:${String(whole%60).padStart(2,'0')}`;};
/** The elapsed clock appears only once a step has visibly taken a while. */
export const ELAPSED_AFTER_SECONDS=3;

export interface LoadingOptions {
 /** What the player asked for, e.g. "Importing" or "Transposing up 2 steps". */
 kicker?:string;
 /** Cancel is offered for owned foreground work; omit for startup. */
 cancel?:boolean;
 /** What cancelling leaves behind, in one short sentence. */
 cancelNote?:string;
 compact?:boolean;
}

/**
 * One loading surface for startup and every foreground score operation.
 * It lists the operation's steps in order, marks finished ones, names the
 * current one in musical terms and shows real counts when the work has them
 * (pages drawn, scores read). It never estimates remaining time.
 */
export class LoadingProgress {
 title:string;kicker:string;readonly options:LoadingOptions;
 private steps:Step[];private count?:{completed:number;total:number;noun:string};
 private pages=0;private lastStage?:PreparationStage;private started=performance.now();
 private timer=0;private roots=new Set<ParentNode>();
 state:'working'|'saving'|'failed'='working';private message='';private savingNote='';
 constructor(title:string,steps:readonly LoadingStepId[],options:LoadingOptions={}){
  this.title=title;this.kicker=options.kicker??'';this.options=options;
  this.steps=steps.map(id=>({id,state:'pending',detail:''}));
 }
 /** Full surface markup; attach() then keeps it current. */
 markup():string {
  const o=this.options;
  return `<div class="viewer-loading${o.compact?' viewer-loading-compact':''}" data-loading-state="${this.state}">`+
   `<p class="viewer-loading-kicker"${this.kicker?'':' hidden'}>${escape(this.kicker)}</p><h2 class="viewer-loading-title">${escape(this.title)}</h2>`+
   // Busy marks only the list, so the status line outside it is still announced.
   `<ol class="viewer-loading-steps" aria-busy="true">${this.stepsMarkup()}</ol>`+
   `<progress class="viewer-loading-progress" aria-label="Progress" hidden></progress>`+
   `<p class="job viewer-loading-status" role="status">${escape(this.statusText())}</p>`+
   `<p class="viewer-loading-message" role="alert" hidden></p>`+
   `<div class="viewer-loading-footer">`+
    (o.cancel?`<button type="button" data-action="cancel-job">Cancel<kbd>Esc</kbd></button><p class="viewer-loading-note">${escape(o.cancelNote??'Cancel leaves your library as it was.')}</p>`:'')+
    `<p class="viewer-loading-elapsed" aria-live="off" hidden></p></div></div>`;
 }
 attach(root:ParentNode){
  this.roots.add(root);this.render();
  if(!this.timer&&typeof window!=='undefined')this.timer=window.setInterval(()=>this.renderElapsed(),1000);
  return this;
 }
 detach(root:ParentNode){this.roots.delete(root);}
 stop(){if(this.timer)window.clearInterval(this.timer);this.timer=0;}
 /** Begin a step: earlier steps are finished; skipped pending ones are dropped. */
 step(id:LoadingStepId,detail=''){
  if(this.state==='failed')return;
  let index=this.steps.findIndex(s=>s.id===id);
  const active=this.steps.findIndex(s=>s.state==='active');
  if(index<0){index=active<0?this.steps.findIndex(s=>s.state==='pending'):active+1;if(index<0)index=this.steps.length;this.steps.splice(index,0,{id,state:'pending',detail:''});}
  this.steps=this.steps.filter((s,i)=>i>=index||s.state!=='pending');index=this.steps.findIndex(s=>s.id===id);
  this.steps.forEach((s,i)=>{if(i<index)s.state='done';else if(i>index&&s.state==='active')s.state='pending';});
  const step=this.steps[index];step.state='active';step.detail=detail;this.lastStage=undefined;this.pages=0;this.count=undefined;
  if(this.state==='saving'&&id!=='save')this.savingNote='Saved. This part can’t be cancelled.';
  this.render();
 }
 /** Start the list again when the flow takes another route (e.g. a saved
  * edition is set aside and the music is transposed afresh). */
 restart(steps:readonly LoadingStepId[]){
  if(this.state==='failed')return;
  this.steps=steps.map(id=>({id,state:'pending',detail:''}));this.lastStage=undefined;this.pages=0;this.count=undefined;this.render();
 }
 setTitle(title:string){this.title=title;this.render();}
 /** Engine checkpoints refine the current step's detail. */
 stage(stage:PreparationStage){
  if(stage==='paint')this.pages=this.lastStage==='paint'?this.pages+1:1;
  this.lastStage=stage;this.detail(stageDetail(stage,this.pages));
 }
 detail(text:string){const step=this.steps.find(s=>s.state==='active');if(!step||step.detail===text)return;step.detail=text;this.render();}
 counted(completed:number,total:number,noun:string){
  const valid=Number.isInteger(completed)&&Number.isInteger(total)&&total>0&&completed>=0&&completed<=total;
  this.count=valid?{completed,total,noun}:undefined;
  if(valid)this.detail(`${completed} of ${total} ${noun}`);else this.render();
 }
 /** The durable save has begun: cancel is no longer possible. */
 saving(note='Saving now. This part can’t be cancelled.'){
  if(this.state==='failed')return;
  this.state='saving';this.savingNote=note;this.render();
 }
 /** Keep the surface open and say what stopped, with Close in place of Cancel. */
 fail(message:string,closeMarkup:string){
  this.state='failed';this.message=message;this.stop();
  const step=this.steps.find(s=>s.state==='active');if(step){step.state='failed';step.detail='';}
  this.render();
  for(const root of this.roots){
   const footer=root.querySelector<HTMLElement>('.viewer-loading-footer');if(footer)footer.innerHTML=closeMarkup;
   root.querySelector<HTMLElement>('.viewer-loading-footer button')?.focus();
  }
 }
 statusText(){
  // The message itself is announced by the alert; the status only says so.
  if(this.state==='failed')return 'Stopped.';
  const step=this.steps.find(s=>s.state==='active');if(!step)return this.title;
  return `${LOADING_STEPS[step.id]}${step.detail?`: ${step.detail}`:''}`;
 }
 private stepsMarkup(){
  return this.steps.map(s=>`<li data-step="${s.id}" data-step-state="${s.state}"${s.state==='active'?' aria-current="step"':''}><span class="viewer-loading-mark" aria-hidden="true"></span>`+
   `<span class="viewer-loading-label">${escape(LOADING_STEPS[s.id])}</span><span class="viewer-loading-said">${STATE_WORDS[s.state]}</span><span class="viewer-loading-detail">${escape(s.state==='active'?s.detail:'')}</span></li>`).join('');
 }
 /** Update rows in place so the running mark's motion is never restarted. */
 private paintSteps(list:Element){
  const rows=[...list.children] as HTMLElement[];
  if(rows.length!==this.steps.length||rows.some((row,i)=>row.dataset.step!==this.steps[i].id)){list.innerHTML=this.stepsMarkup();return;}
  rows.forEach((row,i)=>{const s=this.steps[i],detail=s.state==='active'?s.detail:'';
   if(row.dataset.stepState!==s.state){row.dataset.stepState=s.state;const said=row.querySelector('.viewer-loading-said');if(said)said.textContent=STATE_WORDS[s.state];}
   if(s.state==='active')row.setAttribute('aria-current','step');else row.removeAttribute('aria-current');
   const line=row.querySelector('.viewer-loading-detail');if(line&&line.textContent!==detail)line.textContent=detail;});
 }
 private render(){
  const status=this.statusText();
  for(const root of [...this.roots]){
   const surface=root.querySelector<HTMLElement>('.viewer-loading');if(!surface||!(root as Node).isConnected){this.roots.delete(root);continue;}
   surface.dataset.loadingState=this.state;surface.querySelector('.viewer-loading-steps')?.setAttribute('aria-busy',String(this.state!=='failed'));
   const title=surface.querySelector('.viewer-loading-title');if(title&&title.textContent!==this.title)title.textContent=this.title;
   const kicker=surface.querySelector<HTMLElement>('.viewer-loading-kicker');if(kicker){kicker.hidden=!this.kicker;if(kicker.textContent!==this.kicker)kicker.textContent=this.kicker;}
   const list=surface.querySelector('.viewer-loading-steps');if(list)this.paintSteps(list);
   const line=surface.querySelector('.viewer-loading-status');if(line&&line.textContent!==status)line.textContent=status;
   const progress=surface.querySelector<HTMLProgressElement>('.viewer-loading-progress');
   if(progress){progress.hidden=!this.count;if(this.count){progress.max=this.count.total;progress.value=this.count.completed;}}
   if(this.state==='saving'){
    const cancel=surface.querySelector<HTMLButtonElement>('[data-action=cancel-job]');if(cancel&&!cancel.disabled)cancel.disabled=true;
    const note=surface.querySelector<HTMLElement>('.viewer-loading-note');if(note&&note.textContent!==this.savingNote)note.textContent=this.savingNote;
   }
   const message=surface.querySelector<HTMLElement>('.viewer-loading-message');if(message){message.hidden=this.state!=='failed';message.textContent=this.state==='failed'?this.message:'';}
  }
  this.renderElapsed();
 }
 private renderElapsed(){
  const seconds=(performance.now()-this.started)/1000,shown=this.state!=='failed'&&seconds>=ELAPSED_AFTER_SECONDS;
  for(const root of [...this.roots]){
   const line=root.querySelector<HTMLElement>('.viewer-loading-elapsed');if(!line||!(root as Node).isConnected){this.roots.delete(root);continue;}
   line.hidden=!shown;const text=shown?clock(seconds):'';if(line.textContent!==text)line.textContent=text;
  }
  if(!this.roots.size)this.stop();
 }
}
