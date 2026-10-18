/** SCORE-FILE MIGRATION (2026-10-17) — delete this file once every library
 * has started once with it.
 *
 * Libraries saved before 2026-10-17 name their stored score files
 * `package-<sha256>.isoscore`; they are now `package-<sha256>.tuna`, with the
 * same bytes. At startup, before anything else reads the library, each such
 * file is renamed in an order that cannot lose a score if the viewer is
 * stopped at any point:
 *
 *  1. write the `.tuna` file with the exact same bytes (an already present
 *     `.tuna` file is reused when its bytes match);
 *  2. read it back and check its SHA-256 against the hash in its name;
 *  3. switch every library.json reference in one atomic write;
 *  4. only then remove the `.isoscore` file (the native side checks the
 *     `.tuna` copy once more before removing anything).
 *
 * A file that is missing, unreadable or differs from its name keeps its
 * earlier reference and is read under that name; nothing about it changes.
 * An interrupted run resumes at the next start: steps 1–3 are repeated for
 * any reference still naming `.isoscore`, and step 4 is repeated for every
 * `.tuna` reference, which removes nothing once the earlier file is gone.
 *
 * Also remove with this file: its call in main.ts `boot`, the
 * `removeMigratedScoreFile` host method, the `.isoscore` alternatives in
 * score-file-name.ts and managed-file-storage.ts, and the native
 * `remove_migrated_score_file` command and `.isoscore` suffix in
 * src-tauri/src/managed_files.rs. The transposed-score member alternative in
 * score-transposition.ts belongs to existing archives and stays. */
import {scoreFileName,scoreFileSha256} from './score-file-name';
import {validEntryStorage,type Entry} from './state';

export interface ScoreFileMigrationHost {
 read(name:string):Promise<Uint8Array|null>;
 write(name:string,data:Uint8Array):Promise<void>;
 /** Removes an earlier `.isoscore` file whose `.tuna` copy is exact. */
 removeMigratedScoreFile?(name:string):Promise<unknown>;
}
export interface ScoreFileLibrary {version:1;entries:Entry[]}

const EARLIER='.isoscore';
const isEarlier=(name:string)=>name.endsWith(EARLIER)&&scoreFileSha256(name)!==undefined;
const earlierName=(sha256:string)=>`package-${sha256}${EARLIER}`;
const sha256=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))).map(n=>n.toString(16).padStart(2,'0')).join('');

/** Every stored score file name an entry refers to. */
function references(e:Entry):string[] {
 return [e.file,...(e.presentations??[]),...(e.retainedPackages??[]),...Object.keys(e.editionPersonalFiles??{}),
  ...Object.values(e.transposition?.editions??{}).flatMap(layouts=>Object.values(layouts??{}) as string[])];
}

function renameEntry(e:Entry,renamed:ReadonlyMap<string,string>):Entry {
 const name=(file:string)=>renamed.get(file)??file,next:Entry={...e,file:name(e.file)};
 if(e.presentations)next.presentations=e.presentations.map(name);
 if(e.retainedPackages)next.retainedPackages=[...new Set(e.retainedPackages.map(name))];
 // Journals listed under both names of one file are kept together.
 if(e.editionPersonalFiles){const files:NonNullable<Entry['editionPersonalFiles']>={};for(const [file,map] of Object.entries(e.editionPersonalFiles)){const to=name(file);files[to]=to===file?{...files[to],...map}:{...map,...files[to]};}next.editionPersonalFiles=files;}
 if(e.transposition)next.transposition={...e.transposition,editions:Object.fromEntries(Object.entries(e.transposition.editions).map(([steps,layouts])=>
  [steps,Object.fromEntries(Object.entries(layouts??{}).map(([layout,file])=>[layout,name(file as string)]))]))};
 return next;
}

/** Copies one earlier file to its `.tuna` name; true once the copy is exact. */
async function copyExactly(host:ScoreFileMigrationHost,earlier:string):Promise<boolean> {
 const hash=scoreFileSha256(earlier)!,next=scoreFileName(hash);
 try{
  const present=await host.read(next);
  if(present&&await sha256(present)===hash)return true;
  const bytes=await host.read(earlier);
  if(!bytes||await sha256(bytes)!==hash)return false;
  await host.write(next,bytes);
  const written=await host.read(next);
  return !!written&&await sha256(written)===hash;
 }catch{return false;}
}

/** Returns the library to use. When it changed, it has already been saved. */
export async function migrateScoreFiles(host:ScoreFileMigrationHost,library:ScoreFileLibrary):Promise<ScoreFileLibrary> {
 const earlier=[...new Set(library.entries.flatMap(references).filter(isEarlier))],renamed=new Map<string,string>();
 for(const name of earlier)if(await copyExactly(host,name))renamed.set(name,scoreFileName(scoreFileSha256(name)!));
 let result=library;
 if(renamed.size){
  const entries=library.entries.map(e=>renameEntry(e,renamed));
  // One atomic write switches every reference (native: write, then replace).
  // If it fails, the earlier library and every earlier file stay in use.
  if(entries.every(validEntryStorage))try{
   await host.write('library.json',new TextEncoder().encode(JSON.stringify({version:1,entries})));
   result={version:1,entries};
  }catch{}
 }
 if(host.removeMigratedScoreFile){
  const kept=new Set(result.entries.flatMap(references)),
   removable=[...kept].filter(name=>name.endsWith('.tuna')).map(name=>earlierName(scoreFileSha256(name)!)).filter(name=>!kept.has(name));
  await Promise.all(removable.map(name=>host.removeMigratedScoreFile!(name).catch(()=>undefined)));
 }
 return result;
}
