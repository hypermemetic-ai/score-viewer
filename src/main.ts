import {workName} from './score-catalog';
import {arrangeBottomNavigation,arrangeDialogNavigation,applicationNavigationKey} from './application-navigation';
import {stagePracticeEditionTransfer} from './practice-edition-install';
import {footerFontNoticeUrl} from './annotation-ink-policy';
import {ViewerOrientation,fitSurface,fitDialog} from './orientation';
import{ObservedMidiSustain,isMusicalSustain}from'./midi-sustain';
import {shareInstalledScore,scoreSaveMessage} from './share-score';
import './style.css';
import './readiness-notice.css';
import './application-navigation.css';
import {annotationPositions,paintFinger,type AnnotationPosition} from './fingering-presentation';
import {expertSettings,fingerBehaviorSettings} from './expert-settings';
import {MidiOptionsPanel,AudioOptionsPanel} from './device-options';
import {PianoOptionsPanel} from './piano-options';
import {getPiano as getPianoSound} from './piano-acquire';
import './piano-options.css';
import {nativePiano,type PianoAudioStatus} from './piano-host';
import {builtInClicks,cueGain,cueVolume,defaultPianoPreferences,loadPianoPreferences,PIANO_LEVELS,readPianoPreferences,type PianoPreferences} from './piano-preferences';
import {OptionsBindingsPanel,optionsBindingRows} from './options-bindings';
import {OptionsNavigation} from './options-navigation';
import {workingSpeedArrow} from './practice-shortcuts';
import {PackageAdmissionSession,admissionRejection} from './package-admission-session';
import {optionsSectionsMarkup,type OptionsSection} from './options-sections';
import {ReaderPageCache,createReaderPage,mountReaderPages,type ReaderPage} from './reader-page-cache';
import {mountScorePrint,pdfSaveMessage,scorePageSize,scorePdfFilename} from './score-pdf';
import {navigationHint} from './navigation-hint';
import {ControlResolver,readControlBindings,actionControlLabel,practiceControlBindings,controlActionAllowed,editorControlBindings,readerControlBindings,isEditorAction,type ControlBindings} from './control-bindings';
import {freeViewControlBindings,readFreeViewControlOverrides,changeScopedControls,type FreeViewControlOverrides} from './free-view-controls';
import {requireReferencePerformanceTempo,type ReferencePerformanceTempo} from '../vendor/iso-notation/src/model/reference-performance-tempo';
import {playerTempo,savedPlayerTempo,scoreBeatUnit} from './player-tempo';
import {beatUnitSvg,metronomeMark,perMinuteSuffix,tempoRateNumber} from './metronome-mark';
import {ManualTempoControls,manualTempoField} from './manual-tempo-control';
import {scoreOptionsMarkup,transposeDraft} from './score-options';
import {auditionStartTempo,countedBeat,ownerScoreTempo,playingTimeLabel,readPracticeGoal,resolveScoreTempo,scoreTempoOriginText,tempoOnBeat,wholeTempoOnBeat,withOwnerScoreTempo,type ScoreTempo} from './score-tempo';
import {buildPerformanceSchedule,performanceSeconds} from './score-performance';
import {TempoAudition,type Audition} from './tempo-audition';
import {NativeTempoAudition} from './native-tempo-audition';
import {mountTempoAudition,tempoAuditionMarkup} from './tempo-audition-dialog';
import {workHeadingMarkup,workReference} from './score-catalog';
import {getScoreTransposition,scoreTranspositionRange,getOriginalScorePackageBytes,scoreTranspositionCompatible,sameHandsAtPitch,prepareSourceTransposition} from './score-transposition';
import {personalForTransposedEdition} from './transposed-personal';
import {retainedTranspositionFile,nextTranspositionSelection,assertSelectedTransposition} from './score-transposition-selection';
import {PitchInputEpoch,FINGERS_LAYOUT_TEMPO,type AdmittedPracticeContext,type PracticeFoldSource,type PracticeViewContext} from './practice-context';
import {PracticeView} from './practice-view';
import {READINESS_WORDS,ScoreReadiness,afterPaint,nextTask,prepareAfterPaint,type ReadinessStage} from './score-readiness';
import {PendingPress,ReadinessNotice,trackToolbarHeight,type ReadinessNoticePlace} from './readiness-notice';
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
import {requirePracticeHands} from './practice';
import {LoadingProgress,LOADING_STEPS,type LoadingStepId} from './viewer-loading';
import {checkReadingExecution,type ReadingExecution} from './reading-execution';
import {SavedPagesLackRepeats,SavedPagesBehindPolicy,requireCurrentEngraving,keepSavedPagesBehindPolicy,savedPagesBehindPolicy,keepSavedPagesWithoutRepeats,editionNeedsEngravingAgain,useCalculatedAdmissionEvidence,useReadingAdmissionReceipts,usePianoPageCheckReceipts,hashBytes,selectPresentation,sameFrozenPayload,headerOnlyRefresh,referenceMidiDiffers,type ScorePackage,type FingerLayer,type Seat} from './package';
import {activeLayer,corrected,defaultView,EDITOR_COLUMN,readerFit,effectiveLabelMode,fingerDisplayAvailable,feedback,fingerFor,initialPersonal,readPersonal,collectionId,personalStorageName,practiceStorageName,legacyPracticeStorageName,validEntryStorage,rotate,turnPage,viewportFit,type Entry,type PersonalState,type PersonalSourceAnchor,type Rotation} from './state';
import {loadPersonalJournal} from './personal-journal';
import {rotationKey,rotationShortcut,InputController,defaultBindings,readBindings,readingActionAllowed,fingerBehavior,fingerPresentation,fingerPreferences,readableChord,actionCode,inputCode,chord,directFingerKey,type Bindings,type ReadingAction,type FingerBehavior,type FingerPresentation} from './input';
import {host,readJson,writeJson} from './host';
import {keyboardPreference,keyboardLabel,layoutName,writtenAnchor,anchorView} from './keyboard-selection';
import {ensurePianoReady,useFingerReplayReceipts} from './piano-readiness';
import type {PianoPrepared} from './piano-readiness';
interface PreparedScore {packageBytes:Uint8Array;package:ScorePackage;personal?:PersonalState}
import {stagePresentationInstall} from './presentation-install';
import {prepareRetainedEdition,readRetainedEdition} from './retained-editions';
import {prepareRebuiltEdition,rebuildEdition,addKeyboardView,canAddKeyboardView,canShareKeyboardView,shareKeyboardView,personalForAddedKeyboard,type RebuiltInstall} from './edition-rebuild';
import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';
import type {AdmittedReading} from '../vendor/iso-notation/src/score-presentation';

import {editUnits,moveSelection,nextInHand,selectionOnPage,systemSelection,measureSelection} from './selection';
import {LibraryMenu,instrumentPickerMarkup,libraryFocusKey,libraryFocusElement} from './library-menu';
import {EditSequence} from './edit-sequence';
import {PersonalEditQueue} from './personal-edit-queue';
import {ConsolidationDeferred,PersonalMemorySession,rawMemoryPersonal,type PersonalMemoryAction} from './personal-memory-session';
import {pendingPersonalConsolidation} from './personal-consolidation-request';
import {PersonalMemoryResolutionCache,personalMemoryResolutionKey,AfterPaintWork} from './personal-memory-cache';
import {PersonalMemoryLibrary,readingOnlyArchive} from './personal-memory-library';
import {AHEAD_OF_TIME_KIND,AheadOfTimeEngraving,AheadOfTimeRefusal,aheadOfTimeOrder,holdAheadOfTimeOnInput,preparedBefore,prepareRecorded,refusedWhen,type AheadOfTimeWork} from './ahead-of-time-engraving';
import {engravedAgainFromRecord,useEngravedAgainStore} from './engraved-again';
import {ENGRAVE_AGAIN_KINDS,engraveAgainInWorker} from './engrave-again-client';
import {projectionWorkerClient,type ProjectionWorkerClient} from './personal-projection-client';
import {withResolvedMemory,memoryAdviceEvidence,memoryReferenceTarget,memoryChoiceLabel,memoryFingerSource} from './personal-assistance';
import type {MemoryScoreInput,PersonalFingeringMemory} from './personal-fingering-memory';
import {effectiveAssignmentKey} from './personal-assignments';
import {EditorAdviceRunner,scoreAdviceContacts,analyzeEditorAdviceAsync,createAdviceCorpusState,replaceAdviceCorpusScore,type EditorAdviceResult} from './fingering-advice';
import {storedAdviceCorpus,saveAdviceCorpus} from './fingering-advice-store';
import {FingeringAdviceOptions,readFingeringAdviceSettings,type FingeringAdviceSettings} from './fingering-advice-settings';
import {selectedAdviceExplanations} from './fingering-advice-markers';
import {paintEditorAdvice} from './editor-advice-view';
import './fingering-advice.css';
import './personal-assistance.css';
import {dropHandCarry,handCarryDropGeneration,effectiveHands,handFor,handsDiffer,restorePersonalAssignment,type PersonalHand} from './personal-assignments';
import {FOLD_FAILURE_TEXT,FoldFailure,FoldedReader,editOwners,foldedTwins,repeatsMayFold,useVerbatimFoldCache,withRepeatInheritance,writtenOutRepeat,writtenView,type FoldedPackage,type WrittenOutRepeat} from './repeat-fold';
import {PersonalPresentationSession,separatePreparations,projectionServed,type ProjectionEntry,adoptImportedReading,engravingRefusal,undrawableHandOwners,undrawableHandReason,cancelPersonalPrefetch,usePersonalProjectionCache} from './personal-presentation';
import {droppedCarryText,handActionNotice,handChoiceView,handCarryNotice,handKeyNotice,type HandChoiceAction,type PrintedBar} from './hand-recurrence-text';
import {noteMemoryActions,type NoteMemoryCommand} from './note-memory-actions';
import {HandChoiceQueue,HandPreparationStatus,abandonedChoicesText,keptHandsText,waitingOutcomeText,type WaitingHandChoice} from './hand-editing-wait';
import {DerivedFileCache,VIEWER_DERIVED_IDENTITY} from './derived-file-cache';
import {RetainedScore,underMemoryPressure,type RetentionConditions} from './retained-score';
import {readingAdmissionReceipt,reengraveReadingArchive} from './reading-package';
import {calculatedAdmissionEvidence} from './calculated-hand-edition';
import {isTauri} from '@tauri-apps/api/core';
import {PracticeClock} from './practice-clock';
import {practiceAudio} from './host';
import {readMidiMapping,readMidiBindings,type MidiBindings,type MidiMapping,type MidiCC,type MidiNote} from './midi';
import {scoreCapabilities,requirePianoCapability} from './score-capabilities';
import {appState,declareAppState,declareFailure,declareRan} from './app-state';
import {PRACTICE_MENU_KEYS,READER_COMMAND_KEYS,REPEAT_COMMAND_KEYS,keyLetter} from './command-keys';
const app=document.querySelector<HTMLElement>('#app')!;
let startupReady=false,startupFailed=false;
let entries:Entry[]=[],preferences:{version:1;libraryRotation:Rotation;displayRotation?:Rotation;bindings:Bindings;fingerBehavior:FingerBehavior;fingerPresentation:FingerPresentation;keyboardLayout:PhysicalKeyboardId;notationSystem?:'iso';midi?:MidiMapping;midiBindings?:MidiBindings;controlBindings?:ControlBindings;freeViewControls?:FreeViewControlOverrides;lastWorkedEntryId?:string;audioOutput?:string;piano?:PianoPreferences;fingeringAdvice?:FingeringAdviceSettings;scoreTempos?:Record<string,unknown>;writtenOutRepeats?:string[]}={version:1,libraryRotation:0,bindings:defaultBindings(),...fingerPreferences(),keyboardLayout:'conventional-piano'},input=new InputController();
let pianoSettings=defaultPianoPreferences(),pianoWarning='',pianoOptions:PianoOptionsPanel|undefined;
let current:{entry:Entry;package:ScorePackage;personal:PersonalState}|undefined;let toolbarVisible=false,timer:number|undefined,dialog:HTMLDialogElement|undefined,focusReturn:HTMLElement|undefined;
let readingPresentation:ReadingPresentationController|undefined,readingViewError:string|undefined;const readingParts=new ReadingPartCatalog();
let job:{cancel:()=>void;entryId:string;state:'working'|'installing'|'complete'|'failed';progress:string}|undefined;
let selection:Seat|undefined,selectionPitchToggle=false;let editNavigation:'notes'|'measures'='notes';const editSequence=new EditSequence();let mainControls=readControlBindings(undefined,preferences);const controls=new ControlResolver(mainControls);const musicalSustain=new ObservedMidiSustain();let midiConnection:{source:string;generation:number}|undefined,readerFocused=true;let bindingOptions:OptionsBindingsPanel|undefined;let optionsNavigation:OptionsNavigation|undefined;let midiOptions:MidiOptionsPanel|undefined,audioOptions:AudioOptionsPanel|undefined;let midiTransition=0;let practiceOptionsCleanup:(()=>void)|undefined;let practiceFocusReturn:string|undefined;
let transposeControls:ManualTempoControls|undefined;const pitchInput=new PitchInputEpoch();
// This reader owns bounded exact-byte admission across revisits; library and Worker receivers own separate sessions.
const readerAdmission=new PackageAdmissionSession({maxEntries:2,maxRetainedBytes:64*1024*1024});
// Derived results this build already made are kept on disk within a size
// budget: native builds only. The browser's local storage is too small for
// pages, and a development server's source can change under one identity.
let aheadOfTime:AheadOfTimeEngraving|undefined;
if(isTauri()&&!import.meta.env.DEV&&host.derived){
 const derived=new DerivedFileCache(host.derived);
 // What opening each score reads from disk is made while the player is in the library.
 aheadOfTime=new AheadOfTimeEngraving((entryId,execution,work)=>prepareAheadOfTime(derived,entryId,execution,work),{basis:aheadOfTimeBasis,release:()=>{aheadWorker?.close();aheadAdmission.clear();}});
 usePersonalProjectionCache(derived);useVerbatimFoldCache(derived);
 useReadingAdmissionReceipts({get:sha=>derived.get('reading-admission-v1',sha,readingAdmissionReceipt),put:(sha,receipt)=>void derived.put('reading-admission-v1',sha,receipt)});
 usePianoPageCheckReceipts({has:async key=>await derived.peek('piano-page-checks-v1',key)==='checked',add:key=>void derived.put('piano-page-checks-v1',key,true,'checked')});
 useFingerReplayReceipts({has:async key=>await derived.peek('finger-replay-checks-v1',key)==='passed',add:key=>void derived.put('finger-replay-checks-v1',key,true,'passed')});
 useCalculatedAdmissionEvidence({get:key=>derived.get('calculated-admission-v1',key,calculatedAdmissionEvidence),put:(key,evidence)=>void derived.put('calculated-admission-v1',key,evidence)});
 // Saved archives engraved again in the library are read here when they open. An
 // archive engraved again on opening is replaced as it opens, so it is not kept.
 useEngravedAgainStore({get:key=>derived.get('engraved-again-v1',key,engravedAgainFromRecord),put:()=>{}});
}
// Ahead-of-time work is for when the player leaves the library alone; any input there defers it.
holdAheadOfTimeOnInput(window,()=>aheadOfTime,()=>!current&&!readingOperation);
const libraryOrder=(closed?:string)=>aheadOfTimeOrder(entries.map(e=>e.id),preferences.lastWorkedEntryId,closed);
/** What a preparation of a score is made for, as the library stands now: an
 * opening takes over only work made for what it will show. */
function aheadOfTimeBasis(entryId:string):string {
 const entry=entries.find(e=>e.id===entryId);
 return JSON.stringify([preferences.keyboardLayout,entry?.file??null,entry?.importedAt??null,entry?.personalFiles??null,personalMemory.storedRefs(entryId)??null]);
}
// Its own admission and projection worker, so it never holds the reader's
// busy, and stopping it never costs the reader's warm engines.
let aheadWorker:ProjectionWorkerClient|undefined;
const aheadAdmission=new PackageAdmissionSession({maxEntries:1,maxRetainedBytes:64*1024*1024});
/** Make what opening a score reads from the derived-file cache: its pages for
 * the player's saved hands, exactly as opening would project them, or, for a
 * saved archive the current engraving no longer reproduces, its engraving
 * made again. Read only: installing that engraving, a layout the edition
 * lacks or memory not yet indexed is left for opening, which writes what it must. */
const idleTime=()=>new Promise<void>(resolve=>{if(typeof requestIdleCallback==='function')requestIdleCallback(()=>resolve(),{timeout:5000});else setTimeout(resolve,0);});
async function prepareAheadOfTime(derived:DerivedFileCache,entryId:string,execution:ReadingExecution,work:AheadOfTimeWork){
 if(!await personalMemory.adoptIndexed().catch(()=>false))return;checkReadingExecution(execution);
 // What this preparation is made for is read here, at once; an opening takes it over only while that stands.
 const entry=entries.find(e=>e.id===entryId),layout=preferences.keyboardLayout,stored=personalMemory.storedRefs(entryId);if(!entry||!stored)return;work.started();
 const bytes=await host.read(entry.file);checkReadingExecution(execution);if(!bytes)return;
 // Everything known before admission. A score already prepared, refused or
 // needing nothing costs a hash and a few header reads, not an admission.
 const key=await hashBytes(JSON.stringify([AHEAD_OF_TIME_KIND,await hashBytes(bytes),layout,entryId,entry.importedAt,entry.personalFiles??null,stored]));
 const digest=async(name:string)=>{const b=await host.read(name);return b?hashBytes(b):null;};
 if(await preparedBefore(derived,key,{served:served=>projectionServed(derived,served),digest}))return;checkReadingExecution(execution);
 // Between steps a click is answered at once, and input in the library holds
 // the work here until the next quiet moment: the player never waits for it.
 const answerInput=async()=>{await new Promise(resolve=>setTimeout(resolve,0));await work.quiet();checkReadingExecution(execution);};
 await prepareRecorded(derived,key,async read=>{
  // A reading is admitted, and engraved again when opening would, off this thread.
  const reading=readingOnlyArchive(bytes);
  if(reading){await engraveAgainAhead(derived,bytes,execution,work,true);return null;}
  // An archive admission rejects, or whose pages an earlier engine drew, is
  // engraved again by opening it: that engraving is made here. Opening
  // installs it and says so. Only the engraving failing is a refusal.
  await answerInput();
  let prior:ScorePackage;try{prior=await aheadAdmission.import(bytes,{allowLegacyTempo:true,execution});}
  catch(error){if(!admissionRejection(error)&&!(error instanceof SavedPagesLackRepeats))throw error;await engraveAgainAhead(derived,bytes,execution,work);return null;}
  await answerInput();
  if(savedPagesBehindPolicy(prior)){await engraveAgainAhead(derived,bytes,execution,work);return null;}
  if(!scoreCapabilities(prior).pianoPreparation||!prior.availablePresentations?.includes(layout))return null;
  // A journal kept outside the store is a file: its digest joins the record.
  const journals={read:async(name:string)=>{const b=await host.read(name);read(name,b?await hashBytes(b):null);return b;}};
  const selected=await selectPresentation(prior,layout),journal=await loadPersonalJournal(journals,entry,selected);checkReadingExecution(execution);
  const personal=personalMemory.personalFor({entryId,importedAt:entry.importedAt,p:selected,personal:journal});
  await answerInput();const q=await ensurePianoReady({packageBytes:bytes,layout,personal,signal:execution.signal},aheadAdmission);await answerInput();
  // An edition that must be engraved again is made, and saved, by opening it.
  if(!('package' in q))return null;
  // A score that shows a repeat folded opens on its folded pages, from its choices
  // as opening resolves them: shared memory first, then the repeat's twins.
  // Its files are written at the steps below, never on a timer of their own.
  const options={worker:aheadWorker??=projectionWorkerClient(),cacheWriteDelayMs:null},input={entryId,importedAt:entry.importedAt,p:q.package,personal:q.personal??personal},
   shown=withRepeatInheritance(q.package,withResolvedMemory(input,resolveMemoryInput(input),personalMemory.memoryRevision)),
   fold=new FoldedReader(q.package,derived,{pool:separatePreparations(),options});
  let session:PersonalPresentationSession|undefined,served:ProjectionEntry|undefined,drawn=false;
  // A fold that can't be drawn opens written out, so that is what is prepared.
  if(fold.folds(shown)){await answerInput();try{const view=await fold.view(shown,q.package,execution);if(view?.verbatimFold){session=view.verbatimFold.session;served=await fold.served(shown);drawn=true;}}
  catch(error){if(error instanceof DOMException&&error.name==='AbortError')throw error;}}
  if(!session||!served){
   session=new PersonalPresentationSession(q.package,separatePreparations(),options);served=await session.projectionEntry(q.personal??personal);
   if(!served)return null;
   if(drawn=!await projectionServed(derived,served)){await answerInput();await refusedWhen(session.project(q.personal??personal,execution),engravingRefusal);}
  }
  // The pages opening reads are written as soon as input allows; an opening
  // that took this work over goes on from here.
  if(drawn){await answerInput();await session.flushProjection();checkReadingExecution(execution);}
  work.ready();
  // Then, in idle time, the engine hand editing resumes from: settled when an
  // earlier reading made the pages but saved none, and saved before the
  // worker holding it is freed. The worker encodes it; this thread writes a file.
  if(await session.engineMissing()){await answerInput();await refusedWhen(session.warm(execution),engravingRefusal);checkReadingExecution(execution);}
  if(session.engineWaiting){await idleTime();await answerInput();await session.flushEngine();checkReadingExecution(execution);}
  return served;
 });
}
/** A saved archive engraved again in a worker, while the player is in the
 * library, and kept with what admitting it checked; opening it reads that
 * engraving rather than making it. The worker's engraving failing is a
 * refusal, so it is not tried again until the archive changes. */
