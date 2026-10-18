import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {importPackage} from '../src/package';
import {initialPersonal,collectionId} from '../src/state';
import {scoreOptionsMarkup} from '../src/score-options';
import {ensurePianoReady} from '../src/piano-readiness';

// The fingering calculator was abandoned: the viewer offers editing
// ergonomics and preserves editor-provided fingerings. It never calculates.
const src=(name:string)=>readFileSync(new URL(`../src/${name}`,import.meta.url),'utf8');

test('the viewer offers no way to calculate fingers or hands',async()=>{
 for(const file of ['main.ts','score-options.ts']){
  const text=src(file);
  for(const forbidden of [/['"]generate['"]/,/data-history/,/Calculated version/i,/Calculate fingers/i,/calculate a finger/i,/Calculation diagnostics/i,/Cancel calculation/i])
   assert.doesNotMatch(text,forbidden,`${file} still offers ${forbidden}`);
 }
 const bytes=new Uint8Array(readFileSync(new URL('../fixtures/authored-preparation-v1.tuna',import.meta.url))),p=await importPackage(bytes);
 const entry={id:collectionId(p),file:'study.tuna',metadata:p.manifest.metadata,importedAt:'2026-10-16'};
 for(const steps of [0,1]){
  const markup=scoreOptionsMarkup(entry,p,initialPersonal(p),{steps,min:-12,max:12},undefined,'',true);
  assert.doesNotMatch(markup,/calculat/i);assert.doesNotMatch(markup,/data-action="generate"/);
  assert.match(markup,/Hands come from the score/);assert.match(markup,/data-action="share"/);assert.match(markup,/data-action="pdf"/);
 }
});

test('no calculation worker or calculation request remains in the application',async()=>{
 const files=readdirSync(new URL('../src/',import.meta.url));
 assert.deepEqual(files.filter(name=>/\.worker\.ts$/.test(name)),[],'the viewer starts no background calculation');
 for(const gone of ['planner.worker.ts','piano-readiness.worker.ts','presentation.worker.ts','piano-readiness-job.ts','piano-readiness-worker-protocol.ts','presentation-generation.ts','piano-request-admission.ts','package-presentation.ts','piano-package-presentation.ts'])
  assert.equal(existsSync(new URL(`../src/${gone}`,import.meta.url)),false,gone);
 for(const name of files.filter(name=>name.endsWith('.ts')))
  assert.doesNotMatch(src(name),/from '\.\.\/test\//,`${name} must not depend on test fixture builders`);
 // Opening reads what the edition saved; an old calculation request is ignored.
 const bytes=new Uint8Array(readFileSync(new URL('../fixtures/authored-preparation-v1.tuna',import.meta.url)));
 const request={packageBytes:bytes,layout:'janko-four-row',intent:'calculate',performingHandPolicy:'calculate',maxExpansions:1} as any;
 const result=await ensurePianoReady(request);
 assert.equal(result.status,'editable','message' in result?result.message:undefined);
 if(result.status!=='editable')return;
 assert.deepEqual(result.packageBytes,bytes,'the saved edition is returned byte for byte');
});
