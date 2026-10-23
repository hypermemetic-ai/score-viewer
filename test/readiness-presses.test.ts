import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {ControlResolver,readControlBindings,controlActionAllowed,readerControlBindings,isEditorAction} from '../src/control-bindings';
import {actionCode,inputCode,chord,directFingerKey,InputController,rotationShortcut,defaultBindings} from '../src/input';
import {defaultView,viewportFit,effectiveLabelMode} from '../src/state';
import {PracticeView} from '../src/practice-view';
import {arrangeBottomNavigation,applicationNavigationKey} from '../src/application-navigation';
import {importPackage} from '../src/package';
import {requirePianoCapability} from '../src/score-capabilities';
import {READINESS_WORDS,ScoreReadiness} from '../src/score-readiness';
import {PendingPress,READINESS_NOTICE_DELAY_MS,type ReadinessNoticeView,type ReadinessTimers} from '../src/readiness-notice';

// The reader's own key handling, commands and waiting presses, as main.ts has them.
const source=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
const production=(start:string,end:string)=>stripTypeScriptTypes(source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start))));
const pkg=await importPackage(readFileSync(new URL('../fixtures/schumann-op68-no14.tuna',import.meta.url)),{allowLegacyTempo:true});
const flush=async()=>{for(let i=0;i<10;i++)await new Promise<void>(resolve=>setImmediate(resolve));};

/** A score just reopened: its pages show, and its shared fingers get ready
 * after them, finishing when the test says. */
function reopened(){
 let key!:(e:any)=>void,finish!:()=>void,fail!:(error:Error)=>void,fingersRuns=0;const calls:string[]=[],failures:unknown[]=[],shown:string[]=[];
 let now=0;const due:{at:number;run:()=>void;id:number}[]=[];let next=1;
 const timers:ReadinessTimers={now:()=>now,set:(run,ms)=>{const id=next++;due.push({at:now+ms,run,id});return id;},clear:id=>{const i=due.findIndex(t=>t.id===id);if(i>=0)due.splice(i,1);}};
 const view:ReadinessNoticeView={show:words=>shown.push(`show:${words}`),hide:()=>shown.push('hide'),withdraw:()=>shown.push('withdraw')};
 const readiness=new ScoreReadiness({fingers:{run:()=>{fingersRuns++;return new Promise<void>((resolve,reject)=>{finish=resolve;fail=reject;});}},practice:{needs:['fingers'],run:async()=>{}}});
 const surface={};
 const context:any={startupReady:true,startupFailed:false,
  window:{addEventListener(_type:string,handler:any){key=handler;}},document:{hidden:false,activeElement:null},innerWidth:1280,innerHeight:720,
  input:new InputController(),controls:new ControlResolver(readerControlBindings(readControlBindings(undefined,{bindings:defaultBindings()}))),editNavigation:'notes',
  current:{entry:{id:'no14'},package:pkg,personal:{view:defaultView()}},selection:undefined,readerFocused:true,preferences:{fingerBehavior:'toggle'},
  practice:undefined,dialog:undefined,readingPresentation:undefined,bindingOptions:undefined,optionsNavigation:undefined,dialogNavigation:undefined,toolbarNavigation:undefined,
  app:{querySelector:(selector:string)=>selector==='.surface'?surface:null},
  inputCode,actionCode,chord,directFingerKey,rotationShortcut,controlActionAllowed,isEditorAction,PracticeView,viewportFit,arrangeBottomNavigation,applicationNavigationKey,effectiveView:(v:any)=>v,readerPackage:()=>pkg,
  syncControls(){},reveal(){},notify(message:string){calls.push(`notify:${message}`);},HTMLInputElement:class {},ManualPracticeView:class {},
  // What each command does once it runs.
  selectFinger(){calls.push('edit');},options(){calls.push('options');},practiceMenu(){calls.push('practice-menu');},startPractice(){calls.push('practice-start');},
  fingerDisplayAvailable:()=>true,currentFingerPresentation:()=>undefined,refreshPresentation(){calls.push('fingers-shown');},
  savePersonal(){},savePersonalQuietly(){},renderPages(){},renderToolbar(){},render(){},
  requirePianoCapability(){},
  reportFailure(error:unknown){failures.push(error);},
  readiness,presses:new PendingPress(view,timers),stopReaderStages(){},READINESS_WORDS,afterPaint:(run:()=>void)=>{run();return()=>{};},
 };
 runInNewContext(production('/** A press in the reader waits at the bottom centre','/** Whether the pages drawn first'),context);
 runInNewContext(production('const PRESS_NEEDS','\napp.addEventListener(\'click\''),context);
 runInNewContext(production("window.addEventListener('keydown'",'\n\nfunction onMidiNote('),context);
 const target={closest(){return null;},matches(){return false;}};
 const press=(code:string)=>{key({code,key:code,target,repeat:false,ctrlKey:false,altKey:false,metaKey:false,shiftKey:false,preventDefault(){}});};
 const advance=async(ms:number)=>{const end=now+ms;for(;;){due.sort((a,b)=>a.at-b.at);const first=due[0];if(!first||first.at>end)break;due.shift();now=first.at;first.run();await flush();}now=end;await flush();};
 return {context,calls,failures,shown,press,advance,finish:()=>finish(),fail:(error:Error)=>fail(error),fingersRuns:()=>fingersRuns,readiness};
}

