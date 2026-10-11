import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {ControlResolver,readControlBindings,controlActionAllowed} from '../src/control-bindings';
import {actionCode,inputCode,chord,directFingerKey,InputController,rotationShortcut,defaultBindings} from '../src/input';
import {systemSelection} from '../src/selection';
import {defaultView,viewportFit} from '../src/state';
import {PracticeView} from '../src/practice-view';
import {isMusicalSustain} from '../src/midi-sustain';
import {importPackage} from '../src/package';
const source=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
const production=(start:string,end:string)=>stripTypeScriptTypes(source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start))));
const pkg=await importPackage(readFileSync(new URL('../fixtures/schumann-op68-no14.isoscore',import.meta.url)),{allowLegacyTempo:true});
function keyboardFixture(){
 let key!:(e:any)=>void;const calls:string[]=[],first=pkg.seats.find(s=>s.page===0)!,context:any={startupReady:true,startupFailed:false,
  window:{addEventListener(_type:string,handler:any){key=handler;}},document:{hidden:false,activeElement:null},innerWidth:1280,innerHeight:720,
  input:new InputController(),controls:new ControlResolver(readControlBindings(undefined,{bindings:defaultBindings()})),
  current:{package:pkg,personal:{view:defaultView(),editContactId:first.contactId}},selection:first,readerFocused:true,preferences:{fingerBehavior:'toggle'},
  practice:undefined,dialog:undefined,bindingOptions:undefined,optionsNavigation:undefined,dialogNavigation:undefined,toolbarNavigation:undefined,
  inputCode,actionCode,chord,directFingerKey,rotationShortcut,controlActionAllowed,PracticeView,systemSelection,viewportFit,effectiveView:(v:any)=>v,readerPackage:()=>pkg,
  syncControls(){},editSequence:{reset(){calls.push('reset');}},savePersonal(){calls.push('save');},savePersonalQuietly(){calls.push('save');},renderPages(){calls.push('pages');},renderToolbar(){calls.push('toolbar');},focusSelection(){calls.push('focus');},
  selectFinger(step:number){calls.push(`chronological:${step}`);},act(action:string){calls.push(`action:${action}`);},edit(){calls.push('dialog');},saveFingerDigit(){calls.push('digit');return Promise.resolve();},saveHandChoice(hand:string){calls.push(`hand:${hand}`);return Promise.resolve();},reveal(){},notify(){},
  HTMLInputElement:class {},ManualPracticeView:class {},
 };
 runInNewContext(production('function selectFingerSystem(','function exitSelection('),context);
 runInNewContext(production("window.addEventListener('keydown'",'\n\nfunction onMidiNote('),context);
 const target={closest(){return null;},matches(){return false;}};
 const press=(code:string,extra:any={})=>{let prevented=false;key({code,key:code,target,repeat:false,ctrlKey:false,altKey:false,metaKey:false,shiftKey:false,preventDefault(){prevented=true;},...extra});return prevented;};
 return {context,calls,press};
}
test('production edit arrows reveal the nearest note in the next page and restore selection focus',()=>{
 const f=keyboardFixture(),last=pkg.seats.filter(s=>s.page===0).sort((a,b)=>b.system-a.system)[0],next=systemSelection(pkg,last,1);assert.equal(next.page,1);
 f.context.selection=last;assert.equal(f.press('ArrowDown'),true);assert.equal(f.context.selection.id,next.id);assert.equal(f.context.current.personal.view.page,next.page);assert.equal(f.context.current.personal.editContactId,next.contactId);assert.deepEqual(f.calls,['reset','save','pages','toolbar','focus']);
 f.context.input.clear();f.context.controls.clear();f.press('ArrowUp');assert.equal(f.context.selection.page,0);assert.equal(f.context.current.personal.view.page,0);
});
test('production vertical arrows respect editor fields, toolbar navigation, modals, capture and held/repeated keys',()=>{
 for(const owner of ['field','toolbar','modal','capture','repeat','held','modifier','blurred','hidden']){
  const f=keyboardFixture(),initial=f.context.selection;
  let extra:any={};
  if(owner==='field')extra.target={closest(selector:string){return selector.includes('input')?{}:null;}};
  if(owner==='toolbar'){f.context.toolbarNavigation={keyDown(){return true;}};extra.target={closest(selector:string){return selector==='.toolbar'?{}:null;}};}
  if(owner==='modal'){f.context.dialog={dataset:{kind:'edit'}};f.context.dialogNavigation={keyDown(){return true;}};}
  if(owner==='capture')f.context.input.capture='previous';
  if(owner==='repeat')extra.repeat=true;
  if(owner==='held')f.context.input.held.add('ArrowDown');
  if(owner==='modifier')extra.ctrlKey=true;
  if(owner==='blurred')f.context.readerFocused=false;
  if(owner==='hidden')f.context.document.hidden=true;
  f.press('ArrowDown',extra);assert.equal(f.context.selection.id,initial.id,owner);assert.deepEqual(f.calls,[],owner);
 }
});
test('production chronological editing and explicit reader page commands retain ownership',()=>{
 const edit=keyboardFixture();edit.press('ArrowRight');assert.deepEqual(edit.calls,['chronological:1']);edit.context.input.clear();edit.context.controls.clear();edit.press('Tab',{shiftKey:true});assert.deepEqual(edit.calls,['chronological:1','chronological:-1']);
 const reader=keyboardFixture();reader.context.selection=undefined;reader.press('ArrowRight');assert.deepEqual(reader.calls,['action:next']);
});
test('production L/R editing retains note ownership and respects inactive or modified input',()=>{
 const f=keyboardFixture();f.press('KeyR');assert.deepEqual(f.calls,['hand:RH']);const selected=f.context.selection;
 f.context.input.clear();f.context.controls.clear();f.press('KeyL');assert.deepEqual(f.calls,['hand:RH','hand:LH']);assert.equal(f.context.selection,selected);
 for(const owner of ['blurred','hidden','repeat','modifier','field','modal']){const guarded=keyboardFixture();let extra:any={};if(owner==='blurred')guarded.context.readerFocused=false;if(owner==='hidden')guarded.context.document.hidden=true;if(owner==='repeat')extra.repeat=true;if(owner==='modifier')extra.ctrlKey=true;if(owner==='field')extra.target={closest:(s:string)=>s.includes('input')?{}:null};if(owner==='modal')guarded.context.dialog={dataset:{kind:'edit'}};guarded.press('KeyR',extra);assert.deepEqual(guarded.calls,[],owner);}
});
test('production MIDI note routing leaves the full reader/editor untouched while retaining Options diagnostics',()=>{
 const f=keyboardFixture(),received:any[]=[],event={source:'piano',generation:1,note:55,on:true};
 Object.assign(f.context,{midiConnection:{source:'piano',generation:1},pitchInput:{accepts:()=>true},midiOptions:{receive(e:any){received.push(e);}}});
 runInNewContext(production('function onMidiNote(','\nfunction saveFingerDigit('),f.context);
 const before=structuredClone(f.context.current.personal),selected=f.context.selection;
 for(const edit of [false,true]){f.context.selection=edit?selected:undefined;f.context.onMidiNote(event);f.context.onMidiNote({...event,on:false});}
 assert.deepEqual(f.context.current.personal,before);assert.deepEqual(f.calls,[]);assert.equal(received.length,4);
 f.context.onMidiNote({...event,generation:2});assert.equal(received.length,4);
 const practice=Object.create(PracticeView.prototype),held:any[]=[],played:any[]=[];practice.observeHeldInput=(e:any)=>held.push(e);practice.observe=()=>{};practice.note=(e:any)=>played.push(e);f.context.practice=practice;f.context.dialog={};f.context.onMidiNote(event);assert.equal(held.length,1);assert.equal(played.length,0);
 f.context.dialog=undefined;f.context.onMidiNote(event);assert.equal(held.length,2);assert.equal(played.length,1);
});
test('production reader toolbar omits Performance and stale actions cannot start a session',async()=>{
 const f=keyboardFixture();let markup='';const bar={contains:()=>false,set className(_value:string){},set innerHTML(value:string){markup=value;},querySelector:()=>null};
 Object.assign(f.context,{app:{querySelector:()=>bar},activeLayer:()=>undefined,scoreCapabilities:()=>({}),button:(label:string,action:string)=>`<button data-action="${action}">${label}</button>`,actionControlLabel:()=>'',rotationHint:()=>'',keyboardControl:()=>'',readingNotationControl:()=>'',OptionsNavigation:class{constructor(){}},readingPresentation:undefined,toolbarVisible:true,job:undefined,readingOperation:undefined});
 runInNewContext(production('function renderToolbar(','function keyboardControl('),f.context);f.context.renderToolbar();assert.ok(!markup.includes('performance'));
 const previous=f.context.current.personal.view.page;runInNewContext(production('async function act(','\nasync function startJob('),f.context);await f.context.act('performance');await f.context.act('performance-stop');assert.equal(f.context.current.personal.view.page,previous);assert.deepEqual(f.calls,[]);
});

test('production explicit pedal commands still turn pages outside interpreting modes',()=>{
 const f=keyboardFixture(),binding={kind:'midi' as const,source:'piano',channel:1,controller:80,press:64,release:32},actions=readControlBindings(undefined,{bindings:defaultBindings()}).actions;
 actions.next=[actions.next[0],binding];f.context.controls.configure({version:1,actions});f.context.selection=undefined;
 Object.assign(f.context,{midiConnection:{source:'piano',generation:1},pitchInput:{accepts:()=>true},midiOptions:undefined,isMusicalSustain,musicalSustain:{receive(){},clear(){}}});
 runInNewContext(production('function onMidi(event:','function settings('),f.context);
 f.context.onMidi({source:'piano',generation:1,channel:1,controller:80,value:127});assert.deepEqual(f.calls,['action:next']);
});
