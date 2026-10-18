import test from 'node:test';import assert from 'node:assert/strict';
import {referenceFixture} from './support/reference-score';
import {PracticeBrowser,practiceChunkRange,practicePreviewSourceRows} from '../src/practice-browser';
import {initialPractice,planPractice,practiceCatalogChunks} from '../src/practice';
import {displayedPracticeAssessment,displayedPracticeProgress,displayedPracticeTotal} from '../src/practice-display';
const p=await referenceFixture(new URL('../vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.tuna',import.meta.url)),plan=planPractice(p),chunks=practiceCatalogChunks(plan);
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
 const state=initialPractice(plan),browser=new PracticeBrowser(plan);for(const chunk of chunks.filter(c=>c.kind!=='section')){browser.suggest(state,chunk);assert.equal(browser.current(state)?.id,chunk.id);assert.equal(browser.component,chunk.kind==='connection'?chunk.id:undefined);}
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

const isolated=()=>{const own=structuredClone(plan);return {plan:own,state:initialPractice(own),browser:new PracticeBrowser(own)};};
const mark=(state:ReturnType<typeof initialPractice>,chunk:typeof chunks[number])=>{(state.manualAttainment??={version:1,marks:{}}).marks[JSON.stringify([chunk.id,chunk.pattern])]=[state.target];};

test('completed groups compact maximal source runs while leaving catalog and Total untouched',()=>{
 const {plan:own,state,browser}=isolated(),originals=own.chunks;
 [0,1,3].forEach(i=>mark(state,originals[i]));const before=JSON.stringify(state),total=displayedPracticeTotal(own,state),model=browser.presentation(state);
 assert.deepEqual(model.completed.map(g=>g.originalIds),[[originals[0].id,originals[1].id],[originals[3].id]]);
 const first=model.completed[0],children=model.children(first.id);
 assert.equal(children.connections.length,1);assert.equal(children.connections[0].kind,'connection');
 assert.deepEqual(children.completed.map(c=>c.id),first.originalIds);
 assert.equal(browser.rows(state).length,own.catalog!.length);assert.equal(displayedPracticeTotal(own,state),total);assert.equal(JSON.stringify(state),before);
 browser.toggleExcluded(state,originals[0].id);assert.deepEqual(browser.presentation(state).completed.map(g=>g.originalIds),model.completed.map(g=>g.originalIds));
 browser.setIncludeManual(false);assert.equal(browser.presentation(state).completed.length,0);assert.equal(browser.presentation(state).incomplete.length,originals.length);
});

test('display grouping requires exact source adjacency even when all neighboring rows are complete',()=>{
 const {plan:own,state,browser}=isolated();mark(state,own.chunks[0]);mark(state,own.chunks[1]);own.chunks[1].start+=1;
 assert.equal(browser.presentation(state).completed.length,2);
});

test('every exercise is reachable, with unfinished connections before completed originals and connections',()=>{
 const {plan:own,state,browser}=isolated();[0,1,3,4].forEach(i=>mark(state,own.chunks[i]));
 const pair=practiceCatalogChunks(own).find(c=>c.kind==='connection'&&c.originalIds?.includes(own.chunks[3].id)&&c.originalIds?.includes(own.chunks[4].id))!;mark(state,pair);
 const model=browser.presentation(state),reachable=new Set<string>();
 for(const row of model.left){if(row.kind!=='group')reachable.add(row.id);const children=model.children(row.id);for(const child of [...children.connections,...children.completed])reachable.add(child.id);if(row.kind==='section')assert.ok(![...children.connections,...children.completed].some(c=>c.id===row.id));}
 assert.deepEqual([...reachable].sort(),own.catalog!.map(c=>c.id).sort());
 const second=model.children(model.completed[1].id);assert.equal(second.connections.length,0);assert.ok(second.completed.some(c=>c.id===pair.id));
 const incomplete=model.incomplete[0],associated=model.children(incomplete.id);assert.ok(associated.connections.length);assert.ok(associated.connections.some(c=>!browser.available(state,c)));
 browser.setIncludeManual(false);assert.ok(browser.presentation(state).children(own.chunks[0].id).connections.some(c=>browser.available(state,c)));
});

