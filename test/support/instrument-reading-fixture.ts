import {readFileSync} from 'node:fs';
import type {QuantizedGridScore} from '../../vendor/iso-notation/src/model/types';
import {prepareReadingPackage} from '../../src/reading-package';

/** Original two-voice study; no acquired music or personal state. */
export function authoredReadingScore():QuantizedGridScore {
  const owner={partId:'original-part',staffId:'1',voiceId:'1'};
  return {id:'original-instrument-reading',title:'Original instrument reading study',composer:'Viewer regression',
    ticksPerBeat:48,totalTicks:384,productionLayout:true,sourceBarTicks:[0,192,384],barlines:[{tick:0,barNumber:1,type:'regular'},{tick:192,barNumber:2,type:'regular'},{tick:384,barNumber:3,type:'final'}],tempos:[],dynamics:[],pedals:[],timeSignatures:[{tick:0,numerator:4,denominator:4}],
    referencePerformanceTempo:{version:'reference-performance-tempo-v1',bpm:100,beat:{numerator:1,denominator:4},
      provenance:{kind:'composer',reference:'Original study tempo'}},
    parts:[{id:'original-part',name:'Original bass part',instruments:[{id:'original-bass',name:'Bass',midiProgram:34}]}],
    readingPolicy:{version:'instrument-reading-v2',partId:'original-part',centerPitch:24,guidePitches:[12,24,36],
      pitchFolding:'literal',stemPolicy:'outward',stemDirectionSemantics:'visual'},
    notes:[
      {...owner,id:'center',eventKind:'pitched',pitch:{octave:2,pitchClass:0},writtenPitch:{octave:3,pitchClass:0},startTick:0,durationTicks:24,sourceWrittenValue:{type:'eighth',dots:0}},
      {...owner,id:'same-pitch-independent-voice',voiceId:'2',eventKind:'pitched',pitch:{octave:2,pitchClass:0},startTick:0,durationTicks:24,sourceWrittenValue:{type:'eighth',dots:0}},
      {...owner,id:'higher',eventKind:'pitched',pitch:{octave:2,pitchClass:2},startTick:24,durationTicks:24,sourceWrittenValue:{type:'eighth',dots:0}},
      {...owner,id:'lower',eventKind:'pitched',pitch:{octave:2,pitchClass:0},startTick:48,durationTicks:48,sourceWrittenValue:{type:'quarter',dots:0}},
      {...owner,id:'dead',eventKind:'unpitched',soundingPitch:null,referencePitch:{octave:2,pitchClass:2},writtenReferencePitch:{octave:3,pitchClass:2},startTick:96,durationTicks:24,sourceWrittenValue:{type:'eighth',dots:0}},
      {...owner,id:'below-guide',eventKind:'pitched',pitch:{octave:1,pitchClass:0},startTick:120,durationTicks:24,sourceWrittenValue:{type:'eighth',dots:0}},
      {...owner,id:'upper-guide',eventKind:'pitched',pitch:{octave:3,pitchClass:0},startTick:144,durationTicks:48,sourceWrittenValue:{type:'quarter',dots:0}},
      {...owner,id:'literal-outside-guide',eventKind:'pitched',pitch:{octave:4,pitchClass:0},startTick:192,durationTicks:192,sourceWrittenValue:{type:'whole',dots:0}}
    ],
    techniques:[
      {id:'original-hammer',kind:'hammer-on',label:'H',fromNoteId:'center',toNoteId:'higher',fromTick:0,toTick:24,partId:'original-part',staffId:'1',voiceId:'1'},
      {id:'original-pull',kind:'pull-off',label:'P',fromNoteId:'higher',toNoteId:'lower',fromTick:24,toTick:48,partId:'original-part',staffId:'1',voiceId:'1'}
    ]};
}

export function authoredReadingPackage(score=authoredReadingScore()):Promise<Uint8Array> {
  return prepareReadingPackage({score,metadata:{title:score.title,composer:score.composer,provenance:['Original authored regression study.']},
    createdAt:'2026-10-08T00:00:00Z',options:{measuresPerSystem:1,systemsPerPage:1},font:{name:'fonts/URWGothic-Demi.otf',bytes:readFileSync(new URL('../../src/URWGothic-Demi.otf',import.meta.url))},
    notices:Object.fromEntries(['URW-base35-COPYING','URW-base35-LICENSE','URW-base35-provenance.md'].map(name=>
      ['licenses/'+name,readFileSync(new URL('../../licenses/'+name,import.meta.url))]))});
}
