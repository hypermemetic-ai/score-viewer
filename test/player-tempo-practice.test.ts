import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {importPackage,hashBytes} from '../src/package';
import {planPractice,initialPractice,readPractice,setPracticeGoal,progressFor,PracticeSession} from '../src/practice';
import {admitPracticeContext,practicePreferences,type PracticeViewContext} from '../src/practice-context';
import {PLAYER_TEMPO_REFERENCE,playerTempo,savedPlayerTempo,scoreBeatUnit} from '../src/player-tempo';
import {practiceOptionsMarkup} from '../src/practice-options-markup';
import {playerTempoNote} from '../src/practice-browser';
import {scoreTickMs} from '../src/score-clock';
import {speedNumber,snapPracticeSpeed} from '../src/tempo-presentation';
import {collectionId,practiceStorageName,type Entry} from '../src/state';
import {transferPracticeEdition} from '../src/practice-edition-transfer';
import {mergeEditionPractice} from '../src/practice-edition-install';
import {referenceFixture} from './support/reference-score';

// The same Schumann No. 14 source, without and with a reference tempo (dotted quarter = 180).
const url=new URL('../fixtures/schumann-op68-no14.tuna',import.meta.url),bytes=readFileSync(url);
const none=await importPackage(bytes,{allowLegacyTempo:true}),referenced=await referenceFixture(url);
const json=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const sha=(text:string)=>createHash('sha256').update(text).digest('hex');
const markup=(plan:ReturnType<typeof planPractice>,state:ReturnType<typeof initialPractice>,player?:boolean)=>practiceOptionsMarkup(plan.referencePerformanceTempo!,state,'<i>start</i>','<i>step</i>','<i>connection</i>',...(player===undefined?[]:[player]));

test('a score without a reference tempo still refuses practice until the player sets a tempo on its own beat',()=>{
 assert.equal(none.score.referencePerformanceTempo,undefined);
 assert.throws(()=>planPractice(none),/explicit reference performance tempo/);
 assert.throws(()=>admitPracticeContext(none,undefined),/explicit reference performance tempo/);
 assert.deepEqual(scoreBeatUnit(none.score),{numerator:3,denominator:8});
 assert.deepEqual(scoreBeatUnit({timeSignatures:[{numerator:3,denominator:4}]}),{numerator:1,denominator:4});
 assert.deepEqual(scoreBeatUnit({timeSignatures:[{numerator:3,denominator:8}]}),{numerator:1,denominator:8});
 assert.throws(()=>playerTempo(none.score,4),/5 to 500/);
 assert.equal(playerTempo(referenced.score,96),undefined);
 const tempo=playerTempo(none.score,96)!;
 assert.deepEqual(tempo,{version:'reference-performance-tempo-v1',bpm:96,beat:{numerator:3,denominator:8},provenance:{kind:'editorial',reference:PLAYER_TEMPO_REFERENCE}});
});

test('starting practice with a chosen tempo plans on it and remembers it as the journal goal',()=>{
 const admitted=admitPracticeContext(none,undefined,undefined,undefined,playerTempo(none.score,96));
 assert.equal(admitted.plan.playerTempo,true);assert.equal(admitted.saved,false);assert.equal(admitted.rememberTempo,true);
 assert.equal(admitted.plan.referencePerformanceTempo!.bpm,96);
 const s=admitted.state;
 assert.equal(s.target,96);assert.deepEqual(s.personalGoal,{version:'personal-performance-goal-v1',bpm:96,beat:{numerator:3,denominator:8}});
 assert.equal(s.start,snapPracticeSpeed(.3*96,96));assert.equal(s.working,s.start);assert.equal(s.connectionStart,snapPracticeSpeed(.5*96,96));
 assert.deepEqual(s.best,{});
 // A remembered journal tempo wins over any later choice and is not rewritten.
 const reopened=admitPracticeContext(none,json(s),undefined,undefined,playerTempo(none.score,150));
 assert.equal(reopened.plan.referencePerformanceTempo!.bpm,96);assert.equal(reopened.state.target,96);assert.equal(reopened.rememberTempo,undefined);assert.equal(reopened.saved,true);
 assert.equal(savedPlayerTempo(none.score,json(s))!.bpm,96);
 // Carried preferences (new keyboard or pitch context) keep the tempo without asking again.
 const context:PracticeViewContext={partition:admitted.plan.partition,composites:{},selected:admitted.plan.chunks[0].id,includeManual:true,preferences:practicePreferences(s)};
 const carried=admitPracticeContext(none,undefined,context);
 assert.equal(carried.state.target,96);assert.equal(carried.plan.referencePerformanceTempo!.bpm,96);
});

