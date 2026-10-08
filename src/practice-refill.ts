import type {PracticeChunk,PracticePlan,PracticeSession} from './practice';

/** Source intervals, measured before any owned ink is hidden. Width never
 * includes a horizontal stretch: each placement is one source translation. */
export interface RefillMeasure {bar:number;width:number;leftAir?:number;rightAir?:number}
export interface RefillPlacement extends RefillMeasure {x:number}
export interface RefillFrame {width:number;edge:number;breakGap:number}
export interface RefillLayout {current:number;placements:RefillPlacement[];epoch:number}
export interface RefillCertificate {
 frame:RefillFrame;initial:RefillLayout;measures:ReadonlyMap<number,RefillMeasure>;
 /** The entire supported rate range has the same conservative source lead. */
 rates:readonly [5,500];proof:'enumerated'|'interval-bound';states:number;transitions:number;
}
export interface RefillAdmissionOptions {edge?:number;breakGap?:number;maxStates?:number;maxFrameWidth?:number}
const epsilon=1e-7,defaultStateBound=8192;

/** Every next hand gesture is resident, even when an early accepted attack
 * skips written rests. Thus this conservative lead does not depend on tempo,
 * chord-member order, or when a hand's current group first becomes visible. */
export function refillResidents(plan:PracticePlan,chunk:PracticeChunk,current:number,revealed=3):number[] {
 if(current<chunk.firstBar||current>chunk.lastBar)throw Error('The reading measure is outside the selected passage.');
 const bars=new Set([current]);
 if(current<chunk.lastBar)bars.add(current+1);
 for(const [index,hand]of (['LH','RH'] as const).entries()){
  const groups=plan.gestures.filter(g=>g.hand===hand&&g.bar>=chunk.firstBar&&g.bar<=chunk.lastBar),next=groups.find(g=>g.bar>current),previous=groups.findLast(g=>g.bar<=current);
  if(next&&(!previous||previous.bar<current||revealed&(1<<index)))bars.add(next.bar);
 }
 return [...bars].sort((a,b)=>a-b);
}
/** Retain resident source identities until an incoming request actually needs
 * space. This preserves the complete original four-bar leaf on Pause. Only a
 * refill evicts old intervals; hidden spare future source can share that event. */
export function refillAllocationBars(plan:PracticePlan,chunk:PracticeChunk,previous:RefillLayout,current:number,revealed=3):number[] {
 const required=refillResidents(plan,chunk,current,revealed),resident=previous.placements.map(p=>p.bar);
 if(required.every(bar=>resident.includes(bar)))return resident;
 const bars=new Set(required);
 for(const bar of resident.filter(b=>b>=current).sort((a,b)=>a-b))if(bars.size<4)bars.add(bar);
 for(let bar=current+1;bars.size<4&&bar<=chunk.lastBar;bar++)bars.add(bar);
 return [...bars].sort((a,b)=>a-b);
}
function separation(a:number,b:number,frame:RefillFrame,measures:ReadonlyMap<number,RefillMeasure>){return b===a+1?0:Math.max(frame.breakGap,(measures.get(a)?.rightAir??0)+(measures.get(b)?.leftAir??0)+1.6);}
function runWidth(bars:number[],measures:ReadonlyMap<number,RefillMeasure>,frame:RefillFrame){return bars.reduce((sum,bar,i)=>sum+measures.get(bar)!.width+(i?separation(bars[i-1],bar,frame,measures):0),0);}
function rotated(bars:number[],cut:number){return [...bars.slice(cut),...bars.slice(0,cut)];}
function validFrame(frame:RefillFrame){if(!Number.isFinite(frame.width)||frame.width<=2*frame.edge||!Number.isFinite(frame.edge)||frame.edge<0||!Number.isFinite(frame.breakGap)||frame.breakGap<0)throw Error('The practice allocation frame is invalid.');}

/** Enumerate source-order cuts, not arbitrary note reorderings. Each side is
 * a complete contiguous run. A nonconsecutive boundary reserves an explicit
 * staff break. The protected interval is copied exactly, including its x. */
