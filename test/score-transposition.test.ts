import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {strToU8} from 'fflate';
import {ensurePianoReady} from '../src/piano-readiness';
import {archivePackage,hashBytes,importPackage} from '../src/package';
import {publishPreparedNative,publishPackage} from '../src/publication';
import {initialPersonal} from '../src/state';
import {runPianoReadiness,type ReadinessWorker} from '../src/piano-readiness-job';
import {readinessWorkerResult} from '../src/piano-readiness-worker-protocol';
import {admitPianoRequestResult} from '../src/piano-request-admission';
import {transposeScore,getScoreTransposition,getOriginalScorePackageBytes,scoreTranspositionRange,scoreTranspositionCompatible} from '../src/score-transposition';
import {identityHash} from '../src/piano-preparation-identity';
import {renderScorePresentation} from '../vendor/iso-notation/src/render/janko/score-presentation';
import {resolveJankoOptions,resolveJankoTokens} from '../vendor/iso-notation/src/render/janko/types';
import {SCORE_RENDERING_ENGINE,SCORE_RENDERING_RECIPE_VERSION} from '../vendor/iso-notation/src/render/janko/score-rendering-recipe';
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

test('complete absolute pitch transformation preserves timing, source owners and relation facts; unsupported projections refuse',async()=>{
 const {source}=await prepared(),s=structuredClone(source);
 s.repeatTies=[{id:'repeat-tie',fromNoteId:'owner-0',toNoteId:'owner-0',fromEventId:'from',toEventId:'to',fromTick:24,toTick:192,
  pitch:{octave:4,pitchClass:0},voice:'rh',fromBar:1,toBar:2,sourceFile:'authored.ly'}];
 s.writtenPresentation={sourceScoreId:s.id,sourceHash:'a'.repeat(64),performedTotalTicks:384,writtenBars:1,performedBars:2,repeats:[],occurrences:[],
  events:{notes:[{writtenIndex:0,performedIndex:0,overrides:{pitch:{octave:4,pitchClass:0},startTick:216}}]}};
 s.graceGroups=[{id:'grace',source:{file:'authored.ly',line:1,column:1,endLine:1,endColumn:2,bar:1},voice:'rh',staff:'rh',printedStaff:'rh',hand:'RH',kind:'grace',
  members:[{id:'grace-0',pitch:{octave:4,pitchClass:11},spelling:'b',duration:'16',beamStart:false,beamEnd:false,line:1,column:1,endLine:1,endColumn:2}],
  hostEventId:'host',hostKind:'note',occurrences:[{id:'occ',sourceBar:1,pass:1,tick:24,hostNoteIds:['owner-0']}]}];
 const before=structuredClone(s);
 for(const offset of [1,-1,12,-12]){const q=transposeScore(s,offset);
  assert.equal(q.notes[0].pitch.octave*12+q.notes[0].pitch.pitchClass,48+offset);
  assert.equal(q.repeatTies![0].pitch.octave*12+q.repeatTies![0].pitch.pitchClass,48+offset);
  assert.equal((q.writtenPresentation!.events.notes[0].overrides.pitch as any).octave*12+(q.writtenPresentation!.events.notes[0].overrides.pitch as any).pitchClass,48+offset);
  assert.equal(q.graceGroups![0].members[0].pitch!.octave*12+q.graceGroups![0].members[0].pitch!.pitchClass,59+offset);
  assert.equal((q as any).sourceHandRequirements[0].guard.pitch,48+offset);
  assert.deepEqual(q.notes.map(({pitch,...n})=>n),s.notes.map(({pitch,...n})=>n));
  assert.deepEqual(q.barlines,s.barlines);assert.deepEqual(q.timeSignatures,s.timeSignatures);
 }
 assert.deepEqual(s,before);
 const aliased=structuredClone(source);delete (aliased as any).sourceHandRequirements;aliased.notes[1].pitch=aliased.notes[0].pitch;
 const shiftedAlias=transposeScore(aliased,1);assert.deepEqual(shiftedAlias.notes[0].pitch,{octave:4,pitchClass:1});assert.deepEqual(shiftedAlias.notes[1].pitch,shiftedAlias.notes[0].pitch);assert.throws(()=>transposeScore(s,88),/range/);assert.throws(()=>transposeScore(s,1.5),/whole number/);
 assert.throws(()=>transposeScore({...s,relativePresentation:{} as any},1),/relative/);
 assert.throws(()=>transposeScore({...s,unknownPitch:48} as any,1),/unsupported pitch-bearing/);
 const stale=structuredClone(s);(stale as any).sourceHandRequirements[0].guard.pitch++;assert.throws(()=>transposeScore(stale,1),/stale source hand guard/);
});

