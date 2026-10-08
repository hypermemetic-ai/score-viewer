import test from 'node:test';import assert from 'node:assert/strict';import {DOMParser} from '@xmldom/xmldom';
import {beatUnitLabel,beatUnitSvg,metronomeMark,tempoRateLabel,tempoRateNumber} from '../src/metronome-mark';
import {hollowStemBoxes,hollowStemAt} from '../vendor/iso-notation/src/render/janko/hollow-stem';
const tempo={version:'reference-performance-tempo-v1' as const,bpm:180,beat:{numerator:3,denominator:8},provenance:{kind:'editorial' as const,reference:'Test reference'}};
const svg=(beat:typeof tempo.beat)=>new DOMParser().parseFromString(beatUnitSvg(beat),'image/svg+xml');
test('dotted-quarter tempo shows numerical count, our owning duration glyph, then /min with accessible unit',()=>{const d=svg(tempo.beat);assert.equal(d.documentElement!.getAttribute('viewBox'),'0 0 20 27');assert.equal(d.getElementsByTagName('line').length,1);assert.equal(d.getElementsByTagName('circle').length,1);assert.equal(d.getElementsByTagName('path').length,0);assert.equal(d.getElementsByTagName('text')[0].textContent,'n');const mark=metronomeMark(tempo);assert.match(mark,/aria-label="180 dotted-quarter notes per minute"/);assert.ok(mark.indexOf('>180</span>')<mark.indexOf('<svg'));assert.ok(mark.indexOf('</svg>')<mark.indexOf('class="metronome-slash"'));assert.ok(mark.indexOf('class="metronome-slash"')<mark.indexOf('class="metronome-minute"'));assert.match(mark,/<span class="metronome-slash" aria-hidden="true">[/]<[/]span>/);assert.match(mark,/<span class="metronome-minute" aria-hidden="true">min<[/]span>/);assert.doesNotMatch(mark,/BPM|>\s*=\s*|333 ms|<strong/);});
test('quarter and eighth units stay distinct and chosen performance rate keeps the source rational unit',()=>{const quarter=svg({numerator:1,denominator:4}),eighth=svg({numerator:1,denominator:8});assert.equal(quarter.getElementsByTagName('circle').length,0);assert.equal(quarter.getElementsByTagName('path').length,0);assert.equal(eighth.getElementsByTagName('path').length,1);assert.equal(beatUnitLabel({numerator:1,denominator:4}),'quarter');assert.match(metronomeMark(tempo,75),/75 dotted-quarter notes per minute/);assert.equal(tempo.bpm,180);assert.equal(tempoRateLabel({numerator:1,denominator:4},80),'80 quarter notes per minute');});
test('unsupported rational beat retains an explicit unit instead of guessing a glyph',()=>{const beat={numerator:5,denominator:12};assert.equal(beatUnitLabel(beat),'5/12 whole-note');assert.doesNotMatch(beatUnitSvg(beat),/<svg/);assert.match(beatUnitSvg(beat),/5\/12/);});
test('rate display does not quantize persisted values or admit malformed rate text',()=>{const original=139.999999;assert.equal(tempoRateNumber(original),'140');assert.equal(original,139.999999);assert.throws(()=>tempoRateNumber(NaN),/positive/);assert.throws(()=>tempoRateNumber(0),/positive/);});
test('half and whole tempo units use the shared approved hollow stem widths and a real reserved counter',()=>{
 for(const [denominator,value,halfWidth,gap] of [[2,'half',1.25,1.9],[1,'whole',2.5,4.4]] as const){
  const d=svg({numerator:1,denominator}),r=d.getElementsByTagName('rect')[0];
  assert.equal(d.getElementsByTagName('line').length,0);assert.equal(d.getElementsByTagName('circle').length,0);
  assert.equal(d.getElementsByTagName('rect').length,1);assert.equal(r.getAttribute('data-long-value'),value);
  assert.equal(Number(r.getAttribute('width')),halfWidth*2);assert.equal(r.getAttribute('stroke-width'),'0.60');
  assert.equal(r.getAttribute('fill'),'#111');assert.equal(r.getAttribute('stroke'),'currentColor');
  const s={kind:'hollow-stem' as const,x:7,y1:15.34,y2:4,halfWidth,width:.6,value},b=hollowStemBoxes(s);
  assert.ok(Math.abs(b.inner.x1-b.inner.x0-gap)<1e-9);assert.equal(hollowStemAt(s,7,9),'clear');
  assert.equal(hollowStemAt(s,7+halfWidth,9),'ink');assert.equal(Number(r.getAttribute('y'))-.3,b.outer.y0);
  assert.equal(Number(r.getAttribute('height'))+.6,b.outer.y1-b.outer.y0);
 }
});
