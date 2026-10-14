import type {EditorAdviceResult,EditorAdviceWarning} from './fingering-advice';

export interface AdviceRect {x:number;y:number;width:number;height:number}
export interface AdviceOwnerGeometry {ownerIds:readonly string[];page:number;bounds:AdviceRect}
export interface AdviceMarker {ownerIds:string[];page:number;x:number;y:number;radius:number;label:string;warning:EditorAdviceWarning}
const overlaps=(a:AdviceRect,b:AdviceRect)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
const validRect=(r:AdviceRect)=>[r.x,r.y,r.width,r.height].every(Number.isFinite)&&r.width>=0&&r.height>=0;
/** Small overlays use the admitted rendered owner bounds, never change the notation's placement obstacles. */
export function layoutAdviceMarkers(result:EditorAdviceResult|undefined,mode:'edit'|'read'|'practice',page:number,owners:readonly AdviceOwnerGeometry[],ink:readonly AdviceRect[],viewport:AdviceRect):AdviceMarker[] {
 if(!result||mode!=='edit'||!validRect(viewport)||ink.some(r=>!validRect(r)))return[];
 const markers:AdviceMarker[]=[],seen=new Set<string>(),obstacles=[...ink],radius=3,gap=3;
 for(const warning of result.warnings)for(const geometry of owners){
  if(geometry.page!==page||!geometry.ownerIds.some(id=>warning.transition.targetOwnerIds.includes(id))||!validRect(geometry.bounds))continue;
  const key=JSON.stringify([geometry.ownerIds,geometry.bounds]);if(seen.has(key))continue;seen.add(key);
  const r=geometry.bounds,candidates:Array<[number,number]>=[];
  for(const distance of [gap+radius,gap+radius*3,gap+radius*5]){
   candidates.push([r.x+r.width+distance,r.y+r.height/2],[r.x-distance,r.y+r.height/2],
    [r.x+r.width/2,r.y-distance],[r.x+r.width/2,r.y+r.height+distance]);
  }
  for(const [x,y]of candidates){const box={x:x-radius-gap/2,y:y-radius-gap/2,width:(radius+gap/2)*2,height:(radius+gap/2)*2};
   if(box.x<viewport.x||box.y<viewport.y||box.x+box.width>viewport.x+viewport.width||box.y+box.height>viewport.y+viewport.height||overlaps(box,r)||obstacles.some(o=>overlaps(box,o)))continue;
   markers.push({ownerIds:[...geometry.ownerIds],page,x,y,radius,label:adviceExplanation(warning),warning});obstacles.push(box);break;
  }
 }
 return markers;
}
const fmt=(n:number,digits=1)=>Number(n.toFixed(digits)).toString();
export function adviceExplanation(warning:EditorAdviceWarning,ownerLabel:(ids:readonly string[])=>string=ids=>ids.join(', ')):string {
 const t=warning.transition,route=`${t.hand==='LH'?'Left':'Right'} hand, finger ${t.finger}: ${ownerLabel(t.sourceOwnerIds)} → ${ownerLabel(t.targetOwnerIds)}.`;
 const motion=` ${fmt(t.distanceMm/10)} cm; ${fmt(t.availableMs,0)} ms available${t.speedMps===null?'.':`; ${fmt(t.speedMps*100)} cm/s.`}`;
 const reasons=warning.reasons.map(reason=>reason==='fast'?'Above your travel threshold.':reason==='no-available-time'?'No time remains after the previous contact releases.':`Above the 95th percentile of ${warning.unusual?.independentSamples??0} comparable personal choices.`).join(' ');
 return `${route}${motion} ${reasons}`;
}
export function selectedAdviceExplanations(result:EditorAdviceResult|undefined,mode:'edit'|'read'|'practice',ownerIds:readonly string[],ownerLabel?:(ids:readonly string[])=>string):string[] {
 if(mode!=='edit'||!result)return[];return [...new Set(result.warnings.filter(w=>[...w.transition.sourceOwnerIds,...w.transition.targetOwnerIds].some(id=>ownerIds.includes(id))).map(w=>adviceExplanation(w,ownerLabel)))];
}
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
/** Overlay markup can be appended to the page SVG after normal notation layout. */
export function adviceMarkerSvg(markers:readonly AdviceMarker[]):string {
 return markers.map(m=>`<circle class="fingering-advice-marker" cx="${m.x}" cy="${m.y}" r="${m.radius}" role="img" aria-label="${escape(m.label)}"><title>${escape(m.label)}</title></circle>`).join('');
}
