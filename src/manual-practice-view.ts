import type {Metadata} from './package';
import {workHeadingMarkup} from './score-catalog';
import {arrangeBottomNavigation} from './application-navigation';
import {practiceOptionsMarkup,integerPracticeSetting,adjustPracticeInteger} from './practice-options-markup';
import {actionCode} from './input';
import {ManualReadingContext} from './manual-reading-context';
import {ManualContrastTransport} from './manual-contrast-transport';
import {ManualPracticeSession} from './manual-practice-session';
import {manualPassageScene} from './manual-passage-scene';
import {practiceClipLabel,activePracticeClip} from './practice-clip';
import type {ExerciseClip} from './practice-exercise-catalog';
import {ManualPracticeTransport,type ManualClock} from './manual-practice-transport';
import {PracticeClock} from './practice-clock';
import {PracticeBrowser,practiceChunkRange} from './practice-browser';
import {practicePreferences,type PracticeViewContext} from './practice-context';
import {displayedPracticeAssessment} from './practice-display';
import {hasDone} from './practice-attainment';
import {practiceClipChunk,practicePercent,passageStartTempo,reconcilePassages,setPracticeGoal,type PracticeChunk,type PracticeState} from './practice';
import {ManualTempoControls,manualTempoField,practiceSpeedField,refreshPracticeSpeedDisplay,refreshPracticeSpeedDisplays} from './manual-tempo-control';
import {tempoRateEdit,speedNumber,speedEdit,adjustDuration,adjustPracticePercent as adjustPercent,adjustProgression,snapPracticeSpeed,snapPracticeStep} from './tempo-presentation';
import {requireReferencePerformanceTempo} from '../vendor/iso-notation/src/model/reference-performance-tempo';
import {tempoRateNumber} from './metronome-mark';
import {practiceTiming,countBeatAt} from './practice-timing';
import {manualPracticeRecord,readManualPractice,type ManualPracticeRecord} from './manual-practice-state';
import {fitSurface,fitDialog} from './orientation';
import {fitLeafPreview} from './practice-crop-fit';
import {navigationHint} from './navigation-hint';
import type {Rotation,PersonalState} from './state';
import type {ReadingNotation} from './dual-reading-package';
import type {MidiNote,MidiCC} from './midi';

const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
export interface ManualPracticeViewOptions {/** The library's name for the work; the package's own metadata otherwise. */
 work?:Metadata;/** Told whenever what practice shows may have changed (app-state.ts). */declare?:()=>void;
 context:ManualReadingContext;personal:PersonalState;
 /** Must build a joined window from the locally admitted source scene. */
 passage:(bars:readonly number[],notation:ReadingNotation,clip?:ExerciseClip)=>string;
 save:(record:ManualPracticeRecord,view:ReturnType<ManualReadingContext['viewRecord']>)=>Promise<void>;
 rotation?:()=>Rotation;doneKey?:()=>string;settingsKey?:()=>string;freeViewKey?:()=>string;
 workingEditKey?:()=>string;navigationKeys?:()=>{previous:string;next:string};audioOutput?:()=>string;
 createClock?:()=>ManualClock;back:()=>void;settings:()=>void;
}
/** Musical manual practice owns its loop clock and all visible ink. The player
 * chooses window turns; MIDI never accepts notes, retires ink or creates bests. */
