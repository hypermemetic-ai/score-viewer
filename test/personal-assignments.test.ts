import {admitPracticeContext} from '../src/practice-context';
import test from 'node:test';import assert from 'node:assert/strict';
import {assigned,effectiveAssignments,effectiveAssignmentDigest,handFor,restorePersonalAssignment,personalPracticePackage} from '../src/personal-assignments';
import {initialPersonal,readPersonal,corrected,fingerFor,personalStorageName,practiceStorageName,restoreAll} from '../src/state';
import {planPractice,initialPractice,readPractice,progressFor,passageHierarchy} from '../src/practice';
import {toggleDone} from '../src/practice-attainment';
import {pianoRequestAuthority} from '../src/piano-request-authority';

import {personalForCalculatedEdition} from '../src/presentation-install';
import type {ScorePackage} from '../src/package';
import {testReference} from './support/reference-score';

/** State/claim fixtures intentionally do not assert shared-renderer admission. */
function fixture():ScorePackage {
 const notes=Array.from({length:12},(_,i)=>({eventKind:'pitched' as const,id:'owner-'+i,pitch:{octave:4,pitchClass:i%12},startTick:i*144,durationTicks:24,hand:(i%2?'RH':'LH') as 'RH'|'LH'})),
  attacks=notes.map(n=>({id:n.startTick+':'+(48+n.pitch.pitchClass),pitch:48+n.pitch.pitchClass,startTick:n.startTick,hand:n.hand,finger:3,row:2,owners:[{id:n.id,durationTicks:n.durationTicks}]}));
 return{manifest:{version:2,revision:'b'.repeat(64)},sourceRevision:'a'.repeat(64),sourceSha256:'a'.repeat(64),keyboardLayout:'janko-four-row',profileId:'fixture',profileSha256:'c'.repeat(64),effectiveHandSha256:'d'.repeat(64),pages:['original-svg'],files:{'original':new Uint8Array([1,2])},
  fingerEligibility:{eligible:true},score:{id:'study',ticksPerBeat:48,totalTicks:1728,sourceBarTicks:Array.from({length:13},(_,i)=>i*144),notes,barlines:[],tempos:[],dynamics:[],pedals:[],timeSignatures:[{tick:0,numerator:6,denominator:8}],referencePerformanceTempo:testReference},
  seats:notes.map((n,i)=>({id:'seat-'+i,page:0,system:0,x:i*10,baseline:10,fontSize:12,pitchDigit:'1',ownerIds:[n.id],actionId:attacks[i].id,contactId:attacks[i].id,writtenBar:i+1})),
  fingerLayer:{version:'piano-finger-assignments-v1',layoutId:'janko-four-row',profileId:'fixture',profileSha256:'c'.repeat(64),plannerVersion:'fixture',sourceHash:'a'.repeat(64),attacks,sourceOwnerToAttack:Object.fromEntries(notes.map((n,i)=>[n.id,attacks[i].id])),operatorConstraints:[]}} as unknown as ScorePackage;
}
test('hand choice keeps effective finger, legacy correction/history and immutable archive/storage bindings',async()=>{
 const p=fixture(),before=structuredClone(p),legacy=corrected(p,initialPersonal(p),p.seats[0],5);legacy.history=[structuredClone(p.fingerLayer!)];
 const initial=structuredClone(legacy),next=assigned(p,legacy,p.seats[0],{hand:'RH'});
 assert.equal(handFor(p,next,'owner-0'),'RH');assert.equal(fingerFor(p,next,p.seats[0]),5);
 assert.deepEqual(next.overrides,legacy.overrides);assert.deepEqual(next.history,legacy.history);assert.deepEqual(legacy,initial);assert.deepEqual(p,before);
 assert.equal(personalStorageName('entry',p),personalStorageName('entry',personalPracticePackage(p,next)));
 assert.equal(practiceStorageName('entry',p),practiceStorageName('entry',personalPracticePackage(p,next)));
 assert.deepEqual(readPersonal(JSON.parse(JSON.stringify(next)),p),next);assert.match(await effectiveAssignmentDigest(p,next),/^[a-f0-9]{64}$/);
 const fingers=corrected(p,next,p.seats[0],2);assert.equal(handFor(p,fingers,'owner-0'),'RH');assert.equal(fingerFor(p,fingers,p.seats[0]),2);
 fingers.view.fingerSet='calculated';assert.equal(fingerFor(p,fingers,p.seats[0]),3);
});
test('duplicate physical aliases and continued heads share the surgical choice, distant recurrence does not',()=>{
 const p=fixture(),alias={...p.score.notes[0],id:'alias',durationTicks:48};p.score.notes.push(alias);
 p.seats[0].ownerIds.push('alias');p.seats.push({...p.seats[0],id:'continuation',page:1,continuation:true});
 const next=assigned(p,initialPersonal(p),p.seats.at(-1)!,{hand:'RH',finger:4});
 assert.equal(handFor(p,next,'alias'),'RH');assert.equal(next.assignments!.choices.alias.guard.durationTicks,48);
 assert.equal(next.assignments!.choices['owner-2'],undefined);
 const broken=structuredClone(next);broken.assignments!.choices.alias.hand='LH';assert.throws(()=>readPersonal(broken,p),/aliases disagree/);
 const restored=restorePersonalAssignment(p,next,p.seats[0]);assert.equal(restored.assignments,undefined);
 const all=restoreAll(next);assert.equal(all.assignments,undefined);assert.deepEqual(all.undoAssignments,next.assignments);
});
test('stale source guards and corrupt owner assignments preserve bytes by refusing admission',()=>{
 const p=fixture(),next=assigned(p,initialPersonal(p),p.seats[0],{hand:'RH'}),bytes=JSON.stringify(next);
 for(const mutate of [(s:any)=>s.assignments.choices['owner-0'].guard.durationTicks++, (s:any)=>s.assignments.sourceRevision='f'.repeat(64),(s:any)=>s.assignments.choices['owner-0'].original.hand='RH',(s:any)=>s.assignments.choices['owner-0'].finger=6]){
  const broken=JSON.parse(bytes);mutate(broken);assert.throws(()=>readPersonal(broken,p),/assignment .*differs/);
 }
 assert.equal(JSON.stringify(next),bytes);
});
test('source-guarded hand-only choice works without a calculated finger layer',()=>{
 const p=fixture();delete p.fingerLayer;const s=assigned(p,initialPersonal(p),p.seats[0],{hand:'RH'});
 assert.equal(effectiveAssignments(p,s)[0].hand,'RH');assert.equal(effectiveAssignments(p,s)[0].finger,undefined);
 assert.deepEqual(readPersonal(s,p),s);
});
test('finger lookup survives transient projected seat/action IDs through source ownership',()=>{
 const p=fixture(),s=initialPersonal(p),projected={...p.seats[0],id:'projected-seat',actionId:'transient-action',contactId:'transient-contact'};
 assert.equal(fingerFor(p,s,projected),3);assert.equal(fingerFor(p,corrected(p,s,p.seats[0],4),projected),4);
 const edited=assigned(p,s,projected,{hand:'RH',finger:5});assert.equal(fingerFor(p,edited,projected),5);
});
test('personal hands update practice gestures while retaining leaf/join credit and literal evidence',()=>{
 const p=fixture(),base=planPractice(p,'fixed-four-v1'),state=initialPractice(base),a=base.chunks[0],b=base.chunks[1];
 toggleDone(state,{passage:a.id,pattern:a.pattern,rate:180});toggleDone(state,{passage:b.id,pattern:b.pattern,rate:180});
 state.composites={'1-8':['1-4','5-8']};const oldJoin=passageHierarchy(base,state).all.get('1-8')!;state.best[oldJoin.pattern]=180;
 const raw=JSON.stringify(state),personal=assigned(p,initialPersonal(p),p.seats[0],{hand:'RH'}),effective=planPractice(p,'fixed-four-v1',personal),loaded=readPractice(JSON.parse(raw),effective);
 assert.equal(effective.ownerGroup.get('owner-0'),'0:RH');assert.equal(effective.chunks[0].pattern,a.pattern);assert.equal(progressFor(effective.chunks[0],loaded),1);assert.equal(progressFor(effective.chunks[1],loaded),1);
 assert.equal(progressFor(passageHierarchy(effective,loaded).all.get('1-8')!,loaded),1);assert.deepEqual(loaded.best,state.best);assert.deepEqual(loaded.manualAttainment,state.manualAttainment);
 const reverted=readPractice(JSON.parse(JSON.stringify(loaded)),base);assert.equal(progressFor(a,reverted),1);assert.equal(Object.keys(reverted.manualAttainment!.marks).length,2);
 const fingerOnly=assigned(p,initialPersonal(p),p.seats[0],{finger:4});assert.deepEqual(planPractice(p,'fixed-four-v1',fingerOnly).chunks,base.chunks);
});
test('explicit calculation authority receives personal hand/finger instead of superseded base layer choice',()=>{
 const p=fixture(),personal=assigned(p,initialPersonal(p),p.seats[0],{hand:'RH',finger:5}),n=p.score.notes[0];
 const guard={pitch:48,startTick:n.startTick,durationTicks:n.durationTicks};
 p.fingerLayer!.operatorConstraints=[{ownerId:n.id,guard,hand:'LH',finger:3,provenance:{kind:'operator-choice',reference:'Previous immutable choice'}}];
 const original=structuredClone(p),constraints=pianoRequestAuthority(p,p.score,'janko-four-row',p.fingerLayer,personal,'retain-imported');
 assert.equal(constraints.filter(c=>c.ownerId===n.id).length,1);assert.equal(constraints.find(c=>c.ownerId===n.id)!.hand,'RH');assert.equal(constraints.find(c=>c.ownerId===n.id)!.finger,5);assert.deepEqual(p,original);
});
test('materialized personal precedence remains recoverable without its optional edit overlay, legacy authority stays strict',()=>{
 const p=fixture(),n=p.score.notes[0],guard={pitch:48,startTick:n.startTick,durationTicks:n.durationTicks};
 (p.score as any).sourceHandRequirements=[{version:'source-hand-requirement-v1',ownerId:n.id,guard,hand:'LH',provenance:{kind:'source-instruction',reference:'Authored LH'}}];
 p.fingerLayer!.operatorConstraints=[{ownerId:n.id,guard,hand:'RH',finger:3,provenance:{kind:'personal-choice',reference:'Explicit personal edit'}} as any];
 assert.equal(pianoRequestAuthority(p,p.score,'janko-four-row',p.fingerLayer,undefined,'calculate')[0].hand,'RH');
 (p.fingerLayer!.operatorConstraints as any[])[0].provenance.kind='operator-choice';assert.throws(()=>pianoRequestAuthority(p,p.score,'janko-four-row',p.fingerLayer,undefined,'calculate'),/source instruction/);
});
test('materialized edition carries effective choices and retains superseded legacy evidence with the prior edition',()=>{
 const from=fixture(),legacy=corrected(from,initialPersonal(from),from.seats[0],5),s=assigned(from,legacy,from.seats[0],{hand:'RH'}),before=structuredClone(s),to=structuredClone(from);
 to.manifest.revision='e'.repeat(64);to.effectiveHandSha256='f'.repeat(64);to.score.notes[0].hand='RH';to.fingerLayer!.attacks[0].hand='RH';to.fingerLayer!.attacks[0].finger=5;
 const next=personalForCalculatedEdition(s,from,to);
 assert.equal(handFor(to,next,'owner-0'),'RH');assert.equal(fingerFor(to,next,to.seats[0]),5);assert.deepEqual(next.overrides,{});assert.deepEqual(s,before);
 assert.equal(s.overrides[from.seats[0].contactId].hand,'LH');assert.deepEqual(readPersonal(next,to),next);
 to.fingerLayer!.attacks[0].finger=4;assert.throws(()=>personalForCalculatedEdition(s,from,to),/personal assignment was not retained/);
});
test('practice context admission resolves current personal hands while preserving the retained settings and claims',()=>{
 const p=fixture(),old=admitPracticeContext(p,undefined),a=old.plan.chunks[0];old.state.best[a.pattern]=90;
 const personal=assigned(p,initialPersonal(p),p.seats[0],{hand:'RH'}),next=admitPracticeContext(p,old.state,undefined,personal);
 assert.equal(next.plan.ownerGroup.get('owner-0'),'0:RH');assert.equal(next.plan.chunks[0].pattern,a.pattern);assert.equal(progressFor(next.plan.chunks[0],next.state),progressFor(a,old.state));assert.equal(next.state.best[a.pattern],90);assert.equal(next.state.start,old.state.start);
});
