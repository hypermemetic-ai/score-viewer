import {hashBytes,type ScorePackage} from './package';
import {personalStorageName,readPersonal,initialPersonal,installLayer,type Entry,type PersonalState} from './state';
export class PersonalEditionConflict extends Error {
  readonly code='personal-edition';
  constructor(message:string){super(message+' The prior edition and complete personal journal are retained.');}
}
/** The caller retains the old edition/sidecar. Only active compatible choices
 * can cross this boundary; an earlier layer never sits on new-hand pages. */
export function personalForCalculatedEdition(s:PersonalState,from:ScorePackage,to:ScorePackage):PersonalState {
  const prior=readPersonal(s,from);
  if(!from.sourceSha256||from.sourceSha256!==to.sourceSha256||from.keyboardLayout!==to.keyboardLayout)
    throw new PersonalEditionConflict('Personal choices belong to another musical source or keyboard.');
  if(!to.fingerLayer)throw new PersonalEditionConflict('The new edition has no complete calculated layer.');
  const corrections=Object.values(prior.overrides);
  if(corrections.length&&(from.profileId!==to.profileId||from.profileSha256!==to.profileSha256))
    throw new PersonalEditionConflict('Active choices need review for the changed physical profile.');
  for(const c of corrections)for(const id of c.ownerIds){
    const before=from.score.notes.find(n=>n.id===id),after=to.score.notes.find(n=>n.id===id),
      assignment=to.fingerLayer.attacks.find(a=>a.id===to.fingerLayer!.sourceOwnerToAttack[id]);
    if(!before||!after||before.startTick!==after.startTick||before.durationTicks!==after.durationTicks||
      before.pitch.octave!==after.pitch.octave||before.pitch.pitchClass!==after.pitch.pitchClass||
      !assignment||assignment.id!==c.actionId||assignment.hand!==c.hand||assignment.finger!==c.replacement||
      c.proposedRow!==undefined&&assignment.row!==c.proposedRow||
      c.proposedContact!==undefined&&JSON.stringify(assignment.contact)!==JSON.stringify(c.proposedContact))
      throw new PersonalEditionConflict('An active owner choice has incompatible hand, contact or release coverage.');
  }
  try{
    if(from.manifest.revision===to.manifest.revision&&from.profileId===to.profileId&&from.profileSha256===to.profileSha256&&from.effectiveHandSha256===to.effectiveHandSha256){
      const compatible=installLayer(prior,from,to.fingerLayer);
      compatible.binding=initialPersonal(to).binding;
      return readPersonal(compatible,to);
    }
    const fresh=initialPersonal(to);
    return readPersonal({...fresh,view:structuredClone(prior.view),overrides:structuredClone(prior.overrides),
      ...(prior.editContactId?{editContactId:prior.editContactId}:{})},to);
  }catch(error){throw new PersonalEditionConflict((error as Error).message);}
}
/** Rebind only a validated companion with exactly the same source, layout,
 * profile and owner hand map. readPersonal rechecks every owner/contact. */
export function rebindPersonalPresentation(s:PersonalState,from:ScorePackage,to:ScorePackage):PersonalState {
  if(!from.sourceSha256||from.sourceSha256!==to.sourceSha256||
    personalStorageName('',from)!==personalStorageName('',to))throw Error('Personal choices belong to a different source or keyboard presentation.');
  const prior=readPersonal(s,from);
  return readPersonal({...prior,revision:to.manifest.revision},to);
}
/** Stage new package/state versions; only the final library pointer activates
 * them. A failed stage leaves every currently referenced sidecar untouched. */
export async function stagePresentationInstall(host:{write(name:string,data:Uint8Array):Promise<void>},request:{
  packageBytes:Uint8Array;personalBytes:Uint8Array;personalKey:string;entry:Entry;entries:Entry[];canCommit?:()=>boolean;newEntry?:boolean;
  /** Explicit retained-edition seed; ordinary installation uses current maps. */
  personalFiles?:Record<string,string>;
}):Promise<{entry:Entry;entries:Entry[]}> {
  const file=`package-${await hashBytes(request.packageBytes)}.isoscore`,personalFile=`state-version-${await hashBytes(new TextEncoder().encode(crypto.randomUUID()+await hashBytes(request.personalBytes)))}.json`;
  const existing=request.entries.find(prior=>prior.id===request.entry.id),found=!!existing;
  if(request.newEntry&&found)throw Error('The imported score already exists; its managed state is retained.');
  if(existing&&existing.file!==request.entry.file)throw Error('The library edition changed; existing files retained.');
  if(request.canCommit&&!request.canCommit())throw Error('Calculation is no longer active; existing score retained.');
  const entry={...request.entry,file,personalFiles:{...(request.personalFiles??request.entry.personalFiles),[request.personalKey]:personalFile},
    editionPersonalFiles:{...request.entry.editionPersonalFiles,...(found?{[request.entry.file]:{...request.entry.personalFiles}}:{})},
    retainedPackages:[...new Set([...(request.entry.retainedPackages??[]),...(found?[request.entry.file]:[])])]};
  const entries=found?request.entries.map(prior=>prior.id===entry.id?entry:prior):[...request.entries,entry];
  if(!found&&!request.newEntry)throw Error('The score is no longer in the library; existing files retained.');
  await host.write(file,request.packageBytes);
  await host.write(personalFile,request.personalBytes);
  if(request.canCommit&&!request.canCommit())throw Error('Calculation is no longer active; existing score retained.');
  await host.write('library.json',new TextEncoder().encode(JSON.stringify({version:1,entries})));
  return {entry,entries};
}