export class ManualPracticeView {
 readonly assessment='manual' as const;readonly plan;readonly state;private browser:PracticeBrowser;
 private mounted=new AbortController();private transport?:ManualPracticeTransport|ManualContrastTransport;private exercise?:PracticeChunk;private overview=true;private disposed=false;private raf=0;
 private surface?:HTMLElement;private settingsDialog?:HTMLDialogElement;private saves=Promise.resolve();private saveError?:string;private renderError?:string;
 private manual:ManualTempoControls;private frames=new Map<string,string>();private rendered='';private cueLabel='';private feedback='';private freeView=false;private lastWorking=0;
 constructor(readonly app:HTMLElement,readonly options:ManualPracticeViewOptions){
  this.plan=options.context.plan;this.state=options.context.state;this.browser=options.context.browser;
  this.manual=new ManualTempoControls({accepts:el=>!this.disposed&&(this.app.contains(el)||!!this.settingsDialog?.contains(el)),
   adjust:(key,direction,repeated,elapsed)=>this.adjust(key,direction,repeated,elapsed),
   edit:{commit:(_key,field)=>this.setting(field),cancel:()=>this.refreshFields(),adjust:(key,field,direction,elapsed)=>this.adjustDraft(key,field,direction,elapsed)}});
 }
 get session(){return this.options.context.session;}
 get modalOpen(){return !!this.settingsDialog;}
 /** What practice shows, for the application's declared state (app-state.ts). */
 declared():{step:'manual';section?:string}{const section=!this.overview?this.exercise?.id:undefined;return section?{step:'manual',section}:{step:'manual'};}
 get canTurnPage(){return !this.disposed&&!this.overview&&!this.settingsDialog&&!!this.session;}
 get canAdjustWorking(){return !this.disposed&&!this.overview&&!this.settingsDialog&&!this.freeView&&!!this.session;}
 editWorking(openerCode?:string){const field=this.app.querySelector<HTMLInputElement>('[data-practice-setting=working]');return !!this.canAdjustWorking&&!!field&&this.manual.editField(field,openerCode);}
 get canMarkDone(){return !this.disposed&&!this.overview&&!this.settingsDialog&&!!this.session?.canDone;}
 get bindingContext(){const active=!this.disposed&&!this.overview&&!!this.session;return {active,measureNavigation:active&&(this.session?.windows.windows.length??0)>1};}
 async mount(context?:PracticeViewContext){
  if(this.disposed)return;
  if(context){this.browser.includeManual=context.includeManual;this.browser.select(this.state,context.parent??context.selected);if(context.component)this.browser.select(this.state,context.component,true);}
  this.app.innerHTML='<section class="surface practice-surface manual-practice-surface practice-modes-surface"><header class="practice-header"></header><div class="practice-overview"></div><main class="practice-stage" tabindex="-1"><aside class="practice-held-context" hidden></aside><div class="practice-score"></div><div class="practice-countin" hidden aria-live="off"><strong></strong></div></main><nav class="practice-controls"></nav></section>';
  const surface=this.app.querySelector<HTMLElement>('.practice-surface')!;this.surface=surface;
  surface.addEventListener('click',event=>{const control=(event.target as HTMLElement).closest<HTMLElement>('[data-practice]');if(control)void this.action(control.dataset.practice!);},{signal:this.mounted.signal});
  surface.addEventListener('change',event=>{const field=event.target as HTMLInputElement;if(field.dataset.practiceDisplay==='manual'){this.browser.setIncludeManual(field.checked);this.paintBrowser(false);this.app.querySelector<HTMLInputElement>('[data-practice-display="manual"]')?.focus();}else this.settingChanged(field);},{signal:this.mounted.signal});
  surface.addEventListener('keydown',event=>{const field=event.target as HTMLInputElement;if(field.dataset.practiceDisplay==='manual'&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&['Enter','Escape'].includes(actionCode(event))){event.preventDefault();if(!event.repeat){if(actionCode(event)==='Enter')field.click();else void this.action('back');}}},{signal:this.mounted.signal});
  if(context?.passage){const chunk=reconcilePassages(this.plan,this.state).all.get(context.passage);if(chunk){this.selectPassage(chunk,false);if(context.window)this.session!.windows.showBar(context.window[0]);this.options.context.syncWindowAnchor();}}
  window.addEventListener('resize',this.resized);this.paint();this.refit();this.frame();
 }
 contextSnapshot():PracticeViewContext {const bars=this.session?.windows.bars??[];return {partition:this.plan.partition,composites:structuredClone(this.state.composites??{}),preferences:practicePreferences(this.state),selected:this.browser.selected,parent:this.browser.parent,component:this.browser.component,includeManual:this.browser.includeManual,...(!this.overview&&this.session?{passage:this.session.chunk.id}:{}),...(bars.length?{window:[bars[0],bars.at(-1)!] as [number,number]}:{})};}
 private status(message=''){
  if(this.disposed||!this.surface||!this.app.contains(this.surface))return;
  this.feedback=this.saveError??this.renderError??message;
  const node=this.surface.querySelector<HTMLElement>('.practice-status');if(!node)return;
  node.textContent=this.saveError?'Progress not saved. Retry saving.':this.renderError?'Passage unavailable. Inspect source.':this.feedback;
  node.title=this.feedback;node.setAttribute('aria-label',this.feedback);node.hidden=!this.feedback;
 }

