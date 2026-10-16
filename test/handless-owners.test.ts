import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {strToU8} from 'fflate';
import {prepareMusicXmlScore} from '../src/musicxml-import';
import {importPackage,type ScorePackage} from '../src/package';
import {PersonalPresentationSession} from '../src/personal-presentation';
import {PersonalPreparationPool} from '../src/personal-preparation-pool';
import {HandPresentationError} from '../vendor/iso-notation/src/score-presentation';
import {initialPersonal} from '../src/state';
import {assigned,effectiveAssignments,handChoiceOwners,handFor,personalPracticePackage,readPersonalAssignments} from '../src/personal-assignments';
import {ensurePianoReady} from '../src/piano-readiness';
import {planSource,requirePracticeHands} from '../src/practice';
import {createScoreTransposition} from '../src/score-transposition';

const xml=readFileSync(new URL('./fixtures/musicxml/two-staff-piano.musicxml',import.meta.url),'utf8');
const assets={font:{name:'fonts/URWGothic-Demi.otf',bytes:readFileSync(new URL('../src/URWGothic-Demi.otf',import.meta.url))},
 notices:Object.fromEntries(['URW-base35-COPYING','URW-base35-LICENSE','URW-base35-provenance.md'].map(name=>
  ['licenses/'+name,readFileSync(new URL('../licenses/'+name,import.meta.url))]))};
// The two-staff study written on one treble staff: the source gives no hand.
const oneStaff=xml.replace('<staves>2</staves>','').replace(/<clef number="2">.*?<\/clef>/,'').replaceAll('<staff>2</staff>','<staff>1</staff>').replace('<clef number="1">','<clef>');
// One staff, two voices in unison on C4; "m.d." marks voice 1 only (as ISO's own case).
const note=(step:string,voice:string)=>`<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>4</duration><voice>${voice}</voice><type>half</type></note>`;
const mixedKey=`<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>Unison</work-title></work>
<part-list><score-part id="P1"><part-name>Piano</part-name><score-instrument id="P1-I1"><instrument-name>Piano</instrument-name></score-instrument><midi-instrument id="P1-I1"><midi-program>1</midi-program></midi-instrument></score-part></part-list>
<part id="P1"><measure number="1"><attributes><divisions>2</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
<direction placement="below"><direction-type><words>m.d.</words></direction-type><voice>1</voice><staff>1</staff></direction>
${note('C','1')}${note('E','1')}<backup><duration>8</duration></backup>${note('C','2')}${note('G','2')}<barline location="right"><bar-style>light-heavy</bar-style></barline></measure></part></score-partwise>`;
const open=async(text:string)=>importPackage((await prepareMusicXmlScore(strToU8(text),assets)).bytes,{allowLegacyTempo:true});
const seatOf=(p:ScorePackage,id:string)=>p.seats.find(s=>s.ownerIds.includes(id))!;

test('a one-staff piano part opens hand-less: no hand is defaulted or calculated',async()=>{
 const p=await open(oneStaff),s=initialPersonal(p);
 assert.ok(p.score.notes.length>0);
 for(const n of p.score.notes){assert.equal(n.hand,undefined);assert.equal(handFor(p,s,n.id),null);}
 assert.ok(effectiveAssignments(p,s).every(a=>a.hand===null));
 const session=new PersonalPresentationSession(p);await session.warm();
 assert.equal(await session.project(s),p,'The reader shows the source pages unchanged.');
 assert.equal(personalPracticePackage(p,s),p);
});

test('a hand the player gives one key applies there; the other notes stay hand-less',async()=>{
 const p=await open(oneStaff),first=p.seats[0],s=assigned(p,initialPersonal(p),first,{hand:'RH'});
 const chosen=new Set(first.ownerIds);
 for(const a of effectiveAssignments(p,s))assert.equal(a.hand,chosen.has(a.id)?'RH':null);
 for(const id of chosen)assert.deepEqual(s.assignments!.choices[id].original,{hand:null});
 // The stored ledger round-trips: null records that the source gave no hand.
 assert.deepEqual(readPersonalAssignments(JSON.parse(JSON.stringify(s.assignments)),p),s.assignments);
 const view=await new PersonalPresentationSession(p).project(s),hands=new Map(view.annotationGeometry!.seats.map(g=>[g.seatId,g.hand]));
 for(const seat of view.seats)assert.equal(hands.get(seat.id),seat.ownerIds.some(id=>chosen.has(id))?'RH':null);
 assert.equal(personalPracticePackage(p,s).score.notes.filter(n=>n.hand==='RH').length,chosen.size);
});

