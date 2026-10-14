import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {PersonalEditQueue} from '../src/personal-edit-queue';
import {personalMemoryBoundary} from './helpers/personal-memory-boundary';

// Exercise the production handover and new-mount bodies. The independent
// geometry, admission and durable storage boundaries can finish out of order.
const source=readFileSync(process.env.SCORE_VIEWER_PERSONAL_MAIN??new URL('../src/main.ts',import.meta.url),'utf8');
function body(start:string,end:string){const first=source.indexOf(start),last=source.indexOf(end,first);assert.ok(first>=0&&last>first,`Missing application body ${start}`);return stripTypeScriptTypes(source.slice(first,last));}
const deferred=()=>{let resolve!:(v?:any)=>void;const promise=new Promise<any>(r=>resolve=r);return {promise,resolve};};
const settle=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
const handFor=(p:any,s:any,id:string)=>s.choices[id]?.hand??p.baselines[s.calculatedVersion??0][id];

function fixture(){
 const p={sourceSha256:'immutable-source',score:{notes:[{id:'a'},{id:'b'}]},seats:[],pages:[{}],baselines:[{a:'LH',b:'RH'},{a:'RH',b:'RH'}]};
 const personal={view:{page:1,fingerSet:'yours'},overrides:{},choices:{a:{hand:'LH',finger:2}}};
 const target={entry:{id:'piece',file:'retained.isoscore'},package:p,personal:structuredClone(personal)};
 const settings={working:72,target:180,increase:3.6,countIn:2,cooldown:3,keepTempo:true};
 const evidence={leaf:{earned:[{at:123,tempo:96,correct:18,total:18}],done:true},join:{earned:[{at:456,tempo:108,correct:32,total:32}],done:false}};
 const snapshot={partition:'source-partition',composites:{join:['leaf-a','leaf-b']},preferences:settings,selected:'leaf-a',parent:'join',component:1,includeManual:true,mode:'timed',previousMode:'reading',passage:'leaf-a',window:[5,8]};
 const preparations:any[]=[],mounts:any[]=[],writes:any[]=[],errors:any[]=[],readerPaints:string[]=[];let context:any;
 let projection=async(s:any)=>({...p,notationHands:p.score.notes.map(n=>handFor(p,s,n.id)),choiceSnapshot:structuredClone(s)});
 let flush=async()=>{},save=async(s:any)=>{writes.push(structuredClone(s));},prepare=async(base:any,id:string,c:any,s:any)=>({state:{evidence:structuredClone(evidence),preferences:structuredClone(c.preferences)},plan:{hands:base.score.notes.map((n:any)=>handFor(base,s,n.id))}});
 class FakePracticeView{
  options:any;paused=0;closed=0;refits=0;flushes=0;state={evidence:structuredClone(evidence),preferences:structuredClone(settings)};
  constructor(_app:any,options:any){this.options=options;}
  pause(){this.paused++;}holdForPersonalChoices(){this.pause();}releasePersonalChoices(){}refit(){this.refits++;}close(){this.closed++;}
  contextSnapshot(){return structuredClone(snapshot);}
  async flush(){this.flushes++;await flush();}
  static async prepareContext(base:any,id:string,c:any,s:any){preparations.push({base,id,context:c,personal:s});return prepare(base,id,c,s);}
  async mount(c:any,admitted:any){this.state=admitted.state;mounts.push({owner:this,context:c,admitted,notation:this.options.package});}
 }
 const old=new FakePracticeView({}, {package:p,personal:structuredClone(personal)});
 let persist=Promise.resolve(),disk=structuredClone(personal);
 context={structuredClone,current:target,practice:old,selection:undefined,PracticeView:FakePracticeView,handFor,PersonalEditQueue,livePersonalEditors:new WeakMap(),
  PersonalPresentationSession:class{project(s:any){return projection(structuredClone(s));}},personalStorageName:()=> 'bound-personal',
  readPersonal:(s:any)=>structuredClone(s),personalContext:async(t:any)=>({p:t.package,file:'bound-personal'}),
  enqueue(fn:()=>Promise<any>){const result=persist.then(fn);persist=result.catch(()=>{});return result;},writeJson:async(_file:string,s:any)=>save(s),paintPersonalSaveError:(_t:any,error:any)=>errors.push(error),
  app:{querySelector:()=>null},readingPresentation:undefined,requirePianoCapability(){},resetInput(){},orientation:{rotation:0},actionControlLabel:()=>'',effectiveControls:()=>({}),controls:{match:()=>false},renderPages(){readerPaints.push('pages');},renderToolbar(){readerPaints.push('toolbar');},
  currentFingerPresentation:()=> 'annotations',preferences:{keyboardLayout:'conventional-piano'},musicalSustain:{snapshot:()=>({})},midiConnection:undefined,connectMidi(){},disconnectMidi(){},settings(){},entries:[target.entry],practiceSummaries:{record:()=>false},paintLibrarySummaries(){},render(){}};
 personalMemoryBoundary(context,()=>disk,async(s,kind)=>{if(kind==='intent')await save(s);disk=structuredClone(s);});
 runInNewContext(body('function personalEditor(','function paintPersonalSaveError('),context);
 runInNewContext(body('async function commitPersonal(','\nfunction labelMode('),context);
 runInNewContext(body('async function retryPersonalEdits(','const personalFile='),context);
 runInNewContext(body('async function startPractice(','\nasync function act('),context);
 return {context,target,old,p,snapshot,settings,evidence,preparations,mounts,writes,errors,readerPaints,get editor(){return context.personalEditor(target);},
  setProjection(fn:typeof projection){projection=fn;},setFlush(fn:typeof flush){flush=fn;},setSave(fn:typeof save){save=fn;},setPrepare(fn:typeof prepare){prepare=fn;},
  changeHand(hand:string){return context.commitPersonal(target,(s:any)=>{s.choices.a.hand=hand;return s;});}};
}

