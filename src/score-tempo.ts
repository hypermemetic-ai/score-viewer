import type {QuantizedGridScore as ScoreModel} from '../vendor/iso-notation/src/model/types';
import {scoreBeatUnit} from './player-tempo';

/* A score's performance tempo: how fast the piece goes, so features can know how
 * long things take to play. It is resolved from what the score and the player
 * already say and is never written into the score file:
 *   1. the tempo you set (owner state in preferences.json, keyed by library entry);
 *   2. your practice tempo (the practice journal's goal; read only, never changed here);
 *   3. the edition's reference performance tempo;
 *   4. a printed metronome mark in the source;
 *   5. a number the source file encodes beside a tempo word;
 *   6. an opening tempo word interpreted from the marking table below.
 * Anything else is not confident: the player hears the piece and sets it. */

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
 ['tempo di minuetto',112],['tempo di menuetto',112],['alla marcia',112],['comodo',100],['tempo giusto',108],['maestoso',72],['tranquillo',72],['sostenuto',66],
 // German
 ['langsam',60],['getragen',56],['breit',56],['ruhig',72],['gemachlich',88],['gehend',84],['massig',96],['maessig',96],['bewegt',120],['lebhaft',144],
 ['frisch',132],['munter',138],['rasch',160],['schnell',160],['geschwind',160],['eilig',172],
 ['nicht schnell',76],['nicht zu schnell',112],['nicht langsam',100],['nicht zu langsam',76],['massig bewegt',104],['maessig bewegt',104],['im zeitmass',96],
 // French
 ['lent',56],['tres lent',46],['modere',100],['allant',100],['anime',132],['gai',132],['vif',150],['vite',160],
 ['pas trop lent',72],['pas trop vite',120],['sans lenteur',96],['pas vite',76],['sans hate',84],
 // English
 ['slow',60],['slowly',60],['moderate',100],['moderately',100],['with motion',112],['lively',144],['brisk',138],['quick',152],['quickly',152],['fast',160],
 ['not fast',76],['not too fast',112],['not slow',100],['not too slow',76],['walking',84],['at a walking pace',84],['steady',100],['steadily',100],
];
// A word just before the marking moves it away from (or toward) a moderate pace.
const INTENSIFY=['molto','assai','sehr','tres','very','ganz','recht'],SOFTEN=['poco','un poco','etwas','ziemlich','un peu','assez','a little','somewhat','rather','fairly'];
const RESTRAIN=['ma non troppo','non troppo','ma non tanto','non tanto','doch nicht zu','aber nicht zu','mais pas trop','but not too'];
const MODERATE=108;
const normalize=(text:string)=>` ${text.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replaceAll('ß','ss').replace(/[^a-z]+/g,' ').trim()} `;
const NORMALIZED=MARKINGS.map(([phrase,rate])=>[normalize(phrase),rate] as const).sort((a,b)=>b[0].length-a[0].length);

/** Faster counted beats for shorter beats, but not proportionally: one rule for every meter. */
function feltRate(quarterRate:number,beat:Beat):number {return quarterRate*Math.pow(.25/beatWholes(beat),.6);}

/** Interpret an opening tempo word, counted on the score's beat; undefined when it is not a tempo word. */
export function interpretTempoMarking(text:string,beat:Beat):{bpm:number;beat:Beat;marking:string}|undefined {
 const words=normalize(text);
 const hit=NORMALIZED.find(([phrase])=>words.includes(phrase));if(!hit)return;
 const [phrase,base]=hit,at=words.indexOf(phrase),before=words.slice(0,at+1),after=words.slice(at+phrase.length-1);
 const fast=base>MODERATE,away=fast?1.1:1/1.1,toward=fast?1/1.05:1.05;
 let rate=base;
 if(INTENSIFY.some(word=>before.endsWith(` ${word} `)))rate*=away;
 else if(SOFTEN.some(word=>before.endsWith(` ${word} `)))rate*=toward;
 if(RESTRAIN.some(words=>after.includes(` ${words} `)))rate*=fast?1/1.08:1.08;
 return {bpm:Math.round(feltRate(rate,beat)),beat,marking:text.trim()};
}

