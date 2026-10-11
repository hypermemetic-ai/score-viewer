import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceFixture} from './support/reference-score';
import {planPractice,initialPractice,readPractice,setPracticeGoal,progressFor,totalProgress,passed,PracticeSession,GroundworkSession,reconcilePassages,passageHierarchy,passageComponents,passageStartTempo,nextPracticePassage,practicePercent,wholePracticeProgress} from '../src/practice';
const pkg=await referenceFixture(new URL('../vendor/iso-notation/public/review/schumann-op68-no14-current-fingers.isoscore',import.meta.url)),plan=planPractice(pkg,'connection-boundary-v1');
const earn=(s:ReturnType<typeof initialPractice>,index:number,bpm=s.target)=>{s.best[plan.chunks[index].pattern]=bpm;};
test('mastered adjacent leaves select independent1–8 before9–12; source and constituents survive',()=>{
 const before=JSON.stringify(pkg.score),s=initialPractice(plan);earn(s,0);earn(s,1);const joined=nextPracticePassage(plan,s,plan.chunks[1])!;
 assert.equal(joined.id,'1-8');assert.deepEqual(joined.components,['1-4','5-8']);assert.equal(progressFor(joined,s),0);assert.equal(joined.weight,plan.chunks[0].weight+plan.chunks[1].weight);assert.equal(joined.start,plan.chunks[0].start);assert.equal(joined.end,plan.chunks[1].end);assert.deepEqual(passageComponents(plan,s,joined).map(c=>c.id),['1-4','5-8']);assert.equal(passageStartTempo(plan,s,joined),90);assert.equal(JSON.stringify(pkg.score),before);
 const r=new PracticeSession(plan,joined,s,true);assert.deepEqual(r.events,plan.attacks.filter(a=>a.tick>=joined.start&&a.tick<joined.end));assert.equal(new Set(r.events.map(a=>a.id)).size,r.events.length);
 s.working=120;passed(joined,s);assert.equal(progressFor(plan.chunks[0],s),1);assert.equal(progressFor(joined,s),.7);assert.equal(nextPracticePassage(plan,s,joined)?.id,'1-8');
});
test('growth repeats all old joins plus new join and never infers full-run mastery',()=>{
 const s=initialPractice(plan);earn(s,0);earn(s,1);const first=nextPracticePassage(plan,s,plan.chunks[1])!;s.best[first.pattern]=180;
 assert.equal(nextPracticePassage(plan,s,first)?.id,'9-12');earn(s,2);const larger=nextPracticePassage(plan,s,plan.chunks[2])!;assert.equal(larger.id,'1-12');assert.deepEqual(larger.joins,[3,7]);assert.equal(progressFor(larger,s),0);
 const prep=new GroundworkSession(plan,larger);assert.deepEqual([...new Set(prep.steps.flatMap(step=>step.events.map(a=>a.bar)))],[3,4,7,8]);assert.ok(prep.steps.some(step=>step.groups.some(g=>g.startsWith('3:'))&&step.groups.some(g=>g.startsWith('4:'))));assert.ok(prep.steps.some(step=>step.groups.some(g=>g.startsWith('7:'))&&step.groups.some(g=>g.startsWith('8:'))));for(const step of prep.steps){assert.equal(new Set(step.events.map(a=>a.id)).size,step.events.length);assert.ok(step.events.every((a,i)=>!i||a.tick>=step.events[i-1].tick));}while(!prep.complete)prep.confirm();assert.equal(s.best[larger.pattern],undefined);assert.deepEqual(passageComponents(plan,s,larger).map(c=>c.id),['1-8','1-4','5-8','9-12']);
});
test('separated mastered ranges cannot invent gaps or composite coverage',()=>{
 const s=initialPractice(plan);earn(s,0);earn(s,2);const tree=reconcilePassages(plan,s);assert.ok(!tree.all.has('1-12'));assert.ok(!tree.all.has('1-8'));assert.equal(nextPracticePassage(plan,s,plan.chunks[0])?.id,'5-8');assert.throws(()=>readPractice({...s,composites:{'1-12':['1-4','9-12']}},plan),/adjacent/);
});
test('source-bound joined evidence reloads; goal changes preserve history and recompute prerequisites',()=>{
 const s=initialPractice(plan);earn(s,0);earn(s,1);const joined=nextPracticePassage(plan,s,plan.chunks[1])!;s.best[joined.pattern]=180;s.groundwork={[joined.pattern]:true};s.workingByPattern[joined.pattern]=160.2;const encoded=JSON.stringify(s),loaded=readPractice(JSON.parse(encoded),plan);assert.deepEqual(loaded,s);assert.equal(passageStartTempo(plan,loaded,joined),90);
 const raised=setPracticeGoal(loaded,plan,240);assert.equal(raised.best[joined.pattern],180);assert.deepEqual(raised.composites,s.composites);assert.equal(progressFor(joined,raised),.775);assert.equal(nextPracticePassage(plan,{...raised,keepTempo:false}, {...plan.chunks[2],pattern:'already-done'} )?.id,'9-12');
 // Reassess a just-mastered outside leaf: default returns the unfinished constituent before its parent.
 raised.best[plan.chunks[2].pattern]=240;assert.equal(nextPracticePassage(plan,raised,plan.chunks[2])?.id,'1-4');assert.equal(JSON.stringify(s),encoded);assert.throws(()=>readPractice(s,{...plan,revision:'another-source'}),/retained/);
});
test('leaf-only100% creates unassessed parents; frontier counts each written bar once',()=>{
 const s=initialPractice(plan);for(let i=0;i<plan.chunks.length;i++)earn(s,i);assert.ok(plan.chunks.every(c=>progressFor(c,s)===1));assert.equal(totalProgress(plan,s),1);assert.equal(wholePracticeProgress(plan,s),0);
 let tree=reconcilePassages(plan,s);assert.equal(tree.frontier.reduce((n,c)=>n+c.weight,0),plan.chunks.reduce((n,c)=>n+c.weight,0));
 while(tree.frontier.length>1){for(const c of tree.frontier)s.best[c.pattern]=s.target;tree=reconcilePassages(plan,s);}assert.equal(progressFor(tree.frontier[0],s),0);assert.equal(wholePracticeProgress(plan,s),0);s.best[tree.frontier[0].pattern]=180;assert.equal(wholePracticeProgress(plan,s),1);assert.equal(practicePercent(.999999),99);assert.equal(practicePercent(1),100);
});
test('invalid overlapping saved groupings are rejected without mutating the input',()=>{const s={...initialPractice(plan),composites:{'1-8':['1-4','5-8'],'5-12':['5-8','9-12']}};const before=JSON.stringify(s);assert.throws(()=>readPractice(s,plan),/overlap/);assert.equal(JSON.stringify(s),before);});
test('keep-tempo repeats the same composite while fresh selections use the connection default',()=>{const s=initialPractice(plan);earn(s,0);earn(s,1);const c=nextPracticePassage(plan,s,plan.chunks[1])!;s.keepTempo=true;s.best[c.pattern]=180;s.workingByPattern[c.pattern]=167.25;assert.equal(nextPracticePassage(plan,s,c)?.id,c.id);assert.equal(passageStartTempo(plan,s,c),90);});
