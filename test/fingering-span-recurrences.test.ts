import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {browserAssistanceStore,type AssistanceBrowserLocks} from '../src/durable-assistance-store';
import {assigned,dropHandCarry,handFor,handRecurrences,pickupBars,type PersonalHand} from '../src/personal-assignments';
import {bootstrapPersonalFingeringMemory,captureMemoryFingerEdit,editPersonalFingeringMemory,preservePersonalMemoryHandChange,resolvePersonalFingeringMemory,type MemoryScoreInput,type PersonalFingeringMemory} from '../src/personal-fingering-memory';
import {PersonalMemorySession,personalMemoryDocument,rawMemoryPersonal} from '../src/personal-memory-session';
import {PersonalMemoryResolutionCache} from '../src/personal-memory-cache';
import {withResolvedMemory} from '../src/personal-assistance';
import {droppedCarryText} from '../src/hand-recurrence-text';
import {undrawableHandOwners,undrawableHandReason} from '../src/personal-presentation';
import {HandPresentationError} from '../vendor/iso-notation/src/score-presentation';
import {initialPersonal,type PersonalState} from '../src/state';
import {withRepeatInheritance} from '../src/repeat-fold';
import {scoreCapabilities} from '../src/score-capabilities';
import type {ScorePackage} from '../src/package';
import {threadCpuMs} from './support/thread-cpu';

// Schumann Op. 68 No. 13 in 2/4, 48 ticks a beat, as the written-out edition has
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
 return{entryId:'no13',importedAt:'2026-10-17T00:00:00.000Z',p,personal:initialPersonal(p)};
}
const seat=(input:MemoryScoreInput,id:string)=>input.p.seats.find(s=>s.ownerIds.includes(id))!;
/** Fingers entered with recorded intent, as the editor writes them. */
function fingered(input:MemoryScoreInput,fingers:Record<string,number>,at='2026-10-18T00:00:00.000Z'):PersonalState {
 let personal=input.personal;
 for(const [id,finger] of Object.entries(fingers)){personal=assigned(input.p,personal,seat(input,id),{finger});personal.assignments!.choices[id].intent={finger:{decisionId:`${id}:${at}`,lineageId:`${id}:${at}`,authoredAt:at}};}
 return personal;
}
// A stored fingering at bar 11, in note order: chords 1 3 5 / 1 2 4 / 1 4 over LH 5 / 5 2 / 4 2, then the pickup 2 3.
const bar11Fingers=[5,1,3,5,5,2,1,2,4,4,2,1,4,2,3];
const storedFingering=(input:MemoryScoreInput)=>fingered(input,Object.fromEntries(bar11Fingers.map((f,i)=>[`m11:n${i}`,f])));
const fingersIn=(document:PersonalFingeringMemory,input:MemoryScoreInput,bar:number)=>{
 const r=resolvePersonalFingeringMemory(document,input.entryId,input.p,input.personal);
 return input.p.score.notes.filter(n=>n.id.startsWith(`m${bar}:`)).map(n=>r.byOwner[n.id].finger?.value??null);
};

test('No. 13: bar 11’s fingers reach bar 21, written short, over what both bars play; bar 11’s pickup stays in bar 11; nothing is written',()=>{
 const input=no13(),personal=storedFingering(input),stored={...input,personal},document=bootstrapPersonalFingeringMemory([stored]),saved=JSON.stringify(document),records=JSON.stringify(personal);
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
 const document=bootstrapPersonalFingeringMemory([{...otherBass,personal:storedFingering(otherBass)}]),got=fingersIn(document,{...otherBass,personal:storedFingering(otherBass)},21);
 const hands=chords.map(([h])=>h);
 assert.deepEqual(got.filter((_,i)=>hands[i]==='RH'),bar11Fingers.filter((_,i)=>hands[i]==='RH'));
 assert.deepEqual(got.filter((_,i)=>hands[i]==='LH'),[null,null,null,null,null]);
 // The same notes half a beat later in the bar are not the same music.
 const shifted=no13({11:bar11,21:chords.map(([h,p,o,d])=>[h,p,o+12,d] as Row).filter(([,,o])=>o<72),22:bar22,23:bar23});
 const shiftedDocument=bootstrapPersonalFingeringMemory([{...shifted,personal:storedFingering(shifted)}]);
 assert.ok(fingersIn(shiftedDocument,{...shifted,personal:storedFingering(shifted)},21).every(f=>f===null));
});

