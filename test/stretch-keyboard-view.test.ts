import test from 'node:test';
import assert from 'node:assert/strict';
import {DOMParser} from '@xmldom/xmldom';
import {createStretchGeometry,sameRowContact,surfaceContact} from '../src/stretch-calibration-geometry';
import {mountStretchKeyboard,projectStretchPoint,stretchKeyboardFaces,stretchKeyboardPaintOrder,stretchKeyboardSvg,stretchMeasurementWindowPoints,STRETCH_KEYBOARD_DEFAULT_CAMERA,type StretchKeyboardScene} from '../src/stretch-keyboard-view';

test('extruded model includes complete mounting depth and highlights every corner of the full usable terrace',async()=>{
 const geometry=await createStretchGeometry([59,68]),scene={geometry,contacts:[sameRowContact(geometry,1,61,1),sameRowContact(geometry,2,65,1)]};
 const faces=stretchKeyboardFaces(scene),pressed=faces.filter(face=>face.actuatorId==='key-61'),points=pressed.flatMap(face=>face.points);
 assert.equal(Math.min(...points.map(p=>p[0])),-5+13.75);assert.equal(Math.max(...points.map(p=>p[0])),5+13.75);
 assert.equal(Math.min(...points.map(p=>p[1])),0);assert.equal(Math.max(...points.map(p=>p[1])),152.4);
 assert.ok(Math.min(...points.map(p=>p[2]))<-20,'complete manufacturer mounting body remains visible');
 for(const contact of scene.contacts){
  const surface=geometry.surfaces.find(surface=>surface.id===contact.location.surfaceId)!,highlight=faces.filter(face=>face.surfaceId===surface.id).flatMap(face=>face.points);
  assert.equal(Math.min(...highlight.map(p=>p[0])),surface.xMinMm);assert.equal(Math.max(...highlight.map(p=>p[0])),surface.xMaxMm);
  assert.equal(Math.min(...highlight.map(p=>p[1])),surface.depthMinMm);assert.equal(Math.max(...highlight.map(p=>p[1])),surface.depthMaxMm);
  assert.ok(highlight.every(point=>Math.abs(point[2]-(surface.heightAtNearMm+(point[1]-surface.depthMinMm)/(surface.depthMaxMm-surface.depthMinMm)*(surface.heightAtFarMm-surface.heightAtNearMm)-10+.08))<1e-10));
 }
 const region=surfaceContact(geometry,2,'key-65-row-1','depressed',{kind:'attested-fiducial',surfaceId:'key-65-row-1',u:.5,v:.5,fiducialId:'confirmed'});
 const narrowed=stretchKeyboardFaces({geometry,contacts:[region]}).filter(face=>face.surfaceId===region.location.surfaceId).flatMap(face=>face.points);
 assert.equal(Math.min(...narrowed.map(p=>p[1])),0);assert.equal(Math.max(...narrowed.map(p=>p[1])),59.8,'an optional point does not shrink the playable-area highlight');
});

test('pressing either row copy depresses the complete solid while neighbouring actuators stay resting',async()=>{
 const geometry=await createStretchGeometry([60,64]);
 const resting=stretchKeyboardFaces({geometry,contacts:[]}),depressed=stretchKeyboardFaces({geometry,contacts:[sameRowContact(geometry,1,62,4)]});
 for(const actuator of geometry.actuators){
  const before=resting.filter(face=>face.actuatorId===actuator.id&&face.kind==='body').flatMap(face=>face.points),after=depressed.filter(face=>face.actuatorId===actuator.id&&face.kind==='body').flatMap(face=>face.points);
  assert.equal(before.length,after.length);
  for(let i=0;i<before.length;i++)assert.deepEqual(after[i],[before[i][0],before[i][1],before[i][2]-(actuator.midiPitch===62?10:0)]);
 }
});

