import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {importPackage} from '../src/package';
import {initialPractice,planPractice,readPractice,reconcilePassages,setPracticeGoal,PracticeSession} from '../src/practice';
import {admitPracticeContext,practicePreferences,practiceStateForContext,restorePracticeGrouping,PitchInputEpoch,type PracticeViewContext} from '../src/practice-context';
import {PracticeSlots} from '../src/practice-window';

test('a joined passage and Free view window survive a new pitch context without importing old evidence',async()=>{
 const original=await importPackage(readFileSync(new URL('../vendor/iso-notation/public/review/schumann-no14-janko-operator-reviewed-20261007.tuna',import.meta.url)),{keyboardLayout:'janko-four-row'}),oldPlan=planPractice(original,'fixed-four-v1'),old=initialPractice(oldPlan);
 for(const chunk of oldPlan.chunks.slice(0,3))old.best[chunk.pattern]=old.target;const joined=reconcilePassages(oldPlan,old).frontier.find(c=>c.components)!;
 const nextPackage={...original,manifest:{...original.manifest,revision:'a'.repeat(64)},score:{...original.score,notes:original.score.notes.map(n=>({...n,pitch:n.pitch.pitchClass===11?{octave:n.pitch.octave+1,pitchClass:0}:{...n.pitch,pitchClass:n.pitch.pitchClass+1}}))}},nextPlan=planPractice(nextPackage,'fixed-four-v1'),fresh=initialPractice(nextPlan),context:PracticeViewContext={partition:oldPlan.partition,composites:old.composites!,selected:joined.id,parent:joined.id,component:oldPlan.chunks[1].id,includeManual:false,passage:joined.id,window:[2,5]},before=structuredClone(old),restored=restorePracticeGrouping(nextPlan,fresh,context),chunk=reconcilePassages(nextPlan,restored).all.get(context.passage!)!;
 assert.equal(chunk.id,joined.id);assert.equal(chunk.firstBar,joined.firstBar);assert.equal(chunk.lastBar,joined.lastBar);assert.deepEqual(restored.best,{});assert.deepEqual(restored.workingByPattern,{});assert.equal(restored.manualAttainment,undefined);assert.deepEqual(old,before);
 const slots=new PracticeSlots(nextPlan,chunk);assert.equal(slots.showRange(...context.window!),true);assert.deepEqual(slots.bars,[2,3,4,5]);
 const session=new PracticeSession(nextPlan,chunk,restored,true),prior=new PracticeSession(oldPlan,joined,old,true);assert.deepEqual(session.events.map(a=>a.midi),prior.events.map(a=>a.midi+1));assert.equal(session.matched.size,0);assert.notEqual(session.chunk.pattern,prior.chunk.pattern);
});
test('fresh pitch keeps practice preferences without earned speed; retained settings take priority',async()=>{
 const p=await importPackage(readFileSync(new URL('../fixtures/authored-calculated-preparation-v2.isoscore',import.meta.url))),plan=planPractice(p),old=setPracticeGoal(initialPractice(plan),plan,150);
 Object.assign(old,{start:42,working:144,step:3,keepTempo:true,audioOutput:'chosen-output',best:{old:150},workingByPattern:{old:144},groundwork:{old:true}});
 const context:PracticeViewContext={partition:plan.partition,composites:{},selected:plan.chunks[0].id,includeManual:true,preferences:practicePreferences(old)},fresh=practiceStateForContext(plan,undefined,context);
 assert.equal(fresh.target,150);assert.equal(fresh.start,42);assert.equal(fresh.working,42);assert.equal(fresh.step,3);assert.equal(fresh.keepTempo,true);assert.equal(fresh.audioOutput,'chosen-output');assert.deepEqual(fresh.best,{});assert.deepEqual(fresh.workingByPattern,{});assert.deepEqual(fresh.groundwork,{});assert.equal(fresh.manualAttainment,undefined);
 const saved=initialPractice(plan);saved.start=17;saved.working=23;saved.keepTempo=false;
 const retained=practiceStateForContext(plan,saved,context);assert.equal(retained.start,17);assert.equal(retained.working,23);assert.equal(retained.keepTempo,false);assert.equal(retained.target,saved.target);
});
test('crossing retained and navigation trees preserve the retained journal rather than failing activation',async()=>{
 const p=await importPackage(readFileSync(new URL('../vendor/iso-notation/public/review/schumann-no14-janko-operator-reviewed-20261007.tuna',import.meta.url)),{keyboardLayout:'janko-four-row'}),plan=planPractice(p,'fixed-four-v1'),source=initialPractice(plan),target=initialPractice(plan);
 for(const chunk of plan.chunks.slice(0,2))source.best[chunk.pattern]=source.target;
 for(const chunk of plan.chunks.slice(1,3))target.best[chunk.pattern]=target.target;
 reconcilePassages(plan,source);reconcilePassages(plan,target);assert.ok(source.composites!['1-8']);assert.ok(target.composites!['5-12']);
 const before=structuredClone(target),context:PracticeViewContext={partition:plan.partition,composites:source.composites!,selected:'1-8',passage:'1-8',includeManual:true,preferences:practicePreferences(source)},admitted=admitPracticeContext(p,target,context);
 assert.deepEqual(target,before);assert.deepEqual(admitted.state,readPractice(before,plan));assert.equal(reconcilePassages(plan,admitted.state).all.has('1-8'),false);assert.equal(reconcilePassages(plan,admitted.state).all.has('5-12'),true);
 assert.throws(()=>admitPracticeContext(p,{...target,revision:'0'.repeat(64)},context),/saved evidence retained/);
 assert.throws(()=>admitPracticeContext(p,target,{...context,composites:{'1-8':['unknown','5-8']}}),/saved evidence retained/);
});
test('pending MIDI from an old pitch context is rejected while fresh input remains available',()=>{
 const epoch=new PitchInputEpoch();assert.equal(epoch.accepts({timestamp_micros:5}),true);epoch.block();assert.equal(epoch.accepts({timestamp_micros:1000}),false);epoch.reset(1000);assert.equal(epoch.accepts({timestamp_micros:999}),false);assert.equal(epoch.accepts({timestamp_micros:1000}),true);assert.equal(epoch.accepts({timestamp_micros:1001}),true);assert.equal(epoch.accepts({}),false);assert.throws(()=>epoch.reset(NaN),/clock/);
});
