import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {strToU8} from 'fflate';
import {prepareMusicXmlScore} from '../src/musicxml-import';
import {importPackage,type ScorePackage,type Seat} from '../src/package';
import {fingerFor,initialPersonal,readPersonal,type PersonalState} from '../src/state';
import {assigned,effectiveAssignments,handFor,handRecurrences,type PersonalHand} from '../src/personal-assignments';
import {PersonalMemorySession,rawMemoryPersonal} from '../src/personal-memory-session';
import {browserAssistanceStore,type AssistanceBrowserLocks} from '../src/durable-assistance-store';
import {DerivedFileCache,type DerivedFileStore} from '../src/derived-file-cache';
import {projectionServed} from '../src/personal-presentation';
import {PersonalPreparationPool} from '../src/personal-preparation-pool';
import {VERBATIM_FOLD_CACHE_KIND,FoldFailure,FoldedReader,forgetFoldFailures,editOwners,verbatimRepeats,withRepeatInheritance,writtenOutRepeat,writtenView} from '../src/repeat-fold';
import {requirePracticeHands} from '../src/practice';
import {noteMemoryActions} from '../src/note-memory-actions';
import type {PersonalMemoryAction} from '../src/personal-memory-session';
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
/** Bar `measure`'s `index`th right-hand note. A hand carried from matching music reaches a note between the
 * same neighbours: bar 1's first note opens the piece, so its return in bar 9 (after bar 8) is not one; its second is. */
const ownerAt=(p:ScorePackage,measure:number,index=0)=>p.score.notes.filter(n=>n.id.startsWith(`P1:m${measure}:`)&&n.hand==='RH').sort((a,b)=>a.startTick-b.startTick)[index].id;
const seatOf=(p:ScorePackage,id:string)=>p.seats.find(s=>s.ownerIds.includes(id)&&!s.continuation)!;
function fingered(p:ScorePackage,s:PersonalState,choices:Record<string,number>):PersonalState{
 const next=structuredClone(s),createdAt=new Date(0).toISOString();
 next.assignments={version:'personal-owner-assignments-v1',sourceRevision:p.sourceRevision??p.manifest.revision,choices:{...next.assignments?.choices}};
 for(const [id,finger] of Object.entries(choices)){const n=p.score.notes.find(n=>n.id===id)! as ScorePackage['score']['notes'][number]&{pitch:{octave:number;pitchClass:number}};
  next.assignments.choices[id]={ownerId:id,guard:{pitch:n.pitch.octave*12+n.pitch.pitchClass,startTick:n.startTick,durationTicks:n.durationTicks},original:{hand:n.hand as 'LH'|'RH'},finger,createdAt};}
 return next;
}

