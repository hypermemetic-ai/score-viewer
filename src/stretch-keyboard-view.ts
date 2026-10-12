import type {StretchCalibrationContact,StretchCalibrationGeometry} from '@hypermemetic-ai/fingering-calculator';
import {actuatorWorldPoint,stretchActuator,stretchActuatorBody,stretchSurface,surfaceLocalPoint,type StretchPoint} from './stretch-calibration-geometry';

export interface StretchMeasurementWindow {
 surfaceId:string;axisStartMm:number;axisEndMm:number;fraction?:number;label?:string;
}
export interface StretchKeyboardScene {
 geometry:StretchCalibrationGeometry;contacts:readonly StretchCalibrationContact[];windows?:readonly StretchMeasurementWindow[];
}
export interface StretchKeyboardCamera {elevation:number;azimuth:number;zoom:number}
export interface StretchKeyboardOptions {colors?:'five-seven'|'classic'}
export interface StretchKeyboardViewport {width:number;height:number}
export const STRETCH_KEYBOARD_DEFAULT_CAMERA:Readonly<StretchKeyboardCamera>=Object.freeze({elevation:36,azimuth:5,zoom:1});
export interface StretchKeyboardFace {
 actuatorId:string;surfaceId?:string;kind:'body'|'playable';points:StretchPoint[];color:string;
}
const ns='http://www.w3.org/2000/svg',defaultViewport:StretchKeyboardViewport={width:960,height:540};
const fingerNames=['','Thumb','Index','Middle','Ring','Pinky'];
const fingerColors=['','#e8bb77','#76cce2','#b9d592','#d9a6d2','#aabdf1'];
const escaped=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const dot=(a:StretchPoint,b:StretchPoint)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const subtract=(a:StretchPoint,b:StretchPoint):StretchPoint=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a:StretchPoint,b:StretchPoint):StretchPoint=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const pointText=(points:readonly number[][])=>points.map(p=>p.map(n=>n.toFixed(2)).join(',')).join(' ');
const blackKey=(pitch:number,colors:StretchKeyboardOptions['colors'])=>colors==='classic'?[1,3,6,8,10].includes(pitch%12):pitch%12<5;

function cameraBasis(camera:StretchKeyboardCamera){
 const azimuth=camera.azimuth*Math.PI/180,elevation=camera.elevation*Math.PI/180;
 const ca=Math.cos(azimuth),sa=Math.sin(azimuth),ce=Math.cos(elevation),se=Math.sin(elevation);
 return {right:[ca,sa,0] as StretchPoint,up:[-se*sa,se*ca,ce] as StretchPoint,towardViewer:[ce*sa,-ce*ca,se] as StretchPoint};
}
/** Orthographic camera math changes presentation only; it never writes to the physical scene. */
export function projectStretchPoint(point:StretchPoint,camera:StretchKeyboardCamera,center:StretchPoint=[0,0,0]):readonly [number,number,number] {
 const basis=cameraBasis(camera),relative=subtract(point,center);
 return [dot(relative,basis.right),-dot(relative,basis.up),dot(relative,basis.towardViewer)];
}

function visibleActuators(scene:StretchKeyboardScene){
 const pitches=[...scene.contacts.map(c=>c.midiPitch),...(scene.windows??[]).map(w=>stretchSurface(scene.geometry,w.surfaceId).midiPitch)];
 const [first,last]=scene.geometry.admittedMidiRange;
 const origin=Math.max(first,Math.min(last,scene.geometry.originMidiPitch));
 const min=pitches.length?Math.min(...pitches)-2:origin-5,max=pitches.length?Math.max(...pitches)+2:origin+5;
 return scene.geometry.actuators.filter(a=>a.midiPitch>=min&&a.midiPitch<=max);
}
function keyState(scene:StretchKeyboardScene,actuatorId:string):StretchCalibrationContact['keyState'] {
 return scene.contacts.some(contact=>contact.actuatorId===actuatorId&&contact.keyState==='depressed')?'depressed':'resting-contact';
}
function posedPoint(scene:StretchKeyboardScene,actuatorId:string,point:StretchPoint):StretchPoint {
 const result=actuatorWorldPoint(stretchActuator(scene.geometry,actuatorId),point,keyState(scene,actuatorId));
 if(!result)throw Error('The depressed key position is not mapped for this geometry.');
 return result;
}

