import {requirePianoEvent} from './piano-event';
import {DOMParser} from '@xmldom/xmldom';
import type {ScorePackage,Seat} from './package';

export interface FingerCarrier {id:string;x:number;direction:-1|1;edge:number;stemIds:string[];associatedStemIds:string[];kind:'stem'|'head'}
type Box=[number,number,number,number];
interface Head {seat:Seat;element:Element;column:number;box:Box;tick:number;release:number;hand:string;pitch:number;voices:string}
interface Stem {id:string;element:Element;x:number;low:number;high:number;start?:number;end?:number;width:number;heads:Head[]}
const number=(el:Element,key:string)=>Number(el.getAttribute(key));
const has=(el:Element,cls:string)=>(el.getAttribute('class')??'').split(/\s+/).includes(cls);
const descendants=(el:Element)=>Array.from(el.getElementsByTagName('*')) as unknown as Element[];
const close=(a:number,b:number)=>Math.abs(a-b)<=.025; // SVG's two-decimal projection.
function ancestor(el:Element,predicate:(el:Element)=>boolean):Element|undefined {
 for(let p:Node|null=el;p?.nodeType===1;p=p.parentNode)if(predicate(p as Element))return p as Element;
}
function pathPoints(el:Element):Array<[number,number]> {
 const values=(el.getAttribute('d')??'').match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi)?.map(Number)??[];
 return Array.from({length:Math.floor(values.length/2)},(_,i)=>[values[2*i],values[2*i+1]]);
}
function pathBox(el:Element):Box|undefined {
 const p=pathPoints(el);if(!p.length)return;
 const half=el.hasAttribute('stroke-width')?number(el,'stroke-width')/2:0;
 return [Math.min(...p.map(p=>p[0]))-half,Math.min(...p.map(p=>p[1]))-half,Math.max(...p.map(p=>p[0]))+half,Math.max(...p.map(p=>p[1]))+half];
}
function beamYs(el:Element,x:number):number[] {
 // Filled real-engine beams use closed M/L polygons. Intersect the actual
 // polygon at this stem's column; another stem's higher end is not its edge.
 if(!/^[MLZ\s\d.,eE+\-]+$/.test(el.getAttribute('d')??''))return [];
 const points=pathPoints(el),ys:number[]=[];
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];
  if(x<Math.min(a[0],b[0])-.025||x>Math.max(a[0],b[0])+.025)continue;
  if(close(a[0],b[0])){ys.push(a[1],b[1]);continue;}
  const t=Math.max(0,Math.min(1,(x-a[0])/(b[0]-a[0])));ys.push(a[1]+t*(b[1]-a[1]));
 }
 return ys;
}
function sameGesture(a:Head,b:Head):boolean {
 return a.seat.system===b.seat.system&&a.hand===b.hand&&a.voices===b.voices&&
  (a.seat.continuation&&b.seat.continuation?a.seat.writtenBar===b.seat.writtenBar&&a.release===b.release:a.tick===b.tick&&a.release===b.release);
}
/** Resolve attachment incidence from frozen, source-linked head slots. This is
 * not a nearest-stem search: an eligible stem must leave this head's actual
 * protected face on its nominal column or bounded side attachment. */
function attachment(head:Head,stem:Stem,branched=false):(-1|1)|undefined {
 const em=head.seat.fontSize*4/3,box=head.box;
 if(stem.x<box[0]-.7||stem.x>box[2]+.7)return;
 const explicit=(stem.element.getAttribute('data-owner-ids')??'').split('|').some(id=>head.seat.ownerIds.includes(id));
 const side=close(stem.x,head.column)||explicit||branched||[box[0],box[2],box[0]+stem.width/2,box[2]-stem.width/2].some(x=>close(stem.x,x));
 if(!side)return;
 const directions=stem.start===undefined?[-1,1] as const:[Math.sign(stem.end!-stem.start) as -1|1];
 for(const direction of directions){
  const start=stem.start??(direction===-1?stem.high:stem.low),face=direction===-1?box[1]:box[3],air=(start-face)*direction;
  // Honor halos and ordinary rectangular slots have different attachment air.
  // Both are local to this source head, rather than a free distance ranking.
  if(air>=-.025&&air<=em*.7+.025&&(direction===-1?stem.low<box[1]:stem.high>box[3]))return direction;
 }
}
function stemEnvelope(stem:Stem,direction:-1|1,system:Element,em:number):number {
 const ends=[direction===-1?stem.low:stem.high];
 const beam=ancestor(stem.element,el=>has(el,'janko-beam-group'));
 if(beam)for(const el of descendants(beam))if((el.getAttribute('class')??'').split(/\s+/).some(c=>c.startsWith('janko-beam')&&c!=='janko-beam-group'))ends.push(...beamYs(el,stem.x));
 for(const el of descendants(system)){
  if(el.hasAttribute('data-stem-x')&&close(number(el,'data-stem-x'),stem.x)){
   const box=pathBox(el);
   // Repeated columns elsewhere in the system have distinct carrier tips.
   if(box&&box[1]<=stem.high+em*.2&&box[3]>=stem.low-em*.2)ends.push(box[1],box[3]);
  }else if(has(el,'janko-stem-ring')&&close(number(el,'cx'),stem.x)){
   const r=number(el,'r')+number(el,'stroke-width')/2,y=number(el,'cy');
   if(y+r>=stem.low-.025&&y-r<=stem.high+.025)ends.push(y-r,y+r);
  }
 }
 return direction===-1?Math.min(...ends):Math.max(...ends);
}

