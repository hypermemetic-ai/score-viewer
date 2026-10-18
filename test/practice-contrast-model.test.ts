import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {unzipSync,strFromU8} from 'fflate';
import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';
import {comparePracticeSections,practiceSimilarityPairs,type PracticeSimilaritySection} from '../src/practice-similarity';
import {practiceContrastEpisodes} from '../src/practice-contrast';
import {planPracticeSections} from '../src/practice-boundaries';

const no14=JSON.parse(strFromU8(unzipSync(readFileSync(new URL('../fixtures/schumann-op68-no14.tuna',import.meta.url)))['score.json'])) as QuantizedGridScore;
const original=(first:number,last:number):PracticeSimilaritySection=>({id:`${first}-${last}`,start:(first-1)*144,end:last*144,firstBar:first-1,lastBar:last-1});
const pitch=(n:number)=>({octave:Math.floor(n/12),pitchClass:n%12});
function example(count=24,shift=0){
 const size=count*24,score=structuredClone(no14);
 score.notes=Array.from({length:count*2},(_,i)=>({eventKind:'pitched' as const,id:`note-${i}`,startTick:i*24,durationTicks:24,pitch:pitch(48+i%count%12+(i>=count?shift:0)),hand:'RH' as const,voice:1}));
 score.totalTicks=size*2;score.ticksPerBeat=48;score.sourceBarTicks=Array.from({length:Math.ceil(score.totalTicks/144)+1},(_,i)=>Math.min(i*144,score.totalTicks));
 score.sourceBarTicks=[...new Set(score.sourceBarTicks)];score.timeSignatures=[{tick:0,numerator:6,denominator:8}];score.phrases=[];score.sourceSilences=[];score.barlines=[];score.tieChains=[];score.writtenPresentation=undefined;
 return {score,a:{id:'A',start:0,end:size},b:{id:'B',start:size,end:size*2}} as {score:QuantizedGridScore;a:PracticeSimilaritySection;b:PracticeSimilaritySection};
}
const setup=example;
function change(score:QuantizedGridScore,index:number,semitones=1){const n=score.notes[index];if(n.eventKind==='unpitched')throw Error('fixture pitch');n.pitch=pitch(n.pitch.octave*12+n.pitch.pitchClass+semitones);}
function episodes(score:QuantizedGridScore,a:PracticeSimilaritySection,b:PracticeSimilaritySection){return practiceContrastEpisodes(score,comparePracticeSections(score,a,b),{sourceIdentity:'fixture-source',profile:planPracticeSections(score)});}

test('18/24 admits one fixed transposition, excludes 100% and rejects 6/24',()=>{
 const {score,a,b}=setup(24,2);
 assert.equal(comparePracticeSections(score,a,b).qualifies,false);
 for(let i=42;i<48;i++)change(score,i);
 const pair=comparePracticeSections(score,a,b);
 assert.equal(pair.shift,2);assert.equal(pair.matches,18);assert.equal(pair.similarity,.75);assert.equal(pair.qualifies,true);
 assert.equal(new Set(pair.matchingNotes.map(m=>m.aId)).size,18);assert.equal(new Set(pair.matchingNotes.map(m=>m.bId)).size,18);
 for(let i=30;i<42;i++)change(score,i,3);
 assert.equal(comparePracticeSections(score,a,b).matches,12); // 12 changing notes share another shift, not six added to the old shift.
 assert.equal(comparePracticeSections(score,a,b).qualifies,false);
 const fixed=setup();for(let i=30;i<48;i++){const n=fixed.score.notes[i];if(n.eventKind!=='unpitched')n.pitch=pitch(80+i*i);}
 assert.equal(comparePracticeSections(fixed.score,fixed.a,fixed.b).matches,6);
});

test('duration and relative onset are exact; duplicate unisons cannot match one owner twice',()=>{
 const {score,a,b}=setup();score.notes[24].durationTicks=48;score.notes[25].startTick++;
 score.notes.push({...structuredClone(score.notes[26]),id:'extra-unison'});
 const pair=comparePracticeSections(score,a,b);
 assert.equal(pair.matches,22);assert.equal(pair.denominator,25);assert.equal(pair.similarity,22/25);
 assert.equal(pair.matchingNotes.filter(m=>m.relativeTick===48).length,1);
 assert.throws(()=>comparePracticeSections(score,a,{...b,id:a.id}),/distinct/);
 assert.throws(()=>practiceSimilarityPairs(score,[a,{...b,start:a.end-1}]),/overlap/);
});

test('shift ties are deterministic and input note ordering cannot change owner matching',()=>{
 const {score,a,b}=setup(1);const n=score.notes[1];if(n.eventKind==='unpitched')throw Error('fixture pitch');n.pitch=pitch(47);
 score.notes.push({...structuredClone(n),id:'higher',pitch:pitch(49)});
 const first=comparePracticeSections(score,a,b);assert.equal(first.shift,-1);
 score.notes.reverse();assert.deepEqual(comparePracticeSections(score,a,b),first);
 const empty={id:'empty',start:100,end:124};assert.equal(comparePracticeSections(score,a,empty).similarity,0);
});