async function engraveAgainAhead(derived:DerivedFileCache,bytes:Uint8Array,execution:ReadingExecution,work:AheadOfTimeWork,admit=false){
 await work.quiet();checkReadingExecution(execution);
 const reply=await engraveAgainInWorker(bytes,execution.signal,admit);checkReadingExecution(execution);
 await Promise.all(reply.made.filter(record=>ENGRAVE_AGAIN_KINDS.includes(record.kind)).map(record=>derived.putEncoded(record.kind,record.key,record.encoded,record.tag)));
 checkReadingExecution(execution);
 // An opening that took this work over reads the engraving now.
 work.ready();
 if(reply.error!==undefined)throw new AheadOfTimeRefusal(Error(reply.error));
}
type ReadingJob=NonNullable<typeof job>;
interface ReadingOperation {
 controller:AbortController;running:ReadingJob;dialog?:HTMLDialogElement;
 previous:typeof current;keyboard:PhysicalKeyboardId;generation:number;
 options?:string;optionsFocus?:string;
 /** The shared loading surface: ordered steps, engine stage detail and elapsed time. */
 loading:LoadingProgress;
 /** When the operation began (performance.now()): what the store held since serves it. */
 startedAt:number;
}
let readingOperation:ReadingOperation|undefined,readingGeneration=0;
const READING_CANCELLED='Opening cancelled. Your score and choices are retained.';
const cancelledReading=()=>Error(READING_CANCELLED);
/** A failure already shown on its loading surface is not repeated as a notice. */
const shownFailures=new WeakSet<object>();
const reportFailure=(error:unknown)=>{if(!(error instanceof Object&&shownFailures.has(error))){declareFailure(app);notify((error as Error).message);}};
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
const scoreTitle=(entryId:string)=>{const entry=entries.find(e=>e.id===entryId);return entry?workName(entry.metadata).title:'Score';};
function openingLoading(entryId:string){return new LoadingProgress(scoreTitle(entryId),['check','hands','open'],{kicker:'Opening',cancel:true});}
function beginReading(entryId:string,loading?:LoadingProgress){
 const carried=carriedLoading;carriedLoading=undefined;
 if(job?.state==='installing')throw Error('A score is being saved. Try again in a moment.');
 job?.cancel();cancelPersonalPrefetch();aheadOfTime?.yieldTo(entryId);
 loading??=carried??openingLoading(entryId);
 // A surface carried past its save stays uncancellable: the new edition is
 // already in the library, so Esc must not leave the reader on the old one.
 const controller=new AbortController(),running:ReadingJob={cancel:()=>controller.abort(),entryId,state:loading.state==='saving'?'installing':'working',progress:loading.statusText()},
  op:ReadingOperation={controller,running,previous:current,keyboard:preferences.keyboardLayout,generation:++readingGeneration,
   options:dialog?.dataset.kind==='options'?optionsSection:undefined,optionsFocus:(document.activeElement as HTMLElement)?.dataset.optionsKey,loading,startedAt:performance.now()};
 readingOperation=op;job=running;practice?.pause();readingDialog(op);declareState();return op;
}
async function admitReading(bytes:Uint8Array,op:ReadingOperation){const p=await importReading(bytes,op);await admitReadingSource(p,op);return p;}
async function importReading(bytes:Uint8Array,op:ReadingOperation){
 await readerAdmission.waitForIdle(op.controller.signal);checkReading(op);
 readingProgress(op,'check');
 const p=await readerAdmission.import(bytes,{allowLegacyTempo:true,execution:readingExecution(op)});await readingCheckpoint(op);return p;
}
/** An admitted archive's Guitar Pro source is checked after the archive: a
 * refusal here is about the source, never a reason to engrave the archive again. */
async function admitReadingSource(p:ScorePackage,op:ReadingOperation){
 if(p.manifest.files[GUITAR_PRO_FILES.descriptor]&&guitarProPreparedByEarlierConverter(p))notify(EARLIER_GUITAR_PRO_CONVERTER);
 else if(p.manifest.files[GUITAR_PRO_FILES.descriptor]){readingProgress(op,'check');await admitGuitarProContext(p,{signal:op.controller.signal,checkpoint:()=>readingCheckpoint(op)});await readingCheckpoint(op);}
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
 loading.fail(error.message,button('Close','close','Esc'));d.dataset.kind='loading-failed';shownFailures.add(error);declareFailure(app);declareState();
}
function suspendReadingDialog(op:ReadingOperation){checkReading(op);op.dialog=undefined;closeDialog(false);}
function finishReading(op:ReadingOperation,success:boolean,error?:unknown){
 if(readingOperation!==op){op.loading.stop();return;}
 op.running.state=success?'complete':'failed';
 // A failure the player did not ask for stays on its surface with Close.
 const shown=!success&&error instanceof Error&&error.name!=='AbortError'&&error.message!==READING_CANCELLED&&!op.controller.signal.aborted&&!op.options&&!!op.dialog&&dialog===op.dialog;
 if(shown){op.loading.fail(error.message,button('Close','close','Esc'));op.dialog!.dataset.kind='loading-failed';shownFailures.add(error);declareFailure(app);}
 else{op.loading.stop();if(dialog===op.dialog)closeDialog(false);}
 readingOperation=undefined;declareState();
 if(!success&&op.options&&current===op.previous){options(op.options);if(op.optionsFocus)dialog?.querySelector<HTMLElement>(`[data-options-key="${CSS.escape(op.optionsFocus)}"]`)?.focus();}
 // An opening cancelled or failed from the library returns there: work it
 // took over goes on, and its quiet moments prepare scores again.
 if(!success&&!current)aheadOfTime?.resume(libraryOrder());
}
const readerPages=new ReaderPageCache();let dialogBack:(()=>void)|undefined;let optionsSection:string|undefined;let toolbarNavigation:OptionsNavigation|undefined;let dialogNavigation:OptionsNavigation|undefined;
let orientation=new ViewerOrientation(preferences);
const effectiveView=(view:PersonalState['view'])=>({...view,rotation:orientation.rotation});
let practice:PracticeView|ManualPracticeView|undefined,manualPracticeGeneration=0,practiceStartGeneration=0;
/** Practice being started: a press now may wait on a tempo or the plan. */
let practiceStarting=false;
async function startingPractice(start:()=>Promise<void>){practiceStarting=true;declareState();try{await start();}finally{practiceStarting=false;declareState();}}
/** Where the application is, as data-* attributes on #app (app-state.ts). */
/** Whether a package can be practised at the piano, asked once per package: state is declared on every paint. */
const declaredPiano=new WeakMap<object,boolean>(),declaredPianoPractice=(p:ScorePackage)=>{let piano=declaredPiano.get(p);if(piano===undefined)declaredPiano.set(p,piano=scoreCapabilities(p).pianoPractice);return piano;};
function declareState(){declareAppState(app,appState({started:startupReady,dialog:dialog?.dataset.kind,score:current?{id:current.entry.id,piano:declaredPianoPractice(current.package)}:undefined,layout:preferences.keyboardLayout,practice:practice?.declared(),editing:!!selection,reading:!!readingOperation,pressWaiting:presses.pending!==undefined,practiceStarting}));}let libraryRepaintPending=false;
const libraryMenu=new LibraryMenu();
const matchingCurrent=(target:NonNullable<typeof current>)=>current&&current.entry.file===target.entry.file&&current.entry.id===target.entry.id&&current.package.sourceSha256===target.package.sourceSha256&&personalStorageName(current.entry.id,current.package)===personalStorageName(target.entry.id,target.package)?current:undefined;
const memoryLibrary=new PersonalMemoryLibrary(host,()=>entries,bytes=>readerAdmission.import(bytes,{allowLegacyTempo:true}));
const personalMemory=new PersonalMemorySession(host.assistanceStore!,{scanLibrary:()=>memoryLibrary.scan(),validateInputs:()=>memoryLibrary.validate(),awaitingEngraving:()=>memoryLibrary.awaitingEngraving});
const memoryInput=(target:NonNullable<typeof current>):MemoryScoreInput=>({entryId:target.entry.id,importedAt:target.entry.importedAt,p:target.package,personal:rawMemoryPersonal(target.personal)});
const memoryResolutions=new PersonalMemoryResolutionCache();
const resolveMemoryInput=(input:MemoryScoreInput)=>memoryResolutions.resolve(input,personalMemory.memoryGeneration,q=>personalMemory.resolve(q));
let memoryDocumentCache:PersonalFingeringMemory|undefined,memoryDocumentGeneration=-1;
function memoryDocument(){if(!memoryDocumentCache||memoryDocumentGeneration!==personalMemory.memoryGeneration){memoryDocumentCache=personalMemory.memory;memoryDocumentGeneration=personalMemory.memoryGeneration;}return memoryDocumentCache;}
/** Shared fingering memory resolves first; a written-out repeat's untouched pass then reads its twin's choices. */
function resolveMemory(target:NonNullable<typeof current>){const input=memoryInput(target);memoryLibrary.remember(input);const resolved=withResolvedMemory(input,resolveMemoryInput(input),personalMemory.memoryRevision);return scoreCapabilities(target.package).pianoPreparation?withRepeatInheritance(target.package,resolved):resolved;}
interface LivePersonalEditor {view:ScorePackage;visiblePersonal:PersonalState;session:PersonalPresentationSession;fold:FoldedReader;generation:number;recovering?:boolean;queue:PersonalEditQueue<PersonalState>;projections:Map<number,Promise<ScorePackage>>}
const livePersonalEditors=new WeakMap<NonNullable<typeof current>,LivePersonalEditor>();
function personalEditor(target:NonNullable<typeof current>):LivePersonalEditor {
 const existing=livePersonalEditors.get(target);if(existing)return existing;
 // The written-out pages' session is made only when they are drawn: a folded score never draws them.
 let session:PersonalPresentationSession|undefined;
 const editor:LivePersonalEditor={view:target.package,visiblePersonal:structuredClone(target.personal),get session(){return session??=new PersonalPresentationSession(target.package);},fold:foldedReader(target),generation:0,queue:undefined!,projections:new Map()};
 // The page drawn for a choice only places the saved view. A choice the
 // engraver refused is answered where it was made; it is not a failed save,
 // so it never holds the score open behind "Choices haven't been saved".
 // Any other projection failure keeps its snapshot for recovery.
 editor.queue=new PersonalEditQueue(personalStorageName(target.entry.id,target.package),async(snapshot,sequence)=>{const projected=await editor.projections.get(sequence)?.catch(error=>{if(engravingRefusal(error))return undefined;throw error;});if(projected)resolvePersonalNavigation(snapshot,projected);await personalMemory.saveView({...memoryInput(target),personal:snapshot});editor.projections.delete(sequence);},sequence=>{editor.projections.get(sequence)?.catch(()=>{});editor.projections.delete(sequence);});
 livePersonalEditors.set(target,editor);return editor;
}
/** Folded readers kept for the session, per score, revision and keyboard: reopening
 * a folded score reuses its folded pages and their engraving instead of drawing them again. */
const foldedReaders=new Map<string,FoldedReader>(),KEPT_FOLDED_READERS=4;
/** Under memory pressure: the score kept after Back and the folded readers kept for
 * closed scores are let go. The open score's reader stays with its editor. */
function releaseUnderPressure(){retained.free();foldedReaders.clear();}
function foldedReader(target:NonNullable<typeof current>):FoldedReader{
 const p=target.package,key=JSON.stringify([target.entry?.id,p.sourceRevision??p.manifest?.revision,p.sourceSha256,p.keyboardLayout,p.renderingRecipe?.baseline]);
 const reader=foldedReaders.get(key)??new FoldedReader(p);foldedReaders.delete(key);foldedReaders.set(key,reader);
 for(const old of foldedReaders.keys()){if(foldedReaders.size<=KEPT_FOLDED_READERS)break;foldedReaders.delete(old);}
 return reader;
}
function readerPackage(){if(!current)throw Error('No open score.');return livePersonalEditors.get(current)?.view??current.package;}
/** The engraving session behind the pages shown: the folded pages' own on a folded score, else the written-out pages'. */
function shownSession(target:NonNullable<typeof current>):PersonalPresentationSession{const editor=personalEditor(target);return (editor.view as FoldedPackage).verbatimFold?.session??editor.session;}
/** The reader's pages for these choices. Where a repeat folds, only the
 * folded pages are drawn; the written-out pages are drawn when nothing folds
 * or the fold can't be drawn. `refusals`: a hand the folded pages can't draw,
 * on notes that can return to the hands they had, is thrown as the written-out
 * pages throw it, for the caller to answer on the folded pages; otherwise the
 * repeat is written out. */
async function presentReader(target:NonNullable<typeof current>,personal:PersonalState,written:()=>Promise<ScorePackage>,execution?:ReadingExecution,refusals=false):Promise<ScorePackage>{
 if(scoreCapabilities(target.package).pianoPreparation){const fold=personalEditor(target).fold;
  if(fold.folds(personal))try{const view=await fold.view(personal,target.package,execution);if(view)return view;}
  catch(error){if(error instanceof DOMException&&error.name==='AbortError')throw error;
   // A fold that failed is remembered for the session and not drawn again; its reason was logged when it failed.
   const failure=error instanceof FoldFailure?error:undefined;if(!failure)console.warn('Repeats stay written out:',error);
   if(refusals&&undrawableHandOwners(failure?.detail))throw failure!.detail;
   // Said once a score and fold: the pages are right, only longer.
   const said=`${target.entry.id}\n${failure?.key??''}`;if(!foldFailureSaid.has(said)){foldFailureSaid.add(said);notify(FOLD_FAILURE_TEXT);}}
 }
 return written();
}
/** The pages the reader shows for these choices, folded where a repeat folds; a hand the engraver can't draw on them is thrown. */
const projectShown=(target:NonNullable<typeof current>,personal:PersonalState,execution?:ReadingExecution)=>presentReader(target,personal,()=>personalEditor(target).session.project(personal,execution),execution,true);
/** A stored bar as the reader prints it: a folded repeat prints fewer bars. */
function printedBar(entryId:string,bar:number):number{const fold=current?.entry.id===entryId?(readerPackage() as FoldedPackage).verbatimFold:undefined;return fold?fold.printedBar(bar):bar;}
/** A score's stored bars as printed, for notices that name bars. */
const printedBars=(target:{entry:{id:string}}):PrintedBar=>bar=>printedBar(target.entry.id,bar);
/** Written-out repeats the player keeps (K), remembered with the settings for
 * each score package: the notice returns only when its passes differ otherwise. */
const KEPT_WRITTEN_OUT=200,repeatKept=(target:NonNullable<typeof current>,found:WrittenOutRepeat)=>`${personalStorageName(target.entry.id,target.package)}\n${found.text}`;
const keepsWrittenOut=(target:NonNullable<typeof current>,found:WrittenOutRepeat)=>!!preferences.writtenOutRepeats?.includes(repeatKept(target,found));
async function keepWrittenOut(target:NonNullable<typeof current>,found:WrittenOutRepeat){
 const key=repeatKept(target,found),package_=personalStorageName(target.entry.id,target.package)+'\n';if(keepsWrittenOut(target,found))return;
 // One kept repeat per score package: the one its notice last offered.
 await enqueue(async()=>{const next={...preferences,writtenOutRepeats:[...(preferences.writtenOutRepeats??[]).filter(k=>!k.startsWith(package_)),key].slice(-KEPT_WRITTEN_OUT)};await writeJson('preferences.json',next);preferences=next;});
}
/** Scores (and their folds) told this session that their folded pages couldn't be drawn. */
const foldFailureSaid=new Set<string>();
/** Why a repeat the reader would fold is written out, and how to fold it again. */
function paintRepeatNotice(){
 const target=current,shown=target&&!practice&&scoreCapabilities(target.package).pianoPreparation?writtenOutRepeat(target.package,target.personal,bar=>printedBar(target.entry.id,bar)):undefined,found=shown&&!keepsWrittenOut(target!,shown)?shown:undefined;
 let notice=app.querySelector<HTMLElement>('.repeat-written-out');
 if(!found){notice?.remove();return;}
 if(!notice){notice=document.createElement('aside');notice.className='repeat-written-out';notice.setAttribute('role','status');app.querySelector('.surface')?.append(notice);}
 notice.innerHTML=`<span></span>${button(found.use,'repeat-use','U')}${button('Keep written out','repeat-keep','K')}`;notice.querySelector('span')!.textContent=found.text;
}
/** The first time's choices on every note the repeat plays differently: the passes agree, and it folds again. */
async function useFirstPassChoices(target:NonNullable<typeof current>){
 const found=writtenOutRepeat(target.package,target.personal);if(!found)return;
 if(personalEditor(target).recovering)throw Error('Personal edit recovery is already running.');if(personalEditor(target).queue.error)throw personalEditor(target).queue.error;
 if(found.restore.some(c=>c.hand)&&scoreCapabilities(target.package).pianoPreparation){const wait=handEditingWait(target);if(wait&&(!await wait.ready||current!==target))throw cancelledReading();}
 const authoredAt=new Date().toISOString(),saved:Promise<unknown>[]=[];let personal=target.personal;
 for(const change of found.restore){
  const actions:PersonalMemoryAction[]=[...(change.hand?[{kind:'hand' as const,ownerId:change.ownerId,hand:change.hand,...(change.local?{local:true}:{}),decisionId:crypto.randomUUID(),authoredAt}]:[]),
   ...(change.finger!==undefined?[{kind:'finger' as const,edit:{ownerId:change.ownerId,finger:change.finger as 1|2|3|4|5,decisionId:crypto.randomUUID(),authoredAt}}]:[])];
  for(const action of actions){const receipt=personalMemory.accept({...memoryInput(target),personal},action);personal=receipt.personal;saved.push(receipt.saved);}
 }
 await presentPersonalChange(target,personal,Promise.all(saved).then(()=>{}));
}
/** What practice and Fingers go through: the folded edition when the reader folds a repeat, as a score with composer repeats is; else the stored edition. */
function practiceSource(target:NonNullable<typeof current>):{view:ScorePackage;base:ScorePackage;personal:PersonalState;fold?:PracticeFoldSource}{
 const shown=livePersonalEditors.get(target)?.view??target.package,fold=(shown as FoldedPackage).verbatimFold;
 // The folded edition practises in the score's one journal, read and saved in the stored edition's terms.
 return fold?{view:fold.practice,base:fold.edition,personal:fold.personal(target.personal),fold:{key:fold.practiceKey,written:target.package,personal:target.personal}}:{view:shown,base:target.package,personal:target.personal};
}
/** The score a performance plays: the one the reader prints. A folded repeat plays twice in performed order, numbered by printed bar and pass, as a composer repeat does. */
function performedScore(target:NonNullable<typeof current>):ScorePackage['score']{return ((livePersonalEditors.get(target)?.view??target.package) as FoldedPackage).verbatimFold?.edition.score??target.package.score;}
/** Whether choices move a note to another hand than the one practice was planned with, in practice's own edition (folded or stored). */
function practiceHandsDiffer(target:NonNullable<typeof current>,owner:PracticeView,next:PersonalState):boolean{
 const base=owner.options.basePackage??owner.options.package,fold=((livePersonalEditors.get(target)?.view??target.package) as FoldedPackage).verbatimFold,
  personal=fold&&base===fold.edition?fold.personal(next):next;
 return handsDiffer(base,owner.options.personal,personal);
}
function visibleSourceSeat(p:ScorePackage,seat:Seat):Seat|undefined {
 const aliases=p.seats.filter(s=>s.ownerIds.some(id=>seat.ownerIds.includes(id)));
 return aliases.find(s=>s.id===seat.id)??aliases.find(s=>s.page===seat.page&&!!s.continuation===!!seat.continuation)??aliases.find(s=>!s.continuation)??aliases[0];
}
function sourceNavigationAliases(p:ScorePackage,anchor:Pick<PersonalSourceAnchor,'owners'|'writtenBar'|'actionId'|'continuation'>){
 return p.seats.filter(s=>s.writtenBar===anchor.writtenBar&&s.actionId===anchor.actionId&&!!s.continuation===anchor.continuation&&s.ownerIds.some(id=>anchor.owners.includes(id))).sort((a,b)=>a.page-b.page||a.system-b.system||a.x-b.x||a.id.localeCompare(b.id));
}
function sourceNavigationAnchor(p:ScorePackage,seat:Seat|undefined):PersonalSourceAnchor|undefined {
 // Saved navigation names written-out notes, whether or not a repeat is folded.
 const fold=(p as FoldedPackage).verbatimFold;if(fold)return sourceNavigationAnchor(fold.written,seat&&fold.writtenSeat(seat));
 if(!seat||!Number.isSafeInteger(seat.writtenBar)||!seat.actionId||!seat.ownerIds.length)return;
 const anchor={owners:[...seat.ownerIds].sort(),writtenBar:seat.writtenBar,actionId:seat.actionId,continuation:!!seat.continuation},aliases=sourceNavigationAliases(p,anchor);
 return {...anchor,alias:Math.max(0,aliases.findIndex(s=>s.id===seat.id))};
}
function sourceNavigationSeat(p:ScorePackage,anchor:PersonalSourceAnchor|undefined):Seat|undefined{if(!anchor)return;const fold=(p as FoldedPackage).verbatimFold;if(fold){const seat=sourceNavigationSeat(fold.written,anchor);return seat&&fold.foldedSeat(seat);}const aliases=sourceNavigationAliases(p,anchor);return aliases[Math.min(anchor.alias,aliases.length-1)];}
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
 await personalMemory.retry();for(const {sequence,snapshot} of editor.queue.recovery)editor.projections.set(sequence,presentReader(target,snapshot,()=>editor.session.project(snapshot)));await editor.queue.retry();const view=target.personal.view,navigation=target.personal.navigation,editContactId=target.personal.editContactId;target.personal=await loadPersonal(target.entry,target.package);target.personal.view=view;target.personal.navigation=navigation;target.personal.editContactId=editContactId;target.personal=resolveMemory(target);const generation=++editor.generation,personal=target.personal,projected=await presentReader(target,personal,()=>editor.session.project(personal));
 if(current===target&&editor.generation===generation){
  const cursor=sourceNavigationAnchor(editor.view,selection);editor.view=projected;resolvePersonalNavigation(target.personal,projected);editor.visiblePersonal=structuredClone(target.personal);
  if(selection)selection=sourceNavigationSeat(projected,cursor)??visibleSourceSeat(projected,selection)??selection;
  app.querySelector('.personal-edit-status')?.remove();
  if(practice instanceof PracticeView){
   const owner=practice,source=practiceSource(target),handsChanged=source.base!==(owner.options.basePackage??owner.options.package)||handsDiffer(source.base,owner.options.personal,source.personal);
   if(handsChanged){owner.holdForPersonalChoices();await refreshPersonalPractice(target,owner,generation);}
   else{owner.options.personal=source.personal;owner.releasePersonalChoices();owner.refit();}
  }else if(!practice){renderPages();renderToolbar();}
 }
 }finally{editor.recovering=false;}
}
const personalFile=(entry:Entry,p:ScorePackage)=>entry.personalFiles?.[personalStorageName(entry.id,p)]??personalStorageName(entry.id,p);
let persist=Promise.resolve();const enqueue=<T>(op:()=>Promise<T>):Promise<T>=>{const result=persist.then(op);persist=result.then(()=>{},error=>notify(error.message));return result;};
const esc=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
/** A notice belongs to the opening that said it; the next opening starts without one. */
function clearNotice(){const t=document.querySelector<HTMLElement>('.toast');if(t)t.textContent='';}
/** While a note is being edited, notices join the editor bar beside the pages
 * instead of covering the music. */
