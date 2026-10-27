// The driver: the only part of the rehearsal that knows the application's
// screens and keys. Every verb presses keys the application itself names
// (control-bindings.ts for assignable controls, command-keys.ts for the
// reader's own commands) and learns where it is from the state the
// application declares on #app (app-state.ts), never from text or pixels.
// When the interface changes, these verbs change; the inventory, invariants
// and reports above them do not.
import type {Page} from 'playwright-core';
import {readControlBindings,type ControlAction} from '../../src/control-bindings';
import {APP_FAILURES_ATTRIBUTE,APP_RAN_ATTRIBUTE,APP_STATE_ATTRIBUTES,readRan,type AppState} from '../../src/app-state';
import {PRACTICE_MENU_KEYS,READER_COMMAND_KEYS} from '../../src/command-keys';

/** The dialog a score opens behind. */
export const OPENING_DIALOG='score-reading';
export type State=Partial<Record<keyof AppState,string>>&{ran:Map<string,number>;failures:number};
/** Keys as the player's saved preferences assign them. */
export function appKeys(preferences:Record<string,unknown>|null){
 const bindings=readControlBindings(preferences?.controlBindings,{bindings:preferences?.bindings,midi:preferences?.midi,midiBindings:preferences?.midiBindings});
 const key=(action:ControlAction)=>{const found=bindings.actions[action]?.find(b=>b?.kind==='key');if(!found||found.kind!=='key')throw Error(`No key is assigned to ${action}.`);return found.key.replace(/\bCtrl\+/,'Control+');};
 return {edit:key('edit'),toggle:key('toggle'),options:key('practiceSettings'),practice:READER_COMMAND_KEYS.practice,import:READER_COMMAND_KEYS.import,fingers:PRACTICE_MENU_KEYS['practice-fingers'],sections:PRACTICE_MENU_KEYS['practice-sections'],back:'Escape',choose:'Enter'};
}
export type Keys=ReturnType<typeof appKeys>;
export class StateTimeout extends Error {constructor(what:string,public state:State){super(`Timed out waiting for ${what}; the application declares ${JSON.stringify({...state,ran:undefined})}`);}}

const READ_STATE=`(()=>{const app=document.querySelector('#app'),out={};for(const [key,name] of ${JSON.stringify(Object.entries(APP_STATE_ATTRIBUTES))}){const v=app?.getAttribute(name);if(v!==null&&v!==undefined)out[key]=v;}out.ran=app?.getAttribute(${JSON.stringify(APP_RAN_ATTRIBUTE)});out.failures=Number(app?.getAttribute(${JSON.stringify(APP_FAILURES_ATTRIBUTE)})??0);return out;})()`;
/** What is wrong on screen, by the application's own error elements. */
const PROBLEMS=`[...document.querySelectorAll('.practice-render-error,.section-fingering-error,dialog[data-kind=loading-failed],[role=alert]')].map(e=>({kind:e.matches('dialog')?'loading-failed':e.className||e.getAttribute('role'),text:e.textContent.trim().replace(/\\s+/g,' ').slice(0,300)})).filter(p=>p.text)`;

const FOCUS=`(()=>{const a=document.activeElement;return a?a.tagName.toLowerCase()+(a.className?'.'+String(a.className).split(' ').join('.'):'')+(a.closest('dialog')?' in dialog '+a.closest('dialog').dataset.kind:''):'nothing'})()`;
export class Driver {
 constructor(readonly page:Page,readonly keys:Keys){}
 async state():Promise<State>{const s=await this.page.evaluate(READ_STATE) as State&{ran:string|null};return {...s,ran:readRan(s.ran)};}
 /** Polls the declared state until `done` holds. */
 async until(done:(s:State)=>boolean,what:string,timeout=120_000):Promise<State>{
  const start=Date.now(),end=start+timeout;let s=await this.state(),said=false;
  while(!done(s)){if(Date.now()>end)throw new StateTimeout(what,s);if(!said&&Date.now()-start>20_000){said=true;console.log(`    … still waiting for ${what}; the application declares ${JSON.stringify({...s,ran:undefined})}`);}await this.page.waitForTimeout(20);s=await this.state();}
  return s;
 }
 async press(key:string){await this.page.keyboard.press(key);}
 problems():Promise<Array<{kind:string;text:string}>>{return this.page.evaluate(PROBLEMS);}
 count(selector:string){return this.page.locator(selector).count();}

