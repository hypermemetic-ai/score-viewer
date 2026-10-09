import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {sourcePackage,transferStudy} from '../test/support/hand-edition-fixture.ts';

const {chromium}=await import(process.env.PRACTICE_PLAYWRIGHT??'playwright-core');
const url=process.env.READING_URL??'http://127.0.0.1:5218',
  output=process.env.PIANO_ARTIFACTS??'/tmp/score-viewer-instrument-reading-validation/piano';
await mkdir(output,{recursive:true});
const source=transferStudy();
for(const event of source.notes)event.writtenPitch={...event.pitch,octave:event.pitch.octave+1};
const original=await sourcePackage(source),bytes=original.bytes,
  id=original.p.sourceRevision??original.p.manifest.revision,
  file=`package-${createHash('sha256').update(bytes).digest('hex')}.isoscore`;
const browser=await chromium.launch({executablePath:process.env.PRACTICE_CHROMIUM,headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
async function selected(){return page.evaluate(async()=>{
  const [{host},{importPackageForReading}]=await Promise.all([import('/src/host.ts'),import('/src/package.ts')]);
  const library=JSON.parse(new TextDecoder().decode(await host.read('library.json'))),entry=library.entries[0],
    p=await importPackageForReading(await host.read(entry.file));
  return {file:entry.file,steps:p.transposition?.steps??0,sourceRevision:p.sourceRevision,
    notes:(p.sourceScore??p.score).notes.map(event=>({id:event.id,eventKind:event.eventKind,pitch:event.pitch,writtenPitch:event.writtenPitch}))};
});}
async function transpose(steps){
  const field=page.locator('dialog[data-kind=options] [data-score-transpose]');
  await field.click();await field.fill(String(steps));await field.press('Enter');
  await page.waitForFunction(steps=>document.querySelector('dialog[data-kind=options] [data-score-transpose]')?.value===String(steps),steps,{timeout:120000});
}
try {
  await page.addInitScript(({encoded,metadata,id,file})=>{
    if(localStorage.getItem('piano-options-seeded'))return;
    localStorage.setItem('piano-options-seeded','1');
    const put=(name,value)=>localStorage.setItem('iso-viewer-dev/'+name,btoa(unescape(encodeURIComponent(JSON.stringify(value)))));
    localStorage.setItem('iso-viewer-dev/'+file,encoded);
    put('library.json',{version:1,entries:[{id,file,metadata,importedAt:'2026-10-08T00:00:00Z'}]});
    put('preferences.json',{version:1,libraryRotation:0,keyboardLayout:'janko-four-row'});
  },{encoded:Buffer.from(bytes).toString('base64'),metadata:original.p.manifest.metadata,id,file});
  await page.goto(url);await page.locator('.composer-entry').first().focus();await page.keyboard.press('ArrowRight');await page.locator('[data-open]').first().click();
  await page.locator('.reader').waitFor({timeout:120000});await page.keyboard.press('h');
  assert.equal(await page.locator('.toolbar [data-keyboard]').inputValue(),'janko-four-row');
  for(const action of ['practice','performance','edit'])assert.equal(await page.locator(`.toolbar [data-action=${action}]`).count(),1);
  await page.keyboard.press('o');await page.locator('dialog[data-kind=options] [data-score-transpose]').waitFor();
  assert.equal(await page.locator('dialog .score-options [data-action=generate]').count(),1);
  const baseline=await selected();assert.equal(baseline.sourceRevision,id);
  await transpose(1);const shifted=await selected();assert.equal(shifted.steps,1);
  for(const event of shifted.notes){const before=baseline.notes.find(note=>note.id===event.id);assert.ok(before);
    assert.equal(event.eventKind,'pitched');
    for(const field of ['pitch','writtenPitch'])assert.equal(event[field].octave*12+event[field].pitchClass,before[field].octave*12+before[field].pitchClass+1);
  }
  await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:output+'/piano-transposed-options.png'});
  await transpose(0);const restored=await selected();assert.equal(restored.steps,0);
  assert.deepEqual(restored.notes,baseline.notes);assert.equal(restored.sourceRevision,id);
  assert.equal(await page.evaluate(file=>localStorage.getItem('iso-viewer-dev/'+file),file),Buffer.from(bytes).toString('base64'));
  assert.deepEqual(errors,[]);
  const result={url,originalStudy:true,visiblePianoControls:true,scoreOptionsTransposition:true,
    actualAndWrittenPitchShiftTogether:true,restoredOriginalPitch:true,originalBytesUnchanged:true,pageErrors:errors};
  await writeFile(output+'/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(error){await page.screenshot({path:output+'/failure.png'});console.error(await page.locator('body').innerText());throw error;}
finally{await context.close();await browser.close();}
