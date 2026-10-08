import type {ScorePackage,Seat} from './package';
import type {PracticePlan} from './practice';
import {cropMeasure,type Crop,type PassageTrack} from './practice-passage';
import {taperedSpanPath,tieArcPath,tieArcEntersBoxes,tieArcSegments} from '../vendor/iso-notation/src/render/janko/ties';
import {expressionIntersectsBox,expressionsOverlap,expressionContourOutwardShift,expressionSliceAtX,type ExpressionInk} from '../vendor/iso-notation/src/render/janko/elements/expressions';
type Contour=NonNullable<ExpressionInk['contour']>;
export interface InkBox {x0:number;x1:number;y0:number;y1:number}
interface Fragment {path:SVGPathElement;frame:number;page:number;system:number;contour:Contour}
interface Relation {id:string;kind:'phrase'|'tie';start:number;end:number;from:Seat;to:Seat;first:Fragment;last:Fragment;groups:string[]}
export interface ProjectedRelation {id:string;kind:'phrase'|'tie';groups:string[];path:SVGPathElement;contour:Contour;left:number;right:number;knockout:boolean;bounds:InkBox}
const cache=new WeakMap<ScorePackage,Relation[]>();
/** Decode the retained tapered ribbon; all projected tips originate here. */
function contour(path:SVGPathElement):Contour {
 const d=path.getAttribute('d')??'',commands=d.match(/[A-Za-z]/g)?.join(''),v=d.match(/[+-]?(?:\d*\.)?\d+/g)?.map(Number)??[];
 if(commands==='MQ'&&v.length===6){const [xStart,yStart,cx,cy,xEnd,yEnd]=v,side: -1|1=cy-(yStart+yEnd)/2<0?-1:1;return {xStart,xEnd,yStart,yEnd,side,depth:Math.abs(cy-(yStart+yEnd)/2)/2,thickness:Number(path.getAttribute('stroke-width'))||.7,indent:cx-xStart};}
 if(commands==='MC'&&v.length===8){const [xStart,yStart,ax,ay,bx,by,xEnd,yEnd]=v,w=xEnd-xStart,side: -1|1=path.getAttribute('data-tie-side')==='below'?1:-1;return {xStart,xEnd,yStart,yEnd,side,depth:Math.max(.5,Math.abs(ay-yStart),Math.abs(by-yEnd),Math.abs(yEnd-yStart)),thickness:Number(path.getAttribute('stroke-width'))||.7,indent:(ax-xStart+xEnd-bx)/2,startIndent:ax-xStart,endIndent:xEnd-bx};}
 if(commands!=='MCLCZ'||v.length!==16||v[6]<=v[0]||Math.abs(v[8]-v[6])>.03||Math.abs(v[14]-v[0])>.03)throw Error('Unsupported source relation contour.');
 const [xStart,yStart,ax,ay,bx,by,xEnd,yEnd]=v,w=xEnd-xStart,aAxis=yStart+(yEnd-yStart)*(ax-xStart)/w,bAxis=yStart+(yEnd-yStart)*(bx-xStart)/w,side: -1|1=ay+by-aAxis-bAxis<0?-1:1,tipThickness=Math.abs(v[9]-yEnd),body=Math.abs(ay-v[13]);
 return {xStart,xEnd,yStart,yEnd,side,depth:Math.max(.5,Math.abs(ay-aAxis)*.75,Math.abs(by-bAxis)*.75),startDepth:Math.abs(ay-aAxis)*.75,endDepth:Math.abs(by-bAxis)*.75,thickness:tipThickness?(3*body+tipThickness)/4:body*.75,indent:(ax-xStart+xEnd-bx)/2,startIndent:ax-xStart,endIndent:xEnd-bx,chordAligned:true,...(tipThickness?{tipThickness}:{})};
}
function sources(p:ScorePackage,plan:PracticePlan):Relation[]{
 const saved=cache.get(p);if(saved)return saved;const fragments=new Map<string,Fragment[]>();
 for(const [page,svg]of p.pages.entries()){
  const doc=new DOMParser().parseFromString(svg,'image/svg+xml');
  for(const system of doc.querySelectorAll('[id^="system-"]')){
   const lanes=[...system.querySelectorAll<SVGLineElement>('.janko-pitch-lane')],span=Math.max(...lanes.map(l=>Number(l.getAttribute('x2'))-Number(l.getAttribute('x1')))),frame=Math.min(...lanes.filter(l=>Math.abs(Number(l.getAttribute('x2'))-Number(l.getAttribute('x1'))-span)<.03).map(l=>Number(l.getAttribute('y1'))));
   for(const path of system.querySelectorAll<SVGPathElement>('.janko-phrase[data-phrase],path[data-tie-note]')){
    const id=path.hasAttribute('data-phrase')?'phrase:'+path.getAttribute('data-phrase'):`tie:${path.getAttribute('data-tie-note')}:${path.getAttribute('data-tie-component')}`;
    const group=fragments.get(id)??[];group.push({path,frame,page,system:Number(system.id.slice(7))-1,contour:contour(path)});fragments.set(id,group);
   }
  }
 }
 const relations:Relation[]=[];
 for(const [id,parts]of fragments){
  const kind=id.startsWith('phrase:')?'phrase':'tie',phrase=kind==='phrase'?p.score.phrases?.find(q=>'phrase:'+q.id===id):undefined,firstPath=parts[0].path;
  const fromIds=phrase?.fromNoteIds??[firstPath.getAttribute('data-tie-from')!],toIds=phrase?.toNoteIds??[firstPath.getAttribute('data-tie-to')!],start=phrase?.startTick??Number(firstPath.getAttribute('data-tie-from-tick')),end=phrase?.endTick??Number(firstPath.getAttribute('data-tie-to-tick'));
  if(!fromIds.length||!toIds.length||!Number.isFinite(start)||!Number.isFinite(end))throw Error(`Unresolved relation endpoints: ${id}.`);
  const original=(id:string)=>id.replace(/~c\d+$/,'');
  const anchor=(ids:string[],tick:number,ending:boolean)=>{
   const candidates=p.seats.filter(s=>s.ownerIds.some(owner=>ids.map(original).includes(owner))&&tick>=plan.barTicks[s.writtenBar-1]&&tick<plan.barTicks[s.writtenBar]);
   const pairs=parts.flatMap(part=>candidates.filter(s=>s.page===part.page&&s.system===part.system).map(seat=>({seat,part,distance:Math.abs(seat.x-(ending?part.contour.xEnd:part.contour.xStart))}))).sort((a,b)=>a.distance-b.distance);
   // A source-associated chord may have several heads in the same verified
   // column. They produce the identical display transform and are all kept
   // as relation contributors; distinct tied columns remain ambiguous.
   const equal=pairs.filter(q=>q.distance===pairs[0]?.distance),sameColumn=equal.every(q=>q.seat.x===pairs[0].seat.x&&q.seat.writtenBar===pairs[0].seat.writtenBar&&q.part.page===pairs[0].part.page&&q.part.system===pairs[0].part.system);
   if(!pairs.length||pairs[0].distance>24||!sameColumn)throw Error(`Ambiguous source relation endpoint: ${id}.`);
   return pairs[0];
  };
  const a=anchor(fromIds,start,false),b=anchor(toIds,end,true);
  if(a.part.contour.side!==b.part.contour.side)throw Error(`Incompatible source relation sides: ${id}.`);
  const owners=kind==='tie'?[original(firstPath.getAttribute('data-tie-note')!)]:[...fromIds,...toIds].map(original),hands=new Set(p.score.notes.filter(n=>owners.includes(n.id)).map(n=>n.hand));
  const groups=[...new Set([...owners.map(owner=>plan.ownerGroup.get(owner)),...(kind==='phrase'?plan.gestures.filter(g=>g.start<=end&&g.end>=start&&hands.has(g.hand)).map(g=>g.id):[])].filter((g):g is string=>!!g))];
  if(!groups.length)throw Error(`Unresolved relation contributors: ${id}.`);
  relations.push({id,kind,start,end,from:a.seat,to:b.seat,first:a.part,last:b.part,groups});
 }
 cache.set(p,relations);return relations;
}
function overlaps(a:ExpressionInk,b:ExpressionInk){
 const stroke=a.strokeSegments?a:b.strokeSegments?b:undefined,other=stroke===a?b:a;
 if(!stroke)return expressionsOverlap(a,b);
 return stroke.strokeSegments!.some(s=>expressionIntersectsBox(other,{x0:Math.min(s.x0,s.x1)-s.width/2,x1:Math.max(s.x0,s.x1)+s.width/2,y0:Math.min(s.y0,s.y1)-s.width/2,y1:Math.max(s.y0,s.y1)+s.width/2}));
}
/** Relations are projected independently of frozen note seats. Source identities
 * select tips, source contours supply side/body/taper, and the pinned primitive
 * paints one complete ribbon. Runs never bridge a nonconsecutive source wrap. */
