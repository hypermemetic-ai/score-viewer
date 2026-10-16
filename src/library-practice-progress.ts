import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';
import {importPackage,selectPresentation,hashBytes,type ScorePackage} from './package';
import {planPractice,practicePartition,readPractice,requirePracticeHands,wholePracticeProgress} from './practice';
import {displayedPracticeTotal} from './practice-display';
import {collectionId,practiceStorageName,legacyPracticeStorageName,personalStorageName,legacyPersonalStorageName,readPersonal,type Entry} from './state';
import {assertSelectedTransposition} from './score-transposition-selection';
import {getScoreTransposition} from './score-transposition';
import {PackageAdmissionSession} from './package-admission-session';
import {planManualPractice} from './manual-practice-plan';
import {readManualPracticeWithLegacy} from './manual-practice-state';
import {selectReadingNotation} from './dual-reading-package';
import {scoreCapabilities} from './score-capabilities';
import {ReadingPresentationController} from './reading-presentation';
import {manualReferenceStorageName,readManualReference} from './manual-reference-context';
import {LIBRARY_DERIVED_CACHE_FILE,LIBRARY_SUMMARY_POLICY,libraryCanonical,libraryCacheKey,readLibraryDerivedCache,libraryCacheBytes,createLibraryDerivedRow,verifyLibraryDependencies,captureLibraryDependencies,type LibraryDerivedRow} from './library-derived-cache';

export interface LibraryPracticeReader {
 readPackage(file:string):Promise<Uint8Array|null>;
 readRecord(file:string):Promise<unknown>;
 /** Optional disposable display cache; this interface never writes practice evidence. */
 readCache?(file:string):Promise<Uint8Array|null>;
 writeCache?(file:string,bytes:Uint8Array):Promise<void>;
}
export interface LibraryPracticeSummary {
 entryId:string;
 file:string;
 keyboard?:PhysicalKeyboardId;
 assessment?:'manual';
 sections:number;
 whole:boolean;
}

/** Read existing evidence only; unavailable companions never borrow the base layout. */
export async function readLibraryPracticeSummary(entry:Entry,keyboard:PhysicalKeyboardId,reader:LibraryPracticeReader,admission?:PackageAdmissionSession,isCurrent:()=>boolean=()=>true):Promise<LibraryPracticeSummary|undefined> {
 const bytes=await reader.readPackage(entry.file);
 if(!bytes)return;
 // Only the newest background refresh may resume after an old cold producer.
 // No additional replay/queue is launched while that producer owns the slot.
 if(admission)await admission.waitForIdle();
 if(!isCurrent())return;
 const options={allowLegacyTempo:true,execution:{onCheckpoint:()=>{if(!isCurrent())throw new DOMException('Library reading was superseded.','AbortError');}}};
 const imported=await (admission?admission.import(bytes,options):importPackage(bytes,options));
 if(!isCurrent())return;
 if(collectionId(imported)!==entry.id)return;
 if(imported.reading?.dual&&scoreCapabilities(imported).manualPractice){
  assertSelectedTransposition(entry,imported);
  const iso=selectReadingNotation(imported,'iso');let fallback;
  if(iso.score.referencePerformanceTempo===undefined){const context=await ReadingPresentationController.open(iso),identity={partId:iso.reading!.dual!.sourcePartId,musicalRevision:context.revision};
   fallback=readManualReference(await reader.readRecord(await manualReferenceStorageName(identity)),identity);if(!fallback)return;
  }
  const plan=await planManualPractice(iso,'bounded-exercises-v1',fallback),{state}=await readManualPracticeWithLegacy(plan,file=>reader.readRecord(file));
  return {entryId:entry.id,file:entry.file,assessment:'manual',sections:displayedPracticeTotal(plan,state),whole:wholePracticeProgress(plan,state)>=1};
 }
 if(!imported.availablePresentations?.includes(keyboard))return;
 assertSelectedTransposition(entry,imported);
 const p=await selectPresentation(imported,keyboard);
 const raw=await reader.readRecord(practiceStorageName(entry.id,p)),legacy=legacyPracticeStorageName(p);
 const saved=raw??(legacy?await reader.readRecord(legacy):undefined);
 const personalKey=personalStorageName(entry.id,p),declared=entry.personalFiles?.[personalKey],personalRaw=await reader.readRecord(declared??personalKey),legacyPersonal=legacyPersonalStorageName(p);
 if(declared&&personalRaw==null)throw Error('Declared personal journal is missing; library evidence retained.');
 const personal=readPersonal(personalRaw??(!declared&&legacyPersonal?await reader.readRecord(legacyPersonal):undefined),p,{allowLegacyJanko:personalRaw==null&&!declared&&!!legacyPersonal});
 requirePracticeHands(p,personal);
 const plan=planPractice(p,'bounded-exercises-v1',personal),state=readPractice(saved,plan);
 return {entryId:entry.id,file:entry.file,keyboard,sections:displayedPracticeTotal(plan,state),whole:wholePracticeProgress(plan,state)>=1};
}

