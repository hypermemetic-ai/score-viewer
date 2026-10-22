import type {ScorePackage} from './package';
import {actualPageObstacles,type AnnotationBox} from './svg-annotation-clearance';
import {annotationInkPolicyFor} from './annotation-ink-policy';
import {annotationPositions} from './fingering-presentation';
import {layoutAdviceMarkers,adviceMarkerSvg,adviceExplanation,type AdviceRect} from './fingering-advice-markers';
import type {EditorAdviceResult,EditorAdviceWarning} from './fingering-advice';
export function editorAdviceMarkerLabel(p:Pick<ScorePackage,'seats'>,warning:EditorAdviceWarning):string {
 return adviceExplanation(warning,ids=>{
  const bars=[...new Set(p.seats.filter(seat=>!seat.continuation&&seat.ownerIds.some(id=>ids.includes(id))).map(seat=>seat.writtenBar))].sort((a,b)=>a-b);
  return bars.length?`${bars.length===1?'bar':'bars'} ${bars.join(', ')}`:'contact';
 });
}
const rect=(box:readonly number[]):AdviceRect=>({x:box[0],y:box[1],width:box[2]-box[0],height:box[3]-box[1]});
/** Append only after the score has been laid out. Never enter the engraving
 * obstacle set or survive the editor context that requested these warnings. */
export function paintEditorAdvice(page:HTMLElement,p:ScorePackage,index:number,result:EditorAdviceResult|undefined,editing:boolean){
 page.querySelector('[data-fingering-advice]')?.remove();if(!editing||!result||!p.annotationGeometry)return;
 const svg=page.querySelector('svg');if(!svg)return;
 const seats=p.annotationGeometry.seats.filter(s=>s.page===index),heads=new Map(seats.map(s=>[s.seatId,[s.headBounds.x0,s.headBounds.y0,s.headBounds.x1,s.headBounds.y1] as AnnotationBox]));
 const obstacles=actualPageObstacles(p.pages[index],heads,annotationInkPolicyFor(p)),positions=annotationPositions(p,[index]);
 const owners=p.seats.filter(s=>s.page===index&&heads.has(s.id)).map(s=>({ownerIds:s.ownerIds,page:index,bounds:rect(heads.get(s.id)!)}));
 const ink=[...obstacles.boxes.map(rect),...[...positions.values()].map(position=>rect(position.bounds))];
 const markers=layoutAdviceMarkers(result,'edit',index,owners,ink,{x:0,y:0,width:obstacles.width,height:obstacles.height}).map(marker=>({...marker,label:editorAdviceMarkerLabel(p,marker.warning)}));
 if(!markers.length)return;const group=document.createElementNS('http://www.w3.org/2000/svg','g');group.dataset.fingeringAdvice='';group.innerHTML=adviceMarkerSvg(markers);svg.append(group);
}
