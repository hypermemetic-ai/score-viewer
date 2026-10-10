import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreRefill,reviewRefill,admitRefill,allocateRefill,PracticeRefill,readingBar,refillAllocationBars,refillCandidates,refillResidents,refillSuccessors,type RefillLayout,type RefillMeasure} from '../src/practice-refill';
import {initialPractice,PracticeSession,type PracticePlan,type PracticeChunk,type PracticeAttack} from '../src/practice';

function fixture(widths:number[],rests:number[]=[],hands:Record<number,'LH'|'RH'>={}){
 const attacks:PracticeAttack[]=widths.flatMap((_,bar)=>rests.includes(bar)?[]:[{id:`${bar}:60`,tick:bar*192,end:(bar+1)*192,midi:60,bar,owners:[`note-${bar}`],groups:[`${bar}:${hands[bar]??'RH'}`]}]);
 const chunk:PracticeChunk={id:`1-${widths.length}`,firstBar:0,lastBar:widths.length-1,start:0,end:widths.length*192,weight:widths.length*192,pattern:'test-source'};
 const plan:PracticePlan={partition:'connection-boundary-v1',revision:'test-source',timeSignatures:[{tick:0,numerator:4,denominator:4}],referencePerformanceTempo:{version:'reference-performance-tempo-v1',bpm:180,beat:{numerator:3,denominator:8},provenance:{kind:'editorial',reference:'test source'}},ticksPerBeat:48,barTicks:Array.from({length:widths.length+1},(_,i)=>i*192),attacks,gestures:attacks.map(a=>({id:a.groups[0],bar:a.bar,hand:hands[a.bar]??'RH',start:a.tick,end:a.end,owners:a.owners,attackIds:[a.id]})),chunks:[chunk],ownerGroup:new Map(attacks.map(a=>[a.owners[0],a.groups[0]]))};
 const measures:RefillMeasure[]=widths.map((width,bar)=>({bar,width}));return {plan,chunk,measures};
}
function within(layout:RefillLayout,width:number,edge=5,gap=8){
 assert.ok(layout.placements.length<=4);assert.equal(new Set(layout.placements.map(p=>p.bar)).size,layout.placements.length);
 for(const [i,p]of layout.placements.entries()){
  assert.ok(p.x>=edge-1e-7,`left edge ${p.bar}`);assert.ok(p.x+p.width<=width-edge+1e-7,`right edge ${p.bar}`);
  if(i){const previous=layout.placements[i-1],required=p.bar===previous.bar+1?0:gap;assert.ok(p.x>=previous.x+previous.width+required-1e-7,`source interval overlap ${previous.bar}/${p.bar}`);}
 }
}

test('source lead includes the next written rest and both sparse-hand requests at every supported rate',()=>{
 const {plan,chunk}=fixture([30,40,50,60,70,80,90,100],[1,2,3,5,6],{0:'LH',4:'RH',7:'LH'});
 assert.deepEqual(refillResidents(plan,chunk,0),[0,1,4,7]);assert.deepEqual(refillSuccessors(plan,chunk,0),[1,4]);
 for(let bar=0;bar<=chunk.lastBar;bar++){
  const resident=refillResidents(plan,chunk,bar);assert.ok(resident.length<=4);assert.ok(resident.includes(bar));if(bar<chunk.lastBar)assert.ok(resident.includes(bar+1));
  for(const hand of ['LH','RH']){const next=plan.gestures.find(g=>g.hand===hand&&g.bar>bar);if(next)assert.ok(resident.includes(next.bar));}
 }
});

test('interval placement rejects a wide incoming prefix despite sufficient total free space',()=>{
 const {measures}=fixture([80,73.67,76.83,104.27,131.87]),map=new Map(measures.map(p=>[p.bar,p])),previous:RefillLayout={current:2,epoch:4,placements:[{bar:0,x:5,width:80},{bar:1,x:85,width:73.67},{bar:2,x:158.67,width:76.83}]},frame={width:340,edge:5,breakGap:8};
 assert.ok(frame.width-2*frame.edge-76.83>104.27+131.87);
 assert.deepEqual(refillCandidates(previous,2,[2,3,4],map,frame),[]);
 assert.throws(()=>allocateRefill(previous,2,[2,3,4],map,frame),/unchanged reading interval/);
});

