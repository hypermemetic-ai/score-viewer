import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {strToU8} from 'fflate';
import {prepareMusicXmlScore} from '../src/musicxml-import';
import {importPackage,type ScorePackage} from '../src/package';
import {initialPersonal} from '../src/state';
import {verbatimRepeats} from '../src/repeat-fold';
import {initialPractice,passageHierarchy,passed,planPractice,readPractice,resetProgress,transferPracticeEdition,type PracticePassagePlan,type PracticeState} from '../src/practice';
import {attainedRate,toggleDone} from '../src/practice-attainment';
import {FoldedPracticeJournal,foldedPracticeJournal,foldedPracticePreferences,type PracticeFold} from '../src/practice-fold-journal';
import {admitPracticeContext} from '../src/practice-context';
import {playerTempo} from '../src/player-tempo';

const assets={font:{name:'fonts/URWGothic-Demi.otf',bytes:readFileSync(new URL('../src/URWGothic-Demi.otf',import.meta.url))},
 notices:Object.fromEntries(['URW-base35-COPYING','URW-base35-LICENSE','URW-base35-provenance.md'].map(name=>
  ['licenses/'+name,readFileSync(new URL('../licenses/'+name,import.meta.url))]))};
const STEPS=['C','D','E','F','G','A','B'];
const note=(step:string,octave:number,duration:number,type:string,staff:number,voice:number)=>
 `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration><voice>${voice}</voice><type>${type}</type><staff>${staff}</staff></note>`;