function notify(text:string){let t=document.querySelector<HTMLElement>('.toast');if(!t){t=document.createElement('div');t.className='toast';t.setAttribute('role','status');}const home=selection&&!practice&&app.querySelector('.editor-column')||document.body;if(t.parentElement!==home)home.append(t);t.textContent=text;window.setTimeout(()=>{if(t?.textContent===text)t.textContent='';},6500);}
const button=(label:string,id:string,shortcut='',disabled=false)=>`<button type="button" data-action="${id}" ${disabled?'disabled':''}>${label}${shortcut?`<kbd>${esc(shortcut)}</kbd>`:''}</button>`;
async function savePreferences(){await enqueue(()=>writeJson('preferences.json',preferences));}
async function saveNotationSystem(choice:'iso'|'traditional'){
 if(choice!=='iso')throw Error('Traditional notation is not available yet.');
 await enqueue(async()=>{const next={...preferences,notationSystem:choice};await writeJson('preferences.json',next);preferences=next;});
}
/** Saves the score just opened as the last one worked. It runs after the
 * opening's dialog has left: while the write waits its turn the score is
 * already drawn, and a press on it must reach it, not the dialog. */
async function saveReadingPreferences(){
 await enqueue(()=>writeJson('preferences.json',preferences));
}
async function configurePiano(){if(!pianoSettings.enabled)return nativePiano.configure(pianoSettings,preferences.audioOutput??'',false);const bank=await nativePiano.bankStatus();if(!bank.installed)pianoSettings={...pianoSettings,enabled:false};return nativePiano.configure(pianoSettings,preferences.audioOutput??'',bank.installed);}
/** `sounding`: enabling counts only once the output runs; otherwise nothing is
 * saved and the piano returns to how it was. */
/** One press: the piano downloads, installs and then sounds, even if Options
 * closed meanwhile. A file install leaves sound as it was. */
