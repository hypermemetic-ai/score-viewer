import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {importPackage,selectPresentation,type ScorePackage} from '../src/package';
import {rebuildEdition} from '../src/edition-rebuild';
import {initialPersonal} from '../src/state';
import {verbatimRepeats} from '../src/repeat-fold';
import {passageHierarchy,passed,planPractice,readPractice,type PracticeState} from '../src/practice';
import {attainedRate} from '../src/practice-attainment';
import {admitPracticeContext} from '../src/practice-context';
import {foldedPracticeJournal} from '../src/practice-fold-journal';
import {savedPlayerTempo} from '../src/player-tempo';

// A private data copy holding Schumann Op. 68 No. 13 and its practice journal, read only. Its library
// id is given with it, so no private identifier lives in the repository.
const dir=process.env.SCORE_VIEWER_OWNER_SNAPSHOT,NO13=process.env.SCORE_VIEWER_SNAPSHOT_NO13;
const json=(s:unknown)=>JSON.parse(JSON.stringify(s));
const without=({folded:_,...rest}:PracticeState)=>rest;

test('a saved No. 13 practice shows on the folded score as on the written-out one, and opening it there changes nothing written out', {skip:!(dir&&NO13)&&'set SCORE_VIEWER_OWNER_SNAPSHOT to a private data copy and SCORE_VIEWER_SNAPSHOT_NO13 to its No. 13 library id'}, async()=>{
 const files=readdirSync(dir!),library=JSON.parse(readFileSync(join(dir!,'library.json'),'utf8')),entry=library.entries.find((e:{id:string})=>e.id===NO13);
 // A saved edition the pinned engraving refuses is engraved again from its own
 // content when it is first opened, as the reader does (docs/saved-edition-reengraving.md).
 const bytes=new Uint8Array(readFileSync(join(dir!,entry.file))),
  opened=await importPackage(bytes,{allowLegacyTempo:true}).catch(async refusal=>importPackage((await rebuildEdition(bytes,{refusal})).bytes,{allowLegacyTempo:true}));
 const p=await selectPresentation(opened,'janko-four-row'),raw=JSON.parse(readFileSync(join(dir!,files.find(f=>f.startsWith(`practice-${NO13}-janko-four-row-`))!),'utf8'));
 const personal=initialPersonal(p),fold=verbatimRepeats(p,personal)?.fold;assert.ok(fold,'No. 13 folds');
 const edition:ScorePackage={...p,score:fold.score,sourceScore:fold.score},source={key:'no13-fold',written:p,personal};
 const written=admitPracticeContext(p,raw,undefined,personal),folded=admitPracticeContext(edition,raw,undefined,personal,undefined,false,source);
 const settings=(s:PracticeState)=>[s.working,s.start,s.connectionStart,s.target,s.personalGoal?.bpm,s.step,s.countInBars,s.resumeCooldownSeconds,s.keepTempo,s.audioOutput];
 // The saved settings are read, not defaulted: the written-out practice holds the journal's own values, and the fold the same.
 assert.deepEqual(settings(written.state),[raw.working,raw.start,raw.connectionStart,raw.target,raw.personalGoal?.bpm,raw.step,raw.countInBars,raw.resumeCooldownSeconds,raw.keepTempo,raw.audioOutput]);
 assert.deepEqual(settings(folded.state),settings(written.state));
 const sections=(a:typeof written)=>[...passageHierarchy(a.plan,a.state).all.values()].filter(c=>c.kind==='section');
 assert.equal(sections(written).length,15);assert.equal(sections(folded).length,8);
 // Nothing is credited yet in the written-out journal, so the folded score claims nothing either.
 for(const a of [written,folded])for(const c of passageHierarchy(a.plan,a.state).all.values())assert.equal(attainedRate(a.state,c.pattern,c.id),0);
 // Saving there leaves the written-out journal as it was, and adds nothing while the fold has nothing of its own.
 const saved=readPractice(json(folded.journal!.written(folded.plan,structuredClone(folded.state))),written.plan);
 assert.deepEqual(json(without(saved)),json(without(readPractice(raw,written.plan))));
 assert.equal(saved.folded,undefined);
 // A folded section no written-out section matches (printed bars 12–14) keeps its credit with the fold.
 const own=structuredClone(folded.state),plan=folded.plan,c=sections(folded).find(c=>c.firstBar===11)!;own.working=40;passed(c,own);
 const back=json(folded.journal!.written(plan,own)),fresh=planPractice(edition,'bounded-exercises-v1',personal,savedPlayerTempo(p.score,back));
 readPractice(back,written.plan);
 assert.deepEqual(Object.keys(back.folded),['no13-fold']);
 // The journal grows by that section's record (its credit and working tempo, each under the section's music), not by a copy of the folded state.
 const growth=JSON.stringify(back).length-JSON.stringify(raw).length,record=JSON.stringify(back.folded['no13-fold']).length;
 assert.ok(growth<=record+100&&record<3*JSON.stringify(c.pattern).length,`grew by ${growth} characters`);
 if(process.env.SCORE_VIEWER_REPORT)console.log(JSON.stringify({rawBytes:JSON.stringify(raw).length,savedBytes:JSON.stringify(back).length,growth,keys:Object.fromEntries(Object.entries(back.folded['no13-fold']).map(([k,v])=>[k,Object.keys(v as object).length]))}));
 const again=foldedPracticeJournal(back,fresh,{key:'no13-fold',written:written.plan})!,same=passageHierarchy(fresh,again).all.get(c.id)!;
 assert.equal(attainedRate(again,same.pattern,same.id),40);
});
