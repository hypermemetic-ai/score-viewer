import {arrangeBottomNavigation,arrangeDialogNavigation,applicationNavigationKey} from './application-navigation';
import {stagePracticeEditionTransfer} from './practice-edition-install';
import {footerFontNoticeUrl} from './annotation-ink-policy';
import {ViewerOrientation,fitSurface,fitDialog} from './orientation';
import{ObservedMidiSustain,isMusicalSustain}from'./midi-sustain';
import {shareInstalledScore,scoreSaveMessage} from './share-score';
import './style.css';
import './application-navigation.css';
import {annotationPositions,paintFinger,type AnnotationPosition} from './fingering-presentation';
import {expertSettings,fingerBehaviorSettings} from './expert-settings';
import {MidiOptionsPanel,AudioOptionsPanel} from './device-options';
import {PianoOptionsPanel} from './piano-options';
import './piano-options.css';
import {nativePiano,type PianoAudioStatus} from './piano-host';
import {defaultPianoPreferences,readPianoPreferences,type PianoPreferences} from './piano-preferences';
import {OptionsBindingsPanel,optionsBindingRows} from './options-bindings';
import {OptionsNavigation} from './options-navigation';
import {workingSpeedArrow} from './practice-shortcuts';
import {PackageAdmissionSession} from './package-admission-session';
import {optionsSectionsMarkup,type OptionsSection} from './options-sections';
import {ReaderPageCache,createReaderPage,mountReaderPages,type ReaderPage} from './reader-page-cache';
import {mountScorePrint,pdfSaveMessage,scorePageSize,scorePdfFilename} from './score-pdf';
import {navigationHint} from './navigation-hint';
import {ControlResolver,readControlBindings,actionControlLabel,practiceControlBindings,controlActionAllowed,editorControlBindings,readerControlBindings,isEditorAction,type ControlBindings} from './control-bindings';
import {freeViewControlBindings,readFreeViewControlOverrides,changeScopedControls,type FreeViewControlOverrides} from './free-view-controls';
import {requireReferencePerformanceTempo,type ReferencePerformanceTempo} from '../vendor/iso-notation/src/model/reference-performance-tempo';
import {PLAYER_TEMPO_REFERENCE,playerTempo,savedPlayerTempo,scoreBeatUnit} from './player-tempo';
import {beatUnitSvg,beatUnitLabel,metronomeMark,perMinuteSuffix,tempoRateNumber} from './metronome-mark';
import {ManualTempoControls,manualTempoField} from './manual-tempo-control';
import {scoreOptionsMarkup,transposeDraft} from './score-options';
import {getScoreTransposition,scoreTranspositionRange,getOriginalScorePackageBytes,scoreTranspositionCompatible,sameHandsAtPitch,prepareSourceTransposition} from './score-transposition';
import {personalForTransposedEdition} from './transposed-personal';
import {retainedTranspositionFile,nextTranspositionSelection,assertSelectedTransposition} from './score-transposition-selection';
import {PitchInputEpoch,type AdmittedPracticeContext,type PracticeViewContext} from './practice-context';
import {PracticeView} from './practice-view';
import {ManualPracticeView} from './manual-practice-view';
import {ManualReadingContext} from './manual-reading-context';
import {planManualPractice} from './manual-practice-plan';
import {readManualPracticeWithLegacy} from './manual-practice-state';
import {scoreFileName} from './score-file-name';
import {migrateScoreFiles} from './score-file-migration';
import {manualReferenceStorageName,manualReferenceRecord,readManualReference} from './manual-reference-context';
import {manualPassageScene,manualPassageClipScene} from './manual-passage-scene';
import {ReadingPresentationController} from './reading-presentation';
import {manualReaderView,retainManualReaderView} from './manual-reader-presentation';
import {readingNotationControl} from './reading-notation-control';
import {selectReadingNotation,prepareDualReadingPacket,type ReadingNotation} from './dual-reading-package';
import {inspectGuitarProSource,stageGuitarProParts,admitGuitarProContext,guitarProContext,guitarProPreparedByEarlierConverter,EARLIER_GUITAR_PRO_CONVERTER,GUITAR_PRO_FILES,type GuitarProInspection} from './guitar-pro-provider';
import {ReadingPartCatalog} from './reading-part-catalog';
import {guitarProTracksMarkup} from './guitar-pro-tracks';
import {scoreImportKind,MUSESCORE_IMPORT_ENABLED} from './score-import-kind';
import {stageReadingPartsInstall,ReadingPartsCommitUnconfirmed} from './reading-parts-install';
import {practicePercent,requirePracticeHands} from './practice';
import {LibraryPracticeSummaries} from './library-practice-progress';
import {LoadingProgress,LOADING_STEPS,type LoadingStepId} from './viewer-loading';
import type {ReadingExecution} from './reading-execution';
import {editionNeedsEngravingAgain,useCalculatedAdmissionEvidence,useReadingAdmissionReceipts,hashBytes,selectPresentation,sameFrozenPayload,headerOnlyRefresh,referenceMidiDiffers,type ScorePackage,type FingerLayer,type Seat} from './package';
import {activeLayer,corrected,defaultView,effectiveLabelMode,fingerDisplayAvailable,feedback,fingerFor,initialPersonal,readPersonal,collectionId,personalStorageName,practiceStorageName,legacyPracticeStorageName,validEntryStorage,rotate,turnPage,viewportFit,type Entry,type PersonalState,type PersonalSourceAnchor,type Rotation} from './state';
import {loadPersonalJournal} from './personal-journal';
import {rotationKey,rotationShortcut,InputController,defaultBindings,readBindings,readingActionAllowed,fingerBehavior,fingerPresentation,fingerPreferences,readableChord,actionCode,inputCode,chord,directFingerKey,type Bindings,type ReadingAction,type FingerBehavior,type FingerPresentation} from './input';
import {host,readJson,writeJson} from './host';
import {keyboardPreference,keyboardLabel,writtenAnchor,anchorView} from './keyboard-selection';
import {ensurePianoReady} from './piano-readiness';
import type {PianoPrepared} from './piano-readiness';
interface PreparedScore {packageBytes:Uint8Array;package:ScorePackage;personal?:PersonalState}
import {stagePresentationInstall} from './presentation-install';
import {prepareRetainedEdition,readRetainedEdition} from './retained-editions';
import {prepareRebuiltEdition,addKeyboardView,personalForAddedKeyboard,type RebuiltInstall} from './edition-rebuild';
import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';

import {editUnits,moveSelection,selectionOnPage,systemSelection,measureSelection} from './selection';
import {LibraryMenu,instrumentPickerMarkup,libraryFocusKey,libraryFocusElement} from './library-menu';
import {EditSequence} from './edit-sequence';
import {PersonalEditQueue} from './personal-edit-queue';
import {ConsolidationDeferred,PersonalMemorySession,rawMemoryPersonal,type PersonalMemoryAction} from './personal-memory-session';
import {pendingPersonalConsolidation} from './personal-consolidation-request';
import {PersonalMemoryResolutionCache,personalMemoryResolutionKey,AfterPaintWork} from './personal-memory-cache';
import {PersonalMemoryLibrary} from './personal-memory-library';
import {withResolvedMemory,memoryAdviceEvidence,memoryReferenceTarget,memoryChoiceLabel,memorySourceLabel} from './personal-assistance';
import type {MemoryScoreInput,PersonalFingeringMemory} from './personal-fingering-memory';
import {effectiveAssignmentKey} from './personal-assignments';
import {EditorAdviceRunner,scoreAdviceContacts,analyzeEditorAdviceAsync,createAdviceCorpusState,replaceAdviceCorpusScore,type EditorAdviceResult} from './fingering-advice';
import {storedAdviceCorpus,saveAdviceCorpus} from './fingering-advice-store';
import {FingeringAdviceOptions,readFingeringAdviceSettings,type FingeringAdviceSettings} from './fingering-advice-settings';
import {selectedAdviceExplanations} from './fingering-advice-markers';
import {paintEditorAdvice} from './editor-advice-view';
import './fingering-advice.css';
import './personal-assistance.css';
import {handFor,restorePersonalAssignment,type PersonalHand} from './personal-assignments';
import {PersonalPresentationSession,undrawableHandOwners,cancelPersonalPrefetch,usePersonalProjectionCache} from './personal-presentation';
import {HandChoiceQueue,HandPreparationStatus,abandonedChoicesText,waitingOutcomeText,type WaitingHandChoice} from './hand-editing-wait';
import {DerivedFileCache} from './derived-file-cache';
import {readingAdmissionReceipt,reengraveReadingArchive} from './reading-package';
import {calculatedAdmissionEvidence} from './calculated-hand-edition';
import {isTauri} from '@tauri-apps/api/core';
import {PracticeClock} from './practice-clock';
import {practiceAudio} from './host';
import {readMidiMapping,readMidiBindings,type MidiBindings,type MidiMapping,type MidiCC,type MidiNote} from './midi';
import {scoreCapabilities,requirePianoCapability} from './score-capabilities';
const app=document.querySelector<HTMLElement>('#app')!;
let startupReady=false,startupFailed=false;
let entries:Entry[]=[],preferences:{version:1;libraryRotation:Rotation;displayRotation?:Rotation;bindings:Bindings;fingerBehavior:FingerBehavior;fingerPresentation:FingerPresentation;keyboardLayout:PhysicalKeyboardId;notationSystem?:'iso';midi?:MidiMapping;midiBindings?:MidiBindings;controlBindings?:ControlBindings;freeViewControls?:FreeViewControlOverrides;lastWorkedEntryId?:string;audioOutput?:string;piano?:PianoPreferences;fingeringAdvice?:FingeringAdviceSettings}={version:1,libraryRotation:0,bindings:defaultBindings(),...fingerPreferences(),keyboardLayout:'conventional-piano'},input=new InputController();
let pianoSettings=defaultPianoPreferences(),pianoWarning='',pianoOptions:PianoOptionsPanel|undefined;
let current:{entry:Entry;package:ScorePackage;personal:PersonalState}|undefined;let toolbarVisible=false,timer:number|undefined,dialog:HTMLDialogElement|undefined,focusReturn:HTMLElement|undefined;
let readingPresentation:ReadingPresentationController|undefined,readingViewError:string|undefined;const readingParts=new ReadingPartCatalog();
let job:{cancel:()=>void;entryId:string;state:'working'|'installing'|'complete'|'failed';progress:string}|undefined;
let selection:Seat|undefined,selectionPitchToggle=false;let editNavigation:'notes'|'measures'='notes';const editSequence=new EditSequence();let mainControls=readControlBindings(undefined,preferences);const controls=new ControlResolver(mainControls);const musicalSustain=new ObservedMidiSustain();let midiConnection:{source:string;generation:number}|undefined,readerFocused=true;let bindingOptions:OptionsBindingsPanel|undefined;let optionsNavigation:OptionsNavigation|undefined;let midiOptions:MidiOptionsPanel|undefined,audioOptions:AudioOptionsPanel|undefined;let midiTransition=0;let practiceOptionsCleanup:(()=>void)|undefined;let practiceFocusReturn:string|undefined;
let transposeControls:ManualTempoControls|undefined;const pitchInput=new PitchInputEpoch();
// This reader owns bounded exact-byte admission across revisits; library and Worker receivers own separate sessions.
const readerAdmission=new PackageAdmissionSession({maxEntries:2,maxRetainedBytes:64*1024*1024});
// Derived results this build already made are kept in bounded managed slots:
// native builds only. The browser's local storage is too small for pages, and
// a development server's source can change under one identity.
if(isTauri()&&!import.meta.env.DEV){
 const derived=new DerivedFileCache(host);
 usePersonalProjectionCache(derived);
 useReadingAdmissionReceipts({get:sha=>derived.get('reading-admission-v1',sha,readingAdmissionReceipt),put:(sha,receipt)=>void derived.put('reading-admission-v1',sha,receipt)});
 useCalculatedAdmissionEvidence({get:key=>derived.get('calculated-admission-v1',key,calculatedAdmissionEvidence),put:(key,evidence)=>void derived.put('calculated-admission-v1',key,evidence)});
}
type ReadingJob=NonNullable<typeof job>;
interface ReadingOperation {
 controller:AbortController;running:ReadingJob;dialog?:HTMLDialogElement;
 previous:typeof current;keyboard:PhysicalKeyboardId;generation:number;
 options?:string;optionsFocus?:string;
 /** The shared loading surface: ordered steps, engine stage detail and elapsed time. */
 loading:LoadingProgress;
}
let readingOperation:ReadingOperation|undefined,readingGeneration=0;
const READING_CANCELLED='Opening cancelled. Your score and choices are retained.';
const cancelledReading=()=>Error(READING_CANCELLED);
/** A failure already shown on its loading surface is not repeated as a notice. */
const shownFailures=new WeakSet<object>();
const reportFailure=(error:unknown)=>{if(!(error instanceof Object&&shownFailures.has(error)))notify((error as Error).message);};
function checkReadingOwner(op:ReadingOperation){
 if(readingOperation!==op||op.generation!==readingGeneration||op.controller.signal.aborted||job!==op.running||(op.dialog&&(!op.dialog.isConnected||dialog!==op.dialog)))throw cancelledReading();
}
function checkReading(op:ReadingOperation){
 checkReadingOwner(op);if(current!==op.previous||preferences.keyboardLayout!==op.keyboard)throw cancelledReading();
}
/** Give completed phases a visible frame without delaying ordinary interaction. */
async function paintCheckpoint(signal?:AbortSignal){
 await new Promise<void>(resolve=>{
  let finished=false,frame=0,task=0;
  const done=()=>{if(finished)return;finished=true;cancelAnimationFrame(frame);clearTimeout(task);clearTimeout(fallback);signal?.removeEventListener('abort',done);resolve();},
   fallback=window.setTimeout(done,60);
  signal?.addEventListener('abort',done,{once:true});
  frame=requestAnimationFrame(()=>{task=window.setTimeout(done,0);});
 });
}
async function readingCheckpoint(op:ReadingOperation){checkReading(op);await paintCheckpoint(op.controller.signal);checkReading(op);}
function readingDialog(op:ReadingOperation){
 checkReading(op);
 const d=showDialog(op.loading.markup(),'score-reading');op.loading.attach(d);if(op.running.state==='installing'&&op.loading.state!=='saving')op.loading.saving();
 op.dialog=d;d.addEventListener('close',()=>{if(op.dialog===d&&op.running.state==='working')op.running.cancel();},{once:true});return d;
}
/** A loading surface handed from an earlier dialog of the same request
 * (transposition, Earlier editions) to the score opening that completes it. */
let carriedLoading:LoadingProgress|undefined;
const scoreTitle=(entryId:string)=>entries.find(e=>e.id===entryId)?.metadata.title??'Score';
function openingLoading(entryId:string){return new LoadingProgress(scoreTitle(entryId),['check','hands','open'],{kicker:'Opening',cancel:true});}
function beginReading(entryId:string,loading?:LoadingProgress){
 const carried=carriedLoading;carriedLoading=undefined;
 if(job?.state==='installing')throw Error('A score is being saved. Try again in a moment.');
 libraryLoadingStatus?.remove();libraryLoadingStatus=undefined;
 job?.cancel();cancelPersonalPrefetch();
 loading??=carried??openingLoading(entryId);
 // A surface carried past its save stays uncancellable: the new edition is
 // already in the library, so Esc must not leave the reader on the old one.
 const controller=new AbortController(),running:ReadingJob={cancel:()=>controller.abort(),entryId,state:loading.state==='saving'?'installing':'working',progress:loading.statusText()},
  op:ReadingOperation={controller,running,previous:current,keyboard:preferences.keyboardLayout,generation:++readingGeneration,
   options:dialog?.dataset.kind==='options'?optionsSection:undefined,optionsFocus:(document.activeElement as HTMLElement)?.dataset.optionsKey,loading};
 readingOperation=op;job=running;practice?.pause();readingDialog(op);return op;
}
async function admitReading(bytes:Uint8Array,op:ReadingOperation){
 await readerAdmission.waitForIdle(op.controller.signal);checkReading(op);
 readingProgress(op,'check');
 const p=await readerAdmission.import(bytes,{allowLegacyTempo:true,execution:readingExecution(op)});await readingCheckpoint(op);
 if(p.manifest.files[GUITAR_PRO_FILES.descriptor]&&guitarProPreparedByEarlierConverter(p))notify(EARLIER_GUITAR_PRO_CONVERTER);
 else if(p.manifest.files[GUITAR_PRO_FILES.descriptor]){readingProgress(op,'check');await admitGuitarProContext(p,{signal:op.controller.signal,checkpoint:()=>readingCheckpoint(op)});await readingCheckpoint(op);}
 return p;
}
/** An edition other than the one being opened is read for its own facts
 * (source, hands, journals). One that must be engraved again is read as
 * content; opening it is what engraves it again. */
async function admitOrContent(bytes:Uint8Array):Promise<ScorePackage>{
 try{return await readerAdmission.import(bytes,{allowLegacyTempo:true});}
 catch(error){const content=await editionNeedsEngravingAgain(bytes,error);if(content)return content;throw error;}
}
function readingProgress(op:ReadingOperation,step:LoadingStepId){checkReadingOwner(op);op.loading.step(step);op.running.progress=LOADING_STEPS[step];}
/** Engine stages refine the current step; engraving has no time limit and
 * stays cancellable at every cooperative step. */
function readingExecution(op:ReadingOperation):ReadingExecution {
 return {signal:op.controller.signal,onCheckpoint:stage=>{checkReadingOwner(op);op.loading.stage(stage);}};
}
/** A failure the player did not ask for stays on its loading surface with
 * Close; a cancelled one simply closes. */