const getPiano=()=>getPianoSound({download:nativePiano.download,preferences:()=>pianoSettings,save:savePiano},message=>{pianoWarning=message;});
function savePiano(next:PianoPreferences,sounding=false):Promise<PianoAudioStatus>{return enqueue(async()=>{const admitted={...readPianoPreferences(next),levels:PIANO_LEVELS},bank=await nativePiano.bankStatus();if(admitted.enabled&&!bank.installed)throw Error('Install piano before enabling sound.');const previous={...pianoSettings},status=await nativePiano.configure(admitted,preferences.audioOutput??'',bank.installed);if(sounding&&admitted.enabled&&(status.error||!status.enabled||!status.running)){await nativePiano.configure(previous,preferences.audioOutput??'',bank.installed).catch(()=>{});throw Error(status.error||'Its sound output did not start.');}if(admitted.enabled&&(status.error||!status.enabled))throw Error(status.error||'Piano sound could not start.');try{await writeJson('preferences.json',{...preferences,piano:admitted});}catch(error){await nativePiano.configure(previous,preferences.audioOutput??'',bank.installed).catch(()=>{});throw error;}preferences.piano=admitted;pianoSettings=admitted;builtInClicks.gain=cueGain(cueVolume(admitted));pianoWarning='';return status;});}
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
 // A page the engraver refuses still leaves the view to save: leaving is never held by that refusal.
 if(scoreCapabilities(target.package).pianoPreparation){const projected=await presentReader(target,snapshot,()=>personalEditor(target).session.project(snapshot)).catch(error=>{if(engravingRefusal(error))return undefined;throw error;});if(projected)resolvePersonalNavigation(snapshot,projected);await personalMemory.saveView({...memoryInput(target),personal:snapshot});return;}
 await enqueue(async()=>{const {entry,p,file}=await personalContext(target),latest=await loadPersonalJournal(host,entry,p);latest.view=snapshot.view;latest.editContactId=snapshot.editContactId;latest.navigation=snapshot.navigation;await writeJson(file,latest);});
}
function savePersonalQuietly(){const target=current;void savePersonal().catch(error=>{if(target)paintPersonalSaveError(target,error);else notify(error.message);});}
/** Painting follows accepted intent, never the completion order of host writes. */
async function presentPersonalChange(target:NonNullable<typeof current>,personal:PersonalState,saved:Promise<void>,nextSeat?:Seat,previous=target.personal):Promise<{keptReason?:string}>{
 const editor=personalEditor(target),generation=++editor.generation,before=previous;let keptReason:string|undefined;
 target.personal=personal;target.personal=resolveMemory(target);if(nextSeat&&current===target)selection=nextSeat;
 let next=target.personal;
 capturePersonalNavigation(next,editor.view,current===target?selection:undefined,!!nextSeat||!!next.navigation?.followEdit);
 const navigation=JSON.stringify([next.view,next.editContactId,next.navigation]),
  // A refused hand is answered on the pages it was chosen on: a folded repeat stays folded.
  attempted=next,projection=projectShown(target,attempted).catch(async error=>{const kept=await keepDrawableHands(target,attempted,error,id=>handFor(target.package,before,id),before);
   if(editor.generation===generation)next=target.personal;
   if(kept.keys){keptReason=kept.reason;notify(keptHandsText(kept.keys,kept.reason));}else if(kept.dropped.length)notify(droppedCarryText(kept.dropped,kept.unshared,printedBars(target)));
   return kept.view;}),
  navigationReceipt=editor.queue.accept(next);editor.projections.set(navigationReceipt.sequence,projection);
 void navigationReceipt.saved.catch(error=>paintPersonalSaveError(target,error));
 const ownerPractice=target===current&&practice instanceof PracticeView?practice:undefined,
  handsChanged=!!ownerPractice&&practiceHandsDiffer(target,ownerPractice,next);
 if(handsChanged)ownerPractice!.holdForPersonalChoices();
 adviceKey='';adviceRunner.cancel();void saved.catch(error=>paintPersonalSaveError(target,error));
 const projected=await projection;
 if(current===target&&editor.generation===generation){
  const cursor=sourceNavigationAnchor(editor.view,selection);editor.view=projected;
  if(JSON.stringify([target.personal.view,target.personal.editContactId,target.personal.navigation])===navigation)resolvePersonalNavigation(target.personal,projected);
  editor.visiblePersonal=structuredClone(target.personal);
  if(selection)selection=sourceNavigationSeat(projected,cursor)??visibleSourceSeat(projected,selection)??selection;
  if(selection)target.personal.editContactId=selection.contactId;
  // Practice follows the reader: a repeat that folds or is written out again starts it afresh.
  if(ownerPractice&&practice===ownerPractice){const source=practiceSource(target);if(handsChanged||source.base!==(ownerPractice.options.basePackage??ownerPractice.options.package))await refreshPersonalPractice(target,ownerPractice,generation);else{ownerPractice.options.personal=source.personal;ownerPractice.releasePersonalChoices();ownerPractice.refit();}}
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
 return keptReason?{keptReason}:{};
}
/** A hand choice the engraver can't fit yet is not kept: its notes return to
 * the hand they had, as the player's own decision, so a saved choice can never
 * stop the score from opening. A hand carried from a matching bar is never
 * written: that bar keeps its written hands for this session (`dropped`). Other refusals, and a choice whose notes had no
 * hand to return to, still reach the player unchanged. `attempted` is the
 * refused state; a note whose hand has changed since then is left as it is.
 * A note of a repeat that `shown` (the choices the reader showed) folds returns
 * in every pass at once, as one press on the folded note: one pass alone would
 * split the repeat. The pages are drawn again as the reader shows them, folded
 * where the repeat folds.
 * A refusal also names the notes the choice ran into, such as the other note
 * of a beam; one whose hand the choice did not change has nothing to return.
 * A dropped carry repartitions its bar's hands, so fingers are resolved again;
 * `unshared` is the dropped bars whose shared fingers no longer reach them. */
async function keepDrawableHands(target:NonNullable<typeof current>,attempted:PersonalState,error:unknown,hadHand:(ownerId:string)=>PersonalHand|null,shown:PersonalState,execution?:ReadingExecution):Promise<{view:ScorePackage;keys:number;reason?:string;dropped:number[];unshared:number[]}>{
 const returned=new Set<string>(),dropped=new Set<number>(),reason=undrawableHandReason(error),fingered=target.personal.memoryResolved?.choices??{};
 let twinsOf:((ownerId:string)=>readonly string[])|undefined;const twins=(id:string)=>(twinsOf??=foldedTwins(target.package,shown))(id);
 for(let attempt=0;;attempt++){
  const named=undrawableHandOwners(error),refused=named&&[...new Set(named.flatMap(twins))],seats=refused?target.package.seats.filter(seat=>seat.ownerIds.some(id=>refused.includes(id))):[];
  if(!refused||!seats.length||attempt>=3)throw error;
  let changed=false,repartitioned=false;const folded=new Map<string,{ownerIds:string[];hand:PersonalHand}>();
  const give=(ownerIds:readonly string[],hand:PersonalHand)=>{const authoredAt=new Date().toISOString();
   for(const ownerId of ownerIds){const receipt=personalMemory.accept(memoryInput(target),{kind:'hand',ownerId,hand,decisionId:crypto.randomUUID(),authoredAt,...(ownerIds.length>1?{passes:[...ownerIds]}:{})});
    target.personal=receipt.personal;target.personal=resolveMemory(target);void receipt.saved.catch(saveError=>paintPersonalSaveError(target,saveError));}};
  for(const seat of seats){
   const ownerId=seat.ownerIds.find(id=>refused.includes(id))!,refusedHand=handFor(target.package,attempted,ownerId);
   if(handFor(target.package,target.personal,ownerId)!==refusedHand){changed=true;continue;}
   const passes=twins(ownerId);
   // A folded note's passes return together, decided once over all of them, so the repeat stays folded and keeps no record of the press.
   if(passes.length>1){const hand=hadHand(ownerId);if(hand===refusedHand)continue;if(!hand)throw error;const key=`${passes[0]}\n${hand}`,group=folded.get(key)??{ownerIds:[],hand};group.ownerIds.push(ownerId);folded.set(key,group);continue;}
   const bar=dropHandCarry(target.package,target.personal,ownerId);if(bar!==undefined){dropped.add(bar);changed=repartitioned=true;continue;}
   const hand=hadHand(ownerId);if(hand===refusedHand)continue;if(!hand)throw error;
   give([ownerId],hand);returned.add(ownerId);changed=true;
  }
  for(const {ownerIds,hand} of folded.values()){give(ownerIds,hand);returned.add(twins(ownerIds[0])[0]);changed=true;}
  if(!changed)throw error;
  if(repartitioned)target.personal=resolveMemory(target);
  attempted=target.personal;
  const now=target.personal.memoryResolved?.choices??{},unshared=[...dropped].filter(bar=>target.package.seats.some(seat=>seat.writtenBar===bar&&seat.ownerIds.some(id=>fingered[id]&&!now[id])));
  try{return {view:await projectShown(target,target.personal,execution),keys:returned.size,...(reason?{reason}:{}),dropped:[...dropped],unshared};}catch(next){error=next;}
 }
}
/** Accept one action, or one per pass of a folded note (`editOwners`) shown together, so the passes never part between them. */
async function acceptMemoryAction(target:NonNullable<typeof current>,actions:PersonalMemoryAction|readonly PersonalMemoryAction[],nextSeat?:Seat):Promise<ReturnType<typeof personalMemory.accept>&{kept?:string}>{
 const all:readonly PersonalMemoryAction[]=Array.isArray(actions)?actions:[actions as PersonalMemoryAction],action=all[0];
 if(personalEditor(target).recovering)throw Error('Personal edit recovery is already running.');if(personalEditor(target).queue.error)throw personalEditor(target).queue.error;
 // Actions that can give a note a personal hand are refused on a score whose own engraving is refused.
 if(all.some(action=>['hand','handScope','reference','calculated','undoRestore'].includes(action.kind))&&scoreCapabilities(target.package).pianoPreparation){
  const wait=handEditingWait(target);if(wait&&(!await wait.ready||current!==target))throw cancelledReading();}
 let receipt=personalMemory.accept(memoryInput(target),action);const saved=[receipt.saved];
 for(const later of all.slice(1)){receipt=personalMemory.accept({...memoryInput(target),personal:receipt.personal},later);saved.push(receipt.saved);}
 if(saved.length>1)receipt={...receipt,saved:Promise.all(saved).then(()=>{})};
 const {keptReason}=await presentPersonalChange(target,receipt.personal,receipt.saved,nextSeat);return keptReason?{...receipt,kept:keptReason}:receipt;
}
/** Replace both notation and hand grouping together, retaining the exact saved
 * exercise evidence and UI context. No completion is invalidated by an edit. */
async function refreshPersonalPractice(target:NonNullable<typeof current>,owner:PracticeView,generation:number){
 const owns=()=>current===target&&practice===owner&&personalEditor(target).generation===generation;
 while(owns()){
  await owner.flush();if(!owns())return;
  // Restoring choices can leave notes hand-less again: return to reading and say why.
  const source=practiceSource(target);
  try{requirePracticeHands(source.base,source.personal);}catch(error){owner.close();practice=undefined;selection=undefined;editNavigation='notes';selectionPitchToggle=false;resetInput();render();notify((error as Error).message);return;}
  const context=owner.contextSnapshot(),admitted=await PracticeView.prepareContext(source.base,target.entry.id,context,source.personal,undefined,undefined,source.fold);
  if(!owns())return;
  // Options remain usable during admission. A later settings or navigation
  // choice must be admitted again rather than replaced by the earlier context.
  if(JSON.stringify(owner.contextSnapshot())!==JSON.stringify(context))continue;
  owner.close();await startPractice(context,admitted);return;
 }
}
function labelMode(){if(!current)return 'pitch';const available=fingerDisplayAvailable(current.package,current.personal,currentFingerPresentation());return effectiveLabelMode(current.personal.view,preferences.fingerBehavior,input.fingersHeld||controls.fingersHeld,available,!!selection,selectionPitchToggle);}
function toggleLabel(){return preferences.fingerBehavior==='momentary'?(selection?'Hold pitches':'Hold fingerings'):selection?(labelMode()==='pitch'?'Show fingerings':'Show pitches'):(labelMode()==='pitch'?'Show fingerings':'Hide fingerings');}
/** Whether the reader would show fingerings now, were they ready: a held fingering waits for shared fingers. */
const wantsFingers=()=>!!current&&effectiveLabelMode(current.personal.view,preferences.fingerBehavior,input.fingersHeld||controls.fingersHeld,true,!!selection,selectionPitchToggle)==='finger';
function refreshPresentation(){if(!practice&&wantsFingers()&&waitsFor('hold-fingers','fingers',refreshPresentation))return;
 // A held fingering let go before it could show waits no longer.
 if(!wantsFingers()&&(presses.pending==='hold-fingers'||presses.pending==='toggle'&&preferences.fingerBehavior==='momentary'))presses.cancel();if(practice){practice.overlay(preferences.fingerBehavior==='momentary'?input.fingersHeld||controls.fingersHeld:current?.personal.view.labelMode==='finger');return;}if(!current||!app.querySelector('.page-group'))return;renderPages();const toggle=app.querySelector('[data-action=toggle]');if(toggle)toggle.innerHTML=toggleLabel()+`<kbd>${esc(actionControlLabel(controls.bindings,'toggle'))}</kbd>`;app.querySelector('[data-action=toggle]')?.setAttribute('aria-pressed',String(labelMode()==='finger'));const status=app.querySelector('[data-label-mode]');if(status)status.textContent=labelMode()==='finger'?'Fingers':'Pitch';}
const effectiveControls=()=>practice instanceof PracticeView?practiceControlBindings(freeViewControlBindings(mainControls,preferences.freeViewControls)):practice?practiceControlBindings(freeViewControlBindings(mainControls,preferences.freeViewControls),false):selection?editorControlBindings(mainControls):readerControlBindings(mainControls);
const rotationHint=()=>Object.values(effectiveControls().actions).some(slots=>slots.some(binding=>binding?.kind==='key'&&binding.key===rotationKey))?'':readableChord(rotationKey);
let resolvedMain=mainControls,resolvedLocal=preferences.freeViewControls,resolvedPractice='reader';
function syncControls(){const inPractice=practice instanceof PracticeView?'piano':practice?'manual':selection?'editor':'reader';if(resolvedMain===mainControls&&resolvedLocal===preferences.freeViewControls&&resolvedPractice===inPractice)return;const next=effectiveControls();resolvedMain=mainControls;resolvedLocal=preferences.freeViewControls;resolvedPractice=inPractice;if(JSON.stringify(next)===JSON.stringify(controls.bindings))return;const fingers=controls.fingersHeld;controls.configure(next);if(fingers)refreshPresentation();}
function resetInput(){practice?.cancelTempoHold();const keys=input.clear(),pedal=controls.clear();syncControls();if(keys||pedal)refreshPresentation();}
function focusSelection(){if(selection&&!dialog)app.querySelector<SVGTextElement>(`[data-viewer-seat="${selection.id}"]`)?.focus();}
function selectFinger(step?:number){editSequence.reset();if(!current)return;requirePianoCapability(current.package,'pianoPreparation');const shownPackage=readerPackage(),units=editUnits(shownPackage),index=selection?units.findIndex(s=>s.contactId===selection!.contactId):-1;if(!selection){selectionPitchToggle=false;editNavigation='notes';resetInput();shownSession(current).prefetch();}selection=step===undefined?selectionOnPage(shownPackage,selection?.contactId??current.personal.editContactId,current.personal.view.page):units[moveSelection(index,step,units.length)];if(!selection){notify('No editable notes on this page.');return;}current.personal.editContactId=selection.contactId;const shown=viewportFit(innerWidth,innerHeight,effectiveView(current.personal.view),readerPackage().pages.length).pages;if(!shown.includes(selection.page))current.personal.view.page=selection.page;savePersonalQuietly();renderPages();renderToolbar();focusSelection();}
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
function renderLibrary(focusKey=libraryFocusKey(document.activeElement)){declareState();
 readerPages.clear();toolbarNavigation?.dispose();toolbarNavigation=undefined;libraryRepaintPending=false;
 app.innerHTML=`<section class="surface"><div class="library"><header><h1>Scores</h1><nav aria-label="Library actions">${instrumentPickerMarkup(preferences.keyboardLayout)}${button('Import','import','M')}${button('Rotate','rotate',rotationHint())}${button('Options','options',actionControlLabel(mainControls,'practiceSettings'))}${button('Exit','exit')}</nav></header><div class="scores" aria-label="Composers and scores"></div>${entries.length?'':'<p class="empty">Add a score to begin.<br><small>Import a .tuna score, a MusicXML file or a Guitar Pro file.</small></p>'}<p class="job">${job?.state==='working'?esc(job.progress):''}</p></div></section>`;
 const libraryNavigation=document.createElement('nav');libraryNavigation.className='library-navigation';libraryNavigation.setAttribute('aria-label','Library navigation');app.querySelector('.surface')!.append(libraryNavigation);arrangeBottomNavigation(libraryNavigation,null,app.querySelector<HTMLButtonElement>('[data-action=options]'));
 transformSurface(app.querySelector('.surface')!,preferences.libraryRotation);
 libraryMenu.mount(app,entries,preferences.lastWorkedEntryId,entry=>esc(readingParts.summary(entry)),preferences.keyboardLayout,async value=>{if(!await switchKeyboard(value))throw Error('Instrument selection was not saved. Try again.');});
 const restore=libraryFocusElement(app,focusKey);if(restore&&!restore.hidden)restore.focus();else if(entries.length)libraryMenu.focus();else app.querySelector<HTMLElement>('[data-action=import]')?.focus();
}
/** Stops measuring the last reader's toolbar for the press notice. */
let toolbarHeight:(()=>void)|undefined;
function render(){declareState();toolbarHeight?.();toolbarHeight=undefined;if(!current){renderLibrary();return;}orientation.admitReader(current.personal.view.rotation);app.innerHTML=`<section class="surface"><div class="reader" tabindex="-1" aria-label="Score pages"><div class="page-group"></div></div><div class="editor-column"><div class="editor-navigation" hidden></div></div><nav class="toolbar" aria-label="Reader controls"></nav></section>`;toolbarHeight=trackToolbarHeight(app.querySelector<HTMLElement>('.surface')!,app.querySelector<HTMLElement>('.toolbar')!);renderPages();renderToolbar();paintHandPreparation();app.querySelector<HTMLElement>('.reader')?.focus();}
function renderPages(){
 if(practice||!current)return;
 const p=readerPackage(),s={...(livePersonalEditors.get(current)?.visiblePersonal??current.personal),view:current.personal.view},v=effectiveView(followedPage===undefined?s.view:{...s.view,page:followedPage}),mode=labelMode(),surface=app.querySelector<HTMLElement>('.surface')!,group=app.querySelector<HTMLElement>('.page-group')!;
 transformSurface(surface,v.rotation);const fit=readerFit(innerWidth,innerHeight,v,p.pages.length,scoreCapabilities(p).pianoPreparation?EDITOR_COLUMN:0),positions=annotationPositions(p,fit.pages),pages:HTMLElement[]=[];
 for(const index of fit.pages){
  const cached=readerPages.get(p,index),page=cached.element;paintReaderSeats(cached,current.package,p,s,mode,positions,true);
  for(const {seat,text} of cached.seats){
   if(mode==='finger'||selection){text.setAttribute('tabindex',selection?.id===seat.id?'0':'-1');text.setAttribute('role','button');}else{text.removeAttribute('tabindex');text.removeAttribute('role');}
   if(selection?.contactId===seat.contactId)text.dataset.editSelected='true';else delete text.dataset.editSelected;
  }
  paintEditorAdvice(page,p,index,editorAdvice,!!selection);pages.push(page);
 }
 mountReaderPages(group,pages);group.style.transform=`translateX(${-fit.shift}px) scale(${fit.scale})`;surface.style.setProperty('--editor-column',`${fit.column}px`);app.dataset.notation=p.reading?.dual?.notation??'iso';app.dataset.mode=mode;app.dataset.fingerSet=v.fingerSet;app.dataset.page=String(v.page);app.dataset.rotation=String(v.rotation);app.dataset.selecting=String(!!selection);
 if(selection&&!dialog&&!app.querySelector('.toolbar')?.contains(document.activeElement))focusSelection();
}
/** Reader and PDF pages share one finger/hand paint; only interaction differs. */
function paintReaderSeats(page:ReaderPage,base:ScorePackage,p:ScorePackage,s:PersonalState,mode:'pitch'|'finger',positions:ReadonlyMap<string,AnnotationPosition>,interactive:boolean){
 page.element.dataset.fingers=String(mode==='finger');const presentation=currentFingerPresentation(p),handOf=effectiveHands(base,s);
 for(const {seat,text} of page.seats){
  const finger=fingerFor(base,s,seat),hand=handOf(seat.ownerIds[0]);
  paintFinger(text,seat,{visible:mode==='finger'&&finger!==undefined,presentation,finger,position:positions.get(seat.id)!,interactive,label:mode==='finger'?`Pitch ${seat.pitchDigit}, ${finger===undefined?'no finger':`finger ${finger}`}, ${hand??'no hand'}, bar ${seat.writtenBar}`:`Pitch ${seat.pitchDigit}, bar ${seat.writtenBar}`});
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
function renderToolbar(){declareState();if(practice)return;if(!current)return;syncControls();renderEditorNavigation();const {personal:s}=current,p=readerPackage(),v=s.view,capabilities=scoreCapabilities(p);const bar=app.querySelector<HTMLElement>('.toolbar')!,focused=bar.contains(document.activeElement)?document.activeElement as HTMLElement:undefined,focusSelector=focused?.dataset.action?`[data-action="${focused.dataset.action}"]`:focused?.dataset.optionsKey?`[data-options-key="${CSS.escape(focused.dataset.optionsKey)}"]`:focused?.dataset.option?`[data-options-key="${focused.dataset.option}"]`:undefined;toolbarNavigation?.dispose();bar.className=`toolbar${toolbarVisible?' visible':''}`;bar.innerHTML=`${button('Back','library','Esc')}${button('Previous','previous',actionControlLabel(controls.bindings,'previous'),v.page===0)}<small>${v.page+1} / ${p.pages.length}</small>${button('Next','next',actionControlLabel(controls.bindings,'next'),v.page===p.pages.length-1)}${capabilities.pianoPreparation?`${button(toggleLabel(),'toggle',actionControlLabel(controls.bindings,'toggle'),!fingerDisplayAvailable(p,s,currentFingerPresentation(p)))}<small data-label-mode>${labelMode()==='finger'?'Fingers':'Pitch'}</small>`:''}<select aria-label="Visible pages" data-option="count">${[1,2,3].map(n=>`<option value="${n}" ${v.count===n?'selected':''}>${n} page${n>1?'s':''}</option>`).join('')}</select>${v.count>1?`<select aria-label="Page advancement" data-option="advance"><option value="slide" ${v.advance==='slide'?'selected':''}>Slide pages</option><option value="group" ${v.advance==='group'?'selected':''}>Replace group</option></select>`:''}<select aria-label="Score scale" data-option="scale">${[1,.9,.75,.5].map(n=>`<option value="${n}" ${v.scale===n?'selected':''}>${Math.round(n*100)}%</option>`).join('')}</select>${capabilities.pianoPreparation?`${button(selection?'Done editing':'Edit hands / fingers',selection?'end-edit':'edit',selection?'Esc':actionControlLabel(controls.bindings,'edit'))}`:''}${button('Rotate','rotate',rotationHint())}${capabilities.pianoPractice||!!readingPresentation&&capabilities.manualPractice?button('Practice','practice','P'):''}${keyboardControl(p)}${readingNotationControl(p)}${button('Share score','share')}${button('Save as PDF','pdf')}${button('Options','practiceSettings',actionControlLabel(controls.bindings,'practiceSettings'))}${button('Hide','hide','H')}`;arrangeBottomNavigation(bar,bar.querySelector<HTMLButtonElement>('[data-action=library]'),bar.querySelector<HTMLButtonElement>('[data-action=practiceSettings]'));toolbarNavigation=new OptionsNavigation(bar,()=>{},()=>false,{horizontal:true,focusOnPrepare:false});if(focusSelector)bar.querySelector<HTMLElement>(focusSelector)?.focus();paintRepeatNotice();}
function reveal(focus=false){const changed=!toolbarVisible;toolbarVisible=true;if(current&&changed)renderToolbar();clearTimeout(timer);timer=window.setTimeout(()=>{if(!dialog&&!app.querySelector('.toolbar')?.contains(document.activeElement)){toolbarVisible=false;if(current)renderToolbar();}},3500);if(focus)app.querySelector<HTMLElement>('.toolbar button')?.focus();}
async function loadPersonal(entry:Entry,p:ScorePackage,op?:ReadingOperation){return scoreCapabilities(p).pianoPreparation?personalMemory.loadPersonalCurrent(entry,p,()=>loadPersonalJournal(host,entry,p),op?{since:op.startedAt,register:'later'}:{}):loadPersonalJournal(host,entry,p);}
function renderEditorNavigation(){
 const control=app.querySelector<HTMLElement>('.editor-navigation');if(!control)return;
 control.hidden=!selection;if(!selection)return;refreshEditorAdvice();
 const focused=control.contains(document.activeElement);
 control.innerHTML=`<button data-action="editorNavigation" aria-label="Edit navigation: ${editNavigation==='notes'?'Notes':'Bars'}" aria-pressed="${editNavigation==='measures'}">${editNavigation==='notes'?'Notes':'Bars'} <kbd>${esc(actionControlLabel(controls.bindings,'editorNavigation'))}</kbd></button>`;
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
function selectedWarningText(){return current&&selection?selectedAdviceExplanations(editorAdvice,'edit',selection.ownerIds,ids=>{const seat=readerPackage().seats.find(s=>s.ownerIds.some(id=>ids.includes(id)));return seat?`bar ${seat.writtenBar}`:'previous contact';}).join(' '):'';}
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
 const input=memoryInput(current),resolution=resolveMemoryInput(input),ownerId=selection.ownerIds[0],label=input.personal.calculatedOwners?.[ownerId]?'Local':memoryChoiceLabel(resolution,ownerId),reference=memoryReferenceTarget(input,resolution,ownerId);
 const self=reference?.entryId===current.entry.id&&reference.ownerId===ownerId;
 // The label, its tooltip and the line under it say one thing: where this finger comes from.
 const source=label&&memoryFingerSource(resolution,ownerId,label,{entryId:current.entry.id,writtenBar:selection.writtenBar},id=>{const m=entries.find(e=>e.id===id)?.metadata;return m?workReference(m):'another score';},printedBar);
 // The finger and hand rows are named, so "Shared" can't be read as the hand's.
 // Each row reads its fact first, then any further line, then its buttons: nothing follows a button.
 return `<div class="editor-row" data-editor-row="finger"><span class="editor-row-name">Finger</span>${source?`<span class="personal-choice-kind" title="${esc(source.description)}" aria-label="${esc(label+'. '+source.description)}">${label}</span><span class="editor-said" aria-hidden="true">${esc(source.said)}</span>`:''}<span class="fingering-advice-explanation" data-advice-explanation>${esc(selectedWarningText())}</span>${editorActions(!!source,button(sourceReturn?'Return':'Source','editorSource',actionControlLabel(controls.bindings,'editorSource'),!sourceReturn&&(!reference||self))+(source?.promote?button('Use for matching bars','memory-reference'):'')+(label==='Local'?button('Use shared','memory-inherit'):''))}</div>${editorHandMarkup()}`;
}
/** A row's buttons: on their own line under the row's fact when it has one. */
const editorActions=(underFact:boolean,buttons:string)=>underFact?`<span class="editor-row-actions">${buttons}</span>`:buttons;
/** Where the selected note's hand comes from, beside its finger's provenance.
 * The explanation is shown, not only hovered: nobody hovers on a distant screen. */
function editorHandMarkup(){
 if(!current||!selection)return'';const view=handChoiceView(current.package,current.personal,selection.ownerIds[0],printedBars(current));if(!view)return'';
 const said=view.said.map(word=>typeof word==='string'?esc(word):`<kbd>${esc(word.key)}</kbd>`).join('');
 return `<div class="editor-row" data-editor-row="hand"><span class="editor-row-name">Hand</span><span class="personal-choice-kind editor-hand" title="${esc(view.description)}" aria-label="${esc(view.label+'. '+view.description)}">${esc(view.label)}</span>${said?`<span class="editor-said" aria-hidden="true">${said}</span>`:''}${view.action?editorActions(true,button(esc(view.action.label),view.action.id,view.action.key)):''}</div>`;
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
  const shown=readerPackage(),written=writtenView(shown).seats.find(s=>s.writtenBar===reference.writtenBar&&s.ownerIds.includes(reference.ownerId)),seat=written&&((shown as FoldedPackage).verbatimFold?.foldedSeat(written)??written);if(!seat)throw Error('The reference note is unavailable in this edition.');
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
/** A score without a meter has no counted beat to hear: choose a duration and rate, as before. */
async function chooseReference(actionLabel:'Practice'):Promise<ReferencePerformanceTempo|undefined>{
 return new Promise(resolve=>{
  const units=[{name:'Quarter',numerator:1,denominator:4},{name:'Dotted quarter',numerator:3,denominator:8},{name:'Half',numerator:1,denominator:2},{name:'Whole',numerator:1,denominator:1},{name:'Eighth',numerator:1,denominator:8}],d=showDialog(`<h2>Choose a playing tempo</h2><p class="help">Choose your working rate, from 5 to 500 per minute. The printed score is retained.</p><form><label class="dialog-row">Duration<select data-reference-unit>${units.map((u,i)=>`<option value="${i}">${u.name}</option>`).join('')}</select></label><label class="dialog-row">Rate<span class="metronome-mark"><input data-reference-rate aria-label="Duration units per minute" inputmode="decimal" type="number" min="5" max="500" step="any" required><span class="metronome-rate-unit"><span data-reference-glyph>${beatUnitSvg(units[0])}</span>${perMinuteSuffix()}</span></span></label>`+`<p class="error" role="alert"></p><div class="dialog-actions">${button('Cancel','close','Esc')}<button type="submit">${actionLabel}</button></div></form>`,'piano-reference');
  let finished=false;d.addEventListener('close',()=>{if(!finished){finished=true;resolve(undefined);}},{once:true});
  d.querySelector('[data-reference-unit]')!.addEventListener('change',()=>{const index=Number(d.querySelector<HTMLSelectElement>('[data-reference-unit]')!.value);d.querySelector('[data-reference-glyph]')!.innerHTML=beatUnitSvg(units[index]);});
  d.querySelector('form')!.addEventListener('submit',event=>{event.preventDefault();const bpm=Number(d.querySelector<HTMLInputElement>('[data-reference-rate]')!.value),unit=units[Number(d.querySelector<HTMLInputElement|HTMLSelectElement>('[data-reference-unit]')!.value)];if(!Number.isFinite(bpm)||bpm<5||bpm>500){d.querySelector('.error')!.textContent='Enter a rate from 5 to 500 per minute.';return;}finished=true;resolve({version:'reference-performance-tempo-v1',bpm,beat:{numerator:unit.numerator,denominator:unit.denominator},provenance:{kind:'editorial',reference:'Explicit player working-rate choice in Score Viewer; not a printed source marking.'}});closeDialog();});
 });
}
type OpenScore=NonNullable<typeof current>;
interface ScoreTempos {piece?:ScoreTempo;goal?:{bpm:number;beat:ScoreTempo['beat']}}
/** Two tempos are the same when they match to the metronome's whole number on one beat. */
const sameTempo=(a?:{bpm:number;beat:ScoreTempo['beat']},b?:{bpm:number;beat:ScoreTempo['beat']})=>!!a&&!!b&&Math.abs(tempoOnBeat(a.bpm,a.beat,b.beat)-b.bpm)<.5;
/** Practice's goal when you have set one, read only: the journal's personal goal, or
 * reading practice's saved tempo. The edition's reference is the piece tempo, not a goal,
 * and a personal goal that is the reference says nothing more. */
async function practiceGoalFor(target:OpenScore):Promise<unknown>{
 const score=target.package.score;
 try{
  if(scoreCapabilities(target.package).pianoPreparation){
   const goal=((await PracticeView.savedJournal(target.package,target.entry.id)) as {personalGoal?:unknown}|undefined)?.personalGoal;
   return sameTempo(readPracticeGoal(goal),readPracticeGoal(score.referencePerformanceTempo))?undefined:goal;
  }
  const controller=readingPresentation;
  if(target===current&&controller&&target.package.reading?.dual&&score.referencePerformanceTempo===undefined){
   const identity={partId:target.package.reading.dual.sourcePartId,musicalRevision:controller.revision};
   return readManualReference(await readJson(await manualReferenceStorageName(identity)),identity);
  }
 }catch{/* An unreadable journal is practice's to report. */}
}
/** The piece tempo (yours, then what the score says) and practice's own goal, kept distinct. */
async function scoreTempoFor(target:OpenScore):Promise<ScoreTempos>{
 const practiceGoal=await practiceGoalFor(target);
 return {piece:resolveScoreTempo(target.package.score,{tempo:preferences.scoreTempos?.[target.entry.id],practiceGoal}),goal:readPracticeGoal(practiceGoal)};
}
const meterBeat=(score:ScorePackage['score'])=>{try{return countedBeat(score);}catch{return undefined;}};
/* While hear-and-set plays, the reader shows the playing bar: it turns to the bar's
 * page and marks the bar lightly. The owner's own view is never changed; closing
 * shows it again. */
let followedPage:number|undefined;
function followPlayingBar(target:OpenScore){
 const clear=()=>{for(const mark of app.querySelectorAll('[data-tempo-follow]'))mark.remove();};
 return (bar:number|undefined)=>{
  clear();if(current!==target||practice)return;
  const p=readerPackage(),seats=bar===undefined?[]:p.seats.filter(seat=>seat.writtenBar===bar);
  if(!seats.length){if(followedPage!==undefined){followedPage=undefined;renderPages();}placeTempoDialog();return;}
  const page=Math.min(...seats.map(seat=>seat.page)),fit=viewportFit(innerWidth,innerHeight,effectiveView({...target.personal.view,page:followedPage??target.personal.view.page}),p.pages.length);
  if(!fit.pages.includes(page)){followedPage=page===target.personal.view.page?undefined:page;renderPages();}
  const svg=app.querySelector<SVGSVGElement>(`.page-group .page[data-page="${page}"] svg`);if(!svg)return;
  const onPage=seats.filter(seat=>seat.page===page),system=onPage[0].system,row=p.seats.filter(seat=>seat.page===page&&seat.system===system);
  const size=Math.max(...onPage.map(seat=>seat.fontSize)),next=row.filter(seat=>seat.writtenBar>bar!).map(seat=>seat.x);
  const left=Math.min(...onPage.map(seat=>seat.x))-size*.9,right=next.length?Math.min(...next)-size*.9:Math.max(...onPage.map(seat=>seat.x))+size*1.6;
  const top=Math.min(...row.map(seat=>seat.baseline))-size*1.6,bottom=Math.max(...row.map(seat=>seat.baseline))+size*.7;
  const mark=document.createElementNS('http://www.w3.org/2000/svg','rect');
  for(const [name,value] of Object.entries({x:left,y:top,width:Math.max(size,right-left),height:bottom-top,rx:size*.4,class:'tempo-follow','data-tempo-follow':''}))mark.setAttribute(name,String(value));
  // Drawn over the page and multiplied, so the notation stays black under the tint.
  svg.append(mark);
  // The dialog moves to the other half of the screen from the playing bar.
  const box=svg.viewBox.baseVal,lower=box&&box.height?(top+bottom)/2>box.y+box.height/2:false;placeTempoDialog(lower?'high':'low');
 };
}
function placeTempoDialog(place?:'high'|'low'){
 if(dialog?.dataset.kind!=='score-tempo')return;
 if(place)dialog.dataset.place=place;else delete dialog.dataset.place;fitDialog(dialog,orientation.rotation);
}
/** The installed piano plays the preview when it is on and sounding (its status
 * is read, not checked again). Installed but off, the built-in voice plays at
 * once and the dialog offers to turn it on when the quick installed check
 * answers; the full bank check waits until the pianist turns it on. */
async function auditionVoice():Promise<{voice:'piano'|'built-in';voiceNote?:string}>{
 if(!pianoSettings.enabled)return {voice:'built-in'};
 try{const audio=await nativePiano.audioStatus();if(audio.mode==='browser')return {voice:'built-in'};return audio.enabled&&audio.running&&!audio.error?{voice:'piano'}:{voice:'built-in',voiceNote:`Your piano is not sounding${audio.error?`: ${audio.error.replace(/\.$/,'')}`:''}.`};}
 catch{return {voice:'built-in'};}
}
/** Hear the piece after a count-in and set its tempo by ear. Resolves with the
 * chosen rate on the counted beat, saved as yours, or undefined when left. When
 * practice already has a goal, it keeps it, and the dialog says so. */
async function hearAndSetTempo(target:OpenScore,tempos:ScoreTempos,confirmLabel:string,setsPracticeGoal=false):Promise<number|undefined>{
 const score=target.package.score,beat=countedBeat(score),bpm=auditionStartTempo(score,tempos.piece),schedule=buildPerformanceSchedule(performedScore(target),beat),voice=await auditionVoice();
 const goal=!setsPracticeGoal&&tempos.goal?wholeTempoOnBeat(tempos.goal.bpm,tempos.goal.beat,beat):undefined;
 const view={heading:workHeadingMarkup(target.entry.metadata),tempo:tempos.piece,beat,bpm,confirmLabel,setsPracticeGoal,...(goal!==undefined?{practiceGoal:goal}:{}),...voice};
 const audition:Audition=voice.voice==='piano'?new NativeTempoAudition(schedule,bpm):new TempoAudition(schedule,bpm),follow=followPlayingBar(target);
 // Turning the piano on here is the Options › Piano switch: it stays on, and
 // is saved only once the piano sounds.
 const usePiano=async(chosen:number)=>{await savePiano({...pianoSettings,enabled:true},true);return new NativeTempoAudition(schedule,chosen);};
 const offerPiano=pianoSettings.enabled?undefined:nativePiano.bankPresent().catch(()=>false);
 return new Promise(resolve=>{
  const d=showDialog(tempoAuditionMarkup(view),'score-tempo');d.setAttribute('aria-labelledby','tempo-audition-title');
  let settled=false;const finish=(value:number|undefined)=>{if(settled)return;settled=true;dispose();if(followedPage!==undefined&&current===target){followedPage=undefined;renderPages();}followedPage=undefined;resolve(value);};
  const dispose=mountTempoAudition({dialog:d,audition,view,follow,usePiano,offerPiano,fallback:chosen=>new TempoAudition(schedule,chosen),cancel:()=>{finish(undefined);if(dialog===d)closeDialog();},confirm:chosen=>{
   // Shown at once; written after. Every other preference stays as it is.
   preferences.scoreTempos=withOwnerScoreTempo(preferences,target.entry.id,ownerScoreTempo(chosen,beat)).scoreTempos;
   void savePreferences().catch(error=>notify(`Tempo was not saved: ${(error as Error).message}`));
   finish(chosen);if(dialog===d)closeDialog();
   if(goal!==undefined&&goal!==chosen)notify(`Piece tempo ${tempoRateNumber(chosen)} kept. Practice keeps its goal of ${tempoRateNumber(goal)}; change that in practice Options.`);}});
  d.addEventListener('close',()=>finish(undefined),{once:true});
 });
}
const tempoMark=(bpm:number,beat:ScoreTempo['beat'])=>metronomeMark({version:'reference-performance-tempo-v1',bpm,beat,provenance:{kind:'editorial',reference:'Score Viewer performance tempo'}},bpm);
/** Options shows the piece tempo, how long the piece takes at it, and practice's own goal. */
async function paintScoreTempo(d:HTMLDialogElement,target:OpenScore){
 const slot=d.querySelector<HTMLElement>('[data-score-tempo-value]');if(!slot)return;
 try{
  const {piece,goal}=await scoreTempoFor(target);if(dialog!==d||current!==target)return;
  const beat=meterBeat(target.package.score),hear=d.querySelector<HTMLButtonElement>('[data-action=score-tempo]');
  if(!beat&&hear){hear.disabled=true;hear.title='Hearing needs a meter; this score has none.';}
  const practiceLine=goal&&piece?.origin!=='practice'&&!(piece?.confident&&sameTempo(goal,piece))?`<small data-score-practice-goal>Practice goal ${tempoMark(goal.bpm,goal.beat)}</small>`:'';
  if(!piece||!piece.confident){slot.innerHTML=`<span>Not set</span><small>${esc(scoreTempoOriginText(piece))}</small>${practiceLine}`;return;}
  const counted=beat??piece.beat,seconds=performanceSeconds(buildPerformanceSchedule(performedScore(target),counted),tempoOnBeat(piece.bpm,piece.beat,counted));
  slot.innerHTML=`<span>${tempoMark(piece.bpm,piece.beat)}</span><small>${esc(scoreTempoOriginText(piece))} · about ${playingTimeLabel(seconds)}</small>${practiceLine}`;
 }catch(error){if(dialog===d)slot.textContent=(error as Error).message;}
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
async function prepareScore(bytes:Uint8Array,layout:PhysicalKeyboardId,personal:PersonalState|undefined,admitted:ScorePackage,op:ReadingOperation,entry:Entry,newEntry=false,keepOnFailure=false):Promise<{q:PreparedScore;running:NonNullable<typeof job>;dialog:HTMLDialogElement;gained?:GainedLayout}>{
 const p=admitted;
 if(scoreCapabilities(p).pianoPreparation)return preparePianoLayout(bytes,layout,personal,p,op,entry,newEntry,keepOnFailure);
 await readingCheckpoint(op);return {q:{packageBytes:bytes,package:p,...(personal?{personal:readPersonal(personal,p)}:{})},running:op.running,dialog:op.dialog!};
}
async function installPreparedScore(entry:Entry,q:PreparedScore,running:NonNullable<typeof job>,personal:PersonalState,newEntry=false,personalFiles?:Record<string,string>,context?:PracticeViewContext,rebuilt?:RebuiltInstall,earlier?:Uint8Array){
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
   ...(rebuilt?{additionalPersonal:rebuilt.additionalPersonal.map(p=>({key:p.key,bytes:new TextEncoder().encode(JSON.stringify(p.personal))})),replaced:rebuilt.replaced}:{}),...(earlier?{earlier}:{}),
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
/** How a score gained the keyboard layout it opened on: the layout its
 * edition had, whether that layout printed fingers, and the journals carried
 * when the whole edition was engraved again (installed like an Earlier
 * edition). */
interface GainedLayout {from:PhysicalKeyboardId;fingers:boolean;rebuilt?:RebuiltInstall;
 /** The new layout shows the pages the edition already had. */
 shared?:boolean;
 /** The layout asked for, when its pages couldn't be made and the score opened on the pages it has. */
 kept?:PhysicalKeyboardId}
/** Every piano score opens on either keyboard layout: the two layouts read
 * the same notation. ISO notation draws the same pages for both and the
 * reader draws fingers at the seats, so an edition saved with pages for one
 * layout shows those very pages on the other, with nothing engraved: a linked
 * edition gains a view naming them, and an early-format edition is linked
 * with them, carrying `entry`'s journals and practice. Only pages with ink
 * made for one layout (hands calculated for it) are engraved for the other,
 * and a transposed edition is transposed again from its original. Fingerings
 * made for one layout stay with it. With `keepOnFailure` (opening, not
 * switching), a score whose new pages can't be made opens on the pages it
 * has. The new edition becomes current only when the caller installs it. A
 * new entry has no journals yet, so none are read for it. */
async function preparePianoLayout(bytes:Uint8Array,layout:PhysicalKeyboardId,personal:PersonalState|undefined,selected:ScorePackage,op:ReadingOperation,entry:Entry,newEntry=false,keepOnFailure=false):Promise<{q:PianoPrepared;running:NonNullable<typeof job>;dialog:HTMLDialogElement;gained?:GainedLayout}>{
 const steps=getScoreTransposition(selected);
 if(selected.availablePresentations?.includes(layout)??selected.keyboardLayout===layout)return preparePiano(bytes,layout,personal,op);
 const from=selected.keyboardLayout??'janko-four-row',fingers=!!selected.fingerLayer,journals=newEntry?{read:async()=>null}:host,
  admit=(b:Uint8Array)=>readerAdmission.import(b,{allowLegacyTempo:true}),
  cancelled=(error:unknown)=>(error as Error)?.name==='AbortError'||(error as Error)?.message===READING_CANCELLED||op.controller.signal.aborted;
 if(canShareKeyboardView(selected,layout))try{
  if((selected.collectionManifest??selected.manifest).version===2){
   const shared=await shareKeyboardView(selected,layout);checkReading(op);
   const view=await selectPresentation(await admit(shared),layout);checkReading(op);
   return {...await preparePiano(shared,layout,personal??personalForAddedKeyboard(selected,view),op),gained:{from,fingers,shared:true}};
  }
  const linked=await prepareRebuiltEdition(journals,entry,entry.file,bytes,layout,{admit,keepPages:true},readingExecution(op));checkReading(op);
  return {...await preparePiano(linked.packageBytes,layout,linked.personal,op),gained:{from,fingers,rebuilt:linked,shared:true}};
 }catch(error){if(cancelled(error))throw error;console.warn('The existing pages could not serve the other keyboard layout; engraving it instead.',error);}
 try{
  if(!steps&&canAddKeyboardView(selected,layout)){
   readingProgress(op,'engrave-keyboard');
   const added=await addKeyboardView(selected,layout,readingExecution(op));checkReading(op);
   const view=await selectPresentation(await admit(added),layout);checkReading(op);
   return {...await preparePiano(added,layout,personal??personalForAddedKeyboard(selected,view),op),gained:{from,fingers}};
  }
  if(!steps){
   readingProgress(op,'engrave-keyboard');
   const rebuilt=await prepareRebuiltEdition(journals,entry,entry.file,bytes,layout,{admit},readingExecution(op));checkReading(op);
   return {...await preparePiano(rebuilt.packageBytes,layout,rebuilt.personal,op),gained:{from,fingers,rebuilt}};
  }
  readingProgress(op,'transpose');
  const transposed=await prepareSourceTransposition(selected,bytes,steps,readingExecution(op));checkReading(op);
  return await preparePiano(transposed,layout,undefined,op);
 }catch(error){
  if(!keepOnFailure||cancelled(error))throw error;
  console.warn(`The ${layoutName(layout)} pages could not be made; opening on the ${layoutName(from)} pages.`,error);
  // Opening never fails for want of a layout's pages: the score opens on the pages it has.
  return {...await preparePiano(bytes,from,personal,op),gained:{from,fingers,kept:layout}};
 }
}
let scoreActivation=0;
/** What the open score still gets ready once its pages show (score-readiness.ts),
 * and the one press waiting for it. */
let readiness:ScoreReadiness|undefined,stopReaderStages:()=>void=()=>{};
const presses=new PendingPress(new ReadinessNotice(document));
/** A press in the reader waits at the bottom centre of its surface, which turns with the reader. */
const readerNotice=():ReadinessNoticePlace|undefined=>{const surface=app.querySelector<HTMLElement>('.surface');return current&&surface?{surface}:undefined;};
/** Practice says so in the player's words, though it waits for fingers first. */
const PRESS_WORDS:Readonly<Record<string,string>>={practice:READINESS_WORDS.practice};
/** Run a press's action now when what it needs is ready; otherwise accept it,
 * run it once ready and say so if that takes a moment. True when it waits. */
function waitsFor(key:string,stage:ReadinessStage,run:()=>unknown,place:()=>ReadinessNoticePlace|undefined=readerNotice):boolean{
 if(!readiness||readiness.ready(stage))return false;
 // A stage that failed has said why (scoreReadiness); its press does not run, nor wait again.
 const waited=readiness;void presses.press(key,waited,stage,()=>{if(current&&waited.ready(stage))return Promise.resolve(run()).catch(reportFailure);},place,PRESS_WORDS[key]??READINESS_WORDS[stage]).then(declareState);declareState();return true;
}
/** Before a long step that keeps script busy: when a press waits, let one
 * frame put its notice on screen first, so the notice can fade in by itself
 * while the step runs. Otherwise nothing waits. */
const noticeOnScreen=()=>presses.pending?new Promise<void>(resolve=>{afterPaint(resolve);}):Promise.resolve();
function closeReadiness(){presses.cancel();stopReaderStages();stopReaderStages=()=>{};readiness?.dispose();readiness=undefined;}
/** Whether the pages drawn first need no shared fingers: they show pitches
 * (a held fingering waits for them), and no repeat may fold on a finger. */
function fingersAfterPages(target:NonNullable<typeof current>){
 return effectiveLabelMode(target.personal.view,preferences.fingerBehavior,input.fingersHeld||controls.fingersHeld,true,false)==='pitch';
}
/** Register the score in fingering memory if it is new there, then resolve
 * its shared fingers. Where the reader is looking stays as it is. */
async function resolveFingers(target:NonNullable<typeof current>,between?:()=>Promise<void>){
 const before=target.personal,registered=await personalMemory.register(target.entry,target.package,before);
 // After the pages show, the two halves run as separate tasks, so a waiting press can say so.
 await between?.();
 registered.view=before.view;registered.navigation=before.navigation;registered.editContactId=before.editContactId;
 target.personal=registered;target.personal=resolveMemory(target);
 // The reader draws its seats from what it shows: shared fingers join it (they change no hand).
 const editor=livePersonalEditors.get(target);if(editor)editor.visiblePersonal=structuredClone(target.personal);
}
/** The stages of one opened score. Pages are the opening itself; fingers are
 * resolved here when the opening left them for later; hands settle the
 * engraving for hand editing in the projection worker; practice plans the
 * score's practice and places its fingerings ahead of a press. Piano input
 * needs nothing beyond the opening. */
function scoreReadiness(target:NonNullable<typeof current>,fingersLater:boolean,saving?:Promise<unknown>):ScoreReadiness{
 const live=(signal:AbortSignal)=>{signal.throwIfAborted();if(current!==target)throw cancelledReading();};
 const piano=scoreCapabilities(target.package).pianoPreparation,practises=scoreCapabilities(target.package).pianoPractice&&!readingPresentation;
 // Work taken over from the library saves its engine first, which hand editing then restores.
 if(piano&&saving)shownSession(target).engineSavedBy(saving);
 return new ScoreReadiness({
  // Its failure reaches the player as the opening's did; a stopped stage says nothing.
  ...(fingersLater?{fingers:{run:async signal=>{try{live(signal);await noticeOnScreen();live(signal);await resolveFingers(target,async()=>{await nextTask();await noticeOnScreen();live(signal);});live(signal);if(!practice)renderToolbar();}
   catch(error){if(!signal.aborted&&current===target){if(personalMemory.error)paintPersonalSaveError(target,personalMemory.error);else reportFailure(error);}throw error;}}}}:{}),
  ...(piano?{hands:{run:async signal=>{
   // On a folded score that is the folded pages' session: the one work taken over from the library prepared.
   if(saving)await saving.catch(()=>{});live(signal);const session=shownSession(target);session.prefetch();await session.handChoiceCheck();}}}:{}),
  ...(practises?{practice:{needs:['fingers'],run:async signal=>{
   await idleTime();live(signal);if(practice)return;const source=practiceSource(target);
   try{annotationPositions(source.view);}catch{/* practice says why when it opens */}
   await idleTime();live(signal);
   await PracticeView.prepareContext(source.base,target.entry.id,undefined,source.personal,undefined,false,source.fold).catch(()=>{});}}}:{}),
 });
}
/** Another writer changed what the open score rests on while it opened from
 * the state this session last saw: open it again from the store. */
function reopenChanged(target:NonNullable<typeof current>){
 if(readingOperation||dialog||selection||practice)return;
 void open(target.entry).catch(reportFailure);
}
async function activateScore(next:NonNullable<typeof current>,context?:PracticeViewContext,admitted?:AdmittedPracticeContext,op?:ReadingOperation,rememberOpened=false){
 const ownsOperation=!op;op??=beginReading(next.entry.id);retained.free();
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
 // Shared fingers are resolved once the pages show when nothing on them needs them (fingersAfterPages).
 // The store state this opening read serves it; reopened in the same session, the last one does, checked after paint.
 const piano=scoreCapabilities(next.package).pianoPreparation;let fingersLater=piano&&!context&&!repeatsMayFold(next.package);
 if(piano){next.personal=await personalMemory.loadPersonalCurrent(next.entry,next.package,async()=>rawMemoryPersonal(next.personal),{since:op.startedAt,earlier:true,register:fingersLater?'later':'now'});check();
  if(fingersLater&&!fingersAfterPages(next)){fingersLater=false;await resolveFingers(next);check();}
  else if(!fingersLater)next.personal=resolveMemory(next);}
 // A saved hand the engraver can't fit returns to the score's own hand, with a notice, rather than locking the score.
 let keptHands=0,droppedCarries:number[]=[],unsharedFingers:number[]=[];
 // Opening draws only what this score shows: its own pages, or the saved
 // hand choices' projection. With a projection worker the engraver settles
 // for editing in the worker after opening; without one it settles here, as before.
 // Opening the score being prepared ahead of time waits for it, then reads its pages from disk.
 await aheadOfTime?.joined(next.entry.id,op.controller.signal);check();
 // A score that shows a repeat folded draws only its folded pages.
 cancelPersonalPrefetch();const nextEditor=personalEditor(next),folds=scoreCapabilities(next.package).pianoPreparation&&nextEditor.fold.folds(next.personal);if(!folds&&nextEditor.session.settlesOnOpen){await nextEditor.session.warm(readingExecution(op));check();}
 // A saved hand the engraver can't draw returns to the score's hand on the pages the reader shows: a folded repeat opens folded.
 const opened=next.personal;nextEditor.view=await projectShown(next,opened,readingExecution(op))
  .catch(async error=>{if(fingersLater){fingersLater=false;await resolveFingers(next);}const kept=await keepDrawableHands(next,next.personal,error,id=>next.package.score.notes.find(n=>n.id===id)?.hand??null,opened,readingExecution(op));keptHands=kept.keys;droppedCarries=kept.dropped;unsharedFingers=kept.unshared;return kept.view;});check();resolvePersonalNavigation(next.personal,nextEditor.view);nextEditor.visiblePersonal=structuredClone(next.personal);check();
 // Publication begins here. Closing/canceling cannot roll back an installed
 // score or a practice view while its remaining host prerequisites settle.
 op.running.state='installing';readingProgress(op,'open');op.loading.saving('Almost ready. This part can’t be cancelled.');
 readingParts.remember(next.entry,next.package);
 ++manualPracticeGeneration;adviceKey='';adviceRunner.cancel();pitchInput.block();practice?.close();practice=undefined;selection=undefined;editNavigation='notes';selectionPitchToggle=false;
 readingPresentation=nextPresentation;readingViewError=nextViewError;
 if(rememberOpened){toolbarVisible=false;libraryMenu.selection.update(entries,next.entry.id);libraryMenu.selection.select(`score:${next.entry.id}`);preferences.lastWorkedEntryId=next.entry.id;}
 current=next;orientation.admitReader(next.personal.view.rotation);editSequence.reset();musicalSustain.clear();resetInput();
 if(clock!==undefined)pitchInput.reset(clock);if(clockError)notify((clockError as Error).message);if(nextViewError)notify(nextViewError);if(droppedCarries.length)notify(droppedCarryText(droppedCarries,unsharedFingers,printedBars(next)));if(keptHands)notify(keptHands===1?'A saved hand choice can’t be drawn on the page yet, so its note keeps the score’s hand.':'Some saved hand choices can’t be drawn on the page yet, so those notes keep the score’s hands.');
 closeReadiness();readiness=scoreReadiness(next,fingersLater,context?undefined:aheadOfTime?.finishing(next.entry.id));
 if(context){await startPractice(context,admitted);if(op)checkReadingOwner(op);if(activation!==scoreActivation||current!==next)throw cancelledReading();}else render();
 readiness.settle('pages');
 if(personalMemory.error)paintPersonalSaveError(next,personalMemory.error);
 // The rest of the score gets ready once its pages are on screen.
 const shown=readiness;stopReaderStages=prepareAfterPaint(shown,['fingers','hands','practice']);
 const stopConfirm=afterPaint(()=>void personalMemory.confirmReading(next.entry.id).then(same=>{if(!same&&current===next&&readiness===shown)reopenChanged(next);},()=>{}));
 const stopStages=stopReaderStages;stopReaderStages=()=>{stopStages();stopConfirm();};
 if(ownsOperation)finishReading(op,true);return next;
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
     catch(rebuildError){if((rebuildError as Error).name==='AbortError')throw rebuildError;
      // Pages an earlier engine drew still open as saved.
      if(refusal instanceof SavedPagesBehindPolicy){console.warn('The saved pitch could not be engraved again; it opens on its saved pages.',rebuildError);keepSavedPagesBehindPolicy(refusal.archiveSha256);return await prepareRetainedEdition(host,target.entry,file,layout,false);}
      if(steps===0)throw rebuildError;}
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
  if(!prepared){if(steps===0)throw Error('The retained original for this keyboard layout is unavailable. The current score is retained.');const bytes=await host.read(target.entry.file);if(!bytes)throw Error('Managed score is missing; current transposition retained.');
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

 try{const previous=current;if(previous){requirePianoCapability(previous.package,'pianoPreparation');op=beginReading(previous.entry.id,new LoadingProgress(previous.entry.metadata.title,['check','save','hands','open'],{kicker:`Switching to the ${layoutName(id)}`,cancel:true,cancelNote:'Cancel keeps the current layout.'}));readingProgress(op,'check');await readingCheckpoint(op);await practice?.flush();const context=practice?.contextSnapshot();await savePersonal();checkReading(op);const bytes=await host.read(previous.entry.file);if(!bytes)throw Error('Managed score is missing; the current score is retained.');

  const existing=previous.package.availablePresentations?.includes(id)?await selectPresentation(previous.package,id):undefined,
   personal=existing?await loadPersonal(previous.entry,existing):undefined,{q,running,gained}=await preparePianoLayout(bytes,id,personal,previous.package,op,previous.entry);
  if(current!==previous)throw Error('The current score changed while switching keyboards; prior choices are retained.');
   const next=q.personal??(existing?readPersonal(personal,q.package):await loadPersonal(previous.entry,q.package));
   next.view=anchorView(previous.personal.view,q.package,writtenAnchor(previous.package,previous.personal.view.page,selection?.ownerIds[0]));

   const installed=await installPreparedScore(previous.entry,q,running,next,false,undefined,context,gained?.rebuilt);await readingCheckpoint(op);

   preferences.keyboardLayout=id;await savePreferences().catch(error=>notify(`Keyboard layout choice was not saved: ${error.message}`));
   await activateScore({entry:installed.entry,package:q.package,personal:installed.personal},context,installed.practiceContext,op);
   finishReading(op,true);
   const said=gained&&gainedNotice(gained,q.package,false);if(said)notify(said);
 }else{await enqueue(async()=>{await writeJson('preferences.json',{...preferences,keyboardLayout:id});preferences.keyboardLayout=id;});repaintLibrary();
  // Pages prepared for the old layout are no use now: prepare the library for this one.
  aheadOfTime?.start(libraryOrder());}
 return true;
 }catch(error){if(op)finishReading(op,false,error);reportFailure(error);if(current&&!practice)renderToolbar();return false;}
 finally{keyboardChanging=false;if(optionsSurface?.isConnected&&dialog===optionsSurface){optionsSurface.querySelectorAll<HTMLSelectElement>('[data-keyboard]').forEach(field=>field.value=current?.package.keyboardLayout??preferences.keyboardLayout);if(document.activeElement===source||!source?.isConnected)optionsSurface.querySelector<HTMLElement>('[data-keyboard]')?.focus();}}
}

/** The score last read, kept after Back so reopening it unchanged only draws
 * it again. Only scores opened from the library on their piano pages qualify. */
const retainable=new WeakSet<NonNullable<typeof current>>();let retentionWatch:number|undefined;
const retained=new RetainedScore<NonNullable<typeof current>>(()=>{window.clearInterval(retentionWatch);retentionWatch=undefined;});
type HeapMemory={usedJSHeapSize:number;jsHeapSizeLimit:number};const heapMemory=()=>(performance as Performance&{memory?:HeapMemory}).memory;
function retentionConditions(entry:Entry):RetentionConditions|undefined {
 const records=personalMemory.readingRefs(entry.id);if(!records)return;
 const {lastWorkedEntryId:_opened,...kept}=preferences;return {entry,records,preferences:kept,carries:handCarryDropGeneration(),build:VIEWER_DERIVED_IDENTITY};
}
function retainScore(target:NonNullable<typeof current>){
 const entry=entries.find(e=>e.id===target.entry.id);
 // A reading whose library entry moved on (a new edition, transposition) is opened afresh.
 if(underMemoryPressure(heapMemory())){releaseUnderPressure();return;}
 if(!entry||!retainable.has(target)||target.package.reading?.dual||!scoreCapabilities(target.package).pianoPreparation||personalMemory.error)return;
 if(JSON.stringify(entry)!==JSON.stringify(target.entry))return;
 const conditions=retentionConditions(entry);if(!conditions)return;
 retained.keep(entry.id,conditions,target);
 retentionWatch=window.setInterval(()=>{if(underMemoryPressure(heapMemory()))releaseUnderPressure();},30000);
}
async function open(entry:Entry,sourceGroup?:string){const op=beginReading(entry.id,openingLoading(entry.id));clearNotice();try{await readingCheckpoint(op);await practice?.flush();await savePersonal();checkReading(op);
 // The score just closed, with nothing it rests on changed, is drawn again as it was left: no read, admission or projection.
 const kept=retained.take(entry.id,()=>sourceGroup===undefined?retentionConditions(entry):undefined);
 if(kept){await host.fullscreen(true);checkReading(op);const activated=await activateScore(kept,undefined,undefined,op,true);retainable.add(activated);finishReading(op,true);await saveReadingPreferences().catch(error=>notify(`Last score was not saved: ${error.message}`));return;}
 const data=await host.read(entry.file);if(!data)throw Error('Managed score file is missing; reimport its package');
 // Pages an earlier engine drew are engraved again with the current shared policy, once: the new edition is saved.
 let prior:ScorePackage,admitted:ScorePackage|undefined,withoutRepeats=false,keptSaved=false;try{prior=requireCurrentEngraving(admitted=await importReading(data,op));}catch(error){if((error as Error).name==='AbortError')throw error;try{checkReading(op);}catch{throw error;}if(await openRebuiltEdition(entry,data,error,op,sourceGroup,admitted))return;
  // Pages drawn before the current policy, or that only lack their repeat signs, open as saved, for the rest of the session, when they can’t be engraved again.
  if(error instanceof SavedPagesBehindPolicy){keepSavedPagesBehindPolicy(error.archiveSha256);keptSaved=true;}else{keepSavedPagesWithoutRepeats((error as SavedPagesLackRepeats).sourceSha256);withoutRepeats=true;}prior=await importReading(data,op);}
 // A piano score's opening reads the store; that read runs while its source is admitted.
 if(scoreCapabilities(prior).pianoPreparation)personalMemory.prefetch();
 await admitReadingSource(prior,op);
 if(sourceGroup&&guitarProContext(prior)?.groupId!==sourceGroup)throw Error('This source part belongs to another original input; the current score is retained.');assertSelectedTransposition(entry,prior);
 // Every piano score opens on the player's keyboard layout, gaining it when its edition lacks it.
 const layout=op.keyboard,
  selected=prior.availablePresentations?.includes(layout)?await selectPresentation(prior,layout):undefined,
  personal=selected?await loadPersonal(entry,selected,op):prior.manifest.version===3?await loadPersonal(entry,prior,op):undefined,{q,running,gained}=await prepareScore(data,layout,personal,prior,op,entry,false,true);
 const loadedPersonal=q.personal??await loadPersonal(entry,q.package,op),
  // An admitted retained view needs no new package or personal-journal version.
  // Byte equality also covers retained ready/editable finger layers.
  unchangedArchive=collectionId(q.package)===entry.id&&q.packageBytes.byteLength===data.byteLength&&q.packageBytes.every((value,index)=>value===data[index]),
  installed=q.package.reading?.dual||unchangedArchive?{entry,personal:loadedPersonal}:await installPreparedScore(entry,q,running,loadedPersonal,false,undefined,undefined,gained?.rebuilt);await readingCheckpoint(op);
  await host.fullscreen(true);checkReading(op);const activated=await activateScore({entry:installed.entry,package:q.package,personal:installed.personal},undefined,undefined,op,true);if(!withoutRepeats)retainable.add(activated);finishReading(op,true);
  await saveReadingPreferences().catch(error=>notify(`Last score was not saved: ${error.message}`));
  const said=[withoutRepeats?'This score’s repeat signs couldn’t be engraved, so it opened on its saved pages without them.':'',keptSaved?SAVED_PAGES_KEPT:'',gained?gainedNotice(gained,q.package,false):''].filter(Boolean).join(' ');if(said)notify(said);
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
function rebuiltNotice(r:RebuiltInstall,lead='This score was engraved again with the current engraving.'){
 return [`${lead} ${r.left?'Your hands and fingers came along.':'Your hands, fingers and choices came along.'}`,...carryNotes(r)].filter(Boolean).join(' ');
}
/** Only what didn't come along as it was. */
function carryNotes(r:RebuiltInstall):string[]{
 const moved=[r.hands==='choices'?'hands':'',r.fingers==='choices'?'fingers':''].filter(Boolean).join(' and '),notes=(n:number)=>`${n} note${n===1?'':'s'}`;
 return [moved?`The edition’s ${moved} now show as your own choices.`:'',
  r.left?`Your choices for ${notes(r.left)} couldn’t move and stay with the earlier edition.`:'',
  r.practiceLeft?'Some practice progress couldn’t move and stays with the earlier edition.':''].filter(Boolean);
}
/** Said once a score gained the keyboard layout it opened on, only when there
 * is something to say: that its edition was engraved again, or that
 * fingerings made for the other layout show only on that layout. */
function gainedNotice(g:GainedLayout,shown:ScorePackage,imported:boolean):string{
 if(g.kept)return `This score has no pages for the ${layoutName(g.kept)} yet and they couldn’t be made, so it opened on its ${layoutName(g.from)} pages.${g.fingers?` The fingerings shown are for the ${layoutName(g.from)}.`:''}`;
 const fingers=g.fingers&&!shown.fingerLayer?`Fingerings made for the ${layoutName(g.from)} show only on that layout.`:'';
 // The same pages serve the new layout: only fingers, and anything of the player's that couldn't move, are worth saying.
 if(g.shared)return [fingers,...(g.rebuilt&&!imported?carryNotes(g.rebuilt):[])].filter(Boolean).join(' ');
 if(!g.rebuilt)return fingers;
 const lead=`This score was engraved for the ${layoutName(shown.keyboardLayout!)} from its own notes.`;
 // A fresh import has nothing of the player's to carry yet.
 return [imported?lead:rebuiltNotice(g.rebuilt,lead),imported?'':'The earlier edition stays saved.',fingers].filter(Boolean).join(' ');
}
/** Said when saved pages an earlier engine drew couldn't be engraved again. */
const SAVED_PAGES_KEPT='This score couldn’t be engraved again with the current engraving, so it opened on its saved pages.';
/** A saved edition whose pages the current engraving no longer reproduces is
 * engraved again from its own content and installed like an Earlier edition:
 * the earlier archive and its journals stay saved. False when pages that only
 * lack their repeat signs, or that an earlier engine drew, couldn't be
 * engraved again: they open as saved. */
async function openRebuiltEdition(entry:Entry,bytes:Uint8Array,admission:unknown,op:ReadingOperation,sourceGroup?:string,content?:ScorePackage):Promise<boolean>{
 readingProgress(op,'engrave-again');
 // Engraving under way in the library for this score is awaited, then read, not made a second time.
 await aheadOfTime?.joined(entry.id,op.controller.signal);checkReading(op);
 const reading=await reengraveReadingArchive(bytes,admission,readingExecution(op));
 if(reading){await openReengravedReading(entry,reading,op,sourceGroup);return true;}
 let rebuilt:RebuiltInstall,prepared:Awaited<ReturnType<typeof preparePiano>>;
 try{rebuilt=await prepareRebuiltEdition(host,entry,entry.file,bytes,op.keyboard,{refusal:admission,admit:b=>readerAdmission.import(b,{allowLegacyTempo:true}),...(content?{content}:{})},readingExecution(op));
  await readingCheckpoint(op);prepared=await preparePiano(rebuilt.packageBytes,op.keyboard,rebuilt.personal,op);}
 catch(error){if(!(admission instanceof SavedPagesLackRepeats||admission instanceof SavedPagesBehindPolicy)||(error as Error).name==='AbortError')throw error;checkReading(op);console.warn('The saved edition could not be engraved again; it opens on its saved pages.',error);return false;}
 const {q,running}=prepared,
  installed=await installPreparedScore(entry,q,running,q.personal??rebuilt.personal,false,undefined,undefined,rebuilt);await readingCheckpoint(op);
 await host.fullscreen(true);checkReading(op);const activated=await activateScore({entry:installed.entry,package:q.package,personal:installed.personal},undefined,undefined,op,true);retainable.add(activated);let unsaved='';finishReading(op,true);await saveReadingPreferences().catch(error=>{unsaved=` Last score was not saved: ${error.message}`;});
 notify(rebuiltNotice(rebuilt)+unsaved);return true;
}

/** A musical reading engraved again is installed like any new edition of
 * the score: the earlier archive and its journals stay saved. Its journals
 * are named for the score alone, so the reader's place and practice stay. */
async function openReengravedReading(entry:Entry,bytes:Uint8Array,op:ReadingOperation,sourceGroup?:string){
 await readingCheckpoint(op);
 // Opened like any admitted reading: its Guitar Pro source and part group are checked too.
 const p=await admitReading(bytes,op);
 if(sourceGroup&&guitarProContext(p)?.groupId!==sourceGroup)throw Error('This source part belongs to another original input; the current score is retained.');
 const {q,running}=await prepareScore(bytes,op.keyboard,await loadPersonal(entry,p),p,op,entry,false,true),
  installed=await installPreparedScore(entry,q,running,q.personal??await loadPersonal(entry,q.package));await readingCheckpoint(op);
 await host.fullscreen(true);checkReading(op);const activated=await activateScore({entry:installed.entry,package:q.package,personal:installed.personal},undefined,undefined,op,true);let unsaved='';finishReading(op,true);await saveReadingPreferences().catch(error=>{unsaved=` Last score was not saved: ${error.message}`;});
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
  const personal=await loadPersonal(entry,part.package);checkReading(op);const activated=await activateScore({entry,package:part.package,personal},undefined,undefined,op,true);finishReading(op,true);await saveReadingPreferences().catch(error=>notify(`Last score was not saved: ${error.message}`));
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
 const op=beginReading('import',new LoadingProgress('New score',[...(kind==='score'?[]:['engrave'] as const),'check','save','hands','open'],{kicker:'Importing',cancel:true}));let reading:AdmittedReading|undefined;try{await readingCheckpoint(op);
 if(kind==='musicxml'){readingProgress(op,'engrave');const [{frettedPreparationAssets},{prepareMusicXmlScore}]=await Promise.all([import('./fretted-preparation-assets'),import('./musicxml-import')]);checkReading(op);
  const assets=await frettedPreparationAssets(op.controller.signal);checkReading(op);
  const written=bytes;({bytes,reading}=await prepareMusicXmlScore(written,assets,readingExecution(op)));await readingCheckpoint(op);}
 if(MUSESCORE_IMPORT_ENABLED&&kind==='musescore'){readingProgress(op,'engrave');const [{frettedPreparationAssets},{prepareMuseScore}]=await Promise.all([import('./fretted-preparation-assets'),import('./musescore-import')]);checkReading(op);
  const assets=await frettedPreparationAssets(op.controller.signal);checkReading(op);
  const saved=bytes;({bytes,reading}=await prepareMuseScore(saved,assets,readingExecution(op)));await readingCheckpoint(op);}
 // A file the current engraving refuses is engraved again from its own content, as opening it from the library would be.
 let p:ScorePackage,engravedFrom:Uint8Array|undefined,importSaid:string|undefined;
 try{p=await admitReading(bytes,op);}catch(admission){({bytes,package:p,earlier:engravedFrom,said:importSaid}=await importAgain(bytes,admission,op));}
 const id=collectionId(p),priorEntry=entries.find(e=>e.id===id);op.running.entryId=id;op.loading.setTitle(p.manifest.metadata.title||op.loading.title);
 await practice?.flush();await savePersonal();
 let refresh=false,linkedRefresh=false,savedHasLayout=false,previous:ScorePackage|undefined;
 if(priorEntry){if((priorEntry.transposition?.steps??0)!==0&&getScoreTransposition(p)===0)throw Error('Restore 0 steps before updating the original score. Your selected transposition is retained.');const prior=await host.read(priorEntry.file);if(!prior)throw Error('Managed package is missing; prior library entry retained');const saved=await admitReading(prior,op).catch(async error=>{try{checkReading(op);}catch{throw error;}return await editionNeedsEngravingAgain(prior,error)??Promise.reject(error);});previous=saved;
  savedHasLayout=saved.availablePresentations?.includes(op.keyboard)??saved.keyboardLayout===op.keyboard;
  if(referenceMidiDiffers(saved,p))throw Error('This score has a different MIDI reference; the installed score and your saved choices are retained.');
  // An early-format score file whose notes the library's edition was already
  // engraved from (to gain a keyboard layout) is the score already saved:
  // it opens as saved, and the earlier file stays under Earlier editions.
  if(p.manifest.version===1&&(saved.collectionManifest??saved.manifest).version!==1&&saved.sourceSha256===p.sourceSha256){
   finishReading(op,false);await open(priorEntry);notify('This score is already in your library, so it opened as saved.');return;}
 }
 // So are pages an earlier engine drew, which opening would engrave again.
 if(!engravedFrom&&!importSaid)try{requireCurrentEngraving(p);}catch(admission){({bytes,package:p,earlier:engravedFrom,said:importSaid}=await importAgain(bytes,admission,op));}
 if(priorEntry&&previous){
  refresh=!sameFrozenPayload(previous.manifest,p.manifest);linkedRefresh=p.manifest.version===2&&p.sourceSha256===(previous.sourceSha256??previous.manifest.semanticSha256);
  if(refresh&&!linkedRefresh){if(!headerOnlyRefresh(previous,p))throw Error('This source revision has a different frozen presentation beyond a verified header cleanup; the existing package and saved choices are retained.');suspendReadingDialog(op);const confirmed=await confirmHeaderRefresh();checkReading(op);if(!confirmed){finishReading(op,false);return;}readingDialog(op);}
 }
 // Every piano score imports on the player's keyboard layout, gaining it when its edition lacks it.
 const layout=op.keyboard,selected=p.availablePresentations?.includes(layout)?await selectPresentation(p,layout):undefined,
  personal=priorEntry&&(selected||p.manifest.version===3)?await loadPersonal(priorEntry,selected??p):undefined,
  journals:Entry=priorEntry??{id,file:scoreFileName(await hashBytes(bytes)),metadata:p.manifest.metadata,importedAt:new Date().toISOString()},
  // A file lacking a layout the saved edition has never replaces it on other pages.
  {q,running,gained}=await prepareScore(bytes,layout,personal,p,op,journals,!priorEntry,!savedHasLayout);
 // The engrave just made for reading settles hand editing too, so the first
 // hand choice doesn't engrave the score again. A refusal costs nothing.
 if(reading)await adoptImportedReading(q.package,reading,readingExecution(op)).catch(error=>{if(error instanceof DOMException&&error.name==='AbortError')throw error;});
 reading=undefined;

 const entry:Entry=priorEntry?{...priorEntry,
   presentations:refresh&&!linkedRefresh?[...(priorEntry.presentations??[]),priorEntry.file]:(priorEntry.presentations??[])}:
   {id,file:scoreFileName(await hashBytes(q.packageBytes)),metadata:q.package.manifest.metadata,importedAt:new Date().toISOString()},
   installed=await installPreparedScore(entry,q,running,q.personal??(priorEntry?await loadPersonal(priorEntry,q.package):initialPersonal(q.package)),!priorEntry,undefined,undefined,gained?.rebuilt,
    // A new score engraved again (to gain a layout, or because the current engraving refused its file) keeps the imported file as an Earlier edition.
    !priorEntry?engravedFrom??(gained?.rebuilt?bytes:undefined):undefined);
  await readingCheckpoint(op);
  const activated=await activateScore({entry:installed.entry,package:q.package,personal:installed.personal},undefined,undefined,op,true);finishReading(op,true);
  await saveReadingPreferences().catch(error=>notify(`Last score was not saved: ${error.message}`));
  const said=[importSaid,gained?gainedNotice(gained,q.package,!priorEntry):''].filter(Boolean).join(' ');if(said)notify(said);
 }catch(error){finishReading(op,false,error);throw error;}
}
/** An imported file the current engraving refuses follows opening's rule:
 * saved pages that no longer reproduce, pages an earlier engine drew and
 * pages without the score's repeat signs are engraved again from the file's
 * own content (its source, hands and fingers). The file itself comes back as
 * `earlier`, so a new score keeps it as an Earlier edition. Pages an earlier
 * engine drew, or that only lack their repeat signs, open as saved when they
 * can't be engraved again; any other refusal stays. */
async function importAgain(bytes:Uint8Array,admission:unknown,op:ReadingOperation):Promise<{bytes:Uint8Array;package:ScorePackage;earlier?:Uint8Array;said?:string}>{
 if((admission as Error)?.name==='AbortError')throw admission;try{checkReading(op);}catch{throw admission;}
 readingProgress(op,'engrave-again');
 try{
  const again=await reengraveReadingArchive(bytes,admission,readingExecution(op))??(await rebuildEdition(bytes,{refusal:admission},readingExecution(op))).bytes;
  await readingCheckpoint(op);return {bytes:again,package:await admitReading(again,op),earlier:bytes};
 }catch(error){
  if(!(admission instanceof SavedPagesLackRepeats||admission instanceof SavedPagesBehindPolicy)||(error as Error).name==='AbortError')throw error;
  checkReading(op);console.warn('The imported score could not be engraved again; it opens on its saved pages.',error);
  if(admission instanceof SavedPagesBehindPolicy){keepSavedPagesBehindPolicy(admission.archiveSha256);return {bytes,package:await admitReading(bytes,op),said:SAVED_PAGES_KEPT};}
  keepSavedPagesWithoutRepeats(admission.sourceSha256);return {bytes,package:await admitReading(bytes,op),said:'This score’s repeat signs couldn’t be engraved, so it opened on its saved pages without them.'};
 }
}
async function confirmHeaderRefresh():Promise<boolean>{return new Promise(resolve=>{const d=showDialog(`<h2>Refresh printed header?</h2><p class="help">This package has identical music, glyph seats, finger choices and every vector byte outside its verified notice cleanup. Your saved corrections and finger choices stay intact. The previous package remains available through Restore previous header.</p><div class="dialog-actions"><button data-keep-header>Keep current <kbd>Esc</kbd></button><button data-refresh-header>Refresh header</button></div>`,'header-refresh');let finished=false;const done=(yes:boolean)=>{if(finished)return;finished=true;resolve(yes);closeDialog();};d.querySelector('[data-keep-header]')!.addEventListener('click',()=>done(false));d.querySelector('[data-refresh-header]')!.addEventListener('click',()=>done(true));d.addEventListener('close',()=>{if(!finished){finished=true;resolve(false);}});});}
async function restoreHeader(){if(!current?.entry.presentations?.length)return;const target=current,history=target.entry.presentations!,file=history.at(-1)!,data=await host.read(file);if(!data)throw Error('The retained package is missing; current header preserved.');const prior=await admitOrContent(data);if(!headerOnlyRefresh(target.package,prior))throw Error('Retained package does not pass the header-only contract; current data preserved.');const updated={...target.entry,file,presentations:history.slice(0,-1),retainedPackages:[...new Set([...(target.entry.retainedPackages??[]),target.entry.file])],...(target.entry.transposition?{transposition:nextTranspositionSelection(target.entry,file,{steps:getScoreTransposition(prior),layout:prior.keyboardLayout??preferences.keyboardLayout})}: {})},next=entries.map(e=>e.id===updated.id?updated:e);await enqueue(()=>writeJson('library.json',{version:1,entries:next}));entries=next;closeDialog();await open(updated);notify('Previous header restored; saved corrections and versions retained.');}
async function earlierEditions(){
 if(!current||job?.state==='working'||job?.state==='installing')return;
 await practice?.flush();const context=practice?.contextSnapshot();await savePersonal();const target=current,files=[...new Set(target.entry.retainedPackages??[])].filter(file=>file!==target.entry.file).reverse(),
  d=showDialog(`<h2>Earlier editions</h2><p class="help">Each edition keeps its pages and saved choices. Select one to restore it for this keyboard layout.</p><div data-editions></div><div data-edition-progress></div><p class="error" role="alert"></p><div class="dialog-actions">${button('Close','close','Esc')}</div>`,'earlier-editions'),list=d.querySelector('[data-editions]')!;
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
     catch(rebuildError){
      // Pages an earlier engine drew still open as saved.
      if(!(error instanceof SavedPagesBehindPolicy)||(rebuildError as Error).name==='AbortError')throw rebuildError;
      console.warn('The earlier edition could not be engraved again; it opens on its saved pages.',rebuildError);keepSavedPagesBehindPolicy(error.archiveSha256);}
     finally{d.removeEventListener('close',stop);}
     retained=rebuilt?{packageBytes:rebuilt.packageBytes,package:rebuilt.package,personal:rebuilt.personal,personalFiles:{...(target.entry.editionPersonalFiles?.[file]??{})}}:await prepareRetainedEdition(host,target.entry,file,layout,false);
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
function closeDialog(returnParent=true){adviceOptions?.dispose();adviceOptions=undefined;if(['piano-preparation','score-reading'].includes(dialog?.dataset.kind??'')&&job?.state==='installing')return;if(dialog&&readingOperation?.dialog===dialog&&readingOperation.running.state==='working')readingOperation.running.cancel();const back=dialogBack;dialogBack=undefined;practiceOptionsCleanup?.();practiceOptionsCleanup=undefined;transposeControls?.dispose();transposeControls=undefined;optionsNavigation?.dispose();optionsNavigation=undefined;dialogNavigation?.dispose();dialogNavigation=undefined;bindingOptions?.dispose();bindingOptions=undefined;midiOptions?.dispose();midiOptions=undefined;audioOptions?.dispose();audioOptions=undefined;pianoOptions?.dispose();pianoOptions=undefined;if(!dialog)return;dialog.close();dialog.remove();dialog=undefined;input.capture=undefined;resetInput();const practiceFocus=practiceFocusReturn?app.querySelector<HTMLElement>(practiceFocusReturn):undefined;practiceFocusReturn=undefined;if(selection)focusSelection();else if(practiceFocus)practiceFocus.focus();else if(focusReturn?.isConnected)focusReturn.focus();else app.querySelector<HTMLElement>('.practice-overview:not([hidden]) .practice-chunks [aria-current=true],.practice-stage,.reader')?.focus();focusReturn=undefined;if(libraryRepaintPending&&!current&&!practice)repaintLibrary();declareState();if(returnParent)back?.();}
function showDialog(html:string,kind='options'){const parentSection=dialog?.dataset.kind==='options'&&kind==='earlier-editions'?optionsSection:undefined,opener=document.activeElement as HTMLElement,openerAction=opener?.dataset.action;closeDialog(false);if(parentSection)dialogBack=()=>{options(parentSection);if(openerAction)dialog?.querySelector<HTMLElement>(`[data-action="${CSS.escape(openerAction)}"]`)?.focus();};focusReturn=document.activeElement as HTMLElement;dialog=document.createElement('dialog');dialog.innerHTML=html;arrangeDialogNavigation(dialog);dialog.dataset.kind=kind;dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog();});document.body.append(dialog);dialog.showModal();fitDialog(dialog,orientation.rotation);resetInput();if(kind!=='options')dialogNavigation=new OptionsNavigation(dialog,()=>{},()=>false,{focusOnPrepare:false});dialog.querySelector<HTMLElement>('input:not([hidden]),button:not([hidden]),select:not([hidden])')?.focus();declareState();return dialog;}
async function edit(seat:Seat,point?:{x:number;y:number}){editSequence.reset();if(!current||(!selection&&labelMode()!=='finger'))return;current.personal.editContactId=seat.contactId;savePersonalQuietly();const value=fingerFor(current.package,current.personal,seat)!;const d=showDialog(`<h2>Finger · bar ${seat.writtenBar}</h2><form class="edit-form"><label>Finger <input aria-label="Finger number" inputmode="numeric" maxlength="1" value="${value??''}" autocomplete="off"></label><button type="submit">Save <kbd>Enter</kbd></button>${button('Cancel','close','Esc')}${button('Restore edition finger','restore-one','',!resolveMemoryInput(memoryInput(current)).byOwner[seat.ownerIds[0]]?.personal)}</form><p class="error" role="alert"></p>`,'edit');if(point){d.style.margin='0';d.style.position='fixed';const box=d.getBoundingClientRect(),cx=Math.max(box.width/2+10,Math.min(innerWidth-box.width/2-10,point.x+box.width/2-30)),cy=Math.max(box.height/2+10,Math.min(innerHeight-box.height/2-10,point.y+box.height/2+16));d.style.left=`${cx-d.offsetWidth/2}px`;d.style.top=`${cy-d.offsetHeight/2}px`;}const field=d.querySelector<HTMLInputElement>('input')!;field.select();let submitting=false;d.querySelector('form')!.addEventListener('submit',async e=>{e.preventDefault();const target=current;if(submitting||!target||dialog!==d)return;submitting=true;try{const replacement=Number(field.value);if(!selection)editNavigation='notes';selection=seat;await saveFingerDigit(replacement);if(dialog===d)closeDialog();if(current===target){renderPages();renderToolbar();}}catch(error){d.querySelector('.error')!.textContent=(error as Error).message;}finally{submitting=false;}});d.querySelector('[data-action=restore-one]')?.addEventListener('click',async()=>{const target=current;if(!target||dialog!==d)return;try{const authoredAt=new Date().toISOString();await acceptMemoryAction(target,editOwners(seat).map(ownerId=>({kind:'calculated',ownerId,decisionId:crypto.randomUUID(),authoredAt})));if(dialog===d)closeDialog();if(current===target){renderPages();renderToolbar();}}catch(error){paintPersonalSaveError(target,error as Error);}});}
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
 const p=current?.package,s=current?.personal,practiceOptions=activePractice?.optionsMarkup();

 let transpose={steps:p?getScoreTransposition(p):0,min:0,max:0,error:undefined as string|undefined};
 if(p&&scoreCapabilities(p).pianoPreparation)try{transpose={...transpose,...scoreTranspositionRange(p)};}catch(error){transpose.error=(error as Error).message;}
 const scoreOptions=current&&p&&s?scoreOptionsMarkup(current.entry,p,s,transpose,job,readingParts.control(entries,current.entry),!activePractice,!activePractice):'';
 const sections:OptionsSection[]=[
  ...(practiceOptions?[{id:'practice',label:'Practice',content:practiceOptions}]:[]),
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
 pianoOptions=new PianoOptionsPanel(d.querySelector('[data-piano-panel]')!,{...nativePiano,previewCue:volume=>{builtInClicks.gain=cueGain(volume);return nativePiano.previewCue(volume);},download:getPiano,preferences:()=>pianoSettings,save:savePiano,cancelKeys:()=>{optionsNavigation?.cancelPicker(false);resetInput();bindingOptions?.cancel();},ownsKeys:()=>!!bindingOptions?.active,fitHelp:help=>fitDialog(help,orientation.rotation),warning:()=>pianoWarning});const pianoMounted=pianoOptions.mount();
 Promise.all([midiMounted,audioMounted,pianoMounted]).then(()=>{if(dialog===d&&!bindingOptions?.active)optionsNavigation?.focusInitial();});
 if(current&&!activePractice)void paintScoreTempo(d,current);
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
  if(!fallback){
   // The score's own tempo when it is confident; otherwise hear it and set it.
   // A score without a meter chooses a duration and rate, as before.
   const known=resolveScoreTempo(target.package.score,{tempo:preferences.scoreTempos?.[target.entry.id]}),beat=meterBeat(target.package.score);
   if(known?.confident)fallback={version:'reference-performance-tempo-v1',bpm:known.bpm,beat:known.beat,provenance:{kind:'editorial',reference:`Score Viewer performance tempo: ${scoreTempoOriginText(known)}`}};
   else if(!beat){fallback=await chooseReference('Practice');if(!live()||!fallback)return;}
   else{const bpm=await hearAndSetTempo(target,{piece:known},'Practice at this tempo',true);if(!live()||bpm===undefined)return;fallback={version:'reference-performance-tempo-v1',bpm,beat,provenance:{kind:'editorial',reference:'Score Viewer performance tempo: set by you'}};}
   if(!live())return;
   const record=manualReferenceRecord(identity,fallback);await enqueue(async()=>{if(live())await writeJson(name,record);});if(!live())return;
  }
 }
 const plan=await planManualPractice(target.package,'bounded-exercises-v1',fallback);if(!live())return;
 const {raw:saved}=await readManualPracticeWithLegacy(plan,readJson);if(!live())return;
 const context=await ManualReadingContext.open(target.package,saved,view,'bounded-exercises-v1',fallback);
 if(!live())return;
 selection=undefined;editNavigation='notes';resetInput();practice?.close();
 const next=new ManualPracticeView(app,{declare:declareState,context,personal:target.personal,work:target.entry.metadata,
  passage:(bars,notation,clip)=>clip?manualPassageClipScene(selectReadingNotation(context.package,notation),bars,clip).svg:manualPassageScene(selectReadingNotation(context.package,notation),bars).svg,
  rotation:()=>orientation.rotation,doneKey:()=>actionControlLabel(effectiveControls(),'done'),settingsKey:()=>actionControlLabel(effectiveControls(),'practiceSettings'),
  workingEditKey:()=>controls.match({kind:'key',key:'KeyS'})?'':'S',freeViewKey:()=>actionControlLabel(effectiveControls(),'practiceFreeView'),navigationKeys:()=>({previous:actionControlLabel(effectiveControls(),'previous'),next:actionControlLabel(effectiveControls(),'next')}),
  audioOutput:()=>preferences.audioOutput??'',save:(record,nextView)=>enqueue(async()=>{
   await writeJson(context.storageName,record);if(!readingViewError)await writeJson(context.viewStorageName,nextView);
   if(current===target&&readingPresentation===controller)controller.adoptView(nextView);
  }),back:()=>{if(practice!==next)return;practice=undefined;controller.adoptView(context.viewRecord());target.package=controller.package;target.personal.view=manualReaderView(controller,target.personal.view);resetInput();render();},
  settings:()=>settings()});
 practice=next;await next.mount(snapshot);

}
/** P asks what to practise. Each kind has its own key; ↑↓ and Enter work too, and Esc closes. */
function practiceMenu(){
 const kinds=[{key:keyLetter(PRACTICE_MENU_KEYS['practice-fingers']),action:'practice-fingers',name:'Fingers',help:'Write your fingering through the whole piece, a measure at a time. No tempo, nothing checked.'},{key:keyLetter(PRACTICE_MENU_KEYS['practice-sections']),action:'practice-sections',name:'Sections at tempo',help:'Play the piece section by section, building up to your tempo. Every note is checked and progress is kept.'}];
 const d=showDialog(`<h2>Practise</h2><div class="practice-menu" role="menu" aria-label="Practise">${kinds.map(k=>`<button type="button" role="menuitem" data-action="${k.action}" data-menu-key="Key${k.key}"><kbd>${k.key}</kbd><span><strong>${k.name}</strong><small>${k.help}</small></span></button>`).join('')}</div><p class="options-nav-hint"><span><kbd>↑↓</kbd> Choose</span><span><kbd>Enter</kbd> Open</span><span><kbd>Esc</kbd> Close</span></p>`,'practice-menu');
 const items=[...d.querySelectorAll<HTMLButtonElement>('.practice-menu button')];items[0]?.focus();
 d.addEventListener('keydown',e=>{if(e.ctrlKey||e.altKey||e.metaKey||e.shiftKey)return;const code=actionCode(e),item=items.find(i=>i.dataset.menuKey===code)??items[Number(/^(?:Digit|Numpad)([1-9])$/.exec(code)?.[1])-1];
  if(item){e.preventDefault();e.stopPropagation();if(!e.repeat)item.click();return;}
  if(code==='ArrowDown'||code==='ArrowUp'){e.preventDefault();e.stopPropagation();const i=items.indexOf(document.activeElement as HTMLButtonElement);items[(i+(code==='ArrowDown'?1:items.length-1))%items.length]?.focus();}});
}
async function startPractice(context?:PracticeViewContext,admitted?:AdmittedPracticeContext,fingers=false){if(!current)return;const fingersOnly=fingers||!!context?.fingersOnly;adviceKey='';adviceRunner.cancel();if(!admitted){await personalMemory.flush();await livePersonalEditors.get(current)?.queue.flush();}if(readingPresentation){await startManualPractice(context);return;}requirePianoCapability(current.package,'pianoPractice');const target=current;
 // A context admitted on other bars (a repeat folded or written out since) is admitted again here.
 const admittedBars=admitted?.plan.barTicks;if(admittedBars&&admittedBars.length!==practiceSource(target).base.score.sourceBarTicks?.length)admitted=undefined;
 // A score without a reference tempo practises toward the player's own tempo,
 // remembered in its practice journal; it is asked for only the first time.
 let tempo:ReferencePerformanceTempo|undefined;
 // An admitted context has already resolved its tempo.
 if(admitted){if(admitted.plan.playerTempo)tempo=admitted.plan.referencePerformanceTempo;}
 // Fingers asks for no tempo: a remembered one, else a stand-in, only lays out the measures.
 else if(fingersOnly){requirePracticeHands(practiceSource(target).base,practiceSource(target).personal);const start=++practiceStartGeneration,prior=practice;tempo=savedPlayerTempo(target.package.score,await PracticeView.savedJournal(target.package,target.entry.id),context?.preferences)??playerTempo(target.package.score,FINGERS_LAYOUT_TEMPO);if(start!==practiceStartGeneration||current!==target||practice!==prior||readingPresentation)return;}
 else if(target.package.score.referencePerformanceTempo===undefined){
  // Refuse what practice cannot plan before asking for a tempo.
  requirePracticeHands(practiceSource(target).base,practiceSource(target).personal);
  const start=++practiceStartGeneration,prior=practice,owns=()=>start===practiceStartGeneration&&current===target&&practice===prior&&!readingPresentation;
  tempo=savedPlayerTempo(target.package.score,await PracticeView.savedJournal(target.package,target.entry.id),context?.preferences);if(!owns())return;
  // No practice tempo yet: the score's own tempo when it is confident, otherwise hear it and set it.
  if(!tempo){const {piece:known}=await scoreTempoFor(target);if(!owns())return;const beat=scoreBeatUnit(target.package.score);
   const bpm=known?.confident?wholeTempoOnBeat(known.bpm,known.beat,beat):await hearAndSetTempo(target,{piece:known},'Practice at this tempo',true);
   if(bpm===undefined||!owns())return;tempo=playerTempo(target.package.score,Math.min(500,Math.max(5,bpm)));}
 }
 selection=undefined;editNavigation='notes';resetInput();const source=practiceSource(target),next=new PracticeView(app,{declare:declareState,playerTempo:tempo,fingersOnly,work:target.entry.metadata,rotation:()=>orientation.rotation,doneKey:()=>actionControlLabel(effectiveControls(),'done'),settingsKey:()=>actionControlLabel(effectiveControls(),'practiceSettings'),workingEditKey:()=>controls.match({kind:'key',key:'KeyS'})?'':'S',freeViewKey:()=>actionControlLabel(effectiveControls(),'practiceFreeView'),modeKeys:()=>({reading:actionControlLabel(effectiveControls(),'practiceReading'),timed:actionControlLabel(effectiveControls(),'practiceTimed')}),...{navigationKeys:()=>{const bindings=effectiveControls();return {previous:actionControlLabel(bindings,'previous'),next:actionControlLabel(bindings,'next')};}},package:source.view,basePackage:source.base,personal:source.personal,...(source.fold?{fold:source.fold}:{}),presentation:()=>currentFingerPresentation(target.package),audioOutput:()=>preferences.audioOutput??'',sustain:()=>musicalSustain.snapshot(),entryId:target.entry.id,connected:()=>!!midiConnection,source:()=>midiConnection?.source??preferences.midi?.source??'',connect:connectMidi,disconnect:disconnectMidi,back:()=>{practice=undefined;selection=undefined;editNavigation='notes';selectionPitchToggle=false;resetInput();render();},saveFinger:(seat,finger)=>{if(!current)return Promise.reject(Error('No open score.'));
   // The editor reads the note before its first await; practice keeps no score selection.
   selection=seat;const saving=saveSelectedChoice({finger},false);selection=undefined;return saving.catch(error=>{if(current&&(personalMemory.error||personalEditor(current).queue.error))paintPersonalSaveError(current,error);throw error;});},saveHand:(seat,hand)=>{if(!current)return Promise.reject(Error('No open score.'));selection=seat;const saving=saveHandChoice(hand);selection=undefined;return saving;},settings:()=>settings()});practice=next;await next.mount(context,admitted);}

/** What a command needs ready before it runs; it waits for it (waitsFor). */
const PRESS_NEEDS:Readonly<Record<string,ReadinessStage>>={edit:'fingers',toggle:'fingers',options:'fingers',practiceSettings:'fingers','restore-all':'fingers','undo-restore':'fingers',practice:'fingers','practice-fingers':'practice','practice-sections':'practice'};
/** A practice step chosen in its menu waits beside the item that took the press. */
const pressPlace=(action:string)=>():ReadinessNoticePlace|undefined=>{const item=dialog?.querySelector<HTMLElement>(`[data-action="${action}"]`);return item?{after:item}:readerNotice();};
async function act(action:string){try{if(!startupReady&&action!=='exit')return;
 // Another command takes the place of one waiting for readiness.
 if(presses.pending!==undefined&&presses.pending!==action)presses.cancel();
 const needs=current&&!practice?PRESS_NEEDS[action]:undefined;if(needs&&waitsFor(action,needs,()=>act(action),pressPlace(action)))return;declareRan(app,action);if(action==='practiceSettings'){options();return;}if(action==='cancel-job'){if(job?.state==='working')job.cancel();return;}if(action==='instrument'&&!current){libraryMenu.beginInstrument();return;}if(action==='share'){if(current)notify(scoreSaveMessage(await shareInstalledScore(current.package,host)));return;}if(action==='pdf'){await savePdf();return;}if(action==='score-tempo'){if(current&&!practice){const target=current,tempos=await scoreTempoFor(target);if(current===target){await hearAndSetTempo(target,tempos,'Keep this tempo');if(current===target&&!dialog&&!practice){options('score');document.querySelector<HTMLElement>('dialog[data-kind=options] [data-action=score-tempo]')?.focus();}}}return;}if(action==='practice'){if(current&&!readingPresentation){requirePianoCapability(current.package,'pianoPractice');practiceMenu();}else await startingPractice(()=>startPractice());return;}if(action==='practice-fingers'||action==='practice-sections'){closeDialog(false);await startingPractice(()=>startPractice(undefined,undefined,action==='practice-fingers'));return;}if(practice&&['library','edit'].includes(action)){if(practice instanceof ManualPracticeView){await practice.flush();await savePersonal();}practice.close();practice=undefined;resetInput();render();}if(action==='settings')practice?.pause();if(action==='import'){await importScore();return;}if(action==='settings'){settings();return;}if(action==='close'){closeDialog();return;}if(action==='exit'){await savePersonal();await practice?.flush();await host.close();return;}if(action==='rotate'){preferences.displayRotation=orientation.turn();await savePreferences();if(practice)practice.refit();else if(current)renderPages();else fitSurface(app.querySelector<HTMLElement>('.surface')!,orientation.rotation);if(dialog)fitDialog(dialog,orientation.rotation);return;}if(practice&&['practiceReading','practiceTimed','practiceFreeView'].includes(action)){if(practice instanceof PracticeView)await practice.action(action==='practiceReading'?'reading':action==='practiceTimed'?'timed':'free-view');else if(action==='practiceFreeView')await practice.action('pause');return;}if(practice&&(action==='next'||action==='previous'||action==='done')){await practice.action(action);return;}if(action==='options'){options();return;}if(!current)return;const {package:p,personal:s}=current,v=s.view;
 if(['toggle','edit','feedback','restore-all','undo-restore','earlier-editions','restore-header'].includes(action))requirePianoCapability(p,'pianoPreparation');
 if(action==='library'){closeReadiness();const closed=current?.entry.id,leaving=current;adviceKey='';adviceRunner.cancel();sourceReturn=undefined;selection=undefined;editNavigation='notes';await savePersonal();closeDialog();const abandoning=!!handWait;leaveHandEditingWait();current=undefined;readingPresentation=undefined;readingViewError=undefined;resetInput();render();if(leaving&&!abandoning)retainScore(leaving);aheadOfTime?.start(libraryOrder(closed));return;}if(action==='restore-header'){await restoreHeader();return;}if(action==='earlier-editions'){await earlierEditions();return;}if(action==='edit'){selectFinger();return;}if(action==='end-edit'){exitSelection();return;}if(action==='hide'){toolbarVisible=false;renderToolbar();app.querySelector<HTMLElement>('.reader')?.focus();return;}if(action==='repeat-keep'){const found=writtenOutRepeat(current.package,current.personal,printedBars(current));if(found)await keepWrittenOut(current,found);paintRepeatNotice();app.querySelector<HTMLElement>('.reader')?.focus();return;}if(action==='repeat-use'){await useFirstPassChoices(current);renderPages();renderToolbar();return;}if(action==='feedback'){await host.exportFeedback(JSON.stringify(feedback(p,s),null,2));return;}
 if(selection&&!practice&&['editorNavigation','editorPrevious','editorNext'].includes(action)){
  if(action==='editorNavigation'){editNavigation=editNavigation==='notes'?'measures':'notes';renderEditorNavigation();}
  else if(editNavigation==='measures')selectFingerMeasure(action==='editorPrevious'?-1:1);else selectFinger(action==='editorPrevious'?-1:1);return;
 }
 if(selection&&!practice&&action==='editorSource'){await visitMemorySource();return;}
 if(selection&&!practice&&['hand-not-here','hand-only-here','hand-shared'].includes(action)){
  // A folded note's passes change together, so the repeat stays folded.
  const target=current,before=target.personal,actions=noteMemoryActions(target.package,target.personal,selection,action as HandChoiceAction);if(!actions.length)return;
  const ownerId=(actions[0] as {ownerId:string}).ownerId,kept=(await acceptMemoryAction(target,actions)).kept;
  const notice=kept?undefined:handActionNotice(target.package,before,target.personal,ownerId,action as HandChoiceAction,printedBars(target));if(notice)notify(notice);return;
 }
 if(selection&&!practice&&['memory-reference','memory-inherit'].includes(action)){const target=current;await acceptMemoryAction(target,noteMemoryActions(target.package,target.personal,selection,action as NoteMemoryCommand));return;}
 if(action==='restore-all'||action==='undo-restore'){if(action==='restore-all'||s.undo||s.undoAssignments||s.undoCalculatedOwners){const target=current,ownerDialog=dialog,ownerSection=optionsSection;await acceptMemoryAction(target,{kind:action==='restore-all'?'restoreAll':'undoRestore',ownerId:p.seats[0].ownerIds[0],decisionId:crypto.randomUUID(),authoredAt:new Date().toISOString()});if(current===target){if(dialog===ownerDialog)options(ownerSection);if(practice)practice.refit();else{renderPages();renderToolbar();}}}return;}
 if((selection||practice)&&['next','previous','count','scale'].includes(action))return;
 if(action==='next'||action==='previous'){const shown=readerPackage();current.personal.view=turnPage(v,action==='next'?1:-1,shown.pages.length,viewportFit(innerWidth,innerHeight,effectiveView(v),shown.pages.length).count);}
 else if(action==='toggle'){if(!fingerDisplayAvailable(p,s,currentFingerPresentation(p))){notify('Choose a finger on a note first.');return;}if(preferences.fingerBehavior==='momentary'){refreshPresentation();return;}if(selection){selectionPitchToggle=!selectionPitchToggle;refreshPresentation();renderToolbar();return;}v.labelMode=v.labelMode==='pitch'?'finger':'pitch';}
 else if(action==='count')v.count=(v.count%3+1) as 1|2|3;else if(action==='scale'){const values=[1,.9,.75,.5] as const;v.scale=values[(values.indexOf(v.scale)+1)%4];}else return;
 if(practice)refreshPresentation();else{renderPages();renderToolbar();savePersonalQuietly();}
 }catch(error){reportFailure(error);}}

app.addEventListener('click',e=>{const el=e.target as HTMLElement;const openEl=el.closest<HTMLElement>('[data-open]');if(openEl){void open(entries.find(q=>q.id===openEl.dataset.open)!).catch(reportFailure);return;}const seatEl=el.closest<HTMLElement>('[data-viewer-seat],[data-finger-seat]');if(seatEl&&current&&!practice){const seat=readerPackage().seats.find(s=>s.id===(seatEl.dataset.viewerSeat??seatEl.dataset.fingerSeat))!,point={x:e.clientX,y:e.clientY};if(presses.pending!==undefined&&presses.pending!=='edit-seat')presses.cancel();if(!waitsFor('edit-seat','fingers',()=>edit(seat,point)))void edit(seat,point);return;}const b=el.closest<HTMLElement>('[data-action]');if(b){if(b.dataset.action==='toggle'&&preferences.fingerBehavior==='momentary'){return;}void act(b.dataset.action!);}});
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
 if(practice instanceof PracticeView&&practice.ownsKeyboard&&!dialog&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&practice.key(uiCode,e.repeat||repeatedDown,e.shiftKey)){e.preventDefault();return;}
 if(practice?.canAdjustWorking&&!dialog&&!inField&&!capture&&readerFocused&&!document.hidden&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.shiftKey){const owner=controls.matchKey(e);if(workingSpeedArrow(uiCode,owner,preferences.freeViewControls)!==undefined){e.preventDefault();practice.key(uiCode,e.repeat||repeatedDown,e.shiftKey);return;}if(uiCode==='KeyS'&&!owner){e.preventDefault();if(!e.repeat&&!repeatedDown)practice.editWorking(inputCode(e));return;}}
 if(practice&&!dialog&&uiCode==='Enter'&&focused.closest('[data-practice=done]')&&(e.repeat||repeatedDown)){e.preventDefault();return;}
 if(practice&&!dialog&&result.action&&result.action!=='toggle'&&!(uiCode==='Enter'&&!activePracticeFooter&&focused.closest('button,a,summary'))&&controlActionAllowed(result.action,{modal:!!practice.modalOpen,selecting:!!selection,practice:true,practicePaused:practice.canTurnPage,practiceDone:practice.canMarkDone,practiceModes:practice instanceof PracticeView&&practice.bindingContext.active,practiceFreeView:practice?.bindingContext.active})){if(result.action==='done'&&app.querySelector('.practice-overview:not([hidden])')){}else{e.preventDefault();void act(result.action);return;}}
 if(practice&&!dialog&&result.action==='toggle'){e.preventDefault();void act('toggle');return;}
 if(e.repeat&&current&&!dialog&&!inField&&!selection&&readerFocused&&!document.hidden&&(!practice||app.dataset.practicePhase==='paused'||practice instanceof ManualPracticeView&&practice.canTurnPage)){const action=controls.match({kind:'key',key:chord(e)})?.action;if((action==='previous'||action==='next')&&controlActionAllowed(action,{modal:!!practice?.modalOpen,selecting:false,practice:!!practice,practicePaused:practice?.canTurnPage})){e.preventDefault();void act(action);return;}}
 if(practice&&!dialog&&!inField&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&(uiCode!=='KeyX'||readerFocused&&!document.hidden&&!e.shiftKey&&!controls.matchKey(e))&&!(practice.canAdjustWorking&&['ArrowLeft','ArrowRight'].includes(uiCode))&&!(e.shiftKey&&inputCode(e)==='KeyV')&&practice.key(uiCode,e.repeat||repeatedDown,e.shiftKey)){e.preventDefault();return;}
 if(e.code==='Escape'&&!e.repeat){e.preventDefault();if(presses.cancel())return;if(dialog)closeDialog();else if(selection)exitSelection();else if(current)void act('library');else void host.fullscreen(false);return;}
 if(dialog)return;
 if(!current&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&inputCode(e)==='KeyI'&&!e.repeat){e.preventDefault();libraryMenu.beginInstrument();return;}
 if(!current&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&libraryMenu.key(actionCode(e),focused)){e.preventDefault();return;}
 const seat=focused.closest?.<HTMLElement>('[data-viewer-seat]');
 if(selection){if(result.action==='practiceSettings'){e.preventDefault();void act(result.action);return;}const inToolbar=!!focused.closest?.('.toolbar');if(result.action==='toggle'){e.preventDefault();void act('toggle');return;}if(!inToolbar&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.shiftKey&&['KeyL','KeyR'].includes(inputCode(e))){e.preventDefault();if(!e.repeat&&!repeatedDown&&readerFocused&&!document.hidden)void saveHandChoice(inputCode(e)==='KeyL'?'LH':'RH').catch(error=>notify(current&&(personalMemory.error||personalEditor(current).queue.error)?`Hand choice is pending: ${error.message}`:error.message));return;}const replacement=directFingerKey(e);if(!inToolbar&&replacement!==undefined){e.preventDefault();if(!e.repeat&&!repeatedDown&&readerFocused&&!document.hidden){void saveFingerDigit(replacement).catch(error=>notify(`Finger was not saved: ${error.message}`));}return;}if(!inToolbar&&result.action&&isEditorAction(result.action)){e.preventDefault();void act(result.action);return;}if(!inToolbar&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&e.code==='Tab'){e.preventDefault();if(!e.repeat&&!repeatedDown&&readerFocused&&!document.hidden)selectFinger(e.shiftKey?-1:1);return;}if(!inToolbar&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.shiftKey&&(e.code==='ArrowUp'||e.code==='ArrowDown')){e.preventDefault();if(!e.repeat&&!repeatedDown&&readerFocused&&!document.hidden)selectFingerSystem(e.code==='ArrowUp'?-1:1);return;}if(!inToolbar&&uiCode==='Enter'){e.preventDefault();if(!e.repeat)void edit(selection);return;}if(inputCode(e)==='KeyH'&&!e.repeat){e.preventDefault();reveal(true);return;}if(inToolbar)return;e.preventDefault();return;}
 if(seat&&current&&uiCode==='Enter'&&!e.repeat){e.preventDefault();void edit(readerPackage().seats.find(s=>s.id===seat.dataset.viewerSeat)!);return;}
 if(result.action){if(result.action==='done'&&uiCode==='Enter'&&!activePracticeFooter&&focused.closest('button,a,summary'))return;e.preventDefault();if(controlActionAllowed(result.action,{modal:!!dialog||!!practice?.modalOpen,selecting:!!selection,practice:!!practice,practicePaused:practice?.canTurnPage,practiceDone:practice?.canMarkDone,practiceModes:practice instanceof PracticeView&&practice.bindingContext.active,practiceFreeView:practice?.bindingContext.active}))void act(result.action);return;}if(e.repeat)return;
 if(e.code==='Tab'&&current&&!toolbarVisible){reveal(true);e.preventDefault();return;}
 if(e.ctrlKey||e.altKey||e.metaKey)return;const commands:Record<string,string>=Object.fromEntries(Object.entries({...READER_COMMAND_KEYS,...(!practice&&app.querySelector('.repeat-written-out')?REPEAT_COMMAND_KEYS:{})}).filter(([action])=>action!=='practice'||!practice).map(([action,key])=>[key,action]));if(inputCode(e)==='KeyH'&&current){e.preventDefault();if(toolbarVisible)void act('hide');else reveal(true);return;}if(commands[inputCode(e)]){e.preventDefault();void act(commands[inputCode(e)]);}});

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
async function saveSelectedChoice(choice:{hand?:PersonalHand;finger?:number},advance:boolean,waitedOwners?:readonly string[]){
 const waitedOwner=waitedOwners?.[0];
 if(!current||!selection&&!waitedOwner)return;
 const chosenScore=current,chosenSeat=selection;
 // The choice belongs to the note it was made on, even if hand editing is not ready yet.
 if(choice.hand&&!waitedOwner&&scoreCapabilities(chosenScore.package).pianoPreparation){
  const wait=handEditingWait(chosenScore);
  if(wait){wait.queue.add({key:chosenSeat!.ownerIds[0],owners:editOwners(chosenSeat!),hand:choice.hand,bar:chosenSeat!.writtenBar});wait.status.queue(wait.queue.list());return;}
 }
 const target=chosenScore,seat=chosenSeat,units=editUnits(readerPackage()),index=seat?units.findIndex(s=>s.contactId===seat.contactId):-1,nextSeat=waitedOwner||!seat?selection:advance?nextInHand(readerPackage(),units,index)??seat:seat;
 const authoredAt=new Date().toISOString(),ownerIds=waitedOwners?.length?[...waitedOwners]:editOwners(seat!);
 if(choice.finger!==undefined&&(!Number.isInteger(choice.finger)||choice.finger<1||choice.finger>5))throw Error('Choose a finger from 1 to 5.');
 const action=(ownerId:string,decisionId=crypto.randomUUID()):PersonalMemoryAction=>choice.hand?{kind:'hand',ownerId,hand:choice.hand,decisionId,authoredAt,...(ownerIds.length>1?{passes:[...ownerIds]}:{})}:{kind:'finger',edit:{ownerId,finger:choice.finger as 1|2|3|4|5,decisionId,authoredAt}};
 if(personalEditor(target).recovering)throw Error('Personal edit recovery is already running.');if(personalEditor(target).queue.error)throw personalEditor(target).queue.error;
 const before=target.personal;
 // A folded note whose passes both carry the player's choice changes in both, so they stay one repeat.
 let receipt=personalMemory.accept(memoryInput(target),action(ownerIds[0]));const saved=[receipt.saved];
 for(const ownerId of ownerIds.slice(1)){receipt=personalMemory.accept({...memoryInput(target),personal:receipt.personal},action(ownerId));saved.push(receipt.saved);}
 receipt={...receipt,saved:Promise.all(saved).then(()=>{})};const next=receipt.personal;
 // A hand change reaching matching bars, or stopping there, is said; a refused one says why instead.
 const said=(shown:Promise<{keptReason?:string}>)=>shown.then(result=>{const notice=choice.hand&&!result.keptReason?handKeyNotice(target.package,before,target.personal,ownerIds[0],!!selection&&ownerIds.some(id=>selection!.ownerIds.includes(id)||editOwners(selection!).includes(id)),printedBars(target)):undefined;if(notice)notify(notice);return result;});
 if(waitedOwner||!nextSeat)return said(presentPersonalChange(target,next,receipt.saved));
 next.editContactId=nextSeat.contactId;
 if(!viewportFit(innerWidth,innerHeight,effectiveView(next.view),readerPackage().pages.length).pages.includes(nextSeat.page))next.view.page=nextSeat.page;
 capturePersonalNavigation(next,readerPackage(),nextSeat,true);
 return said(presentPersonalChange(target,next,receipt.saved,nextSeat));
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
 const session=shownSession(target),check=session.handChoiceCheck();if(!check)return;
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
 const applied:WaitingHandChoice[]=[],kept:WaitingHandChoice[]=[];let keptReason:string|undefined;
 try{
  if(!ready||current!==wait.target){const choices=wait.queue.take();if(choices.length)notify(abandonedChoicesText(choices));return;}
  for(let choice=wait.queue.shift();choice;choice=wait.queue.shift()){
   if(current!==wait.target){const unapplied=[choice,...wait.queue.take()];notify(applied.length||kept.length?waitingOutcomeText({applied,kept,keptReason,unapplied,reason:'the score was closed or changed first'}):abandonedChoicesText(unapplied));return;}
   try{keptReason=(await saveSelectedChoice({hand:choice.hand},false,choice.owners??[choice.key]))?.keptReason??keptReason;}
   catch(error){
    // As with a direct press, a refused or unsaved choice is not counted as applied; the save panel offers its retry.
    const unapplied=[choice,...wait.queue.take()];
    if(current===wait.target&&(personalMemory.error||personalEditor(wait.target).queue.error))paintPersonalSaveError(wait.target,error as Error);
    notify(waitingOutcomeText({applied,kept,keptReason,unapplied,reason:(error as Error).message}));return;
   }
   (handFor(wait.target.package,wait.target.personal,choice.key)===choice.hand?applied:kept).push(choice);
  }
  if(applied.length||kept.length)notify(waitingOutcomeText({applied,kept,keptReason}));
 }finally{if(handWait===wait)handWait=undefined;}
}
/** Leaving the score: its waiting choices are said to be not applied now,
 * rather than when the engraver later stops. */
function leaveHandEditingWait(){
 const wait=handWait;if(!wait)return;
 wait.showing=false;wait.status.close();const choices=wait.queue.take();if(choices.length)notify(abandonedChoicesText(choices));
}
function repaintLibrary(){if(!startupReady||current||practice)return;if(dialog){libraryRepaintPending=true;return;}renderLibrary();}
let startupLoading:LoadingProgress|undefined;

async function boot(){
 try{
  const loading=startupLoading=new LoadingProgress('Starting Score Viewer',['library','settings','fingerings','input']);
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
  try{const loaded=loadPianoPreferences(preferences.piano);pianoSettings=loaded.preferences;
   // PIANO VOLUME MIGRATION: written back once, over the file as read, so no other setting changes.
   if(loaded.migrated&&saved){preferences.piano=pianoSettings;await enqueue(()=>writeJson('preferences.json',{...saved,piano:pianoSettings})).catch(()=>{});}
  }catch(error){pianoSettings=defaultPianoPreferences();pianoWarning=(error as Error).message;}builtInClicks.gain=cueGain(cueVolume(pianoSettings));
  preferences.fingeringAdvice=readFingeringAdviceSettings(preferences.fingeringAdvice);
  // Kept written-out repeats only hide a notice: an unreadable list is forgotten, never fatal.
  if(preferences.writtenOutRepeats!==undefined)preferences.writtenOutRepeats=Array.isArray(preferences.writtenOutRepeats)?preferences.writtenOutRepeats.filter((k:unknown):k is string=>typeof k==='string').slice(-KEPT_WRITTEN_OUT):undefined;
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
  if(pianoSettings.enabled)loading.step('sound');await paintCheckpoint();
  const requestedPiano=pianoSettings.enabled;
  try{const audio=await configurePiano();if(requestedPiano&&(!audio?.enabled||!audio.ready||audio.error))pianoWarning=`Piano sound is off: ${audio?.error??'The saved sound configuration is unavailable. Review Piano sound in Options.'}`;}catch(error){pianoWarning=`Piano sound is off: ${(error as Error).message}`;}
  startupReady=true;loading.stop();startupLoading=undefined;resetInput();app.classList.remove('viewer-startup');render();aheadOfTime?.start(libraryOrder());
  if(pianoWarning||startupNotice)notify([pianoWarning,startupNotice].filter(Boolean).join(' '));
 }catch(error){
  startupFailed=true;app.classList.add('viewer-startup');
  if(startupLoading&&app.querySelector('.viewer-loading')){const message=(error as Error).message.trim();startupLoading.setTitle('The library could not open');startupLoading.fail(`${/[.!?]$/.test(message)?message:`${message}.`} Your saved files are kept as they were.`,button('Close Viewer','exit'));}
  else app.innerHTML=`<section class="viewer-loading" data-loading-state="failed"><h2 class="viewer-loading-title">The library could not open</h2><p class="viewer-loading-message" role="alert">${esc((error as Error).message)} Your saved files are kept as they were.</p><div class="viewer-loading-footer">${button('Close Viewer','exit')}</div></section>`;
  startupLoading=undefined;
 }
}
void boot();
