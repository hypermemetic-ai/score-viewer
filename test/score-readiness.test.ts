import test from 'node:test';
import assert from 'node:assert/strict';
import {ScoreReadiness,afterPaint,prepareAfterPaint,type PaintClock,type ReadinessStage} from '../src/score-readiness';

const tick=()=>new Promise<void>(resolve=>setImmediate(resolve));
function gate(){let open!:()=>void,fail!:(error:unknown)=>void;const promise=new Promise<void>((resolve,reject)=>{open=resolve;fail=reject;});return {promise,open,fail};}
/** A clock whose frame and task run only when the test says the page is on screen. */
function manualClock(){
 const frames:(()=>void)[]=[],tasks:(()=>void)[]=[];
 const clock:PaintClock={frame:run=>{frames.push(run);},task:run=>{tasks.push(run);}};
 return {clock,frame(){for(const run of frames.splice(0))run();},task(){for(const run of tasks.splice(0))run();}};
}

test('a stage runs once however many parties ask for it, and answers at once when ready',async()=>{
 let runs=0;const g=gate();
 const readiness=new ScoreReadiness({fingers:{run:async()=>{runs++;await g.promise;}}});
 const a=readiness.prepare('fingers'),b=readiness.prepare('fingers');
 await tick();
 assert.equal(runs,1);assert.equal(readiness.preparing('fingers'),true);assert.equal(readiness.ready('fingers'),false);
 g.open();await Promise.all([a.done,b.done]);
 assert.equal(readiness.ready('fingers'),true);
 const c=readiness.prepare('fingers');await c.done;
 assert.equal(runs,1,'a finished stage stays finished and is not run again');
});

test('a stage with no work is ready, and settle marks the reader\'s own pages ready',async()=>{
 const seen:ReadinessStage[]=[];
 const readiness=new ScoreReadiness({pages:{run:async()=>{throw new Error('the reader makes its own pages');}}});
 readiness.onReady(stage=>seen.push(stage));
 assert.equal(readiness.ready('piano'),true);
 assert.equal(readiness.ready('pages'),false);
 readiness.settle('pages');
 assert.equal(readiness.ready('pages'),true);assert.deepEqual(seen,['pages']);
 await readiness.whenReady('pages');
});

test('a stage nobody needs any more stops, and starts again when asked for',async()=>{
 const signals:AbortSignal[]=[];let finished=0;
 const readiness=new ScoreReadiness({practice:{run:async signal=>{signals.push(signal);await new Promise<void>((resolve,reject)=>{signal.addEventListener('abort',()=>reject(signal.reason));if(signals.length>1)resolve();});finished++;}}});
 const first=readiness.prepare('practice'),second=readiness.prepare('practice');
 await tick();
 first.release();await tick();
 assert.equal(signals[0].aborted,false,'one party still needs it');
 second.release();
 await assert.rejects(first.done,{name:'AbortError'});
 assert.equal(signals[0].aborted,true);assert.equal(readiness.ready('practice'),false);assert.equal(readiness.preparing('practice'),false);
 await readiness.whenReady('practice');
 assert.equal(finished,1);assert.equal(readiness.ready('practice'),true);
});

test('a stage holds the stages it needs and they stop with it',async()=>{
 const order:string[]=[];const fingersGate=gate();let fingersSignal!:AbortSignal;
 const readiness=new ScoreReadiness({
  fingers:{run:async signal=>{fingersSignal=signal;order.push('fingers');await fingersGate.promise;}},
  practice:{needs:['fingers'],run:async()=>{order.push('practice');}}});
 const claim=readiness.prepare('practice');
 await tick();
 assert.deepEqual(order,['fingers'],'practice waits for fingers');
 claim.release();
 await assert.rejects(claim.done,{name:'AbortError'});
 assert.equal(fingersSignal.aborted,true,'nobody else held fingers, so they stopped too');
 const again=readiness.prepare('practice');await tick();fingersGate.open();await again.done;
 assert.deepEqual(order,['fingers','fingers','practice']);
});

test('a failed stage rejects its waiters and may be asked for again',async()=>{
 let attempt=0;
 const readiness=new ScoreReadiness({hands:{run:async()=>{if(++attempt===1)throw new Error('first try fails');}}});
 await assert.rejects(readiness.whenReady('hands'),/first try fails/);
 assert.equal(readiness.ready('hands'),false);
 await readiness.whenReady('hands');
 assert.equal(readiness.ready('hands'),true);assert.equal(attempt,2);
});

test('dispose stops what is running and refuses new claims; finished stages stay answered',async()=>{
 let signal!:AbortSignal;
 const readiness=new ScoreReadiness({fingers:{run:async()=>{}},practice:{run:async s=>{signal=s;await new Promise(()=>{});}}});
 await readiness.whenReady('fingers');
 const claim=readiness.prepare('practice');await tick();
 readiness.dispose();
 assert.equal(signal.aborted,true);
 await assert.rejects(claim.done,{name:'AbortError'});
 await assert.rejects(readiness.prepare('practice').done,{name:'AbortError'});
 assert.equal(readiness.ready('fingers'),true);
 assert.equal(readiness.ready('piano'),false,'a closed score is not ready for anything new');
});

test('work moved after first paint never runs before the pages are on screen',async()=>{
 const ran:ReadinessStage[]=[];
 const readiness=new ScoreReadiness({
  fingers:{run:async()=>{ran.push('fingers');}},
  hands:{run:async()=>{ran.push('hands');}},
  practice:{needs:['fingers'],run:async()=>{ran.push('practice');}}});
 const paint=manualClock();
 prepareAfterPaint(readiness,['fingers','hands','practice'],paint.clock);
 await tick();
 assert.deepEqual(ran,[],'nothing runs before the next frame');
 paint.frame();await tick();
 assert.deepEqual(ran,[],'nothing runs in the frame that paints the pages');
 paint.task();await tick();await tick();
 assert.deepEqual(ran,['fingers','hands','practice']);
});

test('closing the score before its pages paint starts nothing; closing after stops what runs',async()=>{
 const signals:AbortSignal[]=[];let runs=0;
 const readiness=new ScoreReadiness({fingers:{run:async signal=>{runs++;signals.push(signal);await new Promise(()=>{});}}});
 const early=manualClock();
 const stopEarly=prepareAfterPaint(readiness,['fingers'],early.clock);
 stopEarly();early.frame();early.task();await tick();
 assert.equal(runs,0);
 const late=manualClock();
 const stopLate=prepareAfterPaint(readiness,['fingers'],late.clock);
 late.frame();late.task();await tick();
 assert.equal(runs,1);
 stopLate();
 assert.equal(signals[0].aborted,true);
 let after=0;const stop=afterPaint(()=>{after++;},late.clock);stop();late.frame();late.task();
 assert.equal(after,0);
});
