import type {ScorePackage,Seat} from './package';
import {annotationInkPolicyFor,applyAnnotationInkPolicy,assertAnnotationInkPolicyReady} from './annotation-ink-policy';

export interface ReaderPage {
 element:HTMLDivElement;
 seats:ReadonlyArray<{seat:Seat;text:SVGTextElement}>;
}
/** Preserve the real SVG/hit targets while changing reader presentation.
 * Package admission remains independent. Mutable finger/contact/selection
 * paint is updated by the reader on every visit, never taken from this cache. */
export class ReaderPageCache {
 private package?:ScorePackage;
 private pages=new Map<number,{source:string;page:ReaderPage}>();
 private seats=new Map<string,Seat>();private hands=new Map<string,'LH'|'RH'|undefined>();
 get(p:ScorePackage,index:number):ReaderPage {
  const policy=annotationInkPolicyFor(p);if(policy)assertAnnotationInkPolicyReady(policy);
  if(this.package!==p){this.clear();this.package=p;this.seats=new Map(p.seats.map(s=>[s.id,s]));this.hands=new Map(p.score.notes.map(n=>[n.id,n.hand]));}
  const source=p.pages[index],saved=this.pages.get(index);if(source===undefined)throw Error('Reader page is unavailable.');
  if(saved?.source===source){this.pages.delete(index);this.pages.set(index,saved);return saved.page;}
  const page=createReaderPage(p,index,this.seats);
  this.pages.set(index,{source,page});if(this.pages.size>8)this.pages.delete(this.pages.keys().next().value!);
  return page;
 }
 ownerHand(id:string){return this.hands.get(id);}
 clear(){this.package=undefined;this.pages.clear();this.seats.clear();this.hands.clear();}
}

/** A fresh, unmounted page built exactly as the reader builds its own. Its
 * mutable finger paint is still the caller's responsibility. */
export function createReaderPage(p:ScorePackage,index:number,seats:ReadonlyMap<string,Seat>=new Map(p.seats.map(s=>[s.id,s]))):ReaderPage {
 const policy=annotationInkPolicyFor(p);if(policy)assertAnnotationInkPolicyReady(policy);
 const source=p.pages[index];if(source===undefined)throw Error('Reader page is unavailable.');
 const element=document.createElement('div');element.className='page';element.dataset.page=String(index);element.innerHTML=source;
 const svg=element.querySelector('svg');if(!svg)throw Error('Reader page lacks its admitted SVG.');applyAnnotationInkPolicy(svg,policy);
 return {element,seats:Array.from(element.querySelectorAll<SVGTextElement>('[data-viewer-seat]'),text=>{const seat=seats.get(text.dataset.viewerSeat!);if(!seat||seat.page!==index)throw Error('Reader seat differs from its admitted page.');return {seat,text};})};
}

/** Reordering is needed only when the visible page group changes. Holding
 * fingerings, editing a value or refitting must keep the focused glyph alive. */
export function mountReaderPages(group:HTMLElement,pages:ReadonlyArray<HTMLElement>):void {
 if(group.children.length!==pages.length||pages.some((page,index)=>group.children[index]!==page))group.replaceChildren(...pages);
}
