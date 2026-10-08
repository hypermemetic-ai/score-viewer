import {hashBytes,importPackageForReading,selectPresentation,type ScorePackage} from './package';
import {collectionId,type Entry,type PersonalState} from './state';
import {loadPersonalJournal} from './personal-journal';
import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';

/** Read and check one declared historical edition; never recalculates or writes. */
export async function prepareRetainedEdition(host:{read(name:string):Promise<Uint8Array|null>},entry:Entry,file:string,layout:PhysicalKeyboardId):Promise<{
  packageBytes:Uint8Array;package:ScorePackage;personal:PersonalState;personalFiles:Record<string,string>;
}>{
  if(!entry.retainedPackages?.includes(file)||!/^package-[a-f0-9]{64}\.isoscore$/.test(file))
    throw Error('That edition is not a declared retained package. The current score is retained.');
  const bytes=await host.read(file);
  if(!bytes||`package-${await hashBytes(bytes)}.isoscore`!==file)
    throw Error('The retained package is missing or differs from its saved identity. The current score is retained.');
  const original=await importPackageForReading(bytes);
  if(collectionId(original)!==entry.id)throw Error('The retained edition belongs to another source.');
  const p=await selectPresentation(original,layout),personalFiles={...(entry.editionPersonalFiles?.[file]??{})},
    personal=await loadPersonalJournal(host,entry,p,{personalFiles,retained:true});
  return{packageBytes:bytes,package:p,personal,personalFiles};
}
