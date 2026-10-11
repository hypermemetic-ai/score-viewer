import test from 'node:test';
import assert from 'node:assert/strict';
import {oversizedPracticeFixture} from './support/oversized-practice-fixture';
import {planManualPractice} from '../src/manual-practice-plan';
import {ManualPracticeSession} from '../src/manual-practice-session';
import {initialPractice,planPractice,practiceCatalogChunks,PracticeSession,ReadingSession,GroundworkSession} from '../src/practice';
import {practiceChunkRange} from '../src/practice-browser';
import {ManualPracticeTransport,type ManualClock} from '../src/manual-practice-transport';
import {practiceTiming} from '../src/practice-timing';
import {activePracticeClip} from '../src/practice-clip';
import {scorePulseGrid,scoreTickMs} from '../src/score-clock';

const {score,manual:manualPackage,piano:pianoPackage}=await oversizedPracticeFixture(),manual=await planManualPractice(manualPackage);
const piano=planPractice(pianoPackage);

for(const [assessment,plan]of [['piano',piano],['manual',manual]] as const)test(`${assessment} starts and completes every actual oversized-bar original and adjacent double`,()=>{
 const sourceBefore=JSON.stringify(score),state=initialPractice(plan),catalog=practiceCatalogChunks(plan),rows=catalog.filter(c=>c.kind!=='contrast');
 assert.ok(plan.chunks.length>1);assert.ok(rows.some(c=>c.kind==='connection'));
 for(const chunk of rows){
  assert.equal(practiceChunkRange(chunk),chunk.firstBar===chunk.lastBar?String(chunk.firstBar+1):`${chunk.firstBar+1} – ${chunk.lastBar+1}`);assert.ok(chunk.id.startsWith('section-')||chunk.id.startsWith('connection-'));
  const s=assessment==='piano'?new PracticeSession(piano,chunk,state,true):new ManualPracticeSession(manual,chunk,state);
  const obligations=assessment==='piano'?piano.attacks:manual.owners;
  const partial=!plan.barTicks.includes(chunk.start)||!plan.barTicks.includes(chunk.end),completion=partial?Math.max(chunk.end,...obligations.filter(a=>a.tick<chunk.end&&a.end>chunk.start).map(a=>a.end)):chunk.end;
  assert.equal(s.completionTick,completion);
  assert.equal(!!s.sourcePulseGrid.sourceExcerpt,partial,'Only actual intra-bar bounds need explicitly source-linked clocks');
  const grid=s.sourcePulseGrid,pulseTicks=(completion-chunk.start)/grid.barStartPulses.at(-1)!;
  if(partial){assert.equal(grid.sourceExcerpt!.startPulse*pulseTicks,chunk.start);assert.equal(grid.sourceExcerpt!.endPulse*pulseTicks,completion);}
  assert.equal(grid.scoreStartPhasePulses!*pulseTicks,chunk.start%1536);
  assert.equal(grid.barStartPulses.at(-1)!*60000/(s.bpm*grid.pulsesPerBeat),(completion-chunk.start)*scoreTickMs(plan,s.bpm));
  if(s instanceof PracticeSession){
   assert.ok(s.events.every(a=>a.tick>=chunk.start&&a.tick<chunk.end));
   if(s.carryIn.length)assert.throws(()=>s.ready(0),/earlier held notes/);
   s.ready(0,new Set(s.carryIn.map(a=>a.midi)));s.update(s.startMs);
   for(const attack of s.events)assert.equal(s.note(attack.midi,s.startMs+(attack.tick-chunk.start)*s.tickMs),'accepted');
   if(completion>chunk.end){s.update(s.startMs+(chunk.end-chunk.start)*s.tickMs);assert.equal(s.phase,'trial','A source hold does not release at the display cut');}
   s.update(s.startMs+(completion-chunk.start)*s.tickMs);assert.equal(s.phase,'complete');
  }else{
   s.ready(0);s.update(s.startMs);assert.equal(s.phase,'trial');
   assert.equal(s.update(s.startMs+s.durationMs),'completed');assert.equal(s.canDone,true);
   assert.equal(s.toggleDone()!.marked,true);assert.deepEqual(state.best,{});
  }
 }
 assert.equal(JSON.stringify(score),sourceBefore);
});

