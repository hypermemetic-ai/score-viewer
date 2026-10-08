import {hashBytes,type ScorePackage} from './package';
import {personalStorageName,readPersonal,type Entry,type PersonalState} from './state';
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
}):Promise<{entry:Entry;entries:Entry[]}> {
  const file=`package-${await hashBytes(request.packageBytes)}.isoscore`,personalFile=`state-version-${await hashBytes(new TextEncoder().encode(crypto.randomUUID()+await hashBytes(request.personalBytes)))}.json`;
  const found=request.entries.some(prior=>prior.id===request.entry.id);
  if(request.newEntry&&found)throw Error('The imported score already exists; its managed state is retained.');
  const entry={...request.entry,file,personalFiles:{...request.entry.personalFiles,[request.personalKey]:personalFile},
    retainedPackages:[...new Set([...(request.entry.retainedPackages??[]),...(found?[request.entry.file]:[])])]};
  const entries=found?request.entries.map(prior=>prior.id===entry.id?entry:prior):[...request.entries,entry];
  if(!found&&!request.newEntry)throw Error('The score is no longer in the library; existing files retained.');
  await host.write(file,request.packageBytes);
  await host.write(personalFile,request.personalBytes);
  if(request.canCommit&&!request.canCommit())throw Error('Calculation is no longer active; existing score retained.');
  await host.write('library.json',new TextEncoder().encode(JSON.stringify({version:1,entries})));
  return {entry,entries};
}
