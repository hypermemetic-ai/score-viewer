import {metronomeMark,beatUnitLabel,tempoRateNumber} from './metronome-mark';
import {TempoRepeat} from './tempo-repeat';
import {playingTimeLabel,scoreTempoOriginText,stepTempo,MIN_SCORE_TEMPO,MAX_SCORE_TEMPO,type Beat,type ScoreTempo} from './score-tempo';
import type {TempoAudition} from './tempo-audition';

/* Hear and set: the piece plays after a count-in, ← → change the tempo while it
 * plays, Enter keeps it and Esc leaves everything as it was. */

const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const mark=(bpm:number,beat:Beat)=>metronomeMark({version:'reference-performance-tempo-v1',bpm,beat,provenance:{kind:'editorial',reference:'Score Viewer tempo audition'}},bpm);

export interface TempoAuditionView {
 heading:string;tempo?:ScoreTempo;beat:Beat;bpm:number;confirmLabel:string;silent?:boolean;
 /** Practice's own goal on the counted beat; Enter here leaves it unchanged. */
 practiceGoal?:number;
 /** Practice opened the flow and has no goal yet: Enter sets both. */
 setsPracticeGoal?:boolean;
}
const ordinal=(n:number)=>n===2?'2nd':n===3?'3rd':`${n}th`;
/** What Enter keeps, said plainly: the piece tempo, and what happens to practice's goal. */
export function tempoKeepText(view:Pick<TempoAuditionView,'practiceGoal'|'setsPracticeGoal'>):string {
 if(view.practiceGoal!==undefined)return `Enter keeps the piece tempo. Practice keeps its goal of ${tempoRateNumber(view.practiceGoal)}; change that in practice Options.`;
 return view.setsPracticeGoal?'Enter keeps it as the piece tempo and your practice goal.':'Enter keeps it as the piece tempo.';
}
export function tempoAuditionMarkup(view:TempoAuditionView):string {
 const origin=view.tempo?scoreTempoOriginText(view.tempo):'This score doesn’t say how fast it goes. Listen, and change it until it sounds right.';
 return `<h2 id="tempo-audition-title">Tempo</h2>
 <div class="tempo-audition" tabindex="-1" data-tempo-audition aria-labelledby="tempo-audition-title">
  <p class="tempo-audition-work">${view.heading}</p>
  <p class="tempo-audition-origin" data-tempo-origin>${escape(origin)}</p>
  <p class="tempo-audition-rate" data-tempo-rate aria-live="polite">${mark(view.bpm,view.beat)}</p>
  <p class="tempo-audition-length" data-tempo-length></p>${view.practiceGoal!==undefined?`
  <p class="tempo-audition-compare" data-tempo-compare></p>`:''}
  <p class="tempo-audition-status" data-tempo-status role="status">${view.silent?'':'Starting…'}</p>
  <p class="tempo-audition-keys"><span><kbd>←</kbd><kbd>→</kbd> Slower / faster</span><span data-tempo-sound-key><kbd>Space</kbd> <span data-tempo-space>Pause</span></span><span data-tempo-sound-key><kbd>Home</kbd> From the start</span></p>
  <p class="help tempo-audition-sound">${escape(tempoKeepText(view))} A simple built-in piano plays this preview.</p>
 </div>
 <footer class="options-footer tempo-audition-footer"><button type="button" data-tempo-action="back">Back <kbd class="escape-hint">Esc</kbd></button><button type="button" data-tempo-action="confirm">${escape(view.confirmLabel)} <kbd>Enter</kbd></button></footer>`;
}

