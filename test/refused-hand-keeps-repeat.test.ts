import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {prepareMusicXmlScore} from '../src/musicxml-import';
import {importPackage,selectPresentation,type ScorePackage,type Seat} from '../src/package';
import {browserAssistanceStore,type AssistanceBrowserLocks} from '../src/durable-assistance-store';
import {PersonalMemorySession,rawMemoryPersonal,type PersonalMemoryAction} from '../src/personal-memory-session';
import {PersonalMemoryResolutionCache} from '../src/personal-memory-cache';
import {withResolvedMemory} from '../src/personal-assistance';
import {dropHandCarry,handFor,type PersonalHand} from '../src/personal-assignments';
import {PersonalPresentationSession,engravingRefusal,undrawableHandOwners,undrawableHandReason} from '../src/personal-presentation';
import {FOLD_FAILURE_TEXT,FoldFailure,FoldedReader,editOwners,foldedTwins,withRepeatInheritance,type FoldedPackage} from '../src/repeat-fold';
import {keptHandsText} from '../src/hand-editing-wait';
import {droppedCarryText} from '../src/hand-recurrence-text';
import {scoreCapabilities} from '../src/score-capabilities';
import {initialPersonal,type PersonalState} from '../src/state';
import {HandPresentationError} from '../vendor/iso-notation/src/score-presentation';

// A hand press the engraver refuses leaves the page as it was. On No. 13 the
// reader folds bars 10–20 back onto bars 0–10 (bar 20 is bar 10 again). L on
// bar 10's first B4, a unison of two voices, can't be drawn there; the reader
// says so, stores nothing, and keeps the repeat folded instead of writing it
// out. The note's passes return together, so they never part.

const root=new URL('../',import.meta.url);
const assets={font:{name:'fonts/URWGothic-Demi.otf',bytes:readFileSync(new URL('src/URWGothic-Demi.otf',root))},
 notices:Object.fromEntries(['URW-base35-COPYING','URW-base35-LICENSE','URW-base35-provenance.md'].map(name=>
  ['licenses/'+name,readFileSync(new URL('licenses/'+name,root))]))};
const main=readFileSync(new URL('src/main.ts',root),'utf8');
const between=(start:string,end:string)=>{const i=main.indexOf(start);return main.slice(i,main.indexOf(end,i));};
const line=(start:string)=>between(start,'\n');
/** The reader's own projection, refusal handling and hand press presentation, as main.ts writes them. */
const body=[line('const memoryInput='),line('const memoryResolutions='),line('const resolveMemoryInput='),line('function resolveMemory('),
 between('async function presentReader(','/** A stored bar as the reader prints it'),
 between('async function presentPersonalChange(','/** Accept one action')].map(s=>stripTypeScriptTypes(s)).join('\n')+'\nglobalThis.projectShown=projectShown;';
class Locks implements AssistanceBrowserLocks {private tail:Promise<unknown>=Promise.resolve();request<T>(_name:string,callback:()=>Promise<T>):Promise<T>{const next=this.tail.then(callback);this.tail=next.catch(()=>{});return next;}}