test('nonconsecutive boundaries reserve actual repeat and final overhangs',()=>{
 const f=fixture([60,60,60,60,60]);f.measures[4].rightAir=5;f.measures[0].leftAir=5;
 const map=new Map(f.measures.map(p=>[p.bar,p])),previous:RefillLayout={current:4,epoch:1,placements:[{...f.measures[4],x:10}]},frame={width:160,edge:5,breakGap:8},layout=allocateRefill(previous,4,[0,4],map,frame);
 assert.deepEqual(layout.placements.map(p=>p.bar),[4,0]);assert.ok(layout.placements[1].x-(layout.placements[0].x+60)>=11.6-1e-7);assert.deepEqual(layout.placements[0],previous.placements[0]);
});

test('all bounded successor branches are preflighted; compact admission keeps original interiors',()=>{
 const f=fixture([45,70,55,110,35,90,60,75,100],[1,2,5],{0:'LH',3:'RH',4:'LH',6:'RH',7:'LH',8:'RH'}),certificate=admitRefill(f.plan,f.chunk,f.measures);
 assert.deepEqual(certificate.rates,[5,500]);assert.equal(certificate.proof,'enumerated');assert.ok(certificate.states>f.measures.length);assert.ok(certificate.transitions>=certificate.states-1);
 for(const offset of [-500,0,500]){
  const state=initialPractice(f.plan);state.working=500;const s=new PracticeSession(f.plan,f.chunk,state,true),refill=new PracticeRefill(f.plan,f.chunk,certificate);s.ready(0);
  for(const attack of s.events){
   const before=refill.layout;assert.ok(before.placements.some(p=>p.bar===attack.bar));
   assert.equal(s.note(attack.midi,s.startMs+attack.tick*s.tickMs+offset),'accepted');const current=readingBar(f.plan,f.chunk,s,before.current),anchor=before.placements.find(p=>p.bar===current)!;refill.update(s,true);
   assert.deepEqual(refill.layout.placements.find(p=>p.bar===current),anchor);within(refill.layout,certificate.frame.width);for(const p of refill.layout.placements)assert.equal(p.width,f.measures[p.bar].width);
  }
 }
});

test('a conservative break estimate still tests the permitted frame with complete cue air and exhaustive placement proof',()=>{
 const f=fixture([136,136,136,425,119]);for(const m of f.measures){m.leftAir=.8;m.rightAir=.8;}f.measures[3].leftAir=8.7;f.measures[4].rightAir=5;
 const edge=9.5,maximum=864,estimate=425+3*136+3*8+2*edge;assert.ok(estimate>maximum);
 const certificate=admitRefill(f.plan,f.chunk,f.measures,{edge,breakGap:8,maxFrameWidth:maximum});
 assert.equal(certificate.proof,'enumerated');assert.equal(certificate.frame.width,maximum);assert.ok(certificate.states>f.measures.length);assert.ok(certificate.transitions>=certificate.states-1);
 assert.deepEqual([...certificate.measures.values()],f.measures,'no source interval or required cue footprint is squeezed');
 const s=new PracticeSession(f.plan,f.chunk,initialPractice(f.plan),true),refill=new PracticeRefill(f.plan,f.chunk,certificate);s.ready(0);
 for(const attack of s.events){assert.equal(s.note(attack.midi,s.startMs+attack.tick*s.tickMs),'accepted');const current=readingBar(f.plan,f.chunk,s,refill.layout.current),pinned=refill.layout.placements.find(p=>p.bar===current);refill.update(s,true);assert.deepEqual(refill.layout.placements.find(p=>p.bar===current),pinned);within(refill.layout,maximum,edge);}
 assert.throws(()=>admitRefill(f.plan,f.chunk,f.measures,{edge,breakGap:8,maxFrameWidth:600}),/cannot be admitted at a readable size/,'an actually infeasible bound still refuses');
});

