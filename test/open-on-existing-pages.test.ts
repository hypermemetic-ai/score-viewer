import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {layoutName} from '../src/keyboard-selection';

// Opening a score never fails for want of a keyboard layout's pages: when the
// pages for the player's layout can't be made, the score opens on the pages
// it has, with a short notice. Switching layouts still reports the failure.
const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
const slice=(from:string,to:string)=>{const start=main.indexOf(from),end=main.indexOf(to,start);assert.ok(start>=0&&end>start,from);return stripTypeScriptTypes(main.slice(start,end));};
const READING_CANCELLED='Opening cancelled. Your score and choices are retained.';
const layoutFlow=slice('async function preparePianoLayout(','let scoreActivation=0;'),
 notices=slice('function carryNotes(','/** A saved edition whose pages');

function harness(engrave:()=>Promise<Uint8Array>){
 const opened:string[]=[],controller=new AbortController();
 const context:Record<string,unknown>={
  READING_CANCELLED,layoutName,console:{warn:()=>{}},host:{read:async()=>null},readerAdmission:{import:async()=>({})},
  getScoreTransposition:()=>0,canShareKeyboardView:()=>false,shareKeyboardView:async()=>{throw Error('not shared');},
  canAddKeyboardView:()=>true,addKeyboardView:engrave,prepareRebuiltEdition:async()=>{throw Error('not rebuilt');},
  prepareSourceTransposition:async()=>{throw Error('not transposed');},selectPresentation:async()=>({}),personalForAddedKeyboard:()=>undefined,
  readingProgress:()=>{},readingExecution:()=>({}),checkReading:()=>{if(controller.signal.aborted)throw Error(READING_CANCELLED);},
  preparePiano:async(bytes:Uint8Array,layout:string)=>{opened.push(layout);return {q:{packageBytes:bytes,package:{keyboardLayout:layout}},running:{},dialog:{}};},
 };
 runInNewContext(layoutFlow+'\nthis.preparePianoLayout=preparePianoLayout;',context);
 const selected={keyboardLayout:'janko-four-row',availablePresentations:['janko-four-row'],fingerLayer:{attacks:[]},manifest:{version:2}},
  prepare=(keepOnFailure:boolean)=>(context.preparePianoLayout as Function)(new Uint8Array([1,2,3]),'conventional-piano',undefined,selected,{controller},{id:'e',file:'f'},false,keepOnFailure);
 return {opened,controller,prepare};
}

test('a score whose pages for the other layout can\'t be engraved still opens, on the pages it has',async()=>{
 const h=harness(async()=>{throw Error('The engraving engine stopped.');});
 const result=await h.prepare(true);
 assert.deepEqual([...h.opened],['janko-four-row'],'opened on the Jankó pages it has');
 assert.deepEqual([...result.q.packageBytes],[1,2,3],'the saved edition, unchanged');
 assert.deepEqual({...result.gained},{from:'janko-four-row',fingers:true,kept:'conventional-piano'});
 const context:Record<string,unknown>={layoutName};runInNewContext(notices+'\nthis.gainedNotice=gainedNotice;',context);
 const said=(context.gainedNotice as Function)(result.gained,result.q.package,false);
 assert.match(said,/no pages for the conventional layout yet/i);assert.match(said,/opened on its Jankó layout pages/i);
 assert.match(said,/The fingerings shown are for the Jankó layout\./);
});

test('switching layouts still reports a failed engraving, and cancelling still cancels',async()=>{
 await assert.rejects(harness(async()=>{throw Error('The engraving engine stopped.');}).prepare(false),/engraving engine stopped/);
 const h=harness(async()=>{throw Error('unused');});
 h.controller.abort();
 await assert.rejects(harness(async()=>{const e=Error('aborted');e.name='AbortError';throw e;}).prepare(true),/aborted/);
 await assert.rejects(h.prepare(true),/unused/,'a cancelled opening is not opened on other pages');
 assert.equal(h.opened.length,0);
});
