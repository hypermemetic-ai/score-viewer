import {requirePitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import {requirePianoEvent} from '../src/piano-event';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {strToU8} from 'fflate';
import {ensurePianoReady as calculateEdition} from './support/calculate-edition';
import {ensurePianoReady} from '../src/piano-readiness';
import {archivePackage,hashBytes,importPackage} from '../src/package';
import {publishPreparedNative} from '../src/publication';
import {corrected,initialPersonal,personalStorageName,legacyPersonalStorageName} from '../src/state';
import {loadPersonalJournal,PersonalJournalError} from '../src/personal-journal';
import {stagePresentationInstall} from '../src/presentation-install';
import {prepareRetainedEdition} from '../src/retained-editions';
import type {Entry} from '../src/state';
import {renderScorePresentation} from '../vendor/iso-notation/src/render/iso/score-presentation';
import {resolveIsoOptions,resolveIsoTokens} from '../vendor/iso-notation/src/render/iso/types';
import {SCORE_RENDERING_ENGINE,SCORE_RENDERING_RECIPE_VERSION} from '../vendor/iso-notation/src/render/iso/score-rendering-recipe';
import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';
import type {SourceHandRequirement} from '../vendor/iso-notation/src/model/physical-source-constraints';

async function prepared({reference=true,recipe=true,dual=false,leap=false}={}){
  const source:QuantizedGridScore&{sourceHandRequirements:SourceHandRequirement[]}={id:'authored-readiness-piano',title:'Piano study',composer:'Fixture',
    ticksPerBeat:48,totalTicks:192,sourceBarTicks:[0,192],productionLayout:true,notes:[48,50,52,53,55,57].map((pitch,i)=>({id:`owner-${i}`,
      eventKind:'pitched' as const,pitch:{octave:Math.floor(pitch/12),pitchClass:pitch%12},startTick:24+i*24,durationTicks:24,hand:'RH'})),
    barlines:[{tick:0,barNumber:1,type:'regular'},{tick:192,barNumber:2,type:'final'}],
    timeSignatures:[{tick:0,numerator:4,denominator:4}],tempos:[],dynamics:[],pedals:[],sourceHandRequirements:[]};
  if(leap)source.notes=[54,66,32,75].map((pitch,i)=>({id:'owner-'+i,eventKind:'pitched' as const,pitch:{octave:Math.floor(pitch/12),pitchClass:pitch%12},
    startTick:i<2?24:72,durationTicks:48,hand:pitch<60?'LH':'RH'}));
  source.sourceHandRequirements=source.notes.map(n=>({version:'source-hand-requirement-v1',ownerId:n.id,hand:requirePianoEvent(n).hand,
    guard:{pitch:12*requirePitchedEvent(n).pitch.octave+requirePitchedEvent(n).pitch.pitchClass,startTick:n.startTick,durationTicks:n.durationTicks},
    provenance:{kind:'source-instruction',reference:'Authored fixture explicit right-hand instruction'}}));
  if(reference)source.referencePerformanceTempo={version:'reference-performance-tempo-v1',bpm:100,beat:{numerator:1,denominator:4},
    provenance:{kind:'editorial',reference:'Explicit authored fixture clock'}};
  const sourceBytes=strToU8(JSON.stringify(source)),sourceSha256=await hashBytes(sourceBytes),
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

test('retained pitch reading requires neither invented tempo nor a fabricated finger layer',async()=>{
 const original=await prepared({reference:false,recipe:false});
 const q=await ensurePianoReady({packageBytes:original.bytes,layout:'janko-four-row'});
 assert.equal(q.status,'reading');assert.equal('layer' in q,false);
 assert.deepEqual(q.packageBytes,original.bytes);assert.deepEqual(q.package.pages,original.p.pages);assert.deepEqual(q.package.seats,original.p.seats);
 assert.deepEqual(q.availableFingerPresentations,[]);assert.equal(q.package.sourceScore!.referencePerformanceTempo,undefined);
});

test('repinned passive preparation metadata cannot substitute for independently matching package facts',async()=>{
 const original=await prepared(),q=await calculateEdition({packageBytes:original.bytes,layout:'janko-four-row',performingHandPolicy:'retain-imported'});
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

test('earlier edition reads exact pages and its own correction journal, without a calculator or writes',async()=>{
 const original=await prepared(),old=await calculateEdition({packageBytes:original.bytes,layout:'janko-four-row',performingHandPolicy:'retain-imported'});
 assert.equal(old.status,'editable');const first=old.layer.attacks[0].finger,replacement=first===5?4:5,
  state=corrected(old.package,initialPersonal(old.package),old.package.seats[0],replacement),key=(await import('../src/state')).personalStorageName(old.package.sourceRevision!,old.package),
  file=`package-${await hashBytes(old.packageBytes)}.tuna`,oldStateFile=`state-version-${'a'.repeat(64)}.json`,entry:Entry={
   id:old.package.sourceRevision!,file,metadata:old.package.manifest.metadata,importedAt:'now',personalFiles:{[key]:oldStateFile}},
  stored=new Map<string,Uint8Array>([[file,old.packageBytes],[oldStateFile,strToU8(JSON.stringify(state))]]),
  next=await calculateEdition({packageBytes:old.packageBytes,layout:'janko-four-row',performingHandPolicy:'retain-imported',personal:state,forceRecalculate:true});
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
 const original=await prepared(),calculated=await calculateEdition({packageBytes:original.bytes,layout:'janko-four-row',performingHandPolicy:'retain-imported'});
 assert.equal(calculated.status,'editable');
 // Public authored legacy edition with a genuine complete layer, before the
 // optional Viewer preparation identity/storage suffix was introduced.
 const manifest=structuredClone(calculated.package.collectionManifest??calculated.package.manifest),files={...calculated.package.files};
 delete files['manifest.json'];delete manifest.preparationIdentity;delete manifest.presentations!['janko-four-row']!.preparationIdentity;
 const archive=archivePackage(manifest,files),p=await importPackage(archive),file=`package-${await hashBytes(archive)}.tuna`,
  key=personalStorageName(p.sourceRevision!,p),legacy=legacyPersonalStorageName(p)!;
 assert.ok(legacy);
 const other=corrected(p,initialPersonal(p),p.seats[0],p.fingerLayer!.attacks[0].finger===1?2:1),
  missing=`state-version-${'f'.repeat(64)}.json`,entry:Entry={id:p.sourceRevision!,file:`package-${await hashBytes(calculated.packageBytes)}.tuna`,
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
