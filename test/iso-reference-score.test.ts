import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isoReferenceScore,prepareIsoReferenceScore,ISO_REFERENCE_SCORES} from '../src/iso-reference-score';
import {publishNativePianoScore} from '../src/native-piano-preparation';
import {importPackageForReading} from '../src/package';
import {resolveActiveScore} from '../vendor/iso-notation/src/scores/active';
import {detectHandCrossings} from '../vendor/iso-notation/src/model/grid';
import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';

const assets={font:{name:'fonts/URWGothic-Demi.otf',bytes:readFileSync(new URL('../src/URWGothic-Demi.otf',import.meta.url))},
 notices:Object.fromEntries(['URW-base35-COPYING','URW-base35-LICENSE','URW-base35-provenance.md'].map(name=>
  ['licenses/'+name,readFileSync(new URL('../licenses/'+name,import.meta.url))]))};
const {dependencyRevision}=JSON.parse(readFileSync(new URL('../docs/source-provenance.json',import.meta.url),'utf8')) as {dependencyRevision:string};

// PENDING ISO PIN. One key struck by both hands at once is played by the right
// hand (owner decision, 2026-10-17). The active Bach data at the current pin
// still gives the second strike of each listed key (lh) the left hand, so
// viewer admission refuses the package. The pending iso-notation revision assigns them to RH through its
// guarded active-change path. When that pin lands, empty this list: the
// package then builds directly from the active data.
const PENDING_ISO_RIGHT_HAND=[
 {bar:32,lh:'bach-var1-551',rh:'bach-var1-550'}, // final G3, both hands
] as const;

const pitchKey=(n:QuantizedGridScore['notes'][number])=>'pitch' in n&&n.pitch?`${n.startTick}:${n.pitch.octave*12+n.pitch.pitchClass}`:undefined;
function crossHandUnisons(score:QuantizedGridScore){
 const bars=score.barlines.map(b=>b.tick),rh=new Map<string,string>();
 for(const n of score.notes){const key=pitchKey(n);if(key&&n.hand==='RH')rh.set(key,n.id);}
 return score.notes.flatMap(n=>{const key=pitchKey(n),other=key&&rh.get(key);
  return n.hand==='LH'&&other?[{bar:bars.filter(tick=>tick<=n.startTick).length,lh:n.id,rh:other}]:[];});
}

test('the pending right-hand cases are exactly the active Bach events struck by both hands at once',()=>{
 assert.deepEqual(crossHandUnisons(resolveActiveScore('bach-goldberg-var1').score),PENDING_ISO_RIGHT_HAND);
});

test('the reference score adds only its own bar boundaries and production layout to the active data',()=>{
 const active=resolveActiveScore('bach-goldberg-var1'),{score}=isoReferenceScore('bach-goldberg-var1');
 assert.deepEqual(score.sourceBarTicks,active.score.barlines.map(b=>b.tick));assert.equal(score.productionLayout,true);
 const {sourceBarTicks:_,productionLayout:__,...rest}=score;assert.deepEqual(rest,active.score);
});

test('Goldberg Var. 1 builds with zero engraving violations, opens on both keyboards and keeps every active hand',{timeout:300_000},async()=>{
 const active=resolveActiveScore('bach-goldberg-var1'),pending=new Set<string>(PENDING_ISO_RIGHT_HAND.map(c=>c.lh));
 let bytes:Uint8Array;
 if(!pending.size)({bytes}=await prepareIsoReferenceScore('bach-goldberg-var1',assets,dependencyRevision));
 else{
  // Ordinary preparation refuses the contradictory hands at the current pin.
  await assert.rejects(prepareIsoReferenceScore('bach-goldberg-var1',assets,dependencyRevision),/Linked performing hands contradict/);
  // Stand-in for the pending ISO data: only the listed events change hand.
  const {score}=isoReferenceScore('bach-goldberg-var1');
  score.notes=score.notes.map(n=>pending.has(n.id)?{...n,hand:'RH'}:n);score.handCrossings=detectHandCrossings(score);
  const {exceptionCarrier,durationSeatPreferences}=active.options;
  // Publication refuses any lint violation, so a package here has none.
  ({bytes}=await publishNativePianoScore(score,{assets,tokens:active.tokens,options:{exceptionCarrier,...(durationSeatPreferences?{durationSeatPreferences}:{})},
   metadata:{title:score.title,composer:ISO_REFERENCE_SCORES['bach-goldberg-var1'].composer,provenance:['test stand-in for the pending ISO hand revision']}}));
 }
 const p=await importPackageForReading(bytes);
 assert.deepEqual([...p.availablePresentations??[]].sort(),['conventional-piano','janko-four-row']);
 assert.equal(p.score.notes.length,active.score.notes.length);
 const hands=new Map(p.score.notes.map(n=>[n.id,n.hand]));
 for(const n of active.score.notes)assert.equal(hands.get(n.id),pending.has(n.id)?'RH':n.hand,n.id);
 assert.ok(p.pages.length>0);assert.ok(p.renderingRecipe);
});
