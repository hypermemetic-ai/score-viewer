import {FOOTER_FONT_BASE64,FOOTER_METRICS_JSON} from './footer-font-data';
import {PERSONAL_TEXT_METRICS_JSON} from './personal-text-font-data';
import {svgClassStyles,resolvedSvgStyle} from './svg-style';

export interface ViewerAnnotationInkPolicy {
 version:'viewer-annotation-ink-policy-v1';footer:{version:'viewer-footer-serif-v1';family:'Viewer Calculated Footer Serif v1';
 fontSha256:string;metricsSha256:string;unitsPerEm:2048;fontSizePt:8;fontStyle:'italic';fontWeight:400;textAnchor:'end';
 shaping:'explicit-unchanging-latin-footer-v1';textRendering:'geometricPrecision';drawingAllowancePageUnits:2};
}
import policyDocument from './footer-ink-policy.json';
export const ANNOTATION_INK_POLICY:ViewerAnnotationInkPolicy=Object.freeze({...policyDocument,footer:Object.freeze(policyDocument.footer)}) as ViewerAnnotationInkPolicy;
/** Ephemeral personal readings measure margin labels too. This is never an
 * archive receipt: old calculated editions retain their footer-only policy. */
export interface PersonalAnnotationInkPolicy {
 version:'viewer-personal-annotation-ink-policy-v1';footer:ViewerAnnotationInkPolicy['footer'];
 placement:'nearest-carrier-v1';
 measureNumbers:{version:'viewer-measure-number-serif-v1';fontSizePt:7};
 expressions:{version:'viewer-expression-serif-v1';fontSizePx:8.5;metricsSha256:string};
}
export type AnnotationInkPolicy=ViewerAnnotationInkPolicy|PersonalAnnotationInkPolicy;
export const PERSONAL_ANNOTATION_INK_POLICY:PersonalAnnotationInkPolicy=Object.freeze({
 version:'viewer-personal-annotation-ink-policy-v1',footer:ANNOTATION_INK_POLICY.footer,placement:'nearest-carrier-v1',
 measureNumbers:Object.freeze({version:'viewer-measure-number-serif-v1',fontSizePt:7}),
 expressions:Object.freeze({version:'viewer-expression-serif-v1',fontSizePx:8.5,metricsSha256:'92fc4a612517ade11fa589ecd3babd0300c3e6eac8c48606aef2d7ae4fab58fb'}),
});
const fontAsset=new URL('./LiberationSerif-Italic.ttf',import.meta.url);
export const footerFontNoticeUrl=new URL('../licenses/LiberationSerif-Italic-NOTICE.txt',import.meta.url).href;
const canonical=(v:any):string=>JSON.stringify(v&&typeof v==='object'?Array.isArray(v)?v.map(x=>JSON.parse(canonical(x))):
 Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(canonical(v[k]))])):v);
export function validateAnnotationInkPolicy(raw:unknown):ViewerAnnotationInkPolicy{
 if(raw===ANNOTATION_INK_POLICY)return ANNOTATION_INK_POLICY;
 if(canonical(raw)!==canonical(ANNOTATION_INK_POLICY))throw Error('Unsupported or altered Viewer annotation ink policy.');
 return ANNOTATION_INK_POLICY;
}
export function validatePersonalAnnotationInkPolicy(raw:unknown):PersonalAnnotationInkPolicy{
 if(raw===PERSONAL_ANNOTATION_INK_POLICY)return PERSONAL_ANNOTATION_INK_POLICY;
 if(canonical(raw)!==canonical(PERSONAL_ANNOTATION_INK_POLICY))throw Error('Unsupported or altered personal annotation ink policy.');
 return PERSONAL_ANNOTATION_INK_POLICY;
}
function validateReadingInkPolicy(policy:AnnotationInkPolicy):void{
 if(policy.version==='viewer-personal-annotation-ink-policy-v1')validatePersonalAnnotationInkPolicy(policy);
 else validateAnnotationInkPolicy(policy);
}
const hash=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))).map(n=>n.toString(16).padStart(2,'0')).join('');
interface Glyph {glyph:string;advance:number;bounds:[number,number,number,number]|null}
interface SerifMetrics {glyphs:Record<string,Glyph>;verticalCell:Record<string,[number,number]>;drawingAllowancePageUnits:number}
function frozenMetrics(literal:string):SerifMetrics{
 const value=JSON.parse(literal) as SerifMetrics;
 for(const v of Object.values(value.verticalCell))Object.freeze(v);Object.freeze(value.verticalCell);
 for(const g of Object.values(value.glyphs)){if(g.bounds)Object.freeze(g.bounds);Object.freeze(g);}Object.freeze(value.glyphs);return Object.freeze(value);
}
const metrics=frozenMetrics(FOOTER_METRICS_JSON),personalMetrics=frozenMetrics(PERSONAL_TEXT_METRICS_JSON);
export async function verifyPersonalTextMetrics(literal=PERSONAL_TEXT_METRICS_JSON):Promise<void>{
 if(await hash(new TextEncoder().encode(literal))!==PERSONAL_ANNOTATION_INK_POLICY.expressions.metricsSha256)
  throw Error('Personal text metrics differ from the reviewed exact bytes. Prior reading retained.');
}

