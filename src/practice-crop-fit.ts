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
/** One complete passage frame, fitted without independent crop scales/rows. */
export function fitLeafPreview(root:HTMLElement){
 const svgs=[...root.querySelectorAll<SVGSVGElement>(':scope > svg, :scope > section > svg')];if(!svgs.length)return;const svg=svgs[0];
 const logicalTop=(el:HTMLElement)=>{let top=0;for(let node:HTMLElement|null=el;node;node=node.offsetParent as HTMLElement|null)top+=node.offsetTop;return top;};
 const overview=root.closest<HTMLElement>('.practice-overview'),available=overview?Math.max(80,overview.clientHeight-(logicalTop(root)-logicalTop(overview))-12):Infinity,style=getComputedStyle(root),width=Math.max(1,root.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)),boxes=svgs.map(s=>s.viewBox.baseVal),captions=[...root.querySelectorAll<HTMLElement>(':scope > section > small')].reduce((n,s)=>n+s.offsetHeight,0),gap=svgs.length>1?12*(svgs.length-1):0,scale=Math.min(width/Math.max(...boxes.map(b=>b.width)),Math.max(1,available-captions-gap)/boxes.reduce((n,b)=>n+b.height,0));root.dataset.rows=String(svgs.length);svgs.forEach((s,i)=>{s.style.width=`${boxes[i].width*scale}px`;s.style.height=`${boxes[i].height*scale}px`;});
}
