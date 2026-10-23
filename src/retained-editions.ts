import {hashBytes,importPackageForReading,requireCurrentEngraving,selectPresentation,type ScorePackage} from './package';
import {collectionId,type Entry,type PersonalState} from './state';
import {isScoreFileName,scoreFileSha256} from './score-file-name';
import {loadPersonalJournal} from './personal-journal';
import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';

/** The bytes of one declared historical edition, checked against its saved identity. */
export async function readRetainedEdition(host:{read(name:string):Promise<Uint8Array|null>},entry:Entry,file:string):Promise<Uint8Array>{
  if(!entry.retainedPackages?.includes(file)||!isScoreFileName(file))
    throw Error('That edition is not a declared retained package. The current score is retained.');
  const bytes=await host.read(file);
  if(!bytes||await hashBytes(bytes)!==scoreFileSha256(file))
    throw Error('The retained package is missing or differs from its saved identity. The current score is retained.');
  return bytes;
}

/** Read and check one declared historical edition; never recalculates or writes.
 * Pages an earlier engine drew are refused (SavedPagesBehindPolicy) so the
 * caller engraves the edition again, unless `currentEngraving` is false: the
 * saved pages, kept when engraving again fails. */
export async function prepareRetainedEdition(host:{read(name:string):Promise<Uint8Array|null>},entry:Entry,file:string,layout:PhysicalKeyboardId,currentEngraving=true):Promise<{
  packageBytes:Uint8Array;package:ScorePackage;personal:PersonalState;personalFiles:Record<string,string>;
}>{
  const bytes=await readRetainedEdition(host,entry,file),admitted=await importPackageForReading(bytes),original=currentEngraving?requireCurrentEngraving(admitted):admitted;
  if(collectionId(original)!==entry.id)throw Error('The retained edition belongs to another source.');
  const p=await selectPresentation(original,layout),personalFiles={...(entry.editionPersonalFiles?.[file]??{})},
    personal=await loadPersonalJournal(host,entry,p,{personalFiles,retained:true});
  return{packageBytes:bytes,package:p,personal,personalFiles};
}
