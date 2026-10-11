import type {ScorePackage} from './package';
import {canonicalJson} from './piano-preparation-identity';

// Calculated hand/finger instructions may change; the performed musical
// source, owner clocks and pitches must still be the same complete piece.
const musicalClock=(score:ScorePackage['score'])=>canonicalJson({ticksPerBeat:score.ticksPerBeat,totalTicks:score.totalTicks,bars:score.sourceBarTicks,meters:score.timeSignatures,
 notes:score.notes.map(n=>({id:n.id,kind:n.eventKind,pitch:'pitch' in n?n.pitch:undefined,referencePitch:'referencePitch' in n?n.referencePitch:undefined,start:n.startTick,duration:n.durationTicks,
  voice:n.voice,part:n.partId,staff:n.staffId,sourceVoice:n.voiceId,instrument:n.instrumentId,written:n.sourceWrittenValue,articulation:n.articulation,dynamic:n.dynamicMark,tieStart:n.tieStart,tieEnd:n.tieEnd})),
 silences:score.sourceSilences?.map(s=>({start:s.startTick,duration:s.durationTicks,kind:s.kind,voice:s.voice,staff:s.staff,part:s.partId,written:s.sourceWrittenValue})),ties:score.tieChains,phrases:score.phrases});

export function samePracticeEditionMusic(from:ScorePackage,to:ScorePackage):boolean {
 return canonicalJson(from.sourceScore??from.score)===canonicalJson(to.sourceScore??to.score)&&musicalClock(from.score)===musicalClock(to.score);
}
