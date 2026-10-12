import {arrangeBottomNavigation} from './application-navigation';
import './calibration-fingertips-style.css';
import {FINGERTIP_PAIRS,type FingertipHand,type FingertipInstrument,type FingertipMethod,type FingertipReference} from './calibration-fingertips';
import {FingertipController,type FingertipState} from './calibration-fingertips-controller';
import {renderFingertipIllustration,fingertipPlacementInstruction} from './calibration-fingertips-renderer';
export interface FingertipViewOptions {instrument:FingertipInstrument;noteNames:()=> 'iso'|'traditional';back:()=>void;options?:()=>void;hand?:FingertipHand;keyColors?:()=> 'five-seven'|'classic'}
export function mountFingertipCalibration(container:HTMLElement,controller:FingertipController,options:FingertipViewOptions){
 container.innerHTML=`<section class="fingertips"><header><div><p class="pair-count"></p><h1></h1></div><label class="hand-choice">Hand <select data-hand aria-label="Performing hand"><option value="RH">Right</option><option value="LH">Left</option></select></label><button data-options>Options <kbd>O</kbd></button></header><p class="instructions"></p><div class="body"><div class="art"></div><section class="panel"><div class="methods"><button data-method="percent">Percent</button><button data-method="millimeters">Millimeters</button></div><h2></h2><label class="entry-frame"><input type="text" inputmode="decimal" autocomplete="off" aria-label="Fingertip reading"><span class="unit"></span></label><label class="reference"><span data-reference-label></span><select data-reference aria-label="Primary finger"></select></label><p class="help"></p><p class="message" role="status" aria-live="polite"></p></section></div><footer><button data-back>Back <kbd>Esc</kbd></button><button data-previous>Previous <kbd>←</kbd></button><button data-next>Next <kbd>→</kbd></button><button data-save>Save & next <kbd>Enter</kbd></button></footer></section>`;
 const root=container.querySelector<HTMLElement>('.fingertips')!,get=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!,entry=get<HTMLInputElement>('input'),reference=get<HTMLSelectElement>('[data-reference]'),hand=get<HTMLSelectElement>('[data-hand]'),art=get<HTMLElement>('.art');
 const render=(s:FingertipState)=>{
  const names=FINGERTIP_PAIRS[s.pair],percent=s.method==='percent',other=names[s.reference==='first'?1:0];
  get('.pair-count').textContent=`Pair ${s.pair+1} of 4`;get('h1').textContent=names.join(' + ');hand.value=s.hand;
  get('.instructions').innerHTML=percent?`${fingertipPlacementInstruction(s.pair,s.hand,options.noteNames())}<br>${s.pair===0?'Keep both flat. Slide forward until one fingertip touches the wall.':'Keep both flat and slide until a fingertip meets the wall.'}`:'Keep both fingers straight, flat and parallel.<br>Use a ruler to measure the difference between their fingertips.';
  root.querySelectorAll<HTMLButtonElement>('[data-method]').forEach(b=>{b.hidden=s.instrument==='conventional-piano'&&b.dataset.method==='percent';b.setAttribute('aria-pressed',String(b.dataset.method===s.method));b.disabled=s.busy;});
  get('h2').textContent=percent?(s.reference==='both'?'Both reach their walls.':s.reference?`How far does your ${other.toLowerCase()}${other==='Thumb'?'':' finger'} reach?`:'Which finger touches the wall?'):'Difference in fingertip reach';
  const focused=document.activeElement===entry,start=entry.selectionStart,end=entry.selectionEnd;
  if(entry.value!==s.raw)entry.value=s.raw;
  entry.disabled=s.busy||s.readOnly||s.reference===null;entry.readOnly=s.reference==='both';entry.setAttribute('aria-label',percent?'Percentage reached by the other fingertip':'Difference in fingertip reach in millimeters');get('.unit').textContent=percent?'%':'mm';
  if(focused&&!entry.disabled&&start!==null&&end!==null)entry.setSelectionRange(start,end);
  const choices=s.pair===0?[['second',names[1]],['both',percent?'Both':'Equal']]:[['', 'Choose finger'],['first',names[0]],['second',names[1]],['both',percent?'Both':'Equal']];
  reference.replaceChildren(...choices.map(([value,label])=>{const o=document.createElement('option');o.value=value;o.textContent=label;return o;}));reference.value=s.reference??'';reference.disabled=s.busy||s.readOnly;hand.disabled=s.busy;
  get('[data-reference-label]').textContent=percent?'At the wall':'Reaches farther';
  get('.help').innerHTML=percent?'0% at the starting line.<br>100% at the wall.<br>Negative: before the line.':'Measure between the fingertip lines.<br>Decimals are fine.';
  get('.message').textContent=s.error??(s.busy?'Saving…':s.saved?'Reading saved.':'');get<HTMLButtonElement>('[data-save]').disabled=s.busy||s.readOnly;get<HTMLButtonElement>('[data-previous]').disabled=s.busy||s.pair===0;get<HTMLButtonElement>('[data-next]').disabled=s.busy||s.pair===3;
  renderFingertipIllustration(art,s,options.noteNames(),options.keyColors?.());
 };
 const unsubscribe=controller.subscribe(render);
 entry.oninput=()=>controller.setRaw(entry.value);
 reference.onchange=()=>{controller.selectReference((reference.value||null) as FingertipReference|null);if(!entry.disabled)entry.focus();};hand.onchange=()=>controller.setHand(hand.value as FingertipHand);
 root.querySelectorAll<HTMLButtonElement>('[data-method]').forEach(b=>b.onclick=()=>controller.selectMethod(b.dataset.method as FingertipMethod));
 get<HTMLButtonElement>('[data-options]').hidden=!options.options;get<HTMLButtonElement>('[data-options]').onclick=()=>{controller.break();options.options?.();};
 const back=()=>{controller.break();options.back();};get<HTMLButtonElement>('[data-back]').onclick=back;get<HTMLButtonElement>('[data-previous]').onclick=()=>controller.move(-1);get<HTMLButtonElement>('[data-next]').onclick=()=>controller.move(1);get<HTMLButtonElement>('[data-save]').onclick=()=>void controller.saveAndNext();
 arrangeBottomNavigation(get<HTMLElement>('footer'),get<HTMLButtonElement>('[data-back]'),options.options?get<HTMLButtonElement>('[data-options]'):null);
 const held=new Set<string>();let disposed=false;
 return {
  key(event:KeyboardEvent,type?:'key-down'|'key-up'):boolean {
   const key=event.key.toLowerCase(),command=['arrowleft','arrowright','enter','escape','o'].includes(key);
   if(event.type==='keyup'||type==='key-up'){held.delete(key);return command;}
   if(disposed||event.shiftKey||event.altKey||event.ctrlKey||event.metaKey)return false;
   if(!command)return false;
   if(event.type!=='keydown')return false;
   if((event.target as HTMLElement|null)?.closest('select')&&['enter','o'].includes(key))return false;
   if(key==='o'&&document.activeElement===entry)return false;
   event.preventDefault();if(event.repeat||held.has(key))return true;held.add(key);
   if(key==='escape')back();else if(key==='arrowleft')controller.move(-1);else if(key==='arrowright')controller.move(1);else if(key==='enter')void controller.saveAndNext();else if(key==='o'&&options.options){controller.break();options.options();}return true;
  },
  break(){held.clear();controller.break();},flush(){return controller.flush();},dispose(){disposed=true;held.clear();unsubscribe();container.replaceChildren();},
 };
}
