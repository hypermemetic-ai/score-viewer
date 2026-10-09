import type {ScorePackage} from './package';
import {selectReadingNotation} from './dual-reading-package';

/** Both reader and Options use the same actual admitted presentation picker. */
export function readingNotationControl(p:ScorePackage){
 if(!p.reading?.dual)return '';
 const notation=selectReadingNotation(p,p.reading.dual.notation).reading!.dual!.notation;
 return `<select name="readingNotation" data-reading-notation aria-label="Notation"><option value="iso" ${notation==='iso'?'selected':''}>ISO</option><option value="tab" ${notation==='tab'?'selected':''}>TAB</option></select>`;
}
