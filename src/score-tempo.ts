import type {QuantizedGridScore as ScoreModel} from '../vendor/iso-notation/src/model/types';
import {scoreBeatUnit} from './player-tempo';

/* A score's performance tempo: how fast the piece goes, so features can know how
 * long things take to play. It is resolved from what the score and the player
 * already say and is never written into the score file:
 *   1. the tempo you set (owner state in preferences.json, keyed by library entry);
 *   2. the edition's reference performance tempo;
 *   3. a printed metronome mark in the source;
 *   4. a number the source file encodes beside a tempo word;
 *   5. an opening tempo word interpreted from the marking table below;
 *   6. your practice goal, when the score says nothing (read only, never changed here).
 * Anything else is not confident: the player hears the piece and sets it.
 * The piece tempo and the practice goal stay distinct: practice keeps its own goal. */

export type Beat={numerator:number;denominator:number};
export type ScoreTempoOrigin='yours'|'practice'|'reference'|'metronome'|'encoded'|'marking'|'unmarked';
export interface ScoreTempo {
 bpm:number;beat:Beat;origin:ScoreTempoOrigin;
 /** Confident tempos are used without asking; others only start the hear-and-set flow. */
 confident:boolean;
 /** The source words the tempo came from, as written. */
 marking?:string;
}
export const OWNER_SCORE_TEMPO_VERSION='owner-score-tempo-v1' as const;
export interface OwnerScoreTempo {version:typeof OWNER_SCORE_TEMPO_VERSION;bpm:number;beat:Beat;setAt:string}
export const MIN_SCORE_TEMPO=20,MAX_SCORE_TEMPO=300;
type TempoScore=Pick<ScoreModel,'timeSignatures'|'tempos'|'ticksPerBeat'>&Partial<Pick<ScoreModel,'sourceTexts'|'performingInstruction'|'sourceBarTicks'|'barlines'|'referencePerformanceTempo'>>;

const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const validBeat=(beat:unknown):beat is Beat=>{const b=beat as Partial<Beat>|undefined;return !!b&&Number.isSafeInteger(b.numerator)&&Number.isSafeInteger(b.denominator)&&b.numerator!>0&&b.denominator!>0;};
const canonicalBeat=(beat:Beat):Beat=>{const d=gcd(beat.numerator,beat.denominator);return {numerator:beat.numerator/d,denominator:beat.denominator/d};};
const beatWholes=(beat:Beat)=>beat.numerator/beat.denominator;
const validRate=(bpm:unknown):bpm is number=>typeof bpm==='number'&&Number.isFinite(bpm)&&bpm>=5&&bpm<=500;

/** The same musical speed counted on another beat. */
export function tempoOnBeat(bpm:number,from:Beat,to:Beat):number {return bpm*beatWholes(from)/beatWholes(to);}

/** The beat the count-in clicks: dotted in compound meters, otherwise the meter's denominator. */
export function countedBeat(score:Pick<ScoreModel,'timeSignatures'>):Beat {return scoreBeatUnit(score);}

/** Owner state is read defensively: an unreadable record is ignored, never repaired or removed. */
export function readOwnerScoreTempo(raw:unknown):OwnerScoreTempo|undefined {
 const r=raw as Partial<OwnerScoreTempo>|undefined;
 if(!r||r.version!==OWNER_SCORE_TEMPO_VERSION||!validRate(r.bpm)||!validBeat(r.beat)||typeof r.setAt!=='string')return;
 return {version:OWNER_SCORE_TEMPO_VERSION,bpm:r.bpm,beat:canonicalBeat(r.beat),setAt:r.setAt};
}
export function ownerScoreTempo(bpm:number,beat:Beat,setAt=new Date().toISOString()):OwnerScoreTempo {
 if(!validRate(bpm)||!validBeat(beat))throw Error('Choose a tempo from 5 to 500 per minute.');
 return {version:OWNER_SCORE_TEMPO_VERSION,bpm,beat:canonicalBeat(beat),setAt};
}
/** Additive preferences field; every other preference stays as saved. */
export function withOwnerScoreTempo<T extends {scoreTempos?:Record<string,unknown>}>(preferences:T,entryId:string,record:OwnerScoreTempo):T {
 return {...preferences,scoreTempos:{...(preferences.scoreTempos??{}),[entryId]:record}};
}