export function refillCandidates(previous:RefillLayout,current:number,bars:number[],measures:ReadonlyMap<number,RefillMeasure>,frame:RefillFrame):RefillLayout[] {
 validFrame(frame);const anchor=previous.placements.find(p=>p.bar===current);
 if(!anchor)throw Error(`Measure ${current+1} was not admitted before its reading entry.`);
 if(!bars.includes(current)||bars.length>4||new Set(bars).size!==bars.length)throw Error('The resident allocation is invalid.');
 const source=[...bars].sort((a,b)=>a-b),out:RefillLayout[]=[];
 for(let cut=0;cut<source.length;cut++){
  const order=rotated(source,cut),index=order.indexOf(current),before=order.slice(0,index),after=order.slice(index+1),leftWidth=runWidth(before,measures,frame),rightWidth=runWidth(after,measures,frame),leftGap=before.length?separation(before.at(-1)!,current,frame,measures):0,rightGap=after.length?separation(current,after[0],frame,measures):0;
  let x=anchor.x-leftWidth-leftGap;const placements:RefillPlacement[]=[];
  if(x<frame.edge-epsilon||anchor.x+anchor.width+rightGap+rightWidth>frame.width-frame.edge+epsilon)continue;
  for(const [i,bar]of order.entries()){
   const measure=measures.get(bar);if(!measure)throw Error(`Measure ${bar+1} has no admitted source interval.`);
   if(i===index)x=anchor.x;
   placements.push({...measure,x});x+=measure.width;if(i+1<order.length)x+=separation(bar,order[i+1],frame,measures);
  }
  out.push({current,placements,epoch:previous.epoch+1});
 }
 const old=new Map(previous.placements.map(p=>[p.bar,p.x])),score=(layout:RefillLayout)=>{
  const wraps=layout.placements.slice(1).filter((p,i)=>p.bar<layout.placements[i].bar).length;
  const movement=layout.placements.reduce((sum,p)=>sum+(old.has(p.bar)?Math.abs(p.x-old.get(p.bar)!):0),0);
  return [wraps,movement,layout.placements[0].x];
 };
 return out.sort((a,b)=>{const av=score(a),bv=score(b);return av[0]-bv[0]||av[1]-bv[1]||av[2]-bv[2]||a.placements[0].bar-b.placements[0].bar;});
}
export function allocateRefill(previous:RefillLayout,current:number,bars:number[],measures:ReadonlyMap<number,RefillMeasure>,frame:RefillFrame):RefillLayout {
 const same=bars.length===previous.placements.length&&bars.every(bar=>previous.placements.some(p=>p.bar===bar));
 if(same)return {...previous,current};
 if(bars.every(bar=>previous.placements.some(p=>p.bar===bar)))return {current,epoch:previous.epoch,placements:previous.placements.filter(p=>bars.includes(p.bar))};
 const layout=refillCandidates(previous,current,bars,measures,frame)[0];
 if(!layout)throw Error(`Measure ${current+1} has no verified placement around the unchanged reading interval.`);
 return layout;
}
function initialLayout(plan:PracticePlan,chunk:PracticeChunk,measures:ReadonlyMap<number,RefillMeasure>,frame:RefillFrame):RefillLayout {
 const initial=new Set(refillResidents(plan,chunk,chunk.firstBar,0));for(let bar=chunk.firstBar;initial.size<4&&bar<=chunk.lastBar;bar++)initial.add(bar);
 const bars=[...initial].sort((a,b)=>a-b),width=runWidth(bars,measures,frame);let x=(frame.width-width)/2;
 if(x<frame.edge-epsilon)throw Error('The initial source passage does not fit the practice frame.');
 return {current:chunk.firstBar,epoch:0,placements:bars.map((bar,i)=>{const p={...measures.get(bar)!,x};x+=p.width;if(i+1<bars.length)x+=separation(bar,bars[i+1],frame,measures);return p;})};
}
/** The matcher accepts an ordered onset prefix. Between two nonempty bars,
 * clocks can enter successive rest bars, or an early next attack can enter
 * its source bar directly. These are the complete geometry entry edges. */
