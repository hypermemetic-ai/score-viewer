import test from 'node:test';
import assert from 'node:assert/strict';
import {ControlResolver,readControlBindings,editorControlBindings,readerControlBindings,practiceControlBindings,replaceControl,controlActionAllowed} from '../src/control-bindings';
import {changeScopedControls,freeViewControlBindings} from '../src/free-view-controls';
import {defaultBindings} from '../src/input';
import {optionsBindingRows} from '../src/options-bindings';
const initial=()=>readControlBindings(undefined,{bindings:defaultBindings()});
test('editor defaults are contextual without rewriting stored dictionaries',()=>{
 const saved=initial(),before=structuredClone(saved),editing=editorControlBindings(saved);
 assert.deepEqual(editing.actions.editorNavigation,[{kind:'key',key:'Space'},null]);assert.deepEqual(editing.actions.editorNext,[{kind:'key',key:'ArrowRight'},null]);assert.deepEqual(saved,before);
 assert.equal(readerControlBindings(saved).actions.editorNavigation,undefined);assert.equal(practiceControlBindings(saved).actions.editorNavigation,undefined);
 const rows=optionsBindingRows(undefined,undefined,true,true);assert.ok(rows.some(row=>row.action==='editorNavigation'));assert.ok(!rows.some(row=>row.action==='previous'||row.action==='done'));
});
test('compatible editor and practice assignments share controls while simultaneous commands conflict',()=>{
 let saved=replaceControl(initial(),'editorNext',0,{kind:'key',key:'ArrowRight'});saved=replaceControl(saved,'editorNavigation',0,{kind:'key',key:'Enter'});
 assert.equal(new ControlResolver(editorControlBindings(saved)).match({kind:'key',key:'Enter'})?.action,'editorNavigation');assert.equal(new ControlResolver(practiceControlBindings(saved)).match({kind:'key',key:'Enter'})?.action,'done');
 assert.throws(()=>replaceControl(saved,'editorPrevious',0,{kind:'key',key:'Enter'}),/assigned/);assert.throws(()=>replaceControl(saved,'editorNavigation',0,{kind:'key',key:'KeyF'}),/assigned/);
 assert.doesNotThrow(()=>freeViewControlBindings(saved));
 for(const action of ['editorPrevious','editorNext','editorNavigation'] as const){assert.equal(controlActionAllowed(action,{modal:false,selecting:true,practice:false}),true);assert.equal(controlActionAllowed(action,{modal:true,selecting:true,practice:false}),false);assert.equal(controlActionAllowed(action,{modal:false,selecting:false,practice:true}),false);}
});
test('defaults yield to explicit user assignments and explicit empty editor controls stay empty',()=>{
 const saved=replaceControl(initial(),'done',0,{kind:'key',key:'Space'});assert.deepEqual(editorControlBindings(saved).actions.editorNavigation,[null,null]);
 const explicit=replaceControl(saved,'editorNavigation',0,{kind:'key',key:'Space'});assert.equal(editorControlBindings(explicit).actions.editorNavigation?.[0]?.kind,'key');
 const removed=replaceControl(initial(),'editorNavigation',0,null);assert.deepEqual(editorControlBindings(removed).actions.editorNavigation,[null,null]);
 const secondary=changeScopedControls(initial(),undefined,false,{kind:'assign',action:'editorNavigation',slot:1,binding:{kind:'key',key:'KeyN'}}).main;assert.deepEqual(secondary.actions.editorNavigation,[{kind:'key',key:'Space'},{kind:'key',key:'KeyN'}]);
});

test('editor commands cannot take the fixed finger, hand, Tab, system or exit controls',()=>{
 for(const key of ['Digit1','Numpad5','KeyL','KeyR','Tab','Shift+Tab','ArrowUp','ArrowDown','Escape'])assert.throws(()=>replaceControl(initial(),'editorNavigation',0,{kind:'key',key}),/reserved/);
});
