import type {ScorePackage,Seat} from './package';
/** One keyboard stop per physical contact, independent of SVG position or duplicate heads. */
export function editUnits(p:Pick<ScorePackage,'score'|'seats'>):Seat[]{
 const notes=new Map(p.score.notes.map(n=>[n.id,n]));
 const order=(a:Seat,b:Seat)=>a.writtenBar-b.writtenBar||(notes.get(a.ownerIds[0])!.startTick-notes.get(b.ownerIds[0])!.startTick)||(notes.get(a.ownerIds[0])!.pitch.octave*12+notes.get(a.ownerIds[0])!.pitch.pitchClass)-(notes.get(b.ownerIds[0])!.pitch.octave*12+notes.get(b.ownerIds[0])!.pitch.pitchClass)||notes.get(a.ownerIds[0])!.hand.localeCompare(notes.get(b.ownerIds[0])!.hand)||a.page-b.page||a.system-b.system||a.id.localeCompare(b.id);
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
