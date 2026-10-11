import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceFixture} from './support/reference-score';
import {planPractice,initialPractice,readPractice,passageHierarchy,reconcilePassages,progressFor,wholePracticeProgress,resetProgress} from '../src/practice';
import {PracticeDone,toggleDone,hasDone,attainedRate,measuredRate} from '../src/practice-attainment';
import {displayedPracticeProgress,displayedPracticeTotal} from '../src/practice-display';
import {PracticeBrowser} from '../src/practice-browser';
import {equivalentPracticeClaims} from '../src/practice-equivalence';
const original=await referenceFixture(new URL('../vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.isoscore',import.meta.url));
const legacyPlan=(p:Parameters<typeof planPractice>[0])=>planPractice(p,'connection-boundary-v1');
const target=(c:{id:string;pattern:string},rate=180)=>({passage:c.id,pattern:c.pattern,rate});
/** Repeated units retain the actual admitted No14 canonical events/voices. */
function repeated(order:number[]){
 const pkg=structuredClone(original),source=original.score,size=576;
 pkg.score.notes=order.flatMap((unit,i)=>source.notes.filter(n=>n.startTick>=unit*size&&n.startTick<(unit+1)*size).map(n=>({...structuredClone(n),id:`copy-${i}:${n.id}`,startTick:n.startTick+(i-unit)*size})));
 pkg.score.sourceSilences=order.flatMap((unit,i)=>(source.sourceSilences??[]).filter(n=>n.startTick>=unit*size&&n.startTick<(unit+1)*size).map(n=>({...structuredClone(n),startTick:n.startTick+(i-unit)*size,bar:n.bar+4*(i-unit)})));
 pkg.score.phrases=order.flatMap((unit,i)=>(source.phrases??[]).filter(n=>n.startTick>=unit*size&&n.endTick<=(unit+1)*size).map(n=>({...structuredClone(n),id:`copy-${i}:${n.id}`,startTick:n.startTick+(i-unit)*size,endTick:n.endTick+(i-unit)*size})));
 pkg.score.tieChains=[];pkg.score.totalTicks=size*order.length;pkg.score.sourceBarTicks=Array.from({length:order.length*4+1},(_,i)=>144*i);pkg.score.timeSignatures=[{tick:0,numerator:3,denominator:8}];pkg.score.writtenPresentation=undefined;
 return pkg;
}
function aliases(plan:ReturnType<typeof planPractice>,state:ReturnType<typeof initialPractice>,id:string){const c=passageHierarchy(plan,state).all.get(id)!;return equivalentPracticeClaims(state,target(c)).map(t=>t.passage).sort();}

test('actual No14 source repeated leaves share reversible manual evidence without granting fresh loop eligibility',()=>{
 const plan=legacyPlan(original),state=initialPractice(plan),a=plan.chunks[0],b=plan.chunks[4],done=new PracticeDone();
 done.completed(target(a));assert.equal(done.canToggle(state,target(b)),false);
 assert.equal(done.toggle(state,target(a),true,1,180)?.marked,true);
 assert.equal(progressFor(b,state),1);assert.equal(hasDone(state,target(b)),true);
 assert.equal(displayedPracticeProgress(b,state,false),0);assert.deepEqual(state.best,{});
 const reopened=readPractice(JSON.parse(JSON.stringify(state)),plan),before=JSON.stringify(reopened.best);
 assert.equal(progressFor(b,reopened),1);assert.equal(new PracticeDone().toggle(reopened,target(b),true,1,180)?.marked,false);
 assert.equal(progressFor(a,reopened),0);assert.equal(progressFor(b,reopened),0);assert.equal(JSON.stringify(reopened.best),before);
});