/* Opening tempo words. Each value is a conventional quarter-note rate in a simple
 * meter; the counted beat of other meters is derived by one rule (feltRate). Values
 * are starting points the player can change, not claims about a composer's intent. */
const MARKINGS:readonly (readonly [string,number])[]=[
 // Italian
 ['larghissimo',40],['grave',40],['largo',46],['lento',52],['larghetto',60],['adagio',66],['adagietto',72],['andante',80],['andantino',88],
 ['moderato',108],['allegretto',112],['allegro moderato',116],['allegro',132],['vivace',156],['vivacissimo',172],['presto',180],['prestissimo',200],
 ['tempo di minuetto',112],['tempo di menuetto',112],['alla marcia',112],['comodo',100],['tempo giusto',108],['maestoso',72],
 // German
 ['langsam',60],['getragen',56],['breit',56],['ruhig',72],['gemachlich',88],['gehend',84],['massig',96],['maessig',96],['bewegt',120],['lebhaft',144],
 ['frisch',132],['munter',138],['rasch',160],['schnell',160],['geschwind',160],['eilig',172],['massig bewegt',104],['maessig bewegt',104],['im zeitmass',96],
 // French
 ['lent',56],['tres lent',46],['modere',100],['allant',100],['anime',132],['gai',132],['vif',150],['vite',160],['sans lenteur',96],['sans hate',84],
 // English
 ['slow',60],['slowly',60],['moderate',100],['moderately',100],['with motion',112],['lively',144],['brisk',138],['quick',152],['quickly',152],['fast',160],
 ['walking',84],['at a walking pace',84],['steady',100],['steadily',100],
];
// Character words (dolce, tranquillo, sostenuto, cantabile…) are not in the table: they say how, not how fast.
// A word just before the marking, or molto/assai just after it, moves it away from (or toward) a moderate pace.
const INTENSIFY=['molto','assai','sehr','tres','very','ganz','recht'],AFTER_INTENSIFY=['molto','assai','di molto'];
const SOFTEN=['poco','un poco','etwas','ziemlich','un peu','assez','a little','somewhat','rather','fairly'];
// Just before a word, a negation names the pace the word is not ("Nicht schnell"),
// and a restraint a pace short of it ("Nicht zu rasch"); either is a pace of its own.
const RESTRAIN_BEFORE=['nicht zu','nicht allzu','nicht gar zu','nicht so','not too','not so','not overly','pas trop','pas si','non troppo','non tanto','non molto'];
const NEGATE_BEFORE=['nicht','not','pas','non'];
const NOT_FAST=76,NOT_TOO_FAST=112,NOT_TOO_SLOW=76,NOT_SLOW=100;
// A negation word near a tempo word that is not one of the forms above is not understood.
const NEGATION=['nicht','not','pas','non','ne','kein','keineswegs','never','nie','senza','ohne'];
// Just before another tempo word, these say "moderately …": "Mässig langsam" lies between the two.
const MODIFY=['massig','maessig','moderately'];
// After the marking, a restraint moves it toward a moderate pace: "Lebhaft, nicht zu schnell".
const RESTRAIN=['ma non troppo','non troppo','ma non tanto','non tanto','non molto','nicht zu','pas trop','but not too','not too'];
const MODERATE=108;
const normalize=(text:string)=>` ${text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replaceAll('ß','ss').replace(/[^a-z]+/g,' ').trim()} `;
const NORMALIZED=MARKINGS.map(([phrase,rate])=>[normalize(phrase),rate] as const).sort((a,b)=>b[0].length-a[0].length);

/** Faster counted beats for shorter beats, but not proportionally: one rule for every meter. */
function feltRate(quarterRate:number,beat:Beat):number {return quarterRate*Math.pow(.25/beatWholes(beat),.6);}

type Hit={at:number;end:number;phrase:string;rate:number};
/** Every table phrase in normalised text, earliest first; at one place the longest phrase wins,
 * and a phrase inside a longer one is not read again. */