export async function verifyFooterAssets(font:Uint8Array,literal=FOOTER_METRICS_JSON):Promise<void>{
 if(font.length!==375760||await hash(font)!==ANNOTATION_INK_POLICY.footer.fontSha256||
  await hash(new TextEncoder().encode(literal))!==ANNOTATION_INK_POLICY.footer.metricsSha256)
  throw Error('The measured footer font or metrics differ from the reviewed exact bytes. Prior edition retained.');
}
// FontFace may serialize the SAME CSS family quoted, escaped or with a
// different case. Those faces are still ambiguous for this unique family.
const familyKey=(name:string)=>name.trim().replace(/^(?:"(.*)"|'(.*)')$/s,(_,a,b)=>a??b)
 .replace(/\\([0-9a-f]{1,6})(?:\s)?|\\([^\r\n\f])/gi,(_,hex,ch)=>hex?String.fromCodePoint(Math.min(parseInt(hex,16),0x10ffff)):ch)
 .replace(/\s+/g,' ').toLowerCase();
const sameFamily=(face:FontFace,family:string)=>familyKey(face.family)===familyKey(family);
let loaded:FontFace|undefined,ready:Promise<void>|undefined,verified=false,personalMetricsVerified=false;
/** Verified original bytes, never a packaged metric claim or platform bbox.
 * ArrayBuffer loading avoids changing native CSP/connect permissions. */
