import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {importPackage} from '../src/package';
import {buildPerformanceSchedule,performanceSeconds,measureAt,writtenBarAt,evenTicks,tickAtEven} from '../src/score-performance';
import {countedBeat} from '../src/score-tempo';
import {TempoAudition,type AuditionContext,type AuditionTimers} from '../src/tempo-audition';

const quarter={numerator:1,denominator:4};
const note=(id:string,startTick:number,durationTicks:number,midi:number,extra:Record<string,unknown>={})=>({id,eventKind:'pitched',pitch:{octave:Math.floor((midi-12)/12),pitchClass:(midi-12)%12},startTick,durationTicks,...extra});
const base=(over:Record<string,unknown>={})=>({ticksPerBeat:48,totalTicks:216,timeSignatures:[{tick:0,numerator:2,denominator:4}],dynamics:[],pedals:[],sourceBarTicks:[0,24,120,216],notes:[] as unknown[],...over}) as Parameters<typeof buildPerformanceSchedule>[0];

test('a pickup keeps its place: four counted beats, accents on the bar',()=>{
 const s=buildPerformanceSchedule(base({notes:[note('a',0,24,67)]}),quarter);
 assert.deepEqual(s.countIn,[{tick:-168,accent:true},{tick:-120,accent:false},{tick:-72,accent:true},{tick:-24,accent:false}]);
 assert.deepEqual(s.bars,[0,24,120,216]);assert.equal(measureAt(s,0),1);assert.equal(measureAt(s,30),2);assert.equal(measureAt(s,500),3);
 const full=buildPerformanceSchedule(base({sourceBarTicks:[0,144,288],totalTicks:288,timeSignatures:[{tick:0,numerator:3,denominator:4}]}),quarter);
 assert.deepEqual(full.countIn.map(c=>[c.tick,c.accent]),[[-288,true],[-240,false],[-192,false],[-144,true],[-96,false],[-48,false]]);
});
test('a long pickup still counts in from an accented 1 in whole bars, and lands in place',()=>{
 // 3/4 with a two-beat pickup: 1 2 3 1 | pickup (2 3) | 1.
 const s=buildPerformanceSchedule(base({sourceBarTicks:[0,96,240],totalTicks:240,timeSignatures:[{tick:0,numerator:3,denominator:4}]}),quarter);
 assert.deepEqual(s.countIn.map(c=>[c.tick,c.accent]),[[-192,true],[-144,false],[-96,false],[-48,true]]);
 // 6/8 counted in dotted quarters with an eighth pickup: 1 2 1 2, pickup on its eighth.
 const six=buildPerformanceSchedule(base({sourceBarTicks:[0,24,168],totalTicks:168,timeSignatures:[{tick:0,numerator:6,denominator:8}]}),{numerator:3,denominator:8});
 assert.deepEqual(six.countIn.map(c=>[c.tick,c.accent]),[[-264,true],[-192,false],[-120,true],[-48,false]]);
});
test('ties join, pedal holds, dynamics and articulations shape the notes',()=>{
 const s=buildPerformanceSchedule(base({
  notes:[note('a',24,48,60,{tieStart:true}),note('b',72,48,60,{tieEnd:true}),note('c',24,24,64,{articulation:'staccato'}),note('d',120,24,67,{articulation:'accent'}),note('e',144,24,72,{velocity:20})],
  dynamics:[{tick:0,mark:'p'},{tick:120,mark:'f'}],pedals:[{tick:24,type:'sustain-down'},{tick:96,type:'sustain-up'}]}),quarter);
 assert.deepEqual(s.notes.map(n=>[n.tick,n.end,n.release,n.midi,n.velocity]),[[24,120,120,60,54],[24,36,96,64,54],[120,144,144,67,106],[144,168,168,72,20]]);
});
test('a pedal change releases and catches again; hairpins move toward the next mark',()=>{
 const s=buildPerformanceSchedule(base({notes:[note('a',0,24,60),note('b',48,24,62),note('c',96,24,64)],
  pedals:[{tick:0,type:'sustain-down'},{tick:48,type:'sustain-change'},{tick:120,type:'sustain-up'}],
  dynamics:[{tick:0,mark:'p'},{tick:0,mark:'crescendo',durationTicks:96},{tick:96,mark:'f'}]}),quarter);
 assert.deepEqual(s.notes.map(n=>n.release),[48,120,120]);
 assert.deepEqual(s.notes.map(n=>n.velocity),[54,73,92]);
});
test('a note released exactly at a pedal change is not held by the new pedal',()=>{
 const s=buildPerformanceSchedule(base({totalTicks:960,sourceBarTicks:[0,960],notes:[note('c',0,480,60),note('e',480,480,64)],
  pedals:[{tick:0,type:'sustain-down'},{tick:480,type:'sustain-change'},{tick:960,type:'sustain-up'}]}),quarter);
 assert.deepEqual(s.notes.map(n=>[n.midi,n.release]),[[60,480],[64,960]]);
});
test('grace notes sound just before their host, a little softer; ties of the same pitch stay whole',()=>{
 const s=buildPerformanceSchedule(base({notes:[note('h',120,48,71,{tieStart:true}),note('t',168,48,71,{tieEnd:true})],dynamics:[{tick:0,mark:'mf'}],
  graceGroups:[{id:'g',members:[{id:'m1',pitch:{pitchClass:1,octave:4},duration:'1/16'},{id:'m2',pitch:{pitchClass:6,octave:4},duration:'1/16'}],occurrences:[{id:'o',sourceBar:2,pass:1,tick:120,hostNoteIds:['h']}]}]}),quarter);
 assert.deepEqual(s.notes.map(n=>[n.tick,n.end,n.midi,n.velocity]),[[108,114,61,70],[114,120,66,70],[120,216,71,78]]);
});
test('later tempos stretch the clock and the playing time; repeats return to the tempo in force',()=>{
 // Opening ♩=60, ♩=120 from the third bar: that bar takes half as long.
 const s=buildPerformanceSchedule(base({notes:[note('a',0,24,60)],tempos:[{tick:0,bpm:60,description:'Andante'},{tick:120,bpm:120}]}),quarter);
 assert.deepEqual(s.tempoChanges,[{tick:120,factor:2}]);
 assert.equal(evenTicks(s,216),120+48);assert.equal(tickAtEven(s,168),216);assert.equal(tickAtEven(s,-24),-24);
 assert.equal(performanceSeconds(s,60),168/48);
 // A printed half-note mark is the same speed as a quarter rate twice its number.
 assert.deepEqual(buildPerformanceSchedule(base({tempos:[{tick:0,bpm:60},{tick:120,bpm:0,sourceUnit:{type:'half',dots:0,perMinute:30}}]}),quarter).tempoChanges,[]);
 // Bar 2 is faster; its repeat (bar 2 again) is faster again, bar 3 returns to the opening tempo.
 const repeated=buildPerformanceSchedule(base({totalTicks:384,sourceBarTicks:[0,96,192,288],timeSignatures:[{tick:0,numerator:2,denominator:4}],tempos:[{tick:0,bpm:60},{tick:96,bpm:90},{tick:192,bpm:60}],
  writtenPresentation:{performedTotalTicks:384,writtenBars:3,occurrences:[{performedBar:1,writtenBar:1,pass:1,performedTick:0,writtenTick:0},{performedBar:2,writtenBar:2,pass:1,performedTick:96,writtenTick:96},{performedBar:3,writtenBar:2,pass:2,performedTick:192,writtenTick:96},{performedBar:4,writtenBar:3,pass:1,performedTick:288,writtenTick:192}],events:{}}}),quarter);
 assert.deepEqual(repeated.tempoChanges,[{tick:96,factor:1.5},{tick:288,factor:1}]);
 // Printed bars and passes, as the reader numbers them.
 assert.deepEqual(repeated.barLabels,[{bar:1,pass:1},{bar:2,pass:1},{bar:2,pass:2},{bar:3,pass:1}]);
 assert.equal(repeated.writtenBars,3);assert.deepEqual(writtenBarAt(repeated,200),{bar:2,pass:2});
});
test('a score with repeats plays in performed order and its length follows the tempo',async()=>{
 const p=await importPackage(readFileSync(new URL('../fixtures/schumann-op68-no14.tuna',import.meta.url)),{allowLegacyTempo:true});
 const beat=countedBeat(p.score),s=buildPerformanceSchedule(p.score,beat);
 assert.deepEqual(beat,{numerator:3,denominator:8});
 assert.equal(s.totalTicks,p.score.writtenPresentation?.performedTotalTicks??p.score.totalTicks);
 assert.ok(s.notes.length>=p.score.notes.length);
 assert.ok(s.notes.every((n,i)=>i===0||s.notes[i-1].tick<=n.tick));
 assert.ok(s.notes.every(n=>n.release>=n.end&&n.end>n.tick&&n.velocity>=1&&n.velocity<=127));
 assert.equal(s.countIn.length,4);
 assert.equal(performanceSeconds(s,180),s.totalTicks/72/3);
 // The dialog counts written bars, as printed, not performed ones.
 assert.equal(s.writtenBars,p.score.writtenPresentation!.writtenBars);assert.ok(s.barLabels.some(l=>l.pass===2));
});

