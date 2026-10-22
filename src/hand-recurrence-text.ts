import {handProvenance,handRecurrences,type PersonalHand} from './personal-assignments';
import type {ScorePackage} from './package';
import type {PersonalState} from './state';

/** Tooltips spell the hand out; every line that stays on screen says RH or LH, as the pianist reads it. */
const handName=(hand:PersonalHand)=>hand==='LH'?'left hand':'right hand';
const capital=(text:string)=>text[0].toUpperCase()+text.slice(1);
const otherHand=(hand:PersonalHand):PersonalHand=>hand==='LH'?'RH':'LH';
const handKey=(hand:PersonalHand)=>hand==='LH'?'L':'R';
const list=(items:readonly string[])=>items.length<2?items.join(''):`${items.slice(0,-1).join(', ')} and ${items.at(-1)}`;
const barList=(bars:readonly number[])=>{const sorted=[...new Set(bars)].sort((a,b)=>a-b);return `${sorted.length===1?'bar':'bars'} ${list(sorted.map(String))}`;};
const barOf=(p:ScorePackage,id:string)=>{const n=p.score.notes.find(n=>n.id===id)!;return (p.score.sourceBarTicks??[]).findLastIndex(t=>t<=n.startTick)+1;};
/** A note as the reader names it: its digit on the page. */
const digitOf=(p:ScorePackage,id:string)=>p.seats.find(s=>s.ownerIds.includes(id))?.pitchDigit??'one note';

export type HandChoiceAction='hand-not-here'|'hand-only-here'|'hand-shared';
/** Words said in the editor bar; a `key` is drawn as a key. */
export type HandWords=readonly (string|{key:string})[];
/** The Hand row reads in order: `label`, its first line, leads with the hand
 * (RH or LH) and says where it comes from; `said`, only when a key does what no
 * button does, with its keys as keys; then the button, with its key when one
 * does the same. Nothing follows the button. `description` is the full
 * sentence for the label's tooltip and screen readers. */
export interface HandChoiceView {label:string;description:string;action?:{id:HandChoiceAction;label:string;key?:string};said:HandWords}
/** What the editor says about the selected note's hand: carried from another
 * bar, carried from here to matching bars, kept to this note alone, or not yet
 * shared with the matching bars it would reach (R shares it). Every action
 * applies to this note. */
export function handChoiceView(p:ScorePackage,s:PersonalState,ownerId:string):HandChoiceView|undefined {
 const hand=handProvenance(p,s,ownerId);if(!hand)return;
 const name=handName(hand.hand);
 if(hand.kind==='carried'){const written=otherHand(hand.hand);return{label:`${hand.hand} · from bar ${hand.fromBar}`,description:`${capital(name)}, as you chose for the same music in bar ${hand.fromBar}. Press ${handKey(written)} to give this note its written ${handName(written)}.`,action:{id:'hand-not-here',label:`Keep its written ${written}`,key:handKey(written)},said:[]};}
 if(hand.kind==='shared')return hand.toBars.length?{label:`${hand.hand} · also in ${barList(hand.toBars)}`,description:`${capital(name)} here and in ${barList(hand.toBars)}: the same music.`,action:{id:'hand-only-here',label:'Don’t share this note’s hand'},said:[]}:undefined;
 if(hand.kind==='unshared')return{label:hand.hand,description:`${capital(name)}. Press ${handKey(hand.hand)} to share it with ${barList(hand.toBars)}: the same music.`,said:['Press ',{key:handKey(hand.hand)},` to share it with ${barList(hand.toBars)}.`]};
 const follows=hand.follows===undefined?'':` Bar ${hand.follows} has the same music.`;
 return{label:`${hand.hand} · this note only`,description:`${capital(name)} for this note only.${follows}`,said:[],
  ...(hand.follows!==undefined?{action:{id:'hand-shared' as const,label:`Use bar ${hand.follows}’s hand`}}:p.score.notes.find(n=>n.id===ownerId)?.hand!==hand.hand?{action:{id:'hand-shared' as const,label:'Share this note’s hand'}}:{})};
}

/** Said after a hand decision: which matching bars now take it, which stopped,
 * and which it could not reach. The edited note says its own hand in the editor,
 * so it is left out; while it stays selected (`shown`), so are the bars its Hand
 * row names. Undefined when nothing else changed. */
