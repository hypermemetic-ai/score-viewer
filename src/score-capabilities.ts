import {pianoPlanningSourceIssue} from '../vendor/iso-notation/src/model/piano-event';
import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';
import type {Manifest,FingerLayer} from './package';
import type {ReadingContent} from './reading-package';
import {requireReferencePerformanceTempo} from '../vendor/iso-notation/src/model/reference-performance-tempo';

/** Musical admission and physical practice are separate capabilities. Reading
 * an instrument part does not invent piano hands, fingers or key contacts. */
export interface ScoreCapabilities {
  reading:true;
  manualPractice:boolean;
  pianoPreparation:boolean;
  pianoPractice:boolean;
  pianoPerformance:boolean;
  fingerEditing:boolean;
}

type CapabilitySource={manifest:Pick<Manifest,'version'>;fingerLayer?:FingerLayer;score?:QuantizedGridScore;reading?:Pick<ReadingContent,'owners'|'geometryEvidence'>};
function manualReadingAvailable(p:CapabilitySource):boolean {
 const score=p.score,bars=score?.sourceBarTicks;
 if(p.manifest.version!==3||!score||!p.reading?.geometryEvidence.ok||p.reading.owners.length!==score.notes.length||
   score.graceGroups?.length||!bars||bars.length<2||bars.length>2001||bars[0]!==0||bars.at(-1)!==score.totalTicks||
   bars.some((tick,i)=>!Number.isSafeInteger(tick)||tick<0||i>0&&tick<=bars[i-1]))return false;
 try{requireReferencePerformanceTempo(score);return true;}catch{return false;}
}
export function scoreCapabilities(p:CapabilitySource):ScoreCapabilities {
  const piano=(p.manifest.version===1||p.manifest.version===2)&&(!p.score||pianoPlanningSourceIssue(p.score)===undefined);
  return {reading:true,manualPractice:piano||manualReadingAvailable(p),pianoPreparation:piano,pianoPractice:piano,pianoPerformance:piano,
    fingerEditing:piano&&!!p.fingerLayer};
}

export function requirePianoCapability(p:{manifest:Pick<Manifest,'version'>;fingerLayer?:FingerLayer;score?:QuantizedGridScore},
  capability:'pianoPreparation'|'pianoPractice'|'pianoPerformance'):void {
  if(!scoreCapabilities(p)[capability])throw Error('This score is available for reading. Piano practice and fingering controls apply to piano scores.');
}
