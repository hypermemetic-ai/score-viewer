import test from 'node:test';import assert from 'node:assert/strict';
import {defaultBindings} from '../src/input';
import {ControlResolver,readControlBindings,replaceControl,type ControlBinding} from '../src/control-bindings';
import {changeScopedControls,freeViewControlBindings,readFreeViewControlOverrides,hasFreeViewOverride} from '../src/free-view-controls';
const base=()=>readControlBindings(undefined,{bindings:defaultBindings()}),key=(key:string):ControlBinding=>({kind:'key',key}),pedal=(controller=66):ControlBinding=>({kind:'midi',source:'Piano',channel:2,controller,press:100,release:20});

test('older main dictionaries and explicit empty slots inherit without mutation or a default override',()=>{
 const main=replaceControl(base(),'previous',0,null),before=JSON.stringify(main);assert.equal(readFreeViewControlOverrides(undefined,main),undefined);assert.deepEqual(freeViewControlBindings(main),main);assert.equal(JSON.stringify(main),before);
 const old=structuredClone(base());delete (old.actions as any).practiceSettings;const raw=JSON.stringify(old),admitted=readControlBindings(old,{bindings:defaultBindings()});assert.deepEqual(freeViewControlBindings(admitted),admitted);assert.equal(JSON.stringify(old),raw);
});
test('a local keyboard slot leaves its MIDI companion live and preserves every main assignment',()=>{
 let main=replaceControl(base(),'previous',1,pedal()),before=JSON.stringify(main);const local=changeScopedControls(main,undefined,true,{kind:'assign',action:'previous',slot:0,binding:key('Ctrl+KeyX')});assert.equal(local.main,main);assert.equal(JSON.stringify(main),before);assert.deepEqual(local.overrides,{version:1,actions:{previous:{0:key('Ctrl+KeyX')}}});
 main=changeScopedControls(main,local.overrides,false,{kind:'assign',action:'previous',slot:1,binding:pedal(67)}).main;main=changeScopedControls(main,local.overrides,false,{kind:'assign',action:'next',slot:0,binding:key('F12')}).main;
 const effective=freeViewControlBindings(main,local.overrides);assert.deepEqual(effective.actions.previous,[key('Ctrl+KeyX'),pedal(67)]);assert.deepEqual(effective.actions.next,[key('F12'),null]);assert.deepEqual(main.actions.previous,[key('ArrowLeft'),pedal(67)]);assert.equal(hasFreeViewOverride(local.overrides,'previous',1),false);
});
test('explicit local null survives storage and later main changes without reviving that route',()=>{
 const local=changeScopedControls(base(),undefined,true,{kind:'assign',action:'next',slot:0,binding:null}),restored=readFreeViewControlOverrides(JSON.parse(JSON.stringify(local.overrides)),local.main)!;
 const main=changeScopedControls(local.main,restored,false,{kind:'assign',action:'next',slot:0,binding:key('F10')}).main;assert.equal(hasFreeViewOverride(restored,'next',0),true);assert.deepEqual(freeViewControlBindings(main,restored).actions.next,[null,null]);assert.deepEqual(main.actions.next,[key('F10'),null]);
});
test('existing Left/Right convenience changes only local keyboard slots in practice',()=>{
 const main=replaceControl(replaceControl(replaceControl(base(),'previous',0,key('PageUp')),'next',0,key('PageDown')),'previous',1,pedal()),before=JSON.stringify(main),local=changeScopedControls(main,undefined,true,{kind:'restore-pages'});assert.equal(local.main,main);assert.equal(JSON.stringify(main),before);assert.deepEqual(local.overrides,{version:1,actions:{previous:{0:key('ArrowLeft')},next:{0:key('ArrowRight')}}});assert.deepEqual(freeViewControlBindings(main,local.overrides).actions.previous,[key('ArrowLeft'),pedal()]);assert.equal(hasFreeViewOverride(local.overrides,'previous',1),false);
 const reader=changeScopedControls(main,undefined,false,{kind:'restore-pages'});assert.deepEqual(reader.main.actions.previous,[key('ArrowLeft'),pedal()]);assert.equal(reader.overrides,undefined);
 const conflicting=replaceControl(main,'edit',1,key('ArrowLeft'));assert.throws(()=>changeScopedControls(conflicting,undefined,true,{kind:'restore-pages'}),/Free view conflict/);assert.deepEqual(conflicting.actions.previous,[key('PageUp'),pedal()]);
});
test('exact shared actions edited in practice still update main and leave local navigation alone',()=>{
 const local=changeScopedControls(base(),undefined,true,{kind:'assign',action:'previous',slot:0,binding:key('F11')}),next=changeScopedControls(local.main,local.overrides,true,{kind:'assign',action:'practiceSettings',slot:0,binding:key('Ctrl+KeyO')});assert.deepEqual(next.main.actions.practiceSettings,[key('Ctrl+KeyO'),null]);assert.deepEqual(next.overrides,local.overrides);assert.deepEqual(freeViewControlBindings(next.main,next.overrides).actions.practiceSettings,next.main.actions.practiceSettings);assert.deepEqual(next.main.actions.toggle,local.main.actions.toggle);
});
test('hidden shared actions and later main edits reject Free view collisions atomically',()=>{
 const main=base(),before=JSON.stringify(main);assert.throws(()=>changeScopedControls(main,undefined,true,{kind:'assign',action:'previous',slot:0,binding:key('KeyE')}),/Free view conflict: Previous measures primary control and Edit fingers primary control/);assert.equal(JSON.stringify(main),before);
 const local=changeScopedControls(main,undefined,true,{kind:'assign',action:'previous',slot:0,binding:key('F11')}),saved=JSON.stringify(local);assert.throws(()=>changeScopedControls(main,local.overrides,false,{kind:'assign',action:'next',slot:0,binding:key('F11')}),/Free view conflict: Previous measures primary control and Next measures primary control/);assert.equal(JSON.stringify(local),saved);
 const midiMain=replaceControl(main,'edit',1,pedal());assert.throws(()=>changeScopedControls(midiMain,undefined,true,{kind:'assign',action:'next',slot:1,binding:{...pedal(),press:64,release:32} as ControlBinding}),/Edit fingers secondary control/);
 assert.doesNotThrow(()=>changeScopedControls(midiMain,undefined,true,{kind:'assign',action:'next',slot:1,binding:{...pedal(),channel:3} as ControlBinding}));
});
test('saved local schema admits only navigation, known slots and the existing strict control payloads',()=>{
 for(const value of [{version:2,actions:{}},{version:1,actions:{done:{0:null}}},{version:1,actions:{next:[null,null]}},{version:1,actions:{next:{2:null}}},{version:1,actions:{next:{0:{kind:'key',key:'F10',extra:true}}}},{version:1,actions:{next:{1:{...pedal(),controller:123}}}},{version:1,actions:{next:{0:null}},extra:true}])assert.throws(()=>readFreeViewControlOverrides(value,base()));
 assert.throws(()=>readFreeViewControlOverrides({version:1,actions:{next:{0:key('KeyF')}}},base()),/Show fingerings/);
 const value={version:1,actions:{previous:{0:null},next:{1:pedal()}}},before=JSON.stringify(value);assert.deepEqual(readFreeViewControlOverrides(value,base()),value);assert.equal(JSON.stringify(value),before);
});
test('queued local and main intents preserve independent slots and recheck a late collision',()=>{
 let state={main:base(),overrides:undefined as ReturnType<typeof readFreeViewControlOverrides>};state=changeScopedControls(state.main,state.overrides,true,{kind:'assign',action:'previous',slot:0,binding:key('F10')});state=changeScopedControls(state.main,state.overrides,true,{kind:'assign',action:'next',slot:1,binding:pedal()});state=changeScopedControls(state.main,state.overrides,false,{kind:'assign',action:'next',slot:0,binding:key('F11')});const before=JSON.stringify(state);assert.throws(()=>changeScopedControls(state.main,state.overrides,false,{kind:'assign',action:'edit',slot:1,binding:key('F10')}),/Free view conflict/);assert.equal(JSON.stringify(state),before);assert.deepEqual(freeViewControlBindings(state.main,state.overrides).actions.next,[key('F11'),pedal()]);
});
test('runtime and Test resolve effective chord/MIDI edges with existing release and quarantine rules',()=>{
 const local=changeScopedControls(replaceControl(base(),'next',1,pedal()),undefined,true,{kind:'assign',action:'next',slot:0,binding:key('Ctrl+Shift+KeyX')}),resolver=new ControlResolver(freeViewControlBindings(local.main,local.overrides)),event={code:'KeyX',ctrlKey:true,shiftKey:true,altKey:false,metaKey:false,repeat:false};assert.equal(resolver.keyDown(event,true).action,'next');assert.equal(resolver.keyDown({...event,repeat:true},true).action,undefined);resolver.configure(local.main);assert.equal(resolver.keyDown(event,true).action,undefined);resolver.keyUp(event);assert.equal(resolver.keyDown(event,true).action,undefined);resolver.keyUp(event);
 resolver.configure(freeViewControlBindings(local.main,local.overrides));assert.equal(resolver.keyDown(event,true).action,'next');resolver.keyUp(event);const connection={source:'Piano',generation:4},cc={...connection,channel:2,controller:66,value:100};assert.equal(resolver.receive(cc,connection,true).action,'next');resolver.clear();assert.equal(resolver.receive(cc,connection,true).action,undefined);resolver.receive({...cc,value:20},connection,true);assert.equal(resolver.receive(cc,connection,true).action,'next');
});
