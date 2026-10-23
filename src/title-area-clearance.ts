import {DOMParser} from '@xmldom/xmldom';
import {svgClassStyles,resolvedSvgStyle} from './svg-style';
import {mul,pathPoints,pointsBox,transform,unit,type AnnotationBox,type Matrix} from './svg-annotation-clearance';
import {approvedProductionIsoOptions} from '../vendor/iso-notation/src/render/iso/approved-production';
import type {ResolvedIsoLayoutOptions} from '../vendor/iso-notation/src/render/iso/types';

/** Air kept between page one's title area and the first system, in points. */
export const TITLE_AREA_AIR=2;

export interface TitleAreaInk {header:AnnotationBox[];music:AnnotationBox[]}

/** Page one's title area (title, subtitle, composer, performing instruction
 * and printed notices) and the music beneath it, as ink boxes measured on the
 * page itself. Text is measured generously, without font metrics: from a
 * full ascender above its baseline to a descender below, and at least 0.6 em
 * per character across. Lines, rectangles (white knockouts too: they would
 * cover the text), paths and transformed glyphs keep their exact bounds. */
export function titleAreaInk(svg:string):TitleAreaInk{
 const doc=new DOMParser().parseFromString(svg,'image/svg+xml'),root=doc.documentElement!,
  width=Number((root.getAttribute('viewBox')??'').split(/[\s,]+/)[2]??root.getAttribute('width')),styles=svgClassStyles(doc as unknown as Document),
  ink:TitleAreaInk={header:[],music:[]};
 if(!Number.isFinite(width)||width<=0)throw Error('Unsupported page coordinates');
 function visit(el:Element,parent:Matrix,inherited:Record<string,string>,into:AnnotationBox[]|undefined):void{
  const tag=el.localName;if(['defs','style','title','desc'].includes(tag))return;
  const id=el.getAttribute('id')??'',target=id==='page-header'?ink.header:/^system-\d+$/.test(id)?ink.music:into,
   style=resolvedSvgStyle(el,styles,inherited),m=mul(parent,transform(el.getAttribute('transform')??'')),
   stroke=style.stroke===undefined||style.stroke==='none'?0:Number(style['stroke-width']??1),
   value=(k:string)=>{const v=Number(el.getAttribute(k));if(!Number.isFinite(v))throw Error(`Unsupported SVG ${tag} ${k}`);return v;};
  if(target){
   let points:Array<[number,number]>|undefined;
   if(tag==='rect'){const x=value('x'),y=value('y');points=[[x,y],[x+value('width'),y+value('height')]];}
   else if(tag==='line')points=[[value('x1'),value('y1')],[value('x2'),value('y2')]];
   else if(tag==='circle'||tag==='ellipse'){const x=value('cx'),y=value('cy'),rx=value(tag==='circle'?'r':'rx'),ry=value(tag==='circle'?'r':'ry');points=[[x-rx,y-ry],[x+rx,y+ry]];}
   else if(tag==='path')points=pathPoints(el.getAttribute('d')??'');
   else if(tag==='polygon'||tag==='polyline'){const n=(el.getAttribute('points')??'').trim().split(/[\s,]+/).map(Number);points=Array.from({length:n.length>>1},(_,i)=>[n[2*i],n[2*i+1]]);}
   else if(tag==='text'){
    const raw=style['font-size']??'',size=parseFloat(raw)*(raw.endsWith('pt')?4/3:1),text=el.textContent??'',x=value('x'),y=value('y');
    if(!Number.isFinite(size)||size<=0)throw Error('Unmeasured SVG text');
    const across=Math.max(1,[...text].length)*.6*size+[...text].length*(parseFloat(style['letter-spacing']??'0')||0),anchor=style['text-anchor']??'start',
     left=anchor==='middle'?x-across/2:anchor==='end'?x-across:x;
    const b=pointsBox([[left,y-.95*size],[left+across,y+.3*size]],m);target.push([Math.max(0,b[0]),b[1],Math.min(width,b[2]),b[3]]);return;
   }
   else if(!['g','svg'].includes(tag))throw Error('Unsupported SVG element on page one: '+tag);
   if(points?.length)target.push(pointsBox(points,m,stroke));
  }
  for(const child of Array.from(el.childNodes))if(child.nodeType===1)visit(child as Element,m,style,target);
 }
 visit(root as unknown as Element,unit,{},undefined);
 return ink;
}

/** How far page one's music must move down to clear its title area by
 * `air` points: 0 when every header line and notice already stands clear. */
export function titleAreaOverlap(svg:string,air=TITLE_AREA_AIR):number{
 const {header,music}=titleAreaInk(svg);let depth=0;
 for(const h of header)for(const n of music)
  if(h[0]<n[2]&&h[2]>n[0]&&n[1]<h[3]+air&&n[3]>h[1])depth=Math.max(depth,h[3]+air-n[1]);
 return depth;
}

/** The notices an edition's page one prints: those its recipe names, else
 * those its saved page one shows (an engine that kept no recipe). Undefined
 * when neither says, so the source's own notices print. */
export function editionPrintedNotices(p:{pages:readonly string[];renderingRecipe?:{options:Record<string,unknown>}}):string[]|undefined{
 const named=p.renderingRecipe?.options.printedNotices;
 if(Array.isArray(named)&&named.every(n=>typeof n==='string'))return named.slice();
 if(!p.pages[0])return;
 const header=Array.from(new DOMParser().parseFromString(p.pages[0],'image/svg+xml').getElementsByTagName('g')).find(g=>g.getAttribute('id')==='page-header');
 return header?Array.from(header.getElementsByTagName('text')).filter(t=>(t.getAttribute('class')??'').split(/\s+/).includes('janko-source-notice')).map(t=>t.textContent??''):undefined;
}

/** Engrave until page one's music stands clear of its title area. When it
 * reaches in, page one's header is made that much deeper (later pages keep
 * the header they had) and the score is engraved again; after three tries
 * the engraving is refused rather than printed over. */
export async function engraveClearOfTitleArea<T extends {pages:readonly string[]}>(options:ResolvedIsoLayoutOptions,engrave:(options:ResolvedIsoLayoutOptions)=>Promise<T>):Promise<T>{
 for(let attempt=1;;attempt++){
  const rendered=await engrave(options),depth=titleAreaOverlap(rendered.pages[0]);
  if(!depth)return rendered;
  if(attempt===3)throw Error('Page one’s music reaches its title area.');
  options=approvedProductionIsoOptions({...options,headerHeight:options.headerHeight+Math.ceil(depth),runningHeaderHeight:options.runningHeaderHeight??options.headerHeight});
 }
}
