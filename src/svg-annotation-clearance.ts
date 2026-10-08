import {DOMParser} from '@xmldom/xmldom';
import {svgClassStyles,resolvedSvgStyle} from './svg-style';
import {footerGlyphPoints,type ViewerAnnotationInkPolicy} from './annotation-ink-policy';
export type AnnotationBox=[number,number,number,number];
type Matrix=[number,number,number,number,number,number];
const unit:Matrix=[1,0,0,1,0,0];
const mul=(a:Matrix,b:Matrix):Matrix=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
const numbers=(s:string)=>s.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi)?.map(Number)??[];
function transform(s:string):Matrix{
 let m=unit;const pattern=/([a-z]+)\s*\(([^)]*)\)/gi;let end=0;
 for(const match of s.matchAll(pattern)){if(s.slice(end,match.index).trim().replace(/,/g,''))throw Error('Unsupported SVG transform');
  const n=numbers(match[2]);let b:Matrix;const kind=match[1];
  if(kind==='translate'&&(n.length===1||n.length===2))b=[1,0,0,1,n[0],n[1]??0];
  else if(kind==='scale'&&(n.length===1||n.length===2))b=[n[0],0,0,n[1]??n[0],0,0];
  else if(kind==='matrix'&&n.length===6)b=n as Matrix;
  else if(kind==='rotate'&&(n.length===1||n.length===3)){const t=n[0]*Math.PI/180,c=Math.cos(t),q=Math.sin(t);b=[c,q,-q,c,0,0];if(n.length===3)b=mul(mul([1,0,0,1,n[1],n[2]],b),[1,0,0,1,-n[1],-n[2]]);}
  else throw Error('Unsupported SVG annotation transform: '+kind);
  if(!b.every(Number.isFinite))throw Error('Nonfinite SVG transform');m=mul(m,b);end=match.index!+match[0].length;
 }if(s.slice(end).trim())throw Error('Unsupported SVG transform');return m;
}
function pointsBox(points:Array<[number,number]>,m:Matrix,stroke=0):AnnotationBox{
 if(!points.length)throw Error('Empty painted SVG geometry');
 if(points.some(p=>p.some(n=>!Number.isFinite(n))))throw Error('Nonfinite painted SVG geometry');
 const p=points.map(([x,y])=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]]),pad=stroke/2*Math.hypot(m[0],m[1],m[2],m[3]);
 if(!Number.isFinite(pad)||p.some(p=>p.some(n=>!Number.isFinite(n))))throw Error('Unbounded transformed SVG geometry');
 return[Math.min(...p.map(p=>p[0]))-pad,Math.min(...p.map(p=>p[1]))-pad,Math.max(...p.map(p=>p[0]))+pad,Math.max(...p.map(p=>p[1]))+pad];
}
type Point=[number,number];
/** Only a proven x-monotone, noncrossing paired cubic ribbon gets this cover.
 * Equal x controls give the SAME x(t) on both boundaries. Every filled strip
 * at one parameter interval lies in the combined two-curve control hull.
 * End connectors are inside its first/last hull; ordinary stroke padding stays. */
