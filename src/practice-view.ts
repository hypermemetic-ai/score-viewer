import {workHeadingMarkup} from './score-catalog';
import {arrangeBottomNavigation} from './application-navigation';
import {practiceOptionsMarkup,integerPracticeSetting,adjustPracticeInteger} from './practice-options-markup';
import {cropMeasure,blankMeasureCrop,composePassage,passageTrack,fitPassageRelations,fitPassageFrame,type Crop,type PassageTrack} from './practice-passage';
import {projectRelations,type ProjectedRelation} from './practice-relations';
import {restoreRefill,reviewRefill,PracticeRefill,type RefillLayout} from './practice-refill';
import {admitRefillPassage,heldTieCues} from './practice-refill-passage';
export {cropMeasure} from './practice-passage';
import {PracticeSlots} from './practice-window';
import {PracticeDone,hasDone,attainedRate} from './practice-attainment';
import {tightenSourceCrop} from './practice-crop-fit';
import {fitSurface,fitDialog} from './orientation';
import type {Rotation} from './state';
import{isMusicalSustain,musicalControllerTime,type MidiStream}from'./midi-sustain';
import {practiceOutput} from './device-options';
import {requireReferencePerformanceTempo,type ReferencePerformanceTempo} from '../vendor/iso-notation/src/model/reference-performance-tempo';
import {tempoRateNumber} from './metronome-mark';
import {tempoRateEdit,speedNumber,speedEdit,adjustDuration,adjustPracticePercent as adjustPercent,adjustProgression,manualSpeedNumber,snapPracticeSpeed,snapPracticeStep} from './tempo-presentation';
import type {ScorePackage,Seat} from './package';
import {fingerFor,practiceStorageName,legacyPracticeStorageName,type PersonalState} from './state';
import {practicePreferences,admitPracticeContext,type AdmittedPracticeContext,type PracticeViewContext} from './practice-context';
import {actionCode,readingActionLabel,type FingerPresentation} from './input';
import {annotationPositions,paintFinger} from './fingering-presentation';
import {host,practiceAudio,readJson,writeJson,type AudioOutputs} from './host';
import type {MidiNote,MidiCC} from './midi';
import {planPractice,requirePracticeHands,practicePartition,readPractice,setPracticeGoal,passed,PracticeSession,ReadingSession,isQuietStray,practicePercent,passageStartTempo,nextPracticePassage,reconcilePassages,type PracticeChunk,type PracticePlan,type PracticeState} from './practice';
import {displayedPracticeAssessment} from './practice-display';
import {PracticeClock,type PreparedPracticeRepeat} from './practice-clock';
import {PracticeBrowser,practiceChunkRange,playerTempoNote} from './practice-browser';
import {SectionFingering,percent} from './section-fingering';
import {navigationHint} from './navigation-hint';
import {practiceTiming,countBeatAt} from './practice-timing';
import {PracticeContrastCycle} from './practice-contrast-cycle';
import {practiceClipPlan,practiceClipCompletionTick,practiceClipLabel,activePracticeClip} from './practice-clip';
import {renderPracticeClip} from './practice-clip-passage';
import {practiceClipChunk} from './practice';
import {scoreExcerptPulseGrid,scoreTickMs} from './score-clock';
import {capturePracticeAttempt} from './practice-attempt-grid';
import {planPracticeRepeat,type PracticeRepeatPlan} from './practice-repeat';
import {PracticeContacts} from './practice-contact';
import {PracticeDiagnostics} from './practice-diagnostics';
import {PracticePreview} from './practice-preview';
import {PracticePreviewCache} from './practice-preview-cache';
import {annotationInkPolicyFor,assertAnnotationInkPolicyReady} from './annotation-ink-policy';
import {ManualTempoControls,manualTempoField,practiceSpeedField,refreshPracticeSpeedDisplay,refreshPracticeSpeedDisplays} from './manual-tempo-control';
const ns='http://www.w3.org/2000/svg';
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
export type PracticePrimaryMode='reading'|'timed';
export type PracticeMode=PracticePrimaryMode|'free';
export interface PracticeViewOptions {workingEditKey?:()=>string;modeKeys?:()=>{reading:string;timed:string};rotation?:()=>Rotation;doneKey?:()=>string;settingsKey?:()=>string;freeViewKey?:()=>string;navigationKeys?:()=>{previous:string;next:string};playerTempo?:ReferencePerformanceTempo;package:ScorePackage;basePackage?:ScorePackage;personal:PersonalState;presentation?:()=>FingerPresentation;audioOutput?:()=>string|undefined;sustain?:()=>readonly MidiCC[];entryId:string;connected:()=>boolean;source:()=>string;connect:(source:string)=>Promise<void>;disconnect:()=>Promise<void>;back:()=>void;settings:()=>void;
 /** Save one finger through the score's own editor; absent, sections cannot be fingered here. */
 saveFinger?:(seat:Seat,finger:number)=>Promise<unknown>;
 /** Choose a note's hand, as L and R do in the score. */
 saveHand?:(seat:Seat,hand:'LH'|'RH')=>Promise<unknown>;
 /** Fingers alone: the whole piece is fingered, no section is practised, no
  * tempo is asked and no practice journal is written. Esc leaves to the score. */
 fingersOnly?:boolean}

