import test from 'node:test';
import assert from 'node:assert/strict';
import {DOMParser} from '@xmldom/xmldom';
import {consecutiveRelationRuns,relationIntersectsRuns} from '../src/practice-relations';
import {durationFixture} from './support/practice-rendering-fixture';
import {planPractice} from '../src/practice';

test('relation scope follows actual resident source runs, including boundary holds and excluding undisplayed gaps',()=>{
 const ticks=Array.from({length:13},(_,i)=>i*192),positions=[0,1,8,9];
 assert.deepEqual(consecutiveRelationRuns(positions),[{first:0,last:1},{first:2,last:3}]);
 assert.equal(relationIntersectsRuns(960,1152,ticks,positions),false,'a source tie in the undisplayed middle is unrelated');
 assert.equal(relationIntersectsRuns(-192,0,ticks,positions),true,'carry-in reaching the first displayed boundary remains relevant');
 assert.equal(relationIntersectsRuns(1728,2112,ticks,positions),true,'carry-out from the later resident run remains relevant');
 assert.equal(relationIntersectsRuns(384,576,ticks,positions),false,'the open right edge does not claim the next attack');
 assert.equal(relationIntersectsRuns(960,1152,ticks,[4,5,6,7]),true);
 assert.equal(relationIntersectsRuns(0,192,ticks,[]),false);
 assert.deepEqual(consecutiveRelationRuns([8,undefined,0,1]),[{first:0,last:0},{first:2,last:3}]);
});

test('authored three-component hold retains complete source components, distinct system heads and one sounding obligation',()=>{
 const p=durationFixture('hollow-stem',true,'traced',false,false,2,true),plan=planPractice(p),paths=p.pages.flatMap(svg=>{
  const doc=new DOMParser().parseFromString(svg,'image/svg+xml');return [...doc.getElementsByTagName('path')].filter(path=>path.getAttribute('data-tie-note')==='carry');
 });
 assert.equal(p.score.tieChains!.find(c=>c.noteId==='carry')!.components.length,3);
 assert.equal(p.seats.filter(s=>s.ownerIds.includes('carry')).length,3);
 assert.equal(plan.attacks.filter(a=>a.owners.includes('carry')).length,1);
 assert.equal(plan.attacks.find(a=>a.owners.includes('carry'))!.end,1224);
 assert.equal(paths.filter(p=>p.getAttribute('data-tie-component')==='0').length,2);
 assert.equal(paths.filter(p=>p.getAttribute('data-tie-component')==='1').length,1);
 assert.deepEqual(paths.filter(p=>p.getAttribute('data-tie-component')==='0').map(p=>p.getAttribute('data-tie-from-tick')),['960','960']);
 assert.deepEqual(paths.filter(p=>p.getAttribute('data-tie-component')==='0').map(p=>p.getAttribute('data-tie-to-tick')),['1152','1152']);
 assert.equal(paths.filter(p=>p.getAttribute('data-tie-component')==='0').map(p=>p.getAttribute('data-tie-side')).length,2);
 assert.equal(new Set(paths.filter(p=>p.getAttribute('data-tie-component')==='0').map(p=>p.getAttribute('data-tie-side'))).size,1,'a tie split across systems bows the same way on both halves (R-ties, ISO #494)');
});
