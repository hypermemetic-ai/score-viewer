import {validateReferencePerformanceTempo,type ReferencePerformanceTempo} from '../vendor/iso-notation/src/model/reference-performance-tempo';
import type {TimeSignatureOverlay} from '../vendor/iso-notation/src/model/types';

/** A piano score without a reference performance tempo practises against the
 * player's own tempo. It is never presented as the score's tempo. */
export const PLAYER_TEMPO_REFERENCE='Player-set practice tempo in Score Viewer; this score has no reference performance tempo.';
type Beat=ReferencePerformanceTempo['beat'];
interface TempoSource {referencePerformanceTempo?:unknown;timeSignatures:readonly Pick<TimeSignatureOverlay,'numerator'|'denominator'>[]}

/** The opening meter's counted beat, the same beat the count-in clicks:
 * dotted in compound meters, otherwise the meter's denominator. */
export function scoreBeatUnit(score:TempoSource):Beat {
 const meter=score.timeSignatures[0];
 if(!meter||!Number.isSafeInteger(meter.numerator)||!Number.isSafeInteger(meter.denominator)||meter.numerator<=0||meter.denominator<=0)throw Error('This score needs a meter before you can set a tempo.');
 const compound=meter.denominator>=8&&meter.numerator>3&&meter.numerator%3===0;
 return playerTempoValue({numerator:compound?3:1,denominator:meter.denominator},60).beat;
}
function playerTempoValue(beat:Beat,bpm:number):ReferencePerformanceTempo {
 if(!Number.isFinite(bpm)||bpm<5||bpm>500)throw Error('Choose a tempo from 5 to 500 per minute.');
 return validateReferencePerformanceTempo({version:'reference-performance-tempo-v1',bpm,beat,provenance:{kind:'editorial',reference:PLAYER_TEMPO_REFERENCE}});
}
/** The player's tempo for a score without a reference; undefined when the score has one. */
export function playerTempo(score:TempoSource,bpm:number):ReferencePerformanceTempo|undefined {
 return score.referencePerformanceTempo===undefined?playerTempoValue(scoreBeatUnit(score),bpm):undefined;
}
/** The first remembered tempo among practice journals or carried preferences.
 * A tempo counted on another beat is refused; the journal stays unchanged. */
export function savedPlayerTempo(score:TempoSource,...sources:unknown[]):ReferencePerformanceTempo|undefined {
 if(score.referencePerformanceTempo!==undefined)return;
 const beat=scoreBeatUnit(score);
 for(const source of sources){
  const goal=source&&typeof source==='object'?(source as {personalGoal?:unknown}).personalGoal:undefined;
  if(goal===undefined)continue;
  const g=goal as {version?:unknown;bpm?:unknown;beat?:Partial<Beat>};
  if(!g||g.version!=='personal-performance-goal-v1'||typeof g.bpm!=='number'||!g.beat)throw Error('Your saved tempo differs; saved practice retained.');
  const tempo=playerTempoValue(beat,g.bpm),saved=validateReferencePerformanceTempo({...tempo,beat:g.beat}).beat;
  if(saved.numerator!==beat.numerator||saved.denominator!==beat.denominator)throw Error('Your saved tempo counts a different beat; saved practice retained.');
  return tempo;
 }
}