/** Actions accepted in order through the editor's memory session, as the viewer saves them. */
async function accepting(p:ScorePackage,s:PersonalState,actions:readonly PersonalMemoryAction[]):Promise<PersonalState>{
 class Locks implements AssistanceBrowserLocks {private tail:Promise<unknown>=Promise.resolve();request<T>(_name:string,callback:()=>Promise<T>):Promise<T>{const next=this.tail.then(callback);this.tail=next.catch(()=>{});return next;}}
 const data=new Map<string,string>(),store=browserAssistanceStore({getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);}},new Locks());
 const input={entryId:'returns',importedAt:'2026-10-22T00:00:00.000Z',p,personal:s},session=new PersonalMemorySession(store,{scanLibrary:async()=>[structuredClone(input)],validateInputs:async()=>true});
 await session.initialize();
 let personal=s;
 for(const action of actions){const receipt=session.accept({...input,personal},action);await receipt.saved;personal=receipt.personal;}
 return personal;
}
/** U: the first time's choices, through the editor's memory session as the notice's button applies them. */
async function useFirstPass(p:ScorePackage,s:PersonalState,found:{restore:readonly {ownerId:string;hand?:PersonalHand;local?:true;finger?:number}[]}):Promise<PersonalState>{
 class Locks implements AssistanceBrowserLocks {private tail:Promise<unknown>=Promise.resolve();request<T>(_name:string,callback:()=>Promise<T>):Promise<T>{const next=this.tail.then(callback);this.tail=next.catch(()=>{});return next;}}
 const data=new Map<string,string>(),store=browserAssistanceStore({getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);}},new Locks());
 const input={entryId:'returns',importedAt:'2026-10-22T00:00:00.000Z',p,personal:s},session=new PersonalMemorySession(store,{scanLibrary:async()=>[structuredClone(input)],validateInputs:async()=>true});
 await session.initialize();
 let personal=s;
 for(const change of found.restore){
  if(change.hand){const receipt=session.accept({...input,personal},{kind:'hand',ownerId:change.ownerId,hand:change.hand,...(change.local?{local:true}:{}),decisionId:`use-hand-${change.ownerId}`,authoredAt:'2026-10-22T00:00:02.000Z'});await receipt.saved;personal=receipt.personal;}
  if(change.finger!==undefined){const receipt=session.accept({...input,personal},{kind:'finger',edit:{ownerId:change.ownerId,finger:change.finger as 1|2|3|4|5,decisionId:`use-finger-${change.ownerId}`,authoredAt:'2026-10-22T00:00:02.000Z'}});await receipt.saved;personal=receipt.personal;}
 }
 return personal;
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

test('a hand carried from matching music reaches both passes, so they still fold and the folded page shows it', async()=>{
 // The closing bar plays the passage's first bar again: a hand chosen there carries back to bar 1 and to its return.
 const p=await prepareMusicXmlScore(strToU8(musicXml([...passage,...passage,bar(0)])),assets).then(r=>importPackage(r.bytes,{allowLegacyTempo:true}));
 const at='2026-10-22T00:00:00.000Z',chosen=assigned(p,initialPersonal(p),seatOf(p,ownerAt(p,17,1)),{hand:'LH'});
 for(const c of Object.values(chosen.assignments!.choices))c.intent={...c.intent,hand:{decisionId:`${c.ownerId}:${at}`,lineageId:`${c.ownerId}:${at}`,authoredAt:at}};
 const carried=handRecurrences(p,chosen).carried;
 assert.deepEqual([ownerAt(p,1,1),ownerAt(p,9,1)].map(id=>carried.get(id)?.hand),['LH','LH'],'the chosen hand reaches both passes');
 assert.ok(verbatimRepeats(p,chosen)?.fold,'passes the same hand reaches still agree');
 const personal=withRepeatInheritance(p,chosen),view=await new FoldedReader(p,null).view(personal);
 const {edition}=view!.verbatimFold!,folded=view!.verbatimFold!.personal(personal),shown=[1,9,17].map(b=>ownerAt(p,b,1)).filter(id=>edition.score.notes.some(n=>n.id===id));
 assert.ok(shown.length>=2);
 for(const id of shown){
  assert.equal(handFor(p,personal,id),'LH','one answer for the stored note');
  assert.equal(handFor(edition,folded,id),'LH','practice reads it on the printed bar');
  assert.equal(view!.score.notes.find(n=>n.id===id)?.hand,'LH','the folded page draws it');
 }
});

