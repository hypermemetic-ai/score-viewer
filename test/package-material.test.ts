import test from 'node:test';
import assert from 'node:assert/strict';
import {conservativeMaterialBytes,PACKAGE_MATERIAL_BUDGET_BYTES} from '../src/package-material';
import {assertGuitarProStagedMaterial,GUITAR_PRO_SELECTION_TOO_LARGE} from '../src/guitar-pro-material';

test('shared material helper preserves the literal ordinary admission formula',()=>{
 const counted=new Set<object>();
 const old=(value:unknown):number=>{
  if(typeof value==='string')return value.length*2;
  if(!value||typeof value!=='object')return 16;
  if(counted.has(value))return 0;counted.add(value);
  if(value instanceof Uint8Array)return value.byteLength+64;
  return 64+Object.entries(value).reduce((n,[key,item])=>n+32+key.length*2+old(item),0);
 };
 const shared=Object.freeze({unicode:'𝄞 π',bytes:new Uint8Array([1,2,3]),n:3}),graph={original:shared,packages:[shared,shared],groups:[[shared,['iso','tab']]]};
 assert.equal(conservativeMaterialBytes(graph),old(graph));
 const cycle:{self?:unknown}={};cycle.self=cycle;assert.ok(Number.isFinite(conservativeMaterialBytes(cycle)));
});

test('staged aggregate counts shared views once, distinct members separately, and refuses before retention',()=>{
 assert.equal(PACKAGE_MATERIAL_BUDGET_BYTES,64*1024*1024);
 const graph={scene:new Uint8Array(33*1024*1024)},part={package:graph,bytes:new Uint8Array(10)};
 assert.doesNotThrow(()=>assertGuitarProStagedMaterial([part],{package:graph}));
 const next={package:{scene:new Uint8Array(33*1024*1024)},bytes:new Uint8Array(10)};
 assert.throws(()=>assertGuitarProStagedMaterial([part],next),{message:GUITAR_PRO_SELECTION_TOO_LARGE});
 assert.throws(()=>assertGuitarProStagedMaterial([],{report:'x'.repeat(33*1024*1024)}),{message:GUITAR_PRO_SELECTION_TOO_LARGE});
 assert.equal(conservativeMaterialBytes({first:graph,second:graph}),conservativeMaterialBytes({first:graph})+32+'second'.length*2);
});

test('finite material traversal stops after exceeding its bound without visiting unrelated tail material',()=>{
 let visited=0;const tail={};Object.defineProperty(tail,'never',{enumerable:true,get(){visited++;throw Error('unrelated tail');}});
 assert.ok(conservativeMaterialBytes({first:new Uint8Array(100),tail},80)>80);
 assert.equal(visited,0);
});
