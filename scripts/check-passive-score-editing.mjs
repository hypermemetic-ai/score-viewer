// Run after npm run build, with node --import tsx, inside qq-job.
// Production main/engraving/keyboard dispatch; only native IPC is simulated.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {hostname} from 'node:os';
import {execFileSync} from 'node:child_process';
import {importPackage,selectPresentation} from '../src/package.ts';
import {collectionId,initialPersonal,personalStorageName,performanceStorageName} from '../src/state.ts';
import {physicalManagedName} from '../src/managed-file-storage.ts';
import {systemSelection} from '../src/selection.ts';
import {readControlBindings} from '../src/control-bindings.ts';
import {defaultBindings} from '../src/input.ts';
import {sourcePackage,calculatedStudy,completeTieBoundaryStudy} from '../test/support/hand-edition-fixture.ts';
const {chromium}=await import(process.env.PRACTICE_PLAYWRIGHT??'playwright-core');
const root=resolve('dist'),out=process.env.PASSIVE_EDIT_ARTIFACTS??'/tmp/score-viewer-passive-score-editing';
await mkdir(out,{recursive:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),report={host:hostname(),platform:process.platform,node:process.version,viewport:{width:1440,height:900},sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceMainSha256:sha(await readFile('src/main.ts')),cases:[],errors:[],limits:['Production frontend in headless Chromium with isolated memory/localStorage and simulated native IPC/MIDI. No managed user data, physical MIDI/pedal, audible piano or installed native acceptance.']};
report.frontend=[];for(const match of (await readFile(join(root,'index.html'),'utf8')).matchAll(/(?:src|href)="([^"]+)"/g))if(match[1].startsWith('./assets/')){const bytes=await readFile(join(root,match[1]));report.frontend.push({file:match[1],bytes:bytes.length,sha256:sha(bytes)});}
const csp=JSON.parse(await readFile('src-tauri/tauri.conf.json','utf8')).app.security.csp;
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(path!==root&&!path.startsWith(root+'/'))throw Error('outside');const file=path===root?join(root,'index.html'):path;res.setHeader('Content-Security-Policy',csp);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.otf':'font/otf','.ttf':'font/ttf'}[extname(file)]??'application/octet-stream'));res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
let browser;
try{
 const no14Bytes=await readFile('vendor/iso-notation/public/review/schumann-no14-conventional-20261006.tuna'),no14=await importPackage(no14Bytes),inputs=[];
 const tied=completeTieBoundaryStudy(3,'RH');tied.id='viewer-passive-continuation';tied.title='Passive continuation navigation';
 const base=await sourcePackage(tied,{measuresPerSystem:1,systemsPerPage:1,pageWidth:255});
 for(const keyboard of ['conventional-piano','janko-four-row']){
  inputs.push({name:'no14-'+keyboard,keyboard,bytes:no14Bytes,p:await selectPresentation(no14,keyboard),practice:true});
  const generated=await calculatedStudy(base.p,keyboard,Object.fromEntries(tied.notes.map(n=>[n.id,n.id==='following-attack'?'RH':n.hand])));inputs.push({name:'continuation-'+keyboard,keyboard,bytes:generated.bytes,p:generated.p,continuation:true});
 }
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,...(process.env.PRACTICE_CHROMIUM?{executablePath:process.env.PRACTICE_CHROMIUM}:{})});report.chromium=browser.version();
 for(const input of inputs){
  console.log('Opening '+input.name);const {p}=input,entry={id:collectionId(p),file:`package-${sha(input.bytes)}.tuna`,metadata:p.manifest.metadata,importedAt:'2026-10-11T00:00:00Z'},personal=initialPersonal(p);
  const lastSystem=Math.max(...p.seats.filter(s=>s.page===0).map(s=>s.system)),start=(input.continuation?p.seats.find(s=>s.page===0&&s.ownerIds.includes('written-hold')&&!s.continuation):p.seats.find(s=>s.page===0&&s.system===lastSystem&&!s.continuation&&p.score.notes.find(n=>n.id===s.ownerIds[0])?.hand!=='RH'))??p.seats.find(s=>s.page===0),next=systemSelection(p,start,1);
  assert.equal(next.page,1,'Fixture must cross an actual printed page');if(input.continuation)assert.equal(next.continuation,true,'Fixture must target a visible held alias');
  personal.view.page=start.page;personal.view.count=1;personal.editContactId=start.contactId;
  const controlBindings=readControlBindings(undefined,{bindings:defaultBindings()});for(const [action,controller]of [['previous',80],['next',81]])controlBindings.actions[action][1]={kind:'midi',source:'Simulated USB piano',channel:1,controller,press:64,release:32};
  const performanceFile=await physicalManagedName(performanceStorageName(entry.id,p)),historical=JSON.stringify({version:1,revision:p.manifest.revision,best:{}}),seed={
   'library.json':{version:1,entries:[entry]},'preferences.json':{version:1,libraryRotation:0,displayRotation:0,keyboardLayout:input.keyboard,controlBindings,piano:{version:1,enabled:true,volume:.7,latencyTier:0}},
   [await physicalManagedName(personalStorageName(entry.id,p))]:personal,[performanceFile]:JSON.parse(historical),
  };
  const context=await browser.newContext({viewport:report.viewport}),page=await context.newPage(),result={name:input.name,keyboard:input.keyboard,archiveSha256:sha(input.bytes),sourceOwners:p.score.notes.length,pages:p.pages.length,start:{id:start.id,page:start.page,system:start.system},destination:{id:next.id,page:next.page,system:next.system,continuation:!!next.continuation},checks:[],screenshots:[]};report.cases.push(result);page.on('pageerror',error=>report.errors.push({case:input.name,message:error.message}));
  await page.addInitScript(({seed,entry,archive})=>{
   const encode=value=>btoa(unescape(encodeURIComponent(JSON.stringify(value))));for(const [name,value]of Object.entries(seed))localStorage.setItem('iso-viewer-dev/'+name,encode(value));localStorage.setItem('iso-viewer-dev/'+entry.file,archive);
   const callbacks=new Map(),listeners=new Map();let callback=0;window.__passiveCalls=[];window.__passiveMidiCount=0;
   window.__emitMidi=(payload,type='viewer-midi-note')=>{const ids=listeners.get(type)??[];if(!ids.length)throw Error('No production '+type+' listener');for(const id of ids)callbacks.get(id)?.({event:type,id,payload:{timestamp_micros:performance.now()*1000,source:'Simulated USB piano',generation:1,channel:1,velocity:80,filtered:false,...payload}});window.__passiveMidiCount++;};
   window.isTauri=true;window.__TAURI_EVENT_PLUGIN_INTERNALS__={unregisterListener(){}};
   window.__TAURI_INTERNALS__={metadata:{currentWindow:{label:'main'},currentWebview:{label:'main'}},transformCallback(fn){callbacks.set(++callback,fn);return callback;},unregisterCallback(id){callbacks.delete(id);},invoke:async(cmd,args={})=>{
    window.__passiveCalls.push({cmd,args});
    if(cmd==='read_managed')return localStorage.getItem('iso-viewer-dev/'+args.name);
    if(cmd==='write_managed'){localStorage.setItem('iso-viewer-dev/'+args.name,args.data);return;}
    if(cmd==='midi_clock')return performance.now()*1000;if(cmd==='midi_sources')return {supported:true,sources:['Simulated USB piano'],message:''};if(cmd==='midi_connect')return 1;
    if(cmd==='plugin:event|listen'){const ids=listeners.get(args.event)??[];ids.push(args.handler);listeners.set(args.event,ids);return args.handler;}
    if(cmd==='practice_audio_outputs')return {supported:false,outputs:[]};
    if(cmd==='piano_bank_status')return {supported:true,installed:true,phase:'installed',progress:null,message:'',cancellable:false};
    if(cmd==='piano_audio_configure'||cmd==='piano_audio_status')return {enabled:true,ready:true,running:true,device:'Simulated wired output',sampleRate:48000,periodFrames:128,bufferFrames:128,raw:true,mode:'wasapi',fallback:null,error:null,latencyTier:0};
    return null;
   }};
  },{seed,entry,archive:Buffer.from(input.bytes).toString('base64')});
  const capture=async label=>{const file=input.name+'-'+label+'.png';await page.screenshot({path:join(out,file)});result.screenshots.push(file);};
  const snapshot=()=>page.evaluate(async()=>({page:document.querySelector('#app')?.dataset.page,selected:[...document.querySelectorAll('[data-edit-selected]')].map(n=>n.dataset.viewerSeat),live:[...document.querySelectorAll('.practice-note-live')].map(n=>n.dataset.viewerSeat),phase:document.querySelector('#app')?.dataset.practicePhase,mode:document.querySelector('#app')?.dataset.practiceMode,notationSha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(document.querySelector('.reader .page-group,.practice-score,.practice-leaf-preview')?.innerHTML??''))),b=>b.toString(16).padStart(2,'0')).join('')}));
  const storage=()=>page.evaluate(async()=>Object.fromEntries(await Promise.all(Object.entries(localStorage).map(async([name,value])=>[name,Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('')]))));
  const pitches=p.score.notes.slice().sort((a,b)=>a.startTick-b.startTick).map(n=>12*n.pitch.octave+n.pitch.pitchClass+12),send=()=>page.evaluate(pitches=>{for(const note of pitches){window.__emitMidi({note,on:true});window.__emitMidi({note,on:false});}},pitches);
  const passive=async label=>{const before=await snapshot(),stored=await storage();await send();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.deepEqual(await snapshot(),before,label+' input changed visible score');assert.deepEqual(await storage(),stored,label+' input changed stored evidence');result.checks.push(label+' MIDI is passive');};
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('.library').waitFor();await page.locator(`[data-open="${entry.id}"]`).click();await page.locator('.reader').waitFor({timeout:30000}).catch(async error=>{result.failedOpenText=await page.locator('body').innerText();await capture('failed-open');throw error;});console.log(input.name+': reader opened');await page.locator('dialog').waitFor({state:'detached'});await page.evaluate(()=>document.fonts.ready);
  await page.keyboard.press('o');await page.locator('[data-options-section=input-output]').click();await page.locator('[data-options-key=options-midi-source]').click();await page.getByRole('option',{name:'Simulated USB piano',exact:true}).click();await page.locator('[data-midi-connect]').click();await page.waitForFunction(()=>document.querySelector('[data-midi-connect]')?.textContent==='Disconnect');await page.locator('[data-midi-channel-listen]').click();await page.evaluate(()=>{window.__emitMidi({note:60,on:true});window.__emitMidi({note:60,on:false});});assert.equal(await page.locator('[data-midi-channel]').inputValue(),'1');result.checks.push('Options channel detection still consumes diagnostic input');await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-action=performance],[data-performance-start],.performance-hud').count(),0);result.checks.push('Actual reader controls omit full-score Performance');
  await passive('Reader');await capture('reader');await page.locator('.reader').focus();await page.keyboard.press('e');await page.locator(`[data-viewer-seat="${start.id}"][data-edit-selected]`).waitFor();await passive('Editor');await capture('edit-before');
  await page.keyboard.press('ArrowDown');await page.locator(`[data-viewer-seat="${next.id}"][data-edit-selected]`).waitFor();assert.equal(await page.locator('#app').getAttribute('data-page'),String(next.page));assert.equal(await page.locator(':focus').getAttribute('data-viewer-seat'),next.id);result.checks.push('Down from the outer hand crosses printed page, selects closest source-x target and focuses it');await capture('edit-next-page');
  const reverse=systemSelection(p,next,-1);await page.keyboard.press('ArrowUp');await page.locator(`[data-viewer-seat="${reverse.id}"][data-edit-selected]`).waitFor();assert.equal(await page.locator('#app').getAttribute('data-page'),String(reverse.page));result.checks.push('Up returns to the previous hand row');
  await page.keyboard.press('Shift+r');const rotation=await page.locator('#app').getAttribute('data-rotation');assert.equal(rotation,'90');await page.keyboard.press('ArrowDown');await page.locator(`[data-viewer-seat="${next.id}"][data-edit-selected]`).waitFor();result.checks.push('Rotated display retains source system navigation');await capture('edit-next-page-rotated');await page.keyboard.press('Shift+r');await page.keyboard.press('Shift+r');await page.keyboard.press('Shift+r');
  await page.keyboard.press('Escape');await page.locator('.reader').focus();await page.keyboard.press('Tab');await page.waitForFunction(()=>{const bar=document.querySelector('.toolbar.visible');return !!bar&&getComputedStyle(bar).opacity==='1';});assert.equal(await page.locator('[data-action=performance]').count(),0);result.checks.push('Visible toolbar has no Performance affordance');await capture('toolbar');
  await page.locator('.reader').focus();await page.keyboard.press('ArrowLeft');assert.equal(await page.locator('#app').getAttribute('data-page'),'0');result.checks.push('Explicit reader page command works while MIDI stays passive');await page.evaluate(()=>window.__emitMidi({controller:81,value:127},'viewer-midi-cc'));assert.equal(await page.locator('#app').getAttribute('data-page'),'1');await page.evaluate(()=>window.__emitMidi({controller:80,value:127},'viewer-midi-cc'));assert.equal(await page.locator('#app').getAttribute('data-page'),'0');result.checks.push('Explicit configured pedal page commands remain active');
  if(input.practice){
   await page.keyboard.press('p');await page.locator('.practice-overview').waitFor({state:'visible'});await passive('Selector');await page.locator('.practice-start').click();await page.locator('.practice-stage').waitFor({state:'visible'});await page.keyboard.press('v');await page.waitForFunction(()=>document.querySelector('#app')?.dataset.practiceMode==='free');await passive('Free view');await capture('free-view');
  }
  assert.equal(await page.evaluate(name=>atob(localStorage.getItem('iso-viewer-dev/'+name)),performanceFile),historical);result.checks.push('Historical Performance journal retained byte-exact');
  result.simulatedMidiEvents=await page.evaluate(()=>window.__passiveMidiCount);result.pianoConfigureIndependent=await page.evaluate(()=>window.__passiveCalls.some(c=>c.cmd==='piano_audio_configure'));assert.equal(result.pianoConfigureIndependent,true);await context.close();console.log(input.name+': '+result.checks.join('; '));
 }
 assert.deepEqual(report.errors,[]);
}catch(error){report.error=error.stack;throw error;}finally{await writeFile(join(out,'receipt.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();await new Promise(r=>server.close(r));}