test('a hand change with its finger in one pass carries its hand to the twin, which still reads the finger, so the passes fold', async()=>{
 // Op. 68 No. 13 with bar 11's 4 and 3 moved and fingered, bar 21 reached only by the carried hand.
 const p=await returning(),first=ownerAt(p,1,1),second=ownerAt(p,9,1),at='2026-10-22T00:00:00.000Z';
 const moved=assigned(p,fingered(p,initialPersonal(p),{[first]:2}),seatOf(p,first),{hand:'LH'});
 for(const c of Object.values(moved.assignments!.choices))if(c.hand!==undefined)c.intent={...c.intent,hand:{decisionId:`${c.ownerId}:${at}`,lineageId:`${c.ownerId}:${at}`,authoredAt:at}};
 assert.equal(handRecurrences(p,moved).carried.get(second)?.hand,'LH','the hand reaches the return');
 assert.ok(verbatimRepeats(p,moved)?.fold,'a carried hand alone touches nothing, so the passes still agree');
 assert.equal(writtenOutRepeat(p,moved),undefined);
 const personal=withRepeatInheritance(p,moved);
 assert.deepEqual([handFor(p,personal,second),fingerFor(p,personal,seatOf(p,second))],['LH',2],'the return reads the hand and finger of its twin');
 // The same finger given on the return as well: both passes are the player's, and they agree.
 const also=(finger:number)=>assigned(p,moved,seatOf(p,second),{finger});
 assert.ok(verbatimRepeats(p,also(2))?.fold);
 assert.match(writtenOutRepeat(p,also(3))!.text,/^Bar 9 has a different finger than bar 1/);
});


test('one hand order: an old record of the written hand is no choice, so a moved twin\'s hand reaches it and the repeat folds', async()=>{
 const p=await returning(),first=ownerAt(p,1),second=ownerAt(p,9);
 for(const intent of [true,false]){
  // Bar 9: a finger saved before 2026-10-14, which also saved the note's written hand.
  const old=fingered(p,initialPersonal(p),{[second]:2});old.assignments!.choices[second].hand='RH';
  const s=assigned(p,old,seatOf(p,first),{hand:'LH'});
  // A move saved before hand intent was recorded.
  if(!intent)delete s.assignments!.choices[first].intent;
  assert.ok(verbatimRepeats(p,s)?.fold,`folds (${intent?'with':'without'} intent)`);
  assert.equal(writtenOutRepeat(p,s),undefined);
  const inherited=withRepeatInheritance(p,s);
  assert.deepEqual([handFor(p,inherited,second),fingerFor(p,inherited,seatOf(p,second))],['LH',2],'bar 9 plays the moved hand with its own finger');
  assert.equal(effectiveAssignments(p,inherited).find(a=>a.id===second)?.hand,'LH','practice reads the same hand');
  const view=await new FoldedReader(p,null).view(inherited),folded=view!.verbatimFold!.personal(inherited);
  assert.equal(handFor(view!.verbatimFold!.edition,folded,first),'LH','the printed bar shows it');
 }
});

test('one hand order: an old record of the written hand in the first pass, the move in its return: the printed bar, its practice and its page read the moved hand', async()=>{
 const p=await returning(),first=ownerAt(p,1),second=ownerAt(p,9);
 for(const intent of [true,false]){
  const where=intent?'with intent':'without intent';
  // Bar 1: a finger saved before 2026-10-14, which also saved the note's written hand; then L in bar 9.
  const old=fingered(p,initialPersonal(p),{[first]:2});old.assignments!.choices[first].hand='RH';
  const s=assigned(p,old,seatOf(p,second),{hand:'LH'});
  if(!intent)delete s.assignments!.choices[second].intent;
  assert.ok(verbatimRepeats(p,s)?.fold,`${where}: folds`);
  const inherited=withRepeatInheritance(p,s);
  assert.deepEqual([first,second].map(id=>handFor(p,inherited,id)),['LH','LH'],`${where}: both passes play the moved hand`);
  const view=await new FoldedReader(p,null).view(inherited),fold=view!.verbatimFold!,folded=fold.personal(inherited);
  assert.equal(handFor(fold.edition,folded,first),'LH',`${where}: Fingers and practice read it on the printed bar`);
  assert.equal(view!.score.notes.find(n=>n.id===first)?.hand,'LH',`${where}: the folded page draws it`);
  assert.equal(fold.practice.score.notes.find(n=>n.id===first)?.hand,'LH',`${where}: practice plays it`);
 }
});

