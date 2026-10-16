import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {zipSync,strToU8} from 'fflate';
import {scoreImportKind} from '../src/score-import-kind';
import {prepareMusicXmlScore,musicXmlText,MusicXmlImportRefusal} from '../src/musicxml-import';
import {importPackage} from '../src/package';
import {requirePianoEvent} from '../src/piano-event';
import {PersonalPresentationSession} from '../src/personal-presentation';
import {PersonalPreparationPool} from '../src/personal-preparation-pool';
import {HandPresentationError} from '../vendor/iso-notation/src/score-presentation';

const fixture=readFileSync(new URL('./fixtures/musicxml/two-staff-piano.musicxml',import.meta.url)),xml=fixture.toString('utf8');
const assets={font:{name:'fonts/URWGothic-Demi.otf',bytes:readFileSync(new URL('../src/URWGothic-Demi.otf',import.meta.url))},
 notices:Object.fromEntries(['URW-base35-COPYING','URW-base35-LICENSE','URW-base35-provenance.md'].map(name=>
  ['licenses/'+name,readFileSync(new URL('../licenses/'+name,import.meta.url))]))};
const container=(root:string)=>strToU8(`<?xml version="1.0"?><container><rootfiles><rootfile full-path="${root}"/></rootfiles></container>`);

test('import routing reads content, not filenames',()=>{
 assert.equal(scoreImportKind(fixture),'musicxml');
 assert.equal(scoreImportKind(strToU8('﻿\n  '+xml)),'musicxml');
 const utf16=new Uint8Array(2+xml.length*2);utf16.set([0xff,0xfe]);for(let i=0;i<xml.length;i++){utf16[2+i*2]=xml.charCodeAt(i)&255;utf16[3+i*2]=xml.charCodeAt(i)>>8;}
 assert.equal(scoreImportKind(utf16),'musicxml');
 assert.equal(scoreImportKind(strToU8('<?xml version="1.0"?><score-timewise version="4.0"/>')),'musicxml');
 assert.equal(scoreImportKind(zipSync({'META-INF/container.xml':container('score.musicxml'),'score.musicxml':fixture})),'musicxml');
 assert.equal(scoreImportKind(zipSync({'META-INF/container.xml':container('Study.mscx'),'Study.mscx':strToU8('<museScore version="4.40"/>')})),'musescore');
 assert.equal(scoreImportKind(strToU8('<?xml version="1.0"?>\n<museScore version="3.02"><Score/></museScore>')),'musescore');
 assert.equal(scoreImportKind(zipSync({'manifest.json':strToU8('{}'),'META-INF/container.xml':container('x.musicxml')})),'score');
 assert.equal(scoreImportKind(strToU8('FICHIER GUITAR PRO v5.00')),'guitar-pro');
 assert.equal(scoreImportKind(strToU8('<GPIF/>')),'guitar-pro');
 assert.equal(scoreImportKind(strToU8(xml.replace('<score-partwise','<!--'+' '.repeat(5000)+'-->\n<score-partwise'))),'musicxml');
});

test('compressed MusicXML reads its declared root score',()=>{
 assert.equal(musicXmlText(zipSync({'META-INF/container.xml':container('inner/score.xml'),'inner/score.xml':fixture})),xml);
 assert.throws(()=>musicXmlText(zipSync({'META-INF/container.xml':container('missing.xml')})),MusicXmlImportRefusal);
});

test('MusicXML text honours its declared encoding',()=>{
 const latin=xml.replace('encoding="UTF-8"','encoding="ISO-8859-1"').replace('Two-staff study','Étude'),bytes=Uint8Array.from(latin,c=>c.charCodeAt(0));
 assert.match(musicXmlText(bytes),/<work-title>Étude<\/work-title>/);
 assert.throws(()=>musicXmlText(strToU8(xml.replace('encoding="UTF-8"','encoding="X-NOPE"'))),/unsupported text encoding/);
});

