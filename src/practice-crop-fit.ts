/** Bounds of genuine placed source ink, intersected with this source-bar slice. */
export function tightenSourceCrop(svg:SVGSVGElement){
 const box=svg.viewBox.baseVal,root=svg.getScreenCTM();if(!root)return;
 const inverse=root.inverse(),ys:number[]=[];
 for(const el of svg.querySelectorAll<SVGGraphicsElement>('path,line,rect,circle,ellipse,polygon,polyline,text')){
  if(el.closest('defs,clipPath,mask')||el.classList.contains('practice-playhead'))continue;
  const matrix=el.getScreenCTM();if(!matrix)continue;const b=el.getBBox();if(!b.width&&!b.height)continue;
  const m=inverse.multiply(matrix),points=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(m));
  if(Math.max(...points.map(p=>p.x))<box.x||Math.min(...points.map(p=>p.x))>box.x+box.width)continue;
  ys.push(...points.map(p=>p.y));
 }
 if(!ys.length)return;const top=Math.min(...ys)-2,bottom=Math.max(...ys)+2;
 svg.setAttribute('viewBox',`${box.x} ${top} ${box.width} ${bottom-top}`);
}
/** Literal preview room, before scaling: all rows share this one frame. */
export function practicePreviewRoom(root:HTMLElement){
 const logicalTop=(el:HTMLElement)=>{let top=0;for(let node:HTMLElement|null=el;node;node=node.offsetParent as HTMLElement|null)top+=node.offsetTop;return top;};
 const overview=root.closest<HTMLElement>('.practice-overview'),style=getComputedStyle(root);
 return {width:Math.max(1,root.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)),
  height:overview?Math.max(80,overview.clientHeight-(logicalTop(root)-logicalTop(overview))-12):Infinity};
}
/** Choose visual rows from actual source-frame proportions, not section bars.
 * This changes layout only; each row still uses the shared source crop renderer. */
export function practicePreviewRowCount(bars:number,width:number,height:number,room:{width:number;height:number}){
 if(bars<2||!(width>0&&height>0&&room.width>0)||!Number.isFinite(room.height))return 1;
 // Keep ordinary frames stable; only heavily reduced source needs reflow.
 // This is a display trigger, not a guarantee of musician readability.
 if(Math.min(room.width/width,room.height/height)>=.6)return 1;
 const optimum=Math.sqrt(width*room.height/(height*room.width));
 return Math.max(1,Math.min(bars,Math.round(optimum)));
}
/** Complete source rows fitted at one common scale, including caption/gap room. */
export function fitLeafPreview(root:HTMLElement){
 const svgs=[...root.querySelectorAll<SVGSVGElement>(':scope > svg, :scope > section > svg')];if(!svgs.length)return;
 if(svgs.length>1){root.style.flexDirection='column';root.style.alignItems='center';root.style.gap='12px';}
 const room=practicePreviewRoom(root),boxes=svgs.map(s=>s.viewBox.baseVal),sections=[...root.querySelectorAll<HTMLElement>(':scope > section')],captions=sections.reduce((n,s)=>n+[...s.querySelectorAll<HTMLElement>(':scope > small')].reduce((m,c)=>m+c.offsetHeight,0),0);
 if(root.dataset.practiceScrollPreview==='true'){
  // Preserve source-scale ink in the bounded preview's own scroll viewport.
  root.style.maxHeight=`${room.height}px`;root.style.overflowY='auto';root.style.overflowX='hidden';root.style.justifyContent='flex-start';root.style.scrollbarGutter='stable';
  const width=practicePreviewRoom(root).width,scale=Math.min(1,width/Math.max(...boxes.map(b=>b.width)));
  sections.forEach(section=>section.style.flex='none');root.dataset.rows=String(svgs.length);svgs.forEach((s,i)=>{s.style.flex='none';s.style.width=`${boxes[i].width*scale}px`;s.style.height=`${boxes[i].height*scale}px`;});return;
 }
 const gaps=(el:HTMLElement)=>Math.max(0,el.children.length-1)*(parseFloat(getComputedStyle(el).rowGap)||0),gap=gaps(root)+sections.reduce((n,s)=>n+gaps(s),0),scale=Math.min(room.width/Math.max(...boxes.map(b=>b.width)),Math.max(1,room.height-captions-gap)/boxes.reduce((n,b)=>n+b.height,0));
 root.dataset.rows=String(svgs.length);svgs.forEach((s,i)=>{s.style.width=`${boxes[i].width*scale}px`;s.style.height=`${boxes[i].height*scale}px`;});
}
