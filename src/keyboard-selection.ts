import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';
import type {ScorePackage} from './package';
import type {ViewState} from './state';

export const keyboardLabel=(id:PhysicalKeyboardId)=>id==='conventional-piano'?'Conventional piano':'Jankó piano (4-row)';
/** Missing preferences on an existing, positively identified RR installation
 * keep its keyboard. Fresh installations use conventional piano. */
export function keyboardPreference(value:unknown,retainedRR=false):PhysicalKeyboardId {
  if(value===undefined)return retainedRR?'janko-four-row':'conventional-piano';
  if(value!=='conventional-piano'&&value!=='janko-four-row')throw Error('Saved keyboard differs; preferences retained.');
  return value;
}
export function writtenAnchor(p:Pick<ScorePackage,'seats'>,page:number,ownerId?:string):number {
  const selected=ownerId?p.seats.find(s=>s.ownerIds.includes(ownerId)):undefined;
  return selected?.writtenBar??p.seats.filter(s=>s.page>=page).sort((a,b)=>a.page-b.page||a.writtenBar-b.writtenBar)[0]?.writtenBar??1;
}
/** Each keyboard has its own geometry. Preserve musical location and reading
 * preferences, without carrying screen coordinates into the other layout. */
export function anchorView(view:ViewState,next:Pick<ScorePackage,'seats'|'pages'>,bar:number):ViewState {
  const seat=next.seats.find(s=>s.writtenBar===bar)??next.seats.find(s=>s.writtenBar>bar);
  return{...structuredClone(view),page:Math.max(0,Math.min(next.pages.length-1,seat?.page??next.pages.length-1))};
}