function holdFailure(loading:LoadingProgress,d:HTMLDialogElement,error:unknown,cancelled:boolean){
 if(dialog!==d)return;
 if(cancelled||!(error instanceof Error)||error.name==='AbortError'){loading.stop();closeDialog();return;}
 loading.fail(error.message,button('Close','close','Esc'));d.dataset.kind='loading-failed';shownFailures.add(error);
}
function suspendReadingDialog(op:ReadingOperation){checkReading(op);op.dialog=undefined;closeDialog(false);}
function finishReading(op:ReadingOperation,success:boolean,error?:unknown){
 if(readingOperation!==op){op.loading.stop();return;}
 op.running.state=success?'complete':'failed';
 // A failure the player did not ask for stays on its surface with Close.
 const shown=!success&&error instanceof Error&&error.name!=='AbortError'&&error.message!==READING_CANCELLED&&!op.controller.signal.aborted&&!op.options&&!!op.dialog&&dialog===op.dialog;
 if(shown){op.loading.fail(error.message,button('Close','close','Esc'));op.dialog!.dataset.kind='loading-failed';shownFailures.add(error);}
 else{op.loading.stop();if(dialog===op.dialog)closeDialog(false);}
 readingOperation=undefined;
 if(!success&&op.options&&current===op.previous){options(op.options);if(op.optionsFocus)dialog?.querySelector<HTMLElement>(`[data-options-key="${CSS.escape(op.optionsFocus)}"]`)?.focus();}
 if(!current)void refreshLibrarySummaries();
}
const readerPages=new ReaderPageCache();let dialogBack:(()=>void)|undefined;let optionsSection:string|undefined;let toolbarNavigation:OptionsNavigation|undefined;let dialogNavigation:OptionsNavigation|undefined;
let orientation=new ViewerOrientation(preferences);
const effectiveView=(view:PersonalState['view'])=>({...view,rotation:orientation.rotation});
let practice:PracticeView|ManualPracticeView|undefined,manualPracticeGeneration=0,practiceStartGeneration=0;const practiceSummaries=new LibraryPracticeSummaries();let librarySummaryPaintPending=false,libraryLoadingStatus:HTMLElement|undefined;
const libraryMenu=new LibraryMenu();
const matchingCurrent=(target:NonNullable<typeof current>)=>current&&current.entry.file===target.entry.file&&current.entry.id===target.entry.id&&current.package.sourceSha256===target.package.sourceSha256&&personalStorageName(current.entry.id,current.package)===personalStorageName(target.entry.id,target.package)?current:undefined;
const memoryLibrary=new PersonalMemoryLibrary(host,()=>entries,bytes=>readerAdmission.import(bytes,{allowLegacyTempo:true}));
const personalMemory=new PersonalMemorySession(host.assistanceStore!,{scanLibrary:()=>memoryLibrary.scan(),validateInputs:()=>memoryLibrary.validate(),awaitingEngraving:()=>memoryLibrary.awaitingEngraving});
const memoryInput=(target:NonNullable<typeof current>):MemoryScoreInput=>({entryId:target.entry.id,importedAt:target.entry.importedAt,p:target.package,personal:rawMemoryPersonal(target.personal)});
const memoryResolutions=new PersonalMemoryResolutionCache();
const resolveMemoryInput=(input:MemoryScoreInput)=>memoryResolutions.resolve(input,personalMemory.memoryGeneration,q=>personalMemory.resolve(q));
let memoryDocumentCache:PersonalFingeringMemory|undefined,memoryDocumentGeneration=-1;
function memoryDocument(){if(!memoryDocumentCache||memoryDocumentGeneration!==personalMemory.memoryGeneration){memoryDocumentCache=personalMemory.memory;memoryDocumentGeneration=personalMemory.memoryGeneration;}return memoryDocumentCache;}
function resolveMemory(target:NonNullable<typeof current>){const input=memoryInput(target);memoryLibrary.remember(input);return withResolvedMemory(input,resolveMemoryInput(input),personalMemory.memoryRevision);}
interface LivePersonalEditor {view:ScorePackage;visiblePersonal:PersonalState;session:PersonalPresentationSession;generation:number;recovering?:boolean;queue:PersonalEditQueue<PersonalState>;projections:Map<number,Promise<ScorePackage>>}
const livePersonalEditors=new WeakMap<NonNullable<typeof current>,LivePersonalEditor>();
function personalEditor(target:NonNullable<typeof current>):LivePersonalEditor {
 const existing=livePersonalEditors.get(target);if(existing)return existing;
 const editor:LivePersonalEditor={view:target.package,visiblePersonal:structuredClone(target.personal),session:new PersonalPresentationSession(target.package),generation:0,queue:undefined!,projections:new Map()};
 editor.queue=new PersonalEditQueue(personalStorageName(target.entry.id,target.package),async(snapshot,sequence)=>{const projected=await editor.projections.get(sequence);if(projected)resolvePersonalNavigation(snapshot,projected);await personalMemory.saveView({...memoryInput(target),personal:snapshot});editor.projections.delete(sequence);});
 livePersonalEditors.set(target,editor);return editor;
}
function readerPackage(){if(!current)throw Error('No open score.');return livePersonalEditors.get(current)?.view??current.package;}
function visibleSourceSeat(p:ScorePackage,seat:Seat):Seat|undefined {
 const aliases=p.seats.filter(s=>s.ownerIds.some(id=>seat.ownerIds.includes(id)));
 return aliases.find(s=>s.id===seat.id)??aliases.find(s=>s.page===seat.page&&!!s.continuation===!!seat.continuation)??aliases.find(s=>!s.continuation)??aliases[0];
}
function sourceNavigationAliases(p:ScorePackage,anchor:Pick<PersonalSourceAnchor,'owners'|'writtenBar'|'actionId'|'continuation'>){
 return p.seats.filter(s=>s.writtenBar===anchor.writtenBar&&s.actionId===anchor.actionId&&!!s.continuation===anchor.continuation&&s.ownerIds.some(id=>anchor.owners.includes(id))).sort((a,b)=>a.page-b.page||a.system-b.system||a.x-b.x||a.id.localeCompare(b.id));
}
function sourceNavigationAnchor(p:ScorePackage,seat:Seat|undefined):PersonalSourceAnchor|undefined {
 if(!seat||!Number.isSafeInteger(seat.writtenBar)||!seat.actionId||!seat.ownerIds.length)return;
 const anchor={owners:[...seat.ownerIds].sort(),writtenBar:seat.writtenBar,actionId:seat.actionId,continuation:!!seat.continuation},aliases=sourceNavigationAliases(p,anchor);
 return {...anchor,alias:Math.max(0,aliases.findIndex(s=>s.id===seat.id))};
}
function sourceNavigationSeat(p:ScorePackage,anchor:PersonalSourceAnchor|undefined){if(!anchor)return;const aliases=sourceNavigationAliases(p,anchor);return aliases[Math.min(anchor.alias,aliases.length-1)];}
function capturePersonalNavigation(state:PersonalState,p:ScorePackage,edit:Seat|undefined,followEdit:boolean){
 const page=p.seats.filter(s=>s.page===state.view.page).sort((a,b)=>a.system-b.system||a.x-b.x||a.id.localeCompare(b.id))[0],cursor=edit??sourceNavigationSeat(p,state.navigation?.edit)??p.seats.find(s=>s.contactId===state.editContactId);
 const pageAnchor=sourceNavigationAnchor(p,page),editAnchor=sourceNavigationAnchor(p,cursor);
 if(p.seats.length)state.navigation={version:1,page:pageAnchor,edit:editAnchor,followEdit};
 else delete state.navigation;
}
function resolvePersonalNavigation(state:PersonalState,p:ScorePackage){
 const page=sourceNavigationSeat(p,state.navigation?.page),edit=sourceNavigationSeat(p,state.navigation?.edit);
 state.view.page=Math.max(0,Math.min(p.pages.length-1,page?.page??state.view.page));
 if(edit){state.editContactId=edit.contactId;if(state.navigation?.followEdit&&!viewportFit(innerWidth,innerHeight,effectiveView(state.view),p.pages.length).pages.includes(edit.page)){state.view.page=edit.page;state.navigation.page=sourceNavigationAnchor(p,edit);}}
}
function paintPersonalSaveError(target:NonNullable<typeof current>,error:Error){
 if(current!==target)return;
 let status=app.querySelector<HTMLElement>('.personal-edit-status');
 if(!status){status=document.createElement('aside');status.className='personal-edit-status';status.setAttribute('role','alert');app.append(status);}
 status.replaceChildren();const message=document.createElement('span');message.textContent=`Choices haven’t been saved. ${error.message}`;status.append(message);
 const retry=document.createElement('button');retry.type='button';retry.textContent='Retry saving';retry.addEventListener('click',()=>{void retryPersonalEdits(target).catch(error=>paintPersonalSaveError(target,error));});status.append(retry);
 const retain=document.createElement('button');retain.type='button';retain.textContent='Keep a recovery copy';retain.addEventListener('click',()=>{void host.exportFeedback(JSON.stringify({version:'pending-personal-choices-v1',source:personalStorageName(target.entry.id,target.package),pending:personalMemory.recovery,navigation:personalEditor(target).queue.recovery},null,2)).catch(error=>notify(error.message));});status.append(retain);
}
async function retryPersonalEdits(target:NonNullable<typeof current>){
 const editor=personalEditor(target);if(editor.recovering)throw Error('Personal edit recovery is already running.');editor.recovering=true;try{
 await personalMemory.retry();for(const {sequence,snapshot} of editor.queue.recovery)editor.projections.set(sequence,editor.session.project(snapshot));await editor.queue.retry();const view=target.personal.view,navigation=target.personal.navigation,editContactId=target.personal.editContactId;target.personal=await loadPersonal(target.entry,target.package);target.personal.view=view;target.personal.navigation=navigation;target.personal.editContactId=editContactId;target.personal=resolveMemory(target);const generation=++editor.generation,projected=await editor.session.project(target.personal);
 if(current===target&&editor.generation===generation){
  const cursor=sourceNavigationAnchor(editor.view,selection);editor.view=projected;resolvePersonalNavigation(target.personal,projected);editor.visiblePersonal=structuredClone(target.personal);
  if(selection)selection=sourceNavigationSeat(projected,cursor)??visibleSourceSeat(projected,selection)??selection;
  app.querySelector('.personal-edit-status')?.remove();
  if(practice instanceof PracticeView){
   const owner=practice,handsChanged=target.package.score.notes.some(note=>handFor(target.package,owner.options.personal,note.id)!==handFor(target.package,target.personal,note.id));
   if(handsChanged){owner.holdForPersonalChoices();await refreshPersonalPractice(target,owner,generation);}
   else{owner.options.personal=target.personal;owner.releasePersonalChoices();owner.refit();}
  }else if(!practice){renderPages();renderToolbar();}
 }
 }finally{editor.recovering=false;}
}
const personalFile=(entry:Entry,p:ScorePackage)=>entry.personalFiles?.[personalStorageName(entry.id,p)]??personalStorageName(entry.id,p);
let persist=Promise.resolve();const enqueue=<T>(op:()=>Promise<T>):Promise<T>=>{const result=persist.then(op);persist=result.then(()=>{},error=>notify(error.message));return result;};
const esc=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function notify(text:string){let t=document.querySelector<HTMLElement>('.toast');if(!t){t=document.createElement('div');t.className='toast';t.setAttribute('role','status');document.body.append(t);}t.textContent=text;window.setTimeout(()=>{if(t?.textContent===text)t.textContent='';},6500);}
const button=(label:string,id:string,shortcut='',disabled=false)=>`<button type="button" data-action="${id}" ${disabled?'disabled':''}>${label}${shortcut?`<kbd>${esc(shortcut)}</kbd>`:''}</button>`;
async function savePreferences(){await enqueue(()=>writeJson('preferences.json',preferences));}
async function saveNotationSystem(choice:'iso'|'traditional'){
 if(choice!=='iso')throw Error('Traditional notation is not available yet.');
 await enqueue(async()=>{const next={...preferences,notationSystem:choice};await writeJson('preferences.json',next);preferences=next;});
}
async function saveReadingPreferences(op:ReadingOperation,target:NonNullable<typeof current>){
 await enqueue(()=>{checkReadingOwner(op);if(current!==target)throw cancelledReading();return writeJson('preferences.json',preferences);});
}
async function configurePiano(){if(!pianoSettings.enabled)return nativePiano.configure(pianoSettings,preferences.audioOutput??'',false);const bank=await nativePiano.bankStatus();if(!bank.installed)pianoSettings={...pianoSettings,enabled:false};return nativePiano.configure(pianoSettings,preferences.audioOutput??'',bank.installed);}
function savePiano(next:PianoPreferences):Promise<PianoAudioStatus>{return enqueue(async()=>{const admitted=readPianoPreferences(next),bank=await nativePiano.bankStatus();if(admitted.enabled&&!bank.installed)throw Error('Install piano before enabling sound.');const previous={...pianoSettings},status=await nativePiano.configure(admitted,preferences.audioOutput??'',bank.installed);if(admitted.enabled&&(status.error||!status.enabled))throw Error(status.error||'Piano sound could not start.');try{await writeJson('preferences.json',{...preferences,piano:admitted});}catch(error){await nativePiano.configure(previous,preferences.audioOutput??'',bank.installed).catch(()=>{});throw error;}preferences.piano=admitted;pianoSettings=admitted;pianoWarning='';return status;});}
async function personalContext(target:NonNullable<typeof current>){
 const entry=entries.find(e=>e.id===target.entry.id)??target.entry,active=matchingCurrent(target);let p=active?.package??target.package;
 if(!active&&entry.file!==target.entry.file)throw Error('The score edition changed; the pending choice stays with its previous edition.');
 return {entry,p,active,file:personalFile(entry,p)};
}
async function savePersonal(){if(!current)return;const target=current,snapshot=structuredClone(target.personal),shown=livePersonalEditors.get(target)?.view??target.package,
 anchor=sourceNavigationSeat(shown,snapshot.navigation?.page),cursor=current===target?selection:undefined;
 const follow=!!snapshot.navigation?.followEdit&&anchor?.page===snapshot.view.page&&(!cursor||sourceNavigationSeat(shown,snapshot.navigation.edit)?.ownerIds.some(id=>cursor.ownerIds.includes(id))===true);
 capturePersonalNavigation(snapshot,shown,cursor,follow);const view=snapshot.view;
 await personalMemory.flush();await livePersonalEditors.get(target)?.queue.flush();
 if(readingPresentation&&target.package.reading?.dual){if(readingViewError){notify(readingViewError);return;}const controller=readingPresentation;
  if(practice instanceof ManualPracticeView)controller.adoptView(practice.options.context.viewRecord());
  const record=practice instanceof ManualPracticeView?controller.record():retainManualReaderView(controller,view);await enqueue(()=>writeJson(controller.storageName,record));return;}
 if(scoreCapabilities(target.package).pianoPreparation){const projected=await personalEditor(target).session.project(snapshot);resolvePersonalNavigation(snapshot,projected);await personalMemory.saveView({...memoryInput(target),personal:snapshot});return;}
 await enqueue(async()=>{const {entry,p,file}=await personalContext(target),latest=await loadPersonalJournal(host,entry,p);latest.view=snapshot.view;latest.editContactId=snapshot.editContactId;latest.navigation=snapshot.navigation;await writeJson(file,latest);});
}
function savePersonalQuietly(){const target=current;void savePersonal().catch(error=>{if(target)paintPersonalSaveError(target,error);else notify(error.message);});}
/** Painting follows accepted intent, never the completion order of host writes. */
async function presentPersonalChange(target:NonNullable<typeof current>,personal:PersonalState,saved:Promise<void>,nextSeat?:Seat,previous=target.personal){
 const editor=personalEditor(target),generation=++editor.generation,before=previous;
 target.personal=personal;target.personal=resolveMemory(target);if(nextSeat&&current===target)selection=nextSeat;
 let next=target.personal;
 capturePersonalNavigation(next,editor.view,current===target?selection:undefined,!!nextSeat||!!next.navigation?.followEdit);
 const navigation=JSON.stringify([next.view,next.editContactId,next.navigation]),
  attempted=next,projection=editor.session.project(next).catch(async error=>{const kept=await keepDrawableHands(target,attempted,error,id=>handFor(target.package,before,id));
   if(editor.generation===generation)next=target.personal;
   if(kept.keys)notify(kept.keys===1?'That hand can’t be drawn on the page yet, so the note keeps the hand it had.':'Those hands can’t be drawn on the page yet, so the notes keep the hands they had.');
   return kept.view;}),
  navigationReceipt=editor.queue.accept(next);editor.projections.set(navigationReceipt.sequence,projection);
 void navigationReceipt.saved.catch(error=>paintPersonalSaveError(target,error));
 const ownerPractice=target===current&&practice instanceof PracticeView?practice:undefined,
  handsChanged=!!ownerPractice&&target.package.score.notes.some(note=>handFor(target.package,ownerPractice.options.personal,note.id)!==handFor(target.package,next,note.id));
 if(handsChanged)ownerPractice!.holdForPersonalChoices();
 adviceKey='';adviceRunner.cancel();void saved.catch(error=>paintPersonalSaveError(target,error));
 const projected=await projection;
 if(current===target&&editor.generation===generation){
  const cursor=sourceNavigationAnchor(editor.view,selection);editor.view=projected;
  if(JSON.stringify([target.personal.view,target.personal.editContactId,target.personal.navigation])===navigation)resolvePersonalNavigation(target.personal,projected);
  editor.visiblePersonal=structuredClone(target.personal);
  if(selection)selection=sourceNavigationSeat(projected,cursor)??visibleSourceSeat(projected,selection)??selection;
  if(selection)target.personal.editContactId=selection.contactId;
  if(ownerPractice&&practice===ownerPractice){if(handsChanged)await refreshPersonalPractice(target,ownerPractice,generation);else{ownerPractice.options.personal=next;ownerPractice.releasePersonalChoices();ownerPractice.refit();}}
  else if(!practice){renderPages();renderToolbar();focusSelection();}
 }
 // Another process may have won a CAS race. Refresh only this still-current
 // generation; never install a saved snapshot over subsequent keyboard intent.
 void saved.then(async()=>{if(current!==target||editor.generation!==generation)return;
  const before=target.personal,latest=personalMemory.personalFor(memoryInput(target));latest.view=before.view;latest.editContactId=before.editContactId;latest.navigation=before.navigation;target.personal=latest;const resolved=resolveMemory(target);
  // A refused hand from the other writer returns to the hand this view had.
  if(effectiveAssignmentKey(target.package,resolved)!==effectiveAssignmentKey(target.package,before))await presentPersonalChange(target,resolved,Promise.resolve(),undefined,before);
  else{target.personal=resolved;editor.visiblePersonal=structuredClone(resolved);if(before.memoryResolved?.revision!==resolved.memoryResolved?.revision&&!practice){adviceKey='';renderToolbar();}}
 }).catch(error=>paintPersonalSaveError(target,error));
}
/** A hand choice the engraver can't fit yet is not kept: its notes return to
 * the hand they had, as the player's own decision, so a saved choice can never
 * stop the score from opening. Other refusals, and a choice whose notes had no
 * hand to return to, still reach the player unchanged. `attempted` is the
 * refused state; a note whose hand has changed since then is left as it is. */
async function keepDrawableHands(target:NonNullable<typeof current>,attempted:PersonalState,error:unknown,hadHand:(ownerId:string)=>PersonalHand|null,execution?:ReadingExecution):Promise<{view:ScorePackage;keys:number}>{
 const returned=new Set<string>();
 for(let attempt=0;;attempt++){
  const refused=undrawableHandOwners(error),seats=refused?target.package.seats.filter(seat=>seat.ownerIds.some(id=>refused.includes(id))):[];
  if(!refused||!seats.length||attempt>=3)throw error;
  let changed=false;
  for(const seat of seats){
   const ownerId=seat.ownerIds.find(id=>refused.includes(id))!,refusedHand=handFor(target.package,attempted,ownerId);
   if(handFor(target.package,target.personal,ownerId)!==refusedHand){changed=true;continue;}
   const hand=hadHand(ownerId);if(!hand||hand===refusedHand)throw error;
   const receipt=personalMemory.accept(memoryInput(target),{kind:'hand',ownerId,hand,decisionId:crypto.randomUUID(),authoredAt:new Date().toISOString()});
   target.personal=receipt.personal;target.personal=resolveMemory(target);returned.add(ownerId);changed=true;
   void receipt.saved.catch(saveError=>paintPersonalSaveError(target,saveError));
  }
  if(!changed)throw error;
  attempted=target.personal;
  try{return {view:await personalEditor(target).session.project(target.personal,execution),keys:returned.size};}catch(next){error=next;}
 }
}
async function acceptMemoryAction(target:NonNullable<typeof current>,action:PersonalMemoryAction,nextSeat?:Seat){
 if(personalEditor(target).recovering)throw Error('Personal edit recovery is already running.');if(personalEditor(target).queue.error)throw personalEditor(target).queue.error;
 // Actions that can give a note a personal hand are refused on a score whose own engraving is refused.
 if(['hand','reference','calculated','undoRestore'].includes(action.kind)&&scoreCapabilities(target.package).pianoPreparation){
  const wait=handEditingWait(target);if(wait&&(!await wait.ready||current!==target))throw cancelledReading();}
 const receipt=personalMemory.accept(memoryInput(target),action);
 await presentPersonalChange(target,receipt.personal,receipt.saved,nextSeat);return receipt;
}
/** Replace both notation and hand grouping together, retaining the exact saved
 * exercise evidence and UI context. No completion is invalidated by an edit. */
