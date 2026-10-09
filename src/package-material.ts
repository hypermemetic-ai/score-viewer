/** The ordinary admission material budget. This is a conservative count of
 * retained bytes and UTF-16 plain-data content, not an exact VM heap ceiling. */
export const PACKAGE_MATERIAL_BUDGET_BYTES=64*1024*1024;

/** Count each shared object/view once, using the existing admission formula.
 * A finite bound stops traversal as soon as the material is already too large.
 * Callers pass their owned graphs; this function grants no admission authority. */
export function conservativeMaterialBytes(value:unknown,maximum=Infinity):number {
 const counted=new Set<object>();let bytes=0;
 const visit=(item:unknown):void=>{
  if(bytes>maximum)return;
  if(typeof item==='string'){bytes+=item.length*2;return;}
  if(!item||typeof item!=='object'){bytes+=16;return;}
  if(counted.has(item))return;counted.add(item);
  if(item instanceof Uint8Array){bytes+=item.byteLength+64;return;}
  bytes+=64;
  for(const [key,child]of Object.entries(item)){
   if(bytes>maximum)break;
   bytes+=32+key.length*2;visit(child);
  }
 };
 visit(value);return bytes;
}
