import {practiceOptionsMarkup,integerPracticeSetting,adjustPracticeInteger} from './practice-options-markup';
import {actionCode} from './input';
import {ManualReadingContext} from './manual-reading-context';
import {ManualPracticeTransport,type ManualClock} from './manual-practice-transport';
import {PracticeClock} from './practice-clock';
import {PracticeBrowser,practiceMeasureRange} from './practice-browser';
import {practicePreferences,type PracticeViewContext} from './practice-context';
import {displayedPracticeTotal} from './practice-display';
import {hasDone} from './practice-attainment';
import {practicePercent,passageStartTempo,reconcilePassages,setPracticeGoal,wholePracticeProgress,type PracticeChunk,type PracticeState} from './practice';
import {ManualTempoControls,manualTempoField} from './manual-tempo-control';
import {tempoRateEdit,speedNumber,speedEdit,adjustDuration,adjustPracticePercent as adjustPercent,adjustProgression} from './tempo-presentation';
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
export interface ManualPracticeViewOptions {
 context:ManualReadingContext;personal:PersonalState;
 /** Must build a joined window from the locally admitted source scene. */
 passage:(bars:readonly number[],notation:ReadingNotation)=>string;
 save:(record:ManualPracticeRecord,view:ReturnType<ManualReadingContext['viewRecord']>)=>Promise<void>;
 rotation?:()=>Rotation;doneKey?:()=>string;settingsKey?:()=>string;freeViewKey?:()=>string;
 navigationKeys?:()=>{previous:string;next:string};audioOutput?:()=>string;
 createClock?:()=>ManualClock;back:()=>void;settings:()=>void;changed:(progress:number,whole:boolean)=>void;
}
/** Musical manual practice owns its loop clock and all visible ink. The player
 * chooses window turns; MIDI never accepts notes, retires ink or creates bests. */