async function refreshPersonalPractice(target:NonNullable<typeof current>,owner:PracticeView,generation:number){
 const owns=()=>current===target&&practice===owner&&personalEditor(target).generation===generation;
 while(owns()){
  await owner.flush();if(!owns())return;
  // Restoring choices can leave notes hand-less again: return to reading and say why.
  try{requirePracticeHands(target.package,target.personal);}catch(error){owner.close();practice=undefined;resetInput();render();notify((error as Error).message);return;}
  const context=owner.contextSnapshot(),admitted=await PracticeView.prepareContext(target.package,target.entry.id,context,target.personal);
  if(!owns())return;
  // Options remain usable during admission. A later settings or navigation
  // choice must be admitted again rather than replaced by the earlier context.
  if(JSON.stringify(owner.contextSnapshot())!==JSON.stringify(context))continue;
  owner.close();await startPractice(context,admitted);return;
 }
}
function labelMode(){if(!current)return 'pitch';const available=fingerDisplayAvailable(current.package,current.personal,currentFingerPresentation());return effectiveLabelMode(current.personal.view,preferences.fingerBehavior,input.fingersHeld||controls.fingersHeld,available,!!selection,selectionPitchToggle);}
function toggleLabel(){return preferences.fingerBehavior==='momentary'?(selection?'Hold pitches':'Hold fingerings'):selection?(labelMode()==='pitch'?'Show fingerings':'Show pitches'):(labelMode()==='pitch'?'Show fingerings':'Hide fingerings');}
function refreshPresentation(){if(practice){practice.overlay(preferences.fingerBehavior==='momentary'?input.fingersHeld||controls.fingersHeld:current?.personal.view.labelMode==='finger');return;}if(!current||!app.querySelector('.page-group'))return;renderPages();const toggle=app.querySelector('[data-action=toggle]');if(toggle)toggle.innerHTML=toggleLabel()+`<kbd>${esc(actionControlLabel(controls.bindings,'toggle'))}</kbd>`;app.querySelector('[data-action=toggle]')?.setAttribute('aria-pressed',String(labelMode()==='finger'));const status=app.querySelector('[data-label-mode]');if(status)status.textContent=labelMode()==='finger'?'Fingers':'Pitch';}
const effectiveControls=()=>practice instanceof PracticeView?practiceControlBindings(freeViewControlBindings(mainControls,preferences.freeViewControls)):practice?practiceControlBindings(freeViewControlBindings(mainControls,preferences.freeViewControls),false):selection?editorControlBindings(mainControls):readerControlBindings(mainControls);
const rotationHint=()=>Object.values(effectiveControls().actions).some(slots=>slots.some(binding=>binding?.kind==='key'&&binding.key===rotationKey))?'':readableChord(rotationKey);
let resolvedMain=mainControls,resolvedLocal=preferences.freeViewControls,resolvedPractice='reader';
function syncControls(){const inPractice=practice instanceof PracticeView?'piano':practice?'manual':selection?'editor':'reader';if(resolvedMain===mainControls&&resolvedLocal===preferences.freeViewControls&&resolvedPractice===inPractice)return;const next=effectiveControls();resolvedMain=mainControls;resolvedLocal=preferences.freeViewControls;resolvedPractice=inPractice;if(JSON.stringify(next)===JSON.stringify(controls.bindings))return;const fingers=controls.fingersHeld;controls.configure(next);if(fingers)refreshPresentation();}
function resetInput(){practice?.cancelTempoHold();const keys=input.clear(),pedal=controls.clear();syncControls();if(keys||pedal)refreshPresentation();}
function focusSelection(){if(selection&&!dialog)app.querySelector<SVGTextElement>(`[data-viewer-seat="${selection.id}"]`)?.focus();}
function selectFinger(step?:number){editSequence.reset();if(!current)return;requirePianoCapability(current.package,'pianoPreparation');const shownPackage=readerPackage(),units=editUnits(shownPackage),index=selection?units.findIndex(s=>s.contactId===selection!.contactId):-1;if(!selection){selectionPitchToggle=false;editNavigation='notes';resetInput();personalEditor(current).session.prefetch();}selection=step===undefined?selectionOnPage(shownPackage,selection?.contactId??current.personal.editContactId,current.personal.view.page):units[moveSelection(index,step,units.length)];if(!selection){notify('No editable notes on this page.');return;}current.personal.editContactId=selection.contactId;const shown=viewportFit(innerWidth,innerHeight,effectiveView(current.personal.view),readerPackage().pages.length).pages;if(!shown.includes(selection.page))current.personal.view.page=selection.page;savePersonalQuietly();renderPages();renderToolbar();focusSelection();}
function selectFingerSystem(direction:-1|1){
 if(!current||!selection)return;
 const next=systemSelection(readerPackage(),selection,direction);
 if(next.id===selection.id)return;
 editSequence.reset();selection=next;current.personal.editContactId=next.contactId;
 const shown=viewportFit(innerWidth,innerHeight,effectiveView(current.personal.view),readerPackage().pages.length).pages;
 if(!shown.includes(next.page))current.personal.view.page=next.page;
 savePersonalQuietly();renderPages();renderToolbar();focusSelection();
}
function selectFingerMeasure(direction:-1|1){
 if(!current||!selection)return;
 const next=measureSelection(readerPackage(),selection,direction);if(next.id===selection.id)return;
 editSequence.reset();selection=next;current.personal.editContactId=next.contactId;
 const shown=viewportFit(innerWidth,innerHeight,effectiveView(current.personal.view),readerPackage().pages.length).pages;
 if(!shown.includes(next.page))current.personal.view.page=next.page;
 savePersonalQuietly();renderPages();renderToolbar();focusSelection();
}
function exitSelection(){adviceKey='';adviceRunner.cancel();editSequence.reset();selection=undefined;editNavigation='notes';selectionPitchToggle=false;resetInput();renderPages();renderToolbar();app.querySelector<HTMLElement>('.reader')?.focus();}
function gainFocus(){readerFocused=true;}
function loseFocus(){bindingOptions?.blur();midiOptions?.cancelListening();musicalSustain.clear();if(practice instanceof PracticeView)practice.clearHeldInput();practice?.pause();readerFocused=false;selectionPitchToggle=false;resetInput();practice?.pause();if(selection){refreshPresentation();renderToolbar();}}
function transformSurface(el:HTMLElement,_rotation:Rotation){fitSurface(el,orientation.rotation);}
function renderLibrary(focusKey=libraryFocusKey(document.activeElement)){
 readerPages.clear();toolbarNavigation?.dispose();toolbarNavigation=undefined;librarySummaryPaintPending=false;
 app.innerHTML=`<section class="surface"><div class="library"><header><h1>Scores</h1><nav aria-label="Library actions">${instrumentPickerMarkup(preferences.keyboardLayout)}${button('Import','import','M')}${button('Rotate','rotate',rotationHint())}${button('Options','options',actionControlLabel(mainControls,'practiceSettings'))}${button('Exit','exit')}</nav></header><div class="scores" aria-label="Composers and scores"></div>${entries.length?'':'<p class="empty">Add a score to begin.<br><small>Import a .tuna score, a MusicXML file or a Guitar Pro file.</small></p>'}<p class="job">${job?.state==='working'?esc(job.progress):''}</p></div></section>`;
 const libraryNavigation=document.createElement('nav');libraryNavigation.className='library-navigation';libraryNavigation.setAttribute('aria-label','Library navigation');app.querySelector('.surface')!.append(libraryNavigation);arrangeBottomNavigation(libraryNavigation,null,app.querySelector<HTMLButtonElement>('[data-action=options]'));
 transformSurface(app.querySelector('.surface')!,preferences.libraryRotation);
 libraryMenu.mount(app,entries,preferences.lastWorkedEntryId,entry=>{const summary=practiceSummaries.get(entry,preferences.keyboardLayout);return `${readingParts.summary(entry)?esc(readingParts.summary(entry))+' · ':''}${esc(entry.metadata.opusLabel??'')}${entry.metadata.piece?` · No. ${entry.metadata.piece}`:''}${entry.metadata.variant?` · ${esc(entry.metadata.variant)}`:''}${summary?` · Sections ${practicePercent(summary.sections)}%${summary.whole?' · Whole piece at goal':''}`:''}`;},preferences.keyboardLayout,async value=>{if(!await switchKeyboard(value))throw Error('Instrument selection was not saved. Try again.');});
 const restore=libraryFocusElement(app,focusKey);if(restore&&!restore.hidden)restore.focus();else if(entries.length)libraryMenu.focus();else app.querySelector<HTMLElement>('[data-action=import]')?.focus();
}
function render(){if(!current){renderLibrary();return;}orientation.admitReader(current.personal.view.rotation);app.innerHTML=`<section class="surface"><div class="reader" tabindex="-1" aria-label="Score pages"><div class="page-group"></div></div><div class="editor-navigation" hidden></div><nav class="toolbar" aria-label="Reader controls"></nav></section>`;renderPages();renderToolbar();paintHandPreparation();app.querySelector<HTMLElement>('.reader')?.focus();}
function renderPages(){
 if(practice||!current)return;
 const p=readerPackage(),s={...(livePersonalEditors.get(current)?.visiblePersonal??current.personal),view:current.personal.view},v=effectiveView(s.view),mode=labelMode(),surface=app.querySelector<HTMLElement>('.surface')!,group=app.querySelector<HTMLElement>('.page-group')!;
 transformSurface(surface,v.rotation);const fit=viewportFit(innerWidth,innerHeight,v,p.pages.length),positions=annotationPositions(p,fit.pages),pages:HTMLElement[]=[];
 for(const index of fit.pages){
  const cached=readerPages.get(p,index),page=cached.element;paintReaderSeats(cached,current.package,p,s,mode,positions,true);
  for(const {seat,text} of cached.seats){
   if(mode==='finger'||selection){text.setAttribute('tabindex',selection?.id===seat.id?'0':'-1');text.setAttribute('role','button');}else{text.removeAttribute('tabindex');text.removeAttribute('role');}
   if(selection?.contactId===seat.contactId)text.dataset.editSelected='true';else delete text.dataset.editSelected;
  }
  paintEditorAdvice(page,p,index,editorAdvice,!!selection);pages.push(page);
 }
 mountReaderPages(group,pages);group.style.transform=`scale(${fit.scale})`;app.dataset.notation=p.reading?.dual?.notation??'iso';app.dataset.mode=mode;app.dataset.fingerSet=v.fingerSet;app.dataset.page=String(v.page);app.dataset.rotation=String(v.rotation);app.dataset.selecting=String(!!selection);
 if(selection&&!dialog&&!app.querySelector('.toolbar')?.contains(document.activeElement))focusSelection();
}
/** Reader and PDF pages share one finger/hand paint; only interaction differs. */
function paintReaderSeats(page:ReaderPage,base:ScorePackage,p:ScorePackage,s:PersonalState,mode:'pitch'|'finger',positions:ReadonlyMap<string,AnnotationPosition>,interactive:boolean){
 page.element.dataset.fingers=String(mode==='finger');const presentation=currentFingerPresentation(p);
 for(const {seat,text} of page.seats){
  const finger=fingerFor(base,s,seat),hand=handFor(base,s,seat.ownerIds[0]);
  paintFinger(text,seat,{visible:mode==='finger'&&finger!==undefined,presentation,finger,position:positions.get(seat.id)!,interactive,label:mode==='finger'?`Pitch ${seat.pitchDigit}, finger ${finger}, ${hand??'no hand'}, bar ${seat.writtenBar}`:`Pitch ${seat.pitchDigit}, bar ${seat.writtenBar}`});
  if(hand)text.dataset.performingHand=hand;else delete text.dataset.performingHand;
 }
}
/** Save every page as the reader currently reads it: this edition, keyboard
 * layout, personal hands/fingers and label mode. Editing selection and advice
 * marks are not score ink and stay out. Nothing is written to managed data. */
let pdfSaving=false;
async function savePdf(){
 // One export at a time: the save dialog leaves the reader clickable.
 if(!current||practice||pdfSaving)return;pdfSaving=true;
 try{
  const target=current,p=readerPackage(),s={...(livePersonalEditors.get(target)?.visiblePersonal??target.personal),view:target.personal.view},mode=labelMode(),indices=p.pages.map((_,index)=>index),positions=annotationPositions(p,indices);
  await document.fonts.ready;
  // Drawing every page holds the reader for a moment; say so first.
  notify(`Preparing ${indices.length} page${indices.length===1?'':'s'} for the PDF…`);await paintCheckpoint();if(current!==target||practice)return;
  const svgs=indices.map(index=>{const page=createReaderPage(p,index);paintReaderSeats(page,target.package,p,s,mode,positions,false);return page.element.querySelector('svg')!;});
  const size=scorePageSize(svgs),filename=scorePdfFilename(target.entry.metadata.title),unmount=mountScorePrint(document,svgs,size);
  try{notify(pdfSaveMessage(await host.savePdf(filename,size),filename,svgs.length,mode));}finally{unmount();}
 }finally{pdfSaving=false;}
}
function renderToolbar(){if(practice)return;if(!current)return;syncControls();renderEditorNavigation();const {personal:s}=current,p=readerPackage(),v=s.view,capabilities=scoreCapabilities(p);const bar=app.querySelector<HTMLElement>('.toolbar')!,focused=bar.contains(document.activeElement)?document.activeElement as HTMLElement:undefined,focusSelector=focused?.dataset.action?`[data-action="${focused.dataset.action}"]`:focused?.dataset.optionsKey?`[data-options-key="${CSS.escape(focused.dataset.optionsKey)}"]`:focused?.dataset.option?`[data-options-key="${focused.dataset.option}"]`:undefined;toolbarNavigation?.dispose();bar.className=`toolbar${toolbarVisible?' visible':''}`;bar.innerHTML=`${button('Back','library','Esc')}${button('Previous','previous',actionControlLabel(controls.bindings,'previous'),v.page===0)}<small>${v.page+1} / ${p.pages.length}</small>${button('Next','next',actionControlLabel(controls.bindings,'next'),v.page===p.pages.length-1)}${capabilities.pianoPreparation?`${button(toggleLabel(),'toggle',actionControlLabel(controls.bindings,'toggle'),!fingerDisplayAvailable(p,s,currentFingerPresentation(p)))}<small data-label-mode>${labelMode()==='finger'?'Fingers':'Pitch'}</small>`:''}<select aria-label="Visible pages" data-option="count">${[1,2,3].map(n=>`<option value="${n}" ${v.count===n?'selected':''}>${n} page${n>1?'s':''}</option>`).join('')}</select>${v.count>1?`<select aria-label="Page advancement" data-option="advance"><option value="slide" ${v.advance==='slide'?'selected':''}>Slide pages</option><option value="group" ${v.advance==='group'?'selected':''}>Replace group</option></select>`:''}<select aria-label="Score scale" data-option="scale">${[1,.9,.75,.5].map(n=>`<option value="${n}" ${v.scale===n?'selected':''}>${Math.round(n*100)}%</option>`).join('')}</select>${capabilities.pianoPreparation?`${button(selection?'Done editing':'Edit hands / fingers',selection?'end-edit':'edit',selection?'Esc':actionControlLabel(controls.bindings,'edit'))}`:''}${button('Rotate','rotate',rotationHint())}${capabilities.pianoPractice||!!readingPresentation&&capabilities.manualPractice?button('Practice','practice','P'):''}${keyboardControl(p)}${readingNotationControl(p)}${button('Share score','share')}${button('Save as PDF','pdf')}${button('Options','practiceSettings',actionControlLabel(controls.bindings,'practiceSettings'))}${button('Hide','hide','H')}`;arrangeBottomNavigation(bar,bar.querySelector<HTMLButtonElement>('[data-action=library]'),bar.querySelector<HTMLButtonElement>('[data-action=practiceSettings]'));toolbarNavigation=new OptionsNavigation(bar,()=>{},()=>false,{horizontal:true,focusOnPrepare:false});if(focusSelector)bar.querySelector<HTMLElement>(focusSelector)?.focus();}
function reveal(focus=false){const changed=!toolbarVisible;toolbarVisible=true;if(current&&changed)renderToolbar();clearTimeout(timer);timer=window.setTimeout(()=>{if(!dialog&&!app.querySelector('.toolbar')?.contains(document.activeElement)){toolbarVisible=false;if(current)renderToolbar();}},3500);if(focus)app.querySelector<HTMLElement>('.toolbar button')?.focus();}
async function loadPersonal(entry:Entry,p:ScorePackage){return scoreCapabilities(p).pianoPreparation?personalMemory.loadPersonalCurrent(entry,p,()=>loadPersonalJournal(host,entry,p)):loadPersonalJournal(host,entry,p);}
function renderEditorNavigation(){
 const control=app.querySelector<HTMLElement>('.editor-navigation');if(!control)return;
 control.hidden=!selection;if(!selection)return;refreshEditorAdvice();
 const focused=control.contains(document.activeElement);
 control.innerHTML=`<button data-action="editorNavigation" aria-label="Edit navigation: ${editNavigation==='notes'?'Notes':'Measures'}" aria-pressed="${editNavigation==='measures'}">${editNavigation==='notes'?'Notes':'Measures'} <kbd>${esc(actionControlLabel(controls.bindings,'editorNavigation'))}</kbd></button>`;
 control.insertAdjacentHTML('beforeend',editorMemoryMarkup());
 if(focused)control.querySelector<HTMLElement>('button')?.focus();
}
let adviceOptions:FingeringAdviceOptions|undefined,editorAdvice:EditorAdviceResult|undefined,adviceKey='';
const adviceWork=new AfterPaintWork();
const adviceRunner=new EditorAdviceRunner(result=>{editorAdvice=result;paintAdviceOnly();});
function paintAdviceOnly(){
 if(!current||practice)return;const p=readerPackage();
 for(const page of app.querySelectorAll<HTMLElement>('.page-group .page'))paintEditorAdvice(page,p,Number(page.dataset.page),editorAdvice,!!selection);
 const explanation=app.querySelector<HTMLElement>('[data-advice-explanation]');if(explanation)explanation.textContent=selectedWarningText();
}
function selectedWarningText(){return current&&selection?selectedAdviceExplanations(editorAdvice,'edit',selection.ownerIds,ids=>{const seat=readerPackage().seats.find(s=>s.ownerIds.some(id=>ids.includes(id)));return seat?`measure ${seat.writtenBar}`:'previous contact';}).join(' '):'';}
function refreshEditorAdvice(){
 if(!current||!selection||practice)return;
 const target=current,settings=readFingeringAdviceSettings(preferences.fingeringAdvice),key=JSON.stringify([personalMemoryResolutionKey({entryId:target.entry.id,p:target.package,personal:target.personal},personalMemory.memoryGeneration),settings]);
 if(adviceKey===key)return;adviceKey=key;adviceRunner.cancel();
 adviceWork.schedule(()=>{if(current!==target||!selection||practice||adviceKey!==key)return;runEditorAdvice(target,key,settings);});
}
function runEditorAdvice(target:NonNullable<typeof current>,key:string,settings:FingeringAdviceSettings){
 const input=memoryInput(target),memory=memoryDocument();
 void adviceRunner.run({scoreId:input.entryId,sourceRevision:input.p.sourceRevision??input.p.manifest.revision,assignmentRevision:key,settingsRevision:JSON.stringify(settings)},async signal=>{
  if(!memoryLibrary.scanned)await memoryLibrary.scan();signal.throwIfAborted();
  const inputs=memoryLibrary.inputs.map(cached=>({...cached,personal:personalMemory.personalFor(cached)}));
  const contextKey=await hashBytes(JSON.stringify([memory.revision,inputs.map(other=>{const resolved=resolveMemoryInput(other);return[personalStorageName(other.entryId,other.p),other.p.manifest.revision,other.p.sourceSha256,activeLayer(other.p,other.personal),resolved.assignments,[...memoryAdviceEvidence(other,resolved)]];}).sort((a,b)=>String(a[0]).localeCompare(String(b[0])))]));
  signal.throwIfAborted();let corpus=storedAdviceCorpus(await host.assistanceStore!.read(),memory.revision,contextKey);
  if(!corpus){corpus=createAdviceCorpusState();
   for(const other of inputs){
    signal.throwIfAborted();const resolution=resolveMemoryInput(other),scoreId=personalStorageName(other.entryId,other.p),context={playerId:memory.playerId,scoreId,revision:memory.revision,evidenceByOwner:memoryAdviceEvidence(other,resolution)};
    const analysis=await analyzeEditorAdviceAsync(scoreAdviceContacts(other.p,resolution.assignments,{layer:activeLayer(other.p,other.personal)}),context,corpus.corpus,settings,signal);
    corpus=replaceAdviceCorpusScore(corpus,memory.playerId,scoreId,memory.revision,analysis.observations);
   }
   const captured=corpus;
   void personalMemory.flush().then(()=>saveAdviceCorpus(host.assistanceStore!,{version:1,memoryRevision:memory.revision,contextKey,state:captured},()=>!signal.aborted&&adviceKey===key)).catch(error=>{if(!signal.aborted&&adviceKey===key)notify(`Fingering warning history was not saved: ${(error as Error).message}`);});
  }
  signal.throwIfAborted();const resolution=resolveMemoryInput(input);
  return analyzeEditorAdviceAsync(scoreAdviceContacts(input.p,resolution.assignments,{layer:activeLayer(input.p,input.personal)}),{playerId:memory.playerId,scoreId:personalStorageName(input.entryId,input.p),revision:memory.revision,evidenceByOwner:memoryAdviceEvidence(input,resolution)},corpus.corpus,settings,signal);
 }).catch(error=>{if(adviceKey===key)notify(`Fingering warnings unavailable: ${(error as Error).message}`);});
}
interface SourceReturn {entryId:string;file:string;sourceRevision:string;view:PersonalState['view'];selection?:PersonalSourceAnchor;mode:'notes'|'measures';pitchToggle:boolean}
let sourceReturn:SourceReturn|undefined,sourceNavigating=false;
function editorMemoryMarkup(){
 if(!current||!selection)return'';
 const input=memoryInput(current),resolution=resolveMemoryInput(input),ownerId=selection.ownerIds[0],label=input.personal.calculatedOwners?.[ownerId]?'Local':memoryChoiceLabel(resolution,ownerId),reference=memoryReferenceTarget(input,resolution,ownerId),description=memorySourceLabel(memoryDocument(),resolution,ownerId,id=>entries.find(e=>e.id===id)?.metadata.title??'Score');
 const self=reference?.entryId===current.entry.id&&reference.ownerId===ownerId;
 return `${label?`<span class="personal-choice-kind" title="${esc(description)}" aria-label="${esc(label+'. '+description)}">${label}</span>`:''}${button(sourceReturn?'Return':'Source','editorSource',actionControlLabel(controls.bindings,'editorSource'),!sourceReturn&&(!reference||self))}${resolution.byOwner[ownerId]?.personal?button('Use for matching measures','memory-reference'):''}${label==='Local'?button('Use shared','memory-inherit'):''}<span class="fingering-advice-explanation" data-advice-explanation>${esc(selectedWarningText())}</span>`;
}
async function visitMemorySource(){
 if(!current||!selection||sourceNavigating)return;sourceNavigating=true;
 try{
 if(sourceReturn){
  const departure=sourceReturn,entry=entries.find(e=>e.id===departure.entryId);if(!entry||entry.file!==departure.file)throw Error('The departure edition is no longer active. Your choices are retained.');
  if(current.entry.id!==departure.entryId||current.entry.file!==departure.file)await open(entry);
  if(!current||current.package.sourceRevision!==departure.sourceRevision&&current.package.manifest.revision!==departure.sourceRevision)throw Error('The departure source changed. Your choices are retained.');
  current.personal.view={...departure.view};selection=sourceNavigationSeat(readerPackage(),departure.selection);editNavigation=departure.mode;selectionPitchToggle=departure.pitchToggle;sourceReturn=undefined;
 }else{
  const input=memoryInput(current),reference=memoryReferenceTarget(input,resolveMemoryInput(input),selection.ownerIds[0]);
  if(!reference)throw Error('The reference score is unavailable; its shared choices are retained.');
  const entry=entries.find(e=>e.id===reference.entryId);if(!entry)throw Error('The reference score is unavailable; its shared choices are retained.');
  if(current.entry.id!==entry.id){const bytes=await host.read(entry.file);if(!bytes)throw Error('The reference score is unavailable.');const archive=await admitOrContent(bytes),candidate=archive.availablePresentations?.includes(current.package.keyboardLayout!)?await selectPresentation(archive,current.package.keyboardLayout!):archive;if((candidate.sourceRevision??candidate.manifest.revision)!==reference.sourceRevision)throw Error('The reference edition is unavailable; its shared choices are retained.');}
  const departure:SourceReturn={entryId:current.entry.id,file:current.entry.file,sourceRevision:current.package.sourceRevision??current.package.manifest.revision,view:{...current.personal.view},selection:sourceNavigationAnchor(readerPackage(),selection),mode:editNavigation,pitchToggle:selectionPitchToggle};
  if(current.entry.id!==entry.id)await open(entry);
  if(!current||current.package.sourceRevision!==reference.sourceRevision&&current.package.manifest.revision!==reference.sourceRevision)throw Error('The reference edition is unavailable; its shared choices are retained.');
  const seat=readerPackage().seats.find(s=>s.writtenBar===reference.writtenBar&&s.ownerIds.includes(reference.ownerId));if(!seat)throw Error('The reference note is unavailable in this edition.');
  sourceReturn=departure;selection=seat;current.personal.view.page=seat.page;current.personal.editContactId=seat.contactId;editNavigation=departure.mode;
 }
 editSequence.reset();resetInput();renderPages();renderToolbar();focusSelection();savePersonalQuietly();
 }finally{sourceNavigating=false;}
}
/** An explicit delivery request is consumed only by the application, after its
 * own queues have drained. No outside tool rewrites a live personal journal.
 * A request that needs a score whose saved engraving is out of date is not
 * applied; it stays pending, the library opens and the player is told. */