test('the conservative interval certificate covers every possible pinned coordinate',()=>{
 const f=fixture([20,80,110,75,120,45]),certificate=admitRefill(f.plan,f.chunk,f.measures,{maxStates:1}),maximum=Math.max(...f.measures.map(p=>p.width+certificate.frame.breakGap));
 assert.equal(certificate.proof,'interval-bound');assert.equal(certificate.frame.width,5*maximum+2*certificate.frame.edge);
 const bars=[2,3,4,5],width=f.measures[2].width;
 for(let i=0;i<=100;i++){
  const x=certificate.frame.edge+(certificate.frame.width-2*certificate.frame.edge-width)*i/100,previous:RefillLayout={current:2,epoch:7,placements:[{...f.measures[2],x}]};
  const layout=allocateRefill(previous,2,bars,certificate.measures,certificate.frame);within(layout,certificate.frame.width);assert.equal(layout.placements.find(p=>p.bar===2)!.x,x);
 }
});

test('unread attacks block rest entry and chord-member order has one monotonic reading entry',()=>{
 const f=fixture([60,70,80,90,100,110],[1,2]),state=initialPractice(f.plan),s=new PracticeSession(f.plan,f.chunk,state,true);
 s.phase='trial';s.elapsedTick=3*192;assert.equal(readingBar(f.plan,f.chunk,s),0);
 s.matched.add(s.events[0].id);assert.equal(readingBar(f.plan,f.chunk,s),2);
 const entry=s.events.find(a=>a.bar===3)!;s.matched.add(entry.id);s.elapsedTick=entry.tick-200;assert.equal(readingBar(f.plan,f.chunk,s),3);
 const chord={...entry,id:'second-chord-member',midi:65};f.plan.attacks.push(chord);f.plan.attacks.sort((a,b)=>a.tick-b.tick);assert.equal(readingBar(f.plan,f.chunk,s,3),3);s.matched.add(chord.id);assert.equal(readingBar(f.plan,f.chunk,s,3),3);
});

test('early attack across a rest is resident before the clock reaches that rest',()=>{
 const f=fixture([60,60,60,60,60,60,60],[4]),state=initialPractice(f.plan);state.working=500;const s=new PracticeSession(f.plan,f.chunk,state,true),refill=new PracticeRefill(f.plan,f.chunk,admitRefill(f.plan,f.chunk,f.measures));
 s.ready(0);s.update(s.startMs);
 for(const a of s.events.filter(a=>a.bar<4)){assert.equal(s.note(a.midi,s.startMs+a.tick*s.tickMs), 'accepted');refill.update(s,true);}
 const next=s.events.find(a=>a.bar===5)!;assert.ok(refill.bars.includes(next.bar));
 const earlyTick=next.tick-500/s.tickMs;assert.ok(earlyTick<f.plan.barTicks[4]);assert.equal(s.note(next.midi,s.startMs+next.tick*s.tickMs-500),'accepted');refill.update(s,true);assert.equal(refill.layout.current,5);assert.ok(refill.bars.includes(5));
});

test('visual retirement neither changes sounding holds nor accepts missing notes',()=>{
 const f=fixture([60,70,80,90,100,110]);f.plan.attacks[0].end=4*192;f.plan.gestures[0].end=4*192;const state=initialPractice(f.plan),s=new PracticeSession(f.plan,f.chunk,state,true),refill=new PracticeRefill(f.plan,f.chunk,admitRefill(f.plan,f.chunk,f.measures));
 s.ready(0);s.update(s.startMs);const first=s.events[0],next=s.events[1];assert.equal(s.note(first.midi,s.startMs),'accepted');refill.update(s,true);assert.equal(refill.retired.size,0);
 // Distinct MIDI keeps the first obligation sounding after the next attack.
 next.midi=65;assert.equal(s.note(next.midi,s.startMs+next.tick*s.tickMs-50),'accepted');const matched=[...s.matched],obligations=s.obligations.map(a=>[a.id,a.end]);refill.update(s,true);
 assert.ok(refill.retired.has(0));assert.deepEqual([...s.matched],matched);assert.deepEqual(s.obligations.map(a=>[a.id,a.end]),obligations);assert.ok(!refill.visibleGroups(new Set(['0:RH','1:RH'])).has('0:RH'));
 s.release(first.midi,s.startMs+next.tick*s.tickMs);assert.equal(s.phase,'error');assert.equal(s.failure?.id,first.id);assert.equal(s.failureReason,'A held note was released early.');
});

