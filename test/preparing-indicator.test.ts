import test,{mock} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AheadOfTimeEngraving} from '../src/ahead-of-time-engraving';
import {DEFAULT_PREPARING_DESIGN,PREPARING_GRACE_MS,PREPARING_SWITCH,PreparingIndicator,preparingDesign} from '../src/preparing-indicator';

const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('the library hears which score the background work is on, and when no work remains',async()=>{
 const heard:Array<string|undefined>=[],finish=new Map<string,()=>void>(),idles:Array<()=>void>=[];
 const work=new AheadOfTimeEngraving((id,_execution,w)=>new Promise<void>(resolve=>{w.started();finish.set(id,resolve);}),{delayMs:0,idle:run=>idles.push(run),activity:id=>heard.push(id)});
 work.start(['a','b']);assert.deepEqual(heard,[undefined],'a fresh list begins with nothing under way');
 await new Promise(r=>setTimeout(r,5));idles.shift()!();assert.deepEqual(heard,[undefined,'a']);
 finish.get('a')!();await tick();assert.deepEqual(heard,[undefined,'a'],'between two scores the last one stands');
 // Input while the next score waits for idle time pauses the list: the work is still under way.
 work.defer();assert.deepEqual(heard,[undefined,'a']);
 await new Promise(r=>setTimeout(r,5));idles.at(-1)!();assert.deepEqual(heard,[undefined,'a','b']);
 finish.get('b')!();await tick();assert.deepEqual(heard,[undefined,'a','b',undefined],'no work remains');
 work.start(['c']);await new Promise(r=>setTimeout(r,5));idles.at(-1)!();assert.equal(heard.at(-1),'c');
 work.stop();assert.equal(heard.at(-1),undefined,'a stop ends it');
});

test('the sign shows only for work long enough to notice, stays between scores and goes when the work is done',()=>{
 mock.timers.enable({apis:['setTimeout']});
 try{
  const sign=new PreparingIndicator(()=>undefined);
  // A score already prepared is looked up and done long before the grace ends.
  sign.activity('a');mock.timers.tick(200);sign.activity('b');mock.timers.tick(200);sign.activity(undefined);mock.timers.tick(PREPARING_GRACE_MS*2);
  assert.equal(sign.showing,false,'quick work never shows');
  // Real work shows after the grace, and the sign stays as the work moves on.
  sign.activity('c');mock.timers.tick(PREPARING_GRACE_MS-1);assert.equal(sign.showing,false);
  sign.activity('c');mock.timers.tick(1);assert.equal(sign.showing,true,'the same score keeps its grace');
  sign.activity('d');assert.equal(sign.showing,true,'between scores it stays');
  sign.activity(undefined);assert.equal(sign.showing,false,'it goes as soon as no work remains');
  // Each score has its own grace: one quick score after another never shows.
  for(const id of ['e','f','g','h']){sign.activity(id);mock.timers.tick(PREPARING_GRACE_MS-100);}
  assert.equal(sign.showing,false);
 }finally{mock.timers.reset();}
});

test('the design is an internal switch with a default; anything else reads as the default',()=>{
 const storage=(value:string|null)=>({getItem:(key:string)=>key===PREPARING_SWITCH?value:null});
 assert.equal(preparingDesign(storage(null)),DEFAULT_PREPARING_DESIGN);
 for(const design of ['footer','row','edge'] as const)assert.equal(preparingDesign(storage(design)),design);
 assert.equal(preparingDesign(storage('spinner')),DEFAULT_PREPARING_DESIGN);
 assert.equal(preparingDesign({getItem(){throw Error('no storage');}}),DEFAULT_PREPARING_DESIGN);
 assert.equal(preparingDesign(undefined),DEFAULT_PREPARING_DESIGN);
});

test('the sign changes only opacity: no layout property, no focus, and no motion when motion is reduced',()=>{
 const css=readFileSync(new URL('../src/preparing-indicator.css',import.meta.url),'utf8'),
  shown=[...css.matchAll(/\.surface\[data-preparing\][^{]*\{([^}]*)\}/g)].map(m=>m[1]);
 assert.ok(shown.length>=3);
 for(const rule of shown)for(const property of rule.split(';').map(d=>d.split(':')[0].trim()).filter(Boolean))
  assert.ok(['opacity','visibility','transition','animation','content','position','left','right','bottom','width','height','background','pointer-events'].includes(property),property);
 // Only an overlay (::before, an absolute line) or the empty middle of the bottom bar is drawn into; nothing in the flow grows.
 assert.match(css,/\.preparing-words\{[^}]*opacity:0;visibility:hidden/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{.*animation:none\}\}/);
 assert.doesNotMatch(css,/border-radius|rotate|spin/,'no circles or spinners');
 const source=readFileSync(new URL('../src/preparing-indicator.ts',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\.focus\(|tabindex|innerHTML/);
});
