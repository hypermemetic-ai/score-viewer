import test from 'node:test';import assert from 'node:assert/strict';
import {ManualTempoControls,refreshPracticeSpeedDisplay} from '../src/manual-tempo-control';import {TempoRepeat} from '../src/tempo-repeat';
import {PracticeView} from '../src/practice-view';import {initialPractice,passed} from '../src/practice';import {speedNumber} from '../src/tempo-presentation';import {referenceFixture} from './support/reference-score';

const score=await referenceFixture(new URL('../vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.isoscore',import.meta.url));

/** Minimal field tree: real editor/repeat ownership, without emulating browser layout. */
function fixture(create?:(root:HTMLElement)=>ManualTempoControls){
 const prior=Object.fromEntries(['document','window','HTMLElement','HTMLInputElement','CSS'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const doc=Object.assign(new EventTarget(),{activeElement:undefined as unknown,hidden:false});
 class Element{
  parent?:Element;children:Element[]=[];dataset:Record<string,string>={};attributes=new Set<string>();
  get isConnected():boolean{return this===root||!!this.parent?.isConnected;}
  closest(selector:string):Element|undefined{return selector==='[data-manual-key]'&&this.dataset.manualKey||selector==='[data-practice-shortcuts]'&&this===root?this:this.parent?.closest(selector);}
  contains(element:Element):boolean{return this===element||this.children.some(child=>child.contains(element));}
  querySelector(selector:string):Field|undefined{return selector==='input'||selector.includes('data-manual-key')||selector.includes('data-practice-setting')?this.children.flatMap(child=>child instanceof Field?[child]:[child.querySelector(selector)]).find(Boolean):undefined;}
  querySelectorAll(selector:string):Field[]{return selector==='[data-practice-setting]'?this.children.flatMap(child=>child instanceof Field&&child.dataset.practiceSetting?[child]:child.querySelectorAll(selector)):[];}
  setAttribute(key:string){this.attributes.add(key);}removeAttribute(key:string){this.attributes.delete(key);}hasAttribute(key:string){return this.attributes.has(key);}
  focus(){doc.activeElement=this;}matches(){return false;}
 }
 class Field extends Element{
  value='30';readOnly=true;selectionStart:number|null=0;selectionEnd:number|null=0;selectionDirection:'forward'|'backward'|'none'='none';
  select(){this.setSelectionRange(0,this.value.length);}setSelectionRange(start:number,end:number,direction:'forward'|'backward'|'none'='none'){this.selectionStart=start;this.selectionEnd=end;this.selectionDirection=direction;}
  replaceWith(field:Field){const parent=this.parent!;if(field.parent)field.parent.children=field.parent.children.filter(child=>child!==field);parent.children[parent.children.indexOf(this)]=field;field.parent=parent;this.parent=undefined;}
 }
 const root=new Element();root.attributes.add('data-practice-shortcuts');
 const attach=(field=new Field())=>{const group=new Element();group.dataset.manualKey='working';group.parent=root;group.children=[field];field.parent=group;for(const old of root.children)old.parent=undefined;root.children=[group];return field;};
 const field=attach();Object.assign(globalThis,{document:doc,window:new EventTarget(),HTMLElement:Element,HTMLInputElement:Field,CSS:{escape:(value:string)=>value}});
 let working='30',commits=0,cancels=0,now=0;const timers=new Map<unknown,()=>void>();
 const controls=(create?.(root as unknown as HTMLElement)??new ManualTempoControls({accepts:element=>root.contains(element as unknown as Element),adjust:()=>true,edit:{commit:(_key,input)=>{working=input.value;commits++;return true;},adjust:()=>false,cancel:()=>cancels++}})) as any;
 controls.repeat=new TempoRepeat({now:()=>now,set:fn=>{const token={};timers.set(token,fn);return token;},clear:token=>{timers.delete(token);}});
 const key=(code:string,target=field,repeat=false)=>{let prevented=false,stopped=false;controls.down({code,target,repeat,isComposing:false,ctrlKey:false,altKey:false,metaKey:false,shiftKey:false,preventDefault(){prevented=true;},stopImmediatePropagation(){stopped=true;}});return {prevented,stopped};};
 return {root,field,doc,controls,attach,key,get working(){return working;},get commits(){return commits;},get cancels(){return cancels;},get pending(){return timers.size;},tick(){now+=500;const callbacks=[...timers.values()];timers.clear();for(const fn of callbacks)fn();},close(){controls.dispose();assert.equal(timers.size,0);for(const [key,descriptor]of Object.entries(prior)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}}};
}

test('an explicitly opened speed draft survives footer replacement with value, selection and focus until Enter',()=>{
 const f=fixture();try{
  assert.equal(f.controls.editField(f.field),true);f.field.value='38.5';f.field.setSelectionRange(1,3,'backward');
  const restore=f.controls.retainDraft(f.root),replacement=f.attach();f.doc.activeElement=undefined;assert.equal(f.field.isConnected,false);
  restore();assert.equal(f.root.querySelector('input'),f.field);assert.equal(replacement.isConnected,false);assert.equal(f.field.value,'38.5');assert.equal(f.field.readOnly,false);assert.equal(f.doc.activeElement,f.field);assert.deepEqual([f.field.selectionStart,f.field.selectionEnd,f.field.selectionDirection],[1,3,'backward']);assert.equal(f.working,'30');assert.equal(f.commits,0);
  assert.deepEqual(f.key('Enter'),{prevented:true,stopped:true});assert.equal(f.working,'38.5');assert.equal(f.commits,1);assert.equal(f.field.readOnly,true);
  f.key('Enter',f.field,true);assert.equal(f.commits,1,'held Enter cannot commit twice or leak another action');
 }finally{f.close();}
});

test('deliberate edit cancellation cannot be revived by a previously captured footer restoration',()=>{
 const f=fixture();try{
  f.controls.editField(f.field);f.field.value='99';const restore=f.controls.retainDraft(f.root);f.controls.cancelEdit();const replacement=f.attach();restore();
  assert.equal(f.root.querySelector('input'),replacement);assert.equal(f.field.readOnly,true);assert.equal(f.field.value,'30');assert.equal(f.commits,0);assert.equal(f.cancels,1);
 }finally{f.close();}
});

test('the readonly Speed mirror follows formatted field writes without numeric admission or draft ownership',()=>{
 const integer={textContent:''},fraction={textContent:''},group={querySelector:(selector:string)=>selector==='[data-speed-integer]'?integer:fraction},field={value:'30',readOnly:true,dataset:{absolute:'54',presented:'30'},closest:()=>group};
 const before=JSON.stringify(field.dataset);
 for(const [value,whole,suffix]of [['1','1',''],['1.5','1','.5'],['9.5','9','.5'],['10','10',''],['30','30',''],['30.5','30','.5'],['99.5','99','.5'],['100','100','']] as const){field.value=value;refreshPracticeSpeedDisplay(field as unknown as HTMLInputElement);assert.deepEqual([integer.textContent,fraction.textContent],[whole,suffix]);assert.equal(field.value,value);assert.equal(JSON.stringify(field.dataset),before);}
 field.readOnly=false;field.value='100.5';refreshPracticeSpeedDisplay(field as unknown as HTMLInputElement);assert.deepEqual([integer.textContent,fraction.textContent],['100',''],'a genuine draft remains entirely owned by the input editor');assert.equal(field.value,'100.5');assert.equal(JSON.stringify(field.dataset),before);
});

test('explicit Speed commit and cancellation synchronize the readonly mirror after the original editor callbacks',()=>{
 const f=fixture();try{
  const integer={textContent:''},fraction={textContent:''},group={querySelector:(selector:string)=>selector==='[data-speed-integer]'?integer:fraction},closest=f.field.closest.bind(f.field);
  (f.field as any).closest=(selector:string)=>selector==='.practice-speed-field'?group:closest(selector);
  refreshPracticeSpeedDisplay(f.field as unknown as HTMLInputElement);assert.deepEqual([integer.textContent,fraction.textContent],['30','']);
  f.controls.editField(f.field);f.field.value='30.5';refreshPracticeSpeedDisplay(f.field as unknown as HTMLInputElement);assert.deepEqual([integer.textContent,fraction.textContent],['30','']);assert.equal(f.commits,0);
  f.key('Enter');assert.equal(f.working,'30.5');assert.equal(f.commits,1);assert.deepEqual([integer.textContent,fraction.textContent],['30','.5']);
  f.controls.editField(f.field);f.field.value='100.5';f.key('Escape');assert.equal(f.field.value,'30.5');assert.equal(f.commits,1);assert.equal(f.cancels,1);assert.deepEqual([integer.textContent,fraction.textContent],['30','.5']);
 }finally{f.close();}
});

test('draft identity remains owned through transient detachment and ends only on explicit commit or cancellation',()=>{
 const f=fixture();try{
  assert.equal(f.controls.ownsDraft(f.field),false);f.controls.editField(f.field);f.field.value='31';assert.equal(f.controls.ownsDraft(f.field),true);
  const restore=f.controls.retainDraft(f.root),replacement=f.attach();assert.equal(f.field.isConnected,false);assert.equal(f.controls.ownsDraft(f.field),true);assert.equal(f.controls.ownsDraft(replacement),false);
  restore();assert.equal(f.controls.ownsDraft(f.field),true);f.key('Enter');assert.equal(f.controls.ownsDraft(f.field),false);assert.equal(f.working,'31');
  f.controls.editField(f.field);f.field.value='40';f.controls.cancelEdit();assert.equal(f.controls.ownsDraft(f.field),false);assert.equal(f.working,'31');
 }finally{f.close();}
});

test('the keyboard opener stays consumed through held repeats until release, while fresh and mouse-entered typing remain native',()=>{
 const f=fixture();try{
  assert.equal(f.controls.editField(f.field,'KeyS'),true);assert.deepEqual(f.key('KeyS',f.field,true),{prevented:true,stopped:true});assert.equal(f.field.value,'30');assert.equal(f.commits,0);
  f.controls.up({code:'KeyS'});assert.deepEqual(f.key('KeyS'),{prevented:false,stopped:false},'keyup restores ordinary typing');assert.equal(f.field.readOnly,false);
  f.controls.cancelEdit();assert.equal(f.controls.editField(f.field),true);assert.deepEqual(f.key('KeyS',f.field,true),{prevented:false,stopped:false},'mouse entry has no keyboard opener to consume');f.controls.cancelEdit();
  const replacement=f.attach();assert.equal(f.controls.editField(f.field,'KeyS'),false);assert.deepEqual(f.key('KeyS',replacement,true),{prevented:false,stopped:false},'failed editor entry cannot acquire the opener key');
 }finally{f.close();}
});

test('a browser change during piano footer replacement cannot commit the owned draft or queue a rate',()=>{
 let view:any;const rates:number[]=[],f=fixture(root=>{
  view=new PracticeView(root,{package:score,personal:{} as never,entryId:'test',connected:()=>false,source:()=>'',connect:async()=>{},disconnect:async()=>{},back(){},settings(){},changed(){}});
  view.state=initialPractice(view.plan);view.status=()=>{};view.applySetting=(next:any)=>{rates.push(next.working);Object.assign(view.state,next);view.queuedWorking=next.working;view.refreshTempoFields(root);};return view.manual;
 });
 try{
  Object.assign(f.field.dataset,{practiceSetting:'working',absolute:String(view.state.working),presented:'30'});const rate=view.state.working;
  f.controls.editField(f.field);f.field.value='31';assert.equal(view.settingChanged(f.field),false);assert.equal(view.state.working,rate);assert.equal(view.queuedWorking,undefined);assert.equal(rates.length,0);
  const restore=f.controls.retainDraft(f.root);f.attach();assert.equal(view.settingChanged(f.field),false);restore();assert.equal(f.field.value,'31');assert.equal(f.field.readOnly,false);assert.equal(view.state.working,rate);
  f.key('Enter');assert.equal(view.state.working,view.state.target*.31);assert.equal(view.queuedWorking,view.state.working);assert.deepEqual(rates,[view.state.working]);
  assert.equal(view.settingChanged({dataset:{practiceSetting:'keepTempo'},type:'checkbox',checked:true}),true);assert.equal(view.state.keepTempo,true,'ordinary checkbox changes keep their event authority');
 }finally{f.close();}
});

test('readonly working-field OS repeats leave the single application speed repeat alive until release',()=>{
 const f=fixture();let steps=0;try{
  f.field.focus();f.controls.begin('ArrowRight',()=>{steps++;return true;});assert.equal(steps,1);assert.equal(f.pending,1);
  f.key('ArrowRight',f.field,true);assert.equal(steps,1,'OS repeat itself never adds a step');assert.equal(f.pending,1);f.tick();assert.equal(steps,2);
  assert.deepEqual(f.key('Enter'),{prevented:false,stopped:false},'readonly Enter stays available to the saved action resolver');assert.equal(f.field.readOnly,true);assert.equal(f.pending,0);
  f.controls.begin('ArrowRight',()=>{steps++;return true;});f.controls.release('ArrowRight');f.tick();assert.equal(steps,3);assert.equal(f.pending,0);
 }finally{f.close();}
});

test('cancelling after actual loop attainment restores the current rate before the next arrow; Enter intentionally replaces it',()=>{
 let view:any;const rates:number[]=[],f=fixture(root=>{
  view=new PracticeView(root,{package:score,personal:{} as never,entryId:'test',connected:()=>false,source:()=>'',connect:async()=>{},disconnect:async()=>{},back(){},settings(){},changed(){}});
  view.state=initialPractice(view.plan);view.status=()=>{};view.applySetting=(next:any)=>{rates.push(next.working);Object.assign(view.state,next);view.refreshTempoFields(root);};return view.manual;
 });
 const show=(field:any)=>{field.value=speedNumber(view.state.working,view.state.target);Object.assign(field.dataset,{practiceSetting:'working',absolute:String(view.state.working),presented:field.value});};
 try{
  show(f.field);f.controls.editField(f.field);f.field.value='99';passed(view.plan.chunks[0],view.state);const progressed=view.state.working;
  const restore=f.controls.retainDraft(f.root);show(f.attach());restore();assert.equal(f.field.value,'99');assert.equal(view.state.working,progressed);
  f.key('Escape');assert.equal(f.field.readOnly,true);assert.equal(f.field.value,'32');assert.equal(Number(f.field.dataset.absolute),progressed);assert.equal(f.field.dataset.presented,'32');assert.equal(view.setting(f.field),true);assert.equal(view.state.working,progressed);assert.ok(rates.every(rate=>rate===progressed),'admitting other progression fields cannot roll Working back');rates.length=0;
  assert.equal(view.adjustManual('working',1,false,0),true);assert.equal(view.state.working,view.state.target*.325);assert.deepEqual(rates,[view.state.target*.325]);
  f.controls.editField(f.field);f.field.value='20';passed(view.plan.chunks[0],view.state);const nextRestore=f.controls.retainDraft(f.root);show(f.attach());nextRestore();f.key('Enter');assert.equal(view.state.working,view.state.target*.2,'explicit Enter owns the retained replacement draft');assert.equal(f.field.readOnly,true);
 }finally{f.close();}
});
