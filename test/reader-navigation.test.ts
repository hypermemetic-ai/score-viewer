import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {defaultBindings,readBindings,readableChord,InputController} from '../src/input';
import {selectionOnPage,editUnits} from '../src/selection';import {importPackage} from '../src/package';
const p=await importPackage(readFileSync(new URL('../fixtures/schumann-op68-no14.tuna',import.meta.url)),{allowLegacyTempo:true});
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
test('both shipped piano presentations step through each system\'s hands, then on past page breaks',async()=>{
 const {selectPresentation}=await import('../src/package'),{systemSelection}=await import('../src/selection');
 const conventional=await importPackage(readFileSync(new URL('../vendor/iso-notation/public/review/schumann-no14-conventional-20261006.tuna',import.meta.url)));
 for(const pkg of [conventional,await selectPresentation(conventional,'janko-four-row')]){
  const hands=new Map(pkg.score.notes.map(n=>[n.id,n.hand])),hand=(s:{ownerIds:string[]})=>hands.get(s.ownerIds[0]);
  const systems=[...new Map(pkg.seats.map(s=>[`${s.page}:${s.system}`,{page:s.page,system:s.system}])).values()].sort((a,b)=>a.page-b.page||a.system-b.system);
  const row=(at:{page:number;system:number},h:string)=>pkg.seats.filter(s=>s.page===at.page&&s.system===at.system&&hand(s)===h);
  let crossings=0,within=0;
  for(let i=0;i<systems.length-1;i++){
   const right=row(systems[i],'RH'),left=row(systems[i],'LH');
   // Down from the right hand stays in the system, on its left hand.
   if(right.length&&left.length){const down=systemSelection(pkg,right[0],1);assert.equal(hand(down),'LH');assert.equal(down.system,systems[i].system);assert.equal(down.page,systems[i].page);assert.equal(systemSelection(pkg,down,-1).contactId===right[0].contactId||hand(systemSelection(pkg,down,-1))==='RH',true);within++;}
   // Down from the outer (left) hand continues into the next system's right hand.
   const source=left[0]??right[0],next=systemSelection(pkg,source,1),entering=row(systems[i+1],'RH').length?'RH':'LH';
   assert.equal(next.system,systems[i+1].system);assert.equal(next.page,systems[i+1].page);assert.equal(hand(next),entering);
   const targets=row(systems[i+1],entering);assert.equal(Math.abs(next.x-source.x),Math.min(...targets.map(s=>Math.abs(s.x-source.x))));
   if(source.page!==next.page)crossings++;
  }
  assert.ok(within>0);
  assert.ok(crossings>0);
 }
});


test('measure movement follows written bars, skips empty bars and retains held aliases',async()=>{
 const {measureSelection}=await import('../src/selection'),units=editUnits(p),start={...units[0],writtenBar:1,page:0},held={...units[0],id:'held-bar-3',writtenBar:3,page:1,continuation:true},later={...units[1],writtenBar:5,page:1},last={...units[2],writtenBar:5,page:1};
 const q={score:p.score,seats:[last,later,held,start]};
 assert.equal(measureSelection(q,start,1),held);assert.equal(measureSelection(q,held,1),later);assert.equal(measureSelection(q,later,-1),held);assert.equal(measureSelection(q,held,-1),start);assert.equal(measureSelection(q,start,-1),start);assert.equal(measureSelection(q,last,1),last);
});
