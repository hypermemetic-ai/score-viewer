import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {DOMParser} from '@xmldom/xmldom';
import {StretchController} from '../src/stretch-calibration-controller';
import {initialStretchArchive,latestSlotOutcome,usesSupersededFingertipWindow} from '../src/stretch-calibration';
import {createDefaultStretchSetup,isNominalStretchSetup} from '../src/stretch-calibration-setup';
import {stretchFingertipMapping,encodeStretchFingertipPercentages,stretchFingertipDifferenceMm} from '../src/stretch-fingertip-landmarks';

const source=readFileSync(new URL('../src/stretch-calibration-view.ts',import.meta.url),'utf8');
const between=(start:string,end:string)=>{const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a,`${start} must be present`);return source.slice(a,b);};
const commands=between('const command=','const list=');
const createCode=between(' async function create(hand:Hand)',' async function saveReach(');
const reachCode=between(' async function saveReach(',' async function enterTarget(');
const keyCode=between('  key(event:KeyboardEvent','  suspend()');
const startCase=between("   case 'start-right':","   case 'review':");

async function keyboardFixture(){
 let bytes:Uint8Array|undefined,flight:Promise<unknown>=Promise.resolve(),serial=0,helperCalls=0;
 const controller=new StretchController({load:{value:initialStretchArchive()},files:{async read(){return bytes;},async write(_name,value){bytes=new Uint8Array(value);}},id:()=>`authored-start-${++serial}`});
 const focus:string[]=[],field={id:'stretch-percent',dataset:{},disabled:false,tabIndex:0,
  closest(selector:string){return selector.includes('input')?field:null;},focus(){focus.push('numeric');}};
 const camera={id:'',dataset:{},disabled:false,tabIndex:0,closest(){return null;},focus(){focus.push('camera');}};
 let api:any;
 const right={id:'',dataset:{stretchCommand:'start-right'},disabled:false,tabIndex:0,closest(selector:string){return selector.includes('[data-stretch-command=start')?this:null;},focus(){focus.push('right');},click(){api.start('RH');}};
 const left={...right,dataset:{stretchCommand:'start-left'},focus(){focus.push('left');},click(){api.start('LH');}};
 const save={id:'',dataset:{stretchCommand:'save-reach'},disabled:false,tabIndex:0,closest(){return null;},getClientRects(){return[{}];},focus(){focus.push('save');},click(){flight=api.perform(api.saveReach);}};
 const context:any={controller,page:'home',returnPage:'home',creating:false,stopped:false,suspended:false,focusKey:'',navigationGeneration:0,notice:'',
  heldActivations:new Set(),heldPairNavigation:new Set(),keyboard:undefined,art:{hidden:true},navigation:{picking:false,keyDown(){return false;}},
  options:{playerId:'authored-player',instrument:'janko-four-row'},reachMethod:'percentage',primary:2,primaryPercentage:'100',percentage:'50',millimeters:'',
  actionCode:(event:KeyboardEvent)=>event.code==='NumpadEnter'?'Enter':event.code,
  number:(value:string)=>value.trim()===''?null:Number.isFinite(Number(value))?Number(value):null,
  stretchFingertipMapping,encodeStretchFingertipPercentages,stretchFingertipDifferenceMm,
  async createDefaultStretchSetup(input:Parameters<typeof createDefaultStretchSetup>[0]){helperCalls++;return createDefaultStretchSetup({...input,setupId:`authored-default-${helperCalls}`});},
  busy(){return controller.state.busy||context.creating;},
  render(){context.art.hidden=context.page!=='work';if(!context.creating&&!controller.state.busy)api.safeFocus();},
  body:{querySelector(selector:string){if(controller.state.busy||context.creating)return null;if(selector.includes('=new]'))return{click(){api.transition('create');}};if(selector.includes('=start-right]'))return right;if(selector.includes('=start-left]'))return left;return null;}},
  footer:{querySelector(){return null;},querySelectorAll(){return context.page==='work'?[save]:[];}},
  dialog:{querySelectorAll(){return context.page==='work'?[camera,field,save]:[right,left];},querySelector(){return context.page==='work'?field:right;}}
 };
 const production=between('const controlKey=',' function openOptions(')+between(' async function perform(',' function scene(')+between(' function windowFor(',' function currentSources(')+between(' function safeFocus(',' function render(')+createCode+reachCode;
 const instrumented=`${production}\nconst rawPerform=perform; perform=(action)=>{flight=rawPerform(action);return flight;};\nfunction start(hand){const target={dataset:{stretchCommand:hand==='LH'?'start-left':'start-right'}};switch(target.dataset.stretchCommand){${startCase}}}\n({key:({${keyCode}}).key,start,saveReach,perform,safeFocus,transition,back})`;
 context.flight=flight;Object.defineProperty(context,'flight',{get(){return flight;},set(value){flight=value;},configurable:true});
 api=runInNewContext(stripTypeScriptTypes(instrumented),context);
 const key=(code:string,target:any=right,repeat=false,type='key-down')=>api.key({code,key:code,repeat,ctrlKey:false,altKey:false,metaKey:false,shiftKey:false,target},type);
 return{controller,context,focus,field,right,left,key,back:()=>api.back(),get calls(){return helperCalls;},wait:()=>flight,get bytes(){return bytes;},dispose(){controller.dispose();}};
}

