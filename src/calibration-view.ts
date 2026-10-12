import {arrangeDialogNavigation} from './application-navigation';
import {type SpanCalibrationObservation} from '../vendor/iso-notation/src/model/isomorphic-span-calibration';
import {addObservation, calibrationDetails, copyRow, pitchText, UNASSIGNED_SPAN_REPORTS, type ViewerCalibration} from './calibration';

const esc = (s: string) => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const options = (values: {value: string; label: string}[], selected: string) => values.map(q=>`<option value="${q.value}" ${q.value===selected?'selected':''}>${q.label}</option>`).join('');
const pitchOptions = (selected: number) => options(Array.from({length:88},(_,i)=>({value:String(i+9),label:pitchText(i+9)})),String(selected));
export interface CalibrationViewHooks {
 save(value: ViewerCalibration): Promise<ViewerCalibration>;
 export(): Promise<void>;
 close(): void;
}
export function mountCalibration(dialog: HTMLDialogElement, initial: ViewerCalibration, hooks: CalibrationViewHooks, loadError?: string): void {
 let value = initial;
 dialog.classList.add('calibration-dialog');
 dialog.innerHTML = `<h2>Thumb–pinky calibration</h2><p class="help">Start with a relaxed thumb–pinky pair. Gently play both keys, hold briefly, release and reform the shape three times. Keep your natural hand angle. Explore smaller or larger spans only while comfortable; there is no maximum-stretch test.</p>
 ${loadError?`<p class="error" role="alert">${esc(loadError)} Export the retained data for inspection; new measurements are disabled to preserve it.</p>`:''}
 <form class="calibration-form">
 <label class="dialog-row">Hand<select name="hand" aria-label="Calibration hand"><option value="RH">Right hand</option><option value="LH">Left hand</option></select></label>
 <div class="calibration-keys">
 <label>Thumb · finger 1<select name="thumbPitch" aria-label="Thumb key">${pitchOptions(48)}</select></label>
 <label>Copy<select name="thumbCopy" aria-label="Thumb key copy"><option value="1">1 · near</option><option value="2">2 · far</option></select></label>
 <label>Pinky · finger 5<select name="pinkyPitch" aria-label="Pinky key">${pitchOptions(60)}</select></label>
 <label>Copy<select name="pinkyCopy" aria-label="Pinky key copy"><option value="1">1 · near</option><option value="2">2 · far</option></select></label>
 </div><p class="placement help" aria-live="polite"></p>
 <label class="dialog-row">This test<select name="boundary" aria-label="Test purpose"><option value="">A placement sample</option><option value="minimum">Smallest comfortable placement</option><option value="maximum">Largest comfortable placement</option></select></label>
 <fieldset class="calibration-rating"><legend>How does it feel?</legend>${[['comfortable','Comfortable'],['reachable-with-effort','Reachable with effort'],['unavailable','Cannot reach'],['unsure','Unsure']].map(([rating,label])=>`<label><input type="radio" name="rating" value="${rating}" required> ${label}</label>`).join('')}</fieldset>
 <label class="dialog-row">Repetition<select name="repetition" aria-label="Repeated test result"><option value="single">Tested once</option><option value="agree">Three gentle tries agreed</option><option value="mixed">Tries differed / uncertain</option></select></label>
 <label class="calibration-notes">Notes <small>optional</small><textarea name="notes" aria-label="Calibration notes" maxlength="2000" rows="2" placeholder="Anything that changed the comfort"></textarea></label>
 <div class="dialog-actions"><button type="submit" ${loadError?'disabled':''}>Save observation <kbd>Enter</kbd></button></div><p class="calibration-status help" role="status"></p></form>
 <section class="calibration-summary" aria-label="Saved calibration"><h3>Tested placements</h3><div class="calibration-observations"></div><p class="calibration-evidence help"></p></section>
 <label class="dialog-row">Future calculations<select data-calibration-profile aria-label="Fingering calculation profile" ${loadError?'disabled':''}><option value="baseline">Baseline model</option><option value="personal">Personal thumb–pinky evidence</option></select></label>
 <p class="help">This changes only a later, explicitly requested calculation. Your current score and saved fingerings stay in place. Untested placements and other finger pairs keep the baseline model.</p>
 <details><summary>Earlier reports & model limits</summary><div data-calibration-diagnostics></div>${UNASSIGNED_SPAN_REPORTS.map(s=>`<p class="help">${esc(s)}</p>`).join('')}<p class="help">Those reports are retained without assigning them to either hand. A supported chord is a different test from this two-contact pair. The keyboard model uses normalized key columns and row depth; actual hardware dimensions and the rest of hand anatomy are not measured here.</p></details>
 <div class="dialog-actions"><button data-calibration-export>Export calibration</button><button data-calibration-close>Done <kbd>Esc</kbd></button></div>`;
 const form = dialog.querySelector<HTMLFormElement>('form')!, status = dialog.querySelector<HTMLElement>('.calibration-status')!;
 const field = <T extends HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(name:string) => form.elements.namedItem(name) as T;
 const placement = () => {
  const thumb = Number(field('thumbPitch').value), pinky = Number(field('pinkyPitch').value), span = Math.abs(pinky-thumb);
  dialog.querySelector<HTMLElement>('.placement')!.textContent = `Span ${span.toString(12).toUpperCase()} · ${span} semitones. Thumb: row ${copyRow(thumb,Number(field('thumbCopy').value) as 1|2)}; pinky: row ${copyRow(pinky,Number(field('pinkyCopy').value) as 1|2)} (rows counted from you). Copy 1 is the nearer key for that pitch; copy 2 is the farther duplicate.`;
 };
 field<HTMLSelectElement>('hand').addEventListener('change',()=>{const a=field<HTMLSelectElement>('thumbPitch'),b=field<HTMLSelectElement>('pinkyPitch');if((field('hand').value==='LH'&&Number(a.value)<Number(b.value))||(field('hand').value==='RH'&&Number(a.value)>Number(b.value))){const old=a.value;a.value=b.value;b.value=old;}});
 form.addEventListener('change',()=>{placement();const rating=form.querySelector<HTMLInputElement>('input[name=rating]:checked')?.value;if(field('boundary').value&&rating&&rating!=='comfortable'){status.textContent='Recorded as reach or uncertainty evidence; this will not become a comfortable limit.';}else status.textContent='';}); placement();
 const summary = async () => {
  dialog.querySelector<HTMLSelectElement>('[data-calibration-profile]')!.value = value.selection;
  dialog.querySelector<HTMLElement>('.calibration-observations')!.innerHTML = value.record.observations.length ? value.record.observations.map(q=>{
   return `<p class="calibration-observation"><strong>${q.hand??'Unassigned'} · ${esc(q.rating.replaceAll('-',' '))}${q.excluded?' · withdrawn':''}</strong><br><small>${q.contacts.map(c=>`${c.finger}: ${pitchText(c.pitch)}, copy ${c.copy}`).map(esc).join(' · ')} · ${esc(q.task)}${q.boundary?` · ${q.boundary}`:''} · ${esc(q.repetition)}</small>${q.notes?`<br><small>${esc(q.notes)}</small>`:''}<button type="button" data-calibration-withdraw="${esc(q.id)}" ${loadError?'disabled':''}>${q.excluded?'Include again':'Withdraw'}</button></p>`;
  }).join('') : '<p class="help">No placements tested yet. Each hand and key-copy combination starts unknown.</p>';
  const {compiled,profileDiagnostics} = await calibrationDetails(value);
  if (!dialog.isConnected) return;
  const diagnostics = [...compiled.diagnostics,...profileDiagnostics];
  dialog.querySelector<HTMLElement>('[data-calibration-diagnostics]')!.innerHTML=diagnostics.map(q=>`<p class="help">${esc(q.message)}</p>`).join('');
  dialog.querySelector<HTMLElement>('.calibration-evidence')!.textContent = `${value.record.observations.filter(q=>q.hand==='LH').length} left-hand · ${value.record.observations.filter(q=>q.hand==='RH').length} right-hand observations. ${compiled.bands.length?'Comfortable limits guide matching placements only; intermediate spans are not certified.':'No comfortable limit measured yet; samples remain saved.'}${profileDiagnostics.length?' See model limits for a preference conflict.':''}`;
 };
 form.addEventListener('submit', async event => {
  event.preventDefault(); if(loadError)return;
  const save = form.querySelector<HTMLButtonElement>('[type=submit]')!; save.disabled=true;
  try {
   const observation: SpanCalibrationObservation = {
    id:crypto.randomUUID(), hand:field('hand').value as 'LH'|'RH', task:'two-contact',
    rating:(form.querySelector<HTMLInputElement>('input[name=rating]:checked')?.value ?? 'unsure') as SpanCalibrationObservation['rating'],
    boundary:(field('boundary').value || null) as SpanCalibrationObservation['boundary'], repetition:field('repetition').value as SpanCalibrationObservation['repetition'],
    contacts:[{finger:1,pitch:Number(field('thumbPitch').value),copy:Number(field('thumbCopy').value) as 1|2},{finger:5,pitch:Number(field('pinkyPitch').value),copy:Number(field('pinkyCopy').value) as 1|2}],
    notes:field<HTMLTextAreaElement>('notes').value.trim() || undefined,
    testedAt:new Date().toISOString(),
   };
   value=await hooks.save(addObservation(value,observation));
   await summary(); status.textContent='Saved locally. Your current score and fingerings are unchanged.';
   form.querySelector<HTMLInputElement>('input[name=rating]:checked')!.checked=false;
   field('notes').value=''; field('boundary').value='';
   field<HTMLSelectElement>('thumbPitch').focus();
  } catch(error) {status.textContent=(error as Error).message;}
  finally {save.disabled=false;}
 });
 dialog.querySelector<HTMLSelectElement>('[data-calibration-profile]')!.addEventListener('change',async event=>{
  const control=event.target as HTMLSelectElement;control.disabled=true;
  try{value=await hooks.save({...value,selection:control.value as ViewerCalibration['selection']});status.textContent=`${value.selection==='personal'?'Personal evidence':'Baseline model'} selected for your next explicit calculation. No calculation started.`;}
  catch(error){control.value=value.selection;status.textContent=(error as Error).message;}finally{control.disabled=false;}
 });
 dialog.querySelector('.calibration-observations')!.addEventListener('click',async event=>{const control=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-calibration-withdraw]');if(!control||loadError)return;control.disabled=true;try{value=await hooks.save({...value,record:{...value.record,observations:value.record.observations.map(q=>q.id===control.dataset.calibrationWithdraw?{...q,excluded:!q.excluded}:q)}});await summary();status.textContent='Evidence updated; original observations retained. Current fingerings unchanged.';}catch(error){status.textContent=(error as Error).message;control.disabled=false;}});
 dialog.querySelector('[data-calibration-export]')!.addEventListener('click',()=>{void hooks.export().catch(error=>status.textContent=error.message);});
 dialog.querySelector('[data-calibration-close]')!.addEventListener('click',hooks.close);
 arrangeDialogNavigation(dialog,dialog.querySelector<HTMLButtonElement>('[data-calibration-close]'));
 void summary().catch(error=>status.textContent=error.message);
 field<HTMLSelectElement>('hand').focus();
}