async function applyPendingConsolidation(){
 const request=await pendingPersonalConsolidation(host.assistanceStore!,entries.map(entry=>entry.id));if(!request)return;
 await persist;await personalMemory.flush();
 try{await personalMemory.consolidate({...request,isSafe:()=>!practice&&!current&&!readingOperation&&!startupReady});}
 catch(error){if(!(error instanceof ConsolidationDeferred))throw error;const titles=error.entryIds.map(id=>entries.find(e=>e.id===id)?.metadata.title).filter(Boolean);
  startupNotice=titles.length?`A saved fingering update for ${titles.join(', ')} was not applied: the saved engraving is out of date and is engraved again when the score is opened. Your choices are unchanged.`:error.message;}
}

/** Said once the library is showing, after startup. */
let startupNotice:string|undefined;
function keyboardControl(p?:ScorePackage){if(p&&!scoreCapabilities(p).pianoPreparation)return current?readingParts.control(entries,current.entry):'<span class="reading-instrument" aria-label="Instrument">Unknown instrument</span>';return `<select class="keyboard-select" data-keyboard aria-label="Instrument">${(['conventional-piano','janko-four-row'] as const).map(id=>`<option value="${id}" ${(p?(p.keyboardLayout??'janko-four-row'):preferences.keyboardLayout)===id?'selected':''}>${keyboardLabel(id)}</option>`).join('')}</select>`;}
let keyboardChanging=false;
function currentFingerPresentation(p=current?.package){return preferences.fingerPresentation==='replacement'&&p&&!p.fingerEligibility.eligible?'annotations':preferences.fingerPresentation;}
/** Without a fixed beat the player also chooses the counted duration (manual
 * reading); a piano score's own beat unit is fixed and only the rate is asked. */
async function chooseReference(actionLabel:'Practice',fixedBeat?:ReferencePerformanceTempo['beat']):Promise<ReferencePerformanceTempo|undefined>{
 return new Promise(resolve=>{
  const units=fixedBeat?[{name:beatUnitLabel(fixedBeat),...fixedBeat}]:[{name:'Quarter',numerator:1,denominator:4},{name:'Dotted quarter',numerator:3,denominator:8},{name:'Half',numerator:1,denominator:2},{name:'Whole',numerator:1,denominator:1},{name:'Eighth',numerator:1,denominator:8}],d=showDialog((fixedBeat?`<h2>Set your tempo</h2><p class="help">This score has no reference tempo. Practice speeds and progress count toward the tempo you set here, from 5 to 500 per minute. You can change it later in Options.</p><form><input type="hidden" data-reference-unit value="0"><label class="dialog-row">Your tempo<span class="metronome-mark"><input data-reference-rate aria-label="Your tempo, ${beatUnitLabel(fixedBeat)} notes per minute" inputmode="decimal" type="number" min="5" max="500" step="any" required><span class="metronome-rate-unit"><span data-reference-glyph>${beatUnitSvg(fixedBeat)}</span>${perMinuteSuffix()}</span></span></label>`:`<h2>Choose a playing tempo</h2><p class="help">Choose your working rate, from 5 to 500 per minute. The printed score is retained.</p><form><label class="dialog-row">Duration<select data-reference-unit>${units.map((u,i)=>`<option value="${i}">${u.name}</option>`).join('')}</select></label><label class="dialog-row">Rate<span class="metronome-mark"><input data-reference-rate aria-label="Duration units per minute" inputmode="decimal" type="number" min="5" max="500" step="any" required><span class="metronome-rate-unit"><span data-reference-glyph>${beatUnitSvg(units[0])}</span>${perMinuteSuffix()}</span></span></label>`)+`<p class="error" role="alert"></p><div class="dialog-actions">${button('Cancel','close','Esc')}<button type="submit">${actionLabel}</button></div></form>`,'piano-reference');
  let finished=false;d.addEventListener('close',()=>{if(!finished){finished=true;resolve(undefined);}},{once:true});
  if(!fixedBeat)d.querySelector('[data-reference-unit]')!.addEventListener('change',()=>{const index=Number(d.querySelector<HTMLSelectElement>('[data-reference-unit]')!.value);d.querySelector('[data-reference-glyph]')!.innerHTML=beatUnitSvg(units[index]);});
  d.querySelector('form')!.addEventListener('submit',event=>{event.preventDefault();const bpm=Number(d.querySelector<HTMLInputElement>('[data-reference-rate]')!.value),unit=units[Number(d.querySelector<HTMLInputElement|HTMLSelectElement>('[data-reference-unit]')!.value)];if(!Number.isFinite(bpm)||bpm<5||bpm>500){d.querySelector('.error')!.textContent='Enter a rate from 5 to 500 per minute.';return;}finished=true;resolve({version:'reference-performance-tempo-v1',bpm,beat:{numerator:unit.numerator,denominator:unit.denominator},provenance:{kind:'editorial',reference:fixedBeat?PLAYER_TEMPO_REFERENCE:'Explicit player working-rate choice in Score Viewer; not a printed source marking.'}});closeDialog();});
 });
}
/** Open one saved keyboard view of a score inside a reading operation. */
async function preparePiano(bytes:Uint8Array,layout:PhysicalKeyboardId,personal:PersonalState|undefined,op:ReadingOperation):Promise<{q:PianoPrepared;running:NonNullable<typeof job>;dialog:HTMLDialogElement}>{
 checkReading(op);await readerAdmission.waitForIdle(op.controller.signal);checkReading(op);
 const q=await ensurePianoReady({packageBytes:bytes,layout,personal,signal:op.controller.signal},readerAdmission);
 checkReading(op);
 if(!('package' in q))throw Error(q.message);
 await readingCheckpoint(op);
 return {q,running:op.running,dialog:op.dialog!};
}

/** Musical reading enters the shared install path; physical preparation
 * is requested only by piano actions. */
async function prepareScore(bytes:Uint8Array,layout:PhysicalKeyboardId,personal:PersonalState|undefined,admitted:ScorePackage,op:ReadingOperation):Promise<{q:PreparedScore;running:NonNullable<typeof job>;dialog:HTMLDialogElement}>{
 const p=admitted;
 if(scoreCapabilities(p).pianoPreparation)return preparePianoLayout(bytes,layout,personal,p,op);
 await readingCheckpoint(op);return {q:{packageBytes:bytes,package:p,...(personal?{personal:readPersonal(personal,p)}:{})},running:op.running,dialog:op.dialog!};
}
async function installPreparedScore(entry:Entry,q:PreparedScore,running:NonNullable<typeof job>,personal:PersonalState,newEntry=false,personalFiles?:Record<string,string>,context?:PracticeViewContext,rebuilt?:RebuiltInstall){
 const op=readingOperation?.running===running?readingOperation:undefined;if(op)checkReading(op);
 if(collectionId(q.package)!==entry.id)throw Error('This edition belongs to a different score.');
 const checked=readPersonal(q.personal??personal,q.package),originalPackageBytes=getOriginalScorePackageBytes(q.package),
  original=originalPackageBytes?await admitOrContent(originalPackageBytes):undefined,
  originalPersonalFiles:Record<string,string>={};
 if(original)for(const layout of original.availablePresentations??[]){const base=await selectPresentation(original,layout),key=personalStorageName(entry.id,base),file=retainedTranspositionFile(entry,0,layout),map=file===entry.file?entry.personalFiles:entry.editionPersonalFiles?.[file??''];if(map?.[key])originalPersonalFiles[key]=map[key];}
 const previousBytes=!newEntry?await host.read(entry.file):null;
 if(!newEntry&&!previousBytes)throw Error('The prior managed score is missing; saved progress and edition retained.');
 // A re-engraved edition carries practice from the earlier views it replaces.
 // Practice moves only between keyboard editions (stagePracticeEditionTransfer);
 // a musical reading's journals are named for the score alone, so its earlier
 // archive is not read again here.
 let previous=previousBytes&&!rebuilt&&q.package.keyboardLayout?await admitOrContent(previousBytes):undefined;
 if(previous&&q.package.keyboardLayout&&previous.availablePresentations?.includes(q.package.keyboardLayout))previous=await selectPresentation(previous,q.package.keyboardLayout);
 let practiceContext:AdmittedPracticeContext|undefined;
 if(op){await readingCheckpoint(op);readingProgress(op,'save');}

 return enqueue(async()=>{
  if(op){checkReading(op);running.state='installing';op.loading.saving();}
  const latest=entries.find(e=>e.id===entry.id);
  if(newEntry?!!latest:!latest||latest.file!==entry.file)throw Error('The library changed while saving; previous files are retained.');
  const installed=await stagePresentationInstall(host,{packageBytes:q.packageBytes,personalBytes:new TextEncoder().encode(JSON.stringify(checked)),
   personalKey:personalStorageName(entry.id,q.package),entry:latest??entry,entries,newEntry,personalFiles,
   ...(rebuilt?{additionalPersonal:rebuilt.additionalPersonal.map(p=>({key:p.key,bytes:new TextEncoder().encode(JSON.stringify(p.personal))})),replaced:rebuilt.replaced}:{}),
   beforeCommit:async()=>{
    const live=()=>job===running&&running.state==='installing'&&(newEntry?!entries.some(e=>e.id===entry.id):entries.find(e=>e.id===entry.id)?.file===entry.file);
    if(previous)await stagePracticeEditionTransfer(host,{entryId:entry.id,from:previous,to:q.package,personal:checked,canCommit:live});
    if(rebuilt)await carryRebuiltPractice(entry.id,rebuilt,p=>p.to.keyboardLayout===q.package.keyboardLayout&&rebuilt.practice.includes(p)?checked:p.personal,live);
    if(!live())throw Error('Saving was cancelled; prior practice journals retained.');
    practiceContext=context?await PracticeView.prepareContext(q.package,entry.id,context,checked):undefined;
    if(!live())throw Error('Saving was cancelled; prior practice journals retained.');
   },
   ...(entry.transposition||getScoreTransposition(q.package)!==0?{transposition:{steps:getScoreTransposition(q.package),layout:q.package.keyboardLayout??preferences.keyboardLayout,layouts:q.package.availablePresentations,originalPackageBytes,originalLayouts:original?.availablePresentations,originalPersonalFiles,
    ...(rebuilt?.originalPersonal.length?{originalPersonal:rebuilt.originalPersonal.map(p=>({key:p.key,bytes:new TextEncoder().encode(JSON.stringify(p.personal))}))}:{})}}:{}),
   canCommit:()=>job===running&&running.state==='installing'&&(newEntry?!entries.some(e=>e.id===entry.id):entries.find(e=>e.id===entry.id)?.file===entry.file)});
  entries=installed.entries;return {entry:installed.entry,personal:checked,practiceContext};
 });
}
/** An edition saved for one keyboard only gains the other: at the original
 * pitch its own pages stay and the new keyboard is engraved with the same
 * hands; a transposed edition is transposed again from its original, with
 * the score's own hands for both keyboards. The new edition becomes current
 * only when the caller installs it. */
async function preparePianoLayout(bytes:Uint8Array,layout:PhysicalKeyboardId,personal:PersonalState|undefined,selected:ScorePackage,op:ReadingOperation){
 const steps=getScoreTransposition(selected);
 if(selected.availablePresentations?.includes(layout)??selected.keyboardLayout===layout)return preparePiano(bytes,layout,personal,op);
 if(!steps){
  readingProgress(op,'engrave-keyboard');
  const added=await addKeyboardView(selected,layout,readingExecution(op));checkReading(op);
  const view=await selectPresentation(await readerAdmission.import(added,{allowLegacyTempo:true}),layout);checkReading(op);
  return preparePiano(added,layout,personal??personalForAddedKeyboard(selected,view),op);
 }
 readingProgress(op,'transpose');
 const transposed=await prepareSourceTransposition(selected,bytes,steps,readingExecution(op));checkReading(op);
 return preparePiano(transposed,layout,undefined,op);
}
let scoreActivation=0;
async function activateScore(next:NonNullable<typeof current>,context?:PracticeViewContext,admitted?:AdmittedPracticeContext,op?:ReadingOperation,rememberOpened=false){
 const ownsOperation=!op;op??=beginReading(next.entry.id);
 try{
 if(op){checkReadingOwner(op);if(current!==op.previous)throw cancelledReading();}
 const activation=++scoreActivation,previous=current,keyboard=preferences.keyboardLayout;
 const check=()=>{if(op)checkReadingOwner(op);if(activation!==scoreActivation||current!==previous||preferences.keyboardLayout!==keyboard||(op&&previous!==op.previous))throw cancelledReading();};
 check();const nextPresentation=next.package.reading?.dual?await ReadingPresentationController.open(next.package):undefined;check();let nextViewError:string|undefined;
 if(nextPresentation){const saved=await readJson(nextPresentation.storageName);check();try{nextPresentation.adoptView(saved);manualReaderView(nextPresentation,next.personal.view);}catch(error){nextPresentation.adoptView(undefined);nextViewError=`The saved notation view is retained: ${(error as Error).message}`;}
  next.package=nextPresentation.package;next.personal={...next.personal,view:manualReaderView(nextPresentation,next.personal.view)};
 }
 // Clock acquisition is an activation prerequisite too. Keep the old reader,
 // selection and preferences intact until every awaited prerequisite is owned.
 let clock:number|undefined,clockError:unknown;try{clock=await host.midiClock();}catch(error){clockError=error;}check();
 readingProgress(op,scoreCapabilities(next.package).pianoPreparation?'hands':'parts');await paintCheckpoint(op.controller.signal);check();
 if(scoreCapabilities(next.package).pianoPreparation){next.personal=await personalMemory.loadPersonalCurrent(next.entry,next.package,async()=>rawMemoryPersonal(next.personal));check();next.personal=resolveMemory(next);}
 // A saved hand the engraver can't fit returns to the score's own hand, with a notice, rather than locking the score.
 let keptHands=0;
 // Opening draws only what this score shows: its own pages, or the saved
 // hand choices' projection. With a projection worker the engraver settles
 // for editing in the worker after opening; without one it settles here, as before.
 cancelPersonalPrefetch();const nextEditor=personalEditor(next);if(nextEditor.session.settlesOnOpen){await nextEditor.session.warm(readingExecution(op));check();}nextEditor.view=await nextEditor.session.project(next.personal,readingExecution(op))
  .catch(async error=>{const kept=await keepDrawableHands(next,next.personal,error,id=>next.package.score.notes.find(n=>n.id===id)?.hand??null,readingExecution(op));keptHands=kept.keys;return kept.view;});resolvePersonalNavigation(next.personal,nextEditor.view);nextEditor.visiblePersonal=structuredClone(next.personal);check();
 // Publication begins here. Closing/canceling cannot roll back an installed
 // score or a practice view while its remaining host prerequisites settle.
 op.running.state='installing';readingProgress(op,'open');op.loading.saving('Almost ready. This part can’t be cancelled.');
 readingParts.remember(next.entry,next.package);
 ++manualPracticeGeneration;adviceKey='';adviceRunner.cancel();pitchInput.block();practice?.close();practice=undefined;selection=undefined;editNavigation='notes';selectionPitchToggle=false;
 readingPresentation=nextPresentation;readingViewError=nextViewError;
 if(rememberOpened){toolbarVisible=false;libraryMenu.selection.update(entries,next.entry.id);libraryMenu.selection.select(`score:${next.entry.id}`);preferences.lastWorkedEntryId=next.entry.id;}
 current=next;orientation.admitReader(next.personal.view.rotation);editSequence.reset();musicalSustain.clear();resetInput();
 if(clock!==undefined)pitchInput.reset(clock);if(clockError)notify((clockError as Error).message);if(nextViewError)notify(nextViewError);if(keptHands)notify(keptHands===1?'A saved hand choice can’t be drawn on the page yet, so its note keeps the score’s hand.':'Some saved hand choices can’t be drawn on the page yet, so those notes keep the score’s hands.');
 if(context){await startPractice(context,admitted);if(op)checkReadingOwner(op);if(activation!==scoreActivation||current!==next)throw cancelledReading();}else render();
 if(personalMemory.error)paintPersonalSaveError(next,personalMemory.error);
 // The projection worker settles the engraving for hand editing while the score is read; practice never shares it.
 if(!context&&scoreCapabilities(next.package).pianoPreparation)personalEditor(next).session.prefetch();
 if(ownsOperation)finishReading(op,true);void refreshLibrarySummaries();return next;
 }catch(error){if(ownsOperation)finishReading(op,false,error);throw error;}
}
let notationChanging=false;
async function switchReadingNotation(value:string){
 const target=current,controller=readingPresentation,toolbarFocus=app.querySelector('.toolbar')?.contains(document.activeElement)?(document.activeElement as HTMLElement).dataset.optionsKey:undefined;if(!target||!controller||!['iso','tab'].includes(value))throw Error('This score does not have both admitted notations.');
 if(notationChanging||job?.state==='working'||job?.state==='installing')throw Error('A score change is already running.');
 notationChanging=true;++manualPracticeGeneration;
 try{
 const manual=practice instanceof ManualPracticeView?practice:undefined,context=manual?.contextSnapshot();
 await practice?.flush();await savePersonal();if(current!==target||readingPresentation!==controller)throw Error('The selected score changed; previous notation retained.');
 if(!controller.switchNotation(value as ReadingNotation))return;
 if(manual){manual.close();practice=undefined;}
 target.package=controller.package;target.personal.view=manualReaderView(controller,target.personal.view);readerPages.clear();resetInput();
 if(manual)await startManualPractice(context);else render();if(toolbarFocus)app.querySelector<HTMLElement>(`.toolbar [data-options-key="${CSS.escape(toolbarFocus)}"]`)?.focus();await savePersonal();if(dialog?.dataset.kind==='options'){options('score');dialog?.querySelector<HTMLElement>('[data-options-key=readingNotation]')?.focus();}
 }finally{notationChanging=false;}
}
let transpositionChanging=false;
const offsetLabel=(steps:number)=>`${steps>0?'+':''}${steps} step${Math.abs(steps)===1?'':'s'}`;
/** Say plainly what a transposed edition shows. */
function transposedNotice(steps:number,editionFingers:boolean,carried?:{carried:number;left:number}){
 const offset=offsetLabel(steps),notes=(n:number)=>`${n} note${n===1?'':'s'}`;
 if(!carried)return `Transposed ${offset}. This saved edition opened with its own choices.`;
 return [`Transposed ${offset} with the score’s own hands.`,
  editionFingers?'The fingerings printed with the earlier edition stay at its pitch and aren’t shown here.':'',
  carried.carried?`Your hand and finger choices for ${notes(carried.carried)} came along.`:'',
  carried.left?`Your choices for ${notes(carried.left)} couldn’t move and stay with the earlier edition.`:''].filter(Boolean).join(' ');
}
async function changeTransposition(steps:number){
 const target=current;if(target)requirePianoCapability(target.package,'pianoPreparation');if(!target||transpositionChanging||job?.state==='working'||job?.state==='installing')throw Error('A score change is already running.');
 const range=scoreTranspositionRange(target.package);transposeDraft(String(steps),range.min,range.max);if(steps===getScoreTransposition(target.package))return;
 transpositionChanging=true;const activePractice=practice;let prepared:{q:PianoPrepared;running:NonNullable<typeof job>;dialog:HTMLDialogElement}|undefined;
 try{
  activePractice?.pause();await activePractice?.flush();const context=activePractice?.contextSnapshot();await savePersonal();
  if(current!==target)throw Error('The selected score changed; previous transposition retained.');
  const layout=target.package.keyboardLayout??preferences.keyboardLayout,file=retainedTranspositionFile(target.entry,steps,layout),
   loading=new LoadingProgress(target.entry.metadata.title,[file?'retained':'transpose','save','hands','open'],{kicker:steps===0?'Restoring the original pitch':`Transposing ${offsetLabel(steps)}`,cancel:true,cancelNote:'Cancel keeps the current score.'});let retained:Awaited<ReturnType<typeof prepareRetainedEdition>>|undefined,rebuilt:RebuiltInstall|undefined;
  if(file){
   const controller=new AbortController(),running={cancel:()=>controller.abort(),entryId:target.entry.id,state:'working' as 'working'|'installing'|'complete'|'failed',progress:'Opening retained score…'};job=running;
   const d=showDialog(loading.markup(),'piano-preparation');loading.attach(d);loading.step('retained');d.addEventListener('close',()=>{if(running.state==='working')running.cancel();},{once:true});
   try{
    // A saved edition is engraved again at its pitch, bound to the original
    // the current score was made from; it keeps its own hands and fingers.
    const engraveAgain=async(refusal:unknown)=>{
     loading.step('engrave-again');
     const bytes=await readRetainedEdition(host,target.entry,file),currentBytes=await host.read(target.entry.file);
     if(!currentBytes)throw Error('Managed score is missing; current transposition retained.');
     const original={package:target.package.transpositionOriginal??target.package,bytes:getOriginalScorePackageBytes(target.package)??currentBytes};
     try{rebuilt=await prepareRebuiltEdition(host,target.entry,file,bytes,layout,{refusal,...(steps?{original}:{}),admit:b=>readerAdmission.import(b,{allowLegacyTempo:true})},
      {signal:controller.signal,onCheckpoint:stage=>{if(job===running&&running.state==='working')loading.stage(stage);}});}
     catch(rebuildError){if(steps===0||(rebuildError as Error).name==='AbortError')throw rebuildError;}
     return rebuilt?{packageBytes:rebuilt.packageBytes,package:rebuilt.package,personal:rebuilt.personal,personalFiles:{...(target.entry.editionPersonalFiles?.[file]??{})}}:undefined;
    };
    try{retained=await prepareRetainedEdition(host,target.entry,file,layout);}
    catch(error){if((error as Error).name==='AbortError')throw error;retained=await engraveAgain(error);}
    // A pitch saved against an original that has since been engraved again
    // still shows the hands now shown; it is engraved again against the
    // current original rather than replaced by a fresh transposition.
    if(retained&&!rebuilt&&steps!==0&&!scoreTranspositionCompatible(retained.package,target.package,layout)&&sameHandsAtPitch(retained.package,target.package,layout))
     retained=await engraveAgain(Error('This pitch\'s saved edition belongs to an earlier engraving of the original. It stays saved.'));
    if(retained&&getScoreTransposition(retained.package)!==steps)throw Error('The retained edition has a different transposition; current score retained.');
    if(controller.signal.aborted||current!==target||job!==running)throw Error('Score change cancelled. The current score is retained.');
    if(retained&&(steps===0||scoreTranspositionCompatible(retained.package,target.package,layout))){running.state='installing';loading.step('save');loading.saving();prepared={q:{status:'reading',package:retained.package,packageBytes:retained.packageBytes,personal:retained.personal,availableFingerPresentations:[]},running,dialog:d};}
    else{running.state='complete';closeDialog();retained=undefined;rebuilt=undefined;}
   }catch(error){running.state='failed';holdFailure(loading,d,error,controller.signal.aborted);throw error;}
  }
  let carried:ReturnType<typeof personalForTransposedEdition>|undefined;
  if(!prepared){if(steps===0)throw Error('The retained original for this instrument is unavailable. The current score is retained.');const bytes=await host.read(target.entry.file);if(!bytes)throw Error('Managed score is missing; current transposition retained.');
   const controller=new AbortController(),running={cancel:()=>controller.abort(),entryId:target.entry.id,state:'working' as 'working'|'installing'|'complete'|'failed',progress:'Transposing score…'};job=running;
   const d=showDialog(loading.markup(),'piano-preparation');loading.attach(d);loading.restart(['transpose','save','hands','open']);loading.step('transpose');d.addEventListener('close',()=>{if(running.state==='working')running.cancel();},{once:true});
   try{const transposed=await prepareSourceTransposition(target.package,bytes,steps,{signal:controller.signal,onCheckpoint:stage=>{if(job===running&&running.state==='working')loading.stage(stage);}});
    if(controller.signal.aborted||current!==target||job!==running)throw Error('Transposing cancelled. The current score is retained.');
    const p=await readerAdmission.import(transposed,{allowLegacyTempo:true,keyboardLayout:layout});carried=personalForTransposedEdition(target.personal,target.package,p);
    if(controller.signal.aborted||current!==target||job!==running)throw Error('Transposing cancelled. The current score is retained.');
    running.state='installing';loading.step('save');loading.saving();
    prepared={q:{status:'reading',package:p,packageBytes:transposed,personal:carried.personal,availableFingerPresentations:[]},running,dialog:d};
   }catch(error){running.state='failed';holdFailure(loading,d,error,controller.signal.aborted);throw error;}
  }
  const {q,running,dialog:d}=prepared;if(current!==target||getScoreTransposition(q.package)!==steps)throw Error('The score changed while preparing; previous transposition retained.');
  const personal=q.personal??initialPersonal(q.package);if(!retained)personal.view=anchorView(target.personal.view,q.package,writtenAnchor(target.package,target.personal.view.page));
  const installed=await installPreparedScore(target.entry,q,running,personal,false,retained?.personalFiles,context,rebuilt);running.state='complete';if(dialog===d)closeDialog();
  loading.saving('Saved. This part can’t be cancelled.');carriedLoading=loading;await activateScore({entry:installed.entry,package:q.package,personal:installed.personal},context,installed.practiceContext);options();
  notify(rebuilt?`${steps===0?'Original pitch restored.':`Transposed ${offsetLabel(steps)}.`} ${rebuiltNotice(rebuilt)}`:
   steps===0?'Original pitch restored with its saved choices and progress.':transposedNotice(steps,!!activeLayer(target.package,target.personal),carried));
 }catch(error){if(prepared){prepared.running.state='failed';if(dialog===prepared.dialog)closeDialog();}throw error;}
 finally{transpositionChanging=false;}
}
async function switchKeyboard(value:unknown){const source=document.activeElement as HTMLElement|null,optionsSurface=dialog,id=keyboardPreference(value);if(keyboardChanging)return;keyboardChanging=true;let op:ReadingOperation|undefined;

 try{const previous=current;if(previous){requirePianoCapability(previous.package,'pianoPreparation');op=beginReading(previous.entry.id,new LoadingProgress(previous.entry.metadata.title,['check','save','hands','open'],{kicker:`Switching to ${keyboardLabel(id)}`,cancel:true,cancelNote:'Cancel keeps the current keyboard.'}));readingProgress(op,'check');await readingCheckpoint(op);await practice?.flush();const context=practice?.contextSnapshot();await savePersonal();checkReading(op);const bytes=await host.read(previous.entry.file);if(!bytes)throw Error('Managed score is missing; the current score is retained.');

  const existing=previous.package.availablePresentations?.includes(id)?await selectPresentation(previous.package,id):undefined,
   personal=existing?await loadPersonal(previous.entry,existing):undefined,{q,running}=await preparePianoLayout(bytes,id,personal,previous.package,op);
  if(current!==previous)throw Error('The current score changed while switching keyboards; prior choices are retained.');
   const next=q.personal??(existing?readPersonal(personal,q.package):await loadPersonal(previous.entry,q.package));
   next.view=anchorView(previous.personal.view,q.package,writtenAnchor(previous.package,previous.personal.view.page,selection?.ownerIds[0]));

   const installed=await installPreparedScore(previous.entry,q,running,next,false,undefined,context);await readingCheckpoint(op);

   preferences.keyboardLayout=id;await savePreferences().catch(error=>notify(`Instrument selection was not saved: ${error.message}`));
   await activateScore({entry:installed.entry,package:q.package,personal:installed.personal},context,installed.practiceContext,op);
   finishReading(op,true);
 }else{await enqueue(async()=>{await writeJson('preferences.json',{...preferences,keyboardLayout:id});preferences.keyboardLayout=id;});paintLibrarySummaries();}
 void refreshLibrarySummaries();return true;
 }catch(error){if(op)finishReading(op,false,error);reportFailure(error);if(current&&!practice)renderToolbar();return false;}
 finally{keyboardChanging=false;if(optionsSurface?.isConnected&&dialog===optionsSurface){optionsSurface.querySelectorAll<HTMLSelectElement>('[data-keyboard]').forEach(field=>field.value=current?.package.keyboardLayout??preferences.keyboardLayout);if(document.activeElement===source||!source?.isConnected)optionsSurface.querySelector<HTMLElement>('[data-keyboard]')?.focus();}}
}

