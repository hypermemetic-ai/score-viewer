import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {strToU8} from 'fflate';
import {prepareMusicXmlScore} from '../src/musicxml-import';
import {importPackage,type ScorePackage,type Seat} from '../src/package';
import {fingerFor,initialPersonal,readPersonal,type PersonalState} from '../src/state';
import {effectiveAssignments,handFor} from '../src/personal-assignments';
import {rawMemoryPersonal} from '../src/personal-memory-session';
import {FoldedReader,editOwners,verbatimRepeats,withRepeatInheritance,writtenOutRepeat,writtenView} from '../src/repeat-fold';
import {requirePracticeHands} from '../src/practice';
import {buildPerformanceSchedule,writtenBarAt} from '../src/score-performance';

const assets={font:{name:'fonts/URWGothic-Demi.otf',bytes:readFileSync(new URL('../src/URWGothic-Demi.otf',import.meta.url))},
 notices:Object.fromEntries(['URW-base35-COPYING','URW-base35-LICENSE','URW-base35-provenance.md'].map(name=>
  ['licenses/'+name,readFileSync(new URL('../licenses/'+name,import.meta.url))]))};
const STEPS=['C','D','E','F','G','A','B'];
const note=(step:string,octave:number,duration:number,type:string,staff:number,voice:number)=>
 `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration><voice>${voice}</voice><type>${type}</type><staff>${staff}</staff></note>`;
