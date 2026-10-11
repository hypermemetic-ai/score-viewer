import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';
import {PersonalPreparationPool} from '../src/personal-preparation-pool';
import {capturedReadingExecution,checkReadingExecution} from '../src/reading-execution';
import {conservativeMaterialBytes} from '../src/package-material';
const deferred=()=>{let resolve!:(v?:any)=>void;const promise=new Promise<any>(r=>resolve=r);return {promise,resolve};};
const drain=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};

test('ready cores reuse, serialize access, and evict oldest entries within both bounds',async()=>{
 const pool=new PersonalPreparationPool<{id:number}>(2,12);let produced=0,active=0;
 const use=(key:string,bytes=5)=>pool.use({key,materialBytes:bytes,produce:async()=>({id:++produced})},async c=>{assert.equal(active++,0);await Promise.resolve();active--;return c.id;});
 const a=await use('a');assert.equal((await use('a')).value,a.value);await use('b');await use('c');assert.equal(pool.retained.entries,2);assert.equal(pool.retained.materialBytes,10);
 assert.notEqual((await use('a')).value,a.value);await use('d',9);assert.deepEqual(pool.retained,{entries:1,materialBytes:9});
 await Promise.all([use('x'),use('y'),use('x')]);assert.equal(active,0);
});
test('oversized cores are not retained but the same active facade lease stays usable',async()=>{
 const pool=new PersonalPreparationPool<object>(2,4);let calls=0;const request={key:'large',materialBytes:5,produce:async()=>{calls++;return {};}};
 const one=await pool.use(request,c=>c);assert.deepEqual(pool.retained,{entries:0,materialBytes:0});
 const two=await pool.use({...request,lease:one.lease},c=>c);assert.equal(two.value,one.value);assert.equal(calls,1);
 await pool.use(request,c=>c);assert.equal(calls,2);
});
test('canceled producer cannot lend its partial work or execution callbacks to a queued caller',async()=>{
 const pool=new PersonalPreparationPool<{id:number}>(),gate=deferred(),controller=new AbortController();let calls=0;
 const request={key:'same',materialBytes:1,produce:async()=>{const id=++calls;if(id===1)await gate.promise;return {id};}};
 const first=pool.use(request,c=>c.id,{signal:controller.signal});await drain();
 const second=pool.use(request,c=>c.id);controller.abort();gate.resolve();
 await assert.rejects(first,{name:'AbortError'});assert.equal((await second).value,2);assert.equal(calls,2);assert.equal(pool.retained.entries,1);
});
test('failed project invalidates its shared lease; retry creates a new core',async()=>{
 const pool=new PersonalPreparationPool<object>();let calls=0;const request={key:'same',materialBytes:1,produce:async()=>{calls++;return {};}};
 const one=await pool.use(request,()=>{});await assert.rejects(pool.use({...request,lease:one.lease},()=>{throw Error('physical refusal');}),/physical refusal/);
 assert.equal(one.lease.valid,false);assert.equal(pool.retained.entries,0);await pool.use({...request,lease:one.lease},()=>{});assert.equal(calls,2);
});
test('a canceled waiter does not invalidate or mutate a completed other owner',async()=>{
 const pool=new PersonalPreparationPool<object>(),gate=deferred(),controller=new AbortController();let projects=0;
 const request={key:'same',materialBytes:1,produce:async()=>({})};const first=pool.use(request,async()=>{await gate.promise;projects++;});await drain();
 const canceled=pool.use(request,()=>{projects++;},{signal:controller.signal});controller.abort();gate.resolve();await first;await assert.rejects(canceled,{name:'AbortError'});
 assert.equal(projects,1);assert.equal(pool.retained.entries,1);
});