function profileTriangles(profile:StretchPoint[]):StretchPoint[][] {
 // Ear clipping retains concave manufacturer mounting silhouettes instead of filling their recesses.
 const area=profile.reduce((sum,p,i)=>{const next=profile[(i+1)%profile.length];return sum+p[1]*next[2]-next[1]*p[2];},0);
 const points=area<0?[...profile].reverse():[...profile],indices=points.map((_,i)=>i),triangles:StretchPoint[][]=[];
 const orientation=(a:StretchPoint,b:StretchPoint,c:StretchPoint)=>(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]);
 while(indices.length>3){
  let ear=false;
  for(let at=0;at<indices.length;at++){
   const before=indices[(at+indices.length-1)%indices.length],current=indices[at],after=indices[(at+1)%indices.length];
   const a=points[before],b=points[current],c=points[after];
   if(orientation(a,b,c)<=1e-9)continue;
   const inside=indices.some(i=>i!==before&&i!==current&&i!==after&&orientation(a,b,points[i])>=-1e-9&&orientation(b,c,points[i])>=-1e-9&&orientation(c,a,points[i])>=-1e-9);
   if(inside)continue;
   triangles.push([a,b,c]);indices.splice(at,1);ear=true;break;
  }
  if(!ear)throw Error('The physical key mounting silhouette cannot be triangulated.');
 }
 triangles.push(indices.map(i=>points[i]));return triangles;
}

/** Complete extruded solids. Both terraces and the non-playable tongue belong to one actuator. */
export function stretchKeyboardFaces(scene:StretchKeyboardScene,options:StretchKeyboardOptions={}):StretchKeyboardFace[] {
 const faces:StretchKeyboardFace[]=[];
 for(const actuator of visibleActuators(scene)){
  const body=stretchActuatorBody(scene.geometry,actuator.id),outline=[...body.top,...body.mounting],half=body.bodyWidthMm/2;
  const black=blackKey(actuator.midiPitch,options.colors),top=black?'#25272b':'#dedbd3',side=black?'#16191d':'#9e9a92',bottom=black?'#111318':'#858078';
  const append=(points:StretchPoint[],color:string,kind:StretchKeyboardFace['kind']='body',surfaceId?:string)=>{
   faces.push({actuatorId:actuator.id,kind,...(surfaceId?{surfaceId}:{}),points:points.map(p=>posedPoint(scene,actuator.id,p)),color});
  };
  const quad=(points:StretchPoint[],color:string,kind:StretchKeyboardFace['kind']='body',surfaceId?:string)=>{append([points[0],points[1],points[2]],color,kind,surfaceId);append([points[0],points[2],points[3]],color,kind,surfaceId);};
  // The profile runs near-to-far across the top, then far-to-near around the mounting face.
  for(let i=0;i<outline.length;i++){
   const a=outline[i],b=outline[(i+1)%outline.length],leftA:StretchPoint=[a[0]-half,a[1],a[2]],rightA:StretchPoint=[a[0]+half,a[1],a[2]],leftB:StretchPoint=[b[0]-half,b[1],b[2]],rightB:StretchPoint=[b[0]+half,b[1],b[2]];
   quad([leftA,rightA,rightB,leftB],i<body.top.length-1?top:i>=body.top.length?bottom:side);
  }
  for(const triangle of profileTriangles(outline)){
   append([...triangle].reverse().map(p=>[p[0]-half,p[1],p[2]]),side);
   append(triangle.map(p=>[p[0]+half,p[1],p[2]]),side);
  }
  const surfaces=scene.geometry.surfaces.filter(surface=>surface.actuatorId===actuator.id);
  for(const surface of surfaces){
   const contact=scene.contacts.find(item=>item.location.surfaceId===surface.id);
   if(!contact)continue;
   // The full usable 9mm-wide terrace is highlighted, including for point-attested entries.
   const corners=[[0,0],[1,0],[1,1],[0,1]].map(([u,v])=>{const p=surfaceLocalPoint(surface,u,v);return [p[0],p[1],p[2]+.08] as StretchPoint;});
   quad(corners,fingerColors[contact.finger],'playable',surface.id);
  }
 }
 return faces;
}