 async openLibrary(){await this.until(s=>s.screen==='library'||s.screen==='reader'||s.screen==='practice','the application to start',180_000);await this.toLibrary();}
 /** Esc goes up one level at a time until the library shows. */
 async toLibrary(){
  for(let i=0;i<8;i++){const s=await this.until(s=>!s.busy||s.busy==='press','a quiet moment');if(s.screen==='library'&&!s.dialog)return;await this.back();}
  throw new StateTimeout('the library',await this.state());
 }
 /** Esc once; resolves when the declared state has changed. */
 async back(){const before=await this.state();await this.press(this.keys.back);await this.until(s=>s.screen!==before.screen||s.dialog!==before.dialog||s.editing!==before.editing||s.section!==before.section||s.step!==before.step||s.busy!==before.busy,'Esc to take effect',30_000).catch(async()=>console.log(`    Esc changed nothing; focus on ${await this.page.evaluate(FOCUS)}`));}
 /** Shows a score's row, opening its composer's group if needed, and focuses it. */
 async focusScore(id:string){
  const any=this.page.locator(`[data-open="${id}"]`),shown=this.page.locator(`[data-open="${id}"]:not([hidden])`);
  if(!await any.count())throw Error(`The library has no row for score ${id}.`);
  if(!await shown.count()){
   // A collapsed composer's scores are hidden; choosing the composer opens its group.
   const composer=this.page.locator(`.composer-entry[data-composer="${await any.getAttribute('data-composer')}"]`);
   await composer.focus();if(!await shown.count())await this.press(this.keys.choose);
   if(!await shown.count())throw Error(`Score ${id} stays hidden in its composer's group.`);
  }
  await shown.focus();
  if(!await shown.evaluate(row=>row===document.activeElement))throw Error(`Score ${id}'s row did not take focus.`);
 }
 /** Opens a score from the library; resolves with its time to a quiet reader. */
 async openScore(id:string,timeout=600_000){
  await this.toLibrary();await this.focusScore(id);const t0=performance.now();await this.press(this.keys.choose);
  const s=await this.until(s=>s.screen==='reader'&&!s.dialog&&!s.busy?.includes('reading')||s.dialog==='loading-failed'||(s.screen==='library'&&!s.busy&&performance.now()-t0>1000),`score ${id} to open`,timeout);
  if(s.screen==='reader'&&s.score!==id)throw Error(`Enter on score ${id}'s row opened score ${s.score}.`);
  return {ms:Math.round(performance.now()-t0),state:s};
 }
 /** Imports the file the host's picker will return; resolves with the new score's id. */
 async importScore(timeout=900_000){
  await this.toLibrary();const t0=performance.now();await this.press(this.keys.import);
  const s=await this.until(s=>s.screen==='reader'&&!!s.score&&!s.dialog&&!s.busy?.includes('reading')||s.dialog==='loading-failed','the import',timeout);
  return {ms:Math.round(performance.now()-t0),state:s};
 }
 /** The reader's pages: how many, and how many carry their drawing. */
 async pages(){return {pages:await this.count('.reader .page'),drawn:await this.count('.reader .page svg')};}
 /** Changes the keyboard layout from the reader, as the toolbar's Instrument does. */
 async setLayout(layout:string,timeout=600_000){
  const s=await this.state();if(s.layout===layout)return {ms:0,changed:false};
  const t0=performance.now();
  const found=await this.page.evaluate(`(()=>{const select=document.querySelector('select[data-keyboard]');if(!select)return false;select.value=${JSON.stringify(layout)};select.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
  if(!found)throw Error('This screen offers no keyboard layout.');
  await this.until(s=>s.layout===layout&&!s.busy&&!s.dialog,`the ${layout} layout`,timeout);
  return {ms:Math.round(performance.now()-t0),changed:true};
 }
 /** P from the reader. Resolves with what it led to: the practice menu,
 * practice itself, or nothing (refused, or not offered). */
 async choosePractice(settle=4000):Promise<'menu'|'practice'|'none'>{
  const before=await this.state();await this.press(this.keys.practice);const t0=performance.now();
  const s=await this.until(s=>s.dialog==='practice-menu'||s.screen==='practice'||s.failures>before.failures||(!s.busy&&performance.now()-t0>settle),'P to answer');
  return s.dialog==='practice-menu'?'menu':s.screen==='practice'?'practice':'none';
 }
 /** Chooses Fingers or Sections in the practice menu; answers a tempo prompt by keeping its tempo. */
 async chooseStep(step:'fingers'|'sections',timeout=600_000){
  const t0=performance.now();await this.press(step==='fingers'?this.keys.fingers:this.keys.sections);
  for(;;){
   const s=await this.until(s=>s.dialog==='score-tempo'||s.screen==='practice'&&s.step===step&&!s.busy&&!s.dialog||s.failures>0&&!s.busy&&s.screen!=='practice',`the ${step} step`,timeout);
   if(s.dialog!=='score-tempo')return {ms:Math.round(performance.now()-t0),state:s};
   await this.press(this.keys.choose);await this.until(s=>s.dialog!=='score-tempo','the tempo prompt to close',30_000);
  }
 }
 /** The sections practice lists, by their ids. */
 sections():Promise<string[]>{return this.page.evaluate(`[...document.querySelectorAll('.practice-overview [data-passage-id][data-component=false]')].map(e=>e.dataset.passageId)`);}
 /** The section the list of sections has selected: the one Enter practises. */
 selectedSection():Promise<string|undefined>{return this.page.evaluate(`document.querySelector('.practice-overview [data-passage-id][data-component=false][tabindex="0"]')?.dataset.passageId`);}
 /** Enters one section: the arrows walk the list to it, as a player's would, and Enter practises it. */
 async enterSection(id:string,timeout=120_000){
  const order=await this.sections();
  for(let step=0;step<=order.length+1;step++){
   const at=await this.selectedSection();if(at===id)break;
   const here=order.indexOf(at??''),there=order.indexOf(id);if(there<0)throw Error(`Section ${id} is not listed.`);
   await this.press(here>=0&&here>there?'ArrowUp':'ArrowDown');
  }
  if(await this.selectedSection()!==id)return {ms:0,entered:false,state:await this.state(),selected:await this.selectedSection()};
  await this.page.locator(`.practice-overview [data-passage-id="${id}"][data-component=false]`).focus();
  const t0=performance.now();await this.press(this.keys.choose);
  const s=await this.until(s=>s.section===id&&!s.busy,`section ${id}`,timeout).catch(async error=>{if(error instanceof StateTimeout)return error.state;throw error;});
  return {ms:Math.round(performance.now()-t0),entered:s.section===id,state:s};
 }
 /** The drawing practice shows now: a section's music, or the Fingers measure. */
 async practiceDrawing(){return {section:await this.count('.practice-stage svg'),fingers:await this.count('.section-fingering:not([hidden]) .section-fingering-stage svg')};}
 /** Esc until the reader shows. */
 async toReader(){for(let i=0;i<6;i++){const s=await this.state();if(s.screen==='reader'&&!s.dialog)return;if(s.screen==='library')throw Error('Left the score instead of practice.');await this.back();}throw new StateTimeout('the reader',await this.state());}
 /** Walks Fingers to its last measure. */
 async fingersToEnd(){await this.press('End');await this.page.waitForTimeout(300);}
 /** Starts opening a focused score and returns at once: for presses timed against the opening. */
 async startOpen(id:string){await this.toLibrary();await this.focusScore(id);await this.press(this.keys.choose);}
 /** The key that runs a reader command. */
 keyFor(action:'practice'|'edit'|'toggle'){return this.keys[action];}
 /** The moments the page recorded: dialogs leaving and keys arriving (page.js). */
 marks():Promise<{closed:Array<{kind:string;at:number}>;keys:Array<{code:string;at:number}>;screens:Array<{screen:string;at:number}>}>{return this.page.evaluate('window.__rehearsal');}
}
