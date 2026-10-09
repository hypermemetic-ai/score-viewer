import {readFileSync} from 'node:fs';import {strToU8} from 'fflate';
import {publishPreparedNative} from '../../src/publication';import {archivePackage,hashBytes,importPackage,pianoPlanningScore,type ScorePackage} from '../../src/package';
import {prepareCalculatedEdition} from '../../src/calculated-hand-edition';import {packagePianoPresentation} from '../../src/piano-package-presentation';
import {calculatePianoAssignments,type PianoAssignmentConstraint} from '../../vendor/iso-notation/src/model/piano-finger-assignments';
import {renderScorePresentation} from '../../vendor/iso-notation/src/score-presentation';
import {SCORE_RENDERING_ENGINE,SCORE_RENDERING_RECIPE_VERSION} from '../../vendor/iso-notation/src/render/janko/score-rendering-recipe';
import {resolveJankoOptions,resolveJankoTokens} from '../../vendor/iso-notation/src/render/janko/types';
import type {Hand,QuantizedGridScore} from '../../vendor/iso-notation/src/model/types';
import type {PhysicalKeyboardId} from '../../vendor/iso-notation/src/model/physical-keyboard';
/** Public independently authored musical source, with a two-level gesture and
 * a separate melody silence while accompaniment can move to that hand. */
export function transferStudy(hand:Hand='LH'):QuantizedGridScore{
 const other=hand==='LH'?'RH':'LH';return{id:'viewer-authored-'+hand,title:'Viewer hand-transfer study '+hand,composer:'Viewer regression',
  ticksPerBeat:48,totalTicks:288,sourceBarTicks:[0,144,288],productionLayout:true,
  notes:[48,52,55].map((pitch,i)=>({id:'gesture-'+i,startTick:i*12,durationTicks:12,hand,eventKind:'pitched' as const,pitch:{octave:4,pitchClass:pitch-48},
   sourceBeam:{group:'public-authored-gesture',noBeam:false},sourceProvenance:{voices:['accompaniment'],staves:['lower'],hands:[hand],unison:false}}))
   .concat([{id:'melody-entrance',startTick:144,durationTicks:144,hand:other,eventKind:'pitched' as const,pitch:{octave:5,pitchClass:9},sourceBeam:{group:'melody',noBeam:true},
    sourceProvenance:{voices:['melody'],staves:['upper'],hands:[other],unison:false}}]),
  sourceSilences:[{voice:'melody',staff:'upper',hand:other,kind:'rest',startTick:0,durationTicks:144,file:'viewer-authored.musicxml',line:1,col:7,bar:1,occurrence:1}],
  barlines:[{tick:0,barNumber:1,type:'regular'},{tick:144,barNumber:2,type:'regular'},{tick:288,barNumber:3,type:'final'}],
  timeSignatures:[{tick:0,numerator:3,denominator:4}],tempos:[],dynamics:[],pedals:[],
  referencePerformanceTempo:{version:'reference-performance-tempo-v1',bpm:90,beat:{numerator:1,denominator:4},provenance:{kind:'editorial',reference:'Authored test clock'}}};
}
export function boundaryStudy():QuantizedGridScore{
 const s=transferStudy();s.id='viewer-authored-boundary';s.title='Repeated boundary and release study';s.sourceSilences=[];
 const note=(id:string,tick:number,pitch:number,duration:number,hand:Hand,voice:string,beam?:string)=>({id,startTick:tick,durationTicks:duration,hand,
  eventKind:'pitched' as const,pitch:{octave:Math.floor(pitch/12),pitchClass:pitch%12},sourceProvenance:{voices:[voice],staves:[voice],hands:[hand],unison:false},...(beam?{sourceBeam:{group:beam}}:{})});
 s.notes=[note('held',0,60,168,'RH','melody'),...['edge-a','edge-b','edge-c','edge-d'].map((id,i)=>note(id,120+i*12,48+i*4,12,'LH','crossing','across-bars')),
  note('short-release',192,61,72,'RH','upper'),note('long-release',192,61,96,'RH','lower')];
 s.tieChains=[{noteId:'held',voice:'melody',soundingTicks:168,components:[{startTick:0,durationTicks:144,tieForward:true,tieWait:false,voice:'melody'},
  {startTick:144,durationTicks:24,tieForward:false,tieWait:false,voice:'melody'}]}];
 const visits=[0,288];s.writtenPresentation={sourceScoreId:s.id,sourceHash:'a'.repeat(64),writtenBars:2,performedBars:4,performedTotalTicks:576,
  repeats:[{startBar:1,endBar:2,times:2}],occurrences:[{performedBar:1,writtenBar:1,pass:1,performedTick:0,writtenTick:0},
   {performedBar:2,writtenBar:2,pass:1,performedTick:144,writtenTick:144},{performedBar:3,writtenBar:1,pass:2,performedTick:288,writtenTick:0},{performedBar:4,writtenBar:2,pass:2,performedTick:432,writtenTick:144}],
  events:{notes:s.notes.flatMap((n,i)=>visits.map((shift,pass)=>({writtenIndex:i,performedIndex:i*2+pass,overrides:{id:n.id+':visit-'+pass,startTick:n.startTick+shift}}))),
   tieChains:visits.map((shift,pass)=>({writtenIndex:0,performedIndex:pass,overrides:{noteId:'held:visit-'+pass,components:s.tieChains![0].components.map(c=>({...c,startTick:c.startTick+shift}))}}))}};
 s.barlines[0].type='repeat-start';s.barlines[2].type='repeat-end';return s;
}
export function denseStudy():QuantizedGridScore{
 const s=transferStudy();s.id='viewer-authored-dense';s.title='Eight-bar independent voice study';s.totalTicks=1152;s.sourceBarTicks=Array.from({length:9},(_,i)=>i*144);
 s.notes=[];s.sourceSilences=[];s.barlines=s.sourceBarTicks.map((tick,i)=>({tick,barNumber:i+1,type:i===8?'final':'regular'}));
 for(let bar=0;bar<8;bar++){const shift=bar*144;
  for(let i=0;i<3;i++)s.notes.push({id:`dense-${bar}-${i}`,startTick:shift+i*12,durationTicks:12,hand:'LH',eventKind:'pitched' as const,pitch:{octave:4,pitchClass:[0,4,7][i]},
   sourceBeam:{group:'dense-figure-'+bar},sourceProvenance:{voices:['accompaniment'],staves:['lower'],hands:['LH'],unison:false}});
  s.notes.push({id:'melody-'+bar,startTick:shift+48,durationTicks:96,hand:'RH',eventKind:'pitched' as const,pitch:{octave:5,pitchClass:bar%3},sourceProvenance:{voices:['melody'],staves:['upper'],hands:['RH'],unison:false}});
  s.sourceSilences.push({voice:'melody',staff:'upper',hand:'RH',kind:'rest',startTick:shift,durationTicks:48,file:'viewer-dense-authored.musicxml',line:1,col:bar+1,bar:bar+1,occurrence:1});
 }return s;
}
/** Three/four independently authored written components cross two/three pages.
 * The following attack transfers; the sounding held owner keeps its own hand. */