test('measurement rulers are anchored to the playable depth axis and retain negative raw percentages',async()=>{
 const geometry=await createStretchGeometry([60,66]),scene:StretchKeyboardScene={geometry,contacts:[sameRowContact(geometry,1,61,1)],windows:[{surfaceId:'key-61-row-1',axisStartMm:0,axisEndMm:59.8,fraction:-.25,label:'Index'}]};
 const window=scene.windows![0],points=stretchMeasurementWindowPoints(scene,window);
 assert.deepEqual(points.ticks.map(point=>point[1]),[0,29.9,59.8]);assert.equal(points.marker![1],-14.95);
 const original=structuredClone(scene);
 for(const camera of [STRETCH_KEYBOARD_DEFAULT_CAMERA,{elevation:8,azimuth:95,zoom:1.3},{elevation:-30,azimuth:-160,zoom:.7}]){
  const svg=stretchKeyboardSvg(scene,camera);assert.ok(svg.includes('data-window-fraction="-0.25"'));assert.ok(!svg.includes('NaN'));assert.deepEqual(stretchMeasurementWindowPoints(scene,window),points);
 }
 assert.deepEqual(scene,original,'camera rendering is read-only physical evidence');
 assert.notDeepEqual(projectStretchPoint(points.edgeStart,STRETCH_KEYBOARD_DEFAULT_CAMERA),projectStretchPoint(points.edgeStart,{elevation:8,azimuth:95,zoom:1}));
 assert.throws(()=>stretchMeasurementWindowPoints(scene,{surfaceId:'key-60-row-2',axisStartMm:0,axisEndMm:93.75}),/within one playable terrace/,'tongue cannot become a measurement window');
});

test('left-hand contacts keep their real lower-pitch direction and physical keyboard labels',async()=>{
 const geometry=await createStretchGeometry([50,80]),right={geometry,contacts:[sameRowContact(geometry,1,61,1),sameRowContact(geometry,2,69,1)]},left={geometry,contacts:[sameRowContact(geometry,1,69,1),sameRowContact(geometry,2,61,1)]};
 const rh=new DOMParser().parseFromString(stretchKeyboardSvg(right),'image/svg+xml'),lh=new DOMParser().parseFromString(stretchKeyboardSvg(left),'image/svg+xml');
 const labels=(doc:typeof rh)=>Array.from(doc.getElementsByTagName('text')).filter(el=>el.hasAttribute('data-pitch-label')).map(el=>[el.getAttribute('data-pitch-label'),el.textContent,el.getAttribute('x')]);
 assert.deepEqual(labels(rh),labels(lh));assert.ok(lh.documentElement!.getAttribute('aria-label')!.includes('Thumb on 9, row 1'));assert.ok(lh.documentElement!.getAttribute('aria-label')!.includes('Index on 1, row 1'));
 assert.ok(lh.toString().includes('key-61-row-1'));assert.ok(lh.toString().includes('key-69-row-1'));
 const wide=stretchKeyboardFaces({geometry,contacts:[sameRowContact(geometry,1,51,1),sameRowContact(geometry,5,79,1)]});
 const pitches=new Set(wide.map(face=>face.actuatorId));assert.ok(pitches.has('key-50'));assert.ok(pitches.has('key-80'),'active span includes admitted neighbours at both ends');
});

