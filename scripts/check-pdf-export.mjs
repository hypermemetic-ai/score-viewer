// Run after npm run build, with node --import tsx:
//   PDF_EXPORT_DATA=<copy of the managed data directory> node --import tsx scripts/check-pdf-export.mjs <entry id>
// Production frontend in headless Chromium. Only native IPC is simulated: the
// data copy is read, every write stays in memory, and export_pdf prints the
// app's own print document through Chromium's PDF printer, the engine WebView2
// uses for PrintToPdf. Never point PDF_EXPORT_DATA at live application data.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {importPackage,selectPresentation} from '../src/package.ts';
const {chromium}=await import(process.env.PRACTICE_PLAYWRIGHT??'playwright-core');
const data=process.env.PDF_EXPORT_DATA,entryId=process.argv[2],out=process.env.PDF_EXPORT_ARTIFACTS??'/tmp/score-viewer-pdf-export';
if(!data||!entryId)throw Error('Set PDF_EXPORT_DATA to a data copy and pass the library entry id.');
await mkdir(out,{recursive:true});
const root=resolve('dist'),adir=join(data,'assistance-v1'),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function inventory(dir,prefix=''){const result={};for(const item of await readdir(dir,{withFileTypes:true})){const path=join(dir,item.name);if(item.isDirectory())Object.assign(result,await inventory(path,prefix+item.name+'/'));else result[prefix+item.name]=sha(await readFile(path));}return result;}
const before=await inventory(data),report={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dataFiles:Object.keys(before).length,exports:[],errors:[],
 limits:['Headless Linux Chromium with the production frontend and simulated IPC. Its PDF printer is the Chromium engine behind WebView2 PrintToPdf, but this is not the Windows WebView2 runtime, its fonts or an installed application.','PDF pages are rasterized by poppler at 192 dpi and the reader\'s live painted SVG by Chromium at 192 px/in from the same origin. Hairline and glyph antialiasing differ, so ink is compared as 8×8 px block averages with a 40/255 tolerance; scattered junction blocks remain.']};
const library=JSON.parse(await readFile(join(data,'library.json'),'utf8')),entry=library.entries.find(e=>e.id===entryId);assert.ok(entry,'Entry is not in the library copy.');
const preferences=JSON.parse(await readFile(join(data,'preferences.json'),'utf8')),keyboard=preferences.keyboardLayout??'janko-four-row';
const stored=await selectPresentation(await importPackage(await readFile(join(data,entry.file)),{allowLegacyTempo:true}),keyboard);
const storedHands=new Map(stored.score.notes.map(n=>[n.id,n.hand]));
const csp=JSON.parse(await readFile('src-tauri/tauri.conf.json','utf8')).app.security.csp.replace('connect-src ipc:',"connect-src 'self' ipc:");
const memory=new Map();let assistance;
async function snapshot(){if(assistance)return assistance;const id=(await readFile(join(adir,'current'),'utf8')).trim(),manifest=JSON.parse(await readFile(join(adir,id+'.json'),'utf8')),documents={};
 for(const [name,ref]of Object.entries(manifest.refs))documents[name]=JSON.parse(await readFile(join(adir,ref+'.json'),'utf8'));return assistance={...manifest,id,documents};}