test('resident Pause is stable; manual, error and paused inspection never allocate or retire',()=>{
 const f=fixture([55,80,65,90,120]),state=initialPractice(f.plan),s=new PracticeSession(f.plan,f.chunk,state,true),refill=new PracticeRefill(f.plan,f.chunk,admitRefill(f.plan,f.chunk,f.measures));
 s.phase='trial';s.elapsedTick=1000;for(const a of s.events.filter(a=>a.bar<3))s.matched.add(a.id);refill.update(s,true);const layout=refill.layout,retired=[...refill.retired];
 s.pause();assert.equal(refill.update(s,true),false);assert.equal(refill.layout,layout);assert.deepEqual([...refill.retired],retired);
 for(const phase of ['error','inspection','trial'] as const){s.phase=phase;s.measured=false;assert.equal(refill.update(s,true),false);s.measured=true;if(phase!=='trial'){s.inspection=true;assert.equal(refill.update(s,true),false);}s.inspection=false;assert.equal(refill.update(s,false),false);}
 refill.prime();assert.deepEqual(refill.layout,refill.certificate.initial);assert.equal(refill.retired.size,0);assert.equal(s.matched.size,0);
});

test('live Fingers follows source entries and a two-hand onset allocates once',()=>{
 const f=fixture([60,70,80,90,100,110,120,130],[1,2,3,5,6],{0:'LH',4:'RH',7:'LH'});
 const first=f.plan.attacks[0],other:PracticeAttack={...first,id:'0:65',midi:65,owners:['other-hand'],groups:['0:RH']};f.plan.attacks.splice(1,0,other);f.plan.gestures.push({id:'0:RH',bar:0,hand:'RH',start:0,end:192,owners:other.owners,attackIds:[other.id]});f.plan.ownerGroup.set('other-hand','0:RH');
 const state=initialPractice(f.plan);state.working=500;const s=new PracticeSession(f.plan,f.chunk,state,true),refill=new PracticeRefill(f.plan,f.chunk,admitRefill(f.plan,f.chunk,f.measures));s.ready(0);s.inspect(true);
 assert.equal(s.note(first.midi,s.startMs),'accepted');assert.equal(refill.update(s,true),true);assert.ok(refill.bars.includes(4));assert.ok(refill.bars.includes(7));const epoch=refill.layout.epoch,placements=refill.layout.placements;
 assert.equal(s.note(other.midi,s.startMs),'accepted');assert.equal(refill.update(s,true),false);assert.equal(refill.layout.epoch,epoch);assert.equal(refill.layout.placements,placements);
 for(const a of s.events.filter(a=>a.bar>0)){assert.equal(s.note(a.midi,s.startMs+a.tick*s.tickMs),'accepted');refill.update(s,true);}
 assert.equal(refill.layout.current,7);assert.ok(refill.retired.has(0));s.pause();const layout=refill.layout;assert.equal(refill.update(s,true),false);assert.equal(refill.layout,layout);
});

test('a four-bar leaf keeps resident source and stable geometry; hand reveals refill atomically during legal count-in input',()=>{
 const leaf=fixture([60,70,80,90]),state=initialPractice(leaf.plan),s=new PracticeSession(leaf.plan,leaf.chunk,state,true),refill=new PracticeRefill(leaf.plan,leaf.chunk,admitRefill(leaf.plan,leaf.chunk,leaf.measures));
 s.ready(0);const initial=refill.layout;
 for(const a of s.events){assert.equal(s.note(a.midi,s.startMs+a.tick*s.tickMs),'accepted');assert.equal(refill.update(s,true),false);assert.deepEqual(refill.layout.placements,initial.placements);}
 assert.deepEqual(refill.bars,[0,1,2,3]);assert.ok(refill.retired.has(0));s.pause();assert.deepEqual(refill.bars,[0,1,2,3]);
 const sparse=fixture([60,70,80,90,100,110,120,130],[1,2,3,5,6],{0:'LH',4:'RH',7:'LH'}),fast=initialPractice(sparse.plan);fast.working=500;const input=new PracticeSession(sparse.plan,sparse.chunk,fast,true),display=new PracticeRefill(sparse.plan,sparse.chunk,admitRefill(sparse.plan,sparse.chunk,sparse.measures));input.ready(0);
 assert.equal(input.note(input.events[0].midi,input.startMs-500),'accepted');assert.equal(input.phase,'countin');const anchor=display.layout.placements.find(p=>p.bar===0)!;
 assert.equal(display.update(input,true),true);assert.equal(display.layout.current,0);assert.deepEqual(display.layout.placements.find(p=>p.bar===0),anchor);assert.ok(display.bars.includes(7));
});

