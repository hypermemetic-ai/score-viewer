import test from 'node:test';import assert from 'node:assert/strict';
import {referenceFixture} from './support/reference-score';
import {PracticeBrowser,practiceChunkRange,practicePreviewSourceRows} from '../src/practice-browser';
import {initialPractice,planPractice,practiceCatalogChunks} from '../src/practice';
import {displayedPracticeAssessment,displayedPracticeProgress,displayedPracticeTotal} from '../src/practice-display';
const p=await referenceFixture(new URL('../vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.isoscore',import.meta.url)),plan=planPractice(p),chunks=practiceCatalogChunks(plan);
test('bounded selector retains every catalog row and its position through exclusion and attainment changes',()=>{
 const state=initialPractice(plan),browser=new PracticeBrowser(plan),ids=browser.rows(state).map(c=>c.id),target=chunks.find(c=>c.kind==='contrast')!;
 assert.equal(ids.length,plan.catalog!.length);browser.select(state,target.id);const before=JSON.stringify(state.best);
 assert.equal(browser.toggleExcluded(state),true);state.best[chunks[0].pattern]=state.target;
 assert.deepEqual(browser.rows(state).map(c=>c.id),ids);assert.equal(browser.selected,target.id);assert.equal(state.excluded![target.id],true);
 browser.toggleExcluded(state);assert.equal(state.excluded![target.id],undefined);assert.equal(before,'{}');
});
test('excluded originals do not manufacture prerequisites and connections retain their own credit',()=>{
 const state=initialPractice(plan),browser=new PracticeBrowser(plan),connection=chunks.find(c=>c.kind==='connection')!;
 for(const id of connection.prerequisites!)browser.toggleExcluded(state,id);
 browser.select(state,connection.id);assert.equal(browser.available(state,connection),false);assert.equal(browser.key('Enter',state),'handled');
 for(const id of connection.prerequisites!){const section=chunks.find(c=>c.id===id)!;state.best[section.pattern]=state.target;}
 assert.equal(browser.available(state,connection),true);assert.equal(browser.key('Enter',state),'practice');assert.equal(displayedPracticeProgress(connection,state),0);
});
test('X targets a hovered exercise before the selected one, without altering earned evidence',()=>{
 const state=initialPractice(plan),browser=new PracticeBrowser(plan),selected=chunks[0],hovered=chunks.at(-1)!,before=JSON.stringify(state.best),previous=globalThis.document;
 browser.select(state,selected.id);try{globalThis.document={querySelector:()=>({dataset:{passageId:hovered.id}})} as any;assert.equal(browser.key('KeyX',state),'exclusion');assert.equal(state.excluded![hovered.id],true);assert.equal(state.excluded![selected.id],undefined);
 globalThis.document={querySelector:()=>null} as any;assert.equal(browser.key('KeyX',state),'exclusion');assert.equal(state.excluded![selected.id],true);
 }finally{globalThis.document=previous;}assert.equal(JSON.stringify(state.best),before);assert.equal(browser.selected,selected.id);
});
test('all included exercise types have equal weight and manual display changes only presented evidence',()=>{
 const state=initialPractice(plan),contrast=chunks.find(c=>c.kind==='contrast')!;
 state.best[contrast.pattern]=state.target;assert.equal(displayedPracticeTotal(plan,state),1/chunks.length);
 const other=chunks.filter(c=>c.kind==='connection').at(-1)!;state.manualAttainment={version:1,marks:{[JSON.stringify([other.id,other.pattern])]:[state.target]}};
 assert.equal(displayedPracticeTotal(plan,state),2/chunks.length);assert.equal(displayedPracticeTotal(plan,state,false),1/chunks.length);
 state.excluded={[other.id]:true};assert.equal(displayedPracticeTotal(plan,state),1/(chunks.length-1));assert.equal(state.manualAttainment.marks[JSON.stringify([other.id,other.pattern])][0],state.target);
});
test('empty inclusion has no percentage and contrast range refers to both actual source spans',()=>{
 const state=initialPractice(plan);state.excluded=Object.fromEntries(chunks.map(c=>[c.id,true]));assert.deepEqual(displayedPracticeAssessment(plan,state),{included:0,progress:undefined});
 const contrast=chunks.find(c=>c.kind==='contrast')!;assert.equal(practiceChunkRange(contrast),contrast.clips!.map(c=>c.firstBar===c.lastBar?String(c.firstBar+1):`${c.firstBar+1} – ${c.lastBar+1}`).join(' / '));
});

test('recommendations retain the actual contrast or connection rather than an enclosing original',()=>{
 const state=initialPractice(plan),browser=new PracticeBrowser(plan);for(const chunk of chunks.filter(c=>c.kind!=='section')){browser.suggest(state,chunk);assert.equal(browser.current(state)?.id,chunk.id);assert.equal(browser.component,undefined);}
});

test('sparse source previews partition before rendering without losing empty bars or partial endpoints',()=>{
 const bars=Array.from({length:501},(_,i)=>i*192),clip={id:'sparse-original',start:24,end:500*192-24,firstBar:0,lastBar:499};
 const rows=practicePreviewSourceRows(clip,bars,4),calls=rows.map(row=>({bars:Array.from({length:row.lastBar-row.firstBar+1},(_,i)=>row.firstBar+i),row}));
 assert.equal(calls.length,125);assert.ok(calls.every(call=>call.bars.length<=4));
 assert.deepEqual(calls.flatMap(call=>call.bars),Array.from({length:500},(_,i)=>i));
 assert.equal(rows[0].start,clip.start);assert.equal(rows.at(-1)!.end,clip.end);
 assert.ok(rows.every((row,i)=>!i||rows[i-1].end===row.start));assert.ok(rows.every(row=>row.id===clip.id));
 assert.throws(()=>practicePreviewSourceRows(clip,bars,65),/row bound/);
});