/** Bar `k` of a passage: four right-hand quarters and a left-hand whole note, each bar its own. */
const bar=(k:number)=>[0,1,2,3].map(i=>note(STEPS[(k+i)%7],5,2,'quarter',1,1)).join('')+'<backup><duration>8</duration></backup>'+note(STEPS[k%7],3,8,'whole',2,5);
function musicXml(bars:readonly string[]){
 const measures=bars.map((content,i)=>`<measure number="${i+1}">${i===0?'<attributes><divisions>2</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>':''}${content}${i===bars.length-1?'<barline location="right"><bar-style>light-heavy</bar-style></barline>':''}</measure>`).join('');
 return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>Returns</work-title></work><identification><creator type="composer">Fixture</creator></identification><part-list><score-part id="P1"><part-name>Piano</part-name><score-instrument id="P1-I1"><instrument-name>Piano</instrument-name></score-instrument><midi-instrument id="P1-I1"><midi-channel>1</midi-channel><midi-program>1</midi-program></midi-instrument></score-part></part-list><part id="P1">${measures}</part></score-partwise>`;
}
/** An eight-bar passage written out twice, then a closing bar. */
const passage=[0,1,2,3,4,5,6,7].map(bar);
let written:Promise<ScorePackage>|undefined;
const returning=()=>written??=prepareMusicXmlScore(strToU8(musicXml([...passage,...passage,note('C',5,8,'whole',1,1)+'<backup><duration>8</duration></backup>'+note('C',3,8,'whole',2,5)])),assets).then(r=>importPackage(r.bytes,{allowLegacyTempo:true}));
const ownerAt=(p:ScorePackage,measure:number,index=0)=>p.score.notes.filter(n=>n.id.startsWith(`P1:m${measure}:`)&&n.hand==='RH').sort((a,b)=>a.startTick-b.startTick)[index].id;
const seatOf=(p:ScorePackage,id:string)=>p.seats.find(s=>s.ownerIds.includes(id)&&!s.continuation)!;
function fingered(p:ScorePackage,s:PersonalState,choices:Record<string,number>):PersonalState{
 const next=structuredClone(s),createdAt=new Date(0).toISOString();
 next.assignments={version:'personal-owner-assignments-v1',sourceRevision:p.sourceRevision??p.manifest.revision,choices:{...next.assignments?.choices}};
 for(const [id,finger] of Object.entries(choices)){const n=p.score.notes.find(n=>n.id===id)! as ScorePackage['score']['notes'][number]&{pitch:{octave:number;pitchClass:number}};
  next.assignments.choices[id]={ownerId:id,guard:{pitch:n.pitch.octave*12+n.pitch.pitchClass,startTick:n.startTick,durationTicks:n.durationTicks},original:{hand:n.hand as 'LH'|'RH'},finger,createdAt};}
 return next;
}

test('a passage the stored score writes out twice reads as a repeat; the store keeps it written out', async()=>{
 const p=await returning(),fold=verbatimRepeats(p,initialPersonal(p))?.fold;
 assert.equal(p.score.sourceBarTicks!.length-1,17,'the import writes both passes out');
 assert.ok(fold,'the reader folds the return');
 assert.equal(fold.score.sourceBarTicks!.length-1,9);
 assert.equal(fold.shownBy.get(ownerAt(p,9)),ownerAt(p,1));
});

test('an untouched pass reads its twin\'s fingers, and only as a derived reading', async()=>{
 const p=await returning(),first=ownerAt(p,1),second=ownerAt(p,9);
 const personal=withRepeatInheritance(p,fingered(p,initialPersonal(p),{[first]:4}));
 assert.equal(fingerFor(p,personal,seatOf(p,second)),4,'the second pass shows the finger given in the first');
 assert.deepEqual(personal.repeatResolved?.choices[second],{finger:4});
 assert.equal(personal.assignments?.choices[second],undefined,'no choice is written for the twin');
 assert.equal(rawMemoryPersonal(personal).repeatResolved,undefined,'saving keeps only the player\'s own choices');
 assert.equal(readPersonal(JSON.parse(JSON.stringify(personal)),p).repeatResolved,undefined);
 assert.equal(effectiveAssignments(p,personal).find(a=>a.id===second)?.finger,4,'practice reads it through both passes');
});

test('twins the player fingered differently keep the passage written out; agreeing twins fold', async()=>{
 const p=await returning(),first=ownerAt(p,1),second=ownerAt(p,9);
 const differ=fingered(p,initialPersonal(p),{[first]:4,[second]:2});
 assert.equal(verbatimRepeats(p,differ)?.fold,undefined);
 assert.deepEqual(verbatimRepeats(p,differ)?.kept.map(k=>k.reason),['owner-choices-differ']);
 // The reader says why, in bars as printed, and offers the first time's choice.
 assert.deepEqual(writtenOutRepeat(p,differ),{text:'Bar 9 has a different finger than bar 1, so the repeat is written out.',use:'Use bar 1’s finger',restore:[{ownerId:second,finger:4}]});
 assert.equal(writtenOutRepeat(p,fingered(p,initialPersonal(p),{[first]:4})),undefined,'nothing to say when it folds');
 assert.equal(withRepeatInheritance(p,differ).repeatResolved,undefined);
 assert.equal(fingerFor(p,withRepeatInheritance(p,differ),seatOf(p,second)),2,'each pass keeps its own finger');
 const agree=fingered(p,initialPersonal(p),{[first]:4,[second]:4});
 assert.ok(verbatimRepeats(p,agree)?.fold);
});

test('the folded reader names written-out notes and finds its way back to them', async()=>{
 const p=await returning(),first=ownerAt(p,1),second=ownerAt(p,9),third=ownerAt(p,3);
 const personal=withRepeatInheritance(p,fingered(p,initialPersonal(p),{[first]:4,[second]:4,[ownerAt(p,10)]:3}));
 const view=await new FoldedReader(p,null).view(personal,p);
 assert.ok(view?.verbatimFold);
 assert.equal(writtenView(view),p,'saved navigation names the stored edition');
 assert.ok(view.pages.length<=p.pages.length&&view.seats.length<p.seats.length,'the return is drawn once');
 const ids=new Set(p.score.notes.map(n=>n.id));
 for(const seat of view.seats){
  assert.ok(seat.ownerIds.every(id=>ids.has(id)),'every folded seat names written-out notes');
  assert.equal(seat.contactId,seatOf(p,seat.ownerIds[0]).contactId,'and their contacts');
 }
 const both=view.seats.find(s=>s.ownerIds.includes(first))!;
 assert.deepEqual([...both.ownerIds].sort(),[first,second].sort(),'a note fingered alike in both passes is both twins');
 assert.deepEqual(editOwners(both).sort(),[first,second].sort(),'an edit there changes both, so they stay one repeat');
 const carried=view.seats.find(s=>s.ownerIds.includes(ownerAt(p,10)))!;
 assert.deepEqual(carried.ownerIds,[ownerAt(p,10)],'a note fingered only in the second pass is named by that pass');
 assert.equal(fingerFor(p,personal,carried),3);
 assert.deepEqual(view.seats.find(s=>s.ownerIds.includes(third))!.ownerIds,[third],'an untouched note is the first pass');
 assert.deepEqual(editOwners(seatOf(p,first)),[first],'written-out seats edit their own note');
 // Navigation: a written-out seat of either pass finds the folded seat that shows it, and back.
 const fold=view.verbatimFold;
 assert.equal(fold.foldedSeat(seatOf(p,ownerAt(p,10,1)))?.id,fold.foldedSeat(seatOf(p,ownerAt(p,2,1)))?.id);
 const back:Seat|undefined=fold.writtenSeat(fold.foldedSeat(seatOf(p,third))!);
 assert.equal(back?.ownerIds[0],third);
 assert.equal(handFor(p,personal,third),'RH');
});

test('a repeat edit that splits the passes writes it out again, and undoing it folds it back', async()=>{
 const p=await returning(),first=ownerAt(p,1),second=ownerAt(p,9),reader=new FoldedReader(p,null);
 const agreed=fingered(p,initialPersonal(p),{[first]:4});
 const folded=await reader.view(agreed,p);assert.ok(folded);
 assert.equal(await reader.view(fingered(p,agreed,{[second]:2}),p),undefined,'a different finger in the return writes it out');
 const again=await reader.view(agreed,p);
 assert.deepEqual(again?.pages,folded.pages,'the same fold draws the same pages');
});

test('a finger shared fingering memory resolves counts as the player\'s, so memory and the repeat never both apply', async()=>{
 const p=await returning(),first=ownerAt(p,1),second=ownerAt(p,9),revision=p.sourceRevision??p.manifest.revision;
 const remembered=(finger:number):PersonalState=>({...fingered(p,initialPersonal(p),{[first]:4}),memoryResolved:{revision:1,sourceRevision:revision,choices:{[second]:{finger}}}});
 assert.equal(verbatimRepeats(p,remembered(2))?.fold,undefined,'memory that disagrees keeps the passage written out');
 const agreeing=withRepeatInheritance(p,remembered(4));
 assert.ok(verbatimRepeats(p,agreeing)?.fold);
 assert.equal(agreeing.repeatResolved?.choices[second],undefined,'a note memory resolves reads memory, not its twin');
 assert.equal(fingerFor(p,agreeing,seatOf(p,second)),4);
});

test('a hand moved in one pass moves its untouched twin', async()=>{
 const p=await returning(),first=ownerAt(p,1),second=ownerAt(p,9),moved=fingered(p,initialPersonal(p),{});
 const n=p.score.notes.find(n=>n.id===first)! as ScorePackage['score']['notes'][number]&{pitch:{octave:number;pitchClass:number}};
 moved.assignments!.choices[first]={ownerId:first,guard:{pitch:n.pitch.octave*12+n.pitch.pitchClass,startTick:n.startTick,durationTicks:n.durationTicks},original:{hand:'RH'},hand:'LH',createdAt:new Date(0).toISOString()};
 const personal=withRepeatInheritance(p,moved);
 assert.equal(handFor(p,personal,second),'LH');
 assert.equal(effectiveAssignments(p,personal).find(a=>a.id===second)?.hand,'LH','practice plays the return in the same hand');
 const view=await new FoldedReader(p,null).view(personal,p);
 assert.deepEqual(view?.seats.find(s=>s.ownerIds.includes(first))?.ownerIds,[first]);
 // A hand kept to its own bar (hand-change carries' "hand here only") is a choice there, even the written hand: the passes differ.
 const m=p.score.notes.find(n=>n.id===second)! as typeof n,local=structuredClone(moved);
 local.assignments!.choices[second]={ownerId:second,guard:{pitch:m.pitch.octave*12+m.pitch.pitchClass,startTick:m.startTick,durationTicks:m.durationTicks},original:{hand:'RH'},hand:'RH',createdAt:new Date(0).toISOString(),...{handScope:'local'}};
 assert.equal(verbatimRepeats(p,local)?.fold,undefined);
 assert.match(writtenOutRepeat(p,local)!.text,/^Bar 9 has a different hand than bar 1/);
 // "Only here" on the moved note: its untouched twin keeps its written hand, so the passes differ.
 const here=structuredClone(moved);Object.assign(here.assignments!.choices[first],{handScope:'local'});
 assert.equal(verbatimRepeats(p,here)?.fold,undefined);
 assert.equal(handFor(p,withRepeatInheritance(p,here),second),'RH');
 assert.match(writtenOutRepeat(p,here)!.text,/^Bar 9 has a different hand than bar 1/);
});

test('practice and Fingers visit each printed bar once, reading every pass\'s choices, and edit the stored notes', async()=>{
 const p=await returning(),first=ownerAt(p,1),second=ownerAt(p,9),late=ownerAt(p,10);
 const personal=withRepeatInheritance(p,fingered(p,initialPersonal(p),{[first]:4,[late]:3}));
 const view=await new FoldedReader(p,null).view(personal);
 assert.ok(view,'the folded pages are drawn from the stored edition alone');
 const {edition,practice}=view.verbatimFold!,folded=view.verbatimFold!.personal(personal);
 assert.equal(edition.score.sourceBarTicks!.length-1,9,'nine printed bars, as a score with composer repeats');
 assert.ok(edition.score.writtenPresentation,'played through its repeat');
 requirePracticeHands(edition,folded);
 const ids=new Set(edition.score.notes.map(n=>n.id));
 for(const seat of practice.seats)assert.ok(seat.ownerIds.every(id=>ids.has(id)),'practice seats name the folded notes');
 const at=(id:string)=>practice.seats.find(s=>s.ownerIds.includes(id)&&!s.continuation)!;
 assert.equal(fingerFor(edition,folded,at(first)),4);
 assert.equal(fingerFor(edition,folded,at(ownerAt(p,2))),3,'a finger given only in the second pass shows on the printed bar');
 assert.deepEqual(editOwners(at(ownerAt(p,2))),[late],'and an edit there reaches the note that carries it');
 assert.equal(folded.assignments?.choices[second],undefined,'no second-pass note is in the folded score');
 assert.deepEqual([view.verbatimFold!.printedBar(10),view.verbatimFold!.printedBar(17),view.verbatimFold!.printedBar(3)],[2,9,3],'stored bars name their printed bars');
});

test('hearing a folded score plays it in performed order, numbered by printed bar and pass, and follows the printed seats', async()=>{
 const p=await returning(),view=await new FoldedReader(p,null).view(initialPersonal(p));
 const edition=view!.verbatimFold!.edition,beat={numerator:1,denominator:4};
 const folded=buildPerformanceSchedule(edition.score,beat),stored=buildPerformanceSchedule(p.score,beat);
 assert.deepEqual(folded.notes,stored.notes,'the same notes at the same times as the written-out score');
 assert.equal(folded.totalTicks,stored.totalTicks);
 assert.equal(folded.writtenBars,9,'measures counted as printed');
 assert.deepEqual(folded.barLabels.map(l=>`${l.bar}.${l.pass}`),['1.1','2.1','3.1','4.1','5.1','6.1','7.1','8.1','1.2','2.2','3.2','4.2','5.2','6.2','7.2','8.2','9.1'],'stored bars 9–16 are printed bars 1–8, the second time');
 for(const [i,tick] of folded.bars.slice(0,-1).entries()){
  const at=writtenBarAt(folded,tick);
  assert.ok(view!.seats.some(seat=>seat.writtenBar===at.bar),`performed bar ${i+1} has printed seats to follow`);
 }
});
