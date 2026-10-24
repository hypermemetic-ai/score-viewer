import test from 'node:test';
import assert from 'node:assert/strict';
import {practicePrivateScore} from '../scripts/practice-private-score.mjs';

test('the private practice archive is read from PRACTICE_PRIVATE_SCORE only',()=>{
 assert.equal(practicePrivateScore({}),undefined);
 assert.equal(practicePrivateScore({PRACTICE_PRIVATE_SCORE:'/data/a.tuna'}),'/data/a.tuna');
});
