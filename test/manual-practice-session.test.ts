import test from 'node:test';
import assert from 'node:assert/strict';
import {importPackage} from '../src/package';
import {planManualPractice} from '../src/manual-practice-plan';
import {ManualPracticeSession,ManualPracticeWindows} from '../src/manual-practice-session';
import {practiceAssessment} from '../src/practice-assessment';
import {scoreCapabilities} from '../src/score-capabilities';
import {initialPractice,passageHierarchy,reconcilePassages} from '../src/practice';
import {manualPracticeRecord,manualPracticeStorageName,readManualPractice} from '../src/manual-practice-state';
import {displayedPracticeTotal} from '../src/practice-display';
import {hasDone} from '../src/practice-attainment';
import {planPracticeRepeat,selectPracticeRepeatStart} from '../src/practice-repeat';
import {authoredReadingPackage,authoredReadingScore} from './support/instrument-reading-fixture';
import {authoredManualPackage,authoredManualScore} from './support/manual-practice-fixture';

const p=await authoredManualPackage(),plan=await planManualPractice(p,'fixed-four-v1');
function whole(){const state=initialPractice(plan);state.composites={'1-8':['1-4','5-8'],'1-12':['1-8','9-12']};return {state,chunk:passageHierarchy(plan,state).all.get('1-12')!};}

test('connected piano availability cannot grant physical assessment to manual musical owners',()=>{
 assert.equal(scoreCapabilities(p).manualPractice,true);
 assert.equal(practiceAssessment(p,true),'manual');assert.equal(practiceAssessment(p,false),'manual');
 const session=new ManualPracticeSession(plan,plan.chunks[0],initialPractice(plan));
 for(const key of ['note','release','sustain','matched','started','gestures','seats'])assert.equal(key in session,false);
 assert.equal(session.assessment,'manual');
 assert.equal(scoreCapabilities({manifest:{version:3}}).manualPractice,false);
 assert.equal(scoreCapabilities({manifest:{version:4 as 3}}).pianoPractice,false);
});

test('a complete clock loop enables a truthful reversible claim without measured success',()=>{
 const state=initialPractice(plan),s=new ManualPracticeSession(plan,plan.chunks[0],state),before=JSON.stringify(state);
 assert.equal(s.canDone,false);assert.equal(s.toggleDone(),undefined);s.ready(123);s.update(s.startMs-1);
 assert.equal(s.phase,'countin');assert.equal(s.canDone,false);s.update(s.startMs);assert.equal(s.phase,'trial');
 assert.equal(s.update(s.startMs+s.durationMs),'completed');assert.equal(s.update(s.startMs+s.durationMs+1),undefined);
 assert.equal(s.canDone,true);assert.equal(JSON.stringify(state),before);assert.deepEqual(state.best,{});
 assert.equal(s.toggleDone()!.marked,true);assert.equal(hasDone(state,s.doneTarget()),true);assert.deepEqual(state.best,{});
 // All three source-authored four-bar units are identical: one observed
 // manual loop grants the same 10% rate at each location, never measured best.
 assert.ok(Math.abs(displayedPracticeTotal(plan,state)-.1)<1e-12);assert.equal(displayedPracticeTotal(plan,state,false),0);
 assert.equal(s.toggleDone()!.marked,false);assert.equal(displayedPracticeTotal(plan,state),0);
});

test('explicit long manual turns preserve clock, phase, rate and every source owner',()=>{
 const {state,chunk}=whole(),s=new ManualPracticeSession(plan,chunk,state),source=JSON.stringify(p),ownerIds=plan.owners.map(o=>o.id);
 assert.deepEqual(s.windows.windows,[[0,1,2,3],[2,3,4,5],[4,5,6,7],[6,7,8,9],[8,9,10,11]]);
 s.ready(1000);s.update(s.startMs+1);const start=s.startMs,grid=JSON.stringify(s.pulseGrid),phase=s.phase,rate=s.bpm;
 for(let i=0;i<4;i++)assert.equal(s.turn(1),true);assert.equal(s.turn(1),false);assert.deepEqual(s.windows.bars,[8,9,10,11]);
 assert.equal(s.startMs,start);assert.equal(s.phase,phase);assert.equal(s.bpm,rate);assert.equal(JSON.stringify(s.pulseGrid),grid);
 assert.throws(()=>s.applyNextRate(),/loop boundary/);
 assert.deepEqual(plan.owners.map(o=>o.id),ownerIds);assert.equal(JSON.stringify(p),source);assert.deepEqual(state.best,{});
 s.pause();assert.equal(s.phase,'paused');assert.deepEqual(s.windows.bars,[8,9,10,11]);
});

test('restoring an overlapping source window prefers its exact start over an earlier containing window',()=>{
 const {state,chunk}=whole(),session=new ManualPracticeSession(plan,chunk,state);
 for(const window of session.windows.windows){session.windows.reset();session.windows.showBar(window[0]);assert.deepEqual(session.windows.bars,window);}
 assert.equal(session.windows.showBar(3),true);assert.deepEqual(session.windows.bars,[0,1,2,3]);
 assert.equal(session.windows.showBar(999),false);assert.deepEqual(session.windows.bars,[0,1,2,3]);
});

