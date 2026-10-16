import {requirePianoEvent} from './piano-event';
import {applyAnnotationInkPolicy,annotationInkPolicyFor} from './annotation-ink-policy';
import type {ScorePackage,Seat} from './package';
import type {PracticePlan} from './practice';
import {fingeringCarriers} from './fingering-carriers';
import {annotationPositions} from './fingering-presentation';
import {glyphDotIsOwned} from '../vendor/iso-notation/src/render/iso/dot-ownership';
import {durationDotCount} from '../vendor/iso-notation/src/render/iso/elements/duration';
import {digitBaselineOffset} from '../vendor/iso-notation/src/render/iso/elements/notehead';
import {resolveIsoTokens} from '../vendor/iso-notation/src/render/iso/types';
import type {PositionedIsoNote} from '../vendor/iso-notation/src/render/iso/engine';
import {projectRelations,type InkBox,type ProjectedRelation} from './practice-relations';
const ns='http://www.w3.org/2000/svg';
const projectedRelationPaint='.janko-phrase,.janko-phrase-grid-knockout,path[data-tie-note]';
const carrierCache=new WeakMap<ScorePackage,ReturnType<typeof fingeringCarriers>>();
const pageCache=new WeakMap<ScorePackage,Map<number,{source:string;doc:Document}>>();
/** Keep at most eight private read-only source pages per live package. Each
 * crop imports its own mutable ink; exact page bytes invalidate old parses. */