test('active restore admits new hand plan with projected notation before awaiting a delayed personal save, preserving credit and context',async()=>{
 const f=fixture(),project=deferred(),flushed=deferred(),saved=deferred();f.setProjection(()=>project.promise);f.setFlush(()=>flushed.promise);f.setSave(()=>saved.promise);
 const changing=f.changeHand('RH');assert.equal(f.old.paused,1);assert.equal(f.old.flushes,0);assert.equal(f.mounts.length,0);
 const projected={...f.p,notationHands:['RH','RH']};project.resolve(projected);await settle();assert.equal(f.old.flushes,1);assert.equal(f.preparations.length,0);assert.equal(f.old.closed,0);
 flushed.resolve();await settle();assert.equal(f.mounts.length,1);const mount=f.mounts[0];
 assert.equal(f.preparations[0].base,f.p);assert.equal(f.preparations[0].id,'piece');assert.equal(f.preparations[0].personal,f.target.personal);
 assert.deepEqual(f.preparations[0].context,f.snapshot);assert.equal(mount.notation,projected);assert.equal(mount.owner.options.basePackage,f.p);assert.equal(mount.owner.options.personal,f.target.personal);
 assert.deepEqual(mount.admitted.plan.hands,mount.notation.notationHands);assert.deepEqual(mount.owner.state.evidence,f.evidence);assert.deepEqual(mount.owner.state.preferences,f.settings);assert.deepEqual(f.old.state.evidence,f.evidence);
 assert.equal(f.old.closed,1);assert.equal(f.context.practice,mount.owner);let completed=false;void changing.then(()=>{completed=true;});await settle();assert.equal(completed,false);
 saved.resolve();await changing;await f.editor.queue.flush();assert.equal(completed,true);
});

