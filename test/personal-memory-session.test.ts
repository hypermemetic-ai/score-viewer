import test from 'node:test';
import assert from 'node:assert/strict';
import {browserAssistanceStore,type AssistanceStore,type AssistanceBrowserLocks} from '../src/durable-assistance-store';
import {PersonalMemorySession,personalMemoryDocument,rawMemoryPersonal,type PersonalMemoryAction} from '../src/personal-memory-session';
import {initialPersonal,personalStorageName,type PersonalState} from '../src/state';
import type {ScorePackage} from '../src/package';
import type {MemoryScoreInput} from '../src/personal-fingering-memory';
import {canonicalJson} from '../src/piano-preparation-identity';

class Locks implements AssistanceBrowserLocks {
 private tail:Promise<unknown>=Promise.resolve();
 request<T>(_name:string,callback:()=>Promise<T>):Promise<T>{const next=this.tail.then(callback);this.tail=next.catch(()=>{});return next;}
}
function storage(){const data=new Map<string,string>(),locks=new Locks();return browserAssistanceStore({getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);}},locks);}
/** Both clients prepare an effective write against old state. The selected
 * winner commits first, forcing the other to replay its captured intent after
 * a real stale-revision rejection. Promise await order alone cannot do that. */
function concurrentStores(winner:'a'|'b'){
 const base=storage();let armed=false,conflicts=0,ready!:()=>void,committed!:()=>void;
 const loserPrepared=new Promise<void>(resolve=>{ready=resolve;}),winnerCommitted=new Promise<void>(resolve=>{committed=resolve;});
 const client=(id:'a'|'b'):AssistanceStore=>({read:key=>base.read(key),commit:async input=>{
  if(!armed||!input.changes[personalMemoryDocument])return base.commit(input);
  if(id===winner){await loserPrepared;const result=await base.commit(input);if(result.status==='committed')committed();return result;}
  ready();await winnerCommitted;const result=await base.commit(input);if(result.status==='conflict')conflicts++;return result;
 }});
 return{a:client('a'),b:client('b'),arm:()=>{armed=true;},conflicts:()=>conflicts};
}
function fixture(entryId='piece',lefts=[48,48,50,50]):MemoryScoreInput {
 const notes=lefts.flatMap((left,b)=>[left,60,64].map((pitch,j)=>({eventKind:'pitched',id:`b${b}n${j}`,pitch:{octave:Math.floor(pitch/12),pitchClass:pitch%12},startTick:b*192+j*24,durationTicks:24,hand:j?'RH':'LH'})));
 const p={manifest:{version:1,revision:'revision',metadata:{title:'Fixture'}},keyboardLayout:'janko-four-row',profileSha256:'geometry',pages:['svg'],score:{id:entryId,ticksPerBeat:48,totalTicks:lefts.length*192,sourceBarTicks:Array.from({length:lefts.length+1},(_,i)=>192*i),notes},seats:notes.map((n,i)=>({id:`s${i}`,ownerIds:[n.id],writtenBar:Math.floor(i/3)+1,contactId:`c${i}`,actionId:`a${i}`,page:0,system:0,x:i,baseline:0,fontSize:12,pitchDigit:'1'}))} as unknown as ScorePackage;
 return{entryId,importedAt:'2020-01-01',p,personal:initialPersonal(p)};
}
function choose(input:MemoryScoreInput,id:string,finger:number,date='2020-02-01',known=true){
 const n=input.p.score.notes.find(n=>n.id===id)! as any;input.personal.assignments??={version:'personal-owner-assignments-v1',sourceRevision:'revision',choices:{}};
 const lineage=`${input.entryId}:${id}:${date}`;input.personal.assignments.choices[id]={ownerId:id,guard:{pitch:n.pitch.octave*12+n.pitch.pitchClass,startTick:n.startTick,durationTicks:n.durationTicks},original:{hand:n.hand},finger,createdAt:date,...(known?{intent:{finger:{decisionId:lineage,lineageId:lineage,authoredAt:date}}}:{})};return input;
}
const action=(ownerId:string,finger:1|2|3|4|5|null|'inherit',decisionId=`${ownerId}:${finger}`):PersonalMemoryAction=>({kind:'finger',edit:{ownerId,finger,decisionId,authoredAt:'2025-01-01'}});
const session=(store:AssistanceStore,inputs:MemoryScoreInput[])=>new PersonalMemorySession(store,{scanLibrary:async()=>structuredClone(inputs),validateInputs:async()=>true});
const finger=(s:PersonalMemorySession,input:MemoryScoreInput,id:string)=>s.resolve(input).assignments.find(a=>a.id===id)?.finger;
async function load(s:PersonalMemorySession,input:MemoryScoreInput){return s.loadPersonalCurrent({id:input.entryId,importedAt:input.importedAt!},input.p,async()=>input.personal);}

