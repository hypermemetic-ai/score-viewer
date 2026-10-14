import test from 'node:test';import assert from 'node:assert/strict';
import {preservePersonalMemoryHandChange,snapshotPersonalMemoryLocals,restorePersonalMemoryLocals,importPersonalMemoryScore,captureMemoryFingerEdit,createPersonalFingeringMemory,projectPersonalMemoryScore,bootstrapPersonalFingeringMemory,resolvePersonalFingeringMemory,editPersonalFingeringMemory,promotePersonalFingeringReference,deletePersonalFingeringEntry,registerMemoryScore,consolidatePersonalFingeringMemory,readPersonalFingeringMemory,type MemoryScoreInput} from '../src/personal-fingering-memory';
import type {ScorePackage} from '../src/package';import {initialPersonal} from '../src/state';
import {assigned} from '../src/personal-assignments';
import {measureMemoryKey} from '@hypermemetic-ai/fingering-editor-assistance';

function fixture(entryId='piece',accompaniments=[48,48,50,50]):MemoryScoreInput {
 const notes=accompaniments.flatMap((left,b)=>[left,60,64].map((pitch,j)=>({eventKind:'pitched',id:`b${b}n${j}`,pitch:{octave:Math.floor(pitch/12),pitchClass:pitch%12},startTick:b*192+j*24,durationTicks:24,hand:j?'RH':'LH'})));
 const p={manifest:{version:1,revision:'revision',metadata:{title:'Fixture'}},keyboardLayout:'janko-four-row',profileSha256:'geometry',pages:['svg'],score:{id:entryId,ticksPerBeat:48,totalTicks:accompaniments.length*192,sourceBarTicks:Array.from({length:accompaniments.length+1},(_,i)=>192*i),notes},seats:notes.map((n,i)=>({id:`s${i}`,ownerIds:[n.id],writtenBar:Math.floor(i/3)+1,contactId:`c${i}`,actionId:`a${i}`,page:0,system:0,x:i,baseline:0,fontSize:12,pitchDigit:'1'}))} as unknown as ScorePackage;
 return{entryId,importedAt:'2020-01-01',p,personal:initialPersonal(p)};
}
function choose(input:MemoryScoreInput,id:string,finger:number,age='2020-02-01',known=true){
 const n=input.p.score.notes.find(n=>n.id===id)! as any;input.personal.assignments??={version:'personal-owner-assignments-v1',sourceRevision:'revision',choices:{}};
 const lineage=`${input.entryId}:${id}:${age}`;
 input.personal.assignments.choices[id]={ownerId:id,guard:{pitch:n.pitch!.octave*12+n.pitch!.pitchClass,startTick:n.startTick,durationTicks:n.durationTicks},original:{hand:n.hand as 'RH'|'LH'},finger,createdAt:age,...(known?{intent:{finger:{decisionId:lineage,lineageId:lineage,authoredAt:age}}}:{})};
 return input;
}
const finger=(doc:ReturnType<typeof createPersonalFingeringMemory>,input:MemoryScoreInput,id:string)=>resolvePersonalFingeringMemory(doc,input.entryId,input.p,input.personal).assignments.find(a=>a.id===id)?.finger;
const edit=(doc:ReturnType<typeof createPersonalFingeringMemory>,input:MemoryScoreInput,id:string,finger:1|2|3|4|5|null|'inherit')=>editPersonalFingeringMemory(doc,input,{ownerId:id,finger,decisionId:`edit:${id}:${finger}`,authoredAt:'2025-01-01'});

