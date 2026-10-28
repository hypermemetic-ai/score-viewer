import test,{mock} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AheadOfTimeEngraving,type AheadOfTimeProgress,type AheadOfTimeWork} from '../src/ahead-of-time-engraving';
import {PREPARING_GRACE_MS,PREPARING_LEAVE_MS,PreparingIndicator} from '../src/preparing-indicator';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const brief=(p:AheadOfTimeProgress|undefined)=>p&&`${p.entryId} ${p.stage??'-'} ${p.fraction.toFixed(2)}${p.end?` ${p.end}`:''}`;

test('the library hears how far the work on each score has come, from the stages it reached, and how it ended',async()=>{
 const heard:Array<string|undefined>=[],steps=new Map<string,(work:AheadOfTimeWork)=>Promise<void>>(),idles:Array<()=>void>=[];
 const go=new Map<string,()=>void>(),gate=(id:string)=>new Promise<void>(resolve=>go.set(id,resolve));
 steps.set('a',async work=>{
  work.started();work.plan(['engrave','install','pages','engine']);
  await gate('a');work.reached('engrave');
  // A plan given again, by a step that goes on with the score, stands as first given.
  work.plan(['pages','engine']);await gate('a');work.reached('install');
  // A stage reached again, or one before it, never moves the work back.
  work.reached('engrave');work.reached('unplanned');
  // Pages that needed nothing: the engine reached next passes them.
  await gate('a');work.reached('engine');
 });
 steps.set('b',async work=>{work.plan(['pages','engine']);await gate('b');work.failed();});
 steps.set('c',async()=>{await gate('c');throw Error('the engraving failed');});
 const work=new AheadOfTimeEngraving((id,_execution,w)=>steps.get(id)!(w),{delayMs:0,idle:run=>idles.push(run),activity:p=>heard.push(brief(p))});
 work.start(['a','b','c']);assert.deepEqual(heard,[undefined],'a fresh list begins with nothing under way');
 await wait(5);idles.shift()!();await tick();
 assert.deepEqual(heard.splice(0),[undefined,'a - 0.00'],'a score starts at nothing done');
 go.get('a')!();await tick();go.get('a')!();await tick();assert.deepEqual(heard.splice(0),['a engrave 0.25','a install 0.50']);
 go.get('a')!();await tick();await tick();assert.deepEqual(heard.splice(0),['a engine 1.00','a engine 1.00 done']);
 idles.shift()!();await tick();go.get('b')!();await tick();await tick();
 assert.deepEqual(heard.splice(0),['b - 0.00','b - 0.00 failed'],'a score that could not be done ends as failed');
 idles.shift()!();await tick();go.get('c')!();await tick();await tick();await tick();
 assert.deepEqual(heard.splice(0),['c - 0.00','c - 0.00 failed',undefined],'so does a failure; then no work remains');
 // Work that plans nothing (a score already prepared, looked up) is done at once.
 steps.set('d',async()=>{});work.start(['d']);await wait(5);idles.shift()!();await tick();await tick();
 assert.deepEqual(heard.splice(0),[undefined,'d - 0.00','d - 1.00 done',undefined]);
 steps.set('e',()=>new Promise(()=>{}));work.start(['e']);await wait(5);idles.shift()!();await tick();heard.splice(0);
 // Input pauses the score under way rather than ending it; a stop ends it, reporting nothing more.
 work.defer();assert.deepEqual(heard,[]);
 work.stop();assert.deepEqual(heard,[undefined],'a stop ends it');
});

