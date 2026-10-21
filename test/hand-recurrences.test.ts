import test from 'node:test';
import assert from 'node:assert/strict';
import {browserAssistanceStore,type AssistanceBrowserLocks} from '../src/durable-assistance-store';
import {assigned,effectiveAssignments,handFor,handProvenance,handRecurrences,readPersonalAssignments,type PersonalHand} from '../src/personal-assignments';
import {handCarryNotice,handChoiceView} from '../src/hand-recurrence-text';
import {bootstrapPersonalFingeringMemory,preservePersonalMemoryHandChange,projectPersonalMemoryScore,resolvePersonalFingeringMemory,type MemoryScoreInput} from '../src/personal-fingering-memory';
import {PersonalMemorySession,personalMemoryDocument} from '../src/personal-memory-session';
import {initialPersonal,personalStorageName,type PersonalState} from '../src/state';
import type {ScorePackage} from '../src/package';

// Schumann Op. 68 No. 13 as the owner's edition writes it: bar 11 holds the
// return pickup (B4 C#5, right hand) in its last half beat; bar 21 is the same
// music written short, its pickup moved to bar 22. Notes: [hand, MIDI-style
// pitch (octave*12+class), onset in the bar, duration]; 48 ticks a beat.
const barTicks=[0,24,120,216,312,408,504,600,696,792,888,984,1080,1176,1272,1368,1464,1560,1656,1752,1848,1920,1944];
type Row=[PersonalHand|null,number,number,number];
const bar10:Row[]=[['RH',59,0,12],['RH',59,0,72],['RH',71,12,12],['LH',50,24,24],['RH',70,24,12],['RH',68,36,12],['LH',42,48,24],['LH',51,48,24],['RH',66,48,12],['RH',63,60,12],['LH',44,72,12],['RH',56,72,24],['RH',59,72,12],['LH',37,84,12],['RH',64,84,12]];
const chords:Row[]=[['LH',42,0,24],['RH',52,0,24],['RH',58,0,24],['RH',63,0,24],['LH',42,24,24],['LH',52,24,24],['RH',54,24,24],['RH',58,24,24],['RH',61,24,24],['LH',47,48,24],['LH',51,48,24],['RH',54,48,24],['RH',59,48,24]];
const bar12:Row[]=[['RH',59,0,12],['LH',52,0,72],['LH',56,0,24],['RH',68,12,12],['LH',57,24,24],['RH',66,24,12],['RH',63,36,12],['LH',56,48,24],['RH',64,48,12],['RH',59,60,12],['LH',53,72,24],['RH',61,72,12],['RH',56,84,12]];
const bar22:Row[]=[['LH',47,0,48],['RH',54,0,12],['LH',50,0,48],['RH',61,0,12],['RH',59,12,12]];
const no13=(bars:Record<number,Row[]>={10:bar10,11:[...chords,['RH',59,72,12],['RH',61,84,12]],12:bar12,20:bar10,21:chords,22:bar22})=>{
 const notes=Object.entries(bars).flatMap(([bar,rows])=>rows.map(([hand,pitch,onset,duration],i)=>({eventKind:'pitched',id:`m${bar}:n${i}`,pitch:{octave:Math.floor(pitch/12),pitchClass:pitch%12},startTick:barTicks[Number(bar)-1]+onset,durationTicks:duration,...(hand?{hand}:{})})));
 const p={manifest:{version:1,revision:'revision',metadata:{title:'No. 13 bars'}},keyboardLayout:'janko-four-row',profileSha256:'geometry',pages:['svg'],
  score:{id:'no13',ticksPerBeat:48,totalTicks:barTicks.at(-1),sourceBarTicks:barTicks,notes},
  seats:notes.map((n,i)=>({id:`s${i}`,ownerIds:[n.id],writtenBar:barTicks.findLastIndex(t=>t<=n.startTick)+1,contactId:`c${i}`,actionId:`a${i}`,page:0,system:0,x:i,baseline:0,fontSize:12,pitchDigit:'1'}))} as unknown as ScorePackage;
 return{entryId:'no13',importedAt:'2026-10-17T16:12:02.659Z',p,personal:initialPersonal(p)} as MemoryScoreInput;
};
// Bar 11, left hand 4 and 3: E4 at the second chord and D#4 at the third.
const e4=(bar:number)=>`m${bar}:n5`,dSharp4=(bar:number)=>`m${bar}:n10`;
const seat=(input:MemoryScoreInput,id:string)=>input.p.seats.find(s=>s.ownerIds.includes(id))!;
/** The owner's own choice, with its recorded intent, as the editor writes it. */
function choose(input:MemoryScoreInput,id:string,hand:PersonalHand,options:{local?:boolean;at?:string}={}):PersonalState {
 const next=assigned(input.p,input.personal,seat(input,id),{hand,...(options.local===undefined?{}:{local:options.local})}),at=options.at??'2026-10-21T04:56:19.263Z';
 for(const c of Object.values(next.assignments!.choices))if(c.hand!==undefined&&!c.intent?.hand)c.intent={...c.intent,hand:{decisionId:`${c.ownerId}:${at}`,lineageId:`${c.ownerId}:${at}`,authoredAt:at}};
 return next;
}
const owners=(input:MemoryScoreInput)=>{let personal=choose(input,e4(11),'RH');personal=choose({...input,personal},dSharp4(11),'RH',{at:'2026-10-21T04:56:50.493Z'});return personal;};

