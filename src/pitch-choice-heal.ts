import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';
import {unzipSync,strFromU8} from 'fflate';
import type {Entry} from './state';

/** PITCH CHOICE REPAIR (2026-10-28). Before the fix that keeps a pitch choice
 * on the completed edition (#223), completing an edition engraved again for the
 * keyboard layout in use first left that layout's choice at the score's pitch
 * on the edition installed on the way. That archive is retired (kept under
 * Earlier editions) and shows the layout exactly as the current edition does,
 * but has no other layout: returning to the pitch on it, then switching
 * layout, made a new edition.
 *
 * A remembered choice at the entry's own pitch that names a retired archive
 * names the current edition instead, only when nothing the player sees on that
 * layout changes: the current edition shows the layout from the same source,
 * header and members, byte for byte, with the same hands and engraving, and the
 * player's saved choices for that layout are the same files. A choice that
 * differs in any of these (an Earlier edition chosen on purpose, a layout's own
 * retained edition, another pitch) is left as it is. No archive or journal is
 * read for an entry with no such choice, and nothing is written unless a choice
 * changes. */

const LAYOUTS:readonly PhysicalKeyboardId[]=['janko-four-row','conventional-piano'];
type Read=(name:string)=>Promise<Uint8Array|null>;

/** The layouts whose choice at the entry's own pitch names a retired archive. */
export function strayCandidates(e:Entry):Array<[PhysicalKeyboardId,string]> {
 const pitch=e.transposition?.editions[String(e.transposition.steps)];
 return pitch?LAYOUTS.flatMap(layout=>{const file=pitch[layout];return file&&file!==e.file&&e.retainedPackages?.includes(file)?[[layout,file] as [PhysicalKeyboardId,string]]:[];}):[];
}

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
/** What a layout shows from an archive, with member names read as their bytes' hashes. */
function layoutView(bytes:Uint8Array,layout:PhysicalKeyboardId):string|undefined {
 let m:unknown;try{m=JSON.parse(strFromU8(unzipSync(bytes,{filter:f=>f.name==='manifest.json'})['manifest.json']!));}catch{return;}
 if(!object(m)||!object(m.files)||!object(m.presentations)||!object(m.presentations[layout]))return;
 const files=m.files as Record<string,unknown>;
 const hashed=(v:unknown):unknown=>typeof v==='string'&&Object.hasOwn(files,v)?{member:files[v]}:Array.isArray(v)?v.map(hashed):
  object(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,hashed(v[k])])):v;
 const {createdAt:_,presentations:__,files:___,...shared}=m;
 // Top-level fields describe the archive's first layout; the layout's own
 // presentation describes it wherever it is, so it must be first in both.
 return JSON.stringify(hashed({first:m.keyboardLayout===layout,shared,shown:m.presentations[layout]}));
}
/** The player's saved choice files for a layout. */
const choicesFor=(files:Record<string,string>|undefined,layout:PhysicalKeyboardId)=>
 JSON.stringify(Object.entries(files??{}).filter(([key])=>key.includes(`-${layout}-`)).sort(([a],[b])=>a<b?-1:a>b?1:0));

/** The entry with its stray pitch choices on the current edition, or undefined when none is stray. */
export async function healPitchChoices(e:Entry,read:Read):Promise<Entry|undefined> {
 const candidates=strayCandidates(e);if(!candidates.length)return;
 const current=await read(e.file).catch(()=>null);if(!current)return;
 const pitch={...e.transposition!.editions[String(e.transposition!.steps)]};let changed=false;
 for(const [layout,file] of candidates){
  const shown=layoutView(current,layout);if(!shown)continue;
  const earlier=await read(file).catch(()=>null);
  if(!earlier||layoutView(earlier,layout)!==shown||choicesFor(e.editionPersonalFiles?.[file],layout)!==choicesFor(e.personalFiles,layout))continue;
  pitch[layout]=e.file;changed=true;
 }
 return changed?{...e,transposition:{...e.transposition!,editions:{...e.transposition!.editions,[String(e.transposition!.steps)]:pitch}}}:undefined;
}
