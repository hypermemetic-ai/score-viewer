import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {importPackage,selectPresentation} from '../src/package';
import {addKeyboardView,canAddKeyboardView,packageFile,prepareRebuiltEdition} from '../src/edition-rebuild';
import {ensurePianoReady} from '../src/piano-readiness';
import {collectionId,corrected,fingerFor,initialPersonal,personalStorageName,type Entry} from '../src/state';

// The two keyboard layouts read the same notation, so every score opens on
// either one. A score file saved with pages for the Jankó layout only gains
// the conventional layout by being engraved from its own notes.
const fixture=(name:string)=>new Uint8Array(readFileSync(new URL('../fixtures/'+name,import.meta.url)));
const encode=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value));
const host=(stored:Map<string,Uint8Array>)=>({read:async(name:string)=>stored.get(name)??null});
const ink=(svg:string)=>svg.replace(/<text class="janko-source-notice"[^>]*>[^<]*<\/text>/g,'');

test('an early-format score file with only Jankó pages imports and opens on the conventional layout with real pages',async()=>{
 const bytes=fixture('schumann-op68-no14.tuna'),copy=bytes.slice(),early=await importPackage(bytes,{allowLegacyTempo:true});
 assert.deepEqual(early.availablePresentations,['janko-four-row']);
 assert.equal(canAddKeyboardView(early,'conventional-piano'),false,'its pages cannot stand beside a linked view, so the whole edition is engraved again');
 // A fresh import: no journals yet.
 const entry:Entry={id:collectionId(early),file:await packageFile(bytes),metadata:early.manifest.metadata,importedAt:'2026-10-18T00:00:00.000Z'},
  rebuilt=await prepareRebuiltEdition(host(new Map()),entry,entry.file,bytes,'conventional-piano');
 assert.deepEqual(bytes,copy,'the score file itself is not changed');
 const next=await importPackage(rebuilt.packageBytes,{allowLegacyTempo:true});
 assert.equal(collectionId(next),entry.id,'it stays the same score in the library');
 assert.deepEqual([...next.availablePresentations!].sort(),['conventional-piano','janko-four-row']);
 const conventional=await selectPresentation(next,'conventional-piano'),janko=await selectPresentation(next,'janko-four-row');
 assert.equal(rebuilt.package.keyboardLayout,'conventional-piano');
 // Real pages: every note has its head on a conventional page, and both layouts print the same ink.
 assert.ok(conventional.pages.length>=1&&conventional.pages.every(page=>page.includes('<svg')&&page.length>10_000));
 assert.equal(conventional.seats.length,early.seats.length);
 assert.equal(new Set(conventional.seats.flatMap(s=>s.ownerIds)).size,early.score.notes.length);
 assert.deepEqual(conventional.pages.map(ink),janko.pages.map(ink),'the notation does not differ between the layouts');
 // The operator's Jankó fingers stay edition content on the Jankó layout and are not shown on the conventional one.
 assert.equal(janko.fingerLayer?.attacks.length,early.fingerLayer!.attacks.length);
 assert.deepEqual(janko.fingerLayer?.reviewedFingerAuthority,early.fingerLayer!.reviewedFingerAuthority);
 for(const a of early.fingerLayer!.attacks)assert.equal(janko.fingerLayer!.attacks.find(b=>b.id===a.id)?.finger,a.finger);
 assert.equal(conventional.fingerLayer,undefined);
 assert.equal(rebuilt.fingers,'edition');assert.equal(rebuilt.hands,'edition');
 // It opens: the conventional layout prepares for reading and practice.
 const ready=await ensurePianoReady({packageBytes:rebuilt.packageBytes,layout:'conventional-piano',personal:rebuilt.personal});
 assert.ok(ready.status==='ready'||ready.status==='editable'||ready.status==='reading',`prepared as ${ready.status}`);
 assert.ok('package' in ready&&ready.package.pages.length===conventional.pages.length);
});

test('a saved early-format score keeps the player\'s own Jankó fingerings when it gains the conventional layout',async()=>{
 const bytes=fixture('schumann-op68-no14.tuna'),early=await importPackage(bytes,{allowLegacyTempo:true}),id=collectionId(early),file=await packageFile(bytes),
  seat=early.seats.find(s=>s.ownerIds.length===1)!,printed=early.fingerLayer!.attacks.find(a=>a.id===seat.actionId)!.finger,mine=printed===1?2:1,
  journal='state-version-early.json',prior=corrected(early,initialPersonal(early),seat,mine),
  entry:Entry={id,file,metadata:early.manifest.metadata,importedAt:'2026-10-18T00:00:00.000Z',personalFiles:{[personalStorageName(id,early)]:journal}},
  rebuilt=await prepareRebuiltEdition(host(new Map([[journal,encode(prior)]])),entry,file,bytes,'conventional-piano'),
  next=await importPackage(rebuilt.packageBytes,{allowLegacyTempo:true}),janko=await selectPresentation(next,'janko-four-row'),
  jankoJournal=rebuilt.additionalPersonal.find(p=>p.key===personalStorageName(id,janko));
 assert.ok(jankoJournal,'the Jankó layout keeps its journal');
 const after=janko.seats.find(s=>s.ownerIds[0]===seat.ownerIds[0])!;
 assert.equal(fingerFor(janko,jankoJournal.personal,after),mine,'the player\'s own finger');
 assert.equal(rebuilt.carried,1);assert.equal(rebuilt.left,0);
 assert.equal(Object.keys(rebuilt.personal.assignments?.choices??{}).length,0,'no Jankó fingers on the conventional layout');
 assert.deepEqual(rebuilt.practice.map(p=>p.from.keyboardLayout),['janko-four-row'],'Jankó practice moves to the new Jankó view');
});

test('a linked score file with only Jankó pages gains the conventional layout beside its own pages',async()=>{
 const p=await importPackage(fixture('authored-preparation-v1.tuna'));
 assert.deepEqual(p.availablePresentations,['janko-four-row']);
 assert.equal(canAddKeyboardView(p,'conventional-piano'),true);
 const added=await importPackage(await addKeyboardView(p,'conventional-piano'));
 assert.deepEqual([...added.availablePresentations!].sort(),['conventional-piano','janko-four-row']);
 assert.deepEqual((await selectPresentation(added,'janko-four-row')).pages,p.pages,'its own Jankó pages stay');
 assert.ok((await selectPresentation(added,'conventional-piano')).pages.length>=1);
});