export function completeTieBoundaryStudy(count:3|4,hand:Hand):QuantizedGridScore{
 const s=transferStudy(),bars=count-1,end=bars*144,lastTick=end-96,other:Hand=hand==='LH'?'RH':'LH';
 s.id=`viewer-authored-complete-tie-${count}-${hand}`;s.title='Complete written tie boundary study';
 s.totalTicks=end;s.sourceBarTicks=Array.from({length:bars+1},(_,i)=>i*144);s.sourceSilences=[];
 const note=(id:string,startTick:number,pitch:number,durationTicks:number,h:Hand,voice:string,group?:string)=>({id,startTick,durationTicks,hand:h,
  eventKind:'pitched' as const,pitch:{octave:Math.floor(pitch/12),pitchClass:pitch%12},sourceProvenance:{voices:[voice],staves:[voice],hands:[h],unison:false},
  sourceBeam:group?{group,noBeam:false}:{noBeam:true}});
 s.notes=[note('written-hold',0,72,lastTick+24,hand,'held-voice'),note('following-attack',lastTick+24,65,24,other,'held-voice','ending'),
  note('final-attack',lastTick+48,69,24,hand,'held-voice','ending'),
  ...Array.from({length:bars*6},(_,i)=>note('accompaniment-'+i,i*24,36+i%3*2,24,other,'accompaniment','bass-'+Math.floor(i/6)))];
 const values=[{startTick:0,durationTicks:144},...(count===4?[{startTick:144,durationTicks:144}]:[]),
  {startTick:end-144,durationTicks:48},{startTick:lastTick,durationTicks:24}];
 s.tieChains=[{noteId:'written-hold',voice:'held-voice',soundingTicks:lastTick+24,components:values.map((v,i)=>({...v,voice:'held-voice',
  tieForward:i<values.length-1,tieWait:false,sourceBeam:i===values.length-1?{group:'ending',noBeam:false}:{noBeam:true}}))}];
 s.barlines=s.sourceBarTicks.map((tick,i)=>({tick,barNumber:i+1,type:i===bars?'final':'regular'}));return s;
}
export async function sourcePackage(source:QuantizedGridScore,options:Parameters<typeof resolveJankoOptions>[0]={},tokens:Parameters<typeof resolveJankoTokens>[0]={}){
 const sourceBytes=strToU8(JSON.stringify(source)),sourceSha256=await hashBytes(sourceBytes),recipe={version:SCORE_RENDERING_RECIPE_VERSION,engineId:SCORE_RENDERING_ENGINE,sourceSha256,
  options:resolveJankoOptions({measuresPerSystem:2,...options}),tokens:resolveJankoTokens({ticksPerMeasure:144,...tokens}),baseline:{pageSha256:['a'.repeat(64)],seatSha256:'b'.repeat(64)}},
  r=renderScorePresentation(source,recipe);
 recipe.baseline={pageSha256:await Promise.all(r.rawPages.map(hashBytes)),seatSha256:await hashBytes(JSON.stringify(r.seats))};
 const published=await publishPreparedNative({source:sourceBytes,metadata:{title:source.title,composer:source.composer,provenance:['Newly authored public regression']},
  engineVersion:recipe.engineId,createdAt:'2026-10-08',font:{name:'fonts/URWGothic-Demi.otf',bytes:readFileSync(new URL('../../vendor/iso-notation/public/fonts/URWGothic-Demi.otf',import.meta.url))},
  notices:{'notices/authored.txt':strToU8('Newly authored musical source; existing renderer and font licenses retained.')},presentations:[{layoutId:'janko-four-row',seats:r.seats,pages:r.pages}]});
 const m=structuredClone(published.package.manifest),files={...published.package.files};delete files['manifest.json'];
 files['rendering-recipe.json']=strToU8(JSON.stringify(recipe));m.renderingRecipe='rendering-recipe.json';m.presentations!['janko-four-row']!.renderingRecipe='rendering-recipe.json';m.files['rendering-recipe.json']=await hashBytes(files['rendering-recipe.json']);
 const bytes=archivePackage(m,files);return{bytes,p:await importPackage(bytes),source};
}
export async function calculatedStudy(prior:ScorePackage,layout:PhysicalKeyboardId,hands:Record<string,Hand>,extra:readonly PianoAssignmentConstraint[]=[]){
 const constraints:PianoAssignmentConstraint[]=Object.entries(hands).map(([ownerId,hand])=>{const n=prior.sourceScore!.notes.find(n=>n.id===ownerId)!;return{ownerId,hand,
  guard:{pitch:12*n.pitch.octave+n.pitch.pitchClass,startTick:n.startTick,durationTicks:n.durationTicks},provenance:{kind:'operator-choice',reference:'Explicit public comparison hypothesis'}};});
 constraints.push(...extra);
 const chosen=await calculatePianoAssignments(pianoPlanningScore(prior),layout,{sourceHash:prior.sourceSha256!,sourceBytesSha256:prior.sourceSha256!,revision:prior.manifest.revision},{constraints,maxExpansions:200_000}),
  prepared=await prepareCalculatedEdition({...prior,keyboardLayout:layout},chosen.layer,'calculate',constraints),r=prepared.result,
  bytes=await packagePianoPresentation(prior,{layoutId:layout,sourceSha256:prior.sourceSha256!,score:JSON.stringify(r.score),seats:JSON.stringify(r.seats),pages:r.pages,
   layer:chosen.layer,effectiveHandSha256:chosen.effectiveHandSha256,engineVersion:prepared.recipe.engineId,recipe:prepared.recipe,calculatedHandReceipt:prepared.receipt,preparationRequest:{handPolicy:'calculate',maxExpansions:200_000}});
 return{bytes,p:await importPackage(bytes,{keyboardLayout:layout}),r,chosen,constraints};
}