/** Keep one settings Test click's status attached to its latest attempt. */
export function practiceAudioTestAction(native:()=>boolean,output:()=>string,status:(message:string)=>void){
 let generation=0,previous:PracticeClock|undefined;
 return async()=>{
  const attempt=++generation;previous?.close();let failed=false;
  const clock=new PracticeClock(native(),output(),message=>{if(attempt!==generation)return;failed=true;clock.close();status(message);});previous=clock;
  const unlock=clock.unlock();status('Starting test…');
  try{await unlock;if(attempt!==generation||failed)return;await clock.begin(180,90);if(attempt!==generation||failed)return;status('Click sent to the selected output. Confirm that you hear it.');setTimeout(()=>clock.close(),600);}
  catch(error){if(attempt!==generation||failed)return;clock.close();status((error as Error).message);}
 };
}
export class PracticeView {
 plan:PracticePlan;state!:PracticeState;session?:PracticeSession;
 private contrastExercise?:PracticeChunk;private contrastCycle=new PracticeContrastCycle();
 private slots?:PracticeSlots;private sourceCrops=new Map<number,Crop>();private doneClaims=new PracticeDone();private loopRate=0;private startingRate?:number;private completionRevision=0;private pendingCompletion?:{generation:number;session:PracticeSession;anchor:{previousStartMs:number;phraseEndMs:number;previousBpm:number}};private repeatAnchor?:{previousStartMs:number;phraseEndMs:number;previousBpm:number};
 private positions:ReturnType<typeof annotationPositions>;private sourceTrack?:PassageTrack;private relations:Crop['owned']=[];private heldPitches=new Set<number>();private heldStreams=new Map<number,MidiStream>();private contextCrops:Crop[]=[];
 private refill?:PracticeRefill;private refillMode=false;private manualWindow=false;private preparingStart=false;private refillGeometry?:{scale:number;top:number};private projected:ProjectedRelation[]=[];private cueKey='';private renderError?:string;private reviewAnchor?:{bar:number;x:number};private errorReview?:RefillLayout;
 private manual:ManualTempoControls;
 private preview:PracticePreview;private previewFrames=new PracticePreviewCache();private queuedWorking?:number;private resumeAfter=0;private resumeBlocked=false;private cooldownFeedback?:Animation;private diagnostics=new PracticeDiagnostics();private diagnosticWrites=Promise.resolve();
 mode:PracticeMode='reading';private previousMode:PracticePrimaryMode='reading';private reading?:ReadingSession;private readingPaused=true;private readingStarted=false;private feedback='';private startGeneration=0;private clock?:PracticeClock;private crops:Crop[]=[];private raf=0;private saved=Promise.resolve();private inspection=false;private overview=true;private fingering?:SectionFingering;private browser:PracticeBrowser;private repeatGap?:{extraBeats:number;totalGapBeats:number};private done=false;private disposed=false;private saveError?:string;private audioError?:string;private audioOutputs:AudioOutputs={supported:false,outputs:[]};private settingsDialog?:HTMLDialogElement;private lastNote='No notes received yet';private contacts=new PracticeContacts();
 private personalChoicesPending=false;
 holdForPersonalChoices(){this.personalChoicesPending=true;this.pause();this.status('Updating hand choices. Retry saving if the update could not finish.');}
 releasePersonalChoices(){this.personalChoicesPending=false;this.paint();}
 get modalOpen(){return !!this.settingsDialog;}
 private get basePackage(){return this.options.basePackage??this.options.package;}
 constructor(readonly app:HTMLElement,readonly options:PracticeViewOptions){this.positions=annotationPositions(options.package);requirePracticeHands(this.basePackage,options.personal);this.plan=planPractice(this.basePackage,'bounded-exercises-v1',options.personal,options.playerTempo);this.browser=new PracticeBrowser(this.plan);this.preview=new PracticePreview(this.plan);this.manual=new ManualTempoControls({accepts:el=>!this.disposed&&(this.app.contains(el)||!!this.settingsDialog?.contains(el)&&(el.matches('[data-practice-setting]')||!!el.querySelector('[data-practice-setting]'))),adjust:(key,direction,repeated,elapsed)=>this.adjustManual(key,direction,repeated,elapsed),edit:{cancel:()=>{this.refreshTempoFields(this.app);this.refreshSettings();this.status(this.session?.message??'');},commit:(_key,field)=>this.setting(field),adjust:(key,field,direction,elapsed)=>this.adjustManualDraft(key,field,direction,elapsed)}});}
 static async savedJournal(p:ScorePackage,entryId:string):Promise<unknown>{const raw=await readJson(practiceStorageName(entryId,p)),legacy=legacyPracticeStorageName(p);return raw??(legacy?await readJson(legacy):undefined);}
 static async prepareContext(p:ScorePackage,entryId:string,context?:PracticeViewContext,personal?:PersonalState,chosenTempo?:ReferencePerformanceTempo,fingersOnly?:boolean):Promise<AdmittedPracticeContext>{return admitPracticeContext(p,await PracticeView.savedJournal(p,entryId),context,personal,chosenTempo,fingersOnly||!!context?.fingersOnly);}
 async mount(context?:PracticeViewContext,admitted?:AdmittedPracticeContext){
  const prepared=admitted??await PracticeView.prepareContext(this.basePackage,this.options.entryId,context,this.options.personal,this.options.playerTempo,this.options.fingersOnly),saved=prepared.saved,current=admitPracticeContext(this.basePackage,prepared.state,context,this.options.personal,undefined,!!this.options.fingersOnly||!!context?.fingersOnly);this.plan=current.plan;this.browser=new PracticeBrowser(this.plan);this.preview=new PracticePreview(this.plan);this.state=structuredClone(current.state);const suggested=nextPracticePassage(this.plan,this.state,this.plan.chunks[0]);if(suggested)this.browser.suggest(this.state,suggested);
  if(context){this.browser.includeManual=context.includeManual;this.browser.select(this.state,context.parent??context.selected);if(context.component)this.browser.select(this.state,context.component,true);}
  try{this.diagnostics=new PracticeDiagnostics(await readJson('practice-error-log.json'));}catch{/* Optional private diagnostic history never gates practice. */}
  try{this.audioOutputs=await practiceAudio.outputs();if(this.audioOutputs.supported&&!this.state.audioOutput){this.state.audioOutput=this.audioOutputs.outputs.find(o=>/MOTU/i.test(o.name)&&/3\s*[–-]\s*4/.test(o.name))?.id??'';}}catch(error){this.audioError=(error as Error).message;}
  if(this.disposed)return;
  this.app.innerHTML='<section class="surface practice-surface practice-modes-surface"><header class="practice-header"></header><div class="practice-overview"></div><main class="practice-stage" tabindex="-1"><aside class="practice-held-context" hidden></aside><div class="practice-score"></div><small class="practice-join-counter" hidden></small><div class="practice-cooldown" hidden aria-live="off"><svg class="practice-cooldown-symbol" viewBox="0 0 60 72" aria-hidden="true"><path d="M14 29V18a16 16 0 0 1 32 0v11h3a5 5 0 0 1 5 5v31a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5V34a5 5 0 0 1 5-5Zm7 0h18V18a9 9 0 0 0-18 0Z"/><text x="30" y="50" text-anchor="middle" dominant-baseline="central" data-cooldown-count></text></svg></div><div class="practice-countin" hidden aria-live="off"><strong></strong><small data-repeat-gap></small></div></main><div class="section-fingering" tabindex="-1" hidden><div class="section-fingering-stage"></div><p class="section-fingering-status" role="status"></p></div><nav class="practice-controls"></nav></section>';
  this.app.querySelector('.practice-surface')!.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest<HTMLElement>('[data-practice]');if(b)void this.action(b.dataset.practice!);});
  this.app.querySelector('.practice-surface')!.addEventListener('change',e=>{const field=e.target as HTMLInputElement;if(field.dataset.practiceDisplay==='manual'){this.browser.setIncludeManual(field.checked);this.paintBrowser(false);this.app.querySelector<HTMLInputElement>('[data-practice-display="manual"]')?.focus();return;}this.settingChanged(field);});
  this.app.querySelector('.practice-surface')!.addEventListener('keydown',e=>{const event=e as KeyboardEvent,field=event.target as HTMLInputElement;if(field.dataset.practiceDisplay==='manual'&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&['Enter','Escape'].includes(actionCode(event))){event.preventDefault();if(!event.repeat){if(actionCode(event)==='Enter')field.click();else void this.action('back');}}});window.addEventListener('resize',this.refitCue);this.refit(false);this.paint();
  if((this.options.fingersOnly||context?.fingering)&&this.options.saveFinger)this.openFingering(context?.fingering?.contactId);
  else if(context?.passage){const chunk=reconcilePassages(this.plan,this.state).all.get(context.passage);if(chunk){this.selectPassage(chunk,false);this.pause();if(context.mode&&['reading','timed','free'].includes(context.mode)){this.mode=context.mode;this.previousMode=context.previousMode==='timed'?'timed':'reading';if(this.mode!=='free')this.previousMode=this.mode;}if(context.readingWindow!==undefined)this.reading?.selectWindow(context.readingWindow);if(this.mode==='reading')this.showReadingWindow();else if(context.window)this.slots?.showRange(...context.window);this.paint();}else this.status('The previous passage is unavailable in this edition. Choose a passage.');}
  // A newly set player tempo is remembered before any practice is earned.
  if(context&&!saved||prepared.rememberTempo)await this.save(false);
  this.frame();
 }
 contextSnapshot():PracticeViewContext {const bars=this.slots?.bars.filter((bar):bar is number=>bar!==undefined)??[];return {partition:this.plan.partition,composites:structuredClone(this.state.composites??{}),preferences:practicePreferences(this.state),selected:this.browser.selected,parent:this.browser.parent,component:this.browser.component,includeManual:this.browser.includeManual,mode:this.mode,previousMode:this.previousMode,readingWindow:this.reading?.window,...(this.options.fingersOnly?{fingersOnly:true as const}:{}),...(this.fingering?{fingering:{passage:'piece',contactId:this.fingering.cursorContact}}:{}),...(!this.overview&&this.session?{passage:this.session.chunk.id}:{}),...(bars.length?{window:[bars[0],bars.at(-1)!] as [number,number]}:{})};}
 async flush(){this.pause();await this.saved;if(this.saveError)throw Error(this.saveError);}
 private speedInput(key:'working'|'start'|'connectionStart'|'step',value:number,_min:number,_max:number,label:string){return manualTempoField(key,`<input type="text" inputmode="decimal" data-practice-setting="${key}" data-absolute="${value}" data-presented="${speedNumber(value,this.state.target)}" aria-label="${label}" value="${speedNumber(value,this.state.target)}">`,key==='step'?'increase percent of target':`${key==='start'?'starting':key==='connectionStart'?'connection':'working'} speed`,'%');}
 private refreshTempoFields(root:HTMLElement,activeKey?:string){for(const el of root.querySelectorAll<HTMLInputElement>('[data-practice-setting]')){const key=el.dataset.practiceSetting;if(!['working','start','connectionStart','step','target','countInBars','resumeCooldownSeconds'].includes(key!))continue;const value=this.state[key as 'working'|'start'|'connectionStart'|'step'|'target']??(key==='connectionStart'?this.state.target*.5:key==='countInBars'?2:3),text=integerPracticeSetting(key!)?String(value):key==='target'?tempoRateNumber(value):activeKey===key&&key!=='step'?manualSpeedNumber(value,this.state.target):speedNumber(value,this.state.target),from=el.selectionStart,to=el.selectionEnd;if(el.value!==text){el.value=text;if(document.activeElement===el&&from!==null&&to!==null)el.setSelectionRange(Math.min(from,text.length),Math.min(to,text.length));}el.dataset.absolute=String(value);el.dataset.presented=text;refreshPracticeSpeedDisplay(el);}}
 private refreshSettings(activeKey?:string){const d=this.settingsDialog;if(!d)return;const notice=d.querySelector('[data-goal-error]');if(notice)notice.textContent='';this.refreshTempoFields(d,activeKey);for(const el of d.querySelectorAll<HTMLElement>('[data-personal-goal-only]'))el.hidden=!this.state.personalGoal;}
 private applySetting(next:PracticeState,key:string,manual=false){
  if(!next.personalGoal)delete this.state.personalGoal;Object.assign(this.state,next);
  const active=this.startingRate!==undefined||!!this.session&&(['countin','trial'].includes(this.session.phase)||this.repeatCompletion?.session===this.session&&this.repeatCompletion.generation===this.startGeneration||!!this.startedRepeat());
  if(key==='working'&&active){this.queuedWorking=this.state.working;this.doneClaims.cancelIncrease();this.prepareRepeat();}
  else if(key==='target'||key==='working'){this.contrastCycle?.cancel();this.queuedWorking=undefined;this.loopRate=this.state.working;this.doneClaims.cancelIncrease();this.contacts.clear();this.session?.pause();this.stopClock();this.clock?.close();this.clock=undefined;}
  void this.save(key!=='target');this.refreshTempoFields(this.app,manual?key:undefined);this.refreshSettings(manual?key:undefined);
  if(this.overview)this.paintBrowser();else if(key==='target'||key==='working'&&!active){this.paintVisibility();this.paintProgress();const ready=this.app.querySelector<HTMLElement>('.practice-ready');if(ready&&this.mode==='timed')ready.innerHTML=`${this.session?.startMs?'Resume':'Start'} <kbd>Space</kbd>`;}
  else if(key==='keepTempo')this.paintControls();
 }

 private settingChanged(field:HTMLInputElement){return this.manual.ownsDraft(field)?false:this.setting(field);}
 private setting(el:HTMLInputElement){if(!el.dataset.practiceSetting)return true;const key=el.dataset.practiceSetting as keyof PracticeState,draft=el.value===el.dataset.manualDraftText?Number(el.dataset.manualDraft):undefined;let candidate=structuredClone(this.state);try{if(key==='target'){const original=Number(el.dataset.absolute),bpm=draft??tempoRateEdit(el.value,original);if(bpm===original){this.refreshSettings();return true;}candidate=setPracticeGoal(candidate,this.plan,bpm);}else if(key==='working'||key==='start'||key==='connectionStart'||key==='step'){
  const original=Number(el.dataset.absolute),value=draft??speedEdit(el.value,original,this.state.target,el.dataset.presented);candidate[key]=value;
  // Validate before snapping so an invalid typed rate cannot be clamped into
  // admission. A changed field owns its rounding; untouched choices stay exact.
  candidate=readPractice(candidate,this.plan);
  if(value!==original)candidate[key]=key==='step'?snapPracticeStep(value,candidate.target):snapPracticeSpeed(value,candidate.target);
 }else (candidate as any)[key]=el.type==='checkbox'?el.checked:key==='audioOutput'?el.value:Number(el.value);const next=readPractice(candidate,this.plan);if(JSON.stringify(next)===JSON.stringify(this.state)){this.refreshSettings();return true;}this.applySetting(next,key);return true;}catch(error){this.cancelTempoHold();this.status((error as Error).message);const notice=this.settingsDialog?.querySelector('[data-goal-error]');if(notice)notice.textContent=(error as Error).message;return false;}}
 private save(recordWorking=true){if(this.options.fingersOnly)return Promise.resolve(true);reconcilePassages(this.plan,this.state);if(recordWorking&&this.session)this.state.workingByPattern[this.session.chunk.pattern]=this.state.working;const snapshot=structuredClone(this.state);let ok=false;this.saved=this.saved.then(()=>writeJson(practiceStorageName(this.options.entryId,this.basePackage),snapshot)).then(()=>{ok=true;this.saveError=undefined;}).catch(error=>{this.cancelTempoHold();this.contacts.clear();this.saveError=`Progress has not saved: ${error.message}. Your achievement is kept here; retry saving before continuing.`;this.stopClock();if(this.session&&['countin','trial'].includes(this.session.phase))this.session.pause();this.paintVisibility();this.paintControls();this.status(this.saveError);});return this.saved.then(()=>ok);}
 private status(message:string){
  const important=this.saveError??this.audioError??(this.renderError??(/could not|cannot|unavailable|not saved|failed|different note|first note|held note|held through|earlier notes|carry|error|missed|Choose /i.test(message)?message:''));
  // The fingering stage has its own status line; practice messages reach it too.
  if(this.fingering&&message){const line=this.app.querySelector<HTMLElement>('.section-fingering-status');if(line)line.textContent=message;}
  this.feedback=important;const status=this.app.querySelector<HTMLElement>('.practice-status');if(status){status.textContent=this.feedbackText();status.title=important;status.setAttribute('aria-label',important);status.hidden=!important;}
 }
 private feedbackText(){return this.saveError?'Progress not saved. Retry saving.':this.renderError?'Passage unavailable. Inspect source.':this.audioError?'Audio unavailable. Check Options.':/held|carry/i.test(this.feedback)?'Hold earlier notes through the count-in.':this.feedback.length>100?this.feedback.slice(0,97)+'…':this.feedback;}
 private frame=()=>{if(this.disposed)return;const session=this.session;if(this.mode==='timed'&&session&&this.clock&&['countin','trial'].includes(session.phase)&&!this.expireRepeatCandidate()){const before=session.phase;session.update(this.clock.now());if(session.phase!==before){if(session.phase==='error')this.freezeError();else if(session.phase==='ready'){this.stopClock();void this.save();this.paintControls();}else if(session.phase==='complete')this.completeTimedTrial(session);}
   if(this.clock&&['countin','trial'].includes(session.phase)){this.prepareRepeat();this.status(session.phase==='countin'?'':session.message);if(!this.overview)this.paintVisibility();else this.paintCue();}
  }this.paintCooldown();const blocked=performance.now()<this.resumeAfter;if(blocked!==this.resumeBlocked){this.resumeBlocked=blocked;this.paintControls();}this.raf=requestAnimationFrame(this.frame);};
 private repeatPreparation?:{session:PracticeSession;generation:number;rate:number;plan:PracticeRepeatPlan;receipt?:PreparedPracticeRepeat;pending:boolean;settled?:Promise<PreparedPracticeRepeat|undefined>;deadlineTimer?:ReturnType<typeof setTimeout>};
 private repeatCompletion?:{session:PracticeSession;generation:number;timer:ReturnType<typeof setTimeout>};
 private repeatSavePending=false;
 private startedRepeat(){const p=this.repeatPreparation;return p&&p.session===this.session&&p.generation===this.startGeneration&&(p.pending||p.receipt)&&this.clock&&this.clock.now()>=p.plan.boundaryMs?p:undefined;}
 private expireRepeatCandidate(record=this.repeatPreparation){if(!record||record!==this.repeatPreparation||record.session!==this.session||record.generation!==this.startGeneration||!record.pending&&!record.receipt||!this.clock||this.clock.now()<(record.receipt?.startMs??record.plan.boundaryMs+record.plan.countInMs))return false;this.pause();void this.save();this.status('The next repeat could not start on time. Resume starts a fresh count-in.');return true;}
 private guardRepeatEntry(record:NonNullable<PracticeView['repeatPreparation']>){
  if(record.deadlineTimer!==undefined)clearTimeout(record.deadlineTimer);if(!record.pending&&!record.receipt||record!==this.repeatPreparation||record.generation!==this.startGeneration||record.session!==this.session||!this.clock)return;
  const entry=record.receipt?.startMs??record.plan.boundaryMs+record.plan.countInMs;
  record.deadlineTimer=setTimeout(()=>{record.deadlineTimer=undefined;if(!this.expireRepeatCandidate(record))this.guardRepeatEntry(record);},Math.max(1,entry-this.clock.now()));
 }
 private nextWorkingRate(rate:number){return rate===this.loopRate?rate:snapPracticeSpeed(rate,this.state.target);}
 private predictedRepeatRate(session:PracticeSession){
  if(this.saveError||session!==this.session||!this.clock||!['countin','trial'].includes(session.phase)||!this.carryPrepared())return;
  if(!session.measured)return this.queuedWorking??this.nextWorkingRate(this.doneClaims.peekNextRate(this.loopRate,this.state.keepTempo));
  // Prepare while only the terminal onset/chord is undecided. The candidate
  // carries no achievement: the old attempt continues grading until complete,
  // and an error cancels its exact cue even if its count has become audible.
  const events=session.events,terminal=events.reduce((tick,a)=>Math.max(tick,a.tick),-Infinity);
  if(events.some(a=>!session.matched.has(a.id)&&a.tick!==terminal))return;
  const projected=structuredClone(this.state);projected.working=this.loopRate;passed(session.chunk,projected);return this.queuedWorking??projected.working;
 }
 private prepareRepeat(){if(this.mode!=='timed'||this.contrastExercise)return;
  const session=this.session,clock=this.clock;if(!session||!clock)return;if(this.startedRepeat()){if(!this.carryPrepared()){this.pause();this.status(this.heldMessage());}return;}const rate=this.predictedRepeatRate(session),prior=this.repeatPreparation;
  if(rate===undefined){if(prior){if(prior.deadlineTimer!==undefined)clearTimeout(prior.deadlineTimer);this.repeatPreparation=undefined;void clock.cancelRepeat().catch(error=>{if(this.clock===clock&&!this.disposed){this.audioError=error.message;this.pause();this.status(this.audioError!);}});}return;}
  const anchor={previousStartMs:session.startMs,phraseEndMs:session.startMs+(session.completionTick-session.startTick)*session.tickMs,previousBpm:this.loopRate},plan=planPracticeRepeat({...anchor,nextBpm:rate,grid:session.sourcePulseGrid,previousGrid:session.pulseGrid,sourceBoundary:true});
  // The next count setting can change without changing the captured playing
  // tempo. Compare the admitted repeat grid, including a pickup's exit phase.
  if(prior?.session===session&&prior.generation===this.startGeneration&&prior.rate===rate&&JSON.stringify(prior.plan.grid)===JSON.stringify(plan.grid))return;
  if(prior?.deadlineTimer!==undefined)clearTimeout(prior.deadlineTimer);
  const record={session,generation:this.startGeneration,rate,plan,pending:true,receipt:undefined as PreparedPracticeRepeat|undefined,settled:undefined as Promise<PreparedPracticeRepeat|undefined>|undefined,deadlineTimer:undefined as ReturnType<typeof setTimeout>|undefined};this.repeatPreparation=record;
  const duration=(session.completionTick-session.chunk.start)*scoreTickMs(this.plan,rate)+plan.countInMs;
  record.settled=clock.armRepeat(rate,duration,plan,plan.grid??session.pulseGrid).then(receipt=>{record.pending=false;if(this.repeatPreparation===record&&clock===this.clock&&record.generation===this.startGeneration){record.receipt=receipt;this.guardRepeatEntry(record);}return receipt;}).catch(error=>{record.pending=false;if(this.repeatPreparation===record&&clock===this.clock&&record.generation===this.startGeneration){this.audioError=error.message;this.pause();this.status(this.audioError!);}return undefined;});this.guardRepeatEntry(record);
 }
 private completeTimedTrial(session:PracticeSession){if(this.mode!=='timed')return;if(this.contrastExercise){void this.completeContrast(session);return;}
  if(this.expireRepeatCandidate())return;
  const anchor={previousStartMs:session.startMs,phraseEndMs:session.startMs+(session.completionTick-session.startTick)*session.tickMs,previousBpm:this.loopRate};
  this.repeatAnchor=anchor;this.doneClaims.completed({passage:session.chunk.id,pattern:session.chunk.pattern,rate:this.loopRate});
  const requested=this.queuedWorking;this.queuedWorking=undefined;this.state.working=this.loopRate;const measured=session.measured&&!this.done;if(measured){passed(session.chunk,this.state);this.done=true;}else this.state.working=this.nextWorkingRate(this.doneClaims.nextRate(this.loopRate,this.state.keepTempo));if(requested!==undefined)this.state.working=requested;
  const prepared=this.repeatPreparation;
  if(prepared?.session===session&&prepared.generation===this.startGeneration&&prepared.pending&&(prepared.rate===this.state.working||this.startedRepeat()===prepared)&&this.carryPrepared()&&this.clock){
   // The complete cue may already be audible while its bridge acknowledgement is in flight.
   // Preserve it until its own score entry; never stop it and play a second partial count.
   const generation=this.startGeneration,clock=this.clock,deadline=prepared.plan.boundaryMs+prepared.plan.countInMs;
   this.repeatSavePending=true;const completionSave=this.save();
   const finish=async()=>{const pending=this.repeatCompletion;if(!pending||pending.session!==session||pending.generation!==generation||generation!==this.startGeneration||session!==this.session||clock!==this.clock)return;clearTimeout(pending.timer);this.repeatCompletion=undefined;
    if(!prepared.receipt||clock.now()>=deadline){try{await clock.cancelRepeat();}catch(error){if(generation===this.startGeneration){this.audioError=(error as Error).message;this.pause();this.status(this.audioError!);}return;}if(generation!==this.startGeneration)return;prepared.receipt=undefined;}
    this.finishCompletedTrial(session,completionSave);
   };
   this.repeatCompletion={session,generation,timer:setTimeout(()=>void finish(),Math.max(0,deadline-clock.now()))};if(clock.now()>=deadline)void finish();void prepared.settled?.then(()=>finish());this.paintControls();return;
  }
  this.finishCompletedTrial(session);
 }
 private finishCompletedTrial(session:PracticeSession,completionSave?:Promise<boolean>){
  const prepared=this.repeatPreparation;
  if(prepared?.session===session&&prepared.generation===this.startGeneration&&prepared.receipt&&(prepared.rate===this.state.working||this.startedRepeat()===prepared)&&this.carryPrepared()&&this.clock&&this.clock.now()<prepared.receipt.startMs){
   // The audible count has committed this attempt's BPM and grid. A late edit
   // remains desired state and applies after this captured attempt completes.
   if(prepared.rate!==this.state.working)this.queuedWorking=this.state.working;
   if(prepared.deadlineTimer!==undefined)clearTimeout(prepared.deadlineTimer);this.repeatPreparation=undefined;this.repeatSavePending=true;const generation=this.startGeneration;void (completionSave??this.save()).then(()=>{if(generation===this.startGeneration)this.repeatSavePending=false;});
   try{this.repeatGap=this.clock.adoptRepeat(prepared.receipt);this.loopRate=prepared.receipt.nextBpm;this.slots?.prime();this.refill?.prime();this.preview.clear();session.ready(prepared.receipt.countStartMs,this.heldPitches,!session.measured,{sustain:this.options.sustain?.(),contacts:this.heldStreams},prepared.plan?.grid??session.sourcePulseGrid,prepared.receipt.nextBpm);for(const a of session.carryIn??[])this.contacts.press(a);this.done=false;this.paint();}catch(error){this.audioError=(error as Error).message;this.pause();this.status(this.audioError!);}return;
  }
  this.pause();void (completionSave??this.save());this.status('The next repeat could not start on time. Resume starts a fresh count-in.');
 }
 private paintCue(){const cue=this.app.querySelector<HTMLElement>('.practice-countin');if(!cue)return;const s=this.session,now=this.clock?.now(),candidate=this.startedRepeat(),pending=candidate?.receipt&&now!<candidate.receipt.startMs?candidate:undefined,rate=pending?.rate??this.loopRate,grid=pending?.plan.grid??s?.pulseGrid;cue.hidden=this.overview||now===undefined||s?.phase!=='countin'&&!pending;if(!cue.hidden){const timing=practiceTiming(rate,grid),elapsed=now!-(pending?.receipt?.countStartMs??s!.startMs-timing.countInMs),number=cue.querySelector('strong')!,label=countBeatAt(elapsed,rate,grid!);if(number.textContent!==label)number.textContent=label;number.dataset.accent=String(elapsed>=0&&(grid!.countStartPhasePulses!+Math.floor(elapsed/timing.eighthMs))%grid!.countBarPulses!<grid!.countBeatPulses!);const gap=cue.querySelector('[data-repeat-gap]');if(gap){const bars=pending?0:Math.round((this.repeatGap?.extraBeats??0)*timing.goalBeatMs/timing.countBarMs);gap.textContent=bars?`Count-in delayed by ${bars} bar${bars===1?'':'s'}`:'';}}}


 refit(repaint=true){this.sourceTrack=undefined;this.refillGeometry=undefined;const surface=this.app.querySelector<HTMLElement>('.practice-surface');if(surface)fitSurface(surface,this.options.rotation?.()??0);if(this.settingsDialog)fitDialog(this.settingsDialog,this.options.rotation?.()??0);if(repaint&&this.fingering){this.fingering.refit();return;}if(repaint&&this.state){if(this.overview){const active=document.activeElement as HTMLElement,action=active?.closest('.practice-overview')?active.dataset.practice:undefined,display=active?.dataset.practiceDisplay;this.paintBrowser(false);if(action)this.app.querySelector<HTMLElement>(`[data-practice="${CSS.escape(action)}"]`)?.focus();else if(display)this.app.querySelector<HTMLElement>(`[data-practice-display="${CSS.escape(display)}"]`)?.focus();}else if(this.session)this.paintScore();}}
 private refitCue=()=>this.refit();
 private stopClock(preserveCompletion=false){this.startingRate=undefined;if(this.repeatCompletion)clearTimeout(this.repeatCompletion.timer);if(this.repeatPreparation?.deadlineTimer!==undefined)clearTimeout(this.repeatPreparation.deadlineTimer);this.repeatCompletion=undefined;this.repeatPreparation=undefined;this.repeatSavePending=false;if(!preserveCompletion)this.pendingCompletion=undefined;this.repeatGap=undefined;this.startGeneration++;void this.clock?.stop();}
 private paint(){this.paintCue();const s=this.session;this.app.querySelector('.practice-header')!.innerHTML=`<h1>${workHeadingMarkup(this.options.package.manifest.metadata)}</h1><div class="practice-head-actions">${this.fingering?`<small class="practice-mode" data-practice-range>Fingers</small><small data-fingering-progress>${this.fingeringProgressLabel()}</small>`:`<small data-piano-summary>${this.options.connected()?'Piano connected':'Piano disconnected'}</small>`}${s&&!this.overview&&!this.fingering?`<small data-practice-range>${this.contrastExercise?`Contrast · ${s.chunk.clipIndex===1?'B':'A'} · ${escape(practiceClipLabel(s.chunk))}`:`Measure${s.chunk.firstBar===s.chunk.lastBar?'':'s'} ${escape(practiceChunkRange(s.chunk))}${activePracticeClip(s.chunk,this.plan.barTicks)?' · excerpt':''}`} · <span data-section-progress>${practicePercent(this.browser.progress(s.chunk,this.state))}%</span></small><small data-practice-total>${this.totalLabel()}</small>${playerTempoNote(this.plan,this.state,'small')}`:''}</div>`;const list=this.app.querySelector<HTMLElement>('.practice-overview')!;list.hidden=!this.overview;this.app.querySelector<HTMLElement>('.practice-stage')!.hidden=this.overview||!!this.fingering;this.app.querySelector<HTMLElement>('.section-fingering')!.hidden=!this.fingering;if(this.fingering){this.paintControls();return;}
  this.paintControls();this.status(this.overview?'':this.mode==='reading'&&this.reading?.failure?this.readingMessage():this.mode==='timed'&&s?.carryIn.length&&['ready','paused'].includes(s.phase)?this.heldMessage():this.renderError??s?.message??'');
  // The complete footer/status must reserve its space before fitting notation.
  if(this.overview)this.paintBrowser();else if(s)this.paintScore();

 }
 private paintBrowser(focus=!this.settingsDialog){this.browser.render(this.app.querySelector<HTMLElement>('.practice-overview')!,this.state,(bars,clip)=>{const p=this.options.package,mount=this.app.querySelector<HTMLElement>('.practice-leaf-preview')!,policy=annotationInkPolicyFor(p);if(policy)assertAnnotationInkPolicyReady(policy);if(clip)return renderPracticeClip(p,this.plan,clip,mount).svg;return this.previewFrames.get(bars,mount,p.pages,()=>{const crops=bars.map(bar=>cropMeasure(p,this.plan,bar)),track=fitPassageFrame(p,this.plan,crops,fitPassageRelations(p,this.plan,crops,passageTrack(crops,mount,p,true),'compact',[bars]),'compact',[bars],mount);return composePassage(crops,track,'compact',bars,projectRelations(p,this.plan,crops,track,'compact',bars)).svg;});},focus);}
 /** The share of the piece's notes with a finger, and each hand's. */
 private fingeringProgressLabel(){const p=this.fingering?.progress();if(!p)return '';const hand=(h:{done:number;total:number},name:string)=>h.total?` · ${name} ${percent(h.done,h.total)}%`:'';return `${percent(p.done,p.total)}% fingered${hand(p.hands.RH,'RH')}${hand(p.hands.LH,'LH')}`;}
 private choosePassage(chunk:PracticeChunk){this.selectPassage(chunk);}
 /** Fingers has no sections: it opens on the whole piece, at the first note without a finger. */
 private openFingering(contactId?:string){
  const save=this.options.saveFinger;if(!save)return;
  this.contrastCycle?.cancel();this.session?.pause();this.stopClock();this.session=undefined;this.reading=undefined;this.contrastExercise=undefined;this.closeFingering();this.overview=false;
  const root=this.app.querySelector<HTMLElement>('.section-fingering')!,status=root.querySelector<HTMLElement>('.section-fingering-status')!;
  this.fingering=new SectionFingering(root.querySelector<HTMLElement>('.section-fingering-stage')!,{package:this.options.package,basePackage:this.basePackage,plan:this.plan,personal:()=>this.options.personal,presentation:()=>this.options.presentation?.()??'annotations',save,saveHand:this.options.saveHand,start:contactId,status:message=>{status.textContent=message;},progress:()=>{const label=this.app.querySelector('[data-fingering-progress]');if(label)label.textContent=this.fingeringProgressLabel();}});
  this.paint();this.fingering.render();root.focus();
 }
 private closeFingering(){this.fingering?.dispose();this.fingering=undefined;}
 /** While a section is being fingered, its keys come before the application's. */
 get ownsKeyboard(){return !this.disposed&&!!this.fingering&&!this.settingsDialog;}
 private selectPassage(chunk:PracticeChunk,resetWorking=true){this.contrastCycle?.cancel();this.contrastExercise=chunk.kind==='contrast'?chunk:undefined;this.stopClock();this.doneClaims.select();this.loopRate=0;this.repeatAnchor=undefined;this.sourceCrops.clear();this.sourceTrack=undefined;this.refill=undefined;this.refillGeometry=undefined;this.reviewAnchor=undefined;this.errorReview=undefined;this.manualWindow=false;this.cueKey='';this.renderError=undefined;this.slots=new PracticeSlots(this.plan,chunk);this.browser.suggest(this.state,chunk);if(resetWorking){this.queuedWorking=undefined;this.state.working=passageStartTempo(this.plan,this.state,chunk);}if(this.contrastExercise)this.mountContrastClip(0);else{this.session=new PracticeSession(this.plan,chunk,this.state,this.options.connected());const clip=activePracticeClip(chunk,this.plan.barTicks);this.reading=new ReadingSession(clip?practiceClipPlan(this.plan,clip):this.plan,chunk);}this.mode='reading';this.previousMode='reading';this.readingPaused=true;this.readingStarted=false;this.feedback='';this.showReadingWindow();this.done=false;this.overview=false;this.paint();this.app.querySelector<HTMLElement>('.practice-stage')!.focus();}
 private mountContrastClip(index:0|1){
  const chunk=practiceClipChunk(this.contrastExercise!,index),clip=chunk.clips![index],plan=practiceClipPlan(this.plan,clip),completion=practiceClipCompletionTick(this.plan,clip),grid=scoreExcerptPulseGrid(this.plan,this.plan.barTicks,clip.start,completion);
  this.slots=new PracticeSlots(plan,chunk);this.session=new PracticeSession(plan,chunk,this.state,this.contrastCycle.measured??this.options.connected(),grid,completion);this.reading=new ReadingSession(plan,chunk);this.preview=new PracticePreview(plan);this.sourceCrops.clear();this.refill=undefined;this.refillMode=false;this.renderError=undefined;this.contacts.clear();this.preview.clear();
 }
 private async startContrast(continuing=false){
  if(!this.contrastExercise||this.disposed||this.overview)return;
  this.stopClock();this.mode='timed';this.previousMode='timed';
  if(!continuing){this.contrastCycle.start(this.state.working,this.options.connected());this.mountContrastClip(0);}
  const token=this.contrastCycle.token;if(token===undefined)return;
  if(this.contrastCycle.measured!==this.options.connected()){this.pause();this.status('The piano connection changed. Resume starts both variants again.');return;}
  if(!this.carryPrepared()){this.contrastCycle.cancel();this.status(this.heldMessage());this.paint();return;}
  if(this.saveError&&!await this.save())return;if(this.disposed||this.overview||!this.session||token!==this.contrastCycle.token)return;
  this.paint();if(this.renderError){this.contrastCycle.cancel();return;}
  const output=practiceOutput(this.options.audioOutput,this.state.audioOutput);if(this.clock&&this.clock.output!==output){this.clock.close();this.clock=undefined;}
  if(!this.clock){const clock=new PracticeClock(this.audioOutputs.supported,output,message=>{if(this.disposed||this.clock!==clock)return;this.audioError=message;this.pause();this.status(message);});this.clock=clock;}
  const clock=this.clock,session=this.session!,generation=this.startGeneration,attempt=capturePracticeAttempt(this.contrastCycle.rate!,session.sourcePulseGrid),current=()=>!this.disposed&&!this.overview&&token===this.contrastCycle.token&&generation===this.startGeneration&&session===this.session&&clock===this.clock;
  this.startingRate=attempt.bpm;
  try{await clock.unlock();if(!current())return;await clock.stop();if(!current())return;
   const origin=await clock.begin(attempt.bpm,(session.completionTick-session.startTick)*scoreTickMs(this.plan,attempt.bpm)+attempt.countInMs,true,attempt.grid);
   if(!current())return;if(!this.carryPrepared()){this.pause();this.status(this.heldMessage());return;}
   this.loopRate=attempt.bpm;session.ready(origin,this.heldPitches,!session.measured,{sustain:this.options.sustain?.(),contacts:this.heldStreams},attempt.grid,attempt.bpm);for(const a of session.carryIn)this.contacts.press(a);this.done=false;this.paint();
  }catch(error){if(current()){this.pause();this.audioError=(error as Error).message;this.status(this.audioError);}}
  finally{if(current())this.startingRate=undefined;}
 }
 private async completeContrast(session:PracticeSession){
  if(session!==this.session||!this.contrastExercise)return;const owner=this.contrastExercise,result=this.contrastCycle.accept(session.chunk.clipIndex as 0|1,this.loopRate,session.measured);
  if(result==='stale'){this.pause();return;}
  if(result==='next'){this.mountContrastClip(1);await this.startContrast(true);return;}
  this.doneClaims.completed({passage:owner.id,pattern:owner.pattern,rate:this.loopRate});const requested=this.queuedWorking;this.queuedWorking=undefined;this.state.working=this.loopRate;
  if(session.measured)passed(owner,this.state);else this.state.working=this.nextWorkingRate(this.doneClaims.nextRate(this.loopRate,this.state.keepTempo));if(requested!==undefined)this.state.working=requested;
  this.stopClock();this.paintControls();const generation=this.startGeneration;if(!await this.save()||this.disposed||this.overview||generation!==this.startGeneration||session!==this.session||session.phase!=='complete')return;
  await this.startContrast();
 }
 private paintExcerptScore(stage:HTMLElement,area:HTMLElement){
  const session=this.session!,clip=activePracticeClip(session.chunk,this.plan.barTicks)!;const context=area.querySelector<HTMLElement>('.practice-held-context')!;context.replaceChildren();context.hidden=!session.carryIn.length;
  if(session.carryIn.length){const label=document.createElement('p');label.textContent=this.heldMessage();context.append(label);
   for(const attack of session.carryIn){const bar=attack.bar,next=this.plan.attacks.find(a=>a.bar===bar&&a.tick>attack.tick)?.tick??this.plan.barTicks[bar+1],origin={id:`${clip.id}-carry-${attack.id}`,start:attack.tick,end:next,firstBar:bar,lastBar:bar},wrap=document.createElement('div');wrap.className='practice-held-origin';wrap.dataset.sourceContextBar=String(bar+1);context.append(wrap);const passage=renderPracticeClip(this.options.package,this.plan,origin,wrap,new Set(attack.owners));wrap.append(passage.svg);}
  }
  try{const passage=renderPracticeClip(this.options.package,this.plan,clip,stage),scale=Math.min(Math.max(1,area.clientWidth-24)/passage.width,Math.max(1,area.clientHeight-24-(context.hidden?0:context.offsetHeight+10))/passage.height);
   stage.style.position='';stage.style.top='';stage.style.left='';stage.style.width='100%';stage.style.height=`${passage.height*scale}px`;passage.svg.style.width=`${passage.width*scale}px`;passage.svg.style.height=`${passage.height*scale}px`;stage.append(passage.svg);this.crops=passage.crops;this.relations=passage.relations;
   for(const crop of this.crops){const line=document.createElementNS(ns,'line');line.classList.add('practice-playhead');line.setAttribute('y1',String(crop.frame+Math.min(...crop.lanes)));line.setAttribute('y2',String(crop.frame+Math.max(...crop.lanes)));crop.svg.append(line);}this.paintVisibility();
  }catch(error){this.renderError=(error as Error).message;this.contrastCycle.cancel();this.session?.pause();this.stopClock();stage.textContent=this.renderError;this.status(this.renderError);}
 }
 private resetCarrySetup(){this.heldPitches?.clear();this.heldStreams?.clear();}
 private carryPrepared(){return !(this.session?.carryIn?.length)|| (this.options.connected()?this.session!.carryIn.every(a=>this.heldPitches?.has(a.midi)):true);}
 private heldMessage(){const bars=[...new Set(this.session?.carryIn.map(a=>a.bar+1)??[])];return `Keep the earlier notes from ${bars.length===1?'measure':'measures'} ${bars.join(', ')} held through the count-in.`;}
 private readingMessage(){return this.reading?.failure?'Start this position again from its first note.':'';}
 private showReadingWindow(){const reading=this.reading;if(!reading||!this.slots)return false;if(this.session?.chunk.joins?.length){const bars=[reading.range[0],reading.range[1],undefined,undefined];const changed=bars.some((bar,i)=>this.slots!.bars[i]!==bar);this.slots.bars=bars;return changed;}const events=reading.current.events;return events.length?this.slots.showRange(Math.min(...events.map(a=>a.bar)),Math.max(...events.map(a=>a.bar))):false;}
 private selectMode(mode:PracticeMode){if(!this.session||this.overview)return;this.pause();this.mode=mode;if(mode!=='free')this.previousMode=mode;if(mode==='reading'){this.session.failure=undefined;this.session.failureReason=undefined;this.session.errorMarked=false;this.session.pause();this.errorReview=undefined;this.showReadingWindow();}else if(mode==='timed')this.slots?.prime();else this.enterFreeView(this.previousMode==='reading'?this.reading?.range[0]:undefined);this.paint();}
 private readingActive(){return this.mode==='reading'&&this.options.connected()&&!this.readingPaused&&!this.overview;}
 private paintJoinCounter(){const counter=this.app.querySelector<HTMLElement>('.practice-join-counter'),reading=this.reading,visible=!this.overview&&this.mode==='reading'&&!!this.session?.chunk.joins?.length&&!!reading;if(!counter)return;counter.hidden=!visible;if(visible){counter.textContent=`${reading!.window+1}/${reading!.windows.length}`;const label=`Join ${reading!.window+1} of ${reading!.windows.length}, measures ${reading!.range[0]+1} to ${reading!.range[1]+1}`;counter.setAttribute('aria-label',label);counter.title=label;}}
 private arrangeNavigation(footer:HTMLElement){if(!footer.ownerDocument)return;footer.classList.remove('application-navigation');arrangeBottomNavigation(footer.querySelector<HTMLElement>('.practice-secondary-controls')??footer,footer.querySelector<HTMLButtonElement>('.practice-exit'),footer.querySelector<HTMLButtonElement>('[data-practice=settings]'));}
 private exitControl(){return `<button class="practice-exit" data-practice="${this.overview||this.options.fingersOnly?'back':'overview'}">Back <kbd>Esc</kbd></button>`;}
 private totalLabel(){const assessment=displayedPracticeAssessment(this.plan,this.state,this.browser.includeManual);return assessment.included?`Total progress · ${practicePercent(assessment.progress??0)}%`:'No exercises included';}
 private paintProgress(){const progress=this.app.querySelector('[data-section-progress]');if(progress&&this.session)progress.textContent=`${practicePercent(this.browser.progress(this.session.chunk,this.state))}%`;const total=this.app.querySelector('[data-practice-total]');if(total)total.textContent=this.totalLabel();const tempo=this.app.querySelector('[data-player-tempo]');if(tempo)tempo.outerHTML=playerTempoNote(this.plan,this.state,'small');}
 private paintControls(){this.paintProgress();this.paintJoinCounter();const s=this.session,nav=this.app.querySelector<HTMLElement>('.practice-controls')!,restoreDraft=this.manual.retainDraft(nav),active=document.activeElement as HTMLElement,hadFocus=nav.contains(active),action=active?.dataset.practice,setting=active?.dataset.practiceSetting;const restoreFocus=()=>{if(!hadFocus||!this.overview)return;const next=action?nav.querySelector<HTMLElement>(`[data-practice="${CSS.escape(action)}"]`):setting?nav.querySelector<HTMLElement>(`[data-practice-setting="${CSS.escape(setting)}"]`):null;(next??nav.querySelector<HTMLElement>('[data-practice=ready]'))?.focus({preventScroll:true});};nav.classList.toggle('practice-controls-active',!this.overview);nav.toggleAttribute('data-practice-shortcuts',!this.overview);
  const retry=this.saveError?'<button data-practice="retry-save">Retry saving progress</button>':'';
  if(this.fingering){nav.innerHTML=`${retry}${SectionFingering.hints()}${this.settingsControl()}${this.exitControl()}`;this.arrangeNavigation(nav);restoreFocus();return;}
  if(this.overview){nav.innerHTML=`${retry}${navigationHint()}${this.settingsControl()}${this.exitControl()}`;this.arrangeNavigation(nav);restoreDraft();restoreFocus();refreshPracticeSpeedDisplays(nav);return;}
  const keys=this.options.modeKeys?.()??{reading:'R',timed:'T'},hint=(key:string)=>key?` <kbd>${escape(key)}</kbd>`:'',primaryMode=this.mode==='free'?this.previousMode:this.mode,timed=this.mode==='timed',started=primaryMode==='timed'?!!s?.startMs:this.readingStarted;
  const ready=started?'Resume':'Start',disabled=performance.now()<this.resumeAfter;
  nav.innerHTML=`<div class="practice-primary-controls"><div class="practice-primary-extra"><span class="practice-status" role="status" ${this.feedback?'':'hidden'} title="${escape(this.feedback)}" aria-label="${escape(this.feedback)}">${escape(this.feedbackText())}</span></div><div class="practice-mode-controls"><button data-practice="reading" aria-pressed="${this.mode==='reading'}">Reading${hint(keys.reading)}</button><button data-practice="timed" aria-pressed="${this.mode==='timed'}">Timed${hint(keys.timed)}</button><button class="practice-ready" data-practice="ready" ${disabled?'aria-disabled="true"':''}>${ready} <kbd>Space</kbd></button><div class="practice-working-controls">${timed?`${this.doneControl()}<label>${practiceSpeedField(`<input type="text" inputmode="decimal" data-practice-setting="working" data-absolute="${this.state.working}" data-presented="${speedNumber(this.state.working,this.state.target)}" aria-label="Speed percent${this.options.workingEditKey?.()??'S'?`; ${(this.options.workingEditKey?.()??'S')} edits`:''}" value="${speedNumber(this.state.working,this.state.target)}">`,this.options.workingEditKey?.()??'S')}</label>`:''}</div></div></div><div class="practice-secondary-controls">${retry}<button data-practice="free-view" aria-pressed="${this.mode==='free'}">Free view${hint(this.options.freeViewKey?.()??'V')}</button>${timed?`<label><input type="checkbox" data-practice-setting="keepTempo" ${this.state.keepTempo?'checked':''}> Lock current speed <kbd>K</kbd></label>`:''}${this.measureNavigationHint()}${this.settingsControl()}${this.exitControl()}</div>`;this.arrangeNavigation(nav);for(const control of nav.querySelectorAll<HTMLElement>('button,input,select,textarea,summary,a[href]'))control.tabIndex=-1;restoreDraft();restoreFocus();refreshPracticeSpeedDisplays(nav);
 }
 get canAdjustWorking(){return !this.disposed&&!this.overview&&!this.settingsDialog&&this.mode==='timed'&&!!this.session;}
 editWorking(openerCode?:string){const field=this.app.querySelector<HTMLInputElement>('[data-practice-setting=working]');return !!this.canAdjustWorking&&!!field&&this.manual.editField(field,openerCode);}
 get canMarkDone(){return !this.disposed&&!this.overview&&!this.settingsDialog&&this.mode==='timed'&&!this.options.connected()&&!!this.session;}
 get canTurnPage(){return !this.preparingStart&&!this.overview&&!!this.session&&(this.mode==='free'||this.mode==='reading'&&(!this.readingActive()||!this.reading?.current.events.length)||this.mode==='timed'&&(!this.session.measured||['paused','error','ready'].includes(this.session.phase)));}
 get bindingContext(){const active=!this.disposed&&!this.overview&&!!this.session;return {active,modes:true,measureNavigation:active&&(this.mode==='reading'?!!this.session?.chunk.joins?.length:(this.slots?.windows.length??0)>1)};}
 turnPage(direction:1|-1){if(!this.canTurnPage||!this.slots)return false;if(this.mode==='reading'){if(!this.reading?.turnWindow(direction))return false;this.showReadingWindow();this.paintControls();this.paintScore();return true;}const changed=this.slots.turn(direction);if(changed){if(this.refill){this.manualWindow=true;this.reviewAnchor=undefined;this.errorReview=undefined;}this.paintControls();this.paintScore();}return changed;}
 private doneTarget(){return this.session?this.doneClaims.target({passage:this.session.chunk.id,pattern:this.session.chunk.pattern,rate:this.loopRate||this.state.working},this.session.phase==='countin',this.state):undefined;}
 private doneControl(){if(this.options.connected()||this.mode!=='timed')return '';const target=this.doneTarget()!,marked=hasDone(this.state,target),enabled=this.doneClaims.canToggle(this.state,target);return `<button data-practice="done" class="practice-done" aria-label="${marked?'Withdraw Done':'Done'}" aria-pressed="${marked}" ${enabled?'':'disabled'} title="${enabled?'Self-reported completion':'Finish a full loop at this speed first'}">${marked?'✓ ':''}Done <kbd>${escape(this.options.doneKey?.()??'Enter')}</kbd></button>`;}
 private usesRefill(){return !activePracticeClip(this.session?.chunk,this.plan.barTicks)&&this.mode==='timed'&&!!this.session?.measured&&!this.manualWindow&&(this.preparingStart||['countin','trial'].includes(this.session.phase));}
 private stationaryPassage(){return !!this.session&&this.session.chunk.lastBar-this.session.chunk.firstBar<4;}
 private activeRefill(){return !!this.refill&&this.refillMode&&this.usesRefill();}
 private enterFreeView(bar=this.session?.failure?.bar??this.refill?.layout.current??this.session?.chunk.firstBar){if(bar===undefined||!this.session)return;const chunk=this.session.chunk;this.slots?.review(Math.max(chunk.firstBar,Math.min(chunk.lastBar,bar)));const anchor=this.mode==='reading'||this.mode==='free'&&this.previousMode==='reading'?undefined:this.refill?.layout.placements.find(p=>p.bar===bar);this.reviewAnchor=anchor&&!anchor.empty?{bar:anchor.bar,x:anchor.x}:undefined;this.manualWindow=true;}
 private measureNavigationHint(){if(this.canAdjustWorking||!this.bindingContext.measureNavigation)return '';const keys=this.options.navigationKeys?.()??{previous:'←',next:'→'},hints=[keys.previous&&`<span>${escape(keys.previous)} Previous measures</span>`,keys.next&&`<span>${escape(keys.next)} Next measures</span>`].filter(Boolean).join('');return hints?`<span class="options-nav-hint">${hints}</span>`:'';}
 private prepareRefillStart(){this.session!.measured=this.options.connected();this.manualWindow=false;this.slots?.prime();this.reviewAnchor=undefined;this.errorReview=undefined;this.refill?.prime();this.cueKey='';this.preparingStart=true;try{this.paintControls();this.paintScore();}finally{this.preparingStart=false;}return !this.renderError;}
 private reviewPlacements(){
  if(this.errorReview){this.app.querySelector<HTMLElement>('.practice-score')!.dataset.practiceReviewAnchor='resident-preserved';return this.errorReview.placements;}
  const selected=this.slots!.bars.filter((bar):bar is number=>bar!==undefined),review=reviewRefill(this.refill!.certificate,this.slots!.windows,selected,this.reviewAnchor);
  if(review.bars.some((bar,i)=>bar!==selected[i]))this.slots!.showRange(review.bars[0],review.bars.at(-1)!);
  this.app.querySelector<HTMLElement>('.practice-score')!.dataset.practiceReviewAnchor=review.anchor;return review.placements;
 }
 private currentCues(){const s=this.session,refill=this.refill;if(!s||!refill||!this.activeRefill()||!['countin','trial'].includes(s.phase))return [];const current=refill.layout.placements.find(p=>p.bar===refill.layout.current)!;return heldTieCues(this.options.package,this.plan,s,refill.retired,current,this.projected,[...this.sourceCrops.values()],this.sourceTrack!,refill.layout.placements);}
 private paintScore(){
  const s=this.session!,stage=this.app.querySelector<HTMLElement>('.practice-score')!,area=this.app.querySelector<HTMLElement>('.practice-stage')!;
  stage.replaceChildren();this.crops=[];this.relations=[];this.contextCrops=[];this.renderError=undefined;
  if(activePracticeClip(s.chunk,this.plan.barTicks)){this.paintExcerptScore(stage,area);return;}
  const adaptive=this.usesRefill(),stationary=this.stationaryPassage(),framed=true;const displayBars=adaptive?this.refill?.bars??this.slots!.bars:this.errorReview?.placements.map(p=>p.bar)??this.slots!.bars;
  const context=area.querySelector<HTMLElement>('.practice-held-context')!,contextBars=new Set(this.mode==='reading'?[]:s.carryIn.map(a=>a.bar).filter(bar=>!displayBars.includes(bar)));
  if(this.mode!=='reading'&&s.failure&&(s.failure.bar<s.chunk.firstBar||s.failure.bar>s.chunk.lastBar)&&!displayBars.includes(s.failure.bar))contextBars.add(s.failure.bar);
  context.replaceChildren();context.hidden=!contextBars.size;
  if(contextBars.size){
   const label=document.createElement('p');label.textContent=s.failure?'Original source context':this.heldMessage();context.append(label);const origins=document.createElement('div');origins.className='practice-held-origins';context.append(origins);
   for(const bar of contextBars){const crop=cropMeasure(this.options.package,this.plan,bar),wrap=document.createElement('div');wrap.className='practice-held-origin';wrap.dataset.sourceContextBar=String(bar+1);const text=document.createElement('small');text.textContent=`Earlier measure ${bar+1}`;wrap.append(text,crop.svg);const line=document.createElementNS(ns,'line');line.classList.add('practice-playhead');line.style.visibility='hidden';crop.svg.append(line);origins.append(wrap);tightenSourceCrop(crop.svg);this.contextCrops.push(crop);}
  }
  try {
   for(let bar=s.chunk.firstBar;bar<=s.chunk.lastBar;bar++)if(!this.sourceCrops.has(bar))this.sourceCrops.set(bar,cropMeasure(this.options.package,this.plan,bar));
   const all=[...this.sourceCrops.values()],p=this.options.package;
   if(this.refillMode!==adaptive)this.refillMode=adaptive;
   // A complete stationary staff needs no incoming allocation air. Keep its
   // full source/cue envelope readable before Start, with real white margins.
   stage.style.paddingInline=framed?'16px':'';const surface=this.app.querySelector<HTMLElement>('.practice-surface')!;surface.style.paddingInline=framed&&!stationary?'12px':'';
   const available=Math.max(20,area.clientHeight-(context.hidden?0:context.offsetHeight)-24-(framed&&!stationary?24:0)),style=getComputedStyle(stage),width=Math.max(20,stage.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight));
   const sourceFont=Math.min(...all.flatMap(c=>c.seats.map(seat=>seat.fontSize))),minimumScale=Number.isFinite(sourceFont)?12/sourceFont:0;
   if(!this.sourceTrack||!framed){
    if(framed){
     const admitted=admitRefillPassage(p,this.plan,s.chunk,all,stage,stationary&&minimumScale?width/minimumScale:undefined,this.refill?.certificate,true);this.sourceTrack=admitted.track;
     // Fit the complete certified ink/cue union once before count-in. A
     // mirrored annotation reserve is not source ink and can make an
     // otherwise readable passage too small. The frozen frame below keeps
     // its real staff position unchanged throughout every allocation.
     this.sourceTrack.topAir=0;
     if(!this.refill)this.refill=new PracticeRefill(this.plan,s.chunk,admitted.certificate);
    }else{
     const bars=this.slots!.bars.filter((bar):bar is number=>bar!==undefined),shown=all.filter(c=>bars.includes(c.bar));
     this.sourceTrack=fitPassageFrame(p,this.plan,shown,fitPassageRelations(p,this.plan,shown,passageTrack(shown,stage,p,true),'compact',[bars]),'compact',[bars],stage);this.sourceTrack.topAir=0;

    }
   }
   const track=this.sourceTrack,placements=framed?(adaptive?this.refill!.layout.placements:this.reviewPlacements()):undefined,positions=placements?.map(p=>p.bar)??this.slots?.bars??all.map(c=>c.bar),policy='compact' as const;
   const visiblePositions=positions.map(bar=>placements?.find(p=>p.bar===bar)?.empty?undefined:bar),painted=all.map(c=>{const placement=placements?.find(p=>p.bar===c.bar);return placement?.empty?blankMeasureCrop(c,placement.width):c;});
   this.projected=projectRelations(p,this.plan,all,track,policy,visiblePositions,placements);const cues=this.currentCues();this.cueKey=cues.map(q=>q.id+':'+q.left+':'+q.right).join('|');
   const passage=composePassage(painted,track,policy,positions,[...this.projected,...cues],placements),scale=this.refillGeometry?.scale??Math.min(width/passage.width,available/passage.height);
   stage.dataset.practiceDigitPx=String(sourceFont*scale);stage.dataset.practiceFitBelowPreferred=String(scale<minimumScale-1e-7);
   if(framed){
    const areaStyle=getComputedStyle(area),left=parseFloat(areaStyle.paddingLeft),right=parseFloat(areaStyle.paddingRight),top=parseFloat(areaStyle.paddingTop);
    this.refillGeometry??={scale,top:top+(context.hidden?0:context.offsetHeight+10)+Math.max(0,(available-passage.height*scale)/2)};
    // Status and footer changes alter the flex area's height. They must not
    // recenter a reading reference or refit a height-limited active measure.
    area.style.justifyContent='flex-start';area.style.alignItems='center';stage.style.position='absolute';stage.style.left=`${left}px`;stage.style.top=`${this.refillGeometry.top}px`;stage.style.width=`calc(100% - ${left+right}px)`;stage.style.maxHeight='none';
   }else{area.style.justifyContent='';area.style.alignItems='';stage.style.position='';stage.style.left='';stage.style.top='';stage.style.maxHeight='';stage.style.width='100%';}
   stage.style.height=`${passage.height*scale}px`;passage.svg.style.width=`${passage.width*scale}px`;passage.svg.style.height=`${passage.height*scale}px`;
   if(adaptive){passage.svg.dataset.practiceLayoutEpoch=String(this.refill!.layout.epoch);passage.svg.dataset.practiceCurrentBar=String(this.refill!.layout.current+1);passage.svg.dataset.practiceAdmission=this.refill!.certificate.proof;}
   stage.append(passage.svg);this.crops=passage.crops;this.relations=passage.relations;
   for(const crop of this.crops){const line=document.createElementNS(ns,'line');line.classList.add('practice-playhead');line.setAttribute('y1',String(crop.frame+Math.min(...crop.lanes)));line.setAttribute('y2',String(crop.frame+Math.max(...crop.lanes)));crop.svg.append(line);}
  }catch(error){stage.replaceChildren();stage.style.height='auto';this.renderError=`Measures ${s.chunk.id}: ${(error as Error).message}`;const message=document.createElement('p');message.className='practice-render-error';message.textContent=this.renderError;stage.append(message);if(['countin','trial'].includes(s.phase)){s.pause();this.stopClock();}}
  this.paintVisibility();
 }
 private paintVisibility(){this.paintCue();if(!this.session)return;const s=this.session,w=this.mode==='reading'?this.reading:undefined;
  if(this.refillMode&&!this.usesRefill()){this.enterFreeView();this.paintScore();return;}
  if(w&&this.showReadingWindow()){this.paintJoinCounter();this.paintScore();return;}
  if(this.activeRefill()&&!this.preparingStart){
   try{if(this.refill!.update(s,this.options.connected())){this.paintScore();return;}}
   catch(error){s.pause();this.stopClock();this.renderError=(error as Error).message;this.paintControls();this.status(this.renderError);return;}
   const key=this.currentCues().map(q=>q.id+':'+q.left+':'+q.right).join('|');if(key!==this.cueKey){this.paintScore();return;}
  }
  const reviewing=(this.mode==='free'||this.mode==='reading')?!this.readingActive():['paused','error'].includes(s.phase),originalVisible=reviewing?new Set([...s.carryIn.flatMap(a=>a.groups),...this.plan.gestures.filter(g=>g.bar>=s.chunk.firstBar&&g.bar<=s.chunk.lastBar).map(g=>g.id)]):w&&this.readingActive()?new Set(w.current.groups):s.visibleGroups(),visible=this.activeRefill()&&['countin','trial'].includes(s.phase)?this.refill!.visibleGroups(originalVisible):originalVisible,failure=w?(this.readingActive()?w.failure:undefined):s.failure,failed=new Set((w||s.errorMarked)?failure?.owners??[]:[]);
  const context=this.app.querySelector<HTMLElement>('.practice-held-context');if(context)context.style.visibility=this.activeRefill()&&['countin','trial'].includes(s.phase)&&s.carryIn.length&&s.carryIn.every(a=>a.groups.every(g=>this.refill!.retired.has(Number(g.split(':')[0]))))?'hidden':'';
  for(const {el,groups}of this.relations)el.style.visibility=el.querySelector('[data-practice-held-cue]')||groups.some(g=>visible.has(g))||groups.some(g=>failure?.groups.includes(g))?'visible':'hidden';
  for(const crop of [...this.contextCrops,...this.crops]){crop.svg.querySelectorAll<SVGElement>('.janko-pedal,.janko-pedal-start').forEach(el=>el.style.visibility=w&&this.readingActive()?'hidden':'visible');for(const {el,groups}of crop.owned)el.style.visibility=groups.some(g=>visible.has(g))||groups.some(g=>failure?.groups.includes(g))?'visible':'hidden';for(const seat of crop.seats){const text=crop.svg.querySelector<SVGTextElement>(`[data-viewer-seat="${seat.id}"]`);if(text){const showing=this.inspection,presentation=this.options.presentation?.()??'annotations',finger=showing?fingerFor(this.basePackage,this.options.personal,seat):undefined;const inkVisible=seat.ownerIds.some(id=>{const group=this.plan.ownerGroup.get(id)!;return visible.has(group)||!!failure?.groups.includes(group);});paintFinger(text,seat,{visible:showing&&inkVisible&&(presentation==='annotations'||this.options.package.fingerEligibility.eligible)&&!!finger,presentation,finger,position:this.positions.get(seat.id)!,pitchText:seat.ownerIds.some(id=>failed.has(id))&&(presentation==='annotations'||!showing)?'X':seat.pitchDigit});text.classList.toggle('practice-note-live',seat.ownerIds.some(id=>this.contacts.hasOwner(id)));text.classList.toggle('practice-note-error',seat.ownerIds.some(id=>failed.has(id)));}}
   const line=crop.svg.querySelector<SVGLineElement>('.practice-playhead')!,tick=s.elapsedTick,start=this.plan.barTicks[crop.bar],end=this.plan.barTicks[crop.bar+1],active=this.crops.includes(crop)&&!w&&['countin','trial'].includes(s.phase)&&tick>=start&&tick<end;line.style.visibility=active?'visible':'hidden';if(active){const events=s.plan.attacks.filter(a=>a.bar===crop.bar&&a.tick>=s.startTick&&a.tick<s.chunk.end),anchors=[...new Map(events.map(a=>[a.tick,crop.seats.find(seat=>seat.ownerIds.some(id=>a.owners.includes(id)))?.x??crop.left])).entries()];anchors.push([Math.min(end,s.chunk.end),crop.right]);const index=Math.max(0,anchors.findLastIndex(a=>a[0]<=tick)),a=anchors[index],b=anchors[index+1]??a,x=a[1]+(b[1]-a[1])*(b[0]===a[0]?0:(tick-a[0])/(b[0]-a[0]));line.setAttribute('x1',String(x));line.setAttribute('x2',String(x));}
  }if(!this.contrastExercise&&!this.activeRefill()&&this.slots?.recycle(s,this.options.connected(),new Map([...this.sourceCrops.values()].map(c=>[c.bar,new Set(c.seats.flatMap(seat=>seat.ownerIds))])))){this.paintScore();return;}this.app.dataset.practiceMode=this.mode;this.app.dataset.practicePhase=w?(this.readingActive()?w.failure?'reading-error':'reading':'paused'):s.phase;this.paintJoinCounter();
 }
 private paintCooldown(){const root=this.app.querySelector<HTMLElement>('.practice-cooldown');if(!root)return;const remaining=Math.max(0,Math.ceil((this.resumeAfter-performance.now())/1000));root.hidden=!remaining||this.overview;const count=root.querySelector<HTMLElement>('[data-cooldown-count]');if(count&&count.textContent!==String(remaining))count.textContent=String(remaining);if(root.hidden){this.cooldownFeedback?.cancel();this.cooldownFeedback=undefined;}}
 private feedbackCooldown(){this.paintCooldown();this.cooldownFeedback?.cancel();this.cooldownFeedback=undefined;if(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;const symbol=this.app.querySelector<SVGSVGElement>('.practice-cooldown-symbol');this.cooldownFeedback=symbol?.animate?.([{transform:'translateX(0)'},{transform:'translateX(-3px)'},{transform:'translateX(3px)'},{transform:'translateX(-2px)'},{transform:'translateX(2px)'},{transform:'translateX(0)'}],{duration:240,easing:'ease-out'});}
 private freezeError(){this.contrastCycle?.cancel();this.resumeAfter=performance.now()+(this.state.resumeCooldownSeconds??3)*1000;this.resumeBlocked=true;this.preview.clear();const s=this.session!;this.persistDiagnostic(s.failureReason??'Performance error',s.failure);this.contacts.clear();this.stopClock();if(this.refillMode&&this.refill)this.errorReview=restoreRefill(this.refill.certificate,this.refill.layout);this.enterFreeView();this.paintControls();this.status(s.failureReason??'A note was missed.');this.paintScore();}
 async action(action:string,repeat?:PracticeRepeatPlan,completionRevision?:number){if(this.personalChoicesPending&&!['back','settings','retry-save'].includes(action)){this.status('Hand choices need to finish updating before practice. Use Retry saving.');return;}this.cancelTempoHold();if(action==='done'){if(this.canMarkDone)await this.toggleCompletion();return;}if(action==='next'||action==='previous'){this.turnPage(action==='next'?1:-1);return;}let starting:{generation:number;clock:PracticeClock;session:PracticeSession}|undefined;try{if(action==='ready'&&performance.now()<this.resumeAfter){this.feedbackCooldown();return;}this.contacts.clear();if(action.startsWith('exclude:')||action.startsWith('include:')){if(this.browser.toggleExcluded(this.state,action.slice(action.indexOf(':')+1))){await this.save(false);this.paintBrowser(true);}return;}if(action==='retry-save'){if(await this.save()){this.paintControls();this.status('Progress saved. Ready when you are.');}return;}if(action==='reading'||action==='timed'||action==='free-view'){this.selectMode(action==='free-view'?'free':action);return;}if(action==='back'){this.close();this.options.back();return;}if(action==='settings'){this.options.settings();return;}if(action==='overview'){this.closeFingering();this.contrastCycle?.cancel();this.session?.pause();this.stopClock();this.overview=true;this.paint();return;}if(action.startsWith('select:')||action.startsWith('component:')){this.browser.select(this.state,action.split(':')[1],action.startsWith('component:'));this.paintBrowser(true);return;}if(action.startsWith('passage:')||action.startsWith('chunk-')){const chunk=action.startsWith('chunk-')?this.plan.chunks[Number(action.slice(6))]:reconcilePassages(this.plan,this.state).all.get(action.slice(8));if(chunk)this.choosePassage(chunk);return;}if(!this.session)return;if(action==='pause'){this.selectMode('free');return;}if(action==='ready'){if(this.contrastExercise&&(this.mode==='timed'||this.mode==='free'&&this.previousMode==='timed')){await this.startContrast();return;}if(completionRevision!==undefined&&completionRevision!==this.completionRevision)return;if(this.mode==='free'){this.mode=this.previousMode;if(this.mode==='reading')this.showReadingWindow();}if(this.mode==='reading'){this.readingPaused=false;this.readingStarted=true;this.session.pause();this.stopClock();this.paint();this.status(this.readingMessage());return;}if(!this.carryPrepared()){this.status(this.heldMessage());this.paintControls();return;}if(this.saveError&&!await this.save())return;if(!this.session)return;if(!this.prepareRefillStart()){this.status(this.renderError??'The passage needs source inspection before playing.');return;}this.stopClock(completionRevision!==undefined);if(this.pendingCompletion)this.pendingCompletion.generation=this.startGeneration;const generation=this.startGeneration;this.audioError=undefined;const output=practiceOutput(this.options.audioOutput,this.state.audioOutput);if(this.clock&&this.clock.output!==output){this.clock.close();this.clock=undefined;}if(!this.clock){const clock=new PracticeClock(this.audioOutputs.supported,output,message=>{if(this.disposed||this.clock!==clock)return;this.audioError=message;this.pause();this.status(message);this.connectionChanged();});this.clock=clock;}const clock=this.clock,session=this.session,attempt=capturePracticeAttempt(repeat?.nextBpm??this.state.working,repeat?.grid??session.sourcePulseGrid);this.startingRate=attempt.bpm;starting={generation,clock,session};const current=()=>!this.disposed&&generation===this.startGeneration&&clock===this.clock&&session===this.session;const unlock=clock.unlock();this.status('Starting metronome…');await unlock;if(!current())return;if(!this.carryPrepared()){this.stopClock();this.status(this.heldMessage());return;}session.measured=this.options.connected();this.loopRate=attempt.bpm;this.slots?.prime();this.refill?.prime();const grid=attempt.grid;const duration=(session.completionTick-session.startTick)*scoreTickMs(this.plan,attempt.bpm)+attempt.countInMs;const repeated=repeat?await clock.beginRepeat(attempt.bpm,duration,repeat,grid):undefined;const start=repeated?.countStartMs??await clock.begin(attempt.bpm,duration,true,grid);if(!current())return;if(!this.carryPrepared()){this.stopClock();this.status(this.heldMessage());return;}this.repeatGap=repeated;this.preview.clear();session.ready(start,this.heldPitches,!session.measured,{sustain:this.options.sustain?.(),contacts:this.heldStreams},grid,attempt.bpm);for(const a of session.carryIn??[])this.contacts.press(a);this.done=false;this.paint();}}
 catch(error){if(starting&&(this.disposed||starting.generation!==this.startGeneration||starting.clock!==this.clock||starting.session!==this.session))return;this.stopClock();this.audioError=(error as Error).message;this.status(this.audioError);}finally{if(starting&&starting.generation===this.startGeneration&&starting.clock===this.clock&&starting.session===this.session)this.startingRate=undefined;}}
 private async toggleCompletion(){
  if(!this.canMarkDone)return;const s=this.session,target=this.doneTarget();if(!s||!target)return;
  const result=this.doneClaims.toggle(this.state,target,this.state.keepTempo,this.state.step,this.state.target);if(!result)return;
  if(this.contrastExercise){void this.save(false);this.paintControls();return;}
  const revision=++this.completionRevision,phase=s.phase,pending=this.pendingCompletion;
  const inherited=pending?.session===s&&pending.generation===this.startGeneration?pending.anchor:undefined;
  const boundary=inherited??((phase==='countin'||phase==='complete')&&this.repeatAnchor?{previousStartMs:phase==='complete'?this.repeatAnchor.phraseEndMs:s.startMs-practiceTiming(this.loopRate,s.pulseGrid).countInMs,phraseEndMs:this.clock?.now()??this.repeatAnchor.phraseEndMs,previousBpm:this.loopRate}:undefined);
  if(boundary){boundary.phraseEndMs=Math.max(boundary.previousStartMs,boundary.phraseEndMs);this.state.working=result.marked?this.nextWorkingRate(this.doneClaims.nextRate(this.state.working,this.state.keepTempo)):result.rate??target.rate;this.stopClock(true);s.pause();this.pendingCompletion={generation:this.startGeneration,session:s,anchor:boundary};}
  else if(phase==='paused'||phase==='ready'||phase==='error')this.doneClaims.cancelIncrease();
  const generation=this.startGeneration,current=()=>!this.disposed&&!this.overview&&!this.settingsDialog&&revision===this.completionRevision&&generation===this.startGeneration&&s===this.session;
  this.paintControls();this.paintVisibility();this.status(result.marked?'Saving Done…':'Saving withdrawal…');
  if(!await this.save(false)||!current())return;
  if(boundary){await this.action('ready',planPracticeRepeat({...boundary,nextBpm:this.state.working,grid:s.pulseGrid}),revision);if(this.disposed||revision!==this.completionRevision||s!==this.session||!['countin','trial'].includes(s.phase))return;}
  this.pendingCompletion=undefined;
  this.status(result.marked?'Done saved.':'Done withdrawn.');
 }

 observe(event:MidiNote){if(!this.personalChoicesPending&&!this.disposed&&!!this.session&&!this.overview&&!this.settingsDialog&&this.mode!=='free'&&event.on&&!event.filtered){this.lastNote=`Note ${event.note} · channel ${event.channel}`;this.connectionChanged();}}
 sustain(event:MidiCC){const s=this.session;if(this.personalChoicesPending||!isMusicalSustain(event)||this.overview||this.mode!=='timed'||!s||!this.clock||this.settingsDialog||this.disposed||!['countin','trial'].includes(s.phase))return;const before=s.phase,now=musicalControllerTime(event,this.clock);s.sustain(event,now);if(before!==s.phase&&s.phase==='error')this.freezeError();}
 connectionChanged(){if(this.contrastCycle?.active&&this.contrastCycle.measured!==this.options.connected()){this.pause();this.status('The piano connection changed. Resume starts both variants again.');}if(!this.options.connected())this.readingPaused=true;const summary=this.app.querySelector('[data-piano-summary]');if(summary)summary.textContent=this.options.connected()?'Piano connected':'Piano disconnected';const d=this.settingsDialog;if(d){const piano=d.querySelector('[data-piano-status]'),note=d.querySelector('[data-note-status]');if(piano)piano.textContent=this.options.connected()?`Piano: ${this.options.source()} connected`:'Piano disconnected';if(note)note.textContent=this.lastNote;}if(!this.overview){this.paintControls();this.paintVisibility();}}
 /** Physical contacts survive passive inspection without matching source notes. */
 observeHeldInput(event:MidiNote){
  if(this.disposed||event.filtered)return;
  this.heldPitches??=new Set();this.heldStreams??=new Map();
  if(event.on){this.heldPitches.add(event.note);this.heldStreams.set(event.note,event);}else{const stream=this.heldStreams.get(event.note);if(!stream||stream.source===event.source&&stream.generation===event.generation&&stream.channel===event.channel){this.heldPitches.delete(event.note);this.heldStreams.delete(event.note);}}
 }
 clearHeldInput(){this.resetCarrySetup();}
 note(event:MidiNote){this.observeHeldInput(event);if(this.personalChoicesPending||this.disposed||!this.session||this.settingsDialog||this.overview||this.mode==='free')return;const s=this.session,w=this.mode==='reading'?this.reading:undefined,phase=w?'reading':s.phase;
  const expectedBefore=w?w.current.events.find(a=>!w.matched.has(a.id)):s.events.find(a=>!s.matched.has(a.id)),due=this.mode==='timed'&&expectedBefore&&this.clock?s.startMs+(expectedBefore.tick-s.startTick)*s.tickMs:undefined;
  const record=(decision:string)=>this.diagnostics.record(event,decision,phase,expectedBefore,due);
  if(event.filtered){record('guard-filtered');return;}
  if(!event.on){this.preview.release(event.note);this.contacts.release(event.note);this.paintVisibility();}
  const next=s.events.find(a=>!s.matched.has(a.id)),first=w?.current.events[0],restart=w&&(w.failure||(w.matched.size&&first?.midi===event.note&&w.current.events.find(a=>!w.matched.has(a.id))?.midi!==event.note)),expected=w?.current.events.find(a=>!w.matched.has(a.id));
  const candidates=w&&this.readingActive()?w.current.events.filter(a=>a.tick===(restart?first?.tick:expected?.tick)):['trial','countin'].includes(s.phase)?s.events.filter(a=>a.tick===next?.tick):this.plan.attacks.filter(a=>a.tick>=s.startTick&&a.tick<s.chunk.end&&a.groups.some(g=>s.visibleGroups().has(g))),attack=(s.phase==='error'?(s.failure?.midi===event.note?s.failure:candidates.find(a=>a.midi===event.note&&a.groups.some(g=>s.failure?.groups.includes(g)))):undefined)??candidates.find(a=>a.midi===event.note);
  if(w){if(event.on&&this.readingActive()){const cycle=w.cycles,decision=w.note(event.note,event.velocity);record(decision);if(this.contrastExercise&&w.cycles!==cycle){this.mountContrastClip(s.chunk.clipIndex===1?0:1);this.paint();return;}if(w.failure)this.contacts.clear();else if(decision==='accepted'&&attack)this.contacts.press(attack);if(decision==='failed')this.persistDiagnostic('A different note was played in Reading.',w.failure);this.paintVisibility();this.status(this.readingMessage());}else{if(event.on){const result=this.preview.note(event.note,event.velocity,event.timestamp_micros/1000,this.readingPaused?s.visibleGroups():new Set(w.current.groups));record(result.decision);this.contacts.replace(result.contacts);this.paintVisibility();}else record('released');}return;}
  if(s.carryIn.length&&['ready','paused','error'].includes(s.phase)&&!this.inspection&&!this.overview){const carry=s.carryIn.find(a=>a.midi===event.note);record(event.on?'held-setup':'released');if(event.on&&carry)this.contacts.press(carry);this.paintVisibility();this.status(this.carryPrepared()?'Earlier notes held · Ready when you are.':this.heldMessage());return;}if(s.phase==='ready'&&!this.inspection&&!this.overview){record(event.on?'preview':'released');if(event.on&&attack){this.contacts.press(attack);this.paintVisibility();}return;}
  if(!this.clock||!['countin','trial'].includes(s.phase)){if(event.on){const result=this.preview.note(event.note,event.velocity,event.timestamp_micros/1000,s.visibleGroups());record(result.decision);this.contacts.replace(result.contacts);if(!result.attack&&s.phase==='error'&&s.failure?.midi===event.note)this.contacts.press(s.failure);s.clearErrorMark(event.note);this.paintVisibility();}else record('released');return;}if(this.expireRepeatCandidate())return;const before=s.phase,now=this.clock.fromMidi(event.timestamp_micros);if(event.on)record(s.note(event.note,now,event.velocity,event));else{s.release(event.note,now,event);record('released');}if(s.phase!==before&&s.phase==='error')this.freezeError();else if(event.on&&attack&&s.matched.has(attack.id)){this.contacts.press(attack);this.prepareRepeat();this.paintVisibility();}
 }
 private persistDiagnostic(reason:string,failed?:import('./practice').PracticeAttack){if(!this.session)return;const snapshot=this.diagnostics.failure(this.plan.revision,this.session.chunk.id,reason,failed);this.diagnosticWrites=this.diagnosticWrites.then(()=>writeJson('practice-error-log.json',snapshot)).catch(()=>{});}
 private adjustManualDraft(key:string,field:HTMLInputElement,direction:number,elapsed:number){if(this.disposed||this.saveError)return false;try{const name=key as 'working'|'start'|'connectionStart'|'step'|'target',original=Number(field.dataset.absolute),current=field.value===field.dataset.manualDraftText?Number(field.dataset.manualDraft):integerPracticeSetting(key)?Number(field.value):key==='target'?tempoRateEdit(field.value,original):speedEdit(field.value,original,this.state.target,field.dataset.presented);if(key==='target')setPracticeGoal(this.state,this.plan,current);else readPractice({...this.state,[name]:current},this.plan);const next=integerPracticeSetting(key)?adjustPracticeInteger(key,current,direction):key==='target'?adjustDuration(current,direction,elapsed):key==='step'?adjustProgression(current,this.state.target,direction,elapsed):adjustPercent(current,this.state.target,direction);if(key==='target')setPracticeGoal(this.state,this.plan,next);else readPractice({...this.state,[name]:next},this.plan);if(next===current)return false;field.value=integerPracticeSetting(key)?String(next):key==='target'?tempoRateNumber(next):key==='step'?speedNumber(next,this.state.target):manualSpeedNumber(next,this.state.target);field.dataset.manualDraft=String(next);field.dataset.manualDraftText=field.value;const notice=this.settingsDialog?.querySelector('[data-goal-error]');if(notice)notice.textContent='';return true;}catch(error){this.status((error as Error).message);const notice=this.settingsDialog?.querySelector('[data-goal-error]');if(notice)notice.textContent=(error as Error).message;return false;}}
 private adjustManual(key:string,direction:number,repeated:boolean,elapsed:number){if(this.disposed||this.saveError)return false;const field=(this.settingsDialog??this.app).querySelector<HTMLInputElement>(`[data-practice-setting="${key}"]`);if(!repeated&&field&&!this.setting(field))return false;const candidate=structuredClone(this.state),name=key as 'working'|'start'|'connectionStart'|'step'|'target'|'countInBars'|'resumeCooldownSeconds',current=candidate[name];if(current===undefined)return false;const next=integerPracticeSetting(key)?adjustPracticeInteger(key,current,direction):key==='target'?adjustDuration(current,direction,elapsed):key==='step'?adjustProgression(current,this.state.target,direction,elapsed):adjustPercent(current,this.state.target,direction);if(next===current)return false;if(key==='target')this.applySetting(setPracticeGoal(candidate,this.plan,next),key,true);else{candidate[name]=next;this.applySetting(readPractice(candidate,this.plan),key,true);}return true;}
 cancelTempoHold(){this.manual.cancel();}
 releaseTempoKey(code:string){this.manual.release(code);}

 private settingsControl(){const label=readingActionLabel('practiceSettings'),hint=this.options.settingsKey?.()??'O';return `<button data-practice="settings" aria-label="${label}">${label}${hint?` <kbd>${escape(hint)}</kbd>`:''}</button>`;}
 /** Fingers has no practice settings: nothing in it is timed or saved. */
 optionsMarkup(){if(this.options.fingersOnly)return '';return practiceOptionsMarkup(this.plan.playerTempo?requireReferencePerformanceTempo(this.plan):requireReferencePerformanceTempo(this.options.package.score),this.state,this.speedInput('start',this.state.start,5,500,'Starting speed percent'),this.speedInput('step',this.state.step,.025,100,'Increase percent of target'),this.speedInput('connectionStart',this.state.connectionStart??this.state.target*.5,5,500,'Connection speed percent'),!!this.plan.playerTempo);}
 mountOptions(d:HTMLDialogElement,close:()=>void){
  if(this.options.fingersOnly)return ()=>{if(!this.disposed)this.paint();};
  this.settingsDialog=d;const section=d.querySelector<HTMLElement>('[data-practice-options]')!,abort=new AbortController();
  section.addEventListener('change',e=>this.settingChanged(e.target as HTMLInputElement),{signal:abort.signal});
  section.querySelector('[data-use-reference]')?.addEventListener('click',()=>{const next=setPracticeGoal(this.state,this.plan);delete this.state.personalGoal;Object.assign(this.state,next);this.contacts.clear();this.session?.pause();this.stopClock();void this.save(false);this.refreshSettings();this.paint();},{signal:abort.signal});
  return ()=>{this.manual.cancelEdit();abort.abort();if(this.settingsDialog===d)this.settingsDialog=undefined;if(!this.disposed)this.paint();};
 }
 overlay(active:boolean){if(this.inspection===active)return;this.inspection=active;this.session?.inspect(active);this.paintVisibility();}
 key(code:string,repeated=false,shift=false){
  // While hand choices update, the fingering stage stays put; elsewhere Esc leaves.
  if(this.personalChoicesPending){if(code==='Escape'&&!this.fingering)void this.action('back');return true;}
  if(this.settingsDialog)return false;
  if(this.canAdjustWorking&&(code==='ArrowLeft'||code==='ArrowRight')){if(!repeated)this.manual.begin(code,(again,elapsed)=>this.adjustManual('working',code==='ArrowRight'?1:-1,again,elapsed));return true;}
  // Held arrows walk the pass; any other held key does nothing more.
  if(this.fingering){if(repeated)return ['ArrowLeft','ArrowRight','Backspace'].includes(code)?this.fingering.key(code,shift):true;if(code==='Escape'&&!this.fingering.labelling){void this.action(this.options.fingersOnly?'back':'overview');return true;}return this.fingering.key(code,shift);}
  if(repeated&&!(this.overview&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(code)))return ['ArrowLeft','ArrowRight'].includes(code);
  this.cancelTempoHold();
  if(this.overview){const result=this.browser.key(code,this.state);if(result==='practice'&&document.activeElement?.closest('.practice-overview')){const chunk=this.browser.current(this.state);if(chunk)this.choosePassage(chunk);return true;}if(result==='exclusion'){void this.save(false);this.paintBrowser(true);return true;}if(result==='handled'){this.paintBrowser(true);return true;}}
  else{if(code==='Space'){void this.action('ready');return true;}if(code==='KeyK'&&this.mode==='timed'){this.state.keepTempo=!this.state.keepTempo;void this.save();this.paintControls();return true;}if(code==='ArrowLeft'||code==='ArrowRight')return true;}
  if(code==='Escape'){void this.action(this.overview?'back':'overview');return true;}return false;
 }

 pause(){this.contrastCycle?.cancel();this.manual.cancelEdit?.();this.cancelTempoHold();this.contacts.clear();this.readingPaused=true;if(this.mode!=='reading')this.enterFreeView();this.session?.pause();this.stopClock();this.paint();}
 close(){this.closeFingering();this.contrastCycle?.cancel();this.cooldownFeedback?.cancel();this.session?.pause();this.resetCarrySetup();this.manual.dispose();this.previewFrames.clear();this.disposed=true;this.stopClock();window.removeEventListener('resize',this.refitCue);cancelAnimationFrame(this.raf);this.clock?.close();this.settingsDialog=undefined;this.app.removeAttribute('data-practice-phase');this.app.removeAttribute('data-practice-mode');}
}