test('Fingers lays out a score without a tempo on a stand-in that is never the player\'s goal',()=>{
 const admitted=admitPracticeContext(none,undefined,undefined,undefined,undefined,true);
 assert.equal(admitted.plan.playerTempo,true);assert.equal(admitted.plan.referencePerformanceTempo!.bpm,80);
 assert.equal(admitted.rememberTempo,undefined);assert.equal(admitted.state.personalGoal,undefined);
 // Nothing a rebuilt view carries can make the stand-in a remembered tempo, so Sections still asks.
 const preferences=practicePreferences(admitted.state);assert.equal(savedPlayerTempo(none.score,json(admitted.state),preferences),undefined);
 const context:PracticeViewContext={partition:admitted.plan.partition,composites:{},selected:admitted.plan.chunks[0].id,includeManual:true,preferences,fingersOnly:true};
 assert.equal(admitPracticeContext(none,json(admitted.state),context).state.personalGoal,undefined);
 assert.throws(()=>admitPracticeContext(none,undefined,{...context,fingersOnly:undefined}),/explicit reference performance tempo/);
 // A remembered tempo is used as it is, and a chosen one is ignored.
 const remembered=admitPracticeContext(none,undefined,undefined,undefined,playerTempo(none.score,96)).state;
 const known=admitPracticeContext(none,json(remembered),undefined,undefined,playerTempo(none.score,150),true);
 assert.equal(known.plan.referencePerformanceTempo!.bpm,96);assert.equal(known.state.personalGoal!.bpm,96);
 assert.equal(admitPracticeContext(none,undefined,undefined,undefined,playerTempo(none.score,150),true).state.personalGoal,undefined);
});
test('a changed tempo persists, keeps earned evidence and moves Speed and progress with it',()=>{
 const {plan,state}=admitPracticeContext(none,undefined,undefined,undefined,playerTempo(none.score,96)),chunk=plan.chunks[0];
 state.working=48;state.best[chunk.pattern]=96;
 assert.equal(speedNumber(state.working,state.target),'50');
 assert.equal(progressFor(chunk,state),1);
 const faster=setPracticeGoal(state,plan,120);
 assert.equal(faster.target,120);assert.equal(faster.personalGoal!.bpm,120);assert.equal(faster.best[chunk.pattern],96);
 assert.equal(speedNumber(faster.working,faster.target),'40');
 assert.ok(progressFor(chunk,faster)<1,'reaching the earlier tempo is no longer 100% of the new one');
 const reopened=admitPracticeContext(none,json(faster));
 assert.equal(reopened.plan.referencePerformanceTempo!.bpm,120);assert.equal(reopened.state.target,120);assert.equal(reopened.state.best[chunk.pattern],96);assert.equal(reopened.state.working,48);
 assert.throws(()=>setPracticeGoal(faster,plan),/no reference tempo/);
 // A tempo counted on another beat is refused rather than reinterpreted.
 assert.throws(()=>admitPracticeContext(none,{...json(faster),personalGoal:{version:'personal-performance-goal-v1',bpm:120,beat:{numerator:1,denominator:4}}}),/different beat/);
});

test('Speed runs the clock on the player tempo beat exactly as a reference tempo on that beat would',()=>{
 const player=admitPracticeContext(none,undefined,undefined,undefined,playerTempo(none.score,180)),reference=admitPracticeContext(referenced,undefined);
 assert.equal(scoreTickMs(player.plan,54),scoreTickMs(reference.plan,54));
 const session=new PracticeSession(player.plan,player.plan.chunks[0],{...player.state,working:54},true),twin=new PracticeSession(reference.plan,reference.plan.chunks[0],{...reference.state,working:54},true);
 assert.equal(session.tickMs,twin.tickMs);
 assert.deepEqual(session.events.map(e=>[e.tick,e.midi]),twin.events.map(e=>[e.tick,e.midi]));
 assert.deepEqual(player.plan.chunks.map(c=>c.pattern),reference.plan.chunks.map(c=>c.pattern),'passages and evidence keys do not depend on the tempo');
});

test('Options and the progress summary name the player tempo, never a score reference',()=>{
 const {plan,state}=admitPracticeContext(none,undefined,undefined,undefined,playerTempo(none.score,96));
 const options=markup(plan,state,true);
 assert.match(options,/>Your tempo </);assert.match(options,/aria-label="Your tempo, dotted-quarter notes per minute"/);
 assert.match(options,/This score has no reference tempo\. Speeds, each success increase and progress are percentages of your tempo\./);
 assert.doesNotMatch(options,/Performance target|Score reference|data-use-reference|data-personal-goal-only/);
 const note=playerTempoNote(plan,state);
 assert.match(note,/^<span class="practice-player-tempo" data-player-tempo>Your tempo <span class="metronome-mark" aria-label="96 dotted-quarter notes per minute"/);
 assert.match(playerTempoNote(plan,{target:120},'small'),/^<small [^>]*>Your tempo .*aria-label="120 dotted-quarter notes per minute".*<\/small>$/);
});

