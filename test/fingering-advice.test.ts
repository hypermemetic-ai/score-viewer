import test from 'node:test';
import assert from 'node:assert/strict';
import {rrFrontThirdContact,createTravelCorpus,type TravelCorpus,type TravelCorpusObservation} from '@hypermemetic-ai/fingering-editor-assistance';
import {buildAdviceContacts,scoreAdviceContacts,analyzeEditorAdvice,analyzeEditorAdviceAsync,createAdviceCorpusState,readAdviceCorpusState,replaceAdviceCorpusScore,EditorAdviceRunner,type AdvicePerformedAttack,type AdviceContext,type AdviceRevision} from '../src/fingering-advice';
import {DEFAULT_FINGERING_ADVICE_SETTINGS,readFingeringAdviceSettings,adviceThresholdFromInput,fingeringAdviceOptionsMarkup} from '../src/fingering-advice-settings';
import {layoutAdviceMarkers,selectedAdviceExplanations,adviceMarkerSvg} from '../src/fingering-advice-markers';
import type {ScorePackage} from '../src/package';
import {referenceFixture} from './support/reference-score';

const contact=(midi:number,row:number)=>{const c=rrFrontThirdContact(midi,row);assert.ok(c.available);return c.contact;};
const assignments=[{id:'a',hand:'LH' as const,finger:2},{id:'b',hand:'LH' as const,finger:2}];
const context:AdviceContext={playerId:'player',scoreId:'piece',revision:1,evidenceByOwner:new Map([['a',{lineageId:'a-decision',evidence:'personal'}],['b',{lineageId:'b-decision',evidence:'personal'}]])};
const attacks:AdvicePerformedAttack[]=[{id:'a1',ownerIds:['a'],midiPitch:55,onsetTick:1992,durationTicks:24,contact:contact(55,3)},
 {id:'b1',ownerIds:['b'],midiPitch:54,onsetTick:2040,durationTicks:24,contact:contact(54,2)}];
const clock={millisecondsAt:(tick:number)=>tick/48*60000/270};
const analyze=()=>analyzeEditorAdvice(buildAdviceContacts(attacks,assignments,clock),context);
function fixture():ScorePackage {
 return {score:{id:'score',totalTicks:48,ticksPerBeat:48,sourceBarTicks:[0,48],barlines:[],notes:[
  {eventKind:'pitched',id:'a',pitch:{octave:3,pitchClass:7},startTick:0,durationTicks:24,hand:'LH'},
  {eventKind:'pitched',id:'b',pitch:{octave:3,pitchClass:6},startTick:24,durationTicks:24,hand:'LH'}],
  referencePerformanceTempo:{version:'reference-performance-tempo-v1',bpm:180,beat:{numerator:3,denominator:8},provenance:{kind:'editorial',reference:'reference'}}},
  seats:[],keyboardLayout:'janko-four-row',fingerLayer:{physicalRowOrder:'rr-even-far-last-v1',attacks:[
   {id:'aa',pitch:43,row:3,hand:'LH',finger:2,owners:[{id:'a'}]},
   {id:'bb',pitch:42,row:2,hand:'LH',finger:2,owners:[{id:'b'}]}]}} as unknown as ScorePackage;
}

test('reference travel uses public fixed geometry, duration and dotted-quarter performance tempo',()=>{
 const result=analyze();assert.equal(result.warnings.length,1);const t=result.analysis.transitions[0];
 assert.ok(Math.abs(t.distanceMm-40.5021741529)<1e-9);assert.ok(Math.abs(t.speedMps!-.2916156539)<1e-9);
 assert.equal(t.releaseProvenance,'ordinary-75-percent');assert.deepEqual(result.warnings[0].reasons,['fast']);
 const p=fixture(),contacts=scoreAdviceContacts(p,assignments);
 assert.equal(contacts[0].onsetMs,0);assert.ok(Math.abs(contacts[1].onsetMs!-111.11111111111111)<1e-9);
 assert.deepEqual(contacts[0].contact,contact(55,3),'source pitch offsets become actual MIDI');
});

test('missing assignment/contact/timing remains a barrier instead of connecting through unknown notes',()=>{
 for(const gap of [{id:'x',ownerIds:['x'],midiPitch:55,onsetTick:2020,durationTicks:1,contact:contact(55,3)},
  {id:'x',ownerIds:['a'],midiPitch:55,onsetTick:2020,durationTicks:1},
  {id:'x',ownerIds:['a'],midiPitch:55,contact:contact(55,3)}]){
  const result=analyzeEditorAdvice(buildAdviceContacts([attacks[0],gap,attacks[1]],assignments,clock),context);
  assert.equal(result.analysis.transitions.length,0);assert.equal(result.analysis.gaps.length,1);
 }
 const p=fixture();delete p.score.referencePerformanceTempo;
 const contacts=scoreAdviceContacts(p,assignments);assert.equal(contacts.length,2);assert.equal(contacts[1].onsetMs,undefined);
});

