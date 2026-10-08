import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {strToU8} from 'fflate';
import {ensurePianoReady} from '../src/piano-readiness';
import {archivePackage,hashBytes,importPackage,selectPresentation} from '../src/package';
import {publishPreparedNative,publishPackage} from '../src/publication';
import {corrected,initialPersonal,fingerFor,personalStorageName,legacyPersonalStorageName} from '../src/state';
import {loadPersonalJournal,PersonalJournalError} from '../src/personal-journal';
import {stagePresentationInstall} from '../src/presentation-install';
import {prepareRetainedEdition} from '../src/retained-editions';
import type {Entry} from '../src/state';
import {runPianoReadiness,type ReadinessWorker} from '../src/piano-readiness-job';
import {readinessWorkerResult} from '../src/piano-readiness-worker-protocol';
import {packagePianoPresentation} from '../src/piano-package-presentation';
import {renderScorePresentation} from '../vendor/iso-notation/src/render/janko/score-presentation';
import {resolveJankoOptions,resolveJankoTokens} from '../vendor/iso-notation/src/render/janko/types';
import {CALCULATED_HAND_SCORE_RENDERING_ENGINE,SCORE_RENDERING_ENGINE,SCORE_RENDERING_RECIPE_VERSION} from '../vendor/iso-notation/src/render/janko/score-rendering-recipe';
import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';
import type {SourceHandRequirement} from '../vendor/iso-notation/src/model/physical-source-constraints';

async function prepared({reference=true,recipe=true,dual=false,leap=false}={}){
  const source:QuantizedGridScore&{sourceHandRequirements:SourceHandRequirement[]}={id:'authored-readiness-piano',title:'Piano study',composer:'Fixture',
    ticksPerBeat:48,totalTicks:192,sourceBarTicks:[0,192],productionLayout:true,notes:[48,50,52,53,55,57].map((pitch,i)=>({id:`owner-${i}`,
      pitch:{octave:Math.floor(pitch/12),pitchClass:pitch%12},startTick:24+i*24,durationTicks:24,hand:'RH'})),
    barlines:[{tick:0,barNumber:1,type:'regular'},{tick:192,barNumber:2,type:'final'}],
    timeSignatures:[{tick:0,numerator:4,denominator:4}],tempos:[],dynamics:[],pedals:[],sourceHandRequirements:[]};
  if(leap)source.notes=[54,66,32,75].map((pitch,i)=>({id:'owner-'+i,pitch:{octave:Math.floor(pitch/12),pitchClass:pitch%12},
    startTick:i<2?24:72,durationTicks:48,hand:pitch<60?'LH':'RH'}));
  source.sourceHandRequirements=source.notes.map(n=>({version:'source-hand-requirement-v1',ownerId:n.id,hand:n.hand,
    guard:{pitch:12*n.pitch.octave+n.pitch.pitchClass,startTick:n.startTick,durationTicks:n.durationTicks},
    provenance:{kind:'source-instruction',reference:'Authored fixture explicit right-hand instruction'}}));
  if(reference)source.referencePerformanceTempo={version:'reference-performance-tempo-v1',bpm:100,beat:{numerator:1,denominator:4},
    provenance:{kind:'editorial',reference:'Explicit authored fixture clock'}};
  const sourceBytes=strToU8(JSON.stringify(source)),sourceSha256=await hashBytes(sourceBytes),
    r={version:SCORE_RENDERING_RECIPE_VERSION,engineId:SCORE_RENDERING_ENGINE,sourceSha256,
      options:resolveJankoOptions({measuresPerSystem:1}),tokens:resolveJankoTokens({ticksPerMeasure:192}),
      baseline:{pageSha256:['a'.repeat(64)],seatSha256:'b'.repeat(64)}},rendered=renderScorePresentation(source,r);
  assert.deepEqual(rendered.lint.violations,[]);assert.deepEqual(rendered.lint.warnings,[]);
  r.baseline={pageSha256:await Promise.all(rendered.rawPages.map(hashBytes)),seatSha256:await hashBytes(JSON.stringify(rendered.seats))};
  const published=await publishPreparedNative({source:sourceBytes,metadata:{title:source.title,composer:source.composer,provenance:['Authored real-engine test']},
    engineVersion:SCORE_RENDERING_ENGINE,createdAt:'2026-10-07',
    font:{name:'fonts/URWGothic-Demi.otf',bytes:readFileSync(new URL('../vendor/iso-notation/public/fonts/URWGothic-Demi.otf',import.meta.url))},
    notices:{'notices/fixture.txt':strToU8('Authored musical data; bundled renderer/font are existing repository assets.')},
    presentations:(dual?['janko-four-row','conventional-piano'] as const:['janko-four-row'] as const).map(layoutId=>({layoutId,seats:rendered.seats,pages:rendered.pages}))},
    new Uint8Array([...Buffer.from('MThd'),0,0,0,6,0,0,0,1,0,48,...Buffer.from('MTrk'),0,0,0,12,0,0x90,60,80,48,0x80,60,0,0,0xff,0x2f,0])),
    p=published.package,m=structuredClone(p.manifest),files={...p.files};delete files['manifest.json'];
  if(recipe){files['rendering-recipe.json']=strToU8(JSON.stringify(r));m.renderingRecipe='rendering-recipe.json';
    m.presentations!['janko-four-row']!.renderingRecipe='rendering-recipe.json';m.files['rendering-recipe.json']=await hashBytes(files['rendering-recipe.json']);}
  return{bytes:archivePackage(m,files),p:await importPackage(archivePackage(m,files)),source,r};
}

