import {workHeadingMarkup} from './score-catalog';
import {annotationInkPolicyFor,footerFontNoticeUrl} from './annotation-ink-policy';
import {scoreCapabilities} from './score-capabilities';
import {manualTempoField} from './manual-tempo-control';
import type {ScorePackage} from './package';
import type {Entry,PersonalState} from './state';
import {personalCorrectionCount} from './state';
import {readingNotationControl} from './reading-notation-control';

const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const button=(label:string,action:string,disabled=false)=>`<button type="button" data-action="${action}"${disabled?' disabled':''}>${label}</button>`;

/** Shared reader/practice Score section. Only provenance is a disclosure. */
/** The score's performance tempo; main fills the value once it is resolved. */
const tempoRow=(shown:boolean)=>shown?`<div class="option-setting score-tempo-setting" data-options-row><span>Tempo</span><div class="score-tempo-fields"><span class="score-tempo-value" data-score-tempo-value>…</span>${button('Hear and set','score-tempo')}</div></div>`:'';
export function scoreOptionsMarkup(entry:Entry,p:ScorePackage,s:PersonalState,transpose:{steps:number;min:number;max:number;error?:string},job?:{state:string;progress:string},instrumentControl='',pdf=false,tempo=false){
 const pdfAction=pdf?button('Save as PDF','pdf'):'';
 if(!scoreCapabilities(p).pianoPreparation)return `<section class="score-options" aria-labelledby="score-options-heading">
  <header class="score-options-heading"><h3 id="score-options-heading">Score</h3><p>${workHeadingMarkup(entry.metadata)}</p></header>
  ${instrumentControl?`<label class="option-setting" data-options-row><span>Instrument</span>${instrumentControl}</label>`:''}
  ${p.reading?.dual?`<label class="option-setting" data-options-row><span>Notation</span>${readingNotationControl(p)}</label>`:'<p class="help">Read the score with its notes, rhythm and articulations.</p>'}
  ${tempoRow(tempo)}
  <div class="dialog-actions score-primary-actions" data-options-row>${button('Share score','share')}${pdfAction}</div>
  <details class="score-source-review"><summary>Source & review</summary>
   ${p.manifest.metadata.provenance.map(text=>`<p class="help">${escape(text)}</p>`).join('')}
  </details>
 </section>`;
 const corrections=personalCorrectionCount(s),busy=job?.state==='working'||job?.state==='installing',disabled=busy||!!transpose.error;
 let field=manualTempoField('transpose',`<input type="text" inputmode="numeric" data-score-transpose aria-label="Transpose, steps" value="${transpose.steps}" data-min="${transpose.min}" data-max="${transpose.max}"${disabled?' disabled':''}>`,'transpose','steps');
 if(disabled)field=field.replaceAll('<button type="button"','<button type="button" disabled');
 const primary=button('Share score','share')+pdfAction;
 const hasShared=Object.entries(s.memoryResolved?.choices??{}).some(([id,choice])=>choice.finger!==null&&!s.calculatedOwners?.[id]);
 const correctionActions=(corrections?button('Export corrections','feedback'):'')+(corrections||hasShared?button('Restore all','restore-all'):'')+(s.undo||s.undoAssignments||s.undoCalculatedOwners?button('Undo restore','undo-restore'):'');
 const retainedActions=(entry.retainedPackages?.some(file=>file!==entry.file)?button('Earlier editions','earlier-editions'):'')+(entry.presentations?.length?button('Restore previous header','restore-header'):'');
 const guidance=[p.calculatedHandReceipt?'Hands come from this saved edition and from your own choices.':'Hands come from the score and from your own choices.',
  p.fingerLayer?'Fingers come from the edition and from your own choices.':transpose.steps?'Fingers come from your own choices; the edition’s printed fingerings stay with the score at its original pitch.':'Fingers come from your own choices.',
  'When you transpose, your own choices move with their notes.'].join(' ');
 return `<section class="score-options" aria-labelledby="score-options-heading">
  <header class="score-options-heading"><h3 id="score-options-heading">Score</h3><p>${workHeadingMarkup(entry.metadata)}</p></header>
  <label class="option-setting score-transpose-setting" data-options-row><span>Transpose</span>${field}</label>
  <p class="control-error score-setting-help" data-transpose-error role="alert">${escape(transpose.error??'')}</p>
  ${tempoRow(tempo)}
  <div class="dialog-actions score-primary-actions" data-options-row>${primary}</div>
  ${!p.fingerEligibility.eligible&&p.fingerLayer?'<p class="help">Finger choices use annotations for this score.</p>':''}
  ${busy&&job?.progress?`<p class="job" role="status">${escape(job.progress)}</p>`:''}
  <div class="score-corrections"><p>${corrections} personal correction${corrections===1?'':'s'}</p><div class="dialog-actions" data-options-row>${correctionActions}</div></div>
  ${retainedActions?`<div class="dialog-actions score-edition-actions" data-options-row>${retainedActions}</div>`:''}
  <details class="score-source-review"><summary>Source & review</summary>
   <p class="help">${guidance} Your saved choices are guarded.</p>
   ${annotationInkPolicyFor(p)?`<p class="help"><a href="${escape(footerFontNoticeUrl)}" target="_blank" rel="noopener">Score font license</a></p>`:''}
   ${p.manifest.metadata.provenance.map(text=>`<p class="help">${escape(text)}</p>`).join('')}
  </details>
 </section>`;
}

export function transposeDraft(text:string,min:number,max:number):number {
 if(!/^[+-]?\d+$/.test(text.trim()))throw Error('Enter a whole number of steps.');
 const steps=Number(text.trim());
 if(!Number.isSafeInteger(steps)||steps<min||steps>max)throw Error(`Choose from ${min} to ${max} steps for this score.`);
 return Object.is(steps,-0)?0:steps;
}
