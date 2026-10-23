import test from 'node:test';
import assert from 'node:assert/strict';
import {assigned,handFor,handProvenance,handRecurrences,type PersonalHand} from '../src/personal-assignments';
import {initialPersonal,type PersonalState} from '../src/state';
import type {ScorePackage} from '../src/package';
import {buildSchumannNo13MusicXmlImport} from '../vendor/iso-notation/src/scores/schumann-no13-musicxml-import';
import {buildSchumannNo13Draft} from '../vendor/iso-notation/src/scores/schumann-no13-draft';
import {buildSchumannNo30Draft} from '../vendor/iso-notation/src/scores/schumann-no30-draft';
import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';

// A hand change reaches every return of the moved note's hand: the same notes
// in that hand, with the same pitch, written duration and articulation (slur
// and tie membership, staccato, accent and the like), compared per hand. The
// other hand may differ.

/** 2/4 at 48 ticks a beat: bars of 96 ticks. */
const BAR=96;
/** [hand, MIDI-style pitch, onset in the bar, duration, how it is written]. */
type Mark={articulation?:'staccato'|'accent';written?:{type:string;dots?:number};slur?:'from'|'to';tied?:number[]};
type Row=[PersonalHand,number,number,number,Mark?];
/** The left hand plays the same figure in bars 1 and 3; the right hand plays another melody in bar 3. */
const left:Row[]=[['LH',48,0,24],['LH',55,24,24],['LH',52,48,24],['LH',55,72,24]];
const melody:Row[]=[['RH',72,0,48],['RH',74,48,48]],other:Row[]=[['RH',76,0,48],['RH',77,48,48]];
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
 const rh=piece({1:[...left,...melody],3:[...left.map(([h,p,o,d]):Row=>[h,p-12,o,d]),...melody]});
 assert.deepEqual(reached(rh,'m1:n4','LH'),['m3:n4']);
 assert.deepEqual(reached(rh,g3(1),'RH'),[],'the left hand plays an octave lower in bar 3');
});

test('a return that differs in the moved note’s hand, in pitch or written duration, does not take the move',()=>{
 const changed=(edit:(row:Row,i:number)=>Row)=>piece({1:[...left,...melody],3:[...left.map(edit),...melody]});
 assert.deepEqual(reached(changed(r=>r),g3(1),'RH'),['m3:n1'],'the same left hand matches');
 assert.deepEqual(reached(changed(([h,p,o,d],i)=>[h,i===3?p+1:p,o,d]),g3(1),'RH'),[],'another note of the left hand differs in pitch');
 assert.deepEqual(reached(changed(([h,p,o,d],i)=>[h,p,o,i===1?12:d]),g3(1),'RH'),[],'the moved note is shorter there');
 assert.deepEqual(reached(changed(([h,p,o,d],i)=>[h,p,o,i===0?12:d]),g3(1),'RH'),[],'another note of the left hand is shorter there');
 // The same sounding length, written otherwise: a dotted quarter against a quarter tied to an eighth.
 const dotted=piece({1:[['LH',48,0,72,{written:{type:'quarter',dots:1}}],['LH',55,72,24],...melody],3:[['LH',48,0,72,{written:{type:'quarter',dots:1}}],['LH',55,72,24],...other]});
 assert.deepEqual(reached(dotted,'m1:n1','RH'),['m3:n1'],'written alike');
 const tied=piece({1:[['LH',48,0,72,{written:{type:'quarter',dots:1}}],['LH',55,72,24],...melody],3:[['LH',48,0,72,{written:{type:'quarter'},tied:[48,24]}],['LH',55,72,24],...other]});
 assert.deepEqual(reached(tied,'m1:n1','RH'),[],'a dotted quarter is not a tied quarter and eighth');
});

