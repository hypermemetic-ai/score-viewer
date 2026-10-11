import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {stripTypeScriptTypes} from 'node:module';import {runInNewContext} from 'node:vm';
import {importPackage} from '../src/package';import {initialPersonal,readPersonal,viewportFit} from '../src/state';
import {assigned} from '../src/personal-assignments';import {editUnits} from '../src/selection';import {PersonalEditQueue} from '../src/personal-edit-queue';
const source=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8'),body=(start:string,end:string)=>stripTypeScriptTypes(source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start))));
const p=await importPackage(readFileSync(new URL('../fixtures/schumann-op68-no14.isoscore',import.meta.url)),{allowLegacyTempo:true});
const deferred=()=>{let resolve!:(value?:any)=>void;const promise=new Promise<any>(r=>resolve=r);return {promise,resolve};};
function fixture(){
 const disk=deferred(),written:any[]=[],frames:any[]=[],messages:string[]=[],target={package:p,personal:initialPersonal(p)},units=editUnits(p),projections=new Map<number,Promise<any>>();
 const editor={view:p,visiblePersonal:target.personal,generation:0,projections,session:{async project(personal:any){return {...p,projection:personal.assignments};}},queue:undefined as any};
 editor.queue=new PersonalEditQueue('source',async(snapshot,sequence)=>{await projections.get(sequence);await disk.promise;written.push(snapshot);});
 const context:any={structuredClone,current:target,selection:units[0],assigned,readPersonal,editUnits,viewportFit,innerWidth:1280,innerHeight:720,personalEditor:()=>editor,readerPackage:()=>editor.view,effectiveView:(v:any)=>v,renderPages(){frames.push(editor.view);},renderToolbar(){},focusSelection(){},notify:(message:string)=>messages.push(message)};
 runInNewContext(body('function visibleSourceSeat(','const personalFile='),context);
 runInNewContext(body('async function saveSelectedChoice(','\nfunction paintLibrarySummaries('),context);
 return {context,target,editor,disk,written,frames,messages,units};
}
test('actual editor reserves hand then finger on the same source before digit advance, painting without disk completion',async()=>{
 const sourceBefore=JSON.stringify(p.score),f=fixture(),owner=f.context.selection.ownerIds[0],first=f.context.saveHandChoice('RH'),second=f.context.saveFingerDigit(2);
 assert.equal(f.target.personal.assignments!.choices[owner].hand,'RH');assert.equal(f.target.personal.assignments!.choices[owner].finger,2);assert.equal(f.context.selection.contactId,f.units[1].contactId);
 await Promise.all([first,second]);assert.ok(f.frames.length);assert.equal(f.written.length,0);
 f.disk.resolve();await f.editor.queue.flush();assert.equal(f.written.length,2);assert.equal(f.written[0].assignments.choices[owner].hand,'RH');assert.equal(f.written[1].assignments.choices[owner].finger,2);
 assert.equal(JSON.stringify(p.score),sourceBefore);
});
test('a stale projection cannot publish over a later accepted choice and navigation is never redirected',async()=>{
 const f=fixture(),gate=deferred();let count=0;f.editor.session.project=async(personal:any)=>{if(++count===1)return gate.promise;return {...p,projection:personal.assignments};};
 const first=f.context.saveHandChoice('LH');f.context.selection=f.units[1];const second=f.context.saveHandChoice('RH');await second;
 const latest=f.editor.view;gate.resolve({...p,projection:'stale'});await first;assert.equal(f.editor.view,latest);assert.equal(f.context.selection.ownerIds[0],f.units[1].ownerIds[0]);
 f.disk.resolve();await f.editor.queue.flush();assert.equal(f.written.length,2);
});
