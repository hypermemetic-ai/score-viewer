import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {unzipSync,strFromU8,strToU8,zipSync} from 'fflate';
import {hashBytes,importPackage,readEditionContent,type Manifest} from '../src/package';
import {rebuildEdition} from '../src/edition-rebuild';
import {reengraveReadingArchive} from '../src/reading-package';
import {engraveAgainOnce,engravedAgainFromRecord,engravedAgainRecord,useEngravedAgainStore,type EngravedAgain,type EngravedAgainStore} from '../src/engraved-again';
import {authoredReadingPackage} from './support/instrument-reading-fixture';

/** A store as the derived-file cache keeps it: each engraving as its JSON record. */
function recordStore(){
 const kept=new Map<string,string>(),counts={get:0,hit:0,put:0};
 const store:EngravedAgainStore={get:async key=>{counts.get++;const record=kept.get(key);if(record===undefined)return;counts.hit++;return engravedAgainFromRecord(JSON.parse(record));},
  put:(key,engraved)=>{counts.put++;kept.set(key,JSON.stringify(engravedAgainRecord(engraved)));}};
 return {store,kept,counts};
}
const kept=async<T>(store:EngravedAgainStore,run:()=>Promise<T>)=>{useEngravedAgainStore(store);try{return await run();}finally{useEngravedAgainStore(undefined);}};

test('an engraving made again is made once: the same inputs read it back, other inputs engrave',async()=>{
 const {store,counts}=recordStore(),bytes=new Uint8Array([1,2,3]),other=new Uint8Array([1,2,4]);let engraved=0;
 const made:EngravedAgain={bytes:new Uint8Array(70000).map((_,i)=>i%251),fellBack:['conventional-piano'],droppedFingers:[]},
  engrave=async()=>{engraved++;return {...made,bytes:new Uint8Array(made.bytes)};};
 await kept(store,async()=>{
  const first=await engraveAgainOnce('edition',[bytes],engrave),again=await engraveAgainOnce('edition',[bytes],engrave);
  assert.deepEqual(again,first);assert.deepEqual(again.bytes,made.bytes);assert.equal(engraved,1);
  // The key is the archive's bytes, an original it is bound to, and the kind of engraving.
  await engraveAgainOnce('edition',[other],engrave);await engraveAgainOnce('edition',[bytes,other],engrave);await engraveAgainOnce('reading',[bytes],engrave);
  assert.equal(engraved,4);assert.equal(counts.hit,1);
  // What the store hands back is a copy: changing it changes nothing kept.
  again.bytes[0]=255;again.fellBack.push('janko-four-row');
  assert.deepEqual(await engraveAgainOnce('edition',[bytes],engrave),first);
 });
 // With nothing to keep engravings in, each call engraves.
 await engraveAgainOnce('edition',[bytes],engrave);assert.equal(engraved,5);
});

test('a kept engraving that does not read back is engraved again',async()=>{
 assert.throws(()=>engravedAgainFromRecord({version:'engraved-again-v1',archive:'AA==',fellBack:['harpsichord'],droppedFingers:[]}));
 assert.throws(()=>engravedAgainFromRecord({version:'engraved-again-v0',archive:'AA==',fellBack:[],droppedFingers:[]}));
 let engraved=0;const store:EngravedAgainStore={get:async()=>{throw Error('unreadable');},put:()=>{}};
 await kept(store,()=>engraveAgainOnce('reading',[new Uint8Array([9])],async()=>{engraved++;return {bytes:new Uint8Array([1]),fellBack:[],droppedFingers:[]};}));
 assert.equal(engraved,1);
});

test('a saved edition engraved again ahead of time opens on that very engraving',async()=>{
 const bytes=new Uint8Array(readFileSync(new URL('../fixtures/authored-calculated-preparation-v2.tuna',import.meta.url))),refusal=Error('refused');
 const {store,counts}=recordStore(),ahead=await kept(store,()=>rebuildEdition(bytes,{refusal}));assert.equal(counts.put,1);
 // Opening reads it, given the content it already admitted, and engraves nothing.
 const opened=await kept(store,async()=>rebuildEdition(bytes,{refusal,content:await readEditionContent(bytes,{allowLegacyTempo:true})}));
 assert.equal(counts.hit,1);assert.equal(counts.put,1);
 assert.deepEqual(opened.bytes,ahead.bytes);assert.deepEqual(opened.fellBack,ahead.fellBack);assert.deepEqual(opened.droppedFingers,ahead.droppedFingers);
 assert.deepEqual(opened.replaced,ahead.replaced);await importPackage(opened.bytes,{allowLegacyTempo:true});
});

test('a reading engraved again ahead of time opens on that very engraving',async()=>{
 const current=await authoredReadingPackage(),files=unzipSync(current),m=JSON.parse(strFromU8(files['manifest.json'])) as Manifest;
 delete files['manifest.json'];files['pages/1.svg']=strToU8(strFromU8(files['pages/1.svg']).replace('</svg>','<g data-earlier-engraving=""/></svg>'));
 m.files=Object.fromEntries(await Promise.all(Object.entries(files).map(async([name,b])=>[name,await hashBytes(b)])));files['manifest.json']=strToU8(JSON.stringify(m));
 const stale=zipSync(files),refusal=await importPackage(stale).then(()=>undefined,error=>error);assert.ok(refusal);
 const {store,counts}=recordStore(),ahead=await kept(store,()=>reengraveReadingArchive(stale,refusal)),opened=await kept(store,()=>reengraveReadingArchive(stale,refusal));
 assert.equal(counts.put,1);assert.equal(counts.hit,1);assert.ok(ahead);assert.deepEqual(opened,ahead);
});
