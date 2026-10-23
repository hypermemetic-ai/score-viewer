import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {ScoreReadiness} from '../src/score-readiness';

// The reader's own stages for an opened score, as main.ts has them: the shared
// fingers it resolves once the pages show.
const source=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
const start='/** Register the score in fingering memory',end='/** Another writer changed';
const stages=stripTypeScriptTypes(source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start))));
const flush=async()=>{for(let i=0;i<10;i++)await new Promise<void>(resolve=>setImmediate(resolve));};

function opened(register:()=>Promise<unknown>,memoryError?:Error){
 const view={page:3},target:any={entry:{id:'no14'},package:{},personal:{view,overrides:{}}};
 const editor={visiblePersonal:structuredClone(target.personal)},said:string[]=[];
 const context:any={current:target,practice:undefined,readingPresentation:undefined,ScoreReadiness,structuredClone,
  livePersonalEditors:new WeakMap([[target,editor]]),scoreCapabilities:()=>({pianoPreparation:false,pianoPractice:false}),
  personalMemory:{register:async(_e:unknown,_p:unknown,personal:any)=>{await register();return {...structuredClone(personal),view:{page:0}};},get error(){return memoryError;}},
  // Shared memory adds fingers only.
  resolveMemory:(t:any)=>({...t.personal,memoryResolved:{revision:1,sourceRevision:'r',choices:{n1:{finger:3}}}}),
  noticeOnScreen:async()=>{},nextTask:async()=>{},renderToolbar(){said.push('toolbar');},
  cancelledReading:()=>new DOMException('Opening cancelled.','AbortError'),
  reportFailure(error:Error){said.push(`failure:${error.message}`);},paintPersonalSaveError(_t:unknown,error:Error){said.push(`unsaved:${error.message}`);},
 };
 runInNewContext(stages,context);
 const readiness:ScoreReadiness=context.scoreReadiness(target,true);
 return {context,target,editor,view,said,readiness};
}

test('shared fingers resolved after the pages show reach what the reader draws, where it is looking',async()=>{
 const f=opened(async()=>{});
 await f.readiness.whenReady('fingers');
 assert.deepEqual(f.target.personal.memoryResolved.choices,{n1:{finger:3}});
 assert.deepEqual(f.editor.visiblePersonal.memoryResolved?.choices,{n1:{finger:3}},'the reader draws its seats from visiblePersonal: shared fingers must be there when fingerings show');
 assert.notEqual(f.editor.visiblePersonal,f.target.personal,'what the reader draws is its own copy');
 assert.equal(f.target.personal.view,f.view,'the page the player turned to stays');
 assert.deepEqual(f.said,['toolbar']);
});

test('fingers that fail after the pages show say why, as the opening did',async()=>{
 const f=opened(async()=>{throw Error('Personal library remained busy; new score registration was not applied.');});
 await assert.rejects(f.readiness.whenReady('fingers'),/remained busy/);
 assert.deepEqual(f.said,['failure:Personal library remained busy; new score registration was not applied.']);
 assert.equal(f.editor.visiblePersonal.memoryResolved,undefined);
 const busy=Error('Personal library remained busy; new score registration was not applied.');
 const saving=opened(async()=>{throw busy;},busy);
 await assert.rejects(saving.readiness.whenReady('fingers'));
 assert.deepEqual(saving.said,[`unsaved:${busy.message}`],'a store that stopped saving shows the save error, with its retry');
});

test('fingers for a score the player has left say nothing and change nothing it draws',async()=>{
 let release!:()=>void;const f=opened(()=>new Promise<void>(resolve=>{release=resolve;}));
 const claim=f.readiness.prepare('fingers');claim.done.catch(()=>{});await flush();
 f.context.current={entry:{id:'other'}};release();await flush();
 await assert.rejects(claim.done);
 assert.deepEqual(f.said,[]);assert.equal(f.editor.visiblePersonal.memoryResolved,undefined);
 assert.equal(f.target.personal.memoryResolved,undefined);
});
