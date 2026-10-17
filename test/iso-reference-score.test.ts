import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isoReferenceScore,prepareIsoReferenceScore} from '../src/iso-reference-score';
import {importPackageForReading} from '../src/package';
import {resolveActiveScore} from '../vendor/iso-notation/src/scores/active';
import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';

const assets={font:{name:'fonts/URWGothic-Demi.otf',bytes:readFileSync(new URL('../src/URWGothic-Demi.otf',import.meta.url))},
 notices:Object.fromEntries(['URW-base35-COPYING','URW-base35-LICENSE','URW-base35-provenance.md'].map(name=>
  ['licenses/'+name,readFileSync(new URL('../licenses/'+name,import.meta.url))]))};
const {dependencyRevision}=JSON.parse(readFileSync(new URL('../docs/source-provenance.json',import.meta.url),'utf8')) as {dependencyRevision:string};

const pitchKey=(n:QuantizedGridScore['notes'][number])=>'pitch' in n&&n.pitch?`${n.startTick}:${n.pitch.octave*12+n.pitch.pitchClass}`:undefined;
function crossHandUnisons(score:QuantizedGridScore){
 const bars=score.barlines.map(b=>b.tick),rh=new Map<string,string>();
 for(const n of score.notes){const key=pitchKey(n);if(key&&n.hand==='RH')rh.set(key,n.id);}
 return score.notes.flatMap(n=>{const key=pitchKey(n),other=key&&rh.get(key);
  return n.hand==='LH'&&other?[{bar:bars.filter(tick=>tick<=n.startTick).length,lh:n.id,rh:other}]:[];});
}

// One key struck by both hands at once is played by the right hand (owner
// decision 2026-10-17, iso-notation #385), so no key has two hands.
test('no active Bach key is struck by both hands at once',()=>{
 assert.deepEqual(crossHandUnisons(resolveActiveScore('bach-goldberg-var1').score),[]);
});

test('the reference score adds only its own bar boundaries and production layout to the active data',()=>{
 const active=resolveActiveScore('bach-goldberg-var1'),{score}=isoReferenceScore('bach-goldberg-var1');
 assert.deepEqual(score.sourceBarTicks,active.score.barlines.map(b=>b.tick));assert.equal(score.productionLayout,true);
 const {sourceBarTicks:_,productionLayout:__,...rest}=score;assert.deepEqual(rest,active.score);
});

test('Goldberg Var. 1 builds with zero engraving violations, opens on both keyboards and keeps every active hand',{timeout:300_000},async()=>{
 const active=resolveActiveScore('bach-goldberg-var1'),{bytes}=await prepareIsoReferenceScore('bach-goldberg-var1',assets,dependencyRevision);
 const p=await importPackageForReading(bytes);
 assert.deepEqual([...p.availablePresentations??[]].sort(),['conventional-piano','janko-four-row']);
 assert.equal(p.score.notes.length,active.score.notes.length);
 const hands=new Map(p.score.notes.map(n=>[n.id,n.hand]));
 for(const n of active.score.notes)assert.equal(hands.get(n.id),n.hand,n.id);
 assert.ok(p.pages.length>0);assert.ok(p.renderingRecipe);
});
