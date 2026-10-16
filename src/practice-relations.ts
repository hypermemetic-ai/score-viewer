import {admittedWrittenHeads,type ScorePackage,type Seat} from './package';
import type {PracticePlan} from './practice';
import {cropMeasure,type Crop,type PassageTrack} from './practice-passage';
import {deriveTieDisplayPlan,taperedSpanPath,tieArcPath,tieArcEntersBoxes,tieArcSegments,tieArcDepth,tieArcInkBox} from '../vendor/iso-notation/src/render/iso/ties';
import {resolveIsoTokens} from '../vendor/iso-notation/src/render/iso/types';
import {expressionIntersectsBox,expressionsOverlap,expressionContourOutwardShift,expressionSliceAtX,type ExpressionInk} from '../vendor/iso-notation/src/render/iso/elements/expressions';
import {layoutIsoScore} from '../vendor/iso-notation/src/render/iso/engine';
import {buildInkScene} from '../vendor/iso-notation/src/render/iso/ink-scene';
import {scoreRenderingRecipeOptions,validateScoreRenderingRecipe} from '../vendor/iso-notation/src/render/iso/score-rendering-recipe';
type Contour=NonNullable<ExpressionInk['contour']>;
export interface InkBox {x0:number;x1:number;y0:number;y1:number;seatId?:string}
interface SourceFragment {path:SVGPathElement;systemElement:Element;page:number;system:number}
interface Fragment extends SourceFragment {frame:number;contour:Contour}
interface Relation {id:string;kind:'phrase'|'tie';start:number;end:number;from:Seat;to:Seat;first:Fragment;last:Fragment;groups:string[];reconcileSides:boolean}
interface RelationSourceResolution {relations:Map<SourceFragment[],Relation>;heads?:Map<string,string[]>}
export interface ProjectedRelation {id:string;kind:'phrase'|'tie';groups:string[];path:SVGPathElement;contour:Contour;left:number;right:number;knockout:boolean;bounds:InkBox;strokeSegments?:ExpressionInk['strokeSegments']}
// Cache inventory, never a whole-score or previously selected range's geometry
// admission. A malformed later bow must not gate an unrelated earlier passage.
const cache=new WeakMap<ScorePackage,Map<string,SourceFragment[]>>();
const headCache=new WeakMap<ScorePackage,Map<string,string[]>>();
/** Retained pages may predate the optional data-note-id wrappers. Replay the
 * admitted recipe's real head ledger and bind its literal glyph to the frozen
 * seat; neither nearest-head guesses nor continuation suffixes establish it. */