test('complete exact projections retain extent, crossing duration, all unannotated owners and physical aliases only',()=>{
 const input=fixture(),[a]=projectPersonalMemoryScore(input);assert.equal(a.occurrence.notes.length,3);assert.deepEqual(a.occurrence.extent,{numerator:192,denominator:48});
 input.p.score.notes[1].durationTicks=300;const changed=projectPersonalMemoryScore(input)[0];assert.deepEqual(changed.occurrence.notes[1].duration,{numerator:300,denominator:48});assert.notEqual(measureMemoryKey(a.occurrence),measureMemoryKey(changed.occurrence));
 const duplicate=structuredClone(input.p.score.notes[1]);duplicate.id='duplicate';input.p.score.notes.push(duplicate);let projected=projectPersonalMemoryScore(input)[0];assert.equal(projected.occurrence.notes.length,4);assert.equal(projected.occurrence.notes[1].physicalAliasId,undefined);
 input.p.seats[1].ownerIds.push('duplicate');projected=projectPersonalMemoryScore(input)[0];assert.equal(projected.occurrence.notes[1].physicalAliasId,projected.occurrence.notes[3].physicalAliasId);
});
test('same hand reuses under different accompaniment and another physical profile',()=>{
 const input=choose(fixture(),'b0n1',2),doc=bootstrapPersonalFingeringMemory([input]);assert.equal(finger(doc,input,'b3n1'),2);assert.equal(finger(doc,input,'b3n0'),undefined);
 const other=fixture('another',[51]);other.p.profileSha256='othergeometry';assert.equal(finger(registerMemoryScore(doc,other),other,'b0n1'),2);
});
test('bootstrap is input-order independent and preserves contradictory existing personal fingers locally',()=>{
 const a=choose(fixture('a',[48]),'b0n1',2),b=choose(fixture('b',[48]),'b0n1',3,'2021-02-01');
 const ab=bootstrapPersonalFingeringMemory([a,b]),ba=bootstrapPersonalFingeringMemory([b,a]);assert.deepEqual(ab,ba);assert.equal(finger(ab,a,'b0n1'),2);assert.equal(finger(ab,b,'b0n1'),3);
 assert.equal(resolvePersonalFingeringMemory(ab,'b',b.p,b.personal).byOwner.b0n1.finger?.provenance,'local');assert.deepEqual(readPersonalFingeringMemory(ab),ab);
});
test('additions at copy fill shared holes; changes create locals; source edits update shared fields; reset and null stay distinct',()=>{
 const input=choose(fixture(),'b0n1',2);let doc=bootstrapPersonalFingeringMemory([input]);
 let result=edit(doc,input,'b1n2',4);assert.equal(result.operation,'add');doc=result.document;assert.equal(finger(doc,input,'b3n2'),4);
 result=edit(doc,input,'b1n1',3);assert.equal(result.operation,'local');doc=result.document;assert.equal(finger(doc,input,'b0n1'),2);assert.equal(finger(doc,input,'b1n1'),3);
 result=edit(doc,input,'b0n1',5);assert.equal(result.operation,'shared');doc=result.document;assert.equal(finger(doc,input,'b3n1'),5);assert.equal(finger(doc,input,'b1n1'),3);
 doc=edit(doc,input,'b1n1',null).document;assert.equal(finger(doc,input,'b1n1'),undefined);doc=edit(doc,input,'b1n1','inherit').document;assert.equal(finger(doc,input,'b1n1'),5);
 doc=edit(doc,input,'b0n1','inherit').document;assert.equal(finger(doc,input,'b3n1'),5);
 assert.equal(edit(doc,input,'b3n1',5).document,doc);
});
test('promotion transfers current reference while donor remains separate and other exceptions survive',()=>{
 const input=choose(fixture(),'b0n1',2);let doc=bootstrapPersonalFingeringMemory([input]);doc=edit(doc,input,'b1n1',3).document;doc=edit(doc,input,'b2n1',4).document;doc=promotePersonalFingeringReference(doc,input,'b1n1');
 assert.equal(finger(doc,input,'b0n1'),3);assert.equal(finger(doc,input,'b2n1'),4);const r=resolvePersonalFingeringMemory(doc,input.entryId,input.p,input.personal).byOwner.b3n1;assert.equal(r.reference?.writtenBar,2);assert.equal(r.finger?.decision?.decisionId,'edit:b1n1:3');
});
test('deletion elects next oldest without publishing its local choice; no survivor retains knowledge',()=>{
 const a=choose(fixture('a',[48]),'b0n1',2),b=choose(fixture('b',[48]),'b0n1',3,'2021-01-01');let doc=bootstrapPersonalFingeringMemory([b,a]);doc=deletePersonalFingeringEntry(doc,'a');
 assert.equal(finger(doc,b,'b0n1'),3);let later=fixture('c',[48]);doc=registerMemoryScore(doc,later);assert.equal(finger(doc,later,'b0n1'),2);assert.equal(resolvePersonalFingeringMemory(doc,'c',later.p,later.personal).byOwner.b0n1.reference?.entryId,'b');
 doc=deletePersonalFingeringEntry(deletePersonalFingeringEntry(doc,'b'),'c');assert.ok(doc.keyboards['janko-four-row'].defaults.every(d=>d.referenceAvailable===false));later=fixture('d',[48]);doc=registerMemoryScore(doc,later);assert.equal(finger(doc,later,'b0n1'),2);
});
test('consolidation elects fields across union of whole and hand matches before whole records can shield conflicts',async()=>{
 const input=choose(choose(fixture(),'b0n1',2),'b2n1',3,'2021-01-01',false);choose(input,'b2n2',4,'2022-01-01',false);const before=structuredClone(input.personal),doc=bootstrapPersonalFingeringMemory([input]);
 const result=await consolidatePersonalFingeringMemory(doc,[input],['piece'],'migration');assert.deepEqual(input.personal,before);const clean={...input,personal:result.personalByEntry.piece};
 for(let b=0;b<4;b++){assert.equal(finger(result.document,clean,`b${b}n1`),2);assert.equal(finger(result.document,clean,`b${b}n2`),4);}
 assert.equal(result.receipt.replaced.length,1);assert.equal(result.receipt.replaced[0].before,3);assert.equal(result.receipt.replaced[0].after,2);assert.equal(result.receipt.chosen.filter(c=>c.ownerId.endsWith('n2')).length,4);
 let updated=edit(result.document,clean,'b3n1',5).document;const retry=await consolidatePersonalFingeringMemory(updated,[clean],['piece'],'migration');assert.equal(retry.document,updated);assert.equal(finger(retry.document,clean,'b3n1'),5);
});
test('consolidation excludes undo/calculated donors and preserves hand choices and unrelated pieces',async()=>{
 const input=choose(fixture(),'b0n1',2),other=choose(fixture('other',[52]),'b0n1',5);input.personal.undoAssignments=structuredClone(input.personal.assignments);input.personal.undoAssignments!.choices.b0n1.finger=1;
 const choice=input.personal.assignments!.choices.b0n1;choice.hand='RH';choice.intent!.hand={decisionId:'hand',lineageId:'hand',authoredAt:'2020-01-01'};
 const doc=bootstrapPersonalFingeringMemory([input,other]),result=await consolidatePersonalFingeringMemory(doc,[input,other],['piece'],'one');assert.equal(result.personalByEntry.piece.assignments!.choices.b0n1.hand,'RH');assert.ok(result.personalByEntry.piece.undoAssignments);assert.equal(result.personalByEntry.other,undefined);
 // Unrelated saved personal choice remains local regardless of shared publication.
 assert.equal(finger(result.document,other,'b0n1'),5);
});
test('direct hand repartition changes scoped identities and never reassigns hands via a hand-only match',()=>{
 const input=choose(fixture(),'b0n1',2),doc=bootstrapPersonalFingeringMemory([input]);input.personal.assignments!.choices.b0n1.hand='LH';const next=registerMemoryScore(doc,input),r=resolvePersonalFingeringMemory(next,'piece',input.p,input.personal);assert.equal(r.byOwner.b0n1.hand,'LH');assert.equal(r.byOwner.b1n1.hand,'RH');
});
test('captured local stays local and a concurrent addition cannot overwrite new shared knowledge',()=>{
 const input=fixture();let doc=bootstrapPersonalFingeringMemory([input]);const captured=captureMemoryFingerEdit(doc,input,{ownerId:'b1n1',finger:3,decisionId:'queued',authoredAt:'2024-01-01'});
 doc=edit(doc,input,'b0n1',2).document;const replay=editPersonalFingeringMemory(doc,input,captured);assert.equal(replay.operation,'local');assert.equal(finger(replay.document,input,'b0n1'),2);assert.equal(finger(replay.document,input,'b1n1'),3);
 const source=captureMemoryFingerEdit(replay.document,input,{ownerId:'b0n1',finger:4,decisionId:'source',authoredAt:'2024-01-01'});doc=promotePersonalFingeringReference(replay.document,input,'b1n1');const stale=editPersonalFingeringMemory(doc,input,source);assert.equal(stale.operation,'local');assert.equal(finger(stale.document,input,'b3n1'),3);
});
test('unknown saved owner intent stays local but does not become reusable',()=>{
 const input=choose(choose(fixture(),'b0n1',2),'b1n1',5,'2021-01-01',false),doc=bootstrapPersonalFingeringMemory([input]);assert.equal(finger(doc,input,'b1n1'),5);assert.equal(finger(doc,input,'b2n1'),2);
 const only=choose(fixture(),'b0n1',3,'2020-01-01',false),empty=bootstrapPersonalFingeringMemory([only]);assert.equal(finger(empty,only,'b1n1'),undefined);
});
test('same library entry retains separate keyboard occurrences and knowledge',()=>{
 const janko=choose(fixture('same',[48]),'b0n1',2),piano=choose(fixture('same',[48]),'b0n1',4);piano.p.keyboardLayout='conventional-piano';let doc=bootstrapPersonalFingeringMemory([janko,piano]);
 assert.equal(Object.keys(doc.occurrences).length,6);assert.equal(finger(doc,janko,'b0n1'),2);assert.equal(finger(doc,piano,'b0n1'),4);doc=registerMemoryScore(doc,janko);assert.equal(Object.keys(doc.occurrences).length,6);assert.equal(finger(doc,piano,'b0n1'),4);
});
test('an unannotated pitch or extent change prevents complete-match reuse',()=>{
 const input=choose(fixture('a',[48]),'b0n1',2),doc=bootstrapPersonalFingeringMemory([input]);const other=fixture('b',[48]);(other.p.score.notes[2] as any).pitch.pitchClass=5;assert.equal(finger(doc,other,'b0n1'),undefined);
 const extent=fixture('c',[48]);extent.p.score.sourceBarTicks![1]=240;extent.p.score.totalTicks=240;assert.equal(finger(doc,extent,'b0n1'),undefined);
});
test('independent duplicate owners with a partial choice retain local evidence without inventing correspondence',()=>{
 const input=fixture('a',[48]),copy=fixture('b',[48]);for(const x of [input,copy]){const n=structuredClone(x.p.score.notes[1]);n.id='duplicate';x.p.score.notes.push(n);}choose(input,'b0n1',2);const doc=bootstrapPersonalFingeringMemory([input,copy]);assert.equal(finger(doc,input,'b0n1'),2);assert.equal(finger(doc,copy,'b0n1'),undefined);assert.equal(finger(doc,copy,'duplicate'),undefined);
});
test('new score import adds missing fields but retains existing reference and conflicting imported choices',()=>{
 const a=choose(fixture('a',[48]),'b0n1',2),doc=bootstrapPersonalFingeringMemory([a]),b=choose(choose(fixture('b',[48]),'b0n1',3),'b0n2',4);let next=importPersonalMemoryScore(doc,b);assert.equal(finger(next,b,'b0n1'),3);assert.equal(finger(next,a,'b0n1'),2);assert.equal(finger(next,a,'b0n2'),4);
 assert.equal(resolvePersonalFingeringMemory(next,'a',a.p,a.personal).byOwner.b0n1.reference?.entryId,'a');next=importPersonalMemoryScore(next,b);assert.equal(finger(next,b,'b0n1'),3);
});
test('invalid legacy dates stay unknown and deterministic rather than claiming authorship',()=>{
 const a=fixture('a',[48]),b=fixture('b',[48]);for(const [input,value]of [[a,2],[b,3]] as const)input.personal.overrides.record={ownerIds:['b0n1'],replacement:value,createdAt:'not-a-date'} as any;
 const doc=bootstrapPersonalFingeringMemory([b,a]);assert.deepEqual(doc,bootstrapPersonalFingeringMemory([a,b]));const r=resolvePersonalFingeringMemory(doc,'a',a.p,a.personal).byOwner.b0n1;assert.equal(r.finger?.decision?.authoredAt,undefined);assert.equal(r.reference?.entryId,'a');assert.equal(finger(doc,b,'b0n1'),3);
});
test('captured source guard refuses a hand partition change and forged receipt cannot bypass migration',()=>{
 const input=choose(fixture(),'b0n1',2),doc=bootstrapPersonalFingeringMemory([input]),captured=captureMemoryFingerEdit(doc,input,{ownerId:'b0n1',finger:3,decisionId:'guarded',authoredAt:'2024-01-01'});input.personal.assignments!.choices.b0n1.hand='LH';assert.throws(()=>editPersonalFingeringMemory(doc,input,captured),/partition changed/);
 const corrupt=structuredClone(doc);corrupt.receipts.fake={id:'fake',completed:true} as any;assert.throws(()=>readPersonalFingeringMemory(corrupt),/receipt/);
});
test('hand repartition preserves inherited fingers throughout the affected bar without authoring new decisions',()=>{
 const before=choose(choose(fixture(),'b0n1',2),'b0n2',4),doc=bootstrapPersonalFingeringMemory([before]);
 const after={...before,personal:assigned(before.p,before.personal,before.p.seats.find(s=>s.ownerIds.includes('b2n1'))!,{hand:'LH'})};
 const preserved=preservePersonalMemoryHandChange(doc,before,after,'b2n1'),old=resolvePersonalFingeringMemory(doc,before.entryId,before.p,before.personal),next=resolvePersonalFingeringMemory(preserved,after.entryId,after.p,after.personal);
 assert.equal(finger(preserved,after,'b2n1'),2);assert.equal(finger(preserved,after,'b2n2'),4);assert.equal(next.byOwner.b2n1.hand,'LH');assert.equal(after.personal.assignments!.choices.b2n1.intent?.finger,undefined);
 assert.equal(next.byOwner.b2n1.finger?.decision?.decisionId,old.byOwner.b2n1.finger?.decision?.decisionId);assert.equal(next.byOwner.b2n2.finger?.decision?.decisionId,old.byOwner.b2n2.finger?.decision?.decisionId);
});
test('local snapshot restore resumes current shared knowledge and restores prior local dispositions only',()=>{
 const a=choose(choose(fixture('a',[48]),'b0n1',2),'b0n2',4),b=fixture('b',[48]);let doc=bootstrapPersonalFingeringMemory([a,b]);doc=edit(doc,b,'b0n1',3).document;const snapshot=snapshotPersonalMemoryLocals(doc,b);
 doc=edit(doc,b,'b0n1',null).document;doc=edit(doc,b,'b0n2',null).document;doc=edit(doc,a,'b0n2',5).document;doc=restorePersonalMemoryLocals(doc,b,snapshot);
 assert.equal(finger(doc,b,'b0n1'),3);assert.equal(finger(doc,b,'b0n2'),5);assert.equal(finger(doc,a,'b0n1'),2);
 const after={...b,personal:assigned(b.p,b.personal,b.p.seats[1],{hand:'LH'})};assert.throws(()=>restorePersonalMemoryLocals(doc,after,snapshot),/partition differs/);
});
test('calculated restoration masks display without erasing personal knowledge or changing new-edit classification',()=>{
 const input=choose(fixture(),'b0n1',2);input.p.fingerLayer={attacks:[{id:'a',finger:1,owners:[{id:'b1n1'}]}],sourceOwnerToAttack:{b1n1:'a'}} as any;let doc=bootstrapPersonalFingeringMemory([input]);(input.personal as any).calculatedOwners={b1n1:true};
 const resolved=resolvePersonalFingeringMemory(doc,'piece',input.p,input.personal);assert.equal(finger(doc,input,'b1n1'),1);assert.equal(resolved.byOwner.b1n1.calculated,true);assert.equal(resolved.byOwner.b1n1.personal,false);assert.equal(resolved.byOwner.b1n1.finger?.value,2);
 const captured=captureMemoryFingerEdit(doc,input,{ownerId:'b1n1',finger:4,decisionId:'after-restore',authoredAt:'2025-01-01'});assert.equal(captured.captured?.operation,'local');delete (input.personal as any).calculatedOwners;doc=editPersonalFingeringMemory(doc,input,captured).document;assert.equal(finger(doc,input,'b1n1'),4);assert.equal(finger(doc,input,'b0n1'),2);
});
test('same-entry distinct profile histories retain independent choices and deterministic references',()=>{
 const a=choose(fixture('same',[48]),'b0n1',2),b=choose(fixture('same',[48]),'b0n1',3,'2021-01-01');b.p.profileSha256='second-profile';
 const doc=bootstrapPersonalFingeringMemory([a,b]);assert.deepEqual(doc,bootstrapPersonalFingeringMemory([b,a]));assert.equal(Object.keys(doc.occurrences).length,6);assert.equal(finger(doc,a,'b0n1'),2);assert.equal(finger(doc,b,'b0n1'),3);
 const updated=registerMemoryScore(doc,a);assert.equal(finger(updated,b,'b0n1'),3);assert.equal(Object.keys(updated.occurrences).length,6);
});
test('source updates follow shared lineage across consolidated whole projections while later independent exceptions survive',async()=>{
 const input=choose(choose(fixture(),'b0n1',2),'b2n1',3,'2021-01-01'),initial=bootstrapPersonalFingeringMemory([input]),consolidated=await consolidatePersonalFingeringMemory(initial,[input],['piece'],'link');
 const clean={...input,personal:consolidated.personalByEntry.piece};let doc=edit(consolidated.document,clean,'b0n1',5).document;for(let b=0;b<4;b++)assert.equal(finger(doc,clean,`b${b}n1`),5);
 doc=edit(doc,clean,'b3n1',3).document;doc=promotePersonalFingeringReference(doc,clean,'b3n1');doc=edit(doc,clean,'b0n1',4).document;assert.equal(finger(doc,clean,'b0n1'),4);assert.equal(finger(doc,clean,'b2n1'),3);assert.equal(finger(doc,clean,'b3n1'),3);const future=fixture('other-context',[52]);assert.equal(finger(doc,future,'b0n1'),3);
});
test('retired projection mapping retains linked shared updates for a future rematch',async()=>{
 const a=choose(fixture('a',[48]),'b0n1',2),b=choose(fixture('b',[50]),'b0n1',3,'2021-01-01'),consolidated=await consolidatePersonalFingeringMemory(bootstrapPersonalFingeringMemory([a,b]),[a,b],['a','b'],'retired');
 const clean={...a,personal:consolidated.personalByEntry.a};let doc=deletePersonalFingeringEntry(consolidated.document,'b');doc=edit(doc,clean,'b0n1',5).document;const future=fixture('future',[50]);doc=registerMemoryScore(doc,future);assert.equal(finger(doc,future,'b0n1'),5);
});
test('historical physical aliases with duplicate legacy decision IDs elect one coherent lineage',()=>{
 const input=fixture('a',[48]),n=structuredClone(input.p.score.notes[1]);n.id='alias';input.p.score.notes.push(n);input.p.seats[1].ownerIds.push(n.id);choose(input,'b0n1',2);choose(input,'alias',2,'2021-01-01');
 const doc=bootstrapPersonalFingeringMemory([input]),resolved=resolvePersonalFingeringMemory(doc,'a',input.p,input.personal);assert.equal(finger(doc,input,'alias'),2);assert.equal(resolved.byOwner.b0n1.finger?.decision?.decisionId,resolved.byOwner.alias.finger?.decision?.decisionId);
});
test('known field dates precede undated records even when another field and import age are earlier',()=>{
 const unknown=choose(fixture('unknown',[48]),'b0n2',3,'2000-01-01'),known=choose(fixture('known',[48]),'b0n1',2,'2020-01-01');unknown.importedAt='1999-01-01';unknown.personal.overrides.old={ownerIds:['b0n1'],replacement:4,createdAt:'invalid'} as any;
 const doc=bootstrapPersonalFingeringMemory([unknown,known]),copy=fixture('copy',[48]);assert.equal(finger(doc,copy,'b0n1'),2);assert.equal(finger(doc,unknown,'b0n1'),4);assert.equal(resolvePersonalFingeringMemory(doc,'copy',copy.p,copy.personal).byOwner.b0n1.finger?.decision?.authoredAt,Date.parse('2020-01-01'));
});
test('consolidation retains authored source ahead of earlier-import empty copies',async()=>{
 const input=choose(fixture(),'b2n1',2,'2021-01-01');input.importedAt='2000-01-01';const result=await consolidatePersonalFingeringMemory(bootstrapPersonalFingeringMemory([input]),[input],['piece'],'reference'),clean={...input,personal:result.personalByEntry.piece};
 const source=resolvePersonalFingeringMemory(result.document,'piece',clean.p,clean.personal).byOwner.b3n1.reference;assert.equal(source?.writtenBar,3);
});
