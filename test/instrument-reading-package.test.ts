import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {unzipSync,strFromU8,strToU8,zipSync} from 'fflate';
import {importPackage,hashBytes,type Manifest} from '../src/package';
import {scoreCapabilities} from '../src/score-capabilities';
import {soundingPitch,isPitchedEvent,requirePitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import {initialPersonal,readPersonal,personalStorageName,collectionId} from '../src/state';
import {planSource} from '../src/practice';
import {planPerformance} from '../src/performance';
import {ensurePianoReady} from '../src/piano-readiness';
import {publishPackage} from '../src/publication';
import {authoredReadingPackage,authoredReadingScore} from './support/instrument-reading-fixture';

const bytes=await authoredReadingPackage(),p=await importPackage(bytes);
async function changed(change:(files:Record<string,Uint8Array>,manifest:Manifest)=>void):Promise<Uint8Array> {
  const files=unzipSync(bytes),m=JSON.parse(strFromU8(files['manifest.json'])) as Manifest;
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

test('reading pages and owner geometry must reproduce the shared musical source',async()=>{
  await assert.rejects(importPackage(await changed(files=>{
    files['pages/1.svg']=strToU8(strFromU8(files['pages/1.svg']).replace('</svg>','<g transform="translate(0,12)"/></svg>'));
  })),/page differs/);
  await assert.rejects(importPackage(await changed(files=>{
    const owners=JSON.parse(strFromU8(files['reading-owners.json']));owners[1].id=owners[0].id;files['reading-owners.json']=strToU8(JSON.stringify(owners));
  })),/ownership or geometry/);
  await assert.rejects(importPackage(await changed((_files,m)=>{m.reading!.policy.centerPitch=36;})),/policy differs/);
});

test('canonical admission refuses false unpitched pitches, unknown kinds and invented piano descriptors',async()=>{
  for(const change of [(q:any)=>{q.notes.find((o:any)=>o.id==='dead').pitch={octave:2,pitchClass:2};},
    (q:any)=>{q.notes[0].eventKind='other';},(q:any)=>{q.notes[0].soundingPitch={octave:2,pitchClass:0};}]){
    await assert.rejects(importPackage(await changed(files=>{const q=JSON.parse(strFromU8(files['score.json']));change(q);files['score.json']=strToU8(JSON.stringify(q));})),/sounding pitch|event kind/);
  }
  await assert.rejects(importPackage(await changed((_files,m)=>{m.keyboardLayout='janko-four-row';})),/musical reading package/);
});

test('physical piano operations reject reading packages before making actions or changing source',async()=>{
  assert.deepEqual(scoreCapabilities(p),{reading:true,pianoPreparation:false,pianoPractice:false,pianoPerformance:false,fingerEditing:false});
  assert.throws(()=>planSource(p),/available for reading/);assert.throws(()=>planPerformance(p),/available for reading/);
  const ready=await ensurePianoReady({packageBytes:bytes,layout:'conventional-piano'});
  assert.equal(ready.status,'unsupported');if('code' in ready)assert.equal(ready.code,'instrument-reading');
  assert.deepEqual(p.score,authoredReadingScore());
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
