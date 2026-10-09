import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';
import {normalizeLegacyScoreEvents,type LegacyScoreData} from '../vendor/iso-notation/src/model/musical-event';

/** Archive boundary only. Active events stay canonical; frozen legacy source
 * omissions do not create new semantic revisions or invalidate saved bindings. */
export function serializeCompatibleScore(score:QuantizedGridScore,originalBytes:Uint8Array):string {
 const raw=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(originalBytes)) as LegacyScoreData;
 normalizeLegacyScoreEvents(raw);
 const absent=new Set(raw.notes.filter(note=>note.eventKind===undefined).map(note=>note.id)),
  serialized=structuredClone(score) as unknown as {notes:Record<string,unknown>[]};
 for(const note of serialized.notes)if(note.eventKind==='pitched'&&absent.has(note.id as string))delete note.eventKind;
 return JSON.stringify(serialized);
}
