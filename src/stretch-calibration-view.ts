import {STRETCH_CALIBRATION_GRADES,type StretchCalibrationSession,type StretchCalibrationContact,type RelativeFingertipReachObservation,type PairStretchObservation,type StretchCalibrationEntry,type StretchGrade} from '@hypermemetic-ai/fingering-calculator';
import {arrangeBottomNavigation} from './application-navigation';
import {OptionsNavigation} from './options-navigation';
import {actionCode} from './input';
import {CalibrationReviewBrowser,type CalibrationReviewRow} from './calibration-review-browser';
import {calibrationEscape as esc} from './calibration-trial-renderer';
import {effectiveEntries,effectivePairReports,recommendedSpanSteps,relativeDifferenceMm,usesSupersededFingertipWindow,stretchProgress,tripleApplicability,latestSlotOutcome,stretchSlotStatus,type StretchPhase} from './stretch-calibration';
import type {StretchController} from './stretch-calibration-controller';
import {surfaceContact} from './stretch-calibration-geometry';
import {stretchFingertipMapping,encodeStretchFingertipPercentages,decodeStretchFingertipPercentages,stretchFingertipDifferenceMm} from './stretch-fingertip-landmarks';
import {createDefaultStretchSetup,isNominalStretchSetup} from './stretch-calibration-setup';
import {mountStretchKeyboard,type StretchKeyboardScene} from './stretch-keyboard-view';
import './stretch-calibration-style.css';
import './stretch-keyboard-style.css';

type Hand='LH'|'RH';
type Colors='five-seven'|'classic';
type Page='home'|'create'|'work'|'review'|'detail'|'options';
type ReviewTarget={phase:StretchPhase;slotId:string;trialId?:string};
export interface StretchCalibrationViewOptions {
 instrument?:'janko-four-row'|'conventional';playerId:string;
 colors?:()=>Colors;saveColors?:(choice:Colors)=>Promise<void>;
 onClose:()=>void;onExport?:(json:string,filename:string)=>Promise<void>;onExportBytes?:(bytes:Uint8Array,filename:string)=>Promise<void>;onExportAll?:()=>Promise<void>;
 openCurl?:(session:StretchCalibrationSession,back:()=>void)=>Promise<void>|void;
}
const fingers=['','Thumb','Index','Middle','Ring','Pinky'];
const phaseLabel:Record<StretchPhase,string>={'relative-fingertip-reach':'Fingertip readings','progressive-pairs':'Pair sweeps','conditional-triples':'Conditional triples'};
const gradeDescriptions=['Relaxed, or too little stretch to distinguish.','A small, noticeable stretch.','Clearly stretched, with room remaining.','Approaching the usable limit.','Reachable, with no useful margin.','Cannot reach this displayed contact.'];
const command=(name:string,label:string,key?:string,disabled=false)=>`<button type="button" data-stretch-command="${esc(name)}"${['start-right','save-reach','begin-pair','reproduce'].includes(name)?' data-primary-action':''}${disabled?' disabled':''}>${label}${key?` <kbd>${esc(key)}</kbd>`:''}</button>`;
const list=(points:string[])=>`<ul class="stretch-instructions">${points.map(p=>`<li>${p}</li>`).join('')}</ul>`;
const number=(value:string)=>value.trim()===''?null:Number.isFinite(Number(value))?Number(value):null;
export const stretchPitchLabel=(pitch:number)=>`${'0123456789AB'[pitch%12]}${Math.floor(pitch/12)-1}`;
export const stretchStepsLabel=(steps:number)=>steps.toString(12).toUpperCase();
const pairLabel=(pair:readonly number[])=>pair.map(f=>fingers[f]).join(' + ');
const contactLabel=(contact:StretchCalibrationContact)=>`${fingers[contact.finger]}: ${stretchPitchLabel(contact.midiPitch)}, row ${contact.row}`;
const sameSlot=(entry:StretchCalibrationEntry,target:ReviewTarget,session:StretchCalibrationSession):boolean=>'slotId'in entry?entry.slotId===target.slotId:'sweepId'in entry?entry.sweepId===target.slotId:entry.kind==='retraction'&&session.entries.some(e=>e.id===entry.entryId&&sameSlot(e,target,session));
const coverageLabel=(session:StretchCalibrationSession)=>isNominalStretchSetup(session.plan)?'Test window edge':'Keyboard edge';
const terminalLabel=(reason:string,session?:StretchCalibrationSession)=>reason==='coverage-edge'&&session?coverageLabel(session):({'maximum-reachable':'Maximum marked','first-unavailable':'First unavailable','operator-stop':'Stopped by player','coverage-edge':'Keyboard edge'} as Record<string,string>)[reason]??reason;
const omissionLabel=(reason:string)=>({'operator-skip':'Skipped','no-rated-anchor':'No grade-3 anchor','outside-collection-window':'Outside keyboard range','basis-withdrawn':'Source withdrawn'} as Record<string,string>)[reason]??reason;

/** Each slot stays visible, including unknown, omitted and dependent evidence. */
export function stretchReviewRows(session:StretchCalibrationSession):{rows:CalibrationReviewRow[];targets:Map<string,ReviewTarget>} {
 const rows:CalibrationReviewRow[]=[],targets=new Map<string,ReviewTarget>();
 const add=(id:string,target:ReviewTarget,label:string,detail:string,rating:string)=>{targets.set(id,target);rows.push({id,groupId:target.phase,groupLabel:phaseLabel[target.phase],label,detail,rating});};
 for(const slot of session.plan.relativeReachSlots){
  const outcome=latestSlotOutcome(session,'relative-fingertip-reach',slot.id),reading=outcome?.kind==='relative-fingertip-reach'?outcome:undefined;
  const value=reading?relativeDifferenceMm(session,...slot.pair):null;
  add(slot.id,{phase:'relative-fingertip-reach',slotId:slot.id},pairLabel(slot.pair),reading&&usesSupersededFingertipWindow(reading.reading)?'Earlier terrace landmarks · recheck':reading?.reading.kind==='window-fractions'?'Percentage · physical key window':reading?'Direct millimeters':'Straight, flat fingers',outcome?.kind==='omission'?omissionLabel(outcome.reason):reading?value===null?'Unmapped':`${value.toFixed(1)} mm`:'Unmeasured');
 }
 for(const sweep of session.plan.pairSweeps){
  const outcome=latestSlotOutcome(session,'progressive-pairs',sweep.id),status=stretchSlotStatus(session,'progressive-pairs',sweep.id),reports=effectivePairReports(session).filter(e=>e.sweepId===sweep.id);
  add(sweep.id,{phase:'progressive-pairs',slotId:sweep.id},pairLabel(sweep.pair),`${reports.length} current ${reports.length===1?'judgment':'judgments'}`,outcome?.kind==='omission'?omissionLabel(outcome.reason):status==='needs-review'?'Needs review':outcome?.kind==='pair-sweep-terminal'?terminalLabel(outcome.reason,session):reports.length?'In progress':'Unmeasured');
 }
 for(const slot of session.plan.tripleSlots){
  const outcome=latestSlotOutcome(session,'conditional-triples',slot.id),report=outcome&&(outcome.kind==='conditional-triple-boundary'||outcome.kind==='conditional-triple-unavailable')?outcome:undefined;
  const applicability=report?tripleApplicability(session,report):'current';
  add(slot.id,{phase:'conditional-triples',slotId:slot.id},pairLabel(slot.triple),applicability==='current'?'Fixed grade-3 pair + outward third finger':`${applicability==='basis-revised'?'Source rating revised':'Source rating withdrawn'} · needs review`,outcome?.kind==='omission'?omissionLabel(outcome.reason):report?.kind==='conditional-triple-boundary'?report.termination==='coverage-edge'?coverageLabel(session):'Usable limit':report?.kind==='conditional-triple-unavailable'?'No usable contact':'Unmeasured');
 }
 return {rows,targets};
}

