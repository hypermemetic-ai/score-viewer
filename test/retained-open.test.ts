import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
const open=stripTypeScriptTypes(source.slice(source.indexOf('async function open('),source.indexOf('\nasync function chooseGuitarProTracks(')));
async function run(status:string,changed=false,wrongCollection=false){
 const entry={id:'source',file:'retained.isoscore',personalFiles:{journal:'original.json'}},data=new Uint8Array([1,2,3]),personal={overrides:{owner:{hand:'LH',finger:2}},history:['retained']};
 const p={availablePresentations:['janko-four-row'],manifest:{version:1},collection:'source'},q={status,package:p,personal,packageBytes:changed?new Uint8Array([1,2,4]):new Uint8Array(data)};
 const calls:string[]=[],op={keyboard:'janko-four-row'},context:any={
  beginReading:()=>op,openingLoading:()=>undefined,scoreCapabilities:()=>({pianoPreparation:true}),getScoreTransposition:()=>0,keyboardLabel:(layout:string)=>layout,readingCheckpoint:async()=>{},practice:undefined,savePersonal:async()=>{},checkReading(){},
  host:{read:async()=>data,fullscreen:async()=>{}},admitReading:async()=>p,assertSelectedTransposition(){},selectPresentation:async()=>p,
  loadPersonal:async()=>personal,prepareScore:async()=>({q,running:{}}),collectionId:()=>wrongCollection?'other':'source',
  installPreparedScore:async()=>{calls.push('install');if(wrongCollection)throw Error('Calculated score belongs to a different source.');return {entry,personal};},
  activateScore:async(next:any)=>{calls.push('activate');assert.equal(next.entry,entry);assert.equal(next.personal,personal);return next;},saveReadingPreferences:async()=>{},checkReadingOwner(){},notify(){},finishReading(_op:any,success:boolean){calls.push(success?'complete':'failed');},
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
