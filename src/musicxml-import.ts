import {unzipSync} from 'fflate';
import {parseMusicXmlAsync,projectMusicXml} from '../vendor/iso-notation/src/musicxml';
import {hashBytes} from './package';
import {publishNativePianoScore,type NativePianoAssets} from './native-piano-preparation';
import {capturedReadingExecution,checkReadingExecution,type ReadingExecution} from './reading-execution';

const MAX_XML_BYTES=10_000_000;
export class MusicXmlImportRefusal extends Error {}
export type MusicXmlAssets=NativePianoAssets;

/** Plain MusicXML in UTF-8/UTF-16, or the root file of a compressed .mxl. */
export function musicXmlText(bytes:Uint8Array):string {
 if(bytes[0]===80&&bytes[1]===75){
  let total=0;const files=unzipSync(bytes,{filter:f=>{total+=f.originalSize;if(f.originalSize>MAX_XML_BYTES||total>4*MAX_XML_BYTES)throw new MusicXmlImportRefusal('This compressed MusicXML file is too large.');return true;}}),
   container=files['META-INF/container.xml'],root=container&&/<rootfile\b[^>]*\bfull-path\s*=\s*"([^"]+)"/.exec(decodeXml(container))?.[1];
  if(!root||!files[root])throw new MusicXmlImportRefusal('This compressed MusicXML file has no readable score.');
  return decodeXml(files[root]);
 }
 if(bytes.byteLength>MAX_XML_BYTES)throw new MusicXmlImportRefusal('This MusicXML file is larger than 10 MB.');
 return decodeXml(bytes);
}
/** BOM first, then the XML declaration's encoding, otherwise UTF-8. */
function decodeXml(bytes:Uint8Array){
 const bom=bytes[0]===0xff&&bytes[1]===0xfe?'utf-16le':bytes[0]===0xfe&&bytes[1]===0xff?'utf-16be':undefined,
  declared=bom?undefined:/^(?:\uFEFF)?<\?xml[^>]*\bencoding\s*=\s*["']([A-Za-z0-9._-]+)["']/.exec(new TextDecoder('latin1').decode(bytes.subarray(0,200)))?.[1];
 let decoder;
 try{decoder=new TextDecoder(bom??declared??'utf-8',{fatal:true});}
 catch{throw new MusicXmlImportRefusal(`This MusicXML file uses an unsupported text encoding (${declared}).`);}
 try{return decoder.decode(bytes).replace(/^\uFEFF/,'');}
 catch{throw new MusicXmlImportRefusal(`This MusicXML file isn't valid ${decoder.encoding.toUpperCase()} text.`);}
}

/** One printed piano part becomes a native .tuna archive. Hands come from the
 * source: the upper staff is the right hand, the lower staff the left, and an
 * explicit source hand mark (m.s., m.d., l.h., r.h.) overrides its staff.
 * A note on a single staff or an unmarked middle staff stays hand-less.
 * Nothing is inferred; the player chooses hands in the handedness editor.
 * Pages use the approved production engraving, and the package passes
 * ordinary admission. */
export async function prepareMusicXmlScore(bytes:Uint8Array,assets:MusicXmlAssets,inputExecution:ReadingExecution={}):ReturnType<typeof publishNativePianoScore> {
 const execution=capturedReadingExecution(inputExecution),inputSha256=await hashBytes(bytes);checkReadingExecution(execution);
 let written;
 try{written=await parseMusicXmlAsync(musicXmlText(bytes),'import.musicxml');}
 catch(error){if(error instanceof MusicXmlImportRefusal)throw error;throw new MusicXmlImportRefusal(`This MusicXML file can't be read yet: ${(error as Error).message}`);}
 checkReadingExecution(execution);
 const parts=written.parts?.length??new Set(written.measures.map(m=>m.part)).size;
 if(parts===0||!written.measures.length)throw new MusicXmlImportRefusal('This MusicXML file contains no music.');
 if(parts!==1)throw new MusicXmlImportRefusal(`This file contains ${parts} instruments. The score viewer opens one instrument at a time; export just the piano part.`);
 let score;
 try{score=projectMusicXml(written,{id:`musicxml-${inputSha256}`,pianoHands:'source-v1'}).score;}
 catch(error){
  const program=/^Piano import needs a piano instrument; part .* declares MIDI program (-?\d+)\.$/.exec((error as Error).message)?.[1];
  if(program)throw new MusicXmlImportRefusal(`This part is written for an instrument other than piano (General MIDI program ${program}). MusicXML import reads piano scores only.`);
  throw new MusicXmlImportRefusal(`This MusicXML file can't be read yet: ${(error as Error).message}`);
 }
 score.title||='Untitled score';score.composer??='';
 return publishNativePianoScore(score,{metadata:{title:score.title,composer:score.composer,provenance:[`MusicXML import ${inputSha256}; hands from printed staves and source hand marks.`]},
  assets,execution,refusal:MusicXmlImportRefusal});
}