test('retry after a failed projection saves retained intent and mounts its matching practice notation and hand plan without painting the reader',async()=>{
 const f=fixture();f.setProjection(async()=>{throw Error('projection unavailable');});
 await assert.rejects(f.changeHand('RH'),/projection unavailable/);await assert.rejects(f.editor.queue.flush(),/projection unavailable/);
 assert.equal(f.writes.length,1);assert.equal(f.writes[0].choices.a.hand,'RH');assert.equal(f.editor.queue.recovery.length,1);assert.equal(f.target.personal.choices.a.hand,'RH');assert.equal(f.editor.view,f.p);
 f.setProjection(async s=>({...f.p,notationHands:f.p.score.notes.map(n=>handFor(f.p,s,n.id)),choiceSnapshot:structuredClone(s)}));
 await f.context.retryPersonalEdits(f.target);
 assert.equal(f.editor.queue.error,undefined);assert.equal(f.editor.queue.recovery.length,0);assert.equal(f.writes.length,1);assert.equal(f.writes[0].choices.a.hand,'RH');
 assert.equal(f.mounts.length,1);const mount=f.mounts[0];assert.equal(f.context.practice,mount.owner);assert.equal(f.old.closed,1);
 assert.equal(mount.notation,f.editor.view);assert.equal(mount.owner.options.basePackage,f.p);assert.equal(mount.owner.options.personal,f.target.personal);assert.deepEqual(mount.notation.notationHands,['RH','RH']);assert.deepEqual(mount.admitted.plan.hands,mount.notation.notationHands);
 assert.deepEqual(mount.owner.state.evidence,f.evidence);assert.deepEqual(mount.owner.state.preferences,f.settings);assert.deepEqual(f.old.state.evidence,f.evidence);assert.deepEqual(f.readerPaints,[]);
});

test('retry after successful personal persistence but failed practice admission remounts the retained choice without another save or reader paint',async()=>{
 const f=fixture();f.setPrepare(async()=>{throw Error('admission unavailable');});
 await assert.rejects(f.changeHand('RH'),/admission unavailable/);await f.editor.queue.flush();
 assert.equal(f.writes.length,1);assert.equal(f.writes[0].choices.a.hand,'RH');assert.equal(f.editor.queue.error,undefined);assert.equal(f.editor.queue.recovery.length,0);assert.equal(f.old.closed,0);assert.equal(f.mounts.length,0);
 // The still-owning paused practice has later settings; retry must retain them.
 f.snapshot.preferences.working=84;f.snapshot.includeManual=false;
 f.setPrepare(async(base,_id,context,s)=>({state:{evidence:structuredClone(f.evidence),preferences:structuredClone(context.preferences)},plan:{hands:base.score.notes.map((n:any)=>handFor(base,s,n.id))}}));
 await f.context.retryPersonalEdits(f.target);
 assert.equal(f.writes.length,1,'A completed snapshot is not saved a second time');assert.equal(f.mounts.length,1);assert.equal(f.old.closed,1);const mount=f.mounts[0];
 assert.equal(mount.notation,f.editor.view);assert.deepEqual(mount.notation.notationHands,['RH','RH']);assert.deepEqual(mount.admitted.plan.hands,mount.notation.notationHands);assert.equal(mount.owner.options.personal,f.target.personal);
 assert.deepEqual(mount.owner.state.evidence,f.evidence);assert.equal(mount.owner.state.preferences.working,84);assert.equal(mount.context.includeManual,false);assert.deepEqual(mount.owner.state.preferences,f.snapshot.preferences);assert.deepEqual(f.readerPaints,[]);
});

test('history baseline changes are compared by effective source hands rather than explicit assignment presence',async()=>{
 const f=fixture();delete (f.target.personal.choices as Record<string,unknown>).a;delete f.old.options.personal.choices.a;
 await f.context.commitPersonal(f.target,(s:any)=>({...s,calculatedVersion:1}));
 assert.equal(f.old.paused,1);assert.equal(f.mounts.length,1);assert.deepEqual(f.mounts[0].admitted.plan.hands,['RH','RH']);assert.deepEqual(f.mounts[0].owner.state.evidence,f.evidence);
});

test('same-hand finger and history choices refit the existing practice without rebuilding or changing earned evidence',async()=>{
 const f=fixture();await f.context.commitPersonal(f.target,(s:any)=>{s.choices.a.finger=5;s.calculatedVersion=1;return s;});
 assert.equal(f.old.paused,0);assert.equal(f.old.refits,1);assert.equal(f.old.options.personal,f.target.personal);assert.equal(f.old.options.personal.choices.a.finger,5);
 assert.equal(f.old.flushes,0);assert.equal(f.preparations.length,0);assert.equal(f.old.closed,0);assert.equal(f.context.practice,f.old);assert.deepEqual(f.old.state.evidence,f.evidence);
});

