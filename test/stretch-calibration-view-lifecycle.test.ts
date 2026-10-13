import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {DOMParser} from '@xmldom/xmldom';
import {STRETCH_CALIBRATION_GRADES} from '@hypermemetic-ai/fingering-calculator';
import {createStretchGeometry,surfaceContact} from '../src/stretch-calibration-geometry';
import {StretchController} from '../src/stretch-calibration-controller';
import {initialStretchArchive,loadStretch,effectivePairReports,recommendedSpanSteps} from '../src/stretch-calibration';

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

test('a fresh reading focuses its numeric field rather than an unkeyed camera control',()=>{
 const focused:string[]=[],control=(id:string)=>({id,dataset:{},disabled:false,tabIndex:0,closest(){return null;},focus(){focused.push(id||'camera');}});
 const camera=control(''),field=control('stretch-percent');
 const context={keyboard:undefined,art:{hidden:true},focusKey:'',footer:{querySelector(){return null;}},dialog:{querySelectorAll(){return[camera,field];},querySelector(){return field;}}};
 const keyStart=source.indexOf('const controlKey='),keyEnd=source.indexOf('function transition(',keyStart),focusStart=source.indexOf('function safeFocus('),focusEnd=source.indexOf('function render(',focusStart);
 assert.ok(keyStart>=0&&keyEnd>keyStart&&focusStart>=0&&focusEnd>focusStart);
 runInNewContext(stripTypeScriptTypes(source.slice(keyStart,keyEnd)+source.slice(focusStart,focusEnd)+'safeFocus();'),{...context});
 assert.deepEqual(focused,['stretch-percent']);
 context.focusKey='stretch-percent';focused.length=0;
 runInNewContext(stripTypeScriptTypes(source.slice(keyStart,keyEnd)+source.slice(focusStart,focusEnd)+'safeFocus();'),{...context});
 assert.deepEqual(focused,['stretch-percent'],'an existing named field also restores correctly');
});

const moveStart=source.indexOf(' async function movePair('),moveEnd=source.indexOf(' function renderTriple(',moveStart);
assert.ok(moveStart>=0&&moveEnd>moveStart);
const moveHandler=stripTypeScriptTypes(source.slice(moveStart,moveEnd)+'movePair');

test('pair navigation preserves an unanswered adjusted target and creates no omission',async()=>{
 const f=await fixture();
 try{
  assert.equal(await f.controller.prepareBaseline({spanSteps:4}),true);
  const selected=f.controller.state.current.trial!.id,session=f.controller.state.session!,pairCursors=new Map<string,string|null>();
  const context={controller:f.controller,page:'work',navigationGeneration:0,stopped:false,suspended:false,pairNavigating:false,focusKey:'',pairCursors,effectivePairReports,busy:()=>f.controller.state.busy};
  const move=runInNewContext(moveHandler,context) as (delta:number)=>Promise<void>;
  const before=f.controller.state.session!.entries.length;
  await move(1);assert.equal(f.controller.state.current.slotId,session.plan.pairSweeps[1].id);
  await move(-1);assert.equal(f.controller.state.current.trial!.id,selected);assert.equal(f.controller.state.current.trial!.distanceSemitoneSteps,4);
  assert.equal(f.controller.state.session!.entries.length,before);assert.equal(f.controller.state.session!.entries.some(e=>e.kind==='omission'),false);
  assert.equal(f.controller.state.current.needsSetup,true,'moving back requires reproducing the chosen contact');
 }finally{f.dispose();}
});

test('pair navigation restores the latest unanswered declared target after a prior reachable rating',async()=>{
 const f=await fixture();
 try{
  assert.equal(await f.controller.prepareBaseline({spanSteps:4}),true);assert.equal(await f.controller.prepare(),true);assert.equal(await f.controller.rate(1),true);
  const selected=f.controller.state.current.trial!.id,pairCursors=new Map<string,string|null>(),session=f.controller.state.session!;
  await f.controller.navigate({phase:'progressive-pairs',slotId:session.plan.pairSweeps[1].id});
  const context={controller:f.controller,page:'work',navigationGeneration:0,stopped:false,suspended:false,pairNavigating:false,focusKey:'',pairCursors,effectivePairReports,busy:()=>f.controller.state.busy};
  const move=runInNewContext(moveHandler,context) as (delta:number)=>Promise<void>;
  await move(-1);assert.equal(f.controller.state.current.trial!.id,selected);assert.equal(f.controller.state.current.trial!.distanceSemitoneSteps,6);
  assert.equal(f.controller.state.session!.entries.filter(e=>e.kind==='pair-stretch').length,1);assert.equal(f.controller.state.session!.entries.some(e=>e.kind==='omission'),false);
 }finally{f.dispose();}
});

