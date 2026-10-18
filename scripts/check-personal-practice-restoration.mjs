// Build first. Run through qq-job with node --import tsx; native IPC is isolated.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {hostname} from 'node:os';
import {sourcePackage,calculatedStudy,transferStudy} from '../test/support/hand-edition-fixture.ts';
import {collectionId,initialPersonal,personalStorageName,practiceStorageName} from '../src/state.ts';
import {physicalManagedName} from '../src/managed-file-storage.ts';
import {assigned} from '../src/personal-assignments.ts';
import {PersonalPresentationSession} from '../src/personal-presentation.ts';
import {planPractice,initialPractice,ReadingSession} from '../src/practice.ts';
import {toggleDone} from '../src/practice-attainment.ts';
const {chromium}=await import(process.env.PRACTICE_PLAYWRIGHT??'playwright-core');
const offGrid=process.env.PERSONAL_PRACTICE_OFF_GRID==='1',seedPracticeValues=offGrid?{start:10,working:26.966292134831466,step:5}:{start:36,working:54,step:1.8};
const out=process.env.PERSONAL_PRACTICE_ARTIFACTS??('/tmp/score-viewer-personal-practice-restoration'+(offGrid?'-off-grid':'')),root=resolve('dist'),sha=b=>createHash('sha256').update(b).digest('hex');
await mkdir(out,{recursive:true});
const report={inputScenario:offGrid?'off-grid-protected-settings':'standard-grid-settings',offGridInput:offGrid,seedPracticeValues:{...seedPracticeValues,workingByPatternValue:seedPracticeValues.working},host:hostname(),node:process.version,viewport:{width:1440,height:900},viewer:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),shared:execFileSync('git',['-C','vendor/iso-notation','rev-parse','HEAD'],{encoding:'utf8'}).trim(),mainSha256:sha(await readFile('src/main.ts')),cases:[],errors:[],limits:['Actual emitted production main/PracticeView in headless Chromium, with public authored source and isolated simulated native MIDI/storage. No physical MIDI, native WebView, human musical acceptance or latency acceptance; candidate renderer pin remains unapproved.']};
report.frontend=[];for(const m of(await readFile(join(root,'index.html'),'utf8')).matchAll(/(?:src|href)="([^"]+)"/g))if(m[1].startsWith('./assets/'))report.frontend.push({file:m[1],sha256:sha(await readFile(join(root,m[1])))});
const csp=JSON.parse(await readFile('src-tauri/tauri.conf.json','utf8')).app.security.csp;
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));assert.ok(path===root||path.startsWith(root+'/'));const file=path===root?join(root,'index.html'):path;res.setHeader('Content-Security-Policy',csp);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.otf':'font/otf'}[extname(file)]??'application/octet-stream'));res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
let browser,lastPage,lastResult;
try{
 const source=transferStudy(),prior=await sourcePackage(source);
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,...(process.env.PRACTICE_CHROMIUM?{executablePath:process.env.PRACTICE_CHROMIUM}:{})});report.chromium=browser.version();
 for(const keyboard of ['conventional-piano','janko-four-row']){
  const {p,bytes}=await calculatedStudy(prior.p,keyboard,Object.fromEntries(source.notes.map(n=>[n.id,n.hand]))),entry={id:collectionId(p),file:'package-'+sha(bytes)+'.tuna',metadata:p.manifest.metadata,importedAt:'2026-10-11T00:00:00Z'},personal=initialPersonal(p),seat=p.seats.find(s=>s.ownerIds.includes('gesture-0'));
  personal.editContactId=seat.contactId;personal.view.labelMode='pitch';personal.view.count=1;
  const plan=planPractice(p),saved=initialPractice(plan),chunk=plan.chunks[0];Object.assign(saved,{...seedPracticeValues,connectionStart:63,countInBars:3,resumeCooldownSeconds:4,keepTempo:true,audioOutput:'isolated-reference-output'});saved.best[chunk.pattern]=45;saved.groundwork={[chunk.pattern]:true};saved.workingByPattern[chunk.pattern]=seedPracticeValues.working;toggleDone(saved,{passage:chunk.id,pattern:chunk.pattern,rate:75});
  const personalFile=await physicalManagedName(personalStorageName(entry.id,p)),practiceFile=await physicalManagedName(practiceStorageName(entry.id,p)),seed={'library.json':{version:1,entries:[entry]},'preferences.json':{version:1,displayRotation:0,libraryRotation:0,keyboardLayout:keyboard,fingerBehavior:'toggle',fingerPresentation:'annotations'},[personalFile]:personal,[practiceFile]:saved};
  const context=await browser.newContext({viewport:report.viewport}),page=await context.newPage(),result={keyboard,archiveSha256:sha(bytes),sourceSha256:p.sourceSha256,checks:[],screenshots:[],console:[]};page.setDefaultTimeout(10000);lastPage=page;lastResult=result;result.practicePartition=plan.partition;result.sourcePassage={id:chunk.id,pattern:chunk.pattern,start:chunk.start,end:chunk.end};result.catalog=plan.catalog?.map(e=>({id:e.id,kind:e.kind,clips:e.clips}));report.cases.push(result);page.on('pageerror',e=>report.errors.push({keyboard,message:e.message}));page.on('console',m=>{if(m.type()==='error')result.console.push(m.text());});
  await page.addInitScript(({seed,entry,archive})=>{
   const encode=v=>btoa(unescape(encodeURIComponent(JSON.stringify(v))));for(const [name,v]of Object.entries(seed))localStorage.setItem('iso-viewer-dev/'+name,encode(v));localStorage.setItem('iso-viewer-dev/'+entry.file,archive);
   const callbacks=new Map(),listeners=new Map();let id=0;window.__practiceRestore={writes:[],calls:[]};window.isTauri=true;window.__TAURI_EVENT_PLUGIN_INTERNALS__={unregisterListener(){}};
   window.__emitRestoreMidi=payload=>{for(const handler of listeners.get('viewer-midi-note')??[])callbacks.get(handler)?.({event:'viewer-midi-note',id:handler,payload:{timestamp_micros:performance.now()*1000,source:'Isolated piano',generation:1,channel:1,velocity:80,filtered:false,...payload}});};
   window.__TAURI_INTERNALS__={metadata:{currentWindow:{label:'main'},currentWebview:{label:'main'}},transformCallback(fn){callbacks.set(++id,fn);return id;},unregisterCallback(key){callbacks.delete(key);},invoke:async(cmd,args={})=>{
    window.__practiceRestore.calls.push({cmd,args});if(cmd==='read_managed')return localStorage.getItem('iso-viewer-dev/'+args.name);if(cmd==='write_managed'){localStorage.setItem('iso-viewer-dev/'+args.name,args.data);window.__practiceRestore.writes.push({name:args.name,data:args.data});return;}
    if(cmd==='midi_clock')return performance.now()*1000;if(cmd==='midi_sources')return {supported:true,sources:['Isolated piano'],message:''};if(cmd==='midi_connect')return 1;if(cmd==='plugin:event|listen'){const handlers=listeners.get(args.event)??[];handlers.push(args.handler);listeners.set(args.event,handlers);return args.handler;}
    if(cmd==='practice_audio_outputs')return {supported:false,outputs:[]};if(cmd==='piano_bank_status')return {supported:true,installed:false,phase:'absent',progress:null,message:'',cancellable:false};return null;
   }};
  },{seed,entry,archive:Buffer.from(bytes).toString('base64')});
  const capture=async label=>{const file=keyboard+'-'+label+'.png';await page.screenshot({path:join(out,file)});result.screenshots.push(file);};
  const storage=async file=>page.evaluate(file=>{const raw=localStorage.getItem('iso-viewer-dev/'+file);return raw?JSON.parse(decodeURIComponent(escape(atob(raw)))):null;},file);
  const evidence=s=>({partition:s.partition,policyFingerprint:s.policyFingerprint,excluded:s.excluded,best:s.best,groundwork:s.groundwork,manualAttainment:s.manualAttainment,workingByPattern:s.workingByPattern});
  const settings=s=>Object.fromEntries(['target','personalGoal','referenceBeat','start','connectionStart','step','tolerance','offset','countInBars','resumeCooldownSeconds','keepTempo','audioOutput'].map(key=>[key,s[key]]));
  const geometry=()=>page.evaluate(()=>{const attrs=['d','points','x','y','x1','x2','y1','y2','transform','viewBox','class','fill','stroke','stroke-width','font-size'];return JSON.stringify([...document.querySelectorAll('.practice-score svg g,.practice-score svg path,.practice-score svg text,.practice-score svg line')].filter(el=>!el.closest('[data-finger-seat]')&&!el.classList.contains('practice-playhead')).map(el=>[el.localName,attrs.map(a=>el.getAttribute(a)),el.localName==='text'?el.textContent:null]));});
  const enter=async()=>{await page.locator('.reader').focus();await page.keyboard.press('p');await page.locator('[data-practice="passage:'+chunk.id+'"]').click();await page.locator('.practice-score [data-viewer-seat]').first().waitFor();};
  const closeOptions=async()=>{await page.locator('[data-options-close]').click();await page.locator('dialog').waitFor({state:'detached'});};
  const checkGroups=async(label,expectedPersonal,expectedView)=>{
   const expectedPlan=planPractice(p,plan.partition,expectedPersonal),reading=new ReadingSession(expectedPlan,expectedPlan.chunks[0]),owners=new Set(expectedPlan.gestures.filter(g=>reading.current.groups.includes(g.id)).flatMap(g=>g.owners));
   await page.locator('[data-practice=ready]').click();await page.waitForFunction(()=>document.querySelector('#app')?.dataset.practicePhase==='reading');
   const checks=expectedView.seats.map(s=>({id:s.id,owner:s.ownerIds[0],visible:s.ownerIds.some(id=>owners.has(id))}));
   const actual=await page.evaluate(checks=>checks.map(s=>{const el=document.querySelector('.practice-score [data-viewer-seat="'+s.id+'"]');return {...s,found:!!el,actualVisible:!!el&&getComputedStyle(el).visibility==='visible',x:el?.getAttribute('x'),y:el?.getAttribute('y'),text:el?.textContent};}),checks);
   assert.ok(actual.every(s=>s.found),label+' must observe all original source glyphs');assert.ok(actual.every(s=>s.actualVisible===s.visible),label+' source glyph visibility must follow newly prepared hand groups');
   result.checks.push({label,groups:reading.current.groups,visibleOwners:[...owners],glyphs:actual});await capture(label+'-reading-group');
   for(const step of ['next-solo','adjacent-pair']){
    const attacks=reading.current.events.map(a=>a.midi);await page.evaluate(attacks=>{for(const note of attacks){window.__emitRestoreMidi({note,on:true});window.__emitRestoreMidi({note,on:false});}},attacks);reading.confirm();
    const nextOwners=new Set(expectedPlan.gestures.filter(g=>reading.current.groups.includes(g.id)).flatMap(g=>g.owners));
    const after=await page.evaluate(checks=>checks.map(s=>{const el=document.querySelector('.practice-score [data-viewer-seat="'+s.id+'"]');return {owner:s.owner,visible:!!el&&getComputedStyle(el).visibility==='visible'};}),checks);
    assert.ok(after.every(s=>s.visible===nextOwners.has(s.owner)),label+' actual native MIDI must advance to correct '+step+' source glyphs');
    result.checks.push({label:label+'-native-midi-'+step,attacks,groups:reading.current.groups,glyphs:after});await capture(label+'-reading-'+step);
   }
   await page.locator('[data-practice=settings]').click();await closeOptions();
  };
  await page.goto('http://127.0.0.1:'+server.address().port);const open=page.locator('[data-open='+JSON.stringify(entry.id)+']');if(!await open.isVisible())await page.locator('.composer-entry').first().click();await open.click();await page.locator('.reader').waitFor();
  // Connect through the real Options panel so Reading uses the production MIDI path.
  await page.locator('.reader').focus();await page.keyboard.press('o');await page.locator('[data-options-section="input-output"]').click();
  await page.locator('[data-options-key=options-midi-source]').click();await page.getByRole('option',{name:'Isolated piano',exact:true}).click();await page.locator('[data-midi-connect]').click();await page.waitForFunction(()=>document.querySelector('[data-midi-connect]')?.textContent==='Disconnect');await closeOptions();
  await enter();const baselineGeometry=await geometry();await capture('baseline-paused');await checkGroups('baseline',personal,p);
  await page.locator('[data-practice=overview]').click();await page.locator('[data-practice=back]').click();await page.locator('.reader').focus();await page.keyboard.press('e');await page.keyboard.press('KeyR');
  const edited=assigned(p,personal,seat,{hand:'RH'}),editedView=await new PersonalPresentationSession(p).project(edited);await page.waitForFunction(id=>document.querySelector('[data-edit-selected]')?.getAttribute('data-performing-hand')==='RH',seat.id);
  await page.keyboard.press('Escape');await enter();const changedGeometry=await geometry();assert.notEqual(changedGeometry,baselineGeometry,'Hand transfer must change actual SVG engraving');await capture('edited-paused');await checkGroups('edited',edited,editedView);
  for(const [action,label,expectedPersonal,expectedView,expectedGeometry]of [['restore-all','restored',personal,p,baselineGeometry],['undo-restore','undone',edited,editedView,changedGeometry]]){
   await page.locator('[data-practice=settings]').click();await page.locator('[data-options-section=score]').click();await page.locator('[data-action='+action+']').click();
   const successor=action==='restore-all'?'undo-restore':'restore-all';await page.locator('[data-action='+successor+']').waitFor();await closeOptions();
   assert.equal(await geometry(),expectedGeometry,label+' actual source engraving must match its known original/projected frame');
   await checkGroups(label,expectedPersonal,expectedView);
   const journal=await storage(practiceFile);assert.deepEqual(evidence(journal),evidence(saved),label+' retains raw earned/self-reported evidence');assert.deepEqual(settings(journal),settings(saved),label+' retains practice preferences');
   result.checks.push({label:label+'-preservation',evidence:evidence(journal),settings:settings(journal),range:await page.locator('[data-practice-range]').textContent()});
  }
  assert.equal(await page.evaluate(file=>localStorage.getItem('iso-viewer-dev/'+file),entry.file),Buffer.from(bytes).toString('base64'),'Original archive bytes retained');await context.close();
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.error=error.stack;if(lastPage&&!lastPage.isClosed()){lastResult.failure=await lastPage.evaluate(()=>({body:document.body.innerText,native:window.__practiceRestore}));const name=lastResult.keyboard+'-failure.png';await lastPage.screenshot({path:join(out,name)});lastResult.screenshots.push(name);}throw error;}finally{await writeFile(join(out,'receipt.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();await new Promise(r=>server.close(r));}
