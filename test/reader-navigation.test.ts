import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {defaultBindings,readBindings,readableChord,InputController} from '../src/input';
import {selectionOnPage,editUnits} from '../src/selection';import {importPackage} from '../src/package';
const p=await importPackage(readFileSync(new URL('../fixtures/schumann-op68-no14.isoscore',import.meta.url)),{allowLegacyTempo:true});
test('fresh page keys are literal arrows and saved custom keys stay literal',()=>{assert.deepEqual(defaultBindings(),{previous:'ArrowLeft',next:'ArrowRight',toggle:'KeyF',edit:'KeyE',done:'Enter',practiceSettings:'KeyO'});assert.equal(readableChord(defaultBindings().previous),'Left arrow');assert.equal(readableChord(defaultBindings().next),'Right arrow');const old={previous:'PageUp',next:'Ctrl+KeyN',toggle:'KeyF',edit:'KeyE'};assert.deepEqual(readBindings(old),{...old,done:'Enter',practiceSettings:'KeyO'});const input=new InputController();const event={code:'ArrowRight',ctrlKey:false,altKey:false,shiftKey:false,metaKey:false,repeat:false};assert.equal(input.down(event,true,true).action,undefined);input.clear();assert.equal(input.down(event,true,false).action,'next');});
test('initial Edit retains current page despite old cursor; same-page cursor resumes',()=>{const old=editUnits(p).find(seat=>seat.page===0)!,first=editUnits(p).find(seat=>seat.page===1)!;assert.equal(selectionOnPage(p,old.contactId,1)?.contactId,first.contactId);const pageSeat=editUnits(p).filter(seat=>seat.page===1)[4];assert.equal(selectionOnPage(p,pageSeat.contactId,1)?.id,pageSeat.id);assert.equal(selectionOnPage(p,undefined,1)?.page,1);assert.equal(selectionOnPage(p,old.contactId,99),undefined);});
test('visible continuation alias provides Edit without leaving its page',()=>{const seat=editUnits(p)[0],held={...seat,id:'held-current-page',page:3,continuation:true};const q={score:p.score,seats:[seat,held]};assert.equal(selectionOnPage(q,seat.contactId,3)?.id,held.id);assert.equal(selectionOnPage(q,undefined,3)?.page,3);});

test('vertical editing uses whole systems, horizontal proximity and visible continuation aliases',async()=>{
 const {systemSelection}=await import('../src/selection'),original=editUnits(p)[0],notes=editUnits(p).slice(0,6);
 const make=(i:number,system:number,page:number,x:number,baseline:number)=>({...notes[i],id:`visible-${i}-${system}`,system,page,x,baseline});
 const start=make(0,0,0,100,100),far=make(1,2,0,180,190),near=make(2,2,0,105,240),otherHand=make(3,2,0,104,280),alias={...start,id:'held-next-page',system:3,page:1,x:103,baseline:100,continuation:true};
 const q={score:p.score,seats:[alias,far,start,near,otherHand]};
 assert.equal(systemSelection(q,start,1).id,otherHand.id,'whole-system jump is not restricted to the same hand or nearest vertical seat');
 assert.equal(systemSelection(q,near,1).id,alias.id,'a continuation-only system stays selectable across the page');
 assert.equal(systemSelection(q,alias,-1).id,otherHand.id);assert.equal(systemSelection(q,start,-1),start);assert.equal(systemSelection(q,alias,1),alias);
 assert.equal(original.contactId,start.contactId);
});
test('equal horizontal distances break by vertical proximity, then written source order',async()=>{
 const {systemSelection}=await import('../src/selection'),units=editUnits(p),start={...units[0],page:0,system:0,x:100,baseline:100},earlier={...units[1],page:0,system:1,x:95,baseline:150},later={...units[2],page:0,system:1,x:105,baseline:125};
 const q={score:p.score,seats:[later,earlier,start]};assert.equal(systemSelection(q,start,1).id,later.id);
 later.baseline=150;assert.equal(systemSelection(q,start,1).id,earlier.id);
 assert.equal(systemSelection({...q,seats:[...q.seats].reverse()},start,1).id,earlier.id);
});
test('both shipped piano presentations navigate their printed systems independently of page breaks',async()=>{
 const {selectPresentation}=await import('../src/package'),{systemSelection}=await import('../src/selection');
 const conventional=await importPackage(readFileSync(new URL('../vendor/iso-notation/public/review/schumann-no14-conventional-20261006.isoscore',import.meta.url)));
 for(const pkg of [conventional,await selectPresentation(conventional,'janko-four-row')]){
  const systems=[...new Map(pkg.seats.map(s=>[`${s.page}:${s.system}`,{page:s.page,system:s.system}])).values()].sort((a,b)=>a.page-b.page||a.system-b.system);
  let crossings=0;
  for(let i=0;i<systems.length-1;i++){
   const source=pkg.seats.find(s=>s.page===systems[i].page&&s.system===systems[i].system)!,next=systemSelection(pkg,source,1);
   assert.equal(next.system,systems[i+1].system);assert.equal(next.page,systems[i+1].page);
   const targets=pkg.seats.filter(s=>s.page===next.page&&s.system===next.system);assert.equal(Math.abs(next.x-source.x),Math.min(...targets.map(s=>Math.abs(s.x-source.x))));
   if(source.page!==next.page)crossings++;
  }
  assert.ok(crossings>0);
 }
});


test('measure movement follows written bars, skips empty bars and retains held aliases',async()=>{
 const {measureSelection}=await import('../src/selection'),units=editUnits(p),start={...units[0],writtenBar:1,page:0},held={...units[0],id:'held-bar-3',writtenBar:3,page:1,continuation:true},later={...units[1],writtenBar:5,page:1},last={...units[2],writtenBar:5,page:1};
 const q={score:p.score,seats:[last,later,held,start]};
 assert.equal(measureSelection(q,start,1),held);assert.equal(measureSelection(q,held,1),later);assert.equal(measureSelection(q,later,-1),held);assert.equal(measureSelection(q,held,-1),start);assert.equal(measureSelection(q,start,-1),start);assert.equal(measureSelection(q,last,1),last);
});
