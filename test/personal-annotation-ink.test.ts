import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DOMParser} from '@xmldom/xmldom';
import {ANNOTATION_INK_POLICY,PERSONAL_ANNOTATION_INK_POLICY,ensureAnnotationInkPolicyReady,annotationInkPolicyFor,applyAnnotationInkPolicy,verifyPersonalTextMetrics} from '../src/annotation-ink-policy';
import {actualPageObstacles,boxesOverlap} from '../src/svg-annotation-clearance';
import {importPackage,selectPresentation} from '../src/package';
import {initialPersonal} from '../src/state';
import {assigned} from '../src/personal-assignments';
import {PersonalPresentationSession} from '../src/personal-presentation';
import {annotationPositions,affiliatedAnnotationPosition,personalAnnotationPosition} from '../src/fingering-presentation';
const css='.janko-measure-num{font-family:"Liberation Serif", "Century Schoolbook", "Baskerville", "DejaVu Serif", "Times New Roman", Georgia, serif;font-style:italic;font-weight:normal;font-size:7pt;text-anchor:end}';
const page=(attrs='',text='37')=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 850"><style>${css}</style><text class="janko-measure-num" x="25" y="130" ${attrs}>${text}</text></svg>`;

test('personal measure numbers occupy their measured margin, with independent policy cache keys and unchanged historical bands',async()=>{
 await ensureAnnotationInkPolicyReady(PERSONAL_ANNOTATION_INK_POLICY);
 const box=(policy:any)=>actualPageObstacles(page(),new Map(),policy).boxes[0];
 const old=box(ANNOTATION_INK_POLICY),personal=box(PERSONAL_ANNOTATION_INK_POLICY);
 assert.equal(old[0],0);assert.equal(old[2],600);
 assert.ok(personal[0]>10&&personal[2]<30,'numeric margin ink remains in the left margin');
 assert.equal(boxesOverlap([200,118,205,122],personal),false);
 assert.equal(boxesOverlap([18,125,23,129],personal),true,'true label overlap remains an obstacle');
 assert.deepEqual(box(ANNOTATION_INK_POLICY),old,'historical cache cannot inherit personal bounds');
 personal[0]=-100;assert.ok(box(PERSONAL_ANNOTATION_INK_POLICY)[0]>10,'returned boxes do not mutate cached bounds');
 const stroke=actualPageObstacles(page('stroke="black" stroke-width="4" stroke-linejoin="round"'),new Map(),PERSONAL_ANNOTATION_INK_POLICY).boxes[0];
 assert.ok(stroke[0]<box(PERSONAL_ANNOTATION_INK_POLICY)[0]);
 const shifted=actualPageObstacles(page('transform="translate(100 200)"'),new Map(),PERSONAL_ANNOTATION_INK_POLICY).boxes[0];
 const plain=box(PERSONAL_ANNOTATION_INK_POLICY);for(let i=0;i<4;i++)assert.ok(Math.abs(shifted[i]-plain[i]-(i%2?200:100))<1e-6);
});

test('unknown or altered measure typography stays conservative and altered personal font claims refuse even cached ink',async()=>{
 await ensureAnnotationInkPolicyReady(PERSONAL_ANNOTATION_INK_POLICY);
 for(const svg of [page('style="font-family:serif"'),page('style="font-size:8pt"'),page('style="font-kerning:normal"'),page('style="font-style:normal"'),page('','m. 37'),page('','0'),page('','1234567890')]){
  const b=actualPageObstacles(svg,new Map(),PERSONAL_ANNOTATION_INK_POLICY).boxes[0];assert.equal(b[0],0);assert.equal(b[2],600);
 }
 for(const attr of ['dy="80"','textLength="150"','dominant-baseline="hanging"'])
  assert.throws(()=>actualPageObstacles(page(attr),new Map(),PERSONAL_ANNOTATION_INK_POLICY),/Unsupported/);
 actualPageObstacles(page(),new Map(),PERSONAL_ANNOTATION_INK_POLICY);
 const bad={...PERSONAL_ANNOTATION_INK_POLICY,footer:{...PERSONAL_ANNOTATION_INK_POLICY.footer,fontSha256:'0'.repeat(64)}};
 assert.throws(()=>actualPageObstacles(page(),new Map(),bad),/altered personal/);
 assert.throws(()=>annotationInkPolicyFor({personalAnnotationInkPolicy:bad}),/altered personal/);
 assert.throws(()=>annotationInkPolicyFor({personalAnnotationInkPolicy:{...PERSONAL_ANNOTATION_INK_POLICY,measureNumbers:{...PERSONAL_ANNOTATION_INK_POLICY.measureNumbers,fontSizePt:8}}}),/altered personal/);
});

