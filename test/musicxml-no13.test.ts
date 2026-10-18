import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareMusicXmlScore} from '../src/musicxml-import';
import {importPackage,selectPresentation,type ScorePackage} from '../src/package';
import {planPractice,initialPractice,PracticeSession} from '../src/practice';
import {ensurePianoReady} from '../src/piano-readiness';
import {PackageAdmissionSession} from '../src/package-admission-session';
import {adoptImportedReading} from '../src/personal-presentation';

const root=new URL('../',import.meta.url);
const assets={font:{name:'fonts/URWGothic-Demi.otf',bytes:readFileSync(new URL('src/URWGothic-Demi.otf',root))},
 notices:Object.fromEntries(['URW-base35-COPYING','URW-base35-LICENSE','URW-base35-provenance.md'].map(name=>
  ['licenses/'+name,readFileSync(new URL('licenses/'+name,root))]))};
/** No. 13 prints only "Nicht schnell"; this stand-in tempo exists for the test alone. */
const standIn={version:'reference-performance-tempo-v1' as const,bpm:72,beat:{numerator:1,denominator:4},
 provenance:{kind:'editorial' as const,reference:'Test-only stand-in; the score prints no numeric tempo.'}};
const midi=(p:{octave:number;pitchClass:number})=>p.octave*12+p.pitchClass+12;

// One test on purpose: the full engraving takes about 45 s and is shared by every check below.
test('Schumann Op. 68 No. 13 imports from MusicXML, opens on both keyboards and practises around its grace notes',{timeout:20*60_000},async()=>{
 const stages=new Set<string>();
 const prepared=await prepareMusicXmlScore(readFileSync(new URL('vendor/iso-notation/src/scores/schumann-op68-no13.musicxml',root)),assets,{onCheckpoint:stage=>stages.add(stage)});
 assert.ok(stages.size>0,'the engraving reports its progress');
 // Hand editing takes the import's reading engrave as its own, so the first
 // hand choice engraves nothing again.
 const opened=await ensurePianoReady({packageBytes:prepared.bytes,layout:'conventional-piano',signal:new AbortController().signal},new PackageAdmissionSession());
 assert.ok('package' in opened);assert.equal(await adoptImportedReading(opened.package,prepared.reading),true);
 const all=await importPackage(prepared.bytes,{allowLegacyTempo:true});
 assert.deepEqual([...all.availablePresentations??[]].sort(),['conventional-piano','janko-four-row']);
 for(const layout of ['conventional-piano','janko-four-row'] as const){
  const p=await selectPresentation(all,layout);
  assert.equal(p.pages.length,5,layout);assert.equal(p.score.notes.length,778,layout);
  // Hands come from the printed staves: one hand per staff, nothing inferred.
  const byStaff=new Map<string,Set<string>>();
  for(const n of p.score.notes){assert.ok(n.hand,`${n.id} has a hand`);assert.match(n.handInference?.evidence??'',/^Printed staff/,`${n.id} hand comes from its staff`);
   const set=byStaff.get(n.staffId??'')??new Set();set.add(n.hand!);byStaff.set(n.staffId??'',set);}
  assert.deepEqual([...byStaff.values()].map(s=>[...s]).sort(),[['LH'],['RH']]);
  assert.deepEqual([p.score.notes.filter(n=>n.hand==='RH').length,p.score.notes.filter(n=>n.hand==='LH').length],[456,322]);
 }
 const p=await selectPresentation(all,'janko-four-row'),graces=p.score.graceGroups??[];
 assert.equal(graces.length,16,'every written grace group is kept');
 assert.throws(()=>planPractice(p),/explicit reference performance tempo/,'without a tempo practice asks for one, not for grace removal');

 // With a tempo the plan keeps graces as ornaments outside the timed attacks.
 const tempo=(q:ScorePackage):ScorePackage=>({...q,score:{...q.score,referencePerformanceTempo:standIn}});
 const plan=planPractice(tempo(p)),plain=planPractice(tempo({...p,score:{...p.score,graceGroups:[]}}));
 assert.equal(plan.ornaments?.length,graces.flatMap(g=>g.occurrences).length);
 assert.deepEqual(plan.attacks,plain.attacks,'grace notes are not timed attacks');
 assert.deepEqual(plan.chunks.map(c=>c.pattern),plain.chunks.map(c=>c.pattern),'passage identity ignores graces');
 for(const o of plan.ornaments!){const g=graces.find(g=>g.occurrences.some(x=>x.id===o.id))!;assert.deepEqual(o.midis,[...new Set(g.members.map(m=>midi(m.pitch!)))].sort((a,b)=>a-b));}

 // Play the first passage that holds a grace, with each grace just before its host: it completes.
 const chunk=plan.chunks.find(c=>plan.ornaments!.some(o=>o.tick>=c.start&&o.tick<c.end))!,
  bpm=initialPractice(plan).target,r=new PracticeSession(plan,chunk,{...initialPractice(plan),working:bpm,start:bpm},true);
 r.ready(0);const at=(tick:number)=>r.startMs+(tick-r.startTick)*r.tickMs;
 const ornaments=plan.ornaments!.filter(o=>o.tick>=chunk.start&&o.tick<chunk.end),played=new Set<string>();let accepted=0;
 for(const a of r.events){
  for(const o of ornaments)if(!played.has(o.id)&&o.tick===a.tick){played.add(o.id);assert.equal(r.note(o.midis[0],at(a.tick)-40),'ornament');accepted++;}
  r.note(a.midi,at(a.tick));r.update(at(a.tick));
 }
 r.update(at(r.completionTick));
 assert.ok(accepted>0);assert.equal(r.phase,'complete',r.failureReason);
});