export function projectRelations(p:ScorePackage,plan:PracticePlan,crops:Crop[],track:PassageTrack,policy:'compact'|'fixed',positions:Array<number|undefined>,placements?:ReadonlyArray<{bar:number;x:number}>):ProjectedRelation[]{
 const selected=positions.filter((b):b is number=>b!==undefined),min=Math.min(...selected),max=Math.max(...selected),relations=sources(p,plan).filter(q=>q.end>=plan.barTicks[min]&&q.start<plan.barTicks[max+1]),offsets:number[]=[];let x=0;
 for(const bar of positions){if(placements&&bar!==undefined){const placement=placements.find(p=>p.bar===bar);if(!placement)throw Error(`Measure ${bar+1}: missing admitted relation placement.`);x=placement.x;}offsets.push(x);const c=crops.find(c=>c.bar===bar);x+=policy==='fixed'?track.width:c?c.right-c.left:0;}
 const runs:Array<{first:number;last:number}>=[];for(let slot=0;slot<positions.length;slot++){if(positions[slot]===undefined)continue;const last=runs.at(-1);if(last&&positions[last.last]!+1===positions[slot])last.last=slot;else runs.push({first:slot,last:slot});}
 const output:ProjectedRelation[]=[];
 // Different source runs have disjoint clips and an explicit staff break.
 // Ghost endpoints outside one clip must not displace a bow in another run.
 for(const run of runs){const settled:ExpressionInk[]=[],aBar=positions[run.first]!,bBar=positions[run.last]!,left=offsets[run.first],last=crops.find(c=>c.bar===bBar)!,right=offsets[run.last]+(policy==='fixed'?track.width:last.right-last.left);
  const mapped=(seat:Seat,sourceX:number)=>{
   const bar=seat.writtenBar-1,c=crops.find(c=>c.bar===bar);
   if(bar>=aBar&&bar<=bBar){if(!c)throw Error('Missing displayed relation source interval.');return offsets[positions.indexOf(bar)]+sourceX-c.left;}
   // Verified source endpoints outside the displayed run remain outside its
   // clip. Ghost positions preserve continuation meaning without new attacks.
   if(policy==='fixed'){const own=c??interval(p,plan,bar);return left+(bar-aBar)*track.width+sourceX-own.left;}
   const own=c??interval(p,plan,bar);let distance=0;
   for(let b=Math.min(bar,aBar);b<Math.max(bar,aBar);b++){const intervalCrop=crops.find(c=>c.bar===b)??interval(p,plan,b);distance+=intervalCrop.right-intervalCrop.left;}
   return left+(bar<aBar?-distance:distance)+sourceX-own.left;
  };
  const obstacles=positions.flatMap((bar,slot)=>{if(slot<run.first||slot>run.last||bar===undefined)return [];const c=crops.find(c=>c.bar===bar)!;return (track.boxes.get(bar)??[]).map(b=>({x0:offsets[slot]+b.x0-c.left,x1:offsets[slot]+b.x1-c.left,y0:b.y0-c.frame,y1:b.y1-c.frame}));});
  for(const q of relations.filter(q=>q.end>=plan.barTicks[aBar]&&q.start<plan.barTicks[bBar+1]).sort((a,b)=>Number(a.kind==='phrase')-Number(b.kind==='phrase')||a.end-a.start-(b.end-b.start))){
   const first=q.first.contour,last=q.last.contour,xStart=mapped(q.from,first.xStart),xEnd=mapped(q.to,last.xEnd);if(xEnd<=left||xStart>=right)continue;if(xEnd<=xStart)throw Error(`Nonpositive projected relation: ${q.id}.`);
   const width=xEnd-xStart,c:Contour={xStart,xEnd,yStart:first.yStart-q.first.frame,yEnd:last.yEnd-q.last.frame,side:first.side,depth:Math.max(first.depth,last.depth),startDepth:first.startDepth??first.depth,endDepth:last.endDepth??last.depth,thickness:first.thickness,indent:width*.21,startIndent:width*(first.startIndent??first.indent)/(first.xEnd-first.xStart),endIndent:width*(last.endIndent??last.indent)/(last.xEnd-last.xStart),chordAligned:true,...(first.tipThickness!==undefined?{tipThickness:first.tipThickness}:{})};
   const ink:ExpressionInk={kind:'phrase',id:q.id,startTick:q.start,endTick:q.end,continuationStart:q.start<plan.barTicks[aBar],continuationEnd:q.end>=plan.barTicks[bBar+1],contour:c,x0:xStart,x1:xEnd,y0:0,y1:0,svg:''};
   const uniform=q.first.path.getAttribute('data-tie-profile')==='uniform',arc=()=>({x1:c.xStart,x2:c.xEnd,y:c.yStart,side:c.side,depth:c.depth,profile:'uniform' as const,thickness:c.thickness}),knockout=q.first.path.previousElementSibling?.classList.contains('janko-phrase-grid-knockout')??false,air=knockout?.75:.35,protectedBoxes=obstacles.map((b,i)=>({id:String(i),x0:Math.max(left,b.x0-air),x1:Math.min(right,b.x1+air),y0:b.y0-air,y1:b.y1+air}));
   let admitted=false;for(let step=0;step<33;step++){
    const ay=c.yStart+(c.yEnd-c.yStart)*(c.startIndent??c.indent)/width+c.side*c.depth/.75,by=c.yEnd-(c.yEnd-c.yStart)*(c.endIndent??c.indent)/width+c.side*c.depth/.75;ink.y0=Math.min(c.yStart,c.yEnd,ay,by)-1;ink.y1=Math.max(c.yStart,c.yEnd,ay,by)+1;
    if(uniform){ink.contour=undefined;ink.strokeSegments=tieArcSegments(arc(),256).map(s=>({x0:s.x1,y0:s.y1,x1:s.x2,y1:s.y2,width:c.thickness}));}
    const hits=protectedBoxes.filter(b=>uniform?tieArcEntersBoxes(arc(),[b],p.renderingRecipe?.tokens):expressionIntersectsBox(ink,b)),overlap=settled.some(other=>overlaps(ink,other));
    if(!hits.length&&!overlap){admitted=true;break;}
    // Only actual intersecting paint earns a quiet corridor. An unrelated
    // pedal/dynamic far below a clear bow must never displace its endpoints.
    const shift=hits.length?Math.max(.1,expressionContourOutwardShift(c,hits)+.02):2;c.yStart+=c.side*shift;c.yEnd+=c.side*shift;
   }
   if(!admitted)throw Error(`Relation has no admitted passage clearance: ${q.id}.`);
   const path=document.importNode(q.first.path,true);if(uniform&&Math.abs(c.yStart-c.yEnd)>.03)throw Error(`Uniform source tie endpoints differ: ${q.id}.`);path.setAttribute('d',uniform?tieArcPath(c.xStart,c.yStart,c.xEnd,c.side,c.depth,'uniform',c.thickness):taperedSpanPath(c.xStart,c.yStart,c.xEnd,c.yEnd,c.side,c.depth,c.thickness,c.indent,c));path.setAttribute('data-practice-relation',q.id);path.setAttribute('data-practice-continuation-start',String(ink.continuationStart));path.setAttribute('data-practice-continuation-end',String(ink.continuationEnd));path.setAttribute('data-practice-from-seat',q.from.id);path.setAttribute('data-practice-to-seat',q.to.id);path.setAttribute('data-practice-source-tip-offsets',JSON.stringify([first.xStart-q.from.x,first.yStart-q.from.baseline,last.xEnd-q.to.x,last.yEnd-q.to.baseline]));path.setAttribute('data-practice-clearance-shift',String(c.yStart-(first.yStart-q.first.frame)));path.removeAttribute('id');
   const x0=Math.max(left,xStart),x1=Math.min(right,xEnd),ys:Array<number>=[];for(let i=0;i<=256;i++){const xx=x0+(x1-x0)*i/256,u=(xx-c.xStart)/width,slice=uniform?[c.yStart+c.side*4*c.depth*u*(1-u)]:expressionSliceAtX(ink,xx);ys.push(...(slice??[xx<=xStart?c.yStart:c.yEnd]));}const edge=knockout?.6:Number(path.getAttribute('stroke-width'))/2||0,bounds={x0,x1,y0:Math.min(...ys)-edge-.1,y1:Math.max(...ys)+edge+.1};output.push({id:q.id,kind:q.kind,groups:q.groups,path,contour:c,left,right,knockout,bounds});settled.push(ink);
  }
 }
 return output;
}
const intervalCache=new WeakMap<ScorePackage,Map<number,{left:number;right:number}>>();
function interval(p:ScorePackage,plan:PracticePlan,bar:number){
 let saved=intervalCache.get(p);if(!saved){saved=new Map();intervalCache.set(p,saved);}if(saved.has(bar))return saved.get(bar)!;
 const result=cropMeasure(p,plan,bar);saved.set(bar,result);return result;
}
