import type {Manifest,FingerLayer} from './package';

/** Musical admission and physical practice are separate capabilities. Reading
 * an instrument part does not invent piano hands, fingers or key contacts. */
export interface ScoreCapabilities {
  reading:true;
  pianoPreparation:boolean;
  pianoPractice:boolean;
  pianoPerformance:boolean;
  fingerEditing:boolean;
}

export function scoreCapabilities(p:{manifest:Pick<Manifest,'version'>;fingerLayer?:FingerLayer}):ScoreCapabilities {
  const piano=p.manifest.version!==3;
  return {reading:true,pianoPreparation:piano,pianoPractice:piano,pianoPerformance:piano,
    fingerEditing:piano&&!!p.fingerLayer};
}

export function requirePianoCapability(p:{manifest:Pick<Manifest,'version'>;fingerLayer?:FingerLayer},
  capability:'pianoPreparation'|'pianoPractice'|'pianoPerformance'):void {
  if(!scoreCapabilities(p)[capability])throw Error('This score is available for reading. Piano practice and fingering controls apply to piano scores.');
}