export async function ensureAnnotationInkPolicyReady(policy:AnnotationInkPolicy):Promise<void>{
 validateReadingInkPolicy(policy);
 if(policy.version==='viewer-personal-annotation-ink-policy-v1'&&!personalMetricsVerified){await verifyPersonalTextMetrics();personalMetricsVerified=true;}
 if(!ready)ready=(async()=>{
  let bytes:Uint8Array;try{bytes=Uint8Array.from(atob(FOOTER_FONT_BASE64),c=>c.charCodeAt(0));}catch{throw Error('The measured footer font could not decode. Prior edition retained.');}
  await verifyFooterAssets(bytes);
  if(fontAsset.protocol==='file:'){
   const nodeImport='node:fs/promises',fs=await import(/* @vite-ignore */ nodeImport),actual=new Uint8Array(await fs.readFile(fontAsset));
   await verifyFooterAssets(actual);if(actual.some((v,i)=>v!==bytes[i]))throw Error('Footer font file differs from its compiled payload.');
  }else{
   const fonts=(globalThis as unknown as {fonts?:FontFaceSet;document?:Document}).document?.fonts??(globalThis as unknown as {fonts?:FontFaceSet}).fonts;
   if(typeof FontFace==='undefined'||!fonts)throw Error('The measured footer font cannot load in this reader. Prior edition retained.');
   if([...fonts].some(f=>sameFamily(f,policy.footer.family)))throw Error('The measured footer font family is ambiguous. Prior edition retained.');
   const face=new FontFace(policy.footer.family,new Uint8Array(bytes).buffer,{style:'italic',weight:'400',stretch:'normal'});
   try{await face.load();}catch{throw Error('The measured footer font failed to load. Prior edition retained.');}
   if(face.status!=='loaded'||[...fonts].some(f=>sameFamily(f,policy.footer.family)))throw Error('The measured footer font family is ambiguous or unavailable.');
   fonts.add(face);loaded=face;
  }verified=true;
 })().catch(error=>{ready=undefined;throw error;});
 await ready;
 // A Node cold reader verifies its own asset on EVERY admission, independently
 // of a prior cached face/payload check. Browser FontFace bytes are immutable.
 if(fontAsset.protocol==='file:'){const nodeImport='node:fs/promises',fs=await import(/* @vite-ignore */ nodeImport);
  await verifyFooterAssets(new Uint8Array(await fs.readFile(fontAsset)));}
 assertAnnotationInkPolicyReady(policy);
}
export function assertAnnotationInkPolicyReady(policy:AnnotationInkPolicy):void{
 validateReadingInkPolicy(policy);if(!verified||policy.version==='viewer-personal-annotation-ink-policy-v1'&&!personalMetricsVerified)throw Error('The measured footer font has not been independently admitted.');
 if(fontAsset.protocol!=='file:'){
  const fonts=(globalThis as unknown as {fonts?:FontFaceSet;document?:Document}).document?.fonts??(globalThis as unknown as {fonts?:FontFaceSet}).fonts,
   matches=fonts?[...fonts].filter(f=>sameFamily(f,policy.footer.family)):[];
  if(!loaded||loaded.status!=='loaded'||matches.length!==1||matches[0]!==loaded)throw Error('The measured footer font family is unavailable or ambiguous.');
 }
}
/** Explicit measured-policy receipt dispatch; old drawing/hashes remain untouched. */
export function annotationInkPolicyFor(p:{personalAnnotationInkPolicy?:unknown;calculatedHandReceipt?:unknown;files?:Record<string,Uint8Array>;manifest?:{calculatedHandReceipt?:string}}):AnnotationInkPolicy|undefined{
 let r=p.calculatedHandReceipt as any;
 if(!r&&p.manifest?.calculatedHandReceipt){const b=p.files?.[p.manifest.calculatedHandReceipt];if(b)r=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));}
 const calculated=r?.version==='viewer-calculated-hand-edition-v2'||r?.version==='viewer-calculated-hand-edition-v3'?validateAnnotationInkPolicy(r.annotationInkPolicy):undefined;
 return p.personalAnnotationInkPolicy===undefined?calculated:validatePersonalAnnotationInkPolicy(p.personalAnnotationInkPolicy);
}
export const footerStyle={
 'font-variant':'normal',
 'font-family':'"Viewer Calculated Footer Serif v1"','font-style':'italic','font-weight':'400','font-size':'8pt','text-anchor':'end',
 'font-kerning':'none','font-variant-ligatures':'none','font-feature-settings':'"kern" 0, "liga" 0, "clig" 0',
 'font-synthesis':'none','letter-spacing':'0px','word-spacing':'0px','font-stretch':'normal','font-optical-sizing':'none',
 'writing-mode':'horizontal-tb','direction':'ltr','unicode-bidi':'normal','text-rendering':'geometricPrecision',
 'font-variation-settings':'normal','font-size-adjust':'none',
} as const;
const sourceFamily='"Liberation Serif", "Century Schoolbook", "Baskerville", "DejaVu Serif", "Times New Roman", Georgia, serif';
const positioned=['dx','dy','rotate','textLength','lengthAdjust','dominant-baseline','alignment-baseline'];
function measuredSerifStyle(el:Element,style:Record<string,string>,size:string,family=sourceFamily,anchor='end',defaults=false):boolean{
 if(el.localName!=='text'||style['font-family']!==family||style['font-style']!=='italic'||
  !['400','normal'].includes(style['font-weight']??(defaults?'400':''))||style['font-size']!==size||(style['text-anchor']??(defaults?'start':''))!==anchor||
  Array.from(el.childNodes).some(n=>n.nodeType===1)||positioned.some(k=>el.hasAttribute(k)||style[k]!==undefined))return false;
 if(Object.keys(style).some(k=>(k==='font'||k.startsWith('font-'))&&!['font-family','font-style','font-weight','font-size'].includes(k)))return false;
 return !['font-kerning','font-variant-ligatures','font-feature-settings','font-synthesis','letter-spacing','word-spacing',
  'font-stretch','font-optical-sizing','writing-mode','direction','unicode-bidi','text-rendering','font-variant','font-variation-settings','font-size-adjust'].some(k=>style[k]!==undefined);
}
/** Match actual source primitive/style. Unknown/custom text stays conservative. */
export function footerGlyphPoints(el:Element,style:Record<string,string>,policy:AnnotationInkPolicy):Array<[number,number]>|undefined{
 assertAnnotationInkPolicyReady(policy);
 const text=el.textContent??'';
 if(el.getAttribute('class')!=='janko-page-num'||!/^Page [1-9]\d* of [1-9]\d*$/.test(text)||text.length>64||!measuredSerifStyle(el,style,'8pt'))return;
 return measuredSerifPoints(el,text,8,policy);
}
/** Admit only the renderer's numeric margin label and exact original style.
 * Unknown text still reserves its conservative band. Measurement and drawing
 * both call this predicate, so narrower bounds never outlive the matching face. */
