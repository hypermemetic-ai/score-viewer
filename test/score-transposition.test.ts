import {requirePitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import {requirePianoEvent} from '../src/piano-event';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {strToU8} from 'fflate';
import {ensurePianoReady as calculateEdition} from './support/calculate-edition';
import {ensurePianoReady} from '../src/piano-readiness';
import {archivePackage,hashBytes,importPackage,selectPresentation} from '../src/package';
import {publishPreparedNative,publishPackage} from '../src/publication';
import {preparePianoCalculationContext} from '../src/piano-context-package';
import {transposeScore,getScoreTransposition,getOriginalScorePackageBytes,scoreTranspositionRange,scoreTranspositionCompatible,prepareSourceTransposition,sourceHandEdition} from '../src/score-transposition';
import {identityHash} from '../src/piano-preparation-identity';
import {renderScorePresentation} from '../vendor/iso-notation/src/render/iso/score-presentation';
import {resolveIsoOptions,resolveIsoTokens} from '../vendor/iso-notation/src/render/iso/types';
import {approvedProductionIsoOptions} from '../vendor/iso-notation/src/render/iso/approved-production';
const approvedDefault=approvedProductionIsoOptions();
import {APPROVED_SCORE_RENDERING_ENGINE,SCORE_RENDERING_ENGINE,SCORE_RENDERING_RECIPE_VERSION} from '../vendor/iso-notation/src/render/iso/score-rendering-recipe';
import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';
import type {SourceHandRequirement} from '../vendor/iso-notation/src/model/physical-source-constraints';
import {transferStudy,sourcePackage,calculatedStudy} from './support/hand-edition-fixture';
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
      options:resolveIsoOptions({measuresPerSystem:1}),tokens:resolveIsoTokens({ticksPerMeasure:192}),
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

const pitchOf=(n:Parameters<typeof requirePitchedEvent>[0])=>requirePitchedEvent(n).pitch.octave*12+requirePitchedEvent(n).pitch.pitchClass;

test('transposing makes one source-hand edition for both keyboards, with no finger layer and no calculation',async()=>{
 const original=await prepared(),bytes=await prepareSourceTransposition(original.p,original.bytes,1),q=await importPackage(bytes);
 assert.equal(getScoreTransposition(q),1);assert.deepEqual([...q.availablePresentations!].sort(),['conventional-piano','janko-four-row']);
 for(const keyboard of ['janko-four-row','conventional-piano'] as const){
  const view=await selectPresentation(q,keyboard);
  assert.equal(view.fingerLayer,undefined);assert.equal(view.calculatedHandReceipt,undefined);assert.equal(view.preparationIdentity,undefined);
  assert.equal(view.renderingRecipe!.engineId,APPROVED_SCORE_RENDERING_ENGINE);assert.equal(sourceHandEdition(view),true);
  assert.deepEqual(view.score.notes.map(n=>requirePianoEvent(n).hand),original.source.notes.map(n=>requirePianoEvent(n).hand));
  assert.ok(view.score.notes.every(n=>!n.derivedHand));
  assert.deepEqual(view.score.notes.map(pitchOf),original.source.notes.map(n=>pitchOf(n)+1));
  assert.notDeepEqual(view.pages,original.p.pages);
  assert.equal(scoreTranspositionCompatible(view,original.p,keyboard),true);
  const opened=await ensurePianoReady({packageBytes:bytes,layout:keyboard});
  assert.equal(opened.status,'reading','message' in opened?opened.message:undefined);
 }
 assert.deepEqual(getOriginalScorePackageBytes(q),original.bytes);assert.deepEqual(q.referenceMidi,original.p.referenceMidi);
 assert.deepEqual(q.transpositionOriginal!.sourceScore,original.source);assert.deepEqual(scoreTranspositionRange(q),{min:-39,max:39});
 assert.equal(scoreTranspositionCompatible(original.p,q,'janko-four-row'),true);
 const cold=await importPackage((await publishPackage(q)).bytes);
 assert.deepEqual(cold.pages,q.pages);assert.deepEqual(cold.transposition,q.transposition);assert.deepEqual(getOriginalScorePackageBytes(cold),original.bytes);
 // Steps are absolute: transposing the transposed edition starts from the same original.
 const again=await importPackage(await prepareSourceTransposition(q,bytes,-1));
 assert.equal(again.transposition!.steps,-1);assert.deepEqual(getOriginalScorePackageBytes(again),original.bytes);
 assert.deepEqual(again.score.notes.map(pitchOf),original.source.notes.map(n=>pitchOf(n)-1));
 await assert.rejects(prepareSourceTransposition(q,bytes,0),/restore 0 steps/);
 await assert.rejects(prepareSourceTransposition(original.p,original.bytes,1.5),/whole number/);
 await assert.rejects(prepareSourceTransposition(original.p,original.bytes,1,{signal:AbortSignal.abort()}));
});

test('legacy transposition preserves frozen discriminator omissions while active events remain canonical',async()=>{
 const original=await prepared({legacy:true}),before=original.p.files['source-score.json'],
  bytes=await prepareSourceTransposition(original.p,original.bytes,1),shifted=await importPackage(bytes);
 assert.ok(shifted.sourceScore!.notes.every(n=>n.eventKind==='pitched'));
 const path=shifted.collectionManifest!.sourceScore!,raw=JSON.parse(new TextDecoder().decode(shifted.files[path]));
 assert.ok(raw.notes.every((n:Record<string,unknown>)=>!('eventKind' in n)));
 assert.deepEqual(original.p.files['source-score.json'],before);
 assert.deepEqual(getOriginalScorePackageBytes(shifted),original.bytes);
 assert.equal(shifted.sourceSha256,await hashBytes(shifted.files[path]));
});

// Admission rebuilds a source-hand transposed edition's source and hands and
// checks seats against its pages; it does not re-engrave the pages on open.
test('cold admission refuses repinned transformation/map/source/seat claims and nested baselines',async()=>{
 const original=await prepared(),q=await importPackage(await prepareSourceTransposition(original.p,original.bytes,2)),qBytes=archivePackage(q.collectionManifest??q.manifest,(()=>{const f={...q.files};delete f['manifest.json'];return f;})());
 const repin=async(edit:(m:any,f:Record<string,Uint8Array>)=>void)=>{const m=structuredClone(q.collectionManifest??q.manifest),f={...q.files};delete f['manifest.json'];edit(m,f);
  const {sha256,...content}=m.transposition!;m.transposition!.sha256=await identityHash(content);
  m.files=Object.fromEntries(await Promise.all(Object.entries(f).map(async([n,b])=>[n,await hashBytes(b)])));return archivePackage(m,f);};
 await importPackage(await repin(()=>{}));
 await assert.rejects(()=>repin(m=>{m.transposition.steps=3;}).then(importPackage),/independent reconstruction/);
 await assert.rejects(()=>repin(m=>{m.transposition.handMaps['janko-four-row'][0].pitch++;}).then(importPackage),/stale source guards/);
 await assert.rejects(()=>repin(m=>{const o=m.transposition.handMaps['conventional-piano'][0];o.hand=o.hand==='LH'?'RH':'LH';}).then(importPackage),/owner-hand authority/);
 for(const edit of [
  (m:any,f:Record<string,Uint8Array>)=>{f[m.sourceScore]=strToU8(JSON.stringify({...q.sourceScore,title:'different'}));m.sourceRevision=m.sourceSha256='a'.repeat(64);},
  (_m:any,f:Record<string,Uint8Array>)=>{const seats=JSON.parse(new TextDecoder().decode(f['seats.json']));seats[0].x++;f['seats.json']=strToU8(JSON.stringify(seats));}
 ])await assert.rejects(()=>repin(edit).then(importPackage));
 const mutable=structuredClone(q.collectionManifest??q.manifest),files={...q.files};delete files['manifest.json'];
 files[mutable.transposition!.originalArchive]=qBytes;
 mutable.transposition!.originalArchiveSha256=await hashBytes(qBytes);
 const {sha256,...content}=mutable.transposition!;mutable.transposition!.sha256=await identityHash(content);
 mutable.files=Object.fromEntries(await Promise.all(Object.entries(files).map(async([n,b])=>[n,await hashBytes(b)])));
 await assert.rejects(()=>importPackage(archivePackage(mutable,files)),/untransposed original archive/);
 const referenceTampered=await repin((_m,f)=>{f['reference.mid']=f['reference.mid'].slice();f['reference.mid'][24]++;});
 await assert.rejects(()=>importPackage(referenceTampered),/reference bytes/);
});

test('a new transposed score keeps its original as transposition/original.tuna; earlier archives with the old member name still open',async()=>{
 const original=await prepared(),bytes=await prepareSourceTransposition(original.p,original.bytes,1),q=await importPackage(bytes),m=q.collectionManifest??q.manifest;
 assert.equal(m.transposition!.originalArchive,'transposition/original.tuna');
 assert.ok(q.files['transposition/original.tuna']);assert.ok(!Object.keys(q.files).some(name=>name.endsWith('.isoscore')));
 const rename=async(member:string)=>{const next=structuredClone(m),files={...q.files};delete files['manifest.json'];
  files[member]=files['transposition/original.tuna'];delete files['transposition/original.tuna'];next.transposition!.originalArchive=member;
  const {sha256,...content}=next.transposition!;next.transposition!.sha256=await identityHash(content);
  next.files=Object.fromEntries(await Promise.all(Object.entries(files).map(async([n,b])=>[n,await hashBytes(b)])));return archivePackage(next,files);};
 // Archives already on disk name the member transposition/original.isoscore.
 const earlier=await importPackage(await rename('transposition/original.isoscore'));
 assert.equal(getScoreTransposition(earlier),1);assert.deepEqual(getOriginalScorePackageBytes(earlier),original.bytes);assert.deepEqual(earlier.pages,q.pages);
 await assert.rejects(async()=>importPackage(await rename('transposition/original.zip')),/transposition envelope/);
});

test('a saved working tempo moves with the transposed score and is rebound to its pitches',async()=>{
 const original=await prepared({reference:false}),referenceTempo={version:'reference-performance-tempo-v1' as const,bpm:140,beat:{numerator:1,denominator:4},provenance:{kind:'editorial' as const,reference:'Current player clock'}},
  withTempo=await preparePianoCalculationContext(original.p,{version:'piano-calculation-context-v1',sourceSha256:original.p.sourceSha256!,referencePerformanceTempo:referenceTempo}),
  selected=await importPackage(withTempo,{allowLegacyTempo:true}),shifted=await importPackage(await prepareSourceTransposition(selected,withTempo,1),{allowLegacyTempo:true});
 assert.equal(shifted.calculationContext?.sourceSha256,shifted.sourceSha256);
 assert.deepEqual(shifted.calculationContext?.referencePerformanceTempo,referenceTempo);
 assert.deepEqual(shifted.score.referencePerformanceTempo,referenceTempo);
 assert.equal(scoreTranspositionCompatible(shifted,selected,'janko-four-row'),true);
 assert.equal(scoreTranspositionCompatible(shifted,original.p,'janko-four-row'),false,'a different working tempo needs its own edition');
});

test('transposing a calculated edition keeps the score\'s own hands; a retained calculated transposition still opens',async()=>{
 for(const layout of ['conventional-piano','janko-four-row'] as const){
  const original=await sourcePackage(transferStudy()),hands={'gesture-0':'LH','gesture-1':'RH','gesture-2':'LH','melody-entrance':'RH'} as const,
   selected=await calculatedStudy(original.p,layout,hands),shifted=await importPackage(await prepareSourceTransposition(selected.p,selected.bytes,1),{keyboardLayout:layout});
  assert.notDeepEqual(selected.p.score.notes.map(n=>requirePianoEvent(n).hand),original.source.notes.map(n=>requirePianoEvent(n).hand));
  assert.deepEqual(shifted.score.notes.map(n=>requirePianoEvent(n).hand),original.source.notes.map(n=>requirePianoEvent(n).hand));
  assert.equal(shifted.calculatedHandReceipt,undefined);assert.equal(shifted.fingerLayer,undefined);
  assert.deepEqual(getOriginalScorePackageBytes(shifted),selected.bytes);
  assert.equal(scoreTranspositionCompatible(shifted,selected.p,layout),true);
  // An edition the former calculator saved at a transposed pitch reads as it was saved.
  const retained=await calculateEdition({packageBytes:selected.bytes,layout,transposeSteps:1});
  assert.equal(retained.status,'editable','message' in retained?retained.message:undefined);if(!('package' in retained))continue;
  const opened=await ensurePianoReady({packageBytes:retained.packageBytes,layout});
  assert.equal(opened.status,'editable','message' in opened?opened.message:undefined);assert.deepEqual(opened.packageBytes,retained.packageBytes);
  assert.equal(scoreTranspositionCompatible(retained.package,selected.p,layout),true);
 }
});

test('transposing engraves afresh with the current engine and the shared rules alone; old pages need not reproduce and no recipe is required',async()=>{
 const original=await prepared(),m=structuredClone(original.p.collectionManifest??original.p.manifest),files={...original.p.files};delete files['manifest.json'];
 const recipe=structuredClone(original.r);recipe.baseline={pageSha256:['f'.repeat(64)],seatSha256:'e'.repeat(64)};
 files['rendering-recipe.json']=strToU8(JSON.stringify(recipe));m.files['rendering-recipe.json']=await hashBytes(files['rendering-recipe.json']);
 const bytes=archivePackage(m,files),admitted=await importPackage(bytes);
 for(const [p,b] of [[admitted,bytes],[(await prepared({recipe:false})).p,(await prepared({recipe:false})).bytes]] as const){
  const shifted=await importPackage(await prepareSourceTransposition(p,b,2),{keyboardLayout:'janko-four-row'});
  assert.equal(getScoreTransposition(shifted),2);assert.equal(shifted.renderingRecipe!.engineId,APPROVED_SCORE_RENDERING_ENGINE);assert.ok(shifted.pages.length>0);
  assert.deepEqual(shifted.renderingRecipe!.options,approvedDefault,'fresh pages use the shared rules alone; the earlier recipe belongs to its old pages');
 }
});
