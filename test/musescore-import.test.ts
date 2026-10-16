import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MUSICXML_IMPORT_ENABLED,SCORE_PICKER_EXTENSIONS,scoreImportKind} from '../src/score-import-kind';
import {convertMuseScoreToMusicXml,prepareMuseScore,museScoreRefusalMessage,MuseScoreImportRefusal} from '../src/musescore-import';
import {importPackage} from '../src/package';
import {requirePianoEvent} from '../src/piano-event';
import {installConverterNodeRuntime} from './support/converter-node-runtime';

const fixture=(name:string)=>new Uint8Array(readFileSync(new URL('./fixtures/musescore/'+name,import.meta.url)));
const assets={font:{name:'fonts/URWGothic-Demi.otf',bytes:readFileSync(new URL('../src/URWGothic-Demi.otf',import.meta.url))},
 notices:Object.fromEntries(['URW-base35-COPYING','URW-base35-LICENSE','URW-base35-provenance.md'].map(name=>
  ['licenses/'+name,readFileSync(new URL('../licenses/'+name,import.meta.url))]))};
// The intake's own refusal of converter output it can't read yet (ISO reader work).
const readerRefusal=/^This MuseScore score can't be opened yet: the viewer's notation reader doesn't understand part of it yet \(MusicXML <[A-Za-z0-9-]+>\)\.$/;

test('MuseScore import and its picker extensions stay behind the MusicXML release gate',()=>{
 assert.equal(MUSICXML_IMPORT_ENABLED,false);
 assert.deepEqual([...SCORE_PICKER_EXTENSIONS],['tuna','gp','gpx','gp3','gp4','gp5']);
 const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
 assert.match(main,/if\(kind==='musescore'&&!MUSICXML_IMPORT_ENABLED\)throw Error\('MuseScore files can\\'t be opened yet\.'\);/);
 assert.match(main,/import\('\.\/musescore-import'\)/,'The converter host loads lazily, only for an actual MuseScore import.');
 const rust=readFileSync(new URL('../src-tauri/src/main.rs',import.meta.url),'utf8');
 assert.match(rust,/let mut kinds=vec!\["tuna","gp","gpx","gp3","gp4","gp5"\];if musicxml==Some\(true\)\{kinds\.extend\(\["musicxml","xml","mxl","mscz","mscx"\]\);\}/);
 assert.equal(scoreImportKind(fixture('cross-staff-arpeggio.mscz')),'musescore');
 assert.equal(scoreImportKind(fixture('original-piano-clarinet.mscx')),'musescore');
});

test('converter refusals read in plain words',()=>{
 assert.match(museScoreRefusalMessage('runtime-codec'),/can't unpack compressed MuseScore \(\.mscz\) files\. Save the score uncompressed \(\.mscx\)/);
 assert.equal(museScoreRefusalMessage('input-size'),'This MuseScore file is larger than the 32 MB the viewer can read.');
 assert.equal(museScoreRefusalMessage('native-event-budget'),'This MuseScore score is too large or detailed to convert.');
 assert.match(museScoreRefusalMessage('native-version'),/saved by a version of MuseScore the viewer can't read yet/);
 for(const code of ['native-zip','zip-identification','xml','native-container'])assert.match(museScoreRefusalMessage(code),/isn't a readable MuseScore score/);
 assert.match(museScoreRefusalMessage('native-part'),/parts or staves of this MuseScore score can't be read/);
 assert.match(museScoreRefusalMessage('worker-runtime'),/stopped unexpectedly/);
 assert.equal(museScoreRefusalMessage('native-figured-bass'),'This MuseScore score uses notation the viewer can\'t convert yet (figured bass).');
 for(const code of ['runtime-codec','native-version','xml','native-tremolo'])assert.doesNotMatch(museScoreRefusalMessage(code),/deflate|serialization|adapter|native|[<>]/i);
});

test('MuseScore fixtures convert through the public entry and meet the unchanged MusicXML intake',async t=>{
 const restore=installConverterNodeRuntime();
 try{
  for(const name of ['cross-staff-arpeggio.mscz','original-piano-clarinet.mscx']){
   const xml=await convertMuseScoreToMusicXml(fixture(name));
   assert.match(xml,/<score-partwise version="4.0">/);
   assert.equal(scoreImportKind(new TextEncoder().encode(xml)),'musicxml');
   try{
    const {bytes}=await prepareMuseScore(fixture(name),assets),p=await importPackage(bytes,{allowLegacyTempo:true});
    // Admitted only where the ISO reader accepts the converter's MusicXML.
    assert.equal(name,'cross-staff-arpeggio.mscz','Only the one-piano fixture may become a score.');
    for(const n of p.score.notes){const e=requirePianoEvent(n);assert.equal(e.hand,e.staffId==='1'?'RH':'LH');}
    t.diagnostic(`${name}: admitted .tuna with ${p.score.notes.length} notes`);
   }catch(error){
    assert.ok(error instanceof MuseScoreImportRefusal,(error as Error).message);
    assert.match(error.message,name==='cross-staff-arpeggio.mscz'?readerRefusal:new RegExp(`${readerRefusal.source}|^This file contains 2 instruments\\.`));
    t.diagnostic(`${name}: ${error.message}`);
   }
  }
 }finally{restore();}
});

test('a converter refusal reaches the player plainly and nothing is prepared',async()=>{
 const restore=installConverterNodeRuntime();
 try{
  const old=new TextEncoder().encode('<?xml version="1.0"?><museScore version="1.14"><Score/></museScore>');
  await assert.rejects(prepareMuseScore(old,assets),(error:unknown)=>error instanceof MuseScoreImportRefusal&&error.code==='native-version'&&
   error.message===museScoreRefusalMessage('native-version'));
  await assert.rejects(prepareMuseScore(Uint8Array.from([80,75,3,4,0,0,0,0]),assets),(error:unknown)=>error instanceof MuseScoreImportRefusal&&/isn't a readable MuseScore score/.test(error.message));
  await assert.rejects(convertMuseScoreToMusicXml(new Uint8Array(32*1024*1024+1)),(error:unknown)=>error instanceof MuseScoreImportRefusal&&error.code==='input-size');
 }finally{restore();}
});

test('MuseScore conversion is cancelled with the reading operation',async()=>{
 const restore=installConverterNodeRuntime();
 try{
  const before=new AbortController();before.abort();
  await assert.rejects(prepareMuseScore(fixture('cross-staff-arpeggio.mscz'),assets,{signal:before.signal}),{name:'AbortError'});
  const during=new AbortController(),pending=convertMuseScoreToMusicXml(fixture('cross-staff-arpeggio.mscz'),during.signal);
  during.abort();
  await assert.rejects(pending,{name:'AbortError'});
 }finally{restore();}
});
