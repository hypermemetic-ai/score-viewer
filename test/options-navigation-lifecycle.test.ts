import test from 'node:test';
import assert from 'node:assert/strict';
import {OptionsNavigation} from '../src/options-navigation';

test('a persistent native selector can be navigated again after its Options owner is disposed',()=>{
 const previousDocument=globalThis.document,previousObserver=globalThis.MutationObserver;
 const buttons:any[]=[];
 class Select extends EventTarget {
  dataset:Record<string,string>={};hidden=false;id='device';name='';disabled=false;selectedIndex=1;
  options=[{textContent:'First device'},{textContent:'Second device'}];listeners=new Set<EventListenerOrEventListenerObject>();
  get selectedOptions(){return [this.options[this.selectedIndex]];}
  hasAttribute(){return false;}getAttribute(){return 'MIDI input';}closest(){return null;}
  after(button:any){buttons.push(button);}
  override addEventListener(type:string,listener:any,options?:any){this.listeners.add(listener);super.addEventListener(type,listener,options);}
  override removeEventListener(type:string,listener:any,options?:any){super.removeEventListener(type,listener,options);if(type==='options-selection')this.listeners.delete(listener);}
 }
 const select=new Select(),root={dataset:{},querySelector:()=>null,
  querySelectorAll:(selector:string)=>selector.startsWith('select:')?(select.dataset.optionsNative===undefined?[select]:[]):buttons,
  addEventListener(){},removeEventListener(){}};
 const createButton=()=>{const button:any={dataset:{},disabled:false,tabIndex:0,hasAttribute:()=>false,closest:()=>null,getClientRects:()=>[{}],setAttribute(){},remove(){buttons.splice(buttons.indexOf(button),1);}};return button;};
 try{
  Object.assign(globalThis,{document:{activeElement:null,createElement:createButton},MutationObserver:class{observe(){}disconnect(){}}});
  const first=new OptionsNavigation(root as unknown as HTMLElement,()=>{},()=>false,{focusOnPrepare:false});
  assert.equal(buttons.length,1);assert.equal(select.hidden,true);assert.equal(buttons[0].textContent,'Second device');
  select.selectedIndex=0;select.dispatchEvent(new Event('change'));assert.equal(buttons[0].textContent,'First device');
  first.dispose();first.dispose();assert.equal(buttons.length,0);assert.equal(select.hidden,false);assert.equal(select.dataset.optionsNative,undefined);assert.equal(select.listeners.size,0);
  const second=new OptionsNavigation(root as unknown as HTMLElement,()=>{},()=>false,{focusOnPrepare:false});
  assert.equal(buttons.length,1);assert.equal(buttons[0].textContent,'First device');assert.equal(typeof buttons[0].onclick,'function');
  second.dispose();assert.equal(select.selectedIndex,0,'owner changes preserve the chosen device');assert.equal(select.listeners.size,0);
 }finally{Object.assign(globalThis,{document:previousDocument,MutationObserver:previousObserver});}
});