test('the display adapter selects precisely the same known labels and measured face, preserving 7pt size',async()=>{
 await ensureAnnotationInkPolicyReady(PERSONAL_ANNOTATION_INK_POLICY);
 for(const known of [true,false]){
  const doc=new DOMParser().parseFromString(page('',known?'37':'unknown'),'image/svg+xml'),root=doc.documentElement!,label=doc.getElementsByTagName('text')[0],changes=new Map<string,string>();
  Object.defineProperty(label,'style',{value:{setProperty:(key:string,value:string)=>changes.set(key,value)}});
  applyAnnotationInkPolicy(root as unknown as SVGElement,PERSONAL_ANNOTATION_INK_POLICY);
  if(known){assert.equal(changes.get('font-family'),'"'+PERSONAL_ANNOTATION_INK_POLICY.footer.family+'"');assert.equal(changes.get('font-size'),'7pt');assert.equal(changes.get('font-style'),'italic');assert.equal(changes.get('font-kerning'),'none');}
  else assert.equal(changes.size,0,'unmeasured typography is not adapted');
 }
});

test('one No14 hand edit no longer pushes unrelated right-hand fingerings above distant measure-number bands',async()=>{
 const bytes=readFileSync(new URL('../vendor/iso-notation/public/review/schumann-no14-conventional-20261006.tuna',import.meta.url)),
  p=await selectPresentation(await importPackage(bytes),'janko-four-row'),initial=initialPersonal(p),beforePages=[...p.pages],beforeNotes=JSON.stringify(p.score.notes),
  seat=p.seats.find(s=>s.ownerIds.some(id=>p.score.notes.find(n=>n.id===id)?.hand==='LH'))!,
  personal=assigned(p,initial,seat,{hand:'RH'}),beforePersonal=JSON.stringify(personal),session=new PersonalPresentationSession(p),q=await session.project(personal);
 assert.equal(p.annotationGeometry,undefined);assert.equal(annotationInkPolicyFor(p),undefined);
 assert.equal(annotationInkPolicyFor(q),PERSONAL_ANNOTATION_INK_POLICY);
 const repaired=annotationPositions(q),oldBands=annotationPositions({...q,personalAnnotationInkPolicy:undefined}),
  withNoMarginNumbers=annotationPositions({...q,pages:q.pages.map(svg=>svg.replace(/<text\b[^>]*class="janko-measure-num"[^>]*>[^<]*<\/text>/g,''))});
 let restored=0;
 for(const s of q.seats){if(s.system===seat.system||q.score.notes.find(n=>n.id===s.ownerIds[0])?.hand!=='RH')continue;
  const a=repaired.get(s.id)!,b=oldBands.get(s.id)!,without=withNoMarginNumbers.get(s.id)!;
  assert.deepEqual(a,without,'distant margin text must not displace an unrelated annotation: '+s.id);
  if(a.baseline-b.baseline>5)restored++;
 }
 assert.ok(restored>100,'exercise widespread displacement, not only the hand-edited note');
 for(const [page,svg] of q.pages.entries()){
  const g=q.annotationGeometry!.seats.filter(s=>s.page===page),obstacles=actualPageObstacles(svg,new Map(g.map(s=>[s.seatId,[s.headBounds.x0,s.headBounds.y0,s.headBounds.x1,s.headBounds.y1] as [number,number,number,number]])),PERSONAL_ANNOTATION_INK_POLICY),placed=[] as [number,number,number,number][];
  for(const seat of q.seats.filter(s=>s.page===page)){const a=repaired.get(seat.id)!;
   assert.ok(!obstacles.boxes.some(b=>boxesOverlap(a.bounds,b)),'all reserved finger outlines clear actual page ink: '+seat.id);
   assert.ok(!placed.some(b=>boxesOverlap(a.bounds,b)),'finger stacks do not overlap: '+seat.id);placed.push(a.bounds);
   assert.ok(Math.abs(a.x-a.carrier.x)<=seat.fontSize*4/3/2+.001,'placement stays local to its original column');
  }
 }

 assert.deepEqual(p.pages,beforePages);assert.equal(JSON.stringify(p.score.notes),beforeNotes);assert.equal(JSON.stringify(personal),beforePersonal);
 assert.equal(await session.project(initial),p,'restoring original hands restores the exact original package');
 assert.equal(q.files,p.files,'ephemeral font policy never rewrites saved archive members');
 const fresh=await new PersonalPresentationSession(p).project(personal);assert.deepEqual(annotationPositions(fresh),repaired,'reopening with saved assignments reproduces the repaired positions');
});