test('genuine fixed-page Jankó calculation becomes complete editable ready without a replacement certificate or musical mutation',async()=>{
  const original=await prepared({recipe:false}),before=await hashBytes(original.bytes),q=await ensurePianoReady({packageBytes:original.bytes,layout:'janko-four-row',performingHandPolicy:'retain-imported'});
  assert.equal(q.status,'editable','message' in q?q.message:undefined);
  assert.deepEqual(q.availableFingerPresentations,['annotations']);assert.equal(q.layer.attacks.length,6);
  assert.deepEqual(q.layer.attacks.map(a=>a.hand),original.source.notes.map(n=>n.hand));
  assert.ok((q.layer.operatorConstraints as Array<{provenance:{kind:string}}>).every(c=>c.provenance.kind==='editorial-hand-retention'));
  assert.equal(q.layer.actionCertificate,undefined);
  assert.deepEqual(q.package.sourceScore,original.source);assert.deepEqual(q.package.pages,original.p.pages);assert.deepEqual(q.package.seats,original.p.seats);
  assert.deepEqual(q.package.referenceMidi,original.p.referenceMidi);
  assert.equal(q.package.sourceRevision,original.p.sourceRevision);assert.equal(await hashBytes(original.bytes),before);
  assert.deepEqual((await importPackage(q.packageBytes)).fingerLayer,q.layer);
  const invalid=await ensurePianoReady({packageBytes:q.packageBytes,layout:'janko-four-row',performingHandPolicy:'unknown' as 'calculate'});
  assert.equal(invalid.status,'unsupported');assert.equal(invalid.code,'performing-hand-policy');assert.deepEqual(invalid.retainedPackageBytes,q.packageBytes);
  const state=initialPersonal(q.package),seat=q.package.seats[0],first=fingerFor(q.package,state,seat)!,replacement=first===5?4:5,
    edited=corrected(q.package,state,seat,replacement),again=await ensurePianoReady({packageBytes:q.packageBytes,layout:'janko-four-row',personal:edited,intent:'read-retained'});
  assert.equal(again.status,'editable','message' in again?again.message:undefined);
  assert.ok(again.calculationDiagnostics.some(d=>d.code==='operator-edit-not-certified'));
  assert.deepEqual(again.personal,edited);assert.equal(fingerFor(again.package,again.personal!,seat),replacement);
  const regenerated=await ensurePianoReady({packageBytes:q.packageBytes,layout:'janko-four-row',personal:edited,forceRecalculate:true,performingHandPolicy:'retain-imported'});
  assert.equal(regenerated.status,'editable','message' in regenerated?regenerated.message:undefined);
  assert.equal(fingerFor(regenerated.package,regenerated.personal!,seat),replacement);
  assert.deepEqual(regenerated.personal!.overrides,edited.overrides);assert.equal(regenerated.personal!.history.length,1);
  assert.deepEqual(regenerated.personal!.history[0],q.layer);
  assert.deepEqual(regenerated.package.pages,q.package.pages);
  const changedAgain=corrected(regenerated.package,regenerated.personal!,seat,first),rerun=await ensurePianoReady({
    packageBytes:regenerated.packageBytes,layout:'janko-four-row',personal:changedAgain,forceRecalculate:true,performingHandPolicy:'retain-imported'});
  assert.equal(rerun.status,'editable','message' in rerun?rerun.message:undefined);
  assert.equal(fingerFor(rerun.package,rerun.personal!,seat),first);assert.equal(rerun.personal!.history.length,2);
  assert.deepEqual(rerun.personal!.history[0],q.layer);assert.deepEqual(rerun.personal!.history[1],regenerated.layer);
});

