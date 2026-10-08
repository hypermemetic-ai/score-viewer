import test from 'node:test';import assert from 'node:assert/strict';
import {personalForCalculatedEdition,PersonalEditionConflict} from '../src/presentation-install';
import {initialPersonal,corrected,validEntryStorage,readPersonal,personalStorageName,practiceStorageName,performanceStorageName,type Entry} from '../src/state';
import type {ScorePackage} from '../src/package';
// These are isolated state-boundary fixtures. They do not assert rendered page
// admission, which requires the exact reviewed ISO real-engine contract.
function fixture():ScorePackage{
 const notes=[48,72].map((pitch,i)=>({id:'owner-'+i,pitch:{octave:Math.floor(pitch/12),pitchClass:pitch%12},startTick:24+i*48,durationTicks:24,hand:i?'RH':'LH'})),
  attacks=notes.map((n,i)=>({id:n.startTick+':'+(n.pitch.octave*12+n.pitch.pitchClass),pitch:n.pitch.octave*12+n.pitch.pitchClass,startTick:n.startTick,hand:n.hand,finger:i?3:5,row:2,owners:[{id:n.id}]}));
 return{manifest:{version:2,revision:'b'.repeat(64)},score:{notes},sourceSha256:'a'.repeat(64),sourceRevision:'a'.repeat(64),
  keyboardLayout:'janko-four-row',profileId:'profile',profileSha256:'c'.repeat(64),effectiveHandSha256:'d'.repeat(64),pages:['page'],
  seats:notes.map((n,i)=>({id:'seat-'+i,ownerIds:[n.id],actionId:attacks[i].id,contactId:attacks[i].id,writtenBar:1})),
  fingerLayer:{version:'piano-finger-assignments-v1',layoutId:'janko-four-row',profileId:'profile',profileSha256:'c'.repeat(64),
   plannerVersion:'fixture-planner',sourceHash:'a'.repeat(64),attacks,sourceOwnerToAttack:Object.fromEntries(notes.map((n,i)=>[n.id,attacks[i].id]))}} as unknown as ScorePackage;
}
test('selective hand change carries checked current choice while older layers/undo remain with their original edition',()=>{
 const from=fixture(),s=corrected(from,initialPersonal(from),from.seats[0],4);s.history=[structuredClone(from.fingerLayer!)];s.undo=structuredClone(s.overrides);
 const before=structuredClone(s),to=structuredClone(from);to.manifest.revision='e'.repeat(64);to.effectiveHandSha256='f'.repeat(64);
 to.score.notes[1].hand='LH';to.fingerLayer!.attacks[1].hand='LH';to.fingerLayer!.attacks[0].finger=4;
 const result=personalForCalculatedEdition(s,from,to);
 assert.deepEqual(result.overrides,s.overrides);assert.deepEqual(result.history,[]);assert.equal(result.layer,undefined);assert.equal(result.undo,undefined);
 assert.equal(result.binding!.effectiveHandSha256,to.effectiveHandSha256);assert.deepEqual(s,before);
});
test('changed hand/release/contact/profile/alias cannot silently receive an active correction',()=>{
 const from=fixture(),s=corrected(from,initialPersonal(from),from.seats[0],4),base=structuredClone(from);
 base.manifest.revision='e'.repeat(64);base.fingerLayer!.attacks[0].finger=4;
 for(const mutate of [
  (to:ScorePackage)=>{to.fingerLayer!.attacks[0].hand='RH';},
  (to:ScorePackage)=>{to.score.notes[0].durationTicks++;},
  (to:ScorePackage)=>{to.fingerLayer!.attacks[0].row=4;},
  (to:ScorePackage)=>{to.profileSha256='f'.repeat(64);},
  (to:ScorePackage)=>{to.seats[0].ownerIds.push('owner-1');},
 ]){const to=structuredClone(base);mutate(to);assert.throws(()=>personalForCalculatedEdition(s,from,to),PersonalEditionConflict);}
});
test('same edition history retains the prior calculated layer, rather than pushing the replacement as its own predecessor',()=>{
 const from=fixture(),s=initialPersonal(from),to=structuredClone(from);to.fingerLayer!.attacks[0].finger=4;
 const result=personalForCalculatedEdition(s,from,to);
 assert.deepEqual(result.history,[from.fingerLayer]);assert.deepEqual(result.layer,to.fingerLayer);
});
test('prepared and legacy same-semantic-revision states have exact distinct bindings and storage keys',()=>{
 const legacy=fixture(),prepared=structuredClone(legacy);prepared.preparationIdentity={} as any;
 const old=initialPersonal(legacy),fresh=initialPersonal(prepared);
 assert.equal(fresh.revision,old.revision);assert.equal(fresh.binding!.editionRevision,prepared.manifest.revision);
 assert.throws(()=>readPersonal(fresh,legacy),/revision differs/);
 assert.throws(()=>readPersonal(old,prepared),/revision differs/);
 assert.throws(()=>readPersonal({...old,binding:{...old.binding,unknownAuthority:'obsolete'}},legacy),/revision differs/);
 for(const name of [personalStorageName,practiceStorageName,performanceStorageName]){
  assert.equal(name('id',legacy),`${name===personalStorageName?'state':name===practiceStorageName?'practice':'performance'}-${legacy.sourceRevision}-${legacy.keyboardLayout}-${legacy.profileSha256}-${legacy.effectiveHandSha256}.json`);
  assert.equal(name('id',prepared),name('id',legacy).replace(/\.json$/,`-${prepared.manifest.revision}.json`));
  const revised=structuredClone(prepared);revised.manifest.revision='e'.repeat(64);assert.notEqual(name('id',revised),name('id',prepared));
 }
});
test('library storage accepts only source-scoped declared edition state maps',()=>{
 const e:Entry={id:'a'.repeat(64),file:`package-${'b'.repeat(64)}.isoscore`,retainedPackages:[`package-${'c'.repeat(64)}.isoscore`],
  metadata:{title:'Authored fixture',composer:'Fixture',provenance:[]},importedAt:'now',
  editionPersonalFiles:{[`package-${'c'.repeat(64)}.isoscore`]:{[`state-${'a'.repeat(64)}.json`]:`state-version-${'d'.repeat(64)}.json`}}};
 assert.equal(validEntryStorage(e),true);
 assert.equal(validEntryStorage({...e,editionPersonalFiles:{'../unknown':{}}}),false);
 assert.equal(validEntryStorage({...e,editionPersonalFiles:{[e.retainedPackages![0]]:{[`state-${'f'.repeat(64)}.json`]:`state-version-${'d'.repeat(64)}.json`}}}),false);
 assert.equal(validEntryStorage({...e,editionPersonalFiles:[] as any}),false);
});
