import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {unzipSync,strFromU8,strToU8,zipSync} from 'fflate';
import {importPackage,hashBytes,editionNeedsEngravingAgain,type Manifest} from '../src/package';
import {reengraveReadingArchive} from '../src/reading-package';
import {authoredReadingPackage} from './support/instrument-reading-fixture';

const current=await authoredReadingPackage();
/** The same reading as an earlier shared engraving drew it: its pages differ from today's ink. */
async function earlier(change:(files:Record<string,Uint8Array>,m:Manifest)=>void=files=>{
  files['pages/1.svg']=strToU8(strFromU8(files['pages/1.svg']).replace('</svg>','<g data-earlier-engraving=""/></svg>'));
}):Promise<Uint8Array>{
  const files=unzipSync(current),m=JSON.parse(strFromU8(files['manifest.json'])) as Manifest;
  delete files['manifest.json'];change(files,m);
  m.files=Object.fromEntries(await Promise.all(Object.entries(files).map(async([name,b])=>[name,await hashBytes(b)])));
  files['manifest.json']=strToU8(JSON.stringify(m));return zipSync(files);
}
const members=(bytes:Uint8Array)=>{const files=unzipSync(bytes);delete files['manifest.json'];return Object.fromEntries(Object.entries(files).map(([n,b])=>[n,strFromU8(b)]));};
const manifest=(bytes:Uint8Array)=>JSON.parse(strFromU8(unzipSync(bytes)['manifest.json'])) as Manifest;

test('a reading whose pages an earlier engraving drew is engraved again from its own content',async()=>{
  const stale=await earlier(),refusal=await importPackage(stale).then(()=>undefined,error=>error);
  assert.match(String(refusal),/page differs/);
  const content=await editionNeedsEngravingAgain(stale,refusal);
  assert.ok(content);assert.equal(content!.manifest.revision,manifest(stale).revision);
  const again=await reengraveReadingArchive(stale,refusal);assert.ok(again);
  // Same score bytes, metadata, creation time, font, notices, options and tokens; today's pages.
  assert.deepEqual(members(again!),members(current));
  const {files:_a,...next}=manifest(again!),{files:_b,...today}=manifest(current);assert.deepEqual(next,today);
  const opened=await importPackage(again!);assert.equal(opened.manifest.revision,manifest(stale).revision);
  assert.deepEqual(opened.pages,(await importPackage(current)).pages);
  // The earlier archive itself is not changed.
  assert.match(String(await importPackage(stale).then(()=>undefined,error=>error)),/page differs/);
});

test('engraving a reading again keeps every refusal it cannot answer',async()=>{
  const refusal=Error('refused');
  // Not a single-reading archive: someone else's question.
  const piano=new Uint8Array(readFileSync(new URL('../fixtures/schumann-op68-no14.isoscore',import.meta.url)));
  assert.equal(await reengraveReadingArchive(piano,refusal),undefined);
  assert.equal(await reengraveReadingArchive(strToU8('not a zip'),refusal),undefined);
  // A member the new archive would not keep.
  const extra=await earlier(files=>{files['notes/extra.txt']=strToU8('kept by the player');});
  await assert.rejects(reengraveReadingArchive(extra,refusal),error=>error===refusal);
  // Content that no longer reads: a changed source policy.
  const policy=await earlier((_files,m)=>{const d=m.reading as unknown as {policy:Record<string,unknown>};d.policy={...d.policy,centerPitch:36};});
  await assert.rejects(reengraveReadingArchive(policy,refusal),error=>error===refusal);
  assert.equal(await editionNeedsEngravingAgain(policy,refusal),undefined);
  // Damaged bytes: a member whose hash no longer matches.
  const files=unzipSync(await earlier());files['pages/1.svg']=strToU8('<svg/>');
  await assert.rejects(reengraveReadingArchive(zipSync(files),refusal),error=>error===refusal);
});