test('explicit physical hold floor causes a distinct unavailable-time reason without infinity',()=>{
 const contacts=buildAdviceContacts([{...attacks[0],physicalHoldUntilTick:2040},attacks[1]],assignments,clock),result=analyzeEditorAdvice(contacts,context);
 assert.equal(result.analysis.transitions[0].releaseProvenance,'physical-hold-floor');assert.equal(result.analysis.transitions[0].speedMps,null);
 assert.deepEqual(result.warnings[0].reasons,['no-available-time']);assert.equal(result.observations.length,0);
 const disabled=analyzeEditorAdvice(contacts,context,createTravelCorpus(),{...DEFAULT_FINGERING_ADVICE_SETTINGS,absoluteEnabled:false});assert.equal(disabled.warnings.length,0);
});

test('complete repeated visits include transitions across a repeat jump and retain written selection owners',()=>{
 const p=fixture();p.score.writtenPresentation={sourceScoreId:'source',sourceHash:'hash',writtenBars:1,performedBars:2,performedTotalTicks:96,repeats:[{startBar:1,endBar:1,times:2}],
  occurrences:[{performedBar:1,writtenBar:1,pass:1,performedTick:0,writtenTick:0},{performedBar:2,writtenBar:1,pass:2,performedTick:48,writtenTick:0}],events:{notes:[
   {writtenIndex:0,performedIndex:0,overrides:{id:'a1',startTick:0}},
   {writtenIndex:1,performedIndex:1,overrides:{id:'b1',startTick:24}},
   {writtenIndex:0,performedIndex:2,overrides:{id:'a2',startTick:48}},
   {writtenIndex:1,performedIndex:3,overrides:{id:'b2',startTick:72}}]}};
 const contacts=scoreAdviceContacts(p,assignments),result=analyzeEditorAdvice(contacts,context);
 assert.equal(contacts.length,4);assert.equal(new Set(contacts.map(c=>c.id)).size,4);assert.equal(result.analysis.transitions.length,3);
 assert.deepEqual(result.analysis.transitions[1].sourceOwnerIds,['b']);assert.deepEqual(result.analysis.transitions[1].targetOwnerIds,['a']);
 p.score.writtenPresentation.events.notes.pop();assert.throws(()=>scoreAdviceContacts(p,assignments),/omits or duplicates/);
});

test('independent coincident owners conflict; admitted physical aliases merge with the longer sounding hold',()=>{
 const p=fixture();p.score.notes.push({...p.score.notes[0],id:'duplicate',durationTicks:12});
 p.fingerLayer!.attacks.push({...p.fingerLayer!.attacks[0],id:'dup',owners:[{id:'duplicate',durationTicks:12,releaseTick:12}]});
 const all=[...assignments,{id:'duplicate',hand:'LH' as const,finger:2}];
 const independent=analyzeEditorAdvice(scoreAdviceContacts(p,all),context);
 assert.equal(independent.analysis.gaps.filter(g=>g.reason==='simultaneous-finger-conflict').length,2);assert.equal(independent.analysis.transitions.length,0);
 p.seats=[{id:'s',page:0,system:0,ownerIds:['a','duplicate'],contactId:'shared',actionId:'aa',x:10,baseline:20,fontSize:10,pitchDigit:'1',writtenBar:1}];
 const aliased=analyzeEditorAdvice(scoreAdviceContacts(p,all),context);
 assert.equal(aliased.analysis.deduplicatedAliases,1);assert.equal(aliased.analysis.transitions.length,1);
 assert.deepEqual(aliased.analysis.transitions[0].sourceOwnerIds,['a','duplicate']);
});

test('alternate endings use explicit performed occurrence order rather than repeat shorthand',()=>{
 const p=fixture();p.score.totalTicks=96;p.score.sourceBarTicks=[0,48,96];p.score.notes[1].startTick=48;
 p.score.writtenPresentation={sourceScoreId:'source',sourceHash:'hash',writtenBars:2,performedBars:3,performedTotalTicks:144,repeats:[],
  occurrences:[1,1,2].map((writtenBar,i)=>({performedBar:i+1,writtenBar,pass:i+1,performedTick:i*48,writtenTick:(writtenBar-1)*48})),events:{notes:[0,0,1].map((writtenIndex,i)=>({writtenIndex,performedIndex:i,overrides:{id:`visit${i}`,startTick:i*48}}))}};
 const contacts=scoreAdviceContacts(p,assignments);assert.deepEqual(contacts.map(c=>c.ownerIds),[['a'],['a'],['b']]);assert.equal(analyzeEditorAdvice(contacts,context).analysis.transitions.length,2);
});