/** Publish a complete snapshot, or a newer bound save, without partially clearing it. */
export class LibraryPracticeSummaries {
 private generation=0;
 private summaries=new Map<string,LibraryPracticeSummary>();
 private admission:PackageAdmissionSession;
 private contexts=new Map<string,string>();
 private retainedRows=new Map<string,LibraryDerivedRow>();
 private cacheWrites:Promise<void>=Promise.resolve();
 private policy:string;
 constructor(options:{admission?:PackageAdmissionSession;policy?:string}={}){this.admission=options.admission??new PackageAdmissionSession();this.policy=options.policy??LIBRARY_SUMMARY_POLICY;}
 /** Wait for this owner's ordered optional writes, including after clear/live progress. */
 flushCache():Promise<void>{return this.cacheWrites;}
 clear():void {++this.generation;this.summaries.clear();this.contexts.clear();this.retainedRows.clear();this.admission.clear();}

 get(entry:Entry,keyboard:PhysicalKeyboardId):LibraryPracticeSummary|undefined {
  const summary=this.summaries.get(entry.id);
  try{if(this.contexts.get(entry.id)!==libraryCanonical(entry))return;}catch{return;}
  return summary?.file===entry.file&&(summary.assessment==='manual'||summary.keyboard===keyboard)?summary:undefined;
 }