test('a hand moved without a recorded intent and fingered differently in the return: only the finger is said to differ, and U gives only the finger', async()=>{
 const p=await returning(),first=ownerAt(p,1),second=ownerAt(p,9);
 // L and 2 in bar 1, saved before hand intent was recorded, so nothing carries it; 3 in bar 9.
 const s=fingered(p,assigned(p,fingered(p,initialPersonal(p),{[first]:2}),seatOf(p,first),{hand:'LH'}),{[second]:3});delete s.assignments!.choices[first].intent;
 assert.equal(handRecurrences(p,s).carried.has(second),false,'bar 9 has no hand of its own or carried');
 const found=writtenOutRepeat(p,s)!;
 assert.deepEqual(found,{text:'Bar 9 has a different finger than bar 1, so the repeat is written out.',use:'Use bar 1’s finger',restore:[{ownerId:second,finger:2}]});
 const personal=await useFirstPass(p,s,found);
 assert.ok(verbatimRepeats(p,personal)?.fold,'U folds it again');
 assert.deepEqual([handFor(p,withRepeatInheritance(p,personal),second),fingerFor(p,withRepeatInheritance(p,personal),seatOf(p,second))],['LH',2],'the return reads bar 1\'s hand and finger');
});

test('one hand order: a deliberate right hand in the second pass is the player\'s own, so the repeat is written out; U folds it again', async()=>{
 const p=await returning(),first=ownerAt(p,1),second=ownerAt(p,9);
 // R pressed in bar 9 first (the written hand, chosen), then L in bar 1.
 const s=assigned(p,assigned(p,initialPersonal(p),seatOf(p,second),{hand:'RH'}),seatOf(p,first),{hand:'LH'});
 assert.equal(handFor(p,s,second),'RH','bar 9 keeps its own right hand');
 assert.equal(verbatimRepeats(p,s)?.fold,undefined,'the passes differ');
 const found=writtenOutRepeat(p,s)!;
 assert.deepEqual(found,{text:'Bar 9 has a different hand than bar 1, so the repeat is written out.',use:'Use bar 1’s hand',restore:[{ownerId:second,hand:'LH'}]});
 const personal=await useFirstPass(p,s,found);
 assert.equal(writtenOutRepeat(p,personal),undefined,'the notice clears');
 assert.ok(verbatimRepeats(p,personal)?.fold,'and the repeat folds');
 assert.deepEqual([first,second].map(id=>handFor(p,withRepeatInheritance(p,personal),id)),['LH','LH']);
});

// The closing bar plays the passage's first bar again: L chosen there carries to bar 1 and to its return in bar 9.
const closingReturn=()=>prepareMusicXmlScore(strToU8(musicXml([...passage,...passage,bar(0)])),assets).then(r=>importPackage(r.bytes,{allowLegacyTempo:true}));
const handIntent=(s:PersonalState)=>{const at='2026-10-22T00:00:00.000Z';for(const c of Object.values(s.assignments!.choices))if(c.hand!==undefined&&!c.intent?.hand)c.intent={...c.intent,hand:{decisionId:`${c.ownerId}:${at}`,lineageId:`${c.ownerId}:${at}`,authoredAt:at}};return s;};

test('one hand order: a carried left hand against the player\'s own right hand in the other pass is written out, and U clears it, either way round', async()=>{
 const p=await closingReturn(),first=ownerAt(p,1,1),second=ownerAt(p,9,1),closing=ownerAt(p,17,1);
 for(const [own,other] of [[second,first],[first,second]]){
  const where=own===second?'R in bar 9':'R in bar 1';
  // R pressed on one pass (its written hand, chosen), then L in the closing bar: it carries to the other pass only.
  const s=handIntent(assigned(p,assigned(p,initialPersonal(p),seatOf(p,own),{hand:'RH'}),seatOf(p,closing),{hand:'LH'})),carried=handRecurrences(p,s).carried;
  assert.equal(carried.get(other)?.hand,'LH',`${where}: the carried hand reaches the other pass`);
  assert.equal(carried.has(own),false,`${where}: nothing is carried over the player's own hand`);
  assert.deepEqual([handFor(p,s,own),handFor(p,s,other)],['RH','LH'],`${where}: each pass plays its hand`);
  assert.equal(verbatimRepeats(p,s)?.fold,undefined,`${where}: the passes differ`);
  const found=writtenOutRepeat(p,s)!,first_=own===first?'RH':'LH';
  assert.deepEqual(found,{text:'Bar 9 has a different hand than bar 1, so the repeat is written out.',use:'Use bar 1’s hand',restore:[{ownerId:second,hand:first_}]},where);
  const personal=await useFirstPass(p,s,found);
  assert.equal(writtenOutRepeat(p,personal),undefined,`${where}: U clears the notice`);
  assert.ok(verbatimRepeats(p,personal)?.fold,`${where}: and the repeat folds`);
  const inherited=withRepeatInheritance(p,personal),view=await new FoldedReader(p,null).view(inherited),folded=view!.verbatimFold!.personal(inherited);
  assert.deepEqual([first,second].map(id=>handFor(p,inherited,id)),[first_,first_],`${where}: both passes play bar 1's hand`);
  assert.equal(handFor(view!.verbatimFold!.edition,folded,first),first_,`${where}: the printed bar shows it`);
 }
});