test('a repeat restores its first window only at actual beat-aligned count-in',()=>{
 const {state,chunk}=whole(),s=new ManualPracticeSession(plan,chunk,state);s.ready(1000);s.update(s.startMs);s.turn(1);s.turn(1);
 const oldStart=s.startMs,end=oldStart+s.durationMs;s.update(end);
 const repeat=planPracticeRepeat({previousStartMs:oldStart,phraseEndMs:end,previousBpm:s.bpm,nextBpm:s.bpm,
  grid:s.sourcePulseGrid,previousGrid:s.pulseGrid,sourceBoundary:true}),next=selectPracticeRepeatStart(repeat,end);
 s.ready(next.countStartMs,repeat.grid!);assert.deepEqual(s.windows.bars,[4,5,6,7]);
 s.update(next.countStartMs-.001);assert.deepEqual(s.windows.bars,[4,5,6,7]);
 s.update(next.countStartMs);assert.deepEqual(s.windows.bars,[0,1,2,3]);assert.equal(s.phase,'countin');
 assert.equal(s.startMs,next.startMs);s.update(s.startMs);assert.equal(s.phase,'trial');assert.deepEqual(state.best,{});
});

test('musical manual records share notation identity, isolate parts, and do not alias piano files',async()=>{
 const state=initialPractice(plan),s=new ManualPracticeSession(plan,plan.chunks[0],state);s.ready(0);s.update(s.startMs+s.durationMs);s.toggleDone();
 const record=manualPracticeRecord(plan,state),copy=structuredClone(p);copy.score.readingPolicy!.centerPitch=36;copy.score.readingPolicy!.guidePitches=[24,36,48];
 const otherView=await planManualPractice(copy,'fixed-four-v1');
 assert.equal(manualPracticeStorageName(plan),manualPracticeStorageName(otherView));
 assert.deepEqual(readManualPractice(JSON.parse(JSON.stringify(record)),otherView),record.state);
 assert.ok(manualPracticeStorageName(plan).startsWith('practice-manual-v1-'));
 const otherPartition=await planManualPractice(p,'connection-boundary-v1');
 assert.notEqual(manualPracticeStorageName(plan),manualPracticeStorageName(otherPartition));
 assert.throws(()=>readManualPractice(record,otherPartition),/retained/);
 assert.throws(()=>readManualPractice(state,plan),/retained/);
 assert.throws(()=>readManualPractice({...record,partId:'other'},plan),/retained/);
 assert.throws(()=>readManualPractice({...record,state:{...state,best:{[plan.chunks[0].pattern]:100}}},plan),/measured evidence/);
 const withdrawn=readManualPractice(record,otherView),reopened=new ManualPracticeSession(otherView,otherView.chunks[0],withdrawn);
 assert.equal(reopened.canDone,true);assert.equal(reopened.toggleDone()!.marked,false);assert.deepEqual(withdrawn.best,{});
});

test('five-bar tails and forged clocks/passages refuse without source or state mutation',async()=>{
 const five=await planManualPractice(await authoredManualPackage(5)),state=initialPractice(five),chunk=five.chunks[0];
 assert.equal(chunk.id,'1-5');assert.deepEqual(new ManualPracticeWindows(five,chunk).windows,[[0,1,2,3],[1,2,3,4]]);
 const session=new ManualPracticeSession(five,chunk,state),before=JSON.stringify(state);
 assert.throws(()=>session.ready(-1),/origin/);
 assert.throws(()=>session.ready(0,{...session.sourcePulseGrid,barStartPulses:[0,1]}));
 assert.throws(()=>new ManualPracticeSession(five,{...chunk,pattern:'borrowed-other-pattern'},state),/context differs/);
 assert.equal(JSON.stringify(state),before);
});

test('cross-measure written ties keep one musical owner and honest retained appearance provenance',async()=>{
 const score=authoredManualScore(4);score.notes=score.notes.filter(n=>n.startTick>=384);
 const first=authoredReadingScore().notes[0];score.notes.unshift({...first,id:'authored-tied-owner',startTick:0,durationTicks:384,
  sourceWrittenValue:{type:'whole',dots:0}});
 score.tieChains=[{noteId:'authored-tied-owner',voice:'original-part:1',soundingTicks:384,components:[
  {startTick:0,durationTicks:192,tieForward:true,tieWait:false,voice:'original-part:1',sourceWrittenValue:{type:'whole',dots:0}},
  {startTick:192,durationTicks:192,tieForward:false,tieWait:false,voice:'original-part:1',sourceWrittenValue:{type:'whole',dots:0}}
 ]}];
 const tied=await importPackage(await authoredReadingPackage(score)),tp=await planManualPractice(tied);
 assert.equal(tp.owners.filter(o=>o.id==='authored-tied-owner').length,1);
 const components=tp.components.filter(c=>c.ownerId==='authored-tied-owner');assert.equal(components.length,2);
 assert.deepEqual(components.map(c=>[c.tick,c.durationTicks]),[[0,192],[192,192]]);
 assert.ok(components.every(c=>c.provenance.kind==='retained-reading-head-v1'&&!('sourceEventId'in c)));
 const incomplete=structuredClone(tied);incomplete.reading!.owners.find(o=>o.id==='authored-tied-owner')!.heads.pop();
 await assert.rejects(planManualPractice(incomplete),/incomplete written source components/);
});