 private save(){if(this.session)this.state.workingByPattern[this.session.chunk.pattern]=this.state.working;const record=this.options.context.record(),view=this.options.context.viewRecord();this.saves=this.saves.then(()=>this.options.save(record,view)).then(()=>{this.saveError=undefined;}).catch(error=>{this.saveError=`Progress has not saved: ${(error as Error).message}`;this.pause();this.status();});return this.saves;}
 async flush(){this.pause();await this.save();await this.saves;if(this.saveError)throw Error(this.saveError);}
 private passage(bars:readonly number[],clip?:ExerciseClip){const notation=this.options.context.view.notation,key=`${notation}:${bars.join(',')}:${clip?.id??''}`;let source=this.frames.get(key);if(source!==undefined){this.frames.delete(key);this.frames.set(key,source);}else{source=clip?manualPassageScene(this.options.context.package,bars,clip).svg:this.options.passage(bars,notation);this.frames.set(key,source);if(this.frames.size>16)this.frames.delete(this.frames.keys().next().value!);}
  const document=new DOMParser().parseFromString(source,'image/svg+xml'),svg=document.documentElement as unknown as SVGSVGElement;
  if(svg.localName!=='svg'||document.querySelector('parsererror'))throw Error('The admitted passage did not produce complete SVG.');svg.classList.add('practice-passage');return document;
 }
 private paintBrowser(focus=true){this.browser.render(this.app.querySelector<HTMLElement>('.practice-overview')!,this.state,(bars,clip)=>document.importNode(this.passage(bars,clip).documentElement,true) as unknown as SVGSVGElement,focus);}
 private paintScore(){const session=this.session;if(!session||this.overview)return;const bars=session.windows.bars,clip=activePracticeClip(session.chunk,this.plan.barTicks),key=`${this.options.context.view.notation}:${bars.join(',')}:${clip?.id??''}`,root=this.app.querySelector<HTMLElement>('.practice-score')!;
  try{if(key!==this.rendered){const doc=this.passage(bars,clip);root.replaceChildren(document.importNode(doc.documentElement,true));
   const carry=clip||this.plan.partition==='bounded-exercises-v1'?this.plan.owners.filter(a=>a.tick<session.chunk.start&&a.end>session.chunk.start):[],context=this.app.querySelector<HTMLElement>('.practice-held-context')!;context.replaceChildren();context.hidden=!carry.length;if(carry.length){const label=document.createElement('p');label.textContent='Keep these earlier notes held through the count-in.';const origins=document.createElement('div');origins.className='practice-held-origins';context.append(label,origins);
    for(const owner of carry){const end=this.plan.components.find(c=>c.bar===owner.bar&&c.tick>owner.tick)?.tick??this.plan.barTicks[owner.bar+1],origin={id:`${clip?.id??session.chunk.id}-carry-${owner.id}`,start:owner.tick,end,firstBar:owner.bar,lastBar:owner.bar},source=manualPassageScene(this.options.context.package,[owner.bar],origin,new Set([owner.id])).svg,svg=new DOMParser().parseFromString(source,'image/svg+xml').documentElement,wrap=document.createElement('div');wrap.className='practice-held-origin';wrap.dataset.sourceContextBar=String(owner.bar+1);wrap.append(document.importNode(svg,true));origins.append(wrap);}
   }this.rendered=key;}const svg=root.querySelector<SVGSVGElement>(':scope > svg')!,stage=this.app.querySelector<HTMLElement>('.practice-stage')!,box=svg.viewBox.baseVal;
   if(!(box.width>0&&box.height>0))throw Error('The admitted passage has no bounded frame.');const style=getComputedStyle(root),width=Math.max(1,root.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)),height=Math.max(1,stage.clientHeight-24-(this.app.querySelector<HTMLElement>('.practice-held-context:not([hidden])')?.offsetHeight??0)-(parseFloat(getComputedStyle(stage).rowGap)||0)),scale=Math.min(width/box.width,height/box.height);svg.style.width=`${box.width*scale}px`;svg.style.height=`${box.height*scale}px`;this.renderError=undefined;
  }catch(error){this.renderError=(error as Error).message;this.transport?.pause();root.replaceChildren();const context=this.app.querySelector<HTMLElement>('.practice-held-context')!;context.replaceChildren();context.hidden=true;this.rendered='';this.status();}
 }
 private selectPassage(chunk:PracticeChunk,resetWorking=true){this.transport?.close();this.transport=undefined;this.freeView=false;this.exercise=chunk;this.browser.select(this.state,chunk.id);if(resetWorking)this.state.working=passageStartTempo(this.plan,this.state,chunk);this.options.context.selectPassage(chunk.kind==='contrast'?practiceClipChunk(chunk,0):chunk);this.overview=false;this.rendered='';this.renderError=undefined;}
 private totalLabel(){const assessment=displayedPracticeAssessment(this.plan,this.state,this.browser.includeManual);return assessment.included?`Total progress · ${practicePercent(assessment.progress??0)}%`:'No exercises included';}
 private paint(){if(this.disposed)return;this.options.declare?.();const p=this.options.context.package,s=this.session,root=this.app.querySelector('.practice-header')!;
  root.innerHTML=`<h1>${workHeadingMarkup(this.options.work??p.manifest.metadata)}</h1><div class="practice-head-actions"><small>Manual practice · ${this.options.context.view.notation==='tab'?'TAB':'ISO'}</small>${s&&!this.overview?`<small data-practice-range>${s.chunk.kind==='contrast'?`Contrast · ${s.chunk.clipIndex===1?'B':'A'} · ${escape(practiceClipLabel(s.chunk))}`:`Measure${s.chunk.firstBar===s.chunk.lastBar?'':'s'} ${escape(practiceChunkRange(s.chunk))}${activePracticeClip(s.chunk,this.plan.barTicks)?' · excerpt':''}`}</small><small data-practice-total>${this.totalLabel()}</small>`:''}</div>`;
  this.app.querySelector<HTMLElement>('.practice-overview')!.hidden=!this.overview;this.app.querySelector<HTMLElement>('.practice-stage')!.hidden=this.overview;this.app.dataset.practicePhase=this.overview?'overview':s?.phase??'ready';
  this.paintControls();if(this.overview)this.paintBrowser(!this.settingsDialog);else if(!this.renderError)this.paintScore();this.paintCue();this.status();
 }
 private speedInput(key:'working'|'start'|'connectionStart'|'step',value:number,label:string){return manualTempoField(key,`<input type="text" inputmode="decimal" data-practice-setting="${key}" data-absolute="${value}" data-presented="${speedNumber(value,this.state.target)}" aria-label="${label}" value="${speedNumber(value,this.state.target)}">`,key==='step'?'increase percent of target':`${key==='start'?'starting':key==='connectionStart'?'connection':'working'} speed`,'%');}
 private settingsControl(){const hint=this.options.settingsKey?.()??'O';return `<button data-practice="settings">Options${hint?` <kbd>${escape(hint)}</kbd>`:''}</button>`;}
 private paintControls(){const root=this.app.querySelector<HTMLElement>('.practice-controls')!,restoreDraft=this.manual.retainDraft(root),active=document.activeElement as HTMLElement,hadFocus=root.contains(active),action=active?.dataset.practice,setting=active?.dataset.practiceSetting,s=this.session;
  root.classList.toggle('practice-controls-active',!this.overview);root.toggleAttribute('data-practice-shortcuts',!this.overview);const retry=this.saveError?'<button data-practice="retry-save">Retry saving progress</button>':'';
  if(this.overview)root.innerHTML=`${retry}${navigationHint()}${this.settingsControl()}<button data-practice="back">Back <kbd>Esc</kbd></button>`;
  else{const target=s?.doneTarget(),marked=target&&hasDone(this.state,target),keys=this.options.navigationKeys?.()??{previous:'←',next:'→'},navigation=!this.canAdjustWorking&&this.bindingContext.measureNavigation?`<span class="options-nav-hint"><span>${escape(keys.previous)} Previous measures</span><span>${escape(keys.next)} Next measures</span></span>`:'',freeKey=this.options.freeViewKey?.()??'V';
   root.innerHTML=`<div class="practice-primary-controls"><div class="practice-primary-extra"><span class="practice-status" role="status" hidden></span></div><div class="practice-mode-controls"><button class="practice-ready" data-practice="ready">${s?.phase==='ready'?'Ready':'Resume'} <kbd>Space</kbd></button><button data-practice="done" class="practice-done" aria-label="${marked?'Withdraw Done':'Done'}" aria-pressed="${!!marked}" ${s?.canDone?'':'disabled'}>${marked?'✓ ':''}Done <kbd>${escape(this.options.doneKey?.()??'Enter')}</kbd></button><label>${practiceSpeedField(`<input type="text" inputmode="decimal" data-practice-setting="working" data-absolute="${this.state.working}" data-presented="${speedNumber(this.state.working,this.state.target)}" aria-label="Speed percent${this.canAdjustWorking&&(this.options.workingEditKey?.()??'S')?`; ${(this.options.workingEditKey?.()??'S')} edits`:''}" value="${speedNumber(this.state.working,this.state.target)}">`,this.canAdjustWorking?(this.options.workingEditKey?.()??'S'):'')}</label></div></div><div class="practice-secondary-controls">${retry}<button data-practice="pause">Free view${freeKey?` <kbd>${escape(freeKey)}</kbd>`:''}</button><label><input type="checkbox" data-practice-setting="keepTempo" ${this.state.keepTempo?'checked':''}> Lock current speed <kbd>K</kbd></label>${navigation}${this.settingsControl()}<button data-practice="overview">Back <kbd>Esc</kbd></button></div>`;
  }
  if(root.ownerDocument){root.classList.remove('application-navigation');arrangeBottomNavigation(root.querySelector<HTMLElement>('.practice-secondary-controls')??root,root.querySelector<HTMLButtonElement>('[data-practice=back],[data-practice=overview]'),root.querySelector<HTMLButtonElement>('[data-practice=settings]'));}
  if(!this.overview)for(const control of root.querySelectorAll<HTMLElement>('button,input,select,textarea,summary,a[href]'))control.tabIndex=-1;restoreDraft();refreshPracticeSpeedDisplays(root);this.status(this.feedback);
  if(!hadFocus||!this.overview)return;if(action)root.querySelector<HTMLElement>(`[data-practice="${CSS.escape(action)}"]`)?.focus({preventScroll:true});else if(setting)root.querySelector<HTMLElement>(`[data-practice-setting="${CSS.escape(setting)}"]`)?.focus({preventScroll:true});
 }
 private paintCue(){const root=this.app.querySelector<HTMLElement>('.practice-countin');if(!root)return;const s=this.session,clock=this.transport?.clock,future=this.transport?.futureCount,now=clock?.now(),grid=future?.grid??s?.pulseGrid,rate=future?.nextBpm??s?.bpm,origin=future?.boundaryMs??(s&&grid&&rate?s.startMs-practiceTiming(rate,grid).countInMs:undefined),visible=!this.overview&&now!==undefined&&grid&&rate&&origin!==undefined&&(s?.phase==='countin'||!!future)&&now>=origin;
  root.hidden=!visible;if(!visible){this.cueLabel='';return;}const label=countBeatAt(now!-origin!,rate!,grid!),number=root.querySelector<HTMLElement>('strong')!;if(this.cueLabel!==label){number.textContent=label;this.cueLabel=label;}const timing=practiceTiming(rate!,grid!);number.dataset.accent=String((grid!.countStartPhasePulses!+Math.floor((now!-origin!)/timing.eighthMs))%grid!.countBarPulses!<grid!.countBeatPulses!);
 }
 private frame=()=>{if(this.disposed)return;if(this.transport&&this.session&&['countin','trial','complete'].includes(this.session.phase)){this.transport.update();this.paintCue();}this.raf=requestAnimationFrame(this.frame);};
 private replaceTransport(){this.transport?.close();const clock:ManualClock=this.options.createClock?.()??new PracticeClock('__TAURI_INTERNALS__' in window,this.options.audioOutput?.()??'',message=>{if(this.disposed||this.transport?.clock!==clock)return;this.pause();this.status(message);});
  const changed=()=>{if(this.disposed)return;this.options.context.syncWindowAnchor();const working=this.state.working;this.paint();if(this.lastWorking!==working){this.lastWorking=working;void this.save();}};
  const exercise=this.exercise;this.transport=exercise?.kind==='contrast'?new ManualContrastTransport((index,claims)=>{const session=new ManualPracticeSession(this.plan,practiceClipChunk(exercise,index),this.state,{claims,completeClaim:false});this.options.context.session=session;this.rendered='';return session;},clock,changed,message=>this.status(message)):new ManualPracticeTransport(this.session!,clock,changed,message=>this.status(message));}
 async action(action:string){if(this.disposed)return;try{
  if(action.startsWith('exclude:')||action.startsWith('include:')){if(this.browser.toggleExcluded(this.state,action.slice(action.indexOf(':')+1))){await this.save();this.paintBrowser(true);}return;}
  if(action.startsWith('select:')||action.startsWith('component:')){this.browser.select(this.state,action.slice(action.indexOf(':')+1),action.startsWith('component:'));this.paintBrowser(true);return;}
  if(action.startsWith('passage:')){const chunk=reconcilePassages(this.plan,this.state).all.get(action.slice(8));if(chunk){this.selectPassage(chunk);this.paint();this.app.querySelector<HTMLElement>('.practice-stage')!.focus();}return;}
  if(action==='ready'){if(!this.session||this.saveError||this.renderError)return;this.manual.cancelEdit();this.freeView=false;if(!this.transport)this.replaceTransport();if(['countin','trial','complete'].includes(this.session.phase))this.transport!.pause();await this.transport!.start();return;}
  if(action==='pause'){this.freeView=true;this.pause();return;}if(action==='overview'){this.pause();this.overview=true;this.paint();return;}
  if(action==='free-view'){const chunk=this.browser.current(this.state);if(this.overview&&chunk)this.selectPassage(chunk);this.freeView=true;this.pause();this.paint();this.app.querySelector<HTMLElement>('.practice-stage')?.focus();return;}
  if(action==='back'){await this.flush();this.close();this.options.back();return;}
  if(action==='settings'){this.pause();this.options.settings();return;}
  if(action==='next'||action==='previous'){if(this.canTurnPage&&this.options.context.turn(action==='next'?1:-1)){this.paint();void this.save();}return;}
  if(action==='done'){const result=this.session?.toggleDone();if(result){this.transport?.prepare();await this.save();this.paint();}return;}
  if(action==='retry-save'){await this.save();this.paint();return;}
 }catch(error){this.pause();this.status((error as Error).message);}}
 key(code:string,repeated=false,_shift=false){if(this.settingsDialog||this.disposed)return false;if(this.overview){if(repeated&&!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(code))return false;const result=this.browser.key(code,this.state);if(result==='practice'&&document.activeElement?.closest('.practice-overview')){const chunk=this.browser.current(this.state);if(chunk){this.selectPassage(chunk);this.paint();this.app.querySelector<HTMLElement>('.practice-stage')!.focus();}return true;}if(result==='exclusion'){void this.save();this.paintBrowser(true);return true;}if(result==='handled'){this.paintBrowser(true);return true;}}
  else{if(this.canAdjustWorking&&(code==='ArrowLeft'||code==='ArrowRight')){if(!repeated)this.manual.begin(code,(again,elapsed)=>this.adjust('working',code==='ArrowRight'?1:-1,again,elapsed));return true;}if(['ArrowLeft','ArrowRight'].includes(code))return true;if(repeated)return ['Space','KeyK','Enter'].includes(code);if(code==='Space'){void this.action('ready');return true;}if(code==='KeyK'){this.state.keepTempo=!this.state.keepTempo;this.transport?.prepare();void this.save();this.paintControls();return true;}}
  if(code==='Escape'){void this.action(this.overview?'back':'overview');return true;}return false;
 }
 pause(){if(this.disposed)return;this.manual.cancelEdit();if(this.transport)this.transport.pause();else{this.session?.pause();this.paint();}}
 close(){if(this.disposed)return;this.disposed=true;this.mounted.abort();this.transport?.close();this.session?.pause();this.manual.dispose();this.frames.clear();window.removeEventListener('resize',this.resized);cancelAnimationFrame(this.raf);this.app.removeAttribute('data-practice-phase');this.settingsDialog=undefined;}
 cancelTempoHold(){this.manual.cancel();}releaseTempoKey(code:string){this.manual.release(code);}
 // A piano elsewhere in the app does not change this source's assessment.
 overlay(_active:boolean){}observe(_event:MidiNote){}note(_event:MidiNote){}sustain(_event:MidiCC){}connectionChanged(){}
 private resized=()=>this.refit();
 refit(){if(this.disposed)return;fitSurface(this.app.querySelector<HTMLElement>('.practice-surface')!,this.options.rotation?.()??0);if(this.settingsDialog)fitDialog(this.settingsDialog,this.options.rotation?.()??0);if(this.overview)fitLeafPreview(this.app.querySelector<HTMLElement>('.practice-leaf-preview')!);else this.paintScore();}
 optionsMarkup(){return practiceOptionsMarkup(requireReferencePerformanceTempo(this.plan),this.state,this.speedInput('start',this.state.start,'Starting speed percent'),this.speedInput('step',this.state.step,'Increase percent of target'),this.speedInput('connectionStart',this.state.connectionStart??this.state.target*.5,'Connection speed percent'));}
 mountOptions(dialog:HTMLDialogElement,_close:()=>void){this.settingsDialog=dialog;const section=dialog.querySelector<HTMLElement>('[data-practice-options]')!,abort=new AbortController();section.addEventListener('change',event=>this.settingChanged(event.target as HTMLInputElement),{signal:abort.signal});section.querySelector('[data-use-reference]')!.addEventListener('click',()=>{this.applySetting(setPracticeGoal(this.state,this.plan));this.refreshFields();},{signal:abort.signal});return ()=>{this.manual.cancelEdit();abort.abort();if(this.settingsDialog===dialog)this.settingsDialog=undefined;if(!this.disposed)this.paint();};}
 private refreshFields(){for(const root of [this.app,this.settingsDialog].filter((root):root is HTMLElement=>!!root)){for(const field of root.querySelectorAll<HTMLInputElement>('[data-practice-setting]')){const key=field.dataset.practiceSetting as 'working'|'start'|'connectionStart'|'step'|'target'|'countInBars'|'resumeCooldownSeconds';if(!['working','start','connectionStart','step','target','countInBars','resumeCooldownSeconds'].includes(key))continue;const value=this.state[key]??(key==='connectionStart'?this.state.target*.5:key==='countInBars'?2:3),text=integerPracticeSetting(key)?String(value):key==='target'?tempoRateNumber(value):speedNumber(value,this.state.target);field.value=text;field.dataset.absolute=String(value);field.dataset.presented=text;refreshPracticeSpeedDisplay(field);}for(const node of root.querySelectorAll<HTMLElement>('[data-personal-goal-only]'))node.hidden=!this.state.personalGoal;}}
 private applySetting(candidate:PracticeState,key='target'){
  const next=readManualPractice(manualPracticeRecord(this.plan,candidate),this.plan);if(JSON.stringify(next)===JSON.stringify(this.state)){this.refreshFields();return;}
  const active=this.transport?.startingRate!==undefined||!!this.session&&['countin','trial'].includes(this.session.phase);
  if(key!=='target'&&(key!=='working'||active)){
   if(key==='working')this.session?.queueWorking(next.working);
   Object.assign(this.state,next);this.transport?.prepare();void this.save();this.refreshFields();return;
  }
  const chunk=this.exercise??this.session?.chunk,bar=this.session?.windows.bars[0];this.transport?.close();this.transport=undefined;if(!next.personalGoal)delete this.state.personalGoal;Object.assign(this.state,next);if(chunk){this.options.context.selectPassage(chunk);this.session!.pause();if(bar!==undefined)this.session!.windows.showBar(bar);this.options.context.syncWindowAnchor();}this.rendered='';void this.save();this.paint();this.refreshFields();
 }
 private settingChanged(field:HTMLInputElement){return this.manual.ownsDraft(field)?false:this.setting(field);}
 private setting(field:HTMLInputElement){const key=field.dataset.practiceSetting;if(!key)return true;try{const candidate=structuredClone(this.state),draft=field.value===field.dataset.manualDraftText?Number(field.dataset.manualDraft):undefined;if(key==='target'){const original=Number(field.dataset.absolute),bpm=draft??tempoRateEdit(field.value,original);if(bpm===original){this.refreshFields();return true;}this.applySetting(setPracticeGoal(candidate,this.plan,bpm));}else if(['working','start','connectionStart','step'].includes(key)){
  const name=key as 'working'|'start'|'connectionStart'|'step',original=Number(field.dataset.absolute),value=draft??speedEdit(field.value,original,candidate.target,field.dataset.presented);candidate[name]=value;
  const next=readManualPractice(manualPracticeRecord(this.plan,candidate),this.plan);
  if(value!==original)next[name]=name==='step'?snapPracticeStep(value,next.target):snapPracticeSpeed(value,next.target);
  this.applySetting(next,key);
 }else if(integerPracticeSetting(key)){Object.assign(this.state,readManualPractice(manualPracticeRecord(this.plan,{...candidate,[key]:draft??Number(field.value)}),this.plan));this.transport?.prepare();void this.save();this.refreshFields();}else if(key==='keepTempo'){this.state.keepTempo=field.checked;this.transport?.prepare();void this.save();this.paintControls();}return true;}catch(error){this.status((error as Error).message);const notice=this.settingsDialog?.querySelector('[data-goal-error]');if(notice)notice.textContent=(error as Error).message;return false;}}
 private adjusted(key:string,value:number,direction:number,elapsed:number){return integerPracticeSetting(key)?adjustPracticeInteger(key,value,direction):key==='target'?adjustDuration(value,direction,elapsed):key==='step'?adjustProgression(value,this.state.target,direction,elapsed):adjustPercent(value,this.state.target,direction);}
 private adjust(key:string,direction:number,repeated:boolean,elapsed:number){const field=(this.settingsDialog??this.app).querySelector<HTMLInputElement>(`[data-practice-setting="${key}"]`);if(!field||this.disposed||this.saveError)return false;if(!repeated&&!this.setting(field))return false;const name=key as 'working'|'start'|'connectionStart'|'step'|'target'|'countInBars'|'resumeCooldownSeconds',next=this.adjusted(key,this.state[name]??(key==='connectionStart'?this.state.target*.5:key==='countInBars'?2:3),direction,elapsed);if(next===this.state[name])return false;if(key==='target')this.applySetting(setPracticeGoal(this.state,this.plan,next));else if(integerPracticeSetting(key)){Object.assign(this.state,readManualPractice(manualPracticeRecord(this.plan,{...this.state,[key]:next}),this.plan));this.transport?.prepare();void this.save();this.refreshFields();}else this.applySetting({...this.state,[key]:next},key);return true;}
 private adjustDraft(key:string,field:HTMLInputElement,direction:number,elapsed:number){try{const original=Number(field.dataset.absolute),value=field.value===field.dataset.manualDraftText?Number(field.dataset.manualDraft):integerPracticeSetting(key)?Number(field.value):key==='target'?tempoRateEdit(field.value,original):speedEdit(field.value,original,this.state.target,field.dataset.presented),next=this.adjusted(key,value,direction,elapsed);if(key==='target')setPracticeGoal(this.state,this.plan,next);else readManualPractice(manualPracticeRecord(this.plan,{...this.state,[key]:next}),this.plan);if(next===value)return false;field.value=integerPracticeSetting(key)?String(next):key==='target'?tempoRateNumber(next):speedNumber(next,this.state.target);field.dataset.manualDraft=String(next);field.dataset.manualDraftText=field.value;return true;}catch(error){this.status((error as Error).message);return false;}}
}
