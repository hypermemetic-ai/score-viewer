import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {strToU8} from 'fflate';
import {ensurePianoReady} from '../src/piano-readiness';
import {archivePackage,hashBytes,importPackage,selectPresentation,type Manifest} from '../src/package';
import {publishPreparedNative,publishPackage} from '../src/publication';
import {corrected,initialPersonal,fingerFor} from '../src/state';
import {renderScorePresentation} from '../vendor/iso-notation/src/render/janko/score-presentation';
import {resolveJankoOptions,resolveJankoTokens} from '../vendor/iso-notation/src/render/janko/types';
import {APPROVED_SCORE_RENDERING_ENGINE,SCORE_RENDERING_ENGINE,SCORE_RENDERING_RECIPE_VERSION} from '../vendor/iso-notation/src/render/janko/score-rendering-recipe';
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
  const original=await prepared({recipe:false}),before=await hashBytes(original.bytes),q=await ensurePianoReady({packageBytes:original.bytes,layout:'janko-four-row'});
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
    edited=corrected(q.package,state,seat,replacement),again=await ensurePianoReady({packageBytes:q.packageBytes,layout:'janko-four-row',personal:edited});
  assert.equal(again.status,'editable','message' in again?again.message:undefined);
  assert.ok(again.calculationDiagnostics.some(d=>d.code==='operator-edit-not-certified'));
  assert.deepEqual(again.personal,edited);assert.equal(fingerFor(again.package,again.personal!,seat),replacement);
  const regenerated=await ensurePianoReady({packageBytes:q.packageBytes,layout:'janko-four-row',personal:edited,forceRecalculate:true});
  assert.equal(regenerated.status,'editable','message' in regenerated?regenerated.message:undefined);
  assert.equal(fingerFor(regenerated.package,regenerated.personal!,seat),replacement);
  assert.deepEqual(regenerated.personal!.overrides,edited.overrides);assert.equal(regenerated.personal!.history.length,1);
  assert.deepEqual(regenerated.personal!.history[0],q.layer);
  assert.deepEqual(regenerated.package.pages,q.package.pages);
  const changedAgain=corrected(regenerated.package,regenerated.personal!,seat,first),rerun=await ensurePianoReady({
    packageBytes:regenerated.packageBytes,layout:'janko-four-row',personal:changedAgain,forceRecalculate:true});
  assert.equal(rerun.status,'editable','message' in rerun?rerun.message:undefined);
  assert.equal(fingerFor(rerun.package,rerun.personal!,seat),first);assert.equal(rerun.personal!.history.length,2);
  assert.deepEqual(rerun.personal!.history[0],q.layer);assert.deepEqual(rerun.personal!.history[1],regenerated.layer);
});

test('missing conventional layout is genuinely generated, replayed and shared while original companion/source bytes survive',async()=>{
  const original=await prepared(),q=await ensurePianoReady({packageBytes:original.bytes,layout:'conventional-piano'});
  assert.equal(q.status,'editable','message' in q?q.message:undefined);
  assert.equal(q.package.keyboardLayout,'conventional-piano');assert.equal(q.layer.plannerVersion,'finite-static-piano-assignments-v1');
  assert.equal(q.package.renderingRecipe!.engineId,APPROVED_SCORE_RENDERING_ENGINE);
  assert.equal(q.package.renderingRecipe!.options.standaloneLongMarker,'hollow-stem');
  assert.equal(q.package.renderingRecipe!.options.authoredRestMode,'source');
  assert.equal(original.p.renderingRecipe!.engineId,SCORE_RENDERING_ENGINE);
  assert.deepEqual((await selectPresentation(q.package,'janko-four-row')).renderingRecipe,original.p.renderingRecipe);
  assert.equal(q.layer.actionCertificate,undefined);assert.equal(q.layer.attacks.length,6);
  const rr=await selectPresentation(q.package,'janko-four-row');assert.deepEqual(rr.pages,original.p.pages);assert.deepEqual(rr.seats,original.p.seats);
  assert.deepEqual(q.package.files['source-score.json'],original.p.files['source-score.json']);
  assert.deepEqual(q.package.referenceMidi,original.p.referenceMidi);
  const shared=await publishPackage(q.package),reimported=await importPackage(shared.bytes,{keyboardLayout:'conventional-piano'});
  assert.deepEqual(reimported.fingerLayer,q.layer);assert.equal(reimported.sourceSha256,original.p.sourceSha256);
  const alternate=await ensurePianoReady({packageBytes:shared.bytes,layout:'janko-four-row'});
  assert.equal(alternate.status,'editable','message' in alternate?alternate.message:undefined);
  assert.deepEqual((await selectPresentation(alternate.package,'conventional-piano')).pages,q.package.pages);
});

test('missing reference, missing renderer, real search exhaustion and cancellation retain exact prior archive',async()=>{
  const missing=await prepared({reference:false}),none=await ensurePianoReady({packageBytes:missing.bytes,layout:'janko-four-row'});
  assert.equal(none.status,'needs-data');
  assert.equal(none.code,'reference-tempo');assert.deepEqual(none.retainedPackageBytes,missing.bytes);
  assert.match(none.message,/duration unit and rate per minute/);assert.doesNotMatch(none.message,/\bbeat\b/);
  const withContext=await ensurePianoReady({packageBytes:missing.bytes,layout:'janko-four-row',referenceTempo:{
    version:'reference-performance-tempo-v1',bpm:90,beat:{numerator:1,denominator:4},provenance:{kind:'editorial',reference:'Explicit fixture player choice'}}});
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
