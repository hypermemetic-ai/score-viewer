import test from 'node:test';
import assert from 'node:assert/strict';
import {authoredReadingPackage,authoredReadingScore} from './support/instrument-reading-fixture';
import {testReference} from './support/reference-score';
import {importPackage,type ScorePackage} from '../src/package';
import {planManualPractice} from '../src/manual-practice-plan';
import {ManualPracticeSession} from '../src/manual-practice-session';
import {ManualPracticeTransport,type ManualClock} from '../src/manual-practice-transport';
import {planPractice,practiceCatalogChunks,PracticeSession,ReadingSession,initialPractice} from '../src/practice';
import {activePracticeClip} from '../src/practice-clip';
import {scorePulseGrid,scoreTickMs} from '../src/score-clock';
import {practiceTiming} from '../src/practice-timing';

async function fixture(barCount:number,heldEnd:number){
 const score=authoredReadingScore(),owner={partId:'original-part',staffId:'1',voiceId:'1'};
 score.id=`whole-bar-held-${barCount}`;score.totalTicks=barCount*144;score.sourceBarTicks=Array.from({length:barCount+1},(_,i)=>i*144);
 score.timeSignatures=[{tick:0,numerator:6,denominator:8}];score.referencePerformanceTempo=testReference;score.techniques=[];
 score.barlines=score.sourceBarTicks.map((tick,i)=>({tick,barNumber:i+1,type:i===barCount?'final':i>0&&i%4===0?'double':'regular'}));
 score.notes=Array.from({length:barCount*6},(_,i)=>({...owner,id:`attack-${i}`,eventKind:'pitched' as const,
  pitch:{octave:2,pitchClass:(i*7)%12},startTick:i*24,durationTicks:24,sourceWrittenValue:{type:'eighth' as const,dots:0}}));
 score.notes.push({...owner,voiceId:'2',id:'held-bass',eventKind:'pitched',pitch:{octave:1,pitchClass:0},startTick:0,durationTicks:heldEnd});
 const manualPackage=await importPackage(await authoredReadingPackage(score)),manual=await planManualPractice(manualPackage);
 const pianoScore=structuredClone(score);delete pianoScore.parts;delete pianoScore.readingPolicy;
 for(const note of pianoScore.notes)note.hand=note.id==='held-bass'?'LH':'RH';
 const pianoPackage={score:pianoScore,manifest:{...manualPackage.manifest,version:1,revision:'a'.repeat(64)}} as ScorePackage;
 return {score,manual,piano:planPractice(pianoPackage),manualPackage,pianoPackage};
}
const ordinary=await fixture(8,1008),connected=await fixture(12,1584);

for(const [name,f]of [['section',ordinary],['connection',connected]] as const){
 const chunk=(plan:typeof f.piano|typeof f.manual)=>name==='section'?plan.chunks[0]:practiceCatalogChunks(plan).find(c=>c.kind==='connection')!;
 test(`bounded whole-bar ${name} retains actual piano hold through release, without later attacks`,()=>{
  const plan=f.piano,c=chunk(plan),state=initialPractice(plan),s=new PracticeSession(plan,c,state,true),sourceBefore=JSON.stringify(f.pianoPackage.score);
  assert.equal(c.start,0);assert.equal(c.end,name==='section'?576:1152);assert.equal(s.completionTick,name==='section'?1008:1584);
  assert.ok(s.sourcePulseGrid.sourceExcerpt);assert.equal(activePracticeClip(c,plan.barTicks),undefined,'Display remains the actual whole-bar section');
  assert.ok(plan.attacks.some(a=>a.tick>=c.end&&a.tick<s.completionTick));assert.ok(s.events.every(a=>a.tick<c.end));
  const reading=new ReadingSession(plan,c),readingBars=c.joins?.flatMap(bar=>[bar,bar+1]);
  const expectedReading=s.events.filter(a=>!readingBars||readingBars.includes(a.bar));
  assert.deepEqual([...new Set(reading.steps.flatMap(step=>step.events.map(a=>a.id)))].sort(),expectedReading.map(a=>a.id).sort());
  s.ready(0);for(const a of s.events)assert.equal(s.note(a.midi,s.startMs+(a.tick-c.start)*s.tickMs),'accepted');
  s.update(s.startMs+(c.end-c.start+1)*s.tickMs);assert.equal(s.phase,'trial');assert.deepEqual(state.best,{});
  s.update(s.startMs+(s.completionTick-c.start+1)*s.tickMs);assert.equal(s.phase,'complete');
  assert.equal(s.matched.size,s.events.length);assert.equal(JSON.stringify(f.pianoPackage.score),sourceBefore);
  assert.throws(()=>new PracticeSession(plan,c,state,true,undefined,c.end),/source obligation/);
 });
 test(`bounded whole-bar ${name} cannot release its piano hold at the display edge`,()=>{
  const plan=f.piano,c=chunk(plan),s=new PracticeSession(plan,c,initialPractice(plan),true);s.ready(0);
  for(const a of s.events)assert.equal(s.note(a.midi,s.startMs+(a.tick-c.start)*s.tickMs),'accepted');
  s.update(s.startMs+(c.end-c.start+1)*s.tickMs);const held=s.events.find(a=>a.owners.includes('held-bass'))!;
  s.release(held.midi,s.startMs+(c.end-c.start+1)*s.tickMs);assert.equal(s.phase,'error');assert.equal(s.failureReason,'A held note was released early.');
 });
 test(`bounded whole-bar ${name} enables manual Done only after the held source tail`,()=>{
  const plan=f.manual,c=chunk(plan),state=initialPractice(plan),s=new ManualPracticeSession(plan,c,state),before=JSON.stringify(f.manualPackage.score);
  assert.equal(s.completionTick,name==='section'?1008:1584);assert.ok(s.sourcePulseGrid.sourceExcerpt);s.ready(0);
  assert.equal(s.update(s.startMs+(c.end-c.start+1)*s.tickMs),undefined);assert.equal(s.phase,'trial');assert.equal(s.canDone,false);assert.equal(s.toggleDone(),undefined);
  assert.equal(s.update(s.startMs+s.durationMs+1),'completed');assert.equal(s.canDone,true);assert.equal(s.toggleDone()!.marked,true);
  assert.deepEqual(state.best,{});assert.equal(JSON.stringify(f.manualPackage.score),before);
 });
}

