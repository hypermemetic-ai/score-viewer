import test from 'node:test';import assert from 'node:assert/strict';
import {strToU8,zipSync} from 'fflate';
import {healPitchChoices,strayCandidates} from '../src/pitch-choice-heal';
import type {Entry} from '../src/state';

// Synthetic archives with only what a layout shows: its manifest and member hashes.
const hash=(c:string)=>c.repeat(64),name=(c:string)=>`package-${hash(c)}.tuna`,id=hash('7');
const janko={layoutId:'janko-four-row',score:'score.json',pages:['pages/1.svg'],fingers:'fingers.json',revision:hash('b'),profileSha256:hash('1'),effectiveHandSha256:hash('4')};
const conventional={layoutId:'conventional-piano',score:'conventional-piano/score.json',pages:['conventional-piano/pages/1.svg'],fingers:'conventional-piano/fingers.json',revision:hash('5'),profileSha256:hash('c'),effectiveHandSha256:hash('6')};
const archive=(o:{createdAt:string;page?:string;conventional?:boolean;first?:'janko-four-row'|'conventional-piano'})=>{
 const files:Record<string,string>={'score.json':hash('b'),'pages/1.svg':o.page??hash('e'),'fingers.json':hash('f'),'source-score.json':id};
 if(o.conventional)Object.assign(files,{'conventional-piano/score.json':hash('5'),'conventional-piano/pages/1.svg':hash('9'),'conventional-piano/fingers.json':hash('8')});
 return zipSync({'manifest.json':strToU8(JSON.stringify({format:'iso-score',version:2,scoreId:'synthetic',metadata:{title:'Score'},createdAt:o.createdAt,sourceScore:'source-score.json',sourceSha256:id,
  keyboardLayout:o.first??'janko-four-row',presentations:{'janko-four-row':janko,...(o.conventional?{'conventional-piano':conventional}:{})},files}))});
};
// The edition installed on the way (Jankó only), then the completed edition (both), made seconds apart.
const archives=new Map<string,Uint8Array>([
 [name('0'),archive({createdAt:'2026-10-28T16:00:40Z'})],
 [name('f'),archive({createdAt:'2026-10-28T16:00:42Z',conventional:true})],
 [name('9'),archive({createdAt:'2026-10-18T01:00:00Z',page:hash('d')})],
 [name('a'),archive({createdAt:'2026-10-28T16:00:42Z',conventional:true,first:'conventional-piano'})]]);
const reader=()=>{const reads:string[]=[];return {reads,read:async(n:string)=>{reads.push(n);return archives.get(n)??null;}};};
const jankoChoices={[`state-${id}-janko-four-row-${hash('1')}-${hash('4')}.json`]:`state-version-${hash('d')}.json`},
 conventionalChoices={[`state-${id}-conventional-piano-${hash('c')}-${hash('6')}.json`]:`state-version-${hash('c')}.json`};
const stray:Entry={id,file:name('f'),metadata:{title:'Score'} as Entry['metadata'],importedAt:'2026-10-07T00:00:00.000Z',
 retainedPackages:[name('9'),name('0')],personalFiles:{...jankoChoices,...conventionalChoices},
 editionPersonalFiles:{[name('0')]:{...jankoChoices,[Object.keys(conventionalChoices)[0]!]:`state-version-${hash('e')}.json`}},
 transposition:{version:'score-transposition-selection-v1',steps:0,editions:{'0':{'janko-four-row':name('0'),'conventional-piano':name('f')},'1':{'janko-four-row':name('9')}}}};

test('a choice left on the Jankó-only edition installed on the way names the completed edition, which shows Jankó exactly as it did',async()=>{
 const {read}=reader(),healed=await healPitchChoices(stray,read);
 assert.deepEqual(healed?.transposition?.editions,{'0':{'janko-four-row':name('f'),'conventional-piano':name('f')},'1':{'janko-four-row':name('9')}},'only the stray choice moves; another pitch is left as chosen');
 assert.deepEqual({...healed,transposition:stray.transposition},stray,'nothing else on the entry changes');
 assert.equal(await healPitchChoices(healed!,read),undefined,'a repaired library has nothing left to repair');
});

test('a choice the current edition would show differently is the player\'s and stays',async()=>{
 const {read}=reader(),choose=(file:string,extra:Partial<Entry>={}):Entry=>({...stray,...extra,retainedPackages:[name('9'),name('0'),name('a')],
  transposition:{...stray.transposition!,editions:{...stray.transposition!.editions,'0':{'janko-four-row':file,'conventional-piano':name('f')}}}});
 assert.equal(await healPitchChoices(choose(name('9')),read),undefined,'an Earlier edition with other pages');
 assert.equal(await healPitchChoices(choose(name('0'),{editionPersonalFiles:{[name('0')]:{[Object.keys(jankoChoices)[0]!]:`state-version-${hash('a')}.json`}}}),read),undefined,'other saved choices for that layout');
 assert.equal(await healPitchChoices({...choose(name('0')),file:name('a')},read),undefined,'Jankó not first in the current edition: its members differ in name, so it is not taken as the same');
});

test('no archive is read for an entry with no choice on a retired archive at its own pitch',async()=>{
 const {reads,read}=reader();
 const other:Entry={...stray,transposition:{...stray.transposition!,editions:{...stray.transposition!.editions,'0':{'janko-four-row':name('f'),'conventional-piano':name('f')}}}};
 const notRetained:Entry={...stray,retainedPackages:[name('9')]};
 const away:Entry={...stray,transposition:{...stray.transposition!,steps:1,editions:{...stray.transposition!.editions,'1':{'janko-four-row':name('f')}}}};
 for(const e of [other,notRetained,away,{...stray,transposition:undefined}]){assert.deepEqual(strayCandidates(e),[]);assert.equal(await healPitchChoices(e,read),undefined);}
 assert.deepEqual(reads,[]);
});
