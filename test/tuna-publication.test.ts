import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {strFromU8,strToU8,unzipSync,zipSync} from 'fflate';
import {importPackage,importPackageForReading,hashBytes,referenceMidiDiffers,selectPresentation,headerOnlyRefresh,type Manifest} from '../src/package';
import {publishPackage,publishPreparedNative,scoreFilename,validateScoreSave} from '../src/publication';
import {shareInstalledScore,scoreSaveMessage} from '../src/share-score';
import {validateReferenceMidi,MAX_REFERENCE_MIDI_BYTES} from '../src/reference-midi';
import {attachPresentationSeats} from '../vendor/iso-notation/src/render/iso/presentation-seats';
import {validateScoreRenderingRecipe} from '../vendor/iso-notation/src/render/iso/score-rendering-recipe';
import {collectionId,personalStorageName,initialPersonal,corrected} from '../src/state';
import {planPractice} from '../src/practice';
import {planPerformance} from '../src/performance';

const legacy=readFileSync(new URL('../fixtures/schumann-op68-no14.tuna',import.meta.url));
const dual=readFileSync(new URL('../vendor/iso-notation/public/review/schumann-no14-conventional-20261006.isoscore',import.meta.url));
const track=(events:number[])=>new Uint8Array([...Buffer.from('MThd'),0,0,0,6,0,0,0,1,0,48,...Buffer.from('MTrk'),0,0,events.length>>8,events.length&255,...events]);
const midi=track([0,0x90,60,80,48,0x80,60,0,0,0xff,0x2f,0]);
async function edit(bytes:Uint8Array,fn:(m:Manifest,f:Record<string,Uint8Array>)=>void|Promise<void>){const f=unzipSync(bytes),m=JSON.parse(strFromU8(f['manifest.json'])) as Manifest;await fn(m,f);m.files=Object.fromEntries(await Promise.all(Object.entries(f).filter(([n])=>n!=='manifest.json').map(async([n,b])=>[n,await hashBytes(b)])));f['manifest.json']=strToU8(JSON.stringify(m));return zipSync(f);}

test('reference SMF validates framing, running status and passive metadata without notation inference',()=>{
 validateReferenceMidi(midi);validateReferenceMidi(track([0,0x90,60,80,1,61,70,0,0xf0,2,1,0xf7,0,0xff,1,2,65,66,0,0xff,0x2f,0]));
 for(const b of [midi.slice(0,-1),track([0,60,80,0,0xff,0x2f,0]),track([0,0x90,60,0x90,0,0xff,0x2f,0]),track([0,0xff,0x51,2,1,2,0,0xff,0x2f,0]),track([0,0xff,0x2f,0,0,0x90,60,80]),track([0x81,0x81,0x81,0x81,0,0xff,0x2f,0]),track([0,0xf1,0]),track([0,0x90,60,80])])assert.throws(()=>validateReferenceMidi(b),/Reference MIDI/);
 assert.throws(()=>validateReferenceMidi(new Uint8Array(MAX_REFERENCE_MIDI_BYTES+1)),/1 MiB/);
 const smpte=midi.slice();smpte[12]=232;smpte[13]=40;validateReferenceMidi(smpte);smpte[12]=230;assert.throws(()=>validateReferenceMidi(smpte),/division/);
});