test('original three/four/five-bar leaves and terminal rests remain selected and bounded',()=>{
 for(const count of [3,4,5]){const f=fixture(Array.from({length:count},(_,i)=>40+20*i),[count-1]),c=admitRefill(f.plan,f.chunk,f.measures);assert.ok(c.initial.placements.length<=4);for(let bar=0;bar<count;bar++)assert.ok(refillResidents(f.plan,f.chunk,bar).every(b=>b<count));assert.deepEqual(refillSuccessors(f.plan,f.chunk,count-1),[]);}
 const f=fixture([50,60,70,500,80,90]);assert.throws(()=>admitRefill(f.plan,f.chunk,f.measures,{maxFrameWidth:100}),/cannot be admitted at a readable size/);
});

test('a complete short leaf certifies its consecutive frame without impossible refill gaps',()=>{
 for(const widths of [[50,80,70],[50,80,70,100]]){
  const f=fixture(widths),width=widths.reduce((a,b)=>a+b,0)+10,c=admitRefill(f.plan,f.chunk,f.measures,{maxFrameWidth:width});
  assert.equal(c.frame.width,width);assert.equal(c.proof,'enumerated');assert.ok(c.transitions>0);
  const s=new PracticeSession(f.plan,f.chunk,initialPractice(f.plan),true),refill=new PracticeRefill(f.plan,f.chunk,c),placements=c.initial.placements;
  for(const rate of [5,500]){s.state.working=rate;s.ready(0);refill.prime();for(const a of s.events){assert.equal(s.note(a.midi,s.startMs+a.tick*s.tickMs),'accepted');refill.update(s,true);assert.equal(refill.layout.placements,placements);}}
  assert.throws(()=>admitRefill(f.plan,f.chunk,f.measures,{maxFrameWidth:width-1}),/cannot be admitted/);
 }
});

test('a subset request retires no source frame and leaves every resident placement exact',()=>{
 const f=fixture([60,70,80,90]),c=admitRefill(f.plan,f.chunk,f.measures),previous=c.initial;
 const next=allocateRefill(previous,2,[2,3],c.measures,c.frame);
 assert.equal(next.current,2);assert.equal(next.epoch,previous.epoch);assert.equal(next.placements,previous.placements);
 assert.deepEqual(next.placements.map(p=>p.bar),[0,1,2,3]);
});

test('terminal incoming allocations retain four distinct source frames and the protected interval',()=>{
 const f=fixture([40,70,80,90,60,50]),c=admitRefill(f.plan,f.chunk,f.measures),previous:RefillLayout={...c.initial,current:3};
 // An early accepted attack requests the final source bar. There are only
 // three forward bars; the cleared old interval still supplies the fourth.
 const bars=refillAllocationBars(f.plan,f.chunk,previous,3,3);
 assert.deepEqual(bars,[2,3,4,5]);
 const next=allocateRefill(previous,3,bars,c.measures,c.frame);
 assert.deepEqual(next.placements.find(p=>p.bar===3),previous.placements.find(p=>p.bar===3));assert.equal(next.placements.length,4);
 const s=new PracticeSession(f.plan,f.chunk,initialPractice(f.plan),true),refill=new PracticeRefill(f.plan,f.chunk,c);s.ready(0);
 for(const a of s.events){const anchor=refill.layout.placements.find(p=>p.bar===a.bar);assert.equal(s.note(a.midi,s.startMs+a.tick*s.tickMs),'accepted');refill.update(s,true);assert.equal(refill.bars.length,4);assert.equal(new Set(refill.bars).size,4);assert.deepEqual(refill.layout.placements.find(p=>p.bar===a.bar),anchor);}
 assert.ok(refill.retired.has(0));assert.deepEqual(refill.bars.slice().sort((a,b)=>a-b),[2,3,4,5]);
});

