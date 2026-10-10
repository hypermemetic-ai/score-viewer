import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultBindings} from '../src/input';
import {ControlResolver,readControlBindings,replaceControl,practiceControlBindings,controlActionAllowed,actionControlLabel} from '../src/control-bindings';
import {freeViewControlBindings,changeScopedControls} from '../src/free-view-controls';
import {optionsBindingRows} from '../src/options-bindings';
const base=()=>readControlBindings(undefined,{bindings:defaultBindings()});
const key=(code:string,extra={})=>({code,repeat:false,ctrlKey:false,altKey:false,shiftKey:false,metaKey:false,...extra});
test('missing piano modes fill only unclaimed keys after all saved and local owners, preserving literal dictionaries',()=>{
 const raw=base(),before=JSON.stringify(raw),effective=practiceControlBindings(freeViewControlBindings(raw));
 assert.equal(actionControlLabel(effective,'practiceReading'),'U');assert.equal(actionControlLabel(effective,'practiceTimed'),'T');assert.equal(actionControlLabel(effective,'practiceFreeView'),'V');assert.equal(JSON.stringify(raw),before);
 for(const [action,code]of [['practiceReading','KeyU'],['practiceTimed','KeyT'],['practiceFreeView','KeyV']] as const){
  for(const slot of [0,1] as const){const saved=replaceControl(raw,'edit',slot,{kind:'key',key:code}),admitted=practiceControlBindings(freeViewControlBindings(saved));assert.deepEqual(admitted.actions[action],[null,null]);assert.equal(new ControlResolver(admitted).keyDown(key(code),true).action,'edit');}
  const local={version:1 as const,actions:{next:{1:{kind:'key' as const,key:code}}}},admitted=practiceControlBindings(freeViewControlBindings(raw,local));assert.deepEqual(admitted.actions[action],[null,null]);assert.equal(new ControlResolver(admitted).keyDown(key(code),true).action,'next');
 }
 assert.equal(readControlBindings(raw,{bindings:defaultBindings()}).actions.practiceReading,undefined);
});
test('explicit mode emptiness and custom controls remain authoritative across reload and inherit local navigation safely',()=>{
 let saved=replaceControl(base(),'practiceReading',0,null);saved=replaceControl(saved,'practiceTimed',1,{kind:'key',key:'Ctrl+KeyT'});saved=replaceControl(saved,'practiceFreeView',0,{kind:'key',key:'F8'});
 const before=JSON.stringify(saved),effective=practiceControlBindings(freeViewControlBindings(readControlBindings(saved,{bindings:{}})));
 assert.deepEqual(effective.actions.practiceReading,[null,null]);assert.deepEqual(effective.actions.practiceTimed,[null,{kind:'key',key:'Ctrl+KeyT'}]);assert.equal(actionControlLabel(effective,'practiceFreeView'),'F8');assert.equal(new ControlResolver(effective).keyDown(key('KeyT'),true).action,undefined);assert.equal(new ControlResolver(effective).keyDown(key('KeyT',{ctrlKey:true}),true).action,'practiceTimed');assert.equal(JSON.stringify(saved),before);
 const local=changeScopedControls(saved,undefined,true,{kind:'assign',action:'previous',slot:0,binding:{kind:'key',key:'F7'}});assert.equal(actionControlLabel(practiceControlBindings(freeViewControlBindings(local.main,local.overrides)),'previous'),'F7');assert.deepEqual(local.main.actions.practiceFreeView,saved.actions.practiceFreeView);
 assert.throws(()=>changeScopedControls(saved,undefined,true,{kind:'assign',action:'next',slot:1,binding:{kind:'key',key:'F8'}}),/conflict/);
});
test('mode actions are scoped, modal guarded and share one key/pedal edge and release quarantine',()=>{
 const bindings=replaceControl(practiceControlBindings(base()),'practiceReading',1,{kind:'midi',source:'Piano',channel:1,controller:66,press:90,release:20}),resolver=new ControlResolver(bindings),connection={source:'Piano',generation:4};
 for(const context of [{practice:false,practiceModes:true},{practice:true,practiceModes:false},{practice:true,practiceModes:true,modal:true},{practice:true,practiceModes:true,selecting:true}])assert.equal(controlActionAllowed('practiceReading',{modal:false,selecting:false,...context}),false);
 assert.equal(controlActionAllowed('practiceReading',{modal:false,selecting:false,practice:true,practiceModes:true}),true);
 assert.equal(resolver.keyDown(key('KeyU'),true).action,'practiceReading');assert.equal(resolver.keyDown(key('KeyU',{repeat:true}),true).action,undefined);resolver.clear();assert.equal(resolver.keyDown(key('KeyU'),true).action,undefined);resolver.keyUp({code:'KeyU'});assert.equal(resolver.keyDown(key('KeyU'),true).action,'practiceReading');resolver.keyUp({code:'KeyU'});
 const cc=(value:number,extra={})=>({...connection,channel:1,controller:66,value,...extra});assert.equal(resolver.receive(cc(100,{generation:3}),connection,true).action,undefined);assert.equal(resolver.receive(cc(100),connection,true).action,'practiceReading');resolver.clear();assert.equal(resolver.receive(cc(100),connection,true).action,undefined);resolver.receive(cc(20),connection,true);assert.equal(resolver.receive(cc(100),connection,true).action,'practiceReading');
 assert.ok(optionsBindingRows({active:true,modes:true,measureNavigation:false}).some(x=>x.action==='practiceTimed'));assert.ok(!optionsBindingRows({active:true,measureNavigation:true}).some(x=>x.action==='practiceTimed'));assert.ok(!optionsBindingRows({active:false,modes:true,measureNavigation:false}).some(x=>x.action==='practiceTimed'));
});
test('editing an implicitly shown secondary mode slot retains its primary without persisting other defaults',()=>{
 const raw=base(),before=JSON.stringify(raw),local={version:1 as const,actions:{next:{1:{kind:'key' as const,key:'KeyT'}}}},next=changeScopedControls(raw,local,true,{kind:'assign',action:'practiceReading',slot:1,binding:{kind:'key',key:'F7'}});
 assert.deepEqual(next.main.actions.practiceReading,[{kind:'key',key:'KeyU'},{kind:'key',key:'F7'}]);assert.equal(next.main.actions.practiceTimed,undefined);assert.deepEqual(practiceControlBindings(freeViewControlBindings(next.main,next.overrides)).actions.practiceTimed,[null,null]);assert.equal(JSON.stringify(raw),before);
 const removed=changeScopedControls(raw,undefined,true,{kind:'assign',action:'practiceReading',slot:0,binding:null});assert.deepEqual(removed.main.actions.practiceReading,[null,null]);
});
test('Free view has the same configurable authority in piano and neutral manual practice without inventing Reading',()=>{
 const saved=replaceControl(base(),'practiceFreeView',0,{kind:'key',key:'F8'}),manual=practiceControlBindings(freeViewControlBindings(saved),false),piano=practiceControlBindings(freeViewControlBindings(saved));
 assert.equal(actionControlLabel(manual,'practiceFreeView'),actionControlLabel(piano,'practiceFreeView'));assert.equal(new ControlResolver(manual).keyDown(key('F8'),true).action,'practiceFreeView');assert.equal(new ControlResolver(manual).keyDown(key('KeyV'),true).action,undefined);assert.equal(manual.actions.practiceReading,undefined);assert.equal(manual.actions.practiceTimed,undefined);assert.equal(controlActionAllowed('practiceFreeView',{modal:false,selecting:false,practice:true,practiceModes:false,practiceFreeView:true}),true);assert.equal(controlActionAllowed('practiceReading',{modal:false,selecting:false,practice:true,practiceModes:false,practiceFreeView:true}),false);
 assert.equal(actionControlLabel(practiceControlBindings(base(),false),'practiceFreeView'),'V');assert.deepEqual(practiceControlBindings(replaceControl(base(),'practiceFreeView',0,null),false).actions.practiceFreeView,[null,null]);assert.ok(optionsBindingRows({active:true,measureNavigation:true}).some(x=>x.action==='practiceFreeView'));assert.ok(!optionsBindingRows({active:true,measureNavigation:true}).some(x=>x.action==='practiceReading'));
});