function replayedHeads(p:ScorePackage):Map<string,string[]> {
 const admitted=admittedWrittenHeads(p);if(admitted)return new Map([...admitted].map(([seat,ids])=>[seat,[...ids]]));
 const saved=headCache.get(p);if(saved)return saved;
 const recipe=validateScoreRenderingRecipe(p.renderingRecipe),options=scoreRenderingRecipeOptions(recipe),heads=new Map<string,string[]>(),display=deriveTieDisplayPlan(p.score,options.chordGrouping==='compatible-stems'),owners=new Set(p.score.notes.map(n=>n.id));
 for(const layout of layoutIsoScore(p.score,options,recipe.tokens))for(const [id,pieces]of buildInkScene(layout,options,recipe.tokens,p.score).heads){
  const glyph=pieces.find(q=>q.primitive.kind==='glyph'&&q.paint.cls==='janko-digit');if(!glyph||glyph.primitive.kind!=='glyph')continue;
  const match=glyph.svg.match(/<text[^>]+x="([^"]+)"[^>]+y="([^"]+)"[^>]+font-size="([^"]+)pt"/);if(!match)throw Error('Unsupported source relation head typography.');
  const digit=glyph.primitive.digit,sourceOwners=[...new Set(glyph.ownerIds.flatMap(owner=>owners.has(owner)?[owner]:display.chains.filter(c=>c.components.some(k=>k.added&&k.headId===owner)).map(c=>c.noteId)))].sort();
  for(const seat of p.seats.filter(s=>s.system===layout.index&&s.page===pieces[0].pagePiece&&s.x===Number(match[1])&&s.baseline===Number(match[2])&&s.fontSize===Number(match[3])&&s.pitchDigit===digit&&JSON.stringify([...s.ownerIds].sort())===JSON.stringify(sourceOwners))){
   const ids=heads.get(seat.id)??[];ids.push(id);heads.set(seat.id,ids);
  }
 }
 headCache.set(p,heads);return heads;
}
export function consecutiveRelationRuns(positions:ReadonlyArray<number|undefined>):Array<{first:number;last:number}>{
 const runs:Array<{first:number;last:number}>=[];for(let slot=0;slot<positions.length;slot++){if(positions[slot]===undefined)continue;const last=runs.at(-1);if(last&&positions[last.last]!+1===positions[slot])last.last=slot;else runs.push({first:slot,last:slot});}return runs;
}
export function relationIntersectsRuns(start:number,end:number,barTicks:readonly number[],positions:ReadonlyArray<number|undefined>):boolean {
 return consecutiveRelationRuns(positions).some(run=>end>=barTicks[positions[run.first]!]&&start<barTicks[positions[run.last]!+1]);
}
/** Decode the retained tapered ribbon; all projected tips originate here. */
function contour(path:SVGPathElement):Contour {
 const d=path.getAttribute('d')??'',commands=d.match(/[A-Za-z]/g)?.join(''),v=d.match(/[+-]?(?:\d*\.)?\d+/g)?.map(Number)??[];
 if(!v.every(Number.isFinite))throw Error('Unsupported source relation contour.');
 if(commands==='MQ'&&v.length===6){const [xStart,yStart,cx,cy,xEnd,yEnd]=v,side: -1|1=cy-(yStart+yEnd)/2<0?-1:1;return {xStart,xEnd,yStart,yEnd,side,depth:Math.abs(cy-(yStart+yEnd)/2)/2,thickness:Number(path.getAttribute('stroke-width'))||.7,indent:cx-xStart};}
 if(commands==='MC'&&v.length===8){const [xStart,yStart,ax,ay,bx,by,xEnd,yEnd]=v,w=xEnd-xStart,side: -1|1=path.getAttribute('data-tie-side')==='below'?1:-1;return {xStart,xEnd,yStart,yEnd,side,depth:Math.max(.5,Math.abs(ay-yStart),Math.abs(by-yEnd),Math.abs(yEnd-yStart)),thickness:Number(path.getAttribute('stroke-width'))||.7,indent:(ax-xStart+xEnd-bx)/2,startIndent:ax-xStart,endIndent:xEnd-bx};}
 if(commands!=='MCLCZ'||v.length!==16||v[6]<=v[0]||Math.abs(v[8]-v[6])>.03||Math.abs(v[14]-v[0])>.03)throw Error('Unsupported source relation contour.');
 const [xStart,yStart,ax,ay,bx,by,xEnd,yEnd]=v,w=xEnd-xStart,aAxis=yStart+(yEnd-yStart)*(ax-xStart)/w,bAxis=yStart+(yEnd-yStart)*(bx-xStart)/w,side: -1|1=ay+by-aAxis-bAxis<0?-1:1,tipThickness=Math.abs(v[9]-yEnd),body=Math.abs(ay-v[13]);
 return {xStart,xEnd,yStart,yEnd,side,depth:Math.max(.5,Math.abs(ay-aAxis)*.75,Math.abs(by-bAxis)*.75),startDepth:Math.abs(ay-aAxis)*.75,endDepth:Math.abs(by-bAxis)*.75,thickness:tipThickness?(3*body+tipThickness)/4:body*.75,indent:(ax-xStart+xEnd-bx)/2,startIndent:ax-xStart,endIndent:xEnd-bx,chordAligned:true,...(tipThickness?{tipThickness}:{})};
}
function inventory(p:ScorePackage):Map<string,SourceFragment[]>{
 const saved=cache.get(p);if(saved)return saved;const fragments=new Map<string,SourceFragment[]>();
 for(const [page,svg]of p.pages.entries()){
  const doc=new DOMParser().parseFromString(svg,'image/svg+xml');
  for(const system of doc.querySelectorAll('[id^="system-"]')){
   for(const path of system.querySelectorAll<SVGPathElement>('.janko-phrase[data-phrase],path[data-tie-note]')){
    const id=path.hasAttribute('data-phrase')?'phrase:'+path.getAttribute('data-phrase'):`tie:${path.getAttribute('data-tie-note')}:${path.getAttribute('data-tie-component')}`;
    const group=fragments.get(id)??[];group.push({path,systemElement:system,page,system:Number(system.id.slice(7))-1});fragments.set(id,group);
   }
  }
 }
 cache.set(p,fragments);return fragments;
}
function sources(p:ScorePackage,plan:PracticePlan,positions:ReadonlyArray<number|undefined>,resolved?:RelationSourceResolution):Relation[]{
 const relations:Relation[]=[];
 for(const [id,raw]of inventory(p)){
  const kind=id.startsWith('phrase:')?'phrase':'tie',phrase=kind==='phrase'?p.score.phrases?.find(q=>'phrase:'+q.id===id):undefined,firstPath=raw[0].path,
   component=Number(firstPath.getAttribute('data-tie-component')),chain=kind==='tie'?p.score.tieChains?.find(q=>q.noteId===firstPath.getAttribute('data-tie-note')):undefined,
   fromComponent=chain?.components[component],toComponent=chain?.components[component+1],start=phrase?.startTick??fromComponent?.startTick??Number(firstPath.getAttribute('data-tie-from-tick')),end=phrase?.endTick??toComponent?.startTick??Number(firstPath.getAttribute('data-tie-to-tick'));
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)throw Error(`Unresolved relation endpoints: ${id}.`);
  if(!relationIntersectsRuns(start,end,plan.barTicks,positions))continue;
  const prior=resolved?.relations.get(raw);if(prior){relations.push(prior);continue;}
  if(kind==='tie'&&fromComponent&&toComponent&&raw.some(part=>Number(part.path.getAttribute('data-tie-from-tick'))!==start||Number(part.path.getAttribute('data-tie-to-tick'))!==end))throw Error(`Source tie component timing differs: ${id}.`);
  const parts:Fragment[]=raw.map(part=>{const lanes=[...part.systemElement.querySelectorAll<SVGLineElement>('.janko-pitch-lane')],span=Math.max(...lanes.map(l=>Number(l.getAttribute('x2'))-Number(l.getAttribute('x1')))),frame=Math.min(...lanes.filter(l=>Math.abs(Number(l.getAttribute('x2'))-Number(l.getAttribute('x1'))-span)<.03).map(l=>Number(l.getAttribute('y1'))));if(!Number.isFinite(frame))throw Error(`Unresolved source relation frame: ${id}.`);return {...part,frame,contour:contour(part.path)};});
  if(parts.some((a,i)=>parts.slice(i+1).some(b=>a.page===b.page&&a.system===b.system&&a.contour.side!==b.contour.side)))throw Error(`Incompatible source relation sides: ${id}.`);
  const fromIds=phrase?.fromNoteIds??[firstPath.getAttribute('data-tie-from')!],toIds=phrase?.toNoteIds??[firstPath.getAttribute('data-tie-to')!];
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
  const reconcileSides=a.part.contour.side!==b.part.contour.side;
  if(reconcileSides){
   const keys=['data-tie-note','data-tie-component','data-tie-from','data-tie-to','data-tie-from-tick','data-tie-to-tick','data-tie-profile'],profile=firstPath.getAttribute('data-tie-profile');
   const display=deriveTieDisplayPlan(p.score,p.renderingRecipe?.options.chordGrouping==='compatible-stems').chains.find(q=>q.noteId===chain?.noteId),fromHead=display?.components[component],toHead=display?.components[component+1];
   const head=(endpoint:typeof a)=>{const explicit=[...endpoint.part.systemElement.querySelectorAll('[data-viewer-seat]')].find(el=>el.getAttribute('data-viewer-seat')===endpoint.seat.id)?.closest('[data-note-id]')?.getAttribute('data-note-id');if(explicit)return explicit;const heads=resolved?(resolved.heads??=replayedHeads(p)):replayedHeads(p),ids=heads.get(endpoint.seat.id);return ids?.length===1?ids[0]:undefined;};
   if(kind!=='tie'||a.part.page===b.part.page&&a.part.system===b.part.system||!Number.isSafeInteger(component)||component<0||String(component)!==firstPath.getAttribute('data-tie-component')||!fromComponent||!toComponent||!['traced','uniform'].includes(profile??'')||
    fromHead?.headId!==fromIds[0]||toHead?.headId!==toIds[0]||fromHead?.startTick!==start||toHead?.startTick!==end||
    !a.seat.ownerIds.includes(chain!.noteId)||!b.seat.ownerIds.includes(chain!.noteId)||head(a)!==fromIds[0]||head(b)!==toIds[0]||
    Number(firstPath.getAttribute('data-tie-from-tick'))!==start||Number(firstPath.getAttribute('data-tie-to-tick'))!==end||
    parts.some(part=>keys.some(key=>!firstPath.hasAttribute(key)||part.path.getAttribute(key)!==firstPath.getAttribute(key))||part.path.getAttribute('data-tie-side')!==(part.contour.side===1?'below':'above')))
    throw Error(`Incompatible source relation sides: ${id}.`);
  }
  const owners=kind==='tie'?[original(firstPath.getAttribute('data-tie-note')!)]:[...fromIds,...toIds].map(original),hands=new Set(p.score.notes.filter(n=>owners.includes(n.id)).map(n=>n.hand));
  const groups=[...new Set([...owners.map(owner=>plan.ownerGroup.get(owner)),...(kind==='phrase'?plan.gestures.filter(g=>g.start<=end&&g.end>=start&&hands.has(g.hand)).map(g=>g.id):[])].filter((g):g is string=>!!g))];
  if(!groups.length)throw Error(`Unresolved relation contributors: ${id}.`);
  const relation:Relation={id,kind,start,end,from:a.seat,to:b.seat,first:a.part,last:b.part,groups,reconcileSides};resolved?.relations.set(raw,relation);relations.push(relation);
 }
 return relations;
}
function overlaps(a:ExpressionInk,b:ExpressionInk){
 const stroke=a.strokeSegments?a:b.strokeSegments?b:undefined,other=stroke===a?b:a;
 if(!stroke)return expressionsOverlap(a,b);
 return stroke.strokeSegments!.some(s=>expressionIntersectsBox(other,{x0:Math.min(s.x0,s.x1)-s.width/2,x1:Math.max(s.x0,s.x1)+s.width/2,y0:Math.min(s.y0,s.y1)-s.width/2,y1:Math.max(s.y0,s.y1)+s.width/2}));
}
/** A common-side bow attaches to the same frozen heads with each source
 * fragment's own mask-to-tip air. Actual text enclosures remain protected;
 * source and destination tips never borrow a neighbouring head or stem. */