function phrasesIn(words:string):Hit[] {
 const hits:Hit[]=[];
 for(const [phrase,rate] of NORMALIZED)for(let at=words.indexOf(phrase);at>=0;at=words.indexOf(phrase,at+1))hits.push({at,end:at+phrase.length-1,phrase,rate});
 hits.sort((a,b)=>a.at-b.at||b.phrase.length-a.phrase.length);
 return hits.filter((h,i)=>!hits.slice(0,i).some(o=>o.at<=h.at&&h.end<=o.end));
}
const endsWithWord=(text:string,list:readonly string[])=>list.find(word=>text.endsWith(` ${word} `));
/** The pace a negated or restrained word names, or undefined when the word is too near a moderate pace to say. */
function negatedRate(rate:number,restrained:boolean):number|undefined {
 if(rate>126)return restrained?NOT_TOO_FAST:NOT_FAST;
 if(rate<92)return restrained?Math.max(rate,NOT_TOO_SLOW):NOT_SLOW;
}
/** A dash or semicolon starts another section of a compound marking ("Adagio – Allegro ma
 * non troppo"); the first section that names a tempo is the opening's. */
const sectionsOf=(text:string)=>text.split(/\s*[–—;]\s*|\s+-+\s+/);
/** Interpret an opening tempo word, counted on the score's beat; undefined when it is not a tempo word.
 * The first tempo word governs ("Lent et grave" is lent); later words only qualify it. A reading
 * whose negation, modifier or restraint cannot be placed is not confident: the player hears it and sets it. */
export function interpretTempoMarking(text:string,beat:Beat):{bpm:number;beat:Beat;marking:string;confident:boolean}|undefined {
 for(const section of sectionsOf(text)){
  const reading=readSection(normalize(section));
  if(reading)return {bpm:Math.round(feltRate(reading.rate,beat)),beat,marking:text.trim(),confident:reading.confident};
 }
}
function readSection(words:string):{rate:number;confident:boolean}|undefined {
 let hits=phrasesIn(words);if(!hits.length)return;
 // "Mässig langsam": the first word moderates the next.
 let modifier:Hit|undefined;
 if(hits.length>1&&MODIFY.includes(hits[0].phrase.trim())&&hits[1].at===hits[0].end){modifier=hits[0];hits=hits.slice(1);}
 const governing=hits[0],{at,end}=governing,before=words.slice(modifier?.at??0,at+1),after=words.slice(end);
 const prefix=words.slice(0,(modifier?.at??at)+1),held=endsWithWord(prefix,RESTRAIN_BEFORE),negated=held?undefined:endsWithWord(prefix,NEGATE_BEFORE);
 const fast=governing.rate>MODERATE,away=fast?1.1:1/1.1,toward=fast?1/1.05:1.05;
 if(held||negated){
  if(modifier)return {rate:governing.rate,confident:false};
  const rate=negatedRate(governing.rate,!!held);
  return rate===undefined?{rate:governing.rate,confident:false}:{rate,confident:true};
 }
 // Any other negation just before the word is not understood.
 const near=prefix.trim().split(' ').slice(-3);
 let confident=!near.some(word=>NEGATION.includes(word));
 let rate=modifier?Math.sqrt(modifier.rate*governing.rate):governing.rate;
 if(!modifier&&(INTENSIFY.some(word=>before.endsWith(` ${word} `))||AFTER_INTENSIFY.some(word=>after.startsWith(` ${word} `))))rate*=away;
 else if(!modifier&&SOFTEN.some(word=>before.endsWith(` ${word} `)))rate*=toward;
 // A later restraint, or a later negated tempo word ("Lebhaft, doch nicht schnell"), restrains the
 // word it follows; one that follows another tempo word instead cannot be placed on this one.
 // It holds back what it names ("nicht zu schnell" slower, "nicht zu langsam" faster), else toward a moderate pace.
 const restraints=[...RESTRAIN.flatMap(phrase=>{const i=after.indexOf(` ${phrase} `);return i<0?[]:[{at:end+i,named:hits.find(h=>h.at===end+i+phrase.length+1)}];}),
  ...hits.slice(1).filter(h=>endsWithWord(words.slice(0,h.at+1),NEGATE_BEFORE)).map(h=>({at:h.at-1,named:h}))].sort((x,y)=>x.at-y.at);
 // "Andante, quasi allegretto" sits between the two.
 const quasi=hits.find(h=>h.at>=end&&words.slice(0,h.at+1).endsWith(' quasi '));
 if(quasi)return {rate:(rate+quasi.rate)/2,confident:confident&&!restraints.length};
 const restraint=restraints[0];
 if(restraint){
  if(hits.slice(1).some(h=>h.at<restraint.at))confident=false;
  else rate*=(restraint.named?restraint.named.rate:rate)>MODERATE?1/1.08:1.08;
 }
 return {rate,confident};
}