test('legacy publication retains music, pages, fingers, notices and state identity; declared MIDI is pinned',async()=>{
 const original=await importPackage(legacy,{allowLegacyTempo:true}),pub=await publishPackage(original,midi),p=await importPackage(pub.bytes,{allowLegacyTempo:true}),again=await publishPackage(p);
 assert.deepEqual(p.referenceMidi,midi);assert.deepEqual(again.package.referenceMidi,midi);assert.deepEqual(p.score,original.score);assert.deepEqual(p.pages,original.pages);assert.deepEqual(p.seats,original.seats);assert.deepEqual(p.fingerLayer,original.fingerLayer);
 assert.equal(p.manifest.version,1);assert.equal(p.manifest.revision,original.manifest.revision);assert.equal(collectionId(p),collectionId(original));assert.equal(personalStorageName(collectionId(p),p),personalStorageName(collectionId(original),original));assert.ok(referenceMidiDiffers(original,p));assert.ok(!headerOnlyRefresh(original,p));assert.ok(!referenceMidiDiffers(p,again.package));
 assert.match(pub.filename,/\.tuna$/);assert.ok(p.manifest.notices.every(n=>Buffer.from(p.files[n]).equals(Buffer.from(original.files[n]))));
 const missing=await edit(pub.bytes,(m,f)=>{delete f['reference.mid'];});await assert.rejects(importPackage(missing,{allowLegacyTempo:true}),/reference MIDI descriptor/);
 const malformed=await edit(pub.bytes,(m,f)=>{f['reference.mid']=strToU8('not MIDI');});await assert.rejects(importPackage(malformed,{allowLegacyTempo:true}),/Reference MIDI/);
 const tampered=unzipSync(pub.bytes);tampered['reference.mid']=midi.slice();tampered['reference.mid'][25]^=1;await assert.rejects(importPackage(zipSync(tampered),{allowLegacyTempo:true}),/Integrity mismatch/);
});
test('ordinary UI reading imports a shared legacy fixture while strict new-input and performance prerequisites remain intact',async()=>{
 await assert.rejects(importPackage(legacy),/explicit reference performance tempo/);
 const old=await importPackageForReading(legacy),shared=await publishPackage(old),recipient=await importPackageForReading(shared.bytes);
 assert.deepEqual(recipient.pages,old.pages);assert.deepEqual(recipient.fingerLayer,old.fingerLayer);assert.equal(recipient.score.referencePerformanceTempo,undefined);assert.equal(recipient.manifest.revision,old.manifest.revision);
 assert.throws(()=>planPractice(recipient),/explicit reference performance tempo/);assert.throws(()=>planPerformance(recipient),/explicit reference performance tempo/);
 const invalid=await edit(legacy,async(m,f)=>{const score=JSON.parse(strFromU8(f['score.json']));score.referencePerformanceTempo={bpm:0,beat:'quarter'};f['score.json']=strToU8(JSON.stringify(score));m.revision=m.semanticSha256=await hashBytes(f['score.json']);});
 await assert.rejects(importPackageForReading(invalid),/reference|tempo/i);
});

test('publisher closure excludes acquisition/debug/sidecars and keeps every linked presentation within 512 KiB',async()=>{
 const attachment=await edit(dual,(_m,f)=>{f['source.pdf']=strToU8('%PDF-private');f['raw.xml']=strToU8('<score/>');f['research.json']=strToU8('{}');f['preferences.json']=strToU8('{}');});
 const original=await importPackage(attachment),pub=await publishPackage(original,midi);assert.ok(pub.bytes.length<=512*1024);assert.deepEqual(pub.excluded.sort(),['preferences.json','raw.xml','research.json','source.pdf']);
 for(const id of ['janko-four-row','conventional-piano'] as const){const a=await selectPresentation(original,id),b=await selectPresentation(pub.package,id);assert.deepEqual(b.pages,a.pages);assert.deepEqual(b.seats,a.seats);assert.deepEqual(b.score,a.score);assert.deepEqual(b.fingerLayer,a.fingerLayer);assert.equal(b.profileSha256,a.profileSha256);assert.equal(b.effectiveHandSha256,a.effectiveHandSha256);}
 assert.deepEqual(pub.package.referenceMidi,midi);
 const disguised=await edit(dual,(m,f)=>{m.notices.push('source.pdf');f['source.pdf']=strToU8('%PDF-private');});await assert.rejects(publishPackage(await importPackage(disguised)),/plain text/);
});

test('publication refuses altered installed bytes instead of re-pinning them, and ignores unvalidated v2 roles on v1',async()=>{
 const p=await importPackage(legacy,{allowLegacyTempo:true});p.files[p.manifest.pages[0]]=p.files[p.manifest.pages[0]].slice();p.files[p.manifest.pages[0]][40]^=1;
 await assert.rejects(publishPackage(p),/Integrity mismatch/);
 const q=await importPackage(legacy,{allowLegacyTempo:true});q.files[q.manifest.font]=q.files[q.manifest.font].slice();q.files[q.manifest.font][12]^=1;
 await assert.rejects(publishPackage(q),/Integrity mismatch/);
 const dormant=await edit(legacy,(m,f)=>{f['source.pdf']=strToU8('%PDF-private');m.sourceScore='source.pdf';m.renderingRecipe='source.pdf';m.presentations={bad:{score:'source.pdf'}} as any;m.calculationContext={unvalidated:'v2-only'} as any;});
 const pub=await publishPackage(await importPackage(dormant,{allowLegacyTempo:true}));assert.deepEqual(pub.excluded,['source.pdf']);assert.equal(pub.package.manifest.sourceScore,undefined);assert.equal(pub.package.manifest.presentations,undefined);assert.equal(pub.package.manifest.renderingRecipe,undefined);assert.equal(pub.package.manifest.calculationContext,undefined);
});

