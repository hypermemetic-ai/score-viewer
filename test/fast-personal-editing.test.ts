import {test} from 'node:test';import assert from 'node:assert/strict';
import {undrawableHandOwners} from '../src/personal-presentation';
import {readFileSync} from 'node:fs';import {stripTypeScriptTypes} from 'node:module';import {runInNewContext} from 'node:vm';
import {scoreCapabilities} from '../src/score-capabilities';
import {GENERIC_PERSONAL_COMMIT} from './helpers/generic-personal-commit';
import {importPackage} from '../src/package';import {initialPersonal,readPersonal,viewportFit,personalStorageName} from '../src/state';
import {assigned,effectiveAssignmentKey} from '../src/personal-assignments';import {editUnits} from '../src/selection';import {PersonalEditQueue} from '../src/personal-edit-queue';
import {PersonalMemorySession,rawMemoryPersonal,personalMemoryDocument} from '../src/personal-memory-session';
import {browserAssistanceStore,type AssistanceStore} from '../src/durable-assistance-store';
import {withResolvedMemory} from '../src/personal-assistance';
const source=readFileSync(process.env.SCORE_VIEWER_PERSONAL_MAIN??new URL('../src/main.ts',import.meta.url),'utf8'),body=(start:string,end:string)=>stripTypeScriptTypes(source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start))));
const p=await importPackage(readFileSync(new URL('../fixtures/schumann-op68-no14.isoscore',import.meta.url)),{allowLegacyTempo:true});
const deferred=()=>{let resolve!:(value?:any)=>void;const promise=new Promise<any>(r=>resolve=r);return {promise,resolve};};
async function fixture(){
 const disk=deferred(),written:any[]=[],frames:any[]=[],messages:string[]=[],target={entry:{id:'piece',importedAt:'2026-01-01T00:00:00.000Z'},package:p,personal:initialPersonal(p)},units=editUnits(p),data=new Map<string,string>();
 let lock=Promise.resolve();const base=browserAssistanceStore({getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);}},{request(_name,run){const next=lock.then(run);lock=next.then(()=>{},()=>{});return next;}});
 let active=false,broken=false;
 const store:AssistanceStore={read:id=>base.read(id),commit:async input=>{
  if(active){await disk.promise;if(broken)throw Error('disk unavailable');}
  const result=await base.commit(input);if(active&&result.status==='committed'&&input.changes[personalMemoryDocument])written.push(structuredClone(result.snapshot.documents[personalStorageName(target.entry.id,p)]));return result;
 }};
 const memoryInput=(owner:any)=>({entryId:owner.entry.id,importedAt:owner.entry.importedAt,p:owner.package,personal:rawMemoryPersonal(owner.personal)});
 const personalMemory=new PersonalMemorySession(store,{scanLibrary:async()=>[memoryInput(target)]});await personalMemory.initialize();active=true;
 const context:any={structuredClone,crypto,undrawableHandOwners,current:target,selection:units[0],assigned,readPersonal,editUnits,viewportFit,innerWidth:1280,innerHeight:720,PersonalEditQueue,livePersonalEditors:new WeakMap(),
  scoreCapabilities,PersonalPresentationSession:class{handChoiceCheck(){return undefined;}async project(personal:any){return {...p,projection:personal.assignments};}},personalStorageName,personalMemory,memoryInput,rawMemoryPersonal,
  resolveMemory:(owner:any)=>withResolvedMemory(memoryInput(owner),personalMemory.resolve(memoryInput(owner)),personalMemory.memory.revision),effectiveAssignmentKey,
  adviceRunner:{cancel(){}},adviceKey:'',practice:undefined,PracticeView:class{},effectiveView:(v:any)=>v,renderPages(){frames.push(context.readerPackage());},renderToolbar(){},focusSelection(){},notify:(message:string)=>messages.push(message),paintPersonalSaveError(){}};
 runInNewContext(body('function personalEditor(','function paintPersonalSaveError('),context);
 runInNewContext(body('/** Painting follows accepted intent','\nfunction labelMode(')+GENERIC_PERSONAL_COMMIT,context);
 runInNewContext(body('async function saveSelectedChoice(','\nfunction paintLibrarySummaries('),context);
 return {context,target,store,editor:context.personalEditor(target),personalMemory,disk,written,frames,messages,units,setBroken(value:boolean){broken=value;},async flush(){await personalMemory.flush();await context.personalEditor(target).queue.flush();}};
}
test('actual editor reserves hand then finger on the same source before digit advance, painting without disk completion',async()=>{
 const sourceBefore=JSON.stringify(p.score),f=await fixture(),owner=f.context.selection.ownerIds[0],first=f.context.saveHandChoice('RH'),second=f.context.saveFingerDigit(2);
 assert.equal(f.target.personal.assignments!.choices[owner].hand,'RH');assert.equal(f.target.personal.assignments!.choices[owner].finger,2);assert.equal(f.context.selection.contactId,f.units[1].contactId);
 await Promise.all([first,second]);assert.ok(f.frames.length);assert.equal(f.written.length,0);
 f.disk.resolve();await f.flush();assert.equal(f.written.length,2);assert.equal(f.written[0].assignments.choices[owner].hand,'RH');assert.equal(f.written[1].assignments.choices[owner].finger,2);
 assert.equal(JSON.stringify(p.score),sourceBefore);
});
test('a stale projection cannot publish over a later accepted choice and navigation is never redirected',async()=>{
 const f=await fixture(),gate=deferred();let count=0;f.editor.session.project=async(personal:any)=>{if(++count===1)return gate.promise;return {...p,projection:personal.assignments};};
 const first=f.context.saveHandChoice('LH');f.context.selection=f.units[1];const second=f.context.saveHandChoice('RH');await second;
 const latest=f.editor.view;gate.resolve({...p,projection:'stale'});await first;assert.equal(f.editor.view,latest);assert.equal(f.context.selection.ownerIds[0],f.units[1].ownerIds[0]);
 f.disk.resolve();await f.flush();assert.equal(f.written.length,2);
});

