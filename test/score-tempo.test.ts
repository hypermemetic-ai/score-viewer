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
test('a negation, modifier or restraint belongs to the word it stands beside',()=>{
 const read=(text:string)=>{const r=interpretTempoMarking(text,quarter)!;return r.confident?r.bpm:`${r.bpm}?`;};
 const cases:[string,number|string][]=[
  // A negation or restraint just before a word names a pace of its own, the same for every word that says "fast" or "slow".
  ['Sehr innig und nicht zu rasch',112],['Nicht zu rasch',112],['Nicht rasch',76],['Nicht zu lebhaft',112],['Nicht allzu rasch',112],['Nicht zu geschwind',112],
  ['Nicht schnell',76],['Nicht zu schnell',112],['Nicht langsam',100],['Nicht zu langsam',76],
  ['Not fast',76],['Not too fast',112],['Not too slow',76],['Pas trop lent',76],['Pas trop vite',112],['Pas vite',76],['Non troppo allegro',112],
  // A moderating first word: between the two.
  ['Moderately slow',77],['Mässig langsam',76],['Mäßig schnell',124],['Moderately fast',126],['Mässig bewegt',104],
  // A restraint belongs to the word it follows, and holds back what it names.
  ['Adagio ma non troppo',71],['Lento ma non troppo',56],['Vivace ma non troppo',144],['Lent, pas trop',60],['Langsam, ma non troppo',65],
  ['Lebhaft, doch nicht zu schnell',133],['Lebhaft, doch nicht schnell',133],['Allegro, but not too fast',122],
  // A compound marking: the first section is the opening's.
  ['Adagio – Allegro ma non troppo',66],['Grave – Allegro di molto e con brio',40],['Andante – Allegro',80],
  // What cannot be placed is not confident: hear it and set it.
  ['Adagio, Allegro ma non troppo','66?'],['Nicht zu bewegt','120?'],['Andante, quasi allegretto, ma non troppo','96?'],['Nicht mässig langsam','60?'],
 ];
 for(const [text,bpm] of cases)assert.equal(read(text),bpm,text);
});
test('a sweep of common markings in four languages, including the built-in and owner scores',()=>{
 const read=(text:string)=>{const r=interpretTempoMarking(text,quarter);return !r?undefined:r.confident?r.bpm:`${r.bpm}?`;};
 const cases:[string,number|undefined][]=[
  // Owner and built-in scores: No. 13 says "Nicht schnell"; No. 14 says only how to play.
  ['Nicht schnell',76],['Leise und sehr egal zu spielen.',undefined],
  // Italian
  ['Largo',46],['Lento',52],['Larghetto',60],['Adagio',66],['Adagio sostenuto',66],['Adagio molto',60],['Andante',80],['Andante con moto',80],['Andante cantabile',80],
  ['Andante maestoso',80],['Andantino',88],['Moderato',108],['Moderato cantabile',108],['Allegretto',112],['Allegretto grazioso',112],['Tempo di Menuetto',112],
  ['Allegro moderato',116],['Allegro',132],['Allegro con brio',132],['Allegro vivace',132],['Allegro assai',145],['Molto allegro',145],['Vivace',156],
  ['Presto',180],['Presto agitato',180],['Prestissimo',200],['Maestoso',72],['Tempo giusto',108],['Alla marcia',112],['Introduzione. Adagio',66],
  // German
  ['Langsam',60],['Sehr langsam',55],['Ziemlich langsam',63],['Langsam und mit Ausdruck',60],['Ruhig',72],['Gehend',84],['Mäßig',96],['Mäßig, durchaus energisch',96],
  ['Bewegt',120],['Etwas bewegt',114],['Frisch',132],['Munter',138],['Lebhaft',144],['Etwas lebhaft',137],['Rasch',160],['Schnell',160],
  ['Innig',undefined],['Im Legendenton',undefined],['Mit Humor',undefined],['Kräftig und sehr markiert',undefined],
  // French
  ['Lent',56],['Très lent',46],['Lent et grave',56],['Modéré',100],['Sans lenteur',96],['Animé',132],['Un peu animé',126],['Vif',150],['Assez vif',143],['Cédez',undefined],
  // English
  ['Slowly',60],['Slow and steady',60],['Moderately',100],['Moderate',100],['With motion',112],['Walking pace',84],['Lively',144],['Quickly',152],['Fast',160],
 ];
 for(const [text,bpm] of cases)assert.equal(read(text),bpm,text);
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
 // A reading that cannot be placed only starts hearing: practice's goal, else the reading, not confident.
 const unsure=score({sourceTexts:[{id:'a',tick:0,text:'Adagio, Allegro ma non troppo',origin:{}}]});
 assert.deepEqual(sourceScoreTempo(unsure),{bpm:66,beat:quarter,origin:'marking',confident:false,marking:'Adagio, Allegro ma non troppo'});
 assert.equal(resolveScoreTempo(unsure,{practiceGoal:{version:'personal-performance-goal-v1',bpm:80,beat:quarter}})!.origin,'practice');
 assert.equal(resolveScoreTempo(unsure)!.confident,false);
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
 assert.equal(scoreTempoOriginText({bpm:120,beat:quarter,origin:'marking',confident:false,marking:'Nicht zu bewegt'}),'The score says “Nicht zu bewegt”, which doesn’t settle how fast it goes.');
 assert.equal(scoreTempoOriginText({bpm:80,beat:quarter,origin:'practice',confident:true}),'From your practice goal');
 assert.equal(scoreTempoOriginText(undefined),'This score doesn’t say how fast it goes.');
 assert.equal(playingTimeLabel(70.9),'1:11');assert.equal(playingTimeLabel(3599.6),'60:00');assert.equal(playingTimeLabel(5),'0:05');
});
