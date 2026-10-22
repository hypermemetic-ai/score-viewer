import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {RetainedScore,underMemoryPressure,type RetentionConditions} from '../src/retained-score';

const conditions=(change:Partial<RetentionConditions>={}):RetentionConditions=>({
 entry:{id:'no13',file:'package-aaa.tuna',personalFiles:{'state-no13.json':'state-version-111.json'}},
 records:{state:[['state-no13','ref-1']],memory:'memory-1'},preferences:{keyboardLayout:'janko-four-row',scoreTempos:{no13:60}},build:'build-a',...change});

test('one score is held, and taking any score, or keeping another, frees it',()=>{
 let freed=0;const kept=new RetainedScore<string>(()=>freed++);
 kept.keep('no13',conditions(),'No. 13');assert.equal(kept.holding,'no13');
 kept.keep('no14',conditions(),'No. 14');assert.equal(freed,1);assert.equal(kept.holding,'no14');
 assert.equal(kept.take('no13',()=>conditions()),undefined);assert.equal(freed,2);assert.equal(kept.holding,undefined);
 assert.equal(kept.take('no14',()=>conditions()),undefined,'opening another score dropped it');
 kept.keep('no13',conditions(),'No. 13');assert.equal(kept.take('no13',()=>conditions()),'No. 13');
 assert.equal(kept.holding,undefined,'a kept score is drawn once, then held again only on the next Back');
});

test('a change to the score, its records, the preferences or the build reopens it afresh',()=>{
 const changes:Array<[string,Partial<RetentionConditions>|undefined]>=[
  ['a new archive',{entry:{id:'no13',file:'package-bbb.tuna',personalFiles:{'state-no13.json':'state-version-111.json'}}}],
  ['a new personal file',{entry:{id:'no13',file:'package-aaa.tuna',personalFiles:{'state-no13.json':'state-version-222.json'}}}],
  ['a hand choice stored',{records:{state:[['state-no13','ref-2']],memory:'memory-1'}}],
  ['the fingering memory',{records:{state:[['state-no13','ref-1']],memory:'memory-2'}}],
  ['the keyboard layout',{preferences:{keyboardLayout:'conventional',scoreTempos:{no13:60}}}],
  ['a practice tempo',{preferences:{keyboardLayout:'janko-four-row',scoreTempos:{no13:72}}}],
  ['the engraver pin',{build:'build-b'}],
  ['edits not saved yet',undefined],
 ];
 for(const [name,change] of changes){
  const kept=new RetainedScore<string>();kept.keep('no13',conditions(),'No. 13');
  assert.equal(kept.take('no13',()=>change&&conditions(change)),undefined,name);
 }
 const kept=new RetainedScore<string>();kept.keep('no13',conditions(),'No. 13');
 assert.equal(kept.take('no13',()=>conditions({preferences:{scoreTempos:{no13:60},keyboardLayout:'janko-four-row'}})),'No. 13','key order is not a change');
});

test('memory pressure is more than half the script heap in use, where the engine reports it',()=>{
 assert.equal(underMemoryPressure(undefined),false);
 assert.equal(underMemoryPressure({usedJSHeapSize:900e6,jsHeapSizeLimit:4e9}),false);
 assert.equal(underMemoryPressure({usedJSHeapSize:2.1e9,jsHeapSizeLimit:4e9}),true);
 assert.equal(underMemoryPressure({usedJSHeapSize:1,jsHeapSizeLimit:0}),false);
});

// The viewer's own retention and opening, run against a stub host.
const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
const slice=(from:string,to:string)=>{const start=main.indexOf(from),end=main.indexOf(to,start);assert.ok(start>=0&&end>start,from);return stripTypeScriptTypes(main.slice(start,end));};
const retention=slice('const retainable=new WeakSet','\nasync function open('),opening=slice('async function open(','\nasync function chooseGuitarProTracks(');
const libraryAction=main.slice(main.indexOf("if(action==='library'){"),main.indexOf("if(action==='restore-header')"));

function viewer(){
 const entryOf=(id:string)=>({id,file:`package-${id}.tuna`,personalFiles:{[`state-${id}.json`]:`state-version-${id}.json`}});
 const calls:string[]=[],intervals:Array<()=>void>=[],refs=new Map<string,unknown>([['no13',{state:[['state-no13','ref-1']],memory:'memory-1'}],['no14',{state:[],memory:'memory-1'}]]);
 const pkg=(id:string)=>({availablePresentations:['janko-four-row'],manifest:{version:3},collection:id});
 const context:any={
  RetainedScore,underMemoryPressure,VIEWER_DERIVED_IDENTITY:'build-a',JSON,Object,
  window:{setInterval:(f:()=>void)=>intervals.push(f),clearInterval(){}},performance:{memory:{usedJSHeapSize:300e6,jsHeapSizeLimit:4e9}},
  entries:[entryOf('no13'),entryOf('no14')],preferences:{keyboardLayout:'janko-four-row',lastWorkedEntryId:'no13',scoreTempos:{}},
  personalMemory:{readingRefs:(id:string)=>refs.get(id),error:undefined},scoreCapabilities:(p:any)=>({pianoPreparation:!p.readingOnly}),
  beginReading:()=>({keyboard:'janko-four-row'}),openingLoading:()=>undefined,readingCheckpoint:async()=>{},practice:undefined,
  savePersonal:async()=>{calls.push('save');},checkReading(){},checkReadingOwner(){},clearNotice(){},notify:(text:string)=>calls.push(text),
  host:{read:async(file:string)=>{calls.push(`read ${file}`);return new Uint8Array([1]);},fullscreen:async()=>{calls.push('fullscreen');}},
  importReading:async()=>context.lastPackage,admitReadingSource:async()=>{},assertSelectedTransposition(){},selectPresentation:async(p:unknown)=>p,
  loadPersonal:async()=>({view:{page:0}}),collectionId:(p:any)=>p.collection,
  prepareScore:async(_data:unknown,_layout:unknown,personal:unknown,prior:unknown)=>({q:{package:prior,personal,packageBytes:new Uint8Array([1])},running:{}}),
  installPreparedScore:async()=>{calls.push('install');},
  activateScore:async(next:any)=>{calls.push(`activate ${next.entry.id}`);context.opened=next;return next;},
  saveReadingPreferences:async()=>{calls.push('preferences');},finishReading:(_op:unknown,success:boolean)=>calls.push(success?'complete':'failed'),
 };
 runInNewContext(`${retention}\n${opening}\nglobalThis.retained=retained;`,context);
 const open=async(id:string)=>{context.lastPackage=pkg(id);calls.length=0;await context.open(context.entries.find((e:any)=>e.id===id));return [...calls];};
 return {context,calls,refs,intervals,open,entryOf};
}