test('scores with a reference tempo are unchanged by the player tempo path',()=>{
 const chosen=playerTempo(none.score,96)!,plain=admitPracticeContext(referenced,undefined),offered=admitPracticeContext(referenced,undefined,undefined,undefined,chosen);
 for(const admitted of [plain,offered]){
  assert.equal(admitted.plan.playerTempo,undefined);assert.equal(admitted.rememberTempo,undefined);assert.equal('playerTempo' in admitted.plan,false);
  assert.deepEqual(admitted.plan.referencePerformanceTempo,referenced.score.referencePerformanceTempo);
  assert.equal(admitted.state.target,180);assert.equal(admitted.state.personalGoal,undefined);
 }
 // Exact serialized bytes, key order included.
 assert.equal(JSON.stringify(offered.state),JSON.stringify(plain.state));assert.equal(JSON.stringify(offered.plan),JSON.stringify(plain.plan));
 assert.deepEqual(Object.keys(plain),['plan','state','saved']);
 assert.equal(JSON.stringify(planPractice(referenced,'bounded-exercises-v1',undefined,chosen)),JSON.stringify(planPractice(referenced)));
 assert.equal(JSON.stringify(initialPractice(planPractice(referenced,'bounded-exercises-v1',undefined,chosen))),JSON.stringify(initialPractice(planPractice(referenced))));
 // Golden digests captured from the code before the player tempo existed (ef47e38).
 assert.equal(sha(JSON.stringify(initialPractice(planPractice(referenced)))),'ecd0eab4aede925d3b38049bf29af0512468d2e83ed5db3feb75842ea2dbb890');
 assert.equal(sha(markup(plain.plan,plain.state)),'af6d12c32e9851b09853542ba327026ef5e46fe442d87666714f1d88c692c542');
 assert.equal(savedPlayerTempo(referenced.score,{personalGoal:{version:'personal-performance-goal-v1',bpm:96,beat:{numerator:3,denominator:8}}}),undefined);
 const options=markup(plain.plan,plain.state);
 assert.equal(markup(plain.plan,plain.state,false),options);
 assert.match(options,/>Performance target </);assert.match(options,/Score reference/);assert.match(options,/data-use-reference/);
 assert.match(options,/Speeds and each success increase are percentages of the tempo shown above\./);
 assert.equal(playerTempoNote(plain.plan,plain.state),'');
 // The personal goal and its reset keep their existing meaning.
 const goal=setPracticeGoal(plain.state,plain.plan,150);assert.equal(goal.target,150);assert.equal(setPracticeGoal(goal,plain.plan).target,180);
 assert.deepEqual(json(readPractice(json(goal),offered.plan)),json(readPractice(json(goal),plain.plan)));
});

test('an edition transfer or install merge keeps the remembered player tempo',()=>{
 const from=structuredClone(none);from.sourceScore=structuredClone(from.score);from.sourceSha256='a'.repeat(64);from.sourceRevision='a'.repeat(64);from.keyboardLayout='janko-four-row';
 const to=structuredClone(from);to.manifest.revision='b'.repeat(64);
 const {plan,state}=admitPracticeContext(from,undefined,undefined,undefined,playerTempo(from.score,96)),chunk=plan.chunks[0];
 const goal=setPracticeGoal(state,plan,120);goal.best[chunk.pattern]=60;
 const moved=transferPracticeEdition(from,json(goal),to);
 assert.equal(moved.target,120);assert.equal(moved.personalGoal!.bpm,120);assert.equal(moved.best[chunk.pattern],60);
 assert.equal(admitPracticeContext(to,json(moved)).plan.referencePerformanceTempo!.bpm,120);
 // An install merge plans on the target journal's tempo, else the incoming one.
 const untimed=json({...moved,personalGoal:undefined});
 assert.equal(mergeEditionPractice(json(moved),json(moved),to).target,120);
 const merged=mergeEditionPractice(untimed,json(moved),to);assert.equal(merged.target,120);assert.equal(merged.best[chunk.pattern],60);
 assert.throws(()=>mergeEditionPractice(untimed,untimed,to),/explicit reference performance tempo/);
});