test('a pickup bar is never read from its start: bar 22 does not take the downbeat’s fingers',()=>{
 // Bar 22 written as the downbeat's first chord, half a beat long: the notes match, the place in the bar does not.
 const pickup=no13({11:bar11,21:chords,22:chords.filter(([,,o])=>o===0),23:bar23});
 const personal=storedFingering(pickup),document=bootstrapPersonalFingeringMemory([{...pickup,personal}]);
 assert.deepEqual(fingersIn(document,{...pickup,personal},21),bar11Fingers.slice(0,13));
 assert.ok(fingersIn(document,{...pickup,personal},22).every(f=>f===null));
});

/** Bar 11's LH 4 (E4) and LH 3 (D#4) moved to the right hand, with recorded intent; bar 21 receives them. */
function movedHands(input:MemoryScoreInput,personal:PersonalState):PersonalState {
 for(const [id,at] of [['m11:n5','2026-10-21T00:00:01.000Z'],['m11:n10','2026-10-21T00:00:02.000Z']] as const){
  personal=assigned(input.p,personal,seat(input,id),{hand:'RH'});const c=personal.assignments!.choices[id];c.intent={...c.intent,hand:{decisionId:`${id}:${at}`,lineageId:`${id}:${at}`,authoredAt:at}};
 }
 return personal;
}
test('hands and fingers compare the same bars: one pickup rule, with or without meters, and a lone short bar mid-score',()=>{
 const pickups=(input:MemoryScoreInput)=>pickupBars(input.p,input.p.score.sourceBarTicks!).flatMap((x,i)=>x?[i+1]:[]);
 // Bar 1 opens the piece short, and bar 22 completes bar 21: those are the pickups, with the meter or the usual bar length.
 const metered=no13(),unmetered=no13();(unmetered.p.score as {timeSignatures:unknown[]}).timeSignatures=[];
 assert.deepEqual(pickups(metered),[1,22]);assert.deepEqual(pickups(unmetered),[1,22]);
 for(const input of [metered,unmetered]){
  const personal=movedHands(input,storedFingering(input)),document=bootstrapPersonalFingeringMemory([{...input,personal}]);
  assert.equal(handFor(input.p,personal,'m21:n10'),'RH','the hand reaches bar 21');
  assert.deepEqual(fingersIn(document,{...input,personal},21),bar11Fingers.slice(0,13),'and so do the fingers');
 }
 // Bar 21 written short with nothing after it to complete it (bar 22 a full bar of 1/8): it follows a full bar, so it starts on a downbeat for both.
 const lone=no13({11:bar11,21:chords,23:bar23});(lone.p.score as {timeSignatures:unknown[]}).timeSignatures=[{tick:0,numerator:2,denominator:4},{tick:barTicks[21],numerator:1,denominator:8},{tick:barTicks[22],numerator:2,denominator:4}];
 assert.deepEqual(pickups(lone),[1]);
 const personal=movedHands(lone,storedFingering(lone)),document=bootstrapPersonalFingeringMemory([{...lone,personal}]);
 assert.equal(handFor(lone.p,personal,'m21:n10'),'RH');assert.deepEqual(fingersIn(document,{...lone,personal},21),bar11Fingers.slice(0,13));
 // A score's meters decide only its pickups: bar 21 in 3/8 still plays bar 11's music in 2/4 from the downbeat.
 const meters=no13();(meters.p.score as {timeSignatures:unknown[]}).timeSignatures=[{tick:0,numerator:2,denominator:4},{tick:barTicks[20],numerator:3,denominator:8},{tick:barTicks[21],numerator:2,denominator:4}];
 assert.deepEqual(pickups(meters),[1]);
 assert.deepEqual(fingersIn(bootstrapPersonalFingeringMemory([{...meters,personal:storedFingering(meters)}]),{...meters,personal:storedFingering(meters)},21),bar11Fingers.slice(0,13));
});

