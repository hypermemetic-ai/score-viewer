import test from 'node:test';
import assert from 'node:assert/strict';
import {browserAssistanceStore,type AssistanceBrowserLocks} from '../src/durable-assistance-store';
import {assigned,handFor,type PersonalHand} from '../src/personal-assignments';
import {bootstrapPersonalFingeringMemory,captureMemoryFingerEdit,editPersonalFingeringMemory,preservePersonalMemoryHandChange,resolvePersonalFingeringMemory,type MemoryScoreInput,type PersonalFingeringMemory} from '../src/personal-fingering-memory';
import {PersonalMemorySession,personalMemoryDocument} from '../src/personal-memory-session';
import {initialPersonal,type PersonalState} from '../src/state';
import type {ScorePackage} from '../src/package';

// Schumann Op. 68 No. 13 in 2/4, 48 ticks a beat, as the owner's edition writes
// it: bar 1 is a pickup; bar 11 is a full bar whose last half beat holds the RH
// pickup to the return (B4 C#5); bar 21 is the same music written short, and its
// pickup is bar 22. Notes: [hand, MIDI-style pitch (octave*12+class), onset in
// the bar, duration]. ISO digits name pitch classes: E is 4, D# is 3.
const barTicks=[0,24,120,216,312,408,504,600,696,792,888,984,1080,1176,1272,1368,1464,1560,1656,1752,1848,1920,1944,2040];
type Row=[PersonalHand|null,number,number,number];
const chords:Row[]=[['LH',42,0,24],['RH',52,0,24],['RH',58,0,24],['RH',63,0,24],['LH',42,24,24],['LH',52,24,24],['RH',54,24,24],['RH',58,24,24],['RH',61,24,24],['LH',47,48,24],['LH',51,48,24],['RH',54,48,24],['RH',59,48,24]];
const bar11:Row[]=[...chords,['RH',59,72,12],['RH',61,84,12]];
const bar22:Row[]=[['LH',47,0,48],['RH',54,0,12],['LH',50,0,48],['RH',61,0,12],['RH',59,12,12]];
const bar23:Row[]=[['RH',59,0,12],['LH',52,0,72],['RH',68,12,12]];
function no13(bars:Record<number,Row[]>={11:bar11,21:chords,22:bar22,23:bar23}):MemoryScoreInput {
 const notes=Object.entries(bars).flatMap(([bar,rows])=>rows.map(([hand,pitch,onset,duration],i)=>({eventKind:'pitched',id:`m${bar}:n${i}`,pitch:{octave:Math.floor(pitch/12),pitchClass:pitch%12},startTick:barTicks[Number(bar)-1]+onset,durationTicks:duration,...(hand?{hand}:{})})));
 const p={manifest:{version:1,revision:'revision',metadata:{title:'No. 13 bars'}},keyboardLayout:'janko-four-row',profileSha256:'geometry',pages:['svg'],
  score:{id:'no13',ticksPerBeat:48,totalTicks:barTicks.at(-1),sourceBarTicks:barTicks,timeSignatures:[{tick:0,numerator:2,denominator:4}],notes},
  seats:notes.map((n,i)=>({id:`s${i}`,ownerIds:[n.id],writtenBar:barTicks.findLastIndex(t=>t<=n.startTick)+1,contactId:`c${i}`,actionId:`a${i}`,page:0,system:0,x:i,baseline:0,fontSize:12,pitchDigit:'1'}))} as unknown as ScorePackage;
 return{entryId:'no13',importedAt:'2026-10-17T16:12:02.659Z',p,personal:initialPersonal(p)};
}
const seat=(input:MemoryScoreInput,id:string)=>input.p.seats.find(s=>s.ownerIds.includes(id))!;
/** The owner's fingers, entered with recorded intent as the editor writes them. */
function fingered(input:MemoryScoreInput,fingers:Record<string,number>,at='2026-10-18T00:00:00.000Z'):PersonalState {
 let personal=input.personal;
 for(const [id,finger] of Object.entries(fingers)){personal=assigned(input.p,personal,seat(input,id),{finger});personal.assignments!.choices[id].intent={finger:{decisionId:`${id}:${at}`,lineageId:`${id}:${at}`,authoredAt:at}};}
 return personal;
}
// The owner's bar 11: chords 1 3 5 / 2 4 5 / 2 5 over LH 3 / 3 1 / 1 1, then the pickup 1 2.
const bar11Fingers=[3,1,3,5,3,1,2,4,5,1,1,2,5,1,2];
const owners=(input:MemoryScoreInput)=>fingered(input,Object.fromEntries(bar11Fingers.map((f,i)=>[`m11:n${i}`,f])));
const fingersIn=(document:PersonalFingeringMemory,input:MemoryScoreInput,bar:number)=>{
 const r=resolvePersonalFingeringMemory(document,input.entryId,input.p,input.personal);
 return input.p.score.notes.filter(n=>n.id.startsWith(`m${bar}:`)).map(n=>r.byOwner[n.id].finger?.value??null);
};

