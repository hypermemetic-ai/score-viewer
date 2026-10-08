import type {ScorePackage} from './package';
import {publishPackage} from './publication';
export type ScoreSaveResult={status:'saved'|'downloaded'|'cancelled'};
export type SharedScoreSaveResult=ScoreSaveResult&{filename:string;bytes:number};
export interface ScoreSaveHost {saveScore(bytes:Uint8Array,filename:string):Promise<ScoreSaveResult>;}
export async function shareInstalledScore(p:ScorePackage,host:ScoreSaveHost):Promise<SharedScoreSaveResult> {
  const publication=await publishPackage(p);
  return {...await host.saveScore(publication.bytes,publication.filename),filename:publication.filename,bytes:publication.bytes.length};
}
export function scoreSaveMessage(result:ScoreSaveResult&Partial<SharedScoreSaveResult>):string {
  if(result.status==='cancelled')return 'Score save cancelled.';
  const detail=result.filename&&result.bytes!==undefined?` ${result.filename} (${Math.ceil(result.bytes/1024)} KiB)` :'';
  return (result.status==='saved'?'Score saved':'Score download started')+(detail?':'+detail:'.');
}
