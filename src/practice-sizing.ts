import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';

/** A sizing clock, not a playback tempo or a measured human memory limit. */
export const BOUNDED_PRACTICE_POLICY=Object.freeze({
 version:'onset-musical-boundaries-v1',onsetsPerSecond:5,targetSeconds:5,
 preferredMinSeconds:4,preferredMaxSeconds:6,cueSeconds:2.5,continuationSeconds:2.5,
 minimumPatternOnsets:12,maximumPatternOnsets:40,maximumPatternBars:8,
 maximumSourceBars:2000,maximumNotes:100000,maximumLookbackCuts:128,
 weights:Object.freeze({section:.5,deviation:4,outside:12,tiny:12,obligation:5,
  boundaryReward:.85,maximumEvidence:3,recurrence:1.1,authored:2.5,
  rest:1.1,longNote:.35,phrase:.25,texture:.4,continuingTrunk:.1,
  independentRecurrence:.15,excerptEvidence:.15,excerptOnset:.05}),
});

export const boundedPracticePolicyFingerprint=JSON.stringify(BOUNDED_PRACTICE_POLICY);
export const estimatedPracticeSeconds=(onsets:number)=>onsets/BOUNDED_PRACTICE_POLICY.onsetsPerSecond;

/** Sounding note owners start once; written tie components are appearances.
 * All pitches at the same intended score tick share one sizing onset. */
export function distinctPracticeOnsets(source:Pick<QuantizedGridScore,'notes'>):number[]{
 if(source.notes.length>BOUNDED_PRACTICE_POLICY.maximumNotes)throw Error('Practice sizing exceeds its note bound.');
 const ticks=new Set<number>();
 for(const note of source.notes){
  if(!Number.isSafeInteger(note.startTick)||note.startTick<0||!Number.isSafeInteger(note.durationTicks)||note.durationTicks<=0)
   throw Error('Practice sizing needs exact positive source timing.');
  ticks.add(note.startTick);
 }
 return [...ticks].sort((a,b)=>a-b);
}
