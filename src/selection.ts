import {requirePianoEvent} from './piano-event';
import type {ScorePackage,Seat} from './package';
/** One keyboard stop per physical contact, independent of SVG position or duplicate heads. */
export function editUnits(p:Pick<ScorePackage,'score'|'seats'>):Seat[]{
 const notes=new Map(p.score.notes.map(n=>[n.id,n]));
 const order=(a:Seat,b:Seat)=>a.writtenBar-b.writtenBar||(requirePianoEvent(notes.get(a.ownerIds[0])!).startTick-requirePianoEvent(notes.get(b.ownerIds[0])!).startTick)||(requirePianoEvent(notes.get(a.ownerIds[0])!).pitch.octave*12+requirePianoEvent(notes.get(a.ownerIds[0])!).pitch.pitchClass)-(requirePianoEvent(notes.get(b.ownerIds[0])!).pitch.octave*12+requirePianoEvent(notes.get(b.ownerIds[0])!).pitch.pitchClass)||requirePianoEvent(notes.get(a.ownerIds[0])!).hand.localeCompare(requirePianoEvent(notes.get(b.ownerIds[0])!).hand)||a.page-b.page||a.system-b.system||a.id.localeCompare(b.id);
 const seats=[...p.seats].sort((a,b)=>Number(!!a.continuation)-Number(!!b.continuation)||order(a,b)),seen=new Set<string>();
 return seats.filter(s=>{if(seen.has(s.contactId))return false;seen.add(s.contactId);return true;}).sort(order);
}
export const moveSelection=(index:number,step:number,length:number)=>Math.max(0,Math.min(length-1,index+step));
export function resumeSelection(p:Pick<ScorePackage,'score'|'seats'>,contactId:string|undefined,page:number):Seat{const units=editUnits(p);return units.find(s=>s.contactId===contactId)??units.find(s=>s.page>=page)??units[0];}

/** Initial Edit is anchored to the page being read, including visible held aliases. */
export function selectionOnPage(p:Pick<ScorePackage,'score'|'seats'>,contactId:string|undefined,page:number):Seat|undefined {
 const order=editUnits(p),rank=new Map(order.map((seat,index)=>[seat.contactId,index]));
 const visible=p.seats.filter(seat=>seat.page===page).sort((a,b)=>Number(!!a.continuation)-Number(!!b.continuation)||(rank.get(a.contactId)??0)-(rank.get(b.contactId)??0));
 return visible.find(seat=>seat.contactId===contactId)??visible[0];
}

/** Navigate the printed systems, including visible aliases of earlier contacts.
 * Source coordinates keep musical movement independent of screen rotation. */
export function systemSelection(p:Pick<ScorePackage,'score'|'seats'>,current:Seat,direction:-1|1):Seat {
 const order=editUnits(p),rank=new Map(order.map((seat,index)=>[seat.contactId,index]));
 const systems=new Map<string,Seat[]>();
 for(const seat of p.seats){if(!rank.has(seat.contactId))continue;const key=`${seat.page}:${seat.system}`,seats=systems.get(key)??[];seats.push(seat);systems.set(key,seats);}
 const rows=[...systems.values()].sort((a,b)=>a[0].page-b[0].page||a[0].system-b[0].system);
 const index=rows.findIndex(seats=>seats[0].page===current.page&&seats[0].system===current.system),target=rows[index+direction];
 if(index<0||!target)return current;
 return [...target].sort((a,b)=>Math.abs(a.x-current.x)-Math.abs(b.x-current.x)||Math.abs(a.baseline-current.baseline)-Math.abs(b.baseline-current.baseline)||(rank.get(a.contactId)!-rank.get(b.contactId)!)||a.id.localeCompare(b.id))[0];
}

/** Measures are written occurrences, not source attack owners: a held alias
 * remains a destination in the bar and page where it is printed. */
export function measureSelection(p:Pick<ScorePackage,'score'|'seats'>,current:Seat,direction:-1|1):Seat {
 const units=editUnits(p),rank=new Map(units.map((seat,index)=>[seat.contactId,index]));
 const bars=[...new Set(p.seats.filter(s=>rank.has(s.contactId)).map(s=>s.writtenBar))].sort((a,b)=>a-b);
 const bar=direction===1?bars.find(bar=>bar>current.writtenBar):bars.findLast(bar=>bar<current.writtenBar);
 if(bar===undefined)return current;
 return p.seats.filter(s=>s.writtenBar===bar&&rank.has(s.contactId)).sort((a,b)=>a.page-b.page||a.system-b.system||(rank.get(a.contactId)!-rank.get(b.contactId)!)||a.id.localeCompare(b.id))[0];
}