export class ManualPracticeView {
 readonly assessment='manual' as const;readonly plan;readonly state;private browser:PracticeBrowser;
 private mounted=new AbortController();private transport?:ManualPracticeTransport;private overview=true;private disposed=false;private raf=0;
 private surface?:HTMLElement;private settingsDialog?:HTMLDialogElement;private saves=Promise.resolve();private saveError?:string;private renderError?:string;
 private manual:ManualTempoControls;private frames=new Map<string,string>();private rendered='';private cueLabel='';private lastWorking=0;
 constructor(readonly app:HTMLElement,readonly options:ManualPracticeViewOptions){
  this.plan=options.context.plan;this.state=options.context.state;this.browser=options.context.browser;
  this.manual=new ManualTempoControls({accepts:el=>!this.disposed&&(this.app.contains(el)||!!this.settingsDialog?.contains(el)),
   adjust:(key,direction,repeated,elapsed)=>this.adjust(key,direction,repeated,elapsed),
   edit:{commit:(_key,field)=>this.setting(field),cancel:()=>this.refreshFields(),adjust:(key,field,direction,elapsed)=>this.adjustDraft(key,field,direction,elapsed)}});
 }
 get session(){return this.options.context.session;}
 get modalOpen(){return !!this.settingsDialog;}
 get canTurnPage(){return !this.disposed&&!this.overview&&!this.settingsDialog&&!!this.session;}
 get canMarkDone(){return !this.disposed&&!this.overview&&!this.settingsDialog&&!!this.session?.canDone;}
 get bindingContext(){const active=!this.disposed&&!this.overview&&!!this.session;return {active,measureNavigation:active&&(this.session?.windows.windows.length??0)>1};}
 async mount(context?:PracticeViewContext){
  if(this.disposed)return;
  if(context){this.browser.includeManual=context.includeManual;this.browser.select(this.state,context.parent??context.selected);if(context.component)this.browser.select(this.state,context.component,true);}
  this.app.innerHTML='<section class="surface practice-surface manual-practice-surface"><header class="practice-header"></header><div class="practice-overview"></div><main class="practice-stage" tabindex="-1"><div class="practice-score"></div><div class="practice-countin" hidden aria-live="off"><strong></strong></div></main><div class="practice-status" role="status"></div><nav class="practice-controls"></nav></section>';
  const surface=this.app.querySelector<HTMLElement>('.practice-surface')!;this.surface=surface;
  surface.addEventListener('click',event=>{const control=(event.target as HTMLElement).closest<HTMLElement>('[data-practice]');if(control)void this.action(control.dataset.practice!);},{signal:this.mounted.signal});
  surface.addEventListener('change',event=>{const field=event.target as HTMLInputElement;if(field.dataset.practiceDisplay==='manual'){this.browser.setIncludeManual(field.checked);this.paintBrowser(false);this.app.querySelector<HTMLInputElement>('[data-practice-display="manual"]')?.focus();}else this.setting(field);},{signal:this.mounted.signal});
  surface.addEventListener('keydown',event=>{const field=event.target as HTMLInputElement;if(field.dataset.practiceDisplay==='manual'&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&['Enter','Escape'].includes(actionCode(event))){event.preventDefault();if(!event.repeat){if(actionCode(event)==='Enter')field.click();else void this.action('back');}}},{signal:this.mounted.signal});
  if(context?.passage){const chunk=reconcilePassages(this.plan,this.state).all.get(context.passage);if(chunk){this.selectPassage(chunk,false);if(context.window)this.session!.windows.showBar(context.window[0]);this.options.context.syncWindowAnchor();}}
  window.addEventListener('resize',this.resized);this.paint();this.refit();this.frame();
 }
 contextSnapshot():PracticeViewContext {const bars=this.session?.windows.bars??[];return {partition:this.plan.partition,composites:structuredClone(this.state.composites??{}),preferences:practicePreferences(this.state),selected:this.browser.selected,parent:this.browser.parent,component:this.browser.component,includeManual:this.browser.includeManual,...(!this.overview&&this.session?{passage:this.session.chunk.id}:{}),...(bars.length?{window:[bars[0],bars.at(-1)!] as [number,number]}:{})};}
 private status(message=''){if(this.disposed||!this.surface||!this.app.contains(this.surface))return;const node=this.surface.querySelector('.practice-status');if(node)node.textContent=this.saveError??this.renderError??message;}
 private save(){if(this.session)this.state.workingByPattern[this.session.chunk.pattern]=this.state.working;const record=this.options.context.record(),view=this.options.context.viewRecord();this.saves=this.saves.then(()=>this.options.save(record,view)).then(()=>{this.saveError=undefined;if(this.disposed)return;this.options.changed(displayedPracticeTotal(this.plan,record.state),wholePracticeProgress(this.plan,record.state)>=1);}).catch(error=>{this.saveError=`Progress has not saved: ${(error as Error).message}`;this.pause();this.status();});return this.saves;}
 async flush(){this.pause();await this.save();await this.saves;if(this.saveError)throw Error(this.saveError);}
 private passage(bars:readonly number[]){const notation=this.options.context.view.notation,key=`${notation}:${bars.join(',')}`;let source=this.frames.get(key);if(source!==undefined){this.frames.delete(key);this.frames.set(key,source);}else{source=this.options.passage(bars,notation);this.frames.set(key,source);if(this.frames.size>16)this.frames.delete(this.frames.keys().next().value!);}
  const document=new DOMParser().parseFromString(source,'image/svg+xml'),svg=document.documentElement as unknown as SVGSVGElement;
  if(svg.localName!=='svg'||document.querySelector('parsererror'))throw Error('The admitted passage did not produce complete SVG.');svg.classList.add('practice-passage');return document;
 }
 private paintBrowser(focus=true){this.browser.render(this.app.querySelector<HTMLElement>('.practice-overview')!,this.state,bars=>document.importNode(this.passage(bars).documentElement,true) as unknown as SVGSVGElement,focus);}
 private paintScore(){const session=this.session;if(!session||this.overview)return;const bars=session.windows.bars,key=`${this.options.context.view.notation}:${bars.join(',')}`,root=this.app.querySelector<HTMLElement>('.practice-score')!;
  try{if(key!==this.rendered){const doc=this.passage(bars);root.replaceChildren(document.importNode(doc.documentElement,true));this.rendered=key;}const svg=root.querySelector<SVGSVGElement>(':scope > svg')!,stage=this.app.querySelector<HTMLElement>('.practice-stage')!,box=svg.viewBox.baseVal;
   if(!(box.width>0&&box.height>0))throw Error('The admitted passage has no bounded frame.');const style=getComputedStyle(root),width=Math.max(1,root.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)),height=Math.max(1,stage.clientHeight-24),scale=Math.min(width/box.width,height/box.height);svg.style.width=`${box.width*scale}px`;svg.style.height=`${box.height*scale}px`;this.renderError=undefined;
  }catch(error){this.renderError=(error as Error).message;this.transport?.pause();root.replaceChildren();this.rendered='';this.status();}
 }
 private selectPassage(chunk:PracticeChunk,resetWorking=true){this.transport?.close();this.transport=undefined;this.browser.select(this.state,chunk.id);if(resetWorking)this.state.working=passageStartTempo(this.plan,this.state,chunk);this.options.context.selectPassage(chunk);this.overview=false;this.rendered='';this.renderError=undefined;}
 private paint(){if(this.disposed)return;const p=this.options.context.package,s=this.session,root=this.app.querySelector('.practice-header')!;
  root.innerHTML=`<h1>${escape(p.manifest.metadata.title)}</h1><div class="practice-head-actions"><small>Manual practice · ${this.options.context.view.notation==='tab'?'TAB':'ISO'}</small>${s&&!this.overview?`<small data-practice-range>Measures ${escape(practiceMeasureRange(s.chunk.id))}</small><small data-practice-total>Total progress · ${practicePercent(displayedPracticeTotal(this.plan,this.state,this.browser.includeManual))}%</small>`:''}</div>`;
  this.app.querySelector<HTMLElement>('.practice-overview')!.hidden=!this.overview;this.app.querySelector<HTMLElement>('.practice-stage')!.hidden=this.overview;this.app.dataset.practicePhase=this.overview?'overview':s?.phase??'ready';
  this.paintControls();if(this.overview)this.paintBrowser(!this.settingsDialog);else if(!this.renderError)this.paintScore();this.paintCue();this.status(!this.overview&&s?.phase==='paused'?'Free view'+` · Measures ${practiceMeasureRange(`${s.windows.bars[0]+1}-${s.windows.bars.at(-1)!+1}`)}`:'');
 }
 private speedInput(key:'working'|'start'|'connectionStart'|'step',value:number,label:string){return manualTempoField(key,`<input type="text" inputmode="decimal" data-practice-setting="${key}" data-absolute="${value}" data-presented="${speedNumber(value,this.state.target)}" aria-label="${label}" value="${speedNumber(value,this.state.target)}">`,key==='step'?'increase percent of target':`${key==='start'?'starting':key==='connectionStart'?'connection':'working'} speed`,'%');}
 private settingsControl(){const hint=this.options.settingsKey?.()??'O';return `<button data-practice="settings">Options${hint?` <kbd>${escape(hint)}</kbd>`:''}</button>`;}
 private paintControls(){const root=this.app.querySelector<HTMLElement>('.practice-controls')!,active=document.activeElement as HTMLElement,hadFocus=root.contains(active),action=active?.dataset.practice,setting=active?.dataset.practiceSetting,s=this.session;
  root.classList.toggle('practice-controls-active',!this.overview);const retry=this.saveError?'<button data-practice="retry-save">Retry saving progress</button>':'';
  if(this.overview)root.innerHTML=`${retry}${navigationHint()}${this.settingsControl()}<button data-practice="back">Back <kbd>Esc</kbd></button>`;
  else{const target=s?.doneTarget(),marked=target&&hasDone(this.state,target),keys=this.options.navigationKeys?.()??{previous:'←',next:'→'},navigation=this.bindingContext.measureNavigation?`<span class="options-nav-hint"><span>${escape(keys.previous)} Previous measures</span><span>${escape(keys.next)} Next measures</span></span>`:'',freeKey=this.options.freeViewKey?.()??'V';
   root.innerHTML=`<div class="practice-primary-controls"><button class="practice-ready" data-practice="ready">${s?.phase==='ready'?'Ready':'Resume'} <kbd>Space</kbd></button><button data-practice="done" class="practice-done" aria-label="${marked?'Withdraw Done':'Done'}" aria-pressed="${!!marked}" ${s?.canDone?'':'disabled'}>${marked?'✓ ':''}Done <kbd>${escape(this.options.doneKey?.()??'Enter')}</kbd></button><label>Working speed ${this.speedInput('working',this.state.working,'Working speed percent')}</label></div><div class="practice-secondary-controls">${retry}<button data-practice="pause">Free view${freeKey?` <kbd>${escape(freeKey)}</kbd>`:''}</button><label><input type="checkbox" data-practice-setting="keepTempo" ${this.state.keepTempo?'checked':''}> Lock current speed <kbd>K</kbd></label>${navigation}${this.settingsControl()}<button data-practice="overview">Back <kbd>Esc</kbd></button></div>`;
  }
  if(!hadFocus)return;if(action)root.querySelector<HTMLElement>(`[data-practice="${CSS.escape(action)}"]`)?.focus({preventScroll:true});else if(setting)root.querySelector<HTMLElement>(`[data-practice-setting="${CSS.escape(setting)}"]`)?.focus({preventScroll:true});
 }
 private paintCue(){const root=this.app.querySelector<HTMLElement>('.practice-countin');if(!root)return;const s=this.session,clock=this.transport?.clock,future=this.transport?.futureCount,now=clock?.now(),grid=future?.grid??s?.pulseGrid,rate=future?.nextBpm??s?.bpm,origin=future?.boundaryMs??(s&&grid&&rate?s.startMs-practiceTiming(rate,grid).countInMs:undefined),visible=!this.overview&&now!==undefined&&grid&&rate&&origin!==undefined&&(s?.phase==='countin'||!!future)&&now>=origin;
  root.hidden=!visible;if(!visible){this.cueLabel='';return;}const label=countBeatAt(now!-origin!,rate!,grid!),number=root.querySelector<HTMLElement>('strong')!;if(this.cueLabel!==label){number.textContent=label;this.cueLabel=label;}const timing=practiceTiming(rate!,grid!);number.dataset.accent=String((grid!.countStartPhasePulses!+Math.floor((now!-origin!)/timing.eighthMs))%grid!.countBarPulses!<grid!.countBeatPulses!);
 }
 private frame=()=>{if(this.disposed)return;if(this.transport&&this.session&&['countin','trial','complete'].includes(this.session.phase)){this.transport.update();this.paintCue();}this.raf=requestAnimationFrame(this.frame);};
 private replaceTransport(){this.transport?.close();const clock:ManualClock=this.options.createClock?.()??new PracticeClock('__TAURI_INTERNALS__' in window,this.options.audioOutput?.()??'',message=>{if(this.disposed||this.transport?.clock!==clock)return;this.pause();this.status(message);});
  this.transport=new ManualPracticeTransport(this.session!,clock,()=>{if(this.disposed)return;this.options.context.syncWindowAnchor();const working=this.state.working;this.paint();if(this.lastWorking!==working){this.lastWorking=working;void this.save();}},message=>this.status(message));}
 async action(action:string){if(this.disposed)return;try{
  if(action.startsWith('select:')||action.startsWith('component:')){this.browser.select(this.state,action.slice(action.indexOf(':')+1),action.startsWith('component:'));this.paintBrowser(true);return;}
  if(action.startsWith('passage:')){const chunk=reconcilePassages(this.plan,this.state).all.get(action.slice(8));if(chunk){this.selectPassage(chunk);this.paint();this.app.querySelector<HTMLElement>('.practice-stage')!.focus();}return;}
  if(action==='ready'){if(!this.session||this.saveError||this.renderError)return;this.manual.cancelEdit();if(!this.transport)this.replaceTransport();if(['countin','trial','complete'].includes(this.session.phase))this.transport!.pause();await this.transport!.start();return;}
  if(action==='pause'){this.pause();return;}if(action==='overview'){this.pause();this.overview=true;this.paint();return;}
  if(action==='free-view'){const chunk=this.browser.current(this.state);if(this.overview&&chunk)this.selectPassage(chunk);this.pause();this.paint();this.app.querySelector<HTMLElement>('.practice-stage')?.focus();return;}
  if(action==='back'){await this.flush();this.close();this.options.back();return;}
  if(action==='settings'){this.pause();this.options.settings();return;}
  if(action==='next'||action==='previous'){if(this.canTurnPage&&this.options.context.turn(action==='next'?1:-1)){this.paint();void this.save();}return;}
  if(action==='done'){const result=this.session?.toggleDone();if(result){this.transport?.prepare();await this.save();this.paint();}return;}
  if(action==='retry-save'){await this.save();this.paint();return;}
 }catch(error){this.pause();this.status((error as Error).message);}}
 key(code:string,repeated=false){if(this.settingsDialog||this.disposed)return false;if(this.overview){if(repeated&&!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(code))return false;const result=this.browser.key(code,this.state);if(result==='practice'&&document.activeElement?.closest('.practice-overview')){const chunk=this.browser.current(this.state);if(chunk){this.selectPassage(chunk);this.paint();this.app.querySelector<HTMLElement>('.practice-stage')!.focus();}return true;}if(result==='handled'){this.paintBrowser(true);return true;}}
  else{if(code==='ArrowUp'||code==='ArrowDown'){if(!repeated)this.manual.begin(code,(again,elapsed)=>this.adjust('working',code==='ArrowUp'?1:-1,again,elapsed));return true;}if(['ArrowLeft','ArrowRight'].includes(code))return true;if(repeated)return ['Space','KeyK','KeyV','Enter'].includes(code);if(code==='Space'){void this.action('ready');return true;}if(code==='KeyK'){this.state.keepTempo=!this.state.keepTempo;this.transport?.prepare();void this.save();this.paintControls();return true;}if(code==='KeyV'&&(this.options.freeViewKey?.()??'V')){this.pause();return true;}}
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
 mountOptions(dialog:HTMLDialogElement,_close:()=>void){this.settingsDialog=dialog;const section=dialog.querySelector<HTMLElement>('[data-practice-options]')!,abort=new AbortController();section.addEventListener('change',event=>this.setting(event.target as HTMLInputElement),{signal:abort.signal});section.querySelector('[data-use-reference]')!.addEventListener('click',()=>{this.applySetting(setPracticeGoal(this.state,this.plan));this.refreshFields();},{signal:abort.signal});return ()=>{this.manual.cancelEdit();abort.abort();if(this.settingsDialog===dialog)this.settingsDialog=undefined;if(!this.disposed)this.paint();};}
 private refreshFields(){for(const root of [this.app,this.settingsDialog].filter((root):root is HTMLElement=>!!root)){for(const field of root.querySelectorAll<HTMLInputElement>('[data-practice-setting]')){const key=field.dataset.practiceSetting as 'working'|'start'|'connectionStart'|'step'|'target'|'countInBars'|'resumeCooldownSeconds';if(!['working','start','connectionStart','step','target','countInBars','resumeCooldownSeconds'].includes(key))continue;const value=this.state[key]??(key==='connectionStart'?this.state.target*.5:key==='countInBars'?2:3),text=integerPracticeSetting(key)?String(value):key==='target'?tempoRateNumber(value):speedNumber(value,this.state.target);field.value=text;field.dataset.absolute=String(value);field.dataset.presented=text;}for(const node of root.querySelectorAll<HTMLElement>('[data-personal-goal-only]'))node.hidden=!this.state.personalGoal;}}
 private applySetting(candidate:PracticeState,key='target'){
  const next=readManualPractice(manualPracticeRecord(this.plan,candidate),this.plan);if(JSON.stringify(next)===JSON.stringify(this.state)){this.refreshFields();return;}
  const active=this.transport?.startingRate!==undefined||!!this.session&&['countin','trial'].includes(this.session.phase);
  if(key!=='target'&&(key!=='working'||active)){
   if(key==='working')this.session?.queueWorking(next.working);
   Object.assign(this.state,next);this.transport?.prepare();void this.save();this.refreshFields();return;
  }
  const chunk=this.session?.chunk,bar=this.session?.windows.bars[0];this.transport?.close();this.transport=undefined;if(!next.personalGoal)delete this.state.personalGoal;Object.assign(this.state,next);if(chunk){this.options.context.selectPassage(chunk);this.session!.pause();if(bar!==undefined)this.session!.windows.showBar(bar);this.options.context.syncWindowAnchor();}this.rendered='';void this.save();this.paint();this.refreshFields();
 }
 private setting(field:HTMLInputElement){const key=field.dataset.practiceSetting;if(!key)return true;try{const candidate=structuredClone(this.state),draft=field.value===field.dataset.manualDraftText?Number(field.dataset.manualDraft):undefined;if(key==='target')this.applySetting(setPracticeGoal(candidate,this.plan,draft??tempoRateEdit(field.value,Number(field.dataset.absolute))));else if(['working','start','connectionStart','step'].includes(key)){candidate[key as 'working'|'start'|'connectionStart'|'step']=draft??speedEdit(field.value,Number(field.dataset.absolute),candidate.target,field.dataset.presented);this.applySetting(candidate,key);}else if(integerPracticeSetting(key)){Object.assign(this.state,readManualPractice(manualPracticeRecord(this.plan,{...candidate,[key]:draft??Number(field.value)}),this.plan));this.transport?.prepare();void this.save();this.refreshFields();}else if(key==='keepTempo'){this.state.keepTempo=field.checked;this.transport?.prepare();void this.save();this.paintControls();}return true;}catch(error){this.status((error as Error).message);const notice=this.settingsDialog?.querySelector('[data-goal-error]');if(notice)notice.textContent=(error as Error).message;return false;}}
 private adjusted(key:string,value:number,direction:number,elapsed:number){return integerPracticeSetting(key)?adjustPracticeInteger(key,value,direction):key==='target'?adjustDuration(value,direction,elapsed):key==='step'?adjustProgression(value,this.state.target,direction,elapsed):adjustPercent(value,this.state.target,direction);}
 private adjust(key:string,direction:number,repeated:boolean,elapsed:number){const field=(this.settingsDialog??this.app).querySelector<HTMLInputElement>(`[data-practice-setting="${key}"]`);if(!field||this.disposed||this.saveError)return false;if(!repeated&&!this.setting(field))return false;const name=key as 'working'|'start'|'connectionStart'|'step'|'target'|'countInBars'|'resumeCooldownSeconds',next=this.adjusted(key,this.state[name]??(key==='connectionStart'?this.state.target*.5:key==='countInBars'?2:3),direction,elapsed);if(next===this.state[name])return false;if(key==='target')this.applySetting(setPracticeGoal(this.state,this.plan,next));else if(integerPracticeSetting(key)){Object.assign(this.state,readManualPractice(manualPracticeRecord(this.plan,{...this.state,[key]:next}),this.plan));this.transport?.prepare();void this.save();this.refreshFields();}else this.applySetting({...this.state,[key]:next},key);return true;}
 private adjustDraft(key:string,field:HTMLInputElement,direction:number,elapsed:number){try{const original=Number(field.dataset.absolute),value=field.value===field.dataset.manualDraftText?Number(field.dataset.manualDraft):integerPracticeSetting(key)?Number(field.value):key==='target'?tempoRateEdit(field.value,original):speedEdit(field.value,original,this.state.target,field.dataset.presented),next=this.adjusted(key,value,direction,elapsed);if(key==='target')setPracticeGoal(this.state,this.plan,next);else readManualPractice(manualPracticeRecord(this.plan,{...this.state,[key]:next}),this.plan);if(next===value)return false;field.value=integerPracticeSetting(key)?String(next):key==='target'?tempoRateNumber(next):speedNumber(next,this.state.target);field.dataset.manualDraft=String(next);field.dataset.manualDraftText=field.value;return true;}catch(error){this.status((error as Error).message);return false;}}
}