test('real Schumann projection covers every performed written owner and does not mutate its source',async()=>{
 const p=await referenceFixture(new URL('../fixtures/schumann-op68-no14.isoscore',import.meta.url)),before=JSON.stringify(p.score);
 const assigned=p.score.notes.map(n=>({id:n.id,hand:n.hand,finger:p.fingerLayer?.attacks.find(a=>a.owners.some(o=>o.id===n.id))?.finger}));
 const contacts=scoreAdviceContacts(p,assigned);assert.equal(contacts.length,p.score.writtenPresentation!.events.notes.length);
 assert.equal(new Set(contacts.map(c=>c.id)).size,contacts.length);assert.equal(JSON.stringify(p.score),before);
 assert.ok(contacts.every(c=>Number.isFinite(c.onsetMs)));assert.ok(contacts.length>381);
});

test('conventional, unknown row order and out-of-range keys do not acquire invented millimetre geometry',()=>{
 const p=fixture();p.keyboardLayout='conventional-piano';assert.equal(scoreAdviceContacts(p,assignments)[0].contact,undefined);
 p.keyboardLayout='janko-four-row';p.fingerLayer!.physicalRowOrder='historical-even-front-v1';assert.equal(scoreAdviceContacts(p,assignments)[0].contact,undefined);
 p.fingerLayer!.physicalRowOrder='rr-even-far-last-v1';assert.equal(scoreAdviceContacts(p,assignments,{instrumentMidiRange:[60,100]})[0].contact,undefined);
 p.keyboardLayout='conventional-piano';const actual={...contact(55,3),keyboardId:'conventional-piano',profileId:'measured',profileHash:'hash'};
 assert.deepEqual(scoreAdviceContacts(p,assignments,{contactForOwner:()=>actual})[0].contact,actual);
});

function corpusSamples(count:number):TravelCorpus {
 const sample=analyze().observations[0];return {version:'finger-travel-corpus-v1',observations:Array.from({length:count},(_,i)=>({...sample,occurrenceId:`other-${i}`,transitionId:`t${i}`,lineageId:`independent-${i}`,speedMps:.1}))};
}
test('unusual advice needs twenty compatible independent lineages and excludes copies, self and opposite movement',()=>{
 const contacts=buildAdviceContacts(attacks,assignments,clock),nineteen=corpusSamples(19),template=nineteen.observations[0];
 const extras:TravelCorpusObservation[]=[{...template,occurrenceId:'copy',transitionId:'copy'},
  {...template,occurrenceId:'own',transitionId:'own',lineageId:'b-decision'},
  {...template,occurrenceId:'inherited',transitionId:'inherited',lineageId:'inherited',evidence:'inherited'},
  {...template,occurrenceId:'opposite',transitionId:'opposite',lineageId:'opposite',displacementMm:template.displacementMm.map(v=>-v) as unknown as TravelCorpusObservation['displacementMm']}];
 const lacking=analyzeEditorAdvice(contacts,context,{...nineteen,observations:[...nineteen.observations,...extras]});
 assert.deepEqual(lacking.warnings[0].reasons,['fast']);assert.equal(lacking.warnings[0].unusual?.independentSamples,19);
 const enough=analyzeEditorAdvice(contacts,context,corpusSamples(20));assert.deepEqual(enough.warnings[0].reasons,['fast','unusual']);
 const personalOnly=analyzeEditorAdvice(contacts,context,corpusSamples(20),{...DEFAULT_FINGERING_ADVICE_SETTINGS,absoluteEnabled:false});assert.deepEqual(personalOnly.warnings[0].reasons,['unusual']);
 const absoluteOnly=analyzeEditorAdvice(contacts,context,corpusSamples(20),{...DEFAULT_FINGERING_ADVICE_SETTINGS,unusualEnabled:false});assert.deepEqual(absoluteOnly.warnings[0].reasons,['fast']);
});

test('unknown or inherited authorship never creates an independent personal observation',()=>{
 const contacts=buildAdviceContacts(attacks,assignments,clock);
 const unknown=analyzeEditorAdvice(contacts,{...context,evidenceByOwner:new Map([['b',context.evidenceByOwner.get('b')!]])});assert.equal(unknown.observations[0].evidence,'unreviewed-calculated');
 const inherited=analyzeEditorAdvice(contacts,{...context,evidenceByOwner:new Map([...context.evidenceByOwner,['b',{lineageId:'b-decision',evidence:'inherited'}]])});
 assert.equal(inherited.observations[0].evidence,'inherited');assert.equal(inherited.observations[0].lineageId,'b-decision');
});

