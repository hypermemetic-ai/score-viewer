/** A quiet sign in the library that scores are being prepared in the
 * background (engraved again, installed, their pages made), so a player who
 * waits a moment knows why the next opening will be quicker. It never takes
 * focus, never moves the layout and goes when the work is done. Work too
 * short to notice (a score already prepared, looked up) never shows it.
 *
 * Three designs stay behind an internal switch until one is chosen:
 * - `footer`: the words "Preparing scores" in the middle of the bottom bar,
 *   where task controls go (the library has none);
 * - `row`: a short line beside the score being prepared, or beside its
 *   composer while that composer is folded;
 * - `edge`: a hairline along the bottom edge of the screen. */
export type PreparingDesign='footer'|'row'|'edge';
export const PREPARING_DESIGNS:readonly PreparingDesign[]=['footer','row','edge'];
export const DEFAULT_PREPARING_DESIGN:PreparingDesign='footer';
/** The internal switch: a development setting, not an option the player sees. */
export const PREPARING_SWITCH='score-viewer.preparing-indicator';
export function preparingDesign(storage:Pick<Storage,'getItem'>|undefined=globalThis.localStorage):PreparingDesign{
 try{const chosen=storage?.getItem(PREPARING_SWITCH);if(PREPARING_DESIGNS.includes(chosen as PreparingDesign))return chosen as PreparingDesign;}catch{/* no storage: the default */}
 return DEFAULT_PREPARING_DESIGN;
}
/** A score whose preparation ends sooner than this never shows the sign. */
export const PREPARING_GRACE_MS=1500;

export class PreparingIndicator {
 private entryId?:string;
 private shown=false;
 private timer?:ReturnType<typeof setTimeout>;
 /** `library` is the library's surface while it is drawn. */
 constructor(private readonly library:()=>HTMLElement|null|undefined,private readonly design:()=>PreparingDesign=preparingDesign){}
 get showing(){return this.shown;}
 /** The score the background work has started on, or none once no work remains. */
 activity(entryId:string|undefined){
  if(entryId===undefined){this.cancel();this.entryId=undefined;if(this.shown){this.shown=false;this.paint();}return;}
  const was=this.entryId;this.entryId=entryId;
  if(this.shown){this.paint();return;}
  if(was===entryId&&this.timer!==undefined)return;
  this.cancel();this.timer=setTimeout(()=>{this.timer=undefined;if(this.entryId===entryId){this.shown=true;this.paint();}},PREPARING_GRACE_MS);
 }
 private cancel(){if(this.timer!==undefined)clearTimeout(this.timer);this.timer=undefined;}
 /** Paint into the library as it stands, also after it is drawn again. Only
  * attributes and one text change: nothing is focused or laid out anew. */
 paint(){
  const surface=this.library();if(!surface)return;
  const design=this.design(),on=this.shown&&this.entryId!==undefined;
  surface.dataset.preparingDesign=design;
  if(on)surface.dataset.preparing='';else delete surface.dataset.preparing;
  for(const row of surface.querySelectorAll<HTMLElement>('[data-preparing-row]'))delete row.dataset.preparingRow;
  if(on&&design==='row'){
   const row=surface.querySelector<HTMLElement>(`[data-open="${CSS.escape(this.entryId!)}"]`);
   if(row){row.dataset.preparingRow='';const composer=surface.querySelector<HTMLElement>(`.composer-entry[data-composer="${CSS.escape(row.dataset.composer??'')}"]`);if(composer)composer.dataset.preparingRow='';}
  }
  let words=surface.querySelector<HTMLElement>('.preparing-words');
  if(!words){const slot=surface.querySelector<HTMLElement>('.library-navigation .application-navigation-actions');if(slot){words=document.createElement('span');words.className='preparing-words';words.textContent='Preparing scores';slot.append(words);}}
  let edge=surface.querySelector<HTMLElement>('.preparing-edge');
  if(!edge){edge=document.createElement('span');edge.className='preparing-edge';edge.setAttribute('aria-hidden','true');surface.append(edge);}
 }
}
