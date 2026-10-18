import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareDualReadingPacket} from '../src/dual-reading-package';
import {stageReadingPartsInstall,ReadingPartsCommitUnconfirmed} from '../src/reading-parts-install';
import {collectionId,type Entry} from '../src/state';
import {hashBytes} from '../src/package';
import {authoredFrettedInput} from './support/fretted-dual-fixture';

const first=await prepareDualReadingPacket(authoredFrettedInput()),secondInput=authoredFrettedInput();secondInput.score.id='second-original-authored-part';
const second=await prepareDualReadingPacket(secondInput),parts=[first,second];
function memoryHost(){const files=new Map<string,Uint8Array>(),writes:string[]=[];return {files,writes,
 async read(name:string){return files.get(name)?.slice()??null;},async write(name:string,bytes:Uint8Array){writes.push(name);files.set(name,bytes.slice());}};}
const initial=()=>new TextEncoder().encode(JSON.stringify({version:1,entries:[]}));

test('all actual source parts stage before one pointer commit and their archives/personals remain distinct',async()=>{
 const host=memoryHost();host.files.set('library.json',initial());const result=await stageReadingPartsInstall(host,{parts,entries:[]});
 assert.equal(host.writes.filter(n=>n==='library.json').length,1);assert.equal(host.writes.at(-1),'library.json');assert.equal(result.entries.length,2);
 for(const [i,entry]of result.selected.entries()){
  assert.equal(entry.id,collectionId(parts[i].package));assert.deepEqual(host.files.get(entry.file),parts[i].bytes);
  const personal=JSON.parse(new TextDecoder().decode(host.files.get(Object.values(entry.personalFiles!)[0])));assert.equal(personal.revision,parts[i].package.manifest.revision);assert.deepEqual(personal.overrides,{});
 }
 assert.notEqual(Object.values(result.selected[0].personalFiles!)[0],Object.values(result.selected[1].personalFiles!)[0]);
});
test('a later stage write failure or cancellation leaves the original library and referenced journals exact',async()=>{
 for(const failure of ['write','cancel'] as const){
  const host=memoryHost(),installed=await stageReadingPartsInstall(host,{parts:[first],entries:[]}),before=new Map([...host.files].map(([n,b])=>[n,b.slice()]));host.writes.length=0;
  let live=true;const write=host.write.bind(host);host.write=async(n,b)=>{if(n.startsWith('state-version-')){if(failure==='write')throw Error('disk full');await write(n,b);live=false;}else await write(n,b);};
  await assert.rejects(stageReadingPartsInstall(host,{parts,entries:installed.entries,canCommit:()=>live}),failure==='write'?/disk full/:/cancelled/);
  assert.equal(host.writes.includes('library.json'),false);for(const[n,b]of before)assert.deepEqual(host.files.get(n),b);
 }
});
test('existing part selection preserves personal pointers while invalid or forged archive pairs refuse before writes',async()=>{
 const host=memoryHost(),installed=await stageReadingPartsInstall(host,{parts:[first],entries:[]}),before=new Map([...host.files].map(([n,b])=>[n,b.slice()]));host.writes.length=0;
 const existing=await stageReadingPartsInstall(host,{parts:[first],entries:installed.entries});assert.deepEqual(existing.selected,installed.selected);
 assert.equal(host.writes.filter(n=>n.startsWith('state-version-')).length,0);for(const[n,b]of before)assert.deepEqual(host.files.get(n),b);
 const forged={...first.package,archiveSha256:await hashBytes(second.bytes)};host.writes.length=0;
 await assert.rejects(stageReadingPartsInstall(host,{parts:[{bytes:second.bytes,package:forged}],entries:installed.entries}),/archive differs/);assert.deepEqual(host.writes,[]);
 await assert.rejects(stageReadingPartsInstall(host,{parts:[{bytes:first.bytes,package:structuredClone(first.package)}],entries:installed.entries}),/actual receiving-realm/);assert.deepEqual(host.writes,[]);
 const conflicting:Entry={...installed.entries[0],file:'package-'+'f'.repeat(64)+'.tuna'};
 const conflictHost=memoryHost();conflictHost.files.set('library.json',new TextEncoder().encode(JSON.stringify({version:1,entries:[conflicting]})));
 await assert.rejects(stageReadingPartsInstall(conflictHost,{parts:[first],entries:[conflicting]}),/different retained edition/);assert.deepEqual(conflictHost.writes,[]);
});
test('the owned request snapshot survives caller mutation and a committed lost acknowledgement is reported as readback-confirmed',async()=>{
 const host=memoryHost(),bytes=first.bytes.slice(),entries:Entry[]=[],pending=stageReadingPartsInstall(host,{parts:[{bytes,package:first.package}],entries});bytes.fill(0);entries.push({} as Entry);
 const installed=await pending;assert.deepEqual(host.files.get(installed.selected[0].file),first.bytes);
 const write=host.write.bind(host);host.write=async(n,b)=>{await write(n,b);if(n==='library.json')throw Error('acknowledgement lost');};
 const checked=await stageReadingPartsInstall(host,{parts:[second],entries:installed.entries});assert.equal(checked.commitConfirmedByReadback,true);assert.equal(checked.entries.length,2);
 const unknown=memoryHost();unknown.write=async n=>{if(n==='library.json')throw Error('unknown write outcome');};
 await assert.rejects(stageReadingPartsInstall(unknown,{parts:[first],entries:[]}),ReadingPartsCommitUnconfirmed);
});
test('stale library snapshots and changes during staging refuse without replacing current pointers',async()=>{
 const host=memoryHost(),installed=await stageReadingPartsInstall(host,{parts:[first],entries:[]}),before=host.files.get('library.json')!.slice();host.writes.length=0;
 await assert.rejects(stageReadingPartsInstall(host,{parts:[second],entries:[]}),/managed library changed/);assert.equal(host.writes.length,0);assert.deepEqual(host.files.get('library.json'),before);
 const write=host.write.bind(host),external=new TextEncoder().encode(JSON.stringify({version:1,entries:installed.entries,unknownFuture:{keep:'exact'}}));
 host.write=async(n,b)=>{await write(n,b);if(n.startsWith('state-version-'))host.files.set('library.json',external.slice());};
 await assert.rejects(stageReadingPartsInstall(host,{parts:[second],entries:installed.entries}),/changed during import/);
 assert.equal(host.writes.includes('library.json'),false);assert.deepEqual(host.files.get('library.json'),external);
 host.write=write;const reopened=await stageReadingPartsInstall(host,{parts:[second],entries:installed.entries});
 assert.deepEqual(JSON.parse(new TextDecoder().decode(host.files.get('library.json'))).unknownFuture,{keep:'exact'});assert.equal(reopened.entries.length,2);
});
test('changing the request cannot replace its captured operation cancellation guard',async()=>{
 const host=memoryHost();host.files.set('library.json',initial());let live=true;
 const request={parts:[first],entries:[],canCommit:()=>live},pending=stageReadingPartsInstall(host,request);live=false;request.canCommit=()=>true;
 await assert.rejects(pending,/cancelled/);assert.deepEqual(host.writes,[]);assert.deepEqual(host.files.get('library.json'),initial());
});
test('staged owned archive copies count toward the finite selection budget before any managed write',async()=>{
 const host=memoryHost(),oversized=new Uint8Array(40*1024*1024);
 await assert.rejects(stageReadingPartsInstall(host,{parts:[{bytes:oversized,package:first.package}],entries:[]}),/too large to prepare together/);
 assert.deepEqual(host.writes,[]);assert.equal(host.files.size,0);
});
