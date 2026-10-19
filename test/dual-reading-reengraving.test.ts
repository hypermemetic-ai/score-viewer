import test from 'node:test';
import assert from 'node:assert/strict';
import {unzipSync,strFromU8,strToU8,zipSync} from 'fflate';
import {importPackage,readEditionContent,hashBytes,editionNeedsEngravingAgain,type Manifest} from '../src/package';
import {prepareDualReadingPackage,selectReadingNotation} from '../src/dual-reading-package';
import {reengraveReadingArchive} from '../src/reading-package';
import {authoredFrettedInput} from './support/fretted-dual-fixture';

// A dual reading imported with its source files, as a Guitar Pro import keeps them.
const retainedFiles={'guitar-pro/original.gp':new Uint8Array([71,80,56]),'guitar-pro/report.json':strToU8('{"fixture":true}')};
const current=await prepareDualReadingPackage({...authoredFrettedInput(),retainedFiles});
type Dual=Extract<NonNullable<Manifest['reading']>,{version:'instrument-reading-package-v2'}>;
const dual=(m:Manifest)=>m.reading as Dual;
/** The same dual reading as an earlier shared engraving drew it. */
async function earlier(change:(files:Record<string,Uint8Array>,m:Manifest)=>void=(files,m)=>{
  const name=dual(m).views.tab.pages[0];files[name]=strToU8(strFromU8(files[name]).replace('</svg>','<g data-earlier-engraving=""/></svg>'));
}):Promise<Uint8Array>{
  const files=unzipSync(current),m=JSON.parse(strFromU8(files['manifest.json'])) as Manifest;
  delete files['manifest.json'];change(files,m);
  m.files=Object.fromEntries(await Promise.all(Object.entries(files).map(async([name,b])=>[name,await hashBytes(b)])));
  files['manifest.json']=strToU8(JSON.stringify(m));return zipSync(files);
}
const members=(bytes:Uint8Array)=>{const files=unzipSync(bytes);delete files['manifest.json'];return Object.fromEntries(Object.entries(files).map(([n,b])=>[n,strFromU8(b)]));};
const manifest=(bytes:Uint8Array)=>JSON.parse(strFromU8(unzipSync(bytes)['manifest.json'])) as Manifest;
const refusalOf=(bytes:Uint8Array)=>importPackage(bytes).then(()=>undefined,error=>error);

test('a dual reading an earlier engraving drew is engraved again in both notations, keeping its source files',async()=>{
  const stale=await earlier(),refusal=await refusalOf(stale);
  assert.match(String(refusal),/page differs/);
  const content=await editionNeedsEngravingAgain(stale,refusal);
  assert.ok(content);assert.equal(content!.manifest.revision,manifest(stale).revision);
  // Content read for engraving again is never a presentation the reader can show.
  assert.throws(()=>selectReadingNotation(content!,'tab'),/actual receiving-realm/);
  const again=await reengraveReadingArchive(stale,refusal);assert.ok(again);
  // Same score bytes, metadata, creation time, font, notices and source files; today's views.
  assert.deepEqual(members(again!),members(current));
  const {files:_a,...next}=manifest(again!),{files:_b,...today}=manifest(current);assert.deepEqual(next,today);
  const opened=await importPackage(again!),reference=await importPackage(current);
  assert.deepEqual(opened.files['guitar-pro/original.gp'],retainedFiles['guitar-pro/original.gp']);
  for(const notation of ['iso','tab'] as const)assert.deepEqual(selectReadingNotation(opened,notation).pages,selectReadingNotation(reference,notation).pages);
  // The earlier archive itself is not changed.
  assert.match(String(await refusalOf(stale)),/page differs/);
});

test('a dual reading drawn under earlier shared rules, tokens or engine is engraved again under today\'s',async()=>{
  const earlierRule=await earlier((_files,m)=>{const options=dual(m).options as Record<string,unknown>;
    assert.equal(options.phraseRouting,'note-gesture');dual(m).options={...options,phraseRouting:'optical-open'} as Dual['options'];});
  const earlierWeight=await earlier((_files,m)=>{const tokens=dual(m).tokens as Record<string,number>;dual(m).tokens={...tokens,digitFontSize:tokens.digitFontSize*.9};});
  const removed=await earlier((_files,m)=>{dual(m).tokens={...dual(m).tokens,earlierToken:1} as Dual['tokens'];});
  const earlierEngine=await earlier((_files,m)=>{m.engineVersion='fretted-iso-engine-v0-earlier';});
  for(const [stale,refused] of [[earlierRule,/Unsupported reading option phraseRouting/],[earlierWeight,/differs/],[removed,/Unknown reading token/],[earlierEngine,/default presentation differs/]] as const){
    const refusal=await refusalOf(stale);
    assert.match(String(refusal),refused);
    assert.ok(await editionNeedsEngravingAgain(stale,refusal));
    // The cooperative path reads the content the same way.
    const again=await reengraveReadingArchive(stale,refusal,{budgetMs:1});assert.ok(again);
    assert.deepEqual(members(again!),members(current));
    const {files:_a,...next}=manifest(again!),{files:_b,...today}=manifest(current);assert.deepEqual(next,today);
  }
});

test('engraving a dual reading again keeps every refusal it cannot answer',async()=>{
  const refusal=Error('refused');
  // A page left over from an earlier view is stale ink, not a source file.
  const stalePage=await earlier((files,m)=>{files['reading/iso/pages/9.svg']=files[dual(m).views.iso.pages[0]];});
  await assert.rejects(reengraveReadingArchive(stalePage,refusal),error=>error===refusal);
  // Content that no longer reads: a changed source policy.
  const policy=await earlier((_files,m)=>{dual(m).policy={...dual(m).policy,centerPitch:36};});
  await assert.rejects(reengraveReadingArchive(policy,refusal),error=>error===refusal);
  assert.equal(await editionNeedsEngravingAgain(policy,refusal),undefined);
  await assert.rejects(readEditionContent(policy),/source identity/);
  // Damaged bytes: a member whose hash no longer matches.
  const files=unzipSync(await earlier());files['guitar-pro/original.gp']=new Uint8Array([0]);
  await assert.rejects(reengraveReadingArchive(zipSync(files),refusal),error=>error===refusal);
  // Leaving the score stops it as a cancellation, never as the refusal.
  const leaving=new AbortController();leaving.abort();
  await assert.rejects(reengraveReadingArchive(await earlier(),refusal,{signal:leaving.signal}),error=>(error as Error).name==='AbortError');
});
