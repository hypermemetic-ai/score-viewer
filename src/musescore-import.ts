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
 constructor(message:string,readonly code?:string){super(message);this.name='MuseScoreImportRefusal';}
}
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
 const feature=code.replace(/^(?:native|writer)-/,'').replaceAll('-',' ');
 return `This MuseScore score uses notation the viewer can't convert yet (${feature}).`;
}
function refusal(report:MuseScoreReport){
 const blocking=report.findings.find(f=>f.disposition==='blocking'),code=blocking?.code??'conversion-refused';
 return new MuseScoreImportRefusal(museScoreRefusalMessage(code),code);
}
/** MusicXML intake wording, retold for the file the player actually chose. */
function retold(error:MusicXmlImportRefusal){
 const unsupported=/^This MusicXML file can't be read yet: .*?unsupported <([A-Za-z0-9-]+)>/.exec(error.message)?.[1];
 if(unsupported)return new MuseScoreImportRefusal(`This MuseScore score can't be opened yet: the viewer's notation reader doesn't understand part of it yet (MusicXML <${unsupported}>).`,'musicxml-intake');
 return new MuseScoreImportRefusal(error.message.replace(/^This (?:compressed )?MusicXML file/,'This MuseScore score').replace(/^MusicXML import currently reads/,'The viewer currently reads')
  .replace(/\. MusicXML import currently reads/,'. The viewer currently reads'),'musicxml-intake');
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
export async function prepareMuseScore(bytes:Uint8Array,assets:MusicXmlAssets,inputExecution:ReadingExecution={}):Promise<{bytes:Uint8Array;filename:string}>{
 const execution=capturedReadingExecution(inputExecution);checkReadingExecution(execution);
 const musicxml=await convertMuseScoreToMusicXml(bytes,execution.signal);checkReadingExecution(execution);
 try{return await prepareMusicXmlScore(new TextEncoder().encode(musicxml),assets,execution);}
 catch(error){if(error instanceof MusicXmlImportRefusal)throw retold(error);throw error;}
}