test('a fold that can\'t be drawn is remembered for the session: opening it again, or a fresh package of it, does not draw it again', async()=>{
 forgetFoldFailures();
 const p=await closingReturn(),broken={...p,renderingRecipe:{...p.renderingRecipe!,engineId:'no-such-engine'}} as ScorePackage,s=initialPersonal(p);
 const warned:unknown[][]=[],warn=console.warn;console.warn=(...args:unknown[])=>{warned.push(args);};
 const failing=async(reader:FoldedReader)=>{try{await reader.view(s);}catch(error){return error;}assert.fail('the fold draws');};
 const first=await failing(new FoldedReader(broken,null));
 assert.ok(first instanceof FoldFailure&&!first.remembered,'drawn once, and it fails');
 assert.ok(first.detail instanceof Error&&first.detail.message,'the reason is kept');
 assert.deepEqual(warned,[['Repeats stay written out:',first.detail]],'and logged to the console');
 const again=await failing(new FoldedReader({...broken,score:structuredClone(broken.score)},null));
 assert.ok(again instanceof FoldFailure&&again.remembered&&again.key===first.key,'a fresh package of the score is not drawn again');
 forgetFoldFailures();
 assert.equal(warned.length,1,'logged once');
 const retried=await failing(new FoldedReader(broken,null));assert.ok(retried instanceof FoldFailure&&!retried.remembered,'a new session draws it again');
 console.warn=warn;forgetFoldFailures();
});

test('U after a hand kept "this note only" in one pass keeps it to the repeat: the closing bar, matching music outside it, keeps its hand', async()=>{
 const p=await closingReturn(),first=ownerAt(p,1),second=ownerAt(p,9),closing=ownerAt(p,17),at='2026-10-22T00:00:01.000Z';
 const hands=(s:PersonalState)=>[first,second,closing].map(id=>handFor(p,withRepeatInheritance(p,s),id));
 // L in bar 1, "this note only": the return in bar 9 and the closing bar keep their written RH.
 const only=await accepting(p,initialPersonal(p),[{kind:'hand',ownerId:first,hand:'LH',local:true,decisionId:'only-first',authoredAt:at}]);
 assert.deepEqual(hands(only),['LH','RH','RH']);
 const found=writtenOutRepeat(p,only)!;
 assert.equal(found.text,'Bar 9 has a different hand than bar 1, so the repeat is written out.');
 assert.deepEqual(found.restore,[{ownerId:second,hand:'LH',local:true}]);
 const used=await useFirstPass(p,only,found);
 assert.deepEqual(hands(used),['LH','LH','RH'],'both passes play L; the closing bar is not moved');
 assert.ok(verbatimRepeats(p,used)?.fold,'and the repeat folds');
 assert.equal(writtenOutRepeat(p,used),undefined);
 // The other way round: L in bar 9 "this note only"; U gives bar 9 its written hand back, for that note only.
 const back=await accepting(p,initialPersonal(p),[{kind:'hand',ownerId:second,hand:'LH',local:true,decisionId:'only-second',authoredAt:at}]);
 assert.deepEqual(hands(back),['RH','LH','RH']);
 const again=writtenOutRepeat(p,back)!;
 assert.deepEqual(again.restore,[{ownerId:second,hand:'RH',local:true}]);
 const restored=await useFirstPass(p,back,again);
 assert.deepEqual(hands(restored),['RH','RH','RH']);
 assert.ok(verbatimRepeats(p,restored)?.fold);
});