test('E pressed the moment a reopened score shows waits for its fingers, then edits once',async()=>{
 const r=reopened();
 r.readiness.prepare('fingers');await flush();
 r.press('KeyE');await flush();
 assert.deepEqual(r.calls,[],'the press is accepted and waits');
 assert.equal(r.context.presses.pending,'edit');
 r.press('KeyE');await flush();
 assert.equal(r.fingersRuns(),1);
 r.finish();await flush();
 assert.deepEqual(r.failures,[]);assert.deepEqual(r.calls,['edit'],'the press ran exactly once');
 assert.deepEqual(r.failures,[]);assert.deepEqual(r.shown,['show:Getting fingers ready…','withdraw'],'readiness ended within the threshold: the notice was withdrawn before it could be seen');
});

test('F (fingers) and P (practice) pressed before fingers are ready each run, with the notice after the threshold',async()=>{
 const f=reopened();
 f.press('KeyF');await f.advance(READINESS_NOTICE_DELAY_MS+1);
 assert.deepEqual(f.shown,['show:Getting fingers ready…']);assert.equal(f.context.presses.showing,true,'visible after the threshold');
 f.finish();await flush();
 assert.deepEqual(f.failures,[]);
 assert.equal(f.context.current.personal.view.labelMode,'finger','the fingers show: F toggled once');
 assert.ok(!f.calls.some(c=>c.startsWith('notify')),`${f.calls}`);
 assert.deepEqual(f.failures,[]);
 const p=reopened();
 p.press('KeyP');await p.advance(READINESS_NOTICE_DELAY_MS+1);
 assert.deepEqual(p.calls,[]);
 assert.deepEqual(p.shown,['show:Getting practice ready…'],'P says practice, in the player\'s words, though it waits for fingers');
 p.finish();await flush();
 assert.deepEqual(p.calls,['practice-menu']);assert.deepEqual(p.failures,[]);
});

test('Esc cancels a waiting press, and another command replaces it',async()=>{
 const r=reopened();
 r.press('KeyP');await flush();assert.equal(r.context.presses.pending,'practice');
 r.press('Escape');await flush();
 assert.equal(r.context.presses.pending,undefined);
 assert.equal(r.context.current.entry.id,'no14','Esc cancelled the press, it did not close the score');
 r.press('KeyP');await flush();r.press('KeyE');await flush();
 assert.equal(r.context.presses.pending,'edit');
 r.finish();await flush();
 assert.deepEqual(r.failures,[]);assert.deepEqual(r.calls,['edit']);
});

test('once fingers are ready, presses run at once and show nothing',async()=>{
 const r=reopened();
 r.readiness.prepare('fingers');await flush();r.finish();await flush();
 r.press('KeyE');await flush();r.press('KeyP');await flush();
 assert.deepEqual(r.calls,['edit','practice-menu']);assert.deepEqual(r.shown,[]);assert.deepEqual(r.failures,[]);
});