test('personal placement keeps a nearby horizontal clearance instead of searching far away for the exact stem column',()=>{
 const input={x:100,top:140,direction:-1 as const,gap:5.6,height:12,em:14,width:[-3,3] as [number,number],columns:[30,100,170],
  page:{width:200,height:300,boxes:[[99,120,101,153] as [number,number,number,number]]},occupied:[]};
 const retained=affiliatedAnnotationPosition(input)!,personal=affiliatedAnnotationPosition({...input,preferNearest:true})!;
 assert.equal(retained.x,100);assert.ok(retained.top<110,'retained calculated behavior is unchanged');
 assert.equal(personal.top,140);assert.ok(Math.abs(personal.x-100)<5);
 assert.equal(boxesOverlap([personal.x-3,personal.top,personal.x+3,personal.top+12],input.page.boxes[0]),false);
 assert.equal(affiliatedAnnotationPosition({...input,preferNearest:true,columns:[92,100,108],page:{...input.page,boxes:[[99,0,101,300]]}}),undefined,'nearest placement cannot borrow the neighboring note column');
});

const expression=(attrs='',text='diminuendo')=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 850"><text class="janko-expression-text" x="77" y="376" font-family="Century Schoolbook,serif" font-size="8.5" font-style="italic" ${attrs}>${text}</text></svg>`;
test('source expression words receive verified finite glyph coverage and matching local display without narrowing unknown styles',async()=>{
 await ensureAnnotationInkPolicyReady(PERSONAL_ANNOTATION_INK_POLICY);await verifyPersonalTextMetrics();
 await assert.rejects(verifyPersonalTextMetrics('{"glyphs":{}}'),/exact bytes/);
 for(const text of ['diminuendo','cresc.','ritardando','dolce e cantabile']){
  const svg=expression('',text),known=actualPageObstacles(svg,new Map(),PERSONAL_ANNOTATION_INK_POLICY).boxes[0],old=actualPageObstacles(svg,new Map(),ANNOTATION_INK_POLICY).boxes[0];
  assert.ok(known[0]>70&&known[2]<160);assert.ok(known[1]<370&&known[3]>380);assert.equal(old[0],0);assert.equal(old[2],600);
  assert.equal(boxesOverlap([400,365,405,372],known),false);assert.equal(boxesOverlap([80,371,85,375],known),true);
  const doc=new DOMParser().parseFromString(svg,'image/svg+xml'),el=doc.getElementsByTagName('text')[0],changes=new Map<string,string>();
  Object.defineProperty(el,'style',{value:{setProperty:(k:string,v:string)=>changes.set(k,v)}});applyAnnotationInkPolicy(doc.documentElement! as unknown as SVGElement,PERSONAL_ANNOTATION_INK_POLICY);
  assert.equal(changes.get('font-family'),'"'+PERSONAL_ANNOTATION_INK_POLICY.footer.family+'"');assert.equal(changes.get('font-size'),'8.5px');assert.equal(changes.get('text-anchor'),'start');assert.equal(changes.get('font-kerning'),'none');
 }
 const plain=actualPageObstacles(expression(),new Map(),PERSONAL_ANNOTATION_INK_POLICY).boxes[0],shifted=actualPageObstacles(expression('transform="translate(20 -10)"'),new Map(),PERSONAL_ANNOTATION_INK_POLICY).boxes[0];
 for(let i=0;i<4;i++)assert.ok(Math.abs(shifted[i]-plain[i]-(i%2?-10:20))<1e-6);
 for(const svg of [expression('style="font-family:serif"'),expression('style="font-size:9"'),expression('text-anchor="end"'),expression('style="font-weight:700"'),expression('style="letter-spacing:1px"'),expression('','più mosso'),expression('','   '),expression('','  dolce'),expression('','dolce  e cantabile'),expression('','dolce ')]){
  const b=actualPageObstacles(svg,new Map(),PERSONAL_ANNOTATION_INK_POLICY).boxes[0];assert.equal(b[0],0);assert.equal(b[2],600);
 }
 assert.throws(()=>actualPageObstacles(expression('dy="100"'),new Map(),PERSONAL_ANNOTATION_INK_POLICY),/Unsupported/);
});

