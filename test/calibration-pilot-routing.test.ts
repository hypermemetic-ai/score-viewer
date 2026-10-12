import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {PilotInputScope} from '../src/calibration-pilot-input';
import {applicationNavigationKey} from '../src/application-navigation';
const source=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
const body=(start:string,end:string)=>{const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);return stripTypeScriptTypes(source.slice(a,b));};
const note={source:'piano',generation:2,channel:16,note:24,velocity:80,on:true,timestamp_micros:110,driver_micros:90};
const key=(code:string,extra:Record<string,unknown>={})=>({code,repeat:false,ctrlKey:false,altKey:false,metaKey:false,shiftKey:false,target:null,...extra}) as any;
function fixture(clock:()=>Promise<number>=async()=>100){
 const events:any[]=[],state={connection:{source:'piano',generation:2} as {source:string;generation:number}|undefined,focused:true,breaks:0};
 const scope=new PilotInputScope({input:async(event,connected)=>{events.push({event,connected});return true;},break(){state.breaks++;}},clock,()=>state.connection,()=>state.focused);
 return{events,state,scope};
}
test('pilot clock admits only current fresh native events and converts channels without storing timestamps',async()=>{
 const f=fixture();f.scope.midi(note);assert.equal(f.events.length,0);await f.scope.activate();
 for(const change of [{source:'other'},{generation:1},{channel:0},{channel:17},{channel:1.5},{note:128},{velocity:-1},{velocity:128},{on:'yes'},{filtered:true},{timestamp_micros:99},{timestamp_micros:NaN},{timestamp_micros:undefined}])f.scope.midi({...note,...change} as any);
 assert.equal(f.events.length,0);f.scope.midi(note);f.scope.midi({...note,channel:1,on:false});f.scope.midi({...note,velocity:0});
 assert.deepEqual(f.events.map(x=>x.event),[
  {kind:'midi',type:'note-on',deviceId:'piano',channel:15,note:24,velocity:80},
  {kind:'midi',type:'note-off',deviceId:'piano',channel:0,note:24,velocity:80},
  {kind:'midi',type:'note-off',deviceId:'piano',channel:15,note:24,velocity:0}]);
});
test('pending/failed clocks do not disable manual ratings; raw releases clear held controls across guards',async()=>{
 const f=fixture(async()=>{throw Error('clock unavailable');});await f.scope.activate();f.scope.midi(note);
 assert.equal(f.scope.key(key('Digit0'),'key-down'),true);assert.equal(f.scope.key(key('Numpad4',{repeat:true}),'key-down'),true);
 for(const change of [{ctrlKey:true},{altKey:true},{metaKey:true},{shiftKey:true},{target:{closest:()=>({})}}]){
  assert.equal(f.scope.key(key('Digit0',change),'key-down'),false);assert.equal(f.scope.key(key('Digit0',change),'key-up'),true);
 }
 f.state.focused=false;assert.equal(f.scope.key(key('Digit0'),'key-down'),false);assert.equal(f.scope.key(key('Digit0'),'key-up'),true);
 assert.equal(f.scope.key(key('Digit5'),'key-down'),false);assert.equal(f.events[0].event.code,'Digit0');assert.equal(f.events[1].event.code,'Numpad4');assert.equal(f.events[1].event.repeat,true);
 assert.equal(f.events.filter(x=>x.event.type==='key-up').length,6);
});
test('open Options picker prevents grade entry while closed picker buttons retain ratings and releases clear',()=>{
 const f=fixture();
 // OptionsNavigation focuses its div listbox, including children that may receive the key event.
 const popup={tagName:'DIV',attributes:{'data-options-popup':'',role:'listbox'},closest(selector:string){return selector.split(',').some(s=>s.trim()==='[data-options-popup]')?this:null;}},
  option={closest(selector:string){return popup.closest(selector);}},closedButton={tagName:'BUTTON',closest(){return null;}};
 assert.equal(f.scope.key(key('Digit2',{target:option}),'key-down'),false);assert.equal(f.events.length,0);
 assert.equal(f.scope.key(key('Numpad2',{target:popup}),'key-down'),false);assert.equal(f.events.length,0);
 assert.equal(f.scope.key(key('Digit2',{target:closedButton}),'key-down'),true);assert.equal(f.events.length,1);
 assert.equal(f.scope.key(key('Digit2',{target:popup}),'key-up'),true);assert.deepEqual(f.events.map(x=>x.event),[
  {kind:'manual',type:'key-down',code:'Digit2',repeat:false},{kind:'manual',type:'key-up',code:'Digit2'}]);
});
test('late activation clocks cannot revive closed, unfocused or replaced device scopes',async()=>{
 for(const transition of ['close','break','focus','connection']){
  let resolve!:(n:number)=>void;const f=fixture(()=>new Promise(r=>{resolve=r;})),pending=f.scope.activate();
  if(transition==='close')f.scope.dispose();if(transition==='break')f.scope.break();if(transition==='focus')f.state.focused=false;if(transition==='connection')f.state.connection={source:'piano',generation:3};
  resolve(100);await pending;f.scope.midi({...note,generation:f.state.connection!.generation});assert.equal(f.events.length,0,transition);
 }
 let first!:(n:number)=>void,second!:(n:number)=>void,calls=0;const f=fixture(()=>new Promise(r=>{if(calls++===0)first=r;else second=r;}));
 const a=f.scope.activate(),b=f.scope.activate();second(200);await b;first(100);await a;f.scope.midi(note);assert.equal(f.events.length,0);f.scope.midi({...note,timestamp_micros:210});assert.equal(f.events.length,1);
});
test('admitted native reset clears the controller and blocks input until a fresh floor',async()=>{
 let clock=100;const f=fixture(async()=>clock);await f.scope.activate();
 f.scope.cc({...note,controller:121,value:128});assert.equal(f.state.breaks,0);
 clock=200;f.scope.cc({...note,controller:121,value:0});assert.equal(f.state.breaks,1);f.scope.midi(note);assert.equal(f.events.length,0);
 await Promise.resolve();f.scope.midi({...note,timestamp_micros:210});assert.equal(f.events.length,1);
});
test('actual main MIDI dispatch isolates all pilot traffic before score clocks, diagnostics and practice observers',async()=>{
 const f=fixture();await f.scope.activate();const context:any={startupReady:true,dialog:{dataset:{kind:'calibration'}},calibrationPilot:{input:f.scope},
  pitchInput:{accepts(){throw Error('score clock reached');}},midiConnection:f.state.connection,
  midiOptions:{receive(){throw Error('playing telemetry reached');}},PracticeView:class {},practice:{observeHeldInput(){throw Error('held observation reached');},observe(){throw Error('observation reached');},note(){throw Error('practice reached');}},syncControls(){throw Error('binding reached');}};
 runInNewContext(body('function onMidi(event:','function settings('),context);runInNewContext(body('function onMidiNote(','\nasync function saveSelectedChoice('),context);
 context.onMidiNote(note);context.onMidiNote({...note,generation:0});context.onMidiNote({...note,channel:90});context.onMidi({...note,controller:64,value:127});
 assert.equal(f.events.length,1);context.startupReady=false;context.onMidiNote(note);context.onMidi({...note,controller:64,value:127});assert.equal(f.events.length,1,'startup retains input ownership until ready');context.startupReady=true;context.calibrationPilot=undefined;context.onMidiNote(note);context.onMidi({...note,controller:80,value:127});assert.equal(f.events.length,1,'loading modal still isolates notes');
});
test('actual main key listeners route raw grades before bindings and deliver guarded key-up',()=>{
 const events:any[]=[],listeners:Record<string,(event:any)=>void>={},context:any={startupReady:true,startupFailed:false,window:{addEventListener(type:string,fn:any){listeners[type]=fn;}},
  calibrationPilot:{view:{acceptsRatings:true,key(){return false;}},input:{key(event:any,type:string){events.push({code:event.code,type});return true;}}},syncControls(){throw Error('bindings reached');},bindingOptions:undefined,practice:undefined,inputCode:(e:any)=>e.code,
  controls:{keyUp(){return false;}},input:{up(){return false;}},refreshPresentation(){}};
 context.applicationNavigationKey=applicationNavigationKey;runInNewContext(body("window.addEventListener('keyup'",'\n\nfunction onMidiNote('),context);
 let prevented=false;listeners.keydown({...key('Numpad3'),preventDefault(){prevented=true;}});listeners.keyup(key('Numpad3',{ctrlKey:true,target:{closest:()=>({})}}));
 assert.equal(prevented,true);assert.deepEqual(events,[{code:'Numpad3',type:'key-down'},{code:'Numpad3',type:'key-up'}]);context.startupReady=false;prevented=false;listeners.keydown({...key('Digit1'),preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(events.length,2,'startup key cannot reach calibration or controls');context.startupFailed=true;prevented=false;listeners.keydown({...key('Tab'),preventDefault(){prevented=true;}});assert.equal(prevented,false,'fatal-screen actions retain native keyboard access');assert.equal(events.length,2);
});

test('measurement navigation precedes dialog navigation and field digits cannot reach rating routing',()=>{
 const listeners:Record<string,(event:any)=>void>={},seen:string[]=[],context:any={startupReady:true,startupFailed:false,
  window:{addEventListener(type:string,fn:any){listeners[type]=fn;}},
  calibrationPilot:{view:{acceptsRatings:false,key(event:any){seen.push(event.code);return event.code==='ArrowRight';}},
   input:{key(){throw Error('measurement reached effort rating');}}},
  syncControls(){},bindingOptions:undefined,dialog:{dataset:{kind:'calibration'}},
  controls:{keyDown(){}},dialogNavigation:{keyDown(){return false;}}};
 context.applicationNavigationKey=applicationNavigationKey;runInNewContext(body("window.addEventListener('keyup'",'\n\nfunction onMidiNote('),context);
 let prevented=false;listeners.keydown({...key('ArrowRight'),preventDefault(){prevented=true;}});assert.equal(prevented,true);
 prevented=false;listeners.keydown({...key('Digit2',{target:{closest:()=>({})}}),preventDefault(){prevented=true;}});
 assert.equal(prevented,false,'the numeric field keeps native digit entry');assert.deepEqual(seen,['ArrowRight','Digit2']);
});

function modalFixture(){
 let stored=0,reads=0,clock=100,releaseWrite:(()=>void)|undefined;const controllers:any[]=[],views:any[]=[],events:any[]=[];
 class Controller {
  readonly loaded:number;state={archive:{activeCollectionId:'same-collection'},inputGeneration:0};listeners=new Set<(state:any)=>void>();disposed=false;
  constructor(readonly options:any){this.loaded=options.load.value;controllers.push(this);}
  subscribe(fn:(state:any)=>void){this.listeners.add(fn);fn(this.state);return()=>this.listeners.delete(fn);}
  input(event:any){events.push(event);return Promise.resolve(true);}
  break(){this.state.inputGeneration++;for(const fn of this.listeners)fn(this.state);}
  dispose(){this.disposed=true;this.break();}
  save(value:number){return this.options.files.write('calibration-effort-v2.json',new Uint8Array([value]));}
 }
 class Panel {async mount(){}dispose(){}cancelListening(){}}
 class Fingertips {dispose(){}exportArchive(){return '{}';}}
 const context:any={EffortController:Controller,FingertipController:Fingertips,PilotInputScope,MidiOptionsPanel:Panel,
  calibrationGeneration:0,calibrationPilot:undefined,dialog:undefined,dialogBack:undefined,
  preferences:{keyboardLayout:'janko-four-row'},readerFocused:true,document:{hidden:false},midiConnection:{source:'piano',generation:2},
  orientation:{rotation:0},fitDialog(){},connectMidi(){},disconnectMidi(){},notify(){},resetInput(){},input:{capture:undefined},
  app:{querySelector:()=>undefined},librarySummaryPaintPending:false,current:undefined,practice:undefined,selection:undefined,
  host:{async read(){reads++;return stored;},async write(_name:string,bytes:Uint8Array){await new Promise<void>(r=>{releaseWrite=r;});stored=bytes[0];},async midiClock(){return clock;},async midiSources(){return{supported:false,sources:[]};},async exportFeedback(){}},
  loadEffort:async(files:any)=>({value:await files.read('calibration-effort-v2.json')}),
  loadFingertips:async(files:any)=>({value:await files.read('calibration-fingertips-v1.json')}),
  loadPilot:async(host:any)=>({value:await host.read('calibration-pilot-v1.json')}),
  saveCalibrationNoteNames(){},saveNotationSystem(){},saveCalibrationColors(){},
  mountCalibrationView(_dialog:any,controller:any,_fingertips:any,hooks:any){const view={controller,hooks,disposed:false,acceptsRatings:true,key(){return false;},input:(event:any)=>controller.input(event),break:()=>controller.break(),midiContainer:{querySelector:()=>undefined},setMidiConnected(){},dispose(){this.disposed=true;}};views.push(view);return view;},
  showDialog(_html:string,kind:string){context.closeDialog(false);return context.dialog={dataset:{kind},close(){},remove(){},innerHTML:''};},
 };
 for(const key of ['job','readingOperation','practiceOptionsCleanup','transposeControls','optionsNavigation','dialogNavigation','bindingOptions','midiOptions','audioOptions','pianoOptions','practiceFocusReturn','focusReturn'])context[key]=undefined;
 runInNewContext(body('let persist=Promise.resolve();','const esc='),context);
 runInNewContext(body('function closeDialog(','function showDialog('),context);
 runInNewContext(body('async function calibrate(','function calibrateLegacy('),context);
 return{context,controllers,views,events,get reads(){return reads;},setClock(value:number){clock=value;},release(){assert.ok(releaseWrite);releaseWrite();}};
}
test('actual modal close disposes subscriptions and fresh reopen waits for the prior accepted write',async()=>{
 const f=modalFixture();await f.context.calibrate();assert.equal(f.reads,3);assert.equal(f.controllers[0].loaded,0);
 const writing=f.controllers[0].save(7);await Promise.resolve();f.context.closeDialog(false);assert.equal(f.controllers[0].disposed,true);assert.equal(f.views[0].disposed,true);assert.equal(f.controllers[0].listeners.size,0);
 const reopening=f.context.calibrate();await Promise.resolve();await Promise.resolve();assert.equal(f.reads,3,'new disk load must not overtake queued save');assert.equal(f.controllers.length,1);
 f.release();await writing;await reopening;assert.equal(f.reads,6);assert.equal(f.controllers[1].loaded,7);assert.equal(f.views[1].hooks.instrument,'janko-four-row');
});
test('actual modal loading callbacks do not mount after close or replacement',async()=>{
 const f=modalFixture();const opening=f.context.calibrate();f.context.closeDialog(false);await opening;assert.equal(f.controllers.length,0);assert.equal(f.views.length,0);
 await f.context.calibrate();assert.equal(f.reads,6);assert.equal(f.controllers.length,1);
});
test('a rejected old pilot load cannot dispose device controls owned by replacement Options',async()=>{
 const f=modalFixture();let reject!:(error:Error)=>void;f.context.loadEffort=()=>new Promise((_resolve:any,r:any)=>{reject=r;});
 const opening=f.context.calibrate();await Promise.resolve();f.context.closeDialog(false);
 const replacement={dataset:{kind:'options'},innerHTML:'replacement options'},devices={disposed:false,dispose(){this.disposed=true;}};
 f.context.dialog=replacement;f.context.midiOptions=devices;reject(Error('old load rejected'));await opening;
 assert.equal(f.context.dialog,replacement);assert.equal(replacement.innerHTML,'replacement options');assert.equal(f.context.midiOptions,devices);assert.equal(devices.disposed,false);assert.equal(f.controllers.length,0);
});
test('actual main watches same-session input generations without refreshing the floor on ordinary ratings',async()=>{
 const f=modalFixture();await f.context.calibrate();await Promise.resolve();const scope=f.context.calibrationPilot.input;
 scope.midi(note);assert.equal(f.events.length,1);f.setClock(200);f.controllers[0].break();scope.midi(note);assert.equal(f.events.length,1,'same ID break must block old floor synchronously');
 await Promise.resolve();scope.midi(note);assert.equal(f.events.length,1);scope.midi({...note,timestamp_micros:210});assert.equal(f.events.length,2);
 f.setClock(300);for(const listener of f.controllers[0].listeners)listener(f.controllers[0].state);scope.midi({...note,timestamp_micros:220});assert.equal(f.events.length,3,'ordinary rating publication must retain the established floor');
});
test('actual focus loss and hidden document break setup and require fresh MIDI activation',async()=>{
 const f=modalFixture();Object.assign(f.context,{PracticeView:class {},musicalSustain:{clear(){}}});await f.context.calibrate();await Promise.resolve();
 runInNewContext(body('function gainFocus(','function transformSurface('),f.context);const scope=f.context.calibrationPilot.input;
 scope.midi(note);assert.equal(f.events.length,1);f.setClock(200);f.context.loseFocus();assert.equal(f.context.readerFocused,false);scope.midi({...note,timestamp_micros:210});assert.equal(f.events.length,1);
 assert.ok(f.controllers[0].state.inputGeneration>0);f.context.gainFocus();await Promise.resolve();scope.midi(note);assert.equal(f.events.length,1);scope.midi({...note,timestamp_micros:210});assert.equal(f.events.length,2);
 f.context.document.hidden=true;f.context.loseFocus();f.setClock(300);f.context.gainFocus();await Promise.resolve();scope.midi({...note,timestamp_micros:310});assert.equal(f.events.length,2);
 f.context.document.hidden=false;f.context.gainFocus();await Promise.resolve();scope.midi({...note,timestamp_micros:210});assert.equal(f.events.length,2);scope.midi({...note,timestamp_micros:310});assert.equal(f.events.length,3);
});
test('actual reconnect resets transient input and binds the fresh floor to new source and generation',async()=>{
 const f=modalFixture();Object.assign(f.context,{PracticeView:class {},musicalSustain:{clear(){}},midiTransition:0});
 f.context.host.midiDisconnect=async()=>{};f.context.host.midiConnect=async(source:string)=>{assert.equal(source,'new piano');return 3;};
 await f.context.calibrate();await Promise.resolve();runInNewContext(body('async function connectMidi(','function options('),f.context);const scope=f.context.calibrationPilot.input;
 f.setClock(200);await f.context.connectMidi('new piano');await Promise.resolve();assert.ok(f.controllers[0].state.inputGeneration>0);
 scope.midi({...note,timestamp_micros:210});scope.midi({...note,source:'new piano',generation:2,timestamp_micros:210});scope.midi({...note,source:'new piano',generation:3,timestamp_micros:110});assert.equal(f.events.length,0);
 scope.midi({...note,source:'new piano',generation:3,timestamp_micros:210});assert.equal(f.events.length,1);
 await f.context.disconnectMidi();scope.midi({...note,source:'new piano',generation:3,timestamp_micros:310});assert.equal(f.events.length,1);assert.equal(f.context.midiConnection,undefined);
});
