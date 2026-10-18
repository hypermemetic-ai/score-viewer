import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {unzipSync} from 'fflate';
import {importPackage,selectPresentation} from '../src/package';
import {canShareKeyboardView,layoutNeutralPages,packageFile,prepareRebuiltEdition,shareKeyboardView} from '../src/edition-rebuild';
import {ensurePianoReady} from '../src/piano-readiness';
import {collectionId,corrected,fingerFor,initialPersonal,personalStorageName,type Entry} from '../src/state';

// ISO notation draws the same pages for both keyboard layouts and the reader
// draws fingers at the seats, so a score's existing pages serve the layout it
// lacks: nothing is engraved and nothing waits.
const fixture=(name:string)=>new Uint8Array(readFileSync(new URL('../fixtures/'+name,import.meta.url)));
const encode=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value));
const host=(stored:Map<string,Uint8Array>)=>({read:async(name:string)=>stored.get(name)??null});

test('an early-format score file opens on the conventional layout with its own existing pages',async()=>{
 const bytes=fixture('schumann-op68-no14.tuna'),early=await importPackage(bytes,{allowLegacyTempo:true});
 assert.equal(layoutNeutralPages(early),true,'its pages print pitch digits only; the operator fingers are drawn by the reader');
 assert.equal(canShareKeyboardView(early,'conventional-piano'),true);
 const entry:Entry={id:collectionId(early),file:await packageFile(bytes),metadata:early.manifest.metadata,importedAt:'2026-10-18T00:00:00.000Z'},
  started=performance.now(),linked=await prepareRebuiltEdition(host(new Map()),entry,entry.file,bytes,'conventional-piano',{keepPages:true}),took=performance.now()-started;
 const next=await importPackage(linked.packageBytes,{allowLegacyTempo:true}),
  conventional=await selectPresentation(next,'conventional-piano'),janko=await selectPresentation(next,'janko-four-row');
 assert.equal(collectionId(next),entry.id);
 // The very same pages and seats on both layouts.
 assert.deepEqual(conventional.pages,early.pages);assert.deepEqual(janko.pages,early.pages);
 assert.deepEqual(conventional.seats,early.seats);assert.deepEqual(janko.seats,early.seats);
 const members=Object.keys(unzipSync(linked.packageBytes)).filter(name=>name.endsWith('.svg'));
 assert.deepEqual(members.sort(),early.manifest.pages.slice().sort(),'no second set of pages is stored');
 // The operator's Jankó fingers stay on the Jankó layout, still drawn in place of the pitch digits; none on conventional.
 assert.deepEqual(janko.fingerLayer?.attacks,early.fingerLayer!.attacks);
 assert.deepEqual(janko.fingerEligibility,early.fingerEligibility);assert.equal(janko.fingerEligibility.eligible,true);
 assert.equal(conventional.fingerLayer,undefined);
 assert.equal(linked.fingers,'edition');assert.equal(linked.hands,'edition');
 assert.ok(took<5000,`no engraving (${Math.round(took)} ms)`);
 const ready=await ensurePianoReady({packageBytes:linked.packageBytes,layout:'conventional-piano',personal:linked.personal});
 assert.ok('package' in ready&&ready.package.pages.length===early.pages.length,`prepared as ${ready.status}`);
});

test('the player\'s own Jankó fingering stays on the Jankó layout when the existing pages serve conventional',async()=>{
 const bytes=fixture('schumann-op68-no14.tuna'),early=await importPackage(bytes,{allowLegacyTempo:true}),id=collectionId(early),file=await packageFile(bytes),
  seat=early.seats.find(s=>s.ownerIds.length===1)!,printed=early.fingerLayer!.attacks.find(a=>a.id===seat.actionId)!.finger,mine=printed===1?2:1,
  journal='state-version-early.json',prior=corrected(early,initialPersonal(early),seat,mine),
  entry:Entry={id,file,metadata:early.manifest.metadata,importedAt:'2026-10-18T00:00:00.000Z',personalFiles:{[personalStorageName(id,early)]:journal}},
  linked=await prepareRebuiltEdition(host(new Map([[journal,encode(prior)]])),entry,file,bytes,'conventional-piano',{keepPages:true}),
  janko=await selectPresentation(await importPackage(linked.packageBytes,{allowLegacyTempo:true}),'janko-four-row'),
  jankoJournal=linked.additionalPersonal.find(p=>p.key===personalStorageName(id,janko));
 assert.ok(jankoJournal);assert.equal(fingerFor(janko,jankoJournal.personal,seat),mine);
 assert.equal(linked.carried,1);assert.equal(linked.left,0);
 assert.equal(Object.keys(linked.personal.assignments?.choices??{}).length,0,'no Jankó fingers on the conventional layout');
 assert.deepEqual(linked.practice.map(p=>p.from.keyboardLayout),['janko-four-row']);
});

test('a linked score file shows its own pages on the layout it lacks, adding no pages',async()=>{
 const bytes=fixture('authored-preparation-v1.tuna'),p=await importPackage(bytes);
 assert.deepEqual(p.availablePresentations,['janko-four-row']);assert.equal(canShareKeyboardView(p,'conventional-piano'),true);
 const shared=await shareKeyboardView(p,'conventional-piano'),next=await importPackage(shared),
  janko=await selectPresentation(next,'janko-four-row'),conventional=await selectPresentation(next,'conventional-piano');
 assert.deepEqual([...next.availablePresentations!].sort(),['conventional-piano','janko-four-row']);
 assert.deepEqual(janko.pages,p.pages);assert.deepEqual(conventional.pages,p.pages);assert.deepEqual(conventional.seats,p.seats);
 assert.deepEqual(Object.keys(unzipSync(shared)).sort(),Object.keys(unzipSync(bytes)).sort(),'the same members, only the manifest names one more view');
 assert.equal(personalStorageName(collectionId(p),janko),personalStorageName(collectionId(p),p),'its own view keeps its journal');
 assert.notEqual(personalStorageName(collectionId(p),conventional),personalStorageName(collectionId(p),p),'each layout keeps its own choices');
 assert.equal(conventional.fingerLayer,undefined);
 assert.equal(canShareKeyboardView(next,'janko-four-row'),false,'nothing to add once both layouts are there');
});

test('pages whose hands were calculated for one layout are not shared',()=>{
 const base={manifest:{engineVersion:'x'},score:{notes:[{id:'n',hand:'RH'}]}} as any;
 assert.equal(layoutNeutralPages(base),true);
 assert.equal(layoutNeutralPages({...base,score:{notes:[{id:'n',hand:'RH',derivedHand:{}}]}}),false);
 assert.equal(layoutNeutralPages({...base,score:{...base.score,performingHandPresentation:{}}}),false);
 assert.equal(layoutNeutralPages({...base,manifest:{engineVersion:'x',calculatedHandReceipt:'r.json'}}),false);
 assert.equal(layoutNeutralPages({...base,preparationIdentity:{}}),true,'a preparation bound to the view is not ink on its pages');
});
