import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {ViewerOrientation} from '../src/orientation';
import {defaultBindings} from '../src/input';
import {builtInClicks,cueGain,cueVolume,defaultPianoPreferences,loadPianoPreferences,readPianoPreferences} from '../src/piano-preferences';
import {readFingeringAdviceSettings} from '../src/fingering-advice-settings';
import {browserAssistanceStore} from '../src/durable-assistance-store';
import {pendingPersonalConsolidation} from '../src/personal-consolidation-request';

const source=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
const extracted=(start:string,end:string)=>stripTypeScriptTypes(source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start))));
function fixture(){
 const assistanceData=new Map<string,string>();let lock=Promise.resolve();
 const assistanceStore=browserAssistanceStore({getItem:key=>assistanceData.get(key)??null,setItem:(key,value)=>{assistanceData.set(key,value);}},{request(_name,run){const next=lock.then(run);lock=next.then(()=>{},()=>{});return next;}});
 const phases:string[]=[],warnings:string[]=[],reads:string[]=[],writes:{file:string;value:any}[]=[],classes=new Set<string>();let rendered=0;
 const context:any={startupReady:false,startupFailed:false,entries:[],pianoSettings:defaultPianoPreferences(),pianoWarning:'',preferences:{version:1,libraryRotation:0,bindings:defaultBindings()},
  app:{innerHTML:'',classList:{add:(s:string)=>classes.add(s),remove:(s:string)=>classes.delete(s)},querySelector:()=>null},
  LoadingProgress:class {title='';constructor(title:string){this.title=title;}markup(){return this.title;}attach(){return this;}stop(){}step(id:string){phases.push(id);}fail(){}},paintCheckpoint:async()=>{},
  readJson:async(file:string)=>{reads.push(file);assert.ok(['library.json','preferences.json'].includes(file));return file==='preferences.json'?{version:1,libraryRotation:0,keyboardLayout:'conventional-piano',bindings:defaultBindings(),piano:{...defaultPianoPreferences(),enabled:true},retainedUnknown:{value:'keep'}}:null;},
  keyboardPreference:(value:any)=>value,readBindings:(value:any)=>value,fingerPreferences:()=>({}),readMidiMapping:()=>undefined,readMidiBindings:()=>undefined,
  readFingeringAdviceSettings,pendingPersonalConsolidation,readPianoPreferences,loadPianoPreferences,defaultPianoPreferences,builtInClicks,enqueue:(op:()=>Promise<unknown>)=>op(),writeJson:async(file:string,value:any)=>{writes.push({file,value:structuredClone(value)});},cueGain,cueVolume,ViewerOrientation,InputController:class {},readControlBindings:()=>({}),readFreeViewControlOverrides:()=>({}),controls:{configure(){}},
  host:{assistanceStore,onFocusChange:async()=>{},onMidi:async()=>{},fullscreen:async()=>{}},onMidi(){},onMidiNote(){},
  configurePiano:async()=>({enabled:true,ready:true,error:null}),resetInput(){},render(){rendered++;},aheadOfTime:undefined,notify:(message:string)=>warnings.push(message),
  esc:(value:string)=>value,button:()=>'<button data-action="exit">Close Viewer</button>',validEntryStorage:()=>true,
 };
 runInNewContext(extracted('async function applyPendingConsolidation(){','function keyboardControl('),context);
 runInNewContext(extracted('async function boot(){','\nvoid boot();'),context);
 return {context,phases,warnings,reads,writes,classes,assistanceData,get rendered(){return rendered;}};
}
test('actual startup withholds the library until enabled sound settles, without writing settings',async()=>{
 const f=fixture();let finish!:(value:any)=>void,reached!:()=>void;const configuring=new Promise<void>(resolve=>{reached=resolve;});
 f.context.configurePiano=()=>new Promise(resolve=>{finish=resolve;reached();});
 const pending=f.context.boot();await Promise.race([configuring,pending]);
 assert.ok(finish);assert.ok(!f.phases.includes('summaries'),'The library opens without reading every practice record');assert.equal(f.context.startupReady,false);assert.equal(f.rendered,0);assert.ok(f.classes.has('viewer-startup'));
 finish({enabled:true,ready:true,error:null});await pending;
 assert.equal(f.context.startupReady,true);assert.equal(f.rendered,1);assert.equal(f.classes.has('viewer-startup'),false);assert.deepEqual(f.warnings,[]);
 assert.equal(f.context.preferences.piano.enabled,true);assert.deepEqual(f.reads,['library.json','preferences.json']);assert.deepEqual(f.context.preferences.retainedUnknown,{value:'keep'});
 assert.deepEqual(f.writes,[]);
 assert.equal(f.assistanceData.size,0,'An empty assistance store is read without creating a consolidation request or memory index');assert.equal((await f.context.host.assistanceStore.read()).revision,0);
});
test('actual startup reports resolved unavailable sound while retaining its saved choice and usable library',async()=>{
 const f=fixture();f.context.configurePiano=async()=>({enabled:true,ready:false,error:'Device unavailable'});await f.context.boot();
 assert.equal(f.context.startupReady,true);assert.equal(f.rendered,1);assert.deepEqual(f.warnings,['Piano sound is off: Device unavailable']);assert.equal(f.context.preferences.piano.enabled,true);
});
test('retained-data startup failure exposes its keyboard-capable close action and resize tolerates no surface',async()=>{
 const f=fixture();f.context.readJson=async()=>{throw Error('Unreadable retained settings');};await f.context.boot();
 assert.equal(f.context.startupReady,false);assert.equal(f.context.startupFailed,true);assert.equal(f.rendered,0);assert.match(f.context.app.innerHTML,/data-action="exit"/);
 let resize!:()=>void;Object.assign(f.context,{window:{addEventListener(_type:string,fn:()=>void){resize=fn;}},dialog:undefined,practice:undefined,current:undefined,orientation:{rotation:0},transformSurface(){throw Error('Missing surface reached');}});
 runInNewContext(extracted("window.addEventListener('resize'", "\nwindow.addEventListener('pagehide'"),f.context);assert.doesNotThrow(resize);
});
test('a piano volume saved above 70% by an earlier version is set to 70% once, and nothing else in the settings changes',async()=>{
 const saved={version:1,libraryRotation:0,keyboardLayout:'conventional-piano',bindings:defaultBindings(),audioOutput:'saved-device',piano:{version:1,enabled:true,volume:1,latencyTier:2,cueVolume:.4},retainedUnknown:{value:'keep'}};
 const f=fixture();f.context.readJson=async(file:string)=>file==='preferences.json'?structuredClone(saved):null;await f.context.boot();
 const piano={version:1,enabled:true,volume:.7,latencyTier:2,cueVolume:.4,levels:2};
 assert.deepEqual(f.context.pianoSettings,piano);assert.equal(f.writes.length,1);assert.deepEqual(f.writes[0],{file:'preferences.json',value:{...saved,piano}});
 // The marker makes it once: the written file reads back unchanged, and a louder choice made afterwards stays.
 for(const volume of [.7,.95]){const g=fixture(),again={...saved,piano:{...piano,volume}};g.context.readJson=async(file:string)=>file==='preferences.json'?structuredClone(again):null;await g.context.boot();assert.equal(g.context.pianoSettings.volume,volume);assert.deepEqual(g.writes,[]);}
 // At or under 70% an earlier volume keeps its number; only the marker is added.
 const h=fixture(),low={...saved,piano:{version:1,enabled:false,volume:.55,latencyTier:0}};h.context.readJson=async(file:string)=>file==='preferences.json'?structuredClone(low):null;await h.context.boot();
 assert.deepEqual(h.context.pianoSettings,{version:1,enabled:false,volume:.55,latencyTier:0,levels:2});assert.deepEqual(h.writes.map(w=>w.value),[{...low,piano:h.context.pianoSettings}]);
});
