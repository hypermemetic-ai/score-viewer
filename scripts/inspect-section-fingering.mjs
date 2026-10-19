// Production PracticeView in Chromium: the Fingering study mode on a bundled
// review score. Chromium layout is source evidence, not installed WebView or
// human musical acceptance.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer as createViteServer} from 'vite';
const {chromium}=await import(process.env.PRACTICE_PLAYWRIGHT??'playwright-core');
const root=resolve('.'),output=process.env.PRACTICE_ARTIFACTS??'/tmp/score-viewer-section-fingering',errors=[];
await mkdir(output,{recursive:true});
let vite,browser;
const server=createServer((req,res)=>{if(req.url==='/__fit'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><main id="app"></main><script type="module">import "/src/style.css";</script>');return;}vite.middlewares(req,res);});
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));vite=await createViteServer({root,configFile:root+'/vite.config.ts',server:{middlewareMode:true,hmr:false,ws:{server,clientPort:server.address().port,host:'127.0.0.1'}},appType:'custom'});
 browser=await chromium.launch({headless:true});
 const bytes=await readFile('vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.tuna');
 const page=await (await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:2})).newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/__fit');
 await page.evaluate(async encoded=>{
  const [{PracticeView},{importPackage},{initialPersonal,collectionId,corrected}]=await Promise.all([import('/src/practice-view.ts'),import('/src/package.ts'),import('/src/state.ts')]);
  const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));let p=await importPackage(bytes,{allowLegacyTempo:true});
  if(!p.score.referencePerformanceTempo){const {addReferencePerformanceTempo}=await import('/src/reference-tempo-update.ts');p=(await addReferencePerformanceTempo(bytes,{version:'reference-performance-tempo-v1',bpm:180,beat:{numerator:3,denominator:8},provenance:{kind:'editorial',reference:'Isolated section-fingering inspection clock'}})).after;}
  await document.fonts.load('700 20px "URW Gothic"');await document.fonts.ready;window.saved=[];
  // The score's editor stands in: save, then hand the view its new state.
  const options={package:p,personal:initialPersonal(p),entryId:collectionId(p),connected:()=>false,source:()=>'',connect:async()=>{},disconnect:async()=>{},back:()=>{},settings:()=>{},changed:()=>{},
   saveFinger:async(seat,finger)=>{window.saved.push([seat.id,finger]);practice.options.personal=corrected(p,practice.options.personal,seat,finger);practice.refit();},
   // A hand choice rebuilds practice from its context, as main.ts does.
   saveHand:async(seat,hand)=>{window.hands.push([seat.id,hand]);const context=practice.contextSnapshot(),personal=practice.options.personal;practice.close();practice=window.practice=new PracticeView(document.querySelector('#app'),{...options,personal});await practice.mount(context);}};
  window.hands=[];let practice=window.practice=new PracticeView(document.querySelector('#app'),options);
  await practice.mount();
 },bytes.toString('base64'));
 // This harness has no application key listener; keys go to the view as main.ts routes them.
 const press=code=>page.evaluate(k=>practice.key(k),code);
 const state=()=>page.evaluate(()=>({status:document.querySelector('.section-fingering-status').textContent,selected:[...document.querySelectorAll('.section-fingering [data-edit-selected=true]')].map(e=>e.dataset.viewerSeat),bars:[...document.querySelectorAll('.section-fingering [data-practice-bar]')].map(g=>g.dataset.practiceBar+(g.classList.contains('section-fingering-ghost')?'g':g.classList.contains('section-fingering-outside')?'o':'')).join(' ')}));
 await page.click('[data-practice="study:fingers"]');
 assert.equal(await page.getAttribute('[data-practice="study:fingers"]','aria-pressed'),'true');
 assert.ok(await page.isDisabled('[data-practice="study:memory"]'));
 assert.match(await page.textContent('.practice-overview [data-practice^="passage:"]'),/^Finger /);
 await page.screenshot({path:output+'/1-selector.png'});
 await page.click('.practice-overview [data-practice^="passage:"]');
 await page.waitForSelector('.section-fingering:not([hidden]) svg');
 const opened=await state();console.log('opened',opened);assert.equal(opened.selected.length,1);assert.match(opened.status,/^Right hand · measure 1 · note 1 of/);
 await page.screenshot({path:output+'/2-opened.png'});
 for(const code of ['Digit1','Digit2','Digit3'])await press(code);
 console.log('typed',await state(),await page.evaluate(()=>saved));assert.equal(await page.evaluate(()=>saved.length),3);
 // Jump straight back to the second note typed and correct it.
 await press('KeyJ');await page.screenshot({path:output+'/3-jump-labels.png'});
 const target=await page.evaluate(()=>saved[1][0]),label=await page.getAttribute(`[data-jump-seat="${target}"]`,'data-jump-label');
 for(const letter of label)await press('Key'+letter.toUpperCase());
 assert.deepEqual((await state()).selected,[target]);
 await press('Digit4');assert.deepEqual(await page.evaluate(()=>saved.at(-1)),[target,4]);
 assert.equal(await page.evaluate(t=>document.querySelector(`.section-fingering [data-finger-seat="${t}"]`)?.textContent,target),'4');
 await page.screenshot({path:output+'/4-corrected.png'});
 await press('Backspace');assert.deepEqual((await state()).selected,[target]);
 await press('KeyH');const left=await state();console.log('left',left);assert.match(left.status,/^Left hand/);
 await press('ArrowUp');console.log('above',await state());
 // Walk the right hand into measure 3: the window slides with it.
 await press('KeyH');let walked=await state();
 for(let i=0;i<40&&!/measure 3/.test(walked.status);i++){await press('ArrowRight');walked=await state();}
 console.log('slid',walked);assert.match(walked.status,/measure 3/);
 await page.screenshot({path:output+'/5-slid.png'});
 const before=await state();await press('KeyR');await page.waitForFunction(()=>hands.length===1&&document.querySelector('.section-fingering:not([hidden]) svg'));
 const rebuilt=await state();console.log('rebuilt',rebuilt);assert.deepEqual(rebuilt.selected,before.selected);assert.equal(rebuilt.status,before.status);
 await press('Escape');assert.ok(await page.isVisible('.practice-overview'));assert.ok(await page.isHidden('.section-fingering'));
 await page.click('[data-practice="study:mechanics"]');assert.match(await page.textContent('.practice-overview [data-practice^="passage:"]'),/^Practice /);
 assert.deepEqual(errors,[]);console.log('ok',output);
}finally{await browser?.close();await vite?.close();server.close();}
