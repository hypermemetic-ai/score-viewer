import {DOMParser,XMLSerializer} from '@xmldom/xmldom';
import {createFrettedPassageProjection,type FrettedBox,type FrettedReadingScene} from '../vendor/iso-notation/src/score-presentation';
import {selectReadingNotation} from './dual-reading-package';
import type {ScorePackage} from './package';

const ns='http://www.w3.org/2000/svg',serial=new XMLSerializer();
const union=(boxes:readonly FrettedBox[]):FrettedBox=>({x0:Math.min(...boxes.map(b=>b.x0)),y0:Math.min(...boxes.map(b=>b.y0)),
 x1:Math.max(...boxes.map(b=>b.x1)),y1:Math.max(...boxes.map(b=>b.y1))});
export interface ManualPassageScene {svg:string;bars:number[];bounds:FrettedBox;components:string[];relations:string[]}
/** Preserve original bar widths and all internal note spacing. Only source-bar
 * origins move. Complete musical ink remains visible during manual practice. */
export function manualPassageScene(input:ScorePackage,requested:readonly number[]):ManualPassageScene {
 const selectedBars=structuredClone(requested),p=selectReadingNotation(input,input.reading?.dual?.notation??'iso'),
  scene:FrettedReadingScene=p.reading!.dual!.views[p.reading!.dual!.notation].scene;
 if(!selectedBars.length||selectedBars.length>5||selectedBars.some((bar,i)=>!Number.isSafeInteger(bar)||bar<0||i>0&&bar!==selectedBars[i-1]+1))
  throw Error('Manual passage needs one to five consecutive admitted source bars.');
 const bars=selectedBars.map(index=>{const matches=scene.bars.filter(b=>b.writtenBar===index);if(matches.length!==1)throw Error('Manual source bar is absent or ambiguous.');return matches[0];}),
  transforms=new Map<number,{dx:number;dy:number}>();let width=0;
 for(const bar of bars){transforms.set(bar.writtenBar,{dx:width-bar.frame.x0,dy:-bar.alignmentY});width+=bar.frame.x1-bar.frame.x0;}
 const projection=createFrettedPassageProjection(scene,bars.map(bar=>({writtenBar:bar.writtenBar,...transforms.get(bar.writtenBar)!}))),
  transformed=(box:FrettedBox,t:{dx:number;dy:number}):FrettedBox=>({x0:box.x0+t.dx,y0:box.y0+t.dy,x1:box.x1+t.dx,y1:box.y1+t.dy}),
  selected=scene.components.filter(c=>selectedBars.includes(c.writtenBar)),guideYs=projection.guides.map(guide=>guide.y),
  initial=union([...projection.ink.map(piece=>piece.bounds),...selected.map(c=>transformed(c.bounds,transforms.get(c.writtenBar)!)),
   {x0:0,x1:width,y0:Math.min(...guideYs)-4,y1:Math.max(...guideYs)+4}]);
 const documents=new Map([...new Set(bars.map(bar=>bar.page))].map(index=>[index,new DOMParser().parseFromString(p.pages[index],'image/svg+xml')])),sourceOrder=new Map<number,Map<string,number>>(),
  indexed=new Map([...documents].map(([page,doc])=>{const ids=new Map<string,Element>(),order=new Map<string,number>();for(const [i,node]of Array.from(doc.getElementsByTagName('*')).entries()){const id=node.getAttribute('id');if(!id)continue;if(ids.has(id))throw Error('Ambiguous admitted source ink: '+id);ids.set(id,node as unknown as Element);order.set(id,i);}sourceOrder.set(page,order);return [page,ids] as const;})),
  doc=new DOMParser().parseFromString(`<svg xmlns="${ns}"/>`,'image/svg+xml'),root=doc.documentElement!,defs=doc.createElementNS(ns,'defs'),structure=doc.createElementNS(ns,'g'),music=doc.createElementNS(ns,'g'),joined=doc.createElementNS(ns,'g');
 root.setAttribute('class','manual-passage practice-passage');root.setAttribute('role','img');root.setAttribute('aria-label',`Measures ${selectedBars[0]+1} to ${selectedBars.at(-1)!+1}`);
 root.appendChild(defs);root.appendChild(structure);root.appendChild(music);root.appendChild(joined);
 for(const node of Array.from(documents.get(bars[0].page)!.getElementsByTagName('style')))defs.appendChild(doc.importNode(node,true));
 const groups=new Map<number,ReturnType<typeof doc.createElementNS>>(),
  inkBounds:FrettedBox[]=[initial],reconstructed:string[]=[],appended=new Map<number,Set<string>>(),companions=new Set((p.score.techniques??[]).map(t=>t.derivedSlurId).filter(Boolean));
 const appendInk=(bar:typeof bars[number],id:string)=>{
  const retained=appended.get(bar.writtenBar)??new Set<string>();if(retained.has(id))return;retained.add(id);appended.set(bar.writtenBar,retained);
  const original=indexed.get(bar.page)!.get(id);if(!original)throw Error('Admitted source-owned ink is missing: '+id);
  const clone=doc.importNode(original as never,true) as ReturnType<typeof doc.createElementNS>;
  for(const node of [clone,...Array.from(clone.getElementsByTagName('*'))])if(node.hasAttribute('id')){const sourceId=node.getAttribute('id')!;node.setAttribute('data-manual-source-ink',sourceId);node.setAttribute('id',`manual-b${bar.writtenBar}-${sourceId}`);}
  groups.get(bar.writtenBar)!.appendChild(clone);
 };
 for(const bar of bars){const t=transforms.get(bar.writtenBar)!;
  const clip=doc.createElementNS(ns,'clipPath'),clipId=`manual-source-bar-${bar.writtenBar}`,rect=doc.createElementNS(ns,'rect'),x0=bar===bars[0]?initial.x0:bar.frame.x0+t.dx,x1=bar===bars.at(-1)?initial.x1:bar.frame.x1+t.dx;
  clip.setAttribute('id',clipId);rect.setAttribute('x',String(x0));rect.setAttribute('y',String(initial.y0-2));rect.setAttribute('width',String(x1-x0));rect.setAttribute('height',String(initial.y1-initial.y0+4));clip.appendChild(rect);defs.appendChild(clip);
  const group=doc.createElementNS(ns,'g'),translated=doc.createElementNS(ns,'g');group.setAttribute('clip-path',`url(#${clipId})`);translated.setAttribute('transform',`translate(${t.dx} ${t.dy})`);group.appendChild(translated);music.appendChild(group);groups.set(bar.writtenBar,translated);
  const marks=scene.marks.filter(mark=>mark.page===bar.page&&mark.system===bar.system&&mark.startTick>=bar.startTick&&(mark.startTick<bar.endTick||bar===bars.at(-1)&&mark.startTick===bar.endTick)),ids=new Set([...selected.filter(c=>c.writtenBar===bar.writtenBar).flatMap(c=>c.inkIds),...marks.flatMap(mark=>mark.inkIds)]);
  for(const id of ids)appendInk(bar,id);
 }
 for(const guide of projection.guides){const line=doc.createElementNS(ns,'line');
  for(const [name,value]of Object.entries({x1:guide.x1,x2:guide.x2,y1:guide.y,y2:guide.y,'stroke-width':guide.width}))line.setAttribute(name,String(value));
  line.setAttribute('stroke',guide.stroke);line.setAttribute('stroke-linecap',guide.cap);line.setAttribute('data-manual-guide',JSON.stringify(guide.identity));structure.appendChild(line);
 }
 for(const separator of projection.separators){const line=doc.createElementNS(ns,'line');
  for(const [name,value]of Object.entries({x1:separator.x,x2:separator.x,y1:separator.y1,y2:separator.y2,'stroke-width':separator.width}))line.setAttribute(name,String(value));
  line.setAttribute('stroke',separator.stroke);line.setAttribute('data-manual-separator',String(separator.writtenBar));structure.appendChild(line);
 }
 const changed:string[]=[];
 for(const relation of projection.relations){if(companions.has(relation.id))continue;
  const involved=bars.filter(bar=>relation.toTick>=bar.startTick&&relation.fromTick<bar.endTick);
  if(!involved.length)continue;
  const first=transforms.get(involved[0].writtenBar)!,unchanged=involved.every(bar=>{const t=transforms.get(bar.writtenBar)!;return Math.abs(t.dx-first.dx)<1e-6&&Math.abs(t.dy-first.dy)<1e-6;});
  if(unchanged){for(const bar of involved)for(const appearance of relation.appearances.filter(a=>a.page===bar.page&&a.system===bar.system))for(const id of new Set(appearance.inkIds))appendInk(bar,id);}
  else changed.push(relation.id);
 }
 // One source-owned aggregate proves the final replacement curves against
 // each other as well as all retained literal foreign musical ink.
 for(const paint of projection.projectRelations(changed)){
  const fragment=new DOMParser().parseFromString(`<g xmlns="${ns}">${paint.svg}</g>`,'image/svg+xml').documentElement!;
  fragment.setAttribute('data-manual-relation',paint.id);joined.appendChild(doc.importNode(fragment,true));inkBounds.push(paint.bounds);reconstructed.push(paint.id);
 }
 // Ownership is not paint order. In particular, source head-paper must stay
 // beneath its digit/ellipse and curves must keep their literal layering.
 // Reorder actual cloned roots by their admitted source DOM position after
 // all component, mark and unchanged-relation roots have been selected.
 for(const bar of bars){const group=groups.get(bar.writtenBar)!,order=sourceOrder.get(bar.page)!;
  const children=Array.from(group.childNodes).filter(node=>node.nodeType===1) as ReturnType<typeof doc.createElementNS>[];
  children.sort((a,b)=>order.get(a.getAttribute('data-manual-source-ink')!)!-order.get(b.getAttribute('data-manual-source-ink')!)!);
  for(const child of children)group.appendChild(child);
 }
 const bounds=union(inkBounds),padding=18,w=bounds.x1-bounds.x0+padding*2,h=bounds.y1-bounds.y0+padding*2;root.setAttribute('viewBox',`${bounds.x0-padding} ${bounds.y0-padding} ${w} ${h}`);root.setAttribute('width',String(w));root.setAttribute('height',String(h));
 return {svg:serial.serializeToString(root),bars:[...selectedBars],bounds,components:selected.map(c=>c.sourceEventId),relations:reconstructed};
}