test('reopening the score just closed, with nothing changed, draws it as it was left: no read, admission or install',async()=>{
 const v=viewer();await v.open('no13');const first=v.context.opened;
 assert.deepEqual(await v.open('no13'),['save','read package-no13.tuna','fullscreen','activate no13','preferences','complete'],'kept only after Back');
 v.context.retainScore(v.context.opened);
 assert.deepEqual(await v.open('no13'),['save','fullscreen','activate no13','preferences','complete']);
 assert.notEqual(v.context.opened,first);
 v.context.retainScore(v.context.opened);const kept=v.context.opened;
 assert.deepEqual(await v.open('no13'),['save','fullscreen','activate no13','preferences','complete']);
 assert.equal(v.context.opened,kept,'the same reading, with its pages and hand projection, is activated again');
 assert.ok(!v.calls.includes('install'),'nothing of the score, its records or progress is written');
});

test('the order a score was last opened in does not invalidate it; its records, preferences, edition and build do',async()=>{
 const reopened=async(change:(v:ReturnType<typeof viewer>)=>void)=>{const v=viewer();await v.open('no13');v.context.retainScore(v.context.opened);change(v);return !(await v.open('no13')).some(c=>c.startsWith('read '));};
 assert.equal(await reopened(v=>{v.context.preferences.lastWorkedEntryId='no14';}),true);
 assert.equal(await reopened(v=>{v.refs.set('no13',{state:[['state-no13','ref-2']],memory:'memory-1'});}),false,'a stored hand choice');
 assert.equal(await reopened(v=>{v.refs.set('no13',undefined);}),false,'edits not saved yet');
 assert.equal(await reopened(v=>{v.context.preferences.scoreTempos={no13:72};}),false,'a practice tempo');
 assert.equal(await reopened(v=>{v.context.preferences.keyboardLayout='conventional';}),false,'the keyboard layout');
 assert.equal(await reopened(v=>{v.context.VIEWER_DERIVED_IDENTITY='build-b';}),false,'the ISO pin');
 assert.equal(await reopened(v=>{v.context.entries=[{...v.entryOf('no13'),file:'package-other.tuna'},v.entryOf('no14')];}),false,'a new archive');
});

test('opening another score frees the kept one',async()=>{
 const v=viewer();await v.open('no13');v.context.retainScore(v.context.opened);
 assert.deepEqual(await v.open('no14'),['save','read package-no14.tuna','fullscreen','activate no14','preferences','complete']);
 assert.ok((await v.open('no13')).includes('read package-no13.tuna'));
});

test('unsaved records, dual and reading-only scores, readings not opened from the library, and memory pressure are not kept',async()=>{
 const kept=async(prepare:(v:ReturnType<typeof viewer>,target:any)=>any)=>{const v=viewer();await v.open('no13');v.context.retainScore(prepare(v,v.context.opened)??v.context.opened);return v.context.retained.holding==='no13';};
 assert.equal(await kept(()=>undefined),true);
 assert.equal(await kept(v=>{v.refs.set('no13',undefined);}),false);
 assert.equal(await kept((_v,t)=>({...t})),false,'not opened from the library');
 assert.equal(await kept((_v,t)=>{t.package.reading={dual:{}};}),false);
 assert.equal(await kept((_v,t)=>{t.package.readingOnly=true;}),false);
 assert.equal(await kept(v=>{v.context.personalMemory.error=Error('not saved');}),false);
 assert.equal(await kept(v=>{v.context.performance.memory.usedJSHeapSize=2.5e9;}),false);
 assert.equal(await kept(v=>{v.context.entries=[{...v.entryOf('no13'),file:'package-new-edition.tuna'},v.entryOf('no14')];}),false,'the library moved to a new edition while reading');
 const v=viewer();await v.open('no13');v.context.retainScore(v.context.opened);
 v.intervals[0]!();assert.equal(v.context.retained.holding,'no13');
 v.context.performance.memory.usedJSHeapSize=2.5e9;v.intervals[0]!();assert.equal(v.context.retained.holding,undefined,'freed under memory pressure');
});

test('Back keeps the score after its view is saved, unless waiting hand choices were abandoned',()=>{
 assert.match(libraryAction,/await savePersonal\(\);.*const abandoning=!!handWait;leaveHandEditingWait\(\);.*if\(leaving&&!abandoning\)retainScore\(leaving\);/s);
 assert.match(main.slice(main.indexOf('async function activateScore('),main.indexOf('\n let clock:')),/retained\.free\(\)/,'any other activation frees the kept score');
});