function sideTip(endpoint:Seat,fragment:Fragment,ending:boolean,side:-1|1,track:PassageTrack):number {
 const text=[...fragment.systemElement.querySelectorAll('[data-viewer-seat]')].find(el=>el.getAttribute('data-viewer-seat')===endpoint.id),mask=text?.closest('.janko-reading-head')?.querySelector('.janko-knockout')??text?.previousElementSibling;
 if(!mask||mask.localName!=='rect'||!mask.classList.contains('janko-knockout')||mask.hasAttribute('transform'))throw Error('Unsupported source tie attachment mask.');
 const top=Number(mask.getAttribute('y')),bottom=top+Number(mask.getAttribute('height')),tip=ending?fragment.contour.yEnd:fragment.contour.yStart,gap=fragment.contour.side===1?tip-bottom:top-tip;
 if(!Number.isFinite(top)||!Number.isFinite(bottom)||bottom<=top||!Number.isFinite(gap)||gap<-.03)throw Error('Unresolved source tie attachment gap.');
 const actual=(track.boxes.get(endpoint.writtenBar-1)??[]).filter(b=>b.seatId===endpoint.id),low=Math.min(top,...actual.map(b=>b.y0)),high=Math.max(bottom,...actual.map(b=>b.y1));
 return (side===1?high+Math.max(0,gap):low-Math.max(0,gap))-fragment.frame;
}
/** The same shared cubic supplies an unequal-height uniform tie's centerline;
 * the retained uniform source stroke paints it, without closing/doubling ink. */