test('switching score editions during a pending projection cannot paint or redirect its saved choice',async()=>{
 const f=await fixture(),gate=deferred(),owner=f.context.selection.ownerIds[0];f.editor.session.project=()=>gate.promise;
 const pending=f.context.saveHandChoice('RH'),other={package:p,personal:initialPersonal(p)};f.context.current=other;f.context.selection=f.units[3];
 gate.resolve({...p,projection:f.target.personal.assignments});await pending;
 assert.equal(f.frames.length,0);assert.equal(other.personal.assignments,undefined);assert.equal(f.context.selection,f.units[3]);
 f.disk.resolve();await f.flush();assert.equal(f.written.length,1);assert.equal(f.written[0].assignments.choices[owner].hand,'RH');
});
test('a failed durable save retains the accepted choice and refuses a subsequent edit until recovery',async()=>{
 const f=await fixture(),owner=f.context.selection.ownerIds[0],failures:Error[]=[];f.context.paintPersonalSaveError=(_target:any,error:Error)=>failures.push(error);
 f.disk.resolve();f.setBroken(true);
 await f.context.saveHandChoice('RH');await assert.rejects(f.editor.queue.flush(),/disk unavailable/);
 assert.equal(f.target.personal.assignments!.choices[owner].hand,'RH');assert.equal(f.personalMemory.recovery.length,1);assert.ok(failures.length>=1);
 const before=JSON.stringify(f.target.personal);await assert.rejects(f.context.saveFingerDigit(3),/paused|disk unavailable/);assert.equal(JSON.stringify(f.target.personal),before);
 f.setBroken(false);await f.personalMemory.retry();await f.editor.queue.retry();assert.equal(f.personalMemory.recovery.length,0);assert.equal(f.editor.queue.recovery.length,0);assert.equal(f.written[0].assignments.choices[owner].hand,'RH');
});

test('a late navigation projection cannot replace another application session’s newer personal choice',async()=>{
 const f=await fixture(),gate=deferred(),firstOwner=f.units[0].ownerIds[0],otherOwner=f.units[3].ownerIds[0];
 assert.notEqual(firstOwner,otherOwner);f.editor.session.project=()=>gate.promise;
 const first=f.context.saveHandChoice('RH');f.disk.resolve();await f.personalMemory.flush();
 const other=new PersonalMemorySession(f.store,{scanLibrary:async()=>[]});await other.initialize();
 const raw=await other.loadPersonalCurrent(f.target.entry,p,async()=>initialPersonal(p));
 await other.accept({entryId:f.target.entry.id,p,personal:raw},{kind:'finger',edit:{ownerId:otherOwner,finger:5,decisionId:'other-window-choice',authoredAt:'2026-01-01'}}).saved;
 gate.resolve(p);await first;await f.flush();
 const durable=await other.loadPersonalCurrent(f.target.entry,p,async()=>initialPersonal(p));
 assert.equal(durable.assignments?.choices[firstOwner].hand,'RH');assert.equal(durable.assignments?.choices[otherOwner].finger,5);
 assert.equal(durable.assignments?.choices[otherOwner].intent?.finger?.decisionId,'other-window-choice');
 assert.equal(durable.editContactId,f.units[0].contactId);
});