function sourcePage(p:ScorePackage,page:number):Document {
 let pages=pageCache.get(p);if(!pages){pages=new Map();pageCache.set(p,pages);}
 const source=p.pages[page],saved=pages.get(page);if(saved?.source===source){pages.delete(page);pages.set(page,saved);return saved.doc;}
 const doc=new DOMParser().parseFromString(source,'image/svg+xml');pages.delete(page);pages.set(page,{source,doc});if(pages.size>8)pages.delete(pages.keys().next().value!);return doc;
}
export interface Crop {bar:number;empty?:boolean;svg:SVGSVGElement;seats:Seat[];width:number;height:number;left:number;right:number;leftAir:number;rightAir:number;endingType?:string;frame:number;lanes:number[];owned:Array<{el:SVGElement;groups:string[]}>}
/** Copy real-engine ink; attach source group ownership to existing vector elements, never invent notes. */
export function cropMeasure(p:ScorePackage,plan:PracticePlan,bar:number):Crop {
 const seats=p.seats.filter(s=>s.writtenBar===bar+1);let first=seats[0],doc:Document,system:Element;
 if(first){doc=sourcePage(p,first.page);system=doc.querySelector(`#system-${first.system+1}`)!;}
 else {
  // A rest-only bar has no pitch seat. Use the real engine's printed system
  // label and bar rules, never fabricate a blank score or musical head.
  const systems=p.pages.flatMap((_svg,page)=>{const d=sourcePage(p,page);return [...d.querySelectorAll('[id^="system-"]')].map(el=>({doc:d,system:el,page,index:Number(el.id.slice(7))-1,start:Number(el.querySelector('.janko-measure-num')?.textContent)}));}).sort((a,b)=>a.start-b.start);
  const i=systems.findIndex((s,i)=>Number.isSafeInteger(s.start)&&s.start<=bar+1&&(systems[i+1]?.start??plan.barTicks.length)>bar+1),entry=systems[i];
  if(!entry)throw Error(`The vector score has no measure boundary map for measure ${bar+1}.`);
  doc=entry.doc;system=entry.system;first={page:entry.page,system:entry.index} as Seat;
 }
 if(!system)throw Error('Vector system map differs.');
 const all=p.seats.filter(s=>s.page===first.page&&s.system===first.system),sameBars=[...new Set(all.map(s=>s.writtenBar))].sort((a,b)=>a-b),index=sameBars.indexOf(bar+1);
 const lines=[...system.querySelectorAll<SVGLineElement>('.janko-barlines line,.janko-repeat-barline')].map(l=>Number(l.getAttribute('x1'))).filter((x,i,a)=>a.indexOf(x)===i).sort((a,b)=>a-b);
 const boundaries=sameBars.slice(0,-1).map((b,i)=>{const previous=Math.max(...all.filter(s=>s.writtenBar===b).map(s=>s.x)),next=Math.min(...all.filter(s=>s.writtenBar===sameBars[i+1]).map(s=>s.x));return lines.filter(x=>x>previous&&x<next).at(-1);});
 const grid=[...system.querySelectorAll<SVGLineElement>('.janko-pitch-lane')].sort((a,b)=>(Number(b.getAttribute('x2'))-Number(b.getAttribute('x1')))-(Number(a.getAttribute('x2'))-Number(a.getAttribute('x1'))))[0],gridLeft=Number(grid.getAttribute('x1')),gridRight=Number(grid.getAttribute('x2'));
 let left=index===0?gridLeft:boundaries[index-1],right=index===sameBars.length-1?gridRight:boundaries[index];
 if(!seats.length||sameBars.some((b,i)=>i>0&&b!==sameBars[i-1]+1)){
  const firstBar=Number(system.querySelector('.janko-measure-num')?.textContent),ordinary=[...system.querySelectorAll<SVGLineElement>('.janko-barlines .janko-barline')].map(l=>Number(l.getAttribute('x1'))),repeats=[...system.querySelectorAll('.janko-repeat')].map(g=>Math.max(...[...g.querySelectorAll('line')].map(l=>Number(l.getAttribute('x1'))))),rules=[...new Set([...ordinary,...repeats])].filter(x=>x>gridLeft&&x<gridRight).sort((a,b)=>a-b),offset=bar+1-firstBar;
  if(!Number.isSafeInteger(firstBar)||offset<0||offset>rules.length)throw Error(`The vector score has no complete boundary map for measure ${bar+1}.`);
  left=offset===0?gridLeft:rules[offset-1];right=rules[offset]??gridRight;
 }
 if(!Number.isFinite(left)||!Number.isFinite(right)||right!<=left!)throw Error('Vector measure boundaries are unsupported.');
 const beat=system.querySelector<SVGLineElement>('.janko-beat-line')??system.querySelector<SVGLineElement>('.janko-barline')!;const top=Number(beat.getAttribute('y1'))-30,bottom=Number(beat.getAttribute('y2'))+32;
 const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`${left!} ${top} ${right!-left!} ${bottom-top}`);svg.setAttribute('preserveAspectRatio','xMidYMid meet');svg.dataset.practiceBar=String(bar+1);for(const resource of [...doc.documentElement.children].filter(el=>['style','defs'].includes(el.localName)))svg.append(document.importNode(resource,true));svg.append(document.importNode(system,true));applyAnnotationInkPolicy(svg,annotationInkPolicyFor(p));const clone=svg.querySelector(`#system-${first.system+1}`)!;clone.removeAttribute('id');clone.querySelectorAll('.janko-measure-num,.janko-system-bracket').forEach(e=>e.remove());
 // Give each authored separator one side. Ordinary/double/end rules belong
 // to the ending bar; start-repeat ink belongs to the following bar.
 const boundary=p.score.barlines?.find(rule=>rule.tick===plan.barTicks[bar]),ending=p.score.barlines?.find(rule=>rule.tick===plan.barTicks[bar+1]);
 const repeatEdge=(group:Element)=>Math.max(...[...group.querySelectorAll('line')].map(l=>Number(l.getAttribute('x1'))));
 if(boundary&&boundary.type!=='repeat-start'){
  clone.querySelectorAll<SVGLineElement>('.janko-barlines line').forEach(line=>{const x=Number(line.getAttribute('x1'));if(x>=left!-3&&x<=left!+.02&&Math.abs(Number(line.getAttribute('x2'))-x)<.02)line.remove();});
  clone.querySelectorAll('.janko-repeat').forEach(group=>{if(Math.abs(repeatEdge(group)-left!)<.02)group.remove();});
 }
 // Source serialization identifies repeat ticks exactly; a double start's
 // thin line can sit one unit before the ordinary boundary, so proximity to
 // the rightmost stroke must not decide its owning measure.
 clone.querySelectorAll('.janko-repeat').forEach(group=>{const tick=Number(group.getAttribute('data-repeat-tick')),edge=plan.barTicks.indexOf(tick),owner=edge-(group.getAttribute('data-repeat')==='repeat-end'?1:0);if(edge<0)throw Error(`Measure ${bar+1}: unresolved source repeat boundary.`);if(owner!==bar)group.remove();});
 if(ending?.type==='repeat-start')clone.querySelectorAll<SVGLineElement>('.janko-barlines line').forEach(line=>{if(Math.abs(Number(line.getAttribute('x1'))-right!)<.03)line.remove();});
 const sourceFinal=bar===plan.barTicks.length-2&&[...system.querySelectorAll<SVGLineElement>('.janko-barlines .janko-barline')].some(line=>Math.abs(Number(line.getAttribute('x1'))-right!)<.03&&Number(line.getAttribute('stroke-width'))===.9),endingType=ending?.type&&ending.type!=='regular'?ending.type:sourceFinal?'final':ending?.type;
 const leftAir=boundary?.type==='repeat-start'?5:.8,rightAir=endingType==='repeat-end'||endingType==='final'?5:.8;
 svg.setAttribute('viewBox',`${left!-leftAir} ${top} ${right!-left!+leftAir+rightAir} ${bottom-top}`);
 const owned:Crop['owned']=[];const noteGroup=(s:Seat)=>[...new Set(s.ownerIds.map(id=>{const group=plan.ownerGroup.get(id);if(!group)throw Error(`Measure ${bar+1}: unknown source owner ${id}.`);return group;}))];
 let carriers=carrierCache.get(p);if(!carriers){carriers=fingeringCarriers(p);carrierCache.set(p,carriers);}
 const stems=[...clone.querySelectorAll<SVGGraphicsElement>('.janko-stem,.janko-hollow-stem')];
 const stemOwners=new Map(stems.map((el,index)=>[el,all.filter(s=>carriers.get(s.id)?.associatedStemIds.includes(`${first.page}:${first.system}:stem-${index}`))]));
 const stemSeats=(el:Element)=>{const matches=stemOwners.get(el as SVGGraphicsElement);if(!matches?.length)throw Error(`Measure ${bar+1}: unresolved ${el.getAttribute('class')} ownership.`);return matches;};
 const stemBoxes=new Map(stems.map(el=>{const points=el.localName==='line'?[[Number(el.getAttribute('x1')),Number(el.getAttribute('y1'))],[Number(el.getAttribute('x2')),Number(el.getAttribute('y2'))]]:el.localName==='rect'?[[Number(el.getAttribute('x')),Number(el.getAttribute('y'))],[Number(el.getAttribute('x'))+Number(el.getAttribute('width')),Number(el.getAttribute('y'))+Number(el.getAttribute('height'))]]:Array.from((el.getAttribute('d')??'').matchAll(/([+-]?(?:\d*\.)?\d+)\s+([+-]?(?:\d*\.)?\d+)/g),m=>[Number(m[1]),Number(m[2])]);return [el,{x:(Math.min(...points.map(p=>p[0]))+Math.max(...points.map(p=>p[0])))/2,top:Math.min(...points.map(p=>p[1])),bottom:Math.max(...points.map(p=>p[1]))}];}));
 const assign=(el:Element,groups:string[],printed:Seat[]=[])=>{if(groups.length&&!(printed.length?printed.some(s=>s.writtenBar===bar+1):groups.some(g=>Number(g.split(':')[0])===bar))){el.remove();return;}if(groups.length){el.setAttribute('data-practice-owner-ids',[...new Set(printed.flatMap(s=>s.ownerIds))].join('|'));owned.push({el:el as SVGElement,groups:[...new Set(groups)]});}};
 clone.querySelectorAll('[data-viewer-seat]').forEach(el=>{const seat=p.seats.find(s=>s.id===el.getAttribute('data-viewer-seat'))!,head=el.closest('.janko-reading-head');if(head)assign(head,noteGroup(seat),[seat]);else{const slot=el.previousElementSibling;if(slot?.classList.contains('janko-knockout'))assign(slot,noteGroup(seat),[seat]);assign(el,noteGroup(seat),[seat]);}});
 clone.querySelectorAll('.janko-beam-group').forEach(g=>{const printed=[...g.querySelectorAll('.janko-stem')].flatMap(stemSeats);assign(g,printed.flatMap(noteGroup),printed);});
 clone.querySelectorAll('.janko-stem,.janko-hollow-stem').forEach(el=>{const printed=stemSeats(el);assign(el,printed.flatMap(noteGroup),printed);});
 clone.querySelectorAll('.janko-stem-ring').forEach(el=>{const x=Number(el.getAttribute('cx')),y=Number(el.getAttribute('cy')),candidates=stems.filter(s=>{const b=stemBoxes.get(s)!;return Math.abs(b.x-x)<.03&&y>=b.top-.03&&y<=b.bottom+.03;});const printed=candidates.flatMap(stemSeats);if(!printed.length)throw Error(`Measure ${bar+1}: unresolved duration ring.`);assign(el,printed.flatMap(noteGroup),printed);});
 clone.querySelectorAll('[data-stem-x]').forEach(el=>{const x=Number(el.getAttribute('data-stem-x')),values=(el.getAttribute('d')??'').match(/[+-]?(?:\d*\.)?\d+/g)?.map(Number)??[],ys=values.filter((_,i)=>i%2===1),top=Math.min(...ys),bottom=Math.max(...ys),matches=stems.filter(s=>{const b=stemBoxes.get(s)!;return Math.abs(b.x-x)<.03&&top<=b.bottom+.03&&bottom>=b.top-.03;}).flatMap(stemSeats);if(!matches.length)throw Error(`Measure ${bar+1}: unresolved duration flag.`);assign(el,matches.flatMap(noteGroup),matches);});
 const writtenValue=(seat:Seat,id:string)=>{const head=doc.querySelector(`[data-viewer-seat="${seat.id}"]`)!.closest('[data-note-id]')?.getAttribute('data-note-id'),chain=p.score.tieChains?.find(c=>c.noteId===id),component=head?.match(/~c(\d+)$/)?.[1];return chain?.components[component?Number(component):0]?.durationTicks??p.score.notes.find(n=>n.id===id)!.durationTicks;};
 const dotHeads=all.map(seat=>{const note=requirePianoEvent(p.score.notes.find(n=>n.id===seat.ownerIds[0])!),text=doc.querySelector(`[data-viewer-seat="${seat.id}"]`)!,rect=text.closest('.janko-reading-head')?.querySelector('rect')??text.previousElementSibling!,width=Number(rect.getAttribute('width'))/2,height=Number(rect.getAttribute('height'))/2;
  // Invert the shared digit baseline on the actual frozen glyph seat. This
  // projection is only a glyph-rim ownership query, never new score paint.
  return {seat,placed:{note:{...note,id:seat.id,pitch:{...note.pitch,pitchClass:parseInt(seat.pitchDigit,12)}},x:seat.x,y:seat.baseline-digitBaselineOffset(seat.fontSize),rhythm:{hand:note.hand,durationTicks:writtenValue(seat,note.id),sourceVoice:note.sourceProvenance?.voices[0],sourceBeam:note.sourceBeam,maskHalfWidth:width,maskHalfHeight:height},symbolScale:seat.fontSize/resolveIsoTokens(p.renderingRecipe?.tokens).digitFontSize} as unknown as PositionedIsoNote};});
 clone.querySelectorAll('.janko-augmentation-dot,.janko-dot,.janko-duration-dot').forEach(el=>{const x=Number(el.getAttribute('cx')),y=Number(el.getAttribute('cy')),index=Number(el.getAttribute('data-dot'))||1,tokens=resolveIsoTokens({...p.renderingRecipe?.tokens,augmentationDotRadius:Number(el.getAttribute('r'))}),matches=dotHeads.filter(({seat,placed})=>seat.ownerIds.some(id=>durationDotCount(writtenValue(seat,id),'complete')>=index)&&Math.abs(seat.x-x)<seat.fontSize*4/3*2&&Math.abs(seat.baseline-y)<seat.fontSize*4/3*4&&glyphDotIsOwned(placed,dotHeads.map(h=>h.placed),x,y,tokens));
  const first=matches[0]?.placed,compatible=matches.every(({placed})=>placed.note.startTick===first?.note.startTick&&placed.rhythm.hand===first?.rhythm.hand&&placed.rhythm.durationTicks===first?.rhythm.durationTicks&&placed.rhythm.sourceVoice===first?.rhythm.sourceVoice&&(placed.rhythm.sourceBeam?.group??null)===(first?.rhythm.sourceBeam?.group??null));
  if(!matches.length||!compatible)throw Error(`Measure ${bar+1}: ${matches.length?'ambiguous':'unresolved'} duration dot ownership.`);
  const printed=matches.map(h=>h.seat),owners=[...new Set(printed.flatMap(seat=>seat.ownerIds.filter(id=>durationDotCount(writtenValue(seat,id),'complete')>=index)))];assign(el,owners.map(id=>plan.ownerGroup.get(id)!),printed);el.setAttribute('data-practice-owner-ids',owners.join('|'));
 });
 clone.querySelectorAll('[data-tie-note],[data-bridge-notes]').forEach(el=>{const owners=(el.getAttribute('data-tie-note')??el.getAttribute('data-bridge-notes')!).split(',').map(id=>id.replace(/~c\d+$/,'')),groups=owners.map(owner=>{const group=plan.ownerGroup.get(owner);if(!group)throw Error(`Measure ${bar+1}: unresolved relation owner ${owner}.`);return group;});
  // A source relation can cross a rest-only interval with no new head. Its
  // original contributors still own every clipped fragment/reservation.
  el.setAttribute('data-practice-owner-ids',owners.join('|'));owned.push({el:el as SVGElement,groups:[...new Set(groups)]});
 });
 // Interior phrase fragments belong to every literal source bar crossed by
 // the relation, not only the bars where endpoint attacks originally start.
 clone.querySelectorAll('[data-phrase]').forEach(el=>{const phrase=p.score.phrases?.find(q=>q.id===el.getAttribute('data-phrase'));if(!phrase)throw Error(`Measure ${bar+1}: unresolved source phrase.`);const previous=el.previousElementSibling,knockout=previous?.classList.contains('janko-phrase-grid-knockout')?previous:undefined;
  if(phrase.startTick>=plan.barTicks[bar+1]||phrase.endTick<plan.barTicks[bar]){el.remove();knockout?.remove();return;}
  const endpoint=[...(phrase.fromNoteIds??[]),...(phrase.toNoteIds??[])],hands=new Set(p.score.notes.filter(n=>endpoint.includes(n.id)).map(n=>n.hand)),groups=[...new Set([...endpoint.map(id=>plan.ownerGroup.get(id)).filter((g):g is string=>!!g),...plan.gestures.filter(g=>g.bar===bar&&g.hand!==null&&hands.has(g.hand)).map(g=>g.id)])];
  if(groups.length){owned.push({el:el as SVGElement,groups});if(knockout)owned.push({el:knockout as SVGElement,groups});}
 });
 // Full-span structural lanes identify the shared reference. A locally
 // authored register extension is genuine ink, not a new staff origin.
 const lanes=[...system.querySelectorAll<SVGLineElement>('.janko-pitch-lane')].filter(l=>Math.abs(Number(l.getAttribute('x1'))-gridLeft)<.03&&Math.abs(Number(l.getAttribute('x2'))-gridRight)<.03).map(l=>Number(l.getAttribute('y1'))).filter((y,i,a)=>a.indexOf(y)===i).sort((a,b)=>a-b);
 if(!lanes.length)throw Error(`Measure ${bar+1}: missing musical staff frame.`);
 return {bar,svg,seats,width:right!-left!+leftAir+rightAir,height:bottom-top,left:left!,right:right!,leftAir,rightAir,endingType,frame:lanes[0],lanes:lanes.map(y=>y-lanes[0]),owned};
}

