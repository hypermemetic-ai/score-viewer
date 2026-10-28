import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {APP_STATE_ATTRIBUTES,APP_RAN_ATTRIBUTE,APP_FAILURES_ATTRIBUTE,appState,declareAppState,declareFailure,declareRan,readRan,type AppStateInput} from '../src/app-state';
import {PRACTICE_MENU_KEYS,READER_COMMAND_KEYS,REPEAT_COMMAND_KEYS} from '../src/command-keys';
import {defaultBindings} from '../src/input';

/** Attributes as an element keeps them, counting every write. */
function element(){const attributes=new Map<string,string>();let writes=0;return {attributes,get writes(){return writes;},
 getAttribute:(name:string)=>attributes.get(name)??null,setAttribute:(name:string,value:string)=>{writes++;attributes.set(name,value);},removeAttribute:(name:string)=>{writes++;attributes.delete(name);}};}
const idle:AppStateInput={started:true,reading:false,pressWaiting:false,practiceStarting:false,layout:'janko-four-row'};

test('the application declares each screen it shows',()=>{
 assert.deepEqual(appState({...idle,started:false}),{screen:'startup',layout:'janko-four-row',busy:'startup'});
 assert.deepEqual(appState(idle),{screen:'library',layout:'janko-four-row'});
 assert.deepEqual(appState({...idle,score:{id:'a',piano:true},reading:true,dialog:'score-reading'}),{screen:'reader',dialog:'score-reading',score:'a',instrument:'piano',layout:'janko-four-row',busy:'reading'});
 assert.deepEqual(appState({...idle,score:{id:'a',piano:true},practice:{step:'sections'}}),{screen:'practice',score:'a',instrument:'piano',layout:'janko-four-row',step:'sections'});
 assert.deepEqual(appState({...idle,score:{id:'a',piano:true},practice:{step:'sections',section:'5-8'}}).section,'5-8');
 assert.deepEqual(appState({...idle,score:{id:'b',piano:false},practice:{step:'manual'}}).instrument,'other');
 assert.equal(appState({...idle,score:{id:'a',piano:true},pressWaiting:true,practiceStarting:true}).busy,'press practice');
 // Editing fingers is a mode of the reader only.
 assert.equal(appState({...idle,score:{id:'a',piano:true},editing:true}).editing,'fingers');
 assert.equal(appState({...idle,score:{id:'a',piano:true},practice:{step:'fingers'},editing:true}).editing,undefined);
 // Practice without an open score is not a screen the reader can be on.
 assert.equal(appState({...idle,practice:{step:'fingers'}}).screen,'library');
 // The score the library's background work is on, only while it is on one.
 assert.equal(appState({...idle,preparing:'a'}).preparing,'a');
 assert.equal(appState(idle).preparing,undefined);
});

test('declaring sets what holds, removes what no longer does and rewrites nothing unchanged',()=>{
 const root=element();
 declareAppState(root,appState({...idle,score:{id:'a',piano:true},practice:{step:'sections',section:'1-4'},pressWaiting:true}));
 assert.equal(root.getAttribute('data-screen'),'practice');assert.equal(root.getAttribute('data-score'),'a');assert.equal(root.getAttribute('data-instrument'),'piano');
 assert.equal(root.getAttribute('data-step'),'sections');assert.equal(root.getAttribute('data-section'),'1-4');assert.equal(root.getAttribute('data-busy'),'press');assert.equal(root.getAttribute('data-layout'),'janko-four-row');
 const writes=root.writes;declareAppState(root,appState({...idle,score:{id:'a',piano:true},practice:{step:'sections',section:'1-4'},pressWaiting:true}));assert.equal(root.writes,writes);
 declareAppState(root,appState(idle));
 assert.equal(root.getAttribute('data-screen'),'library');
 for(const name of ['data-score','data-instrument','data-step','data-section','data-busy','data-dialog'])assert.equal(root.getAttribute(name),null,name);
 assert.deepEqual(Object.values(APP_STATE_ATTRIBUTES).filter(name=>!name.startsWith('data-')),[]);
});

test('each run of an action is counted, so one press running twice shows',()=>{
 const root=element();
 declareRan(root,'practice');declareRan(root,'toggle');declareRan(root,'practice');declareRan(root,'practice-fingers');
 assert.equal(root.getAttribute(APP_RAN_ATTRIBUTE),'practice:2 toggle:1 practice-fingers:1');
 assert.deepEqual([...readRan(root.getAttribute(APP_RAN_ATTRIBUTE))],[['practice',2],['toggle',1],['practice-fingers',1]]);
 assert.equal(readRan(null).size,0);
 declareFailure(root);declareFailure(root);assert.equal(root.getAttribute(APP_FAILURES_ATTRIBUTE),'2');
});

test('the reader declares its state at every change of screen, dialog, opening, press and practice',()=>{
 const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
 for(const site of ['function render(){declareState();','function renderToolbar(){declareState();','function renderLibrary(focusKey=libraryFocusKey(document.activeElement)){declareState();','?.focus();declareState();return dialog;}','declareState();if(returnParent)back?.();}','readingDialog(op);declareState();return op;','readingOperation=undefined;declareState();','.then(declareState);declareState();return true;','declareRan(app,action);','new PracticeView(app,{declare:declareState,','new ManualPracticeView(app,{declare:declareState,'])
  assert.ok(main.includes(site),site);
 for(const view of ['practice-view.ts','manual-practice-view.ts'])assert.match(readFileSync(new URL(`../src/${view}`,import.meta.url),'utf8'),/ private paint\(\)\{(?:if\(this\.disposed\)return;)?this\.options\.declare\?\.\(\);/,view);
});

test('reader command keys come from one table and stay clear of the default controls',()=>{
 const controls=new Set(Object.values(defaultBindings()));
 for(const key of [...Object.values(READER_COMMAND_KEYS),...Object.values(REPEAT_COMMAND_KEYS)])assert.ok(!controls.has(key),key);
 const reader=[...Object.values(READER_COMMAND_KEYS),...Object.values(REPEAT_COMMAND_KEYS)];assert.equal(new Set(reader).size,reader.length);
 const menu=Object.values(PRACTICE_MENU_KEYS);assert.equal(new Set(menu).size,menu.length);
 const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
 assert.ok(!/KeyP:'practice'/.test(main),'P is read from READER_COMMAND_KEYS');
 assert.ok(!/key:'F',action:'practice-fingers'/.test(main),'Fingers is read from PRACTICE_MENU_KEYS');
});