test('actual No14 identical ordered joined runs share earned evidence, not dissimilar leaf averages',()=>{
 const plan=legacyPlan(original),state=initialPractice(plan);
 state.composites={'1-8':['1-4','5-8'],'17-24':['17-20','21-24']};
 let tree=passageHierarchy(plan,state),a=tree.all.get('1-8')!,b=tree.all.get('17-24')!;
 for(const c of plan.chunks.slice(0,2))toggleDone(state,target(c));
 assert.equal(progressFor(a,state),0);assert.equal(progressFor(b,state),0);
 toggleDone(state,target(a));assert.equal(progressFor(b,state),1);assert.equal(displayedPracticeProgress(b,state,false),0);
 state.best[a.pattern]=90;assert.equal(displayedPracticeProgress(b,state,false),.5);
 const saved=JSON.stringify(state),loaded=readPractice(JSON.parse(saved),plan);assert.equal(progressFor(b,loaded),1);
 toggleDone(loaded,target(b));assert.equal(attainedRate(loaded,a.pattern,a.id),90);assert.equal(attainedRate(loaded,b.pattern,b.id),90);
 assert.equal(state.best[a.pattern],90);assert.equal(JSON.stringify(state),saved);
});

test('identical-unit supersets share completion while written playback and persistence retain their full range',()=>{
 const plan=legacyPlan(repeated([0,0,0,0])),state=initialPractice(plan),a=plan.chunks[0];
 toggleDone(state,target(a));const rawClaims=JSON.stringify(state.manualAttainment),tree=reconcilePassages(plan,state),parent=tree.all.get('1-16')!;
 assert.equal(parent.end-parent.start,2304);assert.equal(parent.components?.length,2);
 assert.equal(progressFor(parent,state),1);assert.equal(wholePracticeProgress(plan,state),1);
 assert.equal(displayedPracticeProgress(parent,state,false),0);assert.equal(displayedPracticeTotal(plan,state),1);
 assert.equal(JSON.stringify(state.manualAttainment),rawClaims);assert.deepEqual(state.best,{});
 state.best[a.pattern]=75;assert.equal(measuredRate(state,parent.pattern,parent.id),75);
 toggleDone(state,target(parent));assert.equal(progressFor(a,state),.475);assert.equal(progressFor(parent,state),.475);assert.equal(state.best[a.pattern],75);
 resetProgress(parent,state);assert.deepEqual(state.best,{});
});

test('exact repeated AB parent structure shares its run while AB, BA and unequal structure remain distinct',()=>{
 const plan=legacyPlan(repeated([0,1,0,1,1,0])),state=initialPractice(plan);
 state.composites={'1-8':['1-4','5-8'],'9-16':['9-12','13-16'],'1-16':['1-8','9-16'],'17-24':['17-20','21-24']};
 const tree=passageHierarchy(plan,state),ab=tree.all.get('1-8')!,abab=tree.all.get('1-16')!,ba=tree.all.get('17-24')!;
 assert.deepEqual(aliases(plan,state,ab.id),['1-16','1-8','9-16']);
 toggleDone(state,target(ab));assert.equal(progressFor(abab,state),1);assert.equal(progressFor(ba,state),0);assert.equal(progressFor(plan.chunks[0],state),0);
});

test('musical multiplicity, hands, rhythm, carry, rests and bar boundaries cannot grant equivalent superset completion',()=>{
 for(const change of ['pitch','hand','duration','multiplicity','rest','meter','carry'] as const){
  const pkg=repeated([0,0]),start=576,n=pkg.score.notes.find(n=>n.startTick===start)!;
  if(change==='pitch'&&'pitch' in n)n.pitch.pitchClass=(n.pitch.pitchClass+1)%12;
  if(change==='hand')n.hand=n.hand==='LH'?'RH':'LH';
  if(change==='duration')n.durationTicks+=1;
  if(change==='multiplicity')pkg.score.notes.push({...structuredClone(n),id:'extra-unison'});
  if(change==='rest')pkg.score.sourceSilences![1].durationTicks+=1;
  if(change==='meter')pkg.score.timeSignatures.push({tick:start,numerator:6,denominator:16});
  if(change==='carry')pkg.score.notes.find(n=>n.startTick<start)!.durationTicks=600;
  const plan=planPractice(pkg,'fixed-four-v1'),state=initialPractice(plan);state.composites={'1-8':['1-4','5-8']};
  const parent=passageHierarchy(plan,state).all.get('1-8')!;toggleDone(state,target(plan.chunks[0]));assert.equal(progressFor(parent,state),0,change);
 }
});

