import {chord,inputCode,readingActions,readingActionLabel,type ReadingAction} from './input';
import {MidiLearn,type MidiCC} from './midi';
import {ControlResolver,controlLabel,controlAccessibleLabel,controlDetail,replaceControl,type ControlBinding,type ControlBindings,type ControlChange,type KeyInput} from './control-bindings';
import type {ScoreCapabilities} from './score-capabilities';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export interface PracticeBindingContext {active:boolean;measureNavigation:boolean}
export interface OptionsBindingRow {action:ReadingAction;label:string}
/** A display projection only: hidden actions retain their shared stored controls. */
export function optionsBindingRows(practice?:PracticeBindingContext,capabilities?:ScoreCapabilities,reader?:boolean):OptionsBindingRow[] {
 const candidates=practice?practice.active?readingActions.filter(action=>action!=='edit'&&(!['previous','next'].includes(action)||practice.measureNavigation)):['practiceSettings'] as ReadingAction[]:reader===false?['practiceSettings'] as ReadingAction[]:readingActions.filter(action=>reader!==true||action!=='done');
 const actions=candidates.filter(action=>!capabilities||
  !['toggle','edit'].includes(action)&&action!=='done'||
  ['toggle','edit'].includes(action)&&capabilities.pianoPreparation||action==='done'&&capabilities.manualPractice);
 return actions.map(action=>({action,label:practice&&['previous','next'].includes(action)?action==='previous'?'Previous measures':'Next measures':readingActionLabel(action)}));
}
export interface OptionsBindingsApi {
 resolver:ControlResolver;bindings():ControlBindings;save(change:ControlChange):Promise<void>;validate?(change:ControlChange):void;
 connection():{source:string;generation:number}|undefined;channel():number|undefined;suspend():void;
 rows?:readonly OptionsBindingRow[];
}
type Capture={action:ReadingAction;slot:0|1;generation:number;candidate?:ControlBinding;code?:string;learn?:MidiLearn;connection?:{source:string;generation:number}};
/** Captures own edges and late writes; explicit Test uses the playing resolver without dispatch. */
export class OptionsBindingsPanel {
 testing=false;private capture?:Capture;private saving=false;private disposed=false;private generation=0;private popup?:HTMLElement;private returnFocus?:HTMLElement;private editorRow?:HTMLElement;
 constructor(private root:HTMLElement,private api:OptionsBindingsApi){}
 get active(){return this.testing||!!this.capture||!!this.popup||this.saving;}
 get capturing(){return !!this.capture;}
 private label(action:ReadingAction){return this.api.rows?.find(row=>row.action===action)?.label??readingActionLabel(action);}
 mount(){this.root.innerHTML=`<div class="options-section-title" data-options-row><h3>Keys and pedals</h3><button data-binding-test aria-pressed="false">Test bindings <kbd>T</kbd></button><span data-unbound-input hidden role="status"></span></div><table class="options-binding-table"><thead><tr><th scope="col">Action</th><th scope="col">Controls</th></tr></thead><tbody>${(this.api.rows??optionsBindingRows()).map(({action,label})=>`<tr data-options-row data-control-action="${action}"><th scope="row">${esc(label)}</th><td><div class="control-slots">${([0,1] as const).map(slot=>`<button data-control="${action}" data-slot="${slot}" aria-label="${esc(label)}, ${slot?'secondary':'primary'} control"></button>`).join('')}</div></td></tr>`).join('')}</tbody></table><div data-binding-message role="status" hidden></div><button data-control-restore hidden>Use Left / Right for ${this.label('previous')==='Previous measures'?'measures':'pages'}</button>`;
 this.root.querySelector<HTMLButtonElement>('[data-binding-test]')!.onclick=()=>this.testing?this.endTest():this.startTest();
 this.root.querySelector<HTMLButtonElement>('[data-control-restore]')!.onclick=()=>{void this.persist({kind:'restore-pages'},this.root.querySelector<HTMLElement>('[data-control-restore]')!);};
 for(const chip of this.root.querySelectorAll<HTMLButtonElement>('[data-control]'))chip.onclick=()=>this.edit(chip);this.paint();}
 private message(text=''){const field=this.root.querySelector<HTMLElement>('[data-binding-message]')!;field.hidden=!text;field.textContent=text;}
 paint(){if(this.disposed)return;const bindings=this.api.bindings();for(const chip of this.root.querySelectorAll<HTMLButtonElement>('[data-control]')){const action=chip.dataset.control as ReadingAction,slot=Number(chip.dataset.slot) as 0|1,b=bindings.actions[action][slot];chip.textContent=controlLabel(b);chip.classList.toggle('unbound',!b);chip.title=b?.kind==='midi'?`${b.source}, channel ${b.channel}, CC${b.controller}`:controlAccessibleLabel(b);chip.setAttribute('aria-label',`${this.label(action)}, ${slot?'secondary':'primary'} control, ${controlAccessibleLabel(b)} ${controlDetail(b)}`);chip.disabled=this.saving;}
 const test=this.root.querySelector<HTMLButtonElement>('[data-binding-test]')!;test.innerHTML=this.testing?'Finish test <kbd class="escape-hint">Esc</kbd>':'Test bindings <kbd>T</kbd>';test.setAttribute('aria-pressed',String(this.testing));test.disabled=this.saving;
 const close=this.root.closest('dialog')?.querySelector<HTMLElement>('[data-options-close]');if(close)close.innerHTML=this.testing?'Back':'Back <kbd class="escape-hint">Esc</kbd>';
 const restore=this.root.querySelector<HTMLButtonElement>('[data-control-restore]')!;restore.hidden=!this.root.querySelector('[data-control=previous]')||!this.root.querySelector('[data-control=next]')||!(bindings.actions.previous[0]?.kind==='key'&&bindings.actions.previous[0].key==='PageUp'&&bindings.actions.next[0]?.kind==='key'&&bindings.actions.next[0].key==='PageDown');restore.disabled=this.saving;this.feedback();}
 private feedback(){const held=this.testing?this.api.resolver.heldMatches:[];for(const chip of this.root.querySelectorAll<HTMLElement>('[data-control]')){const on=held.some(m=>m.action===chip.dataset.control&&m.slot===Number(chip.dataset.slot));chip.classList.toggle('responding',on);chip.setAttribute('aria-pressed',String(on));}const unbound=this.root.querySelector<HTMLElement>('[data-unbound-input]')!,unknown=this.testing?this.api.resolver.heldUnbound:[];unbound.hidden=!unknown.length;unbound.textContent=unknown.length?`Unbound · ${unknown.map(controlLabel).join(' + ')}`:'';}
 startTest(){if(this.saving)return;this.cancel();this.api.suspend();this.testing=true;this.message();this.paint();this.root.querySelector<HTMLElement>('[data-binding-test]')!.focus();}
 endTest(focus=true){this.removePopup();this.capture=undefined;this.generation++;this.testing=false;this.api.resolver.clear();this.message();this.paint();if(focus&&!this.disposed)this.root.querySelector<HTMLElement>('[data-binding-test]')?.focus();}
 cancel(text=''){const had=this.active;this.removePopup();this.capture=undefined;this.generation++;this.testing=false;this.api.resolver.clear();if(!this.disposed){this.message(text);this.paint();}return had;}
 connectionChanged(){this.cancel('');}
 blur(){this.cancel();}
 private removePopup(){this.editorRow?.remove();this.editorRow=undefined;this.popup?.remove();this.popup=undefined;}
 private edit(chip:HTMLElement){if(this.saving)return;if(this.testing)this.endTest(false);this.cancel();this.api.suspend();this.returnFocus=chip;const action=chip.dataset.control as ReadingAction,slot=Number(chip.dataset.slot) as 0|1,binding=this.api.bindings().actions[action][slot];if(!binding){this.beginCapture(action,slot,chip);return;}const popup=document.createElement('div');popup.className='binding-editor';popup.dataset.optionsRow='';popup.innerHTML=`<span class="binding-detail">${esc(controlAccessibleLabel(binding))}${controlDetail(binding)?` · ${esc(controlDetail(binding))}`:''}</span><button data-change>Change</button><button data-remove>Remove</button><button data-cancel>Cancel</button>`;const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=2;cell.append(popup);row.append(cell);chip.closest('tr')!.after(row);this.editorRow=row;this.popup=popup;popup.querySelector<HTMLButtonElement>('[data-change]')!.onclick=()=>this.beginCapture(action,slot,chip);popup.querySelector<HTMLButtonElement>('[data-remove]')!.onclick=()=>{this.removePopup();void this.persist({kind:'assign',action,slot,binding:null},chip);};popup.querySelector<HTMLButtonElement>('[data-cancel]')!.onclick=()=>{this.cancel();chip.focus();};popup.querySelector<HTMLElement>('button')!.focus();}
 private beginCapture(action:ReadingAction,slot:0|1,chip:HTMLElement){this.removePopup();this.api.suspend();const connection=this.api.connection();this.capture={action,slot,generation:++this.generation,connection,learn:connection?new MidiLearn(connection.source,this.api.channel(),connection.generation):undefined};this.returnFocus=chip;this.message(`Press a key or connected MIDI pedal for ${this.label(action)}. Release to save. Escape cancels.`);chip.focus();}
 keyDown(event:KeyInput):boolean {
 if(!this.testing&&!this.capture&&!this.popup&&!this.saving)return false;
 if(event.code==='Escape'){if(this.saving){this.cancel();return false;}if(this.testing)this.endTest();else{const focus=this.returnFocus;this.cancel();focus?.isConnected&&focus.focus();}return true;}
 if(this.testing){this.api.resolver.keyDown(event,true);this.feedback();return true;}
 if(this.popup)return false;
 this.api.resolver.keyDown(event,false);if(this.saving)return true;
 const cap=this.capture!;if(event.code==='Tab'){const focus=this.returnFocus;this.cancel();focus?.focus();return false;}
 if(event.repeat||/^(Control|Alt|Shift|Meta)/.test(event.code)||cap.candidate||cap.learn?.candidate)return true;
 cap.candidate={kind:'key',key:chord(event)};cap.code=inputCode(event);this.message(`${controlLabel(cap.candidate)} · release to save`);return true;
 }
 keyUp(event:Pick<KeyboardEvent,'code'>&{key?:string}){this.api.resolver.keyUp(event);if(this.testing){this.feedback();return;}const cap=this.capture;if(cap?.candidate?.kind==='key'&&cap.code===inputCode(event))this.finishCapture(cap);}
 receive(event:MidiCC){const connection=this.api.connection();if(!connection||event.source!==connection.source||event.generation!==connection.generation)return false;
 if(this.testing){this.api.resolver.receive(event,connection,true);this.feedback();return true;}
 if(!this.capture)return false;this.api.resolver.receive(event,connection,false);const cap=this.capture;if(cap.connection?.source!==connection.source||cap.connection.generation!==connection.generation){this.connectionChanged();return true;}
 if(cap.candidate?.kind==='key')return true;const learned=cap.learn?.receive(event);this.message(cap.learn?.message??'Connect a MIDI input or press a key.');if(learned){cap.candidate={kind:'midi',...learned};this.finishCapture(cap);}return true;}
 private finishCapture(cap:Capture){if(this.capture!==cap||!cap.candidate)return;try{const change:ControlChange={kind:'assign',action:cap.action,slot:cap.slot,binding:cap.candidate};if(this.api.validate)this.api.validate(change);else replaceControl(this.api.bindings(),cap.action,cap.slot,cap.candidate);this.capture=undefined;void this.persist(change,this.returnFocus!);}catch(error){cap.candidate=undefined;cap.code=undefined;cap.learn=cap.connection?new MidiLearn(cap.connection.source,this.api.channel(),cap.connection.generation):undefined;this.message((error as Error).message);}}
 private async persist(change:ControlChange,focus:HTMLElement){if(this.saving)return;const generation=++this.generation;this.saving=true;this.message('Saving…');this.paint();try{await this.api.save(change);if(this.disposed)return;this.saving=false;this.paint();if(generation!==this.generation)return;this.message();if(document.activeElement===focus||document.activeElement===document.body)focus.isConnected&&focus.focus();}catch(error){if(this.disposed)return;this.saving=false;this.paint();if(generation===this.generation)this.message(`Not saved: ${(error as Error).message}`);}}
 focusChanged(target:HTMLElement){if(this.popup&&!this.popup.contains(target)&&target!==this.returnFocus)this.cancel();if(this.capture&&!target.closest(`[data-control-action="${this.capture.action}"]`))this.cancel();}
 dispose(){this.disposed=true;this.cancel();}
}
