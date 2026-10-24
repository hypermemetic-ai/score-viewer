import test from 'node:test';
import assert from 'node:assert/strict';
import {assigned,handFor,handRecurrences,type PersonalHand} from '../src/personal-assignments';
import {initialPersonal,type PersonalState} from '../src/state';
import type {ScorePackage} from '../src/package';
import {PersonalMemorySession,type PersonalMemoryAction} from '../src/personal-memory-session';
import {browserAssistanceStore,type AssistanceBrowserLocks} from '../src/durable-assistance-store';
import {buildSchumannNo13MusicXmlImport} from '../vendor/iso-notation/src/scores/schumann-no13-musicxml-import';
import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';

// One L or R on a folded note is one press on every pass. Choosing the written
// hand there stores nothing, whichever pass is applied first: a record left on
// one pass would stop later copies and twins from reaching it.

function packaged(score:QuantizedGridScore):ScorePackage{
 const bars=score.sourceBarTicks!;
 return {manifest:{version:1,revision:'revision',metadata:{title:'Returns'}},keyboardLayout:'janko-four-row',profileSha256:'geometry',pages:['svg'],score,
  seats:score.notes.map((n,i)=>({id:`s${i}`,ownerIds:[n.id],writtenBar:bars.findLastIndex(t=>t<=n.startTick)+1,contactId:`c${i}`,actionId:`a${i}`,page:0,system:0,x:i,baseline:0,fontSize:12,pitchDigit:'1'}))} as unknown as ScorePackage;
}
const p=packaged(buildSchumannNo13MusicXmlImport().score),bars=p.score.sourceBarTicks!;
/** The first right-hand note of a bar. No. 13 writes bar 10 out again as bar 20: the two passes of one folded note. */
const opening=(bar:number)=>p.score.notes.filter(n=>n.hand==='RH'&&n.startTick>=bars[bar-1]&&n.startTick<bars[bar]).sort((x,y)=>x.startTick-y.startTick||(x.id<y.id?-1:1))[0].id;
const first=opening(10),second=opening(20);
const seatOf=(id:string)=>p.seats.find(s=>s.ownerIds.includes(id))!;
const at='2026-10-23T00:00:00.000Z';
let decisions=0;
const press=(hand:PersonalHand,ownerIds:readonly string[]):PersonalMemoryAction[]=>ownerIds.map(ownerId=>({kind:'hand',ownerId,hand,decisionId:`d${++decisions}`,authoredAt:at,...(ownerIds.length>1?{passes:[...ownerIds]}:{})}));
async function accepting(s:PersonalState,actions:readonly PersonalMemoryAction[]):Promise<PersonalState>{
 class Locks implements AssistanceBrowserLocks {private tail:Promise<unknown>=Promise.resolve();request<T>(_name:string,callback:()=>Promise<T>):Promise<T>{const next=this.tail.then(callback);this.tail=next.catch(()=>{});return next;}}
 const data=new Map<string,string>(),store=browserAssistanceStore({getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);}},new Locks());
 const input={entryId:'no13',importedAt:at,p,personal:s},session=new PersonalMemorySession(store,{scanLibrary:async()=>[structuredClone(input)],validateInputs:async()=>true});
 await session.initialize();
 let personal=s;
 for(const action of actions){const receipt=session.accept({...input,personal},action);await receipt.saved;personal=receipt.personal;}
 return personal;
}
/** Every stored hand on either pass, as "bar hand[ scope][ +intent]". */
const stored=(s:PersonalState)=>Object.values(s.assignments?.choices??{}).filter(c=>c.hand!==undefined).map(c=>`${p.seats.find(seat=>seat.ownerIds.includes(c.ownerId))!.writtenBar} ${c.hand}${c.handScope?` ${c.handScope}`:''}${c.intent?.hand?' +intent':''}`).sort();
const hands=(s:PersonalState)=>[first,second].map(id=>handFor(p,s,id));

