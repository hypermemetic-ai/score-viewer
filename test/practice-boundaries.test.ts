import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {unzipSync,strFromU8} from 'fflate';
import {BOUNDED_PRACTICE_POLICY,distinctPracticeOnsets,estimatedPracticeSeconds} from '../src/practice-sizing';
import {planPracticeSections,choosePracticeExcerptBoundary,type PracticeSectionSource} from '../src/practice-boundaries';

function source(barCounts:number[],pitch:(index:number)=>number=i=>60+(i*7)%19):PracticeSectionSource {
 const bars=[0],notes:PracticeSectionSource['notes']=[];let index=0;
 for(const attacks of barCounts){const start=bars.at(-1)!;for(let a=0;a<attacks;a++){
  const midi=pitch(index),n={id:`n${index++}`,eventKind:'pitched',startTick:start+a*24,durationTicks:24,
   pitch:{octave:Math.floor(midi/12),pitchClass:midi%12},voice:1,hand:'RH'};
  notes.push(n as unknown as PracticeSectionSource['notes'][number]);
 }bars.push(start+Math.max(1,attacks)*24);}
 return {notes,sourceBarTicks:bars,totalTicks:bars.at(-1)!,ticksPerBeat:48,timeSignatures:[{tick:0,numerator:6,denominator:8}],barlines:[],phrases:[],sourceSilences:[]};
}
const counts=(s:PracticeSectionSource)=>planPracticeSections(s).sections.map(s=>s.onsetCount);

test('sizing counts intended onset positions, preserving source chords, hands and ties',()=>{
 const s=source([6]),extra=structuredClone(s.notes[0]);extra.id='simultaneous-left';extra.hand='LH';if(extra.eventKind==='pitched')extra.pitch.pitchClass=4;s.notes.push(extra);
 const held=s.notes[1];held.durationTicks=72;(s as any).tieChains=[{noteId:held.id,components:[{startTick:held.startTick,durationTicks:24},{startTick:held.startTick+24,durationTicks:48}]}];
 const before=JSON.stringify(s);assert.equal(distinctPracticeOnsets(s).length,6);assert.equal(s.notes.length,7);assert.equal(JSON.stringify(s),before);
 assert.equal(estimatedPracticeSeconds(24),4.8);assert.equal(BOUNDED_PRACTICE_POLICY.onsetsPerSecond,5);
});

test('ordinary No14 calibrates around four written bars without a fixed four-bar grid',()=>{
 const files=unzipSync(readFileSync(new URL('../vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.tuna',import.meta.url))),s=JSON.parse(strFromU8(files['score.json'])) as PracticeSectionSource;
 const p=planPracticeSections(s);assert.equal(p.sections.length,16);
 assert.equal(p.sections.filter(section=>section.onsetCount===24).length,15,JSON.stringify(p.sections.map(s=>[s.firstBar+1,s.lastBar+1,s.onsetCount])));
 assert.ok(p.sections.every((section,i)=>section.firstBar===4*i&&section.lastBar===4*i+3));
 assert.ok(p.sections.every(section=>section.onsetCount<=30));
 assert.deepEqual(planPracticeSections(s),p);assert.equal(p.sections[0].start,0);assert.equal(p.sections.at(-1)!.end,s.totalTicks);
});

test('weak musical evidence follows local onset workload at different bar densities',()=>{
 assert.deepEqual(counts(source(Array(12).fill(12))),[24,24,24,24,24,24]);
 assert.deepEqual(counts(source(Array(8).fill(3))),[24]);
 assert.deepEqual(counts(source(Array(8).fill(6))),[24,24]);
});

test('sparse sources keep their workload target across many empty written measures',()=>{
 const s=source(Array.from({length:2000},(_,i)=>i%20===0?1:0)),p=planPracticeSections(s);
 assert.equal(p.sections.length,4);assert.ok(p.sections.every(s=>s.onsetCount===25));
 assert.equal(p.sections.at(-1)!.end,s.totalTicks);
});

test('joint partition avoids an unnecessary tiny tail',()=>{
 const p=planPracticeSections(source(Array(9).fill(6)));assert.equal(p.sections.length,2);
 assert.deepEqual(p.sections.map(s=>s.onsetCount).sort((a,b)=>a-b),[24,30]);
});

test('a supported three-bar exception shifts the following sections locally',()=>{
 const s=source(Array(11).fill(6));s.barlines=[{barNumber:4,tick:s.sourceBarTicks![4],type:'double'},{barNumber:7,tick:s.sourceBarTicks![7],type:'double'}];
 const p=planPracticeSections(s);assert.deepEqual(p.sections.map(s=>s.lastBar-s.firstBar+1),[4,3,4]);
 assert.ok(p.sections[1].boundaryReasons.some(r=>r==='authored:double'));
});

test('busy measures subdivide at whole simultaneous attack positions',()=>{
 const s=source([51]);for(const n of [...s.notes]){const second=structuredClone(n);second.id+='-chord';if(second.eventKind==='pitched')second.pitch.pitchClass=(second.pitch.pitchClass+4)%12;s.notes.push(second);}
 const p=planPracticeSections(s);assert.equal(p.sections.length,2);assert.ok(p.sections.every(s=>s.onsetCount>=20&&s.onsetCount<=30));
 assert.equal(p.sections[0].end,p.sections[1].start);assert.ok(distinctPracticeOnsets(s).includes(p.sections[0].end));assert.equal(p.sections.reduce((a,s)=>a+s.onsetCount,0),51);
});