const keyStart=source.indexOf('  key(event:KeyboardEvent'),keyEnd=source.indexOf('  suspend()',keyStart);
const keyHandler=stripTypeScriptTypes('({'+source.slice(keyStart,keyEnd)+'}).key');
test('pair arrows reject repeats, held chords and pending navigation while camera keys have priority',async()=>{
 const visited:number[]=[],heldPairNavigation=new Set<string>(),context={stopped:false,suspended:false,page:'work',heldActivations:new Set(),heldPairNavigation,
  controller:{state:{current:{phase:'progressive-pairs'}},inputKey(){return Promise.resolve(false);}},navigation:{picking:false,keyDown(){return false;}},keyboard:{key(){return false;}},
  busy:()=>false,perform(action:()=>Promise<void>){void action();},async movePair(delta:number){visited.push(delta);}};
 const key=runInNewContext(keyHandler,context) as (event:KeyboardEvent,type?:string)=>boolean;
 const event=(code:string,repeat=false)=>({code,key:code,repeat,ctrlKey:false,altKey:false,metaKey:false,shiftKey:false,target:{closest(){return null;}}}) as unknown as KeyboardEvent;
 assert.equal(key(event('ArrowRight')),true);key(event('ArrowRight',true));key(event('ArrowLeft'));assert.deepEqual(visited,[1]);
 key(event('ArrowRight'),'key-up');key(event('ArrowLeft'),'key-up');key(event('ArrowLeft'));assert.deepEqual(visited,[1,-1]);key(event('ArrowLeft'),'key-up');
 context.busy=()=>true;key(event('ArrowRight'));context.busy=()=>false;key(event('ArrowRight'));assert.deepEqual(visited,[1,-1],'a key pressed during persistence still must release');key(event('ArrowRight'),'key-up');
 context.keyboard.key=()=>true;key(event('ArrowRight'));assert.deepEqual(visited,[1,-1],'explicit camera rotation consumes arrows before pair navigation');
});

test('the pair screen keeps unavailable available and lets an unavailable-only start adjust again',async()=>{
 const f=await fixture();
 try{
  assert.equal(await f.controller.prepareBaseline({spanSteps:4}),true);assert.equal(await f.controller.prepare(),true);assert.equal(await f.controller.rate(5),true);
  const body={innerHTML:''},context={controller:f.controller,body,pairCursors:new Map(),effectivePairReports,recommendedSpanSteps,surfaceContact,STRETCH_CALIBRATION_GRADES,
   busy:()=>false,scene(){},art:{hidden:true},keyboard:{ready:true},baselinePreviewReady:false,visibleTrialId:null,
   list(points:string[]){return `<ul>${points.map(point=>`<li>${point}</li>`).join('')}</ul>`;},esc:(value:string)=>value,
   gradeDescriptions:['Relaxed','Little','Moderate','Large','Reachable','Unavailable']};
  const commandStart=source.indexOf('const command='),commandEnd=source.indexOf('const list=',commandStart),pairStart=source.indexOf(' function renderPair('),pairEnd=source.indexOf(' function pairFooter(',pairStart);
  const render=runInNewContext(stripTypeScriptTypes(source.slice(commandStart,commandEnd)+source.slice(pairStart,pairEnd)+'renderPair'),context) as (session:NonNullable<typeof f.controller.state.session>)=>void;
  render(f.controller.state.session!);
  let doc=new DOMParser().parseFromString(`<div>${body.innerHTML}</div>`,'text/html');
  const commands=()=>Array.from(doc.getElementsByTagName('button')).map(button=>button.getAttribute('data-stretch-command'));
  assert.ok(commands().includes('narrower'));assert.ok(commands().includes('wider'));assert.match(doc.documentElement!.textContent!,/recorded as unavailable/);
  assert.equal(await f.controller.prepare(),true);render(f.controller.state.session!);doc=new DOMParser().parseFromString(`<div>${body.innerHTML}</div>`,'text/html');
  const ratings=Array.from(doc.getElementsByTagName('button')).filter(button=>button.hasAttribute('data-grade'));
  assert.equal(ratings.length,6);assert.equal(ratings.find(button=>button.getAttribute('data-grade')==='5')!.hasAttribute('disabled'),false);
  assert.match(doc.documentElement!.textContent!,/Make static contact and rate the stretch\./);
  assert.equal(body.innerHTML.includes('stretch-contact-summary'),false,'pair/spans/rows are identified by the illustration and ledger');
  const footer={innerHTML:''},footerStart=source.indexOf('  footer.innerHTML='),footerEnd=source.indexOf('\n',footerStart),pairFooterStart=source.indexOf(' function pairFooter('),pairFooterEnd=source.indexOf(' async function movePair(',pairFooterStart);
  const footerContext={...context,footer,page:'work',current:{...f.controller.state.current,needsSetup:true},session:f.controller.state.session,work:'progressive-pairs',resume:false,disabled:false};
  runInNewContext(stripTypeScriptTypes(source.slice(commandStart,commandEnd)+source.slice(pairFooterStart,pairFooterEnd)+source.slice(footerStart,footerEnd)),footerContext);
  const footerDoc=new DOMParser().parseFromString(`<div>${footer.innerHTML}</div>`,'text/html'),footerButtons=Array.from(footerDoc.getElementsByTagName('button'));
  assert.equal(footerButtons.some(button=>button.getAttribute('data-stretch-command')==='skip'),false);
  assert.equal(footerButtons.find(button=>button.getAttribute('data-stretch-command')==='begin-pair')!.textContent!.trim(),'Rate this contact Enter');
  assert.ok(footerButtons.some(button=>button.getAttribute('data-stretch-command')==='previous-pair'));assert.ok(footerButtons.some(button=>button.getAttribute('data-stretch-command')==='next-pair'));
 }finally{f.dispose();}
});

