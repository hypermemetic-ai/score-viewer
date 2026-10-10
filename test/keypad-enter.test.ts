import test from 'node:test';
import assert from 'node:assert/strict';
import {chord,defaultBindings,inputCode,InputController,readBindings} from '../src/input';
import {ControlResolver,readControlBindings,replaceControl} from '../src/control-bindings';
import {ReadingBindingSession} from '../src/reading-bindings';

const key=(code:string,extra:Record<string,unknown>={})=>({code,key:'Enter',ctrlKey:false,altKey:false,shiftKey:false,metaKey:false,repeat:false,...extra});
const defaults=()=>readControlBindings(undefined,{bindings:defaultBindings()});

test('only the physical keypad Enter aliases Enter; packet letters and unrelated keys retain their behavior',()=>{
 for(const code of ['Enter','NumpadEnter'])assert.equal(inputCode(key(code)),'Enter');
 for(const code of ['Escape','Space','Tab','NumpadAdd','Unidentified'])assert.equal(inputCode({code,key:'Enter'}),code);
 assert.equal(inputCode({code:'Unidentified',key:'o'}),'KeyO');
 assert.equal(inputCode({code:'Numpad2',key:'2'}),'Digit2');
});

test('Enter aliases preserve modifiers and leave saved dictionaries unchanged',()=>{
 const saved=defaults(),before=JSON.stringify(saved);
 for(const code of ['Enter','NumpadEnter']){
  assert.equal(chord(key(code)),'Enter');
  assert.equal(chord(key(code,{ctrlKey:true,shiftKey:true})),'Ctrl+Shift+Enter');
  assert.equal(chord(key(code,{altKey:true,metaKey:true})),'Alt+Meta+Enter');
 }
 assert.deepEqual(readControlBindings(saved,{bindings:defaultBindings()}),saved);
 assert.equal(JSON.stringify(saved),before);
});

test('action edges and release quarantine are identical for both Enter keys',()=>{
 for(const code of ['Enter','NumpadEnter']){
  const r=new ControlResolver(defaults());
  assert.equal(r.keyDown(key(code),true).action,'done');
  assert.equal(r.keyDown(key(code,{repeat:true}),true).action,undefined);
  assert.equal(r.keyDown(key(code==='Enter'?'NumpadEnter':'Enter'),true).action,undefined);
  r.clear();assert.equal(r.keyDown(key(code),true).action,undefined);
  r.keyUp({code});assert.equal(r.keyDown(key(code),true).action,'done');
  r.keyUp({code});assert.deepEqual(r.heldMatches,[]);
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

test('legacy capture reserves both Enter keys for confirmation and captures Done as the same chord',()=>{
 for(const code of ['Enter','NumpadEnter']){
  const c=new InputController(readBindings(undefined));c.capture='edit';
  assert.deepEqual(c.down(key(code),false,true),{});assert.equal(c.capture,'edit');
  c.up({code});assert.equal(c.held.size,0);c.capture='done';
  assert.deepEqual(c.down(key(code,{ctrlKey:true}),false,true).learned,{action:'done',chord:'Ctrl+Enter'});
  assert.equal(c.capture,undefined);assert.equal(c.held.size,0);
 }
});

test('legacy binding session confirmation and captured modified Done agree for regular/keypad Enter',async()=>{
 for(const code of ['Enter','NumpadEnter']){
  const saved:string[]=[],messages:string[]=[];
  const session=new ReadingBindingSession({keys:defaultBindings,pedals:()=>({}),connection:()=>undefined,channel:()=>undefined,saveKey:async(_action,chord)=>{saved.push(chord);},savePedal:async()=>{},restorePages:async()=>{},suspend:()=>{}},(_action,message)=>messages.push(message));
  session.begin('edit','key');assert.equal(session.keyDown(key(code)),true);
  assert.equal(saved.length,0);assert.match(messages.at(-1)!,/Enter confirms/);
  session.keyUp({code});session.begin('done','key');session.keyDown(key(code,{shiftKey:true}));
  await Promise.resolve();assert.deepEqual(saved,['Shift+Enter']);session.dispose();
 }
});
