import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {importPackage,type ScorePackage} from '../src/package';
import {fingeringCarriers} from '../src/fingering-carriers';
import {fingeringCarriers as originalCarriers} from './support/fingering-carriers-baseline';
function fixture(){
 const notes=['a','alias','b'].map((id,i)=>({id,eventKind:'pitched',pitch:{octave:5,pitchClass:0},startTick:i===2?144:0,durationTicks:48,hand:'RH',sourceProvenance:{voices:['melody']}}));
 const seats=['a','b'].map((id,page)=>({id,page,system:page,x:50,baseline:103,fontSize:6,pitchDigit:'0',ownerIds:page===0?['a','alias']:['b'],actionId:id,contactId:id,writtenBar:page+1}));
 const pages=seats.map(s=>`<svg xmlns="http://www.w3.org/2000/svg"><g id="system-${s.system+1}"><g class="janko-reading-head" data-note-x="50"><rect class="janko-knockout" x="47" y="96" width="6" height="8"/><text data-viewer-seat="${s.id}">0</text></g><line class="janko-stem" x1="50" y1="95.8" x2="50" y2="80" stroke-width=".9"/><line class="janko-stem" x1="50" y1="104.2" x2="50" y2="120" stroke-width=".9"/></g></svg>`);
 return {score:{notes},seats,pages} as unknown as Pick<ScorePackage,'score'|'seats'|'pages'>;
}
const check=(p:ReturnType<typeof fixture>)=>{const expected=originalCarriers(p);assert.deepEqual(fingeringCarriers(p),expected);assert.deepEqual(fingeringCarriers(p),expected);return expected;};
test('literal public No14 carrier maps retain all independent aliases, continuations and cached order',async()=>{
 const p=await importPackage(readFileSync(new URL('../fixtures/schumann-op68-no14.isoscore',import.meta.url)),{allowLegacyTempo:true});check(p);
 assert.deepEqual(fingeringCarriers({...p,seats:[...p.seats].reverse()}),originalCarriers({...p,seats:[...p.seats].reverse()}));
});
test('cached carrier values are detached and actual page, seat and effective owner changes retain old truth',()=>{
 const p=fixture(),before=check(p),changed=fingeringCarriers(p);changed.get('a')!.edge=900;changed.get('a')!.stemIds.push('forged');changed.get('b')!.associatedStemIds.reverse();changed.clear();
 assert.deepEqual(fingeringCarriers(p),before);
 const q=structuredClone(p);q.score.notes[0].hand='LH';check(q);assert.notEqual(fingeringCarriers(q).get('a')!.direction,before.get('a')!.direction);assert.deepEqual(fingeringCarriers(q).get('b'),before.get('b'));
 q.pages[0]=q.pages[0].replace('y2="120"','y2="130"');check(q);assert.equal(fingeringCarriers(q).get('a')!.edge,130);
 q.seats[0].fontSize=7;check(q);q.seats[0].continuation=true;check(q);q.seats[0].writtenBar=3;check(q);
});
test('irrelevant personal provenance changes retain exact carriers, but duplicate ID last-wins and missing source still apply',()=>{
 const p=fixture();check(p);for(const n of p.score.notes)(n as any).personalHand={version:'personal-performing-hand-v1',assignmentId:'choice1',hand:'RH'};
 check(p);const before=fingeringCarriers(p);for(const n of p.score.notes)(n as any).personalHand.assignmentId='choice2';assert.deepEqual(check(p),before);
 p.score.notes.push({...p.score.notes[0],hand:'LH'});check(p);assert.equal(fingeringCarriers(p).get('a')!.direction,1);
 p.score.notes=p.score.notes.filter(n=>n.id!=='a');assert.throws(()=>fingeringCarriers(p));assert.throws(()=>originalCarriers(p));
});
test('custom serialization, accessors and source discriminators cannot borrow a prior cached proof',()=>{
 const p=fixture();check(p);
 const getter=fixture();Object.defineProperty(getter.score.notes[0],'hand',{enumerable:true,get:()=> 'LH'});check(getter);assert.equal(fingeringCarriers(getter).get('a')!.direction,1);
 const serialized=fixture();serialized.score.notes[0].hand='LH';(serialized.score.notes[0] as any).toJSON=()=>p.score.notes[0];check(serialized);assert.equal(fingeringCarriers(serialized).get('a')!.direction,1);
 const hidden=fixture();Object.defineProperty(hidden.score.notes[0],'hand',{enumerable:false,value:'LH'});check(hidden);assert.equal(fingeringCarriers(hidden).get('a')!.direction,1);
 const bad=fixture();(bad.score.notes[0] as any).eventKind='unpitched';assert.throws(()=>fingeringCarriers(bad),/is unpitched/);
 const missing=fixture();missing.pages[0]=missing.pages[0].replace('data-viewer-seat="a"','data-viewer-seat="unknown"');assert.throws(()=>fingeringCarriers(missing),/seat missing/);
});
test('bounded page eviction preserves complete maps after independent physical source changes',()=>{
 const p=fixture(),before=check(p);
 for(let i=0;i<20;i++){const q=fixture();q.pages[0]=q.pages[0].replace('y2="120"',`y2="${120+i}"`);q.score.notes[0].hand='LH';check(q);}
 assert.deepEqual(fingeringCarriers(p),before);
});
