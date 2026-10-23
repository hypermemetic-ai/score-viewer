import test from 'node:test';
import assert from 'node:assert/strict';
import {assigned,handFor,handProvenance,handRecurrences,type PersonalHand} from '../src/personal-assignments';
import {initialPersonal,type PersonalState} from '../src/state';
import type {ScorePackage} from '../src/package';
import {buildSchumannNo13MusicXmlImport} from '../vendor/iso-notation/src/scores/schumann-no13-musicxml-import';
import {buildSchumannNo13Draft} from '../vendor/iso-notation/src/scores/schumann-no13-draft';
import {buildSchumannNo30Draft} from '../vendor/iso-notation/src/scores/schumann-no30-draft';
import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';

// A hand change reaches every return of the moved note's hand: the same note,
// on the same beat, struck with the same notes and between the same neighbours
// in that hand, each with the same pitch, written duration and articulation
// (slur and tie membership, staccato, accent and the like). Notes further away
// in that hand, and the other hand, may differ.

/** 2/4 at 48 ticks a beat: bars of 96 ticks. */
const BAR=96;
/** [hand, MIDI-style pitch, onset in the bar, duration, how it is written]. */
type Mark={articulation?:'staccato'|'accent';written?:{type:string;dots?:number};slur?:'from'|'to';tied?:number[]};
type Row=[PersonalHand,number,number,number,Mark?];
/** The left hand plays the same figure in bars 1 and 3; the right hand plays another melody in bar 3. */
const left:Row[]=[['LH',48,0,24],['LH',55,24,24],['LH',52,48,24],['LH',55,72,24]];
const melody:Row[]=[['RH',72,0,48],['RH',74,48,48]],other:Row[]=[['RH',76,0,48],['RH',77,48,48]];
/** A right-hand tune whose second note has both its neighbours in the bar. */
const tune:Row[]=[['RH',72,0,24],['RH',74,24,24],['RH',72,48,48]];
function piece(bars:Record<number,Row[]>):{p:ScorePackage;personal:PersonalState}{
 const count=Math.max(...Object.keys(bars).map(Number)),ticks=Array.from({length:count+1},(_,i)=>i*BAR);
 const notes:any[]=[],phrases:any[]=[],tieChains:any[]=[];
 for(const [bar,rows] of Object.entries(bars))rows.forEach(([hand,pitch,onset,duration,mark={}],i)=>{
  const id=`m${bar}:n${i}`,startTick=ticks[Number(bar)-1]+onset,voice=hand==='RH'?'upper':'lower';
  notes.push({eventKind:'pitched',id,pitch:{octave:Math.floor(pitch/12),pitchClass:pitch%12},startTick,durationTicks:duration,hand,voice:hand==='RH'?1:2,
   sourceProvenance:{voices:[voice],staves:[voice],hands:[hand],unison:false},...(mark.articulation?{articulation:mark.articulation}:{}),...(mark.written?{sourceWrittenValue:mark.written}:{})});
  if(mark.tied){let at=startTick;tieChains.push({noteId:id,voice,soundingTicks:duration,components:mark.tied.map((d,k)=>{const q={startTick:at,durationTicks:d,tieForward:k<mark.tied!.length-1,tieWait:false,voice};at+=d;return q;})});}
 });
 // A slur runs from each 'from' note to the next 'to' note of its hand.
 for(const n of notes){const row=bars[Number(n.id.slice(1,n.id.indexOf(':')))][Number(n.id.slice(n.id.indexOf(':n')+2))];if(row[4]?.slur!=='from')continue;
  const to=notes.find(q=>q.hand===n.hand&&q.startTick>n.startTick&&bars[Number(q.id.slice(1,q.id.indexOf(':')))][Number(q.id.slice(q.id.indexOf(':n')+2))][4]?.slur==='to');
  if(to)phrases.push({id:`slur:${n.id}`,startTick:n.startTick,endTick:to.startTick,fromNoteIds:[n.id],toNoteIds:[to.id],voice:n.hand==='RH'?'upper':'lower',kind:'slur',origin:{},endOrigin:{}});}
 const score={id:'returns',ticksPerBeat:48,totalTicks:ticks.at(-1),sourceBarTicks:ticks,timeSignatures:[{tick:0,numerator:2,denominator:4}],notes,phrases,tieChains};
 return packaged(score as unknown as QuantizedGridScore);
}
function packaged(score:QuantizedGridScore){
 const bars=score.sourceBarTicks!;
 const p={manifest:{version:1,revision:'revision',metadata:{title:'Returns'}},keyboardLayout:'janko-four-row',profileSha256:'geometry',pages:['svg'],score,
  seats:score.notes.map((n,i)=>({id:`s${i}`,ownerIds:[n.id],writtenBar:bars.findLastIndex(t=>t<=n.startTick)+1,contactId:`c${i}`,actionId:`a${i}`,page:0,system:0,x:i,baseline:0,fontSize:12,pitchDigit:'1'}))} as unknown as ScorePackage;
 return {p,personal:initialPersonal(p)};
}
/** The owner's own choice, with its recorded intent, as the editor writes it. */
const move=(input:{p:ScorePackage;personal:PersonalState},id:string,hand:PersonalHand)=>assigned(input.p,input.personal,input.p.seats.find(s=>s.ownerIds.includes(id))!,{hand});
/** Bar 1's LH G3 (the second note) taken by the right hand. */
const g3=(bar:number)=>`m${bar}:n1`;
const reached=(input:{p:ScorePackage;personal:PersonalState},id:string,hand:PersonalHand)=>{const s=move(input,id,hand);return [...handRecurrences(input.p,s).carried.values()].filter(c=>c.fromOwnerId===id).length?[...handRecurrences(input.p,s).carried.keys()].sort():[];};