test('No. 13: bar 11’s fingers reach bar 21, written short, over what both bars play; bar 11’s pickup stays in bar 11; nothing is written',()=>{
 const input=no13(),personal=owners(input),stored={...input,personal},document=bootstrapPersonalFingeringMemory([stored]),saved=JSON.stringify(document),records=JSON.stringify(personal);
 assert.deepEqual(fingersIn(document,stored,21),bar11Fingers.slice(0,13));
 const r=resolvePersonalFingeringMemory(document,'no13',input.p,personal);
 // Bar 21's RH 3 at the downbeat: shared from bar 11, which is its reference.
 assert.equal(r.byOwner['m21:n3'].finger?.provenance,'inherited');assert.equal(r.byOwner['m21:n3'].reference?.writtenBar,11);assert.equal(r.byOwner['m21:n3'].personal,true);
 assert.equal(r.assignments.find(a=>a.id==='m21:n3')?.finger,5);
 // Bar 11's pickup fingers reach neither bar 22, the return's pickup, nor any other bar.
 assert.deepEqual(fingersIn(document,stored,22),[null,null,null,null,null]);assert.deepEqual(fingersIn(document,stored,23),[null,null,null]);
 assert.equal(JSON.stringify(document),saved);assert.equal(JSON.stringify(personal),records);
 assert.ok(!Object.keys(personal.assignments!.choices).some(id=>id.startsWith('m21:')));
});

test('each hand matches on its own: another bass keeps the right hand’s fingers, and other music takes none',()=>{
 const otherBass=no13({11:bar11,21:chords.map(([h,p,o,d],i)=>i===0?[h,p+1,o,d] as Row:[h,p,o,d] as Row),22:bar22,23:bar23});
 const document=bootstrapPersonalFingeringMemory([{...otherBass,personal:owners(otherBass)}]),got=fingersIn(document,{...otherBass,personal:owners(otherBass)},21);
 const hands=chords.map(([h])=>h);
 assert.deepEqual(got.filter((_,i)=>hands[i]==='RH'),bar11Fingers.filter((_,i)=>hands[i]==='RH'));
 assert.deepEqual(got.filter((_,i)=>hands[i]==='LH'),[null,null,null,null,null]);
 // The same notes half a beat later in the bar are not the same music.
 const shifted=no13({11:bar11,21:chords.map(([h,p,o,d])=>[h,p,o+12,d] as Row).filter(([,,o])=>o<72),22:bar22,23:bar23});
 const shiftedDocument=bootstrapPersonalFingeringMemory([{...shifted,personal:owners(shifted)}]);
 assert.ok(fingersIn(shiftedDocument,{...shifted,personal:owners(shifted)},21).every(f=>f===null));
});

test('a pickup bar is never read from its start: bar 22 does not take the downbeat’s fingers',()=>{
 // Bar 22 written as the downbeat's first chord, half a beat long: the notes match, the place in the bar does not.
 const pickup=no13({11:bar11,21:chords,22:chords.filter(([,,o])=>o===0),23:bar23});
 const personal=owners(pickup),document=bootstrapPersonalFingeringMemory([{...pickup,personal}]);
 assert.deepEqual(fingersIn(document,{...pickup,personal},21),bar11Fingers.slice(0,13));
 assert.ok(fingersIn(document,{...pickup,personal},22).every(f=>f===null));
 // A score without meters has no known downbeats and compares nothing.
 const unmetered=no13();(unmetered.p.score as {timeSignatures:unknown[]}).timeSignatures=[];
 assert.ok(fingersIn(bootstrapPersonalFingeringMemory([{...unmetered,personal:owners(unmetered)}]),{...unmetered,personal:owners(unmetered)},21).every(f=>f===null));
});

