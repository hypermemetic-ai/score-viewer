import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer as createViteServer} from 'vite';
import {oversizedPracticeFixture,oversizedDualPracticeFixture} from '../test/support/oversized-practice-fixture.ts';
const {chromium}=await import(process.env.PRACTICE_PLAYWRIGHT??'/tmp/score-viewer-practice-browser/node_modules/playwright-core/index.mjs');
const output=process.env.PRACTICE_ARTIFACTS??'/tmp/score-viewer-bounded-session-excerpts';await mkdir(output,{recursive:true});
const receipt={cases:[],limits:['Source-browser mounted production views and authored wide source pages, not installed acceptance, physical performance or latency certification.']};
let vite,browser;const server=createServer((req,res)=>{if(req.url==='/__excerpts'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><main id="app"></main><script type="module">import "/src/style.css";</script>');return;}vite.middlewares(req,res,()=>{res.writeHead(404);res.end();});});
try{
 const {piano}=await oversizedPracticeFixture(),manualBytes=await oversizedDualPracticeFixture();
 await new Promise(r=>server.listen(0,'127.0.0.1',r));vite=await createViteServer({root:resolve('.'),server:{middlewareMode:true,hmr:false},appType:'custom'});browser=await chromium.launch({headless:true,executablePath:process.env.PRACTICE_CHROMIUM});
 for(const assessment of ['piano','manual']){
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/__excerpts');
  const cases=await page.evaluate(async({assessment,piano,encoded})=>{
   const [{PracticeView},{ManualPracticeView},{ManualReadingContext},{manualPassageScene},{importPackage},{initialPersonal},{practiceCatalogChunks},{activePracticeClip}]=await Promise.all([import('/src/practice-view.ts'),import('/src/manual-practice-view.ts'),import('/src/manual-reading-context.ts'),import('/src/manual-passage-scene.ts'),import('/src/package.ts'),import('/src/state.ts'),import('/src/practice.ts'),import('/src/practice-clip.ts')]);
   const p=assessment==='piano'?piano:await importPackage(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))),before=JSON.stringify(p.score),context=assessment==='manual'?await ManualReadingContext.open(p):undefined;
   const view=context?new ManualPracticeView(document.querySelector('#app'),{context,personal:initialPersonal(p),passage:bars=>manualPassageScene(context.package,bars).svg,save:async()=>{},back:()=>{},settings:()=>{},changed:()=>{}}):new PracticeView(document.querySelector('#app'),{package:p,personal:initialPersonal(p),entryId:'c'.repeat(64),connected:()=>false,source:()=>'',connect:async()=>{},disconnect:async()=>{},back:()=>{},settings:()=>{},changed:()=>{}});
   await view.mount();cancelAnimationFrame(view.raf);const plan=view.plan,cases=[];
   for(const notation of context?['iso','tab']:['piano']){if(context){context.switchNotation(notation);view.paint();}
   for(const chunk of practiceCatalogChunks(plan).filter(c=>c.kind!=='contrast')){
    const clip=activePracticeClip(chunk,plan.barTicks);if(!clip)continue;await view.action('passage:'+chunk.id);await new Promise(r=>requestAnimationFrame(r));const svg=document.querySelector('.practice-score>svg'),header=document.querySelector('[data-practice-range]');if(!svg)throw Error(view.renderError??'No actual active source excerpt');if(svg.dataset.practiceClipStart!==String(chunk.start)||svg.dataset.practiceClipEnd!==String(chunk.end))throw Error('Active view differs from actual source range');if(header.textContent.includes(chunk.id)||!header.textContent.includes('excerpt'))throw Error('Internal identity or misleading whole-bar header');
    const events=assessment==='piano'?view.session.events:undefined,reading=assessment==='piano'?view.reading.steps.flatMap(s=>s.events):undefined;
    if(events?.some(a=>a.tick<chunk.start||a.tick>=chunk.end)||reading?.some(a=>a.tick<chunk.start||a.tick>=chunk.end))throw Error('Outside source attacks entered active practice');
    if(assessment==='piano'){
     const ids=[...svg.querySelectorAll('[data-viewer-seat]')].map(n=>n.dataset.viewerSeat),expected=p.seats.filter(s=>s.ownerIds.some(id=>p.score.notes.some(n=>n.id===id&&n.startTick>=chunk.start&&n.startTick<chunk.end))).map(s=>s.id);if(ids.length!==expected.length||expected.some(id=>!ids.includes(id)))throw Error('Piano clip omitted or retained outside heads');
    }else{
     const scene=context.package.reading.dual.views[context.view.notation].scene,expected=scene.components.filter(c=>c.tick>=chunk.start&&c.tick<chunk.end).flatMap(c=>c.inkIds),seen=new Set([...svg.querySelectorAll('[data-manual-source-ink]')].map(n=>n.dataset.manualSourceInk));if(expected.some(id=>!seen.has(id)))throw Error('Manual active clip omitted source components');const inside=new Set(expected),outside=scene.components.filter(c=>c.tick<chunk.start||c.tick>=chunk.end).flatMap(c=>c.inkIds).filter(id=>!inside.has(id));if(outside.some(id=>seen.has(id)))throw Error('Manual active clip retained outside source component ink');
    }
    const carries=(assessment==='piano'?plan.attacks:plan.owners).filter(a=>a.tick<chunk.start&&a.end>chunk.start);if(carries.length&&!document.querySelector('.practice-held-origin,.practice-held-origins,.practice-held-origin,.practice-held-origin svg'))throw Error('Earlier sounding source owners have no preparation context');
    cases.push({notation,id:chunk.id,start:chunk.start,end:chunk.end,completion:view.session.completionTick,header:header.textContent,carries:carries.length,sourceRangeExact:true,...(assessment==='piano'?{outsideAttacksAbsent:true}:{sourceComponentsRetained:true,outsideComponentInkAbsent:true})});
   }
   }
   if(JSON.stringify(p.score)!==before)throw Error('Active excerpt view changed musical source');window.inspectedView=view;return cases;
  },{assessment,piano,encoded:Buffer.from(manualBytes).toString('base64')});assert.ok(cases.length);assert.deepEqual(errors,[]);receipt.cases.push({assessment,sourceUnchanged:true,cases});await page.screenshot({path:output+'/'+assessment+'-active-excerpt.png'});await page.evaluate(()=>inspectedView.close());await page.close();
 }
 receipt.status='passed';console.log(JSON.stringify(receipt));
}catch(e){receipt.status='failed';receipt.error=e.stack;throw e;}
finally{await writeFile(output+'/receipt.json',JSON.stringify(receipt,null,2));await browser?.close();await vite?.close();if(server.listening)await new Promise(r=>server.close(r));}
