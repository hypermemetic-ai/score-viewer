import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareMusicXmlScore} from '../src/musicxml-import';
import {importPackage,selectPresentation,type ScorePackage} from '../src/package';
import {prepareSourceTransposition} from '../src/score-transposition';
import {personalForTransposedEdition} from '../src/transposed-personal';
import {browserAssistanceStore,type AssistanceBrowserLocks} from '../src/durable-assistance-store';
import {PersonalMemorySession,rawMemoryPersonal,type PersonalMemoryAction} from '../src/personal-memory-session';
import {FoldedReader,editOwners,repeatsMayFold,verbatimRepeats,withRepeatInheritance,writtenOutRepeat} from '../src/repeat-fold';
import {fingerFor,initialPersonal,readPersonal,type PersonalState} from '../src/state';

// A transposed edition shows its verbatim repeats folded, as its original
// does at 0 steps. Its notes keep their identities, so the fold, the
// player's choices and every edit on a folded note read the same
// written-out notes at the new pitches.

const root=new URL('../',import.meta.url);
const assets={font:{name:'fonts/URWGothic-Demi.otf',bytes:readFileSync(new URL('src/URWGothic-Demi.otf',root))},
 notices:Object.fromEntries(['URW-base35-COPYING','URW-base35-LICENSE','URW-base35-provenance.md'].map(name=>
  ['licenses/'+name,readFileSync(new URL('licenses/'+name,root))]))};
class Locks implements AssistanceBrowserLocks {private tail:Promise<unknown>=Promise.resolve();request<T>(_name:string,callback:()=>Promise<T>):Promise<T>{const next=this.tail.then(callback);this.tail=next.catch(()=>{});return next;}}
/** Finger edits accepted in order through the editor's memory session, as the viewer saves them. */
async function fingering(p:ScorePackage,s:PersonalState,edits:readonly [ownerId:string,finger:1|2|3|4|5][]):Promise<PersonalState>{
 const data=new Map<string,string>(),store=browserAssistanceStore({getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);}},new Locks());
 const input={entryId:'no13',importedAt:'2026-11-12T00:00:00.000Z',p,personal:s},session=new PersonalMemorySession(store,{scanLibrary:async()=>[structuredClone(input)],validateInputs:async()=>true});
 await session.initialize();
 let personal=s;
 for(const [ownerId,finger] of edits){const receipt=session.accept({...input,personal:rawMemoryPersonal(personal)},{kind:'finger',edit:{ownerId,finger,decisionId:crypto.randomUUID(),authoredAt:'2026-11-12T00:00:01.000Z'}} as PersonalMemoryAction);await receipt.saved;personal=receipt.personal;}
 return personal;
}
const pitchOf=(p:ScorePackage,id:string)=>{const n=p.score.notes.find(n=>n.id===id) as {pitch:{octave:number;pitchClass:number}};return n.pitch.octave*12+n.pitch.pitchClass;};