for(const keyboard of ['janko-four-row','conventional-piano'] as const)test(`${keyboard} transposition freshly renders same hands, plans actual contacts and round trips independently`,async()=>{
 const original=await prepared(),request={packageBytes:original.bytes,layout:keyboard,transposeSteps:1} as const,
  q=await ensurePianoReady(request);
 assert.equal(q.status,'editable','message' in q?q.message:undefined);if(!('package' in q)||!('layer' in q))return;
 assert.equal(getScoreTransposition(q.package),1);assert.equal(q.package.preparationIdentity?.version,'viewer-piano-preparation-v4');
 assert.equal(q.package.calculatedHandReceipt?.version,'viewer-calculated-hand-edition-v3');
 assert.deepEqual(q.layer.attacks.map(a=>a.hand),original.source.notes.map(n=>n.hand));
 assert.deepEqual(q.layer.attacks.map(a=>a.pitch),original.source.notes.map(n=>n.pitch.octave*12+n.pitch.pitchClass+1));
 assert.notDeepEqual(q.package.pages,original.p.pages);assert.notDeepEqual(q.package.seats,original.p.seats);
 assert.deepEqual(getOriginalScorePackageBytes(q.package),original.bytes);assert.deepEqual(q.package.referenceMidi,original.p.referenceMidi);
 assert.deepEqual(q.package.transpositionOriginal!.sourceScore,original.source);assert.equal(q.personal,undefined);
 assert.deepEqual(scoreTranspositionRange(q.package),{min:-39,max:39});
 assert.equal(scoreTranspositionCompatible(q.package,original.p,keyboard),true);
 assert.equal(scoreTranspositionCompatible(original.p,q.package,keyboard),true);
 await admitPianoRequestResult(request,q.package,q.packageBytes,q.layer,undefined);
 const worker:ReadinessWorker={onmessage:null,onerror:null,terminate(){},postMessage(){worker.onmessage?.({data:{type:'complete',result:readinessWorkerResult(q)}} as MessageEvent<any>);}},
  received=await runPianoReadiness(request,()=>worker);
 assert.equal(received.status,q.status,'message' in received?received.message:undefined);
 const published=await publishPackage(q.package),cold=await importPackage(published.bytes);
 assert.deepEqual(cold.pages,q.package.pages);assert.deepEqual(cold.transposition,q.package.transposition);assert.deepEqual(getOriginalScorePackageBytes(cold),original.bytes);
 const again=await ensurePianoReady({packageBytes:q.packageBytes,layout:keyboard,transposeSteps:-1,personal:initialPersonal(q.package)});
 assert.equal(again.status,'editable','message' in again?again.message:undefined);if(!('package' in again)||!('layer' in again))return;
 assert.equal(again.package.transposition?.steps,-1);assert.equal(again.personal,undefined);assert.deepEqual(getOriginalScorePackageBytes(again.package),original.bytes);
 await assert.rejects(()=>admitPianoRequestResult(request,again.package,again.packageBytes,again.layer,undefined),/requested pitch transformation/);
 const restore=await ensurePianoReady({packageBytes:q.packageBytes,layout:keyboard,transposeSteps:0});assert.equal(restore.status,'unsupported');
 const cancelled=await ensurePianoReady({...request,signal:AbortSignal.abort()});assert.equal(cancelled.status,'cancelled');assert.deepEqual(cancelled.retainedPackageBytes,original.bytes);
 const changedHands=structuredClone(original.p);changedHands.score.notes[0].hand='LH';assert.equal(scoreTranspositionCompatible(q.package,changedHands,keyboard),false);
});

