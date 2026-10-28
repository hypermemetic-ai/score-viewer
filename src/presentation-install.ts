import {hashBytes} from './package';
import {validEntryStorage,type Entry} from './state';
import {scoreFileName} from './score-file-name';
import {nextTranspositionSelection} from './score-transposition-selection';
import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';
import {validEngravedAgain,type EngravedAgainEntry} from './engraved-again-entry';
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
  /** The archive a new entry's edition was engraved again from (an imported
   * score that gained a keyboard layout): it is kept as an Earlier edition. */
  earlier?:Uint8Array;
  /** Offset comes from an independently admitted package, never a field draft. */
  transposition?:{steps:number;layout:PhysicalKeyboardId;
    /** Every keyboard view the new edition serves; defaults to layout. */
    layouts?:readonly PhysicalKeyboardId[];originalPackageBytes?:Uint8Array;originalLayouts?:readonly PhysicalKeyboardId[];originalPersonalFiles?:Record<string,string>;
    /** New journals for the original's keyboards (an original engraved again). */
    originalPersonal?:ReadonlyArray<{key:string;bytes:Uint8Array}>};
  /** The new edition was engraved again from an earlier one without the
   * score showing it (engraved-again-entry.ts); its `edition` is the new
   * archive. Any other new edition drops the entry's record. A function is
   * asked once practice is carried (beforeCommit), so the record can say
   * what couldn't move. */
  engravedAgain?:Omit<EngravedAgainEntry,'edition'>|(()=>Omit<EngravedAgainEntry,'edition'>|undefined);
}):Promise<{entry:Entry;entries:Entry[]}> {
  const file=scoreFileName(await hashBytes(request.packageBytes)),versionFile=async(bytes:Uint8Array)=>`state-version-${await hashBytes(new TextEncoder().encode(crypto.randomUUID()+await hashBytes(bytes)))}.json`,
    personalFile=await versionFile(request.personalBytes),
    additional=await Promise.all((request.additionalPersonal??[]).filter(p=>p.key!==request.personalKey).map(async p=>({...p,file:await versionFile(p.bytes)}))),
    originalJournals=await Promise.all((request.transposition?.originalPersonal??[]).map(async p=>({...p,file:await versionFile(p.bytes)})));
  const existing=request.entries.find(prior=>prior.id===request.entry.id),found=!!existing;
  if(request.newEntry&&found)throw Error('The imported score already exists; its managed state is retained.');
  if(existing&&existing.file!==request.entry.file)throw Error('The library edition changed; existing files retained.');
  if(request.canCommit&&!request.canCommit())throw Error('Saving was cancelled; existing score retained.');
  const originalFile=request.transposition?.originalPackageBytes?scoreFileName(await hashBytes(request.transposition.originalPackageBytes)):undefined,
    transposition=nextTranspositionSelection(request.entry,file,request.transposition?{steps:request.transposition.steps,layout:request.transposition.layout,layouts:request.transposition.layouts,originalFile,originalLayouts:request.transposition.originalLayouts,replaced:request.replaced}:undefined);
  const earlierFile=request.earlier?scoreFileName(await hashBytes(request.earlier)):undefined;
  if(earlierFile&&(!request.newEntry||earlierFile===file))throw Error('Only a new score keeps its imported file beside the edition engraved from it.');
  if(request.newEntry&&request.transposition?.steps&&!originalFile)throw Error('A transposed import requires its exact original edition; previous library retained.');
  const {engravedAgain:priorRecord,...kept}=request.entry,record=file===request.entry.file&&!request.engravedAgain?priorRecord:undefined;
  const entry:Entry={...kept,file,...(record?{engravedAgain:record}:{}),...(transposition?{transposition}:{}),personalFiles:{...(request.personalFiles??request.entry.personalFiles),...Object.fromEntries(additional.map(p=>[p.key,p.file])),[request.personalKey]:personalFile},
    editionPersonalFiles:{...request.entry.editionPersonalFiles,...(found?{[request.entry.file]:{...request.entry.personalFiles}}:{}),...(earlierFile?{[earlierFile]:{}}:{}),...(originalFile&&originalFile!==request.entry.file&&(request.transposition?.originalPersonalFiles||originalJournals.length)?{[originalFile]:{...request.transposition!.originalPersonalFiles,...Object.fromEntries(originalJournals.map(p=>[p.key,p.file]))}}:{})},
    retainedPackages:[...new Set([...(request.entry.retainedPackages??[]),...(found?[request.entry.file]:[]),...(earlierFile?[earlierFile]:[]),...(originalFile?[originalFile]:[])])]};
  const entries=found?request.entries.map(prior=>prior.id===entry.id?entry:prior):[...request.entries,entry];
  if(!found&&!request.newEntry)throw Error('The score is no longer in the library; existing files retained.');
  if(!validEntryStorage(entry))throw Error('The new edition selection is invalid; the active library and journals are retained.');
  const engravedAgain=()=>{
    const said=typeof request.engravedAgain==='function'?request.engravedAgain():request.engravedAgain;if(!said)return;
    const record={...said,edition:file};if(!validEngravedAgain(record,entry))throw Error('The new edition selection is invalid; the active library and journals are retained.');
    entry.engravedAgain=record;
  };
  if(typeof request.engravedAgain!=='function')engravedAgain();
  if(originalFile){const retained=await host.read?.(originalFile);if(retained&&await hashBytes(retained)!==await hashBytes(request.transposition!.originalPackageBytes!))throw Error('The retained original archive differs; its bytes and active selection are preserved.');if(!retained)await host.write(originalFile,request.transposition!.originalPackageBytes!);}
  if(earlierFile){const kept=await host.read?.(earlierFile);if(kept&&await hashBytes(kept)!==await hashBytes(request.earlier!))throw Error('The earlier score file differs; its bytes are preserved.');if(!kept)await host.write(earlierFile,request.earlier!);}
  await host.write(file,request.packageBytes);
  await host.write(personalFile,request.personalBytes);
  for(const p of [...additional,...originalJournals])await host.write(p.file,p.bytes);
  if(request.canCommit&&!request.canCommit())throw Error('Saving was cancelled; existing score retained.');
  await request.beforeCommit?.();
  if(typeof request.engravedAgain==='function')engravedAgain();
  if(request.canCommit&&!request.canCommit())throw Error('Saving was cancelled; existing score retained.');
  request.onCommitStarted?.();
  await host.write('library.json',new TextEncoder().encode(JSON.stringify({version:1,entries})));
  return {entry,entries};
}
