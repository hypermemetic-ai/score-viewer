import type {Entry} from './state';
import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';
import {keyboardLabel} from './keyboard-selection';
import {libraryOrder} from './package';

const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export interface LibraryRow {key:string;composer:string;entry?:Entry}

/** Highlight belongs to the current visit; only opening a score records work. */
export class LibrarySelection {
 entries:Entry[]=[];selected?:string;expanded?:string;
 update(entries:Entry[],lastWorked?:string){
  this.entries=[...entries].sort((a,b)=>libraryOrder(a.metadata,b.metadata));
  const known=this.allRows();
  if(!known.some(row=>row.key===this.selected)){
   const entry=this.entries.find(entry=>entry.id===lastWorked)??this.entries[0];
   this.selected=entry?`score:${entry.id}`:undefined;this.expanded=entry?.metadata.composer;
  }
 }
 allRows():LibraryRow[]{const rows:LibraryRow[]=[];let composer:string|undefined;for(const entry of this.entries){if(composer!==entry.metadata.composer){composer=entry.metadata.composer;rows.push({key:`composer:${composer}`,composer});}rows.push({key:`score:${entry.id}`,composer,entry});}return rows;}
 visibleRows(){return this.allRows().filter(row=>!row.entry||row.composer===this.expanded);}
 select(key:string,expand=true){const row=this.allRows().find(row=>row.key===key);if(!row)return;this.selected=key;if(expand)this.expanded=row.composer;}
 move(step:number){const rows=this.visibleRows();if(!rows.length)return;const index=rows.findIndex(row=>row.key===this.selected);this.select(rows[Math.max(0,Math.min(rows.length-1,(index<0?0:index)+step))].key);}
 toggle(composer:string){this.selected=`composer:${composer}`;this.expanded=this.expanded===composer?undefined:composer;}
}

export function libraryFocusKey(element:Element|null):string|undefined {
 const field=element?.closest<HTMLElement>('[data-instrument-popup],[data-action],[data-library-row]');
 return field?.hasAttribute('data-instrument-popup')?'instrument-popup':field?.dataset.action?`action:${field.dataset.action}`:field?.dataset.libraryRow;
}
export function libraryFocusElement(root:HTMLElement,key:string|undefined):HTMLElement|undefined {
 return [...root.querySelectorAll<HTMLElement>('[data-instrument-popup],[data-action],[data-library-row]')].find(element=>libraryFocusKey(element)===key);
}

export const instrumentChoices:PhysicalKeyboardId[]=['conventional-piano','janko-four-row'];
export function instrumentPickerMarkup(value:PhysicalKeyboardId){return `<div class="instrument-picker"><button type="button" data-action="instrument" aria-label="Instrument: ${escape(keyboardLabel(value))}" aria-haspopup="listbox" aria-controls="library-instrument-popup" aria-expanded="false">${escape(keyboardLabel(value))}<span aria-hidden="true"> ▾</span><kbd>I</kbd></button><div id="library-instrument-popup" data-instrument-popup role="listbox" aria-label="Instrument" tabindex="0" hidden>${instrumentChoices.map(id=>`<button type="button" role="option" id="instrument-${id}" data-instrument-option="${id}" aria-selected="${id===value}" tabindex="-1">${escape(keyboardLabel(id))}</button>`).join('')}<p data-instrument-error role="status" hidden></p></div></div>`;}

/** A chooser is a detour: previews cannot persist or mutate the score tree. */
export class InstrumentDetour {
 pending?:PhysicalKeyboardId;committing=false;private prior?:{selected?:string;expanded?:string};
 open(value:PhysicalKeyboardId,selection:LibrarySelection){if(this.committing)return;this.pending=value;this.prior={selected:selection.selected,expanded:selection.expanded};}
 move(step:number){if(this.pending===undefined||this.committing)return;const index=instrumentChoices.indexOf(this.pending);this.pending=instrumentChoices[(index+step+instrumentChoices.length)%instrumentChoices.length];}
 finish(selection:LibrarySelection){if(this.prior){selection.selected=this.prior.selected;selection.expanded=this.prior.expanded;}this.pending=undefined;this.committing=false;this.prior=undefined;}
}