test('No. 13: the owner’s bar 11 hand change reaches bar 21, the same music written short, and nothing is written there',()=>{
 const input=no13(),personal=owners(input),stored=structuredClone(personal.assignments);
 const r=handRecurrences(input.p,personal);
 assert.deepEqual([...r.targets],[[11,[21]]]);assert.deepEqual(r.skipped,[]);
 assert.equal(handFor(input.p,personal,e4(21)),'RH');assert.equal(handFor(input.p,personal,dSharp4(21)),'RH');
 assert.deepEqual(r.carried.get(e4(21)),{hand:'RH',fromBar:11,fromOwnerId:e4(11)});
 // The bass of both chords and every other note keep the written hand.
 for(const a of effectiveAssignments(input.p,personal))if(![e4(11),dSharp4(11),e4(21),dSharp4(21)].includes(a.id))assert.equal(a.hand,input.p.score.notes.find(n=>n.id===a.id)!.hand);
 // Derived only: no record for bar 21, and the owner's records are unchanged.
 assert.deepEqual(personal.assignments,stored);assert.equal(personal.assignments!.choices[e4(21)],undefined);
 assert.equal(effectiveAssignments(input.p,personal,{carry:false}).find(a=>a.id===e4(21))!.hand,'LH');
 assert.deepEqual(handChoiceView(input.p,personal,e4(21)),{label:'Hand from bar 11',description:'Right hand, as you chose in bar 11: the same music. L or R makes this note an exception.',action:{id:'hand-not-here',label:'Not here'}});
 assert.equal(handChoiceView(input.p,personal,e4(11))?.label,'Hand also in bar 21');
 assert.equal(handCarryNotice(input.p,input.personal,personal),'Right hand also in bar 21: the same music.');
});

test('a bar matches only when both hands play the same from the downbeat to the end of the shorter bar',()=>{
 // Another bass at the downbeat: the moved notes sound with the same notes, but the bar is other music.
 const otherBass=no13({10:bar10,11:[...chords,['RH',59,72,12],['RH',61,84,12]],21:chords.map(([h,p,o,d],i)=>i===0?[h,p+1,o,d] as Row:[h,p,o,d] as Row)});
 assert.equal(handRecurrences(otherBass.p,owners(otherBass)).carried.size,0);
 // The same notes later in a longer bar do not take part: the place in the bar differs.
 const shifted=no13({11:[...chords,['RH',59,72,12],['RH',61,84,12]],12:chords.map(([h,p,o,d])=>[h,p,o+12,d] as Row)});
 assert.equal(handRecurrences(shifted.p,owners(shifted)).carried.size,0);
 // What follows the shared stretch (bar 11's pickup) is not compared.
 const pickupInLeft=no13({11:[...chords,['LH',47,72,24]],21:chords});
 assert.deepEqual([...handRecurrences(pickupInLeft.p,owners(pickupInLeft)).targets],[[11,[21]]]);
});