const edit=(ownerId:string,finger:1|2|3|4|5|'inherit',id:string)=>({ownerId,finger,decisionId:id,authoredAt:'2026-10-22T00:00:00.000Z'});
test('a finger changed at bar 21 is an exception there; Use shared returns to bar 11’s; a change at bar 11 reaches bar 21',()=>{
 const input=no13(),stored={...input,personal:storedFingering(input)};let document=bootstrapPersonalFingeringMemory([stored]);
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
 const input=no13(),stored={...input,personal:storedFingering(input)},document=bootstrapPersonalFingeringMemory([stored]);
 const captured=captureMemoryFingerEdit(document,stored,edit('m11:n3',4,'only-here'));
 const local=editPersonalFingeringMemory(document,stored,{...captured,captured:{...captured.captured!,operation:'local'}});
 assert.equal(local.operation,'local');
 const r=resolvePersonalFingeringMemory(local.document,'no13',input.p,stored.personal);
 assert.equal(r.byOwner['m11:n3'].finger?.value,4);assert.equal(r.byOwner['m21:n3'].finger?.value,5);
});

test('after bar 11’s LH 4 and 3 move to the right hand, carried to bar 21, bar 21 keeps bar 11’s fingers',()=>{
 const input=no13(),before={...input,personal:storedFingering(input)},document=bootstrapPersonalFingeringMemory([before]);
 const personal=movedHands(input,before.personal),after={...input,personal};assert.equal(handFor(input.p,personal,'m21:n5'),'RH');assert.equal(handFor(input.p,personal,'m21:n10'),'RH');
 const preserved=preservePersonalMemoryHandChange(document,before,after,'m11:n10');
 assert.deepEqual(fingersIn(preserved,after,11),bar11Fingers);assert.deepEqual(fingersIn(preserved,after,21),bar11Fingers.slice(0,13));
 assert.deepEqual(fingersIn(document,after,21),bar11Fingers.slice(0,13));
});

class Locks implements AssistanceBrowserLocks {private tail:Promise<unknown>=Promise.resolve();request<T>(_name:string,callback:()=>Promise<T>):Promise<T>{const next=this.tail.then(callback);this.tail=next.catch(()=>{});return next;}}
test('opening No. 13 shows bar 21’s fingers and writes nothing',async()=>{
 const input=no13(),stored={...input,personal:storedFingering(input)},data=new Map<string,string>();
 const store=browserAssistanceStore({getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);}},new Locks());
 const session=()=>new PersonalMemorySession(store,{scanLibrary:async()=>[structuredClone(stored)],validateInputs:async()=>true});
 await session().initialize();const indexed=await store.read(),memory=JSON.stringify(indexed.documents[personalMemoryDocument]);
 const s=session();await s.initialize();
 const opened=await s.loadPersonalCurrent({id:'no13',importedAt:input.importedAt!},input.p,async()=>stored.personal);await s.flush();
 const after=await store.read();assert.equal(after.revision,indexed.revision);assert.equal(JSON.stringify(after.documents[personalMemoryDocument]),memory);
 assert.equal(s.resolve({...input,personal:opened}).byOwner['m21:n3'].finger?.value,5);
});