for(const choice of ['KeyR','KeyL','Enter','NumpadEnter'])test(`New N then ${choice} starts the chosen hand and Enter saves the visible first reading`,async()=>{
 const f=await keyboardFixture();
 try{
  assert.equal(f.key('KeyN'),true);assert.equal(f.context.page,'create');assert.equal(f.focus.at(-1),'right');
  assert.equal(f.key(choice),true);await f.wait();
  assert.equal(f.calls,1);assert.equal(f.context.page,'work');assert.equal(f.controller.state.session!.plan.provenance.hand,choice==='KeyL'?'LH':'RH');
  assert.equal(f.controller.state.current.phase,'relative-fingertip-reach');assert.equal(f.focus.at(-1),'numeric');
  if(choice==='Enter'||choice==='NumpadEnter'){f.key(choice,f.field,true);f.key(choice,f.field);assert.equal(f.controller.state.session!.entries.length,0,'held confirmation must not become a reading');}
  f.key(choice,f.field,false,'key-up');
  assert.equal(f.key('Enter',f.field),true);await f.wait();
  assert.equal(f.controller.state.session!.entries.filter(entry=>entry.kind==='relative-fingertip-reach').length,1);
  assert.equal(f.controller.state.current.relativeSlot!.pair[0],2);assert.ok(f.bytes);
  f.key('Enter',f.field,true);f.key('Enter',f.field);await f.wait();
  assert.equal(f.controller.state.session!.entries.filter(entry=>entry.kind==='relative-fingertip-reach').length,1,'held Enter cannot rate a subsequent slot');
  const reading=f.controller.state.session!.entries[0];assert.equal(reading.kind,'relative-fingertip-reach');
  if(reading.kind==='relative-fingertip-reach'){
   assert.equal(reading.reading.kind,'window-fractions');
   if(reading.reading.kind==='window-fractions'){
    assert.equal(reading.reading.axisStartMm,34);assert.equal(reading.reading.axisEndMm,93.75);
    assert.ok(Math.abs((reading.reading.secondFraction-reading.reading.firstFraction)*59.75-46.85)<1e-9,'local thumb50/index100 uses staggered physical depths');
   }
   const raw=JSON.parse(reading.notes!);assert.equal(raw.rawOtherPercentage,'50');assert.equal(raw.rawPrimaryPercentage,'100');assert.equal(raw.primaryFinger,2);
   assert.deepEqual(raw.localWindows.map((window:any)=>[window.midiPitch,window.row,window.axisStartMm,window.axisEndMm]),choice==='KeyL'?[[63,1,34,59.8],[60,2,66,93.75]]:[[61,1,34,59.8],[64,2,66,93.75]]);
  }
 }finally{f.dispose();}
});

test('changing a comparable pair’s primary finger preserves its physical axes and second-minus-first sign',async()=>{
 const f=await keyboardFixture();
 try{
  f.key('KeyN');f.key('KeyR');await f.wait();f.key('KeyR',f.field,false,'key-up');
  f.key('Enter',f.field);await f.wait();f.key('Enter',f.field,false,'key-up');
  f.context.primary=3;f.context.primaryPercentage='100';f.context.percentage='50';
  f.key('Enter',f.field);await f.wait();
  const reading=f.controller.state.session!.entries[1];assert.equal(reading.kind,'relative-fingertip-reach');
  if(reading.kind==='relative-fingertip-reach'&&reading.reading.kind==='window-fractions')assert.ok(Math.abs((reading.reading.secondFraction-reading.reading.firstFraction)*27.75-13.875)<1e-9);
 }finally{f.dispose();}
});

test('rechecking an earlier terrace reading leaves a fresh draft and preserves the original evidence',async()=>{
 const f=await keyboardFixture();
 try{
  f.key('KeyN');f.key('KeyR');await f.wait();
  const slot=f.controller.state.current.relativeSlot!;
  await f.controller.saveReach({kind:'window-fractions',windowId:`${slot.referenceFrameId}:row-1:depth-window`,firstFraction:.5,secondFraction:1,axisStartMm:0,axisEndMm:59.8,windowReference:'old row 1 near/far physical terrace edges'},'{"primaryFinger":2,"rawPrimaryPercentage":"100","rawOtherPercentage":"50"}');
  await f.controller.navigate({phase:'relative-fingertip-reach',slotId:slot.id});
  const before=f.controller.export(),context:any={controller:f.controller,reachPreferences:new Map(),lastSlot:slot.id,notice:'',latestSlotOutcome,usesSupersededFingertipWindow,rememberReachDraft(){}};
  runInNewContext(stripTypeScriptTypes(between(' function initializeReachDraft(',' function rememberInput(')+'initializeReachDraft(controller.state.session);'),context);
  assert.equal(context.percentage,'');assert.equal(context.primaryPercentage,'100');assert.equal(context.primary,2);
  assert.equal(f.controller.export(),before);
 }finally{f.dispose();}
});

