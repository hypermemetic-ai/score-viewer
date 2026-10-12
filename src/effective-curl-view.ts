import {EFFECTIVE_CURL_REFINEMENT_CONTRACT,type EffectiveCurlFinger,type EffectiveCurlHingeAssumption,type EffectiveCurlMeasurementMethod} from '@hypermemetic-ai/fingering-calculator';
import {arrangeBottomNavigation} from './application-navigation';
import {actionCode} from './input';
import {OptionsNavigation} from './options-navigation';
import {CurlController,currentCurl,exportCurl,loadCurl,type CurlFiles,type CurlHand,type CurlState} from './effective-curl-refinements';
import './effective-curl-style.css';

export interface EffectiveCurlEditorOptions {files:CurlFiles;playerId:string;hand:CurlHand;back:()=>void}
const names:Record<EffectiveCurlFinger,string>={2:'Index',3:'Middle',4:'Ring',5:'Pinky'};
export function curlEstimateDescription(assumption:EffectiveCurlHingeAssumption):string {
 const basis=assumption.basis;
 if(basis.kind==='population-proportion')return`Population proportion · ${basis.externalFingerLengthMm} mm external finger length (${basis.externalLengthStatus}), proximal flexion crease to fingertip × ${basis.proportion}. PIP crease proxy. Source: ${basis.sourceReference}.${basis.proportionSd===null?'':' Proportion SD: '+basis.proportionSd+'.'}`;
 if(basis.kind==='anatomical-template')return`Anatomical template · ${basis.templateId}, version ${basis.templateVersion}. Effective internal hinge to fingertip. Reference: ${basis.reference}.`;
 return`Fitted geometry · ${basis.fitId}, model ${basis.modelVersion}. Effective internal hinge to fingertip. Source sessions: ${basis.sourceStretchSessionIds.join(', ')}.`;
}
/** Optional companion evidence. This editor does not alter stretch collection or its progress. */
export function mountEffectiveCurlEditor(container:HTMLElement,options:EffectiveCurlEditorOptions){
 container.innerHTML=`<section class="effective-curl"><header><h1>Effective curl length</h1><p>Optional ruler readings · ${options.hand==='LH'?'Left':'Right'} hand</p></header><p class="curl-introduction">Measure the outer section of a finger. These readings refine its geometry; they do not add stretch ratings.</p><div class="curl-body"><nav class="curl-fingers" aria-label="Finger"><div class="curl-group-label">Fingers</div>${EFFECTIVE_CURL_REFINEMENT_CONTRACT.fingers.map(f=>`<button type="button" data-curl-finger="${f}" aria-pressed="${f===2}"><span>${names[f]}</span><span data-curl-summary="${f}">No reading</span></button>`).join('')}</nav><section class="curl-panel"><h2>Index</h2><div class="curl-reference"><p class="curl-estimate"></p><p class="curl-estimate-basis"></p><p class="curl-current"></p></div><div class="curl-fields"><div data-options-row><span class="curl-field-label">Method</span><div class="curl-methods"><button type="button" data-curl-method="bent-section-effective" aria-pressed="true">Bent section</button><button type="button" data-curl-method="pip-crease-to-tip" aria-pressed="false">PIP crease to tip</button></div></div><p class="curl-method-help"></p><div class="curl-numbers" data-options-row><label>Length<div class="curl-entry-frame"><input type="text" inputmode="decimal" autocomplete="off" data-curl-length aria-label="Personal effective curl length in millimeters"><span>mm</span></div></label><label>Uncertainty <span class="curl-optional">optional</span><div class="curl-entry-frame"><input type="text" inputmode="decimal" autocomplete="off" data-curl-uncertainty aria-label="Effective curl measurement uncertainty in millimeters"><span>mm</span></div></label></div><p class="curl-endpoints">Both methods use external landmarks. Neither locates the internal joint centre.</p><label class="curl-notes" data-options-row>Notes <span class="curl-optional">optional</span><input type="text" data-curl-notes aria-label="Effective curl reading notes"></label><div class="curl-personal-actions" data-options-row><button type="button" data-curl-save>Save reading <kbd>Enter</kbd></button><button type="button" data-curl-retract>Withdraw current reading</button></div></div><p class="curl-message" role="status" aria-live="polite">Loading saved readings…</p></section></div><footer><button type="button" data-curl-back>Back <kbd>Esc</kbd></button><p class="curl-navigation-hint">Choose finger <kbd>↑</kbd><kbd>↓</kbd> · Edit <kbd>→</kbd></p></footer></section>`;
 const root=container.querySelector<HTMLElement>('.effective-curl')!,get=<T extends HTMLElement=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!,length=get<HTMLInputElement>('[data-curl-length]'),uncertainty=get<HTMLInputElement>('[data-curl-uncertainty]'),notes=get<HTMLInputElement>('[data-curl-notes]');
 const fingerButtons=[...root.querySelectorAll<HTMLButtonElement>('[data-curl-finger]')],methodButtons=[...root.querySelectorAll<HTMLButtonElement>('[data-curl-method]')],save=get<HTMLButtonElement>('[data-curl-save]'),retract=get<HTMLButtonElement>('[data-curl-retract]'),back=get<HTMLButtonElement>('[data-curl-back]');
 let controller:CurlController|undefined,unsubscribe:(()=>void)|undefined,navigation:OptionsNavigation|undefined,disposed=false,loading=true;
 const held=new Set<string>();
 const setField=(input:HTMLInputElement,value:string)=>{if(input.value!==value)input.value=value;};
 const render=(state:CurlState)=>{
  const selected=currentCurl(state.document,state.finger);get('h2').textContent=names[state.finger];
  for(const button of fingerButtons){const f=Number(button.dataset.curlFinger) as EffectiveCurlFinger,effective=currentCurl(state.document,f);button.setAttribute('aria-pressed',String(f===state.finger));button.disabled=state.busy;get(`[data-curl-summary="${f}"]`).textContent=effective.personal?`${effective.personal.hingeToTipMm} mm · personal`:effective.assumption?`${effective.assumption.hingeToTipMm} mm · estimate`:'No estimate or reading';}
  get('.curl-estimate').textContent=selected.assumption?`Supplied estimate: ${selected.assumption.hingeToTipMm} mm`:'Supplied estimate: unavailable';get('.curl-estimate-basis').textContent=selected.assumption?curlEstimateDescription(selected.assumption):'You can save a personal reading without an estimate.';
  get('.curl-current').textContent=selected.personal?`Current personal reading: ${selected.personal.hingeToTipMm} mm · ${selected.personal.method==='bent-section-effective'?'bent section':'PIP crease to tip'}${selected.personal.uncertaintyMm===null?' · uncertainty unknown':` · ±${selected.personal.uncertaintyMm} mm`}`:'No personal reading recorded.';
  setField(length,state.draft.length);setField(uncertainty,state.draft.uncertainty);setField(notes,state.draft.notes);
  for(const button of methodButtons){button.setAttribute('aria-pressed',String(button.dataset.curlMethod===state.draft.method));button.disabled=state.busy||state.readOnly;}
  get('.curl-method-help').textContent=EFFECTIVE_CURL_REFINEMENT_CONTRACT.measurementMethods.find(method=>method.id===state.draft.method)!.instruction;
  for(const input of [length,uncertainty,notes])input.disabled=state.busy||state.readOnly;save.disabled=state.busy||state.readOnly;retract.disabled=state.busy||state.readOnly||!selected.personal;
  get('.curl-message').textContent=state.error??(state.busy?'Saving…':state.saved?'Reading saved.':'');root.dataset.readOnly=String(state.readOnly);
 };
 const goBack=()=>{held.clear();controller?.break();options.back();};back.onclick=goBack;
 arrangeBottomNavigation(get('footer'),back,null);
 for(const input of [length,uncertainty,notes])input.disabled=true;for(const button of [...fingerButtons,...methodButtons,save,retract])button.disabled=true;
 const ready=loadCurl(options.files).then(load=>{
  loading=false;if(disposed)return;
  controller=new CurlController({load,files:options.files,playerId:options.playerId,hand:options.hand});unsubscribe=controller.subscribe(render);
  navigation=new OptionsNavigation(root,()=>{},()=>false,{focusOnPrepare:false});fingerButtons[0].focus({preventScroll:true});
 }).catch(error=>{loading=false;if(!disposed)get('.curl-message').textContent=`Readings could not be opened: ${error instanceof Error?error.message:String(error)}.`;});
 length.oninput=()=>controller?.edit({length:length.value});uncertainty.oninput=()=>controller?.edit({uncertainty:uncertainty.value});notes.oninput=()=>controller?.edit({notes:notes.value});
 for(const button of fingerButtons){const select=()=>controller?.selectFinger(Number(button.dataset.curlFinger) as EffectiveCurlFinger);button.onfocus=select;button.onclick=()=>{select();if(!length.disabled)length.focus({preventScroll:true});};}
 for(const button of methodButtons)button.onclick=()=>controller?.edit({method:button.dataset.curlMethod as EffectiveCurlMeasurementMethod});
 save.onclick=()=>void controller?.save();retract.onclick=()=>void controller?.retract();
 return{
  key(event:KeyboardEvent,type?:'key-down'|'key-up'):boolean {
   const code=actionCode(event),up=event.type==='keyup'||type==='key-up';
   if(up){held.delete(event.code||code);return['Escape','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(code);}
   if(disposed||event.ctrlKey||event.altKey||event.metaKey)return false;
   if(code==='Escape'){event.preventDefault();if(!event.repeat&&!held.has(event.code||code)){held.add(event.code||code);goBack();}return true;}
   if(loading||!controller)return false;
   const active=root.ownerDocument.activeElement as HTMLElement|null;
   if(code==='Enter'&&active?.matches('input')){event.preventDefault();if(!event.repeat&&!held.has(event.code||code)){held.add(event.code||code);void controller.save();}return true;}
   if(active?.matches('[data-curl-finger]')&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'].includes(code)){
    event.preventDefault();if(code==='Enter'){if(event.repeat||held.has(event.code||code))return true;held.add(event.code||code);}
    if(code==='ArrowUp'||code==='ArrowDown'){const at=fingerButtons.indexOf(active as HTMLButtonElement),next=Math.max(0,Math.min(fingerButtons.length-1,at+(code==='ArrowDown'?1:-1)));fingerButtons[next]?.focus({preventScroll:true});}
    else if(code==='ArrowRight'||code==='Enter'){if(!length.disabled)length.focus({preventScroll:true});}return true;
   }
   if(code==='ArrowLeft'&&active?.matches('button')&&!active.matches('[data-curl-finger]')&&active!==back){fingerButtons.find(button=>button.dataset.curlFinger===String(controller!.state.finger))?.focus({preventScroll:true});event.preventDefault();return true;}
   if(['Enter','Space'].includes(code)&&active?.matches('button')){if(event.repeat||held.has(event.code||code)){event.preventDefault();return true;}held.add(event.code||code);}
   const handled=navigation?.keyDown(event)??false;if(handled)event.preventDefault();return handled;
  },
  break(){held.clear();controller?.break();},
  async flush(){await ready;await controller?.flush();},
  async exportArchive(){await ready;return controller?.exportArchive()??exportCurl(await loadCurl(options.files));},
  async exportDocument(){await ready;if(!controller)throw Error('Effective curl readings are unavailable');return controller.exportDocument();},
  dispose(){if(disposed)return;disposed=true;held.clear();navigation?.dispose();unsubscribe?.();controller?.dispose();for(const button of [...fingerButtons,...methodButtons,save,retract,back]){button.onclick=null;button.onfocus=null;}for(const input of [length,uncertainty,notes])input.oninput=null;container.replaceChildren();},
 };
}