test('held and genuine technique obligations favor nearby safe source cuts',()=>{
 const s=source(Array(8).fill(6));s.notes.find(n=>n.startTick===s.sourceBarTicks![4]-24)!.durationTicks=48;
 const p=planPracticeSections(s,{protectedRelations:[{id:'hammer',startTick:s.sourceBarTicks![4]-24,endTick:s.sourceBarTicks![4]+24}]});
 assert.ok(p.boundaries.find(b=>b.tick===s.sourceBarTicks![4])!.obligations.some(r=>r==='relation:hammer'));
 assert.ok(p.sections[0].end!==s.sourceBarTicks![4]);assert.ok(p.sections[0].boundaryReasons.every(r=>!r.startsWith('retained:')));
});

test('rest evidence requires a genuine global gap and never follows spacers alone',()=>{
 const s=source(Array(8).fill(6)),cut=s.sourceBarTicks![4];s.notes=s.notes.filter(n=>n.startTick!==cut-24);
 const silence={kind:'rest',startTick:cut-24,durationTicks:48,voice:'melody',staff:'upper',file:'fixture',line:1,col:1,bar:4,occurrence:1} as const;
 s.sourceSilences=[silence];const rests=planPracticeSections(s);assert.ok(rests.boundaries.find(b=>b.tick===cut)!.reasons.includes('global-rest-gap'));
 const skip=structuredClone(s);skip.sourceSilences![0].kind='skip';assert.ok(!planPracticeSections(skip).boundaries.find(b=>b.tick===cut)!.reasons.includes('global-rest-gap'));
 const sounding=structuredClone(s),bass=structuredClone(sounding.notes[0]);bass.id='bass-hold';bass.startTick=cut-48;bass.durationTicks=96;bass.hand='LH';bass.voice=2;sounding.notes.push(bass);
 assert.ok(!planPracticeSections(sounding).boundaries.find(b=>b.tick===cut)!.reasons.includes('global-rest-gap'));
});

test('exact transposed pitch/timing patterns supply substantial start evidence',()=>{
 const s=source(Array(12).fill(6),i=>60+(i%24)*3%17+Math.floor(i/24)*2),p=planPracticeSections(s),a=p.boundaries.find(b=>b.tick===s.sourceBarTicks![4])!;
 assert.ok(a.components.recurrence>0);assert.ok(a.reasons.some(r=>r.startsWith('repeated-pattern:24-onsets')));
 const changed=structuredClone(s);for(const n of changed.notes.slice(24,48))n.durationTicks=12;
 assert.ok(!planPracticeSections(changed).boundaries.find(b=>b.tick===s.sourceBarTicks![4])!.reasons.some(r=>r.startsWith('repeated-pattern:24-onsets')));
});

test('overlapping tiny cells cannot accumulate unbounded pattern confidence',()=>{
 const p=planPracticeSections(source(Array(32).fill(6),()=>60));
 assert.ok(p.boundaries.every(b=>b.components.recurrence<=1.43+1e-9));
 assert.ok(p.boundaries.every(b=>b.reasons.filter(r=>r.startsWith('repeated-pattern:')).length<=8));
 assert.ok(p.sections.every(s=>s.onsetCount>=20&&s.onsetCount<=30));
});

test('a repeated shared prefix does not turn its divergent endpoint into a formal boundary',()=>{
 const s=source(Array(8).fill(6),i=>i<12||i>=24&&i<36?60+i%12:80+i%7),p=planPracticeSections(s);
 assert.equal(p.boundaries.find(b=>b.tick===s.sourceBarTicks![2])!.components.recurrence,0);
 assert.ok(!p.boundaries.find(b=>b.tick===s.sourceBarTicks![2])!.reasons.some(r=>r.includes('pattern-end')));
});

test('sustained texture change supports boundaries without calling ordinary chords cadences',()=>{
 const s=source(Array(8).fill(6),i=>i<24?60+i%3:84+i%3),p=planPracticeSections(s);
 const b=p.boundaries.find(b=>b.tick===s.sourceBarTicks![4])!;assert.ok(b.components.texture>0);assert.ok(!b.reasons.some(r=>r.includes('cadence')));
});

test('cue snapping targets half a section and respects genuine episode limits',()=>{
 const p=planPracticeSections(source(Array(8).fill(6))),anchor=p.sections[0].end;
 const cue=choosePracticeExcerptBoundary(p,{anchor,lower:0,upper:anchor,direction:'before'});assert.ok(cue>=0&&cue<anchor);
 const n=p.onsets.filter(t=>t>=cue&&t<anchor).length;assert.ok(n>=11&&n<=14);
 const clamped=choosePracticeExcerptBoundary(p,{anchor,lower:anchor-48,upper:anchor,direction:'before'});assert.ok(clamped>=anchor-48);
 const continuation=choosePracticeExcerptBoundary(p,{anchor,lower:anchor,upper:p.sections.at(-1)!.end,direction:'after'});assert.ok(continuation>anchor);
 assert.throws(()=>choosePracticeExcerptBoundary(p,{anchor,lower:anchor+1,upper:anchor+2,direction:'before'}),/bounds/);
});

test('excerpt-only onset cuts retain the same held obligations as ordinary bar cuts',()=>{
 const s=source(Array(4).fill(6));s.notes[0].durationTicks=300;const p=planPracticeSections(s);
 const onset=p.boundaries.find(b=>b.tick===120)!;assert.equal(onset.sectionCandidate,false);assert.ok(onset.obligations.some(r=>r.startsWith('held:')));
 assert.equal(choosePracticeExcerptBoundary(p,{anchor:0,lower:0,upper:144,direction:'after'}),144);
});
