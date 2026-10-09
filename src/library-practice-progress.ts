import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';
import {importPackage,selectPresentation,type ScorePackage} from './package';
import {planPractice,practicePartition,readPractice,wholePracticeProgress} from './practice';
import {displayedPracticeTotal} from './practice-display';
import {collectionId,practiceStorageName,legacyPracticeStorageName,type Entry} from './state';
import {assertSelectedTransposition} from './score-transposition-selection';
import {getScoreTransposition} from './score-transposition';
import {PackageAdmissionSession} from './package-admission-session';
import {planManualPractice} from './manual-practice-plan';
import {manualPracticeStorageName,readManualPractice} from './manual-practice-state';
import {selectReadingNotation} from './dual-reading-package';
import {scoreCapabilities} from './score-capabilities';
import {ReadingPresentationController} from './reading-presentation';
import {manualReferenceStorageName,readManualReference} from './manual-reference-context';

export interface LibraryPracticeReader {
 readPackage(file:string):Promise<Uint8Array|null>;
 readRecord(file:string):Promise<unknown>;
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
 const imported=await (admission?admission.import(bytes,{allowLegacyTempo:true}):importPackage(bytes,{allowLegacyTempo:true}));
 if(collectionId(imported)!==entry.id)return;
 if(imported.reading?.dual&&scoreCapabilities(imported).manualPractice){
  assertSelectedTransposition(entry,imported);
  const iso=selectReadingNotation(imported,'iso');let fallback;
  if(iso.score.referencePerformanceTempo===undefined){const context=await ReadingPresentationController.open(iso),identity={partId:iso.reading!.dual!.sourcePartId,musicalRevision:context.revision};
   fallback=readManualReference(await reader.readRecord(await manualReferenceStorageName(identity)),identity);if(!fallback)return;
  }
  const plan=await planManualPractice(iso,'connection-boundary-v1',fallback),state=readManualPractice(await reader.readRecord(manualPracticeStorageName(plan)),plan);
  return {entryId:entry.id,file:entry.file,assessment:'manual',sections:displayedPracticeTotal(plan,state),whole:wholePracticeProgress(plan,state)>=1};
 }
 if(!imported.availablePresentations?.includes(keyboard))return;
 assertSelectedTransposition(entry,imported);
 const p=await selectPresentation(imported,keyboard);
 const raw=await reader.readRecord(practiceStorageName(entry.id,p)),legacy=legacyPracticeStorageName(p);
 const saved=raw??(legacy?await reader.readRecord(legacy):undefined);
 const plan=planPractice(p,practicePartition(saved)),state=readPractice(saved,plan);
 return {entryId:entry.id,file:entry.file,keyboard,sections:displayedPracticeTotal(plan,state),whole:wholePracticeProgress(plan,state)>=1};
}

/** Publish a complete snapshot, or a newer bound save, without partially clearing it. */
export class LibraryPracticeSummaries {
 private generation=0;
 private summaries=new Map<string,LibraryPracticeSummary>();
 private admission=new PackageAdmissionSession();
 clear():void {++this.generation;this.summaries.clear();this.admission.clear();}

 get(entry:Entry,keyboard:PhysicalKeyboardId):LibraryPracticeSummary|undefined {
  const summary=this.summaries.get(entry.id);
  return summary?.file===entry.file&&(summary.assessment==='manual'||summary.keyboard===keyboard)?summary:undefined;
 }

 async refresh(entries:Entry[],keyboard:PhysicalKeyboardId,reader:LibraryPracticeReader,isCurrent:()=>boolean):Promise<boolean> {
  const generation=++this.generation,snapshot=entries.map(entry=>({...entry})),next=new Map<string,LibraryPracticeSummary>();
  for(const entry of snapshot){
   try{const summary=await readLibraryPracticeSummary(entry,keyboard,reader,this.admission,()=>generation===this.generation&&isCurrent());if(summary)next.set(entry.id,summary);}
   catch{/* Unsupported or corrupt practice evidence remains untouched. */}
   if(generation!==this.generation||!isCurrent())return false;
  }
  if(generation!==this.generation||!isCurrent())return false;
  this.summaries=next;
  return true;
 }

 record(liveEntry:Entry|undefined,targetEntry:Entry,p:ScorePackage,keyboard:PhysicalKeyboardId,sections:number,whole:boolean):boolean {
  if(!liveEntry||liveEntry.id!==targetEntry.id||liveEntry.file!==targetEntry.file||collectionId(p)!==liveEntry.id||getScoreTransposition(p)!==(liveEntry.transposition?.steps??0)||p.keyboardLayout!==keyboard)return false;
  if(!Number.isFinite(sections)||sections<0||sections>1||typeof whole!=='boolean')return false;
  ++this.generation;
  this.summaries.set(liveEntry.id,{entryId:liveEntry.id,file:liveEntry.file,keyboard,sections,whole});
  return true;
 }
 recordManual(liveEntry:Entry|undefined,targetEntry:Entry,p:ScorePackage,sections:number,whole:boolean):boolean {
  if(!liveEntry||liveEntry.id!==targetEntry.id||liveEntry.file!==targetEntry.file||collectionId(p)!==liveEntry.id||!p.reading?.dual||
   !Number.isFinite(sections)||sections<0||sections>1||typeof whole!=='boolean')return false;
  try{selectReadingNotation(p,'iso');}catch{return false;}
  ++this.generation;this.summaries.set(liveEntry.id,{entryId:liveEntry.id,file:liveEntry.file,assessment:'manual',sections,whole});return true;
 }
}