test('a bounded incoming whole-bar section keeps the preceding owner as preparation until its source release',()=>{
 const plan=connected.piano,c=plan.chunks[1],s=new PracticeSession(plan,c,initialPractice(plan),true);
 assert.equal(c.start,576);assert.equal(c.end,1152);assert.equal(s.completionTick,1584);assert.equal(s.carryIn.length,1);
 assert.ok(s.events.every(a=>!a.owners.includes('held-bass')));assert.throws(()=>s.ready(0),/earlier held notes/);
 s.ready(0,new Set(s.carryIn.map(a=>a.midi)));for(const a of s.events)assert.equal(s.note(a.midi,s.startMs+(a.tick-c.start)*s.tickMs),'accepted');
 s.update(s.startMs+(c.end-c.start+1)*s.tickMs);assert.equal(s.phase,'trial');s.release(s.carryIn[0].midi,s.startMs+(c.end-c.start+1)*s.tickMs);assert.equal(s.phase,'error');
 const manual=new ManualPracticeSession(connected.manual,connected.manual.chunks[1],initialPractice(connected.manual));assert.equal(manual.completionTick,1584);
});

test('legacy whole-bar clocks and bounded whole-bar sections without an outgoing hold remain strict',async()=>{
 for(const partition of ['fixed-four-v1','connection-boundary-v1'] as const){
  const plan=planPractice(ordinary.pianoPackage,partition),s=new PracticeSession(plan,plan.chunks[0],initialPractice(plan),true);
  assert.equal(s.completionTick,s.chunk.end);assert.equal(s.sourcePulseGrid.sourceExcerpt,undefined);assert.throws(()=>scorePulseGrid(plan,plan.barTicks,24,48),/bar clock/);
  const manual=await planManualPractice(ordinary.manualPackage,partition),m=new ManualPracticeSession(manual,manual.chunks[0],initialPractice(manual));
  assert.equal(m.completionTick,m.chunk.end);assert.equal(m.sourcePulseGrid.sourceExcerpt,undefined);
 }
 for(const [plan,session]of [[ordinary.piano,new PracticeSession(ordinary.piano,ordinary.piano.chunks[1],initialPractice(ordinary.piano),true)],
  [ordinary.manual,new ManualPracticeSession(ordinary.manual,ordinary.manual.chunks[1],initialPractice(ordinary.manual))]] as const){
  assert.equal(session.completionTick,plan.barTicks.at(-1));assert.equal(session.sourcePulseGrid.sourceExcerpt,undefined);
 }
});

test('manual initial and prepared repeat audio durations include a whole-bar section outgoing tail',async()=>{
 const plan=ordinary.manual,state=initialPractice(plan),s=new ManualPracticeSession(plan,plan.chunks[0],state),calls:{kind:string;duration:number;rate:number;grid:any}[]=[];
 const clock:ManualClock={now:()=>0,begin:async(rate,duration,_count,grid)=>{calls.push({kind:'begin',duration,rate,grid});return 0;},
  armRepeat:async(rate,duration,_plan,grid)=>{calls.push({kind:'repeat',duration,rate,grid});return undefined;},
  beginRepeat:async()=>{throw Error('Unexpected restart');},adoptRepeat:()=>{throw Error('Unexpected adoption');},cancelRepeat:async()=>{},stop:async()=>{},close:async()=>{}};
 const errors:string[]=[],transport=new ManualPracticeTransport(s,clock,()=>{},error=>errors.push(error));await transport.start();
 assert.deepEqual(calls.map(c=>c.kind),['begin','repeat']);for(const c of calls){assert.ok(c.grid.sourceExcerpt);assert.equal(c.duration,(1008-s.chunk.start)*scoreTickMs(plan,c.rate)+practiceTiming(c.rate,c.grid).countInMs);}
 assert.deepEqual(errors,[]);transport.close();
});