 async refresh(entries:Entry[],keyboard:PhysicalKeyboardId,reader:LibraryPracticeReader,isCurrent:()=>boolean,onProgress?:(completed:number,total:number)=>void):Promise<boolean> {
  const generation=++this.generation,snapshot=structuredClone(entries),next=new Map<string,LibraryPracticeSummary>(),contexts=new Map<string,string>();
  const current=()=>generation===this.generation&&isCurrent();
  const progress=(completed:number)=>{if(current()){try{onProgress?.(completed,snapshot.length);}catch{/* Feedback cannot invalidate evidence. */}}};
  progress(0);if(!current())return false;
  let diskRows:LibraryDerivedRow[]=[];
  if(reader.readCache){try{diskRows=await readLibraryDerivedCache(await reader.readCache(LIBRARY_DERIVED_CACHE_FILE));}catch{/* Cache I/O/format failure takes the original cold path. */}}
  if(!current())return false;
  const cached=new Map(diskRows.map(row=>[row.key,row])),updated=new Map<string,LibraryDerivedRow>();
  for(const [index,entry] of snapshot.entries()){
   let key:string|undefined;
   try{
    try{key=await libraryCacheKey(entry,keyboard,this.policy);}catch{/* An oversized context remains readable through the cold path. */}
    if(!current())return false;
    const rawBytes=await reader.readPackage(entry.file);if(!current())return false;
    if(rawBytes){
     const bytes=new Uint8Array(rawBytes),archiveSha256=await hashBytes(bytes);if(!current())return false;
     const row=key?cached.get(key):undefined;
     let summary:LibraryPracticeSummary|undefined;
     if(row&&row.archiveSha256===archiveSha256&&await verifyLibraryDependencies(row,reader,current)){
      summary=row.summary?{...row.summary}:undefined;updated.set(row.key,row);
     }else{
      if(!current())return false;
      const captured=captureLibraryDependencies(reader,entry.file,bytes);
      summary=await readLibraryPracticeSummary(entry,keyboard,captured.reader,this.admission,current);
      if(!current())return false;
      const dependencies=captured.dependencies();
      if(key&&dependencies){try{updated.set(key,await createLibraryDerivedRow(entry,keyboard,archiveSha256,dependencies,summary,this.policy));}catch{/* Noncacheable input does not discard a valid cold summary. */}}
     }
     if(summary){next.set(entry.id,summary);try{contexts.set(entry.id,libraryCanonical(entry));}catch{/* Non-JSON context cannot be retained as a display row. */}}
    }
   }catch{/* Unsupported or corrupt practice evidence remains untouched. */}
   if(!current())return false;
   progress(index+1);if(!current())return false;
  }
  if(!current())return false;
  // Retain other selected layouts while replacing this scan's exact identities.
  const merged=new Map([...diskRows.map(row=>[row.key,row] as const),...this.retainedRows]);
  for(const entry of snapshot){try{merged.delete(await libraryCacheKey(entry,keyboard,this.policy));}catch{}}
  if(!current())return false;
  for(const [key,row] of updated){merged.delete(key);merged.set(key,row);}
  const encoded=libraryCacheBytes([...merged.values()]);
  // The bounded bytes are also the retained-row boundary, never an unbounded memory table.
  const retained=new Map((await readLibraryDerivedCache(encoded)).map(row=>[row.key,row]));
  if(!current())return false;
  this.summaries=next;this.contexts=contexts;this.retainedRows=retained;
  if(reader.writeCache){
   this.cacheWrites=this.cacheWrites.catch(()=>{}).then(async()=>{if(!current())return;try{await reader.writeCache!(LIBRARY_DERIVED_CACHE_FILE,encoded);}catch{/* A disposable cache write never changes the accepted summary or journals. */}});
   await this.cacheWrites;
  }
  return current();
 }

 record(liveEntry:Entry|undefined,targetEntry:Entry,p:ScorePackage,keyboard:PhysicalKeyboardId,sections:number,whole:boolean):boolean {
  if(!liveEntry||liveEntry.id!==targetEntry.id||liveEntry.file!==targetEntry.file||collectionId(p)!==liveEntry.id||getScoreTransposition(p)!==(liveEntry.transposition?.steps??0)||p.keyboardLayout!==keyboard)return false;
  if(!Number.isFinite(sections)||sections<0||sections>1||typeof whole!=='boolean')return false;
  let context:string;try{context=libraryCanonical(liveEntry);if(context!==libraryCanonical(targetEntry))return false;}catch{return false;}
  ++this.generation;
  this.contexts.set(liveEntry.id,context);
  this.summaries.set(liveEntry.id,{entryId:liveEntry.id,file:liveEntry.file,keyboard,sections,whole});
  return true;
 }
 recordManual(liveEntry:Entry|undefined,targetEntry:Entry,p:ScorePackage,sections:number,whole:boolean):boolean {
  if(!liveEntry||liveEntry.id!==targetEntry.id||liveEntry.file!==targetEntry.file||collectionId(p)!==liveEntry.id||!p.reading?.dual||
   !Number.isFinite(sections)||sections<0||sections>1||typeof whole!=='boolean')return false;
  try{selectReadingNotation(p,'iso');}catch{return false;}
  let context:string;try{context=libraryCanonical(liveEntry);if(context!==libraryCanonical(targetEntry))return false;}catch{return false;}
  ++this.generation;this.contexts.set(liveEntry.id,context);this.summaries.set(liveEntry.id,{entryId:liveEntry.id,file:liveEntry.file,assessment:'manual',sections,whole});return true;
 }
}
