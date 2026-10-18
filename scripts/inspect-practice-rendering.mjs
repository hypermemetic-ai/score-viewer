// Chromium supplies all SVG bounds/matrices. No geometry mocks or user state.
import assert from 'node:assert/strict';
import {exerciseBrowserSelection,exercisePartialBrowser,exercisePassage,exerciseFixture,exerciseOwnedView,exercisePreviewFit,exerciseRelations} from './practice-rendering-cases.mjs';
import {mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const {chromium}=await import(process.env.PRACTICE_PLAYWRIGHT??'playwright-core');
const output=process.env.PRACTICE_ARTIFACTS??'/tmp/score-viewer-practice-rendering';
const baseline=process.argv.includes('--baseline');
const temporary='.practice-rendering-baseline';
await mkdir(output,{recursive:true});
if(baseline){
 await mkdir(temporary,{recursive:true});
 for(const name of ['practice-view','practice-browser','practice-crop-fit']){
  let source=execFileSync('git',['show',`1fba9a0:src/${name}.ts`],{encoding:'utf8'});
  source=source.replace(/from\s*(['"])\.\/([^'"]+)\1/g,(_,quote,target)=>`from ${quote}${['practice-view','practice-browser','practice-crop-fit'].includes(target)?'./'+target:'/src/'+target}${quote}`).replaceAll("'../vendor/","'/vendor/");
  await writeFile(`${temporary}/${name}.ts`,source);
 }
}
const browser=await chromium.launch({executablePath:process.env.PRACTICE_CHROMIUM,headless:true});
const results=[];
try {
 const packages=[{name:'schumann-janko',path:'vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.tuna'},
  {name:'schumann-conventional',path:'vendor/iso-notation/public/review/schumann-no14-conventional-actions-20261007.tuna'}];
 if(process.env.PRACTICE_ZELDA)for(const keyboard of ['conventional-piano','janko-four-row'])packages.push({name:`zelda-${keyboard}`,path:process.env.PRACTICE_ZELDA,keyboard});
 for(const input of packages.filter(input=>!process.env.PRACTICE_FIXTURE_ONLY&&(!process.env.PRACTICE_SCORE_FILTER||input.name.includes(process.env.PRACTICE_SCORE_FILTER)))){
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
  page.on('pageerror',e=>console.error(e));
  await page.goto(process.env.PRACTICE_URL??'http://127.0.0.1:5205');
  if(baseline)await page.addStyleTag({content:execFileSync('git',['show','1fba9a0:src/style.css'],{encoding:'utf8'})});
  const encoded=(await readFile(input.path)).toString('base64');
  await page.evaluate(async({encoded,keyboard,baseline})=>{
   const [{PracticeView},{importPackage,selectPresentation},{addReferencePerformanceTempo},{initialPersonal}]=await Promise.all([import(baseline?'/.practice-rendering-baseline/practice-view.ts':'/src/practice-view.ts'),import('/src/package.ts'),import('/src/reference-tempo-update.ts'),import('/src/state.ts')]);
   let p=await importPackage(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),{allowLegacyTempo:true});
   if(keyboard)p=await selectPresentation(p,keyboard);
   if(!p.score.referencePerformanceTempo)p=(await addReferencePerformanceTempo(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),{version:'reference-performance-tempo-v1',bpm:180,beat:{numerator:3,denominator:8},provenance:{kind:'editorial',reference:'Isolated browser regression clock'}})).after;
   window.pkg=p;document.querySelector('#app').innerHTML='';window.rotation=0;window.fingerPresentation='annotations';
   window.practice=new PracticeView(document.querySelector('#app'),{package:p,personal:initialPersonal(p),rotation:()=>window.rotation,presentation:()=>window.fingerPresentation,entryId:'isolated-regression',connected:()=>true,source:()=>'',connect:async()=>{},disconnect:async()=>{},back:()=>{},settings:()=>{},changed:()=>{}});
   await window.practice.mount();await document.fonts.ready;window.practice.refit();
  },{encoded,keyboard:input.keyboard,baseline});
  const status=await page.evaluate(()=>({keyboard:window.pkg.keyboardLayout??'janko-four-row',chunks:window.practice.plan.chunks.map(c=>c.id),presentations:window.pkg.availablePresentations}));
  const windows=input.name.startsWith('zelda')?['1-4','5-8','25-29','30-33']:['1-4','5-8'];
  const captures=[];
  for(const id of windows){
   assert.ok(status.chunks.includes(id),`Required actual leaf ${input.name} ${id}`);
   await page.evaluate(async id=>{await window.practice.action('overview');await window.practice.action('select:'+id);},id);
   await page.screenshot({path:`${output}/${baseline?'before':'after'}-${input.name}-${id}-preview.png`});
   const preview=await geometry(page,'.practice-leaf-preview',baseline);
   await page.evaluate(async id=>{const v=window.practice,chunk=v.plan.chunks.find(c=>c.id===id);v.state.groundwork??={};v.state.groundwork[chunk.pattern]=true;await v.action('passage:'+id);v.pause();},id);
   const active=await geometry(page,'.practice-score',baseline);
   const error=await page.locator('.practice-render-error').allTextContents();
   assert.deepEqual(error,[],`${input.name} ${id} must be admitted`);
   await page.screenshot({path:`${output}/${baseline?'before':'after'}-${input.name}-${id}-active.png`});
   if(!baseline){const bars=Number(id.split('-')[1])-Number(id.split('-')[0])+1;assertContinuous(preview,bars);assertContinuous(active,Math.min(4,bars));if(input.name.startsWith('zelda')&&id==='25-29')assert.ok(Math.abs(preview.leftAir-preview.rightAir)<1,'balanced complete preview ink');if(input.name.startsWith('zelda')&&id==='30-33')assert.ok(Math.abs(active.leftAir-active.rightAir)<1,'balanced complete leaf active ink');}
   const relations=!baseline?await exerciseRelations(page):undefined;captures.push({id,preview,active,relations});
  }
  await page.evaluate(async()=>{const v=window.practice;await v.action('passage:'+v.plan.chunks[0].id);v.session.ready(0);for(const a of v.session.events)v.session.note(a.midi,v.session.startMs+(a.tick-v.session.startTick)*v.session.tickMs);v.session.update(v.session.startMs+(v.session.chunk.end-v.session.startTick)*v.session.tickMs-1);v.paintVisibility();});
  const removed=await lifecycle(page);
  await page.screenshot({path:`${output}/${baseline?'before':'after'}-${input.name}-removed.png`});
  if(!baseline)assert.equal(removed.residual,0,`${input.name}: all owned ink hides with notes`);
  await page.evaluate(()=>window.practice.pause());
  const restored=await lifecycle(page);
  await page.screenshot({path:`${output}/${baseline?'before':'after'}-${input.name}-paused.png`});
  if(!baseline)assert.equal(restored.hidden,0,`${input.name}: Pause restores full window`);
  const rotation=await page.evaluate(()=>{const v=window.practice;v.session.ready(0);const epoch=v.session.startMs,phase=v.session.phase;window.rotation=90;v.refit();return {sameEpoch:v.session.startMs===epoch,samePhase:v.session.phase===phase,overflow:document.querySelector('.practice-score').scrollWidth>document.querySelector('.practice-score').clientWidth};});
  if(!baseline){assert.equal(rotation.sameEpoch,true);assert.equal(rotation.samePhase,true);assert.equal(rotation.overflow,false);}
  await page.screenshot({path:`${output}/${baseline?'before':'after'}-${input.name}-rotation.png`});
  const previewFits=!baseline?await exercisePreviewFit(page,output,input.name):undefined;
  const browserSelection=!baseline?await exerciseBrowserSelection(page,output,input.name):undefined;
  const partialBrowser=!baseline?await exercisePartialBrowser(page,output,input.name):undefined;
  const integration=!baseline&&input.name.startsWith('schumann')?await exercisePassage(page,output,input.name):undefined;
  await page.evaluate(()=>window.practice.close());
  results.push({name:input.name,status,captures,removed,restored,rotation,integration,previewFits,browserSelection,partialBrowser});
  await context.close();
 }
 const page=await browser.newPage({viewport:{width:1440,height:900}});await page.goto(process.env.PRACTICE_URL??'http://127.0.0.1:5205');
 const fixture=await exerciseFixture(page,baseline);console.log(JSON.stringify({fixture}));
 if(baseline){assert.ok(results[0].captures[0].active.maxStaffMismatch>1);assert.ok(fixture.remaining>0);}else{
  assert.equal(fixture.remaining,0);assert.deepEqual(fixture.errors,[]);assert.ok(fixture.continuations);assert.ok(fixture.shared);assert.ok(fixture.restInk);assert.equal(fixture.hidden,0);assert.equal(fixture.restored,0);assert.ok(fixture.ringCount);assert.equal(fixture.ringUnbound,0);assert.equal(fixture.finalRules,1);for(const r of fixture.relationProfiles){assert.equal(r.count,2);assert.deepEqual(r.owners,['5:RH']);assert.ok(r.hiddenRelation);assert.ok(r.restoredRelation);assert.ok(r.withinFrame);assert.ok(r.clippedContinuation);assert.equal(r.commands,r.profile==='uniform'?'MQ':'MCLCZ');}assert.ok(fixture.dotOwners.some(owners=>owners.length>1));assert.equal(fixture.repeats.filter(r=>r.type==='repeat-start').length,1);assert.equal(fixture.repeats.filter(r=>r.type==='repeat-end').length,1);for(const repeat of fixture.repeats){assert.equal(repeat.lines,2);assert.equal(repeat.dots,2);}assert.equal(fixture.wrapSourceWidth,fixture.canonicalWidth);assert.ok(fixture.wrapGap>0);assert.match(fixture.ambiguous,/unresolved/);assert.ok(fixture.uniqueIds);assert.ok(fixture.resolvedClips);assert.ok(fixture.carryRelationOwners.length);for(const family of Object.values(fixture.inventory))assert.equal(family.unbound,0);
 }
 await page.screenshot({path:`${output}/${baseline?'before':'after'}-duration-removed.png`});
 const ownedView=!baseline?await exerciseOwnedView(page):undefined;
 if(ownedView){assert.deepEqual(ownedView.protectedBars,[8,5,6,7]);assert.deepEqual(ownedView.releasedBars,[8,9,6,7]);assert.ok(ownedView.stable);assert.ok(ownedView.sharedVisible);assert.equal(ownedView.sharedVisibleContributors,1);assert.ok(ownedView.annotationsBefore);assert.equal(ownedView.annotationsAfter,0);assert.equal(ownedView.annotationsRestored,ownedView.annotationsBefore);}

 await writeFile(`${output}/${baseline?'before':'after'}-results.json`,JSON.stringify({baseline,viewport:{width:1440,height:900},results,fixture,ownedView},null,2));
 console.log(JSON.stringify({baseline,output,scores:results.map(r=>({name:r.name,removed:r.removed,restored:r.restored})),fixture,ownedView}));
}finally{await browser.close();if(baseline)await rm(temporary,{recursive:true,force:true});}
async function geometry(page,selector,baseline){return page.evaluate(({selector,baseline})=>{
 const root=document.querySelector(selector),svgs=baseline?[...root.querySelectorAll('svg')]:[...root.querySelectorAll('.practice-passage > g[data-practice-bar] > svg')];
 const bars=svgs.map(svg=>{
  const box=svg.viewBox.baseVal,m=svg.getScreenCTM(),left=new DOMPoint(box.x,box.y).matrixTransform(m).x,right=new DOMPoint(box.x+box.width,box.y).matrixTransform(m).x;
  const lines=[...svg.querySelectorAll('.janko-pitch-lane')].filter(l=>Number(l.getAttribute('stroke-width'))>=.49),ys=[...new Set(lines.map(l=>new DOMPoint(Number(l.getAttribute('x1')),Number(l.getAttribute('y1'))).matrixTransform(l.getScreenCTM()).y))].sort((a,b)=>a-b);
  const padding=svg.closest(".practice-passage")?.querySelector(`.practice-staff-padding[data-slot="${svg.parentElement.dataset.slot}"] line`),end=padding?new DOMPoint(Number(padding.getAttribute("x2")),Number(padding.getAttribute("y1"))).matrixTransform(padding.getScreenCTM()).x:right;const staff=lines[0],from=staff?new DOMPoint(Number(staff.getAttribute("x1")),Number(staff.getAttribute("y1"))).matrixTransform(staff.getScreenCTM()).x:left,to=staff?new DOMPoint(Number(staff.getAttribute("x2")),Number(staff.getAttribute("y2"))).matrixTransform(staff.getScreenCTM()).x:right;const crop=window.practice.crops?.find(c=>c.bar+1===Number(svg.dataset.practiceBar)),literal=window.practice.plan.barTicks[Number(svg.dataset.practiceBar)],endingType=window.pkg.score.barlines?.find(rule=>rule.tick===literal)?.type,fullLines=[...svg.querySelectorAll('.janko-pitch-lane')].filter(l=>Number(l.getAttribute('stroke-width'))>=.49),rawRight=Math.max(...fullLines.map(l=>Number(l.getAttribute('x2')))),ordinaryAtRight=[...svg.querySelectorAll('.janko-barlines .janko-barline,[data-practice-source-boundary]')].filter(l=>Math.abs(Number(l.getAttribute('x1'))-rawRight)<.03).length;return {bar:svg.dataset.practiceBar,endingType,ordinaryAtRight,left:baseline?left:from,right:baseline?right:padding?end:to,ys};
 });
 const maxStaffMismatch=bars.length?Math.max(...bars.flatMap(b=>b.ys.map((y,i)=>Math.abs(y-bars[0].ys[i])))):0;
 const bounds=root.getBoundingClientRect();return {bars,maxStaffMismatch,overflow:root.scrollWidth>root.clientWidth,rows:root.dataset.rows,leftAir:bars[0]?.left-bounds.left,rightAir:bounds.right-bars.at(-1)?.right};
 },{selector,baseline});}
function assertContinuous(geometry,count=4){assert.equal(geometry.bars.length,count);assert.ok(geometry.maxStaffMismatch<.05,`staff mismatch ${JSON.stringify(geometry)}`);assert.equal(geometry.overflow,false);for(let i=1;i<geometry.bars.length;i++)assert.ok(Math.abs(geometry.bars[i].left-geometry.bars[i-1].right)<.05,'no crop gutter');for(const bar of geometry.bars.slice(0,-1))if(!bar.endingType||bar.endingType==='regular')assert.equal(bar.ordinaryAtRight,1,`one internal separator in measure ${bar.bar}`);const last=geometry.bars.at(-1);if(!last.endingType||last.endingType==='regular')assert.equal(last.ordinaryAtRight,0,'open ordinary strip end');}
async function lifecycle(page){return page.evaluate(()=>{
 const crops=window.practice.crops,owned=[...crops.flatMap(c=>c.owned),...window.practice.relations],hidden=owned.filter(q=>getComputedStyle(q.el).visibility==='hidden').length;
 const families='.janko-stem,.janko-hollow-stem,.janko-stem-ring,.janko-flag,.janko-augmentation-dot,.janko-reading-head,.janko-phrase,.janko-phrase-grid-knockout';
 const groups=window.practice.session.visibleGroups();let residual=0,unbound=0;for(const crop of crops)for(const el of crop.svg.querySelectorAll(families)){const binding=crop.owned.find(q=>q.el===el||q.el.contains(el));if(!binding){unbound++;if(getComputedStyle(el).visibility!=='hidden')residual++;}else if(!binding.groups.some(g=>groups.has(g))&&getComputedStyle(el).visibility!=='hidden')residual++;}
 for(const q of window.practice.relations)if(!q.groups.some(g=>groups.has(g))&&getComputedStyle(q.el).visibility!=='hidden')residual++;return {owned:owned.length,hidden,residual,unbound,hollow:document.querySelectorAll('.practice-score .janko-hollow-stem').length,matched:window.practice.session.matched.size,phase:window.practice.session.phase};
 });}