export function handCarryNotice(p:ScorePackage,before:PersonalState,after:PersonalState,edited?:string,shown=false):string|undefined {
 const a=handRecurrences(p,before),b=handRecurrences(p,after);if(a===b)return;
 const gained=new Map<number,PersonalHand>(),lost=new Map<number,string[]>(),still=new Set([...b.carried.keys()].map(id=>barOf(p,id)));
 for(const [id,c] of b.carried)if(id!==edited&&a.carried.get(id)?.hand!==c.hand)gained.set(barOf(p,id),c.hand);
 for(const [id] of a.carried)if(id!==edited&&!b.carried.has(id))lost.set(barOf(p,id),[...lost.get(barOf(p,id))??[],id]);
 const known=new Set(a.skipped.map(s=>JSON.stringify(s))),skipped=b.skipped.filter(s=>!known.has(JSON.stringify(s)));
 const named=new Set(shown&&edited?(()=>{const now=handProvenance(p,after,edited);return now?.kind==='shared'?now.toBars:[];})():[]);
 const parts:string[]=[];
 for(const hand of ['RH','LH'] as const){const bars=[...gained].filter(([bar,h])=>h===hand&&!named.has(bar)).map(([bar])=>bar);if(bars.length)parts.push(`${hand} also in ${barList(bars)}: the same music.`);}
 // A bar whose every note stopped following has its written hands again; otherwise name the notes that did.
 const whole=[...lost.keys()].filter(bar=>!gained.has(bar)&&!still.has(bar));if(whole.length)parts.push(`${capital(barList(whole))} ${whole.length===1?'keeps its':'keep their'} written hands again.`);
 for(const [bar,ids] of lost)if(!gained.has(bar)&&still.has(bar))parts.push(`In bar ${bar}, ${list(ids.map(id=>digitOf(p,id)))} ${ids.length===1?'is in its written hand':'are in their written hands'} again.`);
 const dropped=new Map<string,number[]>();for(const s of skipped)if(!(dropped.get(s.reason)??[]).includes(s.toBar))dropped.set(s.reason,[...dropped.get(s.reason)??[],s.toBar]);
 for(const [reason,bars] of dropped)parts.push(`${capital(barList(bars))} ${bars.length===1?'keeps its':'keep their'} written hands: ${reason}.`);
 return parts.length?parts.join(' '):undefined;
}

/** Said after L or R: when the note now follows a matching bar again, it is
 * named first, since the selection moves on; then the other bars it changed.
 * When the note stays selected (`shown`), its Hand row says its own part. */
export function handKeyNotice(p:ScorePackage,before:PersonalState,after:PersonalState,ownerId:string,shown=false):string|undefined {
 const now=handRecurrences(p,after).carried.get(ownerId),rest=handCarryNotice(p,before,after,ownerId,shown);
 if(shown||!now||handRecurrences(p,before).carried.has(ownerId))return rest;
 const lead=`In bar ${barOf(p,ownerId)}, ${digitOf(p,ownerId)} takes bar ${now.fromBar}’s ${now.hand} again.`;
 return rest?`${lead} ${rest}`:lead;
}

/** Said after an editor hand button. The note stays selected and its Hand row
 * shows what it now has, so only the bars it changed are said, and the rest of
 * its bar when that still follows another. Undefined when nothing else changed. */
export function handActionNotice(p:ScorePackage,before:PersonalState,after:PersonalState,ownerId:string,action:HandChoiceAction):string|undefined {
 const was=handProvenance(p,before,ownerId),bar=barOf(p,ownerId),rest=handCarryNotice(p,before,after,ownerId,true);
 const from=action==='hand-not-here'&&was?.kind==='carried'?was.fromBar:undefined,following=from!==undefined&&[...handRecurrences(p,after).carried.keys()].some(id=>barOf(p,id)===bar);
 const parts=[...following?[`The rest of bar ${bar} still follows bar ${from}.`]:[],...rest?[rest]:[]];
 return parts.length?parts.join(' '):undefined;
}

/** Said when bars keep their written hands because the carried hand can't be drawn there. */
export function droppedCarryText(bars:readonly number[]):string {
 return `${capital(barList(bars))} ${new Set(bars).size===1?'keeps its written hands: the carried hand':'keep their written hands: the carried hands'} can’t be drawn there.`;
}