const body=async req=>{let b='';for await(const c of req)b+=c;return JSON.parse(b);};
const server=createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');try{
 if(url.pathname==='/__managed'){const name=url.searchParams.get('name');if(memory.has(name)){res.end(JSON.stringify(memory.get(name)));return;}try{res.end(JSON.stringify((await readFile(join(data,name))).toString('base64')));}catch{res.end('null');}return;}
 if(url.pathname==='/__write'){const {name,data:d}=await body(req);memory.set(name,d);res.end('null');return;}
 if(url.pathname==='/__assistance'){res.end(JSON.stringify(await snapshot()));return;}
 if(url.pathname==='/__commit'){const {input}=await body(req),s=await snapshot();if(input.expectedRevision!==s.revision){res.end(JSON.stringify({status:'conflict',snapshot:s}));return;}
  const documents={...s.documents};for(const [n,v]of Object.entries(input.changes)){if(v===null)delete documents[n];else documents[n]=v;}
  assistance={...s,revision:s.revision+1,previous:s.id,id:'memory-'+(s.revision+1),documents};res.end(JSON.stringify({status:'committed',snapshot:assistance}));return;}
 const path=resolve(root,'.'+decodeURIComponent(url.pathname));if(path!==root&&!path.startsWith(root+'/'))throw Error('outside');const file=path===root?join(root,'index.html'):path;
 res.setHeader('Content-Security-Policy',csp);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.otf':'font/otf','.ttf':'font/ttf'}[extname(file)]??'application/octet-stream'));res.end(await readFile(file));
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.PDF_EXPORT_CHROMIUM,args:['--disable-lcd-text','--force-color-profile=srgb']});
 const context=await browser.newContext({viewport:{width:1440,height:1200},deviceScaleFactor:2}),page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))report.errors.push('console: '+m.text());});
 let pending;
 await page.exposeFunction('__printPdf',async(filename,w,h)=>{const path=join(out,`${pending}-${filename}`);
  await page.pdf({path,width:`${w/72}in`,height:`${h/72}in`,printBackground:true,margin:{top:0,right:0,bottom:0,left:0}});return path;});
 await page.addInitScript(()=>{
  const callbacks=new Map();let callback=0;window.__calls=[];window.__pdf=[];
  const post=(p,body)=>fetch(p,{method:'POST',body:JSON.stringify(body)}).then(r=>r.json());
  window.isTauri=true;window.__TAURI_EVENT_PLUGIN_INTERNALS__={unregisterListener(){}};
  window.__TAURI_INTERNALS__={metadata:{currentWindow:{label:'main'},currentWebview:{label:'main'}},transformCallback(fn){callbacks.set(++callback,fn);return callback;},unregisterCallback(id){callbacks.delete(id);},invoke:async(cmd,args={})=>{
   window.__calls.push(cmd);
   if(cmd==='export_pdf'){const sheets=[...document.querySelectorAll('.score-print-sheet>svg')];window.__pdf.push({args,sheets:sheets.length,annotations:sheets.map(s=>s.querySelectorAll('.viewer-finger-annotation').length),printOnly:matchMedia('print').matches,shown:getComputedStyle(document.querySelector('.score-print')).display});
    window.__pdf.at(-1).path=await window.__printPdf(args.filename,args.widthPoints,args.heightPoints);return true;}
   if(cmd==='read_managed')return fetch('/__managed?name='+encodeURIComponent(args.name)).then(r=>r.json());
   if(cmd==='write_managed')return post('/__write',args);
   if(cmd==='read_assistance')return fetch('/__assistance').then(r=>r.json());
   if(cmd==='commit_assistance')return post('/__commit',args);
   if(cmd==='midi_clock')return performance.now()*1000;if(cmd==='midi_sources')return {supported:true,sources:[],message:''};
   if(cmd==='plugin:event|listen')return args.handler;
   if(cmd==='practice_audio_outputs')return {supported:false,outputs:[]};
   if(cmd==='piano_bank_status')return {supported:true,installed:false,phase:'absent',progress:null,message:'',cancellable:false};
   if(cmd==='piano_audio_configure'||cmd==='piano_audio_status')return {enabled:false,ready:false,running:false,device:null,sampleRate:48000,periodFrames:128,bufferFrames:128,raw:false,mode:'none',fallback:null,error:null,latencyTier:0};
   return null;
  }};
 });
 await page.goto(base);await page.locator('.library').waitFor();
 await page.locator(`[data-open="${entryId}"]`).click();await page.locator('.reader').waitFor({timeout:120000});
 await page.locator('dialog').waitFor({state:'detached',timeout:120000}).catch(()=>{});await page.evaluate(()=>document.fonts.ready);
 const pages=await page.evaluate(()=>document.querySelector('.toolbar small')?.textContent);report.reader={pages,notation:await page.locator('#app').getAttribute('data-notation'),keyboard};
 // Reader pages as painted on screen, page by page, with the hands the reader paints.
 await page.locator('.reader').focus();
 for(let i=0;i<8&&await page.locator('#app').getAttribute('data-page')!=='0';i++){await page.keyboard.press('ArrowLeft');await page.waitForTimeout(300);}
 const readerPages=[];
 for(let index=0;index<stored.pages.length;index++){
  const live=page.locator(`.page[data-page="${index}"]`);
  for(let i=0;i<8&&!await live.count();i++){await page.keyboard.press('ArrowRight');await page.waitForTimeout(300);}
  await live.waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(300);
  const hands=await live.evaluate(el=>[...el.querySelectorAll('[data-viewer-seat]')].map(t=>({owner:t.closest('[data-owner-ids]')?.getAttribute('data-owner-ids').split(/[\s,|]+/)[0],hand:t.dataset.performingHand})));
  await live.locator('svg').screenshot({path:join(out,`reader-live-${index+1}.png`)});
  // Register reader and PDF exactly: the reader's live painted SVG and the stored page are drawn at 192 px/in from one origin, the PDF rasterized at 192 dpi.
  const shot=join(out,`reader-${index+1}.png`),storedShot=join(out,`stored-${index+1}.png`),painted=await live.evaluate(el=>el.querySelector('svg').outerHTML);
  for(const [svg,path]of [[painted,shot],[stored.pages[index],storedShot]]){
   await page.evaluate(svg=>{const box=document.createElement('div');box.id='pdf-check-box';box.style.cssText='position:fixed;left:0;top:0;z-index:2147483647;background:#fff;width:595.28pt;height:841.89pt';box.innerHTML=svg;const el=box.querySelector('svg');el.style.cssText='display:block;width:100%;height:100%';document.body.append(box);},svg);
   await page.evaluate(()=>document.fonts.ready);await page.screenshot({path,clip:{x:0,y:0,width:793,height:1122}});await page.evaluate(()=>document.getElementById('pdf-check-box').remove());
  }
  assert.ok(hands.every(h=>storedHands.has(h.owner)),'Every painted seat names a source note.');
  readerPages.push({index,shot,storedShot,seats:hands.length,handChanges:hands.filter(h=>storedHands.get(h.owner)!==h.hand).length});
 }
 await page.keyboard.press('ArrowLeft');
 async function exportPdf(name,holdFingers,clickCount=1){
  pending=name;await page.locator('.reader').focus();
  if(holdFingers)await page.keyboard.down('KeyF');
  // Page turns save the reading position; let those settle so only the export is measured.
  await page.waitForTimeout(2500);await page.mouse.move(700,600);await page.mouse.move(720,page.viewportSize().height-5);await page.locator('.toolbar.visible [data-action=pdf]').waitFor();
  const callsBefore=await page.evaluate(()=>{const toast=document.querySelector('.toast');if(toast)toast.textContent='';return window.__calls.length;});
  await page.locator('[data-action=pdf]').click({clickCount});
  await page.waitForFunction(()=>/PDF saved/.test(document.querySelector('.toast')?.textContent??''),null,{timeout:120000});
  if(holdFingers)await page.keyboard.up('KeyF');
  const result=await page.evaluate(n=>({toast:document.querySelector('.toast').textContent,pdf:window.__pdf.at(-1),calls:window.__calls.slice(n),leftover:document.querySelectorAll('.score-print,[data-score-print]').length}),callsBefore);
  assert.deepEqual(result.calls,['export_pdf'],'Export must make no other native call, including writes.');assert.equal(result.leftover,0);
  assert.equal(result.pdf.sheets,stored.pages.length);assert.equal(result.pdf.shown,'none','Print pages never appear on screen.');
  const info=execFileSync('pdfinfo',[result.pdf.path],{encoding:'utf8'}),fonts=execFileSync('pdffonts',[result.pdf.path],{encoding:'utf8'}),images=execFileSync('pdfimages',['-list',result.pdf.path],{encoding:'utf8'});
  assert.match(info,new RegExp(`Pages:\\s+${stored.pages.length}\\n`));assert.equal(images.trim().split('\n').length,2,'Vector output has no raster images.');
  const fontRows=fonts.trim().split('\n').slice(2);assert.ok(fontRows.length&&fontRows.every(r=>/\syes\s+yes\s/.test(r)),'Every font is embedded and subset.');
  report.exports.push({name,...result,pdfSha256:sha(await readFile(result.pdf.path)),pageSize:info.match(/Page size:\s+(.*)/)[1],fonts:fontRows.map(r=>r.split(/\s+/).slice(0,2).join(' '))});
  return result.pdf.path;
 }
 const pitchPdf=await exportPdf('pitch',false),fingerPdf=await exportPdf('finger',true);
 // A double click must still make one export of each page once.
 await exportPdf('double-click',false,2);
 // Pixel comparison happens in a blank page: reader vs PDF, and reader vs the stored (pre-edit) page.
 const compare=await context.newPage();
 // Compare ink coverage in 8×8 device-pixel blocks: robust to renderer antialiasing, sensitive to any moved, added or missing mark.
 const diff=async(a,b,diffPath)=>{const [x,y]=await Promise.all([a,b].map(async p=>'data:image/png;base64,'+(await readFile(p)).toString('base64')));
  const r=await compare.evaluate(async([x,y])=>{const load=src=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=src;});const [A,B]=await Promise.all([load(x),load(y)]),w=Math.min(A.width,B.width),h=Math.min(A.height,B.height),S=8;
   const px=img=>{const c=new OffscreenCanvas(w,h),g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,w,h);g.drawImage(img,0,0);return g.getImageData(0,0,w,h).data;};const a=px(A),b=px(B),out=new ImageData(w,h);
   const lum=(d,i)=>(d[i]*299+d[i+1]*587+d[i+2]*114)/1000,cols=Math.ceil(w/S),rowsN=Math.ceil(h/S),inkA=new Float64Array(cols*rowsN),inkB=new Float64Array(cols*rowsN);
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,k=Math.floor(y/S)*cols+Math.floor(x/S);inkA[k]+=255-lum(a,i);inkB[k]+=255-lum(b,i);}
   let blocks=0,inkBlocks=0,differing=0;const bad=new Uint8Array(cols*rowsN);
   for(let k=0;k<inkA.length;k++){blocks++;const ia=inkA[k]/(S*S),ib=inkB[k]/(S*S);if(ia>4||ib>4)inkBlocks++;if(Math.abs(ia-ib)>40){bad[k]=1;differing++;}}
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,g=lum(a,i);out.data.set(bad[Math.floor(y/S)*cols+Math.floor(x/S)]?[220,0,0,255]:[g,g,g,255],i);}
   const c=new OffscreenCanvas(w,h);c.getContext('2d').putImageData(out,0,0);const u8=new Uint8Array(await (await c.convertToBlob()).arrayBuffer());let s='';for(let i=0;i<u8.length;i+=32768)s+=String.fromCharCode(...u8.subarray(i,i+32768));
   return {width:w,height:h,block:S,inkBlocks,differingBlocks:differing,differingOfInk:inkBlocks?differing/inkBlocks:0,png:btoa(s)};},[x,y]);
  await writeFile(diffPath,Buffer.from(r.png,'base64'));delete r.png;return r;};
 report.pages=[];
 for(const p of readerPages){
  const meta=await compare.evaluate(async src=>{const i=new Image();await new Promise(r=>{i.onload=r;i.src=src;});return {w:i.width,h:i.height};},'data:image/png;base64,'+(await readFile(p.shot)).toString('base64'));
  const pdfPng=join(out,`pdf-pitch-${p.index+1}`),fingerPng=join(out,`pdf-finger-${p.index+1}`);
  const dpi='192';
  for(const [pdf,png]of [[pitchPdf,pdfPng],[fingerPdf,fingerPng]])execFileSync('pdftoppm',['-png','-singlefile','-f',String(p.index+1),'-l',String(p.index+1),'-r',dpi,'-x','0','-y','0','-W',String(meta.w),'-H',String(meta.h),pdf,png]);
  report.pages.push({page:p.index+1,seats:p.seats,handChangesFromStored:p.handChanges,
   readerVsPdf:await diff(p.shot,pdfPng+'.png',join(out,`diff-reader-pdf-${p.index+1}.png`)),
   storedVsPdf:await diff(p.storedShot,pdfPng+'.png',join(out,`diff-stored-pdf-${p.index+1}.png`)),
   pitchVsFingerPdf:await diff(pdfPng+'.png',fingerPng+'.png',join(out,`diff-pitch-finger-${p.index+1}.png`))});
 }
 const after=await inventory(data);report.dataUnchanged=JSON.stringify(after)===JSON.stringify(before);report.memoryWrites=[...memory.keys()];
 assert.ok(report.dataUnchanged,'The data copy changed.');assert.deepEqual(report.errors,[]);
 for(const p of report.pages)assert.ok(p.readerVsPdf.differingOfInk<.01,`PDF page ${p.page} differs from the reader.`);
 assert.ok(report.pages.some(p=>p.handChangesFromStored>0&&p.storedVsPdf.differingBlocks>p.readerVsPdf.differingBlocks*10),'No page shows personal hands that differ from the stored package.');
 assert.ok(report.exports[1].pdf.annotations.reduce((a,b)=>a+b,0)>0&&report.exports[0].pdf.annotations.every(n=>n===0),'Label mode does not follow the reader.');
}finally{await writeFile(join(out,'report.json'),JSON.stringify(report,null,1));await browser?.close();await new Promise(r=>server.close(r));}
console.log(JSON.stringify(report,null,1));
