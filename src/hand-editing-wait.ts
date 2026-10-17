import type {PreparationStage} from '../vendor/iso-notation/src/score-presentation';
import {LoadingProgress,stageDetail} from './viewer-loading';
import type {PersonalHand} from './personal-assignments';

/** A hand choice made while the engraver is still settling for hand editing. */
export interface WaitingHandChoice {
 /** The note it was made on; a later choice on the same note replaces it. */
 key:string;
 hand:PersonalHand;
 /** The printed bar, for saying where the choice lands. */
 bar:number;
}
const handName=(hand:PersonalHand)=>hand==='LH'?'Left hand':'Right hand';
const bars=(choices:readonly WaitingHandChoice[])=>{
 const unique=[...new Set(choices.map(c=>c.bar))].sort((a,b)=>a-b);
 return unique.length===1?`bar ${unique[0]}`:`bars ${unique.slice(0,-1).join(', ')} and ${unique.at(-1)}`;
};

/** Hand choices wait in the order they were made, one per note. None is
 * dropped while it waits: it applies once hand editing is ready, or is
 * reported as not applied when the score it belongs to closes first. */
export class HandChoiceQueue {
 private choices=new Map<string,WaitingHandChoice>();
 get size(){return this.choices.size;}
 add(choice:WaitingHandChoice){this.choices.delete(choice.key);this.choices.set(choice.key,{...choice});}
 /** The oldest waiting choice, which leaves the queue. */
 shift():WaitingHandChoice|undefined{const first=this.choices.values().next().value;if(first)this.choices.delete(first.key);return first;}
 /** Every waiting choice, oldest first; the queue is then empty. */
 take():WaitingHandChoice[]{const all=[...this.choices.values()];this.choices.clear();return all;}
 list():readonly WaitingHandChoice[]{return [...this.choices.values()];}
}

/** What a waiting choice will do, in one line. */
export function waitingChoicesText(choices:readonly WaitingHandChoice[]):string {
 if(!choices.length)return '';
 if(choices.length===1)return `${handName(choices[0].hand)} for the note in ${bars(choices)} applies once this is ready.`;
 return `${choices.length} hand choices (${bars(choices)}) apply once this is ready.`;
}
/** Said when waiting choices land. */
export function appliedChoicesText(choices:readonly WaitingHandChoice[]):string {
 if(choices.length===1)return `Hand editing is ready. ${handName(choices[0].hand)} applied to the note in ${bars(choices)}.`;
 return `Hand editing is ready. ${choices.length} hand choices applied in ${bars(choices)}.`;
}
/** Said when the score closed before its waiting choices could land. */
export function abandonedChoicesText(choices:readonly WaitingHandChoice[]):string {
 if(choices.length===1)return `The hand choice for ${bars(choices)} was not applied: the score closed before hand editing was ready. Nothing was saved for it.`;
 return `${choices.length} hand choices (${bars(choices)}) were not applied: the score closed before hand editing was ready. Nothing was saved for them.`;
}

/**
 * The calm status shown while a hand choice waits for the engraver: the
 * shared loading surface in its compact form, with the engraver's current
 * stage, the elapsed clock and what the waiting choices will do.
 */
export class HandPreparationStatus {
 readonly loading=new LoadingProgress('Preparing hand editing',['hand-editing'],{compact:true});
 private queued='';
 constructor(stage?:PreparationStage){this.loading.step('hand-editing',stage?stageDetail(stage):'');}
 /** The worker reports each stage once, so pages are not counted here. */
 stage(stage:PreparationStage){this.loading.detail(stageDetail(stage));}
 queue(choices:readonly WaitingHandChoice[]){
  this.queued=waitingChoicesText(choices);
  for(const line of document.querySelectorAll<HTMLElement>('[data-hand-preparation] .viewer-hand-preparation-queue')){line.textContent=this.queued;line.hidden=!this.queued;}
 }
 markup(){return `${this.loading.markup()}<p class="viewer-hand-preparation-queue"${this.queued?'':' hidden'}>${this.queued.replaceAll('&','&amp;').replaceAll('<','&lt;')}</p>`;}
 /** Show the status on a reader surface; a redrawn surface is given it again. */
 show(surface:Element|null){
  if(!surface||surface.querySelector(':scope > [data-hand-preparation]'))return;
  const aside=document.createElement('aside');aside.className='viewer-hand-preparation';aside.dataset.handPreparation='';aside.innerHTML=this.markup();
  surface.append(aside);this.loading.attach(aside);
 }
 close(){this.loading.stop();for(const aside of document.querySelectorAll('[data-hand-preparation]'))aside.remove();}
}