export function measureNumberGlyphPoints(el:Element,style:Record<string,string>,policy:AnnotationInkPolicy):Array<[number,number]>|undefined{
 assertAnnotationInkPolicyReady(policy);
 const text=el.textContent??'';
 if(policy.version!=='viewer-personal-annotation-ink-policy-v1'||el.getAttribute('class')!=='janko-measure-num'||
  !/^[1-9]\d{0,8}$/.test(text)||!measuredSerifStyle(el,style,'7pt'))return;
 return measuredSerifPoints(el,text,policy.measureNumbers.fontSizePt,policy);
}
/** Finite source-renderer expression typography; unsupported characters and
 * custom styles retain conservative treatment rather than guessed metrics. */
export function expressionGlyphPoints(el:Element,style:Record<string,string>,policy:AnnotationInkPolicy):Array<[number,number]>|undefined{
 assertAnnotationInkPolicyReady(policy);
 const text=el.textContent??'';
 if(policy.version!=='viewer-personal-annotation-ink-policy-v1'||el.getAttribute('class')!=='janko-expression-text'||
  !text.length||text!==text.trim()||/ {2}/.test(text)||text.length>512||[...text].some(ch=>!Object.hasOwn(personalMetrics.glyphs,ch))||
  !measuredSerifStyle(el,style,'8.5','Century Schoolbook,serif','start',true))return;
 return measuredSerifPoints(el,text,policy.expressions.fontSizePx*3/4,policy,personalMetrics,'start');
}
function measuredSerifPoints(el:Element,text:string,fontSizePt:number,policy:AnnotationInkPolicy,face=metrics,anchor:'start'|'end'='end'):Array<[number,number]>|undefined{
 const coordinate=(k:string)=>{const raw=el.getAttribute(k);return raw!==null&&raw.trim()?Number(raw):NaN;},x=coordinate('x'),y=coordinate('y'),scale=fontSizePt*4/3/policy.footer.unitsPerEm;
 if(!Number.isFinite(x)||!Number.isFinite(y))return;
 const chars=[...text],advance=chars.reduce((sum,ch)=>sum+face.glyphs[ch].advance,0);let cursor=anchor==='end'?x-advance*scale:x;
 const points:Array<[number,number]>=[],lo=Math.min(...Object.values(face.verticalCell).map(v=>v[0])),
  hi=Math.max(...Object.values(face.verticalCell).map(v=>v[1])),pad=policy.footer.drawingAllowancePageUnits;
 for(const ch of chars){const g=face.glyphs[ch];if(g.bounds){const [bx0,,bx1]=g.bounds,x0=cursor+Math.min(0,bx0)*scale-pad,x1=cursor+Math.max(g.advance,bx1)*scale+pad,
    y0=y-hi*scale-pad,y1=y-lo*scale+pad;
   points.push([x0,y0],[x1,y0],[x0,y1],[x1,y1]);}
  cursor+=g.advance*scale;
 }return points;
}
/** Display-only adaptation. Literal package pages and historical receipts stay exact. */
export function applyAnnotationInkPolicy(root:SVGElement,policy:AnnotationInkPolicy|undefined):void{
 if(!policy)return;const admitted=policy;assertAnnotationInkPolicyReady(admitted);const styles=svgClassStyles(root);
 function visit(el:Element,inherited:Record<string,string>):void{const style=resolvedSvgStyle(el,styles,inherited);
  const measure=el.localName==='text'&&measureNumberGlyphPoints(el,style,admitted),expression=el.localName==='text'&&expressionGlyphPoints(el,style,admitted);
  if(measure||expression||el.localName==='text'&&footerGlyphPoints(el,style,admitted))for(const [key,value]of Object.entries(footerStyle))
   (el as SVGElement).style.setProperty(key,key==='font-size'?(expression?'8.5px':measure?'7pt':value):expression&&key==='text-anchor'?'start':value);
  for(const child of Array.from(el.childNodes))if(child.nodeType===1)visit(child as Element,style);
 }visit(root,{});
}
