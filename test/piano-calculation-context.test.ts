import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {strFromU8,strToU8,unzipSync,zipSync} from 'fflate';
import {publishPreparedNative,publishPackage} from '../src/publication';
import {preparePianoCalculationContext} from '../src/piano-context-package';
import {hashBytes,importPackage,pianoPlanningScore,type Manifest} from '../src/package';
import {collectionId,personalStorageName} from '../src/state';
import {attachPresentationSeats} from '../vendor/iso-notation/src/render/iso/presentation-seats';
import {validatePianoCalculationContext,type PianoCalculationContext} from '../vendor/iso-notation/src/model/piano-calculation-context';
import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';

const reference={version:'reference-performance-tempo-v1' as const,bpm:120,beat:{numerator:1,denominator:4},provenance:{kind:'editorial' as const,reference:'Authored arrangement fixture: printed quarter note =120'}};
const score:QuantizedGridScore={id:'authored-context-probe',title:'Study',composer:'Fixture',ticksPerBeat:48,totalTicks:96,sourceBarTicks:[0,48,96],
  notes:[{id:'held-owner',eventKind:'pitched' as const,pitch:{octave:4,pitchClass:0},startTick:0,durationTicks:96,hand:'RH'}],
  barlines:[],timeSignatures:[],tempos:[{tick:0,bpm:120}],dynamics:[],pedals:[]};
const seats=[{id:'a',page:0,ownerIds:['held-owner'],actionId:'0:48',contactId:'0:48',pitchDigit:'0',x:10,baseline:20,fontSize:5,system:0,writtenBar:1},
  {id:'b',page:0,ownerIds:['held-owner'],actionId:'0:48',contactId:'0:48',pitchDigit:'0',x:30,baseline:20,fontSize:5,system:0,writtenBar:2,continuation:true}];
const raw='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text class="janko-digit" x="10" y="20" font-size="5pt">0</text><text class="janko-digit" x="30" y="20" font-size="5pt">0</text></svg>';
const original=await publishPreparedNative({source:strToU8(JSON.stringify(score)),metadata:{title:'Study',composer:'Fixture',provenance:['Authored test']},
  engineVersion:'authored-passive-fixture',createdAt:'2026-10-07',font:{name:'fonts/fixture.otf',bytes:new Uint8Array([1,2,3])},notices:{'notices/license.txt':strToU8('Authored test data')},
  presentations:[{layoutId:'janko-four-row',seats,pages:attachPresentationSeats([raw],seats)}]});
const context:PianoCalculationContext={version:'piano-calculation-context-v1',sourceSha256:original.package.sourceSha256!,referencePerformanceTempo:reference};
async function changed(bytes:Uint8Array,edit:(m:Manifest,files:Record<string,Uint8Array>)=>void|Promise<void>){
  const files=unzipSync(bytes),m=JSON.parse(strFromU8(files['manifest.json'])) as Manifest;await edit(m,files);
  m.files=Object.fromEntries(await Promise.all(Object.entries(files).filter(([n])=>n!=='manifest.json').map(async([n,b])=>[n,await hashBytes(b)])));
  files['manifest.json']=strToU8(JSON.stringify(m));return zipSync(files);
}
test('explicit calculation reference preserves immutable source, native tempo, seats, pages and collection/personal identity',async()=>{
  const bytes=await preparePianoCalculationContext(original.package,context),p=await importPackage(bytes);
  assert.deepEqual(p.sourceScore,score);assert.equal(p.sourceScore?.referencePerformanceTempo,undefined);
  assert.deepEqual(p.score.referencePerformanceTempo,reference);assert.deepEqual(p.score.tempos,score.tempos);
  assert.deepEqual(p.files['source-score.json'],original.package.files['source-score.json']);
  assert.equal(p.sourceSha256,original.package.sourceSha256);assert.equal(collectionId(p),collectionId(original.package));
  assert.equal(personalStorageName('entry',p),personalStorageName('entry',original.package));
  assert.deepEqual(p.pages,original.package.pages);assert.deepEqual(p.seats,seats);assert.equal(p.fingerLayer,undefined);
  assert.deepEqual(pianoPlanningScore(p).referencePerformanceTempo,reference);assert.equal(Object.isFrozen(p.sourceScore),true);
  const detached=pianoPlanningScore(p);detached.notes[0].durationTicks=1;assert.equal(p.sourceScore!.notes[0].durationTicks,96);
  const shared=await publishPackage(p);assert.deepEqual(shared.package.calculationContext,context);assert.deepEqual(shared.package.sourceScore,score);
});
test('context rejects wrong source, unknown fields/version, noncanonical tempo and conflicting existing source reference',()=>{
  for(const edit of[(q:any)=>q.sourceSha256='0'.repeat(64),(q:any)=>q.version='future',(q:any)=>q.extra=true,
    (q:any)=>q.referencePerformanceTempo.provenance.reference+=' ',(q:any)=>q.referencePerformanceTempo.beat={numerator:2,denominator:8}]){
    const q=structuredClone(context);edit(q);assert.throws(()=>validatePianoCalculationContext(q,context.sourceSha256,score),/context|canonical/);
  }
  assert.throws(()=>validatePianoCalculationContext(context,context.sourceSha256,{referencePerformanceTempo:{...reference,bpm:121}}),/conflicts/);
  assert.throws(()=>validatePianoCalculationContext(context,context.sourceSha256,{referencePerformanceTempo:{...reference,unknownSourceFact:true} as any}),/conflicts/);
});
test('untrusted context cannot exempt any other musical source fact or silently change the declared reference',async()=>{
  const bytes=await preparePianoCalculationContext(original.package,context);
  for(const edit of[(q:any)=>q.notes[0].durationTicks=95,(q:any)=>q.tempos[0].bpm=119,(q:any)=>q.notes[0].voice=2,
    (q:any)=>q.referencePerformanceTempo.bpm=121]){
    const bad=await changed(bytes,async(m,f)=>{const q=JSON.parse(strFromU8(f['score.json']));edit(q);f['score.json']=strToU8(JSON.stringify(q));
      m.revision=m.semanticSha256=await hashBytes(f['score.json']);m.presentations!['janko-four-row']!.revision=m.revision;});
    await assert.rejects(importPackage(bad),/musical source facts|calculation reference/);
  }
  const bad=await changed(bytes,m=>{m.calculationContext!.sourceSha256='0'.repeat(64);});await assert.rejects(importPackage(bad),/source-mismatched/);
});
test('context preparation verifies installed pins and refuses to silently re-pin an already calculated layer',async()=>{
  const tampered=await importPackage(original.bytes);tampered.files[tampered.manifest.pages[0]][20]^=1;
  await assert.rejects(preparePianoCalculationContext(tampered,context),/Integrity mismatch/);
  const p=await importPackage(readFileSync(new URL('../vendor/iso-notation/public/review/schumann-no14-conventional-20261006.isoscore',import.meta.url)));
  const q:PianoCalculationContext={version:'piano-calculation-context-v1',sourceSha256:p.sourceSha256!,referencePerformanceTempo:p.sourceScore!.referencePerformanceTempo!};
  await assert.rejects(preparePianoCalculationContext(p,q),/fresh complete finger replay/);
});