test('missing conventional layout is genuinely generated, replayed and shared while original companion/source bytes survive',async()=>{
  const original=await prepared(),q=await ensurePianoReady({packageBytes:original.bytes,layout:'conventional-piano',performingHandPolicy:'retain-imported'});
  assert.equal(q.status,'editable','message' in q?q.message:undefined);
  assert.equal(q.package.keyboardLayout,'conventional-piano');assert.equal(q.layer.plannerVersion,'finite-static-piano-assignments-v1');
  assert.equal(q.package.renderingRecipe!.engineId,CALCULATED_HAND_SCORE_RENDERING_ENGINE);
  assert.equal(q.package.renderingRecipe!.options.performingHandPolicy,'source-owned-v1');
  assert.ok(q.package.score.performingHandPresentation?.identity);
  assert.equal(q.package.annotationGeometry!.seats.length,q.package.seats.length);
  assert.equal(q.package.renderingRecipe!.options.standaloneLongMarker,'hollow-stem');
  assert.equal(q.package.renderingRecipe!.options.authoredRestMode,'source');
  assert.equal(original.p.renderingRecipe!.engineId,SCORE_RENDERING_ENGINE);
  assert.deepEqual((await selectPresentation(q.package,'janko-four-row')).renderingRecipe,original.p.renderingRecipe);
  assert.equal(q.layer.actionCertificate,undefined);assert.equal(q.layer.attacks.length,6);
  const rr=await selectPresentation(q.package,'janko-four-row');assert.deepEqual(rr.pages,original.p.pages);assert.deepEqual(rr.seats,original.p.seats);
  assert.deepEqual(q.package.files['source-score.json'],original.p.files['source-score.json']);
  assert.deepEqual(q.package.referenceMidi,original.p.referenceMidi);
  const worker:ReadinessWorker={onmessage:null,onerror:null,terminate(){},postMessage(){
    worker.onmessage?.({data:{type:'complete',result:readinessWorkerResult(q)}} as MessageEvent<any>);
  }},transferred=await runPianoReadiness({packageBytes:original.bytes,layout:'conventional-piano',performingHandPolicy:'retain-imported'},()=>worker);
  assert.equal(transferred.status,q.status,'message' in transferred?transferred.message:undefined);
  const shared=await publishPackage(q.package),reimported=await importPackage(shared.bytes,{keyboardLayout:'conventional-piano'});
  assert.deepEqual(reimported.fingerLayer,q.layer);assert.equal(reimported.sourceSha256,original.p.sourceSha256);
  const alternate=await ensurePianoReady({packageBytes:shared.bytes,layout:'janko-four-row',performingHandPolicy:'retain-imported'});
  assert.equal(alternate.status,'editable','message' in alternate?alternate.message:undefined);
  assert.deepEqual((await selectPresentation(alternate.package,'conventional-piano')).pages,q.package.pages);
});

