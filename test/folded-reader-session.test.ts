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