test('group focus has no practice or exclusion target; Enter and Right enter concrete contents without starting',()=>{
 const {plan:own,state,browser}=isolated();[0,1].forEach(i=>mark(state,own.chunks[i]));const group=browser.presentation(state).completed[0];
 browser.select(state,group.id);assert.equal(browser.current(state),undefined);assert.equal(browser.toggleExcluded(state),false);
 assert.equal(browser.key('Enter',state),'handled');const connection=browser.current(state)!;assert.equal(connection.kind,'connection');assert.equal(browser.key('Enter',state),'practice');
 browser.key('ArrowDown',state);assert.equal(browser.current(state)?.id,own.chunks[0].id);
 browser.key('ArrowLeft',state);assert.equal(browser.selected,group.id);assert.equal(browser.current(state),undefined);
 browser.key('ArrowRight',state);assert.equal(browser.current(state)?.id,connection.id);browser.key('ArrowRight',state);assert.equal(browser.current(state)?.id,connection.id);
});

test('selected concrete IDs survive group merges, splits and manual display filtering',()=>{
 const {plan:own,state,browser}=isolated();[0,2].forEach(i=>mark(state,own.chunks[i]));browser.select(state,own.chunks[2].id);const originalGroup=browser.selected;
 mark(state,own.chunks[1]);assert.equal(browser.current(state)?.id,own.chunks[2].id);assert.notEqual(browser.selected,originalGroup);
 browser.setIncludeManual(false);assert.equal(browser.current(state)?.id,own.chunks[2].id);assert.equal(browser.component,undefined);
 browser.setIncludeManual(true);assert.equal(browser.current(state)?.id,own.chunks[2].id);assert.equal(browser.component,own.chunks[2].id);
 const connection=browser.presentation(state).children(browser.selected).connections[0];browser.select(state,connection.id,true);
 browser.setIncludeManual(false);assert.equal(browser.current(state)?.id,connection.id);assert.equal(browser.available(state,connection),true);assert.equal(browser.key('Enter',state),'practice');
});

test('bounded group markup has minimal headings and no synthetic percentage, action or preview',t=>{
 const {plan:own,state,browser}=isolated();[0,1,3].forEach(i=>mark(state,own.chunks[i]));const group=browser.presentation(state).completed[0];browser.select(state,group.id);
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:{activeElement:undefined}});t.after(()=>{if(previous)Object.defineProperty(globalThis,'document',previous);else delete(globalThis as any).document;});
 const preview={querySelectorAll:()=>[]},root={style:{setProperty(){}},querySelectorAll:()=>[],querySelector:()=>preview,innerHTML:''};browser.render(root as any,state,()=>{throw Error('groups must not request score geometry');});
 const html=root.innerHTML;assert.match(html,/practice-catalog-label">Completed/);assert.match(html,/practice-catalog-label">Incomplete/);assert.match(html,/practice-catalog-label">Connections/);assert.match(html,/practice-catalog-label">Contrasts/);
 const groupMarkup=html.match(new RegExp(`<button[^>]*data-passage-id="${group.id}"[^>]*>.*?</button>`))![0];assert.doesNotMatch(groupMarkup,/%|practice-start|exclude/);assert.doesNotMatch(html,/data-practice="passage:|practice-exclude-toggle|Learned|to practice|to learn/);
 assert.equal((html.match(new RegExp(`data-passage-id="${own.chunks[0].id}"`,'g'))??[]).length,1);
 const noMarks=isolated();noMarks.browser.select(noMarks.state,'invalid');assert.equal(noMarks.browser.presentation(noMarks.state).completed.length,0);
});

test('empty catalogs render no empty categories or percentage and groups cannot be excluded by hover',t=>{
 const {plan:own,state,browser}=isolated();own.chunks=[];own.catalog=[];
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:{activeElement:undefined}});t.after(()=>{if(previous)Object.defineProperty(globalThis,'document',previous);else delete(globalThis as any).document;});
 const root={style:{setProperty(){}},querySelectorAll:()=>[],querySelector:()=>({querySelectorAll:()=>[]}),innerHTML:''};browser.render(root as any,state,()=>{throw Error('no exercise preview');});
 assert.match(root.innerHTML,/No exercises included/);assert.doesNotMatch(root.innerHTML,/practice-catalog-label|data-practice="passage:|[0-9]%/);assert.equal(browser.current(state),undefined);assert.equal(browser.key('Enter',state),'handled');
 const marked=isolated();mark(marked.state,marked.plan.chunks[0]);const group=marked.browser.presentation(marked.state).completed[0];marked.browser.select(marked.state,group.id);
 (globalThis as any).document={querySelector:()=>({dataset:{passageId:group.id}})};assert.equal(marked.browser.key('KeyX',marked.state),undefined);assert.deepEqual(marked.state.excluded,{});
});
