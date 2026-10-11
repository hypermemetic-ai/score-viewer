import {
 EXPLORATORY_CALIBRATION_PROTOCOL as protocol, EXPLORATORY_CALIBRATION_GRADES as grades,
 exploratoryCalibrationProgress, exploratoryCalibrationWorkAt,
 type CalibrationColorLayout, type CalibrationGrade, type ExploratoryCalibrationSession,
} from '@hypermemetic-ai/fingering-calculator';
import {createPilotPlan, nominalPilotProfile, type PilotInstrument, type PilotProfile, type PilotSetup} from './calibration-pilot';
import {PilotController} from './calibration-pilot-controller';
import {pilotEscape as esc, pilotPitchText, pilotPlacementText, renderPilotKeyboard, renderPilotMovementExample} from './calibration-pilot-renderer';

export interface CalibrationPilotViewHooks {
 instrument: PilotInstrument;
 close(): void;
 openLegacy(): void;
 exportJson(text: string, filename: string): Promise<void>;
}
export interface CalibrationPilotView {
 midiContainer: HTMLElement;
 dispose(): void;
 setMidiConnected(connected: boolean): void;
}
const instrumentText = (instrument: PilotInstrument) => instrument === 'janko-four-row' ? 'Four-row Jankó' : 'Conventional piano';
const numericLabels: Record<string,string> = {
 minMidiPitch:'Lowest MIDI pitch',maxMidiPitch:'Highest MIDI pitch',originMidiPitch:'Origin MIDI pitch',
 oppositeParityGapMm:'Opposite-parity body gap',usableWidthMm:'Usable width',sideMarginMm:'Side margin',usableDepthMm:'Usable depth',
 rowDepthsMm:'Row front depths · near to far',rowHeightsMm:'Row resting heights · near to far',keyTravelMm:'Key travel',
 whiteWidthMm:'White-key width',whiteDepthMm:'White-key depth',blackWidthMm:'Black-key width',blackDepthMm:'Black-key depth',
 blackFrontDepthMm:'Black-key front depth',blackHeightMm:'Black-key height',whiteTravelMm:'White-key travel',blackTravelMm:'Black-key travel',
};
const pitchOptions = (selected: number) => Array.from({length:128},(_,pitch) => `<option value="${pitch}"${pitch===selected?' selected':''}>${pilotPitchText(pitch)} · MIDI ${pitch}</option>`).join('');
const instructions = () => `<p>${esc(protocol.setupInstruction)}</p><p>Face forward at the declared seating reference. Start with the wrist aligned with the forearm and a comfortable arm position. Keep the setup relaxed.</p><p>${esc(protocol.contactInstruction)}</p>${renderPilotMovementExample()}<ol><li>${esc(protocol.patternInstructions.combined)}</li><li>${esc(protocol.patternInstructions.trill)}</li></ol><p>${esc(protocol.ratingInstruction)}</p>`;

