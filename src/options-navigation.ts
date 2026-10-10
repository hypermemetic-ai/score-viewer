import {inputCode} from './input';
export interface NavigationMode {horizontal?:boolean;focusOnPrepare?:boolean;sectionChanged?:(id:string)=>void}
/** Control browsing never changes values. Open pickers, drafts and capture own keys first. */
export class OptionsNavigation {
 private observer:MutationObserver;private popup?:HTMLElement;private picker?:HTMLSelectElement;private index=0;private active?:HTMLElement;private disposed=false;private interacted=false;
 private selectObservers:MutationObserver[]=[];private resize?:ResizeObserver;private search='';private searchTime=0;
 constructor(private root:HTMLElement,private beforeActivate:(target?:HTMLElement)=>void,private ownsKeys:()=>boolean,private mode:NavigationMode={}){
  root.dataset.navigationOwned='';this.observer=new MutationObserver(()=>this.prepare());this.observer.observe(root,{childList:true,subtree:true});this.prepare();root.addEventListener('click',this.click,true);root.addEventListener('focusin',this.focus);root.addEventListener('scroll',this.positionMarker,true);if(typeof ResizeObserver!=='undefined'){this.resize=new ResizeObserver(this.positionMarker);this.resize.observe(root);}
 }
 private visible(el:HTMLElement){const details=el.closest('details:not([open])');return !el.closest('[hidden]')&&(!details||el.tagName==='SUMMARY')&&el.getClientRects().length>0;}
 private controls(){return [...this.root.querySelectorAll<HTMLElement>('button,input,select,textarea,summary,a[href]')].filter(el=>!(el as HTMLButtonElement).disabled&&el.tabIndex>=0&&!el.hasAttribute('data-manual-direction')&&!el.hasAttribute('data-options-native')&&this.visible(el)&&!el.closest('[data-options-popup]'));}
 private sections(){return [...this.root.querySelectorAll<HTMLButtonElement>('[data-options-section]')];}
 private selected(){return this.root.querySelector<HTMLButtonElement>('[data-options-section][aria-selected=true]');}
 private settings(){return this.controls().filter(el=>!el.hasAttribute('data-options-section'));}
 private prepare(){
  if(this.disposed)return;
  for(const select of this.root.querySelectorAll<HTMLSelectElement>('select:not([data-options-native])')){
   const hadFocus=document.activeElement===select;select.dataset.optionsNative='';select.hidden=true;const button=document.createElement('button');button.type='button';button.className='options-picker';button.dataset.optionsPicker='';button.dataset.optionsKey=select.id||select.name||select.dataset.option||(select.hasAttribute('data-keyboard')?'keyboard':select.getAttribute('aria-label')??'');
   if(select.dataset.optionsSize==='content')button.dataset.optionsSize='content';
   button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');select.after(button);
   const paint=()=>{button.textContent=select.selectedOptions[0]?.textContent??'Choose';button.disabled=select.disabled;button.setAttribute('aria-label',select.getAttribute('aria-label')??select.closest('label')?.textContent?.trim()??'Choose');};
   select.addEventListener('change',paint);select.addEventListener('options-selection',paint);button.onclick=()=>this.open(select,button);const watch=new MutationObserver(paint);watch.observe(select,{attributes:true,childList:true,subtree:true});this.selectObservers.push(watch);paint();if(hadFocus)button.focus();
  }
  this.positionMarker();if(!this.active?.isConnected){this.active=this.selected()??this.controls()[0];if(this.active&&this.mode.focusOnPrepare!==false&&!this.popup&&!this.ownsKeys()&&!this.interacted)this.active.focus();}
 }
 private positionMarker=()=>{const panel=this.root.querySelector<HTMLElement>('[data-options-panel]:not([hidden])'),marker=this.root.querySelector<HTMLElement>('.options-position');if(!panel||!marker)return;const max=panel.scrollHeight-panel.clientHeight;marker.hidden=max<1;if(!marker.hidden){const height=Math.max(16,panel.clientHeight*panel.clientHeight/panel.scrollHeight);marker.style.height=`${height}px`;marker.style.top=`${4+panel.scrollTop/max*(panel.clientHeight-height)}px`;}};
 private selectSection(button:HTMLButtonElement,focus=true){
  this.cancelPicker(false);this.beforeActivate(button);const id=button.dataset.optionsSection!;
  for(const section of this.sections()){const on=section===button;section.setAttribute('aria-selected',String(on));section.tabIndex=on?0:-1;}
  for(const panel of this.root.querySelectorAll<HTMLElement>('[data-options-panel]'))panel.hidden=panel.dataset.optionsPanel!==id;
  this.mode.sectionChanged?.(id);this.positionMarker();this.active=button;if(focus)button.focus();button.scrollIntoView({block:'nearest'});
 }
 private focus=(event:FocusEvent)=>{const el=event.target as HTMLElement;if(el.hasAttribute('data-options-section'))this.selectSection(el as HTMLButtonElement,false);if(this.controls().includes(el))this.active=el;};
 get picking(){return !!this.popup;}
 focusInitial(){if(!this.interacted&&(!this.root.contains(document.activeElement)||document.activeElement===this.selected()))(this.selected()??this.controls()[0])?.focus();}
 private click=(event:MouseEvent)=>{this.interacted=true;const el=(event.target as HTMLElement).closest<HTMLElement>('button,input,select,summary,a[href]');if(el&&!el.closest('[data-options-popup]')){if(el.hasAttribute('data-options-section'))this.selectSection(el as HTMLButtonElement);else this.beforeActivate(el);}};
 private open(select:HTMLSelectElement,button:HTMLElement){this.cancelPicker(false);this.search='';this.picker=select;this.active=button;this.index=Math.max(0,select.selectedIndex);const popup=document.createElement('div');popup.dataset.optionsPopup='';popup.className='options-popover';popup.setAttribute('role','listbox');popup.setAttribute('aria-label',button.getAttribute('aria-label')??'Choose');popup.tabIndex=0;button.setAttribute('aria-expanded','true');button.after(popup);this.popup=popup;this.draw();popup.focus();}
 private draw(){if(!this.popup||!this.picker)return;this.popup.innerHTML='';[...this.picker.options].forEach((option,index)=>{const b=document.createElement('button');b.type='button';b.setAttribute('role','option');b.setAttribute('aria-selected',String(index===this.index));b.disabled=option.disabled;b.tabIndex=-1;b.textContent=option.textContent;b.onclick=()=>this.choose(index);this.popup!.append(b);});this.popup.querySelector('[aria-selected=true]')?.scrollIntoView({block:'nearest'});}
 private choose(index:number){const picker=this.picker;if(!picker||picker.options[index].disabled)return;const changed=picker.selectedIndex!==index;picker.selectedIndex=index;this.cancelPicker();if(changed)picker.dispatchEvent(new Event('change',{bubbles:true}));}
 cancelPicker(focus=true){this.popup?.remove();this.popup=undefined;this.picker=undefined;this.active?.setAttribute('aria-expanded','false');if(focus&&this.active?.isConnected)this.active.focus();}
 private rows(controls:HTMLElement[]){const rows:HTMLElement[][]=[],groups:Element[]=[];for(const control of controls){const group=control.closest('[data-options-row],tr,.dialog-row,.dialog-actions,.binding-editor')??control;let at=groups.indexOf(group);if(at<0){at=groups.push(group)-1;rows.push([]);}rows[at].push(control);}return rows;}
 keyDown(event:KeyboardEvent):boolean {
  this.interacted=true;
  if(this.popup){
   if(event.code==='Tab'){this.cancelPicker();if(this.root.matches('dialog')){this.tab(event.shiftKey);return true;}return false;}
   if(event.code==='Escape'||event.code==='ArrowLeft'){if(event.code!=='Escape'||!event.repeat)this.cancelPicker();return true;}
   if(event.ctrlKey||event.altKey||event.metaKey)return false;
   if(['ArrowDown','ArrowUp','Home','End'].includes(event.code)){
    const options=[...this.picker!.options],step=event.code==='ArrowUp'?-1:1;
    let next=event.code==='Home'?0:event.code==='End'?options.length-1:this.index+step;
    while(next>=0&&next<options.length&&options[next].disabled)next+=event.code==='End'?-1:step;
    if(next>=0&&next<options.length){this.index=next;this.draw();}
   }else if(inputCode(event)==='Enter'||event.code==='ArrowRight'){if(!event.repeat)this.choose(this.index);}
   else if(event.key.length===1){const now=performance.now(),letter=event.key.toLowerCase();this.search=now-this.searchTime>700||this.search===letter?letter:this.search+letter;this.searchTime=now;const options=[...this.picker!.options];for(let step=1;step<=options.length;step++){const at=(this.index+step)%options.length;if(!options[at].disabled&&options[at].textContent?.trim().toLowerCase().startsWith(this.search)){this.index=at;this.draw();break;}}}
   return true;
  }
  if(this.ownsKeys())return false;
  const focused=document.activeElement as HTMLElement;
  if(event.code==='Tab'&&this.root.matches('dialog')&&!event.ctrlKey&&!event.altKey&&!event.metaKey){this.tab(event.shiftKey);return true;}
  if(focused?.matches('textarea,[contenteditable=true],input:not([readonly]):not([type=checkbox]):not([type=radio])'))return false;
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','Space'].includes(inputCode(event))||event.ctrlKey||event.altKey||event.metaKey)return false;
  const sections=this.sections();
  if(focused?.hasAttribute('data-options-section')){
   if(event.code==='ArrowRight'||inputCode(event)==='Enter'){if(!event.repeat)this.settings()[0]?.focus();}
   else if(event.code==='ArrowUp'||event.code==='ArrowDown'){const at=sections.indexOf(focused as HTMLButtonElement),next=Math.max(0,Math.min(sections.length-1,at+(event.code==='ArrowDown'?1:-1)));this.selectSection(sections[next]);}
   return true;
  }
  const controls=sections.length?this.settings():this.controls(),current=controls.includes(focused)?focused:this.active&&controls.includes(this.active)?this.active:controls[0];if(!current)return false;
  if(event.code==='Space'&&!current.matches('button,input[type=checkbox],input[type=radio],summary'))return false;
  if(inputCode(event)==='Enter'||event.code==='Space'){if(!event.repeat){this.beforeActivate(current);current.click();}return true;}
  if(sections.length&&event.code==='ArrowLeft'){this.selected()?.focus();return true;}
  if(this.mode.horizontal){const index=controls.indexOf(current),step=['ArrowRight','ArrowDown'].includes(event.code)?1:-1;controls[Math.max(0,Math.min(controls.length-1,index+step))]?.focus();return true;}
  const rows=this.rows(controls),row=rows.find(r=>r.includes(current))!,at=row.indexOf(current);
  if(event.code==='ArrowLeft'||event.code==='ArrowRight')row[Math.max(0,Math.min(row.length-1,at+(event.code==='ArrowRight'?1:-1)))]?.focus();
  else{const target=rows[Math.max(0,Math.min(rows.length-1,rows.indexOf(row)+(event.code==='ArrowDown'?1:-1)))];target[Math.min(at,target.length-1)]?.focus();}
  return true;
 }
 private tab(backwards:boolean){const controls=this.controls(),index=controls.indexOf(document.activeElement as HTMLElement);if(controls.length)controls[(index+(backwards?-1:1)+controls.length)%controls.length]?.focus();}
 dispose(){this.disposed=true;this.cancelPicker(false);this.observer.disconnect();this.resize?.disconnect();this.root.removeEventListener('scroll',this.positionMarker,true);this.selectObservers.forEach(o=>o.disconnect());this.root.removeEventListener('click',this.click,true);this.root.removeEventListener('focusin',this.focus);delete this.root.dataset.navigationOwned;}
}
