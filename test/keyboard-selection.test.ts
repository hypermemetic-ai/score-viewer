import test from 'node:test';import assert from 'node:assert/strict';
import {keyboardPreference,anchorView,writtenAnchor} from '../src/keyboard-selection';
import {defaultView} from '../src/state';
import type {ScorePackage,Seat} from '../src/package';
const seat=(writtenBar:number,page:number,owner:string)=>({writtenBar,page,ownerIds:[owner]}) as Seat;
test('clean keyboard defaults and positively identified RR retention are independent of Expert preferences',()=>{
  assert.equal(keyboardPreference(undefined),'conventional-piano');
  assert.equal(keyboardPreference(undefined,true),'janko-four-row');
  assert.equal(keyboardPreference('conventional-piano',true),'conventional-piano');
  assert.equal(keyboardPreference('janko-four-row'),'janko-four-row');
  assert.throws(()=>keyboardPreference('other'),/retained/);
});
test('keyboard selection preserves written anchor and reading choices through different page breaks',()=>{
  const old={seats:[seat(1,0,'first'),seat(13,1,'anchor'),seat(25,2,'last')]} as ScorePackage;
  const next={seats:[seat(1,0,'first'),seat(13,0,'anchor'),seat(25,1,'last')],pages:['one','two']} as ScorePackage;
  const view={...defaultView(),page:1,rotation:90 as const,count:3 as const,labelMode:'finger' as const};
  const anchor=writtenAnchor(old,view.page),changed=anchorView(view,next,anchor);
  assert.equal(anchor,13);assert.deepEqual(changed,{...view,page:0});assert.equal(view.page,1);
  assert.equal(writtenAnchor(old,0,'last'),25);
  assert.deepEqual(anchorView(changed,{...old,pages:['one','two','three']},anchor),view);
});
test('both linked presentations derive practice gestures from engraved hands and partition movement progress',async()=>{
 const {readFileSync}=await import('node:fs'),{importPackage,selectPresentation}=await import('../src/package'),{planPractice,initialPractice,totalProgress}=await import('../src/practice'),{practiceStorageName}=await import('../src/state');
 const p=await importPackage(readFileSync(new URL('../vendor/iso-notation/public/review/schumann-no14-conventional-20261006.isoscore',import.meta.url))),j=await selectPresentation(p,'janko-four-row');
 const plans=[planPractice(p),planPractice(j)];
 for(const [index,q]of [p,j].entries())for(const note of q.score.notes){const g=plans[index].gestures.find(g=>g.id===plans[index].ownerGroup.get(note.id));assert.equal(g?.hand,note.hand);assert.ok(g?.owners.includes(note.id));}
 assert.notEqual(plans[0].chunks[2].pattern,plans[1].chunks[2].pattern);assert.notEqual(practiceStorageName(p.sourceRevision!,p),practiceStorageName(j.sourceRevision!,j));
 const saved=initialPractice(plans[1]);saved.best[plans[1].chunks[0].pattern]=180;
 const clean=initialPractice(plans[0]);assert.equal(totalProgress(plans[0],clean),0);assert.ok(totalProgress(plans[1],saved)>0);assert.equal(Object.keys(clean.best).length,0);
});