test('replacement removes invalidated adjacent transitions and cannot resurrect stale deleted evidence',()=>{
 const result=analyze(),first=replaceAdviceCorpusScore(createAdviceCorpusState(),'player','piece',1,result.observations);
 assert.equal(first.corpus.observations.length,1);
 const removed=replaceAdviceCorpusScore(first,'player','piece',2,[]);assert.equal(removed.corpus.observations.length,0);
 assert.deepEqual(readAdviceCorpusState(JSON.parse(JSON.stringify(first))),first);
 assert.throws(()=>readAdviceCorpusState({...first,scoreRevisions:{}}),/revision differs/);
 assert.throws(()=>replaceAdviceCorpusScore(removed,'player','piece',1,result.observations),/Stale/);
 assert.throws(()=>replaceAdviceCorpusScore(removed,'player','other',3,result.observations),/identity/);
});

test('background comparisons yield before publishing and cancel during their first comparison batch',async()=>{
 const contacts=buildAdviceContacts(attacks,assignments,clock),corpus=corpusSamples(20),controller=new AbortController();
 const pending=analyzeEditorAdviceAsync(contacts,context,corpus,DEFAULT_FINGERING_ADVICE_SETTINGS,controller.signal);controller.abort();
 await assert.rejects(pending,{name:'AbortError'});
 const result=await analyzeEditorAdviceAsync(contacts,context,corpus,DEFAULT_FINGERING_ADVICE_SETTINGS,new AbortController().signal);
 assert.deepEqual(result,analyzeEditorAdvice(contacts,context,corpus));
});

test('late advice cannot appear after a new revision, leaving editor, or a cancelled failure',async()=>{
 const delivered:unknown[]=[],runner=new EditorAdviceRunner((result,revision)=>delivered.push([result,revision]));
 const revision:AdviceRevision={scoreId:'score',sourceRevision:'source',assignmentRevision:'1',settingsRevision:'1'};
 let finish!:(result:ReturnType<typeof analyze>)=>void;
 const pending=runner.run(revision,()=>new Promise(resolve=>{finish=resolve;}));
 const current={...revision,assignmentRevision:'2'};await runner.run(current,async()=>analyze());
 finish(analyze());assert.equal(await pending,false);assert.equal((delivered.at(-1) as any[])[1].assignmentRevision,'2');
 runner.cancel();assert.equal((delivered.at(-1) as any[])[0],undefined);
 let reject!:(error:Error)=>void;const failing=runner.run(revision,()=>new Promise((_resolve,no)=>{reject=no;}));runner.cancel();reject(Error('late'));assert.equal(await failing,false);
});

test('markers remain beside their rendered owners outside ink, with explanation on either transition endpoint',()=>{
 const result=analyze(),owners=[{ownerIds:['b'],page:0,bounds:{x:40,y:40,width:10,height:15}}],ink=[owners[0].bounds],viewport={x:0,y:0,width:100,height:100};
 const markers=layoutAdviceMarkers(result,'edit',0,owners,ink,viewport);assert.equal(markers.length,1);assert.ok(markers[0].x>50);
 assert.equal(layoutAdviceMarkers(result,'practice',0,owners,ink,viewport).length,0);assert.equal(layoutAdviceMarkers(result,'read',0,owners,ink,viewport).length,0);
 assert.equal(layoutAdviceMarkers(result,'edit',0,owners,[viewport],viewport).length,0,'no distant fallback');
 assert.match(selectedAdviceExplanations(result,'edit',['a'],ids=>`Measure ${ids[0]}`)[0],/Measure a → Measure b/);
 assert.deepEqual(selectedAdviceExplanations(result,'practice',['b']),[]);
 markers[0].label='a < b & "c"';assert.match(adviceMarkerSvg(markers),/a &lt; b &amp; &quot;c&quot;/);
});

test('preference defaults and independent settings round trip; invalid threshold drafts never become values',()=>{
 assert.deepEqual(readFingeringAdviceSettings(undefined),DEFAULT_FINGERING_ADVICE_SETTINGS);
 const value={...DEFAULT_FINGERING_ADVICE_SETTINGS,absoluteEnabled:false,absoluteThresholdCmPerSecond:31.5};assert.deepEqual(readFingeringAdviceSettings(JSON.parse(JSON.stringify(value))),value);
 for(const input of ['', '0','-1','Infinity','NaN','1e9','0x20'])assert.equal(adviceThresholdFromInput(input),undefined);
 assert.equal(adviceThresholdFromInput(' 25.5 '),25.5);assert.equal(adviceThresholdFromInput('.5'),.5);
 for(const n of [0,-1,NaN,Infinity])assert.throws(()=>readFingeringAdviceSettings({...value,absoluteThresholdCmPerSecond:n}),/Invalid/);
 const markup=fingeringAdviceOptionsMarkup(value);assert.match(markup,/cm\/s/);assert.match(markup,/manual-tempo/);assert.match(markup,/readonly/);assert.match(markup,/Unusual for you/);
});