const edit=(ownerId:string,finger:1|2|3|4|5|'inherit',id:string)=>({ownerId,finger,decisionId:id,authoredAt:'2026-10-22T00:00:00.000Z'});
test('a finger changed at bar 21 is an exception there; Use shared returns to bar 11’s; a change at bar 11 reaches bar 21',()=>{
 const input=no13(),stored={...input,personal:owners(input)};let document=bootstrapPersonalFingeringMemory([stored]);
 // Bar 21, RH 3 at the downbeat: 4 here only.
 const local=editPersonalFingeringMemory(document,stored,edit('m21:n3',4,'here'));assert.equal(local.operation,'local');document=local.document;
 let r=resolvePersonalFingeringMemory(document,'no13',input.p,stored.personal);
 assert.equal(r.byOwner['m21:n3'].finger?.value,4);assert.equal(r.byOwner['m21:n3'].finger?.provenance,'local');assert.equal(r.byOwner['m21:n3'].reference?.writtenBar,11);
 assert.equal(r.byOwner['m11:n3'].finger?.value,5);assert.equal(r.byOwner['m21:n2'].finger?.value,3);
 // Use shared.
 document=editPersonalFingeringMemory(document,stored,edit('m21:n3','inherit','shared')).document;
 assert.equal(resolvePersonalFingeringMemory(document,'no13',input.p,stored.personal).byOwner['m21:n3'].finger?.value,5);
 // Bar 11 is the reference: its change is shared, and bar 21 follows.
 const shared=editPersonalFingeringMemory(document,stored,edit('m11:n3',4,'bar11'));assert.equal(shared.operation,'shared');
 r=resolvePersonalFingeringMemory(shared.document,'no13',input.p,stored.personal);assert.equal(r.byOwner['m21:n3'].finger?.value,4);
 // Typing the finger bar 21 already shows records nothing.
 assert.equal(editPersonalFingeringMemory(shared.document,stored,edit('m21:n3',4,'same')).operation,'none');
});

test('an exception at bar 11 stays in bar 11: bar 21 keeps the shared finger',()=>{
 const input=no13(),stored={...input,personal:owners(input)},document=bootstrapPersonalFingeringMemory([stored]);
 const captured=captureMemoryFingerEdit(document,stored,edit('m11:n3',4,'only-here'));
 const local=editPersonalFingeringMemory(document,stored,{...captured,captured:{...captured.captured!,operation:'local'}});
 assert.equal(local.operation,'local');
 const r=resolvePersonalFingeringMemory(local.document,'no13',input.p,stored.personal);
 assert.equal(r.byOwner['m11:n3'].finger?.value,4);assert.equal(r.byOwner['m21:n3'].finger?.value,5);
});

test('after bar 11’s LH 4 and 3 move to the right hand, carried to bar 21, bar 21 keeps bar 11’s fingers',()=>{
 const input=no13(),before={...input,personal:owners(input)},document=bootstrapPersonalFingeringMemory([before]);
 // Bar 11, LH 4 (E4, second chord) and LH 3 (D#4, third chord), moved with recorded intent.
 let personal=before.personal;
 for(const [id,at] of [['m11:n5','2026-10-21T04:56:19.263Z'],['m11:n10','2026-10-21T04:56:50.493Z']] as const){
  personal=assigned(input.p,personal,seat(input,id),{hand:'RH'});const c=personal.assignments!.choices[id];c.intent={...c.intent,hand:{decisionId:`${id}:${at}`,lineageId:`${id}:${at}`,authoredAt:at}};
 }
 const after={...input,personal};assert.equal(handFor(input.p,personal,'m21:n5'),'RH');assert.equal(handFor(input.p,personal,'m21:n10'),'RH');
 const preserved=preservePersonalMemoryHandChange(document,before,after,'m11:n10');
 assert.deepEqual(fingersIn(preserved,after,11),bar11Fingers);assert.deepEqual(fingersIn(preserved,after,21),bar11Fingers.slice(0,13));
 assert.deepEqual(fingersIn(document,after,21),bar11Fingers.slice(0,13));
});

class Locks implements AssistanceBrowserLocks {private tail:Promise<unknown>=Promise.resolve();request<T>(_name:string,callback:()=>Promise<T>):Promise<T>{const next=this.tail.then(callback);this.tail=next.catch(()=>{});return next;}}
test('opening No. 13 shows bar 21’s fingers and writes nothing',async()=>{
 const input=no13(),stored={...input,personal:owners(input)},data=new Map<string,string>();
 const store=browserAssistanceStore({getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);}},new Locks());
 const session=()=>new PersonalMemorySession(store,{scanLibrary:async()=>[structuredClone(stored)],validateInputs:async()=>true});
 await session().initialize();const indexed=await store.read(),memory=JSON.stringify(indexed.documents[personalMemoryDocument]);
 const s=session();await s.initialize();
 const opened=await s.loadPersonalCurrent({id:'no13',importedAt:input.importedAt!},input.p,async()=>stored.personal);await s.flush();
 const after=await store.read();assert.equal(after.revision,indexed.revision);assert.equal(JSON.stringify(after.documents[personalMemoryDocument]),memory);
 assert.equal(s.resolve({...input,personal:opened}).byOwner['m21:n3'].finger?.value,5);
});
