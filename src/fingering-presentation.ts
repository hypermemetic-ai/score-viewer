import {requirePitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import {digitMetrics,type ScorePackage,type Seat} from './package';
import type {FingerPresentation} from './input';
import {fingeringCarriers,type FingerCarrier} from './fingering-carriers';
import {actualPageObstacles,boxesOverlap,type AnnotationBox} from './svg-annotation-clearance';
import {annotationInkPolicyFor,assertAnnotationInkPolicyReady} from './annotation-ink-policy';

/** Page-coordinate overlay constants, shared by reader and practice. */
export const ANNOTATION_SIZE_RATIO=.68;
export const ANNOTATION_COLOR='#56788f';
export interface AnnotationPosition {x:number;baseline:number;fontSize:number;bounds:[number,number,number,number];carrier:FingerCarrier}
const ns='http://www.w3.org/2000/svg';
const attribute=(el:Element,key:string,value:string)=>{if(el.getAttribute(key)!==value)el.setAttribute(key,value);};
const cache=new WeakMap<object,Map<string,AnnotationPosition>>();
const pageCache=new WeakMap<object,Map<number,Map<string,AnnotationPosition>>>();
/** Keep the complete stack inside its original source column's reading space.
 * Personal readings prefer the nearest clear row, then the smallest x shift;
 * retained editions preserve their original exact-column preference.
 * Candidate boundaries come from actual obstacles, not guessed text widths. */
export function affiliatedAnnotationPosition(input:{x:number;top:number;direction:-1|1;gap:number;height:number;em:number;
 width:[number,number];columns:readonly number[];page:{width:number;height:number;boxes:AnnotationBox[];curves?:ReadonlyArray<readonly(readonly[number,number])[]|undefined>};occupied:AnnotationBox[];preferNearest?:boolean;admitOwnColumn?:boolean}):{x:number;top:number}|undefined{
 const {x,top,direction,gap,height,em,width,columns,page,occupied}=input,lower=columns.filter(c=>c<x),upper=columns.filter(c=>c>x),
  left=lower.length?(Math.max(...lower)+x)/2:0,right=upper.length?(Math.min(...upper)+x)/2:page.width,ink=[...page.boxes,...occupied];
 let min=Math.max(x-em/2,left-width[0],-width[0]),max=Math.min(x+em/2,right-width[1],page.width-width[1]);
 // Columns closer than the digit is wide leave no space between their
 // midpoints; the note's own column remains its own reading space.
 if(input.admitOwnColumn){min=Math.min(min,x);max=Math.max(max,x);}
 let best:{x:number;top:number}|undefined;
 for(let step=0;step<=32;step++){const y=top+direction*step*gap/2;if(y<0||y+height>page.height)continue;
  const relevant=ink.filter(b=>y<b[3]+.2&&y+height>b[1]-.2),candidates=[x,min,max,
   ...relevant.flatMap(b=>[b[0]-.2-width[1]-1e-7,b[2]+.2-width[0]+1e-7])].filter(c=>c>=min&&c<=max);
  for(const candidate of candidates){const b:AnnotationBox=[candidate+width[0],y,candidate+width[1],y+height];
   if(relevant.some(other=>boxesOverlap(b,other)))continue;
   if(!best||Math.abs(candidate-x)<Math.abs(best.x-x))best={x:candidate,top:y};
  }
  // Personal edits preserve attachment proximity: a small local horizontal
  // clearance must not lose to an exact column tens of units above the note.
  // Retained calculated editions keep their original placement policy.
  if(best&&(input.preferNearest||best.x===x))break;
 }
 return best;
}
type AnnotationRequest=Parameters<typeof affiliatedAnnotationPosition>[0];
/** R-fingering-display. A finger whose seat at its stem end is taken only by
 * the end of a slur or tie arriving there drops along the stem's axis, up to
 * one gap, clear of the curve: beside a curve's end it would read as part of
 * the curve. Any other ink at the seat, or no clear drop, leaves the ordinary
 * search to place it. */
export function curveEndDrop(input:AnnotationRequest):{x:number;top:number}|undefined{
 const {x,top,direction,gap,height,width,page,occupied}=input,curves=page.curves,seat=(y:number):AnnotationBox=>[x+width[0],y,x+width[1],y+height];
 if(!curves)return;
 const blocking=page.boxes.flatMap((b,i)=>boxesOverlap(seat(top),b)?[i]:[]);
 if(!blocking.length||occupied.some(b=>boxesOverlap(seat(top),b)))return;
 const atSeat=([ex,ey]:readonly[number,number])=>ex>=x+width[0]-gap&&ex<=x+width[1]+gap&&ey>=top-1.5*gap&&ey<=top+height+1.5*gap;
 if(!blocking.every(i=>curves[i]?.some(atSeat)))return;
 const ink=[...page.boxes,...occupied];
 for(let step=1;step<=2;step++){const y=top+direction*step*gap/2;if(y<0||y+height>page.height)return;
  if(!ink.some(b=>boxesOverlap(seat(y),b)))return {x,top:y};}
 return;
}
/** A personal reading always shows the finger. When no clear air exists in the
 * note's own reading space, keep the note's own column even where neighbouring
 * columns crowd it, and failing that take the step with the least ink beneath
 * the digits, nearest the note on a tie. */
export function personalAnnotationPosition(input:AnnotationRequest):{x:number;top:number}{
 const clear=affiliatedAnnotationPosition(input)??affiliatedAnnotationPosition({...input,admitOwnColumn:true});if(clear)return clear;
 const {x,top,direction,gap,height,width,page,occupied}=input,ink=[...page.boxes,...occupied];let best:{x:number;top:number;area:number}|undefined;
 for(let step=0;step<=32;step++){const y=Math.min(Math.max(top+direction*step*gap/2,0),Math.max(page.height-height,0)),b:AnnotationBox=[x+width[0],y,x+width[1],y+height];
  const area=ink.reduce((sum,o)=>sum+Math.max(0,Math.min(b[2],o[2])-Math.max(b[0],o[0]))*Math.max(0,Math.min(b[3],o[3])-Math.max(b[1],o[1])),0);
  if(!best||area<best.area-1e-9)best={x,top:y,area};
 }
 return {x:best!.x,top:best!.top};
}
/** Reserve all 1–5 outlines beyond the frozen carrier. Shared stems form one
 * pitch-ordered vertical stack; changing a finger changes only its value. */
type AnnotationScore=Pick<ScorePackage,'seats'|'score'|'pages'|'annotationGeometry'|'calculatedHandReceipt'|'personalAnnotationInkPolicy'>;
/** Page selection limits overlay work only: every source owner, admitted
 * geometry identity and original page remains in the complete input package. */
export function annotationPositions(p:AnnotationScore,pages?:readonly number[]):Map<string,AnnotationPosition>{
 const inkPolicy=annotationInkPolicyFor(p);if(inkPolicy)assertAnnotationInkPolicyReady(inkPolicy);
 const selected=pages===undefined?undefined:new Set(pages);
 if(selected)for(const page of selected)if(!Number.isSafeInteger(page)||page<0||page>=p.pages.length)throw Error('Annotation page differs from the complete score.');
 // A page cache limits drawing work, never the admitted ownership audit. Do
 // this for the complete package on every selected-page request, including a
 // cache hit and an empty viewport, just as font admission stays unconditional.
 if(selected&&p.annotationGeometry){const geometry=p.annotationGeometry,owned=new Map(geometry.seats.map(s=>[s.seatId,s])),notes=new Map(p.score.notes.map(n=>[n.id,n]));
  if(geometry.version!=='annotation-carrier-geometry-v1'||geometry.coverage!=='owned-head-and-duration'||
   geometry.presentationIdentity!==p.score.performingHandPresentation?.assignmentId||owned.size!==p.seats.length)throw Error('Calculated annotation ownership differs from the admitted presentation.');
  for(const seat of p.seats){const g=owned.get(seat.id);if(!g||g.page!==seat.page||g.system!==seat.system||g.hand!==(notes.get(seat.ownerIds[0])?.hand??null))throw Error('Calculated annotation seat ownership differs: '+seat.id);}
 }
 const saved=cache.get(p);
 if(!selected){if(saved)return saved;const positions=computeAnnotationPositions(p);cache.set(p,positions);return positions;}
 const seatPages=new Map(p.seats.map(s=>[s.id,s.page]));
 if(saved)return new Map([...saved].filter(([id])=>selected.has(seatPages.get(id)!)));
 const completed=pageCache.get(p)??new Map<number,Map<string,AnnotationPosition>>(),missing=new Set([...selected].filter(page=>!completed.has(page)));
 if(missing.size){const positions=computeAnnotationPositions(p,missing);
  for(const page of missing)completed.set(page,new Map([...positions].filter(([id])=>seatPages.get(id)===page)));
  pageCache.set(p,completed);
 }
 return new Map([...selected].sort((a,b)=>a-b).flatMap(page=>[...(completed.get(page)??[])]));
}
function computeAnnotationPositions(p:AnnotationScore,selected?:ReadonlySet<number>):Map<string,AnnotationPosition>{
 const metric=[Math.min(...Object.values(digitMetrics).map(m=>m[0])),Math.min(...Object.values(digitMetrics).map(m=>m[1])),Math.max(...Object.values(digitMetrics).map(m=>m[2])),Math.max(...Object.values(digitMetrics).map(m=>m[3]))];
 const carriers=fingeringCarriers(p,selected),notes=new Map(p.score.notes.map(n=>[n.id,n])),groups=new Map<string,Seat[]>(),positions=new Map<string,AnnotationPosition>();
 const geometry=p.annotationGeometry,owned=new Map(geometry?.seats.map(s=>[s.seatId,s])),box=(b:{x0:number;y0:number;x1:number;y1:number}):AnnotationBox=>[b.x0,b.y0,b.x1,b.y1],
  obstacles=geometry?p.pages.map((svg,page)=>!selected||selected.has(page)?actualPageObstacles(svg,new Map(geometry.seats.filter(s=>s.page===page).map(s=>[s.seatId,box(s.headBounds)])),annotationInkPolicyFor(p)):undefined):undefined;
 if(geometry&&(geometry.version!=='annotation-carrier-geometry-v1'||geometry.coverage!=='owned-head-and-duration'||
  geometry.presentationIdentity!==p.score.performingHandPresentation?.assignmentId||owned.size!==p.seats.length))throw Error('Calculated annotation ownership differs from the admitted presentation.');
 const pitch=(seat:Seat)=>{const n=requirePitchedEvent(notes.get(seat.ownerIds[0])!);return n.pitch.octave*12+n.pitch.pitchClass;};
 for(const seat of p.seats){if(selected&&!selected.has(seat.page))continue;const key=carriers.get(seat.id)!.id,group=groups.get(key)??[];group.push(seat);groups.set(key,group);}
 const columns=new Map<string,number[]>(),occupiedByPage=new Map<number,AnnotationBox[]>();
 for(const group of groups.values()){const key=group[0].page+':'+group[0].system,x=carriers.get(group[0].id)!.x,values=columns.get(key)??[];
  if(!values.includes(x))values.push(x);columns.set(key,values);}
 for(const group of [...groups.values()].sort((a,b)=>a[0].page-b[0].page||a[0].system-b[0].system||Math.min(...a.map(s=>s.x))-Math.min(...b.map(s=>s.x))||
  (a.map(s=>s.id).sort()[0]<b.map(s=>s.id).sort()[0]?-1:1))){
  const ordered=[...group].sort((a,b)=>pitch(b)-pitch(a)||(a.id<b.id?-1:a.id>b.id?1:0)),carrier={...carriers.get(ordered[0].id)!},em=Math.max(...group.map(s=>s.fontSize))*4/3,gap=em*.4;
  if(geometry){const own=group.map(s=>{const g=owned.get(s.id);if(!g||g.page!==s.page||g.system!==s.system||g.hand!==(notes.get(s.ownerIds[0])!.hand??null))throw Error('Calculated annotation seat ownership differs: '+s.id);return g;});
   // Left hand below; right hand and hand-less (single-staff) fingering above.
   carrier.direction=own[0].hand==='LH'?1:-1;
   const bounds=own.flatMap(s=>[s.headBounds,s.maskBounds,...s.durationBounds]);
   carrier.edge=carrier.direction===-1?Math.min(...bounds.map(b=>b.y0)):Math.max(...bounds.map(b=>b.y1));
  }
  const heights=ordered.map(s=>(metric[3]-metric[1])*s.fontSize*ANNOTATION_SIZE_RATIO*4/3/1000),stackHeight=heights.reduce((a,b)=>a+b,0)+gap*(group.length-1);
  let top=carrier.direction===-1?carrier.edge-gap-stackHeight:carrier.edge+gap,annotationX=carrier.x;
  if(obstacles){const page=obstacles[group[0].page]!,smallEm=Math.max(...group.map(s=>s.fontSize))*ANNOTATION_SIZE_RATIO*4/3,
   width:[number,number]=[(metric[0]-280)*smallEm/1000,(metric[2]-280)*smallEm/1000],
   personal=annotationInkPolicyFor(p)?.version==='viewer-personal-annotation-ink-policy-v1',
   request:AnnotationRequest={x:carrier.x,top,direction:carrier.direction,gap,height:stackHeight,
    em:Math.min(...group.map(s=>s.fontSize))*4/3,width,columns:columns.get(group[0].page+':'+group[0].system)!,page,
    occupied:occupiedByPage.get(group[0].page)??[],preferNearest:personal},
   // Retained calculated editions keep their admission refusal; the owner's
   // own hands and fingers are always shown.
   fit=curveEndDrop(request)??(personal?personalAnnotationPosition(request):affiliatedAnnotationPosition(request));
   if(!fit)throw Error('Calculated finger annotations cannot fit actual page ink for '+group.map(s=>s.id).join(', '));
   top=fit.top;annotationX=fit.x;
  }
  for(const [index,seat]of ordered.entries()){
   const fontSize=seat.fontSize*ANNOTATION_SIZE_RATIO,smallEm=fontSize*4/3,x=annotationX,baseline=top+metric[3]*smallEm/1000;
   const bounds:AnnotationPosition['bounds']=[x+(metric[0]-280)*smallEm/1000,top,x+(metric[2]-280)*smallEm/1000,top+heights[index]];
   positions.set(seat.id,{x,baseline,fontSize,bounds,carrier:geometry?carrier:carriers.get(seat.id)!});
   // Retain exactly the placement order used by collision checks, without
   // rescanning all earlier annotations and their source seats for each group.
   const occupied=occupiedByPage.get(seat.page)??[];occupied.push(bounds);occupiedByPage.set(seat.page,occupied);
   top+=heights[index]+gap;
  }
 }
 return positions;
}
export interface FingerPaint {visible:boolean;presentation:FingerPresentation;finger?:number;position:AnnotationPosition;pitchText?:string;label?:string;interactive?:boolean}
/** Original seat remains the only seat identity and keeps its existing feedback/hit target. */
export function paintFinger(text:SVGTextElement,seat:Seat,options:FingerPaint):void{
 const {visible,presentation,finger,position}=options;
 if(visible&&(!Number.isInteger(finger)||finger!<1||finger!>5))throw Error('Finger mapping is incomplete');
 const pitch=visible&&presentation==='replacement'?String(finger):options.pitchText??seat.pitchDigit;
 if(text.textContent!==pitch)text.textContent=pitch;
 if(options.label)attribute(text,'aria-label',options.label);
 let annotation=Array.from(text.parentNode!.childNodes).find(n=>n.nodeType===1&&(n as Element).getAttribute('data-finger-seat')===seat.id) as SVGTextElement|undefined;
 if(!visible||presentation!=='annotations'){annotation?.remove();return;}
 if(!annotation){annotation=text.ownerDocument.createElementNS(ns,'text') as SVGTextElement;annotation.setAttribute('data-finger-seat',seat.id);annotation.setAttribute('class','viewer-finger-annotation');annotation.setAttribute('font-family','URW Gothic');annotation.setAttribute('font-weight','700');annotation.setAttribute('text-anchor','middle');text.parentNode!.appendChild(annotation);}
 attribute(annotation,'x',String(position.x));attribute(annotation,'y',String(position.baseline));attribute(annotation,'font-size',`${position.fontSize}pt`);if(annotation.style.fill!==ANNOTATION_COLOR)annotation.style.fill=ANNOTATION_COLOR;if(annotation.textContent!==String(finger))annotation.textContent=String(finger);
 attribute(annotation,'aria-label',options.label??`Finger ${finger}, pitch ${seat.pitchDigit}, bar ${seat.writtenBar}`);
 if(options.interactive){annotation.removeAttribute('aria-hidden');if(annotation.style.pointerEvents)annotation.style.pointerEvents='';attribute(annotation,'role','button');attribute(annotation,'tabindex','-1');if(annotation.style.cursor!=='pointer')annotation.style.cursor='pointer';}
 else{annotation.removeAttribute('role');annotation.removeAttribute('tabindex');if(annotation.style.cursor)annotation.style.cursor='';attribute(annotation,'aria-hidden','true');if(annotation.style.pointerEvents!=='none')annotation.style.pointerEvents='none';}
}
