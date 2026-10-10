import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceFixture} from './support/reference-score';
import {planPractice,initialPractice,readPractice,ReadingSession,PracticeSession,reconcilePassages,passageHierarchy} from '../src/practice';
import {PracticeView} from '../src/practice-view';
import {PracticeSlots} from '../src/practice-window';
import {PracticeBrowser} from '../src/practice-browser';
import {PracticeDone} from '../src/practice-attainment';
import {PracticeClock} from '../src/practice-clock';
import {PracticeDiagnostics} from '../src/practice-diagnostics';
import {host} from '../src/host';
const pkg=await referenceFixture(new URL('../vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.isoscore',import.meta.url)),plan=planPractice(pkg);
function fixture(t:any,connected=true){
 const state=initialPractice(plan),view=Object.create(PracticeView.prototype) as any,writes:any[]=[],messages:string[]=[],oldWrite=host.write;
 host.write=async(name,bytes)=>{writes.push({name,value:JSON.parse(new TextDecoder().decode(bytes))});};t.after(()=>{host.write=oldWrite;view.clock?.close?.();});
 Object.assign(view,{plan,state,session:new PracticeSession(plan,plan.chunks[0],state,connected),mode:'reading',previousMode:'reading',reading:new ReadingSession(plan,plan.chunks[0]),readingPaused:true,readingStarted:false,slots:new PracticeSlots(plan,plan.chunks[0]),sourceCrops:new Map(),doneClaims:new PracticeDone(),loopRate:0,browser:new PracticeBrowser(plan),saved:Promise.resolve(),diagnosticWrites:Promise.resolve(),startGeneration:0,completionRevision:0,disposed:false,done:false,overview:false,resumeAfter:0,manual:{cancel(){}},contacts:{clear(){},press(){},release(){},replace(){}},heldPitches:new Set(),heldStreams:new Map(),diagnostics:new PracticeDiagnostics(),app:{querySelector:()=>({focus(){}})},options:{package:pkg,entryId:pkg.manifest.revision,connected:()=>connected,changed:()=>{}},preview:{clear(){},release(){},note(){return {decision:'inactive',contacts:[]};}},audioOutputs:{supported:true,outputs:[]}});
 view.paint=()=>{};view.paintScore=()=>{};view.paintControls=()=>{};view.paintVisibility=()=>{};view.status=(message:string)=>messages.push(message);return {view,state,writes,messages};
}
const note=(midi:number,extra={})=>({note:midi,velocity:80,on:true,channel:1,source:'test',generation:1,timestamp_micros:100000000,...extra});
const tick=()=>new Promise<void>(resolve=>setImmediate(resolve));
test('Reading retains source position/chord order, quiet stray handling and bounded cycles without credit',()=>{
 const state=initialPractice(plan),before=JSON.stringify(state),r=new ReadingSession(plan,plan.chunks[0]);
 assert.deepEqual(r.current.groups,['0:LH']);assert.equal(r.note(59,8),'quiet-ignored');assert.equal(r.note(59,9),'failed');assert.equal(r.index,0);assert.equal(r.note(55,1),'accepted');assert.equal(r.failure,undefined);assert.equal(r.note(55),'accepted');assert.equal(r.matched.size,1);
 // Duplicate contacts cannot consume another chord member.
 r.restart();let decisions=0;while(!r.cycles){for(const a of [...r.current.events]){r.note(a.midi);decisions++;}assert.ok(decisions<1000);}
 assert.equal(r.index,0);assert.equal(r.complete,false);assert.equal(r.matched.size,0);assert.equal(JSON.stringify(state),before);
});
test('Reading cycles exact original join pairs and empty source windows remain finite and browsable',()=>{
 const s=initialPractice(plan);for(const c of plan.chunks.slice(0,4))s.best[c.pattern]=s.target;
 const joined=reconcilePassages(plan,s).all.get('1-16')!,r=new ReadingSession(plan,joined),ranges:number[][]=[];
 assert.deepEqual(r.windows,[[3,4],[7,8],[11,12]]);while(!r.cycles){const range=[...r.range];if(!ranges.some(x=>String(x)===String(range)))ranges.push(range);assert.ok(r.current.events.every(a=>a.bar>=range[0]&&a.bar<=range[1]));for(const a of [...r.current.events])r.note(a.midi);}
 assert.deepEqual(ranges,[[3,4],[7,8],[11,12]]);assert.equal(r.window,0);assert.equal(r.selectWindow(2),true);assert.deepEqual(r.range,[11,12]);assert.equal(r.turnWindow(1),true);assert.equal(r.window,0);assert.equal(r.selectWindow(9),false);
 const silent=new ReadingSession({...plan,gestures:[],attacks:[]},joined);assert.equal(silent.steps.length,3);assert.equal(silent.note(60),'inactive');assert.equal(silent.complete,false);for(let i=0;i<12;i++)assert.equal(silent.turnWindow(1),true);assert.equal(silent.window,0);
 const single=new ReadingSession({...plan,gestures:plan.gestures.slice(0,1)},plan.chunks[0]);assert.equal(single.steps.length,1);for(const a of [...single.current.events])single.note(a.midi);assert.equal(single.cycles,1);assert.equal(single.index,0);
});
test('retained parent completion never substitutes for original leaves when unlocking another join',()=>{
 const s=initialPractice(plan),a=plan.chunks[0],b=plan.chunks[1],c=plan.chunks[2];s.composites={'1-8':[a.id,b.id]};const joined=passageHierarchy(plan,s).all.get('1-8')!;s.best[a.pattern]=s.target;s.best[b.pattern]=s.target*.5;s.best[c.pattern]=s.target;s.best[joined.pattern]=s.target;
 const before=structuredClone(s),tree=reconcilePassages(plan,s);assert.ok(tree.all.has('1-8'));assert.ok(!tree.all.has('1-12'));assert.deepEqual(s,before);s.best[b.pattern]=s.target;assert.ok(reconcilePassages(plan,s).all.has('1-12'));
});
test('fresh piano settings use 30/50/2 while retained starts and evidence stay exact',()=>{
 const s=initialPractice(plan);assert.equal(s.start,54);assert.equal(s.working,54);assert.equal(s.connectionStart,90);assert.equal(s.step,3.6);
 for(const start of [18,27,72]){const raw={...s,start,working:126,groundwork:{[plan.chunks[0].pattern]:true},best:{[plan.chunks[0].pattern]:123.123}};const before=JSON.stringify(raw),loaded=readPractice(raw,plan);assert.equal(loaded.start,start);assert.deepEqual(loaded.best,raw.best);assert.deepEqual(loaded.groundwork,raw.groundwork);assert.equal(JSON.stringify(raw),before);}
});
test('opening and completing reusable Reading never writes groundwork, tempo or manual attainment',async t=>{
 const f=fixture(t),c=plan.chunks[0];f.state.groundwork={[c.pattern]:true};f.state.best[c.pattern]=180;const earned=structuredClone(f.state);f.view.selectPassage(c);assert.equal(f.view.mode,'reading');assert.ok(f.view.reading);assert.equal(f.view.readingPaused,true);await f.view.action('ready');while(!f.view.reading.cycles)for(const a of [...f.view.reading.current.events])f.view.note(note(a.midi));await f.view.saved;await f.view.diagnosticWrites;
 assert.equal(f.view.mode,'reading');assert.equal(f.view.session.phase,'paused');assert.deepEqual(f.state,earned);assert.deepEqual(f.writes,[]);f.view.selectPassage(c);assert.equal(f.view.reading.index,0);assert.equal(f.view.readingPaused,true);
});
test('manual Reading has full source only, no matched notes, Done or hidden working changes',async t=>{
 const f=fixture(t,false),before=structuredClone(f.state);await f.view.action('ready');f.view.note(note(55));assert.equal(f.view.reading.index,0);assert.equal(f.view.reading.matched.size,0);assert.equal(f.view.readingActive(),false);assert.equal(f.view.doneControl(),'');assert.equal(f.view.canMarkDone,false);assert.equal(f.view.key('ArrowUp'),false);assert.equal(f.view.key('KeyK'),false);await f.view.action('done');assert.deepEqual(f.state,before);assert.deepEqual(f.writes,[]);
});
test('internal pause keeps selected mode; Free returns to that mode with explicit Space start',async t=>{
 const f=fixture(t);await f.view.action('ready');assert.equal(f.view.readingPaused,false);f.view.pause();assert.equal(f.view.mode,'reading');assert.equal(f.view.readingPaused,true);await f.view.action('free-view');assert.equal(f.view.mode,'free');assert.equal(f.view.previousMode,'reading');await f.view.action('ready');assert.equal(f.view.mode,'reading');assert.equal(f.view.readingPaused,false);await f.view.action('timed');assert.equal(f.view.mode,'timed');assert.equal(f.view.session.phase,'paused');assert.equal(f.view.readingPaused,true);assert.equal(f.view.clock,undefined);f.view.pause();assert.equal(f.view.mode,'timed');
});
test('a mode switch owns pending Timed unlock and cannot let its old callback start audio',async t=>{
 const f=fixture(t);let unlock!:()=>void,begins=0;const oldUnlock=PracticeClock.prototype.unlock,oldBegin=PracticeClock.prototype.begin;
 PracticeClock.prototype.unlock=()=>new Promise<void>(r=>unlock=r);PracticeClock.prototype.begin=async()=>{begins++;return 1000;};t.after(()=>{PracticeClock.prototype.unlock=oldUnlock;PracticeClock.prototype.begin=oldBegin;});
 await f.view.action('timed');const start=f.view.action('ready');for(let i=0;i<20&&!unlock;i++)await tick();assert.ok(unlock);const oldGeneration=f.view.startGeneration;await f.view.action('reading');assert.ok(f.view.startGeneration>oldGeneration);unlock();await start;assert.equal(begins,0);assert.equal(f.view.mode,'reading');assert.equal(f.view.session.phase,'paused');assert.equal(f.view.readingPaused,true);
});
test('source pitch holding and releasing is only preview/setup and never implicit Timed startup',async t=>{
 const f=fixture(t);await f.view.action('timed');f.view.session.phase='ready';let starts=0;f.view.action=async()=>{starts++;};for(const a of f.view.session.events.slice(0,4)){f.view.note(note(a.midi));f.view.note(note(a.midi,{on:false}));}assert.equal(starts,0);assert.equal(f.view.session.phase,'ready');
});
test('joined Reading cursor survives explicit four-measure Free windows and a Timed error cannot leak into its pair',async t=>{
 const f=fixture(t);for(const c of plan.chunks.slice(0,4))f.state.best[c.pattern]=f.state.target;
 const joined=reconcilePassages(plan,f.state).all.get('1-16')!;f.view.selectPassage(joined);f.view.reading.selectWindow(1);f.view.showReadingWindow();assert.deepEqual(f.view.slots.bars,[7,8,undefined,undefined]);
 await f.view.action('free-view');assert.equal(f.view.mode,'free');assert.equal(f.view.slots.bars.filter((x:any)=>x!==undefined).length,4);const original=[...f.view.slots.bars];await f.view.action('next');assert.notDeepEqual(f.view.slots.bars,original);await f.view.action('ready');assert.equal(f.view.mode,'reading');assert.equal(f.view.reading.window,1);assert.deepEqual(f.view.slots.bars,[7,8,undefined,undefined]);
 await f.view.action('timed');f.view.session.fail(15,'A different note was played.',plan.attacks.find(a=>a.bar===15));assert.ok(f.view.session.failure);await f.view.action('reading');assert.equal(f.view.session.failure,undefined);assert.equal(f.view.session.errorMarked,false);assert.equal(f.view.reading.window,1);assert.deepEqual(f.view.slots.bars,[7,8,undefined,undefined]);
});
test('a started silent joined Reading window remains explicitly browsable with no manufactured attack or credit',async t=>{
 const f=fixture(t);for(const c of plan.chunks.slice(0,4))f.state.best[c.pattern]=f.state.target;
 const joined=reconcilePassages(plan,f.state).all.get('1-16')!,silent={...plan,gestures:[],attacks:[]};f.view.selectPassage(joined);f.view.reading=new ReadingSession(silent,joined);await f.view.action('ready');assert.equal(f.view.readingActive(),true);assert.equal(f.view.canTurnPage,true);const before=structuredClone(f.state);await f.view.action('next');assert.equal(f.view.reading.window,1);assert.deepEqual(f.view.slots.bars,[7,8,undefined,undefined]);assert.equal(f.view.reading.matched.size,0);assert.deepEqual(f.state,before);assert.deepEqual(f.writes,[]);
});