test('whole-bar session clocks keep strict ordinary admission and no excerpt flag',()=>{
 const whole=planPractice(pianoPackage,'fixed-four-v1');
 for(const [plan,session]of [[whole,new PracticeSession(whole,whole.chunks[0],initialPractice(whole),true)]] as const){
  assert.equal(session.sourcePulseGrid.sourceExcerpt,undefined);assert.throws(()=>scorePulseGrid(plan,plan.barTicks,24,48),/bar clock/);
 }
 const legacy=planManualPractice(manualPackage,'fixed-four-v1');
 return legacy.then(plan=>{const s=new ManualPracticeSession(plan,plan.chunks[0],initialPractice(plan));assert.equal(s.sourcePulseGrid.sourceExcerpt,undefined);});
});


test('Reading and groundwork retain only actual exercise attacks, with carry notes as separate preparation',()=>{
 for(const chunk of practiceCatalogChunks(piano).filter(c=>c.kind!=='contrast')){
  const expected=piano.attacks.filter(a=>a.tick>=chunk.start&&a.tick<chunk.end).map(a=>a.id).sort();
  const reading=new ReadingSession(piano,chunk),groundwork=new GroundworkSession(piano,chunk);
  for(const session of [reading,groundwork])assert.deepEqual([...new Set(session.steps.flatMap(s=>s.events.map(a=>a.id)))].sort(),expected);
  for(const step of reading.steps)for(const attack of step.events)assert.equal(reading.note(attack.midi),'accepted');
  assert.equal(reading.cycles,1);
  const clip=activePracticeClip(chunk,piano.barTicks);if(clip){assert.equal(clip.start,chunk.start);assert.equal(clip.end,chunk.end);}
 }
 const sourceChunk=piano.chunks.find(c=>piano.attacks.some(a=>a.tick<c.start&&a.end>c.start))!;assert.ok(sourceChunk);
 const clip={id:'selected-carry-source',start:sourceChunk.start,end:sourceChunk.end,firstBar:sourceChunk.firstBar,lastBar:sourceChunk.lastBar};
 const selected={...sourceChunk,kind:'contrast' as const,clipIndex:0,clips:[clip,clip]};
 const reading=new ReadingSession(piano,selected);
 assert.ok(reading.steps.every(s=>s.events.every(a=>a.tick>=clip.start&&a.tick<clip.end)));
 assert.equal(activePracticeClip(selected,piano.barTicks),clip);
 const physical=new PracticeSession(piano,sourceChunk,initialPractice(piano),true);
 assert.ok(physical.carryIn.length);physical.ready(0,new Set(physical.carryIn.map(a=>a.midi)));
 physical.release(physical.carryIn[0].midi,physical.startMs+1);assert.equal(physical.phase,'error');assert.equal(physical.failureReason,'A held note was released early.');
});

test('manual initial and prepared repeat audio durations include the literal held-source tail',async()=>{
 const state=initialPractice(manual),session=manual.chunks.map(c=>new ManualPracticeSession(manual,c,state)).find(s=>s.completionTick>s.chunk.end)!;assert.ok(session);
 const calls:{kind:string;duration:number;rate:number;grid:any}[]=[],errors:string[]=[];
 const clock:ManualClock={now:()=>0,begin:async(rate,duration,_count,grid)=>{calls.push({kind:'begin',duration,rate,grid});return 0;},armRepeat:async(rate,duration,_plan,grid)=>{calls.push({kind:'repeat',duration,rate,grid});return undefined;},beginRepeat:async()=>{throw Error('Unexpected restart');},adoptRepeat:()=>{throw Error('Unexpected adoption');},cancelRepeat:async()=>{},stop:async()=>{},close:async()=>{}};
 const transport=new ManualPracticeTransport(session,clock,()=>{},m=>errors.push(m));await transport.start();
 assert.deepEqual(calls.map(c=>c.kind),['begin','repeat']);
 for(const call of calls)assert.equal(call.duration,(session.completionTick-session.chunk.start)*scoreTickMs(manual,call.rate)+practiceTiming(call.rate,call.grid).countInMs);
 assert.deepEqual(errors,[]);transport.close();
});
