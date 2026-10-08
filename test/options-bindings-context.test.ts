import test from 'node:test';import assert from 'node:assert/strict';
import {optionsBindingRows} from '../src/options-bindings';
import {defaultBindings,readingActions,readingActionLabel} from '../src/input';
import {readControlBindings,replaceControl} from '../src/control-bindings';

test('Options projects supported practice rows without changing shared binding identities or hidden assignments',()=>{
 const bindings=replaceControl(readControlBindings(undefined,{bindings:{...defaultBindings(),previous:'PageUp',next:'PageDown'}}),'edit',1,{kind:'key',key:'F11'}),before=JSON.stringify(bindings);
 assert.deepEqual(optionsBindingRows(),readingActions.map(action=>({action,label:readingActionLabel(action)})));
 assert.deepEqual(optionsBindingRows({active:false,measureNavigation:false}),[{action:'practiceSettings',label:'Options'}]);
 const leaf=optionsBindingRows({active:true,measureNavigation:false});assert.deepEqual(leaf.map(row=>row.action),['toggle','done','practiceSettings']);
 const long=optionsBindingRows({active:true,measureNavigation:true});assert.deepEqual(long.slice(0,2),[{action:'previous',label:'Previous measures'},{action:'next',label:'Next measures'}]);assert.deepEqual(long.slice(2),leaf);
 assert.equal(JSON.stringify(bindings),before);assert.deepEqual(bindings.actions.edit,[{kind:'key',key:'KeyE'},{kind:'key',key:'F11'}]);assert.deepEqual(bindings.actions.previous,[{kind:'key',key:'PageUp'},null]);
});