test('No14 original occurrences: actual three candidate pairs, no false 9–12/13–16 near match',()=>{
 const sections=Array.from({length:16},(_,i)=>original(4*i+1,4*i+4));
 const pairs=practiceSimilarityPairs(no14,sections);
 assert.deepEqual(pairs.map(p=>[p.a.id,p.b.id,p.matches,p.denominator,p.shift]),[
  ['5-8','53-56',20,24,0],['13-16','29-32',19,24,0],['21-24','53-56',20,24,0],
 ]);
 assert.equal(comparePracticeSections(no14,original(1,4),original(17,20)).qualifies,false);
 assert.equal(comparePracticeSections(no14,original(9,12),original(13,16)).matches,6);
});

test('No14 one coincidental shared note keeps the full divergent ending and source pitches',()=>{
 const a=original(5,8),b=original(53,56),before=JSON.stringify(no14),entries=episodes(no14,a,b);
 assert.equal(entries.length,1);const entry=entries[0];
 assert.equal(entry.divergenceStart,456);assert.equal(entry.divergenceEnd,576);assert.equal(entry.reconvergenceStart,undefined);
 assert.deepEqual(entry.clips.map(c=>[c.start,c.end,c.cueOnsetCount,c.continuationOnsetCount]),[[a.start+144,a.end,13,5],[b.start+144,b.end,13,5]]);
 assert.equal(entry.clips[0].noteIds.length,18);assert.equal(entry.clips[1].noteIds.length,18);
 assert.equal(JSON.stringify(no14),before);assert.deepEqual(episodes(no14,a,b),entries);
});

test('No14 six fully shared onsets spanning a source pulse split later divergence into a second entry',()=>{
 const a=original(13,16),b=original(29,32),entries=episodes(no14,a,b);
 assert.equal(entries.length,2);
 assert.deepEqual(entries.map(e=>[e.divergenceStart,e.divergenceEnd,e.sharedTrunkStart,e.reconvergenceStart]),[[312,336,0,336],[480,576,336,undefined]]);
 assert.deepEqual(entries.map(e=>e.clips.map(c=>[c.start-(c.sectionId===a.id?a.start:b.start),c.end-(c.sectionId===a.id?a.start:b.start),c.cueOnsetCount,c.continuationOnsetCount])),[
  [[0,336,13,1],[0,336,13,1]],[[336,576,6,4],[336,576,6,4]],
 ]);
 assert.ok(entries[1].clips.every(c=>c.start>=((c.sectionId===a.id?a.start:b.start)+entries[1].sharedTrunkStart)));
 assert.notEqual(entries[0].id,entries[1].id);assert.notEqual(entries[0].clips[0].id,entries[0].clips[1].id);
});

test('a difference at the beginning has no invented cue; constant analysis shift does not edit either alternative',()=>{
 const {score,a,b}=setup(24,5);for(let i=24;i<30;i++)change(score,i);
 const entries=episodes(score,a,b);assert.equal(entries.length,1);
 assert.equal(entries[0].shift,5);assert.equal(entries[0].clips[0].start,a.start);assert.equal(entries[0].clips[1].start,b.start);
 assert.equal(entries[0].clips[0].cueOnsetCount,0);assert.equal(entries[0].clips[1].cueOnsetCount,0);
 assert.equal(entries[0].divergenceEnd,144);assert.equal(entries[0].clips[0].continuationOnsetCount,6);
 const n=score.notes[24];assert.ok(n.eventKind!=='unpitched');assert.deepEqual(n.pitch,pitch(54));
});

test('six rapid matched onsets shorter than a source pulse do not stop a branch',()=>{
 const {score,a,b}=setup(36);score.notes.forEach(n=>{n.startTick/=4;n.durationTicks/=4;});
 a.end/=4;b.start/=4;b.end/=4;score.totalTicks/=4;score.sourceBarTicks=[0,144,288,432];
 for(const i of [36,43,44,45,46,47,48,49,50])change(score,i);
 const entries=episodes(score,a,b);assert.equal(entries.length,1);assert.equal(entries[0].reconvergenceStart,90);
 // The six-note run at ticks6..36 spans36ticks; only the later21-note run qualifies.
});

