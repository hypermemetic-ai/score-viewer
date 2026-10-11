import test from 'node:test';import assert from 'node:assert/strict';
import {scoreExcerptPulseGrid,validatePulseGrid,scorePulseGrid,scoreTickMs} from '../src/score-clock';
import {capturePracticeAttempt,practiceAttemptGrid,practiceCountInGrid} from '../src/practice-attempt-grid';
import {testReference} from './support/reference-score';
const source={ticksPerBeat:48,timeSignatures:[{tick:0,numerator:6,denominator:8}],referencePerformanceTempo:testReference};
const bars=[0,144,288,432];
for(const [start,end]of [[24,48],[48,240],[0,24],[336,384],[24,288]])test(`exact excerpt clock ${start}..${end} retains original source phase and ends without padding`,()=>{
 const grid=practiceCountInGrid(scoreExcerptPulseGrid(source,bars,start,end),2),captured=capturePracticeAttempt(180,grid),factor=(end-start)/grid.barStartPulses.at(-1)!;
 assert.equal(grid.sourceExcerpt!.startPulse*factor,start);assert.equal(grid.sourceExcerpt!.endPulse*factor,end);
 assert.equal(grid.barPhasePulses![0]*factor,start%144);
 assert.equal(grid.barStartPulses.at(-1)!*60000/(180*grid.pulsesPerBeat),(end-start)*scoreTickMs(source,180));
 assert.ok(captured.countInMs>=2*144*scoreTickMs(source,180));
 assert.deepEqual(practiceAttemptGrid(grid,captured.grid),grid);
 const bad=structuredClone(grid);bad.sourceExcerpt!.endPulse++;assert.throws(()=>validatePulseGrid(bad),/meter/);
 const shifted=structuredClone(grid);shifted.sourceExcerpt!.startPulse++;assert.throws(()=>practiceAttemptGrid(grid,shifted),/meter|excerpt/);
});
test('ordinary meter admission remains strict while the explicit excerpt is independently bound to original bars',()=>{
 const grid=scoreExcerptPulseGrid(source,bars,24,48),ordinary=structuredClone(grid);delete ordinary.sourceExcerpt;
 assert.throws(()=>validatePulseGrid(ordinary),/meter/);assert.throws(()=>scorePulseGrid(source,bars,24,48),/bar clock/);
 assert.throws(()=>scoreExcerptPulseGrid(source,bars,24,500),/bounds/);
 const missing=structuredClone(grid);missing.sourceExcerpt=undefined;assert.throws(()=>validatePulseGrid(missing),/meter/);
});
