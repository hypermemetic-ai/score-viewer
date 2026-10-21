import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {importPackage} from '../src/package';
import {interpretTempoMarking,sourceScoreTempo,resolveScoreTempo,readOwnerScoreTempo,readPracticeGoal,ownerScoreTempo,withOwnerScoreTempo,stepTempo,tempoOnBeat,wholeTempoOnBeat,auditionStartTempo,countedBeat,scoreTempoOriginText,playingTimeLabel} from '../src/score-tempo';
import {referenceFixture} from './support/reference-score';

const quarter={numerator:1,denominator:4},dottedQuarter={numerator:3,denominator:8},half={numerator:1,denominator:2};
const url=new URL('../fixtures/schumann-op68-no14.tuna',import.meta.url);
const unmarked=await importPackage(readFileSync(url),{allowLegacyTempo:true}),referenced=await referenceFixture(url);
const score=(over:Record<string,unknown>={})=>({ticksPerBeat:48,timeSignatures:[{tick:0,numerator:2,denominator:4}],tempos:[],sourceBarTicks:[0,24,120,216],...over}) as Parameters<typeof sourceScoreTempo>[0];

test('tempo words in four languages are read on the counted beat',()=>{
 assert.equal(interpretTempoMarking('Nicht schnell',quarter)!.bpm,76);
 assert.equal(interpretTempoMarking('Andante',quarter)!.bpm,80);
 assert.equal(interpretTempoMarking('Allegro con brio',quarter)!.bpm,132);
 assert.equal(interpretTempoMarking('Langsam, mit inniger Empfindung',quarter)!.bpm,60);
 assert.equal(interpretTempoMarking('Mäßig',quarter)!.bpm,96);
 assert.equal(interpretTempoMarking('Massig',quarter)!.bpm,96);
 assert.equal(interpretTempoMarking('Lebhaft',quarter)!.bpm,144);
 assert.equal(interpretTempoMarking('Modéré',quarter)!.bpm,100);
 assert.equal(interpretTempoMarking('Lively',quarter)!.bpm,144);
 // At one place the longest phrase wins: not too fast is not fast.
 assert.equal(interpretTempoMarking('Nicht zu schnell',quarter)!.bpm,112);
 assert.equal(interpretTempoMarking('Allegretto',quarter)!.bpm,112);
 // Compound and alla breve meters count slower, shorter beats faster, by one rule.
 assert.equal(interpretTempoMarking('Allegro',dottedQuarter)!.bpm,103);
 assert.equal(interpretTempoMarking('Allegro',half)!.bpm,87);
 assert.equal(interpretTempoMarking('Andante',{numerator:1,denominator:8})!.bpm,121);
 assert.equal(interpretTempoMarking('Allegro',dottedQuarter)!.marking,'Allegro');
});
test('modifiers move a word away from or toward a moderate pace',()=>{
 assert.equal(interpretTempoMarking('Molto allegro',quarter)!.bpm,145);
 assert.equal(interpretTempoMarking('Sehr langsam',quarter)!.bpm,55);
 assert.equal(interpretTempoMarking('Poco adagio',quarter)!.bpm,69);
 assert.equal(interpretTempoMarking('Allegro ma non troppo',quarter)!.bpm,122);
 assert.equal(interpretTempoMarking('Etwas lebhaft',quarter)!.bpm,137);
});
test('the first tempo word governs; later words qualify it',()=>{
 const cases:[string,number][]=[
  // Modifiers after the word.
  ['Allegro molto',145],['Allegro assai',145],['Adagio molto',60],['Allegro di molto',145],['Allegro non molto',122],
  // The earliest word, not the longest anywhere.
  ['Andante, quasi allegretto',96],['Lent et grave',56],['Lebhaft, nicht zu schnell',133],['Langsam, nicht schleppend',60],
  ['Andante sostenuto',80],['Allegro moderato',116],['Très lent',46],['Nicht schnell',76],
 ];
 for(const [text,bpm] of cases)assert.equal(interpretTempoMarking(text,quarter)?.bpm,bpm,text);
});
test('words that are not tempo words give nothing',()=>{
 // Character words say how to play, not how fast.
 for(const text of ['Simile','dolce','Leise und sehr egal zu spielen.','Léger et très égal','espressivo','rit.','Fine','dolce e tranquillo','sempre sostenuto','cantabile'])assert.equal(interpretTempoMarking(text,quarter),undefined,text);
});
test('the score itself: reference, printed mark, encoded rate, opening word',()=>{
 assert.deepEqual(sourceScoreTempo(referenced.score),{bpm:180,beat:dottedQuarter,origin:'reference',confident:true});
 assert.deepEqual(sourceScoreTempo(score({tempos:[{tick:0,bpm:120,sourceUnit:{type:'half',dots:0,perMinute:60}}]})),{bpm:60,beat:half,origin:'metronome',confident:true});
 assert.deepEqual(sourceScoreTempo(score({tempos:[{tick:0,bpm:90,sourceUnit:{type:'quarter',dots:1,perMinute:60},description:'Andante'}]})),{bpm:60,beat:dottedQuarter,origin:'metronome',confident:true,marking:'Andante'});
 assert.deepEqual(sourceScoreTempo(score({tempos:[{tick:0,bpm:96,description:'Allegro'}]})),{bpm:96,beat:quarter,origin:'encoded',confident:true,marking:'Allegro'});
 assert.deepEqual(sourceScoreTempo(score({sourceTexts:[{id:'a',tick:0,text:'Nicht schnell',origin:{}}]})),{bpm:76,beat:quarter,origin:'marking',confident:true,marking:'Nicht schnell'});
 // A bare number may be an encoder's default: only where hearing starts.
 assert.deepEqual(sourceScoreTempo(score({tempos:[{tick:0,bpm:120}]})),{bpm:120,beat:quarter,origin:'encoded',confident:false});
 // Words after the opening are not opening instructions; with a pickup the opening reaches the first full bar's downbeat.
 assert.equal(sourceScoreTempo(score({sourceTexts:[{id:'a',tick:288,text:'Langsamer',origin:{}},{id:'b',tick:48,text:'Andante',origin:{}}]})),undefined);
 assert.equal(sourceScoreTempo(score({sourceTexts:[{id:'b',tick:24,text:'Andante',origin:{}}]}))!.bpm,80);
 assert.equal(sourceScoreTempo(score({sourceBarTicks:[0,96,192],sourceTexts:[{id:'b',tick:96,text:'Andante',origin:{}}]})),undefined);
 // A printed metronome mark at the opening wins over a word at the same place.
 assert.deepEqual(sourceScoreTempo(score({tempos:[{tick:0,bpm:132,description:'Allegro'},{tick:0,bpm:100,sourceUnit:{type:'quarter',dots:0,perMinute:100}}]})),{bpm:100,beat:quarter,origin:'metronome',confident:true,marking:'Allegro'});
 assert.deepEqual(sourceScoreTempo(score({tempos:[{tick:0,bpm:100,sourceUnit:{type:'quarter',dots:0,perMinute:100}}],sourceTexts:[{id:'a',tick:0,text:'Allegro',origin:{}}]})),{bpm:100,beat:quarter,origin:'metronome',confident:true});
 // Character words alone do not make a confident tempo.
 assert.equal(sourceScoreTempo(score({sourceTexts:[{id:'a',tick:0,text:'dolce e tranquillo',origin:{}}]})),undefined);
 // The Schumann fixture without its reference says only how to play, not how fast.
 assert.equal(unmarked.score.referencePerformanceTempo,undefined);
 assert.equal(sourceScoreTempo(unmarked.score),undefined);
 assert.equal(resolveScoreTempo(unmarked.score),undefined);
});
test('the piece tempo: yours first, then the score, then your practice goal; practice keeps its own goal',()=>{
 const s=score({sourceTexts:[{id:'a',tick:0,text:'Nicht schnell',origin:{}}]});
 const goal={version:'personal-performance-goal-v1',bpm:80,beat:quarter};
 // What the score says is the piece tempo; the practice goal stays practice's.
 assert.deepEqual(resolveScoreTempo(s,{practiceGoal:goal}),{bpm:76,beat:quarter,origin:'marking',confident:true,marking:'Nicht schnell'});
 // A score that says nothing sounds at the practice goal.
 assert.deepEqual(resolveScoreTempo(score(),{practiceGoal:goal}),{bpm:80,beat:quarter,origin:'practice',confident:true});
 assert.deepEqual(resolveScoreTempo(score({tempos:[{tick:0,bpm:120}]}),{practiceGoal:goal}),{bpm:80,beat:quarter,origin:'practice',confident:true});
 // Reading practice's saved tempo is a practice goal too.
 assert.deepEqual(readPracticeGoal({version:'reference-performance-tempo-v1',bpm:90,beat:{numerator:2,denominator:8},provenance:{}}),{bpm:90,beat:quarter});
 assert.equal(readPracticeGoal({version:'other',bpm:90,beat:quarter}),undefined);
 const mine=ownerScoreTempo(72,quarter,'2026-10-21T00:00:00.000Z');
 assert.deepEqual(resolveScoreTempo(s,{tempo:mine,practiceGoal:goal}),{bpm:72,beat:quarter,origin:'yours',confident:true});
 assert.equal(readOwnerScoreTempo({version:'owner-score-tempo-v1',bpm:'fast',beat:quarter,setAt:'x'}),undefined);
 assert.equal(resolveScoreTempo(s,{tempo:{bpm:72}})!.origin,'marking');
 assert.deepEqual(readOwnerScoreTempo({...mine,beat:{numerator:2,denominator:8}})!.beat,quarter);
 assert.throws(()=>ownerScoreTempo(4,quarter),/5 to 500/);
});
test('setting a tempo adds one entry and keeps every other preference',()=>{
 const preferences={version:1,piano:{version:1,enabled:false,volume:.9,latencyTier:0},lastWorkedEntryId:'a',scoreTempos:{other:{version:'owner-score-tempo-v1',bpm:60,beat:quarter,setAt:'t'}}};
 const before=JSON.stringify(preferences),record=ownerScoreTempo(88,quarter,'t2'),next=withOwnerScoreTempo(preferences,'mine',record);
 assert.equal(JSON.stringify(preferences),before);
 assert.deepEqual(next,{...preferences,scoreTempos:{...preferences.scoreTempos,mine:record}});
 const bare:{version:number;scoreTempos?:Record<string,unknown>}={version:1};assert.deepEqual(withOwnerScoreTempo(bare,'x',record),{version:1,scoreTempos:{x:record}});
});
test('the metronome scale steps and beat conversion',()=>{
 assert.equal(stepTempo(76,1),80);assert.equal(stepTempo(76,-1),72);assert.equal(stepTempo(77,1),80);assert.equal(stepTempo(77,-1),76);
 assert.equal(stepTempo(60,1),63);assert.equal(stepTempo(208,1),216);assert.equal(stepTempo(20,-1),20);assert.equal(stepTempo(300,1),304);
 assert.equal(tempoOnBeat(88,quarter,dottedQuarter).toFixed(3),'58.667');
 assert.equal(tempoOnBeat(60,half,quarter),120);
 assert.deepEqual(countedBeat(unmarked.score),dottedQuarter);
 assert.equal(auditionStartTempo(unmarked.score),63);
 assert.equal(auditionStartTempo(referenced.score,sourceScoreTempo(referenced.score)),180);
 assert.equal(auditionStartTempo(score(),{bpm:60,beat:half,origin:'metronome',confident:true}),120);
 // A tempo counted on another beat is a whole number a metronome shows: ♩=100 in 6/8 is ♩.=67, not 66.66667.
 assert.equal(wholeTempoOnBeat(100,quarter,dottedQuarter),67);
 assert.equal(auditionStartTempo(unmarked.score,{bpm:100,beat:quarter,origin:'yours',confident:true}),67);
});
test('origins and playing time read as facts',()=>{
 assert.equal(scoreTempoOriginText({bpm:76,beat:quarter,origin:'marking',confident:true,marking:'Nicht schnell'}),'From “Nicht schnell”');
 assert.equal(scoreTempoOriginText({bpm:72,beat:quarter,origin:'yours',confident:true}),'Set by you');
 assert.equal(scoreTempoOriginText({bpm:80,beat:quarter,origin:'practice',confident:true}),'From your practice goal');
 assert.equal(scoreTempoOriginText(undefined),'This score doesn’t say how fast it goes.');
 assert.equal(playingTimeLabel(70.9),'1:11');assert.equal(playingTimeLabel(3599.6),'60:00');assert.equal(playingTimeLabel(5),'0:05');
});
