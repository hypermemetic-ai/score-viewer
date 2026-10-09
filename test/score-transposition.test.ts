import {requirePitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import {requirePianoEvent} from '../src/piano-event';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {strToU8} from 'fflate';
import {DOMParser} from '@xmldom/xmldom';
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
import {transferStudy,boundaryStudy,sourcePackage,calculatedStudy} from './support/hand-edition-fixture';
import {annotationInkPolicyFor,ANNOTATION_INK_POLICY} from '../src/annotation-ink-policy';
import {actualPageObstacles,boxesOverlap} from '../src/svg-annotation-clearance';
async function prepared({reference=true,recipe=true,dual=false,leap=false,legacy=false}={}){
  const source:QuantizedGridScore&{sourceHandRequirements:SourceHandRequirement[]}={id:'authored-readiness-piano',title:'Piano study',composer:'Fixture',
    ticksPerBeat:48,totalTicks:192,sourceBarTicks:[0,192],productionLayout:true,notes:[48,50,52,53,55,57].map((pitch,i)=>({eventKind:'pitched' as const,id:`owner-${i}`,
      pitch:{octave:Math.floor(pitch/12),pitchClass:pitch%12},startTick:24+i*24,durationTicks:24,hand:'RH'})),
    barlines:[{tick:0,barNumber:1,type:'regular'},{tick:192,barNumber:2,type:'final'}],
    timeSignatures:[{tick:0,numerator:4,denominator:4}],tempos:[],dynamics:[],pedals:[],sourceHandRequirements:[]};
  if(leap)source.notes=[54,66,32,75].map((pitch,i)=>({eventKind:'pitched' as const,id:'owner-'+i,pitch:{octave:Math.floor(pitch/12),pitchClass:pitch%12},
    startTick:i<2?24:72,durationTicks:48,hand:pitch<60?'LH':'RH'}));
  source.sourceHandRequirements=source.notes.map(n=>({version:'source-hand-requirement-v1',ownerId:n.id,hand:requirePianoEvent(n).hand,
    guard:{pitch:12*requirePitchedEvent(n).pitch.octave+requirePitchedEvent(n).pitch.pitchClass,startTick:n.startTick,durationTicks:n.durationTicks},
    provenance:{kind:'source-instruction',reference:'Authored fixture explicit right-hand instruction'}}));
  if(reference)source.referencePerformanceTempo={version:'reference-performance-tempo-v1',bpm:100,beat:{numerator:1,denominator:4},
    provenance:{kind:'editorial',reference:'Explicit authored fixture clock'}};
  const sourceBytes=strToU8(JSON.stringify(source,legacy?(key,value)=>key==='eventKind'?undefined:value:undefined)),sourceSha256=await hashBytes(sourceBytes),
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
 const {source,p:base}=await prepared(),s=structuredClone(source);
 s.repeatTies=[{id:'repeat-tie',fromNoteId:'owner-0',toNoteId:'owner-0',fromEventId:'from',toEventId:'to',fromTick:24,toTick:192,
  pitch:{octave:4,pitchClass:0},voice:'rh',fromBar:1,toBar:2,sourceFile:'authored.ly'}];
 s.writtenPresentation={sourceScoreId:s.id,sourceHash:'a'.repeat(64),performedTotalTicks:384,writtenBars:1,performedBars:2,repeats:[],occurrences:[],
  events:{notes:[{writtenIndex:0,performedIndex:0,overrides:{pitch:{octave:4,pitchClass:0},startTick:216}}]}};
 s.graceGroups=[{id:'grace',source:{file:'authored.ly',line:1,column:1,endLine:1,endColumn:2,bar:1},voice:'rh',staff:'rh',printedStaff:'rh',hand:'RH',kind:'grace',
  members:[{id:'grace-0',pitch:{octave:4,pitchClass:11},spelling:'b',duration:'16',beamStart:false,beamEnd:false,line:1,column:1,endLine:1,endColumn:2}],
  hostEventId:'host',hostKind:'note',occurrences:[{id:'occ',sourceBar:1,pass:1,tick:24,hostNoteIds:['owner-0']}]}];
 requirePitchedEvent(s.notes[0]).writtenPitch={octave:5,pitchClass:0};
 const before=structuredClone(s);
 for(const offset of [1,-1,12,-12]){const q=transposeScore(s,offset);
  assert.equal(requirePitchedEvent(q.notes[0]).pitch.octave*12+requirePitchedEvent(q.notes[0]).pitch.pitchClass,48+offset);
  const actual=requirePitchedEvent(q.notes[0]);assert.equal(actual.writtenPitch!.octave*12+actual.writtenPitch!.pitchClass,60+offset);
  assert.equal(actual.writtenPitch!.octave*12+actual.writtenPitch!.pitchClass-(actual.pitch.octave*12+actual.pitch.pitchClass),12);
  assert.equal(q.repeatTies![0].pitch.octave*12+q.repeatTies![0].pitch.pitchClass,48+offset);
  assert.equal((q.writtenPresentation!.events.notes[0].overrides.pitch as any).octave*12+(q.writtenPresentation!.events.notes[0].overrides.pitch as any).pitchClass,48+offset);
  assert.equal(q.graceGroups![0].members[0].pitch!.octave*12+q.graceGroups![0].members[0].pitch!.pitchClass,59+offset);
  assert.equal((q as any).sourceHandRequirements[0].guard.pitch,48+offset);
  assert.deepEqual(q.notes.map(event=>{const {pitch,writtenPitch,...n}=requirePitchedEvent(event);return n;}),s.notes.map(event=>{const {pitch,writtenPitch,...n}=requirePitchedEvent(event);return n;}));
  assert.deepEqual(q.barlines,s.barlines);assert.deepEqual(q.timeSignatures,s.timeSignatures);
 }
 assert.deepEqual(s,before);assert.deepEqual(scoreTranspositionRange({...base,score:s,sourceScore:s}),{min:-39,max:37});
 const aliased=structuredClone(source);delete (aliased as any).sourceHandRequirements;requirePitchedEvent(aliased.notes[1]).pitch=requirePitchedEvent(aliased.notes[0]).pitch;
 const shiftedAlias=transposeScore(aliased,1);assert.deepEqual(requirePitchedEvent(shiftedAlias.notes[0]).pitch,{octave:4,pitchClass:1});assert.deepEqual(requirePitchedEvent(shiftedAlias.notes[1]).pitch,requirePitchedEvent(shiftedAlias.notes[0]).pitch);assert.throws(()=>transposeScore(s,88),/range/);assert.throws(()=>transposeScore(s,1.5),/whole number/);
 const outside=structuredClone(source);delete (outside as any).sourceHandRequirements;outside.notes=[{...requirePitchedEvent(outside.notes[0]),pitch:{octave:8,pitchClass:3}}];
 const reading={...base,score:outside,sourceScore:outside};assert.deepEqual(scoreTranspositionRange(reading),{min:-90,max:-3});
 assert.deepEqual(requirePitchedEvent(transposeScore(outside,-3).notes[0]).pitch,{octave:8,pitchClass:0});
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
 assert.deepEqual(q.layer.attacks.map(a=>a.hand),original.source.notes.map(n=>requirePianoEvent(n).hand));
 assert.deepEqual(q.layer.attacks.map(a=>a.pitch),original.source.notes.map(n=>requirePitchedEvent(n).pitch.octave*12+requirePitchedEvent(n).pitch.pitchClass+1));
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
 const samePitch=await ensurePianoReady({packageBytes:q.packageBytes,layout:keyboard,forceRecalculate:true,personal:initialPersonal(q.package)});
 assert.equal(samePitch.status,'editable','message' in samePitch?samePitch.message:undefined);if(!('package' in samePitch))return;
 assert.deepEqual(samePitch.package.transposition,q.package.transposition);
 assert.equal(samePitch.package.manifest.revision,q.package.manifest.revision,'same physical exercise must retain its edition revision');
 assert.equal(samePitch.package.preparationIdentity!.sha256,q.package.preparationIdentity!.sha256);
 const again=await ensurePianoReady({packageBytes:q.packageBytes,layout:keyboard,transposeSteps:-1,personal:initialPersonal(q.package)});
 assert.equal(again.status,'editable','message' in again?again.message:undefined);if(!('package' in again)||!('layer' in again))return;
 assert.equal(again.package.transposition?.steps,-1);assert.equal(again.personal,undefined);assert.deepEqual(getOriginalScorePackageBytes(again.package),original.bytes);
 await assert.rejects(()=>admitPianoRequestResult(request,again.package,again.packageBytes,again.layer,undefined),/requested pitch transformation/);
 const restore=await ensurePianoReady({packageBytes:q.packageBytes,layout:keyboard,transposeSteps:0});assert.equal(restore.status,'unsupported');
 const cancelled=await ensurePianoReady({...request,signal:AbortSignal.abort()});assert.equal(cancelled.status,'cancelled');assert.deepEqual(cancelled.retainedPackageBytes,original.bytes);
 const changedHands=structuredClone(original.p);requirePianoEvent(changedHands.score.notes[0]).hand='LH';assert.equal(scoreTranspositionCompatible(q.package,changedHands,keyboard),false);
});

