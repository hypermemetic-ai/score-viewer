import test from 'node:test';import assert from 'node:assert/strict';import {strToU8,strFromU8} from 'fflate';
import {transferStudy,boundaryStudy,completeTieBoundaryStudy,sourcePackage,calculatedStudy} from './support/hand-edition-fixture';
import {archivePackage,hashBytes,importPackage,selectPresentation,type ScorePackage} from '../src/package';
import {annotationPositions} from '../src/fingering-presentation';import {initialPersonal,fingerDisplayAvailable,corrected,fingerFor} from '../src/state';
import {calculatedHandInputs} from '../src/calculated-hand-edition';import {createPianoPreparationIdentity} from '../src/piano-preparation-identity';
import {ensurePianoReady} from '../src/piano-readiness';
import {admitPianoRequestResult} from '../src/piano-request-admission';
import {preparePianoCalculationContext} from '../src/piano-context-package';
import {packagePianoPresentation} from '../src/piano-package-presentation';
import type {Hand} from '../vendor/iso-notation/src/model/types';
import type {ScoreRenderingRecipe} from '../vendor/iso-notation/src/score-presentation';
import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';
import {HandPresentationError} from '../vendor/iso-notation/src/score-presentation';
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
  assert.deepEqual(cold.score.notes.map(n=>n.hand),Object.values(hands));
  const source=cold.calculatedHandReceipt!.sourceInventory,coverage=cold.calculatedHandReceipt!.sourceCoverage;
  assert.deepEqual(source.owners.map(o=>[o.id,o.pitch,o.startTick,o.durationTicks]),original.source.notes.map(n=>[n.id,n.pitch.octave*12+n.pitch.pitchClass,n.startTick,n.durationTicks]).sort((a,b)=>String(a[0])<String(b[0])?-1:1));
  assert.equal(source.silences.length,1);assert.equal(source.silences[0].source.voice,'melody');
  assert.equal(coverage.silences[0].disposition,'visible');assert.ok(coverage.silences[0].paint[0].ids.length);
  assert.deepEqual(q.r.layouts[0].beams[0].notes.map(n=>n.id),['gesture-0','gesture-1','gesture-2']);
  assert.deepEqual(q.r.layouts[0].beams[0].stems.map(s=>s.direction),hand==='LH'?[1,-1,1]:[-1,1,-1]);
  assert.equal(coverage.gestures[0].memberIds.length,3);assert.equal(coverage.gestures[0].edgeIds.length,4);
  assert.equal(annotationPositions(cold).size,cold.seats.length);assert.equal(fingerDisplayAvailable(cold,initialPersonal(cold),'annotations'),true);
  const replacementUnavailable={...cold,fingerEligibility:{eligible:false}};
  assert.equal(annotationPositions(replacementUnavailable).size,cold.seats.length,'optional replacement failure does not remove annotations');
  const retained=await ensurePianoReady({packageBytes:q.bytes,layout,intent:'read-retained'});assert.equal(retained.status,'editable');assert.deepEqual(retained.packageBytes,q.bytes);
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
test('finger-only constraints stay separate from operator hand requirements and same-hand changed fingers require fresh coherent preparation',async()=>{
 const original=await sourcePackage(transferStudy()),hands={'gesture-0':'LH','gesture-1':'RH','gesture-2':'LH','melody-entrance':'RH'} as const,
  q=await calculatedStudy(original.p,'conventional-piano',hands),a=q.p.fingerLayer!.attacks[0],owner=a.owners[0],finger=a.finger===3?4:3,
  extra={ownerId:owner.id,guard:{pitch:a.pitch,startTick:a.startTick,durationTicks:owner.durationTicks},finger,provenance:{kind:'operator-choice' as const,reference:'Explicit finger-only comparison'}},
  next=await calculatedStudy(q.p,'conventional-piano',hands,[extra]),inputs=await calculatedHandInputs(next.p,next.p.fingerLayer!,'calculate',next.p.renderingRecipe! as ScoreRenderingRecipe,[extra]);
 assert.deepEqual(inputs.operatorRequirements,[]);assert.deepEqual(q.p.score.notes.map(n=>n.hand),next.p.score.notes.map(n=>n.hand));
 assert.notEqual(q.p.score.performingHandPresentation!.assignmentId,next.p.score.performingHandPresentation!.assignmentId);
 assert.equal(next.p.fingerLayer!.attacks[0].finger,finger);
 await assert.rejects(importPackage(await repinned(q.p,f=>{f['fingers.json']=next.p.files['fingers.json'];})),/identity|finger|request|Derived/);
 const seat=q.p.seats.find(s=>s.ownerIds.includes(owner.id))!,personal=corrected(q.p,initialPersonal(q.p),seat,finger),
  request={packageBytes:q.bytes,layout:'conventional-piano' as const,personal,forceRecalculate:true,maxExpansions:200_000},fresh=await ensurePianoReady(request);
 assert.equal(fresh.status,'editable','message' in fresh?fresh.message:undefined);if(fresh.status!=='editable')return;
 assert.deepEqual(fresh.package.score.notes.map(n=>n.hand),q.p.score.notes.map(n=>n.hand));
 assert.notEqual(fresh.package.score.performingHandPresentation!.assignmentId,q.p.score.performingHandPresentation!.assignmentId);
 assert.equal(fingerFor(fresh.package,fresh.personal!,fresh.package.seats.find(s=>s.ownerIds.includes(owner.id))!),finger);
 await admitPianoRequestResult(request,fresh.package,fresh.packageBytes,fresh.layer,fresh.personal);
});
test('new contexts prepare detached complete derived editions while each keyboard keeps its own exact saved clock and pages in either order',async()=>{
 for(const first of ['janko-four-row','conventional-piano'] as const){const second:PhysicalKeyboardId=first==='janko-four-row'?'conventional-piano':'janko-four-row',source=transferStudy(),initialTempo=source.referencePerformanceTempo!;delete source.referencePerformanceTempo;
  const original=await sourcePackage(source),withClock=await importPackage(await preparePianoCalculationContext(original.p,{version:'piano-calculation-context-v1',sourceSha256:original.p.sourceSha256!,referencePerformanceTempo:initialTempo})),
   hands={'gesture-0':'LH','gesture-1':'RH','gesture-2':'LH','melody-entrance':'RH'} as const,a=await calculatedStudy(withClock,first,hands),b=await calculatedStudy(a.p,second,hands),
   referenceTempo={...initialTempo,bpm:91},request={packageBytes:b.bytes,layout:second,referenceTempo,maxExpansions:200_000},fresh=await ensurePianoReady(request);
  assert.equal(fresh.status,'editable','message' in fresh?fresh.message:undefined);if(fresh.status!=='editable')continue;
  assert.deepEqual(fresh.package.score.notes.map(n=>n.hand),b.p.score.notes.map(n=>n.hand));
  assert.notEqual(fresh.package.score.performingHandPresentation!.assignmentId,b.p.score.performingHandPresentation!.assignmentId);
  assert.equal(fresh.package.score.referencePerformanceTempo!.bpm,91);assert.equal(fresh.package.calculationContext!.referencePerformanceTempo.bpm,91);
  const companion=await selectPresentation(fresh.package,first);
  assert.equal(companion.calculationContext!.referencePerformanceTempo.bpm,90);assert.equal(companion.score.referencePerformanceTempo!.bpm,90);
  assert.deepEqual(companion.pages,a.p.pages);assert.deepEqual(companion.fingerLayer,a.p.fingerLayer);assert.equal(companion.preparationIdentity!.sha256,a.p.preparationIdentity!.sha256);
  const alternateAssembly=await importPackage(await packagePianoPresentation(companion,{layoutId:first,sourceSha256:companion.sourceSha256!,score:JSON.stringify(companion.score),seats:JSON.stringify(companion.seats),pages:companion.pages,
   layer:companion.fingerLayer!,effectiveHandSha256:companion.effectiveHandSha256!,engineVersion:companion.manifest.engineVersion,recipe:companion.renderingRecipe,
   calculatedHandReceipt:companion.calculatedHandReceipt,preparationRequest:{handPolicy:'calculate',maxExpansions:200_000}}));
  assert.equal(alternateAssembly.calculationContext!.referencePerformanceTempo.bpm,90,'omitted payload context keeps the caller selected view, even when publication opens another primary');
  assert.equal((await selectPresentation(alternateAssembly,second)).calculationContext!.referencePerformanceTempo.bpm,91);
  for(const layout of [first,second]){const retained=await ensurePianoReady({packageBytes:fresh.packageBytes,layout,intent:'read-retained'});assert.equal(retained.status,'editable');assert.deepEqual(retained.packageBytes,fresh.packageBytes);}
  await admitPianoRequestResult(request,fresh.package,fresh.packageBytes,fresh.layer,fresh.personal);
  await assert.rejects(admitPianoRequestResult({...request,referenceTempo:{...referenceTempo,bpm:92}},fresh.package,fresh.packageBytes,fresh.layer,fresh.personal),/another calculation context/);
  const retainedRequest={packageBytes:fresh.packageBytes,layout:second,intent:'read-retained' as const,referenceTempo:{...referenceTempo,bpm:92}};
  await assert.rejects(admitPianoRequestResult(retainedRequest,fresh.package,fresh.packageBytes,fresh.layer,fresh.personal),/requested saved calculation context/,'exact old bytes cannot satisfy an explicit different-clock read request');
  const m=structuredClone(fresh.package.collectionManifest!),files={...fresh.package.files};delete files['manifest.json'];m.calculationContext={...m.calculationContext!,referencePerformanceTempo:{...referenceTempo,bpm:92}};
  await assert.rejects(importPackage(archivePackage(m,files)),/primary presentation differs/,'primary/root clock affiliation cannot silently disagree');
 }
});
test('repeat visits, unequal-release aliases and written holds keep original obligations and matching page-boundary seats on both keyboards',async()=>{
 for(const layout of ['conventional-piano','janko-four-row'] as const){const source=boundaryStudy(),original=await sourcePackage(source,{measuresPerSystem:1,systemsPerPage:1,pageWidth:240}),
  hands=Object.fromEntries(source.notes.map(n=>[n.id,n.id==='edge-a'?'RH':n.hand])),q=await calculatedStudy(original.p,layout,hands),inventory=q.p.calculatedHandReceipt!.sourceInventory,
  short=inventory.owners.find(o=>o.id==='short-release')!,long=inventory.owners.find(o=>o.id==='long-release')!;
  assert.equal(q.p.pages.length,2);assert.equal(inventory.occurrences.length,4);assert.equal(inventory.owners.reduce((n,o)=>n+o.performedVisits!.length,0),14);
  assert.deepEqual(short.performedVisits!.map(v=>[v.startTick,v.releaseTick]),[[192,264],[480,552]]);
  assert.deepEqual(long.performedVisits!.map(v=>[v.startTick,v.releaseTick]),[[192,288],[480,576]]);
  const holdSeats=q.p.seats.filter(s=>s.ownerIds.includes('held'));assert.equal(holdSeats.length,2);assert.notEqual(holdSeats[0].page,holdSeats[1].page);assert.equal(holdSeats[1].continuation,true);assert.equal(holdSeats[0].actionId,holdSeats[1].actionId);
  for(const id of ['short-release','long-release']){const seat=q.p.seats.find(s=>s.ownerIds.includes(id))!;assert.equal(seat.ownerIds.length,1);assert.equal(seat.page,1);assert.equal(seat.actionId,'192:61');}
  const gesture=q.p.calculatedHandReceipt!.sourceCoverage.gestures.find(g=>g.memberIds.length===4)!;
  assert.equal(gesture.fragments.length,2);assert.ok(gesture.fragments[0].outgoingEdgeIds.length);assert.ok(gesture.fragments[1].incomingEdgeIds.length);
  const annotations=annotationPositions(q.p);assert.equal(annotations.size,q.p.seats.length);
  for(const seat of q.p.seats){const g=q.p.annotationGeometry!.seats.find(g=>g.seatId===seat.id)!,a=annotations.get(seat.id)!;
   assert.ok(g.durationBounds.every(b=>g.hand==='RH'?a.bounds[3]<b.y0:a.bounds[1]>b.y1));}
  await assert.rejects(importPackage(await repinned(q.p,f=>{const s=JSON.parse(strFromU8(f['score.json']));s.notes.find((n:any)=>n.id==='long-release').durationTicks=72;f['score.json']=strToU8(JSON.stringify(s));})),/source|owner|hand|layer/);
 }
});
test('actual all-five replacement failure retains complete fresh long-value annotations and correction seats',async()=>{
 const source=transferStudy();source.id='viewer-authored-long-value';source.title='Long carrier annotation study';source.notes=[{id:'long-carrier',startTick:0,durationTicks:96,hand:'LH',pitch:{octave:4,pitchClass:1}}];source.sourceSilences=[];
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
   hands=Object.fromEntries(source.notes.map(n=>[n.id,n.id==='following-attack'?hand:n.hand])),q=await calculatedStudy(original.p,layout,hands),
   cold=await importPackage(q.bytes,{keyboardLayout:layout}),seats=cold.seats.filter(s=>s.ownerIds.includes('written-hold')),
   components=source.tieChains![0].components;
  assert.equal(cold.pages.length,count-1);assert.equal(seats.length,count);assert.equal(new Set(seats.map(s=>s.page)).size,count-1);
  assert.equal(seats.filter(s=>s.continuation).length,count-1);assert.equal(new Set(seats.map(s=>s.actionId)).size,1);
  assert.equal(cold.score.notes.find(n=>n.id==='written-hold')!.hand,hand);assert.equal(cold.score.notes.find(n=>n.id==='following-attack')!.hand,hand);
  assert.notEqual(source.notes.find(n=>n.id==='following-attack')!.hand,hand);
  for(const [index,l]of q.r.layouts.entries())assert.deepEqual(new Set(l.tieSplitHeadIds),new Set(components.flatMap((c,i)=>
   c.startTick>=index*144&&c.startTick<(index+1)*144?[]:[i?'written-hold~c'+i:'written-hold'])));
  assert.deepEqual(cold.files['source-score.json'],original.p.files['source-score.json']);assert.deepEqual(cold.sourceScore,source);
  assert.equal(annotationPositions(cold).size,cold.seats.length);assert.equal(q.r.lint.violations.length,0);assert.equal(q.r.lint.warnings.length,0);
  const retained=await ensurePianoReady({packageBytes:q.bytes,layout,intent:'read-retained'});assert.equal(retained.status,'editable');assert.deepEqual(retained.packageBytes,q.bytes);
  await assert.rejects(importPackage(await repinned(cold,f=>{const r=JSON.parse(strFromU8(f['hand-presentation.json']));
   const finalSeat=seats.at(-1)!;r.annotationGeometry.seats=r.annotationGeometry.seats.filter((g:any)=>g.seatId!==finalSeat.id);
   f['hand-presentation.json']=strToU8(JSON.stringify(r));})),/actual paint|coverage|geometry/,'matching metadata cannot excuse missing remote carrier coverage');
  assert.equal(await hashBytes(original.bytes),before);
 }
});
test('unresolved independent statements and unsupported literal transfer fits retain original archives and source rather than relaxing admission',async()=>{
 const independent=transferStudy();independent.notes[0].sourceProvenance!.voices.push('independent-second-voice');
 const prior=await sourcePackage(independent),refused=await ensurePianoReady({packageBytes:prior.bytes,layout:'conventional-piano',maxExpansions:200_000});
 assert.equal(refused.status,'unsupported');assert.equal('code' in refused?refused.code:undefined,'hand-presentation:source-coverage');assert.deepEqual(refused.retainedPackageBytes,prior.bytes);
 const source=boundaryStudy(),original=await sourcePackage(source,{measuresPerSystem:1,systemsPerPage:1,pageWidth:320}),before=await hashBytes(original.bytes),
  hands=Object.fromEntries(source.notes.map(n=>[n.id,n.id==='edge-c'?'RH':n.hand]));
 await assert.rejects(calculatedStudy(original.p,'conventional-piano',hands),e=>e instanceof HandPresentationError&&e.code==='unsupported-fit'&&e.ownerIds.includes('edge-c'));
 assert.equal(await hashBytes(original.bytes),before);assert.deepEqual(original.p.sourceScore,source);
});
test('unrepresented calculator grace actions refuse before handing off a layer and preserve original host ownership, source and archive',async()=>{
 const source=transferStudy();source.graceGroups=[{id:'viewer-grace',source:{file:'viewer-authored.musicxml',line:2,column:1,endLine:2,endColumn:3,bar:2},voice:'melody',staff:'upper',printedStaff:'upper',hand:'RH',kind:'grace',
  members:[{id:'grace-pitch',pitch:{octave:5,pitchClass:7},duration:'1/8',beamStart:false,beamEnd:false,line:2,column:1,endLine:2,endColumn:2}],hostEventId:'melody-entrance-event',hostKind:'note',
  occurrences:[{id:'viewer-grace-visit',sourceBar:2,pass:1,tick:144,hostNoteIds:['melody-entrance']}]}];
 const prior=await sourcePackage(source),before=await hashBytes(prior.bytes),result=await ensurePianoReady({packageBytes:prior.bytes,layout:'conventional-piano'});
 assert.equal(result.status,'unsupported');assert.equal('code' in result?result.code:undefined,'grace-actions');assert.deepEqual(result.retainedPackageBytes,prior.bytes);
 await assert.rejects(calculatedStudy(prior.p,'conventional-piano',{'gesture-0':'LH','gesture-1':'LH','gesture-2':'LH','melody-entrance':'LH'}),/outside the current piano assignment domain/);
 assert.deepEqual(prior.p.sourceScore!.graceGroups![0].occurrences[0].hostNoteIds,['melody-entrance']);
 assert.equal(await hashBytes(prior.bytes),before);assert.deepEqual(prior.p.sourceScore,source);
});