test('a refused carried hand: bar 21 is resolved again with its written hands, and the notice says its fingers stay unshared',async()=>{
 // Another layout than the other tests, since the session's refusals are kept per score and layout.
 const input=no13();(input.p as {keyboardLayout:string}).keyboardLayout='conventional-piano';
 const stored={...input,personal:movedHands(input,storedFingering(input))},data=new Map<string,string>();
 const store=browserAssistanceStore({getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);}},new Locks());
 const session=new PersonalMemorySession(store,{scanLibrary:async()=>[structuredClone(stored)],validateInputs:async()=>true});await session.initialize();
 // The viewer's own resolution path and refusal handling, as main.ts writes them.
 const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8'),line=(start:string)=>{const i=main.indexOf(start);return main.slice(i,main.indexOf('\n',i));};
 const body=[line('const memoryInput='),line('const memoryResolutions='),line('const resolveMemoryInput='),line('function resolveMemory('),main.slice(main.indexOf('async function keepDrawableHands('),main.indexOf('async function acceptMemoryAction('))].map(s=>stripTypeScriptTypes(s)).join('\n');
 const context:any={structuredClone,crypto,handFor,dropHandCarry,undrawableHandOwners,undrawableHandReason,rawMemoryPersonal,withResolvedMemory,withRepeatInheritance,scoreCapabilities,PersonalMemoryResolutionCache,
  personalMemory:session,memoryLibrary:{remember(){}},paintPersonalSaveError(){},
  personalEditor:()=>({session:{project:async(s:PersonalState)=>{if(handFor(input.p,s,'m21:n5')==='RH')throw refusal();return input.p;}}})};
 const refusal=()=>Error("These hand choices can't be drawn on the page yet.",{cause:new HandPresentationError('unsupported-fit','Personal hands cannot fit the matching musical presentation.',['m21:n5'])});
 runInNewContext(body,context);
 const target={package:input.p,entry:{id:'no13',importedAt:input.importedAt},personal:await session.loadPersonalCurrent({id:'no13',importedAt:input.importedAt!},input.p,async()=>stored.personal)};
 target.personal=context.resolveMemory(target);
 const bar21=()=>input.p.score.notes.filter(n=>n.id.startsWith('m21:')).map(n=>target.personal.memoryResolved?.choices[n.id]?.finger??null);
 // Before the refusal bar 21 carries bar 11's hands and fingers: D#4 (3) in the RH with 2.
 assert.equal(handFor(input.p,target.personal,'m21:n10'),'RH');assert.deepEqual(bar21(),bar11Fingers.slice(0,13));
 const memory=JSON.stringify((await store.read()).documents[personalMemoryDocument]),records=JSON.stringify(target.personal.assignments);
 const kept=await context.keepDrawableHands(target,target.personal,refusal(),(id:string)=>input.p.score.notes.find(n=>n.id===id)?.hand??null);
 assert.deepEqual([...kept.dropped],[21]);assert.deepEqual([...kept.unshared],[21]);
 // D#4 is back in the LH beside B3, and neither keeps bar 11's fingers: bar 21's hands no longer play bar 11's.
 assert.equal(handFor(input.p,target.personal,'m21:n10'),'LH');assert.deepEqual(bar21(),Array(13).fill(null));
 assert.ok(input.p.score.notes.filter(n=>n.id.startsWith('m11:')).every((n,i)=>target.personal.memoryResolved?.choices[n.id]?.finger===bar11Fingers[i]),'bar 11 keeps its own');
 assert.equal(droppedCarryText(kept.dropped,kept.unshared),'Bar 21 keeps its written hands, and its fingers stay unshared: the carried hand can’t be drawn there.');
 // Nothing is written: the refusal lasts for the session only.
 await session.flush();assert.equal(JSON.stringify((await store.read()).documents[personalMemoryDocument]),memory);assert.equal(JSON.stringify(target.personal.assignments),records);
 assert.deepEqual(handRecurrences(input.p,target.personal).skipped,[{fromBar:11,toBar:21,reason:'the carried hand can’t be drawn there'}]);
});

test('the dropped-carry notice names the bars whose fingers stay unshared',()=>{
 assert.equal(droppedCarryText([21]),'Bar 21 keeps its written hands: the carried hand can’t be drawn there.');
 assert.equal(droppedCarryText([21,31],[21,31]),'Bars 21 and 31 keep their written hands: the carried hands can’t be drawn there. Their fingers stay unshared.');
 assert.equal(droppedCarryText([21,31],[31]),'Bars 21 and 31 keep their written hands: the carried hands can’t be drawn there. Fingers stay unshared in bar 31.');
});

/** 120 bars in 2/4, 3/4 and 4/4 in turn, each with nothing fingered. In `matching` every bar's LH plays C3 then G3 on each
 * beat, so each bar's LH opens like every bar of another length; otherwise each bar's LH starts on its own note. */
