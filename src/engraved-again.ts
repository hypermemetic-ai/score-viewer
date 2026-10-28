import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';

// Its own digest: reading-package.ts, which package.ts imports, uses this module.
const hashBytes=async(bytes:Uint8Array|string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',typeof bytes==='string'?new TextEncoder().encode(bytes):new Uint8Array(bytes))),n=>n.toString(16).padStart(2,'0')).join('');

/** A saved archive engraved again with the current engraving: the new
 * archive, and the keyboards whose hands or printed fingers could not stay
 * edition content (always none for a musical reading). */
export interface EngravedAgain {bytes:Uint8Array;fellBack:PhysicalKeyboardId[];droppedFingers:PhysicalKeyboardId[]}
/** Engravings already made, by the digest of everything they were made from.
 * Derived only, like the derived-file cache that keeps them: a miss engraves
 * again, and the result is admitted like any archive before it is shown. */
export interface EngravedAgainStore {get(key:string):Promise<EngravedAgain|undefined>;put(key:string,engraved:EngravedAgain):void}
let store:EngravedAgainStore|undefined;
/** Where engravings made again are kept; ahead-of-time work fills it while
 * the player is in the library, so opening the score engraves nothing. */
export function useEngravedAgainStore(next:EngravedAgainStore|undefined){store=next;}

/** The engraving of `inputs` (the saved archive, and for a transposed
 * edition the original it is bound to, or for an edition completed with the
 * layouts it left for later, the earlier edition it was engraved from),
 * made once, for `kind` (which names the layouts engraved when not every
 * layout is): kept when the store holds it, engraved and kept otherwise.
 * Nothing else goes into the
 * engraving: the engine and the rules are those of this build, which the
 * store is bound to. With `keptOnly`, nothing is engraved: a miss throws
 * NotEngravedYet. */
export async function engraveAgainOnce(kind:string,inputs:readonly Uint8Array[],engrave:()=>Promise<EngravedAgain>,keptOnly=false):Promise<EngravedAgain>{
 const kept=store;if(!kept){if(keptOnly)throw new NotEngravedYet();return engrave();}
 const key=await hashBytes(JSON.stringify([kind,...await Promise.all(inputs.map(bytes=>hashBytes(bytes)))]));
 const found=await kept.get(key).catch(()=>undefined);if(found)return {bytes:new Uint8Array(found.bytes),fellBack:[...found.fellBack],droppedFingers:[...found.droppedFingers]};
 if(keptOnly)throw new NotEngravedYet();
 const made=await engrave();kept.put(key,{bytes:new Uint8Array(made.bytes),fellBack:[...made.fellBack],droppedFingers:[...made.droppedFingers]});return made;
}

/** `keptOnly` found no engraving kept: the library's background work, which
 * never engraves on the reader's thread, leaves the score for opening. */
export class NotEngravedYet extends Error {constructor(){super('This score has not been engraved again yet.');this.name='NotEngravedYet';}}

const KEYBOARDS:readonly string[]=['janko-four-row','conventional-piano'];
/** As the derived-file cache stores JSON: the archive as base64. */
export function engravedAgainRecord(engraved:EngravedAgain):unknown {
 let binary='';const bytes=engraved.bytes;for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
 return {version:'engraved-again-v1',archive:btoa(binary),fellBack:engraved.fellBack,droppedFingers:engraved.droppedFingers};
}
export function engravedAgainFromRecord(raw:unknown):EngravedAgain {
 const record=raw as {version?:unknown;archive?:unknown;fellBack?:unknown;droppedFingers?:unknown};
 const keyboards=(value:unknown):value is PhysicalKeyboardId[]=>Array.isArray(value)&&value.every(id=>KEYBOARDS.includes(id));
 if(!record||record.version!=='engraved-again-v1'||typeof record.archive!=='string'||!keyboards(record.fellBack)||!keyboards(record.droppedFingers))throw Error('Not an engraving made again.');
 const binary=atob(record.archive),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return {bytes,fellBack:record.fellBack,droppedFingers:record.droppedFingers};
}
