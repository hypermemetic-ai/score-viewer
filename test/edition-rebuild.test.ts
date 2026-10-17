import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {archivePackage,hashBytes,importPackage,readEditionContent,selectPresentation,type ScorePackage} from '../src/package';
import {addKeyboardView,packageFile,personalForAddedKeyboard,prepareRebuiltEdition,rebuildEdition} from '../src/edition-rebuild';
import {stagePresentationInstall} from '../src/presentation-install';
import {stagePracticeEditionTransfer} from '../src/practice-edition-install';
import {nextTranspositionSelection} from '../src/score-transposition-selection';
import {prepareSourceTransposition} from '../src/score-transposition';
import {collectionId,fingerFor,initialPersonal,performanceStorageName,personalStorageName,practiceStorageName,type Entry,type PersonalState} from '../src/state';
import {assigned,handFor} from '../src/personal-assignments';
import {initialPractice,planPractice} from '../src/practice';
import {sourcePackage,transferStudy} from './support/hand-edition-fixture';
import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';

// A saved calculated edition whose pages no longer reproduce at the ISO pin:
// Conventional shows calculated hands with a finger layer, Jankó the source's hands.
const bytes=new Uint8Array(readFileSync(new URL('../fixtures/authored-calculated-preparation-v2.isoscore',import.meta.url))),
 content=await readEditionContent(bytes),id=collectionId(content),file=await packageFile(bytes),
 earlier={'conventional-piano':await selectPresentation(content,'conventional-piano'),'janko-four-row':await selectPresentation(content,'janko-four-row')} as Record<PhysicalKeyboardId,ScorePackage>,
 conventional=earlier['conventional-piano'],encode=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value)),
 journal=`state-version-${'a'.repeat(64)}.json`,
 seatOf=(p:ScorePackage,owner:string)=>p.seats.find(s=>s.ownerIds.includes(owner))!,
 printed=(p:ScorePackage,owner:string)=>p.fingerLayer?.attacks.find(a=>a.id===p.fingerLayer!.sourceOwnerToAttack[owner])?.finger;

// The player chose another hand and finger for one note of the earlier edition.
const chosenSeat=conventional.seats.find(s=>s.ownerIds.length===1)!,chosen=chosenSeat.ownerIds[0],
 chosenHand=handFor(conventional,initialPersonal(conventional),chosen)==='LH'?'RH':'LH',
 prior:PersonalState=assigned(conventional,initialPersonal(conventional),chosenSeat,{hand:chosenHand,finger:4}),
 entry:Entry={id,file,metadata:content.manifest.metadata,importedAt:'2026-10-17T00:00:00.000Z',personalFiles:{[personalStorageName(id,conventional)]:journal}};
const host=(stored:Map<string,Uint8Array>)=>({read:async(name:string)=>stored.get(name)??null,write:async(name:string,data:Uint8Array)=>{stored.set(name,data);}});

test('a saved edition that no longer reproduces is engraved again with every hand and finger and the player\'s choices, on both keyboards',async()=>{
 await assert.rejects(importPackage(bytes),/current shared engraving policy/);
 const copy=bytes.slice(),stored=new Map([[journal,encode(prior)]]),
  rebuilt=await prepareRebuiltEdition(host(stored),entry,file,bytes,'conventional-piano',{refusal:Error('refused')}),
  next=await importPackage(rebuilt.packageBytes);
 assert.deepEqual(bytes,copy,'the earlier archive is not changed');
 assert.deepEqual([...next.availablePresentations!].sort(),['conventional-piano','janko-four-row']);
 assert.equal(rebuilt.replaced[file],await packageFile(rebuilt.packageBytes));
 const personal:Record<string,PersonalState>={[personalStorageName(id,rebuilt.package)]:rebuilt.personal,...Object.fromEntries(rebuilt.additionalPersonal.map(p=>[p.key,p.personal]))};
 for(const layout of ['conventional-piano','janko-four-row'] as const){
  const before=earlier[layout],after=await selectPresentation(next,layout),s=personal[personalStorageName(id,after)];
  assert.ok(s,`${layout} has its journal`);
  for(const n of before.score.notes){
   const own=layout==='conventional-piano'&&n.id===chosen;
   assert.equal(handFor(after,s,n.id),own?chosenHand:handFor(before,initialPersonal(before),n.id),`${layout} ${n.id} hand`);
   const finger=own?4:printed(before,n.id);
   if(finger!==undefined)assert.equal(fingerFor(after,s,seatOf(after,n.id)),finger,`${layout} ${n.id} finger`);
  }
 }
 assert.equal(rebuilt.carried,1);assert.equal(rebuilt.left,0);
 assert.ok(['edition','choices'].includes(rebuilt.hands));assert.ok(['edition','choices'].includes(rebuilt.fingers));
 // Practice moves from each earlier keyboard view to its new one.
 assert.deepEqual(rebuilt.practice.map(p=>p.from.keyboardLayout).sort(),['conventional-piano','janko-four-row']);
});

