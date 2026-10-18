import {resolveActiveScore} from '../vendor/iso-notation/src/scores/active';
import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';
import {publishNativePianoScore,type NativePianoAssets} from './native-piano-preparation';

/** ISO notation's active reference scores that the viewer packages. Brahms is
 * not offered. */
export const ISO_REFERENCE_SCORES={
 'bach-goldberg-var1':{composer:'J. S. Bach',
  hands:'Hands are the operator-approved GOLD assignments in the active score data (docs/bach-var1-gold-hands.md), kept exactly; none are calculated or inferred.'},
} as const;
export type IsoReferenceScoreId=keyof typeof ISO_REFERENCE_SCORES;
export const isIsoReferenceScore=(id:string):id is IsoReferenceScoreId=>Object.hasOwn(ISO_REFERENCE_SCORES,id);

/** ISO's active score for this id (the same data ISO's own Reference and Play
 * screens read): the source builder with the active overlay's hands. The only addition is the score's own
 * barlines as source bar boundaries, which the approved production engraving
 * lays out by; pitches, durations, hands and identities are unchanged. */
export function isoReferenceScore(id:IsoReferenceScoreId){
 const active=resolveActiveScore(id),{score}=active;
 const bars=score.barlines.map(b=>b.tick);
 if(bars[0]!==0||bars.at(-1)!==score.totalTicks||bars.some((tick,i)=>i&&tick<=bars[i-1]))throw Error(`${id} has no complete written bar boundaries.`);
 const prepared:QuantizedGridScore={...structuredClone(score),sourceBarTicks:bars,productionLayout:true};
 return {score:prepared,active};
}

/** One active ISO reference score becomes a native .tuna archive through the
 * same preparation as an imported MusicXML piano score. Its duration
 * engraving controls ride along; the shared production policy wins.
 * ISO's GOLD view also sets temporalAssociation, but the rendering recipe
 * admits that option only for the calculated-hand engine, so the approved
 * production engraving here does without it. */
export async function prepareIsoReferenceScore(id:IsoReferenceScoreId,assets:NativePianoAssets,isoRevision:string):Promise<{bytes:Uint8Array;filename:string;revision:string}> {
 if(!/^[0-9a-f]{40}$/.test(isoRevision))throw Error('Name the full iso-notation revision.');
 const {score,active}=isoReferenceScore(id),info=ISO_REFERENCE_SCORES[id];
 const {exceptionCarrier,durationSeatPreferences}=active.options;
 const out=await publishNativePianoScore(score,{assets,tokens:active.tokens,
  options:{exceptionCarrier,...(durationSeatPreferences?{durationSeatPreferences}:{})},
  metadata:{title:score.title,composer:info.composer,provenance:[
   `iso-notation ${isoRevision}, active score ${id} revision ${active.revision}.`,info.hands]}});
 return {bytes:out.bytes,filename:out.filename,revision:active.revision};
}
