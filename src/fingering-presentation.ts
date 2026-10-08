import {digitMetrics,type ScorePackage,type Seat} from './package';
import type {FingerPresentation} from './input';
import {fingeringCarriers,type FingerCarrier} from './fingering-carriers';

/** Page-coordinate overlay constants, shared by reader and practice. */
export const ANNOTATION_SIZE_RATIO=.68;
export const ANNOTATION_COLOR='#56788f';
export interface AnnotationPosition {x:number;baseline:number;fontSize:number;bounds:[number,number,number,number];carrier:FingerCarrier}
const ns='http://www.w3.org/2000/svg';
const metric=[Math.min(...Object.values(digitMetrics).map(m=>m[0])),Math.min(...Object.values(digitMetrics).map(m=>m[1])),Math.max(...Object.values(digitMetrics).map(m=>m[2])),Math.max(...Object.values(digitMetrics).map(m=>m[3]))];
const cache=new WeakMap<object,Map<string,AnnotationPosition>>();
/** Reserve all 1–5 outlines beyond the frozen carrier. Shared stems form one
 * pitch-ordered vertical stack; changing a finger changes only its value. */
export function annotationPositions(p:Pick<ScorePackage,'seats'|'score'|'pages'>):Map<string,AnnotationPosition>{
 const saved=cache.get(p);if(saved)return saved;
 const carriers=fingeringCarriers(p),notes=new Map(p.score.notes.map(n=>[n.id,n])),groups=new Map<string,Seat[]>(),positions=new Map<string,AnnotationPosition>();
 const pitch=(seat:Seat)=>{const n=notes.get(seat.ownerIds[0])!;return n.pitch.octave*12+n.pitch.pitchClass;};
 for(const seat of p.seats){const key=carriers.get(seat.id)!.id,group=groups.get(key)??[];group.push(seat);groups.set(key,group);}
 for(const group of groups.values()){
  const ordered=[...group].sort((a,b)=>pitch(b)-pitch(a)||a.id.localeCompare(b.id)),carrier=carriers.get(ordered[0].id)!,em=Math.max(...group.map(s=>s.fontSize))*4/3,gap=em*.4;
  const heights=ordered.map(s=>(metric[3]-metric[1])*s.fontSize*ANNOTATION_SIZE_RATIO*4/3/1000),stackHeight=heights.reduce((a,b)=>a+b,0)+gap*(group.length-1);
  let top=carrier.direction===-1?carrier.edge-gap-stackHeight:carrier.edge+gap;
  for(const [index,seat]of ordered.entries()){
   const fontSize=seat.fontSize*ANNOTATION_SIZE_RATIO,smallEm=fontSize*4/3,x=carrier.x,baseline=top+metric[3]*smallEm/1000;
   const bounds:AnnotationPosition['bounds']=[x+(metric[0]-280)*smallEm/1000,top,x+(metric[2]-280)*smallEm/1000,top+heights[index]];
   positions.set(seat.id,{x,baseline,fontSize,bounds,carrier:carriers.get(seat.id)!});top+=heights[index]+gap;
  }
 }
 cache.set(p,positions);return positions;
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