const UNIT_WHOLES:Record<string,number>={breve:2,whole:1,half:1/2,quarter:1/4,eighth:1/8,'16th':1/16,'32nd':1/32,'64th':1/64};
function markBeat(unit:{type:string;dots:number}):Beat|undefined {
 const base=UNIT_WHOLES[unit.type];if(base===undefined||!Number.isSafeInteger(unit.dots)||unit.dots<0||unit.dots>2)return;
 const wholes=base*(2-Math.pow(.5,unit.dots)),denominator=Math.round(1/base)*Math.pow(2,unit.dots)||1;
 return canonicalBeat({numerator:Math.round(wholes*denominator),denominator});
}
/** Source ticks of the opening, where an opening instruction lives: before the first
 * written barline, or with a pickup, through the first full bar's downbeat. */
function openingEnd(score:TempoScore):number {
 const meter=score.timeSignatures[0],bar=meter?score.ticksPerBeat*4*meter.numerator/meter.denominator:score.ticksPerBeat*4;
 const bars=score.sourceBarTicks;if(!bars||bars.length<2)return bar;
 return bars[1]<bar?bars[1]+1:bars[1];
}
/** What the score itself says about its tempo, without any player state. */
export function sourceScoreTempo(score:TempoScore):ScoreTempo|undefined {
 const reference=score.referencePerformanceTempo;
 if(reference&&validRate(reference.bpm)&&validBeat(reference.beat))return {bpm:reference.bpm,beat:canonicalBeat(reference.beat),origin:'reference',confident:true};
 const opening=openingEnd(score),tempos=[...(score.tempos??[])].filter(t=>t.tick<opening).sort((a,b)=>a.tick-b.tick);
 const wordAt=(tick:number)=>tempos.find(t=>t.tick===tick&&t.description?.trim())?.description?.trim();
 // A printed metronome mark wins over a word at the same place.
 const metronome=tempos.find(t=>t.sourceUnit&&markBeat(t.sourceUnit)&&validRate(t.sourceUnit.perMinute));
 if(metronome){const marking=metronome.description?.trim()||wordAt(metronome.tick);return {bpm:metronome.sourceUnit!.perMinute,beat:markBeat(metronome.sourceUnit!)!,origin:'metronome',confident:true,...(marking?{marking}:{})};}
 let beat:Beat;try{beat=countedBeat(score);}catch{return;}
 // MusicXML sound tempo counts quarter notes per minute.
 const rated=tempos.find(t=>validRate(t.bpm)),ratedWord=rated&&(rated.description?.trim()||wordAt(rated.tick));
 if(rated&&ratedWord)return {bpm:rated.bpm,beat:{numerator:1,denominator:4},origin:'encoded',confident:true,marking:ratedWord};
 const words=[...tempos.map(t=>t.description),score.performingInstruction?.text,score.performingInstruction?.encodingText,
  ...(score.sourceTexts??[]).filter(t=>t.tick<opening).sort((a,b)=>a.tick-b.tick).map(t=>t.text)].filter((t):t is string=>!!t?.trim());
 // The first marking found is the opening's; an uncertain reading only starts hearing.
 for(const text of words){const found=interpretTempoMarking(text,beat);if(found)return {...found,origin:'marking'};}
 // A bare number with no unit or word may be an encoder's default: only a starting point.
 if(rated)return {bpm:rated.bpm,beat:{numerator:1,denominator:4},origin:'encoded',confident:false};
}
/** A practice goal (a journal's personal goal, or reading practice's tempo), read only. */
export function readPracticeGoal(raw:unknown):{bpm:number;beat:Beat}|undefined {
 const goal=raw as {version?:unknown;bpm?:unknown;beat?:unknown}|undefined;
 if(!goal||(goal.version!=='personal-performance-goal-v1'&&goal.version!=='reference-performance-tempo-v1')||!validRate(goal.bpm)||!validBeat(goal.beat))return;
 return {bpm:goal.bpm,beat:canonicalBeat(goal.beat)};
}
/** The piece's performance tempo: yours, then what the score says, then your practice
 * goal when the score says nothing. Practice keeps its own goal either way. */
