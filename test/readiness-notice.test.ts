import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PendingPress,READINESS_NOTICE_DELAY_MS,READINESS_NOTICE_MIN_MS,trackToolbarHeight,type ReadinessNoticePlace,type ReadinessNoticeView,type ReadinessTimers} from '../src/readiness-notice';
import {ScoreReadiness,type ReadinessStage} from '../src/score-readiness';

const flush=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
/** Timers the test moves by hand, so every threshold is exact. */
function clock(){
 let now=0,next=1;const due=new Map<number,{at:number;run:()=>void}>();
 const timers:ReadinessTimers={now:()=>now,set:(run,ms)=>{const id=next++;due.set(id,{at:now+ms,run});return id;},clear:id=>{due.delete(id as number);}};
 return {timers,now:()=>now,async advance(ms:number){
  const end=now+ms;
  for(;;){
   const first=[...due].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
   if(!first)break;
   due.delete(first[0]);now=first[1].at;first[1].run();await flush();
  }
  now=end;await flush();
 }};
}
/** The notice as a fake view sees it: set going (visible `delay` later by
 * itself), faded out, or withdrawn before it was ever visible. */
function view(c:ReturnType<typeof clock>){
 const log:{at:number;what:'show'|'hide'|'withdraw';words?:string;place?:ReadinessNoticePlace;delay?:number}[]=[];
 const v:ReadinessNoticeView={show:(words,place,delay)=>log.push({at:c.now(),what:'show',words,place,delay}),hide:()=>log.push({at:c.now(),what:'hide'}),withdraw:()=>log.push({at:c.now(),what:'withdraw'})};
 /** When the notice could be seen: from set going + delay until it faded. */
 const seen=()=>{const out:[number,number|undefined][]=[];let from:number|undefined;
  for(const e of log){if(e.what==='show')from=e.at+e.delay!;else if(from!==undefined){if(e.what==='hide')out.push([from,e.at]);else assert.ok(e.at<from,'withdrawn only before it was visible');from=undefined;}}
  if(from!==undefined)out.push([from,undefined]);return out;};
 return {v,log,seen};
}
/** A score whose stage ends when the test says so. */
function slowStage(stage:ReadinessStage){
 let finish!:()=>void,runs=0;
 const readiness=new ScoreReadiness({[stage]:{run:()=>{runs++;return new Promise<void>(resolve=>{finish=resolve;});}}});
 return {readiness,finish:()=>finish(),runs:()=>runs};
}
const surface={surface:{} as HTMLElement};

test('a press made before fingers are ready is kept and runs exactly once when they are',async()=>{
 const c=clock(),{v,seen}=view(c),stage=slowStage('fingers'),presses=new PendingPress(v,c.timers);
 let ran=0;
 const outcome=presses.press('edit',stage.readiness,'fingers',()=>{ran++;},()=>surface);
 // The same key pressed again while waiting joins the same press.
 const again=presses.press('edit',stage.readiness,'fingers',()=>{ran++;},()=>surface);
 assert.equal(presses.pending,'edit');
 await c.advance(100);
 assert.equal(ran,0);assert.equal(presses.showing,false,'no notice inside the threshold');
 stage.finish();await flush();
 assert.equal(ran,1);assert.equal(await outcome,'ran');assert.equal(await again,'ran');
 assert.equal(presses.pending,undefined);assert.equal(stage.runs(),1);
 await c.advance(1000);
 assert.equal(ran,1,'it never runs twice');assert.deepEqual(seen(),[],'readiness ended within the threshold, so nothing was ever visible');
});

test('a press when the stage is already ready runs at once and shows nothing',async()=>{
 const c=clock(),{v,log}=view(c),presses=new PendingPress(v,c.timers);
 const readiness=new ScoreReadiness({});
 let ran=0;
 assert.equal(await presses.press('practice',readiness,'practice',()=>{ran++;},()=>surface),'ran');
 await flush();
 assert.equal(ran,1);assert.equal(presses.pending,undefined);
 await c.advance(1000);assert.equal(log.length,0);
});

test('Esc cancels the waiting press: it never runs and its stage stops',async()=>{
 const c=clock(),{v,log,seen}=view(c),presses=new PendingPress(v,c.timers);
 let signal!:AbortSignal;
 const readiness=new ScoreReadiness({practice:{run:s=>{signal=s;return new Promise(()=>{});}}});
 let ran=0;
 const outcome=presses.press('practice-fingers',readiness,'practice',()=>{ran++;},()=>surface,'Getting practice ready…');
 await c.advance(READINESS_NOTICE_DELAY_MS+10);
 assert.equal(presses.showing,true);assert.equal(log.at(-1)?.what,'show');assert.equal(log.at(-1)?.words,'Getting practice ready…');
 assert.equal(presses.cancel(),true);
 assert.equal(await outcome,'cancelled');
 assert.equal(signal.aborted,true,'nobody needs practice any more');
 await c.advance(1000);
 assert.equal(ran,0);assert.equal(presses.cancel(),false,'nothing left to cancel');
 assert.equal(log.at(-1)?.what,'hide');
 assert.deepEqual(seen(),[[READINESS_NOTICE_DELAY_MS,READINESS_NOTICE_DELAY_MS+READINESS_NOTICE_MIN_MS]],'even cancelled, a visible notice stays its minimum');
});