export function mountCalibrationPilot(dialog: HTMLDialogElement, controller: PilotController, hooks: CalibrationPilotViewHooks): CalibrationPilotView {
 let disposed = false, midiConnected = false, layout: CalibrationColorLayout = 'five-seven';
 let settingUp = !controller.session;
 let previousTarget: string | null | undefined;
 const initialProfile = nominalPilotProfile(hooks.instrument);
 dialog.classList.add('calibration-pilot-dialog');
 dialog.innerHTML = `<header class="pilot-header"><div><h2>Exploratory hand calibration</h2><p class="help">${instrumentText(hooks.instrument)} · one hand at a central location</p></div><button type="button" data-pilot-close>Done <kbd>Esc</kbd></button></header>
 <p class="help">A finite collection of reported effort. This round does not fit a hand model or change score fingerings or calculations. A second hand is a separate run.</p>
 <p class="pilot-fixed-cue" data-pilot-root-cue>${esc(protocol.prominentInstruction)}</p>
 <div class="pilot-midi" data-pilot-midi data-calibration-midi aria-label="MIDI connection"></div>
 <div data-pilot-message role="status" aria-live="polite"></div>
 <section data-pilot-setup><h3>New collection round</h3><form data-pilot-form>
 <div class="pilot-setup-grid"><label>Hand<select name="hand"><option value="RH">Right hand</option><option value="LH">Left hand</option></select></label><label>Central reference on your instrument<select name="anchor">${pitchOptions(60)}</select></label>
 ${hooks.instrument==='conventional-piano'?`<label class="pilot-checkbox"><input type="checkbox" name="extra"> Add a second reference · 104 judgments</label><label data-pilot-extra hidden>Second reference<select name="second">${pitchOptions(61)}</select></label>`:''}
 <label>Setup name<input name="setupId" value="${esc(`${instrumentText(hooks.instrument)} · central reference`)}" required maxlength="200"></label><label>Seating reference<input name="reference" value="Facing forward at keyboard center" required maxlength="1000"></label><label>Declared body midline · mm<input type="number" name="bodyMidlineXmm" value="0" step="any" required></label></div>
 <details class="pilot-geometry"><summary>Nominal physical geometry · review or edit before starting</summary><p class="help">These dimensions are declared estimates, not measured hardware or captured pose. Dimensions use millimetres; MIDI pitches use integers. The saved round keeps its own geometry.</p><div class="pilot-geometry-grid">${Object.entries(initialProfile.geometry).map(([name,value]) => typeof value==='number' ? `<label>${numericLabels[name]??esc(name)}${name.includes('MidiPitch')?'':' · mm'}<input type="number" data-geometry="${name}" value="${value}" step="${name.includes('MidiPitch')?'1':'any'}" required></label>` : Array.isArray(value) ? `<fieldset><legend>${numericLabels[name]} · mm</legend>${value.map((n,i)=>`<label>Row ${i+1}<input type="number" data-geometry="${name}" data-index="${i}" value="${n}" step="any" required></label>`).join('')}</fieldset>` : '').join('')}</div><label>Geometry reference<input name="geometryReference" value="${esc(initialProfile.geometry.reference)}" required maxlength="1000"></label></details>
 <p data-pilot-preview class="help" aria-live="polite"></p><details class="pilot-instructions" open><summary>Read the setup and short task</summary>${instructions()}</details><div class="dialog-actions"><button type="button" data-pilot-cancel>Return to current round</button><button type="submit" data-pilot-start>Start this round</button></div></form></section>
 <section data-pilot-active></section><section class="pilot-history"><h3>Saved rounds</h3><div data-pilot-history></div></section><footer class="dialog-actions"><button type="button" data-pilot-new>New round</button><button type="button" data-pilot-export>Export all pilot data</button><button type="button" data-pilot-legacy>Legacy thumb–pinky records</button></footer>`;
 const element = <T extends HTMLElement>(selector: string) => dialog.querySelector<T>(selector)!;
 const form = element<HTMLFormElement>('[data-pilot-form]');
 const field = <T extends HTMLInputElement | HTMLSelectElement = HTMLInputElement>(name:string) => form.elements.namedItem(name) as T;
 const profile = (): PilotProfile => {
  const result = structuredClone(initialProfile);
  const geometry = result.geometry as unknown as Record<string,number|number[]|string>;
  form.querySelectorAll<HTMLInputElement>('[data-geometry]').forEach(input => {
   const name = input.dataset.geometry!;
   if(input.dataset.index !== undefined) (geometry[name] as number[])[Number(input.dataset.index)] = Number(input.value);
   else geometry[name] = Number(input.value);
  });
  geometry.reference = field('geometryReference').value.trim();
  return result;
 };
 const setup = (): PilotSetup => ({instrument:hooks.instrument,hand:field<HTMLSelectElement>('hand').value as 'LH'|'RH',anchorMidiPitches:[Number(field('anchor').value), ...(hooks.instrument==='conventional-piano'&&field('extra').checked ? [Number(field('second').value)] : [])], profile:profile(),setupId:field('setupId').value.trim(),bodyMidlineXmm:Number(field('bodyMidlineXmm').value),reference:field('reference').value.trim()});
 const preview = () => {
  if(hooks.instrument==='conventional-piano') element<HTMLElement>('[data-pilot-extra]').hidden = !field('extra').checked;
  let valid = true;
  try {
   const plan = createPilotPlan(setup());
   element('[data-pilot-preview]').textContent = `${plan.coverage.total} judgments · ${plan.coverage.blocks} blocks · thumb–index and index–middle, each finger anchoring in turn. ${hooks.instrument==='janko-four-row'?'Both lower and upper copies at every distance.':'One physical key at each distance.'} Usual finger side, mirrored for the left hand; 1–13 decimal semitone steps (1–11 duodecimal).`;
  } catch(error) {valid = false; element('[data-pilot-preview]').textContent = `Cannot start: ${error instanceof Error?error.message:String(error)} Choose references with all required targets on this instrument.`;}
  element<HTMLButtonElement>('[data-pilot-start]').disabled = !valid || controller.busy || controller.state.readOnly;
 };
 form.addEventListener('input',preview);
 form.addEventListener('change',preview);
 const run = (operation:()=>Promise<boolean>) => {if(disposed)return;void operation().catch(error=>{if(!disposed)element('[data-pilot-message]').textContent=String(error);});};
 form.addEventListener('submit',event => {event.preventDefault(); if(controller.busy || controller.state.readOnly)return; run(async()=>{const saved=await controller.start(setup());if(saved){settingUp=false;render();}return saved;});});
 function sessionLabel(session: ExploratoryCalibrationSession): string {
  const p = exploratoryCalibrationProgress(session);
  return `${session.plan.hand==='RH'?'Right':'Left'} hand · ${instrumentText(session.plan.keyboard.id)} · ${session.plan.anchorMidiPitches.map(pilotPitchText).join(', ')} · ${p.measured}/${p.total}${p.remaining===0?' · collection complete':''}`;
 }
 function render(): void {
  if(disposed)return;
  const state = controller.state, session = state.session;
  const locked = state.busy || state.readOnly;
  element('[data-pilot-setup]').hidden = !settingUp;
  element('[data-pilot-root-cue]').hidden = !settingUp && !!state.current.trial;
  element<HTMLButtonElement>('[data-pilot-cancel]').hidden = !session;
  element<HTMLButtonElement>('[data-pilot-new]').disabled = locked;
  element<HTMLButtonElement>('[data-pilot-export]').disabled = state.busy;
  element('[data-pilot-message]').textContent = state.error ? `${state.error}${state.readOnly?' Retained bytes are protected; export them for inspection.':' Accepted progress is retained. Try again when saving is available.'}` : state.busy ? 'Saving… the displayed target remains active until the save succeeds.' : '';
  const history = state.archive.sessions;
  element('[data-pilot-history]').innerHTML = history.length ? history.map(saved => `<div class="pilot-history-row"><span>${esc(sessionLabel(saved))}<small>${esc(saved.provenance.setupId)} · ${esc(saved.id)}</small></span><button type="button" data-pilot-resume="${esc(saved.id)}"${locked?' disabled':''}>${saved.id===session?.id?'Reset setup / resume':'Resume'}</button></div>`).join('') : '<p class="help">No saved rounds. Earlier data will remain when you start another round.</p>';
  const active = element('[data-pilot-active]');
  active.hidden = settingUp || !session;
  if(!session) {active.innerHTML=''; preview(); return;}
  const {trial,block,needsSetup} = state.current, progress = state.progress!;
  if(previousTarget !== trial?.id) { previousTarget=trial?.id; if(state.notes) controller.setNotes(''); }
  const trialIndex = trial ? session.trials.findIndex(q=>q.id===trial.id) : -1;
  const blockIndex = block ? session.plan.blocks.findIndex(q=>q.id===block.id) : -1;
  const blockProgress = progress.blocks.find(q=>q.blockId===block?.id);
  const work = trial ? exploratoryCalibrationWorkAt(session,trial.id) : null;
  const retracted = new Set(session.retractions.map(q=>q.observationIndex));
  const latest = session.observations.map((q,i)=>({q,i})).filter(q=>!retracted.has(q.i)).at(-1);
  const acceptedGrades = new Map<string,number>();
  session.observations.forEach((observation,i)=>{if(!retracted.has(i))acceptedGrades.set(observation.trialId,observation.grade);});
  const disabled = locked || needsSetup || state.broken || !trial;
  const focus = active.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.pilotFocus : undefined;
  const selection = document.activeElement instanceof HTMLTextAreaElement ? {start:document.activeElement.selectionStart,end:document.activeElement.selectionEnd} : null;
  active.innerHTML = `<div class="pilot-progress"><strong>${progress.measured} measured · ${progress.remaining} remaining · ${progress.total} required</strong><progress value="${progress.measured}" max="${progress.total}" aria-label="Measured judgments"></progress><small>${progress.observations} observations · ${session.observations.length-new Set(session.observations.map(q=>q.trialId)).size} revisions · ${progress.retractions} retractions. No inference.</small></div>
   ${trial&&block?`<div class="pilot-block-heading"><h3>Block ${blockIndex+1} of ${progress.totalBlocks} · ${blockProgress!.measured}/${blockProgress!.total} measured</h3>${session.plan.keyboard.id==='janko-four-row'?`<button type="button" data-pilot-colors aria-pressed="${layout==='classic'}">Classic colors</button>`:''}</div>
   <div class="pilot-contact-text"><p class="pilot-anchor-legend"><strong>Anchor</strong> · ${esc(pilotPlacementText(session.plan.keyboard,block.anchor))}</p><p class="pilot-tested-legend"><strong>Test</strong> · ${esc(pilotPlacementText(session.plan.keyboard,trial.active[0]))}</p><small>Target ${trialIndex+1} of ${progress.total} · ${trial.distanceSemitoneSteps} decimal semitone steps · ${session.plan.hand==='RH'?'right':'left'} hand</small></div>
   ${renderPilotKeyboard(session.plan.keyboard,trial,layout)}<p class="help">${esc(session.plan.keyboard.provenance.kind)} geometry · ${esc(session.plan.keyboard.provenance.reference)}. The anchor depth and chosen tested contact are unmeasured. Choose a front-to-back point; aim at the usable width’s center at that depth.</p>
   <details class="pilot-instructions"${needsSetup?' open':''}><summary>${needsSetup?'Reset and acknowledge this block setup':'Setup and task reminder'}</summary>${instructions()}</details>
   ${needsSetup?`<p class="pilot-setup-prompt">Before rating, establish this relaxed setup and fix your actual anchor contact point.</p><button type="button" data-pilot-ack${locked?' disabled':''}>I have established the displayed setup</button>`:''}
   <section class="pilot-rating" aria-label="Effort ratings"><p class="pilot-fixed-cue">${esc(protocol.prominentInstruction)}</p><p class="pilot-task">Press both fingers together, then keep the anchor down while the tested finger taps several times.</p><p>Under those conditions, how much extra effort does pressing this key require?</p><div class="pilot-grades">${grades.map(q=>`<button type="button" data-pilot-grade="${q.grade}" data-pilot-focus="grade-${q.grade}"${disabled?' disabled':''}><span><kbd>${q.grade}</kbd> ${esc(q.label)}</span><small>${esc(q.description)}</small></button>`).join('')}</div><p class="help">Grades 0–3 report both task patterns performed. Grade 4 may be reported without completed patterns. Unknown or untested stays unrated. Rate the more demanding part, at your best tested depth.</p><label class="calibration-notes">Optional note<textarea data-pilot-notes data-pilot-focus="notes" rows="2" maxlength="2000"${locked?' disabled':''}>${esc(state.notes)}</textarea></label><p class="help" data-pilot-input-hint></p>${work?.status==='measured'?`<p class="help">Existing judgment: ${work.grade} · ${esc(grades[work.grade].label)}. Rating again appends a correction and retains history.</p>`:''}</section>`:`<h3>Finite collection round complete</h3><p>All ${progress.total} required targets have a judgment. This does not establish a complete hand model, trajectory or interpolation. Export the complete session for analysis; earlier targets can still be revisited and corrected.</p>`}
   <div class="pilot-navigation"><button type="button" data-pilot-prev${locked||trialIndex<=0?' disabled':''}>Previous target</button><label>Revisit / correct<select data-pilot-trial${locked?' disabled':''}>${!trial?'<option value="" selected disabled>Choose a target</option>':''}${session.trials.map((q,i)=>{const grade=acceptedGrades.get(q.id);return `<option value="${esc(q.id)}"${q.id===trial?.id?' selected':''}>${i+1} · ${pilotPitchText(session.plan.keyboard.keys.find(k=>k.id===q.active[0].keyId)!.midiPitch)} · finger ${q.active[0].finger}${session.plan.keyboard.id==='janko-four-row'?` · ${session.plan.keyboard.keys.find(k=>k.id===q.active[0].keyId)!.level}`:''} · ${grade!==undefined?`grade ${grade}`:'unrated'}</option>`;}).join('')}</select></label><button type="button" data-pilot-next${locked||trialIndex<0||trialIndex>=session.trials.length-1?' disabled':''}>Next target</button></div>
   <div class="dialog-actions"><button type="button" data-pilot-undo${locked||!latest?' disabled':''}>Undo last observation</button><button type="button" data-pilot-session-export${state.busy?' disabled':''}>Export this complete session JSON</button></div>
   <details class="pilot-block-progress"><summary>Progress by block</summary>${progress.blocks.map((p,i)=>`<p>Block ${i+1}: ${p.measured}/${p.total} measured · ${p.remaining} remaining</p>`).join('')}</details>`;
  updateInputHint();
  if(focus) {const replacement=active.querySelector<HTMLElement>(`[data-pilot-focus="${focus}"]`);if(replacement&&!('disabled' in replacement && replacement.disabled)){replacement.focus({preventScroll:true});if(selection&&replacement instanceof HTMLTextAreaElement)replacement.setSelectionRange(selection.start,selection.end);}}
  preview();
 }
 function updateInputHint(): void {
  const hint=dialog.querySelector('[data-pilot-input-hint]');
  if(hint)hint.innerHTML=`Keyboard <kbd>0–4</kbd> and numeric keypad are always available.${midiConnected?' MIDI connected.':' MIDI not connected.'} MIDI: C / D / E / F♯ / G♯ give grades 0 / 1 / 2 / 3 / 4 in any complete C–G♯ block outside the current tested contact span. Release controls before the next rating. Test notes are not recorded.`;
 }
 dialog.addEventListener('click',onClick);
 function onClick(event: MouseEvent): void {
  const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if(!button||!dialog.contains(button)||button.disabled)return;
  const d=button.dataset;
  if('pilotClose' in d) hooks.close();
  else if('pilotLegacy' in d) hooks.openLegacy();
  else if('pilotNew' in d) {settingUp=true;controller.break();render();}
  else if('pilotCancel' in d) {settingUp=false;render();}
  else if('pilotColors' in d) {layout=layout==='classic'?'five-seven':'classic';render();}
  else if('pilotAck' in d) run(()=>controller.setup());
  else if(d.pilotGrade!==undefined) run(()=>controller.rateButton(Number(d.pilotGrade) as CalibrationGrade));
  else if(d.pilotResume) run(async()=>{const ok=await controller.resume(d.pilotResume!);if(ok){settingUp=false;render();}return ok;});
  else if('pilotPrev' in d||'pilotNext' in d) {const s=controller.session!;const index=s.trials.findIndex(q=>q.id===s.currentTrialId);run(()=>controller.navigate(s.trials[index+('pilotPrev'in d?-1:1)].id));}
  else if('pilotUndo' in d) {const s=controller.session!;const retracted=new Set(s.retractions.map(q=>q.observationIndex));const index=s.observations.map((_,i)=>i).filter(i=>!retracted.has(i)).at(-1);if(index!==undefined)run(()=>controller.undo(index,'Operator undid last observation'));}
  else if('pilotExport'in d||'pilotSessionExport'in d) {const text='pilotSessionExport'in d?JSON.stringify(controller.session,null,2):controller.export();void hooks.exportJson(text,'pilotSessionExport'in d?`calibration-${controller.session!.id}.json`:'calibration-pilot-export.json').catch(error=>{if(!disposed)element('[data-pilot-message]').textContent=String(error);});}
 }
 const onChange = (event: Event) => {
  const target=event.target as HTMLElement;
  if(target.matches('[data-pilot-trial]'))run(()=>controller.navigate((target as HTMLSelectElement).value));
 };
 const onInput = (event: Event) => {if((event.target as HTMLElement).matches('[data-pilot-notes]'))controller.setNotes((event.target as HTMLTextAreaElement).value);};
 dialog.addEventListener('change',onChange);
 dialog.addEventListener('input',onInput);
 const unsubscribe=controller.subscribe(render);
 render();
 return {midiContainer:element('[data-pilot-midi]'),setMidiConnected(connected){midiConnected=connected;updateInputHint();},dispose(){disposed=true;unsubscribe();dialog.removeEventListener('click',onClick);dialog.removeEventListener('change',onChange);dialog.removeEventListener('input',onInput);dialog.classList.remove('calibration-pilot-dialog');}};
}