export function resolveScoreTempo(score:TempoScore,owner?:{tempo?:unknown;practiceGoal?:unknown}):ScoreTempo|undefined {
 const yours=readOwnerScoreTempo(owner?.tempo);
 if(yours)return {bpm:yours.bpm,beat:yours.beat,origin:'yours',confident:true};
 const source=sourceScoreTempo(score);if(source?.confident)return source;
 const goal=readPracticeGoal(owner?.practiceGoal);
 if(goal)return {...goal,origin:'practice',confident:true};
 return source;
}
/** A tempo counted on another beat, as a whole number a metronome shows. */
export function wholeTempoOnBeat(bpm:number,from:Beat,to:Beat):number {return Math.max(5,Math.min(500,Math.round(tempoOnBeat(bpm,from,to))));}
/** Where the hear-and-set flow starts: the known tempo on the counted beat, else a moderate pace. */
export function auditionStartTempo(score:TempoScore,tempo?:ScoreTempo):number {
 const beat=countedBeat(score),bpm=tempo?wholeTempoOnBeat(tempo.bpm,tempo.beat,beat):nearestScaleTempo(feltRate(80,beat));
 return Math.min(MAX_SCORE_TEMPO,Math.max(MIN_SCORE_TEMPO,bpm));
}

/* Maelzel's metronome scale, extended at both ends: the steps pianists already know. */
const SCALE=[...Array.from({length:10},(_,i)=>20+2*i),40,42,44,46,48,50,52,54,56,58,60,63,66,69,72,76,80,84,88,92,96,100,104,108,112,116,120,126,132,138,144,152,160,168,176,184,192,200,208,
 ...Array.from({length:12},(_,i)=>216+8*i)];
const nearestScaleTempo=(bpm:number)=>SCALE.reduce((best,v)=>Math.abs(v-bpm)<Math.abs(best-bpm)?v:best,SCALE[0]);
/** The next metronome-scale tempo in the given direction. */
export function stepTempo(bpm:number,direction:1|-1):number {
 const next=direction>0?SCALE.find(v=>v>bpm+1e-9):[...SCALE].reverse().find(v=>v<bpm-1e-9);
 return next??(direction>0?SCALE.at(-1)!:SCALE[0]);
}

export function scoreTempoOriginText(tempo:ScoreTempo|undefined):string {
 if(!tempo)return 'This score doesn’t say how fast it goes.';
 const words=tempo.marking?`“${tempo.marking}”`:'';
 switch(tempo.origin){
  case 'yours':return 'Set by you';
  case 'practice':return 'From your practice goal';
  case 'reference':return 'This edition’s reference tempo';
  case 'metronome':return words?`Metronome mark in the score · ${words}`:'Metronome mark in the score';
  case 'encoded':return tempo.confident?`${words}, as the score file plays it`:'A number in the score file, without a marking';
  case 'marking':return tempo.confident?`From ${words}`:`The score says ${words}, which doesn’t settle how fast it goes.`;
  default:return 'This score doesn’t say how fast it goes.';
 }
}
/** Minutes and seconds, rounded to the second. */
export function playingTimeLabel(seconds:number):string {
 if(!Number.isFinite(seconds)||seconds<0)return '';
 const total=Math.round(seconds),m=Math.floor(total/60),s=total%60;
 return `${m}:${String(s).padStart(2,'0')}`;
}