test('No. 13 bars 10 and 20 are one folded note: L at bar 10 reaches bar 20',async()=>{
 assert.equal(p.score.notes.find(n=>n.id===first)!.hand,'RH');assert.equal(p.score.notes.find(n=>n.id===second)!.hand,'RH');
 const left=await accepting(initialPersonal(p),press('LH',[first]));
 assert.equal(handRecurrences(p,left).carried.get(second)?.hand,'LH');
 assert.deepEqual(hands(left),['LH','LH']);
});
for(const [where,order] of [['first, second',[first,second]],['second, first',[second,first]]] as const)
 test(`L at the first pass, then R on the folded note (${where}), stores nothing`,async()=>{
  const left=await accepting(initialPersonal(p),press('LH',[first]));
  const right=await accepting(left,press('RH',order));
  assert.deepEqual(stored(right),[]);
  assert.deepEqual(hands(right),['RH','RH']);
 });
for(const [where,order] of [['first, second',[first,second]],['second, first',[second,first]]] as const)
 test(`L stored at the second pass only, then R on the folded note (${where}), stores nothing`,async()=>{
  const left=await accepting(initialPersonal(p),press('LH',[second]));
  assert.deepEqual(hands(left),['LH','LH'],'bar 20 carries back to bar 10');
  const right=await accepting(left,press('RH',order));
  assert.deepEqual(stored(right),[]);
  assert.deepEqual(hands(right),['RH','RH']);
 });
for(const [where,order] of [['first, second',[first,second]],['second, first',[second,first]]] as const)
 test(`an edit on the written-out second pass (L and finger 3), then R on the folded note (${where}), keeps the finger and stores no hand`,async()=>{
  const written=assigned(p,await accepting(initialPersonal(p),press('LH',[second])),seatOf(second),{finger:3});
  const right=await accepting(written,press('RH',order));
  assert.deepEqual(stored(right),[]);
  assert.deepEqual(hands(right),['RH','RH']);
  assert.equal(right.assignments?.choices[second]?.finger,3,'the finger written at bar 20 stays');
 });
test('L on the folded note, in either order, gives every pass the same hand',async()=>{
 for(const order of [[first,second],[second,first]]){
  const left=await accepting(initialPersonal(p),press('LH',order));
  assert.deepEqual(hands(left),['LH','LH']);
  const back=await accepting(left,press('RH',order));
  assert.deepEqual(stored(back),[],'R after L leaves nothing');
 }
});
test('a folded press saved to the journal replays as it applied; an intent saved without passes still loads; malformed passes are refused',async()=>{
 const left=await accepting(initialPersonal(p),press('LH',[first]));
 // Every write of the press, so recovery can start from the journal while it still holds the press.
 class Locks implements AssistanceBrowserLocks {private tail:Promise<unknown>=Promise.resolve();request<T>(_name:string,callback:()=>Promise<T>):Promise<T>{const next=this.tail.then(callback);this.tail=next.catch(()=>{});return next;}}
 const snapshots:Map<string,string>[]=[],data=new Map<string,string>();
 const session=(data:Map<string,string>,snaps?:Map<string,string>[])=>{const store=browserAssistanceStore({getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);snaps?.push(new Map(data));}},new Locks());const input={entryId:'no13',importedAt:at,p,personal:left};return {input,session:new PersonalMemorySession(store,{scanLibrary:async()=>[structuredClone(input)],validateInputs:async()=>true})};};
 const live=session(data,snapshots);await live.session.initialize();
 let personal=left;for(const action of press('RH',[second,first])){const receipt=live.session.accept({...live.input,personal},action);await receipt.saved;personal=receipt.personal;}
 let replayed:PersonalState|undefined;
 for(const snap of snapshots){const later=session(new Map(snap));await later.session.initialize();if(!later.session.recovery.some(i=>i.action.kind==='hand'&&i.action.passes))continue;await later.session.retry();replayed=later.session.personalFor(later.input);break;}
 assert.ok(replayed,'the journal held the press');assert.deepEqual(stored(replayed!),stored(personal));assert.deepEqual(stored(replayed!),[]);
 const fresh=session(new Map());await fresh.session.initialize();
 const intent=fresh.session.capture(fresh.input,press('RH',[first,second])[0]),read=(raw:unknown)=>(fresh.session as unknown as {readIntent(raw:unknown):{action:{passes?:string[]}}}).readIntent(raw);
 const old=structuredClone(intent) as {action:{passes?:string[]}};delete old.action.passes;assert.equal(read(old).action.passes,undefined);
 for(const passes of [['another','one'],'one',[first,''],[]])assert.throws(()=>read({...intent,action:{...intent.action,passes}}),/Invalid pending personal fingering intent/,JSON.stringify(passes));
});