export class LibraryMenu {
 readonly selection=new LibrarySelection();readonly instrument=new InstrumentDetour();private root?:HTMLElement;private commitInstrument?:(value:PhysicalKeyboardId)=>Promise<void>;private detourGeneration=0;
 get choosingInstrument(){return this.instrument.pending!==undefined;}
 mount(root:HTMLElement,entries:Entry[],lastWorked:string|undefined,details:(entry:Entry)=>string,layout:PhysicalKeyboardId,commitInstrument:(value:PhysicalKeyboardId)=>Promise<void>){
  this.root=root;this.commitInstrument=commitInstrument;this.selection.update(entries,lastWorked);const scores=root.querySelector<HTMLElement>('.scores')!;
  scores.innerHTML=this.selection.allRows().map(row=>row.entry?`<button class="score-entry" data-library-row="${escape(row.key)}" data-composer="${escape(row.composer)}" data-open="${escape(row.entry.id)}"><strong>${escape(row.entry.metadata.title)}</strong><small>${details(row.entry)}</small></button>`:`<button class="composer-entry" data-library-row="${escape(row.key)}" data-composer="${escape(row.composer)}" aria-expanded="false"><span class="composer-arrow" aria-hidden="true">›</span>${escape(row.composer)}</button>`).join('');
  let pointerComposer:string|undefined;
  scores.addEventListener('pointerdown',event=>{pointerComposer=(event.target as HTMLElement).closest<HTMLElement>('.composer-entry')?.dataset.libraryRow;});
  scores.addEventListener('focusin',event=>{const row=(event.target as HTMLElement).closest<HTMLElement>('[data-library-row]');if(row&&this.selection.selected!==row.dataset.libraryRow){this.selection.select(row.dataset.libraryRow!,row.dataset.libraryRow!==pointerComposer);this.paint();}pointerComposer=undefined;});
  scores.querySelectorAll<HTMLElement>('.composer-entry').forEach(button=>button.onclick=()=>{pointerComposer=undefined;this.selection.toggle(button.dataset.composer!);this.paint();});this.paint();this.paintInstrument();
  root.querySelectorAll<HTMLElement>('[data-instrument-option]').forEach(option=>option.onclick=()=>{if(this.instrument.committing)return;this.instrument.pending=option.dataset.instrumentOption as PhysicalKeyboardId;void this.acceptInstrument();});
  root.querySelector('.library')?.addEventListener('pointerdown',event=>{if(this.choosingInstrument&&!(event.target as HTMLElement).closest('.instrument-picker'))this.endInstrument(false);});
  root.querySelector<HTMLElement>('[data-action=instrument]')!.dataset.instrument=layout;
 }
 private paintInstrument(){if(!this.root)return;const button=this.root.querySelector<HTMLElement>('[data-action=instrument]'),popup=this.root.querySelector<HTMLElement>('[data-instrument-popup]');button?.setAttribute('aria-expanded',String(this.choosingInstrument));if(popup){popup.hidden=!this.choosingInstrument;popup.setAttribute('aria-busy',String(this.instrument.committing));if(this.instrument.pending)popup.setAttribute('aria-activedescendant',`instrument-${this.instrument.pending}`);}for(const option of this.root.querySelectorAll<HTMLElement>('[data-instrument-option]'))option.setAttribute('aria-selected',String(option.dataset.instrumentOption===this.instrument.pending));}
 beginInstrument(){const value=this.root?.querySelector<HTMLElement>('[data-action=instrument]')?.dataset.instrument as PhysicalKeyboardId|undefined;if(!value||this.choosingInstrument)return;this.detourGeneration++;this.instrument.open(value,this.selection);this.paintInstrument();this.root?.querySelector<HTMLElement>('[data-instrument-popup]')?.focus();}
 endInstrument(focus=true){this.detourGeneration++;this.instrument.finish(this.selection);this.paintInstrument();this.paint();if(focus)this.returnToScore();}
 private returnToScore(){if(this.selection.selected)this.focus(this.selection.selected);else this.root?.querySelector<HTMLElement>('[data-action=instrument]')?.focus();}
 private async acceptInstrument(){if(this.instrument.pending===undefined||this.instrument.committing)return;const value=this.instrument.pending,generation=this.detourGeneration;this.instrument.committing=true;this.paintInstrument();try{await this.commitInstrument!(value);if(generation!==this.detourGeneration||!this.root?.querySelector('.library'))return;this.instrument.finish(this.selection);this.paintInstrument();this.paint();this.returnToScore();}catch(error){if(generation!==this.detourGeneration||!this.root?.querySelector('.library'))return;this.instrument.committing=false;this.paintInstrument();const status=this.root?.querySelector<HTMLElement>('[data-instrument-error]');if(status){status.hidden=false;status.textContent=(error as Error).message;}this.root?.querySelector<HTMLElement>('[data-instrument-popup]')?.focus();}}
 popupKey(code:string):boolean {
  if(!this.choosingInstrument)return false;if(code==='Tab'&&!this.instrument.committing){this.endInstrument(false);return false;}if(this.instrument.committing)return true;
  if(code==='ArrowUp'||code==='ArrowDown'){this.instrument.move(code==='ArrowUp'?-1:1);this.paintInstrument();}else if(code==='Enter')void this.acceptInstrument();else if(code==='Escape')this.endInstrument();return true;
 }
 paint(){if(!this.root)return;for(const row of this.root.querySelectorAll<HTMLElement>('[data-library-row]')){const expanded=row.dataset.composer===this.selection.expanded;row.hidden=row.hasAttribute('data-open')&&!expanded;row.dataset.selected=String(row.dataset.libraryRow===this.selection.selected);if(row.classList.contains('composer-entry'))row.setAttribute('aria-expanded',String(expanded));}}
 focus(key=this.selection.selected){const target=this.root&&libraryFocusElement(this.root,key);target?.focus();target?.scrollIntoView({block:'nearest'});}
 key(code:string,focused:Element|null):boolean {
  if(!this.root||focused?.closest('input,select,textarea,[contenteditable=true]'))return false;
  if(code==='ArrowUp'||code==='ArrowDown'){if(focused?.closest('[data-library-row]'))this.selection.move(code==='ArrowUp'?-1:1);this.paint();this.focus();return true;}
  if(code==='ArrowLeft'||code==='ArrowRight'){
   const actions=[...this.root.querySelectorAll<HTMLElement>('nav button:not(:disabled)')].filter(button=>!button.hidden&&!button.closest('[data-instrument-popup]'));if(!actions.length)return false;
   const index=actions.findIndex(action=>action===focused),step=code==='ArrowLeft'?-1:1;
   actions[(index<0?(step<0?actions.length-1:0):(index+step+actions.length)%actions.length)]?.focus();return true;
  }return false;
 }
}
