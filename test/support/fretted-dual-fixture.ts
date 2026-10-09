import {readFileSync} from 'node:fs';
import {parseMusicXml} from '../../vendor/iso-notation/src/import/musicxml/parse';
import {projectMusicXml} from '../../vendor/iso-notation/src/import/musicxml/project';
import {prepareDualReadingPackage} from '../../src/dual-reading-package';

/** Original source-authored study: alternate tuning, chords, rests, a tie and
 * H/P. It carries no acquired repertoire or converter-derived family claim. */
export function authoredFrettedScore(){
 const xml=readFileSync(new URL('../../vendor/iso-notation/test/fixtures/fretted-source-four-bars.musicxml',import.meta.url),'utf8'),
  score=projectMusicXml(parseMusicXml(xml,'authored-four-bars.musicxml',{frettedSource:'retain-v1'}),{id:'authored-fretted-dual',
   readingPolicy:{version:'instrument-reading-v2',partId:'P1',centerPitch:24,guidePitches:[12,24,36],pitchFolding:'literal',stemPolicy:'outward',stemDirectionSemantics:'visual'}}).score;
 score.referencePerformanceTempo??={version:'reference-performance-tempo-v1',bpm:100,beat:{numerator:1,denominator:4},
  provenance:{kind:'composer',reference:'Original study tempo'}};return score;
}
export function authoredFrettedInput(){const score=authoredFrettedScore();return {score,metadata:{title:score.title,composer:score.composer,provenance:['Source-authored regression study.']},
 createdAt:'2026-10-09T00:00:00Z',options:{pageWidth:620,pageHeight:480,measuresPerSystem:4,systemsPerPage:1},
 font:{name:'fonts/URWGothic-Demi.otf',bytes:readFileSync(new URL('../../src/URWGothic-Demi.otf',import.meta.url))},
 notices:Object.fromEntries(['URW-base35-COPYING','URW-base35-LICENSE','URW-base35-provenance.md'].map(name=>
 ['licenses/'+name,readFileSync(new URL('../../licenses/'+name,import.meta.url))]))};}
export const authoredFrettedPackage=()=>prepareDualReadingPackage(authoredFrettedInput());

/** Twelve original authored bars, retaining every literal tied component.
 * Used for real page/window navigation rather than duplicating rendered ink. */
function authoredFrettedBarsInput(count:5|12){
 const input=authoredFrettedInput(),xml=readFileSync(new URL('../../vendor/iso-notation/test/fixtures/fretted-source-four-bars.musicxml',import.meta.url),'utf8'),
  measures=xml.match(/<measure\b[\s\S]*?<\/measure>/g)!;
 let number=0;
 const extended=xml.replace(measures.join(''),Array.from({length:3},(_,cycle)=>measures.map(measure=>
  (cycle?measure.replace(/<attributes>[\s\S]*?<\/attributes>/,''):measure).replace(/number="\d+"/,`number="${++number}"`)).filter((_,i)=>cycle*measures.length+i<count).join('')).join(''));
 input.score=projectMusicXml(parseMusicXml(extended,count===12?'authored-twelve-bars.musicxml':'authored-five-bars.musicxml',{frettedSource:'retain-v1'}),{
  id:count===12?'authored-fretted-long-dual':'authored-fretted-five-dual',readingPolicy:input.score.readingPolicy}).score;
 input.score.referencePerformanceTempo={version:'reference-performance-tempo-v1',bpm:100,beat:{numerator:1,denominator:4},
  provenance:{kind:'composer',reference:'Original study tempo'}};
 return input;
}

export const authoredFrettedLongInput=()=>authoredFrettedBarsInput(12);
export const authoredFrettedFiveInput=()=>authoredFrettedBarsInput(5);
