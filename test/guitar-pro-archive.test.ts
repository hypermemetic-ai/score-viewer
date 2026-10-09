import test from 'node:test';
import assert from 'node:assert/strict';
import {unzipSync,zipSync,strToU8} from 'fflate';
import {importPackage} from '../src/package';
import {assertGuitarProArchive} from '../src/guitar-pro-archive';
import {authoredFrettedPackage} from './support/fretted-dual-fixture';
const bytes=await authoredFrettedPackage(),p=await importPackage(bytes);
test('complete returned bytes bind actual dual context independently of a mutable archive hash label',async()=>{
 await assertGuitarProArchive({...p,archiveSha256:'false label'},bytes);
 const changed=unzipSync(bytes);changed[p.manifest.font]=strToU8('foreign font');
 await assert.rejects(assertGuitarProArchive({...p,archiveSha256:'caller hash'},zipSync(changed)),/member differs/);
 changed['foreign.json']=strToU8('{}');await assert.rejects(assertGuitarProArchive(p,zipSync(changed)),/foreign members/);
 const other=unzipSync(bytes),manifest=JSON.parse(new TextDecoder().decode(other['manifest.json']));manifest.createdAt='different';other['manifest.json']=strToU8(JSON.stringify(manifest));
 await assert.rejects(assertGuitarProArchive(p,zipSync(other)),/manifest differs/);
 await assert.rejects(assertGuitarProArchive(structuredClone(p),bytes),/actual receiving-realm/);
 const abort=new AbortController();abort.abort();await assert.rejects(assertGuitarProArchive(p,bytes,abort.signal),{name:'AbortError'});
});
