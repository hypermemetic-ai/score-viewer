import type {PracticeChunk,PracticePlan,PracticeSession} from './practice';

/** Paused source windows include useful overlaps and literal leaf junctions. */
export function passageWindows(plan:PracticePlan,chunk:PracticeChunk):number[][] {
 const first=chunk.firstBar,lastStart=Math.max(first,chunk.lastBar-3),starts=new Set<number>([first,lastStart]);
 for(let bar=first;bar<=lastStart;bar+=2)starts.add(bar);
 for(const leaf of plan.chunks){if(leaf.firstBar<=first||leaf.firstBar>chunk.lastBar)continue;starts.add(Math.max(first,Math.min(lastStart,leaf.firstBar-2)));}
 return [...starts].sort((a,b)=>a-b).map(start=>Array.from({length:Math.min(4,chunk.lastBar-start+1)},(_,i)=>start+i));
}
/** Stable slot ownership is independent of the metronome and assessment clocks. */
export class PracticeSlots {
 readonly windows:number[][];bars:Array<number|undefined>;window=0;private next:number;private nextSlot=0;
 constructor(readonly plan:PracticePlan,readonly chunk:PracticeChunk){this.windows=passageWindows(plan,chunk);this.bars=[];this.next=chunk.firstBar;this.prime();}
 prime(){this.window=0;this.nextSlot=0;this.bars=Array.from({length:4},(_,i)=>this.chunk.firstBar+i<=this.chunk.lastBar?this.chunk.firstBar+i:undefined);this.next=this.chunk.firstBar+4;}
 turn(direction:1|-1){const next=Math.max(0,Math.min(this.windows.length-1,this.window+direction));if(next===this.window)return false;this.window=next;this.bars=Array.from({length:4},(_,i)=>this.windows[next][i]);return true;}
 showRange(first:number,last=first){const window=this.windows.findIndex(w=>w.includes(first)&&w.includes(last));if(window<0||this.bars.every((b,i)=>b===this.windows[window][i]))return false;this.window=window;this.bars=Array.from({length:4},(_,i)=>this.windows[window][i]);return true;}
 showBar(bar:number){this.window=Math.max(0,this.windows.findIndex(window=>window.includes(bar)));this.bars=Array.from({length:4},(_,i)=>this.windows[this.window][i]);}
 recycle(session:PracticeSession,connected:boolean,owners:ReadonlyMap<number,ReadonlySet<string>>){
  if(!connected||!session.measured||session.phase!=='trial'||session.inspection)return false;let changed=false;
  // Refill in reading order: after slot4 the pianist returns to slot1.
  // An unresolved earlier slot cannot be bypassed by later vacated slots.
  while(this.next<=this.chunk.lastBar){const slot=this.nextSlot,bar=this.bars[slot];
   if(bar===undefined||session.elapsedTick+1e-7<this.plan.barTicks[bar+1])break;
   const shown=owners.get(bar)??new Set<string>(),attacks=session.events.filter(a=>a.bar===bar),obligations=session.obligations.filter(a=>a.bar===bar||a.owners.some(id=>shown.has(id)));
   if(attacks.some(a=>!session.matched.has(a.id))||obligations.some(a=>a.end>session.elapsedTick+1e-7))break;
   this.bars[slot]=this.next++;this.nextSlot=(slot+1)%4;changed=true;
  }
  return changed;
 }
}