test('a return of the moved note’s hand takes the move, even where the other hand plays something else',()=>{
 const input=piece({1:[...left,...melody],2:[...left.map(([h,p,o,d]):Row=>[h,p+2,o,d]),...melody],3:[...left,...other]});
 const s=move(input,g3(1),'RH');
 assert.equal(handFor(input.p,s,g3(3)),'RH','bar 3 plays bar 1’s left hand under another melody');
 assert.equal(handFor(input.p,s,g3(2)),'LH','bar 2’s left hand plays other notes');
 assert.deepEqual(handProvenance(input.p,s,g3(3)),{kind:'carried',hand:'RH',fromBar:1});
 assert.deepEqual(handProvenance(input.p,s,g3(1)),{kind:'shared',hand:'RH',toBars:[3]});
 // Derived only: nothing is written for bar 3.
 assert.deepEqual(Object.keys(s.assignments!.choices),[g3(1)]);
 // And the other way round: the right hand's own return.
 const rh=piece({1:[...left,...tune],3:[...left.map(([h,p,o,d]):Row=>[h,p-12,o,d]),...tune]});
 assert.deepEqual(reached(rh,'m1:n5','LH'),['m3:n5']);
 assert.deepEqual(reached(rh,g3(1),'RH'),[],'the left hand plays an octave lower in bar 3');
});

