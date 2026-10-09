import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {unzipSync,strFromU8,strToU8,zipSync} from 'fflate';
import {importPackage,hashBytes,type Manifest} from '../src/package';
import {scoreOptionsMarkup} from '../src/score-options';
import {scoreTranspositionRange} from '../src/score-transposition';
import {scoreCapabilities} from '../src/score-capabilities';
import {soundingPitch,isPitchedEvent,requirePitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import {initialPersonal,readPersonal,personalStorageName,collectionId} from '../src/state';
import {planSource} from '../src/practice';
import {planPerformance} from '../src/performance';
import {ensurePianoReady} from '../src/piano-readiness';
import {publishPackage} from '../src/publication';
import {authoredReadingPackage,authoredReadingScore} from './support/instrument-reading-fixture';

const bytes=await authoredReadingPackage(),p=await importPackage(bytes);
async function changed(change:(files:Record<string,Uint8Array>,manifest:Manifest)=>void,original=bytes):Promise<Uint8Array> {
  const files=unzipSync(original),m=JSON.parse(strFromU8(files['manifest.json'])) as Manifest;
  delete files['manifest.json'];change(files,m);
  m.files=Object.fromEntries(await Promise.all(Object.entries(files).map(async([name,b])=>[name,await hashBytes(b)])));
  m.revision=m.semanticSha256=m.files['score.json'];files['manifest.json']=strToU8(JSON.stringify(m));return zipSync(files);
}

test('common musical reading retains actual pitch, independent voice owners and honest unpitched facts',()=>{
  assert.equal(p.manifest.version,3);assert.equal(p.keyboardLayout,undefined);assert.equal(p.fingerLayer,undefined);assert.deepEqual(p.seats,[]);
  assert.deepEqual(p.score,authoredReadingScore());assert.ok(p.reading);assert.equal(p.reading!.owners.length,p.score.notes.length);
  const coincident=p.reading!.owners.filter(o=>o.startTick===0);
  assert.deepEqual(coincident.map(o=>[o.id,o.voiceId]),[['center','1'],['same-pitch-independent-voice','2']]);
  assert.ok(coincident.every(o=>o.heads.length>0));assert.ok(p.score.notes.every(o=>o.hand===undefined));
  const center=p.score.notes.find(o=>o.id==='center')!;assert.ok(isPitchedEvent(center));assert.deepEqual(center.pitch,{octave:2,pitchClass:0});
  assert.deepEqual(center.writtenPitch,{octave:3,pitchClass:0});
  const dead=p.score.notes.find(o=>o.id==='dead')!;assert.equal(soundingPitch(dead),null);assert.equal('pitch' in dead,false);
  assert.throws(()=>requirePitchedEvent(dead),/unpitched/);
  const deadOwner=p.reading!.owners.find(o=>o.id==='dead')!;assert.equal(deadOwner.soundingPitch,null);assert.equal('pitch' in deadOwner,false);
  assert.equal(deadOwner.referencePitch,26);
  assert.ok(p.reading!.layoutMetadata.every(system=>system.centerPitch===24&&JSON.stringify(system.guidePitches)==='[12,24,36]'));
});

test('outward reading prepares clear below-center stems down and above-center stems up',async()=>{
  const source=authoredReadingScore();source.techniques=[];
  const below=source.notes.find(event=>event.id==='below-guide')!,above=source.notes.find(event=>event.id==='upper-guide')!;
  source.notes=[{...below,startTick:0,durationTicks:48,sourceWrittenValue:{type:'quarter',dots:0}},
    {...above,startTick:48,durationTicks:48,sourceWrittenValue:{type:'quarter',dots:0}}];
  const prepared=await importPackage(await authoredReadingPackage(source)),heads=prepared.reading!.layoutMetadata.flatMap(system=>system.notes);
  assert.equal(prepared.score.readingPolicy!.stemPolicy,'outward');
  assert.equal(heads.find(head=>head.id===below.id)!.direction,1);
  assert.equal(heads.find(head=>head.id===above.id)!.direction,-1);
  assert.deepEqual(prepared.score,source);assert.equal(prepared.reading!.geometryEvidence.ok,true);
});

test('reading pages and owner geometry must reproduce the shared musical source',async()=>{
  await assert.rejects(importPackage(await changed(files=>{
    files['pages/1.svg']=strToU8(strFromU8(files['pages/1.svg']).replace('</svg>','<g transform="translate(0,12)"/></svg>'));
  })),/page differs/);
  await assert.rejects(importPackage(await changed(files=>{
    const owners=JSON.parse(strFromU8(files['reading-owners.json']));owners[1].id=owners[0].id;files['reading-owners.json']=strToU8(JSON.stringify(owners));
  })),/ownership or geometry/);
  await assert.rejects(importPackage(await changed((_files,m)=>{m.reading!.policy.centerPitch=36;})),/policy differs/);
  await assert.rejects(importPackage(await changed(files=>{
    const owners=JSON.parse(strFromU8(files['reading-owners.json']));owners[0].heads[0].x+=2;
    files['reading-owners.json']=strToU8(JSON.stringify(owners));
  })),/ownership or geometry/);
});

test('canonical admission refuses false unpitched pitches, unknown kinds and invented piano descriptors',async()=>{
  for(const change of [(q:any)=>{q.notes.find((o:any)=>o.id==='dead').pitch={octave:2,pitchClass:2};},
    (q:any)=>{q.notes[0].eventKind='other';},(q:any)=>{q.notes[0].soundingPitch={octave:2,pitchClass:0};}]){
    await assert.rejects(importPackage(await changed(files=>{const q=JSON.parse(strFromU8(files['score.json']));change(q);files['score.json']=strToU8(JSON.stringify(q));})),/sounding pitch|event kind/);
  }
  await assert.rejects(importPackage(await changed((_files,m)=>{m.keyboardLayout='janko-four-row';})),/musical reading package/);
  await assert.rejects(importPackage(bytes,{keyboardLayout:'conventional-piano'}),/no piano keyboard presentation/);
});

test('H/P reading retains curved connections and refuses the historical bracket engine',async()=>{
  assert.ok(p.score.techniques?.length,'Original H/P study needs source technical relations');
  for(const technique of p.score.techniques??[]){
    const paths=p.pages.flatMap(page=>page.match(/<path\b[^>]*class="[^"]*\bjanko-technique-connector\b[^"]*"[^>]*>/g)??[]),
      owned=paths.filter(path=>path.includes(`data-technique-id="${technique.id}"`));
    assert.ok(owned.length,'Every source H/P relation needs its prepared connector');
    assert.ok(owned.every(path=>/[QCqc]/.test(path.match(/\bd="([^"]*)"/)?.[1]??'')));
  }
  await assert.rejects(importPackage(await changed((_files,m)=>{
    m.engineVersion='janko-real-engine-instrument-reading-v1';
    (m.reading! as {engineId:string}).engineId=m.engineVersion;
  })),/preparation authority/);
});

test('historical curved register archives replay explicitly without silent outward promotion',async()=>{
  const source=authoredReadingScore();
  source.readingPolicy={version:'instrument-reading-v1',partId:'original-part',centerPitch:24,guidePitches:[12,24,36],
    pitchFolding:'literal',stemPolicy:'register'};
  const historicalBytes=await authoredReadingPackage(source),historical=await importPackage(historicalBytes),raw=unzipSync(historicalBytes);
  assert.equal(historical.manifest.reading!.engineId,'janko-real-engine-instrument-reading-v2-curved-techniques');
  assert.deepEqual(historical.score,source);assert.deepEqual(historical.files['score.json'],raw['score.json']);
  assert.equal(historical.manifest.revision,await hashBytes(raw['score.json']));
  for(const [archive,engine]of [[bytes,'janko-real-engine-instrument-reading-v2-curved-techniques'],
    [historicalBytes,'janko-real-engine-instrument-reading-v3-outward']] as const){
    await assert.rejects(importPackage(await changed((_files,m)=>{
      m.engineVersion=engine;(m.reading! as {engineId:string}).engineId=engine;
    },archive)),/preparation authority/);
  }
});

test('rehashed reading archives cannot replace performing-hand meaning with visual stem directions',async()=>{
  for(const authority of [{hand:'RH'},
    {editorialHand:{hand:'LH',kind:'confirm',authorityId:'authored-hand-confirmation'}}]){
    await assert.rejects(importPackage(await changed(files=>{
      const source=JSON.parse(strFromU8(files['score.json']));
      Object.assign(source.notes.find((event:{id:string})=>event.id==='center'),authority);
      files['score.json']=strToU8(JSON.stringify(source));
    })),/performing.hand authority/i);
  }
  assert.deepEqual(p.score,authoredReadingScore());
  assert.equal(await hashBytes(p.files['score.json']),p.manifest.revision);
});

test('rehashed reading archives refuse malformed display stem directions before geometry',async()=>{
  for(const direction of [0,2,null,false,'up']){
    await assert.rejects(importPackage(await changed(files=>{
      const source=JSON.parse(strFromU8(files['score.json']));
      source.notes.find((event:{id:string})=>event.id==='center').displayStemDirection=direction;
      files['score.json']=strToU8(JSON.stringify(source));
    })),/Display stem direction must be -1 or 1/);
  }
});

test('source techniques, part ownership and geometry cannot invent unsupported musical reading',async()=>{
  for(const mutate of [(q:any)=>{q.techniques[0].toNoteId='dead';},
    (q:any)=>{q.techniques[0].voiceId='2';},(q:any)=>{q.techniques[0].label='P';},
    (q:any)=>{q.techniques[0].fromTick=12;},(q:any)=>{q.notes[0].partId='unknown-part';}]){
    await assert.rejects(importPackage(await changed(files=>{const q=JSON.parse(strFromU8(files['score.json']));mutate(q);
      files['score.json']=strToU8(JSON.stringify(q));})),/technique|event owner/);
  }
  for(const mutate of [(m:Manifest)=>{m.reading!.options.pageWidth=1e9;},
    (m:Manifest)=>{m.reading!.options.systemsPerPage=1e9;},
    (m:Manifest)=>{m.reading!.tokens.semitoneScale=-1;},
    (m:Manifest)=>{(m.reading!.tokens as Record<string,unknown>).stemLength=null;}])
    await assert.rejects(importPackage(await changed((_files,m)=>mutate(m))),/geometry|dimension|token|option/);
});

test('physical piano operations reject reading packages before making actions or changing source',async()=>{
  assert.deepEqual(scoreCapabilities(p),{reading:true,manualPractice:true,pianoPreparation:false,pianoPractice:false,pianoPerformance:false,fingerEditing:false});
  assert.throws(()=>planSource(p),/available for reading/);assert.throws(()=>planPerformance(p),/available for reading/);
  assert.throws(()=>scoreTranspositionRange(p),/available for reading/);
  const markup=scoreOptionsMarkup({id:collectionId(p),file:'package-'+p.archiveSha256+'.isoscore',metadata:p.manifest.metadata,importedAt:'2026-10-08'},p,initialPersonal(p),{steps:0,min:0,max:0});
  assert.match(markup,/Read the score/);assert.match(markup,/Share score/);assert.doesNotMatch(markup,/data-score-transpose|Generate fingerings|personal corrections/);
  const ready=await ensurePianoReady({packageBytes:bytes,layout:'conventional-piano'});
  assert.equal(ready.status,'unsupported');if('code' in ready)assert.equal(ready.code,'instrument-reading');
  assert.deepEqual(p.score,authoredReadingScore());
});

test('physical capability checks reject explicitly nonpiano parts even with source RH/LH labels',()=>{
 const source=authoredReadingScore();source.notes=source.notes.filter(isPitchedEvent).map(note=>({...note,hand:'RH'}));
 const claimedLegacy={...p,manifest:{...p.manifest,version:2 as const},score:source};
 assert.equal(scoreCapabilities(claimedLegacy).pianoPractice,false);
 assert.throws(()=>planSource(claimedLegacy),/available for reading/);
});

test('reading uses ordinary saved view identity and sharing excludes personal state',async()=>{
  const personal=initialPersonal(p);personal.view.page=Math.max(0,p.pages.length-1);personal.view.rotation=90;
  assert.deepEqual(readPersonal(JSON.parse(JSON.stringify(personal)),p),personal);
  assert.equal(personalStorageName(collectionId(p),p),`state-${p.manifest.revision}.json`);
  assert.throws(()=>readPersonal({...personal,history:[{}]},p),/cannot carry piano/);
  const shared=await publishPackage(p);assert.equal(shared.package.manifest.version,3);
  assert.ok(shared.inventory.some(o=>o.name==='reading-owners.json'));assert.ok(shared.inventory.some(o=>o.name==='reading-layout.json'));
  assert.equal(shared.inventory.some(o=>o.name.includes('state-')),false);
});

test('legacy bytes, revision, fingers and owner IDs survive canonical boundary normalization',async()=>{
  const legacyBytes=readFileSync(new URL('../fixtures/schumann-op68-no14.isoscore',import.meta.url)),raw=unzipSync(legacyBytes),
    legacy=await importPackage(legacyBytes,{allowLegacyTempo:true}),serialized=JSON.parse(strFromU8(raw['score.json']));
  assert.ok(legacy.score.notes.every(isPitchedEvent));assert.deepEqual(legacy.files['score.json'],raw['score.json']);
  assert.equal(legacy.manifest.revision,await hashBytes(raw['score.json']));
  assert.deepEqual(legacy.score.notes.map(o=>o.id),serialized.notes.map((o:any)=>o.id));
  assert.equal(legacy.fingerLayer!.attacks.length,381);assert.equal(legacy.seats.length,381);
  assert.equal(JSON.stringify(serialized.notes).includes('eventKind'),false);
});
