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
 const svg=root.querySelector<SVGSVGElement>(':scope > svg');if(!svg)return;
 const logicalTop=(el:HTMLElement)=>{let top=0;for(let node:HTMLElement|null=el;node;node=node.offsetParent as HTMLElement|null)top+=node.offsetTop;return top;};
 const box=svg.viewBox.baseVal,overview=root.closest<HTMLElement>('.practice-overview'),available=overview?Math.max(80,overview.clientHeight-(logicalTop(root)-logicalTop(overview))-12):Infinity,style=getComputedStyle(root),width=Math.max(1,root.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)),scale=Math.min(width/box.width,available/box.height);root.dataset.rows='1';svg.style.width=`${box.width*scale}px`;svg.style.height=`${box.height*scale}px`;
}
