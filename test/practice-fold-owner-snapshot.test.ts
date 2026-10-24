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
import {practiceSpanEvidenceKey} from '../src/practice-equivalence';
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
 // The folded score shows each exercise's credit as the written-out one shows its music: the best of the
 // written-out exercises with that music. Its own exercises have nothing yet under this new fold.
 const credit=(a:typeof written)=>{const all=passageHierarchy(a.plan,a.state).all,byMusic=new Map<string,number>();
  for(const c of all.values()){const music=practiceSpanEvidenceKey(a.plan,c);if(music)byMusic.set(music,Math.max(byMusic.get(music)??0,attainedRate(a.state,c.pattern,c.id)));}
  return {all,byMusic};};
 const creditMatches=(a:typeof written,b:typeof folded)=>{const w=credit(a),f=credit(b);let shared=0;
  for(const c of f.all.values()){const music=practiceSpanEvidenceKey(b.plan,c),expected=music?w.byMusic.get(music):undefined;if(expected!==undefined)shared++;
   assert.equal(attainedRate(b.state,c.pattern,c.id),expected??0,`folded bars ${c.firstBar}–${c.lastBar}`);}
  return shared;};
 assert.ok(creditMatches(written,folded)>0,'the folded score shares music with the written-out one');
 // The same holds with credit given in the written-out journal, so the comparison is not of two empty journals.
 const practised=structuredClone(written.state),twin=sections(written).find(w=>sections(folded).some(f=>practiceSpanEvidenceKey(folded.plan,f)===practiceSpanEvidenceKey(written.plan,w)))!;
 practised.working=Math.max(...[...credit(written).byMusic.values()],0)+7;passed(twin,practised);
 const creditedRaw=json(practised),credited=[admitPracticeContext(p,creditedRaw,undefined,personal),admitPracticeContext(edition,creditedRaw,undefined,personal,undefined,false,source)] as const;
 assert.ok(attainedRate(credited[0].state,twin.pattern,twin.id)>0);creditMatches(...credited);
 // Saving there leaves the written-out journal as it was, and adds nothing while the fold has nothing of its own.
 const saved=readPractice(json(folded.journal!.written(folded.plan,structuredClone(folded.state))),written.plan);
 assert.deepEqual(json(without(saved)),json(without(readPractice(raw,written.plan))));
 assert.equal(JSON.stringify(saved.folded),JSON.stringify(readPractice(raw,written.plan).folded),'other folds\' records are kept as they were');
 // A folded section no written-out section matches (printed bars 12–14) keeps its credit with the fold.
 const own=structuredClone(folded.state),plan=folded.plan,c=sections(folded).find(c=>c.firstBar===11)!;own.working=40;passed(c,own);
 const back=json(folded.journal!.written(plan,own)),fresh=planPractice(edition,'bounded-exercises-v1',personal,savedPlayerTempo(p.score,back));
 readPractice(back,written.plan);
 assert.equal(Object.keys(back.folded).at(-1),'no13-fold');
 // The journal grows by that section's record (its credit and working tempo, each under the section's music), not by a copy of the folded state.
 const growth=JSON.stringify(back).length-JSON.stringify(raw).length,record=JSON.stringify(back.folded['no13-fold']).length;
 assert.ok(growth<=record+100&&record<3*JSON.stringify(c.pattern).length,`grew by ${growth} characters`);
 if(process.env.SCORE_VIEWER_REPORT)console.log(JSON.stringify({rawBytes:JSON.stringify(raw).length,savedBytes:JSON.stringify(back).length,growth,keys:Object.fromEntries(Object.entries(back.folded['no13-fold']).map(([k,v])=>[k,Object.keys(v as object).length]))}));
 const again=foldedPracticeJournal(back,fresh,{key:'no13-fold',written:written.plan})!,same=passageHierarchy(fresh,again).all.get(c.id)!;
 assert.equal(attainedRate(again,same.pattern,same.id),40);
});