test('P on a score that is not for piano offers no piano practice: it says what the score is for instead of opening the practice menu',async()=>{
 const r=reopened();
 // A part reading (such as Add It Up): its toolbar offers no Practice, so P must not open Fingers or Sections either.
 r.context.current.package={manifest:{version:3}};r.context.requirePianoCapability=requirePianoCapability;
 r.readiness.prepare('fingers');await flush();r.finish();await flush();
 r.press('KeyP');await flush();
 assert.ok(!r.calls.includes('practice-menu'),`no practice menu: ${r.calls}`);assert.ok(!r.calls.includes('practice-start'));
 assert.deepEqual(r.failures.map(e=>(e as Error).message),['This score is available for reading. Piano practice and fingering controls apply to piano scores.']);
});

test('a press waiting for fingers that fail does not run, nor start the fingers again by itself',async()=>{
 const r=reopened();
 r.press('KeyE');await flush();assert.equal(r.context.presses.pending,'edit');
 r.fail(Error('Personal library remained busy; new score registration was not applied.'));await flush();
 assert.deepEqual(r.calls,[],'the edit does not run on fingers that are not there');
 assert.equal(r.fingersRuns(),1,'the press does not wait again: the failure is said once, by the stage');
 assert.equal(r.context.presses.pending,undefined);
 // A later press asks for the fingers again, and runs once they are ready.
 const up={code:'KeyE',key:'KeyE',repeat:false,ctrlKey:false,altKey:false,metaKey:false,shiftKey:false,preventDefault(){}};r.context.input.up(up);r.context.controls.keyUp(up);
 r.press('KeyE');await flush();assert.equal(r.fingersRuns(),2);
 r.finish();await flush();
 assert.deepEqual(r.calls,['edit']);assert.deepEqual(r.failures,[]);
});

test('a command that needs nothing, such as turning the page, still cancels the waiting press',async()=>{
 const r=reopened();
 r.press('KeyP');await flush();assert.equal(r.context.presses.pending,'practice');
 const turned:string[]=[];r.context.turnPage=(...args:unknown[])=>{turned.push(String(args[0]));};
 r.press('ArrowRight');await flush();
 assert.equal(turned.length,1,'the page turned');
 assert.equal(r.context.presses.pending,undefined,'the page turn took the place of P');
 r.finish();await flush();
 assert.ok(!r.calls.includes('practice-menu'),`P did not run after the page turn: ${r.calls}`);
 assert.deepEqual(r.failures,[]);
});

test('O pressed before fingers are ready opens Options once they are, so it offers what shared fingers allow (Restore all)',async()=>{
 const r=reopened();
 r.press('KeyO');await flush();
 assert.deepEqual(r.calls,[]);assert.equal(r.context.presses.pending,'practiceSettings');
 r.finish();await flush();
 assert.deepEqual(r.calls,['options']);assert.deepEqual(r.failures,[]);
});

test('a held fingering let go before fingers are ready stops waiting, and never shows',async()=>{
 const r=reopened();r.context.preferences.fingerBehavior='momentary';r.context.effectiveLabelMode=effectiveLabelMode;r.context.selectionPitchToggle=false;
 // The reader's own presentation refresh, as main.ts has it.
 runInNewContext(production('/** Whether the reader would show fingerings now','\nconst effectiveControls'),r.context);
 r.press('KeyF');await r.advance(READINESS_NOTICE_DELAY_MS+1);
 assert.equal(r.context.presses.pending,'toggle');assert.equal(r.context.presses.showing,true);
 const up={code:'KeyF',key:'KeyF',repeat:false,ctrlKey:false,altKey:false,metaKey:false,shiftKey:false,preventDefault(){}};
 r.context.input.up(up);r.context.controls.keyUp(up);r.context.refreshPresentation();await flush();
 assert.equal(r.context.presses.pending,undefined,'letting go cancels the wait');
 r.finish();await flush();
 assert.equal(r.context.current.personal.view.labelMode??'pitch','pitch');assert.deepEqual(r.failures,[]);
});