function uniformCubicPath(c:Contour):string {
 return taperedSpanPath(c.xStart,c.yStart,c.xEnd,c.yEnd,c.side,c.depth,0,c.indent,c).split(' L ')[0];
}
function uniformCubicSegments(c:Contour):NonNullable<ExpressionInk['strokeSegments']>{
 const v=uniformCubicPath(c).match(/[+-]?(?:\d*\.)?\d+/g)!.map(Number),point=(u:number)=>{const t=1-u;return {x:t*t*t*v[0]+3*t*t*u*v[2]+3*t*u*u*v[4]+u*u*u*v[6],y:t*t*t*v[1]+3*t*t*u*v[3]+3*t*u*u*v[5]+u*u*u*v[7]};};
 let previous=point(0);return Array.from({length:512},(_,i)=>{const next=point((i+1)/512),segment={x0:previous.x,y0:previous.y,x1:next.x,y1:next.y,width:c.thickness};previous=next;return segment;});
}
/** Relations are projected independently of frozen note seats. Source identities
 * select tips, source contours supply side/body/taper, and the pinned primitive
 * paints one complete ribbon. Runs never bridge a nonconsecutive source wrap. */
export function projectRelations(p:ScorePackage,plan:PracticePlan,crops:Crop[],track:PassageTrack,policy:'compact'|'fixed',positions:Array<number|undefined>,placements?:ReadonlyArray<{bar:number;x:number}>):ProjectedRelation[]{
 return projectRelationWindow(p,plan,crops,track,policy,positions,placements);
}
/** One synchronous preflight owns these source facts. Resolve each relevant
 * relation in its original first-use order; every window still reconstructs
 * its actual obstacles, sibling clearance and projected paint. No resolver
 * escapes the call or attaches evidence to a package. */