test('missing reference, missing renderer, real search exhaustion and cancellation retain exact prior archive',async()=>{
  const missing=await prepared({reference:false}),none=await ensurePianoReady({packageBytes:missing.bytes,layout:'janko-four-row'});
  assert.equal(none.status,'needs-data');
  assert.equal(none.code,'reference-tempo');assert.deepEqual(none.retainedPackageBytes,missing.bytes);
  assert.match(none.message,/duration unit and rate per minute/);assert.doesNotMatch(none.message,/\bbeat\b/);
  const withContext=await ensurePianoReady({packageBytes:missing.bytes,layout:'janko-four-row',referenceTempo:{
    version:'reference-performance-tempo-v1',bpm:90,beat:{numerator:1,denominator:4},provenance:{kind:'editorial',reference:'Explicit fixture player choice'}},performingHandPolicy:'retain-imported'});
  assert.equal(withContext.status,'editable','message' in withContext?withContext.message:undefined);
  assert.equal(withContext.package.sourceScore!.referencePerformanceTempo,undefined);
  assert.deepEqual(withContext.package.files['source-score.json'],missing.p.files['source-score.json']);
  const original=await prepared({recipe:false}),unsupported=await ensurePianoReady({packageBytes:original.bytes,layout:'conventional-piano'});
  assert.equal(unsupported.status,'unsupported');
  assert.equal(unsupported.code,'presentation-preparation');assert.deepEqual(unsupported.retainedPackageBytes,original.bytes);
  const exhausted=await ensurePianoReady({packageBytes:original.bytes,layout:'janko-four-row',maxExpansions:1});
  assert.equal(exhausted.status,'search-exhausted');
  assert.match(exhausted.message,/bounded.*search/);assert.doesNotMatch(exhausted.message,/anatomically impossible/);assert.deepEqual(exhausted.retainedPackageBytes,original.bytes);
  const c=new AbortController(),cancelled=await ensurePianoReady({packageBytes:original.bytes,layout:'janko-four-row',signal:c.signal,onProgress:()=>c.abort()});
  assert.equal(cancelled.status,'cancelled');assert.deepEqual(cancelled.retainedPackageBytes,original.bytes);
});

test('movement-model limitation yields complete editable both-layout fingers, honest warning and strict share/reimport',async()=>{
  const original=await prepared({leap:true,dual:true,recipe:false});
  let bytes=original.bytes;
  for(const layout of ['janko-four-row','conventional-piano'] as const){
    const q=await ensurePianoReady({packageBytes:bytes,layout});
    assert.equal(q.status,'editable','message' in q?q.message:undefined);
    assert.equal(q.layer.version,'piano-finger-assignments-v1');assert.equal(q.layer.attacks.length,4);
    assert.ok(q.calculationDiagnostics.some(w=>w.code==='exact-contact-span'));
    assert.equal((q.layer.execution as {status:string}).status,'not-certified');
    assert.deepEqual(q.package.sourceScore,original.source);assert.equal(q.package.sourceRevision,original.p.sourceRevision);
    assert.deepEqual(q.package.pages,original.p.pages);assert.deepEqual(q.availableFingerPresentations,['annotations']);
    const state=initialPersonal(q.package),seat=q.package.seats[0];
    assert.ok(fingerFor(q.package,state,seat));const next=corrected(q.package,state,seat,5);
    assert.equal(fingerFor(q.package,next,seat),5);
    const shared=await publishPackage(q.package),p=await importPackage(shared.bytes,{keyboardLayout:layout});
    assert.deepEqual(p.fingerLayer,q.layer);bytes=shared.bytes;
    const cached=await ensurePianoReady({packageBytes:bytes,layout});
    assert.equal(cached.status,'editable','message' in cached?cached.message:undefined);
    assert.deepEqual(cached.layer,q.layer);
  }
});

test('original inventory tampering and stale personal authority are refused without re-pinning or deleting prior bytes',async()=>{
  const original=await prepared({dual:true}),files={...original.p.files};files[original.p.manifest.pages[0]]=files[original.p.manifest.pages[0]].slice();
  files[original.p.manifest.pages[0]][20]^=1;
  const bytes=archivePackage(original.p.manifest,files),q=await ensurePianoReady({packageBytes:bytes,layout:'janko-four-row'});
  assert.equal(q.status,'unsupported');assert.match(q.message,/Integrity/);
  assert.deepEqual(q.retainedPackageBytes,bytes);
  const state=initialPersonal(original.p);state.binding!.sourceRevision='a'.repeat(64);
  const conflict=await ensurePianoReady({packageBytes:original.bytes,layout:'janko-four-row',personal:state});
  assert.equal(conflict.status,'conflict');assert.deepEqual(conflict.retainedPackageBytes,original.bytes);
});