test('full-library bootstrap is deterministic and durable raw personal wins over legacy',async()=>{
 const a=choose(fixture('a'),'b0n1',2),b=choose(fixture('b'),'b0n1',3,'2021-01-01'),store=storage(),s=session(store,[b,a]);await s.initialize();
 assert.equal(finger(s,a,'b1n1'),2);assert.equal(finger(s,b,'b0n1'),3);
 let legacyReads=0;const personal=await s.loadPersonalCurrent({id:'a',importedAt:a.importedAt!},a.p,async()=>{legacyReads++;return initialPersonal(a.p);});
 assert.equal(legacyReads,0);assert.equal(personal.assignments?.choices.b0n1.finger,2);
 const other=session(storage(),[a,b]);await other.initialize();assert.deepEqual(s.memory,other.memory);
});
test('bootstrap rejects changing legacy input before activating any partial index',async()=>{
 const store=storage(),s=new PersonalMemorySession(store,{scanLibrary:async()=>[fixture()],validateInputs:async()=>false});await assert.rejects(s.initialize(),/changed during indexing/);
 assert.equal((await store.read()).revision,0);
});
test('opening an ordinary score indexes prepared companion identities longer than a physical filename',async()=>{
 const selected=fixture('selected'),prepared=fixture('a'.repeat(64));
 Object.assign(prepared.p,{manifest:{...prepared.p.manifest,version:2,revision:'d'.repeat(64)},sourceRevision:'a'.repeat(64),profileId:'fixture-profile',profileSha256:'b'.repeat(64),effectiveHandSha256:'c'.repeat(64),preparationIdentity:{version:1}});
 prepared.personal=initialPersonal(prepared.p);
 const key=personalStorageName(prepared.entryId,prepared.p);assert.equal(key.length,285);
 const store=storage(),s=session(store,[selected,prepared]);await s.initialize();await load(s,selected);
 const saved=await store.read();assert.ok(saved.documents[key]);assert.deepEqual(saved.documents[key],prepared.personal);
 const reopened=session(store,[selected,prepared]);await reopened.initialize();assert.deepEqual(await load(reopened,prepared),prepared.personal);assert.ok((await store.read()).documents[key]);
});
test('newly imported score registers custody and saved differences without reimporting stale authored source values on reload',async()=>{
 const input=choose(fixture('first'),'b0n1',2),store=storage(),s=session(store,[input]);await s.initialize();
 const added=choose(fixture('new'),'b0n1',3,'2021-01-01');await load(s,added);assert.equal(finger(s,added,'b0n1'),3);assert.ok(Object.values(s.memory.occurrences).some(r=>r.entryId==='new'));
 await s.accept(input,action('b0n1',5,'new-shared')).saved;await load(s,input);
 assert.equal(finger(s,input,'b1n1'),5);assert.equal(finger(s,added,'b0n1'),3);
});
test('same-key companion revision rebind retains latest choices and rejects any changed source binding',async()=>{
 const input=fixture();Object.assign(input.p,{sourceRevision:'revision',profileId:'profile',effectiveHandSha256:'hands'});input.p.manifest.version=2;input.personal=initialPersonal(input.p);choose(input,'b0n1',2);
 const store=storage(),s=session(store,[input]);await s.initialize();const before=await store.read(),companion=structuredClone(input.p);companion.manifest.revision='header-edition';
 assert.equal(personalStorageName('piece',companion),personalStorageName('piece',input.p));
 const loaded=await s.loadPersonalCurrent({id:'piece',importedAt:input.importedAt!},companion,async()=>{throw Error('Unexpected legacy fallback');});assert.equal(loaded.revision,'header-edition');assert.equal(loaded.assignments?.choices.b0n1.finger,2);
 assert.equal((await store.read()).previous,before.id);assert.equal((await store.read(before.id!)).documents[personalStorageName('piece',input.p)]!==undefined,true);
 // A corrupt value at the expected key cannot use the companion exception to
 // bypass the immutable source binding.
 const current=await store.read(),bad={...loaded,binding:{...loaded.binding!,sourceRevision:'different'}};await store.commit({expectedRevision:current.revision,changes:{[personalStorageName('piece',companion)]:bad}});
 await assert.rejects(s.loadPersonalCurrent({id:'piece',importedAt:input.importedAt!},companion,async()=>initialPersonal(companion)),/differs/);
});
test('two application sessions replay source-bound additions on latest raw personal without losing either',async()=>{
 const input=fixture(),store=storage(),a=session(store,[input]),b=session(store,[input]);await a.initialize();await b.initialize();
 const x=a.accept(input,action('b0n1',2,'first')),y=b.accept(input,action('b0n2',4,'second'));
 assert.equal(finger(a,{...input,personal:x.personal},'b3n1'),2);
 await Promise.all([x.saved,y.saved]);const raw=await load(a,input);assert.equal(raw.assignments?.choices.b0n1.finger,2);assert.equal(raw.assignments?.choices.b0n2.finger,4);
 assert.equal(finger(a,{...input,personal:raw},'b3n2'),4);assert.deepEqual(a.recovery,[]);
});
for(const winner of ['a','b'] as const)test(`concurrent additions replay after CAS conflict with ${winner} committing first`,{timeout:5000},async()=>{
 const input=fixture(),stores=concurrentStores(winner),a=session(stores.a,[input]),b=session(stores.b,[input]);await a.initialize();await b.initialize();stores.arm();
 const first=a.accept(input,action('b0n1',2,'a')),second=b.accept(input,action('b1n1',3,'b'));
 assert.equal(first.intent.action.kind==='finger'&&first.intent.action.edit.captured?.operation,'add');assert.equal(second.intent.action.kind==='finger'&&second.intent.action.edit.captured?.operation,'add');
 await Promise.all([first.saved,second.saved]);assert.ok(stores.conflicts()>0,'the losing effective write must encounter a stale revision');
 const raw=await load(a,input),effective={...input,personal:raw};assert.equal(finger(a,effective,'b3n1'),winner==='a'?2:3);assert.equal(finger(a,effective,'b0n1'),2);assert.equal(finger(a,effective,'b1n1'),3);
 assert.equal(a.resolve(effective).byOwner[winner==='a'?'b1n1':'b0n1'].finger?.provenance,'local');
});
test('captured missing-field addition becomes local even when the concurrent winner makes that same owner the reference',{timeout:5000},async()=>{
 const input=fixture(),stores=concurrentStores('a'),a=session(stores.a,[input]),b=session(stores.b,[input]);await a.initialize();await b.initialize();stores.arm();
 const first=a.accept(input,action('b0n1',2,'a')),second=b.accept(input,action('b0n1',3,'b'));await Promise.all([first.saved,second.saved]);assert.ok(stores.conflicts()>0);
 const raw=await load(a,input),effective={...input,personal:raw};assert.equal(finger(a,effective,'b3n1'),2);assert.equal(finger(a,effective,'b0n1'),3);
 const resolution=a.resolve(effective).byOwner.b0n1;assert.equal(resolution.finger?.provenance,'local');assert.equal(resolution.reference?.writtenBar,1);
});
test('view save merges latest authority and never stores transient resolved fingers',async()=>{
 const input=fixture(),store=storage(),a=session(store,[input]),b=session(store,[input]);await a.initialize();await b.initialize();
 const entered=a.accept(input,action('b0n1',2));await entered.saved;
 const stale=structuredClone(input.personal) as PersonalState&{memoryResolved?:unknown};stale.view.rotation=90;stale.memoryResolved={revision:999,sourceRevision:'revision',choices:{b3n1:{finger:5}}};
 await b.saveView({...input,personal:stale});const raw=await load(a,input);assert.equal(raw.view.rotation,90);assert.equal(raw.assignments?.choices.b0n1.finger,2);assert.equal((raw as any).memoryResolved,undefined);
 assert.equal((rawMemoryPersonal(stale) as any).memoryResolved,undefined);
});
test('failed effective commit leaves durable source intent recoverable after restart',async()=>{
 const input=fixture(),base=storage();let fail=false;
 const store:AssistanceStore={read:id=>base.read(id),commit:async args=>{if(fail&&args.changes[personalMemoryDocument])throw Error('disk full');return base.commit(args);}};
 const first=session(store,[input]);await first.initialize();fail=true;const accepted=first.accept(input,action('b0n1',2));await assert.rejects(accepted.saved,/disk full/);
 assert.equal(first.recovery.length,1);assert.equal((await base.read()).documents[personalStorageName(input.entryId,input.p)]!==undefined,true);
 const restarted=session(store,[input]);await restarted.initialize();assert.equal(restarted.recovery.length,1);assert.throws(()=>restarted.accept(input,action('b0n2',4)),/paused/);
 fail=false;await restarted.retry();const raw=await load(restarted,input);assert.equal(raw.assignments?.choices.b0n1.finger,2);assert.equal(finger(restarted,{...input,personal:raw},'b3n1'),2);assert.equal(restarted.recovery.length,0);
});
test('fingers entered while a save is running persist together, in order, and stay recoverable together',async()=>{
 const input=fixture(),base=storage();let gate!:()=>void,held=false,fail=false;const opened=new Promise<void>(r=>{gate=r;}),commits:string[][]=[];
 const store:AssistanceStore={read:id=>base.read(id),commit:async args=>{commits.push(Object.keys(args.changes));if(held){held=false;await opened;}if(fail&&args.changes[personalMemoryDocument])throw Error('disk full');return base.commit(args);}};
 const s=session(store,[input]);await s.initialize();commits.length=0;held=true;
 // The store holds the first commit; all five fingers, one note twice, wait together.
 const ids=['b0n1','b1n1','b1n2','b2n1','b1n1'],saves=ids.map((id,i)=>s.accept(input,action(id,((i%5)+1) as 1|2|3|4|5,`${id}:${i}`)).saved);
 fail=true;gate();await assert.rejects(Promise.all(saves),/disk full/);
 // A batch that fails leaves every one of its decisions journalled for recovery.
 assert.equal(s.recovery.length,5);fail=false;await s.retry();assert.equal(s.recovery.length,0);
 const raw=await load(s,input);assert.equal(raw.assignments?.choices.b0n1.finger,1);assert.equal(raw.assignments?.choices.b1n2.finger,3);assert.equal(raw.assignments?.choices.b2n1.finger,4);
 assert.equal(raw.assignments?.choices.b1n1.finger,5,'the later of two decisions on one note wins');
 assert.deepEqual((await base.read()).documents['personal-fingering-pending'],{});
 // Before: two commits per finger. Now the held finger, then one stage and one apply for the rest.
 const durable=commits.filter(keys=>keys.includes(personalMemoryDocument)).length;assert.ok(durable<=3,`${durable} effective commits`);
});
test('decisions journalled together replay in the order they were made after a restart on a key-sorting store',async()=>{
 const input=fixture(),underlying=storage(),reorder=<T>(value:T):T=>JSON.parse(canonicalJson(value));let fail=false;
 // Like the native store: JSON objects come back with sorted keys, so journal order is lost.
 const store:AssistanceStore={read:async id=>reorder(await underlying.read(id)),commit:async args=>{if(fail&&args.changes[personalMemoryDocument])throw Error('disk full');return reorder(await underlying.commit(reorder(args)));}};
 const first=session(store,[input]);await first.initialize();fail=true;
 // The correction's id sorts before the original's.
 const saves=[first.accept(input,action('b0n1',3,'z-original')),first.accept(input,action('b0n1',5,'a-correction'))].map(a=>a.saved);
 await assert.rejects(Promise.all(saves),/disk full/);assert.equal(first.recovery.length,2);
 const restarted=session(store,[input]);await restarted.initialize();assert.deepEqual(restarted.recovery.map(i=>i.id),['z-original','a-correction']);
 fail=false;await restarted.retry();const raw=await load(restarted,input);assert.equal(raw.assignments?.choices.b0n1.finger,5);assert.equal(restarted.recovery.length,0);
});
test('a view save refused during recovery does not cancel the earlier one waiting for it',async()=>{
 const input=fixture(),base=storage();let fail=false;const store:AssistanceStore={read:id=>base.read(id),commit:args=>{if(fail)throw Error('temporary write failure');return base.commit(args);}};
 const s=session(store,[input]);await s.initialize();fail=true;await assert.rejects(s.accept(input,action('b0n1',2)).saved,/temporary/);
 const kept=structuredClone(input.personal);kept.view.rotation=90;await assert.rejects(s.saveView({...input,personal:kept}),/temporary/);fail=false;
 const retrying=s.retry(),refused=structuredClone(input.personal);refused.view.rotation=180;
 await assert.rejects(s.saveView({...input,personal:refused}),/maintenance/);await retrying;
 const raw=await load(s,input);assert.equal(raw.view.rotation,90);assert.equal(raw.assignments?.choices.b0n1.finger,2);
});
test('lost commit acknowledgement retries without re-authoring the accepted decision',async()=>{
 const input=fixture(),base=storage();let lose=false;
 const store:AssistanceStore={read:id=>base.read(id),commit:async args=>{const result=await base.commit(args);if(lose&&args.changes[personalMemoryDocument]){lose=false;throw Error('reply lost');}return result;}};
 const s=session(store,[input]);await s.initialize();lose=true;await assert.rejects(s.accept(input,action('b0n1',2)).saved,/reply lost/);
 const revision=(await base.read()).revision;await s.retry();assert.equal((await base.read()).revision,revision);assert.equal(s.recovery.length,0);
});
test('native reordered pending records save and retain genuine collision protection',async()=>{
 const input=fixture(),base=storage();let alter=false;
 const reorder=<T>(value:T):T=>JSON.parse(canonicalJson(value));
 const store:AssistanceStore={read:async id=>reorder(await base.read(id)),commit:async args=>{
  const serialized=reorder(args),pending=serialized.changes['personal-fingering-pending'] as Record<string,any>|undefined;
  if(alter&&pending)for(const intent of Object.values(pending))intent.action.edit.finger=5;
  return reorder(await base.commit(serialized));
 }};
 const s=session(store,[input]);await s.initialize();await s.accept(input,action('b0n1',2,'native-first')).saved;
 let raw=await load(s,input);assert.equal(raw.assignments?.choices.b0n1.finger,2);assert.equal(s.recovery.length,0);
 alter=true;await assert.rejects(s.accept({...input,personal:raw},action('b0n2',4,'native-collision')).saved,/identity was reused/);
 raw=(await base.read()).documents[personalStorageName(input.entryId,input.p)] as unknown as PersonalState;
 assert.equal(raw.assignments?.choices.b0n2,undefined);assert.equal(s.recovery.length,1);
});
test('existing native pending choice can be recovered without changing its decision identity',async()=>{
 const input=fixture(),underlying=storage(),reorder=<T>(value:T):T=>JSON.parse(canonicalJson(value));
 const base:AssistanceStore={read:async id=>reorder(await underlying.read(id)),commit:async args=>reorder(await underlying.commit(reorder(args)))};
 const s=session(base,[input]);await s.initialize();
 const intent=s.capture(input,action('b0n1',4,'existing-native-pending')),before=await base.read();
 await base.commit({expectedRevision:before.revision,changes:{'personal-fingering-pending':JSON.parse(canonicalJson({[intent.id]:intent}))}});
 const reopened=session(base,[input]);await reopened.initialize();
 // Opening must not misidentify the unchanged native record as a new score and
 // enqueue a write behind the failed save before the recovery control can show.
 const stagedRevision=(await base.read()).revision;await load(reopened,input);assert.equal((await base.read()).revision,stagedRevision);
 await reopened.retry();
 const raw=await load(reopened,input);assert.equal(raw.assignments?.choices.b0n1.finger,4);
 assert.equal(raw.assignments?.choices.b0n1.intent?.finger?.decisionId,intent.id);assert.equal(reopened.recovery.length,0);
});
test('retry also preserves an ordered failed view save without replacing newer personal authority',async()=>{
 const input=fixture(),base=storage();let fail=false;const store:AssistanceStore={read:id=>base.read(id),commit:args=>{if(fail)throw Error('temporary write failure');return base.commit(args);}};
 const s=session(store,[input]);await s.initialize();const entered=s.accept(input,action('b0n1',2));await entered.saved;fail=true;
 const view=structuredClone(input.personal);view.view.rotation=90;await assert.rejects(s.saveView({...input,personal:view}),/temporary/);fail=false;await s.retry();const raw=await load(s,input);assert.equal(raw.view.rotation,90);assert.equal(raw.assignments?.choices.b0n1.finger,2);
});
test('ordered optimistic entry retains selected owners and hand edits do not author displayed fingers',async()=>{
 const input=choose(fixture(),'b0n1',2),s=session(storage(),[input]);await s.initialize();
 const first=s.accept(input,action('b1n2',4)),second=s.accept({...input,personal:first.personal},action('b2n1',3));await Promise.all([first.saved,second.saved]);
 const raw=await load(s,input);assert.equal(raw.assignments?.choices.b1n2.finger,4);assert.equal(raw.assignments?.choices.b2n1.finger,3);
 const hand=s.accept({...input,personal:raw},{kind:'hand',ownerId:'b3n1',hand:'LH',decisionId:'hand',authoredAt:'2025-02-01'});await hand.saved;
 assert.equal(hand.personal.assignments?.choices.b3n1.hand,'LH');assert.equal(hand.personal.assignments?.choices.b3n1.intent?.finger,undefined);
 assert.equal(finger(s,{...input,personal:hand.personal},'b3n1'),2);
});
test('consolidation atomically retains originals and receipt; retries preserve later local exceptions',async()=>{
 const input=choose(choose(fixture(),'b0n1',2),'b2n1',3,'2021-01-01',false);choose(input,'b2n2',4,'2022-01-01',false);
 const store=storage(),s=session(store,[input]);await s.initialize();const before=await store.read();
 const receipt=await s.consolidate({entryIds:['piece'],receiptId:'one-time',isSafe:()=>true,sourceRevisions:{piece:'revision'}});assert.equal(receipt.replaced.length,1);
 let raw=await load(s,input);assert.equal(finger(s,{...input,personal:raw},'b3n1'),2);assert.equal(finger(s,{...input,personal:raw},'b3n2'),4);
 const after=await store.read(),backupName=Object.keys(after.documents).find(key=>key.endsWith('/originals'))!;assert.deepEqual((after.documents[backupName] as any).personal[personalStorageName('piece',input.p)],input.personal);assert.equal(after.previous,before.id);
 const local=s.accept({...input,personal:raw},action('b3n1',5,'later'));await local.saved;const revision=(await store.read()).revision;
 await s.consolidate({entryIds:['piece'],receiptId:'one-time',isSafe:()=>false});raw=await load(s,input);assert.equal(finger(s,{...input,personal:raw},'b3n1'),5);assert.equal((await store.read()).revision,revision);
});
test('unsafe or changing migration inputs leave memory, raw state, and completion absent',async()=>{
 const input=choose(fixture(),'b0n1',2),store=storage();let valid=true;
 const s=new PersonalMemorySession(store,{scanLibrary:async()=>[input],validateInputs:async()=>valid});await s.initialize();const before=await store.read();
 await assert.rejects(s.consolidate({entryIds:['piece'],receiptId:'unsafe',isSafe:()=>false}),/waits until practice/);
 valid=false;await assert.rejects(s.consolidate({entryIds:['piece'],receiptId:'changed',isSafe:()=>true}),/inputs changed/);assert.equal((await store.read()).id,before.id);
});
test('restore calculated masks reuse without deleting shared knowledge; entry and reset clear the mask',async()=>{
 const input=choose(fixture(),'b0n1',2);input.p.fingerLayer={attacks:input.p.score.notes.map(n=>({id:`a:${n.id}`,finger:1,owners:[{id:n.id}]})),sourceOwnerToAttack:Object.fromEntries(input.p.score.notes.map(n=>[n.id,`a:${n.id}`]))} as any;
 const s=session(storage(),[input]);await s.initialize();
 const restored=s.accept(input,{kind:'calculated',ownerId:'b1n1',decisionId:'calculated',authoredAt:'2025-01-01'});await restored.saved;
 assert.equal(restored.personal.calculatedOwners?.b1n1,true);assert.equal(finger(s,{...input,personal:restored.personal},'b0n1'),2);assert.equal(finger(s,{...input,personal:restored.personal},'b1n1'),1);
 const same=s.accept({...input,personal:restored.personal},action('b1n1',2,'inherit-value'));await same.saved;
 assert.equal(same.personal.calculatedOwners?.b1n1,undefined);assert.equal(same.personal.assignments?.choices.b1n1,undefined);assert.equal(finger(s,{...input,personal:same.personal},'b1n1'),2);
 const another=s.accept({...input,personal:same.personal},{kind:'calculated',ownerId:'b1n1',decisionId:'calculated-again',authoredAt:'2025-01-01'});await another.saved;
 const local=s.accept({...input,personal:another.personal},action('b1n1',4,'local-after-calc'));await local.saved;
 assert.equal(finger(s,{...input,personal:local.personal},'b0n1'),2);assert.equal(finger(s,{...input,personal:local.personal},'b1n1'),4);
 const reset=s.accept({...input,personal:local.personal},{kind:'reset',ownerId:'b1n1',decisionId:'reset',authoredAt:'2025-01-01'});await reset.saved;assert.equal(finger(s,{...input,personal:reset.personal},'b1n1'),2);
});
test('restore-all and undo preserve current global knowledge and restore raw hand authority and previous masks',async()=>{
 const input=choose(fixture(),'b0n1',2),choice=input.personal.assignments!.choices.b0n1;choice.hand='LH';choice.intent!.hand={decisionId:'old-hand',lineageId:'old-hand',authoredAt:'2020-01-01'};
 input.personal.calculatedOwners={b2n2:true};const store=storage(),a=session(store,[input]),b=session(store,[input]);await a.initialize();await b.initialize();
 const restored=a.accept(input,{kind:'restoreAll',ownerId:'b0n1',decisionId:'restore-all',authoredAt:'2025-01-01'});await restored.saved;
 assert.equal(restored.personal.assignments,undefined);assert.equal(Object.keys(restored.personal.calculatedOwners!).length,input.p.score.notes.length);
 const concurrentRaw=await load(b,input);await b.accept({...input,personal:concurrentRaw},action('b0n1',5,'other-shared')).saved;
 const undo=a.accept({...input,personal:restored.personal},{kind:'undoRestore',ownerId:'b0n1',decisionId:'undo-all',authoredAt:'2025-01-01'});await undo.saved;
 assert.equal(undo.personal.assignments?.choices.b0n1.hand,'LH');assert.deepEqual(undo.personal.calculatedOwners,{b2n2:true});
 const raw=await load(a,input);assert.equal(finger(a,{...input,personal:raw},'b1n1'),5);assert.equal(finger(a,{...input,personal:raw},'b0n1'),5);
});

