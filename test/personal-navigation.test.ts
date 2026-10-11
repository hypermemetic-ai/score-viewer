import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {stripTypeScriptTypes} from 'node:module';import {runInNewContext} from 'node:vm';
import {PersonalEditQueue} from '../src/personal-edit-queue';
const main=readFileSync(process.env.SCORE_VIEWER_PERSONAL_MAIN??new URL('../src/main.ts',import.meta.url),'utf8'),state=readFileSync(new URL('../src/state.ts',import.meta.url),'utf8'),selection=readFileSync(new URL('../src/selection.ts',import.meta.url),'utf8');
const body=(source:string,start:string,end:string)=>stripTypeScriptTypes(source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start))).replace(/^export /gm,''));
const deferred=()=>{let resolve!:(value?:any)=>void;const promise=new Promise<any>(r=>resolve=r);return {promise,resolve};};
const seat=(id:string,page:number,bar:number,continuation=false)=>({id:'seat-'+id,contactId:'contact-'+id,ownerIds:[id],actionId:'action-'+id,page,system:bar,x:20,baseline:40,writtenBar:bar,fontSize:12,continuation});
function fixture(basePages=2,projectedPages=basePages){
 const seats=[seat('a',0,1),seat('b',basePages-1,9)],p={manifest:{version:1,revision:'source'},sourceSha256:'source',pages:Array.from({length:basePages},()=>'<svg/>'),seats,score:{notes:seats.map(s=>({id:s.ownerIds[0]}))}},
  target:any={entry:{id:'source',file:'source.isoscore'},package:p,personal:{version:1,revision:'source',view:{page:0,rotation:0,scale:1,count:1,advance:'slide',labelMode:'pitch',fingerSet:'yours'},editContactId:seats[0].contactId,overrides:{},history:[],choices:{a:{hand:'LH',finger:1},b:{hand:'RH',finger:2}}}};
 const projected={...p,pages:Array.from({length:projectedPages},()=>'<svg/>'),seats:[seats[0],{...seats[1],id:'projected-b',contactId:'projected-contact-b',page:projectedPages-1}]},writes:any[]=[],frames:any[]=[],errors:any[]=[];let disk:any=structuredClone(target.personal),persist=Promise.resolve(),project=async(_s:any)=>projected;
 const context:any={structuredClone,PersonalEditQueue,current:target,selection:seats[0],livePersonalEditors:new WeakMap(),
  personalBinding:()=>undefined,initialPersonal:()=>target.personal,readPersonalAssignments:(v:any)=>v,isPitchedEvent:()=>true,
  PersonalPresentationSession:class{project(s:any){return project(structuredClone(s));}},
  personalStorageName:()=> 'source-journal',personalContext:async(owner:any)=>({entry:owner.entry,p:owner.package,file:'source-journal'}),
  enqueue(fn:()=>Promise<any>){const pending=persist.then(fn);persist=pending.then(()=>{},()=>{});return pending;},
  writeJson:async(_file:string,s:any)=>{disk=structuredClone(s);writes.push(structuredClone(s));},loadPersonalJournal:async()=>structuredClone(disk),host:{},rebindPersonalPresentation:(s:any)=>s,
  assigned(_p:any,s:any,owner:any,choice:any){const next=structuredClone(s),id=owner.ownerIds[0];next.choices[id]={...next.choices[id],...choice};return next;},
  editUnits:(view:any)=>[...view.seats],viewportFit:(_w:any,_h:any,v:any)=>({pages:[v.page]}),effectiveView:(v:any)=>v,innerWidth:1280,innerHeight:720,
  renderPages(){frames.push(context.readerPackage());},renderToolbar(){},focusSelection(){},paintPersonalSaveError(_owner:any,e:any){errors.push(e);},notify(){},practice:undefined,readingPresentation:undefined,ManualPracticeView:class{},readingViewError:undefined};
 runInNewContext(body(state,'export function readPersonal(','export const activeLayer='),context);
 runInNewContext(body(main,'function personalEditor(','function paintPersonalSaveError('),context);
 runInNewContext(body(main,'async function savePersonal(','\nfunction labelMode('),context);
 runInNewContext(body(main,'async function saveSelectedChoice(','\nfunction paintLibrarySummaries('),context);
 runInNewContext(body(selection,'export function selectionOnPage(','/** Navigate the printed systems'),context);
 return {context,target,p,projected,seats,writes,frames,errors,get disk(){return disk;},get editor(){return context.personalEditor(target);},setProject(fn:(s:any)=>Promise<any>){project=fn;},cold(){const loaded=context.readPersonal(disk,p);context.resolvePersonalNavigation(loaded,projected);return loaded;}};
}
test('digit page crossing is durable before a later ordinary save and cold Edit resumes the accepted owner',async()=>{
 const f=fixture();const editing=f.context.saveFingerDigit(3);assert.equal(f.target.personal.view.page,1);await editing;await f.editor.queue.flush();
 assert.equal(f.disk.view.page,1);assert.equal(f.disk.choices.a.finger,3);const cold=f.cold();assert.equal(cold.editContactId,'projected-contact-b');assert.equal(f.context.selectionOnPage(f.projected,cold.editContactId,cold.view.page).ownerIds[0],'b');
});
test('source navigation survives a five-page base becoming a six-page projection and a changed contact alias',async()=>{
 const f=fixture(5,6);await f.context.saveFingerDigit(3);await f.editor.queue.flush();assert.equal(f.disk.view.page,5);assert.equal(f.disk.editContactId,'projected-contact-b');
 const admitted=f.context.readPersonal(f.disk,f.p);assert.equal(admitted.view.page,5);assert.equal(admitted.editContactId,undefined);assert.ok(admitted.navigation.edit);
 const cold=f.cold();assert.equal(cold.view.page,5);assert.equal(cold.editContactId,'projected-contact-b');assert.equal(cold.choices.a.finger,3);
});
test('an Exit/Library save captured during delayed projection waits for and retains that exact navigation',async()=>{
 const f=fixture(5,6),gate=deferred();f.setProject(()=>gate.promise);const editing=f.context.saveFingerDigit(3);f.context.selection=undefined;
 const closing=f.context.savePersonal();gate.resolve(f.projected);await editing;await closing;await f.editor.queue.flush();
 assert.equal(f.disk.view.page,5);assert.equal(f.disk.editContactId,'projected-contact-b');assert.equal(f.disk.choices.a.finger,3);assert.equal(f.cold().view.page,5);
});
test('a later explicit navigation during projection stays authoritative without rewriting choice history',async()=>{
 const f=fixture(5,6),gate=deferred();f.setProject(()=>gate.promise);const editing=f.context.saveFingerDigit(3);
 f.context.selection=f.seats[0];f.target.personal.editContactId=f.seats[0].contactId;f.target.personal.view.page=0;const navigation=f.context.savePersonal();
 gate.resolve(f.projected);await editing;await navigation;await f.editor.queue.flush();assert.equal(f.target.personal.view.page,0);assert.equal(f.context.selection.ownerIds[0],'a');assert.equal(f.disk.view.page,0);assert.equal(f.disk.editContactId,'contact-a');assert.equal(f.disk.choices.a.finger,3);
 assert.equal(f.writes[0].view.page,5);assert.equal(f.writes[1].view.page,0);
});
test('reverse projection completion preserves exact ordered snapshots rather than putting later choices in older writes',async()=>{
 const f=fixture(5,6),gate=deferred();let calls=0;f.setProject(async()=>++calls===1?gate.promise:f.projected);
 const first=f.context.saveHandChoice('RH');await f.context.saveFingerDigit(4);assert.equal(f.target.personal.view.page,5);gate.resolve({...f.p,seats:f.seats});await first;await f.editor.queue.flush();
 assert.equal(f.writes.length,2);assert.equal(f.writes[0].choices.a.finger,1);assert.equal(f.writes[1].choices.a.finger,4);assert.equal(f.disk.view.page,5);assert.equal(f.target.personal.view.page,5);
});
test('a generic restore/history command captures and durably resolves its selected source alias across reflow',async()=>{
 const f=fixture(5,6);f.context.selection=f.seats[1];f.target.personal.editContactId=f.seats[1].contactId;f.target.personal.view.page=4;
 await f.context.commitPersonal(f.target,(s:any)=>{s.choices.b.hand='LH';return s;});await f.editor.queue.flush();
 assert.equal(f.target.personal.view.page,5);assert.equal(f.context.selection.id,'projected-b');assert.equal(f.target.personal.editContactId,'projected-contact-b');
 assert.equal(f.writes.length,1);assert.equal(f.disk.choices.b.hand,'LH');assert.equal(f.disk.view.page,5);assert.equal(f.disk.editContactId,'projected-contact-b');assert.equal(f.disk.navigation.edit.writtenBar,9);
 const cold=f.cold();assert.equal(cold.view.page,5);assert.equal(cold.editContactId,'projected-contact-b');
});
test('a later explicit page change wins over generic reflow while its earlier durable snapshot keeps its own navigation',async()=>{
 const f=fixture(5,6),gate=deferred();f.setProject(()=>gate.promise);f.context.selection=f.seats[1];f.target.personal.editContactId=f.seats[1].contactId;f.target.personal.view.page=4;
 const restoring=f.context.commitPersonal(f.target,(s:any)=>{s.choices.b.hand='LH';return s;});
 f.context.selection=f.seats[0];f.target.personal.editContactId=f.seats[0].contactId;f.target.personal.view.page=0;const navigation=f.context.savePersonal();
 gate.resolve(f.projected);await restoring;await navigation;await f.editor.queue.flush();
 assert.equal(f.target.personal.view.page,0);assert.equal(f.context.selection.ownerIds[0],'a');assert.equal(f.target.personal.editContactId,'contact-a');
 assert.equal(f.writes.length,2);assert.equal(f.writes[0].view.page,5);assert.equal(f.writes[0].editContactId,'projected-contact-b');assert.equal(f.writes[1].view.page,0);assert.equal(f.writes[1].editContactId,'contact-a');
 assert.equal(f.disk.choices.b.hand,'LH');assert.equal(f.cold().view.page,0);assert.equal(f.cold().editContactId,'contact-a');
});
test('held continuation anchors resume the written alias instead of the original attack',()=>{
 const f=fixture(5,6),continuation={...f.seats[0],id:'held-continuation',page:4,writtenBar:7,continuation:true};f.p.seats.push(continuation);const projectedContinuation={...continuation,id:'projected-held',contactId:'projected-held-contact',page:5};f.projected.seats.push(projectedContinuation);
 f.target.personal.view.page=4;f.context.capturePersonalNavigation(f.target.personal,f.p,continuation,true);const admitted=f.context.readPersonal(f.target.personal,f.p);f.context.resolvePersonalNavigation(admitted,f.projected);
 assert.equal(admitted.view.page,5);assert.equal(admitted.editContactId,'projected-held-contact');assert.equal(admitted.navigation.edit.writtenBar,7);assert.equal(admitted.navigation.edit.continuation,true);
});
test('source-empty pages retain numeric fallback and malformed optional navigation never discards choices',()=>{
 const f=fixture(5,6),s=structuredClone(f.target.personal);f.projected.pages.push('<svg/>');s.view.page=6;f.context.capturePersonalNavigation(s,f.projected,undefined,false);delete s.navigation.edit;
 const admitted=f.context.readPersonal(s,f.p);f.context.resolvePersonalNavigation(admitted,f.projected);assert.equal(admitted.view.page,6);
 for(const navigation of [null,{version:1,followEdit:true,page:{owners:['foreign'],actionId:'foreign',writtenBar:1,alias:0,continuation:false}},[]]){const raw={...s,navigation},before=JSON.stringify(raw),loaded=f.context.readPersonal(raw,f.p);assert.equal(loaded.navigation,undefined);assert.deepEqual(loaded.choices,s.choices);assert.equal(JSON.stringify(raw),before);}
});
test('an explicit calculated edition carries validated navigation without changing the personal source binding',async()=>{
 const {initialPersonal,readPersonal}=await import('../src/state'),{personalForCalculatedEdition}=await import('../src/presentation-install');
 const f=fixture(5,6),from:any={...f.p,manifest:{version:2,revision:'b'.repeat(64)},sourceRevision:'a'.repeat(64),sourceSha256:'a'.repeat(64),keyboardLayout:'conventional-piano',profileId:'profile',profileSha256:'c'.repeat(64),effectiveHandSha256:'d'.repeat(64)},
  attacks=from.score.notes.map((n:any,i:number)=>({id:from.seats[i].actionId,pitch:60+i,startTick:i*24,hand:'RH',finger:1,owners:[{id:n.id}]}));
 from.fingerLayer={version:'piano-finger-assignments-v1',layoutId:from.keyboardLayout,profileId:from.profileId,profileSha256:from.profileSha256,plannerVersion:'fixture',sourceHash:from.sourceSha256,attacks,sourceOwnerToAttack:Object.fromEntries(attacks.map((a:any)=>[a.owners[0].id,a.id]))};
 const personal=initialPersonal(from);personal.view.page=4;f.context.capturePersonalNavigation(personal,from,from.seats[1],true);personal.navigation=structuredClone(personal.navigation);
 const before=structuredClone(personal),to=structuredClone(from);to.manifest.revision='e'.repeat(64);to.effectiveHandSha256='f'.repeat(64);to.fingerLayer.attacks[0].hand='LH';
 const transferred=personalForCalculatedEdition(personal,from,to);assert.deepEqual(transferred.navigation,personal.navigation);assert.deepEqual(readPersonal(transferred,to),transferred);assert.deepEqual(personal,before);assert.equal(transferred.binding!.sourceRevision,personal.binding!.sourceRevision);
 assert.throws(()=>personalForCalculatedEdition(personal,from,{...to,sourceSha256:'f'.repeat(64)}),/another musical source/);
});