test('empty source frames reclaim space before a wide required measure without moving the active interval',()=>{
 const f=fixture([135.87,135.87,135.87,424.57,118.91]);for(const m of f.measures){m.blankWidth=m.bar===4?m.width:4;m.leftAir=.8;m.rightAir=m.bar===4?5:.8;}
 f.measures[3].leftAir=8.655;
 const c=admitRefill(f.plan,f.chunk,f.measures,{edge:.8,breakGap:8,boundaryAir:true,maxFrameWidth:580});
 assert.equal(c.proof,'enumerated');assert.ok(c.states>0);assert.ok(c.frame.width<=580);assert.equal(c.initial.placements.length,4);
 assert.ok(c.initial.placements.find(p=>p.bar===2)!.empty);assert.ok(c.initial.placements.find(p=>p.bar===3)!.empty);
 const s=new PracticeSession(f.plan,f.chunk,initialPractice(f.plan),true),refill=new PracticeRefill(f.plan,f.chunk,c);s.ready(0);
 for(const a of s.events){
  const before=refill.layout.placements.find(p=>p.bar===a.bar)!;assert.equal(before.width,f.measures[a.bar].width);assert.ok(!before.empty,'Incoming attack was not expanded before reveal');
  assert.equal(s.note(a.midi,s.startMs+a.tick*s.tickMs),'accepted');refill.update(s,true);
  const after=refill.layout.placements.find(p=>p.bar===a.bar)!;assert.equal(after.x,before.x);assert.equal(after.width,before.width);
  assert.equal(refill.bars.length,4);assert.equal(new Set(refill.bars).size,4);
  for(const required of refillResidents(f.plan,f.chunk,a.bar))assert.equal(refill.layout.placements.find(p=>p.bar===required)!.width,f.measures[required].width);
 }
 assert.throws(()=>admitRefill(f.plan,f.chunk,f.measures,{edge:.8,boundaryAir:true,maxFrameWidth:550}),/cannot be admitted/,'actual required source intervals still refuse when no readable placement exists');
});

test('empty-frame sizing cannot resize an unread protected interval or waive a visible source footprint',()=>{
 const f=fixture([100,150,100,200,120]);f.measures.forEach(m=>{m.blankWidth=4;});f.measures[2].blankWidth=f.measures[2].width;
 const previous:RefillLayout={current:0,epoch:0,placements:[{...f.measures[0],x:10},{...f.measures[1],x:110},{...f.measures[2],x:260},{...f.measures[3],width:4,empty:true,x:360}]};
 assert.throws(()=>allocateRefill(previous,3,[1,2,3,4],new Map(f.measures.map(m=>[m.bar,m])),{width:600,edge:5,breakGap:8}),/fully admitted before entry/);
 const c=admitRefill(f.plan,f.chunk,f.measures,{edge:5,maxFrameWidth:800});assert.equal(c.initial.placements.find(p=>p.bar===2)!.width,100,'non-note footprint remains full width');
});

test('unused empty staff room is shared without changing required geometry or accepting invalid minima',()=>{
 const f=fixture([135.87,135.87,135.87,424.57,118.91]);f.measures.forEach(m=>m.blankWidth=4);f.measures[4].blankWidth=f.measures[4].width;
 const c=admitRefill(f.plan,f.chunk,f.measures,{edge:.8,boundaryAir:true,maxFrameWidth:590});
 const blanks=c.initial.placements.filter(p=>p.empty);assert.equal(blanks.length,2);assert.ok(blanks.every(p=>p.width>4));assert.equal(blanks[0].width,blanks[1].width);
 const anchor={...f.measures[4],x:1.6},previous:RefillLayout={current:4,epoch:4,placements:[anchor,...f.measures.slice(1,4).map((p,i)=>({...p,width:4,empty:true,x:130+i*4}))]},map=new Map(f.measures.map(p=>[p.bar,p.bar===4?p:{...p,width:4,empty:true}]));
 const candidates=refillCandidates(previous,4,[1,2,3,4],map,{width:590,edge:.8,breakGap:8,boundaryAir:true});
 assert.deepEqual(candidates[0].placements.find(p=>p.bar===4),anchor);const shared=candidates[0].placements.filter(p=>p.empty);assert.ok(shared.every(p=>p.width>100));assert.ok(shared.every(p=>Math.abs(p.width-shared[0].width)<1e-7));
 for(const invalid of [0,-1,NaN,Infinity,136]){const input=f.measures.map(p=>({...p}));input[0].blankWidth=invalid;assert.throws(()=>admitRefill(f.plan,f.chunk,input),/valid source footprint/);}
});