async function open(entry:Entry,sourceGroup?:string){const op=beginReading(entry.id,openingLoading(entry.id));try{await readingCheckpoint(op);await practice?.flush();await savePersonal();checkReading(op);const data=await host.read(entry.file);if(!data)throw Error('Managed score file is missing; reimport its package');
 let prior:ScorePackage;try{prior=await admitReading(data,op);}catch(error){if((error as Error).name==='AbortError')throw error;try{checkReading(op);}catch{throw error;}await openRebuiltEdition(entry,data,error,op);return;}
 if(sourceGroup&&guitarProContext(prior)?.groupId!==sourceGroup)throw Error('This source part belongs to another original input; the current score is retained.');assertSelectedTransposition(entry,prior);
 // An edition saved for one keyboard only opens on that keyboard.
 const layout=scoreCapabilities(prior).pianoPreparation&&!getScoreTransposition(prior)&&!(prior.availablePresentations?.includes(op.keyboard)??prior.keyboardLayout===op.keyboard)?prior.keyboardLayout??op.keyboard:op.keyboard,
  selected=prior.availablePresentations?.includes(layout)?await selectPresentation(prior,layout):undefined,
  personal=selected?await loadPersonal(entry,selected):prior.manifest.version===3?await loadPersonal(entry,prior):undefined,{q,running}=await prepareScore(data,layout,personal,prior,op);
 const loadedPersonal=q.personal??await loadPersonal(entry,q.package),
  // An admitted retained view needs no new package or personal-journal version.
  // Byte equality also covers retained ready/editable finger layers.
  unchangedArchive=collectionId(q.package)===entry.id&&q.packageBytes.byteLength===data.byteLength&&q.packageBytes.every((value,index)=>value===data[index]),
  installed=q.package.reading?.dual||unchangedArchive?{entry,personal:loadedPersonal}:await installPreparedScore(entry,q,running,loadedPersonal);await readingCheckpoint(op);
  await host.fullscreen(true);checkReading(op);const activated=await activateScore({entry:installed.entry,package:q.package,personal:installed.personal},undefined,undefined,op,true);await saveReadingPreferences(op,activated).catch(error=>{checkReadingOwner(op);notify(`Last score was not saved: ${error.message}`);});
  finishReading(op,true);
  if(layout!==op.keyboard)notify(`This edition has only a ${keyboardLabel(layout)} view, so it opened on that keyboard.`);
 }catch(error){finishReading(op,false,error);throw error;}
}

/** Carry practice from each earlier keyboard view to its new view. Practice
 * that can't move stays with the earlier edition and is reported; it never
 * keeps the score from opening. */
async function carryRebuiltPractice(entryId:string,r:RebuiltInstall,personalFor:(p:RebuiltInstall['practice'][number])=>PersonalState,live:()=>boolean){
 r.practiceLeft=0;
 for(const p of [...r.practice,...r.originalPractice]){
  // A journal already shared by both views needs no carrying.
  if(practiceStorageName(entryId,p.from)===practiceStorageName(entryId,p.to))continue;
  try{await stagePracticeEditionTransfer(host,{entryId,from:p.from,to:p.to,personal:personalFor(p),canCommit:live});}
  catch(error){if((error as Error).name==='AbortError'||!live())throw error;r.practiceLeft++;}
 }
}
/** Say plainly what engraving an edition again kept, never how its hands
 * or fingers were first made. */
function rebuiltNotice(r:RebuiltInstall){
 const moved=[r.hands==='choices'?'hands':'',r.fingers==='choices'?'fingers':''].filter(Boolean).join(' and '),notes=(n:number)=>`${n} note${n===1?'':'s'}`;
 return [`This score was engraved again with the current engraving. ${r.left?'Your hands and fingers came along.':'Your hands, fingers and choices came along.'}`,
  moved?`The edition’s ${moved} now show as your own choices.`:'',
  r.left?`Your choices for ${notes(r.left)} couldn’t move and stay with the earlier edition.`:'',
  r.practiceLeft?'Some practice progress couldn’t move and stays with the earlier edition.':''].filter(Boolean).join(' ');
}
/** A saved edition whose pages the current engraving no longer reproduces is
 * engraved again from its own content and installed like an Earlier edition:
 * the earlier archive and its journals stay saved. */
async function openRebuiltEdition(entry:Entry,bytes:Uint8Array,admission:unknown,op:ReadingOperation){
 readingProgress(op,'engrave-again');
 const reading=await reengraveReadingArchive(bytes,admission,readingExecution(op));
 if(reading){await openReengravedReading(entry,reading,op);return;}
 const rebuilt=await prepareRebuiltEdition(host,entry,entry.file,bytes,op.keyboard,{refusal:admission,admit:b=>readerAdmission.import(b,{allowLegacyTempo:true})},readingExecution(op));
 await readingCheckpoint(op);
 const {q,running}=await preparePiano(rebuilt.packageBytes,op.keyboard,rebuilt.personal,op),
  installed=await installPreparedScore(entry,q,running,q.personal??rebuilt.personal,false,undefined,undefined,rebuilt);await readingCheckpoint(op);
 await host.fullscreen(true);checkReading(op);const activated=await activateScore({entry:installed.entry,package:q.package,personal:installed.personal},undefined,undefined,op,true);let unsaved='';await saveReadingPreferences(op,activated).catch(error=>{checkReadingOwner(op);unsaved=` Last score was not saved: ${error.message}`;});
 finishReading(op,true);
 notify(rebuiltNotice(rebuilt)+unsaved);
}

/** A musical reading engraved again is installed like any new edition of
 * the score: the earlier archive and its journals stay saved. Its journals
 * are named for the score alone, so the reader's place and practice stay. */
async function openReengravedReading(entry:Entry,bytes:Uint8Array,op:ReadingOperation){
 await readingCheckpoint(op);
 const p=await readerAdmission.import(bytes,{allowLegacyTempo:true,execution:readingExecution(op)});await readingCheckpoint(op);
 const {q,running}=await prepareScore(bytes,op.keyboard,await loadPersonal(entry,p),p,op),
  installed=await installPreparedScore(entry,q,running,q.personal??await loadPersonal(entry,q.package));await readingCheckpoint(op);
 await host.fullscreen(true);checkReading(op);const activated=await activateScore({entry:installed.entry,package:q.package,personal:installed.personal},undefined,undefined,op,true);let unsaved='';await saveReadingPreferences(op,activated).catch(error=>{checkReadingOwner(op);unsaved=` Last score was not saved: ${error.message}`;});
 finishReading(op,true);
 notify('This score was engraved again with the current engraving. Your place and practice came along.'+unsaved);
}