function mixedMeters(matching:boolean):MemoryScoreInput {
 const tpq=48,bars=[0],meters:{tick:number;numerator:number;denominator:number}[]=[],notes:object[]=[];
 for(let i=0;i<120;i++){
  const beats=2+i%3,at=bars[i],rows:[PersonalHand,number,number][]=[['LH',matching?36:30+i%60,0],['RH',52,0],['RH',55,0]];
  for(let k=1;k<beats;k++)rows.push(['RH',60+(i*7+k)%12,k*tpq],['LH',43,k*tpq]);
  meters.push({tick:at,numerator:beats,denominator:4});
  rows.forEach(([hand,pitch,onset],j)=>notes.push({eventKind:'pitched',id:`m${i+1}:n${j}`,pitch:{octave:Math.floor(pitch/12),pitchClass:pitch%12},startTick:at+onset,durationTicks:tpq,hand}));
  bars.push(at+beats*tpq);
 }
 const p={manifest:{version:1,revision:'revision',metadata:{title:'Mixed meters'}},keyboardLayout:'janko-four-row',profileSha256:'geometry',pages:['svg'],
  score:{id:'mixed',ticksPerBeat:tpq,totalTicks:bars.at(-1),sourceBarTicks:bars,timeSignatures:meters,notes},
  seats:(notes as {id:string;startTick:number}[]).map((n,i)=>({id:`s${i}`,ownerIds:[n.id],writtenBar:bars.findLastIndex(t=>t<=n.startTick)+1,contactId:`c${i}`,actionId:`a${i}`,page:0,system:0,x:i,baseline:0,fontSize:12,pitchDigit:'1'}))} as unknown as ScorePackage;
 return{entryId:matching?'mixed':'unmatched',importedAt:'2026-10-17T00:00:00.000Z',p,personal:initialPersonal(p)};
}
test('speed: bars of other lengths sharing a hand’s opening cost a resolve about what the same score costs without them',()=>{
 // CPU time of the resolving thread, compared with a score of the same bars and notes whose hands match nowhere, so machine load cancels out.
 // The process's CPU time also counts V8's collector and compiler threads, whose share swings with the host's load: one sample in a busy
 // full suite measured 2.18× for scores that cost about 1.1× each other.
 const scores=[mixedMeters(true),mixedMeters(false)].map(input=>({input,document:bootstrapPersonalFingeringMemory([input])}));
 // A fresh package is a score read again: nothing derived from it is cached yet, the matching bars included.
 const cpu=({input,document}:typeof scores[number],fresh:boolean)=>{const p=fresh?{...input.p}:input.p,start=threadCpuMs();resolvePersonalFingeringMemory(document,input.entryId,p,input.personal);return threadCpuMs()-start;};
 assert.equal(scores[0].input.p.score.notes.length,scores[1].input.p.score.notes.length);
 const median=(xs:number[])=>[...xs].sort((a,b)=>a-b)[xs.length>>1];
 for(const fresh of [false,true]){
  for(const score of scores)cpu(score,fresh);
  // Interleaved, so both scores meet the same conditions.
  const times:number[][]=[[],[]];for(let k=0;k<11;k++)scores.forEach((score,i)=>times[i].push(cpu(score,fresh)));
  // Each bar's LH has dozens of matching bars of another length; carrying from them used to cost five to six times as much.
  const ratio=median(times[0])/median(times[1]);
  assert.ok(ratio<2,`${fresh?'a first':'a later'} resolve with matching bars took ${ratio.toFixed(2)}× the CPU of one without (${median(times[0]).toFixed(0)} ms against ${median(times[1]).toFixed(0)} ms)`);
 }
});

test('reopened after a refused carried hand, bar 21’s hands as written are registered with the fingering memory',async()=>{
 // Its own source revision, since the session's refusals are kept per score and layout.
 const input=no13();(input.p as {sourceRevision?:string}).sourceRevision='reopened';input.personal=initialPersonal(input.p);
 const stored={...input,personal:movedHands(input,storedFingering(input))},data=new Map<string,string>();
 const store=browserAssistanceStore({getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);}},new Locks());
 const session=new PersonalMemorySession(store,{scanLibrary:async()=>[structuredClone(stored)],validateInputs:async()=>true});await session.initialize();
 const open=async()=>{const personal=await session.loadPersonalCurrent({id:'no13',importedAt:input.importedAt!},input.p,async()=>stored.personal);await session.flush();return personal;};
 // Bar 21's LH as written: B3 at each chord with E4 and D#4, which bar 11's LH no longer plays.
 const bar21LH=async()=>Object.values(((await store.read()).documents[personalMemoryDocument] as unknown as {occurrences:Record<string,{writtenBar:number;occurrence:{scope?:string};ownerIds:string[]}>}).occurrences)
  .some(r=>r.writtenBar===21&&r.occurrence.scope==='LH'&&r.ownerIds.includes('m21:n5')&&r.ownerIds.includes('m21:n10'));
 let personal=await open();const before=(await store.read()).revision;
 assert.equal(handFor(input.p,personal,'m21:n10'),'RH');assert.equal(await bar21LH(),false,'only the carried split is known');
 // Opening it again unchanged writes nothing.
 personal=await open();assert.equal((await store.read()).revision,before);
 assert.equal(dropHandCarry(input.p,personal,'m21:n5'),21);assert.equal(handFor(input.p,personal,'m21:n10'),'LH');
 // Reopened in the same session, the score is known with bar 21's hands as written only once they are registered.
 await open();assert.equal(await bar21LH(),true);assert.ok((await store.read()).revision>before);
});