test('equivalent Done undo removes only the chosen self-reported rate and preserves measured provenance and other rates',()=>{
 const plan=legacyPlan(repeated([0,0])),state=initialPractice(plan),a=plan.chunks[0],b=plan.chunks[1];
 // Retained historical duplicate keys are read, not rewritten on load.
 state.manualAttainment={version:1,marks:{[JSON.stringify([a.id,a.pattern])]:[80,90],[JSON.stringify([b.id,b.pattern])]:[80]}};
 state.best[a.pattern]=70;state.composites={'1-8':['1-4','5-8']};const saved=JSON.stringify(state),loaded=readPractice(JSON.parse(saved),plan),tree=reconcilePassages(plan,loaded),parent=tree.all.get('1-8')!;
 toggleDone(loaded,target(parent,80));assert.equal(hasDone(loaded,target(a,80)),false);assert.equal(hasDone(loaded,target(b,80)),false);
 assert.equal(hasDone(loaded,target(a,90)),true);assert.equal(measuredRate(loaded,parent.pattern,parent.id),70);assert.equal(JSON.stringify(state),saved);
 const otherReference={...plan,referencePerformanceTempo:{...plan.referencePerformanceTempo!,beat:{numerator:1,denominator:4}}};
 assert.throws(()=>readPractice(JSON.parse(saved),otherReference),/clock beat differs/);
});

test('chooser clone projections bind their full tree to original evidence without persisting aliases',()=>{
 const plan=legacyPlan(repeated([0,0])),state=initialPractice(plan);toggleDone(state,target(plan.chunks[0]));
 const browser=new PracticeBrowser(plan),before=JSON.stringify(state);browser.select(state,'1-8');const parent=browser.current(state)!;
 assert.equal(parent.id,'1-8');assert.equal(browser.progress(parent,state),1);browser.setIncludeManual(false);assert.equal(browser.progress(parent,state),0);
 assert.equal(JSON.stringify(state),before);
});

test('a genuinely measured repeated parent remains measured when reused at its identical unit',()=>{
 const plan=legacyPlan(repeated([0,0])),state=initialPractice(plan);state.composites={'1-8':['1-4','5-8']};
 const parent=passageHierarchy(plan,state).all.get('1-8')!;state.best[parent.pattern]=180;
 const raw=JSON.stringify(state),loaded=readPractice(JSON.parse(raw),plan);
 assert.equal(measuredRate(loaded,plan.chunks[0].pattern,plan.chunks[0].id),180);
 assert.equal(displayedPracticeProgress(plan.chunks[1],loaded,false),1);assert.equal(displayedPracticeTotal(plan,loaded,false),1);
 assert.equal(loaded.manualAttainment,undefined);assert.equal(JSON.stringify(state),raw);
});

test('changed plan clocks, pitches or reference cannot retain an earlier derived equivalence lookup',()=>{
 for(const change of ['clock','pitch','reference'] as const){
  const plan=legacyPlan(repeated([0,0])),state=initialPractice(plan);state.composites={'1-8':['1-4','5-8']};
  const parent=passageHierarchy(plan,state).all.get('1-8')!;toggleDone(state,target(plan.chunks[0]));assert.equal(progressFor(parent,state),1);
  if(change==='clock')plan.barPhaseTicks![0]+=1;
  if(change==='pitch')plan.attacks[0].midi+=1;
  if(change==='reference')plan.referencePerformanceTempo!.bpm+=1;
  passageHierarchy(plan,state);assert.equal(progressFor(parent,state),0,change);
 }
});

