import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DOMParser} from '@xmldom/xmldom';
import {unzipSync,strFromU8} from 'fflate';
import {archivePackage,importPackage,selectPresentation,type Manifest} from '../src/package';
import {PackageAdmissionSession} from '../src/package-admission-session';

const legacy=new Uint8Array(readFileSync(new URL('../fixtures/schumann-op68-no14.tuna',import.meta.url))),
 linked=new Uint8Array(readFileSync(new URL('../vendor/iso-notation/public/review/schumann-no14-conventional-20261006.isoscore',import.meta.url)));
async function parsing<T>(action:()=>Promise<T>){
 let calls=0;const original=DOMParser.prototype.parseFromString;
 DOMParser.prototype.parseFromString=function(...args:Parameters<typeof original>){calls++;return original.apply(this,args);};
 try{return {value:await action(),calls};}finally{DOMParser.prototype.parseFromString=original;}
}
function titled(title:string){const files=unzipSync(legacy),manifest=JSON.parse(strFromU8(files['manifest.json'])) as Manifest;
 delete files['manifest.json'];manifest.metadata.title=title;return archivePackage(manifest,files);}

test('first admission is cold; exact reuse is private and every return has fresh members and companions',async()=>{
 const session=new PackageAdmissionSession(),cold=await parsing(()=>session.import(linked)),p=cold.value;
 assert.ok(cold.calls>0);assert.equal(session.retained.entries,1);assert.ok(session.retained.bytes<=64*1024*1024);
 const companion=await selectPresentation(p,'janko-four-row');
 p.score.notes[0].durationTicks++;p.pages[0]='changed';p.files[p.manifest.pages[0]].fill(0);p.seats[0].ownerIds.length=0;p.manifest.metadata.title='changed';
 companion.score.notes.length=0;companion.pages.length=0;companion.files['source-score.json'].fill(0);
 const hit=await parsing(()=>session.import(linked,{keyboardLayout:'conventional-piano'})),fresh=await importPackage(linked);
 assert.equal(hit.calls,0);assert.notEqual(hit.value,p);assert.deepEqual(hit.value,fresh);
 const other=await selectPresentation(hit.value,'janko-four-row'),coldOther=await selectPresentation(fresh,'janko-four-row');
 assert.deepEqual(other,coldOther);assert.notEqual(other,companion);assert.notEqual(hit.value.files['source-score.json'],fresh.files['source-score.json']);
});

test('caller bytes and effective options are captured before awaits; strict tempo admission never borrows legacy permission',async()=>{
 const session=new PackageAdmissionSession(),input=legacy.slice(),options={allowLegacyTempo:true},pending=session.import(input,options);
 input.fill(0);options.allowLegacyTempo=false;
 const admitted=await pending;assert.ok(admitted.score.notes.length);assert.deepEqual(admitted,await importPackage(legacy,{allowLegacyTempo:true}));
 await assert.rejects(session.import(legacy),/tempo|reference/i);
 assert.equal((await parsing(()=>session.import(legacy,{allowLegacyTempo:true}))).calls,0);
});

test('same-size changed archive bytes cannot hit; a different view selects only a genuinely admitted companion',async()=>{
 const session=new PackageAdmissionSession();await session.import(linked);
 const altered=linked.slice();altered.fill(0);
 await assert.rejects(session.import(altered),/zip|manifest|format/i);
 assert.equal((await parsing(()=>session.import(linked,{keyboardLayout:'janko-four-row'}))).calls,0);
 const single=new PackageAdmissionSession();await single.import(legacy,{allowLegacyTempo:true});
 await assert.rejects(single.import(legacy,{allowLegacyTempo:true,keyboardLayout:'conventional-piano'}),/compatible|keyboard/i);
});

test('concurrent exact misses coalesce admission but never share returned graphs; a fresh session is cold',async()=>{
 const session=new PackageAdmissionSession(),once=await parsing(()=>session.import(legacy,{allowLegacyTempo:true}));session.clear();
 const concurrent=await parsing(()=>Promise.all([session.import(legacy,{allowLegacyTempo:true}),session.import(legacy,{allowLegacyTempo:true})]));
 assert.equal(concurrent.calls,once.calls);const [a,b]=concurrent.value;assert.notEqual(a,b);assert.notEqual(a.files[a.manifest.font],b.files[b.manifest.font]);
 a.pages.length=0;assert.ok(b.pages.length>0);
 assert.equal((await parsing(()=>new PackageAdmissionSession().import(legacy,{allowLegacyTempo:true}))).calls,once.calls);
});

test('only one distinct cold producer is admitted, including across clear; identical work still coalesces',async()=>{
 const session=new PackageAdmissionSession(),a=titled('producer'),b=titled('distinct'),
  proof=await parsing(async()=>{
   const first=session.import(a,{allowLegacyTempo:true}),same=session.import(a,{allowLegacyTempo:true});
   assert.equal(session.retained.pending,1);
   await assert.rejects(session.import(b,{allowLegacyTempo:true}),/admission is busy/);
   session.clear();assert.equal(session.retained.pending,1);
   await assert.rejects(session.import(a,{allowLegacyTempo:true}),/admission is busy/);
   const [p,q]=await Promise.all([first,same]);assert.notEqual(p,q);
   assert.deepEqual(session.retained,{entries:0,bytes:0,pending:0});
  }),single=await parsing(()=>new PackageAdmissionSession().import(a,{allowLegacyTempo:true}));
 assert.equal(proof.calls,single.calls);
 assert.ok((await session.import(b,{allowLegacyTempo:true})).score.notes.length);
});

test('entry/material budgets evict exactly and clear prevents an in-flight admission repopulating',async()=>{
 const a=titled('a'),b=titled('b'),c=titled('c'),session=new PackageAdmissionSession();
 await session.import(a,{allowLegacyTempo:true});await session.import(b,{allowLegacyTempo:true});await session.import(c,{allowLegacyTempo:true});
 assert.equal(session.retained.entries,2);assert.equal((await parsing(()=>session.import(b,{allowLegacyTempo:true}))).calls,0);
 assert.ok((await parsing(()=>session.import(a,{allowLegacyTempo:true}))).calls>0);
 for(const limits of [{maxRetainedBytes:1},{maxEntries:0},{maxEntries:NaN},{maxRetainedBytes:Infinity}]){
  const tiny=new PackageAdmissionSession(limits);await tiny.import(legacy,{allowLegacyTempo:true});assert.equal(tiny.retained.entries,0);
 }
 const active=new PackageAdmissionSession(),pending=active.import(legacy,{allowLegacyTempo:true});assert.equal(active.retained.pending,1);active.clear();
 await pending;assert.deepEqual(active.retained,{entries:0,bytes:0,pending:0});
 assert.ok((await parsing(()=>active.import(legacy,{allowLegacyTempo:true}))).calls>0);active.clear();assert.equal(active.retained.bytes,0);
});
