import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceFixture} from './support/reference-score';
import {planPractice,initialPractice,PracticeSession,practicePartition,readPractice} from '../src/practice';
import {planPerformance,PerformanceSession,readPerformance} from '../src/performance';
import {scorePulseGrid,scoreTickMs,validatePulseGrid} from '../src/score-clock';
import {practiceTiming,pulseAt} from '../src/practice-timing';
import {PracticeClock} from '../src/practice-clock';
import {host,practiceAudio} from '../src/host';
const base=await referenceFixture(new URL('../vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.isoscore',import.meta.url));
/** Small public behavior fixture, not an encoding of the private Zelda score. */
function score(bars=12){const p=structuredClone(base);p.score.id='universal-piano-fixture';p.score.referencePerformanceTempo={version:'reference-performance-tempo-v1',bpm:104,beat:{numerator:1,denominator:4},provenance:{kind:'editorial',reference:'Public clock regression fixture'}};p.score.timeSignatures=[{tick:0,numerator:3,denominator:4}];p.score.sourceBarTicks=Array.from({length:bars+1},(_,i)=>i*144);p.score.totalTicks=bars*144;delete p.score.writtenPresentation;delete p.score.tieChains;p.score.phrases=[];p.score.notes=Array.from({length:bars},(_,i)=>({...base.score.notes[0],id:`source-${i}`,startTick:i*144,durationTicks:48,voice:1}));return p;}
test('score facts admit quarter and rational beats without a score-ID whitelist',()=>{
 const p=score(),plan=planPractice(p),state=initialPractice(plan);state.working=104;
 assert.equal(scoreTickMs(plan,104)*48,60000/104);
 assert.equal(new PracticeSession(plan,plan.chunks[0],state,false).tickMs,scoreTickMs(plan,104));
 const performance=planPerformance(p);assert.equal(new PerformanceSession(performance,104,0).tickMs,scoreTickMs(plan,104));
 p.score.referencePerformanceTempo!.beat={numerator:1,denominator:2};assert.equal(scoreTickMs(planPractice(p),104)*96,60000/104);
 p.score.referencePerformanceTempo!.beat={numerator:1,denominator:3};assert.equal(scoreTickMs(planPractice(p),104)*64,60000/104);
 delete p.score.referencePerformanceTempo;assert.throws(()=>planPractice(p),/explicit reference/);
});
test('simple meter count-in ends at the real score downbeat, not the next fictitious six-pulse bar',()=>{
 const p=score(),plan=planPractice(p),grid=scorePulseGrid(plan,plan.barTicks),timing=practiceTiming(104,grid);
 assert.equal(grid.pulsesPerBeat,2);assert.equal(timing.countInMs,2*60000/104);
 assert.equal(pulseAt(0,timing.eighthMs,0,grid).frequency,1200);
 assert.equal(pulseAt(2,timing.eighthMs,0,grid).frequency,900);
 assert.equal(pulseAt(4,timing.eighthMs,0,grid).frequency,1200);
 assert.equal(pulseAt(6,timing.eighthMs,0,grid).frequency,900);
 assert.equal(pulseAt(10,timing.eighthMs,0,grid).frequency,1200);
});
test('actual pickup and meter-change bar clocks determine accents without changing goal beats',()=>{
 const p=score(),source={...planPractice(p),timeSignatures:[{tick:0,numerator:3,denominator:4},{tick:192,numerator:2,denominator:4}]},grid=scorePulseGrid(source,[0,48,192,288]),t=practiceTiming(60,grid);
 assert.deepEqual(grid.barStartPulses,[0,2,8,12]);
 for(const pulse of [4,6,12,16])assert.equal(pulseAt(pulse,t.eighthMs,0,grid).frequency,1200);
 assert.equal(pulseAt(8,t.eighthMs,0,grid).frequency,900);
 assert.throws(()=>validatePulseGrid({...grid,barStartPulses:[0,2,2]}),/grid/);
 assert.throws(()=>scorePulseGrid(source,[0,.1,288]),/rational/);
});
test('bounded cuts protect actual holds and short explicit phrases; long slurs and pitch likeness do not aggregate',()=>{
 const p=score();p.score.notes[3].durationTicks=192;
 const held=planPractice(p);assert.equal(held.chunks[0].id,'1-5');assert.equal(held.attacks.length,12);assert.equal(held.attacks[3].end,624);
 p.score.notes[3].durationTicks=48;p.score.phrases=[{id:'short',startTick:480,endTick:600,fromNoteIds:['source-3'],toNoteIds:['source-4'],voice:1,kind:'slur',origin:'source',endOrigin:'source'} as any];
 assert.equal(planPractice(p).chunks[0].id,'1-5');
 p.score.phrases[0].startTick=0;p.score.phrases[0].endTick=p.score.totalTicks;assert.equal(planPractice(p).chunks[0].id,'1-4');
});
test('unavoidable long hold retains bounded groups and the same source action, not a fictitious attack',()=>{
 const p=score();p.score.notes[0].durationTicks=p.score.totalTicks;
 const plan=planPractice(p);assert.deepEqual(plan.chunks.map(c=>c.id),['1-4','5-8','9-12']);assert.equal(plan.attacks.length,12);
 assert.ok(plan.chunks[0].boundaryReasons?.includes('held:0:43'));
 assert.ok(plan.chunks[1].pattern.includes('carry'));
});
test('carry setup keeps the original owner and onset, is not a matched attack, and its release is assessed',()=>{
 const p=score();p.score.notes[0].durationTicks=p.score.totalTicks;p.score.notes[0].pitch={...p.score.notes[0].pitch,octave:5};p.score.notes[0].hand='RH';const plan=planPractice(p),state=initialPractice(plan);state.working=104;
 const session=new PracticeSession(plan,plan.chunks[1],state,true),held=plan.attacks[0];
 assert.deepEqual(session.carryIn.map(a=>a.id),[held.id]);assert.equal(session.events.length,4);
 assert.throws(()=>session.ready(0),/earlier held/);assert.equal(session.phase,'ready');
 session.ready(0,new Set([held.midi]));assert.equal(session.matched.size,0);assert.ok(session.visibleGroups().has(held.groups[0]));
 session.release(held.midi,session.startMs+1);assert.equal(session.phase,'error');assert.equal(session.failure?.id,held.id);
 const run=new PracticeSession(plan,plan.chunks[1],state,true);run.ready(0,new Set([held.midi]));for(const a of run.events)run.note(a.midi,run.startMs+(a.tick-run.startTick)*run.tickMs);run.update(run.startMs+(run.chunk.end-run.startTick)*run.tickMs);assert.equal(run.phase,'complete');assert.equal(run.matched.size,4);assert.equal(held.tick,0);
 const manual=new PracticeSession(plan,plan.chunks[1],state,false);assert.throws(()=>manual.ready(0),/earlier held/);manual.ready(0,new Set(),true);manual.update(manual.startMs+(manual.chunk.end-manual.startTick)*manual.tickMs);assert.equal(manual.phase,'complete');assert.equal(manual.matched.size,0);
});
test('carry release obligation ends at its actual source end inside the selected passage',()=>{
 const p=score();p.score.notes[0].durationTicks=1008;p.score.notes[0].pitch={...p.score.notes[0].pitch,octave:5};const plan=planPractice(p),state=initialPractice(plan),run=new PracticeSession(plan,plan.chunks[1],state,true),held=run.carryIn[0];state.working=104;
 run.ready(0,new Set([held.midi]));run.update(run.startMs);run.release(held.midi,run.startMs+(held.end-run.startTick)*run.tickMs);assert.notEqual(run.phase,'error');assert.equal(held.end,1008);
});
test('a held final-bar tie keeps the final five-bar passage together; legacy fixed-four evidence stays pinned',()=>{
 const p=score(25);p.score.notes[23].durationTicks=288;
 const fresh=planPractice(p);assert.equal(fresh.chunks.at(-1)?.id,'21-25');
 const oldPlan=planPractice(p,'fixed-four-v1'),old=initialPractice(oldPlan);delete old.partition;old.best[oldPlan.chunks[0].pattern]=90;old.working=90;
 const bytes=JSON.stringify(old);assert.equal(practicePartition(old),'fixed-four-v1');assert.deepEqual(readPractice(old,oldPlan).best,old.best);assert.equal(JSON.stringify(old),bytes);
 assert.throws(()=>readPractice(old,fresh),/partition.*retained/);assert.equal(oldPlan.chunks.at(-1)?.id,'25-25');
});

