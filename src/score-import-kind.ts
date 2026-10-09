import {unzipSync} from 'fflate';
/** Routing only. Both branches still use their complete ordinary admission. */
export function scoreImportKind(bytes:Uint8Array):'score'|'guitar-pro' {
 if(bytes.byteLength>50_000_000)throw Error('Score exceeds the supported 50 MB input bound.');
 if(bytes[0]===80&&bytes[1]===75){let count=0,manifest=false;
  unzipSync(bytes,{filter:entry=>{if(++count>10000)throw Error('Excessive archive members');if(entry.name!=='manifest.json')return false;
   if(entry.originalSize>1_000_000)throw Error('Oversized score manifest');manifest=true;return false;}});
  return manifest?'score':'guitar-pro';
 }
 return 'guitar-pro';
}