/** Empty intervals retain their real staff, metric guides and authored boundary.
 * A non-note mark keeps its full source footprint; it is never clipped to
 * obtain room. Owned note/relation paint is already outside the reading lead. */
const blankMeasures=new WeakMap<Crop,{width:number;ink:SVGElement[]}>();
export function blankMeasureWidth(crop:Crop,mount:HTMLElement){
 const cached=blankMeasures.get(crop);if(cached)return cached.width;
 mount.append(crop.svg);const inverse=crop.svg.getScreenCTM()!.inverse(),ink:SVGElement[]=[];let full=false;
 try{for(const el of crop.svg.querySelectorAll<SVGGraphicsElement>('path,line,rect,circle,ellipse,polygon,polyline,text')){
  if(el.closest('defs,clipPath,mask')||crop.owned.some(o=>o.el===el||o.el.contains(el))||el.closest(projectedRelationPaint))continue;
  const b=el.getBBox(),m=inverse.multiply(el.getScreenCTM()!),points=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(m));
  if(Math.max(...points.map(p=>p.x))<crop.left-.03||Math.min(...points.map(p=>p.x))>crop.right+.03)continue;
  const lane=el.matches('.janko-pitch-lane'),structural=lane||el.closest('.janko-barlines,.janko-repeat')||el.matches('.janko-beat-line,.janko-repeat-barline');
  if(!structural){full=true;break;}ink.push(el.cloneNode(false) as SVGElement);
 }}finally{crop.svg.remove();}
 const width=full?crop.right-crop.left:Math.min(4,crop.right-crop.left);blankMeasures.set(crop,{width,ink});return width;
}
export function blankMeasureCrop(crop:Crop,width:number):Crop {
 const saved=blankMeasures.get(crop);if(!saved||!Number.isFinite(width)||width<saved.width-1e-7)throw Error(`Measure ${crop.bar+1}: no admitted empty frame.`);
 const svg=document.createElementNS(ns,'svg');for(const el of crop.svg.children)if(['style','defs'].includes(el.localName))svg.append(el.cloneNode(true));
 const rules=document.createElementNS(ns,'g');rules.setAttribute('class','janko-barlines');svg.append(rules);
 const sourceWidth=crop.right-crop.left;
 for(const original of saved.ink){const el=original.cloneNode(false) as SVGElement;
  if(el.localName==='line'){
   const x1=Number(el.getAttribute('x1')),x2=Number(el.getAttribute('x2'));
   if(el.matches('.janko-pitch-lane')){el.setAttribute('x1',String(crop.left+Math.max(0,Math.min(1,(x1-crop.left)/sourceWidth))*width));el.setAttribute('x2',String(crop.left+Math.max(0,Math.min(1,(x2-crop.left)/sourceWidth))*width));}
   else{const shift=x1>=crop.right-5?width-sourceWidth:x1<=crop.left+5?0:(x1-crop.left)*(width/sourceWidth-1);el.setAttribute('x1',String(x1+shift));el.setAttribute('x2',String(x2+shift));}
  }else if(el.localName==='circle'){const x=Number(el.getAttribute('cx')),shift=x>=crop.right-5?width-sourceWidth:0;el.setAttribute('cx',String(x+shift));}
  else throw Error(`Measure ${crop.bar+1}: unsupported empty structural paint.`);
  rules.append(el);
 }
 // A source system break may omit its ordinary ending rule. The composed
 // staff already continues that exact source style between intervals; keep
 // its template available after replacing an empty interval's system crop.
 if(!crop.endingType||crop.endingType==='regular'){
  const ending=[...rules.querySelectorAll<SVGLineElement>('line')].some(l=>Math.abs(Number(l.getAttribute('x1'))-crop.left-width)<3&&Math.abs(Number(l.getAttribute('x2'))-Number(l.getAttribute('x1')))<.03);
  if(!ending){const template=[...crop.svg.querySelectorAll<SVGLineElement>('.janko-barlines .janko-barline')].find(l=>Number(l.getAttribute('stroke-width'))===.6);if(!template)throw Error(`Measure ${crop.bar+1}: missing admitted empty separator.`);const line=template.cloneNode(false) as SVGLineElement;line.removeAttribute('id');line.setAttribute('x1',String(crop.left+width));line.setAttribute('x2',String(crop.left+width));rules.append(line);}
 }
 svg.dataset.practiceBar=String(crop.bar+1);svg.dataset.practiceEmpty='true';return {...crop,empty:true,svg,seats:[],owned:[],right:crop.left+width,width};
}

