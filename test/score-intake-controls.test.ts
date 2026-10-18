import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,strToU8} from 'fflate';
import {scoreImportKind} from '../src/score-import-kind';
import {ReadingPartCatalog} from '../src/reading-part-catalog';
import {prepareDualReadingPacket} from '../src/dual-reading-package';
import {host} from '../src/host';
import {collectionId,validEntryStorage,type Entry} from '../src/state';
import {authoredFrettedInput} from './support/fretted-dual-fixture';

test('format routing grants no score/source authority and malformed archives refuse before either intake',()=>{
 assert.equal(scoreImportKind(zipSync({'manifest.json':strToU8('{"forged":true}')})),'score');
 assert.equal(scoreImportKind(zipSync({'Content/score.gpif':strToU8('<GPIF/>')})),'guitar-pro');
 assert.equal(scoreImportKind(new Uint8Array([70,73,67,72])),'guitar-pro');
 assert.throws(()=>scoreImportKind(new Uint8Array([80,75,0,0])),/zip|data|invalid|EOF/i);
});
test('generic source labels and descriptive group hints never grant Bass/Guitar picker authority',async()=>{
 const packet=await prepareDualReadingPacket(authoredFrettedInput()),catalog=new ReadingPartCatalog(),entry:Entry={id:collectionId(packet.package),file:`package-${packet.package.archiveSha256}.tuna`,
  importedAt:'2026-10-09',metadata:{title:'Bass',composer:'Guitar',provenance:[]},guitarPro:{version:'guitar-pro-entry-hint-v1',groupId:'a'.repeat(64),inputSha256:'b'.repeat(64),sourceTrackId:'0',sourceName:'Guitar'}};
 assert.equal(validEntryStorage(entry),true);assert.equal(catalog.remember(entry,packet.package),undefined);assert.equal(catalog.context(entry),undefined);
 assert.match(catalog.summary(entry),/^Prepare source part/);assert.match(catalog.control([entry],entry),/Unknown instrument/);assert.deepEqual(catalog.siblings([entry],entry),[]);
 assert.equal(validEntryStorage({...entry,guitarPro:null as never}),false);assert.equal(validEntryStorage({...entry,guitarPro:{...entry.guitarPro!,sourceName:3 as never}}),false);
});
test('browser picker rejects oversized files before allocating bytes and settles file-read errors',async t=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');let reads=0;
 const file={size:50_000_001,arrayBuffer:async()=>{reads++;throw Error('must not read oversized file');}},input={files:[file],type:'',accept:'',onchange:undefined as (()=>Promise<void>)|undefined,
  addEventListener:()=>{},click(){queueMicrotask(()=>void this.onchange?.());}};
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>input}});
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'document',previous);else delete (globalThis as any).document;});
 await assert.rejects(host.pickScore(),/50 MB/);assert.equal(reads,0);assert.match(input.accept,/\.gp/);
 file.size=1;await assert.rejects(host.pickScore(),/must not read/);assert.equal(reads,1);
});