test('cache generation changes when equal-revision optimistic authority is replaced during save',async()=>{
 const input=fixture(),s=session(storage(),[input]);await s.initialize();const initial=s.memoryGeneration;assert.equal(s.memoryGeneration,initial);
 const accepted=s.accept(input,action('b0n1',2,'cache-generation')),optimisticRevision=s.memoryRevision,optimisticGeneration=s.memoryGeneration;
 assert.ok(optimisticGeneration>initial);assert.equal(s.memoryGeneration,optimisticGeneration);
 await accepted.saved;assert.equal(s.memoryRevision,optimisticRevision);assert.ok(s.memoryGeneration>optimisticGeneration);
 const durableGeneration=s.memoryGeneration;input.personal.view.page=1;await s.saveView(input);assert.equal(s.memoryGeneration,durableGeneration);
});
test('reopening reads stored memory once per change and still registers what another session removed',async()=>{
 const a=choose(fixture('a'),'b0n1',2),b=fixture('b'),store=storage(),s=session(store,[a,b]);await s.initialize();
 const registered=async()=>Object.values(((await store.read()).documents[personalMemoryDocument] as any).occurrences).filter((o:any)=>o.entryId==='a').length;
 const indexed=await registered();assert.ok(indexed);
 const first=await load(s,a),revision=(await store.read()).revision;
 // The same score again, as its own fresh package: nothing to write, the same hands.
 assert.deepEqual(await load(s,{...a,p:structuredClone(a.p)}),first);assert.equal((await store.read()).revision,revision);
 assert.ok(s.storedRefs('a')?.length);assert.deepEqual(s.storedRefs('missing'),[]);
 // Another application session forgets the score; the next opening registers it again.
 const other=session(store,[a,b]);await other.initialize();await other.deleteEntry('a');assert.equal(await registered(),0);
 await load(s,a);assert.equal(await registered(),indexed);assert.equal(finger(s,a,'b0n1'),2);
});
test('turning pages or rotating the view does not make opening project the score for memory again',async()=>{
 const input=choose(fixture('a'),'b0n1',2),store=storage(),s=session(store,[input]);await s.initialize();
 const snapshot=await store.read(),inner=s as unknown as {known(snapshot:unknown,candidate:MemoryScoreInput):boolean;projected:Map<string,unknown>};
 const registered=inner.known(snapshot,input),projected=inner.projected.size;assert.ok(projected>0);
 const looking=structuredClone(input);looking.personal.view={...looking.personal.view,page:3,rotation:90};looking.personal.editContactId='c1';
 assert.equal(inner.known(snapshot,looking),registered);assert.equal(inner.projected.size,projected,'only where the reader looks changed');
 inner.known(snapshot,choose(structuredClone(input),'b1n1',4,'2021-01-01'));assert.ok(inner.projected.size>projected,'a changed choice is projected');
});