test('a newer accepted restore during delayed practice flush prevents the older hand plan from mounting',async()=>{
 const f=fixture(),gate=deferred();f.setFlush(()=>gate.promise);const first=f.changeHand('RH');await settle();assert.equal(f.old.flushes,1);
 await f.changeHand('LH');assert.equal(f.old.options.personal.choices.a.hand,'LH');const latest=f.editor.view;gate.resolve();await first;
 assert.equal(f.preparations.length,0);assert.equal(f.mounts.length,0);assert.equal(f.old.closed,0);assert.equal(f.editor.view,latest);assert.equal(f.context.practice,f.old);
});

test('newer generation during delayed admission cannot publish the old prepared hand plan',async()=>{
 const f=fixture(),gate=deferred();f.setPrepare(()=>gate.promise);const first=f.changeHand('RH');await settle();assert.equal(f.preparations.length,1);
 await f.changeHand('LH');gate.resolve({state:{evidence:{stale:true}},plan:{hands:['RH','RH']}});await first;
 assert.equal(f.mounts.length,0);assert.equal(f.old.closed,0);assert.equal(f.old.options.personal.choices.a.hand,'LH');assert.deepEqual(f.old.state.evidence,f.evidence);
});

test('settings changed during hand-plan admission are admitted again without replacing the later choice',async()=>{
 const f=fixture(),gate=deferred();let calls=0;
 f.setPrepare(async(_base,_id,context)=>++calls===1?gate.promise:{state:{evidence:structuredClone(f.evidence),preferences:structuredClone(context.preferences)},plan:{hands:['RH','RH']}});
 const changing=f.changeHand('RH');await settle();assert.equal(f.preparations.length,1);
 f.snapshot.preferences.working=84;f.snapshot.includeManual=false;
 gate.resolve({state:{evidence:structuredClone(f.evidence),preferences:{working:72}},plan:{hands:['RH','RH']}});await changing;
 assert.equal(f.preparations.length,2);assert.equal(f.mounts.length,1);
 assert.equal(f.mounts[0].context.includeManual,false);assert.equal(f.mounts[0].owner.state.preferences.working,84);
 assert.deepEqual(f.mounts[0].owner.state.evidence,f.evidence);
});

for(const replacement of ['practice','score'] as const)test(`a ${replacement} switch during delayed admission keeps the new owner and its source untouched`,async()=>{
 const f=fixture(),gate=deferred();f.setPrepare(()=>gate.promise);const first=f.changeHand('RH');await settle();
 const other={entry:{id:'other'},package:{sourceSha256:'other-source'},personal:{choices:{}}},next={source:'other-source',state:{credit:99}};
 if(replacement==='score')f.context.current=other;f.context.practice=next;
 gate.resolve({state:{evidence:{stale:true}},plan:{hands:['RH','RH']}});await first;
 assert.equal(f.context.practice,next);if(replacement==='score')assert.equal(f.context.current,other);assert.equal(f.old.closed,0);assert.equal(f.mounts.length,0);assert.deepEqual(next.state,{credit:99});
});

for(const boundary of ['projection','flush','admission'] as const)test(`${boundary} failure keeps active practice paused and preserves its credit instead of closing or mounting`,async()=>{
 const f=fixture(),failure=Error(`${boundary} unavailable`);
 if(boundary==='projection')f.setProjection(async()=>{throw failure;});else if(boundary==='flush')f.setFlush(async()=>{throw failure;});else f.setPrepare(async()=>{throw failure;});
 await assert.rejects(f.changeHand('RH'),new RegExp(`${boundary} unavailable`));await settle();
 assert.equal(f.old.paused,1);assert.equal(f.old.closed,0);assert.equal(f.mounts.length,0);assert.equal(f.context.practice,f.old);assert.deepEqual(f.old.state.evidence,f.evidence);assert.deepEqual(f.old.state.preferences,f.settings);
 if(boundary==='projection'){await assert.rejects(f.editor.queue.flush(),/projection unavailable/);assert.equal(f.preparations.length,0);assert.equal(f.writes.length,1);assert.equal(f.writes[0].choices.a.hand,'RH');}else await f.editor.queue.flush();
});
