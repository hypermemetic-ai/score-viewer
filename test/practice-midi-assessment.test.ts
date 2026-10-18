import {referenceFixture} from './support/reference-score';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {importPackage} from '../src/package';
import {planPractice,initialPractice,PracticeSession,GroundworkSession,totalProgress} from '../src/practice';
import {PracticeDiagnostics} from '../src/practice-diagnostics';
import type {MidiNote} from '../src/midi';
const p=await referenceFixture(new URL('../vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.tuna',import.meta.url)),plan=planPractice(p);
test('recovered current package retains its exact all-five frozen-seat eligibility',()=>assert.equal(p.fingerEligibility.eligible,true,p.fingerEligibility.reason));
const trial=()=>{const state=initialPractice(plan);state.working=15;const session=new PracticeSession(plan,plan.chunks[0],state,true);session.ready(0);return session;};
test('literal No14 extra rebound after next7 explains0X without changing musical ownership',()=>{
 const s=trial(),first=s.events.slice(0,7);assert.deepEqual(first.map(a=>a.midi),[55,59,62,71,67,62,55]);
 for(const a of first)assert.equal(s.note(a.midi,s.startMs+(a.tick-s.startTick)*s.tickMs),'accepted');
 const reboundTime=s.startMs+(first.at(-1)!.tick-s.startTick)*s.tickMs+20;
 assert.equal(s.note(55,reboundTime),'failed');assert.equal(s.failure?.midi,60);assert.equal(s.failure?.bar,1);assert.equal(s.failureReason,'A different note was played.');assert.equal(s.message,'Paused');
 // Native suppression keeps this edge out of assessment; the next physical0 remains required.
 const guarded=trial();for(const a of guarded.events.slice(0,7))guarded.note(a.midi,guarded.startMs+(a.tick-guarded.startTick)*guarded.tickMs);
 const next=guarded.events[7];assert.equal(next.midi,60);assert.equal(guarded.note(next.midi,guarded.startMs+(next.tick-guarded.startTick)*guarded.tickMs),'accepted');assert.notEqual(guarded.phase,'error');
});
test('quiet expected keys count; quiet wrong or future keys never skip source attacks',()=>{
 const s=trial();assert.equal(s.note(59,s.startMs,1),'quiet-ignored');assert.equal(s.note(56,s.startMs,8),'quiet-ignored');assert.equal(s.matched.size,0);assert.equal(s.failure,undefined);
 assert.equal(s.note(55,s.startMs,1),'accepted');assert.equal(s.matched.size,1);assert.equal(s.note(59,s.startMs+24*s.tickMs,1),'accepted');assert.equal(s.matched.size,2);
 const loud=trial();assert.equal(loud.note(56,loud.startMs,9),'failed');assert.equal(loud.failure?.midi,55);
 const late=trial();assert.equal(late.note(55,late.startMs+501,1),'failed');assert.equal(late.failureReason,'A note was missed.');
 const missing=trial();missing.note(59,missing.startMs,1);missing.update(missing.startMs+501);assert.equal(missing.failure?.midi,55);
});
test('untimed quiet-stray rule accepts low first-note restarts and ordinary expected contacts',()=>{
 const w=new GroundworkSession(plan,plan.chunks[0]);assert.equal(w.note(59,1),'quiet-ignored');assert.equal(w.matched.size,0);assert.equal(w.failure,undefined);
 assert.equal(w.note(59,9),'failed');assert.equal((w as GroundworkSession).failure?.midi,55);assert.equal(w.note(55,1),'accepted');assert.equal(w.failure,undefined);assert.equal(w.matched.size,1);
 assert.equal(w.note(56,8),'quiet-ignored');assert.equal(w.matched.size,1);assert.equal(w.note(59,1),'accepted');assert.equal(w.index,1);
});
test('local error practice is ungraded and full-chunk restart keeps the chosen tempo',()=>{
 const s=trial();s.note(1,s.startMs,100);assert.equal(s.note(55,s.startMs,1),'inactive');assert.equal(s.state.working,15);s.ready(0);const first=s.events[0];assert.equal(s.note(1,s.startMs,1),'quiet-ignored');assert.equal(s.note(first.midi,s.startMs,1),'accepted');assert.equal(s.startTick,s.chunk.start);assert.equal(totalProgress(plan,s.state),0);
});
test('a quiet brush of an earlier first key does not restart partial untimed progress',()=>{
 const w=new GroundworkSession(plan,plan.chunks[0]);w.index=2;for(const a of w.current.events.slice(0,3))w.note(a.midi,80);const before=[...w.matched];assert.equal(w.note(55,8),'quiet-ignored');assert.equal(w.index,2);assert.deepEqual([...w.matched],before);assert.equal(w.failure,undefined);
 assert.equal(w.note(55,9),'accepted');assert.equal(w.matched.size,1);assert.equal(w.index,2);
});
test('private diagnostics retain only32 recent edges and3 failure snapshots, including guard decisions',()=>{
 const d=new PracticeDiagnostics(),a=plan.attacks[0];const e:MidiNote={source:'USB-MIDI',generation:1,channel:1,note:55,velocity:72,on:true,timestamp_micros:0,driver_micros:0};
 for(let i=0;i<40;i++)d.record({...e,timestamp_micros:i*1000},i===39?'guard-filtered':'accepted','trial',a,8000);
 for(let i=0;i<4;i++)d.failure(plan.revision,'1-4','A different note was played.',a);
 const saved=d.snapshot();assert.equal(saved.failures.length,3);assert.equal(saved.failures[0].events.length,32);assert.equal(saved.failures[0].events[0].timestampMicros,8000);assert.equal(saved.failures[0].events.at(-1)!.decision,'guard-filtered');assert.equal(saved.failures[0].events.at(-1)!.expected!.dueMs,8000);
 const restored=new PracticeDiagnostics(saved);assert.deepEqual(restored.snapshot(),saved);assert.equal(Object.keys(saved).length,2);
});