test('only a hand chosen with recorded intent travels; a legacy hand or an only-here hand stays in its bar',()=>{
 const input=no13(),legacy=assigned(input.p,input.personal,seat(input,e4(11)),{hand:'RH'});
 for(const c of Object.values(legacy.assignments!.choices))delete c.intent;
 assert.equal(handRecurrences(input.p,legacy).carried.size,0);assert.equal(handFor(input.p,legacy,e4(11)),'RH');
 const local=choose(input,e4(11),'RH',{local:true});
 assert.equal(local.assignments!.choices[e4(11)].handScope,'local');assert.equal(handFor(input.p,local,e4(21)),'LH');
 assert.deepEqual(handProvenance(input.p,local,e4(11)),{kind:'local',hand:'RH'});
 assert.equal(handChoiceView(input.p,local,e4(11))?.action?.label,'Use for matching bars');
 // A finger entered later keeps the scope; choosing a hand again without a scope keeps it too.
 const fingered=assigned(input.p,local,seat(input,e4(11)),{finger:2});assert.equal(fingered.assignments!.choices[e4(11)].handScope,'local');
 assert.equal(readPersonalAssignments(fingered.assignments,input.p)?.choices[e4(11)].handScope,'local');
 assert.throws(()=>readPersonalAssignments({...fingered.assignments!,choices:{...fingered.assignments!.choices,[e4(11)]:{...fingered.assignments!.choices[e4(11)],handScope:'everywhere' as 'local'}}},input.p),/guard differs/);
});

test('the owner’s own hand in the receiving bar wins, note by note',()=>{
 const input=no13();let personal=owners(input);
 personal=choose({...input,personal},e4(21),'LH',{local:true,at:'2026-10-22T00:00:00.000Z'});
 assert.equal(handFor(input.p,personal,e4(21)),'LH');assert.equal(handFor(input.p,personal,dSharp4(21)),'RH');
 assert.deepEqual(handProvenance(input.p,personal,e4(21)),{kind:'local',hand:'LH',follows:11});
 assert.equal(handChoiceView(input.p,personal,e4(21))?.action?.label,'Use bar 11’s hand');
 // The edited note says its own hand in the editor; the notice names only other bars.
 assert.equal(handCarryNotice(input.p,owners(input),personal,e4(21)),undefined);
 // Bar 21's D#4 still follows bar 11, so bar 21 does not have its own hands again.
 assert.equal(handCarryNotice(input.p,owners(input),personal),'Bar 21: one note keeps its own hand again.');
 const undone=choose({...input,personal:owners(input)},e4(11),'LH');
 assert.equal(handCarryNotice(input.p,owners(input),undone,e4(11)),'Bar 21: one note keeps its own hand again.');
 assert.equal(handCarryNotice(input.p,owners(input),input.personal),'Bar 21 keeps its own hands again.');
});

test('a matching bar the result could not be drawn in is skipped and said, not refused',()=>{
 // Bar 11's E4 also written as a hand-less second head of the same key, in both bars. A record saved
 // before the editor refused such scores gives bar 11's hand-less head the right hand too; that head
 // has no written hand to carry, so carrying E4 alone would leave bar 21's key half without a hand.
 const variant=(hand:PersonalHand|null)=>no13({10:bar10,11:[...chords,[hand,52,24,24],['RH',59,72,12],['RH',61,84,12]],21:[...chords,[hand,52,24,24]]});
 const drawn=variant('LH');let personal=owners(drawn);personal=choose({...drawn,personal},'m11:n13','RH');
 const input=variant(null),r=handRecurrences(input.p,personal);
 assert.equal(r.carried.size,0);assert.deepEqual(r.skipped,[{fromBar:11,toBar:21,reason:'a key there is written as two notes, and only one of them has a hand'}]);
 assert.equal(handFor(input.p,personal,e4(21)),'LH');assert.equal(handFor(input.p,personal,e4(11)),'RH');
 assert.equal(handCarryNotice(input.p,input.personal,personal),'Not carried to bar 21: a key there is written as two notes, and only one of them has a hand.');
});