test('reopening serves the state this session last saw, then checks it against the store after the pages show',async()=>{
 const base=storage();let reads=0;
 const store:AssistanceStore={read:async(...args)=>{reads++;return base.read(...args);},commit:input=>base.commit(input)};
 const a=choose(fixture('a'),'b0n1',2),c=choose(fixture('c'),'b0n1',4,'2021-01-01');
 const s=session(store,[a]);await s.initialize();await load(s,a);
 const open=(since:number,earlier:boolean)=>s.loadPersonalCurrent({id:'a',importedAt:a.importedAt!},a.p,async()=>a.personal,{since,earlier});
 // A same-session reopen reads nothing before its pages: this session wrote every change it made.
 let before=reads;const reopened=await open(performance.now(),true);
 assert.equal(reads,before);assert.equal(reopened.assignments?.choices.b0n1.finger,2);
 assert.equal(await s.confirmReading('a'),true);assert.equal(reads,before+1,'the check reads the store once, after the pages');
 assert.equal(await s.confirmReading('a'),true);assert.equal(reads,before+1,'a reading is checked once');
 // Without `earlier`, an opening that began after the last read reads the store.
 before=reads;await open(performance.now()+1,false);assert.equal(reads,before+1);
 assert.equal(await s.confirmReading('a'),true);assert.equal(reads,before+1,'it read the store itself, so there is nothing to check');
 // Another writer changes the fingering memory this score rests on: the check says so.
 const other=session(base,[a]);await other.initialize();await load(other,c);
 before=reads;await open(performance.now(),true);assert.equal(reads,before);
 assert.equal(await s.confirmReading('a'),false);
});

