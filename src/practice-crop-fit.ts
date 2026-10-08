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
/** Keep all original leaf bars visible together; use two rows only below a readable scale. */
export function fitLeafPreview(root:HTMLElement){
 const svgs=[...root.querySelectorAll<SVGSVGElement>('svg')];if(!svgs.length)return;
 svgs.forEach(tightenSourceCrop);const width=root.clientWidth,sum=svgs.reduce((n,s)=>n+s.viewBox.baseVal.width,0),rows=width/sum<.65&&svgs.length>2?2:1;
 root.dataset.rows=String(rows);root.style.gridTemplateColumns=rows===1?svgs.map(s=>`${s.viewBox.baseVal.width}fr`).join(' '):'repeat(2,minmax(0,1fr))';
 const h=Math.max(...svgs.map(s=>s.viewBox.baseVal.height)),scale=Math.min(2,(width-(rows===1?svgs.length-1:1)*4)/(rows===1?sum:Math.max(...svgs.map(s=>s.viewBox.baseVal.width))*2));
 for(const svg of svgs){(svg.parentElement as HTMLElement).style.height=`${h*scale+18}px`;svg.style.height=`${h*scale}px`;}
}