test('a carried hand repartitions bar 21’s fingering memory and keeps the fingers the owner saw',()=>{
 const input=no13();
 // The owner's finger 3 on bar 21's D#4, entered while it was a left-hand note.
 const fingered=assigned(input.p,input.personal,seat(input,dSharp4(21)),{finger:3});fingered.assignments!.choices[dSharp4(21)].intent={finger:{decisionId:'d',lineageId:'d',authoredAt:'2026-10-20T00:00:00.000Z'}};
 const before={...input,personal:fingered},document=bootstrapPersonalFingeringMemory([before]);
 assert.equal(resolvePersonalFingeringMemory(document,'no13',input.p,fingered).byOwner[dSharp4(21)].finger?.value,3);
 const after={...input,personal:owners(before)};
 const hand=(r:ReturnType<typeof projectPersonalMemoryScore>,bar:number,scope:PersonalHand)=>r.find(x=>x.writtenBar===bar&&x.occurrence.scope===scope)!.ownerIds.sort();
 const projected=projectPersonalMemoryScore(after);
 assert.ok(hand(projected,21,'RH').includes(e4(21))&&hand(projected,21,'RH').includes(dSharp4(21)));assert.ok(!hand(projected,21,'LH').includes(dSharp4(21)));
 assert.deepEqual(hand(projected,11,'RH').filter(id=>[e4(11),dSharp4(11)].includes(id)),[dSharp4(11),e4(11)].sort());
 const preserved=preservePersonalMemoryHandChange(document,before,after,dSharp4(11));
 assert.equal(resolvePersonalFingeringMemory(preserved,'no13',input.p,after.personal).byOwner[dSharp4(21)].finger?.value,3);
 assert.ok(Object.values(preserved.occurrences).some(r=>r.writtenBar===21&&r.occurrence.scope==='RH'&&r.ownerIds.includes(dSharp4(21))));
});

class Locks implements AssistanceBrowserLocks {private tail:Promise<unknown>=Promise.resolve();request<T>(_name:string,callback:()=>Promise<T>):Promise<T>{const next=this.tail.then(callback);this.tail=next.catch(()=>{});return next;}}
const storage=()=>{const data=new Map<string,string>();return browserAssistanceStore({getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);}},new Locks());};
const session=(store:ReturnType<typeof storage>,input:MemoryScoreInput)=>new PersonalMemorySession(store,{scanLibrary:async()=>[structuredClone(input)],validateInputs:async()=>true});
const handAction=(ownerId:string,hand:PersonalHand,id:string,extra={})=>({kind:'hand' as const,ownerId,hand,decisionId:id,authoredAt:'2026-10-22T00:00:00.000Z',...extra});

