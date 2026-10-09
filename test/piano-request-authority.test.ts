import {requirePitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import {requirePianoEvent} from '../src/piano-event';
import test from 'node:test';import assert from 'node:assert/strict';
import {pianoRequestAuthority,AUTOMATIC_HAND_RETENTION_REFERENCE,PianoAuthorityConflict} from '../src/piano-request-authority';
import type {ScorePackage,FingerLayer} from '../src/package';
import {initialPersonal} from '../src/state';
import type {PianoAssignmentConstraint} from '../vendor/iso-notation/src/model/piano-finger-assignments';
import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';
import type {SourceHandRequirement} from '../vendor/iso-notation/src/model/physical-source-constraints';
const source:QuantizedGridScore&{sourceHandRequirements?:SourceHandRequirement[]}={id:'authored-owner-authority',title:'Authority study',composer:'Fixture',ticksPerBeat:48,totalTicks:192,sourceBarTicks:[0,192],
 notes:[48,67,72].map((pitch,i)=>({id:'owner-'+i,eventKind:'pitched' as const,pitch:{octave:Math.floor(pitch/12),pitchClass:pitch%12},startTick:24+i*24,durationTicks:24,hand:i?'RH':'LH'})),barlines:[],timeSignatures:[],tempos:[],dynamics:[],pedals:[]};
const p={manifest:{version:2,revision:'a'.repeat(64)},score:source,sourceRevision:'b'.repeat(64),keyboardLayout:'janko-four-row',
 profileId:'profile',profileSha256:'c'.repeat(64),effectiveHandSha256:'d'.repeat(64),pages:['page'],seats:[]} as unknown as ScorePackage;
const automatic=(id='owner-0'):PianoAssignmentConstraint=>{const n=source.notes.find(n=>n.id===id)!;return{ownerId:id,hand:requirePianoEvent(n).hand,
 guard:{pitch:requirePitchedEvent(n).pitch.octave*12+requirePitchedEvent(n).pitch.pitchClass,startTick:n.startTick,durationTicks:n.durationTicks},
 provenance:{kind:'editorial-hand-retention',reference:AUTOMATIC_HAND_RETENTION_REFERENCE}};};
const layer=(constraints:PianoAssignmentConstraint[])=>({version:'piano-finger-assignments-v1',operatorConstraints:constraints,attacks:[],sourceOwnerToAttack:{}} as unknown as FingerLayer);

test('joint-hand requests remove only known guarded automatic retention; genuine partial choices remain owner-specific',()=>{
 const explicit={...automatic('owner-1'),hand:undefined,finger:3,provenance:{kind:'operator-choice' as const,reference:'Explicit player choice'}};
 const active=layer([automatic(),explicit]),personal=initialPersonal(p);personal.history.push(active);personal.undo={};
 const q=pianoRequestAuthority(p,source,'janko-four-row',active,personal,'calculate');
 assert.deepEqual(q,[explicit]);assert.equal(q.some(c=>c.ownerId==='owner-2'),false);
 assert.deepEqual(active.operatorConstraints,[automatic(),explicit]);
});
test('ambiguous labels, stale guards, extra choices and legacy global history locks require review',()=>{
 for(const mutate of [
  (q:PianoAssignmentConstraint)=>{q.provenance.reference='Someone said retain hands';},
  (q:PianoAssignmentConstraint)=>{q.guard.durationTicks++;},
  (q:PianoAssignmentConstraint)=>{q.finger=4;},
  (q:PianoAssignmentConstraint)=>{q.provenance.kind='operator-choice';q.provenance.reference='Retain the existing performing-hand presentation for saved operator history';},
  (q:PianoAssignmentConstraint)=>{(q.provenance as any).kind='unknown';},
 ]){const q=automatic();mutate(q);assert.throws(()=>pianoRequestAuthority(p,source,'janko-four-row',layer([q]),undefined,'calculate'),PianoAuthorityConflict);}
 const q=automatic();q.hand='RH';assert.throws(()=>pianoRequestAuthority(p,source,'janko-four-row',layer([q]),undefined,'calculate'),/installed hand/);
});
test('explicit retain policy records hands without turning them into source authority',()=>{
 const q=pianoRequestAuthority(p,source,'janko-four-row',undefined,undefined,'retain-imported');
 assert.equal(q.length,3);assert.ok(q.every(c=>c.provenance.kind==='editorial-hand-retention'));
 assert.equal(source.sourceHandRequirements,undefined);
});
test('unknown reviewed contract fails even before cache reuse',()=>{
 const active=layer([]);active.reviewedFingerAuthority={kind:'unknown',constraints:[]};
 assert.throws(()=>pianoRequestAuthority(p,source,'janko-four-row',active,undefined,'calculate'),/unknown contract/);
});
test('source instruction and unequal-release alias authority conflicts fail with owners',()=>{
 const s=structuredClone(source);s.sourceHandRequirements=[{version:'source-hand-requirement-v1',ownerId:'owner-0',hand:'LH',
  guard:automatic().guard,provenance:{kind:'source-instruction',reference:'Authored left-hand requirement'}}];
 const q={...automatic(),hand:'RH' as const,provenance:{kind:'operator-choice' as const,reference:'Conflicting player choice'}};
 assert.throws(()=>pianoRequestAuthority({...p,score:s},s,'janko-four-row',layer([q]),undefined,'calculate'),/source instruction or physical alias/);
 const alias=structuredClone(source.notes[0]);alias.id='alias';alias.durationTicks=48;s.sourceHandRequirements=[];s.notes.push(alias);
 const other={...q,ownerId:'alias',guard:{...q.guard,durationTicks:48},hand:'LH' as const};
 assert.throws(()=>pianoRequestAuthority({...p,score:s},s,'janko-four-row',layer([q,other]),undefined,'calculate'),/physical alias/);
});