test('one struck key with a hand on one voice only reads from its source pages, and one hand choice covers the key',async()=>{
 const p=await open(mixedKey),hands=Object.fromEntries(p.score.notes.map(n=>[n.id,n.hand??null]));
 assert.deepEqual(hands,{'P1:m1:n1':'RH','P1:m1:n2':null,'P1:m1:n3':null,'P1:m1:n4':null});
 const session=new PersonalPresentationSession(p);
 await session.warm();
 assert.equal(await session.project(initialPersonal(p)),p);
 // Choosing a hand on the unmarked voice's head gives it to every note of that key.
 assert.deepEqual(handChoiceOwners(p,seatOf(p,'P1:m1:n3')).sort(),['P1:m1:n1','P1:m1:n3']);
 const s=assigned(p,initialPersonal(p),seatOf(p,'P1:m1:n3'),{hand:'LH'});
 assert.deepEqual(effectiveAssignments(p,s).map(a=>[a.id,a.hand]),[['P1:m1:n1','LH'],['P1:m1:n2',null],['P1:m1:n3','LH'],['P1:m1:n4',null]]);
 const view=await session.project(s);
 assert.deepEqual(view.score.notes.map(n=>[n.id,n.hand??null]).sort(),[['P1:m1:n1','LH'],['P1:m1:n2',null],['P1:m1:n3','LH'],['P1:m1:n4',null]]);
 // The source pages draw the key as one head, so both notes share its finger too.
 assert.equal(seatOf(p,'P1:m1:n1'),seatOf(p,'P1:m1:n3'));
 const fingered=assigned(p,s,seatOf(p,'P1:m1:n3'),{finger:2});
 assert.deepEqual(['P1:m1:n1','P1:m1:n3'].map(id=>fingered.assignments!.choices[id].finger),[2,2]);
});

test('a hand choice elsewhere waits until a half-handed key has its hand',async()=>{
 const p=await open(mixedKey);
 assert.throws(()=>assigned(p,initialPersonal(p),seatOf(p,'P1:m1:n2'),{hand:'LH'}),{message:'Bar 1 has a key written as two notes, and only one of them has a hand. Choose a hand for that key first (L or R).'});
 // Resolving that key first lets every later choice through.
 const s=assigned(p,assigned(p,initialPersonal(p),seatOf(p,'P1:m1:n1'),{hand:'RH'}),seatOf(p,'P1:m1:n2'),{hand:'RH'});
 assert.equal(handFor(p,s,'P1:m1:n2'),'RH');
 await new PersonalPresentationSession(p).project(s);
});

test('ISO\'s refusal of a half-handed key reaches the player in plain words, keeping its diagnosis',async()=>{
 const p=await open(oneStaff),s=assigned(p,initialPersonal(p),p.seats[0],{hand:'RH'}),
  refusal=new HandPresentationError('unsupported-fit','One struck key is written in notes with a performing hand and notes without one, so it has no single head to engrave. Choose the same hand for all of its notes.',['a','b']),
  pool={use:async()=>{throw refusal;}} as unknown as PersonalPreparationPool<never>;
 await assert.rejects(new PersonalPresentationSession(p,pool).project(s),(error:Error)=>
  error.message==='One key is written as two notes, and only one of them has a hand. Choose a hand for that key (L or R) to give it to both notes.'&&error.cause===refusal);
 // Its source pages already draw such a key, so opening the score does not refuse it.
 await new PersonalPresentationSession(p,pool).warm();
 const other=new HandPresentationError('unsupported-fit','Personal hands cannot fit the matching musical presentation.');
 await assert.rejects(new PersonalPresentationSession(p,{use:async()=>{throw other;}} as unknown as PersonalPreparationPool<never>).warm(),
  (error:Error)=>error.message==="This score can't be displayed yet: the viewer can't draw its pages."&&error.cause===other);
});

test('fingers and timed practice wait for the player to give every note a hand',async()=>{
 const p=await open(oneStaff),count=p.score.notes.length,bytes=(await prepareMusicXmlScore(strToU8(oneStaff),assets)).bytes;
 const result=await ensurePianoReady({packageBytes:bytes,layout:'conventional-piano',intent:'calculate',forceRecalculate:true});
 assert.equal(result.status,'needs-data');assert.equal((result as {code:string}).code,'performing-hands');
 assert.equal((result as {message:string}).message,`${count} notes have no hand in this score. Choose a hand for each (L or R while editing) before fingers can be calculated.`);
 assert.throws(()=>requirePracticeHands(p,initialPersonal(p)),{message:`${count} notes have no hand in this score. Choose a hand for each (L or R while editing) before timed practice.`});
 // Once the player gives every key a hand, practice plans with those hands.
 let s=initialPersonal(p);for(const seat of p.seats)s=assigned(p,s,seat,{hand:'RH'});
 requirePracticeHands(p,s);
 assert.ok(planSource(p,'bounded-exercises-v1',s).gestures.every(g=>g.hand==='RH'));
 await assert.rejects(createScoreTransposition(p,bytes,2,'conventional-piano'),{message:`Transposing keeps the score's own hands, and ${count} notes have none, so this score can't be transposed yet.`});
 // Reading the score is not a calculation request.
 assert.equal((await ensurePianoReady({packageBytes:bytes,layout:'conventional-piano',intent:'read-retained'})).status,'reading');
});
