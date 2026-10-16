import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import identity from '../vendor/score-converter/source-package-identity.json';
import {inspectGuitarProSource,stageGuitarProParts,admitGuitarProContext,guitarProContext,guitarProPreparedByEarlierConverter,
 guitarProFamilyRefusal,GUITAR_PRO_FILES,type GuitarProInspection} from '../src/guitar-pro-provider';
import {guitarProTracksMarkup} from '../src/guitar-pro-tracks';
import {prepareDualReadingPacket} from '../src/dual-reading-package';
import {importPackage} from '../src/package';
import {authoredFrettedInput} from './support/fretted-dual-fixture';
import {installConverterNodeRuntime} from './support/converter-node-runtime';

const encoder=new TextEncoder(),bass=new Uint8Array(readFileSync(new URL('./fixtures/guitar-pro/original-family-gp5-500.gp5',import.meta.url)));

test('other instrument families are refused plainly and withheld from track selection',()=>{
 assert.equal(guitarProFamilyRefusal('keyboard','arrangement'),'This source part is a keyboard part. Guitar Pro import reads guitar and bass parts only.');
 assert.equal(guitarProFamilyRefusal('other','arrangement'),'This source part is not a guitar or bass part. Guitar Pro import reads guitar and bass parts only.');
 assert.match(guitarProFamilyRefusal('guitar','arrangement')!,/no string tuning to read/);
 assert.equal(guitarProFamilyRefusal('bass','fretted'),undefined);assert.equal(guitarProFamilyRefusal('guitar','fretted'),undefined);
 const track=(sourceId:string,family:string|undefined)=>({sourceId,sourceName:{value:'Part '+sourceId},instrument:{family,observations:[]},
  metadataEligibility:{status:'eligible',profile:'gp7-arrangement/0',findings:[]}});
 const html=guitarProTracksMarkup({inputSha256:'0'.repeat(64),report:{} as never,tracks:[track('0','keyboard'),track('1','bass'),track('2',undefined)]} as unknown as GuitarProInspection);
 assert.match(html,/data-gp-track="0" disabled><span>Part 0<small>This source part is a keyboard part\. Guitar Pro import reads guitar and bass parts only\.<\/small>/);
 assert.match(html,/data-gp-track="1" checked>/);assert.match(html,/data-gp-track="2" checked>/);
});

test('a bass track still stages, admits ISO and TAB, and cold-replays as Bass',{
 todo:'Blocked: converter 2146166 MusicXML adds <tuplet> notations and a notation-staff <staff-details>, which the pinned ISO reader refuses.'
},async()=>{
 const restore=installConverterNodeRuntime(),fixture=authoredFrettedInput();
 try{
  const inspection=await inspectGuitarProSource(bass);
  assert.deepEqual(inspection.tracks.map(t=>[t.sourceId,t.instrument.family,t.metadataEligibility.status]),[['0','bass','eligible']]);
  const staged=await stageGuitarProParts(inspection,['0'],{prepareAndAdmit:input=>prepareDualReadingPacket({...input,createdAt:fixture.createdAt,font:fixture.font,notices:fixture.notices})});
  const cold=await importPackage(staged.parts[0].bytes),context=await admitGuitarProContext(cold);
  assert.equal(context.family,'bass');assert.equal(context.converterArchiveSha256,identity.archive.sha256);assert.equal(guitarProContext(cold),context);
 }finally{restore();}
});

test('a part from an earlier converter opens through ordinary admission without Guitar/Bass authority',async()=>{
 const descriptor=(converterArchiveSha256:string)=>({version:'viewer-guitar-pro-source-v1',inputSha256:'1'.repeat(64),sourceTrackId:'0',musicxmlPartId:'P1',
  scoreId:'gp-test-0',groupId:'2'.repeat(64),converterArchiveSha256,converterSourceTree:'3c9c629fb5bba1cd144643fa28bd7834bc719308',
  projection:'portable-musicxml-retain-v1/shared-c2-outward-v1'});
 const packaged=async(source:unknown)=>{const input=authoredFrettedInput();
  return importPackage((await prepareDualReadingPacket({...input,retainedFiles:{[GUITAR_PRO_FILES.original]:bass,[GUITAR_PRO_FILES.xml]:encoder.encode('<score-partwise/>'),
   [GUITAR_PRO_FILES.report]:encoder.encode('{}'),[GUITAR_PRO_FILES.descriptor]:encoder.encode(JSON.stringify(source))}})).bytes);};
 const earlier=await packaged(descriptor('2cace1ed51280a406051f195f71fc99d7b2e166e798df89e677ed47283adf044'));
 assert.equal(guitarProPreparedByEarlierConverter(earlier),true);assert.equal(guitarProContext(earlier),undefined);
 assert.equal(guitarProPreparedByEarlierConverter(await packaged(descriptor(identity.archive.sha256))),false,'The current converter still requires exact replay.');
 assert.equal(guitarProPreparedByEarlierConverter(await packaged({...descriptor('x'),converterArchiveSha256:'not-a-digest'})),false);
 assert.equal(guitarProPreparedByEarlierConverter(await packaged({version:'other',converterArchiveSha256:'4'.repeat(64)})),false);
});
