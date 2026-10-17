import {hashBytes} from './package';
import {validEntryStorage,type Entry} from './state';
import {nextTranspositionSelection} from './score-transposition-selection';
import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';
/** Stage new package/state versions; only the final library pointer activates
 * them. A failed stage leaves every currently referenced sidecar untouched. */
export async function stagePresentationInstall(host:{write(name:string,data:Uint8Array):Promise<void>;read?(name:string):Promise<Uint8Array|null>},request:{
  packageBytes:Uint8Array;personalBytes:Uint8Array;personalKey:string;entry:Entry;entries:Entry[];canCommit?:()=>boolean;newEntry?:boolean;
  /** The pointer write is atomic but asynchronous; lock dismissal before it. */
  onCommitStarted?:()=>void;
  /** Guarded sidecar preparation/admission before activating the library. */
  beforeCommit?:()=>Promise<void>;
  /** Explicit retained-edition seed; ordinary installation uses current maps. */
  personalFiles?:Record<string,string>;
  /** Journals for the new edition's other keyboards (a re-engraved edition). */
  additionalPersonal?:ReadonlyArray<{key:string;bytes:Uint8Array}>;
  /** Earlier archives this edition stands for: each stays retained with its
   * journals, and every pitch selection naming it names the new edition. */
  replaced?:Readonly<Record<string,string>>;
  /** Offset comes from an independently admitted package, never a field draft. */
  transposition?:{steps:number;layout:PhysicalKeyboardId;
    /** Every keyboard view the new edition serves; defaults to layout. */
    layouts?:readonly PhysicalKeyboardId[];originalPackageBytes?:Uint8Array;originalLayouts?:readonly PhysicalKeyboardId[];originalPersonalFiles?:Record<string,string>};
}):Promise<{entry:Entry;entries:Entry[]}> {
  const file=`package-${await hashBytes(request.packageBytes)}.isoscore`,versionFile=async(bytes:Uint8Array)=>`state-version-${await hashBytes(new TextEncoder().encode(crypto.randomUUID()+await hashBytes(bytes)))}.json`,
    personalFile=await versionFile(request.personalBytes),
    additional=await Promise.all((request.additionalPersonal??[]).filter(p=>p.key!==request.personalKey).map(async p=>({...p,file:await versionFile(p.bytes)})));
  const existing=request.entries.find(prior=>prior.id===request.entry.id),found=!!existing;
  if(request.newEntry&&found)throw Error('The imported score already exists; its managed state is retained.');
  if(existing&&existing.file!==request.entry.file)throw Error('The library edition changed; existing files retained.');
  if(request.canCommit&&!request.canCommit())throw Error('Saving was cancelled; existing score retained.');
  const originalFile=request.transposition?.originalPackageBytes?`package-${await hashBytes(request.transposition.originalPackageBytes)}.isoscore`:undefined,
    transposition=nextTranspositionSelection(request.entry,file,request.transposition?{steps:request.transposition.steps,layout:request.transposition.layout,layouts:request.transposition.layouts,originalFile,originalLayouts:request.transposition.originalLayouts,replaced:request.replaced}:undefined);
  if(request.newEntry&&request.transposition?.steps&&!originalFile)throw Error('A transposed import requires its exact original edition; previous library retained.');
  const entry={...request.entry,file,...(transposition?{transposition}:{}),personalFiles:{...(request.personalFiles??request.entry.personalFiles),...Object.fromEntries(additional.map(p=>[p.key,p.file])),[request.personalKey]:personalFile},
    editionPersonalFiles:{...request.entry.editionPersonalFiles,...(found?{[request.entry.file]:{...request.entry.personalFiles}}:{}),...(originalFile&&originalFile!==request.entry.file&&request.transposition?.originalPersonalFiles?{[originalFile]:{...request.transposition.originalPersonalFiles}}:{})},
    retainedPackages:[...new Set([...(request.entry.retainedPackages??[]),...(found?[request.entry.file]:[]),...(originalFile?[originalFile]:[])])]};
  const entries=found?request.entries.map(prior=>prior.id===entry.id?entry:prior):[...request.entries,entry];
  if(!found&&!request.newEntry)throw Error('The score is no longer in the library; existing files retained.');
  if(!validEntryStorage(entry))throw Error('The new edition selection is invalid; the active library and journals are retained.');
  if(originalFile){const retained=await host.read?.(originalFile);if(retained&&await hashBytes(retained)!==await hashBytes(request.transposition!.originalPackageBytes!))throw Error('The retained original archive differs; its bytes and active selection are preserved.');if(!retained)await host.write(originalFile,request.transposition!.originalPackageBytes!);}
  await host.write(file,request.packageBytes);
  await host.write(personalFile,request.personalBytes);
  for(const p of additional)await host.write(p.file,p.bytes);
  if(request.canCommit&&!request.canCommit())throw Error('Saving was cancelled; existing score retained.');
  await request.beforeCommit?.();
  if(request.canCommit&&!request.canCommit())throw Error('Saving was cancelled; existing score retained.');
  request.onCommitStarted?.();
  await host.write('library.json',new TextEncoder().encode(JSON.stringify({version:1,entries})));
  return {entry,entries};
}