export interface StretchWindowPoints {ticks:readonly StretchPoint[];marker:StretchPoint|null;edgeStart:StretchPoint;edgeEnd:StretchPoint}
/** Window endpoint coordinates are independent of the view and exclude the tongue by construction. */
export function stretchMeasurementWindowPoints(scene:StretchKeyboardScene,window:StretchMeasurementWindow):StretchWindowPoints {
 const surface=stretchSurface(scene.geometry,window.surfaceId);
 if(!Number.isFinite(window.axisStartMm)||!Number.isFinite(window.axisEndMm)||window.axisStartMm>=window.axisEndMm||window.axisStartMm<surface.depthMinMm-1e-9||window.axisEndMm>surface.depthMaxMm+1e-9)throw Error('A measurement window must be mapped within one playable terrace.');
 if(window.fraction!==undefined&&!Number.isFinite(window.fraction))throw Error('A measurement fraction must be finite.');
 const at=(fraction:number,edge=false)=>{
  const depth=window.axisStartMm+fraction*(window.axisEndMm-window.axisStartMm),v=(depth-surface.depthMinMm)/(surface.depthMaxMm-surface.depthMinMm);
  const p=surfaceLocalPoint(surface,edge?1.2:.5,v);
  return posedPoint(scene,surface.actuatorId,[p[0],p[1],p[2]+.7]);
 };
 return {ticks:[at(0,true),at(.5,true),at(1,true)],marker:window.fraction===undefined?null:at(window.fraction),edgeStart:at(0,true),edgeEnd:at(1,true)};
}