test('derived claim lookup is immutable and an equivalent numeric beat never depends on object key order',()=>{
 const plan=legacyPlan(repeated([0,0])),state=initialPractice(plan);state.referenceBeat={denominator:8,numerator:3};state.composites={'1-8':['1-4','5-8']};
 const parent=passageHierarchy(plan,state).all.get('1-8')!,claims=equivalentPracticeClaims(state,target(parent));
 assert.equal(Object.isFrozen(claims),true);assert.equal(Object.isFrozen(claims[0]),true);
 assert.throws(()=>{(claims as Array<{passage:string;pattern:string}>).push({passage:'forged',pattern:'forged'});});
 toggleDone(state,target(plan.chunks[0]));assert.equal(progressFor(parent,state),1);
});

test('heterogeneous parent association is preserved rather than flattened into an unordered component bag',()=>{
 const plan=legacyPlan(repeated([0,1,2,0,1,2])),state=initialPractice(plan);
 state.composites={'1-8':['1-4','5-8'],'1-12':['1-8','9-12'],'17-24':['17-20','21-24'],'13-24':['13-16','17-24']};
 const tree=passageHierarchy(plan,state),left=tree.all.get('1-12')!,right=tree.all.get('13-24')!;
 toggleDone(state,target(left));assert.equal(progressFor(left,state),1);assert.equal(progressFor(right,state),0);
});

test('chooser key and render each derive one fresh tree without rewriting earned evidence',t=>{
 const plan=legacyPlan(repeated([0,0])),state=initialPractice(plan);state.best[plan.chunks[0].pattern]=state.target;
 const browser=new PracticeBrowser(plan),raw=JSON.stringify(state),owned=browser as any,derive=owned.tree;let calls=0;
 owned.tree=function(value:typeof state){calls++;return derive.call(this,value);};
 assert.equal(browser.key('ArrowDown',state),'handled');assert.equal(calls,1);
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:{activeElement:undefined}});
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'document',previous);else delete(globalThis as any).document;});
 const preview={querySelector:()=>null,querySelectorAll:()=>[]},root={style:{setProperty(){}},querySelectorAll:()=>[],querySelector:()=>preview,innerHTML:''};
 calls=0;browser.render(root as any,state,()=>{throw Error('joined passage must not request a leaf preview');});assert.equal(calls,1);
 assert.match(root.innerHTML,/Measures 1 – 8 · 100%/);assert.equal(measuredRate(state,`connected:${plan.revision}:1-8`,'1-8'),state.target);assert.equal(JSON.stringify(state),raw);
});

test('a later chooser operation rechecks source mutations, current evidence and a prior refusal',()=>{
 const plan=legacyPlan(repeated([0,0])),state=initialPractice(plan),a=plan.chunks[0],browser=new PracticeBrowser(plan);
 state.composites={'1-8':['1-4','5-8']};const parent=passageHierarchy(plan,state).all.get('1-8')!;
 state.best[a.pattern]=state.target;browser.key('ArrowDown',state);assert.equal(measuredRate(state,parent.pattern,parent.id),state.target);
 delete state.best[a.pattern];browser.key('ArrowUp',state);assert.equal(measuredRate(state,parent.pattern,parent.id),0);
 state.best[a.pattern]=state.target;browser.key('ArrowDown',state);assert.equal(measuredRate(state,parent.pattern,parent.id),state.target);
 plan.attacks[0].midi+=1;browser.key('ArrowUp',state);assert.equal(measuredRate(state,parent.pattern,parent.id),0);
 plan.attacks[0].midi-=1;browser.key('ArrowDown',state);assert.equal(measuredRate(state,parent.pattern,parent.id),state.target);
 const prior=state.composites;state.composites={'1-8':['missing','5-8']};assert.throws(()=>browser.key('ArrowUp',state),/Practice component differs/);
 state.composites=prior;assert.equal(browser.key('ArrowDown',state),'handled');assert.equal(measuredRate(state,parent.pattern,parent.id),state.target);
});