test('camera focus owns only view controls, retains the camera across scene updates, and cleans up listeners',async()=>{
 const geometry=await createStretchGeometry([59,71]),first:StretchKeyboardScene={geometry,contacts:[sameRowContact(geometry,1,61,1),sameRowContact(geometry,2,65,1)]};
 const previousDocument=globalThis.document,previousObserver=globalThis.ResizeObserver;
 let observerCallback:()=>void=()=>{},observed:unknown=null,disconnected=0;
 class Element extends EventTarget {
  tagName:string;dataset:Record<string,string>={};keyboardButton?:Element;clickTarget?:Element;children:Element[]=[];parent:Element|null=null;attributes:Record<string,string>={};innerHTML='';textContent='';className='';listeners=0;classList={add:()=>{}};width=696;height=250;
  constructor(tagName:string){super();this.tagName=tagName;}
  append(...elements:Element[]){for(const element of elements){this.children.push(element);element.parent=this;}}
  querySelector(selector:string){if(selector==='[data-camera=keyboard]'){if(!this.keyboardButton){this.keyboardButton=new Element('button');this.keyboardButton.dataset.camera='keyboard';this.keyboardButton.setAttribute('aria-pressed','false');}return this.keyboardButton;}return null;}
  closest(selector:string){return selector==='[data-camera]'?(this.dataset.camera?this:this.clickTarget??null):null;}
  toggleAttribute(name:string,on:boolean){if(on)this.setAttribute(name,'');else this.removeAttribute(name);}
  setAttribute(name:string,value:string){this.attributes[name]=value;}getAttribute(name:string){return this.attributes[name]??null;}removeAttribute(name:string){delete this.attributes[name];}
  focus(){(globalThis.document as any).activeElement=this;}setPointerCapture(){}hasPointerCapture(){return false;}releasePointerCapture(){}
  getBoundingClientRect(){return {width:this.width,height:this.height};}
  remove(){if(this.parent)this.parent.children.splice(this.parent.children.indexOf(this),1);this.parent=null;}
  override addEventListener(type:string,listener:any,options?:any){this.listeners++;super.addEventListener(type,listener,options);}
  override removeEventListener(type:string,listener:any,options?:any){this.listeners--;super.removeEventListener(type,listener,options);}
 }
 try{
  Object.assign(globalThis,{document:{activeElement:null,createElement:(tag:string)=>new Element(tag),createElementNS:(_:string,tag:string)=>new Element(tag)},ResizeObserver:class{constructor(callback:()=>void){observerCallback=callback;}observe(target:unknown){observed=target;}disconnect(){disconnected++;}}});
  let exits=0;const screen=new Element('button');
  const container=new Element('div'),view=mountStretchKeyboard(container as unknown as HTMLElement,first,{onKeyboardRotationExit(){exits++;screen.focus();}}),root=container.children[0],svg=root.children[0],hints=root.children[1];
  const key=(value:string)=>{const event=new Event('keydown',{cancelable:true});Object.assign(event,{key:value,altKey:false,ctrlKey:false,metaKey:false,shiftKey:false});svg.dispatchEvent(event);return event;};
  assert.equal(svg.getAttribute('data-camera-elevation'),'36');assert.equal(svg.getAttribute('data-camera-azimuth'),'5');
  assert.equal(svg.getAttribute('viewBox'),'0 0 696 250');assert.equal(observed,svg);
  assert.equal(view.ready,true);assert.equal(view.error,null);
  const hint=root.children[2];assert.ok(hint.innerHTML.includes('<kbd>← ↑ ↓ →</kbd>'));assert.ok(hint.innerHTML.includes('<kbd>+ / −</kbd>'));assert.ok(hint.innerHTML.includes('<kbd>Home</kbd>'));assert.ok(hint.innerHTML.includes('<kbd>Esc</kbd>'));
  const toggle=hints.querySelector('[data-camera=keyboard]')!;hints.clickTarget=toggle;const toggleRotation=()=>hints.dispatchEvent(new Event('click'));
  assert.equal(view.keyboardRotation,false);assert.equal(toggle.getAttribute('aria-pressed'),'false');assert.equal(key('ArrowRight').defaultPrevented,false,'off-state leaves pair navigation available');
  toggleRotation();assert.equal(view.keyboardRotation,true);assert.equal(toggle.getAttribute('aria-pressed'),'true');assert.equal(toggle.textContent,'Keyboard rotation: On');assert.equal((globalThis.document as any).activeElement,svg);
  assert.equal(key('ArrowRight').defaultPrevented,true);assert.equal(key('ArrowUp').defaultPrevented,true);assert.equal(key('+').defaultPrevented,true);
  const camera=['elevation','azimuth','zoom'].map(name=>svg.getAttribute('data-camera-'+name));assert.deepEqual(camera.slice(0,2),['41','10']);
  svg.width=430;svg.height=220;observerCallback();assert.equal(svg.getAttribute('viewBox'),'0 0 430 220');assert.deepEqual(['elevation','azimuth','zoom'].map(name=>svg.getAttribute('data-camera-'+name)),camera);
  assert.equal(key('2').defaultPrevented,false);assert.equal(key('Enter').defaultPrevented,false,'rating and task navigation retain their keys');
  view.update({geometry,contacts:[sameRowContact(geometry,1,69,1),sameRowContact(geometry,2,61,1)]});
  assert.deepEqual(['elevation','azimuth','zoom'].map(name=>svg.getAttribute('data-camera-'+name)),camera);assert.ok(svg.getAttribute('aria-label')!.includes('Thumb on 9'));assert.equal(view.keyboardRotation,true,'rating renders preserve explicit rotation mode');
  view.update(first,{colors:'classic'});assert.equal(view.ready,true);assert.ok(svg.innerHTML.includes('#dedbd3'));assert.deepEqual(['elevation','azimuth','zoom'].map(name=>svg.getAttribute('data-camera-'+name)),camera);
  const unavailable=structuredClone(geometry);unavailable.actuators.find(a=>a.id==='key-61')!.pressedMotion={kind:'unknown'};
  view.update({geometry:unavailable,contacts:first.contacts});assert.equal(view.ready,false);assert.match(view.error!,/not mapped/);assert.equal(svg.innerHTML,'');assert.ok(root.getAttribute('data-model-error'));
  view.update(first);assert.equal(view.ready,true);assert.equal(view.error,null);
  const escaped=key('Escape');assert.equal(escaped.defaultPrevented,true);assert.equal(view.keyboardRotation,false);assert.equal(toggle.getAttribute('aria-pressed'),'false');assert.equal((globalThis.document as any).activeElement,screen);assert.equal(exits,1);assert.equal(key('ArrowRight').defaultPrevented,false);
  toggleRotation();assert.equal(view.keyboardRotation,true);const editableKey=new Event('keydown',{cancelable:true});Object.assign(editableKey,{key:'ArrowRight',altKey:false,ctrlKey:false,metaKey:false});Object.defineProperty(editableKey,'target',{value:{closest(){return {};}}});assert.equal(view.key(editableKey as unknown as KeyboardEvent),false,'entry fields keep their native editing keys');
  toggleRotation();assert.equal(view.keyboardRotation,false);assert.equal(exits,2);toggleRotation();
  view.endKeyboardRotation();assert.equal(view.keyboardRotation,false);assert.equal(toggle.getAttribute('aria-pressed'),'false');assert.equal(exits,2,'a new collection boundary does not restore focus to its old screen');assert.deepEqual(['elevation','azimuth','zoom'].map(name=>svg.getAttribute('data-camera-'+name)),camera,'ending keyboard ownership preserves the camera orientation');toggleRotation();
  assert.equal(key('Home').defaultPrevented,true);assert.equal(svg.getAttribute('data-camera-elevation'),'36');assert.equal(svg.getAttribute('data-camera-zoom'),'1');
  view.dispose();view.dispose();assert.equal(view.ready,false);assert.equal(container.children.length,0);assert.equal(svg.listeners,0);assert.equal(hints.listeners,0);assert.equal(disconnected,1);
  const retiredMarkup=svg.innerHTML;svg.width=500;observerCallback();assert.equal(svg.innerHTML,retiredMarkup,'an already queued resize cannot redraw the disposed model');
  view.update(first);assert.equal(container.children.length,0);
 }finally{Object.assign(globalThis,{document:previousDocument,ResizeObserver:previousObserver});}
});