test('installing a re-engraved edition keeps the earlier file listed with its journals, selects the new edition and carries practice',async()=>{
 const stored=new Map([[journal,encode(prior)]]),h=host(stored),
  rebuilt=await prepareRebuiltEdition(h,entry,file,bytes,'conventional-piano',{refusal:Error('refused')}),
  plan=planPractice(conventional),practice=initialPractice(plan);practice.best[plan.chunks[0].pattern]=practice.target;
 stored.set(practiceStorageName(id,conventional),encode(practice));
 const installed=await stagePresentationInstall(h,{entry,entries:[entry],packageBytes:rebuilt.packageBytes,personalBytes:encode(rebuilt.personal),
  personalKey:personalStorageName(id,rebuilt.package),additionalPersonal:rebuilt.additionalPersonal.map(p=>({key:p.key,bytes:encode(p.personal)})),replaced:rebuilt.replaced,
  beforeCommit:async()=>{for(const p of rebuilt.practice)if(practiceStorageName(id,p.from)!==practiceStorageName(id,p.to))
   await stagePracticeEditionTransfer(h,{entryId:id,from:p.from,to:p.to,personal:p.personal});}});
 assert.equal(installed.entry.file,await packageFile(rebuilt.packageBytes));
 assert.ok(installed.entry.retainedPackages!.includes(file),'the earlier edition stays under Earlier editions');
 assert.deepEqual(installed.entry.editionPersonalFiles![file],entry.personalFiles,'its journal mapping is kept');
 assert.equal(stored.get(journal)!.byteLength,encode(prior).byteLength);
 for(const p of rebuilt.additionalPersonal)assert.ok(installed.entry.personalFiles![p.key],'the other keyboard keeps its journal');
 const moved=stored.get(practiceStorageName(id,rebuilt.package));assert.ok(moved,'practice came along');
 const carried=JSON.parse(new TextDecoder().decode(moved));
 assert.equal(carried.target,practice.target);
 assert.ok(Object.values(carried.best).includes(practice.target),'the practised section keeps its best');
});

test('a pitch selection naming a re-engraved archive names its replacement on the keyboards it serves',()=>{
 const old=`package-${'1'.repeat(64)}.isoscore`,other=`package-${'2'.repeat(64)}.isoscore`,original=`package-${'3'.repeat(64)}.isoscore`,next=`package-${'4'.repeat(64)}.isoscore`,
  selection=nextTranspositionSelection({...entry,file:old,transposition:{version:'score-transposition-selection-v1',steps:1,
   editions:{'0':{'janko-four-row':original},'1':{'janko-four-row':old,'conventional-piano':other},'2':{'janko-four-row':old}}}},next,
   {steps:1,layout:'janko-four-row',layouts:['janko-four-row'],replaced:{[old]:next}})!;
 assert.deepEqual(selection.editions['1'],{'janko-four-row':next,'conventional-piano':other});
 assert.deepEqual(selection.editions['2'],{'janko-four-row':next});assert.deepEqual(selection.editions['0'],{'janko-four-row':original});
});