test('clips retain incoming sustained/tied owners without manufacturing an attack',()=>{
 const {score,a,b}=setup();for(let i=42;i<48;i++)change(score,i);
 score.notes[0].durationTicks=576;score.notes[24].durationTicks=576;
 score.tieChains=[{noteId:score.notes[0].id,soundingTicks:576,voice:'1',components:[]}];
 const profile=planPracticeSections(score),entries=practiceContrastEpisodes(score,comparePracticeSections(score,a,b),{sourceIdentity:'held',profile:{onsets:profile.onsets,boundaries:[]}}),clip=entries[0].clips[0];
 assert.ok(clip.start>0);assert.deepEqual(clip.carryInNoteIds,['note-0']);assert.deepEqual(clip.tieNoteIds,['note-0']);
 assert.ok(!clip.noteIds.includes('note-0'));assert.equal(clip.carryOutNoteIds.length,0);
 assert.equal(score.notes[0].durationTicks,576);
});

test('reconvergence tests full chord multiplicity, rather than one matching voice',()=>{
 const {score,a,b}=setup();
 const added=score.notes.map(n=>{if(n.eventKind==='unpitched')throw Error('fixture pitch');return {...structuredClone(n),id:`chord:${n.id}`,pitch:pitch(n.pitch.octave*12+n.pitch.pitchClass+12)};});
 score.notes.push(...added);for(let i=24;i<31;i++)change(score,i);
 const entries=episodes(score,a,b);
 assert.equal(entries.length,1);assert.equal(entries[0].divergenceStart,0);assert.equal(entries[0].reconvergenceStart,168);
 assert.equal(entries[0].clips[0].continuationOnsetCount,7);assert.equal(entries[0].clips[0].noteIds.length,14);
});

test('a sustained obligation crossing reconvergence remains an explicit outgoing owner',()=>{
 const {score,a,b}=setup();for(let i=24;i<30;i++)change(score,i);
 score.notes[0].durationTicks=300;score.notes[24].durationTicks=300;
 score.tieChains=[{noteId:'note-0',soundingTicks:300,voice:'1',components:[]}];
 const clip=episodes(score,a,b)[0].clips[0];
 assert.equal(clip.end,144);assert.deepEqual(clip.carryOutNoteIds,['note-0']);assert.deepEqual(clip.tieNoteIds,['note-0']);
 assert.equal(score.notes[0].durationTicks,300);
});

test('a long branch is capped near 12–13 onset positions using the shared boundary chooser',()=>{
 const {score,a,b}=setup();for(let i=24;i<48;i+=4)change(score,i);
 const entries=episodes(score,a,b);assert.equal(entries.length,1);assert.equal(entries[0].divergenceEnd,576);
 for(const clip of entries[0].clips){assert.ok(clip.continuationOnsetCount>=12&&clip.continuationOnsetCount<=13);assert.ok(clip.end<(clip.sectionId==='A'?a.end:b.end));}
});

test('an extra attack retains asymmetric source counts and the other alternative’s real silence',()=>{
 const {score,a,b}=setup();score.notes.push({eventKind:'pitched',id:'extra',startTick:b.start+12,durationTicks:12,pitch:pitch(70)});
 const entry=episodes(score,a,b)[0];assert.equal(entry.divergenceStart,12);assert.equal(entry.reconvergenceStart,24);
 assert.deepEqual(entry.clips.map(c=>[c.start,c.end,c.onsetCount,c.continuationOnsetCount]),[[0,24,1,0],[576,600,2,1]]);
 assert.ok(entry.clips[1].noteIds.includes('extra'));assert.ok(!entry.clips[0].noteIds.includes('extra'));
});

test('unpitched originals remain valid but never acquire accidental semitone candidates',()=>{
 const {score,a,b}=setup();
 score.notes[24]={eventKind:'unpitched',id:'unpitched',startTick:b.start,durationTicks:24,soundingPitch:null,referencePitch:pitch(48),instrumentId:'drum'};
 assert.deepEqual(practiceSimilarityPairs(score,[a,b]),[]);assert.throws(()=>comparePracticeSections(score,a,b),/pitched/);
});

test('duplicate distant occurrences get independent pair and episode identities',()=>{
 const {score,a,b}=setup();for(let i=42;i<48;i++)change(score,i);
 const size=score.totalTicks;score.notes.push(...score.notes.filter(n=>n.startTick>=b.start).map(n=>({...structuredClone(n),id:`copy:${n.id}`,startTick:n.startTick+576})));
 score.totalTicks+=576;score.sourceBarTicks=Array.from({length:13},(_,i)=>i*144);
 const c={id:'C',start:size,end:score.totalTicks};const pairs=practiceSimilarityPairs(score,[a,b,c]);
 assert.equal(pairs.length,2);assert.deepEqual(pairs.map(p=>[p.a.id,p.b.id]),[['A','B'],['A','C']]);
 const profile=planPracticeSections(score),ids=pairs.flatMap(p=>practiceContrastEpisodes(score,p,{sourceIdentity:'copy',profile})).map(e=>e.id);
 assert.equal(new Set(ids).size,ids.length);
 assert.notEqual(practiceContrastEpisodes(score,pairs[0],{sourceIdentity:'copy',profile})[0].id,practiceContrastEpisodes(score,pairs[0],{sourceIdentity:'different-source',profile})[0].id);
});
