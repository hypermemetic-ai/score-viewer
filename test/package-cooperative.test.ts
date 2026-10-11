import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setImmediate} from 'node:timers/promises';
import {importPackage} from '../src/package';
import {PackageAdmissionSession} from '../src/package-admission-session';

const bytes=new Uint8Array(readFileSync(new URL('../fixtures/schumann-op68-no14.isoscore',import.meta.url)));

test('piano package checks yield real host turns without changing admitted source or pages',async()=>{
 const expected=await importPackage(bytes,{allowLegacyTempo:true});
 const stages=new Set<string>();let turns=0,paintTurns=0;
 const actual=await importPackage(bytes,{allowLegacyTempo:true,execution:{budgetMs:.001,
  onCheckpoint:stage=>stages.add(stage),
  yieldControl:async stage=>{await setImmediate();turns++;if(stage==='paint')paintTurns++;}
 }});
 assert.ok(turns>1);assert.ok(paintTurns>=expected.pages.length);
 assert.ok(stages.has('geometry'));assert.ok(stages.has('paint'));
 assert.deepEqual(actual,expected);
});

test('canceled piano admission publishes no cache entry and a later opening remains valid',async()=>{
 const session=new PackageAdmissionSession(),controller=new AbortController();let canceled=false;
 await assert.rejects(session.import(bytes,{allowLegacyTempo:true,execution:{signal:controller.signal,
  onCheckpoint:stage=>{if(stage==='geometry'){canceled=true;controller.abort();}}
 }}),{name:'AbortError'});
 assert.equal(canceled,true);assert.deepEqual(session.retained,{entries:0,bytes:0,pending:0});
 const retried=await session.import(bytes,{allowLegacyTempo:true});
 assert.deepEqual(retried,await importPackage(bytes,{allowLegacyTempo:true}));
 assert.equal(session.retained.entries,1);
});
