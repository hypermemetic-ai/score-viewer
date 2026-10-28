import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';
import type {Entry} from './state';
import {isScoreFileName} from './score-file-name';

/** What engraving an edition again kept, as opening says it: where the
 * earlier edition's hands and printed fingers now live, the player's choices
 * that stay with it, and the practice that couldn't move. `layouts`: only
 * these keyboard layouts were engraved (an edition completed with a layout
 * it left for later). `reading`: a musical reading, whose place and practice
 * came along. */
export interface EngravedAgainNotice {reading?:boolean;hands:'edition'|'choices';fingers:'edition'|'choices'|'none';left:number;practiceLeft:number;layouts?:PhysicalKeyboardId[]}
/** Kept on a library entry whose edition was engraved again from an earlier
 * edition (`from`, kept under Earlier editions) without the score being
 * open: in the library, or for the keyboard layout in use only. It stands
 * only while `edition` is the entry's edition. `later`: keyboard layouts
 * still to engrave from `from`. `untold`: what opening the score says, the
 * first time. */
export interface EngravedAgainEntry {edition:string;from:string;later?:PhysicalKeyboardId[];untold?:EngravedAgainNotice}

const LAYOUTS:readonly string[]=['janko-four-row','conventional-piano'];
const count=(value:unknown)=>Number.isSafeInteger(value)&&(value as number)>=0;
function validNotice(value:unknown):value is EngravedAgainNotice {
 const n=value as Partial<EngravedAgainNotice>|null;
 return !!n&&typeof n==='object'&&['edition','choices'].includes(n.hands!)&&['edition','choices','none'].includes(n.fingers!)&&count(n.left)&&count(n.practiceLeft)&&
  (n.reading===undefined||typeof n.reading==='boolean')&&(n.layouts===undefined||Array.isArray(n.layouts)&&n.layouts.every(id=>LAYOUTS.includes(id)));
}
/** Whether this record may stand on `entry` once `entry` names `edition`:
 * its earlier edition is kept with the entry. */
export function validEngravedAgain(record:unknown,entry:Pick<Entry,'file'|'retainedPackages'>):record is EngravedAgainEntry {
 const r=record as Partial<EngravedAgainEntry>|null;
 return !!r&&typeof r==='object'&&isScoreFileName(r.edition!)&&r.edition===entry.file&&isScoreFileName(r.from!)&&r.from!==r.edition&&(entry.retainedPackages??[]).includes(r.from!)&&
  (r.later===undefined||Array.isArray(r.later)&&r.later.length>0&&r.later.every(id=>LAYOUTS.includes(id)))&&(r.untold===undefined||validNotice(r.untold));
}
/** The entry's record, when it stands for the entry's edition; a record
 * that doesn't is no reason to refuse the library, and is read as none. */
export function engravedAgainOf(entry:Entry):EngravedAgainEntry|undefined {
 return validEngravedAgain(entry.engravedAgain,entry)?entry.engravedAgain:undefined;
}
/** Layouts `entry`'s edition left for later, and the earlier edition to engrave them from. */
export function laterLayouts(entry:Entry):{from:string;layouts:PhysicalKeyboardId[]}|undefined {
 const record=engravedAgainOf(entry);return record?.later?{from:record.from,layouts:record.later}:undefined;
}
/** Two notices as one: the first engraving's, then what the layouts
 * engraved later left behind. */
export function joinedNotice(first:EngravedAgainNotice|undefined,next:EngravedAgainNotice):EngravedAgainNotice {
 if(!first)return next;
 return {...(first.reading?{reading:true}:{}),hands:first.hands==='choices'||next.hands==='choices'?'choices':'edition',
  fingers:first.fingers==='choices'||next.fingers==='choices'?'choices':first.fingers==='none'?next.fingers:'edition',
  left:first.left+next.left,practiceLeft:first.practiceLeft+next.practiceLeft,...(first.layouts?{layouts:[...new Set([...first.layouts,...(next.layouts??[])])]}:{})};
}
