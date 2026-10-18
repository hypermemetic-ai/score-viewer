import test from 'node:test';import assert from 'node:assert/strict';
import {actualPageObstacles,boxesOverlap} from '../src/svg-annotation-clearance';
import {affiliatedAnnotationPosition} from '../src/fingering-presentation';
const page=(ink:string)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"><rect width="100%" height="100%" fill="#FFFFFF"/>${ink}</svg>`;
test('foreign actual primitives, transformed curve control hulls and text bands remain obstacles independent of owned carrier geometry',()=>{
 const p=actualPageObstacles(page('<g transform="translate(30 60) scale(2 -2)"><path d="M0 0 C2 8 6 10 10 0" fill="none" stroke="black" stroke-width="2"/></g><circle cx="80" cy="120" r="5"/><text x="170" y="160" font-size="10">Foreign voice</text>'),new Map());
 assert.equal(p.boxes.length,3);assert.ok(boxesOverlap([28,38,35,43],p.boxes[0]));
 assert.ok(boxesOverlap([79,119,81,121],p.boxes[1]));assert.ok(boxesOverlap([5,145,10,150],p.boxes[2]),'foreign text reserves complete horizontal coverage');
 assert.equal(p.width,200);assert.equal(p.height,300);
});
test('default stroke width, square caps and miter protrusions have conservative paint bounds',()=>{
 const p=actualPageObstacles(page('<polyline points="20,20 30,40 40,20" fill="none" stroke="black"/><line x1="80" y1="80" x2="100" y2="80" stroke="black" stroke-width="8" stroke-linecap="square" stroke-linejoin="bevel"/><path d="M120 20 L130 60 L131 20" stroke="black" stroke-width="2" stroke-miterlimit="12"/>'),new Map());
 assert.ok(p.boxes[0][0]<18,'default width one and default miter four are included');
 assert.ok(p.boxes[1][0]<=72&&p.boxes[1][2]>=108);assert.ok(p.boxes[2][0]<=108&&p.boxes[2][2]>=143);
});
test('positioned descendants, text displacement and unbounded paint effects fail closed',()=>{
 for(const ink of ['<text x="10" y="20" font-size="8"><tspan x="80" y="120">Shifted</tspan></text>',
  '<text x="10" y="20" dy="100" font-size="8">Shifted</text>',
  '<path d="M10 10 L20 20" stroke="black" vector-effect="non-scaling-stroke"/>',
  '<path d="M10 10 S20 20 30 10"/>',
  '<g style="filter:blur(3px)"><line x1="1" y1="2" x2="3" y2="4"/></g>'])
  assert.throws(()=>actualPageObstacles(page(ink),new Map()),/Unsupported/);
});
test('both hand directions clear actual grid ink by the smallest bounded displacement of the complete 1–5 stack',()=>{
 const obstacles=actualPageObstacles(page('<line x1="100" y1="20" x2="100" y2="260" stroke="gray" stroke-dasharray="2,3"/>'),new Map());
 for(const direction of [-1,1] as const){const top=direction===-1?140:160,input={x:100,top,direction,gap:5.6,height:12,em:14,
  width:[-3,3] as [number,number],columns:[30,100,170],page:obstacles,occupied:[]},fit=affiliatedAnnotationPosition(input)!;
  assert.ok(fit);assert.ok(Math.abs(fit.x-100)<=7);assert.ok(Math.abs(fit.x-100)>6,'the complete reserved outline clears the actual stroked grid');
  const stack:[number,number,number,number]=[fit.x-3,fit.top,fit.x+3,fit.top+12];assert.ok(!obstacles.boxes.some(b=>boxesOverlap(stack,b)));
  assert.ok(stack[0]>=65&&stack[2]<=135);assert.ok(direction===-1?stack[3]<160:stack[1]>140);
  const closer=[...stack] as [number,number,number,number];closer[0]+=.001*Math.sign(100-fit.x);closer[2]+=.001*Math.sign(100-fit.x);
  assert.ok(obstacles.boxes.some(b=>boxesOverlap(closer,b)),'a closer displacement intersects ink');
  assert.deepEqual(affiliatedAnnotationPosition({...input,page:{...obstacles,boxes:[]}}),{x:100,top},'clear original x remains preferred');
 }
});
test('nearest ORIGINAL source columns and existing annotations fence the whole stack; missing affiliated air refuses',()=>{
 const obstacles=actualPageObstacles(page('<line x1="100" y1="20" x2="100" y2="260" stroke="gray"/>'),new Map()),
  input={x:100,top:140,direction:-1 as const,gap:5.6,height:12,em:14,width:[-3,3] as [number,number],columns:[92,100,108],page:obstacles,occupied:[]};
 assert.equal(affiliatedAnnotationPosition(input),undefined,'neither adjacent owner reading space may be borrowed');
 const occupied:[number,number,number,number]=[89,0,99,300],fit=affiliatedAnnotationPosition({...input,columns:[30,100,170],occupied:[occupied]})!;
 assert.ok(fit.x>100);assert.ok(!boxesOverlap([fit.x-3,fit.top,fit.x+3,fit.top+12],occupied));
 const wall=actualPageObstacles(page('<rect x="30" y="0" width="140" height="300"/>'),new Map());
 assert.equal(affiliatedAnnotationPosition({...input,columns:[30,100,170],page:wall}),undefined,'a general physical-ink obstruction remains a refusal');
});
const ribbon='M20 150 C60 40 140 40 180 150 L180 160 C140 50 60 50 20 160 Z';
test('paired filled ribbons keep both boundaries AND thick interiors under affine transforms, reflections and reversed traversal',()=>{
 const reversed='M180 150 C140 40 60 40 20 150 L20 260 C60 150 140 150 180 260 Z',
  thick=ribbon.replace('180 160 C140 50 60 50 20 160','180 260 C140 150 60 150 20 260');
 const variants=[{d:thick,x:[20,60,140,180],y:[150,40,40,150],bottom:[260,150,150,260]},
  {d:reversed,x:[180,140,60,20],y:[150,40,40,150],bottom:[260,150,150,260]}];
 for(const v of variants)for(const m of [[1,0,0,1,0,0],[-1,.3,.2,.8,190,15],[1.2,-.2,.4,1.1,10,20]]){
  const p=actualPageObstacles(page(`<path d="${v.d}" transform="matrix(${m.join(' ')})" fill="black"/>`),new Map());assert.equal(p.boxes.length,16);
  const cubic=(values:number[],t:number)=>values[0]*(1-t)**3+3*values[1]*t*(1-t)**2+3*values[2]*t*t*(1-t)+values[3]*t**3;
  for(let k=0;k<=200;k++){const t=k/200,x=cubic(v.x,t),a=cubic(v.y,t),b=cubic(v.bottom,t);
   for(const mix of [0,.1,.5,.9,1]){const y=a+(b-a)*mix,point=[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
    assert.ok(p.boxes.some(box=>point[0]>=box[0]&&point[0]<=box[2]&&point[1]>=box[1]&&point[1]<=box[3]),'every boundary/interior sample stays covered');}}
 }
});
test('thin bow cover retains actual overlap, white knockout/stroke and endpoint connectors while admitting empty air below the bow',()=>{
 const black=actualPageObstacles(page(`<path d="${ribbon}" fill="black"/>`),new Map()),
  white=actualPageObstacles(page(`<path d="${ribbon}" fill="white" stroke="white" stroke-width="4" stroke-linejoin="round"/>`),new Map());
 assert.ok(!black.boxes.some(b=>boxesOverlap([99,120,101,124],b)),'empty under-bow air is not filled');
 assert.ok(black.boxes.some(b=>boxesOverlap([99,69,101,73],b)),'the thin ribbon interior remains painted');
 assert.ok(white.boxes.some(b=>boxesOverlap([99,64,101,65],b)),'outer knockout stroke remains covered');
 for(const x of [20,180])assert.ok(white.boxes.some(b=>boxesOverlap([x-1,153,x+1,157],b)),'L/Z endpoint connectors remain covered');
 assert.deepEqual(affiliatedAnnotationPosition({x:100,top:120,direction:-1,gap:1,height:4,em:4,width:[-1,1],columns:[30,100,170],page:black,occupied:[]}),{x:100,top:120});
 assert.equal(affiliatedAnnotationPosition({x:100,top:70,direction:1,gap:1,height:8,em:1,width:[-.2,.2],columns:[99,100,101],
  page:{...black,height:78},occupied:[]}),undefined,'actual painted overlap and page bounds still refuse');
});
test('mismatched, nonmonotone, crossing and ambiguous filled shapes retain the whole hull; overflow refuses',()=>{
 for(const d of [ribbon.replace('C60 40 140 40','C190 40 10 40'),ribbon.replace('C140 50 60 50','C140 50 61 50'),
  ribbon.replace('C140 50 60 50','C140 30 60 50'),ribbon+' M10 10 L12 12 Z',ribbon.toLowerCase()]){
  const p=actualPageObstacles(page(`<path d="${d}" fill="black"/>`),new Map());assert.equal(p.boxes.length,1);
  if(d!==ribbon.toLowerCase())assert.ok(p.boxes.some(b=>boxesOverlap([99,120,101,124],b)),'unproven fill retains conservative interior coverage');}
 assert.throws(()=>actualPageObstacles(page(`<path d="${ribbon.replace('60 40','1e999 40')}"/>`),new Map()),/Nonfinite/);
 assert.throws(()=>actualPageObstacles(page(`<path d="${ribbon}" transform="scale(1e308)"/>`),new Map()),/Unbounded/);
});
test('large source origin and cancelling affine translation retain outward cover from pre-cancellation magnitudes',()=>{
 const offset=1e12,d=`M${offset+20} 150 C${offset+60} 40 ${offset+140} 40 ${offset+180} 150 L${offset+180} 160 C${offset+140} 50 ${offset+60} 50 ${offset+20} 160 Z`,
  p=actualPageObstacles(page(`<path d="${d}" transform="translate(${-offset} 0)" fill="black"/>`),new Map());
 assert.equal(p.boxes.length,16);assert.ok(p.boxes[0][0]<19.99,'the margin includes large cancelled source/translation magnitudes');
 for(let k=0;k<=200;k++){const t=k/200,x=20*(1-t)**3+180*t*(1-t)**2+420*t*t*(1-t)+180*t**3,
  y=150*(1-t)**3+120*t*(1-t)**2+120*t*t*(1-t)+150*t**3;
  for(const mix of [0,.5,1])assert.ok(p.boxes.some(b=>x>=b[0]&&x<=b[2]&&y+mix*10>=b[1]&&y+mix*10<=b[3]));}
});
test('stem-mounted round openings and half capsules reserve their exact arc bounds',()=>{
 // ISO's ring (two half arcs per circle, even-odd) and a half capsule whose arc bows below its straight sides.
 const ring='M 47.00 100.00 A 3.00 3.00 0 1 0 53.00 100.00 A 3.00 3.00 0 1 0 47.00 100.00 Z M 48.00 100.00 A 2.00 2.00 0 1 0 52.00 100.00 A 2.00 2.00 0 1 0 48.00 100.00 Z',
  half='M 97.00 200.00 A 3.00 3.00 0 0 0 103.00 200.00 L 103.00 196.00 L 97.00 196.00 Z',
  p=actualPageObstacles(page(`<g><path d="${ring}" fill="#111111" fill-rule="evenodd"/></g><path d="${half}" fill="#111111"/><path d="M 10 10 a 5 5 0 0 1 10 0 Z" fill="black"/>`),new Map());
 const near=(a:number[],b:number[])=>a.every((n,i)=>Math.abs(n-b[i])<1e-9);
 assert.ok(near(p.boxes[0],[47,97,53,103]),String(p.boxes[0]));
 assert.ok(near(p.boxes[1],[97,196,103,203]),String(p.boxes[1]));
 assert.ok(near(p.boxes[2],[10,5,20,10]),'a relative arc sweeping up: '+String(p.boxes[2]));
 assert.throws(()=>actualPageObstacles(page('<path d="M 0 0 A 3 3 0 2 0 6 0"/>'),new Map()),/Malformed/);
 // A radius too large to place a centre refuses rather than narrowing to the chord.
 assert.throws(()=>actualPageObstacles(page('<path d="M 0 0 A 1e160 3 0 1 0 6 0"/>'),new Map()),/Malformed/);
});