export function visitProjectedRelationWindows(p:ScorePackage,plan:PracticePlan,crops:Crop[],track:PassageTrack,windows:number[][],visit:(bars:number[],projected:ProjectedRelation[])=>void):void {
 const resolved:RelationSourceResolution={relations:new Map()};
 for(const bars of windows)visit(bars,projectRelationWindow(p,plan,crops,track,'compact',bars,undefined,resolved));
}
function projectRelationWindow(p:ScorePackage,plan:PracticePlan,crops:Crop[],track:PassageTrack,policy:'compact'|'fixed',positions:Array<number|undefined>,placements?:ReadonlyArray<{bar:number;x:number}>,resolved?:RelationSourceResolution):ProjectedRelation[]{
 if(!positions.some(b=>b!==undefined))return [];
 const relations=sources(p,plan,positions,resolved),offsets:number[]=[];let x=0;
 for(const bar of positions){if(placements&&bar!==undefined){const placement=placements.find(p=>p.bar===bar);if(!placement)throw Error(`Measure ${bar+1}: missing admitted relation placement.`);x=placement.x;}offsets.push(x);const c=crops.find(c=>c.bar===bar);x+=policy==='fixed'?track.width:c?c.right-c.left:0;}
 const runs=consecutiveRelationRuns(positions);
 const output:ProjectedRelation[]=[];
 // Different source runs have disjoint relation clips on the continuous staff.
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
   const width=xEnd-xStart,base:Contour={xStart,xEnd,yStart:first.yStart-q.first.frame,yEnd:last.yEnd-q.last.frame,side:first.side,depth:Math.max(first.depth,last.depth),startDepth:first.startDepth??first.depth,endDepth:last.endDepth??last.depth,thickness:first.thickness,indent:width*.21,startIndent:width*(first.startIndent??first.indent)/(first.xEnd-first.xStart),endIndent:width*(last.endIndent??last.indent)/(last.xEnd-last.xStart),chordAligned:true,...(first.tipThickness!==undefined?{tipThickness:first.tipThickness}:{})};
   const uniform=q.first.path.getAttribute('data-tie-profile')==='uniform',cubicUniform=uniform&&q.reconcileSides,knockout=q.first.path.previousElementSibling?.classList.contains('janko-phrase-grid-knockout')??false,air=knockout?.75:.35,protectedBoxes=obstacles.map((b,i)=>({id:String(i),x0:Math.max(left,b.x0-air),x1:Math.min(right,b.x1+air),y0:b.y0-air,y1:b.y1+air}));
   const attempt=(side:-1|1)=>{
    const c:Contour={...base,side,...(q.reconcileSides?{yStart:sideTip(q.from,q.first,false,side,track),yEnd:sideTip(q.to,q.last,true,side,track)}:{})},anchor=c.yStart,ink:ExpressionInk={kind:'phrase',id:q.id,startTick:q.start,endTick:q.end,continuationStart:q.start<plan.barTicks[aBar],continuationEnd:q.end>=plan.barTicks[bBar+1],contour:c,x0:xStart,x1:xEnd,y0:0,y1:0,svg:''},arc=()=>({x1:c.xStart,x2:c.xEnd,y:c.yStart,side:c.side,depth:c.depth,profile:'uniform' as const,thickness:c.thickness});
    let admitted=false;for(let step=0;step<33;step++){
     // New cross-system reconciliation stays attached to the verified heads;
     // preserve the historical same-side clearance path and its exact paint.
     if(q.reconcileSides&&Math.abs(c.yStart-anchor)>Math.min(q.from.fontSize,q.to.fontSize)/2)break;
     const ay=c.yStart+(c.yEnd-c.yStart)*(c.startIndent??c.indent)/width+c.side*c.depth/.75,by=c.yEnd-(c.yEnd-c.yStart)*(c.endIndent??c.indent)/width+c.side*c.depth/.75;ink.y0=Math.min(c.yStart,c.yEnd,ay,by)-1;ink.y1=Math.max(c.yStart,c.yEnd,ay,by)+1;
     if(uniform){ink.contour=undefined;ink.strokeSegments=cubicUniform?uniformCubicSegments(c):tieArcSegments(arc(),256).map(s=>({x0:s.x1,y0:s.y1,x1:s.x2,y1:s.y2,width:c.thickness}));}
     const hits=protectedBoxes.filter(b=>uniform&&!cubicUniform?tieArcEntersBoxes(arc(),[b],p.renderingRecipe?.tokens):expressionIntersectsBox(ink,b)),overlap=settled.some(other=>overlaps(ink,other));
     if(!hits.length&&!overlap){admitted=true;break;}
     // Only actual intersecting paint earns a quiet corridor. An unrelated
     // pedal/dynamic far below a clear bow must not displace its endpoints.
     const shift=hits.length?Math.max(.1,expressionContourOutwardShift(c,hits)+.02):2;c.yStart+=c.side*shift;c.yEnd+=c.side*shift;
    }
    return {c,ink,admitted,shift:Math.abs(c.yStart-anchor),translation:c.yStart-anchor,displacement:Math.abs(c.yStart-base.yStart)+Math.abs(c.yEnd-base.yEnd)};
   };
   // At a real source break either authored side is available. Lowest actual
   // clearance displacement wins; an exact tie retains the destination side.
   const candidates=(q.reconcileSides?[last.side,first.side]:[first.side]).map(attempt),chosen=candidates.filter(q=>q.admitted).sort((a,b)=>a.displacement-b.displacement)[0];
   if(!chosen)throw Error(`Relation has no admitted passage clearance: ${q.id}.`);
   const {c,ink}=chosen,path=document.importNode(q.first.path,true);if(uniform&&!cubicUniform&&Math.abs(c.yStart-c.yEnd)>.03)throw Error(`Uniform source tie endpoints differ: ${q.id}.`);path.setAttribute('d',cubicUniform?uniformCubicPath(c):uniform?tieArcPath(c.xStart,c.yStart,c.xEnd,c.side,c.depth,'uniform',c.thickness):taperedSpanPath(c.xStart,c.yStart,c.xEnd,c.yEnd,c.side,c.depth,c.thickness,c.indent,c));path.setAttribute('data-practice-relation',q.id);path.setAttribute('data-practice-continuation-start',String(ink.continuationStart));path.setAttribute('data-practice-continuation-end',String(ink.continuationEnd));path.setAttribute('data-practice-from-seat',q.from.id);path.setAttribute('data-practice-to-seat',q.to.id);path.setAttribute('data-practice-source-tip-offsets',JSON.stringify([first.xStart-q.from.x,first.yStart-q.from.baseline,last.xEnd-q.to.x,last.yEnd-q.to.baseline]));path.setAttribute('data-practice-clearance-shift',String(c.yStart-base.yStart));path.removeAttribute('id');
   if(q.reconcileSides){path.setAttribute('data-practice-side-policy','cross-system-clearance');path.setAttribute('data-practice-tip-policy','owned-head-source-gap');path.setAttribute('data-practice-source-sides',JSON.stringify([first.side,last.side]));path.setAttribute('data-practice-passage-side',String(c.side));path.setAttribute('data-practice-clearance-shift',String(chosen.translation));path.setAttribute('data-practice-tip-offsets',JSON.stringify([first.xStart-q.from.x,c.yStart-(q.from.baseline-q.first.frame),last.xEnd-q.to.x,c.yEnd-(q.to.baseline-q.last.frame)]));path.setAttribute('data-practice-side-candidates',JSON.stringify(candidates.map(q=>({side:q.c.side,admitted:q.admitted,shift:q.shift,displacement:q.displacement}))));}
   const x0=Math.max(left,xStart),x1=Math.min(right,xEnd),ys:Array<number>=[];for(let i=0;i<=256;i++){const xx=x0+(x1-x0)*i/256,u=(xx-c.xStart)/width,slice=cubicUniform?expressionSliceAtX({...ink,contour:{...c,thickness:0}},xx):uniform?[c.yStart+c.side*4*c.depth*u*(1-u)]:expressionSliceAtX(ink,xx);ys.push(...(slice??[xx<=xStart?c.yStart:c.yEnd]));}const edge=knockout?.6:Number(path.getAttribute('stroke-width'))/2||0,bounds={x0,x1,y0:Math.min(...ys)-edge-.1,y1:Math.max(...ys)+edge+.1};output.push({id:q.id,kind:q.kind,groups:[...q.groups],path,contour:c,left,right,knockout,bounds,...(cubicUniform?{strokeSegments:ink.strokeSegments}:{})});settled.push(ink);
  }
 }
 return output;
}
/** A missing authored origin must not turn a clipped enormous bow into a tiny
 * terminal curl. Reproject its incoming continuation with the shared primitive,
 * preserving the verified destination tip, source side/profile and stroke. */