test('a return that differs at the moved note or its neighbours, in pitch or written duration, does not take the move; one that differs further away does',()=>{
 // Bar 1's G3 (the second note) moves; the C3 before it and the E3 after it are its neighbours, the last G3 is further away.
 const changed=(edit:(row:Row,i:number)=>Row)=>piece({1:[...left,...melody],3:[...left.map(edit),...melody]});
 assert.deepEqual(reached(changed(r=>r),g3(1),'RH'),['m3:n1'],'the same left hand matches');
 assert.deepEqual(reached(changed(([h,p,o,d],i)=>[h,i===1?p+1:p,o,d]),g3(1),'RH'),[],'the moved note itself differs in pitch');
 assert.deepEqual(reached(changed(([h,p,o,d],i)=>[h,i===2?p+1:p,o,d]),g3(1),'RH'),[],'the note after it differs in pitch');
 assert.deepEqual(reached(changed(([h,p,o,d],i)=>[h,i===3?p+1:p,o,d]),g3(1),'RH'),['m3:n1'],'a note further away differs in pitch: the move still reaches bar 3');
 assert.deepEqual(reached(changed(([h,p,o,d],i)=>[h,p,o,i===1?12:d]),g3(1),'RH'),[],'the moved note is shorter there');
 assert.deepEqual(reached(changed(([h,p,o,d],i)=>[h,p,o,i===0?12:d]),g3(1),'RH'),[],'the note before it is shorter there');
 assert.deepEqual(reached(changed(([h,p,o,d],i)=>[h,p,o,i===3?12:d]),g3(1),'RH'),['m3:n1'],'a note further away is shorter there');
 // A chord tone struck with the moved note counts as part of it.
 assert.deepEqual(reached(piece({1:[...left,...melody],3:[...left,['LH',59,24,24],...melody]}),g3(1),'RH'),[],'bar 3 strikes a B3 with the G3');
 // The same sounding length, written otherwise: a dotted quarter against a quarter tied to an eighth. Bars 2 and 4 move
 // between the same bars, so the moved dotted quarter has the same neighbours in both.
 const dottedQuarter:Row=['LH',48,0,72,{written:{type:'quarter',dots:1}}],around:Row[]=[['LH',43,0,96]];
 const dotted=piece({1:around,2:[dottedQuarter,['LH',55,72,24],...melody],3:around,4:[dottedQuarter,['LH',55,72,24],...other],5:around});
 assert.deepEqual(reached(dotted,'m2:n0','RH'),['m4:n0'],'written alike');
 const tied=piece({1:around,2:[dottedQuarter,['LH',55,72,24],...melody],3:around,4:[['LH',48,0,72,{written:{type:'quarter'},tied:[48,24]}],['LH',55,72,24],...other],5:around});
 assert.deepEqual(reached(tied,'m2:n0','RH'),[],'a dotted quarter is not a tied quarter and eighth');
});

test('a return with other articulation in the moved note’s hand does not take the move',()=>{
 const marked=(bar3:Row[])=>piece({1:[...left,...melody],3:[...bar3,...other]});
 const staccato=left.map(([h,p,o,d],i):Row=>[h,p,o,d,i===1?{articulation:'staccato'}:{}]);
 assert.deepEqual(reached(marked(staccato),g3(1),'RH'),[],'the moved note is staccato in bar 3');
 const accent=(at:number)=>left.map(([h,p,o,d],i):Row=>[h,p,o,d,i===at?{articulation:'accent'}:{}]);
 assert.deepEqual(reached(marked(accent(2)),g3(1),'RH'),[],'the note after it is accented in bar 3');
 assert.deepEqual(reached(marked(accent(3)),g3(1),'RH'),['m3:n1'],'a note further away is accented in bar 3');
 // Slurred alike in both bars, it matches; slurred in one bar only, it does not.
 const slurred=left.map(([h,p,o,d],i):Row=>[h,p,o,d,i===0?{slur:'from'}:i===2?{slur:'to'}:{}]);
 assert.deepEqual(reached(piece({1:[...slurred,...melody],3:[...slurred,...other]}),g3(1),'RH'),['m3:n1'],'slurred alike');
 assert.deepEqual(reached(piece({1:[...slurred,...melody],3:[...left,...other]}),g3(1),'RH'),[],'under a slur in bar 1 only');
 const later=left.map(([h,p,o,d],i):Row=>[h,p,o,d,i===1?{slur:'from'}:i===3?{slur:'to'}:{}]);
 assert.deepEqual(reached(piece({1:[...slurred,...melody],3:[...later,...other]}),g3(1),'RH'),[],'it starts the slur in bar 3 but lies under one in bar 1');
 // A slur in the other hand only does not matter.
 const rhSlur:Row[]=[['RH',76,0,48,{slur:'from'}],['RH',77,48,48,{slur:'to'}]];
 assert.deepEqual(reached(piece({1:[...left,...melody],3:[...left,...rhSlur]}),g3(1),'RH'),['m3:n1'],'the right hand’s slur is the other hand’s');
});