test('a return with other articulation in the moved note’s hand does not take the move',()=>{
 const marked=(bar3:Row[])=>piece({1:[...left,...melody],3:[...bar3,...other]});
 const staccato=left.map(([h,p,o,d],i):Row=>[h,p,o,d,i===1?{articulation:'staccato'}:{}]);
 assert.deepEqual(reached(marked(staccato),g3(1),'RH'),[],'the moved note is staccato in bar 3');
 const accent=left.map(([h,p,o,d],i):Row=>[h,p,o,d,i===3?{articulation:'accent'}:{}]);
 assert.deepEqual(reached(marked(accent),g3(1),'RH'),[],'another note of the left hand is accented in bar 3');
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
 const input=piece({1:[...left,...melody],3:[...left,...other],5:[...left.map(([h,p,o,d]):Row=>[h,p-12,o,d]),...melody]});
 let s=move(input,g3(1),'RH');s=move({...input,personal:s},'m1:n4','LH');
 const r=handRecurrences(input.p,s);
 assert.deepEqual([...r.carried].map(([id,c])=>[id,c.hand,c.fromOwnerId]).sort(),[['m3:n1','RH',g3(1)],['m5:n4','LH','m1:n4']]);
 assert.deepEqual(r.targets.get(1),[3,5]);
 assert.deepEqual(handProvenance(input.p,s,g3(1)),{kind:'shared',hand:'RH',toBars:[3]});
 assert.deepEqual(handProvenance(input.p,s,'m1:n4'),{kind:'shared',hand:'LH',toBars:[5]});
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
  '1 RH → 11','2 RH → 12','2 LH → 12','3 RH → 13 28 44','3 LH → 13 28 44','4 RH → 14 29 45','4 LH → 14 29 45','5 RH → 15 30 46',
  '5 LH → 15 30 46','6 RH → 16 31 47','6 LH → 7 16 17 31 32 47 48','7 RH → 17 32 48','7 LH → 6 16 17 31 32 47 48','8 RH → 18','8 LH → 18','9 RH → 19',
  '9 LH → 19','10 RH → 20','10 LH → 20','11 RH → 21','11 LH → 21','12 RH → 2','12 LH → 2','13 RH → 3 28 44',
  '13 LH → 3 28 44','14 RH → 4 29 45','14 LH → 4 29 45','15 RH → 5 30 46','15 LH → 5 30 46','16 RH → 6 31 47','16 LH → 6 7 17 31 32 47 48','17 RH → 7 32 48',
  '17 LH → 6 7 16 31 32 47 48','18 RH → 8','18 LH → 8','19 RH → 9','19 LH → 9','20 RH → 10','20 LH → 10','21 RH → 11',
  '21 LH → 11','22 RH → 38','22 LH → 38','23 RH → 39','23 LH → 39','24 RH → 40','24 LH → 40','25 RH → 41',
  '25 LH → 41','26 RH → 42','26 LH → 42','27 RH → 43','27 LH → 43','28 RH → 3 13 44','28 LH → 3 13 44','29 RH → 4 14 45',
  '29 LH → 4 14 45','30 RH → 5 15 46','30 LH → 5 15 46','31 RH → 6 16 47','31 LH → 6 7 16 17 32 47 48','32 RH → 7 17 48','32 LH → 6 7 16 17 31 47 48','33 RH → 49',
  '33 LH → 49','34 RH → 50','34 LH → 50','35 RH → 51','35 LH → 51','36 RH → 52','36 LH → 52','37 RH → 53',
  '37 LH → 53','38 RH → 54','38 LH → 54','39 RH → 23','39 LH → 23','40 RH → 24','40 LH → 24','41 RH → 25',
  '41 LH → 25','42 RH → 26','42 LH → 26','43 RH → 27','43 LH → 27','44 RH → 3 13 28','44 LH → 3 13 28','45 RH → 4 14 29',
  '45 LH → 4 14 29','46 RH → 5 15 30','46 LH → 5 15 30','47 RH → 6 16 31','47 LH → 6 7 16 17 31 32 48','48 RH → 7 17 32','48 LH → 6 7 16 17 31 32 47','49 RH → 33',
  '49 LH → 33','50 RH → 34','50 LH → 34','51 RH → 35','51 LH → 35','52 RH → 36','52 LH → 36','53 RH → 37',
  '53 LH → 37','54 RH → 38','54 LH → 38']);
 // The pickups into each repeat are the pickups they repeat: bar 1's opening B4 is bar 11's last eighth, bar 22 is bar 38's last eighth.
 const input=packaged(buildSchumannNo13MusicXmlImport().score),bars=input.p.score.sourceBarTicks!;
 const at=(bar:number,onset:number,hand:PersonalHand)=>input.p.score.notes.filter(n=>n.hand===hand&&n.startTick===bars[bar-1]+onset).map(n=>n.id).sort();
 const pickup=move(input,at(11,72,'RH')[0],'LH');
 assert.equal(handFor(input.p,pickup,at(1,0,'RH')[0]),'LH');
 assert.deepEqual(handProvenance(input.p,pickup,at(11,72,'RH')[0]),{kind:'shared',hand:'LH',toBars:[1]});
 // Bars 6 and 7 play the same notes, but bar 6 has a grace before its third eighth: the right hand reaches bar 6's own returns only.
 assert.ok(returns.includes('6 RH → 16 31 47')&&returns.includes('6 LH → 7 16 17 31 32 47 48'));
});
test('No. 13 unfolded from its repeats: each pass and each written-out return takes the move',()=>{
 const returns=firstNoteReturns(buildSchumannNo13Draft());
 for(const line of ['1 RH → 12','3 RH → 14 29 46','3 LH → 14 29 46','11 LH → 22','23 LH → 40','6 RH → 17 32 49','6 LH → 7 17 18 32 33 49 50'])assert.ok(returns.includes(line),line);
 assert.equal(returns.length,110);
});
test('No. 30: a left hand that returns under another right hand takes the move; one slurred into the first ending only does not',()=>{
 const returns=firstNoteReturns(buildSchumannNo30Draft());
 assert.ok(returns.includes('18 LH → 34')&&returns.includes('34 LH → 18'),'the left hand of bars 18 and 34 is the same, the right hand is not');
 assert.ok(!returns.some(line=>line.startsWith('18 RH')||line.startsWith('34 RH')),'the right hand differs there');
 // Bar 32's left hand ends by slurring into the first ending; bar 48's goes on to the second ending unslurred.
 assert.ok(returns.includes('32 RH → 48')&&!returns.some(line=>line.startsWith('32 LH')||line.startsWith('48 LH')));
 assert.ok(returns.includes('33 RH → 49')&&!returns.some(line=>line.startsWith('33 LH')||line.startsWith('49 LH')));
 // The opening pickup returns as the pickup into later phrases, at the end of their bars.
 assert.ok(returns.includes('1 RH → 2 5 6 9 10 13 14 25 26 41 42'));
 assert.equal(returns.length,88);
});