/** New static collection; historical protocols and their wire files remain host-owned. */
export function mountStretchCalibrationView(dialog:HTMLElement,controller:StretchController,options:StretchCalibrationViewOptions){
 let page:Page='home',returnPage:Page='home',stopped=false,suspended=false,creating=false,pairNavigating=false,navigationGeneration=0,notice='',navigation:OptionsNavigation|undefined;
 let focusKey='',lastSlot='',reachMethod:'percentage'|'mm'='percentage',primary=1,primaryPercentage='100',percentage='',millimeters='',sourceId='',thirdSurfaceId='';
 let pendingAttempts:StretchCalibrationContact[]=[],detailTarget:ReviewTarget|undefined,reviewRows:CalibrationReviewRow[]=[],reviewTargets=new Map<string,ReviewTarget>();
 const browser=new CalibrationReviewBrowser(),heldActivations=new Set<string>(),heldPairNavigation=new Set<string>(),pairCursors=new Map<string,string|null>();
 let keyboard:ReturnType<typeof mountStretchKeyboard>|undefined,visibleTrialId:string|null=null,baselinePreviewReady=false,renderRecovery=false;
 type ReachDraft={method:'percentage'|'mm';primary:number;primaryPercentage:string;percentage:string;millimeters:string};
 const reachDrafts=new Map<string,ReachDraft>(),reachPreferences=new Map<string,{method:'percentage'|'mm';primary:number}>();
 const art=dialog.ownerDocument.createElement('div');art.className='stretch-art';
 dialog.classList.add('stretch-calibration');
 dialog.innerHTML='<header class="stretch-header"></header><main class="stretch-body"></main><footer class="stretch-footer"></footer>';
 const header=dialog.querySelector<HTMLElement>('header')!,body=dialog.querySelector<HTMLElement>('main')!,footer=dialog.querySelector<HTMLElement>('footer')!;
 const field=(label:string,contents:string)=>`<label class="stretch-field" data-options-row><span>${label}</span>${contents}</label>`;
 const busy=()=>controller.state.busy||controller.state.readOnly||creating||pairNavigating;
 const pairIllustrationVisible=()=>!!keyboard?.ready&&visibleTrialId===controller.state.current.trial?.id&&art.isConnected&&!art.hidden&&!art.closest('[hidden]')&&art.getClientRects().length>0;
 const controlKey=(el:HTMLElement|null)=>el?.dataset.optionsKey??el?.dataset.stretchCommand??el?.dataset.grade??el?.id??'';
 function transition(next:Page){navigationGeneration++;controller.break();page=next;notice='';render();}
 function back(){if(page==='home')options.onClose();else if(page==='options')transition(returnPage);else if(page==='detail')transition('review');else transition('home');}
 function openOptions(){returnPage=page;transition('options');}
 async function perform(action:()=>Promise<unknown>|unknown){try{await action();}catch(error){notice=error instanceof Error?error.message:String(error);}render();}
 function scene(scene:StretchKeyboardScene){const holder=body.querySelector<HTMLElement>('[data-stretch-art]');if(!holder)return;holder.append(art);if(keyboard)keyboard.update(scene,{colors:options.colors?.()??'five-seven'});else keyboard=mountStretchKeyboard(art,scene,{colors:options.colors?.()??'five-seven',onKeyboardRotationExit:()=>{focusKey='';safeFocus();}});if(!keyboard.ready)throw Error(keyboard.error??'The keyboard illustration could not be displayed.');}
 function windowFor(session:StretchCalibrationSession){
  const slot=controller.state.current.relativeSlot;
  return slot?stretchFingertipMapping(session.plan.geometry,session.plan.provenance.hand,slot.pair):null;
 }
 function reachScene(session:StretchCalibrationSession,mapping:NonNullable<ReturnType<typeof windowFor>>,first:number|null,second:number|null):StretchKeyboardScene {
  const pair=controller.state.current.relativeSlot!.pair,windows=[mapping.first,mapping.second];
  return {geometry:session.plan.geometry,contacts:windows.map((window,i)=>surfaceContact(session.plan.geometry,pair[i],window.surface.id,'resting-contact')),windows:reachMethod==='mm'?[]:windows.map((window,i)=>({surfaceId:window.surface.id,axisStartMm:window.axisStartMm,axisEndMm:window.axisEndMm,...((i?second:first)!==null?{fraction:(i?second:first)!/100}:{}),label:fingers[pair[i]]}))};
 }
 function readingDifference(session:StretchCalibrationSession):number|null {
  const slot=controller.state.current.relativeSlot;if(!slot)return null;
  const sign=primary===slot.pair[0]?1:-1,value=number(millimeters);
  if(reachMethod==='mm')return value===null?null:value*sign;
  const mapping=windowFor(session),a=number(primaryPercentage),b=number(percentage);
  return mapping&&a!==null&&b!==null?stretchFingertipDifferenceMm(mapping,sign===1?a:b,sign===1?b:a):null;
 }
 function currentSources(){const sources=controller.tripleSources();const session=controller.state.session;return [...sources].sort((a,b)=>(session?.pairTrials.find(t=>t.id===b.trialId)?.distanceSemitoneSteps??0)-(session?.pairTrials.find(t=>t.id===a.trialId)?.distanceSemitoneSteps??0));}
 function selectedSource(){const sources=currentSources();return sources.find(s=>s.id===sourceId)??sources[0];}
 function thirdCandidates(session:StretchCalibrationSession,source:PairStretchObservation){
  const slot=controller.state.current.tripleSlot;if(!slot||source.grade===5)return [];
  const outer=source.realization.contacts[1].midiPitch,dir=session.plan.provenance.hand==='RH'?1:-1;
  return session.plan.geometry.surfaces.filter(s=>slot.searchSurfaceIds.includes(s.id)&&(s.midiPitch-outer)*dir>0).sort((a,b)=>(a.midiPitch-b.midiPitch)*dir||a.row-b.row);
 }
 function selectedThird(session:StretchCalibrationSession,source:PairStretchObservation){const candidates=thirdCandidates(session,source);return candidates.find(s=>s.id===thirdSurfaceId)??candidates[0];}
 function currentThirdContact(){const session=controller.state.session,source=selectedSource(),slot=controller.state.current.tripleSlot;if(!session||!source||!slot)return;const surface=selectedThird(session,source);return surface?surfaceContact(session.plan.geometry,slot.movingFinger,surface.id,'depressed'):undefined;}
 function safeFocus(){if(keyboard?.keyboardRotation&&!art.hidden){keyboard.focusCanvas();return;}const confirmation=footer.querySelector<HTMLElement>('[data-stretch-command=reproduce]:not(:disabled),[data-stretch-command=begin-pair]:not(:disabled)');if(confirmation){confirmation.focus({preventScroll:true});return;}const controls=[...dialog.querySelectorAll<HTMLElement>('button,input,select,textarea')].filter(el=>!el.closest('[hidden]')&&!(el as HTMLButtonElement).disabled&&el.tabIndex>=0);const target=(focusKey?controls.find(el=>controlKey(el)===focusKey):undefined)??dialog.querySelector<HTMLElement>('[data-primary-action]:not(:disabled)')??controls[0];target?.focus({preventScroll:true});}
 function render(){
  if(stopped||suspended||renderRecovery)return;visibleTrialId=null;baselinePreviewReady=false;
  try{renderContent();}
  catch(error){renderRecovery=true;try{navigation?.dispose();navigation=undefined;notice=`The calibration illustration could not be displayed: ${error instanceof Error?error.message:String(error)}. Reopen the test before rating.`;for(const button of dialog.querySelectorAll<HTMLButtonElement>('[data-grade],[data-stretch-command=begin-pair],[data-stretch-command=reproduce],[data-stretch-command=save-reach],[data-stretch-command=triple-limit],[data-stretch-command=triple-edge],[data-stretch-command=triple-unavailable]'))button.disabled=true;const p=dialog.ownerDocument.createElement('p');p.className='stretch-notice';p.setAttribute('role','alert');p.textContent=notice;body.append(p);controller.break();}finally{renderRecovery=false;}}
 }
 function renderContent(){
  if(stopped||suspended)return;
  const active=dialog.ownerDocument.activeElement as HTMLElement|null;
  if(active&&dialog.contains(active)){focusKey=controlKey(active)||focusKey;if(active.matches('input,textarea'))rememberInput(active as HTMLInputElement);}
  const oldReview=body.querySelector<HTMLElement>('.stretch-review-browser');if(oldReview)browser.capture(oldReview);
  navigation?.dispose();navigation=undefined;
  if(art.parentNode)dialog.append(art);art.hidden=true;
  const state=controller.state,session=state.session,current=state.current,progress=session?stretchProgress(session):null;
  const slotKey=session&&current.slotId?`${session.id}:${current.slotId}`:'';
  if(slotKey!==lastSlot){rememberReachDraft();lastSlot=slotKey;initializeReachDraft(session);sourceId='';thirdSurfaceId='';pendingAttempts=[];focusKey='';}
  dialog.dataset.stretchPage=page;dialog.dataset.stretchPhase=page==='work'?(current.phase??''):'';const disabled=busy();
  header.innerHTML=`<h2>${page==='home'?'Calibration':page==='create'?'New hand collection':page==='options'?'Options':page==='review'?'Review calibration':page==='detail'?'Recorded evidence':current.phase?phaseLabel[current.phase]:'Calibration'}</h2>${session&&page!=='create'&&page!=='home'?`<span class="stretch-header-detail">${session.plan.provenance.hand==='LH'?'Left':'Right'} hand${current.phase==='progressive-pairs'?'':` · ${isNominalStretchSetup(session.plan)?'Test window ':''}${stretchPitchLabel(session.plan.geometry.admittedMidiRange[0])}–${stretchPitchLabel(session.plan.geometry.admittedMidiRange[1])}`}</span>`:''}`;
  body.innerHTML='';
  if(options.instrument==='conventional'&&page==='home'){
   body.innerHTML=`<div class="stretch-home"><p>The new calibration uses the Jankó keyboard model.</p><p class="stretch-help">Choose Jankó in instrument setup to start a collection. Previous calibration evidence remains available.</p><div class="stretch-menu">${command('export','Export collection','E',!session&&!state.readOnly)}${options.onExportAll?command('export-all','Export all evidence'):''}</div></div>`;
  }else if(page==='home'){
   const sessions=state.archive.sessions,choices=sessions.map((s,i)=>`<option value="${esc(s.id)}"${s.id===session?.id?' selected':''}>${s.plan.provenance.hand==='LH'?'Left':'Right'} hand${isNominalStretchSetup(s.plan)?'':` · ${esc(s.plan.provenance.seatingReference)}`}${sessions.filter(v=>v.plan.provenance.hand===s.plan.provenance.hand).length>1?` · collection ${i+1}`:''}</option>`).join('');
   body.innerHTML=`<div class="stretch-home">${sessions.length?field('Collection',`<select id="stretch-collection" aria-label="Hand collection" data-stretch-collection>${choices}</select>`):'<p>Collect your comfortable reach and static stretch, one hand at a time.</p>'}<div class="stretch-home-progress"><p><span>Fingertip readings</span><strong>${progress?.readings.completed??0} / 4</strong></p><p><span>Pair sweeps</span><strong>${progress?.sweeps.completed??0} / 10</strong></p><p><span>Conditional triples</span><strong>${progress?.triples.completed??0} / 10</strong></p></div><p class="stretch-home-count">${progress?.judgments??0} actual pair judgments${progress&&(progress.readings.omitted+progress.sweeps.omitted+progress.triples.omitted)?` · ${progress.readings.omitted+progress.sweeps.omitted+progress.triples.omitted} omitted slots`:''}${progress?.sweeps.needsReview?` · ${progress.sweeps.needsReview} pair sweeps need review`:''}${progress?.triples.needsReview?` · ${progress.triples.needsReview} triples need review`:''}</p><nav class="stretch-menu" aria-label="Calibration">${command('continue',progress?.complete?'Review collection':'Continue',undefined,!session||disabled)}${command('new','New hand collection','N',disabled)}${command('review','Review and correct','R',!session)}${command('export','Export collection','E',!session&&!state.readOnly)}${options.onExportAll?command('export-all','Export all evidence'):''}</nav>${state.readOnly?'<p class="stretch-help">Saved calibration could not be admitted. The original file is retained; collection is unavailable until it can be reviewed.</p>':''}</div>`;
  }else if(page==='create')renderCreate();
  else if(page==='options'){
   body.innerHTML=`<div class="stretch-options">${field('Key colors',`<select id="stretch-key-colors" aria-label="Key colors" data-stretch-colors><option value="five-seven"${(options.colors?.()??'five-seven')==='five-seven'?' selected':''}>0–4 black, 5–B white</option><option value="classic"${options.colors?.()==='classic'?' selected':''}>Traditional black and white</option></select>`)}<p class="stretch-help">Match the physical colors of your keyboard.</p><div class="stretch-menu">${options.openCurl?command('curl','Optional curl refinement',undefined,!session||disabled):''}</div><p class="stretch-help">Curl refinement stores optional ruler readings separately from this collection.</p></div>`;
  }else if(page==='review'&&session){
   ({rows:reviewRows,targets:reviewTargets}=stretchReviewRows(session));body.innerHTML='<p class="stretch-help">Choose a phase, then a reading or finger group. Original reports remain in the history when corrected.</p><div class="practice-browser stretch-review-browser"></div>';browser.render(body.querySelector<HTMLElement>('.stretch-review-browser')!,reviewRows,disabled);
  }else if(page==='detail'&&session&&detailTarget)renderDetail(session,detailTarget);
  else if(page==='work'&&session){
   if(!current.phase)body.innerHTML='<p class="stretch-completion">Collection complete. Review the recorded evidence or export it.</p>';
   else if(current.phase==='relative-fingertip-reach')renderReach(session);
   else if(current.phase==='progressive-pairs')renderPair(session);
   else renderTriple(session);
  }else body.innerHTML='<p class="stretch-help">Choose or create a hand collection to continue.</p>';
  const work=current.phase&&page==='work',resume=work&&(state.resumeRequired||current.needsSetup)&&current.phase==='conditional-triples';
  footer.innerHTML=`${command('back','Back','Esc')}${page==='create'?'<p><kbd>↑↓</kbd> Select · <kbd>Enter</kbd> Begin</p>':page==='home'||page==='review'||page==='options'?'<p><kbd>↑↓</kbd> Select · <kbd>Enter</kbd> Open</p>':''}${resume?command('reproduce','I have reproduced the contacts','Enter',disabled):''}${page==='work'&&current.phase==='relative-fingertip-reach'&&!resume?command('save-reach','Save reading','Enter',disabled):''}${page==='work'&&current.phase==='progressive-pairs'&&current.needsSetup?command('begin-pair','Rate this contact','Enter',disabled||!baselinePreviewReady):''}${page==='work'&&!current.phase?command('review','Review collection'):''}${work&&current.phase!=='progressive-pairs'?command('skip','Skip this slot',undefined,disabled):''}${work&&current.phase==='progressive-pairs'&&session?pairFooter(session):''}${page==='detail'?command('edit','Recheck or replace',undefined,disabled):''}${page==='options'?'':command('options','Options','O')}`;
  arrangeBottomNavigation(footer,footer.querySelector<HTMLButtonElement>('[data-stretch-command=back]'),footer.querySelector<HTMLButtonElement>('[data-stretch-command=options]'));
  footer.dataset.optionsRow='';
  const error=notice||state.error;if(error){const p=dialog.ownerDocument.createElement('p');p.className='stretch-notice';p.setAttribute('role','alert');p.textContent=error;body.append(p);}
  navigation=new OptionsNavigation(dialog,el=>{focusKey=controlKey(el??null)||focusKey;},()=>false,{focusOnPrepare:false,horizontal:page==='home'||page==='create'});
  if(!state.busy&&!creating&&!pairNavigating){if(page==='review'&&reviewRows.length&&!disabled)browser.focus(body.querySelector<HTMLElement>('.stretch-review-browser')!);else safeFocus();}
 }
 function renderCreate(){
  body.innerHTML=`<div class="stretch-home"><p>Choose the hand to measure.</p><nav class="stretch-menu stretch-hand-choices" aria-label="Hand to measure">${command('start-right','Right hand','R',busy())}${command('start-left','Left hand','L',busy())}</nav></div>`;
 }
 function renderReach(session:StretchCalibrationSession){
  const slot=controller.state.current.relativeSlot;if(!slot)return;
  const mapping=windowFor(session),pair=slot.pair,secondary=pair.find(f=>f!==primary)??pair[1],value=readingDifference(session);
  const placement=mapping?[mapping.first,mapping.second].map((window,i)=>`${fingers[pair[i]]} on ${'0123456789AB'[window.surface.midiPitch%12]}’s ${window.surface.row===1?'lowest':'lower main'} level`).join('; ')+'.':'';
  const points=['Keep both fingers straight and flat, pointing along the keys.',`${placement} Slide your hand forward until ${fingers[primary].toLowerCase()} reaches its rear wall.`,reachMethod==='percentage'?'Read each tip in its outlined gap: 0% lines up with the neighboring keys’ next level; 100% is the wall at the back of its own gap.':'Measure how far the other fingertip extends beyond the primary fingertip, in millimeters.'];
  body.innerHTML=`<div class="stretch-prompt"><div data-stretch-art></div>${list(points)}</div><div class="stretch-reading"><div class="stretch-methods" data-options-row>${command('percentage','Percentage',undefined,busy())}${command('mm','Direct millimeters',undefined,busy())}</div>${field('Primary finger',pair[0]===1?'<span>Index</span>':`<select id="stretch-primary" data-stretch-primary aria-label="Primary finger">${pair.map(f=>`<option value="${f}"${f===primary?' selected':''}>${fingers[f]}</option>`).join('')}</select>`)}${reachMethod==='percentage'?`<div class="stretch-reading-fields">${field(`${fingers[primary]} tip (%)`,`<input id="stretch-primary-percent" data-stretch-primary-percent type="number" step="any" value="${esc(primaryPercentage)}" aria-label="${fingers[primary]} fingertip percentage">`)}${field(`${fingers[secondary]} tip (%)`,`<input id="stretch-percent" data-stretch-percent data-primary-action type="number" step="any" value="${esc(percentage)}" aria-label="${fingers[secondary]} fingertip percentage">`)}</div><p class="stretch-help">Keep the same hand position for both readings. A negative percentage means the tip falls before its 0% line.</p>`:field(`${fingers[secondary]} beyond ${fingers[primary]} (mm)`,`<input id="stretch-mm" data-stretch-mm data-primary-action type="number" step="any" value="${esc(millimeters)}" aria-label="Signed forward reach difference in millimeters">`)}<p class="stretch-reading-output" data-stretch-reading-output>${value===null?'Enter a reading to see its signed reach difference.':`${value.toFixed(1)} mm · ${fingers[pair[1]]} minus ${fingers[pair[0]]}`}</p></div>`;
  body.querySelector(`[data-stretch-command=${reachMethod}]`)?.setAttribute('aria-pressed','true');
  if(mapping){
   const a=number(primaryPercentage),b=number(percentage),first=primary===pair[0]?a:b,second=primary===pair[0]?b:a;
   scene(reachScene(session,mapping,first,second));art.hidden=false;
  }
 }
 function renderPair(session:StretchCalibrationSession){
  const state=controller.state,{trial,pairSweep:sweep,needsSetup}=state.current;if(!sweep)return;
  const reports=effectivePairReports(session).filter(e=>e.sweepId===sweep.id),canAdjust=!session.entries.some(e=>e.kind==='pair-stretch'&&e.sweepId===sweep.id&&e.grade<5);
  pairCursors.set(`${session.id}:${sweep.id}`,trial?.id??null);
  const old=trial??session.pairTrials.find(t=>t.sweepId===sweep.id),firstReport=session.entries.find(e=>e.kind==='pair-stretch'&&e.grade<5),inherited=firstReport?.kind==='pair-stretch'?session.pairTrials.find(t=>t.id===firstReport.trialId):session.pairTrials[0];
  const row=old?.contacts[0].row??inherited?.contacts[0].row??1,span=trial?.distanceSemitoneSteps??recommendedSpanSteps(session,sweep.pair),desired=session.plan.geometry.originMidiPitch+session.plan.provenance.referenceLocation.xMm/13.75;
  const reference=[...session.plan.geometry.surfaces].filter(s=>s.row===row).sort((a,b)=>Math.abs(a.midiPitch-desired)-Math.abs(b.midiPitch-desired))[0]?.midiPitch;
  const anchor=old?.contacts[0].midiPitch??(inherited?.contacts[0].row===row?inherited.contacts[0].midiPitch:reference),outer=Number(anchor)+(session.plan.provenance.hand==='RH'?span:-span);
  const previewSurfaces=sweep.pair.map((_,i)=>session.plan.geometry.surfaces.find(s=>s.midiPitch===(i?outer:anchor)&&s.row===row));
  const previewContacts=trial?.contacts??(previewSurfaces.every(Boolean)?sweep.pair.map((f,i)=>surfaceContact(session.plan.geometry,f,previewSurfaces[i]!.id,'depressed')):[]);
  body.innerHTML=`<div class="stretch-prompt"><div data-stretch-art></div>${list(['Keep both fingers flat. Rotate and reposition your hand freely to line the fingertips up parallel to the keyboard.','Depress both highlighted keys wherever most comfortable on the playable areas.','Make static contact and rate the stretch.'])}</div>${needsSetup||state.resumeRequired?`<div class="stretch-baseline"><p>${canAdjust&&reports.length?'That contact was recorded as unavailable. Choose another contact to test.':reports.length?'Reproduce these same key contacts before rating.':'Start with the suggested contact.'}</p><p class="stretch-help">${canAdjust?'If the contact is too close or unavailable, adjust the separation. Untested contacts stay unmeasured.':'Keep the same fingertip spots you used for this contact.'}</p>${canAdjust?`<div class="stretch-baseline-fields" data-options-row>${command('narrower','Narrower','−',busy()||span<=2)}${command('wider','Wider','+',busy())}</div>`:''}</div>`:`<h3 class="stretch-question">How much stretch does that take?</h3><div class="stretch-ratings" data-options-row>${STRETCH_CALIBRATION_GRADES.map(g=>`<button type="button" data-grade="${g.grade}"${g.grade===0?' data-primary-action':''} data-trial-id="${esc(trial?.id??'')}"${busy()?' disabled':''}><kbd>${g.grade}</kbd><span>${esc(g.label)}</span><small>${gradeDescriptions[g.grade]}</small></button>`).join('')}</div>`}`;
  scene({geometry:session.plan.geometry,contacts:previewContacts});art.hidden=false;baselinePreviewReady=previewContacts.length===2&&!!keyboard?.ready;if(trial&&keyboard?.ready)visibleTrialId=trial.id;
 }
 function pairFooter(session:StretchCalibrationSession){
  const current=controller.state.current,index=session.plan.pairSweeps.findIndex(s=>s.id===current.slotId),reports=effectivePairReports(session).filter(e=>e.sweepId===current.slotId),reachable=reports.some(e=>e.grade<5);
  return `<div class="stretch-pair-navigation" data-options-row>${command('previous-pair','Previous pair','←',busy()||index<=0)}<span class="stretch-pair-position">${index+1} / 10</span>${command('next-pair','Next pair','→',busy()||index>=session.plan.pairSweeps.length-1)}</div>${!current.needsSetup&&!controller.state.resumeRequired?`<div class="stretch-pair-actions" data-options-row>${command('maximum','Mark my maximum',undefined,busy()||!reachable)}${command('stop-sweep','Stop this sweep',undefined,busy())}</div>`:''}`;
 }
 async function movePair(delta:number){
  if(stopped||suspended||page!=='work'||pairNavigating||busy())return;
  const state=controller.state,session=state.session,current=state.current;if(!session||current.phase!=='progressive-pairs')return;
  const index=session.plan.pairSweeps.findIndex(s=>s.id===current.slotId),target=session.plan.pairSweeps[index+delta];if(!target)return;
  pairCursors.set(`${session.id}:${current.slotId}`,current.trial?.id??null);
  const generation=++navigationGeneration;pairNavigating=true;
  try{
   const reports=effectivePairReports(session).filter(e=>e.sweepId===target.id),ratedIds=new Set(reports.map(e=>e.trialId));
   const firstReachable=session.entries.find(e=>e.kind==='pair-stretch'&&e.sweepId===target.id&&e.grade<5),frozen=firstReachable?.kind==='pair-stretch'?session.pairTrials.find(t=>t.id===firstReachable.trialId)?.contacts[0]:undefined;
   const trials=session.pairTrials.filter(t=>t.sweepId===target.id&&(!frozen||t.contacts[0].row===frozen.row&&t.contacts[0].midiPitch===frozen.midiPitch));
   const nextUnrated=trials.filter(t=>!ratedIds.has(t.id)).at(-1);
   const latestRated=[...reports].reverse().map(e=>trials.find(t=>t.id===e.trialId)).find(Boolean),defaultTrial=nextUnrated??latestRated??trials.at(-1);
   const key=`${session.id}:${target.id}`,cached=pairCursors.get(key),hasCached=pairCursors.has(key)&&(cached===null||trials.some(t=>t.id===cached));
   const trialId=hasCached?cached!:defaultTrial?.id??null;
   await controller.navigate({phase:'progressive-pairs',slotId:target.id,trialId});
   if(!stopped&&!suspended&&page==='work'&&generation===navigationGeneration)focusKey='';
  }finally{pairNavigating=false;}
 }
 function renderTriple(session:StretchCalibrationSession){
  const state=controller.state,slot=state.current.tripleSlot;if(!slot)return;
  const sources=currentSources(),source=selectedSource();
  if(!source){body.innerHTML=`<div class="stretch-detail"><p>${pairLabel(slot.triple)}</p><p class="stretch-help">The ${pairLabel(slot.triple.slice(0,2))} pair has no current grade-3 report. This slot needs that exact recorded pair; grade 2 or 4 cannot substitute.</p><div class="stretch-action-row">${command('recheck-anchor','Recheck the source pair',undefined,busy())}${command('no-anchor','Record no grade-3 anchor',undefined,busy())}</div></div>`;return;}
  sourceId=source.id;const candidates=thirdCandidates(session,source),surface=selectedThird(session,source),moving=currentThirdContact();if(surface)thirdSurfaceId=surface.id;
  const edge=candidates.length?Math[session.plan.provenance.hand==='RH'?'max':'min'](...candidates.map(s=>s.midiPitch)):null,atEdge=surface?.midiPitch===edge;
  body.innerHTML=`<div class="stretch-prompt"><div data-stretch-art></div>${list([`Reproduce the recorded ${pairLabel(slot.triple.slice(0,2))} pair and its exact fingertip contact points.`,`Keep those two points fixed and both keys depressed. Move ${fingers[slot.movingFinger].toLowerCase()} outward on the pinky side.`,`Search the declared playable surfaces for the furthest usable third contact. Keep one common hand position; do not slide either anchor.`])}</div><div class="stretch-triple-controls">${field('Recorded grade-3 pair',`<select id="stretch-triple-source" data-stretch-source aria-label="Grade-3 source pair">${sources.map(s=>{const trial=session.pairTrials.find(t=>t.id===s.trialId)!;return `<option value="${esc(s.id)}"${s.id===sourceId?' selected':''}>${stretchStepsLabel(trial.distanceSemitoneSteps)} steps · ${trial.contacts.map(c=>`${stretchPitchLabel(c.midiPitch)} row ${c.row}`).join(' / ')}</option>`;}).join('')}</select>`)}<p class="stretch-help">The widest recorded grade-3 pair is suggested. Use the same fingertip spots you used when rating that pair.</p>${surface?field(`${fingers[slot.movingFinger]} contact`,`<select id="stretch-third-surface" data-stretch-third aria-label="Third finger key and row">${candidates.map(s=>`<option value="${esc(s.id)}"${s.id===surface.id?' selected':''}>${stretchPitchLabel(s.midiPitch)} · row ${s.row}</option>`).join('')}</select>`):'<p class="stretch-help">No outward surface is inside this collection’s test window.</p>'}<p class="stretch-help">Search includes all ${new Set(slot.searchSurfaceIds.map(id=>session.plan.geometry.surfaces.find(s=>s.id===id)?.row)).size} declared rows. Choose the actual key and row for your endpoint.</p><div class="stretch-action-row" data-options-row>${command('triple-limit','Save furthest usable contact',undefined,busy()||!moving||state.resumeRequired||state.current.needsSetup)}${command('triple-edge',coverageLabel(session),undefined,busy()||!moving||!atEdge||state.resumeRequired||state.current.needsSetup)}${command('attempt','Record this attempted contact',undefined,busy()||!moving||state.resumeRequired||state.current.needsSetup)}${command('triple-unavailable','No usable outward contact',undefined,busy()||!pendingAttempts.length||state.resumeRequired||state.current.needsSetup)}</div><p class="stretch-help">${pendingAttempts.length?`${pendingAttempts.length} attempted ${pendingAttempts.length===1?'contact':'contacts'} recorded for this test. `:''}An edge limits the area tested. Saving an endpoint does not assign a stretch grade to the triple.</p></div>`;
  scene({geometry:session.plan.geometry,contacts:[...(source.realization?.contacts??[]),...(moving?[moving]:[])]});art.hidden=false;
 }
 function renderDetail(session:StretchCalibrationSession,target:ReviewTarget){
  const slots=target.phase==='relative-fingertip-reach'?session.plan.relativeReachSlots:target.phase==='progressive-pairs'?session.plan.pairSweeps:session.plan.tripleSlots,slot=slots.find(s=>s.id===target.slotId),withdrawn=new Set(session.entries.filter(e=>e.kind==='retraction').map(e=>e.entryId));
  const history=session.entries.filter(e=>sameSlot(e,target,session));
  body.innerHTML=`<div class="stretch-detail"><p>${slot?pairLabel('pair'in slot?slot.pair:slot.triple):phaseLabel[target.phase]}</p><p class="stretch-help">Recheck a reading or rating to append a replacement. Withdraw a report to preserve it as history. Triples retain their original source links and show changes to that basis.</p><div class="stretch-detail-history">${history.length?history.map(e=>{
   let label:string=e.kind;
   if(e.kind==='relative-fingertip-reach')label=e.reading.kind==='signed-mm'?`${e.reading.differenceMm} mm`:`${e.reading.firstFraction*100}% / ${e.reading.secondFraction*100}%`;
   else if(e.kind==='pair-stretch'){const trial=session.pairTrials.find(t=>t.id===e.trialId)!;label=`${stretchStepsLabel(trial.distanceSemitoneSteps)} steps · ${e.grade} · ${STRETCH_CALIBRATION_GRADES[e.grade].label}`;}
   else if(e.kind==='pair-sweep-terminal')label=terminalLabel(e.reason,session);
   else if(e.kind==='conditional-triple-boundary')label=`${contactLabel(e.boundaryContact)} · ${e.termination==='coverage-edge'?coverageLabel(session):'Usable limit'} · ${tripleApplicability(session,e)}`;
   else if(e.kind==='conditional-triple-unavailable')label=`No usable outward contact · ${tripleApplicability(session,e)}`;
   else if(e.kind==='omission')label=omissionLabel(e.reason);
   else if(e.kind==='retraction')label=`Withdrawal: ${e.reason}`;
   const editable=e.kind==='pair-stretch'?`<button type="button" data-edit-trial="${esc(e.trialId)}"${busy()?' disabled':''}>Recheck this span</button>`:'';
   return `<div class="stretch-history-row"><span>${esc(label)}${withdrawn.has(e.id)?' · withdrawn':''}</span><span>${editable}${e.kind!=='retraction'&&!withdrawn.has(e.id)?`<button type="button" data-retract="${esc(e.id)}"${busy()?' disabled':''}>Withdraw</button>`:''}</span><small>${esc(e.recordedAt)} · ${esc(e.id)}</small></div>`;
  }).join(''):'<p class="stretch-help">This slot has no recorded evidence yet.</p>'}</div>${field('Correction reason',`<input id="stretch-correction-reason" type="text" aria-label="Reason for withdrawing a report" placeholder="What was wrong with the reading?">`)}</div>`;
 }
 function rememberReachDraft(){
  if(!lastSlot)return;
  const draft={method:reachMethod,primary,primaryPercentage,percentage,millimeters};reachDrafts.set(`${lastSlot}:${reachMethod}:${primary}`,draft);reachPreferences.set(lastSlot,{method:reachMethod,primary});
 }
 function restoreReachChoice(){
  const draft=reachDrafts.get(`${lastSlot}:${reachMethod}:${primary}`);if(draft){primaryPercentage=draft.primaryPercentage;percentage=draft.percentage;millimeters=draft.millimeters;}rememberReachDraft();
 }
 function initializeReachDraft(session:StretchCalibrationSession|null){
  percentage='';primaryPercentage='100';millimeters='';reachMethod='percentage';
  const slot=controller.state.current.relativeSlot;primary=slot?.pair[0]===1?slot.pair[1]:slot?.pair[0]??1;if(!session||!slot)return;
  const preference=reachPreferences.get(lastSlot);if(preference){reachMethod=preference.method;primary=preference.primary;restoreReachChoice();return;}
  const outcome=latestSlotOutcome(session,'relative-fingertip-reach',slot.id),saved=outcome?.kind==='relative-fingertip-reach'?outcome:undefined;
  if(saved&&usesSupersededFingertipWindow(saved.reading)){notice='This earlier reading used different landmarks. Enter a fresh reading against the outlined gaps; the original evidence is retained.';rememberReachDraft();return;}
  if(saved){let raw:Record<string,unknown>|undefined;try{const value=JSON.parse(saved.notes??'null');if(value&&typeof value==='object')raw=value;}catch{}
   if(slot.pair[0]!==1&&raw&&slot.pair.includes(Number(raw.primaryFinger) as typeof slot.pair[number]))primary=Number(raw.primaryFinger);
   const samePrimary=raw?.primaryFinger===primary;
   reachMethod=saved.reading.kind==='signed-mm'?'mm':'percentage';const sign=primary===slot.pair[0]?1:-1;
   if(saved.reading.kind==='signed-mm')millimeters=samePrimary&&typeof raw?.rawMillimeters==='string'?raw.rawMillimeters:String(saved.reading.differenceMm*sign);
   else {const mapping=windowFor(session),local=mapping&&saved.reading.windowId.endsWith(mapping.windowId)&&saved.reading.axisStartMm===mapping.axisStartMm&&saved.reading.axisEndMm===mapping.axisEndMm?decodeStretchFingertipPercentages(mapping,saved.reading.firstFraction,saved.reading.secondFraction):{firstPercent:saved.reading.firstFraction*100,secondPercent:saved.reading.secondFraction*100};primaryPercentage=samePrimary&&typeof raw?.rawPrimaryPercentage==='string'?raw.rawPrimaryPercentage:String(sign===1?local.firstPercent:local.secondPercent);percentage=samePrimary&&typeof raw?.rawOtherPercentage==='string'?raw.rawOtherPercentage:String(sign===1?local.secondPercent:local.firstPercent);}
  }
  rememberReachDraft();
 }
 function rememberInput(target:HTMLInputElement|HTMLSelectElement){
  if(target.hasAttribute('data-stretch-primary-percent'))primaryPercentage=target.value;
  if(target.hasAttribute('data-stretch-percent'))percentage=target.value;
  if(target.hasAttribute('data-stretch-mm'))millimeters=target.value;
  if(target.matches('[data-stretch-primary-percent],[data-stretch-percent],[data-stretch-mm]'))rememberReachDraft();
 }
 async function create(hand:Hand){
  if(creating||busy()||page!=='create')return;
  const generation=navigationGeneration;creating=true;render();
  try{
   const input=await createDefaultStretchSetup({playerId:options.playerId,hand,instrument:options.instrument==='conventional'?'conventional-piano':'janko-four-row'});
   if(stopped)return;
   const ok=await controller.createCollection(input);
   if(ok)keyboard?.endKeyboardRotation();
   if(ok&&!stopped&&!suspended&&page==='create'&&generation===navigationGeneration){page='work';notice='';focusKey='';}
  }finally{creating=false;}
 }
 async function saveReach(){
  const session=controller.state.session,slot=controller.state.current.relativeSlot;if(!session||!slot)return;
  const sign=primary===slot.pair[0]?1:-1;
  let reading:RelativeFingertipReachObservation['reading'];
  if(reachMethod==='mm'){
   const value=number(millimeters);if(value===null)throw Error('Enter the signed forward reach difference in millimeters.');
   reading={kind:'signed-mm',differenceMm:value*sign,method:'operator-direct-relative-forward-reach-mm'};
  }else{
   const primaryValue=number(primaryPercentage),other=number(percentage),mapping=windowFor(session);if(primaryValue===null||other===null)throw Error('Enter both fingertip percentages. Negative values are accepted.');if(!mapping)throw Error('The accepted fingertip landmarks are outside this collection’s keyboard window.');
   reading={kind:'window-fractions',windowId:`${slot.referenceFrameId}:${mapping.windowId}`,...encodeStretchFingertipPercentages(mapping,sign===1?primaryValue:other,sign===1?other:primaryValue),axisStartMm:mapping.axisStartMm,axisEndMm:mapping.axisEndMm,windowReference:mapping.windowReference};
  }
  const mapping=windowFor(session);
  await controller.saveReach(reading,JSON.stringify({entryMethod:reachMethod,primaryFinger:primary,measurementProtocol:'straight-flat-fingertip-landmarks-v1',...(reachMethod==='percentage'?{rawPrimaryPercentage:primaryPercentage,rawOtherPercentage:percentage,localWindows:mapping?[mapping.first,mapping.second].map((window,i)=>({finger:slot.pair[i],surfaceId:window.surface.id,midiPitch:window.surface.midiPitch,row:window.surface.row,axisStartMm:window.axisStartMm,axisEndMm:window.axisEndMm})):[]}:{rawMillimeters:millimeters})}));
 }
 async function enterTarget(target:ReviewTarget){
  const session=controller.state.session;if(!session)return;const generation=navigationGeneration,fromPage=page;
  const first=target.phase==='progressive-pairs'?session.pairTrials.find(t=>t.sweepId===target.slotId):undefined;
  const ok=await controller.navigate({...target,trialId:target.trialId??first?.id??null});if(ok&&!stopped&&!suspended&&page===fromPage&&generation===navigationGeneration){page='work';focusKey='';}
 }
 async function exportCollection(){
  const session=controller.state.session,filename=session?`calibration-${session.plan.provenance.hand}-${session.id}.json`:'retained-calibration.json';
  if(controller.state.readOnly){if(options.onExportBytes)await options.onExportBytes(controller.exportBytes(),filename);else throw Error('The retained calibration file requires byte-preserving export.');return;}
  if(!session)throw Error('Choose a collection before exporting it.');
  const json=JSON.stringify(session,null,2)+'\n';
  if(options.onExport)await options.onExport(json,filename);
  else {const url=URL.createObjectURL(new Blob([json],{type:'application/json'})),a=dialog.ownerDocument.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 }
 const click=(event:Event)=>{
  if(stopped||suspended)return;
  const target=(event.target as HTMLElement).closest<HTMLElement>('[data-stretch-command],[data-grade],[data-review],[data-review-group],[data-edit-trial],[data-retract]');if(!target||target.hasAttribute('disabled'))return;
  if((event as MouseEvent).detail>1)return;
  if(target.dataset.grade!==undefined&&page==='work'&&controller.state.current.phase==='progressive-pairs'&&!controller.state.current.needsSetup){const trialId=target.dataset.trialId;if(!trialId||trialId!==visibleTrialId||trialId!==controller.state.current.trial?.id||!pairIllustrationVisible())return;void perform(()=>controller.rate(Number(target.dataset.grade) as StretchGrade,{kind:'screen'},trialId));return;}
  if(target.dataset.reviewGroup){browser.selectGroup(target.dataset.reviewGroup,reviewRows);browser.render(body.querySelector<HTMLElement>('.stretch-review-browser')!,reviewRows,busy(),true);return;}
  if(target.dataset.review){browser.selectRating(target.dataset.review,reviewRows);detailTarget=reviewTargets.get(target.dataset.review);transition('detail');return;}
  if(target.dataset.editTrial&&detailTarget){const chosen=detailTarget;void perform(()=>enterTarget({...chosen,trialId:target.dataset.editTrial}));return;}
  if(target.dataset.retract){const reason=body.querySelector<HTMLInputElement>('#stretch-correction-reason')?.value.trim();if(!reason){notice='Enter a reason before withdrawing a report.';render();return;}void perform(()=>controller.retract(target.dataset.retract!,reason));return;}
  switch(target.dataset.stretchCommand){
   case 'back':back();break;
   case 'options':openOptions();break;
   case 'new':transition('create');break;
   case 'continue':if(controller.state.progress?.complete)transition('review');else{navigationGeneration++;page='work';notice='';render();}break;
   case 'start-right':case 'start-left':void perform(()=>create(target.dataset.stretchCommand==='start-left'?'LH':'RH'));break;
   case 'review':transition('review');break;
   case 'export':void perform(exportCollection);break;
   case 'export-all':void perform(()=>options.onExportAll?.());break;
   case 'curl':{const session=controller.state.session;if(session)void perform(()=>options.openCurl?.(session,()=>{page='options';render();}));break;}
   case 'percentage':rememberReachDraft();reachMethod='percentage';restoreReachChoice();render();break;
   case 'mm':rememberReachDraft();reachMethod='mm';restoreReachChoice();render();break;
   case 'save-reach':void perform(saveReach);break;
   case 'reproduce':void perform(()=>controller.prepare());break;
   case 'begin-pair':{const generation=navigationGeneration;void perform(async()=>{if(!controller.state.current.trial){if(!await controller.prepareBaseline())return;}if(stopped||suspended||page!=='work'||generation!==navigationGeneration||controller.state.current.phase!=='progressive-pairs'||!pairIllustrationVisible())return;await controller.prepare();});break;}
   case 'narrower':case 'wider':void perform(()=>controller.adjustSpan(target.dataset.stretchCommand==='wider'?2:-2));break;
   case 'maximum':void perform(()=>controller.markMaximum());break;
   case 'stop-sweep':void perform(()=>controller.stopSweep());break;
   case 'skip':if(controller.state.current.phase!=='progressive-pairs')void perform(()=>controller.skip());break;
   case 'previous-pair':case 'next-pair':void perform(()=>movePair(target.dataset.stretchCommand==='previous-pair'?-1:1));break;
   case 'edit':if(detailTarget)void perform(()=>enterTarget(detailTarget!));break;
   case 'recheck-anchor':{const slot=controller.state.current.tripleSlot;if(slot)void perform(()=>enterTarget({phase:'progressive-pairs',slotId:slot.anchorSweepId}));break;}
   case 'no-anchor':void perform(()=>controller.skip('no-rated-anchor'));break;
   case 'attempt':{const contact=currentThirdContact();if(contact&&!pendingAttempts.some(c=>c.location.surfaceId===contact.location.surfaceId))pendingAttempts.push(contact);render();break;}
   case 'triple-unavailable':{const source=selectedSource();if(source)void perform(()=>controller.saveTripleUnavailable({sourcePairObservationId:source.id,attemptedContacts:pendingAttempts}));break;}
   case 'triple-limit':case 'triple-edge':{const source=selectedSource(),contact=currentThirdContact();if(source&&contact)void perform(()=>controller.saveTripleBoundary({sourcePairObservationId:source.id,boundaryContact:contact,termination:target.dataset.stretchCommand==='triple-edge'?'coverage-edge':'usable-limit',configurationGrade:null}));break;}
  }
 };
 const change=(event:Event)=>{
  if(stopped||suspended)return;
  const target=event.target as HTMLInputElement|HTMLSelectElement;rememberInput(target);
  if(target.hasAttribute('data-stretch-collection'))void perform(()=>controller.selectCollection(target.value));
  if(target.hasAttribute('data-stretch-colors'))void perform(()=>options.saveColors?.(target.value as Colors));
  if(target.hasAttribute('data-stretch-primary')){rememberReachDraft();const previous=primary;primary=Number(target.value);if(primary!==previous){[primaryPercentage,percentage]=[percentage,primaryPercentage];millimeters=number(millimeters)!==null?String(-number(millimeters)!):'';restoreReachChoice();}render();}
  if(target.hasAttribute('data-stretch-source')){sourceId=target.value;thirdSurfaceId='';pendingAttempts=[];controller.break();render();}
  if(target.hasAttribute('data-stretch-third')){thirdSurfaceId=target.value;render();}
 };
 const input=(event:Event)=>{
  if(stopped||suspended)return;
  const target=event.target as HTMLInputElement;rememberInput(target);
  if(!target.matches('[data-stretch-primary-percent],[data-stretch-percent],[data-stretch-mm]'))return;
  const session=controller.state.session,slot=controller.state.current.relativeSlot,output=body.querySelector<HTMLElement>('[data-stretch-reading-output]');if(!session||!slot)return;
  const mapping=windowFor(session),primaryValue=number(primaryPercentage),other=number(percentage),sign=primary===slot.pair[0]?1:-1,value=readingDifference(session);
  if(output)output.textContent=value===null?'Enter a reading to see its signed reach difference.':`${value.toFixed(1)} mm · ${fingers[slot.pair[1]]} minus ${fingers[slot.pair[0]]}`;
  if(mapping&&keyboard)keyboard.update(reachScene(session,mapping,sign===1?primaryValue:other,sign===1?other:primaryValue));
 };
 dialog.addEventListener('click',click);dialog.addEventListener('change',change);dialog.addEventListener('input',input);
 const unsubscribe=controller.subscribe(()=>render());
 return {
  get acceptsRatings(){const state=controller.state;return !stopped&&!suspended&&page==='work'&&state.current.phase==='progressive-pairs'&&!state.current.needsSetup&&!state.resumeRequired&&!busy()&&pairIllustrationVisible();},
  key(event:KeyboardEvent,type:'key-down'|'key-up'='key-down'):boolean {
   if(stopped||suspended)return false;
   const gradeCode=/^(Digit|Numpad)[0-5]$/.test(event.code);
   if(type==='key-up'){heldActivations.delete(event.code);heldPairNavigation.delete(event.code);if(gradeCode)void controller.inputKey({type:'keyup',code:event.code});return gradeCode&&page==='work'&&controller.state.current.phase==='progressive-pairs';}
   const editable=(event.target as HTMLElement|null)?.closest('input,textarea,select,[contenteditable=true]');
   if(page==='work'&&!navigation?.picking&&keyboard?.key(event))return true;
   if(page==='work'&&controller.state.current.phase==='progressive-pairs'&&!editable&&!navigation?.picking&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&!event.shiftKey&&['ArrowLeft','ArrowRight'].includes(event.code)){const blocked=event.repeat||heldPairNavigation.size>0;heldPairNavigation.add(event.code);if(!blocked&&!busy())void perform(()=>movePair(event.code==='ArrowLeft'?-1:1));return true;}
   if(['Enter','Space'].includes(actionCode(event))&&(!editable||actionCode(event)==='Enter')&&!event.ctrlKey&&!event.altKey&&!event.metaKey){if(event.repeat||heldActivations.has(event.code))return true;heldActivations.add(event.code);}
   if(gradeCode&&!editable&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&!event.shiftKey&&page==='work'&&controller.state.current.phase==='progressive-pairs'){
    if(!controller.state.current.needsSetup&&!controller.state.resumeRequired&&pairIllustrationVisible())void controller.inputKey({type:'keydown',code:event.code,repeat:event.repeat});return true;
   }
   if(page==='review'&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&!event.shiftKey&&(event.target as HTMLElement|null)?.closest('[data-review],[data-review-group]')){
    const focused=event.target as HTMLElement,code=actionCode(event)==='Space'?'Enter':actionCode(event);
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'].includes(code)){
     if(busy()||event.repeat&&code==='Enter')return true;
     if(focused.dataset.reviewGroup)browser.selectGroup(focused.dataset.reviewGroup,reviewRows);else if(focused.dataset.review)browser.selectRating(focused.dataset.review,reviewRows);
     const result=browser.key(code,reviewRows);if(result==='open'){const id=browser.current(reviewRows)?.id;[...body.querySelectorAll<HTMLButtonElement>('[data-review]')].find(b=>b.dataset.review===id)?.click();}else if(result==='handled')browser.render(body.querySelector<HTMLElement>('.stretch-review-browser')!,reviewRows,false,true);if(result)return true;
    }
   }
   if(!event.ctrlKey&&!event.altKey&&!event.metaKey&&actionCode(event)==='Enter'&&editable){
    const action=[...footer.querySelectorAll<HTMLButtonElement>('[data-primary-action]:not(:disabled)')].find(button=>!button.closest('[hidden]')&&button.getClientRects().length>0);
    if(action){action.click();return true;}
   }
   const handChoice=(event.target as HTMLElement|null)?.closest<HTMLButtonElement>('[data-stretch-command=start-right],[data-stretch-command=start-left]');
   if(page==='create'&&handChoice&&['Enter','Space'].includes(actionCode(event))&&!event.ctrlKey&&!event.altKey&&!event.metaKey){if(!handChoice.disabled)handChoice.click();return true;}
   if(navigation?.keyDown(event))return true;
   if(event.code==='Escape'&&!event.ctrlKey&&!event.altKey&&!event.metaKey){if(!event.repeat)back();return true;}
   if(event.ctrlKey||event.altKey||event.metaKey||event.shiftKey||editable||event.repeat)return false;
   if(event.code==='KeyO'){if(page==='options')back();else openOptions();return true;}
   if(page==='create'&&['KeyR','KeyL'].includes(event.code)){if(heldActivations.has(event.code))return true;heldActivations.add(event.code);body.querySelector<HTMLButtonElement>(`[data-stretch-command=${event.code==='KeyL'?'start-left':'start-right'}]:not(:disabled)`)?.click();return true;}
   if(page==='home'){const name=({KeyN:'new',KeyR:'review',KeyE:'export'} as Record<string,string>)[event.code];if(name){body.querySelector<HTMLButtonElement>(`[data-stretch-command=${name}]:not(:disabled)`)?.click();return true;}}
   return false;
  },
  suspend(){if(stopped||suspended)return;const active=dialog.ownerDocument.activeElement as HTMLElement|null;if(active&&dialog.contains(active)){focusKey=controlKey(active)||focusKey;if(active.matches('input,textarea'))rememberInput(active as HTMLInputElement);}rememberReachDraft();navigationGeneration++;suspended=true;visibleTrialId=null;heldActivations.clear();heldPairNavigation.clear();navigation?.dispose();navigation=undefined;controller.break();},
  resume(){if(stopped||!suspended)return;suspended=false;render();},
  break(){heldActivations.clear();heldPairNavigation.clear();if(!stopped)controller.break();},
  flush(){return controller.flush();},
  dispose(){if(stopped)return;stopped=true;heldActivations.clear();heldPairNavigation.clear();navigation?.dispose();keyboard?.dispose();controller.break();unsubscribe();dialog.removeEventListener('click',click);dialog.removeEventListener('change',change);dialog.removeEventListener('input',input);dialog.classList.remove('stretch-calibration');delete dialog.dataset.stretchPage;delete dialog.dataset.stretchPhase;art.remove();},
 };
}
