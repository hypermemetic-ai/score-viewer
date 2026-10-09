import test from 'node:test';import assert from 'node:assert/strict';import {transposeDraft} from '../src/score-options';
test('steps editing admits signed whole values and keeps invalid drafts out of the selected pitch context',()=>{
 for(const [text,expected] of [['0',0],['-0',0],['+12',12],[' -12 ',-12]] as const)assert.equal(transposeDraft(text,-12,12),expected);
 for(const text of ['','1.5','1e1','12 steps','--1'])assert.throws(()=>transposeDraft(text,-12,12),/whole number/);
 for(const text of ['-13','13','999999999999999999'])assert.throws(()=>transposeDraft(text,-12,12),/Choose from/);
});