test('a different command cancels the waiting press and runs its own',async()=>{
 const c=clock(),{v}=view(c),presses=new PendingPress(v,c.timers),stage=slowStage('fingers');
 const ran:string[]=[];
 const first=presses.press('edit',stage.readiness,'fingers',()=>{ran.push('edit');},()=>surface);
 const second=presses.press('toggle',stage.readiness,'fingers',()=>{ran.push('toggle');},()=>surface);
 assert.equal(await first,'cancelled');
 stage.finish();
 assert.equal(await second,'ran');
 assert.deepEqual(ran,['toggle']);assert.equal(stage.runs(),1,'the stage kept running for the second press');
});

test('the notice appears after the threshold, stays the minimum, and the action does not wait for it',async()=>{
 const c=clock(),{v,log,seen}=view(c),stage=slowStage('fingers'),presses=new PendingPress(v,c.timers);
 let ranAt:number|undefined;
 void presses.press('hold-fingers',stage.readiness,'fingers',()=>{ranAt=c.now();},()=>surface);
 // Set going with the press, so it appears even while script is busy.
 assert.deepEqual(log.map(e=>[e.at,e.what,e.words,e.delay]),[[0,'show','Getting fingers ready…',READINESS_NOTICE_DELAY_MS]]);
 await c.advance(READINESS_NOTICE_DELAY_MS-1);
 assert.equal(presses.showing,false);
 await c.advance(1);
 assert.equal(presses.showing,true);
 await c.advance(50);stage.finish();await flush();
 assert.equal(ranAt,READINESS_NOTICE_DELAY_MS+50,'the action starts as soon as fingers are ready');
 assert.equal(log.length,1,'the notice stays: it has not had its minimum yet');
 await c.advance(READINESS_NOTICE_MIN_MS-50-1);
 assert.equal(log.length,1);
 await c.advance(1);
 assert.deepEqual(seen(),[[READINESS_NOTICE_DELAY_MS,READINESS_NOTICE_DELAY_MS+READINESS_NOTICE_MIN_MS]]);
 assert.equal(presses.showing,false);
});

test('a notice shown longer than the minimum fades as the action starts',async()=>{
 const c=clock(),{v,log,seen}=view(c),stage=slowStage('practice'),presses=new PendingPress(v,c.timers);
 let ran=0;
 void presses.press('practice',stage.readiness,'practice',()=>{ran++;},()=>surface);
 await c.advance(2000);
 assert.equal(log.length,1);
 stage.finish();await flush();
 assert.equal(ran,1);
 assert.deepEqual(seen(),[[READINESS_NOTICE_DELAY_MS,2000]]);
});

test('the notice can sit after a chosen menu item, and a failing stage still runs the action',async()=>{
 const c=clock(),{v,log}=view(c),presses=new PendingPress(v,c.timers);
 const item={} as HTMLElement;let ran=0;
 const readiness=new ScoreReadiness({practice:{run:async()=>{await new Promise<void>(resolve=>c.timers.set(resolve,400));throw new Error('no plan');}}});
 const outcome=presses.press('practice',readiness,'practice',()=>{ran++;},()=>({after:item}));
 await c.advance(200);
 assert.deepEqual(log[0]?.place,{after:item});
 await c.advance(600);
 assert.equal(await outcome,'ran');assert.equal(ran,1,'the action says what went wrong in its own words');
});

test('with the toolbar open the notice stands just above its measured top edge, however many rows it wraps to; hidden, it keeps its place',()=>{
 const set=new Map<string,string>(),surface={style:{setProperty:(name:string,value:string)=>set.set(name,value)}} as unknown as HTMLElement;
 const toolbar={offsetHeight:64} as HTMLElement;
 let resized:(()=>void)|undefined,observed:unknown,disconnected=false;
 class Observer{constructor(run:()=>void){resized=run;}observe(target:unknown){observed=target;}disconnect(){disconnected=true;}}
 const stop=trackToolbarHeight(surface,toolbar,Observer as unknown as typeof ResizeObserver);
 assert.equal(observed,toolbar);assert.equal(set.get('--toolbar-height'),'64px','one row, measured at once');
 // At 1920×1080 the open toolbar wraps to two rows.
 (toolbar as {offsetHeight:number}).offsetHeight=144;resized!();
 assert.equal(set.get('--toolbar-height'),'144px','two rows: the notice moves up with the toolbar\'s top edge');
 stop();assert.ok(disconnected);
 // The stylesheet places an open toolbar's notice from that measure, and a hidden toolbar's where it always was.
 const css=readFileSync(new URL('../src/readiness-notice.css',import.meta.url),'utf8');
 assert.match(css,/\.toolbar\.visible~\.readiness-notice\{bottom:calc\(var\(--toolbar-height,64px\) \+ 10px\)\}/);
 assert.match(css,/\.readiness-notice\{position:absolute;left:50%;bottom:14px;/);
 assert.doesNotMatch(css,/bottom:84px/,'no fixed guess at the toolbar\'s height');
});