/** Bar `k` moving: eight right-hand eighths over a left-hand whole note. */
const bar=(k:number)=>[0,1,2,3,4,5,6,7].map(i=>note(STEPS[(k+i)%7],5,1,'eighth',1,1)).join('')+'<backup><duration>8</duration></backup>'+note(STEPS[k%7],3,8,'whole',2,5);
function musicXml(bars:readonly string[]){
 const measures=bars.map((content,i)=>`<measure number="${i+1}">${i===0?'<attributes><divisions>2</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>':''}${content}${i===bars.length-1?'<barline location="right"><bar-style>light-heavy</bar-style></barline>':''}</measure>`).join('');
 return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>Returns</work-title></work><identification><creator type="composer">Fixture</creator></identification><part-list><score-part id="P1"><part-name>Piano</part-name><score-instrument id="P1-I1"><instrument-name>Piano</instrument-name></score-instrument></score-part></part-list><part id="P1">${measures}</part></score-partwise>`;
}
/** Bar `k` closes a phrase on a whole note in each hand. */
const close=(k:number)=>note(STEPS[k%7],5,8,'whole',1,1)+'<backup><duration>8</duration></backup>'+note(STEPS[k%7],3,8,'whole',2,5);
/** A four-bar phrase from bar `k`: three bars moving, then a held close. */
const phrase=(k:number)=>[bar(k),bar(k+1),bar(k+2),close(k+3)];
const opening=phrase(10),passage=[...phrase(0),...phrase(4)],closing=phrase(8);
let written:Promise<ScorePackage>|undefined;
const returning=()=>written??=prepareMusicXmlScore(strToU8(musicXml([...opening,...passage,...passage,...closing])),assets).then(r=>importPackage(r.bytes,{allowLegacyTempo:true}));
async function editions(){
 const p=await returning(),personal=initialPersonal(p),fold=verbatimRepeats(p,personal)!.fold!,tempo=playerTempo(p.score,96);
 const edition:ScorePackage={...p,score:fold.score,sourceScore:fold.score};
 return {p,personal,edition,writtenPlan:planPractice(p,'bounded-exercises-v1',personal,tempo),foldedPlan:planPractice(edition,'bounded-exercises-v1',personal,tempo)};
}
/** Exercises by kind and bars, as practice names them. */
function exercises(plan:PracticePassagePlan,state:PracticeState){
 const all=passageHierarchy(plan,state).all,found=new Map([...all.values()].map(c=>[`${c.kind} ${c.firstBar+1}-${c.lastBar+1}`,c]));
 return (name:string)=>{const c=found.get(name);assert.ok(c,`${name} is an exercise`);return c!;};
}
const rate=(plan:PracticePassagePlan,state:PracticeState,name:string)=>{const c=exercises(plan,state)(name);return attainedRate(state,c.pattern,c.id);};
const json=(s:unknown)=>JSON.parse(JSON.stringify(s));
// Bars: opening 1–4; the passage 5–12 written out again as 13–20; closing 21–24. Folded: opening 1–4, passage 5–12, closing 13–16.
const KEY='fold-of-returns';
/** A written-out journal with settings, credit, marks, a working tempo and exclusions. */
function practised(plan:PracticePassagePlan):PracticeState{
 const s=readPractice(undefined,plan),at=exercises(plan,s);
 Object.assign(s,{working:30,start:30,connectionStart:48,step:2.4,countInBars:3,keepTempo:true,audioOutput:'device-7',personalGoal:{version:'personal-performance-goal-v1',bpm:96,beat:plan.referencePerformanceTempo!.beat}});
 s.best[at('section 13-16').pattern]=60; // the return's first phrase
 s.groundwork={[at('section 17-20').pattern]:true}; // the return's second phrase
 toggleDone(s,{passage:at('connection 13-20').id,pattern:at('connection 13-20').pattern,rate:50}); // the whole return
 s.workingByPattern[at('connection 13-20').pattern]=40;
 s.best[at('connection 9-16').pattern]=70; // across the repeat: the folded score has no such exercise
 s.excluded={[at('section 21-24').id]:true,[at('section 9-12').id]:true,[at('connection 9-16').id]:true};
 return readPractice(json(s),plan);
}

test('the folded score reads the written-out journal by music: settings, credit, marks and working tempo come along; what is left out wherever its music is, stays left out', async()=>{
 const {p,personal,edition,writtenPlan,foldedPlan}=await editions(),raw=json(practised(writtenPlan)),fold:PracticeFold={key:KEY,written:writtenPlan};
 // Before: the written-out journal names exercises the folded score doesn't have, so practice refused to open.
 assert.throws(()=>readPractice(raw,foldedPlan),/saved evidence retained/);
 const s=foldedPracticeJournal(raw,foldedPlan,fold)!;
 assert.deepEqual([s.working,s.start,s.connectionStart,s.step,s.countInBars,s.keepTempo,s.audioOutput],[30,30,48,2.4,3,true,'device-7']);
 assert.equal(rate(foldedPlan,s,'section 5-8'),60,'the passage\'s first phrase, practised on its return');
 const at=exercises(foldedPlan,s);
 assert.ok(s.groundwork?.[at('section 9-12').pattern],'its second phrase');
 assert.equal(rate(foldedPlan,s,'connection 5-12'),50,'the whole passage');
 assert.equal(s.workingByPattern[at('connection 5-12').pattern],40);
 assert.equal(rate(foldedPlan,s,'section 1-4'),0);assert.equal(rate(foldedPlan,s,'section 13-16'),0);
 assert.deepEqual(s.excluded,{[at('section 13-16').id]:true},'the closing; the second phrase was left out on one pass only');
 // The journal itself is untouched, and the folded state keeps nothing of the fold's own yet.
 assert.equal(s.folded,undefined);
 // Practice opens on it.
 const admitted=admitPracticeContext(edition,raw,undefined,personal,playerTempo(p.score,96),false,{key:KEY,written:p,personal});
 assert.equal(rate(admitted.plan,admitted.state,'section 5-8'),60);assert.ok(admitted.journal);
});

test('practice on the folded score reaches every pass of its music; what it leaves out stays with the fold, and it reads back alike', async()=>{
 const {p,personal,writtenPlan,foldedPlan}=await editions(),fold:PracticeFold={key:KEY,written:writtenPlan};
 const raw=json(practised(writtenPlan)),journal=new FoldedPracticeJournal(fold,raw),s=foldedPracticeJournal(raw,foldedPlan,fold)!;journal.read(s);
 const at=exercises(foldedPlan,s);
 s.working=36;passed(at('section 9-12'),s); // the passage's second phrase at 36
 toggleDone(s,{passage:at('connection 9-16').id,pattern:at('connection 9-16').pattern,rate:44}); // into the closing
 s.excluded={...s.excluded,[at('connection 1-8').id]:true};
 const saved=json(journal.written(foldedPlan,s));journal.saved(s,saved);
 const w=readPractice(saved,writtenPlan);
 assert.equal(rate(writtenPlan,w,'section 9-12'),36);assert.equal(rate(writtenPlan,w,'section 17-20'),36,'both passes');
 assert.equal(rate(writtenPlan,w,'connection 17-24'),44,'the return into the closing');
 assert.equal(rate(writtenPlan,w,'connection 9-16'),70,'across the repeat, as it was');
 assert.equal(rate(writtenPlan,w,'section 13-16'),60);
 assert.deepEqual(w.excluded,practised(writtenPlan).excluded,'the written-out score leaves out what it did');
 assert.deepEqual(w.folded?.[KEY].excluded,{[at('section 13-16').id]:true,[at('connection 1-8').id]:true});
 assert.equal(w.working,36);
 // Engraved again, the edition's journal keeps the fold's own record.
 assert.deepEqual(transferPracticeEdition(p,saved,p,personal).folded,w.folded);
 // Folded again from the saved journal: as it was left.
 const again=foldedPracticeJournal(saved,foldedPlan,fold)!;
 for(const name of ['section 1-4','section 5-8','section 9-12','section 13-16','connection 1-8','connection 5-12','connection 9-16'])assert.equal(rate(foldedPlan,again,name),rate(foldedPlan,s,name),name);
 assert.deepEqual(again.excluded,s.excluded);assert.equal(again.working,36);
});

test('credit taken back on the folded score is taken back from its music, and nowhere else', async()=>{
 const {writtenPlan,foldedPlan}=await editions(),fold:PracticeFold={key:KEY,written:writtenPlan};
 const raw=json(practised(writtenPlan)),journal=new FoldedPracticeJournal(fold,raw),s=foldedPracticeJournal(raw,foldedPlan,fold)!;journal.read(s);
 const at=exercises(foldedPlan,s);
 resetProgress(at('section 5-8'),s);
 toggleDone(s,{passage:at('connection 5-12').id,pattern:at('connection 5-12').pattern,rate:50});
 assert.equal(rate(foldedPlan,s,'connection 5-12'),0);
 const w=readPractice(json(journal.written(foldedPlan,s)),writtenPlan);
 assert.equal(rate(writtenPlan,w,'section 5-8'),0);assert.equal(rate(writtenPlan,w,'section 13-16'),0);
 assert.equal(rate(writtenPlan,w,'connection 5-12'),0);assert.equal(rate(writtenPlan,w,'connection 13-20'),0);
 assert.equal(w.workingByPattern[exercises(writtenPlan,w)('connection 13-20').pattern],40,'its working tempo stays');
 assert.equal(rate(writtenPlan,w,'connection 9-16'),70);assert.ok(w.groundwork?.[exercises(writtenPlan,w)('section 17-20').pattern]);
});

test('written out again, the score reads its journal as before; folding again shows what was practised meanwhile, and what the fold left out', async()=>{
 const {writtenPlan,foldedPlan}=await editions(),fold:PracticeFold={key:KEY,written:writtenPlan};
 const raw=json(practised(writtenPlan)),journal=new FoldedPracticeJournal(fold,raw),s=foldedPracticeJournal(raw,foldedPlan,fold)!;journal.read(s);
 s.excluded={...s.excluded,[exercises(foldedPlan,s)('connection 1-8').id]:true};
 const saved=json(journal.written(foldedPlan,s));
 // The repeat is written out: practice on its first pass, then the music is taken back on the return.
 const w=readPractice(saved,writtenPlan),at=exercises(writtenPlan,w);
 w.working=55;passed(at('section 5-8'),w);resetProgress(at('section 17-20'),w);
 const again=foldedPracticeJournal(json(w),foldedPlan,fold)!;
 assert.equal(rate(foldedPlan,again,'section 5-8'),60,'its best on either pass');
 assert.ok(!again.groundwork?.[exercises(foldedPlan,again)('section 9-12').pattern],'taken back, not kept by the fold');
 assert.deepEqual(again.excluded,s.excluded,'what the fold left out');
 assert.equal(again.working,55);
});

test('Fingers alone on the folded score reads the player\'s settings and nothing it would refuse', async()=>{
 const {writtenPlan,foldedPlan}=await editions(),s=foldedPracticePreferences(json(practised(writtenPlan)),foldedPlan)!;
 assert.deepEqual([s.working,s.start,s.connectionStart,s.step,s.countInBars,s.audioOutput],[30,30,48,2.4,3,'device-7']);
 assert.deepEqual(s.excluded,{});assert.deepEqual(s.best,{});
 assert.equal(foldedPracticePreferences(undefined,foldedPlan),undefined);
 assert.deepEqual(json(readPractice(undefined,foldedPlan)),json(initialPractice(foldedPlan)));
});
