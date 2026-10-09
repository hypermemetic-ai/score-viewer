import {DOMParser,XMLSerializer} from '@xmldom/xmldom';
import {layoutJankoScore,renderJankoPage,countJankoPages} from '../../vendor/iso-notation/src/render/janko/engine';
import {resolveJankoOptions,resolveJankoTokens} from '../../vendor/iso-notation/src/render/janko/types';
import type {QuantizedGridScore} from '../../vendor/iso-notation/src/model/types';
import type {ScorePackage,Seat} from '../../src/package';

/** Small authored source, engraved by the pinned production engine. No SVG paint
 * is synthesized by the viewer test. It includes real silence and written ties. */
export function durationFixture(marker:'hollow-stem'|'ring'='hollow-stem',finalOverlay=true,tieProfile:'traced'|'uniform'='traced',pairedTie=false,longHold=false,measuresPerSystem=2,threeComponentTie=false):ScorePackage {
 const score:QuantizedGridScore={id:'practice-duration-source',title:'Practice duration source',composer:'Viewer regression',ticksPerBeat:48,totalTicks:2304,sourceBarTicks:Array.from({length:13},(_,i)=>i*192),
  writtenPresentation:{sourceScoreId:'practice-duration-source',sourceHash:'authored-regression-source',performedTotalTicks:2304,writtenBars:12,performedBars:12,repeats:[{startBar:4,endBar:6,times:2}],occurrences:Array.from({length:12},(_,i)=>({performedBar:i+1,writtenBar:i+1,pass:1,performedTick:i*192,writtenTick:i*192})),events:{}},
  referencePerformanceTempo:{version:'reference-performance-tempo-v1',bpm:80,beat:{numerator:1,denominator:4},provenance:{kind:'editorial',reference:'Regression clock'}},
  timeSignatures:[{tick:0,numerator:4,denominator:4}],barlines:[{tick:576,type:'repeat-start',barNumber:4},{tick:1152,type:'repeat-end',barNumber:6},{tick:2304,type:'final',barNumber:12}],tempos:[],dynamics:[],pedals:[],notes:[
   {id:'half',startTick:0,durationTicks:96,hand:'RH',pitch:{pitchClass:0,octave:5}},
   {id:'whole',startTick:192,durationTicks:192,hand:'LH',pitch:{pitchClass:0,octave:3}},
   {id:'dotted',startTick:384,durationTicks:144,hand:'RH',pitch:{pitchClass:7,octave:4}},
   {id:'dotted-cross-hand',startTick:384,durationTicks:144,hand:'LH',pitch:{pitchClass:8,octave:4}},
   {id:'dotted-compatible',startTick:384,durationTicks:144,hand:'RH',pitch:{pitchClass:0,octave:5}},
   {id:'eighth-a',startTick:576,durationTicks:24,hand:'RH',pitch:{pitchClass:2,octave:5},sourceProvenance:{voices:['upper.0'],staves:['upper'],hands:['RH'],unison:false}},
   {id:'eighth-b',startTick:600,durationTicks:24,hand:'RH',pitch:{pitchClass:4,octave:5},sourceProvenance:{voices:['upper.1'],staves:['upper'],hands:['RH'],unison:false}},
   {id:'quarter',startTick:648,durationTicks:48,hand:'LH',pitch:{pitchClass:7,octave:3}},
   {id:'flag',startTick:696,durationTicks:24,hand:'LH',pitch:{pitchClass:2,octave:3}},
   {id:'carry',startTick:960,durationTicks:288,hand:'RH',pitch:{pitchClass:0,octave:5}},
   {id:'unison-a',startTick:1344,durationTicks:48,hand:'RH',pitch:{pitchClass:0,octave:4}},
   {id:'unison-b',startTick:1344,durationTicks:48,hand:'LH',pitch:{pitchClass:0,octave:4}},
  ],sourceSilences:[{voice:'upper',hand:'RH',startTick:768,durationTicks:192,kind:'rest',bar:5,occurrence:1,staff:'upper',file:'practice-duration-source',line:1,col:1},...Array.from({length:4},(_,i)=>({voice:'upper',hand:'RH' as const,startTick:(i+8)*192,durationTicks:192,kind:'rest' as const,bar:i+9,occurrence:1,staff:'upper',file:'practice-duration-source',line:1,col:1}))],tieChains:[{noteId:'carry',voice:'upper',soundingTicks:288,components:[{startTick:960,durationTicks:192,tieForward:true,tieWait:false,voice:'upper'},{startTick:1152,durationTicks:96,tieForward:false,tieWait:false,voice:'upper'}]}]};
 if(longHold){score.notes.push({id:'long-held-owner',startTick:0,durationTicks:1200,hand:'LH',pitch:{pitchClass:1,octave:4}});score.tieChains!.push({noteId:'long-held-owner',voice:'lower',soundingTicks:1200,components:Array.from({length:7},(_,i)=>({startTick:i*192,durationTicks:i===6?48:192,tieForward:i<6,tieWait:false,voice:'lower'}))});}
 if(threeComponentTie){
  const owner=score.notes.find(n=>n.id==='carry')!;owner.durationTicks=264;owner.pitch={pitchClass:7,octave:6};
  score.tieChains![0].soundingTicks=264;score.tieChains![0].components=[{startTick:960,durationTicks:192,tieForward:true,tieWait:false,voice:'upper'},
   {startTick:1152,durationTicks:48,tieForward:true,tieWait:false,voice:'upper'},
   {startTick:1200,durationTicks:24,tieForward:false,tieWait:false,voice:'upper',sourceBeam:{group:'authored-third-component',noBeam:false}}];
  score.notes.push({id:'third-component-neighbor',startTick:1224,durationTicks:24,hand:'RH',pitch:{pitchClass:9,octave:6},sourceBeam:{group:'authored-third-component',noBeam:false}});
  score.notes.push({id:'lower-component-neighbor',startTick:1176,durationTicks:24,hand:'LH',pitch:{pitchClass:8,octave:6}});
 }
 if(pairedTie){score.notes.push({id:'carry-companion',startTick:960,durationTicks:288,hand:'RH',pitch:{pitchClass:2,octave:5}});score.tieChains!.push({noteId:'carry-companion',voice:'upper',soundingTicks:288,components:[{startTick:960,durationTicks:192,tieForward:true,tieWait:false,voice:'upper'},{startTick:1152,durationTicks:96,tieForward:false,tieWait:false,voice:'upper'}]});}
 if(!finalOverlay)score.barlines=score.barlines?.filter(b=>b.type!=='final');
 for(const note of score.notes)note.readingDisplay={pitchClass:note.pitch.pitchClass,relativeOctave:note.pitch.octave-4,referencePitch:48,isAnchor:false,mode:'absolute'};
 const options=resolveJankoOptions({core:'fixed-3',pitchMapping:'twin-rows',durationGrammar:'complete',writtenTies:'source',tieProfile,sharedRhCarrier:true,authoredRestMode:'source',restStyle:'classical-urtext',...(longHold?{continuityLayout:true}:{}),...(marker==='hollow-stem'?{standaloneLongMarker:'hollow-stem' as const}:{}),readingGlyphSeats:{},measuresPerSystem,showMeasureNumbers:true,ticksPerMeasure:192,showHonorHalo:false}),tokens=resolveJankoTokens({stemLength:18});
 const layouts=layoutJankoScore(score,options,tokens);
 for(const layout of layouts)for(const placed of [...layout.notes,...layout.unisonVoices])if(placed.note.id.includes('~c'))placed.note.readingDisplay=score.notes.find(n=>n.id===placed.note.id.replace(/~c\d+$/,''))!.readingDisplay;
 const seats:Seat[]=[],pages=Array.from({length:countJankoPages(score,options,tokens)},(_,page)=>{
  const doc=new DOMParser().parseFromString(renderJankoPage(score,page,options,tokens,layouts),'image/svg+xml');
  const elements=Array.from(doc.getElementsByTagName('*'));
  for(const head of elements.filter(e=>e.getAttribute('class')==='janko-reading-head')){
   const text=Array.from(head.getElementsByTagName('text')).find(e=>e.getAttribute('class')==='janko-digit')!;
   let parent=head.parentNode as unknown as Element;while(parent&&!/^system-/.test(parent.getAttribute('id')??''))parent=parent.parentNode as unknown as Element;
   const id=head.getAttribute('data-note-id')!,owners=(head.getAttribute('data-owner-ids')??'').split('|').map(id=>id.replace(/~c\d+$/,'')),placed=layouts.flatMap(l=>[...l.notes,...l.unisonVoices]).find(n=>n.note.id===id)!;
   const seat:Seat={id:`duration-${id}`,ownerIds:owners,actionId:owners[0],contactId:owners[0],page,system:Number(parent.getAttribute('id')!.slice(7))-1,writtenBar:Math.floor(placed.note.startTick/192)+1,pitchDigit:text.textContent!,x:Number(text.getAttribute('x')),baseline:Number(text.getAttribute('y')),fontSize:Number(text.getAttribute('font-size')!.replace('pt','')),...(id.includes('~c')?{continuation:true}:{})};
   text.setAttribute('data-viewer-seat',seat.id);seats.push(seat);
  }
  return new XMLSerializer().serializeToString(doc);
 });
 return {score,seats,pages,files:{},fingerEligibility:{eligible:false},manifest:{format:'iso-score',version:1,scoreId:score.id,revision:'duration-regression',semanticSha256:'duration-regression',engineVersion:'pinned-production',metadata:{title:score.title,composer:score.composer,provenance:[]},files:{},pages:pages.map((_,i)=>`${i}.svg`),font:'',notices:[],createdAt:''}};
}