test('empty-frame admission works when native Map iterators provide no iterator helpers',()=>{
 const prototype=Object.getPrototypeOf(new Map().values()),saved=Object.getOwnPropertyDescriptor(prototype,'some');
 Object.defineProperty(prototype,'some',{value:undefined,configurable:true});
 try{const f=fixture([100,100,100,250,100]);f.measures.forEach(m=>m.blankWidth=4);const c=admitRefill(f.plan,f.chunk,f.measures,{maxFrameWidth:500});assert.equal(c.proof,'enumerated');assert.ok(c.transitions>0);}
 finally{if(saved)Object.defineProperty(prototype,'some',saved);else delete prototype.some;}
});


test('complete first allocation retains all four source intervals and proves every later empty refill from that anchor',()=>{
 const f=fixture([135.87,135.87,135.87,424.57,118.91]);f.measures.forEach(m=>m.blankWidth=4);f.measures[4].blankWidth=f.measures[4].width;
 const sourceWidth=f.measures.slice(0,4).reduce((sum,m)=>sum+m.width,0),c=admitRefill(f.plan,f.chunk,f.measures,{edge:.8,boundaryAir:true,minFrameWidth:sourceWidth+24,fullSourceInitial:true});
 assert.equal(c.proof,'enumerated');assert.ok(c.transitions>0);assert.ok(c.frame.width>=sourceWidth+24);assert.deepEqual(c.initial.placements.map(p=>[p.bar,p.width,!!p.empty]),f.measures.slice(0,4).map(p=>[p.bar,p.width,false]));
 const s=new PracticeSession(f.plan,f.chunk,initialPractice(f.plan),true),refill=new PracticeRefill(f.plan,f.chunk,c);s.ready(0);assert.equal(refill.update(s,true),false);assert.deepEqual(refill.layout,c.initial);s.update(s.startMs);assert.equal(refill.update(s,true),false);assert.deepEqual(refill.layout,c.initial);let retired=false;
 for(const a of s.events){const before=refill.layout.placements.find(p=>p.bar===a.bar)!;assert.equal(before.width,f.measures[a.bar].width);assert.equal(s.note(a.midi,s.startMs+a.tick*s.tickMs),'accepted');refill.update(s,true);const after=refill.layout.placements.find(p=>p.bar===a.bar)!;assert.equal(after.x,before.x);assert.equal(after.width,before.width);assert.equal(refill.bars.length,4);retired ||= refill.retired.size>0;}
 assert.ok(retired);refill.prime();assert.deepEqual(refill.layout,c.initial);assert.equal(refill.retired.size,0);
});

test('invalid shared frame bounds cannot admit a narrower claimed complete restoration',()=>{
 const f=fixture([100,100,100,200,100]);f.measures.forEach(m=>m.blankWidth=4);
 for(const minFrameWidth of [NaN,Infinity,-1,0])assert.throws(()=>admitRefill(f.plan,f.chunk,f.measures,{minFrameWidth,fullSourceInitial:true}),/minimum is invalid/);
 assert.throws(()=>admitRefill(f.plan,f.chunk,f.measures,{minFrameWidth:600,maxFrameWidth:500,fullSourceInitial:true}),/minimum exceeds/);
});


