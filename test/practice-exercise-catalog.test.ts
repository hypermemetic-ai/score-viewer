import {test} from 'node:test';import assert from 'node:assert/strict';
import {createPracticeExerciseCatalog,toggleExerciseExclusion,includedExerciseTotal,anchorExcludedExercises} from '../src/practice-exercise-catalog';
const sections=Array.from({length:3},(_,i)=>({id:String(i),start:i*100,end:(i+1)*100,firstBar:i,lastBar:i,pattern:`p${i}`}));
test('catalog contains every overlapping adjacent double before attainment and no recursive joins',()=>{
 const c=createPracticeExerciseCatalog('source','policy',sections);assert.equal(c.length,5);
 assert.deepEqual(c.filter(c=>c.kind==='connection').map(c=>c.originalIds),[['0','1'],['1','2']]);
 assert.ok(c.every(c=>c.originalIds.length<=2));assert.deepEqual(createPracticeExerciseCatalog('source','policy',sections),c);
});
test('exclusion is surgical, reversible and changes equal-weight denominator without attainment',()=>{
 const c=createPracticeExerciseCatalog('source','policy',sections);const excluded=toggleExerciseExclusion(undefined,'1',c);
 assert.deepEqual(excluded,{'1':true});assert.equal(includedExerciseTotal(c,excluded,id=>id==='0'?1:0).progress,.25);
 assert.deepEqual(toggleExerciseExclusion(excluded,'1',c),{});
 const all=Object.fromEntries(c.map(c=>[c.id,true]));assert.deepEqual(includedExerciseTotal(c,all,()=>1),{included:0,progress:undefined});
});
test('excluded rows hold their actual previous slots while included rows sort',()=>{
 const previous=[{id:'a'},{id:'b'},{id:'c'},{id:'d'}],sorted=[previous[3],previous[2],previous[1],previous[0]];
 assert.deepEqual(anchorExcludedExercises(sorted,previous,{b:true}).map(c=>c.id),['d','b','c','a']);
});
test('contrast retains separate source clips and rejects an invented intervening span',()=>{
 const contrast={id:'contrast',originalIds:['0','2'] as const,clips:[{...sections[0],start:20,end:70},{...sections[2],start:220,end:270}] as const,pattern:'contrast-pattern',episode:0};
 const c=createPracticeExerciseCatalog('source','policy',sections,[contrast]);assert.deepEqual(c.at(-1)?.clips.map(c=>[c.start,c.end]),[[20,70],[220,270]]);
 assert.throws(()=>createPracticeExerciseCatalog('source','policy',sections,[{...contrast,clips:[{...sections[0],end:270},sections[2]]}]),/actual original/);
});