test('new requests supersede automatic retention for both keyboards, preserve source authority and cache only matching full preparation',async()=>{
 const original=await prepared({dual:true});
 for(const layout of ['janko-four-row','conventional-piano'] as const){
  const old=await ensurePianoReady({packageBytes:original.bytes,layout,performingHandPolicy:'retain-imported'});
  assert.equal(old.status,'editable');assert.equal(old.package.preparationIdentity!.handPolicy,'retain-imported');
  const read=await ensurePianoReady({packageBytes:old.packageBytes,layout,intent:'read-retained'});
  assert.equal(read.status,'editable');assert.deepEqual(read.packageBytes,old.packageBytes);assert.deepEqual(read.layer,old.layer);
  const q=await ensurePianoReady({packageBytes:old.packageBytes,layout});
  assert.ok('package' in q,'message' in q?q.message:'Expected complete preparation');
  assert.ok('layer' in q,'A new calculation must have a complete layer');
  assert.equal(q.package.preparationIdentity!.handPolicy,'calculate');
  assert.deepEqual(q.layer.attacks.map(a=>a.hand),original.source.notes.map(n=>n.hand));
  assert.ok(!Array.isArray(q.layer.operatorConstraints)||q.layer.operatorConstraints.every((c:any)=>c.provenance.kind!=='editorial-hand-retention'));
  assert.deepEqual(q.package.files['source-score.json'],original.p.files['source-score.json']);
  let progress=0;const cached=await ensurePianoReady({packageBytes:q.packageBytes,layout,onProgress:()=>progress++});
  assert.ok('package' in cached);assert.equal(progress,0);assert.deepEqual(cached.packageBytes,q.packageBytes);
  const bounded=await ensurePianoReady({packageBytes:q.packageBytes,layout,maxExpansions:1});
  assert.equal(bounded.status,'search-exhausted');assert.deepEqual(bounded.retainedPackageBytes,q.packageBytes);
 }
});

test('retained pitch reading requires neither invented tempo nor a fabricated finger layer',async()=>{
 const original=await prepared({reference:false,recipe:false});let progress=0;
 const q=await ensurePianoReady({packageBytes:original.bytes,layout:'janko-four-row',intent:'read-retained',onProgress:()=>progress++});
 assert.equal(q.status,'reading');assert.equal('layer' in q,false);assert.equal(progress,0);
 assert.deepEqual(q.packageBytes,original.bytes);assert.deepEqual(q.package.pages,original.p.pages);assert.deepEqual(q.package.seats,original.p.seats);
 assert.deepEqual(q.availableFingerPresentations,[]);assert.equal(q.package.sourceScore!.referencePerformanceTempo,undefined);
 const explicit=await ensurePianoReady({packageBytes:original.bytes,layout:'janko-four-row',intent:'calculate'});
  assert.equal(explicit.status,'needs-data');assert.equal(explicit.code,'reference-tempo');
  const worker:ReadinessWorker={onmessage:null,onerror:null,terminate(){},async postMessage(request){
    const result=readinessWorkerResult(await ensurePianoReady(request));
    worker.onmessage?.({data:structuredClone({type:'complete',result})} as MessageEvent<any>);
  }};
  const transferred=await runPianoReadiness({packageBytes:original.bytes,layout:'janko-four-row',intent:'read-retained'},()=>worker);
  assert.equal(transferred.status,'reading');assert.deepEqual(transferred.package.pages,original.p.pages);
  const forged:ReadinessWorker={onmessage:null,onerror:null,terminate(){},postMessage(){
    forged.onmessage?.({data:{type:'complete',result:readinessWorkerResult(q)}} as MessageEvent<any>);
  }};
  const rejected=await runPianoReadiness({packageBytes:original.bytes,layout:'janko-four-row',intent:'calculate'},()=>forged);
  assert.equal(rejected.status,'unsupported');assert.deepEqual(rejected.retainedPackageBytes,original.bytes);
});

test('repinned passive preparation metadata cannot substitute for independently matching package facts',async()=>{
 const original=await prepared(),q=await ensurePianoReady({packageBytes:original.bytes,layout:'janko-four-row',performingHandPolicy:'retain-imported'});
 assert.equal(q.status,'editable');
 for(const key of ['sourceSha256','assignmentSha256','authoritySha256','contextSha256','payloadSha256'] as const){
  const m=structuredClone(q.package.collectionManifest??q.package.manifest),identity=structuredClone(m.preparationIdentity!);
  identity[key]='f'.repeat(64);m.preparationIdentity=m.presentations!['janko-four-row']!.preparationIdentity=identity;
  const files={...q.package.files};delete files['manifest.json'];const bytes=archivePackage(m,files);
  await assert.rejects(importPackage(bytes),/preparation identity differs/);
  const result=await ensurePianoReady({packageBytes:bytes,layout:'janko-four-row'});
  assert.equal(result.status,'unsupported');assert.deepEqual(result.retainedPackageBytes,bytes);
 }
});