function pairedRibbonHulls(d:string):Point[][]|undefined{
 const token=/[a-df-z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi,t=d.match(token)??[];
 if(d.replace(token,'').replace(/[\s,]/g,'')||t.length!==21||[0,3,10,13,20].some((i,j)=>t[i]!==['M','C','L','C','Z'][j]))return;
 const n=t.map(Number),a:Point[]=[[n[1],n[2]],[n[4],n[5]],[n[6],n[7]],[n[8],n[9]]],
  b:Point[]=[[n[18],n[19]],[n[16],n[17]],[n[14],n[15]],[n[11],n[12]]];
 const valid=(a:Point[],b:Point[])=>{
  if([...a,...b].some(p=>p.some(n=>!Number.isFinite(n)))||a.some((p,i)=>p[0]!==b[i][0]))return false;
  const delta=a[3][0]-a[0][0],dx=a.slice(1).map((p,i)=>p[0]-a[i][0]),dy=a.map((p,i)=>b[i][1]-p[1]),direction=Math.sign(delta);
  return Number.isFinite(delta)&&[...dx,...dy].every(Number.isFinite)&&direction!==0&&dx.every(v=>v*direction>=0)&&
   (dy.some(v=>v>0)&&dy.every(v=>v>=0)||dy.some(v=>v<0)&&dy.every(v=>v<=0));
 };
 if(!valid(a,b))return;
 const midpoint=(a:Point,b:Point):Point=>[a[0]/2+b[0]/2,a[1]/2+b[1]/2],split=(p:Point[])=>{
  const q=[midpoint(p[0],p[1]),midpoint(p[1],p[2]),midpoint(p[2],p[3])],r=[midpoint(q[0],q[1]),midpoint(q[1],q[2])],s=midpoint(r[0],r[1]);
  return[[p[0],q[0],r[0],s],[s,r[1],q[2],p[3]]];
 };
 let pairs=[[a,b]];
 for(let level=0;level<4;level++){const next:Point[][][]=[];
  for(const [a,b]of pairs){const left=split(a),right=split(b);for(let i=0;i<2;i++){if(!valid(left[i],right[i]))return;next.push([left[i],right[i]]);}}
  pairs=next;
 }
 return pairs.map(([a,b])=>[...a,...b]); // exactly sixteen bounded partitions
}
/** Bézier curves stay inside their control hull. Reserve the entire hull;
 * unsupported commands refuse instead of inventing a narrower ink bound. */
function pathPoints(d:string):Array<[number,number]>{
 const tokens=d.match(/[a-df-z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi)??[],points:Array<[number,number]>=[];
 let i=0,x=0,y=0,sx=0,sy=0,cmd='';
 while(i<tokens.length){if(/^[a-z]$/i.test(tokens[i]))cmd=tokens[i++];if(!cmd)throw Error('Malformed SVG path');
  const upper=cmd.toUpperCase(),relative=cmd!==upper,count=({M:2,L:2,H:1,V:1,C:6,Q:4,Z:0} as Record<string,number>)[upper];
  if(count===undefined)throw Error('Unsupported SVG annotation path command: '+cmd);
  if(!count){x=sx;y=sy;points.push([x,y]);cmd='';continue;}
  const raw=tokens.slice(i,i+count);if(raw.length!==count||raw.some(t=>/^[a-z]$/i.test(t)))throw Error('Malformed SVG path');
  const n=raw.map(Number);i+=count;
  if(upper==='H'){x=relative?x+n[0]:n[0];points.push([x,y]);}
  else if(upper==='V'){y=relative?y+n[0]:n[0];points.push([x,y]);}
  else{const baseX=relative?x:0,baseY=relative?y:0;for(let j=0;j<count;j+=2)points.push([baseX+n[j],baseY+n[j+1]]);x=baseX+n[count-2];y=baseY+n[count-1];}
  if(upper==='M'){sx=x;sy=y;cmd=relative?'l':'L';}
 }return points;
}
export const boxesOverlap=(a:AnnotationBox,b:AnnotationBox,gap=.2)=>a[0]<b[2]+gap&&a[2]>b[0]-gap&&a[1]<b[3]+gap&&a[3]>b[1]-gap;

/** Independently inventory every rendered SVG primitive, including foreign
 * voices, curves, rests and text. Owned carrier bounds are not this inventory.
 * Foreign text reserves a full page-width band, avoiding font substitution
 * assumptions. Unsupported geometry fails closed only for NEW editions. */
export function actualPageObstacles(svg:string,heads:ReadonlyMap<string,AnnotationBox>,policy?:ViewerAnnotationInkPolicy):{width:number;height:number;boxes:AnnotationBox[]}{
 const doc=new DOMParser().parseFromString(svg,'image/svg+xml'),root=doc.documentElement!,view=numbers(root.getAttribute('viewBox')??''),
  width=view[2]??Number(root.getAttribute('width')),height=view[3]??Number(root.getAttribute('height')),boxes:AnnotationBox[]=[];
 if(view.length&& (view.length!==4||view[0]!==0||view[1]!==0)||![width,height].every(n=>Number.isFinite(n)&&n>0))throw Error('Unsupported annotation page coordinates');
 const styles=svgClassStyles(doc as unknown as Document);
 function visit(el:Element,parent:Matrix,inherited:Record<string,string>):void{
  const tag=el.localName;if(['defs','style','title','desc'].includes(tag))return;
  const style=resolvedSvgStyle(el,styles,inherited);
  if(style['vector-effect']&&style['vector-effect']!=='none'||style.filter&&style.filter!=='none')throw Error('Unsupported SVG annotation paint effect');
  const m=mul(parent,transform(el.getAttribute('transform')??'')),value=(k:string)=>{const v=el.getAttribute(k);if(v===null||!v.trim()||!Number.isFinite(Number(v)))throw Error('Unsupported SVG '+tag+' '+k);return Number(v);},
   strokeWidth=style.stroke===undefined||style.stroke==='none'?0:Number(style['stroke-width']??1),
   miter=Number(style['stroke-miterlimit']??4),join=style['stroke-linejoin']??'miter',cap=style['stroke-linecap']??'butt',
   stroke=strokeWidth*Math.max(cap==='square'?Math.SQRT2:1,join==='miter'?miter:1);
  if(!['miter','round','bevel'].includes(join)||!['butt','round','square'].includes(cap)||!Number.isFinite(miter)||miter<1)throw Error('Unsupported SVG stroke extent');
  if(!Number.isFinite(stroke)||stroke<0)throw Error('Unsupported SVG stroke bounds');
  let points:Array<[number,number]>|undefined,ribbon:Point[][]|undefined,ribbonMagnitude=0;
  if(tag==='rect'&&(el.parentNode as unknown)===root&&el.getAttribute('width')==='100%'&&el.getAttribute('height')==='100%'&&
   !el.hasAttribute('x')&&!el.hasAttribute('y')&&!el.hasAttribute('transform')&&['white','#FFFFFF','#ffffff'].includes(style.fill)&&!stroke)return;
  if(tag==='rect'){const x=value('x'),y=value('y'),w=value('width'),h=value('height');
   if(!(x===0&&y===0&&w===width&&h===height&&['white','#FFFFFF','#ffffff'].includes(style.fill)&&!stroke))points=[[x,y],[x+w,y+h],[x+w,y],[x,y+h]];
  }else if(tag==='line')points=[[value('x1'),value('y1')],[value('x2'),value('y2')]];
  else if(tag==='circle'||tag==='ellipse'){const x=value('cx'),y=value('cy'),rx=value(tag==='circle'?'r':'rx'),ry=value(tag==='circle'?'r':'ry');points=[[x-rx,y-ry],[x+rx,y+ry],[x-rx,y+ry],[x+rx,y-ry]];}
  else if(tag==='path'){const d=el.getAttribute('d')??'';ribbon=pairedRibbonHulls(d);if(!ribbon)points=pathPoints(d);
   else for(const [x,y]of pathPoints(d))ribbonMagnitude=Math.max(ribbonMagnitude,Math.abs(x),Math.abs(y),
    Math.abs(m[0]*x)+Math.abs(m[2]*y)+Math.abs(m[4]),Math.abs(m[1]*x)+Math.abs(m[3]*y)+Math.abs(m[5]));
  }
  else if(tag==='polygon'||tag==='polyline'){const n=numbers(el.getAttribute('points')??'');if(n.length%2)throw Error('Malformed SVG polygon');points=Array.from({length:n.length/2},(_,i)=>[n[2*i],n[2*i+1]]);}
  else if(tag==='text'){
   if(Array.from(el.childNodes).some(n=>n.nodeType===1)||['dx','dy','rotate','textLength','lengthAdjust','dominant-baseline','alignment-baseline'].some(k=>el.hasAttribute(k)||style[k]!==undefined))
    throw Error('Unsupported SVG text positioning in annotation clearance');
   const seat=el.getAttribute('data-viewer-seat');if(seat){const b=heads.get(seat);if(!b)throw Error('Annotation head ownership missing: '+seat);boxes.push(b);}
   else{const measured=policy?footerGlyphPoints(el,style,policy):undefined;
    if(measured){const b=pointsBox(measured,m,stroke),magnitude=Math.max(...measured.flatMap(([x,y])=>[Math.abs(x),Math.abs(y),
      Math.abs(m[0]*x)+Math.abs(m[2]*y)+Math.abs(m[4]),Math.abs(m[1]*x)+Math.abs(m[3]*y)+Math.abs(m[5])])),margin=1e-6+magnitude*Number.EPSILON*64;
     const expanded:AnnotationBox=[b[0]-margin,b[1]-margin,b[2]+margin,b[3]+margin];
     if(expanded.some(n=>!Number.isFinite(n)))throw Error('Unbounded measured SVG text');boxes.push(expanded);
    }else{const raw=style['font-size']??'',size=parseFloat(raw)*(raw.endsWith('pt')?4/3:1);if(!Number.isFinite(size)||size<=0)throw Error('Unmeasured SVG text');
     const y=value('y'),band=pointsBox([[0,y-size*2],[width,y+size]],m,stroke);boxes.push([0,band[1],width,band[3]]);}}
   return;
  }else if(!['svg','g'].includes(tag))throw Error('Unsupported SVG annotation element: '+tag);
  if(ribbon)for(const hull of ribbon){const b=pointsBox(hull,m,stroke),margin=1e-6+Math.max(ribbonMagnitude,...b.map(Math.abs))*Number.EPSILON*64,
   expanded:AnnotationBox=[b[0]-margin,b[1]-margin,b[2]+margin,b[3]+margin];
   if(expanded.some(n=>!Number.isFinite(n)))throw Error('Unbounded paired SVG ribbon');boxes.push(expanded);
  }else if(points)boxes.push(pointsBox(points,m,stroke));
  for(const child of Array.from(el.childNodes))if(child.nodeType===1)visit(child as Element,m,style);
 }
 visit(root as unknown as Element,unit,{});return{width,height,boxes};
}
