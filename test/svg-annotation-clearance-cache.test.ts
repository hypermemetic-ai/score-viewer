import test from 'node:test';
import assert from 'node:assert/strict';
import {actualPageObstacles,type AnnotationBox} from '../src/svg-annotation-clearance';
import {actualPageObstacles as originalObstacles} from './support/svg-annotation-clearance-baseline';
import {ANNOTATION_INK_POLICY,ensureAnnotationInkPolicyReady} from '../src/annotation-ink-policy';
const svg=(ink:string)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 850"><rect width="100%" height="100%" fill="#FFFFFF"/>${ink}</svg>`;
const ribbon='M20 150 C60 40 140 40 180 150 L180 160 C140 50 60 50 20 160 Z';
const heads=()=>new Map<string,AnnotationBox>([['first',[40,70,48,82]],['second',[80,90,88,102]]]);
const primitive='<text data-viewer-seat="first"/><line x1="40" y1="80" x2="40" y2="40" stroke="black" stroke-width=".8"/>';

test('exact inventory matches the independent old traversal in primitive order across affine and style cases',()=>{
 const ink=[primitive,'<text data-viewer-seat="second"/>','<rect x="100" y="40" width="25" height="30"/>',
  '<circle cx="150" cy="60" r="10" stroke="black" stroke-width="2"/>','<ellipse cx="180" cy="90" rx="12" ry="4"/>',
  '<polygon points="0,20 10,30 20,10"/><polyline points="30,10 40,20 50,10"/>',
  '<path d="M0 0 l10 10 h5 v-10 q2 4 8 10 c1 2 3 4 5 6 Z" fill="none" stroke="black" stroke-width="1"/>',
  `<path d="${ribbon}" fill="white" stroke="white" stroke-width="2" stroke-linejoin="round"/>`,
  '<text x="550" y="800" font-size="10pt">Unknown text</text>'].join('');
 for(const transform of ['', 'translate(10 20) scale(1.2 -1)', 'matrix(-1 .3 .2 .8 190 15)','rotate(13 30 70)']){
  const page=svg(`<style>.foreign{fill:black;stroke-linejoin:bevel;stroke-linecap:square}.nested{stroke-width:2}</style><g class="foreign" transform="${transform}">${ink}<g class="nested" stroke="black"><line x1="10" y1="20" x2="30" y2="40"/></g></g>`),map=heads(),expected=structuredClone(originalObstacles(page,map));
  assert.deepEqual(actualPageObstacles(page,map),expected);assert.deepEqual(actualPageObstacles(page,heads()),expected,'exact cached copy');
 }
 const extreme=svg(`<g transform="translate(-1000000000000 0)"><path d="${ribbon.replace(/(20|60|140|180)(?= )/g,x=>String(Number(x)+1e12))}"/></g>`);
 assert.deepEqual(actualPageObstacles(extreme,new Map()),originalObstacles(extreme,new Map()));
});

test('cached boxes are detached and exact SVG and ordered head changes cannot inherit old ownership',()=>{
 const page=svg(primitive+'<text data-viewer-seat="second"/>'),map=heads(),expected=structuredClone(originalObstacles(page,map));
 const first=actualPageObstacles(page,map),second=actualPageObstacles(page,map);assert.notEqual(first.boxes,second.boxes);
 first.boxes[0][0]=-999;first.boxes.push([0,0,600,850]);second.width=1;second.boxes.reverse();
 assert.deepEqual(actualPageObstacles(page,heads()),expected);assert.deepEqual(map,heads(),'returned geometry does not mutate caller heads');
 map.get('first')![0]+=7;assert.deepEqual(actualPageObstacles(page,map),originalObstacles(page,map),'mutated caller head values re-admit');
 map.delete('first');assert.throws(()=>actualPageObstacles(page,map),/ownership missing/);
 const moved=page.replace('x2="40"','x2="50"');assert.deepEqual(actualPageObstacles(moved,heads()),originalObstacles(moved,heads()));
 assert.deepEqual(actualPageObstacles(page,new Map([...heads()].reverse())),expected,'head insertion order does not change primitive order');
 const signed=heads();signed.get('first')![0]=-0;actualPageObstacles(page,signed);signed.get('first')![0]=0;
 assert.ok(Object.is(actualPageObstacles(page,signed).boxes[0][0],0));signed.get('first')![0]=-0;
 assert.ok(Object.is(actualPageObstacles(page,signed).boxes[0][0],-0),'negative zero is an exact cache dependency');
});

