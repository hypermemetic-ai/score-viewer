import test from 'node:test';
import assert from 'node:assert/strict';
import {actionCode,chord,defaultBindings,inputCode,InputController,readBindings} from '../src/input';
import {ControlResolver,readControlBindings,replaceControl} from '../src/control-bindings';
import {ReadingBindingSession} from '../src/reading-bindings';

const key=(code:string,extra:Record<string,unknown>={})=>({code,key:'Enter',ctrlKey:false,altKey:false,shiftKey:false,metaKey:false,repeat:false,...extra});
const defaults=()=>readControlBindings(undefined,{bindings:defaultBindings()});

test('only UI keypad Enter aliases Enter; physical keys and unrelated packets retain their identities',()=>{
 for(const code of ['Enter','NumpadEnter']){assert.equal(actionCode(key(code)),'Enter');assert.equal(inputCode(key(code)),code);}
 for(const code of ['Escape','Space','Tab','NumpadAdd','Unidentified'])assert.equal(actionCode({code,key:'Enter'}),code);
 assert.equal(inputCode({code:'Unidentified',key:'o'}),'KeyO');
 assert.equal(inputCode({code:'Numpad2',key:'2'}),'Digit2');
});

test('physical capture and UI alias preserve modifiers without rewriting saved dictionaries',()=>{
 const saved=defaults(),before=JSON.stringify(saved);
 for(const code of ['Enter','NumpadEnter']){
  assert.equal(chord(key(code)),code);
  assert.equal(chord(key(code,{ctrlKey:true,shiftKey:true})),'Ctrl+Shift+'+code);
  assert.equal(chord(key(code,{altKey:true,metaKey:true}),actionCode(key(code))),'Alt+Meta+Enter');
 }
 assert.deepEqual(readControlBindings(saved,{bindings:defaultBindings()}),saved);
 assert.equal(JSON.stringify(saved),before);
});

test('both default Enter controls suppress repeats and quarantine their own physical edge until release',()=>{
 for(const code of ['Enter','NumpadEnter']){
  const r=new ControlResolver(defaults());
  assert.equal(r.keyDown(key(code),true).action,'done');
  assert.equal(r.keyDown(key(code,{repeat:true}),true).action,undefined);
  r.clear();assert.equal(r.keyDown(key(code),true).action,undefined);
  r.keyUp({code});assert.equal(r.keyDown(key(code),true).action,'done');
  r.keyUp({code});assert.deepEqual(r.heldMatches,[]);
 }
});

test('releasing either physical Enter leaves the other held and does not manufacture another edge',()=>{
 for(const first of ['Enter','NumpadEnter']){
  const second=first==='Enter'?'NumpadEnter':'Enter',r=new ControlResolver(defaults());
  assert.equal(r.keyDown(key(first),true).action,'done');assert.equal(r.keyDown(key(second),true).action,'done');
  assert.equal(r.heldMatches.length,2);r.keyUp({code:first});assert.equal(r.heldMatches.length,1);
  assert.equal(r.keyDown(key(second),true).action,undefined);r.keyUp({code:second});assert.equal(r.heldMatches.length,0);
  const c=new InputController();c.down(key(first),true,false);c.down(key(second),true,false);
  c.up({code:first});assert.deepEqual([...c.held],[second]);c.up({code:second});assert.equal(c.held.size,0);
 }
});

test('an explicit saved keypad chord wins over the Enter fallback and retains raw preference identity',()=>{
 for(const modified of [false,true]){
  const physical=(modified?'Ctrl+':'')+'NumpadEnter',saved=replaceControl(defaults(),'edit',0,{kind:'key',key:physical}),before=JSON.stringify(saved),r=new ControlResolver(saved);
  assert.equal(r.keyDown(key('NumpadEnter',{ctrlKey:modified}),true).action,'edit');r.keyUp({code:'NumpadEnter'});
  assert.equal(r.keyDown(key('Enter'),true).action,'done');assert.equal(JSON.stringify(saved),before);
  const bindings=readBindings({...defaultBindings(),edit:physical}),c=new InputController(bindings);
  assert.equal(c.down(key('NumpadEnter',{ctrlKey:modified}),true,false).action,'edit');c.up({code:'NumpadEnter'});
  assert.equal(c.down(key('Enter'),true,false).action,'done');assert.equal(bindings.edit,physical);
 }
});

