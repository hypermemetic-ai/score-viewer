import test from 'node:test';import assert from 'node:assert/strict';
import {ordinal,tempoAuditionMarkup,tempoKeepText} from '../src/tempo-audition-dialog';

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
test('the dialog names who plays and offers the piano plainly, as the persistent Options switch',()=>{
 const view={heading:'No. 13',beat:quarter,bpm:76,confirmLabel:'Keep this tempo'};
 const text=(html:string)=>html.replace(/<[^>]+>/g,'').replace(/\s+/g,' ');
 assert.match(text(tempoAuditionMarkup(view)),/A simple built-in piano plays this preview\./);
 assert.doesNotMatch(tempoAuditionMarkup(view),/data-tempo-offer/);
 assert.match(text(tempoAuditionMarkup({...view,voice:'piano'})),/Your piano plays this preview\./);
 const offer=tempoAuditionMarkup({...view,offerPiano:true});
 assert.match(offer,/<button type="button" data-tempo-action="piano">Turn on your piano<\/button> — stays on, like Options › Piano\./);
 assert.match(text(offer),/Your piano is installed and turned off\. Turn on your piano — stays on, like Options › Piano\./);
 assert.match(text(tempoAuditionMarkup({...view,voiceNote:'Your piano is not sounding.'})),/Your piano is not sounding\. A simple built-in piano plays this preview\./);
});
test('passes are counted with proper ordinals',()=>{
 assert.deepEqual([1,2,3,4,11,12,13,21,22,23,101,111,112,113].map(ordinal),['1st','2nd','3rd','4th','11th','12th','13th','21st','22nd','23rd','101st','111th','112th','113th']);
});