async function reader(p:ScorePackage){
 const data=new Map<string,string>(),store=browserAssistanceStore({getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);}},new Locks());
 const entry={id:'no13',importedAt:'2026-10-23T00:00:00.000Z'},session=new PersonalMemorySession(store,{scanLibrary:async()=>[{entryId:entry.id,importedAt:entry.importedAt,p,personal:initialPersonal(p)}],validateInputs:async()=>true});
 await session.initialize();
 const target={package:p,entry,personal:await session.loadPersonalCurrent(entry,p,async()=>initialPersonal(p))};
 // The written-out pages' engraving: a refusal on the folded pages never draws them.
 const written=new PersonalPresentationSession(p,undefined,{worker:null,cache:null}),writtenDrawn:PersonalState[]=[];
 const editor={generation:0,view:p as ScorePackage,visiblePersonal:target.personal,fold:new FoldedReader(p,null),projections:new Map(),
  session:{project:(s:PersonalState,execution?:unknown)=>{writtenDrawn.push(s);return written.project(s,execution as never);}},
  queue:{sequence:0,accept(){return {sequence:++this.sequence,saved:Promise.resolve()};}}};
 const said:string[]=[];
 const context:any={structuredClone,crypto,console,DOMException,handFor,dropHandCarry,undrawableHandOwners,undrawableHandReason,engravingRefusal,rawMemoryPersonal,withResolvedMemory,withRepeatInheritance,
  scoreCapabilities,PersonalMemoryResolutionCache,FoldFailure,FOLD_FAILURE_TEXT,foldedTwins,keptHandsText,droppedCarryText,
  personalMemory:session,memoryLibrary:{remember(){}},personalEditor:()=>editor,foldFailureSaid:new Set(),notify:(text:string)=>said.push(text),printedBars:()=>(bar:number)=>bar,
  current:target,selection:undefined as Seat|undefined,practice:undefined,PracticeView:class{},adviceKey:'',adviceRunner:{cancel(){}},paintPersonalSaveError(_:unknown,error:unknown){throw error;},
  capturePersonalNavigation(){},resolvePersonalNavigation(){},sourceNavigationAnchor:()=>undefined,sourceNavigationSeat:()=>undefined,
  visibleSourceSeat:(view:ScorePackage,seat:Seat)=>view.seats.find(s=>s.id===seat.id&&s.ownerIds[0]===seat.ownerIds[0]),renderPages(){},renderToolbar(){},focusSelection(){}};
 runInNewContext(body,context);
 target.personal=context.resolveMemory(target);editor.view=await context.projectShown(target,target.personal);
 /** One L or R on a note the reader shows, as the viewer applies it: on a folded note, once per pass that carries a choice. */
 const press=async(hand:PersonalHand,seat:Seat)=>{
  const owners=editOwners(seat),authoredAt=new Date().toISOString();let personal=target.personal;
  for(const ownerId of owners)personal=session.accept({entryId:entry.id,importedAt:entry.importedAt,p,personal:rawMemoryPersonal(personal)},{kind:'hand',ownerId,hand,decisionId:crypto.randomUUID(),authoredAt,...(owners.length>1?{passes:[...owners]}:{})}).personal;
  context.selection=seat;said.length=0;writtenDrawn.length=0;
  await context.presentPersonalChange(target,personal,new Promise(()=>{}),seat);
 };
 const finger=async(ownerIds:readonly string[],value:1|2|3|4|5)=>{let personal=target.personal;
  for(const ownerId of ownerIds)personal=session.accept({entryId:entry.id,importedAt:entry.importedAt,p,personal:rawMemoryPersonal(personal)},{kind:'finger',edit:{ownerId,finger:value,decisionId:crypto.randomUUID(),authoredAt:new Date().toISOString()}} as PersonalMemoryAction).personal;
  await context.presentPersonalChange(target,personal,new Promise(()=>{}));};
 return {target,editor,context,said,writtenDrawn,press,finger,session};
}

