import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {importPackage,selectPresentation} from '../src/package';
import {rebuildEdition} from '../src/edition-rebuild';
import {publishNativePianoScore} from '../src/native-piano-preparation';
import {prepareIsoReferenceScore} from '../src/iso-reference-score';
import {compoundPulseTicks,meterPulseOptions} from '../src/meter-pulse';

// No. 14 is in 6/8. Its saved pages draw one beat line per bar, at the dotted
// quarter. Engraved again from the shared production options alone, it drew
// two per bar, at the quarters, as if each bar were three quarters long.
const bytes=new Uint8Array(readFileSync(new URL('../fixtures/schumann-op68-no14.tuna',import.meta.url))),
 early=await importPackage(bytes,{allowLegacyTempo:true}),
 beatLines=(pages:readonly string[])=>pages.reduce((sum,svg)=>sum+(svg.match(/<line class="janko-beat-line"/g)?.length??0),0),
 bars=early.score.sourceBarTicks!.length-1;
const assets={font:{name:'fonts/URWGothic-Demi.otf',bytes:readFileSync(new URL('../src/URWGothic-Demi.otf',import.meta.url))},
 notices:Object.fromEntries(['URW-base35-COPYING','URW-base35-LICENSE','URW-base35-provenance.md'].map(name=>
  ['licenses/'+name,readFileSync(new URL('../licenses/'+name,import.meta.url))]))};

test('a compound metre beats in dotted values; a simple metre keeps the engraving\'s own pulse',()=>{
 const at=(...meters:[number,number][])=>meterPulseOptions({ticksPerBeat:48,timeSignatures:meters.map(([numerator,denominator],i)=>({tick:i*576,numerator,denominator}))});
 for(const meter of [[6,8],[9,8],[12,8]] as [number,number][])assert.deepEqual(at(meter),{beatPulseTicks:72},`${meter.join('/')} beats in dotted quarters`);
 assert.deepEqual(at([6,16]),{beatPulseTicks:36},'6/16 in dotted eighths');
 for(const meter of [[2,4],[3,4],[4,4],[2,2],[3,8]] as [number,number][])assert.deepEqual(at(meter),{},`${meter.join('/')} keeps the engraving's pulse`);
 assert.deepEqual(at([6,8],[12,8]),{beatPulseTicks:72},'metres that beat alike share their pulse');
 assert.deepEqual(at([6,8],[3,4]),{},'metres that beat differently get no single pulse');
 assert.deepEqual(at(),{},'a score without a metre keeps the engraving\'s pulse');
 assert.equal(compoundPulseTicks(48,{numerator:6,denominator:8}),72);
});

test('No. 14 engraved again keeps its saved beat lines: one per bar, at the dotted quarter, on both layouts',async()=>{
 assert.deepEqual(early.score.timeSignatures.map(m=>`${m.numerator}/${m.denominator}`),['6/8']);
 assert.equal(beatLines(early.pages),bars,'the saved pages draw one beat line in each bar');
 const next=await importPackage((await rebuildEdition(bytes,{})).bytes,{allowLegacyTempo:true});
 for(const layout of ['janko-four-row','conventional-piano'] as const){
  const view=await selectPresentation(next,layout);
  assert.equal(beatLines(view.pages),bars,`${layout}: one beat line in each bar`);
  assert.equal(view.renderingRecipe!.options.beatPulseTicks,72,`${layout}: the recipe keeps the metre's pulse, so the reader's own pages draw it too`);
 }
});

test('a piano score prepared in 6/8 is engraved at its dotted-quarter pulse; one in 3/4 at the engraving\'s own',async()=>{
 const metadata={title:'Pulse',composer:'',provenance:['Public 6/8 fixture.']};
 const compound=await importPackage((await publishNativePianoScore(structuredClone(early.score),{metadata,assets})).bytes,{allowLegacyTempo:true});
 assert.equal(beatLines(compound.pages),bars);
 assert.equal(compound.renderingRecipe!.options.beatPulseTicks,72);
 // Goldberg Var. 1, in 3/4, through the same preparation.
 const {dependencyRevision}=JSON.parse(readFileSync(new URL('../docs/source-provenance.json',import.meta.url),'utf8')) as {dependencyRevision:string};
 const plain=await importPackage((await prepareIsoReferenceScore('bach-goldberg-var1',assets,dependencyRevision)).bytes,{allowLegacyTempo:true});
 assert.deepEqual(plain.score.timeSignatures.map(m=>`${m.numerator}/${m.denominator}`),['3/4']);
 assert.equal(plain.renderingRecipe!.options.beatPulseTicks,undefined,'3/4 keeps the engraving\'s quarter pulse');
 assert.equal(beatLines(plain.pages),2*(plain.score.sourceBarTicks!.length-1),'its beat lines fall on beats 2 and 3 of each bar');
});