test('remapped and empty Done controls are not revived by either Enter key',()=>{
 for(const replacement of [null,{kind:'key' as const,key:'F10'}]){
  const saved=replaceControl(defaults(),'done',0,replacement),before=JSON.stringify(saved);
  for(const code of ['Enter','NumpadEnter']){
   const r=new ControlResolver(saved);assert.equal(r.keyDown(key(code),true).action,undefined);r.keyUp({code});
   assert.equal(r.keyDown(key(code,{ctrlKey:true}),true).action,undefined);
  }
  assert.equal(JSON.stringify(saved),before);
 }
});

test('library eligibility and dispatch resolve admitted Enter Options together without overriding a keypad assignment',()=>{
 const saved=replaceControl(replaceControl(defaults(),'done',0,{kind:'key',key:'F10'}),'practiceSettings',0,{kind:'key',key:'Enter'}),before=JSON.stringify(saved);
 for(const code of ['Enter','NumpadEnter']){const r=new ControlResolver(saved);assert.equal(r.matchKey(key(code))?.action,'practiceSettings');assert.equal(r.keyDown(key(code),r.matchKey(key(code))?.action==='practiceSettings').action,'practiceSettings');r.keyUp({code});assert.equal(r.matchKey(key(code,{ctrlKey:true})),undefined);}
 const exact=new ControlResolver(replaceControl(saved,'edit',0,{kind:'key',key:'NumpadEnter'}));assert.equal(exact.matchKey(key('NumpadEnter'))?.action,'edit');assert.equal(exact.keyDown(key('NumpadEnter'),exact.matchKey(key('NumpadEnter'))?.action==='practiceSettings').action,undefined);exact.keyUp({code:'NumpadEnter'});assert.equal(exact.keyDown(key('Enter'),true).action,'practiceSettings');assert.equal(JSON.stringify(saved),before);
});

test('legacy capture reserves both Enter confirmations but retains the exact captured Done chord',()=>{
 for(const code of ['Enter','NumpadEnter']){
  const c=new InputController(readBindings(undefined));c.capture='edit';
  assert.deepEqual(c.down(key(code),false,true),{});assert.equal(c.capture,'edit');
  c.up({code});assert.equal(c.held.size,0);c.capture='done';
  assert.deepEqual(c.down(key(code,{ctrlKey:true}),false,true).learned,{action:'done',chord:'Ctrl+'+code});
  assert.equal(c.capture,undefined);assert.equal(c.held.size,0);
 }
});

test('legacy binding session reserves Enter confirmation and keeps modified physical Done capture literal',async()=>{
 for(const code of ['Enter','NumpadEnter']){
  const saved:string[]=[],messages:string[]=[];
  const session=new ReadingBindingSession({keys:defaultBindings,pedals:()=>({}),connection:()=>undefined,channel:()=>undefined,saveKey:async(_action,chord)=>{saved.push(chord);},savePedal:async()=>{},restorePages:async()=>{},suspend:()=>{}},(_action,message)=>messages.push(message));
  session.begin('edit','key');assert.equal(session.keyDown(key(code)),true);
  assert.equal(saved.length,0);assert.match(messages.at(-1)!,/Enter confirms/);
  session.keyUp({code});session.begin('done','key');session.keyDown(key(code,{shiftKey:true}));
  await Promise.resolve();assert.deepEqual(saved,['Shift+'+code]);session.dispose();
 }
});