type PageCarrier=readonly [string,FingerCarrier];
const carrierPages=new Map<string,readonly PageCarrier[]>();
const maximumCarrierPages=12,maximumCarrierKeyUnits=4_000_000;
let carrierKeyUnits=0;
/** Encode only plain own data, with exact type tags and signed zero. Unknown
 * prototypes, getters, serializers and cycles retain the original traversal. */
function carrierData(value:unknown,skipPersonal=false,seen=new Set<object>(),depth=0):string|undefined {
 if(value===null)return 'l';if(value===undefined)return 'u';
 if(typeof value==='string')return 's'+JSON.stringify(value);
 if(typeof value==='boolean')return value?'b1':'b0';
 if(typeof value==='number')return Number.isFinite(value)?'n'+(Object.is(value,-0)?'-0':String(value)):undefined;
 if(typeof value!=='object'||depth>16||seen.has(value)||'toJSON' in value)return;
 const array=Array.isArray(value),prototype=Object.getPrototypeOf(value);
 if(prototype!==(array?Array.prototype:Object.prototype))return;
 const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(value);
 if(keys.some(k=>typeof k!=='string'||!('value' in descriptors[k])||!descriptors[k].enumerable&&!(array&&k==='length'))||
  array&&(keys.length!==(value as unknown[]).length+1||Array.from({length:(value as unknown[]).length},(_,i)=>i).some(i=>!Object.hasOwn(descriptors,i))))return;
 seen.add(value);const parts:string[]=[];
 try{for(const key of keys as string[]){if(array&&key==='length'||skipPersonal&&key==='personalHand')continue;
   const encoded=carrierData(descriptors[key].value,false,seen,depth+1);if(encoded===undefined)return;
   parts.push(JSON.stringify(key)+':'+encoded);
  }return (array?'a[':'o{')+parts.join(',')+(array?']':'}');
 }finally{seen.delete(value);}
}
function carrierPageKey(page:number,svg:string,seats:readonly Seat[],notes:ReadonlyMap<string,ScorePackage['score']['notes'][number]>):string|undefined {
 if(typeof svg!=='string')return;
 const seatData=carrierData(seats);if(seatData===undefined)return;
 const owners:string[]=[];
 for(const seat of seats)for(const id of seat.ownerIds){const data=carrierData(notes.get(id),true);if(data===undefined)return;owners.push(JSON.stringify(id)+':'+data);}
 const key=page+':'+JSON.stringify(svg)+':'+seatData+':'+owners.join(',');return key.length<=maximumCarrierKeyUnits?key:undefined;
}
const detachCarrier=(c:FingerCarrier):FingerCarrier=>({...c,stemIds:[...c.stemIds],associatedStemIds:[...c.associatedStemIds]});
function rememberCarrierPage(key:string,page:ReadonlyMap<string,FingerCarrier>):void {
 const entries=[...page].map(([id,c])=>{const owned=detachCarrier(c);Object.freeze(owned.stemIds);Object.freeze(owned.associatedStemIds);Object.freeze(owned);return Object.freeze([id,owned] as const);});
 carrierPages.set(key,Object.freeze(entries));carrierKeyUnits+=key.length;
 while(carrierPages.size>maximumCarrierPages||carrierKeyUnits>maximumCarrierKeyUnits){const oldest=carrierPages.keys().next().value!;carrierPages.delete(oldest);carrierKeyUnits-=oldest.length;}
}

/** Every package keeps its own SVG and source/contact identities. No saved
 * geometry certificate, package migration or score rendering is performed. */