test('reader worker binds internally valid output to original requested context, hand policy, recipe and correction journal',async()=>{
 const original=await prepared({reference:false}),referenceTempo={version:'reference-performance-tempo-v1' as const,bpm:90,
  beat:{numerator:1,denominator:4},provenance:{kind:'editorial' as const,reference:'Authored request clock'}},
  request={packageBytes:original.bytes,layout:'janko-four-row' as const,referenceTempo},
  real=await ensurePianoReady(request);
 assert.ok('layer' in real);
 const replay=async(result:ReturnType<typeof readinessWorkerResult>)=>{
  const worker:ReadinessWorker={onmessage:null,onerror:null,terminate(){},postMessage(){
   worker.onmessage?.({data:structuredClone({type:'complete',result})} as MessageEvent<any>);
  }};
  return runPianoReadiness(request,()=>worker);
 };
 assert.equal((await replay(readinessWorkerResult(real))).status,real.status);
 const otherContext=await ensurePianoReady({...request,referenceTempo:{...referenceTempo,bpm:91}}),
  otherPolicy=await ensurePianoReady({...request,performingHandPolicy:'retain-imported'});
 assert.ok('layer' in otherContext);assert.ok('layer' in otherPolicy);
 const recipe=structuredClone(real.package.renderingRecipe!);recipe.options.measuresPerSystem=2;
 const otherBytes=await packagePianoPresentation(real.package,{layoutId:request.layout,sourceSha256:real.package.sourceSha256!,
  score:JSON.stringify(real.package.score),seats:JSON.stringify(real.package.seats),pages:real.package.pages,
  layer:real.layer,effectiveHandSha256:real.package.effectiveHandSha256!,engineVersion:real.package.manifest.engineVersion,recipe,
  preparationRequest:{handPolicy:'calculate'}}),otherRecipe=await importPackage(otherBytes),
  recipeWire={...readinessWorkerResult(real),packageBytes:otherBytes,layer:otherRecipe.fingerLayer!};
 for(const [wire,message] of [[readinessWorkerResult(otherContext),/another calculation context/],
   [readinessWorkerResult(otherPolicy),/another hand policy/],[recipeWire,/fixed-page edition or recipe/]] as const){
  const rejected=await replay(wire);assert.equal(rejected.status,'unsupported');assert.match(rejected.message,message);
  assert.deepEqual(rejected.retainedPackageBytes,original.bytes);
 }
 const edited=corrected(real.package,initialPersonal(real.package),real.package.seats[0],real.layer.attacks[0].finger===5?4:5),
  nextRequest={packageBytes:real.packageBytes,layout:request.layout,personal:edited,forceRecalculate:true},
  next=await ensurePianoReady(nextRequest);assert.equal(next.status,'editable');
 const forged=readinessWorkerResult(next);assert.ok('personal' in forged);forged.personal=initialPersonal(next.package);
 const worker:ReadinessWorker={onmessage:null,onerror:null,terminate(){},postMessage(){
  worker.onmessage?.({data:{type:'complete',result:forged}} as MessageEvent<any>);
 }},lostJournal=await runPianoReadiness(nextRequest,()=>worker);
 assert.equal(lostJournal.status,'unsupported');assert.match(lostJournal.message,/saved correction journal/);
 assert.deepEqual(lostJournal.retainedPackageBytes,real.packageBytes);
});

