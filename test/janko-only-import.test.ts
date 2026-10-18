import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {importPackage} from '../src/package';
import {addKeyboardView,importKeyboard} from '../src/edition-rebuild';
import {ensurePianoReady} from '../src/piano-readiness';

const fixture=(name:string)=>new Uint8Array(readFileSync(new URL('../fixtures/'+name,import.meta.url)));

test('a Jankó-only score file that cannot gain a conventional view imports on its own keyboard for a Conventional player',async()=>{
 // An early-format edition: its pages are Jankó only and it has no linked source to engrave a conventional view from.
 const bytes=fixture('schumann-op68-no14.tuna'),p=await importPackage(bytes,{allowLegacyTempo:true});
 assert.deepEqual(p.availablePresentations,['janko-four-row']);
 await assert.rejects(addKeyboardView(p,'conventional-piano'),/can't gain/);
 const layout=importKeyboard(p,'conventional-piano');
 assert.equal(layout,'janko-four-row');
 const ready=await ensurePianoReady({packageBytes:bytes,layout});
 assert.ok(ready.status==='ready'||ready.status==='editable'||ready.status==='reading',`prepared as ${ready.status}`);
 assert.equal(importKeyboard(p,'janko-four-row'),'janko-four-row');
});

test('a Jankó-only score file that can gain a conventional view still gains it on import',async()=>{
 const p=await importPackage(fixture('authored-preparation-v1.tuna'));
 assert.deepEqual(p.availablePresentations,['janko-four-row']);
 assert.equal(importKeyboard(p,'conventional-piano'),'conventional-piano');
 assert.equal(importKeyboard(p,'janko-four-row'),'janko-four-row');
 const added=await importPackage(await addKeyboardView(p,'conventional-piano'));
 assert.deepEqual([...added.availablePresentations!].sort(),['conventional-piano','janko-four-row']);
});
