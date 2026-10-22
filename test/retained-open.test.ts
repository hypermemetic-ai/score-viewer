import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
const open=stripTypeScriptTypes(source.slice(source.indexOf('async function open('),source.indexOf('\nasync function chooseGuitarProTracks(')));
async function run(status:string,changed=false,wrongCollection=false){
 const entry={id:'source',file:'retained.tuna',personalFiles:{journal:'original.json'}},data=new Uint8Array([1,2,3]),personal={overrides:{owner:{hand:'LH',finger:2}},history:['retained']};
 const p={availablePresentations:['janko-four-row'],manifest:{version:1},collection:'source'},q={status,package:p,personal,packageBytes:changed?new Uint8Array([1,2,4]):new Uint8Array(data)};
 const calls:string[]=[],op={keyboard:'janko-four-row'},context:any={
  beginReading:()=>op,openingLoading:()=>undefined,scoreCapabilities:()=>({pianoPreparation:true}),getScoreTransposition:()=>0,keyboardLabel:(layout:string)=>layout,readingCheckpoint:async()=>{},practice:undefined,savePersonal:async()=>{},checkReading(){},
  host:{read:async()=>data,fullscreen:async()=>{}},importReading:async()=>p,admitReadingSource:async()=>{},assertSelectedTransposition(){},selectPresentation:async()=>p,
  loadPersonal:async()=>personal,prepareScore:async()=>({q,running:{}}),collectionId:()=>wrongCollection?'other':'source',
  installPreparedScore:async()=>{calls.push('install');if(wrongCollection)throw Error('Calculated score belongs to a different source.');return {entry,personal};},
  activateScore:async(next:any)=>{calls.push('activate');assert.equal(next.entry,entry);assert.equal(next.personal,personal);return next;},saveReadingPreferences:async()=>{},checkReadingOwner(){},notify(){},clearNotice(){},finishReading(_op:any,success:boolean){calls.push(success?'complete':'failed');},
 };
 runInNewContext(open,context);let error:unknown;try{await context.open(entry);}catch(e){error=e;}
 return {calls,error,entry,personal};
}
test('actual retained reading, ready and editable opens preserve pointers and choices without installing versions',async()=>{
 for(const status of ['reading','ready','editable']){const f=await run(status);assert.equal(f.error,undefined);assert.deepEqual(f.calls,['activate','complete']);assert.equal(f.entry.personalFiles.journal,'original.json');assert.equal(f.personal.overrides.owner.hand,'LH');}
});
test('actual changed preparation keeps the installation path even when its byte count is unchanged',async()=>{
 const f=await run('ready',true);assert.equal(f.error,undefined);assert.deepEqual(f.calls,['install','activate','complete']);
});
test('actual identical bytes cannot bypass the source collection gate',async()=>{
 const f=await run('ready',false,true);assert.match(String(f.error),/different source/);assert.deepEqual(f.calls,['install','failed']);
});

// A Guitar Pro reading: its archive admits, then its source is checked.
function reading(overrides:Record<string,unknown>){
 const entry={id:'part',file:'part.tuna'},p={manifest:{version:3},reading:{dual:{}}},calls:string[]=[],op={keyboard:'janko-four-row',controller:new AbortController()},context:any={
  beginReading:()=>op,openingLoading:()=>undefined,readingCheckpoint:async()=>{},practice:undefined,savePersonal:async()=>{},checkReading(){},checkReadingOwner(){},
  host:{read:async()=>new Uint8Array([1]),fullscreen:async()=>{}},importReading:async()=>p,admitReadingSource:async()=>{calls.push('source');},
  readingProgress:(_op:unknown,step:string)=>calls.push(step),readingExecution:()=>({}),
  reengraveReadingArchive:async()=>{calls.push('engraved');return new Uint8Array([2]);},
  admitReading:async()=>{calls.push('admit-again');return p;},guitarProContext:()=>({groupId:'group'}),
  assertSelectedTransposition(){},selectPresentation:async()=>p,loadPersonal:async()=>({}),prepareScore:async()=>({q:{package:p,packageBytes:new Uint8Array([1])},running:{}}),
  collectionId:()=>'part',installPreparedScore:async()=>({entry,personal:{}}),activateScore:async(next:any)=>next,saveReadingPreferences:async()=>{},notify:(text:string)=>calls.push(text),clearNotice(){},
  finishReading(_op:unknown,success:boolean){calls.push(success?'complete':'failed');},...overrides,
 };
 runInNewContext(open,context);
 return {calls,open:(group?:string)=>context.open(entry,group).then(()=>undefined,(error:unknown)=>error)};
}
test('a Guitar Pro source refusal after the archive admits is shown, never answered by engraving the archive again',async()=>{
 const f=reading({admitReadingSource:async()=>{throw Error('Receiving dual admission does not match the converted source');}});
 assert.match(String(await f.open()),/does not match the converted source/);
 assert.ok(!f.calls.includes('engrave-again')&&!f.calls.includes('engraved'));assert.deepEqual(f.calls.slice(-1),['failed']);
});
test('a reading engraved again is opened with its Guitar Pro source and part group checked',async()=>{
 const refused=()=>{throw Error('Reading page differs from its shared source preparation');};
 const f=reading({importReading:async()=>refused()});
 assert.equal(await f.open('group'),undefined);
 assert.deepEqual(f.calls.filter(c=>['engraved','admit-again','complete'].includes(c)),['engraved','admit-again','complete']);
 const other=reading({importReading:async()=>refused()});
 assert.match(String(await other.open('another-group')),/belongs to another original input/);
});

// Saved Goldberg pages that only lack Bach's repeat signs: engraving them again
// can fail, and then the score opens on its saved pages instead of not at all.
class SavedPagesLackRepeats extends Error{constructor(readonly sourceSha256:string){super('This saved engraving lacks the score\'s repeat signs.');}}
function lacksRepeats(rebuild:()=>Promise<unknown>,refusal:Error=new SavedPagesLackRepeats('goldberg')){
 let refused=false;const kept:string[]=[];
 const f=reading({SavedPagesLackRepeats,keepSavedPagesWithoutRepeats:(sha:string)=>kept.push(sha),reengraveReadingArchive:async()=>undefined,
  importReading:async()=>{if(!refused){refused=true;throw refusal;}return {manifest:{version:3},reading:{dual:{}}};},
  prepareRebuiltEdition:rebuild});
 return {...f,kept};
}
test('saved pages that lack their repeat signs open as saved, with a plain notice, when engraving them again fails',async()=>{
 const f=lacksRepeats(async()=>{throw Error('The engine refused the edition');});
 assert.equal(await f.open(),undefined);assert.deepEqual(f.kept,['goldberg']);
 assert.deepEqual(f.calls.filter(c=>c==='complete'||c.includes('repeat signs')),['complete','This score’s repeat signs couldn’t be engraved, so it opened on its saved pages without them.']);
});
test('any other refusal whose engraving again fails still keeps the score from opening',async()=>{
 const f=lacksRepeats(async()=>{throw Error('The engine refused the edition');},Error('This saved engraving does not match the current shared engraving policy.'));
 assert.match(String(await f.open()),/engine refused/);assert.deepEqual(f.kept,[]);assert.deepEqual(f.calls.slice(-1),['failed']);
});