export function fingeringCarriers(p:Pick<ScorePackage,'seats'|'score'|'pages'>):Map<string,FingerCarrier>{
 const result=new Map<string,FingerCarrier>(),notes=new Map(p.score.notes.map(n=>[n.id,n]));
 // Selection order and last-by-id note resolution remain the original ones.
 // Do not inspect accessors/custom seat collections merely to establish cache reuse.
 const seatDescriptors=Object.getOwnPropertyDescriptors(p.seats),seatKeys=Reflect.ownKeys(p.seats);
 const plainSeats=Array.isArray(p.seats)&&Object.getPrototypeOf(p.seats)===Array.prototype&&
  seatKeys.length===p.seats.length+1&&Array.from({length:p.seats.length},(_,i)=>i).every(i=>{
   const descriptor=seatDescriptors[i];if(!descriptor||!('value' in descriptor))return false;
   const s=descriptor.value;if(!s||Object.getPrototypeOf(s)!==Object.prototype)return false;
   const own=Object.getOwnPropertyDescriptors(s);return Reflect.ownKeys(s).every(k=>typeof k==='string'&&own[k].enumerable&&'value' in own[k]);
  });
 for(const [page,svg]of p.pages.entries()){
  const key=plainSeats?carrierPageKey(page,svg,p.seats.filter(s=>s.page===page),notes):undefined,saved=key===undefined?undefined:carrierPages.get(key);
  if(saved){carrierPages.delete(key!);carrierPages.set(key!,saved);for(const [id,c]of saved)result.set(id,detachCarrier(c));continue;}
  const pageResult=new Map<string,FingerCarrier>();
  const doc=new DOMParser().parseFromString(svg,'image/svg+xml');
  const all=Array.from(doc.getElementsByTagName('*')) as unknown as Element[];
  for(const systemId of new Set(p.seats.filter(s=>s.page===page).map(s=>s.system))){
   const system=all.find(el=>el.getAttribute('id')===`system-${systemId+1}`)??doc.documentElement as unknown as Element;
   const elements=descendants(system),heads:Head[]=p.seats.filter(s=>s.page===page&&s.system===systemId).map(seat=>{
    const element=elements.find(el=>el.getAttribute('data-viewer-seat')===seat.id)!;
    if(!element)throw Error('Frozen annotation seat missing: '+seat.id);
    const group=element.parentNode as Element;
    let previous=element.previousSibling;while(previous&&previous.nodeType!==1)previous=previous.previousSibling;
    const rect=has(group,'janko-reading-head')?descendants(group).find(el=>has(el,'janko-knockout')):previous?.nodeType===1&&has(previous as Element,'janko-knockout')?previous as Element:undefined;
    const em=seat.fontSize*4/3,box:Box=rect?[number(rect,'x'),number(rect,'y'),number(rect,'x')+number(rect,'width'),number(rect,'y')+number(rect,'height')]:[seat.x-em*.4,seat.baseline-em*.8,seat.x+em*.4,seat.baseline+em*.15];
    const note=requirePianoEvent(notes.get(seat.ownerIds[0])!);
    return {seat,element:group,column:group.hasAttribute('data-note-x')?number(group,'data-note-x'):seat.x,box,tick:note.startTick,release:note.startTick+note.durationTicks,hand:note.hand,pitch:note.pitch.octave*12+note.pitch.pitchClass,voices:JSON.stringify(note.sourceProvenance?.voices??[note.voice??null])};
   });
   const stems:Stem[]=elements.filter(el=>has(el,'janko-stem')||has(el,'janko-hollow-stem')).flatMap((element,index)=>{
    if(has(element,'janko-hollow-stem')){
     // The canonical closed rim's rectangle coordinates lie on the stroke
     // centerline. Its full exterior, not its white interior or head fallback,
     // is the actual duration carrier. Ownership still uses head incidence.
     if(element.localName!=='rect'||element.hasAttribute('transform')||!['half','whole'].includes(element.getAttribute('data-long-value')??''))return [];
     const keys=['x','y','width','height','stroke-width'];
     if(keys.some(key=>!element.getAttribute(key)?.trim()))return [];
     const [x,y,w,h,width]=keys.map(key=>number(element,key));
     if(![x,y,w,h,width].every(Number.isFinite)||width<=0||w<=width||h<=width)return [];
     return [{id:`${page}:${systemId}:stem-${index}`,element,x:x+w/2,low:y-width/2,high:y+h+width/2,width,heads:[]}];
    }
    const line=element.localName==='line',points=line?[[number(element,'x1'),number(element,'y1')],[number(element,'x2'),number(element,'y2')]]:pathPoints(element);
    if(!points.length)return [];
    const xs=points.map(v=>v[0]),ys=points.map(v=>v[1]);
    return [{id:`${page}:${systemId}:stem-${index}`,element,x:(Math.min(...xs)+Math.max(...xs))/2,low:Math.min(...ys),high:Math.max(...ys),...(line?{start:points[0][1],end:points[1][1]}:{}),width:number(element,'stroke-width')||.9,heads:[]}];
   });
   const owned=new Map(heads.map(head=>[head,[] as Array<{stem:Stem;direction:-1|1}>]));
   const branched=(head:Head,stem:Stem)=>head.seat.ownerIds.length>1&&stem.start!==undefined&&stem.x>=head.box[0]-.025&&stem.x<=head.box[2]+.025&&stems.some(other=>other!==stem&&other.start!==undefined&&close(other.start,stem.start!)&&close((stem.x+other.x)/2,head.column)&&Math.sign(other.end!-other.start!)===Math.sign(stem.end!-stem.start!));
   for(const stem of stems){
    const explicit=(stem.element.getAttribute('data-owner-ids')??'').split('|').filter(Boolean);
    const incident=heads.flatMap(head=>{const direction=attachment(head,stem,branched(head,stem));return direction!==undefined&&(!explicit.length||head.seat.ownerIds.some(id=>explicit.includes(id)))?[{head,direction}]:[];});
    // Independent heads on the same column remain separate; an attachment
    // ambiguity must not be resolved by choosing whichever is nearer.
    if(incident.length===1){const {head,direction}=incident[0];stem.heads.push(head);owned.get(head)!.push({stem,direction});}
    else if(incident.length>1&&incident.every(i=>sameGesture(i.head,incident[0].head))){for(const {head,direction}of incident){stem.heads.push(head);owned.get(head)!.push({stem,direction});}}
   }
   const bridges=elements.filter(el=>el.hasAttribute('data-bridge-notes')).map(el=>(el.getAttribute('data-bridge-notes')??'').split(','));
   // A suppressed compatible chord member can follow a proven carrier of the
   // same onset/value/hand/column. Explicit bridge ownership also admits the
   // engine's displaced chord columns. Existing independent stems win.
   for(const head of heads)if(!owned.get(head)!.length){
    const partners=heads.filter(other=>other!==head&&owned.get(other)!.length&&
     (sameGesture(head,other)&&close(head.column,other.column)||head.seat.writtenBar===other.seat.writtenBar&&bridges.some(ids=>head.seat.ownerIds.some(id=>ids.includes(id))&&other.seat.ownerIds.some(id=>ids.includes(id)))));
    const choices=new Map(partners.flatMap(other=>owned.get(other)!.map(c=>[c.stem.id,c] as const)));
    if(choices.size===1){const carrier=[...choices.values()][0];owned.get(head)!.push(carrier);carrier.stem.heads.push(head);}
   }
   for(const head of heads){
    const associated=owned.get(head)!,directions=new Set(associated.map(c=>c.direction));
    // An opposed engraved alias keeps both vector branches. The single
    // performing contact follows its established performing-hand branch.
    const primaryDirection=head.hand==='RH'?-1:1,carriers=directions.size>1?associated.filter(c=>c.direction===primaryDirection):associated;
    if(carriers.length){
     const direction=carriers[0].direction,edges=carriers.map(c=>stemEnvelope(c.stem,direction,system,head.seat.fontSize*4/3));
     // An aliased contact may retain several independent duration branches.
     const representative=[...carriers].sort((a,b)=>a.stem.id.localeCompare(b.stem.id))[0].stem;
     pageResult.set(head.seat.id,{id:carriers.map(c=>c.stem.id).sort().join('|'),x:representative.x,direction,edge:direction===-1?Math.min(...edges):Math.max(...edges),stemIds:carriers.map(c=>c.stem.id).sort(),associatedStemIds:associated.map(c=>c.stem.id).sort(),kind:'stem'});
    }else{
     // Stemless symbols are anchored to their own source-linked head. Never
     // borrow an unrelated stem, and never refuse annotations for crowding.
     const direction=head.hand==='RH'?-1:1;
     pageResult.set(head.seat.id,{id:`${page}:${systemId}:head-${head.seat.id}`,x:head.column,direction,edge:direction===-1?head.box[1]:head.box[3],stemIds:[],associatedStemIds:[],kind:'head'});
    }
   }
  }
  if(key!==undefined)rememberCarrierPage(key,pageResult);
  for(const [id,c]of pageResult)result.set(id,c);
 }
 return result;
}