async function chooseGuitarProTracks(inspection:GuitarProInspection,op:ReadingOperation):Promise<string[]|undefined>{
 suspendReadingDialog(op);
 return new Promise(resolve=>{const d=showDialog(guitarProTracksMarkup(inspection),'guitar-pro-tracks');let settled=false;
  const done=(ids?:string[])=>{if(settled)return;settled=true;op.controller.signal.removeEventListener('abort',aborted);resolve(ids);if(dialog===d)closeDialog(false);},aborted=()=>done();
  op.controller.signal.addEventListener('abort',aborted,{once:true});if(op.controller.signal.aborted){done();return;}
  d.querySelector('[data-gp-cancel]')!.addEventListener('click',()=>done());d.addEventListener('close',()=>done(),{once:true});
  d.querySelector('[data-gp-import]')!.addEventListener('click',()=>{const ids=[...d.querySelectorAll<HTMLInputElement>('[data-gp-track]:checked:not(:disabled)')].map(field=>field.dataset.gpTrack!);if(!ids.length||ids.length>8){d.querySelector('[data-gp-error]')!.textContent='Choose one to eight source parts.';return;}done(ids);});
 });
}
async function importGuitarProScore(bytes:Uint8Array){
 const op=beginReading('import-guitar-pro',new LoadingProgress('Guitar Pro score',['gp-parts','gp-read','gp-engrave','save','parts','open'],{kicker:'Importing',cancel:true}));try{
  await readingCheckpoint(op);await practice?.flush();await savePersonal();checkReading(op);readingProgress(op,'gp-parts');
  const inspection=await inspectGuitarProSource(bytes,{signal:op.controller.signal,checkpoint:()=>readingCheckpoint(op)}),ids=await chooseGuitarProTracks(inspection,op);checkReading(op);
  if(!ids){finishReading(op,false);return;}readingDialog(op);readingProgress(op,'gp-read');
  const {frettedPreparationAssets}=await import('./fretted-preparation-assets');checkReading(op);
  const assets=await frettedPreparationAssets(op.controller.signal);await readingCheckpoint(op);
  const staged=await stageGuitarProParts(inspection,ids,{signal:op.controller.signal,checkpoint:()=>readingCheckpoint(op),prepareAndAdmit:async(input,signal)=>{
   checkReading(op);readingProgress(op,'gp-engrave');const packet=await prepareDualReadingPacket({score:input.score,metadata:input.metadata,retainedFiles:input.retainedFiles,createdAt:new Date().toISOString(),...assets},{signal});checkReading(op);return packet;
  }});await readingCheckpoint(op);
  const installed=await enqueue(async()=>{checkReading(op);return stageReadingPartsInstall(host,{parts:staged.parts,entries,
   canCommit:()=>{try{checkReading(op);return true;}catch{return false;}},onCommitStarted:()=>{checkReading(op);op.running.state='installing';op.loading.step('save');op.loading.saving();}
  });});entries=installed.entries;const entry=installed.selected[0],part=staged.parts.find(part=>collectionId(part.package)===entry.id)!;
  checkReading(op);for(const selected of installed.selected){const prepared=staged.parts.find(part=>collectionId(part.package)===selected.id)!;readingParts.remember(selected,prepared.package);}
  const personal=await loadPersonal(entry,part.package);checkReading(op);const activated=await activateScore({entry,package:part.package,personal},undefined,undefined,op,true);await saveReadingPreferences(op,activated).catch(error=>{checkReadingOwner(op);notify(`Last score was not saved: ${error.message}`);});finishReading(op,true);
 }catch(error){
  if(error instanceof ReadingPartsCommitUnconfirmed){
   // The pointer may already have committed. Reconcile an actual readable
   // library; never remove staged files or infer a rollback from a lost ack.
   const saved=await readJson<{version:number;entries:Entry[]}>('library.json').catch(()=>undefined);
   if(saved?.version===1&&Array.isArray(saved.entries)&&saved.entries.every(validEntryStorage))entries=saved.entries;
  }
  finishReading(op,false,error);throw error;
 }
}
let partChanging=false;
async function switchReadingPart(id:string){
 const target=current,context=target&&guitarProContext(target.package);if(!target||!context)throw Error('This score has no admitted Guitar Pro source parts.');
 const entry=readingParts.siblings(entries,target.entry).find(entry=>entry.id===id);if(!entry)throw Error('This source part is unavailable.');if(entry.id===target.entry.id)return;
 if(partChanging||job?.state==='working'||job?.state==='installing')throw Error('A source part change is already running.');
 const wasManual=practice instanceof ManualPracticeView,wasOptions=dialog?.dataset.kind==='options',openerKey=(document.activeElement as HTMLElement)?.dataset.optionsKey;partChanging=true;
 try{await open(entry,context.groupId);if(current?.entry.id!==entry.id)return;if(wasManual){await startManualPractice();if(practice instanceof ManualPracticeView)await practice.action('free-view');}if(wasOptions)options('score');
  if(openerKey==='readingPart'){if(!dialog&&!practice)reveal();(dialog??app).querySelector<HTMLElement>('[data-options-key=readingPart]')?.focus();}
 }
 finally{partChanging=false;}
}
async function importScore(){
 let bytes=await host.pickScore();if(!bytes)return;const kind=scoreImportKind(bytes);if(kind==='guitar-pro'){await importGuitarProScore(bytes);return;}
 if(kind==='musescore'&&!MUSESCORE_IMPORT_ENABLED)throw Error('MuseScore files can\'t be opened in this copy of the viewer yet. Export the score from MuseScore as MusicXML (.musicxml or .mxl) and import that file.');
 const op=beginReading('import',new LoadingProgress('New score',[...(kind==='score'?[]:['engrave'] as const),'check','save','hands','open'],{kicker:'Importing',cancel:true}));try{await readingCheckpoint(op);
 if(kind==='musicxml'){readingProgress(op,'engrave');const [{frettedPreparationAssets},{prepareMusicXmlScore}]=await Promise.all([import('./fretted-preparation-assets'),import('./musicxml-import')]);checkReading(op);
  const assets=await frettedPreparationAssets(op.controller.signal);checkReading(op);
  const written=bytes;bytes=(await prepareMusicXmlScore(written,assets,readingExecution(op))).bytes;await readingCheckpoint(op);}
 if(MUSESCORE_IMPORT_ENABLED&&kind==='musescore'){readingProgress(op,'engrave');const [{frettedPreparationAssets},{prepareMuseScore}]=await Promise.all([import('./fretted-preparation-assets'),import('./musescore-import')]);checkReading(op);
  const assets=await frettedPreparationAssets(op.controller.signal);checkReading(op);
  const saved=bytes;bytes=(await prepareMuseScore(saved,assets,readingExecution(op))).bytes;await readingCheckpoint(op);}
 const p=await admitReading(bytes,op),id=collectionId(p),priorEntry=entries.find(e=>e.id===id);op.running.entryId=id;op.loading.setTitle(p.manifest.metadata.title||op.loading.title);
 await practice?.flush();await savePersonal();
 let refresh=false,linkedRefresh=false;
 if(priorEntry){if((priorEntry.transposition?.steps??0)!==0&&getScoreTransposition(p)===0)throw Error('Restore 0 steps before updating the original score. Your selected transposition is retained.');const prior=await host.read(priorEntry.file);if(!prior)throw Error('Managed package is missing; prior library entry retained');const previous=await admitReading(prior,op).catch(async error=>{try{checkReading(op);}catch{throw error;}return await editionNeedsEngravingAgain(prior,error)??Promise.reject(error);});
  if(referenceMidiDiffers(previous,p))throw Error('This score has a different MIDI reference; the installed score and your saved choices are retained.');
  refresh=!sameFrozenPayload(previous.manifest,p.manifest);linkedRefresh=p.manifest.version===2&&p.sourceSha256===(previous.sourceSha256??previous.manifest.semanticSha256);
  if(refresh&&!linkedRefresh){if(!headerOnlyRefresh(previous,p))throw Error('This source revision has a different frozen presentation beyond a verified header cleanup; the existing package and saved choices are retained.');suspendReadingDialog(op);const confirmed=await confirmHeaderRefresh();checkReading(op);if(!confirmed){finishReading(op,false);return;}readingDialog(op);}
 }
 const selected=p.availablePresentations?.includes(preferences.keyboardLayout)?await selectPresentation(p,preferences.keyboardLayout):undefined,

  personal=priorEntry&&(selected||p.manifest.version===3)?await loadPersonal(priorEntry,selected??p):undefined,
  {q,running}=await prepareScore(bytes,op.keyboard,personal,p,op);

 const entry:Entry=priorEntry?{...priorEntry,
   presentations:refresh&&!linkedRefresh?[...(priorEntry.presentations??[]),priorEntry.file]:(priorEntry.presentations??[])}:
   {id,file:scoreFileName(await hashBytes(q.packageBytes)),metadata:q.package.manifest.metadata,importedAt:new Date().toISOString()},
   installed=await installPreparedScore(entry,q,running,q.personal??(priorEntry?await loadPersonal(priorEntry,q.package):initialPersonal(q.package)),!priorEntry);
  await readingCheckpoint(op);
  const activated=await activateScore({entry:installed.entry,package:q.package,personal:installed.personal},undefined,undefined,op,true);await saveReadingPreferences(op,activated);
  finishReading(op,true);
 }catch(error){finishReading(op,false,error);throw error;}
}
async function confirmHeaderRefresh():Promise<boolean>{return new Promise(resolve=>{const d=showDialog(`<h2>Refresh printed header?</h2><p class="help">This package has identical music, glyph seats, finger choices and every vector byte outside its verified notice cleanup. Your saved corrections and finger choices stay intact. The previous package remains available through Restore previous header.</p><div class="dialog-actions"><button data-keep-header>Keep current <kbd>Esc</kbd></button><button data-refresh-header>Refresh header</button></div>`,'header-refresh');let finished=false;const done=(yes:boolean)=>{if(finished)return;finished=true;resolve(yes);closeDialog();};d.querySelector('[data-keep-header]')!.addEventListener('click',()=>done(false));d.querySelector('[data-refresh-header]')!.addEventListener('click',()=>done(true));d.addEventListener('close',()=>{if(!finished){finished=true;resolve(false);}});});}
async function restoreHeader(){if(!current?.entry.presentations?.length)return;const target=current,history=target.entry.presentations!,file=history.at(-1)!,data=await host.read(file);if(!data)throw Error('The retained package is missing; current header preserved.');const prior=await admitOrContent(data);if(!headerOnlyRefresh(target.package,prior))throw Error('Retained package does not pass the header-only contract; current data preserved.');const updated={...target.entry,file,presentations:history.slice(0,-1),retainedPackages:[...new Set([...(target.entry.retainedPackages??[]),target.entry.file])],...(target.entry.transposition?{transposition:nextTranspositionSelection(target.entry,file,{steps:getScoreTransposition(prior),layout:prior.keyboardLayout??preferences.keyboardLayout})}: {})},next=entries.map(e=>e.id===updated.id?updated:e);await enqueue(()=>writeJson('library.json',{version:1,entries:next}));entries=next;closeDialog();await open(updated);notify('Previous header restored; saved corrections and versions retained.');}
async function earlierEditions(){
 if(!current||job?.state==='working'||job?.state==='installing')return;
 await practice?.flush();const context=practice?.contextSnapshot();await savePersonal();const target=current,files=[...new Set(target.entry.retainedPackages??[])].filter(file=>file!==target.entry.file).reverse(),
  d=showDialog(`<h2>Earlier editions</h2><p class="help">Each edition keeps its pages and saved choices. Select one to restore it for this instrument.</p><div data-editions></div><div data-edition-progress></div><p class="error" role="alert"></p><div class="dialog-actions">${button('Close','close','Esc')}</div>`,'earlier-editions'),list=d.querySelector('[data-editions]')!;
 for(const [index,file]of files.entries()){
  const b=document.createElement('button');b.type='button';b.textContent=`Earlier ${index+1}`;list.append(b);
  b.addEventListener('click',()=>{void(async()=>{
   b.disabled=true;const restoring={cancel:()=>{},entryId:target.entry.id,state:'working' as 'working'|'installing'|'complete'|'failed',progress:'Saving edition…'},
    loading=new LoadingProgress(target.entry.metadata.title,['save','hands','open'],{kicker:`Restoring Earlier ${index+1}`}),progress=d.querySelector<HTMLElement>('[data-edition-progress]')!;try{
    const layout=target.package.keyboardLayout??'janko-four-row';let rebuilt:RebuiltInstall|undefined,
     retained:Awaited<ReturnType<typeof prepareRetainedEdition>>;
    try{retained=await prepareRetainedEdition(host,target.entry,file,layout);}
    catch(error){
     // An earlier edition whose pages no longer reproduce is engraved again.
     if((error as Error).name==='AbortError')throw error;
     const controller=new AbortController(),stop=()=>controller.abort();
     d.querySelector('.error')!.textContent='';progress.innerHTML=loading.markup();loading.attach(progress);loading.step('engrave-again');d.addEventListener('close',stop,{once:true});
     try{rebuilt=await prepareRebuiltEdition(host,target.entry,file,await readRetainedEdition(host,target.entry,file),layout,{refusal:error,admit:b=>readerAdmission.import(b,{allowLegacyTempo:true})},{signal:controller.signal,onCheckpoint:stage=>loading.stage(stage)});}
     finally{d.removeEventListener('close',stop);}
     retained={packageBytes:rebuilt.packageBytes,package:rebuilt.package,personal:rebuilt.personal,personalFiles:{...(target.entry.editionPersonalFiles?.[file]??{})}};
    }
    // A re-engraved edition's practice arrives during the install, so its
    // context is read after the transfer (as installPreparedScore does).
    let admitted=context&&!rebuilt?await PracticeView.prepareContext(retained.package,target.entry.id,context,retained.personal):undefined;
    if(dialog!==d||!d.open)throw Error('Edition restore cancelled. The current score is retained.');
    const installed=await enqueue(async()=>{
     const latest=entries.find(e=>e.id===target.entry.id);
     if(dialog!==d||!d.open||current!==target||!latest||latest.file!==target.entry.file)throw Error('The active edition changed or restore was cancelled. Its saved choices are retained.');
     const result=await stagePresentationInstall(host,{entry:latest,entries,packageBytes:retained.packageBytes,
      personalBytes:new TextEncoder().encode(JSON.stringify(retained.personal)),personalKey:personalStorageName(latest.id,retained.package),
      personalFiles:retained.personalFiles,...(latest.transposition||getScoreTransposition(retained.package)!==0?{transposition:{steps:getScoreTransposition(retained.package),layout:retained.package.keyboardLayout??preferences.keyboardLayout,...(rebuilt?{layouts:retained.package.availablePresentations}:{}),originalPackageBytes:getOriginalScorePackageBytes(retained.package),originalLayouts:retained.package.transpositionOriginal?.availablePresentations,
       ...(rebuilt?.originalPersonal.length?{originalPersonal:rebuilt.originalPersonal.map(p=>({key:p.key,bytes:new TextEncoder().encode(JSON.stringify(p.personal))}))}:{})}}:{}),canCommit:()=>dialog===d&&d.open&&current===target&&entries.find(e=>e.id===target.entry.id)?.file===target.entry.file,
      ...(rebuilt?{additionalPersonal:rebuilt.additionalPersonal.map(p=>({key:p.key,bytes:new TextEncoder().encode(JSON.stringify(p.personal))})),replaced:rebuilt.replaced,
       beforeCommit:async()=>{const live=()=>dialog===d&&d.open&&current===target&&entries.find(e=>e.id===target.entry.id)?.file===target.entry.file;
        await carryRebuiltPractice(target.entry.id,rebuilt!,p=>p.personal,live);
        if(!live())throw Error('Edition restore cancelled. The current score is retained.');
        admitted=context?await PracticeView.prepareContext(retained.package,target.entry.id,context,retained.personal):undefined;
        if(!live())throw Error('Edition restore cancelled. The current score is retained.');}}:{}),
      onCommitStarted:()=>{restoring.state='installing';job=restoring;d.dataset.kind='piano-preparation';d.setAttribute('aria-busy','true');if(!progress.firstElementChild){progress.innerHTML=loading.markup();loading.attach(progress);}loading.step('save');loading.saving();}});
     entries=result.entries;return result;
    });
    restoring.state='complete';closeDialog(false);loading.saving('Saved. This part can’t be cancelled.');carriedLoading=loading;await activateScore({entry:installed.entry,package:retained.package,personal:retained.personal},context,admitted);notify(rebuilt?`Earlier edition restored. ${rebuiltNotice(rebuilt)}`:'Earlier edition restored with its saved choices.');
   }catch(error){restoring.state='failed';loading.stop();progress.replaceChildren();if((error as Error).name==='AbortError'&&dialog!==d)return;if(dialog===d){d.dataset.kind='earlier-editions';d.removeAttribute('aria-busy');d.querySelector('.error')!.textContent=(error as Error).message;}else reportFailure(error);}
   finally{b.disabled=false;}
  })();});
 }
}
function closeDialog(returnParent=true){adviceOptions?.dispose();adviceOptions=undefined;if(['piano-preparation','score-reading'].includes(dialog?.dataset.kind??'')&&job?.state==='installing')return;if(dialog&&readingOperation?.dialog===dialog&&readingOperation.running.state==='working')readingOperation.running.cancel();const back=dialogBack;dialogBack=undefined;practiceOptionsCleanup?.();practiceOptionsCleanup=undefined;transposeControls?.dispose();transposeControls=undefined;optionsNavigation?.dispose();optionsNavigation=undefined;dialogNavigation?.dispose();dialogNavigation=undefined;bindingOptions?.dispose();bindingOptions=undefined;midiOptions?.dispose();midiOptions=undefined;audioOptions?.dispose();audioOptions=undefined;pianoOptions?.dispose();pianoOptions=undefined;if(!dialog)return;dialog.close();dialog.remove();dialog=undefined;input.capture=undefined;resetInput();const practiceFocus=practiceFocusReturn?app.querySelector<HTMLElement>(practiceFocusReturn):undefined;practiceFocusReturn=undefined;if(selection)focusSelection();else if(practiceFocus)practiceFocus.focus();else if(focusReturn?.isConnected)focusReturn.focus();else app.querySelector<HTMLElement>('.practice-overview:not([hidden]) .practice-chunks [aria-current=true],.practice-stage,.reader')?.focus();focusReturn=undefined;if(librarySummaryPaintPending&&!current&&!practice)paintLibrarySummaries();if(returnParent)back?.();}
function showDialog(html:string,kind='options'){const parentSection=dialog?.dataset.kind==='options'&&kind==='earlier-editions'?optionsSection:undefined,opener=document.activeElement as HTMLElement,openerAction=opener?.dataset.action;closeDialog(false);if(parentSection)dialogBack=()=>{options(parentSection);if(openerAction)dialog?.querySelector<HTMLElement>(`[data-action="${CSS.escape(openerAction)}"]`)?.focus();};focusReturn=document.activeElement as HTMLElement;dialog=document.createElement('dialog');dialog.innerHTML=html;arrangeDialogNavigation(dialog);dialog.dataset.kind=kind;dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog();});document.body.append(dialog);dialog.showModal();fitDialog(dialog,orientation.rotation);resetInput();if(kind!=='options')dialogNavigation=new OptionsNavigation(dialog,()=>{},()=>false,{focusOnPrepare:false});dialog.querySelector<HTMLElement>('input:not([hidden]),button:not([hidden]),select:not([hidden])')?.focus();return dialog;}
async function edit(seat:Seat,point?:{x:number;y:number}){editSequence.reset();if(!current||(!selection&&labelMode()!=='finger'))return;current.personal.editContactId=seat.contactId;savePersonalQuietly();const value=fingerFor(current.package,current.personal,seat)!;const d=showDialog(`<h2>Finger · bar ${seat.writtenBar}</h2><form class="edit-form"><label>Finger <input aria-label="Finger number" inputmode="numeric" maxlength="1" value="${value??''}" autocomplete="off"></label><button type="submit">Save <kbd>Enter</kbd></button>${button('Cancel','close','Esc')}${button('Restore edition finger','restore-one','',!resolveMemoryInput(memoryInput(current)).byOwner[seat.ownerIds[0]]?.personal)}</form><p class="error" role="alert"></p>`,'edit');if(point){d.style.margin='0';d.style.position='fixed';const box=d.getBoundingClientRect(),cx=Math.max(box.width/2+10,Math.min(innerWidth-box.width/2-10,point.x+box.width/2-30)),cy=Math.max(box.height/2+10,Math.min(innerHeight-box.height/2-10,point.y+box.height/2+16));d.style.left=`${cx-d.offsetWidth/2}px`;d.style.top=`${cy-d.offsetHeight/2}px`;}const field=d.querySelector<HTMLInputElement>('input')!;field.select();let submitting=false;d.querySelector('form')!.addEventListener('submit',async e=>{e.preventDefault();const target=current;if(submitting||!target||dialog!==d)return;submitting=true;try{const replacement=Number(field.value);if(!selection)editNavigation='notes';selection=seat;await saveFingerDigit(replacement);if(dialog===d)closeDialog();if(current===target){renderPages();renderToolbar();}}catch(error){d.querySelector('.error')!.textContent=(error as Error).message;}finally{submitting=false;}});d.querySelector('[data-action=restore-one]')?.addEventListener('click',async()=>{const target=current;if(!target||dialog!==d)return;try{await acceptMemoryAction(target,{kind:'calculated',ownerId:seat.ownerIds[0],decisionId:crypto.randomUUID(),authoredAt:new Date().toISOString()});if(dialog===d)closeDialog();if(current===target){renderPages();renderToolbar();}}catch(error){paintPersonalSaveError(target,error as Error);}});}
function onMidi(event:MidiCC){if(!startupReady)return;if(event.generation!==midiConnection?.generation||event.source!==midiConnection.source||!pitchInput.accepts(event))return;syncControls();
 midiOptions?.receive(event);
 if([120,121,123].includes(event.controller)){bindingOptions?.cancel('Input reset. Start again.');musicalSustain.clear();if(practice instanceof PracticeView)practice.clearHeldInput();practice?.pause();resetInput();return;}
 if(isMusicalSustain(event)){if(readerFocused&&!document.hidden){musicalSustain.receive(event,midiConnection);if(!dialog){practice?.sustain(event);}}return;}
 if(bindingOptions?.receive(event))return;
 const focused=document.activeElement as HTMLElement,focusedField=!!focused?.closest('input,select,textarea,[contenteditable=true]')&&!(focused instanceof HTMLInputElement&&(focused.readOnly&&focused.closest('[data-manual-key]:not([data-manual-editing])')||focused.type==='checkbox'&&practice?.bindingContext.active&&focused.closest('.practice-controls')));const result=controls.receive(event,midiConnection,!!current&&readerFocused&&!document.hidden&&!dialog&&!focusedField&&!practice?.modalOpen);
 if(result.action){if(controlActionAllowed(result.action,{modal:!!dialog||!!practice?.modalOpen,selecting:!!selection,practice:!!practice,practicePaused:practice?.canTurnPage,practiceDone:practice?.canMarkDone,practiceModes:practice instanceof PracticeView&&practice.bindingContext.active,practiceFreeView:practice?.bindingContext.active}))void act(result.action);}else if(result.changed)refreshPresentation();
}
function settings(){options();}

async function connectMidi(source:string){const operation=++midiTransition;bindingOptions?.connectionChanged();if(practice instanceof PracticeView)practice.clearHeldInput();practice?.pause();resetInput();midiOptions?.cancelListening();musicalSustain.clear();midiConnection=undefined;await host.midiDisconnect();if(operation!==midiTransition)return;const generation=await host.midiConnect(source);if(operation===midiTransition){midiConnection={source,generation};bindingOptions?.paint();}}
async function disconnectMidi(){midiTransition++;bindingOptions?.connectionChanged();musicalSustain.clear();if(practice instanceof PracticeView)practice.clearHeldInput();practice?.pause();midiConnection=undefined;resetInput();midiOptions?.cancelListening();await host.midiDisconnect();bindingOptions?.paint();}
function options(section?:string){
 const activePractice=practice,focused=document.activeElement as HTMLElement,practiceFocus=activePractice?.bindingContext.active?'.practice-stage':activePractice&&app.contains(focused)?focused.dataset.practice?`[data-practice="${CSS.escape(focused.dataset.practice)}"]`:focused.dataset.practiceSetting?`[data-practice-setting="${CSS.escape(focused.dataset.practiceSetting)}"]`:'.practice-stage':undefined;activePractice?.pause();
 const p=current?.package,s=current?.personal;

 let transpose={steps:p?getScoreTransposition(p):0,min:0,max:0,error:undefined as string|undefined};
 if(p&&scoreCapabilities(p).pianoPreparation)try{transpose={...transpose,...scoreTranspositionRange(p)};}catch(error){transpose.error=(error as Error).message;}
 const scoreOptions=current&&p&&s?scoreOptionsMarkup(current.entry,p,s,transpose,job,readingParts.control(entries,current.entry),!activePractice):'';
 const sections:OptionsSection[]=[
  ...(activePractice?[{id:'practice',label:'Practice',content:activePractice.optionsMarkup()}]:[]),
  ...(scoreOptions?[{id:'score',label:'Score',content:scoreOptions}]:[]),
  {id:'input-output',label:'Input / output',content:'<h3>Input / output</h3><div class="options-setup"><div data-audio-panel><p class="control-error">Loading outputs…</p></div><div data-midi-panel><p class="control-error">Loading inputs…</p></div></div>'},
  {id:'piano',label:'Piano',content:'<section class="piano-options" data-piano-panel><p class="control-error">Checking piano…</p></section>'},
  {id:'keys',label:'Keys / pedals',content:'<section class="options-bindings"><div data-reading-bindings></div></section>'},
  {id:'fingerings',label:'Fingerings',content:`<section class="options-fingering"><h3>Fingerings</h3>${!p||scoreCapabilities(p).pianoPreparation?`${fingerBehaviorSettings(preferences)}<div data-fingering-advice-options></div><label class="option-replacement" data-options-row><input type="checkbox" data-finger-replacement ${preferences.fingerPresentation==='replacement'?'checked':''}/>When fingerings are shown, replace note numbers with finger numbers</label><p class="help">Hidden fingerings leave note numbers visible. Works with either visibility choice.</p>`:''}</section>`},
  {id:'notation',label:'Notation',content:`<h3>Notation</h3><label class="option-setting" data-options-row><span>Notation system</span><select data-notation-system aria-label="Notation system"><option value="iso" selected>ISO</option><option value="traditional" disabled>Traditional · not available yet</option></select></label>`}
 ];
 optionsSection=sections.some(s=>s.id===section)?section:sections[0].id;
 const d=showDialog(`<h2 id="options-title">Options</h2>${optionsSectionsMarkup(sections,optionsSection)}<footer class="options-footer" data-options-row>${navigationHint()}<button data-action="close" data-options-close>Back <kbd class="escape-hint">Esc</kbd></button></footer>`,'options');d.setAttribute('aria-labelledby','options-title');
 const adviceRoot=d.querySelector<HTMLElement>('[data-fingering-advice-options]');if(adviceRoot)adviceOptions=new FingeringAdviceOptions(adviceRoot,{settings:()=>readFingeringAdviceSettings(preferences.fingeringAdvice),ownsKeys:()=>!!bindingOptions?.active,save:next=>enqueue(async()=>{await writeJson('preferences.json',{...preferences,fingeringAdvice:next});preferences.fingeringAdvice=next;adviceKey='';refreshEditorAdvice();})});
 d.classList.add('options-dialog','options-redesigned');if(activePractice){practiceOptionsCleanup=activePractice.mountOptions(d,closeDialog);practiceFocusReturn=practiceFocus;}
 bindingOptions=new OptionsBindingsPanel(d.querySelector('[data-reading-bindings]')!,{resolver:controls,rows:optionsBindingRows(activePractice?.bindingContext,p?scoreCapabilities(p):undefined,!!current,!!selection),bindings:()=>effectiveControls(),connection:()=>midiOptions?.connection,channel:()=>midiOptions?.state.channel,suspend:()=>{resetInput();midiOptions?.cancelListening();optionsNavigation?.cancelPicker(false);},validate:change=>{changeScopedControls(mainControls,preferences.freeViewControls,!!activePractice,change);},save:change=>enqueue(async()=>{const next=changeScopedControls(mainControls,preferences.freeViewControls,!!activePractice,change),mainChanged=next.main!==mainControls;await writeJson('preferences.json',{...preferences,...(mainChanged?{controlBindings:next.main}:{}),freeViewControls:next.overrides});if(mainChanged)preferences.controlBindings=next.main;preferences.freeViewControls=next.overrides;mainControls=next.main;syncControls();resetInput();if(current&&!practice)renderToolbar();})});bindingOptions.mount();
 midiOptions=new MidiOptionsPanel(d.querySelector('[data-midi-panel]')!,{sources:()=>host.midiSources(),connection:()=>midiConnection,connect:connectMidi,disconnect:disconnectMidi,mapping:()=>Object.values(controls.bindings.actions).flat().find(b=>b?.kind==='midi') as MidiMapping|undefined,cancelKeys:()=>{resetInput();bindingOptions?.cancel();bindingOptions?.paint();}});const midiMounted=midiOptions.mount();
 audioOptions=new AudioOptionsPanel(d.querySelector('[data-audio-panel]')!,{outputs:()=>practiceAudio.outputs(),output:()=>preferences.audioOutput??'',save:output=>enqueue(async()=>{await writeJson('preferences.json',{...preferences,audioOutput:output});preferences.audioOutput=output;void configurePiano().catch(error=>notify(`Piano output could not update: ${error.message}`));}),create:(native,output,onError)=>new PracticeClock(native,output,onError)});const audioMounted=audioOptions.mount();
 pianoOptions=new PianoOptionsPanel(d.querySelector('[data-piano-panel]')!,{...nativePiano,preferences:()=>pianoSettings,save:savePiano,cancelKeys:()=>{optionsNavigation?.cancelPicker(false);resetInput();bindingOptions?.cancel();},ownsKeys:()=>!!bindingOptions?.active,fitHelp:help=>fitDialog(help,orientation.rotation),warning:()=>pianoWarning});const pianoMounted=pianoOptions.mount();
 Promise.all([midiMounted,audioMounted,pianoMounted]).then(()=>{if(dialog===d&&!bindingOptions?.active)optionsNavigation?.focusInitial();});
 optionsNavigation=new OptionsNavigation(d,target=>{if(bindingOptions?.testing&&!target?.hasAttribute('data-binding-test'))bindingOptions.endTest(false);},()=>!!bindingOptions?.capturing||!!bindingOptions?.testing,{sectionChanged:id=>{optionsSection=id;}});
 if(current&&p&&scoreCapabilities(p).pianoPreparation&&!transpose.error){
  const target=current,field=d.querySelector<HTMLInputElement>('[data-score-transpose]')!,notice=d.querySelector('[data-transpose-error]')!,read=()=>transposeDraft(field.value,transpose.min,transpose.max),commit=()=>{try{const steps=read();field.value=String(getScoreTransposition(target.package));notice.textContent='';if(steps!==getScoreTransposition(target.package)){field.disabled=true;d.querySelectorAll<HTMLButtonElement>('[data-manual-key="transpose"] button').forEach(button=>button.disabled=true);void changeTransposition(steps).catch(error=>{if(shownFailures.has(error))return;notify(error.message);if(current===target)options();});}return true;}catch(error){notice.textContent=(error as Error).message;return false;}};
  transposeControls=new ManualTempoControls({accepts:el=>dialog===d&&d.contains(el)&&el.closest<HTMLElement>('[data-manual-key]')?.dataset.manualKey==='transpose'&&!field.disabled,edit:{cancel:()=>{notice.textContent='';},commit:()=>commit(),adjust:(_key,draft,direction)=>{try{const value=transposeDraft(draft.value,transpose.min,transpose.max),next=value+direction;if(next<transpose.min||next>transpose.max)return false;draft.value=String(next);notice.textContent='';return true;}catch(error){notice.textContent=(error as Error).message;return false;}}},adjust:(_key,direction,repeated)=>{if(repeated)return false;const next=getScoreTransposition(target.package)+direction;if(next<transpose.min||next>transpose.max)return false;field.value=String(next);return commit();}});
 }
}