export function refillSuccessors(plan:PracticePlan,chunk:PracticeChunk,current:number):number[] {
 const out:number[]=[],next=current+1;
 if(next<=chunk.lastBar&&!plan.attacks.some(a=>a.bar===next))out.push(next);
 const attack=plan.attacks.find(a=>a.bar>current&&a.bar<=chunk.lastBar);if(attack&&!out.includes(attack.bar))out.push(attack.bar);
 return out;
}
function layoutIdentity(layout:RefillLayout){return `${layout.current}|${layout.placements.map(p=>`${p.bar}:${p.x.toFixed(8)}`).join(',')}`;}
function handMask(plan:PracticePlan,bar:number){return plan.gestures.filter(g=>g.bar===bar).reduce((mask,g)=>mask|(g.hand==='LH'?1:2),0);}
function revealedHands(plan:PracticePlan,session:PracticeSession,bar:number){
 // The first accepted chord member admits the source-known reveal requests
 // of that entire onset. Later members do not allocate the same chord twice.
 const onsets=new Set(session.events.filter(a=>a.bar===bar&&session.matched.has(a.id)).map(a=>a.tick));
 return plan.gestures.filter(g=>g.bar===bar&&(session.started.has(g.id)||onsets.has(g.start))).reduce((mask,g)=>mask|(g.hand==='LH'?1:2),0);
}
function enumerate(plan:PracticePlan,chunk:PracticeChunk,measures:ReadonlyMap<number,RefillMeasure>,frame:RefillFrame,maxStates:number){
 const initial=initialLayout(plan,chunk,measures,frame),queue=[{layout:initial,revealed:0}],seen=new Set([layoutIdentity(initial)+'|0']);let transitions=0;
 for(let i=0;i<queue.length;i++){
  const {layout,revealed}=queue[i],hands=handMask(plan,layout.current),edges:Array<{bar:number;revealed:number}>=[];
  for(const bit of [1,2])if(hands&bit&&!(revealed&bit))edges.push({bar:layout.current,revealed:revealed|bit});
  // Every group in the old reading bar must have started before all its
  // required attacks can be accepted and the matcher admits a later bar.
  if((revealed&hands)===hands)for(const bar of refillSuccessors(plan,chunk,layout.current)){
   const nextHands=handMask(plan,bar);
   if(nextHands){for(const mask of [1,2,3])if(mask&nextHands&&!(mask&~nextHands))edges.push({bar,revealed:mask});}
   else edges.push({bar,revealed:0});
  }
  for(const edge of edges){
   transitions++;const bars=refillAllocationBars(plan,chunk,layout,edge.bar,edge.revealed),next=allocateRefill(layout,edge.bar,bars,measures,frame),key=layoutIdentity(next)+'|'+edge.revealed;
   if(seen.has(key))continue;if(seen.size>=maxStates)throw Error('The bounded allocation search needs its interval safety certificate.');seen.add(key);queue.push({layout:next,revealed:edge.revealed});
  }
 }
 return {initial,states:seen.size,transitions};
}

/** First try actual compact source widths. If any legal entry branch cannot
 * place its incoming intervals, grow only the pre-count-in frame. The final
 * bound proves all placements without enumerating an unbounded MIDI history:
 * M=max(width+maximum actual break), usable width=5M. Removing a pinned interval leaves
 * >=4M split across two sides, so their floor capacities hold >=3 M intervals.
 * A cyclic source cut supplies exactly that many intervals on each side. */
export function admitRefill(plan:PracticePlan,chunk:PracticeChunk,input:readonly RefillMeasure[],options:RefillAdmissionOptions={}):RefillCertificate {
 const edge=options.edge??5,breakGap=options.breakGap??8,maxStates=options.maxStates??defaultStateBound,measures=new Map(input.map(p=>[p.bar,{...p}]));
 if(!Number.isSafeInteger(maxStates)||maxStates<1)throw Error('The practice allocation search bound is invalid.');
 for(let bar=chunk.firstBar;bar<=chunk.lastBar;bar++){const p=measures.get(bar);if(!p||!Number.isFinite(p.width)||p.width<=0)throw Error(`Measure ${bar+1} has no valid source footprint.`);}
 const selected=input.filter(p=>p.bar>=chunk.firstBar&&p.bar<=chunk.lastBar),maximumGap=Math.max(breakGap,Math.max(...selected.map(p=>p.rightAir??0))+Math.max(...selected.map(p=>p.leftAir??0))+1.6),maximum=Math.max(...selected.map(p=>p.width+maximumGap)),safety=5*maximum+2*edge;
 const compact=selected.map(p=>p.width).sort((a,b)=>b-a).slice(0,4).reduce((sum,w)=>sum+w,0)+3*breakGap+2*edge;
 const upper=Math.min(safety,options.maxFrameWidth??safety),widths=Array.from({length:49},(_,i)=>compact+(upper-compact)*i/48);
 let reason='';
 for(const width of [...new Set(widths)].filter(width=>width>=compact-epsilon)){
  if(options.maxFrameWidth!==undefined&&width>options.maxFrameWidth+epsilon)break;
  const frame={width,edge,breakGap};
  try{const result=enumerate(plan,chunk,measures,frame,maxStates);return {frame,measures,rates:[5,500],proof:'enumerated',...result};}catch(error){reason=(error as Error).message;}
  if(Math.abs(width-safety)<epsilon)return {frame,measures,rates:[5,500],proof:'interval-bound',initial:initialLayout(plan,chunk,measures,frame),states:0,transitions:0};
 }
 throw Error(`The selected passage cannot be admitted at a readable size. ${reason}`.trim());
}