const UNIT_WHOLES:Record<string,number>={breve:2,whole:1,half:1/2,quarter:1/4,eighth:1/8,'16th':1/16,'32nd':1/32,'64th':1/64};
function markBeat(unit:{type:string;dots:number}):Beat|undefined {
 const base=UNIT_WHOLES[unit.type];if(base===undefined||!Number.isSafeInteger(unit.dots)||unit.dots<0||unit.dots>2)return;
 const wholes=base*(2-Math.pow(.5,unit.dots)),denominator=Math.round(1/base)*Math.pow(2,unit.dots)||1;
 return canonicalBeat({numerator:Math.round(wholes*denominator),denominator});
}
/** Source ticks before the first written barline: where an opening instruction lives. */
function openingEnd(score:TempoScore):number {
 const bars=score.sourceBarTicks;if(bars&&bars.length>1)return bars[1];
 const meter=score.timeSignatures[0];return meter?score.ticksPerBeat*4*meter.numerator/meter.denominator:score.ticksPerBeat*4;
}
/** What the score itself says about its tempo, without any player state. */
export function sourceScoreTempo(score:TempoScore):ScoreTempo|undefined {
 const reference=score.referencePerformanceTempo;
 if(reference&&validRate(reference.bpm)&&validBeat(reference.beat))return {bpm:reference.bpm,beat:canonicalBeat(reference.beat),origin:'reference',confident:true};
 const opening=openingEnd(score),first=[...(score.tempos??[])].filter(t=>t.tick<opening).sort((a,b)=>a.tick-b.tick)[0];
 const unit=first?.sourceUnit&&markBeat(first.sourceUnit);
 if(first&&unit&&validRate(first.sourceUnit!.perMinute))return {bpm:first.sourceUnit!.perMinute,beat:unit,origin:'metronome',confident:true,...(first.description?{marking:first.description}:{})};
 let beat:Beat;try{beat=countedBeat(score);}catch{return;}
 // MusicXML sound tempo counts quarter notes per minute.
 if(first&&validRate(first.bpm)&&first.description?.trim())return {bpm:first.bpm,beat:{numerator:1,denominator:4},origin:'encoded',confident:true,marking:first.description.trim()};
 const words=[first?.description,score.performingInstruction?.text,score.performingInstruction?.encodingText,
  ...(score.sourceTexts??[]).filter(t=>t.tick<opening).sort((a,b)=>a.tick-b.tick).map(t=>t.text)].filter((t):t is string=>!!t?.trim());
 for(const text of words){const found=interpretTempoMarking(text,beat);if(found)return {...found,origin:'marking',confident:true};}
 // A bare number with no unit or word may be an encoder's default: only a starting point.
 if(first&&validRate(first.bpm))return {bpm:first.bpm,beat:{numerator:1,denominator:4},origin:'encoded',confident:false};
}
/** The score's performance tempo, owner choices first. */
export function resolveScoreTempo(score:TempoScore,owner?:{tempo?:unknown;practiceGoal?:unknown}):ScoreTempo|undefined {
 const yours=readOwnerScoreTempo(owner?.tempo);
 if(yours)return {bpm:yours.bpm,beat:yours.beat,origin:'yours',confident:true};
 const goal=owner?.practiceGoal as {version?:unknown;bpm?:unknown;beat?:unknown}|undefined;
 if(goal&&goal.version==='personal-performance-goal-v1'&&validRate(goal.bpm)&&validBeat(goal.beat))return {bpm:goal.bpm,beat:canonicalBeat(goal.beat),origin:'practice',confident:true};
 return sourceScoreTempo(score);
}
/** Where the hear-and-set flow starts: the known tempo on the counted beat, else a moderate pace. */
export function auditionStartTempo(score:TempoScore,tempo?:ScoreTempo):number {
 const beat=countedBeat(score),bpm=tempo?tempoOnBeat(tempo.bpm,tempo.beat,beat):nearestScaleTempo(feltRate(80,beat));
 return Math.min(MAX_SCORE_TEMPO,Math.max(MIN_SCORE_TEMPO,Math.round(bpm*100)/100));
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
  case 'practice':return 'Your practice tempo';
  case 'reference':return 'This edition’s reference tempo';
  case 'metronome':return words?`Metronome mark in the score · ${words}`:'Metronome mark in the score';
  case 'encoded':return tempo.confident?`${words}, as the score file plays it`:'A number in the score file, without a marking';
  case 'marking':return `From ${words}`;
  default:return 'This score doesn’t say how fast it goes.';
 }
}
/** Minutes and seconds, rounded to the second. */
export function playingTimeLabel(seconds:number):string {
 if(!Number.isFinite(seconds)||seconds<0)return '';
 const total=Math.round(seconds),m=Math.floor(total/60),s=total%60;
 return `${m}:${String(s).padStart(2,'0')}`;
}
