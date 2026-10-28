import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {strFromU8,unzipSync} from 'fflate';
import {archivePackage,importPackage,requireCurrentEngraving,savedPagesBehindPolicy,selectPresentation,SavedPagesBehindPolicy,type Manifest} from '../src/package';
import {packageFile,prepareRebuiltEdition,shareKeyboardView} from '../src/edition-rebuild';
import {prepareSourceTransposition} from '../src/score-transposition';
import {CURRENT_ENGRAVER} from '../src/engraver-identity';
import {collectionId} from '../src/state';
import {APPROVED_SCORE_RENDERING_ENGINE} from '../vendor/iso-notation/src/render/iso/score-rendering-recipe';

// ISO 68db77e1 changed how pages are drawn but no policy key, so approved-v3
// editions drawn by 3bbe6a96 were admitted as current and, where the player's
// hands equal the score's own, shown as stored. Each view now records its
// engraver, and pages another engraver drew are engraved again once.
const {dependencyRevision}=JSON.parse(readFileSync(new URL('../docs/source-provenance.json',import.meta.url),'utf8')) as {dependencyRevision:string};
const EARLIER='iso-notation 3bbe6a96e6d4f6c4b3a1b2f6b8e2d0f1a9c7e5d3';
const host={read:async()=>null};
const manifestOf=(bytes:Uint8Array)=>JSON.parse(strFromU8(unzipSync(bytes)['manifest.json'])) as Manifest;
/** The same archive with its views' engraver records rewritten: the pages, seats and every member stay byte-identical. */
function recorded(bytes:Uint8Array,engraver:string|undefined):Uint8Array{
 const files=unzipSync(bytes),m=manifestOf(bytes);delete files['manifest.json'];
 for(const d of Object.values(m.presentations??{}))if(d){if(engraver===undefined)delete d.engraver;else d.engraver=engraver;}
 if(engraver===undefined)delete m.engraver;else m.engraver=engraver;
 return archivePackage(m,files);
}
// A current approved-v3 edition with both layouts: a no14-recovery fixture engraved again.
const early=await shareKeyboardView(await importPackage(new Uint8Array(readFileSync(new URL('../fixtures/authored-preparation-v1.tuna',import.meta.url))),{allowLegacyTempo:true}),'conventional-piano'),
 earlyFile=await packageFile(early),earlyPackage=await importPackage(early,{allowLegacyTempo:true}),
 entry={id:collectionId(earlyPackage),file:earlyFile,metadata:earlyPackage.manifest.metadata,importedAt:'2026-10-28T00:00:00.000Z',personalFiles:{}},
 fresh=(await prepareRebuiltEdition(host,entry,earlyFile,early,'conventional-piano',{refusal:new SavedPagesBehindPolicy()})).packageBytes;

test('the engraver is the pinned ISO notation revision',()=>{
 assert.equal(CURRENT_ENGRAVER,`iso-notation ${dependencyRevision}`);
});

test('an edition engraved now records the current engraver on every view and is current',async()=>{
 const m=manifestOf(fresh),p=await importPackage(fresh,{allowLegacyTempo:true});
 assert.deepEqual(Object.keys(m.presentations!).sort(),['conventional-piano','janko-four-row']);
 for(const d of Object.values(m.presentations!))assert.equal(d!.engraver,CURRENT_ENGRAVER);
 assert.equal(m.engraver,CURRENT_ENGRAVER,'the root manifest mirrors its primary view');
 for(const layout of ['conventional-piano','janko-four-row'] as const){
  const view=await selectPresentation(p,layout);
  assert.equal(view.renderingRecipe?.engineId,APPROVED_SCORE_RENDERING_ENGINE);assert.equal(view.manifest.engraver,CURRENT_ENGRAVER);
  assert.equal(savedPagesBehindPolicy(view),false);assert.equal(requireCurrentEngraving(view),view);
 }
});

test('an approved-v3 edition an earlier engraver drew is behind, though its recipe meets the current policy',async()=>{
 const stale=recorded(fresh,EARLIER),p=await importPackage(stale,{allowLegacyTempo:true});
 for(const layout of ['conventional-piano','janko-four-row'] as const){
  const view=await selectPresentation(p,layout);
  assert.equal(view.renderingRecipe?.engineId,APPROVED_SCORE_RENDERING_ENGINE,'admission reads it: its policy keys are current');
  assert.equal(savedPagesBehindPolicy(view),true,`${layout} opening engraves it again`);
  assert.throws(()=>requireCurrentEngraving(view),(error:Error)=>error instanceof SavedPagesBehindPolicy&&error.archiveSha256===p.archiveSha256);
 }
});

test('an approved-v3 edition saved before views recorded their engraver is behind once',async()=>{
 const before=recorded(fresh,undefined),m=manifestOf(before),p=await importPackage(before,{allowLegacyTempo:true});
 assert.equal(m.engraver,undefined);assert.ok(Object.values(m.presentations!).every(d=>d!.engraver===undefined));
 assert.equal(savedPagesBehindPolicy(p),true);
});

test('one view drawn by an earlier engraver puts the whole edition behind, whichever layout opens',async()=>{
 const files=unzipSync(fresh),m=manifestOf(fresh);delete files['manifest.json'];
 const other=(['conventional-piano','janko-four-row'] as const).find(layout=>layout!==m.keyboardLayout)!;
 m.presentations![other]!.engraver=EARLIER;
 const p=await importPackage(archivePackage(m,files),{allowLegacyTempo:true});
 assert.equal(savedPagesBehindPolicy(await selectPresentation(p,m.keyboardLayout!)),true,'the current view finds the other');
 assert.equal(savedPagesBehindPolicy(await selectPresentation(p,other)),true);
});

test('engraved again, an earlier engraver\'s edition is current and stays current: it is not engraved a second time',async()=>{
 const stale=recorded(fresh,EARLIER),file=await packageFile(stale),
  rebuilt=await prepareRebuiltEdition(host,{...entry,file},file,stale,'conventional-piano',{refusal:new SavedPagesBehindPolicy()}),
  next=await importPackage(rebuilt.packageBytes,{allowLegacyTempo:true});
 assert.equal(savedPagesBehindPolicy(next),false);
 for(const d of Object.values(manifestOf(rebuilt.packageBytes).presentations!))assert.equal(d!.engraver,CURRENT_ENGRAVER);
 // The next run admits the same bytes again: still current, so the library's
 // background work and opening find nothing to engrave.
 const reread=await importPackage(rebuilt.packageBytes.slice(),{allowLegacyTempo:true});
 assert.equal(savedPagesBehindPolicy(reread),false);assert.equal(requireCurrentEngraving(reread),reread);
});

test('a transposed edition records the current engraver on its views',async()=>{
 const p=await importPackage(fresh,{allowLegacyTempo:true}),transposed=await prepareSourceTransposition(await selectPresentation(p,'conventional-piano'),fresh,2),
  m=manifestOf(transposed),t=await importPackage(transposed,{allowLegacyTempo:true});
 for(const d of Object.values(m.presentations!))assert.equal(d!.engraver,CURRENT_ENGRAVER);
 assert.equal(savedPagesBehindPolicy(t),false);
});
