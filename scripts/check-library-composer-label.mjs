// Run after npm run build with node --import tsx. All music is publicly authored.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {authoredReadingPackage,authoredReadingScore} from '../test/support/instrument-reading-fixture.ts';
const {chromium}=await import(process.env.PRACTICE_PLAYWRIGHT??'playwright-core');
const root=resolve('dist'),output=process.env.LIBRARY_ARTIFACTS??'/tmp/score-viewer-composer-label',record={cases:[],errors:[],limits:['Built frontend Chromium controls; no installed native or physical acceptance.']};await mkdir(output,{recursive:true});
const inputs=[{id:'empty-composer-study',composer:'',title:'Study without composer'},
 {id:'whitespace-composer-study',composer:' \t ',title:'Study with blank composer'},
 {id:'known-composer-study',composer:'Viewer regression',title:'Named composer study'}];
for(const input of inputs){const score={...authoredReadingScore(),...input},bytes=await authoredReadingPackage(score);input.path=join(output,input.id+'.tuna');input.encoded=Buffer.from(bytes).toString('base64');input.sha256=createHash('sha256').update(bytes).digest('hex');await writeFile(input.path,bytes);}
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!path.startsWith(root+'/')&&path!==root)throw Error('outside');const file=path===root?join(root,'index.html'):path;res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.ttf':'font/ttf'}[extname(file)]??'application/octet-stream'));res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});let browser;
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>record.errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('.library').waitFor();
 for(const input of inputs){const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Import',exact:false}).click();await(await chooser).setFiles(input.path);await page.locator('.reader').waitFor({timeout:120000});await page.waitForFunction(()=>!document.querySelector('dialog[open]'));await page.locator('.reader').focus();await page.keyboard.press('Escape');await page.locator('.library').waitFor();}
 const stored=()=>page.evaluate(()=>({library:localStorage.getItem('iso-viewer-dev/library.json'),files:Object.fromEntries(Object.keys(localStorage).filter(key=>key.startsWith('iso-viewer-dev/package-')).map(key=>[key,localStorage.getItem(key)]))}));
 const original=await stored(),entries=JSON.parse(Buffer.from(original.library,'base64').toString('utf8')).entries;assert.equal(entries.length,3);assert.equal(await page.getByRole('button',{name:'Other scores',exact:true}).count(),2);
 for(const input of inputs){
  const entry=entries.find(e=>e.metadata.title===input.title);assert.equal(entry.metadata.composer,input.composer);assert.ok(original.files['iso-viewer-dev/'+entry.file]===input.encoded,'Imported archive stays exact');const browsingBefore=await stored();
  // Raw identities remain exact, including the original whitespace key.
  const target=page.locator('.composer-entry').nth(await page.locator('.composer-entry').evaluateAll((els,composer)=>els.findIndex(el=>el.dataset.composer===composer),input.composer));
  const label=input.composer.trim()?input.composer:'Other scores';assert.equal(await page.getByRole('button',{name:label,exact:true}).evaluateAll((els,composer)=>els.some(el=>el.dataset.composer===composer),input.composer),true,'Visible header has the expected accessible name');
  assert.equal(await target.getAttribute('data-library-row'),'composer:'+input.composer);assert.equal(await target.getAttribute('data-composer'),input.composer);
  await target.focus();await page.keyboard.press('Enter');assert.equal(await target.getAttribute('aria-expanded'),'false');assert.equal(await page.locator('[data-open="'+entry.id+'"]').isVisible(),false);await page.keyboard.press('Enter');assert.equal(await target.getAttribute('aria-expanded'),'true');assert.equal(await page.locator('[data-open="'+entry.id+'"]').innerText(),input.title);await page.keyboard.press('ArrowDown');assert.equal(await page.locator(':focus').getAttribute('data-open'),entry.id);await page.keyboard.press('ArrowUp');assert.equal(await page.locator(':focus').getAttribute('data-library-row'),'composer:'+input.composer);await page.keyboard.press('ArrowDown');assert.ok(JSON.stringify(await stored())===JSON.stringify(browsingBefore),'Rendering, expansion and arrow navigation do not write library/archive bytes');
  await page.screenshot({path:join(output,input.id+'-expanded.png')});await page.keyboard.press('Enter');await page.locator('.reader').waitFor({timeout:120000});assert.ok(await page.locator('.page').count());await page.locator('.reader').focus();await page.keyboard.press('Escape');await page.locator('.library').waitFor();
  const after=await stored(),saved=JSON.parse(Buffer.from(after.library,'base64').toString('utf8')).entries.find(e=>e.id===entry.id);assert.equal(saved.metadata.composer,input.composer);assert.ok(after.files['iso-viewer-dev/'+entry.file]===input.encoded);record.cases.push({composer:input.composer,label,title:input.title,archiveSha256:input.sha256,keyboardExpansionAndOpening:true,rawIdentityPreserved:true});console.log(input.id+': accessible label, Enter/Up/Down/open and immutable metadata/archive pass');
 }
 assert.deepEqual(record.errors,[]);record.status='passed';
}catch(error){record.status='failed';record.error=error.stack;throw error;}
finally{await writeFile(join(output,'receipt.json'),JSON.stringify(record,null,2));await browser?.close();if(server.listening)await new Promise(r=>server.close(r));}
