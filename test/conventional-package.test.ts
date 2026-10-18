import {requirePianoEvent} from '../src/piano-event';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {strFromU8,strToU8,unzipSync} from 'fflate';
import {archivePackage,hashBytes,importPackage,selectPresentation,validateLayerAsync,type Manifest} from '../src/package';
import {collectionId,corrected,fingerFor,initialPersonal,installLayer,legacyPersonalStorageName,legacyPracticeStorageName,legacyPerformanceStorageName,personalStorageName,practiceStorageName,performanceStorageName,readPersonal} from '../src/state';

const fixture=readFileSync(new URL('../vendor/iso-notation/public/review/schumann-no14-conventional-20261006.tuna',import.meta.url));
const files=unzipSync(fixture),outer=JSON.parse(strFromU8(files['manifest.json'])) as Manifest;
const piano=await importPackage(fixture),janko=await selectPresentation(piano,'janko-four-row');
const sourceSha='e363c2897ab1a85fb6a4178ab1514987d7b6d207be92b56a90dbb0a5a5d5bc27';
async function changed(change:(m:Manifest,f:Record<string,Uint8Array>)=>void|Promise<void>){
 const f=structuredClone(files);delete f['manifest.json'];const m=structuredClone(outer);await change(m,f);
 for(const [name,bytes]of Object.entries(f))m.files[name]=await hashBytes(bytes);
 return archivePackage(m,f);
}
test('linked conventional and original RR presentations preserve exact source bytes and every independent owner',async()=>{
 assert.equal(await hashBytes(piano.files['source-score.json']),sourceSha);assert.equal(collectionId(piano),collectionId(janko));
 assert.deepEqual(piano.availablePresentations,['conventional-piano','janko-four-row']);assert.equal(piano.fingerEligibility.eligible,true);
 assert.equal(piano.fingerLayer!.version,'physical-contact-finger-layer-v2');assert.equal(piano.fingerLayer!.attacks.length,381);assert.equal(piano.score.notes.length,383);
 assert.equal(piano.fingerLayer!.attacks.reduce((n,a)=>n+a.owners.length,0),383);assert.equal(piano.fingerLayer!.traversal.length,96);
 assert.equal(janko.fingerLayer!.profileId,'rr-player-performance-contact-pose-v5');assert.equal(janko.fingerLayer!.sourceHash,'160a57b655a06a9848e9cdee780f257a491ffb5fe83e5b153ffb9ca9a04f667f');
 assert.deepEqual(piano.files['source-score.json'],janko.files['presentations/janko-four-row/score.json']);
 const rr=JSON.parse(readFileSync(new URL('../vendor/iso-notation/test/fixtures/rr-v5-contacts.json',import.meta.url),'utf8'));
 assert.equal(await hashBytes(janko.files['presentations/janko-four-row/fingers.json']),rr.layerSha256);
 assert.deepEqual(janko.fingerLayer!.attacks.map(({id,pitch,hand,finger,row,owners})=>({id,pitch,hand,finger,row,owners})),rr.attacks);
 assert.deepEqual(janko.fingerLayer!.traversal,rr.traversal);assert.equal(janko.fingerLayer!.physicalRowOrder,rr.physicalRowOrder);
 assert.equal(janko.manifest.revision,sourceSha);assert.equal(await selectPresentation(janko,'conventional-piano'),piano);
 for(const p of [piano,janko])for(const a of p.fingerLayer!.attacks)for(const o of a.owners)assert.equal(requirePianoEvent(p.score.notes.find(n=>n.id===o.id)!).hand,a.hand);
});
test('historical conventional contract remains exact and readable but cannot stand in for current action replay',async()=>{
 const layer=piano.fingerLayer!;
 assert.equal(layer.plannerVersion,'conventional-joint-contact-route-v1');
 assert.equal(layer.profileId,'conventional-unmeasured-baseline-v1');
 assert.equal(layer.actionCertificate,undefined);assert.equal(layer.actionsSha256,undefined);
 await assert.rejects(validateLayerAsync(layer,piano,{requireCurrent:true}),/current|action|version/i);
 assert.equal(await hashBytes(fixture),'2ffc820dc1f57ba45249331c68671d82e71ea7edd0edc284fcbc03d90fd5584d');
 assert.deepEqual(piano.files['fingers.json'],files['fingers.json']);
});
test('import validates unselected linked layers and refuses unknown physical contacts',async()=>{
 await assert.rejects(importPackage(await changed((_m,f)=>{const l=JSON.parse(strFromU8(f['presentations/janko-four-row/fingers.json']));l.attacks[0].row=99;f['presentations/janko-four-row/fingers.json']=strToU8(JSON.stringify(l));})),/finger action/i);
 const l=structuredClone(piano.fingerLayer!);l.attacks[0].contact!.contactId='piano:40:invented-zone';await assert.rejects(validateLayerAsync(l,piano),/contact/i);
 const wrongRow=structuredClone(piano.fingerLayer!);wrongRow.attacks[0].row=2;await assert.rejects(validateLayerAsync(wrongRow,piano),/attack identity/i);
 const wrongHand=structuredClone(piano.fingerLayer!);wrongHand.attacks[0].hand='RH';await assert.rejects(validateLayerAsync(wrongHand,piano),/performing-hand/i);
 await assert.rejects(validateLayerAsync(janko.fingerLayer,piano),/source\/version/);
});
test('linked descriptors cannot retitle a legacy archive as conventional or change musical source facts',async()=>{
 await assert.rejects(importPackage(await changed(m=>{m.sourceSha256='0'.repeat(64);})),/Unsupported/);
 await assert.rejects(importPackage(await changed(m=>{m.presentations!['conventional-piano']!.effectiveHandSha256='0'.repeat(64);m.effectiveHandSha256='0'.repeat(64);})),/binding differs/);
 await assert.rejects(importPackage(await changed(async(m,f)=>{delete m.presentations!['conventional-piano']!.fingers;delete f['fingers.json'];delete m.files['fingers.json'];const s=JSON.parse(strFromU8(f['score.json']));s.notes[0].sourceProvenance={...s.notes[0].sourceProvenance,voice:'invented-source-voice'};f['score.json']=strToU8(JSON.stringify(s));const revision=await hashBytes(f['score.json']);m.revision=m.semanticSha256=revision;m.presentations!['conventional-piano']!.revision=revision;})),/revision|source facts/);
});
test('single explicit layout and missing recipe/fingers remain honestly readable',async()=>{
 const bytes=await changed((m,f)=>{delete m.presentations!['janko-four-row'];for(const name of Object.keys(f))if(name.startsWith('presentations/')){delete f[name];delete m.files[name];}
  delete m.renderingRecipe;delete m.presentations!['conventional-piano']!.renderingRecipe;delete f['rendering-recipe.json'];delete m.files['rendering-recipe.json'];
  delete m.presentations!['conventional-piano']!.fingers;delete f['fingers.json'];delete m.files['fingers.json'];});
 const p=await importPackage(bytes);assert.deepEqual(p.availablePresentations,['conventional-piano']);assert.equal(p.renderingRecipe,undefined);assert.equal(p.fingerLayer,undefined);assert.equal(p.pages.length,3);
 await assert.rejects(selectPresentation(p,'janko-four-row'),/no compatible/);
});
test('a readable presentation without finger data still preserves a genuine source hand requirement',async()=>{
 const bytes=await changed(async(m,f)=>{
  delete m.presentations!['janko-four-row'];for(const name of Object.keys(f))if(name.startsWith('presentations/')){delete f[name];delete m.files[name];}
  delete m.renderingRecipe;delete m.presentations!['conventional-piano']!.renderingRecipe;delete f['rendering-recipe.json'];delete m.files['rendering-recipe.json'];
  delete m.presentations!['conventional-piano']!.fingers;delete f['fingers.json'];delete m.files['fingers.json'];
  const source=JSON.parse(strFromU8(f['source-score.json'])),effective=JSON.parse(strFromU8(f['score.json'])),n=source.notes[0];
  const records=[{version:'source-hand-requirement-v1',ownerId:n.id,hand:'RH',guard:{pitch:n.pitch.octave*12+n.pitch.pitchClass,startTick:n.startTick,durationTicks:n.durationTicks},provenance:{kind:'source-instruction',reference:'Explicit source hand mark'}}];
  source.sourceHandRequirements=records;effective.sourceHandRequirements=records;
  f['source-score.json']=strToU8(JSON.stringify(source));f['score.json']=strToU8(JSON.stringify(effective));
  m.sourceRevision=m.sourceSha256=m.layerSourceHash=await hashBytes(f['source-score.json']);m.revision=m.semanticSha256=await hashBytes(f['score.json']);
  const d=m.presentations!['conventional-piano']!;d.revision=m.revision;d.layerSourceHash=m.sourceSha256;
 });
 await assert.rejects(importPackage(bytes),/source instruction/);
});
test('layout/profile/effective-hand state partitions retain edits and history across switch-and-return',()=>{
 const seat=piano.seats[0],base=initialPersonal(piano),replacement=piano.fingerLayer!.attacks[0].finger===1?2:1;
 let saved=corrected(piano,base,seat,replacement);saved=installLayer(saved,piano,structuredClone(piano.fingerLayer!));saved.editContactId=seat.contactId;saved.view.page=2;
 const raw=JSON.stringify(saved),returned=readPersonal(JSON.parse(raw),piano);assert.equal(JSON.stringify(returned),raw);assert.equal(fingerFor(piano,returned,seat),replacement);assert.equal(returned.history.length,1);
 assert.equal(returned.overrides[seat.contactId].proposedRow,undefined);assert.ok(returned.overrides[seat.contactId].proposedContact);
 assert.notEqual(personalStorageName('one',piano),personalStorageName('one',janko));assert.notEqual(practiceStorageName('one',piano),practiceStorageName('one',janko));assert.notEqual(performanceStorageName('one',piano),performanceStorageName('one',janko));
 assert.ok(personalStorageName('one',piano).length<255);assert.throws(()=>readPersonal(saved,janko),/layout\/profile/);assert.throws(()=>installLayer(saved,piano,janko.fingerLayer!),/keyboard\/profile/);
 const wrong=structuredClone(saved);wrong.binding!.profileSha256='0'.repeat(64);assert.throws(()=>readPersonal(wrong,piano),/layout\/profile/);
 const changedHands=structuredClone(saved);changedHands.binding!.effectiveHandSha256='0'.repeat(64);assert.throws(()=>readPersonal(changedHands,piano),/layout\/profile/);
});
test('exact original RR v1 sidecar fallback is explicit and read-only, never inherited by piano',()=>{
 const legacy={...initialPersonal(janko),version:1 as const};delete legacy.binding;const raw=JSON.stringify(legacy);
 assert.equal(legacyPersonalStorageName(janko),`state-${sourceSha}.json`);assert.equal(legacyPracticeStorageName(janko),`practice-${sourceSha}.json`);assert.equal(legacyPerformanceStorageName(janko),`performance-${sourceSha}.json`);assert.equal(legacyPersonalStorageName(piano),undefined);
 assert.throws(()=>readPersonal(legacy,janko),/layout\/profile/);const bound=readPersonal(legacy,janko,{allowLegacyJanko:true});assert.equal(bound.version,2);assert.equal(JSON.stringify(legacy),raw);assert.equal(bound.binding!.keyboardLayout,'janko-four-row');assert.throws(()=>readPersonal(legacy,piano,{allowLegacyJanko:true}),/layout\/profile/);
});
test('historical version-one package keeps legacy paths and unsupported conventional view never migrates it',async()=>{
 const p=await importPackage(readFileSync(new URL('../fixtures/schumann-op68-no14.tuna',import.meta.url)),{allowLegacyTempo:true});const s=initialPersonal(p);
 assert.equal(s.version,1);assert.equal(personalStorageName('original',p),'state-original.json');assert.equal(practiceStorageName('original',p),'practice-original.json');assert.equal(performanceStorageName('original',p),'performance-original.json');assert.equal(await selectPresentation(p,'janko-four-row'),p);await assert.rejects(selectPresentation(p,'conventional-piano'),/no conventional/);
});