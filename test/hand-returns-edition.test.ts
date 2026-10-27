import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {importPackage,selectPresentation} from '../src/package';
import {rebuildEdition} from '../src/edition-rebuild';
import {PersonalPresentationSession} from '../src/personal-presentation';
import {assigned,handFor,handProvenance,handRecurrences} from '../src/personal-assignments';
import {annotationPositions} from '../src/fingering-presentation';
import {initialPersonal} from '../src/state';

// No. 14's edition moves the second A3 of bars 14, 30 and 60 from the source's
// RH to the LH, beamed with the LH. A hand moved at one return travels to the
// others (#204), but only where the note has no edit of its own: an edit at a
// note outranks a hand carried from a return, which outranks the source's hand.
// One test on purpose: it engraves No. 14 again and draws the moved hand.
test('No. 14 Jankó: a hand moved at bar 60 leaves bar 30’s edited LH A3 in the LH, with its finger on the LH side',{timeout:10*60_000},async()=>{
 const bytes=new Uint8Array(readFileSync(new URL('../fixtures/schumann-op68-no14.tuna',import.meta.url)));
 const p=await selectPresentation(await importPackage((await rebuildEdition(bytes,{})).bytes,{allowLegacyTempo:true}),'janko-four-row');
 const bars=p.score.sourceBarTicks!,barOf=(id:string)=>bars.findLastIndex(t=>t<=p.score.notes.find(n=>n.id===id)!.startTick)+1;
 /** The bar's second A3, the one written in the RH and edited into the LH. */
 const a3=(bar:number)=>{const [,second]=p.score.notes.filter(n=>'pitch' in n&&n.pitch.octave===3&&n.pitch.pitchClass===9&&n.startTick>=bars[bar-1]&&n.startTick<bars[bar]).sort((a,b)=>a.startTick-b.startTick);return second!;};
 for(const bar of [14,30,60]){
  const n=a3(bar);
  assert.deepEqual([n.sourceProvenance?.hands,n.hand,n.editorialHand?.kind],[['RH'],'LH','flip'],`bar ${bar}: the edition moves its second A3 to the LH`);
 }
 const seat=(bar:number)=>p.seats.find(s=>s.ownerIds.includes(a3(bar).id))!;
 let personal=initialPersonal(p);
 personal=assigned(p,personal,seat(30),{finger:1});
 personal=assigned(p,personal,seat(60),{hand:'RH'});

 const carried=[...handRecurrences(p,personal).carried.keys()].map(barOf);
 assert.ok(!carried.includes(30)&&!carried.includes(14),`bar 60's move is carried to bars ${carried.join(', ')||'none'}, never onto an edited note`);
 assert.equal(handFor(p,personal,a3(60).id),'RH','the moved note');
 assert.equal(handFor(p,personal,a3(30).id),'LH','bar 30 keeps its edit');
 assert.equal(handFor(p,personal,a3(14).id),'LH','bar 14 keeps its edit');
 assert.notEqual(handProvenance(p,personal,a3(30).id)?.kind,'carried');

 const view=await new PersonalPresentationSession(p,undefined,{worker:null,cache:null}).project(personal);
 const drawn=view.score.notes.find(n=>n.id===a3(30).id)!;
 assert.equal(drawn.hand,'LH','bar 30’s A3 is drawn in the LH');
 assert.equal(view.score.notes.find(n=>n.id===a3(60).id)!.hand,'RH','bar 60’s A3 is drawn in the RH');
 const at=view.seats.find(s=>s.ownerIds.includes(a3(30).id))!;
 assert.equal(personal.assignments!.choices[a3(30).id]?.finger,1);
 assert.equal(annotationPositions(view,[at.page]).get(at.id)!.carrier.direction,1,'its finger 1 hangs below, on the LH side');
});