export interface Passage {svg:SVGSVGElement;crops:Crop[];relations:Crop['owned'];width:number;height:number}
export interface PassageTrack {width:number;top:number;bottom:number;leftAir:number;rightAir:number;lanes:number[];boxes:Map<number,InkBox[]>;topAir?:number;frame?:{left:number;right:number}}
let sequence=0;
/** SVG geometry must be read while attached to a real rendering document.
 * All admitted ink and every possible annotation contribute before hiding. */
export function passageTrack(crops:Crop[],mount:HTMLElement,p?:ScorePackage,projected=false):PassageTrack {
 if(!crops.length)throw Error('The passage has no source measures.');
 const lanes=crops[0].lanes;
 let top=Infinity,bottom=-Infinity;const boxes=new Map<number,InkBox[]>();
 for(const crop of crops){
  if(crop.lanes.length!==lanes.length||crop.lanes.some((y,i)=>Math.abs(y-lanes[i])>.03))throw Error(`Measure ${crop.bar+1}: unsupported musical staff mapping.`);
  mount.append(crop.svg);const obstacles:InkBox[]=[];boxes.set(crop.bar,obstacles);
  const inverse=crop.svg.getScreenCTM()!.inverse();
  for(const el of crop.svg.querySelectorAll<SVGGraphicsElement>('path,line,rect,circle,ellipse,polygon,polyline,text')){
   if(el.closest('defs,clipPath,mask')||projected&&el.closest(projectedRelationPaint)||el.classList.contains('practice-playhead'))continue;
   const box=el.getBBox();if(!box.width&&!box.height)continue;
   const matrix=inverse.multiply(el.getScreenCTM()!),points=[[box.x,box.y],[box.x+box.width,box.y],[box.x,box.y+box.height],[box.x+box.width,box.y+box.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(matrix));
   if(Math.max(...points.map(p=>p.x))<crop.left||Math.min(...points.map(p=>p.x))>crop.right)continue;
   const stroke=(Number(el.getAttribute('stroke-width'))/2||0)*Math.max(Math.abs(matrix.a),Math.abs(matrix.d));
   top=Math.min(top,...points.map(p=>p.y-crop.frame-stroke));bottom=Math.max(bottom,...points.map(p=>p.y-crop.frame+stroke));
   if(el.closest('.janko-reading-head,.janko-beam-group')||el.matches('[data-viewer-seat],.janko-knockout,.janko-stem,.janko-hollow-stem,.janko-stem-ring,[data-stem-x],.janko-augmentation-dot,.janko-rest,.janko-dynamic,.janko-pedal,.janko-hairpin,[data-bridge-notes]'))obstacles.push({x0:Math.max(crop.left,Math.min(...points.map(p=>p.x))-stroke),x1:Math.min(crop.right,Math.max(...points.map(p=>p.x))+stroke),y0:Math.min(...points.map(p=>p.y))-stroke,y1:Math.max(...points.map(p=>p.y))+stroke,...(el.hasAttribute('data-viewer-seat')?{seatId:el.getAttribute('data-viewer-seat')!}:{})});
  }
  if(p)for(const seat of crop.seats){const bounds=annotationPositions(p).get(seat.id)!.bounds;top=Math.min(top,bounds[1]-crop.frame);bottom=Math.max(bottom,bounds[3]-crop.frame);obstacles.push({x0:bounds[0],y0:bounds[1],x1:bounds[2],y1:bounds[3]});}
  crop.svg.remove();
 }
 return {width:Math.max(...crops.map(c=>c.right-c.left)),top:top-3,bottom:bottom+3,leftAir:Math.max(...crops.map(c=>c.leftAir)),rightAir:Math.max(...crops.map(c=>c.rightAir)),lanes,boxes};
}
/** Reserve every admitted window's complete curves before choosing the scale. */
export function fitPassageRelations(p:ScorePackage,plan:PracticePlan,crops:Crop[],track:PassageTrack,policy:'compact'|'fixed',windows:Array<Array<number|undefined>>){
 for(const positions of windows)for(const q of projectRelations(p,plan,crops,track,policy,positions)){track.top=Math.min(track.top,q.bounds.y0-3);track.bottom=Math.max(track.bottom,q.bounds.y1+3);}
 return track;
}
/** Measure complete admitted paint, intersecting each real ancestor clip. SVG
 * getBBox alone includes frozen ink outside a measure's visible viewport. */
export function passageInkBounds(passage:Passage,p?:ScorePackage):InkBox {
 const svg=passage.svg,inverse=svg.getScreenCTM()!.inverse();let result:InkBox={x0:Infinity,x1:-Infinity,y0:Infinity,y1:-Infinity};
 const transform=(el:SVGGraphicsElement,b:InkBox)=>{const m=inverse.multiply(el.getScreenCTM()!),points=[[b.x0,b.y0],[b.x1,b.y0],[b.x0,b.y1],[b.x1,b.y1]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(m));return {x0:Math.min(...points.map(p=>p.x)),x1:Math.max(...points.map(p=>p.x)),y0:Math.min(...points.map(p=>p.y)),y1:Math.max(...points.map(p=>p.y))};};
 const admit=(el:SVGGraphicsElement,box:InkBox)=>{
  for(let parent:Element|null=el;parent&&parent!==svg;parent=parent.parentElement){const reference=parent.getAttribute('clip-path')?.match(/url\(#([^)]*)\)/)?.[1];if(!reference)continue;const clip=svg.querySelector(`#${CSS.escape(reference)}`),rect=clip?.querySelector('rect');if(!rect)throw Error('Unsupported passage clip frame.');const x=Number(rect.getAttribute('x')),y=Number(rect.getAttribute('y')),bounds=transform(parent as SVGGraphicsElement,{x0:x,y0:y,x1:x+Number(rect.getAttribute('width')),y1:y+Number(rect.getAttribute('height'))});box={x0:Math.max(box.x0,bounds.x0),x1:Math.min(box.x1,bounds.x1),y0:Math.max(box.y0,bounds.y0),y1:Math.min(box.y1,bounds.y1)};}
  if(box.x1<box.x0||box.y1<box.y0)return;result={x0:Math.min(result.x0,box.x0),x1:Math.max(result.x1,box.x1),y0:Math.min(result.y0,box.y0),y1:Math.max(result.y1,box.y1)};
 };
 for(const el of svg.querySelectorAll<SVGGraphicsElement>('path,line,rect,circle,ellipse,polygon,polyline,text')){
  if(el.closest('defs,clipPath,mask')||el.classList.contains('practice-playhead'))continue;const b=el.getBBox();if(!b.width&&!b.height)continue;const style=getComputedStyle(el),half=style.stroke==='none'?0:parseFloat(style.strokeWidth)/2||0;admit(el,transform(el,{x0:b.x-half,y0:b.y-half,x1:b.x+b.width+half,y1:b.y+b.height+half}));
 }
 if(p)for(const crop of passage.crops)for(const seat of crop.seats){const [x0,y0,x1,y1]=annotationPositions(p).get(seat.id)!.bounds;admit(crop.svg,transform(crop.svg,{x0,y0,x1,y1}));}
 if(!Number.isFinite(result.x0)||result.x1<=result.x0)throw Error('The passage has no admitted painted frame.');return result;
}
/** Horizontal framing is established before hiding. A joined run reserves the
 * union of every window/refill state, so no ordinary repaint recenters ink. */
export function fitPassageFrame(p:ScorePackage,plan:PracticePlan,crops:Crop[],track:PassageTrack,policy:'compact'|'fixed',windows:Array<Array<number|undefined>>,mount:HTMLElement,placements?:ReadonlyArray<{bar:number;x:number}>){
 let left=Infinity,right=-Infinity;
 for(const positions of windows){const passage=composePassage(crops,track,policy,positions,projectRelations(p,plan,crops,track,policy,positions,placements),placements);mount.append(passage.svg);try{const b=passageInkBounds(passage,p);left=Math.min(left,b.x0);right=Math.max(right,b.x1);}finally{passage.svg.remove();}}
 track.frame={left:left-.8,right:right+.8};return track;
}
/** One source-to-display translation per position. Compact previews and
 * explicit refills retain literal source widths; fixed manual windows reserve
 * equal slots. Content, seats, fingers and playhead share one source frame. */
export function composePassage(crops:Crop[],track:PassageTrack,policy:'compact'|'fixed',positions:Array<number|undefined>=crops.map(c=>c.bar),projected?:ProjectedRelation[],placements?:ReadonlyArray<{bar:number;x:number}>):Passage {
 const svg=document.createElementNS(ns,'svg'),prefix=`practice-${++sequence}-`,defs=document.createElementNS(ns,'defs'),placed:Crop[]=[];
 svg.classList.add('practice-passage');svg.setAttribute('preserveAspectRatio','xMinYMin meet');svg.append(defs);
 let x=0;
 for(const [slot,bar]of positions.entries()){
  if(placements&&bar!==undefined){const placement=placements.find(p=>p.bar===bar);if(!placement)throw Error(`Measure ${bar+1}: missing admitted placement.`);x=placement.x;}
  const crop=crops.find(c=>c.bar===bar),width=policy==='fixed'?track.width:crop?crop.right-crop.left:0;
  if(!crop){x+=width;continue;}
  crop.owned.forEach(({el},i)=>el.setAttribute('data-practice-owned',String(i)));
  const source=crop.svg.cloneNode(true) as SVGSVGElement,sourceWidth=crop.right-crop.left;
  if(projected)source.querySelectorAll(projectedRelationPaint).forEach(el=>el.remove());
  const owned=crop.owned.flatMap(({groups},i)=>{const el=source.querySelector<SVGElement>(`[data-practice-owned="${i}"]`);return el?[{groups,el}]:[];});
  const group=document.createElementNS(ns,'g');group.dataset.practiceBar=String(bar!+1);group.dataset.slot=String(slot);group.setAttribute('role','group');group.setAttribute('aria-label',`Measure ${bar!+1}${crop.empty?', outside the current reading lead':''}`);if(crop.empty)group.dataset.practiceEmpty='true';group.setAttribute('transform',`translate(${x-crop.left} ${-crop.frame})`);
  // Clone namespaces, preserve inert seat/source identities. Clip only the
  // admitted interval, with a small ending edge allowance for authored rules.
  const clip=document.createElementNS(ns,'clipPath'),rect=document.createElementNS(ns,'rect'),id=`${prefix}bar-${slot}`;
  clip.id=id;rect.setAttribute('x',String(crop.left-crop.leftAir));rect.setAttribute('y',String(track.top+crop.frame));rect.setAttribute('width',String(sourceWidth+crop.leftAir+crop.rightAir));rect.setAttribute('height',String(track.bottom-track.top));clip.append(rect);defs.append(clip);
  source.setAttribute('viewBox',`${crop.left-crop.leftAir} ${track.top+crop.frame} ${sourceWidth+crop.leftAir+crop.rightAir} ${track.bottom-track.top}`);
  source.setAttribute('x',String(crop.left-crop.leftAir));source.setAttribute('y',String(track.top+crop.frame));source.setAttribute('width',String(sourceWidth+crop.leftAir+crop.rightAir));source.setAttribute('height',String(track.bottom-track.top));source.setAttribute('preserveAspectRatio','none');
  group.append(source);
  group.setAttribute('clip-path',`url(#${id})`);
  for(const el of group.querySelectorAll('[id]')){const old=el.id;el.id=prefix+slot+'-'+old;for(const use of group.querySelectorAll('*'))for(const attr of [...use.attributes])if(attr.value===`#${old}`||attr.value.includes(`url(#${old})`))use.setAttribute(attr.name,attr.value.replaceAll(`#${old}`,`#${el.id}`));}
  // Discard source rules at the entering edge. They belong to the preceding
  // measure unless the source explicitly supplies an entering repeat.
  group.querySelectorAll<SVGLineElement>('.janko-barlines line').forEach(line=>{const lx=Number(line.getAttribute('x1'));if(lx<=crop.left+.02&&Math.abs(Number(line.getAttribute('x2'))-lx)<.02)line.remove();});
  // Full-score systems use their break as the final ordinary boundary. Once
  // adjoining real intervals, continue the admitted ordinary rule at that
  // source boundary, using its existing geometry/style (never repeat ink).
  if(positions[slot+1]!==undefined&&(!crop.endingType||crop.endingType==='regular')){
   const ending=[...group.querySelectorAll<SVGLineElement>('.janko-barlines line,.janko-repeat line')].some(line=>Math.abs(Number(line.getAttribute('x1'))-crop.right)<3);
   if(!ending){const template=[...crop.svg.querySelectorAll<SVGLineElement>('.janko-barlines .janko-barline')].find(line=>Number(line.getAttribute('stroke-width'))===.6);if(!template)throw Error(`Measure ${bar!+1}: missing admitted ordinary separator.`);const line=template.cloneNode(false) as SVGLineElement;line.removeAttribute('id');line.setAttribute('x1',String(crop.right));line.setAttribute('x2',String(crop.right));line.setAttribute('data-practice-source-boundary',String(bar!+1));source.append(line);}
  }
  if(positions.slice(slot+1).every(bar=>bar===undefined)&&(!crop.endingType||crop.endingType==='regular'))group.querySelectorAll<SVGLineElement>('.janko-barlines line').forEach(line=>{if(Math.abs(Number(line.getAttribute('x1'))-crop.right)<.03)line.remove();});
  const rules=[...group.querySelectorAll<SVGLineElement>('.janko-pitch-lane')].filter(line=>crop.lanes.some(y=>Math.abs(Number(line.getAttribute('y1'))-crop.frame-y)<.03));
  for(const line of rules){line.setAttribute('x1',String(crop.left));line.setAttribute('x2',String(crop.right));}
  // The staff is one persistent reading surface. Reserve source boundary
  // air without breaking its lines, including at a spatial source wrap.
  const next=positions[slot+1],nextX=next!==undefined?(placements?.find(p=>p.bar===next)?.x??x+width):undefined;
  if(nextX!==undefined&&nextX>x+sourceWidth+.001){
   const padding=document.createElementNS(ns,'g');padding.classList.add('practice-staff-padding');padding.dataset.slot=String(slot);
   for(const rule of rules){const line=rule.cloneNode(false) as SVGLineElement;line.setAttribute('x1',String(x+sourceWidth));line.setAttribute('x2',String(nextX));line.setAttribute('y1',String(Number(rule.getAttribute('y1'))-crop.frame));line.setAttribute('y2',line.getAttribute('y1')!);padding.append(line);}svg.append(padding);
  }
  svg.append(group);
  placed.push({...crop,svg:source,owned,width:sourceWidth,height:track.bottom-track.top});
  x+=width;
 }
 const relations:Crop['owned']=[],relationGroups=new Map<string,SVGGElement>();
 for(const [i,q]of (projected??[]).entries()){
  const clip=document.createElementNS(ns,'clipPath'),rect=document.createElementNS(ns,'rect');clip.id=`${prefix}relation-${i}`;rect.setAttribute('x',String(q.left));rect.setAttribute('y',String(track.top));rect.setAttribute('width',String(q.right-q.left));rect.setAttribute('height',String(track.bottom-track.top));clip.append(rect);defs.append(clip);
  let owner=relationGroups.get(q.id);if(!owner){owner=document.createElementNS(ns,'g');owner.dataset.practiceRelation=q.id;relationGroups.set(q.id,owner);svg.append(owner);relations.push({el:owner,groups:q.groups});}
  const g=document.createElementNS(ns,'g');g.setAttribute('clip-path',`url(#${clip.id})`);
  if(q.kind==='phrase'&&q.knockout){const knockout=q.path.cloneNode(false) as SVGPathElement;knockout.removeAttribute('data-practice-relation');knockout.setAttribute('data-practice-reservation',q.id);knockout.setAttribute('class','janko-phrase-grid-knockout');knockout.setAttribute('fill','white');knockout.setAttribute('stroke','white');knockout.setAttribute('stroke-width','1.2');knockout.setAttribute('stroke-linejoin','round');g.append(knockout);}
  g.append(q.path);owner.append(g);
 }
 const top=track.top-(track.topAir??18),height=track.bottom-top,left=policy==='fixed'?track.leftAir:placed[0]?.leftAir??0,right=policy==='fixed'?track.rightAir:placed.at(-1)?.rightAir??0,frame=track.frame??{left:-left,right:x+right};svg.setAttribute('viewBox',`${frame.left} ${top} ${frame.right-frame.left} ${height}`);
 return {svg,crops:placed,relations,width:frame.right-frame.left,height};
}