test('one hand order: a hand carried from matching music outranks an old record of the written hand, so no notice is shown that U could never clear', async()=>{
 const p=await closingReturn(),first=ownerAt(p,1,1),second=ownerAt(p,9,1),closing=ownerAt(p,17,1);
 for(const [recorded,other] of [[first,second],[second,first]]){
  const where=recorded===first?'record in bar 1':'record in bar 9';
  // A finger saved before 2026-10-14, which also saved the note's written hand; then L in the closing bar.
  const old=fingered(p,initialPersonal(p),{[recorded]:2});old.assignments!.choices[recorded].hand='RH';
  const s=handIntent(assigned(p,old,seatOf(p,closing),{hand:'LH'}));delete s.assignments!.choices[recorded].intent;
  assert.deepEqual([recorded,other].map(id=>handRecurrences(p,s).carried.get(id)?.hand),['LH','LH'],`${where}: the carried hand reaches both passes`);
  assert.deepEqual([handFor(p,s,recorded),handFor(p,s,other)],['LH','LH'],`${where}: the record is no hand choice`);
  assert.equal(writtenOutRepeat(p,s),undefined,`${where}: no notice`);
  assert.ok(verbatimRepeats(p,s)?.fold,`${where}: the passes agree`);
  const inherited=withRepeatInheritance(p,s),view=await new FoldedReader(p,null).view(inherited),folded=view!.verbatimFold!.personal(inherited);
  assert.deepEqual([handFor(p,inherited,other),fingerFor(p,inherited,seatOf(p,other))],['LH',2],`${where}: the other pass reads the record's finger`);
  assert.equal(effectiveAssignments(p,inherited).find(a=>a.id===recorded)?.hand,'LH',`${where}: practice reads the carried hand`);
  assert.equal(handFor(view!.verbatimFold!.edition,folded,first),'LH',`${where}: the printed bar shows it`);
 }
});

