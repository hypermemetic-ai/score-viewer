import {requirePitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import {requirePianoEvent} from '../src/piano-event';
import test from 'node:test';import assert from 'node:assert/strict';import {strToU8,strFromU8} from 'fflate';
import {transferStudy,boundaryStudy,completeTieBoundaryStudy,sourcePackage,calculatedStudy} from './support/hand-edition-fixture';
import {archivePackage,hashBytes,importPackage,type ScorePackage} from '../src/package';
import {annotationPositions} from '../src/fingering-presentation';import {initialPersonal,fingerDisplayAvailable,corrected,fingerFor} from '../src/state';
import {createPianoPreparationIdentity} from '../src/piano-preparation-identity';
import {ensurePianoReady} from '../src/piano-readiness';
import type {Hand} from '../vendor/iso-notation/src/model/types';
async function repinned(p:ScorePackage,edit:(f:Record<string,Uint8Array>)=>void){
 const m=structuredClone(p.collectionManifest??p.manifest),files={...p.files};delete files['manifest.json'];edit(files);
 const d=m.presentations![p.keyboardLayout!]!,score=JSON.parse(strFromU8(files[d.score])),layer=JSON.parse(strFromU8(files[d.fingers!])),revision=await hashBytes(files[d.score]);
 d.revision=m.revision=m.semanticSha256=revision;layer.revision=revision;files[d.fingers!]=strToU8(JSON.stringify(layer));
 const candidate={...p,manifest:{...m,keyboardLayout:p.keyboardLayout},score,fingerLayer:layer,seats:JSON.parse(strFromU8(files[d.seats])),pages:d.pages.map(name=>strFromU8(files[name])),renderingRecipe:JSON.parse(strFromU8(files[d.renderingRecipe!]))};
 m.preparationIdentity=d.preparationIdentity=await createPianoPreparationIdentity(candidate,'calculate',200_000);
 m.files=Object.fromEntries(await Promise.all(Object.entries(files).map(async([name,b])=>[name,await hashBytes(b)])));return archivePackage(m,files);
}
test('both keyboards and transfer directions cold-replay complete authored beams and independent melody silence, with usable annotations',async()=>{
 for(const hand of ['LH','RH'] as const)for(const layout of ['conventional-piano','janko-four-row'] as const){
  const original=await sourcePackage(transferStudy(hand)),other:Hand=hand==='LH'?'RH':'LH',hands={'gesture-0':hand,'gesture-1':other,'gesture-2':hand,'melody-entrance':other},
   q=await calculatedStudy(original.p,layout,hands),cold=await importPackage(q.bytes,{keyboardLayout:layout});
  assert.deepEqual(cold.files['source-score.json'],original.p.files['source-score.json']);assert.ok(cold.score.notes.every(n=>!n.editorialHand&&n.derivedHand));
  assert.deepEqual(cold.score.notes.map(n=>requirePianoEvent(n).hand),Object.values(hands));
  const source=cold.calculatedHandReceipt!.sourceInventory,coverage=cold.calculatedHandReceipt!.sourceCoverage;
  assert.deepEqual(source.owners.map(o=>{assert.ok('pitch' in o);return[o.id,o.pitch,o.startTick,o.durationTicks];}),original.source.notes.map(n=>[n.id,requirePitchedEvent(n).pitch.octave*12+requirePitchedEvent(n).pitch.pitchClass,n.startTick,n.durationTicks]).sort((a,b)=>String(a[0])<String(b[0])?-1:1));
  assert.equal(source.silences.length,1);assert.equal(source.silences[0].source.voice,'melody');
  assert.equal(coverage.silences[0].disposition,'visible');assert.ok(coverage.silences[0].paint[0].ids.length);
  // ISO #383: a beam splits where its hand changes, and each change is cued head to head.
  assert.equal(q.r.layouts[0].beams.length,0);
  assert.deepEqual(q.r.layouts[0].handTransfers!.map(t=>[t.fromIds,t.toIds,t.fromHand,t.toHand,!!t.cue]),[[['gesture-0'],['gesture-1'],hand,other,true],[['gesture-1'],['gesture-2'],other,hand,true]]);
  assert.equal(coverage.gestures[0].memberIds.length,3);assert.equal(coverage.gestures[0].edgeIds.length,4);
  assert.equal(annotationPositions(cold).size,cold.seats.length);assert.equal(fingerDisplayAvailable(cold,initialPersonal(cold),'annotations'),true);
  const replacementUnavailable={...cold,fingerEligibility:{eligible:false}};
  assert.equal(annotationPositions(replacementUnavailable).size,cold.seats.length,'optional replacement failure does not remove annotations');
  const retained=await ensurePianoReady({packageBytes:q.bytes,layout});assert.equal(retained.status,'editable');assert.deepEqual(retained.packageBytes,q.bytes);
 }
});
test('strong cold admission rejects missing/duplicated/misattributed paint receipts and actual payload mutations despite coherent Viewer hashes',async()=>{
 const original=await sourcePackage(transferStudy()),q=await calculatedStudy(original.p,'janko-four-row',{'gesture-0':'LH','gesture-1':'RH','gesture-2':'LH','melody-entrance':'RH'}),p=q.p;
 const mutateReceipt=(change:(r:any)=>void)=>(f:Record<string,Uint8Array>)=>{const r=JSON.parse(strFromU8(f['hand-presentation.json']));change(r);f['hand-presentation.json']=strToU8(JSON.stringify(r));};
 for(const change of [(r:any)=>{r.sourceCoverage.silences=[];},(r:any)=>{r.sourceCoverage.silences.push(r.sourceCoverage.silences[0]);},
  (r:any)=>{r.sourceCoverage.gestures[0].memberIds[0]='foreign';},(r:any)=>{r.annotationGeometry.seats[0].durationBounds=[];}])
  await assert.rejects(importPackage(await repinned(p,mutateReceipt(change))),/actual paint|coverage|geometry/);
 await assert.rejects(importPackage(await repinned(p,f=>{f['pages/1.svg']=strToU8(strFromU8(f['pages/1.svg']).replace(/<line[^>]+class="janko-stem"[^>]*\/>/,''));})),/pages or seats/);
 await assert.rejects(importPackage(await repinned(p,f=>{const r=JSON.parse(strFromU8(f['rendering-recipe.json']));r.baseline.pageSha256=p.calculatedHandReceipt!.outputIdentity.pageSha256;f['rendering-recipe.json']=strToU8(JSON.stringify(r));})),/raw-page baseline/);
 await assert.rejects(importPackage(await repinned(p,f=>{const s=JSON.parse(strFromU8(f['score.json']));s.notes[0].editorialHand={hand:s.notes[0].hand,kind:'confirm',authorityId:'forged-operator'};f['score.json']=strToU8(JSON.stringify(s));})),/source\/editorial provenance/);
});
test('repeat visits, unequal-release aliases and written holds keep their seats across the page boundary; the calculated-hand recipe refuses the touching cross-bar beam on both keyboards',async()=>{
 // A beam crossing the barline under the calculated-hand recipe touches it at
 // the ISO #383 pin, so no such calculated edition can be made; the source's
 // own edition keeps every obligation across the page boundary.
 const source=boundaryStudy(),original=await sourcePackage(source,{measuresPerSystem:1,systemsPerPage:1,pageWidth:240}),p=original.p;
 assert.equal(p.pages.length,2);
 const page=(id:string)=>p.seats.find(s=>s.ownerIds.includes(id))!.page;
 assert.equal(p.seats.filter(s=>s.ownerIds.includes('held')).length,1);assert.equal(page('edge-b')+1,page('edge-c'),'the cross-bar beam continues on the next page');
 for(const id of ['short-release','long-release']){const seat=p.seats.find(s=>s.ownerIds.includes(id))!;assert.equal(seat.ownerIds.length,1);assert.equal(seat.page,page('edge-c'));assert.equal(seat.actionId,'192:61');}
 for(const layout of ['conventional-piano','janko-four-row'] as const){
  const hands=Object.fromEntries(source.notes.map(n=>[n.id,n.id==='edge-a'?'RH':requirePianoEvent(n).hand]));
  await assert.rejects(calculatedStudy(p,layout,hands),(error:Error&{code?:string})=>error.code==='unsupported-fit');
 }
});
test('actual all-five replacement failure retains complete fresh long-value annotations and correction seats',async()=>{
 const source=transferStudy();source.id='viewer-authored-long-value';source.title='Long carrier annotation study';source.notes=[{id:'long-carrier',startTick:0,durationTicks:96,hand:'LH',eventKind:'pitched' as const,pitch:{octave:4,pitchClass:1}}];source.sourceSilences=[];
 for(const layout of ['conventional-piano','janko-four-row'] as const){const prior=await sourcePackage(source,{}, {knockoutMargin:0}),q=await calculatedStudy(prior.p,layout,{'long-carrier':'RH'}),seat=q.p.seats[0],position=annotationPositions(q.p).get(seat.id)!;
  assert.equal(q.r.allFive,false);assert.equal(q.p.fingerEligibility.eligible,false);assert.equal(fingerDisplayAvailable(q.p,initialPersonal(q.p),'replacement'),false);
  assert.equal(fingerDisplayAvailable(q.p,initialPersonal(q.p),'annotations'),true);assert.equal(q.p.annotationGeometry!.seats.length,1);
  const carrier=q.p.annotationGeometry!.seats[0];assert.ok(carrier.durationBounds.length);assert.ok(carrier.durationBounds.some(b=>b.y0<carrier.maskBounds.y0));
  assert.ok(carrier.durationBounds.every(b=>position.bounds[3]<b.y0));
  for(const finger of [1,2,3,4,5])assert.equal(fingerFor(q.p,corrected(q.p,initialPersonal(q.p),seat,finger),seat),finger);
 }
});
test('complete three/four-component source ties cold-read across every page on both keyboards without losing remote ownership or annotations',async()=>{
 for(const count of [3,4] as const)for(const layout of ['conventional-piano','janko-four-row'] as const){
  const hand:Hand=count===3?'RH':'LH',source=completeTieBoundaryStudy(count,hand),
   original=await sourcePackage(source,{measuresPerSystem:1,systemsPerPage:1,pageWidth:255}),before=await hashBytes(original.bytes),
   hands=Object.fromEntries(source.notes.map(n=>[n.id,n.id==='following-attack'?hand:requirePianoEvent(n).hand])),q=await calculatedStudy(original.p,layout,hands),
   cold=await importPackage(q.bytes,{keyboardLayout:layout}),seats=cold.seats.filter(s=>s.ownerIds.includes('written-hold')),
   components=source.tieChains![0].components;
  assert.equal(cold.pages.length,count-1);assert.equal(seats.length,count);assert.equal(new Set(seats.map(s=>s.page)).size,count-1);
  assert.equal(seats.filter(s=>s.continuation).length,count-1);assert.equal(new Set(seats.map(s=>s.actionId)).size,1);
  assert.equal(requirePianoEvent(cold.score.notes.find(n=>n.id==='written-hold')!).hand,hand);assert.equal(requirePianoEvent(cold.score.notes.find(n=>n.id==='following-attack')!).hand,hand);
  assert.notEqual(requirePianoEvent(source.notes.find(n=>n.id==='following-attack')!).hand,hand);
  for(const [index,l]of q.r.layouts.entries())assert.deepEqual(new Set(l.tieSplitHeadIds),new Set(components.flatMap((c,i)=>
   c.startTick>=index*144&&c.startTick<(index+1)*144?[]:[i?'written-hold~c'+i:'written-hold'])));
  assert.deepEqual(cold.files['source-score.json'],original.p.files['source-score.json']);assert.deepEqual(cold.sourceScore,source);
  const positions=annotationPositions(cold);assert.equal(positions.size,cold.seats.length);
  assert.deepEqual(annotationPositions({...cold,seats:[...cold.seats].reverse()}),positions,'page-local collision placement is independent of source seat enumeration across tied aliases');
  assert.equal(q.r.lint.violations.length,0);assert.equal(q.r.lint.warnings.length,0);
  const retained=await ensurePianoReady({packageBytes:q.bytes,layout});assert.equal(retained.status,'editable');assert.deepEqual(retained.packageBytes,q.bytes);
  await assert.rejects(importPackage(await repinned(cold,f=>{const r=JSON.parse(strFromU8(f['hand-presentation.json']));
   const finalSeat=seats.at(-1)!;r.annotationGeometry.seats=r.annotationGeometry.seats.filter((g:any)=>g.seatId!==finalSeat.id);
   f['hand-presentation.json']=strToU8(JSON.stringify(r));})),/actual paint|coverage|geometry/,'matching metadata cannot excuse missing remote carrier coverage');
  assert.equal(await hashBytes(original.bytes),before);
 }
});