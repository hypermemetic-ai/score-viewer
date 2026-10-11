import type {ScorePackage,Seat} from './package';
import type {PracticePlan} from './practice';
import type {ExerciseClip} from './practice-exercise-catalog';
import {cropMeasure,composePassage,passageTrack,fitPassageRelations,fitPassageFrame,type Crop} from './practice-passage';
import {projectRelations} from './practice-relations';

function appearanceTick(p:ScorePackage,crop:Crop,seat:Seat):number {
 const owner=p.score.notes.find(n=>seat.ownerIds.includes(n.id));if(!owner)throw Error('Excerpt seat has no source owner.');
 const head=crop.svg.querySelector(`[data-viewer-seat="${CSS.escape(seat.id)}"]`)?.closest('[data-note-id]')?.getAttribute('data-note-id'),component=head?.match(/~c(\d+)$/)?.[1];
 return component===undefined?owner.startTick:p.score.tieChains?.find(c=>c.noteId===owner.id)?.components[Number(component)]?.startTick??owner.startTick;
}
/** Horizontal source cropping preserves real heads, beams and source spacing;
 * it removes excluded heads even when they share a hand/bar owner group. */
export function cropPracticeClip(p:ScorePackage,plan:PracticePlan,clip:ExerciseClip,onlyOwners?:ReadonlySet<string>):Crop[] {
 if(clip.start<plan.barTicks[clip.firstBar]||clip.end>plan.barTicks[clip.lastBar+1]||clip.start>=clip.end)throw Error('Excerpt crop differs from its actual source bars.');
 return Array.from({length:clip.lastBar-clip.firstBar+1},(_,i)=>{
  const crop=cropMeasure(p,plan,clip.firstBar+i),barStart=plan.barTicks[crop.bar],barEnd=plan.barTicks[crop.bar+1],start=Math.max(barStart,clip.start),end=Math.min(barEnd,clip.end);
  const appearances=crop.seats.map(seat=>({seat,tick:appearanceTick(p,crop,seat)})),selected=appearances.filter(a=>a.tick>=start&&a.tick<end&&(!onlyOwners||a.seat.ownerIds.some(id=>onlyOwners.has(id)))),ids=new Set(selected.flatMap(a=>a.seat.ownerIds));
  // Written continuations keep their owner without inventing a new attack.
  const kept=new Set(selected.map(a=>a.seat.id));
  for(const seat of crop.seats)if(!kept.has(seat.id)){
   const node=crop.svg.querySelector(`[data-viewer-seat="${CSS.escape(seat.id)}"]`);const head=node?.closest('.janko-reading-head');if(head)head.remove();else node?.remove();
  }
  crop.owned=crop.owned.filter(o=>{
   const owners=(o.el.getAttribute('data-practice-owner-ids')??'').split('|').filter(Boolean);
   if(owners.length&&!owners.some(id=>ids.has(id))){o.el.remove();return false;}return o.el.isConnected||crop.svg.contains(o.el);
  });
  const columns=[...new Map(appearances.sort((a,b)=>a.tick-b.tick).map(a=>[a.tick,a.seat.x])).entries()];
  const xAt=(tick:number,edge:'start'|'end')=>{
   const exact=columns.findIndex(([t])=>t===tick);
   if(exact>=0){const x=columns[exact][1],previous=columns[exact-1]?.[1]??crop.left;return (previous+x)/2;}
   const next=columns.findIndex(([t])=>t>tick),a=next<0?columns.at(-1):columns[next-1],b=next<0?undefined:columns[next];
   if(a&&b)return a[1]+(b[1]-a[1])*(tick-a[0])/(b[0]-a[0]);
   return edge==='start'?crop.left:crop.right;
  };
  const left=start===barStart?crop.left:xAt(start,'start'),right=end===barEnd?crop.right:xAt(end,'end');
  if(!(right>left))throw Error('Excerpt has no source horizontal span.');
  const view=crop.svg.viewBox.baseVal;crop.left=left;crop.right=right;crop.leftAir=start===barStart?crop.leftAir:1;crop.rightAir=end===barEnd?crop.rightAir:1;
  crop.width=right-left+crop.leftAir+crop.rightAir;crop.seats=selected.map(a=>a.seat);
  crop.svg.setAttribute('viewBox',`${left-crop.leftAir} ${view.y} ${crop.width} ${view.height}`);
  crop.svg.dataset.practiceClip=clip.id;crop.svg.dataset.practiceClipStart=String(start);crop.svg.dataset.practiceClipEnd=String(end);
  return crop;
 });
}
export function renderPracticeClip(p:ScorePackage,plan:PracticePlan,clip:ExerciseClip,mount:HTMLElement,onlyOwners?:ReadonlySet<string>){
 const crops=cropPracticeClip(p,plan,clip,onlyOwners),bars=crops.map(c=>c.bar),track=fitPassageFrame(p,plan,crops,fitPassageRelations(p,plan,crops,passageTrack(crops,mount,p,true),'compact',[bars]),'compact',[bars],mount);
 const rendered=composePassage(crops,track,'compact',bars,projectRelations(p,plan,crops,track,'compact',bars));
 rendered.svg.dataset.practiceClip=clip.id;rendered.svg.dataset.practiceClipStart=String(clip.start);rendered.svg.dataset.practiceClipEnd=String(clip.end);
 return rendered;
}
