import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceFixture} from './support/reference-score';
import {planPractice,initialPractice,PracticeSession,GroundworkSession,practiceOrnament} from '../src/practice';
import type {ScorePackage} from '../src/package';

const base=await referenceFixture(new URL('../vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.isoscore',import.meta.url));
/** No. 14 with one written grace note, A3 (MIDI 57), before the B3 at tick 24. */
function withGrace(p:ScorePackage,tick=24,midi=57):ScorePackage {
 const q=structuredClone(p),host=q.score.notes.find(n=>n.startTick===tick)!;
 q.score.graceGroups=[{id:'grace',source:{file:'authored.ly',line:1,column:1,endLine:1,endColumn:2,bar:1},voice:'lh',staff:'lh',printedStaff:'lh',hand:'LH',kind:'grace',
  members:[{id:'grace-0',pitch:{octave:Math.floor(midi/12)-1,pitchClass:midi%12},spelling:'a',duration:'16',beamStart:false,beamEnd:false,line:1,column:1,endLine:1,endColumn:2}],
  hostEventId:host.id,hostKind:'note',occurrences:[{id:'grace:pass1',sourceBar:0,pass:1,tick,hostNoteIds:[host.id]}]}];
 return q;
}
const plain=planPractice(base,'connection-boundary-v1'),graced=withGrace(base),plan=planPractice(graced,'connection-boundary-v1');
const timed=(bpm=18)=>{const s={...initialPractice(plan),working:bpm,start:bpm},r=new PracticeSession(plan,plan.chunks[0],s,true);r.ready(0);return r;};
const at=(r:PracticeSession,tick:number)=>r.startMs+(tick-r.startTick)*r.tickMs;

test('a score with grace notes plans practice; graces are ornaments outside passage identity',()=>{
 assert.deepEqual(plan.ornaments,[{id:'grace:pass1',tick:24,midis:[57]}]);
 assert.deepEqual(plan.attacks,plain.attacks,'grace notes are not timed attacks');
 assert.deepEqual(plan.chunks.map(c=>c.pattern),plain.chunks.map(c=>c.pattern),'earned progress keys are unchanged');
 assert.equal(plain.ornaments,undefined,'scores without graces keep their exact plan shape');
 assert.equal(plan.chunks[0].start,0);assert.deepEqual(plan.attacks.slice(0,2).map(a=>[a.tick,a.midi]),[[0,55],[24,59]]);
});

test('timed practice accepts a played grace before its host and never requires one',()=>{
 const r=timed();
 assert.equal(r.note(55,at(r,0)),'accepted');
 assert.equal(r.note(57,at(r,20)),'ornament');assert.notEqual(r.phase,'error');assert.equal(r.matched.size,1);
 assert.equal(r.note(59,at(r,24)),'accepted');
 // On-the-beat execution: the grace may also come at the host's own time, until the host is played.
 const onBeat=timed();onBeat.note(55,at(onBeat,0));assert.equal(onBeat.note(57,at(onBeat,24)),'ornament');assert.equal(onBeat.note(59,at(onBeat,24)+80),'accepted');
 // Omitting the grace completes the passage as before.
 const omitted=timed();for(const a of omitted.events){omitted.note(a.midi,at(omitted,a.tick));omitted.update(at(omitted,a.tick));}
 omitted.update(at(omitted,omitted.completionTick));assert.equal(omitted.phase,'complete');
 // A grace played with its host still has to be followed by the host itself.
 const missed=timed();missed.note(55,at(missed,0));missed.note(57,at(missed,22));missed.update(at(missed,24)+501);assert.equal(missed.phase,'error');assert.equal(missed.failure?.midi,59);
});

test('a grace key after its host, or far from it, is a wrong note',()=>{
 const late=timed();late.note(55,at(late,0));late.note(59,at(late,24));
 assert.equal(late.note(57,at(late,30)),'failed');assert.equal(late.phase,'error');
 // A grace more than a beat ahead of the next onset still to play is not yet its ornament.
 const far=withGrace(base,plan.attacks.find(a=>a.tick>=plan.ticksPerBeat*2)!.tick,57),farPlan=planPractice(far,'connection-boundary-v1'),
  s={...initialPractice(farPlan),working:18,start:18},r=new PracticeSession(farPlan,farPlan.chunks[0],s,true);r.ready(0);
 assert.equal(r.note(57,r.startMs),'failed');
 assert.equal(practiceOrnament(farPlan,57,0,farPlan.chunks[0].end),undefined);
 assert.equal(practiceOrnament(farPlan,57,farPlan.ornaments![0].tick,farPlan.ornaments![0].tick),undefined,'outside the assessed onsets');
});

test('Reading accepts the grace within the current step without advancing',()=>{
 const w=new GroundworkSession(plan,plan.chunks[0]);assert.deepEqual(w.current.events.map(a=>a.midi),[55,59]);
 assert.equal(w.note(55),'accepted');assert.equal(w.note(57),'ornament');assert.equal(w.failure,undefined);assert.equal(w.matched.size,1);
 assert.equal(w.note(59),'accepted');assert.equal(w.index,1);
 const without=new GroundworkSession(plain,plain.chunks[0]);without.note(55);assert.equal(without.note(57),'failed');
});

test('a grace on its host’s own key is a second strike of that key, not a wrong note',()=>{
 const same=planPractice(withGrace(base,24,59),'connection-boundary-v1');
 assert.deepEqual(same.attacks,plain.attacks);
 const session=()=>{const s={...initialPractice(same),working:18,start:18},r=new PracticeSession(same,same.chunks[0],s,true);r.ready(0);return r;};
 const r=session();
 assert.equal(r.note(55,at(r,0)),'accepted');
 assert.equal(r.note(59,at(r,24)-60),'accepted','the grace strike sounds the host key');
 r.release(59,at(r,24)-30);assert.notEqual(r.phase,'error','releasing the grace is not releasing the host');
 assert.equal(r.note(59,at(r,24)),'ornament');assert.notEqual(r.phase,'error');
 for(const a of r.events.filter(a=>a.tick>24)){r.note(a.midi,at(r,a.tick));r.update(at(r,a.tick));}
 r.update(at(r,r.completionTick));assert.equal(r.phase,'complete');
 // Only one extra strike belongs to the grace; a third is a wrong note.
 const third=session();third.note(55,at(third,0));third.note(59,at(third,24)-60);third.note(59,at(third,24));
 assert.equal(third.note(59,at(third,24)+40),'failed');
 // Without the grace the host is struck once, as before.
 const once=session();for(const a of once.events){once.note(a.midi,at(once,a.tick));once.update(at(once,a.tick));}
 once.update(at(once,once.completionTick));assert.equal(once.phase,'complete');
 // Reading: the host step completes on the first strike, and the second strike is the ornament.
 const w=new GroundworkSession(same,same.chunks[0]);w.note(55);assert.equal(w.note(59),'accepted');assert.equal(w.index,1);
 assert.equal(w.note(59),'ornament');assert.equal(w.failure,undefined);assert.equal(w.index,1);
 assert.notEqual(w.current.events[0].midi,59);assert.equal(w.note(59),'failed','a third strike is a wrong note');
});