export interface TempoAuditionControl {
 dialog:HTMLElement;audition:TempoAudition;view:TempoAuditionView;
 confirm(bpm:number):void;cancel():void;
 timers?:{set(fn:()=>void,ms:number):unknown;clear(id:unknown):void};repeat?:TempoRepeat;
 /** The written bar now playing (as the reader numbers it), or undefined when nothing plays. */
 follow?(bar:number|undefined):void;
}
/** Wires the dialog; returns a disposer. The dialog owns its keys while open. */
export function mountTempoAudition(control:TempoAuditionControl):()=>void {
 const {dialog,audition,view}=control,timers=control.timers??{set:(fn:()=>void,ms:number)=>setInterval(fn,ms),clear:(id:unknown)=>clearInterval(id as ReturnType<typeof setInterval>)};
 const repeat=control.repeat??new TempoRepeat(),root=dialog.querySelector<HTMLElement>('[data-tempo-audition]')!;
 const q=(name:string)=>dialog.querySelector<HTMLElement>(`[data-tempo-${name}]`)!;
 let changed=false,soundError='',disposed=false;
 const paintRate=()=>{q('rate').innerHTML=mark(audition.bpm,view.beat);q('rate').dataset.bpm=String(audition.bpm);q('length').textContent=`The whole piece takes about ${playingTimeLabel(audition.seconds)}.`;if(changed)q('origin').textContent='Your choice';
  const compare=dialog.querySelector<HTMLElement>('[data-tempo-compare]');if(compare&&view.practiceGoal!==undefined)compare.textContent=`Piece tempo ${tempoRateNumber(audition.bpm)} · practice goal ${tempoRateNumber(view.practiceGoal)}`;};
 let followed:number|undefined;const follow=(bar:number|undefined)=>{if(bar===followed)return;followed=bar;control.follow?.(bar);};
 const paintStatus=()=>{
  if(soundError){q('status').textContent=soundError;for(const key of dialog.querySelectorAll<HTMLElement>('[data-tempo-sound-key]'))key.hidden=true;return;}
  const p=audition.position(),pass=p.pass>1?` · ${ordinal(p.pass)} time`:'';let text='';
  if(p.phase==='count-in')text=`Count-in · ${p.countBeat}`;
  else if(p.phase==='playing')text=`Playing · measure ${p.measure} of ${p.measures}${pass}`;
  else if(p.phase==='paused')text=`Paused at measure ${p.measure}${pass} · Space continues`;
  else if(p.phase==='finished')text='Finished · Space plays it again';
  follow(p.phase==='playing'||p.phase==='paused'||p.phase==='count-in'?p.measure:undefined);
  q('status').textContent=text;q('status').dataset.phase=p.phase;
  q('space').textContent=p.phase==='paused'?'Continue':p.phase==='count-in'||p.phase==='playing'?'Pause':'Play';
 };
 const adjust=(direction:1|-1)=>{const next=stepTempo(audition.bpm,direction);if(next===audition.bpm||next<MIN_SCORE_TEMPO||next>MAX_SCORE_TEMPO)return false;audition.setBpm(next);changed=true;paintRate();return true;};
 const toggle=()=>{if(soundError)return;const phase=audition.phase;if(phase==='paused')audition.resume();else if(phase==='count-in'||phase==='playing')audition.pause();else audition.play();paintStatus();};
 const buttonFocused=()=>!!(document.activeElement as HTMLElement|null)?.closest?.('button')&&dialog.contains(document.activeElement);
 const keydown=(e:KeyboardEvent)=>{
  if(e.ctrlKey||e.altKey||e.metaKey)return;
  const code=e.code;
  if(code==='ArrowLeft'||code==='ArrowRight'){e.preventDefault();e.stopPropagation();const direction=code==='ArrowRight'?1:-1;if(!e.repeat)repeat.begin(code,()=>adjust(direction));return;}
  if(code==='ArrowUp'||code==='ArrowDown'){e.preventDefault();e.stopPropagation();return;}
  // A focused button keeps Enter and Space, as everywhere in the viewer.
  if((code==='Space'||code==='Enter'||code==='NumpadEnter')&&buttonFocused())return;
  if(code==='Space'){e.preventDefault();e.stopPropagation();if(!e.repeat)toggle();return;}
  if(code==='Home'){e.preventDefault();e.stopPropagation();if(!e.repeat&&!soundError){audition.play();paintStatus();}return;}
  if(code==='Enter'||code==='NumpadEnter'){e.preventDefault();e.stopPropagation();if(!e.repeat)control.confirm(audition.bpm);return;}
  if(code==='Escape'){e.preventDefault();e.stopPropagation();if(!e.repeat)control.cancel();}
 };
 const keyup=(e:KeyboardEvent)=>repeat.release(e.code);
 // A held arrow stops when the window loses focus; its key-up never arrives.
 const blur=()=>repeat.cancel();
 const click=(e:Event)=>{const action=(e.target as HTMLElement).closest<HTMLElement>('[data-tempo-action]')?.dataset.tempoAction;if(action==='confirm')control.confirm(audition.bpm);else if(action==='back')control.cancel();};
 dialog.addEventListener('keydown',keydown);dialog.addEventListener('keyup',keyup);dialog.addEventListener('click',click);window.addEventListener('blur',blur);
 root.setAttribute('aria-description',`Tempo counted in ${beatUnitLabel(view.beat)} notes per minute`);
 root.focus();paintRate();
 const ticker=timers.set(paintStatus,100);
 void audition.open().then(()=>{if(disposed)return;audition.play();paintStatus();},error=>{if(disposed)return;soundError=`${(error as Error).message} ← → still set the tempo.`;paintStatus();});
 return ()=>{if(disposed)return;disposed=true;timers.clear(ticker);repeat.cancel();window.removeEventListener('blur',blur);follow(undefined);dialog.removeEventListener('keydown',keydown);dialog.removeEventListener('keyup',keyup);dialog.removeEventListener('click',click);void audition.close();};
}
