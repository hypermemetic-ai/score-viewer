import type {QuantizedGridScore,TimeSignatureOverlay} from '../vendor/iso-notation/src/model/types';

/** A compound metre's beat: three of its written units, so 6/8, 9/8 and 12/8
 * beat in dotted quarters and 6/16 in dotted eighths. Simple metres have none. */
export function compoundPulseTicks(ticksPerBeat:number,meter:Pick<TimeSignatureOverlay,'numerator'|'denominator'>):number|undefined {
 return meter.denominator>=8&&meter.numerator>3&&meter.numerator%3===0?ticksPerBeat*4/meter.denominator*3:undefined;
}

/** The beat lines' pulse, read from the score's own metre: a score in a
 * compound metre draws one line per dotted beat (No. 14's 6/8 one per bar, at
 * the dotted quarter), where the engraving's own pulse is the quarter. A score
 * in simple metre keeps the engraving's pulse. The engraving draws one pulse
 * for the whole score, so a score whose metres beat differently keeps it too. */
export function meterPulseOptions(score:Pick<QuantizedGridScore,'ticksPerBeat'|'timeSignatures'>):{beatPulseTicks?:number} {
 const pulses=new Set((score.timeSignatures??[]).map(m=>compoundPulseTicks(score.ticksPerBeat,m)));
 const [pulse]=pulses;
 return pulses.size===1&&pulse!==undefined&&Number.isSafeInteger(pulse)&&pulse>0?{beatPulseTicks:pulse}:{};
}