test('compact viewports keep finger labels and ruler numbers inside the canvas without shrinking text units',async()=>{
 const geometry=await createStretchGeometry([55,79]),scene:StretchKeyboardScene={geometry,contacts:[surfaceContact(geometry,1,'key-61-row-1','resting-contact'),surfaceContact(geometry,2,'key-60-row-2','resting-contact')],windows:[{surfaceId:'key-61-row-1',axisStartMm:0,axisEndMm:59.8,label:'Thumb'},{surfaceId:'key-60-row-2',axisStartMm:34,axisEndMm:93.75,fraction:1,label:'Index'}]};
 const original=structuredClone(scene);
 for(const viewport of [{width:696,height:250},{width:430,height:220},{width:300,height:250}]){
  const doc=new DOMParser().parseFromString(stretchKeyboardSvg(scene,STRETCH_KEYBOARD_DEFAULT_CAMERA,{},viewport),'image/svg+xml');
  assert.equal(doc.documentElement!.getAttribute('viewBox'),`0 0 ${viewport.width} ${viewport.height}`);
  const labels=Array.from(doc.getElementsByTagName('g')).filter(group=>group.hasAttribute('data-contact-surface'));
  assert.equal(labels.length,2);
  for(const label of labels){const rectangle=label.getElementsByTagName('rect')[0],x=Number(rectangle.getAttribute('x')),y=Number(rectangle.getAttribute('y'));assert.ok(x>=0&&x+Number(rectangle.getAttribute('width'))<=viewport.width);assert.ok(y>=0&&y+Number(rectangle.getAttribute('height'))<=viewport.height);}
  const rulers=Array.from(doc.getElementsByTagName('g')).filter(group=>group.hasAttribute('data-measurement-labels'));
  assert.equal(rulers.length,2);
  for(const ruler of rulers){const ticks=Array.from(ruler.getElementsByTagName('text'));assert.deepEqual(ticks.map(tick=>tick.textContent).sort(),['0','100','50']);const ys=ticks.map(tick=>Number(tick.getAttribute('y'))).sort((a,b)=>a-b);assert.ok(ys[1]-ys[0]>=18&&ys[2]-ys[1]>=18);for(const tick of ticks)assert.ok(Number(tick.getAttribute('x'))>=30&&Number(tick.getAttribute('x'))<=viewport.width-30&&Number(tick.getAttribute('y'))>=30&&Number(tick.getAttribute('y'))<=viewport.height-12);}
  assert.equal(Array.from(doc.getElementsByTagName('text')).filter(text=>text.getAttribute('class')==='stretch-ruler-label').length,0,'contact labels already identify both windows');
 }
 assert.deepEqual(scene,original);
});