test('earlier edition reads exact pages and its own correction journal, without a calculator or writes',async()=>{
 const original=await prepared(),old=await ensurePianoReady({packageBytes:original.bytes,layout:'janko-four-row',performingHandPolicy:'retain-imported'});
 assert.equal(old.status,'editable');const first=old.layer.attacks[0].finger,replacement=first===5?4:5,
  state=corrected(old.package,initialPersonal(old.package),old.package.seats[0],replacement),key=(await import('../src/state')).personalStorageName(old.package.sourceRevision!,old.package),
  file=`package-${await hashBytes(old.packageBytes)}.isoscore`,oldStateFile=`state-version-${'a'.repeat(64)}.json`,entry:Entry={
   id:old.package.sourceRevision!,file,metadata:old.package.manifest.metadata,importedAt:'now',personalFiles:{[key]:oldStateFile}},
  stored=new Map<string,Uint8Array>([[file,old.packageBytes],[oldStateFile,strToU8(JSON.stringify(state))]]),
  next=await ensurePianoReady({packageBytes:old.packageBytes,layout:'janko-four-row',performingHandPolicy:'retain-imported',personal:state,forceRecalculate:true});
 assert.equal(next.status,'editable');
 const installed=await stagePresentationInstall({async write(name,bytes){stored.set(name,bytes);}},{entry,entries:[entry],personalKey:key,
  packageBytes:next.packageBytes,personalBytes:strToU8(JSON.stringify(next.personal))});
 const restored=await prepareRetainedEdition({async read(name){return stored.get(name)??null;}},installed.entry,file,'janko-four-row');
 assert.deepEqual(restored.packageBytes,old.packageBytes);assert.deepEqual(restored.package.pages,old.package.pages);
 assert.deepEqual(restored.package.seats,old.package.seats);assert.deepEqual(restored.personal,state);
 assert.deepEqual(restored.personalFiles,entry.personalFiles);
 await assert.rejects(prepareRetainedEdition({async read(){assert.fail('Unlisted files must not be read');}},installed.entry,'../unknown','janko-four-row'),/not a declared/);
 const corrupted=new Uint8Array(old.packageBytes);corrupted[20]^=1;
 await assert.rejects(prepareRetainedEdition({async read(){return corrupted;}},installed.entry,file,'janko-four-row'),/saved identity/);
});

test('an archived package with a missing declared journal cannot restore an empty state or borrow another valid legacy journal',async()=>{
 const original=await prepared(),calculated=await ensurePianoReady({packageBytes:original.bytes,layout:'janko-four-row',performingHandPolicy:'retain-imported'});
 assert.equal(calculated.status,'editable');
 // Public authored legacy edition with a genuine complete layer, before the
 // optional Viewer preparation identity/storage suffix was introduced.
 const manifest=structuredClone(calculated.package.collectionManifest??calculated.package.manifest),files={...calculated.package.files};
 delete files['manifest.json'];delete manifest.preparationIdentity;delete manifest.presentations!['janko-four-row']!.preparationIdentity;
 const archive=archivePackage(manifest,files),p=await importPackage(archive),file=`package-${await hashBytes(archive)}.isoscore`,
  key=personalStorageName(p.sourceRevision!,p),legacy=legacyPersonalStorageName(p)!;
 assert.ok(legacy);
 const other=corrected(p,initialPersonal(p),p.seats[0],p.fingerLayer!.attacks[0].finger===1?2:1),
  missing=`state-version-${'f'.repeat(64)}.json`,entry:Entry={id:p.sourceRevision!,file:`package-${await hashBytes(calculated.packageBytes)}.isoscore`,
   metadata:p.manifest.metadata,importedAt:'now',retainedPackages:[file],editionPersonalFiles:{[file]:{[key]:missing}}},
  before=structuredClone(entry),library=strToU8(JSON.stringify({version:1,entries:[entry]})),
  stored=new Map<string,Uint8Array>([[file,archive],[legacy,strToU8(JSON.stringify(other))],['library.json',library]]),reads:string[]=[];
 let writes=0;const host={async read(name:string){reads.push(name);return stored.get(name)??null;},async write(){writes++;}};
 await assert.rejects((async()=>{
  const retained=await prepareRetainedEdition(host,entry,file,'janko-four-row');
  await stagePresentationInstall(host,{entry,entries:[entry],packageBytes:retained.packageBytes,
   personalBytes:strToU8(JSON.stringify(retained.personal)),personalKey:key,personalFiles:retained.personalFiles});
 })(),error=>error instanceof PersonalJournalError&&error.code==='retained-journal');
 assert.equal(writes,0);assert.deepEqual(entry,before);assert.deepEqual(stored.get('library.json'),library);assert.deepEqual(reads,[file,missing]);
 await assert.rejects(loadPersonalJournal(host,{...entry,personalFiles:{[key]:missing}},p),error=>
  error instanceof PersonalJournalError&&error.code==='personal-journal');
 assert.equal(reads.includes(legacy),false,'Even an independently valid alternate legacy journal is not a missing declared pointer');
});
