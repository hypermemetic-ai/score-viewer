import type {QuantizedGridScore} from '../../vendor/iso-notation/src/model/types';
import {authoredReadingScore,authoredReadingPackage} from './instrument-reading-fixture';
import {importPackage} from '../../src/package';

/** Newly authored literal bars for manual window/clock controls. */
export function authoredManualScore(count=12):QuantizedGridScore {
 const score=authoredReadingScore(),owner={partId:'original-part',staffId:'1',voiceId:'1'};
 score.id='original-manual-practice-study';score.title='Original manual practice study';
 score.totalTicks=count*192;score.sourceBarTicks=Array.from({length:count+1},(_,i)=>i*192);
 score.barlines=score.sourceBarTicks.map((tick,i)=>({tick,barNumber:i+1,type:i===count?'final':'regular'}));
 score.notes=Array.from({length:count},(_,bar)=>[0,2,4,7].map((pitchClass,beat)=>({
  ...owner,id:`authored-${bar}-${beat}`,eventKind:'pitched' as const,pitch:{octave:2,pitchClass},
  startTick:bar*192+beat*48,durationTicks:48,sourceWrittenValue:{type:'quarter',dots:0}
 }))).flat();score.techniques=[];
 return score;
}
export async function authoredManualPackage(count=12){return importPackage(await authoredReadingPackage(authoredManualScore(count)));}