test('a hand command on a folded note changes every pass, so the repeat stays folded', async()=>{
 const p=await closingReturn(),first=ownerAt(p,1,1),second=ownerAt(p,9,1),closing=ownerAt(p,17,1),reader=new FoldedReader(p,null);
 const folded=async(s:PersonalState)=>{const view=(await reader.view(withRepeatInheritance(p,s),p))!;return view.seats.find(seat=>seat.ownerIds.includes(first))!;};
 const command=async(s:PersonalState,name:Parameters<typeof noteMemoryActions>[3])=>accepting(p,s,noteMemoryActions(p,s,await folded(s),name,'2026-10-22T00:00:01.000Z'));
 const hands=(s:PersonalState)=>[first,second,closing].map(id=>handFor(p,withRepeatInheritance(p,s),id));
 // L in bar 1 carries to its return in bar 9 and to the closing bar.
 const moved=handIntent(assigned(p,initialPersonal(p),seatOf(p,first),{hand:'LH'}));
 assert.deepEqual(editOwners(await folded(moved)).sort(),[first,second].sort());
 assert.deepEqual(hands(moved),['LH','LH','LH']);
 // Using a matching bar's fingers, or inheriting again, names every pass as well.
 for(const [name,kind] of [['memory-reference','reference'],['memory-inherit','reset']] as const){
  const actions=noteMemoryActions(p,moved,await folded(moved),name,'2026-10-22T00:00:01.000Z');
  assert.deepEqual(actions.map(a=>a.ownerId).sort(),[first,second].sort(),name);
  assert.ok(actions.every(a=>a.kind===kind),name);
 }
 // "Don't share this note's hand": both passes keep it, the closing bar no longer follows.
 const only=await command(moved,'hand-only-here');
 assert.ok(verbatimRepeats(p,only)?.fold,'only here keeps the repeat folded');
 assert.equal(writtenOutRepeat(p,only),undefined);
 assert.deepEqual(hands(only),['LH','LH','RH'],'both passes keep L; the closing bar plays its written hand');
 const firstOnly=await accepting(p,moved,noteMemoryActions(p,moved,{...await folded(moved),verbatimTwins:[first]} as Seat,'hand-only-here','2026-10-22T00:00:01.000Z'));
 assert.equal(verbatimRepeats(p,firstOnly)?.fold,undefined,'changing the first pass alone would write the repeat out');
 // "Share this note's hand" again: the closing bar follows once more, and the passes still fold.
 const shared=await command(only,'hand-shared');
 assert.ok(verbatimRepeats(p,shared)?.fold,'sharing again keeps the repeat folded');
 assert.deepEqual(hands(shared),['LH','LH','LH']);
 // L in the closing bar carries to both passes; "Keep the written hand here" keeps it in both.
 const carried=handIntent(assigned(p,initialPersonal(p),seatOf(p,closing),{hand:'LH'}));
 assert.deepEqual(hands(carried),['LH','LH','LH']);
 const kept=await command(carried,'hand-not-here');
 assert.ok(verbatimRepeats(p,kept)?.fold,'keeping the written hand keeps the repeat folded');
 assert.deepEqual(hands(kept),['RH','RH','LH']);
});

test('one hand order: the player\'s own right hand in both passes folds and stays right-handed on the page and in practice, though matching music carries a left hand', async()=>{
 const p=await closingReturn(),first=ownerAt(p,1),second=ownerAt(p,9),closing=ownerAt(p,17);
 const s=handIntent(assigned(p,assigned(p,assigned(p,initialPersonal(p),seatOf(p,first),{hand:'RH'}),seatOf(p,second),{hand:'RH'}),seatOf(p,closing),{hand:'LH'}));
 const carried=handRecurrences(p,s).carried;
 assert.ok(!carried.has(first)&&!carried.has(second),'the closing bar\'s hand reaches neither pass');
 assert.ok(verbatimRepeats(p,s)?.fold,'both passes are the player\'s right hand: they agree');
 assert.equal(writtenOutRepeat(p,s),undefined);
 const inherited=withRepeatInheritance(p,s),view=await new FoldedReader(p,null).view(inherited),{edition,practice}=view!.verbatimFold!,folded=view!.verbatimFold!.personal(inherited);
 for(const id of [first,second])assert.equal(effectiveAssignments(p,inherited).find(a=>a.id===id)?.hand,'RH','the stored notes keep the right hand');
 assert.equal(handFor(edition,folded,first),'RH','Fingers and practice read it on the printed bar');
 assert.equal(effectiveAssignments(edition,folded).find(a=>a.id===first)?.hand,'RH');
 assert.equal(view!.score.notes.find(n=>n.id===first)?.hand,'RH','the folded page draws it');
 assert.equal(practice.score.notes.find(n=>n.id===first)?.hand,'RH');
 assert.equal(handFor(p,inherited,closing),'LH','the closing bar keeps its own left hand');
});