function fixture(){
 let recipes=0,cores=0,warms=0,asyncWarms=0,asyncProjects=0,projects=0;
 const code=readFileSync(new URL('../src/personal-presentation.ts',import.meta.url),'utf8').replace(/^import[^\n]+\n/gm,'').replace(/^export /gm,'');
 const pool=new PersonalPreparationPool<any>();
 const context:any={structuredClone,Uint8Array,PersonalPreparationPool,conservativeMaterialBytes,capturedReadingExecution,checkReadingExecution,
  hashBytes:async(v:any)=>createHash('sha256').update(typeof v==='string'?v:v).digest('hex'),
  calculatedRecipeForRequest:async(p:any)=>{recipes++;return p.renderingRecipe;},scoreWithCalculationContext:(s:any)=>s,
  effectiveAssignments:(p:any,s:any)=>p.score.notes.map((n:any)=>({...n,pitch:n.pitch.octave*12+n.pitch.pitchClass,hand:s.hand??n.hand})),
  createPersonalHandProjection:(source:any,baseline:any)=>{cores++;let ready=false;return {warm(){if(!ready){warms++;ready=true;}},async warmAsync(e:any){asyncWarms++;e.onCheckpoint?.('layout');this.warm();},
   project(owners:any[],id:string){projects++;return Object.freeze({score:Object.freeze({...baseline,notes:owners}),pages:Object.freeze([source.title+':'+owners[0].hand]),seats:Object.freeze([{id,ownerIds:[owners[0].id]}]),annotationGeometry:Object.freeze({identity:id}),changedPages:[]});},
   async projectAsync(owners:any[],id:string,e:any){asyncProjects++;e.onCheckpoint?.('geometry');return this.project(owners,id);}};}};
 runInNewContext(stripTypeScriptTypes(code)+';globalThis.Session=PersonalPresentationSession;',context);
 const base=()=>({archiveSha256:'mutable-claim',sourceSha256:'a'.repeat(64),keyboardLayout:'janko-four-row',manifest:{semanticSha256:'a'.repeat(64),metadata:{title:'study'}},sourceScore:{title:'source',notes:[]},
  score:{notes:[{id:'n',pitch:{octave:4,pitchClass:0},startTick:0,durationTicks:24,hand:'LH'}]},renderingRecipe:{engineId:'retained',options:{width:10}},calculationContext:{referencePerformanceTempo:{bpm:180}},pages:['base'],seats:[],files:{'source.json':new Uint8Array([1,2])}});
 return {base,session:(p:any)=>new context.Session(p,pool),pool,counts:()=>({recipes,cores,warms,asyncWarms,asyncProjects,projects})};
}
test('compatible reopen skips both recipe replay and cold warm, keeping current wrappers/buffers/choices',async()=>{
 const f=fixture(),a=f.base(),b=f.base(),one=f.session(a),two=f.session(b);await one.warm();const first=await one.project({hand:'RH'});await two.warm();const next=await two.project({hand:'RH'});
 assert.deepEqual(f.counts(),{recipes:1,cores:1,warms:1,asyncWarms:0,asyncProjects:0,projects:2});assert.notEqual(next,first);assert.equal(next.files,b.files);assert.notEqual(next.files,a.files);assert.notEqual(next.pages,first.pages);assert.notEqual(next.seats,first.seats);
 assert.equal(await two.project({hand:'LH'}),b);assert.equal(await one.project({hand:'RH'}),first);assert.equal(next.pages[0],'source:RH');
});
test('exact source, baseline, recipe, context, layout and member bytes invalidate even with unchanged archiveSha',async()=>{
 const changes=[(p:any)=>p.sourceScore.title='other',(p:any)=>p.score.notes[0].durationTicks++,(p:any)=>p.renderingRecipe.options.width++,(p:any)=>p.calculationContext.referencePerformanceTempo.bpm++,(p:any)=>p.keyboardLayout='conventional-piano',(p:any)=>p.files['source.json'][0]++];
 for(const change of changes){const f=fixture(),a=f.base(),b=f.base();await f.session(a).warm();change(b);await f.session(b).warm();assert.equal(f.counts().recipes,2);assert.equal(f.counts().cores,2);}
});
test('inputs capture before async digest; new facade sees later source and member mutation',async()=>{
 const f=fixture(),p=f.base(),first=f.session(p),pending=first.warm();p.sourceScore.title='changed';p.files['source.json'][0]=99;await pending;
 const view=await first.project({hand:'RH'});assert.equal(view.pages[0],'source:RH');await f.session(p).warm();assert.equal(f.counts().cores,2);
});
test('foreground execution forwards to cooperative warm/project and local cache needs no recapture on edits',async()=>{
 const f=fixture(),p=f.base(),s=f.session(p),stages:string[]=[];await s.warm({onCheckpoint:(stage:string)=>stages.push(stage)});
 const first=await s.project({hand:'RH'},{onCheckpoint:(stage:string)=>stages.push(stage)});assert.equal(await s.project({hand:'RH'}),first);
 assert.deepEqual(stages,['layout','geometry']);assert.equal(f.counts().asyncWarms,1);assert.equal(f.counts().asyncProjects,1);assert.equal(f.counts().recipes,1);
});
test('literal undefined and nonfinite values cannot acquire a JSON-erased matching core',async()=>{
 for(const [a,b]of [[undefined,null],[NaN,null],[-0,0]]){const f=fixture(),p=f.base(),q=f.base();(p.sourceScore as any).extra=a;(q.sourceScore as any).extra=b;await f.session(p).warm();await f.session(q).warm();assert.equal(f.counts().cores,2);}
});
