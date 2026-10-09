// Production SVG/layout regression; no acquired score or personal state is stored here.
// PRACTICE_ZELDA optionally adds the operator's read-only archive to the same checks.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createServer as createViteServer} from 'vite';
const {chromium}=await import(process.env.PRACTICE_PLAYWRIGHT??'playwright-core');
const root=resolve('.'),output=process.env.PRACTICE_ARTIFACTS??'/tmp/score-viewer-selector-fit',receipt={source:'production PracticeView.mount and browser SVG geometry',cases:[],errors:[],limits:['Chromium layout is source evidence, not installed WebView or physical musical acceptance.']};
await mkdir(output,{recursive:true});
let vite,browser;
const server=createServer((req,res)=>{if(req.url==='/__fit'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><main id="app"></main><script type="module">import "/src/style.css";</script>');return;}vite.middlewares(req,res,()=>{res.writeHead(404);res.end();});});
const inputs=[{name:'schumann-janko',keyboard:'janko-four-row',path:'vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.isoscore'},
 {name:'schumann-conventional',keyboard:'conventional-piano',path:'vendor/iso-notation/public/review/schumann-no14-conventional-actions-20261007.isoscore'}];
if(process.env.PRACTICE_ZELDA)for(const keyboard of ['janko-four-row','conventional-piano'])inputs.push({name:'zelda-'+keyboard,path:process.env.PRACTICE_ZELDA,keyboard,pedal:true});
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));vite=await createViteServer({root,configFile:root+'/vite.config.ts',server:{middlewareMode:true,hmr:false,ws:{server,clientPort:server.address().port,host:'127.0.0.1'}},appType:'custom'});
 browser=await chromium.launch({headless:true});
 for(const input of inputs){
  const bytes=await readFile(input.path),context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:3}),page=await context.newPage();page.on('pageerror',e=>receipt.errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/__fit');
  await page.evaluate(async({encoded,keyboard})=>{
   const [{PracticeView},{importPackage,selectPresentation},{initialPersonal,collectionId}]=await Promise.all([import('/src/practice-view.ts'),import('/src/package.ts'),import('/src/state.ts')]);
   const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));let p=await importPackage(bytes,{allowLegacyTempo:true});
   if(!p.score.referencePerformanceTempo){const {addReferencePerformanceTempo}=await import('/src/reference-tempo-update.ts');p=(await addReferencePerformanceTempo(bytes,{version:'reference-performance-tempo-v1',bpm:180,beat:{numerator:3,denominator:8},provenance:{kind:'editorial',reference:'Isolated selector-fit regression clock'}})).after;}
   if(keyboard)p=await selectPresentation(p,keyboard);
   // The production library/reader has already loaded this shared UI face.
   await document.fonts.load('700 20px "URW Gothic"');await document.fonts.ready;window.rotation=0;window.pkg=p;window.mountCalls=[];
   const original=PracticeView.prototype.paintBrowser;PracticeView.prototype.paintBrowser=function(...args){const result=original.apply(this,args);window.mountCalls.push({footerHeight:document.querySelector('.practice-controls').clientHeight,overviewHeight:document.querySelector('.practice-overview').clientHeight});return result;};
   window.practice=new PracticeView(document.querySelector('#app'),{package:p,personal:initialPersonal(p),rotation:()=>window.rotation,entryId:collectionId(p),connected:()=>false,source:()=>'',connect:async()=>{},disconnect:async()=>{},back:()=>{},settings:()=>{},changed:()=>{}});
   await window.practice.mount();
  },{encoded:bytes.toString('base64'),keyboard:input.keyboard});
  const keyboard=await page.evaluate(()=>pkg.keyboardLayout);assert.equal(keyboard,input.keyboard);const samples=[];receipt.cases.push({name:input.name,keyboard,archiveSha256:createHash('sha256').update(bytes).digest('hex'),samples});
  const sample=async(name,pedal=false)=>{
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const result=await page.evaluate(()=>{
    const overview=document.querySelector('.practice-overview'),leaf=document.querySelector('.practice-leaf-preview'),svg=leaf.querySelector(':scope>svg'),rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    if(!svg)throw Error(document.querySelector('.practice-render-error')?.textContent??'No complete preview');
    const bounds=rect(svg),viewBox=svg.getAttribute('viewBox'),inverse=svg.getScreenCTM().inverse(),outer=svg.getScreenCTM(),box=(x,y,width,height,matrix)=>{const points=[[x,y],[x+width,y],[x,y+height],[x+width,y+height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(matrix));return {left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};};
    // Crop clones retain source paths outside their horizontal interval. Check
    // only that interval, without clipping the pedal's vertical ink to hide it.
    const pedals=[...svg.querySelectorAll('.janko-pedal-start,.janko-pedal')].flatMap(el=>{const crop=el.closest('svg'),v=crop.viewBox.baseVal,c=box(v.x,v.y,v.width,v.height,inverse.multiply(crop.getScreenCTM())),b=el.getBBox(),p=box(b.x,b.y,b.width,b.height,inverse.multiply(el.getScreenCTM())),left=Math.max(c.left,p.left),right=Math.min(c.right,p.right);if(right<=left)return [];return [{kind:el.getAttribute('class'),bounds:box(left,p.top,right-left,p.bottom-p.top,outer)}];});
    return {overview:{...rect(overview),clientHeight:overview.clientHeight,scrollHeight:overview.scrollHeight,clientWidth:overview.clientWidth,scrollWidth:overview.scrollWidth},leaf:rect(leaf),svg:bounds,viewBox,pedals,selected:document.querySelector('[data-passage-id][tabindex="0"]')?.dataset.passageId,mountCalls:window.mountCalls};
   });
   result.name=name;samples.push(result);
   assert.ok(result.overview.scrollHeight<=result.overview.clientHeight+1,name+': no vertical overview overflow');
   assert.ok(result.overview.scrollWidth<=result.overview.clientWidth+1,name+': no horizontal overview overflow');
   assert.ok(result.svg.top>=result.overview.top-1&&result.svg.bottom<=result.overview.bottom+1&&result.svg.left>=result.overview.left-1&&result.svg.right<=result.overview.right+1,name+': complete SVG inside overview');
   if(pedal)assert.ok(result.pedals.some(p=>p.kind==='janko-pedal-start'),name+': complete pedal press annotation exists');
   for(const p of result.pedals)assert.ok(p.bounds.left>=result.svg.left-1&&p.bounds.right<=result.svg.right+1&&p.bounds.top>=result.svg.top-1&&p.bounds.bottom<=result.svg.bottom+1,name+': all pedal ink inside complete SVG');
   await page.screenshot({path:output+'/'+input.name+'-'+name+'.png'});return result;
  };
  const first=await sample('initial-1-4',input.pedal);assert.equal(first.selected,'1-4');assert.ok(first.mountCalls.length>0&&first.mountCalls.every(call=>call.footerHeight>0),'Every initial fit has a footer allocation');
  await page.evaluate(()=>{practice.key('ArrowDown');practice.key('ArrowUp');});const returned=await sample('returned-1-4',input.pedal);const a=first.viewBox.split(' ').map(Number),b=returned.viewBox.split(' ').map(Number);assert.ok(a.every((n,i)=>Math.abs(n-b[i])<1e-8),'Source viewBox stays unchanged within matrix precision');assert.ok(Math.abs(returned.svg.height-first.svg.height)<.1,'Initial and returned fits agree without moving source ink');
  await page.evaluate(async()=>{await practice.action('passage:1-4');practice.pause();await practice.action('overview');});await sample('returned-from-free-view',input.pedal);
  for(const id of ['17-20','25-29'])if(await page.evaluate(id=>practice.plan.chunks.some(c=>c.id===id),id)){await page.evaluate(id=>practice.action('select:'+id),id);await sample('leaf-'+id);}
  await page.evaluate(()=>practice.action('select:1-4'));
  for(const rotation of [90,270]){await page.evaluate(rotation=>{window.rotation=rotation;practice.refit();},rotation);await sample('rotation-'+rotation,input.pedal);}
  await page.evaluate(()=>{window.rotation=0;practice.refit();});await page.setViewportSize({width:1280,height:540});await sample('shorter-window',input.pedal);
  await page.evaluate(()=>practice.close());await context.close();console.log(input.name+': initial/footer/return/leaf/rotation/short-window pass');
 }
 assert.deepEqual(receipt.errors,[]);receipt.status='passed';
}catch(error){receipt.status='failed';receipt.error=error.stack;throw error;}
finally{await writeFile(output+'/receipt.json',JSON.stringify(receipt,null,2));await browser?.close();await vite?.close();if(server.listening)await new Promise(r=>server.close(r));}