test('cold admission refuses repinned transformation/map/source/paint/seat/layer claims and nested baselines',async()=>{
 const original=await prepared(),q=await ensurePianoReady({packageBytes:original.bytes,layout:'janko-four-row',transposeSteps:2});
 assert.equal(q.status,'editable','message' in q?q.message:undefined);if(!('package' in q))return;
 const repin=async(edit:(m:any,f:Record<string,Uint8Array>)=>void)=>{const m=structuredClone(q.package.collectionManifest??q.package.manifest),f={...q.package.files};delete f['manifest.json'];edit(m,f);
  m.files=Object.fromEntries(await Promise.all(Object.entries(f).map(async([n,b])=>[n,await hashBytes(b)])));return archivePackage(m,f);};
 for(const edit of [
  (m:any)=>{m.transposition.steps=3;},
  (m:any)=>{m.transposition.handMaps['janko-four-row'][0].pitch++;},
  (m:any,f:Record<string,Uint8Array>)=>{f[m.sourceScore]=strToU8(JSON.stringify({...q.package.sourceScore,title:'different'}));m.sourceRevision=m.sourceSha256='a'.repeat(64);},
  (m:any,f:Record<string,Uint8Array>)=>{f[m.pages[0]]=strToU8(new TextDecoder().decode(f[m.pages[0]]).replace('<svg ','<svg data-tampered="1" '));},
  (_m:any,f:Record<string,Uint8Array>)=>{const seats=JSON.parse(new TextDecoder().decode(f['seats.json']));seats[0].x++;f['seats.json']=strToU8(JSON.stringify(seats));},
  (_m:any,f:Record<string,Uint8Array>)=>{const layer=JSON.parse(new TextDecoder().decode(f['fingers.json']));layer.attacks[0].pitch++;f['fingers.json']=strToU8(JSON.stringify(layer));}
 ])await assert.rejects(()=>repin(edit).then(importPackage));
 const mutable=structuredClone(q.package.collectionManifest??q.package.manifest),files={...q.package.files};delete files['manifest.json'];
 files[mutable.transposition!.originalArchive]=q.packageBytes;
 mutable.transposition!.originalArchiveSha256=await hashBytes(q.packageBytes);
 const {sha256,...content}=mutable.transposition!;mutable.transposition!.sha256=await identityHash(content);
 mutable.files=Object.fromEntries(await Promise.all(Object.entries(files).map(async([n,b])=>[n,await hashBytes(b)])));
 await assert.rejects(()=>importPackage(archivePackage(mutable,files)),/untransposed original archive/);
 const referenceTampered=await repin((_m,f)=>{f['reference.mid']=f['reference.mid'].slice();f['reference.mid'][24]++;});
 await assert.rejects(()=>importPackage(referenceTampered),/reference bytes/);
});

test('current reference context is rebound to effective pitches and stale selected-edition output refuses',async()=>{
 const original=await prepared({reference:false}),referenceTempo={version:'reference-performance-tempo-v1' as const,bpm:140,beat:{numerator:1,denominator:4},provenance:{kind:'editorial' as const,reference:'Current player clock'}},
  changed=await ensurePianoReady({packageBytes:original.bytes,layout:'janko-four-row',referenceTempo,performingHandPolicy:'retain-imported'});
 assert.equal(changed.status,'editable','message' in changed?changed.message:undefined);if(!('package' in changed))return;
 const request={packageBytes:changed.packageBytes,layout:'janko-four-row' as const,transposeSteps:1},shifted=await ensurePianoReady(request);
 assert.equal(shifted.status,'editable','message' in shifted?shifted.message:undefined);if(!('package' in shifted)||!('layer' in shifted))return;
 assert.equal(shifted.package.calculationContext?.sourceSha256,shifted.package.sourceSha256);
 assert.deepEqual(shifted.package.calculationContext?.referencePerformanceTempo,referenceTempo);
 await admitPianoRequestResult(request,shifted.package,shifted.packageBytes,shifted.layer,undefined);
 await assert.rejects(()=>admitPianoRequestResult({...request,packageBytes:original.bytes},shifted.package,shifted.packageBytes,shifted.layer,undefined),/requested pitch transformation/);
 const controller=new AbortController(),worker:ReadinessWorker={onmessage:null,onerror:null,terminate(){},postMessage(){controller.abort();
  worker.onmessage?.({data:{type:'complete',result:readinessWorkerResult(shifted)}} as MessageEvent<any>);}},result=await runPianoReadiness({...request,signal:controller.signal},()=>worker);
 assert.equal(result.status,'cancelled');assert.deepEqual('retainedPackageBytes' in result?result.retainedPackageBytes:undefined,changed.packageBytes);
});