export function readableTieContinuation(p:ScorePackage,q:ProjectedRelation,currentBar:number,crops:Crop[],track:PassageTrack,positions:Array<number|undefined>,placements?:ReadonlyArray<{bar:number;x:number}>,projected:ProjectedRelation[]=[]):ProjectedRelation|undefined {
 if(q.kind!=='tie')return;
 const to=p.seats.find(s=>s.id===q.path.getAttribute('data-practice-to-seat'));
 if(!to||q.contour.xEnd<q.left||q.contour.xEnd>q.right)return;
 let x=0;const offsets=new Map<number,number>();for(const bar of positions){if(bar===undefined)continue;const c=crops.find(c=>c.bar===bar)!;x=placements?.find(s=>s.bar===bar)?.x??x;offsets.set(bar,x);x+=c.right-c.left;}
 const origin=offsets.get(currentBar);if(origin===undefined||q.contour.xEnd<=origin+.2)return;
 // Both verified tips in the same source-adjacent run retain the complete bow.
 if(q.contour.xStart>=q.left&&q.contour.xEnd<=q.right)return {...q,path:q.path.cloneNode(true) as SVGPathElement};
 const right=q.contour.xEnd,uniform=q.path.getAttribute('data-tie-profile')==='uniform',profile=uniform?'uniform':'traced',tokens=resolveIsoTokens(p.renderingRecipe?.tokens),c=q.contour,left=Math.min(origin,right-Math.max(tokens.tieMinDepth/tokens.tieDepthRatio,c.thickness*8));
 const cueTokens={...p.renderingRecipe?.tokens,tieEdgeStroke:Number(q.path.getAttribute('stroke-width'))||tokens.tieEdgeStroke};
 const arc={x1:left,x2:right,y:c.yEnd,side:c.side,depth:Math.max(c.thickness+.1,Math.min(c.depth,tieArcDepth(left,right,tokens))),profile:profile as 'uniform'|'traced',thickness:c.thickness,fragment:'incoming' as const};
 const boxes=positions.flatMap(bar=>{if(bar===undefined)return [];const source=crops.find(c=>c.bar===bar)!,offset=offsets.get(bar)!;return (track.boxes.get(bar)??[]).map((b,i)=>({id:bar+':'+i,x0:offset+b.x0-source.left,x1:offset+b.x1-source.left,y0:b.y0-source.frame,y1:b.y1-source.frame}));});
 let clear=false;
 for(let attempt=0;attempt<33;attempt++){
  const segments=tieArcSegments(arc,256),bounds=tieArcInkBox(arc,cueTokens),ink:ExpressionInk={kind:'phrase',id:q.id,x0:left,x1:right,y0:bounds.y0,y1:bounds.y1,startTick:0,endTick:0,continuationStart:true,continuationEnd:false,svg:'',strokeSegments:segments.map(s=>({x0:s.x1,y0:s.y1,x1:s.x2,y1:s.y2,width:uniform?c.thickness:cueTokens.tieEdgeStroke}))};
  const collision=projected.some(other=>other.id!==q.id&&other.path.getAttribute('data-tie-note')!==q.path.getAttribute('data-tie-note')&&other.bounds.x1>left&&other.bounds.x0<right&&overlaps(ink,{kind:'phrase',id:other.id,startTick:0,endTick:0,continuationStart:false,continuationEnd:false,svg:'',x0:other.bounds.x0,x1:other.bounds.x1,y0:other.bounds.y0,y1:other.bounds.y1,...(other.strokeSegments?{strokeSegments:other.strokeSegments}:{contour:other.contour})}));
  if(!tieArcEntersBoxes(arc,boxes,cueTokens)&&!collision){clear=true;break;}arc.depth+=.5;
 }
 if(!clear)throw Error(`Authored held continuation has no admitted clearance: ${q.id}.`);
 const path=q.path.cloneNode(true) as SVGPathElement;path.setAttribute('d',tieArcPath(left,arc.y,right,arc.side,arc.depth,profile,arc.thickness,0,'incoming'));path.setAttribute('data-practice-continuation-start','true');path.setAttribute('data-practice-cue-shape','authored-incoming');
 const bounds=tieArcInkBox(arc,cueTokens);return {...q,path,left:Math.min(q.left,bounds.x0),right:Math.max(right,bounds.x1),contour:{...c,xStart:left,xEnd:right,yStart:arc.y+arc.side*arc.depth,yEnd:arc.y,depth:arc.depth},strokeSegments:tieArcSegments(arc,256).map(s=>({x0:s.x1,y0:s.y1,x1:s.x2,y1:s.y2,width:uniform?c.thickness:cueTokens.tieEdgeStroke})),bounds};
}

const intervalCache=new WeakMap<ScorePackage,Map<number,{left:number;right:number}>>();
function interval(p:ScorePackage,plan:PracticePlan,bar:number){
 let saved=intervalCache.get(p);if(!saved){saved=new Map();intervalCache.set(p,saved);}if(saved.has(bar))return saved.get(bar)!;
 const result=cropMeasure(p,plan,bar);saved.set(bar,result);return result;
}