test('a folded score is prepared ahead of time as it opens: served only while its folded pages and their projection are both on disk', async()=>{
 const p=await returning(),s=assigned(p,initialPersonal(p),seatOf(p,ownerAt(p,1)),{hand:'LH'});
 const files=new Map<string,Uint8Array>(),store:DerivedFileStore={async read(name){return files.get(name)??null;},async write(name,data){files.set(name,data);return true;}},cache=new DerivedFileCache(store,'build-a');
 const reader=new FoldedReader(p,cache,{pool:new PersonalPreparationPool<any>(),options:{worker:null,cache,cacheWriteDelayMs:0}});
 assert.equal(await reader.served(s),undefined,'nothing is served before the folded pages are drawn');
 assert.ok(await reader.view(s));
 const served=(await reader.served(s))!;
 assert.equal(served.kind,VERBATIM_FOLD_CACHE_KIND);assert.equal(served.with?.length,1,'bar 1’s moved hand is projected');
 for(let i=0;i<200&&!await projectionServed(cache,served);i++){await new Promise(r=>setTimeout(r,10));await cache.flush();}
 assert.equal(await projectionServed(cache,served),true);
 // Each entry it names is needed: without either the score is prepared again.
 assert.equal((await Promise.all([...files.keys()].map(async name=>{const kept=new Map(files);kept.delete(name);return !await projectionServed(new DerivedFileCache({read:async n=>kept.get(n)??null,write:async()=>true},'build-a'),served);}))).filter(Boolean).length,2,'the folded pages and their projection');
 assert.equal(await projectionServed(new DerivedFileCache(store,'build-b'),served),false,'another build draws them again');
 // Choices that keep every folded note's written hand need only the folded pages.
 // Opening it in a fresh process: a fresh package, a fresh reader, the same disk. Nothing is engraved or written again.
 const writes:string[]=[],disk:DerivedFileStore={read:name=>store.read(name),async write(name,data){writes.push(name);return store.write(name,data);}},again=new DerivedFileCache(disk,'build-a');
 const fresh={...p,score:structuredClone(p.score),...(p.sourceScore?{sourceScore:structuredClone(p.sourceScore)}:{})},opened=new FoldedReader(fresh,again,{options:{worker:null,cache:again}});
 const shown=(await opened.view(s,fresh))!;await again.flush();
 assert.deepEqual(writes,[],'the folded pages and their projection are read from disk');
 assert.equal(shown.pages.length,(await reader.view(s))!.pages.length);
 assert.deepEqual((await opened.served(s))?.key,served.key,'and it serves what was prepared');
 assert.equal((await opened.view(structuredClone(s),fresh))!.verbatimFold!.session,shown.verbatimFold!.session,'the same fold reuses its edition');
 const own=initialPersonal(p),plain=new FoldedReader(p,cache,{pool:new PersonalPreparationPool<any>(),options:{worker:null,cache,cacheWriteDelayMs:0}});
 if(verbatimRepeats(p,own)?.fold){await plain.view(own);assert.deepEqual((await plain.served(own))?.with,[]);}
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

test('the fold\'s own practice is kept under the stored score and the bars it folds, not under its engraving', async()=>{
 const p=await closingReturn(),s=initialPersonal(p),key=async(q:ScorePackage)=>{const fold=(await new FoldedReader(q,null).view(s))!.verbatimFold!;return {key:fold.practiceKey,edition:fold.edition.sourceSha256};};
 const first=await key(p);
 assert.deepEqual(await key({...p,score:structuredClone(p.score),...(p.sourceScore?{sourceScore:structuredClone(p.sourceScore)}:{})}),first,'a fresh package of the score');
 // The same fold engraved otherwise (as a later ISO might write the folded score): its own practice stays where it was.
 const marked=(score:ScorePackage['score'])=>({...score,notes:score.notes.map(n=>({...n,engravedBy:'later'}))});
 const later=await key({...p,score:marked(p.score),...(p.sourceScore?{sourceScore:marked(p.sourceScore)}:{})});
 assert.notEqual(later.edition,first.edition,'the folded score is written otherwise');
 assert.equal(later.key,first.key,'kept under the same fold');
 // Another score has its own; so do other folded bars, even under the same score's name.
 const other=await returning();assert.notEqual((await key(other)).key,first.key);
 const opened=await prepareMusicXmlScore(strToU8(musicXml([bar(3),...passage,...passage,bar(0)])),assets).then(r=>importPackage(r.bytes,{allowLegacyTempo:true}));
 assert.notEqual((await key({...opened,sourceSha256:p.sourceSha256})).key,first.key,'the bars it folds');
});