async function startManualPractice(snapshot?:PracticeViewContext){
 const target=current,controller=readingPresentation;if(!target||!controller||!scoreCapabilities(target.package).manualPractice)throw Error('Manual practice needs this part’s complete musical reading.');
 const generation=++manualPracticeGeneration,view=controller.record(),live=()=>generation===manualPracticeGeneration&&current===target&&readingPresentation===controller;
 let fallback:ReferencePerformanceTempo|undefined;
 if(target.package.score.referencePerformanceTempo===undefined){
  const identity={partId:target.package.reading!.dual!.sourcePartId,musicalRevision:controller.revision},name=await manualReferenceStorageName(identity);
  if(!live())return;const raw=await readJson(name);if(!live())return;fallback=readManualReference(raw,identity);
  if(!fallback){fallback=await chooseReference('Practice');if(!live()||!fallback)return;
   const record=manualReferenceRecord(identity,fallback);await enqueue(async()=>{if(live())await writeJson(name,record);});if(!live())return;
  }
 }
 const plan=await planManualPractice(target.package,'bounded-exercises-v1',fallback);if(!live())return;
 const {raw:saved}=await readManualPracticeWithLegacy(plan,readJson);if(!live())return;
 const context=await ManualReadingContext.open(target.package,saved,view,'bounded-exercises-v1',fallback);
 if(!live())return;
 selection=undefined;editNavigation='notes';resetInput();practice?.close();
 const next=new ManualPracticeView(app,{context,personal:target.personal,
  passage:(bars,notation,clip)=>clip?manualPassageClipScene(selectReadingNotation(context.package,notation),bars,clip).svg:manualPassageScene(selectReadingNotation(context.package,notation),bars).svg,
  rotation:()=>orientation.rotation,doneKey:()=>actionControlLabel(effectiveControls(),'done'),settingsKey:()=>actionControlLabel(effectiveControls(),'practiceSettings'),
  workingEditKey:()=>controls.match({kind:'key',key:'KeyS'})?'':'S',freeViewKey:()=>actionControlLabel(effectiveControls(),'practiceFreeView'),navigationKeys:()=>({previous:actionControlLabel(effectiveControls(),'previous'),next:actionControlLabel(effectiveControls(),'next')}),
  audioOutput:()=>preferences.audioOutput??'',save:(record,nextView)=>enqueue(async()=>{
   await writeJson(context.storageName,record);if(!readingViewError)await writeJson(context.viewStorageName,nextView);
   if(current===target&&readingPresentation===controller)controller.adoptView(nextView);
  }),back:()=>{if(practice!==next)return;practice=undefined;controller.adoptView(context.viewRecord());target.package=controller.package;target.personal.view=manualReaderView(controller,target.personal.view);resetInput();render();},
  settings:()=>settings(),changed:(progress,whole)=>{if(practiceSummaries.recordManual(entries.find(entry=>entry.id===target.entry.id),target.entry,context.package,progress,whole))paintLibrarySummaries();}});
 practice=next;await next.mount(snapshot);

}
async function startPractice(context?:PracticeViewContext,admitted?:AdmittedPracticeContext){if(!current)return;adviceKey='';adviceRunner.cancel();if(!admitted){await personalMemory.flush();await livePersonalEditors.get(current)?.queue.flush();}if(readingPresentation){await startManualPractice(context);return;}requirePianoCapability(current.package,'pianoPractice');const target=current;
 // A score without a reference tempo practises toward the player's own tempo,
 // remembered in its practice journal; it is asked for only the first time.
 let tempo:ReferencePerformanceTempo|undefined;
 // An admitted context has already resolved its tempo.
 if(admitted){if(admitted.plan.playerTempo)tempo=admitted.plan.referencePerformanceTempo;}
 else if(target.package.score.referencePerformanceTempo===undefined){
  // Refuse what practice cannot plan before asking for a tempo.
  requirePracticeHands(target.package,target.personal);
  const start=++practiceStartGeneration,prior=practice,owns=()=>start===practiceStartGeneration&&current===target&&practice===prior&&!readingPresentation;
  tempo=savedPlayerTempo(target.package.score,await PracticeView.savedJournal(target.package,target.entry.id),context?.preferences);if(!owns())return;
  if(!tempo){const chosen=await chooseReference('Practice',scoreBeatUnit(target.package.score));if(!chosen||!owns())return;tempo=playerTempo(target.package.score,chosen.bpm);}
 }
 selection=undefined;editNavigation='notes';resetInput();const next=new PracticeView(app,{playerTempo:tempo,rotation:()=>orientation.rotation,doneKey:()=>actionControlLabel(effectiveControls(),'done'),settingsKey:()=>actionControlLabel(effectiveControls(),'practiceSettings'),workingEditKey:()=>controls.match({kind:'key',key:'KeyS'})?'':'S',freeViewKey:()=>actionControlLabel(effectiveControls(),'practiceFreeView'),modeKeys:()=>({reading:actionControlLabel(effectiveControls(),'practiceReading'),timed:actionControlLabel(effectiveControls(),'practiceTimed')}),...{navigationKeys:()=>{const bindings=effectiveControls();return {previous:actionControlLabel(bindings,'previous'),next:actionControlLabel(bindings,'next')};}},package:readerPackage(),basePackage:target.package,personal:target.personal,presentation:()=>currentFingerPresentation(target.package),audioOutput:()=>preferences.audioOutput??'',sustain:()=>musicalSustain.snapshot(),entryId:target.entry.id,connected:()=>!!midiConnection,source:()=>midiConnection?.source??preferences.midi?.source??'',connect:connectMidi,disconnect:disconnectMidi,back:()=>{practice=undefined;resetInput();render();},settings:()=>settings(),changed:(progress,whole)=>{if(practiceSummaries.record(entries.find(entry=>entry.id===target.entry.id),target.entry,target.package,preferences.keyboardLayout,progress,whole))paintLibrarySummaries();}});practice=next;await next.mount(context,admitted);}

async function act(action:string){try{if(!startupReady&&action!=='exit')return;if(action==='practiceSettings'){options();return;}if(action==='cancel-job'){if(job?.state==='working')job.cancel();return;}if(action==='instrument'&&!current){libraryMenu.beginInstrument();return;}if(action==='share'){if(current)notify(scoreSaveMessage(await shareInstalledScore(current.package,host)));return;}if(action==='pdf'){await savePdf();return;}if(action==='practice'){await startPractice();return;}if(practice&&['library','edit'].includes(action)){if(practice instanceof ManualPracticeView){await practice.flush();await savePersonal();}practice.close();practice=undefined;resetInput();render();}if(action==='settings')practice?.pause();if(action==='import'){await importScore();return;}if(action==='settings'){settings();return;}if(action==='close'){closeDialog();return;}if(action==='exit'){await savePersonal();await practice?.flush();await host.close();return;}if(action==='rotate'){preferences.displayRotation=orientation.turn();await savePreferences();if(practice)practice.refit();else if(current)renderPages();else fitSurface(app.querySelector<HTMLElement>('.surface')!,orientation.rotation);if(dialog)fitDialog(dialog,orientation.rotation);return;}if(practice&&['practiceReading','practiceTimed','practiceFreeView'].includes(action)){if(practice instanceof PracticeView)await practice.action(action==='practiceReading'?'reading':action==='practiceTimed'?'timed':'free-view');else if(action==='practiceFreeView')await practice.action('pause');return;}if(practice&&(action==='next'||action==='previous'||action==='done')){await practice.action(action);return;}if(action==='options'){options();return;}if(!current)return;const {package:p,personal:s}=current,v=s.view;
 if(['toggle','edit','feedback','restore-all','undo-restore','earlier-editions','restore-header'].includes(action))requirePianoCapability(p,'pianoPreparation');
 if(action==='library'){adviceKey='';adviceRunner.cancel();sourceReturn=undefined;selection=undefined;editNavigation='notes';await savePersonal();closeDialog();leaveHandEditingWait();current=undefined;readingPresentation=undefined;readingViewError=undefined;resetInput();render();void refreshLibrarySummaries();return;}if(action==='restore-header'){await restoreHeader();return;}if(action==='earlier-editions'){await earlierEditions();return;}if(action==='edit'){selectFinger();return;}if(action==='end-edit'){exitSelection();return;}if(action==='hide'){toolbarVisible=false;renderToolbar();app.querySelector<HTMLElement>('.reader')?.focus();return;}if(action==='feedback'){await host.exportFeedback(JSON.stringify(feedback(p,s),null,2));return;}
 if(selection&&!practice&&['editorNavigation','editorPrevious','editorNext'].includes(action)){
  if(action==='editorNavigation'){editNavigation=editNavigation==='notes'?'measures':'notes';renderEditorNavigation();}
  else if(editNavigation==='measures')selectFingerMeasure(action==='editorPrevious'?-1:1);else selectFinger(action==='editorPrevious'?-1:1);return;
 }
 if(selection&&!practice&&action==='editorSource'){await visitMemorySource();return;}
 if(selection&&!practice&&['memory-reference','memory-inherit'].includes(action)){const target=current;await acceptMemoryAction(target,{kind:action==='memory-reference'?'reference':'reset',ownerId:selection.ownerIds[0],decisionId:crypto.randomUUID(),authoredAt:new Date().toISOString()});return;}
 if(action==='restore-all'||action==='undo-restore'){if(action==='restore-all'||s.undo||s.undoAssignments||s.undoCalculatedOwners){const target=current,ownerDialog=dialog,ownerSection=optionsSection;await acceptMemoryAction(target,{kind:action==='restore-all'?'restoreAll':'undoRestore',ownerId:p.seats[0].ownerIds[0],decisionId:crypto.randomUUID(),authoredAt:new Date().toISOString()});if(current===target){if(dialog===ownerDialog)options(ownerSection);if(practice)practice.refit();else{renderPages();renderToolbar();}}}return;}
 if((selection||practice)&&['next','previous','count','scale'].includes(action))return;
 if(action==='next'||action==='previous'){const shown=readerPackage();current.personal.view=turnPage(v,action==='next'?1:-1,shown.pages.length,viewportFit(innerWidth,innerHeight,effectiveView(v),shown.pages.length).count);}
 else if(action==='toggle'){if(!fingerDisplayAvailable(p,s,currentFingerPresentation(p))){notify('Choose a finger on a note first.');return;}if(preferences.fingerBehavior==='momentary'){refreshPresentation();return;}if(selection){selectionPitchToggle=!selectionPitchToggle;refreshPresentation();renderToolbar();return;}v.labelMode=v.labelMode==='pitch'?'finger':'pitch';}
 else if(action==='count')v.count=(v.count%3+1) as 1|2|3;else if(action==='scale'){const values=[1,.9,.75,.5] as const;v.scale=values[(values.indexOf(v.scale)+1)%4];}else return;
 if(practice)refreshPresentation();else{renderPages();renderToolbar();savePersonalQuietly();}
 }catch(error){reportFailure(error);}}