// Geometry of No. 13, bar 38 (owner's hands): a left-hand note whose carrier
// sits 1.3 units from the next column, with the bottom staff line just below.
const crowded={x:379.39,top:393.84,direction:1 as const,gap:3.09,height:4.02,em:7.73,width:[-1.47,1.31] as [number,number],
 columns:[331.89,378.09,379.39,383.55,401.99],page:{width:595.28,height:841.89,boxes:[[30.4,395.1,576.7,397.9],[378.1,390.5,383.5,391.5]] as [number,number,number,number][]},occupied:[],preferNearest:true};
test('crowded columns keep a personal finger in its own column, clear of the staff line',()=>{
 assert.equal(affiliatedAnnotationPosition(crowded),undefined,'midpoints of columns 1.3 units apart leave no room for the digit');
 const fit=personalAnnotationPosition(crowded),digit:[number,number,number,number]=[fit.x-1.47,fit.top,fit.x+1.31,fit.top+4.02];
 assert.equal(fit.x,379.39,'the finger stays on its own note');
 assert.ok(fit.top>=397.9&&fit.top<404,'just below the staff line, not far away');
 assert.ok(crowded.page.boxes.every(b=>!boxesOverlap(digit,b)));
});
test('a personal finger is always placed: unchanged where clear, least ink where nothing is clear',()=>{
 const clear={...crowded,columns:[300,379.39,460]};
 assert.deepEqual(personalAnnotationPosition(clear),affiliatedAnnotationPosition(clear),'a clear placement is exactly the existing one');
 const ink=[[0,0,595.28,841.89],[379.39-1.47,393.84+4*3.09/2,379.39+1.31,841.89]] as [number,number,number,number][],
  covered={...crowded,page:{...crowded.page,boxes:ink}},fit=personalAnnotationPosition(covered);
 assert.equal(affiliatedAnnotationPosition({...covered,admitOwnColumn:true}),undefined);
 assert.equal(fit.x,379.39);assert.ok(fit.top<393.84+4*3.09/2,'least ink: above the second layer');
 assert.ok(fit.top>=0&&fit.top+4.02<=841.89,'inside the page');
});
