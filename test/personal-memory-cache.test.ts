import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {stripTypeScriptTypes} from 'node:module';import {runInNewContext} from 'node:vm';
import {PersonalMemoryResolutionCache,personalMemoryResolutionKey,AfterPaintWork} from '../src/personal-memory-cache';
import type {MemoryScoreInput,MemoryResolution} from '../src/personal-fingering-memory';

const fixture=()=>({entryId:'piece',p:{manifest:{revision:'source'}},personal:{assignments:{choices:{}},overrides:{},view:{page:0},history:[]}} as unknown as MemoryScoreInput);
test('resolution is reused for navigation and derived display changes, invalidated by musical content and authority',()=>{
 const cache=new PersonalMemoryResolutionCache(),input=fixture();let calls=0;const load=()=>({byOwner:{},assignments:[],serial:++calls}) as unknown as MemoryResolution;
 const first=cache.resolve(input,1,load);input.personal.view.page=2;input.personal.editContactId='next';input.personal.memoryResolved={revision:7,sourceRevision:'source',choices:{n:{finger:3}}};
 assert.equal(cache.resolve({...input,personal:structuredClone(input.personal)},1,load),first);
 input.personal.calculatedOwners={n:true};assert.notEqual(cache.resolve(input,1,load),first);
 const masked=cache.resolve(input,1,load);input.personal.calculatedOwners.n=false as never;assert.notEqual(cache.resolve(input,1,load),masked);
 const revised=cache.resolve(input,2,load);assert.equal(calls,4);assert.equal(cache.resolve(input,2,load),revised);
 // A reopening reads its package afresh: the same score is the same resolution.
 assert.equal(cache.resolve({...input,p:structuredClone(input.p)},2,load),revised);
 assert.notEqual(cache.resolve({...input,p:{...input.p,manifest:{revision:'another source'} as never}},2,load),revised);
 assert.notEqual(cache.resolve({...input,p:{...input.p,keyboardLayout:'conventional-piano'}},2,load),revised);
 assert.notEqual(cache.resolve({...input,p:{...input.p,transposition:{semitones:2} as never}},2,load),revised);
 assert.notEqual(cache.resolve({...input,entryId:'other'},2,load),revised);
 assert.equal(calls,8);
});
function queues(){let id=0;const frames=new Map<number,()=>void>(),tasks=new Map<number,()=>void>();return{frames,tasks,work:new AfterPaintWork({request:fn=>{frames.set(++id,fn);return id;},cancel:n=>{frames.delete(n);}},{request:fn=>{tasks.set(++id,fn);return id as unknown as ReturnType<typeof setTimeout>;},cancel:n=>{tasks.delete(Number(n));}}),frame(){const next=frames.entries().next().value!;frames.delete(next[0]);next[1]();},task(){const next=tasks.entries().next().value!;tasks.delete(next[0]);next[1]();}};}
test('derived work waits beyond animation frame, replaces queued work, and cancels on owner exit',()=>{
 const q=queues(),ran:string[]=[];q.work.schedule(()=>ran.push('old'));assert.equal(ran.length,0);q.frame();assert.equal(ran.length,0);
 q.work.schedule(()=>ran.push('latest'));assert.equal(q.tasks.size,0);q.frame();q.task();assert.deepEqual(ran,['latest']);
 q.work.schedule(()=>ran.push('canceled frame'));q.work.cancel();assert.equal(q.frames.size,0);
 q.work.schedule(()=>ran.push('canceled task'));q.frame();q.work.cancel();assert.equal(q.tasks.size,0);assert.deepEqual(ran,['latest']);
});
test('actual editor schedules advice without resolving or running it in the input receipt, and rejects a stale score',()=>{
 const source=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8'),start=source.indexOf('function refreshEditorAdvice()'),end=source.indexOf('function runEditorAdvice(',start),q=queues(),input=fixture(),ran:unknown[]=[],current={entry:{id:input.entryId},package:input.p,personal:input.personal};
 const context:any={current,selection:{},practice:undefined,preferences:{},readFingeringAdviceSettings:()=>({threshold:25}),personalMemory:{memoryGeneration:1},personalMemoryResolutionKey,adviceKey:'',adviceRunner:{cancel(){}},adviceWork:q.work,runEditorAdvice:(...args:unknown[])=>ran.push(args)};
 runInNewContext(stripTypeScriptTypes(source.slice(start,end)),context);
 context.refreshEditorAdvice();assert.equal(ran.length,0);q.frame();assert.equal(ran.length,0);q.task();assert.equal(ran.length,1);
 current.personal.view.page=4;context.refreshEditorAdvice();assert.equal(q.frames.size,0);
 context.personalMemory.memoryGeneration++;context.refreshEditorAdvice();context.current={...current};q.frame();q.task();assert.equal(ran.length,1);
});