/** Just enough of the library's rows for the line: a composer and its scores. */
class Row {
 readonly dataset:Record<string,string>={};readonly children:Row[]=[];parent?:Row;hidden=false;className='';
 readonly styles=new Map<string,string>();readonly style={setProperty:(k:string,v:string)=>{this.styles.set(k,v);},getPropertyValue:(k:string)=>this.styles.get(k)??''};
 readonly classList={contains:(c:string)=>this.className.split(' ').includes(c)};
 constructor(className='',readonly padding=0){this.className=className;}
 get ownerDocument(){return {createElement:()=>new Row()};}
 setAttribute(){}
 append(child:Row){child.parent=this;this.children.push(child);}
 remove(){const at=this.parent?.children.indexOf(this)??-1;if(at>=0)this.parent!.children.splice(at,1);this.parent=undefined;}
 querySelector(selector:string):Row|null{
  if(selector===':scope > .preparing-line')return this.children.find(c=>c.className==='preparing-line')??null;
  const open=/^\[data-open="(.*)"\]$/.exec(selector),composer=/^\.composer-entry\[data-composer="(.*)"\]$/.exec(selector);
  if(selector==='.composer-arrow')return this.children.find(c=>c.className==='composer-arrow')??null;
  return this.children.find(c=>open?c.dataset.open===open[1]:composer?c.classList.contains('composer-entry')&&c.dataset.composer===composer[1]:false)??null;
 }
}
/** A function, not a getter: what it finds changes as the line comes and goes. */
const lineOf=(row:Row)=>row.querySelector(':scope > .preparing-line');
function library(){
 const surface=new Row(),composer=new Row('composer-entry',8),arrow=new Row('composer-arrow'),a=new Row('score-entry',34),b=new Row('score-entry catalogued',58);
 composer.dataset.composer='x';composer.append(arrow);a.dataset.open='a';a.dataset.composer='x';b.dataset.open='b';b.dataset.composer='x';
 for(const row of [composer,a,b])surface.append(row);return {surface,composer,a,b};
}
function withDom(run:()=>void){
 const globals=globalThis as unknown as Record<string,unknown>,before={CSS:globals.CSS,getComputedStyle:globals.getComputedStyle};
 globals.CSS={escape:(s:string)=>s};
 globals.getComputedStyle=(row:Row)=>({paddingLeft:`${row.padding}px`,columnGap:'10px',width:row.className==='composer-arrow'?'14px':'auto'});
 mock.timers.enable({apis:['setTimeout']});
 try{run();}finally{mock.timers.reset();Object.assign(globals,before);}
}
const at=(entryId:string,fraction:number,stage?:string,end?:'done'|'failed'):AheadOfTimeProgress=>({entryId,fraction,...(stage?{stage}:{}),...(end?{end}:{})});

test('a line shows under a score only for work long enough to notice, grows with it, fills and fades when done',()=>withDom(()=>{
 const {surface,composer,a,b}=library(),line=new PreparingIndicator(()=>surface as unknown as HTMLElement);
 // A score already prepared is looked up and done long before the grace ends.
 line.activity(at('a',0));mock.timers.tick(200);line.activity(at('a',1,undefined,'done'));line.activity(at('b',0));mock.timers.tick(200);line.activity(undefined);mock.timers.tick(PREPARING_GRACE_MS*2);
 assert.equal(line.showing,undefined,'quick work never shows');assert.equal(lineOf(a),null);assert.equal(lineOf(b),null);
 // Real work shows after the grace: under the score's row from where its text starts, and its composer's.
 line.activity(at('b',0));mock.timers.tick(PREPARING_GRACE_MS-1);assert.equal(lineOf(b),null);
 line.activity(at('b',0.25,'engrave'));mock.timers.tick(1);assert.equal(line.showing,'b','the same score keeps its grace');
 assert.equal(lineOf(b)?.styles.get('--progress'),'0.25');assert.equal(lineOf(b)?.dataset.progress,'0.25');assert.equal(b.dataset.preparing,'engrave');
 assert.equal(lineOf(b)?.styles.get('--from'),'58px','a catalogued row starts at its number');
 assert.equal(lineOf(composer)?.styles.get('--from'),'32px','a composer at its name, after the arrow');
 assert.equal(lineOf(a),null,'rows not being prepared show nothing');
 // It grows by changing one property on the same element.
 const drawn=lineOf(b);line.activity(at('b',0.5,'install'));assert.equal(lineOf(b),drawn);assert.equal(drawn?.styles.get('--progress'),'0.5');
 // Drawn again (the library painted anew), the line comes back as it stood.
 b.children.splice(0);line.paint();assert.equal(lineOf(b)?.styles.get('--progress'),'0.5');
 // Done: it fills the row, then goes.
 line.activity(at('b',1,'install','done'));const done=lineOf(b)!;
 assert.equal(done.dataset.end,'done');assert.equal(done.styles.get('--progress'),'1');assert.equal(b.dataset.preparing,undefined);assert.equal(line.showing,undefined);
 // The next score in the list waits for its own grace and draws nothing yet.
 line.activity(at('a',0));assert.equal(lineOf(a),null);
 mock.timers.tick(PREPARING_LEAVE_MS);assert.equal(lineOf(b),null,'gone once it has faded');assert.equal(lineOf(composer),null);
}));

