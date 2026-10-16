import {unzipSync} from 'fflate';
/** MusicXML intake stays off for players until ISO notation reads typical
 * MuseScore exports; the development server enables it for review. */
export const MUSICXML_IMPORT_ENABLED=import.meta.env?.DEV===true;
export type ScoreImportKind='score'|'guitar-pro'|'musicxml'|'musescore';
/** Picker extensions. MusicXML and MuseScore (converted to MusicXML) share one
 * gate, folded away in production; the native `pick_score` filter mirrors it. */
export const SCORE_PICKER_EXTENSIONS:readonly string[]=Object.freeze(['tuna','gp','gpx','gp3','gp4','gp5',
 ...(MUSICXML_IMPORT_ENABLED?['musicxml','xml','mxl','mscz','mscx']:[])]);
/** Routing by content, never by filename. Every branch still runs its complete
 * ordinary admission; a label here grants no score or source authority. */
export function scoreImportKind(bytes:Uint8Array):ScoreImportKind {
 if(bytes.byteLength>50_000_000)throw Error('Score exceeds the supported 50 MB input bound.');
 if(bytes[0]===80&&bytes[1]===75){let count=0,manifest=false,container=false,musescore=false;
  unzipSync(bytes,{filter:entry=>{if(++count>10000)throw Error('Excessive archive members');
   if(entry.name==='manifest.json'){if(entry.originalSize>1_000_000)throw Error('Oversized score manifest');manifest=true;}
   else if(entry.name==='META-INF/container.xml')container=true;
   else if(/\.mscx$/i.test(entry.name))musescore=true;
   return false;}});
  // MuseScore .mscz and compressed MusicXML .mxl share the container layout.
  return manifest?'score':musescore?'musescore':container?'musicxml':'guitar-pro';
 }
 const head=xmlHead(bytes);
 if(head!==undefined){if(/<score-(partwise|timewise)[\s>]/.test(head))return 'musicxml';if(/<museScore[\s>]/.test(head))return 'musescore';}
 return 'guitar-pro';
}
/** The leading text of an XML document in UTF-8 or UTF-16, otherwise undefined.
 * Generous enough to pass a DOCTYPE and long leading comments. */
function xmlHead(bytes:Uint8Array):string|undefined {
 const sample=bytes.subarray(0,65536),encoding=sample[0]===0xff&&sample[1]===0xfe?'utf-16le':sample[0]===0xfe&&sample[1]===0xff?'utf-16be':'utf-8',
  text=new TextDecoder(encoding).decode(sample).replace(/^\uFEFF/,'').trimStart();
 return text.startsWith('<')?text:undefined;
}
