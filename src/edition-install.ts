import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';
import {selectPresentation,type ScorePackage} from './package';
import {getOriginalScorePackageBytes,getScoreTransposition} from './score-transposition';
import {retainedTranspositionFile} from './score-transposition-selection';
import {collectionId,personalStorageName,practiceStorageName,readPersonal,type Entry,type PersonalState} from './state';
import {stagePresentationInstall} from './presentation-install';
import {stagePracticeEditionTransfer} from './practice-edition-install';
import type {RebuiltInstall} from './edition-rebuild';
import type {EngravedAgainEntry} from './engraved-again-entry';

/** What installing an edition reads and writes: the managed files, and the
 * library as the viewer holds it. */
export interface EditionLibrary {
 host:{read(name:string):Promise<Uint8Array|null>;write(name:string,data:Uint8Array):Promise<void>};
 entries():Entry[];
 /** The library just written: the viewer's own from now on. */
 commit(entries:Entry[]):void;
 /** Every write to the library runs here, one at a time. */
 enqueue<T>(op:()=>Promise<T>):Promise<T>;
 /** An edition other than the one installed, read for its own facts. */
 admit(bytes:Uint8Array):Promise<ScorePackage>;
 /** The keyboard layout in use. */
 layout():PhysicalKeyboardId;
}
export interface EditionInstall<T> {
 entry:Entry;q:{packageBytes:Uint8Array;package:ScorePackage;personal?:PersonalState};personal:PersonalState;
 newEntry?:boolean;personalFiles?:Record<string,string>;rebuilt?:RebuiltInstall;earlier?:Uint8Array;
 /** See stagePresentationInstall. */
 engravedAgain?:Omit<EngravedAgainEntry,'edition'>|(()=>Omit<EngravedAgainEntry,'edition'>|undefined);
 /** Whether the install may still go on: checked before each write that
 * matters and last before the library is written. When it says no, the
 * library and every file it names stay as they were. */
 live():boolean;
 /** Before the install waits its turn to write. */
 queued?():Promise<void>;
 /** Its turn has come; throws to stop before anything is written. */
 saving?():void;
 /** Prepared before the library is written, once practice is carried. */
 context?(checked:PersonalState):Promise<T>;
}
/** Install a prepared edition as a library entry's own: its archive and
 * journals are staged as new files, practice is carried, and only then does
 * writing the library make them current. The earlier edition stays under
 * Earlier editions with its journals. An install stopped at any step leaves
 * the library naming the earlier edition and every file it names unchanged.
 * Opening a score and the library's background work both install through
 * here, so what comes along is the same either way. */
export async function installEdition<T>(library:EditionLibrary,request:EditionInstall<T>):Promise<{entry:Entry;personal:PersonalState;practiceContext?:T}>{
 const {host}=library,{entry,q,newEntry=false,rebuilt}=request;
 if(collectionId(q.package)!==entry.id)throw Error('This edition belongs to a different score.');
 const checked=readPersonal(q.personal??request.personal,q.package),originalPackageBytes=getOriginalScorePackageBytes(q.package),
  original=originalPackageBytes?await library.admit(originalPackageBytes):undefined,
  originalPersonalFiles:Record<string,string>={};
 if(original)for(const layout of original.availablePresentations??[]){const base=await selectPresentation(original,layout),key=personalStorageName(entry.id,base),file=retainedTranspositionFile(entry,0,layout),map=file===entry.file?entry.personalFiles:entry.editionPersonalFiles?.[file??''];if(map?.[key])originalPersonalFiles[key]=map[key];}
 const previousBytes=!newEntry?await host.read(entry.file):null;
 if(!newEntry&&!previousBytes)throw Error('The prior managed score is missing; saved progress and edition retained.');
 // A re-engraved edition carries practice from the earlier views it replaces.
 // Practice moves only between keyboard editions (stagePracticeEditionTransfer);
 // a musical reading's journals are named for the score alone, so its earlier
 // archive is not read again here.
 let previous=previousBytes&&!rebuilt&&q.package.keyboardLayout?await library.admit(previousBytes):undefined;
 if(previous&&q.package.keyboardLayout&&previous.availablePresentations?.includes(q.package.keyboardLayout))previous=await selectPresentation(previous,q.package.keyboardLayout);
 let practiceContext:T|undefined;
 await request.queued?.();
 return library.enqueue(async()=>{
  request.saving?.();
  const entries=library.entries(),latest=entries.find(e=>e.id===entry.id),
   live=()=>request.live()&&(newEntry?!library.entries().some(e=>e.id===entry.id):library.entries().find(e=>e.id===entry.id)?.file===entry.file);
  if(newEntry?!!latest:!latest||latest.file!==entry.file)throw Error('The library changed while saving; previous files are retained.');
  const installed=await stagePresentationInstall(host,{packageBytes:q.packageBytes,personalBytes:new TextEncoder().encode(JSON.stringify(checked)),
   personalKey:personalStorageName(entry.id,q.package),entry:latest??entry,entries,newEntry,personalFiles:request.personalFiles,
   ...(rebuilt?{additionalPersonal:rebuilt.additionalPersonal.map(p=>({key:p.key,bytes:new TextEncoder().encode(JSON.stringify(p.personal))})),replaced:rebuilt.replaced}:{}),...(request.earlier?{earlier:request.earlier}:{}),
   ...(request.engravedAgain?{engravedAgain:request.engravedAgain}:{}),
   beforeCommit:async()=>{
    if(previous)await stagePracticeEditionTransfer(host,{entryId:entry.id,from:previous,to:q.package,personal:checked,canCommit:live});
    if(rebuilt)await carryRebuiltPractice(host,entry.id,rebuilt,p=>p.to.keyboardLayout===q.package.keyboardLayout&&rebuilt.practice.includes(p)?checked:p.personal,live);
    if(!live())throw Error('Saving was cancelled; prior practice journals retained.');
    practiceContext=await request.context?.(checked);
    if(!live())throw Error('Saving was cancelled; prior practice journals retained.');
   },
   ...(entry.transposition||getScoreTransposition(q.package)!==0?{transposition:{steps:getScoreTransposition(q.package),layout:q.package.keyboardLayout??library.layout(),layouts:q.package.availablePresentations,originalPackageBytes,originalLayouts:original?.availablePresentations,originalPersonalFiles,
    ...(rebuilt?.originalPersonal.length?{originalPersonal:rebuilt.originalPersonal.map(p=>({key:p.key,bytes:new TextEncoder().encode(JSON.stringify(p.personal))}))}:{})}}:{}),
   canCommit:live});
  library.commit(installed.entries);return {entry:installed.entry,personal:checked,...(practiceContext!==undefined?{practiceContext}:{})};
 });
}
/** Carry practice from each earlier keyboard view to its new view. Practice
 * that can't move stays with the earlier edition and is reported; it never
 * keeps the score from opening. */
export async function carryRebuiltPractice(host:EditionLibrary['host'],entryId:string,r:RebuiltInstall,personalFor:(p:RebuiltInstall['practice'][number])=>PersonalState,live:()=>boolean){
 r.practiceLeft=0;
 for(const p of [...r.practice,...r.originalPractice]){
  // A journal already shared by both views needs no carrying.
  if(practiceStorageName(entryId,p.from)===practiceStorageName(entryId,p.to))continue;
  try{await stagePracticeEditionTransfer(host,{entryId,from:p.from,to:p.to,personal:personalFor(p),canCommit:live});}
  catch(error){if((error as Error).name==='AbortError'||!live())throw error;r.practiceLeft++;}
 }
}
