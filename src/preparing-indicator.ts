/** A thin line under the library row whose score is being prepared in the
 * background (engraved again, installed, its pages made). It starts as a
 * short stub under the row's text and grows to the row's right edge as the
 * work reaches its stages (`AheadOfTimeWork.plan`, `reached`), so its length
 * says how far that score has come, never more. Done, it fills the row and
 * fades away; failed or stopped, it goes at once (opening says what went
 * wrong, as before). Rows waiting their turn show nothing.
 *
 * It never takes focus and never moves the layout: the line is an overlay in
 * the row, and progress changes one custom property on it. Work too short to
 * notice (a score already prepared, looked up) never shows it. While its
 * composer is folded, the line is drawn under the composer instead. */
import type {AheadOfTimeProgress} from './ahead-of-time-engraving';

/** A score whose work ends sooner than this never shows a line. */
export const PREPARING_GRACE_MS=1000;
/** A finished line fills the row, then fades: gone after this long. */
export const PREPARING_LEAVE_MS=1200;

export class PreparingIndicator {
 /** The score under way and how far it has come. */
 private work?:AheadOfTimeProgress;
 /** The score whose line is drawn. */
 private shown?:string;
 private grace?:ReturnType<typeof setTimeout>;
 /** `library` is the library's surface while it is drawn. */
 constructor(private readonly library:()=>HTMLElement|null|undefined){}
 /** The score the line is drawn for, if any (finished lines fading out excluded). */
 get showing(){return this.shown;}
 /** The score the background work is on, if any. */
 get preparing(){return this.work?.entryId;}
 activity(progress:AheadOfTimeProgress|undefined){
  const was=this.work;
  if(!progress||progress.end){
   this.work=undefined;this.cancel();
   const shown=this.shown;this.shown=undefined;
   if(shown!==undefined)this.finish(shown,progress?.entryId===shown&&progress.end==='done');
   return;
  }
  this.work=progress;
  if(this.shown===progress.entryId){this.draw(progress);return;}
  if(was?.entryId===progress.entryId&&this.grace!==undefined)return;
  // Another score: its own grace. A line still drawn for the one before goes.
  if(this.shown!==undefined){this.finish(this.shown,false);this.shown=undefined;}
  this.cancel();
  this.grace=setTimeout(()=>{this.grace=undefined;if(this.work?.entryId!==progress.entryId)return;this.shown=progress.entryId;this.draw(this.work);},PREPARING_GRACE_MS);
 }
 private cancel(){if(this.grace!==undefined)clearTimeout(this.grace);this.grace=undefined;}
 /** Draw into the library as it stands, also after it is drawn again. */
 paint(){if(this.shown!==undefined&&this.work?.entryId===this.shown)this.draw(this.work);}
 /** The rows that stand for a score: its own, and its composer's (shown while folded). */
 private rows(entryId:string):HTMLElement[]{
  const surface=this.library(),row=surface?.querySelector<HTMLElement>(`[data-open="${CSS.escape(entryId)}"]`);if(!surface||!row)return [];
  const composer=surface.querySelector<HTMLElement>(`.composer-entry[data-composer="${CSS.escape(row.dataset.composer??'')}"]`);
  return composer?[row,composer]:[row];
 }
 private draw(progress:AheadOfTimeProgress){
  for(const row of this.rows(progress.entryId)){
   let line=row.querySelector<HTMLElement>(':scope > .preparing-line');
   if(!line){line=row.ownerDocument.createElement('span');line.className='preparing-line';line.setAttribute('aria-hidden','true');row.append(line);}
   row.dataset.preparing=progress.stage??'';
   line.dataset.progress=progress.fraction.toFixed(2);
   line.style.setProperty('--progress',String(progress.fraction));
   // It starts where the row's text starts, read from the row's style (also while it is hidden).
   if(!line.style.getPropertyValue('--from'))line.style.setProperty('--from',`${textStart(row)}px`);
  }
 }
 /** Done: the line fills the row, then fades. Failed or stopped: it goes now. */
 private finish(entryId:string,done:boolean){
  for(const row of this.rows(entryId)){
   delete row.dataset.preparing;
   const line=row.querySelector<HTMLElement>(':scope > .preparing-line');if(!line)continue;
   if(!done){line.remove();continue;}
   line.dataset.progress='1.00';line.style.setProperty('--progress','1');line.dataset.end='done';
   setTimeout(()=>line.remove(),PREPARING_LEAVE_MS);
  }
 }
}

/** Where a row's text starts, from the row's left edge: after its padding,
 * and for a composer after the arrow and the gap that follows it. */
function textStart(row:HTMLElement):number{
 const style=getComputedStyle(row),padding=parseFloat(style.paddingLeft)||0;
 if(!row.classList.contains('composer-entry'))return padding;
 const arrow=row.querySelector<HTMLElement>('.composer-arrow');
 return padding+(arrow?parseFloat(getComputedStyle(arrow).width)||0:0)+(parseFloat(style.columnGap)||0);
}