// One test on purpose: it engraves No. 13, its +2 edition and that edition's folded pages once.
test('No. 13 transposed +2 folds its repeat as at 0 steps; choices on it reach the right written-out notes',{timeout:10*60_000},async()=>{
 const prepared=await prepareMusicXmlScore(readFileSync(new URL('vendor/iso-notation/src/scores/schumann-op68-no13.musicxml',root)),assets);
 const original=await selectPresentation(await importPackage(prepared.bytes,{allowLegacyTempo:true}),'janko-four-row');
 const up=await selectPresentation(await importPackage(await prepareSourceTransposition(original,prepared.bytes,2),{allowLegacyTempo:true}),'janko-four-row');
 assert.equal(up.transposition?.steps,2);
 const at0=verbatimRepeats(original,initialPersonal(original))?.fold,at2=verbatimRepeats(up,initialPersonal(up))?.fold;
 assert.ok(at0,'No. 13 folds at 0 steps');
 assert.ok(repeatsMayFold(up),'the transposed edition is one the reader folds');
 assert.ok(at2,'and it folds at +2');
 assert.deepEqual([...at2.shownBy].sort(),[...at0.shownBy].sort(),'the same written-out notes fold onto the same notes');
 assert.deepEqual(at2.segments,at0.segments,'the same bars fold');
 assert.equal(at2.score.sourceBarTicks!.length-1,at0.score.sourceBarTicks!.length-1);

 // Twins: a pitched folded note and its two passes, the second written out ten bars later.
 const [shown,[first,second]]=[...at2.shows].find(([id,ids])=>ids.length===2&&id.startsWith('P1:m1:')&&'pitch'in(up.score.notes.find(n=>n.id===id)!))!;
 assert.equal(pitchOf(up,first),pitchOf(original,first)+2);

 // Choices carried from 0 steps fold or write out at +2 exactly as they did there.
 const differ=await fingering(original,initialPersonal(original),[[first,4],[second,2]]),carried=personalForTransposedEdition(differ,original,up);
 assert.equal(carried.carried,2);
 // Shape alone: an assertion message that prints a fold prints its whole score.
 const shape=(r:ReturnType<typeof verbatimRepeats>)=>({folds:r?.fold?.segments.map(s=>[s.sourceBar,s.writtenBar]),kept:r?.kept.map(k=>[k.first,k.second,k.reason])});
 const keptAt2=shape(verbatimRepeats(up,carried.personal));
 assert.deepEqual(keptAt2.kept,[[[0,10],[10,20],'owner-choices-differ']],'twins fingered differently keep their repeat written out');
 assert.deepEqual(keptAt2,shape(verbatimRepeats(original,differ)),'as at 0 steps');
 assert.deepEqual(writtenOutRepeat(up,carried.personal),writtenOutRepeat(original,differ));

 // An edit on the transposed edition's folded note lands on both of its written-out notes, at the new pitches.
 const reader=new FoldedReader(up,null),view=await reader.view(initialPersonal(up),up);
 assert.ok(view?.verbatimFold,'the transposed edition draws folded pages');
 assert.ok(view.pages.length<up.pages.length,`folded pages (${view.pages.length}) are fewer than written-out ones (${up.pages.length})`);
 const seat=view.seats.find(s=>s.ownerIds.includes(first)&&!s.continuation)!;
 assert.deepEqual(editOwners(seat).sort(),[first],'an untouched folded note is its first pass');
 const once=await fingering(up,initialPersonal(up),editOwners(seat).map(id=>[id,3] as [string,3]));
 assert.equal(readPersonal(JSON.parse(JSON.stringify(rawMemoryPersonal(once))),up).assignments?.choices[first]?.guard.pitch,pitchOf(up,first),'saved at the transposed pitch');
 const inherited=withRepeatInheritance(up,once);
 assert.equal(fingerFor(up,inherited,up.seats.find(s=>s.ownerIds.includes(second)&&!s.continuation)!),3,'the untouched second pass reads it');
 const shownAgain=(await reader.view(inherited,up))!;
 const both=shownAgain.seats.find(s=>s.ownerIds.includes(first)&&!s.continuation)!;
 assert.deepEqual(editOwners(both),[first],'the folded seat names the twin carrying the choice');
 const twice=await fingering(up,once,[[first,5],[second,5]]);
 assert.deepEqual(shape(verbatimRepeats(up,twice)),shape(verbatimRepeats(up,initialPersonal(up))),'agreeing twins stay folded');
 assert.equal(shown,at2.shownBy.get(second));

 // Back at 0 steps, the choices made at +2 return to the same notes and fold there too.
 const back=personalForTransposedEdition(twice,up,original);
 assert.equal(back.carried,2);
 assert.deepEqual(shape(verbatimRepeats(original,back.personal)),shape(verbatimRepeats(original,initialPersonal(original))));
 assert.equal(back.personal.assignments?.choices[second]?.finger,5);
});