test('saved clock beat cannot be reinterpreted when a detached reference unit changes',()=>{const p=score(),plan=planPractice(p),state=initialPractice(plan);state.best[plan.chunks[0].pattern]=104;const before=JSON.stringify(state);p.score.referencePerformanceTempo!.beat={numerator:3,denominator:8};assert.throws(()=>readPractice(state,planPractice(p)),/clock beat.*retained/);assert.equal(JSON.stringify(state),before);const legacy=initialPractice(plan);delete legacy.referenceBeat;assert.throws(()=>readPractice(legacy,plan),/clock beat.*retained/);});

test('Performance records pin the same rational clock unit and retain rejected old evidence',()=>{const p=score(),reference=p.score.referencePerformanceTempo!,records=readPerformance(null,p.manifest.revision,reference),before=JSON.stringify(records);assert.deepEqual(records.referenceBeat,reference.beat);assert.throws(()=>readPerformance(records,p.manifest.revision,{...reference,beat:{numerator:3,denominator:8}}),/clock beat.*retained/);assert.equal(JSON.stringify(records),before);});
test('native clock transports the genuine simple-meter grid and refuses mismatched count phase before output',async t=>{
 const original={begin:practiceAudio.begin,onError:practiceAudio.onError,midiClock:host.midiClock};t.after(()=>Object.assign(practiceAudio,{begin:original.begin,onError:original.onError}));t.after(()=>{host.midiClock=original.midiClock;});
 const calls:unknown[][]=[];practiceAudio.begin=async(...args)=>{calls.push(args);return 10_150_000;};practiceAudio.onError=async()=>()=>{};host.midiClock=async()=>10_000_000;
 const plan=planPractice(score()),grid=scorePulseGrid(plan,plan.barTicks),clock=new PracticeClock(true);
 await assert.rejects(clock.begin(104,5000,false,grid),/count-in differs/);assert.equal(calls.length,0);
 assert.equal(await clock.begin(104,5000,true,grid),10150);assert.deepEqual(calls[0][5],grid);assert.equal(calls[0][3],practiceTiming(104,grid).countStepMs);await clock.stop();
});
test('Performance follows source-linked repeat/ending note occurrences rather than duplicating bars by guess',()=>{
 const p=score(3);p.score.writtenPresentation={sourceScoreId:p.score.id,sourceHash:'fixture',writtenBars:3,performedBars:4,performedTotalTicks:576,repeats:[],occurrences:[1,2,1,3].map((writtenBar,i)=>({performedBar:i+1,writtenBar,pass:i<2?1:2,performedTick:i*144,writtenTick:(writtenBar-1)*144})),events:{notes:[0,1,0,2].map((writtenIndex,i)=>({writtenIndex,performedIndex:i,overrides:{id:`performed-owner-${i}`,startTick:i*144}}))}};
 const before=JSON.stringify(p.score),plan=planPerformance(p);assert.deepEqual(plan.events.map(a=>a.tick),[0,144,288,432]);assert.deepEqual(plan.events.map(a=>a.owners),[['source-0'],['source-1'],['source-0'],['source-2']]);assert.deepEqual(plan.events.map(a=>a.performedOwners),[['performed-owner-0'],['performed-owner-1'],['performed-owner-2'],['performed-owner-3']]);assert.equal(JSON.stringify(p.score),before);
 p.score.writtenPresentation.events.notes[3].overrides.pitch={octave:8,pitchClass:1};assert.throws(()=>planPerformance(p),/explicit written owner/);
 delete p.score.writtenPresentation.events.notes;assert.throws(()=>planPerformance(p),/source-linked note occurrences/);
});
