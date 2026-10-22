import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {importPackage,type ScorePackage} from '../src/package';
import {initialPersonal} from '../src/state';
import {verbatimRepeats} from '../src/repeat-fold';
import {passageHierarchy,passed,planPractice,readPractice,type PracticeState} from '../src/practice';
import {attainedRate} from '../src/practice-attainment';
import {admitPracticeContext} from '../src/practice-context';
import {foldedPracticeJournal} from '../src/practice-fold-journal';
import {savedPlayerTempo} from '../src/player-tempo';

// A copy of the owner's data: Schumann Op. 68 No. 13 and its practice journal. Read only.
const dir=process.env.SCORE_VIEWER_OWNER_SNAPSHOT,NO13='330d4b6908b82b23238f8daa831e1ec0ef81943782b908ad2811931992e37d78';
const json=(s:unknown)=>JSON.parse(JSON.stringify(s));
const without=({folded:_,...rest}:PracticeState)=>rest;

test('the owner\'s No. 13 practice shows on the folded score as on the written-out one, and opening it there changes nothing written out', {skip:!dir&&'set SCORE_VIEWER_OWNER_SNAPSHOT to a copy of the owner\'s data'}, async()=>{
 const files=readdirSync(dir!),library=JSON.parse(readFileSync(join(dir!,'library.json'),'utf8')),entry=library.entries.find((e:{id:string})=>e.id===NO13);
 const p=await importPackage(new Uint8Array(readFileSync(join(dir!,entry.file)))),raw=JSON.parse(readFileSync(join(dir!,files.find(f=>f.startsWith(`practice-${NO13}-janko-four-row-`))!),'utf8'));
 const personal=initialPersonal(p),fold=verbatimRepeats(p,personal)?.fold;assert.ok(fold,'No. 13 folds');
 const edition:ScorePackage={...p,score:fold.score,sourceScore:fold.score},source={key:'no13-fold',written:p,personal};
 const written=admitPracticeContext(p,raw,undefined,personal),folded=admitPracticeContext(edition,raw,undefined,personal,undefined,false,source);
 const settings=(s:PracticeState)=>[s.working,s.start,s.connectionStart,s.target,s.personalGoal?.bpm,s.step,s.countInBars,s.resumeCooldownSeconds,s.keepTempo,s.audioOutput];
 assert.deepEqual(settings(folded.state),settings(written.state));
 assert.deepEqual(settings(folded.state),[24,24,40,80,80,1.6,2,3,false,raw.audioOutput]);
 const sections=(a:typeof written)=>[...passageHierarchy(a.plan,a.state).all.values()].filter(c=>c.kind==='section');
 assert.equal(sections(written).length,15);assert.equal(sections(folded).length,8);
 // The owner has practised no passage to credit yet; the folded score claims none either.
 for(const a of [written,folded])for(const c of passageHierarchy(a.plan,a.state).all.values())assert.equal(attainedRate(a.state,c.pattern,c.id),0);
 // Saving there leaves the written-out journal as it was, adding the fold's own record.
 const saved=readPractice(json(folded.journal!.written(folded.plan,structuredClone(folded.state))),written.plan);
 assert.deepEqual(json(without(saved)),json(without(readPractice(raw,written.plan))));
 assert.deepEqual(Object.keys(saved.folded!),['no13-fold']);
 // A folded section no written-out section matches (printed bars 12–14) keeps its credit with the fold.
 const own=structuredClone(folded.state),plan=folded.plan,c=sections(folded).find(c=>c.firstBar===11)!;own.working=40;passed(c,own);
 const back=json(folded.journal!.written(plan,own)),fresh=planPractice(edition,'bounded-exercises-v1',personal,savedPlayerTempo(p.score,back));
 readPractice(back,written.plan);
 const again=foldedPracticeJournal(back,fresh,{key:'no13-fold',written:written.plan})!,same=passageHierarchy(fresh,again).all.get(c.id)!;
 assert.equal(attainedRate(again,same.pattern,same.id),40);
});
