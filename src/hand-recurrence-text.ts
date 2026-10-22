import {handProvenance,handRecurrences,type PersonalHand} from './personal-assignments';
import type {ScorePackage} from './package';
import type {PersonalState} from './state';

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
/** `hint` is said beside the note with its key shown as a key: lead, key, rest. */
export interface HandChoiceView {label?:string;description?:string;action?:{id:HandChoiceAction;label:string};hint?:{lead:string;key:string;rest:string}}
/** What the editor says about the selected note's hand: carried from another
 * bar, carried from here to matching bars, kept to this note alone, or moved
 * before hand changes were shared. Every action applies to this note. */
export function handChoiceView(p:ScorePackage,s:PersonalState,ownerId:string):HandChoiceView|undefined {
 const hand=handProvenance(p,s,ownerId);if(!hand)return;
 const name=handName(hand.hand);
 if(hand.kind==='carried'){const written=otherHand(hand.hand);return{label:`Hand from bar ${hand.fromBar}`,description:`${capital(name)}, as you chose for the same music in bar ${hand.fromBar}. Press ${handKey(written)} to give this note its written ${handName(written)}.`,action:{id:'hand-not-here',label:'Keep this note’s written hand'}};}
 if(hand.kind==='shared')return hand.toBars.length?{label:`Hand also in ${barList(hand.toBars)}`,description:`${capital(name)} here and in ${barList(hand.toBars)}: the same music.`,action:{id:'hand-only-here',label:'Don’t share this note’s hand'}}:undefined;
 if(hand.kind==='unshared')return{hint:{lead:'Moved before hand changes were shared. Press',key:handKey(hand.hand),rest:`to share it with ${barList(hand.toBars)}.`}};
 return{label:'Hand for this note only',description:`${capital(name)} for this note only.${hand.follows===undefined?'':` Bar ${hand.follows} has the same music.`}`,
  ...(hand.follows!==undefined?{action:{id:'hand-shared' as const,label:`Use bar ${hand.follows}’s hand`}}:p.score.notes.find(n=>n.id===ownerId)?.hand!==hand.hand?{action:{id:'hand-shared' as const,label:'Share this note’s hand'}}:{})};
}

/** Said after a hand decision: which matching bars now take it, which stopped,
 * and which it could not reach. The edited note says its own hand in the editor,
 * so it is left out. Undefined when no other bar changed. */
export function handCarryNotice(p:ScorePackage,before:PersonalState,after:PersonalState,edited?:string):string|undefined {
 const a=handRecurrences(p,before),b=handRecurrences(p,after);if(a===b)return;
 const gained=new Map<number,PersonalHand>(),lost=new Map<number,string[]>(),still=new Set([...b.carried.keys()].map(id=>barOf(p,id)));
 for(const [id,c] of b.carried)if(id!==edited&&a.carried.get(id)?.hand!==c.hand)gained.set(barOf(p,id),c.hand);
 for(const [id] of a.carried)if(id!==edited&&!b.carried.has(id))lost.set(barOf(p,id),[...lost.get(barOf(p,id))??[],id]);
 const known=new Set(a.skipped.map(s=>JSON.stringify(s))),skipped=b.skipped.filter(s=>!known.has(JSON.stringify(s)));
 const parts:string[]=[];
 for(const hand of ['RH','LH'] as const){const bars=[...gained].filter(([,h])=>h===hand).map(([bar])=>bar);if(bars.length)parts.push(`${capital(handName(hand))} also in ${barList(bars)}: the same music.`);}
 // A bar whose every note stopped following has its written hands again; otherwise name the notes that did.
 const whole=[...lost.keys()].filter(bar=>!gained.has(bar)&&!still.has(bar));if(whole.length)parts.push(`${capital(barList(whole))} ${whole.length===1?'keeps its':'keep their'} written hands again.`);
 for(const [bar,ids] of lost)if(!gained.has(bar)&&still.has(bar))parts.push(`In bar ${bar}, ${list(ids.map(id=>digitOf(p,id)))} ${ids.length===1?'is in its written hand':'are in their written hands'} again.`);
 const dropped=new Map<string,number[]>();for(const s of skipped)if(!(dropped.get(s.reason)??[]).includes(s.toBar))dropped.set(s.reason,[...dropped.get(s.reason)??[],s.toBar]);
 for(const [reason,bars] of dropped)parts.push(`${capital(barList(bars))} ${bars.length===1?'keeps its':'keep their'} written hands: ${reason}.`);
 return parts.length?parts.join(' '):undefined;
}

/** Said after an editor hand button, naming the note it applied to before the
 * bars it changed. */
export function handActionNotice(p:ScorePackage,before:PersonalState,after:PersonalState,ownerId:string,action:HandChoiceAction):string {
 const now=handProvenance(p,after,ownerId),was=handProvenance(p,before,ownerId),bar=barOf(p,ownerId),rest=handCarryNotice(p,before,after,ownerId);
 const with_=(lead:string)=>rest?`${lead} ${rest}`:lead;
 if(action==='hand-not-here'){
  const from=was?.kind==='carried'?was.fromBar:undefined,following=[...handRecurrences(p,after).carried.keys()].some(id=>barOf(p,id)===bar);
  const hand=p.score.notes.find(n=>n.id===ownerId)?.hand;
  return with_(`This note keeps its written ${hand?handName(hand as PersonalHand):'hand'}.${following&&from!==undefined?` The rest of bar ${bar} still follows bar ${from}.`:''}`);
 }
 if(action==='hand-only-here')return with_(`This note’s ${now?handName(now.hand):'hand'} stays in bar ${bar} only.`);
 if(now?.kind==='carried')return with_(`This note takes bar ${now.fromBar}’s ${handName(now.hand)} again.`);
 return with_(`This note’s ${now?handName(now.hand):'hand'} is shared with matching bars again.`);
}

/** Said when bars keep their written hands because the carried hand can't be
 * drawn there; `unshared` are those bars that lost the shared fingers with it. */
export function droppedCarryText(bars:readonly number[],unshared:readonly number[]=[]):string {
 const all=new Set(bars),lost=new Set(unshared.filter(bar=>all.has(bar)));
 if(all.size===1)return `${capital(barList(bars))} keeps its written hands${lost.size?', and its fingers stay unshared':''}: the carried hand can’t be drawn there.`;
 const fingers=!lost.size?'':lost.size===all.size?' Their fingers stay unshared.':` Fingers stay unshared in ${barList([...lost])}.`;
 return `${capital(barList(bars))} keep their written hands: the carried hands can’t be drawn there.${fingers}`;
}
