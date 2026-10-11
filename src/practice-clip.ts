import type {PracticePlan,PracticeChunk} from './practice';
import type {ExerciseClip} from './practice-exercise-catalog';

/** Earlier sounding owners remain genuine preparation; attacks outside the
 * excerpt never become Reading, preview or timed assessment events. */
export function practiceClipPlan(plan:PracticePlan,clip:Pick<ExerciseClip,'start'|'end'>,includeCarry=true):PracticePlan {
 const attacks=plan.attacks.filter(a=>a.tick<clip.end&&(includeCarry?a.end>clip.start:a.tick>=clip.start)),gestures=plan.gestures.flatMap(g=>{
  const included=attacks.filter(a=>a.groups.includes(g.id));if(!included.length)return [];
  const owners=new Set(included.flatMap(a=>a.owners));
  return [{...g,start:Math.min(...included.map(a=>a.tick)),end:Math.max(...included.map(a=>a.end)),owners:g.owners.filter(id=>owners.has(id)),attackIds:included.map(a=>a.id)}];
 });
 return {...plan,attacks,gestures};
}
/** A display endpoint cannot manufacture an early release of a tied owner.
 * The obligation tail contains no newly graded or newly displayed attacks. */
export function practiceClipCompletionTick(plan:PracticePlan,clip:Pick<ExerciseClip,'start'|'end'>):number {
 return Math.max(clip.end,...plan.attacks.filter(a=>a.tick<clip.end&&a.end>clip.start).map(a=>a.end));
}
export const practiceClipLabel=(clip:Pick<ExerciseClip,'firstBar'|'lastBar'>)=>clip.firstBar===clip.lastBar?`Measure ${clip.firstBar+1}`:`Measures ${clip.firstBar+1}–${clip.lastBar+1}`;

/** An original or connection cut inside a source measure needs the same exact
 * visible source excerpt as a selected contrast, without changing its identity. */
export function activePracticeClip(chunk:PracticeChunk|undefined,bars:readonly number[]):ExerciseClip|undefined {
 if(!chunk)return;
 if(chunk.clipIndex!==undefined)return chunk.clips?.[chunk.clipIndex];
 if(bars.includes(chunk.start)&&bars.includes(chunk.end))return;
 return chunk.clips?.[0]??{id:chunk.id,start:chunk.start,end:chunk.end,firstBar:chunk.firstBar,lastBar:chunk.lastBar};
}