test('legacy transposition preserves frozen discriminator omissions while active events remain canonical',async()=>{
 const original=await prepared({legacy:true}),before=original.p.files['source-score.json'],
  shifted=await ensurePianoReady({packageBytes:original.bytes,layout:'janko-four-row',transposeSteps:1});
 assert.equal(shifted.status,'editable','message' in shifted?shifted.message:undefined);if(!('package' in shifted))return;
 assert.ok(shifted.package.sourceScore!.notes.every(n=>n.eventKind==='pitched'));
 const path=shifted.package.collectionManifest!.sourceScore!,raw=JSON.parse(new TextDecoder().decode(shifted.package.files[path]));
 assert.ok(raw.notes.every((n:Record<string,unknown>)=>!('eventKind' in n)));
 assert.deepEqual(original.p.files['source-score.json'],before);
 assert.deepEqual(getOriginalScorePackageBytes(shifted.package),original.bytes);
 const cold=await importPackage(shifted.packageBytes);assert.deepEqual(cold.sourceScore,shifted.package.sourceScore);
 assert.equal(cold.sourceSha256,await hashBytes(shifted.package.files[path]));
});

test('cold admission refuses repinned transformation/map/source/paint/seat/layer claims and nested baselines',async()=>{
 const original=await prepared(),q=await ensurePianoReady({packageBytes:original.bytes,layout:'janko-four-row',transposeSteps:2});
 assert.equal(q.status,'editable','message' in q?q.message:undefined);if(!('package' in q))return;
 const repin=async(edit:(m:any,f:Record<string,Uint8Array>)=>void)=>{const m=structuredClone(q.package.collectionManifest??q.package.manifest),f={...q.package.files};delete f['manifest.json'];edit(m,f);
  const {sha256,...content}=m.transposition!;m.transposition!.sha256=await identityHash(content);
  m.files=Object.fromEntries(await Promise.all(Object.entries(f).map(async([n,b])=>[n,await hashBytes(b)])));return archivePackage(m,f);};
 await assert.rejects(()=>repin(m=>{m.transposition.steps=3;}).then(importPackage),/independent reconstruction/);
 await assert.rejects(()=>repin(m=>{m.transposition.handMaps['janko-four-row'][0].pitch++;}).then(importPackage),/stale source guards/);
 for(const edit of [
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
 const wrongReceipt:ReadinessWorker={onmessage:null,onerror:null,terminate(){},postMessage(){wrongReceipt.onmessage?.({data:{type:'complete',result:{...readinessWorkerResult(shifted),requestedEditionSha256:'a'.repeat(64)}}} as MessageEvent<any>);}};
 const rejected=await runPianoReadiness(request,()=>wrongReceipt);assert.equal(rejected.status,'unsupported');assert.match('message' in rejected?rejected.message:'',/another selected request edition/);
});

test('selected calculated hands stay distinct from source hands and repeated tie owners preserve complete effective obligations',async()=>{
 for(const layout of ['conventional-piano','janko-four-row'] as const){
  const original=await sourcePackage(transferStudy()),hands={'gesture-0':'LH','gesture-1':'RH','gesture-2':'LH','melody-entrance':'RH'} as const,
   selected=await calculatedStudy(original.p,layout,hands),request={packageBytes:selected.bytes,layout,transposeSteps:1},result=await ensurePianoReady(request);
  assert.equal(result.status,'editable','message' in result?result.message:undefined);if(!('package' in result)||!('layer' in result))continue;
  assert.notDeepEqual(result.package.score.notes.map(n=>requirePianoEvent(n).hand),result.package.sourceScore!.notes.map(n=>requirePianoEvent(n).hand));
  assert.deepEqual(result.package.score.notes.map(n=>requirePianoEvent(n).hand),selected.p.score.notes.map(n=>requirePianoEvent(n).hand));
  assert.deepEqual(result.package.transposition!.handMaps[layout],selected.p.score.notes.map(n=>({id:n.id,pitch:requirePitchedEvent(n).pitch.octave*12+requirePitchedEvent(n).pitch.pitchClass,
   startTick:n.startTick,durationTicks:n.durationTicks,hand:requirePianoEvent(n).hand})).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0));
  assert.deepEqual(getOriginalScorePackageBytes(result.package),selected.bytes);
  await admitPianoRequestResult(request,result.package,result.packageBytes,result.layer,undefined);
  const boundary=await sourcePackage(boundaryStudy(),{measuresPerSystem:1,systemsPerPage:1,pageWidth:240}),
   baseline=await calculatedStudy(boundary.p,layout,Object.fromEntries(boundary.source.notes.map(n=>[n.id,n.id==='edge-a'?'RH':requirePianoEvent(n).hand]))),
   shifted=await ensurePianoReady({packageBytes:baseline.bytes,layout,transposeSteps:1});
  assert.equal(shifted.status,'editable','message' in shifted?shifted.message:undefined);if(!('package' in shifted))continue;
  assert.equal(shifted.package.pages.length,2);
  const inventory=shifted.package.calculatedHandReceipt!.sourceInventory;
  assert.equal(inventory.occurrences.length,4);assert.equal(inventory.owners.reduce((n,o)=>n+o.performedVisits!.length,0),14);
  assert.equal(shifted.package.seats.filter(s=>s.ownerIds.includes('held')).length,2);
  assert.equal(shifted.package.seats.find(s=>s.ownerIds.includes('short-release'))!.actionId,'192:62');
  assert.deepEqual((await importPackage(shifted.packageBytes)).pages,shifted.package.pages);
 }
});

test('transposition retains the historical literal recipe baseline adoption gate',async()=>{
 const original=await prepared(),m=structuredClone(original.p.collectionManifest??original.p.manifest),files={...original.p.files};delete files['manifest.json'];
 const recipe=structuredClone(original.r);recipe.baseline={pageSha256:['f'.repeat(64)],seatSha256:'e'.repeat(64)};
 files['rendering-recipe.json']=strToU8(JSON.stringify(recipe));m.files['rendering-recipe.json']=await hashBytes(files['rendering-recipe.json']);
 const bytes=archivePackage(m,files),admitted=await importPackage(bytes);assert.equal(admitted.generationAvailable,true);
 const result=await ensurePianoReady({packageBytes:bytes,layout:'janko-four-row',transposeSteps:2});
 assert.equal(result.status,'unsupported');assert.match('message' in result?result.message:'',/does not reproduce its source pages/);
 assert.deepEqual('retainedPackageBytes' in result?result.retainedPackageBytes:undefined,bytes);
});

test('actual three-page transposition receipt dispatch keeps measured footer ink through cold admission',async()=>{
 const single=await prepared(),source=structuredClone(single.source);source.totalTicks=576;source.sourceBarTicks=[0,192,384,576];
 source.notes=Array.from({length:3},(_,bar)=>single.source.notes.map(n=>({...n,id:n.id+':bar-'+bar,startTick:n.startTick+bar*192}))).flat();
 source.barlines=source.sourceBarTicks.map((tick,i)=>({tick,barNumber:i+1,type:i===3?'final' as const:'regular' as const}));
 source.sourceHandRequirements=source.notes.map(n=>({version:'source-hand-requirement-v1',ownerId:n.id,hand:requirePianoEvent(n).hand,
  guard:{pitch:requirePitchedEvent(n).pitch.octave*12+requirePitchedEvent(n).pitch.pitchClass,startTick:n.startTick,durationTicks:n.durationTicks},provenance:{kind:'source-instruction',reference:'Authored three-page RH study'}}));
 const original=await sourcePackage(source,{measuresPerSystem:1,systemsPerPage:1,pageWidth:240,pageHeight:300},{ticksPerMeasure:192}),
  result=await ensurePianoReady({packageBytes:original.bytes,layout:'janko-four-row',transposeSteps:1});
 assert.equal(result.status,'editable','message' in result?result.message:undefined);if(!('package' in result))return;
 const cold=await importPackage(result.packageBytes),policy=annotationInkPolicyFor(cold);assert.deepEqual(policy,ANNOTATION_INK_POLICY);
 assert.equal(cold.pages.length,3);assert.equal(cold.calculatedHandReceipt!.version,'viewer-calculated-hand-edition-v3');
 const page=cold.pages[1],heads=new Map(cold.annotationGeometry!.seats.filter(s=>s.page===1).map(s=>[s.seatId,[s.headBounds.x0,s.headBounds.y0,s.headBounds.x1,s.headBounds.y1] as [number,number,number,number]])),
  known=actualPageObstacles(page,heads,policy).boxes,legacy=actualPageObstacles(page,heads).boxes,
  footer=Array.from(new DOMParser().parseFromString(page,'image/svg+xml').getElementsByTagName('text')).find(el=>el.getAttribute('class')==='janko-page-num')!,footerY=Number(footer.getAttribute('y')),
  air:[number,number,number,number]=[35,footerY-22,40,footerY-18];
 assert.equal(known.some(b=>boxesOverlap(air,b)),false,'distant left-hand air remains unreserved by actual footer');
 assert.equal(legacy.some(b=>boxesOverlap(air,b)),true,'legacy unknown-font footer would reserve a whole-page band');
 assert.throws(()=>annotationInkPolicyFor({calculatedHandReceipt:{...cold.calculatedHandReceipt,annotationInkPolicy:{...ANNOTATION_INK_POLICY,footer:{...ANNOTATION_INK_POLICY.footer,fontSha256:'0'.repeat(64)}}}}),/altered/);
});
