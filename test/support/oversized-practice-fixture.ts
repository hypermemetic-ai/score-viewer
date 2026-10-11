import {readFileSync} from 'node:fs';
import {DOMParser,XMLSerializer} from '@xmldom/xmldom';
import {authoredReadingScore} from './instrument-reading-fixture';
import {prepareReadingPackage} from '../../src/reading-package';
import {importPackage,type ScorePackage,type Seat} from '../../src/package';
import {layoutJankoScore,renderJankoPage,countJankoPages} from '../../vendor/iso-notation/src/render/janko/engine';
import {resolveJankoOptions,resolveJankoTokens} from '../../vendor/iso-notation/src/render/janko/types';
import {requirePitchedEvent} from '../../vendor/iso-notation/src/model/musical-event';
import {authoredFrettedInput} from './fretted-dual-fixture';
import {parseMusicXml} from '../../vendor/iso-notation/src/import/musicxml/parse';
import {projectMusicXml} from '../../vendor/iso-notation/src/import/musicxml/project';
import {prepareDualReadingPackage} from '../../src/dual-reading-package';

/** Wide authored source pages admit oversized measures without weakening
 * production geometry. Their held voices cross the required workload cuts. */
export async function oversizedPracticeFixture(){
 const score=authoredReadingScore(),owner={partId:'original-part',staffId:'1',voiceId:'1'};
 score.totalTicks=3072;score.sourceBarTicks=[0,1536,3072];score.timeSignatures=[{tick:0,numerator:32,denominator:4}];
 score.barlines=[{tick:0,barNumber:1,type:'regular'},{tick:1536,barNumber:2,type:'regular'},{tick:3072,barNumber:3,type:'final'}];score.techniques=[];
 score.notes=Array.from({length:128},(_,i)=>({...owner,id:`large-${i}`,eventKind:'pitched' as const,pitch:{octave:2,pitchClass:i%12},startTick:i*24,durationTicks:24,sourceWrittenValue:{type:'eighth' as const,dots:0}}));
 for(const startTick of [0,1536])score.notes.push({...owner,voiceId:'2',id:`held-${startTick}`,eventKind:'pitched',pitch:{octave:1,pitchClass:0},startTick,durationTicks:1200});
 const manual=await importPackage(await prepareReadingPackage({score,metadata:{title:score.title,composer:score.composer,provenance:['Authored oversized-bar session regression']},createdAt:'2026-10-11T00:00:00Z',options:{pageWidth:1100,measuresPerSystem:1,systemsPerPage:1},font:{name:'fonts/URWGothic-Demi.otf',bytes:readFileSync(new URL('../../src/URWGothic-Demi.otf',import.meta.url))},notices:Object.fromEntries(['URW-base35-COPYING','URW-base35-LICENSE','URW-base35-provenance.md'].map(name=>['licenses/'+name,readFileSync(new URL('../../licenses/'+name,import.meta.url))]))}));
 const pianoScore=structuredClone(score);delete pianoScore.readingPolicy;delete pianoScore.parts;
 pianoScore.notes=pianoScore.notes.map(n=>({...n,hand:n.voiceId==='2'?'LH' as const:'RH' as const}));
 for(const n of pianoScore.notes){const pitch=requirePitchedEvent(n).pitch;n.readingDisplay={pitchClass:pitch.pitchClass,relativeOctave:pitch.octave-4,referencePitch:48,isAnchor:false,mode:'absolute'};}
 const options=resolveJankoOptions({pageWidth:2200,core:'fixed-3',pitchMapping:'twin-rows',durationGrammar:'complete',writtenTies:'source',sharedRhCarrier:true,readingGlyphSeats:{},measuresPerSystem:2,showMeasureNumbers:true,ticksPerMeasure:1536,showHonorHalo:false}),tokens=resolveJankoTokens({stemLength:18}),layouts=layoutJankoScore(pianoScore,options,tokens),seats:Seat[]=[];
 const pages=Array.from({length:countJankoPages(pianoScore,options,tokens)},(_,page)=>{
  const doc=new DOMParser().parseFromString(renderJankoPage(pianoScore,page,options,tokens,layouts),'image/svg+xml');
  for(const head of Array.from(doc.getElementsByTagName('*')).filter(e=>e.getAttribute('class')==='janko-reading-head')){
   const text=Array.from(head.getElementsByTagName('text')).find(e=>e.getAttribute('class')==='janko-digit')!;let parent=head.parentNode as unknown as Element;while(parent&&!/^system-/.test(parent.getAttribute('id')??''))parent=parent.parentNode as unknown as Element;
   const id=head.getAttribute('data-note-id')!,owners=(head.getAttribute('data-owner-ids')??'').split('|'),placed=layouts.flatMap(l=>[...l.notes,...l.unisonVoices]).find(n=>n.note.id===id)!;
   const seat:Seat={id:`oversized-${id}`,ownerIds:owners,actionId:owners[0],contactId:owners[0],page,system:Number(parent.getAttribute('id')!.slice(7))-1,writtenBar:Math.floor(placed.note.startTick/1536)+1,pitchDigit:text.textContent!,x:Number(text.getAttribute('x')),baseline:Number(text.getAttribute('y')),fontSize:Number(text.getAttribute('font-size')!.replace('pt',''))};
   text.setAttribute('data-viewer-seat',seat.id);seats.push(seat);
  }
  return new XMLSerializer().serializeToString(doc);
 });
 const piano:ScorePackage={score:pianoScore,seats,pages,files:{},fingerEligibility:{eligible:false},manifest:{...manual.manifest,version:1,revision:'a'.repeat(64),semanticSha256:'b'.repeat(64)}};
 return {score,manual,piano};
}

/** Literal XML attacks and source strings/frets allow
 * the actual dual-view manual crop path to be inspected, without fake scenes. */
export async function oversizedDualPracticeFixture(){
 const input=authoredFrettedInput(),xml=readFileSync(new URL('../../vendor/iso-notation/test/fixtures/fretted-source-four-bars.musicxml',import.meta.url),'utf8'),first=xml.match(/<measure\b[\s\S]*?<\/measure>/)![0],attributes=first.match(/<attributes>[\s\S]*?<\/attributes>/)![0].replace('<beats>4</beats>','<beats>32</beats>'),melody=first.match(/<note>[\s\S]*?<\/note>/g)!.map(n=>n.replace(/<beam\b[\s\S]*?<\/beam>/g,''));
 const notes=melody.join('').repeat(8);
 const body=Array.from({length:2},(_,i)=>`<measure number="${i+1}">${i?'':attributes}${notes}</measure>`).join('');
 const score=projectMusicXml(parseMusicXml(xml.slice(0,xml.indexOf('<measure'))+body+'</part></score-partwise>','authored-oversized-dual.musicxml',{frettedSource:'retain-v1'}),{id:'authored-oversized-dual',readingPolicy:input.score.readingPolicy}).score;
 score.referencePerformanceTempo=input.score.referencePerformanceTempo;
 return prepareDualReadingPackage({...input,score,options:{...input.options,pageWidth:2000,measuresPerSystem:1}});
}