/** Assessment remains the owner of holds, sustain and matches. This function
 * only decides the reading reference. A timer cannot pass an unread attack;
 * an accepted first chord member can enter its bar before the written beat. */
export function readingBar(plan:PracticePlan,chunk:PracticeChunk,session:Pick<PracticeSession,'events'|'matched'|'elapsedTick'>,previous=chunk.firstBar):number {
 let bar=previous;
 for(const attack of session.events)if(session.matched.has(attack.id))bar=Math.max(bar,attack.bar);
 const unread=session.events.find(a=>!session.matched.has(a.id)),barrier=unread?.bar??chunk.lastBar+1;
 if(barrier<bar)throw Error('A later reading measure was entered before an earlier required attack.');
 // Give an accepted entry its own reading transaction before a late clock
 // may enter the following rest. This is the same source-prefix/rest graph
 // certified before count-in, rather than a timer skipping a just-read bar.
 if(bar>previous)return Math.min(chunk.lastBar,bar);
 for(let next=bar+1;next<barrier&&next<=chunk.lastBar;next++){
  if(plan.barTicks[next]>session.elapsedTick+epsilon)break;
  if(session.events.some(a=>a.bar===next))break;
  bar=next;
 }
 return Math.min(chunk.lastBar,bar);
}

/** A transient ledger. The certificate and layout never enter saved practice
 * data. Paused/manual modes keep the resident allocation and do not retire. */
export class PracticeRefill {
 layout:RefillLayout;readonly retired=new Set<number>();
 constructor(readonly plan:PracticePlan,readonly chunk:PracticeChunk,readonly certificate:RefillCertificate){this.layout=certificate.initial;}
 prime(){this.layout=this.certificate.initial;this.retired.clear();}
 get bars(){return this.layout.placements.map(p=>p.bar);}
 update(session:PracticeSession,connected:boolean):boolean {
  // Fingers is also a live presentation. Only an actual paused/preparation
  // phase freezes allocation; the annotation toggle cannot freeze reading.
  if(!connected||!session.measured||!['trial','countin'].includes(session.phase))return false;
  const current=readingBar(this.plan,this.chunk,session,this.layout.current);
  let layout=this.layout;
  // Rest-clock steps must receive their promised one-written-bar lead even
  // if one browser frame crosses several rest boundaries.
  while(layout.current<current){
   const direct=session.events.some(a=>a.bar===current&&session.matched.has(a.id)),next=direct?current:layout.current+1;
   const revealed=revealedHands(this.plan,session,next),bars=refillAllocationBars(this.plan,this.chunk,layout,next,revealed);
   layout=allocateRefill(layout,next,bars,this.certificate.measures,this.certificate.frame);
  }
  const revealed=revealedHands(this.plan,session,current),bars=refillAllocationBars(this.plan,this.chunk,layout,current,revealed);
  layout=allocateRefill(layout,current,bars,this.certificate.measures,this.certificate.frame);
  if(session.phase==='trial'||session.matched.size)for(const attack of session.carryIn)for(const group of attack.groups)this.retired.add(Number(group.split(':')[0]));
  for(let bar=this.chunk.firstBar;bar<current;bar++)if(session.events.filter(a=>a.bar===bar).every(a=>session.matched.has(a.id)))this.retired.add(bar);
  const changed=layout.epoch!==this.layout.epoch;this.layout=layout;return changed;
 }
 visibleGroups(visible:ReadonlySet<string>){return new Set([...visible].filter(id=>!this.retired.has(Number(id.split(':')[0]))));}
}
