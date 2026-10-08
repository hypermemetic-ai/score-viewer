import type {ReferencePerformanceTempo} from '../vendor/iso-notation/src/model/reference-performance-tempo';
import {URTEXT_FLAGS_UP} from '../vendor/iso-notation/src/render/janko/elements/urtext-paths';
import {hollowStemSvg,HOLLOW_STEM_STROKE,HOLLOW_STEM_HALF_WIDTH,HOLLOW_STEM_WHOLE_WIDTH} from '../vendor/iso-notation/src/render/janko/hollow-stem';

/* UI-only adapter for the native duration grammar. Duration interpretation mirrors the
 * exact 48-quarter-grid grammar in elements/duration.ts; proportions come from
 * DEFAULT_JANKO_TOKENS, JANKO_STEM_STROKE_WIDTH and notehead digitBaselineOffset.
 * The Bravura flags remain the shared immutable outlines, not redrawn symbols. */
function duration(beat:ReferencePerformanceTempo['beat']) {
 const ticks=192*beat.numerator/beat.denominator;
 for(const base of [3,6,12,24,48,96,192,384]){
  if(ticks===base)return {base,dots:0};
  if(2*ticks===3*base)return {base,dots:1};
  if(4*ticks===7*base)return {base,dots:2};
 }
}
export function beatUnitLabel(beat:ReferencePerformanceTempo['beat']):string {
 const d=duration(beat),name:Record<number,string>={3:'sixty-fourth',6:'thirty-second',12:'sixteenth',24:'eighth',48:'quarter',96:'half',192:'whole',384:'double-whole'};
 return d?`${d.dots===1?'dotted-':d.dots===2?'double-dotted-':''}${name[d.base]}`:`${beat.numerator}/${beat.denominator} whole-note`;
}
export function beatUnitSvg(beat:ReferencePerformanceTempo['beat']):string {
 const d=duration(beat);
 if(!d)return `<span class="metronome-fraction">${beat.numerator}/${beat.denominator}</span>`;
 const x=7,y=20,stemTop=4,stemStart=y-4.66,baseline=y+5.8*4/3*.739/2;
 const parts=[d.base>=96?hollowStemSvg({kind:'hollow-stem',x,y1:stemStart,y2:stemTop,
  halfWidth:d.base>=192?HOLLOW_STEM_WHOLE_WIDTH:HOLLOW_STEM_HALF_WIDTH,width:HOLLOW_STEM_STROKE,
  value:d.base>=192?'whole':'half'}).replace('fill="#FFFFFF" stroke="#111111"','fill="#111" stroke="currentColor"'):
  `<line class="janko-stem" x1="${x}" y1="${stemStart}" x2="${x}" y2="${stemTop}" stroke-width=".9"/>`];
 const flags=d.base<=24?Math.log2(48/d.base):0;
 if(flags){const g=URTEXT_FLAGS_UP[flags-1],p=(q:readonly [number,number])=>`${(x+q[0]).toFixed(2)} ${(stemTop+q[1]).toFixed(2)}`,path=g.contours.map(c=>`M ${p(c.start)} ${c.segments.map(([a,b,e])=>`C ${p(a)} ${p(b)} ${p(e)}`).join(' ')} Z`).join(' ');parts.push(`<path class="janko-flag" d="${path}" fill-rule="evenodd"/>`);}
 for(let i=0;i<d.dots;i++)parts.push(`<circle class="janko-augmentation-dot" cx="${x+4+i*2.7}" cy="${y-2}" r=".75"/>`);
 parts.push(`<text class="janko-digit" x="${x}" y="${baseline.toFixed(2)}" font-weight="700" font-size="5.8pt">n</text>`);
 return `<svg class="metronome-unit" viewBox="0 0 20 27" aria-hidden="true" focusable="false">${parts.join('')}</svg>`;
}
export function metronomeMark(tempo:ReferencePerformanceTempo,bpm=tempo.bpm):string {
 return `<span class="metronome-mark" aria-label="${tempoRateLabel(tempo.beat,bpm)}" data-beat="${tempo.beat.numerator}/${tempo.beat.denominator}"><span aria-hidden="true">${tempoRateNumber(bpm)}</span>${beatUnitSvg(tempo.beat)}<span aria-hidden="true">per minute</span></span>`;
}
/** Display rounding does not alter the stored rational-unit performance clock. */
export function tempoRateNumber(bpm:number):string {
 if(!Number.isFinite(bpm)||bpm<=0)throw Error('Choose a positive musical tempo.');
 return Number(bpm.toPrecision(7)).toString();
}
export const tempoRateLabel=(beat:ReferencePerformanceTempo['beat'],bpm:number)=>
 `${tempoRateNumber(bpm)} ${beatUnitLabel(beat)} notes per minute`;
