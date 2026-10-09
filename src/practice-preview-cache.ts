/** Reuse a fully admitted, inert leaf preview during this practice visit.
 * New viewport/font contexts still run the complete source-ink admission.
 * The bounded cache owns detached SVGs; active practice never uses them. */
export class PracticePreviewCache {
 private frames=new Map<string,SVGSVGElement>();
 private pages:readonly string[]=[];
 private faces=new WeakMap<FontFace,number>();private nextFace=0;
 get(bars:readonly number[],mount:HTMLElement,pages:readonly string[],build:()=>SVGSVGElement):SVGSVGElement {
  if(pages.length!==this.pages.length||pages.some((page,i)=>page!==this.pages[i])){this.clear();this.pages=[...pages];}
  const overview=mount.closest<HTMLElement>('.practice-overview'),fonts=mount.ownerDocument.fonts;
  const context=[mount.clientWidth,overview?.clientHeight,innerWidth,innerHeight,devicePixelRatio,
   ...Array.from(fonts,face=>{let id=this.faces.get(face);if(id===undefined){id=++this.nextFace;this.faces.set(face,id);}return [id,face.status,face.family,face.style,face.weight,face.stretch,face.featureSettings,face.variationSettings,face.unicodeRange,(face as FontFace&{sizeAdjust?:string}).sizeAdjust,face.ascentOverride,face.descentOverride,face.lineGapOverride];})];
  const key=JSON.stringify([bars,context]),saved=fonts.status==='loaded'?this.frames.get(key):undefined;
  if(saved){this.frames.delete(key);this.frames.set(key,saved);return saved;}
  const svg=build();
  if(fonts.status==='loaded'){this.frames.set(key,svg);if(this.frames.size>16)this.frames.delete(this.frames.keys().next().value!);}
  return svg;
 }
 clear(){this.frames.clear();}
}
