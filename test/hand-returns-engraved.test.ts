import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareMusicXmlScore} from '../src/musicxml-import';
import {importPackage,selectPresentation} from '../src/package';
import {PersonalPresentationSession} from '../src/personal-presentation';
import {assigned,handRecurrences} from '../src/personal-assignments';
import {initialPersonal} from '../src/state';

const root=new URL('../',import.meta.url);
const assets={font:{name:'fonts/URWGothic-Demi.otf',bytes:readFileSync(new URL('src/URWGothic-Demi.otf',root))},
 notices:Object.fromEntries(['URW-base35-COPYING','URW-base35-LICENSE','URW-base35-provenance.md'].map(name=>
  ['licenses/'+name,readFileSync(new URL('licenses/'+name,root))]))};

// One test on purpose: it engraves No. 13 once and moves hands on it.
test('No. 13 from MusicXML: a hand moved in the first time through is drawn at every written-out return',{timeout:10*60_000},async()=>{
 const prepared=await prepareMusicXmlScore(readFileSync(new URL('vendor/iso-notation/src/scores/schumann-op68-no13.musicxml',root)),assets);
 const p=await selectPresentation(await importPackage(prepared.bytes,{allowLegacyTempo:true}),'janko-four-row');
 const bars=p.score.sourceBarTicks!,barOf=(id:string)=>bars.findLastIndex(t=>t<=p.score.notes.find(n=>n.id===id)!.startTick)+1;
 const at=(bar:number,onset:number,hand:'LH'|'RH')=>p.score.notes.filter(n=>n.hand===hand&&n.startTick===bars[bar-1]+onset).map(n=>n.id).sort();
 // Bar 3's left hand on its second eighth, and bar 11's left-hand E4 (the 4), each taken by the right hand.
 const [left]=at(3,24,'LH'),e4=at(11,24,'LH').find(id=>{const n=p.score.notes.find(n=>n.id===id)!;return 'pitch' in n&&n.pitch.pitchClass===4;})!;
 let personal=initialPersonal(p);
 personal=assigned(p,personal,p.seats.find(s=>s.ownerIds.includes(left))!,{hand:'RH'});
 personal=assigned(p,personal,p.seats.find(s=>s.ownerIds.includes(e4))!,{hand:'RH'});
 const stored=structuredClone(personal.assignments);
 const carried=handRecurrences(p,personal).carried;
 assert.deepEqual([...carried].map(([id,c])=>`${barOf(id)} ${c.hand} from ${c.fromBar}`).sort(),['13 RH from 3','21 RH from 11','28 RH from 3','44 RH from 3']);

 const session=new PersonalPresentationSession(p,undefined,{worker:null,cache:null});
 const view=await session.project(personal);
 // The engraving draws each copy in the moved hand, as a move of its own.
 for(const id of [left,e4,...carried.keys()]){
  const n=view.score.notes.find(n=>n.id===id)!;
  assert.equal(n.hand,'RH',`bar ${barOf(id)}`);
  assert.equal(n.personalHand?.hand,n.hand,`bar ${barOf(id)} is drawn with the personal hand`);
 }
 // Every other note keeps its written hand.
 const moved=new Set([left,e4,...carried.keys()]);
 for(const n of view.score.notes)if(!moved.has(n.id))assert.equal(n.hand,p.score.notes.find(q=>q.id===n.id)!.hand,n.id);
 // The pages that hold the returns are engraved again.
 const page=(id:string)=>p.seats.find(s=>s.ownerIds.includes(id))!.page;
 for(const id of carried.keys())assert.notEqual(view.pages[page(id)],p.pages[page(id)],`the page with bar ${barOf(id)}`);
 // Derived only: the two records are all that is stored.
 assert.deepEqual(personal.assignments,stored);assert.deepEqual(Object.keys(stored!.choices).sort(),[left,e4].sort());
 // Undoing the move in bar 3 undoes its copies.
 const undone=assigned(p,personal,p.seats.find(s=>s.ownerIds.includes(left))!,{hand:'LH'});
 const back=await session.project(undone);
 for(const id of carried.keys())if(carried.get(id)!.fromBar===3)assert.equal(back.score.notes.find(n=>n.id===id)!.hand,'LH',`bar ${barOf(id)}`);
});
