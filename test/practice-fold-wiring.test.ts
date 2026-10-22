import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {stripTypeScriptTypes} from 'node:module';import {runInNewContext} from 'node:vm';

// The production methods, run without notation or audio: which journal a folded score's practice reads and saves.
const view=readFileSync(new URL('../src/practice-view.ts',import.meta.url),'utf8'),main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
const slice=(source:string,start:string,end:string)=>{const first=source.indexOf(start),last=source.indexOf(end,first+start.length);assert.ok(first>=0&&last>first,`Missing ${start}`);return source.slice(first,last);};

test('the folded edition practises in the score\'s one journal, named and read for the stored edition', ()=>{
 const context:any={livePersonalEditors:new WeakMap()};
 runInNewContext(stripTypeScriptTypes(slice(main,'function practiceSource(','\nfunction performedScore(')),context);
 const stored={sourceSha256:'stored'},target:any={package:stored,personal:{who:'player'}},edition={sourceSha256:'folded'},practice={},folded={};
 context.livePersonalEditors.set(target,{view:{verbatimFold:{practice,edition,practiceKey:'fold of stored',personal:()=>folded}}});
 const source=context.practiceSource(target);
 assert.equal(source.view,practice);assert.equal(source.base,edition);assert.equal(source.personal,folded);
 assert.equal(source.fold.key,'fold of stored','kept under the fold, not its engraving');assert.equal(source.fold.written,stored);assert.equal(source.fold.personal,target.personal);
 const plain:any={package:stored,personal:{}};assert.equal(context.practiceSource(plain).fold,undefined);
 // Practice opens and is admitted again after a hand choice with the fold.
 assert.match(main,/fold:source\.fold/);assert.match(slice(main,'async function refreshPersonalPractice(','\n}\n'),/prepareContext\(source\.base,target\.entry\.id,context,source\.personal,undefined,undefined,source\.fold\)/);
 assert.match(view,/savedJournal\(fold\?\.written\?\?p,entryId\),context,personal,chosenTempo,fingersOnly\|\|!!context\?\.fingersOnly,fold\)/);
});

function saving(fold:boolean){
 const writes:{name:string;value:unknown}[]=[],saved:unknown[][]=[],context:any={structuredClone,practiceStorageName:(_:string,p:{name:string})=>p.name,writeJson:async(name:string,value:unknown)=>{writes.push({name,value});},reconcilePassages(){}};
 runInNewContext(stripTypeScriptTypes(`class SaveView {${slice(view,' private save(recordWorking=true){',' private ')}};globalThis.SaveView=SaveView;`),context);
 const v:any=Object.create(context.SaveView.prototype),written={name:'stored'},journal={written:(plan:unknown,after:unknown)=>({journal:'written-out',plan,after}),saved:(...args:unknown[])=>saved.push(args)};
 Object.defineProperty(v,'basePackage',{get:()=>({name:fold?'folded':'stored'})});
 Object.assign(v,{options:{entryId:'no13',...(fold?{fold:{written}}:{})},plan:'folded plan',state:{working:24,workingByPattern:{}},saved:Promise.resolve(),...(fold?{journal}:{}),
  cancelTempoHold(){},contacts:{clear(){}},stopClock(){},paintVisibility(){},paintControls(){},status(){}});
 return {v,writes,saved};
}
test('a folded score saves its practice in written-out terms to the stored edition\'s journal; a score that doesn\'t fold saves as before', async()=>{
 const {v,writes,saved}=saving(true);assert.equal(await v.save(),true);
 assert.deepEqual(writes,[{name:'stored',value:{journal:'written-out',plan:'folded plan',after:{working:24,workingByPattern:{}}}}]);
 assert.equal(saved.length,1);assert.deepEqual(saved[0][0],{working:24,workingByPattern:{}});assert.equal(saved[0][1],writes[0].value);
 const plain=saving(false);assert.equal(await plain.v.save(),true);
 assert.deepEqual(plain.writes,[{name:'stored',value:{working:24,workingByPattern:{}}}]);
});
