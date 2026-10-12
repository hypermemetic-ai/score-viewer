import {arrangeBottomNavigation} from './application-navigation';
import {actionCode} from './input';
import {CalibrationReviewBrowser,type CalibrationReviewRow} from './calibration-review-browser';
import {effortReviewRows} from './calibration-effort-review';
import type {CalibrationColorLayout,CalibrationInputEvent,CalibrationGrade} from '@hypermemetic-ai/fingering-calculator';
import type {EffortController} from './calibration-effort-controller';
import {createEffortPlan,effortProgress,effortSetupInstruction,EFFORT_PLACEMENT_INSTRUCTION,EFFORT_GRADES,type EffortInstrument,type EffortHand} from './calibration-effort';
import type {FingertipController} from './calibration-fingertips-controller';
import {mountFingertipCalibration} from './calibration-fingertips-view';
import {calibrationEscape as esc,renderCalibrationTrial,type CalibrationNoteNames} from './calibration-trial-renderer';
import {CalibrationPageInput} from './calibration-page-input';
import {OptionsNavigation} from './options-navigation';
import './calibration-style.css';

export interface CalibrationViewOptions {
 instrument:EffortInstrument;noteNames:()=>CalibrationNoteNames;saveNoteNames:(choice:CalibrationNoteNames)=>Promise<void>;
 colors?:()=>CalibrationColorLayout;saveColors?:(choice:CalibrationColorLayout)=>Promise<void>;
 close:()=>void;exportJson:()=>Promise<void>;openLegacy?:()=>void;
}
type Page='main'|'setup'|'trial'|'options'|'measurements'|'review';
const cue='Keep your wrist in place. Keep your hand pointing the same way.';
const command=(name:string,label:string,key?:string,disabled=false)=>`<button type="button" data-command="${name}"${disabled?' disabled':''}>${label}${key?` <kbd>${key}</kbd>`:''}</button>`;
/** Player-facing pages; retained legacy evidence and queued persistence remain host-owned. */
export function mountCalibrationView(dialog:HTMLElement,effort:EffortController,fingertips:FingertipController,options:CalibrationViewOptions){
 let page:Page='main',returnPage:Page='main',stopped=false,midiConnected=false,notice='',measurementOpened=false;
 let measuring:ReturnType<typeof mountFingertipCalibration>|undefined;
 let homeNavigation:OptionsNavigation|undefined,homeCommand='continue',homeBusy=false;
 let reviewNavigation:OptionsNavigation|undefined,reviewRows:CalibrationReviewRow[]=[];
 let settingsNavigation:OptionsNavigation|undefined,settingsFocus='calibration-notation-system';
 const settingsKey=(target:HTMLElement|null)=>target?.dataset.optionsKey??target?.dataset.command??(target?.hasAttribute('data-midi-connect')?'calibration-midi-connect':undefined);
 const reviewBrowser=new CalibrationReviewBrowser();
 let hand:EffortHand=effort.state.archive.collections.find(c=>c.instrument===options.instrument)?.performingHand??'RH';
 const pageInput=new CalibrationPageInput();
 dialog.classList.add('calibration-dialog');
 dialog.innerHTML='<header class="calibration-shell-header"></header><main class="calibration-shell-body"></main><footer class="calibration-shell-footer"></footer>';
 const header=dialog.querySelector<HTMLElement>('header')!,body=dialog.querySelector<HTMLElement>('main')!,footer=dialog.querySelector<HTMLElement>('footer')!,midiContainer=document.createElement('div');
 midiContainer.className='calibration-midi-panel';
 const collection=()=>effort.state.archive.collections.find(c=>c.instrument===options.instrument);
 const pageBreak=()=>{effort.break();fingertips.break();};
 function transition(next:Page){
  measuring?.break();measuring?.dispose();measuring=undefined;
  page=next;notice='';pageBreak();render();
 }
 async function perform(work:()=>Promise<unknown>){try{await work();}catch(error){notice=error instanceof Error?error.message:String(error);render();}}
 async function continueWork(){
  const saved=collection(),ok=saved?await effort.resume(options.instrument):await effort.start({instrument:options.instrument,hand});
  if(ok){page=effort.state.current.needsSetup?'setup':'trial';render();}
 }
 async function moveTarget(delta:number){const state=effort.state,at=state.session?.trials.findIndex(t=>t.id===state.current.trial?.id)??-1,target=state.session?.trials[at+delta];if(target)await effort.navigate(target.id);}
 function openOptions(){returnPage=page;transition('options');}
 function back(){if(page==='main')options.close();else if(page==='options')transition(returnPage);else transition('main');}
 function render(){
  if(stopped)return;
  if(page==='measurements'&&measuring)return;
  if(homeNavigation){
   const focused=document.activeElement as HTMLElement|null;
   if(!homeBusy&&dialog.contains(focused)&&focused?.dataset.command)homeCommand=focused.dataset.command;
   homeNavigation.dispose();homeNavigation=undefined;
  }
  if(reviewNavigation){
   const focused=document.activeElement as HTMLElement|null;
   const root=body.querySelector<HTMLElement>('.calibration-review-browser');if(root)reviewBrowser.capture(root);
   if(dialog.contains(focused)&&focused?.dataset.review)reviewBrowser.selectRating(focused.dataset.review,reviewRows);
   if(dialog.contains(focused)&&focused?.dataset.reviewGroup)reviewBrowser.selectGroup(focused.dataset.reviewGroup,reviewRows);
   reviewNavigation.dispose();reviewNavigation=undefined;
  }
  if(settingsNavigation){const focused=document.activeElement as HTMLElement|null;if(dialog.contains(focused))settingsFocus=settingsKey(focused)??settingsFocus;settingsNavigation.dispose();settingsNavigation=undefined;}
  const state=effort.state,saved=collection(),progress=saved?effortProgress(saved):null,total=options.instrument==='janko-four-row'?208:52;
  if(page==='trial'&&state.current.needsSetup)page='setup';
  if((page==='trial'||page==='setup')&&!state.current.trial)page='main';
  dialog.classList.toggle('calibration-home',page==='main');
  dialog.classList.toggle('calibration-placement',page==='setup');
  dialog.classList.toggle('calibration-rating',page==='trial');
  dialog.classList.toggle('calibration-review',page==='review');
  dialog.classList.toggle('calibration-options',page==='options');
  body.dataset.page=page;footer.hidden=page==='measurements';
  // Keep device controls connected while their asynchronous mount runs on the menu.
  // Move the same panel out before replacing page content, preserving its listeners.
  dialog.append(midiContainer);midiContainer.hidden=page!=='options';
  const busy=state.busy,readings=new Set(fingertips.state.archive.readings.filter(r=>r.instrument===options.instrument).map(r=>r.pair)).size;
  if(page==='main'){
   header.innerHTML='<h2>Calibration</h2>';
   body.innerHTML=`<p class="calibration-home-progress"><span>Effort ratings</span><span>${progress?.measured??0} / ${total}</span></p><nav class="calibration-menu" aria-label="Calibration">${command('continue',progress?.status==='complete'?'Review ratings':'Continue',undefined,busy||state.readOnly)}${command('review','Change a rating','R',!progress?.measured||busy)}${command('measurements',`Fingertip readings <span class="calibration-menu-count">${readings} / 4</span>`,'F',busy)}${command('export','Export','E')}</nav>`;
  }else if(page==='options'){
   header.innerHTML='<h2>Options</h2>';
   body.innerHTML=`<label class="calibration-options-field" data-options-row>Notation system<select id="calibration-notation-system" aria-label="Notation system" data-calibration-names><option value="iso"${options.noteNames()==='iso'?' selected':''}>ISO</option><option value="traditional" disabled>Traditional · not available yet</option></select></label><p class="calibration-options-description">This is the global notation choice.</p>${options.instrument==='janko-four-row'?`<label class="calibration-options-field" data-options-row>Key colors<select id="calibration-key-colors" aria-label="Key colors" data-calibration-colors><option value="five-seven"${(options.colors?.()??'five-seven')==='five-seven'?' selected':''}>0–4 black, 5–B white</option><option value="classic"${options.colors?.()==='classic'?' selected':''}>Traditional black and white</option></select></label><p class="calibration-options-description">Choose the physical key colors that match your keyboard. Note names stay as selected above.</p>`:''}${options.openLegacy?command('span','Finger span'):""}<h3>Piano input</h3><p class="calibration-options-description">Optional. You can also choose a rating with keys 0–4.</p>`;
   body.append(midiContainer);
  }else if(page==='measurements'){
   header.innerHTML='';body.innerHTML='';if(!measurementOpened){fingertips.setHand(hand);measurementOpened=true;}
   measuring=mountFingertipCalibration(body,fingertips,{instrument:options.instrument,noteNames:options.noteNames,back:()=>transition('main'),options:openOptions,keyColors:options.colors});
   return;
  }else if(page==='review'){
   header.innerHTML='<h2>Change a rating</h2>';
   const plan=createEffortPlan(options.instrument,saved?.performingHand??hand);
   reviewRows=saved?effortReviewRows(plan,saved,options.noteNames()):[];
   body.innerHTML='<p class="calibration-options-description">Choose a group, then a rating to change.</p><div class="practice-browser calibration-review-browser"></div>';
   reviewBrowser.render(body.querySelector<HTMLElement>('.calibration-review-browser')!,reviewRows,busy||state.readOnly);
  }else{
   const trial=state.current.trial!,session=state.session!;
   hand=session.performingHand;
   header.innerHTML=page==='setup'?`<div class="calibration-hand-choice">${command('left','Left hand',undefined,busy)}${command('right','Right hand',undefined,busy)}</div>`:`<div class="calibration-trial-heading"><span>${hand==='LH'?'Left':'Right'} hand</span></div><nav class="calibration-trial-navigation">${command('previous','Previous','←',busy||session.trials[0].id===trial.id)}<span>${session.trials.findIndex(t=>t.id===trial.id)+1} / ${session.trials.length}</span>${command('next','Next','→',busy||session.trials.at(-1)!.id===trial.id)}</nav>`;
   if(page==='setup')header.querySelector(`[data-command=${hand==='LH'?'left':'right'}]`)?.setAttribute('aria-pressed','true');
   const diagram=renderCalibrationTrial(session.plan.keyboard,trial,options.noteNames(),options.colors?.()??'five-seven');
   const content=page==='setup'
    ? `${diagram}<ul class="calibration-placement-instructions"><li>${EFFORT_PLACEMENT_INSTRUCTION}</li><li>${esc(effortSetupInstruction(trial).replace(EFFORT_PLACEMENT_INSTRUCTION,'').replace(cue,'').trim())}</li><li>${cue}</li></ul>`
    : `<div class="calibration-trial-prompt">${diagram}<ul class="calibration-trial-instructions"><li>Press both keys together, then alternate.</li><li>${cue}</li></ul></div>`;
   body.innerHTML=`${content}${page==='setup'?'':`<h3 class="calibration-rating-question">How much effort does that take?</h3><div class="calibration-ratings">${EFFORT_GRADES.map(g=>`<button type="button" data-grade="${g.grade}"${busy||state.readOnly||state.broken?' disabled':''}><span class="calibration-grade-label"><kbd>${g.grade}</kbd><span>${g.label}</span></span><span class="calibration-grade-description">${g.description}</span></button>`).join('')}</div>`}`;
  }
  footer.innerHTML=`${command('back','Back','Esc')}${['main','review','options'].includes(page)?`<p class="calibration-home-hint"><span><kbd>↑↓</kbd> Select</span>${page==='review'?'<span><kbd>← →</kbd> Groups / ratings</span>':page==='options'?'<span><kbd>← →</kbd> Navigate</span>':''}<span><kbd>Enter</kbd> Open</span></p>`:''}${page==='setup'?command('begin','Begin','Enter',busy||state.readOnly):''}${page==='options'?'':command('options','Options','O')}`;
  arrangeBottomNavigation(footer,footer.querySelector<HTMLButtonElement>('[data-command=back]'),footer.querySelector<HTMLButtonElement>('[data-command=options]'));
  footer.toggleAttribute('data-options-row',page==='review'||page==='options');
  const error=notice||state.error;
  if(error){const p=document.createElement('p');p.className='calibration-notice';p.setAttribute('role','alert');p.textContent=error;body.append(p);}
  if(page==='main'){
   homeBusy=busy;
   homeNavigation=new OptionsNavigation(dialog,target=>{if(target?.dataset.command)homeCommand=target.dataset.command;},()=>false,{horizontal:true,focusOnPrepare:false});
   (dialog.querySelector<HTMLButtonElement>(`[data-command="${homeCommand}"]:not(:disabled)`)??body.querySelector<HTMLButtonElement>('button:not(:disabled)'))?.focus();
  }else if(page==='review'){
   reviewNavigation=new OptionsNavigation(dialog,()=>{},()=>false,{focusOnPrepare:false});
   if(!busy&&!state.readOnly&&reviewRows.length)reviewBrowser.focus(body.querySelector<HTMLElement>('.calibration-review-browser')!);else footer.querySelector<HTMLButtonElement>('[data-command=back]')?.focus();
  }else if(page==='options'){
   settingsNavigation=new OptionsNavigation(dialog,target=>{settingsFocus=settingsKey(target??null)??settingsFocus;},()=>false,{focusOnPrepare:false});
   const restored=[...dialog.querySelectorAll<HTMLElement>('button,input,select')].find(el=>settingsKey(el)===settingsFocus&&!el.closest('[hidden]')&&!(el as HTMLButtonElement).disabled);
   (restored??dialog.querySelector<HTMLElement>('[data-options-key="calibration-notation-system"]'))?.focus({preventScroll:true});
  }
 }
 const click=(event:Event)=>{
  const target=(event.target as HTMLElement).closest<HTMLElement>('[data-command],[data-grade],[data-review],[data-review-group]');if(!target||target.hasAttribute('disabled'))return;
  if(target.dataset.reviewGroup){reviewBrowser.selectGroup(target.dataset.reviewGroup,reviewRows);reviewBrowser.render(body.querySelector<HTMLElement>('.calibration-review-browser')!,reviewRows,effort.state.busy||effort.state.readOnly,true);return;}
  if(target.dataset.grade!==undefined&&page==='trial'){void effort.rateButton(Number(target.dataset.grade) as CalibrationGrade);return;}
  if(target.dataset.review){reviewBrowser.selectRating(target.dataset.review,reviewRows);void perform(async()=>{if(await effort.resume(options.instrument)&&await effort.navigate(target.dataset.review!)){page=effort.state.current.needsSetup?'setup':'trial';render();}});return;}
  switch(target.dataset.command){
   case 'back':back();break;
   case 'continue':if(collection()&&effortProgress(collection()!).status==='complete')transition('review');else void perform(continueWork);break;
   case 'review':transition('review');break;
   case 'measurements':transition('measurements');break;
   case 'options':openOptions();break;
   case 'export':void perform(options.exportJson);break;
   case 'span':options.openLegacy?.();break;
   case 'left':case 'right':{hand=target.dataset.command==='left'?'LH':'RH';void perform(()=>effort.setPerformingHand(hand));break;}
   case 'previous':case 'next':void moveTarget(target.dataset.command==='previous'?-1:1);break;
   case 'begin':void perform(async()=>{if(await effort.prepare()){page='trial';render();}});break;
  }
 };
 const change=(event:Event)=>{
  const target=event.target as HTMLSelectElement;
  if(target.matches('[data-calibration-names]'))void perform(()=>options.saveNoteNames(target.value as CalibrationNoteNames));
  if(target.matches('[data-calibration-colors]'))void perform(()=>options.saveColors?.(target.value as CalibrationColorLayout)??Promise.resolve());
 };
 dialog.addEventListener('click',click);dialog.addEventListener('change',change);
 const unsubscribe=effort.subscribe(()=>render());
 return {
  midiContainer,
  get acceptsRatings(){return !stopped&&page==='trial'&&!effort.state.current.needsSetup&&!effort.state.broken;},
  key(event:KeyboardEvent,type:'key-down'|'key-up'='key-down'):boolean {
   if(stopped)return false;
   if(page==='measurements')return measuring?.key(event,type)??false;
   if(type==='key-up')return false;
   if(page==='main'&&!event.shiftKey&&homeNavigation?.keyDown(event))return true;
   if(page==='review'&&!event.shiftKey&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&(event.target as HTMLElement|null)?.closest('[data-review-group],[data-review]')){
    const focused=event.target as HTMLElement,code=actionCode(event)==='Space'?'Enter':actionCode(event);
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'].includes(code)){
     if(effort.state.busy||effort.state.readOnly||event.repeat&&code==='Enter')return true;
     if(focused.dataset.reviewGroup)reviewBrowser.selectGroup(focused.dataset.reviewGroup,reviewRows);else if(focused.dataset.review)reviewBrowser.selectRating(focused.dataset.review,reviewRows);
     const result=reviewBrowser.key(code,reviewRows);
     if(result==='open'){const id=reviewBrowser.current(reviewRows)?.id;[...body.querySelectorAll<HTMLButtonElement>('[data-review]')].find(b=>b.dataset.review===id)?.click();}
     else if(result==='handled')reviewBrowser.render(body.querySelector<HTMLElement>('.calibration-review-browser')!,reviewRows,false,true);
     if(result)return true;
    }
   }
   if(page==='review'&&!event.shiftKey&&reviewNavigation?.keyDown(event))return true;
   if(page==='options'&&settingsNavigation?.keyDown(event))return true;
   if(event.ctrlKey||event.altKey||event.metaKey||event.shiftKey||event.repeat)return false;
   if((event.target as HTMLElement|null)?.closest('input,select,textarea,[contenteditable=true]'))return false;
   if(event.code==='Escape'){back();return true;}
   if(page==='main'){
    const name=({KeyR:'review',KeyF:'measurements',KeyE:'export',KeyO:'options'} as Record<string,string>)[event.code];
    if(name){dialog.querySelector<HTMLButtonElement>(`[data-command="${name}"]:not(:disabled)`)?.click();return true;}
   }
   if(event.code==='KeyO'){if(page==='options')back();else openOptions();return true;}
   if(page==='setup'&&['Enter','NumpadEnter'].includes(event.code)){void perform(async()=>{if(await effort.prepare()){page='trial';render();}});return true;}
   if(page==='trial'&&['ArrowLeft','ArrowRight'].includes(event.code)){void moveTarget(event.code==='ArrowLeft'?-1:1);return true;}
   return false;
  },
  input(event:CalibrationInputEvent,connected:boolean):Promise<boolean>{
   midiConnected=connected;
   const admitted=pageInput.admit(event,page==='trial'&&!effort.state.current.needsSetup&&!effort.state.broken);
   return admitted?effort.input(admitted,midiConnected):Promise.resolve(false);
  },
  setMidiConnected(value:boolean){midiConnected=value;},
  break(){if(stopped)return;pageInput.clear();pageBreak();if(page==='trial')page='setup';render();},
  async flush(){await Promise.all([effort.flush(),fingertips.flush()]);},
  dispose(){if(stopped)return;stopped=true;pageInput.clear();homeNavigation?.dispose();reviewNavigation?.dispose();settingsNavigation?.dispose();measuring?.break();measuring?.dispose();pageBreak();unsubscribe();dialog.removeEventListener('click',click);dialog.removeEventListener('change',change);dialog.classList.remove('calibration-dialog','calibration-home','calibration-placement','calibration-rating','calibration-review','calibration-options');},
 };
}
