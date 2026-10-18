import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {completeTieBoundaryStudy,sourcePackage,calculatedStudy} from './support/hand-edition-fixture';
import {admittedWrittenHeads,importPackage} from '../src/package';
import {PackageAdmissionSession} from '../src/package-admission-session';
import {renderScorePresentation,type ScoreRenderingRecipe} from '../vendor/iso-notation/src/score-presentation';

test('actual written-head evidence preserves continued IDs; returned maps and package clones cannot attach claims',async()=>{
 const source=completeTieBoundaryStudy(4,'LH'),original=await sourcePackage(source,{measuresPerSystem:1,systemsPerPage:1,pageWidth:255}),
  q=await calculatedStudy(original.p,'janko-four-row',Object.fromEntries(source.notes.map(n=>[n.id,n.id==='following-attack'?source.notes[0].hand!:n.hand!]))),session=new PackageAdmissionSession(),p=await session.import(q.bytes),
  expected=new Map(renderScorePresentation(p.score,p.renderingRecipe as ScoreRenderingRecipe).writtenHeads.map(h=>[h.seatId,h.headIds])),heads=admittedWrittenHeads(p);
 assert.ok(heads);assert.deepEqual(heads,expected);assert.ok([...heads.values()].flat().some(id=>!source.notes.some(n=>n.id===id)));
 const mutable=heads as Map<string,string[]>;mutable.get(p.seats[0].id)!.push('forged');mutable.delete(p.seats[1].id);
 assert.deepEqual(admittedWrittenHeads(p),expected);assert.equal(admittedWrittenHeads(structuredClone(p)),undefined);
 const copy=await session.import(q.bytes);assert.deepEqual(admittedWrittenHeads(copy),expected);assert.notEqual(admittedWrittenHeads(copy),admittedWrittenHeads(p));
 session.clear();assert.deepEqual(admittedWrittenHeads(copy),expected);
});

test('semantic/source/seat/recipe/page mutations and disguised accessors refuse ledger reuse',async()=>{
 const source=completeTieBoundaryStudy(3,'RH'),original=await sourcePackage(source,{measuresPerSystem:1,systemsPerPage:1,pageWidth:255}),
  q=await calculatedStudy(original.p,'janko-four-row',Object.fromEntries(source.notes.map(n=>[n.id,n.id==='following-attack'?source.notes[0].hand!:n.hand!]))),session=new PackageAdmissionSession();
 for(const change of [
  (p:any)=>p.score.notes[0].durationTicks++,
  (p:any)=>{p.sourceScore=structuredClone(p.sourceScore);p.sourceScore.notes[0].pitch.pitchClass++;},
  (p:any)=>p.seats[0].ownerIds.push('foreign'),
  (p:any)=>p.seats[0].x++,
  (p:any)=>p.renderingRecipe.options.pageWidth++,
  (p:any)=>p.manifest.sourceSha256='0'.repeat(64),
  (p:any)=>p.fingerLayer.attacks[0].finger=0,
  (p:any)=>p.preparationIdentity.handPolicy='changed',
  (p:any)=>p.calculationContext={referencePerformanceTempo:{bpm:1}},
  (p:any)=>p.annotationGeometry={},
  (p:any)=>p.pages[0]+=' ',
  (p:any)=>{const prior=structuredClone(p.score);p.score.notes[0].durationTicks++;p.score.toJSON=()=>prior;},
  (p:any)=>{const score=p.score;Object.defineProperty(p,'score',{get:()=>score});},
  (p:any)=>{const pages=p.pages;Object.defineProperty(p,'pages',{get:()=>pages});},
  (p:any)=>{p.score=new Proxy(p.score,{get:(target,key)=>key==='notes'?[{...target.notes[0],durationTicks:1},...target.notes.slice(1)]:Reflect.get(target,key)});},
  (p:any)=>{p.pages=new Proxy(p.pages,{get:(target,key)=>key==='0'?target[0]+' ':Reflect.get(target,key)});},
  (p:any)=>{p.score.notes[0]=new Proxy(p.score.notes[0],{get:(target,key)=>key==='durationTicks'?1:Reflect.get(target,key)});},
  (p:any)=>{p.pages[0]+=' ';p.pages.some=()=>false;},
  (p:any)=>{p.pages.entries=()=>[].entries();},
  (p:any)=>{p.score.notes[Symbol.iterator]=function*(){yield {...p.score.notes[0],durationTicks:1};};},
 ]){const p=await session.import(q.bytes);assert.ok(admittedWrittenHeads(p));change(p);assert.equal(admittedWrittenHeads(p),undefined);}
 const restored=await session.import(q.bytes);assert.ok(admittedWrittenHeads(restored));
});

test('legacy fixed-page reading without actual calculated replay keeps the strict fallback',async()=>{
 const p=await importPackage(new Uint8Array(readFileSync(new URL('../fixtures/schumann-op68-no14.tuna',import.meta.url))),{allowLegacyTempo:true});
 assert.equal(admittedWrittenHeads(p),undefined);assert.equal(admittedWrittenHeads({...p}),undefined);
});
