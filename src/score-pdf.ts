import {scoreFilename,TUNA_EXTENSION} from './publication';

/** PDF pages keep the engraved page's own physical size, in PostScript points. */
export interface PdfPageSize {widthPoints:number;heightPoints:number}
export type PdfSaveResult={status:'saved'|'printed'|'cancelled'};
export interface PdfSaveHost {savePdf(filename:string,size:PdfPageSize):Promise<PdfSaveResult>;}
export const MIN_PDF_PAGE_POINTS=72,MAX_PDF_PAGE_POINTS=14400;

const UNIT_POINTS:Record<string,number>={pt:1,px:.75,'':.75,in:72,mm:72/25.4,cm:72/2.54,pc:12};
function length(value:string|null):number|undefined {
 const match=value?.trim().match(/^(\d+(?:\.\d+)?|\.\d+)(pt|px|in|mm|cm|pc)?$/);
 return match?Number(match[1])*UNIT_POINTS[match[2]??'']:undefined;
}
/** The engraver writes each page with absolute width/height; a bare viewBox is
 * read as CSS pixels, exactly as the browser would size it. */
export function svgPageSize(svg:Element):PdfPageSize {
 const box=svg.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number),
  widthPoints=length(svg.getAttribute('width'))??(box?.length===4?box[2]*.75:undefined),
  heightPoints=length(svg.getAttribute('height'))??(box?.length===4?box[3]*.75:undefined);
 if(!widthPoints||!heightPoints||[widthPoints,heightPoints].some(n=>!Number.isFinite(n)||n<MIN_PDF_PAGE_POINTS||n>MAX_PDF_PAGE_POINTS))throw Error('This score page has no printable size.');
 return {widthPoints,heightPoints};
}
/** One PDF page size for the whole score; engraved pages share theirs. */
export function scorePageSize(pages:ReadonlyArray<Element>):PdfPageSize {
 const sizes=pages.map(svgPageSize),first=sizes[0];if(!first)throw Error('This score has no pages to save.');
 if(sizes.some(s=>Math.abs(s.widthPoints-first.widthPoints)>.01||Math.abs(s.heightPoints-first.heightPoints)>.01))throw Error('This score has pages of different sizes, so it cannot be saved as one PDF.');
 return first;
}
export function scorePdfFilename(title:string):string {return scoreFilename(title).slice(0,-TUNA_EXTENSION.length)+'.pdf';}

/** Mount finished reader pages as the document's only printed content. The
 * screen never shows them; printing shows nothing else. Returns the cleanup. */
export function mountScorePrint(doc:Document,pages:ReadonlyArray<SVGSVGElement>,size:PdfPageSize):()=>void {
 if(!pages.length)throw Error('This score has no pages to save.');
 const w=`${size.widthPoints}pt`,h=`${size.heightPoints}pt`,style=doc.createElement('style'),root=doc.createElement('div');
 for(const old of doc.querySelectorAll('.score-print,style[data-score-print]'))old.remove();
 style.dataset.scorePrint='';root.className='score-print';root.setAttribute('aria-hidden','true');
 style.textContent=`.score-print{display:none}
@media print{@page{size:${w} ${h};margin:0}
html,body{margin:0!important;padding:0!important;background:#fff!important;overflow:visible!important;width:auto!important;height:auto!important}
body>:not(.score-print){display:none!important}
.score-print{display:block}
.score-print-sheet{width:${w};height:calc(${h} - .5pt);overflow:hidden;break-after:page;break-inside:avoid;background:#fff}
.score-print-sheet:last-child{break-after:auto}
.score-print-sheet>svg{display:block;width:${w};height:${h}}}`;
 root.replaceChildren(...pages.map(svg=>{const sheet=doc.createElement('div');sheet.className='score-print-sheet';sheet.append(svg);return sheet;}));
 doc.head.append(style);doc.body.append(root);
 return ()=>{root.remove();style.remove();};
}

export function pdfSaveMessage(result:PdfSaveResult,filename:string,pages:number,labels:'pitch'|'finger'):string {
 if(result.status==='cancelled')return 'PDF save cancelled.';
 const detail=`${pages} page${pages===1?'':'s'} with ${labels==='finger'?'finger numbers':'pitch labels'}`;
 return result.status==='saved'?`PDF saved: ${filename} (${detail}).`:`Print dialog opened for ${filename} (${detail}).`;
}