// One test on purpose: it engraves No. 13 once, folded, and presses on it.
test('No. 13: a refused hand press on a folded note leaves the repeat folded and stores nothing; its passes return together',{timeout:10*60_000},async()=>{
 const prepared=await prepareMusicXmlScore(readFileSync(new URL('vendor/iso-notation/src/scores/schumann-op68-no13.musicxml',root)),assets);
 const p=await selectPresentation(await importPackage(prepared.bytes,{allowLegacyTempo:true}),'janko-four-row');
 const r=await reader(p),shown=()=>r.editor.view as FoldedPackage;
 assert.ok(shown().verbatimFold,'No. 13 opens with its repeat folded');
 const before={pages:[...shown().pages],seats:shown().seats.map(s=>s.id)};
 // Bar 10's first B4 (two voices in unison) and its return in bar 20.
 const b4=['P1:m10:n1','P1:m10:n9','P1:m20:n1','P1:m20:n9'],hands=()=>b4.map(id=>handFor(p,r.target.personal,id));
 const storedHands=()=>Object.values(r.target.personal.assignments?.choices??{}).filter(c=>c.hand!==undefined).map(c=>c.ownerId).sort();
 const seat=()=>shown().seats.find(s=>s.ownerIds.includes('P1:m10:n1'))!;
 assert.deepEqual(hands(),['RH','RH','RH','RH']);

 await r.press('LH',seat());
 assert.ok(r.said.some(text=>text.startsWith('That hand can’t be drawn on the page yet')),r.said.join(' | '));
 assert.ok(!r.said.includes(FOLD_FAILURE_TEXT),'a refused hand is no failure of the fold');
 assert.ok(shown().verbatimFold,'the repeat stays folded');
 assert.deepEqual(shown().pages,before.pages,'the pages are drawn as they were');assert.deepEqual(shown().seats.map(s=>s.id),before.seats);
 assert.equal(r.writtenDrawn.length,0,'the written-out pages are never drawn');
 assert.deepEqual(hands(),['RH','RH','RH','RH']);assert.deepEqual(storedHands(),[],'nothing is stored');
 assert.equal(r.context.selection.id,seat().id,'the same note stays selected');

 // Both passes carry the player's finger, so one press reaches both; refused, both return together.
 await r.finger(['P1:m10:n1','P1:m20:n1'],2);
 assert.ok(shown().verbatimFold,'agreeing fingers still fold');assert.deepEqual(editOwners(seat()).map(id=>id.split(':')[1]),['m10','m20'],'L reaches both passes');
 const folded={pages:[...shown().pages]};
 await r.press('LH',seat());
 assert.ok(r.said.some(text=>text.startsWith('That hand can’t be drawn on the page yet')),r.said.join(' | '));
 assert.ok(shown().verbatimFold,'the repeat stays folded');assert.deepEqual(shown().pages,folded.pages);assert.equal(r.writtenDrawn.length,0);
 assert.deepEqual(hands(),['RH','RH','RH','RH']);assert.deepEqual(storedHands(),[],'no hand is stored on either pass');
 assert.deepEqual(['P1:m10:n1','P1:m20:n1'].map(id=>r.target.personal.assignments?.choices[id]?.finger??r.target.personal.memoryResolved?.choices[id]?.finger),[2,2],'the fingers stay (bar 20 shares bar 10’s through fingering memory)');

 // A refusal that names one pass only (as the written-out pages may, where only
 // one pass runs into other notation) returns the press on every pass. One pass
 // alone would keep the other's hand: the repeat would be written out with the
 // refused hand stored.
 const attempted=structuredClone(r.target.personal),beforePress=r.target.personal;let pressed=r.target.personal;
 for(const ownerId of ['P1:m10:n1','P1:m20:n1'])pressed=r.session.accept({entryId:'no13',importedAt:r.target.entry.importedAt,p,personal:rawMemoryPersonal(pressed)},{kind:'hand',ownerId,hand:'LH',decisionId:crypto.randomUUID(),authoredAt:new Date().toISOString(),passes:['P1:m10:n1','P1:m20:n1']}).personal;
 r.target.personal=pressed;r.target.personal=r.context.resolveMemory(r.target);void attempted;
 assert.deepEqual(hands(),['LH','LH','LH','LH'],'the press reached both passes');
 const secondOnly=Error("These hand choices can't be drawn on the page yet.",{cause:new HandPresentationError('unsupported-fit','Personal hands cannot fit the matching musical presentation.',['P1:m20:n9'])});
 const kept=await r.context.keepDrawableHands(r.target,r.target.personal,secondOnly,(id:string)=>handFor(p,beforePress,id),beforePress);
 assert.equal(kept.keys,1,'one folded note');assert.deepEqual([...kept.dropped],[],'bar 20 is not dropped on its own');
 assert.deepEqual(hands(),['RH','RH','RH','RH']);assert.deepEqual(storedHands(),[]);
 assert.ok((kept.view as FoldedPackage).verbatimFold,'drawn folded again');assert.deepEqual(kept.view.pages,folded.pages);

 // The same where only the return can't be drawn: an engraver that refuses L in bar 20 alone.
 // Returning bar 20 by itself would leave bar 10's L standing.
 let lone=r.target.personal;
 for(const ownerId of ['P1:m10:n1','P1:m20:n1'])lone=r.session.accept({entryId:'no13',importedAt:r.target.entry.importedAt,p,personal:rawMemoryPersonal(lone)},{kind:'hand',ownerId,hand:'LH',decisionId:crypto.randomUUID(),authoredAt:new Date().toISOString(),passes:['P1:m10:n1','P1:m20:n1']}).personal;
 const shownBefore=r.target.personal;r.target.personal=lone;r.target.personal=r.context.resolveMemory(r.target);
 const {fold,session}=r.editor,drawnHands:string[][]=[];
 r.editor.fold={folds:()=>false} as never;r.editor.session={project:async(s:PersonalState)=>{drawnHands.push(b4.map(id=>handFor(p,s,id)!));if(handFor(p,s,'P1:m20:n9')==='LH')throw secondOnly;return p;}};
 try{await r.context.keepDrawableHands(r.target,r.target.personal,secondOnly,(id:string)=>handFor(p,shownBefore,id),shownBefore);}finally{r.editor.fold=fold;r.editor.session=session;}
 assert.deepEqual(drawnHands,[['RH','RH','RH','RH']],'both passes return before the page is drawn again');
 assert.deepEqual(hands(),['RH','RH','RH','RH']);assert.deepEqual(storedHands(),[]);
});
