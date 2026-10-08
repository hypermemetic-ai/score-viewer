const properties=['stroke-width','font-size','stroke','fill','stroke-linejoin','stroke-miterlimit','stroke-linecap','vector-effect','filter',
 'dominant-baseline','alignment-baseline','dx','dy','rotate','textLength','lengthAdjust','font-family','font-style','font-weight','text-anchor','font-kerning','font-variant-ligatures','font-feature-settings','font-synthesis',
 'letter-spacing','word-spacing','font-stretch','font-optical-sizing','writing-mode','direction','unicode-bidi','text-rendering','font-variant','font-variation-settings','font-size-adjust'];
const declarations=(s:string)=>Object.fromEntries(s.split(';').flatMap(s=>{const i=s.indexOf(':');return i<0?[]:[[s.slice(0,i).trim(),s.slice(i+1).trim()]];}));
/** Exactly the supported source stylesheet subset. Unknown selectors fail closed. */
export function svgClassStyles(doc:Document|Element):Map<string,Record<string,string>>{
 const styles=new Map<string,Record<string,string>>();
 for(const el of Array.from(doc.getElementsByTagName('style'))){const css=el.textContent??'',pattern=/\.([\w-]+)\s*\{([^}]+)\}/g;
  if(css.replace(pattern,'').trim())throw Error('Unsupported annotation CSS selectors');
  for(const match of css.matchAll(pattern))styles.set(match[1],{...styles.get(match[1]),...declarations(match[2])});
 }return styles;
}
export function resolvedSvgStyle(el:Element,styles:ReadonlyMap<string,Record<string,string>>,inherited:Record<string,string>):Record<string,string>{
 // Presentation attributes precede stylesheet declarations and inline style.
 const attributes=Object.fromEntries(properties.filter(k=>el.hasAttribute(k)).map(k=>[k,el.getAttribute(k)!]));
 return {...inherited,...attributes,...Object.assign({},...(el.getAttribute('class')??'').split(/\s+/).map(c=>styles.get(c)??{})),...declarations(el.getAttribute('style')??'')};
}