test('editing: a change at bar 11 reaches bar 21; L at bar 21 is an exception there; Use shared and Only here; undo by the written hand',async()=>{
 const input=no13(),store=storage(),s=session(store,input);await s.initialize();
 let personal=(await s.loadPersonalCurrent({id:'no13',importedAt:input.importedAt!},input.p,async()=>input.personal));
 const step=async(action:Parameters<typeof s.accept>[1])=>{const receipt=s.accept({...input,personal},action);await receipt.saved;personal=receipt.personal;return receipt;};
 await step(handAction(e4(11),'RH','e4'));
 assert.equal(handFor(input.p,personal,e4(21)),'RH');assert.equal(personal.assignments!.choices[e4(21)],undefined);
 // Pressing the hand a note already carries changes nothing.
 const revision=(await store.read()).revision;await step(handAction(e4(21),'RH','same'));assert.equal(personal.assignments!.choices[e4(21)],undefined);
 assert.ok((await store.read()).revision>=revision);
 // L at bar 21: an exception there only; bar 11 keeps its change.
 await step(handAction(e4(21),'LH','left-here'));
 assert.equal(personal.assignments!.choices[e4(21)].handScope,'local');assert.equal(handFor(input.p,personal,e4(21)),'LH');assert.equal(handFor(input.p,personal,e4(11)),'RH');
 // Use shared: bar 21 follows bar 11 again.
 await step({kind:'handScope',ownerId:e4(21),scope:'shared',decisionId:'follow',authoredAt:'2026-10-22T00:00:01.000Z'});
 assert.equal(personal.assignments!.choices[e4(21)],undefined);assert.equal(handFor(input.p,personal,e4(21)),'RH');
 // Only here at bar 11, then for matching bars again.
 await step({kind:'handScope',ownerId:e4(11),scope:'local',decisionId:'only',authoredAt:'2026-10-22T00:00:02.000Z'});
 assert.equal(handFor(input.p,personal,e4(21)),'LH');assert.equal(handFor(input.p,personal,e4(11)),'RH');
 await step({kind:'handScope',ownerId:e4(11),scope:'shared',decisionId:'share',authoredAt:'2026-10-22T00:00:03.000Z'});
 assert.equal(personal.assignments!.choices[e4(11)].handScope,undefined);assert.equal(handFor(input.p,personal,e4(21)),'RH');
 // Undo: the written hand at bar 11 takes bar 21 back with it.
 await step(handAction(e4(11),'LH','undo'));assert.equal(handFor(input.p,personal,e4(21)),'LH');assert.equal(handRecurrences(input.p,personal).carried.size,0);
 // Every step reached the store, and reopening reads the same hands.
 const reopened=session(store,input);await reopened.initialize();const saved=await reopened.loadPersonalCurrent({id:'no13',importedAt:input.importedAt!},input.p,async()=>input.personal);
 assert.deepEqual(saved.assignments,personal.assignments);
});

test('opening a score whose existing hand change now reaches another bar writes nothing',async()=>{
 const input=no13(),store=storage(),stored={...input,personal:owners(input)};
 // The library as saved before hands were carried: the same records, indexed while bar 21 kept its written hands.
 const earlier=structuredClone(stored.personal);for(const c of Object.values(earlier.assignments!.choices))delete c.intent;
 const s=new PersonalMemorySession(store,{scanLibrary:async()=>[{...input,personal:earlier}],validateInputs:async()=>true});await s.initialize();
 const indexed=(await store.read());
 await store.commit({expectedRevision:indexed.revision,changes:JSON.parse(JSON.stringify({[personalStorageName('no13',input.p)]:stored.personal}))});
 const memory=indexed.documents[personalMemoryDocument] as {occurrences:Record<string,{writtenBar:number;occurrence:{scope?:string};ownerIds:string[]}>};
 assert.ok(!Object.values(memory.occurrences).some(r=>r.writtenBar===21&&r.occurrence.scope==='RH'&&r.ownerIds.includes(e4(21))));
 const revision=(await store.read()).revision;
 const opened=await s.loadPersonalCurrent({id:'no13',importedAt:input.importedAt!},input.p,async()=>input.personal);await s.flush();
 assert.equal((await store.read()).revision,revision);assert.equal(handFor(input.p,opened,e4(21)),'RH');
 // The next edit registers bar 21 with the hands it now has.
 const receipt=s.accept({...input,personal:opened},{kind:'finger',edit:{ownerId:e4(11),finger:4,decisionId:'f',authoredAt:'2026-10-22T00:00:00.000Z'}});await receipt.saved;
 const after=(await store.read()).documents[personalMemoryDocument] as typeof memory;
 assert.ok(Object.values(after.occurrences).some(r=>r.writtenBar===21&&r.occurrence.scope==='RH'&&r.ownerIds.includes(e4(21))));
});