test('complete review restores literal source widths and preserves a feasible reading anchor',()=>{
 const f=fixture([100,100,100,100,100]);f.measures.forEach(m=>m.blankWidth=4);const c=admitRefill(f.plan,f.chunk,f.measures,{minFrameWidth:450,fullSourceInitial:true}),windows=[[0,1,2,3],[1,2,3,4]];
 const restored=reviewRefill(c,windows,windows[0],{bar:2,x:225});assert.equal(restored.anchor,'preserved');assert.deepEqual(restored.bars,windows[0]);assert.equal(restored.placements.find(p=>p.bar===2)!.x,225);assert.ok(restored.placements.every(p=>!p.empty&&p.width===100));
 const alternate=reviewRefill(c,windows,windows[0],{bar:2,x:125});assert.equal(alternate.anchor,'preserved');assert.deepEqual(alternate.bars,windows[1]);assert.equal(alternate.placements.find(p=>p.bar===2)!.x,125);
 const outside=reviewRefill(c,windows,windows[0],{bar:2,x:5});assert.equal(outside.anchor,'outside-complete-window');assert.ok(outside.placements.every(p=>!p.empty&&p.width===100));assert.ok(outside.placements[0].x>=c.frame.edge);assert.ok(outside.placements.at(-1)!.x+100<=c.frame.width-c.frame.edge);
 assert.throws(()=>reviewRefill({...c,frame:{...c.frame,width:300}},windows,windows[0]),/complete review source window does not fit/);assert.throws(()=>reviewRefill(c,windows,[0,2,3]),/review window is invalid/);
});


test('full-recovery admission proves literal resident restoration at every source-prefix entry without moving its reading interval',()=>{
 const f=fixture(Array.from({length:38},(_,i)=>i===27?424.57:i===28?118.91:135.87));
 for(const m of f.measures){m.blankWidth=m.bar===28?m.width:4.48;m.leftAir=m.bar===27?8.655:.8;m.rightAir=.8;}
 const c=admitRefill(f.plan,f.chunk,f.measures,{edge:.8,boundaryAir:true,minFrameWidth:842.785,fullSourceInitial:true,fullRecovery:true});
 assert.equal(c.proof,'enumerated');assert.equal(c.fullRecovery,true);assert.ok(c.states>0);assert.ok(c.transitions>0);
 const s=new PracticeSession(f.plan,f.chunk,initialPractice(f.plan),true),refill=new PracticeRefill(f.plan,f.chunk,c);s.ready(0);
 for(const a of s.events){
  const before=refill.layout.placements.find(p=>p.bar===a.bar)!;assert.equal(s.note(a.midi,s.startMs+a.tick*s.tickMs),'accepted');refill.update(s,true);
  const current=refill.layout.placements.find(p=>p.bar===refill.layout.current)!,recovered=restoreRefill(c,refill.layout),pin=recovered.placements.find(p=>p.bar===current.bar)!;
  assert.equal(current.x,before.x);assert.equal(current.width,before.width);assert.equal(pin.x,current.x);assert.equal(pin.width,current.width);assert.equal(recovered.placements.length,4);
  assert.deepEqual(recovered.placements.map(p=>p.bar).sort((a,b)=>a-b),refill.bars.slice().sort((a,b)=>a-b));
  for(const p of recovered.placements){assert.ok(!p.empty);assert.equal(p.width,f.measures[p.bar].width);}
  within(recovered,c.frame.width,.8,8);
 }
 assert.throws(()=>admitRefill(f.plan,f.chunk,f.measures,{edge:.8,boundaryAir:true,minFrameWidth:842.785,fullSourceInitial:true,fullRecovery:true,maxStates:1}),/bounded allocation search/,'a recovery claim cannot fall back to the interval-only safety shortcut');
});

test('restoration refuses unpaid full-source space and never resizes an empty or foreign reading interval',()=>{
 const f=fixture([135.87,135.87,135.87,424.57,118.91]);f.measures.forEach(m=>m.blankWidth=4.48);
 const c=admitRefill(f.plan,f.chunk,f.measures,{minFrameWidth:900,fullSourceInitial:true,fullRecovery:true}),previous:RefillLayout={current:2,epoch:7,placements:[{...f.measures[3],x:5},{...f.measures[0],x:437.57,width:100,empty:true},{...f.measures[1],x:537.57,width:100,empty:true},{...f.measures[2],x:637.57}]};
 const narrow={...c,frame:{...c.frame,width:780}};
 assert.throws(()=>restoreRefill(narrow,previous),/cannot be restored/);assert.equal(narrow.frame.width,780);assert.equal(previous.placements[3].x,637.57);
 assert.throws(()=>restoreRefill(c,{...previous,placements:previous.placements.map(p=>p.bar===2?{...p,empty:true,width:4.48}:p)}),/not fully admitted/);
 assert.throws(()=>restoreRefill(c,{...previous,current:99}),/not fully admitted/);
});
