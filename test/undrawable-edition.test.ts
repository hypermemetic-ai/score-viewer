import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {unzipSync} from 'fflate';
import {hashBytes,importPackage} from '../src/package';
import {collectionId,type Entry} from '../src/state';
import {drawableEarlierEdition} from '../src/retained-editions';
import {undrawableCalculatedEdition,UNDRAWABLE_CALCULATED_EDITION} from '../src/undrawable-edition';
import {HandPresentationError} from '../vendor/iso-notation/src/score-presentation';

const fixture=async(name:string)=>{const bytes=new Uint8Array(readFileSync(new URL(`../fixtures/${name}.isoscore`,import.meta.url)));return {bytes,file:`package-${await hashBytes(bytes)}.isoscore`};};
const source=await fixture('authored-preparation-v1'),calculated=await fixture('authored-calculated-preparation-v2'),
 sourceId=collectionId(await importPackage(source.bytes,{allowLegacyTempo:true})),
 current=`package-${'a'.repeat(64)}.isoscore`,
 reader=(files:{bytes:Uint8Array;file:string}[])=>{const reads:string[]=[];return {reads,async read(name:string){reads.push(name);return files.find(f=>f.file===name)?.bytes??null;}};};
// A failure names the case without diffing a whole score package.
const none=(found:unknown)=>assert.ok(found===undefined,'no earlier edition is chosen');
const entry=(id:string,retainedPackages:string[],extra:Partial<Entry>={}):Entry=>({id,file:current,metadata:{title:'Test',composer:'',provenance:[]},importedAt:'now',retainedPackages,...extra});

test('only an incompatible saved calculated recipe counts as an undrawable calculated edition',()=>{
 assert.equal(undrawableCalculatedEdition(new HandPresentationError('incompatible-recipe','old connector')),true);
 assert.equal(undrawableCalculatedEdition(new HandPresentationError('unsupported-fit','unadmitted ink')),false);
 assert.equal(undrawableCalculatedEdition(Error('incompatible-recipe')),false);
 assert.doesNotMatch(UNDRAWABLE_CALCULATED_EDITION,/Calculate fingers/);
});

test('the newest earlier edition with the score’s own hands opens, on a keyboard it has, without reading the current edition',async()=>{
 const host=reader([source]),found=await drawableEarlierEdition(host,entry(sourceId,[source.file,`package-${'b'.repeat(64)}.isoscore`,current]),['conventional-piano','janko-four-row']);
 assert.ok(found);assert.deepEqual(found.packageBytes,source.bytes);assert.equal(found.package.keyboardLayout,'janko-four-row');
 assert.equal(host.reads.includes(current),false,'the refused current edition stays unread and untouched');
});

test('an edition with calculated hands on any keyboard, another source or another pitch is never chosen',async()=>{
 // Read from the manifest: whether this edition still draws depends on the engraving pin.
 const calculatedId=JSON.parse(new TextDecoder().decode(unzipSync(calculated.bytes)['manifest.json'])).sourceRevision as string;
 none(await drawableEarlierEdition(reader([calculated]),entry(calculatedId,[calculated.file]),['janko-four-row']));
 none(await drawableEarlierEdition(reader([source]),entry(`${'f'.repeat(64)}`,[source.file]),['janko-four-row']));
 const shifted=entry(sourceId,[source.file],{transposition:{version:'score-transposition-selection-v1',steps:1,editions:{'0':{'janko-four-row':source.file},'1':{'janko-four-row':current}}}});
 none(await drawableEarlierEdition(reader([source]),shifted,['janko-four-row']));
});

test('an earlier edition that fails the caller’s opening check is skipped, so the library never switches to it',async()=>{
 const checked:string[]=[];
 none(await drawableEarlierEdition(reader([source]),entry(sourceId,[source.file]),['janko-four-row'],async edition=>{checked.push(edition.package.archiveSha256!);return false;}));
 assert.deepEqual(checked,[source.file.slice(8,-9)]);
});
