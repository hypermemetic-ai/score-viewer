import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {unzipSync,strFromU8} from 'fflate';
import {resolveJankoOptions,resolveJankoTokens} from '../vendor/iso-notation/src/render/janko/types';
import {SCORE_RENDERING_RECIPE_VERSION,validateScoreRenderingRecipe,type ScoreRenderingRecipe} from '../vendor/iso-notation/src/render/janko/score-rendering-recipe';
import {renderScorePresentation,scoreWithPerformingHands} from '../vendor/iso-notation/src/render/janko/score-presentation';
import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';
const files=unzipSync(readFileSync(new URL('../fixtures/schumann-op68-no14.isoscore',import.meta.url)));
const score:QuantizedGridScore=JSON.parse(strFromU8(files['score.json'])),seats=JSON.parse(strFromU8(files['seats.json']));
const gold=JSON.parse(readFileSync(new URL('../vendor/iso-notation/src/render/janko/no14-gold-profile.json',import.meta.url),'utf8'));
const hash=(s:string|Uint8Array)=>createHash('sha256').update(s).digest('hex');
const pages=[1,2,3].map(n=>strFromU8(files[`pages/${n}.svg`]).replace(/ data-viewer-seat="seat-\d+"/g,''));
const recipe:ScoreRenderingRecipe={version:SCORE_RENDERING_RECIPE_VERSION,engineId:'janko-real-engine-no14-recovery-20261006',sourceSha256:hash(files['score.json']),
  options:resolveJankoOptions({...gold.options,runningHeaderHeight:20,printedNotices:score.publicationNotices!.slice(0,2),beatPulseTicks:72,pitchPlacement:'parity-columns',measuresPerSystem:6,productionWidthPolicy:'protected-heads',readingGlyphSeats:{'1':-.01625,B:-.025},authoredRestMode:'source',phraseRouting:'optical-open',sharedTerminalPolicy:'all-carriers'}),
  tokens:resolveJankoTokens(gold.tokens),baseline:{pageSha256:pages.map(hash),seatSha256:hash(files['seats.json'])}};

test('passive recipe admits resolved preparation, rejects programs, unresolved defaults and wrong source bindings',()=>{
  assert.deepEqual(validateScoreRenderingRecipe(recipe,{sourceSha256:recipe.sourceSha256,engineId:recipe.engineId}),recipe);
  assert.throws(()=>validateScoreRenderingRecipe({...recipe,run:()=>score}),/passive data/);
  assert.throws(()=>validateScoreRenderingRecipe({...recipe,options:{...recipe.options,pageWidth:Infinity}}),/passive data/);
  const unresolved=structuredClone(recipe);delete (unresolved.options as Partial<typeof unresolved.options>).pageWidth;
  assert.throws(()=>validateScoreRenderingRecipe(unresolved),/fully resolved/);
  assert.throws(()=>validateScoreRenderingRecipe(recipe,{sourceSha256:'0'.repeat(64)}),/different source/);
  assert.throws(()=>validateScoreRenderingRecipe({...recipe,engineId:'imported-program'}),/Unsupported/);
});

test('real-engine recipe reproduces all frozen No14 pages and exact source-owner label seats',()=>{
  const p=renderScorePresentation(score,recipe);
  assert.equal(p.layouts.length,11);assert.deepEqual(p.rawPages,pages);assert.deepEqual(p.seats,seats);
  assert.equal(p.allFive,true);assert.deepEqual(p.lint.violations,[]);assert.deepEqual(p.lint.warnings,[]);
  assert.equal(new Set(p.seats.flatMap(s=>s.ownerIds)).size,383);
  assert.deepEqual(p.pages,[1,2,3].map(n=>strFromU8(files[`pages/${n}.svg`])));
});

test('hand projection preserves source facts, owner aliases and every performed occurrence',()=>{
  const original=JSON.stringify(score),assignments=score.notes.map(n=>({id:n.id,pitch:12*n.pitch.octave+n.pitch.pitchClass,startTick:n.startTick,durationTicks:n.durationTicks,hand:n.hand==='LH'?'RH' as const:'LH' as const}));
  const effective=scoreWithPerformingHands(score,assignments,'conventional-test');
  assert.equal(JSON.stringify(score),original);
  const music=(n:any)=>{const {hand,editorialHand,handInference,...facts}=n;return facts;};
  assert.deepEqual(effective.notes.map(music),score.notes.map(music));
  const {notes:_,writtenPresentation:__,...sourceOther}=score,{notes:___,writtenPresentation:____,...effectiveOther}=effective;
  assert.deepEqual(effectiveOther,sourceOther);
  for(const event of effective.writtenPresentation!.events.notes!)assert.equal(event.overrides!.hand,effective.notes[event.writtenIndex].hand);
  assert.throws(()=>scoreWithPerformingHands(score,assignments.slice(1),'test'),/incomplete/);
  assert.throws(()=>scoreWithPerformingHands(score,assignments.map((a,i)=>i? a:{...a,pitch:a.pitch+1}),'test'),/match source/);
});
