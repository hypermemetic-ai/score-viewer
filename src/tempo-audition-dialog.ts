import {metronomeMark,beatUnitLabel,tempoRateNumber} from './metronome-mark';
import {TempoRepeat} from './tempo-repeat';
import {playingTimeLabel,scoreTempoOriginText,stepTempo,MIN_SCORE_TEMPO,MAX_SCORE_TEMPO,type Beat,type ScoreTempo} from './score-tempo';
import type {Audition,AuditionVoice} from './tempo-audition';

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
 voice?:AuditionVoice;
 /** The piano is installed but off: offer to turn it on. */
 offerPiano?:boolean;
 /** Why the piano is not playing. */
 voiceNote?:string;
}
const BUILT_IN='A simple built-in piano plays this preview.',PIANO='Your piano plays this preview.',STAYS_ON='It stays on; turn it off in Options › Piano.';
const voiceText=(view:TempoAuditionView)=>view.voice==='piano'?PIANO:view.voiceNote?`${view.voiceNote} ${BUILT_IN}`:BUILT_IN;
/** Proper English ordinals: 1st, 2nd, 3rd, 11th, 21st, 112th. */
export const ordinal=(n:number)=>{const tens=n%100,ones=n%10;return `${n}${tens>=11&&tens<=13?'th':ones===1?'st':ones===2?'nd':ones===3?'rd':'th'}`;};
/** What Enter keeps, said plainly: the piece tempo, and what happens to practice's goal. */
export function tempoKeepText(view:Pick<TempoAuditionView,'practiceGoal'|'setsPracticeGoal'>):string {
 if(view.practiceGoal!==undefined)return `Enter keeps the piece tempo. Practice keeps its goal of ${tempoRateNumber(view.practiceGoal)}; change that in practice Options.`;
 return view.setsPracticeGoal?'Enter keeps it as the piece tempo and your practice goal.':'Enter keeps it as the piece tempo.';
}
/** Installed but off: the offer is the Options › Piano switch, and says it stays on. */
export const tempoOfferMarkup=()=>`<p class="help tempo-audition-offer" data-tempo-offer>Your piano is installed and turned off. <button type="button" data-tempo-action="piano">Turn on your piano</button> ${STAYS_ON}</p>`;
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
  <p class="help tempo-audition-sound">${escape(tempoKeepText(view))} <span data-tempo-voice>${escape(voiceText(view))}</span></p>
  ${view.offerPiano?tempoOfferMarkup():''}
 </div>
 <footer class="options-footer tempo-audition-footer"><button type="button" data-tempo-action="back">Back <kbd class="escape-hint">Esc</kbd></button><button type="button" data-tempo-action="confirm">${escape(view.confirmLabel)} <kbd>Enter</kbd></button></footer>`;
}

export interface TempoAuditionControl {
 dialog:HTMLElement;audition:Audition;view:TempoAuditionView;
 confirm(bpm:number):void;cancel():void;
 /** Turn the installed piano on (as in Options › Piano: it stays on) and play on it. */
 usePiano?(bpm:number):Promise<Audition>;
 /** Whether the piano is installed but off, known after the dialog opens: the
  * preview starts at once and the offer joins it when the answer arrives. */
 offerPiano?:Promise<boolean>;
 /** The built-in voice, when the piano cannot start. */
 fallback?(bpm:number):Audition;
 timers?:{set(fn:()=>void,ms:number):unknown;clear(id:unknown):void};repeat?:TempoRepeat;
 /** The written bar now playing (as the reader numbers it), or undefined when nothing plays. */
 follow?(bar:number|undefined):void;
}
/** Wires the dialog; returns a disposer. The dialog owns its keys while open. */
export function mountTempoAudition(control:TempoAuditionControl):()=>void {
 const {dialog,view}=control,timers=control.timers??{set:(fn:()=>void,ms:number)=>setInterval(fn,ms),clear:(id:unknown)=>clearInterval(id as ReturnType<typeof setInterval>)};
 const repeat=control.repeat??new TempoRepeat(),root=dialog.querySelector<HTMLElement>('[data-tempo-audition]')!;
 const q=(name:string)=>dialog.querySelector<HTMLElement>(`[data-tempo-${name}]`)!;
 let audition=control.audition,changed=false,soundError='',disposed=false;
 const paintRate=()=>{q('rate').innerHTML=mark(audition.bpm,view.beat);q('rate').dataset.bpm=String(audition.bpm);q('length').textContent=`The whole piece takes about ${playingTimeLabel(audition.seconds)}.`;if(changed)q('origin').textContent='Your choice';
  const compare=dialog.querySelector<HTMLElement>('[data-tempo-compare]');if(compare&&view.practiceGoal!==undefined)compare.textContent=`Piece tempo ${tempoRateNumber(audition.bpm)} · practice goal ${tempoRateNumber(view.practiceGoal)}`;};
 let followed:number|undefined;const follow=(bar:number|undefined)=>{if(bar===followed)return;followed=bar;control.follow?.(bar);};
 const paintStatus=()=>{
  for(const key of dialog.querySelectorAll<HTMLElement>('[data-tempo-sound-key]'))key.hidden=!!soundError;
  if(soundError){q('status').textContent=soundError;return;}
  const p=audition.position(),pass=p.pass>1?` · ${ordinal(p.pass)} time`:'';let text='';
  if(p.phase==='count-in')text=`Count-in · ${p.countBeat}`;
  else if(p.phase==='playing')text=`Playing · measure ${p.measure} of ${p.measures}${pass}`;
  else if(p.phase==='paused')text=`Paused at measure ${p.measure}${pass} · Space continues`;
  else if(p.phase==='finished')text='Finished · Space plays it again';
  else if(audition.failure)text=`${audition.failure} · Space plays it again`;
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
 const message=(error:unknown)=>String((error as Error)?.message??error).replace(/\.$/,'');
 const begin=(candidate:Audition):Promise<void>=>candidate.open().then(()=>{if(disposed||audition!==candidate)return;candidate.play();paintStatus();},error=>{
  if(disposed||audition!==candidate)return;
  if(candidate.voice==='piano'&&control.fallback){
   audition=control.fallback(candidate.bpm);void candidate.close();
   q('voice').textContent=`The piano could not start: ${message(error)}. ${BUILT_IN}`;return begin(audition);
  }
  soundError=`${message(error)}. ← → still set the tempo.`;paintStatus();
 });
 const usePiano=async(button:HTMLButtonElement)=>{
  if(!control.usePiano||button.disabled)return;
  button.disabled=true;q('voice').textContent='Turning on your piano…';
  try{
   const next=await control.usePiano(audition.bpm);await next.open();
   if(disposed){void next.close();return;}
   const old=audition;audition=next;soundError='';void old.close();
   dialog.querySelector<HTMLElement>('[data-tempo-offer]')?.remove();root.focus();
   q('voice').textContent=`Your piano is on and plays this preview. ${STAYS_ON}`;audition.play();paintStatus();
  }catch(error){if(disposed)return;button.disabled=false;q('voice').textContent=`The piano could not start: ${message(error)}. ${BUILT_IN}`;}
 };
 const click=(e:Event)=>{const target=(e.target as HTMLElement).closest<HTMLElement>('[data-tempo-action]'),action=target?.dataset.tempoAction;if(action==='confirm')control.confirm(audition.bpm);else if(action==='back')control.cancel();else if(action==='piano')void usePiano(target as HTMLButtonElement);};
 dialog.addEventListener('keydown',keydown);dialog.addEventListener('keyup',keyup);dialog.addEventListener('click',click);window.addEventListener('blur',blur);
 root.setAttribute('aria-description',`Tempo counted in ${beatUnitLabel(view.beat)} notes per minute`);
 root.focus();paintRate();
 const ticker=timers.set(paintStatus,100);
 void begin(audition);
 void control.offerPiano?.then(installed=>{
  if(!installed||disposed||audition.voice==='piano'||dialog.querySelector('[data-tempo-offer]'))return;
  q('voice').closest('p')!.insertAdjacentHTML('afterend',tempoOfferMarkup());
 },()=>{});
 return ()=>{if(disposed)return;disposed=true;timers.clear(ticker);repeat.cancel();window.removeEventListener('blur',blur);follow(undefined);dialog.removeEventListener('keydown',keydown);dialog.removeEventListener('keyup',keyup);dialog.removeEventListener('click',click);void audition.close();};
}