test('a score opened with registration later is registered by register(), not by opening',async()=>{
 const store=storage(),a=choose(fixture('a'),'b0n1',2),c=choose(fixture('c'),'b0n1',4,'2021-01-01');
 const s=session(store,[a]);await s.initialize();
 const memoryRef=async()=>(await store.read()).refs[personalMemoryDocument];
 const before=await memoryRef();
 const personal=await s.loadPersonalCurrent({id:'c',importedAt:c.importedAt!},c.p,async()=>c.personal,{register:'later'});
 assert.equal(personal.assignments?.choices.b0n1.finger,4);
 assert.equal(await memoryRef(),before,'opening wrote nothing');
 const registered=await s.register({id:'c',importedAt:c.importedAt!},c.p,personal);
 assert.equal(registered.assignments?.choices.b0n1.finger,4);
 assert.notEqual(await memoryRef(),before,'register() wrote the new score into memory');
 const eager=session(storage(),[a]);await eager.initialize();await load(eager,c);
 assert.deepEqual(s.memory,eager.memory,'later registration ends where opening would have');
});

test('a prefetched read serves the opening that began before it, and is dropped once this session writes past it',async()=>{
 const base=storage();let reads=0;
 const store:AssistanceStore={read:async(...args)=>{reads++;return base.read(...args);},commit:input=>base.commit(input)};
 const a=choose(fixture('a'),'b0n1',2),c=choose(fixture('c'),'b0n1',4,'2021-01-01');
 await session(base,[a]).initialize();
 const s=session(store,[a]);
 // A new session: the opening begins, prefetches, and initialises from that one read.
 let since=performance.now();s.prefetch();
 await s.loadPersonalCurrent({id:'a',importedAt:a.importedAt!},a.p,async()=>a.personal,{since,register:'later'});
 assert.equal(reads,1);
 // A prefetch older than this session's own later write is not used.
 s.prefetch();await load(s,c);
 since=performance.now();const before=reads;
 const personal=await s.loadPersonalCurrent({id:'c',importedAt:c.importedAt!},c.p,async()=>c.personal,{since});
 assert.equal(personal.assignments?.choices.b0n1.finger,4);
 assert.equal(reads,before+1,'the stale prefetch was dropped and the store read once');
});
test('a view save that changes nothing stored writes nothing; a changed view, or one another session moved, is written',async()=>{
 const input=fixture(),store=storage();let commits=0;
 const counting:AssistanceStore={read:id=>store.read(id),commit:input=>{commits++;return store.commit(input);}},s=session(counting,[input]);await s.initialize();await load(s,input);
 const rotation=async()=>((await store.read()).documents[personalStorageName(input.entryId,input.p)] as unknown as PersonalState).view.rotation;
 const written=commits,revision=(await store.read()).revision;
 // Leaving the view where it was (closing a score, switching its layout) writes nothing.
 await s.saveView(structuredClone(input));assert.equal(commits,written);assert.equal((await store.read()).revision,revision);
 input.personal.view.rotation=90;await s.saveView(input);assert.equal(commits,written+1);assert.equal(await rotation(),90);
 await s.saveView(structuredClone(input));assert.equal(commits,written+1);
 // Another session turned the view: saving this one's view writes it back.
 const other=session(store,[input]);await other.initialize();await other.saveView({...input,personal:{...structuredClone(input.personal),view:{...input.personal.view,rotation:180}}});
 assert.equal(await rotation(),180);await s.saveView(input);assert.equal(commits,written+2);assert.equal(await rotation(),90);
});