for(const reachableAfterNarrowing of [false,true])test(`uncached pair recovery retains the narrowed ${reachableAfterNarrowing?'outward candidate':'unanswered target'} after an unavailable wider start`,async()=>{
 const f=await fixture();
 try{
  assert.equal(await f.controller.prepareBaseline({spanSteps:8}),true);assert.equal(await f.controller.prepare(),true);assert.equal(await f.controller.rate(5),true);
  assert.equal(await f.controller.prepareBaseline({spanSteps:4}),true);
  if(reachableAfterNarrowing){assert.equal(await f.controller.prepare(),true);assert.equal(await f.controller.rate(1),true);}
  const selected=f.controller.state.current.trial!.id,expectedSpan=reachableAfterNarrowing?6:4,session=f.controller.state.session!;
  await f.controller.navigate({phase:'progressive-pairs',slotId:session.plan.pairSweeps[1].id});
  const context={controller:f.controller,page:'work',navigationGeneration:0,stopped:false,suspended:false,pairNavigating:false,focusKey:'',pairCursors:new Map(),effectivePairReports,busy:()=>f.controller.state.busy};
  const move=runInNewContext(moveHandler,context) as (delta:number)=>Promise<void>;
  await move(-1);assert.equal(f.controller.state.current.trial!.id,selected);assert.equal(f.controller.state.current.trial!.distanceSemitoneSteps,expectedSpan);
  assert.equal(f.controller.state.session!.entries.some(e=>e.kind==='omission'),false,'recovery does not convert unanswered contacts into omissions');
 }finally{f.dispose();}
});

test('off-mode camera button focus still lets left/right navigate finger pairs',()=>{
 const visited:number[]=[],context={stopped:false,suspended:false,page:'work',heldActivations:new Set(),heldPairNavigation:new Set(),
  controller:{state:{current:{phase:'progressive-pairs'}},inputKey(){return Promise.resolve(false);}},navigation:{picking:false,keyDown(){throw Error('pair arrows must claim the event before ordinary button navigation');}},keyboard:{key(){return false;}},
  busy:()=>false,perform(action:()=>Promise<void>){void action();},async movePair(delta:number){visited.push(delta);}};
 const key=runInNewContext(keyHandler,context) as (event:KeyboardEvent,type?:string)=>boolean;
 const button={closest(selector:string){return selector==='[data-camera]'?button:null;}};
 const event={code:'ArrowRight',key:'ArrowRight',repeat:false,ctrlKey:false,altKey:false,metaKey:false,shiftKey:false,target:button} as unknown as KeyboardEvent;
 assert.equal(key(event),true);assert.deepEqual(visited,[1]);
});

test('withdrawn reachable evidence keeps the original arrangement frozen without offering failing adjustments',async()=>{
 const f=await fixture();
 try{
  assert.equal(await f.controller.prepareBaseline({spanSteps:4}),true);assert.equal(await f.controller.prepare(),true);assert.equal(await f.controller.rate(1),true);
  const report=f.controller.state.session!.entries.find(e=>e.kind==='pair-stretch')!;assert.equal(await f.controller.retract(report.id,'Authored correction'),true);
  assert.equal(await f.controller.prepareBaseline({spanSteps:6}),false,'the controller intentionally retains its raw-history arrangement lock');
  const body={innerHTML:''},context={controller:f.controller,body,pairCursors:new Map(),effectivePairReports,recommendedSpanSteps,surfaceContact,STRETCH_CALIBRATION_GRADES,
   busy:()=>false,scene(){},art:{hidden:true},keyboard:{ready:true},baselinePreviewReady:false,visibleTrialId:null,
   list(points:string[]){return `<ul>${points.map(point=>`<li>${point}</li>`).join('')}</ul>`;},esc:(value:string)=>value,
   gradeDescriptions:['Relaxed','Little','Moderate','Large','Reachable','Unavailable']};
  const commandStart=source.indexOf('const command='),commandEnd=source.indexOf('const list=',commandStart),pairStart=source.indexOf(' function renderPair('),pairEnd=source.indexOf(' function pairFooter(',pairStart);
  const render=runInNewContext(stripTypeScriptTypes(source.slice(commandStart,commandEnd)+source.slice(pairStart,pairEnd)+'renderPair'),context) as (session:NonNullable<typeof f.controller.state.session>)=>void;
  render(f.controller.state.session!);const doc=new DOMParser().parseFromString(`<div>${body.innerHTML}</div>`,'text/html');
  const commands=Array.from(doc.getElementsByTagName('button')).map(button=>button.getAttribute('data-stretch-command'));
  assert.equal(commands.includes('narrower'),false);assert.equal(commands.includes('wider'),false);
 }finally{f.dispose();}
});