test('prepared static native reading needs neither reference-performance tempo, fingers nor a recipe',async()=>{
 const p=await importPackage(legacy,{allowLegacyTempo:true}),source=structuredClone(p.score);delete source.referencePerformanceTempo;
 const raw=p.pages.map(s=>s.replace(/ data-viewer-seat="[^"]*"/g,'')),pages=attachPresentationSeats(raw,p.seats);
 assert.deepEqual(pages,p.pages);
 const pub=await publishPreparedNative({source:strToU8(JSON.stringify(source)),metadata:p.manifest.metadata,engineVersion:'approved-test-engine',createdAt:p.manifest.createdAt,font:{name:p.manifest.font,bytes:p.files[p.manifest.font]},notices:Object.fromEntries(p.manifest.notices.map(n=>[n,p.files[n]])),presentations:[{layoutId:'janko-four-row',seats:p.seats,pages}]},midi);
 assert.equal(pub.package.score.referencePerformanceTempo,undefined);assert.deepEqual(pub.package.score.tempos,source.tempos);assert.equal(pub.package.fingerLayer,undefined);assert.equal(pub.package.renderingRecipe,undefined);assert.equal(initialPersonal(pub.package).view.labelMode,'pitch');assert.deepEqual(pub.package.seats,p.seats);assert.deepEqual(pub.package.pages,p.pages);
 assert.equal(pub.package.score.notes.length,383);assert.equal(new Set(pub.package.seats.flatMap(s=>s.ownerIds)).size,383);
 assert.throws(()=>attachPresentationSeats(raw,[...p.seats,p.seats[0]]),/identities/);assert.throws(()=>attachPresentationSeats(raw,p.seats.slice(1)),/ownership/);
 const wrong=structuredClone(p.seats);wrong[0].x+=1;assert.throws(()=>attachPresentationSeats(raw,wrong),/ownership/);
});

test('future passive recipe preserves fixed pages; strict generation and active/malformed preparation remain rejected',async()=>{
 const bytes=await edit(dual,(_m,f)=>{const r=JSON.parse(strFromU8(f['rendering-recipe.json']));r.version='future-passive-v2';r.engineId='future-engine';r.options.newGeometry={kind:'passive'};f['rendering-recipe.json']=strToU8(JSON.stringify(r));});
 const p=await importPackage(bytes),old=await importPackage(dual);assert.deepEqual(p.pages,old.pages);assert.throws(()=>validateScoreRenderingRecipe(p.renderingRecipe),/Unsupported/);
 const active=await edit(bytes,(_m,f)=>{const r=JSON.parse(strFromU8(f['rendering-recipe.json']));r.options.constructor='program';f['rendering-recipe.json']=strToU8(JSON.stringify(r));});await assert.rejects(importPackage(active),/passive data/);
 const invalid=await edit(bytes,(_m,f)=>{const r=JSON.parse(strFromU8(f['rendering-recipe.json']));delete r.baseline;f['rendering-recipe.json']=strToU8(JSON.stringify(r));});await assert.rejects(importPackage(invalid),/Unsupported/);
});

test('sharing saves installed collection once, with no personal state or MIDI/output service',async()=>{
 const p=(await publishPackage(await importPackage(dual),midi)).package,installed=await selectPresentation(p,'janko-four-row');let calls=0;
 const base=initialPersonal(installed),seat=installed.seats[0],personal=corrected(installed,base,seat,((installed.fingerLayer!.attacks.find(a=>a.id===seat.actionId)!.finger)%5)+1);const originalPersonal=JSON.stringify(personal);
 const result=await shareInstalledScore(installed,{async saveScore(bytes,filename){calls++;assert.match(filename,/\.tuna$/);const q=await importPackage(bytes);assert.deepEqual(q.availablePresentations,p.availablePresentations);assert.deepEqual(q.referenceMidi,midi);assert.deepEqual(q.pages,p.pages);assert.ok(!Object.keys(q.files).some(n=>/state|preferences|practice|performance/.test(n)));return {status:'cancelled'};}});
 assert.equal(calls,1);assert.equal(result.status,'cancelled');assert.equal(scoreSaveMessage(result),'Score save cancelled.');assert.equal(scoreSaveMessage({status:'downloaded'}),'Score download started.');assert.equal(JSON.stringify(personal),originalPersonal);
 assert.equal(scoreSaveMessage({status:'saved',filename:'Study.tuna',bytes:1025}),'Score saved: Study.tuna (2 KiB)');
 assert.equal(scoreSaveMessage({status:'downloaded',filename:'Study.tuna',bytes:1024}),'Score download started: Study.tuna (1 KiB)');
 await assert.rejects(shareInstalledScore(installed,{async saveScore(){throw Error('disk unavailable');}}),/disk unavailable/);
 assert.equal(scoreFilename('../CON'),'Score.tuna');assert.equal(scoreFilename('Zelda’s Lullaby'),'Zelda-s-Lullaby.tuna');assert.throws(()=>validateScoreSave(midi,'Score.tuna'),/Invalid/);assert.throws(()=>validateScoreSave(legacy,'../Score.tuna'),/filename/);
});
