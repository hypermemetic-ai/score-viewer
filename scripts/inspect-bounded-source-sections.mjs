import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer as createViteServer} from 'vite';
import {boundedSourceFixtures} from '../test/support/bounded-source-fixtures.ts';
import {planPracticeSections} from '../src/practice-boundaries.ts';
const {chromium}=await import(process.env.PRACTICE_PLAYWRIGHT??'/tmp/score-viewer-practice-browser/node_modules/playwright-core/index.mjs');
const root=resolve('.'),output=process.env.PRACTICE_ARTIFACTS??'/tmp/score-viewer-bounded-source-sections';await mkdir(output,{recursive:true});
let vite,browser;const receipt={cases:[],limits:['Authored symbolic source fixtures engraved by the pinned production engine and mounted in actual PracticeView; not independent annotations of composer phrases.','Vite source browser; not emitted-main keyboard dispatch, installed native view, physical musical acceptance or timing/latency certification.','Preview geometry preserves complete source SVG bounds; it cannot establish pianist readability or cognitive suitability.']};
const server=createServer((req,res)=>{if(req.url==='/__source'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><main id="app"></main><script type="module">import "/src/style.css";</script>');return;}vite.middlewares(req,res,()=>{res.writeHead(404);res.end();});});
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));vite=await createViteServer({root,server:{middlewareMode:true,hmr:false},appType:'custom'});browser=await chromium.launch({headless:true,executablePath:process.env.PRACTICE_CHROMIUM??'/home/qqp/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'});
 for(const {name,package:p}of boundedSourceFixtures()){
  p.manifest.revision='b'.repeat(64);p.manifest.semanticSha256='c'.repeat(64);const before=JSON.stringify(p),planning=planPracticeSections(p.score),page=await browser.newPage({viewport:{width:1000,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/__source');
  const observed=await page.evaluate(async p=>{
   const [{PracticeView},{initialPersonal},{practiceCatalogChunks}]=await Promise.all([import('/src/practice-view.ts'),import('/src/state.ts'),import('/src/practice.ts')]);
   const original=JSON.stringify(p),view=new PracticeView(document.querySelector('#app'),{package:p,personal:initialPersonal(p),entryId:'a'.repeat(64),connected:()=>false,source:()=>'',connect:async()=>{},disconnect:async()=>{},back:()=>{},settings:()=>{},changed:()=>{}});await view.mount();cancelAnimationFrame(view.raf);
   const sections=practiceCatalogChunks(view.plan).filter(c=>c.kind==='section'),samples=[];
   for(const section of sections){await view.action('select:'+section.id);await new Promise(r=>requestAnimationFrame(r));const svg=document.querySelector('.practice-leaf-preview>svg');if(!svg)throw Error(document.querySelector('.practice-render-error')?.textContent??'No source preview');const r=svg.getBoundingClientRect(),o=document.querySelector('.practice-overview').getBoundingClientRect();if(!r.width||!r.height||r.bottom>o.bottom+1||r.right>o.right+1||r.left<o.left-1)throw Error('Incomplete preview bounds');samples.push({id:section.id,start:section.start,end:section.end,firstBar:section.firstBar,lastBar:section.lastBar,heads:svg.querySelectorAll('[data-viewer-seat]').length,viewBox:svg.getAttribute('viewBox'),width:r.width,height:r.height});}
   window.practice=view;if(JSON.stringify(p)!==original)throw Error('Viewer changed fixture source');return samples;
  },p);
  assert.deepEqual(errors,[]);assert.deepEqual(observed.map(s=>[s.start,s.end]),planning.sections.map(s=>[s.start,s.end]));assert.equal(JSON.stringify(p),before);
  receipt.cases.push({name,notes:p.score.notes.length,onsets:planning.onsets.length,timeSignatures:p.score.timeSignatures,sections:planning.sections,observed,sourceUnchanged:true});await page.screenshot({path:output+'/'+name+'.png'});await page.evaluate(()=>practice.close());await page.close();
 }
 assert.deepEqual(receipt.cases.find(c=>c.name==='weak-uniform').sections.map(s=>s.onsetCount),receipt.cases.find(c=>c.name==='dense-chords').sections.map(s=>s.onsetCount));receipt.status='passed';console.log(JSON.stringify(receipt));
}catch(e){receipt.status='failed';receipt.error=e.stack;throw e;}
finally{await writeFile(output+'/receipt.json',JSON.stringify(receipt,null,2));await browser?.close();await vite?.close();if(server.listening)await new Promise(r=>server.close(r));}