/** A recording WebAudio double on a clock the test moves. */
function fakeAudio(){
 const clock={now:0},starts:{f:number;at:number}[]=[],stops:number[]=[];let timer:(()=>void)|undefined;
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
 const node=()=>({connect(n:unknown){return n;},disconnect(){}});
 const context={get currentTime(){return clock.now;},state:'running',destination:node(),
  createGain:()=>({...node(),gain:param()}),createPeriodicWave:()=>({}),resume:async()=>{},close:async()=>{},
  createOscillator:()=>{const o={...node(),type:'sine',frequency:param(),setPeriodicWave(){},onended:null,start(at:number){starts.push({f:o.frequency.value,at});},stop(at:number){stops.push(at);}};return o;}} as unknown as AuditionContext;
 const timers:AuditionTimers={set:fn=>{timer=fn;return 1;},clear:()=>{timer=undefined;}};
 const advance=(to:number)=>{while(clock.now<to-1e-9){clock.now=Math.min(to,clock.now+.04);timer?.();}};
 return {context,timers,starts,stops,clock,advance};
}
test('the count-in and the notes share one clock; a tempo change keeps the music in place',async()=>{
 const audio=fakeAudio(),schedule=buildPerformanceSchedule(base({notes:[note('a',0,24,69),note('b',24,48,72),note('c',120,48,76),note('d',168,48,79)]}),quarter);
 const a=new TempoAudition(schedule,60,()=>audio.context,audio.timers);
 await a.open();a.play();
 assert.equal(a.phase,'count-in');
 audio.advance(4);
 // At 60 per quarter a tick is 1/48 s; the count-in starts 0.12 s after play.
 const at=(tick:number)=>+(0.12+(tick+168)/48).toFixed(4);
 assert.deepEqual(a.log.filter(e=>e.sound==='click'||e.sound==='accent').map(e=>+e.at.toFixed(4)),[-168,-120,-72,-24].map(at));
 assert.deepEqual(a.log.filter(e=>typeof e.sound==='number').map(e=>[e.sound,+e.at.toFixed(4)]),[[69,at(0)],[72,at(24)]]);
 assert.equal(a.phase,'playing');assert.deepEqual([a.position().measure,a.position().pass,a.position().measures],[1,1,3]);
 // Twice as fast from here: the next note comes half as far away as it would have.
 const now=audio.clock.now,tick=(now-at(0))*48;a.setBpm(120);audio.advance(now+3);
 const c=a.log.find(e=>e.sound===76)!;assert.equal(+c.at.toFixed(4),+(now+(120-tick)/96).toFixed(4));
 audio.advance(now+6);assert.equal(a.phase,'finished');
 assert.equal(a.log.filter(e=>typeof e.sound==='number').length,4);
});
test('pause continues from where it stopped without another count-in',async()=>{
 const audio=fakeAudio(),schedule=buildPerformanceSchedule(base({notes:[note('a',0,24,69),note('b',120,24,72)]}),quarter);
 const a=new TempoAudition(schedule,60,()=>audio.context,audio.timers);
 await a.open();a.play();audio.advance(4.2);a.pause();assert.equal(a.phase,'paused');
 const paused=a.position().tick;assert.ok(paused>0&&paused<120);
 audio.advance(10);a.resume();audio.advance(14);
 const clicks=a.log.filter(e=>typeof e.sound!=='number').length;assert.equal(clicks,4);
 const b=a.log.find(e=>e.sound===72)!;assert.equal(+b.at.toFixed(3),+(10+.12+(120-paused)/48).toFixed(3));
 await a.close();assert.equal(a.phase,'idle');
});
test('audio that will not start is reported, not hidden',async()=>{
 const a=new TempoAudition(buildPerformanceSchedule(base(),quarter),60,()=>({...fakeAudio().context,state:'suspended',resume:async()=>{}}) as unknown as AuditionContext);
 await assert.rejects(a.open(),/Sound is suspended/);
});
test('the audition follows the score’s later tempos on the same clock',async()=>{
 const audio=fakeAudio(),schedule=buildPerformanceSchedule(base({notes:[note('a',120,24,69),note('b',168,24,72)],tempos:[{tick:0,bpm:60},{tick:120,bpm:120}]}),quarter);
 const a=new TempoAudition(schedule,60,()=>audio.context,audio.timers);
 await a.open();a.play();audio.advance(8);
 const [first,second]=a.log.filter(e=>typeof e.sound==='number').map(e=>e.at);
 // A quarter after the change lasts half a second at twice the opening tempo.
 assert.equal(+(second-first).toFixed(4),.5);
 assert.equal(+a.seconds.toFixed(4),+(120/48+96/96).toFixed(4));
});