test('painter occlusion matches an independent ray-depth check across front, side and underside views',async()=>{
 const geometry=await createStretchGeometry([59,66]),scene={geometry,contacts:[sameRowContact(geometry,1,61,1),sameRowContact(geometry,2,65,1)]};
 for(const camera of [STRETCH_KEYBOARD_DEFAULT_CAMERA,{elevation:14,azimuth:64,zoom:1},{elevation:50,azimuth:-52,zoom:1},{elevation:-28,azimuth:116,zoom:1}]){
  const source=stretchKeyboardFaces(scene).map(face=>({...face,projected:face.points.map(point=>projectStretchPoint(point,camera))}));
  const ordered=stretchKeyboardPaintOrder(scene,camera).map(face=>({...face,projected:face.points.map(point=>projectStretchPoint(point,camera))}));
  const points=source.flatMap(face=>face.projected),minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
  const depthAt=(x:number,y:number,triangle:readonly (readonly number[])[])=>{
   const [a,b,c]=triangle,den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-8)return null;
   const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/den,v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/den,w=1-u-v;
   return u>1e-6&&v>1e-6&&w>1e-6?u*a[2]+v*b[2]+w*c[2]:null;
  };
  let checked=0;
  for(let xi=0;xi<17;xi++)for(let yi=0;yi<17;yi++){
   const x=minX+(xi+.37)/17*(maxX-minX),y=minY+(yi+.43)/17*(maxY-minY);
   const hits=source.flatMap(face=>{const depth=depthAt(x,y,face.projected);return depth===null?[]:[{face,depth}];}).sort((a,b)=>a.depth-b.depth);
   if(!hits.length)continue;
   let actual:typeof ordered[number]|null=null;
   for(const face of ordered)for(let i=1;i<face.projected.length-1;i++)if(depthAt(x,y,[face.projected[0],face.projected[i],face.projected[i+1]])!==null)actual=face;
   assert.ok(actual,`visible ray ${x},${y} in view ${camera.azimuth}`);
   assert.equal(actual.color,hits.at(-1)!.face.color,`frontmost material in view ${camera.azimuth} at ${x},${y}`);checked++;
  }
  assert.ok(checked>45,'ray check covers bodies and their overlapping silhouettes');
 }
});
