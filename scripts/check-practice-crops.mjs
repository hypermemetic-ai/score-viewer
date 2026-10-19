// Crop every measure of each given .tuna for practice, as Mechanics and Fingers draw them,
// and fail on any ink the crop cannot give an owner. Run it on the owner's library before
// a delivery: unit fixtures do not carry every mark the engraving can print.
//   PRACTICE_PLAYWRIGHT=<playwright-core/index.mjs> node scripts/check-practice-crops.mjs <file.tuna>...
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,basename} from 'node:path';
import {createServer as createViteServer} from 'vite';
const {chromium}=await import(process.env.PRACTICE_PLAYWRIGHT??'playwright-core');
const files=process.argv.slice(2);if(!files.length)throw Error('Give one or more .tuna files.');
const root=resolve('.');let vite,browser,failed=0;
const server=createServer((req,res)=>{if(req.url==='/__crop'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><main id="app"></main>');return;}vite.middlewares(req,res);});
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));vite=await createViteServer({root,configFile:root+'/vite.config.ts',server:{middlewareMode:true,hmr:false,ws:{server,clientPort:server.address().port,host:'127.0.0.1'}},appType:'custom'});
 browser=await chromium.launch({headless:true});const page=await (await browser.newContext()).newPage();
 await page.goto('http://127.0.0.1:'+server.address().port+'/__crop');
 for(const file of files){
  const result=await page.evaluate(async encoded=>{
   const [{importPackage,selectPresentation},{planPractice},{cropMeasure}]=await Promise.all([import('/src/package.ts'),import('/src/practice.ts'),import('/src/practice-passage.ts')]);
   const all=await importPackage(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),{allowLegacyTempo:true}),out=[];
   // A stand-in tempo: cropping does not depend on it, and many scores print none.
   const tempo={version:'reference-performance-tempo-v1',bpm:80,beat:{numerator:1,denominator:4},provenance:{kind:'editorial',reference:'crop check'}};
   for(const layout of all.availablePresentations?.length?all.availablePresentations:[undefined]){const p=layout?await selectPresentation(all,layout):all;
    if(!p.score.notes.some(n=>n.hand))continue;const plan=planPractice(p,undefined,undefined,p.score.referencePerformanceTempo?undefined:tempo),failures=[];
    for(let bar=0;bar<plan.barTicks.length-1;bar++){try{cropMeasure(p,plan,bar);}catch(e){failures.push(`${bar+1}: ${e.message}`);}}
    out.push({layout:layout??'saved',bars:plan.barTicks.length-1,failures});}
   return out;},(await readFile(file)).toString('base64')).catch(e=>[{layout:'open',bars:0,failures:[e.message.split('\n')[0]]}]);
  for(const r of result){failed+=r.failures.length;console.log(`${basename(file)} ${r.layout}: ${r.bars} measures, ${r.failures.length?r.failures.length+' unresolved\n  '+r.failures.join('\n  '):'all cropped'}`);}
 }
}finally{await browser?.close();await vite?.close();server.close();}
process.exitCode=failed?1:0;
