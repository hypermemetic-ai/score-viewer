import type * as PublicMuseScore from 'score-converter-proof/musescore/webview';
import type {MuseScoreReport} from 'score-converter-proof/musescore/webview';
import {prepareMusicXmlScore,MusicXmlImportRefusal,type MusicXmlAssets} from './musicxml-import';
import {capturedReadingExecution,checkReadingExecution,type ReadingExecution} from './reading-execution';

/** The unchanged public WebView host is emitted with its adjacent local Worker
 * and notices. It is loaded only when a MuseScore file is actually imported. */
export function museScorePublicEntryUrl(){return new URL((import.meta.env?.BASE_URL??'./')+'converter/musescore/musescore.js',location.href).href;}
let runtime:Promise<typeof PublicMuseScore>|undefined;
export function museScoreRuntime():Promise<typeof PublicMuseScore>{
 return runtime??=import(/* @vite-ignore */ museScorePublicEntryUrl()).catch(error=>{runtime=undefined;throw error;});
}

export class MuseScoreImportRefusal extends Error {
 constructor(message:string,readonly code?:string,options?:ErrorOptions){super(message,options);this.name='MuseScoreImportRefusal';}
}
/** Musical names for notation the converter or reader can't take yet. The
 * developer's code or reader message stays on the refusal for diagnosis. */
const notationWords:readonly (readonly [RegExp,string])[]=[
 [/(?:^|[-\s])cents?(?:[-\s]|$)|microtonal|alter: expected safe integer/,'quarter-tone or other microtonal accidentals'],
 [/figured-bass/,'figured bass'],[/harmony|frame/,'chord symbols or chord diagrams'],
 [/pedal/,'pedal markings'],[/fermata/,'fermatas'],[/arpeggio/,'arpeggio signs'],[/glissando/,'glissandos'],
 [/tremolo/,'tremolos'],[/ornament|trill|mordent|\bturn\b/,'ornaments'],[/articulation/,'articulation marks'],
 [/fingering/,'fingerings'],[/\bbend/,'string bends'],[/drum|unpitched|percussion/,'percussion notation'],
 [/\b(?:tab|tablature|other-technical|capo|fret)\b/,'tablature'],[/notehead/,'special noteheads'],
 [/measure-style|\brepeat\b/,'measure repeats or slashes'],[/custom-key|key-(?:step|alter|octave)/,'a custom key signature'],
 [/grace/,'grace notes'],[/symbol/,'musical symbols'],[/lyric/,'lyrics'],
];
const notationName=(detail:string)=>notationWords.find(([pattern])=>pattern.test(detail))?.[1];
/** The converter's located findings are written for developers. Players see
 * what happened to their file and, where there is one, what they can do. */
export function museScoreRefusalMessage(code:string):string {
 if(code==='runtime-codec')return 'This copy of the viewer can\'t unpack compressed MuseScore (.mscz) files. Save the score uncompressed (.mscx) in MuseScore, then import that file.';
 if(code==='input-size')return 'This MuseScore file is larger than the 32 MB the viewer can read.';
 if(/budget$|limit$/.test(code))return 'This MuseScore score is too large or detailed to convert.';
 if(code==='native-version')return 'This MuseScore file was saved by a version of MuseScore the viewer can\'t read yet.';
 if(/^(?:zip-|xml$|xml-encoding$|native-(?:zip|container|root|style-root)$)/.test(code))
  return 'This file isn\'t a readable MuseScore score. It may be damaged; open it in MuseScore, save it again and import it once more.';
 if(/^native-(?:part|staff|measure|segment|duration)$/.test(code))
  return 'The parts or staves of this MuseScore score can\'t be read. Open it in MuseScore, save it again and import it once more.';
 if(code.startsWith('worker-'))return 'The MuseScore converter stopped unexpectedly. Please try again.';
 const name=notationName(code);
 return name?`This MuseScore score uses ${name}, which the viewer can't convert yet.`:'This MuseScore score uses notation the viewer can\'t convert yet.';
}
function refusal(report:MuseScoreReport){
 const blocking=report.findings.find(f=>f.disposition==='blocking'),code=blocking?.code??'conversion-refused';
 return new MuseScoreImportRefusal(museScoreRefusalMessage(code),code);
}
/** MusicXML intake wording, retold for the file the player actually chose. */
function retold(error:MusicXmlImportRefusal){
 const reader=/^This MusicXML file can't be read yet: (.*)$/s.exec(error.message)?.[1];
 if(reader!==undefined){
  const name=notationName(reader);
  return new MuseScoreImportRefusal(name?`This MuseScore score can't be opened yet: it uses ${name}, which the viewer doesn't read yet.`
   :'This MuseScore score can\'t be opened yet: it uses notation the viewer doesn\'t read yet.','musicxml-intake',{cause:error});
 }
 return new MuseScoreImportRefusal(error.message.replace(/^This (?:compressed )?MusicXML file/,'This MuseScore score').replace(/MusicXML import (currently )?reads/g,'The viewer $1reads'),'musicxml-intake',{cause:error});
}

/** The main MuseScore score, converted by the public converter in its own
 * cancellable Worker. Nothing is inferred here: the result is MusicXML text. */
export async function convertMuseScoreToMusicXml(bytes:Uint8Array,signal?:AbortSignal):Promise<string>{
 signal?.throwIfAborted();
 let api;
 try{api=await museScoreRuntime();}
 catch{throw new MuseScoreImportRefusal('MuseScore conversion isn\'t available in this copy of the viewer.','runtime-unavailable');}
 signal?.throwIfAborted();
 let result;
 try{result=await api.convertMuseScore(bytes,{signal});}
 catch(error){
  if(signal?.aborted)throw signal.reason;
  if(error instanceof RangeError)throw new MuseScoreImportRefusal(museScoreRefusalMessage('input-size'),'input-size');
  throw new MuseScoreImportRefusal('MuseScore conversion can\'t run in this copy of the viewer.','runtime-unavailable');
 }
 signal?.throwIfAborted();
 if(!result.ok)throw refusal(result.report);
 return result.musicxml;
}

/** MuseScore → MusicXML → the unchanged MusicXML intake: one printed piano
 * part on two staves, hands from those staves, no inference. */
export async function prepareMuseScore(bytes:Uint8Array,assets:MusicXmlAssets,inputExecution:ReadingExecution={}):ReturnType<typeof prepareMusicXmlScore>{
 const execution=capturedReadingExecution(inputExecution);checkReadingExecution(execution);
 const musicxml=await convertMuseScoreToMusicXml(bytes,execution.signal);checkReadingExecution(execution);
 try{return await prepareMusicXmlScore(new TextEncoder().encode(musicxml),assets,execution);}
 catch(error){if(error instanceof MusicXmlImportRefusal)throw retold(error);throw error;}
}