test('a two-staff piano part becomes an admitted .tuna with hands from the printed staves',async()=>{
 const {bytes,filename}=await prepareMusicXmlScore(fixture,assets);
 assert.equal(filename,'Two-staff-study.tuna');
 const p=await importPackage(bytes,{allowLegacyTempo:true});
 assert.equal(p.manifest.metadata.title,'Two-staff study');assert.equal(p.manifest.metadata.composer,'Fixture');
 assert.deepEqual(p.availablePresentations?.slice().sort(),['conventional-piano','janko-four-row']);
 assert.equal(p.score.notes.length,11);assert.equal(p.seats.length,11);assert.ok(p.pages.length>=1);
 for(const n of p.score.notes){const e=requirePianoEvent(n);assert.equal(e.hand,e.staffId==='1'?'RH':'LH');}
 assert.equal(p.renderingRecipe?.sourceSha256,p.sourceSha256);
 // The same input reimports as the same score, so it updates rather than duplicates.
 assert.equal((await importPackage((await prepareMusicXmlScore(fixture,assets)).bytes,{allowLegacyTempo:true})).manifest.scoreId,p.manifest.scoreId);
});

test('a lower staff of rests still reads as a two-staff piano part',async()=>{
 const rest='<note><rest measure="yes"/><duration>8</duration><voice>5</voice><type>whole</type><staff>2</staff></note>',
  lower=xml.match(/^.*<staff>2<\/staff><\/note>$/gm)!;assert.equal(lower.length,4);
 const rests=xml.replace(lower[0],rest).replace(lower[1]+'\n','').replace(lower[2],rest).replace(lower[3]+'\n','');
 const p=await importPackage((await prepareMusicXmlScore(strToU8(rests),assets)).bytes,{allowLegacyTempo:true});
 assert.ok(p.score.notes.length>0&&p.score.notes.every(n=>requirePianoEvent(n).hand==='RH'));
});

test('multi-instrument, one-staff and unreadable files refuse with a reason',async()=>{
 const twoParts=xml.replace('</part-list>','<score-part id="P2"><part-name>Violin</part-name></score-part></part-list>')
  .replace('</score-partwise>',`<part id="P2"><measure number="1"><attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><note><rest measure="yes"/><duration>8</duration><voice>1</voice><type>whole</type></note></measure><measure number="2"><note><rest measure="yes"/><duration>8</duration><voice>1</voice><type>whole</type></note></measure></part></score-partwise>`);
 await assert.rejects(prepareMusicXmlScore(strToU8(twoParts),assets),{name:'Error',message:/contains 2 instruments.*one instrument at a time/});
 const oneStaff=xml.replace('<staves>2</staves>','').replace(/<clef number="2">.*?<\/clef>/,'').replaceAll('<staff>2</staff>','<staff>1</staff>').replace('<clef number="1">','<clef>');
 await assert.rejects(prepareMusicXmlScore(strToU8(oneStaff),assets),/written on 1 staff\. MusicXML import currently reads two-staff piano scores/);
 const playback=xml.replace('<instrument-name>Piano</instrument-name>','<instrument-name>Piano</instrument-name><instrument-sound>keyboard.piano</instrument-sound>');
 await assert.rejects(prepareMusicXmlScore(strToU8(playback),assets),err=>err instanceof MusicXmlImportRefusal&&/can't be read yet: .*instrument-sound/.test(err.message));
});

test('an engraving refusal reaches the player in plain words, keeping its diagnosis',async()=>{
 const p=await importPackage((await prepareMusicXmlScore(fixture,assets)).bytes,{allowLegacyTempo:true}),
  refusal=new HandPresentationError('unsupported-fit','Personal hands cannot fit the matching musical presentation.'),
  pool={use:async()=>{throw refusal;}} as unknown as PersonalPreparationPool<never>;
 await assert.rejects(new PersonalPresentationSession(p,pool).warm(),(err:Error)=>err.message==="This score can't be displayed yet: the viewer can't draw its pages."&&err.cause===refusal);
});
