import {handProvenance,handRecurrences,type PersonalHand} from './personal-assignments';
import type {ScorePackage} from './package';
import type {PersonalState} from './state';

const handName=(hand:PersonalHand)=>hand==='LH'?'Left hand':'Right hand';
const barList=(bars:readonly number[])=>{const list=[...new Set(bars)].sort((a,b)=>a-b);return list.length===1?`bar ${list[0]}`:`bars ${list.slice(0,-1).join(', ')} and ${list.at(-1)}`;};

export interface HandChoiceView {label:string;description:string;action?:{id:'hand-not-here'|'hand-only-here'|'hand-shared';label:string}}
/** What the editor says about the selected note's hand: carried from another
 * bar, carried from here to matching bars, or kept to this bar alone. */
export function handChoiceView(p:ScorePackage,s:PersonalState,ownerId:string):HandChoiceView|undefined {
 const hand=handProvenance(p,s,ownerId);if(!hand)return;
 const name=handName(hand.hand);
 if(hand.kind==='carried')return{label:`Hand from bar ${hand.fromBar}`,description:`${name}, as you chose in bar ${hand.fromBar}: the same music. L or R makes this note an exception.`,action:{id:'hand-not-here',label:'Not here'}};
 if(hand.kind==='shared')return hand.toBars.length?{label:`Hand also in ${barList(hand.toBars)}`,description:`${name} here and in ${barList(hand.toBars)}: the same music.`,action:{id:'hand-only-here',label:'Only here'}}:undefined;
 return{label:'Hand here only',description:`${name} in this bar only.${hand.follows===undefined?'':` Bar ${hand.follows} has the same music.`}`,
  ...(hand.follows!==undefined?{action:{id:'hand-shared' as const,label:`Use bar ${hand.follows}’s hand`}}:p.score.notes.find(n=>n.id===ownerId)?.hand!==hand.hand?{action:{id:'hand-shared' as const,label:'Use for matching bars'}}:{})};
}

/** Said after a hand decision: which matching bars now take it, which stopped,
 * and which it could not reach. The edited note says its own hand in the editor,
 * so it is left out. Undefined when no other bar changed. */
export function handCarryNotice(p:ScorePackage,before:PersonalState,after:PersonalState,edited?:string):string|undefined {
 const a=handRecurrences(p,before),b=handRecurrences(p,after);if(a===b)return;
 const bars=p.score.sourceBarTicks??[],barOf=(id:string)=>{const n=p.score.notes.find(n=>n.id===id)!;return bars.findLastIndex(t=>t<=n.startTick)+1;};
 const gained=new Map<number,PersonalHand>(),lost=new Map<number,number>(),still=new Set([...b.carried.keys()].map(barOf));
 for(const [id,c] of b.carried)if(id!==edited&&a.carried.get(id)?.hand!==c.hand)gained.set(barOf(id),c.hand);
 for(const [id] of a.carried)if(id!==edited&&!b.carried.has(id))lost.set(barOf(id),(lost.get(barOf(id))??0)+1);
 const known=new Set(a.skipped.map(s=>JSON.stringify(s))),skipped=b.skipped.filter(s=>!known.has(JSON.stringify(s)));
 const parts:string[]=[];
 for(const hand of ['RH','LH'] as const){const list=[...gained].filter(([,h])=>h===hand).map(([bar])=>bar);if(list.length)parts.push(`${handName(hand)} also in ${barList(list)}: the same music.`);}
 // A bar whose every note stopped following has its own hands again; otherwise name how many notes did.
 const kept=[...lost.keys()].filter(bar=>!gained.has(bar)&&!still.has(bar));if(kept.length)parts.push(`${barList(kept).replace(/^b/,'B')} ${kept.length===1?'keeps its':'keep their'} own hands again.`);
 for(const [bar,count] of lost)if(!gained.has(bar)&&still.has(bar))parts.push(`Bar ${bar}: ${count===1?'one note keeps its':`${count} notes keep their`} own hand again.`);
 for(const s of skipped)parts.push(`Not carried to bar ${s.toBar}: ${s.reason}.`);
 return parts.length?parts.join(' '):undefined;
}