interface Drawing {inner:string;label:string}
interface Primitive {points:StretchPoint[];face?:StretchKeyboardFace;attributes?:string}
interface Plane {normal:StretchPoint;offset:number}
interface Partition {plane:Plane|null;items:Primitive[];front:Partition|null;back:Partition|null}
const planeEpsilon=1e-7;
function primitivePlane(item:Primitive):Plane|null {
 if(!item.face)return null;
 for(let i=1;i<item.points.length-1;i++){
  const normal=cross(subtract(item.points[i],item.points[0]),subtract(item.points[i+1],item.points[0])),length=Math.sqrt(dot(normal,normal));
  if(length<1e-9)continue;
  const unit=normal.map(value=>value/length) as unknown as StretchPoint;
  return {normal:unit,offset:dot(unit,item.points[0])};
 }
 return null;
}
function classify(item:Primitive,plane:Plane):'front'|'back'|'coplanar'|'split' {
 const distances=item.points.map(point=>dot(plane.normal,point)-plane.offset),front=distances.some(value=>value>planeEpsilon),back=distances.some(value=>value< -planeEpsilon);
 return front&&back?'split':front?'front':back?'back':'coplanar';
}
function splitPrimitive(item:Primitive,plane:Plane):readonly [Primitive,Primitive] {
 const front:StretchPoint[]=[],back:StretchPoint[]=[];
 for(let i=0;i<item.points.length;i++){
  const a=item.points[i],b=item.points[(i+1)%item.points.length],ad=dot(plane.normal,a)-plane.offset,bd=dot(plane.normal,b)-plane.offset;
  if(ad>= -planeEpsilon)front.push(a);if(ad<=planeEpsilon)back.push(a);
  if(item.points.length===2&&i===1)continue;
  if((ad>planeEpsilon&&bd< -planeEpsilon)||(ad< -planeEpsilon&&bd>planeEpsilon)){
   const ratio=ad/(ad-bd),point=a.map((value,axis)=>value+ratio*(b[axis]-value)) as unknown as StretchPoint;
   front.push(point);back.push(point);
  }
 }
 return [{...item,points:front},{...item,points:back}];
}
function partitionPrimitives(items:Primitive[]):Partition|null {
 if(!items.length)return null;
 const candidates=items.map(primitivePlane).filter((plane):plane is Plane=>plane!==null);
 if(!candidates.length)return {plane:null,items,front:null,back:null};
 let plane=candidates[0],score=Infinity;
 // Pick a balanced physical plane; split geometry where depth ordering really changes.
 for(let i=0;i<Math.min(9,candidates.length);i++){
  const candidate=candidates[Math.floor(i*(candidates.length-1)/Math.max(1,Math.min(9,candidates.length)-1))];
  let front=0,back=0,coplanar=0,splits=0;
  for(const item of items){const side=classify(item,candidate);if(side==='front')front++;else if(side==='back')back++;else if(side==='split'){front++;back++;splits++;}else coplanar++;}
  const cost=Math.abs(front-back)+splits*3-coplanar*.2;
  if(cost<score){score=cost;plane=candidate;}
 }
 const front:Primitive[]=[],back:Primitive[]=[],coplanar:Primitive[]=[];
 for(const item of items){
  const side=classify(item,plane);
  if(side==='front')front.push(item);else if(side==='back')back.push(item);else if(side==='coplanar')coplanar.push(item);
  else{const split=splitPrimitive(item,plane);front.push(split[0]);back.push(split[1]);}
 }
 return {plane,items:coplanar,front:partitionPrimitives(front),back:partitionPrimitives(back)};
}
function orderedPrimitives(tree:Partition|null,towardViewer:StretchPoint):Primitive[] {
 if(!tree)return [];
 if(!tree.plane)return tree.items;
 const frontIsNear=dot(tree.plane.normal,towardViewer)>=0;
 return [...orderedPrimitives(frontIsNear?tree.back:tree.front,towardViewer),...tree.items,...orderedPrimitives(frontIsNear?tree.front:tree.back,towardViewer)];
}
/** A split plane ordering handles concave mounting bodies and tilted views without average-depth artifacts. */
export function stretchKeyboardPaintOrder(scene:StretchKeyboardScene,camera:StretchKeyboardCamera,options:StretchKeyboardOptions={}):StretchKeyboardFace[] {
 const basis=cameraBasis(camera),primitives=stretchKeyboardFaces(scene,options).map(face=>({points:face.points,face}));
 return orderedPrimitives(partitionPrimitives(primitives),basis.towardViewer).flatMap(item=>{
  const face=item.face!;
  if(dot(cross(subtract(face.points[1],face.points[0]),subtract(face.points[2],face.points[0])),basis.towardViewer)<=1e-7)return [];
  return [{...face,points:item.points}];
 });
}
function keyboardDrawing(scene:StretchKeyboardScene,camera:StretchKeyboardCamera,options:StretchKeyboardOptions,viewport:StretchKeyboardViewport=defaultViewport):Drawing {
 const {width,height}=viewport;
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<80||height<80)throw Error('The keyboard model needs a visible viewport.');
 const faces=stretchKeyboardFaces(scene,options),allPoints=faces.flatMap(face=>face.points);
 if(!allPoints.length)throw Error('The admitted keyboard has no visible keys.');
 const minimum=[0,1,2].map(axis=>Math.min(...allPoints.map(point=>point[axis]))),maximum=[0,1,2].map(axis=>Math.max(...allPoints.map(point=>point[axis])));
 const center=minimum.map((value,i)=>(value+maximum[i])/2) as unknown as StretchPoint;
 const projected=allPoints.map(point=>projectStretchPoint(point,camera,center));
 const xmin=Math.min(...projected.map(p=>p[0])),xmax=Math.max(...projected.map(p=>p[0])),ymin=Math.min(...projected.map(p=>p[1])),ymax=Math.max(...projected.map(p=>p[1]));
 // ViewBox units are actual CSS pixels in the mounted view: text remains readable as its box resizes.
 const labelColumns=Math.max(1,Math.floor((width-16)/160)),labelRows=Math.ceil(scene.contacts.length/labelColumns);
 const labelHeader=labelRows?labelRows*32+6:6,paddingX=scene.windows?.length?42:18,paddingTop=labelHeader+8,paddingBottom=25;
 const availableHeight=Math.max(24,height-paddingTop-paddingBottom);
 const scale=Math.min(Math.max(24,width-2*paddingX)/Math.max(1,xmax-xmin),availableHeight/Math.max(1,ymax-ymin))*camera.zoom;
 const modelCenterY=paddingTop+availableHeight/2;
 const screen=(point:StretchPoint)=>{const p=projectStretchPoint(point,camera,center);return [width/2+(p[0]-(xmin+xmax)/2)*scale,modelCenterY+(p[1]-(ymin+ymax)/2)*scale,p[2]];};
 const basis=cameraBasis(camera),primitives:Primitive[]=faces.map(face=>({points:face.points,face})),labels:string[]=[];
 const modelLeft=width/2-(xmax-xmin)*scale/2,modelRight=width/2+(xmax-xmin)*scale/2;
 const line=(a:StretchPoint,b:StretchPoint,attributes:string)=>{
  primitives.push({points:[a,b],attributes});
 };
 const windows=(scene.windows??[]).map(window=>({window,points:stretchMeasurementWindowPoints(scene,window)})).sort((a,b)=>screen(a.points.edgeStart)[0]-screen(b.points.edgeStart)[0]);
 for(let windowIndex=0;windowIndex<windows.length;windowIndex++){
  const {window,points}=windows[windowIndex],ticks=points.ticks.map(screen);
  const contact=scene.contacts.find(item=>item.location.surfaceId===window.surfaceId),color=contact?fingerColors[contact.finger]:'#efe8d9';
  const side=windows.length===1||windowIndex%2===1?'right':'left';
  const column=side==='left'?Math.max(36,modelLeft-12):Math.min(width-36,modelRight+12);
  const tickOrder=ticks.map((point,i)=>({point,i,y:Math.max(labelHeader+18,Math.min(height-16,point[1]+4))})).sort((a,b)=>a.y-b.y);
  for(let i=1;i<tickOrder.length;i++)tickOrder[i].y=Math.max(tickOrder[i].y,tickOrder[i-1].y+18);
  const excess=Math.max(0,tickOrder.at(-1)!.y-(height-16));if(excess)for(const tick of tickOrder)tick.y-=excess;
  line(points.edgeStart,points.edgeEnd,`stroke="${color}" stroke-width="1.5" data-measurement-bracket="true"`);
  points.ticks.forEach(point=>line([point[0]-.9,point[1],point[2]],[point[0]+.9,point[1],point[2]],`stroke="${color}" stroke-width="1.5"`));
  const tickLabels=tickOrder.map(({point,i,y})=>`<line x1="${point[0].toFixed(2)}" y1="${point[1].toFixed(2)}" x2="${(column+(side==='left'?4:-4)).toFixed(2)}" y2="${(y-4).toFixed(2)}" stroke="${color}" stroke-width=".8" opacity=".65"/><text x="${column.toFixed(2)}" y="${y.toFixed(2)}" class="stretch-ruler-tick" text-anchor="${side==='left'?'end':'start'}" style="fill:${color}">${i*50}</text>`).join('');
  labels.push(`<g data-measurement-labels="${escaped(window.surfaceId)}" aria-label="${escaped(window.label??'Measurement window')}">${tickLabels}</g>`);
  if(window.label&&!contact){const tick=tickOrder[1];labels.push(`<text x="${column.toFixed(2)}" y="${Math.min(height-16,tick.y+18).toFixed(2)}" class="stretch-ruler-label" text-anchor="${side==='left'?'end':'start'}">${escaped(window.label)}</text>`);}
  if(points.marker){
   line([points.marker[0]-4.5,points.marker[1],points.marker[2]],[points.marker[0]+4.5,points.marker[1],points.marker[2]],'stroke="#f7f0dd" stroke-width="2.2" stroke-dasharray="3 2" data-window-fraction="'+escaped(String(window.fraction))+'"');
  }
 }
 const contactLabels=scene.contacts.map(contact=>{const surface=stretchSurface(scene.geometry,contact.location.surfaceId),point=surfaceLocalPoint(surface,.5,.35);return {contact,surface,projectedPoint:screen(posedPoint(scene,surface.actuatorId,point))};}).sort((a,b)=>a.projectedPoint[0]-b.projectedPoint[0]);
 for(let i=0;i<contactLabels.length;i++){
  const {contact,surface,projectedPoint}=contactLabels[i],row=Math.floor(i/labelColumns),inRow=Math.min(labelColumns,contactLabels.length-row*labelColumns);
  // Separate screen annotations from physical points; a label is never a measured strike point.
  const position={x:width*(i%labelColumns+.5)/inRow,y:22+row*32};
  const text=`${fingerNames[contact.finger]} · ${'0123456789AB'[contact.midiPitch%12]} · row ${contact.row}`;
  labels.push(`<g class="stretch-contact-label" data-contact-surface="${escaped(surface.id)}"><line x1="${projectedPoint[0].toFixed(2)}" y1="${projectedPoint[1].toFixed(2)}" x2="${position.x.toFixed(2)}" y2="${(position.y+7).toFixed(2)}" stroke="${fingerColors[contact.finger]}" stroke-width="1"/><rect x="${(position.x-79).toFixed(2)}" y="${(position.y-19).toFixed(2)}" width="158" height="28" rx="4" fill="#15181ce8"/><text x="${position.x.toFixed(2)}" y="${position.y.toFixed(2)}" text-anchor="middle" fill="${fingerColors[contact.finger]}">${escaped(text)}</text></g>`);
 }
 // Pitch identities stay attached to actual x positions; LH changes contacts, never the keyboard.
 const pitchPositions:{x:number;y:number}[]=[];
 if(camera.elevation>0&&basis.towardViewer[1]<0)for(const actuator of visibleActuators(scene)){
  const front=stretchActuatorBody(scene.geometry,actuator.id).top[0],point=screen(posedPoint(scene,actuator.id,front));
  const position={x:point[0],y:Math.min(height-6,point[1]+19)};
  if(position.x<8||position.x>width-8||pitchPositions.some(other=>Math.abs(other.x-position.x)<13&&Math.abs(other.y-position.y)<16))continue;
  pitchPositions.push(position);
  labels.push(`<text x="${position.x.toFixed(2)}" y="${position.y.toFixed(2)}" class="stretch-pitch-label" text-anchor="middle" data-pitch-label="${actuator.midiPitch}">${'0123456789AB'[actuator.midiPitch%12]}</text>`);
 }
 const nodes:string[]=[];
 let group:{face:StretchKeyboardFace;paths:string[]}|null=null;
 const flush=()=>{if(!group)return;const face=group.face;nodes.push(`<path d="${group.paths.join(' ')}" fill="${face.color}" stroke="${face.color}" stroke-width=".8" stroke-linejoin="round" data-actuator="${escaped(face.actuatorId)}"${face.surfaceId?` data-highlight-surface="${escaped(face.surfaceId)}"`:''}/>`);group=null;};
 for(const item of orderedPrimitives(partitionPrimitives(primitives),basis.towardViewer)){
  const points=item.points.map(screen);
  if(item.face){
   const face=item.face,normal=cross(subtract(face.points[1],face.points[0]),subtract(face.points[2],face.points[0]));
   if(dot(normal,basis.towardViewer)<=1e-7)continue;
   if(group&&(group.face.actuatorId!==face.actuatorId||group.face.color!==face.color||group.face.surfaceId!==face.surfaceId))flush();
   group??={face,paths:[]};group.paths.push('M'+pointText(points.map(point=>point.slice(0,2)))+'Z');
  }else{
   flush();nodes.push(`<line x1="${points[0][0].toFixed(2)}" y1="${points[0][1].toFixed(2)}" x2="${points.at(-1)![0].toFixed(2)}" y2="${points.at(-1)![1].toFixed(2)}" ${item.attributes}/>`);
  }
 }
 flush();
 const label=scene.contacts.length?scene.contacts.map(c=>`${fingerNames[c.finger]} on ${'0123456789AB'[c.midiPitch%12]}, row ${c.row}, ${c.keyState==='depressed'?'depressed key':'resting contact'}`).join('; '):'Regularized four-row keyboard';
 return {inner:`<g>${nodes.join('')}</g><g>${labels.join('')}</g>`,label};
}

