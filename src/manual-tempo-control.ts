import {actionCode,inputCode} from './input';
import {TempoRepeat} from './tempo-repeat';

/** Compact controls; direction describes the displayed quantity, not an internal BPM value. */
export function manualTempoField(key:string,input:string,label:string,unit=''){
 const field=input.replace(/<input\b/,'<input readonly');
 return `<span class="manual-tempo" data-manual-key="${key}"><span class="manual-tempo-value">${field}<span class="manual-tempo-buttons"><button type="button" tabindex="-1" data-manual-direction="1" aria-label="Increase ${label}"><svg aria-hidden="true" viewBox="0 0 10 6"><path d="M1 5 L5 1 L9 5"/></svg></button><button type="button" tabindex="-1" data-manual-direction="-1" aria-label="Decrease ${label}"><svg aria-hidden="true" viewBox="0 0 10 6"><path d="M1 1 L5 5 L9 1"/></svg></button></span></span>${unit?`<span class="manual-tempo-unit">${unit}</span>`:''}</span>`;
}
/** Practice speed is a direct left/right command, separate from Options fields. */
export function practiceSpeedField(input:string){
 const arrow=(direction:number,label:string)=>`<button type="button" tabindex="-1" data-manual-direction="${direction}" aria-label="${label} speed"><svg aria-hidden="true" viewBox="0 0 6 10"><path d="${direction<0?'M5 1 L1 5 L5 9':'M1 1 L5 5 L1 9'}"/></svg></button>`;
 return `<span class="manual-tempo practice-speed-field" data-manual-key="working">${arrow(-1,'Decrease')}<span class="manual-tempo-value">${input.replace(/<input\b/,'<input readonly tabindex="-1"')}<span class="manual-tempo-unit">%</span></span>${arrow(1,'Increase')}</span>`;
}
export interface ManualTempoOptions {
 accepts:(element:HTMLElement)=>boolean;
 adjust:(key:string,direction:number,repeated:boolean,elapsed:number)=>boolean;
 edit?:{
  commit:(key:string,field:HTMLInputElement)=>boolean;
  adjust:(key:string,field:HTMLInputElement,direction:number,elapsed:number)=>boolean;
  cancel?:(key:string,field:HTMLInputElement)=>void;
 };
}
/** Own keyboard/pointer repetition so focus, release and native clicks cannot add stale steps. */
export class ManualTempoControls {
 private repeat=new TempoRepeat();private owner?:HTMLElement;private pointer?:number;private pointerClicks=new Map<number,HTMLElement>();private suppressed=new WeakMap<HTMLElement,number>();private disposed=false;
 private editing?:{field:HTMLInputElement;original:string};private swallowed=new Set<string>();
 constructor(private readonly options:ManualTempoOptions){
  document.addEventListener('keydown',this.down,true);document.addEventListener('keyup',this.up,true);
  document.addEventListener('pointerdown',this.pointerDown,true);document.addEventListener('pointerup',this.pointerUp,true);document.addEventListener('pointercancel',this.pointerUp,true);document.addEventListener('lostpointercapture',this.captureLost,true);document.addEventListener('click',this.click,true);document.addEventListener('focusin',this.focus,true);document.addEventListener('input',this.inputChanged,true);
  window.addEventListener('blur',this.blur);document.addEventListener('visibilitychange',this.visibility);
 }
 private control(target:EventTarget|null){const el=target instanceof HTMLElement?target:undefined,group=el?.closest<HTMLElement>('[data-manual-key]');return group&&this.options.accepts(group)?{el:el!,group,key:group.dataset.manualKey!}:undefined;}
 private finishEdit(commit:boolean){const editing=this.editing;if(!editing)return true;this.cancel();const {field}=editing,c=this.control(field);if(commit&&field.isConnected&&c&&this.options.edit&&!this.options.edit.commit(c.key,field))return false;if(!commit)field.value=editing.original;field.readOnly=true;field.closest('[data-manual-key]')?.removeAttribute('data-manual-editing');delete field.dataset.manualDraft;delete field.dataset.manualDraftText;this.editing=undefined;if(!commit&&c)this.options.edit?.cancel?.(c.key,field);return true;}
 private beginEdit(field:HTMLInputElement){if(this.editing?.field===field)return true;if(this.editing&&!this.finishEdit(this.editing.field.isConnected))return false;this.cancel();this.editing={field,original:field.value};field.readOnly=false;field.closest('[data-manual-key]')?.setAttribute('data-manual-editing','');field.focus();field.select();return true;}
 private adjustDraft(key:string,field:HTMLInputElement,direction:number,elapsed:number){const changed=this.options.edit?.adjust(key,field,direction,elapsed)??false;if(changed&&document.activeElement===field)field.select();return changed;}
 private inputChanged=(event:Event)=>{const field=this.editing?.field;if(field&&event.target===field){delete field.dataset.manualDraft;delete field.dataset.manualDraftText;}};
 private logicalPosition(el:HTMLElement,root:HTMLElement){let x=el.offsetWidth/2,y=el.offsetHeight/2,node:HTMLElement|null=el;while(node&&node!==root){x+=node.offsetLeft;y+=node.offsetTop;node=node.offsetParent as HTMLElement|null;}return {x,y};}
 private navigate(event:KeyboardEvent){
  const target=event.target instanceof HTMLElement?event.target:undefined;if(!target||!['ArrowUp','ArrowDown'].includes(event.code)||target.closest('select,textarea,[contenteditable=true]')||target instanceof HTMLInputElement&&(!target.readOnly||!this.control(target)))return false;
  const root=target.closest<HTMLElement>('dialog,.practice-controls');if(!root||root.hasAttribute('data-navigation-owned')||root.hasAttribute('data-practice-shortcuts')||root.dataset.kind==='options'||![...root.querySelectorAll<HTMLElement>('[data-manual-key]')].some(el=>this.options.accepts(el)))return false;
  const controls=[...root.querySelectorAll<HTMLElement>('button,input,select,summary')].filter(el=>!(el as HTMLButtonElement).disabled&&el.tabIndex>=0&&!el.closest('[hidden]')&&el.getClientRects().length>0),current=controls.includes(target)?target:this.control(target)?.group.querySelector<HTMLInputElement>('input');if(!current||!controls.includes(current))return false;
  this.cancel();if(event.repeat)return true;const rows:HTMLElement[][]=[];for(const el of controls.sort((a,b)=>this.logicalPosition(a,root).y-this.logicalPosition(b,root).y||this.logicalPosition(a,root).x-this.logicalPosition(b,root).x)){const row=rows.find(r=>Math.abs(this.logicalPosition(r[0],root).y-this.logicalPosition(el,root).y)<18);if(row)row.push(el);else rows.push([el]);}
  const direction=event.code==='ArrowDown'?1:-1;if(rows.length===1){const row=rows[0].sort((a,b)=>this.logicalPosition(a,root).x-this.logicalPosition(b,root).x);row[(row.indexOf(current)+direction+row.length)%row.length]?.focus();return true;}
  const at=rows.findIndex(row=>row.includes(current)),next=rows[(at+direction+rows.length)%rows.length],x=this.logicalPosition(current,root).x;next.sort((a,b)=>Math.abs(this.logicalPosition(a,root).x-x)-Math.abs(this.logicalPosition(b,root).x-x))[0]?.focus();return true;
 }
 private start(code:string,owner:HTMLElement|undefined,adjust:(repeated:boolean,elapsed:number)=>boolean){this.owner=owner;this.repeat.begin(code,(repeated,elapsed)=>{const ok=!this.disposed&&!document.hidden&&(!owner||(owner.isConnected&&this.options.accepts(owner)))&&(!repeated||this.pointer===undefined||!!owner?.hasPointerCapture(this.pointer))&&adjust(repeated,elapsed);if(!ok)this.cancel();return ok;});}
 begin(code:string,adjust:(repeated:boolean,elapsed:number)=>boolean){this.start(code,undefined,adjust);}
 editField(field:HTMLInputElement,openerCode?:string){const opened=!this.disposed&&field.isConnected&&!!this.control(field)&&!!this.options.edit&&this.beginEdit(field);if(opened&&openerCode)this.swallowed.add(openerCode);return opened;}
 /** Browser redraws can emit change before a draft is detached; only explicit commit owns that value. */
 ownsDraft(field:HTMLInputElement){return !this.disposed&&this.editing?.field===field;}
 /** Retain only the explicitly opened draft during a harmless footer repaint. */
 retainDraft(root:HTMLElement){
  const editing=this.editing,field=editing?.field;if(!field||!root.contains(field))return ()=>{};
  const key=field.closest<HTMLElement>('[data-manual-key]')?.dataset.manualKey,focused=document.activeElement===field,start=field.selectionStart,end=field.selectionEnd,direction=field.selectionDirection;
  return ()=>{
   if(this.editing!==editing||this.disposed)return;
   const replacement=key?root.querySelector<HTMLInputElement>(`[data-manual-key="${CSS.escape(key)}"] input`):undefined;
   if(!replacement){this.finishEdit(false);return;}
   replacement.replaceWith(field);field.closest('[data-manual-key]')?.setAttribute('data-manual-editing','');
   if(focused){field.focus({preventScroll:true});if(start!==null&&end!==null)field.setSelectionRange(start,end,direction??undefined);}
  };
 }
 release(code:string){if(!this.repeat.owns(code))return;if(this.owner?.matches('[data-manual-direction]'))this.suppressed.set(this.owner,performance.now()+1000);this.repeat.release(code);this.owner=undefined;}
 cancel=()=>{this.repeat.cancel();const owner=this.owner,pointer=this.pointer;this.pointer=undefined;this.owner=undefined;if(pointer!==undefined&&owner?.hasPointerCapture(pointer))owner.releasePointerCapture(pointer);};
 cancelEdit(){this.cancel();this.finishEdit(false);}
 private blur=()=>{this.cancel();this.finishEdit(false);};
 private visibility=()=>{if(document.hidden)this.blur();};
 private focus=(event:FocusEvent)=>{if(event.target!==this.owner)this.cancel();if(this.editing&&event.target!==this.editing.field&&!this.finishEdit(this.editing.field.isConnected))this.editing?.field.focus();};
 private down=(event:KeyboardEvent)=>{if(this.swallowed.has(inputCode(event))&&event.repeat){event.preventDefault();event.stopImmediatePropagation();return;}if(event.isComposing)return;if(event.ctrlKey||event.altKey||event.metaKey){this.cancel();return;}if(this.editing&&!this.editing.field.isConnected)this.finishEdit(false);const c=this.control(event.target),field=c?.el instanceof HTMLInputElement?c.el:undefined;if(field){if(actionCode(event)==='Enter'&&(!field.closest('[data-practice-shortcuts]')||this.editing?.field===field)||event.code==='Escape'&&this.editing?.field===field){event.preventDefault();event.stopImmediatePropagation();this.cancel();if(!event.repeat){this.swallowed.add(inputCode(event));if(event.code==='Escape')this.finishEdit(false);else if(this.editing?.field===field)this.finishEdit(true);else this.beginEdit(field);}return;}if(event.code==='Tab'&&this.editing?.field===field){this.cancel();if(!this.finishEdit(true)){event.preventDefault();event.stopImmediatePropagation();}return;}if(this.editing?.field===field&&['ArrowUp','ArrowDown'].includes(event.code)){event.preventDefault();event.stopImmediatePropagation();if(event.repeat||this.repeat.owns(event.code))return;this.start(event.code,field,(_repeated,elapsed)=>this.adjustDraft(c!.key,field,event.code==='ArrowUp'?1:-1,elapsed));return;}}if(!this.editing&&this.navigate(event)){event.preventDefault();event.stopImmediatePropagation();return;}if(c&&!(field?.readOnly&&c.group.closest('[data-practice-shortcuts]')&&['ArrowLeft','ArrowRight'].includes(event.code)))this.cancel();};
 private up=(event:KeyboardEvent)=>{this.swallowed.delete(inputCode(event));this.release(event.code);};
 private pointerDown=(event:PointerEvent)=>{const c=this.control(event.target);if(event.button!==0)return;if(this.editing&&c?.group!==this.editing.field.closest('[data-manual-key]')&&!this.finishEdit(true)){event.preventDefault();event.stopImmediatePropagation();return;}if(!c)return;const field=c.group.querySelector<HTMLInputElement>('input'),button=c.el.closest<HTMLButtonElement>('[data-manual-direction]');if(!button){if(c.el===field){event.preventDefault();this.beginEdit(field!);}return;}if(button.disabled)return;event.preventDefault();event.stopImmediatePropagation();this.cancel();if(this.editing&&this.editing.field!==field&&!this.finishEdit(true))return;field?.focus({preventScroll:true});this.pointerClicks.set(event.pointerId,button);this.pointer=event.pointerId;button.setPointerCapture(event.pointerId);this.start(`pointer:${event.pointerId}`,button,(repeated,elapsed)=>this.editing?.field===field?this.adjustDraft(c.key,field!,Number(button.dataset.manualDirection),elapsed):this.options.adjust(c.key,Number(button.dataset.manualDirection),repeated,elapsed));};
 private pointerUp=(event:PointerEvent)=>{if(event.pointerId===this.pointer)this.cancel();};
 private captureLost=(event:PointerEvent)=>{if(event.pointerId===this.pointer)this.cancel();};
 private click=(event:MouseEvent)=>{const c=this.control(event.target),button=c?.el.closest<HTMLButtonElement>('[data-manual-direction]');if(this.editing&&c?.group!==this.editing.field.closest('[data-manual-key]')&&!this.finishEdit(true)){event.preventDefault();event.stopImmediatePropagation();return;}if(!c||!button)return;event.preventDefault();event.stopImmediatePropagation();if(button.disabled)return;const pointerId=(event as PointerEvent).pointerId,pointer=this.pointerClicks.get(pointerId);if(pointer===button){this.pointerClicks.delete(pointerId);return;}if(event.detail>0){const pending=[...this.pointerClicks].find(([,el])=>el===button);if(pending){this.pointerClicks.delete(pending[0]);return;}}const suppressed=this.suppressed.get(button);this.suppressed.delete(button);if(suppressed!==undefined&&suppressed>=performance.now())return;this.cancel();const field=c.group.querySelector<HTMLInputElement>('input');if(this.editing?.field===field)this.adjustDraft(c.key,field!,Number(button.dataset.manualDirection),0);else this.options.adjust(c.key,Number(button.dataset.manualDirection),false,0);};
 dispose(){this.cancel();this.finishEdit(false);this.disposed=true;document.removeEventListener('keydown',this.down,true);document.removeEventListener('keyup',this.up,true);document.removeEventListener('pointerdown',this.pointerDown,true);document.removeEventListener('pointerup',this.pointerUp,true);document.removeEventListener('pointercancel',this.pointerUp,true);document.removeEventListener('lostpointercapture',this.captureLost,true);document.removeEventListener('click',this.click,true);document.removeEventListener('focusin',this.focus,true);document.removeEventListener('input',this.inputChanged,true);window.removeEventListener('blur',this.blur);document.removeEventListener('visibilitychange',this.visibility);}
}