test('the hand-choice page has two direct buttons and no technical setup form or second start action',()=>{
 const body={innerHTML:''};runInNewContext(stripTypeScriptTypes(commands+between(' function renderCreate(){',' function renderReach(')+'renderCreate();'),{body,busy:()=>false,esc:(value:string)=>value});
 const doc=new DOMParser().parseFromString(body.innerHTML,'text/html'),buttons=Array.from(doc.getElementsByTagName('button'));
 assert.deepEqual(buttons.map(button=>button.getAttribute('data-stretch-command')),['start-right','start-left']);
 assert.equal(doc.getElementsByTagName('input').length,0);assert.equal(doc.getElementsByTagName('select').length,0);
 assert.deepEqual(buttons.map(button=>button.getElementsByTagName('kbd')[0].textContent),['R','L']);
});

test('resuming a relative reading keeps Save visible and does not create a contact attestation gate',async()=>{
 const input=await createDefaultStretchSetup({playerId:'authored-player',hand:'RH',instrument:'janko-four-row',setupId:'authored-footer'});
 const footer={innerHTML:''},start=source.indexOf('  const work=current.phase'),end=source.indexOf('  arrangeBottomNavigation(',start);
 runInNewContext(stripTypeScriptTypes(commands+source.slice(start,end)),{footer,page:'work',current:{phase:'relative-fingertip-reach',needsSetup:false},state:{resumeRequired:true},session:{plan:{provenance:input.provenance}},disabled:false,esc:(value:string)=>value});
 const doc=new DOMParser().parseFromString(`<div>${footer.innerHTML}</div>`,'text/html'),buttons=Array.from(doc.getElementsByTagName('button'));
 assert.ok(buttons.some(button=>button.getAttribute('data-stretch-command')==='save-reach'));
 assert.equal(buttons.some(button=>button.getAttribute('data-stretch-command')==='reproduce'),false);
});

test('current options do not expose the obsolete editor while exports remain available',()=>{
 const a=source.indexOf("  else if(page==='options'){"),b=source.indexOf("  }else if(page==='review'",a);assert.ok(a>=0&&b>a);
 let legacyCalls=0;const body={innerHTML:''},options={openLegacy(){legacyCalls++;},openCurl(){}};
 const field=(label:string,contents:string)=>`<label>${label}${contents}</label>`;
 runInNewContext(stripTypeScriptTypes(commands+source.slice(a,b).replace("  else if(page==='options'){",'if(true){')+'}'),{body,options,field,session:{},disabled:false,esc:(value:string)=>value});
 assert.equal(body.innerHTML.includes('Finger span'),false);assert.equal(body.innerHTML.includes('data-stretch-command="legacy"'),false);assert.equal(legacyCalls,0);
 assert.ok(source.includes("command('export-all','Export all evidence')"));
});

test('automatic coverage is labeled a test-window edge and existing manual coverage retains its declared meaning',async()=>{
 const nominal=await createDefaultStretchSetup({playerId:'authored-player',hand:'RH',instrument:'janko-four-row',setupId:'authored-edge'});
 const label=runInNewContext(stripTypeScriptTypes(between('const coverageLabel=','const omissionLabel=')+'coverageLabel'),{isNominalStretchSetup}) as (session:any)=>string;
 assert.equal(label({plan:{provenance:nominal.provenance}}),'Test window edge');
 assert.equal(label({plan:{provenance:{...nominal.provenance,seatingReference:'Operator declared bench position'}}}),'Keyboard edge');
});

for(const hand of ['KeyR','KeyL'])test(`new ${hand} collection leaves previous keyboard rotation and gives its first reading numeric focus`,async()=>{
 const f=await keyboardFixture();
 try{
  f.key('KeyN');f.key('KeyR');await f.wait();f.key('KeyR',f.field,false,'key-up');
  let exits=0;
  f.context.keyboard={keyboardRotation:true,key(){return false;},focusCanvas(){f.focus.push('camera');},endKeyboardRotation(){this.keyboardRotation=false;exits++;}};
  f.context.render();assert.equal(f.focus.at(-1),'camera','the old collection really owns keyboard rotation before Back');
  f.back();assert.equal(f.context.page,'home');assert.equal(f.context.keyboard.keyboardRotation,true);
  f.key('KeyN');f.key(hand);await f.wait();
  assert.equal(f.context.page,'work');assert.equal(f.context.keyboard.keyboardRotation,false);assert.equal(exits,1);
  assert.equal(f.focus.at(-1),'numeric');
  assert.equal(f.controller.state.session!.entries.length,0,'starting another hand makes no physical observation');
 }finally{f.dispose();}
});
