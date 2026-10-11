import test from 'node:test';
import assert from 'node:assert/strict';
import {PracticeContrastCycle} from '../src/practice-contrast-cycle';
test('only a consistent complete A/B attempt completes; stale, duplicate, rate and assessment mismatches cannot credit',()=>{
 const c=new PracticeContrastCycle(),token=c.start(100,true);
 assert.equal(c.accept(1,100,true),'stale');assert.equal(c.accept(0,100,false),'stale');assert.equal(c.accept(0,101,true),'stale');
 assert.equal(c.accept(0,100,true),'next');assert.equal(c.accept(0,100,true),'stale');assert.equal(c.accept(1,100,true,token),'completed');assert.equal(c.accept(1,100,true,token),'stale');
});
test('pause or error cancellation invalidates A and any late B; restart requires a new A',()=>{
 const c=new PracticeContrastCycle(),old=c.start(100,false);assert.equal(c.accept(0,100,false),'next');c.cancel();
 const next=c.start(100,false);assert.notEqual(next,old);assert.equal(c.index,0);assert.equal(c.accept(1,100,false,old),'stale');assert.equal(c.accept(1,100,false,next),'stale');
 assert.equal(c.accept(0,100,false,next),'next');assert.equal(c.accept(1,100,false,next),'completed');
});
