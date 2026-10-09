import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {unzipSync,strFromU8} from 'fflate';
import {authoredReadingPackage} from '../test/support/instrument-reading-fixture.ts';

const {chromium}=await import(process.env.PRACTICE_PLAYWRIGHT??'playwright-core');
const output=process.env.READING_ARTIFACTS??'/tmp/score-viewer-instrument-reading-validation',
  url=process.env.READING_URL??'http://127.0.0.1:5218';
await mkdir(output,{recursive:true});
const bytes=process.env.READING_PACKAGE?await readFile(process.env.READING_PACKAGE):await authoredReadingPackage(),
  files=unzipSync(bytes),manifest=JSON.parse(strFromU8(files['manifest.json'])),score=JSON.parse(strFromU8(files['score.json'])),id=manifest.revision,
  file=`package-${createHash('sha256').update(bytes).digest('hex')}.isoscore`,owners=JSON.parse(strFromU8(files['reading-owners.json']));
assert.equal(manifest.version,3);
const browser=await chromium.launch({executablePath:process.env.PRACTICE_CHROMIUM,headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
async function settle(){await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function open(){await page.locator('.composer-entry').first().focus();await page.keyboard.press('ArrowRight');await page.locator('[data-open]').first().click();await page.locator('.reader').waitFor({timeout:120000});await settle();}
async function goTo(index){const current=Number(await page.locator('#app').getAttribute('data-page'));
  for(let step=0;step<Math.abs(index-current);step++)await page.keyboard.press(index>current?'ArrowRight':'ArrowLeft');await settle();}
try {
  await page.addInitScript(({encoded,metadata,id,file})=>{
    if(localStorage.getItem('reading-seeded'))return;
    localStorage.setItem('reading-seeded','1');
    const put=(name,value)=>localStorage.setItem('iso-viewer-dev/'+name,btoa(unescape(encodeURIComponent(JSON.stringify(value)))));
    localStorage.setItem('iso-viewer-dev/'+file,encoded);
    put('library.json',{version:1,entries:[{id,file,metadata,importedAt:'2026-10-08T00:00:00Z'}]});
    put('preferences.json',{version:1,libraryRotation:0,keyboardLayout:'conventional-piano'});
  },{encoded:Buffer.from(bytes).toString('base64'),metadata:manifest.metadata,id,file});
  await page.goto(url);await open();await page.keyboard.press('h');
  assert.equal(await page.locator('.toolbar [data-keyboard]').count(),0);
  for(const action of ['practice','performance','edit','generate','toggle'])
    assert.equal(await page.locator(`.toolbar [data-action=${action}]`).count(),0);
  assert.ok(await page.locator('.page svg').count()>0);
  assert.equal(await page.locator('.page [data-viewer-seat]').count(),0);
  await page.screenshot({path:output+'/reading-first-page.png'});
  const dead=owners.find(owner=>owner.eventKind==='unpitched');
  if(dead?.heads.length){await goTo(dead.heads[0].page);
    assert.ok(await page.locator('.page svg').evaluateAll((svgs,id)=>svgs.some(svg=>
      Array.from(svg.querySelectorAll('[data-note-id]')).some(head=>head.getAttribute('data-note-id')===id&&head.querySelector('.janko-unpitched-head'))),dead.heads[0].id));
    await page.screenshot({path:output+'/reading-percussive-page.png'});}
  let techniqueLabelsObserved=0;
  for(const technique of score.techniques??[]){const owner=owners.find(owner=>owner.id===technique.fromNoteId);
    assert.ok(owner?.heads.length);await goTo(owner.heads[0].page);
    assert.ok(await page.locator('.page .janko-technique-label').evaluateAll((labels,technique)=>labels.some(label=>
      label.getAttribute('data-technique-id')===technique.id&&label.textContent===technique.label&&
      label.getAttribute('data-owner-ids')===[technique.fromNoteId,technique.toNoteId].join('|')),technique));
    techniqueLabelsObserved++;
  }
  if(techniqueLabelsObserved)await page.screenshot({path:output+'/reading-technique-page.png'});
  await page.keyboard.press('o');const options=page.locator('dialog[data-kind=options]');await options.waitFor();
  assert.equal(await options.locator('[data-control=edit],[data-control=toggle],[data-control=done]').count(),0);
  assert.equal(await options.locator('.options-fingering,[data-action=generate],[data-score-transpose]').count(),0);
  assert.deepEqual(await options.locator('[data-control-action]').evaluateAll(rows=>rows.map(row=>row.dataset.controlAction)),['previous','next','practiceSettings']);
  await page.screenshot({path:output+'/reading-options.png'});await options.locator('[data-options-close]').click();
  await page.keyboard.press('p');assert.equal(await page.locator('.practice-overview').count(),0);
  assert.match(await page.locator('.toast').innerText(),/available for reading/);
  const savedPage=await page.locator('#app').getAttribute('data-page');
  await page.keyboard.press('Escape');await page.locator('.library').waitFor();await open();
  assert.equal(await page.locator('#app').getAttribute('data-page'),savedPage);
  assert.equal(await page.evaluate(file=>localStorage.getItem('iso-viewer-dev/'+file),file),Buffer.from(bytes).toString('base64'));
  assert.deepEqual(errors,[]);
  const result={url,pages:manifest.pages.length,events:owners.length,unpitched:owners.filter(o=>o.eventKind==='unpitched').length,
    ordinaryReader:true,noFabricatedKeyboardSeats:true,physicalActionsGated:true,sourceBytesUnchanged:true,
    reopensSavedView:true,percussiveHeadObserved:!!dead,techniqueLabelsObserved,pageErrors:errors};
  await writeFile(output+'/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
} catch(error) {
  await page.screenshot({path:output+'/failure.png'});console.error(await page.locator('body').innerText());throw error;
} finally {await context.close();await browser.close();}
