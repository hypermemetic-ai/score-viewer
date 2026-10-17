import test from 'node:test';import assert from 'node:assert/strict';
import {initialPersonal,corrected,validEntryStorage,readPersonal,personalStorageName,legacyPersonalStorageName,practiceStorageName,performanceStorageName,type Entry} from '../src/state';
import {loadPersonalJournal,PersonalJournalError} from '../src/personal-journal';
import type {ScorePackage} from '../src/package';
// These are isolated state-boundary fixtures. They do not assert rendered page
// admission, which requires the exact reviewed ISO real-engine contract.
function fixture():ScorePackage{
 const notes=[48,72].map((pitch,i)=>({id:'owner-'+i,eventKind:'pitched' as const,pitch:{octave:Math.floor(pitch/12),pitchClass:pitch%12},startTick:24+i*48,durationTicks:24,hand:i?'RH':'LH'})),
  attacks=notes.map((n,i)=>({id:n.startTick+':'+(n.pitch.octave*12+n.pitch.pitchClass),pitch:n.pitch.octave*12+n.pitch.pitchClass,startTick:n.startTick,hand:n.hand,finger:i?3:5,row:2,owners:[{id:n.id}]}));
 return{manifest:{version:2,revision:'b'.repeat(64)},score:{notes},sourceSha256:'a'.repeat(64),sourceRevision:'a'.repeat(64),
  keyboardLayout:'janko-four-row',profileId:'profile',profileSha256:'c'.repeat(64),effectiveHandSha256:'d'.repeat(64),pages:['page'],
  seats:notes.map((n,i)=>({id:'seat-'+i,ownerIds:[n.id],actionId:attacks[i].id,contactId:attacks[i].id,writtenBar:1})),
  fingerLayer:{version:'piano-finger-assignments-v1',layoutId:'janko-four-row',profileId:'profile',profileSha256:'c'.repeat(64),
   plannerVersion:'fixture-planner',sourceHash:'a'.repeat(64),attacks,sourceOwnerToAttack:Object.fromEntries(notes.map((n,i)=>[n.id,attacks[i].id]))}} as unknown as ScorePackage;
}
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
test('missing declared journal refuses normal, retained and pending-save loads before any legacy or memory fallback',async()=>{
 const p=fixture();p.manifest.revision=p.sourceRevision!;
 const key=personalStorageName('',p),legacy=legacyPersonalStorageName(p)!,memory=corrected(p,initialPersonal(p),p.seats[0],4),
  entry={id:p.sourceRevision!,personalFiles:{[key]:'state-version-'+ 'f'.repeat(64)+'.json'}} as Entry,
  reads:string[]=[],host={async read(name:string){reads.push(name);return name===legacy?new TextEncoder().encode(JSON.stringify(memory)):null;}};
 for(const retained of [false,true]){
  await assert.rejects(loadPersonalJournal(host,entry,p,{retained,fallbackPersonal:memory}),error=>
   error instanceof PersonalJournalError&&error.code===(retained?'retained-journal':'personal-journal')&&/declared personal journal is missing/.test(error.message));
 }
 assert.deepEqual(reads,[entry.personalFiles![key],entry.personalFiles![key]],'A missing explicit pointer must not read a different bare legacy journal');
});
test('unmapped brand-new and original legacy journals remain legitimate without inventing state for unreadable existing files',async()=>{
 const p=fixture();p.manifest.revision=p.sourceRevision!;
 const entry={id:p.sourceRevision!} as Entry,initial=initialPersonal(p),legacy=legacyPersonalStorageName(p)!,saved=corrected(p,initial,p.seats[0],4),old={...saved,version:1,binding:undefined};
 assert.deepEqual(await loadPersonalJournal({async read(){return null;}},entry,p),initial);
 assert.deepEqual(await loadPersonalJournal({async read(name){return name===legacy?new TextEncoder().encode(JSON.stringify(old)):null;}},entry,p),saved);
 await assert.rejects(loadPersonalJournal({async read(){return new TextEncoder().encode('null');}},entry,p),/journal cannot be read/);
});