/** Pure SVG representation for bounded visual inspection and physical scene checks. */
export function stretchKeyboardSvg(scene:StretchKeyboardScene,camera:StretchKeyboardCamera=STRETCH_KEYBOARD_DEFAULT_CAMERA,options:StretchKeyboardOptions={},viewport:StretchKeyboardViewport=defaultViewport):string {
 const drawing=keyboardDrawing(scene,camera,options,viewport),{width,height}=viewport;
 return `<svg xmlns="${ns}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escaped(drawing.label)}">${drawing.inner}</svg>`;
}

export function mountStretchKeyboard(container:HTMLElement,initialScene:StretchKeyboardScene,options:StretchKeyboardOptions={}):{readonly ready:boolean;readonly error:string|null;update(scene:StretchKeyboardScene,options?:StretchKeyboardOptions):void;dispose():void} {
 let scene=initialScene,settings={...options},camera={...STRETCH_KEYBOARD_DEFAULT_CAMERA},viewport={...defaultViewport},disposed=false,ready=false,error:string|null=null,drag:{id:number;x:number;y:number}|null=null;
 const root=document.createElement('div');root.className='stretch-keyboard-model';
 const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${viewport.width} ${viewport.height}`);svg.setAttribute('tabindex','0');svg.setAttribute('role','img');svg.classList.add('stretch-keyboard-canvas');
 const hints=document.createElement('div');hints.className='stretch-camera-controls';
 hints.innerHTML='<span>Drag to rotate · Scroll to zoom</span><div><button type="button" data-camera="keyboard">Rotate with keys</button><button type="button" data-camera="zoom-out" aria-label="Zoom keyboard out">−</button><button type="button" data-camera="zoom-in" aria-label="Zoom keyboard in">+</button><button type="button" data-camera="reset">Reset view</button></div>';
 const keyboardHint=document.createElement('p');keyboardHint.className='stretch-camera-keyboard-hint';keyboardHint.textContent='When the model is focused: arrows rotate, +/− zoom, Home resets.';
 root.append(svg,hints,keyboardHint);container.append(root);
 const render=()=>{
  if(disposed)return;
  const rectangle=svg.getBoundingClientRect?.();
  if(rectangle&&rectangle.width>=80&&rectangle.height>=80)viewport={width:Math.round(rectangle.width),height:Math.round(rectangle.height)};
  svg.setAttribute('viewBox',`0 0 ${viewport.width} ${viewport.height}`);
  ready=false;error=null;
  try{const drawing=keyboardDrawing(scene,camera,settings,viewport);svg.innerHTML=drawing.inner;svg.setAttribute('aria-label',`${drawing.label}. Arrow keys rotate; plus and minus zoom; Home resets the view.`);root.removeAttribute('data-model-error');ready=true;}
  catch(cause){svg.innerHTML='';error=cause instanceof Error?cause.message:'Keyboard geometry unavailable.';svg.setAttribute('aria-label',error);root.setAttribute('data-model-error',error);}
  svg.setAttribute('data-camera-elevation',String(camera.elevation));svg.setAttribute('data-camera-azimuth',String(camera.azimuth));svg.setAttribute('data-camera-zoom',String(camera.zoom));
 };
 const rotate=(azimuth:number,elevation:number)=>{camera.azimuth=(camera.azimuth+azimuth)%360;camera.elevation=Math.max(-85,Math.min(89,camera.elevation+elevation));render();};
 const zoom=(factor:number)=>{camera.zoom=Math.max(.55,Math.min(3,camera.zoom*factor));render();};
 const reset=()=>{camera={...STRETCH_KEYBOARD_DEFAULT_CAMERA};render();};
 const down=(event:PointerEvent)=>{if(event.button!==0)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY};svg.setPointerCapture(event.pointerId);svg.focus({preventScroll:true});event.preventDefault();};
 const move=(event:PointerEvent)=>{if(!drag||event.pointerId!==drag.id)return;const deltaX=event.clientX-drag.x,deltaY=event.clientY-drag.y;drag.x=event.clientX;drag.y=event.clientY;rotate(deltaX*.4,-deltaY*.3);};
 const up=(event:PointerEvent)=>{if(drag?.id!==event.pointerId)return;drag=null;if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);};
 const lost=()=>{drag=null;};
 const wheel=(event:WheelEvent)=>{event.preventDefault();zoom(Math.exp(-Math.max(-120,Math.min(120,event.deltaY))*.003));};
 const key=(event:KeyboardEvent)=>{
  if(event.target!==svg||event.altKey||event.ctrlKey||event.metaKey)return;
  const amount=event.shiftKey?1:5;
  if(event.key==='ArrowLeft')rotate(-amount,0);else if(event.key==='ArrowRight')rotate(amount,0);else if(event.key==='ArrowUp')rotate(0,amount);else if(event.key==='ArrowDown')rotate(0,-amount);
  else if(event.key==='+'||event.key==='=')zoom(1.1);else if(event.key==='-'||event.key==='_')zoom(1/1.1);else if(event.key==='Home')reset();else return;
  event.preventDefault();event.stopPropagation();
 };
 const click=(event:MouseEvent)=>{const target=(event.target as Element).closest<HTMLElement>('[data-camera]');if(!target)return;if(target.dataset.camera==='keyboard')svg.focus({preventScroll:true});else if(target.dataset.camera==='zoom-in')zoom(1.15);else if(target.dataset.camera==='zoom-out')zoom(1/1.15);else reset();};
 svg.addEventListener('pointerdown',down);svg.addEventListener('pointermove',move);svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',up);svg.addEventListener('lostpointercapture',lost);svg.addEventListener('wheel',wheel,{passive:false});svg.addEventListener('keydown',key);hints.addEventListener('click',click);
 const resizeObserver=typeof ResizeObserver==='undefined'?null:new ResizeObserver(()=>{
  if(disposed)return;
  const rectangle=svg.getBoundingClientRect();
  if(rectangle.width>=80&&rectangle.height>=80&&(Math.round(rectangle.width)!==viewport.width||Math.round(rectangle.height)!==viewport.height))render();
 });
 resizeObserver?.observe(svg);
 render();
 return {get ready(){return ready&&!disposed;},get error(){return error;},update(next,nextOptions){if(disposed)return;scene=next;if(nextOptions)settings={...settings,...nextOptions};render();},dispose(){if(disposed)return;disposed=true;ready=false;resizeObserver?.disconnect();if(drag&&svg.hasPointerCapture(drag.id))svg.releasePointerCapture(drag.id);drag=null;svg.removeEventListener('pointerdown',down);svg.removeEventListener('pointermove',move);svg.removeEventListener('pointerup',up);svg.removeEventListener('pointercancel',up);svg.removeEventListener('lostpointercapture',lost);svg.removeEventListener('wheel',wheel);svg.removeEventListener('keydown',key);hints.removeEventListener('click',click);root.remove();}};
}
