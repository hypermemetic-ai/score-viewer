import test from 'node:test';import assert from 'node:assert/strict';
import {assigned,effectiveAssignments} from '../src/personal-assignments';
import {initialPersonal,fingerFor,readPersonal,type Entry} from '../src/state';
import {bootstrapPersonalFingeringMemory,editPersonalFingeringMemory,resolvePersonalFingeringMemory,type MemoryScoreInput} from '../src/personal-fingering-memory';
import {withResolvedMemory,memoryAdviceEvidence,memoryReferenceTarget,memoryChoiceLabel,memorySourceLabel} from '../src/personal-assistance';
import {PersonalMemoryLibrary} from '../src/personal-memory-library';
import type {ScorePackage} from '../src/package';
function fixture(entryId='piece'):MemoryScoreInput{
 const notes=[0,1,2].flatMap(b=>[48,60,64].map((pitch,j)=>({eventKind:'pitched',id:`b${b}n${j}`,pitch:{octave:Math.floor(pitch/12),pitchClass:pitch%12},startTick:b*192+j*24,durationTicks:24,hand:j?'RH':'LH'})));
 const p={manifest:{version:1,revision:'revision',metadata:{title:'Fixture'}},keyboardLayout:'janko-four-row',profileSha256:'geometry',pages:['svg'],score:{id:entryId,ticksPerBeat:48,totalTicks:576,sourceBarTicks:[0,192,384,576],notes},seats:notes.map((n,i)=>({id:`s${i}`,ownerIds:[n.id],writtenBar:Math.floor(i/3)+1,contactId:`c${i}`,actionId:`a${i}`,page:0,system:0,x:i,baseline:0,fontSize:12,pitchDigit:'1'}))} as unknown as ScorePackage;
 return{entryId,importedAt:'2020-01-01',p,personal:initialPersonal(p)};
}
test('resolved shared projection reaches notation and semantic consumers without becoming durable personal authorship',()=>{
 const input=fixture();input.personal=assigned(input.p,input.personal,input.p.seats[1],{finger:2});const memory=bootstrapPersonalFingeringMemory([input]),r=resolvePersonalFingeringMemory(memory,input.entryId,input.p,input.personal),personal=withResolvedMemory(input,r,memory.revision);
 assert.equal(fingerFor(input.p,personal,input.p.seats[4]),2);assert.equal(effectiveAssignments(input.p,personal).find(a=>a.id==='b2n1')?.finger,2);
 assert.equal(personal.assignments?.choices.b1n1,undefined);assert.equal(readPersonal(personal,input.p).memoryResolved,undefined);assert.equal(input.personal.memoryResolved,undefined);
});
test('source navigation maps exact written source owners and evidence counts the donor once, not copies',()=>{
 const input=fixture();input.personal=assigned(input.p,input.personal,input.p.seats[1],{finger:2});const memory=bootstrapPersonalFingeringMemory([input]),r=resolvePersonalFingeringMemory(memory,input.entryId,input.p,input.personal),e=memoryAdviceEvidence(input,r);
 assert.deepEqual(memoryReferenceTarget(input,r,'b2n1'),{entryId:'piece',sourceRevision:'revision',writtenBar:1,ownerId:'b0n1'});
 assert.equal(e.get('b0n1')?.evidence,'personal');assert.equal(e.get('b2n1')?.evidence,'inherited');assert.equal(e.get('b0n1')?.lineageId,e.get('b2n1')?.lineageId);
 assert.equal(memoryChoiceLabel(r,'b2n1'),'Shared');const next=editPersonalFingeringMemory(memory,input,{ownerId:'b2n1',finger:4,decisionId:'local',authoredAt:'2025-01-01'}).document;
 const local=resolvePersonalFingeringMemory(next,input.entryId,input.p,input.personal);
 assert.equal(memoryChoiceLabel(local,'b2n1'),'Local');
 assert.deepEqual(memoryReferenceTarget(input,local,'b2n1'),{entryId:'piece',sourceRevision:'revision',writtenBar:1,ownerId:'b0n1'});
 assert.equal(memorySourceLabel(next,local,'b2n1',()=> 'Fixture'),'Reference: Fixture, measure 1. Choice from Fixture, measure 3.');
 assert.equal(memoryAdviceEvidence(input,local).get('b2n1')?.evidence,'personal');
});
test('a local hand-match exception and suppression keep navigation to their underlying shared source',()=>{
 const input=fixture();(input.p.score.notes.find(n=>n.id==='b2n0') as any).pitch.pitchClass=2;
 input.personal=assigned(input.p,input.personal,input.p.seats[1],{finger:2});let memory=bootstrapPersonalFingeringMemory([input]);
 const expected={entryId:'piece',sourceRevision:'revision',writtenBar:1,ownerId:'b0n1'};
 for(const finger of [4,null] as const){
  memory=editPersonalFingeringMemory(memory,input,{ownerId:'b2n1',finger,decisionId:`local-${finger}`,authoredAt:'2025-01-01'}).document;
  const local=resolvePersonalFingeringMemory(memory,input.entryId,input.p,input.personal);
  assert.equal(local.byOwner.b2n1.finger?.provenance,'local');assert.equal(local.byOwner.b2n1.finger?.value,finger);
  assert.deepEqual(memoryReferenceTarget(input,local,'b2n1'),expected);
 }
});
test('library donor scan excludes historical editions and detects changes to active source bytes',async()=>{
 const input=fixture(),entry={id:'piece',file:'active.isoscore',metadata:{title:'Fixture'},importedAt:'2020-01-01',retainedPackages:['old.isoscore']} as Entry;
 const files=new Map([['active.isoscore',new Uint8Array([1])]]),reads:string[]=[];
 const library=new PersonalMemoryLibrary({read:async name=>{reads.push(name);return files.get(name)??null;}},()=>[entry],async()=>input.p);
 library.remember(input);assert.equal(library.scanned,false);const inputs=await library.scan();assert.equal(library.scanned,true);assert.equal(inputs.length,1);assert.ok(!reads.includes('old.isoscore'));assert.equal(await library.validate(),true);
 files.set('active.isoscore',new Uint8Array([2]));assert.equal(await library.validate(),false);
});
test('library additions during election invalidate the donor snapshot',async()=>{
 const input=fixture(),entries=[{id:'piece',file:'active.isoscore',metadata:{title:'Fixture'},importedAt:'2020-01-01'} as Entry];
 const library=new PersonalMemoryLibrary({read:async name=>name==='active.isoscore'?new Uint8Array([1]):null},()=>entries,async()=>input.p);
 await library.scan();entries.push({...entries[0],id:'other'});assert.equal(await library.validate(),false);
});
