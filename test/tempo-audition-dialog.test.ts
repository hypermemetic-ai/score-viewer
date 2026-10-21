import test from 'node:test';import assert from 'node:assert/strict';
import {tempoAuditionMarkup,tempoKeepText} from '../src/tempo-audition-dialog';

const quarter={numerator:1,denominator:4};
test('Enter says what it keeps: the piece tempo, and practice keeps its own goal',()=>{
 assert.equal(tempoKeepText({practiceGoal:80}),'Enter keeps the piece tempo. Practice keeps its goal of 80; change that in practice Options.');
 assert.equal(tempoKeepText({setsPracticeGoal:true}),'Enter keeps it as the piece tempo and your practice goal.');
 assert.equal(tempoKeepText({}),'Enter keeps it as the piece tempo.');
 const withGoal=tempoAuditionMarkup({heading:'No. 13',beat:quarter,bpm:76,confirmLabel:'Keep this tempo',practiceGoal:80,tempo:{bpm:76,beat:quarter,origin:'marking',confident:true,marking:'Nicht schnell'}});
 assert.match(withGoal,/data-tempo-compare/);assert.match(withGoal,/From “Nicht schnell”/);assert.match(withGoal,/Practice keeps its goal of 80/);
 const first=tempoAuditionMarkup({heading:'No. 13',beat:quarter,bpm:76,confirmLabel:'Practice at this tempo',setsPracticeGoal:true});
 assert.doesNotMatch(first,/data-tempo-compare/);assert.match(first,/Practice at this tempo <kbd>Enter<\/kbd>/);
 // Key hints are <kbd>.
 for(const key of ['←','→','Space','Home','Esc','Enter'])assert.match(withGoal,new RegExp(`<kbd[^>]*>${key}</kbd>`));
});
