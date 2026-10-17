import {hashBytes,importPackageForReading,selectPresentation,type ScorePackage} from './package';
import {CALCULATED_HAND_SCORE_RENDERING_ENGINE} from '../vendor/iso-notation/src/score-presentation';
import {getScoreTransposition} from './score-transposition';
import {collectionId,type Entry,type PersonalState} from './state';
import {loadPersonalJournal} from './personal-journal';
import {UNDRAWABLE_CALCULATED_EDITION,undrawableCalculatedEdition} from './undrawable-edition';
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
  const original=await importPackageForReading(bytes).catch(error=>{throw undrawableCalculatedEdition(error)?Error(UNDRAWABLE_CALCULATED_EDITION):error;});
  if(collectionId(original)!==entry.id)throw Error('The retained edition belongs to another source.');
  const p=await selectPresentation(original,layout),personalFiles={...(entry.editionPersonalFiles?.[file]??{})},
    personal=await loadPersonalJournal(host,entry,p,{personalFiles,retained:true});
  return{packageBytes:bytes,package:p,personal,personalFiles};
}

type RetainedEdition=Awaited<ReturnType<typeof prepareRetainedEdition>>;
/** The newest declared earlier edition that draws the score's own hands at the
 * entry's pitch and passes the caller's `opens` check. Reads only; undefined
 * when none qualifies. */
export async function drawableEarlierEdition(host:{read(name:string):Promise<Uint8Array|null>},entry:Entry,layouts:readonly PhysicalKeyboardId[],opens:(edition:RetainedEdition)=>Promise<boolean>=async()=>true){
  const steps=entry.transposition?.steps??0;
  for(const file of [...new Set(entry.retainedPackages??[])].filter(file=>file!==entry.file).reverse())for(const layout of new Set(layouts)){
    let edition:RetainedEdition;
    // An undrawable edition is refused for every keyboard.
    try{edition=await prepareRetainedEdition(host,entry,file,layout);}catch(error){if((error as Error).message===UNDRAWABLE_CALCULATED_EDITION)break;continue;}
    if(calculatedEdition(edition.package)||getScoreTransposition(edition.package)!==steps||!await opens(edition))break;
    return edition;
  }
}

/** Any keyboard view of the edition carries calculated hands. */
function calculatedEdition(p:ScorePackage):boolean {
  const m=p.collectionManifest??p.manifest,calculated=(d:{engineVersion?:string;calculatedHandReceipt?:string})=>d.engineVersion===CALCULATED_HAND_SCORE_RENDERING_ENGINE||d.calculatedHandReceipt!==undefined;
  return calculated(m)||Object.values(m.presentations??{}).some(calculated)||!!p.score.performingHandPresentation||p.score.notes.some(n=>n.derivedHand);
}
