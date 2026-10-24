import test from 'node:test';
import assert from 'node:assert/strict';
import {practicePrivateScore} from '../scripts/practice-private-score.mjs';

test('the private practice archive is read from PRACTICE_PRIVATE_SCORE, or from its deprecated earlier name with one warning',t=>{
 const warnings=[];t.mock.method(console,'warn',message=>warnings.push(message));
 assert.equal(practicePrivateScore({}),undefined);
 assert.equal(practicePrivateScore({PRACTICE_PRIVATE_SCORE:'/data/a.tuna',PRACTICE_ZELDA:'/data/b.tuna'}),'/data/a.tuna');
 assert.equal(warnings.length,0);
 assert.equal(practicePrivateScore({PRACTICE_ZELDA:'/data/b.tuna'}),'/data/b.tuna');
 assert.deepEqual(warnings,['PRACTICE_ZELDA is deprecated; set PRACTICE_PRIVATE_SCORE instead.']);
});