test('moves in each hand of one bar each reach that hand’s own returns',()=>{
 // Bar 3 repeats bar 1's left hand, bar 5 its right hand.
 const input=piece({1:[...left,...tune],3:[...left,...other],5:[...left.map(([h,p,o,d]):Row=>[h,p-12,o,d]),...tune]});
 let s=move(input,g3(1),'RH');s=move({...input,personal:s},'m1:n5','LH');
 const r=handRecurrences(input.p,s);
 assert.deepEqual([...r.carried].map(([id,c])=>[id,c.hand,c.fromOwnerId]).sort(),[['m3:n1','RH',g3(1)],['m5:n5','LH','m1:n5']]);
 assert.deepEqual(r.targets.get(1),[3,5]);
 assert.deepEqual(handProvenance(input.p,s,g3(1)),{kind:'shared',hand:'RH',toBars:[3]});
 assert.deepEqual(handProvenance(input.p,s,'m1:n5'),{kind:'shared',hand:'LH',toBars:[5]});
});

test('an explicit edit at a return wins there, and undoing the move undoes every copy',()=>{
 const input=piece({1:[...left,...melody],3:[...left,...other],4:[...left,...melody]});
 const s=move(input,g3(1),'RH');
 assert.deepEqual([3,4].map(b=>handFor(input.p,s,g3(b))),['RH','RH']);
 const kept=assigned(input.p,s,input.p.seats.find(q=>q.ownerIds.includes(g3(3)))!,{hand:'LH',local:true});
 assert.deepEqual([1,3,4].map(b=>handFor(input.p,kept,g3(b))),['RH','LH','RH']);
 const undone=move({...input,personal:kept},g3(1),'LH');
 assert.deepEqual([1,3,4].map(b=>handFor(input.p,undone,g3(b))),['LH','LH','LH']);
});

