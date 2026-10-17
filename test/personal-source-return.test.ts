import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {stripTypeScriptTypes} from 'node:module';import {runInNewContext} from 'node:vm';

const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
const body=(start:string,end:string)=>stripTypeScriptTypes(main.slice(main.indexOf(start),main.indexOf(end,main.indexOf(start))));
const seat=(id:string,page:number,continuation=false)=>({id,contactId:`contact-${id}`,ownerIds:['departure-owner'],writtenBar:18,actionId:'departure-action',continuation,page,system:0,x:20});
function fixture(){
 const entryA={id:'departure',file:'departure-edition.isoscore'},entryB={id:'reference',file:'reference-edition.isoscore'},aliases=[seat('attack',0),seat('held-first',3,true),seat('held-second',4,true)];
 const packageA={manifest:{revision:'departure-package'},sourceRevision:'departure-source',keyboardLayout:'janko-four-row',pages:Array(7).fill('svg'),seats:aliases};
 const referenceSeat={...seat('reference-note',1),ownerIds:['reference-owner'],writtenBar:2,actionId:'reference-action'};
 const packageB={manifest:{revision:'reference-package'},sourceRevision:'reference-source',keyboardLayout:'janko-four-row',pages:Array(2).fill('svg'),seats:[referenceSeat]};
 const view={page:4,rotation:90,scale:1.25,count:2,advance:'slide',labelMode:'pitch',fingerSet:'yours'},personal=(v:any)=>({view:structuredClone(v),editContactId:'prior-cursor',choices:{untouched:{finger:3}}});
 const a={entry:entryA,package:packageA,personal:personal(view)},b={entry:entryB,package:packageB,personal:personal({...view,page:0,rotation:0,count:1})},opens:string[]=[],saved:any[]=[],paints:string[]=[],imports:string[]=[],presentations:string[]=[];
 let admitted:any={...packageB,availablePresentations:['janko-four-row']},returnPackage=packageA,gate:Promise<void>|undefined;
 const context:any={current:a,selection:aliases[2],entries:[entryA,entryB],sourceReturn:undefined,sourceNavigating:false,editNavigation:'measures',selectionPitchToggle:true,
  memoryInput:(target:any)=>({entryId:target.entry.id,p:target.package,personal:target.personal}),resolveMemoryInput:()=>({}),memoryReferenceTarget:()=>({entryId:'reference',sourceRevision:'reference-source',writtenBar:2,ownerId:'reference-owner'}),
  readerPackage:()=>context.current.package,host:{async read(file:string){imports.push(file);await gate;return new Uint8Array([1]);}},readerAdmission:{import:async()=>admitted},admitOrContent:async()=>admitted,selectPresentation:async(archive:any,layout:string)=>{presentations.push(layout);return archive;},
  async open(entry:any){opens.push(entry.id);context.current=entry.id==='reference'?b:{...a,package:returnPackage,personal:personal({...view,page:0,rotation:0})};context.selection=undefined;context.editNavigation='notes';context.selectionPitchToggle=false;},
  editSequence:{reset(){}},resetInput(){},renderPages(){paints.push(context.current.entry.id);},renderToolbar(){},focusSelection(){},viewportFit:(_w:any,_h:any,v:any)=>({pages:[v.page,v.page+1]}),innerWidth:1000,innerHeight:800,effectiveView:(v:any)=>v,
  savePersonalQuietly(){const snapshot=structuredClone(context.current.personal);context.capturePersonalNavigation(snapshot,context.readerPackage(),context.selection,false);context.resolvePersonalNavigation(snapshot,context.readerPackage());saved.push({entryId:context.current.entry.id,personal:snapshot});},
 };
 runInNewContext(body('function sourceNavigationAliases(','function paintPersonalSaveError('),context);
 runInNewContext(body('async function visitMemorySource(','/** An explicit delivery request'),context);
 return{context,a,b,view,opens,saved,paints,imports,presentations,aliases,setAdmitted(value:any){admitted=value;},setReturnPackage(value:any){returnPackage=value;},setGate(value:Promise<void>){gate=value;}};
}
test('production Source/Return restores score edition, continuation alias, exact view and editor navigation across scores',async()=>{
 const f=fixture();await f.context.visitMemorySource();assert.deepEqual(f.opens,['reference']);assert.deepEqual(f.imports,['reference-edition.isoscore']);assert.deepEqual(f.presentations,['janko-four-row']);
 assert.equal(f.context.selection.ownerIds[0],'reference-owner');assert.equal(f.context.current.personal.view.page,1);assert.equal(f.context.editNavigation,'measures');assert.equal(f.context.sourceReturn.file,f.a.entry.file);
 const reopened={...f.a.package,seats:f.aliases.map((s,i)=>({...s,id:`reflow-${i}`,contactId:`reflow-contact-${i}`,page:i?i+3:0}))};f.setReturnPackage(reopened);
 f.context.current.personal.view.rotation=180;f.context.editNavigation='notes';f.context.selectionPitchToggle=false;await f.context.visitMemorySource();
 assert.deepEqual(f.opens,['reference','departure']);assert.equal(f.context.current.entry.file,'departure-edition.isoscore');assert.equal(f.context.current.package.sourceRevision,'departure-source');
 assert.equal(f.context.selection.id,'reflow-2');assert.equal(f.context.selection.continuation,true);assert.equal(f.context.selection.writtenBar,18);assert.deepEqual(structuredClone(f.context.current.personal.view),f.view);
 assert.equal(f.context.editNavigation,'measures');assert.equal(f.context.selectionPitchToggle,true);assert.equal(f.context.sourceReturn,undefined);assert.equal(f.context.sourceNavigating,false);
 const saved=f.saved.at(-1);assert.equal(saved.entryId,'departure');assert.equal(saved.personal.navigation.edit.alias,1);assert.equal(saved.personal.navigation.edit.continuation,true);assert.equal(saved.personal.editContactId,'reflow-contact-2');assert.deepEqual(saved.personal.choices,{untouched:{finger:3}});
});
test('a mismatched reference source is rejected before leaving the current score',async()=>{
 const f=fixture();f.setAdmitted({...f.b.package,sourceRevision:'different-source'});await assert.rejects(f.context.visitMemorySource(),/reference edition is unavailable/);
 assert.equal(f.context.current,f.a);assert.equal(f.context.selection,f.aliases[2]);assert.deepEqual(f.opens,[]);assert.equal(f.context.sourceReturn,undefined);assert.equal(f.context.sourceNavigating,false);
});
test('Return retains the departure anchor and refuses a replaced active edition',async()=>{
 const f=fixture();await f.context.visitMemorySource();const anchor=f.context.sourceReturn;f.context.entries[0]={...f.a.entry,file:'replacement.isoscore'};
 await assert.rejects(f.context.visitMemorySource(),/departure edition is no longer active/);assert.deepEqual(f.opens,['reference']);assert.equal(f.context.current,f.b);assert.equal(f.context.sourceReturn,anchor);assert.equal(f.context.sourceNavigating,false);
});
test('Return rejects changed source bytes even when the active filename is unchanged',async()=>{
 const f=fixture();await f.context.visitMemorySource();const anchor=f.context.sourceReturn;f.setReturnPackage({...f.a.package,sourceRevision:'changed',manifest:{revision:'changed-package'}});
 await assert.rejects(f.context.visitMemorySource(),/departure source changed/);assert.equal(f.context.sourceReturn,anchor);assert.equal(f.context.sourceNavigating,false);assert.deepEqual(f.paints,['reference']);
});
test('repeated source commands during admission cannot overwrite the departure with an intermediate score',async()=>{
 const f=fixture();let release!:()=>void;f.setGate(new Promise<void>(resolve=>{release=resolve;}));const first=f.context.visitMemorySource();await f.context.visitMemorySource();assert.deepEqual(f.opens,[]);
 release();await first;assert.deepEqual(f.opens,['reference']);assert.equal(f.context.sourceReturn.entryId,'departure');await f.context.visitMemorySource();assert.deepEqual(f.opens,['reference','departure']);assert.equal(f.context.selection.id,'held-second');
});
