import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {stripTypeScriptTypes} from 'node:module';import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8'),body=(start:string,end:string)=>stripTypeScriptTypes(source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start))));

function sandbox(){
 const made:string[]=[],prefetched:string[]=[];
 class PersonalPresentationSession{constructor(){made.push('written');}prefetch(){prefetched.push('written');}}
 class FoldedReader{constructor(readonly p:unknown){made.push('folded reader');}}
 const context:any={structuredClone,livePersonalEditors:new WeakMap(),PersonalPresentationSession,FoldedReader,PersonalEditQueue:class{},personalStorageName:(id:string)=>id,made,prefetched};
 runInNewContext(body('function personalEditor(','async function presentReader('),context);
 const target=(id:string,revision='r1')=>({entry:{id},package:{sourceRevision:revision,sourceSha256:'s',keyboardLayout:'janko'},personal:{}});
 return {context,made,prefetched,target};
}

test('a folded score edits on its folded pages\' session; its written-out session is never made', ()=>{
 const {context,made,prefetched,target}=sandbox(),no13=target('no13');
 const editor=context.personalEditor(no13);assert.deepEqual(made,['folded reader']);
 editor.view={verbatimFold:{session:{prefetch(){prefetched.push('folded');}}}};
 context.shownSession(no13).prefetch();
 assert.deepEqual(prefetched,['folded']);assert.deepEqual(made,['folded reader']);
 // A score that does not fold draws its written-out pages, and only then makes their session.
 const other=target('no14');context.personalEditor(other);context.shownSession(other).prefetch();
 assert.deepEqual(prefetched,['folded','written']);assert.deepEqual(made,['folded reader','folded reader','written']);
});

test('selecting a note prefetches the session behind the pages shown', ()=>{
 const select=body('function selectFinger(','\nfunction ');
 assert.match(select,/shownSession\(current\)\.prefetch\(\)/);assert.doesNotMatch(select,/\.session\.prefetch\(\)/);
});

test('reopening a score in the session reuses its folded reader; another revision gets its own; four are kept', ()=>{
 const {context,target}=sandbox();
 const first=context.foldedReader(target('no13'));
 assert.equal(context.foldedReader(target('no13')),first);
 assert.notEqual(context.foldedReader(target('no13','r2')),first);
 for(const id of ['a','b','c','d'])context.foldedReader(target(id));
 assert.notEqual(context.foldedReader(target('no13')),first);
});

test('a fold that can\'t be drawn opens written out and says so, once a score', async()=>{
 const said:string[]=[],warned:unknown[]=[];
 const context:any={said,scoreCapabilities:()=>({pianoPreparation:true}),foldFailureSaid:new WeakSet(),notify:(text:string)=>said.push(text),
  foldFailureText:(error:Error)=>`folded pages failed: ${error.message}`,console:{warn:(...args:unknown[])=>warned.push(args)},DOMException,
  personalEditor:()=>({fold:{folds:()=>true,view:async()=>{throw Error('no room for bar 12');}}})};
 runInNewContext(body('async function presentReader(','/** A stored bar as the reader prints it'),context);
 const target={package:{}},written={pages:['written']};
 assert.equal(await context.presentReader(target,{},async()=>written),written,'the written-out pages are shown');
 assert.equal(await context.presentReader(target,{},async()=>written),written);
 assert.deepEqual(said,['folded pages failed: no room for bar 12'],'said once, with the reason');
 await context.presentReader({package:{}},{},async()=>written);assert.equal(said.length,2,'and once for another score');
});

test('Keep written out is remembered with the settings for the score package, until its passes differ otherwise', async()=>{
 let disk:any;const context:any={preferences:{version:1},personalStorageName:(id:string,p:any)=>`state-${id}-${p.layout}`,enqueue:(run:()=>Promise<unknown>)=>run(),writeJson:async(name:string,value:unknown)=>{assert.equal(name,'preferences.json');disk=structuredClone(value);}};
 runInNewContext(body('/** Written-out repeats the player keeps (K)','/** Why a repeat the reader would fold')+';globalThis.keepsWrittenOut=keepsWrittenOut;',context);
 const no13={entry:{id:'no13'},package:{layout:'janko'}},found={text:'Bar 9 has a different finger than bar 1, so the repeat is written out.'};
 assert.equal(context.keepsWrittenOut(no13,found),false);
 await context.keepWrittenOut(no13,found);
 // Reopened in a new session: the settings are read back from disk.
 context.preferences=structuredClone(disk);
 assert.equal(context.keepsWrittenOut(no13,found),true,'K holds across reopen');
 assert.equal(context.keepsWrittenOut({...no13,package:{layout:'conventional'}},found),false,'per score package');
 const other={text:'Bar 10 has a different hand than bar 2, so the repeat is written out.'};
 assert.equal(context.keepsWrittenOut(no13,other),false,'a different difference is offered again');
 await context.keepWrittenOut(no13,other);
 assert.deepEqual(disk.writtenOutRepeats,['state-no13-janko\n'+other.text],'one kept repeat per package');
});