app.addEventListener('click',e=>{const el=e.target as HTMLElement;const openEl=el.closest<HTMLElement>('[data-open]');if(openEl){void open(entries.find(q=>q.id===openEl.dataset.open)!).catch(reportFailure);return;}const seatEl=el.closest<HTMLElement>('[data-viewer-seat],[data-finger-seat]');if(seatEl&&current&&!practice){void edit(readerPackage().seats.find(s=>s.id===(seatEl.dataset.viewerSeat??seatEl.dataset.fingerSeat))!,{x:e.clientX,y:e.clientY});return;}const b=el.closest<HTMLElement>('[data-action]');if(b){if(b.dataset.action==='toggle'&&preferences.fingerBehavior==='momentary'){return;}void act(b.dataset.action!);}});
document.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest<HTMLElement>('dialog [data-action]');if(b)void act(b.dataset.action!);});
app.addEventListener('pointerdown',e=>{const control=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-action=toggle]');if(!current||dialog||preferences.fingerBehavior!=='momentary'||!control||control.disabled||e.button!==0)return;input.holdPointer(e.pointerId);void act('toggle');});
window.addEventListener('pointerup',e=>{if(input.releasePointer(e.pointerId))refreshPresentation();});
window.addEventListener('pointercancel',e=>{if(input.releasePointer(e.pointerId))refreshPresentation();});
app.addEventListener('change',e=>{const el=e.target as HTMLSelectElement;if(!current||!el.dataset.option)return;const v=current.personal.view,key=el.dataset.option as keyof typeof v;(v as any)[key]=['count','scale'].includes(key)?Number(el.value):el.value;renderPages();renderToolbar();savePersonalQuietly();});
document.addEventListener('change',e=>{const field=e.target as HTMLSelectElement;if(field.matches('[data-notation-system]')){const choice=field.value==='traditional'?'traditional':'iso';void saveNotationSystem(choice).catch(error=>{notify(error.message);field.value='iso';});return;}if(field.matches('[data-reading-part]')){void switchReadingPart(field.value).catch(error=>{reportFailure(error);if(!practice)renderToolbar();});return;}if(field.matches('[data-reading-notation]')){void switchReadingNotation(field.value).catch(error=>notify(error.message));return;}if(field.matches('[data-keyboard]')){void switchKeyboard(field.value);return;}if(field.matches('dialog [data-finger-behavior],dialog [data-finger-replacement]')){if(field.matches('[data-finger-behavior]'))preferences.fingerBehavior=fingerBehavior(field.value);else preferences.fingerPresentation=fingerPresentation((field as unknown as HTMLInputElement).checked?'replacement':'annotations');resetInput();if(current){if(field.matches('[data-finger-behavior]'))current.personal.view.labelMode='pitch';refreshPresentation();renderToolbar();savePersonalQuietly();}void savePreferences();return;}});
window.addEventListener('mousemove',e=>{if(current&&(e.clientY>innerHeight-36||e.clientX<20||e.clientX>innerWidth-20))reveal();});
window.addEventListener('resize',()=>{if(dialog)fitDialog(dialog,orientation.rotation);if(practice)return;if(current)renderPages();else {const surface=app.querySelector<HTMLElement>('.surface');if(surface)transformSurface(surface,orientation.rotation);}});
window.addEventListener('pagehide',()=>{if(job?.state==='working')job.cancel();readerAdmission.clear();});
window.addEventListener('blur',loseFocus);window.addEventListener('focus',gainFocus);
document.addEventListener('visibilitychange',()=>{if(document.hidden)loseFocus();else if(document.hasFocus())gainFocus();});
document.addEventListener('focusin',e=>{const target=e.target as HTMLElement;bindingOptions?.focusChanged(target);if(target.closest?.('input,select,textarea,[contenteditable=true]'))resetInput();});
window.addEventListener('keyup',e=>{bindingOptions?.keyUp(e);practice?.releaseTempoKey(inputCode(e));const released=controls.keyUp(e);if(input.up(e)||released)refreshPresentation();});
window.addEventListener('keydown',e=>{if(!startupReady){if(!startupFailed)e.preventDefault();return;}if(applicationNavigationKey(e)){e.preventDefault();return;}syncControls();if(bindingOptions?.keyDown(e)){e.preventDefault();return;}if(dialog?.dataset.kind==='options'){controls.keyDown(e,false);if(optionsNavigation?.picking&&optionsNavigation.keyDown(e)){e.preventDefault();return;}if(optionsSection==='keys'&&e.code==='KeyT'&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.repeat&&!(e.target instanceof HTMLInputElement&&!e.target.readOnly&&e.target.closest('[data-manual-key]'))){e.preventDefault();optionsNavigation?.cancelPicker(false);bindingOptions?.startTest();return;}if(optionsNavigation?.keyDown(e)){e.preventDefault();return;}if(e.code==='Escape'){e.preventDefault();if(!e.repeat)closeDialog();return;}return;}if(dialog&&dialog.dataset.kind!=='options'){controls.keyDown(e,false);if(dialogNavigation?.keyDown(e)){e.preventDefault();return;}if(e.code==='Escape'){e.preventDefault();if(!e.repeat)closeDialog();}return;}const keypadAssigned=e.code==='NumpadEnter'&&controls.match({kind:'key',key:chord(e)}),uiCode=keypadAssigned?inputCode(e):actionCode(e),focused=e.target as HTMLElement,inField=!!focused.closest?.('input,select,textarea,[contenteditable=true]')&&!(focused instanceof HTMLInputElement&&(focused.readOnly&&focused.closest('[data-manual-key]:not([data-manual-editing])')||focused.type==='checkbox'&&practice?.bindingContext.active&&focused.closest('.practice-controls'))),capture=!!input.capture,activePracticeFooter=!!practice?.bindingContext.active&&!!focused.closest?.('.practice-controls');
 if(!current&&!dialog&&libraryMenu.choosingInstrument&&e.repeat&&!['ArrowUp','ArrowDown'].includes(e.code)){e.preventDefault();return;}if(!current&&!dialog&&libraryMenu.popupKey(actionCode(e))){e.preventDefault();return;}
 if(!dialog&&selection&&focused.closest?.('.editor-navigation')&&['Enter','Space'].includes(uiCode)){e.preventDefault();if(!e.repeat&&!input.held.has(inputCode(e))){input.down(e,false,true);const button=focused.closest<HTMLButtonElement>('[data-action]');if(button&&!button.disabled)void act(button.dataset.action!);}return;}
 if(!dialog&&current&&preferences.fingerBehavior==='momentary'&&focused.closest?.('[data-action=toggle]')&&['Enter','Space'].includes(uiCode)){e.preventDefault();if(!e.repeat&&!input.held.has(inputCode(e))){input.holdControl(inputCode(e));void act('toggle');}return;}
 if(e.repeat&&!inField&&['Enter','Space'].includes(uiCode)){e.preventDefault();return;}
 if(!dialog&&current&&!practice&&!keypadAssigned&&focused.closest?.('.toolbar')&&(toolbarNavigation?.keyDown(e)||toolbarNavigation?.picking)){e.preventDefault();return;}
 // Practice commands do not navigate footer buttons. Mouse-opened drafts and
 // explicitly assigned keys retain their own authority.
 if(!dialog&&practice&&practice.bindingContext.active&&uiCode==='Space'&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.shiftKey&&!capture&&!inField&&!controls.matchKey(e)&&readerFocused&&!document.hidden){const held=input.held.has(inputCode(e));input.down(e,false,true);controls.keyDown(e,false);e.preventDefault();if(!e.repeat&&!held)void practice.action('ready');return;}
 if(!dialog&&practice&&focused.matches('[data-practice-display=manual]')&&['ArrowDown','ArrowRight'].includes(e.code)&&!e.ctrlKey&&!e.altKey&&!e.metaKey){e.preventDefault();app.querySelector<HTMLElement>('.practice-overview [data-passage-id][tabindex="0"]')?.focus();return;}
 if(activePracticeFooter&&!inField&&['Enter','Space'].includes(uiCode))e.preventDefault();
 const repeatedDown=input.held.has(inputCode(e)),selectionDigit=!!selection&&(directFingerKey(e)!==undefined||!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.shiftKey&&['KeyL','KeyR'].includes(inputCode(e)));input.down(e,false,true);const result=controls.keyDown(e,(!!current||controls.matchKey(e)?.action==='practiceSettings')&&readerFocused&&!document.hidden&&!dialog&&!inField&&!selectionDigit&&!practice?.modalOpen);
 if(capture||inField){practice?.cancelTempoHold();return;}
 if(e.ctrlKey||e.altKey||e.metaKey)practice?.cancelTempoHold();
 if(!inField&&!capture&&!practice?.modalOpen&&readerFocused&&!document.hidden&&!repeatedDown&&rotationShortcut(e,!!controls.matchKey(e))){e.preventDefault();void act('rotate');return;}
 if(practice?.modalOpen&&!dialog){if(e.code==='Escape'){e.preventDefault();practice.key('Escape');}return;}
 if(practice?.canAdjustWorking&&!dialog&&!inField&&!capture&&readerFocused&&!document.hidden&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.shiftKey){const owner=controls.matchKey(e);if(workingSpeedArrow(uiCode,owner,preferences.freeViewControls)!==undefined){e.preventDefault();practice.key(uiCode,e.repeat||repeatedDown);return;}if(uiCode==='KeyS'&&!owner){e.preventDefault();if(!e.repeat&&!repeatedDown)practice.editWorking(inputCode(e));return;}}
 if(practice&&!dialog&&uiCode==='Enter'&&focused.closest('[data-practice=done]')&&(e.repeat||repeatedDown)){e.preventDefault();return;}
 if(practice&&!dialog&&result.action&&result.action!=='toggle'&&!(uiCode==='Enter'&&!activePracticeFooter&&focused.closest('button,a,summary'))&&controlActionAllowed(result.action,{modal:!!practice.modalOpen,selecting:!!selection,practice:true,practicePaused:practice.canTurnPage,practiceDone:practice.canMarkDone,practiceModes:practice instanceof PracticeView&&practice.bindingContext.active,practiceFreeView:practice?.bindingContext.active})){if(result.action==='done'&&app.querySelector('.practice-overview:not([hidden])')){}else{e.preventDefault();void act(result.action);return;}}
 if(practice&&!dialog&&result.action==='toggle'){e.preventDefault();void act('toggle');return;}
 if(e.repeat&&current&&!dialog&&!inField&&!selection&&readerFocused&&!document.hidden&&(!practice||app.dataset.practicePhase==='paused'||practice instanceof ManualPracticeView&&practice.canTurnPage)){const action=controls.match({kind:'key',key:chord(e)})?.action;if((action==='previous'||action==='next')&&controlActionAllowed(action,{modal:!!practice?.modalOpen,selecting:false,practice:!!practice,practicePaused:practice?.canTurnPage})){e.preventDefault();void act(action);return;}}
 if(practice&&!dialog&&!inField&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&(uiCode!=='KeyX'||readerFocused&&!document.hidden&&!e.shiftKey&&!controls.matchKey(e))&&!(practice.canAdjustWorking&&['ArrowLeft','ArrowRight'].includes(uiCode))&&!(e.shiftKey&&inputCode(e)==='KeyV')&&practice.key(uiCode,e.repeat||repeatedDown)){e.preventDefault();return;}
 if(e.code==='Escape'&&!e.repeat){e.preventDefault();if(dialog)closeDialog();else if(selection)exitSelection();else if(current)void act('library');else void host.fullscreen(false);return;}
 if(dialog)return;
 if(!current&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&inputCode(e)==='KeyI'&&!e.repeat){e.preventDefault();libraryMenu.beginInstrument();return;}
 if(!current&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&libraryMenu.key(actionCode(e),focused)){e.preventDefault();return;}
 const seat=focused.closest?.<HTMLElement>('[data-viewer-seat]');
 if(selection){if(result.action==='practiceSettings'){e.preventDefault();void act(result.action);return;}const inToolbar=!!focused.closest?.('.toolbar');if(result.action==='toggle'){e.preventDefault();void act('toggle');return;}if(!inToolbar&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.shiftKey&&['KeyL','KeyR'].includes(inputCode(e))){e.preventDefault();if(!e.repeat&&!repeatedDown&&readerFocused&&!document.hidden)void saveHandChoice(inputCode(e)==='KeyL'?'LH':'RH').catch(error=>notify(`Hand choice is pending: ${error.message}`));return;}const replacement=directFingerKey(e);if(!inToolbar&&replacement!==undefined){e.preventDefault();if(!e.repeat&&!repeatedDown&&readerFocused&&!document.hidden){void saveFingerDigit(replacement).catch(error=>notify(`Finger was not saved: ${error.message}`));}return;}if(!inToolbar&&result.action&&isEditorAction(result.action)){e.preventDefault();void act(result.action);return;}if(!inToolbar&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&e.code==='Tab'){e.preventDefault();if(!e.repeat&&!repeatedDown&&readerFocused&&!document.hidden)selectFinger(e.shiftKey?-1:1);return;}if(!inToolbar&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.shiftKey&&(e.code==='ArrowUp'||e.code==='ArrowDown')){e.preventDefault();if(!e.repeat&&!repeatedDown&&readerFocused&&!document.hidden)selectFingerSystem(e.code==='ArrowUp'?-1:1);return;}if(!inToolbar&&uiCode==='Enter'){e.preventDefault();if(!e.repeat)void edit(selection);return;}if(inputCode(e)==='KeyH'&&!e.repeat){e.preventDefault();reveal(true);return;}if(inToolbar)return;e.preventDefault();return;}
 if(seat&&current&&uiCode==='Enter'&&!e.repeat){e.preventDefault();void edit(readerPackage().seats.find(s=>s.id===seat.dataset.viewerSeat)!);return;}
 if(result.action){if(result.action==='done'&&uiCode==='Enter'&&!activePracticeFooter&&focused.closest('button,a,summary'))return;e.preventDefault();if(controlActionAllowed(result.action,{modal:!!dialog||!!practice?.modalOpen,selecting:!!selection,practice:!!practice,practicePaused:practice?.canTurnPage,practiceDone:practice?.canMarkDone,practiceModes:practice instanceof PracticeView&&practice.bindingContext.active,practiceFreeView:practice?.bindingContext.active}))void act(result.action);return;}if(e.repeat)return;
 if(e.code==='Tab'&&current&&!toolbarVisible){reveal(true);e.preventDefault();return;}
 if(e.ctrlKey||e.altKey||e.metaKey)return;const commands:Record<string,string>={KeyC:'count',KeyS:'scale',KeyM:'import',...(!practice?{KeyP:'practice'}:{})};if(inputCode(e)==='KeyH'&&current){e.preventDefault();if(toolbarVisible)void act('hide');else reveal(true);return;}if(commands[inputCode(e)]){e.preventDefault();void act(commands[inputCode(e)]);}});

function onMidiNote(event:MidiNote){
 if(!startupReady)return;

 if(event.generation!==midiConnection?.generation||event.source!==midiConnection.source||!pitchInput.accepts(event))return;
 midiOptions?.receive(event);
 if(!readerFocused||document.hidden)return;
 if(practice instanceof PracticeView)practice.observeHeldInput(event);
 if(dialog)return;
 practice?.observe(event);
 practice?.note(event);
}

/** A choice from a key press applies to the selected note; a waiting hand
 * choice applies to the note it was made on, leaving the selection as it is. */
async function saveSelectedChoice(choice:{hand?:PersonalHand;finger?:number},advance:boolean,waitedOwner?:string){
 if(!current||!selection&&!waitedOwner)return;
 const chosenScore=current,chosenSeat=selection;
 // The choice belongs to the note it was made on, even if hand editing is not ready yet.
 if(choice.hand&&!waitedOwner&&scoreCapabilities(chosenScore.package).pianoPreparation){
  const wait=handEditingWait(chosenScore);
  if(wait){wait.queue.add({key:chosenSeat!.ownerIds[0],hand:choice.hand,bar:chosenSeat!.writtenBar});wait.status.queue(wait.queue.list());return;}
 }
 const target=chosenScore,seat=chosenSeat,units=editUnits(readerPackage()),index=seat?units.findIndex(s=>s.contactId===seat.contactId):-1,nextSeat=waitedOwner||!seat?selection:advance?units[Math.min(units.length-1,index+1)]??seat:seat;
 const decisionId=crypto.randomUUID(),authoredAt=new Date().toISOString(),ownerId=waitedOwner??seat!.ownerIds[0];
 if(choice.finger!==undefined&&(!Number.isInteger(choice.finger)||choice.finger<1||choice.finger>5))throw Error('Choose a finger from 1 to 5.');
 const action:PersonalMemoryAction=choice.hand?{kind:'hand',ownerId,hand:choice.hand,decisionId,authoredAt}:{kind:'finger',edit:{ownerId,finger:choice.finger as 1|2|3|4|5,decisionId,authoredAt}};
 if(personalEditor(target).recovering)throw Error('Personal edit recovery is already running.');if(personalEditor(target).queue.error)throw personalEditor(target).queue.error;
 const receipt=personalMemory.accept(memoryInput(target),action),next=receipt.personal;
 if(waitedOwner||!nextSeat){await presentPersonalChange(target,next,receipt.saved);return;}
 next.editContactId=nextSeat.contactId;
 if(!viewportFit(innerWidth,innerHeight,effectiveView(next.view),readerPackage().pages.length).pages.includes(nextSeat.page))next.view.page=nextSeat.page;
 capturePersonalNavigation(next,readerPackage(),nextSeat,true);
 await presentPersonalChange(target,next,receipt.saved,nextSeat);
}
function saveFingerDigit(replacement:number){return saveSelectedChoice({finger:replacement},true).catch(error=>{if(current&&(personalMemory.error||personalEditor(current).queue.error))paintPersonalSaveError(current,error);throw error;});}
function saveHandChoice(hand:PersonalHand){return saveSelectedChoice({hand},false).catch(error=>{if(current&&(personalMemory.error||personalEditor(current).queue.error))paintPersonalSaveError(current,error);throw error;});}

/** Hand choices made while the engraver settles for hand editing: shown,
 * kept in order (one per note) and applied once it is ready. */
interface HandEditingWait {target:NonNullable<typeof current>;status:HandPreparationStatus;queue:HandChoiceQueue;ready:Promise<boolean>;showing:boolean}
let handWait:HandEditingWait|undefined;
function paintHandPreparation(){if(handWait?.showing&&current===handWait.target&&!practice)handWait.status.show(app.querySelector('.surface'));}
/** The wait for hand editing on this score, shown at once; undefined when a
 * hand choice may be saved now. Throws when the score takes no hand choices. */
function handEditingWait(target:NonNullable<typeof current>):HandEditingWait|undefined{
 if(handWait?.target===target)return handWait;
 const session=personalEditor(target).session,check=session.handChoiceCheck();if(!check)return;
 const status=new HandPreparationStatus(session.preparationStage),unlisten=session.onPreparationStage(stage=>status.stage(stage));
 const wait:HandEditingWait={target,status,queue:new HandChoiceQueue(),ready:check.finally(()=>{unlisten();wait.showing=false;status.close();}),showing:true};
 handWait=wait;paintHandPreparation();
 void wait.ready.then(ready=>applyWaitingHandChoices(wait,ready),error=>{
  const choices=wait.queue.take();if(handWait===wait)handWait=undefined;
  if(choices.length)notify(abandonedChoicesText(choices,(error as Error).message));});
 return wait;
}
/** Apply waiting choices oldest first; a choice made meanwhile joins the end.
 * The outcome says which landed, which notes kept their hand because the
 * engraver cannot draw it yet, and which were not applied. */
async function applyWaitingHandChoices(wait:HandEditingWait,ready:boolean){
 const applied:WaitingHandChoice[]=[],kept:WaitingHandChoice[]=[];
 try{
  if(!ready||current!==wait.target){const choices=wait.queue.take();if(choices.length)notify(abandonedChoicesText(choices));return;}
  for(let choice=wait.queue.shift();choice;choice=wait.queue.shift()){
   if(current!==wait.target){const unapplied=[choice,...wait.queue.take()];notify(applied.length||kept.length?waitingOutcomeText({applied,kept,unapplied,reason:'the score was closed or changed first'}):abandonedChoicesText(unapplied));return;}
   try{await saveSelectedChoice({hand:choice.hand},false,choice.key);}
   catch(error){
    // As with a direct press, a refused or unsaved choice is not counted as applied; the save panel offers its retry.
    const unapplied=[choice,...wait.queue.take()];
    if(current===wait.target&&(personalMemory.error||personalEditor(wait.target).queue.error))paintPersonalSaveError(wait.target,error as Error);
    notify(waitingOutcomeText({applied,kept,unapplied,reason:(error as Error).message}));return;
   }
   (handFor(wait.target.package,wait.target.personal,choice.key)===choice.hand?applied:kept).push(choice);
  }
  if(applied.length||kept.length)notify(waitingOutcomeText({applied,kept}));
 }finally{if(handWait===wait)handWait=undefined;}
}
/** Leaving the score: its waiting choices are said to be not applied now,
 * rather than when the engraver later stops. */
function leaveHandEditingWait(){
 const wait=handWait;if(!wait)return;
 wait.showing=false;wait.status.close();const choices=wait.queue.take();if(choices.length)notify(abandonedChoicesText(choices));
}
function paintLibrarySummaries(){if(!startupReady||current||practice)return;if(dialog){librarySummaryPaintPending=true;return;}renderLibrary();}
const libraryProgressContext=()=>JSON.stringify([preferences.keyboardLayout,entries]);
const summariesBlocked=()=>!!current||!!practice||!!readingOperation||job?.state==='working'||job?.state==='installing';
async function loadPracticeTotals(onProgress?:(completed:number,total:number)=>void){
 if(summariesBlocked())return false;
 const context=libraryProgressContext(),keyboard=preferences.keyboardLayout,epoch=readingGeneration,
  isCurrent=()=>epoch===readingGeneration&&context===libraryProgressContext()&&!summariesBlocked();
 return practiceSummaries.refresh(entries,keyboard,{
  readPackage:async file=>{await paintCheckpoint();return isCurrent()?host.read(file):null;},
  readRecord:async file=>{await paintCheckpoint();if(!isCurrent())throw Error('Library summary was superseded.');return readJson(file);},
  readCache:file=>host.read(file),writeCache:(file,bytes)=>host.write(file,bytes)
 },isCurrent,onProgress);
}
let summaryLoadingGeneration=0;
async function refreshLibrarySummaries(){
 libraryLoadingStatus?.remove();libraryLoadingStatus=undefined;
 const generation=++summaryLoadingGeneration;let status:HTMLElement|undefined,completed=0,total=entries.length;
 const updating=new LoadingProgress('Updating your library',['summaries'],{compact:true});updating.step('summaries');
 const progress=(count:number,size:number)=>{if(generation!==summaryLoadingGeneration)return;completed=count;total=size;(startupReady?updating:startupLoading)?.counted(count,size,size===1?'score':'scores');};
 const timer=window.setTimeout(()=>{
  if(!startupReady||generation!==summaryLoadingGeneration||summariesBlocked())return;
  status=document.createElement('aside');status.className='viewer-library-loading';status.innerHTML=updating.markup();
  app.querySelector('.surface')?.append(status);libraryLoadingStatus=status;updating.attach(status);progress(completed,total);
 },120);
 try{const changed=await loadPracticeTotals(progress);if(generation===summaryLoadingGeneration&&changed)paintLibrarySummaries();}
 finally{clearTimeout(timer);updating.stop();status?.remove();if(libraryLoadingStatus===status)libraryLoadingStatus=undefined;}
}
let startupLoading:LoadingProgress|undefined;

async function boot(){
 try{
  const loading=startupLoading=new LoadingProgress('Starting Score Viewer',['library','settings','fingerings','input','summaries']);
  app.classList.add('viewer-startup');app.innerHTML=loading.markup();loading.attach(app);loading.step('library');
  await paintCheckpoint();
  const lib=await readJson<{version:number;entries:Entry[]}>('library.json');
  if(lib){
   if(lib.version!==1||!Array.isArray(lib.entries)||lib.entries.some(e=>!validEntryStorage(e)))throw Error('Library identity differs; data retained');
   // SCORE-FILE MIGRATION: see score-file-migration.ts.
   entries=(await migrateScoreFiles(host,{version:1,entries:lib.entries})).entries;
  }
  loading.step('settings');
  const saved=await readJson<typeof preferences>('preferences.json');
  if(saved){
   if(saved.version!==1||![0,90,180,270].includes(saved.libraryRotation))throw Error('Preferences version differs; data retained');
   preferences={...saved,keyboardLayout:keyboardPreference(saved.keyboardLayout,entries.some(e=>e.id==='e363c2897ab1a85fb6a4178ab1514987d7b6d207be92b56a90dbb0a5a5d5bc27')),
    bindings:readBindings(saved.bindings),...fingerPreferences(saved),midi:readMidiMapping(saved.midi),midiBindings:saved.midiBindings===undefined?undefined:readMidiBindings(saved.midiBindings,saved.midi)};
  }
  if(preferences.lastWorkedEntryId!==undefined&&(typeof preferences.lastWorkedEntryId!=='string'||!/^[a-f0-9]{64}$/.test(preferences.lastWorkedEntryId)))throw Error('Saved score selection differs; data retained');
  if(preferences.audioOutput!==undefined&&typeof preferences.audioOutput!=='string')throw Error('Saved audio output differs; data retained');
  try{pianoSettings=readPianoPreferences(preferences.piano);}catch(error){pianoSettings=defaultPianoPreferences();pianoWarning=(error as Error).message;}
  preferences.fingeringAdvice=readFingeringAdviceSettings(preferences.fingeringAdvice);
  orientation=new ViewerOrientation(preferences);input=new InputController(preferences.bindings);
  mainControls=readControlBindings(preferences.controlBindings,preferences);
  preferences.freeViewControls=readFreeViewControlOverrides(preferences.freeViewControls,mainControls);controls.configure(mainControls);
  loading.step('fingerings');await applyPendingConsolidation();
  loading.step('input');
  await host.onFocusChange(focused=>{if(!focused)loseFocus();else gainFocus();});
  await host.onMidi(onMidi,status=>{
   if(status.generation===midiConnection?.generation&&status.source===midiConnection?.source){
    bindingOptions?.connectionChanged();musicalSustain.clear();midiConnection=undefined;
    bindingOptions?.paint();if(practice instanceof PracticeView)practice.clearHeldInput();
    practice?.pause();resetInput();practice?.pause();notify(status.message);midiOptions?.lost(status.message);
   }
  },onMidiNote);
  await host.fullscreen(true);await paintCheckpoint();
  loading.step('summaries');
  await refreshLibrarySummaries();
  if(pianoSettings.enabled)loading.step('sound');await paintCheckpoint();
  const requestedPiano=pianoSettings.enabled;
  try{const audio=await configurePiano();if(requestedPiano&&(!audio?.enabled||!audio.ready||audio.error))pianoWarning=`Piano sound is off: ${audio?.error??'The saved sound configuration is unavailable. Review Piano sound in Options.'}`;}catch(error){pianoWarning=`Piano sound is off: ${(error as Error).message}`;}
  startupReady=true;loading.stop();startupLoading=undefined;resetInput();app.classList.remove('viewer-startup');render();
  if(pianoWarning||startupNotice)notify([pianoWarning,startupNotice].filter(Boolean).join(' '));
 }catch(error){
  startupFailed=true;app.classList.add('viewer-startup');
  if(startupLoading&&app.querySelector('.viewer-loading')){const message=(error as Error).message.trim();startupLoading.setTitle('The library could not open');startupLoading.fail(`${/[.!?]$/.test(message)?message:`${message}.`} Your saved files are kept as they were.`,button('Close Viewer','exit'));}
  else app.innerHTML=`<section class="viewer-loading" data-loading-state="failed"><h2 class="viewer-loading-title">The library could not open</h2><p class="viewer-loading-message" role="alert">${esc((error as Error).message)} Your saved files are kept as they were.</p><div class="viewer-loading-footer">${button('Close Viewer','exit')}</div></section>`;
  startupLoading=undefined;
 }
}
void boot();
