import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {createStretchGeometry} from '../src/stretch-calibration-geometry';
import {StretchController} from '../src/stretch-calibration-controller';
import {initialStretchArchive,loadStretch} from '../src/stretch-calibration';

const source=readFileSync(new URL('../src/stretch-calibration-view.ts',import.meta.url),'utf8');
const first=source.indexOf("case 'begin-pair':"),next=source.indexOf("case 'narrower':",first);
assert.ok(first>=0&&next>first,'The production pair-confirmation handler must be present.');
const handler=stripTypeScriptTypes(`switch ('begin-pair') {${source.slice(first,next)}}`);

async function fixture(){
 let bytes:Uint8Array|undefined,serial=0,delay=false,release!:()=>void,entered!:()=>void;
 const writeEntered=new Promise<void>(resolve=>{entered=resolve;});
 const files={async read(){return bytes;},async write(_name:string,value:Uint8Array){
  if(delay){entered();await new Promise<void>(resolve=>{release=resolve;});}
  bytes=new Uint8Array(value);
 }};
 const controller=new StretchController({load:{value:initialStretchArchive()},files,id:()=>`lifecycle-${++serial}`});
 assert.equal(await controller.createCollection({geometry:await createStretchGeometry([48,84]),row:1,anchorMidiPitch:61,
  provenance:{playerId:'authored-review-player',hand:'RH',setupId:'authored-review-setup',bodyMidlineXmm:0,seatingReference:'Synthetic lifecycle fixture',
   referenceLocation:{id:'authored-review-reference',kind:'operator-selected-central',xMm:0}}}),true);
 for(let i=0;i<4;i++)assert.equal(await controller.saveReach({kind:'signed-mm',differenceMm:0,method:'authored-fixture'}),true);
 let flight:Promise<unknown>|undefined,illustrationAvailable=true,renderedTrialId:string|null=null;
 const context={controller,page:'work',navigationGeneration:0,stopped:false,suspended:false,
  perform(action:()=>Promise<unknown>){flight=action();},
  pairIllustrationVisible(){return illustrationAvailable&&context.page==='work'&&!context.stopped&&!context.suspended&&
   renderedTrialId!==null&&renderedTrialId===controller.state.current.trial?.id;}};
 const unsubscribe=controller.subscribe(state=>{
  if(illustrationAvailable&&context.page==='work'&&!context.stopped&&!context.suspended)renderedTrialId=state.current.trial?.id??null;
 });
 return{controller,context,files,writeEntered,
  begin(){delay=true;runInNewContext(handler,context);assert.ok(flight);return flight;},
  release(){release();},hideIllustration(){illustrationAvailable=false;renderedTrialId=null;},
  dispose(){unsubscribe();controller.dispose();}};
}

test('the production pair confirmation waits for the durable target and its rendered illustration',async()=>{
 const f=await fixture();
 try{const flight=f.begin();await f.writeEntered;
  assert.equal(f.controller.state.current.trial,null);assert.equal(await f.controller.rate(1),false);
  f.release();await flight;
  assert.equal(f.controller.state.current.needsSetup,false);assert.equal(f.controller.state.resumeRequired,false);
  const saved=(await loadStretch(f.files)).value.sessions[0];
  assert.ok(saved.pairTrials.some(trial=>trial.id===saved.cursor?.trialId),'the prepared target is durable before ratings become available');
 }finally{f.dispose();}
});

for(const interruption of ['back','options','suspend'] as const)test(`late pair confirmation cannot rearm contacts after ${interruption}`,async()=>{
 const f=await fixture();
 try{const flight=f.begin();await f.writeEntered;
  f.context.navigationGeneration++;
  if(interruption==='suspend')f.context.suspended=true;else f.context.page=interruption==='back'?'home':'options';
  f.hideIllustration();f.controller.break();f.release();await flight;
  assert.equal(f.controller.state.resumeRequired,true);assert.equal(f.controller.state.current.needsSetup,true);
  assert.equal(await f.controller.rate(2),false);
  const saved=(await loadStretch(f.files)).value.sessions[0];
  assert.ok(saved.cursor?.trialId,'the accepted target remains available on resume');
  assert.equal(saved.entries.filter(e=>e.kind==='pair-stretch').length,0,'interruption creates no judgment');
 }finally{f.dispose();}
});

test('pair confirmation cannot prepare a target whose illustration was not rendered',async()=>{
 const f=await fixture();
 try{const flight=f.begin();await f.writeEntered;f.hideIllustration();f.release();await flight;
  assert.equal(f.controller.state.current.needsSetup,true);assert.equal(await f.controller.rate(1),false);
 }finally{f.dispose();}
});
