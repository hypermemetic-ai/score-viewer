// Production PracticeView in Chromium: Fingers, as the practice menu opens it,
// on the whole of a bundled review score. Chromium layout is source evidence, not installed WebView or
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
 browser=await chromium.launch({headless:true,executablePath:process.env.PRACTICE_CHROMIUM});
 const bytes=await readFile('fixtures/schumann-op68-no14.tuna');
 const page=await (await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:2})).newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/__fit');
 await page.evaluate(async encoded=>{
  const [{PracticeView},{importPackage},{initialPersonal,collectionId,corrected}]=await Promise.all([import('/src/practice-view.ts'),import('/src/package.ts'),import('/src/state.ts')]);
  const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));let p=await importPackage(bytes,{allowLegacyTempo:true});
  if(!p.score.referencePerformanceTempo){const {addReferencePerformanceTempo}=await import('/src/reference-tempo-update.ts');p=(await addReferencePerformanceTempo(bytes,{version:'reference-performance-tempo-v1',bpm:180,beat:{numerator:3,denominator:8},provenance:{kind:'editorial',reference:'Isolated section-fingering inspection clock'}})).after;}
  // Start with no fingers, as a newly imported score does, so every note is a gap to fill.
  p={...p,fingerLayer:p.fingerLayer&&{...p.fingerLayer,attacks:p.fingerLayer.attacks.map(({finger,...a})=>a)}};
  await document.fonts.load('700 20px "URW Gothic"');await document.fonts.ready;window.saved=[];
  // The score's editor stands in: save, then hand the view its new state.
  const options={package:p,personal:initialPersonal(p),entryId:collectionId(p),fingersOnly:true,connected:()=>false,source:()=>'',connect:async()=>{},disconnect:async()=>{},back:()=>{window.backs++;},settings:()=>{},
   saveFinger:async(seat,finger)=>{window.saved.push([seat.id,finger]);practice.options.personal=corrected(p,practice.options.personal,seat,finger);practice.refit();},
   // A hand choice rebuilds practice from its context, as main.ts does.
   saveHand:async(seat,hand)=>{window.hands.push([seat.id,hand]);const context=practice.contextSnapshot(),personal=practice.options.personal;practice.close();practice=window.practice=new PracticeView(document.querySelector('#app'),{...options,personal});await practice.mount(context);}};
  window.hands=[];window.backs=0;window.reopen=async()=>{practice.close();practice=window.practice=new PracticeView(document.querySelector('#app'),{...options,personal:practice.options.personal});await practice.mount();};let practice=window.practice=new PracticeView(document.querySelector('#app'),options);
  await practice.mount();
 },bytes.toString('base64'));
 // This harness has no application key listener; keys go to the view as main.ts routes them.
 const press=code=>page.evaluate(k=>practice.key(k),code);
 const state=()=>page.evaluate(()=>({status:document.querySelector('.section-fingering-status').textContent,selected:[...document.querySelectorAll('.section-fingering [data-edit-selected=true]')].map(e=>e.dataset.viewerSeat),bars:[...document.querySelectorAll('.section-fingering [data-practice-bar]')].map(g=>g.dataset.practiceBar+(g.classList.contains('section-fingering-ghost')?'g':'')).join(' ')}));
 // The current measure sits exactly at the centre of the stage, its neighbours in full either side.
 const centring=()=>page.evaluate(()=>{const svg=document.querySelector('.section-fingering-stage svg'),stage=document.querySelector('.section-fingering-stage').getBoundingClientRect(),bar=Number(/measure (\d+)/.exec(document.querySelector('.section-fingering-status').textContent)[1]),ctm=svg.getScreenCTM(),x=v=>ctm.a*v+ctm.e;
  const span=b=>svg.querySelector(`[data-practice-bar="${b}"]`)?.dataset.span?.split(' ').map(Number),[l,r]=span(bar),prev=span(bar-1),next=span(bar+1);
  return {off:x((l+r)/2)-(stage.left+stage.width/2),prevIn:!prev||x(prev[0])>=stage.left-.5,nextIn:!next||x(next[1])<=stage.right+.5,scale:ctm.a};});
 // Fingers opens the whole piece straight away, at the beginning of an unfingered score: no section, no tempo.
 await page.waitForSelector('.section-fingering:not([hidden]) svg');
 const opened=await state();console.log('opened',opened);assert.equal(opened.selected.length,1);assert.match(opened.status,/^RH · measure 1 of 64 · \d+ notes without a finger$/);
 assert.equal(await page.textContent('[data-practice-range]'),'Fingers');assert.equal(await page.evaluate(()=>window.practice.optionsMarkup()),'','Fingers has no practice settings');assert.match(await page.textContent('[data-fingering-progress]'),/^0% fingered · right hand 0% · left hand 0%$/);
 assert.equal(await page.locator('.practice-study,[data-practice^="study:"]').count(),0);
 await page.screenshot({path:output+'/2-opened.png'});
 // Every measure, PgDn by PgDn: centred to the pixel, neighbours on the stage. The width is
 // the piece's widest window; only a taller passage than any before may shrink the notation, never grow it back.
 const scales=[];for(let i=0;i<64;i++){const c=await centring();assert.ok(Math.abs(c.off)<.5&&c.prevIn&&c.nextIn,JSON.stringify(c));if(scales.at(-1)?.[0]!==c.scale)scales.push([c.scale,i+1]);if(i<63)await press('PageDown');}
 assert.match((await state()).status,/measure 64 of 64/);console.log('sizes',JSON.stringify(scales));assert.ok(scales.every((s,i)=>!i||s[0]<scales[i-1][0]),'never grows back');await press('Home');
 for(const code of ['Digit1','Digit2','Digit3'])await press(code);
 console.log('typed',await state(),await page.evaluate(()=>saved));assert.equal(await page.evaluate(()=>saved.length),3);
 // Tab goes to the next note without a finger, Shift+Tab to the one before; neither lands on a fingered note.
 const fingered=()=>page.evaluate(()=>saved.map(s=>s[0]));
 await press('Tab');assert.ok(!(await fingered()).includes((await state()).selected[0]));
 await page.evaluate(()=>practice.key('Tab',false,true));assert.ok(!(await fingered()).includes((await state()).selected[0]));
 // Jump straight back to the second note typed and correct it.
 // Esc with labels showing puts them away and keeps the stage.
 await press('KeyJ');await press('Escape');assert.equal(await page.evaluate(()=>document.querySelectorAll('.section-fingering-label').length),0);assert.ok(await page.isVisible('.section-fingering'));
 // Shift alone keeps the labels; a key the labels do not use puts them away and says where the cursor is.
 const labelCount=()=>page.evaluate(()=>document.querySelectorAll('.section-fingering-label').length);
 await press('KeyJ');await press('ShiftLeft');assert.ok(await labelCount()>0);await press('Comma');assert.equal(await labelCount(),0);assert.match((await state()).status,/^RH · measure /);
 await press('KeyJ');await page.screenshot({path:output+'/3-jump-labels.png'});
 const target=await page.evaluate(()=>saved[1][0]),label=await page.getAttribute(`[data-jump-seat="${target}"]`,'data-jump-label');
 for(const letter of label)await press('Key'+letter.toUpperCase());
 assert.deepEqual((await state()).selected,[target]);
 await press('Digit4');assert.deepEqual(await page.evaluate(()=>saved.at(-1)),[target,4]);
 assert.equal(await page.evaluate(t=>document.querySelector(`.section-fingering [data-finger-seat="${t}"]`)?.textContent,target),'4');
 await page.screenshot({path:output+'/4-corrected.png'});
 // A correction, too, moves on to the next note still without a finger.
 assert.ok(!(await fingered()).includes((await state()).selected[0]));
 await press('ArrowDown');const left=await state();console.log('left',left);assert.match(left.status,/^LH · /);
 await press('ArrowUp');const up=await state();console.log('up',up);assert.match(up.status,/^RH · /);
 // Walk the right hand into measure 3: the window slides with it.
 let walked=await state();
 for(let i=0;i<40&&!/measure 3/.test(walked.status);i++){await press('ArrowRight');walked=await state();}
 console.log('slid',walked);assert.match(walked.status,/measure 3/);
 await page.screenshot({path:output+'/5-slid.png'});
 // A resize recomposes the window; a save only repaints it.
 await page.evaluate(()=>document.querySelector('.section-fingering-stage svg').dataset.earlier='1');await page.setViewportSize({width:1000,height:720});await page.evaluate(()=>practice.refit());
 assert.equal(await page.evaluate(()=>!!document.querySelector('.section-fingering-stage svg[data-earlier]')),false);await page.screenshot({path:output+'/6-narrower.png'});await page.setViewportSize({width:1280,height:720});await page.evaluate(()=>practice.refit());
 // Labels showing, R still chooses the hand: the labels go away and the key does its work.
 const before=await state();await press('KeyJ');await press('KeyR');assert.equal(await page.evaluate(()=>document.querySelectorAll('.section-fingering-label').length),0);await page.waitForFunction(()=>hands.length===1&&document.querySelector('.section-fingering:not([hidden]) svg'));
 const rebuilt=await state();console.log('rebuilt',rebuilt);assert.deepEqual(rebuilt.selected,before.selected);assert.equal(rebuilt.status,before.status);
 // Esc leaves Fingers for the score.
 await press('Escape');assert.equal(await page.evaluate(()=>backs),1);
 // Reopening resumes at the first note still without a finger, and says so.
 await page.evaluate(()=>reopen());await page.waitForSelector('.section-fingering:not([hidden]) svg');
 const reopened=await state();console.log('reopened',reopened);assert.match(reopened.status,/^[RL]H · measure 1 of 64 · /,'Reopening says where the cursor is, without narrating it');assert.ok(!(await fingered()).includes(reopened.selected[0]));
 assert.match(await page.textContent('[data-fingering-progress]'),/^[1-9]\d?% fingered/);
 // Every measure is reachable, to the end of the piece.
 await press('End');const end=await state();console.log('end',end);assert.match(end.status,/^(?:Left|Right) hand · measure \d+ of 64/);
 await page.screenshot({path:output+'/7-end.png'});await press('Escape');assert.equal(await page.evaluate(()=>backs),2);
 assert.deepEqual(errors,[]);console.log('ok',output);
}finally{await browser?.close();await vite?.close();server.close();}
