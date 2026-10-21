import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isoReferenceScore,prepareIsoReferenceScore} from '../src/iso-reference-score';
import {archivePackage,editionNeedsEngravingAgain,hashBytes,importPackage,importPackageForReading,selectPresentation} from '../src/package';
import {rebuildEdition} from '../src/edition-rebuild';
import {collectionId} from '../src/state';
import {strFromU8,strToU8,unzipSync} from 'fflate';
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
 const {sourceBarTicks:_,productionLayout:__,...rest}=score,{sourceBarTicks:___,...activeRest}=active.score;assert.deepEqual(rest,activeRest);
});

test('Goldberg Var. 1 carries Bach\'s repeats: each half twice',()=>{
 const {score}=isoReferenceScore('bach-goldberg-var1');
 assert.deepEqual(score.writtenPresentation?.repeats,[{startBar:1,endBar:16,times:2},{startBar:17,endBar:32,times:2}]);
 assert.deepEqual(score.barlines.filter(b=>b.type!=='regular').map(b=>[b.barNumber,b.type]),[[17,'repeat-end-start'],[33,'repeat-end']]);
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

// A Goldberg edition saved before its repeats were encoded: its source has a
// double bar at m. 17 and a final bar, and its pages show no repeat signs.
// Made from a current edition by restoring that encoding and removing the
// drawn signs, with every member hash and source binding written again.
async function savedBeforeRepeats(bytes:Uint8Array):Promise<{bytes:Uint8Array;source:Uint8Array}>{
 const files=unzipSync(bytes),m=JSON.parse(strFromU8(files['manifest.json'])),old=m.sourceSha256 as string;
 const score=JSON.parse(strFromU8(files['source-score.json'])) as QuantizedGridScore;
 delete score.writtenPresentation;
 for(const b of score.barlines)b.type=b.tick===2304?'double':b.tick===score.totalTicks?'final':'regular';
 const source=strToU8(JSON.stringify(score)),sha=await hashBytes(source);
 for(const [name,data]of Object.entries(files)){
  if(name==='source-score.json'||name.endsWith('score.json'))files[name]=source;
  else if(name.endsWith('.svg'))files[name]=strToU8(strFromU8(data).replace(/<g class="janko-repeat"[^>]*>.*?<\/g>/g,''));
  else if(name.endsWith('rendering-recipe.json'))files[name]=strToU8(strFromU8(data).replaceAll(old,sha));
 }
 delete files['manifest.json'];
 const revision=await hashBytes(source);
 Object.assign(m,{sourceSha256:sha,sourceRevision:sha,revision,semanticSha256:revision,layerSourceHash:sha});
 for(const d of Object.values(m.presentations) as {revision:string;layerSourceHash:string}[])Object.assign(d,{revision,layerSourceHash:sha});
 m.files=Object.fromEntries(await Promise.all(Object.entries(files).map(async([name,data])=>[name,await hashBytes(data)])));
 return {bytes:archivePackage(m,files),source};
}

test('a Goldberg edition saved before its repeats shows them after an ordinary engraving again; its identity, hands and source bytes stay',{timeout:600_000},async()=>{
 const current=await prepareIsoReferenceScore('bach-goldberg-var1',assets,dependencyRevision),{bytes,source}=await savedBeforeRepeats(current.bytes);
 const refusal=await importPackage(bytes,{allowLegacyTempo:true}).then(()=>undefined,error=>error as Error);
 assert.match(String(refusal?.message),/repeat signs/,'pages without repeat signs are not shown as current');
 const content=await editionNeedsEngravingAgain(bytes,refusal);assert.ok(content,'its content still reads');
 assert.equal(content.sourceSha256,await hashBytes(source));
 assert.deepEqual(content.sourceScore!.writtenPresentation!.repeats,[{startBar:1,endBar:16,times:2},{startBar:17,endBar:32,times:2}]);
 const rebuilt=await rebuildEdition(bytes,{refusal}),next=await importPackage(rebuilt.bytes,{allowLegacyTempo:true});
 assert.equal(collectionId(next),collectionId(content));
 assert.deepEqual(unzipSync(rebuilt.bytes)['source-score.json'],source,'the stored source bytes stay as saved');
 for(const layout of ['conventional-piano','janko-four-row'] as const){
  const before=await selectPresentation(content,layout),after=await selectPresentation(next,layout);
  assert.equal(after.effectiveHandSha256,before.effectiveHandSha256,`${layout} keeps its hand identity`);
  assert.deepEqual(after.score.notes.map(n=>n.hand),before.score.notes.map(n=>n.hand));
  assert.deepEqual(after.pages.join('').match(/data-repeat="[a-z-]+"/g),['data-repeat="repeat-end"','data-repeat="repeat-start"','data-repeat="repeat-end"'],layout);
 }
});
