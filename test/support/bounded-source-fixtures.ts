import {DOMParser,XMLSerializer} from '@xmldom/xmldom';
import {layoutJankoScore,renderJankoPage,countJankoPages} from '../../vendor/iso-notation/src/render/janko/engine';
import {resolveJankoOptions,resolveJankoTokens} from '../../vendor/iso-notation/src/render/janko/types';
import {requirePitchedEvent} from '../../vendor/iso-notation/src/model/musical-event';
import type {QuantizedGridScore} from '../../vendor/iso-notation/src/model/types';
import type {ScorePackage,Seat} from '../../src/package';
import {durationFixture} from './practice-rendering-fixture';

/** Authored workloads, not composer phrase ground truth. All previews use the
 * pinned production engraving engine, with simultaneous pitches preserved. */
export function boundedSourceFixtures():{name:string;package:ScorePackage}[]{
 const result:{name:string;package:ScorePackage}[]=[];
 for(const [name,counts,chord]of [
  ['weak-uniform',Array(12).fill(8),1],
  ['dense-chords',Array(12).fill(8),4],
  ['irregular-meters',[5,7,9,3,6,8,5,7,9,3,6,8],1],
  ['variable-meter',[6,6,6,8,8,8,5,5,5,7,7,7],1],
 ] as const){
  const bars=[0],notes:QuantizedGridScore['notes']=[],meters:QuantizedGridScore['timeSignatures']=[];let ordinal=0;
  for(const count of counts){const start=bars.at(-1)!;if(!meters.length||meters.at(-1)!.numerator!==count)meters.push({tick:start,numerator:count,denominator:8});
   for(let i=0;i<count;i++,ordinal++)for(let voice=0;voice<chord;voice++){const midi=48+(ordinal*7)%19+voice*4;notes.push({id:`${name}-${ordinal}-${voice}`,eventKind:'pitched',startTick:start+i*24,durationTicks:24,hand:voice<2?'LH':'RH',voice,pitch:{pitchClass:midi%12,octave:Math.floor(midi/12)},readingDisplay:{pitchClass:midi%12,relativeOctave:Math.floor(midi/12)-4,referencePitch:48,isAnchor:false,mode:'absolute'}});}
   bars.push(start+count*24);
  }
  const score:QuantizedGridScore={id:name,title:name,composer:'Authored inspection fixture',ticksPerBeat:48,productionLayout:true,totalTicks:bars.at(-1)!,sourceBarTicks:bars,timeSignatures:meters,notes,tempos:[],dynamics:[],pedals:[],barlines:[{tick:bars.at(-1)!,barNumber:counts.length,type:'final'}],phrases:[],sourceSilences:[],referencePerformanceTempo:{version:'reference-performance-tempo-v1',bpm:80,beat:{numerator:1,denominator:4},provenance:{kind:'editorial',reference:'Authored inspection clock'}}};
  result.push({name,package:engrave(score)});
 }
 result.push({name:'sparse-held-tied',package:durationFixture('hollow-stem',true,'traced',false,true)});
 return result;
}
function engrave(score:QuantizedGridScore):ScorePackage {
 const options=resolveJankoOptions({core:'fixed-3',pitchMapping:'twin-rows',durationGrammar:'complete',writtenTies:'source',sharedRhCarrier:true,readingGlyphSeats:{},measuresPerSystem:3,showMeasureNumbers:true,ticksPerMeasure:192,showHonorHalo:false}),tokens=resolveJankoTokens({stemLength:18}),layouts=layoutJankoScore(score,options,tokens),seats:Seat[]=[];
 const pages=Array.from({length:countJankoPages(score,options,tokens)},(_,page)=>{
  const doc=new DOMParser().parseFromString(renderJankoPage(score,page,options,tokens,layouts),'image/svg+xml');
  for(const head of Array.from(doc.getElementsByTagName('*')).filter(e=>e.getAttribute('class')==='janko-reading-head')){
   const text=Array.from(head.getElementsByTagName('text')).find(e=>e.getAttribute('class')==='janko-digit')!;let parent=head.parentNode as unknown as Element;while(parent&&!/^system-/.test(parent.getAttribute('id')??''))parent=parent.parentNode as unknown as Element;
   const id=head.getAttribute('data-note-id')!,owners=(head.getAttribute('data-owner-ids')??'').split('|'),placed=layouts.flatMap(l=>[...l.notes,...l.unisonVoices]).find(n=>n.note.id===id)!;
   const seat:Seat={id:`bounded-${id}`,ownerIds:owners,actionId:owners[0],contactId:owners[0],page,system:Number(parent.getAttribute('id')!.slice(7))-1,writtenBar:score.sourceBarTicks!.findIndex((b,i)=>i>0&&b>placed.note.startTick),pitchDigit:text.textContent!,x:Number(text.getAttribute('x')),baseline:Number(text.getAttribute('y')),fontSize:Number(text.getAttribute('font-size')!.replace('pt',''))};
   text.setAttribute('data-viewer-seat',seat.id);seats.push(seat);
  }
  return new XMLSerializer().serializeToString(doc);
 });
 for(const n of score.notes)requirePitchedEvent(n);
 return {score,seats,pages,files:{},fingerEligibility:{eligible:false},manifest:{format:'iso-score',version:1,scoreId:score.id,revision:score.id,semanticSha256:score.id,engineVersion:'pinned-production',metadata:{title:score.title,composer:score.composer,provenance:[]},files:{},pages:pages.map((_,i)=>`${i}.svg`),font:'',notices:[],createdAt:''}};
}
