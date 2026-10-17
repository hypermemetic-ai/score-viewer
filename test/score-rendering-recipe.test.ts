import {normalizeLegacyScoreEvents,requirePitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import {requirePianoEvent} from '../src/piano-event';
import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {unzipSync,strFromU8} from 'fflate';
import {resolveIsoOptions,resolveIsoTokens} from '../vendor/iso-notation/src/render/iso/types';
import {SCORE_RENDERING_RECIPE_VERSION,validateScoreRenderingRecipe,type ScoreRenderingRecipe} from '../vendor/iso-notation/src/render/iso/score-rendering-recipe';
import {renderScorePresentation,scoreWithPerformingHands} from '../vendor/iso-notation/src/render/iso/score-presentation';
import {sourceFactsProjection} from '../vendor/iso-notation/src/score-presentation';
import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';
const files=unzipSync(readFileSync(new URL('../fixtures/schumann-op68-no14.isoscore',import.meta.url)));
const score:QuantizedGridScore=normalizeLegacyScoreEvents(JSON.parse(strFromU8(files['score.json'])) as QuantizedGridScore),seats=JSON.parse(strFromU8(files['seats.json']));
const gold=JSON.parse(readFileSync(new URL('../vendor/iso-notation/src/render/iso/no14-gold-profile.json',import.meta.url),'utf8'));
const hash=(s:string|Uint8Array)=>createHash('sha256').update(s).digest('hex');
const pages=[1,2,3].map(n=>strFromU8(files[`pages/${n}.svg`]).replace(/ data-viewer-seat="seat-\d+"/g,''));
const recipe:ScoreRenderingRecipe={version:SCORE_RENDERING_RECIPE_VERSION,engineId:'janko-real-engine-no14-recovery-20261006',sourceSha256:hash(files['score.json']),
  options:resolveIsoOptions({...gold.options,runningHeaderHeight:20,printedNotices:score.publicationNotices!.slice(0,2),beatPulseTicks:72,pitchPlacement:'parity-columns',measuresPerSystem:6,productionWidthPolicy:'protected-heads',readingGlyphSeats:{'1':-.01625,B:-.025},authoredRestMode:'source',phraseRouting:'optical-open',sharedTerminalPolicy:'all-carriers'}),
  tokens:resolveIsoTokens(gold.tokens),baseline:{pageSha256:pages.map(hash),seatSha256:hash(files['seats.json'])}};

test('passive recipe admits resolved preparation, rejects programs, unresolved defaults and wrong source bindings',()=>{
  assert.deepEqual(validateScoreRenderingRecipe(recipe,{sourceSha256:recipe.sourceSha256,engineId:recipe.engineId}),recipe);
  assert.throws(()=>validateScoreRenderingRecipe({...recipe,run:()=>score}),/passive data/);
  assert.throws(()=>validateScoreRenderingRecipe({...recipe,options:{...recipe.options,pageWidth:Infinity}}),/passive data/);
  const unresolved=structuredClone(recipe);delete (unresolved.options as Partial<typeof unresolved.options>).pageWidth;
  assert.throws(()=>validateScoreRenderingRecipe(unresolved),/fully resolved/);
  assert.throws(()=>validateScoreRenderingRecipe(recipe,{sourceSha256:'0'.repeat(64)}),/different source/);
  assert.throws(()=>validateScoreRenderingRecipe({...recipe,engineId:'imported-program'}),/Unsupported/);
});

// Saved pages are derived output, not a byte-identity gate (owner direction,
// 2026-10-17). ISO #388 (pinned at bee8c67) seats dynamics by their own music,
// which moves the frozen No14 systems; the reader engraves such an edition
// again from its content. The retained recipe still draws every source owner
// on the same seats, deterministically and lint-clean.
test('real-engine recipe engraves every frozen No14 owner on its own label seats, deterministically',()=>{
  const p=renderScorePresentation(score,recipe),again=renderScorePresentation(score,recipe);
  assert.equal(p.layouts.length,11);assert.equal(p.rawPages.length,pages.length);
  assert.deepEqual(p.seats.map(s=>[s.id,s.ownerIds]),seats.map((s:{id:string;ownerIds:string[]})=>[s.id,s.ownerIds]));
  assert.equal(p.allFive,true);assert.deepEqual(p.lint.violations,[]);assert.deepEqual(p.lint.warnings,[]);
  assert.equal(new Set(p.seats.flatMap(s=>s.ownerIds)).size,383);
  assert.deepEqual(again.rawPages,p.rawPages);assert.deepEqual(again.seats,p.seats);
});

test('hand projection preserves genuine editorial guards; authored unguarded projection retains source facts and occurrences',()=>{
  const original=JSON.stringify(score),assignments=score.notes.map(n=>({id:n.id,pitch:12*requirePitchedEvent(n).pitch.octave+requirePitchedEvent(n).pitch.pitchClass,startTick:n.startTick,durationTicks:n.durationTicks,hand:requirePianoEvent(n).hand==='LH'?'RH' as const:'LH' as const}));
  assert.throws(()=>scoreWithPerformingHands(score,assignments,'conventional-test'),/editorial authority/);
  assert.equal(JSON.stringify(score),original);
  const authored:QuantizedGridScore={id:'authored-hand-projection',title:'Projection control',composer:'Fixture',ticksPerBeat:48,totalTicks:96,sourceBarTicks:[0,96],
    notes:[0,1].map(i=>({id:'authored-'+i,eventKind:'pitched' as const,pitch:{octave:4,pitchClass:i*4},startTick:i*48,durationTicks:48,hand:'LH'})),
    barlines:[],timeSignatures:[],tempos:[],dynamics:[],pedals:[]};
  const hands=authored.notes.map(n=>({id:n.id,pitch:12*requirePitchedEvent(n).pitch.octave+requirePitchedEvent(n).pitch.pitchClass,startTick:n.startTick,durationTicks:n.durationTicks,hand:'RH' as const})),
    before=JSON.stringify(authored),effective=scoreWithPerformingHands(authored,hands,'authored-test');
  assert.equal(JSON.stringify(authored),before);assert.deepEqual(sourceFactsProjection(effective),sourceFactsProjection(authored));
  assert.ok(effective.notes.every(n=>n.derivedHand?.hand==='RH'&&!n.editorialHand));
  assert.throws(()=>scoreWithPerformingHands(authored,hands.slice(1),'test'),/incomplete/);
  assert.throws(()=>scoreWithPerformingHands(authored,hands.map((a,i)=>i? a:{...a,pitch:a.pitch+1}),'test'),/match source/);
});