test('custom map lookup and inherited array serialization cannot borrow a native cache entry',()=>{
 const page=svg(primitive),plain=heads();actualPageObstacles(page,plain);
 class MissingLookup extends Map<string,AnnotationBox>{override get(_id:string):AnnotationBox|undefined{return undefined;}}
 assert.throws(()=>actualPageObstacles(page,new MissingLookup(plain)),/ownership missing/);
 const overridden=heads();overridden.get=()=>undefined;
 assert.throws(()=>actualPageObstacles(page,overridden),/ownership missing/);
 class DifferentLookup extends Map<string,AnnotationBox>{override get(id:string){return id==='first'?[11,22,33,44] as AnnotationBox:super.get(id);}}
 const custom=new DifferentLookup(plain);assert.deepEqual(actualPageObstacles(page,custom),originalObstacles(page,custom));
 const b=[9,10,11,12] as AnnotationBox;Object.setPrototypeOf(b,Object.assign(Object.create(Array.prototype),{toJSON:()=>plain.get('first')}));
 const unusual=heads();unusual.set('first',b);assert.deepEqual(actualPageObstacles(page,unusual),originalObstacles(page,unusual));
});

test('bounded eviction retains complete independent inventories and does not cache failed geometry',()=>{
 const first=svg(primitive),map=heads(),expected=originalObstacles(first,map);actualPageObstacles(first,map);
 for(let i=0;i<25;i++){const p=svg(primitive+`<circle cx="${100+i}" cy="200" r="10"/>`);assert.deepEqual(actualPageObstacles(p,map),originalObstacles(p,map));}
 assert.deepEqual(actualPageObstacles(first,map),expected);
 for(const bad of [svg('<path d="M10 10 S20 20 30 10"/>'),svg('<g transform="skewX(15)">'+primitive+'</g>'),svg('<style>text{font-size:9pt}</style>'+primitive),svg('<line x1="0" y1="NaN" x2="1" y2="2"/>')]){
  let oldMessage='';try{originalObstacles(bad,map);}catch(e){oldMessage=String(e);}
  assert.throws(()=>actualPageObstacles(bad,map),e=>String(e)===oldMessage);assert.throws(()=>actualPageObstacles(bad,map),e=>String(e)===oldMessage);
 }
});

test('font policy remains independently validated before every cached inventory return',async()=>{
 const css='.janko-page-num{font-family:"Liberation Serif", "Century Schoolbook", "Baskerville", "DejaVu Serif", "Times New Roman", Georgia, serif;font-style:italic;font-weight:400;font-size:8pt;text-anchor:end}',
  page=svg(`<style>${css}</style><text class="janko-page-num" x="575" y="830">Page 2 of 3</text>`);
 assert.throws(()=>actualPageObstacles(page,new Map(),ANNOTATION_INK_POLICY),/independently admitted/);
 await ensureAnnotationInkPolicyReady(ANNOTATION_INK_POLICY);
 const expected=originalObstacles(page,new Map(),ANNOTATION_INK_POLICY);
 assert.deepEqual(actualPageObstacles(page,new Map(),ANNOTATION_INK_POLICY),expected);assert.deepEqual(actualPageObstacles(page,new Map(),ANNOTATION_INK_POLICY),expected);
 const forged=structuredClone(ANNOTATION_INK_POLICY);(forged.footer as any).fontSizePt=9;
 assert.throws(()=>actualPageObstacles(page,new Map(),forged),/altered/);
 assert.deepEqual(actualPageObstacles(page,new Map()),originalObstacles(page,new Map()),'legacy bands remain a separate policy');
});
