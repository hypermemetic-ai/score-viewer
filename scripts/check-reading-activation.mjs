// Actual built-main cancellation/supersession at each activation prerequisite.
// The clock/read cases simulate only the existing native IPC host boundary;
// all admission, controllers, operation ownership and UI are production code.
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {prepareDualReadingPacket} from '../src/dual-reading-package.ts';
import {authoredFrettedInput} from '../test/support/fretted-dual-fixture.ts';
import {collectionId} from '../src/state.ts';
import {ReadingPresentationController} from '../src/reading-presentation.ts';
import {physicalManagedName} from '../src/managed-file-storage.ts';

const {chromium}=await import(process.env.PRACTICE_PLAYWRIGHT??'playwright-core');
const root=resolve('dist'),out=process.env.READING_ACTIVATION_ARTIFACTS??'/tmp/score-viewer-reading-activation';
await mkdir(out,{recursive:true});
const records=[];
for(const [suffix,title] of [['a','Retained first part'],['b','Pending second part']]){
 const input=authoredFrettedInput();input.score.id+='-'+suffix;input.score.title=title;input.metadata.title=title;
 const packet=await prepareDualReadingPacket(input),sha=createHash('sha256').update(packet.bytes).digest('hex'),
  entry={id:collectionId(packet.package),file:`package-${sha}.tuna`,metadata:packet.package.manifest.metadata,importedAt:'2026-10-09T00:00:00Z'},
  presentation=await ReadingPresentationController.open(packet.package);
 records.push({entry,archive:Buffer.from(packet.bytes).toString('base64'),viewFile:await physicalManagedName(presentation.storageName)});
}
const csp=JSON.parse(await readFile('src-tauri/tauri.conf.json','utf8')).app.security.csp;
const report={sourceMainSha256:createHash('sha256').update(await readFile('src/main.ts')).digest('hex'),checks:[],cases:[],observations:[],errors:[],scope:'Built production main with original authored packets and isolated browser storage; native read/clock cases simulate only IPC, no desktop/native acceptance or performance timing.'};
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(path!==root&&!path.startsWith(root+'/'))throw Error('outside');const file=path===root?join(root,'index.html'):path;res.setHeader('Content-Security-Policy',csp);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.otf':'font/otf','.ttf':'font/ttf'}[extname(file)]??'application/octet-stream'));res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
let browser;
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true});
 for(const boundary of ['controller','view-key','view-read','midi-clock','fullscreen'])for(const disposition of ['cancel','supersede']){
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
  await page.addInitScript(({records,boundary})=>{
   const encode=value=>btoa(unescape(encodeURIComponent(JSON.stringify(value))));
   localStorage.setItem('iso-viewer-dev/library.json',encode({version:1,entries:records.map(r=>r.entry)}));
   localStorage.setItem('iso-viewer-dev/preferences.json',encode({version:1,libraryRotation:0,lastWorkedEntryId:records[0].entry.id}));
   for(const r of records)localStorage.setItem('iso-viewer-dev/'+r.entry.file,r.archive);
   window.__activationArm=false;window.__activationHeld=false;window.__activationCalls=[];window.__activationTrace=[];window.__preferenceWrites=[];
   const hold=actual=>{window.__activationTrace.push({stage:'hold',dialog:document.querySelector('dialog')?.dataset.kind,job:document.querySelector('dialog .job')?.textContent});window.__activationArm=false;window.__activationHeld=true;return new Promise((resolve,reject)=>{window.__releaseActivation=()=>Promise.resolve(actual).then(resolve,reject);});};
   const digest=SubtleCrypto.prototype.digest;
   SubtleCrypto.prototype.digest=function(algorithm,data){const actual=digest.call(this,algorithm,data),bytes=ArrayBuffer.isView(data)?new Uint8Array(data.buffer,data.byteOffset,data.byteLength):new Uint8Array(data),text=new TextDecoder().decode(bytes);
    if(window.__activationArm&&((boundary==='controller'&&text.startsWith('{')&&JSON.parse(text).version==='musical-manual-practice-v1')||(boundary==='view-key'&&text.startsWith('manual-reading-view-v1-')))){window.__activationTrace.push({digest:text.slice(0,300)});return hold(actual);}return actual;
   };
   if(['view-read','midi-clock','fullscreen'].includes(boundary)){
    window.isTauri=true;let callback=0;window.__TAURI_INTERNALS__={metadata:{currentWindow:{label:'main'},currentWebview:{label:'main'}},transformCallback:()=>++callback,unregisterCallback:()=>{},invoke:async(cmd,args={})=>{
     window.__activationCalls.push({cmd,args});
     if(cmd==='read_managed'){const result=localStorage.getItem('iso-viewer-dev/'+args.name);return window.__activationArm&&boundary==='view-read'&&args.name===records[1].viewFile?hold(result):result;}
     if(cmd==='write_managed'){if(args.name==='preferences.json')window.__preferenceWrites.push(JSON.parse(decodeURIComponent(escape(atob(args.data)))));localStorage.setItem('iso-viewer-dev/'+args.name,args.data);return;}
     if(cmd==='midi_clock')return window.__activationArm&&boundary==='midi-clock'?hold(performance.now()*1000):performance.now()*1000;
     if(cmd==='plugin:window|set_fullscreen'&&window.__activationArm&&boundary==='fullscreen')return hold(null);
     if(cmd==='midi_sources')return {supported:false,sources:[],message:''};
     if(cmd==='plugin:event|listen')return ++callback;return null;
    }};
   }
  },{records,boundary});
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('.library').waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('[data-open] small')].every(field=>field.textContent.includes('Sections')),{timeout:30000});
  const before=await page.evaluate(()=>({storage:Object.fromEntries(Object.entries(localStorage)),selected:document.querySelector('[data-library-row][data-selected=true]')?.getAttribute('data-library-row')}));
  await page.evaluate(()=>window.__activationArm=true);await page.locator(`[data-open="${records[1].entry.id}"]`).click();await page.waitForFunction(()=>window.__activationHeld,{timeout:30000});
  assert.equal(await page.locator('.reader').count(),0,'No reader before final prerequisite');before.selected=await page.locator('[data-library-row][data-selected=true]').getAttribute('data-library-row');await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'detached'});report.observations.push(await page.evaluate(()=>({trace:window.__activationTrace,afterEscape:{reader:!!document.querySelector('.reader'),library:!!document.querySelector('.library'),prefs:localStorage.getItem('iso-viewer-dev/preferences.json')}})));
  if(disposition==='supersede'){
   await page.locator(`[data-open="${records[0].entry.id}"]`).click();await page.locator('dialog[data-kind=score-reading]').waitFor();
  }
  await page.evaluate(()=>window.__releaseActivation());
  if(disposition==='cancel'){
   await page.waitForTimeout(180);report.observations.push(await page.evaluate(()=>({afterRelease:{reader:!!document.querySelector('.reader'),library:!!document.querySelector('.library'),prefs:localStorage.getItem('iso-viewer-dev/preferences.json'),toast:document.querySelector('.toast')?.textContent}})));assert.equal(await page.locator('.reader').count(),0);assert.equal(await page.locator('.library').count(),1);
   assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),before.storage,'Canceled activation retains all managed bytes');
   assert.equal(await page.locator('[data-library-row][data-selected=true]').getAttribute('data-library-row'),before.selected,'Canceled activation retains selected row');
  }else{
   await page.locator('.reader').waitFor({timeout:30000});await page.locator('dialog').waitFor({state:'detached'});await page.waitForTimeout(180);
   const after=await page.evaluate(()=>({prefs:JSON.parse(decodeURIComponent(escape(atob(localStorage.getItem('iso-viewer-dev/preferences.json'))))),storage:Object.fromEntries(Object.entries(localStorage)),writes:window.__preferenceWrites}));
   assert.equal(after.prefs.lastWorkedEntryId,records[0].entry.id);assert.ok(after.writes.every(p=>p.lastWorkedEntryId===records[0].entry.id));
   for(const [name,bytes]of Object.entries(before.storage))if(!name.endsWith('/preferences.json'))assert.equal(after.storage[name],bytes,'Superseding open retains library/archives');
   await page.locator('.reader').focus();await page.keyboard.press('Tab');assert.equal(await page.locator('[data-options-key=readingNotation]').count(),1);
   await page.locator('.reader').focus();await page.keyboard.press('Escape');await page.locator('.library').waitFor();assert.equal(await page.locator('[data-library-row][data-selected=true]').getAttribute('data-library-row'),`score:${records[0].entry.id}`);
  }
  report.checks.push(`${boundary}: ${disposition} retains initiating-operation ownership through final activation`);report.cases.push({boundary,disposition,originalArchivesExact:true,oldSelectionNotPublished:true});console.log(report.checks.at(-1));await context.close();
 }
 assert.deepEqual(report.errors,[]);
}catch(error){report.error=error.stack;throw error;}finally{await writeFile(join(out,'receipt.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();await new Promise(r=>server.close(r));}