test('a score that fails, or work that stops, takes its line away at once',()=>withDom(()=>{
 const {surface,composer,a,b}=library(),line=new PreparingIndicator(()=>surface as unknown as HTMLElement);
 line.activity(at('a',0));mock.timers.tick(PREPARING_GRACE_MS);line.activity(at('a',0.5,'pages'));assert.ok(lineOf(a));
 line.activity(at('a',0.5,'pages','failed'));assert.equal(lineOf(a),null,'no line for a failure, and no fill');assert.equal(lineOf(composer),null);assert.equal(a.dataset.preparing,undefined);
 line.activity(at('b',0));mock.timers.tick(PREPARING_GRACE_MS);assert.ok(lineOf(b));
 line.activity(undefined);assert.equal(lineOf(b),null,'a stop takes it away');
 // Each score has its own grace: one quick score after another never shows.
 for(const id of ['a','b','a','b']){line.activity(at(id,0));mock.timers.tick(PREPARING_GRACE_MS-100);line.activity(at(id,1,undefined,'done'));}
 assert.equal(lineOf(a),null);assert.equal(lineOf(b),null);
}));

test('the other layout\'s pages, made in a later round, draw no line: a line that filled stays done',()=>withDom(()=>{
 const {surface,a,b}=library(),line=new PreparingIndicator(()=>surface as unknown as HTMLElement);
 line.activity(at('a',0));mock.timers.tick(PREPARING_GRACE_MS);line.activity(at('a',1,'engine','done'));mock.timers.tick(PREPARING_LEAVE_MS);assert.equal(lineOf(a),null);
 const later=(entryId:string,fraction:number,end?:'done'):AheadOfTimeProgress=>({...at(entryId,fraction,'pages',end),round:1});
 line.activity(later('a',0));mock.timers.tick(PREPARING_GRACE_MS*2);line.activity(later('a',0.5));
 assert.equal(lineOf(a),null,'no second line under a score already done');assert.equal(line.showing,undefined);
 assert.equal(line.preparing,'a','the work is still declared');
 line.activity(later('a',1,'done'));line.activity(later('b',0));mock.timers.tick(PREPARING_GRACE_MS*2);assert.equal(lineOf(b),null);
}));

test('the line is an overlay that changes its width and opacity only: no focus, no loop, no motion when motion is reduced',()=>{
 const css=readFileSync(new URL('../src/preparing-indicator.css',import.meta.url),'utf8');
 assert.match(css,/\.preparing-line\{[^}]*position:absolute;[^}]*pointer-events:none/);
 assert.match(css,/\.preparing-line\{[^}]*height:2px/,'thin');
 assert.match(css,/width:calc\(var\(--stub\) \+ \(100% - var\(--from,34px\) - var\(--stub\)\) \* var\(--progress,0\)\)/,'a stub that grows to the row\'s right edge');
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{[^}]*transition:none\}\.preparing-line\[data-end\]\{opacity:1\}\}/,'without motion: no growing, no fading, full until it goes');
 assert.doesNotMatch(css,/animation|@keyframes|infinite|border-radius|rotate|spin/,'no pulsing, no loops, no spinners');
 const source=readFileSync(new URL('../src/preparing-indicator.ts',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\.focus\(|tabindex|innerHTML/);
});
