import test from 'node:test';import assert from 'node:assert/strict';
import {strToU8} from 'fflate';
import {hashBytes,archivePackage,importPackage,validateLayerAsync} from '../src/package';
import {publishPreparedNative,publishPackage} from '../src/publication';
import {corrected,fingerFor,fingerDisplayAvailable,initialPersonal,readPersonal} from '../src/state';
import {attachPresentationSeats} from '../vendor/iso-notation/src/render/iso/presentation-seats';
import {normalizeTemporalHandPlanningInput} from '../vendor/iso-notation/src/model/temporal-hand-planning-input';
import {rrTemporalFingerLayer} from '../vendor/iso-notation/src/model/rr-temporal-finger-layer';
import {completeFingerGrip} from '../vendor/iso-notation/src/model/isomorphic-fingering-profile';
import {RR_PERFORMANCE_POSE_PROFILE} from '../vendor/iso-notation/src/model/isomorphic-rr-personal-pose';
import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';

const source:QuantizedGridScore={id:'authored-temporal-package',title:'Held contact study',composer:'Fixture',ticksPerBeat:48,totalTicks:72,
  sourceBarTicks:[0,24,48,72],barlines:[],timeSignatures:[],tempos:[],dynamics:[],pedals:[],
  referencePerformanceTempo:{version:'reference-performance-tempo-v1',bpm:104,beat:{numerator:1,denominator:4},
    provenance:{kind:'editorial',reference:'Explicit authored package test clock'}},
  notes:[[48,0,24],[48,0,72],[52,24,24],[55,48,24]].map(([pitch,startTick,durationTicks],i)=>({id:`owner-${i}`,
    eventKind:'pitched' as const,pitch:{octave:Math.floor(pitch/12),pitchClass:pitch%12},startTick,durationTicks,hand:'RH',voice:i}))};
async function prepared(){
  const input=normalizeTemporalHandPlanningInput(source),selected=input.gestures.map(g=>{
    const all=[...g.attacks,...g.carried],keys=all.map(a=>({pitch:a.pitch,finger:a.pitch===48?1:a.pitch===52?3:5,row:2-a.pitch%2})),
      RH=completeFingerGrip('RH',keys,RR_PERFORMANCE_POSE_PROFILE),attackRoles:Record<string,{hand:'RH';key:typeof keys[number]}>={};
    all.forEach((a,i)=>a.owners.forEach(o=>attackRoles[o.id]={hand:'RH',key:keys[i]}));
    return{id:g.id,pattern:'R'.repeat(g.attacks.length),RH,attackRoles,nominalCost:0};
  }),seats=input.gestures.flatMap(g=>g.attacks.map(a=>({id:a.id,page:0,ownerIds:a.owners.map(o=>o.id),actionId:a.id,contactId:a.id,
    pitchDigit:String(a.pitch%12),x:10+a.startTick,baseline:20,fontSize:5,system:0,writtenBar:g.sourceBar!}))),
    continuation={...seats[0],id:'continuation',x:82,writtenBar:3,continuation:true};seats.push(continuation);
  const raw='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'+seats.map(s=>
    `<text class="janko-digit" x="${s.x}" y="20" font-size="5pt">${s.pitchDigit}</text>`).join('')+'</svg>',
    original=await publishPreparedNative({source:strToU8(JSON.stringify(source)),metadata:{title:source.title,composer:source.composer,provenance:['Authored test']},
      engineVersion:'authored-passive-fixture',createdAt:'2026-10-07',font:{name:'fonts/fixture.otf',bytes:new Uint8Array([1,2,3])},
      notices:{'notices/license.txt':strToU8('Authored test')},presentations:[{layoutId:'janko-four-row',seats,pages:attachPresentationSeats([raw],seats)}]}),
    p=original.package,layer=await rrTemporalFingerLayer(input,selected,{sourceHash:p.sourceSha256!,sourceBytesSha256:p.sourceSha256!,
      revision:p.manifest.revision,candidateId:'authored-rr-package-test'}),m=structuredClone(p.manifest),files={...p.files};delete files['manifest.json'];
  files['fingers.json']=strToU8(JSON.stringify(layer));m.files['fingers.json']=await hashBytes(files['fingers.json']);
  m.profileId=layer.profileId;m.profileSha256=layer.profileSha256;
  Object.assign(m.presentations!['janko-four-row']!,{fingers:'fingers.json',profileId:layer.profileId,profileSha256:layer.profileSha256});
  const bytes=archivePackage(m,files);return{bytes,p:await importPackage(bytes),original};
}
test('strict package admits independently replayed four-row fingers and supports editable aliases/continuation annotations',async()=>{
  const {p,original}=await prepared();assert.deepEqual(p.sourceScore,source);assert.equal(p.sourceSha256,original.package.sourceSha256);
  assert.deepEqual(p.pages,original.package.pages);assert.equal(p.fingerLayer!.attacks.length,3);
  assert.equal(p.fingerEligibility.eligible,false);
  const state=initialPersonal(p);assert.equal(fingerDisplayAvailable(p,state,'annotations'),true);assert.equal(fingerDisplayAvailable(p,state,'replacement'),false);
  const edited=corrected(p,state,p.seats[0],2),restored=readPersonal(JSON.parse(JSON.stringify(edited)),p);
  assert.equal(fingerFor(p,restored,p.seats[0]),2);assert.equal(fingerFor(p,restored,p.seats[3]),2);
  assert.deepEqual(restored.overrides[p.seats[0].contactId].ownerIds,['owner-0','owner-1']);
  const shared=await publishPackage(p);assert.deepEqual(shared.package.fingerLayer,p.fingerLayer);assert.deepEqual(shared.package.pages,p.pages);
});
test('package admission never trusts a temporal digest or an unselected forged contact replay',async()=>{
  const {p}=await prepared(),bad=structuredClone(p.fingerLayer!);bad.attacks[1].finger=1;
  await assert.rejects(validateLayerAsync(bad,p),/replay|finger/);
  const mutated=structuredClone(p.fingerLayer!);(mutated.replay as any).performance[0].endState.RH.tips[0].x++;
  await assert.rejects(validateLayerAsync(mutated,p),/certificate/);
  const files={...p.files};delete files['manifest.json'];files['fingers.json']=strToU8(JSON.stringify(mutated));
  const m=structuredClone(p.manifest);m.files['fingers.json']=await hashBytes(files['fingers.json']);
  await assert.rejects(importPackage(archivePackage(m,files)),/certificate/);
});