test('an edition gains the keyboard it lacks; its own view keeps its exact pages',async()=>{
 const {p}=await sourcePackage(transferStudy());assert.deepEqual(p.availablePresentations,['janko-four-row']);
 const added=await addKeyboardView(p,'conventional-piano'),next=await importPackage(added);
 assert.deepEqual([...next.availablePresentations!].sort(),['conventional-piano','janko-four-row']);
 const kept=await selectPresentation(next,'janko-four-row'),view=await selectPresentation(next,'conventional-piano');
 assert.deepEqual(kept.pages,p.pages);assert.equal(personalStorageName(id,kept)===personalStorageName(id,p),true);
 assert.deepEqual(view.score.notes.map(n=>n.hand),p.score.notes.map(n=>n.hand));
 const s=personalForAddedKeyboard(p,view);for(const n of p.score.notes)assert.equal(handFor(view,s,n.id),n.hand);
 await assert.rejects(addKeyboardView(next,'conventional-piano'),/can't gain/);
});

test('a re-engraved edition and its other pitches keep separate choices, practice and performance',async()=>{
 const rebuilt=await rebuildEdition(bytes,{refusal:Error('refused')}),next=await importPackage(rebuilt.bytes);
 for(const layout of ['conventional-piano','janko-four-row'] as const){
  const zero=await selectPresentation(next,layout),up=await selectPresentation(await importPackage(await prepareSourceTransposition(zero,rebuilt.bytes,1)),layout);
  assert.equal(zero.preparationIdentity??up.preparationIdentity,undefined,'both pitches are engraved from their own hands');
  // Jankó shows the source's hands at both pitches, so the hand digests match.
  if(layout==='janko-four-row')assert.equal(zero.effectiveHandSha256,up.effectiveHandSha256,'hand digests do not name the pitch');
  for(const name of [personalStorageName,practiceStorageName,performanceStorageName])assert.notEqual(name(id,zero),name(id,up),layout);
 }
});

test('an own-hands edition saved before the current shared engraving policy is refused on opening and engraved again',async()=>{
 // An approved-v3 recipe from before ISO #386 lacks the policy keys it now requires.
 const fresh=await importPackage((await rebuildEdition(bytes,{refusal:Error('refused')})).bytes),m=structuredClone(fresh.collectionManifest??fresh.manifest),files={...fresh.files};delete files['manifest.json'];
 for(const d of Object.values(m.presentations!)){const recipe=JSON.parse(new TextDecoder().decode(files[d!.renderingRecipe!]));
  for(const key of ['performingHandPolicy','openingHeadMask','phraseSystemBreaks'])delete recipe.options[key];
  files[d!.renderingRecipe!]=new TextEncoder().encode(JSON.stringify(recipe));m.files[d!.renderingRecipe!]=await hashBytes(files[d!.renderingRecipe!]);}
 const stale=archivePackage(m,files);
 const refusal=await importPackage(stale).then(()=>assert.fail('a stale approved recipe must not open as it is'),(error:Error)=>error);
 assert.match(refusal.message,/current shared engraving policy/);
 const content=await readEditionContent(stale),again=await rebuildEdition(stale,{refusal}),next=await importPackage(again.bytes);
 for(const layout of ['conventional-piano','janko-four-row'] as const){
  const before=await selectPresentation(content,layout),after=await selectPresentation(next,layout);
  for(const n of before.score.notes)assert.equal(after.score.notes.find(x=>x.id===n.id)?.hand,n.hand,`${layout} ${n.id}`);
  for(const n of before.score.notes)assert.equal(printed(after,n.id),printed(before,n.id),`${layout} ${n.id} finger`);
 }
});

test('an edition whose content is damaged is refused, not engraved again',async()=>{
 const damaged=bytes.slice();damaged[Math.floor(damaged.length/2)]^=0xff;
 await assert.rejects(rebuildEdition(damaged,{refusal:Error('It stays saved.')}),/stays saved/);
});

test('an edition whose member no longer matches its recorded hash is refused, not engraved again',async()=>{
 const m=structuredClone(content.collectionManifest??content.manifest),files={...content.files};delete files['manifest.json'];
 const member=Object.keys(m.files).find(name=>name.endsWith('.svg'))!;
 files[member]=new TextEncoder().encode(new TextDecoder().decode(files[member]).replace('</svg>','<!-- altered --></svg>'));
 await assert.rejects(rebuildEdition(archivePackage(m,files),{refusal:Error('It stays saved.')}),/stays saved/);
});