// The returns in ISO's public Schumann sources. For the first note each hand
// plays in each bar, moved to the other hand: the bars it reaches.
const firstNoteReturns=(score:QuantizedGridScore)=>{
 const input=packaged(score),bars=score.sourceBarTicks!,out:string[]=[];
 for(let b=0;b+1<bars.length;b++)for(const hand of ['RH','LH'] as const){
  const n=score.notes.filter(n=>n.hand===hand&&n.startTick>=bars[b]&&n.startTick<bars[b+1]).sort((x,y)=>x.startTick-y.startTick||(x.id<y.id?-1:1))[0];if(!n)continue;
  const s=move(input,n.id,hand==='RH'?'LH':'RH'),reach=handProvenance(input.p,s,n.id);
  if(reach?.kind==='shared'&&reach.toBars.length)out.push(`${b+1} ${hand} → ${[...reach.toBars].sort((x,y)=>x-y).join(' ')}`);
 }
 return out;
};
test('No. 13 as the MusicXML edition writes it out: every written-out return takes the move',()=>{
 const returns=firstNoteReturns(buildSchumannNo13MusicXmlImport().score);
 assert.deepEqual(returns,[
  '2 RH → 12','3 RH → 13 28 44','3 LH → 13 28 44','4 RH → 14 29 45','4 LH → 14 29 45','5 RH → 15 30 46','5 LH → 15 30 46','6 RH → 7 16 17 31 32 47 48',
  '6 LH → 16 31 47','7 RH → 6 16 17 31 32 47 48','7 LH → 17 32 48','8 RH → 18','8 LH → 18','9 RH → 19','9 LH → 19','10 RH → 20',
  '10 LH → 20','11 RH → 21','11 LH → 21','12 RH → 2','13 RH → 3 28 44','13 LH → 3 28 44','14 RH → 4 29 45','14 LH → 4 29 45',
  '15 RH → 5 30 46','15 LH → 5 30 46','16 RH → 6 7 17 31 32 47 48','16 LH → 6 31 47','17 RH → 6 7 16 31 32 47 48','17 LH → 7 32 48','18 RH → 8','18 LH → 8',
  '19 RH → 9','19 LH → 9','20 RH → 10','20 LH → 10','21 RH → 11','21 LH → 11','23 RH → 39','23 LH → 39',
  '24 RH → 40','24 LH → 40','25 RH → 41','25 LH → 41','26 RH → 42','26 LH → 42','27 RH → 43','27 LH → 43',
  '28 RH → 3 13 44','28 LH → 3 13 44','29 RH → 4 14 45','29 LH → 4 14 45','30 RH → 5 15 46','30 LH → 5 15 46','31 RH → 6 7 16 17 32 47 48','31 LH → 6 16 47',
  '32 RH → 6 7 16 17 31 47 48','32 LH → 7 17 48','33 RH → 49','33 LH → 49','34 RH → 50','34 LH → 50','35 RH → 51','35 LH → 51',
  '36 RH → 52','36 LH → 52','37 RH → 53','37 LH → 53','38 RH → 54','38 LH → 54','39 RH → 23','39 LH → 23',
  '40 RH → 24','40 LH → 24','41 RH → 25','41 LH → 25','42 RH → 26','42 LH → 26','43 RH → 27','43 LH → 27',
  '44 RH → 3 13 28','44 LH → 3 13 28','45 RH → 4 14 29','45 LH → 4 14 29','46 RH → 5 15 30','46 LH → 5 15 30','47 RH → 6 7 16 17 31 32 48','47 LH → 6 16 31',
  '48 RH → 6 7 16 17 31 32 47','48 LH → 7 17 32','49 RH → 33','49 LH → 33','50 RH → 34','50 LH → 34','51 RH → 35','51 LH → 35',
  '52 RH → 36','52 LH → 36','53 RH → 37','53 LH → 37','54 RH → 38','54 LH → 38']);
 // Bar 1's opening B4 stands on bar 11's last eighth, but nothing comes before it: bar 11's pickup does not reach it.
 const input=packaged(buildSchumannNo13MusicXmlImport().score),bars=input.p.score.sourceBarTicks!;
 const at=(bar:number,onset:number,hand:PersonalHand)=>input.p.score.notes.filter(n=>n.hand===hand&&n.startTick===bars[bar-1]+onset).map(n=>n.id).sort();
 const pickup=move(input,at(11,72,'RH')[0],'LH');
 assert.equal(handFor(input.p,pickup,at(1,0,'RH')[0]),'RH');
 assert.deepEqual(handProvenance(input.p,pickup,at(11,72,'RH')[0]),{kind:'shared',hand:'LH',toBars:[]});
 // Bar 6 has a grace before its last eighth that bar 7 lacks. Its first note lies away from it, so bars 6 and 7 share it;
 // the graced eighth itself reaches bar 6's own returns only.
 assert.ok(returns.includes('6 RH → 7 16 17 31 32 47 48'));
 const graced=move(input,at(6,72,'RH').find(id=>(input.p.score.notes.find(n=>n.id===id) as {pitch?:{pitchClass:number}}).pitch?.pitchClass===1)!,'LH');
 assert.deepEqual([...handRecurrences(input.p,graced).targets.get(6)!].sort((x,y)=>x-y),[16,31,47]);
});
test('No. 13 unfolded from its repeats: each pass and each written-out return takes the move',()=>{
 const returns=firstNoteReturns(buildSchumannNo13Draft());
 for(const line of ['3 RH → 14 29 46','3 LH → 14 29 46','11 LH → 22','24 LH → 41','6 RH → 7 17 18 32 33 49 50','6 LH → 17 32 49'])assert.ok(returns.includes(line),line);
 // The opening pickup has nothing before it, and bar 23's pickup into the second part follows other notes than bar 40's.
 assert.ok(!returns.some(line=>/^(1|12|23|40) /.test(line)));
 assert.equal(returns.length,102);
});
test('No. 30: a figure reaches the same figure between the same notes, whatever comes later in the bar',()=>{
 const returns=firstNoteReturns(buildSchumannNo30Draft());
 // Bar 32's left hand ends by slurring into the first ending, bar 48's goes on unslurred; their first notes are alike.
 assert.ok(returns.includes('32 LH → 48')&&returns.includes('48 LH → 32'));
 // Bars 9 and 17 open alike and part after their second beat.
 assert.ok(returns.includes('9 RH → 17')&&returns.includes('17 RH → 9'));
 // Bar 18's left hand follows another chord than bar 34's.
 assert.ok(!returns.some(line=>line.startsWith('18 LH')||line.startsWith('34 LH')));
 // The opening pickup has nothing before it, so it reaches no later pickup.
 assert.ok(!returns.some(line=>line.startsWith('1 ')));
 assert.equal(returns.length,90);
});

