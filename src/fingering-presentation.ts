import {digitMetrics,type ScorePackage,type Seat} from './package';
import type {FingerPresentation} from './input';
import {fingeringCarriers,type FingerCarrier} from './fingering-carriers';
import {actualPageObstacles,boxesOverlap,type AnnotationBox} from './svg-annotation-clearance';

/** Page-coordinate overlay constants, shared by reader and practice. */
export const ANNOTATION_SIZE_RATIO=.68;
export const ANNOTATION_COLOR='#56788f';
export interface AnnotationPosition {x:number;baseline:number;fontSize:number;bounds:[number,number,number,number];carrier:FingerCarrier}
const ns='http://www.w3.org/2000/svg';
const cache=new WeakMap<object,Map<string,AnnotationPosition>>();
/** Reserve all 1–5 outlines beyond the frozen carrier. Shared stems form one
 * pitch-ordered vertical stack; changing a finger changes only its value. */
export function annotationPositions(p:Pick<ScorePackage,'seats'|'score'|'pages'|'annotationGeometry'>):Map<string,AnnotationPosition>{
 const saved=cache.get(p);if(saved)return saved;
 const metric=[Math.min(...Object.values(digitMetrics).map(m=>m[0])),Math.min(...Object.values(digitMetrics).map(m=>m[1])),Math.max(...Object.values(digitMetrics).map(m=>m[2])),Math.max(...Object.values(digitMetrics).map(m=>m[3]))];
 const carriers=fingeringCarriers(p),notes=new Map(p.score.notes.map(n=>[n.id,n])),groups=new Map<string,Seat[]>(),positions=new Map<string,AnnotationPosition>();
 const geometry=p.annotationGeometry,owned=new Map(geometry?.seats.map(s=>[s.seatId,s])),box=(b:{x0:number;y0:number;x1:number;y1:number}):AnnotationBox=>[b.x0,b.y0,b.x1,b.y1],
  obstacles=geometry?p.pages.map((svg,page)=>actualPageObstacles(svg,new Map(geometry.seats.filter(s=>s.page===page).map(s=>[s.seatId,box(s.headBounds)])))):undefined;
 if(geometry&&(geometry.version!=='annotation-carrier-geometry-v1'||geometry.coverage!=='owned-head-and-duration'||
  geometry.presentationIdentity!==p.score.performingHandPresentation?.assignmentId||owned.size!==p.seats.length))throw Error('Calculated annotation ownership differs from the admitted presentation.');
 const pitch=(seat:Seat)=>{const n=notes.get(seat.ownerIds[0])!;return n.pitch.octave*12+n.pitch.pitchClass;};
 for(const seat of p.seats){const key=carriers.get(seat.id)!.id,group=groups.get(key)??[];group.push(seat);groups.set(key,group);}
 for(const group of [...groups.values()].sort((a,b)=>a[0].page-b[0].page||a[0].system-b[0].system||Math.min(...a.map(s=>s.x))-Math.min(...b.map(s=>s.x))||
  (a.map(s=>s.id).sort()[0]<b.map(s=>s.id).sort()[0]?-1:1))){
  const ordered=[...group].sort((a,b)=>pitch(b)-pitch(a)||(a.id<b.id?-1:a.id>b.id?1:0)),carrier={...carriers.get(ordered[0].id)!},em=Math.max(...group.map(s=>s.fontSize))*4/3,gap=em*.4;
  if(geometry){const own=group.map(s=>{const g=owned.get(s.id);if(!g||g.page!==s.page||g.system!==s.system||g.hand!==notes.get(s.ownerIds[0])!.hand)throw Error('Calculated annotation seat ownership differs: '+s.id);return g;});
   carrier.direction=own[0].hand==='RH'?-1:1;
   const bounds=own.flatMap(s=>[s.headBounds,s.maskBounds,...s.durationBounds]);
   carrier.edge=carrier.direction===-1?Math.min(...bounds.map(b=>b.y0)):Math.max(...bounds.map(b=>b.y1));
  }
  const heights=ordered.map(s=>(metric[3]-metric[1])*s.fontSize*ANNOTATION_SIZE_RATIO*4/3/1000),stackHeight=heights.reduce((a,b)=>a+b,0)+gap*(group.length-1);
  let top=carrier.direction===-1?carrier.edge-gap-stackHeight:carrier.edge+gap;
  if(obstacles){const page=obstacles[group[0].page],smallEm=Math.max(...group.map(s=>s.fontSize))*ANNOTATION_SIZE_RATIO*4/3,
   width:[number,number]=[carrier.x+(metric[0]-280)*smallEm/1000,carrier.x+(metric[2]-280)*smallEm/1000];let fits=false;
   // Keep source-owned x affiliation; search bounded air beyond its complete
   // duration carrier and admit against ALL page ink plus earlier annotations.
   for(let step=0;step<=32;step++){const candidate=top+carrier.direction*step*gap/2,b:AnnotationBox=[width[0],candidate,width[1],candidate+stackHeight];
    if(b[0]>=0&&b[2]<=page.width&&b[1]>=0&&b[3]<=page.height&&
     !page.boxes.some(other=>boxesOverlap(b,other))&&![...positions.entries()].some(([id,p])=>pianoSeatPage(id)===group[0].page&&boxesOverlap(b,p.bounds))){top=candidate;fits=true;break;}}
   if(!fits)throw Error('Calculated finger annotations cannot fit actual page ink for '+group.map(s=>s.id).join(', '));
  }
  for(const [index,seat]of ordered.entries()){
   const fontSize=seat.fontSize*ANNOTATION_SIZE_RATIO,smallEm=fontSize*4/3,x=carrier.x,baseline=top+metric[3]*smallEm/1000;
   const bounds:AnnotationPosition['bounds']=[x+(metric[0]-280)*smallEm/1000,top,x+(metric[2]-280)*smallEm/1000,top+heights[index]];
   positions.set(seat.id,{x,baseline,fontSize,bounds,carrier:geometry?carrier:carriers.get(seat.id)!});top+=heights[index]+gap;
  }
 }
 cache.set(p,positions);return positions;
 function pianoSeatPage(id:string){return p.seats.find(s=>s.id===id)!.page;}
}
export interface FingerPaint {visible:boolean;presentation:FingerPresentation;finger?:number;position:AnnotationPosition;pitchText?:string;label?:string;interactive?:boolean}
/** Original seat remains the only seat identity and keeps its existing feedback/hit target. */
export function paintFinger(text:SVGTextElement,seat:Seat,options:FingerPaint):void{
 const {visible,presentation,finger,position}=options;
 if(visible&&(!Number.isInteger(finger)||finger!<1||finger!>5))throw Error('Finger mapping is incomplete');
 text.textContent=visible&&presentation==='replacement'?String(finger):options.pitchText??seat.pitchDigit;
 if(options.label)text.setAttribute('aria-label',options.label);
 let annotation=Array.from(text.parentNode!.childNodes).find(n=>n.nodeType===1&&(n as Element).getAttribute('data-finger-seat')===seat.id) as SVGTextElement|undefined;
 if(!visible||presentation!=='annotations'){annotation?.remove();return;}
 if(!annotation){annotation=text.ownerDocument.createElementNS(ns,'text') as SVGTextElement;annotation.setAttribute('data-finger-seat',seat.id);annotation.setAttribute('class','viewer-finger-annotation');annotation.setAttribute('font-family','URW Gothic');annotation.setAttribute('font-weight','700');annotation.setAttribute('text-anchor','middle');text.parentNode!.appendChild(annotation);}
 annotation.setAttribute('x',String(position.x));annotation.setAttribute('y',String(position.baseline));annotation.setAttribute('font-size',`${position.fontSize}pt`);annotation.style.fill=ANNOTATION_COLOR;annotation.textContent=String(finger);
 annotation.setAttribute('aria-label',options.label??`Finger ${finger}, pitch ${seat.pitchDigit}, bar ${seat.writtenBar}`);
 if(options.interactive){annotation.setAttribute('role','button');annotation.setAttribute('tabindex','-1');annotation.style.cursor='pointer';}else{annotation.setAttribute('aria-hidden','true');annotation.style.pointerEvents='none';}
}
