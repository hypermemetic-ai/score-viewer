import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {importPackage} from '../src/package';
import {prepareSourceTransposition} from '../src/score-transposition';
import {personalForTransposedEdition} from '../src/transposed-personal';
import {initialPersonal,corrected,fingerFor} from '../src/state';
import {assigned,handFor,effectiveAssignments} from '../src/personal-assignments';
import {isPitchedEvent} from '../vendor/iso-notation/src/model/musical-event';

// A source-owned edition: hands come from the score, fingers from its edition layer.
const bytes=new Uint8Array(readFileSync(new URL('../fixtures/authored-preparation-v1.tuna',import.meta.url))),
 from=await importPackage(bytes,{keyboardLayout:'janko-four-row'}),
 to=await importPackage(await prepareSourceTransposition(from,bytes,1),{keyboardLayout:'janko-four-row'}),
 pitchOf=(p:typeof from,id:string)=>{const n=p.score.notes.find(n=>n.id===id)!;assert.ok(isPitchedEvent(n));return n.pitch.octave*12+n.pitch.pitchClass;},
 single=from.seats.filter(s=>s.ownerIds.length===1&&from.seats.filter(q=>q.contactId===s.contactId).length===1&&from.fingerLayer!.attacks.some(a=>a.id===s.actionId)),
 seatIn=(p:typeof from,ownerId:string)=>p.seats.find(s=>s.ownerIds.includes(ownerId))!;

test('your hand and finger choices move with their notes to the transposed edition',()=>{
 const seat=single[0],owner=seat.ownerIds[0],hand=handFor(from,initialPersonal(from),owner)==='LH'?'RH':'LH';
 const s=assigned(from,initialPersonal(from),seat,{hand,finger:3});
 const result=personalForTransposedEdition(s,from,to);
 assert.equal(result.carried,1);assert.equal(result.left,0);
 const choice=result.personal.assignments!.choices[owner];
 assert.equal(choice.guard.pitch,pitchOf(from,owner)+1);assert.equal(choice.guard.pitch,pitchOf(to,owner));
 assert.equal(handFor(to,result.personal,owner),hand);assert.equal(fingerFor(to,result.personal,seatIn(to,owner)),3);
 assert.equal(result.personal.view.fingerSet,'yours');
 assert.ok(effectiveAssignments(to,result.personal).some(a=>a.id===owner&&a.hand===hand&&a.finger===3));
 // The earlier edition's journal is not changed.
 assert.equal(s.assignments!.choices[owner].guard.pitch,pitchOf(from,owner));
});

test('older finger corrections move as finger choices; edition fingerings are not carried',()=>{
 const seat=single[1],owner=seat.ownerIds[0],printed=from.fingerLayer!.attacks.find(a=>a.id===seat.actionId)!.finger,replacement=printed===1?2:1;
 const s=corrected(from,initialPersonal(from),seat,replacement);assert.ok(Object.keys(s.overrides).length===1);
 const result=personalForTransposedEdition(s,from,to);
 assert.equal(result.carried,1);assert.equal(result.left,0);assert.deepEqual(result.personal.overrides,{});
 assert.equal(result.personal.assignments!.choices[owner].finger,replacement);assert.equal(fingerFor(to,result.personal,seatIn(to,owner)),replacement);
 // With no choices nothing is carried and the new edition starts clean.
 const none=personalForTransposedEdition(initialPersonal(from),from,to);
 assert.equal(none.carried,0);assert.equal(none.left,0);assert.equal(none.personal.assignments,undefined);
 assert.deepEqual(personalForTransposedEdition(undefined,from,to),{personal:initialPersonal(to),carried:0,left:0});
});

test('choices whose notes do not match after transposing are reported and stay with the earlier edition',()=>{
 const [a,b]=[single[0],single[1]],s=assigned(from,assigned(from,initialPersonal(from),a,{finger:2}),b,{finger:4});
 const moved=structuredClone(to),n=moved.score.notes.find(n=>n.id===b.ownerIds[0])!;n.startTick+=1;
 const result=personalForTransposedEdition(s,from,moved);
 assert.equal(result.carried,1);assert.equal(result.left,1);
 assert.ok(result.personal.assignments!.choices[a.ownerIds[0]]);assert.equal(result.personal.assignments!.choices[b.ownerIds[0]],undefined);
});

test('choices never move to another score',async()=>{
 const other=await importPackage(new Uint8Array(readFileSync(new URL('../fixtures/schumann-op68-no14.tuna',import.meta.url))),{allowLegacyTempo:true});
 const s=assigned(from,initialPersonal(from),single[0],{finger:2});
 assert.throws(()=>personalForTransposedEdition(s,from,other),/another score/);
});
